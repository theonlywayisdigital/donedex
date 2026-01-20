-- ============================================
-- Migration 033: Remove Default Record Type
-- ============================================
-- Removes the automatic creation of a "Sites" record type
-- during onboarding. Users should create their own record types.
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

    -- NOTE: Removed automatic creation of default "Sites" record type.
    -- Users should create their own record types based on their needs.

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

COMMENT ON FUNCTION complete_onboarding(TEXT, TEXT, TEXT, TEXT, UUID, JSONB, UUID[]) IS 'Finalize onboarding and create the organisation (no default record types)';
