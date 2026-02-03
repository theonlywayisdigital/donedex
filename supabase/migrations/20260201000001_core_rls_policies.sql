-- ============================================================
-- Core RLS Policies Migration
-- Enables Row Level Security on all core tables to ensure
-- multi-tenant isolation (users can only access their own org's data)
-- ============================================================

-- Helper: reusable function to check org membership
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid();
$$;

-- Helper: check if user is admin/owner of a given org
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organisation_users
    WHERE user_id = auth.uid()
      AND organisation_id = org_id
      AND role IN ('owner', 'admin')
  );
$$;

-- ============================================================
-- 1. ORGANISATIONS
-- ============================================================
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organisation"
  ON organisations FOR SELECT
  USING (id IN (SELECT user_org_ids()));

CREATE POLICY "Owners can update their organisation"
  ON organisations FOR UPDATE
  USING (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

-- No direct INSERT/DELETE by users (handled via onboarding edge function)

-- ============================================================
-- 2. ORGANISATION_USERS (membership table)
-- ============================================================
ALTER TABLE organisation_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their org"
  ON organisation_users FOR SELECT
  USING (organisation_id IN (SELECT user_org_ids()));

CREATE POLICY "Admins can add members"
  ON organisation_users FOR INSERT
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update member roles"
  ON organisation_users FOR UPDATE
  USING (is_org_admin(organisation_id))
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can remove members"
  ON organisation_users FOR DELETE
  USING (is_org_admin(organisation_id));

-- ============================================================
-- 3. USER_PROFILES
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow users in the same org to see each other's profiles
CREATE POLICY "Users can view profiles of org members"
  ON user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR id IN (
      SELECT ou.user_id FROM organisation_users ou
      WHERE ou.organisation_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- 4. RECORD_TYPES
-- ============================================================
ALTER TABLE record_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's record types"
  ON record_types FOR SELECT
  USING (organisation_id IN (SELECT user_org_ids()));

CREATE POLICY "Admins can create record types"
  ON record_types FOR INSERT
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update record types"
  ON record_types FOR UPDATE
  USING (is_org_admin(organisation_id))
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete record types"
  ON record_types FOR DELETE
  USING (is_org_admin(organisation_id));

-- ============================================================
-- 5. RECORD_TYPE_FIELDS
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'record_type_fields' AND table_schema = 'public') THEN
    ALTER TABLE record_type_fields ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view fields for their org record types"
      ON record_type_fields FOR SELECT
      USING (
        record_type_id IN (
          SELECT id FROM record_types WHERE organisation_id IN (SELECT user_org_ids())
        )
      )';

    EXECUTE 'CREATE POLICY "Admins can manage record type fields"
      ON record_type_fields FOR ALL
      USING (
        record_type_id IN (
          SELECT id FROM record_types WHERE is_org_admin(organisation_id)
        )
      )
      WITH CHECK (
        record_type_id IN (
          SELECT id FROM record_types WHERE is_org_admin(organisation_id)
        )
      )';
  END IF;
END $$;

-- ============================================================
-- 6. RECORDS (sites/properties)
-- ============================================================
ALTER TABLE records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's records"
  ON records FOR SELECT
  USING (organisation_id IN (SELECT user_org_ids()));

CREATE POLICY "Admins can create records"
  ON records FOR INSERT
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update records"
  ON records FOR UPDATE
  USING (is_org_admin(organisation_id))
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete records"
  ON records FOR DELETE
  USING (is_org_admin(organisation_id));

-- ============================================================
-- 7. TEMPLATES
-- ============================================================
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's templates"
  ON templates FOR SELECT
  USING (organisation_id IN (SELECT user_org_ids()));

CREATE POLICY "Admins can create templates"
  ON templates FOR INSERT
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update templates"
  ON templates FOR UPDATE
  USING (is_org_admin(organisation_id))
  WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete templates"
  ON templates FOR DELETE
  USING (is_org_admin(organisation_id));

-- ============================================================
-- 8. TEMPLATE_SECTIONS
-- ============================================================
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sections for their org's templates"
  ON template_sections FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM templates WHERE organisation_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Admins can manage template sections"
  ON template_sections FOR ALL
  USING (
    template_id IN (
      SELECT id FROM templates WHERE is_org_admin(organisation_id)
    )
  )
  WITH CHECK (
    template_id IN (
      SELECT id FROM templates WHERE is_org_admin(organisation_id)
    )
  );

-- ============================================================
-- 9. TEMPLATE_ITEMS
-- ============================================================
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items for their org's templates"
  ON template_items FOR SELECT
  USING (
    section_id IN (
      SELECT ts.id FROM template_sections ts
      JOIN templates t ON t.id = ts.template_id
      WHERE t.organisation_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Admins can manage template items"
  ON template_items FOR ALL
  USING (
    section_id IN (
      SELECT ts.id FROM template_sections ts
      JOIN templates t ON t.id = ts.template_id
      WHERE is_org_admin(t.organisation_id)
    )
  )
  WITH CHECK (
    section_id IN (
      SELECT ts.id FROM template_sections ts
      JOIN templates t ON t.id = ts.template_id
      WHERE is_org_admin(t.organisation_id)
    )
  );

-- ============================================================
-- 10. REPORTS
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's reports"
  ON reports FOR SELECT
  USING (organisation_id IN (SELECT user_org_ids()));

CREATE POLICY "Users can create reports for their org"
  ON reports FOR INSERT
  WITH CHECK (organisation_id IN (SELECT user_org_ids()));

CREATE POLICY "Report author can update their draft"
  ON reports FOR UPDATE
  USING (
    organisation_id IN (SELECT user_org_ids())
    AND (user_id = auth.uid() OR is_org_admin(organisation_id))
  )
  WITH CHECK (
    organisation_id IN (SELECT user_org_ids())
  );

-- No DELETE policy - reports are audit trail (soft delete only)

-- ============================================================
-- 11. REPORT_RESPONSES
-- ============================================================
ALTER TABLE report_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses for their org's reports"
  ON report_responses FOR SELECT
  USING (
    report_id IN (
      SELECT id FROM reports WHERE organisation_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Users can create responses for their org's reports"
  ON report_responses FOR INSERT
  WITH CHECK (
    report_id IN (
      SELECT id FROM reports WHERE organisation_id IN (SELECT user_org_ids())
    )
  );

CREATE POLICY "Users can update responses for their org's reports"
  ON report_responses FOR UPDATE
  USING (
    report_id IN (
      SELECT id FROM reports WHERE organisation_id IN (SELECT user_org_ids())
    )
  )
  WITH CHECK (
    report_id IN (
      SELECT id FROM reports WHERE organisation_id IN (SELECT user_org_ids())
    )
  );

-- ============================================================
-- 12. INVITATIONS
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations' AND table_schema = 'public') THEN
    ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view their org invitations"
      ON invitations FOR SELECT
      USING (organisation_id IN (SELECT user_org_ids()))';

    EXECUTE 'CREATE POLICY "Admins can create invitations"
      ON invitations FOR INSERT
      WITH CHECK (is_org_admin(organisation_id))';

    EXECUTE 'CREATE POLICY "Admins can update invitations"
      ON invitations FOR UPDATE
      USING (is_org_admin(organisation_id))
      WITH CHECK (is_org_admin(organisation_id))';

    EXECUTE 'CREATE POLICY "Admins can delete invitations"
      ON invitations FOR DELETE
      USING (is_org_admin(organisation_id))';
  END IF;
END $$;

-- ============================================================
-- 13. USER_RECORD_ASSIGNMENTS
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_record_assignments' AND table_schema = 'public') THEN
    ALTER TABLE user_record_assignments ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view assignments for their org"
      ON user_record_assignments FOR SELECT
      USING (
        record_id IN (
          SELECT id FROM records WHERE organisation_id IN (SELECT user_org_ids())
        )
      )';

    EXECUTE 'CREATE POLICY "Admins can manage assignments"
      ON user_record_assignments FOR ALL
      USING (
        record_id IN (
          SELECT id FROM records WHERE is_org_admin(organisation_id)
        )
      )
      WITH CHECK (
        record_id IN (
          SELECT id FROM records WHERE is_org_admin(organisation_id)
        )
      )';
  END IF;
END $$;

-- ============================================================
-- 14. RECORD_DOCUMENTS
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'record_documents' AND table_schema = 'public') THEN
    ALTER TABLE record_documents ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view documents for their org records"
      ON record_documents FOR SELECT
      USING (
        record_id IN (
          SELECT id FROM records WHERE organisation_id IN (SELECT user_org_ids())
        )
      )';

    EXECUTE 'CREATE POLICY "Users can manage documents for their org records"
      ON record_documents FOR ALL
      USING (
        record_id IN (
          SELECT id FROM records WHERE organisation_id IN (SELECT user_org_ids())
        )
      )
      WITH CHECK (
        record_id IN (
          SELECT id FROM records WHERE organisation_id IN (SELECT user_org_ids())
        )
      )';
  END IF;
END $$;

-- ============================================================
-- 15. ONBOARDING_STATE
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_state' AND table_schema = 'public') THEN
    ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view their own onboarding state"
      ON onboarding_state FOR SELECT
      USING (user_id = auth.uid())';

    EXECUTE 'CREATE POLICY "Users can manage their own onboarding state"
      ON onboarding_state FOR ALL
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())';
  END IF;
END $$;

-- ============================================================
-- 16. LIBRARY TABLES (public read-only)
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_record_types' AND table_schema = 'public') THEN
    ALTER TABLE library_record_types ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "Anyone can read library record types"
      ON library_record_types FOR SELECT
      USING (true)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'library_templates' AND table_schema = 'public') THEN
    ALTER TABLE library_templates ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY "Anyone can read library templates"
      ON library_templates FOR SELECT
      USING (true)';
  END IF;
END $$;

-- ============================================================
-- 17. REPORT_USAGE_HISTORY
-- ============================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_usage_history' AND table_schema = 'public') THEN
    ALTER TABLE report_usage_history ENABLE ROW LEVEL SECURITY;

    EXECUTE 'CREATE POLICY "Users can view their org usage history"
      ON report_usage_history FOR SELECT
      USING (organisation_id IN (SELECT user_org_ids()))';

    EXECUTE 'CREATE POLICY "System can insert usage history"
      ON report_usage_history FOR INSERT
      WITH CHECK (organisation_id IN (SELECT user_org_ids()))';
  END IF;
END $$;

-- ============================================================
-- STORAGE BUCKET POLICIES
-- ============================================================

-- Report photos bucket
DO $$ BEGIN
  -- Check if bucket policy exists before creating
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects WHERE bucket_id = 'report-photos' LIMIT 0
  ) THEN
    -- Bucket may not exist yet, skip
    NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Storage tables may not exist in this context
END $$;

-- Note: Storage bucket policies should be configured via Supabase Dashboard:
-- Bucket: report-photos
--   SELECT: organisation_id check via path prefix
--   INSERT: authenticated users, path must start with their org_id
--   DELETE: admins only
--
-- Bucket: record-documents
--   SELECT: org members via path prefix
--   INSERT: org members
--   DELETE: admins only
--
-- Bucket: organisation-logos
--   SELECT: org members
--   INSERT: admins only
--   DELETE: admins only
