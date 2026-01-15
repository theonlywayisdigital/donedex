/**
 * Onboarding Service
 * Handles onboarding wizard state and organisation creation
 */

import { supabase } from './supabase';
import type {
  OnboardingStateDB,
  OnboardingState,
  OnboardingStep,
  PendingInvite,
  CompleteOnboardingRequest,
  CompleteOnboardingResponse,
} from '../types/onboarding';
import type { BillingInterval } from '../types/billing';

// ============================================
// ONBOARDING STATE
// ============================================

/**
 * Check if current user needs onboarding
 */
export async function checkNeedsOnboarding(): Promise<{
  needsOnboarding: boolean;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { needsOnboarding: false, error: 'Not authenticated' };
  }

  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('needs_onboarding', {
    user_id_param: user.id,
  });

  if (error) {
    console.error('Error checking onboarding status:', error);
    return { needsOnboarding: false, error: error.message };
  }

  return { needsOnboarding: data as boolean, error: null };
}

/**
 * Get or create onboarding state for current user
 */
export async function getOrCreateOnboardingState(): Promise<{
  data: OnboardingStateDB | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_or_create_onboarding_state');

  if (error) {
    console.error('Error getting onboarding state:', error);
    return { data: null, error: error.message };
  }

  return { data: data as OnboardingStateDB, error: null };
}

/**
 * Fetch current onboarding state
 */
export async function fetchOnboardingState(): Promise<{
  data: OnboardingStateDB | null;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('onboarding_state')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // Not found is OK - will create on first save
    if (error.code === 'PGRST116') {
      return { data: null, error: null };
    }
    console.error('Error fetching onboarding state:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update onboarding state
 */
export async function updateOnboardingState(
  updates: Partial<OnboardingStateDB>
): Promise<{
  data: OnboardingStateDB | null;
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  // First ensure state exists
  await getOrCreateOnboardingState();

  // Use type assertion since Supabase types may not include all columns
  const { data, error } = await (supabase
    .from('onboarding_state') as any)
    .update(updates)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating onboarding state:', error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Update current step
 */
export async function updateCurrentStep(step: OnboardingStep): Promise<{
  error: string | null;
}> {
  const { error } = await updateOnboardingState({
    current_step: step,
  });

  return { error };
}

/**
 * Mark step as completed
 */
export async function completeStep(step: OnboardingStep): Promise<{
  error: string | null;
}> {
  const { data: current } = await fetchOnboardingState();

  if (!current) {
    return { error: 'Onboarding state not found' };
  }

  const completedSteps = current.completed_steps || [];
  if (!completedSteps.includes(step)) {
    completedSteps.push(step);
  }

  const { error } = await updateOnboardingState({
    completed_steps: completedSteps,
  });

  return { error };
}

// ============================================
// ORGANISATION DETAILS
// ============================================

/**
 * Save organisation details during onboarding
 */
export async function saveOrganisationDetails(details: {
  organisationName: string;
  organisationSlug?: string;
  contactEmail?: string;
  contactPhone?: string;
  billingEmail?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  postcode?: string;
  country?: string;
}): Promise<{
  error: string | null;
}> {
  const { error } = await updateOnboardingState({
    organisation_name: details.organisationName,
    organisation_slug: details.organisationSlug || null,
    contact_email: details.contactEmail || null,
    contact_phone: details.contactPhone || null,
    billing_email: details.billingEmail || null,
    address_line1: details.addressLine1 || null,
    address_line2: details.addressLine2 || null,
    city: details.city || null,
    postcode: details.postcode || null,
    country: details.country || 'GB',
  });

  return { error };
}

// ============================================
// PLAN SELECTION
// ============================================

/**
 * Save plan selection during onboarding
 */
export async function savePlanSelection(
  planId: string,
  billingInterval: BillingInterval
): Promise<{
  error: string | null;
}> {
  const { error } = await updateOnboardingState({
    selected_plan_id: planId,
    billing_interval: billingInterval,
  });

  return { error };
}

// ============================================
// TEAM INVITES
// ============================================

/**
 * Add a pending invite
 */
export async function addPendingInvite(
  email: string,
  role: 'admin' | 'user'
): Promise<{
  error: string | null;
}> {
  const { data: current } = await fetchOnboardingState();

  if (!current) {
    return { error: 'Onboarding state not found' };
  }

  const invites = current.pending_invites || [];

  // Check if already exists
  if (invites.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'Email already added' };
  }

  invites.push({ email, role });

  const { error } = await updateOnboardingState({
    pending_invites: invites,
  });

  return { error };
}

/**
 * Remove a pending invite
 */
export async function removePendingInvite(email: string): Promise<{
  error: string | null;
}> {
  const { data: current } = await fetchOnboardingState();

  if (!current) {
    return { error: 'Onboarding state not found' };
  }

  const invites = (current.pending_invites || []).filter(
    (i) => i.email.toLowerCase() !== email.toLowerCase()
  );

  const { error } = await updateOnboardingState({
    pending_invites: invites,
  });

  return { error };
}

// ============================================
// TEMPLATES
// ============================================

/**
 * Save selected template IDs
 */
export async function saveSelectedTemplates(templateIds: string[]): Promise<{
  error: string | null;
}> {
  const { error } = await updateOnboardingState({
    selected_template_ids: templateIds,
  });

  return { error };
}

// ============================================
// FIRST RECORD
// ============================================

/**
 * Save first record details
 */
export async function saveFirstRecord(
  name: string,
  address: string
): Promise<{
  error: string | null;
}> {
  const { error } = await updateOnboardingState({
    first_record_name: name,
    first_record_address: address,
  });

  return { error };
}

// ============================================
// COMPLETE ONBOARDING
// ============================================

/**
 * Complete onboarding and create the organisation
 */
export async function completeOnboarding(
  request: CompleteOnboardingRequest
): Promise<CompleteOnboardingResponse> {
  // Use type assertion for RPC call since types aren't generated
  const { data, error } = await (supabase.rpc as Function)('complete_onboarding', {
    p_organisation_name: request.organisationName,
    p_organisation_slug: request.organisationSlug || null,
    p_contact_email: request.contactEmail || null,
    p_billing_email: request.billingEmail || null,
    p_plan_id: request.planId || null,
    p_pending_invites: request.pendingInvites || [],
    p_selected_template_ids: request.selectedTemplateIds || [],
  });

  if (error) {
    console.error('Error completing onboarding:', error);
    return { success: false, error: error.message };
  }

  const result = data as CompleteOnboardingResponse;

  if (!result.success) {
    return result;
  }

  return result;
}

/**
 * Mark onboarding as completed (if not using complete_onboarding RPC)
 */
export async function markOnboardingComplete(organisationId: string): Promise<{
  error: string | null;
}> {
  const { error } = await updateOnboardingState({
    organisation_id: organisationId,
    completed_at: new Date().toISOString(),
    current_step: 'complete',
  });

  return { error };
}

// ============================================
// DELETE / RESET
// ============================================

/**
 * Reset onboarding state (start over)
 */
export async function resetOnboardingState(): Promise<{
  error: string | null;
}> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('onboarding_state')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Error resetting onboarding state:', error);
    return { error: error.message };
  }

  return { error: null };
}

// ============================================
// SLUG GENERATION
// ============================================

/**
 * Generate a unique slug for an organisation name
 */
export async function generateUniqueSlug(name: string): Promise<{
  slug: string;
  error: string | null;
}> {
  // Generate base slug
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'org';

  // Check if slug exists
  const { data: existing } = await supabase
    .from('organisations')
    .select('slug')
    .eq('slug', slug)
    .single();

  if (!existing) {
    return { slug, error: null };
  }

  // Add suffix until unique
  let counter = 1;
  let uniqueSlug = `${slug}-${counter}`;

  while (true) {
    const { data: check } = await supabase
      .from('organisations')
      .select('slug')
      .eq('slug', uniqueSlug)
      .single();

    if (!check) {
      return { slug: uniqueSlug, error: null };
    }

    counter++;
    uniqueSlug = `${slug}-${counter}`;

    // Safety limit
    if (counter > 100) {
      uniqueSlug = `${slug}-${Date.now()}`;
      return { slug: uniqueSlug, error: null };
    }
  }
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate organisation name
 */
export function validateOrganisationName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'Organisation name is required';
  }

  if (name.trim().length < 2) {
    return 'Organisation name must be at least 2 characters';
  }

  if (name.trim().length > 100) {
    return 'Organisation name must be less than 100 characters';
  }

  return null;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): string | null {
  if (!email || email.trim().length === 0) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }

  return null;
}
