/**
 * Authentication Service
 * Uses Firebase Auth for authentication
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Extended User type with 'id' for backwards compatibility
// Firebase uses 'uid', but our app uses 'id' everywhere
export interface User extends FirebaseUser {
  id: string; // Alias for uid
}

export interface AuthError {
  message: string;
}

export interface SignInResult {
  user: User | null;
  error: AuthError | null;
}

export interface SignOutResult {
  error: AuthError | null;
}

export interface ResetPasswordResult {
  error: AuthError | null;
}

export interface SignUpResult {
  user: User | null;
  error: AuthError | null;
}

export type UserRole = 'owner' | 'admin' | 'user';

export interface UserProfile {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  email?: string | null;
  organisation_id?: string | null;
  role?: UserRole | null;
  created_at: string;
  updated_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserOrganisationData {
  role: UserRole;
  organisation: Organisation | null;
}

// Helper to add 'id' property to Firebase user
function extendUser(firebaseUser: FirebaseUser): User {
  return Object.assign(firebaseUser, { id: firebaseUser.uid });
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  fullName?: string,
  phone?: string
): Promise<SignUpResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = extendUser(userCredential.user);

    // Update display name if provided
    if (fullName) {
      await updateProfile(user, { displayName: fullName });
    }

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      id: user.uid,
      email: user.email,
      full_name: fullName || null,
      phone_number: phone || null,
      organisation_id: null,
      role: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { user, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    return { user: null, error: { message: mapFirebaseError(message) } };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: extendUser(userCredential.user), error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    return { user: null, error: { message: mapFirebaseError(message) } };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<SignOutResult> {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return { error: { message } };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<ResetPasswordResult> {
  try {
    const redirectUrl = typeof window !== 'undefined'
      ? window.location.origin + '/auth/callback'
      : 'http://localhost:8081/auth/callback';

    await sendPasswordResetEmail(auth, email, {
      url: redirectUrl,
    });
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password reset failed';
    return { error: { message: mapFirebaseError(message) } };
  }
}

/**
 * Update password for current user
 */
export async function changePassword(newPassword: string): Promise<{ error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: 'No user signed in' };
    }
    await updatePassword(user, newPassword);
    return { error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Password change failed';
    return { error: mapFirebaseError(message) };
  }
}

/**
 * Get current session (Firebase doesn't have sessions, just return user)
 */
export async function getCurrentSession(): Promise<{ user: User } | null> {
  const user = auth.currentUser;
  return user ? { user: extendUser(user) } : null;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  const user = auth.currentUser;
  return user ? extendUser(user) : null;
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: { user: User } | null) => void
): { unsubscribe: () => void } {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    if (user) {
      callback('SIGNED_IN', { user: extendUser(user) });
    } else {
      callback('SIGNED_OUT', null);
    }
  });
  return { unsubscribe };
}

/**
 * Fetch user profile from Firestore
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error('fetchUserProfile error:', err);
    return null;
  }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ error: string | null }> {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return { error: null };
  } catch (err) {
    console.error('updateUserProfile error:', err);
    return { error: err instanceof Error ? err.message : 'Update failed' };
  }
}

/**
 * Fetch user's organisation membership and role
 */
export async function fetchUserOrganisation(userId: string): Promise<UserOrganisationData | null> {
  try {
    // Get user's profile which contains org membership
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    const orgId = userData.organisation_id;
    const role = userData.role || 'user';

    if (!orgId) return null;

    // Get organisation details
    const orgDoc = await getDoc(doc(db, 'organisations', orgId));
    if (!orgDoc.exists()) return null;

    const orgData = orgDoc.data();
    return {
      role: role as UserRole,
      organisation: {
        id: orgId,
        name: orgData.name,
        slug: orgData.slug || null,
        created_at: orgData.created_at,
        updated_at: orgData.updated_at,
      },
    };
  } catch (err) {
    console.error('fetchUserOrganisation error:', err);
    return null;
  }
}

/**
 * Fetch organisation status (blocked/archived)
 */
export async function fetchOrgStatus(orgId: string): Promise<{
  blocked: boolean;
  archived: boolean;
  blocked_reason?: string | null;
} | null> {
  try {
    const orgDoc = await getDoc(doc(db, 'organisations', orgId));
    if (!orgDoc.exists()) return null;

    const data = orgDoc.data();
    return {
      blocked: data.blocked ?? false,
      archived: data.archived ?? false,
      blocked_reason: data.blocked_reason || null,
    };
  } catch (err) {
    console.error('fetchOrgStatus error:', err);
    return null;
  }
}

/**
 * Map Firebase error codes to user-friendly messages
 */
function mapFirebaseError(message: string): string {
  if (message.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists';
  }
  if (message.includes('auth/invalid-email')) {
    return 'Please enter a valid email address';
  }
  if (message.includes('auth/weak-password')) {
    return 'Password should be at least 6 characters';
  }
  if (message.includes('auth/user-not-found')) {
    return 'No account found with this email';
  }
  if (message.includes('auth/wrong-password')) {
    return 'Incorrect password';
  }
  if (message.includes('auth/invalid-credential')) {
    return 'Invalid email or password';
  }
  if (message.includes('auth/too-many-requests')) {
    return 'Too many failed attempts. Please try again later';
  }
  return message;
}
