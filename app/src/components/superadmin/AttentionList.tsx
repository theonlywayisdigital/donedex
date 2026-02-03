/**
 * AttentionList Component
 * Displays organisations that need attention (past due, trial ending, inactive)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../ui';
import type { IconName } from '../ui';
import type { AttentionItem } from '../../types/superAdmin';

interface AttentionListProps {
  items: AttentionItem[];
  loading?: boolean;
  onItemPress?: (item: AttentionItem) => void;
}

const URGENCY_CONFIG: Record<
  AttentionItem['urgency'],
  { color: string; bgColor: string }
> = {
  high: {
    color: colors.danger,
    bgColor: colors.danger + '15',
  },
  medium: {
    color: colors.warning,
    bgColor: colors.warning + '15',
  },
  low: {
    color: colors.neutral[500],
    bgColor: colors.neutral[100],
  },
};

const REASON_CONFIG: Record<
  AttentionItem['reason'],
  { icon: IconName; label: string }
> = {
  past_due: {
    icon: 'alert-circle',
    label: 'Payment Past Due',
  },
  trial_ending: {
    icon: 'clock',
    label: 'Trial Ending',
  },
  inactive: {
    icon: 'pause-circle',
    label: 'Inactive',
  },
};

export function AttentionList({ items, loading, onItemPress }: AttentionListProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Needs Attention</Text>
        <View style={styles.loadingPlaceholder}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Needs Attention</Text>
          <View style={styles.allGoodBadge}>
            <Icon name="check-circle" size={14} color={colors.success} />
            <Text style={styles.allGoodText}>All Good</Text>
          </View>
        </View>
        <Text style={styles.emptyText}>No organisations need attention right now</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Needs Attention</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>

      <View style={styles.list}>
        {items.map((item) => {
          const urgencyConfig = URGENCY_CONFIG[item.urgency];
          const reasonConfig = REASON_CONFIG[item.reason];

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              onPress={() => onItemPress?.(item)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.urgencyIndicator,
                  { backgroundColor: urgencyConfig.color },
                ]}
              />
              <View style={styles.itemContent}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.itemMeta}>
                  <View style={[styles.reasonBadge, { backgroundColor: urgencyConfig.bgColor }]}>
                    <Icon name={reasonConfig.icon} size={12} color={urgencyConfig.color} />
                    <Text style={[styles.reasonText, { color: urgencyConfig.color }]}>
                      {item.detail}
                    </Text>
                  </View>
                </View>
              </View>
              <Icon name="chevron-right" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          );
        })}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  countBadge: {
    backgroundColor: colors.danger + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  countText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  allGoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  allGoodText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  loadingPlaceholder: {
    height: 60,
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
    paddingVertical: spacing.sm,
  },
  list: {
    gap: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingRight: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  urgencyIndicator: {
    width: 4,
    height: '80%',
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: fontWeight.medium,
  },
});
