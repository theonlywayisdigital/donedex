import { supabase } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/config';
import {
  checkActiveSession,
  createSession,
  deactivateSession,
  getUserRole,
  isRoleRestricted,
} from './deviceSession';

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

export interface PasswordVerifyResult {
  user: User | null;
  requiresOTP: boolean;
  error: AuthError | null;
}

export interface OTPResult {
  success: boolean;
  error: AuthError | null;
}

/**
 * Sign up with email and password
 * Note: If email confirmation is disabled, this will create a session immediately.
 * If email confirmation is enabled but we want auto-login, we sign in after sign-up.
 */
export async function signUp(email: string, password: string, fullName?: string): Promise<SignUpResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: fullName ? { data: { full_name: fullName } } : undefined,
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
 * Verify password and send OTP (Step 1 of 2FA login)
 * Returns user info if password correct, triggers OTP email
 */
export async function verifyPasswordAndSendOTP(email: string, password: string): Promise<PasswordVerifyResult> {
  console.log('[Auth] verifyPasswordAndSendOTP called for:', email);
  try {
    // First verify the password is correct by attempting sign in
    console.log('[Auth] Attempting password sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Password sign in failed:', error.message);
      return {
        user: null,
        requiresOTP: false,
        error: { message: error.message },
      };
    }

    if (!data.user) {
      console.error('[Auth] No user returned from sign in');
      return {
        user: null,
        requiresOTP: false,
        error: { message: 'Invalid credentials' },
      };
    }

    console.log('[Auth] Password verified for user:', data.user.id);

    // Sign out immediately - we don't want to complete login yet
    await supabase.auth.signOut();

    // Send OTP to the user's email via Edge Function
    console.log('[Auth] Sending OTP to:', data.user.email);
    console.log('[Auth] SUPABASE_URL:', SUPABASE_URL);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userId: data.user.id,
          email: data.user.email,
        }),
      });

      console.log('[Auth] OTP response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Auth] OTP send failed:', errorData);
        return {
          user: data.user,
          requiresOTP: false,
          error: { message: errorData.error || 'Failed to send verification code' },
        };
      }

      console.log('[Auth] OTP sent successfully');
      return {
        user: data.user,
        requiresOTP: true,
        error: null,
      };
    } catch (fetchError) {
      console.error('[Auth] OTP fetch error:', fetchError);
      return {
        user: data.user,
        requiresOTP: false,
        error: { message: 'Failed to send verification code. Please try again.' },
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return { user: null, requiresOTP: false, error: { message } };
  }
}

/**
 * Verify OTP and complete login (Step 2 of 2FA login)
 * Includes single-device login check for staff users
 */
export async function verifyOTPAndSignIn(
  email: string,
  password: string,
  userId: string,
  otpCode: string
): Promise<SignInResult> {
  try {
    // Verify OTP via database function
    const { data: isValid, error: otpError } = await supabase.rpc('verify_email_otp' as never, {
      p_user_id: userId,
      p_code: otpCode,
    } as never);

    if (otpError) {
      console.error('OTP verification error:', otpError);
      return {
        user: null,
        session: null,
        error: { message: 'Failed to verify code' },
      };
    }

    if (!isValid) {
      return {
        user: null,
        session: null,
        error: { message: 'Invalid or expired code. Please try again.' },
      };
    }

    // Check if user is staff (requires single-device login)
    const userRole = await getUserRole(userId);
    console.log('[Auth] User role:', userRole);

    if (isRoleRestricted(userRole)) {
      // Check for existing active session
      const sessionInfo = await checkActiveSession(userId);
      console.log('[Auth] Session check result:', sessionInfo);

      if (sessionInfo.hasActiveSession) {
        // BLOCK login - don't kick the existing user
        console.log('[Auth] Blocking login - active session exists on:', sessionInfo.deviceName);
        return {
          user: null,
          session: null,
          error: {
            message: 'This account is already logged in on another device. Contact your admin if you need to reset your session.',
          },
        };
      }
    }

    // OTP is valid and no session conflict, complete the sign in
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

    // Create session record for staff users
    if (data.user && isRoleRestricted(userRole)) {
      await createSession(data.user.id);
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
 * Resend OTP code
 */
export async function resendOTP(userId: string, email: string): Promise<OTPResult> {
  try {
    console.log('[Auth] Resending OTP to:', email);

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-login-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userId,
        email,
      }),
    });

    console.log('[Auth] Resend OTP response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Auth] Resend OTP failed:', errorData);
      return {
        success: false,
        error: { message: errorData.error || 'Failed to resend code' },
      };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[Auth] Resend OTP error:', err);
    const message = err instanceof Error ? err.message : 'Failed to resend code';
    return { success: false, error: { message } };
  }
}

/**
 * Sign out the current user
 * Also deactivates the device session for single-device enforcement
 */
export async function signOut(): Promise<SignOutResult> {
  try {
    // Deactivate session record first (before signing out, while still authenticated)
    await deactivateSession();

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
      redirectTo: 'https://donedex-app.netlify.app/auth/callback',
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
  } catch (err) {
    console.error('getCurrentSession error:', err);
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
  } catch (err) {
    console.error('getCurrentUser error:', err);
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
      console.error('fetchUserProfile error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('fetchUserProfile exception:', err);
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
      if (error) console.error('fetchOrgStatus error:', error.message);
      return null;
    }

    return {
      blocked: data.blocked ?? false,
      archived: data.archived ?? false,
      blocked_reason: data.blocked_reason,
    };
  } catch (err) {
    console.error('fetchOrgStatus exception:', err);
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
      console.error('fetchUserOrganisation error:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.error('fetchUserOrganisation exception:', err);
    return null;
  }
}
