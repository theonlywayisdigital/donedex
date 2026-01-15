-- ============================================
-- Migration 025: Notification Centre
-- ============================================
-- Enables super admins to send notifications to users/clients
-- via both email and in-app channels with flexible targeting.
-- ============================================

-- ============================================
-- STEP 1: NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_label TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'announcement', 'alert', 'update')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),

    -- Targeting
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'organisation', 'user')),
    target_organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Delivery options
    send_email BOOLEAN DEFAULT TRUE,
    send_in_app BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Targeting constraints - ensure proper targeting based on type
    CHECK (
        (target_type = 'all' AND target_organisation_id IS NULL AND target_user_id IS NULL) OR
        (target_type = 'organisation' AND target_organisation_id IS NOT NULL AND target_user_id IS NULL) OR
        (target_type = 'user' AND target_user_id IS NOT NULL)
    )
);

COMMENT ON TABLE notifications IS 'Super admin notifications sent to users via email and in-app channels.';
COMMENT ON COLUMN notifications.target_type IS 'Targeting: all (broadcast), organisation (all users in org), user (individual)';
COMMENT ON COLUMN notifications.category IS 'Notification category for filtering and styling';
COMMENT ON COLUMN notifications.priority IS 'Priority level affects visual styling (high = more prominent)';

-- ============================================
-- STEP 2: NOTIFICATION RECEIPTS TABLE
-- ============================================

CREATE TABLE notification_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Status tracking
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    email_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(notification_id, user_id)
);

COMMENT ON TABLE notification_receipts IS 'Tracks per-user read/dismissed status for notifications.';
COMMENT ON COLUMN notification_receipts.read_at IS 'When the user viewed/read the notification';
COMMENT ON COLUMN notification_receipts.dismissed_at IS 'When the user dismissed/cleared the notification';
COMMENT ON COLUMN notification_receipts.email_sent_at IS 'When the email was sent to this user';

-- ============================================
-- STEP 3: INDEXES
-- ============================================

-- Notifications table indexes
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_target_type ON notifications(target_type);
CREATE INDEX idx_notifications_target_org ON notifications(target_organisation_id)
    WHERE target_organisation_id IS NOT NULL;
CREATE INDEX idx_notifications_target_user ON notifications(target_user_id)
    WHERE target_user_id IS NOT NULL;
CREATE INDEX idx_notifications_category ON notifications(category);

-- Notification receipts indexes
CREATE INDEX idx_notification_receipts_user ON notification_receipts(user_id);
CREATE INDEX idx_notification_receipts_notification ON notification_receipts(notification_id);
CREATE INDEX idx_notification_receipts_unread ON notification_receipts(user_id, read_at)
    WHERE read_at IS NULL;

-- Composite index for efficient inbox query
CREATE INDEX idx_notification_receipts_inbox ON notification_receipts(user_id, created_at DESC)
    WHERE dismissed_at IS NULL;

-- ============================================
-- STEP 4: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_receipts ENABLE ROW LEVEL SECURITY;

-- Notifications: Super admins can manage all
CREATE POLICY "Super admins can manage notifications"
ON notifications FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Notifications: Users can view notifications targeted to them
CREATE POLICY "Users can view targeted notifications"
ON notifications FOR SELECT
TO authenticated
USING (
    target_type = 'all' OR
    target_user_id = auth.uid() OR
    (target_type = 'organisation' AND target_organisation_id IN (
        SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid()
    ))
);

-- Receipts: Users can view their own (super admins can view all)
CREATE POLICY "Users can view own receipts"
ON notification_receipts FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_super_admin());

-- Receipts: Users can insert their own receipts (for creating when first viewing)
CREATE POLICY "Users can insert own receipts"
ON notification_receipts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR is_super_admin());

-- Receipts: Users can update their own receipts (for marking read/dismissed)
CREATE POLICY "Users can update own receipts"
ON notification_receipts FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- STEP 5: RPC FUNCTIONS
-- ============================================

-- Get unread notification count for current user
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM notifications n
    LEFT JOIN notification_receipts nr ON nr.notification_id = n.id AND nr.user_id = auth.uid()
    WHERE (
        n.target_type = 'all' OR
        n.target_user_id = auth.uid() OR
        (n.target_type = 'organisation' AND n.target_organisation_id IN (
            SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid()
        ))
    )
    AND (nr.read_at IS NULL OR nr.id IS NULL)
    AND (nr.dismissed_at IS NULL OR nr.id IS NULL);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread, non-dismissed notifications for the current user.';

-- Get notifications for current user with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
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
) AS $$
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
    LEFT JOIN notification_receipts nr ON nr.notification_id = n.id AND nr.user_id = auth.uid()
    WHERE (
        n.target_type = 'all' OR
        n.target_user_id = auth.uid() OR
        (n.target_type = 'organisation' AND n.target_organisation_id IN (
            SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid()
        ))
    )
    AND (nr.dismissed_at IS NULL OR nr.id IS NULL)
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_notifications IS 'Returns paginated notifications for the current user, excluding dismissed ones.';

-- Mark a notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notification_receipts (notification_id, user_id, read_at)
    VALUES (p_notification_id, auth.uid(), NOW())
    ON CONFLICT (notification_id, user_id)
    DO UPDATE SET read_at = COALESCE(notification_receipts.read_at, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_notification_read IS 'Marks a notification as read for the current user.';

-- Dismiss a notification
CREATE OR REPLACE FUNCTION dismiss_notification(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO notification_receipts (notification_id, user_id, dismissed_at)
    VALUES (p_notification_id, auth.uid(), NOW())
    ON CONFLICT (notification_id, user_id)
    DO UPDATE SET dismissed_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION dismiss_notification IS 'Dismisses a notification for the current user (hides it from their view).';

-- Mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Insert or update receipts for all unread notifications
    WITH target_notifications AS (
        SELECT n.id
        FROM notifications n
        LEFT JOIN notification_receipts nr ON nr.notification_id = n.id AND nr.user_id = auth.uid()
        WHERE (
            n.target_type = 'all' OR
            n.target_user_id = auth.uid() OR
            (n.target_type = 'organisation' AND n.target_organisation_id IN (
                SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid()
            ))
        )
        AND (nr.read_at IS NULL OR nr.id IS NULL)
        AND (nr.dismissed_at IS NULL OR nr.id IS NULL)
    ),
    updated AS (
        INSERT INTO notification_receipts (notification_id, user_id, read_at)
        SELECT id, auth.uid(), NOW()
        FROM target_notifications
        ON CONFLICT (notification_id, user_id)
        DO UPDATE SET read_at = COALESCE(notification_receipts.read_at, NOW())
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all notifications as read for the current user. Returns count of notifications marked.';

-- Super admin: Get sent notifications with stats
CREATE OR REPLACE FUNCTION get_sent_notifications(
    p_limit INTEGER DEFAULT 50,
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
) AS $$
BEGIN
    -- Only super admins can call this
    IF NOT is_super_admin() THEN
        RAISE EXCEPTION 'Permission denied';
    END IF;

    RETURN QUERY
    SELECT
        n.id,
        n.title,
        n.message,
        n.category,
        n.priority,
        n.target_type,
        n.target_organisation_id,
        o.name as target_organisation_name,
        n.target_user_id,
        n.send_email,
        n.send_in_app,
        n.created_at,
        COUNT(nr.id) as recipient_count,
        COUNT(nr.read_at) as read_count
    FROM notifications n
    LEFT JOIN organisations o ON o.id = n.target_organisation_id
    LEFT JOIN notification_receipts nr ON nr.notification_id = n.id
    GROUP BY n.id, o.name
    ORDER BY n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_sent_notifications IS 'Super admin function to get sent notifications with read statistics.';
