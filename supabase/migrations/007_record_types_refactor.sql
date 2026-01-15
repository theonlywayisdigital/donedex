-- ============================================
-- Migration 007: Record Types Refactor
-- ============================================
-- Refactors the app from property inspection-specific to generic form builder.
-- Introduces Record Types to allow organisations to create custom categories
-- (Sites, Vehicles, Clients, Projects, Residents, etc.)
--
-- Key changes:
-- 1. Create record_types table
-- 2. Rename sites to records
-- 3. Templates now link to record_types instead of sites
-- 4. Reports link to records (formerly sites)
-- 5. Rename user_site_assignments to user_record_assignments
-- ============================================

-- ============================================
-- STEP 1: CREATE RECORD_TYPES TABLE
-- ============================================

CREATE TABLE record_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_singular TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT 'folder',
    color TEXT DEFAULT '#0F4C5C',
    fields JSONB DEFAULT '[]',
    is_default BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at trigger
CREATE TRIGGER update_record_types_updated_at
    BEFORE UPDATE ON record_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes
CREATE INDEX idx_record_types_organisation ON record_types(organisation_id);
CREATE INDEX idx_record_types_archived ON record_types(archived) WHERE NOT archived;

-- ============================================
-- STEP 2: CREATE DEFAULT RECORD TYPES FOR EXISTING ORGANISATIONS
-- ============================================

INSERT INTO record_types (organisation_id, name, name_singular, description, icon, is_default)
SELECT id, 'Sites', 'Site', 'Locations and properties', 'building', TRUE
FROM organisations;

-- ============================================
-- STEP 3: ADD RECORD_TYPE_ID TO SITES TABLE
-- ============================================

-- Add the new column (nullable initially)
ALTER TABLE sites ADD COLUMN record_type_id UUID REFERENCES record_types(id);

-- Populate record_type_id for existing sites
UPDATE sites s
SET record_type_id = rt.id
FROM record_types rt
WHERE rt.organisation_id = s.organisation_id AND rt.is_default = TRUE;

-- Make record_type_id NOT NULL after population
ALTER TABLE sites ALTER COLUMN record_type_id SET NOT NULL;

-- ============================================
-- STEP 4: ADD NEW COLUMNS TO SITES (before rename)
-- ============================================

ALTER TABLE sites ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE sites ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Create index for archived records
CREATE INDEX idx_sites_archived ON sites(archived) WHERE NOT archived;

-- ============================================
-- STEP 5: RENAME SITES TO RECORDS
-- ============================================

-- Drop existing indexes that will be renamed
DROP INDEX IF EXISTS idx_sites_organisation;
DROP INDEX IF EXISTS idx_sites_archived;

-- Rename the table
ALTER TABLE sites RENAME TO records;

-- Rename related columns in other tables
ALTER TABLE reports RENAME COLUMN site_id TO record_id;

-- Recreate indexes with new names
CREATE INDEX idx_records_organisation ON records(organisation_id);
CREATE INDEX idx_records_record_type ON records(record_type_id);
CREATE INDEX idx_records_archived ON records(archived) WHERE NOT archived;

-- Update reports index
DROP INDEX IF EXISTS idx_reports_site;
CREATE INDEX idx_reports_record ON reports(record_id);

-- ============================================
-- STEP 6: RENAME USER_SITE_ASSIGNMENTS TO USER_RECORD_ASSIGNMENTS
-- ============================================

-- Rename the table
ALTER TABLE user_site_assignments RENAME TO user_record_assignments;

-- Rename the column
ALTER TABLE user_record_assignments RENAME COLUMN site_id TO record_id;

-- Update foreign key constraint (drop and recreate)
ALTER TABLE user_record_assignments DROP CONSTRAINT IF EXISTS user_site_assignments_site_id_fkey;
ALTER TABLE user_record_assignments ADD CONSTRAINT user_record_assignments_record_id_fkey
    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE;

-- Update unique constraint
ALTER TABLE user_record_assignments DROP CONSTRAINT IF EXISTS user_site_assignments_user_id_site_id_key;
ALTER TABLE user_record_assignments ADD CONSTRAINT user_record_assignments_user_id_record_id_key
    UNIQUE(user_id, record_id);

-- ============================================
-- STEP 7: UPDATE TEMPLATES TO LINK TO RECORD_TYPES
-- ============================================

-- Add record_type_id to templates (nullable initially for backwards compatibility)
ALTER TABLE templates ADD COLUMN record_type_id UUID REFERENCES record_types(id);

-- For existing templates, set record_type_id to the default Sites record type
UPDATE templates t
SET record_type_id = rt.id
FROM record_types rt
WHERE rt.organisation_id = t.organisation_id AND rt.is_default = TRUE;

-- Create index
CREATE INDEX idx_templates_record_type ON templates(record_type_id);

-- ============================================
-- STEP 8: DROP SITE_TEMPLATE_ASSIGNMENTS
-- Templates now link to record_types, not individual records
-- ============================================

-- Store the old assignments in a migration tracking table for audit
CREATE TABLE IF NOT EXISTS _migration_site_template_backup (
    site_id UUID,
    template_id UUID,
    created_at TIMESTAMPTZ,
    migrated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO _migration_site_template_backup (site_id, template_id, created_at)
SELECT site_id, template_id, created_at
FROM site_template_assignments;

-- Now drop the old table
DROP TABLE site_template_assignments;

-- ============================================
-- STEP 9: UPDATE RLS POLICIES
-- ============================================

-- Drop old policies that reference sites
DROP POLICY IF EXISTS "Users can view accessible sites" ON records;
DROP POLICY IF EXISTS "Admins can insert sites" ON records;
DROP POLICY IF EXISTS "Admins can update sites" ON records;
DROP POLICY IF EXISTS "Admins can delete sites" ON records;

-- Drop old user_site_assignments policies
DROP POLICY IF EXISTS "Users can view own site assignments" ON user_record_assignments;
DROP POLICY IF EXISTS "Admins can manage site assignments" ON user_record_assignments;

-- Enable RLS on record_types
ALTER TABLE record_types ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RECORD_TYPES POLICIES
-- ============================================

CREATE POLICY "Users can view org record types"
ON record_types FOR SELECT
USING (organisation_id IN (SELECT get_user_organisation_ids()));

CREATE POLICY "Admins can insert record types"
ON record_types FOR INSERT
WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update record types"
ON record_types FOR UPDATE
USING (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete record types"
ON record_types FOR DELETE
USING (is_org_admin(organisation_id));

-- ============================================
-- RECORDS POLICIES (formerly sites)
-- ============================================

CREATE POLICY "Users can view accessible records"
ON records FOR SELECT
USING (
    (organisation_id IN (SELECT get_user_organisation_ids()) AND is_org_admin(organisation_id))
    OR
    id IN (SELECT record_id FROM user_record_assignments WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can insert records"
ON records FOR INSERT
WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update records"
ON records FOR UPDATE
USING (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete records"
ON records FOR DELETE
USING (is_org_admin(organisation_id));

-- ============================================
-- USER_RECORD_ASSIGNMENTS POLICIES
-- ============================================

CREATE POLICY "Users can view own record assignments"
ON user_record_assignments FOR SELECT
USING (
    user_id = auth.uid()
    OR
    record_id IN (
        SELECT r.id FROM records r
        WHERE is_org_admin(r.organisation_id)
    )
);

CREATE POLICY "Admins can manage record assignments"
ON user_record_assignments FOR ALL
USING (
    record_id IN (
        SELECT r.id FROM records r
        WHERE is_org_admin(r.organisation_id)
    )
);

-- ============================================
-- UPDATE HELPER FUNCTION FOR RECORD ACCESS
-- ============================================

-- Drop and recreate has_site_access as has_record_access
DROP FUNCTION IF EXISTS has_site_access(UUID);

CREATE OR REPLACE FUNCTION has_record_access(record_id_param UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_record_assignments
        WHERE user_id = auth.uid() AND record_id = record_id_param
    ) OR EXISTS (
        SELECT 1 FROM records r
        JOIN organisation_users ou ON ou.organisation_id = r.organisation_id
        WHERE r.id = record_id_param
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Keep has_site_access as an alias for backwards compatibility during migration
CREATE OR REPLACE FUNCTION has_site_access(site_id_param UUID)
RETURNS BOOLEAN AS $$
    SELECT has_record_access(site_id_param);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- UPDATE REPORTS INSERT POLICY
-- ============================================

DROP POLICY IF EXISTS "Users can insert reports" ON reports;

CREATE POLICY "Users can insert reports"
ON reports FOR INSERT
WITH CHECK (
    has_record_access(record_id)
    AND organisation_id IN (SELECT get_user_organisation_ids())
);

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE record_types IS 'Defines categories of records an organisation can create (Sites, Vehicles, Clients, etc.)';
COMMENT ON TABLE records IS 'Individual records of any type (formerly sites). Linked to a record_type.';
COMMENT ON TABLE user_record_assignments IS 'Assigns users to specific records they can access';
COMMENT ON COLUMN templates.record_type_id IS 'Optional: restricts this template to a specific record type';
COMMENT ON COLUMN records.metadata IS 'Custom field values defined by the record_type.fields schema';
