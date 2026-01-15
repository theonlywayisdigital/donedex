/**
 * RecordDetailScreen
 * Detailed view of a single record with tabs for Reports, Documents, and Details
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { Card, Icon, EmptyState, StatusBadge, TabBar, type Tab } from '../../components/ui';
import {
  fetchRecordWithType,
  fetchRecordReportsSummary,
  type RecordWithRecordType,
  type ReportSummary,
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
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'RecordDetail'>;
type RouteProps = RouteProp<HomeStackParamList, 'RecordDetail'>;

// Tab definitions
const TABS: Tab[] = [
  { key: 'reports', label: 'Reports', icon: 'file-text' },
  { key: 'documents', label: 'Documents', icon: 'folder' },
  { key: 'details', label: 'Details', icon: 'info' },
];

export function RecordDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { recordId } = route.params;

  const { organisation, isAdmin } = useAuthStore();

  const [record, setRecord] = useState<RecordWithRecordType | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [documents, setDocuments] = useState<DocumentWithUploader[]>([]);
  const [activeTab, setActiveTab] = useState('reports');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Fetch record, reports, and documents in parallel
      const [recordResult, reportsResult, documentsResult] = await Promise.all([
        fetchRecordWithType(recordId),
        fetchRecordReportsSummary(recordId),
        fetchRecordDocuments({ recordId }),
      ]);

      if (recordResult.error) {
        setError(recordResult.error.message);
        return;
      }

      setRecord(recordResult.data);
      setReports(reportsResult.data);
      setDocuments(documentsResult.data);

      // Update navigation title
      if (recordResult.data) {
        navigation.setOptions({ title: recordResult.data.name });
      }
    } catch (err) {
      console.error('[RecordDetail] Error loading data:', err);
      setError('Failed to load record');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [recordId, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartInspection = () => {
    navigation.navigate('TemplateSelect', { siteId: recordId });
  };

  const handleViewReport = (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (report?.status === 'draft') {
      navigation.navigate('Inspection', { reportId });
    } else {
      navigation.navigate('InspectionReview', { reportId });
    }
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
        // Refresh documents list
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

      // Open in browser/external viewer
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

  const renderReportsTab = () => {
    if (reports.length === 0) {
      return (
        <View style={styles.tabContent}>
          <Card>
            <EmptyState
              icon="file-text"
              title="No reports yet"
              description="Start an inspection to create your first report for this record."
            />
          </Card>
        </View>
      );
    }

    return (
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.reportsList}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleViewReport(item.id)}
          >
            <Card style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportTemplate}>{item.template_name}</Text>
                <StatusBadge
                  status={item.status === 'submitted' ? 'complete' : 'pending'}
                  customLabel={item.status === 'submitted' ? 'Submitted' : 'Draft'}
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
        )}
      />
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
                onLongPress={isAdmin ? () => handleDeleteDocument(item) : undefined}
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
                        <Text style={styles.documentMetaText}>
                          {item.uploader_name}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Hint for admins about long press to delete */}
        {isAdmin && documents.length > 0 && (
          <Text style={styles.hintText}>Long press a document to delete it</Text>
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
      {/* Header with record info and CTA */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.recordName}>{record.name}</Text>
          {record.address && (
            <Text style={styles.recordAddress} numberOfLines={1}>
              {record.address}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartInspection}
          activeOpacity={0.7}
        >
          <Icon name="play-circle" size={20} color={colors.white} />
          <Text style={styles.startButtonText}>Inspect</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <TabBar
        tabs={TABS.map((tab) => ({
          ...tab,
          badge:
            tab.key === 'reports'
              ? reports.length
              : tab.key === 'documents'
                ? documents.length
                : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
            />
          }
        >
          {renderTabContent()}
        </ScrollView>
      </View>
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
  reportsList: {
    padding: spacing.lg,
    gap: spacing.sm,
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
  detailCard: {
    // No horizontal margin since we're inside tabContent padding
  },
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
