/**
 * Settings Screen
 * Main settings hub with links to various settings sections
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon, type IconName, ProBadge, UpgradeModal } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { useBillingStore } from '../../store/billingStore';
import { showDestructiveConfirm } from '../../utils/alert';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { SettingsStackParamList } from '../../navigation/MainNavigator';

type SettingsScreenNavigationProp = NativeStackNavigationProp<SettingsStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export function SettingsScreen({ navigation }: Props) {
  const { user, signOut, role, isSuperAdmin, profile } = useAuthStore();
  const canUseCustomBranding = useBillingStore((state) => state.canUseCustomBranding);
  const isAdmin = role === 'admin' || role === 'owner' || isSuperAdmin;

  // Get display role label
  const getRoleLabel = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (role === 'owner') return 'Owner';
    if (role === 'admin') return 'Admin';
    return 'User';
  };

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const brandingAllowed = canUseCustomBranding();

  const handleBrandingPress = () => {
    if (brandingAllowed) {
      navigation.navigate('BrandingSettings');
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleSignOut = () => {
    showDestructiveConfirm(
      'Sign Out',
      'Are you sure you want to sign out?',
      () => signOut(),
      undefined,
      'Sign Out'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {getRoleLabel()}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="user"
              label="Profile"
              onPress={() => navigation.navigate('Profile')}
            />
            <SettingsItem
              icon="lock"
              label="Change Password"
              onPress={() => navigation.navigate('ChangePassword')}
            />
          </View>
        </View>

        {/* Organisation Section (Admin only) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organisation</Text>
            <View style={styles.sectionContent}>
              <SettingsItem
                icon="credit-card"
                label="Billing & Subscription"
                onPress={() => navigation.navigate('Billing')}
              />
              <SettingsItem
                icon="building"
                label="Organisation Details"
                onPress={() => navigation.navigate('OrganisationSettings')}
              />
              <SettingsItem
                icon="star"
                label="Branding"
                onPress={handleBrandingPress}
                proBadge={!brandingAllowed}
                proGated={!brandingAllowed}
              />
            </View>
          </View>
        )}

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.sectionContent}>
            <SettingsItem
              icon="bell"
              label="Notifications"
              onPress={() => {}}
              disabled
            />
            <SettingsItem
              icon="info"
              label="About"
              onPress={() => navigation.navigate('About')}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Icon name="log-out" size={20} color={colors.danger} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Custom Branding"
        description="Customize your organization's branding with your logo, colors, and display name on PDF reports and emails. This feature is available on the Pro plan."
      />
    </SafeAreaView>
  );
}

interface SettingsItemProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  proBadge?: boolean;
  proGated?: boolean;
}

function SettingsItem({ icon, label, onPress, disabled, proBadge, proGated }: SettingsItemProps) {
  const isDisabledStyle = disabled || proGated;
  return (
    <TouchableOpacity
      style={[styles.settingsItem, isDisabledStyle && styles.settingsItemDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        <Icon
          name={icon}
          size={20}
          color={isDisabledStyle ? colors.text.tertiary : colors.text.secondary}
        />
        <Text
          style={[
            styles.settingsItemLabel,
            isDisabledStyle && styles.settingsItemLabelDisabled,
          ]}
        >
          {label}
        </Text>
        {proBadge && <ProBadge size="sm" style={styles.proBadge} />}
      </View>
      <Icon
        name="chevron-right"
        size={20}
        color={isDisabledStyle ? colors.text.tertiary : colors.text.secondary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  settingsItemDisabled: {
    opacity: 0.5,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsItemLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  settingsItemLabelDisabled: {
    color: colors.text.tertiary,
  },
  proBadge: {
    marginLeft: spacing.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  signOutText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.danger,
    marginLeft: spacing.sm,
  },
  versionText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
