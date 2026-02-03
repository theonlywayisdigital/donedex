/**
 * Billing Screen
 * Displays subscription plan, usage, and billing management
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, Button, FullScreenLoader } from '../../components/ui';
import { useBillingStore } from '../../store/billingStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SettingsStackParamList } from '../../navigation/MainNavigator';
import { planToDisplay, type SubscriptionPlanDisplay } from '../../types/billing';

type BillingScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Billing'>;

interface Props {
  navigation: BillingScreenNavigationProp;
}

export function BillingScreen({ navigation }: Props) {
  const {
    billing,
    usage,
    plans,
    invoices,
    storageAddOn,
    isLoading,
    error,
    loadAll,
    loadInvoices,
    openCustomerPortal,
    createCheckoutSession,
    purchaseStorageAddOn,
    getTotalStorageGb,
    getAddonStorageGb,
    getPlansForDisplay,
  } = useBillingStore();

  // Derive computed values from billing object directly
  // (Zustand getters don't work reactively when destructured)
  const currentPlan = billing?.current_plan || null;
  const isTrialing = billing?.subscription_status === 'trialing';
  const trialDaysRemaining = billing?.trial_ends_at
    ? Math.ceil((new Date(billing.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const isPastDue = billing?.subscription_status === 'past_due';
  const isCanceled = billing?.subscription_status === 'canceled';

  const { organisation } = useAuthStore();
  const organisationId = organisation?.id;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    if (organisationId) {
      loadAll(organisationId);
    }
  }, [organisationId]);

  const handleRefresh = async () => {
    if (!organisationId) return;
    setIsRefreshing(true);
    await loadAll(organisationId);
    setIsRefreshing(false);
  };

  const handleManageBilling = async () => {
    setIsOpeningPortal(true);
    const { url, error } = await openCustomerPortal();

    if (error) {
      showNotification('Error', error);
      setIsOpeningPortal(false);
      return;
    }

    if (url) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showNotification('Error', 'Unable to open billing portal');
      }
    }
    setIsOpeningPortal(false);
  };

  const handleUpgrade = async () => {
    const proPlan = plans.find(p => p.slug === 'pro');
    if (!proPlan) return;

    const { url, error } = await createCheckoutSession(
      proPlan.id,
      'monthly',
      {
        successUrl: 'donedex://billing/success',
        cancelUrl: 'donedex://billing/cancel',
      }
    );

    if (error) {
      showNotification('Error', error);
      return;
    }

    if (url) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    }
  };

  const handlePurchaseStorage = async () => {
    const { url, error } = await purchaseStorageAddOn(
      1,
      'donedex://billing/success',
      'donedex://billing/cancel'
    );

    if (error) {
      showNotification('Error', error);
      return;
    }

    if (url) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    }
  };

  if (isLoading && !billing) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FullScreenLoader message="Loading billing..." />
      </SafeAreaView>
    );
  }

  const displayPlans = getPlansForDisplay();
  // Try to find in display plans first, fallback to transforming currentPlan
  const currentDisplayPlan: SubscriptionPlanDisplay | null = displayPlans.find(p => p.id === currentPlan?.id) || (currentPlan ? planToDisplay(currentPlan) : null);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Status Alerts */}
        {isPastDue && (
          <View style={styles.alertBanner}>
            <Icon name="alert-triangle" size={20} color={colors.danger} />
            <Text style={styles.alertText}>
              Your payment is past due. Please update your payment method.
            </Text>
          </View>
        )}

        {isTrialing && trialDaysRemaining !== null && (
          <View style={styles.trialBanner}>
            <Icon name="clock" size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.trialText}>
              {`${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} left in your free trial`}
            </Text>
          </View>
        )}

        {isCanceled && (
          <View style={styles.alertBanner}>
            <Icon name="x-circle" size={20} color={colors.warning} />
            <Text style={styles.alertText}>
              Your subscription has been canceled and will end soon.
            </Text>
          </View>
        )}

        {/* Current Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Plan</Text>
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>
                {currentDisplayPlan?.name || 'Free'}
              </Text>
              {isTrialing && (
                <View style={styles.trialBadge}>
                  <Text style={styles.trialBadgeText}>Trial</Text>
                </View>
              )}
            </View>
            <Text style={styles.planDescription}>
              {currentDisplayPlan?.description || 'Basic features for getting started'}
            </Text>

            {/* Features */}
            <View style={styles.featuresContainer}>
              {currentDisplayPlan && (
                <>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{`${currentDisplayPlan.isUnlimitedUsers ? 'Unlimited' : currentDisplayPlan.max_users} users`}</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Icon name="check" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{`${currentDisplayPlan.isUnlimitedRecords ? 'Unlimited' : currentDisplayPlan.max_records} records`}</Text>
                  </View>
                  {currentDisplayPlan.feature_ai_templates && (
                    <View style={styles.featureItem}>
                      <Icon name="check" size={16} color={colors.success} />
                      <Text style={styles.featureText}>AI Templates</Text>
                    </View>
                  )}
                  {currentDisplayPlan.feature_priority_support && (
                    <View style={styles.featureItem}>
                      <Icon name="check" size={16} color={colors.success} />
                      <Text style={styles.featureText}>Priority Support</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Upgrade Button (for free plans) */}
            {(!currentPlan || currentPlan.slug === 'free') && (
              <Button
                title="Upgrade to Pro"
                onPress={handleUpgrade}
                fullWidth
              />
            )}
          </View>
        </View>

        {/* Usage */}
        {usage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage</Text>
            <View style={styles.usageCard}>
              <UsageItem
                label="Team Members"
                current={usage.users.current}
                limit={usage.users.limit}
                percent={usage.users.percent}
                exceeded={usage.users.exceeded}
              />
              <UsageItem
                label="Records"
                current={usage.records.current}
                limit={usage.records.limit}
                percent={usage.records.percent}
                exceeded={usage.records.exceeded}
              />
              <UsageItem
                label="Monthly Reports"
                current={usage.reports.current}
                limit={usage.reports.limit}
                percent={usage.reports.percent}
                exceeded={usage.reports.exceeded}
              />
              <UsageItem
                label="Storage"
                current={usage.storage.current_gb}
                limit={usage.storage.limit_gb}
                percent={usage.storage.percent}
                exceeded={usage.storage.exceeded}
                formatValue={(val) => val === -1 ? 'Unlimited' : `${val} GB`}
              />
            </View>
          </View>
        )}

        {/* Storage Breakdown (Pro/Enterprise only) */}
        {usage && currentPlan && currentPlan.slug !== 'free' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Storage</Text>
            <View style={styles.storageCard}>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Plan storage</Text>
                <Text style={styles.storageValue}>{`${usage.storage.base_limit_gb} GB`}</Text>
              </View>
              {usage.storage.addon_gb > 0 && (
                <View style={styles.storageRow}>
                  <Text style={styles.storageLabel}>Add-on storage</Text>
                  <Text style={styles.storageValue}>{`${usage.storage.addon_gb} GB`}</Text>
                </View>
              )}
              <View style={[styles.storageRow, styles.storageTotalRow]}>
                <Text style={[styles.storageLabel, styles.storageTotalLabel]}>Total available</Text>
                <Text style={[styles.storageValue, styles.storageTotalValue]}>{`${usage.storage.limit_gb} GB`}</Text>
              </View>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Used</Text>
                <Text style={styles.storageValue}>{`${usage.storage.current_gb} GB`}</Text>
              </View>
              <Button
                title="Purchase more storage"
                onPress={handlePurchaseStorage}
                variant="secondary"
                fullWidth
                style={{ marginTop: spacing.md }}
              />
              <Text style={styles.storageNote}>10 GB blocks at £5/mo each</Text>
            </View>
          </View>
        )}

        {/* Per-User Pricing Breakdown */}
        {currentPlan && currentPlan.price_per_user_monthly_gbp > 0 && usage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
            <View style={styles.pricingCard}>
              <View style={styles.storageRow}>
                <Text style={styles.storageLabel}>Base plan</Text>
                <Text style={styles.storageValue}>{`\u00A3${(currentPlan.price_monthly_gbp / 100).toFixed(0)}/mo`}</Text>
              </View>
              {usage.users.current > (currentPlan.base_users_included || 0) && (
                <View style={styles.storageRow}>
                  <Text style={styles.storageLabel}>
                    {`${usage.users.current - (currentPlan.base_users_included || 0)} additional user${usage.users.current - (currentPlan.base_users_included || 0) !== 1 ? 's' : ''} x \u00A3${(currentPlan.price_per_user_monthly_gbp / 100).toFixed(0)}`}
                  </Text>
                  <Text style={styles.storageValue}>
                    {`\u00A3${((usage.users.current - (currentPlan.base_users_included || 0)) * currentPlan.price_per_user_monthly_gbp / 100).toFixed(0)}/mo`}
                  </Text>
                </View>
              )}
              <View style={[styles.storageRow, styles.storageTotalRow]}>
                <Text style={[styles.storageLabel, styles.storageTotalLabel]}>Estimated total</Text>
                <Text style={[styles.storageValue, styles.storageTotalValue]}>
                  {`\u00A3${((currentPlan.price_monthly_gbp + Math.max(0, usage.users.current - (currentPlan.base_users_included || 0)) * currentPlan.price_per_user_monthly_gbp) / 100).toFixed(0)}/mo`}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Billing Management */}
        {billing?.stripe_customer_id && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Billing</Text>
            <View style={styles.billingCard}>
              <TouchableOpacity
                style={styles.billingItem}
                onPress={handleManageBilling}
                disabled={isOpeningPortal}
              >
                <View style={styles.billingItemLeft}>
                  <Icon name="credit-card" size={20} color={colors.text.secondary} />
                  <Text style={styles.billingItemLabel}>
                    Payment Methods
                  </Text>
                </View>
                {isOpeningPortal ? (
                  <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                ) : (
                  <Icon name="external-link" size={20} color={colors.text.secondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.billingItem}
                onPress={handleManageBilling}
                disabled={isOpeningPortal}
              >
                <View style={styles.billingItemLeft}>
                  <Icon name="file-text" size={20} color={colors.text.secondary} />
                  <Text style={styles.billingItemLabel}>
                    Invoices & History
                  </Text>
                </View>
                <Icon name="external-link" size={20} color={colors.text.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.billingItem, { borderBottomWidth: 0 }]}
                onPress={handleManageBilling}
                disabled={isOpeningPortal}
              >
                <View style={styles.billingItemLeft}>
                  <Icon name="settings" size={20} color={colors.text.secondary} />
                  <Text style={styles.billingItemLabel}>
                    Manage Subscription
                  </Text>
                </View>
                <Icon name="external-link" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.billingNote}>
              Opens Stripe Customer Portal in browser
            </Text>
          </View>
        )}

        {/* Recent Invoices */}
        {invoices.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Invoices</Text>
            <View style={styles.invoicesCard}>
              {invoices.slice(0, 3).map((invoice) => (
                <View key={invoice.id} style={styles.invoiceItem}>
                  <View style={styles.invoiceInfo}>
                    <Text style={styles.invoiceAmount}>
                      {`${invoice.currency === 'gbp' ? '£' : '$'}${(invoice.amount_paid / 100).toFixed(2)}`}
                    </Text>
                    <Text style={styles.invoiceDate}>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.invoiceStatus,
                      invoice.status === 'paid' && styles.invoiceStatusPaid,
                    ]}
                  >
                    <Text
                      style={[
                        styles.invoiceStatusText,
                        invoice.status === 'paid' && styles.invoiceStatusTextPaid,
                      ]}
                    >
                      {invoice.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface UsageItemProps {
  label: string;
  current: number;
  limit: number;
  percent: number;
  exceeded: boolean;
  formatValue?: (value: number) => string;
}

function UsageItem({
  label,
  current,
  limit,
  percent,
  exceeded,
  formatValue,
}: UsageItemProps) {
  const isUnlimited = limit === -1;
  const displayCurrent = formatValue ? formatValue(current) : current;
  const displayLimit = formatValue ? formatValue(limit) : limit;

  return (
    <View style={styles.usageItem}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={[styles.usageValue, exceeded && styles.usageValueExceeded]}>
          {isUnlimited ? `${displayCurrent}` : `${displayCurrent} / ${displayLimit}`}
        </Text>
      </View>
      {!isUnlimited && (
        <View style={styles.usageBarContainer}>
          <View
            style={[
              styles.usageBar,
              exceeded && styles.usageBarExceeded,
              percent >= 80 && !exceeded && styles.usageBarWarning,
              { width: `${Math.min(percent, 100)}%` },
            ]}
          />
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  alertText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.caption,
    color: colors.danger,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  trialText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.caption,
    color: colors.primary.mid,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  trialBadge: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  planDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  featuresContainer: {
    marginBottom: spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  featureText: {
    marginLeft: spacing.sm,
    fontSize: fontSize.caption,
    color: colors.text.primary,
  },
  usageCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
  usageItem: {
    marginBottom: spacing.md,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  usageLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  usageValue: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  usageValueExceeded: {
    color: colors.danger,
  },
  usageBarContainer: {
    height: 6,
    backgroundColor: colors.border.light,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageBar: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 3,
  },
  usageBarWarning: {
    backgroundColor: colors.warning,
  },
  usageBarExceeded: {
    backgroundColor: colors.danger,
  },
  billingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  billingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  billingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billingItemLabel: {
    marginLeft: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  billingNote: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  invoicesCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  invoiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceAmount: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  invoiceDate: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  invoiceStatus: {
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  invoiceStatusPaid: {
    backgroundColor: '#D1FAE5',
  },
  invoiceStatusText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  invoiceStatusTextPaid: {
    color: colors.success,
  },
  storageCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
  storageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  storageTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
  },
  storageLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  storageTotalLabel: {
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  storageValue: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  storageTotalValue: {
    fontWeight: fontWeight.bold,
  },
  storageNote: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  pricingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
});
