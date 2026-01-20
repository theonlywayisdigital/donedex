-- ============================================
-- Migration 034: Add Composite Field Types
-- ============================================
-- Adds support for composite field groups like person name,
-- contact info, and address fields.
-- ============================================

-- Drop the existing check constraint on item_type
ALTER TABLE template_items DROP CONSTRAINT IF EXISTS template_items_item_type_check;

-- Add new check constraint with all field types including composites
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
    'rating_stars',
    'rating_numeric',
    'slider',
    'traffic_light',

    -- DATE & TIME
    'date',
    'time',
    'expiry_date',

    -- MEASUREMENT & COUNTING
    'counter',
    'measurement',
    'temperature',
    'meter_reading',
    'currency',

    -- EVIDENCE & MEDIA
    'photo_required',
    'photo_before_after',
    'video',
    'audio',
    'annotated_photo',

    -- LOCATION & ASSETS
    'gps_location',
    'barcode_scan',
    'asset_lookup',

    -- PEOPLE
    'person_picker',
    'contractor',
    'witness',

    -- SMART/ADVANCED
    'conditional',
    'repeater',
    'checklist',
    'instruction',
    'auto_timestamp',
    'auto_weather',

    -- COMPOSITE FIELD GROUPS (NEW)
    'composite_person_name',
    'composite_contact',
    'composite_address_uk',
    'composite_address_us',
    'composite_address_intl',
    'composite_vehicle'
));

COMMENT ON TABLE template_items IS 'Extended field types support including composite field groups: composite_person_name, composite_contact, composite_address_uk, composite_address_us, composite_address_intl, composite_vehicle';
