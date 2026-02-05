/**
 * OrgStatusGate
 * Wraps authenticated app content and blocks access if the organisation
 * is blocked or archived.
 *
 * IMPORTANT: Super admins bypass all org checks - they don't need an org.
 * The super admin status is now set in authStore BEFORE isInitialized,
 * so we can trust isSuperAdmin immediately.
 */

import React, { useState, useEffect, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../constants/theme';
import { Icon, Button } from './ui';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../services/supabase';

interface OrgStatusGateProps {
  children: ReactNode;
}

type BlockReason = 'blocked' | 'archived' | 'removed';

export function OrgStatusGate({ children }: OrgStatusGateProps) {
  const { isSuperAdmin, signOut, user, isInitialized, organisation, pendingOTPEmail } = useAuthStore();

  const [blockReason, setBlockReason] = useState<BlockReason | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // If we're in the middle of 2FA login, don't do anything
    if (pendingOTPEmail) return;

    // Wait for auth to initialize
    if (!isInitialized || !user) return;

    // Super admins ALWAYS pass - no org check needed
    if (isSuperAdmin) {
      setBlockReason(null);
      setIsChecking(false);
      return;
    }

    // For users with no org, we need to verify they're truly not a super admin
    // before blocking. This handles the race condition where isSuperAdmin
    // hasn't been set yet in the Zustand store.
    if (!organisation?.id) {
      const verifyNotSuperAdmin = async () => {
        try {
          const { data, error } = await supabase
            .from('super_admins' as any)
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          if (data) {
            // User IS a super admin - allow through
            setBlockReason(null);
          } else {
            setBlockReason('removed');
          }
        } catch (err) {
          console.error('[OrgStatusGate] super_admin check exception:', err);
          // On error, allow through
          setBlockReason(null);
        }
        setIsChecking(false);
      };
      verifyNotSuperAdmin();
      return;
    }

    // Check org status (blocked/archived)
    const checkOrgStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('organisations')
          .select('blocked,archived')
          .eq('id', organisation.id)
          .single();

        if (error) {
          // On error, allow through (don't block user due to network issues)
          setBlockReason(null);
        } else if ((data as { blocked: boolean; archived: boolean })?.blocked) {
          setBlockReason('blocked');
        } else if ((data as { blocked: boolean; archived: boolean })?.archived) {
          setBlockReason('archived');
        } else {
          setBlockReason(null);
        }
      } catch (err) {
        console.error('[OrgStatusGate] Exception:', err);
        setBlockReason(null);
      }
      setIsChecking(false);
    };

    checkOrgStatus();
  }, [isInitialized, user, isSuperAdmin, organisation?.id, pendingOTPEmail]);

  // No user = let auth redirect handle it
  if (!user) {
    return <>{children}</>;
  }

  // Super admins always pass - check BEFORE isChecking to prevent
  // flash of "Access Removed" during the race condition where
  // isSuperAdmin resolves after the effect already set blockReason
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // While checking, show children (prevents flash)
  if (isChecking) {
    return <>{children}</>;
  }

  // No block = pass through
  if (!blockReason) {
    return <>{children}</>;
  }

  // Block screens
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
