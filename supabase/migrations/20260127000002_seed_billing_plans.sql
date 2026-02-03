-- ============================================================
-- Seed Billing Plans
-- Free / Pro / Enterprise with per-user pricing
-- Prices in pence GBP. Stripe price IDs are placeholders.
-- ============================================================

-- Free Plan
INSERT INTO public.subscription_plans (
  name, slug, description,
  stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
  stripe_per_user_price_id_monthly, stripe_per_user_price_id_annual,
  max_users, max_records, max_reports_per_month, max_storage_gb,
  feature_ai_templates, feature_pdf_export, feature_api_access,
  feature_custom_branding, feature_priority_support, feature_white_label,
  feature_advanced_analytics, feature_photos, feature_starter_templates,
  feature_all_field_types,
  price_monthly_gbp, price_annual_gbp,
  price_per_user_monthly_gbp, price_per_user_annual_gbp,
  base_users_included,
  allowed_field_categories,
  is_active, is_public, display_order
) VALUES (
  'Free', 'free', 'Get started with basic inspections',
  NULL, NULL, NULL,
  NULL, NULL,
  2,      -- max_users
  -1,     -- max_records (unlimited)
  10,     -- max_reports_per_month
  1,      -- max_storage_gb
  false,  -- ai_templates
  true,   -- pdf_export
  false,  -- api_access
  false,  -- custom_branding
  false,  -- priority_support
  false,  -- white_label
  false,  -- advanced_analytics
  true,   -- photos
  false,  -- starter_templates
  false,  -- all_field_types
  0,      -- price_monthly (free)
  0,      -- price_annual (free)
  0,      -- per_user_monthly (free)
  0,      -- per_user_annual (free)
  0,      -- base_users_included (N/A for free)
  '["basic", "evidence"]'::jsonb,
  true, true, 0
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_users = EXCLUDED.max_users,
  max_records = EXCLUDED.max_records,
  max_reports_per_month = EXCLUDED.max_reports_per_month,
  max_storage_gb = EXCLUDED.max_storage_gb,
  feature_ai_templates = EXCLUDED.feature_ai_templates,
  feature_pdf_export = EXCLUDED.feature_pdf_export,
  feature_api_access = EXCLUDED.feature_api_access,
  feature_custom_branding = EXCLUDED.feature_custom_branding,
  feature_priority_support = EXCLUDED.feature_priority_support,
  feature_white_label = EXCLUDED.feature_white_label,
  feature_advanced_analytics = EXCLUDED.feature_advanced_analytics,
  feature_photos = EXCLUDED.feature_photos,
  feature_starter_templates = EXCLUDED.feature_starter_templates,
  feature_all_field_types = EXCLUDED.feature_all_field_types,
  price_monthly_gbp = EXCLUDED.price_monthly_gbp,
  price_annual_gbp = EXCLUDED.price_annual_gbp,
  price_per_user_monthly_gbp = EXCLUDED.price_per_user_monthly_gbp,
  price_per_user_annual_gbp = EXCLUDED.price_per_user_annual_gbp,
  base_users_included = EXCLUDED.base_users_included,
  allowed_field_categories = EXCLUDED.allowed_field_categories,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Pro Plan (base £29/mo + £9/user/mo)
INSERT INTO public.subscription_plans (
  name, slug, description,
  stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
  stripe_per_user_price_id_monthly, stripe_per_user_price_id_annual,
  max_users, max_records, max_reports_per_month, max_storage_gb,
  feature_ai_templates, feature_pdf_export, feature_api_access,
  feature_custom_branding, feature_priority_support, feature_white_label,
  feature_advanced_analytics, feature_photos, feature_starter_templates,
  feature_all_field_types,
  price_monthly_gbp, price_annual_gbp,
  price_per_user_monthly_gbp, price_per_user_annual_gbp,
  base_users_included,
  allowed_field_categories,
  is_active, is_public, display_order
) VALUES (
  'Pro', 'pro', 'For growing teams with advanced inspections',
  NULL, NULL, NULL,  -- Stripe IDs to be set after product creation
  NULL, NULL,
  -1,     -- max_users (unlimited)
  -1,     -- max_records (unlimited)
  100,    -- max_reports_per_month
  25,     -- max_storage_gb
  true,   -- ai_templates
  true,   -- pdf_export
  false,  -- api_access
  true,   -- custom_branding
  false,  -- priority_support
  false,  -- white_label
  false,  -- advanced_analytics
  true,   -- photos
  true,   -- starter_templates
  true,   -- all_field_types
  2900,   -- price_monthly (£29)
  27840,  -- price_annual (£278.40 = £23.20/mo)
  900,    -- per_user_monthly (£9)
  8640,   -- per_user_annual (£86.40/yr = £7.20/mo)
  1,      -- base_users_included
  '["basic", "rating_scales", "date_time", "measurement", "evidence", "location", "people", "advanced", "groups"]'::jsonb,
  true, true, 1
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_users = EXCLUDED.max_users,
  max_records = EXCLUDED.max_records,
  max_reports_per_month = EXCLUDED.max_reports_per_month,
  max_storage_gb = EXCLUDED.max_storage_gb,
  feature_ai_templates = EXCLUDED.feature_ai_templates,
  feature_pdf_export = EXCLUDED.feature_pdf_export,
  feature_api_access = EXCLUDED.feature_api_access,
  feature_custom_branding = EXCLUDED.feature_custom_branding,
  feature_priority_support = EXCLUDED.feature_priority_support,
  feature_white_label = EXCLUDED.feature_white_label,
  feature_advanced_analytics = EXCLUDED.feature_advanced_analytics,
  feature_photos = EXCLUDED.feature_photos,
  feature_starter_templates = EXCLUDED.feature_starter_templates,
  feature_all_field_types = EXCLUDED.feature_all_field_types,
  price_monthly_gbp = EXCLUDED.price_monthly_gbp,
  price_annual_gbp = EXCLUDED.price_annual_gbp,
  price_per_user_monthly_gbp = EXCLUDED.price_per_user_monthly_gbp,
  price_per_user_annual_gbp = EXCLUDED.price_per_user_annual_gbp,
  base_users_included = EXCLUDED.base_users_included,
  allowed_field_categories = EXCLUDED.allowed_field_categories,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Enterprise Plan (base £99/mo + £11/user/mo)
INSERT INTO public.subscription_plans (
  name, slug, description,
  stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
  stripe_per_user_price_id_monthly, stripe_per_user_price_id_annual,
  max_users, max_records, max_reports_per_month, max_storage_gb,
  feature_ai_templates, feature_pdf_export, feature_api_access,
  feature_custom_branding, feature_priority_support, feature_white_label,
  feature_advanced_analytics, feature_photos, feature_starter_templates,
  feature_all_field_types,
  price_monthly_gbp, price_annual_gbp,
  price_per_user_monthly_gbp, price_per_user_annual_gbp,
  base_users_included,
  allowed_field_categories,
  is_active, is_public, display_order
) VALUES (
  'Enterprise', 'enterprise', 'Full platform with API, white label, and priority support',
  NULL, NULL, NULL,  -- Stripe IDs to be set after product creation
  NULL, NULL,
  -1,     -- max_users (unlimited)
  -1,     -- max_records (unlimited)
  -1,     -- max_reports_per_month (unlimited)
  100,    -- max_storage_gb
  true,   -- ai_templates
  true,   -- pdf_export
  true,   -- api_access
  true,   -- custom_branding
  true,   -- priority_support
  true,   -- white_label
  true,   -- advanced_analytics
  true,   -- photos
  true,   -- starter_templates
  true,   -- all_field_types
  9900,   -- price_monthly (£99)
  95040,  -- price_annual (£950.40 = £79.20/mo)
  1100,   -- per_user_monthly (£11)
  10560,  -- per_user_annual (£105.60/yr = £8.80/mo)
  1,      -- base_users_included
  '["basic", "rating_scales", "date_time", "measurement", "evidence", "location", "people", "advanced", "groups"]'::jsonb,
  true, true, 2
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  max_users = EXCLUDED.max_users,
  max_records = EXCLUDED.max_records,
  max_reports_per_month = EXCLUDED.max_reports_per_month,
  max_storage_gb = EXCLUDED.max_storage_gb,
  feature_ai_templates = EXCLUDED.feature_ai_templates,
  feature_pdf_export = EXCLUDED.feature_pdf_export,
  feature_api_access = EXCLUDED.feature_api_access,
  feature_custom_branding = EXCLUDED.feature_custom_branding,
  feature_priority_support = EXCLUDED.feature_priority_support,
  feature_white_label = EXCLUDED.feature_white_label,
  feature_advanced_analytics = EXCLUDED.feature_advanced_analytics,
  feature_photos = EXCLUDED.feature_photos,
  feature_starter_templates = EXCLUDED.feature_starter_templates,
  feature_all_field_types = EXCLUDED.feature_all_field_types,
  price_monthly_gbp = EXCLUDED.price_monthly_gbp,
  price_annual_gbp = EXCLUDED.price_annual_gbp,
  price_per_user_monthly_gbp = EXCLUDED.price_per_user_monthly_gbp,
  price_per_user_annual_gbp = EXCLUDED.price_per_user_annual_gbp,
  base_users_included = EXCLUDED.base_users_included,
  allowed_field_categories = EXCLUDED.allowed_field_categories,
  display_order = EXCLUDED.display_order,
  updated_at = now();

-- Set existing organisations without a plan to free plan
UPDATE public.organisations
SET current_plan_id = (SELECT id FROM public.subscription_plans WHERE slug = 'free'),
    subscription_status = COALESCE(subscription_status, 'active')
WHERE current_plan_id IS NULL;
