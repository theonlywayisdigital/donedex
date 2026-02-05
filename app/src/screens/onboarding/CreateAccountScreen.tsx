/**
 * Create Account Screen
 * User registration during onboarding
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
import { Button, Input } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type CreateAccountScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'CreateAccount'>;

interface Props {
  navigation: CreateAccountScreenNavigationProp;
}

export function CreateAccountScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuthStore();

  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setError('Please enter your first name');
      return false;
    }
    if (!lastName.trim()) {
      setError('Please enter your last name');
      return false;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
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

  const handleCreateAccount = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const result = await signUp(email.trim(), password, fullName);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Navigate to organisation details
      navigation.navigate('OrganisationDetails');
    } catch (err) {
      setError('Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

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
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '22%' }]} />
            </View>
            <Text style={styles.progressText}>Step 1 of 9</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Start with your personal details
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
              label="First Name"
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
            />

            <Input
              label="Last Name"
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />

            <Input
              label="Password"
              placeholder="Create a password (min 8 characters)"
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
              title="Continue"
              onPress={handleCreateAccount}
              loading={isSubmitting}
              fullWidth
              
            />
            <Button
              title="Back"
              onPress={handleBack}
              variant="ghost"
              fullWidth
            />
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
  },
  form: {
    flex: 1,
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
  actions: {
    marginTop: spacing.lg,
  },
  termsText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
});
