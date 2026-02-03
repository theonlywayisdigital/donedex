import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthError {
  message: string;
}

export interface SignInResult {
  user: User | null;
  session: Session | null;
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
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up with email and password
 * Note: If email confirmation is disabled, this will create a session immediately.
 * If email confirmation is enabled but we want auto-login, we sign in after sign-up.
 */
export async function signUp(email: string, password: string): Promise<SignUpResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: error.message },
      };
    }

    // If no session returned (email confirmation required), try to sign in immediately
    // This works if "Confirm email" is disabled in Supabase Auth settings
    // or if we manually confirmed the user
    if (data.user && !data.session) {
      // Try to sign in - this will fail if email confirmation is truly required
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInResult.error) {
        // If sign in fails, return the user but no session
        // The UI should handle this case (show "check your email" message)
        return {
          user: data.user,
          session: null,
          error: { message: 'Please check your email to confirm your account.' },
        };
      }

      return {
        user: signInResult.data.user,
        session: signInResult.data.session,
        error: null,
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    return { user: null, session: null, error: { message } };
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        user: null,
        session: null,
        error: { message: error.message },
      };
    }

    return {
      user: data.user,
      session: data.session,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    return { user: null, session: null, error: { message } };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<SignOutResult> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return { error: { message } };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<ResetPasswordResult> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'donedex://reset-password',
    });

    if (error) {
      return { error: { message: error.message } };
    }

    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password reset failed';
    return { error: { message } };
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
}

export type UserRole = 'owner' | 'admin' | 'user';

export interface UserOrganisationData {
  role: UserRole;
  organisation: {
    id: string;
    name: string;
  } | null;
}

/**
 * Fetch user profile from user_profiles table
 */
export async function fetchUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch organisation blocked/archived status (lightweight check)
 */
export async function fetchOrgStatus(orgId: string): Promise<{
  blocked: boolean;
  archived: boolean;
  blocked_reason?: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('blocked, archived, blocked_reason')
      .eq('id', orgId)
      .single() as unknown as {
        data: { blocked: boolean | null; archived: boolean | null; blocked_reason: string | null } | null;
        error: { message: string } | null;
      };

    if (error || !data) {
      return null;
    }

    return {
      blocked: data.blocked ?? false,
      archived: data.archived ?? false,
      blocked_reason: data.blocked_reason,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch user's organisation membership and role
 */
export async function fetchUserOrganisation(userId: string): Promise<UserOrganisationData | null> {
  try {
    const { data, error } = await supabase
      .from('organisation_users')
      .select(`
        role,
        organisation:organisations (
          id,
          name
        )
      `)
      .eq('user_id', userId)
      .single() as unknown as { data: UserOrganisationData | null; error: { message: string } | null };

    if (error) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}
