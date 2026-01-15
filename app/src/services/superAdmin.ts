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
  console.log('[SuperAdmin] Calling is_super_admin RPC...');
  const { data, error } = await supabase.rpc('is_super_admin' as any);

  console.log('[SuperAdmin] is_super_admin result:', { data, error: error?.message });

  if (error) {
    console.error('[SuperAdmin] Error checking super admin status:', error);
    return false;
  }

  const result = data === true;
  console.log('[SuperAdmin] User is super admin:', result);
  return result;
}

/**
 * Check if the super admin has a specific permission
 */
export async function hasPermission(permission: SuperAdminPermission): Promise<boolean> {
  console.log('[SuperAdmin] Checking permission:', permission);

  // Use raw query to call the function with enum parameter
  const { data, error } = await (supabase.rpc as any)('super_admin_has_permission', {
    perm: permission,
  });

  console.log('[SuperAdmin] hasPermission result:', { permission, data, error: error?.message });

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
  organisation: { id: string; name: string; created_at: string };
  users: UserSummary[];
}>> {
  const canView = await hasPermission('view_all_organisations');
  if (!canView) {
    return { data: null, error: { message: 'Permission denied' } };
  }

  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('id, name, created_at')
    .eq('id', orgId)
    .single();

  if (orgError) {
    return { data: null, error: { message: orgError.message } };
  }

  type OrgRow = { id: string; name: string; created_at: string };
  const organisation = org as OrgRow;

  // Get users in this org
  const { data: orgUsers, error: usersError } = await supabase
    .from('organisation_users')
    .select(`
      user_id,
      role,
      created_at,
      user_profiles!inner(full_name)
    `)
    .eq('organisation_id', orgId);

  if (usersError) {
    return { data: null, error: { message: usersError.message } };
  }

  type OrgUserRow = {
    user_id: string;
    role: string;
    created_at: string;
    user_profiles: { full_name: string | null } | null;
  };
  const userList = (orgUsers as unknown as OrgUserRow[]) || [];

  const users: UserSummary[] = userList.map((ou) => ({
    id: ou.user_id,
    email: '', // Would need admin API to get email
    full_name: ou.user_profiles?.full_name || null,
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
  console.log('[SuperAdmin] fetchAllUsers called');
  const canView = await hasPermission('view_all_users');
  console.log('[SuperAdmin] fetchAllUsers canView:', canView);
  if (!canView) {
    console.log('[SuperAdmin] fetchAllUsers - permission denied');
    return { data: null, error: { message: 'Permission denied' } };
  }

  // Query user_profiles as base table with LEFT JOIN to organisation_users
  // This ensures we get ALL users, including super admins not in any org
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, full_name, created_at')
    .order('created_at', { ascending: false });

  console.log('[SuperAdmin] fetchAllUsers profiles result:', {
    profilesCount: profiles?.length,
    error: profilesError?.message
  });

  if (profilesError) {
    return { data: null, error: { message: profilesError.message } };
  }

  type ProfileRow = { id: string; full_name: string | null; created_at: string };
  const profileList = (profiles as ProfileRow[]) || [];

  if (profileList.length === 0) {
    console.log('[SuperAdmin] No user profiles found');
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

  console.log('[SuperAdmin] fetchAllUsers org memberships:', {
    count: orgMemberships?.length,
    error: orgError?.message
  });

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

  console.log('[SuperAdmin] fetchAllUsers super admins:', {
    count: superAdmins?.length,
    error: saError?.message
  });

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

  console.log('[SuperAdmin] fetchAllUsers final users:', users.length);
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

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  // Log the action
  await logAction('start_impersonation', 'impersonation', 'auth.users', userId, orgId);

  return { data: session as SuperAdminSession, error: null };
}

/**
 * End the current impersonation session
 */
export async function endImpersonation(sessionId: string): Promise<ServiceResult<null>> {
  const { error } = await (supabase.from('super_admin_sessions' as any) as any)
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) {
    return { data: null, error: { message: error.message } };
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
    const { error: inviteError } = await (supabase
      .from('invitations') as any)
      .insert({
        organisation_id: orgData.id,
        email: params.ownerEmail,
        role: 'owner',
        invited_by: null, // Super admin created
      });

    if (inviteError) {
      console.error('Error creating owner invitation:', inviteError);
      // Don't fail the org creation, just log
    }

    // TODO: Send invite email if params.sendInvite is true
    // This would typically be done via a Supabase Edge Function
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
