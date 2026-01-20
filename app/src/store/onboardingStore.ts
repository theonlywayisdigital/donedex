/**
 * Onboarding Store
 * Manages onboarding wizard state with Zustand
 */

import { create } from 'zustand';
import * as onboardingService from '../services/onboarding';
import type {
  OnboardingState,
  OnboardingStep,
  PendingInvite,
  OnboardingStateDB,
} from '../types/onboarding';
import {
  DEFAULT_ONBOARDING_STATE,
  dbStateToAppState,
  getNextStep,
  getPreviousStep,
  getProgressPercent,
  generateSlug,
} from '../types/onboarding';
import type { BillingInterval } from '../types/billing';

interface OnboardingStoreState extends OnboardingState {
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Computed
  needsOnboarding: boolean;
  progressPercent: number;
  canGoBack: boolean;
  canGoNext: boolean;

  // Actions
  initialize: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;

  // Step navigation
  goToStep: (step: OnboardingStep) => Promise<void>;
  goNext: () => Promise<void>;
  goBack: () => Promise<void>;
  completeCurrentStep: () => Promise<void>;

  // Data updates
  setOrganisationDetails: (details: {
    organisationName: string;
    contactEmail?: string;
    contactPhone?: string;
    billingEmail?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  }) => void;
  setPlanSelection: (planId: string, billingInterval: BillingInterval) => void;
  addInvite: (email: string, role: 'admin' | 'user') => void;
  removeInvite: (email: string) => void;
  setSelectedTemplates: (templateIds: string[]) => void;
  setFirstRecord: (name: string, address: string) => void;

  // Complete onboarding
  completeOnboarding: () => Promise<{ organisationId: string | null; error: string | null }>;

  // Reset
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingStoreState>((set, get) => ({
  // Initial state from defaults
  ...{
    currentStep: 'welcome',
    completedSteps: [],
    isComplete: false,
    organisationName: '',
    organisationSlug: '',
    contactEmail: '',
    contactPhone: '',
    billingEmail: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    country: 'GB',
    selectedPlanId: null,
    billingInterval: 'monthly',
    pendingInvites: [],
    selectedTemplateIds: [],
    firstRecordName: '',
    firstRecordAddress: '',
    organisationId: null,
  } as OnboardingState,

  // Loading states
  isLoading: false,
  isSaving: false,
  error: null,

  // Computed getters
  get needsOnboarding() {
    const state = get();
    return !state.isComplete && !state.organisationId;
  },
  get progressPercent() {
    return getProgressPercent(get().completedSteps);
  },
  get canGoBack() {
    return getPreviousStep(get().currentStep) !== null;
  },
  get canGoNext() {
    return getNextStep(get().currentStep) !== null;
  },

  // Initialize
  initialize: async () => {
    const { needsOnboarding } = await onboardingService.checkNeedsOnboarding();

    if (!needsOnboarding) {
      set({ isComplete: true, needsOnboarding: false });
      return;
    }

    await get().loadFromServer();
  },

  // Load state from server
  loadFromServer: async () => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await onboardingService.fetchOnboardingState();

      if (error) {
        set({ error, isLoading: false });
        return;
      }

      if (data) {
        // Transform DB state to app state
        const appState: OnboardingState = {
          currentStep: data.current_step,
          completedSteps: data.completed_steps || [],
          isComplete: data.completed_at !== null,
          organisationName: data.organisation_name || '',
          organisationSlug: data.organisation_slug || '',
          contactEmail: data.contact_email || '',
          contactPhone: data.contact_phone || '',
          billingEmail: data.billing_email || '',
          addressLine1: data.address_line1 || '',
          addressLine2: data.address_line2 || '',
          city: data.city || '',
          postcode: data.postcode || '',
          country: data.country || 'GB',
          selectedPlanId: data.selected_plan_id,
          billingInterval: data.billing_interval || 'monthly',
          pendingInvites: data.pending_invites || [],
          selectedTemplateIds: data.selected_template_ids || [],
          firstRecordName: data.first_record_name || '',
          firstRecordAddress: data.first_record_address || '',
          organisationId: data.organisation_id,
        };

        set({ ...appState, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (err) {
      console.error('Error loading onboarding state:', err);
      set({ error: 'Failed to load onboarding state', isLoading: false });
    }
  },

  // Save state to server
  saveToServer: async () => {
    const state = get();
    set({ isSaving: true, error: null });

    try {
      const { error } = await onboardingService.updateOnboardingState({
        current_step: state.currentStep,
        completed_steps: state.completedSteps,
        organisation_name: state.organisationName || null,
        organisation_slug: state.organisationSlug || null,
        contact_email: state.contactEmail || null,
        contact_phone: state.contactPhone || null,
        billing_email: state.billingEmail || null,
        address_line1: state.addressLine1 || null,
        address_line2: state.addressLine2 || null,
        city: state.city || null,
        postcode: state.postcode || null,
        country: state.country || 'GB',
        selected_plan_id: state.selectedPlanId,
        billing_interval: state.billingInterval,
        pending_invites: state.pendingInvites,
        selected_template_ids: state.selectedTemplateIds,
        first_record_name: state.firstRecordName || null,
        first_record_address: state.firstRecordAddress || null,
      });

      if (error) {
        set({ error, isSaving: false });
        return;
      }

      set({ isSaving: false });
    } catch (err) {
      console.error('Error saving onboarding state:', err);
      set({ error: 'Failed to save onboarding state', isSaving: false });
    }
  },

  // Step navigation
  goToStep: async (step: OnboardingStep) => {
    set({ currentStep: step });
    await get().saveToServer();
  },

  goNext: async () => {
    const next = getNextStep(get().currentStep);
    if (next) {
      await get().goToStep(next);
    }
  },

  goBack: async () => {
    const prev = getPreviousStep(get().currentStep);
    if (prev) {
      await get().goToStep(prev);
    }
  },

  completeCurrentStep: async () => {
    const { currentStep, completedSteps } = get();

    if (!completedSteps.includes(currentStep)) {
      set({ completedSteps: [...completedSteps, currentStep] });
    }

    await get().saveToServer();
    await get().goNext();
  },

  // Data updates
  setOrganisationDetails: (details) => {
    const slug = details.organisationName
      ? generateSlug(details.organisationName)
      : '';

    // contactEmail is optional - will use user's auth email if not provided
    const contactEmail = details.contactEmail || get().contactEmail;

    set({
      organisationName: details.organisationName,
      organisationSlug: slug,
      contactEmail: contactEmail,
      contactPhone: details.contactPhone || '',
      billingEmail: details.billingEmail || contactEmail,
      addressLine1: details.addressLine1 || '',
      addressLine2: details.addressLine2 || '',
      city: details.city || '',
      postcode: details.postcode || '',
      country: details.country || 'GB',
    });
  },

  setPlanSelection: (planId, billingInterval) => {
    set({ selectedPlanId: planId, billingInterval });
  },

  addInvite: (email, role) => {
    const { pendingInvites } = get();

    // Check if already exists
    if (pendingInvites.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
      return;
    }

    set({ pendingInvites: [...pendingInvites, { email, role }] });
  },

  removeInvite: (email) => {
    const { pendingInvites } = get();
    set({
      pendingInvites: pendingInvites.filter(
        (i) => i.email.toLowerCase() !== email.toLowerCase()
      ),
    });
  },

  setSelectedTemplates: (templateIds) => {
    set({ selectedTemplateIds: templateIds });
  },

  setFirstRecord: (name, address) => {
    set({ firstRecordName: name, firstRecordAddress: address });
  },

  // Complete onboarding
  completeOnboarding: async () => {
    const state = get();
    set({ isSaving: true, error: null });

    try {
      const result = await onboardingService.completeOnboarding({
        organisationName: state.organisationName,
        organisationSlug: state.organisationSlug,
        contactEmail: state.contactEmail,
        billingEmail: state.billingEmail,
        planId: state.selectedPlanId || undefined,
        pendingInvites: state.pendingInvites,
        selectedTemplateIds: state.selectedTemplateIds,
      });

      if (!result.success) {
        set({ error: result.error || 'Failed to complete onboarding', isSaving: false });
        return { organisationId: null, error: result.error || 'Failed to complete onboarding' };
      }

      set({
        organisationId: result.organisation_id || null,
        isComplete: true,
        currentStep: 'complete',
        completedSteps: [...state.completedSteps, 'complete'],
        isSaving: false,
      });

      return { organisationId: result.organisation_id || null, error: null };
    } catch (err) {
      console.error('Error completing onboarding:', err);
      const errorMsg = 'Failed to complete onboarding';
      set({ error: errorMsg, isSaving: false });
      return { organisationId: null, error: errorMsg };
    }
  },

  // Reset
  reset: () => {
    set({
      currentStep: 'welcome',
      completedSteps: [],
      isComplete: false,
      organisationName: '',
      organisationSlug: '',
      contactEmail: '',
      contactPhone: '',
      billingEmail: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postcode: '',
      country: 'GB',
      selectedPlanId: null,
      billingInterval: 'monthly',
      pendingInvites: [],
      selectedTemplateIds: [],
      firstRecordName: '',
      firstRecordAddress: '',
      organisationId: null,
      isLoading: false,
      isSaving: false,
      error: null,
    });
  },
}));
