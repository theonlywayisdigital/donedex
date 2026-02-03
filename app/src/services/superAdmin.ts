/**
 * Super Admin Service
 * Handles all super admin operations - cross-organisation management
 */

import { supabase } from './supabase';
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
  const { data, error } = await supabase.rpc('is_super_admin' as any);

  if (error) {
    console.error('[SuperAdmin] Error checking super admin status:', error);
    return false;
  }

  const result = data === true;
  return result;
}

/**
 * Check if the super admin has a specific permission
 */
export async function hasPermission(permission: SuperAdminPermission): Promise<boolean> {
  // Use raw query to call the function with enum parameter
  const { data, error } = await (supabase.rpc as any)('super_admin_has_permission', {
    perm: permission,
  });

  if (error) {
    console.error('[SuperAdmin] Error checking permission:', error);
    return false;
  }

  return data === true;
}

/**
 * Get the current super admin's ID
 */
export async function getCurrentSuperAdminId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_current_super_admin_id' as any);

  if (error) {
    console.error('Error getting super admin ID:', error);
    return null;
  }

  return data as string | null;
}

/**
 * Fetch the current user's super admin profile with permissions
 */
export async function fetchCurrentSuperAdmin(): Promise<ServiceResult<SuperAdminWithPermissions>> {
  // First check if user is a super admin using the RPC function
  const isSuperAdmin = await checkIsSuperAdmin();

  if (!isSuperAdmin) {
    return { data: null, error: { message: 'Not a super admin' } };
  }

  // Get the super admin record - RLS will filter to current user
  const { data: superAdmin, error: adminError } = await supabase
    .from('super_admins' as any)
    .select('*')
    .eq('is_active', true)
    .single();

  if (adminError) {
    if (adminError.code === 'PGRST116') {
      // No rows returned - not a super admin
      return { data: null, error: { message: 'Not a super admin' } };
    }
    return { data: null, error: { message: adminError.message } };
  }

  const admin = superAdmin as SuperAdmin;

  // Fetch permissions
  const { data: permissions, error: permError } = await supabase
    .from('super_admin_permissions' as any)
    .select('permission')
    .eq('super_admin_id', admin.id);

  if (permError) {
    return { data: null, error: { message: permError.message } };
  }

  const permList = (permissions as Array<{ permission: string }>) || [];

  return {
    data: {
      ...admin,
      permissions: permList.map((p) => p.permission as SuperAdminPermission),
    },
    error: null,
  };
}

// ============================================
// ORGANISATIONS
// ============================================

/**
 * Fetch all organisations with summary stats
 */
export async function fetchAllOrganisations(): Promise<ServiceResult<OrganisationSummary[]>> {
  // First check permission
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const { data: orgs, error: orgsError } = await supabase
    .from('organisations')
    .select('id, name, created_at')
    .order('name', { ascending: true });

  if (orgsError) {
    return { data: null, error: { message: orgsError.message } };
  }

  type OrgRow = { id: string; name: string; created_at: string };
  const orgList = (orgs as OrgRow[]) || [];

  // Get counts for each org
  const summaries: OrganisationSummary[] = await Promise.all(
    orgList.map(async (org) => {
      const [usersResult, reportsResult, templatesResult] = await Promise.all([
        supabase.from('organisation_users').select('id', { count: 'exact', head: true }).eq('organisation_id', org.id),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('organisation_id', org.id),
        supabase.from('templates').select('id', { count: 'exact', head: true }).eq('organisation_id', org.id),
      ]);

      return {
        id: org.id,
        name: org.name,
        created_at: org.created_at,
        user_count: usersResult.count || 0,
        report_count: reportsResult.count || 0,
        template_count: templatesResult.count || 0,
      };
    })
  );

  return { data: summaries, error: null };
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

  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError) {
    return { data: null, error: { message: orgError.message } };
  }

  type OrgRow = {
    id: string;
    name: string;
    created_at: string;
    contact_email?: string | null;
    contact_phone?: string | null;
    archived?: boolean;
    archived_at?: string | null;
  };
  const organisation = org as OrgRow;

  // Get users in this org - first get org_users, then profiles separately
  const { data: orgUsers, error: usersError } = await supabase
    .from('organisation_users')
    .select('user_id, role, created_at')
    .eq('organisation_id', orgId);

  if (usersError) {
    console.error('Error fetching org users:', usersError);
    // Return org without users rather than failing completely
    return {
      data: {
        organisation,
        users: [],
      },
      error: null,
    };
  }

  type OrgUserRow = {
    user_id: string;
    role: string;
    created_at: string;
  };
  const userList = (orgUsers as unknown as OrgUserRow[]) || [];

  // Fetch profiles for these users
  const userIds = userList.map((u) => u.user_id);
  let profileMap: Record<string, string | null> = {};

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);

    if (profiles) {
      profileMap = (profiles as { id: string; full_name: string | null }[]).reduce((acc, p) => {
        acc[p.id] = p.full_name;
        return acc;
      }, {} as Record<string, string | null>);
    }
  }

  const users: UserSummary[] = userList.map((ou) => ({
    id: ou.user_id,
    email: '', // Would need admin API to get email
    full_name: profileMap[ou.user_id] || null,
    organisation_id: orgId,
    organisation_name: organisation.name,
    role: ou.role as 'owner' | 'admin' | 'user',
    created_at: ou.created_at,
  }));

  return {
    data: {
      organisation,
      users,
    },
    error: null,
  };
}

// ============================================
// USERS
// ============================================

/**
 * Fetch all users across all organisations
 * Queries user_profiles as base to include ALL users (including super admins without org membership)
 */
export async function fetchAllUsers(orgFilter?: string): Promise<ServiceResult<UserSummary[]>> {
  const canView = await hasPermission('view_all_users');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Query user_profiles as base table with LEFT JOIN to organisation_users
  // This ensures we get ALL users, including super admins not in any org
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, full_name, created_at')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return { data: null, error: { message: profilesError.message } };
  }

  type ProfileRow = { id: string; full_name: string | null; created_at: string };
  const profileList = (profiles as ProfileRow[]) || [];

  if (profileList.length === 0) {
    return { data: [], error: null };
  }

  // Get all organisation memberships
  const userIds = profileList.map((p) => p.id);
  let orgQuery = supabase
    .from('organisation_users')
    .select(`
      user_id,
      role,
      organisation_id,
      organisations(name)
    `)
    .in('user_id', userIds);

  if (orgFilter) {
    orgQuery = orgQuery.eq('organisation_id', orgFilter);
  }

  const { data: orgMemberships, error: orgError } = await orgQuery;

  if (orgError) {
    console.error('[SuperAdmin] Error fetching org memberships:', orgError);
  }

  type OrgMemberRow = {
    user_id: string;
    role: string;
    organisation_id: string;
    organisations: { name: string } | null;
  };
  const memberList = (orgMemberships as unknown as OrgMemberRow[]) || [];

  // Get super admin status for all users
  const { data: superAdmins, error: saError } = await supabase
    .from('super_admins' as any)
    .select('user_id, name, email')
    .in('user_id', userIds)
    .eq('is_active', true);

  type SuperAdminRow = { user_id: string; name: string; email: string };
  const superAdminList = (superAdmins as SuperAdminRow[]) || [];
  const superAdminMap = new Map(superAdminList.map((sa) => [sa.user_id, sa]));

  // Build org membership map (user_id -> first org membership)
  const orgMap = new Map<string, OrgMemberRow>();
  for (const m of memberList) {
    if (!orgMap.has(m.user_id)) {
      orgMap.set(m.user_id, m);
    }
  }

  // If orgFilter is set, only return users who are in that org
  const filteredProfiles = orgFilter
    ? profileList.filter((p) => orgMap.has(p.id))
    : profileList;

  // Build user summaries
  const users: UserSummary[] = filteredProfiles.map((p) => {
    const orgMembership = orgMap.get(p.id);
    const superAdmin = superAdminMap.get(p.id);
    const isSuperAdmin = !!superAdmin;

    return {
      id: p.id,
      email: superAdmin?.email || '',
      full_name: p.full_name || superAdmin?.name || null,
      organisation_id: orgMembership?.organisation_id || '',
      organisation_name: orgMembership?.organisations?.name || (isSuperAdmin ? 'Super Admin' : 'No Organisation'),
      role: isSuperAdmin ? 'super_admin' as const : (orgMembership?.role as 'owner' | 'admin' | 'user') || 'user',
      created_at: p.created_at,
      is_super_admin: isSuperAdmin,
    };
  });

  return { data: users, error: null };
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

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .eq('id', userId)
    .single();

  if (profileError) {
    return { data: null, error: { message: profileError.message } };
  }

  type ProfileRow = { id: string; full_name: string | null };
  const userProfile = profile as ProfileRow;

  // Get organisation memberships
  const { data: memberships, error: memberError } = await supabase
    .from('organisation_users')
    .select(`
      organisation_id,
      role,
      created_at,
      organisations!inner(name)
    `)
    .eq('user_id', userId);

  if (memberError) {
    return { data: null, error: { message: memberError.message } };
  }

  type MembershipRow = {
    organisation_id: string;
    role: string;
    created_at: string;
    organisations: { name: string } | null;
  };
  const memberList = (memberships as unknown as MembershipRow[]) || [];

  const orgs = memberList.map((m) => ({
    id: m.organisation_id,
    name: m.organisations?.name || '',
    role: m.role,
  }));

  const firstMembership = memberList[0];

  return {
    data: {
      user: {
        id: userId,
        email: '',
        full_name: userProfile.full_name,
        organisation_id: firstMembership?.organisation_id || '',
        organisation_name: firstMembership?.organisations?.name || '',
        role: (firstMembership?.role as 'owner' | 'admin' | 'user') || 'user',
        created_at: firstMembership?.created_at || '',
      },
      organisations: orgs,
    },
    error: null,
  };
}

// ============================================
// REPORTS
// ============================================

/**
 * Fetch all reports across all organisations
 */
export async function fetchAllReports(
  orgFilter?: string,
  limit: number = 50,
  offset: number = 0
): Promise<ServiceResult<{ reports: ReportSummary[]; total: number }>> {
  const canView = await hasPermission('view_all_reports');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  let query = supabase
    .from('reports')
    .select(`
      id,
      status,
      created_at,
      completed_at,
      organisation_id,
      organisations!inner(name),
      templates!inner(name),
      sites!inner(name),
      user_profiles!inner(full_name)
    `, { count: 'exact' });

  if (orgFilter) {
    query = query.eq('organisation_id', orgFilter);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  type ReportRow = {
    id: string;
    status: string;
    created_at: string;
    completed_at: string | null;
    organisation_id: string;
    organisations: { name: string } | null;
    templates: { name: string } | null;
    sites: { name: string } | null;
    user_profiles: { full_name: string | null } | null;
  };
  const reportList = (data as unknown as ReportRow[]) || [];

  const reports: ReportSummary[] = reportList.map((r) => ({
    id: r.id,
    template_name: r.templates?.name || 'Unknown Template',
    site_name: r.sites?.name || 'Unknown Site',
    organisation_id: r.organisation_id,
    organisation_name: r.organisations?.name || '',
    status: r.status as 'in_progress' | 'completed' | 'archived',
    created_at: r.created_at,
    completed_at: r.completed_at,
    inspector_name: r.user_profiles?.full_name || null,
  }));

  return {
    data: {
      reports,
      total: count || 0,
    },
    error: null,
  };
}

// ============================================
// IMPERSONATION
// ============================================

/**
 * Start an impersonation session
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

  // Try to use database session tracking, but fall back to local session if table doesn't exist
  let sessionId = `local-${Date.now()}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  try {
    // End any existing active sessions
    await (supabase.from('super_admin_sessions' as any) as any)
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('super_admin_id', superAdminId)
      .eq('is_active', true);

    // Create new session
    const { data: session, error } = await (supabase.from('super_admin_sessions' as any) as any)
      .insert({
        super_admin_id: superAdminId,
        impersonating_user_id: userId,
        impersonating_org_id: orgId,
      })
      .select()
      .single();

    if (!error && session) {
      sessionId = session.id;
    }
  } catch (err) {
    // Table might not exist, continue with local session
  }

  // Log the action
  await logAction('start_impersonation', 'impersonation', 'auth.users', userId, orgId);

  // Return synthetic session
  const syntheticSession: SuperAdminSession = {
    id: sessionId,
    super_admin_id: superAdminId,
    impersonating_user_id: userId,
    impersonating_org_id: orgId,
    is_active: true,
    expires_at: expiresAt,
    started_at: new Date().toISOString(),
    ended_at: null,
  };

  return { data: syntheticSession, error: null };
}

/**
 * End the current impersonation session
 */
export async function endImpersonation(sessionId: string): Promise<ServiceResult<null>> {
  // Try to update database session, but don't fail if table doesn't exist
  if (!sessionId.startsWith('local-')) {
    try {
      await (supabase.from('super_admin_sessions' as any) as any)
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    } catch (err) {
      // Table might not exist, continue anyway
    }
  }

  // Log the action
  await logAction('end_impersonation', 'impersonation');

  return { data: null, error: null };
}

/**
 * Get the current active impersonation session
 */
export async function getActiveSession(): Promise<ServiceResult<SuperAdminSession | null>> {
  const superAdminId = await getCurrentSuperAdminId();
  if (!superAdminId) {
    return { data: null, error: null };
  }

  const { data, error } = await supabase
    .from('super_admin_sessions' as any)
    .select('*')
    .eq('super_admin_id', superAdminId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as SuperAdminSession | null, error: null };
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
    await (supabase.rpc as any)('log_super_admin_action', {
      p_action_type: actionType,
      p_action_category: actionCategory,
      p_target_table: targetTable || null,
      p_target_id: targetId || null,
      p_target_org_id: targetOrgId || null,
      p_old_values: oldValues || null,
      p_new_values: newValues || null,
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
  limit: number = 50,
  offset: number = 0
): Promise<ServiceResult<{ logs: AuditLogEntry[]; total: number }>> {
  const canView = await hasPermission('view_audit_logs');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  let query = supabase
    .from('super_admin_audit_log' as any)
    .select('*', { count: 'exact' });

  if (filters.super_admin_id) {
    query = query.eq('super_admin_id', filters.super_admin_id);
  }
  if (filters.action_category) {
    query = query.eq('action_category', filters.action_category);
  }
  if (filters.target_organisation_id) {
    query = query.eq('target_organisation_id', filters.target_organisation_id);
  }
  if (filters.start_date) {
    query = query.gte('created_at', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return {
    data: {
      logs: (data as AuditLogEntry[]) || [],
      total: count || 0,
    },
    error: null,
  };
}

// ============================================
// SUPER ADMIN MANAGEMENT
// ============================================

/**
 * Fetch all super admins (requires manage_super_admins permission)
 */
export async function fetchAllSuperAdmins(): Promise<ServiceResult<SuperAdminWithPermissions[]>> {
  const canManage = await hasPermission('manage_super_admins');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const { data: admins, error: adminsError } = await supabase
    .from('super_admins' as any)
    .select('*')
    .order('name', { ascending: true });

  if (adminsError) {
    return { data: null, error: { message: adminsError.message } };
  }

  const adminList = (admins as SuperAdmin[]) || [];

  // Fetch all permissions
  const { data: allPermissions, error: permError } = await supabase
    .from('super_admin_permissions' as any)
    .select('super_admin_id, permission');

  if (permError) {
    return { data: null, error: { message: permError.message } };
  }

  type PermRow = { super_admin_id: string; permission: string };
  const permList = (allPermissions as PermRow[]) || [];

  // Group permissions by super admin
  const permissionMap = new Map<string, SuperAdminPermission[]>();
  for (const p of permList) {
    const existing = permissionMap.get(p.super_admin_id) || [];
    existing.push(p.permission as SuperAdminPermission);
    permissionMap.set(p.super_admin_id, existing);
  }

  const result: SuperAdminWithPermissions[] = adminList.map((admin) => ({
    ...admin,
    permissions: permissionMap.get(admin.id) || [],
  }));

  return { data: result, error: null };
}

// ============================================
// ORGANISATION CREATION (SUPER ADMIN)
// ============================================

interface CreateOrganisationParams {
  name: string;
  slug?: string;
  contactEmail: string;
  contactPhone?: string;
  ownerEmail?: string;
  ownerName?: string;
  planId?: string;
  sendInvite?: boolean;
}

/**
 * Create a new organisation (super admin only)
 */
export async function createOrganisation(
  params: CreateOrganisationParams
): Promise<ServiceResult<{ id: string; name: string }>> {
  // Check permission
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Generate slug if not provided
  const slug = params.slug || params.name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'org';

  // Create organisation
  const { data: org, error: orgError } = await (supabase
    .from('organisations') as any)
    .insert({
      name: params.name,
      slug,
      contact_email: params.contactEmail,
      contact_phone: params.contactPhone || null,
      current_plan_id: params.planId || null,
      subscription_status: 'active',
      onboarding_completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (orgError) {
    return { data: null, error: { message: orgError.message } };
  }

  const orgData = org as { id: string; name: string };

  // If owner email provided, create invite or user
  if (params.ownerEmail) {
    // Create an invitation for the owner
    const { data: invitation, error: inviteError } = await (supabase
      .from('invitations') as any)
      .insert({
        organisation_id: orgData.id,
        email: params.ownerEmail,
        role: 'owner',
        invited_by: null, // Super admin created
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating owner invitation:', inviteError);
      // Don't fail the org creation, just log
    } else if (params.sendInvite && invitation) {
      // Send invite email via edge function
      const inviteResult = await sendInviteEmail((invitation as { id: string }).id);
      if (inviteResult.error) {
        console.error('Error sending invite email:', inviteResult.error.message);
        // Don't fail the org creation, just log
      }
    }
  }

  // Log the action
  await logAction(
    'create_organisation',
    'organisation',
    'organisations',
    orgData.id,
    orgData.id,
    undefined,
    { name: params.name, slug, contactEmail: params.contactEmail }
  );

  return { data: orgData, error: null };
}

// ============================================
// USER INVITATIONS
// ============================================

/**
 * Send an invitation email for an existing invitation record
 */
export async function sendInviteEmail(invitationId: string): Promise<ServiceResult<null>> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      return { data: null, error: { message: 'Not authenticated' } };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

    const response = await fetch(`${supabaseUrl}/functions/v1/send-invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invitationId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { data: null, error: { message: errorData.error || 'Failed to send invite' } };
    }

    return { data: null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send invite email';
    return { data: null, error: { message } };
  }
}

/**
 * Invite a user to an organisation (super admin only)
 */
export async function inviteUserToOrganisation(
  organisationId: string,
  email: string,
  role: 'owner' | 'admin' | 'user' = 'user',
  sendEmail: boolean = true
): Promise<ServiceResult<{ invitationId: string }>> {
  // Check permission
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Check if invitation already exists (we can't check existing users without admin API)
  const { data: existingInvite } = await (supabase
    .from('invitations') as any)
    .select('id')
    .eq('organisation_id', organisationId)
    .eq('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle();

  if (existingInvite) {
    return { data: null, error: { message: 'An invitation already exists for this email' } };
  }

  // Get current super admin ID for audit
  const superAdminId = await getCurrentSuperAdminId();

  // Create invitation
  const { data: invitation, error: inviteError } = await (supabase
    .from('invitations') as any)
    .insert({
      organisation_id: organisationId,
      email,
      role,
      invited_by: null, // Super admin doesn't have a user profile in this org
    })
    .select()
    .single();

  if (inviteError || !invitation) {
    return { data: null, error: { message: inviteError?.message || 'Failed to create invitation' } };
  }

  const invitationData = invitation as { id: string };

  // Log the action
  await logAction(
    'invite_user',
    'user_management',
    'invitations',
    invitationData.id,
    organisationId,
    undefined,
    { email, role }
  );

  // Send invitation email if requested
  if (sendEmail) {
    const emailResult = await sendInviteEmail(invitationData.id);
    if (emailResult.error) {
      console.error('Failed to send invite email:', emailResult.error.message);
      // Don't fail the invite creation, just log
    }
  }

  return { data: { invitationId: invitationData.id }, error: null };
}

/**
 * Resend an invitation email
 */
export async function resendInviteEmail(invitationId: string): Promise<ServiceResult<null>> {
  // Check permission
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Verify invitation exists and is not accepted/revoked
  const { data: invitation, error: checkError } = await (supabase
    .from('invitations') as any)
    .select('id, email, organisation_id')
    .eq('id', invitationId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .single();

  if (checkError || !invitation) {
    return { data: null, error: { message: 'Invitation not found or already used' } };
  }

  const inviteData = invitation as { id: string; email: string; organisation_id: string };

  // Send the email
  const emailResult = await sendInviteEmail(invitationId);
  if (emailResult.error) {
    return emailResult;
  }

  // Log the action
  await logAction(
    'resend_invite',
    'user_management',
    'invitations',
    invitationId,
    inviteData.organisation_id,
    undefined,
    { email: inviteData.email }
  );

  return { data: null, error: null };
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(invitationId: string): Promise<ServiceResult<null>> {
  // Check permission
  const canManage = await hasPermission('edit_all_organisations');
  if (!canManage) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Get invitation details for logging
  const { data: invitation } = await (supabase
    .from('invitations') as any)
    .select('email, organisation_id')
    .eq('id', invitationId)
    .single();

  const inviteData = invitation as { email: string; organisation_id: string } | null;

  // Mark invitation as revoked
  const { error } = await (supabase
    .from('invitations') as any)
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  if (inviteData) {
    await logAction(
      'revoke_invite',
      'user_management',
      'invitations',
      invitationId,
      inviteData.organisation_id,
      { email: inviteData.email },
      undefined
    );
  }

  return { data: null, error: null };
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

  const { data, error } = await (supabase
    .from('invitations') as any)
    .select('id, email, role, created_at')
    .eq('organisation_id', organisationId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data || [], error: null };
}

// ============================================
// DASHBOARD METRICS
// ============================================

/**
 * Fetch dashboard metrics for super admin overview
 */
export async function fetchDashboardMetrics(): Promise<ServiceResult<DashboardMetrics>> {
  const { data, error } = await supabase.rpc('get_super_admin_dashboard_metrics' as any);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as DashboardMetrics, error: null };
}

/**
 * Fetch subscription breakdown by plan
 */
export async function fetchSubscriptionBreakdown(): Promise<ServiceResult<SubscriptionBreakdown[]>> {
  const { data, error } = await supabase.rpc('get_subscription_breakdown' as any);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as SubscriptionBreakdown[]) || [], error: null };
}

/**
 * Fetch attention items (orgs needing action)
 */
export async function fetchAttentionItems(): Promise<ServiceResult<AttentionItem[]>> {
  const { data, error } = await supabase.rpc('get_attention_items' as any);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as AttentionItem[]) || [], error: null };
}

/**
 * Fetch growth trend for last N days
 */
export async function fetchGrowthTrend(daysBack: number = 30): Promise<ServiceResult<GrowthTrendPoint[]>> {
  const { data, error } = await supabase.rpc('get_growth_trend' as never, {
    days_back: daysBack,
  } as never);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as GrowthTrendPoint[]) || [], error: null };
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

  // Get current values for audit log
  const { data: currentOrg, error: fetchError } = await supabase
    .from('organisations')
    .select('name, contact_email, contact_phone')
    .eq('id', orgId)
    .single();

  if (fetchError) {
    return { data: null, error: { message: fetchError.message } };
  }

  type OrgRow = { name: string; contact_email: string | null; contact_phone: string | null };
  const oldValues = currentOrg as OrgRow;

  // Update organisation
  const { data: org, error } = await (supabase
    .from('organisations') as any)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId)
    .select('id, name')
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction(
    'update_organisation',
    'organisation',
    'organisations',
    orgId,
    orgId,
    oldValues,
    updates as Record<string, unknown>
  );

  return { data: org as { id: string; name: string }, error: null };
}

interface SetOrganisationPlanParams {
  planId: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  subscriptionStatus?: string;
}

/**
 * Set an organisation's subscription plan (super admin override)
 */
export async function setOrganisationPlan(
  orgId: string,
  params: SetOrganisationPlanParams
): Promise<ServiceResult<{ id: string; name: string }>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Get current values for audit log
  const { data: currentOrg, error: fetchError } = await supabase
    .from('organisations')
    .select('current_plan_id, trial_ends_at, subscription_ends_at, subscription_status')
    .eq('id', orgId)
    .single();

  if (fetchError) {
    return { data: null, error: { message: fetchError.message } };
  }

  type BillingRow = {
    current_plan_id: string | null;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    subscription_status: string | null;
  };
  const oldValues = currentOrg as BillingRow;

  const updates: Record<string, unknown> = {
    current_plan_id: params.planId,
    updated_at: new Date().toISOString(),
  };

  if (params.trialEndsAt !== undefined) {
    updates.trial_ends_at = params.trialEndsAt;
  }
  if (params.subscriptionEndsAt !== undefined) {
    updates.subscription_ends_at = params.subscriptionEndsAt;
  }
  if (params.subscriptionStatus !== undefined) {
    updates.subscription_status = params.subscriptionStatus;
  }

  // Update organisation
  const { data: org, error } = await (supabase
    .from('organisations') as any)
    .update(updates)
    .eq('id', orgId)
    .select('id, name')
    .single();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction(
    'change_organisation_plan',
    'organisation',
    'organisations',
    orgId,
    orgId,
    oldValues,
    updates
  );

  return { data: org as { id: string; name: string }, error: null };
}

/**
 * Archive an organisation (soft delete)
 */
export async function archiveOrganisation(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Get org name for audit log
  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .single();

  const orgName = (org as { name: string } | null)?.name || 'Unknown';

  // Archive the organisation
  const { error } = await (supabase
    .from('organisations') as any)
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction(
    'archive_organisation',
    'organisation',
    'organisations',
    orgId,
    orgId,
    { archived: false },
    { archived: true, name: orgName }
  );

  return { data: null, error: null };
}

/**
 * Restore an archived organisation
 */
export async function restoreOrganisation(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Get org name for audit log
  const { data: org } = await supabase
    .from('organisations')
    .select('name')
    .eq('id', orgId)
    .single();

  const orgName = (org as { name: string } | null)?.name || 'Unknown';

  // Restore the organisation
  const { error } = await (supabase
    .from('organisations') as any)
    .update({
      archived: false,
      archived_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction(
    'restore_organisation',
    'organisation',
    'organisations',
    orgId,
    orgId,
    { archived: true },
    { archived: false, name: orgName }
  );

  return { data: null, error: null };
}

/**
 * Permanently delete an organisation and all related data
 * WARNING: This is destructive and cannot be undone
 */
export async function deleteOrganisationPermanently(orgId: string): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Get org details for audit log before deletion
  const { data: org, error: fetchError } = await supabase
    .from('organisations')
    .select('name, created_at')
    .eq('id', orgId)
    .single();

  if (fetchError) {
    return { data: null, error: { message: fetchError.message } };
  }

  type OrgRow = { name: string; created_at: string };
  const orgData = org as OrgRow;

  // Log the action BEFORE deletion (so we have the org_id reference)
  await logAction(
    'delete_organisation',
    'organisation',
    'organisations',
    orgId,
    orgId,
    { name: orgData.name, created_at: orgData.created_at },
    { deleted: true }
  );

  // Delete in order to respect foreign key constraints:
  // 1. Delete report_photos (FK to reports)
  await (supabase.from('report_photos') as any)
    .delete()
    .in('report_id', supabase.from('reports').select('id').eq('organisation_id', orgId));

  // 2. Delete report_responses (FK to reports)
  await (supabase.from('report_responses') as any)
    .delete()
    .in('report_id', supabase.from('reports').select('id').eq('organisation_id', orgId));

  // 3. Delete reports
  await (supabase.from('reports') as any)
    .delete()
    .eq('organisation_id', orgId);

  // 4. Delete template_items (FK to template_sections)
  await (supabase.from('template_items') as any)
    .delete()
    .in('section_id', supabase.from('template_sections').select('id').in('template_id', supabase.from('templates').select('id').eq('organisation_id', orgId) as any) as any);

  // 5. Delete template_sections (FK to templates)
  await (supabase.from('template_sections') as any)
    .delete()
    .in('template_id', supabase.from('templates').select('id').eq('organisation_id', orgId));

  // 6. Delete templates
  await (supabase.from('templates') as any)
    .delete()
    .eq('organisation_id', orgId);

  // 7. Delete user_record_assignments
  await (supabase.from('user_record_assignments') as any)
    .delete()
    .in('record_id', supabase.from('records').select('id').eq('organisation_id', orgId));

  // 8. Delete record_documents
  await (supabase.from('record_documents') as any)
    .delete()
    .in('record_id', supabase.from('records').select('id').eq('organisation_id', orgId));

  // 9. Delete records (sites)
  await (supabase.from('records') as any)
    .delete()
    .eq('organisation_id', orgId);

  // 10. Delete record_type_fields
  await (supabase.from('record_type_fields') as any)
    .delete()
    .in('record_type_id', supabase.from('record_types').select('id').eq('organisation_id', orgId));

  // 11. Delete record_types
  await (supabase.from('record_types') as any)
    .delete()
    .eq('organisation_id', orgId);

  // 12. Delete invitations
  await (supabase.from('invitations') as any)
    .delete()
    .eq('organisation_id', orgId);

  // 13. Delete organisation_users
  await (supabase.from('organisation_users') as any)
    .delete()
    .eq('organisation_id', orgId);

  // 14. Finally delete the organisation
  const { error: deleteError } = await (supabase
    .from('organisations') as any)
    .delete()
    .eq('id', orgId);

  if (deleteError) {
    return { data: null, error: { message: deleteError.message } };
  }

  return { data: null, error: null };
}

/**
 * Fetch available subscription plans for the plan selector
 */
export async function fetchSubscriptionPlans(): Promise<ServiceResult<Array<{
  id: string;
  name: string;
  slug: string;
}>>> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: data as Array<{ id: string; name: string; slug: string }>, error: null };
}

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Remove a user from a specific organisation
 */
export async function removeUserFromOrganisation(
  userId: string,
  orgId: string
): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_users');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Delete from organisation_users
  const { error } = await supabase
    .from('organisation_users')
    .delete()
    .eq('user_id', userId)
    .eq('organisation_id', orgId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction('remove_user_from_org', 'user_management', 'organisation_users', userId, orgId);

  return { data: null, error: null };
}

/**
 * Delete a user account entirely (removes from all orgs + deletes profile)
 */
export async function deleteUserAccount(
  userId: string
): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_users');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // First remove from all organisations
  const { error: orgError } = await supabase
    .from('organisation_users')
    .delete()
    .eq('user_id', userId);

  if (orgError) {
    return { data: null, error: { message: `Failed to remove from orgs: ${orgError.message}` } };
  }

  // Delete user profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('id', userId);

  if (profileError) {
    return { data: null, error: { message: `Failed to delete profile: ${profileError.message}` } };
  }

  // Log the action
  await logAction('delete_user_account', 'user_management', 'user_profiles', userId, undefined);

  return { data: null, error: null };
}

// ============================================
// USER ROLE CHANGE
// ============================================

/**
 * Change a user's role within an organisation
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

  // Get current role for audit log
  const { data: current, error: fetchError } = await (supabase
    .from('organisation_users') as any)
    .select('role')
    .eq('user_id', userId)
    .eq('organisation_id', orgId)
    .single();

  if (fetchError) {
    return { data: null, error: { message: `Failed to fetch current role: ${fetchError.message}` } };
  }

  const oldRole = current?.role;

  // Update the role
  const { error } = await (supabase
    .from('organisation_users') as any)
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('organisation_id', orgId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction(
    'change_user_role',
    'user_management',
    'organisation_users',
    userId,
    orgId,
    { role: oldRole },
    { role: newRole }
  );

  return { data: null, error: null };
}

// ============================================
// ORGANISATION BLOCKING
// ============================================

/**
 * Block an organisation (suspend access without deleting)
 */
export async function blockOrganisation(
  orgId: string,
  reason: string
): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const { error } = await (supabase
    .from('organisations') as any)
    .update({
      blocked: true,
      blocked_at: new Date().toISOString(),
      blocked_reason: reason,
    })
    .eq('id', orgId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction('block_organisation', 'organisation', 'organisations', orgId, orgId, undefined, { reason });

  return { data: null, error: null };
}

/**
 * Unblock an organisation
 */
export async function unblockOrganisation(
  orgId: string
): Promise<ServiceResult<null>> {
  const canEdit = await hasPermission('edit_all_organisations');
  if (!canEdit) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const { error } = await (supabase
    .from('organisations') as any)
    .update({
      blocked: false,
      blocked_at: null,
      blocked_reason: null,
    })
    .eq('id', orgId);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction('unblock_organisation', 'organisation', 'organisations', orgId, orgId);

  return { data: null, error: null };
}

// ============================================
// USAGE & LIMITS
// ============================================

/** Plan limits configuration */
export const PLAN_LIMITS: Record<string, { users: number; reports: number; storageGb: number }> = {
  free: { users: 3, reports: 50, storageGb: 1 },
  pro: { users: 10, reports: 500, storageGb: 10 },
  enterprise: { users: -1, reports: -1, storageGb: 100 }, // -1 = unlimited
};

export interface OrganisationUsage {
  userCount: number;
  reportCount: number;
  storageUsedBytes: number;
  limits: { users: number; reports: number; storageGb: number };
  planSlug: string;
}

/**
 * Fetch organisation usage stats and compare with plan limits
 */
export async function fetchOrganisationUsage(
  orgId: string
): Promise<ServiceResult<OrganisationUsage>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Get user count
  const { count: userCount, error: userError } = await supabase
    .from('organisation_users')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', orgId);

  if (userError) {
    return { data: null, error: { message: userError.message } };
  }

  // Get report count
  const { count: reportCount, error: reportError } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('organisation_id', orgId);

  if (reportError) {
    return { data: null, error: { message: reportError.message } };
  }

  // Get current plan
  const { data: orgData, error: orgError } = await supabase
    .from('organisations')
    .select('subscription_plan_id, subscription_plans(slug)')
    .eq('id', orgId)
    .single();

  if (orgError) {
    return { data: null, error: { message: orgError.message } };
  }

  const planSlug = (orgData as any)?.subscription_plans?.slug || 'free';
  const limits = PLAN_LIMITS[planSlug] || PLAN_LIMITS.free;

  // Storage calculation would require summing file sizes from storage
  // For now, return 0 as placeholder (would need storage bucket integration)
  const storageUsedBytes = 0;

  return {
    data: {
      userCount: userCount || 0,
      reportCount: reportCount || 0,
      storageUsedBytes,
      limits,
      planSlug,
    },
    error: null,
  };
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
 * Fetch billing history for an organisation
 */
export async function fetchBillingHistory(
  orgId: string
): Promise<ServiceResult<BillingHistoryEntry[]>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const { data, error } = await (supabase
    .from('billing_history') as any)
    .select('*')
    .eq('organisation_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    // Table might not exist yet - return empty array
    if (error.code === '42P01') {
      return { data: [], error: null };
    }
    return { data: null, error: { message: error.message } };
  }

  const entries: BillingHistoryEntry[] = (data || []).map((row: any) => ({
    id: row.id,
    eventType: row.event_type,
    previousValue: row.previous_value,
    newValue: row.new_value,
    changedBy: row.changed_by,
    createdAt: row.created_at,
  }));

  return { data: entries, error: null };
}

/**
 * Log a billing history entry (called when plan/status changes)
 */
export async function logBillingEvent(
  orgId: string,
  eventType: 'plan_change' | 'status_change' | 'trial_extended',
  previousValue: Record<string, unknown> | null,
  newValue: Record<string, unknown>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  await (supabase.from('billing_history') as any).insert({
    organisation_id: orgId,
    event_type: eventType,
    previous_value: previousValue,
    new_value: newValue,
    changed_by: user?.id || null,
  });
}
