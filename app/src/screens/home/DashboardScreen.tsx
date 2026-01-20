import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Icon, EmptyState } from '../../components/ui';
import { NotificationBell } from '../../components/notifications';
import { useAuthStore } from '../../store/authStore';
import { useRecordsStore } from '../../store/recordsStore';
import { useQuickStartStore } from '../../store/quickStartStore';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type DashboardNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Dashboard'>;

export function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { profile, organisation, user } = useAuthStore();
  const { records, isLoading: recordsLoading, fetchRecords } = useRecordsStore();
  const {
    drafts,
    recentCombinations,
    isLoading: quickStartLoading,
    fetchQuickStartData,
    clearCache,
  } = useQuickStartStore();

  const isLoading = recordsLoading || quickStartLoading;

  // Initial data load
  useEffect(() => {
    fetchRecords();
    if (user?.id) {
      fetchQuickStartData(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Always refresh records to ensure we have latest data
      fetchRecords();
      if (user?.id) {
        clearCache();
        fetchQuickStartData(user.id);
      }
    }, [user?.id, clearCache, fetchQuickStartData, fetchRecords])
  );

  const handleRefresh = () => {
    fetchRecords();
    if (user?.id) {
      clearCache();
      fetchQuickStartData(user.id);
    }
  };

  const handleStartTemplateFirst = () => {
    navigation.navigate('TemplatePicker');
  };

  const handleStartRecordFirst = () => {
    navigation.navigate('RecordTypeSelect');
  };

  const handleContinueDraft = (reportId: string) => {
    navigation.navigate('Inspection', { reportId });
  };

  const handleStartRecent = (templateId: string, templateName: string, recordId: string, recordTypeId?: string) => {
    // Navigate directly to inspection start with these params
    // For now, navigate to RecordForTemplate with pre-selection
    navigation.navigate('RecordForTemplate', {
      templateId,
      templateName,
      recordTypeId,
    });
  };

  const handleViewRecords = () => {
    // Navigate to Records tab (cross-tab navigation)
    (navigation as any).navigate('SitesTab');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const hasQuickStartItems = drafts.length > 0 || recentCombinations.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
              {organisation && (
                <Text style={styles.orgName}>{organisation.name}</Text>
              )}
            </View>
            {Platform.OS !== 'web' && (
              <NotificationBell size={24} color={colors.text.primary} />
            )}
          </View>
        </View>

        {/* Quick Start Section */}
        {hasQuickStartItems && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Start</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickStartScroll}
            >
              {/* Draft Reports */}
              {drafts.map((draft) => (
                <TouchableOpacity
                  key={draft.id}
                  style={styles.quickStartCard}
                  onPress={() => handleContinueDraft(draft.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.quickStartBadge}>
                    <Icon name="edit" size={14} color={colors.warning} />
                    <Text style={styles.quickStartBadgeText}>Draft</Text>
                  </View>
                  <Text style={styles.quickStartRecord} numberOfLines={1}>
                    {draft.record_name}
                  </Text>
                  <Text style={styles.quickStartTemplate} numberOfLines={1}>
                    {draft.template_name}
                  </Text>
                  <View style={styles.quickStartAction}>
                    <Text style={styles.quickStartActionText}>Continue</Text>
                    <Icon name="arrow-right" size={14} color={colors.primary.DEFAULT} />
                  </View>
                </TouchableOpacity>
              ))}

              {/* Recent Combinations */}
              {recentCombinations.map((combo, index) => (
                <TouchableOpacity
                  key={`${combo.template_id}-${combo.record_id}-${index}`}
                  style={styles.quickStartCard}
                  onPress={() =>
                    handleStartRecent(
                      combo.template_id,
                      combo.template_name,
                      combo.record_id,
                      combo.record_type_id
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickStartBadge, styles.quickStartBadgeRecent]}>
                    <Icon name="clock" size={14} color={colors.primary.DEFAULT} />
                    <Text style={[styles.quickStartBadgeText, styles.quickStartBadgeTextRecent]}>
                      Recent
                    </Text>
                  </View>
                  <Text style={styles.quickStartRecord} numberOfLines={1}>
                    {combo.record_name}
                  </Text>
                  <Text style={styles.quickStartTemplate} numberOfLines={1}>
                    {combo.template_name}
                  </Text>
                  <View style={styles.quickStartAction}>
                    <Text style={styles.quickStartActionText}>Start</Text>
                    <Icon name="arrow-right" size={14} color={colors.primary.DEFAULT} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Start New Inspection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start New Inspection</Text>
          <View style={styles.startOptionsGrid}>
            {/* Template-First Option */}
            <TouchableOpacity
              style={styles.startOptionCard}
              onPress={handleStartTemplateFirst}
              activeOpacity={0.7}
            >
              <View style={[styles.startOptionIcon, { backgroundColor: colors.primary.light }]}>
                <Icon name="file-text" size={28} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.startOptionTitle}>Choose a Template</Text>
              <Text style={styles.startOptionDescription}>
                Browse templates by type, then select a record
              </Text>
            </TouchableOpacity>

            {/* Record-First Option */}
            <TouchableOpacity
              style={styles.startOptionCard}
              onPress={handleStartRecordFirst}
              activeOpacity={0.7}
            >
              <View style={[styles.startOptionIcon, { backgroundColor: colors.neutral[100] }]}>
                <Icon name="folder" size={28} color={colors.neutral[700]} />
              </View>
              <Text style={styles.startOptionTitle}>Choose a Record</Text>
              <Text style={styles.startOptionDescription}>
                Find a record first, then select a template
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Records */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Records</Text>
            <TouchableOpacity onPress={handleViewRecords}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {records.length === 0 ? (
            <Card>
              <EmptyState
                icon="folder"
                title="No records yet"
                description="Records will appear here once they are created or assigned to you."
              />
            </Card>
          ) : (
            <View style={styles.recordsList}>
              {records.slice(0, 3).map((record) => (
                <TouchableOpacity
                  key={record.id}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RecordDetail', { recordId: record.id })}
                >
                  <Card style={styles.recordCard}>
                    <View style={styles.recordContent}>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordName}>{record.name}</Text>
                        {record.address && (
                          <Text style={styles.recordAddress} numberOfLines={1}>
                            {record.address}
                          </Text>
                        )}
                      </View>
                      <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  orgName: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  viewAllText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.md,
  },
  // Quick Start styles
  quickStartScroll: {
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  quickStartCard: {
    width: 160,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.card,
  },
  quickStartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  quickStartBadgeRecent: {},
  quickStartBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  quickStartBadgeTextRecent: {
    color: colors.primary.DEFAULT,
  },
  quickStartRecord: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  quickStartTemplate: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  quickStartAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickStartActionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  // Start Options Grid
  startOptionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  startOptionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.card,
  },
  startOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  startOptionTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  startOptionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  // Records list
  recordsList: {
    gap: spacing.sm,
  },
  recordCard: {
    padding: spacing.md,
  },
  recordContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  recordAddress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
