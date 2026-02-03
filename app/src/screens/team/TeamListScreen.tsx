import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TeamStackParamList } from '../../navigation/MainNavigator';
import { EmptyState, FullScreenLoader } from '../../components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import {
  fetchTeamMembers,
  fetchInvitations,
  updateMemberRole,
  removeMember,
  cancelInvitation,
  resendInvitation,
  TeamMember,
  Invitation,
  UserRole,
} from '../../services/team';

type NavigationProp = NativeStackNavigationProp<TeamStackParamList, 'TeamList'>;

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  user: 'User',
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: colors.primary.DEFAULT,
  admin: colors.success,
  user: colors.neutral[500],
};

export function TeamListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { organisation, user, role: currentUserRole } = useAuthStore();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Role edit modal
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!organisation?.id) return;

    const [membersResult, invitationsResult] = await Promise.all([
      fetchTeamMembers(organisation.id),
      fetchInvitations(organisation.id),
    ]);

    if (!membersResult.error) {
      setMembers(membersResult.data);
    }
    if (!invitationsResult.error) {
      setInvitations(invitationsResult.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, [organisation?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInvite = () => {
    navigation.navigate('InviteUser');
  };

  const handleEditRole = (member: TeamMember) => {
    // Can't edit owner's role, and can't edit your own role
    if (member.role === 'owner' || member.user_id === user?.id) {
      return;
    }
    setSelectedMember(member);
    setShowRoleModal(true);
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!selectedMember) return;

    const { error } = await updateMemberRole(selectedMember.id, newRole);
    if (error) {
      showNotification('Error', error.message);
    } else {
      loadData();
    }
    setShowRoleModal(false);
    setSelectedMember(null);
  };

  const handleRemoveMember = (member: TeamMember) => {
    // Can't remove owner or yourself
    if (member.role === 'owner' || member.user_id === user?.id) {
      return;
    }

    showDestructiveConfirm(
      'Remove Team Member',
      `Are you sure you want to remove ${member.user_profile?.full_name || 'this user'} from the team?`,
      async () => {
        const { error } = await removeMember(member.id);
        if (error) {
          showNotification('Error', error.message);
        } else {
          loadData();
        }
      },
      undefined,
      'Remove',
      'Cancel'
    );
  };

  const handleCancelInvitation = (invitation: Invitation) => {
    showDestructiveConfirm(
      'Cancel Invitation',
      `Cancel invitation for ${invitation.email}?`,
      async () => {
        const { error } = await cancelInvitation(invitation.id);
        if (error) {
          showNotification('Error', error.message);
        } else {
          loadData();
        }
      },
      undefined,
      'Yes, Cancel',
      'No'
    );
  };

  const handleResendInvitation = async (invitation: Invitation) => {
    const { error } = await resendInvitation(invitation.id);
    if (error) {
      showNotification('Error', error.message);
    } else {
      showNotification('Success', 'Invitation resent');
      loadData();
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMember = ({ item }: { item: TeamMember }) => {
    const isCurrentUser = item.user_id === user?.id;
    const isOwner = item.role === 'owner';
    const canEdit = currentUserRole === 'owner' || (currentUserRole === 'admin' && !isOwner);

    return (
      <View style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
            <Text style={[styles.avatarText, { color: ROLE_COLORS[item.role] }]}>
              {getInitials(item.user_profile?.full_name)}
            </Text>
          </View>

          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.user_profile?.full_name || 'Unknown User'}
              {isCurrentUser && <Text style={styles.youBadge}> (You)</Text>}
            </Text>
            <View style={styles.roleContainer}>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>
                  {ROLE_LABELS[item.role]}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {canEdit && !isCurrentUser && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditRole(item)}
            >
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => handleRemoveMember(item)}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderInvitation = ({ item }: { item: Invitation }) => {
    const expiresIn = Math.ceil(
      (new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    return (
      <View style={styles.invitationCard}>
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationEmail}>{item.email}</Text>
          <View style={styles.invitationMeta}>
            <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
              <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>
                {ROLE_LABELS[item.role]}
              </Text>
            </View>
            <Text style={styles.expiresText}>
              Expires in {expiresIn} {expiresIn === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        <View style={styles.invitationActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleResendInvitation(item)}
          >
            <Text style={styles.actionButtonText}>Resend</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleCancelInvitation(item)}
          >
            <Text style={styles.removeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRoleModal = () => (
    <Modal visible={showRoleModal} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowRoleModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Role</Text>
          <Text style={styles.modalSubtitle}>
            {selectedMember?.user_profile?.full_name || 'User'}
          </Text>

          {(['admin', 'user'] as UserRole[]).map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.modalOption,
                selectedMember?.role === role && styles.modalOptionSelected,
              ]}
              onPress={() => handleRoleChange(role)}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  selectedMember?.role === role && styles.modalOptionTextSelected,
                ]}
              >
                {ROLE_LABELS[role]}
              </Text>
              <Text style={styles.modalOptionDescription}>
                {role === 'admin'
                  ? 'Can manage templates, records, users, and view all reports'
                  : 'Can complete inspections and view own reports'}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowRoleModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return <FullScreenLoader message="Loading team..." />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>
                Team Members ({members.length})
              </Text>
              <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
                <Text style={styles.inviteButtonText}>+ Invite</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="users"
              title="No team members yet"
              description="Invite your team to start collaborating on inspections and reports."
              action={{ label: 'Invite team member', onPress: handleInvite }}
            />
          ) : null
        }
        ListFooterComponent={
          invitations.length > 0 ? (
            <View style={styles.invitationsSection}>
              <Text style={styles.sectionTitle}>
                Pending Invitations ({invitations.length})
              </Text>
              {invitations.map((inv) => (
                <View key={inv.id}>{renderInvitation({ item: inv })}</View>
              ))}
            </View>
          ) : null
        }
      />

      {renderRoleModal()}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  inviteButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  inviteButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  memberCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  memberInfo: {
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
    fontWeight: fontWeight.bold,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  youBadge: {
    fontWeight: fontWeight.regular,
    color: colors.text.secondary,
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
  memberActions: {
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
  removeButton: {
    backgroundColor: colors.danger + '10',
  },
  removeButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.danger,
  },
  invitationsSection: {
    marginTop: spacing.lg,
  },
  invitationCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
  },
  invitationInfo: {
    marginBottom: spacing.sm,
  },
  invitationEmail: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  invitationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  expiresText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  invitationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
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
    width: '100%',
    maxWidth: 400,
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.neutral[50],
  },
  modalOptionSelected: {
    backgroundColor: colors.primary.light,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  modalOptionText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  modalOptionTextSelected: {
    color: colors.primary.DEFAULT,
  },
  modalOptionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
});
