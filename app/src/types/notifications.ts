/**
 * Notification Types
 * Types for the super admin notification centre
 */

/** Notification categories for filtering and styling */
export type NotificationCategory = 'general' | 'announcement' | 'alert' | 'update';

/** Notification priority levels */
export type NotificationPriority = 'low' | 'normal' | 'high';

/** Notification targeting options */
export type NotificationTargetType = 'all' | 'all_admins' | 'organisation' | 'organisation_admins' | 'user';

/** Full notification record from database */
export interface Notification {
  id: string;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  target_type: NotificationTargetType;
  target_organisation_id: string | null;
  target_user_id: string | null;
  send_email: boolean;
  send_in_app: boolean;
  created_by: string;
  created_at: string;
}

/** Notification receipt tracking per-user state */
export interface NotificationReceipt {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string | null;
  dismissed_at: string | null;
  email_sent_at: string | null;
  created_at: string;
}

/** Notification with receipt info (returned from get_user_notifications RPC) */
export interface NotificationWithReceipt {
  id: string;
  title: string;
  message: string;
  action_url: string | null;
  action_label: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

/** Sent notification with stats (returned from get_sent_notifications RPC) */
export interface SentNotificationWithStats {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  target_type: NotificationTargetType;
  target_organisation_id: string | null;
  target_organisation_name: string | null;
  target_user_id: string | null;
  send_email: boolean;
  send_in_app: boolean;
  created_at: string;
  recipient_count: number;
  read_count: number;
}

/** Parameters for creating a new notification */
export interface CreateNotificationParams {
  title: string;
  message: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  targetType: NotificationTargetType;
  targetOrganisationId?: string;
  targetUserId?: string;
  actionUrl?: string;
  actionLabel?: string;
  sendEmail?: boolean;
  sendInApp?: boolean;
}

/** Result from sending a notification */
export interface SendNotificationResult {
  success: boolean;
  notification_id: string;
  target_count: number;
  emails_sent: number;
}

/** Category display config */
export const NOTIFICATION_CATEGORIES: Array<{
  value: NotificationCategory;
  label: string;
  icon: string;
  color: string;
}> = [
  { value: 'general', label: 'General', icon: 'bell', color: '#6B7280' },
  { value: 'announcement', label: 'Announcement', icon: 'megaphone', color: '#0F4C5C' },
  { value: 'alert', label: 'Alert', icon: 'alert-triangle', color: '#D97706' },
  { value: 'update', label: 'Update', icon: 'refresh-cw', color: '#059669' },
];

/** Priority display config */
export const NOTIFICATION_PRIORITIES: Array<{
  value: NotificationPriority;
  label: string;
  color: string;
}> = [
  { value: 'low', label: 'Low', color: '#6B7280' },
  { value: 'normal', label: 'Normal', color: '#0F4C5C' },
  { value: 'high', label: 'High', color: '#DC2626' },
];

/** Target type display config */
export const NOTIFICATION_TARGET_TYPES: Array<{
  value: NotificationTargetType;
  label: string;
  description: string;
}> = [
  { value: 'all', label: 'All Users', description: 'Send to all users on the platform' },
  { value: 'all_admins', label: 'All Admins', description: 'Send to all organisation owners and admins' },
  { value: 'organisation', label: 'Organisation', description: 'Send to all users in a specific organisation' },
  { value: 'organisation_admins', label: 'Organisation Admins', description: 'Send to owners/admins of a specific organisation' },
  { value: 'user', label: 'Individual', description: 'Send to a specific user' },
];

/** Get category config by value */
export function getCategoryConfig(category: NotificationCategory) {
  return NOTIFICATION_CATEGORIES.find((c) => c.value === category) || NOTIFICATION_CATEGORIES[0];
}

/** Get priority config by value */
export function getPriorityConfig(priority: NotificationPriority) {
  return NOTIFICATION_PRIORITIES.find((p) => p.value === priority) || NOTIFICATION_PRIORITIES[1];
}
