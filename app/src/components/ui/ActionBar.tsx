/**
 * ActionBar - Search, filter, and action toolbar
 * Adapts layout based on screen size
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, webComponents } from '../../constants/theme';
import { Icon } from './Icon';
import { useAdaptiveLayout } from '../../hooks/useResponsive';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multi-select';
  options: Array<{ label: string; value: string }>;
}

export interface ActionBarProps {
  /** Search configuration */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Filter configurations */
  filters?: FilterConfig[];
  /** Active filter values */
  activeFilters?: Record<string, string | string[]>;
  /** Callback when filter changes */
  onFilterChange?: (key: string, value: string | string[] | null) => void;
  /** Callback to clear all filters */
  onClearFilters?: () => void;
  /** Action buttons */
  actions?: React.ReactNode;
  /** Bulk action configuration */
  bulkActions?: {
    selectedCount: number;
    actions: Array<{
      icon: string;
      label: string;
      onPress: () => void;
      variant?: 'default' | 'danger';
    }>;
    onClearSelection: () => void;
  };
}

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  container: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 5,
  },
  searchInput: {
    outline: 'none',
  },
} : {};

export function ActionBar({
  search,
  filters,
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  actions,
  bulkActions,
}: ActionBarProps) {
  const { layoutMode, showTable } = useAdaptiveLayout();
  const [searchFocused, setSearchFocused] = useState(false);

  // Count active filters
  const activeFilterCount = Object.values(activeFilters).filter(
    v => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  // Show bulk actions bar if items are selected
  if (bulkActions && bulkActions.selectedCount > 0) {
    return (
      <View style={[styles.container, styles.bulkContainer]}>
        <View style={styles.bulkInfo}>
          <Text style={styles.bulkText}>
            {bulkActions.selectedCount} selected
          </Text>
          <Pressable
            style={styles.clearButton}
            onPress={bulkActions.onClearSelection}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>
        <View style={styles.bulkActions}>
          {bulkActions.actions.map((action, index) => (
            <Pressable
              key={index}
              style={[
                styles.bulkActionButton,
                action.variant === 'danger' && styles.bulkActionDanger,
              ]}
              onPress={action.onPress}
            >
              <Icon
                name={action.icon as any}
                size={16}
                color={action.variant === 'danger' ? colors.danger : colors.text.primary}
              />
              <Text
                style={[
                  styles.bulkActionText,
                  action.variant === 'danger' && styles.bulkActionTextDanger,
                ]}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        showTable && webStyles.container as any,
      ]}
    >
      <View style={styles.leftSection}>
        {/* Search input */}
        {search && (
          <View
            style={[
              styles.searchContainer,
              searchFocused && styles.searchContainerFocused,
            ]}
          >
            <Icon
              name="search"
              size={18}
              color={searchFocused ? colors.primary.DEFAULT : colors.text.tertiary}
            />
            <TextInput
              style={[styles.searchInput, webStyles.searchInput as any]}
              value={search.value}
              onChangeText={search.onChange}
              placeholder={search.placeholder || 'Search...'}
              placeholderTextColor={colors.text.tertiary}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search.value.length > 0 && (
              <Pressable
                style={styles.clearSearchButton}
                onPress={() => search.onChange('')}
              >
                <Icon name="x" size={14} color={colors.text.tertiary} />
              </Pressable>
            )}
          </View>
        )}

        {/* Filters */}
        {filters && filters.length > 0 && (
          <View style={styles.filtersContainer}>
            {filters.map((filter) => {
              const isActive = activeFilters[filter.key] !== undefined &&
                (Array.isArray(activeFilters[filter.key])
                  ? (activeFilters[filter.key] as string[]).length > 0
                  : activeFilters[filter.key] !== '');

              return (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterButton,
                    isActive && styles.filterButtonActive,
                  ]}
                  onPress={() => {
                    // TODO: Show filter dropdown
                  }}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      isActive && styles.filterButtonTextActive,
                    ]}
                  >
                    {filter.label}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={14}
                    color={isActive ? colors.primary.DEFAULT : colors.text.secondary}
                  />
                </Pressable>
              );
            })}

            {/* Clear filters button */}
            {activeFilterCount > 0 && onClearFilters && (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={onClearFilters}
              >
                <Icon name="x" size={14} color={colors.text.secondary} />
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* Right section - Actions */}
      {actions && (
        <View style={styles.rightSection}>
          {actions}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    minHeight: webComponents.actionBar.height,
    gap: spacing.md,
  },
  bulkContainer: {
    backgroundColor: colors.primary.light,
    borderBottomColor: colors.primary.DEFAULT,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    minWidth: 200,
    maxWidth: 300,
    gap: spacing.xs,
  },
  searchContainerFocused: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    height: '100%',
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.light,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  filterButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.primary.DEFAULT,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  clearFiltersText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  bulkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulkText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  clearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  bulkActionDanger: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  bulkActionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  bulkActionTextDanger: {
    color: colors.danger,
  },
});

export default ActionBar;
