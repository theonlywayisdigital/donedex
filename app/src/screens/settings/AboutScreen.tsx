/**
 * About Screen
 * Displays app information, version, and legal links
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/ui';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';

// App version - would typically come from app.json or a config
const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '1';

export function AboutScreen() {
  const handleOpenLink = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Donedex</Text>
          </View>
          <Text style={styles.appName}>Donedex</Text>
          <Text style={styles.appTagline}>
            Professional Property Inspections Made Easy
          </Text>
          <Text style={styles.versionText}>
            {`Version ${APP_VERSION} (${BUILD_NUMBER})`}
          </Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.description}>
            Donedex helps property managers and inspectors create professional
            inventory reports with photos, timestamps, and detailed documentation.
            Perfect for residential and commercial property inspections.
          </Text>
        </View>

        {/* Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.linksCard}>
            <LinkItem
              icon="file-text"
              label="Terms of Service"
              onPress={() => handleOpenLink('https://donedex.com/terms')}
            />
            <LinkItem
              icon="shield"
              label="Privacy Policy"
              onPress={() => handleOpenLink('https://donedex.com/privacy')}
            />
            <LinkItem
              icon="book-open"
              label="Licenses"
              onPress={() => handleOpenLink('https://donedex.com/licenses')}
              isLast
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.linksCard}>
            <LinkItem
              icon="help-circle"
              label="Help Centre"
              onPress={() => handleOpenLink('https://donedex.com/help')}
            />
            <LinkItem
              icon="mail"
              label="Contact Support"
              onPress={() => handleOpenLink('mailto:support@donedex.com')}
            />
            <LinkItem
              icon="message-circle"
              label="Send Feedback"
              onPress={() => handleOpenLink('mailto:feedback@donedex.com')}
              isLast
            />
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow Us</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleOpenLink('https://twitter.com/donedex')}
            >
              <Icon name="twitter" size={24} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleOpenLink('https://linkedin.com/company/donedex')}
            >
              <Icon name="linkedin" size={24} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.socialButton}
              onPress={() => handleOpenLink('https://donedex.com')}
            >
              <Icon name="globe" size={24} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.footer}>
          <Text style={styles.copyrightText}>
            {`© ${new Date().getFullYear()} Donedex Ltd.`}
          </Text>
          <Text style={styles.copyrightText}>All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface LinkItemProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}

function LinkItem({ icon, label, onPress, isLast }: LinkItemProps) {
  return (
    <TouchableOpacity
      style={[styles.linkItem, !isLast && styles.linkItemBorder]}
      onPress={onPress}
    >
      <View style={styles.linkItemLeft}>
        <Icon name={icon} size={20} color={colors.text.secondary} />
        <Text style={styles.linkItemLabel}>{label}</Text>
      </View>
      <Icon name="external-link" size={16} color={colors.text.tertiary} />
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
  appInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  appName: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  appTagline: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  versionText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
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
  description: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  linksCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  linkItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  linkItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkItemLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  copyrightText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
});
