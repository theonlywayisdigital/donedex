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
import { fetchUserDetails } from '../../services/superAdmin';
import type { UserSummary } from '../../types/superAdmin';
import type { SuperAdminStackParamList } from '../../navigation/SuperAdminNavigator';

type NavigationProp = NativeStackNavigationProp<SuperAdminStackParamList, 'UserDetail'>;
type RouteProps = RouteProp<SuperAdminStackParamList, 'UserDetail'>;

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

export function UserDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { hasSuperAdminPermission, startImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [organisations, setOrganisations] = useState<Array<{ id: string; name: string; role: string }>>([]);

  const canImpersonate = hasSuperAdminPermission('impersonate_users');

  const loadData = useCallback(async () => {
    try {
      const result = await fetchUserDetails(userId);
      if (result.data) {
        setUser(result.data.user);
        setOrganisations(result.data.organisations);
      }
    } catch (err) {
      console.error('Error loading user details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleImpersonate = async (org: { id: string; name: string; role: string }) => {
    if (!user) return;

    showConfirm(
      'Start Impersonation',
      `You will now see the app as ${user.full_name || 'this user'} sees it within ${org.name}. Their data will be visible and actions will be logged.`,
      async () => {
        const { error } = await startImpersonation(
          userId,
          org.id,
          user.full_name || 'Unknown User',
          org.name
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

  const handleViewOrganisation = (orgId: string) => {
    navigation.navigate('OrganisationDetail', { orgId });
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
        <Text style={styles.loadingText}>Loading user...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>User not found</Text>
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
      {/* User Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[user.role] + '20' }]}>
          <Text style={[styles.avatarText, { color: ROLE_COLORS[user.role] }]}>
            {getInitials(user.full_name)}
          </Text>
        </View>
        <Text style={styles.userName}>{user.full_name || 'Unknown User'}</Text>
        {user.created_at && (
          <Text style={styles.userDate}>Joined {formatDate(user.created_at)}</Text>
        )}
      </View>

      {/* Organisations */}
      <Text style={styles.sectionTitle}>Organisations ({organisations.length})</Text>
      {organisations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>User is not a member of any organisation</Text>
        </View>
      ) : (
        organisations.map((org) => (
          <View key={org.id} style={styles.orgCard}>
            <TouchableOpacity
              style={styles.orgHeader}
              onPress={() => handleViewOrganisation(org.id)}
            >
              <View style={styles.orgIcon}>
                <Icon name="building-2" size={24} color={colors.primary.DEFAULT} />
              </View>
              <View style={styles.orgDetails}>
                <Text style={styles.orgName}>{org.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[org.role] + '20' }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLORS[org.role] }]}>
                    {ROLE_LABELS[org.role]}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.neutral[300]} />
            </TouchableOpacity>

            {canImpersonate && (
              <View style={styles.orgActions}>
                <TouchableOpacity
                  style={styles.impersonateButton}
                  onPress={() => handleImpersonate(org)}
                >
                  <Icon name="eye" size={16} color={colors.warning} />
                  <Text style={styles.impersonateButtonText}>
                    Impersonate as {user.full_name?.split(' ')[0] || 'User'} in this org
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
  },
  userName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  userDate: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
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
  orgCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
    ...shadows.card,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  orgDetails: {
    flex: 1,
  },
  orgName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  orgActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    padding: spacing.md,
  },
  impersonateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warning + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  impersonateButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
});
