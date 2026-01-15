/**
 * MetricCard Component
 * Displays a single metric with value, label, and optional change indicator
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../ui';
import type { IconName } from '../ui';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: IconName;
  iconColor?: string;
  iconBgColor?: string;
  change?: number;
  changeLabel?: string;
  onPress?: () => void;
}

export function MetricCard({
  label,
  value,
  icon,
  iconColor = colors.primary.DEFAULT,
  iconBgColor = colors.primary.light,
  change,
  changeLabel,
  onPress,
}: MetricCardProps) {
  const hasChange = change !== undefined;
  const isPositiveChange = hasChange && change > 0;
  const isNegativeChange = hasChange && change < 0;

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        {hasChange && (
          <View
            style={[
              styles.changeBadge,
              isPositiveChange && styles.changeBadgePositive,
              isNegativeChange && styles.changeBadgeNegative,
            ]}
          >
            <Icon
              name={isPositiveChange ? 'trending-up' : isNegativeChange ? 'trending-down' : 'minus'}
              size={12}
              color={
                isPositiveChange
                  ? colors.success
                  : isNegativeChange
                  ? colors.danger
                  : colors.text.secondary
              }
            />
            <Text
              style={[
                styles.changeText,
                isPositiveChange && styles.changeTextPositive,
                isNegativeChange && styles.changeTextNegative,
              ]}
            >
              {isPositiveChange ? '+' : ''}{change}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.label}>{label}</Text>
      {changeLabel && <Text style={styles.changeLabel}>{changeLabel}</Text>}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral[100],
    gap: 2,
  },
  changeBadgePositive: {
    backgroundColor: colors.success + '15',
  },
  changeBadgeNegative: {
    backgroundColor: colors.danger + '15',
  },
  changeText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  changeTextPositive: {
    color: colors.success,
  },
  changeTextNegative: {
    color: colors.danger,
  },
  value: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  label: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  changeLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});
