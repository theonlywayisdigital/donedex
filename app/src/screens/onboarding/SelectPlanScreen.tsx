/**
 * Select Plan Screen
 * Displays subscription plans during onboarding
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useBillingStore } from '../../store/billingStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import type { BillingInterval, SubscriptionPlan } from '../../types/billing';
import { formatLimit } from '../../types/billing';

type SelectPlanScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'SelectPlan'
>;

interface Props {
  navigation: SelectPlanScreenNavigationProp;
}

export function SelectPlanScreen({ navigation }: Props) {
  const {
    selectedPlanId,
    billingInterval,
    setPlanSelection,
    saveToServer,
    isSaving,
  } = useOnboardingStore();

  const { plans, isLoadingPlans, loadPlans } = useBillingStore();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(selectedPlanId);
  const [interval, setInterval] = useState<BillingInterval>(billingInterval);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setError(null);
  };

  const handleContinue = async () => {
    if (!selectedPlan) {
      setError('Please select a plan to continue');
      return;
    }

    setError(null);

    // Update store
    setPlanSelection(selectedPlan, interval);

    // Save to server
    await saveToServer();

    // Navigate to payment (skip if free plan)
    const plan = plans.find((p) => p.id === selectedPlan);
    if (plan && (plan.price_monthly_gbp === 0 || plan.slug === 'free')) {
      navigation.navigate('InviteTeam');
    } else {
      navigation.navigate('Payment');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const formatPlanPrice = (plan: SubscriptionPlan) => {
    if (plan.price_monthly_gbp === 0) return 'Free';
    const basePrice = interval === 'monthly'
      ? plan.price_monthly_gbp
      : Math.round(plan.price_annual_gbp / 12);
    const perUserPrice = interval === 'monthly'
      ? plan.price_per_user_monthly_gbp
      : Math.round(plan.price_per_user_annual_gbp / 12);
    const base = `\u00A3${(basePrice / 100).toFixed(0)}/mo`;
    if (perUserPrice > 0) {
      return `${base} + \u00A3${(perUserPrice / 100).toFixed(0)}/user`;
    }
    return base;
  };

  if (isLoadingPlans) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading plans...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '43%' }]} />
          </View>
          <Text style={styles.progressText}>Step 3 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.subtitle}>
            Select the plan that best fits your needs. You can change this anytime.
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              interval === 'monthly' && styles.toggleOptionActive,
            ]}
            onPress={() => setInterval('monthly')}
          >
            <Text
              style={[
                styles.toggleText,
                interval === 'monthly' && styles.toggleTextActive,
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleOption,
              interval === 'annual' && styles.toggleOptionActive,
            ]}
            onPress={() => setInterval('annual')}
          >
            <Text
              style={[
                styles.toggleText,
                interval === 'annual' && styles.toggleTextActive,
              ]}
            >
              Annual
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Plans */}
        <View style={styles.plansContainer}>
          {plans.filter(p => p.is_public).map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.planCardSelected,
                plan.slug === 'pro' && styles.planCardPopular,
              ]}
              onPress={() => handleSelectPlan(plan.id)}
              activeOpacity={0.7}
            >
              {plan.slug === 'pro' && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{formatPlanPrice(plan)}</Text>
              </View>

              <Text style={styles.planDescription}>{plan.description}</Text>

              {/* Features */}
              <View style={styles.featuresContainer}>
                <FeatureItem text={`${formatLimit(plan.max_users)} users`} />
                <FeatureItem text={`${formatLimit(plan.max_storage_gb)} GB storage`} />
                <FeatureItem text={`${formatLimit(plan.max_reports_per_month)} reports/month`} />
                {plan.feature_photos && <FeatureItem text="Photos included" />}
                {plan.feature_all_field_types
                  ? <FeatureItem text="All 46 field types (9 categories)" />
                  : <FeatureItem text="Basic + Evidence fields (13 types)" />
                }
                {plan.feature_ai_templates && <FeatureItem text="AI Template Builder" />}
                {plan.feature_starter_templates && <FeatureItem text="Starter templates" />}
                {plan.feature_custom_branding && <FeatureItem text="Custom branding" />}
                {plan.feature_api_access && <FeatureItem text="API access" />}
                {plan.feature_priority_support && <FeatureItem text="Priority support" />}
              </View>

              {/* Selection indicator */}
              <View
                style={[
                  styles.radioOuter,
                  selectedPlan === plan.id && styles.radioOuterSelected,
                ]}
              >
                {selectedPlan === plan.id && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial Note */}
        <View style={styles.trialNote}>
          <Text style={styles.trialNoteText}>
            Pro plans include a 7-day free trial. Cancel anytime.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={handleContinue}
            loading={isSaving}
            fullWidth
          />
          <Button
            title="Back"
            onPress={handleBack}
            variant="ghost"
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureCheck}>✓</Text>
      <Text style={styles.featureText}>{text}</Text>
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
    flexGrow: 1,
    padding: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md - 2,
  },
  toggleOptionActive: {
    backgroundColor: colors.white,
  },
  toggleText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  toggleTextActive: {
    color: colors.text.primary,
  },
  saveBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginLeft: spacing.xs,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  plansContainer: {
    marginBottom: spacing.lg,
  },
  planCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  planCardPopular: {
    borderColor: colors.primary.DEFAULT,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  planName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  planPrice: {
    fontSize: fontSize.sectionTitle,
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
  featureCheck: {
    fontSize: fontSize.caption,
    color: colors.success,
    fontWeight: fontWeight.bold,
    marginRight: spacing.sm,
  },
  featureText: {
    fontSize: fontSize.caption,
    color: colors.text.primary,
  },
  radioOuter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  trialNote: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  trialNoteText: {
    fontSize: fontSize.caption,
    color: colors.primary.mid,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.md,
  },
});
