import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { ItemType, PhotoRule, DatetimeMode, InstructionStyle } from '../../services/templates';
import { Icon, Card } from '../ui';
import { ResponseInput } from '../inspection';

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
  // Extended props
  datetime_mode?: DatetimeMode | null;
  rating_max?: number | null;
  signature_requires_name?: boolean | null;
  min_value?: number | null;
  max_value?: number | null;
  step_value?: number | null;
  unit_options?: string[] | null;
  default_unit?: string | null;
  warning_days_before?: number | null;
  instruction_style?: InstructionStyle | null;
  sub_items?: { label: string }[] | null;
  counter_min?: number | null;
  counter_max?: number | null;
  counter_step?: number | null;
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
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [responses, setResponses] = useState<Map<string, string | null>>(new Map());

  const currentSection = sections[currentSectionIndex];
  const totalSections = sections.length;
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === totalSections - 1;

  const handlePreviousSection = () => {
    if (!isFirstSection) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  };

  const handleNextSection = () => {
    if (!isLastSection) {
      setCurrentSectionIndex((prev) => prev + 1);
    }
  };

  const handleResponseChange = useCallback((itemId: string, value: string | null) => {
    setResponses((prev) => {
      const newMap = new Map(prev);
      newMap.set(itemId, value);
      return newMap;
    });
  }, []);

  // Calculate section progress
  const getSectionProgress = useCallback((sectionIndex: number) => {
    const section = sections[sectionIndex];
    if (!section) return 0;

    const totalItems = section.items.length;
    if (totalItems === 0) return 100;

    let completed = 0;
    section.items.forEach((item) => {
      const response = responses.get(item.id);
      if (response !== null && response !== undefined) {
        completed++;
      }
    });

    return Math.round((completed / totalItems) * 100);
  }, [sections, responses]);

  const currentSectionProgress = getSectionProgress(currentSectionIndex);

  // Get checklist items from sub_items
  const getChecklistItems = (item: PreviewItem): string[] | undefined => {
    if (!item.sub_items) return undefined;
    return item.sub_items.map((si) => si.label);
  };

  // Empty state
  if (sections.length === 0) {
    return (
      <View style={styles.container}>
        {/* Template Header */}
        <View style={styles.templateHeader}>
          <Text style={styles.templateName}>{name || 'Untitled Template'}</Text>
          {description ? (
            <Text style={styles.templateDescription}>{description}</Text>
          ) : null}
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No sections yet. Add sections and items to see the preview.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Template Header */}
      <View style={styles.templateHeader}>
        <Text style={styles.templateName}>{name || 'Untitled Template'}</Text>
        {description ? (
          <Text style={styles.templateDescription}>{description}</Text>
        ) : null}
        <Text style={styles.templateStats}>
          {totalSections} sections, {sections.reduce((sum, s) => sum + s.items.length, 0)} items
        </Text>
      </View>

      {/* Section Navigation Header */}
      <View style={styles.sectionNavHeader}>
        <Text style={styles.sectionNavTitle}>{currentSection?.name || 'Section'}</Text>
        <Text style={styles.sectionNavCounter}>
          Section {currentSectionIndex + 1} of {totalSections}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentSectionIndex + 1) / totalSections) * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>{currentSectionProgress}% complete</Text>
      </View>

      {/* Current Section Items */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {currentSection && currentSection.items.length === 0 ? (
          <View style={styles.emptySectionItems}>
            <Text style={styles.emptySectionText}>No items in this section</Text>
          </View>
        ) : (
          currentSection?.items.map((item, index) => {
            const currentValue = responses.get(item.id) ?? null;

            return (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemNumber}>
                    <Text style={styles.itemNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.itemHeaderContent}>
                    <Text style={styles.itemLabel}>{item.label || 'Untitled Item'}</Text>
                    {item.is_required && <Text style={styles.requiredBadge}>Required</Text>}
                  </View>
                </View>
                {item.help_text && item.item_type !== 'instruction' && (
                  <Text style={styles.helpText}>{item.help_text}</Text>
                )}
                <ResponseInput
                  itemType={item.item_type}
                  value={currentValue}
                  onChange={(value) => handleResponseChange(item.id, value)}
                  options={item.options || undefined}
                  photoRule={item.photo_rule}
                  helpText={item.item_type === 'instruction' ? item.help_text : undefined}
                  placeholder={item.placeholder_text}
                  datetimeMode={item.datetime_mode}
                  ratingMax={item.rating_max}
                  declarationText={item.declaration_text}
                  signatureRequiresName={item.signature_requires_name}
                  minValue={item.min_value ?? item.counter_min}
                  maxValue={item.max_value ?? item.counter_max}
                  stepValue={item.step_value ?? item.counter_step}
                  unitOptions={item.unit_options}
                  defaultUnit={item.default_unit}
                  warningDaysBefore={item.warning_days_before}
                  instructionText={item.label}
                  instructionStyle={item.instruction_style}
                  checklistItems={getChecklistItems(item)}
                  isPreview={true}
                />
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Section Navigation Footer */}
      <View style={styles.sectionNavFooter}>
        <TouchableOpacity
          style={[styles.navButton, isFirstSection && styles.navButtonDisabled]}
          onPress={handlePreviousSection}
          disabled={isFirstSection}
        >
          <Icon
            name="chevron-left"
            size={20}
            color={isFirstSection ? colors.neutral[300] : colors.text.primary}
          />
          <Text style={[styles.navButtonText, isFirstSection && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.navButtonPrimary]}
          onPress={handleNextSection}
          disabled={isLastSection}
        >
          <Text style={styles.navButtonTextPrimary}>
            {isLastSection ? 'Done' : 'Next'}
          </Text>
          {!isLastSection && (
            <Icon name="chevron-right" size={20} color={colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  templateHeader: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  templateName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  templateStats: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sectionNavHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  sectionNavTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  sectionNavCounter: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    minWidth: 80,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.md,
    gap: spacing.md,
  },
  emptySectionItems: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
  },
  itemCard: {
    marginBottom: 0, // Gap handled by parent
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  itemNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumberText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  itemHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  itemLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  requiredBadge: {
    fontSize: fontSize.caption,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  helpText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: 32, // Align with content after number
  },
  sectionNavFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: spacing.md,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    flex: 1,
    gap: spacing.xs,
  },
  navButtonDisabled: {
    backgroundColor: colors.neutral[50],
  },
  navButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  navButtonTextDisabled: {
    color: colors.neutral[300],
  },
  navButtonPrimary: {
    backgroundColor: colors.primary.DEFAULT,
  },
  navButtonTextPrimary: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
