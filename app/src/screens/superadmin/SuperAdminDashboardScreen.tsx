/**
 * Super Admin Dashboard Screen
 * Enhanced dashboard with metrics, subscription breakdown, and attention items
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Icon } from '../../components/ui';
import { MetricCard, SubscriptionBreakdown, AttentionList } from '../../components/superadmin';
import {
  fetchDashboardMetrics,
  fetchSubscriptionBreakdown,
  fetchAttentionItems,
  fetchAuditLogs,
} from '../../services/superAdmin';
import type {
  DashboardMetrics,
  SubscriptionBreakdown as SubscriptionBreakdownType,
  AttentionItem,
  AuditLogEntry,
} from '../../types/superAdmin';
import type { SuperAdminStackParamList } from '../../navigation/SuperAdminNavigator';

type NavigationProp = NativeStackNavigationProp<SuperAdminStackParamList, 'SuperAdminDashboard'>;

export function SuperAdminDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { profile, impersonationContext, endImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionBreakdownType[]>([]);
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [metricsResult, subscriptionsResult, attentionResult, logsResult] = await Promise.all([
        fetchDashboardMetrics(),
        fetchSubscriptionBreakdown(),
        fetchAttentionItems(),
        fetchAuditLogs({}, 5, 0),
      ]);

      if (metricsResult.data) {
        setMetrics(metricsResult.data);
      }
      if (subscriptionsResult.data) {
        setSubscriptions(subscriptionsResult.data);
      }
      if (attentionResult.data) {
        setAttentionItems(attentionResult.data);
      }
      if (logsResult.data) {
        setRecentActivity(logsResult.data.logs);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEndImpersonation = async () => {
    const { error } = await endImpersonation();
    if (error) {
      console.error('Failed to end impersonation:', error);
    }
  };

  const handleAttentionItemPress = (item: AttentionItem) => {
    navigation.navigate('OrganisationDetail', { orgId: item.id });
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Impersonation Banner */}
      {impersonationContext?.isImpersonating && (
        <View style={styles.impersonationBanner}>
          <View style={styles.impersonationInfo}>
            <Icon name="eye" size={20} color={colors.warning} />
            <Text style={styles.impersonationText}>
              {`Impersonating: ${impersonationContext.impersonatedUserName || 'User'}${impersonationContext.impersonatedOrgName ? ` (${impersonationContext.impersonatedOrgName})` : ''}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.endImpersonationButton}
            onPress={handleEndImpersonation}
          >
            <Text style={styles.endImpersonationText}>End Session</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Super Admin</Text>
        <Text style={styles.nameText}>{profile?.full_name || 'Admin'}</Text>
      </View>

      {/* Primary Metrics Row */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="Organisations"
          value={metrics?.total_organisations || 0}
          icon="building-2"
          iconColor={colors.primary.DEFAULT}
          iconBgColor={colors.primary.light}
          change={metrics?.new_orgs_30d}
          changeLabel="last 30 days"
          onPress={() => navigation.navigate('OrganisationsList')}
        />
        <MetricCard
          label="Total Users"
          value={metrics?.total_users || 0}
          icon="users"
          iconColor={colors.success}
          iconBgColor={colors.success + '20'}
          change={metrics?.new_users_30d}
          changeLabel="last 30 days"
          onPress={() => navigation.navigate('UsersList')}
        />
      </View>

      {/* Secondary Metrics Row */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="Total Reports"
          value={metrics?.total_reports || 0}
          icon="file-text"
          iconColor={colors.warning}
          iconBgColor={colors.warning + '20'}
          change={metrics?.new_reports_30d}
          changeLabel="last 30 days"
          onPress={() => navigation.navigate('AllReportsList')}
        />
        <MetricCard
          label="Active Orgs"
          value={metrics?.active_orgs_7d || 0}
          icon="activity"
          iconColor="#8B5CF6"
          iconBgColor="#8B5CF620"
          changeLabel="last 7 days"
        />
      </View>

      {/* Report Status Row */}
      <View style={styles.metricsRow}>
        <MetricCard
          label="Completed"
          value={metrics?.reports_completed || 0}
          icon="check-circle"
          iconColor={colors.success}
          iconBgColor={colors.success + '15'}
        />
        <MetricCard
          label="In Progress"
          value={metrics?.reports_in_progress || 0}
          icon="clock"
          iconColor={colors.primary.DEFAULT}
          iconBgColor={colors.primary.light}
        />
        <MetricCard
          label="Templates"
          value={metrics?.total_templates || 0}
          icon="layout"
          iconColor={colors.neutral[500]}
          iconBgColor={colors.neutral[100]}
        />
      </View>

      {/* Subscription Breakdown */}
      <View style={styles.section}>
        <SubscriptionBreakdown data={subscriptions} />
      </View>

      {/* Attention Items */}
      <View style={styles.section}>
        <AttentionList
          items={attentionItems}
          onItemPress={handleAttentionItemPress}
        />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.actionCard, styles.actionCardPrimary]}
          onPress={() => navigation.navigate('CreateOrganisation')}
        >
          <Icon name="plus" size={24} color={colors.white} />
          <Text style={styles.actionTextPrimary}>Create Organisation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('OrganisationsList')}
        >
          <Icon name="building-2" size={24} color={colors.primary.DEFAULT} />
          <Text style={styles.actionText}>View Organisations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('UsersList')}
        >
          <Icon name="users" size={24} color={colors.primary.DEFAULT} />
          <Text style={styles.actionText}>View All Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AuditLogs')}
        >
          <Icon name="shield" size={24} color={colors.primary.DEFAULT} />
          <Text style={styles.actionText}>Audit Logs</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {recentActivity.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent activity</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {recentActivity.map((log) => (
            <View key={log.id} style={styles.activityItem}>
              <View style={styles.activityDot} />
              <View style={styles.activityContent}>
                <Text style={styles.activityAction}>{log.action_type}</Text>
                <Text style={styles.activityMeta}>
                  {`${log.action_category} - ${formatTimeAgo(log.created_at)}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
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
  impersonationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  impersonationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  impersonationText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  endImpersonationButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  endImpersonationText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  header: {
    marginBottom: spacing.lg,
  },
  welcomeText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameText: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  section: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadows.card,
  },
  actionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
  },
  actionCardPrimary: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  actionTextPrimary: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.white,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  activityList: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
    marginRight: spacing.sm,
    marginTop: 6,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  activityMeta: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
