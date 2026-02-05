/**
 * Billing & Subscription Types
 * Part of the Organisation Onboarding & Billing System
 */

// Subscription plan slugs
export type PlanSlug = 'free' | 'pro' | 'enterprise';

// Subscription status (synced from Stripe)
export type SubscriptionStatus =
  | 'incomplete'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused';

// Billing interval
export type BillingInterval = 'monthly' | 'annual';

// Invoice status
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

/**
 * Subscription plan details
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: PlanSlug;
  description: string | null;

  // Stripe integration
  stripe_product_id: string | null;
  stripe_price_id_monthly: string | null;
  stripe_price_id_annual: string | null;
  stripe_per_user_price_id_monthly: string | null;
  stripe_per_user_price_id_annual: string | null;

  // Usage limits (-1 = unlimited)
  max_users: number;
  max_records: number;
  max_reports_per_month: number;
  max_storage_gb: number;

  // Feature flags
  feature_ai_templates: boolean;
  feature_pdf_export: boolean;
  feature_api_access: boolean;
  feature_custom_branding: boolean;
  feature_priority_support: boolean;
  feature_white_label: boolean;
  feature_advanced_analytics: boolean;
  feature_photos: boolean;
  feature_starter_templates: boolean;
  feature_all_field_types: boolean;

  // Pricing (in pence GBP)
  price_monthly_gbp: number;
  price_annual_gbp: number;
  price_per_user_monthly_gbp: number;
  price_per_user_annual_gbp: number;
  base_users_included: number;

  // Field type gating
  allowed_field_categories: string[];

  // Meta
  is_active: boolean;
  is_public: boolean;
  display_order: number;
}

/**
 * Plan with computed display values
 */
export interface SubscriptionPlanDisplay extends SubscriptionPlan {
  // Computed display values
  priceMonthlyFormatted: string; // "£49.00"
  priceAnnualFormatted: string; // "£490.00"
  priceAnnualMonthlyFormatted: string; // "£40.83/mo" for annual
  savingsPercent: number; // e.g., 17 for 17% savings
  isUnlimitedUsers: boolean;
  isUnlimitedRecords: boolean;
  isUnlimitedReports: boolean;
  isUnlimitedStorage: boolean;
  // Per-user pricing display
  hasPerUserPricing: boolean;
  pricePerUserMonthlyFormatted: string; // "£9"
  pricePerUserAnnualMonthlyFormatted: string; // "£7.20"
}

/**
 * Organisation billing info
 */
export interface OrganisationBilling {
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  current_plan: SubscriptionPlan | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

/**
 * Storage add-on (purchased via Stripe)
 */
export interface StorageAddOn {
  id: string;
  organisation_id: string;
  quantity_blocks: number;
  block_size_gb: number; // 10
  price_per_block_monthly_gbp: number; // 500 (£5 in pence)
  stripe_subscription_item_id: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Usage limit info
 */
export interface UsageLimit {
  current: number;
  limit: number; // -1 = unlimited
  exceeded: boolean;
  percent: number; // 0-100+
}

/**
 * All usage limits for an organisation
 */
export interface UsageLimits {
  users: UsageLimit;
  records: UsageLimit;
  reports: UsageLimit;
  storage: UsageLimit & {
    current_bytes: number;
    current_gb: number;
    limit_gb: number;
    base_limit_gb: number;
    addon_gb: number;
  };
  plan: {
    id: string;
    name: string;
    slug: PlanSlug;
  };
}

/**
 * Invoice from Stripe
 */
export interface Invoice {
  id: string;
  organisation_id: string;
  stripe_invoice_id: string;
  stripe_subscription_id: string | null;
  status: InvoiceStatus;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  tax: number;
  invoice_pdf_url: string | null;
  hosted_invoice_url: string | null;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  voided_at: string | null;
  finalized_at: string | null;
  created_at: string;
}

/**
 * Invoice with formatted display values
 */
export interface InvoiceDisplay extends Invoice {
  amountDueFormatted: string;
  amountPaidFormatted: string;
  periodFormatted: string;
  statusDisplay: {
    label: string;
    color: string;
  };
}

/**
 * Subscription history entry
 */
export interface SubscriptionHistoryEntry {
  id: string;
  organisation_id: string;
  plan_id: string;
  plan: SubscriptionPlan;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  started_at: string;
  ended_at: string | null;
  trial_end: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
}

/**
 * Billing summary (from get_billing_summary function)
 */
export interface BillingSummary {
  has_billing: boolean;
  subscription_status: SubscriptionStatus;
  is_trialing: boolean;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  current_plan: {
    id: string;
    name: string;
    slug: PlanSlug;
    price_monthly_gbp: number;
    price_annual_gbp: number;
    price_per_user_monthly_gbp: number;
    price_per_user_annual_gbp: number;
    base_users_included: number;
  } | null;
  latest_invoice: {
    amount_paid: number;
    paid_at: string;
    pdf_url: string | null;
  } | null;
}

/**
 * Checkout session response
 */
export interface CheckoutSessionResponse {
  url: string;
  sessionId: string;
}

/**
 * Customer portal response
 */
export interface CustomerPortalResponse {
  url: string;
}

/**
 * Feature check helper type
 */
export type PlanFeature =
  | 'feature_ai_templates'
  | 'feature_pdf_export'
  | 'feature_api_access'
  | 'feature_custom_branding'
  | 'feature_priority_support'
  | 'feature_white_label'
  | 'feature_advanced_analytics'
  | 'feature_photos'
  | 'feature_starter_templates'
  | 'feature_all_field_types';

/**
 * Field types available on Free plan (basic + evidence categories)
 */
export const FREE_TIER_FIELD_TYPES = [
  // Basic category (9 types)
  'pass_fail',
  'yes_no',
  'condition',
  'severity',
  'text',
  'number',
  'select',
  'multi_select',
  'coloured_selection',
  // Evidence category (4 types)
  'photo',
  'photo_before_after',
  'signature',
  'annotated_photo',
] as const;

export type FreeTierFieldType = typeof FREE_TIER_FIELD_TYPES[number];

/**
 * Field type categories available on Free plan
 */
export const FREE_TIER_CATEGORIES = ['basic', 'evidence'] as const;

export type FreeTierCategory = typeof FREE_TIER_CATEGORIES[number];

/** @deprecated Use FREE_TIER_FIELD_TYPES instead */
export const BASIC_CHECK_FIELD_TYPES = FREE_TIER_FIELD_TYPES;
/** @deprecated Use FreeTierFieldType instead */
export type BasicCheckFieldType = FreeTierFieldType;

/**
 * Helper functions for formatting
 */
export const formatPrice = (pence: number, currency = 'GBP'): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(pence / 100);
};

export const formatPriceShort = (pence: number): string => {
  if (pence === 0) return 'Free';
  return `£${(pence / 100).toFixed(0)}`;
};

export const isUnlimited = (limit: number): boolean => limit === -1;

export const formatLimit = (limit: number): string => {
  if (limit === -1) return 'Unlimited';
  return limit.toLocaleString();
};

/**
 * Format user limit for plan display
 * Shows "X users" for hard limits, or "X included, +£Y/user" for per-user pricing
 */
export const formatUserLimit = (plan: SubscriptionPlan, billingInterval: 'monthly' | 'annual' = 'monthly'): string => {
  // Hard cap (Free plan) - show just the number
  if (plan.max_users !== -1) {
    return `${plan.max_users} users`;
  }

  // Per-user pricing plans (Pro, Enterprise)
  const perUserPrice = billingInterval === 'monthly'
    ? plan.price_per_user_monthly_gbp
    : Math.round(plan.price_per_user_annual_gbp / 12);

  if (perUserPrice > 0) {
    return `${plan.base_users_included} included, +£${(perUserPrice / 100).toFixed(0)}/user`;
  }

  // Fallback for unlimited with no per-user cost
  return 'Unlimited users';
};

export const daysUntilTrialEnds = (trialEndsAt: string): number => {
  const trialEnd = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Transform plan to display format
 */
export const planToDisplay = (plan: SubscriptionPlan): SubscriptionPlanDisplay => {
  const annualMonthly = plan.price_annual_gbp / 12;
  const savingsPercent =
    plan.price_monthly_gbp > 0
      ? Math.round(((plan.price_monthly_gbp * 12 - plan.price_annual_gbp) / (plan.price_monthly_gbp * 12)) * 100)
      : 0;

  const hasPerUserPricing = plan.price_per_user_monthly_gbp > 0;
  const perUserAnnualMonthly = plan.price_per_user_annual_gbp / 12;

  return {
    ...plan,
    priceMonthlyFormatted: formatPrice(plan.price_monthly_gbp),
    priceAnnualFormatted: formatPrice(plan.price_annual_gbp),
    priceAnnualMonthlyFormatted: formatPrice(annualMonthly) + '/mo',
    savingsPercent,
    isUnlimitedUsers: isUnlimited(plan.max_users),
    isUnlimitedRecords: isUnlimited(plan.max_records),
    isUnlimitedReports: isUnlimited(plan.max_reports_per_month),
    isUnlimitedStorage: isUnlimited(plan.max_storage_gb),
    hasPerUserPricing,
    pricePerUserMonthlyFormatted: formatPriceShort(plan.price_per_user_monthly_gbp),
    pricePerUserAnnualMonthlyFormatted: formatPriceShort(perUserAnnualMonthly),
  };
};
