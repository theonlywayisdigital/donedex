import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Print from 'expo-print';
import { Card, Button } from '../../components/ui';
import { ResponseInput } from '../../components/inspection';
import { useResponsive } from '../../hooks/useResponsive';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { fetchTemplateWithSections, TemplateWithSections, TemplateItem } from '../../services/templates';
import { generateHtml } from '../../services/pdfExport/htmlGenerator';
import { ReportWithDetails, ReportResponse } from '../../services/reports';
import type { TemplatesStackParamList } from '../../navigation/MainNavigator';

type PreviewRouteProp = RouteProp<TemplatesStackParamList, 'TemplatePreview'>;
type PreviewNavigationProp = NativeStackNavigationProp<TemplatesStackParamList, 'TemplatePreview'>;

// Local response type for preview state
interface PreviewResponse {
  templateItemId: string;
  itemLabel: string;
  itemType: string;
  responseValue: string | null;
  photos: string[];
  severity: 'low' | 'medium' | 'high' | null;
  notes: string | null;
}

export function TemplatePreviewScreen() {
  const navigation = useNavigation<PreviewNavigationProp>();
  const route = useRoute<PreviewRouteProp>();
  const { templateId } = route.params;
  const { isMobile } = useResponsive();

  const [template, setTemplate] = useState<TemplateWithSections | null>(null);
  const [responses, setResponses] = useState<Map<string, PreviewResponse>>(new Map());
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Load template on mount
  useEffect(() => {
    async function loadTemplate() {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchTemplateWithSections(templateId);

      if (fetchError) {
        console.error('[TemplatePreviewScreen] Fetch error:', fetchError.message);
        setError(fetchError.message);
        setIsLoading(false);
        return;
      }

      if (data) {
        setTemplate(data);
        // Initialize empty responses for all items
        const initialResponses = new Map<string, PreviewResponse>();
        data.template_sections.forEach((section) => {
          section.template_items.forEach((item) => {
            initialResponses.set(item.id, {
              templateItemId: item.id,
              itemLabel: item.label,
              itemType: item.item_type,
              responseValue: null,
              photos: [],
              severity: null,
              notes: null,
            });
          });
        });
        setResponses(initialResponses);
      }

      setIsLoading(false);
    }

    loadTemplate();
  }, [templateId]);

  const currentSection = template?.template_sections[currentSectionIndex];
  const totalSections = template?.template_sections.length || 0;
  const isLastSection = currentSectionIndex === totalSections - 1;
  const isFirstSection = currentSectionIndex === 0;

  // Evaluate condition for conditional visibility
  const evaluateCondition = useCallback((item: TemplateItem): boolean => {
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
  }, [responses]);

  // Filter visible items based on conditions
  const getVisibleItems = useCallback((items: TemplateItem[]): TemplateItem[] => {
    return items.filter((item) => evaluateCondition(item));
  }, [evaluateCondition]);

  // Calculate section progress
  const getSectionProgress = useCallback((sectionIndex: number) => {
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
  }, [template, responses, getVisibleItems]);

  const currentSectionProgress = getSectionProgress(currentSectionIndex);

  const handleResponseChange = useCallback((item: TemplateItem, value: string | null) => {
    setResponses((prev) => {
      const newResponses = new Map(prev);
      const existing = newResponses.get(item.id);
      if (existing) {
        newResponses.set(item.id, {
          ...existing,
          responseValue: value,
        });
      }
      return newResponses;
    });
  }, []);

  const handleNextSection = () => {
    if (!isLastSection) {
      setCurrentSectionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousSection = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Generate sample value for field type
  const getSampleValue = (itemType: string, options?: string[] | null): string | null => {
    switch (itemType) {
      case 'pass_fail':
        return 'pass';
      case 'yes_no':
        return 'yes';
      case 'condition':
        return 'good';
      case 'severity':
        return 'low';
      case 'traffic_light':
        return 'green';
      case 'rating':
        return '4';
      case 'rating_numeric':
        return '8';
      case 'slider':
        return '75';
      case 'text':
        return 'Sample text response';
      case 'number':
        return '42';
      case 'counter':
        return '5';
      case 'measurement':
        return JSON.stringify({ value: '100', unit: 'cm' });
      case 'temperature':
        return JSON.stringify({ value: '22', unit: 'celsius' });
      case 'currency':
        return JSON.stringify({ value: '150.00', currency: 'GBP' });
      case 'datetime':
      case 'date':
      case 'time':
        return new Date().toISOString();
      case 'select':
        return options && options.length > 0 ? options[0] : 'Option 1';
      case 'multi_select':
        if (options && options.length >= 2) return JSON.stringify(options.slice(0, 2));
        return JSON.stringify(['Option 1', 'Option 2']);
      case 'checklist':
        return JSON.stringify({ item1: true, item2: false });
      case 'declaration':
        return 'accepted';
      case 'gps_location':
        return JSON.stringify({ lat: 51.5074, lng: -0.1278 });
      case 'barcode_scan':
        return 'SAMPLE-BARCODE-123';
      default:
        return null;
    }
  };

  // Generate PDF preview with sample data
  const handlePreviewPdf = async () => {
    if (!template) return;

    setIsGeneratingPdf(true);

    try {
      // Create mock report data
      const mockReport: ReportWithDetails = {
        id: 'preview',
        organisation_id: 'preview-org',
        record_id: 'preview-record',
        template_id: template.id,
        user_id: 'preview-user',
        status: 'submitted',
        started_at: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        record: { name: 'Sample Record' },
        template: { name: template.name },
        user_profile: { full_name: 'Preview User' },
      };

      // Create mock responses from current state or sample data
      const mockResponsesMap = new Map<string, ReportResponse>();
      template.template_sections.forEach((section) => {
        section.template_items.forEach((item) => {
          const previewResponse = responses.get(item.id);
          const itemOptions = Array.isArray(item.options) ? item.options as string[] : null;
          const value = previewResponse?.responseValue || getSampleValue(item.item_type, itemOptions);

          mockResponsesMap.set(item.id, {
            id: `preview-${item.id}`,
            report_id: 'preview',
            template_item_id: item.id,
            item_label: item.label,
            item_type: item.item_type,
            response_value: value,
            severity: previewResponse?.severity || null,
            notes: previewResponse?.notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
      });

      // Generate HTML
      const html = generateHtml({
        report: mockReport,
        template,
        responses: mockResponsesMap,
      });

      // Show print dialog (works on both web and native)
      await Print.printAsync({ html });
    } catch (err) {
      console.error('Error generating PDF preview:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading template...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !template) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || 'Template not found'}</Text>
          <Button title="Go Back" onPress={handleClose} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Preview Mode Banner */}
      <View style={styles.previewBanner}>
        <Eye size={18} color={colors.primary.DEFAULT} />
        <View style={styles.previewBannerText}>
          <Text style={styles.previewBannerTitle}>PREVIEW MODE</Text>
          <Text style={styles.previewBannerSubtitle}>Changes are not saved</Text>
        </View>
      </View>

      {/* Template Name */}
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{template.name}</Text>
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}
      </View>

      {/* Section Navigation */}
      <View style={styles.sectionNav}>
        <TouchableOpacity
          style={styles.sectionSelector}
          onPress={() => setShowSectionPicker(!showSectionPicker)}
        >
          <Text style={styles.sectionName}>{currentSection?.name}</Text>
          <View style={styles.sectionSelectorRight}>
            <Text style={styles.sectionCount}>
              {currentSectionIndex + 1} of {totalSections}
            </Text>
            {showSectionPicker ? (
              <ChevronUp size={18} color={colors.text.secondary} />
            ) : (
              <ChevronDown size={18} color={colors.text.secondary} />
            )}
          </View>
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
                    setCurrentSectionIndex(index);
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
        {currentSection && getVisibleItems(currentSection.template_items).map((item, index) => {
          const response = responses.get(item.id);
          const isConditional = !!item.condition_field_id;

          return (
            <Card key={item.id} style={isMobile ? StyleSheet.flatten([styles.itemCard, styles.itemCardMobile]) : styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemNumber}>{index + 1}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.is_required && <Text style={styles.requiredBadge}>Required</Text>}
                {isConditional && <Text style={styles.conditionalBadge}>Conditional</Text>}
              </View>
              <ResponseInput
                itemType={item.item_type}
                value={response?.responseValue || null}
                onChange={(value) => handleResponseChange(item, value)}
                options={item.options}
                photoRule={item.photo_rule}
                helpText={item.help_text}
                placeholder={item.placeholder_text}
                datetimeMode={item.datetime_mode}
                ratingMax={item.rating_max}
                declarationText={item.declaration_text}
                signatureRequiresName={item.signature_requires_name}
                isPreview={true}
              />
            </Card>
          );
        })}
      </ScrollView>

      {/* Section navigation footer */}
      <View style={[styles.sectionFooter, isMobile && styles.sectionFooterMobile]}>
        <Button
          title={isFirstSection ? 'Close' : 'Previous'}
          onPress={isFirstSection ? handleClose : handlePreviousSection}
          variant="secondary"
          style={styles.navButton}
        />
        <Button
          title={isLastSection ? 'Done' : 'Next'}
          onPress={isLastSection ? handleClose : handleNextSection}
          style={styles.navButton}
        />
      </View>

      {/* Action buttons footer */}
      <View style={[styles.actionFooter, isMobile && styles.actionFooterMobile]}>
        <Button
          title="Preview PDF"
          onPress={handlePreviewPdf}
          variant="secondary"
          loading={isGeneratingPdf}
          leftIcon="file-text"
          style={styles.actionButton}
        />
        <Button
          title="Use This Template"
          onPress={() => {
            // Navigate to start inspection flow
            // @ts-ignore - cross-navigator navigation
            navigation.navigate('Home', {
              screen: 'RecordForTemplate',
              params: { templateId: template.id, templateName: template.name },
            });
          }}
          style={styles.actionButton}
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
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.light,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  previewBannerText: {
    flex: 1,
  },
  previewBannerTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    letterSpacing: 0.5,
  },
  previewBannerSubtitle: {
    fontSize: fontSize.caption,
    color: colors.primary.mid,
  },
  templateHeader: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  templateName: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  templateDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  sectionNav: {
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
  sectionSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
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
    top: 200,
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
  },
  sectionPickerTextActive: {
    fontWeight: fontWeight.bold,
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
    paddingBottom: spacing.xl,
  },
  contentContainerMobile: {
    padding: spacing.sm,
  },
  itemCard: {
    marginBottom: spacing.md,
  },
  itemCardMobile: {
    marginBottom: spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  itemNumber: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.white,
    backgroundColor: colors.primary.DEFAULT,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: spacing.sm,
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  requiredBadge: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  conditionalBadge: {
    fontSize: fontSize.caption,
    color: colors.warning,
    fontWeight: fontWeight.medium,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  sectionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
  },
  sectionFooterMobile: {
    padding: spacing.sm,
  },
  navButton: {
    flex: 1,
  },
  actionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: 0,
    backgroundColor: colors.white,
    gap: spacing.md,
  },
  actionFooterMobile: {
    padding: spacing.sm,
    paddingTop: 0,
  },
  actionButton: {
    flex: 1,
  },
});
