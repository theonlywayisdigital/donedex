import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName } from '../../components/ui';
import { fetchRecordsByType, archiveRecord } from '../../services/records';
import { fetchRecordTypeById } from '../../services/recordTypes';
import type { Record as RecordModel, RecordType } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'RecordsList'>;
type RouteType = RouteProp<SitesStackParamList, 'RecordsList'>;

// Map icon names
const iconNameMap: Record<string, IconName> = {
  'truck': 'truck',
  'map-pin': 'map-pin',
  'building': 'building',
  'wrench': 'wrench',
  'user': 'user',
  'folder-kanban': 'folder-kanban',
  'building-2': 'building-2',
  'heart': 'heart',
  'door-open': 'door-open',
  'calendar': 'calendar',
  'clipboard-list': 'clipboard-list',
  'folder': 'folder',
};

function getIconName(icon: string): IconName {
  return iconNameMap[icon] || 'folder';
}

export function RecordsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { recordTypeId } = route.params;

  const [recordType, setRecordType] = useState<RecordType | null>(null);
  const [records, setRecords] = useState<RecordModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [typeResult, recordsResult] = await Promise.all([
      fetchRecordTypeById(recordTypeId),
      fetchRecordsByType(recordTypeId),
    ]);

    if (typeResult.data) {
      setRecordType(typeResult.data);
      // Update navigation title
      navigation.setOptions({ title: typeResult.data.name });
    }

    if (!recordsResult.error) {
      setRecords(recordsResult.data);
    }

    setLoading(false);
    setRefreshing(false);
  }, [recordTypeId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateRecord = () => {
    navigation.navigate('SiteEditor', { recordTypeId });
  };

  const handleEditRecord = (recordId: string) => {
    navigation.navigate('SiteEditor', { siteId: recordId, recordTypeId });
  };

  const handleDeleteRecord = (record: RecordModel) => {
    showDestructiveConfirm(
      `Delete ${recordType?.name_singular || 'Record'}`,
      `Are you sure you want to delete "${record.name}"?`,
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

  const renderRecord = ({ item }: { item: RecordModel }) => (
    <TouchableOpacity
      style={styles.recordCard}
      onPress={() => handleEditRecord(item.id)}
      onLongPress={() => handleDeleteRecord(item)}
    >
      <View style={styles.recordInfo}>
        <Text style={styles.recordName}>{item.name}</Text>
        {item.address && (
          <Text style={styles.recordAddress} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </View>
      <View style={styles.recordActions}>
        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => navigation.navigate('SiteAssignTemplates', { siteId: item.id })}
        >
          <Text style={styles.assignButtonText}>Templates</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      {recordType && (
        <View style={[styles.emptyIcon, { backgroundColor: recordType.color + '20' }]}>
          <Icon name={getIconName(recordType.icon)} size={48} color={recordType.color} />
        </View>
      )}
      <Text style={styles.emptyTitle}>
        No {recordType?.name.toLowerCase() || 'records'} yet
      </Text>
      <Text style={styles.emptySubtitle}>
        Add your first {recordType?.name_singular.toLowerCase() || 'record'} to start assigning inspection templates
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleCreateRecord}>
        <Text style={styles.emptyButtonText}>
          Add {recordType?.name_singular || 'Record'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => {
    if (!recordType) return null;

    return (
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: recordType.color + '20' }]}>
          <Icon name={getIconName(recordType.icon)} size={24} color={recordType.color} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{recordType.name}</Text>
          {recordType.description && (
            <Text style={styles.headerDescription}>{recordType.description}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editTypeButton}
          onPress={() => navigation.navigate('RecordTypeEditor', { recordTypeId })}
        >
          <Icon name="settings" size={20} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
      />
      {records.length > 0 && (
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
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  headerDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  editTypeButton: {
    padding: spacing.sm,
  },
  recordCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.card,
  },
  recordInfo: {
    flex: 1,
  },
  recordName: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  recordAddress: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  recordActions: {
    marginLeft: spacing.md,
  },
  assignButton: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  assignButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
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
