import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchRecordsWithRecordType, archiveRecord, RecordWithRecordType } from '../../services/records';
import { fetchRecordTypes } from '../../services/recordTypes';
import type { RecordType, Record as RecordModel } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'SiteList'>;

interface RecordTypeGroup {
  recordType: RecordType;
  records: RecordWithRecordType[];
}

export function SiteListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [records, setRecords] = useState<RecordWithRecordType[]>([]);
  const [recordTypes, setRecordTypes] = useState<RecordType[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [recordsResult, typesResult] = await Promise.all([
      fetchRecordsWithRecordType(),
      fetchRecordTypes(),
    ]);

    if (recordsResult.error) {
      console.error('Error loading records:', recordsResult.error.message);
    } else {
      // Filter out records with archived record types
      const activeRecords = recordsResult.data.filter(
        (r) => r.record_type && !r.record_type.archived
      );
      setRecords(activeRecords);
    }

    if (typesResult.error) {
      console.error('Error loading record types:', typesResult.error.message);
    } else {
      setRecordTypes(typesResult.data);
      // Expand all types by default on first load
      if (expandedTypes.size === 0) {
        setExpandedTypes(new Set(typesResult.data.map((t) => t.id)));
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [expandedTypes.size]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Group records by record type
  const groupedRecords = useMemo(() => {
    const groups: RecordTypeGroup[] = [];
    const recordsByType = new Map<string, RecordWithRecordType[]>();

    // Group records by record_type_id
    records.forEach((record) => {
      const typeId = record.record_type_id;
      if (!recordsByType.has(typeId)) {
        recordsByType.set(typeId, []);
      }
      recordsByType.get(typeId)!.push(record);
    });

    // Create groups for each record type (including those with no records)
    recordTypes.forEach((type) => {
      const typeRecords = recordsByType.get(type.id) || [];
      groups.push({
        recordType: type,
        records: typeRecords,
      });
    });

    // Sort groups by record type name (default types first)
    groups.sort((a, b) => {
      if (a.recordType.is_default !== b.recordType.is_default) {
        return a.recordType.is_default ? -1 : 1;
      }
      return a.recordType.name.localeCompare(b.recordType.name);
    });

    return groups;
  }, [records, recordTypes]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateRecord = () => {
    navigation.navigate('SiteEditor', {});
  };

  const handleViewRecord = (recordId: string) => {
    navigation.navigate('RecordDetail', { recordId });
  };

  const handleEditRecord = (recordId: string) => {
    navigation.navigate('SiteEditor', { siteId: recordId });
  };

  const handleDeleteRecord = (record: RecordModel) => {
    showDestructiveConfirm(
      'Delete Record',
      `Are you sure you want to delete "${record.name}"? This will also remove all template assignments for this record.`,
      async () => {
        const { error } = await archiveRecord(record.id);
        if (error) {
          showNotification('Error', error.message);
        } else {
          loadData();
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const toggleExpanded = (typeId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
      } else {
        next.add(typeId);
      }
      return next;
    });
  };

  const renderRecord = (item: RecordWithRecordType) => (
    <View key={item.id} style={styles.recordCard}>
      <TouchableOpacity
        style={styles.recordContent}
        onPress={() => handleViewRecord(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.recordInfo}>
          <Text style={styles.recordName}>{item.name}</Text>
          {item.address && (
            <Text style={styles.recordAddress} numberOfLines={1}>
              {item.address}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditRecord(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="edit" size={16} color={colors.primary.DEFAULT} />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteRecord(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="trash-2" size={16} color={colors.danger} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecordTypeFolder = (group: RecordTypeGroup) => {
    const { recordType, records: typeRecords } = group;
    const isExpanded = expandedTypes.has(recordType.id);
    const iconName = recordType.icon || 'folder';
    const iconColor = recordType.color || colors.primary.DEFAULT;

    return (
      <View key={recordType.id} style={styles.folderContainer}>
        <TouchableOpacity
          style={styles.folderHeader}
          onPress={() => toggleExpanded(recordType.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.folderIcon, { backgroundColor: iconColor + '20' }]}>
            <Icon name={iconName as any} size={20} color={iconColor} />
          </View>
          <View style={styles.folderInfo}>
            <Text style={styles.folderName}>{recordType.name}</Text>
            <Text style={styles.folderCount}>
              {typeRecords.length} {typeRecords.length === 1 ? recordType.name_singular || 'record' : 'records'}
            </Text>
          </View>
          <Icon
            name={isExpanded ? 'chevron-down' : 'chevron-right'}
            size={20}
            color={colors.text.secondary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.folderContent}>
            {typeRecords.length === 0 ? (
              <View style={styles.emptyFolder}>
                <Text style={styles.emptyFolderText}>
                  No {recordType.name.toLowerCase()} yet
                </Text>
              </View>
            ) : (
              typeRecords.map(renderRecord)
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No records yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first record to start assigning inspection templates
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateRecord}>
        <Text style={styles.emptyButtonText}>Add Record</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading records...</Text>
      </View>
    );
  }

  const totalRecords = records.length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.listContent,
          totalRecords === 0 && recordTypes.length === 0 && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {recordTypes.length === 0 ? (
          renderEmpty()
        ) : (
          groupedRecords.map(renderRecordTypeFolder)
        )}
      </ScrollView>
      {(totalRecords > 0 || recordTypes.length > 0) && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateRecord}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
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
  listContent: {
    padding: spacing.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  // Folder styles
  folderContainer: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
    ...shadows.card,
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  folderCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  folderContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    padding: spacing.sm,
    paddingTop: spacing.md,
  },
  emptyFolder: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  emptyFolderText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Record card styles
  recordCard: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  recordContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  actionButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  deleteButton: {
    backgroundColor: colors.danger + '10',
  },
  deleteButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.danger,
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
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.elevated,
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontWeight: fontWeight.regular,
    marginTop: -2,
  },
});
