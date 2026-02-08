/**
 * Change Password Screen
 * Allows users to update their password
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { changePassword } from '../../services/auth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SettingsStackParamList } from '../../navigation/MainNavigator';

type ChangePasswordScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'ChangePassword'>;

interface Props {
  navigation: ChangePasswordScreenNavigationProp;
}

export function ChangePasswordScreen({ navigation }: Props) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!newPassword) {
      setError('Please enter a new password');
      return false;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await changePassword(newPassword);

      if (updateError) {
        setError(updateError);
        setIsLoading(false);
        return;
      }

      showNotification(
        'Password Updated',
        'Your password has been changed successfully.',
        () => navigation.goBack()
      );
    } catch (err) {
      console.error('Error changing password:', err);
      setError('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Choose a strong password with at least 8 characters. We recommend using a mix of letters, numbers, and symbols.
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
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />

            <Input
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
            />
          </View>

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Password Requirements</Text>
            <PasswordRequirement
              text="At least 8 characters"
              met={newPassword.length >= 8}
            />
            <PasswordRequirement
              text="Contains a number"
              met={/\d/.test(newPassword)}
            />
            <PasswordRequirement
              text="Contains uppercase letter"
              met={/[A-Z]/.test(newPassword)}
            />
            <PasswordRequirement
              text="Contains lowercase letter"
              met={/[a-z]/.test(newPassword)}
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Update Password"
              onPress={handleChangePassword}
              loading={isLoading}
              disabled={!newPassword || !confirmPassword}
              fullWidth
              
            />
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="ghost"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface PasswordRequirementProps {
  text: string;
  met: boolean;
}

function PasswordRequirement({ text, met }: PasswordRequirementProps) {
  return (
    <View style={styles.requirementItem}>
      <Text style={[styles.requirementIcon, met && styles.requirementIconMet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[styles.requirementText, met && styles.requirementTextMet]}>
        {text}
      </Text>
    </View>
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
    padding: spacing.lg,
  },
  instructions: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  instructionsText: {
    fontSize: fontSize.caption,
    color: colors.primary.mid,
    lineHeight: 20,
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
  requirements: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requirementIcon: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
    marginRight: spacing.sm,
    width: 20,
  },
  requirementIconMet: {
    color: colors.success,
  },
  requirementText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  requirementTextMet: {
    color: colors.success,
  },
  actions: {
    marginTop: spacing.md,
  },
});
