import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { ItemEditor } from './ItemEditor';
import { ItemType, PhotoRule, DatetimeMode, ConditionOperator } from '../../services/templates';
import { Icon, DragHandle, NestableDraggableList } from '../ui';

interface LocalItem {
  id: string;
  label: string;
  item_type: ItemType;
  is_required: boolean;
  photo_rule: PhotoRule;
  options: string[] | null;
  sort_order: number;
  isNew?: boolean;
  // New fields for enhanced items
  help_text?: string | null;
  placeholder_text?: string | null;
  default_value?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  datetime_mode?: DatetimeMode | null;
  rating_max?: number | null;
  declaration_text?: string | null;
  signature_requires_name?: boolean | null;
  condition_field_id?: string | null;
  condition_operator?: ConditionOperator | null;
  condition_value?: string | null;
}

interface LocalSection {
  id: string;
  name: string;
  sort_order: number;
  items: LocalItem[];
  isNew?: boolean;
}

interface SectionInfo {
  id: string;
  name: string;
}

interface SectionEditorProps {
  section: LocalSection;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateSection: (updates: Partial<LocalSection>) => void;
  onDeleteSection: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, updates: Partial<LocalItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  onDuplicateItem?: (itemId: string) => void;
  onReorderItems?: (items: LocalItem[]) => void;
  onMoveItemToSection?: (itemId: string, targetSectionId: string) => void;
  allSections?: SectionInfo[];
  // Actions sheet
  onShowActions?: () => void;
  // Drag-drop props
  drag?: () => void;
  isActive?: boolean;
}

export function SectionEditor({
  section,
  isExpanded,
  onToggleExpand,
  onUpdateSection,
  onDeleteSection,
  onMoveUp,
  onMoveDown,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onDuplicateItem,
  onReorderItems,
  onMoveItemToSection,
  allSections = [],
  onShowActions,
  drag,
  isActive,
}: SectionEditorProps) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  return (
    <View style={[
      styles.container,
      isMobile && styles.containerMobile,
      isActive && styles.containerActive,
    ]}>
      {/* Section Header */}
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        {drag && <DragHandle drag={drag} isActive={isActive || false} />}
        <TouchableOpacity style={styles.headerMain} onPress={onToggleExpand}>
          <View style={styles.headerLeft}>
            <Icon
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={isMobile ? 18 : 16}
              color={isMobile ? colors.primary.DEFAULT : colors.text.secondary}
            />
            <TextInput
              style={[styles.sectionNameInput, isMobile && styles.sectionNameInputMobile]}
              value={section.name}
              onChangeText={(text) => onUpdateSection({ name: text })}
              placeholder="Section name"
              placeholderTextColor={colors.text.tertiary}
              onFocus={(e) => e.stopPropagation()}
            />
          </View>
          <View style={styles.headerActions}>
            {isMobile ? (
              <View style={styles.itemCountBadgeMobile}>
                <Text style={styles.itemCountBadgeTextMobile}>
                  {section.items.length}
                </Text>
              </View>
            ) : (
              <Text style={styles.itemCount}>
                {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {onShowActions && (
          <TouchableOpacity style={styles.actionButton} onPress={onShowActions}>
            <Icon name="more-horizontal" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={onDeleteSection}>
          <Icon name="x" size={20} color={colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Section Content */}
      {isExpanded && (
        <View style={styles.content}>
          {section.items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyItemsText}>
                No items in this section. Add items to define what to inspect.
              </Text>
            </View>
          ) : (
            <NestableDraggableList
              data={section.items}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => {
                if (onReorderItems) {
                  const reordered = data.map((item, idx) => ({
                    ...item,
                    sort_order: idx,
                  }));
                  onReorderItems(reordered);
                }
              }}
              scrollEnabled={false}
              renderItem={({ item, index, drag: itemDrag, isActive: itemIsActive }) => {
                // Get items that appear BEFORE this one for conditional visibility
                const availableConditionFields = section.items
                  .slice(0, index)
                  .map((i) => ({
                    id: i.id,
                    label: i.label,
                    item_type: i.item_type,
                  }));

                return (
                  <ItemEditor
                    item={item}
                    onUpdate={(updates) => onUpdateItem(item.id, updates)}
                    onDelete={() => onDeleteItem(item.id)}
                    onMoveUp={index > 0 ? () => onMoveItem(item.id, 'up') : undefined}
                    onMoveDown={
                      index < section.items.length - 1
                        ? () => onMoveItem(item.id, 'down')
                        : undefined
                    }
                    onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id) : undefined}
                    availableConditionFields={availableConditionFields}
                    drag={itemDrag}
                    isActive={itemIsActive}
                    allSections={allSections}
                    currentSectionId={section.id}
                    onMoveToSection={onMoveItemToSection ? (targetSectionId) => onMoveItemToSection(item.id, targetSectionId) : undefined}
                  />
                );
              }}
            />
          )}

          <TouchableOpacity style={styles.addItemButton} onPress={onAddItem}>
            <Text style={styles.addItemButtonText}>+ Add Item</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  containerActive: {
    borderColor: colors.primary.DEFAULT,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
    minHeight: 56,
    backgroundColor: colors.neutral[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandIconContainer: {
    marginRight: spacing.sm,
    width: 16,
  },
  sectionNameInput: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    padding: 0,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemCount: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  actionButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  content: {
    padding: spacing.md,
  },
  emptyItems: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyItemsText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  addItemButton: {
    minHeight: 48, // Minimum touch target
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  addItemButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  // ==================== MOBILE STYLES ====================
  containerMobile: {
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  headerMobile: {
    backgroundColor: colors.primary.light,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.DEFAULT,
    minHeight: 60,
  },
  sectionNameInputMobile: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    marginLeft: spacing.sm,
  },
  itemCountBadgeMobile: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    minWidth: 28,
    alignItems: 'center',
  },
  itemCountBadgeTextMobile: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
