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
import { fetchAllSuperAdmins } from '../../services/superAdmin';
import type { SuperAdminWithPermissions } from '../../types/superAdmin';
import { PERMISSION_LABELS } from '../../types/superAdmin';

export function SuperAdminTeamScreen() {
  const [superAdmins, setSuperAdmins] = useState<SuperAdminWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchAllSuperAdmins();
      if (result.data) {
        setSuperAdmins(result.data);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      console.error('Error loading super admins:', err);
      setError('Failed to load super admin team');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getPermissionCount = (permissions: string[]) => {
    const total = 13; // Total available permissions
    return `${permissions.length}/${total}`;
  };

  const renderSuperAdmin = ({ item }: { item: SuperAdminWithPermissions }) => (
    <View style={styles.adminCard}>
      <View style={styles.adminHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>{item.name}</Text>
          <Text style={styles.adminEmail}>{item.email}</Text>
        </View>
        <View style={[styles.statusBadge, item.is_active ? styles.statusActive : styles.statusInactive]}>
          <Text style={[styles.statusText, item.is_active ? styles.statusTextActive : styles.statusTextInactive]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Icon name="calendar" size={14} color={colors.text.tertiary} />
          <Text style={styles.metaText}>Added {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Icon name="shield" size={14} color={colors.text.tertiary} />
          <Text style={styles.metaText}>{getPermissionCount(item.permissions)} permissions</Text>
        </View>
      </View>

      {item.permissions.length > 0 && (
        <View style={styles.permissionsSection}>
          <Text style={styles.permissionsLabel}>Permissions</Text>
          <View style={styles.permissionsList}>
            {item.permissions.slice(0, 4).map((perm) => (
              <View key={perm} style={styles.permissionBadge}>
                <Text style={styles.permissionText}>{PERMISSION_LABELS[perm] || perm}</Text>
              </View>
            ))}
            {item.permissions.length > 4 && (
              <View style={styles.permissionBadge}>
                <Text style={styles.permissionText}>+{item.permissions.length - 4} more</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading super admin team...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Access Denied</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          You need the "Manage Super Admins" permission to view this page.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={superAdmins}
        keyExtractor={(item) => item.id}
        renderItem={renderSuperAdmin}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="shield" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No super admins found</Text>
            <Text style={styles.emptySubtitle}>
              Super admin accounts must be created via database access.
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.resultCount}>
              {superAdmins.length} super admin{superAdmins.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.headerNote}>
              Super admin accounts have cross-organisation access and are managed separately from regular users.
            </Text>
          </View>
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
  errorHint: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  headerNote: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    lineHeight: 18,
  },
  adminCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.danger + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  adminEmail: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusActive: {
    backgroundColor: colors.success + '20',
  },
  statusInactive: {
    backgroundColor: colors.neutral[200],
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  statusTextActive: {
    color: colors.success,
  },
  statusTextInactive: {
    color: colors.text.tertiary,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  permissionsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  permissionsLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  permissionBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  permissionText: {
    fontSize: 11,
    color: colors.text.secondary,
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
});
