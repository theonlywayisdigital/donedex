-- ============================================
-- PII Detection System
-- ============================================
-- Adds PII tracking flags to record type fields
-- Creates audit log for PII detection events
-- ============================================

-- ============================================
-- 1. Add PII flags to record_type_fields
-- ============================================

-- Add contains_pii flag
ALTER TABLE record_type_fields
ADD COLUMN IF NOT EXISTS contains_pii BOOLEAN NOT NULL DEFAULT false;

-- Add pii_category for classification
ALTER TABLE record_type_fields
ADD COLUMN IF NOT EXISTS pii_category TEXT CHECK (pii_category IN (
  'email', 'phone', 'name', 'signature', 'location', 'identifier'
) OR pii_category IS NULL);

-- Index for efficient PII field lookups
CREATE INDEX IF NOT EXISTS idx_record_type_fields_pii
  ON record_type_fields (record_type_id)
  WHERE contains_pii = true;

-- ============================================
-- 2. Update existing PII field types
-- ============================================

-- Set contains_pii = true for existing field types that contain PII
UPDATE record_type_fields
SET
  contains_pii = true,
  pii_category = CASE field_type
    WHEN 'email' THEN 'email'
    WHEN 'phone' THEN 'phone'
    WHEN 'contractor' THEN 'name'
    WHEN 'person_picker' THEN 'name'
    WHEN 'witness' THEN 'name'
    WHEN 'signature' THEN 'signature'
    WHEN 'gps_location' THEN 'location'
    ELSE NULL
  END
WHERE field_type IN ('email', 'phone', 'contractor', 'person_picker', 'witness', 'signature', 'gps_location');

-- ============================================
-- 3. PII Detection Audit Log
-- ============================================

CREATE TABLE IF NOT EXISTS pii_detection_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Context
  record_id UUID REFERENCES records(id) ON DELETE SET NULL,
  record_type_id UUID REFERENCES record_types(id) ON DELETE SET NULL,
  field_id UUID REFERENCES record_type_fields(id) ON DELETE SET NULL,
  field_label TEXT NOT NULL,

  -- Detection
  detection_type TEXT NOT NULL,  -- 'email', 'phone', 'ukNI', 'usSSN', 'creditCard', etc.
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_pattern TEXT,         -- Masked version: "jo...uk"

  -- User response
  user_action TEXT NOT NULL CHECK (user_action IN ('saved_anyway', 'edited', 'cancelled', 'dismissed')),
  was_warned BOOLEAN DEFAULT true,

  -- Client info
  client_platform TEXT,          -- 'ios', 'android', 'web'

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Comment for documentation
COMMENT ON TABLE pii_detection_events IS 'Audit log for PII detection events - tracks when users are warned about potential PII and their responses';
COMMENT ON COLUMN pii_detection_events.detected_pattern IS 'Masked version of detected text for audit purposes (e.g., "jo...uk" not full email)';
COMMENT ON COLUMN pii_detection_events.user_action IS 'User response: saved_anyway = proceeded with save, edited = modified the data, cancelled = abandoned, dismissed = dismissed warning';

-- ============================================
-- 4. Indexes for efficient querying
-- ============================================

-- Main query index: org + time
CREATE INDEX idx_pii_events_org_time
  ON pii_detection_events(organisation_id, created_at DESC);

-- Severity filtering (for compliance reports)
CREATE INDEX idx_pii_events_severity
  ON pii_detection_events(severity, created_at DESC)
  WHERE severity IN ('high', 'critical');

-- Detection type analysis
CREATE INDEX idx_pii_events_type
  ON pii_detection_events(detection_type, created_at DESC);

-- User audit trail
CREATE INDEX idx_pii_events_user
  ON pii_detection_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ============================================
-- 5. Row Level Security
-- ============================================

ALTER TABLE pii_detection_events ENABLE ROW LEVEL SECURITY;

-- Org admins can view their organisation's events
CREATE POLICY "Org admins can view their org PII events"
  ON pii_detection_events FOR SELECT
  TO authenticated
  USING (is_org_admin(organisation_id));

-- Super admins can view all events
CREATE POLICY "Super admins can view all PII events"
  ON pii_detection_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM super_admins WHERE user_id = auth.uid()
    )
  );

-- Authenticated users can insert events for their org
CREATE POLICY "Users can log PII events for their org"
  ON pii_detection_events FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT get_user_organisation_ids())
  );

-- ============================================
-- 6. Helper function for PII field lookup
-- ============================================

-- Get all PII-containing fields for an organisation
CREATE OR REPLACE FUNCTION get_organisation_pii_fields(p_organisation_id UUID)
RETURNS TABLE (
  field_id UUID,
  field_label TEXT,
  field_type TEXT,
  pii_category TEXT,
  record_type_id UUID,
  record_type_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id as field_id,
    f.label as field_label,
    f.field_type,
    f.pii_category,
    rt.id as record_type_id,
    rt.name as record_type_name
  FROM record_type_fields f
  JOIN record_types rt ON rt.id = f.record_type_id
  WHERE rt.organisation_id = p_organisation_id
    AND f.contains_pii = true
  ORDER BY rt.name, f.sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Summary view for admin dashboard
-- ============================================

CREATE OR REPLACE VIEW pii_detection_summary AS
SELECT
  organisation_id,
  detection_type,
  severity,
  user_action,
  DATE_TRUNC('day', created_at) as event_date,
  COUNT(*) as event_count
FROM pii_detection_events
GROUP BY organisation_id, detection_type, severity, user_action, DATE_TRUNC('day', created_at);

-- Grant access to the view
GRANT SELECT ON pii_detection_summary TO authenticated;
