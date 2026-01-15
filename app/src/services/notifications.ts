/**
 * Notification Service
 * Handles notification operations for both users and super admins
 */

import { supabase } from './supabase';
import { logAction, checkIsSuperAdmin } from './superAdmin';
import type {
  NotificationWithReceipt,
  SentNotificationWithStats,
  CreateNotificationParams,
  SendNotificationResult,
} from '../types/notifications';

/** Service result type */
interface ServiceResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// ============================================
// USER FUNCTIONS
// ============================================

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_unread_notification_count' as any);

  if (error) {
    console.error('[Notifications] Error getting unread count:', error);
    return 0;
  }

  return (data as number) || 0;
}

/**
 * Get notifications for the current user
 */
export async function getUserNotifications(
  limit: number = 20,
  offset: number = 0
): Promise<ServiceResult<NotificationWithReceipt[]>> {
  const { data, error } = await supabase.rpc('get_user_notifications' as any, {
    p_limit: limit,
    p_offset: offset,
  } as any);

  if (error) {
    console.error('[Notifications] Error fetching user notifications:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as NotificationWithReceipt[]) || [], error: null };
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('mark_notification_read' as any, {
    p_notification_id: notificationId,
  } as any);

  if (error) {
    console.error('[Notifications] Error marking notification read:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: null, error: null };
}

/**
 * Dismiss a notification (hide from user's view)
 */
export async function dismissNotification(notificationId: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.rpc('dismiss_notification' as any, {
    p_notification_id: notificationId,
  } as any);

  if (error) {
    console.error('[Notifications] Error dismissing notification:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: null, error: null };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<ServiceResult<number>> {
  const { data, error } = await supabase.rpc('mark_all_notifications_read' as any);

  if (error) {
    console.error('[Notifications] Error marking all notifications read:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as number) || 0, error: null };
}

// ============================================
// SUPER ADMIN FUNCTIONS
// ============================================

/**
 * Get sent notifications with stats (super admin only)
 */
export async function getSentNotifications(
  limit: number = 50,
  offset: number = 0
): Promise<ServiceResult<SentNotificationWithStats[]>> {
  const { data, error } = await supabase.rpc('get_sent_notifications' as any, {
    p_limit: limit,
    p_offset: offset,
  } as any);

  if (error) {
    console.error('[Notifications] Error fetching sent notifications:', error);
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as SentNotificationWithStats[]) || [], error: null };
}

/**
 * Send a notification (super admin only)
 * Creates the notification record, sends emails, and creates receipts
 */
export async function sendNotification(
  params: CreateNotificationParams
): Promise<ServiceResult<SendNotificationResult>> {
  // Check if user is a super admin
  const isSuperAdmin = await checkIsSuperAdmin();
  if (!isSuperAdmin) {
    return { data: null, error: { message: 'Permission denied: Super admin access required' } };
  }

  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  // Validate targeting
  if (params.targetType === 'organisation' && !params.targetOrganisationId) {
    return { data: null, error: { message: 'Organisation ID required for organisation targeting' } };
  }
  if (params.targetType === 'user' && !params.targetUserId) {
    return { data: null, error: { message: 'User ID required for individual targeting' } };
  }

  // Create notification record
  const { data: notification, error: notifError } = await (supabase
    .from('notifications' as any) as any)
    .insert({
      title: params.title,
      message: params.message,
      action_url: params.actionUrl || null,
      action_label: params.actionLabel || null,
      category: params.category || 'general',
      priority: params.priority || 'normal',
      target_type: params.targetType,
      target_organisation_id: params.targetType === 'organisation' ? params.targetOrganisationId : null,
      target_user_id: params.targetType === 'user' ? params.targetUserId : null,
      send_email: params.sendEmail !== false,
      send_in_app: params.sendInApp !== false,
      created_by: user.id,
    })
    .select()
    .single();

  if (notifError) {
    console.error('[Notifications] Error creating notification:', notifError);
    return { data: null, error: { message: notifError.message } };
  }

  const notificationId = notification.id as string;

  // Resolve target users based on target type
  let targetUserIds: string[] = [];

  if (params.targetType === 'user') {
    targetUserIds = [params.targetUserId!];
  } else if (params.targetType === 'organisation') {
    // Get all users in the organisation
    const { data: orgUsers, error: orgError } = await supabase
      .from('organisation_users')
      .select('user_id')
      .eq('organisation_id', params.targetOrganisationId!);

    if (orgError) {
      console.error('[Notifications] Error fetching org users:', orgError);
    } else {
      targetUserIds = (orgUsers || []).map((u: { user_id: string }) => u.user_id);
    }
  } else if (params.targetType === 'organisation_admins') {
    // Get only owners and admins in the organisation
    const { data: orgAdmins, error: orgError } = await supabase
      .from('organisation_users')
      .select('user_id')
      .eq('organisation_id', params.targetOrganisationId!)
      .in('role', ['owner', 'admin']);

    if (orgError) {
      console.error('[Notifications] Error fetching org admins:', orgError);
    } else {
      targetUserIds = (orgAdmins || []).map((u: { user_id: string }) => u.user_id);
    }
  } else if (params.targetType === 'all_admins') {
    // Get all owners and admins across all organisations
    const { data: allAdmins, error: adminError } = await supabase
      .from('organisation_users')
      .select('user_id')
      .in('role', ['owner', 'admin']);

    if (adminError) {
      console.error('[Notifications] Error fetching all admins:', adminError);
    } else {
      // Dedupe user IDs (a user could be admin in multiple orgs)
      targetUserIds = [...new Set((allAdmins || []).map((u: { user_id: string }) => u.user_id))];
    }
  } else {
    // 'all' - get all users from user_profiles
    const { data: allUsers, error: allError } = await supabase
      .from('user_profiles')
      .select('id');

    if (allError) {
      console.error('[Notifications] Error fetching all users:', allError);
    } else {
      targetUserIds = (allUsers || []).map((u: { id: string }) => u.id);
    }
  }

  // Create notification receipts for all target users
  let emailsSent = 0;
  const sendEmail = params.sendEmail !== false;

  if (targetUserIds.length > 0) {
    // Create receipts in bulk
    const receipts = targetUserIds.map((userId) => ({
      notification_id: notificationId,
      user_id: userId,
    }));

    const { error: receiptError } = await (supabase
      .from('notification_receipts' as any) as any)
      .insert(receipts);

    if (receiptError) {
      console.error('[Notifications] Error creating receipts:', receiptError);
    }

    // Send emails if enabled
    if (sendEmail) {
      try {
        // Call the send-notification edge function to handle emails
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-notification',
          {
            body: {
              notificationId,
              targetUserIds,
            },
          }
        );

        if (emailError) {
          console.error('[Notifications] Error sending emails:', emailError);
        } else if (emailResult) {
          emailsSent = (emailResult as { emailsSent?: number }).emailsSent || 0;
        }
      } catch (err) {
        console.error('[Notifications] Error invoking send-notification function:', err);
      }
    }
  }

  // Log the action
  await logAction(
    'send_notification',
    'notification',
    'notifications',
    notificationId,
    params.targetOrganisationId || undefined,
    undefined,
    {
      title: params.title,
      targetType: params.targetType,
      targetCount: targetUserIds.length,
      sendEmail,
      sendInApp: params.sendInApp !== false,
    }
  );

  return {
    data: {
      success: true,
      notification_id: notificationId,
      target_count: targetUserIds.length,
      emails_sent: emailsSent,
    },
    error: null,
  };
}

/**
 * Get organisation list for targeting dropdown (super admin)
 */
export async function getOrganisationsForTargeting(): Promise<ServiceResult<Array<{ id: string; name: string }>>> {
  const { data, error } = await supabase
    .from('organisations')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  return { data: (data as Array<{ id: string; name: string }>) || [], error: null };
}

/**
 * Search users for individual targeting (super admin)
 */
export async function searchUsersForTargeting(
  searchTerm: string
): Promise<ServiceResult<Array<{ id: string; name: string; email: string; organisation: string }>>> {
  // Search in user_profiles by name
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, full_name')
    .ilike('full_name', `%${searchTerm}%`)
    .limit(20);

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!profiles || profiles.length === 0) {
    return { data: [], error: null };
  }

  // Get org memberships for these users
  const userIds = profiles.map((p: { id: string }) => p.id);
  const { data: memberships } = await supabase
    .from('organisation_users')
    .select(`
      user_id,
      organisations(name)
    `)
    .in('user_id', userIds);

  type MembershipRow = {
    user_id: string;
    organisations: { name: string } | null;
  };
  const memberMap = new Map<string, string>();
  for (const m of (memberships as unknown as MembershipRow[]) || []) {
    if (!memberMap.has(m.user_id) && m.organisations?.name) {
      memberMap.set(m.user_id, m.organisations.name);
    }
  }

  const results = profiles.map((p: { id: string; full_name: string | null }) => ({
    id: p.id,
    name: p.full_name || 'Unknown',
    email: '', // Would need admin API
    organisation: memberMap.get(p.id) || 'No Organisation',
  }));

  return { data: results, error: null };
}
