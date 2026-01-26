import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReportsStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchAllReports, ReportWithDetails } from '../../services/reports';
import { fetchRecords } from '../../services/records';
import { fetchAllOrganisations } from '../../services/superAdmin';
import { useAuthStore } from '../../store/authStore';
import type { Record as RecordModel } from '../../types';
import type { OrganisationSummary } from '../../types/superAdmin';

type NavigationProp = NativeStackNavigationProp<ReportsStackParamList, 'ReportList'>;

export function ReportListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { isSuperAdmin } = useAuthStore();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithDetails[]>([]);
  const [records, setRecords] = useState<RecordModel[]>([]);
  const [organisations, setOrganisations] = useState<OrganisationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'submitted' | 'draft'>('all');
  const [showRecordFilter, setShowRecordFilter] = useState(false);

  // Super Admin: Client filter
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showClientFilter, setShowClientFilter] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Date range filter
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [datePreset, setDatePreset] = useState<'all' | '7d' | '30d' | '90d' | 'custom'>('all');

  const loadData = useCallback(async () => {
    const promises: Promise<any>[] = [
      fetchAllReports(),
      fetchRecords(),
    ];

    // Super admins can filter by organisation
    if (isSuperAdmin) {
      promises.push(fetchAllOrganisations());
    }

    const results = await Promise.all(promises);
    const [reportsResult, recordsResult, orgsResult] = results;

    if (!reportsResult.error) {
      setReports(reportsResult.data);
    }
    if (!recordsResult.error) {
      setRecords(recordsResult.data);
    }
    if (orgsResult && !orgsResult.error && orgsResult.data) {
      setOrganisations(orgsResult.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, [isSuperAdmin]);

  // Apply filters whenever reports or filter state changes
  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (r) =>
          r.template?.name?.toLowerCase().includes(query) ||
          r.record?.name?.toLowerCase().includes(query) ||
          r.user_profile?.full_name?.toLowerCase().includes(query)
      );
    }

    if (selectedRecordId) {
      filtered = filtered.filter((r) => r.record_id === selectedRecordId);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    // Super Admin: Filter by organisation
    if (selectedOrgId) {
      filtered = filtered.filter((r) => r.organisation_id === selectedOrgId);
    }

    // Date range filter
    if (dateRangeStart) {
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.submitted_at || r.started_at);
        return reportDate >= dateRangeStart;
      });
    }
    if (dateRangeEnd) {
      const endOfDay = new Date(dateRangeEnd);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        const reportDate = new Date(r.submitted_at || r.started_at);
        return reportDate <= endOfDay;
      });
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, selectedRecordId, selectedStatus, selectedOrgId, dateRangeStart, dateRangeEnd]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Apply filters when dependencies change
  React.useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleViewReport = (reportId: string) => {
    navigation.navigate('ReportDetail', { reportId });
  };

  const getStatusColor = (status: string) => {
    return status === 'submitted' ? colors.success : colors.warning;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderReport = ({ item }: { item: ReportWithDetails }) => (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => handleViewReport(item.id)}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.templateName}>{item.template?.name || 'Unknown Template'}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status === 'submitted' ? 'Completed' : 'Draft'}
          </Text>
        </View>
      </View>

      <Text style={styles.siteName}>{item.record?.name || 'Unknown Record'}</Text>

      <View style={styles.reportMeta}>
        <Text style={styles.metaText}>
          {item.user_profile?.full_name || 'Unknown User'}
        </Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaText}>
          {formatDate(item.submitted_at || item.started_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Handle date preset selection
  const handleDatePreset = (preset: 'all' | '7d' | '30d' | '90d' | 'custom') => {
    setDatePreset(preset);
    const now = new Date();

    switch (preset) {
      case 'all':
        setDateRangeStart(null);
        setDateRangeEnd(null);
        setShowDateFilter(false);
        break;
      case '7d':
        setDateRangeStart(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        setDateRangeEnd(null);
        setShowDateFilter(false);
        break;
      case '30d':
        setDateRangeStart(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        setDateRangeEnd(null);
        setShowDateFilter(false);
        break;
      case '90d':
        setDateRangeStart(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));
        setDateRangeEnd(null);
        setShowDateFilter(false);
        break;
      case 'custom':
        // Keep dropdown open for custom date selection
        break;
    }
  };

  // Get date range label
  const getDateRangeLabel = () => {
    if (datePreset === 'all') return 'All Time';
    if (datePreset === '7d') return 'Last 7 days';
    if (datePreset === '30d') return 'Last 30 days';
    if (datePreset === '90d') return 'Last 90 days';
    if (dateRangeStart && dateRangeEnd) {
      return `${dateRangeStart.toLocaleDateString()} - ${dateRangeEnd.toLocaleDateString()}`;
    }
    if (dateRangeStart) {
      return `From ${dateRangeStart.toLocaleDateString()}`;
    }
    return 'All Time';
  };

  // Filter organisations by search
  const filteredOrganisations = organisations.filter((org) =>
    org.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  const selectedOrgName = selectedOrgId
    ? organisations.find((o) => o.id === selectedOrgId)?.name || 'Unknown'
    : 'All Clients';

  const renderFilters = () => {
    const selectedRecord = records.find((r) => r.id === selectedRecordId);

    return (
      <View style={styles.filtersSection}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reports..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="x" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.filtersContainer}>
          {/* Super Admin: Client Filter */}
          {isSuperAdmin && (
            <TouchableOpacity
              style={[styles.filterButton, selectedOrgId && styles.filterButtonActive]}
              onPress={() => {
                setShowClientFilter(!showClientFilter);
                setShowDateFilter(false);
                if (!showClientFilter) setClientSearchQuery('');
              }}
            >
              <Icon name="building-2" size={16} color={selectedOrgId ? colors.primary.DEFAULT : colors.text.tertiary} />
              <Text style={[styles.filterValue, selectedOrgId && styles.filterValueActive]} numberOfLines={1}>
                {selectedOrgName}
              </Text>
              <Icon
                name={showClientFilter ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          )}

          {/* Record Filter */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {
              setShowRecordFilter(true);
              setShowClientFilter(false);
              setShowDateFilter(false);
            }}
          >
            <Text style={styles.filterLabel}>Record</Text>
            <Text style={styles.filterValue} numberOfLines={1}>
              {selectedRecord?.name || 'All Records'}
            </Text>
          </TouchableOpacity>

          {/* Date Filter */}
          <TouchableOpacity
            style={[styles.filterButton, datePreset !== 'all' && styles.filterButtonActive]}
            onPress={() => {
              setShowDateFilter(!showDateFilter);
              setShowClientFilter(false);
            }}
          >
            <Icon name="calendar" size={16} color={datePreset !== 'all' ? colors.primary.DEFAULT : colors.text.tertiary} />
            <Text style={[styles.filterValue, datePreset !== 'all' && styles.filterValueActive]} numberOfLines={1}>
              {getDateRangeLabel()}
            </Text>
            <Icon
              name={showDateFilter ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.text.tertiary}
            />
          </TouchableOpacity>

          {/* Status Filter */}
          <View style={styles.statusFilters}>
            {(['all', 'submitted', 'draft'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusFilterButton,
                  selectedStatus === status && styles.statusFilterButtonActive,
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text
                  style={[
                    styles.statusFilterText,
                    selectedStatus === status && styles.statusFilterTextActive,
                  ]}
                >
                  {status === 'all' ? 'All' : status === 'submitted' ? 'Completed' : 'Draft'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Client Filter Dropdown */}
        {showClientFilter && isSuperAdmin && (
          <View style={styles.filterDropdown}>
            <View style={styles.dropdownSearchContainer}>
              <Icon name="search" size={16} color={colors.text.tertiary} />
              <TextInput
                style={styles.dropdownSearchInput}
                placeholder="Search clients..."
                placeholderTextColor={colors.text.tertiary}
                value={clientSearchQuery}
                onChangeText={setClientSearchQuery}
                autoFocus
              />
              {clientSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setClientSearchQuery('')}>
                  <Icon name="x" size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.dropdownScrollView} keyboardShouldPersistTaps="handled">
              {(!clientSearchQuery || 'all clients'.includes(clientSearchQuery.toLowerCase())) && (
                <TouchableOpacity
                  style={[styles.dropdownOption, !selectedOrgId && styles.dropdownOptionActive]}
                  onPress={() => {
                    setSelectedOrgId(null);
                    setShowClientFilter(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, !selectedOrgId && styles.dropdownOptionTextActive]}>
                    All Clients
                  </Text>
                  {!selectedOrgId && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
                </TouchableOpacity>
              )}
              {filteredOrganisations.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={[styles.dropdownOption, selectedOrgId === org.id && styles.dropdownOptionActive]}
                  onPress={() => {
                    setSelectedOrgId(org.id);
                    setShowClientFilter(false);
                  }}
                >
                  <Text style={[styles.dropdownOptionText, selectedOrgId === org.id && styles.dropdownOptionTextActive]}>
                    {org.name}
                  </Text>
                  {selectedOrgId === org.id && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
                </TouchableOpacity>
              ))}
              {clientSearchQuery && filteredOrganisations.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No clients found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* Date Filter Dropdown */}
        {showDateFilter && (
          <View style={styles.filterDropdown}>
            <ScrollView style={styles.dropdownScrollView} keyboardShouldPersistTaps="handled">
              {(['all', '7d', '30d', '90d'] as const).map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[styles.dropdownOption, datePreset === preset && styles.dropdownOptionActive]}
                  onPress={() => handleDatePreset(preset)}
                >
                  <Text style={[styles.dropdownOptionText, datePreset === preset && styles.dropdownOptionTextActive]}>
                    {preset === 'all' ? 'All Time' : preset === '7d' ? 'Last 7 days' : preset === '30d' ? 'Last 30 days' : 'Last 90 days'}
                  </Text>
                  {datePreset === preset && <Icon name="check" size={16} color={colors.primary.DEFAULT} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    // Check if filters are applied
    const hasFilters = searchQuery.trim() || selectedRecordId || selectedStatus !== 'all' || selectedOrgId || datePreset !== 'all';

    if (hasFilters) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No matching reports</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setSelectedRecordId(null);
              setSelectedStatus('all');
              setSelectedOrgId(null);
              setDatePreset('all');
              setDateRangeStart(null);
              setDateRangeEnd(null);
            }}
          >
            <Text style={styles.clearFiltersText}>Clear all filters</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="file-text" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No reports yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete an inspection to see reports here
        </Text>
      </View>
    );
  };

  const renderRecordFilterModal = () => (
    <Modal visible={showRecordFilter} transparent animationType="fade">
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowRecordFilter(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Record</Text>

          <TouchableOpacity
            style={[
              styles.modalOption,
              !selectedRecordId && styles.modalOptionSelected,
            ]}
            onPress={() => {
              setSelectedRecordId(null);
              setShowRecordFilter(false);
            }}
          >
            <Text
              style={[
                styles.modalOptionText,
                !selectedRecordId && styles.modalOptionTextSelected,
              ]}
            >
              All Records
            </Text>
          </TouchableOpacity>

          {records.map((record) => (
            <TouchableOpacity
              key={record.id}
              style={[
                styles.modalOption,
                selectedRecordId === record.id && styles.modalOptionSelected,
              ]}
              onPress={() => {
                setSelectedRecordId(record.id);
                setShowRecordFilter(false);
              }}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  selectedRecordId === record.id && styles.modalOptionTextSelected,
                ]}
              >
                {record.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilters()}

      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={
          filteredReports.length > 0 ? (
            <Text style={styles.resultCount}>
              {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
            </Text>
          ) : null
        }
      />

      {renderRecordFilterModal()}
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  filtersSection: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  filtersContainer: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  filterLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  filterValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
  },
  filterValueActive: {
    color: colors.primary.DEFAULT,
  },
  filterDropdown: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    maxHeight: 300,
    ...shadows.card,
  },
  dropdownSearchContainer: {
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
  dropdownScrollView: {
    maxHeight: 230,
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
  noResultsContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  statusFilters: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  statusFilterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
  },
  statusFilterButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  statusFilterText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  statusFilterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  templateName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  siteName: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  metaDot: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  clearFiltersText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalOptionSelected: {
    backgroundColor: colors.primary.light,
  },
  modalOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  modalOptionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
});
