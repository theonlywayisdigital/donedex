/**
 * CompositeFieldInput Component
 *
 * Renders composite field types (Person Name, Address, Vehicle, etc.)
 * as grouped sub-fields with proper layout and validation.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';
import type { RecordTypeField } from '../../types';
import {
  getCompositeDefinition,
  parseCompositeValue,
  formatCompositeValue,
  validateCompositeValue,
  getCustomSubFields,
  type CompositeSubField,
  type CustomSubField,
} from '../../constants/fieldTypes';

// ============================================
// Types
// ============================================

interface CompositeFieldInputProps {
  /** The field definition */
  field: RecordTypeField;
  /** Current value as JSON string */
  value: string | null;
  /** Called when value changes */
  onChange: (value: string | null) => void;
  /** Whether to show validation errors */
  showErrors?: boolean;
}

// ============================================
// Component
// ============================================

export function CompositeFieldInput({
  field,
  value,
  onChange,
  showErrors = false,
}: CompositeFieldInputProps) {
  const [selectModalField, setSelectModalField] = useState<CompositeSubField | null>(null);

  // Get the composite definition
  const definition = useMemo(
    () => getCompositeDefinition(field.field_type),
    [field.field_type]
  );

  // Get custom sub-fields from field options
  const customSubFields = useMemo(
    () => getCustomSubFields(field.options),
    [field.options]
  );

  // Combine predefined and custom sub-fields
  // Convert CustomSubField to CompositeSubField format
  const allSubFields = useMemo(() => {
    if (!definition) return [];

    const predefinedFields = definition.subFields;
    const customFields: CompositeSubField[] = customSubFields.map((cf: CustomSubField) => ({
      key: cf.key,
      label: cf.label,
      type: cf.type,
      required: cf.required,
      width: cf.width,
      placeholder: cf.placeholder,
      options: cf.options,
    }));

    return [...predefinedFields, ...customFields];
  }, [definition, customSubFields]);

  // Parse current value
  const parsedValue = useMemo(() => parseCompositeValue(value), [value]);

  // Validation errors
  const errors = useMemo(() => {
    if (!showErrors || !definition) return {};
    return validateCompositeValue(field.field_type, parsedValue).errors;
  }, [showErrors, definition, field.field_type, parsedValue]);

  // Handle sub-field change
  const handleSubFieldChange = useCallback(
    (key: string, newValue: string | null) => {
      const updated = { ...parsedValue, [key]: newValue || null };

      // Check if all values are empty/null
      const hasAnyValue = Object.values(updated).some(
        (v) => v && typeof v === 'string' && v.trim()
      );

      if (hasAnyValue) {
        onChange(formatCompositeValue(updated));
      } else {
        onChange(null);
      }
    },
    [parsedValue, onChange]
  );

  // If no definition found, show error
  if (!definition) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unknown composite field type: {field.field_type}</Text>
      </View>
    );
  }

  // Group sub-fields by row (consecutive half-width fields share a row)
  const fieldRows = useMemo(() => {
    const rows: CompositeSubField[][] = [];
    let currentRow: CompositeSubField[] = [];

    allSubFields.forEach((subField) => {
      if (subField.width === 'half') {
        currentRow.push(subField);
        if (currentRow.length === 2) {
          rows.push(currentRow);
          currentRow = [];
        }
      } else {
        // Full width field
        if (currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
        rows.push([subField]);
      }
    });

    // Push any remaining half-width field
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }, [allSubFields]);

  // Render sub-field input
  const renderSubFieldInput = (subField: CompositeSubField) => {
    const subValue = parsedValue[subField.key] || '';
    const error = errors[subField.key];

    switch (subField.type) {
      case 'select':
        return (
          <TouchableOpacity
            style={[styles.selectButton, error && styles.inputError]}
            onPress={() => setSelectModalField(subField)}
          >
            <Text style={[styles.selectButtonText, !subValue && styles.placeholderText]}>
              {subValue || `Select ${subField.label.toLowerCase()}`}
            </Text>
            <Icon name="chevron-down" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        );

      case 'email':
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={subValue}
            onChangeText={(text) => handleSubFieldChange(subField.key, text)}
            placeholder={subField.placeholder}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        );

      case 'phone':
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={subValue}
            onChangeText={(text) => handleSubFieldChange(subField.key, text)}
            placeholder={subField.placeholder}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="phone-pad"
          />
        );

      case 'text':
      default:
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={subValue}
            onChangeText={(text) => handleSubFieldChange(subField.key, text)}
            placeholder={subField.placeholder}
            placeholderTextColor={colors.text.tertiary}
            autoCapitalize="words"
          />
        );
    }
  };

  // Render a single sub-field with label
  const renderSubField = (subField: CompositeSubField, isHalf: boolean) => {
    const error = errors[subField.key];

    return (
      <View
        key={subField.key}
        style={[styles.subFieldContainer, isHalf && styles.halfWidth]}
      >
        <Text style={styles.subFieldLabel}>
          {subField.label}
          {subField.required && <Text style={styles.required}> *</Text>}
        </Text>
        {renderSubFieldInput(subField)}
        {error && <Text style={styles.errorMessage}>{error}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {field.label}
            {field.is_required && <Text style={styles.required}> *</Text>}
          </Text>
          {/* PII Badge */}
          {definition.containsPII && (
            <View style={styles.piiBadge}>
              <Icon name="shield" size={12} color={colors.primary.DEFAULT} />
              <Text style={styles.piiBadgeText}>PII</Text>
            </View>
          )}
        </View>
        {field.help_text && <Text style={styles.helpText}>{field.help_text}</Text>}
      </View>

      {/* Sub-fields Card */}
      <View style={styles.card}>
        {fieldRows.map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={[styles.row, row.length === 2 && styles.rowWithGap]}
          >
            {row.map((subField) => renderSubField(subField, row.length === 2))}
          </View>
        ))}
      </View>

      {/* Select Modal */}
      {selectModalField && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectModalField(null)}
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>{selectModalField.label}</Text>
              <ScrollView style={styles.optionsList}>
                {(selectModalField.options || []).map((option) => {
                  const isSelected = parsedValue[selectModalField.key] === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      onPress={() => {
                        handleSubFieldChange(selectModalField.key, option);
                        setSelectModalField(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                      {isSelected && (
                        <Icon name="check" size={18} color={colors.primary.DEFAULT} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setSelectModalField(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },

  // Header
  header: {
    marginBottom: spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  required: {
    color: colors.danger,
  },
  helpText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  piiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  piiBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },

  // Card container for sub-fields
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },

  // Row layout
  row: {
    marginBottom: spacing.md,
  },
  rowWithGap: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  // Sub-field container
  subFieldContainer: {
    flex: 1,
  },
  halfWidth: {
    flex: 1,
  },
  subFieldLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },

  // Inputs
  textInput: {
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  inputError: {
    borderColor: colors.danger,
  },

  // Select button
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectButtonText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.tertiary,
  },

  // Error text
  errorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    padding: spacing.md,
  },
  errorMessage: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  optionSelected: {
    backgroundColor: colors.primary.light,
  },
  optionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  optionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  cancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
});

export default CompositeFieldInput;
