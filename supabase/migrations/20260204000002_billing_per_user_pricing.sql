-- ============================================================
-- Add Per-User Pricing to Subscription Plans
-- Adds missing columns for per-user pricing model
-- ============================================================

-- Add per-user pricing columns if they don't exist
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS price_per_user_monthly_gbp INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS price_per_user_annual_gbp INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS base_users_included INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_per_user_price_id_monthly TEXT;

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS stripe_per_user_price_id_annual TEXT;

ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS allowed_field_categories JSONB DEFAULT '["basic", "evidence"]'::jsonb;

-- Add discount columns to organisations if they don't exist
ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS discount_notes TEXT;

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS discount_applied_by UUID REFERENCES auth.users(id);

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS discount_applied_at TIMESTAMPTZ;

-- Update Free plan with correct values
UPDATE public.subscription_plans
SET
  description = 'Get started with basic inspections',
  max_reports_per_month = 10,
  feature_photos = true,
  price_per_user_monthly_gbp = 0,
  price_per_user_annual_gbp = 0,
  base_users_included = 0,
  allowed_field_categories = '["basic", "evidence"]'::jsonb,
  display_order = 0,
  updated_at = now()
WHERE slug = 'free';

-- Update Pro plan with per-user pricing (£29/mo + £9/user)
UPDATE public.subscription_plans
SET
  description = 'For growing teams with advanced inspections',
  max_users = -1,
  max_records = -1,
  max_reports_per_month = 100,
  max_storage_gb = 25,
  feature_ai_templates = true,
  feature_custom_branding = true,
  feature_photos = true,
  feature_starter_templates = true,
  feature_all_field_types = true,
  price_monthly_gbp = 2900,
  price_annual_gbp = 27840,
  price_per_user_monthly_gbp = 900,
  price_per_user_annual_gbp = 8640,
  base_users_included = 1,
  allowed_field_categories = '["basic", "rating_scales", "date_time", "measurement", "evidence", "location", "people", "advanced", "groups"]'::jsonb,
  display_order = 1,
  updated_at = now()
WHERE slug = 'pro';

-- Update Enterprise plan with per-user pricing (£99/mo + £11/user)
UPDATE public.subscription_plans
SET
  description = 'Full platform with API, white label, and priority support',
  max_users = -1,
  max_records = -1,
  max_reports_per_month = -1,
  max_storage_gb = 100,
  feature_ai_templates = true,
  feature_pdf_export = true,
  feature_api_access = true,
  feature_custom_branding = true,
  feature_priority_support = true,
  feature_white_label = true,
  feature_advanced_analytics = true,
  feature_photos = true,
  feature_starter_templates = true,
  feature_all_field_types = true,
  price_monthly_gbp = 9900,
  price_annual_gbp = 95040,
  price_per_user_monthly_gbp = 1100,
  price_per_user_annual_gbp = 10560,
  base_users_included = 1,
  allowed_field_categories = '["basic", "rating_scales", "date_time", "measurement", "evidence", "location", "people", "advanced", "groups"]'::jsonb,
  display_order = 2,
  updated_at = now()
WHERE slug = 'enterprise';

-- Comment explaining pricing
COMMENT ON COLUMN public.subscription_plans.price_per_user_monthly_gbp IS 'Price per additional user per month in pence (e.g., 900 = £9)';
COMMENT ON COLUMN public.subscription_plans.price_per_user_annual_gbp IS 'Price per additional user per year in pence (e.g., 8640 = £86.40)';
COMMENT ON COLUMN public.subscription_plans.base_users_included IS 'Number of users included in base price (0 = none, 1 = one user included)';
