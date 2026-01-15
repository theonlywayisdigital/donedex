-- ============================================
-- Migration 019: Demo Template
-- ============================================
-- This migration adds:
-- 1. Demo library_record_type - for demonstration purposes
-- 2. Demo library_template - showcasing all 38 field types
-- 3. Function to auto-create demo record for new orgs

-- ============================================
-- 1. INSERT DEMO LIBRARY RECORD TYPE
-- ============================================
INSERT INTO library_record_types (id, name, name_singular, description, icon, color, sort_order, fields)
VALUES (
    'demo',
    'Demos',
    'Demo',
    'Sample records for demonstration and testing',
    'play-circle',
    '#0F4C5C',
    0,  -- First position (shows at top)
    '[]'::jsonb
);

-- ============================================
-- 2. INSERT DEMO LIBRARY TEMPLATE
-- ============================================
INSERT INTO library_templates (id, name, description, record_type_id, sections, sort_order)
VALUES (
    'demo-field-showcase',
    'Demo Field Showcase',
    'Experience all 38 field types with this interactive demo template',
    'demo',
    '[
        {
            "name": "Basic Checks",
            "items": [
                {"label": "Fire extinguisher present and accessible?", "item_type": "pass_fail", "is_required": true, "photo_rule": "on_fail"},
                {"label": "Emergency exits clearly marked?", "item_type": "yes_no", "is_required": true},
                {"label": "Rate the flooring condition", "item_type": "condition", "is_required": false},
                {"label": "Hazard severity level", "item_type": "severity", "is_required": false},
                {"label": "Additional notes or comments", "item_type": "text", "is_required": false},
                {"label": "Number of windows in room", "item_type": "number", "is_required": false},
                {"label": "Room type", "item_type": "select", "is_required": true, "options": ["Office", "Kitchen", "Bathroom", "Storage", "Meeting Room"]},
                {"label": "Utilities present", "item_type": "multi_select", "options": ["Electric", "Gas", "Water", "Internet"]}
            ]
        },
        {
            "name": "Ratings & Scales",
            "items": [
                {"label": "Overall satisfaction", "item_type": "rating", "is_required": false, "rating_max": 5},
                {"label": "Cleanliness rating", "item_type": "rating", "is_required": true, "rating_max": 5},
                {"label": "Security score (1-10)", "item_type": "rating_numeric", "is_required": false},
                {"label": "Noise level", "item_type": "slider", "is_required": false},
                {"label": "Ventilation status", "item_type": "traffic_light", "is_required": true}
            ]
        },
        {
            "name": "Date & Time",
            "items": [
                {"label": "Last inspection date", "item_type": "date", "is_required": false},
                {"label": "Inspection start time", "item_type": "time", "is_required": false},
                {"label": "Scheduled maintenance", "item_type": "datetime", "is_required": false},
                {"label": "Certificate expiry date", "item_type": "expiry_date", "is_required": false, "warning_days_before": 30}
            ]
        },
        {
            "name": "Evidence & Media",
            "items": [
                {"label": "Photo of entrance", "item_type": "photo", "is_required": false},
                {"label": "Photo of main area", "item_type": "photo", "is_required": true},
                {"label": "Before/after comparison", "item_type": "photo_before_after", "is_required": false},
                {"label": "Video walkthrough", "item_type": "video", "is_required": false, "max_duration_seconds": 30},
                {"label": "Voice notes", "item_type": "audio", "is_required": false},
                {"label": "Inspector signature", "item_type": "signature", "is_required": true},
                {"label": "Mark issues on photo", "item_type": "annotated_photo", "is_required": false}
            ]
        },
        {
            "name": "Measurements",
            "items": [
                {"label": "Number of defects found", "item_type": "counter", "is_required": false, "counter_min": 0, "counter_max": 50},
                {"label": "Room dimensions", "item_type": "measurement", "is_required": false, "unit_type": "length", "default_unit": "m"},
                {"label": "Room temperature", "item_type": "temperature", "is_required": false},
                {"label": "Electric meter reading", "item_type": "meter_reading", "is_required": false},
                {"label": "Estimated repair cost", "item_type": "currency", "is_required": false, "default_unit": "£"}
            ]
        },
        {
            "name": "Advanced Fields",
            "items": [
                {"label": "This section demonstrates advanced field types including location, people assignment, and confirmations.", "item_type": "instruction", "instruction_style": "info"},
                {"label": "I confirm this inspection was completed thoroughly", "item_type": "declaration", "is_required": true, "declaration_text": "By checking this box, I confirm that this inspection has been completed to the best of my ability."},
                {"label": "Items checked", "item_type": "checklist", "sub_items": [{"label": "Walls"}, {"label": "Ceiling"}, {"label": "Floor"}, {"label": "Fixtures"}]},
                {"label": "GPS coordinates", "item_type": "gps_location", "is_required": false},
                {"label": "Asset barcode", "item_type": "barcode_scan", "is_required": false},
                {"label": "Link to asset", "item_type": "asset_lookup", "is_required": false},
                {"label": "Assigned to", "item_type": "person_picker", "is_required": false},
                {"label": "Contractor details", "item_type": "contractor", "is_required": false},
                {"label": "Witness signature", "item_type": "witness", "is_required": false}
            ]
        }
    ]'::jsonb,
    0  -- First position
);

-- ============================================
-- 3. FUNCTION TO CREATE DEMO RECORD FOR ORG
-- ============================================
-- This function creates a Demo record type and a sample Demo record for an organisation
CREATE OR REPLACE FUNCTION create_demo_record_for_org(org_id UUID)
RETURNS VOID AS $$
DECLARE
    demo_record_type_id UUID;
BEGIN
    -- Create Demo record type for this org (copying from library)
    INSERT INTO record_types (
        organisation_id,
        name,
        name_singular,
        description,
        icon,
        color,
        is_default,
        is_system,
        source_library_id
    )
    VALUES (
        org_id,
        'Demos',
        'Demo',
        'Sample records for demonstration and testing',
        'play-circle',
        '#0F4C5C',
        FALSE,  -- Not the default record type
        TRUE,   -- System type - cannot be deleted
        'demo'  -- Link to library
    )
    RETURNING id INTO demo_record_type_id;

    -- Create a sample Demo record
    INSERT INTO records (
        organisation_id,
        record_type_id,
        name,
        address,
        description,
        metadata
    )
    VALUES (
        org_id,
        demo_record_type_id,
        'Demo Property',
        '123 Demo Street, London, UK',
        'This is a sample demo record. Use it to test templates and see how inspections work.',
        '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_demo_record_for_org IS 'Creates a Demo record type and sample Demo record for an organisation';

-- ============================================
-- 4. CREATE DEMO RECORDS FOR EXISTING ORGS
-- ============================================
-- Run the function for all existing organisations that don't already have a Demo record type
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN
        SELECT id FROM organisations
        WHERE id NOT IN (
            SELECT organisation_id FROM record_types WHERE source_library_id = 'demo'
        )
    LOOP
        PERFORM create_demo_record_for_org(org.id);
    END LOOP;
END $$;
