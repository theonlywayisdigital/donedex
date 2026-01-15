-- ============================================
-- Migration 015: Billing Events & Invoices
-- ============================================
-- Creates:
-- - billing_events table for Stripe webhook logging
-- - invoices table for synced invoice data
--
-- Part of the Organisation Onboarding & Billing System
-- ============================================

-- ============================================
-- STEP 1: CREATE BILLING_EVENTS TABLE
-- ============================================

CREATE TABLE billing_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    organisation_id UUID REFERENCES organisations(id),
    stripe_customer_id TEXT,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_billing_events_stripe_event ON billing_events(stripe_event_id);
CREATE INDEX idx_billing_events_org ON billing_events(organisation_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_created ON billing_events(created_at DESC);
CREATE INDEX idx_billing_events_unprocessed ON billing_events(processed_at) WHERE processed_at IS NULL;

-- ============================================
-- STEP 2: CREATE INVOICES TABLE
-- ============================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    stripe_subscription_id TEXT,

    -- Status
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

    -- Amounts (in minor units - pence for GBP)
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER DEFAULT 0,
    amount_remaining INTEGER DEFAULT 0,
    currency TEXT DEFAULT 'gbp',

    -- Tax
    tax INTEGER DEFAULT 0,

    -- URLs
    invoice_pdf_url TEXT,
    hosted_invoice_url TEXT,

    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,

    -- Dates
    paid_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_invoices_org ON invoices(organisation_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created ON invoices(created_at DESC);

-- ============================================
-- STEP 3: CREATE SUBSCRIPTION_HISTORY TABLE
-- ============================================

CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    stripe_subscription_id TEXT,

    -- Status
    status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused')),

    -- Period
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,

    -- Cancellation details
    cancel_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_subscription_history_org ON subscription_history(organisation_id);
CREATE INDEX idx_subscription_history_plan ON subscription_history(plan_id);
CREATE INDEX idx_subscription_history_active ON subscription_history(organisation_id, ended_at) WHERE ended_at IS NULL;

-- ============================================
-- STEP 4: RLS POLICIES FOR BILLING_EVENTS
-- ============================================

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Only super admins can view billing events (for debugging)
CREATE POLICY "Super admins can view billing events"
    ON billing_events FOR SELECT
    USING (is_super_admin());

-- Only system (via service role) can insert billing events
-- No policy needed - service role bypasses RLS

-- ============================================
-- STEP 5: RLS POLICIES FOR INVOICES
-- ============================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Org admins can view their invoices
CREATE POLICY "Org admins can view invoices"
    ON invoices FOR SELECT
    USING (is_org_admin(organisation_id));

-- Super admins can view all invoices
CREATE POLICY "Super admins can view all invoices"
    ON invoices FOR SELECT
    USING (is_super_admin());

-- Only system (via service role) can manage invoices
-- No insert/update/delete policies - service role bypasses RLS

-- ============================================
-- STEP 6: RLS POLICIES FOR SUBSCRIPTION_HISTORY
-- ============================================

ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Org admins can view their subscription history
CREATE POLICY "Org admins can view subscription history"
    ON subscription_history FOR SELECT
    USING (is_org_admin(organisation_id));

-- Super admins can view all subscription history
CREATE POLICY "Super admins can view all subscription history"
    ON subscription_history FOR SELECT
    USING (is_super_admin());

-- ============================================
-- STEP 7: HELPER FUNCTIONS FOR BILLING
-- ============================================

-- Get billing summary for an organisation
CREATE OR REPLACE FUNCTION get_billing_summary(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    org RECORD;
    plan RECORD;
    latest_invoice RECORD;
    result JSONB;
BEGIN
    -- Get organisation billing details
    SELECT
        o.stripe_customer_id,
        o.subscription_status,
        o.trial_ends_at,
        o.subscription_ends_at,
        sp.id as plan_id,
        sp.name as plan_name,
        sp.slug as plan_slug,
        sp.price_monthly_gbp,
        sp.price_annual_gbp
    INTO org
    FROM organisations o
    LEFT JOIN subscription_plans sp ON sp.id = o.current_plan_id
    WHERE o.id = org_id;

    -- Get latest paid invoice
    SELECT
        amount_paid,
        paid_at,
        invoice_pdf_url
    INTO latest_invoice
    FROM invoices
    WHERE organisation_id = org_id
    AND status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 1;

    result := jsonb_build_object(
        'has_billing', org.stripe_customer_id IS NOT NULL,
        'subscription_status', org.subscription_status,
        'is_trialing', org.subscription_status = 'trialing',
        'trial_ends_at', org.trial_ends_at,
        'subscription_ends_at', org.subscription_ends_at,
        'current_plan', CASE WHEN org.plan_id IS NOT NULL THEN
            jsonb_build_object(
                'id', org.plan_id,
                'name', org.plan_name,
                'slug', org.plan_slug,
                'price_monthly_gbp', org.price_monthly_gbp,
                'price_annual_gbp', org.price_annual_gbp
            )
        ELSE NULL END,
        'latest_invoice', CASE WHEN latest_invoice.paid_at IS NOT NULL THEN
            jsonb_build_object(
                'amount_paid', latest_invoice.amount_paid,
                'paid_at', latest_invoice.paid_at,
                'pdf_url', latest_invoice.invoice_pdf_url
            )
        ELSE NULL END
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to record subscription change
CREATE OR REPLACE FUNCTION record_subscription_change(
    p_org_id UUID,
    p_plan_id UUID,
    p_stripe_subscription_id TEXT,
    p_status TEXT,
    p_trial_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_id UUID;
BEGIN
    -- End any existing active subscription for this org
    UPDATE subscription_history
    SET ended_at = NOW()
    WHERE organisation_id = p_org_id
    AND ended_at IS NULL;

    -- Insert new subscription record
    INSERT INTO subscription_history (
        organisation_id,
        plan_id,
        stripe_subscription_id,
        status,
        trial_end
    )
    VALUES (
        p_org_id,
        p_plan_id,
        p_stripe_subscription_id,
        p_status,
        p_trial_end
    )
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE billing_events IS 'Log of all Stripe webhook events for debugging and audit';
COMMENT ON TABLE invoices IS 'Synced invoice data from Stripe';
COMMENT ON TABLE subscription_history IS 'History of subscription changes for each organisation';
COMMENT ON FUNCTION get_billing_summary(UUID) IS 'Get billing summary for an organisation';
COMMENT ON FUNCTION record_subscription_change(UUID, UUID, TEXT, TEXT, TIMESTAMPTZ) IS 'Record a subscription change in history';
