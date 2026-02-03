/**
 * OrgStatusGate
 * Wraps authenticated app content and blocks access if the organisation
 * is blocked or archived. Checks on mount and on app focus.
 */

import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { View, Text, StyleSheet, Platform, AppState } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { Icon, Button } from './ui';
import { useAuthStore } from '../store/authStore';

interface OrgStatusGateProps {
  children: ReactNode;
}

type BlockReason = 'blocked' | 'archived' | 'removed';

export function OrgStatusGate({ children }: OrgStatusGateProps) {
  const { isSuperAdmin, validateOrgStatus, signOut } = useAuthStore();
  const [blockReason, setBlockReason] = useState<BlockReason | null>(null);
  const [checking, setChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    // Super admins bypass this gate
    if (isSuperAdmin) {
      setChecking(false);
      return;
    }

    const result = await validateOrgStatus();
    if (!result.valid && result.reason) {
      setBlockReason(result.reason);
    } else {
      setBlockReason(null);
    }
    setChecking(false);
  }, [isSuperAdmin, validateOrgStatus]);

  // Check on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Check on app focus (native)
  useEffect(() => {
    if (isSuperAdmin) return;

    if (Platform.OS === 'web') {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          checkStatus();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkStatus();
      }
    });
    return () => subscription.remove();
  }, [isSuperAdmin, checkStatus]);

  // Still checking on first mount
  if (checking) {
    return <>{children}</>;
  }

  // Organisation is blocked
  if (blockReason === 'blocked') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: colors.danger + '15' }]}>
            <Icon name="shield" size={48} color={colors.danger} />
          </View>
          <Text style={styles.title}>Organisation Blocked</Text>
          <Text style={styles.message}>
            Your organisation has been blocked by an administrator. Please contact support for more information.
          </Text>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="danger"
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  // Organisation is archived
  if (blockReason === 'archived') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: colors.warning + '15' }]}>
            <Icon name="inbox" size={48} color={colors.warning} />
          </View>
          <Text style={styles.title}>Organisation Archived</Text>
          <Text style={styles.message}>
            Your organisation has been archived. Please contact your administrator if you believe this is an error.
          </Text>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="secondary"
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  // Organisation removed (user no longer has membership)
  if (blockReason === 'removed') {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: colors.danger + '15' }]}>
            <Icon name="user" size={48} color={colors.danger} />
          </View>
          <Text style={styles.title}>Access Removed</Text>
          <Text style={styles.message}>
            Your access to this organisation has been removed. Please contact your administrator.
          </Text>
          <Button
            title="Sign Out"
            onPress={signOut}
            variant="danger"
            style={styles.button}
          />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  button: {
    width: '100%',
  },
});
