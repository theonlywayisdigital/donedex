/**
 * Organisation Details Screen
 * Collects organisation/company information during onboarding
 */

import React, { useState, useEffect } from 'react';
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
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type OrganisationDetailsScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'OrganisationDetails'
>;

interface Props {
  navigation: OrganisationDetailsScreenNavigationProp;
}

export function OrganisationDetailsScreen({ navigation }: Props) {
  const {
    organisationName,
    contactPhone,
    addressLine1,
    addressLine2,
    city,
    postcode,
    setOrganisationDetails,
    saveToServer,
    isSaving,
  } = useOnboardingStore();

  // Local state for form
  const [formData, setFormData] = useState({
    organisationName: organisationName || '',
    contactPhone: contactPhone || '',
    addressLine1: addressLine1 || '',
    addressLine2: addressLine2 || '',
    city: city || '',
    postcode: postcode || '',
  });
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.organisationName.trim()) {
      setError('Please enter your organisation name');
      return false;
    }
    if (formData.organisationName.trim().length < 2) {
      setError('Organisation name must be at least 2 characters');
      return false;
    }
    return true;
  };

  const handleContinue = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    // Update store (contactEmail not needed - will use the user's auth email)
    setOrganisationDetails({
      organisationName: formData.organisationName.trim(),
      contactPhone: formData.contactPhone.trim(),
      addressLine1: formData.addressLine1.trim(),
      addressLine2: formData.addressLine2.trim(),
      city: formData.city.trim(),
      postcode: formData.postcode.trim(),
    });

    // Save to server
    await saveToServer();

    // Navigate to next step
    navigation.navigate('SelectPlan');
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
              <View style={[styles.progressFill, { width: '29%' }]} />
            </View>
            <Text style={styles.progressText}>Step 2 of 7</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Your organisation</Text>
            <Text style={styles.subtitle}>
              Tell us about your company or business
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
              label="Organisation Name *"
              placeholder="e.g. ABC Property Management"
              value={formData.organisationName}
              onChangeText={(val) => updateField('organisationName', val)}
              autoCapitalize="words"
            />

            <Input
              label="Phone Number"
              placeholder="Enter phone number"
              value={formData.contactPhone}
              onChangeText={(val) => updateField('contactPhone', val)}
              keyboardType="phone-pad"
            />

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionLabel}>Business Address (Optional)</Text>
            </View>

            <Input
              label="Address Line 1"
              placeholder="Street address"
              value={formData.addressLine1}
              onChangeText={(val) => updateField('addressLine1', val)}
              autoCapitalize="words"
            />

            <Input
              label="Address Line 2"
              placeholder="Suite, floor, etc."
              value={formData.addressLine2}
              onChangeText={(val) => updateField('addressLine2', val)}
              autoCapitalize="words"
            />

            <View style={styles.rowFields}>
              <View style={styles.rowFieldLeft}>
                <Input
                  label="City"
                  placeholder="City"
                  value={formData.city}
                  onChangeText={(val) => updateField('city', val)}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.rowFieldRight}>
                <Input
                  label="Postcode"
                  placeholder="Postcode"
                  value={formData.postcode}
                  onChangeText={(val) => updateField('postcode', val)}
                  autoCapitalize="characters"
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Continue"
              onPress={handleContinue}
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
  sectionDivider: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowFields: {
    flexDirection: 'row',
    marginHorizontal: -spacing.sm,
  },
  rowFieldLeft: {
    flex: 2,
    paddingHorizontal: spacing.sm,
  },
  rowFieldRight: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  actions: {
    marginTop: spacing.lg,
  },
});
