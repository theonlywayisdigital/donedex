-- ============================================
-- Migration 014: Onboarding State
-- ============================================
-- Creates onboarding_state table to:
-- - Track onboarding wizard progress
-- - Allow users to resume onboarding
-- - Store data collected during onboarding
--
-- Part of the Organisation Onboarding & Billing System
-- ============================================

-- ============================================
-- STEP 1: CREATE ONBOARDING_STATE TABLE
-- ============================================

CREATE TABLE onboarding_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,

    -- Progress tracking
    current_step TEXT NOT NULL DEFAULT 'welcome',
    completed_steps TEXT[] DEFAULT '{}',

    -- Data collected during onboarding
    organisation_name TEXT,
    organisation_slug TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    billing_email TEXT,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    postcode TEXT,
    country TEXT DEFAULT 'GB',

    -- Plan selection
    selected_plan_id UUID REFERENCES subscription_plans(id),
    billing_interval TEXT CHECK (billing_interval IN ('monthly', 'annual')),

    -- Team invites (stored until org created)
    pending_invites JSONB DEFAULT '[]',
    -- Format: [{ "email": "user@example.com", "role": "admin" | "user" }]

    -- Templates selected
    selected_template_ids UUID[] DEFAULT '{}',

    -- First record data
    first_record_name TEXT,
    first_record_address TEXT,

    -- Stripe checkout
    stripe_checkout_session_id TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    UNIQUE(user_id)
);

-- Add updated_at trigger
CREATE TRIGGER update_onboarding_state_updated_at
    BEFORE UPDATE ON onboarding_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: INDEXES
-- ============================================

CREATE INDEX idx_onboarding_state_user ON onboarding_state(user_id);
CREATE INDEX idx_onboarding_state_org ON onboarding_state(organisation_id);
CREATE INDEX idx_onboarding_state_incomplete ON onboarding_state(completed_at) WHERE completed_at IS NULL;

-- ============================================
-- STEP 3: RLS POLICIES
-- ============================================

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own onboarding
CREATE POLICY "Users can view own onboarding"
    ON onboarding_state FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own onboarding"
    ON onboarding_state FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding"
    ON onboarding_state FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own onboarding"
    ON onboarding_state FOR DELETE
    USING (user_id = auth.uid());

-- Super admins can view all onboarding states
CREATE POLICY "Super admins can view all onboarding"
    ON onboarding_state FOR SELECT
    USING (is_super_admin());

-- ============================================
-- STEP 4: HELPER FUNCTION TO CHECK ONBOARDING STATUS
-- ============================================

CREATE OR REPLACE FUNCTION needs_onboarding(user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    has_org BOOLEAN;
    onboarding_complete BOOLEAN;
BEGIN
    -- Check if user has any organisation membership
    SELECT EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = user_id_param
    ) INTO has_org;

    -- If user has an org, they don't need onboarding
    IF has_org THEN
        RETURN FALSE;
    END IF;

    -- Check if onboarding is in progress or not started
    SELECT EXISTS (
        SELECT 1 FROM onboarding_state
        WHERE user_id = user_id_param
        AND completed_at IS NOT NULL
    ) INTO onboarding_complete;

    -- If onboarding was completed but user has no org (edge case), still show onboarding
    IF onboarding_complete THEN
        RETURN FALSE;
    END IF;

    -- User needs onboarding
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: FUNCTION TO CREATE OR GET ONBOARDING STATE
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_onboarding_state()
RETURNS onboarding_state AS $$
DECLARE
    result onboarding_state;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();

    -- Try to get existing state
    SELECT * INTO result
    FROM onboarding_state
    WHERE user_id = current_user_id;

    -- If not found, create new one
    IF result IS NULL THEN
        INSERT INTO onboarding_state (user_id)
        VALUES (current_user_id)
        RETURNING * INTO result;
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: FUNCTION TO COMPLETE ONBOARDING
-- ============================================

CREATE OR REPLACE FUNCTION complete_onboarding(
    p_organisation_name TEXT,
    p_organisation_slug TEXT DEFAULT NULL,
    p_contact_email TEXT DEFAULT NULL,
    p_billing_email TEXT DEFAULT NULL,
    p_plan_id UUID DEFAULT NULL,
    p_pending_invites JSONB DEFAULT '[]',
    p_selected_template_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
    current_user_id UUID;
    new_org_id UUID;
    free_plan_id UUID;
    invite RECORD;
    onboarding onboarding_state;
BEGIN
    current_user_id := auth.uid();

    -- Get free plan ID if no plan specified
    IF p_plan_id IS NULL THEN
        SELECT id INTO free_plan_id FROM subscription_plans WHERE slug = 'free';
        p_plan_id := free_plan_id;
    END IF;

    -- Generate slug if not provided
    IF p_organisation_slug IS NULL OR p_organisation_slug = '' THEN
        p_organisation_slug := generate_slug(p_organisation_name);
    END IF;

    -- Create the organisation
    INSERT INTO organisations (
        name,
        slug,
        contact_email,
        billing_email,
        current_plan_id,
        subscription_status,
        onboarding_completed_at
    )
    VALUES (
        p_organisation_name,
        p_organisation_slug,
        COALESCE(p_contact_email, (SELECT email FROM auth.users WHERE id = current_user_id)),
        COALESCE(p_billing_email, p_contact_email, (SELECT email FROM auth.users WHERE id = current_user_id)),
        p_plan_id,
        'active',
        NOW()
    )
    RETURNING id INTO new_org_id;

    -- Add current user as owner
    INSERT INTO organisation_users (organisation_id, user_id, role)
    VALUES (new_org_id, current_user_id, 'owner');

    -- Create default record type for the new org
    INSERT INTO record_types (organisation_id, name, name_singular, description, icon, is_default)
    VALUES (new_org_id, 'Sites', 'Site', 'Locations and properties', 'building', TRUE);

    -- Process pending invites (store for later sending)
    -- Note: Actual invite sending would be done by edge function

    -- Update onboarding state as complete
    UPDATE onboarding_state
    SET
        organisation_id = new_org_id,
        completed_at = NOW(),
        current_step = 'complete'
    WHERE user_id = current_user_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'organisation_id', new_org_id,
        'message', 'Organisation created successfully'
    );
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Organisation name or slug already exists'
        );
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE onboarding_state IS 'Tracks user progress through the onboarding wizard';
COMMENT ON COLUMN onboarding_state.current_step IS 'Current step in onboarding wizard';
COMMENT ON COLUMN onboarding_state.completed_steps IS 'Array of steps that have been completed';
COMMENT ON COLUMN onboarding_state.pending_invites IS 'JSON array of team invites to send after org creation';
COMMENT ON FUNCTION needs_onboarding(UUID) IS 'Check if a user needs to complete onboarding';
COMMENT ON FUNCTION complete_onboarding(TEXT, TEXT, TEXT, TEXT, UUID, JSONB, UUID[]) IS 'Finalize onboarding and create the organisation';
