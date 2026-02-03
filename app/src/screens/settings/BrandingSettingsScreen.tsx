/**
 * Branding Settings Screen
 * Allows organisation admins to customize branding for PDFs, emails, and reports
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Icon, FullScreenLoader } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import {
  fetchOrganisationBranding,
  updateOrganisationBranding,
  uploadOrganisationLogo,
  deleteOrganisationLogo,
  getLogoUrl,
  resetBrandingToDefaults,
} from '../../services/branding';
import { showAlert, showDestructiveConfirm } from '../../utils/alert';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OrganisationBranding } from '../../types/branding';
import { isValidHexColor, DEFAULT_BRANDING } from '../../types/branding';

export function BrandingSettingsScreen() {
  const organisation = useAuthStore((state) => state.organisation);
  const organisationId = organisation?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_BRANDING.secondaryColor);
  const [logoPath, setLogoPath] = useState<string | null>(null);

  // Original values for detecting changes
  const [originalBranding, setOriginalBranding] = useState<OrganisationBranding | null>(null);

  // Load branding data
  const loadBranding = useCallback(async () => {
    if (!organisationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await fetchOrganisationBranding(organisationId);

    if (error) {
      showAlert('Error', error.message);
    } else if (data) {
      setDisplayName(data.display_name || '');
      setPrimaryColor(data.primary_color || DEFAULT_BRANDING.primaryColor);
      setSecondaryColor(data.secondary_color || DEFAULT_BRANDING.secondaryColor);
      setLogoPath(data.logo_path);
      setOriginalBranding(data);
    }
    setLoading(false);
  }, [organisationId]);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  // Check if there are unsaved changes
  const hasChanges = useCallback(() => {
    if (!originalBranding) return false;
    return (
      displayName !== (originalBranding.display_name || '') ||
      primaryColor !== (originalBranding.primary_color || DEFAULT_BRANDING.primaryColor) ||
      secondaryColor !== (originalBranding.secondary_color || DEFAULT_BRANDING.secondaryColor)
    );
  }, [displayName, primaryColor, secondaryColor, originalBranding]);

  // Warn user on back navigation with unsaved changes
  useUnsavedChanges(hasChanges());

  // Save branding changes
  const handleSave = async () => {
    if (!organisationId) return;

    // Validate colors
    if (!isValidHexColor(primaryColor)) {
      showAlert('Invalid Color', 'Primary color must be a valid hex color (e.g., #0F4C5C)');
      return;
    }
    if (!isValidHexColor(secondaryColor)) {
      showAlert('Invalid Color', 'Secondary color must be a valid hex color (e.g., #1F6F8B)');
      return;
    }

    setSaving(true);
    const { error } = await updateOrganisationBranding(organisationId, {
      display_name: displayName || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });

    if (error) {
      showAlert('Error', error.message);
    } else {
      showAlert('Success', 'Branding settings saved');
      // Update original to reflect saved state
      setOriginalBranding({
        ...originalBranding!,
        display_name: displayName || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
      });
    }
    setSaving(false);
  };

  // Pick and upload logo
  const handlePickLogo = async () => {
    if (!organisationId) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert('Permission Required', 'Please allow access to your photo library to upload a logo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingLogo(true);
    const { data, error } = await uploadOrganisationLogo(organisationId, result.assets[0].uri);

    if (error) {
      showAlert('Upload Failed', error.message);
    } else if (data) {
      setLogoPath(data);
      setOriginalBranding(prev => prev ? { ...prev, logo_path: data } : null);
      showAlert('Success', 'Logo uploaded successfully');
    }
    setUploadingLogo(false);
  };

  // Delete logo
  const handleDeleteLogo = () => {
    if (!organisationId || !logoPath) return;

    showDestructiveConfirm(
      'Delete Logo',
      'Are you sure you want to remove your organisation logo?',
      async () => {
        setUploadingLogo(true);
        const { error } = await deleteOrganisationLogo(organisationId, logoPath);

        if (error) {
          showAlert('Error', error.message);
        } else {
          setLogoPath(null);
          setOriginalBranding(prev => prev ? { ...prev, logo_path: null } : null);
        }
        setUploadingLogo(false);
      },
      undefined,
      'Delete'
    );
  };

  // Reset to defaults
  const handleResetDefaults = () => {
    if (!organisationId) return;

    showDestructiveConfirm(
      'Reset Branding',
      'This will remove your logo and reset colors to Donedex defaults. Are you sure?',
      async () => {
        setSaving(true);
        const { error } = await resetBrandingToDefaults(organisationId, logoPath);

        if (error) {
          showAlert('Error', error.message);
        } else {
          setDisplayName('');
          setPrimaryColor(DEFAULT_BRANDING.primaryColor);
          setSecondaryColor(DEFAULT_BRANDING.secondaryColor);
          setLogoPath(null);
          setOriginalBranding({
            display_name: null,
            primary_color: DEFAULT_BRANDING.primaryColor,
            secondary_color: DEFAULT_BRANDING.secondaryColor,
            logo_path: null,
          });
          showAlert('Success', 'Branding reset to defaults');
        }
        setSaving(false);
      },
      undefined,
      'Reset'
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <FullScreenLoader message="Loading branding..." />
      </SafeAreaView>
    );
  }

  if (!organisationId) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <Icon name="alert-circle" size={48} color={colors.text.tertiary} />
          <Text style={styles.loadingText}>No organisation found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const logoUrl = logoPath ? getLogoUrl(logoPath) : null;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Branding Settings</Text>
          <Text style={styles.subtitle}>
            Customize how your organisation appears on reports and emails
          </Text>
        </View>

        {/* Logo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organisation Logo</Text>
          <Text style={styles.sectionDescription}>
            Your logo will appear on PDF reports and email communications
          </Text>

          <View style={styles.logoContainer}>
            {uploadingLogo ? (
              <View style={styles.logoPlaceholder}>
                <ActivityIndicator color={colors.primary.DEFAULT} />
              </View>
            ) : logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Icon name="image" size={32} color={colors.text.tertiary} />
                <Text style={styles.logoPlaceholderText}>No logo</Text>
              </View>
            )}

            <View style={styles.logoActions}>
              <TouchableOpacity
                style={styles.logoButton}
                onPress={handlePickLogo}
                disabled={uploadingLogo}
              >
                <Icon name="upload" size={18} color={colors.primary.DEFAULT} />
                <Text style={styles.logoButtonText}>
                  {logoUrl ? 'Change Logo' : 'Upload Logo'}
                </Text>
              </TouchableOpacity>

              {logoUrl && (
                <TouchableOpacity
                  style={[styles.logoButton, styles.logoButtonDanger]}
                  onPress={handleDeleteLogo}
                  disabled={uploadingLogo}
                >
                  <Icon name="trash-2" size={18} color={colors.danger} />
                  <Text style={[styles.logoButtonText, styles.logoButtonTextDanger]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Display Name Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display Name</Text>
          <Text style={styles.sectionDescription}>
            Custom name to show on reports (leave blank to use organisation name)
          </Text>

          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g., ACME Property Inspections"
            placeholderTextColor={colors.text.tertiary}
          />
        </View>

        {/* Colors Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Colors</Text>
          <Text style={styles.sectionDescription}>
            Colors used in PDF headers, buttons, and accents
          </Text>

          <View style={styles.colorRow}>
            <View style={styles.colorField}>
              <Text style={styles.colorLabel}>Primary Color</Text>
              <View style={styles.colorInputRow}>
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: isValidHexColor(primaryColor) ? primaryColor : '#ccc' },
                  ]}
                />
                <TextInput
                  style={styles.colorInput}
                  value={primaryColor}
                  onChangeText={setPrimaryColor}
                  placeholder="#0F4C5C"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>

            <View style={styles.colorField}>
              <Text style={styles.colorLabel}>Secondary Color</Text>
              <View style={styles.colorInputRow}>
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: isValidHexColor(secondaryColor) ? secondaryColor : '#ccc' },
                  ]}
                />
                <TextInput
                  style={styles.colorInput}
                  value={secondaryColor}
                  onChangeText={setSecondaryColor}
                  placeholder="#1F6F8B"
                  placeholderTextColor={colors.text.tertiary}
                  autoCapitalize="characters"
                  maxLength={7}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <View
              style={[
                styles.previewHeader,
                { backgroundColor: isValidHexColor(primaryColor) ? primaryColor : colors.primary.DEFAULT },
              ]}
            >
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.previewLogo} />
              ) : (
                <View style={styles.previewLogoPlaceholder} />
              )}
              <Text style={styles.previewOrgName}>
                {displayName || 'Your Organisation'}
              </Text>
            </View>
            <View style={styles.previewBody}>
              <Text style={styles.previewTitle}>Inspection Report</Text>
              <Text style={styles.previewText}>Sample report content preview...</Text>
              <View
                style={[
                  styles.previewButton,
                  { backgroundColor: isValidHexColor(secondaryColor) ? secondaryColor : colors.primary.mid },
                ]}
              >
                <Text style={styles.previewButtonText}>Download PDF</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveButton, !hasChanges() && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Icon name="save" size={18} color={colors.white} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetDefaults}
            disabled={saving}
          >
            <Icon name="refresh-cw" size={18} color={colors.text.secondary} />
            <Text style={styles.resetButtonText}>Reset to Defaults</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  logoContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    padding: spacing.lg,
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border.light,
  },
  logoPlaceholderText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  logoActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    gap: spacing.xs,
  },
  logoButtonDanger: {
    borderColor: colors.danger,
  },
  logoButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  logoButtonTextDanger: {
    color: colors.danger,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  colorRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: spacing.md,
  },
  colorField: {
    flex: 1,
  },
  colorLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  colorInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  colorPreview: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  colorInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  previewCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  previewLogo: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
  },
  previewLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  previewOrgName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  previewBody: {
    padding: spacing.md,
  },
  previewTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  previewText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  previewButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  previewButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    gap: spacing.sm,
  },
  resetButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
});
