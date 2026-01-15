/**
 * Create Organisation Screen (Super Admin)
 * Allows super admins to create organisations directly with optional owner
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { showConfirm } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Icon } from '../../components/ui';
import { useBillingStore } from '../../store/billingStore';
import { createOrganisation as createOrganisationService } from '../../services/superAdmin';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SuperAdminStackParamList } from '../../navigation/SuperAdminNavigator';

type NavigationProp = NativeStackNavigationProp<SuperAdminStackParamList, 'CreateOrganisation'>;

export function CreateOrganisationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { plans, loadPlans, isLoadingPlans } = useBillingStore();

  const [formData, setFormData] = useState({
    organisationName: '',
    slug: '',
    contactEmail: '',
    contactPhone: '',
    ownerEmail: '',
    ownerName: '',
    planId: '',
    sendInvite: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.organisationName) {
      const slug = formData.organisationName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.organisationName]);

  const updateField = (field: keyof typeof formData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.organisationName.trim()) {
      setError('Organisation name is required');
      return false;
    }
    if (formData.organisationName.trim().length < 2) {
      setError('Organisation name must be at least 2 characters');
      return false;
    }
    if (!formData.contactEmail.trim()) {
      setError('Contact email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      setError('Please enter a valid contact email');
      return false;
    }
    // Owner email is optional but must be valid if provided
    if (formData.ownerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail.trim())) {
      setError('Please enter a valid owner email');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrganisationService({
        name: formData.organisationName.trim(),
        slug: formData.slug.trim() || undefined,
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim() || undefined,
        ownerEmail: formData.ownerEmail.trim() || undefined,
        ownerName: formData.ownerName.trim() || undefined,
        planId: formData.planId || undefined,
        sendInvite: formData.sendInvite,
      });

      if (result.error) {
        setError(typeof result.error === 'string' ? result.error : result.error.message);
        setIsSubmitting(false);
        return;
      }

      showConfirm(
        'Organisation Created',
        `${formData.organisationName} has been created successfully.${formData.ownerEmail && formData.sendInvite ? '\n\nAn invitation email has been sent to the owner.' : ''}`,
        () => {
          if (result.data?.id) {
            navigation.replace('OrganisationDetail', { orgId: result.data.id });
          } else {
            navigation.goBack();
          }
        },
        () => {
          setFormData({
            organisationName: '',
            slug: '',
            contactEmail: '',
            contactPhone: '',
            ownerEmail: '',
            ownerName: '',
            planId: '',
            sendInvite: true,
          });
        },
        'View Organisation',
        'Create Another'
      );

      setIsSubmitting(false);
    } catch (err) {
      console.error('Error creating organisation:', err);
      setError('Failed to create organisation. Please try again.');
      setIsSubmitting(false);
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
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Organisation</Text>
            <Text style={styles.subtitle}>
              Create a new organisation and optionally invite an owner
            </Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Organisation Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisation Details</Text>
            <View style={styles.sectionCard}>
              <Input
                label="Organisation Name *"
                placeholder="e.g. ABC Property Management"
                value={formData.organisationName}
                onChangeText={(val) => updateField('organisationName', val)}
                autoCapitalize="words"
              />

              <Input
                label="URL Slug"
                placeholder="auto-generated from name"
                value={formData.slug}
                onChangeText={(val) => updateField('slug', val)}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Contact Email *"
                placeholder="contact@company.com"
                value={formData.contactEmail}
                onChangeText={(val) => updateField('contactEmail', val)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Phone Number"
                placeholder="Optional"
                value={formData.contactPhone}
                onChangeText={(val) => updateField('contactPhone', val)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Plan Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Plan</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.planLabel}>Select Plan</Text>
              <View style={styles.planOptions}>
                {plans.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planOption,
                      formData.planId === plan.id && styles.planOptionSelected,
                    ]}
                    onPress={() => updateField('planId', plan.id)}
                  >
                    <View style={styles.planOptionContent}>
                      <Text
                        style={[
                          styles.planOptionName,
                          formData.planId === plan.id && styles.planOptionNameSelected,
                        ]}
                      >
                        {plan.name}
                      </Text>
                      <Text style={styles.planOptionPrice}>
                        {plan.price_monthly_gbp === 0
                          ? 'Free'
                          : `£${(plan.price_monthly_gbp / 100).toFixed(0)}/mo`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioOuter,
                        formData.planId === plan.id && styles.radioOuterSelected,
                      ]}
                    >
                      {formData.planId === plan.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Owner Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner (Optional)</Text>
            <View style={styles.sectionCard}>
              <Text style={styles.ownerNote}>
                Optionally invite a user as the organisation owner. They will receive an email to set up their account.
              </Text>

              <Input
                label="Owner Email"
                placeholder="owner@company.com"
                value={formData.ownerEmail}
                onChangeText={(val) => updateField('ownerEmail', val)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Owner Name"
                placeholder="Full name"
                value={formData.ownerName}
                onChangeText={(val) => updateField('ownerName', val)}
                autoCapitalize="words"
              />

              {formData.ownerEmail.trim() && (
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => updateField('sendInvite', !formData.sendInvite)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      formData.sendInvite && styles.checkboxChecked,
                    ]}
                  >
                    {formData.sendInvite && (
                      <Icon name="check" size={14} color={colors.white} />
                    )}
                  </View>
                  <Text style={styles.toggleLabel}>
                    Send invitation email to owner
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Create Organisation"
              onPress={handleCreate}
              loading={isSubmitting}
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
  header: {
    marginBottom: spacing.lg,
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
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
  },
  planLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  planOptions: {
    marginBottom: spacing.sm,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  planOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  planOptionContent: {
    flex: 1,
  },
  planOptionName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  planOptionNameSelected: {
    color: colors.primary.DEFAULT,
  },
  planOptionPrice: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
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
  ownerNote: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  toggleLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  actions: {
    marginTop: spacing.md,
  },
});
