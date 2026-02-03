/**
 * DataTable - Professional table component for desktop web
 * Renders a semantic HTML table with sorting, selection, and row actions
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, webComponents } from '../../../constants/theme';
import { Icon } from '../Icon';
import { EmptyState } from '../EmptyState';
import type { DataTableProps, Column } from './types';

// Helper to merge styles for web elements
const mergeWebStyles = (...styleObjects: (React.CSSProperties | false | undefined)[]): React.CSSProperties => {
  return styleObjects.reduce<React.CSSProperties>((acc, style) => {
    if (style) {
      return { ...acc, ...style };
    }
    return acc;
  }, {});
};

// Base web styles
const baseWebStyles = {
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    tableLayout: 'fixed' as const,
  },
  headerRow: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
    backgroundColor: colors.neutral[50],
    borderBottom: `1px solid ${colors.border.DEFAULT}`,
  },
  headerCell: {
    padding: webComponents.table.cellPadding,
    height: webComponents.table.headerHeight,
    cursor: 'pointer',
    userSelect: 'none' as const,
  },
  headerCellNonSortable: {
    cursor: 'default',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    borderBottom: `1px solid ${colors.border.light}`,
  },
  stripedRow: {
    backgroundColor: colors.neutral[50],
  },
  selectedRow: {
    backgroundColor: colors.primary.light,
  },
  hoveredRow: {
    backgroundColor: colors.neutral[100],
  },
  cell: {
    padding: webComponents.table.cellPadding,
    height: webComponents.table.rowHeight,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  checkboxCell: {
    width: 48,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  actionsCell: {
    width: 100,
    textAlign: 'right' as const,
  },
  checkbox: {
    cursor: 'pointer',
  },
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowPress,
  sort,
  onSort,
  loading = false,
  emptyState,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  stickyHeader = true,
  striped = false,
  rowActions,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  // Handle sort click
  const handleSort = useCallback((column: Column<T>) => {
    if (!column.sortable || !onSort) return;

    const key = String(column.key);
    const newDirection = sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  }, [sort, onSort]);

  // Handle row selection
  const handleSelectRow = useCallback((key: string, selected: boolean) => {
    if (!onSelectionChange) return;

    if (selected) {
      onSelectionChange([...selectedKeys, key]);
    } else {
      onSelectionChange(selectedKeys.filter(k => k !== key));
    }
  }, [selectedKeys, onSelectionChange]);

  // Handle select all
  const handleSelectAll = useCallback((selected: boolean) => {
    if (!onSelectionChange) return;

    if (selected) {
      onSelectionChange(data.map((item, index) => keyExtractor(item, index)));
    } else {
      onSelectionChange([]);
    }
  }, [data, keyExtractor, onSelectionChange]);

  // Get cell value
  const getCellValue = (item: T, column: Column<T>, index: number): React.ReactNode => {
    const key = column.key as keyof T;
    const value = item[key];

    if (column.render) {
      return column.render(value, item, index);
    }

    if (value === null || value === undefined) {
      return '-';
    }

    return String(value);
  };

  // Only render on web
  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>DataTable is only available on web</Text>
      </View>
    );
  }

  // Loading state
  if (loading && data.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  // Empty state
  if (!loading && data.length === 0) {
    if (emptyState) {
      return (
        <EmptyState
          icon={(emptyState.icon || 'inbox') as any}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action ? {
            label: emptyState.action.label,
            onPress: emptyState.action.onPress,
          } : undefined}
        />
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const allSelected = data.length > 0 && selectedKeys.length === data.length;
  const someSelected = selectedKeys.length > 0 && selectedKeys.length < data.length;

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {/* @ts-ignore - Web table element */}
        <table style={baseWebStyles.table}>
          {/* Header */}
          <thead>
            {/* @ts-ignore */}
            <tr style={stickyHeader ? baseWebStyles.headerRow : { backgroundColor: colors.neutral[50] }}>
              {/* Selection checkbox */}
              {selectable && (
                // @ts-ignore
                <th style={mergeWebStyles(baseWebStyles.headerCell, baseWebStyles.checkboxCell)}>
                  <Pressable
                    style={styles.checkbox}
                    onPress={() => handleSelectAll(!allSelected)}
                  >
                    <Icon
                      name={allSelected ? 'check-square' : someSelected ? 'minus-square' : 'square'}
                      size={18}
                      color={allSelected || someSelected ? colors.primary.DEFAULT : colors.neutral[500]}
                    />
                  </Pressable>
                </th>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                // @ts-ignore
                <th
                  key={String(column.key)}
                  style={mergeWebStyles(
                    baseWebStyles.headerCell,
                    !column.sortable && baseWebStyles.headerCellNonSortable,
                    {
                      width: column.width,
                      minWidth: column.minWidth,
                      textAlign: column.align || 'left',
                    }
                  )}
                  onClick={() => handleSort(column)}
                >
                  <View style={styles.headerContent}>
                    <Text style={styles.headerText}>{column.header}</Text>
                    {column.sortable && (
                      <View style={styles.sortIcon}>
                        {sort?.key === String(column.key) ? (
                          <Icon
                            name={sort.direction === 'asc' ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.primary.DEFAULT}
                          />
                        ) : (
                          <Icon
                            name="chevrons-up-down"
                            size={14}
                            color={colors.neutral[500]}
                          />
                        )}
                      </View>
                    )}
                  </View>
                </th>
              ))}

              {/* Actions column */}
              {rowActions && (
                // @ts-ignore
                <th style={mergeWebStyles(baseWebStyles.headerCell, baseWebStyles.actionsCell)}>
                  <Text style={styles.headerText}>Actions</Text>
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {data.map((item, index) => {
              const key = keyExtractor(item, index);
              const isSelected = selectedKeys.includes(key);
              const isHovered = hoveredRow === key;

              return (
                // @ts-ignore
                <tr
                  key={key}
                  style={mergeWebStyles(
                    baseWebStyles.row,
                    striped && index % 2 === 1 && baseWebStyles.stripedRow,
                    isSelected && baseWebStyles.selectedRow,
                    isHovered && baseWebStyles.hoveredRow
                  )}
                  onMouseEnter={() => setHoveredRow(key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => onRowPress?.(item)}
                >
                  {/* Selection checkbox */}
                  {selectable && (
                    // @ts-ignore
                    <td
                      style={mergeWebStyles(baseWebStyles.cell, baseWebStyles.checkboxCell)}
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleSelectRow(key, !isSelected);
                      }}
                    >
                      <Pressable style={styles.checkbox}>
                        <Icon
                          name={isSelected ? 'check-square' : 'square'}
                          size={18}
                          color={isSelected ? colors.primary.DEFAULT : colors.neutral[500]}
                        />
                      </Pressable>
                    </td>
                  )}

                  {/* Data cells */}
                  {columns.map((column) => (
                    // @ts-ignore
                    <td
                      key={String(column.key)}
                      style={mergeWebStyles(
                        baseWebStyles.cell,
                        { textAlign: column.align || 'left' }
                      )}
                    >
                      <Text style={styles.cellText} numberOfLines={1}>
                        {getCellValue(item, column, index)}
                      </Text>
                    </td>
                  ))}

                  {/* Actions cell */}
                  {rowActions && (
                    // @ts-ignore
                    <td
                      style={mergeWebStyles(baseWebStyles.cell, baseWebStyles.actionsCell)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <View style={styles.actionsContainer}>
                        {rowActions(item).map((action, actionIndex) => (
                          <Pressable
                            key={actionIndex}
                            style={styles.actionButton}
                            onPress={action.onPress}
                          >
                            <Icon
                              name={action.icon as any}
                              size={16}
                              color={action.variant === 'danger' ? colors.danger : colors.text.secondary}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollView>

      {/* Loading overlay */}
      {loading && data.length > 0 && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  fallback: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  fallbackText: {
    color: colors.text.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: fontSize.body,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortIcon: {
    marginLeft: spacing.xs,
  },
  cellText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default DataTable;
