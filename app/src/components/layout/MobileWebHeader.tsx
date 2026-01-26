/**
 * MobileWebHeader - Header with hamburger menu for mobile/tablet web
 * Shows when screen width is below desktop breakpoint
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';
import { NotificationBell } from '../notifications';

interface MobileWebHeaderProps {
  title?: string;
  onMenuPress: () => void;
  showNotifications?: boolean;
}

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
} : {};

export function MobileWebHeader({
  title = 'Donedex',
  onMenuPress,
  showNotifications = true,
}: MobileWebHeaderProps) {
  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={[styles.header, webStyles.header as any]}>
      <Pressable
        style={({ pressed }) => [
          styles.menuButton,
          pressed && styles.menuButtonPressed,
        ]}
        onPress={onMenuPress}
      >
        <Icon name="menu" size={24} color={colors.text.primary} />
      </Pressable>

      <Text style={styles.title}>{title}</Text>

      <View style={styles.actions}>
        {showNotifications && (
          <NotificationBell size={20} color={colors.text.secondary} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    minHeight: 56,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButtonPressed: {
    backgroundColor: colors.neutral[100],
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 40,
  },
});

export default MobileWebHeader;
