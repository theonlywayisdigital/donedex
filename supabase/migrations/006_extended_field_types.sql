-- Extended Field Types Migration
-- Adds support for 30+ new field types and their configuration columns

-- ============================================
-- DROP AND RECREATE item_type CHECK CONSTRAINT
-- ============================================

-- First, drop the existing check constraint on item_type
ALTER TABLE template_items DROP CONSTRAINT IF EXISTS template_items_item_type_check;

-- Add new check constraint with all field types
ALTER TABLE template_items ADD CONSTRAINT template_items_item_type_check CHECK (item_type IN (
    -- Original types
    'pass_fail',
    'yes_no',
    'condition',
    'severity',
    'text',
    'number',
    'select',
    'multi_select',
    'photo',

    -- Previously added types
    'signature',
    'declaration',
    'datetime',
    'rating',

    -- RATING & SCALES
    'rating_stars',      -- 1-5 star rating
    'rating_numeric',    -- 1-10 scale
    'slider',            -- 0-100% drag slider
    'traffic_light',     -- Red/Amber/Green buttons

    -- DATE & TIME
    'date',              -- Date picker
    'time',              -- Time picker
    'expiry_date',       -- Date with visual warning when overdue

    -- MEASUREMENT & COUNTING
    'counter',           -- Tap +/- buttons to increment/decrement
    'measurement',       -- Number + unit selector (m, cm, ft, mm)
    'temperature',       -- Number + °C/°F toggle
    'meter_reading',     -- Number input + required photo
    'currency',          -- Number + currency symbol (£/$/€)

    -- EVIDENCE & MEDIA
    'photo_required',    -- Mandatory photo
    'photo_before_after', -- Two linked photos
    'video',             -- Short video clip (max 30s)
    'audio',             -- Voice memo recording
    'annotated_photo',   -- Take photo then draw/mark on it

    -- LOCATION & ASSETS
    'gps_location',      -- Auto-capture current coordinates
    'barcode_scan',      -- Scan barcode or QR code
    'asset_lookup',      -- Search or scan to link asset

    -- PEOPLE
    'person_picker',     -- Select from team members
    'contractor',        -- Name + company + phone fields
    'witness',           -- Name + signature capture

    -- SMART/ADVANCED
    'conditional',       -- Only shows if a trigger condition is met (handled by condition_* columns)
    'repeater',          -- Add multiple entries of same fields
    'checklist',         -- Nested checkboxes within an item
    'instruction',       -- Display-only text/image (no input)
    'auto_timestamp',    -- Auto-filled when section completed
    'auto_weather'       -- Auto-pull current weather conditions
));

-- ============================================
-- ADD NEW COLUMNS FOR EXTENDED FIELD CONFIGS
-- ============================================

-- Common options (may already exist from previous work)
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS help_text TEXT;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS placeholder_text TEXT;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS default_value TEXT;

-- Number/measurement constraints
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS min_value NUMERIC;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS max_value NUMERIC;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS step_value NUMERIC DEFAULT 1;

-- DateTime config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS datetime_mode TEXT CHECK (datetime_mode IN ('date', 'time', 'datetime'));

-- Rating config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS rating_max INTEGER DEFAULT 5;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS rating_style TEXT DEFAULT 'stars' CHECK (rating_style IN ('stars', 'numeric', 'slider'));

-- Declaration/signature config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS declaration_text TEXT;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS signature_requires_name BOOLEAN DEFAULT FALSE;

-- Conditional visibility
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS condition_field_id UUID REFERENCES template_items(id);
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS condition_operator TEXT CHECK (condition_operator IN ('equals', 'not_equals', 'not_empty', 'greater_than', 'less_than', 'contains'));
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS condition_value TEXT;

-- Measurement unit config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS unit_type TEXT; -- 'length', 'temperature', 'currency', etc.
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS unit_options JSONB; -- ["m", "cm", "ft", "mm"] or ["°C", "°F"] or ["£", "$", "€"]
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS default_unit TEXT;

-- Counter config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS counter_min INTEGER DEFAULT 0;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS counter_max INTEGER;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS counter_step INTEGER DEFAULT 1;

-- Media config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS max_media_count INTEGER DEFAULT 1;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS media_required BOOLEAN DEFAULT FALSE;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS max_duration_seconds INTEGER; -- For video/audio

-- Expiry date config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS warning_days_before INTEGER DEFAULT 30;

-- Checklist/repeater config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS sub_items JSONB; -- For nested checklists or repeater field definitions
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS min_entries INTEGER DEFAULT 1;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS max_entries INTEGER;

-- Instruction field config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS instruction_image_url TEXT;
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS instruction_style TEXT DEFAULT 'info' CHECK (instruction_style IN ('info', 'warning', 'tip'));

-- Asset lookup config
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS asset_types JSONB; -- Filter by asset type

-- ============================================
-- EXTEND REPORT_RESPONSES FOR NEW DATA TYPES
-- ============================================

-- Add columns for structured response data
ALTER TABLE report_responses ADD COLUMN IF NOT EXISTS response_data JSONB; -- For complex responses (contractor info, GPS coords, etc.)
ALTER TABLE report_responses ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE report_responses ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE report_responses ADD COLUMN IF NOT EXISTS weather_data JSONB;
ALTER TABLE report_responses ADD COLUMN IF NOT EXISTS asset_id UUID;
ALTER TABLE report_responses ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES auth.users(id);

-- ============================================
-- CREATE ASSETS TABLE (for asset_lookup field type)
-- ============================================

CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- 'equipment', 'vehicle', 'fixture', etc.
    barcode TEXT,
    serial_number TEXT,
    description TEXT,
    metadata JSONB, -- Flexible additional fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for asset lookups
CREATE INDEX IF NOT EXISTS idx_assets_organisation ON assets(organisation_id);
CREATE INDEX IF NOT EXISTS idx_assets_site ON assets(site_id);
CREATE INDEX IF NOT EXISTS idx_assets_barcode ON assets(barcode);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CREATE REPORT_MEDIA TABLE (for video, audio, annotated photos)
-- ============================================

CREATE TABLE IF NOT EXISTS report_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_response_id UUID NOT NULL REFERENCES report_responses(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'audio', 'annotated_photo', 'signature')),
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    duration_seconds INTEGER, -- For video/audio
    file_size_bytes INTEGER,
    metadata JSONB, -- EXIF data, annotations, etc.
    sort_order INTEGER DEFAULT 0,
    label TEXT, -- 'before', 'after', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_media_response ON report_media(report_response_id);
CREATE INDEX IF NOT EXISTS idx_report_media_type ON report_media(media_type);

-- ============================================
-- ADD RLS POLICIES FOR NEW TABLES
-- ============================================

-- Enable RLS on assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Assets: Users can view assets in their organisation
CREATE POLICY "Users can view organisation assets"
ON assets FOR SELECT
USING (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid()
    )
);

-- Assets: Admins can manage assets
CREATE POLICY "Admins can manage assets"
ON assets FOR ALL
USING (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Enable RLS on report_media
ALTER TABLE report_media ENABLE ROW LEVEL SECURITY;

-- Report media: Users can view media for reports they can access
CREATE POLICY "Users can view report media"
ON report_media FOR SELECT
USING (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON rr.report_id = r.id
        WHERE r.organisation_id IN (
            SELECT organisation_id FROM organisation_users
            WHERE user_id = auth.uid()
        )
    )
);

-- Report media: Users can insert media for their own reports
CREATE POLICY "Users can insert own report media"
ON report_media FOR INSERT
WITH CHECK (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON rr.report_id = r.id
        WHERE r.user_id = auth.uid() AND r.status = 'draft'
    )
);

-- ============================================
-- CREATE STORAGE BUCKETS FOR NEW MEDIA TYPES
-- ============================================
-- Note: Run these in Supabase dashboard or via API:
-- - report-videos
-- - report-audio
-- - report-signatures
-- - annotated-photos

COMMENT ON TABLE template_items IS 'Extended field types support: rating_stars, rating_numeric, slider, traffic_light, date, time, expiry_date, counter, measurement, temperature, meter_reading, currency, photo_required, photo_before_after, video, audio, annotated_photo, gps_location, barcode_scan, asset_lookup, person_picker, contractor, witness, conditional, repeater, checklist, instruction, auto_timestamp, auto_weather';
