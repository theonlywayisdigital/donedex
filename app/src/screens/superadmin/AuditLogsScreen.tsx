import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchAuditLogs, fetchAllOrganisations, fetchAllSuperAdmins } from '../../services/superAdmin';
import type { AuditLogEntry, AuditLogCategory, AuditLogFilters, OrganisationSummary, SuperAdminWithPermissions } from '../../types/superAdmin';

const CATEGORY_ICONS: Record<AuditLogCategory, 'building-2' | 'user' | 'users' | 'file-text' | 'layout-template' | 'folder' | 'settings' | 'eye' | 'circle' | 'bell'> = {
  organisation: 'building-2',
  user: 'user',
  user_management: 'users',
  report: 'file-text',
  template: 'layout-template',
  record: 'folder',
  system: 'settings',
  impersonation: 'eye',
  notification: 'bell',
};

const CATEGORY_COLORS: Record<AuditLogCategory, string> = {
  organisation: colors.primary.DEFAULT,
  user: colors.success,
  user_management: colors.primary.mid,
  report: colors.warning,
  template: colors.primary.mid,
  record: colors.neutral[500],
  system: colors.neutral[700],
  impersonation: colors.danger,
  notification: colors.primary.DEFAULT,
};

const CATEGORY_LABELS: Record<AuditLogCategory, string> = {
  organisation: 'Organisation',
  user: 'User',
  user_management: 'User Mgmt',
  report: 'Report',
  template: 'Template',
  record: 'Record',
  system: 'System',
  impersonation: 'Impersonation',
  notification: 'Notification',
};

const ALL_CATEGORIES: AuditLogCategory[] = [
  'organisation', 'user', 'user_management', 'report',
  'template', 'record', 'system', 'impersonation', 'notification',
];

export function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<AuditLogCategory | null>(null);
  const [datePreset, setDatePreset] = useState<'all' | '7d' | '30d' | '90d'>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedAdminId, setSelectedAdminId] = useState<string | null>(null);

  // Dropdown state
  const [showOrgFilter, setShowOrgFilter] = useState(false);
  const [showAdminFilter, setShowAdminFilter] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState('');

  // Reference data
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminWithPermissions[]>([]);

  const LIMIT = 20;

  // Build filters object
  const buildFilters = useCallback((): AuditLogFilters => {
    const filters: AuditLogFilters = {};

    if (selectedCategory) {
      filters.action_category = selectedCategory;
    }
    if (selectedOrgId) {
      filters.target_organisation_id = selectedOrgId;
    }
    if (selectedAdminId) {
      filters.super_admin_id = selectedAdminId;
    }
    if (datePreset !== 'all') {
      const now = new Date();
      const days = datePreset === '7d' ? 7 : datePreset === '30d' ? 30 : 90;
      filters.start_date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    return filters;
  }, [selectedCategory, selectedOrgId, selectedAdminId, datePreset]);

  const loadData = useCallback(async (reset = true) => {
    try {
      const offset = reset ? 0 : logs.length;
      const filters = buildFilters();
      const result = await fetchAuditLogs(filters, LIMIT, offset);

      if (result.data) {
        if (reset) {
          setLogs(result.data.logs);
        } else {
          setLogs((prev) => [...prev, ...result.data!.logs]);
        }
        setTotal(result.data.total);
        setHasMore(offset + result.data.logs.length < result.data.total);
      }
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [logs.length, buildFilters]);

  const loadReferenceData = useCallback(async () => {
    const [orgsResult, adminsResult] = await Promise.all([
      fetchAllOrganisations(),
      fetchAllSuperAdmins(),
    ]);
    if (orgsResult.data) setOrganisations(orgsResult.data);
    if (adminsResult.data) setSuperAdmins(adminsResult.data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(true);
      loadReferenceData();
    }, [])
  );

  // Reload when filters change
  React.useEffect(() => {
    setLoading(true);
    loadData(true);
  }, [selectedCategory, selectedOrgId, selectedAdminId, datePreset]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadData(false);
    }
  };

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setDatePreset('all');
    setSelectedOrgId(null);
    setSelectedAdminId(null);
    setShowOrgFilter(false);
    setShowAdminFilter(false);
  };

  const hasActiveFilters = selectedCategory || datePreset !== 'all' || selectedOrgId || selectedAdminId;

  const selectedOrgName = selectedOrgId
    ? organisations.find((o) => o.id === selectedOrgId)?.name || 'Unknown'
    : 'All Orgs';

  const selectedAdminName = selectedAdminId
    ? superAdmins.find((a) => a.id === selectedAdminId)?.name || 'Unknown'
    : 'All Admins';

  const filteredOrganisations = organisations.filter((org) =>
    org.name.toLowerCase().includes(orgSearchQuery.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatActionType = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderFilters = () => (
    <View style={styles.filtersSection}>
      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {ALL_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <Icon
              name={CATEGORY_ICONS[cat]}
              size={14}
              color={selectedCategory === cat ? colors.white : CATEGORY_COLORS[cat]}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === cat && styles.categoryChipTextActive,
              ]}
            >
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Filter row: Date, Org, Admin */}
      <View style={styles.filterRow}>
        {/* Date presets */}
        <View style={styles.datePresets}>
          {(['all', '7d', '30d', '90d'] as const).map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.dateChip, datePreset === preset && styles.dateChipActive]}
              onPress={() => setDatePreset(preset)}
            >
              <Text style={[styles.dateChipText, datePreset === preset && styles.dateChipTextActive]}>
                {preset === 'all' ? 'All Time' : preset === '7d' ? '7d' : preset === '30d' ? '30d' : '90d'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Org filter button */}
        <TouchableOpacity
          style={[styles.filterButton, selectedOrgId && styles.filterButtonActive]}
          onPress={() => {
            setShowOrgFilter(!showOrgFilter);
            setShowAdminFilter(false);
            if (!showOrgFilter) setOrgSearchQuery('');
          }}
        >
          <Icon name="building-2" size={14} color={selectedOrgId ? colors.primary.DEFAULT : colors.text.tertiary} />
          <Text style={[styles.filterButtonText, selectedOrgId && styles.filterButtonTextActive]} numberOfLines={1}>
            {selectedOrgName}
          </Text>
          <Icon name={showOrgFilter ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Admin filter button */}
        <TouchableOpacity
          style={[styles.filterButton, selectedAdminId && styles.filterButtonActive]}
          onPress={() => {
            setShowAdminFilter(!showAdminFilter);
            setShowOrgFilter(false);
          }}
        >
          <Icon name="user" size={14} color={selectedAdminId ? colors.primary.DEFAULT : colors.text.tertiary} />
          <Text style={[styles.filterButtonText, selectedAdminId && styles.filterButtonTextActive]} numberOfLines={1}>
            {selectedAdminName}
          </Text>
          <Icon name={showAdminFilter ? 'chevron-up' : 'chevron-down'} size={12} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {/* Clear filters */}
      {hasActiveFilters && (
        <TouchableOpacity style={styles.clearFilters} onPress={clearAllFilters}>
          <Icon name="x" size={14} color={colors.primary.DEFAULT} />
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </TouchableOpacity>
      )}

      {/* Org dropdown */}
      {showOrgFilter && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownSearch}>
            <Icon name="search" size={16} color={colors.text.tertiary} />
            <TextInput
              style={styles.dropdownSearchInput}
              placeholder="Search organisations..."
              placeholderTextColor={colors.text.tertiary}
              value={orgSearchQuery}
              onChangeText={setOrgSearchQuery}
              autoFocus
            />
            {orgSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setOrgSearchQuery('')}>
                <Icon name="x" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={[styles.dropdownOption, !selectedOrgId && styles.dropdownOptionActive]}
              onPress={() => { setSelectedOrgId(null); setShowOrgFilter(false); }}
            >
              <Text style={[styles.dropdownOptionText, !selectedOrgId && styles.dropdownOptionTextActive]}>
                All Organisations
              </Text>
              {!selectedOrgId && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
            </TouchableOpacity>
            {filteredOrganisations.map((org) => (
              <TouchableOpacity
                key={org.id}
                style={[styles.dropdownOption, selectedOrgId === org.id && styles.dropdownOptionActive]}
                onPress={() => { setSelectedOrgId(org.id); setShowOrgFilter(false); }}
              >
                <Text style={[styles.dropdownOptionText, selectedOrgId === org.id && styles.dropdownOptionTextActive]}>
                  {org.name}
                </Text>
                {selectedOrgId === org.id && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
              </TouchableOpacity>
            ))}
            {orgSearchQuery && filteredOrganisations.length === 0 && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No organisations found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Admin dropdown */}
      {showAdminFilter && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
            <TouchableOpacity
              style={[styles.dropdownOption, !selectedAdminId && styles.dropdownOptionActive]}
              onPress={() => { setSelectedAdminId(null); setShowAdminFilter(false); }}
            >
              <Text style={[styles.dropdownOptionText, !selectedAdminId && styles.dropdownOptionTextActive]}>
                All Super Admins
              </Text>
              {!selectedAdminId && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
            </TouchableOpacity>
            {superAdmins.map((admin) => (
              <TouchableOpacity
                key={admin.id}
                style={[styles.dropdownOption, selectedAdminId === admin.id && styles.dropdownOptionActive]}
                onPress={() => { setSelectedAdminId(admin.id); setShowAdminFilter(false); }}
              >
                <Text style={[styles.dropdownOptionText, selectedAdminId === admin.id && styles.dropdownOptionTextActive]}>
                  {admin.name}
                </Text>
                {selectedAdminId === admin.id && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderLog = ({ item }: { item: AuditLogEntry }) => {
    const category = item.action_category as AuditLogCategory;
    const iconName = CATEGORY_ICONS[category] ?? 'circle';
    const iconColor = CATEGORY_COLORS[category] || colors.neutral[500];

    return (
      <View style={styles.logCard}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Icon name={iconName} size={20} color={iconColor} />
        </View>

        <View style={styles.logContent}>
          <Text style={styles.actionType}>{formatActionType(item.action_type)}</Text>

          <View style={styles.metaRow}>
            <View style={[styles.categoryBadge, { backgroundColor: iconColor + '15' }]}>
              <Text style={[styles.categoryBadgeText, { color: iconColor }]}>
                {category}
              </Text>
            </View>
            {item.target_table && (
              <Text style={styles.targetText}>
                {item.target_table}
              </Text>
            )}
          </View>

          <Text style={styles.timestamp}>{formatTime(item.created_at)}</Text>

          {item.impersonating_user_id && (
            <View style={styles.impersonationNote}>
              <Icon name="eye" size={12} color={colors.warning} />
              <Text style={styles.impersonationText}>Action taken while impersonating</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading && logs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading audit logs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}

      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        renderItem={renderLog}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="file-text" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>
              {hasActiveFilters ? 'No matching logs' : 'No audit logs'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Super admin actions will appear here'}
            </Text>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                <Text style={styles.clearFiltersBtnText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {total} log{total !== 1 ? 's' : ''} total
          </Text>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <Text style={styles.loadingMoreText}>Loading more...</Text>
            </View>
          ) : hasMore && logs.length > 0 ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore}>
              <Text style={styles.loadMoreBtnText}>Load more</Text>
            </TouchableOpacity>
          ) : null
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
  // Filters
  filtersSection: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  categoryRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  categoryChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  datePresets: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dateChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
  },
  dateChipActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  dateChipText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  dateChipTextActive: {
    color: colors.white,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    maxWidth: 150,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  filterButtonText: {
    fontSize: fontSize.caption,
    color: colors.text.primary,
    flex: 1,
  },
  filterButtonTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  clearFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  clearFiltersText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  // Dropdowns
  dropdown: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    maxHeight: 280,
    ...shadows.card,
  },
  dropdownSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    gap: spacing.sm,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
  },
  dropdownList: {
    maxHeight: 220,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dropdownOptionActive: {
    backgroundColor: colors.primary.light,
  },
  dropdownOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  dropdownOptionTextActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  noResults: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  // List
  listContent: {
    padding: spacing.md,
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  logContent: {
    flex: 1,
  },
  actionType: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  targetText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  timestamp: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  impersonationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  impersonationText: {
    fontSize: fontSize.caption,
    color: colors.warning,
  },
  // Empty & Loading
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  clearFiltersBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  clearFiltersBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  loadMoreBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadMoreBtnText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
});
