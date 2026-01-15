-- Donedex Database Indexes
-- Reference: docs/mvp-spec.md Section 5

-- Organisation users
CREATE INDEX idx_organisation_users_user ON organisation_users(user_id);
CREATE INDEX idx_organisation_users_org ON organisation_users(organisation_id);

-- Sites
CREATE INDEX idx_sites_organisation ON sites(organisation_id);

-- User site assignments
CREATE INDEX idx_user_site_assignments_user ON user_site_assignments(user_id);
CREATE INDEX idx_user_site_assignments_site ON user_site_assignments(site_id);

-- Templates
CREATE INDEX idx_templates_organisation ON templates(organisation_id);
CREATE INDEX idx_templates_published ON templates(organisation_id, is_published);

-- Template sections
CREATE INDEX idx_template_sections_template ON template_sections(template_id);
CREATE INDEX idx_template_sections_order ON template_sections(template_id, sort_order);

-- Template items
CREATE INDEX idx_template_items_section ON template_items(section_id);
CREATE INDEX idx_template_items_order ON template_items(section_id, sort_order);

-- Site template assignments
CREATE INDEX idx_site_template_site ON site_template_assignments(site_id);
CREATE INDEX idx_site_template_template ON site_template_assignments(template_id);

-- Reports
CREATE INDEX idx_reports_site ON reports(site_id);
CREATE INDEX idx_reports_user ON reports(user_id);
CREATE INDEX idx_reports_organisation ON reports(organisation_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_submitted ON reports(submitted_at DESC);

-- Report responses
CREATE INDEX idx_report_responses_report ON report_responses(report_id);

-- Report photos
CREATE INDEX idx_report_photos_response ON report_photos(report_response_id);
