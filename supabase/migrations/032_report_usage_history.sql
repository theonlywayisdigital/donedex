-- ============================================
-- Migration 032: Report Usage History
-- ============================================
-- Creates tracking for template+record usage combinations
-- to power quick-start suggestions on the dashboard.
--
-- Key features:
-- 1. Track when users start inspections with specific template+record pairs
-- 2. Enable "recent combinations" for quick-start
-- 3. Add last_used_at to records for sorting
-- ============================================

-- ============================================
-- STEP 1: CREATE REPORT_USAGE_HISTORY TABLE
-- ============================================

CREATE TABLE report_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    record_id UUID NOT NULL REFERENCES records(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX idx_report_usage_history_user ON report_usage_history(user_id, used_at DESC);
CREATE INDEX idx_report_usage_history_org ON report_usage_history(organisation_id, used_at DESC);
CREATE INDEX idx_report_usage_history_template_record ON report_usage_history(template_id, record_id, used_at DESC);

-- ============================================
-- STEP 2: ADD LAST_USED_AT TO RECORDS
-- ============================================

ALTER TABLE records ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Index for sorting by recency
CREATE INDEX IF NOT EXISTS idx_records_last_used ON records(last_used_at DESC NULLS LAST);

-- ============================================
-- STEP 3: RLS POLICIES
-- ============================================

ALTER TABLE report_usage_history ENABLE ROW LEVEL SECURITY;

-- Users can view their organisation's usage history
CREATE POLICY "Users can view org usage history"
ON report_usage_history FOR SELECT
USING (organisation_id IN (SELECT get_user_organisation_ids()));

-- Users can insert their own usage history
CREATE POLICY "Users can insert own usage history"
ON report_usage_history FOR INSERT
WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT get_user_organisation_ids())
);

-- Admins can delete usage history for their org
CREATE POLICY "Admins can delete usage history"
ON report_usage_history FOR DELETE
USING (is_org_admin(organisation_id));

-- ============================================
-- STEP 4: FUNCTION TO TRACK USAGE
-- ============================================

CREATE OR REPLACE FUNCTION track_report_usage(
    p_organisation_id UUID,
    p_user_id UUID,
    p_template_id UUID,
    p_record_id UUID,
    p_report_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_usage_id UUID;
BEGIN
    -- Insert usage history
    INSERT INTO report_usage_history (
        organisation_id,
        user_id,
        template_id,
        record_id,
        report_id,
        used_at
    ) VALUES (
        p_organisation_id,
        p_user_id,
        p_template_id,
        p_record_id,
        p_report_id,
        NOW()
    ) RETURNING id INTO v_usage_id;

    -- Update last_used_at on the record
    UPDATE records
    SET last_used_at = NOW()
    WHERE id = p_record_id;

    RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: FUNCTION TO GET RECENT COMBINATIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_recent_usage_combinations(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    template_id UUID,
    template_name TEXT,
    record_id UUID,
    record_name TEXT,
    record_type_id UUID,
    record_type_name TEXT,
    last_used_at TIMESTAMPTZ,
    use_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (ruh.template_id, ruh.record_id)
        ruh.template_id,
        t.name AS template_name,
        ruh.record_id,
        r.name AS record_name,
        r.record_type_id,
        rt.name AS record_type_name,
        MAX(ruh.used_at) AS last_used_at,
        COUNT(*) AS use_count
    FROM report_usage_history ruh
    JOIN templates t ON t.id = ruh.template_id
    JOIN records r ON r.id = ruh.record_id
    JOIN record_types rt ON rt.id = r.record_type_id
    WHERE ruh.user_id = p_user_id
    AND t.is_published = TRUE
    AND NOT r.archived
    AND NOT rt.archived
    GROUP BY ruh.template_id, t.name, ruh.record_id, r.name, r.record_type_id, rt.name
    ORDER BY ruh.template_id, ruh.record_id, MAX(ruh.used_at) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 6: COMMENTS
-- ============================================

COMMENT ON TABLE report_usage_history IS 'Tracks template+record usage for quick-start suggestions';
COMMENT ON COLUMN records.last_used_at IS 'Timestamp when this record was last used in an inspection';
COMMENT ON FUNCTION track_report_usage IS 'Track when a user starts an inspection with a template+record combination';
COMMENT ON FUNCTION get_recent_usage_combinations IS 'Get recent template+record combinations for quick-start';
