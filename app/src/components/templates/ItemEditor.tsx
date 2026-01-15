import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { ItemType, PhotoRule, DatetimeMode, ConditionOperator, RatingStyle, UnitType, InstructionStyle, SubItem } from '../../services/templates';
import { FIELD_TYPE_CONFIG, UNIT_PRESETS } from '../../constants/fieldTypes';
import { FieldTypeCategoryPicker, FieldTypeCategory, FIELD_TYPE_CATEGORIES_V2 } from './FieldTypeCategoryPicker';
import { FieldTypeListPicker } from './FieldTypeListPicker';
import { FieldTypeMiniPreview } from './FieldTypeMiniPreview';
import { Icon, ProBadge, DragHandle } from '../ui';
import { useBillingStore } from '../../store/billingStore';

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
  // Extended field type properties
  step_value?: number | null;
  rating_style?: RatingStyle | null;
  unit_type?: UnitType | null;
  unit_options?: string[] | null;
  default_unit?: string | null;
  counter_min?: number | null;
  counter_max?: number | null;
  counter_step?: number | null;
  max_media_count?: number | null;
  media_required?: boolean | null;
  max_duration_seconds?: number | null;
  warning_days_before?: number | null;
  sub_items?: SubItem[] | null;
  min_entries?: number | null;
  max_entries?: number | null;
  instruction_image_url?: string | null;
  instruction_style?: InstructionStyle | null;
  asset_types?: string[] | null;
}

interface Section {
  id: string;
  name: string;
}

interface ItemEditorProps {
  item: LocalItem;
  onUpdate: (updates: Partial<LocalItem>) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDuplicate?: () => void;
  // For conditional visibility - items that appear before this one
  availableConditionFields?: { id: string; label: string; item_type: ItemType }[];
  // Drag-drop props
  drag?: () => void;
  isActive?: boolean;
  // Move to section props
  allSections?: Section[];
  currentSectionId?: string;
  onMoveToSection?: (sectionId: string) => void;
}

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'not_empty', label: 'has a value' },
];

const DATETIME_MODES: { value: DatetimeMode; label: string }[] = [
  { value: 'date', label: 'Date only' },
  { value: 'time', label: 'Time only' },
  { value: 'datetime', label: 'Date & Time' },
];

const PHOTO_RULES: { value: PhotoRule; label: string; description: string }[] = [
  { value: 'never', label: 'Never', description: 'No photo option' },
  { value: 'on_fail', label: 'On Issue', description: 'Show photo option when issue detected' },
  { value: 'always', label: 'Always', description: 'Always show photo option' },
];

export function ItemEditor({
  item,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  availableConditionFields = [],
  drag,
  isActive,
  allSections = [],
  currentSectionId,
  onMoveToSection,
}: ItemEditorProps) {
  // Billing check for Pro features
  const { isOnFreePlan } = useBillingStore();
  const isPro = !isOnFreePlan();

  // Two-tier field type picker state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FieldTypeCategory | null>(null);

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConditionFieldModal, setShowConditionFieldModal] = useState(false);
  const [showConditionOperatorModal, setShowConditionOperatorModal] = useState(false);
  const [optionsText, setOptionsText] = useState(item.options?.join('\n') || '');
  const [showCustomOptionsModal, setShowCustomOptionsModal] = useState(false);
  const [customOptionsText, setCustomOptionsText] = useState(item.options?.join('\n') || '');
  const [showMoveToSectionModal, setShowMoveToSectionModal] = useState(false);

  // Find the selected condition field
  const selectedConditionField = availableConditionFields.find(
    (f) => f.id === item.condition_field_id
  );
  const selectedConditionOperator = CONDITION_OPERATORS.find(
    (o) => o.value === item.condition_operator
  );

  // Get possible values for the condition field
  const getConditionFieldValues = (fieldType: ItemType): string[] => {
    switch (fieldType) {
      case 'pass_fail':
        return ['pass', 'fail'];
      case 'yes_no':
        return ['yes', 'no'];
      case 'condition':
        return ['good', 'fair', 'poor'];
      case 'severity':
        return ['low', 'medium', 'high'];
      default:
        return [];
    }
  };

  const conditionFieldValues = selectedConditionField
    ? getConditionFieldValues(selectedConditionField.item_type)
    : [];

  const hasCondition = !!item.condition_field_id;

  // Get selected type config from FIELD_TYPE_CONFIG
  const selectedTypeConfig = FIELD_TYPE_CONFIG[item.item_type];
  const selectedPhotoRule = PHOTO_RULES.find((r) => r.value === item.photo_rule);
  const selectedDatetimeMode = DATETIME_MODES.find((m) => m.value === item.datetime_mode);

  // Handlers for two-tier picker
  const handleCategorySelect = (category: FieldTypeCategory) => {
    setSelectedCategory(category);
    setShowCategoryPicker(false);
    setShowTypePicker(true);
  };

  const handleTypeSelect = (type: ItemType) => {
    onUpdate({
      item_type: type,
      // Reset photo_rule if switching to photo/media types
      photo_rule: ['photo', 'photo_before_after', 'video', 'audio', 'annotated_photo'].includes(type)
        ? 'always'
        : item.photo_rule,
      // Reset options if not a select type
      options: type === 'select' || type === 'multi_select' || type === 'checklist'
        ? item.options
        : null,
    });
    setShowTypePicker(false);
    setSelectedCategory(null);
  };

  const handleCloseTypePicker = () => {
    setShowTypePicker(false);
    setSelectedCategory(null);
  };

  const handleBackToCategories = () => {
    setShowTypePicker(false);
    setShowCategoryPicker(true);
  };

  const needsOptions = item.item_type === 'select' || item.item_type === 'multi_select';
  const needsDatetimeConfig = item.item_type === 'datetime';
  const needsRatingConfig = item.item_type === 'rating';
  const needsNumericRatingConfig = item.item_type === 'rating_numeric';
  const needsSliderConfig = item.item_type === 'slider';
  const needsChecklistConfig = item.item_type === 'checklist';
  const needsSignatureConfig = item.item_type === 'signature';
  const needsDeclarationConfig = item.item_type === 'declaration';
  const needsNumberConfig = item.item_type === 'number';
  const needsConditionSeverityConfig = item.item_type === 'condition' || item.item_type === 'severity';
  const showPhotoRuleOption = !['photo', 'signature', 'declaration'].includes(item.item_type);

  // Count configured advanced options
  const advancedOptionsCount = [
    item.help_text,
    item.placeholder_text,
    item.default_value,
    item.min_value !== null && item.min_value !== undefined,
    item.max_value !== null && item.max_value !== undefined,
    item.condition_field_id,
  ].filter(Boolean).length;

  const handleSaveOptions = () => {
    const options = optionsText
      .split('\n')
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
    onUpdate({ options: options.length > 0 ? options : null });
    setShowOptionsModal(false);
  };

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      <View style={styles.row}>
        {/* Drag Handle */}
        {drag && <DragHandle drag={drag} isActive={isActive || false} />}

        {/* Item Label */}
        <TextInput
          style={styles.labelInput}
          value={item.label}
          onChangeText={(text) => onUpdate({ label: text })}
          placeholder="Item label (e.g., Fire exits clear)"
          placeholderTextColor={colors.text.tertiary}
        />

        {/* Move/Delete Actions */}
        <View style={styles.actions}>
          {onMoveUp && (
            <TouchableOpacity style={styles.actionButton} onPress={onMoveUp}>
              <Icon name="chevron-up" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          {onMoveDown && (
            <TouchableOpacity style={styles.actionButton} onPress={onMoveDown}>
              <Icon name="chevron-down" size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          {onDuplicate && (
            <TouchableOpacity style={styles.actionButton} onPress={onDuplicate}>
              <Icon name="copy" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          {onMoveToSection && allSections.filter(s => s.id !== currentSectionId).length > 0 && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowMoveToSectionModal(true)}
            >
              <Icon name="folder" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
            <Icon name="x" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.row}>
        {/* Field Type with Mini Preview */}
        <TouchableOpacity
          style={styles.typeSelectButton}
          onPress={() => setShowCategoryPicker(true)}
        >
          <View style={styles.miniPreviewInButton}>
            <FieldTypeMiniPreview type={item.item_type} size={32} />
          </View>
          <View style={styles.typeSelectInfo}>
            <Text style={styles.selectLabel}>Type</Text>
            <Text style={styles.selectValue}>{selectedTypeConfig?.label || 'Select'}</Text>
          </View>
        </TouchableOpacity>

        {/* Photo Rule */}
        {showPhotoRuleOption && (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowPhotoModal(true)}
          >
            <Text style={styles.selectLabel}>Photo</Text>
            <Text style={styles.selectValue}>{selectedPhotoRule?.label || 'Never'}</Text>
          </TouchableOpacity>
        )}

        {/* Required Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Required</Text>
          <Switch
            value={item.is_required}
            onValueChange={(value) => onUpdate({ is_required: value })}
            trackColor={{ false: colors.neutral[200], true: colors.primary.light }}
            thumbColor={item.is_required ? colors.primary.DEFAULT : colors.neutral[300]}
          />
        </View>
      </View>

      {/* Options button for select types */}
      {needsOptions && (
        <TouchableOpacity
          style={styles.optionsButton}
          onPress={() => {
            setOptionsText(item.options?.join('\n') || '');
            setShowOptionsModal(true);
          }}
        >
          <Text style={styles.optionsButtonText}>
            {item.options && item.options.length > 0
              ? `${item.options.length} options configured`
              : 'Configure options...'}
          </Text>
        </TouchableOpacity>
      )}

      {/* DateTime mode selector */}
      {needsDatetimeConfig && (
        <View style={styles.typeConfigRow}>
          <Text style={styles.typeConfigLabel}>Mode:</Text>
          <View style={styles.typeConfigOptions}>
            {DATETIME_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.typeConfigChip,
                  item.datetime_mode === mode.value && styles.typeConfigChipSelected,
                ]}
                onPress={() => onUpdate({ datetime_mode: mode.value })}
              >
                <Text
                  style={[
                    styles.typeConfigChipText,
                    item.datetime_mode === mode.value && styles.typeConfigChipTextSelected,
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Rating max selector */}
      {needsRatingConfig && (
        <View style={styles.typeConfigRow}>
          <Text style={styles.typeConfigLabel}>Max stars:</Text>
          <View style={styles.typeConfigOptions}>
            {[3, 4, 5, 10].map((max) => (
              <TouchableOpacity
                key={max}
                style={[
                  styles.typeConfigChip,
                  (item.rating_max || 5) === max && styles.typeConfigChipSelected,
                ]}
                onPress={() => onUpdate({ rating_max: max })}
              >
                <Text
                  style={[
                    styles.typeConfigChipText,
                    (item.rating_max || 5) === max && styles.typeConfigChipTextSelected,
                  ]}
                >
                  {max}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Signature config */}
      {needsSignatureConfig && (
        <View style={styles.typeConfigRow}>
          <Text style={styles.typeConfigLabel}>Require name:</Text>
          <Switch
            value={item.signature_requires_name || false}
            onValueChange={(value) => onUpdate({ signature_requires_name: value })}
            trackColor={{ false: colors.neutral[200], true: colors.primary.light }}
            thumbColor={item.signature_requires_name ? colors.primary.DEFAULT : colors.neutral[300]}
          />
        </View>
      )}

      {/* Declaration text config */}
      {needsDeclarationConfig && (
        <View style={styles.typeConfigContainer}>
          <Text style={styles.typeConfigLabel}>Declaration text:</Text>
          <TextInput
            style={styles.declarationInput}
            value={item.declaration_text || ''}
            onChangeText={(text) => onUpdate({ declaration_text: text })}
            placeholder="Enter the declaration text that users must acknowledge..."
            placeholderTextColor={colors.text.tertiary}
            multiline
          />
        </View>
      )}

      {/* Numeric Rating max config */}
      {needsNumericRatingConfig && (
        <View style={styles.typeConfigRow}>
          <Text style={styles.typeConfigLabel}>Max value:</Text>
          <View style={styles.typeConfigOptions}>
            {[5, 10, 100].map((max) => (
              <TouchableOpacity
                key={max}
                style={[
                  styles.typeConfigChip,
                  (item.max_value || 10) === max && styles.typeConfigChipSelected,
                ]}
                onPress={() => onUpdate({ max_value: max })}
              >
                <Text
                  style={[
                    styles.typeConfigChipText,
                    (item.max_value || 10) === max && styles.typeConfigChipTextSelected,
                  ]}
                >
                  {max}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Slider min/max config */}
      {needsSliderConfig && (
        <View style={styles.typeConfigContainer}>
          <View style={styles.sliderConfigRow}>
            <View style={styles.sliderConfigField}>
              <Text style={styles.typeConfigLabel}>Min:</Text>
              <TextInput
                style={styles.sliderInput}
                value={String(item.min_value ?? 0)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  onUpdate({ min_value: isNaN(num) ? 0 : num });
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
            <View style={styles.sliderConfigField}>
              <Text style={styles.typeConfigLabel}>Max:</Text>
              <TextInput
                style={styles.sliderInput}
                value={String(item.max_value ?? 100)}
                onChangeText={(text) => {
                  const num = parseInt(text, 10);
                  onUpdate({ max_value: isNaN(num) ? 100 : num });
                }}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>
        </View>
      )}

      {/* Checklist items config */}
      {needsChecklistConfig && (
        <View style={styles.typeConfigContainer}>
          <Text style={styles.typeConfigLabel}>Checklist items:</Text>
          <TextInput
            style={styles.declarationInput}
            value={(item.sub_items || []).map((i) => i.label).join('\n')}
            onChangeText={(text) => {
              const items = text
                .split('\n')
                .map((label, index) => ({
                  id: `checklist-item-${index}`,
                  label: label.trim(),
                  item_type: 'yes_no' as const,
                }))
                .filter((i) => i.label.length > 0);
              onUpdate({ sub_items: items.length > 0 ? items : null });
            }}
            placeholder="Enter each checklist item on a new line..."
            placeholderTextColor={colors.text.tertiary}
            multiline
          />
        </View>
      )}

      {/* Condition/Severity custom options config (Pro feature) */}
      {needsConditionSeverityConfig && (
        <View style={styles.typeConfigContainer}>
          <View style={styles.customOptionsHeader}>
            <Text style={styles.typeConfigLabel}>Custom options:</Text>
            <ProBadge />
          </View>
          {isPro ? (
            <>
              <View style={styles.typeConfigRow}>
                <Text style={styles.customOptionsDescription}>
                  {item.options && item.options.length > 0
                    ? 'Using custom options'
                    : item.item_type === 'condition'
                      ? 'Default: Good, Fair, Poor'
                      : 'Default: Low, Medium, High'}
                </Text>
                <Switch
                  value={!!(item.options && item.options.length > 0)}
                  onValueChange={(value) => {
                    if (value) {
                      // Set default custom options based on type
                      const defaultOptions = item.item_type === 'condition'
                        ? ['Excellent', 'Good', 'Fair', 'Poor', 'N/A']
                        : ['Critical', 'High', 'Medium', 'Low', 'None'];
                      setCustomOptionsText(defaultOptions.join('\n'));
                      setShowCustomOptionsModal(true);
                    } else {
                      // Clear custom options
                      onUpdate({ options: null });
                    }
                  }}
                  trackColor={{ false: colors.neutral[200], true: colors.primary.light }}
                  thumbColor={item.options && item.options.length > 0 ? colors.primary.DEFAULT : colors.neutral[300]}
                />
              </View>
              {item.options && item.options.length > 0 && (
                <TouchableOpacity
                  style={styles.optionsButton}
                  onPress={() => {
                    setCustomOptionsText(item.options?.join('\n') || '');
                    setShowCustomOptionsModal(true);
                  }}
                >
                  <Text style={styles.optionsButtonText}>
                    {`${item.options.length} custom options configured`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.proFeatureDisabled}>
              Upgrade to Pro to customize {item.item_type === 'condition' ? 'condition' : 'severity'} options
            </Text>
          )}
        </View>
      )}

      {/* Advanced options toggle */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Icon
          name={showAdvanced ? 'chevron-down' : 'chevron-right'}
          size={14}
          color={colors.text.secondary}
        />
        <Text style={styles.advancedToggleText}>
          Advanced Options
        </Text>
        {advancedOptionsCount > 0 && (
          <View style={styles.advancedBadge}>
            <Text style={styles.advancedBadgeText}>{advancedOptionsCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Advanced options panel */}
      {showAdvanced && (
        <View style={styles.advancedPanel}>
          {/* Help text */}
          <View style={styles.advancedField}>
            <Text style={styles.advancedFieldLabel}>Help text</Text>
            <TextInput
              style={styles.advancedInput}
              value={item.help_text || ''}
              onChangeText={(text) => onUpdate({ help_text: text || null })}
              placeholder="Guidance shown below field"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Placeholder text - for text/number/select */}
          {['text', 'number', 'select'].includes(item.item_type) && (
            <View style={styles.advancedField}>
              <Text style={styles.advancedFieldLabel}>Placeholder</Text>
              <TextInput
                style={styles.advancedInput}
                value={item.placeholder_text || ''}
                onChangeText={(text) => onUpdate({ placeholder_text: text || null })}
                placeholder="Hint shown in empty input"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          )}

          {/* Default value */}
          <View style={styles.advancedField}>
            <Text style={styles.advancedFieldLabel}>Default value</Text>
            <TextInput
              style={styles.advancedInput}
              value={item.default_value || ''}
              onChangeText={(text) => onUpdate({ default_value: text || null })}
              placeholder="Pre-filled value"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Min/Max for number type */}
          {needsNumberConfig && (
            <View style={styles.advancedFieldRow}>
              <View style={[styles.advancedField, { flex: 1, marginRight: spacing.xs }]}>
                <Text style={styles.advancedFieldLabel}>Min value</Text>
                <TextInput
                  style={styles.advancedInput}
                  value={item.min_value?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    onUpdate({ min_value: isNaN(num) ? null : num });
                  }}
                  placeholder="Min"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.advancedField, { flex: 1 }]}>
                <Text style={styles.advancedFieldLabel}>Max value</Text>
                <TextInput
                  style={styles.advancedInput}
                  value={item.max_value?.toString() || ''}
                  onChangeText={(text) => {
                    const num = parseFloat(text);
                    onUpdate({ max_value: isNaN(num) ? null : num });
                  }}
                  placeholder="Max"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Conditional visibility */}
          {availableConditionFields.length > 0 && (
            <View style={styles.advancedField}>
              <Text style={styles.advancedFieldLabel}>Conditional visibility</Text>
              <View style={styles.conditionBuilder}>
                <View style={styles.conditionEnableRow}>
                  <Text style={styles.conditionEnableLabel}>
                    Show only when another field has a specific value
                  </Text>
                  <Switch
                    value={hasCondition}
                    onValueChange={(value) => {
                      if (value) {
                        // Enable with first available field
                        onUpdate({
                          condition_field_id: availableConditionFields[0]?.id || null,
                          condition_operator: 'equals',
                          condition_value: null,
                        });
                      } else {
                        // Clear condition
                        onUpdate({
                          condition_field_id: null,
                          condition_operator: null,
                          condition_value: null,
                        });
                      }
                    }}
                    trackColor={{ false: colors.neutral[200], true: colors.primary.light }}
                    thumbColor={hasCondition ? colors.primary.DEFAULT : colors.neutral[300]}
                  />
                </View>

                {hasCondition && (
                  <View style={styles.conditionConfig}>
                    {/* Field selector */}
                    <TouchableOpacity
                      style={styles.conditionSelect}
                      onPress={() => setShowConditionFieldModal(true)}
                    >
                      <Text style={styles.conditionSelectLabel}>Field</Text>
                      <Text style={styles.conditionSelectValue}>
                        {selectedConditionField?.label || 'Select field'}
                      </Text>
                    </TouchableOpacity>

                    {/* Operator selector */}
                    <TouchableOpacity
                      style={styles.conditionSelect}
                      onPress={() => setShowConditionOperatorModal(true)}
                    >
                      <Text style={styles.conditionSelectLabel}>Condition</Text>
                      <Text style={styles.conditionSelectValue}>
                        {selectedConditionOperator?.label || 'Select'}
                      </Text>
                    </TouchableOpacity>

                    {/* Value selector (only for equals/not_equals) */}
                    {item.condition_operator !== 'not_empty' && conditionFieldValues.length > 0 && (
                      <View style={styles.conditionValueContainer}>
                        <Text style={styles.conditionSelectLabel}>Value</Text>
                        <View style={styles.conditionValueOptions}>
                          {conditionFieldValues.map((value) => (
                            <TouchableOpacity
                              key={value}
                              style={[
                                styles.conditionValueChip,
                                item.condition_value === value && styles.conditionValueChipSelected,
                              ]}
                              onPress={() => onUpdate({ condition_value: value })}
                            >
                              <Text
                                style={[
                                  styles.conditionValueChipText,
                                  item.condition_value === value &&
                                    styles.conditionValueChipTextSelected,
                                ]}
                              >
                                {value}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Value text input for text/number types */}
                    {item.condition_operator !== 'not_empty' &&
                      conditionFieldValues.length === 0 &&
                      selectedConditionField && (
                        <View style={styles.conditionValueContainer}>
                          <Text style={styles.conditionSelectLabel}>Value</Text>
                          <TextInput
                            style={styles.advancedInput}
                            value={item.condition_value || ''}
                            onChangeText={(text) => onUpdate({ condition_value: text || null })}
                            placeholder="Enter value"
                            placeholderTextColor={colors.text.tertiary}
                            keyboardType={
                              selectedConditionField.item_type === 'number' ? 'numeric' : 'default'
                            }
                          />
                        </View>
                      )}

                    {/* Summary */}
                    {selectedConditionField && selectedConditionOperator && (
                      <Text style={styles.conditionSummary}>
                        {item.condition_operator === 'not_empty'
                          ? `Show when "${selectedConditionField.label}" has a value`
                          : `Show when "${selectedConditionField.label}" ${selectedConditionOperator.label} "${item.condition_value || '...'}"`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Condition Field Modal */}
      <Modal visible={showConditionFieldModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConditionFieldModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Field</Text>
            <ScrollView style={styles.modalList}>
              {availableConditionFields.map((field) => (
                <TouchableOpacity
                  key={field.id}
                  style={[
                    styles.modalOption,
                    item.condition_field_id === field.id && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onUpdate({
                      condition_field_id: field.id,
                      condition_value: null, // Reset value when field changes
                    });
                    setShowConditionFieldModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionLabel,
                      item.condition_field_id === field.id && styles.modalOptionLabelSelected,
                    ]}
                  >
                    {field.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Condition Operator Modal */}
      <Modal visible={showConditionOperatorModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowConditionOperatorModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Condition</Text>
            {CONDITION_OPERATORS.map((operator) => (
              <TouchableOpacity
                key={operator.value}
                style={[
                  styles.modalOption,
                  item.condition_operator === operator.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onUpdate({
                    condition_operator: operator.value,
                    condition_value:
                      operator.value === 'not_empty' ? null : item.condition_value,
                  });
                  setShowConditionOperatorModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionLabel,
                    item.condition_operator === operator.value && styles.modalOptionLabelSelected,
                  ]}
                >
                  {operator.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Two-Tier Field Type Picker */}
      <FieldTypeCategoryPicker
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelectCategory={handleCategorySelect}
      />

      <FieldTypeListPicker
        visible={showTypePicker}
        category={selectedCategory}
        currentType={item.item_type}
        onClose={handleCloseTypePicker}
        onBack={handleBackToCategories}
        onSelectType={handleTypeSelect}
      />

      {/* Photo Rule Modal */}
      <Modal visible={showPhotoModal} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Photo Requirement</Text>
            {PHOTO_RULES.map((rule) => (
              <TouchableOpacity
                key={rule.value}
                style={[
                  styles.modalOption,
                  item.photo_rule === rule.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onUpdate({ photo_rule: rule.value });
                  setShowPhotoModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionLabel,
                    item.photo_rule === rule.value && styles.modalOptionLabelSelected,
                  ]}
                >
                  {rule.label}
                </Text>
                <Text style={styles.modalOptionDescription}>{rule.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.optionsModalContent]}>
            <Text style={styles.modalTitle}>Configure Options</Text>
            <Text style={styles.optionsHint}>Enter one option per line</Text>
            <TextInput
              style={styles.optionsInput}
              value={optionsText}
              onChangeText={setOptionsText}
              placeholder={"Option 1\nOption 2\nOption 3"}
              placeholderTextColor={colors.text.tertiary}
              multiline
              autoFocus
            />
            <View style={styles.optionsActions}>
              <TouchableOpacity
                style={styles.optionsCancelButton}
                onPress={() => setShowOptionsModal(false)}
              >
                <Text style={styles.optionsCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionsSaveButton}
                onPress={handleSaveOptions}
              >
                <Text style={styles.optionsSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Options Modal (for Condition/Severity) */}
      <Modal visible={showCustomOptionsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.optionsModalContent]}>
            <Text style={styles.modalTitle}>
              {item.item_type === 'condition' ? 'Custom Condition Options' : 'Custom Severity Options'}
            </Text>
            <Text style={styles.optionsHint}>Enter one option per line (order matters)</Text>
            <TextInput
              style={styles.optionsInput}
              value={customOptionsText}
              onChangeText={setCustomOptionsText}
              placeholder={item.item_type === 'condition'
                ? "Excellent\nGood\nFair\nPoor\nN/A"
                : "Critical\nHigh\nMedium\nLow\nNone"}
              placeholderTextColor={colors.text.tertiary}
              multiline
              autoFocus
            />
            <View style={styles.optionsActions}>
              <TouchableOpacity
                style={styles.optionsCancelButton}
                onPress={() => {
                  setShowCustomOptionsModal(false);
                  setCustomOptionsText(item.options?.join('\n') || '');
                }}
              >
                <Text style={styles.optionsCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionsSaveButton}
                onPress={() => {
                  const options = customOptionsText
                    .split('\n')
                    .map((o) => o.trim())
                    .filter((o) => o.length > 0);
                  onUpdate({ options: options.length > 0 ? options : null });
                  setShowCustomOptionsModal(false);
                }}
              >
                <Text style={styles.optionsSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Move to Section Modal */}
      <Modal visible={showMoveToSectionModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.moveSectionModalContent]}>
            <Text style={styles.modalTitle}>Move to Section</Text>
            <Text style={styles.moveSectionHint}>Select the target section</Text>
            <ScrollView style={styles.sectionList}>
              {allSections
                .filter((s) => s.id !== currentSectionId)
                .map((section) => (
                  <TouchableOpacity
                    key={section.id}
                    style={styles.sectionListItem}
                    onPress={() => {
                      if (onMoveToSection) {
                        onMoveToSection(section.id);
                      }
                      setShowMoveToSectionModal(false);
                    }}
                  >
                    <Icon name="folder" size={18} color={colors.text.secondary} />
                    <Text style={styles.sectionListItemText}>{section.name}</Text>
                    <Icon name="chevron-right" size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.moveSectionCancelButton}
              onPress={() => setShowMoveToSectionModal(false)}
            >
              <Text style={styles.moveSectionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  containerActive: {
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  labelInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48, // Minimum touch target
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  actionButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48, // Minimum touch target
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  typeSelectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 48, // Minimum touch target
    marginRight: spacing.xs,
  },
  miniPreviewInButton: {
    marginRight: spacing.sm,
  },
  typeSelectInfo: {
    flex: 1,
  },
  selectLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  selectValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48, // Minimum touch target
  },
  toggleLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  optionsButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48, // Minimum touch target
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  optionsButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalList: {
    flexGrow: 1,
  },
  modalOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48, // Minimum touch target
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: colors.primary.light,
  },
  modalOptionLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  modalOptionLabelSelected: {
    color: colors.primary.DEFAULT,
  },
  modalOptionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  categoryHeader: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
  },
  optionsModalContent: {
    maxHeight: '80%',
  },
  optionsHint: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  optionsInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  optionsActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  optionsCancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  optionsCancelText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  optionsSaveButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  optionsSaveText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  // Type-specific config styles
  typeConfigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  typeConfigContainer: {
    marginTop: spacing.xs,
  },
  typeConfigLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  typeConfigOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeConfigChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typeConfigChipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  typeConfigChipText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  typeConfigChipTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  declarationInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 80,
    marginTop: spacing.xs,
    textAlignVertical: 'top',
  },
  sliderConfigRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  sliderConfigField: {
    flex: 1,
  },
  sliderInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.body,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  // Advanced options styles
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  advancedToggleText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  advancedBadge: {
    backgroundColor: colors.primary.light,
    borderRadius: 10,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginLeft: spacing.xs,
  },
  advancedBadgeText: {
    fontSize: 10,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  advancedPanel: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    marginTop: spacing.xs,
  },
  advancedField: {
    marginBottom: spacing.sm,
  },
  advancedFieldRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  advancedFieldLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  advancedInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  // Conditional visibility styles
  conditionBuilder: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  conditionEnableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionEnableLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    flex: 1,
    marginRight: spacing.sm,
  },
  conditionConfig: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  conditionSelect: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  conditionSelectLabel: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  conditionSelectValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  conditionValueContainer: {
    marginTop: spacing.xs,
  },
  conditionValueOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  conditionValueChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  conditionValueChipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  conditionValueChipText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  conditionValueChipTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  conditionSummary: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  // Custom options (Condition/Severity) styles
  customOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  customOptionsDescription: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  proFeatureDisabled: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },
  // Move to Section Modal styles
  moveSectionModalContent: {
    maxHeight: '60%',
    minWidth: 300,
  },
  moveSectionHint: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  sectionList: {
    maxHeight: 250,
    marginBottom: spacing.md,
  },
  sectionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    gap: spacing.sm,
  },
  sectionListItemText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  moveSectionCancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  moveSectionCancelText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
});
