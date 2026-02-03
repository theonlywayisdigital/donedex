import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, shadows, components } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
  /** Adds a left accent border in primary color */
  accent?: boolean;
}

export function Card({ children, style, noPadding = false, accent = false }: CardProps) {
  return (
    <View style={[styles.card, !noPadding && styles.padding, accent && styles.accent, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: components.card.borderRadius,
    ...shadows.card,
  },
  padding: {
    padding: spacing.md,
  },
  accent: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.DEFAULT,
  },
});
