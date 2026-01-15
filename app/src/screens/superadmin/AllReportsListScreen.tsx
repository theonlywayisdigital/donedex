/**
 * All Reports List Screen (Super Admin)
 * Cross-organisation reports list with filters
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchAllReports, fetchAllOrganisations } from '../../services/superAdmin';
import type { ReportSummary, OrganisationSummary } from '../../types/superAdmin';

import type { IconName } from '../../components/ui';

type StatusConfig = {
  label: string;
  color: string;
  bgColor: string;
  icon: IconName;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
  completed: {
    label: 'Completed',
    color: colors.success,
    bgColor: colors.success + '15',
    icon: 'check-circle',
  },
  in_progress: {
    label: 'In Progress',
    color: colors.warning,
    bgColor: colors.warning + '15',
    icon: 'clock',
  },
  archived: {
    label: 'Archived',
    color: colors.neutral[500],
    bgColor: colors.neutral[100],
    icon: 'folder',
  },
};

export function AllReportsListScreen() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showOrgFilter, setShowOrgFilter] = useState(false);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async (orgFilter?: string) => {
    try {
      const [reportsResult, orgsResult] = await Promise.all([
        fetchAllReports(orgFilter || undefined, 100, 0),
        fetchAllOrganisations(),
      ]);

      if (reportsResult.data) {
        setReports(reportsResult.data.reports);
        setTotal(reportsResult.data.total);
      }
      if (orgsResult.data) {
        setOrganisations(orgsResult.data);
      }
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(selectedOrgId || undefined);
    }, [loadData, selectedOrgId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(selectedOrgId || undefined);
  };

  const handleOrgFilter = (orgId: string | null) => {
    setSelectedOrgId(orgId);
    setShowOrgFilter(false);
    setLoading(true);
    loadData(orgId || undefined);
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.organisation_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (report.inspector_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedOrgName = selectedOrgId
    ? organisations.find((o) => o.id === selectedOrgId)?.name || 'Unknown'
    : 'All Organisations';

  const renderReport = ({ item }: { item: ReportSummary }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.in_progress;

    return (
      <TouchableOpacity style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={styles.reportIcon}>
            <Icon name="file-text" size={24} color={colors.primary.DEFAULT} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTemplate}>{item.template_name}</Text>
            <Text style={styles.reportSite}>{item.site_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.reportMeta}>
          <View style={styles.metaItem}>
            <Icon name="building-2" size={14} color={colors.text.tertiary} />
            <Text style={styles.metaText}>{item.organisation_name}</Text>
          </View>
          {item.inspector_name && (
            <View style={styles.metaItem}>
              <Icon name="user" size={14} color={colors.text.tertiary} />
              <Text style={styles.metaText}>{item.inspector_name}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Icon name="calendar" size={14} color={colors.text.tertiary} />
            <Text style={styles.metaText}>
              {formatDate(item.created_at)} at {formatTime(item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={colors.text.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search reports..."
          placeholderTextColor={colors.text.tertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="x" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Organisation Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowOrgFilter(!showOrgFilter)}
        >
          <Icon name="building-2" size={16} color={colors.primary.DEFAULT} />
          <Text style={styles.filterButtonText}>{selectedOrgName}</Text>
          <Icon
            name={showOrgFilter ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.text.secondary}
          />
        </TouchableOpacity>
      </View>

      {/* Organisation Filter Dropdown */}
      {showOrgFilter && (
        <View style={styles.filterDropdown}>
          <TouchableOpacity
            style={[styles.filterOption, !selectedOrgId && styles.filterOptionActive]}
            onPress={() => handleOrgFilter(null)}
          >
            <Text
              style={[styles.filterOptionText, !selectedOrgId && styles.filterOptionTextActive]}
            >
              All Organisations
            </Text>
            {!selectedOrgId && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
          </TouchableOpacity>
          {organisations.map((org) => (
            <TouchableOpacity
              key={org.id}
              style={[styles.filterOption, selectedOrgId === org.id && styles.filterOptionActive]}
              onPress={() => handleOrgFilter(org.id)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  selectedOrgId === org.id && styles.filterOptionTextActive,
                ]}
              >
                {org.name}
              </Text>
              {selectedOrgId === org.id && (
                <Icon name="check" size={16} color={colors.primary.DEFAULT} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search term'
                : selectedOrgId
                ? 'This organisation has no reports'
                : 'No reports to display'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {filteredReports.length} of {total} report{total !== 1 ? 's' : ''}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  filterButtonText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  filterDropdown: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    maxHeight: 300,
    ...shadows.card,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterOptionActive: {
    backgroundColor: colors.primary.light,
  },
  filterOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  filterOptionTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  reportInfo: {
    flex: 1,
  },
  reportTemplate: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  reportSite: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  reportMeta: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
