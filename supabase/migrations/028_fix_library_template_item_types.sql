-- ============================================
-- Migration 028: Fix Library Template Item Types
-- ============================================
-- This migration fixes invalid item_type values in library_templates
-- that were not matching the template_items CHECK constraint.
--
-- Invalid types → Valid types:
-- - good_fair_poor → condition
-- - severity_rating → severity
-- - short_text → text
-- - long_text → text
-- - single_select → select
-- - photo_only → photo

-- ============================================
-- 1. FIX LIBRARY TEMPLATES JSON DATA
-- ============================================
-- Update all library templates to use valid item_type values

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
                                WHEN item->>'item_type' = 'good_fair_poor' THEN
                                    jsonb_set(item, '{item_type}', '"condition"')
                                WHEN item->>'item_type' = 'severity_rating' THEN
                                    jsonb_set(item, '{item_type}', '"severity"')
                                WHEN item->>'item_type' = 'short_text' THEN
                                    jsonb_set(item, '{item_type}', '"text"')
                                WHEN item->>'item_type' = 'long_text' THEN
                                    jsonb_set(item, '{item_type}', '"text"')
                                WHEN item->>'item_type' = 'single_select' THEN
                                    jsonb_set(item, '{item_type}', '"select"')
                                WHEN item->>'item_type' = 'photo_only' THEN
                                    jsonb_set(item, '{item_type}', '"photo"')
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
WHERE sections::text LIKE '%good_fair_poor%'
   OR sections::text LIKE '%severity_rating%'
   OR sections::text LIKE '%short_text%'
   OR sections::text LIKE '%long_text%'
   OR sections::text LIKE '%single_select%'
   OR sections::text LIKE '%photo_only%';

-- ============================================
-- 2. FIX ANY TEMPLATE_ITEMS WITH INVALID TYPES
-- ============================================
-- In case any invalid types made it into the template_items table
-- (this would have failed due to the constraint, but just in case)

-- Note: These updates would fail on insert, so we're just documenting
-- the valid type mappings here for reference:
-- UPDATE template_items SET item_type = 'condition' WHERE item_type = 'good_fair_poor';
-- UPDATE template_items SET item_type = 'severity' WHERE item_type = 'severity_rating';
-- UPDATE template_items SET item_type = 'text' WHERE item_type = 'short_text';
-- UPDATE template_items SET item_type = 'text' WHERE item_type = 'long_text';
-- UPDATE template_items SET item_type = 'select' WHERE item_type = 'single_select';
-- UPDATE template_items SET item_type = 'photo' WHERE item_type = 'photo_only';

-- ============================================
-- VERIFICATION
-- ============================================
-- Run this to verify no invalid types remain:
-- SELECT id, name FROM library_templates
-- WHERE sections::text LIKE '%good_fair_poor%'
--    OR sections::text LIKE '%severity_rating%'
--    OR sections::text LIKE '%short_text%'
--    OR sections::text LIKE '%long_text%'
--    OR sections::text LIKE '%single_select%'
--    OR sections::text LIKE '%photo_only%';
-- Should return 0 rows
