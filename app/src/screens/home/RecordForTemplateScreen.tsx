import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showNotification } from '../../utils/alert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Button, Icon } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { useInspectionStore } from '../../store/inspectionStore';
import { useQuickStartStore } from '../../store/quickStartStore';
import {
  fetchRecordsByType,
  fetchRecords,
  createRecordQuick,
  type Record as RecordModel,
} from '../../services/records';
import { getRecentRecordsByType, trackUsage } from '../../services/usageTracking';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';

type RecordForTemplateRouteProp = RouteProp<HomeStackParamList, 'RecordForTemplate'>;
type RecordForTemplateNavigationProp = NativeStackNavigationProp<HomeStackParamList, 'RecordForTemplate'>;

// Simple type for display purposes
interface DisplayRecord {
  id: string;
  name: string;
  address: string | null;
}

export function RecordForTemplateScreen() {
  const navigation = useNavigation<RecordForTemplateNavigationProp>();
  const route = useRoute<RecordForTemplateRouteProp>();
  const { templateId, templateName, recordTypeId } = route.params;

  const { user, organisation } = useAuthStore();
  const { startInspection, isLoading: isStarting } = useInspectionStore();
  const { clearCache: clearQuickStartCache } = useQuickStartStore();

  const [records, setRecords] = useState<RecordModel[]>([]);
  const [recentRecords, setRecentRecords] = useState<DisplayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<string | null>(null);

  // Create record modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRecordName, setNewRecordName] = useState('');
  const [newRecordAddress, setNewRecordAddress] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordTypeId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch records - filtered by type if specified
      const recordsResult = recordTypeId
        ? await fetchRecordsByType(recordTypeId)
        : await fetchRecords();

      if (recordsResult.error) {
        setError(recordsResult.error.message);
      } else {
        setRecords(recordsResult.data);
      }

      // Fetch recent records for this type
      if (recordTypeId) {
        const recentResult = await getRecentRecordsByType(recordTypeId, 3);
        if (!recentResult.error && recentResult.data.length > 0) {
          // Map to DisplayRecord format
          setRecentRecords(
            recentResult.data.map((r) => ({
              id: r.id,
              name: r.name,
              address: r.address,
            }))
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecordSelect = (recordId: string) => {
    setSelectedRecord(recordId);
  };

  const handleStartInspection = async () => {
    if (!selectedRecord || !user || !organisation) {
      showNotification('Error', 'Unable to start inspection. Please try again.');
      return;
    }

    const result = await startInspection(
      organisation.id,
      selectedRecord,
      templateId,
      user.id
    );

    if (result.error) {
      showNotification('Error', result.error);
    } else if (result.reportId) {
      // Track usage for quick-start suggestions
      trackUsage(organisation.id, user.id, templateId, selectedRecord, result.reportId);

      // Clear cache to refresh quick-start on dashboard
      clearQuickStartCache();

      navigation.navigate('Inspection', { reportId: result.reportId });
    }
  };

  const handleCreateRecord = async () => {
    if (!newRecordName.trim() || !user || !organisation) {
      showNotification('Error', 'Please enter a record name.');
      return;
    }

    if (!recordTypeId) {
      showNotification('Error', 'Cannot create record without a record type.');
      return;
    }

    setIsCreating(true);

    try {
      const result = await createRecordQuick(
        organisation.id,
        recordTypeId,
        newRecordName.trim(),
        newRecordAddress.trim() || undefined
      );

      if (result.error) {
        showNotification('Error', result.error.message);
        return;
      }

      if (result.data) {
        // Add new record to list and select it
        setRecords((prev) => [result.data!, ...prev]);
        setSelectedRecord(result.data.id);
        setShowCreateModal(false);
        setNewRecordName('');
        setNewRecordAddress('');

        // Automatically start inspection with the new record
        const inspectionResult = await startInspection(
          organisation.id,
          result.data.id,
          templateId,
          user.id
        );

        if (inspectionResult.error) {
          showNotification('Error', inspectionResult.error);
        } else if (inspectionResult.reportId) {
          trackUsage(organisation.id, user.id, templateId, result.data.id, inspectionResult.reportId);
          clearQuickStartCache();
          navigation.navigate('Inspection', { reportId: inspectionResult.reportId });
        }
      }
    } catch (err) {
      showNotification('Error', err instanceof Error ? err.message : 'Failed to create record');
    } finally {
      setIsCreating(false);
    }
  };

  // Filter records by search query
  const filteredRecords = searchQuery.trim()
    ? records.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.address?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : records;

  // Exclude recent records from main list to avoid duplication
  const recentIds = new Set(recentRecords.map((r) => r.id));
  const mainRecords = filteredRecords.filter((r) => !recentIds.has(r.id));

  const renderRecord = useCallback(
    ({ item, isRecent = false }: { item: DisplayRecord; isRecent?: boolean }) => {
      const isSelected = selectedRecord === item.id;

      return (
        <TouchableOpacity
          onPress={() => handleRecordSelect(item.id)}
          activeOpacity={0.7}
        >
          <Card
            style={StyleSheet.flatten([
              styles.recordCard,
              isSelected ? styles.recordCardSelected : undefined,
            ])}
          >
            <View style={styles.radioContainer}>
              <View
                style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}
              >
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </View>
            <View style={styles.recordInfo}>
              <Text style={styles.recordName}>{item.name}</Text>
              {item.address && (
                <Text style={styles.recordAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              )}
              {isRecent && (
                <View style={styles.recentBadge}>
                  <Icon name="clock" size={12} color={colors.primary.DEFAULT} />
                  <Text style={styles.recentBadgeText}>Recent</Text>
                </View>
              )}
            </View>
          </Card>
        </TouchableOpacity>
      );
    },
    [selectedRecord]
  );

  const renderEmpty = () => {
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptyText}>
            {`Try a different search term or create a new record.`}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Icon name="folder" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No Records Available</Text>
        <Text style={styles.emptyText}>
          {`Create a new record to start your inspection.`}
        </Text>
        {recordTypeId && (
          <Button
            title="Create New Record"
            onPress={() => setShowCreateModal(true)}
            style={styles.emptyCreateButton}
          />
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Recent Records Section */}
      {recentRecords.length > 0 && !searchQuery.trim() && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent</Text>
          {recentRecords.map((record) => (
            <View key={record.id} style={styles.recentItem}>
              {renderRecord({ item: record, isRecent: true })}
            </View>
          ))}
        </View>
      )}

      {/* All Records Section */}
      {mainRecords.length > 0 && (
        <Text style={styles.sectionTitle}>
          {searchQuery.trim() ? 'Search Results' : 'All Records'}
        </Text>
      )}
    </View>
  );

  if (isLoading && records.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.templateBadge}>{templateName}</Text>
        <Text style={styles.headerTitle}>Select a Record</Text>
        <Text style={styles.headerSubtitle}>
          Choose which record to inspect
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
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

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={mainRecords}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderRecord({ item })}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={loadData}
              colors={[colors.primary.DEFAULT]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {recordTypeId && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Icon name="plus" size={20} color={colors.primary.DEFAULT} />
            <Text style={styles.createButtonText}>Create New Record</Text>
          </TouchableOpacity>
        )}
        <Button
          title="Start Inspection"
          onPress={handleStartInspection}
          disabled={!selectedRecord}
          loading={isStarting}
          fullWidth
        />
      </View>

      {/* Create Record Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Record</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter record name"
                placeholderTextColor={colors.text.tertiary}
                value={newRecordName}
                onChangeText={setNewRecordName}
                autoCapitalize="words"
                autoFocus
              />

              <Text style={styles.inputLabel}>Address (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter address"
                placeholderTextColor={colors.text.tertiary}
                value={newRecordAddress}
                onChangeText={setNewRecordAddress}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowCreateModal(false)}
                style={styles.modalCancelButton}
              />
              <Button
                title="Create & Start"
                onPress={handleCreateRecord}
                loading={isCreating}
                disabled={!newRecordName.trim()}
                style={styles.modalCreateButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  templateBadge: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: 0,
    flexGrow: 1,
  },
  recentSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  recentItem: {
    marginBottom: spacing.sm,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  recordCardSelected: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
  },
  radioContainer: {
    marginRight: spacing.md,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  recordAddress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  recentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  recentBadgeText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  separator: {
    height: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCreateButton: {
    marginTop: spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  createButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    ...shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  modalCloseButton: {
    padding: spacing.xs,
  },
  modalBody: {
    padding: spacing.lg,
  },
  inputLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 48,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalCreateButton: {
    flex: 2,
  },
});
