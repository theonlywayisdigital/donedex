-- ============================================
-- Migration 022: Fix User Foreign Key Constraints
-- ============================================
-- Allows users to be deleted from auth.users by setting
-- ON DELETE SET NULL for optional user references.
-- ============================================

-- ============================================
-- STEP 1: Fix templates.created_by
-- ============================================
ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_created_by_fkey;

ALTER TABLE templates
ADD CONSTRAINT templates_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- STEP 2: Fix reports.user_id
-- ============================================
ALTER TABLE reports
DROP CONSTRAINT IF EXISTS reports_user_id_fkey;

ALTER TABLE reports
ADD CONSTRAINT reports_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- STEP 3: Fix report_responses.person_id (if exists)
-- ============================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'report_responses' AND column_name = 'person_id'
    ) THEN
        ALTER TABLE report_responses
        DROP CONSTRAINT IF EXISTS report_responses_person_id_fkey;

        ALTER TABLE report_responses
        ADD CONSTRAINT report_responses_person_id_fkey
        FOREIGN KEY (person_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================
-- STEP 4: Fix super_admin_permissions.granted_by
-- ============================================
ALTER TABLE super_admin_permissions
DROP CONSTRAINT IF EXISTS super_admin_permissions_granted_by_fkey;

ALTER TABLE super_admin_permissions
ADD CONSTRAINT super_admin_permissions_granted_by_fkey
FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- STEP 5: Fix super_admins.created_by
-- ============================================
ALTER TABLE super_admins
DROP CONSTRAINT IF EXISTS super_admins_created_by_fkey;

ALTER TABLE super_admins
ADD CONSTRAINT super_admins_created_by_fkey
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON CONSTRAINT templates_created_by_fkey ON templates IS 'Allows user deletion by setting created_by to NULL';
COMMENT ON CONSTRAINT reports_user_id_fkey ON reports IS 'Allows user deletion by setting user_id to NULL';
