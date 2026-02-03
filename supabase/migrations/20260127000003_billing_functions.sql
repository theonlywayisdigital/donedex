-- ============================================================
-- Billing Functions (updated for storage add-ons & per-user pricing)
-- Replaces existing check_org_limits, get_billing_summary,
-- can_add_record, can_add_report, can_add_user functions.
-- ============================================================

-- -----------------------------------------------
-- check_org_limits: Returns usage limits including storage add-on
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.check_org_limits(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plan public.subscription_plans%ROWTYPE;
  v_plan_id UUID;
  v_user_count INTEGER;
  v_record_count INTEGER;
  v_report_count INTEGER;
  v_storage_bytes BIGINT;
  v_addon_gb INTEGER;
  v_base_limit_gb INTEGER;
  v_effective_limit_gb INTEGER;
  v_result JSONB;
BEGIN
  -- Get org's current plan
  SELECT current_plan_id INTO v_plan_id
  FROM public.organisations
  WHERE id = org_id;

  -- If no plan, default to free
  IF v_plan_id IS NULL THEN
    SELECT * INTO v_plan FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  ELSE
    SELECT * INTO v_plan FROM public.subscription_plans WHERE id = v_plan_id;
  END IF;

  -- If plan not found at all, return empty
  IF v_plan.id IS NULL THEN
    RETURN '{"error": "No plan found"}'::jsonb;
  END IF;

  -- Count active users
  SELECT COUNT(*) INTO v_user_count
  FROM public.organisation_users
  WHERE organisation_id = org_id;

  -- Count records
  SELECT COUNT(*) INTO v_record_count
  FROM public.records
  WHERE organisation_id = org_id;

  -- Count reports this month
  SELECT COUNT(*) INTO v_report_count
  FROM public.reports
  WHERE organisation_id = org_id
    AND created_at >= date_trunc('month', now());

  -- Calculate storage (sum of photo sizes)
  SELECT COALESCE(SUM(
    COALESCE((rp.metadata->>'size')::bigint, 0)
  ), 0) INTO v_storage_bytes
  FROM public.report_photos rp
  JOIN public.reports r ON r.id = rp.report_id
  WHERE r.organisation_id = org_id;

  -- Get storage add-on
  SELECT COALESCE(sa.quantity_blocks * sa.block_size_gb, 0) INTO v_addon_gb
  FROM public.storage_addons sa
  WHERE sa.organisation_id = org_id AND sa.is_active = true;

  IF v_addon_gb IS NULL THEN
    v_addon_gb := 0;
  END IF;

  v_base_limit_gb := v_plan.max_storage_gb;
  v_effective_limit_gb := CASE
    WHEN v_base_limit_gb = -1 THEN -1
    ELSE v_base_limit_gb + v_addon_gb
  END;

  -- Build result
  v_result := jsonb_build_object(
    'users', jsonb_build_object(
      'current', v_user_count,
      'limit', v_plan.max_users,
      'exceeded', CASE WHEN v_plan.max_users = -1 THEN false ELSE v_user_count >= v_plan.max_users END,
      'percent', CASE WHEN v_plan.max_users = -1 THEN 0 ELSE ROUND((v_user_count::numeric / GREATEST(v_plan.max_users, 1)) * 100) END
    ),
    'records', jsonb_build_object(
      'current', v_record_count,
      'limit', v_plan.max_records,
      'exceeded', CASE WHEN v_plan.max_records = -1 THEN false ELSE v_record_count >= v_plan.max_records END,
      'percent', CASE WHEN v_plan.max_records = -1 THEN 0 ELSE ROUND((v_record_count::numeric / GREATEST(v_plan.max_records, 1)) * 100) END
    ),
    'reports', jsonb_build_object(
      'current', v_report_count,
      'limit', v_plan.max_reports_per_month,
      'exceeded', CASE WHEN v_plan.max_reports_per_month = -1 THEN false ELSE v_report_count >= v_plan.max_reports_per_month END,
      'percent', CASE WHEN v_plan.max_reports_per_month = -1 THEN 0 ELSE ROUND((v_report_count::numeric / GREATEST(v_plan.max_reports_per_month, 1)) * 100) END
    ),
    'storage', jsonb_build_object(
      'current', ROUND((v_storage_bytes::numeric / (1024 * 1024 * 1024)) * 100) / 100, -- percent of effective limit
      'limit', v_effective_limit_gb,
      'exceeded', CASE
        WHEN v_effective_limit_gb = -1 THEN false
        ELSE (v_storage_bytes::numeric / (1024 * 1024 * 1024)) >= v_effective_limit_gb
      END,
      'percent', CASE
        WHEN v_effective_limit_gb = -1 THEN 0
        ELSE ROUND((v_storage_bytes::numeric / (1024 * 1024 * 1024)) / GREATEST(v_effective_limit_gb, 1) * 100)
      END,
      'current_bytes', v_storage_bytes,
      'current_gb', ROUND((v_storage_bytes::numeric / (1024 * 1024 * 1024)) * 100) / 100,
      'limit_gb', v_effective_limit_gb,
      'base_limit_gb', v_base_limit_gb,
      'addon_gb', v_addon_gb
    ),
    'plan', jsonb_build_object(
      'id', v_plan.id,
      'name', v_plan.name,
      'slug', v_plan.slug
    )
  );

  RETURN v_result;
END;
$$;

-- -----------------------------------------------
-- get_billing_summary: Returns billing overview for an org
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.get_billing_summary(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org RECORD;
  v_plan RECORD;
  v_invoice RECORD;
  v_result JSONB;
BEGIN
  -- Get org billing info
  SELECT
    o.stripe_customer_id,
    o.subscription_status,
    o.current_plan_id,
    o.trial_ends_at,
    o.subscription_ends_at
  INTO v_org
  FROM public.organisations o
  WHERE o.id = org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('has_billing', false);
  END IF;

  -- Get current plan
  IF v_org.current_plan_id IS NOT NULL THEN
    SELECT
      sp.id, sp.name, sp.slug,
      sp.price_monthly_gbp, sp.price_annual_gbp,
      sp.price_per_user_monthly_gbp, sp.price_per_user_annual_gbp,
      sp.base_users_included
    INTO v_plan
    FROM public.subscription_plans sp
    WHERE sp.id = v_org.current_plan_id;
  END IF;

  -- Get latest paid invoice
  SELECT
    i.amount_paid, i.paid_at, i.invoice_pdf_url
  INTO v_invoice
  FROM public.invoices i
  WHERE i.organisation_id = org_id AND i.status = 'paid'
  ORDER BY i.paid_at DESC NULLS LAST
  LIMIT 1;

  v_result := jsonb_build_object(
    'has_billing', v_org.stripe_customer_id IS NOT NULL,
    'subscription_status', COALESCE(v_org.subscription_status, 'active'),
    'is_trialing', v_org.subscription_status = 'trialing',
    'trial_ends_at', v_org.trial_ends_at,
    'subscription_ends_at', v_org.subscription_ends_at,
    'current_plan', CASE
      WHEN v_plan.id IS NOT NULL THEN jsonb_build_object(
        'id', v_plan.id,
        'name', v_plan.name,
        'slug', v_plan.slug,
        'price_monthly_gbp', v_plan.price_monthly_gbp,
        'price_annual_gbp', v_plan.price_annual_gbp,
        'price_per_user_monthly_gbp', v_plan.price_per_user_monthly_gbp,
        'price_per_user_annual_gbp', v_plan.price_per_user_annual_gbp,
        'base_users_included', v_plan.base_users_included
      )
      ELSE NULL
    END,
    'latest_invoice', CASE
      WHEN v_invoice.amount_paid IS NOT NULL THEN jsonb_build_object(
        'amount_paid', v_invoice.amount_paid,
        'paid_at', v_invoice.paid_at,
        'pdf_url', v_invoice.invoice_pdf_url
      )
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$$;

-- -----------------------------------------------
-- can_add_user: Check if org can add another user
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.can_add_user(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_users INTEGER;
  v_current_users INTEGER;
BEGIN
  SELECT sp.max_users INTO v_max_users
  FROM public.organisations o
  JOIN public.subscription_plans sp ON sp.id = o.current_plan_id
  WHERE o.id = org_id;

  -- No plan = use free defaults
  IF v_max_users IS NULL THEN
    SELECT max_users INTO v_max_users
    FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;

  -- Unlimited
  IF v_max_users = -1 THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO v_current_users
  FROM public.organisation_users
  WHERE organisation_id = org_id;

  RETURN v_current_users < v_max_users;
END;
$$;

-- -----------------------------------------------
-- can_add_record: Check if org can add another record
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.can_add_record(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_records INTEGER;
  v_current_records INTEGER;
BEGIN
  SELECT sp.max_records INTO v_max_records
  FROM public.organisations o
  JOIN public.subscription_plans sp ON sp.id = o.current_plan_id
  WHERE o.id = org_id;

  IF v_max_records IS NULL THEN
    SELECT max_records INTO v_max_records
    FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;

  IF v_max_records = -1 THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO v_current_records
  FROM public.records
  WHERE organisation_id = org_id;

  RETURN v_current_records < v_max_records;
END;
$$;

-- -----------------------------------------------
-- can_add_report: Check if org can generate another report this month
-- -----------------------------------------------
CREATE OR REPLACE FUNCTION public.can_add_report(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_reports INTEGER;
  v_current_reports INTEGER;
BEGIN
  SELECT sp.max_reports_per_month INTO v_max_reports
  FROM public.organisations o
  JOIN public.subscription_plans sp ON sp.id = o.current_plan_id
  WHERE o.id = org_id;

  IF v_max_reports IS NULL THEN
    SELECT max_reports_per_month INTO v_max_reports
    FROM public.subscription_plans WHERE slug = 'free' LIMIT 1;
  END IF;

  IF v_max_reports = -1 THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO v_current_reports
  FROM public.reports
  WHERE organisation_id = org_id
    AND created_at >= date_trunc('month', now());

  RETURN v_current_reports < v_max_reports;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.check_org_limits(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_record(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_add_report(UUID) TO authenticated;
