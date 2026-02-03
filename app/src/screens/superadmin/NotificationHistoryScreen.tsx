/**
 * Notification History Screen (Super Admin)
 * View all sent notifications with delivery stats
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, Button } from '../../components/ui';
import { getSentNotifications } from '../../services/notifications';
import {
  getCategoryConfig,
  getPriorityConfig,
  type SentNotificationWithStats,
  type NotificationCategory,
  type NotificationPriority,
} from '../../types/notifications';

const PAGE_SIZE = 20;

export function NotificationHistoryScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<SentNotificationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await getSentNotifications(PAGE_SIZE, 0);
      if (result.data) {
        setNotifications(result.data);
        setHasMore(result.data.length >= PAGE_SIZE);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError('Failed to load notification history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const result = await getSentNotifications(PAGE_SIZE, notifications.length);
      if (result.data) {
        setNotifications((prev) => [...prev, ...result.data!]);
        setHasMore(result.data.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.error('Error loading more notifications:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

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
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getTargetLabel = (notification: SentNotificationWithStats): string => {
    if (notification.target_type === 'all') return 'All Users';
    if (notification.target_type === 'all_admins') return 'All Admins';
    if (notification.target_type === 'organisation') {
      return notification.target_organisation_name || 'Organisation';
    }
    if (notification.target_type === 'organisation_admins') {
      return `Admins: ${notification.target_organisation_name || 'Organisation'}`;
    }
    return 'Individual';
  };

  const getTargetIcon = (targetType: string): string => {
    if (targetType === 'all') return 'globe';
    if (targetType === 'all_admins') return 'shield';
    if (targetType === 'organisation' || targetType === 'organisation_admins') return 'building';
    return 'user';
  };

  const renderNotification = ({ item }: { item: SentNotificationWithStats }) => {
    const categoryConfig = getCategoryConfig(item.category as NotificationCategory);
    const priorityConfig = getPriorityConfig(item.priority as NotificationPriority);
    const readPercentage = item.recipient_count > 0
      ? Math.round((item.read_count / item.recipient_count) * 100)
      : 0;

    return (
      <View style={styles.notificationCard}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '15' }]}>
            <Icon name={categoryConfig.icon as any} size={12} color={categoryConfig.color} />
            <Text style={[styles.categoryText, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
          </View>
          <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Content */}
        <Text style={styles.notificationTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={3}>
          {item.message}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {/* Target */}
          <View style={styles.metaItem}>
            <Icon name={getTargetIcon(item.target_type) as any} size={14} color={colors.text.tertiary} />
            <Text style={styles.metaText}>{getTargetLabel(item)}</Text>
          </View>

          {/* Priority */}
          <View style={styles.metaItem}>
            <View style={[styles.priorityDot, { backgroundColor: priorityConfig.color }]} />
            <Text style={styles.metaText}>{priorityConfig.label}</Text>
          </View>

          {/* Delivery */}
          <View style={styles.metaItem}>
            {item.send_in_app && (
              <Icon name="bell" size={14} color={colors.text.tertiary} style={{ marginRight: 4 }} />
            )}
            {item.send_email && (
              <Icon name="mail" size={14} color={colors.text.tertiary} />
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.recipient_count}</Text>
            <Text style={styles.statLabel}>Recipients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.read_count}</Text>
            <Text style={styles.statLabel}>Read</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: readPercentage >= 50 ? colors.success : colors.text.secondary }]}>
              {readPercentage}%
            </Text>
            <Text style={styles.statLabel}>Open Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading notification history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Unable to Load</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button
          title="Try Again"
          onPress={loadData}
          variant="secondary"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No notifications sent</Text>
            <Text style={styles.emptySubtitle}>
              Notifications you send will appear here
            </Text>
            <Button
              title="Send Notification"
              onPress={() => (navigation as any).navigate('SendNotification')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        }
        ListHeaderComponent={
          notifications.length > 0 ? (
            <View style={styles.header}>
              <Text style={styles.resultCount}>
                {`Showing ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}${hasMore ? '+' : ''}`}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          hasMore && notifications.length > 0 ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
              ) : (
                <Text style={styles.loadMoreText}>Load more</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
      />

      {/* FAB */}
      {notifications.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => (navigation as any).navigate('SendNotification')}
        >
          <Icon name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.md,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  notificationCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
  timestamp: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  notificationTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  notificationMessage: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  loadMoreText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.elevated,
  },
});
