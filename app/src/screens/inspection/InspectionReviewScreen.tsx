import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { showNotification, showConfirm } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button } from '../../components/ui';
import { useInspectionStore } from '../../store/inspectionStore';
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
    default:
      return value;
  }
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
      if (response && response.responseValue !== null) {
        completedItems++;

        // Check for issues
        const value = response.responseValue;
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

    showConfirm(
      'Submit Inspection',
      'Once submitted, this inspection cannot be edited. Are you sure you want to submit?',
      async () => {
        const result = await submitInspection();
        if (result.error) {
          showNotification('Error', result.error);
        } else {
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
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
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
              const isMissing = value === null && item.is_required;

              return (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemLabel} numberOfLines={2}>
                    {item.label}
                    {item.is_required && <Text style={styles.requiredMark}> *</Text>}
                  </Text>
                  <Text style={[styles.itemValue, { color: statusColor }, isMissing && styles.itemMissing]}>
                    {isMissing ? 'Required' : formatResponseValue(item.item_type, value)}
                  </Text>
                </View>
              );
            })}
          </Card>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
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
  itemValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    textAlign: 'right',
    maxWidth: 120,
  },
  itemMissing: {
    fontStyle: 'italic',
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
});
