/**
 * Super Admin Service - Firebase/Firestore Version
 * Handles all super admin operations - cross-organisation management
 */

import { auth } from './firebase';
import {
  db,
  collections,
  getDocument,
  queryDocuments,
  createDocument,
  updateDocument,
  removeDocument,
  countDocuments,
  where,
  orderBy,
  limit as firestoreLimit,
  collection,
  getDocs,
  query,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from './firestore';

// Cloud Function URL
const CLOUD_FUNCTION_BASE_URL = process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL ||
  'https://europe-west2-donedex-72116.cloudfunctions.net';
import type {
  SuperAdmin,
  SuperAdminWithPermissions,
  SuperAdminPermission,
  SuperAdminSession,
  AuditLogEntry,
  AuditLogCategory,
  AuditLogFilters,
  OrganisationSummary,
  UserSummary,
  ReportSummary,
  DashboardMetrics,
  SubscriptionBreakdown,
  AttentionItem,
  GrowthTrendPoint,
} from '../types/superAdmin';

/** Service result type */
interface ServiceResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// ============================================
// SUPER ADMIN STATUS
// ============================================

/**
 * Check if the current user is a super admin
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const superAdminDoc = await getDoc(doc(db, collections.superAdmins, user.uid));
    if (superAdminDoc.exists()) {
      const data = superAdminDoc.data();
      return data?.is_active === true;
    }
    return false;
  } catch (err) {
    console.error('[SuperAdmin] Check failed:', err);
    return false;
  }
}

/**
 * Check if the super admin has a specific permission
 */
export async function hasPermission(permission: SuperAdminPermission): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;

    const superAdminDoc = await getDoc(doc(db, collections.superAdmins, user.uid));
    if (!superAdminDoc.exists()) return false;

    const data = superAdminDoc.data();
    if (!data?.is_active) return false;

    const permissions = data.permissions || [];
    return permissions.includes(permission);
  } catch (err) {
    console.error('[SuperAdmin] Error checking permission:', err);
    return false;
  }
}

/**
 * Get the current super admin's ID
 */
export async function getCurrentSuperAdminId(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const isSuperAdmin = await checkIsSuperAdmin();
  return isSuperAdmin ? user.uid : null;
}

/**
 * Fetch the current user's super admin profile with permissions
 */
export async function fetchCurrentSuperAdmin(): Promise<ServiceResult<SuperAdminWithPermissions>> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: { message: 'No session' } };
    }

    const superAdminDoc = await getDoc(doc(db, collections.superAdmins, user.uid));
    if (!superAdminDoc.exists()) {
      return { data: null, error: { message: 'Not a super admin' } };
    }

    const data = superAdminDoc.data();
    if (!data?.is_active) {
      return { data: null, error: { message: 'Super admin account is inactive' } };
    }

    const admin: SuperAdminWithPermissions = {
      id: user.uid,
      user_id: user.uid,
      name: data.name || user.displayName || 'Super Admin',
      email: data.email || user.email || '',
      is_active: true,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
      created_by: data.created_by || null,
      permissions: data.permissions || [],
    };

    return { data: admin, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Exception:', err);
    return { data: null, error: { message: 'Failed to fetch super admin' } };
  }
}

// ============================================
// ORGANISATIONS
// ============================================

/**
 * Fetch all organisations with summary stats
 */
export async function fetchAllOrganisations(): Promise<ServiceResult<OrganisationSummary[]>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const orgsSnapshot = await getDocs(
      query(collection(db, collections.organisations), orderBy('name'))
    );

    const summaries: OrganisationSummary[] = await Promise.all(
      orgsSnapshot.docs.map(async (orgDoc) => {
        const org = orgDoc.data();
        const orgId = orgDoc.id;

        // Get counts
        const [usersCount, reportsCount, templatesCount] = await Promise.all([
          countDocuments(collections.users, [where('organisation_id', '==', orgId)]),
          countDocuments(collections.reports, [where('organisation_id', '==', orgId)]),
          countDocuments(collections.templates, [where('organisation_id', '==', orgId)]),
        ]);

        return {
          id: orgId,
          name: org.name || 'Unknown',
          created_at: org.created_at || '',
          user_count: usersCount,
          report_count: reportsCount,
          template_count: templatesCount,
        };
      })
    );

    return { data: summaries, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching organisations:', err);
    return { data: null, error: { message: 'Failed to fetch organisations' } };
  }
}

/**
 * Fetch a single organisation with full details
 */
export async function fetchOrganisationDetails(orgId: string): Promise<ServiceResult<{
  organisation: {
    id: string;
    name: string;
    created_at: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    archived?: boolean;
    archived_at?: string | null;
  };
  users: UserSummary[];
}>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const orgDoc = await getDoc(doc(db, collections.organisations, orgId));
    if (!orgDoc.exists()) {
      return { data: null, error: { message: 'Organisation not found' } };
    }

    const org = orgDoc.data();

    // Get users in this org
    const usersSnapshot = await getDocs(
      query(collection(db, collections.users), where('organisation_id', '==', orgId))
    );

    const users: UserSummary[] = usersSnapshot.docs.map((userDoc) => {
      const user = userDoc.data();
      return {
        id: userDoc.id,
        email: user.email || '',
        full_name: user.full_name || null,
        organisation_id: orgId,
        organisation_name: org.name || '',
        role: user.role || 'user',
        created_at: user.created_at || '',
      };
    });

    return {
      data: {
        organisation: {
          id: orgId,
          name: org.name || '',
          created_at: org.created_at || '',
          contact_email: org.contact_email || null,
          contact_phone: org.contact_phone || null,
          archived: org.archived || false,
          archived_at: org.archived_at || null,
        },
        users,
      },
      error: null,
    };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching organisation details:', err);
    return { data: null, error: { message: 'Failed to fetch organisation details' } };
  }
}

// ============================================
// USERS
// ============================================

/**
 * Fetch all users across all organisations
 */
export async function fetchAllUsers(orgFilter?: string): Promise<ServiceResult<UserSummary[]>> {
  const canView = await hasPermission('view_all_users');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    let usersQuery = query(collection(db, collections.users), orderBy('created_at', 'desc'));
    if (orgFilter) {
      usersQuery = query(
        collection(db, collections.users),
        where('organisation_id', '==', orgFilter),
        orderBy('created_at', 'desc')
      );
    }

    const usersSnapshot = await getDocs(usersQuery);

    // Get org names
    const orgIds = [...new Set(usersSnapshot.docs.map(d => d.data().organisation_id).filter(Boolean))];
    const orgNames: Record<string, string> = {};

    for (const oid of orgIds) {
      const orgDoc = await getDoc(doc(db, collections.organisations, oid));
      if (orgDoc.exists()) {
        orgNames[oid] = orgDoc.data().name || 'Unknown';
      }
    }

    // Check super admin status
    const superAdminsSnapshot = await getDocs(
      query(collection(db, collections.superAdmins), where('is_active', '==', true))
    );
    const superAdminIds = new Set(superAdminsSnapshot.docs.map(d => d.data().user_id));

    const users: UserSummary[] = usersSnapshot.docs.map((userDoc) => {
      const user = userDoc.data();
      const isSuperAdmin = superAdminIds.has(userDoc.id);

      return {
        id: userDoc.id,
        email: user.email || '',
        full_name: user.full_name || null,
        organisation_id: user.organisation_id || '',
        organisation_name: user.organisation_id ? (orgNames[user.organisation_id] || 'Unknown') : (isSuperAdmin ? 'Super Admin' : 'No Organisation'),
        role: isSuperAdmin ? 'super_admin' as const : (user.role || 'user'),
        created_at: user.created_at || '',
        is_super_admin: isSuperAdmin,
      };
    });

    return { data: users, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching users:', err);
    return { data: null, error: { message: 'Failed to fetch users' } };
  }
}

/**
 * Fetch a single user's details
 */
export async function fetchUserDetails(userId: string): Promise<ServiceResult<{
  user: UserSummary;
  organisations: Array<{ id: string; name: string; role: string }>;
}>> {
  const canView = await hasPermission('view_all_users');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const userDoc = await getDoc(doc(db, collections.users, userId));
    if (!userDoc.exists()) {
      return { data: null, error: { message: 'User not found' } };
    }

    const user = userDoc.data();

    // Get org details if user has one
    let orgName = '';
    if (user.organisation_id) {
      const orgDoc = await getDoc(doc(db, collections.organisations, user.organisation_id));
      if (orgDoc.exists()) {
        orgName = orgDoc.data().name || '';
      }
    }

    const organisations = user.organisation_id ? [{
      id: user.organisation_id,
      name: orgName,
      role: user.role || 'user',
    }] : [];

    return {
      data: {
        user: {
          id: userId,
          email: user.email || '',
          full_name: user.full_name || null,
          organisation_id: user.organisation_id || '',
          organisation_name: orgName,
          role: user.role || 'user',
          created_at: user.created_at || '',
        },
        organisations,
      },
      error: null,
    };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching user details:', err);
    return { data: null, error: { message: 'Failed to fetch user details' } };
  }
}

// ============================================
// REPORTS
// ============================================

/**
 * Fetch all reports across all organisations
 */
export async function fetchAllReports(
  orgFilter?: string,
  limitCount: number = 50,
  offset: number = 0
): Promise<ServiceResult<{ reports: ReportSummary[]; total: number }>> {
  const canView = await hasPermission('view_all_reports');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    let reportsQuery = query(
      collection(db, collections.reports),
      orderBy('created_at', 'desc'),
      firestoreLimit(limitCount)
    );

    if (orgFilter) {
      reportsQuery = query(
        collection(db, collections.reports),
        where('organisation_id', '==', orgFilter),
        orderBy('created_at', 'desc'),
        firestoreLimit(limitCount)
      );
    }

    const reportsSnapshot = await getDocs(reportsQuery);
    const total = await countDocuments(collections.reports, orgFilter ? [where('organisation_id', '==', orgFilter)] : []);

    // Get related data
    const orgIds = [...new Set(reportsSnapshot.docs.map(d => d.data().organisation_id).filter(Boolean))];
    const orgNames: Record<string, string> = {};
    for (const oid of orgIds) {
      const orgDoc = await getDoc(doc(db, collections.organisations, oid));
      if (orgDoc.exists()) {
        orgNames[oid] = orgDoc.data().name || 'Unknown';
      }
    }

    const reports: ReportSummary[] = reportsSnapshot.docs.map((reportDoc) => {
      const report = reportDoc.data();
      return {
        id: reportDoc.id,
        template_name: report.template_name || 'Unknown Template',
        site_name: report.site_name || 'Unknown Site',
        organisation_id: report.organisation_id || '',
        organisation_name: report.organisation_id ? (orgNames[report.organisation_id] || '') : '',
        status: report.status || 'in_progress',
        created_at: report.created_at || '',
        completed_at: report.completed_at || null,
        inspector_name: report.inspector_name || null,
      };
    });

    return { data: { reports, total }, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching reports:', err);
    return { data: null, error: { message: 'Failed to fetch reports' } };
  }
}

// ============================================
// IMPERSONATION (Simplified - no session table)
// ============================================

/**
 * Start an impersonation session (stores in memory/localStorage)
 */
export async function startImpersonation(
  userId: string,
  orgId: string
): Promise<ServiceResult<SuperAdminSession>> {
  const canImpersonate = await hasPermission('impersonate_users');
  if (!canImpersonate) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const superAdminId = await getCurrentSuperAdminId();
  if (!superAdminId) {
    return { data: null, error: { message: 'Not a super admin' } };
  }

  const sessionId = `session-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Log the action
  await logAction('start_impersonation', 'impersonation', 'users', userId, orgId);

  const session: SuperAdminSession = {
    id: sessionId,
    super_admin_id: superAdminId,
    impersonating_user_id: userId,
    impersonating_org_id: orgId,
    is_active: true,
    expires_at: expiresAt,
    started_at: new Date().toISOString(),
    ended_at: null,
  };

  return { data: session, error: null };
}

/**
 * End the current impersonation session
 */
export async function endImpersonation(sessionId: string): Promise<ServiceResult<null>> {
  await logAction('end_impersonation', 'impersonation');
  return { data: null, error: null };
}

/**
 * Get the current active impersonation session
 */
export async function getActiveSession(): Promise<ServiceResult<SuperAdminSession | null>> {
  // Impersonation is now handled client-side in authStore
  return { data: null, error: null };
}

// ============================================
// AUDIT LOGGING
// ============================================

/**
 * Log a super admin action
 */
export async function logAction(
  actionType: string,
  actionCategory: AuditLogCategory,
  targetTable?: string,
  targetId?: string,
  targetOrgId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await createDocument(collections.auditLog, {
      super_admin_id: user.uid,
      action_type: actionType,
      action_category: actionCategory,
      target_table: targetTable || null,
      target_id: targetId || null,
      target_organisation_id: targetOrgId || null,
      old_values: oldValues || null,
      new_values: newValues || null,
    });
  } catch (err) {
    console.error('Failed to log super admin action:', err);
  }
}

/**
 * Fetch audit logs with filters
 */
export async function fetchAuditLogs(
  filters: AuditLogFilters = {},
  limitCount: number = 50,
  offset: number = 0
): Promise<ServiceResult<{ logs: AuditLogEntry[]; total: number }>> {
  const canView = await hasPermission('view_audit_logs');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const constraints: any[] = [orderBy('created_at', 'desc'), firestoreLimit(limitCount)];

    if (filters.super_admin_id) {
      constraints.unshift(where('super_admin_id', '==', filters.super_admin_id));
    }
    if (filters.action_category) {
      constraints.unshift(where('action_category', '==', filters.action_category));
    }

    const logsSnapshot = await getDocs(query(collection(db, collections.auditLog), ...constraints));

    const logs: AuditLogEntry[] = logsSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as AuditLogEntry[];

    return { data: { logs, total: logs.length }, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching audit logs:', err);
    return { data: null, error: { message: 'Failed to fetch audit logs' } };
  }
}

// ============================================
// SUPER ADMIN MANAGEMENT
// ============================================

/**
 * Fetch all super admins
 */
export async function fetchAllSuperAdmins(): Promise<ServiceResult<SuperAdminWithPermissions[]>> {
  const canManage = await hasPermission('manage_super_admins');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const adminsSnapshot = await getDocs(
      query(collection(db, collections.superAdmins), orderBy('name'))
    );

    const admins: SuperAdminWithPermissions[] = adminsSnapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      permissions: d.data().permissions || [],
    })) as SuperAdminWithPermissions[];

    return { data: admins, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching super admins:', err);
    return { data: null, error: { message: 'Failed to fetch super admins' } };
  }
}

// ============================================
// ORGANISATION CREATION
// ============================================

export interface OrgUserToProvision {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'user';
}

interface ProvisionResult {
  email: string;
  status: 'created' | 'existing_user_added' | 'error';
  userId?: string;
  error?: string;
}

interface CreateOrganisationParams {
  name: string;
  slug?: string;
  contactEmail: string;
  contactPhone?: string;
  users?: OrgUserToProvision[];
  planId?: string;
  billingInterval?: 'monthly' | 'annual';
  discountPercent?: number;
  discountNotes?: string;
}

/**
 * Provision users for an organisation via Cloud Function
 */
export async function provisionOrgUsers(
  organisationId: string,
  users: OrgUserToProvision[]
): Promise<ServiceResult<ProvisionResult[]>> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/provisionOrgUsersHttp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        organisationId,
        users,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to provision users' }));
      return { data: null, error: { message: errorData.error || 'Failed to provision users' } };
    }

    const data = await response.json();
    return { data: data.results || [], error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error provisioning users:', err);
    return { data: null, error: { message: err instanceof Error ? err.message : 'Failed to provision users' } };
  }
}

/**
 * Create a new organisation
 */
export async function createOrganisation(
  params: CreateOrganisationParams
): Promise<ServiceResult<{ id: string; name: string }>> {
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const slug = params.slug || params.name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'org';

    const user = auth.currentUser;
    const subscriptionStatus = params.discountPercent === 100 ? 'active' : 'trialing';

    const result = await createDocument(collections.organisations, {
      name: params.name,
      slug,
      contact_email: params.contactEmail,
      contact_phone: params.contactPhone || null,
      current_plan_id: params.planId || null,
      billing_interval: params.billingInterval || 'monthly',
      subscription_status: subscriptionStatus,
      onboarding_completed_at: new Date().toISOString(),
      discount_percent: params.discountPercent || 0,
      discount_notes: params.discountNotes || null,
      discount_applied_by: params.discountPercent ? user?.uid : null,
      discount_applied_at: params.discountPercent ? new Date().toISOString() : null,
    });

    if (!result) {
      return { data: null, error: { message: 'Failed to create organisation' } };
    }

    await logAction('create_organisation', 'organisation', 'organisations', result.id, result.id, undefined, {
      name: params.name,
      slug,
    });

    return { data: { id: result.id, name: params.name }, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error creating organisation:', err);
    return { data: null, error: { message: 'Failed to create organisation' } };
  }
}

// ============================================
// INVITATIONS
// ============================================

/**
 * Send an invitation email via Cloud Function
 */
export async function sendInviteEmail(invitationId: string): Promise<ServiceResult<null>> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const idToken = await user.getIdToken();

    const response = await fetch(`${CLOUD_FUNCTION_BASE_URL}/sendInviteHttp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ invitationId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to send invitation email' }));
      return { data: null, error: { message: errorData.error || 'Failed to send invitation email' } };
    }

    return { data: null, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error sending invite email:', err);
    return { data: null, error: { message: err instanceof Error ? err.message : 'Failed to send invitation email' } };
  }
}

/**
 * Invite a user to an organisation
 */
export async function inviteUserToOrganisation(
  organisationId: string,
  email: string,
  role: 'owner' | 'admin' | 'user' = 'user',
  sendEmail: boolean = true
): Promise<ServiceResult<{ invitationId: string }>> {
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const result = await createDocument(collections.invitations, {
      organisation_id: organisationId,
      email: email.toLowerCase().trim(),
      role,
      invited_by: auth.currentUser?.uid || null,
      expires_at: expiresAt.toISOString(),
      accepted_at: null,
      revoked_at: null,
    });

    if (!result) {
      return { data: null, error: { message: 'Failed to create invitation' } };
    }

    await logAction('invite_user', 'user_management', 'invitations', result.id, organisationId, undefined, { email, role });

    return { data: { invitationId: result.id }, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error creating invitation:', err);
    return { data: null, error: { message: 'Failed to create invitation' } };
  }
}

/**
 * Resend an invitation email
 */
export async function resendInviteEmail(invitationId: string): Promise<ServiceResult<null>> {
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await updateDocument(collections.invitations, invitationId, {
      expires_at: expiresAt.toISOString(),
    });

    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to resend invitation' } };
  }
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<ServiceResult<null>> {
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.invitations, invitationId, {
      revoked_at: new Date().toISOString(),
    });
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to revoke invitation' } };
  }
}

/**
 * Fetch pending invitations for an organisation
 */
export async function fetchPendingInvitations(
  organisationId: string
): Promise<ServiceResult<Array<{
  id: string;
  email: string;
  role: string;
  created_at: string;
}>>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const invitesSnapshot = await getDocs(
      query(
        collection(db, collections.invitations),
        where('organisation_id', '==', organisationId),
        where('accepted_at', '==', null),
        where('revoked_at', '==', null),
        orderBy('created_at', 'desc')
      )
    );

    const invites = invitesSnapshot.docs.map((d) => ({
      id: d.id,
      email: d.data().email,
      role: d.data().role,
      created_at: d.data().created_at,
    }));

    return { data: invites, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching invitations:', err);
    return { data: [], error: null };
  }
}

// ============================================
// DASHBOARD METRICS
// ============================================

/**
 * Fetch dashboard metrics for super admin overview
 */
export async function fetchDashboardMetrics(): Promise<ServiceResult<DashboardMetrics>> {
  try {
    const [orgsCount, usersCount, reportsCount] = await Promise.all([
      countDocuments(collections.organisations),
      countDocuments(collections.users),
      countDocuments(collections.reports),
    ]);

    // Get this month's counts
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const metrics: DashboardMetrics = {
      total_organisations: orgsCount,
      total_users: usersCount,
      total_reports: reportsCount,
      total_templates: 0, // Would need to count templates
      new_orgs_30d: 0,
      new_users_30d: 0,
      new_reports_30d: 0,
      active_orgs_7d: 0,
      reports_completed: 0,
      reports_in_progress: 0,
    };

    return { data: metrics, error: null };
  } catch (err) {
    console.error('[SuperAdmin] Error fetching dashboard metrics:', err);
    return { data: null, error: { message: 'Failed to fetch metrics' } };
  }
}

/**
 * Fetch subscription breakdown by plan
 */
export async function fetchSubscriptionBreakdown(): Promise<ServiceResult<SubscriptionBreakdown[]>> {
  // Simplified - would need proper subscription tracking
  return { data: [], error: null };
}

/**
 * Fetch attention items
 */
export async function fetchAttentionItems(): Promise<ServiceResult<AttentionItem[]>> {
  return { data: [], error: null };
}

/**
 * Fetch growth trend
 */
export async function fetchGrowthTrend(daysBack: number = 30): Promise<ServiceResult<GrowthTrendPoint[]>> {
  return { data: [], error: null };
}

// ============================================
// ORGANISATION MANAGEMENT
// ============================================

interface OrganisationUpdateParams {
  name?: string;
  contact_email?: string;
  contact_phone?: string;
}

/**
 * Update an organisation's details
 */
export async function updateOrganisation(
  orgId: string,
  updates: OrganisationUpdateParams
): Promise<ServiceResult<{ id: string; name: string }>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.organisations, orgId, updates);

    const orgDoc = await getDoc(doc(db, collections.organisations, orgId));
    const name = orgDoc.exists() ? orgDoc.data().name : updates.name || '';

    await logAction('update_organisation', 'organisation', 'organisations', orgId, orgId);

    return { data: { id: orgId, name }, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update organisation' } };
  }
}

interface SetOrganisationDiscountParams {
  discountPercent: number;
  discountNotes?: string;
}

/**
 * Update an organisation's discount
 */
export async function updateOrganisationDiscount(
  orgId: string,
  params: SetOrganisationDiscountParams
): Promise<ServiceResult<{ id: string; name: string }>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.organisations, orgId, {
      discount_percent: params.discountPercent,
      discount_notes: params.discountNotes || null,
      discount_applied_by: auth.currentUser?.uid || null,
      discount_applied_at: new Date().toISOString(),
    });

    const orgDoc = await getDoc(doc(db, collections.organisations, orgId));
    const name = orgDoc.exists() ? orgDoc.data().name : '';

    await logAction('update_organisation_discount', 'organisation', 'organisations', orgId, orgId);

    return { data: { id: orgId, name }, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to update discount' } };
  }
}

interface SetOrganisationPlanParams {
  planId: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  subscriptionStatus?: string;
}

/**
 * Set an organisation's subscription plan
 */
export async function setOrganisationPlan(
  orgId: string,
  params: SetOrganisationPlanParams
): Promise<ServiceResult<{ id: string; name: string }>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const updates: Record<string, unknown> = {
      current_plan_id: params.planId,
    };

    if (params.trialEndsAt !== undefined) updates.trial_ends_at = params.trialEndsAt;
    if (params.subscriptionEndsAt !== undefined) updates.subscription_ends_at = params.subscriptionEndsAt;
    if (params.subscriptionStatus !== undefined) updates.subscription_status = params.subscriptionStatus;

    await updateDocument(collections.organisations, orgId, updates);

    const orgDoc = await getDoc(doc(db, collections.organisations, orgId));
    const name = orgDoc.exists() ? orgDoc.data().name : '';

    await logAction('change_organisation_plan', 'organisation', 'organisations', orgId, orgId);

    return { data: { id: orgId, name }, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to set plan' } };
  }
}

/**
 * Archive an organisation
 */
export async function archiveOrganisation(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.organisations, orgId, {
      archived: true,
      archived_at: new Date().toISOString(),
    });

    await logAction('archive_organisation', 'organisation', 'organisations', orgId, orgId);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to archive organisation' } };
  }
}

/**
 * Restore an archived organisation
 */
export async function restoreOrganisation(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.organisations, orgId, {
      archived: false,
      archived_at: null,
    });

    await logAction('restore_organisation', 'organisation', 'organisations', orgId, orgId);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to restore organisation' } };
  }
}

/**
 * Permanently delete an organisation
 */
export async function deleteOrganisationPermanently(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await logAction('delete_organisation', 'organisation', 'organisations', orgId, orgId);
    await removeDocument(collections.organisations, orgId);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete organisation' } };
  }
}

/**
 * Fetch available subscription plans
 */
export async function fetchSubscriptionPlans(): Promise<ServiceResult<Array<{
  id: string;
  name: string;
  slug: string;
}>>> {
  try {
    const plansSnapshot = await getDocs(
      query(collection(db, collections.subscriptionPlans), where('is_active', '==', true), orderBy('display_order'))
    );

    const plans = plansSnapshot.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      slug: d.data().slug,
    }));

    return { data: plans, error: null };
  } catch (err) {
    return { data: [], error: null };
  }
}

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Remove a user from an organisation
 */
export async function removeUserFromOrganisation(
  userId: string,
  orgId: string
): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_users');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.users, userId, {
      organisation_id: null,
      role: null,
    });

    await logAction('remove_user_from_org', 'user_management', 'users', userId, orgId);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to remove user from organisation' } };
  }
}

/**
 * Delete a user account
 */
export async function deleteUserAccount(userId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_users');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await removeDocument(collections.users, userId);
    await logAction('delete_user_account', 'user_management', 'users', userId);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to delete user account' } };
  }
}

/**
 * Change a user's role
 */
export async function changeUserRole(
  userId: string,
  orgId: string,
  newRole: 'owner' | 'admin' | 'user'
): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_users');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.users, userId, { role: newRole });
    await logAction('change_user_role', 'user_management', 'users', userId, orgId, undefined, { role: newRole });
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to change user role' } };
  }
}

// ============================================
// ORGANISATION BLOCKING
// ============================================

/**
 * Block an organisation
 */
export async function blockOrganisation(orgId: string, reason: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.organisations, orgId, {
      blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_reason: reason,
    });

    await logAction('block_organisation', 'organisation', 'organisations', orgId, orgId, undefined, { reason });
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to block organisation' } };
  }
}

/**
 * Unblock an organisation
 */
export async function unblockOrganisation(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    await updateDocument(collections.organisations, orgId, {
      blocked: false,
      blocked_at: null,
      blocked_reason: null,
    });

    await logAction('unblock_organisation', 'organisation', 'organisations', orgId, orgId);
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: { message: 'Failed to unblock organisation' } };
  }
}

// ============================================
// USAGE & LIMITS
// ============================================

export const PLAN_LIMITS: Record<string, { users: number; reports: number; storageGb: number }> = {
  free: { users: 3, reports: 50, storageGb: 1 },
  pro: { users: 10, reports: 500, storageGb: 10 },
  enterprise: { users: -1, reports: -1, storageGb: 100 },
};

export interface OrganisationUsage {
  userCount: number;
  reportCount: number;
  storageUsedBytes: number;
  limits: { users: number; reports: number; storageGb: number };
  planSlug: string;
}

/**
 * Fetch organisation usage stats
 */
export async function fetchOrganisationUsage(orgId: string): Promise<ServiceResult<OrganisationUsage>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  try {
    const [userCount, reportCount] = await Promise.all([
      countDocuments(collections.users, [where('organisation_id', '==', orgId)]),
      countDocuments(collections.reports, [where('organisation_id', '==', orgId)]),
    ]);

    const orgDoc = await getDoc(doc(db, collections.organisations, orgId));
    const planSlug = orgDoc.exists() ? (orgDoc.data().current_plan_slug || 'free') : 'free';
    const limits = PLAN_LIMITS[planSlug] || PLAN_LIMITS.free;

    return {
      data: {
        userCount,
        reportCount,
        storageUsedBytes: 0,
        limits,
        planSlug,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: { message: 'Failed to fetch usage' } };
  }
}

// ============================================
// BILLING HISTORY
// ============================================

export interface BillingHistoryEntry {
  id: string;
  eventType: 'plan_change' | 'status_change' | 'trial_extended';
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  changedBy: string | null;
  createdAt: string;
}

/**
 * Fetch billing history
 */
export async function fetchBillingHistory(orgId: string): Promise<ServiceResult<BillingHistoryEntry[]>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Simplified - would need billing_history collection
  return { data: [], error: null };
}

/**
 * Log a billing event
 */
export async function logBillingEvent(
  orgId: string,
  eventType: 'plan_change' | 'status_change' | 'trial_extended',
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown>
): Promise<void> {
  // Would need billing_history collection
  console.log('[SuperAdmin] Billing event:', { orgId, eventType, previousValue, newValue });
}
