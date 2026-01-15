/**
 * Extended Input Components for Donedex
 * Contains all the new field type input components
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '../ui/DateTimePicker';
import type { DateTimePickerEvent } from '../ui/DateTimePicker/types';
import Slider from '../ui/Slider';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon, SignatureCanvas, type SignatureCanvasRef } from '../ui';

// Helper to normalize options that might be strings, {label, value} objects, or other types
function normalizeOption(option: unknown): string {
  if (typeof option === 'string') return option;
  if (option && typeof option === 'object' && !Array.isArray(option)) {
    const obj = option as Record<string, unknown>;
    if (typeof obj.label === 'string') return obj.label;
    if (typeof obj.value === 'string') return obj.value;
  }
  return String(option ?? '');
}

// ============================================
// RATING & SCALES
// ============================================

// Numeric Rating Input (1-10 scale)
interface RatingNumericInputProps {
  value: string | null;
  onChange: (v: string) => void;
  maxValue?: number;
}

export function RatingNumericInput({ value, onChange, maxValue = 10 }: RatingNumericInputProps) {
  const currentRating = value ? parseInt(value, 10) : 0;

  return (
    <View style={styles.numericRatingContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.numericRatingScroll}>
        <View style={styles.numericRatingButtons}>
          {Array.from({ length: maxValue }, (_, i) => i + 1).map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => onChange(currentRating === num ? '' : num.toString())}
              style={[
                styles.numericRatingButton,
                currentRating === num && styles.numericRatingButtonSelected,
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.numericRatingButtonText,
                  currentRating === num && styles.numericRatingButtonTextSelected,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Slider Input (0-100%)
interface SliderInputProps {
  value: string | null;
  onChange: (v: string) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
}

export function SliderInput({
  value,
  onChange,
  minValue = 0,
  maxValue = 100,
  step = 1
}: SliderInputProps) {
  const currentValue = value ? parseFloat(value) : minValue;

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>{minValue}</Text>
        <Text style={styles.sliderValue}>{Math.round(currentValue)}%</Text>
        <Text style={styles.sliderLabel}>{maxValue}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minValue}
        maximumValue={maxValue}
        step={step}
        value={currentValue}
        onValueChange={(val: number) => onChange(val.toString())}
        minimumTrackTintColor={colors.primary.DEFAULT}
        maximumTrackTintColor={colors.neutral[200]}
        thumbTintColor={colors.primary.DEFAULT}
      />
    </View>
  );
}

// Traffic Light Input (Red/Amber/Green)
interface TrafficLightInputProps {
  value: string | null;
  onChange: (v: string) => void;
}

export function TrafficLightInput({ value, onChange }: TrafficLightInputProps) {
  const options = [
    { value: 'green', label: 'Green', color: colors.success },
    { value: 'amber', label: 'Amber', color: colors.warning },
    { value: 'red', label: 'Red', color: colors.danger },
  ];

  return (
    <View style={styles.trafficLightContainer}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => onChange(value === option.value ? '' : option.value)}
          style={[
            styles.trafficLightButton,
            { borderColor: option.color },
            value === option.value && { backgroundColor: option.color },
          ]}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.trafficLightDot,
              { backgroundColor: option.color },
              value === option.value && styles.trafficLightDotSelected,
            ]}
          />
          <Text
            style={[
              styles.trafficLightLabel,
              value === option.value && styles.trafficLightLabelSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ============================================
// DATE & TIME
// ============================================

// Date Input
interface DateInputProps {
  value: string | null;
  onChange: (v: string) => void;
}

export function DateInput({ value, onChange }: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const currentValue = value ? new Date(value) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      onChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.datetimeButton}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Icon name="calendar" size={18} color={colors.text.secondary} />
        <Text style={[styles.datetimeText, !value && styles.datetimePlaceholder]}>
          {value ? new Date(value).toLocaleDateString() : 'Select date...'}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={currentValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.datetimeDone} onPress={() => setShowPicker(false)}>
          <Text style={styles.datetimeDoneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Time Input
interface TimeInputProps {
  value: string | null;
  onChange: (v: string) => void;
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const parseTimeValue = () => {
    if (!value) return new Date();
    // Handle HH:MM:SS format
    const parts = value.split(':');
    const date = new Date();
    if (parts.length >= 2) {
      date.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
    }
    return date;
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      const time = selectedDate.toTimeString().split(' ')[0];
      onChange(time);
    }
  };

  const formatTime = () => {
    if (!value) return 'Select time...';
    const date = parseTimeValue();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.datetimeButton}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Icon name="clock" size={18} color={colors.text.secondary} />
        <Text style={[styles.datetimeText, !value && styles.datetimePlaceholder]}>
          {formatTime()}
        </Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={parseTimeValue()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.datetimeDone} onPress={() => setShowPicker(false)}>
          <Text style={styles.datetimeDoneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Expiry Date Input (with warning indicator)
interface ExpiryDateInputProps {
  value: string | null;
  onChange: (v: string) => void;
  warningDaysBefore?: number;
}

export function ExpiryDateInput({ value, onChange, warningDaysBefore = 30 }: ExpiryDateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  const currentValue = value ? new Date(value) : new Date();

  const getExpiryStatus = () => {
    if (!value) return null;
    const expiryDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { status: 'expired', color: colors.danger, text: 'Expired' };
    if (diffDays <= warningDaysBefore) return { status: 'warning', color: colors.warning, text: `${diffDays} days left` };
    return { status: 'ok', color: colors.success, text: 'Valid' };
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      onChange(selectedDate.toISOString().split('T')[0]);
    }
  };

  const expiryStatus = getExpiryStatus();

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.datetimeButton,
          expiryStatus && { borderColor: expiryStatus.color },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Icon name="clock" size={18} color={colors.text.secondary} />
        <Text style={[styles.datetimeText, !value && styles.datetimePlaceholder]}>
          {value ? new Date(value).toLocaleDateString() : 'Select expiry date...'}
        </Text>
        {expiryStatus && (
          <View style={[styles.expiryBadge, { backgroundColor: expiryStatus.color }]}>
            <Text style={styles.expiryBadgeText}>{expiryStatus.text}</Text>
          </View>
        )}
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={currentValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.datetimeDone} onPress={() => setShowPicker(false)}>
          <Text style={styles.datetimeDoneText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================
// MEASUREMENT & COUNTING
// ============================================

// Counter Input (+/- buttons)
interface CounterInputProps {
  value: string | null;
  onChange: (v: string) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
}

export function CounterInput({
  value,
  onChange,
  minValue = 0,
  maxValue,
  step = 1,
}: CounterInputProps) {
  const currentValue = value ? parseInt(value, 10) : minValue;

  const increment = () => {
    const newValue = currentValue + step;
    if (maxValue === undefined || newValue <= maxValue) {
      onChange(newValue.toString());
    }
  };

  const decrement = () => {
    const newValue = currentValue - step;
    if (newValue >= minValue) {
      onChange(newValue.toString());
    }
  };

  return (
    <View style={styles.counterContainer}>
      <TouchableOpacity
        style={[styles.counterButton, currentValue <= minValue && styles.counterButtonDisabled]}
        onPress={decrement}
        disabled={currentValue <= minValue}
        activeOpacity={0.7}
      >
        <Text style={[styles.counterButtonText, currentValue <= minValue && styles.counterButtonTextDisabled]}>
          −
        </Text>
      </TouchableOpacity>

      <View style={styles.counterValueContainer}>
        <Text style={styles.counterValue}>{currentValue}</Text>
      </View>

      <TouchableOpacity
        style={[styles.counterButton, maxValue !== undefined && currentValue >= maxValue && styles.counterButtonDisabled]}
        onPress={increment}
        disabled={maxValue !== undefined && currentValue >= maxValue}
        activeOpacity={0.7}
      >
        <Text style={[styles.counterButtonText, maxValue !== undefined && currentValue >= maxValue && styles.counterButtonTextDisabled]}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// Measurement Input (number + unit)
interface MeasurementInputProps {
  value: string | null;
  onChange: (v: string) => void;
  unitOptions?: string[];
  defaultUnit?: string;
}

export function MeasurementInput({
  value,
  onChange,
  unitOptions = ['m', 'cm', 'ft', 'mm'],
  defaultUnit = 'm',
}: MeasurementInputProps) {
  const parseValue = () => {
    if (!value) return { number: '', unit: defaultUnit };
    try {
      const parsed = JSON.parse(value);
      return { number: parsed.value || '', unit: parsed.unit || defaultUnit };
    } catch {
      return { number: value, unit: defaultUnit };
    }
  };

  const { number, unit } = parseValue();
  const [selectedUnit, setSelectedUnit] = useState(unit);

  const handleNumberChange = (num: string) => {
    onChange(JSON.stringify({ value: num, unit: selectedUnit }));
  };

  const handleUnitChange = (newUnit: string) => {
    setSelectedUnit(newUnit);
    onChange(JSON.stringify({ value: number, unit: newUnit }));
  };

  return (
    <View style={styles.measurementContainer}>
      <TextInput
        style={styles.measurementInput}
        value={number}
        onChangeText={handleNumberChange}
        placeholder="0"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
      />
      <View style={styles.unitSelector}>
        {unitOptions.map((u) => (
          <TouchableOpacity
            key={u}
            style={[styles.unitButton, selectedUnit === u && styles.unitButtonSelected]}
            onPress={() => handleUnitChange(u)}
            activeOpacity={0.7}
          >
            <Text style={[styles.unitButtonText, selectedUnit === u && styles.unitButtonTextSelected]}>
              {u}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// Temperature Input
interface TemperatureInputProps {
  value: string | null;
  onChange: (v: string) => void;
}

export function TemperatureInput({ value, onChange }: TemperatureInputProps) {
  return (
    <MeasurementInput
      value={value}
      onChange={onChange}
      unitOptions={['°C', '°F']}
      defaultUnit="°C"
    />
  );
}

// Currency Input
interface CurrencyInputProps {
  value: string | null;
  onChange: (v: string) => void;
  currencyOptions?: string[];
  defaultCurrency?: string;
}

export function CurrencyInput({
  value,
  onChange,
  currencyOptions = ['£', '$', '€'],
  defaultCurrency = '£',
}: CurrencyInputProps) {
  const parseValue = () => {
    if (!value) return { amount: '', currency: defaultCurrency };
    try {
      const parsed = JSON.parse(value);
      return { amount: parsed.amount || '', currency: parsed.currency || defaultCurrency };
    } catch {
      return { amount: value, currency: defaultCurrency };
    }
  };

  const { amount, currency } = parseValue();
  const [selectedCurrency, setSelectedCurrency] = useState(currency);

  const handleAmountChange = (amt: string) => {
    onChange(JSON.stringify({ amount: amt, currency: selectedCurrency }));
  };

  const handleCurrencyChange = (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    onChange(JSON.stringify({ amount, currency: newCurrency }));
  };

  return (
    <View style={styles.currencyContainer}>
      <View style={styles.currencySelector}>
        {currencyOptions.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.currencyButton, selectedCurrency === c && styles.currencyButtonSelected]}
            onPress={() => handleCurrencyChange(c)}
            activeOpacity={0.7}
          >
            <Text style={[styles.currencyButtonText, selectedCurrency === c && styles.currencyButtonTextSelected]}>
              {c}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.currencyInput}
        value={amount}
        onChangeText={handleAmountChange}
        placeholder="0.00"
        placeholderTextColor={colors.text.tertiary}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

// Meter Reading Input (number + photo required indicator)
interface MeterReadingInputProps {
  value: string | null;
  onChange: (v: string) => void;
  onAddPhoto?: () => void;
  photoCount?: number;
}

export function MeterReadingInput({
  value,
  onChange,
  onAddPhoto,
  photoCount = 0,
}: MeterReadingInputProps) {
  return (
    <View style={styles.meterReadingContainer}>
      <TextInput
        style={styles.meterReadingInput}
        value={value || ''}
        onChangeText={onChange}
        placeholder="Enter reading..."
        placeholderTextColor={colors.text.tertiary}
        keyboardType="numeric"
      />
      <TouchableOpacity
        style={[styles.meterPhotoButton, photoCount > 0 && styles.meterPhotoButtonHasPhoto]}
        onPress={onAddPhoto}
        activeOpacity={0.7}
      >
        <Icon name="camera" size={18} color={photoCount > 0 ? colors.success : colors.danger} />
        <Text style={[styles.meterPhotoText, photoCount > 0 && styles.meterPhotoTextHasPhoto]}>
          {photoCount > 0 ? `${photoCount} photo(s)` : 'Photo required'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// PEOPLE INPUTS
// ============================================

// Contractor Input (Name + Company + Phone)
interface ContractorInputProps {
  value: string | null;
  onChange: (v: string) => void;
}

export function ContractorInput({ value, onChange }: ContractorInputProps) {
  const parseValue = () => {
    if (!value) return { name: '', company: '', phone: '' };
    try {
      return JSON.parse(value);
    } catch {
      return { name: '', company: '', phone: '' };
    }
  };

  const { name, company, phone } = parseValue();

  const handleChange = (field: string, val: string) => {
    const current = parseValue();
    onChange(JSON.stringify({ ...current, [field]: val }));
  };

  return (
    <View style={styles.contractorContainer}>
      <View style={styles.contractorField}>
        <Text style={styles.contractorLabel}>Name</Text>
        <TextInput
          style={styles.contractorInput}
          value={name}
          onChangeText={(v) => handleChange('name', v)}
          placeholder="Contractor name"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>
      <View style={styles.contractorField}>
        <Text style={styles.contractorLabel}>Company</Text>
        <TextInput
          style={styles.contractorInput}
          value={company}
          onChangeText={(v) => handleChange('company', v)}
          placeholder="Company name"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>
      <View style={styles.contractorField}>
        <Text style={styles.contractorLabel}>Phone</Text>
        <TextInput
          style={styles.contractorInput}
          value={phone}
          onChangeText={(v) => handleChange('phone', v)}
          placeholder="Phone number"
          placeholderTextColor={colors.text.tertiary}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );
}

// Witness Input (Name + Signature)
interface WitnessInputProps {
  value: string | null;
  onChange: (v: string | null) => void;
  onSignatureCapture?: (base64: string) => Promise<string>;
}

export function WitnessInput({ value, onChange, onSignatureCapture }: WitnessInputProps) {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const insets = useSafeAreaInsets();

  const parseValue = () => {
    if (!value) return { name: '', signaturePath: null };
    try {
      return JSON.parse(value);
    } catch {
      return { name: '', signaturePath: null };
    }
  };

  const { name, signaturePath } = parseValue();

  const handleNameChange = (newName: string) => {
    onChange(JSON.stringify({ name: newName, signaturePath }));
  };

  const handleSignature = async (signature: string) => {
    if (!signature || signature === 'data:,') return;

    setSaving(true);
    try {
      let storagePath = signature;
      if (onSignatureCapture) {
        storagePath = await onSignatureCapture(signature);
      }
      onChange(JSON.stringify({ name, signaturePath: storagePath }));
      setShowSignatureModal(false);
    } catch (error) {
      console.error('Error saving signature:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClearSignature = () => {
    onChange(JSON.stringify({ name, signaturePath: null }));
  };

  return (
    <View style={styles.witnessContainer}>
      <View style={styles.contractorField}>
        <Text style={styles.contractorLabel}>Witness Name</Text>
        <TextInput
          style={styles.contractorInput}
          value={name}
          onChangeText={handleNameChange}
          placeholder="Full name"
          placeholderTextColor={colors.text.tertiary}
        />
      </View>

      {signaturePath ? (
        <View style={styles.signaturePreview}>
          <View style={styles.signaturePreviewContent}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <Text style={styles.signaturePreviewText}>Signature captured</Text>
          </View>
          <TouchableOpacity onPress={handleClearSignature} style={styles.signatureClearButton}>
            <Text style={styles.signatureClearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.signatureButton}
          onPress={() => setShowSignatureModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="pen-tool" size={24} color={colors.text.secondary} />
          <Text style={styles.signatureButtonText}>Tap to capture signature</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showSignatureModal} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.signatureModal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.signatureModalHeader}>
            <TouchableOpacity onPress={() => setShowSignatureModal(false)} style={styles.signatureModalClose}>
              <Text style={styles.signatureModalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.signatureModalTitle}>Witness Signature</Text>
            <TouchableOpacity
              onPress={() => signatureRef.current?.readSignature()}
              style={styles.signatureModalDone}
              disabled={saving}
            >
              <Text style={styles.signatureModalDoneText}>{saving ? 'Saving...' : 'Done'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signatureCanvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() => {}}
              backgroundColor={colors.white}
              penColor={colors.text.primary}
              style={styles.signatureCanvas}
            />
          </View>

          <View style={styles.signatureModalActions}>
            <TouchableOpacity
              style={styles.signatureClearAction}
              onPress={() => signatureRef.current?.clearSignature()}
            >
              <Text style={styles.signatureClearActionText}>Clear Signature</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// SMART/ADVANCED INPUTS
// ============================================

// Instruction Display (read-only)
interface InstructionInputProps {
  text: string | null;
  imageUrl?: string | null;
  style?: 'info' | 'warning' | 'tip';
}

export function InstructionInput({ text, imageUrl, style = 'info' }: InstructionInputProps) {
  const getStyleConfig = () => {
    switch (style) {
      case 'warning':
        return { bg: colors.warning + '15', border: colors.warning, icon: 'alert-triangle' as const, color: colors.warning };
      case 'tip':
        return { bg: colors.success + '15', border: colors.success, icon: 'lightbulb' as const, color: colors.success };
      default:
        return { bg: colors.primary.light, border: colors.primary.DEFAULT, icon: 'info' as const, color: colors.primary.DEFAULT };
    }
  };

  const styleConfig = getStyleConfig();

  return (
    <View
      style={[
        styles.instructionContainer,
        { backgroundColor: styleConfig.bg, borderColor: styleConfig.border },
      ]}
    >
      <Icon name={styleConfig.icon} size={18} color={styleConfig.color} />
      <Text style={styles.instructionText}>{text}</Text>
    </View>
  );
}

// Checklist Input (nested checkboxes)
interface ChecklistInputProps {
  value: string | null;
  onChange: (v: string) => void;
  items?: unknown[];
}

export function ChecklistInput({ value, onChange, items = [] }: ChecklistInputProps) {
  // Normalize items to strings (handles {label, value} objects)
  const normalizedItems = items.map(normalizeOption);

  const parseValue = (): Record<string, boolean> => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  };

  const checkedItems = parseValue();

  const toggleItem = (item: string) => {
    const newChecked = { ...checkedItems, [item]: !checkedItems[item] };
    onChange(JSON.stringify(newChecked));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <View style={styles.checklistContainer}>
      <Text style={styles.checklistProgress}>
        {checkedCount} / {normalizedItems.length} completed
      </Text>
      {normalizedItems.map((item, index) => (
        <TouchableOpacity
          key={`${item}-${index}`}
          style={[styles.checklistItem, checkedItems[item] && styles.checklistItemChecked]}
          onPress={() => toggleItem(item)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checkedItems[item] && styles.checkboxSelected]}>
            {checkedItems[item] && <Icon name="check" size={14} color={colors.white} />}
          </View>
          <Text
            style={[
              styles.checklistItemText,
              checkedItems[item] && styles.checklistItemTextChecked,
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Auto Timestamp (displays auto-captured timestamp)
interface AutoTimestampInputProps {
  value: string | null;
  onChange: (v: string) => void;
}

export function AutoTimestampInput({ value, onChange }: AutoTimestampInputProps) {
  useEffect(() => {
    if (!value) {
      onChange(new Date().toISOString());
    }
  }, []);

  return (
    <View style={styles.autoTimestampContainer}>
      <Icon name="clock" size={18} color={colors.text.secondary} />
      <Text style={styles.autoTimestampText}>
        {value ? new Date(value).toLocaleString() : 'Capturing timestamp...'}
      </Text>
      <Text style={styles.autoTimestampLabel}>Auto-captured</Text>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Rating styles
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  ratingStar: {
    padding: spacing.xs,
  },
  ratingLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },

  // Numeric rating styles
  numericRatingContainer: {
    marginVertical: spacing.xs,
  },
  numericRatingScroll: {
    flexGrow: 0,
  },
  numericRatingButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  numericRatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  numericRatingButtonSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  numericRatingButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  numericRatingButtonTextSelected: {
    color: colors.white,
  },

  // Slider styles
  sliderContainer: {
    paddingVertical: spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sliderLabel: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  sliderValue: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.primary.DEFAULT,
  },
  slider: {
    width: '100%',
    height: 40,
  },

  // Traffic light styles
  trafficLightContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  trafficLightButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    backgroundColor: colors.white,
    gap: spacing.xs,
  },
  trafficLightDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  trafficLightDotSelected: {
    borderWidth: 2,
    borderColor: colors.white,
  },
  trafficLightLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  trafficLightLabelSelected: {
    color: colors.white,
  },

  // Datetime styles
  datetimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  datetimeText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  datetimePlaceholder: {
    color: colors.text.tertiary,
  },
  datetimeDone: {
    alignItems: 'flex-end',
    paddingVertical: spacing.sm,
  },
  datetimeDoneText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
  expiryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  expiryBadgeText: {
    fontSize: fontSize.caption,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },

  // Counter styles
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonDisabled: {
    backgroundColor: colors.neutral[200],
  },
  counterButtonText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
  counterButtonTextDisabled: {
    color: colors.text.tertiary,
  },
  counterValueContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },

  // Measurement styles
  measurementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  measurementInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
    minHeight: 48,
  },
  unitSelector: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
    minWidth: 44,
    alignItems: 'center',
  },
  unitButtonSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  unitButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  unitButtonTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },

  // Currency styles
  currencyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  currencySelector: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  currencyButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyButtonSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  currencyButtonText: {
    fontSize: fontSize.bodyLarge,
    color: colors.text.secondary,
  },
  currencyButtonTextSelected: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
  currencyInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
    minHeight: 48,
  },

  // Meter reading styles
  meterReadingContainer: {
    gap: spacing.sm,
  },
  meterReadingInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.bodyLarge,
    color: colors.text.primary,
    minHeight: 48,
  },
  meterPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger + '15',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  meterPhotoButtonHasPhoto: {
    backgroundColor: colors.success + '15',
    borderColor: colors.success,
  },
  meterPhotoText: {
    fontSize: fontSize.body,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  meterPhotoTextHasPhoto: {
    color: colors.success,
  },

  // Contractor styles
  contractorContainer: {
    gap: spacing.sm,
  },
  contractorField: {
    gap: spacing.xs,
  },
  contractorLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  contractorInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 44,
  },

  // Witness/Signature styles
  witnessContainer: {
    gap: spacing.md,
  },
  signatureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    minHeight: 72,
    gap: spacing.sm,
  },
  signatureButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  signaturePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  signaturePreviewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  signaturePreviewText: {
    fontSize: fontSize.body,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  signatureClearButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  signatureClearText: {
    fontSize: fontSize.body,
    color: colors.danger,
    fontWeight: fontWeight.medium,
  },
  signatureModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  signatureModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
  },
  signatureModalClose: {
    padding: spacing.sm,
  },
  signatureModalCloseText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  signatureModalTitle: {
    fontSize: fontSize.bodyLarge,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  signatureModalDone: {
    padding: spacing.sm,
  },
  signatureModalDoneText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
  signatureCanvasContainer: {
    flex: 1,
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
  },
  signatureCanvas: {
    flex: 1,
  },
  signatureModalActions: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  signatureClearAction: {
    alignItems: 'center',
    padding: spacing.md,
  },
  signatureClearActionText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },

  // Instruction styles
  instructionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    lineHeight: 22,
  },

  // Checklist styles
  checklistContainer: {
    gap: spacing.sm,
  },
  checklistProgress: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  checklistItemChecked: {
    backgroundColor: colors.success + '10',
    borderColor: colors.success,
  },
  checklistItemText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  checklistItemTextChecked: {
    textDecorationLine: 'line-through',
    color: colors.text.secondary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },

  // Auto timestamp styles
  autoTimestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  autoTimestampText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  autoTimestampLabel: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
});
