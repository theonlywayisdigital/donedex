/**
 * Seed Subscription Plans in Firestore
 * Run this to populate the subscription_plans collection
 *
 * Usage: node scripts/seed-firestore-plans.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCjnvHSOEWABSdhjJfpW-q--B6I2Cllxzk",
  authDomain: "donedex-72116.firebaseapp.com",
  projectId: "donedex-72116",
  storageBucket: "donedex-72116.firebasestorage.app",
  messagingSenderId: "317949580481",
  appId: "1:317949580481:web:11282010bc5ba89d5ff040",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All field categories for Pro/Enterprise
const allFieldCategories = [
  'basic',
  'rating_scales',
  'date_time',
  'measurement',
  'evidence',
  'location',
  'people',
  'advanced',
  'groups'
];

const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    description: 'Get started with basic inspections',
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_per_user_price_id_monthly: null,
    stripe_per_user_price_id_annual: null,
    max_users: 2,
    max_records: -1, // unlimited
    max_reports_per_month: 10,
    max_storage_gb: 1,
    feature_ai_templates: false,
    feature_pdf_export: true,
    feature_api_access: false,
    feature_custom_branding: false,
    feature_priority_support: false,
    feature_white_label: false,
    feature_advanced_analytics: false,
    feature_photos: true,
    feature_starter_templates: false,
    feature_all_field_types: false,
    price_monthly_gbp: 0,
    price_annual_gbp: 0,
    price_per_user_monthly_gbp: 0,
    price_per_user_annual_gbp: 0,
    base_users_included: 0,
    allowed_field_categories: ['basic', 'evidence'],
    is_active: true,
    is_public: true,
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    description: 'For growing teams with advanced inspections',
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_per_user_price_id_monthly: null,
    stripe_per_user_price_id_annual: null,
    max_users: -1, // unlimited
    max_records: -1, // unlimited
    max_reports_per_month: 100,
    max_storage_gb: 25,
    feature_ai_templates: true,
    feature_pdf_export: true,
    feature_api_access: false,
    feature_custom_branding: true,
    feature_priority_support: false,
    feature_white_label: false,
    feature_advanced_analytics: false,
    feature_photos: true,
    feature_starter_templates: true,
    feature_all_field_types: true,
    price_monthly_gbp: 2900, // £29
    price_annual_gbp: 27840, // £278.40
    price_per_user_monthly_gbp: 900, // £9
    price_per_user_annual_gbp: 8640, // £86.40
    base_users_included: 1,
    allowed_field_categories: allFieldCategories,
    is_active: true,
    is_public: true,
    display_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Full platform with API, white label, and priority support',
    stripe_product_id: null,
    stripe_price_id_monthly: null,
    stripe_price_id_annual: null,
    stripe_per_user_price_id_monthly: null,
    stripe_per_user_price_id_annual: null,
    max_users: -1, // unlimited
    max_records: -1, // unlimited
    max_reports_per_month: -1, // unlimited
    max_storage_gb: 100,
    feature_ai_templates: true,
    feature_pdf_export: true,
    feature_api_access: true,
    feature_custom_branding: true,
    feature_priority_support: true,
    feature_white_label: true,
    feature_advanced_analytics: true,
    feature_photos: true,
    feature_starter_templates: true,
    feature_all_field_types: true,
    price_monthly_gbp: 9900, // £99
    price_annual_gbp: 95040, // £950.40
    price_per_user_monthly_gbp: 1100, // £11
    price_per_user_annual_gbp: 10560, // £105.60
    base_users_included: 1,
    allowed_field_categories: allFieldCategories,
    is_active: true,
    is_public: true,
    display_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

async function seedPlans() {
  console.log('Seeding subscription plans to Firestore...\n');

  try {
    for (const plan of subscriptionPlans) {
      console.log(`Creating ${plan.name} plan...`);
      await setDoc(doc(db, 'subscription_plans', plan.id), plan);
      console.log(`  ✅ ${plan.name} plan created`);
    }

    console.log('\n✅ All subscription plans seeded successfully!');
    console.log('\nPlans created:');
    subscriptionPlans.forEach((plan) => {
      const price = plan.price_monthly_gbp === 0
        ? 'Free'
        : `£${(plan.price_monthly_gbp / 100).toFixed(2)}/mo`;
      console.log(`  - ${plan.name}: ${price}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error.message);
    process.exit(1);
  }
}

seedPlans();
