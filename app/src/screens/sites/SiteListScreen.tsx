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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../../components/ui';
import { fetchRecords, archiveRecord } from '../../services/records';
import type { Record as RecordModel } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'SiteList'>;

interface RecordWithCount extends RecordModel {
  templateCount?: number;
}

export function SiteListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [records, setRecords] = useState<RecordWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecords = useCallback(async () => {
    const { data, error } = await fetchRecords();
    if (error) {
      console.error('Error loading records:', error.message);
    } else {
      setRecords(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadRecords();
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
          loadRecords();
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const renderRecord = ({ item }: { item: RecordWithCount }) => (
    <View style={styles.recordCard}>
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
  recordCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  recordContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: colors.neutral[50],
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
