import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';
import type { PIIDetectionResult } from '../../services/piiDetection';
import type { PiiSeverity } from '../../types';
import { getSeverityStyle, getWarningMessage } from '../../services/piiDetection';

// ============================================
// Types
// ============================================

export interface PIIWarningProps {
  /**
   * Detection result from detectPII()
   */
  detection: PIIDetectionResult;

  /**
   * Called when user dismisses the warning
   */
  onDismiss?: () => void;

  /**
   * Called when user taps "Learn More"
   */
  onLearnMore?: () => void;

  /**
   * Compact mode - shows less text
   */
  compact?: boolean;

  /**
   * Custom style
   */
  style?: object;
}

// ============================================
// Severity Styles
// ============================================

const SEVERITY_CONFIGS: Record<
  PiiSeverity,
  {
    backgroundColor: string;
    borderColor: string;
    iconColor: string;
    title: string;
  }
> = {
  low: {
    backgroundColor: '#FFFBEB',
    borderColor: colors.warning,
    iconColor: colors.warning,
    title: 'Privacy Notice',
  },
  medium: {
    backgroundColor: '#FFFBEB',
    borderColor: colors.warning,
    iconColor: colors.warning,
    title: 'Privacy Notice',
  },
  high: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    iconColor: '#F59E0B',
    title: 'Personal Data Detected',
  },
  critical: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.danger,
    iconColor: colors.danger,
    title: 'Sensitive Data Detected',
  },
};

// ============================================
// Component
// ============================================

export function PIIWarning({
  detection,
  onDismiss,
  onLearnMore,
  compact = false,
  style,
}: PIIWarningProps) {
  // Don't render if no detections
  if (!detection.hasDetections || !detection.highestSeverity) {
    return null;
  }

  const config = SEVERITY_CONFIGS[detection.highestSeverity];
  const uniqueTypes = [...new Set(detection.matches.map((m) => m.label))];
  const message = getWarningMessage(detection);

  if (compact) {
    return (
      <View
        style={[
          styles.containerCompact,
          {
            backgroundColor: config.backgroundColor,
            borderLeftColor: config.borderColor,
          },
          style,
        ]}
      >
        <Icon name="alert-triangle" size={16} color={config.iconColor} />
        <Text style={styles.textCompact}>May contain personal data</Text>
        {onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="x" size={14} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
        },
        style,
      ]}
    >
      <View style={styles.header}>
        <Icon name="alert-triangle" size={20} color={config.iconColor} />
        <Text style={[styles.title, { color: config.iconColor }]}>
          {config.title}
        </Text>
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="x" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.detected}>
          Detected: {uniqueTypes.join(', ')}
        </Text>
        <Text style={styles.description}>{message}</Text>
      </View>

      {onLearnMore && (
        <TouchableOpacity style={styles.learnMoreButton} onPress={onLearnMore}>
          <Text style={styles.learnMoreText}>Learn More</Text>
          <Icon name="external-link" size={14} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// Inline Warning (simpler variant)
// ============================================

export interface PIIInlineWarningProps {
  severity: PiiSeverity;
  message: string;
  onDismiss?: () => void;
}

/**
 * Simpler inline warning that appears below an input field
 */
export function PIIInlineWarning({
  severity,
  message,
  onDismiss,
}: PIIInlineWarningProps) {
  const config = SEVERITY_CONFIGS[severity];

  return (
    <View
      style={[
        styles.inlineContainer,
        { borderColor: config.borderColor },
      ]}
    >
      <Icon name="alert-triangle" size={14} color={config.iconColor} />
      <Text style={[styles.inlineText, { color: config.iconColor }]}>
        {message}
      </Text>
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="x" size={12} color={colors.text.tertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Full warning container
  container: {
    borderLeftWidth: 4,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },

  // Compact container
  containerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },

  // Header row
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  title: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },

  dismissButton: {
    padding: spacing.xs,
  },

  // Content
  content: {
    marginLeft: spacing.lg + spacing.sm, // Align with title text
  },

  detected: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  description: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: fontSize.caption * 1.4,
  },

  // Learn more button
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginLeft: spacing.lg + spacing.sm,
  },

  learnMoreText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },

  // Compact text
  textCompact: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },

  // Inline variant
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
    backgroundColor: colors.background,
  },

  inlineText: {
    flex: 1,
    fontSize: fontSize.caption,
  },
});

export default PIIWarning;
