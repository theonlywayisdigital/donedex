-- Super Admin Dashboard Metrics Functions
-- Provides aggregated metrics for super admin dashboard

-- ============================================
-- DASHBOARD METRICS FUNCTION
-- Returns overview stats for super admin dashboard
-- ============================================

CREATE OR REPLACE FUNCTION get_super_admin_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result json;
  is_sa boolean;
BEGIN
  -- Check if current user is super admin
  SELECT public.is_super_admin() INTO is_sa;
  IF NOT is_sa THEN
    RAISE EXCEPTION 'Permission denied: Not a super admin';
  END IF;

  SELECT json_build_object(
    -- Overall counts
    'total_organisations', (SELECT COUNT(*) FROM public.organisations),
    'total_users', (SELECT COUNT(DISTINCT user_id) FROM public.organisation_users),
    'total_reports', (SELECT COUNT(*) FROM public.reports),
    'total_templates', (SELECT COUNT(*) FROM public.templates),

    -- Growth (last 30 days)
    'new_orgs_30d', (
      SELECT COUNT(*) FROM public.organisations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'new_users_30d', (
      SELECT COUNT(*) FROM public.organisation_users
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'new_reports_30d', (
      SELECT COUNT(*) FROM public.reports
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),

    -- Active stats
    'active_orgs_7d', (
      SELECT COUNT(DISTINCT organisation_id) FROM public.reports
      WHERE created_at >= NOW() - INTERVAL '7 days'
    ),

    -- Reports by status
    'reports_completed', (
      SELECT COUNT(*) FROM public.reports WHERE status = 'completed'
    ),
    'reports_in_progress', (
      SELECT COUNT(*) FROM public.reports WHERE status = 'in_progress'
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================
-- SUBSCRIPTION BREAKDOWN FUNCTION
-- Returns organisation counts by subscription plan
-- ============================================

CREATE OR REPLACE FUNCTION get_subscription_breakdown()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result json;
  is_sa boolean;
BEGIN
  -- Check if current user is super admin
  SELECT public.is_super_admin() INTO is_sa;
  IF NOT is_sa THEN
    RAISE EXCEPTION 'Permission denied: Not a super admin';
  END IF;

  SELECT json_agg(
    json_build_object(
      'plan_id', COALESCE(o.subscription_plan_id, 'no_plan'),
      'plan_name', COALESCE(sp.name, 'No Plan'),
      'count', COUNT(*),
      'color', CASE
        WHEN sp.name = 'Enterprise' THEN '#8B5CF6'
        WHEN sp.name = 'Pro' THEN '#3B82F6'
        WHEN sp.name = 'Starter' THEN '#10B981'
        WHEN sp.name = 'Free' THEN '#6B7280'
        ELSE '#9CA3AF'
      END
    )
  )
  FROM public.organisations o
  LEFT JOIN public.subscription_plans sp ON o.subscription_plan_id = sp.id
  GROUP BY o.subscription_plan_id, sp.name
  ORDER BY COUNT(*) DESC
  INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ============================================
-- ATTENTION ITEMS FUNCTION
-- Returns organisations that need attention
-- ============================================

CREATE OR REPLACE FUNCTION get_attention_items()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result json;
  is_sa boolean;
BEGIN
  -- Check if current user is super admin
  SELECT public.is_super_admin() INTO is_sa;
  IF NOT is_sa THEN
    RAISE EXCEPTION 'Permission denied: Not a super admin';
  END IF;

  SELECT json_agg(items ORDER BY urgency_order, created_at DESC)
  FROM (
    -- Past due subscriptions (billing_status = 'past_due')
    SELECT
      o.id,
      o.name,
      'past_due' as reason,
      'high' as urgency,
      1 as urgency_order,
      'Subscription past due' as detail,
      o.created_at
    FROM public.organisations o
    WHERE o.billing_status = 'past_due'

    UNION ALL

    -- Trials ending soon (within 7 days)
    SELECT
      o.id,
      o.name,
      'trial_ending' as reason,
      'medium' as urgency,
      2 as urgency_order,
      'Trial ends ' ||
        CASE
          WHEN o.trial_ends_at::date = CURRENT_DATE THEN 'today'
          WHEN o.trial_ends_at::date = CURRENT_DATE + 1 THEN 'tomorrow'
          ELSE 'in ' || (o.trial_ends_at::date - CURRENT_DATE) || ' days'
        END as detail,
      o.created_at
    FROM public.organisations o
    WHERE o.subscription_status = 'trialing'
      AND o.trial_ends_at IS NOT NULL
      AND o.trial_ends_at <= NOW() + INTERVAL '7 days'
      AND o.trial_ends_at > NOW()

    UNION ALL

    -- Inactive organisations (no reports in 30+ days, has users)
    SELECT
      o.id,
      o.name,
      'inactive' as reason,
      'low' as urgency,
      3 as urgency_order,
      'No activity in 30+ days' as detail,
      o.created_at
    FROM public.organisations o
    WHERE EXISTS (
      SELECT 1 FROM public.organisation_users ou WHERE ou.organisation_id = o.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.organisation_id = o.id
        AND r.created_at >= NOW() - INTERVAL '30 days'
    )
    AND o.created_at < NOW() - INTERVAL '30 days'

    LIMIT 20
  ) items
  INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- ============================================
-- GROWTH TREND FUNCTION
-- Returns daily counts for the last N days
-- ============================================

CREATE OR REPLACE FUNCTION get_growth_trend(days_back integer DEFAULT 30)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  result json;
  is_sa boolean;
BEGIN
  -- Check if current user is super admin
  SELECT public.is_super_admin() INTO is_sa;
  IF NOT is_sa THEN
    RAISE EXCEPTION 'Permission denied: Not a super admin';
  END IF;

  SELECT json_agg(
    json_build_object(
      'date', d::date,
      'orgs', COALESCE(org_counts.count, 0),
      'users', COALESCE(user_counts.count, 0),
      'reports', COALESCE(report_counts.count, 0)
    )
    ORDER BY d
  )
  FROM generate_series(
    CURRENT_DATE - (days_back - 1),
    CURRENT_DATE,
    '1 day'::interval
  ) d
  LEFT JOIN (
    SELECT created_at::date as day, COUNT(*) as count
    FROM public.organisations
    WHERE created_at >= CURRENT_DATE - days_back
    GROUP BY created_at::date
  ) org_counts ON org_counts.day = d::date
  LEFT JOIN (
    SELECT created_at::date as day, COUNT(*) as count
    FROM public.organisation_users
    WHERE created_at >= CURRENT_DATE - days_back
    GROUP BY created_at::date
  ) user_counts ON user_counts.day = d::date
  LEFT JOIN (
    SELECT created_at::date as day, COUNT(*) as count
    FROM public.reports
    WHERE created_at >= CURRENT_DATE - days_back
    GROUP BY created_at::date
  ) report_counts ON report_counts.day = d::date
  INTO result;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_super_admin_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION get_attention_items() TO authenticated;
GRANT EXECUTE ON FUNCTION get_growth_trend(integer) TO authenticated;
