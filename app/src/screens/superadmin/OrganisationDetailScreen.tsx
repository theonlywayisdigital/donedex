import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { showNotification, showConfirm } from '../../utils/alert';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Icon } from '../../components/ui';
import { fetchOrganisationDetails } from '../../services/superAdmin';
import type { UserSummary } from '../../types/superAdmin';
import type { SuperAdminStackParamList } from '../../navigation/SuperAdminNavigator';

type NavigationProp = NativeStackNavigationProp<SuperAdminStackParamList, 'OrganisationDetail'>;
type RouteProps = RouteProp<SuperAdminStackParamList, 'OrganisationDetail'>;

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  user: 'User',
};

const ROLE_COLORS: Record<string, string> = {
  owner: colors.primary.DEFAULT,
  admin: colors.success,
  user: colors.neutral[500],
};

export function OrganisationDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { orgId } = route.params;
  const { hasSuperAdminPermission, startImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organisation, setOrganisation] = useState<{ id: string; name: string; created_at: string } | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);

  const canImpersonate = hasSuperAdminPermission('impersonate_users');

  const loadData = useCallback(async () => {
    try {
      const result = await fetchOrganisationDetails(orgId);
      if (result.data) {
        setOrganisation(result.data.organisation);
        setUsers(result.data.users);
      }
    } catch (err) {
      console.error('Error loading organisation details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orgId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleImpersonate = async (user: UserSummary) => {
    showConfirm(
      'Start Impersonation',
      `You will now see the app as ${user.full_name || 'this user'} sees it. Their data will be visible and actions will be logged.`,
      async () => {
        const { error } = await startImpersonation(
          user.id,
          orgId,
          user.full_name || 'Unknown User',
          organisation?.name || 'Unknown Org'
        );
        if (error) {
          showNotification('Error', error);
        } else {
          showNotification('Impersonation Started', 'You are now impersonating this user. Navigate to other tabs to see their data.');
        }
      },
      undefined,
      'Impersonate',
      'Cancel'
    );
  };

  const handleViewUser = (user: UserSummary) => {
    navigation.navigate('UserDetail', { userId: user.id });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading organisation...</Text>
      </View>
    );
  }

  if (!organisation) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Organisation not found</Text>
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
      {/* Organisation Header */}
      <View style={styles.header}>
        <View style={styles.orgIcon}>
          <Icon name="building-2" size={32} color={colors.primary.DEFAULT} />
        </View>
        <Text style={styles.orgName}>{organisation.name}</Text>
        <Text style={styles.orgDate}>Created {formatDate(organisation.created_at)}</Text>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
      </View>

      {/* Users List */}
      <Text style={styles.sectionTitle}>Team Members ({users.length})</Text>
      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No users in this organisation</Text>
        </View>
      ) : (
        users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[user.role] + '20' }]}>
                <Text style={[styles.avatarText, { color: ROLE_COLORS[user.role] }]}>
                  {getInitials(user.full_name)}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{user.full_name || 'Unknown User'}</Text>
                <View style={styles.roleContainer}>
                  <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[user.role] + '20' }]}>
                    <Text style={[styles.roleText, { color: ROLE_COLORS[user.role] }]}>
                      {ROLE_LABELS[user.role]}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.userActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleViewUser(user)}
              >
                <Text style={styles.actionButtonText}>View</Text>
              </TouchableOpacity>
              {canImpersonate && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.impersonateButton]}
                  onPress={() => handleImpersonate(user)}
                >
                  <Icon name="eye" size={14} color={colors.warning} />
                  <Text style={styles.impersonateButtonText}>Impersonate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  orgIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  orgName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  orgDate: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    ...shadows.card,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  statLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
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
  userCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  roleContainer: {
    flexDirection: 'row',
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  actionButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  impersonateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '10',
  },
  impersonateButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
});
