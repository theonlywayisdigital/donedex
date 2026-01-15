-- ============================================
-- Migration 021: Fix Plan Features
-- ============================================
-- This migration adds missing feature columns to subscription_plans
-- and sets appropriate values for each plan tier.
--
-- Missing columns:
-- - feature_photos
-- - feature_starter_templates
-- - feature_all_field_types
--
-- Also fixes feature_custom_branding for Pro plan (should be TRUE)

-- ============================================
-- 1. ADD MISSING COLUMNS
-- ============================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS feature_photos BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS feature_starter_templates BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS feature_all_field_types BOOLEAN DEFAULT FALSE;

-- ============================================
-- 2. SET FEATURE VALUES FOR EACH PLAN
-- ============================================

-- Free plan: Limited features
UPDATE subscription_plans
SET
    feature_photos = FALSE,
    feature_starter_templates = FALSE,
    feature_all_field_types = FALSE,
    feature_custom_branding = FALSE
WHERE slug = 'free';

-- Pro plan: Full features except white-label
UPDATE subscription_plans
SET
    feature_photos = TRUE,
    feature_starter_templates = TRUE,
    feature_all_field_types = TRUE,
    feature_custom_branding = TRUE,
    feature_ai_templates = TRUE
WHERE slug = 'pro';

-- Enterprise plan: Everything
UPDATE subscription_plans
SET
    feature_photos = TRUE,
    feature_starter_templates = TRUE,
    feature_all_field_types = TRUE,
    feature_custom_branding = TRUE,
    feature_ai_templates = TRUE,
    feature_api_access = TRUE,
    feature_white_label = TRUE,
    feature_advanced_analytics = TRUE
WHERE slug = 'enterprise';

-- ============================================
-- 3. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN subscription_plans.feature_photos IS 'Allow photo attachments on inspections';
COMMENT ON COLUMN subscription_plans.feature_starter_templates IS 'Access to library starter templates';
COMMENT ON COLUMN subscription_plans.feature_all_field_types IS 'Access to all field types (not just basic checks)';
