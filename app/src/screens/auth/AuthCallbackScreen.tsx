/**
 * Auth Callback Screen
 * Handles Supabase auth redirects (invite acceptance, password reset, email confirmation)
 *
 * When Supabase redirects back to the app, the URL contains auth tokens.
 * This screen extracts those tokens, exchanges them for a session,
 * and routes the user appropriately.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
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
      // On web, extract tokens from URL hash or query params
      if (Platform.OS === 'web') {
        const hash = window.location.hash;
        const search = window.location.search;
        const fullUrl = window.location.href;

        console.log('[AuthCallback] Processing URL:', fullUrl);

        // Supabase may send tokens in the hash fragment (#access_token=...&type=...)
        // or as query params (?token_hash=...&type=...)
        let params: URLSearchParams;

        if (hash && hash.length > 1) {
          // Hash fragment: #access_token=...&refresh_token=...&type=invite
          params = new URLSearchParams(hash.substring(1));
        } else {
          // Query params: ?token_hash=...&type=invite
          params = new URLSearchParams(search);
        }

        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const tokenHash = params.get('token_hash');
        const type = params.get('type') || 'unknown';
        const errorCode = params.get('error');
        const errorDescription = params.get('error_description');

        console.log('[AuthCallback] Type:', type, 'Has access_token:', !!accessToken, 'Has token_hash:', !!tokenHash);

        // Check for error in redirect
        if (errorCode) {
          setError(errorDescription || errorCode || 'Authentication failed');
          setStatus('error');
          return;
        }

        // Determine callback type
        if (type === 'invite' || type === 'signup') {
          setCallbackType('invite');
        } else if (type === 'recovery') {
          setCallbackType('recovery');
        } else {
          setCallbackType(type as CallbackType);
        }

        // If we have access_token + refresh_token in hash, set the session directly
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from tokens...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('[AuthCallback] Session error:', sessionError);
            setError(sessionError.message);
            setStatus('error');
            return;
          }

          if (data.session) {
            console.log('[AuthCallback] Session set successfully, type:', type);

            // For invite or recovery, navigate to set password screen
            if (type === 'invite' || type === 'recovery') {
              setStatus('success');
              navigation.replace('SetPassword', { type: type as 'invite' | 'recovery' });
              return;
            }

            // For other types (signup confirmation), just reinitialize auth
            await initialize();
            setStatus('success');
            return;
          }
        }

        // If we have a token_hash (e.g. from email OTP/magic link flow)
        if (tokenHash && type) {
          console.log('[AuthCallback] Verifying token hash...');
          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'invite' | 'recovery' | 'signup' | 'email',
          });

          if (verifyError) {
            console.error('[AuthCallback] Verify error:', verifyError);
            setError(verifyError.message);
            setStatus('error');
            return;
          }

          if (data.session) {
            console.log('[AuthCallback] Token verified, session established');

            if (type === 'invite' || type === 'recovery') {
              setStatus('success');
              navigation.replace('SetPassword', { type: type as 'invite' | 'recovery' });
              return;
            }

            await initialize();
            setStatus('success');
            return;
          }
        }

        // If we reach here, try to let Supabase handle the URL automatically
        // This handles the case where Supabase client auto-detects the tokens
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('[AuthCallback] Session found after URL processing');
          await initialize();
          setStatus('success');
          return;
        }

        // No tokens found
        setError('Invalid or expired link. Please request a new invitation.');
        setStatus('error');
      } else {
        // On native, deep links are handled differently
        // The Supabase client should handle the URL automatically via the linking config
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
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
