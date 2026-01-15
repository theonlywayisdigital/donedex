/**
 * Onboarding Types
 * Part of the Organisation Onboarding & Billing System
 */

import type { BillingInterval } from './billing';

/**
 * Onboarding wizard steps
 */
export type OnboardingStep =
  | 'welcome'
  | 'create_account'
  | 'organisation_details'
  | 'select_plan'
  | 'payment'
  | 'invite_team'
  | 'choose_templates'
  | 'create_first_record'
  | 'complete';

/**
 * Onboarding step display info
 */
export interface OnboardingStepInfo {
  key: OnboardingStep;
  title: string;
  subtitle: string;
  index: number;
  isRequired: boolean;
  canSkip: boolean;
}

/**
 * All onboarding steps with display info
 */
export const ONBOARDING_STEPS: OnboardingStepInfo[] = [
  {
    key: 'welcome',
    title: 'Welcome',
    subtitle: "Let's get you started",
    index: 0,
    isRequired: true,
    canSkip: false,
  },
  {
    key: 'create_account',
    title: 'Create Account',
    subtitle: 'Set up your login',
    index: 1,
    isRequired: true,
    canSkip: false,
  },
  {
    key: 'organisation_details',
    title: 'Organisation',
    subtitle: 'Tell us about your company',
    index: 2,
    isRequired: true,
    canSkip: false,
  },
  {
    key: 'select_plan',
    title: 'Choose Plan',
    subtitle: 'Pick the right plan for you',
    index: 3,
    isRequired: true,
    canSkip: false,
  },
  {
    key: 'payment',
    title: 'Payment',
    subtitle: 'Enter your payment details',
    index: 4,
    isRequired: false, // Only required for paid plans
    canSkip: true,
  },
  {
    key: 'invite_team',
    title: 'Invite Team',
    subtitle: 'Add your team members',
    index: 5,
    isRequired: false,
    canSkip: true,
  },
  {
    key: 'choose_templates',
    title: 'Templates',
    subtitle: 'Pick some starter templates',
    index: 6,
    isRequired: false,
    canSkip: true,
  },
  {
    key: 'create_first_record',
    title: 'First Record',
    subtitle: 'Add your first site or asset',
    index: 7,
    isRequired: false,
    canSkip: true,
  },
  {
    key: 'complete',
    title: 'All Done!',
    subtitle: "You're ready to go",
    index: 8,
    isRequired: true,
    canSkip: false,
  },
];

/**
 * Team member invite (during onboarding)
 */
export interface PendingInvite {
  email: string;
  role: 'admin' | 'user';
}

/**
 * Onboarding state from database
 */
export interface OnboardingStateDB {
  id: string;
  user_id: string;
  organisation_id: string | null;

  // Progress
  current_step: OnboardingStep;
  completed_steps: OnboardingStep[];

  // Organisation details
  organisation_name: string | null;
  organisation_slug: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string;

  // Plan selection
  selected_plan_id: string | null;
  billing_interval: BillingInterval | null;

  // Pending invites
  pending_invites: PendingInvite[];

  // Templates
  selected_template_ids: string[];

  // First record
  first_record_name: string | null;
  first_record_address: string | null;

  // Stripe
  stripe_checkout_session_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Onboarding state for app (UI-friendly format)
 */
export interface OnboardingState {
  // Current progress
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isComplete: boolean;

  // Organisation details form
  organisationName: string;
  organisationSlug: string;
  contactEmail: string;
  contactPhone: string;
  billingEmail: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  country: string;

  // Plan selection
  selectedPlanId: string | null;
  billingInterval: BillingInterval;

  // Team invites
  pendingInvites: PendingInvite[];

  // Templates
  selectedTemplateIds: string[];

  // First record
  firstRecordName: string;
  firstRecordAddress: string;

  // Created organisation ID (after org is created)
  organisationId: string | null;
}

/**
 * Default onboarding state
 */
export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
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
};

/**
 * Navigation param list for onboarding screens
 */
export type OnboardingStackParamList = {
  Welcome: undefined;
  CreateAccount: { skipAccount?: boolean };
  OrganisationDetails: undefined;
  SelectPlan: undefined;
  Payment: { planId: string; billingInterval: BillingInterval };
  InviteTeam: undefined;
  ChooseTemplates: undefined;
  CreateFirstRecord: undefined;
  Complete: undefined;
};

/**
 * Complete onboarding request
 */
export interface CompleteOnboardingRequest {
  organisationName: string;
  organisationSlug?: string;
  contactEmail?: string;
  billingEmail?: string;
  planId?: string;
  pendingInvites?: PendingInvite[];
  selectedTemplateIds?: string[];
}

/**
 * Complete onboarding response
 */
export interface CompleteOnboardingResponse {
  success: boolean;
  organisation_id?: string;
  error?: string;
}

/**
 * Helper to transform DB state to app state
 */
export const dbStateToAppState = (db: OnboardingStateDB): OnboardingState => ({
  currentStep: db.current_step,
  completedSteps: db.completed_steps,
  isComplete: db.completed_at !== null,

  organisationName: db.organisation_name || '',
  organisationSlug: db.organisation_slug || '',
  contactEmail: db.contact_email || '',
  contactPhone: db.contact_phone || '',
  billingEmail: db.billing_email || '',
  addressLine1: db.address_line1 || '',
  addressLine2: db.address_line2 || '',
  city: db.city || '',
  postcode: db.postcode || '',
  country: db.country || 'GB',

  selectedPlanId: db.selected_plan_id,
  billingInterval: db.billing_interval || 'monthly',

  pendingInvites: db.pending_invites || [],
  selectedTemplateIds: db.selected_template_ids || [],

  firstRecordName: db.first_record_name || '',
  firstRecordAddress: db.first_record_address || '',

  organisationId: db.organisation_id,
});

/**
 * Helper to generate slug from organisation name
 */
export const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'org';
};

/**
 * Get step info by key
 */
export const getStepInfo = (step: OnboardingStep): OnboardingStepInfo => {
  return ONBOARDING_STEPS.find((s) => s.key === step) || ONBOARDING_STEPS[0];
};

/**
 * Get next step
 */
export const getNextStep = (currentStep: OnboardingStep): OnboardingStep | null => {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.key === currentStep);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_STEPS.length - 1) {
    return null;
  }
  return ONBOARDING_STEPS[currentIndex + 1].key;
};

/**
 * Get previous step
 */
export const getPreviousStep = (currentStep: OnboardingStep): OnboardingStep | null => {
  const currentIndex = ONBOARDING_STEPS.findIndex((s) => s.key === currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return ONBOARDING_STEPS[currentIndex - 1].key;
};

/**
 * Calculate progress percentage (0-100)
 */
export const getProgressPercent = (completedSteps: OnboardingStep[]): number => {
  // Exclude welcome and complete from count
  const relevantSteps = ONBOARDING_STEPS.filter(
    (s) => s.key !== 'welcome' && s.key !== 'complete'
  );
  const completedRelevant = completedSteps.filter(
    (s) => s !== 'welcome' && s !== 'complete'
  );
  return Math.round((completedRelevant.length / relevantSteps.length) * 100);
};
