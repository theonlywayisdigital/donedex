-- ============================================
-- Migration 010: Super Admin System
-- ============================================
-- Enables vendor support staff to manage all client organisations.
-- Features:
-- - Super admin table (separate from organisation_users)
-- - Granular permissions system
-- - Audit logging for all super admin actions
-- - Impersonation sessions for debugging
-- ============================================

-- ============================================
-- STEP 1: CREATE PERMISSION ENUM
-- ============================================

CREATE TYPE super_admin_permission AS ENUM (
    'view_all_organisations',
    'edit_all_organisations',
    'view_all_users',
    'edit_all_users',
    'view_all_reports',
    'edit_all_reports',
    'view_all_templates',
    'edit_all_templates',
    'view_all_records',
    'edit_all_records',
    'impersonate_users',
    'manage_super_admins',
    'view_audit_logs'
);

-- ============================================
-- STEP 2: CREATE SUPER ADMINS TABLE
-- ============================================

CREATE TABLE super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX idx_super_admins_is_active ON super_admins(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: CREATE PERMISSIONS TABLE
-- ============================================

CREATE TABLE super_admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
    permission super_admin_permission NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    UNIQUE(super_admin_id, permission)
);

-- Indexes
CREATE INDEX idx_super_admin_permissions_admin_id ON super_admin_permissions(super_admin_id);

-- Enable RLS
ALTER TABLE super_admin_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE AUDIT LOG TABLE
-- ============================================

CREATE TABLE super_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES super_admins(id),
    action_type TEXT NOT NULL,
    action_category TEXT NOT NULL CHECK (action_category IN ('organisation', 'user', 'report', 'template', 'record', 'system', 'impersonation')),
    target_table TEXT,
    target_id UUID,
    target_organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    impersonating_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_log_super_admin ON super_admin_audit_log(super_admin_id);
CREATE INDEX idx_audit_log_created_at ON super_admin_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action_category ON super_admin_audit_log(action_category);
CREATE INDEX idx_audit_log_target_org ON super_admin_audit_log(target_organisation_id);

-- Enable RLS
ALTER TABLE super_admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: CREATE IMPERSONATION SESSIONS TABLE
-- ============================================

CREATE TABLE super_admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
    impersonating_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    impersonating_org_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '4 hours'),
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes
CREATE INDEX idx_super_admin_sessions_admin ON super_admin_sessions(super_admin_id);
CREATE INDEX idx_super_admin_sessions_active ON super_admin_sessions(is_active, expires_at) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE super_admin_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: CREATE HELPER FUNCTIONS
-- ============================================

-- Check if current user is an active super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM super_admins
        WHERE user_id = auth.uid()
        AND is_active = TRUE
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_super_admin IS 'Returns true if the current user is an active super admin.';

-- Check if super admin has a specific permission
CREATE OR REPLACE FUNCTION super_admin_has_permission(perm super_admin_permission)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM super_admin_permissions sap
        JOIN super_admins sa ON sa.id = sap.super_admin_id
        WHERE sa.user_id = auth.uid()
        AND sa.is_active = TRUE
        AND sap.permission = perm
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION super_admin_has_permission IS 'Checks if the current super admin has a specific permission.';

-- Get the super admin ID for the current user (if they are one)
CREATE OR REPLACE FUNCTION get_current_super_admin_id()
RETURNS UUID AS $$
    SELECT id FROM super_admins
    WHERE user_id = auth.uid()
    AND is_active = TRUE;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_current_super_admin_id IS 'Returns the super_admin.id for the current user, or NULL if not a super admin.';

-- ============================================
-- STEP 7: UPDATE EXISTING RLS HELPER FUNCTIONS
-- ============================================

-- Update get_user_organisation_ids to return ALL org IDs for super admins
CREATE OR REPLACE FUNCTION get_user_organisation_ids()
RETURNS SETOF UUID AS $$
BEGIN
    -- Super admins can see all organisations
    IF is_super_admin() THEN
        RETURN QUERY SELECT id FROM organisations;
    ELSE
        -- Regular users only see their organisations
        RETURN QUERY SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update is_org_admin to return true for super admins
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins have admin access to all orgs
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;

    -- Regular admin check
    RETURN EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = auth.uid()
        AND organisation_id = org_id
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update has_site_access for super admins (legacy - for sites table if still used)
CREATE OR REPLACE FUNCTION has_site_access(site_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Super admins have access to all sites
    IF is_super_admin() THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        -- User is assigned to site
        SELECT 1 FROM user_site_assignments
        WHERE user_id = auth.uid() AND site_id = site_id_param
    ) OR EXISTS (
        -- User is admin/owner of the organisation that owns the site
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = site_id_param
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 8: RLS POLICIES FOR SUPER ADMIN TABLES
-- ============================================

-- super_admins: Only super admins with manage_super_admins permission can view
CREATE POLICY "Super admins can view super_admins"
ON super_admins FOR SELECT
TO authenticated
USING (
    -- Super admin can view themselves
    user_id = auth.uid()
    OR
    -- Super admin with manage permission can view all
    super_admin_has_permission('manage_super_admins')
);

-- No INSERT/UPDATE/DELETE via app - must use service role or direct DB access

-- super_admin_permissions: Only viewable by the super admin themselves or managers
CREATE POLICY "Super admins can view permissions"
ON super_admin_permissions FOR SELECT
TO authenticated
USING (
    -- Own permissions
    super_admin_id = get_current_super_admin_id()
    OR
    -- Manager can see all
    super_admin_has_permission('manage_super_admins')
);

-- super_admin_audit_log: Only viewable by super admins with view_audit_logs permission
CREATE POLICY "Super admins can view audit logs"
ON super_admin_audit_log FOR SELECT
TO authenticated
USING (
    super_admin_has_permission('view_audit_logs')
);

-- Audit log is INSERT only from the app (no updates/deletes)
CREATE POLICY "Super admins can insert audit logs"
ON super_admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (
    is_super_admin()
    AND super_admin_id = get_current_super_admin_id()
);

-- super_admin_sessions: Super admins can view/manage their own sessions
CREATE POLICY "Super admins can view own sessions"
ON super_admin_sessions FOR SELECT
TO authenticated
USING (
    super_admin_id = get_current_super_admin_id()
);

CREATE POLICY "Super admins can insert own sessions"
ON super_admin_sessions FOR INSERT
TO authenticated
WITH CHECK (
    super_admin_id = get_current_super_admin_id()
    AND super_admin_has_permission('impersonate_users')
);

CREATE POLICY "Super admins can update own sessions"
ON super_admin_sessions FOR UPDATE
TO authenticated
USING (
    super_admin_id = get_current_super_admin_id()
);

-- ============================================
-- STEP 9: FUNCTION TO LOG SUPER ADMIN ACTIONS
-- ============================================

CREATE OR REPLACE FUNCTION log_super_admin_action(
    p_action_type TEXT,
    p_action_category TEXT,
    p_target_table TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_org_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_impersonating_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_super_admin_id UUID;
    v_log_id UUID;
BEGIN
    v_super_admin_id := get_current_super_admin_id();

    IF v_super_admin_id IS NULL THEN
        RAISE EXCEPTION 'User is not a super admin';
    END IF;

    INSERT INTO super_admin_audit_log (
        super_admin_id,
        action_type,
        action_category,
        target_table,
        target_id,
        target_organisation_id,
        old_values,
        new_values,
        impersonating_user_id
    ) VALUES (
        v_super_admin_id,
        p_action_type,
        p_action_category,
        p_target_table,
        p_target_id,
        p_target_org_id,
        p_old_values,
        p_new_values,
        p_impersonating_user_id
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_super_admin_action IS 'Logs a super admin action to the audit log. Called from the application layer.';

-- ============================================
-- STEP 10: UPDATED TIMESTAMP TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_super_admin_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER super_admins_updated_at
    BEFORE UPDATE ON super_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_super_admin_updated_at();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE super_admins IS 'Vendor support staff with cross-organisation admin access.';
COMMENT ON TABLE super_admin_permissions IS 'Granular permissions for super admins.';
COMMENT ON TABLE super_admin_audit_log IS 'Immutable audit trail of all super admin actions.';
COMMENT ON TABLE super_admin_sessions IS 'Active impersonation sessions for super admins.';
