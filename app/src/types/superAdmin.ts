/**
 * Super Admin Types
 * Types for vendor admin functionality - cross-organisation management
 */

/** Available permissions for super admins */
export type SuperAdminPermission =
  | 'view_all_organisations'
  | 'edit_all_organisations'
  | 'view_all_users'
  | 'edit_all_users'
  | 'view_all_reports'
  | 'edit_all_reports'
  | 'view_all_templates'
  | 'edit_all_templates'
  | 'view_all_records'
  | 'edit_all_records'
  | 'impersonate_users'
  | 'manage_super_admins'
  | 'view_audit_logs'
  | 'send_notifications';

/** Super admin record from database */
export interface SuperAdmin {
  id: string;
  user_id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

/** Super admin with their permissions loaded */
export interface SuperAdminWithPermissions extends SuperAdmin {
  permissions: SuperAdminPermission[];
}

/** Permission record from database */
export interface SuperAdminPermissionRecord {
  id: string;
  super_admin_id: string;
  permission: SuperAdminPermission;
  granted_at: string;
  granted_by: string | null;
}

/** Impersonation session record */
export interface SuperAdminSession {
  id: string;
  super_admin_id: string;
  impersonating_user_id: string | null;
  impersonating_org_id: string | null;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  is_active: boolean;
}

/** Audit log entry */
export interface AuditLogEntry {
  id: string;
  super_admin_id: string;
  action_type: string;
  action_category: AuditLogCategory;
  target_table: string | null;
  target_id: string | null;
  target_organisation_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  impersonating_user_id: string | null;
  created_at: string;
}

/** Audit log categories */
export type AuditLogCategory =
  | 'organisation'
  | 'user'
  | 'user_management'
  | 'report'
  | 'template'
  | 'record'
  | 'system'
  | 'impersonation'
  | 'notification';

/** Context for when impersonating a user */
export interface ImpersonationContext {
  isImpersonating: boolean;
  sessionId: string;
  originalUserId: string;
  impersonatedUserId: string | null;
  impersonatedOrgId: string | null;
  impersonatedUserName: string | null;
  impersonatedOrgName: string | null;
  expiresAt: string;
}

/** Organisation summary for super admin views */
export interface OrganisationSummary {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  report_count: number;
  template_count: number;
}

/** User summary for super admin views */
export interface UserSummary {
  id: string;
  email: string;
  full_name: string | null;
  organisation_id: string;
  organisation_name: string;
  role: 'owner' | 'admin' | 'user' | 'super_admin';
  created_at: string;
  is_super_admin?: boolean;
}

/** Report summary for super admin all-reports view */
export interface ReportSummary {
  id: string;
  template_name: string;
  site_name: string;
  organisation_id: string;
  organisation_name: string;
  status: 'in_progress' | 'completed' | 'archived';
  created_at: string;
  completed_at: string | null;
  inspector_name: string | null;
}

/** Permission groups for quick assignment */
export const PERMISSION_GROUPS = {
  /** Read-only access - can view but not modify */
  readonly: [
    'view_all_organisations',
    'view_all_users',
    'view_all_reports',
    'view_all_templates',
    'view_all_records',
    'view_audit_logs',
  ] as SuperAdminPermission[],

  /** Support staff - can view and impersonate for debugging */
  support: [
    'view_all_organisations',
    'view_all_users',
    'view_all_reports',
    'view_all_templates',
    'view_all_records',
    'view_audit_logs',
    'impersonate_users',
  ] as SuperAdminPermission[],

  /** Full access - all permissions */
  fullAccess: [
    'view_all_organisations',
    'edit_all_organisations',
    'view_all_users',
    'edit_all_users',
    'view_all_reports',
    'edit_all_reports',
    'view_all_templates',
    'edit_all_templates',
    'view_all_records',
    'edit_all_records',
    'impersonate_users',
    'manage_super_admins',
    'view_audit_logs',
    'send_notifications',
  ] as SuperAdminPermission[],
} as const;

/** Human-readable permission labels */
export const PERMISSION_LABELS: Record<SuperAdminPermission, string> = {
  view_all_organisations: 'View All Organisations',
  edit_all_organisations: 'Edit All Organisations',
  view_all_users: 'View All Users',
  edit_all_users: 'Edit All Users',
  view_all_reports: 'View All Reports',
  edit_all_reports: 'Edit All Reports',
  view_all_templates: 'View All Templates',
  edit_all_templates: 'Edit All Templates',
  view_all_records: 'View All Records',
  edit_all_records: 'Edit All Records',
  impersonate_users: 'Impersonate Users',
  manage_super_admins: 'Manage Super Admins',
  view_audit_logs: 'View Audit Logs',
  send_notifications: 'Send Notifications',
};

/** Audit log filters for querying */
export interface AuditLogFilters {
  super_admin_id?: string;
  action_category?: AuditLogCategory;
  target_organisation_id?: string;
  start_date?: string;
  end_date?: string;
}

/** Dashboard metrics for super admin overview */
export interface DashboardMetrics {
  total_organisations: number;
  total_users: number;
  total_reports: number;
  total_templates: number;
  new_orgs_30d: number;
  new_users_30d: number;
  new_reports_30d: number;
  active_orgs_7d: number;
  reports_completed: number;
  reports_in_progress: number;
}

/** Subscription plan breakdown */
export interface SubscriptionBreakdown {
  plan_id: string;
  plan_name: string;
  count: number;
  color: string;
}

/** Attention item for organisations needing action */
export interface AttentionItem {
  id: string;
  name: string;
  reason: 'past_due' | 'trial_ending' | 'inactive';
  urgency: 'high' | 'medium' | 'low';
  detail: string;
}

/** Daily growth trend data point */
export interface GrowthTrendPoint {
  date: string;
  orgs: number;
  users: number;
  reports: number;
}
