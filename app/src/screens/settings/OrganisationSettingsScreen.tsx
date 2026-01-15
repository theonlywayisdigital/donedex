/**
 * Organisation Settings Screen
 * Allows admins to view and edit organisation details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input, Icon } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SettingsStackParamList } from '../../navigation/MainNavigator';

type OrganisationSettingsScreenNavigationProp = NativeStackNavigationProp<
  SettingsStackParamList,
  'OrganisationSettings'
>;

interface Props {
  navigation: OrganisationSettingsScreenNavigationProp;
}

interface OrganisationData {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_phone: string | null;
  billing_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
}

export function OrganisationSettingsScreen({ navigation }: Props) {
  const { organisation, role } = useAuthStore();
  const organisationId = organisation?.id;
  const isOwner = role === 'owner';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState<OrganisationData | null>(null);
  const [originalData, setOriginalData] = useState<OrganisationData | null>(null);

  useEffect(() => {
    loadOrganisation();
  }, [organisationId]);

  useEffect(() => {
    if (formData && originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const loadOrganisation = async () => {
    if (!organisationId) {
      setError('No organisation found');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('organisations')
        .select('id, name, slug, contact_email, contact_phone, billing_email, address_line1, address_line2, city, postcode, country')
        .eq('id', organisationId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      setFormData(data as OrganisationData);
      setOriginalData(data as OrganisationData);
    } catch (err) {
      console.error('Error loading organisation:', err);
      setError('Failed to load organisation details');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof OrganisationData, value: string) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!formData || !organisationId) return;

    setError(null);
    setIsSaving(true);

    try {
      const { error: updateError } = await (supabase
        .from('organisations') as any)
        .update({
          name: formData.name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          billing_email: formData.billing_email,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.city,
          postcode: formData.postcode,
          country: formData.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organisationId);

      if (updateError) {
        setError(updateError.message);
        setIsSaving(false);
        return;
      }

      setOriginalData(formData);
      showNotification('Success', 'Organisation details have been updated.');
    } catch (err) {
      console.error('Error saving organisation:', err);
      setError('Failed to save organisation details');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading organisation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!formData) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorTitle}>Organisation not found</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="secondary"
          />
        </View>
      </SafeAreaView>
    );
  }

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
          {/* Organisation Header */}
          <View style={styles.orgHeader}>
            <View style={styles.orgIcon}>
              <Icon name="building-2" size={32} color={colors.primary.DEFAULT} />
            </View>
            <Text style={styles.orgName}>{formData.name}</Text>
            <Text style={styles.orgSlug}>/{formData.slug}</Text>
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.sectionCard}>
              <Input
                label="Organisation Name"
                placeholder="Enter organisation name"
                value={formData.name}
                onChangeText={(val) => updateField('name', val)}
                autoCapitalize="words"
                editable={isOwner}
              />

              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyLabel}>URL Slug</Text>
                <Text style={styles.readOnlyValue}>{formData.slug}</Text>
                <Text style={styles.readOnlyHint}>
                  Contact support to change your URL slug
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.sectionCard}>
              <Input
                label="Contact Email"
                placeholder="contact@company.com"
                value={formData.contact_email || ''}
                onChangeText={(val) => updateField('contact_email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Phone Number"
                placeholder="Enter phone number"
                value={formData.contact_phone || ''}
                onChangeText={(val) => updateField('contact_phone', val)}
                keyboardType="phone-pad"
              />

              <Input
                label="Billing Email"
                placeholder="billing@company.com"
                value={formData.billing_email || ''}
                onChangeText={(val) => updateField('billing_email', val)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Address</Text>
            <View style={styles.sectionCard}>
              <Input
                label="Address Line 1"
                placeholder="Street address"
                value={formData.address_line1 || ''}
                onChangeText={(val) => updateField('address_line1', val)}
                autoCapitalize="words"
              />

              <Input
                label="Address Line 2"
                placeholder="Suite, floor, etc."
                value={formData.address_line2 || ''}
                onChangeText={(val) => updateField('address_line2', val)}
                autoCapitalize="words"
              />

              <View style={styles.rowFields}>
                <View style={styles.rowFieldLeft}>
                  <Input
                    label="City"
                    placeholder="City"
                    value={formData.city || ''}
                    onChangeText={(val) => updateField('city', val)}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.rowFieldRight}>
                  <Input
                    label="Postcode"
                    placeholder="Postcode"
                    value={formData.postcode || ''}
                    onChangeText={(val) => updateField('postcode', val)}
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={isSaving}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  orgHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  orgIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  orgName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  orgSlug: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  errorBanner: {
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
    marginTop: spacing.md,
  },
});
