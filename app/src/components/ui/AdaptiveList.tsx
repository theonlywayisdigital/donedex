/**
 * AdaptiveList - Renders DataTable on desktop web, FlatList cards on mobile
 * Provides seamless switching between table and card views based on screen size
 */

import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ListRenderItem,
  RefreshControl,
} from 'react-native';
import { colors, spacing } from '../../constants/theme';
import { useAdaptiveLayout } from '../../hooks/useResponsive';
import { DataTable } from './DataTable';
import type { Column, SortState, EmptyStateConfig } from './DataTable/types';

export interface AdaptiveListProps<T> {
  /** Data items */
  data: T[];
  /** Column definitions for table view */
  columns: Column<T>[];
  /** Render function for card view */
  renderCard: (item: T, index: number) => React.ReactNode;
  /** Key extractor */
  keyExtractor: (item: T, index: number) => string;
  /** Callback when item is pressed */
  onItemPress?: (item: T) => void;
  /** Current sort state */
  sort?: SortState;
  /** Callback when sort changes */
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** Whether data is loading */
  loading?: boolean;
  /** Whether currently refreshing */
  refreshing?: boolean;
  /** Callback for pull-to-refresh */
  onRefresh?: () => void;
  /** Empty state configuration */
  emptyState?: EmptyStateConfig;
  /** Whether rows are selectable (table only) */
  selectable?: boolean;
  /** Currently selected keys (table only) */
  selectedKeys?: string[];
  /** Callback when selection changes (table only) */
  onSelectionChange?: (keys: string[]) => void;
  /** Row actions for table view */
  rowActions?: (item: T) => Array<{
    icon: string;
    label: string;
    onPress: () => void;
    variant?: 'default' | 'danger';
  }>;
  /** Number of columns for card grid (mobile/tablet) */
  numColumns?: number;
  /** Content padding */
  contentPadding?: number;
  /** Header component */
  ListHeaderComponent?: React.ReactNode;
  /** Footer component */
  ListFooterComponent?: React.ReactNode;
}

export function AdaptiveList<T>({
  data,
  columns,
  renderCard,
  keyExtractor,
  onItemPress,
  sort,
  onSort,
  loading = false,
  refreshing = false,
  onRefresh,
  emptyState,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  rowActions,
  numColumns = 1,
  contentPadding,
  ListHeaderComponent,
  ListFooterComponent,
}: AdaptiveListProps<T>) {
  const { showTable, contentPadding: defaultPadding } = useAdaptiveLayout();
  const padding = contentPadding ?? defaultPadding;

  // Card render item for FlatList
  const renderItem: ListRenderItem<T> = useCallback(
    ({ item, index }) => (
      <View style={[styles.cardWrapper, { padding: padding / 2 }]}>
        {renderCard(item, index)}
      </View>
    ),
    [renderCard, padding]
  );

  // Handle card press
  const handleCardPress = useCallback(
    (item: T) => {
      onItemPress?.(item);
    },
    [onItemPress]
  );

  // Desktop: Render DataTable
  if (showTable) {
    return (
      <View style={styles.tableContainer}>
        {ListHeaderComponent}
        <DataTable
          columns={columns}
          data={data}
          keyExtractor={keyExtractor}
          onRowPress={onItemPress}
          sort={sort}
          onSort={onSort}
          loading={loading}
          emptyState={emptyState}
          selectable={selectable}
          selectedKeys={selectedKeys}
          onSelectionChange={onSelectionChange}
          rowActions={rowActions}
          stickyHeader
        />
        {ListFooterComponent}
      </View>
    );
  }

  // Mobile/Tablet: Render FlatList with cards
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      numColumns={numColumns}
      contentContainerStyle={[
        styles.listContent,
        { padding: padding / 2 },
      ]}
      columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
      ListHeaderComponent={ListHeaderComponent ? (
        <View style={[styles.headerFooter, { paddingHorizontal: padding / 2 }]}>
          {ListHeaderComponent}
        </View>
      ) : null}
      ListFooterComponent={ListFooterComponent ? (
        <View style={[styles.headerFooter, { paddingHorizontal: padding / 2 }]}>
          {ListFooterComponent}
        </View>
      ) : null}
      ListEmptyComponent={
        !loading && emptyState ? (
          <View style={styles.emptyContainer}>
            {/* EmptyState component would go here */}
          </View>
        ) : null
      }
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
            colors={[colors.primary.DEFAULT]}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  cardWrapper: {
    flex: 1,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  headerFooter: {
    marginBottom: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
});

export default AdaptiveList;
