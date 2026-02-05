/**
 * Set Password Screen
 * Used by invited users to set their password after clicking the invite link,
 * and by users resetting their password via the recovery flow.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { useAuthStore } from '../../store/authStore';
import { Button, Input } from '../../components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type SetPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SetPassword'>;
type SetPasswordScreenRouteProp = RouteProp<AuthStackParamList, 'SetPassword'>;

interface Props {
  navigation: SetPasswordScreenNavigationProp;
  route: SetPasswordScreenRouteProp;
}

export function SetPasswordScreen({ navigation, route }: Props) {
  const type = route.params?.type || 'invite';
  const isInvite = type === 'invite';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const { initialize, clearPasswordSetup } = useAuthStore();

  const validateForm = (): boolean => {
    if (!password) {
      setError('Please enter a password');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSetPassword = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsSubmitting(false);
        return;
      }

      // Password set successfully - reinitialize auth to load user data
      await initialize();
      setIsComplete(true);
      setIsSubmitting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    // Clear the password setup flag — RootNavigator will re-render
    // and show the main app or onboarding as appropriate
    clearPasswordSetup();
  };

  if (isComplete) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <Text style={styles.successIcon}>{'✓'}</Text>
          </View>
          <Text style={styles.successTitle}>
            {isInvite ? 'Account ready!' : 'Password updated!'}
          </Text>
          <Text style={styles.successSubtitle}>
            {isInvite
              ? 'Your password has been set. You can now access your workspace.'
              : 'Your password has been changed successfully.'}
          </Text>
          <View style={styles.actions}>
            <Button
              title={isInvite ? 'Go to Dashboard' : 'Continue'}
              onPress={handleContinue}
              fullWidth
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Donedex</Text>
            </View>
            <Text style={styles.title}>
              {isInvite ? 'Set your password' : 'Reset your password'}
            </Text>
            <Text style={styles.subtitle}>
              {isInvite
                ? 'Create a secure password to access your account'
                : 'Enter a new password for your account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="New Password"
              placeholder="Enter a password (min 8 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={isInvite ? 'Set Password & Continue' : 'Update Password'}
              onPress={handleSetPassword}
              loading={isSubmitting}
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  logoText: {
    color: colors.white,
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
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
  },
  form: {
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  actions: {
    marginTop: spacing.md,
  },
  successContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  successIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.success,
  },
  successTitle: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  successSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
