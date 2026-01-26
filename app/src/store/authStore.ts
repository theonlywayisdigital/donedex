import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import * as authService from '../services/auth';
import * as superAdminService from '../services/superAdmin';
import type { UserRole } from '../services/auth';
import type { UserProfile, Organisation } from '../types';
import type { SuperAdminPermission, ImpersonationContext } from '../types/superAdmin';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  organisation: Organisation | null;
  role: UserRole | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Super Admin State
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
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;

  // Super Admin Actions
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

  // Super Admin initial state
  isSuperAdmin: false,
  superAdminPermissions: [],
  impersonationContext: null,

  // Computed (as getters)
  get isAuthenticated() {
    return get().session !== null;
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
    // When impersonating, return the impersonated org details
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
  get effectiveRole() {
    const { impersonationContext, role } = get();
    if (impersonationContext?.isImpersonating && impersonationContext.impersonatedRole) {
      return impersonationContext.impersonatedRole;
    }
    return role;
  },
  get isImpersonating() {
    return get().impersonationContext?.isImpersonating === true;
  },

  // Actions
  initialize: async () => {
    try {
      set({ isLoading: true });

      const session = await authService.getCurrentSession();

      if (session?.user) {
        // Fetch user profile and organisation
        const [profile, orgData] = await Promise.all([
          authService.fetchUserProfile(session.user.id),
          authService.fetchUserOrganisation(session.user.id),
        ]);

        set({
          user: session.user,
          session,
          profile,
          organisation: orgData?.organisation as Organisation | null,
          role: orgData?.role as UserRole | null,
        });

        // Check super admin status before marking as initialized
        // This ensures isSuperAdmin is set before navigation decisions are made
        await get().checkSuperAdminStatus();

        set({
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          user: null,
          session: null,
          profile: null,
          organisation: null,
          role: null,
          isSuperAdmin: false,
          superAdminPermissions: [],
          impersonationContext: null,
          isLoading: false,
          isInitialized: true,
        });
      }

      // Set up auth state listener
      authService.onAuthStateChange(async (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          set({
            user: null,
            session: null,
            profile: null,
            organisation: null,
            role: null,
            isSuperAdmin: false,
            superAdminPermissions: [],
            impersonationContext: null,
          });
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          const [profile, orgData] = await Promise.all([
            authService.fetchUserProfile(newSession.user.id),
            authService.fetchUserOrganisation(newSession.user.id),
          ]);

          set({
            user: newSession.user,
            session: newSession,
            profile,
            organisation: orgData?.organisation as Organisation | null,
            role: orgData?.role as UserRole | null,
          });

          // Check super admin status after sign in
          await get().checkSuperAdminStatus();
        }
      });
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
      const [profile, orgData] = await Promise.all([
        authService.fetchUserProfile(result.user.id),
        authService.fetchUserOrganisation(result.user.id),
      ]);

      set({
        user: result.user,
        session: result.session,
        profile,
        organisation: orgData?.organisation as Organisation | null,
        role: orgData?.role as UserRole | null,
      });

      // Check super admin status before completing sign in
      await get().checkSuperAdminStatus();

      set({ isLoading: false });
    }

    return { error: null };
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true });

    const result = await authService.signUp(email, password);

    if (result.error) {
      set({ isLoading: false });
      return { error: result.error.message };
    }

    if (result.user) {
      set({
        user: result.user,
        session: result.session,
        profile: null,
        organisation: null,
        role: null,
        isLoading: false,
      });
    }

    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });

    // End any active impersonation session first
    const { impersonationContext } = get();
    if (impersonationContext?.sessionId) {
      await superAdminService.endImpersonation(impersonationContext.sessionId);
    }

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
      isLoading: false,
    });
  },

  setSession: (session: Session | null) => {
    set({ session, user: session?.user ?? null });
  },

  // Super Admin Actions
  checkSuperAdminStatus: async () => {
    try {
      const result = await superAdminService.fetchCurrentSuperAdmin();

      if (result.data) {
        set({
          isSuperAdmin: true,
          superAdminPermissions: result.data.permissions,
        });

        // Check for active impersonation session
        const sessionResult = await superAdminService.getActiveSession();
        if (sessionResult.data) {
          set({
            impersonationContext: {
              isImpersonating: true,
              sessionId: sessionResult.data.id,
              originalUserId: get().user?.id || '',
              impersonatedUserId: sessionResult.data.impersonating_user_id,
              impersonatedOrgId: sessionResult.data.impersonating_org_id,
              impersonatedUserName: null, // Would need to fetch
              impersonatedOrgName: null, // Would need to fetch
              impersonatedRole: 'user', // Default, would need to fetch actual role
              expiresAt: sessionResult.data.expires_at,
            },
          });
        } else {
          // No active session - clear any stale impersonation context
          set({ impersonationContext: null });
        }
      } else {
        set({
          isSuperAdmin: false,
          superAdminPermissions: [],
          impersonationContext: null,
        });
      }
    } catch (error) {
      console.error('Error checking super admin status:', error);
      set({
        isSuperAdmin: false,
        superAdminPermissions: [],
        impersonationContext: null,
      });
    }
  },

  hasSuperAdminPermission: (permission: SuperAdminPermission) => {
    return get().superAdminPermissions.includes(permission);
  },

  startImpersonation: async (userId: string, orgId: string, userName: string, orgName: string, role?: 'owner' | 'admin' | 'user') => {
    const result = await superAdminService.startImpersonation(userId, orgId);

    if (result.error) {
      return { error: result.error.message };
    }

    if (result.data) {
      set({
        impersonationContext: {
          isImpersonating: true,
          sessionId: result.data.id,
          originalUserId: get().user?.id || '',
          impersonatedUserId: userId,
          impersonatedOrgId: orgId,
          impersonatedUserName: userName,
          impersonatedOrgName: orgName,
          impersonatedRole: role || 'user',
          expiresAt: result.data.expires_at,
        },
      });
    }

    return { error: null };
  },

  endImpersonation: async () => {
    const { impersonationContext } = get();

    if (!impersonationContext?.sessionId) {
      return { error: 'No active impersonation session' };
    }

    const result = await superAdminService.endImpersonation(impersonationContext.sessionId);

    if (result.error) {
      return { error: result.error.message };
    }

    set({ impersonationContext: null });
    return { error: null };
  },
}));
