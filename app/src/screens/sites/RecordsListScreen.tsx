import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SitesStackParamList } from '../../navigation/MainNavigator';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName, FullScreenLoader } from '../../components/ui';
import { fetchRecordsPaginated, archiveRecord, type RecordWithRecordType } from '../../services/records';
import { fetchRecordTypeById } from '../../services/recordTypes';
import type { RecordType } from '../../types';

type NavigationProp = NativeStackNavigationProp<SitesStackParamList, 'RecordsList'>;
type RouteType = RouteProp<SitesStackParamList, 'RecordsList'>;

const PAGE_SIZE = 20;

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
  const [records, setRecords] = useState<RecordWithRecordType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Use ref to track cursor for pagination
  const nextCursorRef = useRef<string | null>(null);
  // Debounce search
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRecordType = useCallback(async () => {
    const { data } = await fetchRecordTypeById(recordTypeId);
    if (data) {
      setRecordType(data);
      navigation.setOptions({ title: data.name });
    }
  }, [recordTypeId, navigation]);

  const loadRecords = useCallback(async (search?: string, append = false) => {
    if (!append) {
      setLoading(true);
      nextCursorRef.current = null;
    }

    const result = await fetchRecordsPaginated({
      recordTypeId,
      search: search || undefined,
      pagination: {
        limit: PAGE_SIZE,
        cursor: append ? nextCursorRef.current || undefined : undefined,
      },
    });

    if (append) {
      setRecords((prev) => [...prev, ...result.data]);
    } else {
      setRecords(result.data);
    }

    nextCursorRef.current = result.pageInfo.endCursor || null;
    setHasMore(result.pageInfo.hasNextPage);
    setTotalCount(result.pageInfo.totalCount ?? null);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [recordTypeId]);

  useFocusEffect(
    useCallback(() => {
      loadRecordType();
      loadRecords(searchQuery);
    }, [loadRecordType, loadRecords, searchQuery])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRecords(searchQuery);
  }, [loadRecords, searchQuery]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    loadRecords(searchQuery, true);
  }, [loadingMore, hasMore, loading, loadRecords, searchQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadRecords(text);
    }, 300);
  }, [loadRecords]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    loadRecords('');
  }, [loadRecords]);

  const handleCreateRecord = () => {
    navigation.navigate('SiteEditor', { recordTypeId });
  };

  const handleViewRecord = (recordId: string) => {
    navigation.navigate('RecordDetail', { recordId });
  };

  const handleEditRecord = (recordId: string) => {
    navigation.navigate('SiteEditor', { siteId: recordId, recordTypeId });
  };

  const handleDeleteRecord = (record: RecordWithRecordType) => {
    showDestructiveConfirm(
      `Delete ${recordType?.name_singular || 'Record'}`,
      `Are you sure you want to delete "${record.name}"?`,
      async () => {
        const { error } = await archiveRecord(record.id);
        if (error) {
          showNotification('Error', error.message);
        } else {
          loadRecords(searchQuery);
        }
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const renderRecord = ({ item }: { item: RecordWithRecordType }) => (
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

  const renderEmpty = () => {
    // Show different empty state for search vs no records
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="search" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            {`Try a different search term`}
          </Text>
          <TouchableOpacity style={styles.clearSearchButton} onPress={handleClearSearch}>
            <Text style={styles.clearSearchText}>Clear search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
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
  };

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

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && records.length === 0) {
    return <FullScreenLoader message="Loading records..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${recordType?.name.toLowerCase() || 'records'}...`}
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
        {totalCount !== null && (
          <Text style={styles.resultCount}>
            {totalCount} {totalCount === 1 ? recordType?.name_singular?.toLowerCase() || 'record' : recordType?.name.toLowerCase() || 'records'}
            {searchQuery.trim() ? ' found' : ''}
          </Text>
        )}
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
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
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  searchSection: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
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
  resultCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
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
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.bold,
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
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
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
    fontWeight: fontWeight.bold,
  },
  clearSearchButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
  },
  clearSearchText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  footerLoaderText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
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
