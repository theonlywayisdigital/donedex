/**
 * ActionBar - Search, filter, and action toolbar
 * Adapts layout based on screen size
 */

import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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

interface FilterDropdownProps {
  filter: FilterConfig;
  activeValue: string | string[] | undefined;
  onSelect: (value: string | string[] | null) => void;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
}

function FilterDropdown({ filter, activeValue, onSelect, onClose, anchorPosition }: FilterDropdownProps) {
  const isMultiSelect = filter.type === 'multi-select';
  const selectedValues = Array.isArray(activeValue)
    ? activeValue
    : activeValue
    ? [activeValue]
    : [];

  const handleOptionPress = (optionValue: string) => {
    if (isMultiSelect) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter(v => v !== optionValue)
        : [...selectedValues, optionValue];
      onSelect(newValues.length > 0 ? newValues : null);
    } else {
      onSelect(optionValue === activeValue ? null : optionValue);
      onClose();
    }
  };

  const screenWidth = Dimensions.get('window').width;
  const dropdownWidth = Math.min(250, screenWidth - 32);

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.dropdownOverlay} onPress={onClose}>
        <View
          style={[
            styles.dropdownContainer,
            { width: dropdownWidth },
            anchorPosition && {
              position: 'absolute',
              top: anchorPosition.y,
              left: Math.min(anchorPosition.x, screenWidth - dropdownWidth - 16),
            },
          ]}
        >
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>{filter.label}</Text>
            {selectedValues.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  onSelect(null);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Clear ${filter.label} filter`}
              >
                <Text style={styles.dropdownClearText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView style={styles.dropdownScroll} bounces={false}>
            {filter.options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.dropdownOption,
                    isSelected && styles.dropdownOptionSelected,
                  ]}
                  onPress={() => handleOptionPress(option.value)}
                  accessibilityRole={isMultiSelect ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={option.label}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      isSelected && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {isSelected && (
                    <Icon name="check" size={16} color={colors.primary.DEFAULT} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {isMultiSelect && selectedValues.length > 0 && (
            <View style={styles.dropdownFooter}>
              <TouchableOpacity
                style={styles.dropdownApplyButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
              >
                <Text style={styles.dropdownApplyText}>
                  Apply ({selectedValues.length})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

export function ActionBar({
  search,
  filters,
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  actions,
  bulkActions,
}: ActionBarProps) {
  const { showTable } = useAdaptiveLayout();
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number } | undefined>();
  const filterRefs = useRef<Record<string, View | null>>({});

  // Count active filters
  const activeFilterCount = Object.values(activeFilters).filter(
    v => v !== null && v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  const handleFilterPress = (filterKey: string) => {
    const ref = filterRefs.current[filterKey];
    if (ref) {
      ref.measure((_x, _y, _width, height, pageX, pageY) => {
        setDropdownPosition({ x: pageX, y: pageY + height + 4 });
        setActiveDropdown(filterKey);
      });
    } else {
      setActiveDropdown(filterKey);
    }
  };

  const handleFilterChange = (key: string, value: string | string[] | null) => {
    onFilterChange?.(key, value);
  };

  // Show bulk actions bar if items are selected
  if (bulkActions && bulkActions.selectedCount > 0) {
    return (
      <View
        style={[styles.container, styles.bulkContainer]}
        accessibilityRole="toolbar"
        accessibilityLabel={`Bulk actions for ${bulkActions.selectedCount} selected items`}
      >
        <View style={styles.bulkInfo}>
          <Text style={styles.bulkText} accessibilityRole="text">
            {bulkActions.selectedCount} selected
          </Text>
          <Pressable
            style={styles.clearButton}
            onPress={bulkActions.onClearSelection}
            accessibilityRole="button"
            accessibilityLabel="Clear selection"
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
              accessibilityRole="button"
              accessibilityLabel={action.label}
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

  const activeFilter = activeDropdown
    ? filters?.find(f => f.key === activeDropdown)
    : null;

  return (
    <View
      style={[
        styles.container,
        showTable && webStyles.container as any,
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel="Search and filter toolbar"
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
              accessibilityLabel={search.placeholder || 'Search'}
              accessibilityHint="Enter search terms to filter results"
            />
            {search.value.length > 0 && (
              <Pressable
                style={styles.clearSearchButton}
                onPress={() => search.onChange('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
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
              const currentValue = activeFilters[filter.key];
              const isActive = currentValue !== undefined &&
                (Array.isArray(currentValue)
                  ? currentValue.length > 0
                  : currentValue !== '');

              // Get label for active filter value
              let displayLabel = filter.label;
              if (isActive && !Array.isArray(currentValue)) {
                const selectedOption = filter.options.find(o => o.value === currentValue);
                if (selectedOption) {
                  displayLabel = selectedOption.label;
                }
              } else if (isActive && Array.isArray(currentValue) && currentValue.length > 0) {
                displayLabel = `${filter.label} (${currentValue.length})`;
              }

              return (
                <View
                  key={filter.key}
                  ref={(ref) => { filterRefs.current[filter.key] = ref; }}
                  collapsable={false}
                >
                  <Pressable
                    style={[
                      styles.filterButton,
                      isActive && styles.filterButtonActive,
                    ]}
                    onPress={() => handleFilterPress(filter.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${filter.label} filter${isActive ? ', active' : ''}`}
                    accessibilityHint="Opens filter options"
                    accessibilityState={{ expanded: activeDropdown === filter.key }}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        isActive && styles.filterButtonTextActive,
                      ]}
                    >
                      {displayLabel}
                    </Text>
                    <Icon
                      name="chevron-down"
                      size={14}
                      color={isActive ? colors.primary.DEFAULT : colors.text.secondary}
                    />
                  </Pressable>
                </View>
              );
            })}

            {/* Clear filters button */}
            {activeFilterCount > 0 && onClearFilters && (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={onClearFilters}
                accessibilityRole="button"
                accessibilityLabel="Clear all filters"
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

      {/* Filter Dropdown */}
      {activeFilter && (
        <FilterDropdown
          filter={activeFilter}
          activeValue={activeFilters[activeFilter.key]}
          onSelect={(value) => handleFilterChange(activeFilter.key, value)}
          onClose={() => setActiveDropdown(null)}
          anchorPosition={dropdownPosition}
        />
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
    backgroundColor: '#EDF7F9',
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
    fontWeight: fontWeight.bold,
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
  // Dropdown styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 300,
    marginTop: 60,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  dropdownTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  dropdownClearText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownOptionSelected: {
    backgroundColor: colors.primary.light,
  },
  dropdownOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  dropdownOptionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  dropdownFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    padding: spacing.sm,
  },
  dropdownApplyButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  dropdownApplyText: {
    color: colors.white,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
});

export default ActionBar;
