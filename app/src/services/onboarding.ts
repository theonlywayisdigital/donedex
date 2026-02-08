/**
 * Onboarding Service
 * Handles onboarding wizard state and organisation creation
 *
 * Migrated to Firebase/Firestore
 */

import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  addDoc,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';
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
  const user = auth.currentUser;

  if (!user) {
    return { needsOnboarding: false, error: 'Not authenticated' };
  }

  try {
    // Check if user has an organisation
    const userDoc = await getDoc(doc(db, collections.users, user.uid));

    if (!userDoc.exists()) {
      // No user document = needs onboarding
      return { needsOnboarding: true, error: null };
    }

    const userData = userDoc.data();

    // If user has an organisation_id, they don't need onboarding
    if (userData.organisation_id) {
      return { needsOnboarding: false, error: null };
    }

    // Check if there's a completed onboarding state
    const onboardingDoc = await getDoc(doc(db, 'onboarding_state', user.uid));
    if (onboardingDoc.exists()) {
      const onboardingData = onboardingDoc.data();
      if (onboardingData.completed_at) {
        return { needsOnboarding: false, error: null };
      }
    }

    return { needsOnboarding: true, error: null };
  } catch (error: any) {
    console.error('Error checking onboarding status:', error);
    // On error, default to TRUE - better to show onboarding than block user
    return { needsOnboarding: true, error: error.message };
  }
}

/**
 * Get or create onboarding state for current user
 */
export async function getOrCreateOnboardingState(): Promise<{
  data: OnboardingStateDB | null;
  error: string | null;
}> {
  const user = auth.currentUser;

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    const docRef = doc(db, 'onboarding_state', user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() } as OnboardingStateDB, error: null };
    }

    // Create new onboarding state
    const newState: Partial<OnboardingStateDB> = {
      user_id: user.uid,
      current_step: 'organisation_details',
      completed_steps: [],
      pending_invites: [],
      selected_template_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDoc(docRef, newState);

    return { data: { id: user.uid, ...newState } as OnboardingStateDB, error: null };
  } catch (error: any) {
    console.error('Error getting/creating onboarding state:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Fetch current onboarding state
 */
export async function fetchOnboardingState(): Promise<{
  data: OnboardingStateDB | null;
  error: string | null;
}> {
  const user = auth.currentUser;

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    const docRef = doc(db, 'onboarding_state', user.uid);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { data: null, error: null };
    }

    return { data: { id: docSnap.id, ...docSnap.data() } as OnboardingStateDB, error: null };
  } catch (error: any) {
    console.error('Error fetching onboarding state:', error);
    return { data: null, error: error.message };
  }
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
  const user = auth.currentUser;

  if (!user) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    // First ensure state exists
    await getOrCreateOnboardingState();

    const docRef = doc(db, 'onboarding_state', user.uid);
    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    // Fetch and return updated state
    const docSnap = await getDoc(docRef);
    return { data: { id: docSnap.id, ...docSnap.data() } as OnboardingStateDB, error: null };
  } catch (error: any) {
    console.error('Error updating onboarding state:', error);
    return { data: null, error: error.message };
  }
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
  const user = auth.currentUser;

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const batch = writeBatch(db);
    const organisationId = generateId();
    const now = new Date().toISOString();

    // Create organisation
    const orgRef = doc(db, collections.organisations, organisationId);
    batch.set(orgRef, {
      name: request.organisationName,
      slug: request.organisationSlug || null,
      contact_email: request.contactEmail || null,
      billing_email: request.billingEmail || null,
      owner_id: user.uid,
      created_at: now,
      updated_at: now,
    });

    // Update user with organisation_id
    const userRef = doc(db, collections.users, user.uid);
    batch.update(userRef, {
      organisation_id: organisationId,
      role: 'owner',
      updated_at: now,
    });

    // Create pending invitations
    if (request.pendingInvites && request.pendingInvites.length > 0) {
      for (const invite of request.pendingInvites) {
        const inviteId = generateId();
        const inviteRef = doc(db, collections.invitations, inviteId);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        batch.set(inviteRef, {
          organisation_id: organisationId,
          email: invite.email.toLowerCase().trim(),
          role: invite.role,
          invited_by: user.uid,
          expires_at: expiresAt.toISOString(),
          created_at: now,
        });
      }
    }

    // Copy selected templates (if any)
    // Note: Template copying is a complex operation that might be better handled separately

    // Mark onboarding as complete
    const onboardingRef = doc(db, 'onboarding_state', user.uid);
    batch.update(onboardingRef, {
      organisation_id: organisationId,
      completed_at: now,
      current_step: 'complete',
      updated_at: now,
    });

    await batch.commit();

    return {
      success: true,
      organisation_id: organisationId,
    };
  } catch (error: any) {
    console.error('Error completing onboarding:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark onboarding as completed (if not using completeOnboarding)
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
  const user = auth.currentUser;

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const docRef = doc(db, 'onboarding_state', user.uid);
    await deleteDoc(docRef);
    return { error: null };
  } catch (error: any) {
    console.error('Error resetting onboarding state:', error);
    return { error: error.message };
  }
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

  try {
    // Check if slug exists
    const q = query(
      collection(db, collections.organisations),
      where('slug', '==', slug)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { slug, error: null };
    }

    // Add suffix until unique
    let counter = 1;
    let uniqueSlug = `${slug}-${counter}`;

    while (true) {
      const checkQuery = query(
        collection(db, collections.organisations),
        where('slug', '==', uniqueSlug)
      );
      const checkSnapshot = await getDocs(checkQuery);

      if (checkSnapshot.empty) {
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
  } catch (error: any) {
    console.error('Error generating unique slug:', error);
    return { slug: `${slug}-${Date.now()}`, error: null };
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
