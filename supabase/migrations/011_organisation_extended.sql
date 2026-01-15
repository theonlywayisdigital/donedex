-- ============================================
-- Migration 011: Organisation Extended Schema
-- ============================================
-- Extends the organisations table with:
-- - Contact information
-- - Billing/subscription fields
-- - Onboarding tracking
--
-- Part of the Organisation Onboarding & Billing System
-- ============================================

-- ============================================
-- STEP 1: EXTEND ORGANISATIONS TABLE
-- ============================================

-- Unique slug for URL-friendly identification
ALTER TABLE organisations ADD COLUMN slug TEXT UNIQUE;

-- Contact information
ALTER TABLE organisations ADD COLUMN contact_email TEXT;
ALTER TABLE organisations ADD COLUMN contact_phone TEXT;
ALTER TABLE organisations ADD COLUMN address_line1 TEXT;
ALTER TABLE organisations ADD COLUMN address_line2 TEXT;
ALTER TABLE organisations ADD COLUMN city TEXT;
ALTER TABLE organisations ADD COLUMN postcode TEXT;
ALTER TABLE organisations ADD COLUMN country TEXT DEFAULT 'GB';

-- Billing fields
ALTER TABLE organisations ADD COLUMN billing_email TEXT;
ALTER TABLE organisations ADD COLUMN stripe_customer_id TEXT UNIQUE;
ALTER TABLE organisations ADD COLUMN subscription_status TEXT
    DEFAULT 'incomplete'
    CHECK (subscription_status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'));
ALTER TABLE organisations ADD COLUMN current_plan_id UUID;  -- FK added after subscription_plans table exists
ALTER TABLE organisations ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE organisations ADD COLUMN subscription_ends_at TIMESTAMPTZ;

-- Onboarding tracking
ALTER TABLE organisations ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE organisations ADD COLUMN created_by_super_admin BOOLEAN DEFAULT FALSE;

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

CREATE INDEX idx_organisations_stripe_customer ON organisations(stripe_customer_id);
CREATE INDEX idx_organisations_subscription_status ON organisations(subscription_status);
CREATE INDEX idx_organisations_slug ON organisations(slug);

-- ============================================
-- STEP 3: GENERATE SLUGS FOR EXISTING ORGANISATIONS
-- ============================================

-- Create a function to generate a slug from a name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert to lowercase, replace spaces with hyphens, remove special chars
    base_slug := lower(regexp_replace(trim(name), '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    -- Ensure not empty
    IF base_slug = '' OR base_slug IS NULL THEN
        base_slug := 'org';
    END IF;

    final_slug := base_slug;

    -- Check for uniqueness and add suffix if needed
    WHILE EXISTS (SELECT 1 FROM organisations WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;

    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Generate slugs for existing organisations
UPDATE organisations
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- ============================================
-- STEP 4: UPDATE RLS POLICIES FOR NEW FIELDS
-- ============================================

-- Admins can update billing fields
-- (existing update policy already allows org admins to update their organisation)

-- Super admins can view all billing info (already covered by is_super_admin() in RLS)

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN organisations.slug IS 'URL-friendly unique identifier for the organisation';
COMMENT ON COLUMN organisations.contact_email IS 'Primary contact email for the organisation';
COMMENT ON COLUMN organisations.billing_email IS 'Email for billing/invoice communications';
COMMENT ON COLUMN organisations.stripe_customer_id IS 'Stripe customer ID for billing integration';
COMMENT ON COLUMN organisations.subscription_status IS 'Current subscription status (synced from Stripe)';
COMMENT ON COLUMN organisations.current_plan_id IS 'FK to subscription_plans table';
COMMENT ON COLUMN organisations.trial_ends_at IS 'When the trial period ends (if trialing)';
COMMENT ON COLUMN organisations.subscription_ends_at IS 'When the current billing period ends';
COMMENT ON COLUMN organisations.onboarding_completed_at IS 'When the org completed onboarding wizard';
COMMENT ON COLUMN organisations.created_by_super_admin IS 'True if org was created by super admin, not self-service';
