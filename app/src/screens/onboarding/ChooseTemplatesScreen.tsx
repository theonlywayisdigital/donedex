/**
 * Choose Templates Screen
 * Allows selecting starter templates during onboarding
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type ChooseTemplatesScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'ChooseTemplates'
>;

interface Props {
  navigation: ChooseTemplatesScreenNavigationProp;
}

// Starter templates - currently empty, will be re-added once field types are finalized
// TODO: Re-populate with proper starter templates from library_templates table
const STARTER_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  sections: number;
  icon: string;
}> = [];

export function ChooseTemplatesScreen({ navigation }: Props) {
  const {
    selectedTemplateIds,
    setSelectedTemplates,
    saveToServer,
    isSaving,
  } = useOnboardingStore();

  const [selectedIds, setSelectedIds] = useState<string[]>(selectedTemplateIds);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleTemplate = (templateId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId);
      }
      return [...prev, templateId];
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(STARTER_TEMPLATES.map((t) => t.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleContinue = async () => {
    // Update store
    setSelectedTemplates(selectedIds);

    // Save to server
    await saveToServer();

    // Navigate to complete (skip CreateFirstRecord - not relevant)
    navigation.navigate('Complete');
  };

  const handleSkip = () => {
    navigation.navigate('Complete');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '86%' }]} />
          </View>
          <Text style={styles.progressText}>Step 6 of 7</Text>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Choose templates</Text>
          <Text style={styles.subtitle}>
            Select starter templates for your organisation. You can create custom templates later.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity onPress={handleSelectAll}>
            <Text style={styles.quickActionText}>Select All</Text>
          </TouchableOpacity>
          <Text style={styles.quickActionDivider}>•</Text>
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.quickActionText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        {/* Templates Grid */}
        <View style={styles.templatesContainer}>
          {STARTER_TEMPLATES.map((template) => {
            const isSelected = selectedIds.includes(template.id);
            return (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  isSelected && styles.templateCardSelected,
                ]}
                onPress={() => handleToggleTemplate(template.id)}
                activeOpacity={0.7}
              >
                <View style={styles.templateHeader}>
                  <Text style={styles.templateIcon}>{template.icon}</Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && styles.checkboxSelected,
                    ]}
                  >
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </View>

                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>

                <View style={styles.templateMeta}>
                  <Text style={styles.templateMetaText}>
                    {`${template.sections} sections`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selection Count */}
        {selectedIds.length > 0 && (
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionInfoText}>
              {`${selectedIds.length} template${selectedIds.length !== 1 ? 's' : ''} selected`}
            </Text>
          </View>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Text style={styles.infoNoteText}>
            Don't see what you need? You can import your own templates using our AI-powered template builder.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={selectedIds.length > 0 ? 'Continue' : 'Skip for Now'}
            onPress={selectedIds.length > 0 ? handleContinue : handleSkip}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  quickActionText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  quickActionDivider: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginHorizontal: spacing.sm,
  },
  templatesContainer: {
    marginBottom: spacing.lg,
  },
  templateCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  templateCardSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  templateIcon: {
    fontSize: 32,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkboxSelected: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  templateName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  templateMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  templateMetaText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  selectionInfo: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  selectionInfoText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  infoNote: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoNoteText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.md,
  },
});
