import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import DateTimePicker from '../ui/DateTimePicker';
import type { DateTimePickerEvent } from '../ui/DateTimePicker/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon, PIIInlineWarning } from '../ui';
import type { RecordTypeField, Json } from '../../types';
import { detectPII, type PIIDetectionResult } from '../../services/piiDetection';
import { isCompositeFieldType } from '../../constants/fieldTypes';
import { CompositeFieldInput } from './CompositeFieldInput';

interface RecordFieldInputProps {
  field: RecordTypeField;
  value: string | null;
  onChange: (value: string | null) => void;
  /** Called when PII is detected, with detection result */
  onPiiDetected?: (detection: PIIDetectionResult | null) => void;
  /** Whether to show PII warnings (default true) */
  showPiiWarnings?: boolean;
}

// Parse options from JSONB field
// Supports both simple string arrays and {value, label} objects
interface SelectOption {
  value: string;
  label: string;
}

function parseOptions(options: Json | null): SelectOption[] {
  if (!options || !Array.isArray(options)) return [];

  return (options as unknown[]).map((opt) => {
    // If option is a string, use it for both value and label
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    // If option is an object with value/label properties
    if (typeof opt === 'object' && opt !== null && 'value' in opt && 'label' in opt) {
      return opt as SelectOption;
    }
    // Fallback: convert to string
    return { value: String(opt), label: String(opt) };
  });
}

export function RecordFieldInput({
  field,
  value,
  onChange,
  onPiiDetected,
  showPiiWarnings = true,
}: RecordFieldInputProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [piiDetection, setPiiDetection] = useState<PIIDetectionResult | null>(null);
  const [piiWarningDismissed, setPiiWarningDismissed] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced PII detection for text inputs
  useEffect(() => {
    // Only check text fields that aren't already designated for PII
    const textFieldTypes = ['short_text', 'long_text', 'text'];
    const shouldCheck = textFieldTypes.includes(field.field_type) && !field.contains_pii;

    if (!shouldCheck || !value) {
      setPiiDetection(null);
      onPiiDetected?.(null);
      return;
    }

    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce PII detection to avoid running on every keystroke
    debounceRef.current = setTimeout(() => {
      const result = detectPII(value, { fieldType: field.field_type });
      setPiiDetection(result);
      setPiiWarningDismissed(false); // Reset dismissal when new detection occurs
      onPiiDetected?.(result.hasDetections ? result : null);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, field.field_type, field.contains_pii, onPiiDetected]);

  // Handle composite field types separately
  if (isCompositeFieldType(field.field_type)) {
    return (
      <CompositeFieldInput
        field={field}
        value={value}
        onChange={onChange}
      />
    );
  }

  // Render different input types based on field_type
  const renderInput = () => {
    switch (field.field_type) {
      case 'short_text':
        return (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={onChange}
            placeholder={field.placeholder_text || ''}
            placeholderTextColor={colors.text.tertiary}
          />
        );

      case 'long_text':
        return (
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={value || ''}
            onChangeText={onChange}
            placeholder={field.placeholder_text || ''}
            placeholderTextColor={colors.text.tertiary}
            multiline
            numberOfLines={3}
          />
        );

      case 'number':
      case 'currency':
        return (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={onChange}
            placeholder={field.placeholder_text || ''}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="numeric"
          />
        );

      case 'phone':
        return (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={onChange}
            placeholder={field.placeholder_text || 'Phone number'}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="phone-pad"
          />
        );

      case 'email':
        return (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={onChange}
            placeholder={field.placeholder_text || 'Email address'}
            placeholderTextColor={colors.text.tertiary}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        );

      case 'date':
      case 'expiry_date':
        return renderDateInput();

      case 'time':
        return renderTimeInput();

      case 'single_select':
        return renderSelectInput();

      case 'number_with_unit':
        return renderNumberWithUnit();

      default:
        // Fallback to text input for unknown types
        return (
          <TextInput
            style={styles.textInput}
            value={value || ''}
            onChangeText={onChange}
            placeholder={field.placeholder_text || ''}
            placeholderTextColor={colors.text.tertiary}
          />
        );
    }
  };

  const renderDateInput = () => {
    const dateValue = value ? new Date(value) : new Date();
    const displayValue = value
      ? new Date(value).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';

    // Check if expiry date is past or soon
    let expiryStatus: 'ok' | 'soon' | 'expired' = 'ok';
    if (field.field_type === 'expiry_date' && value) {
      const expiryDate = new Date(value);
      const now = new Date();
      const daysUntil = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) expiryStatus = 'expired';
      else if (daysUntil <= 30) expiryStatus = 'soon';
    }

    return (
      <>
        <TouchableOpacity
          style={[
            styles.dateButton,
            expiryStatus === 'expired' && styles.dateButtonExpired,
            expiryStatus === 'soon' && styles.dateButtonSoon,
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon
            name="calendar"
            size={20}
            color={
              expiryStatus === 'expired'
                ? colors.danger
                : expiryStatus === 'soon'
                ? colors.warning
                : colors.text.secondary
            }
          />
          <Text
            style={[
              styles.dateButtonText,
              !displayValue && styles.placeholderText,
              expiryStatus === 'expired' && styles.expiredText,
              expiryStatus === 'soon' && styles.soonText,
            ]}
          >
            {displayValue || 'Select date'}
          </Text>
          {value && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => onChange(null)}
            >
              <Icon name="x" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {showDatePicker && (
          Platform.OS === 'ios' ? (
            <Modal visible transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModal}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) {
                        onChange(date.toISOString().split('T')[0]);
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={dateValue}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (event.type === 'set' && date) {
                  onChange(date.toISOString().split('T')[0]);
                }
              }}
            />
          )
        )}
      </>
    );
  };

  const renderTimeInput = () => {
    const timeValue = value ? new Date(`2000-01-01T${value}`) : new Date();
    const displayValue = value || '';

    return (
      <>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Icon name="clock" size={20} color={colors.text.secondary} />
          <Text style={[styles.dateButtonText, !displayValue && styles.placeholderText]}>
            {displayValue || 'Select time'}
          </Text>
          {value && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => onChange(null)}
            >
              <Icon name="x" size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {showTimePicker && (
          Platform.OS === 'ios' ? (
            <Modal visible transparent animationType="slide">
              <View style={styles.pickerModalOverlay}>
                <View style={styles.pickerModal}>
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.pickerCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.pickerDone}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={timeValue}
                    mode="time"
                    display="spinner"
                    onChange={(event, date) => {
                      if (date) {
                        const hours = date.getHours().toString().padStart(2, '0');
                        const minutes = date.getMinutes().toString().padStart(2, '0');
                        onChange(`${hours}:${minutes}`);
                      }
                    }}
                  />
                </View>
              </View>
            </Modal>
          ) : (
            <DateTimePicker
              value={timeValue}
              mode="time"
              display="default"
              onChange={(event, date) => {
                setShowTimePicker(false);
                if (event.type === 'set' && date) {
                  const hours = date.getHours().toString().padStart(2, '0');
                  const minutes = date.getMinutes().toString().padStart(2, '0');
                  onChange(`${hours}:${minutes}`);
                }
              }}
            />
          )
        )}
      </>
    );
  };

  const renderSelectInput = () => {
    const options = parseOptions(field.options);
    const selectedOption = options.find((o) => o.value === value);

    return (
      <>
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => setShowSelectModal(true)}
        >
          <Text style={[styles.selectButtonText, !value && styles.placeholderText]}>
            {selectedOption?.label || 'Select option'}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.text.secondary} />
        </TouchableOpacity>

        <Modal visible={showSelectModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.selectModalOverlay}
            activeOpacity={1}
            onPress={() => setShowSelectModal(false)}
          >
            <View style={styles.selectModal}>
              <Text style={styles.selectModalTitle}>{field.label}</Text>
              <ScrollView style={styles.selectOptionsList}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.selectOption,
                      value === option.value && styles.selectOptionSelected,
                    ]}
                    onPress={() => {
                      onChange(option.value);
                      setShowSelectModal(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        value === option.value && styles.selectOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {value === option.value && (
                      <Icon name="check" size={20} color={colors.primary.DEFAULT} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.selectCancelButton}
                onPress={() => setShowSelectModal(false)}
              >
                <Text style={styles.selectCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  };

  const renderNumberWithUnit = () => {
    // Parse value as "number unit" format
    const parts = (value || '').split(' ');
    const numValue = parts[0] || '';
    const unitValue = parts[1] || field.default_unit || '';

    const unitOptions = (field.unit_options as string[]) || [];

    const handleNumberChange = (num: string) => {
      onChange(num ? `${num} ${unitValue}` : null);
    };

    const handleUnitChange = (unit: string) => {
      onChange(numValue ? `${numValue} ${unit}` : null);
    };

    return (
      <View style={styles.numberWithUnitContainer}>
        <TextInput
          style={[styles.textInput, styles.numberInput]}
          value={numValue}
          onChangeText={handleNumberChange}
          placeholder="0"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="numeric"
        />
        {unitOptions.length > 0 && (
          <View style={styles.unitPicker}>
            {unitOptions.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[
                  styles.unitOption,
                  unitValue === unit && styles.unitOptionSelected,
                ]}
                onPress={() => handleUnitChange(unit)}
              >
                <Text
                  style={[
                    styles.unitOptionText,
                    unitValue === unit && styles.unitOptionTextSelected,
                  ]}
                >
                  {unit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Get warning message for detected PII
  const getPiiWarningMessage = () => {
    if (!piiDetection?.hasDetections) return '';
    const types = [...new Set(piiDetection.matches.map((m) => m.label))];
    if (piiDetection.hasCritical) {
      return `Contains ${types.join(', ')} - sensitive data`;
    }
    return `May contain ${types.join(', ')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {field.label}
          {field.is_required && <Text style={styles.required}> *</Text>}
        </Text>
        {/* PII indicator for fields that contain PII by design */}
        {field.contains_pii && (
          <View style={styles.piiFieldBadge}>
            <Icon name="shield" size={12} color={colors.primary.DEFAULT} />
            <Text style={styles.piiFieldBadgeText}>PII</Text>
          </View>
        )}
      </View>
      {field.help_text && (
        <Text style={styles.helpText}>{field.help_text}</Text>
      )}
      {renderInput()}
      {/* PII Warning */}
      {showPiiWarnings &&
        piiDetection?.hasDetections &&
        !piiWarningDismissed && (
          <PIIInlineWarning
            severity={piiDetection.highestSeverity || 'medium'}
            message={getPiiWarningMessage()}
            onDismiss={() => setPiiWarningDismissed(true)}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
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
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  dateButtonExpired: {
    borderColor: colors.danger,
    backgroundColor: colors.danger + '10',
  },
  dateButtonSoon: {
    borderColor: colors.warning,
    backgroundColor: colors.warning + '10',
  },
  dateButtonText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  placeholderText: {
    color: colors.text.tertiary,
  },
  expiredText: {
    color: colors.danger,
  },
  soonText: {
    color: colors.warning,
  },
  clearButton: {
    padding: spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
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
  // Picker Modals
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  pickerCancel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  pickerDone: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  // Select Modal
  selectModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.lg,
  },
  selectModal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  selectModalTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  selectOptionsList: {
    maxHeight: 300,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  selectOptionSelected: {
    backgroundColor: colors.primary.light,
  },
  selectOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  selectOptionTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  selectCancelButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  selectCancelText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  // Number with unit
  numberWithUnitContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  numberInput: {
    flex: 1,
  },
  unitPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
  },
  unitOptionSelected: {
    backgroundColor: colors.primary.DEFAULT,
  },
  unitOptionText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  unitOptionTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  // PII indicator styles
  piiFieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  piiFieldBadgeText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
});
