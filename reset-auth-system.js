const https = require('https');

const SUPABASE_URL = 'https://eynaufdznthvmylsaffs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmF1ZmR6bnRodm15bHNhZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3NTI4OCwiZXhwIjoyMDgzNTUxMjg4fQ.-IzilLNK1U5jWo6QdW6ze_m99s5cwLPH5raGATPSEQQ';

const PASSWORD = 'Test123!';

const USERS_TO_CREATE = [
  { email: 'superadmin@test.com', name: 'Super Admin', role: 'super_admin' },
  { email: 'admin@test.com', name: 'Client Admin', role: 'owner' },
  { email: 'staff1@test.com', name: 'Staff Member 1', role: 'user' },
  { email: 'staff2@test.com', name: 'Staff Member 2', role: 'user' },
];

const SUPER_ADMIN_PERMISSIONS = [
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

function adminRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/auth/v1/admin/${endpoint}`);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function restRequest(method, endpoint, body = null) {
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('=== COMPLETE AUTH SYSTEM RESET ===\n');

  // Step 1: Get all existing users
  console.log('Step 1: Fetching existing users...');
  const existingUsers = await adminRequest('GET', 'users');
  console.log(`Found ${existingUsers.users?.length || 0} existing users`);

  // Step 2: Delete all existing users
  console.log('\nStep 2: Deleting all existing users...');
  for (const user of existingUsers.users || []) {
    try {
      await adminRequest('DELETE', `users/${user.id}`);
      console.log(`  ✓ Deleted: ${user.email}`);
    } catch (err) {
      console.log(`  ⚠ Failed to delete ${user.email}: ${err.message}`);
    }
  }

  // Step 3: Clean up orphaned data (in case cascade didn't work)
  console.log('\nStep 3: Cleaning orphaned data...');
  try {
    await restRequest('DELETE', 'super_admin_permissions?id=neq.00000000-0000-0000-0000-000000000000');
    await restRequest('DELETE', 'super_admins?id=neq.00000000-0000-0000-0000-000000000000');
    await restRequest('DELETE', 'organisation_users?id=neq.00000000-0000-0000-0000-000000000000');
    await restRequest('DELETE', 'user_profiles?id=neq.00000000-0000-0000-0000-000000000000');
    console.log('  ✓ Cleaned up orphaned records');
  } catch (err) {
    console.log(`  ⚠ Cleanup warning: ${err.message}`);
  }

  // Step 4: Get or create organisation
  console.log('\nStep 4: Setting up organisation...');
  let orgId;
  const orgs = await restRequest('GET', 'organisations?select=id,name');
  if (orgs.length > 0) {
    orgId = orgs[0].id;
    console.log(`  Using existing org: ${orgs[0].name} (${orgId})`);
  } else {
    const newOrg = await restRequest('POST', 'organisations', {
      name: 'Test Company',
      slug: 'test-company'
    });
    orgId = newOrg[0].id;
    console.log(`  Created new org: Test Company (${orgId})`);
  }

  // Step 5: Create fresh users
  console.log('\nStep 5: Creating fresh users...');
  const createdUsers = {};

  for (const userDef of USERS_TO_CREATE) {
    try {
      const user = await adminRequest('POST', 'users', {
        email: userDef.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: userDef.name
        }
      });
      createdUsers[userDef.email] = { ...user, role: userDef.role, name: userDef.name };
      console.log(`  ✓ Created: ${userDef.email} (${user.id})`);
    } catch (err) {
      console.log(`  ✗ Failed to create ${userDef.email}: ${err.message}`);
    }
  }

  // Step 6: Create user profiles
  console.log('\nStep 6: Creating user profiles...');
  for (const email of Object.keys(createdUsers)) {
    const user = createdUsers[email];
    try {
      await restRequest('POST', 'user_profiles', {
        id: user.id,
        full_name: user.name
      });
      console.log(`  ✓ Profile created for ${email}`);
    } catch (err) {
      console.log(`  ⚠ Profile for ${email}: ${err.message}`);
    }
  }

  // Step 7: Add non-super-admin users to organisation
  console.log('\nStep 7: Adding users to organisation...');
  for (const email of Object.keys(createdUsers)) {
    const user = createdUsers[email];
    if (user.role === 'super_admin') {
      console.log(`  - Skipping ${email} (super admin - no org membership)`);
      continue;
    }
    try {
      await restRequest('POST', 'organisation_users', {
        organisation_id: orgId,
        user_id: user.id,
        role: user.role
      });
      console.log(`  ✓ Added ${email} as ${user.role}`);
    } catch (err) {
      console.log(`  ✗ Failed to add ${email}: ${err.message}`);
    }
  }

  // Step 8: Set up super admin
  console.log('\nStep 8: Setting up super admin...');
  const superAdminUser = createdUsers['superadmin@test.com'];
  if (superAdminUser) {
    try {
      const saResult = await restRequest('POST', 'super_admins', {
        user_id: superAdminUser.id,
        name: superAdminUser.name,
        email: 'superadmin@test.com',
        is_active: true
      });
      const superAdminId = saResult[0].id;
      console.log(`  ✓ Added to super_admins table (${superAdminId})`);

      // Grant all permissions
      for (const perm of SUPER_ADMIN_PERMISSIONS) {
        try {
          await restRequest('POST', 'super_admin_permissions', {
            super_admin_id: superAdminId,
            permission: perm
          });
          console.log(`    ✓ Granted: ${perm}`);
        } catch (err) {
          console.log(`    ⚠ ${perm}: ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`  ✗ Super admin setup failed: ${err.message}`);
    }
  }

  // Summary
  console.log('\n=== SETUP COMPLETE ===\n');
  console.log('Test accounts created:');
  console.log('┌─────────────────────────┬─────────────┬────────────────┐');
  console.log('│ Email                   │ Password    │ Role           │');
  console.log('├─────────────────────────┼─────────────┼────────────────┤');
  console.log('│ superadmin@test.com     │ Test123!    │ Super Admin    │');
  console.log('│ admin@test.com          │ Test123!    │ Owner (Admin)  │');
  console.log('│ staff1@test.com         │ Test123!    │ User (Staff)   │');
  console.log('│ staff2@test.com         │ Test123!    │ User (Staff)   │');
  console.log('└─────────────────────────┴─────────────┴────────────────┘');
  console.log('\nAll passwords: Test123!');
}

run().catch(console.error);
