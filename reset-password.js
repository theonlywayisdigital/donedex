const https = require('https');

const SUPABASE_URL = 'https://eynaufdznthvmylsaffs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmF1ZmR6bnRodm15bHNhZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3NTI4OCwiZXhwIjoyMDgzNTUxMjg4fQ.-IzilLNK1U5jWo6QdW6ze_m99s5cwLPH5raGATPSEQQ';

const USER_ID = '7ad4a7df-e00c-412d-bc0b-5f11b7ef6f14';
const NEW_PASSWORD = 'Test123!';

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
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('Listing all users...\n');

  try {
    // List users
    const users = await adminRequest('GET', 'users');
    console.log('Users in auth.users:');
    users.users.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
      console.log(`    Confirmed: ${u.email_confirmed_at ? 'Yes' : 'No'}`);
    });

    // Find our user
    const targetUser = users.users.find(u => u.id === USER_ID);
    if (!targetUser) {
      console.log(`\n❌ User ${USER_ID} not found!`);
      return;
    }

    console.log(`\nResetting password for: ${targetUser.email}`);

    // Update password
    const result = await adminRequest('PUT', `users/${USER_ID}`, {
      password: NEW_PASSWORD,
      email_confirm: true  // Also confirm email if not confirmed
    });

    console.log('✅ Password reset successfully!');
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${targetUser.email}`);
    console.log(`  Password: ${NEW_PASSWORD}`);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

run().catch(console.error);
