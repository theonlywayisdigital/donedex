/**
 * Auth Store - Firebase Version
 * Zustand store for Firebase authentication state management
 */

import { create } from 'zustand';
import * as authService from '../services/auth';
import type { User, UserRole, UserProfile, Organisation } from '../services/auth';

// Re-export types for backwards compatibility
export type { UserRole };

// Super admin types (stub for now - will implement later)
export type SuperAdminPermission =
  | 'view_all_orgs'
  | 'manage_users'
  | 'impersonate'
  | 'manage_billing'
  | 'edit_all_organisations'
  | 'impersonate_users'
  | 'edit_all_users';

export interface ImpersonationContext {
  isImpersonating: boolean;
  sessionId: string;
  originalUserId: string;
  impersonatedUserId: string;
  impersonatedOrgId: string;
  impersonatedUserName: string | null;
  impersonatedOrgName: string | null;
  impersonatedRole: 'owner' | 'admin' | 'user';
  expiresAt: string;
}

interface AuthState {
  // State
  user: User | null;
  session: { user: User } | null; // Backwards compatible session
  profile: UserProfile | null;
  organisation: Organisation | null;
  role: UserRole | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Password Setup State (for invite/recovery flows) - simplified for Firebase
  needsPasswordSetup: boolean;
  passwordSetupType: 'invite' | 'recovery' | null;

  // OTP State - removed in Firebase version (no longer used)
  pendingOTPEmail: string | null;

  // Super Admin State (stub for now)
  isSuperAdmin: boolean;
  superAdminPermissions: SuperAdminPermission[];
  impersonationContext: ImpersonationContext | null;

  // Computed
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  effectiveOrganisation: Organisation | null;
  isImpersonating: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshOrgData: () => Promise<void>;
  validateOrgStatus: () => Promise<{ valid: boolean; reason?: 'blocked' | 'archived' | 'removed' }>;
  clearPasswordSetup: () => void;

  // Super Admin Actions (stubs for now)
  checkSuperAdminStatus: () => Promise<void>;
  hasSuperAdminPermission: (permission: SuperAdminPermission) => boolean;
  startImpersonation: (userId: string, orgId: string, userName: string, orgName: string, role?: 'owner' | 'admin' | 'user') => Promise<{ error: string | null }>;
  endImpersonation: () => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  profile: null,
  organisation: null,
  role: null,
  isLoading: true,
  isInitialized: false,

  // Password setup initial state
  needsPasswordSetup: false,
  passwordSetupType: null,

  // OTP state (not used in Firebase version)
  pendingOTPEmail: null,

  // Super Admin initial state
  isSuperAdmin: false,
  superAdminPermissions: [],
  impersonationContext: null,

  // Computed (as getters)
  get isAuthenticated() {
    return get().user !== null;
  },
  get isAdmin() {
    const role = get().role;
    return role === 'admin' || role === 'owner';
  },
  get isOwner() {
    return get().role === 'owner';
  },
  get effectiveOrganisation() {
    const { impersonationContext, organisation } = get();
    if (impersonationContext?.isImpersonating && impersonationContext.impersonatedOrgId) {
      return {
        id: impersonationContext.impersonatedOrgId,
        name: impersonationContext.impersonatedOrgName || 'Unknown Organisation',
        slug: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Organisation;
    }
    return organisation;
  },
  get isImpersonating() {
    return get().impersonationContext?.isImpersonating === true;
  },

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true });
      console.log('[AuthStore] Initializing...');

      // Set up auth state listener
      authService.onAuthStateChange(async (event, sessionData) => {
        console.log('[AuthStore] Auth state changed:', event);

        if (event === 'SIGNED_IN' && sessionData?.user) {
          // Avoid re-fetching if already set for this user
          const currentState = get();
          if (currentState.user?.uid === sessionData.user.uid && currentState.profile) {
            console.log('[AuthStore] User already loaded, skipping fetch');
            return;
          }

          console.log('[AuthStore] Fetching user data...');
          const [profile, orgData] = await Promise.all([
            authService.fetchUserProfile(sessionData.user.uid),
            authService.fetchUserOrganisation(sessionData.user.uid),
          ]);

          set({
            user: sessionData.user,
            session: sessionData,
            profile,
            organisation: orgData?.organisation || null,
            role: orgData?.role || null,
            isLoading: false,
            isInitialized: true,
          });
        } else if (event === 'SIGNED_OUT') {
          set({
            user: null,
            session: null,
            profile: null,
            organisation: null,
            role: null,
            isSuperAdmin: false,
            superAdminPermissions: [],
            impersonationContext: null,
            needsPasswordSetup: false,
            passwordSetupType: null,
            isLoading: false,
            isInitialized: true,
          });
        }
      });

      // Check for existing session
      const sessionData = await authService.getCurrentSession();
      if (sessionData?.user) {
        console.log('[AuthStore] Found existing session');
        const [profile, orgData] = await Promise.all([
          authService.fetchUserProfile(sessionData.user.uid),
          authService.fetchUserOrganisation(sessionData.user.uid),
        ]);

        set({
          user: sessionData.user,
          session: sessionData,
          profile,
          organisation: orgData?.organisation || null,
          role: orgData?.role || null,
          isLoading: false,
          isInitialized: true,
        });

        // Check super admin status
        await get().checkSuperAdminStatus();
      } else {
        console.log('[AuthStore] No existing session');
        set({
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });

    const result = await authService.signIn(email, password);

    if (result.error) {
      set({ isLoading: false });
      return { error: result.error.message };
    }

    if (result.user) {
      // Fetch user data
      const [profile, orgData] = await Promise.all([
        authService.fetchUserProfile(result.user.uid),
        authService.fetchUserOrganisation(result.user.uid),
      ]);

      set({
        user: result.user,
        session: { user: result.user },
        profile,
        organisation: orgData?.organisation || null,
        role: orgData?.role || null,
        isLoading: false,
      });

      // Check super admin status after setting user
      await get().checkSuperAdminStatus();
    }

    return { error: null };
  },

  signUp: async (email: string, password: string, fullName?: string, phone?: string) => {
    set({ isLoading: true });

    const result = await authService.signUp(email, password, fullName, phone);

    if (result.error) {
      set({ isLoading: false });
      return { error: result.error.message };
    }

    if (result.user) {
      // User profile already created in signUp, fetch it
      const profile = await authService.fetchUserProfile(result.user.uid);

      set({
        user: result.user,
        session: { user: result.user },
        profile,
        organisation: null, // New users don't have an org yet
        role: null,
        isLoading: false,
      });
    }

    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });
    await authService.signOut();
    set({
      user: null,
      session: null,
      profile: null,
      organisation: null,
      role: null,
      isSuperAdmin: false,
      superAdminPermissions: [],
      impersonationContext: null,
      needsPasswordSetup: false,
      passwordSetupType: null,
      isLoading: false,
    });
  },

  refreshOrgData: async () => {
    const userId = get().user?.uid;
    if (!userId) return;

    try {
      const [profile, orgData] = await Promise.all([
        authService.fetchUserProfile(userId),
        authService.fetchUserOrganisation(userId),
      ]);

      if (!orgData || !orgData.organisation) {
        set({
          profile: profile || get().profile,
          organisation: null,
          role: null,
        });
        return;
      }

      set({
        profile: profile || get().profile,
        organisation: orgData.organisation,
        role: orgData.role,
      });
    } catch (error) {
      console.error('Error refreshing org data:', error);
    }
  },

  validateOrgStatus: async () => {
    const orgId = get().organisation?.id;
    if (!orgId) {
      const userId = get().user?.uid;
      if (userId) {
        const orgData = await authService.fetchUserOrganisation(userId);
        if (!orgData || !orgData.organisation) {
          return { valid: false, reason: 'removed' as const };
        }
      }
      return { valid: true };
    }

    const status = await authService.fetchOrgStatus(orgId);
    if (!status) return { valid: true };

    if (status.blocked) {
      return { valid: false, reason: 'blocked' as const };
    }
    if (status.archived) {
      return { valid: false, reason: 'archived' as const };
    }
    return { valid: true };
  },

  clearPasswordSetup: () => {
    set({ needsPasswordSetup: false, passwordSetupType: null });
  },

  // Super Admin Actions
  checkSuperAdminStatus: async () => {
    const userId = get().user?.uid;
    if (!userId) {
      set({ isSuperAdmin: false, superAdminPermissions: [] });
      return;
    }

    try {
      // Import Firestore functions
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      const superAdminDoc = await getDoc(doc(db, 'super_admins', userId));
      if (superAdminDoc.exists()) {
        const data = superAdminDoc.data();
        if (data.is_active) {
          set({
            isSuperAdmin: true,
            superAdminPermissions: data.permissions || [],
          });
          return;
        }
      }
      set({ isSuperAdmin: false, superAdminPermissions: [] });
    } catch (error) {
      console.error('Error checking super admin status:', error);
      set({ isSuperAdmin: false, superAdminPermissions: [] });
    }
  },

  hasSuperAdminPermission: (permission: SuperAdminPermission) => {
    return get().superAdminPermissions.includes(permission);
  },

  startImpersonation: async (_userId: string, _orgId: string, _userName: string, _orgName: string, _role?: 'owner' | 'admin' | 'user') => {
    // TODO: Implement with Firestore
    return { error: 'Not implemented yet' };
  },

  endImpersonation: async () => {
    // TODO: Implement with Firestore
    set({ impersonationContext: null });
    return { error: null };
  },
}));
