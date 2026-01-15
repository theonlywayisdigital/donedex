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
 * Basic field types available on Free plan
 */
export const BASIC_CHECK_FIELD_TYPES = [
  'pass_fail',
  'yes_no',
  'condition',
  'severity',
  'text',
  'number',
  'select',
  'multi_select',
] as const;

export type BasicCheckFieldType = typeof BASIC_CHECK_FIELD_TYPES[number];

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
  };
};
