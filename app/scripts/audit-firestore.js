/**
 * Comprehensive Firestore Audit Script
 * Checks all collections against what the code expects
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCjnvHSOEWABSdhjJfpW-q--B6I2Cllxzk",
  authDomain: "donedex-72116.firebaseapp.com",
  projectId: "donedex-72116",
  storageBucket: "donedex-72116.firebasestorage.app",
  messagingSenderId: "317949580481",
  appId: "1:317949580481:web:11282010bc5ba89d5ff040",
};

// Expected collections based on firestore.ts
const EXPECTED_COLLECTIONS = [
  'users',
  'organisations',
  'super_admins',
  'templates',
  'template_sections',
  'template_items',
  'records',
  'reports',
  'sites',
  'invitations',
  'notifications',
  'subscription_plans',
  'audit_log',
  'record_types',
  'record_type_fields',
  'report_responses',
  'report_photos',
  'user_record_assignments',
  'notification_receipts',
  'record_documents',
  'user_sessions',
  'onboarding_state',
  'library_record_types',
  'library_templates',
  'pii_detection_events',
  'report_usage_history',
  'push_tokens',
  'invoices',
  'storage_addons',
  'subscription_history',
];

// Expected super admin permissions from types/superAdmin.ts
const EXPECTED_PERMISSIONS = [
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
  'view_audit_logs',
  'send_notifications',
];

// Expected subscription plan fields from types/billing.ts
const EXPECTED_PLAN_FIELDS = [
  'id', 'name', 'slug', 'description',
  'max_users', 'max_records', 'max_reports_per_month', 'max_storage_gb',
  'price_monthly_gbp', 'price_annual_gbp',
  'price_per_user_monthly_gbp', 'price_per_user_annual_gbp',
  'base_users_included',
  'is_active', 'is_public', 'display_order',
  'feature_ai_templates', 'feature_pdf_export', 'feature_api_access',
  'feature_custom_branding', 'feature_priority_support', 'feature_white_label',
  'feature_advanced_analytics', 'feature_photos', 'feature_starter_templates',
  'feature_all_field_types', 'allowed_field_categories',
  'created_at', 'updated_at'
];

// Expected organisation fields
const EXPECTED_ORG_FIELDS = [
  'id', 'name', 'slug', 'contact_email', 'contact_phone',
  'stripe_customer_id', 'subscription_status', 'current_plan_id',
  'trial_ends_at', 'subscription_ends_at',
  'blocked', 'blocked_at', 'blocked_reason',
  'archived', 'archived_at',
  'billing_interval',
  'discount_percent', 'discount_notes', 'discount_applied_by', 'discount_applied_at',
  'onboarding_completed_at',
  'created_at', 'updated_at'
];

// Expected user fields
const EXPECTED_USER_FIELDS = [
  'id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
  'avatar_url', 'organisation_id', 'role',
  'email_verified', 'last_sign_in_at',
  'created_at', 'updated_at'
];

async function audit() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const report = {
    collections: {},
    issues: [],
    summary: { total_issues: 0, critical: 0, warning: 0 }
  };

  console.log('='.repeat(60));
  console.log('FIRESTORE AUDIT REPORT');
  console.log('='.repeat(60));
  console.log('');

  // Check each expected collection
  for (const collName of EXPECTED_COLLECTIONS) {
    try {
      const snapshot = await getDocs(collection(db, collName));
      report.collections[collName] = {
        exists: true,
        count: snapshot.size,
        sample: snapshot.size > 0 ? snapshot.docs[0].data() : null,
        sampleId: snapshot.size > 0 ? snapshot.docs[0].id : null
      };
    } catch (err) {
      report.collections[collName] = {
        exists: false,
        error: err.message
      };
    }
  }

  // Print collection status
  console.log('COLLECTION STATUS:');
  console.log('-'.repeat(60));
  for (const [name, info] of Object.entries(report.collections)) {
    if (info.exists) {
      console.log(`✓ ${name}: ${info.count} documents`);
    } else {
      console.log(`✗ ${name}: NOT FOUND or ERROR`);
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('DETAILED SCHEMA CHECKS');
  console.log('='.repeat(60));

  // Check super_admins
  console.log('\n--- super_admins ---');
  if (report.collections['super_admins']?.count > 0) {
    const adminsSnapshot = await getDocs(collection(db, 'super_admins'));
    adminsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\nDocument ID: ${doc.id}`);
      console.log(`Fields present: ${Object.keys(data).join(', ')}`);

      if (data.permissions) {
        console.log(`Permissions in DB: ${JSON.stringify(data.permissions)}`);

        // Check for permission mismatches
        const invalidPerms = data.permissions.filter(p => !EXPECTED_PERMISSIONS.includes(p));
        const missingPerms = EXPECTED_PERMISSIONS.filter(p => !data.permissions.includes(p));

        if (invalidPerms.length > 0) {
          const issue = `CRITICAL: Invalid permissions found: ${invalidPerms.join(', ')}`;
          console.log(`  ❌ ${issue}`);
          report.issues.push({ collection: 'super_admins', docId: doc.id, type: 'critical', message: issue });
          report.summary.critical++;
        }

        if (missingPerms.length > 0) {
          console.log(`  ⚠️  Missing permissions: ${missingPerms.join(', ')}`);
        }
      } else {
        const issue = 'CRITICAL: No permissions array found';
        console.log(`  ❌ ${issue}`);
        report.issues.push({ collection: 'super_admins', docId: doc.id, type: 'critical', message: issue });
        report.summary.critical++;
      }

      // Check required fields
      const requiredFields = ['is_active'];
      for (const field of requiredFields) {
        if (data[field] === undefined) {
          const issue = `WARNING: Missing field '${field}'`;
          console.log(`  ⚠️  ${issue}`);
          report.issues.push({ collection: 'super_admins', docId: doc.id, type: 'warning', message: issue });
          report.summary.warning++;
        }
      }
    });
  } else {
    console.log('No super_admins documents found!');
    report.issues.push({ collection: 'super_admins', type: 'critical', message: 'No super admin documents exist' });
    report.summary.critical++;
  }

  // Check subscription_plans
  console.log('\n--- subscription_plans ---');
  if (report.collections['subscription_plans']?.count > 0) {
    const plansSnapshot = await getDocs(collection(db, 'subscription_plans'));
    plansSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\nPlan: ${data.name || 'UNNAMED'} (${doc.id})`);

      const presentFields = Object.keys(data);
      const missingFields = EXPECTED_PLAN_FIELDS.filter(f => f !== 'id' && !presentFields.includes(f));
      const extraFields = presentFields.filter(f => !EXPECTED_PLAN_FIELDS.includes(f));

      if (missingFields.length > 0) {
        console.log(`  ⚠️  Missing fields: ${missingFields.join(', ')}`);
        report.issues.push({ collection: 'subscription_plans', docId: doc.id, type: 'warning', message: `Missing fields: ${missingFields.join(', ')}` });
        report.summary.warning++;
      }

      if (extraFields.length > 0) {
        console.log(`  ℹ️  Extra fields: ${extraFields.join(', ')}`);
      }

      // Check critical fields
      if (!data.is_active) {
        console.log(`  ⚠️  Plan is not active`);
      }
      if (!data.is_public) {
        console.log(`  ⚠️  Plan is not public`);
      }
    });
  } else {
    console.log('No subscription_plans found!');
    report.issues.push({ collection: 'subscription_plans', type: 'critical', message: 'No subscription plans exist' });
    report.summary.critical++;
  }

  // Check organisations
  console.log('\n--- organisations ---');
  if (report.collections['organisations']?.count > 0) {
    const orgsSnapshot = await getDocs(collection(db, 'organisations'));
    orgsSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\nOrg: ${data.name || 'UNNAMED'} (${doc.id})`);

      const presentFields = Object.keys(data);
      const missingFields = EXPECTED_ORG_FIELDS.filter(f => f !== 'id' && !presentFields.includes(f));

      if (missingFields.length > 0) {
        console.log(`  ⚠️  Missing fields: ${missingFields.join(', ')}`);
      }

      // Check critical fields
      if (!data.created_at) {
        console.log(`  ⚠️  Missing created_at`);
      }
    });
  }

  // Check users
  console.log('\n--- users ---');
  if (report.collections['users']?.count > 0) {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`\nUser: ${data.email || data.full_name || 'UNKNOWN'} (${doc.id})`);

      const presentFields = Object.keys(data);
      console.log(`  Fields: ${presentFields.join(', ')}`);
    });
  } else {
    console.log('No users found (may be expected if using Firebase Auth)');
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  report.summary.total_issues = report.issues.length;
  console.log(`Total Issues: ${report.summary.total_issues}`);
  console.log(`  Critical: ${report.summary.critical}`);
  console.log(`  Warnings: ${report.summary.warning}`);

  if (report.issues.length > 0) {
    console.log('\nALL ISSUES:');
    report.issues.forEach((issue, i) => {
      console.log(`${i + 1}. [${issue.type.toUpperCase()}] ${issue.collection}${issue.docId ? '/' + issue.docId : ''}: ${issue.message}`);
    });
  }

  // Output JSON report
  console.log('\n');
  console.log('='.repeat(60));
  console.log('JSON REPORT (for programmatic use):');
  console.log('='.repeat(60));
  console.log(JSON.stringify(report, null, 2));

  process.exit(report.summary.critical > 0 ? 1 : 0);
}

audit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
