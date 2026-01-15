-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- ============================================
-- DROP EXISTING PROBLEMATIC POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible sites" ON sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Admins can update sites" ON sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON sites;

DROP POLICY IF EXISTS "Users can view own site assignments" ON user_site_assignments;
DROP POLICY IF EXISTS "Admins can manage site assignments" ON user_site_assignments;

DROP POLICY IF EXISTS "Users can view site template assignments" ON site_template_assignments;
DROP POLICY IF EXISTS "Admins can manage site template assignments" ON site_template_assignments;

-- ============================================
-- UPDATE HELPER FUNCTION (avoid recursion)
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS has_site_access(UUID);

-- Check if user is admin/owner in any of their organisations (no site lookup)
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- SITES POLICIES (FIXED)
-- ============================================

-- Admins see all sites in their org, users see assigned sites
CREATE POLICY "Users can view accessible sites"
ON sites FOR SELECT
USING (
    -- User is in the same organisation (admin/owner sees all)
    organisation_id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
    OR
    -- Regular user sees assigned sites only
    id IN (SELECT site_id FROM user_site_assignments WHERE user_id = auth.uid())
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
-- USER SITE ASSIGNMENTS POLICIES (FIXED)
-- ============================================

CREATE POLICY "Users can view own site assignments"
ON user_site_assignments FOR SELECT
USING (
    user_id = auth.uid()
    OR
    -- Admins can view all assignments in their org's sites
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = user_site_assignments.site_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can insert site assignments"
ON user_site_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = site_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can delete site assignments"
ON user_site_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = user_site_assignments.site_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

-- ============================================
-- SITE TEMPLATE ASSIGNMENTS POLICIES (FIXED)
-- ============================================

CREATE POLICY "Users can view site template assignments"
ON site_template_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = site_template_assignments.site_id
        AND ou.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can insert site template assignments"
ON site_template_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = site_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can update site template assignments"
ON site_template_assignments FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = site_template_assignments.site_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

CREATE POLICY "Admins can delete site template assignments"
ON site_template_assignments FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM sites s
        JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
        WHERE s.id = site_template_assignments.site_id
        AND ou.user_id = auth.uid()
        AND ou.role IN ('owner', 'admin')
    )
);

-- ============================================
-- FIX REPORTS INSERT POLICY
-- ============================================

DROP POLICY IF EXISTS "Users can insert reports" ON reports;

CREATE POLICY "Users can insert reports"
ON reports FOR INSERT
WITH CHECK (
    -- User must be in the organisation
    organisation_id IN (SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid())
    AND
    -- User must have access to the site (either assigned or admin)
    (
        site_id IN (SELECT site_id FROM user_site_assignments WHERE user_id = auth.uid())
        OR
        EXISTS (
            SELECT 1 FROM sites s
            JOIN organisation_users ou ON ou.organisation_id = s.organisation_id
            WHERE s.id = site_id
            AND ou.user_id = auth.uid()
            AND ou.role IN ('owner', 'admin')
        )
    )
);
