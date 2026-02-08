/**
 * Auth Callback Screen
 * Handles Firebase auth redirects (invite acceptance, password reset, email confirmation)
 *
 * When Firebase redirects back to the app, the URL contains auth tokens.
 * This screen extracts those tokens, exchanges them for a session,
 * and routes the user appropriately.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { auth } from '../../services/firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type AuthCallbackScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AuthCallback'>;

interface Props {
  navigation: AuthCallbackScreenNavigationProp;
}

type CallbackType = 'invite' | 'recovery' | 'signup' | 'unknown';

export function AuthCallbackScreen({ navigation }: Props) {
  const [status, setStatus] = useState<'processing' | 'error' | 'success'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [callbackType, setCallbackType] = useState<CallbackType>('unknown');
  const { initialize } = useAuthStore();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // On web, check if this is a Firebase email link sign-in
      if (Platform.OS === 'web') {
        const fullUrl = window.location.href;
        const search = window.location.search;
        const params = new URLSearchParams(search);

        console.log('[AuthCallback] Processing URL:', fullUrl);

        const mode = params.get('mode');
        const oobCode = params.get('oobCode');
        const type = params.get('type') || mode || 'unknown';

        console.log('[AuthCallback] Mode:', mode, 'Has oobCode:', !!oobCode);

        // Determine callback type
        if (type === 'invite' || type === 'signIn') {
          setCallbackType('invite');
        } else if (type === 'recovery' || mode === 'resetPassword') {
          setCallbackType('recovery');
        } else {
          setCallbackType(type as CallbackType);
        }

        // Check if this is a Firebase email link sign-in
        if (isSignInWithEmailLink(auth, fullUrl)) {
          console.log('[AuthCallback] Firebase email link detected');

          // Get email from localStorage (set before sending the link)
          let email = window.localStorage.getItem('emailForSignIn');
          if (!email) {
            // Prompt user to provide email if not found
            email = window.prompt('Please provide your email for confirmation');
          }

          if (email) {
            try {
              await signInWithEmailLink(auth, email, fullUrl);
              window.localStorage.removeItem('emailForSignIn');
              console.log('[AuthCallback] Email link sign-in successful');

              // Navigate to set password if this is an invite
              if (type === 'invite' || type === 'signIn') {
                setStatus('success');
                navigation.replace('SetPassword', { type: 'invite' });
                return;
              }

              await initialize();
              setStatus('success');
              return;
            } catch (linkError: any) {
              console.error('[AuthCallback] Email link error:', linkError);
              setError(linkError.message || 'Failed to sign in with email link');
              setStatus('error');
              return;
            }
          }
        }

        // Check if there's already a user signed in (from password reset flow)
        if (auth.currentUser) {
          console.log('[AuthCallback] User already signed in');

          if (mode === 'resetPassword' || type === 'recovery') {
            setStatus('success');
            navigation.replace('SetPassword', { type: 'recovery' });
            return;
          }

          await initialize();
          setStatus('success');
          return;
        }

        // No authentication found
        setError('Invalid or expired link. Please request a new invitation.');
        setStatus('error');
      } else {
        // On native, check if user is signed in
        if (auth.currentUser) {
          await initialize();
          setStatus('success');
        } else {
          setError('Unable to process the link. Please try again.');
          setStatus('error');
        }
      }
    } catch (err) {
      console.error('[AuthCallback] Error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setStatus('error');
    }
  };

  const handleGoToLogin = () => {
    navigation.replace('Login');
  };

  const handleRetry = () => {
    setStatus('processing');
    setError(null);
    handleCallback();
  };

  if (status === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.processingTitle}>Processing your link...</Text>
          <Text style={styles.processingSubtitle}>Please wait a moment</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>!</Text>
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.actions}>
            <Button
              title="Try Again"
              onPress={handleRetry}
              fullWidth
            />
            <Button
              title="Go to Login"
              onPress={handleGoToLogin}
              variant="ghost"
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Success state - brief flash before navigation
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.processingTitle}>Redirecting...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  processingTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  processingSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  errorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.danger,
  },
  errorTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
  },
});
