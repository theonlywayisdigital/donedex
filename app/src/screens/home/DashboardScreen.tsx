import React, { useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Icon, EmptyState, LoadingSpinner } from '../../components/ui';
import { NotificationBell } from '../../components/notifications';
import { useAuthStore } from '../../store/authStore';
import { useRecordsStore } from '../../store/recordsStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';
import type { Record as RecordModel } from '../../types';

type DashboardNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'Dashboard'>;

export function DashboardScreen() {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { profile, organisation, isAdmin } = useAuthStore();
  const { records, isLoading, fetchRecords } = useRecordsStore();

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartInspection = () => {
    // NEW: Use the new record type select flow
    navigation.navigate('RecordTypeSelect');
  };

  const handleViewRecords = () => {
    // Keep legacy behavior for "View Records" button
    navigation.navigate('SiteList');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchRecords} />
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
            {/* Only show bell on mobile since web has it in sidebar */}
            {Platform.OS !== 'web' && (
              <NotificationBell size={24} color={colors.text.primary} />
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleStartInspection}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.primary.light }]}>
                <Icon name="plus" size={28} color={colors.primary.DEFAULT} />
              </View>
              <Text style={styles.actionLabel}>Start Inspection</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={handleViewRecords}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.neutral[100] }]}>
                <Icon name="clipboard-list" size={28} color={colors.neutral[700]} />
              </View>
              <Text style={styles.actionLabel}>View Records</Text>
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
                icon="clipboard-list"
                title="No records yet"
                description={
                  isAdmin
                    ? 'Create your first record to get started with inspections.'
                    : 'No records have been assigned to you yet.'
                }
              />
            </Card>
          ) : (
            <View style={styles.recordsList}>
              {records.slice(0, 3).map((record) => (
                <TouchableOpacity
                  key={record.id}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('TemplateSelect', { siteId: record.id })}
                >
                  <Card style={styles.recordCard}>
                    <Text style={styles.recordName}>{record.name}</Text>
                    {record.address && (
                      <Text style={styles.recordAddress} numberOfLines={1}>
                        {record.address}
                      </Text>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity - Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Card>
            <EmptyState
              icon="clipboard"
              title="No recent inspections"
              description="Complete your first inspection to see activity here."
            />
          </Card>
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
  actionsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    textAlign: 'center',
  },
  recordsList: {
    gap: spacing.sm,
  },
  recordCard: {
    padding: spacing.md,
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
  emptyCard: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
