import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import { AdaptiveNavigator } from './AdaptiveNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { SetPasswordScreen } from '../screens/auth/SetPasswordScreen';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { colors, fontSize, spacing } from '../constants/theme';
import { ImpersonationBanner } from '../components/ImpersonationBanner';
import { OrgStatusGate } from '../components/OrgStatusGate';
import { linking } from './linking';
import { initializeNetworkMonitoring } from '../services/networkStatus';
import { initializeAutoSync } from '../services/syncService';
import { OfflineIndicator } from '../components/ui/OfflineIndicator';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';

// Simple stack navigator for the password setup flow (invite/recovery)
// This renders outside AuthNavigator because the user already HAS a session
// (Firebase auto-created it from URL tokens), they just need to set their password.
type PasswordSetupParamList = {
  SetPassword: { type: 'invite' | 'recovery' };
};
const PasswordSetupStack = createNativeStackNavigator<PasswordSetupParamList>();

function PasswordSetupNavigator({ type }: { type: 'invite' | 'recovery' }) {
  return (
    <PasswordSetupStack.Navigator screenOptions={{ headerShown: false }}>
      <PasswordSetupStack.Screen
        name="SetPassword"
        component={SetPasswordScreen}
        initialParams={{ type }}
      />
    </PasswordSetupStack.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, isInitialized, session, initialize, isSuperAdmin, refreshOrgData, pendingOTPEmail, needsPasswordSetup, passwordSetupType } = useAuthStore();
  const {
    initialize: initializeOnboarding,
    needsOnboarding,
    isComplete,
    error: onboardingError,
  } = useOnboardingStore();

  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize auth with error handling
  useEffect(() => {
    const initAuth = async () => {
      try {
        await initialize();
      } catch (err) {
        console.error('Auth initialization failed:', err);
        setInitError(err instanceof Error ? err.message : 'Failed to initialize app');
      }
    };
    initAuth();
  }, [initialize]);

  // Initialize offline sync services (network monitoring and auto-sync)
  useEffect(() => {
    // Initialize network monitoring to track online/offline status
    initializeNetworkMonitoring();

    // Initialize auto-sync to sync pending data when back online
    initializeAutoSync();
  }, []);

  // Refresh org data when app returns to foreground
  useEffect(() => {
    if (!session || isSuperAdmin) return;

    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          refreshOrgData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshOrgData();
      }
    });
    return () => subscription.remove();
  }, [session, isSuperAdmin, refreshOrgData]);

  // Check onboarding status when authenticated (skip for super admins)
  useEffect(() => {
    if (!session || !isInitialized) return;

    // Super admins never need onboarding - force-clear regardless of timing
    if (isSuperAdmin) {
      useOnboardingStore.setState({ needsOnboarding: false, isComplete: true });
      if (!onboardingChecked) setOnboardingChecked(true);
      return;
    }

    if (onboardingChecked) return;

    const checkOnboarding = async () => {
      try {
        await initializeOnboarding();
      } catch (err) {
        console.error('Onboarding init error:', err);
      } finally {
        setOnboardingChecked(true);
      }
    };

    checkOnboarding();
  }, [session, isInitialized, onboardingChecked, initializeOnboarding, isSuperAdmin]);

  // Reset onboarding check when session changes
  useEffect(() => {
    if (!session) {
      setOnboardingChecked(false);
    }
  }, [session]);

  // Register for push notifications when authenticated
  usePushNotifications();

  // Retry initialization
  const handleRetry = useCallback(() => {
    setInitError(null);
    setOnboardingChecked(false);
    initialize();
  }, [initialize]);

  // Show error screen if initialization failed
  const errorMessage = initError || onboardingError;
  if (errorMessage) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorContent}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Unable to Start</Text>
          <Text style={styles.errorDescription}>
            {errorMessage}
          </Text>
          <Text style={styles.errorHint}>
            Please check your internet connection and try again.
          </Text>
          <View style={styles.retryButton}>
            <Text style={styles.retryButtonText} onPress={handleRetry}>
              Try Again
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Show loading screen while checking auth state
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  // If authenticated (and not in OTP flow), wait for onboarding check
  // Super admins skip this gate entirely - they never need onboarding
  if (session && !onboardingChecked && !pendingOTPEmail && !isSuperAdmin) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Determine which navigator to show
  const getNavigator = () => {
    // During OTP flow, always show AuthNavigator even if session exists temporarily
    if (!session || pendingOTPEmail) {
      return <AuthNavigator />;
    }

    // Password setup gate: user has a session (from invite/recovery link)
    // but hasn't set their password yet. Show SetPassword screen.
    if (needsPasswordSetup && passwordSetupType) {
      return <PasswordSetupNavigator type={passwordSetupType} />;
    }

    // Show onboarding if needed (but not for super admins)
    if (needsOnboarding && !isComplete && !isSuperAdmin) {
      return <OnboardingNavigator />;
    }

    // Super admins go straight to AdaptiveNavigator - no org check needed
    if (isSuperAdmin) {
      return <AdaptiveNavigator />;
    }

    // Regular users: OrgStatusGate blocks access if org is blocked/archived/removed
    return (
      <OrgStatusGate>
        <AdaptiveNavigator />
      </OrgStatusGate>
    );
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <NavigationContainer linking={linking}>
          {getNavigator()}
        </NavigationContainer>
        {session && !needsOnboarding && <ImpersonationBanner />}
        {session && <OfflineIndicator showSyncStatus />}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
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
  errorContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIcon: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.danger,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    textAlign: 'center',
    lineHeight: 56,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  errorTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorHint: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: '500',
  },
});
