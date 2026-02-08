/**
 * Profile Screen
 * Allows users to view and edit their profile information
 */

import React, { useState, useEffect } from 'react';
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
import { useAuthStore } from '../../store/authStore';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { fetchUserProfile, updateUserProfile } from '../../services/auth';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SettingsStackParamList } from '../../navigation/MainNavigator';

type ProfileScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

export function ProfileScreen({ navigation }: Props) {
  const { user, profile, initialize } = useAuthStore();

  // Split existing full_name into first/last for initial values
  const nameParts = (profile?.full_name || '').split(' ');
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPhone, setInitialPhone] = useState('');

  // Warn user on back navigation with unsaved changes
  useUnsavedChanges(hasChanges);

  // Load phone from database on mount
  useEffect(() => {
    const loadPhone = async () => {
      if (!user?.id) return;
      const userProfile = await fetchUserProfile(user.id);
      const phoneVal = userProfile?.phone_number || '';
      setPhone(phoneVal);
      setInitialPhone(phoneVal);
    };
    loadPhone();
  }, [user?.id]);

  useEffect(() => {
    const nameChanged = firstName !== initialFirstName || lastName !== initialLastName;
    const phoneChanged = phone !== initialPhone;
    setHasChanges(nameChanged || phoneChanged);
  }, [firstName, lastName, phone, initialFirstName, initialLastName, initialPhone]);

  const handleSave = async () => {
    if (!user) return;

    setError(null);
    setIsLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Update user profile in Firestore
      const { error: profileError } = await updateUserProfile(user.id, {
        full_name: fullName,
        phone_number: phone.trim() || null,
      });

      if (profileError) {
        setError(profileError);
        setIsLoading(false);
        return;
      }

      // Refresh session to pick up changes
      await initialize();

      setInitialPhone(phone.trim());
      showNotification('Success', 'Your profile has been updated.');
      setHasChanges(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {firstName ? firstName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="First name"
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <Input
              label="Last name"
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <Input
              label="Phone number"
              placeholder="Enter your phone number (optional)"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{user?.email}</Text>
              <Text style={styles.readOnlyHint}>
                Contact support to change your email address
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={isLoading}
              disabled={!hasChanges}
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
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  emailText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
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
  readOnlyField: {
    marginTop: spacing.md,
  },
  readOnlyLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  readOnlyValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  readOnlyHint: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  actions: {
    marginTop: spacing.md,
  },
});
