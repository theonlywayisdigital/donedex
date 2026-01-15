import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { showNotification, showDestructiveConfirm } from '../../utils/alert';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';
import type { RecordTypeField } from '../../types';
import {
  fieldTypeContainsPII,
  getFieldTypePiiCategory,
  getFieldTypePiiWarning,
  COMPOSITE_DEFINITIONS,
  isCompositeFieldType,
  CustomSubField,
  getCustomSubFields,
  generateSubFieldKey,
} from '../../constants/fieldTypes';

// Field type configuration interface
interface FieldTypeConfig {
  value: string;
  label: string;
  description: string;
  hasPlaceholder?: boolean;
  hasMaxLength?: boolean;
  hasMinMax?: boolean;
  hasOptions?: boolean;
  hasUnit?: boolean;
  category?: string;
}

// Field type categories for grouping in picker
interface FieldTypeCategory {
  label: string;
  types: FieldTypeConfig[];
}

// Composite field types (generated from COMPOSITE_DEFINITIONS)
const COMPOSITE_FIELD_TYPES: FieldTypeConfig[] = Object.entries(COMPOSITE_DEFINITIONS).map(
  ([value, def]) => ({
    value,
    label: def.label,
    description: def.description,
    category: 'groups',
  })
);

// Basic field types
const BASIC_FIELD_TYPES: FieldTypeConfig[] = [
  { value: 'short_text', label: 'Short Text', description: 'Single line text', hasPlaceholder: true, hasMaxLength: true, category: 'basic' },
  { value: 'long_text', label: 'Long Text', description: 'Multi-line text', hasPlaceholder: true, hasMaxLength: true, category: 'basic' },
  { value: 'number', label: 'Number', description: 'Numeric value', hasMinMax: true, category: 'basic' },
  { value: 'date', label: 'Date', description: 'Date picker', category: 'basic' },
  { value: 'time', label: 'Time', description: 'Time picker', category: 'basic' },
  { value: 'expiry_date', label: 'Expiry Date', description: 'Date with expiry warnings', hasMinMax: true, category: 'basic' },
  { value: 'phone', label: 'Phone', description: 'Phone number', category: 'basic' },
  { value: 'email', label: 'Email', description: 'Email address', category: 'basic' },
  { value: 'currency', label: 'Currency', description: 'Money amount', hasMinMax: true, category: 'basic' },
  { value: 'single_select', label: 'Single Select', description: 'Choose one option', hasOptions: true, category: 'basic' },
  { value: 'multi_select', label: 'Multi Select', description: 'Choose multiple options', hasOptions: true, category: 'basic' },
  { value: 'number_with_unit', label: 'Number with Unit', description: 'Number with units', hasMinMax: true, hasUnit: true, category: 'basic' },
];

// All field types (combined)
const FIELD_TYPES: FieldTypeConfig[] = [
  ...COMPOSITE_FIELD_TYPES,
  ...BASIC_FIELD_TYPES,
];

// Field types organized by category for picker
const FIELD_TYPE_CATEGORIES: FieldTypeCategory[] = [
  {
    label: 'Field Groups',
    types: COMPOSITE_FIELD_TYPES,
  },
  {
    label: 'Basic Fields',
    types: BASIC_FIELD_TYPES,
  },
];

// Get default label for composite field types
const getCompositeDefaultLabel = (fieldType: string): string => {
  const labelMap: Record<string, string> = {
    'composite_person_name': 'Name',
    'composite_contact': 'Contact',
    'composite_address_uk': 'Address',
    'composite_address_us': 'Address',
    'composite_address_intl': 'Address',
    'composite_vehicle': 'Vehicle',
  };
  return labelMap[fieldType] || '';
};

interface FieldEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (fieldData: FieldData) => Promise<void>;
  onDelete?: () => void;
  field?: RecordTypeField | null; // If provided, we're editing
  fieldType?: string; // If provided (for new), pre-select this type
}

export interface FieldData {
  label: string;
  field_type: string;
  is_required: boolean;
  help_text: string | null;
  placeholder_text: string | null;
  default_value: string | null;
  options: string[] | { customSubFields: CustomSubField[] } | null;
  min_value: number | null;
  max_value: number | null;
  unit_type: string | null;
  unit_options: string[] | null;
  default_unit: string | null;
}

export function FieldEditorModal({
  visible,
  onClose,
  onSave,
  onDelete,
  field,
  fieldType: initialFieldType,
}: FieldEditorModalProps) {
  const isEditing = !!field;

  // Form state
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState('short_text');
  const [isRequired, setIsRequired] = useState(false);
  const [helpText, setHelpText] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');
  const [defaultValue, setDefaultValue] = useState('');

  // Field-specific options
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const [newUnitOption, setNewUnitOption] = useState('');
  const [defaultUnit, setDefaultUnit] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [showFieldTypePicker, setShowFieldTypePicker] = useState(!isEditing && !initialFieldType);

  // Custom sub-fields for composite types
  const [customSubFields, setCustomSubFields] = useState<CustomSubField[]>([]);
  const [showAddCustomField, setShowAddCustomField] = useState(false);
  const [newCustomFieldLabel, setNewCustomFieldLabel] = useState('');
  const [newCustomFieldType, setNewCustomFieldType] = useState<'text' | 'email' | 'phone' | 'select'>('text');
  const [newCustomFieldRequired, setNewCustomFieldRequired] = useState(false);
  const [newCustomFieldWidth, setNewCustomFieldWidth] = useState<'full' | 'half'>('full');
  const [newCustomFieldPlaceholder, setNewCustomFieldPlaceholder] = useState('');
  const [newCustomFieldOptions, setNewCustomFieldOptions] = useState<string[]>([]);
  const [newCustomFieldOptionInput, setNewCustomFieldOptionInput] = useState('');

  // Initialize form when modal opens or field changes
  useEffect(() => {
    if (visible) {
      if (field) {
        // Editing existing field
        setLabel(field.label);
        setFieldType(field.field_type);
        setIsRequired(field.is_required);
        setHelpText(field.help_text || '');
        setPlaceholderText(field.placeholder_text || '');
        setDefaultValue(field.default_value || '');
        setSelectOptions(parseOptions(field.options));
        setMinValue(field.min_value?.toString() || '');
        setMaxValue(field.max_value?.toString() || '');
        setUnitLabel(field.unit_type || '');
        setUnitOptions(parseOptions(field.unit_options));
        setDefaultUnit(field.default_unit || '');
        setCustomSubFields(getCustomSubFields(field.options));
        setShowFieldTypePicker(false);
      } else {
        // Creating new field
        resetForm();
        if (initialFieldType) {
          setFieldType(initialFieldType);
          setShowFieldTypePicker(false);
          // Pre-populate label for composite types
          if (isCompositeFieldType(initialFieldType)) {
            const defaultLabel = getCompositeDefaultLabel(initialFieldType);
            if (defaultLabel) {
              setLabel(defaultLabel);
            }
          }
        } else {
          setShowFieldTypePicker(true);
        }
      }
    }
  }, [visible, field, initialFieldType]);

  const resetForm = () => {
    setLabel('');
    setFieldType('short_text');
    setIsRequired(false);
    setHelpText('');
    setPlaceholderText('');
    setDefaultValue('');
    setSelectOptions([]);
    setNewOption('');
    setMinValue('');
    setMaxValue('');
    setUnitLabel('');
    setUnitOptions([]);
    setNewUnitOption('');
    setDefaultUnit('');
    // Reset custom sub-fields
    setCustomSubFields([]);
    resetNewCustomFieldForm();
  };

  const resetNewCustomFieldForm = () => {
    setShowAddCustomField(false);
    setNewCustomFieldLabel('');
    setNewCustomFieldType('text');
    setNewCustomFieldRequired(false);
    setNewCustomFieldWidth('full');
    setNewCustomFieldPlaceholder('');
    setNewCustomFieldOptions([]);
    setNewCustomFieldOptionInput('');
  };

  const handleAddCustomSubField = () => {
    if (!newCustomFieldLabel.trim()) {
      showNotification('Error', 'Please enter a field label');
      return;
    }

    // Check for duplicate keys
    const newKey = generateSubFieldKey(newCustomFieldLabel);
    const existingKeys = customSubFields.map(f => f.key);
    if (existingKeys.includes(newKey)) {
      showNotification('Error', 'A field with this name already exists');
      return;
    }

    // For select type, require at least one option
    if (newCustomFieldType === 'select' && newCustomFieldOptions.length === 0) {
      showNotification('Error', 'Please add at least one option for select field');
      return;
    }

    const newField: CustomSubField = {
      key: newKey,
      label: newCustomFieldLabel.trim(),
      type: newCustomFieldType,
      required: newCustomFieldRequired,
      width: newCustomFieldWidth,
      placeholder: newCustomFieldPlaceholder.trim() || undefined,
      options: newCustomFieldType === 'select' ? newCustomFieldOptions : undefined,
    };

    setCustomSubFields([...customSubFields, newField]);
    resetNewCustomFieldForm();
  };

  const handleRemoveCustomSubField = (key: string) => {
    setCustomSubFields(customSubFields.filter(f => f.key !== key));
  };

  const handleAddCustomFieldOption = () => {
    if (newCustomFieldOptionInput.trim() && !newCustomFieldOptions.includes(newCustomFieldOptionInput.trim())) {
      setNewCustomFieldOptions([...newCustomFieldOptions, newCustomFieldOptionInput.trim()]);
      setNewCustomFieldOptionInput('');
    }
  };

  const handleRemoveCustomFieldOption = (index: number) => {
    setNewCustomFieldOptions(newCustomFieldOptions.filter((_, i) => i !== index));
  };

  const parseOptions = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((v) => String(v));
    }
    return [];
  };

  const getFieldTypeConfig = (): FieldTypeConfig | undefined => {
    return FIELD_TYPES.find((ft) => ft.value === fieldType);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !selectOptions.includes(newOption.trim())) {
      setSelectOptions([...selectOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setSelectOptions(selectOptions.filter((_, i) => i !== index));
  };

  const handleMoveOption = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= selectOptions.length) return;

    const newOptions = [...selectOptions];
    [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
    setSelectOptions(newOptions);
  };

  const handleAddUnitOption = () => {
    if (newUnitOption.trim() && !unitOptions.includes(newUnitOption.trim())) {
      setUnitOptions([...unitOptions, newUnitOption.trim()]);
      if (!defaultUnit) {
        setDefaultUnit(newUnitOption.trim());
      }
      setNewUnitOption('');
    }
  };

  const handleRemoveUnitOption = (index: number) => {
    const removed = unitOptions[index];
    const newOptions = unitOptions.filter((_, i) => i !== index);
    setUnitOptions(newOptions);
    if (defaultUnit === removed) {
      setDefaultUnit(newOptions[0] || '');
    }
  };

  const handleSave = async () => {
    if (!label.trim()) {
      showNotification('Error', 'Please enter a field label');
      return;
    }

    const config = getFieldTypeConfig();

    // Validate select options if needed
    if (config?.hasOptions && selectOptions.length === 0) {
      showNotification('Error', 'Please add at least one option');
      return;
    }

    setSaving(true);

    try {
      const fieldData: FieldData = {
        label: label.trim(),
        field_type: fieldType,
        is_required: isRequired,
        help_text: helpText.trim() || null,
        placeholder_text: placeholderText.trim() || null,
        default_value: defaultValue.trim() || null,
        options: isCompositeFieldType(fieldType) && customSubFields.length > 0
          ? { customSubFields }
          : config?.hasOptions ? selectOptions : null,
        min_value: minValue ? parseFloat(minValue) : null,
        max_value: maxValue ? parseFloat(maxValue) : null,
        unit_type: config?.hasUnit ? (unitLabel.trim() || null) : null,
        unit_options: config?.hasUnit && unitOptions.length > 0 ? unitOptions : null,
        default_unit: config?.hasUnit ? (defaultUnit || null) : null,
      };

      await onSave(fieldData);
      onClose();
    } catch (err) {
      showNotification('Error', err instanceof Error ? err.message : 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showDestructiveConfirm(
      'Delete Field',
      `Are you sure you want to delete "${label}"? This cannot be undone.`,
      () => {
        onDelete?.();
        onClose();
      },
      undefined,
      'Delete',
      'Cancel'
    );
  };

  const config = getFieldTypeConfig();

  // Field type selection screen
  if (showFieldTypePicker) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Select Field Type</Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
            {FIELD_TYPE_CATEGORIES.map((category, categoryIndex) => (
              <View key={category.label} style={styles.fieldTypeCategory}>
                <Text style={styles.categoryHeader}>{category.label}</Text>
                <View style={styles.fieldTypeList}>
                  {category.types.map((ft) => {
                    const hasPII = fieldTypeContainsPII(ft.value);
                    const hasPIIWarning = getFieldTypePiiWarning(ft.value);
                    const isComposite = isCompositeFieldType(ft.value);
                    return (
                      <TouchableOpacity
                        key={ft.value}
                        style={[
                          styles.fieldTypeOption,
                          isComposite && styles.fieldTypeOptionComposite,
                        ]}
                        onPress={() => {
                          setFieldType(ft.value);
                          setShowFieldTypePicker(false);
                          // Pre-populate label for composite types (only if label is empty)
                          if (isComposite && !label) {
                            const defaultLabel = getCompositeDefaultLabel(ft.value);
                            if (defaultLabel) {
                              setLabel(defaultLabel);
                            }
                          }
                        }}
                      >
                        <View style={styles.fieldTypeInfo}>
                          <View style={styles.fieldTypeLabelRow}>
                            <Text style={styles.fieldTypeLabel}>{ft.label}</Text>
                            {hasPII && (
                              <View style={styles.piiIndicator}>
                                <Icon name="shield" size={12} color={colors.danger} />
                                <Text style={styles.piiIndicatorText}>PII</Text>
                              </View>
                            )}
                            {!hasPII && hasPIIWarning && (
                              <View style={[styles.piiIndicator, styles.piiIndicatorWarning]}>
                                <Icon name="alert-triangle" size={12} color={colors.warning} />
                              </View>
                            )}
                          </View>
                          <Text style={styles.fieldTypeDescription}>{ft.description}</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {isEditing ? 'Edit Field' : 'Add Field'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || !label.trim()}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
            ) : (
              <Text style={[styles.saveText, !label.trim() && styles.saveTextDisabled]}>
                {isEditing ? 'Save' : 'Add'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentPadding}
          keyboardShouldPersistTaps="handled"
        >
          {/* Field Type Badge */}
          <TouchableOpacity
            style={styles.fieldTypeBadge}
            onPress={() => !isEditing && setShowFieldTypePicker(true)}
            disabled={isEditing}
          >
            <View style={styles.fieldTypeBadgeContent}>
              <Text style={styles.fieldTypeBadgeLabel}>Field Type</Text>
              <Text style={styles.fieldTypeBadgeValue}>
                {config?.label || fieldType}
              </Text>
            </View>
            {!isEditing && (
              <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
            )}
          </TouchableOpacity>

          {/* PII Warning Banner */}
          {(fieldTypeContainsPII(fieldType) || getFieldTypePiiWarning(fieldType)) && (
            <View style={[
              styles.piiWarningBanner,
              fieldTypeContainsPII(fieldType) && styles.piiWarningBannerCritical,
            ]}>
              <Icon
                name="alert-triangle"
                size={20}
                color={fieldTypeContainsPII(fieldType) ? colors.danger : colors.warning}
              />
              <View style={styles.piiWarningContent}>
                <Text style={[
                  styles.piiWarningTitle,
                  fieldTypeContainsPII(fieldType) && styles.piiWarningTitleCritical,
                ]}>
                  {fieldTypeContainsPII(fieldType) ? 'Contains Personal Data' : 'Privacy Notice'}
                </Text>
                <Text style={styles.piiWarningText}>
                  {getFieldTypePiiWarning(fieldType) || 'This field type may contain personal data.'}
                </Text>
              </View>
            </View>
          )}

          {/* Composite Field Sub-fields Preview */}
          {isCompositeFieldType(fieldType) && COMPOSITE_DEFINITIONS[fieldType] && (
            <View style={styles.compositePreviewSection}>
              <Text style={styles.compositePreviewTitle}>This field group includes:</Text>
              <View style={styles.compositeSubFieldsList}>
                {COMPOSITE_DEFINITIONS[fieldType].subFields.map((subField) => (
                  <View key={subField.key} style={styles.compositeSubFieldRow}>
                    <View style={styles.compositeSubFieldInfo}>
                      <Text style={styles.compositeSubFieldLabel}>
                        {subField.label}
                        {subField.required && <Text style={styles.requiredStar}> *</Text>}
                      </Text>
                      <Text style={styles.compositeSubFieldType}>
                        {subField.type === 'select' ? 'Dropdown' : subField.type.charAt(0).toUpperCase() + subField.type.slice(1)}
                      </Text>
                    </View>
                    <View style={[
                      styles.compositeSubFieldWidth,
                      subField.width === 'half' && styles.compositeSubFieldWidthHalf,
                    ]}>
                      <Text style={styles.compositeSubFieldWidthText}>
                        {subField.width === 'half' ? '½' : 'Full'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.compositePreviewNote}>
                These sub-fields will be created automatically when you add this field group.
              </Text>

              {/* Custom Sub-fields Section */}
              <View style={styles.customSubFieldsSection}>
                <View style={styles.customSubFieldsHeader}>
                  <Text style={styles.customSubFieldsTitle}>Custom Fields</Text>
                  {!showAddCustomField && (
                    <TouchableOpacity
                      style={styles.addCustomFieldButton}
                      onPress={() => setShowAddCustomField(true)}
                    >
                      <Icon name="plus" size={16} color={colors.primary.DEFAULT} />
                      <Text style={styles.addCustomFieldButtonText}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* List of custom sub-fields */}
                {customSubFields.length > 0 && (
                  <View style={styles.customSubFieldsList}>
                    {customSubFields.map((field) => (
                      <View key={field.key} style={styles.customSubFieldRow}>
                        <View style={styles.customSubFieldInfo}>
                          <Text style={styles.customSubFieldLabel}>
                            {field.label}
                            {field.required && <Text style={styles.requiredStar}> *</Text>}
                          </Text>
                          <Text style={styles.customSubFieldType}>
                            {field.type === 'select' ? 'Dropdown' : field.type.charAt(0).toUpperCase() + field.type.slice(1)}
                          </Text>
                        </View>
                        <View style={[
                          styles.customSubFieldWidth,
                          field.width === 'half' && styles.customSubFieldWidthHalf,
                        ]}>
                          <Text style={styles.customSubFieldWidthText}>
                            {field.width === 'half' ? '½' : 'Full'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.customSubFieldRemove}
                          onPress={() => handleRemoveCustomSubField(field.key)}
                        >
                          <Icon name="x" size={16} color={colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Custom Field Form */}
                {showAddCustomField && (
                  <View style={styles.addCustomFieldForm}>
                    <View style={styles.formField}>
                      <Text style={styles.customFieldFormLabel}>Label *</Text>
                      <TextInput
                        style={styles.customFieldFormInput}
                        value={newCustomFieldLabel}
                        onChangeText={setNewCustomFieldLabel}
                        placeholder="e.g., Address Line 2"
                        placeholderTextColor={colors.text.tertiary}
                        autoFocus
                      />
                    </View>

                    <View style={styles.customFieldFormRow}>
                      <View style={styles.customFieldFormHalf}>
                        <Text style={styles.customFieldFormLabel}>Type</Text>
                        <View style={styles.customFieldTypeOptions}>
                          {(['text', 'email', 'phone', 'select'] as const).map((type) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.customFieldTypeChip,
                                newCustomFieldType === type && styles.customFieldTypeChipSelected,
                              ]}
                              onPress={() => setNewCustomFieldType(type)}
                            >
                              <Text style={[
                                styles.customFieldTypeChipText,
                                newCustomFieldType === type && styles.customFieldTypeChipTextSelected,
                              ]}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={styles.customFieldFormHalf}>
                        <Text style={styles.customFieldFormLabel}>Width</Text>
                        <View style={styles.customFieldWidthOptions}>
                          <TouchableOpacity
                            style={[
                              styles.customFieldWidthChip,
                              newCustomFieldWidth === 'full' && styles.customFieldWidthChipSelected,
                            ]}
                            onPress={() => setNewCustomFieldWidth('full')}
                          >
                            <Text style={[
                              styles.customFieldWidthChipText,
                              newCustomFieldWidth === 'full' && styles.customFieldWidthChipTextSelected,
                            ]}>
                              Full
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.customFieldWidthChip,
                              newCustomFieldWidth === 'half' && styles.customFieldWidthChipSelected,
                            ]}
                            onPress={() => setNewCustomFieldWidth('half')}
                          >
                            <Text style={[
                              styles.customFieldWidthChipText,
                              newCustomFieldWidth === 'half' && styles.customFieldWidthChipTextSelected,
                            ]}>
                              Half
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.customFieldRequiredRow}
                      onPress={() => setNewCustomFieldRequired(!newCustomFieldRequired)}
                    >
                      <View style={[
                        styles.customFieldCheckbox,
                        newCustomFieldRequired && styles.customFieldCheckboxChecked,
                      ]}>
                        {newCustomFieldRequired && (
                          <Icon name="check" size={12} color={colors.white} />
                        )}
                      </View>
                      <Text style={styles.customFieldRequiredText}>Required</Text>
                    </TouchableOpacity>

                    <View style={styles.formField}>
                      <Text style={styles.customFieldFormLabel}>Placeholder (optional)</Text>
                      <TextInput
                        style={styles.customFieldFormInput}
                        value={newCustomFieldPlaceholder}
                        onChangeText={setNewCustomFieldPlaceholder}
                        placeholder="Example text"
                        placeholderTextColor={colors.text.tertiary}
                      />
                    </View>

                    {/* Options for select type */}
                    {newCustomFieldType === 'select' && (
                      <View style={styles.formField}>
                        <Text style={styles.customFieldFormLabel}>Options *</Text>
                        <View style={styles.customFieldOptionsContainer}>
                          {newCustomFieldOptions.map((option, index) => (
                            <View key={index} style={styles.customFieldOptionRow}>
                              <Text style={styles.customFieldOptionText}>{option}</Text>
                              <TouchableOpacity
                                onPress={() => handleRemoveCustomFieldOption(index)}
                              >
                                <Icon name="x" size={14} color={colors.danger} />
                              </TouchableOpacity>
                            </View>
                          ))}
                          <View style={styles.customFieldAddOptionRow}>
                            <TextInput
                              style={[styles.customFieldFormInput, styles.customFieldAddOptionInput]}
                              value={newCustomFieldOptionInput}
                              onChangeText={setNewCustomFieldOptionInput}
                              placeholder="Add option"
                              placeholderTextColor={colors.text.tertiary}
                              onSubmitEditing={handleAddCustomFieldOption}
                              returnKeyType="done"
                            />
                            <TouchableOpacity
                              style={[
                                styles.customFieldAddOptionButton,
                                !newCustomFieldOptionInput.trim() && styles.customFieldAddOptionButtonDisabled,
                              ]}
                              onPress={handleAddCustomFieldOption}
                              disabled={!newCustomFieldOptionInput.trim()}
                            >
                              <Icon
                                name="plus"
                                size={16}
                                color={newCustomFieldOptionInput.trim() ? colors.primary.DEFAULT : colors.text.tertiary}
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}

                    <View style={styles.customFieldFormActions}>
                      <TouchableOpacity
                        style={styles.customFieldCancelButton}
                        onPress={resetNewCustomFieldForm}
                      >
                        <Text style={styles.customFieldCancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.customFieldAddButton,
                          !newCustomFieldLabel.trim() && styles.customFieldAddButtonDisabled,
                        ]}
                        onPress={handleAddCustomSubField}
                        disabled={!newCustomFieldLabel.trim()}
                      >
                        <Text style={[
                          styles.customFieldAddButtonText,
                          !newCustomFieldLabel.trim() && styles.customFieldAddButtonTextDisabled,
                        ]}>
                          Add Field
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {customSubFields.length === 0 && !showAddCustomField && (
                  <Text style={styles.customFieldsEmptyText}>
                    No custom fields added. Tap "Add" to create additional fields.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Label */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Label *</Text>
            <TextInput
              style={styles.formInput}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g., Registration Number"
              placeholderTextColor={colors.text.tertiary}
              autoFocus={!isEditing}
            />
          </View>

          {/* Required Toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsRequired(!isRequired)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Required</Text>
              <Text style={styles.toggleDescription}>
                Users must fill in this field
              </Text>
            </View>
            <View style={[styles.toggle, isRequired && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isRequired && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Help Text</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={helpText}
              onChangeText={setHelpText}
              placeholder="Instructions or context for users"
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Placeholder (for text fields) */}
          {config?.hasPlaceholder && (
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Placeholder</Text>
              <TextInput
                style={styles.formInput}
                value={placeholderText}
                onChangeText={setPlaceholderText}
                placeholder="Example text shown in empty input"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          )}

          {/* Min/Max Values (for numeric fields) */}
          {config?.hasMinMax && (
            <View style={styles.rowFields}>
              <View style={[styles.formField, styles.halfField]}>
                <Text style={styles.formLabel}>Minimum</Text>
                <TextInput
                  style={styles.formInput}
                  value={minValue}
                  onChangeText={setMinValue}
                  placeholder="None"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formField, styles.halfField]}>
                <Text style={styles.formLabel}>Maximum</Text>
                <TextInput
                  style={styles.formInput}
                  value={maxValue}
                  onChangeText={setMaxValue}
                  placeholder="None"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Unit Options (for number_with_unit) */}
          {config?.hasUnit && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Unit Configuration</Text>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Unit Label</Text>
                <TextInput
                  style={styles.formInput}
                  value={unitLabel}
                  onChangeText={setUnitLabel}
                  placeholder="e.g., Length, Weight"
                  placeholderTextColor={colors.text.tertiary}
                />
              </View>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Unit Options</Text>
                <View style={styles.optionsContainer}>
                  {unitOptions.map((option, index) => (
                    <View key={index} style={styles.optionRow}>
                      <TouchableOpacity
                        style={[
                          styles.optionChip,
                          defaultUnit === option && styles.optionChipDefault,
                        ]}
                        onPress={() => setDefaultUnit(option)}
                      >
                        <Text style={[
                          styles.optionChipText,
                          defaultUnit === option && styles.optionChipTextDefault,
                        ]}>
                          {option}
                          {defaultUnit === option && ' (default)'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.optionRemove}
                        onPress={() => handleRemoveUnitOption(index)}
                      >
                        <Icon name="x" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.addOptionRow}>
                    <TextInput
                      style={[styles.formInput, styles.addOptionInput]}
                      value={newUnitOption}
                      onChangeText={setNewUnitOption}
                      placeholder="Add unit (e.g., cm, m, ft)"
                      placeholderTextColor={colors.text.tertiary}
                      onSubmitEditing={handleAddUnitOption}
                      returnKeyType="done"
                    />
                    <TouchableOpacity
                      style={[styles.addOptionButton, !newUnitOption.trim() && styles.addOptionButtonDisabled]}
                      onPress={handleAddUnitOption}
                      disabled={!newUnitOption.trim()}
                    >
                      <Icon name="plus" size={20} color={newUnitOption.trim() ? colors.primary.DEFAULT : colors.text.tertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Select Options (for single_select and multi_select) */}
          {config?.hasOptions && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options *</Text>
              <Text style={styles.sectionDescription}>
                Add the choices users can select from
              </Text>

              <View style={styles.optionsContainer}>
                {selectOptions.map((option, index) => (
                  <View key={index} style={styles.optionRow}>
                    <View style={styles.optionReorder}>
                      <TouchableOpacity
                        onPress={() => handleMoveOption(index, 'up')}
                        disabled={index === 0}
                        style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                      >
                        <Icon name="chevron-up" size={16} color={index === 0 ? colors.text.tertiary : colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveOption(index, 'down')}
                        disabled={index === selectOptions.length - 1}
                        style={[styles.reorderButton, index === selectOptions.length - 1 && styles.reorderButtonDisabled]}
                      >
                        <Icon name="chevron-down" size={16} color={index === selectOptions.length - 1 ? colors.text.tertiary : colors.text.secondary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.optionContent}>
                      <Text style={styles.optionText}>{option}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.optionRemove}
                      onPress={() => handleRemoveOption(index)}
                    >
                      <Icon name="x" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={styles.addOptionRow}>
                  <TextInput
                    style={[styles.formInput, styles.addOptionInput]}
                    value={newOption}
                    onChangeText={setNewOption}
                    placeholder="Add option"
                    placeholderTextColor={colors.text.tertiary}
                    onSubmitEditing={handleAddOption}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={[styles.addOptionButton, !newOption.trim() && styles.addOptionButtonDisabled]}
                    onPress={handleAddOption}
                    disabled={!newOption.trim()}
                  >
                    <Icon name="plus" size={20} color={newOption.trim() ? colors.primary.DEFAULT : colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Default Value */}
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Default Value</Text>
            <TextInput
              style={styles.formInput}
              value={defaultValue}
              onChangeText={setDefaultValue}
              placeholder="Pre-filled value (optional)"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Delete Button (when editing) */}
          {isEditing && onDelete && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Icon name="trash-2" size={20} color={colors.danger} />
              <Text style={styles.deleteButtonText}>Delete Field</Text>
            </TouchableOpacity>
          )}

          {/* Bottom padding for keyboard */}
          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  headerPlaceholder: {
    width: 60,
  },
  title: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  cancelText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  saveText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  saveTextDisabled: {
    color: colors.text.tertiary,
  },
  content: {
    flex: 1,
  },
  contentPadding: {
    padding: spacing.md,
  },
  fieldTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  fieldTypeBadgeContent: {
    flex: 1,
  },
  fieldTypeBadgeLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  fieldTypeBadgeValue: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  formField: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  formInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  toggleDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.neutral[200],
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfField: {
    flex: 1,
  },
  section: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionReorder: {
    flexDirection: 'column',
    gap: 2,
  },
  reorderButton: {
    padding: 2,
  },
  reorderButtonDisabled: {
    opacity: 0.4,
  },
  optionContent: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  optionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  optionChip: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  optionChipDefault: {
    backgroundColor: colors.primary.light,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  optionChipText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  optionChipTextDefault: {
    color: colors.primary.DEFAULT,
  },
  optionRemove: {
    padding: spacing.xs,
  },
  addOptionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addOptionInput: {
    flex: 1,
    marginBottom: 0,
  },
  addOptionButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
  },
  addOptionButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontSize: fontSize.body,
    color: colors.danger,
  },
  bottomPadding: {
    height: 100,
  },
  // Field type picker styles
  fieldTypeCategory: {
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  fieldTypeList: {
    gap: spacing.sm,
  },
  fieldTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  fieldTypeOptionComposite: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.DEFAULT,
  },
  fieldTypeInfo: {
    flex: 1,
  },
  fieldTypeLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  fieldTypeDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  // PII Warning styles
  piiWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  piiWarningBannerCritical: {
    backgroundColor: '#FEF2F2',
    borderLeftColor: colors.danger,
  },
  piiWarningContent: {
    flex: 1,
  },
  piiWarningTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: 2,
  },
  piiWarningTitleCritical: {
    color: colors.danger,
  },
  piiWarningText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    lineHeight: fontSize.caption * 1.4,
  },
  // Field type picker PII indicators
  fieldTypeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  piiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  piiIndicatorWarning: {
    backgroundColor: '#FFFBEB',
  },
  piiIndicatorText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
  },
  // Composite field preview styles
  compositePreviewSection: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  compositePreviewTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.sm,
  },
  compositeSubFieldsList: {
    gap: spacing.xs,
  },
  compositeSubFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
  },
  compositeSubFieldInfo: {
    flex: 1,
  },
  compositeSubFieldLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  compositeSubFieldType: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  compositeSubFieldWidth: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  compositeSubFieldWidthHalf: {
    backgroundColor: colors.primary.light,
  },
  compositeSubFieldWidthText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  compositePreviewNote: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: fontWeight.bold,
  },
  // Custom sub-fields styles
  customSubFieldsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.primary.DEFAULT,
  },
  customSubFieldsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  customSubFieldsTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  addCustomFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  addCustomFieldButtonText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  customSubFieldsList: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  customSubFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  customSubFieldInfo: {
    flex: 1,
  },
  customSubFieldLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  customSubFieldType: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  customSubFieldWidth: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  customSubFieldWidthHalf: {
    backgroundColor: colors.primary.light,
  },
  customSubFieldWidthText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  customSubFieldRemove: {
    padding: spacing.xs,
  },
  customFieldsEmptyText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  // Add custom field form styles
  addCustomFieldForm: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  customFieldFormLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  customFieldFormInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 40,
  },
  customFieldFormRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  customFieldFormHalf: {
    flex: 1,
  },
  customFieldTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  customFieldTypeChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  customFieldTypeChipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  customFieldTypeChipText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  customFieldTypeChipTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  customFieldWidthOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  customFieldWidthChip: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
  },
  customFieldWidthChipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.DEFAULT,
  },
  customFieldWidthChipText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  customFieldWidthChipTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  customFieldRequiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  customFieldCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customFieldCheckboxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  customFieldRequiredText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  customFieldOptionsContainer: {
    gap: spacing.xs,
  },
  customFieldOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  customFieldOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  customFieldAddOptionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  customFieldAddOptionInput: {
    flex: 1,
  },
  customFieldAddOptionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.sm,
  },
  customFieldAddOptionButtonDisabled: {
    opacity: 0.5,
  },
  customFieldFormActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customFieldCancelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.sm,
  },
  customFieldCancelButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  customFieldAddButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.sm,
  },
  customFieldAddButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  customFieldAddButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  customFieldAddButtonTextDisabled: {
    color: colors.text.tertiary,
  },
});
