/**
 * RecordSearchScreen
 * Paginated, searchable list of records within a record type
 * Used for both inspection flow (mode: 'select') and browsing (mode: 'view')
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Icon, EmptyState } from '../../components/ui';
import { useRecordsStore } from '../../store/recordsStore';
import { useDebounce } from '../../hooks';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import type { HomeStackParamList } from '../../navigation/MainNavigator';
import type { RecordWithRecordType } from '../../services/records';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList, 'RecordSearch'>;
type RouteProps = RouteProp<HomeStackParamList, 'RecordSearch'>;

export function RecordSearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { recordTypeId, mode = 'select' } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    list,
    recordTypes,
    fetchRecordsPaginated,
    fetchMoreRecords,
    refreshRecords,
  } = useRecordsStore();

  // Get the current record type name for the header
  const currentRecordType = recordTypes.find((rt) => rt.id === recordTypeId);

  // Fetch records on mount and when search changes
  useEffect(() => {
    fetchRecordsPaginated(recordTypeId);
  }, [recordTypeId, fetchRecordsPaginated]);

  // Re-fetch when debounced search changes
  useEffect(() => {
    if (debouncedSearch !== '') {
      // For now, we filter client-side. Later we can add server-side search.
      // The store's fetchRecordsPaginated could be enhanced to accept search param
    }
  }, [debouncedSearch]);

  const handleSelectRecord = (record: RecordWithRecordType) => {
    if (mode === 'select') {
      // Inspection flow - go to template select
      navigation.navigate('TemplateSelect', { siteId: record.id });
    } else {
      // Browse flow - go to record detail
      navigation.navigate('RecordDetail', { recordId: record.id });
    }
  };

  const handleCreateNew = () => {
    navigation.navigate('QuickCreateRecord', { recordTypeId });
  };

  const handleEndReached = useCallback(() => {
    if (list.pageInfo.hasNextPage && !list.isLoadingMore) {
      fetchMoreRecords();
    }
  }, [list.pageInfo.hasNextPage, list.isLoadingMore, fetchMoreRecords]);

  // Filter records based on search (client-side for now)
  const filteredRecords = searchQuery.trim().length >= 2
    ? list.records.filter((record) =>
        record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.address && record.address.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : list.records;

  const renderRecord = ({ item }: { item: RecordWithRecordType }) => (
    <TouchableOpacity
      style={styles.recordCard}
      onPress={() => handleSelectRecord(item)}
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
  );

  const renderFooter = () => {
    if (!list.isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (list.isLoading) return null;

    if (searchQuery.trim().length >= 2 && filteredRecords.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="search"
            title="No matches found"
            description={`No records match "${searchQuery}"`}
          />
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="folder"
          title={`No ${currentRecordType?.name?.toLowerCase() || 'records'} yet`}
          description="Tap the + button to create one."
        />
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${currentRecordType?.name?.toLowerCase() || 'records'}...`}
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateNew}
          activeOpacity={0.7}
        >
          <Icon name="plus" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Results count */}
      {list.pageInfo.totalCount !== undefined && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {list.pageInfo.totalCount} {list.pageInfo.totalCount === 1 ? 'result' : 'results'}
          </Text>
        </View>
      )}

      {/* Loading state */}
      {list.isLoading && list.records.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Loading records...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id}
          renderItem={renderRecord}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={list.isLoading && list.records.length > 0}
              onRefresh={refreshRecords}
              colors={[colors.primary.DEFAULT]}
            />
          }
        />
      )}
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    paddingBottom: 0,
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    height: 48,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  resultsCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
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
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  separator: {
    height: spacing.sm,
  },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
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
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});

export default RecordSearchScreen;
