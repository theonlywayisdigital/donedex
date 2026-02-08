/**
 * Billing Service
 * Handles subscription plans, usage limits, invoices
 *
 * Migrated to Firebase/Firestore
 * Note: Stripe integration will need to be handled via Firebase Cloud Functions
 */

import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { collections } from './firestore';

// Cloud Function URL
const CLOUD_FUNCTION_BASE_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL ||
  'https://europe-west2-donedex-72116.cloudfunctions.net';
import type {
  SubscriptionPlan,
  OrganisationBilling,
  UsageLimits,
  Invoice,
  BillingSummary,
  CheckoutSessionResponse,
  CustomerPortalResponse,
  BillingInterval,
  StorageAddOn,
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
  try {
    // Simplified query to avoid composite index requirement
    // Filter and sort client-side since there are only a few plans
    const plansRef = collection(db, collections.subscriptionPlans);
    const snapshot = await getDocs(plansRef);

    const plans: SubscriptionPlan[] = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as SubscriptionPlan))
      .filter(plan => plan.is_active && plan.is_public)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    return { data: plans, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch plans';
    return { data: null, error: message };
  }
}

/**
 * Fetch a specific plan by ID
 */
export async function fetchPlanById(planId: string): Promise<{
  data: SubscriptionPlan | null;
  error: string | null;
}> {
  try {
    const planRef = doc(db, collections.subscriptionPlans, planId);
    const planSnap = await getDoc(planRef);

    if (!planSnap.exists()) {
      return { data: null, error: 'Plan not found' };
    }

    return { data: { id: planSnap.id, ...planSnap.data() } as SubscriptionPlan, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch plan';
    return { data: null, error: message };
  }
}

/**
 * Fetch plan by slug
 */
export async function fetchPlanBySlug(slug: string): Promise<{
  data: SubscriptionPlan | null;
  error: string | null;
}> {
  try {
    const plansQuery = query(
      collection(db, collections.subscriptionPlans),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(plansQuery);

    if (snapshot.empty) {
      return { data: null, error: 'Plan not found' };
    }

    const planDoc = snapshot.docs[0];
    return { data: { id: planDoc.id, ...planDoc.data() } as SubscriptionPlan, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch plan by slug';
    return { data: null, error: message };
  }
}

// ============================================
// ORGANISATION BILLING
// ============================================

/**
 * Fetch billing status for an organisation
 */
export async function fetchBillingStatus(orgId: string): Promise<{
  data: OrganisationBilling | null;
  error: string | null;
}> {
  try {
    const orgRef = doc(db, collections.organisations, orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      return { data: null, error: 'Organisation not found' };
    }

    const orgData = orgSnap.data();

    // Fetch plan separately if current_plan_id exists
    let currentPlan: SubscriptionPlan | null = null;
    if (orgData.current_plan_id) {
      const planRef = doc(db, collections.subscriptionPlans, orgData.current_plan_id);
      const planSnap = await getDoc(planRef);
      if (planSnap.exists()) {
        currentPlan = { id: planSnap.id, ...planSnap.data() } as SubscriptionPlan;
      }
    }

    return {
      data: {
        stripe_customer_id: orgData.stripe_customer_id || null,
        subscription_status: orgData.subscription_status || 'incomplete',
        trial_ends_at: orgData.trial_ends_at || null,
        subscription_ends_at: orgData.subscription_ends_at || null,
        current_plan: currentPlan,
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch billing status';
    return { data: null, error: message };
  }
}

/**
 * Fetch billing summary
 * Note: This was previously an RPC call - now computed client-side
 */
export async function fetchBillingSummary(orgId: string): Promise<{
  data: BillingSummary | null;
  error: string | null;
}> {
  try {
    const billing = await fetchBillingStatus(orgId);
    if (billing.error || !billing.data) {
      return { data: null, error: billing.error || 'Failed to fetch billing' };
    }

    const usage = await fetchUsageLimits(orgId);

    const billingData = billing.data;
    const plan = billingData.current_plan;

    return {
      data: {
        has_billing: !!billingData.stripe_customer_id,
        subscription_status: billingData.subscription_status,
        is_trialing: billingData.subscription_status === 'trialing',
        trial_ends_at: billingData.trial_ends_at,
        subscription_ends_at: billingData.subscription_ends_at,
        current_plan: plan ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          price_monthly_gbp: plan.price_monthly_gbp,
          price_annual_gbp: plan.price_annual_gbp,
          price_per_user_monthly_gbp: plan.price_per_user_monthly_gbp,
          price_per_user_annual_gbp: plan.price_per_user_annual_gbp,
          base_users_included: plan.base_users_included,
        } : null,
        latest_invoice: null, // Would need to fetch from invoices collection
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch billing summary';
    return { data: null, error: message };
  }
}

// ============================================
// USAGE LIMITS
// ============================================

/**
 * Fetch usage limits for an organisation
 * Note: This was previously an RPC call - now computed client-side
 */
export async function fetchUsageLimits(orgId: string): Promise<{
  data: UsageLimits | null;
  error: string | null;
}> {
  try {
    // Fetch billing status to get plan limits
    const billing = await fetchBillingStatus(orgId);
    if (!billing.data?.current_plan) {
      return { data: null, error: 'No active plan' };
    }

    const plan = billing.data.current_plan;

    // Count current usage
    const recordsQuery = query(
      collection(db, collections.records),
      where('organisation_id', '==', orgId),
      where('archived', '==', false)
    );
    const recordsSnap = await getDocs(recordsQuery);
    const recordCount = recordsSnap.size;

    const reportsQuery = query(
      collection(db, collections.reports),
      where('organisation_id', '==', orgId)
    );
    const reportsSnap = await getDocs(reportsQuery);
    const reportCount = reportsSnap.size;

    const usersQuery = query(
      collection(db, collections.users),
      where('organisation_id', '==', orgId)
    );
    const usersSnap = await getDocs(usersQuery);
    const userCount = usersSnap.size;

    // Helper to compute percent and exceeded
    const computeUsage = (current: number, limit: number) => ({
      current,
      limit,
      exceeded: limit !== -1 && current >= limit,
      percent: limit === -1 ? 0 : Math.round((current / limit) * 100),
    });

    return {
      data: {
        records: computeUsage(recordCount, plan.max_records),
        reports: computeUsage(reportCount, plan.max_reports_per_month),
        users: computeUsage(userCount, plan.max_users),
        storage: {
          ...computeUsage(0, plan.max_storage_gb * 1024 * 1024 * 1024),
          current_bytes: 0,
          current_gb: 0,
          limit_gb: plan.max_storage_gb,
          base_limit_gb: plan.max_storage_gb,
          addon_gb: 0,
        },
        plan: {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
        },
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch usage limits';
    return { data: null, error: message };
  }
}

/**
 * Check if a specific action is allowed
 */
export async function canAddRecord(orgId: string): Promise<boolean> {
  try {
    const limits = await fetchUsageLimits(orgId);
    return limits.data?.records ? !limits.data.records.exceeded : false;
  } catch {
    return false;
  }
}

export async function canAddReport(orgId: string): Promise<boolean> {
  try {
    const limits = await fetchUsageLimits(orgId);
    return limits.data?.reports ? !limits.data.reports.exceeded : false;
  } catch {
    return false;
  }
}

export async function canAddUser(orgId: string): Promise<boolean> {
  try {
    const limits = await fetchUsageLimits(orgId);
    return limits.data?.users ? !limits.data.users.exceeded : false;
  } catch {
    return false;
  }
}

// ============================================
// INVOICES
// ============================================

/**
 * Fetch invoices for an organisation
 */
export async function fetchInvoices(
  orgId: string,
  maxResults = 20
): Promise<{
  data: Invoice[] | null;
  error: string | null;
}> {
  try {
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('organisation_id', '==', orgId),
      orderBy('created_at', 'desc'),
      firestoreLimit(maxResults)
    );
    const snapshot = await getDocs(invoicesQuery);

    const invoices: Invoice[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Invoice));

    return { data: invoices, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch invoices';
    return { data: null, error: message };
  }
}

/**
 * Fetch a specific invoice
 */
export async function fetchInvoiceById(invoiceId: string): Promise<{
  data: Invoice | null;
  error: string | null;
}> {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      return { data: null, error: 'Invoice not found' };
    }

    return { data: { id: invoiceSnap.id, ...invoiceSnap.data() } as Invoice, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch invoice';
    return { data: null, error: message };
  }
}

// ============================================
// STRIPE INTEGRATION
// Note: These will need Firebase Cloud Functions to be implemented
// ============================================

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  organisationId: string,
  planId: string,
  billingInterval: BillingInterval,
  options?: {
    userCount?: number;
    successUrl?: string;
    cancelUrl?: string;
  }
): Promise<{
  data: CheckoutSessionResponse | null;
  error: string | null;
}> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/createCheckoutSessionHttp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        organisationId,
        planId,
        billingInterval,
        userCount: options?.userCount,
        successUrl: options?.successUrl,
        cancelUrl: options?.cancelUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create checkout session' }));
      return { data: null, error: errorData.error || 'Failed to create checkout session' };
    }

    const data = await response.json();
    return { data: data as CheckoutSessionResponse, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    return { data: null, error: message };
  }
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
  try {
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/createCustomerPortalHttp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        organisationId,
        returnUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create customer portal session' }));
      return { data: null, error: errorData.error || 'Failed to create customer portal session' };
    }

    const data = await response.json();
    return { data: data as CustomerPortalResponse, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create customer portal session';
    return { data: null, error: message };
  }
}

// ============================================
// STORAGE ADD-ONS
// ============================================

/**
 * Fetch active storage add-on for an organisation
 */
export async function fetchStorageAddOn(orgId: string): Promise<{
  data: StorageAddOn | null;
  error: string | null;
}> {
  try {
    const addonsQuery = query(
      collection(db, 'storage_addons'),
      where('organisation_id', '==', orgId),
      where('is_active', '==', true)
    );
    const snapshot = await getDocs(addonsQuery);

    if (snapshot.empty) {
      return { data: null, error: null };
    }

    const addonDoc = snapshot.docs[0];
    return { data: { id: addonDoc.id, ...addonDoc.data() } as StorageAddOn, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch storage add-on';
    return { data: null, error: message };
  }
}

/**
 * Purchase storage add-on blocks via Stripe checkout
 */
export async function purchaseStorageAddOn(
  organisationId: string,
  quantityBlocks: number,
  successUrl?: string,
  cancelUrl?: string
): Promise<{
  data: CheckoutSessionResponse | null;
  error: string | null;
}> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: 'Not authenticated' };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/createCheckoutSessionHttp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        organisationId,
        type: 'storage_addon',
        storageBlocks: quantityBlocks,
        successUrl,
        cancelUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to create storage add-on checkout' }));
      return { data: null, error: errorData.error || 'Failed to create storage add-on checkout' };
    }

    const data = await response.json();
    return { data: data as CheckoutSessionResponse, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to purchase storage add-on';
    return { data: null, error: message };
  }
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
  try {
    const historyQuery = query(
      collection(db, 'subscription_history'),
      where('organisation_id', '==', orgId),
      orderBy('started_at', 'desc')
    );
    const snapshot = await getDocs(historyQuery);

    const history: unknown[] = [];

    for (const historyDoc of snapshot.docs) {
      const data = historyDoc.data();

      // Fetch plan details
      let plan = null;
      if (data.plan_id) {
        const planRef = doc(db, collections.subscriptionPlans, data.plan_id);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          plan = { id: planSnap.id, ...planSnap.data() };
        }
      }

      history.push({
        id: historyDoc.id,
        ...data,
        subscription_plans: plan,
      });
    }

    return { data: history, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch subscription history';
    return { data: null, error: message };
  }
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
  try {
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
  } catch {
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
