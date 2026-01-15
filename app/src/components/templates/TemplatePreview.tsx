import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { FIELD_TYPE_CONFIG } from '../../constants/fieldTypes';
import { ItemType, PhotoRule } from '../../services/templates';
import { Icon } from '../ui';

interface PreviewItem {
  id: string;
  label: string;
  item_type: ItemType;
  is_required: boolean;
  photo_rule: PhotoRule;
  options: string[] | null;
  help_text?: string | null;
  placeholder_text?: string | null;
  declaration_text?: string | null;
}

interface PreviewSection {
  id: string;
  name: string;
  items: PreviewItem[];
}

interface TemplatePreviewProps {
  name: string;
  description: string;
  sections: PreviewSection[];
}

export function TemplatePreview({ name, description, sections }: TemplatePreviewProps) {
  const renderFieldPreview = (item: PreviewItem) => {
    const config = FIELD_TYPE_CONFIG[item.item_type];

    switch (item.item_type) {
      case 'pass_fail':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.optionButton, styles.successButton]}>
              <Text style={styles.optionButtonText}>Pass</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.dangerButton]}>
              <Text style={styles.optionButtonText}>Fail</Text>
            </TouchableOpacity>
          </View>
        );

      case 'yes_no':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.optionButton, styles.successButton]}>
              <Text style={styles.optionButtonText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.dangerButton]}>
              <Text style={styles.optionButtonText}>No</Text>
            </TouchableOpacity>
          </View>
        );

      case 'condition':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.optionButton, styles.successButton]}>
              <Text style={styles.optionButtonText}>Good</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.warningButton]}>
              <Text style={styles.optionButtonText}>Fair</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.dangerButton]}>
              <Text style={styles.optionButtonText}>Poor</Text>
            </TouchableOpacity>
          </View>
        );

      case 'severity':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.optionButton, styles.successButton]}>
              <Text style={styles.optionButtonText}>Low</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.warningButton]}>
              <Text style={styles.optionButtonText}>Medium</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, styles.dangerButton]}>
              <Text style={styles.optionButtonText}>High</Text>
            </TouchableOpacity>
          </View>
        );

      case 'traffic_light':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.trafficLight, { backgroundColor: colors.success }]}>
              <Text style={styles.trafficLightText}>Green</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.trafficLight, { backgroundColor: colors.warning }]}>
              <Text style={styles.trafficLightText}>Amber</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.trafficLight, { backgroundColor: colors.danger }]}>
              <Text style={styles.trafficLightText}>Red</Text>
            </TouchableOpacity>
          </View>
        );

      case 'text':
        return (
          <View style={styles.textInput}>
            <Text style={styles.placeholderText}>
              {item.placeholder_text || 'Enter text...'}
            </Text>
          </View>
        );

      case 'number':
        return (
          <View style={styles.textInput}>
            <Text style={styles.placeholderText}>
              {item.placeholder_text || 'Enter number...'}
            </Text>
          </View>
        );

      case 'rating':
        return (
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Icon key={star} name="star" size={32} color={colors.neutral[300]} />
            ))}
          </View>
        );

      case 'rating_numeric':
        return (
          <View style={styles.numericRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity key={num} style={styles.numericButton}>
                <Text style={styles.numericButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'slider':
        return (
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              <View style={styles.sliderFill} />
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>0%</Text>
              <Text style={styles.sliderLabel}>100%</Text>
            </View>
          </View>
        );

      case 'date':
      case 'expiry_date':
        return (
          <TouchableOpacity style={styles.dateButton}>
            <Icon name="calendar" size={20} color={colors.text.secondary} />
            <Text style={styles.dateButtonText}>Select date</Text>
          </TouchableOpacity>
        );

      case 'time':
        return (
          <TouchableOpacity style={styles.dateButton}>
            <Icon name="clock" size={20} color={colors.text.secondary} />
            <Text style={styles.dateButtonText}>Select time</Text>
          </TouchableOpacity>
        );

      case 'datetime':
        return (
          <TouchableOpacity style={styles.dateButton}>
            <Icon name="calendar" size={20} color={colors.text.secondary} />
            <Text style={styles.dateButtonText}>Select date & time</Text>
          </TouchableOpacity>
        );

      case 'photo':
        return (
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="camera" size={20} color={colors.text.secondary} />
            <Text style={styles.mediaButtonText}>Take Photo</Text>
          </TouchableOpacity>
        );

      case 'photo_before_after':
        return (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.mediaButton}>
              <Icon name="camera" size={20} color={colors.text.secondary} />
              <Text style={styles.mediaButtonText}>Before</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaButton}>
              <Icon name="camera" size={20} color={colors.text.secondary} />
              <Text style={styles.mediaButtonText}>After</Text>
            </TouchableOpacity>
          </View>
        );

      case 'video':
        return (
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="video" size={20} color={colors.text.secondary} />
            <Text style={styles.mediaButtonText}>Record Video</Text>
          </TouchableOpacity>
        );

      case 'audio':
        return (
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="mic" size={20} color={colors.text.secondary} />
            <Text style={styles.mediaButtonText}>Record Audio</Text>
          </TouchableOpacity>
        );

      case 'signature':
        return (
          <View style={styles.signatureBox}>
            <Text style={styles.signatureText}>Tap to sign</Text>
          </View>
        );

      case 'select':
        return (
          <TouchableOpacity style={styles.selectButton}>
            <Text style={styles.selectButtonText}>Select option</Text>
            <Icon name="chevron-down" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        );

      case 'multi_select':
        return (
          <View style={styles.checkboxList}>
            {(item.options || ['Option 1', 'Option 2', 'Option 3']).slice(0, 3).map((opt, idx) => (
              <View key={idx} style={styles.checkboxRow}>
                <View style={styles.checkbox} />
                <Text style={styles.checkboxLabel}>{opt}</Text>
              </View>
            ))}
          </View>
        );

      case 'counter':
        return (
          <View style={styles.counterContainer}>
            <TouchableOpacity style={styles.counterButton}>
              <Text style={styles.counterButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>0</Text>
            <TouchableOpacity style={styles.counterButton}>
              <Text style={styles.counterButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        );

      case 'measurement':
        return (
          <View style={styles.measurementContainer}>
            <View style={[styles.textInput, { flex: 1 }]}>
              <Text style={styles.placeholderText}>0</Text>
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitText}>m</Text>
            </View>
          </View>
        );

      case 'temperature':
        return (
          <View style={styles.measurementContainer}>
            <View style={[styles.textInput, { flex: 1 }]}>
              <Text style={styles.placeholderText}>0</Text>
            </View>
            <View style={styles.unitSelector}>
              <Text style={styles.unitText}>°C</Text>
            </View>
          </View>
        );

      case 'currency':
        return (
          <View style={styles.measurementContainer}>
            <View style={styles.unitSelector}>
              <Text style={styles.unitText}>£</Text>
            </View>
            <View style={[styles.textInput, { flex: 1 }]}>
              <Text style={styles.placeholderText}>0.00</Text>
            </View>
          </View>
        );

      case 'gps_location':
        return (
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="map-pin" size={20} color={colors.text.secondary} />
            <Text style={styles.mediaButtonText}>Capture Location</Text>
          </TouchableOpacity>
        );

      case 'barcode_scan':
        return (
          <TouchableOpacity style={styles.mediaButton}>
            <Icon name="scan" size={20} color={colors.text.secondary} />
            <Text style={styles.mediaButtonText}>Scan Barcode</Text>
          </TouchableOpacity>
        );

      case 'declaration':
        return (
          <View style={styles.declarationContainer}>
            <View style={styles.checkboxRow}>
              <View style={styles.checkbox} />
              <Text style={styles.declarationText}>
                {item.declaration_text || 'I confirm the above information is accurate'}
              </Text>
            </View>
          </View>
        );

      case 'instruction':
        return (
          <View style={styles.instructionBox}>
            <Icon name="info" size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.instructionText}>
              {item.help_text || 'Instructions will appear here'}
            </Text>
          </View>
        );

      case 'checklist':
        return (
          <View style={styles.checkboxList}>
            <View style={styles.checkboxRow}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>Checklist item 1</Text>
            </View>
            <View style={styles.checkboxRow}>
              <View style={styles.checkbox} />
              <Text style={styles.checkboxLabel}>Checklist item 2</Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.textInput}>
            <Text style={styles.placeholderText}>
              {config?.label || item.item_type}
            </Text>
          </View>
        );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Template Header */}
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{name || 'Untitled Template'}</Text>
        {description ? (
          <Text style={styles.templateDescription}>{description}</Text>
        ) : null}
      </View>

      {/* Empty State */}
      {sections.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No sections yet. Add sections and items to see the preview.
          </Text>
        </View>
      )}

      {/* Sections */}
      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionName}>{section.name}</Text>
            <Text style={styles.itemCount}>
              {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {section.items.length === 0 ? (
            <View style={styles.emptySectionItems}>
              <Text style={styles.emptySectionText}>No items in this section</Text>
            </View>
          ) : (
            section.items.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemLabel}>
                    {item.label || 'Untitled Item'}
                    {item.is_required && <Text style={styles.requiredMark}> *</Text>}
                  </Text>
                  {item.photo_rule !== 'never' && (
                    <View style={styles.photoIndicator}>
                      <Icon name="camera" size={12} color={colors.text.secondary} />
                      <Text style={styles.photoIndicatorText}>
                        {item.photo_rule === 'always' ? 'Required' : 'On fail'}
                      </Text>
                    </View>
                  )}
                </View>
                {item.help_text && item.item_type !== 'instruction' && (
                  <Text style={styles.helpText}>{item.help_text}</Text>
                )}
                <View style={styles.fieldContainer}>
                  {renderFieldPreview(item)}
                </View>
              </View>
            ))
          )}
        </View>
      ))}

      {/* Preview Footer */}
      <View style={styles.previewFooter}>
        <Text style={styles.previewFooterText}>
          This is a preview of how the template will appear during inspections.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  templateHeader: {
    marginBottom: spacing.lg,
  },
  templateName: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  emptyState: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.card,
  },
  emptyStateText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.primary.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  sectionName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  itemCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  emptySectionItems: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
  },
  item: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  itemLabel: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  requiredMark: {
    color: colors.danger,
  },
  photoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: spacing.sm,
  },
  photoIndicatorText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  helpText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  fieldContainer: {
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  optionButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  trafficLight: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  trafficLightText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  textInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  numericRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  numericButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  numericButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  sliderContainer: {
    paddingVertical: spacing.sm,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  sliderFill: {
    width: '50%',
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  sliderLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  dateButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  mediaButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  signatureBox: {
    height: 100,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signatureText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  checkboxList: {
    gap: spacing.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
  },
  checkboxLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  counterValue: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    minWidth: 48,
    textAlign: 'center',
  },
  measurementContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unitSelector: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    minWidth: 48,
    alignItems: 'center',
  },
  unitText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  declarationContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  declarationText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  instructionBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  instructionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  previewFooter: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  previewFooterText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
