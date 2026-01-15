/**
 * Payment Screen
 * Handles Stripe Checkout redirect for paid plans
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useBillingStore } from '../../store/billingStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type PaymentScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'Payment'
>;

interface Props {
  navigation: PaymentScreenNavigationProp;
}

export function PaymentScreen({ navigation }: Props) {
  const {
    selectedPlanId,
    billingInterval,
    organisationId,
  } = useOnboardingStore();

  const { plans, createCheckoutSession } = useBillingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  const getPrice = () => {
    if (!selectedPlan) return '—';
    const priceInPence = billingInterval === 'monthly'
      ? selectedPlan.price_monthly_gbp
      : selectedPlan.price_annual_gbp;
    return `£${(priceInPence / 100).toFixed(0)}`;
  };

  const handleStartTrial = async () => {
    if (!selectedPlanId) {
      setError('No plan selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create checkout session
      const { url, error: checkoutError } = await createCheckoutSession(
        selectedPlanId,
        billingInterval,
        // Success and cancel URLs would be deep links back to the app
        'donedex://onboarding/payment-success',
        'donedex://onboarding/payment-cancel'
      );

      if (checkoutError) {
        setError(checkoutError);
        setIsLoading(false);
        return;
      }

      if (url) {
        // Open Stripe Checkout in browser
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          // Note: The app will handle the return via deep linking
          // For now, we'll navigate forward optimistically
          // In production, you'd listen for the deep link callback
        } else {
          setError('Unable to open payment page');
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Payment error:', err);
      setError('Failed to start payment process');
      setIsLoading(false);
    }
  };

  const handleSkipPayment = () => {
    // For demo/development - skip payment and continue
    navigation.navigate('InviteTeam');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '57%' }]} />
          </View>
          <Text style={styles.progressText}>Step 4 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Start your free trial</Text>
          <Text style={styles.subtitle}>
            Your 7-day free trial starts today. You won't be charged until the trial ends.
          </Text>
        </View>

        {/* Plan Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>
              {selectedPlan?.name || 'Selected Plan'}
            </Text>
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>7-day free trial</Text>
            </View>
          </View>

          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Plan</Text>
              <Text style={styles.summaryValue}>
                {selectedPlan?.name || '—'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Billing</Text>
              <Text style={styles.summaryValue}>
                {billingInterval === 'monthly' ? 'Monthly' : 'Yearly'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Price after trial</Text>
              <Text style={styles.summaryValue}>
                {`${getPrice()}/${billingInterval === 'monthly' ? 'month' : 'year'}`}
              </Text>
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <Text style={styles.summaryFooterText}>
              Today's charge: <Text style={styles.summaryFooterBold}>£0.00</Text>
            </Text>
          </View>
        </View>

        {/* Benefits */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>What's included in your trial:</Text>
          <BenefitItem text="Full access to all Pro features" />
          <BenefitItem text="Unlimited team members during trial" />
          <BenefitItem text="Cancel anytime, no questions asked" />
          <BenefitItem text="No credit card charged until trial ends" />
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Text style={styles.securityIcon}>🔒</Text>
          <Text style={styles.securityText}>
            Secure payment powered by Stripe. Your card details are never stored on our servers.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Continue to Payment"
            onPress={handleStartTrial}
            loading={isLoading}
            fullWidth
            
          />

          {/* Dev/Demo skip button */}
          {__DEV__ && (
            <Button
              title="Skip Payment (Dev Only)"
              onPress={handleSkipPayment}
              variant="ghost"
              fullWidth
            />
          )}

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

interface BenefitItemProps {
  text: string;
}

function BenefitItem({ text }: BenefitItemProps) {
  return (
    <View style={styles.benefitItem}>
      <Text style={styles.benefitCheck}>✓</Text>
      <Text style={styles.benefitText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    marginBottom: spacing.xl,
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
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.primary.light,
  },
  summaryTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  trialBadge: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  summaryDetails: {
    padding: spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  summaryFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  summaryFooterText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
  summaryFooterBold: {
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  benefitsContainer: {
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  benefitCheck: {
    fontSize: fontSize.body,
    color: colors.success,
    fontWeight: fontWeight.bold,
    marginRight: spacing.sm,
  },
  benefitText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
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
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  securityIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  securityText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.md,
  },
});
