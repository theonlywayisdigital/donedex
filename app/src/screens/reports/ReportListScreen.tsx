import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ReportsStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { fetchAllReports, ReportWithDetails } from '../../services/reports';
import { fetchRecords } from '../../services/records';
import type { Record as RecordModel } from '../../types';

type NavigationProp = NativeStackNavigationProp<ReportsStackParamList, 'ReportList'>;

export function ReportListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportWithDetails[]>([]);
  const [records, setRecords] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'submitted' | 'draft'>('all');
  const [showRecordFilter, setShowRecordFilter] = useState(false);

  const loadData = useCallback(async () => {
    const [reportsResult, recordsResult] = await Promise.all([
      fetchAllReports(),
      fetchRecords(),
    ]);

    if (!reportsResult.error) {
      setReports(reportsResult.data);
    }
    if (!recordsResult.error) {
      setRecords(recordsResult.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  // Apply filters whenever reports or filter state changes
  const applyFilters = useCallback(() => {
    let filtered = [...reports];

    if (selectedRecordId) {
      filtered = filtered.filter((r) => r.record_id === selectedRecordId);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus);
    }

    setFilteredReports(filtered);
  }, [reports, selectedRecordId, selectedStatus]);

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

  const renderFilters = () => {
    const selectedRecord = records.find((r) => r.id === selectedRecordId);

    return (
      <View style={styles.filtersContainer}>
        {/* Record Filter */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowRecordFilter(true)}
        >
          <Text style={styles.filterLabel}>Record</Text>
          <Text style={styles.filterValue} numberOfLines={1}>
            {selectedRecord?.name || 'All Records'}
          </Text>
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
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No reports yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete an inspection to see reports here
      </Text>
    </View>
  );

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
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  filtersContainer: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  filterButton: {
    backgroundColor: colors.neutral[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minWidth: 120,
  },
  filterLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  filterValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
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
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
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
