import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { showNotification, showConfirm, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { Icon } from '../../components/ui';
import {
  fetchOrganisationDetails,
  updateOrganisation,
  setOrganisationPlan,
  archiveOrganisation,
  restoreOrganisation,
  deleteOrganisationPermanently,
  fetchSubscriptionPlans,
  blockOrganisation,
  unblockOrganisation,
  fetchOrganisationUsage,
  fetchBillingHistory,
  type OrganisationUsage,
  type BillingHistoryEntry,
} from '../../services/superAdmin';
import { fetchBillingStatus } from '../../services/billing';
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

interface OrganisationData {
  id: string;
  name: string;
  created_at: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  archived?: boolean;
  archived_at?: string | null;
  blocked?: boolean;
  blocked_at?: string | null;
  blocked_reason?: string | null;
}

interface BillingData {
  plan_name: string | null;
  plan_slug: string | null;
  plan_id: string | null;
  subscription_status: string | null;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
}

export function OrganisationDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { orgId } = route.params;
  const { hasSuperAdminPermission, startImpersonation } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [usage, setUsage] = useState<OrganisationUsage | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistoryEntry[]>([]);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Billing form state
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState('');

  // Delete confirmation state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canEdit = hasSuperAdminPermission('edit_all_organisations');
  const canImpersonate = hasSuperAdminPermission('impersonate_users');

  const loadData = useCallback(async () => {
    try {
      const result = await fetchOrganisationDetails(orgId);
      console.log('fetchOrganisationDetails result:', result);
      if (result.error) {
        console.error('Error fetching org:', result.error);
      }
      if (result.data) {
        setOrganisation(result.data.organisation as OrganisationData);
        setUsers(result.data.users);
      }

      // Load billing info
      const billingResult = await fetchBillingStatus(orgId);
      if (billingResult.data) {
        setBilling({
          plan_name: billingResult.data.plan?.name || null,
          plan_slug: billingResult.data.plan?.slug || null,
          plan_id: billingResult.data.plan?.id || null,
          subscription_status: billingResult.data.subscription_status,
          trial_ends_at: billingResult.data.trial_ends_at,
          subscription_ends_at: billingResult.data.subscription_ends_at,
        });
      }

      // Load usage stats
      const usageResult = await fetchOrganisationUsage(orgId);
      if (usageResult.data) {
        setUsage(usageResult.data);
      }

      // Load billing history
      const historyResult = await fetchBillingHistory(orgId);
      if (historyResult.data) {
        setBillingHistory(historyResult.data);
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
          organisation?.name || 'Unknown Org',
          user.role === 'super_admin' ? 'owner' : user.role
        );
        if (error) {
          showNotification('Error', error);
        } else {
          showNotification('Impersonation Started', 'You are now impersonating this user.');
          // Navigate to Dashboard to see the impersonated org's view
          (navigation as any).navigate('Dashboard');
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

  const handleViewAsOrg = () => {
    // Find the owner, or first admin, or first user
    const owner = users.find((u) => u.role === 'owner');
    const admin = users.find((u) => u.role === 'admin');
    const targetUser = owner || admin || users[0];

    if (!targetUser) {
      showNotification('Error', 'No users found in this organisation');
      return;
    }

    showConfirm(
      'View as Organisation',
      `You will impersonate ${targetUser.full_name || 'the organisation owner'} to see the app as they see it. Actions will be logged.`,
      async () => {
        const { error } = await startImpersonation(
          targetUser.id,
          orgId,
          targetUser.full_name || 'Unknown User',
          organisation?.name || 'Unknown Org',
          targetUser.role === 'super_admin' ? 'owner' : targetUser.role
        );
        if (error) {
          showNotification('Error', error);
        } else {
          showNotification('Viewing as Organisation', `You are now viewing as ${organisation?.name}`);
          // Navigate to Dashboard to see the impersonated org's view
          (navigation as any).navigate('Dashboard');
        }
      },
      undefined,
      'View as Org',
      'Cancel'
    );
  };

  // Edit handlers
  const openEditModal = () => {
    if (!organisation) return;
    setEditName(organisation.name);
    setEditEmail(organisation.contact_email || '');
    setEditPhone(organisation.contact_phone || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showNotification('Error', 'Organisation name is required');
      return;
    }

    setSaving(true);
    const result = await updateOrganisation(orgId, {
      name: editName.trim(),
      contact_email: editEmail.trim() || null,
      contact_phone: editPhone.trim() || null,
    });
    setSaving(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Success', 'Organisation updated');
      setShowEditModal(false);
      loadData();
    }
  };

  // Billing handlers
  const openBillingModal = async () => {
    const plansResult = await fetchSubscriptionPlans();
    if (plansResult.data) {
      setPlans(plansResult.data);
    }
    setSelectedPlanId(billing?.plan_id || null);
    setTrialEndsAt(billing?.trial_ends_at?.split('T')[0] || '');
    setShowBillingModal(true);
  };

  const handleSaveBilling = async () => {
    setSaving(true);
    const result = await setOrganisationPlan(orgId, {
      planId: selectedPlanId,
      trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
      subscriptionStatus: 'active',
    });
    setSaving(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Success', 'Billing updated');
      setShowBillingModal(false);
      loadData();
    }
  };

  // Delete handlers
  const handleArchive = async () => {
    setSaving(true);
    const result = await archiveOrganisation(orgId);
    setSaving(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Archived', 'Organisation has been archived');
      setShowDeleteModal(false);
      navigation.goBack();
    }
  };

  const handleRestore = async () => {
    setSaving(true);
    const result = await restoreOrganisation(orgId);
    setSaving(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Restored', 'Organisation has been restored');
      loadData();
    }
  };

  // Block handlers
  const handleBlock = async () => {
    if (!blockReason.trim()) {
      showNotification('Error', 'Please provide a reason for blocking');
      return;
    }

    setSaving(true);
    const result = await blockOrganisation(orgId, blockReason.trim());
    setSaving(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Blocked', 'Organisation has been blocked');
      setShowBlockModal(false);
      setBlockReason('');
      loadData();
    }
  };

  const handleUnblock = async () => {
    setSaving(true);
    const result = await unblockOrganisation(orgId);
    setSaving(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Unblocked', 'Organisation has been unblocked');
      loadData();
    }
  };

  const handlePermanentDelete = async () => {
    if (deleteConfirmText !== organisation?.name) {
      showNotification('Error', 'Please type the organisation name to confirm');
      return;
    }

    setDeleting(true);
    const result = await deleteOrganisationPermanently(orgId);
    setDeleting(false);

    if (result.error) {
      showNotification('Error', result.error.message);
    } else {
      showNotification('Deleted', 'Organisation has been permanently deleted');
      setShowDeleteModal(false);
      navigation.goBack();
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
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
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

  const isArchived = organisation.archived;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Archived Banner */}
        {isArchived && (
          <View style={styles.archivedBanner}>
            <Icon name="inbox" size={16} color={colors.warning} />
            <Text style={styles.archivedText}>This organisation is archived</Text>
            {canEdit && (
              <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
                <Text style={styles.restoreButtonText}>Restore</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Blocked Banner */}
        {organisation.blocked && (
          <View style={styles.blockedBanner}>
            <Icon name="x-circle" size={16} color={colors.danger} />
            <View style={styles.blockedContent}>
              <Text style={styles.blockedText}>This organisation is blocked</Text>
              {organisation.blocked_reason && (
                <Text style={styles.blockedReason}>{organisation.blocked_reason}</Text>
              )}
            </View>
            {canEdit && (
              <TouchableOpacity style={styles.unblockButton} onPress={handleUnblock}>
                <Text style={styles.unblockButtonText}>Unblock</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Organisation Header */}
        <View style={styles.header}>
          <View style={styles.orgIcon}>
            <Icon name="building-2" size={32} color={colors.primary.DEFAULT} />
          </View>
          <Text style={styles.orgName}>{organisation.name}</Text>
          <Text style={styles.orgDate}>Created {formatDate(organisation.created_at)}</Text>
        </View>

        {/* Action Buttons */}
        {!isArchived && (
          <View style={styles.actionButtons}>
            {canImpersonate && users.length > 0 && (
              <TouchableOpacity style={[styles.actionBtn, styles.viewAsBtn]} onPress={handleViewAsOrg}>
                <Icon name="eye" size={18} color={colors.warning} />
                <Text style={[styles.actionBtnText, styles.viewAsBtnText]}>View as Org</Text>
              </TouchableOpacity>
            )}
            {canEdit && (
              <>
                <TouchableOpacity style={styles.actionBtn} onPress={openEditModal}>
                  <Icon name="edit" size={18} color={colors.primary.DEFAULT} />
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={openBillingModal}>
                  <Icon name="credit-card" size={18} color={colors.primary.DEFAULT} />
                  <Text style={styles.actionBtnText}>Billing</Text>
                </TouchableOpacity>
                {!organisation.blocked && (
                  <TouchableOpacity style={[styles.actionBtn, styles.blockBtn]} onPress={() => setShowBlockModal(true)}>
                    <Icon name="x-circle" size={18} color={colors.danger} />
                    <Text style={[styles.actionBtnText, styles.blockBtnText]}>Block</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => setShowDeleteModal(true)}>
                  <Icon name="trash-2" size={18} color={colors.danger} />
                  <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Subscription Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plan</Text>
              <View style={[styles.planBadge, { backgroundColor: billing?.plan_slug === 'pro' ? colors.success + '20' : colors.neutral[100] }]}>
                <Text style={[styles.planBadgeText, { color: billing?.plan_slug === 'pro' ? colors.success : colors.text.secondary }]}>
                  {billing?.plan_name || 'Free'}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>{billing?.subscription_status || 'Active'}</Text>
            </View>
            {billing?.trial_ends_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trial ends</Text>
                <Text style={styles.infoValue}>{formatDate(billing.trial_ends_at)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info */}
        {(organisation.contact_email || organisation.contact_phone) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <View style={styles.infoCard}>
              {organisation.contact_email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{organisation.contact_email}</Text>
                </View>
              )}
              {organisation.contact_phone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{organisation.contact_phone}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Usage & Limits */}
        {usage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage & Limits</Text>
            <View style={styles.infoCard}>
              {/* Users */}
              <View style={styles.usageRow}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageLabel}>Users</Text>
                  <Text style={styles.usageValue}>
                    {usage.limits.users === -1
                      ? `${usage.userCount} (unlimited)`
                      : `${usage.userCount} / ${usage.limits.users}`}
                  </Text>
                </View>
                {usage.limits.users !== -1 && (
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min((usage.userCount / usage.limits.users) * 100, 100)}%`,
                          backgroundColor:
                            usage.userCount >= usage.limits.users
                              ? colors.danger
                              : usage.userCount >= usage.limits.users * 0.8
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {/* Reports */}
              <View style={styles.usageRow}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageLabel}>Reports</Text>
                  <Text style={styles.usageValue}>
                    {usage.limits.reports === -1
                      ? `${usage.reportCount} (unlimited)`
                      : `${usage.reportCount} / ${usage.limits.reports}`}
                  </Text>
                </View>
                {usage.limits.reports !== -1 && (
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min((usage.reportCount / usage.limits.reports) * 100, 100)}%`,
                          backgroundColor:
                            usage.reportCount >= usage.limits.reports
                              ? colors.danger
                              : usage.reportCount >= usage.limits.reports * 0.8
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>

              {/* Storage */}
              <View style={styles.usageRow}>
                <View style={styles.usageHeader}>
                  <Text style={styles.usageLabel}>Storage</Text>
                  <Text style={styles.usageValue}>
                    {usage.limits.storageGb === -1
                      ? `${(usage.storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB (unlimited)`
                      : `${(usage.storageUsedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB / ${usage.limits.storageGb} GB`}
                  </Text>
                </View>
                {usage.limits.storageGb !== -1 && (
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBar,
                        {
                          width: `${Math.min((usage.storageUsedBytes / (usage.limits.storageGb * 1024 * 1024 * 1024)) * 100, 100)}%`,
                          backgroundColor:
                            usage.storageUsedBytes >= usage.limits.storageGb * 1024 * 1024 * 1024
                              ? colors.danger
                              : usage.storageUsedBytes >= usage.limits.storageGb * 1024 * 1024 * 1024 * 0.8
                              ? colors.warning
                              : colors.success,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Billing History */}
        {billingHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing History</Text>
            <View style={styles.infoCard}>
              {billingHistory.slice(0, 5).map((entry) => (
                <View key={entry.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{formatDate(entry.createdAt)}</Text>
                  <Text style={styles.historyEvent}>
                    {entry.eventType === 'plan_change'
                      ? `Plan changed: ${(entry.previousValue as any)?.plan_name || 'None'} → ${(entry.newValue as any)?.plan_name || 'None'}`
                      : entry.eventType === 'trial_extended'
                      ? `Trial extended to ${formatDate((entry.newValue as any)?.trial_ends_at)}`
                      : entry.eventType === 'status_change'
                      ? `Status changed: ${(entry.previousValue as any)?.status || 'N/A'} → ${(entry.newValue as any)?.status || 'N/A'}`
                      : entry.eventType}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

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
                  style={styles.userActionButton}
                  onPress={() => handleViewUser(user)}
                >
                  <Text style={styles.userActionButtonText}>View</Text>
                </TouchableOpacity>
                {canImpersonate && (
                  <TouchableOpacity
                    style={[styles.userActionButton, styles.impersonateButton]}
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

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Organisation</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Organisation name"
              placeholderTextColor={colors.text.tertiary}
            />

            <Text style={styles.inputLabel}>Contact Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="contact@example.com"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+44 123 456 7890"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Billing Modal */}
      <Modal visible={showBillingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Billing</Text>
              <TouchableOpacity onPress={() => setShowBillingModal(false)}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Current Plan: {billing?.plan_name || 'Free'}</Text>

            <Text style={styles.inputLabel}>Change Plan</Text>
            <View style={styles.planSelector}>
              {plans.map((plan) => (
                <TouchableOpacity
                  key={plan.id}
                  style={[
                    styles.planOption,
                    selectedPlanId === plan.id && styles.planOptionSelected,
                  ]}
                  onPress={() => setSelectedPlanId(plan.id)}
                >
                  <Text
                    style={[
                      styles.planOptionText,
                      selectedPlanId === plan.id && styles.planOptionTextSelected,
                    ]}
                  >
                    {plan.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Trial End Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={trialEndsAt}
              onChangeText={setTrialEndsAt}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.tertiary}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowBillingModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.disabledButton]}
                onPress={handleSaveBilling}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Apply Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Organisation</Text>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.deleteWarning}>Choose an action:</Text>

            {/* Archive Option */}
            <TouchableOpacity style={styles.deleteOption} onPress={handleArchive}>
              <View style={styles.deleteOptionIcon}>
                <Icon name="inbox" size={24} color={colors.warning} />
              </View>
              <View style={styles.deleteOptionContent}>
                <Text style={styles.deleteOptionTitle}>Archive Organisation</Text>
                <Text style={styles.deleteOptionDesc}>
                  Organisation will be hidden but can be restored later. All data preserved.
                </Text>
              </View>
            </TouchableOpacity>

            {/* Permanent Delete Option */}
            <View style={styles.permanentDeleteSection}>
              <View style={styles.deleteOption}>
                <View style={[styles.deleteOptionIcon, { backgroundColor: colors.danger + '20' }]}>
                  <Icon name="trash-2" size={24} color={colors.danger} />
                </View>
                <View style={styles.deleteOptionContent}>
                  <Text style={[styles.deleteOptionTitle, { color: colors.danger }]}>
                    Permanently Delete
                  </Text>
                  <Text style={styles.deleteOptionDesc}>
                    All data will be permanently removed. This cannot be undone.
                  </Text>
                </View>
              </View>

              <Text style={styles.confirmLabel}>
                Type "{organisation.name}" to confirm:
              </Text>
              <TextInput
                style={[styles.input, styles.confirmInput]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={organisation.name}
                placeholderTextColor={colors.text.tertiary}
              />

              <TouchableOpacity
                style={[
                  styles.permanentDeleteButton,
                  deleteConfirmText !== organisation.name && styles.disabledButton,
                ]}
                onPress={handlePermanentDelete}
                disabled={deleteConfirmText !== organisation.name || deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.permanentDeleteButtonText}>Delete Permanently</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Block Modal */}
      <Modal visible={showBlockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block Organisation</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(false)}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.blockWarning}>
              <Icon name="alert-triangle" size={20} color={colors.warning} />
              <Text style={styles.blockWarningText}>
                Blocking this organisation will prevent all users from accessing their account.
                They will see a blocked message when trying to log in.
              </Text>
            </View>

            <Text style={styles.inputLabel}>Reason for blocking *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={blockReason}
              onChangeText={setBlockReason}
              placeholder="e.g., Non-payment, Terms violation, etc."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowBlockModal(false);
                  setBlockReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.blockButton, (!blockReason.trim() || saving) && styles.disabledButton]}
                onPress={handleBlock}
                disabled={!blockReason.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.blockButtonText}>Block Organisation</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  archivedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  archivedText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  restoreButton: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  restoreButtonText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
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
  viewAsBtn: {
    borderColor: colors.warning + '30',
    backgroundColor: colors.warning + '10',
  },
  viewAsBtnText: {
    color: colors.warning,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  planBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  planBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
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
  userActionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  userActionButtonText: {
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  inputLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
  planSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  planOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
  },
  planOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  planOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  planOptionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
  deleteWarning: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  deleteOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  deleteOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteOptionContent: {
    flex: 1,
  },
  deleteOptionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  deleteOptionDesc: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  permanentDeleteSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  confirmLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  confirmInput: {
    borderColor: colors.danger + '50',
  },
  permanentDeleteButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  permanentDeleteButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  // Blocked banner styles
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.danger + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  blockedContent: {
    flex: 1,
  },
  blockedText: {
    fontSize: fontSize.body,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  blockedReason: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  unblockButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  unblockButtonText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  // Block button styles
  blockBtn: {
    borderColor: colors.danger + '30',
    backgroundColor: colors.danger + '05',
  },
  blockBtnText: {
    color: colors.danger,
  },
  // Usage section styles
  usageRow: {
    marginBottom: spacing.md,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  usageValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Billing history styles
  historyRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  historyDate: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  historyEvent: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  // Block modal styles
  blockWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  blockWarningText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.warning,
    lineHeight: 20,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  blockButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 140,
    alignItems: 'center',
  },
  blockButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
