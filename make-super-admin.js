const https = require('https');

const SUPABASE_URL = 'https://eynaufdznthvmylsaffs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmF1ZmR6bnRodm15bHNhZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3NTI4OCwiZXhwIjoyMDgzNTUxMjg4fQ.-IzilLNK1U5jWo6QdW6ze_m99s5cwLPH5raGATPSEQQ';

const USER_ID = '7ad4a7df-e00c-412d-bc0b-5f11b7ef6f14';
const USER_NAME = 'Alex McCormick';
const USER_EMAIL = 'alexmccormickk+2@gmail.com';

const PERMISSIONS = [
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
];

function request(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '[]'));
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('Making user a super admin...\n');

  // Step 1: Check if super_admins table exists and get current admins
  console.log('1. Checking super_admins table...');
  try {
    const existingAdmins = await request('GET', `super_admins?user_id=eq.${USER_ID}`);
    console.log('   Current admins with this user_id:', existingAdmins);

    let superAdminId;

    if (existingAdmins.length > 0) {
      console.log('   ✓ User already in super_admins table');
      superAdminId = existingAdmins[0].id;
    } else {
      console.log('   Adding user to super_admins...');
      const result = await request('POST', 'super_admins', {
        user_id: USER_ID,
        name: USER_NAME,
        email: USER_EMAIL,
        is_active: true
      });
      console.log('   ✓ Added to super_admins:', result);
      superAdminId = result[0].id;
    }

    // Step 2: Grant all permissions
    console.log('\n2. Granting permissions...');

    // Check existing permissions
    const existingPermissions = await request('GET', `super_admin_permissions?super_admin_id=eq.${superAdminId}`);
    const existingPerms = existingPermissions.map(p => p.permission);
    console.log('   Existing permissions:', existingPerms);

    for (const permission of PERMISSIONS) {
      if (existingPerms.includes(permission)) {
        console.log(`   ✓ ${permission} (already exists)`);
      } else {
        try {
          await request('POST', 'super_admin_permissions', {
            super_admin_id: superAdminId,
            permission: permission
          });
          console.log(`   ✓ ${permission} (added)`);
        } catch (err) {
          console.log(`   ⚠ ${permission}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Done! User is now a super admin with all permissions.');
    console.log('\nTo test:');
    console.log('1. Log in as alexmccormickk+2@gmail.com');
    console.log('2. You should see the super admin dashboard with 6 tabs');

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run().catch(console.error);
