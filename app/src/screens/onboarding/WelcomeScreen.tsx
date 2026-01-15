/**
 * Welcome Screen
 * First screen of the onboarding wizard - introduces the app
 */

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import { useAuthStore } from '../../store/authStore';
import type { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

export function WelcomeScreen({ navigation }: Props) {
  const { signOut } = useAuthStore();

  const handleGetStarted = () => {
    // User is already authenticated (they signed up), skip CreateAccount
    // Go straight to OrganisationDetails
    navigation.navigate('OrganisationDetails');
  };

  const handleSignInDifferentAccount = async () => {
    // Sign out to return to login screen
    await signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>Donedex</Text>
          </View>

          <Text style={styles.headline}>
            Professional Property{'\n'}Inspections Made Easy
          </Text>

          <Text style={styles.subheadline}>
            Create detailed inventory reports, capture evidence with photos,
            and manage your properties from anywhere.
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="clipboard"
            title="Smart Templates"
            description="AI-powered templates save hours of setup time"
          />
          <FeatureItem
            icon="camera"
            title="Photo Evidence"
            description="Timestamped photos with automatic organisation"
          />
          <FeatureItem
            icon="file-text"
            title="Professional Reports"
            description="Generate PDF reports ready for clients"
          />
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Button
            title="Get Started"
            onPress={handleGetStarted}
            fullWidth
          />
          <TouchableOpacity
            style={styles.signInLink}
            onPress={handleSignInDifferentAccount}
          >
            <Text style={styles.signInLinkText}>
              Sign in with a different account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: string;
  title: string;
  description: string;
}

function FeatureItem({ title, description }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>✓</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  headline: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  subheadline: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: spacing.md,
  },
  featuresSection: {
    marginVertical: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  featureIconText: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  featureDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionsSection: {
    marginBottom: spacing.md,
  },
  signInLink: {
    marginTop: spacing.md,
    alignItems: 'center',
    padding: spacing.sm,
  },
  signInLinkText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
  },
});
