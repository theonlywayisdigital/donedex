-- ============================================
-- Migration 012: Subscription Plans
-- ============================================
-- Creates subscription_plans table with:
-- - Plan tiers (Free, Pro, Enterprise)
-- - Usage limits (users, records, reports, storage)
-- - Feature flags
-- - Stripe integration fields
--
-- Part of the Organisation Onboarding & Billing System
-- ============================================

-- ============================================
-- STEP 1: CREATE SUBSCRIPTION_PLANS TABLE
-- ============================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                        -- 'Free', 'Pro', 'Enterprise'
    slug TEXT UNIQUE NOT NULL,                 -- 'free', 'pro', 'enterprise'

    -- Stripe integration
    stripe_product_id TEXT,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,

    -- Usage limits (-1 = unlimited)
    max_users INTEGER DEFAULT 2,
    max_records INTEGER DEFAULT 10,
    max_reports_per_month INTEGER DEFAULT 50,
    max_storage_gb NUMERIC(10,2) DEFAULT 1.0,

    -- Feature flags
    feature_ai_templates BOOLEAN DEFAULT FALSE,
    feature_pdf_export BOOLEAN DEFAULT TRUE,
    feature_api_access BOOLEAN DEFAULT FALSE,
    feature_custom_branding BOOLEAN DEFAULT FALSE,
    feature_priority_support BOOLEAN DEFAULT FALSE,
    feature_white_label BOOLEAN DEFAULT FALSE,
    feature_advanced_analytics BOOLEAN DEFAULT FALSE,

    -- Pricing display (in pence GBP)
    price_monthly_gbp INTEGER DEFAULT 0,
    price_annual_gbp INTEGER DEFAULT 0,        -- Total annual price (not per month)

    -- Meta
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,            -- Show on pricing page
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: SEED DEFAULT PLANS
-- ============================================

INSERT INTO subscription_plans (
    name,
    slug,
    max_users,
    max_records,
    max_reports_per_month,
    max_storage_gb,
    feature_ai_templates,
    feature_pdf_export,
    feature_api_access,
    feature_custom_branding,
    feature_priority_support,
    price_monthly_gbp,
    price_annual_gbp,
    description,
    is_public,
    display_order
) VALUES
    (
        'Free',
        'free',
        2,                          -- 2 users
        10,                         -- 10 records
        50,                         -- 50 reports/month
        1.0,                        -- 1 GB storage
        FALSE,                      -- No AI templates
        TRUE,                       -- PDF export
        FALSE,                      -- No API access
        FALSE,                      -- No custom branding
        FALSE,                      -- No priority support
        0,                          -- Free
        0,
        'Get started with basic features. Perfect for small teams.',
        TRUE,
        1
    ),
    (
        'Pro',
        'pro',
        10,                         -- 10 users
        -1,                         -- Unlimited records
        -1,                         -- Unlimited reports
        25.0,                       -- 25 GB storage
        TRUE,                       -- AI templates
        TRUE,                       -- PDF export
        FALSE,                      -- No API access
        FALSE,                      -- No custom branding
        TRUE,                       -- Priority support
        4900,                       -- £49/month
        49000,                      -- £490/year (2 months free)
        'Everything you need to grow. Unlimited records and reports.',
        TRUE,
        2
    ),
    (
        'Enterprise',
        'enterprise',
        -1,                         -- Unlimited users
        -1,                         -- Unlimited records
        -1,                         -- Unlimited reports
        -1,                         -- Unlimited storage
        TRUE,                       -- AI templates
        TRUE,                       -- PDF export
        TRUE,                       -- API access
        TRUE,                       -- Custom branding
        TRUE,                       -- Priority support
        0,                          -- Custom pricing
        0,
        'For large organisations with advanced needs. Contact us for pricing.',
        TRUE,
        3
    );

-- ============================================
-- STEP 3: ADD FK FROM ORGANISATIONS TO PLANS
-- ============================================

ALTER TABLE organisations
    ADD CONSTRAINT fk_organisations_plan
    FOREIGN KEY (current_plan_id) REFERENCES subscription_plans(id);

-- ============================================
-- STEP 4: SET DEFAULT PLAN FOR EXISTING ORGS
-- ============================================

-- Get the Free plan ID
DO $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM subscription_plans WHERE slug = 'free';

    -- Update existing organisations to have Free plan
    UPDATE organisations
    SET current_plan_id = free_plan_id,
        subscription_status = 'active'
    WHERE current_plan_id IS NULL;
END $$;

-- ============================================
-- STEP 5: RLS POLICIES
-- ============================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can view active public plans
CREATE POLICY "Anyone can view public plans"
    ON subscription_plans FOR SELECT
    USING (is_active = TRUE AND is_public = TRUE);

-- Super admins can view all plans
CREATE POLICY "Super admins can view all plans"
    ON subscription_plans FOR SELECT
    USING (is_super_admin());

-- Super admins can manage plans
CREATE POLICY "Super admins can manage plans"
    ON subscription_plans FOR ALL
    USING (is_super_admin());

-- ============================================
-- STEP 6: INDEXES
-- ============================================

CREATE INDEX idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = TRUE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE subscription_plans IS 'Available subscription plans/tiers with pricing and limits';
COMMENT ON COLUMN subscription_plans.max_users IS 'Maximum users allowed. -1 = unlimited';
COMMENT ON COLUMN subscription_plans.max_records IS 'Maximum records allowed. -1 = unlimited';
COMMENT ON COLUMN subscription_plans.max_reports_per_month IS 'Maximum reports per month. -1 = unlimited';
COMMENT ON COLUMN subscription_plans.max_storage_gb IS 'Maximum storage in GB. -1 = unlimited';
COMMENT ON COLUMN subscription_plans.price_monthly_gbp IS 'Monthly price in pence (e.g., 4900 = £49.00)';
COMMENT ON COLUMN subscription_plans.price_annual_gbp IS 'Annual price in pence (total, not per month)';
