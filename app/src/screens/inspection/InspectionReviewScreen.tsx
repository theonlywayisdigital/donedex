import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { showNotification, showConfirm } from '../../utils/alert';
import { Icon } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSignatureUrl } from '../../services/reports';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/ui';
import { useInspectionStore } from '../../store/inspectionStore';
import { useNetworkStatus } from '../../services/networkStatus';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type InspectionReviewRouteProp = RouteProp<HomeStackParamList, 'InspectionReview'>;
type InspectionReviewNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'InspectionReview'>;

// Format response value for display
function formatResponseValue(itemType: string, value: string | null): string {
  if (value === null) return 'Not answered';

  switch (itemType) {
    case 'pass_fail':
      return value === 'pass' ? 'Pass' : 'Fail';
    case 'yes_no':
      return value === 'yes' ? 'Yes' : 'No';
    case 'condition':
      return value.charAt(0).toUpperCase() + value.slice(1);
    case 'severity':
      return value.charAt(0).toUpperCase() + value.slice(1);
    case 'multi_select':
      try {
        const values = JSON.parse(value);
        return values.join(', ');
      } catch {
        return value;
      }
    case 'signature':
      // Signature is stored as base64 - just show status text
      return 'Captured';
    case 'photo':
      // Photo value might be a URL or count
      return 'Captured';
    default:
      return value;
  }
}

// Check if a value is a media type that should show preview
function isMediaType(itemType: string): boolean {
  return ['signature', 'photo'].includes(itemType);
}

// Check if value is a base64 image
function isBase64Image(value: string | null): boolean {
  if (!value) return false;
  return value.startsWith('data:image/');
}

// Get status color based on response
function getStatusColor(itemType: string, value: string | null): string {
  if (value === null) return colors.text.tertiary;

  switch (itemType) {
    case 'pass_fail':
      return value === 'pass' ? colors.success : colors.danger;
    case 'yes_no':
      return value === 'yes' ? colors.success : colors.danger;
    case 'condition':
      if (value === 'good') return colors.success;
      if (value === 'fair') return colors.warning;
      return colors.danger;
    case 'severity':
      if (value === 'low') return colors.success;
      if (value === 'medium') return colors.warning;
      return colors.danger;
    default:
      return colors.text.primary;
  }
}

export function InspectionReviewScreen() {
  const navigation = useNavigation<InspectionReviewNavigationProp>();
  const route = useRoute<InspectionReviewRouteProp>();
  const { isOnline } = useNetworkStatus();
  const { isMobile } = useResponsive();

  const {
    report,
    template,
    responses,
    isSaving,
    submitInspection,
    goToSection,
  } = useInspectionStore();

  // Calculate completion stats
  const totalItems = template?.template_sections.reduce(
    (sum, section) => sum + section.template_items.length,
    0
  ) || 0;

  let completedItems = 0;
  let requiredMissing = 0;
  let issuesFound = 0;

  template?.template_sections.forEach((section) => {
    section.template_items.forEach((item) => {
      const response = responses.get(item.id);

      // Check if item is completed based on type
      // Photos are stored in separate arrays, not responseValue
      const hasResponseValue = response && response.responseValue !== null;
      const hasPhotos = response && item.item_type === 'photo' && response.photos && response.photos.length > 0;
      const isCompleted = hasResponseValue || hasPhotos;

      if (isCompleted) {
        completedItems++;

        // Check for issues
        const value = response?.responseValue;
        if (
          value === 'fail' ||
          value === 'no' ||
          value === 'poor' ||
          value === 'high' ||
          value === 'medium'
        ) {
          issuesFound++;
        }
      } else if (item.is_required) {
        requiredMissing++;
      }
    });
  });

  const canSubmit = requiredMissing === 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      showNotification(
        'Missing Required Items',
        `Please complete all required items before submitting. ${requiredMissing} required item(s) remaining.`
      );
      return;
    }

    const confirmTitle = isOnline ? 'Submit Inspection' : 'Submit Inspection (Offline)';
    const confirmMessage = isOnline
      ? 'Once submitted, this inspection cannot be edited. Are you sure you want to submit?'
      : 'You are currently offline. Your inspection will be saved locally and automatically submitted when you reconnect to the internet. Are you sure you want to submit?';

    showConfirm(
      confirmTitle,
      confirmMessage,
      async () => {
        const result = await submitInspection();
        if (result.error) {
          showNotification('Error', result.error);
        } else {
          // Show warning if some photos failed, but still navigate
          if (result.warning) {
            showNotification('Warning', result.warning);
          }
          navigation.navigate('InspectionComplete', { reportId: report?.id || '' });
        }
      },
      undefined,
      'Submit',
      'Cancel'
    );
  };

  const handleEditSection = (sectionIndex: number) => {
    goToSection(sectionIndex);
    navigation.goBack();
  };

  if (!template || !report) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Inspection not found</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isMobile && styles.contentContainerMobile,
        ]}
      >
        {/* Offline Banner */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Icon name="wifi-off" size={18} color={colors.white} />
            <Text style={styles.offlineBannerText}>
              You're offline. Data will sync when you reconnect.
            </Text>
          </View>
        )}

        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Inspection Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{completedItems}/{totalItems}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, issuesFound > 0 && { color: colors.danger }]}>
                {issuesFound}
              </Text>
              <Text style={styles.statLabel}>Issues</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text
                style={[
                  styles.statValue,
                  requiredMissing > 0 ? { color: colors.danger } : { color: colors.success },
                ]}
              >
                {requiredMissing}
              </Text>
              <Text style={styles.statLabel}>Missing</Text>
            </View>
          </View>
        </Card>

        {/* Sections Review */}
        {template.template_sections.map((section, sectionIndex) => (
          <Card key={section.id} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionName}>{section.name}</Text>
              <TouchableOpacity onPress={() => handleEditSection(sectionIndex)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>

            {section.template_items.map((item) => {
              const response = responses.get(item.id);
              const value = response?.responseValue || null;
              const statusColor = getStatusColor(item.item_type, value);

              // Check for photos from response arrays
              const photos = response?.photos || [];
              const hasPhotos = photos.length > 0;

              // Check for signature (could be base64 or storage path in JSON)
              let signatureUri: string | null = null;
              if (item.item_type === 'signature' && value) {
                if (isBase64Image(value)) {
                  signatureUri = value;
                } else {
                  // Try parsing as JSON with path
                  try {
                    const parsed = JSON.parse(value);
                    if (parsed.path) {
                      signatureUri = getSignatureUrl(parsed.path);
                    }
                  } catch {
                    // Not JSON, might be direct storage path
                    if (!value.startsWith('data:') && !value.startsWith('blob:')) {
                      signatureUri = getSignatureUrl(value);
                    }
                  }
                }
              }

              const isPhotoType = ['photo', 'photo_before_after', 'annotated_photo'].includes(item.item_type);
              const hasMedia = isPhotoType ? hasPhotos : false;
              const isMissing = value === null && !hasMedia && item.is_required;

              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemLabel} numberOfLines={2}>
                    {item.label}
                    {item.is_required && <Text style={styles.requiredMark}> *</Text>}
                  </Text>
                  <View style={styles.itemValueContainer}>
                    {signatureUri ? (
                      <View style={styles.signaturePreviewContainer}>
                        <Image
                          source={{ uri: signatureUri }}
                          style={styles.signaturePreview}
                          resizeMode="contain"
                        />
                        <Icon name="check-circle" size={16} color={colors.success} />
                      </View>
                    ) : isPhotoType && hasPhotos ? (
                      <View style={styles.photoGallery}>
                        {photos.slice(0, 3).map((photoUri, index) => (
                          <Image
                            key={index}
                            source={{ uri: photoUri }}
                            style={styles.photoThumbnail}
                            resizeMode="cover"
                          />
                        ))}
                        {photos.length > 3 && (
                          <View style={styles.morePhotosIndicator}>
                            <Text style={styles.morePhotosText}>+{photos.length - 3}</Text>
                          </View>
                        )}
                        <Icon name="check-circle" size={16} color={colors.success} />
                      </View>
                    ) : (
                      <Text style={[styles.itemValue, { color: statusColor }, isMissing && styles.itemMissing]}>
                        {isMissing ? 'Required' : formatResponseValue(item.item_type, value)}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </Card>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, isMobile && styles.footerMobile]}>
        <Button
          title="Back to Edit"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.footerButton}
        />
        <Button
          title="Submit Inspection"
          onPress={handleSubmit}
          loading={isSaving}
          disabled={!canSubmit}
          style={styles.footerButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  offlineBannerText: {
    flex: 1,
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  summaryCard: {
    padding: spacing.lg,
  },
  summaryTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.DEFAULT,
  },
  sectionCard: {
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  editLink: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.md,
  },
  itemLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  requiredMark: {
    color: colors.danger,
  },
  itemValueContainer: {
    alignItems: 'flex-end',
    maxWidth: '60%',
  },
  itemValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    textAlign: 'right',
    maxWidth: 120,
  },
  itemMissing: {
    fontStyle: 'italic',
  },
  signaturePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  signaturePreview: {
    width: 120,
    height: 60,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  photoGallery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  photoThumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  morePhotosIndicator: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
  // Mobile-specific styles (screens < 768px)
  contentContainerMobile: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
  footerMobile: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
});
