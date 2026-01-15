import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchAuditLogs } from '../../services/superAdmin';
import type { AuditLogEntry, AuditLogCategory } from '../../types/superAdmin';

const CATEGORY_ICONS: Record<AuditLogCategory, 'building-2' | 'user' | 'users' | 'file-text' | 'layout-template' | 'folder' | 'settings' | 'eye' | 'circle' | 'bell'> = {
  organisation: 'building-2',
  user: 'user',
  user_management: 'users',
  report: 'file-text',
  template: 'layout-template',
  record: 'folder',
  system: 'settings',
  impersonation: 'eye',
  notification: 'bell',
};

const CATEGORY_COLORS: Record<AuditLogCategory, string> = {
  organisation: colors.primary.DEFAULT,
  user: colors.success,
  user_management: colors.primary.dark,
  report: colors.warning,
  template: colors.primary.dark,
  record: colors.neutral[500],
  system: colors.neutral[700],
  impersonation: colors.danger,
  notification: colors.primary.DEFAULT,
};

export function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const LIMIT = 20;

  const loadData = useCallback(async (reset = true) => {
    try {
      const offset = reset ? 0 : logs.length;
      const result = await fetchAuditLogs({}, LIMIT, offset);

      if (result.data) {
        if (reset) {
          setLogs(result.data.logs);
        } else {
          setLogs((prev) => [...prev, ...result.data!.logs]);
        }
        setTotal(result.data.total);
        setHasMore(offset + result.data.logs.length < result.data.total);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [logs.length]);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadData(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatActionType = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderLog = ({ item }: { item: AuditLogEntry }) => {
    const category = item.action_category as AuditLogCategory;
    const iconName = CATEGORY_ICONS[category] ?? 'circle';
    const iconColor = CATEGORY_COLORS[category] || colors.neutral[500];

    return (
      <View style={styles.logCard}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName} size={20} color={iconColor} />
        </View>

        <View style={styles.logContent}>
          <Text style={styles.actionType}>{formatActionType(item.action_type)}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: iconColor + '15' }]}>
              <Text style={[styles.categoryText, { color: iconColor }]}>
                {category}
              </Text>
            </View>
            {item.target_table && (
              <Text style={styles.targetText}>
                {item.target_table}
              </Text>
            )}
          </View>

          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>

          {item.impersonating_user_id && (
            <View style={styles.impersonationNote}>
              <Icon name="eye" size={12} color={colors.warning} />
              <Text style={styles.impersonationText}>Action taken while impersonating</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading audit logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No audit logs</Text>
            <Text style={styles.emptySubtitle}>
              Super admin actions will appear here
            </Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {total} log{total !== 1 ? 's' : ''} total
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : null
        }
      />
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
  listContent: {
    padding: spacing.md,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logContent: {
    flex: 1,
  },
  actionType: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  targetText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  timestamp: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  impersonationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  impersonationText: {
    fontSize: fontSize.caption,
    color: colors.warning,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
});
