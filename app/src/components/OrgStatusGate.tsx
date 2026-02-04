/**
 * OrgStatusGate
 * Wraps authenticated app content and blocks access if the organisation
 * is blocked or archived. Checks on mount and on app focus.
 *
 * IMPORTANT: Super admins bypass all org checks - they don't need an org.
 */

import React, { useState, useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { Icon, Button } from './ui';
import { useAuthStore } from '../store/authStore';

interface OrgStatusGateProps {
  children: ReactNode;
}

type BlockReason = 'blocked' | 'archived' | 'removed';

export function OrgStatusGate({ children }: OrgStatusGateProps) {
  const {
    isSuperAdmin,
    validateOrgStatus,
    signOut,
    checkSuperAdminStatus,
    user,
    isInitialized,
    organisation
  } = useAuthStore();

  const [blockReason, setBlockReason] = useState<BlockReason | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [superAdminChecked, setSuperAdminChecked] = useState(false);

  // Step 1: Check super admin status first
  useEffect(() => {
    if (!isInitialized || !user) {
      console.log('[OrgStatusGate] Not ready - initialized:', isInitialized, 'user:', !!user);
      return;
    }

    // If already confirmed as super admin, we're done
    if (isSuperAdmin) {
      console.log('[OrgStatusGate] Already confirmed as super admin');
      setSuperAdminChecked(true);
      setIsChecking(false);
      return;
    }

    // Check super admin status
    const checkAdmin = async () => {
      console.log('[OrgStatusGate] Checking super admin status for user:', user.id);
      try {
        await checkSuperAdminStatus();
        console.log('[OrgStatusGate] Super admin check complete');
      } catch (err) {
        console.error('[OrgStatusGate] Super admin check failed:', err);
      }
      setSuperAdminChecked(true);
    };

    checkAdmin();
  }, [isInitialized, user?.id]);

  // Step 2: After super admin check, validate org if needed
  useEffect(() => {
    if (!superAdminChecked) {
      console.log('[OrgStatusGate] Waiting for super admin check...');
      return;
    }

    // Get fresh state after super admin check
    const currentState = useAuthStore.getState();
    console.log('[OrgStatusGate] Post-check state - isSuperAdmin:', currentState.isSuperAdmin);

    // Super admin bypasses everything
    if (currentState.isSuperAdmin) {
      console.log('[OrgStatusGate] User is super admin, allowing access');
      setBlockReason(null);
      setIsChecking(false);
      return;
    }

    // Has an org? Check its status
    if (currentState.organisation?.id) {
      console.log('[OrgStatusGate] Checking org status for:', currentState.organisation.id);
      validateOrgStatus().then(result => {
        console.log('[OrgStatusGate] Org validation result:', result);
        if (!result.valid && result.reason) {
          setBlockReason(result.reason);
        } else {
          setBlockReason(null);
        }
        setIsChecking(false);
      }).catch(err => {
        console.error('[OrgStatusGate] Org validation error:', err);
        setBlockReason(null);
        setIsChecking(false);
      });
    } else {
      // No org and not super admin = removed
      console.log('[OrgStatusGate] No org and not super admin - blocking');
      setBlockReason('removed');
      setIsChecking(false);
    }
  }, [superAdminChecked]);

  // React to isSuperAdmin changes (e.g., after login completes super admin check)
  useEffect(() => {
    if (isSuperAdmin) {
      console.log('[OrgStatusGate] isSuperAdmin became true, clearing any block');
      setBlockReason(null);
      setIsChecking(false);
    }
  }, [isSuperAdmin]);

  // No user = let auth redirect handle it
  if (!user) {
    return <>{children}</>;
  }

  // Still checking - show children (prevents flash)
  if (isChecking) {
    return <>{children}</>;
  }

  // Super admins always get through
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // No block reason = access granted
  if (!blockReason) {
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
