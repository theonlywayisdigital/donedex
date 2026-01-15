-- ============================================
-- Migration 008: Fix RLS Recursion
-- ============================================
-- Fixes infinite recursion in RLS policies between records and user_record_assignments.
-- The issue: records policy queries user_record_assignments, which queries records.
-- Solution: Use SECURITY DEFINER functions to bypass RLS when checking assignments.
-- ============================================

-- ============================================
-- STEP 1: CREATE HELPER FUNCTIONS (SECURITY DEFINER)
-- These bypass RLS to prevent circular policy evaluation
-- ============================================

-- Function to get record IDs assigned to a user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_record_ids(user_id_param UUID DEFAULT auth.uid())
RETURNS SETOF UUID AS $$
    SELECT record_id FROM user_record_assignments WHERE user_id = user_id_param;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Function to get organisation_id for a record (bypasses RLS)
CREATE OR REPLACE FUNCTION get_record_organisation_id(record_id_param UUID)
RETURNS UUID AS $$
    SELECT organisation_id FROM records WHERE id = record_id_param;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- STEP 2: DROP PROBLEMATIC POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view accessible records" ON records;
DROP POLICY IF EXISTS "Users can view org sites" ON records;  -- Legacy policy cleanup
DROP POLICY IF EXISTS "Users can view own record assignments" ON user_record_assignments;
DROP POLICY IF EXISTS "Admins can manage record assignments" ON user_record_assignments;

-- ============================================
-- STEP 3: RECREATE RECORDS POLICIES (fixed)
-- ============================================

-- Records: Users can view if admin OR if assigned (using helper function)
CREATE POLICY "Users can view accessible records"
ON records FOR SELECT
USING (
    -- Admin can see all records in their orgs
    (organisation_id IN (SELECT get_user_organisation_ids()) AND is_org_admin(organisation_id))
    OR
    -- Regular users can only see assigned records (using SECURITY DEFINER function)
    id IN (SELECT get_user_record_ids())
);

-- ============================================
-- STEP 4: RECREATE USER_RECORD_ASSIGNMENTS POLICIES (fixed)
-- ============================================

-- Users can view their own assignments, admins can view all in their org
CREATE POLICY "Users can view own record assignments"
ON user_record_assignments FOR SELECT
USING (
    user_id = auth.uid()
    OR
    -- Admin check using the helper function to get org_id (bypasses records RLS)
    is_org_admin(get_record_organisation_id(record_id))
);

-- Admins can insert/update/delete assignments
CREATE POLICY "Admins can manage record assignments"
ON user_record_assignments FOR ALL
USING (
    is_org_admin(get_record_organisation_id(record_id))
);

-- ============================================
-- STEP 5: ADD COMMENTS
-- ============================================

COMMENT ON FUNCTION get_user_record_ids IS 'Returns record IDs assigned to a user. Uses SECURITY DEFINER to bypass RLS and prevent policy recursion.';
COMMENT ON FUNCTION get_record_organisation_id IS 'Returns the organisation_id for a record. Uses SECURITY DEFINER to bypass RLS and prevent policy recursion.';
