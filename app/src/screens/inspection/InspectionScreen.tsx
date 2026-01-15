import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { showConfirm, showNotification } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/ui';
import { ResponseInput } from '../../components/inspection';
import { useInspectionStore } from '../../store/inspectionStore';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import {
  launchCamera,
  launchImageLibrary,
  launchVideoCamera,
  launchVideoLibrary,
  requestCameraPermissions,
} from '../../services/imagePicker';
import { persistFile } from '../../services/filePersistence';
import type { HomeStackParamList } from '../../navigation/MainNavigator';
import type { TemplateItem } from '../../services/templates';

type InspectionRouteProp = RouteProp<HomeStackParamList, 'Inspection'>;
type InspectionNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Inspection'>;

export function InspectionScreen() {
  const navigation = useNavigation<InspectionNavigationProp>();
  const route = useRoute<InspectionRouteProp>();
  const { reportId } = route.params;
  const { isMobile } = useResponsive();

  const {
    report,
    template,
    responses,
    currentSectionIndex,
    isLoading,
    isSaving,
    error,
    loadInspection,
    setResponse,
    addPhoto,
    addVideo,
    nextSection,
    previousSection,
    goToSection,
    saveResponses,
  } = useInspectionStore();

  const [showSectionPicker, setShowSectionPicker] = useState(false);

  useEffect(() => {
    if (reportId && reportId !== 'temp-report-id') {
      loadInspection(reportId);
    }
  }, [reportId, loadInspection]);

  const currentSection = template?.template_sections[currentSectionIndex];
  const totalSections = template?.template_sections.length || 0;
  const isLastSection = currentSectionIndex === totalSections - 1;
  const isFirstSection = currentSectionIndex === 0;

  // Evaluate condition for conditional visibility
  const evaluateCondition = (item: TemplateItem): boolean => {
    if (!item.condition_field_id) return true;

    const dependentResponse = responses.get(item.condition_field_id);
    const value = dependentResponse?.responseValue ?? null;

    switch (item.condition_operator) {
      case 'equals':
        return value === item.condition_value;
      case 'not_equals':
        return value !== item.condition_value;
      case 'not_empty':
        return value !== null && value !== '';
      default:
        return true;
    }
  };

  // Filter visible items based on conditions
  const getVisibleItems = (items: TemplateItem[]): TemplateItem[] => {
    return items.filter((item) => evaluateCondition(item));
  };

  // Calculate section progress (only counts visible items)
  const getSectionProgress = (sectionIndex: number) => {
    const section = template?.template_sections[sectionIndex];
    if (!section) return 0;

    const visibleItems = getVisibleItems(section.template_items);
    const totalItems = visibleItems.length;
    if (totalItems === 0) return 100;

    let completed = 0;
    visibleItems.forEach((item) => {
      const response = responses.get(item.id);
      if (response?.responseValue !== null) {
        completed++;
      }
    });

    return Math.round((completed / totalItems) * 100);
  };

  const currentSectionProgress = getSectionProgress(currentSectionIndex);

  const handleResponseChange = (item: TemplateItem, value: string | null) => {
    setResponse(item.id, item, value);
  };

  // Handle photo capture for an item
  const handleAddPhoto = useCallback(async (templateItemId: string) => {
    // Request camera permissions first
    const hasPermission = await requestCameraPermissions();

    if (!hasPermission) {
      showConfirm(
        'Camera Permission Required',
        'Please enable camera access in your device settings to take photos.',
        () => {
          // Try from library instead
          handlePickFromLibrary(templateItemId);
        },
        undefined,
        'Choose from Library',
        'Cancel'
      );
      return;
    }

    // Show options to take photo or choose from library
    showConfirm(
      'Add Photo',
      'How would you like to add a photo?',
      async () => {
        // Take photo with camera
        const result = await launchCamera({
          quality: 0.8,
          allowsEditing: false,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const photo = result.assets[0];
          // Persist photo to documents directory so it survives until synced
          const persistedUri = await persistFile(photo.uri, 'photo');
          addPhoto(templateItemId, persistedUri);
          showNotification('Photo Added', 'Photo captured successfully');
        }
      },
      async () => {
        // Choose from library
        handlePickFromLibrary(templateItemId);
      },
      'Take Photo',
      'Choose from Library'
    );
  }, [addPhoto]);

  // Handle picking photo from library
  const handlePickFromLibrary = useCallback(async (templateItemId: string) => {
    const result = await launchImageLibrary({
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const photo = result.assets[0];
      // Persist photo to documents directory so it survives until synced
      const persistedUri = await persistFile(photo.uri, 'photo');
      addPhoto(templateItemId, persistedUri);
      showNotification('Photo Added', 'Photo added successfully');
    }
  }, [addPhoto]);

  // Handle video recording for an item
  const handleAddVideo = useCallback(async (templateItemId: string) => {
    // Request camera permissions first
    const hasPermission = await requestCameraPermissions();

    if (!hasPermission) {
      showConfirm(
        'Camera Permission Required',
        'Please enable camera access in your device settings to record videos.',
        () => {
          // Try from library instead
          handlePickVideoFromLibrary(templateItemId);
        },
        undefined,
        'Choose from Library',
        'Cancel'
      );
      return;
    }

    // Show options to record video or choose from library
    showConfirm(
      'Add Video',
      'How would you like to add a video?',
      async () => {
        // Record video with camera
        const result = await launchVideoCamera();

        if (!result.canceled && result.asset) {
          // Persist video to documents directory so it survives until synced
          const persistedUri = await persistFile(result.asset.uri, 'video');
          addVideo(templateItemId, persistedUri);
          showNotification('Video Added', 'Video recorded successfully');
        }
      },
      async () => {
        // Choose from library
        handlePickVideoFromLibrary(templateItemId);
      },
      'Record Video',
      'Choose from Library'
    );
  }, [addVideo]);

  // Handle picking video from library
  const handlePickVideoFromLibrary = useCallback(async (templateItemId: string) => {
    const result = await launchVideoLibrary();

    if (!result.canceled && result.asset) {
      // Persist video to documents directory so it survives until synced
      const persistedUri = await persistFile(result.asset.uri, 'video');
      addVideo(templateItemId, persistedUri);
      showNotification('Video Added', 'Video added successfully');
    }
  }, [addVideo]);

  const handleNext = async () => {
    // Auto-save when moving between sections
    await saveResponses();

    if (isLastSection) {
      // Go to review
      navigation.navigate('InspectionReview', { reportId: report?.id || '' });
    } else {
      nextSection();
    }
  };

  const handleBack = async () => {
    if (isFirstSection) {
      // Confirm exit
      showConfirm(
        'Exit Inspection',
        'Your progress has been saved. You can continue this inspection later.',
        async () => {
          await saveResponses();
          navigation.goBack();
        },
        undefined,
        'Exit',
        'Cancel'
      );
    } else {
      await saveResponses();
      previousSection();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading inspection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !template || !currentSection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Failed to load inspection'}</Text>
          <Button title="Go Back" onPress={() => navigation.goBack()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with progress */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.sectionSelector}
          onPress={() => setShowSectionPicker(!showSectionPicker)}
        >
          <Text style={styles.sectionName}>{currentSection.name}</Text>
          <Text style={styles.sectionCount}>
            {currentSectionIndex + 1} of {totalSections}
          </Text>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${currentSectionProgress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>{currentSectionProgress}%</Text>
        </View>
      </View>

      {/* Section picker dropdown */}
      {showSectionPicker && (
        <Card style={styles.sectionPicker}>
          <ScrollView style={styles.sectionPickerScroll}>
            {template.template_sections.map((section, index) => {
              const progress = getSectionProgress(index);
              return (
                <TouchableOpacity
                  key={section.id}
                  style={[
                    styles.sectionPickerItem,
                    index === currentSectionIndex && styles.sectionPickerItemActive,
                  ]}
                  onPress={() => {
                    goToSection(index);
                    setShowSectionPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sectionPickerText,
                      index === currentSectionIndex && styles.sectionPickerTextActive,
                    ]}
                  >
                    {section.name}
                  </Text>
                  <Text style={styles.sectionPickerProgress}>{progress}%</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Card>
      )}

      {/* Items list */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isMobile && styles.contentContainerMobile,
        ]}
      >
        {getVisibleItems(currentSection.template_items).map((item, index) => {
          const response = responses.get(item.id);
          return (
            <Card key={item.id} style={isMobile ? StyleSheet.flatten([styles.itemCard, styles.itemCardMobile]) : styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.is_required && <Text style={styles.requiredBadge}>Required</Text>}
              </View>
              <ResponseInput
                itemType={item.item_type}
                value={response?.responseValue || null}
                onChange={(value) => handleResponseChange(item, value)}
                options={item.options}
                photoRule={item.photo_rule}
                photoCount={response?.photos.length}
                onAddPhoto={() => handleAddPhoto(item.id)}
                videoCount={response?.videos?.length}
                onAddVideo={() => handleAddVideo(item.id)}
                helpText={item.help_text}
                placeholder={item.placeholder_text}
                datetimeMode={item.datetime_mode}
                ratingMax={item.rating_max}
                declarationText={item.declaration_text}
                signatureRequiresName={item.signature_requires_name}
              />
            </Card>
          );
        })}
      </ScrollView>

      {/* Footer navigation */}
      <View style={[styles.footer, isMobile && styles.footerMobile]}>
        <Button
          title={isFirstSection ? 'Exit' : 'Back'}
          onPress={handleBack}
          variant="secondary"
          style={styles.footerButton}
        />
        <Button
          title={isLastSection ? 'Review' : 'Next'}
          onPress={handleNext}
          loading={isSaving}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.md,
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
  header: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.neutral[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    width: 40,
    textAlign: 'right',
  },
  sectionPicker: {
    position: 'absolute',
    top: 100,
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
    maxHeight: 300,
  },
  sectionPickerScroll: {
    maxHeight: 280,
  },
  sectionPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionPickerItemActive: {
    backgroundColor: colors.primary.light,
  },
  sectionPickerText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  sectionPickerTextActive: {
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  sectionPickerProgress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  itemNumber: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.tertiary,
    width: 24,
  },
  itemLabel: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  requiredBadge: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: fontWeight.medium,
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
  itemCardMobile: {
    padding: spacing.sm,
  },
  footerMobile: {
    padding: spacing.sm,
    gap: spacing.sm,
  },
});
