const https = require('https');

const SUPABASE_URL = 'https://eynaufdznthvmylsaffs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmF1ZmR6bnRodm15bHNhZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3NTI4OCwiZXhwIjoyMDgzNTUxMjg4fQ.-IzilLNK1U5jWo6QdW6ze_m99s5cwLPH5raGATPSEQQ';

function request(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);
    const options = {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data || '[]')));
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('=== Checking Super Admin Setup ===\n');

  // Check super_admins
  const superAdmins = await request('super_admins?select=*');
  console.log('Super Admins:', JSON.stringify(superAdmins, null, 2));

  // Check permissions
  const permissions = await request('super_admin_permissions?select=*');
  console.log('\nPermissions:', JSON.stringify(permissions, null, 2));

  // Check auth users
  const https2 = require('https');
  const url = new URL(`${SUPABASE_URL}/auth/v1/admin/users`);
  const options = {
    method: 'GET',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  };

  const users = await new Promise((resolve, reject) => {
    const req = https2.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data || '{}')));
    });
    req.on('error', reject);
    req.end();
  });

  console.log('\nAuth Users:');
  users.users?.forEach(u => console.log(`  - ${u.email} (${u.id})`));
}

run().catch(console.error);
