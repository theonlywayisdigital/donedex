/**
 * Invite Team Screen
 * Allows inviting team members during onboarding
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type InviteTeamScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'InviteTeam'
>;

interface Props {
  navigation: InviteTeamScreenNavigationProp;
}

export function InviteTeamScreen({ navigation }: Props) {
  const {
    pendingInvites,
    addInvite,
    removeInvite,
    saveToServer,
    isSaving,
  } = useOnboardingStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (emailToValidate: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToValidate.trim());
  };

  const handleAddInvite = () => {
    setError(null);

    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check for duplicate
    const exists = pendingInvites.some(
      (inv) => inv.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (exists) {
      setError('This email has already been added');
      return;
    }

    // Add invite
    addInvite(email.trim(), role);
    setEmail('');
    setRole('user');
  };

  const handleRemoveInvite = (emailToRemove: string) => {
    removeInvite(emailToRemove);
  };

  const handleContinue = async () => {
    // Save to server
    await saveToServer();

    // Navigate to next step
    navigation.navigate('ChooseTemplates');
  };

  const handleSkip = () => {
    navigation.navigate('ChooseTemplates');
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
              <View style={[styles.progressFill, { width: '71%' }]} />
            </View>
            <Text style={styles.progressText}>Step 5 of 7</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Invite your team</Text>
            <Text style={styles.subtitle}>
              Add team members now or skip this step and invite them later.
            </Text>
          </View>

          {/* Add Invite Form */}
          <View style={styles.addInviteForm}>
            <Input
              label="Email Address"
              placeholder="colleague@company.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Role Selector */}
            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>Role</Text>
              <View style={styles.roleButtons}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'user' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('user')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'user' && styles.roleButtonTextActive,
                    ]}
                  >
                    User
                  </Text>
                  <Text style={styles.roleDescription}>
                    Can complete inspections
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    role === 'admin' && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole('admin')}
                >
                  <Text
                    style={[
                      styles.roleButtonText,
                      role === 'admin' && styles.roleButtonTextActive,
                    ]}
                  >
                    Admin
                  </Text>
                  <Text style={styles.roleDescription}>
                    Full access including settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Add to List"
              onPress={handleAddInvite}
              variant="secondary"
              fullWidth
            />
          </View>

          {/* Pending Invites List */}
          {pendingInvites.length > 0 && (
            <View style={styles.invitesListContainer}>
              <Text style={styles.invitesListTitle}>
                {`Pending Invites (${pendingInvites.length})`}
              </Text>

              {pendingInvites.map((invite) => (
                <View key={invite.email} style={styles.inviteItem}>
                  <View style={styles.inviteItemContent}>
                    <Text style={styles.inviteEmail}>{invite.email}</Text>
                    <View
                      style={[
                        styles.inviteRoleBadge,
                        invite.role === 'admin' && styles.inviteRoleBadgeAdmin,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inviteRoleText,
                          invite.role === 'admin' && styles.inviteRoleTextAdmin,
                        ]}
                      >
                        {invite.role === 'admin' ? 'Admin' : 'User'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveInvite(invite.email)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              Invites will be sent when you complete setup. Team members will receive an email with instructions to join.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={pendingInvites.length > 0 ? 'Continue' : 'Skip for Now'}
              onPress={pendingInvites.length > 0 ? handleContinue : handleSkip}
              loading={isSaving}
              fullWidth
              
            />
            <Button
              title="Back"
              onPress={handleBack}
              variant="ghost"
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
  addInviteForm: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  roleContainer: {
    marginBottom: spacing.md,
  },
  roleLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    marginHorizontal: -spacing.xs,
  },
  roleButton: {
    flex: 1,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  roleButtonActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  roleButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  roleButtonTextActive: {
    color: colors.primary.DEFAULT,
  },
  roleDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
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
  invitesListContainer: {
    marginBottom: spacing.lg,
  },
  invitesListTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  inviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  inviteItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteEmail: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  inviteRoleBadge: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  inviteRoleBadgeAdmin: {
    backgroundColor: colors.primary.light,
  },
  inviteRoleText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  inviteRoleTextAdmin: {
    color: colors.primary.DEFAULT,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  removeButtonText: {
    fontSize: 24,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  infoNote: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoNoteText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.md,
  },
});
