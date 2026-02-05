import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import { createInvitation, UserRole } from '../../services/team';
import { fetchRecords } from '../../services/records';
import type { Record as RecordModel } from '../../types';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Can manage templates, records, users, and view all reports',
  },
  {
    value: 'user',
    label: 'User',
    description: 'Can complete inspections and view own reports',
  },
];

export function InviteUserScreen() {
  const navigation = useNavigation();
  const { organisation, user } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [records, setRecords] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const { data } = await fetchRecords();
    setRecords(data);
    setLoadingRecords(false);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const toggleRecord = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleInvite = async () => {
    if (!firstName.trim()) {
      showNotification('Error', 'Please enter a first name');
      return;
    }

    if (!lastName.trim()) {
      showNotification('Error', 'Please enter a last name');
      return;
    }

    if (!email.trim()) {
      showNotification('Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      showNotification('Error', 'Please enter a valid email address');
      return;
    }

    if (!organisation?.id || !user?.id) {
      showNotification('Error', 'Organisation not found');
      return;
    }

    setLoading(true);

    const { error } = await createInvitation(
      organisation.id,
      email.trim(),
      selectedRole,
      user.id
    );

    setLoading(false);

    if (error) {
      showNotification('Error', error.message);
      return;
    }

    showNotification(
      'Invitation Sent',
      `An invitation has been sent to ${email.trim()}`,
      () => navigation.goBack()
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      {/* First Name */}
      <View style={styles.section}>
        <Text style={styles.label}>First name *</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="words"
        />
      </View>

      {/* Last Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Last name *</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
          placeholderTextColor={colors.text.tertiary}
          autoCapitalize="words"
        />
      </View>

      {/* Email Input */}
      <View style={styles.section}>
        <Text style={styles.label}>Email address *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="colleague@company.com"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Phone */}
      <View style={styles.section}>
        <Text style={styles.label}>Phone number</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Optional"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="phone-pad"
        />
      </View>

      {/* Role Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Role *</Text>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.value}
            style={[
              styles.roleOption,
              selectedRole === role.value && styles.roleOptionSelected,
            ]}
            onPress={() => setSelectedRole(role.value)}
          >
            <View style={styles.roleHeader}>
              <View
                style={[
                  styles.radioOuter,
                  selectedRole === role.value && styles.radioOuterSelected,
                ]}
              >
                {selectedRole === role.value && <View style={styles.radioInner} />}
              </View>
              <Text
                style={[
                  styles.roleLabel,
                  selectedRole === role.value && styles.roleLabelSelected,
                ]}
              >
                {role.label}
              </Text>
            </View>
            <Text style={styles.roleDescription}>{role.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Record Assignment (for users only) */}
      {selectedRole === 'user' && (
        <View style={styles.section}>
          <Text style={styles.label}>Assign to Records</Text>
          <Text style={styles.helperText}>
            Select which records this user can access. Leave empty to assign later.
          </Text>

          {loadingRecords ? (
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
          ) : records.length === 0 ? (
            <Text style={styles.noRecordsText}>No records created yet</Text>
          ) : (
            <View style={styles.recordsGrid}>
              {records.map((record) => (
                <TouchableOpacity
                  key={record.id}
                  style={[
                    styles.recordChip,
                    selectedRecords.includes(record.id) && styles.recordChipSelected,
                  ]}
                  onPress={() => toggleRecord(record.id)}
                >
                  <Text
                    style={[
                      styles.recordChipText,
                      selectedRecords.includes(record.id) && styles.recordChipTextSelected,
                    ]}
                  >
                    {record.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>How invitations work</Text>
        <Text style={styles.infoText}>
          • The user will receive an email with a link to create their account{'\n'}
          • The invitation expires in 7 days{'\n'}
          • You can resend or cancel invitations from the Team screen
        </Text>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleInvite}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.white} />
        ) : (
          <Text style={styles.submitButtonText}>Send Invitation</Text>
        )}
      </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  roleOption: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  roleOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  radioOuterSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary.DEFAULT,
  },
  roleLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  roleLabelSelected: {
    color: colors.primary.DEFAULT,
  },
  roleDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginLeft: 28,
  },
  helperText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  noRecordsText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  recordsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recordChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  recordChipSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  recordChipText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  recordChipTextSelected: {
    color: colors.white,
  },
  infoBox: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
