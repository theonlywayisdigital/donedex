/**
 * SubscriptionBreakdown Component
 * Displays a simple horizontal bar chart of subscription plans
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import type { SubscriptionBreakdown as SubscriptionBreakdownType } from '../../types/superAdmin';

interface SubscriptionBreakdownProps {
  data: SubscriptionBreakdownType[];
  loading?: boolean;
}

export function SubscriptionBreakdown({ data, loading }: SubscriptionBreakdownProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Subscription Plans</Text>
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Subscription Plans</Text>
        <Text style={styles.emptyText}>No subscription data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscription Plans</Text>

      {/* Stacked Bar */}
      <View style={styles.barContainer}>
        {data.map((item, index) => {
          const percentage = (item.count / total) * 100;
          if (percentage === 0) return null;
          return (
            <View
              key={item.plan_id}
              style={[
                styles.barSegment,
                {
                  backgroundColor: item.color,
                  width: `${percentage}%`,
                  borderTopLeftRadius: index === 0 ? borderRadius.sm : 0,
                  borderBottomLeftRadius: index === 0 ? borderRadius.sm : 0,
                  borderTopRightRadius: index === data.length - 1 ? borderRadius.sm : 0,
                  borderBottomRightRadius: index === data.length - 1 ? borderRadius.sm : 0,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.map((item) => (
          <View key={item.plan_id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.plan_name}</Text>
            <Text style={styles.legendValue}>{item.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  title: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  loadingPlaceholder: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  barContainer: {
    flexDirection: 'row',
    height: 24,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.neutral[100],
    marginBottom: spacing.md,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  legendValue: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
});
