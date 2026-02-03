import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sparkles, CheckCircle, FileText, Pencil } from 'lucide-react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';
import type { GeneratedTemplate } from '../../types/templateBuilder';

interface TemplatePreviewCardProps {
  template: GeneratedTemplate;
  onReviewEdit: () => void;
  onUseTemplate: () => void;
  saving?: boolean;
}

export function TemplatePreviewCard({
  template,
  onReviewEdit,
  onUseTemplate,
  saving = false,
}: TemplatePreviewCardProps) {
  const totalItems = template.sections.reduce(
    (sum, section) => sum + section.items.length,
    0
  );

  return (
    <View style={styles.container}>
      {/* Header with sparkle icon */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Sparkles size={24} color={colors.primary.DEFAULT} />
        </View>
        <Text style={styles.readyText}>Your template is ready!</Text>
      </View>

      {/* Template summary card */}
      <View style={styles.card}>
        <Text style={styles.templateName}>{template.name}</Text>
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <FileText size={16} color={colors.text.secondary} />
            <Text style={styles.statText}>
              {template.sections.length} {template.sections.length === 1 ? 'section' : 'sections'}
            </Text>
          </View>
          <View style={styles.stat}>
            <CheckCircle size={16} color={colors.text.secondary} />
            <Text style={styles.statText}>
              {totalItems} {totalItems === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* Section list preview */}
        <View style={styles.sectionsPreview}>
          {template.sections.map((section, index) => (
            <View key={index} style={styles.sectionItem}>
              <Text style={styles.sectionBullet}>{'\u2022'}</Text>
              <Text style={styles.sectionName}>{section.name}</Text>
              <Text style={styles.sectionItemCount}>
                ({section.items.length})
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onReviewEdit}
          disabled={saving}
        >
          <Pencil size={18} color={colors.primary.DEFAULT} />
          <Text style={styles.secondaryButtonText}>Review & Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          onPress={onUseTemplate}
          disabled={saving}
        >
          <CheckCircle size={18} color={colors.white} />
          <Text style={styles.primaryButtonText}>
            {saving ? 'Saving...' : 'Use Template'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  readyText: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing.md,
    ...shadows.card,
  },
  templateName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  sectionsPreview: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing.md,
  },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  sectionBullet: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    marginRight: spacing.sm,
  },
  sectionName: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  sectionItemCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  secondaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  primaryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
