-- ============================================
-- Migration 009: Record Type Fields + Library
-- ============================================
-- This migration adds:
-- 1. record_type_fields table - custom fields per record type
-- 2. library_record_types table - pre-built record types
-- 3. library_templates table - pre-built templates
-- 4. New columns on record_types for library tracking

-- ============================================
-- 1. CREATE RECORD_TYPE_FIELDS TABLE
-- ============================================
CREATE TABLE record_type_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_type_id UUID NOT NULL REFERENCES record_types(id) ON DELETE CASCADE,

    -- Field definition
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,  -- Reuse existing 53 field types from fieldTypes.ts

    -- Configuration
    is_required BOOLEAN DEFAULT FALSE,
    help_text TEXT,
    placeholder_text TEXT,
    default_value TEXT,

    -- Type-specific config (reuse template_items patterns)
    options JSONB,  -- For select/multi_select: [{value, label}]
    min_value NUMERIC,
    max_value NUMERIC,
    unit_type TEXT,
    unit_options JSONB,
    default_unit TEXT,

    -- Display
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE record_type_fields IS 'Custom fields defined for each record type';
COMMENT ON COLUMN record_type_fields.field_type IS 'One of 53 field types from fieldTypes.ts';
COMMENT ON COLUMN record_type_fields.options IS 'For select/multi_select: array of {value, label} options';

-- ============================================
-- 2. UPDATE RECORD_TYPES TABLE
-- ============================================
ALTER TABLE record_types ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE record_types ADD COLUMN IF NOT EXISTS source_library_id TEXT;

COMMENT ON COLUMN record_types.is_system IS 'True for system-created types that cannot be deleted';
COMMENT ON COLUMN record_types.source_library_id IS 'ID of library_record_types this was copied from';

-- ============================================
-- 3. CREATE LIBRARY TABLES
-- ============================================

-- Library Record Types - pre-built record type templates
CREATE TABLE library_record_types (
    id TEXT PRIMARY KEY,  -- slug: 'vehicles', 'sites', 'equipment'
    name TEXT NOT NULL,
    name_singular TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    fields JSONB NOT NULL  -- Pre-defined fields as JSON array
);

COMMENT ON TABLE library_record_types IS 'Pre-built record types available for all organisations';
COMMENT ON COLUMN library_record_types.id IS 'URL-friendly slug identifier';
COMMENT ON COLUMN library_record_types.fields IS 'Array of field definitions to copy when creating';

-- Library Templates - pre-built inspection templates
CREATE TABLE library_templates (
    id TEXT PRIMARY KEY,  -- slug: 'daily-vehicle-walkaround'
    name TEXT NOT NULL,
    description TEXT,
    record_type_id TEXT NOT NULL REFERENCES library_record_types(id),
    sections JSONB NOT NULL,  -- Full template structure
    sort_order INTEGER DEFAULT 0
);

COMMENT ON TABLE library_templates IS 'Pre-built templates linked to library record types';
COMMENT ON COLUMN library_templates.sections IS 'Full template section/item structure';

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX idx_record_type_fields_type ON record_type_fields(record_type_id);
CREATE INDEX idx_record_type_fields_order ON record_type_fields(record_type_id, sort_order);
CREATE INDEX idx_record_types_source_library ON record_types(source_library_id) WHERE source_library_id IS NOT NULL;
CREATE INDEX idx_library_templates_record_type ON library_templates(record_type_id);

-- ============================================
-- 5. RLS POLICIES FOR record_type_fields
-- ============================================
ALTER TABLE record_type_fields ENABLE ROW LEVEL SECURITY;

-- Users can view fields for record types in their organisation
CREATE POLICY "Users can view record type fields"
ON record_type_fields FOR SELECT
USING (
    record_type_id IN (
        SELECT id FROM record_types
        WHERE organisation_id IN (SELECT get_user_organisation_ids())
    )
);

-- Admins can manage fields for record types in their organisation
CREATE POLICY "Admins can manage record type fields"
ON record_type_fields FOR ALL
USING (
    record_type_id IN (
        SELECT id FROM record_types rt
        WHERE is_org_admin(rt.organisation_id)
    )
);

-- ============================================
-- 6. LIBRARY TABLES RLS POLICIES
-- ============================================
-- Library tables are read-only reference data accessible to all authenticated users

ALTER TABLE library_record_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read library record types
CREATE POLICY "Anyone can read library record types"
ON library_record_types FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can read library templates
CREATE POLICY "Anyone can read library templates"
ON library_templates FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 7. UPDATE TRIGGER FOR record_type_fields
-- ============================================
CREATE TRIGGER update_record_type_fields_updated_at
    BEFORE UPDATE ON record_type_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
