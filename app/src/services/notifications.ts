/**
 * Notification Service
 * Handles notification operations for both users and super admins
 *
 * Migrated to Firebase/Firestore
 */

import { auth, db } from './firebase';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  writeBatch,
} from 'firebase/firestore';
import { collections, generateId } from './firestore';
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
  const user = auth.currentUser;
  if (!user) return 0;

  try {
    const receiptsQuery = query(
      collection(db, 'notification_receipts'),
      where('user_id', '==', user.uid),
      where('read_at', '==', null),
      where('dismissed_at', '==', null)
    );
    const snapshot = await getDocs(receiptsQuery);
    return snapshot.size;
  } catch (err) {
    console.error('[Notifications] Error getting unread count:', err);
    return 0;
  }
}

/**
 * Get notifications for the current user
 */
export async function getUserNotifications(
  maxResults: number = 20,
  offset: number = 0
): Promise<ServiceResult<NotificationWithReceipt[]>> {
  const user = auth.currentUser;
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    // Get receipts for this user
    const receiptsQuery = query(
      collection(db, 'notification_receipts'),
      where('user_id', '==', user.uid),
      where('dismissed_at', '==', null),
      orderBy('created_at', 'desc'),
      firestoreLimit(maxResults)
    );
    const receiptsSnap = await getDocs(receiptsQuery);

    const notifications: NotificationWithReceipt[] = [];

    for (const receiptDoc of receiptsSnap.docs) {
      const receiptData = receiptDoc.data();

      // Fetch the notification
      const notifRef = doc(db, collections.notifications, receiptData.notification_id);
      const notifSnap = await getDoc(notifRef);

      if (notifSnap.exists()) {
        const notifData = notifSnap.data();
        notifications.push({
          id: notifSnap.id,
          title: notifData.title,
          message: notifData.message,
          action_url: notifData.action_url || null,
          action_label: notifData.action_label || null,
          category: notifData.category,
          priority: notifData.priority,
          created_at: notifData.created_at,
          read_at: receiptData.read_at,
          dismissed_at: receiptData.dismissed_at,
        });
      }
    }

    return { data: notifications, error: null };
  } catch (err: any) {
    console.error('[Notifications] Error fetching user notifications:', err);
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<ServiceResult<null>> {
  const user = auth.currentUser;
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    // Find the receipt for this user and notification
    const receiptsQuery = query(
      collection(db, 'notification_receipts'),
      where('user_id', '==', user.uid),
      where('notification_id', '==', notificationId)
    );
    const receiptsSnap = await getDocs(receiptsQuery);

    if (!receiptsSnap.empty) {
      const receiptDoc = receiptsSnap.docs[0];
      await updateDoc(receiptDoc.ref, {
        read_at: new Date().toISOString(),
      });
    }

    return { data: null, error: null };
  } catch (err: any) {
    console.error('[Notifications] Error marking notification read:', err);
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Dismiss a notification (hide from user's view)
 */
export async function dismissNotification(notificationId: string): Promise<ServiceResult<null>> {
  const user = auth.currentUser;
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    // Find the receipt for this user and notification
    const receiptsQuery = query(
      collection(db, 'notification_receipts'),
      where('user_id', '==', user.uid),
      where('notification_id', '==', notificationId)
    );
    const receiptsSnap = await getDocs(receiptsQuery);

    if (!receiptsSnap.empty) {
      const receiptDoc = receiptsSnap.docs[0];
      await updateDoc(receiptDoc.ref, {
        dismissed_at: new Date().toISOString(),
      });
    }

    return { data: null, error: null };
  } catch (err: any) {
    console.error('[Notifications] Error dismissing notification:', err);
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<ServiceResult<number>> {
  const user = auth.currentUser;
  if (!user) {
    return { data: null, error: { message: 'Not authenticated' } };
  }

  try {
    const receiptsQuery = query(
      collection(db, 'notification_receipts'),
      where('user_id', '==', user.uid),
      where('read_at', '==', null)
    );
    const receiptsSnap = await getDocs(receiptsQuery);

    const batch = writeBatch(db);
    const now = new Date().toISOString();

    receiptsSnap.docs.forEach(receiptDoc => {
      batch.update(receiptDoc.ref, { read_at: now });
    });

    await batch.commit();

    return { data: receiptsSnap.size, error: null };
  } catch (err: any) {
    console.error('[Notifications] Error marking all notifications read:', err);
    return { data: null, error: { message: err.message } };
  }
}

// ============================================
// SUPER ADMIN FUNCTIONS
// ============================================

/**
 * Get sent notifications with stats (super admin only)
 */
export async function getSentNotifications(
  maxResults: number = 50,
  offset: number = 0
): Promise<ServiceResult<SentNotificationWithStats[]>> {
  try {
    const notificationsQuery = query(
      collection(db, collections.notifications),
      orderBy('created_at', 'desc'),
      firestoreLimit(maxResults)
    );
    const snapshot = await getDocs(notificationsQuery);

    const notifications: SentNotificationWithStats[] = [];

    for (const notifDoc of snapshot.docs) {
      const data = notifDoc.data();

      // Count receipts for this notification
      const receiptsQuery = query(
        collection(db, 'notification_receipts'),
        where('notification_id', '==', notifDoc.id)
      );
      const receiptsSnap = await getDocs(receiptsQuery);

      let readCount = 0;
      receiptsSnap.docs.forEach(r => {
        if (r.data().read_at) readCount++;
      });

      notifications.push({
        id: notifDoc.id,
        title: data.title,
        message: data.message,
        category: data.category,
        priority: data.priority,
        target_type: data.target_type,
        target_organisation_id: data.target_organisation_id || null,
        target_organisation_name: null, // Would need to fetch org name
        target_user_id: data.target_user_id || null,
        send_email: data.send_email,
        send_in_app: data.send_in_app,
        created_at: data.created_at,
        recipient_count: receiptsSnap.size,
        read_count: readCount,
      });
    }

    return { data: notifications, error: null };
  } catch (err: any) {
    console.error('[Notifications] Error fetching sent notifications:', err);
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Send a notification (super admin only)
 */
export async function sendNotification(
  params: CreateNotificationParams
): Promise<ServiceResult<SendNotificationResult>> {
  // Check if user is a super admin
  const isSuperAdmin = await checkIsSuperAdmin();
  if (!isSuperAdmin) {
    return { data: null, error: { message: 'Permission denied: Super admin access required' } };
  }

  const user = auth.currentUser;
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

  try {
    const notificationId = generateId();
    const now = new Date().toISOString();

    // Create notification record
    const notificationRef = doc(db, collections.notifications, notificationId);
    await setDoc(notificationRef, {
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
      created_by: user.uid,
      created_at: now,
    });

    // Resolve target users based on target type
    let targetUserIds: string[] = [];

    if (params.targetType === 'user') {
      targetUserIds = [params.targetUserId!];
    } else if (params.targetType === 'organisation') {
      // Get all users in the organisation
      const usersQuery = query(
        collection(db, collections.users),
        where('organisation_id', '==', params.targetOrganisationId)
      );
      const usersSnap = await getDocs(usersQuery);
      targetUserIds = usersSnap.docs.map(d => d.id);
    } else if (params.targetType === 'organisation_admins') {
      // Get only owners and admins in the organisation
      const usersQuery = query(
        collection(db, collections.users),
        where('organisation_id', '==', params.targetOrganisationId),
        where('role', 'in', ['owner', 'admin'])
      );
      const usersSnap = await getDocs(usersQuery);
      targetUserIds = usersSnap.docs.map(d => d.id);
    } else if (params.targetType === 'all_admins') {
      // Get all owners and admins across all organisations
      const adminsQuery = query(
        collection(db, collections.users),
        where('role', 'in', ['owner', 'admin'])
      );
      const adminsSnap = await getDocs(adminsQuery);
      targetUserIds = [...new Set(adminsSnap.docs.map(d => d.id))];
    } else {
      // 'all' - get all users
      const allUsersQuery = query(collection(db, collections.users));
      const allUsersSnap = await getDocs(allUsersQuery);
      targetUserIds = allUsersSnap.docs.map(d => d.id);
    }

    // Create notification receipts for all target users
    const batch = writeBatch(db);

    for (const userId of targetUserIds) {
      const receiptId = generateId();
      const receiptRef = doc(db, 'notification_receipts', receiptId);
      batch.set(receiptRef, {
        notification_id: notificationId,
        user_id: userId,
        created_at: now,
        read_at: null,
        dismissed_at: null,
      });
    }

    await batch.commit();

    // TODO: Send emails via Firebase Cloud Function if params.sendEmail

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
        sendEmail: params.sendEmail !== false,
        sendInApp: params.sendInApp !== false,
      }
    );

    return {
      data: {
        success: true,
        notification_id: notificationId,
        target_count: targetUserIds.length,
        emails_sent: 0, // TODO: Update when email sending is implemented
      },
      error: null,
    };
  } catch (err: any) {
    console.error('[Notifications] Error sending notification:', err);
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Get organisation list for targeting dropdown (super admin)
 */
export async function getOrganisationsForTargeting(): Promise<ServiceResult<Array<{ id: string; name: string }>>> {
  try {
    const orgsQuery = query(
      collection(db, collections.organisations),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(orgsQuery);

    const orgs = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    return { data: orgs, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}

/**
 * Search users for individual targeting (super admin)
 */
export async function searchUsersForTargeting(
  searchTerm: string
): Promise<ServiceResult<Array<{ id: string; name: string; email: string; organisation: string }>>> {
  try {
    // Fetch all users and filter client-side (Firestore doesn't support ilike)
    const usersQuery = query(
      collection(db, collections.users),
      firestoreLimit(100)
    );
    const usersSnap = await getDocs(usersQuery);

    const searchLower = searchTerm.toLowerCase();
    const results: Array<{ id: string; name: string; email: string; organisation: string }> = [];

    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      const fullName = data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim();

      if (fullName.toLowerCase().includes(searchLower) || (data.email || '').toLowerCase().includes(searchLower)) {
        // Get org name
        let orgName = 'No Organisation';
        if (data.organisation_id) {
          const orgRef = doc(db, collections.organisations, data.organisation_id);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            orgName = orgSnap.data().name || orgName;
          }
        }

        results.push({
          id: userDoc.id,
          name: fullName || 'Unknown',
          email: data.email || '',
          organisation: orgName,
        });

        if (results.length >= 20) break;
      }
    }

    return { data: results, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message } };
  }
}
