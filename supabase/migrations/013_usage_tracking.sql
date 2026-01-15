-- ============================================
-- Migration 013: Usage Tracking & Limit Enforcement
-- ============================================
-- Creates:
-- - organisation_usage table for tracking monthly usage
-- - Functions to check and enforce plan limits
-- - Triggers to block inserts when limits exceeded
--
-- Part of the Organisation Onboarding & Billing System
-- ============================================

-- ============================================
-- STEP 1: CREATE ORGANISATION_USAGE TABLE
-- ============================================

CREATE TABLE organisation_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Counters
    user_count INTEGER DEFAULT 0,
    record_count INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organisation_id, period_start)
);

-- Add updated_at trigger
CREATE TRIGGER update_organisation_usage_updated_at
    BEFORE UPDATE ON organisation_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_organisation_usage_org ON organisation_usage(organisation_id);
CREATE INDEX idx_organisation_usage_period ON organisation_usage(period_start, period_end);

-- ============================================
-- STEP 2: FUNCTION TO GET CURRENT USAGE
-- ============================================

CREATE OR REPLACE FUNCTION get_organisation_usage(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_count INTEGER;
    record_count INTEGER;
    report_count INTEGER;
    storage_bytes BIGINT;
BEGIN
    -- Count users
    SELECT COUNT(*) INTO user_count
    FROM organisation_users
    WHERE organisation_id = org_id;

    -- Count records
    SELECT COUNT(*) INTO record_count
    FROM records
    WHERE organisation_id = org_id AND NOT archived;

    -- Count reports this month
    SELECT COUNT(*) INTO report_count
    FROM reports
    WHERE organisation_id = org_id
    AND created_at >= date_trunc('month', NOW());

    -- Get storage (approximation - photos bucket)
    -- Note: Actual storage calculation may need adjustment based on bucket structure
    storage_bytes := 0; -- Will be calculated by external cron job

    RETURN jsonb_build_object(
        'users', user_count,
        'records', record_count,
        'reports_this_month', report_count,
        'storage_bytes', storage_bytes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 3: FUNCTION TO CHECK PLAN LIMITS
-- ============================================

CREATE OR REPLACE FUNCTION check_org_limits(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    plan RECORD;
    usage JSONB;
    result JSONB;
BEGIN
    -- Get the organisation's current plan
    SELECT sp.* INTO plan
    FROM organisations o
    JOIN subscription_plans sp ON sp.id = o.current_plan_id
    WHERE o.id = org_id;

    -- If no plan found, assume free tier limits
    IF plan IS NULL THEN
        SELECT * INTO plan FROM subscription_plans WHERE slug = 'free';
    END IF;

    -- Get current usage
    usage := get_organisation_usage(org_id);

    -- Build result with limit checking
    result := jsonb_build_object(
        'users', jsonb_build_object(
            'current', (usage->>'users')::INTEGER,
            'limit', plan.max_users,
            'exceeded', plan.max_users > 0 AND (usage->>'users')::INTEGER >= plan.max_users,
            'percent', CASE WHEN plan.max_users > 0 THEN ROUND(((usage->>'users')::NUMERIC / plan.max_users) * 100) ELSE 0 END
        ),
        'records', jsonb_build_object(
            'current', (usage->>'records')::INTEGER,
            'limit', plan.max_records,
            'exceeded', plan.max_records > 0 AND (usage->>'records')::INTEGER >= plan.max_records,
            'percent', CASE WHEN plan.max_records > 0 THEN ROUND(((usage->>'records')::NUMERIC / plan.max_records) * 100) ELSE 0 END
        ),
        'reports', jsonb_build_object(
            'current', (usage->>'reports_this_month')::INTEGER,
            'limit', plan.max_reports_per_month,
            'exceeded', plan.max_reports_per_month > 0 AND (usage->>'reports_this_month')::INTEGER >= plan.max_reports_per_month,
            'percent', CASE WHEN plan.max_reports_per_month > 0 THEN ROUND(((usage->>'reports_this_month')::NUMERIC / plan.max_reports_per_month) * 100) ELSE 0 END
        ),
        'storage', jsonb_build_object(
            'current_bytes', (usage->>'storage_bytes')::BIGINT,
            'current_gb', ROUND(((usage->>'storage_bytes')::NUMERIC / 1073741824)::NUMERIC, 2),
            'limit_gb', plan.max_storage_gb,
            'exceeded', plan.max_storage_gb > 0 AND ((usage->>'storage_bytes')::NUMERIC / 1073741824) >= plan.max_storage_gb,
            'percent', CASE WHEN plan.max_storage_gb > 0 THEN ROUND((((usage->>'storage_bytes')::NUMERIC / 1073741824) / plan.max_storage_gb) * 100) ELSE 0 END
        ),
        'plan', jsonb_build_object(
            'id', plan.id,
            'name', plan.name,
            'slug', plan.slug
        )
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 4: FUNCTION TO CHECK IF ACTION ALLOWED
-- ============================================

CREATE OR REPLACE FUNCTION can_add_record(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    limits JSONB;
BEGIN
    limits := check_org_limits(org_id);
    RETURN NOT (limits->'records'->>'exceeded')::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_add_report(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    limits JSONB;
BEGIN
    limits := check_org_limits(org_id);
    RETURN NOT (limits->'reports'->>'exceeded')::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_add_user(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    limits JSONB;
BEGIN
    limits := check_org_limits(org_id);
    RETURN NOT (limits->'users'->>'exceeded')::BOOLEAN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: TRIGGER TO ENFORCE RECORD LIMITS
-- ============================================

CREATE OR REPLACE FUNCTION enforce_record_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT can_add_record(NEW.organisation_id) THEN
        RAISE EXCEPTION 'Record limit reached for your plan. Please upgrade to add more records.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_record_limit_trigger
    BEFORE INSERT ON records
    FOR EACH ROW EXECUTE FUNCTION enforce_record_limit();

-- ============================================
-- STEP 6: TRIGGER TO ENFORCE REPORT LIMITS
-- ============================================

CREATE OR REPLACE FUNCTION enforce_report_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT can_add_report(NEW.organisation_id) THEN
        RAISE EXCEPTION 'Monthly report limit reached for your plan. Please upgrade to generate more reports.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_report_limit_trigger
    BEFORE INSERT ON reports
    FOR EACH ROW EXECUTE FUNCTION enforce_report_limit();

-- ============================================
-- STEP 7: TRIGGER TO ENFORCE USER LIMITS
-- ============================================

CREATE OR REPLACE FUNCTION enforce_user_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT can_add_user(NEW.organisation_id) THEN
        RAISE EXCEPTION 'User limit reached for your plan. Please upgrade to add more team members.'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_user_limit_trigger
    BEFORE INSERT ON organisation_users
    FOR EACH ROW EXECUTE FUNCTION enforce_user_limit();

-- ============================================
-- STEP 8: FUNCTION TO SNAPSHOT USAGE (for cron)
-- ============================================

CREATE OR REPLACE FUNCTION snapshot_organisation_usage()
RETURNS void AS $$
BEGIN
    INSERT INTO organisation_usage (
        organisation_id,
        period_start,
        period_end,
        user_count,
        record_count,
        report_count,
        storage_bytes
    )
    SELECT
        o.id,
        date_trunc('month', NOW())::DATE,
        (date_trunc('month', NOW()) + INTERVAL '1 month - 1 day')::DATE,
        (SELECT COUNT(*) FROM organisation_users WHERE organisation_id = o.id),
        (SELECT COUNT(*) FROM records WHERE organisation_id = o.id AND NOT archived),
        (SELECT COUNT(*) FROM reports WHERE organisation_id = o.id
            AND created_at >= date_trunc('month', NOW())),
        0 -- Storage calculated separately
    FROM organisations o
    ON CONFLICT (organisation_id, period_start) DO UPDATE SET
        user_count = EXCLUDED.user_count,
        record_count = EXCLUDED.record_count,
        report_count = EXCLUDED.report_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: RLS POLICIES
-- ============================================

ALTER TABLE organisation_usage ENABLE ROW LEVEL SECURITY;

-- Org admins can view their usage
CREATE POLICY "Org admins can view usage"
    ON organisation_usage FOR SELECT
    USING (is_org_admin(organisation_id));

-- Super admins can view all usage
CREATE POLICY "Super admins can view all usage"
    ON organisation_usage FOR SELECT
    USING (is_super_admin());

-- Only system (via functions) can insert/update usage
CREATE POLICY "System can manage usage"
    ON organisation_usage FOR ALL
    USING (is_super_admin());

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE organisation_usage IS 'Monthly usage snapshots for billing and limit tracking';
COMMENT ON FUNCTION check_org_limits(UUID) IS 'Returns current usage vs plan limits for an organisation';
COMMENT ON FUNCTION can_add_record(UUID) IS 'Check if organisation can add more records';
COMMENT ON FUNCTION can_add_report(UUID) IS 'Check if organisation can generate more reports this month';
COMMENT ON FUNCTION can_add_user(UUID) IS 'Check if organisation can add more users';
COMMENT ON FUNCTION snapshot_organisation_usage() IS 'Snapshot all org usage - call via cron job';
