import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Icon } from './Icon';
import { Button } from './Button';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';
import type { PIIDetectionResult, PIIMatch } from '../../services/piiDetection';

// ============================================
// Types
// ============================================

export interface PIIWarningModalProps {
  /**
   * Whether the modal is visible
   */
  visible: boolean;

  /**
   * Detection results to display
   * Can be a single result or map of field ID to result
   */
  detections: PIIDetectionResult | Map<string, PIIDetectionResult>;

  /**
   * Field labels for display (optional, for Map input)
   */
  fieldLabels?: Map<string, string>;

  /**
   * Called when user cancels (goes back to edit)
   */
  onCancel: () => void;

  /**
   * Called when user acknowledges and proceeds
   */
  onProceed: () => void;

  /**
   * Loading state for proceed button
   */
  loading?: boolean;
}

// ============================================
// Component
// ============================================

export function PIIWarningModal({
  visible,
  detections,
  fieldLabels,
  onCancel,
  onProceed,
  loading = false,
}: PIIWarningModalProps) {
  const { width: windowWidth } = useWindowDimensions();
  const modalMaxWidth = Math.min(400, windowWidth - spacing.lg * 2);

  // Normalize detections to array of matches
  const allMatches = React.useMemo(() => {
    if (detections instanceof Map) {
      const matches: Array<{ fieldLabel: string; match: PIIMatch }> = [];
      detections.forEach((result, fieldId) => {
        if (result.hasDetections) {
          const label = fieldLabels?.get(fieldId) || 'Unknown field';
          result.matches.forEach((match) => {
            matches.push({ fieldLabel: label, match });
          });
        }
      });
      return matches;
    } else {
      return detections.matches.map((match) => ({
        fieldLabel: 'This field',
        match,
      }));
    }
  }, [detections, fieldLabels]);

  // Filter to show only critical and high severity
  const criticalMatches = allMatches.filter(
    (m) => m.match.severity === 'critical' || m.match.severity === 'high'
  );

  // Group by detection type for cleaner display
  const groupedTypes = React.useMemo(() => {
    const groups = new Map<string, { label: string; severity: string; count: number }>();
    criticalMatches.forEach(({ match }) => {
      const existing = groups.get(match.category);
      if (existing) {
        existing.count++;
      } else {
        groups.set(match.category, {
          label: match.label,
          severity: match.severity,
          count: 1,
        });
      }
    });
    return Array.from(groups.values());
  }, [criticalMatches]);

  const hasCritical = criticalMatches.some((m) => m.match.severity === 'critical');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { maxWidth: modalMaxWidth }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon
                name="alert-triangle"
                size={32}
                color={hasCritical ? colors.danger : colors.warning}
              />
            </View>
            <Text style={styles.title}>
              {hasCritical ? 'Sensitive Data Detected' : 'Personal Data Detected'}
            </Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            This record contains what appears to be personal information:
          </Text>

          {/* Detected types list */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {groupedTypes.map((group, index) => (
              <View key={index} style={styles.listItem}>
                <Icon
                  name={group.severity === 'critical' ? 'alert-circle' : 'alert-triangle'}
                  size={18}
                  color={group.severity === 'critical' ? colors.danger : colors.warning}
                />
                <Text style={styles.listItemText}>
                  {group.label}
                  {group.count > 1 && ` (${group.count})`}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Warning text */}
          <View style={styles.warningBox}>
            <Icon name="info" size={16} color={colors.text.secondary} />
            <Text style={styles.warningText}>
              Storing personal data creates legal obligations under GDPR, CCPA, and
              other privacy regulations. Your organisation is responsible for
              handling this data appropriately.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Go Back & Edit</Text>
            </TouchableOpacity>

            <Button
              title="I Understand, Save"
              onPress={onProceed}
              loading={loading}
              variant={hasCritical ? 'danger' : 'primary'}
              style={styles.proceedButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: spacing.lg,
  },

  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.modal,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },

  description: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },

  listContainer: {
    maxHeight: 150,
    marginBottom: spacing.md,
  },

  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },

  listItemText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },

  warningBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },

  warningText: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: fontSize.caption * 1.5,
  },

  actions: {
    gap: spacing.sm,
  },

  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },

  proceedButton: {
    width: '100%',
  },
});

export default PIIWarningModal;
