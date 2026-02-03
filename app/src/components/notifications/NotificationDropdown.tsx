/**
 * NotificationDropdown Component
 * Modal dropdown showing user's notifications
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../ui';
import {
  getUserNotifications,
  markNotificationRead,
  dismissNotification,
  markAllNotificationsRead,
  getUnreadNotificationCount,
} from '../../services/notifications';
import {
  getCategoryConfig,
  getPriorityConfig,
  type NotificationWithReceipt,
  type NotificationCategory,
  type NotificationPriority,
} from '../../types/notifications';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';

interface NotificationDropdownProps {
  visible: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function NotificationDropdown({
  visible,
  onClose,
  onCountChange,
}: NotificationDropdownProps) {
  const [notifications, setNotifications] = useState<NotificationWithReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const result = await getUserNotifications(15, 0);
      if (result.data) {
        setNotifications(result.data);
      }
    } catch (err) {
      console.error('[NotificationDropdown] Error loading notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const updateUnreadCount = useCallback(async () => {
    const count = await getUnreadNotificationCount();
    onCountChange?.(count);
  }, [onCountChange]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleNotificationPress = async (notification: NotificationWithReceipt) => {
    // Mark as read
    if (!notification.read_at) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      updateUnreadCount();
    }

    // Open action URL if present
    if (notification.action_url) {
      try {
        const canOpen = await Linking.canOpenURL(notification.action_url);
        if (canOpen) {
          await Linking.openURL(notification.action_url);
        }
      } catch (err) {
        console.error('[NotificationDropdown] Error opening URL:', err);
      }
    }
  };

  const handleDismiss = async (notificationId: string) => {
    await dismissNotification(notificationId);
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    updateUnreadCount();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_at: n.read_at || new Date().toISOString(),
      }))
    );
    updateUnreadCount();
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const renderNotification = ({ item }: { item: NotificationWithReceipt }) => {
    const categoryConfig = getCategoryConfig(item.category as NotificationCategory);
    const priorityConfig = getPriorityConfig(item.priority as NotificationPriority);
    const isUnread = !item.read_at;
    const isHighPriority = item.priority === 'high';

    return (
      <Pressable
        style={[
          styles.notificationItem,
          isUnread && styles.notificationItemUnread,
          isHighPriority && styles.notificationItemHighPriority,
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          {/* Category indicator */}
          <View style={[styles.categoryDot, { backgroundColor: categoryConfig.color }]} />

          {/* Main content */}
          <View style={styles.notificationMain}>
            <View style={styles.notificationHeader}>
              <Text
                style={[
                  styles.notificationTitle,
                  isUnread && styles.notificationTitleUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={styles.notificationTime}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
            {item.action_url && item.action_label && (
              <View style={styles.actionRow}>
                <Icon name="external-link" size={12} color={colors.primary.DEFAULT} />
                <Text style={styles.actionLabel}>{item.action_label}</Text>
              </View>
            )}
          </View>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => handleDismiss(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="x" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Unread indicator */}
        {isUnread && <View style={styles.unreadDot} />}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <Pressable
            style={styles.dropdown}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Notifications</Text>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    style={styles.markAllButton}
                    onPress={handleMarkAllRead}
                  >
                    <Icon name="check" size={16} color={colors.primary.DEFAULT} />
                    <Text style={styles.markAllText}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="x" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Loading notifications...</Text>
              </View>
            ) : notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={40} color={colors.neutral[300]} />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySubtitle}>
                  You're all caught up!
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderNotification}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  safeArea: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'flex-end',
  },
  dropdown: {
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    maxHeight: '80%',
    ...shadows.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  closeButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  notificationItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    position: 'relative',
  },
  notificationItemUnread: {
    backgroundColor: colors.primary.light + '30',
  },
  notificationItemHighPriority: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  notificationMain: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  notificationTitleUnread: {
    fontWeight: fontWeight.bold,
  },
  notificationTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  notificationMessage: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  actionLabel: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  dismissButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  unreadDot: {
    position: 'absolute',
    top: '50%',
    right: spacing.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
    transform: [{ translateY: -4 }],
  },
});
