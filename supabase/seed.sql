INSERT INTO organisations (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Organisation');

INSERT INTO organisation_users (organisation_id, user_id, role)
VALUES ('11111111-1111-1111-1111-111111111111', '77dc55b6-56c2-4143-ac95-7694ef521dd6', 'owner');

INSERT INTO user_profiles (id, full_name)
VALUES ('77dc55b6-56c2-4143-ac95-7694ef521dd6', 'Test User');

INSERT INTO sites (id, organisation_id, name, address)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Shopping Centre Alpha', '123 High Street, London');

INSERT INTO sites (id, organisation_id, name, address)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Retail Park Beta', '456 Commerce Road, Manchester');

INSERT INTO templates (id, organisation_id, name, description, is_published, created_by)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Daily Security Check', 'Morning security inspection checklist', true, '77dc55b6-56c2-4143-ac95-7694ef521dd6');

INSERT INTO template_sections (id, template_id, name, sort_order) VALUES
('55555555-5555-5555-5555-555555555551', '44444444-4444-4444-4444-444444444444', 'Car Park', 0),
('55555555-5555-5555-5555-555555555552', '44444444-4444-4444-4444-444444444444', 'Main Entrance', 1),
('55555555-5555-5555-5555-555555555553', '44444444-4444-4444-4444-444444444444', 'Fire Safety', 2);

INSERT INTO template_items (section_id, label, item_type, is_required, photo_rule, sort_order) VALUES
('55555555-5555-5555-5555-555555555551', 'Barriers functioning correctly', 'pass_fail', true, 'on_fail', 0),
('55555555-5555-5555-5555-555555555551', 'Lighting operational', 'yes_no', true, 'on_fail', 1),
('55555555-5555-5555-5555-555555555551', 'Surface condition', 'condition', true, 'on_fail', 2),
('55555555-5555-5555-5555-555555555551', 'Number of vehicles', 'number', false, 'never', 3);

INSERT INTO template_items (section_id, label, item_type, is_required, photo_rule, sort_order) VALUES
('55555555-5555-5555-5555-555555555552', 'Doors operating correctly', 'pass_fail', true, 'on_fail', 0),
('55555555-5555-5555-5555-555555555552', 'Floor cleanliness', 'condition', true, 'on_fail', 1),
('55555555-5555-5555-5555-555555555552', 'Signage visible', 'yes_no', true, 'never', 2),
('55555555-5555-5555-5555-555555555552', 'Any hazards observed', 'severity', false, 'always', 3),
('55555555-5555-5555-5555-555555555552', 'Notes', 'text', false, 'never', 4);

INSERT INTO template_items (section_id, label, item_type, is_required, photo_rule, sort_order, options) VALUES
('55555555-5555-5555-5555-555555555553', 'Fire exits clear', 'pass_fail', true, 'on_fail', 0, NULL),
('55555555-5555-5555-5555-555555555553', 'Extinguishers in place', 'yes_no', true, 'on_fail', 1, NULL),
('55555555-5555-5555-5555-555555555553', 'Alarm panel status', 'select', true, 'on_fail', 2, '["Normal","Fault","Silenced","Test Mode"]'),
('55555555-5555-5555-5555-555555555553', 'Emergency lighting test', 'pass_fail', true, 'on_fail', 3, NULL);

INSERT INTO site_template_assignments (site_id, template_id) VALUES
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444'),
('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444');
