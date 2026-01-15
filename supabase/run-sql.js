#!/usr/bin/env node

/**
 * Run SQL against the Supabase database using the Management API
 *
 * Usage:
 *   node supabase/run-sql.js "SELECT * FROM organisations"
 *   node supabase/run-sql.js < file.sql
 *   cat file.sql | node supabase/run-sql.js
 */

const https = require('https');
const fs = require('fs');

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
  let sql = '';

  // Get SQL from command line argument
  if (process.argv[2]) {
    sql = process.argv[2];
  }
  // Or read from stdin
  else if (!process.stdin.isTTY) {
    sql = fs.readFileSync(0, 'utf-8');
  } else {
    console.error('Usage: node supabase/run-sql.js "SELECT * FROM table"');
    console.error('   or: node supabase/run-sql.js < file.sql');
    process.exit(1);
  }

  try {
    const result = await executeSQL(sql);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
