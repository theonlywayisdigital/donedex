-- ============================================================
-- User Sessions Table for Single-Device Login (Staff Only)
-- Prevents credential sharing by limiting staff to one active device
-- ============================================================

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create partial unique index to ensure only one active session per user
-- This allows multiple inactive (is_active = false) rows but only one active
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_one_active_per_user
  ON public.user_sessions (user_id)
  WHERE is_active = true;

-- Index for fast lookups of active sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
  ON public.user_sessions (user_id, is_active)
  WHERE is_active = true;

-- Index for cleanup of stale sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_active
  ON public.user_sessions (last_active_at);

-- Comments
COMMENT ON TABLE public.user_sessions IS 'Tracks active login sessions for single-device enforcement (staff only)';
COMMENT ON COLUMN public.user_sessions.device_id IS 'Unique device identifier (generated and stored in AsyncStorage)';
COMMENT ON COLUMN public.user_sessions.device_name IS 'Human-readable device name for display (e.g., "iPhone 14", "Chrome on Mac")';
COMMENT ON COLUMN public.user_sessions.is_active IS 'Whether this session is currently active. Only one active session per user allowed.';
COMMENT ON COLUMN public.user_sessions.last_active_at IS 'Updated by heartbeat every 5 minutes while app is open';

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read their own sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "Users can create own sessions"
  ON public.user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions (for heartbeat and logout)
CREATE POLICY "Users can update own sessions"
  ON public.user_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins/owners can manage sessions for users in their organisation
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

-- ============================================================
-- Helper Functions
-- ============================================================

-- Function to check if user has an active session (used during login)
CREATE OR REPLACE FUNCTION public.check_active_session(p_user_id UUID)
RETURNS TABLE (
  has_active_session BOOLEAN,
  device_name TEXT,
  last_active_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS has_active_session,
    us.device_name,
    us.last_active_at
  FROM public.user_sessions us
  WHERE us.user_id = p_user_id
    AND us.is_active = true
  LIMIT 1;

  -- If no rows returned, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Function to create a new session (deactivates any existing first)
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id UUID,
  p_device_id TEXT,
  p_device_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- First deactivate any existing active sessions for this user
  UPDATE public.user_sessions
  SET is_active = false
  WHERE user_id = p_user_id AND is_active = true;

  -- Create new session
  INSERT INTO public.user_sessions (user_id, device_id, device_name, is_active)
  VALUES (p_user_id, p_device_id, p_device_name, true)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

-- Function to update session heartbeat
CREATE OR REPLACE FUNCTION public.update_session_heartbeat(p_device_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_sessions
  SET last_active_at = now()
  WHERE user_id = auth.uid()
    AND device_id = p_device_id
    AND is_active = true;

  RETURN FOUND;
END;
$$;

-- Function to deactivate session on logout
CREATE OR REPLACE FUNCTION public.deactivate_user_session(p_device_id TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_device_id IS NOT NULL THEN
    -- Deactivate specific device session
    UPDATE public.user_sessions
    SET is_active = false
    WHERE user_id = auth.uid()
      AND device_id = p_device_id
      AND is_active = true;
  ELSE
    -- Deactivate all sessions for user
    UPDATE public.user_sessions
    SET is_active = false
    WHERE user_id = auth.uid()
      AND is_active = true;
  END IF;

  RETURN true;
END;
$$;

-- Function for admins to reset all sessions for a user
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
  -- Get caller's role and org
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

-- Function to cleanup stale sessions (can be called by cron or on login)
CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions(p_hours_inactive INTEGER DEFAULT 24)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.user_sessions
  SET is_active = false
  WHERE is_active = true
    AND last_active_at < now() - (p_hours_inactive || ' hours')::INTERVAL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_active_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_user_session(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_heartbeat(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user_session(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_sessions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions(INTEGER) TO authenticated;
