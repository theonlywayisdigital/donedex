-- ============================================================
-- Notifications Schema
-- Tables, RPC functions, and RLS policies for the notification system
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Main notifications table (one row per sent notification)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'announcement', 'alert', 'update')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'all_admins', 'organisation', 'organisation_admins', 'user')),
  target_organisation_id UUID REFERENCES public.organisations(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  send_email BOOLEAN NOT NULL DEFAULT false,
  send_in_app BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user receipt tracking (one row per user per notification)
CREATE TABLE IF NOT EXISTS public.notification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Push token storage (one row per device per user)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_receipts_user ON public.notification_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_notification ON public.notification_receipts(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_receipts_unread ON public.notification_receipts(user_id) WHERE read_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

-- ============================================================
-- 2. RLS POLICIES
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Notifications: users can only see notifications targeted to them (via receipts)
CREATE POLICY "Users can view notifications they received"
  ON public.notifications FOR SELECT
  USING (
    id IN (
      SELECT notification_id FROM public.notification_receipts
      WHERE user_id = auth.uid()
    )
  );

-- Super admins can view all and insert
CREATE POLICY "Super admins can manage notifications"
  ON public.notifications FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

-- Receipts: users can only see/update their own
CREATE POLICY "Users can view their own receipts"
  ON public.notification_receipts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own receipts"
  ON public.notification_receipts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Super admins can insert receipts (when sending notifications)
CREATE POLICY "Super admins can insert receipts"
  ON public.notification_receipts FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = auth.uid())
  );

-- Push tokens: users can manage their own
CREATE POLICY "Users can view their own push tokens"
  ON public.push_tokens FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own push tokens"
  ON public.push_tokens FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 3. RPC FUNCTIONS
-- ============================================================

-- Get unread notification count for current user
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM notification_receipts
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND dismissed_at IS NULL;
$$;

-- Get paginated notifications for current user
CREATE OR REPLACE FUNCTION public.get_user_notifications(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  action_url TEXT,
  action_label TEXT,
  category TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.title,
    n.message,
    n.action_url,
    n.action_label,
    n.category,
    n.priority,
    n.created_at,
    nr.read_at,
    nr.dismissed_at
  FROM notifications n
  JOIN notification_receipts nr ON nr.notification_id = n.id
  WHERE nr.user_id = auth.uid()
    AND nr.dismissed_at IS NULL
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Mark a notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_receipts
  SET read_at = now()
  WHERE notification_id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Mark all notifications as read for current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_receipts
  SET read_at = now()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;
END;
$$;

-- Dismiss a notification (hide from user's view)
CREATE OR REPLACE FUNCTION public.dismiss_notification(
  p_notification_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notification_receipts
  SET dismissed_at = now()
  WHERE notification_id = p_notification_id
    AND user_id = auth.uid();
END;
$$;

-- Get sent notifications with stats (for super admins)
CREATE OR REPLACE FUNCTION public.get_sent_notifications(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  message TEXT,
  category TEXT,
  priority TEXT,
  target_type TEXT,
  target_organisation_id UUID,
  target_organisation_name TEXT,
  target_user_id UUID,
  send_email BOOLEAN,
  send_in_app BOOLEAN,
  created_at TIMESTAMPTZ,
  recipient_count BIGINT,
  read_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.title,
    n.message,
    n.category,
    n.priority,
    n.target_type,
    n.target_organisation_id,
    o.name AS target_organisation_name,
    n.target_user_id,
    n.send_email,
    n.send_in_app,
    n.created_at,
    (SELECT COUNT(*) FROM notification_receipts nr WHERE nr.notification_id = n.id) AS recipient_count,
    (SELECT COUNT(*) FROM notification_receipts nr WHERE nr.notification_id = n.id AND nr.read_at IS NOT NULL) AS read_count
  FROM notifications n
  LEFT JOIN organisations o ON o.id = n.target_organisation_id
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- Send a notification (creates notification + receipts for targeted users)
CREATE OR REPLACE FUNCTION public.send_notification(
  p_title TEXT,
  p_message TEXT,
  p_category TEXT DEFAULT 'general',
  p_priority TEXT DEFAULT 'normal',
  p_target_type TEXT DEFAULT 'all',
  p_target_organisation_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL,
  p_send_email BOOLEAN DEFAULT false,
  p_send_in_app BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_target_count INTEGER;
BEGIN
  -- Insert the notification
  INSERT INTO notifications (
    title, message, action_url, action_label,
    category, priority, target_type,
    target_organisation_id, target_user_id,
    send_email, send_in_app, created_by
  ) VALUES (
    p_title, p_message, p_action_url, p_action_label,
    p_category, p_priority, p_target_type,
    p_target_organisation_id, p_target_user_id,
    p_send_email, p_send_in_app, auth.uid()
  ) RETURNING id INTO v_notification_id;

  -- Create receipts based on target type
  IF p_target_type = 'all' THEN
    INSERT INTO notification_receipts (notification_id, user_id)
    SELECT v_notification_id, au.id
    FROM auth.users au;
  ELSIF p_target_type = 'all_admins' THEN
    INSERT INTO notification_receipts (notification_id, user_id)
    SELECT DISTINCT v_notification_id, ou.user_id
    FROM organisation_users ou
    WHERE ou.role IN ('owner', 'admin');
  ELSIF p_target_type = 'organisation' THEN
    INSERT INTO notification_receipts (notification_id, user_id)
    SELECT v_notification_id, ou.user_id
    FROM organisation_users ou
    WHERE ou.organisation_id = p_target_organisation_id;
  ELSIF p_target_type = 'organisation_admins' THEN
    INSERT INTO notification_receipts (notification_id, user_id)
    SELECT v_notification_id, ou.user_id
    FROM organisation_users ou
    WHERE ou.organisation_id = p_target_organisation_id
      AND ou.role IN ('owner', 'admin');
  ELSIF p_target_type = 'user' THEN
    INSERT INTO notification_receipts (notification_id, user_id)
    VALUES (v_notification_id, p_target_user_id);
  END IF;

  SELECT COUNT(*) INTO v_target_count
  FROM notification_receipts
  WHERE notification_id = v_notification_id;

  RETURN jsonb_build_object(
    'success', true,
    'notification_id', v_notification_id,
    'target_count', v_target_count
  );
END;
$$;
