import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform, AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { AdaptiveNavigator } from './AdaptiveNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { colors, fontSize, spacing } from '../constants/theme';
import { ImpersonationBanner } from '../components/ImpersonationBanner';
import { OrgStatusGate } from '../components/OrgStatusGate';
import { useResponsive } from '../hooks/useResponsive';
import { linking } from './linking';
import { initializeNetworkMonitoring } from '../services/networkStatus';
import { initializeAutoSync } from '../services/syncService';
import { OfflineIndicator } from '../components/ui/OfflineIndicator';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { usePushNotifications } from '../hooks/usePushNotifications';

export function RootNavigator() {
  const { isLoading, isInitialized, session, initialize, isSuperAdmin, refreshOrgData } = useAuthStore();
  const {
    initialize: initializeOnboarding,
    needsOnboarding,
    isComplete,
    isLoading: isOnboardingLoading,
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
    const checkOnboarding = async () => {
      if (session && isInitialized && !onboardingChecked) {
        // Super admins don't need onboarding - they're vendor admins
        if (isSuperAdmin) {
          setOnboardingChecked(true);
          return;
        }

        try {
          await initializeOnboarding();
        } catch (err) {
          console.error('Onboarding init error:', err);
        } finally {
          setOnboardingChecked(true);
        }
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

  // If authenticated, check onboarding status
  if (session && !onboardingChecked) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Determine which navigator to show
  const getNavigator = () => {
    if (!session) {
      return <AuthNavigator />;
    }

    // Show onboarding if needed (but not for super admins)
    if (needsOnboarding && !isComplete && !isSuperAdmin) {
      return <OnboardingNavigator />;
    }

    // Use AdaptiveNavigator for desktop web sidebar / mobile tabs
    // OrgStatusGate blocks access if org is blocked/archived (skipped for super admins)
    return (
      <OrgStatusGate>
        <AdaptiveNavigator />
      </OrgStatusGate>
    );
  };

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <NavigationContainer linking={Platform.OS === 'web' ? linking : undefined}>
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
