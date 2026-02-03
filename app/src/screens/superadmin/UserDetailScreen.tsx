import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { showNotification, showConfirm, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Icon } from '../../components/ui';
import { fetchUserDetails, removeUserFromOrganisation, deleteUserAccount, changeUserRole } from '../../services/superAdmin';
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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  owner: 'Full control including billing, settings, and user management',
  admin: 'Can manage templates, reports, and users but not billing',
  user: 'Can complete inspections and view reports only',
};

const ROLE_OPTIONS: Array<'owner' | 'admin' | 'user'> = ['owner', 'admin', 'user'];

export function UserDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { hasSuperAdminPermission, startImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserSummary | null>(null);
  const [organisations, setOrganisations] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [roleModalOrg, setRoleModalOrg] = useState<{ id: string; name: string; role: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | 'user'>('user');
  const [savingRole, setSavingRole] = useState(false);

  const canImpersonate = hasSuperAdminPermission('impersonate_users');
  const canEdit = hasSuperAdminPermission('edit_all_users');

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

  const handleRemoveFromOrg = (org: { id: string; name: string }) => {
    if (!user) return;

    showDestructiveConfirm(
      'Remove from Organisation',
      `Are you sure you want to remove ${user.full_name || 'this user'} from ${org.name}? They will lose access to all data in this organisation.`,
      async () => {
        const result = await removeUserFromOrganisation(userId, org.id);
        if (result.error) {
          showNotification('Error', result.error.message);
        } else {
          showNotification('Removed', `User removed from ${org.name}`);
          loadData();
        }
      },
      undefined,
      'Remove'
    );
  };

  const handleDeleteUser = () => {
    if (!user) return;

    showDestructiveConfirm(
      'Delete User Account',
      `Are you sure you want to permanently delete ${user.full_name || 'this user'}? This will:\n\n• Remove them from all organisations\n• Delete their profile\n• This action cannot be undone`,
      async () => {
        const result = await deleteUserAccount(userId);
        if (result.error) {
          showNotification('Error', result.error.message);
        } else {
          showNotification('Deleted', 'User account has been deleted');
          navigation.goBack();
        }
      },
      undefined,
      'Delete User'
    );
  };

  const handleOpenRoleModal = (org: { id: string; name: string; role: string }) => {
    setRoleModalOrg(org);
    setSelectedRole(org.role as 'owner' | 'admin' | 'user');
  };

  const handleSaveRole = async () => {
    if (!roleModalOrg || !user) return;
    if (selectedRole === roleModalOrg.role) {
      setRoleModalOrg(null);
      return;
    }

    setSavingRole(true);
    const result = await changeUserRole(userId, roleModalOrg.id, selectedRole);
    setSavingRole(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification(
        'Role changed',
        `${user.full_name || 'User'} is now ${ROLE_LABELS[selectedRole]} in ${roleModalOrg.name}`
      );
      setRoleModalOrg(null);
      loadData();
    }
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

      {/* Action Buttons */}
      {canEdit && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={handleDeleteUser}
          >
            <Icon name="trash-2" size={18} color={colors.danger} />
            <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete User</Text>
          </TouchableOpacity>
        </View>
      )}

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

            {(canImpersonate || canEdit) && (
              <View style={styles.orgActions}>
                {canImpersonate && (
                  <TouchableOpacity
                    style={styles.impersonateButton}
                    onPress={() => handleImpersonate(org)}
                  >
                    <Icon name="eye" size={16} color={colors.warning} />
                    <Text style={styles.impersonateButtonText}>
                      Impersonate as {user.full_name?.split(' ')[0] || 'User'} in this org
                    </Text>
                  </TouchableOpacity>
                )}
                {canEdit && (
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.changeRoleButton}
                      onPress={() => handleOpenRoleModal(org)}
                    >
                      <Icon name="shield" size={16} color={colors.primary.DEFAULT} />
                      <Text style={styles.changeRoleButtonText}>Change role</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveFromOrg(org)}
                    >
                      <Icon name="x-circle" size={16} color={colors.danger} />
                      <Text style={styles.removeButtonText}>Remove from this org</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ))
      )}
      {/* Role Change Modal */}
      <Modal
        visible={!!roleModalOrg}
        transparent
        animationType="fade"
        onRequestClose={() => setRoleModalOrg(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change role</Text>
              <TouchableOpacity onPress={() => setRoleModalOrg(null)}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {roleModalOrg && (
              <Text style={styles.modalSubtitle}>
                {`${user?.full_name || 'User'} in ${roleModalOrg.name}`}
              </Text>
            )}

            {roleModalOrg && (
              <Text style={styles.currentRoleText}>
                {`Current role: ${ROLE_LABELS[roleModalOrg.role]}`}
              </Text>
            )}

            <View style={styles.roleOptions}>
              {ROLE_OPTIONS.map((role) => {
                const isSelected = selectedRole === role;
                const isCurrent = roleModalOrg?.role === role;
                return (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      isSelected && styles.roleOptionSelected,
                    ]}
                    onPress={() => setSelectedRole(role)}
                  >
                    <View style={styles.roleOptionHeader}>
                      <View style={[styles.roleRadio, isSelected && styles.roleRadioSelected]}>
                        {isSelected && <View style={styles.roleRadioDot} />}
                      </View>
                      <Text style={[styles.roleOptionLabel, isSelected && styles.roleOptionLabelSelected]}>
                        {ROLE_LABELS[role]}
                      </Text>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.roleOptionDescription}>
                      {ROLE_DESCRIPTIONS[role]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRoleModalOrg(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  (savingRole || selectedRole === roleModalOrg?.role) && styles.modalSaveBtnDisabled,
                ]}
                onPress={handleSaveRole}
                disabled={savingRole || selectedRole === roleModalOrg?.role}
              >
                {savingRole ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.bold,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  actionBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  deleteBtn: {
    borderColor: colors.danger + '30',
    backgroundColor: colors.danger + '05',
  },
  deleteBtnText: {
    color: colors.danger,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  changeRoleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.light,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  changeRoleButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  removeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.danger + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  removeButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 440,
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  currentRoleText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  roleOptions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleOption: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  roleOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  roleOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  roleRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  roleRadioSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  roleRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  roleOptionLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  roleOptionLabelSelected: {
    color: colors.primary.DEFAULT,
  },
  roleOptionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginLeft: 28,
  },
  currentBadge: {
    backgroundColor: colors.neutral[200],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  currentBadgeText: {
    fontSize: fontSize.caption - 1,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
  },
  modalSaveBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
