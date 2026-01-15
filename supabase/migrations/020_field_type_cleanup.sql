-- ============================================
-- Migration 020: Field Type Cleanup
-- ============================================
-- This migration:
-- 1. Migrates existing rating_stars items to rating with rating_max: 5
-- 2. Migrates existing photo_required items to photo with is_required: true
-- 3. Updates the template_items CHECK constraint to remove deprecated types

-- ============================================
-- 1. MIGRATE EXISTING DATA
-- ============================================

-- Migrate rating_stars to rating
-- Note: Template items are stored in JSONB sections, so we need to update the JSON
UPDATE library_templates
SET sections = (
    SELECT jsonb_agg(
        CASE
            WHEN section ? 'items' THEN
                jsonb_set(
                    section,
                    '{items}',
                    (
                        SELECT jsonb_agg(
                            CASE
                                WHEN item->>'item_type' = 'rating_stars' THEN
                                    item || '{"item_type": "rating"}'::jsonb ||
                                    CASE WHEN NOT (item ? 'rating_max') THEN '{"rating_max": 5}'::jsonb ELSE '{}'::jsonb END
                                WHEN item->>'item_type' = 'photo_required' THEN
                                    item || '{"item_type": "photo", "is_required": true}'::jsonb
                                ELSE item
                            END
                        )
                        FROM jsonb_array_elements(section->'items') item
                    )
                )
            ELSE section
        END
    )
    FROM jsonb_array_elements(sections) section
)
WHERE sections::text LIKE '%rating_stars%' OR sections::text LIKE '%photo_required%';

-- Migrate organisation template items (stored in template_items table)
UPDATE template_items
SET item_type = 'rating',
    rating_max = COALESCE(rating_max, 5)
WHERE item_type = 'rating_stars';

UPDATE template_items
SET item_type = 'photo',
    is_required = true
WHERE item_type = 'photo_required';

-- ============================================
-- 2. UPDATE CHECK CONSTRAINT
-- ============================================
-- Remove rating_stars and photo_required from valid types

ALTER TABLE template_items DROP CONSTRAINT IF EXISTS template_items_item_type_check;
ALTER TABLE template_items ADD CONSTRAINT template_items_item_type_check
CHECK (item_type IN (
  'pass_fail', 'yes_no', 'condition', 'severity', 'text', 'number', 'select', 'multi_select',
  'photo', 'signature', 'declaration', 'datetime', 'rating',
  'rating_numeric', 'slider', 'traffic_light',
  'date', 'time', 'expiry_date',
  'counter', 'measurement', 'temperature', 'meter_reading', 'currency',
  'photo_before_after', 'video', 'audio', 'annotated_photo',
  'gps_location', 'barcode_scan', 'asset_lookup',
  'person_picker', 'contractor', 'witness',
  'conditional', 'repeater', 'checklist', 'instruction', 'auto_timestamp', 'auto_weather'
));

-- Add comment explaining the migration
COMMENT ON CONSTRAINT template_items_item_type_check ON template_items IS
'Valid field types - rating_stars merged into rating, photo_required merged into photo';
