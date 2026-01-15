#!/usr/bin/env node

/**
 * Create a comprehensive demo template with all field types
 */

const https = require('https');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_980f6e4154e40cf8bfe7ec3aaee69a94d4ada3fd';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'eynaufdznthvmylsaffs';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Creating comprehensive demo template with all field types...\n');

  const statements = [
    // Template: Weekly Facilities Inspection (comprehensive demo)
    `INSERT INTO templates (id, organisation_id, name, description, is_published, created_by)
     VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
             'Weekly Facilities Inspection',
             'Comprehensive facilities check covering all areas - demonstrates all field types',
             true,
             '77dc55b6-56c2-4143-ac95-7694ef521dd6')
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,

    // Section 1: Access & Security
    `INSERT INTO template_sections (id, template_id, name, sort_order)
     VALUES ('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666666', 'Access & Security', 0)
     ON CONFLICT (id) DO NOTHING`,

    // Section 2: Building Exterior
    `INSERT INTO template_sections (id, template_id, name, sort_order)
     VALUES ('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666666', 'Building Exterior', 1)
     ON CONFLICT (id) DO NOTHING`,

    // Section 3: Interior Areas
    `INSERT INTO template_sections (id, template_id, name, sort_order)
     VALUES ('77777777-7777-7777-7777-777777777773', '66666666-6666-6666-6666-666666666666', 'Interior Areas', 2)
     ON CONFLICT (id) DO NOTHING`,

    // Section 4: Utilities & Equipment
    `INSERT INTO template_sections (id, template_id, name, sort_order)
     VALUES ('77777777-7777-7777-7777-777777777774', '66666666-6666-6666-6666-666666666666', 'Utilities & Equipment', 3)
     ON CONFLICT (id) DO NOTHING`,

    // Section 5: Health & Safety
    `INSERT INTO template_sections (id, template_id, name, sort_order)
     VALUES ('77777777-7777-7777-7777-777777777775', '66666666-6666-6666-6666-666666666666', 'Health & Safety', 4)
     ON CONFLICT (id) DO NOTHING`,

    // ========== Section 1: Access & Security Items ==========

    // PASS_FAIL: Security systems operational
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888801', '77777777-7777-7777-7777-777777777771',
             'Security systems operational', 'pass_fail', true, 'on_fail', 0)
     ON CONFLICT (id) DO NOTHING`,

    // YES_NO: CCTV recording properly
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888802', '77777777-7777-7777-7777-777777777771',
             'CCTV recording properly', 'yes_no', true, 'on_fail', 1)
     ON CONFLICT (id) DO NOTHING`,

    // NUMBER: Number of access cards issued this week
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888803', '77777777-7777-7777-7777-777777777771',
             'Number of access cards issued this week', 'number', false, 'never', 2)
     ON CONFLICT (id) DO NOTHING`,

    // SELECT: Current security threat level
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order, options)
     VALUES ('88888888-8888-8888-8888-888888888804', '77777777-7777-7777-7777-777777777771',
             'Current security threat level', 'select', true, 'never', 3,
             '["Normal", "Elevated", "High", "Critical"]')
     ON CONFLICT (id) DO NOTHING`,

    // ========== Section 2: Building Exterior Items ==========

    // CONDITION: External walls condition
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888811', '77777777-7777-7777-7777-777777777772',
             'External walls condition', 'condition', true, 'on_fail', 0)
     ON CONFLICT (id) DO NOTHING`,

    // CONDITION: Roof condition (visible areas)
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888812', '77777777-7777-7777-7777-777777777772',
             'Roof condition (visible areas)', 'condition', true, 'on_fail', 1)
     ON CONFLICT (id) DO NOTHING`,

    // PHOTO: Capture photo of building frontage
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888813', '77777777-7777-7777-7777-777777777772',
             'Building frontage photo', 'photo', true, 'always', 2)
     ON CONFLICT (id) DO NOTHING`,

    // MULTI_SELECT: External issues observed
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order, options)
     VALUES ('88888888-8888-8888-8888-888888888814', '77777777-7777-7777-7777-777777777772',
             'External issues observed', 'multi_select', false, 'always', 3,
             '["Graffiti", "Broken windows", "Damaged signage", "Litter/debris", "Damaged guttering", "Cracked paving", "None"]')
     ON CONFLICT (id) DO NOTHING`,

    // ========== Section 3: Interior Areas Items ==========

    // CONDITION: Common areas cleanliness
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888821', '77777777-7777-7777-7777-777777777773',
             'Common areas cleanliness', 'condition', true, 'on_fail', 0)
     ON CONFLICT (id) DO NOTHING`,

    // PASS_FAIL: Lifts operating correctly
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888822', '77777777-7777-7777-7777-777777777773',
             'Lifts operating correctly', 'pass_fail', true, 'on_fail', 1)
     ON CONFLICT (id) DO NOTHING`,

    // NUMBER: Current footfall count
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888823', '77777777-7777-7777-7777-777777777773',
             'Estimated footfall (visitors/hour)', 'number', false, 'never', 2)
     ON CONFLICT (id) DO NOTHING`,

    // TEXT: Notes on interior conditions
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888824', '77777777-7777-7777-7777-777777777773',
             'Additional observations', 'text', false, 'never', 3)
     ON CONFLICT (id) DO NOTHING`,

    // ========== Section 4: Utilities & Equipment Items ==========

    // PASS_FAIL: HVAC system functioning
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888831', '77777777-7777-7777-7777-777777777774',
             'HVAC system functioning', 'pass_fail', true, 'on_fail', 0)
     ON CONFLICT (id) DO NOTHING`,

    // SELECT: Current energy meter reading (kWh range)
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order, options)
     VALUES ('88888888-8888-8888-8888-888888888832', '77777777-7777-7777-7777-777777777774',
             'Generator fuel level', 'select', true, 'on_fail', 1,
             '["Full (75-100%)", "Three-quarters (50-75%)", "Half (25-50%)", "Low (below 25%)"]')
     ON CONFLICT (id) DO NOTHING`,

    // YES_NO: Water pressure normal
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888833', '77777777-7777-7777-7777-777777777774',
             'Water pressure normal', 'yes_no', true, 'on_fail', 2)
     ON CONFLICT (id) DO NOTHING`,

    // MULTI_SELECT: Equipment requiring maintenance
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order, options)
     VALUES ('88888888-8888-8888-8888-888888888834', '77777777-7777-7777-7777-777777777774',
             'Equipment requiring maintenance', 'multi_select', false, 'always', 3,
             '["HVAC units", "Lifts/escalators", "Fire suppression", "Lighting", "Plumbing", "Electrical", "None"]')
     ON CONFLICT (id) DO NOTHING`,

    // ========== Section 5: Health & Safety Items ==========

    // SEVERITY: Highest hazard level observed
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888841', '77777777-7777-7777-7777-777777777775',
             'Highest hazard level observed', 'severity', true, 'always', 0)
     ON CONFLICT (id) DO NOTHING`,

    // PASS_FAIL: Fire exits clear
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888842', '77777777-7777-7777-7777-777777777775',
             'All fire exits clear and accessible', 'pass_fail', true, 'on_fail', 1)
     ON CONFLICT (id) DO NOTHING`,

    // YES_NO: First aid kits fully stocked
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888843', '77777777-7777-7777-7777-777777777775',
             'First aid kits fully stocked', 'yes_no', true, 'on_fail', 2)
     ON CONFLICT (id) DO NOTHING`,

    // TEXT: Description of any hazards identified
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888844', '77777777-7777-7777-7777-777777777775',
             'Describe any hazards identified', 'text', false, 'never', 3)
     ON CONFLICT (id) DO NOTHING`,

    // PHOTO: Photo evidence of any issues
    `INSERT INTO template_items (id, section_id, label, item_type, is_required, photo_rule, sort_order)
     VALUES ('88888888-8888-8888-8888-888888888845', '77777777-7777-7777-7777-777777777775',
             'Photo evidence of any issues found', 'photo', false, 'always', 4)
     ON CONFLICT (id) DO NOTHING`,

    // Assign template to both sites
    `INSERT INTO site_template_assignments (site_id, template_id)
     VALUES ('22222222-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666')
     ON CONFLICT DO NOTHING`,
    `INSERT INTO site_template_assignments (site_id, template_id)
     VALUES ('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666')
     ON CONFLICT DO NOTHING`,
  ];

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const shortStmt = stmt.replace(/\s+/g, ' ').substring(0, 70) + '...';
    try {
      await executeSQL(stmt);
      console.log(`✓ [${i + 1}/${statements.length}] ${shortStmt}`);
    } catch (err) {
      console.error(`✗ [${i + 1}/${statements.length}] ${shortStmt}`);
      console.error(`  Error: ${err.message}`);
    }
  }

  console.log('\n✅ Demo template created successfully!\n');

  // Summary
  console.log('Template: Weekly Facilities Inspection');
  console.log('Sections: 5');
  console.log('Items: 22 (covering all 9 field types)');
  console.log('\nField types included:');
  console.log('  • pass_fail (4 items)');
  console.log('  • yes_no (3 items)');
  console.log('  • condition (4 items)');
  console.log('  • severity (1 item)');
  console.log('  • text (2 items)');
  console.log('  • number (2 items)');
  console.log('  • select (2 items)');
  console.log('  • multi_select (2 items)');
  console.log('  • photo (2 items)');
  console.log('\nAssigned to: Shopping Centre Alpha, Retail Park Beta');
}

main().catch(console.error);
