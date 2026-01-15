import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Icon } from '../../components/ui';
import { useInspectionStore } from '../../store/inspectionStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type InspectionCompleteNavigationProp = NativeStackNavigationProp<
  HomeStackParamList,
  'InspectionComplete'
>;

export function InspectionCompleteScreen() {
  const navigation = useNavigation<InspectionCompleteNavigationProp>();
  const { report, template, resetInspection } = useInspectionStore();

  const handleDone = () => {
    resetInspection();
    // Navigate back to dashboard and clear the stack
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      })
    );
  };

  const handleStartNew = () => {
    resetInspection();
    // Navigate to site selection
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }, { name: 'SiteList' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <Icon name="check" size={50} color={colors.white} />
        </View>

        {/* Success Message */}
        <Text style={styles.title}>Inspection Complete</Text>
        <Text style={styles.subtitle}>
          Your inspection has been submitted successfully
        </Text>

        {/* Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Template</Text>
            <Text style={styles.detailValue}>{template?.name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Submitted</Text>
            <Text style={styles.detailValue}>
              {report?.submitted_at
                ? new Date(report.submitted_at).toLocaleString()
                : new Date().toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Report ID</Text>
            <Text style={styles.detailValueSmall}>{report?.id?.slice(0, 8) || 'N/A'}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Back to Dashboard"
            onPress={handleDone}
            fullWidth
          />
          <Button
            title="Start New Inspection"
            onPress={handleStartNew}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    marginBottom: spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  detailValueSmall: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.tertiary,
    fontFamily: 'monospace',
  },
  actions: {
    width: '100%',
    maxWidth: 400,
    gap: spacing.md,
  },
});
