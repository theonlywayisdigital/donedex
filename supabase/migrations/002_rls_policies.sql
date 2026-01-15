-- Donedex Row Level Security Policies
-- Reference: docs/mvp-spec.md Section 5

-- Enable RLS on all tables
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get user's organisation IDs
CREATE OR REPLACE FUNCTION get_user_organisation_ids()
RETURNS SETOF UUID AS $$
    SELECT organisation_id FROM organisation_users WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is admin/owner in an organisation
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM organisation_users
        WHERE user_id = auth.uid()
        AND organisation_id = org_id
        AND role IN ('owner', 'admin')
    );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user has access to a site (either assigned or is admin)
CREATE OR REPLACE FUNCTION has_site_access(site_id_param UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
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
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================
-- ORGANISATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view own organisations"
ON organisations FOR SELECT
USING (id IN (SELECT get_user_organisation_ids()));

CREATE POLICY "Owners can update own organisation"
ON organisations FOR UPDATE
USING (
    id IN (
        SELECT organisation_id FROM organisation_users
        WHERE user_id = auth.uid() AND role = 'owner'
    )
);

-- ============================================
-- USER PROFILES POLICIES
-- ============================================

CREATE POLICY "Users can view own profile"
ON user_profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org"
ON user_profiles FOR SELECT
USING (
    id IN (
        SELECT ou.user_id FROM organisation_users ou
        WHERE ou.organisation_id IN (SELECT get_user_organisation_ids())
    )
);

CREATE POLICY "Users can update own profile"
ON user_profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON user_profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ============================================
-- ORGANISATION USERS POLICIES
-- ============================================

CREATE POLICY "Users can view org members"
ON organisation_users FOR SELECT
USING (organisation_id IN (SELECT get_user_organisation_ids()));

CREATE POLICY "Admins can insert org members"
ON organisation_users FOR INSERT
WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update org members"
ON organisation_users FOR UPDATE
USING (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete org members"
ON organisation_users FOR DELETE
USING (is_org_admin(organisation_id));

-- ============================================
-- SITES POLICIES
-- ============================================

-- Admins see all sites in their org, users see assigned sites
CREATE POLICY "Users can view accessible sites"
ON sites FOR SELECT
USING (
    -- Admin/owner sees all sites in org
    (organisation_id IN (SELECT get_user_organisation_ids()) AND is_org_admin(organisation_id))
    OR
    -- Regular user sees assigned sites
    id IN (SELECT site_id FROM user_site_assignments WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can insert sites"
ON sites FOR INSERT
WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update sites"
ON sites FOR UPDATE
USING (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete sites"
ON sites FOR DELETE
USING (is_org_admin(organisation_id));

-- ============================================
-- USER SITE ASSIGNMENTS POLICIES
-- ============================================

CREATE POLICY "Users can view own site assignments"
ON user_site_assignments FOR SELECT
USING (
    user_id = auth.uid()
    OR
    site_id IN (
        SELECT s.id FROM sites s
        WHERE is_org_admin(s.organisation_id)
    )
);

CREATE POLICY "Admins can manage site assignments"
ON user_site_assignments FOR ALL
USING (
    site_id IN (
        SELECT s.id FROM sites s
        WHERE is_org_admin(s.organisation_id)
    )
);

-- ============================================
-- TEMPLATES POLICIES
-- ============================================

CREATE POLICY "Users can view org templates"
ON templates FOR SELECT
USING (organisation_id IN (SELECT get_user_organisation_ids()));

CREATE POLICY "Admins can insert templates"
ON templates FOR INSERT
WITH CHECK (is_org_admin(organisation_id));

CREATE POLICY "Admins can update templates"
ON templates FOR UPDATE
USING (is_org_admin(organisation_id));

CREATE POLICY "Admins can delete templates"
ON templates FOR DELETE
USING (is_org_admin(organisation_id));

-- ============================================
-- TEMPLATE SECTIONS POLICIES
-- ============================================

CREATE POLICY "Users can view template sections"
ON template_sections FOR SELECT
USING (
    template_id IN (
        SELECT id FROM templates
        WHERE organisation_id IN (SELECT get_user_organisation_ids())
    )
);

CREATE POLICY "Admins can manage template sections"
ON template_sections FOR ALL
USING (
    template_id IN (
        SELECT id FROM templates t
        WHERE is_org_admin(t.organisation_id)
    )
);

-- ============================================
-- TEMPLATE ITEMS POLICIES
-- ============================================

CREATE POLICY "Users can view template items"
ON template_items FOR SELECT
USING (
    section_id IN (
        SELECT ts.id FROM template_sections ts
        JOIN templates t ON t.id = ts.template_id
        WHERE t.organisation_id IN (SELECT get_user_organisation_ids())
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
);

-- ============================================
-- SITE TEMPLATE ASSIGNMENTS POLICIES
-- ============================================

CREATE POLICY "Users can view site template assignments"
ON site_template_assignments FOR SELECT
USING (
    site_id IN (
        SELECT id FROM sites
        WHERE organisation_id IN (SELECT get_user_organisation_ids())
    )
);

CREATE POLICY "Admins can manage site template assignments"
ON site_template_assignments FOR ALL
USING (
    site_id IN (
        SELECT s.id FROM sites s
        WHERE is_org_admin(s.organisation_id)
    )
);

-- ============================================
-- REPORTS POLICIES
-- ============================================

-- Admins see all reports, users see own reports
CREATE POLICY "Users can view reports"
ON reports FOR SELECT
USING (
    user_id = auth.uid()
    OR is_org_admin(organisation_id)
);

CREATE POLICY "Users can insert reports"
ON reports FOR INSERT
WITH CHECK (
    has_site_access(site_id)
    AND organisation_id IN (SELECT get_user_organisation_ids())
);

CREATE POLICY "Users can update own draft reports"
ON reports FOR UPDATE
USING (
    user_id = auth.uid() AND status = 'draft'
);

-- ============================================
-- REPORT RESPONSES POLICIES
-- ============================================

CREATE POLICY "Users can view report responses"
ON report_responses FOR SELECT
USING (
    report_id IN (
        SELECT id FROM reports r
        WHERE r.user_id = auth.uid() OR is_org_admin(r.organisation_id)
    )
);

CREATE POLICY "Users can insert report responses"
ON report_responses FOR INSERT
WITH CHECK (
    report_id IN (
        SELECT id FROM reports
        WHERE user_id = auth.uid() AND status = 'draft'
    )
);

CREATE POLICY "Users can update own report responses"
ON report_responses FOR UPDATE
USING (
    report_id IN (
        SELECT id FROM reports
        WHERE user_id = auth.uid() AND status = 'draft'
    )
);

-- ============================================
-- REPORT PHOTOS POLICIES
-- ============================================

CREATE POLICY "Users can view report photos"
ON report_photos FOR SELECT
USING (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON r.id = rr.report_id
        WHERE r.user_id = auth.uid() OR is_org_admin(r.organisation_id)
    )
);

CREATE POLICY "Users can insert report photos"
ON report_photos FOR INSERT
WITH CHECK (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON r.id = rr.report_id
        WHERE r.user_id = auth.uid() AND r.status = 'draft'
    )
);

CREATE POLICY "Users can delete own report photos"
ON report_photos FOR DELETE
USING (
    report_response_id IN (
        SELECT rr.id FROM report_responses rr
        JOIN reports r ON r.id = rr.report_id
        WHERE r.user_id = auth.uid() AND r.status = 'draft'
    )
);
