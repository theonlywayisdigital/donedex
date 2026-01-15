const https = require('https');

const SUPABASE_URL = 'https://eynaufdznthvmylsaffs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5bmF1ZmR6bnRodm15bHNhZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk3NTI4OCwiZXhwIjoyMDgzNTUxMjg4fQ.-IzilLNK1U5jWo6QdW6ze_m99s5cwLPH5raGATPSEQQ';

async function query(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`);

    const options = {
      method: 'POST',
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
          resolve(JSON.parse(data || '{}'));
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

async function fetch(endpoint) {
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

async function post(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);

    const options = {
      method: 'POST',
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
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('Fetching current state...\n');

  // Get organisations
  const orgs = await fetch('organisations?select=id,name');
  console.log('Organisations:', orgs);

  // Get user profiles
  const profiles = await fetch('user_profiles?select=id,full_name');
  console.log('User profiles:', profiles);

  // Get organisation_users
  const orgUsers = await fetch('organisation_users?select=id,user_id,organisation_id,role');
  console.log('Organisation users:', orgUsers);

  if (orgs.length === 0) {
    console.log('\n❌ No organisation exists. Create one first.');
    return;
  }

  const orgId = orgs[0].id;
  console.log(`\nUsing organisation: ${orgs[0].name} (${orgId})`);

  // Check if we need to add any profiles to the org
  const profilesNotInOrg = profiles.filter(p =>
    !orgUsers.some(ou => ou.user_id === p.id)
  );

  if (profilesNotInOrg.length > 0) {
    console.log('\nAdding users to organisation...');
    for (const profile of profilesNotInOrg) {
      try {
        await post('organisation_users', {
          organisation_id: orgId,
          user_id: profile.id,
          role: 'user'
        });
        console.log(`✓ Added ${profile.full_name} to organisation`);
      } catch (err) {
        console.log(`⚠ Could not add ${profile.full_name}: ${err.message}`);
      }
    }
  } else {
    console.log('\n✓ All users already in organisation');
  }

  console.log('\n✅ Done!');
}

run().catch(console.error);
