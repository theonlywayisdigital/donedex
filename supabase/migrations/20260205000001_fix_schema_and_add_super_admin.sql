-- ============================================================
-- Fix Schema & Add Super Admin Infrastructure
-- Fixes: billing_interval, user_sessions RLS, onboarding RPCs,
--        super admin tables & RPC functions
-- ============================================================

-- ============================================================
-- 1. Add billing_interval to organisations
-- ============================================================

ALTER TABLE public.organisations
ADD COLUMN IF NOT EXISTS billing_interval TEXT NOT NULL DEFAULT 'monthly';

-- Add check constraint (use DO block to avoid error if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organisations_billing_interval_check'
  ) THEN
    ALTER TABLE public.organisations
    ADD CONSTRAINT organisations_billing_interval_check
    CHECK (billing_interval IN ('monthly', 'annual'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_organisations_billing_interval
ON public.organisations(billing_interval);

COMMENT ON COLUMN public.organisations.billing_interval IS 'Monthly or annual billing cycle';

-- ============================================================
-- 2. Fix user_sessions RLS policy (profiles -> user_profiles)
-- ============================================================

-- Drop the broken policy
DROP POLICY IF EXISTS "Admins can manage org member sessions" ON public.user_sessions;

-- Recreate with correct table name (user_profiles) and correct column references
-- user_profiles doesn't have organisation_id or role, so we join via organisation_users
CREATE POLICY "Admins can manage org member sessions"
  ON public.user_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organisation_users admin_ou
      JOIN public.organisation_users target_ou ON target_ou.user_id = user_sessions.user_id
      WHERE admin_ou.user_id = auth.uid()
        AND admin_ou.organisation_id = target_ou.organisation_id
        AND admin_ou.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organisation_users admin_ou
      JOIN public.organisation_users target_ou ON target_ou.user_id = user_sessions.user_id
      WHERE admin_ou.user_id = auth.uid()
        AND admin_ou.organisation_id = target_ou.organisation_id
        AND admin_ou.role IN ('admin', 'owner')
    )
  );

-- Fix admin_reset_user_sessions function (was referencing profiles table)
CREATE OR REPLACE FUNCTION public.admin_reset_user_sessions(p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_org UUID;
  v_target_org UUID;
BEGIN
  -- Get caller's role and org via organisation_users
  SELECT role, organisation_id INTO v_caller_role, v_caller_org
  FROM public.organisation_users
  WHERE user_id = auth.uid()
  LIMIT 1;

  -- Get target's org
  SELECT organisation_id INTO v_target_org
  FROM public.organisation_users
  WHERE user_id = p_target_user_id
  LIMIT 1;

  -- Check permission: must be admin/owner in same org
  IF v_caller_role NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Only admins and owners can reset user sessions';
  END IF;

  IF v_caller_org IS DISTINCT FROM v_target_org THEN
    RAISE EXCEPTION 'Cannot reset sessions for users in different organisation';
  END IF;

  -- Deactivate all sessions for target user
  UPDATE public.user_sessions
  SET is_active = false
  WHERE user_id = p_target_user_id
    AND is_active = true;

  RETURN true;
END;
$$;

-- ============================================================
-- 3. Onboarding RPC Functions
-- ============================================================

-- needs_onboarding: Check if user needs onboarding
CREATE OR REPLACE FUNCTION public.needs_onboarding(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_org BOOLEAN;
  v_onboarding_complete BOOLEAN;
BEGIN
  -- Check if user belongs to any organisation
  SELECT EXISTS(
    SELECT 1 FROM public.organisation_users WHERE user_id = user_id_param
  ) INTO v_has_org;

  -- If user has an org, they don't need onboarding
  IF v_has_org THEN
    RETURN false;
  END IF;

  -- Check if onboarding was already completed
  SELECT EXISTS(
    SELECT 1 FROM public.onboarding_state
    WHERE user_id = user_id_param AND completed_at IS NOT NULL
  ) INTO v_onboarding_complete;

  IF v_onboarding_complete THEN
    RETURN false;
  END IF;

  -- User has no org and hasn't completed onboarding
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.needs_onboarding(UUID) TO authenticated;

-- get_or_create_onboarding_state: Get or create onboarding state for current user
CREATE OR REPLACE FUNCTION public.get_or_create_onboarding_state()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_state RECORD;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to get existing state
  SELECT * INTO v_state
  FROM public.onboarding_state
  WHERE user_id = v_user_id;

  -- If not found, create new state
  IF NOT FOUND THEN
    INSERT INTO public.onboarding_state (
      user_id,
      current_step,
      completed_steps,
      pending_invites,
      selected_template_ids,
      country
    ) VALUES (
      v_user_id,
      'welcome',
      '[]'::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      'GB'
    )
    RETURNING * INTO v_state;
  END IF;

  -- Return as JSON
  v_result := to_jsonb(v_state);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_onboarding_state() TO authenticated;

-- complete_onboarding: Create organisation and set up everything
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_organisation_name TEXT,
  p_organisation_slug TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_billing_email TEXT DEFAULT NULL,
  p_plan_id UUID DEFAULT NULL,
  p_pending_invites JSONB DEFAULT '[]'::jsonb,
  p_selected_template_ids JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_slug TEXT;
  v_invite JSONB;
  v_template_id TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Generate slug if not provided
  v_slug := COALESCE(p_organisation_slug, lower(regexp_replace(p_organisation_name, '[^a-zA-Z0-9]', '-', 'g')));
  v_slug := trim(both '-' from regexp_replace(v_slug, '-+', '-', 'g'));
  IF v_slug = '' THEN v_slug := 'org'; END IF;

  -- Ensure slug is unique
  WHILE EXISTS(SELECT 1 FROM public.organisations WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || floor(random() * 1000)::text;
  END LOOP;

  -- Create organisation
  INSERT INTO public.organisations (
    name, slug, contact_email, current_plan_id, subscription_status, onboarding_completed_at
  ) VALUES (
    p_organisation_name, v_slug, COALESCE(p_contact_email, p_billing_email),
    p_plan_id, 'active', now()
  )
  RETURNING id INTO v_org_id;

  -- Add current user as owner
  INSERT INTO public.organisation_users (organisation_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  -- Process pending invites
  IF p_pending_invites IS NOT NULL AND jsonb_array_length(p_pending_invites) > 0 THEN
    FOR v_invite IN SELECT * FROM jsonb_array_elements(p_pending_invites)
    LOOP
      BEGIN
        INSERT INTO public.invitations (
          organisation_id, email, role, invited_by, expires_at
        ) VALUES (
          v_org_id,
          v_invite->>'email',
          (v_invite->>'role')::text,
          v_user_id,
          now() + interval '7 days'
        );
      EXCEPTION WHEN OTHERS THEN
        -- Skip failed invites, don't block onboarding
        NULL;
      END;
    END LOOP;
  END IF;

  -- Copy selected templates from library
  IF p_selected_template_ids IS NOT NULL AND jsonb_array_length(p_selected_template_ids) > 0 THEN
    FOR v_template_id IN SELECT jsonb_array_elements_text(p_selected_template_ids)
    LOOP
      BEGIN
        INSERT INTO public.templates (organisation_id, name, description, is_published, created_by)
        SELECT v_org_id, lt.name, lt.description, true, v_user_id
        FROM public.library_templates lt
        WHERE lt.id = v_template_id::uuid;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END LOOP;
  END IF;

  -- Mark onboarding as complete
  UPDATE public.onboarding_state
  SET organisation_id = v_org_id,
      completed_at = now(),
      current_step = 'complete',
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'organisation_id', v_org_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;

-- ============================================================
-- 4. Super Admin Tables
-- ============================================================

-- super_admins table
CREATE TABLE IF NOT EXISTS public.super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admins_user_id ON public.super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON public.super_admins(is_active) WHERE is_active = true;

ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;

-- Super admins can only see their own record (or all if they have manage_super_admins)
CREATE POLICY "Super admins can view own record"
  ON public.super_admins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all if manager"
  ON public.super_admins FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_permissions sap
      JOIN public.super_admins sa ON sa.id = sap.super_admin_id
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
        AND sap.permission = 'manage_super_admins'
    )
  );

-- super_admin_permissions table
CREATE TABLE IF NOT EXISTS public.super_admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_super_admin_perms_unique
  ON public.super_admin_permissions(super_admin_id, permission);

ALTER TABLE public.super_admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view own permissions"
  ON public.super_admin_permissions FOR SELECT TO authenticated
  USING (
    super_admin_id IN (
      SELECT id FROM public.super_admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can view all permissions"
  ON public.super_admin_permissions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_permissions sap
      JOIN public.super_admins sa ON sa.id = sap.super_admin_id
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
        AND sap.permission = 'manage_super_admins'
    )
  );

-- super_admin_sessions table (impersonation tracking)
CREATE TABLE IF NOT EXISTS public.super_admin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
  impersonating_user_id UUID REFERENCES auth.users(id),
  impersonating_org_id UUID REFERENCES public.organisations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_super_admin_sessions_active
  ON public.super_admin_sessions(super_admin_id, is_active) WHERE is_active = true;

ALTER TABLE public.super_admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage own sessions"
  ON public.super_admin_sessions FOR ALL TO authenticated
  USING (
    super_admin_id IN (
      SELECT id FROM public.super_admins WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    super_admin_id IN (
      SELECT id FROM public.super_admins WHERE user_id = auth.uid()
    )
  );

-- super_admin_audit_log table
CREATE TABLE IF NOT EXISTS public.super_admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES public.super_admins(id),
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  target_organisation_id UUID,
  old_values JSONB,
  new_values JSONB,
  impersonating_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON public.super_admin_audit_log(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.super_admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON public.super_admin_audit_log(action_category);

ALTER TABLE public.super_admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins with audit permission can view logs"
  ON public.super_admin_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admin_permissions sap
      JOIN public.super_admins sa ON sa.id = sap.super_admin_id
      WHERE sa.user_id = auth.uid() AND sa.is_active = true
        AND sap.permission = 'view_audit_logs'
    )
  );

-- Allow insert via RPC function (SECURITY DEFINER)
CREATE POLICY "System can insert audit logs"
  ON public.super_admin_audit_log FOR INSERT TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 5. Super Admin RPC Functions
-- ============================================================

-- get_current_super_admin_id: Get the super admin ID for current user
CREATE OR REPLACE FUNCTION public.get_current_super_admin_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id
  FROM public.super_admins
  WHERE user_id = auth.uid() AND is_active = true;

  RETURN v_admin_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_super_admin_id() TO authenticated;

-- super_admin_has_permission: Check if current user has a specific permission
CREATE OR REPLACE FUNCTION public.super_admin_has_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.super_admin_permissions sap
    JOIN public.super_admins sa ON sa.id = sap.super_admin_id
    WHERE sa.user_id = auth.uid()
      AND sa.is_active = true
      AND sap.permission = perm
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_has_permission(TEXT) TO authenticated;

-- log_super_admin_action: Log an action to the audit log
CREATE OR REPLACE FUNCTION public.log_super_admin_action(
  p_action_type TEXT,
  p_action_category TEXT,
  p_target_table TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_target_org_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id
  FROM public.super_admins
  WHERE user_id = auth.uid() AND is_active = true;

  IF v_admin_id IS NULL THEN
    -- Not a super admin, silently skip
    RETURN;
  END IF;

  INSERT INTO public.super_admin_audit_log (
    super_admin_id, action_type, action_category,
    target_table, target_id, target_organisation_id,
    old_values, new_values
  ) VALUES (
    v_admin_id, p_action_type, p_action_category,
    p_target_table, p_target_id, p_target_org_id,
    p_old_values, p_new_values
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_super_admin_action(TEXT, TEXT, TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;

-- get_super_admin_dashboard_metrics: Aggregate dashboard stats
CREATE OR REPLACE FUNCTION public.get_super_admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify caller is super admin
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Not a super admin';
  END IF;

  SELECT jsonb_build_object(
    'total_organisations', (SELECT COUNT(*) FROM public.organisations),
    'total_users', (SELECT COUNT(*) FROM public.organisation_users),
    'total_reports', (SELECT COUNT(*) FROM public.reports),
    'total_templates', (SELECT COUNT(*) FROM public.templates),
    'new_orgs_30d', (SELECT COUNT(*) FROM public.organisations WHERE created_at >= now() - interval '30 days'),
    'new_users_30d', (SELECT COUNT(*) FROM public.organisation_users WHERE created_at >= now() - interval '30 days'),
    'new_reports_30d', (SELECT COUNT(*) FROM public.reports WHERE created_at >= now() - interval '30 days'),
    'active_orgs_7d', (
      SELECT COUNT(DISTINCT o.id)
      FROM public.organisations o
      JOIN public.reports r ON r.organisation_id = o.id
      WHERE r.created_at >= now() - interval '7 days'
    ),
    'reports_completed', (SELECT COUNT(*) FROM public.reports WHERE status = 'submitted'),
    'reports_in_progress', (SELECT COUNT(*) FROM public.reports WHERE status = 'draft')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_super_admin_dashboard_metrics() TO authenticated;

-- get_subscription_breakdown: Count orgs per plan
CREATE OR REPLACE FUNCTION public.get_subscription_breakdown()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Not a super admin';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      sp.id AS plan_id,
      sp.name AS plan_name,
      COUNT(o.id) AS count,
      CASE sp.slug
        WHEN 'free' THEN '#6B7280'
        WHEN 'pro' THEN '#0F4C5C'
        WHEN 'enterprise' THEN '#D97706'
        ELSE '#9CA3AF'
      END AS color
    FROM public.subscription_plans sp
    LEFT JOIN public.organisations o ON o.current_plan_id = sp.id
    GROUP BY sp.id, sp.name, sp.slug, sp.display_order
    ORDER BY sp.display_order
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_subscription_breakdown() TO authenticated;

-- get_attention_items: Orgs that need attention
CREATE OR REPLACE FUNCTION public.get_attention_items()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Not a super admin';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result
  FROM (
    -- Past due subscriptions
    SELECT
      o.id,
      o.name,
      'past_due'::text AS reason,
      'high'::text AS urgency,
      'Subscription is past due' AS detail
    FROM public.organisations o
    WHERE o.subscription_status = 'past_due'
      AND o.blocked = false

    UNION ALL

    -- Trials ending soon (within 7 days)
    SELECT
      o.id,
      o.name,
      'trial_ending'::text AS reason,
      'medium'::text AS urgency,
      'Trial ends ' || to_char(o.trial_ends_at, 'DD Mon YYYY') AS detail
    FROM public.organisations o
    WHERE o.subscription_status = 'trialing'
      AND o.trial_ends_at IS NOT NULL
      AND o.trial_ends_at <= now() + interval '7 days'
      AND o.trial_ends_at > now()

    UNION ALL

    -- Inactive organisations (no reports in 30 days)
    SELECT
      o.id,
      o.name,
      'inactive'::text AS reason,
      'low'::text AS urgency,
      'No activity in 30+ days' AS detail
    FROM public.organisations o
    WHERE o.blocked = false
      AND o.archived = false
      AND NOT EXISTS (
        SELECT 1 FROM public.reports r
        WHERE r.organisation_id = o.id
          AND r.created_at >= now() - interval '30 days'
      )
      AND o.created_at < now() - interval '30 days'

    ORDER BY
      CASE urgency WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      name
    LIMIT 20
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_attention_items() TO authenticated;

-- get_growth_trend: Daily counts for growth chart
CREATE OR REPLACE FUNCTION public.get_growth_trend(days_back INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Not a super admin';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.date), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      d.date::date AS date,
      COALESCE(o.cnt, 0) AS orgs,
      COALESCE(u.cnt, 0) AS users,
      COALESCE(r.cnt, 0) AS reports
    FROM generate_series(
      (now() - (days_back || ' days')::interval)::date,
      now()::date,
      '1 day'::interval
    ) AS d(date)
    LEFT JOIN (
      SELECT created_at::date AS date, COUNT(*) AS cnt
      FROM public.organisations
      WHERE created_at >= now() - (days_back || ' days')::interval
      GROUP BY created_at::date
    ) o ON o.date = d.date::date
    LEFT JOIN (
      SELECT created_at::date AS date, COUNT(*) AS cnt
      FROM public.organisation_users
      WHERE created_at >= now() - (days_back || ' days')::interval
      GROUP BY created_at::date
    ) u ON u.date = d.date::date
    LEFT JOIN (
      SELECT created_at::date AS date, COUNT(*) AS cnt
      FROM public.reports
      WHERE created_at >= now() - (days_back || ' days')::interval
      GROUP BY created_at::date
    ) r ON r.date = d.date::date
  ) t;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_growth_trend(INTEGER) TO authenticated;

-- ============================================================
-- 6. Verify email OTP function (if not exists from email_otp migration)
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_email_otp(
  p_email TEXT,
  p_otp TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Find valid OTP
  SELECT * INTO v_record
  FROM public.email_otps
  WHERE email = lower(trim(p_email))
    AND otp = p_otp
    AND expires_at > now()
    AND used_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired OTP');
  END IF;

  -- Mark as used
  UPDATE public.email_otps
  SET used_at = now()
  WHERE id = v_record.id;

  RETURN jsonb_build_object('valid', true, 'user_id', v_record.user_id);
END;
$$;

-- Only grant if the function was created (email_otps table might not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_otps') THEN
    GRANT EXECUTE ON FUNCTION public.verify_email_otp(TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.verify_email_otp(TEXT, TEXT) TO anon;
  END IF;
END$$;

-- ============================================================
-- Done
-- ============================================================
