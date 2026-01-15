/**
 * Complete Screen
 * Final screen of onboarding - confirms setup and transitions to main app
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type CompleteScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'Complete'
>;

interface Props {
  navigation: CompleteScreenNavigationProp;
}

export function CompleteScreen({ navigation }: Props) {
  const {
    organisationName,
    pendingInvites,
    selectedTemplateIds,
    firstRecordName,
    completeOnboarding,
    isSaving,
    error: storeError,
  } = useOnboardingStore();

  const { initialize } = useAuthStore();

  const [isCompleting, setIsCompleting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-complete onboarding on mount
  useEffect(() => {
    handleComplete();
  }, []);

  const handleComplete = async () => {
    if (isCompleting || isComplete) return;

    setIsCompleting(true);
    setError(null);

    const result = await completeOnboarding();

    if (result.error) {
      setError(result.error);
      setIsCompleting(false);
      return;
    }

    // Refresh auth session to pick up new organisation
    await initialize();

    setIsCompleting(false);
    setIsComplete(true);
  };

  const handleGoToDashboard = () => {
    // This will be handled by RootNavigator detecting onboarding completion
    // The navigation will automatically transition to the main app
  };

  const handleRetry = () => {
    handleComplete();
  };

  // Show loading while completing
  if (isCompleting || (!isComplete && !error)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingTitle}>Setting up your workspace...</Text>
          <Text style={styles.loadingSubtitle}>
            This will only take a moment
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error state
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>Setup failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Button
            title="Try Again"
            onPress={handleRetry}
            fullWidth
            
          />
        </View>
      </SafeAreaView>
    );
  }

  // Success state
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <Text style={styles.successIcon}>🎉</Text>
        </View>

        {/* Header */}
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>
          {`Welcome to Donedex, ${organisationName || 'your workspace is ready'}!`}
        </Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>What's been set up</Text>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryIcon}>✓</Text>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabel}>Organisation</Text>
              <Text style={styles.summaryValue}>{organisationName || 'Created'}</Text>
            </View>
          </View>

          {pendingInvites.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>✓</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Team Invites</Text>
                <Text style={styles.summaryValue}>
                  {`${pendingInvites.length} invite${pendingInvites.length !== 1 ? 's' : ''} queued`}
                </Text>
              </View>
            </View>
          )}

          {selectedTemplateIds.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>✓</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Templates</Text>
                <Text style={styles.summaryValue}>
                  {`${selectedTemplateIds.length} template${selectedTemplateIds.length !== 1 ? 's' : ''} added`}
                </Text>
              </View>
            </View>
          )}

          {firstRecordName && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryIcon}>✓</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>First Property</Text>
                <Text style={styles.summaryValue}>{firstRecordName}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Next Steps */}
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>Next steps</Text>
          <View style={styles.nextStepItem}>
            <Text style={styles.nextStepNumber}>1</Text>
            <Text style={styles.nextStepText}>
              Add properties from your dashboard
            </Text>
          </View>
          <View style={styles.nextStepItem}>
            <Text style={styles.nextStepNumber}>2</Text>
            <Text style={styles.nextStepText}>
              Create or import inspection templates
            </Text>
          </View>
          <View style={styles.nextStepItem}>
            <Text style={styles.nextStepNumber}>3</Text>
            <Text style={styles.nextStepText}>
              Start your first inspection
            </Text>
          </View>
        </View>

        {/* Action */}
        <View style={styles.actions}>
          <Button
            title="Go to Dashboard"
            onPress={handleGoToDashboard}
            fullWidth
            
          />
        </View>
      </View>
    </SafeAreaView>
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
    padding: spacing.lg,
  },
  loadingTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    fontSize: 64,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  summaryIcon: {
    fontSize: fontSize.body,
    color: colors.success,
    fontWeight: fontWeight.bold,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  nextStepsCard: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  nextStepsTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  nextStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: spacing.sm,
    overflow: 'hidden',
  },
  nextStepText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  actions: {
    marginTop: spacing.md,
  },
});
