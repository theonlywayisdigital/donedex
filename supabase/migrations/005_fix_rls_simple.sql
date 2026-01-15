-- Simpler RLS fix - avoid any cross-table references that could cause recursion

-- Drop ALL site-related policies first
DROP POLICY IF EXISTS "Users can view accessible sites" ON sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Admins can update sites" ON sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON sites;

DROP POLICY IF EXISTS "Users can view own site assignments" ON user_site_assignments;
DROP POLICY IF EXISTS "Admins can insert site assignments" ON user_site_assignments;
DROP POLICY IF EXISTS "Admins can delete site assignments" ON user_site_assignments;
DROP POLICY IF EXISTS "Admins can manage site assignments" ON user_site_assignments;

-- ============================================
-- SITES POLICIES - Simple version
-- ============================================

-- All users in org can VIEW sites (simplest approach - no recursion possible)
CREATE POLICY "Users can view org sites"
ON sites FOR SELECT
USING (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert sites"
ON sites FOR INSERT
WITH CHECK (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can update sites"
ON sites FOR UPDATE
USING (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can delete sites"
ON sites FOR DELETE
USING (
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- ============================================
-- USER SITE ASSIGNMENTS - Simple version
-- ============================================

-- Users can see their own assignments
CREATE POLICY "Users can view own assignments"
ON user_site_assignments FOR SELECT
USING (user_id = auth.uid());

-- Admins can see all assignments in their org
CREATE POLICY "Admins can view all assignments"
ON user_site_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM organisation_users ou
        WHERE ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
        AND ou.organisation_id IN (
            SELECT s.organisation_id FROM sites s WHERE s.id = user_site_assignments.site_id
        )
    )
);

CREATE POLICY "Admins can insert assignments"
ON user_site_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM organisation_users ou
        WHERE ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
        AND ou.organisation_id IN (
            SELECT s.organisation_id FROM sites s WHERE s.id = site_id
        )
    )
);

CREATE POLICY "Admins can delete assignments"
ON user_site_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM organisation_users ou
        WHERE ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
        AND ou.organisation_id IN (
            SELECT s.organisation_id FROM sites s WHERE s.id = user_site_assignments.site_id
        )
    )
);
