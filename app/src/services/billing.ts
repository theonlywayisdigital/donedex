/**
 * Billing Service
 * Handles subscription plans, usage limits, invoices, and Stripe integration
 */

import { supabase } from './supabase';
import type {
  SubscriptionPlan,
  OrganisationBilling,
  UsageLimits,
  Invoice,
  BillingSummary,
  CheckoutSessionResponse,
  CustomerPortalResponse,
  BillingInterval,
} from '../types/billing';

// ============================================
// SUBSCRIPTION PLANS
// ============================================

/**
 * Fetch all active subscription plans
 */
export async function fetchPlans(): Promise<{
  data: SubscriptionPlan[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching plans:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch a specific plan by ID
 */
export async function fetchPlanById(planId: string): Promise<{
  data: SubscriptionPlan | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    console.error('Error fetching plan:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch plan by slug
 */
export async function fetchPlanBySlug(slug: string): Promise<{
  data: SubscriptionPlan | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching plan by slug:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================
// ORGANISATION BILLING
// ============================================

// Type for organisation billing query result
interface OrgBillingQueryResult {
  stripe_customer_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  current_plan_id: string | null;
}

/**
 * Fetch billing status for an organisation
 */
export async function fetchBillingStatus(orgId: string): Promise<{
  data: OrganisationBilling | null;
  error: string | null;
}> {
  // First fetch organisation billing data
  const { data: orgData, error: orgError } = await supabase
    .from('organisations')
    .select(`
      stripe_customer_id,
      subscription_status,
      trial_ends_at,
      subscription_ends_at,
      current_plan_id
    `)
    .eq('id', orgId)
    .single() as unknown as { data: OrgBillingQueryResult | null; error: { message: string } | null };

  if (orgError || !orgData) {
    console.error('Error fetching organisation billing:', orgError);
    return { data: null, error: orgError?.message || 'Organisation not found' };
  }

  // Fetch plan separately if current_plan_id exists
  let currentPlan: SubscriptionPlan | null = null;
  if (orgData.current_plan_id) {
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', orgData.current_plan_id)
      .single() as unknown as { data: SubscriptionPlan | null; error: { message: string } | null };

    if (planError) {
      console.error('Error fetching current plan:', planError);
      // Don't fail entirely - just log the error and continue without plan
    } else {
      currentPlan = planData;
    }
  }

  console.log('[fetchBillingStatus] orgId:', orgId);
  console.log('[fetchBillingStatus] current_plan_id:', orgData.current_plan_id);
  console.log('[fetchBillingStatus] currentPlan:', currentPlan?.name || 'null');

  return {
    data: {
      stripe_customer_id: orgData.stripe_customer_id,
      subscription_status: (orgData.subscription_status as OrganisationBilling['subscription_status']) || 'incomplete',
      trial_ends_at: orgData.trial_ends_at,
      subscription_ends_at: orgData.subscription_ends_at,
      current_plan: currentPlan,
    },
    error: null,
  };
}

/**
 * Fetch billing summary using database function
 */
export async function fetchBillingSummary(orgId: string): Promise<{
  data: BillingSummary | null;
  error: string | null;
}> {
  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('get_billing_summary', {
    org_id: orgId,
  });

  if (error) {
    console.error('Error fetching billing summary:', error);
    return { data: null, error: error.message };
  }

  return { data: data as BillingSummary, error: null };
}

// ============================================
// USAGE LIMITS
// ============================================

/**
 * Fetch usage limits for an organisation
 */
export async function fetchUsageLimits(orgId: string): Promise<{
  data: UsageLimits | null;
  error: string | null;
}> {
  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('check_org_limits', {
    org_id: orgId,
  });

  if (error) {
    console.error('Error fetching usage limits:', error);
    return { data: null, error: error.message };
  }

  return { data: data as UsageLimits, error: null };
}

/**
 * Check if a specific action is allowed
 */
export async function canAddRecord(orgId: string): Promise<boolean> {
  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('can_add_record', {
    org_id: orgId,
  });

  if (error) {
    console.error('Error checking record limit:', error);
    return false;
  }

  return data as boolean;
}

export async function canAddReport(orgId: string): Promise<boolean> {
  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('can_add_report', {
    org_id: orgId,
  });

  if (error) {
    console.error('Error checking report limit:', error);
    return false;
  }

  return data as boolean;
}

export async function canAddUser(orgId: string): Promise<boolean> {
  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('can_add_user', {
    org_id: orgId,
  });

  if (error) {
    console.error('Error checking user limit:', error);
    return false;
  }

  return data as boolean;
}

// ============================================
// INVOICES
// ============================================

/**
 * Fetch invoices for an organisation
 */
export async function fetchInvoices(
  orgId: string,
  limit = 20
): Promise<{
  data: Invoice[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching invoices:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Fetch a specific invoice
 */
export async function fetchInvoiceById(invoiceId: string): Promise<{
  data: Invoice | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (error) {
    console.error('Error fetching invoice:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================
// STRIPE INTEGRATION
// ============================================

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  organisationId: string,
  planId: string,
  billingInterval: BillingInterval,
  successUrl?: string,
  cancelUrl?: string
): Promise<{
  data: CheckoutSessionResponse | null;
  error: string | null;
}> {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      organisationId,
      planId,
      billingInterval,
      successUrl,
      cancelUrl,
    },
  });

  if (error) {
    console.error('Error creating checkout session:', error);
    return { data: null, error: error.message };
  }

  return { data: data as CheckoutSessionResponse, error: null };
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createCustomerPortal(
  organisationId: string,
  returnUrl?: string
): Promise<{
  data: CustomerPortalResponse | null;
  error: string | null;
}> {
  const { data, error } = await supabase.functions.invoke('create-customer-portal', {
    body: {
      organisationId,
      returnUrl,
    },
  });

  if (error) {
    console.error('Error creating customer portal:', error);
    return { data: null, error: error.message };
  }

  return { data: data as CustomerPortalResponse, error: null };
}

// ============================================
// SUBSCRIPTION HISTORY
// ============================================

/**
 * Fetch subscription history for an organisation
 */
export async function fetchSubscriptionHistory(orgId: string): Promise<{
  data: unknown[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('subscription_history')
    .select(`
      *,
      subscription_plans (*)
    `)
    .eq('organisation_id', orgId)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching subscription history:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================
// FEATURE CHECKS
// ============================================

/**
 * Check if a feature is available for the organisation's plan
 */
export async function isFeatureAvailable(
  orgId: string,
  feature: string
): Promise<boolean> {
  const { data: billing } = await fetchBillingStatus(orgId);

  if (!billing?.current_plan) {
    return false;
  }

  const plan = billing.current_plan;

  switch (feature) {
    case 'ai_templates':
      return plan.feature_ai_templates;
    case 'pdf_export':
      return plan.feature_pdf_export;
    case 'api_access':
      return plan.feature_api_access;
    case 'custom_branding':
      return plan.feature_custom_branding;
    case 'priority_support':
      return plan.feature_priority_support;
    case 'white_label':
      return plan.feature_white_label;
    case 'advanced_analytics':
      return plan.feature_advanced_analytics;
    default:
      return false;
  }
}

/**
 * Get warning threshold for usage limits (80% by default)
 */
export function getUsageWarningThreshold(): number {
  return 80;
}

/**
 * Check if usage is at warning level
 */
export function isAtWarningLevel(current: number, limit: number): boolean {
  if (limit === -1) return false; // Unlimited
  const percent = (current / limit) * 100;
  return percent >= getUsageWarningThreshold();
}

/**
 * Calculate days until trial ends
 */
export function daysUntilTrialEnds(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;

  const trialEnd = new Date(trialEndsAt);
  const now = new Date();
  const diffTime = trialEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays > 0 ? diffDays : 0;
}
