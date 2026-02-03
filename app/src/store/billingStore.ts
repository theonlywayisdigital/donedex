/**
 * Billing Store
 * Manages subscription, usage limits, and billing data with Zustand
 */

import { create } from 'zustand';
import * as billingService from '../services/billing';
import type {
  SubscriptionPlan,
  SubscriptionPlanDisplay,
  OrganisationBilling,
  UsageLimits,
  Invoice,
  BillingSummary,
  BillingInterval,
  PlanFeature,
  StorageAddOn,
} from '../types/billing';
import {
  planToDisplay,
  formatPrice,
  isUnlimited,
  daysUntilTrialEnds,
  FREE_TIER_FIELD_TYPES,
  FREE_TIER_CATEGORIES,
} from '../types/billing';

interface BillingStoreState {
  // Data
  billing: OrganisationBilling | null;
  usage: UsageLimits | null;
  plans: SubscriptionPlan[];
  invoices: Invoice[];
  summary: BillingSummary | null;
  storageAddOn: StorageAddOn | null;

  // Loading states
  isLoading: boolean;
  isLoadingPlans: boolean;
  isLoadingUsage: boolean;
  isLoadingInvoices: boolean;
  isLoadingStorageAddOn: boolean;
  error: string | null;

  // Current organisation ID
  organisationId: string | null;

  // Computed getters
  currentPlan: SubscriptionPlan | null;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  isPastDue: boolean;
  isCanceled: boolean;
  hasBilling: boolean;

  // Actions
  setOrganisationId: (orgId: string | null) => void;
  loadAll: (orgId?: string) => Promise<void>;
  loadBilling: (orgId?: string) => Promise<void>;
  loadUsage: (orgId?: string) => Promise<void>;
  loadPlans: () => Promise<void>;
  loadInvoices: (orgId?: string) => Promise<void>;
  loadSummary: (orgId?: string) => Promise<void>;

  // Feature checks
  isFeatureAvailable: (feature: PlanFeature) => boolean;
  canAddUser: () => boolean;
  canAddRecord: () => boolean;
  canGenerateReport: () => boolean;
  isAtUsageWarning: (type: 'users' | 'records' | 'reports' | 'storage') => boolean;

  // Free plan feature gating
  isFieldTypeAllowed: (fieldType: string) => boolean;
  isCategoryAllowed: (categoryKey: string) => boolean;
  canUsePhotos: () => boolean;
  canUseStarterTemplates: () => boolean;
  canUseAITemplates: () => boolean;
  canUseCustomBranding: () => boolean;
  isOnFreePlan: () => boolean;

  // Storage add-on
  loadStorageAddOn: (orgId?: string) => Promise<void>;
  purchaseStorageAddOn: (quantityBlocks: number, successUrl?: string, cancelUrl?: string) => Promise<{ url: string | null; error: string | null }>;
  getTotalStorageGb: () => number;
  getAddonStorageGb: () => number;

  // Checkout
  createCheckoutSession: (
    planId: string,
    billingInterval: BillingInterval,
    options?: { userCount?: number; successUrl?: string; cancelUrl?: string }
  ) => Promise<{ url: string | null; error: string | null }>;
  openCustomerPortal: (returnUrl?: string) => Promise<{ url: string | null; error: string | null }>;

  // Display helpers
  getPlansForDisplay: () => SubscriptionPlanDisplay[];
  getCurrentPlanDisplay: () => SubscriptionPlanDisplay | null;

  // Reset
  reset: () => void;
}

export const useBillingStore = create<BillingStoreState>((set, get) => ({
  // Initial state
  billing: null,
  usage: null,
  plans: [],
  invoices: [],
  summary: null,
  storageAddOn: null,

  isLoading: false,
  isLoadingPlans: false,
  isLoadingUsage: false,
  isLoadingInvoices: false,
  isLoadingStorageAddOn: false,
  error: null,

  organisationId: null,

  // Computed getters
  get currentPlan() {
    return get().billing?.current_plan || null;
  },
  get isTrialing() {
    return get().billing?.subscription_status === 'trialing';
  },
  get trialDaysRemaining() {
    const trialEnd = get().billing?.trial_ends_at;
    return trialEnd ? daysUntilTrialEnds(trialEnd) : null;
  },
  get isPastDue() {
    return get().billing?.subscription_status === 'past_due';
  },
  get isCanceled() {
    return get().billing?.subscription_status === 'canceled';
  },
  get hasBilling() {
    return get().billing?.stripe_customer_id !== null;
  },

  // Set organisation ID
  setOrganisationId: (orgId) => {
    set({ organisationId: orgId });
  },

  // Load all billing data
  loadAll: async (orgId) => {
    const targetOrgId = orgId || get().organisationId;
    if (!targetOrgId) return;

    set({ isLoading: true, error: null, organisationId: targetOrgId });

    await Promise.all([
      get().loadPlans(),
      get().loadBilling(targetOrgId),
      get().loadUsage(targetOrgId),
      get().loadInvoices(targetOrgId),
      get().loadStorageAddOn(targetOrgId),
    ]);

    set({ isLoading: false });
  },

  // Load billing status
  loadBilling: async (orgId) => {
    const targetOrgId = orgId || get().organisationId;
    if (!targetOrgId) return;

    try {
      const { data, error } = await billingService.fetchBillingStatus(targetOrgId);

      if (error) {
        set({ error });
        return;
      }

      set({ billing: data });
    } catch (err) {
      console.error('Error loading billing:', err);
      set({ error: 'Failed to load billing status' });
    }
  },

  // Load usage limits
  loadUsage: async (orgId) => {
    const targetOrgId = orgId || get().organisationId;
    if (!targetOrgId) return;

    set({ isLoadingUsage: true });

    try {
      const { data, error } = await billingService.fetchUsageLimits(targetOrgId);

      if (error) {
        set({ error, isLoadingUsage: false });
        return;
      }

      set({ usage: data, isLoadingUsage: false });
    } catch (err) {
      console.error('Error loading usage:', err);
      set({ error: 'Failed to load usage limits', isLoadingUsage: false });
    }
  },

  // Load plans
  loadPlans: async () => {
    set({ isLoadingPlans: true });

    try {
      const { data, error } = await billingService.fetchPlans();

      if (error) {
        set({ error, isLoadingPlans: false });
        return;
      }

      set({ plans: data || [], isLoadingPlans: false });
    } catch (err) {
      console.error('Error loading plans:', err);
      set({ error: 'Failed to load plans', isLoadingPlans: false });
    }
  },

  // Load invoices
  loadInvoices: async (orgId) => {
    const targetOrgId = orgId || get().organisationId;
    if (!targetOrgId) return;

    set({ isLoadingInvoices: true });

    try {
      const { data, error } = await billingService.fetchInvoices(targetOrgId);

      if (error) {
        set({ error, isLoadingInvoices: false });
        return;
      }

      set({ invoices: data || [], isLoadingInvoices: false });
    } catch (err) {
      console.error('Error loading invoices:', err);
      set({ error: 'Failed to load invoices', isLoadingInvoices: false });
    }
  },

  // Load summary
  loadSummary: async (orgId) => {
    const targetOrgId = orgId || get().organisationId;
    if (!targetOrgId) return;

    try {
      const { data, error } = await billingService.fetchBillingSummary(targetOrgId);

      if (error) {
        set({ error });
        return;
      }

      set({ summary: data });
    } catch (err) {
      console.error('Error loading summary:', err);
      set({ error: 'Failed to load billing summary' });
    }
  },

  // Feature checks
  isFeatureAvailable: (feature) => {
    const plan = get().billing?.current_plan;
    if (!plan) return false;

    return plan[feature] === true;
  },

  canAddUser: () => {
    const usage = get().usage;
    if (!usage) return true;
    return !usage.users.exceeded;
  },

  canAddRecord: () => {
    const usage = get().usage;
    if (!usage) return true;
    return !usage.records.exceeded;
  },

  canGenerateReport: () => {
    const usage = get().usage;
    if (!usage) return true;
    return !usage.reports.exceeded;
  },

  isAtUsageWarning: (type) => {
    const usage = get().usage;
    if (!usage) return false;

    const data = usage[type];
    if (!data || data.limit === -1) return false;

    return data.percent >= billingService.getUsageWarningThreshold();
  },

  // Free plan feature gating
  isOnFreePlan: () => {
    const plan = get().billing?.current_plan;
    if (!plan) return true; // Default to free plan restrictions if no plan
    return plan.slug === 'free';
  },

  isFieldTypeAllowed: (fieldType: string) => {
    // If user has feature_all_field_types, allow all types
    if (get().isFeatureAvailable('feature_all_field_types')) {
      return true;
    }
    // Check plan's allowed_field_categories if available
    const plan = get().billing?.current_plan;
    if (plan?.allowed_field_categories?.length) {
      // Field type allowed if it's in the FREE_TIER_FIELD_TYPES
      // (plan categories are checked at the category level)
      return FREE_TIER_FIELD_TYPES.includes(fieldType as typeof FREE_TIER_FIELD_TYPES[number]);
    }
    // Default: only free tier field types
    return FREE_TIER_FIELD_TYPES.includes(fieldType as typeof FREE_TIER_FIELD_TYPES[number]);
  },

  isCategoryAllowed: (categoryKey: string) => {
    // If user has feature_all_field_types, allow all categories
    if (get().isFeatureAvailable('feature_all_field_types')) {
      return true;
    }
    // Check plan's allowed_field_categories if available
    const plan = get().billing?.current_plan;
    if (plan?.allowed_field_categories?.length) {
      return plan.allowed_field_categories.includes(categoryKey);
    }
    // Default: only free tier categories (basic + evidence)
    return FREE_TIER_CATEGORIES.includes(categoryKey as typeof FREE_TIER_CATEGORIES[number]);
  },

  canUsePhotos: () => {
    return get().isFeatureAvailable('feature_photos');
  },

  canUseStarterTemplates: () => {
    return get().isFeatureAvailable('feature_starter_templates');
  },

  canUseAITemplates: () => {
    return get().isFeatureAvailable('feature_ai_templates');
  },

  canUseCustomBranding: () => {
    return get().isFeatureAvailable('feature_custom_branding');
  },

  // Storage add-on
  loadStorageAddOn: async (orgId) => {
    const targetOrgId = orgId || get().organisationId;
    if (!targetOrgId) return;

    set({ isLoadingStorageAddOn: true });

    try {
      const { data, error } = await billingService.fetchStorageAddOn(targetOrgId);

      if (error) {
        set({ error, isLoadingStorageAddOn: false });
        return;
      }

      set({ storageAddOn: data, isLoadingStorageAddOn: false });
    } catch (err) {
      console.error('Error loading storage add-on:', err);
      set({ error: 'Failed to load storage add-on', isLoadingStorageAddOn: false });
    }
  },

  purchaseStorageAddOn: async (quantityBlocks, successUrl, cancelUrl) => {
    const orgId = get().organisationId;
    if (!orgId) {
      return { url: null, error: 'No organisation selected' };
    }

    const { data, error } = await billingService.purchaseStorageAddOn(
      orgId,
      quantityBlocks,
      successUrl,
      cancelUrl
    );

    if (error || !data) {
      return { url: null, error: error || 'Failed to purchase storage add-on' };
    }

    return { url: data.url, error: null };
  },

  getTotalStorageGb: () => {
    const plan = get().billing?.current_plan;
    const addon = get().storageAddOn;
    const baseGb = plan?.max_storage_gb ?? 1;
    if (baseGb === -1) return -1; // unlimited
    const addonGb = addon?.is_active ? addon.quantity_blocks * addon.block_size_gb : 0;
    return baseGb + addonGb;
  },

  getAddonStorageGb: () => {
    const addon = get().storageAddOn;
    if (!addon?.is_active) return 0;
    return addon.quantity_blocks * addon.block_size_gb;
  },

  // Create checkout session
  createCheckoutSession: async (planId, billingInterval, options) => {
    const orgId = get().organisationId;
    if (!orgId) {
      return { url: null, error: 'No organisation selected' };
    }

    const { data, error } = await billingService.createCheckoutSession(
      orgId,
      planId,
      billingInterval,
      options
    );

    if (error || !data) {
      return { url: null, error: error || 'Failed to create checkout session' };
    }

    return { url: data.url, error: null };
  },

  // Open customer portal
  openCustomerPortal: async (returnUrl) => {
    const orgId = get().organisationId;
    if (!orgId) {
      return { url: null, error: 'No organisation selected' };
    }

    const { data, error } = await billingService.createCustomerPortal(orgId, returnUrl);

    if (error || !data) {
      return { url: null, error: error || 'Failed to create customer portal session' };
    }

    return { url: data.url, error: null };
  },

  // Display helpers
  getPlansForDisplay: () => {
    return get().plans.map(planToDisplay);
  },

  getCurrentPlanDisplay: () => {
    const plan = get().currentPlan;
    return plan ? planToDisplay(plan) : null;
  },

  // Reset
  reset: () => {
    set({
      billing: null,
      usage: null,
      plans: [],
      invoices: [],
      summary: null,
      storageAddOn: null,
      isLoading: false,
      isLoadingPlans: false,
      isLoadingUsage: false,
      isLoadingInvoices: false,
      isLoadingStorageAddOn: false,
      error: null,
      organisationId: null,
    });
  },
}));
