/**
 * Create First Record Screen
 * Optional step to create a sample property during onboarding
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Input } from '../../components/ui';
import { useOnboardingStore } from '../../store/onboardingStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { OnboardingStackParamList } from '../../types/onboarding';

type CreateFirstRecordScreenNavigationProp = NativeStackNavigationProp<
  OnboardingStackParamList,
  'CreateFirstRecord'
>;

interface Props {
  navigation: CreateFirstRecordScreenNavigationProp;
}

export function CreateFirstRecordScreen({ navigation }: Props) {
  const {
    firstRecordName,
    firstRecordAddress,
    setFirstRecord,
    saveToServer,
    isSaving,
  } = useOnboardingStore();

  const [propertyName, setPropertyName] = useState(firstRecordName || '');
  const [propertyAddress, setPropertyAddress] = useState(firstRecordAddress || '');
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    // Validate if user entered something
    if (propertyName.trim() || propertyAddress.trim()) {
      if (!propertyName.trim()) {
        setError('Please enter a property name');
        return;
      }
      if (!propertyAddress.trim()) {
        setError('Please enter a property address');
        return;
      }
    }

    setError(null);

    // Update store
    setFirstRecord(propertyName.trim(), propertyAddress.trim());

    // Save to server
    await saveToServer();

    // Navigate to completion
    navigation.navigate('Complete');
  };

  const handleSkip = () => {
    navigation.navigate('Complete');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const hasInput = propertyName.trim() || propertyAddress.trim();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '88%' }]} />
            </View>
            <Text style={styles.progressText}>Step 7 of 9</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add your first property</Text>
            <Text style={styles.subtitle}>
              Create a sample property to get started, or skip this and add properties later.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Property Name"
              placeholder="e.g. Oak House or 42 High Street"
              value={propertyName}
              onChangeText={setPropertyName}
              autoCapitalize="words"
            />

            <Input
              label="Property Address"
              placeholder="Full address including postcode"
              value={propertyAddress}
              onChangeText={setPropertyAddress}
              autoCapitalize="words"
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Example Card */}
          <View style={styles.exampleCard}>
            <Text style={styles.exampleTitle}>Example Properties</Text>
            <View style={styles.exampleItem}>
              <Text style={styles.exampleName}>The Old Rectory</Text>
              <Text style={styles.exampleAddress}>
                12 Church Lane, Oxford, OX1 2AB
              </Text>
            </View>
            <View style={styles.exampleItem}>
              <Text style={styles.exampleName}>Flat 3B Riverside Court</Text>
              <Text style={styles.exampleAddress}>
                45 Thames Street, London, SE1 9DG
              </Text>
            </View>
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              Properties can be renamed, edited, or deleted at any time from your dashboard.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={hasInput ? 'Create Property & Continue' : 'Skip for Now'}
              onPress={hasInput ? handleContinue : handleSkip}
              loading={isSaving}
              fullWidth
              
            />
            <Button
              title="Back"
              onPress={handleBack}
              variant="ghost"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border.light,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 2,
  },
  progressText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  form: {
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
  },
  exampleCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  exampleTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  exampleItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  exampleName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  exampleAddress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  infoNote: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoNoteText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.md,
  },
});
