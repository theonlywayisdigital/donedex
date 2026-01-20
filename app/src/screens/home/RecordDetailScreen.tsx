/**
 * RecordDetailScreen
 * Detailed view of a single record with tabs for Reports, Documents, and Details
 * Enhanced with search, filtering, month grouping, and pagination for reports
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  SectionList,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { Card, Icon, EmptyState, StatusBadge, TabBar, type Tab } from '../../components/ui';
import {
  fetchRecordWithType,
  fetchRecordReportsFiltered,
  type RecordWithRecordType,
  type ReportSummaryExtended,
  type ReportFilters,
} from '../../services/records';
import {
  fetchRecordDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentUrl,
  formatFileSize,
  getDocumentIcon,
  DOCUMENT_CATEGORIES,
  type DocumentWithUploader,
} from '../../services/documents';
import { fetchTemplates, type Template } from '../../services/templates';
import { fetchTeamMembers, type TeamMember } from '../../services/team';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'RecordDetail'>;
type RouteProps = RouteProp<HomeStackParamList, 'RecordDetail'>;

// Tab definitions
const TABS: Tab[] = [
  { key: 'reports', label: 'Reports', icon: 'file-text' },
  { key: 'documents', label: 'Documents', icon: 'folder' },
  { key: 'details', label: 'Details', icon: 'info' },
];

// Report section for month grouping
interface ReportSection {
  title: string;
  monthKey: string;
  data: ReportSummaryExtended[];
}

// Group reports by month
function groupReportsByMonth(reports: ReportSummaryExtended[]): ReportSection[] {
  const groups = new Map<string, ReportSummaryExtended[]>();

  reports.forEach((report) => {
    const date = new Date(report.submitted_at || report.started_at);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = groups.get(monthKey) || [];
    groups.set(monthKey, [...existing, report]);
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Newest first
    .map(([monthKey, data]) => ({
      title: formatMonthTitle(monthKey),
      monthKey,
      data,
    }));
}

// Format month key to display title
function formatMonthTitle(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }).toUpperCase();
}

const PAGE_SIZE = 20;

export function RecordDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { recordId } = route.params;

  const { organisation, isAdmin } = useAuthStore();

  // Core state
  const [record, setRecord] = useState<RecordWithRecordType | null>(null);
  const [reports, setReports] = useState<ReportSummaryExtended[]>([]);
  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [activeTab, setActiveTab] = useState('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reports filter state
  const [filters, setFilters] = useState<ReportFilters>({
    templateId: null,
    status: 'all',
    dateFrom: null,
    dateTo: null,
    userId: null,
  });
  const [tempFilters, setTempFilters] = useState<ReportFilters>({
    templateId: null,
    status: 'all',
    dateFrom: null,
    dateTo: null,
    userId: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalReportCount, setTotalReportCount] = useState<number | null>(null);
  const cursorRef = useRef<string | null>(null);

  // Filter options
  const [templates, setTemplates] = useState<Template[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Group reports by month
  const reportSections = useMemo(() => groupReportsByMonth(reports), [reports]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.templateId) count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.userId) count++;
    return count;
  }, [filters]);

  // Sync tempFilters with filters when modal opens
  useEffect(() => {
    if (showFilterModal) {
      setTempFilters(filters);
    }
  }, [showFilterModal, filters]);

  // Load filter options (templates and team members)
  const loadFilterOptions = useCallback(async () => {
    if (!organisation) return;

    const [templatesResult, teamResult] = await Promise.all([
      fetchTemplates(),
      fetchTeamMembers(organisation.id),
    ]);

    if (!templatesResult.error) {
      setTemplates(templatesResult.data);
    }
    if (!teamResult.error) {
      setTeamMembers(teamResult.data);
    }
  }, [organisation]);

  // Load reports with filters and pagination
  const loadReports = useCallback(
    async (append = false) => {
      if (!append) {
        cursorRef.current = null;
      }

      const result = await fetchRecordReportsFiltered(
        recordId,
        { ...filters, search: searchQuery },
        { limit: PAGE_SIZE, cursor: append ? cursorRef.current || undefined : undefined }
      );

      if (append) {
        setReports((prev) => [...prev, ...result.data]);
      } else {
        setReports(result.data);
      }

      cursorRef.current = result.pageInfo.endCursor || null;
      setHasMore(result.pageInfo.hasNextPage);
      setTotalReportCount(result.pageInfo.totalCount ?? null);
      setLoadingMore(false);
    },
    [recordId, filters, searchQuery]
  );

  // Load initial data
  const loadData = useCallback(
    async (showRefreshing = false) => {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Fetch record first
        const recordResult = await fetchRecordWithType(recordId);

        if (recordResult.error) {
          setError(recordResult.error.message);
          return;
        }

        setRecord(recordResult.data);

        // Fetch documents separately - table may not exist yet
        try {
          const documentsResult = await fetchRecordDocuments({ recordId });
          if (!documentsResult.error) {
            setDocuments(documentsResult.data);
          } else {
            console.warn('[Documents] Error fetching documents:', documentsResult.error);
            setDocuments([]);
          }
        } catch (docErr) {
          console.warn('[Documents] Documents feature not available:', docErr);
          setDocuments([]);
        }

        // Update navigation title
        if (recordResult.data) {
          navigation.setOptions({ title: recordResult.data.name });
        }

        // Load reports separately (uses filter state)
        await loadReports();
      } catch (err) {
        console.error('[RecordDetail] Error loading data:', err);
        setError('Failed to load record');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [recordId, navigation, loadReports]
  );

  useEffect(() => {
    loadData();
    loadFilterOptions();
  }, [loadData, loadFilterOptions]);

  // Reload reports when filters change
  useEffect(() => {
    if (!isLoading) {
      loadReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);

      // Debounce search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        loadReports();
      }, 300);
    },
    [loadReports]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    loadReports();
  }, [loadReports]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || isLoading) return;
    setLoadingMore(true);
    loadReports(true);
  }, [loadingMore, hasMore, isLoading, loadReports]);

  const handleStartInspection = () => {
    navigation.navigate('TemplateSelect', { siteId: recordId });
  };

  const handleEditRecord = () => {
    // Navigate to SiteEditor in the Sites tab (cross-tab navigation)
    (navigation as any).navigate('SitesTab', {
      screen: 'SiteEditor',
      params: {
        siteId: recordId,
        recordTypeId: record?.record_type_id,
      },
    });
  };

  const handleViewReport = (report: ReportSummaryExtended) => {
    if (report.status === 'draft') {
      navigation.navigate('Inspection', { reportId: report.id });
    } else {
      navigation.navigate('InspectionReview', { reportId: report.id });
    }
  };

  const handleApplyFilters = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setShowFilterModal(false);
  };

  const handleResetFilters = () => {
    setFilters({
      templateId: null,
      status: 'all',
      dateFrom: null,
      dateTo: null,
      userId: null,
    });
    setShowFilterModal(false);
  };

  const handleUploadDocument = async () => {
    if (!organisation) {
      Alert.alert('Error', 'Organisation not found');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      setIsUploadingDocument(true);

      const uploadResult = await uploadDocument({
        recordId,
        organisationId: organisation.id,
        file: {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
          size: file.size,
        },
      });

      if (uploadResult.error) {
        Alert.alert('Upload Failed', uploadResult.error.message);
      } else {
        const docsResult = await fetchRecordDocuments({ recordId });
        setDocuments(docsResult.data);
      }
    } catch (err) {
      console.error('[RecordDetail] Document upload error:', err);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const handleViewDocument = async (doc: DocumentWithUploader) => {
    try {
      const { url, error: urlError } = await getDocumentUrl(doc.file_path);
      if (urlError || !url) {
        Alert.alert('Error', 'Could not get document URL');
        return;
      }

      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this document type');
      }
    } catch (err) {
      console.error('[RecordDetail] Error opening document:', err);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const handleDeleteDocument = (doc: DocumentWithUploader) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await deleteDocument(doc.id);
            if (deleteError) {
              Alert.alert('Error', deleteError.message);
            } else {
              setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Render report card
  const renderReportCard = ({ item }: { item: ReportSummaryExtended }) => (
    <TouchableOpacity activeOpacity={0.7} onPress={() => handleViewReport(item)}>
      <Card style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <Text style={styles.reportTemplate}>{item.template_name}</Text>
          <StatusBadge
            status={item.status === 'submitted' ? 'complete' : 'pending'}
            customLabel={item.status === 'submitted' ? 'Completed' : 'Draft'}
          />
        </View>
        <View style={styles.reportMeta}>
          <View style={styles.reportMetaItem}>
            <Icon name="calendar" size={14} color={colors.text.tertiary} />
            <Text style={styles.reportMetaText}>
              {formatDate(item.submitted_at || item.started_at)}
            </Text>
          </View>
          {item.user_name && (
            <View style={styles.reportMetaItem}>
              <Icon name="user" size={14} color={colors.text.tertiary} />
              <Text style={styles.reportMetaText}>{item.user_name}</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  // Render month section header
  const renderSectionHeader = ({ section }: { section: ReportSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  // Render reports footer (loading more indicator)
  const renderReportsFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingMoreText}>Loading more...</Text>
      </View>
    );
  };

  // Render filter modal
  const renderFilterModal = () => {
    const selectedTemplate = templates.find((t) => t.id === tempFilters.templateId);
    const selectedUser = teamMembers.find((m) => m.user_id === tempFilters.userId);

    return (
      <Modal visible={showFilterModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Reports</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Template Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Template</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !tempFilters.templateId && styles.filterChipActive,
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, templateId: null })}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !tempFilters.templateId && styles.filterChipTextActive,
                    ]}
                  >
                    All Templates
                  </Text>
                </TouchableOpacity>
                {templates.slice(0, 5).map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[
                      styles.filterChip,
                      tempFilters.templateId === template.id && styles.filterChipActive,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, templateId: template.id })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.templateId === template.id && styles.filterChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {template.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterChipRow}>
                {(['all', 'submitted', 'draft'] as const).map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      tempFilters.status === status && styles.filterChipActive,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, status })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.status === status && styles.filterChipTextActive,
                      ]}
                    >
                      {status === 'all' ? 'All' : status === 'submitted' ? 'Completed' : 'Draft'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* User Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Inspector</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !tempFilters.userId && styles.filterChipActive,
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, userId: null })}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      !tempFilters.userId && styles.filterChipTextActive,
                    ]}
                  >
                    All Users
                  </Text>
                </TouchableOpacity>
                {teamMembers.slice(0, 5).map((member) => (
                  <TouchableOpacity
                    key={member.user_id}
                    style={[
                      styles.filterChip,
                      tempFilters.userId === member.user_id && styles.filterChipActive,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, userId: member.user_id })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.userId === member.user_id && styles.filterChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {member.user_profile?.full_name || 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setTempFilters({
                    templateId: null,
                    status: 'all',
                    dateFrom: null,
                    dateTo: null,
                    userId: null,
                  });
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => handleApplyFilters(tempFilters)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // Render reports tab
  const renderReportsTab = () => {
    const hasFiltersOrSearch = activeFilterCount > 0 || searchQuery.trim().length > 0;

    // Empty state
    if (reports.length === 0 && !isLoading) {
      return (
        <View style={styles.tabContent}>
          {/* Search and Filter Bar */}
          <View style={styles.searchFilterBar}>
            <View style={styles.searchInputContainer}>
              <Icon name="search" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search reports..."
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleClearSearch}>
                  <Icon name="x" size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
              onPress={() => setShowFilterModal(true)}
            >
              <Icon
                name="filter"
                size={20}
                color={activeFilterCount > 0 ? colors.white : colors.text.secondary}
              />
              {activeFilterCount > 0 && (
                <Text style={styles.filterBadge}>{activeFilterCount}</Text>
              )}
            </TouchableOpacity>
          </View>

          <Card>
            <EmptyState
              icon={hasFiltersOrSearch ? 'search' : 'file-text'}
              title={hasFiltersOrSearch ? 'No matching reports' : 'No reports yet'}
              description={
                hasFiltersOrSearch
                  ? 'Try adjusting your search or filters'
                  : 'Start an inspection to create your first report for this record.'
              }
            />
            {hasFiltersOrSearch && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  handleClearSearch();
                  handleResetFilters();
                }}
              >
                <Text style={styles.clearFiltersText}>Clear all filters</Text>
              </TouchableOpacity>
            )}
          </Card>
        </View>
      );
    }

    return (
      <View style={styles.reportsTabContainer}>
        {/* Search and Filter Bar */}
        <View style={styles.searchFilterBar}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reports..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Icon name="x" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Icon
              name="filter"
              size={20}
              color={activeFilterCount > 0 ? colors.white : colors.text.secondary}
            />
            {activeFilterCount > 0 && (
              <Text style={styles.filterBadge}>{activeFilterCount}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Result count */}
        {totalReportCount !== null && (
          <Text style={styles.resultCount}>
            {totalReportCount} {totalReportCount === 1 ? 'report' : 'reports'}
            {(activeFilterCount > 0 || searchQuery.trim()) ? ' found' : ''}
          </Text>
        )}

        {/* Reports List grouped by month */}
        <SectionList
          sections={reportSections}
          keyExtractor={(item) => item.id}
          renderItem={renderReportCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.reportsList}
          ListFooterComponent={renderReportsFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          stickySectionHeadersEnabled={false}
        />
      </View>
    );
  };

  const renderDocumentsTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Upload button for admins */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadDocument}
            disabled={isUploadingDocument}
            activeOpacity={0.7}
          >
            {isUploadingDocument ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Icon name="upload" size={20} color={colors.white} />
                <Text style={styles.uploadButtonText}>Upload Document</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Documents list */}
        {documents.length === 0 ? (
          <Card style={styles.emptyCard}>
            <EmptyState
              icon="folder"
              title="No documents"
              description={
                isAdmin
                  ? 'Upload documents like contracts, photos, or certificates.'
                  : 'No documents have been uploaded for this record yet.'
              }
            />
          </Card>
        ) : (
          <FlatList
            data={documents}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.documentCard}
                onPress={() => handleViewDocument(item)}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  <Icon
                    name={getDocumentIcon(item.mime_type) as 'file-text'}
                    size={24}
                    color={colors.primary.DEFAULT}
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View style={styles.documentMeta}>
                    <Text style={styles.documentMetaText}>
                      {formatFileSize(item.file_size)}
                    </Text>
                    <Text style={styles.documentMetaDot}>-</Text>
                    <Text style={styles.documentMetaText}>
                      {DOCUMENT_CATEGORIES[item.category]?.label || item.category}
                    </Text>
                    {item.uploader_name && (
                      <>
                        <Text style={styles.documentMetaDot}>-</Text>
                        <Text style={styles.documentMetaText}>{item.uploader_name}</Text>
                      </>
                    )}
                  </View>
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.documentDeleteButton}
                    onPress={() => handleDeleteDocument(item)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="trash-2" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
                <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  };

  const renderDetailsTab = () => {
    if (!record) return null;

    const recordType = record.record_type;
    const metadata = record.metadata as Record<string, unknown> | null;

    return (
      <ScrollView style={styles.tabContent} contentContainerStyle={styles.detailsContent}>
        {/* Basic Info */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Basic Information</Text>
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name</Text>
              <Text style={styles.detailValue}>{record.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type</Text>
              <View style={styles.recordTypeBadge}>
                {recordType.icon && (
                  <Icon
                    name={recordType.icon as 'folder'}
                    size={16}
                    color={recordType.color || colors.primary.DEFAULT}
                  />
                )}
                <Text style={styles.recordTypeText}>
                  {recordType.name_singular || recordType.name}
                </Text>
              </View>
            </View>
            {record.address && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{record.address}</Text>
              </View>
            )}
            {record.description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{record.description}</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Custom Fields (Metadata) */}
        {metadata && Object.keys(metadata).length > 0 && (
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Custom Fields</Text>
            <Card style={styles.detailCard}>
              {Object.entries(metadata).map(([key, value]) => (
                <View key={key} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Text>
                  <Text style={styles.detailValue}>{String(value)}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Timestamps */}
        <View style={styles.detailSection}>
          <Text style={styles.detailSectionTitle}>Record Info</Text>
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(record.created_at)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>{formatDate(record.updated_at)}</Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reports':
        return renderReportsTab();
      case 'documents':
        return renderDocumentsTab();
      case 'details':
        return renderDetailsTab();
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading record...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !record) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={colors.danger} />
          <Text style={styles.errorText}>{error || 'Record not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header with record info and actions */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.recordName}>{record.name}</Text>
          {record.address && (
            <Text style={styles.recordAddress} numberOfLines={1}>
              {record.address}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {isAdmin && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditRecord}
              activeOpacity={0.7}
            >
              <Icon name="edit" size={18} color={colors.primary.DEFAULT} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStartInspection}
            activeOpacity={0.7}
          >
            <Icon name="play-circle" size={20} color={colors.white} />
            <Text style={styles.startButtonText}>Inspect</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <TabBar
        tabs={TABS.map((tab) => ({
          ...tab,
          badge:
            tab.key === 'reports'
              ? totalReportCount ?? reports.length
              : tab.key === 'documents'
                ? documents.length
                : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {activeTab === 'reports' ? (
          renderTabContent()
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={() => loadData(true)} />
            }
          >
            {renderTabContent()}
          </ScrollView>
        )}
      </View>

      {/* Filter Modal */}
      {renderFilterModal()}
    </SafeAreaView>
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordName: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  recordAddress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  startButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },
  // Reports tab styles
  reportsTabContainer: {
    flex: 1,
  },
  searchFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.danger,
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.bold,
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: 'center',
    lineHeight: 18,
    overflow: 'hidden',
  },
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  reportsList: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  sectionHeader: {
    paddingVertical: spacing.sm,
    paddingTop: spacing.md,
  },
  sectionHeaderText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  reportCard: {
    marginBottom: spacing.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  reportTemplate: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  reportMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  reportMetaText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingMoreText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  clearFiltersButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
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
  // Filter Modal styles
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
    maxHeight: '80%',
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[50],
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  filterChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.md,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  applyButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  // Documents styles
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  uploadButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  emptyCard: {
    marginTop: spacing.sm,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  documentMetaText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  documentMetaDot: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  documentDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.danger + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  hintText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  // Details styles
  detailsContent: {
    paddingBottom: spacing.xl,
  },
  detailSection: {
    marginBottom: spacing.lg,
  },
  detailSectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  detailCard: {},
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    flex: 2,
    textAlign: 'right',
  },
  recordTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordTypeText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
});

export default RecordDetailScreen;
