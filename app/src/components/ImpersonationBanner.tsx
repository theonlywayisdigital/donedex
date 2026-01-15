import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { useAuthStore } from '../store/authStore';
import { Icon } from './ui';

/**
 * ImpersonationBanner
 *
 * Shows a persistent warning banner when a super admin is impersonating a user.
 * This component should be rendered at the top level of the app (in RootNavigator or App.tsx)
 * so it's always visible during impersonation sessions.
 */
export function ImpersonationBanner() {
  const insets = useSafeAreaInsets();
  const { impersonationContext, endImpersonation } = useAuthStore();

  // Don't render if not impersonating
  if (!impersonationContext?.isImpersonating) {
    return null;
  }

  const handleEndImpersonation = async () => {
    const { error } = await endImpersonation();
    if (error) {
      console.error('Failed to end impersonation:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name="eye" size={18} color={colors.white} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>Impersonating</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {impersonationContext.impersonatedUserName || 'User'}
            {impersonationContext.impersonatedOrgName && (
              <Text style={styles.orgName}> - {impersonationContext.impersonatedOrgName}</Text>
            )}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndImpersonation}
          activeOpacity={0.7}
        >
          <Icon name="x" size={16} color={colors.warning} />
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.warning,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  orgName: {
    fontWeight: fontWeight.regular,
    opacity: 0.9,
  },
  endButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  endButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
});
