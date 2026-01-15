/**
 * DataTable Types
 */

import type { ReactNode } from 'react';

/**
 * Column definition for DataTable
 */
export interface Column<T> {
  /** Unique key for the column */
  key: keyof T | string;
  /** Header text */
  header: string;
  /** Column width (number = pixels, string = CSS value) */
  width?: number | string;
  /** Whether column is sortable */
  sortable?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom render function */
  render?: (value: unknown, row: T, index: number) => ReactNode;
  /** Minimum width */
  minWidth?: number;
  /** Whether to hide on smaller screens */
  hideOnMobile?: boolean;
}

/**
 * Sort state
 */
export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * DataTable props
 */
export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Data rows */
  data: T[];
  /** Key extractor for rows */
  keyExtractor: (item: T, index: number) => string;
  /** Callback when row is clicked */
  onRowPress?: (item: T) => void;
  /** Current sort state */
  sort?: SortState;
  /** Callback when sort changes */
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  /** Whether data is loading */
  loading?: boolean;
  /** Empty state configuration */
  emptyState?: EmptyStateConfig;
  /** Whether rows are selectable */
  selectable?: boolean;
  /** Currently selected row keys */
  selectedKeys?: string[];
  /** Callback when selection changes */
  onSelectionChange?: (keys: string[]) => void;
  /** Whether to show sticky header */
  stickyHeader?: boolean;
  /** Whether to show zebra striping */
  striped?: boolean;
  /** Row actions renderer */
  rowActions?: (item: T) => Array<{
    icon: string;
    label: string;
    onPress: () => void;
    variant?: 'default' | 'danger';
  }>;
}
