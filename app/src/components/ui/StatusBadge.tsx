import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Icon, IconName } from './Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';

type StatusType =
  | 'pass'
  | 'fail'
  | 'good'
  | 'fair'
  | 'poor'
  | 'pending'
  | 'complete'
  | 'in-progress';

interface StatusConfig {
  icon: IconName;
  color: string;
  backgroundColor: string;
  label: string;
}

const statusConfig: Record<StatusType, StatusConfig> = {
  pass: {
    icon: 'check-circle',
    color: colors.success,
    backgroundColor: '#ECFDF5', // success light
    label: 'Pass',
  },
  fail: {
    icon: 'x-circle',
    color: colors.danger,
    backgroundColor: '#FEF2F2', // danger light
    label: 'Fail',
  },
  good: {
    icon: 'check-circle',
    color: colors.success,
    backgroundColor: '#ECFDF5',
    label: 'Good',
  },
  fair: {
    icon: 'alert-triangle',
    color: colors.warning,
    backgroundColor: '#FFFBEB', // warning light
    label: 'Fair',
  },
  poor: {
    icon: 'x-circle',
    color: colors.danger,
    backgroundColor: '#FEF2F2',
    label: 'Poor',
  },
  pending: {
    icon: 'circle',
    color: colors.neutral[500],
    backgroundColor: colors.neutral[100],
    label: 'Pending',
  },
  complete: {
    icon: 'check-circle',
    color: colors.success,
    backgroundColor: '#ECFDF5',
    label: 'Complete',
  },
  'in-progress': {
    icon: 'clock',
    color: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
    label: 'In Progress',
  },
};

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'sm' | 'md';
  customLabel?: string;
  style?: ViewStyle;
}

export function StatusBadge({
  status,
  showIcon = true,
  showText = true,
  size = 'md',
  customLabel,
  style,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    console.warn(`StatusBadge: Unknown status "${status}"`);
    return null;
  }

  const iconSize = size === 'sm' ? 14 : 16;
  const containerStyle = [
    styles.container,
    size === 'sm' ? styles.containerSm : styles.containerMd,
    { backgroundColor: config.backgroundColor },
    style,
  ];

  return (
    <View style={containerStyle}>
      {showIcon && (
        <Icon
          name={config.icon}
          size={iconSize}
          color={config.color}
        />
      )}
      {showText && (
        <Text
          style={[
            styles.text,
            size === 'sm' ? styles.textSm : styles.textMd,
            { color: config.color },
            showIcon && styles.textWithIcon,
          ]}
        >
          {customLabel || config.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
  },
  containerSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  containerMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    fontWeight: fontWeight.medium,
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 12,
  },
  textMd: {
    fontSize: fontSize.caption,
  },
  textWithIcon: {
    marginLeft: spacing.xs,
  },
});
