import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../constants/theme';

interface ProBadgeProps {
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

/**
 * ProBadge - Displays a "PRO" label to indicate premium features
 * Used to show which features require a Pro subscription
 */
export function ProBadge({ size = 'sm', style }: ProBadgeProps) {
  return (
    <View
      style={[
        styles.container,
        size === 'sm' ? styles.containerSm : styles.containerMd,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === 'sm' ? styles.textSm : styles.textMd,
        ]}
      >
        PRO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerSm: {
    paddingHorizontal: spacing.xs + 2, // 6px
    paddingVertical: 2,
  },
  containerMd: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.8,
  },
  textSm: {
    fontSize: 10,
  },
  textMd: {
    fontSize: 12,
  },
});
