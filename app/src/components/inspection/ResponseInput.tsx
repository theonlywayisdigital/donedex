import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '../ui/DateTimePicker';
import type { DateTimePickerEvent } from '../ui/DateTimePicker/types';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon, ProBadge, UpgradeModal, SignatureCanvas, type SignatureCanvasRef } from '../ui';
import { useBillingStore } from '../../store/billingStore';
import type { ItemType, PhotoRule, DatetimeMode, InstructionStyle, SubItem } from '../../services/templates';

// Import extended input components
import {
  RatingNumericInput,
  SliderInput,
  TrafficLightInput,
  DateInput,
  TimeInput,
  ExpiryDateInput,
  CounterInput,
  MeasurementInput,
  TemperatureInput,
  CurrencyInput,
  MeterReadingInput,
  ContractorInput,
  WitnessInput,
  InstructionInput,
  ChecklistInput,
  AutoTimestampInput,
} from './ExtendedInputs';

// Import new field type components
import { AudioRecorderInput } from './AudioRecorderInput';
import { GPSCaptureInput } from './GPSCaptureInput';
import { BarcodeScanInput } from './BarcodeScanInput';
import { PersonPickerInput } from './PersonPickerInput';
import { AutoWeatherDisplay } from './AutoWeatherDisplay';

interface ResponseInputProps {
  itemType: ItemType;
  value: string | null;
  onChange: (value: string | null) => void;
  options?: string[] | null;
  photoRule?: PhotoRule;
  onAddPhoto?: () => void;
  photoCount?: number;
  photos?: string[];  // Local URIs for photo thumbnails
  onRemovePhoto?: (index: number) => void;
  // New props for enhanced fields
  helpText?: string | null;
  placeholder?: string | null;
  datetimeMode?: DatetimeMode | null;
  ratingMax?: number | null;
  declarationText?: string | null;
  signatureRequiresName?: boolean | null;
  onSignatureCapture?: (base64: string) => Promise<string>;
  // Extended field type props
  minValue?: number | null;
  maxValue?: number | null;
  stepValue?: number | null;
  unitOptions?: string[] | null;
  defaultUnit?: string | null;
  warningDaysBefore?: number | null;
  instructionText?: string | null;
  instructionStyle?: InstructionStyle | null;
  checklistItems?: string[] | null;
  // Video props
  onAddVideo?: () => void;
  videoCount?: number;
}

// Button option component for consistent styling
interface OptionButtonProps {
  label: string;
  value: string;
  selected: boolean;
  onPress: () => void;
  variant?: 'success' | 'warning' | 'danger' | 'neutral';
  icon?: 'check-circle' | 'x-circle' | 'alert-triangle' | 'check' | 'x';
}

function OptionButton({ label, value, selected, onPress, variant = 'neutral', icon }: OptionButtonProps) {
  const getBackgroundColor = () => {
    if (!selected) return colors.white;
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.primary.DEFAULT;
    }
  };

  const getBorderColor = () => {
    if (selected) return getBackgroundColor();
    return colors.border.DEFAULT;
  };

  const getIconColor = () => {
    if (selected) return colors.white;
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.text.primary;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.optionButton,
        { backgroundColor: getBackgroundColor(), borderColor: getBorderColor() },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.optionButtonContent}>
        {icon && <Icon name={icon} size={20} color={getIconColor()} />}
        <Text style={[
          styles.optionButtonText,
          selected && styles.optionButtonTextSelected,
          icon && styles.optionButtonTextWithIcon,
        ]}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Pass/Fail input
function PassFailInput({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={styles.buttonGroup}>
      <OptionButton
        label="Pass"
        value="pass"
        selected={value === 'pass'}
        onPress={() => onChange('pass')}
        variant="success"
        icon="check-circle"
      />
      <OptionButton
        label="Fail"
        value="fail"
        selected={value === 'fail'}
        onPress={() => onChange('fail')}
        variant="danger"
        icon="x-circle"
      />
    </View>
  );
}

// Yes/No input
function YesNoInput({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={styles.buttonGroup}>
      <OptionButton
        label="Yes"
        value="yes"
        selected={value === 'yes'}
        onPress={() => onChange('yes')}
        variant="success"
      />
      <OptionButton
        label="No"
        value="no"
        selected={value === 'no'}
        onPress={() => onChange('no')}
        variant="danger"
      />
    </View>
  );
}

// Condition input (Good/Fair/Poor)
function ConditionInput({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={styles.buttonGroup}>
      <OptionButton
        label="Good"
        value="good"
        selected={value === 'good'}
        onPress={() => onChange('good')}
        variant="success"
      />
      <OptionButton
        label="Fair"
        value="fair"
        selected={value === 'fair'}
        onPress={() => onChange('fair')}
        variant="warning"
      />
      <OptionButton
        label="Poor"
        value="poor"
        selected={value === 'poor'}
        onPress={() => onChange('poor')}
        variant="danger"
      />
    </View>
  );
}

// Severity input (Low/Medium/High)
function SeverityInput({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <View style={styles.buttonGroup}>
      <OptionButton
        label="Low"
        value="low"
        selected={value === 'low'}
        onPress={() => onChange('low')}
        variant="success"
      />
      <OptionButton
        label="Medium"
        value="medium"
        selected={value === 'medium'}
        onPress={() => onChange('medium')}
        variant="warning"
      />
      <OptionButton
        label="High"
        value="high"
        selected={value === 'high'}
        onPress={() => onChange('high')}
        variant="danger"
      />
    </View>
  );
}

// Text input
function TextInputField({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={styles.textInput}
      value={value || ''}
      onChangeText={onChange}
      placeholder="Enter response..."
      placeholderTextColor={colors.text.tertiary}
      multiline
    />
  );
}

// Number input
function NumberInputField({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={styles.textInput}
      value={value || ''}
      onChangeText={onChange}
      placeholder="Enter number..."
      placeholderTextColor={colors.text.tertiary}
      keyboardType="numeric"
    />
  );
}

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

// Select input (single choice)
function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: unknown[];
}) {
  return (
    <View style={styles.selectContainer}>
      {options.map((option, index) => {
        const optionValue = normalizeOption(option);
        return (
          <TouchableOpacity
            key={`${optionValue}-${index}`}
            style={[styles.selectOption, value === optionValue && styles.selectOptionSelected]}
            onPress={() => onChange(optionValue)}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, value === optionValue && styles.radioSelected]}>
              {value === optionValue && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.selectOptionText}>{optionValue}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Multi-select input
function MultiSelectInput({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: unknown[];
}) {
  const selectedValues: string[] = value ? JSON.parse(value) : [];

  const toggleOption = (optionValue: string) => {
    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];
    onChange(JSON.stringify(newValues));
  };

  return (
    <View style={styles.selectContainer}>
      {options.map((option, index) => {
        const optionValue = normalizeOption(option);
        const isSelected = selectedValues.includes(optionValue);
        return (
          <TouchableOpacity
            key={`${optionValue}-${index}`}
            style={[styles.selectOption, isSelected && styles.selectOptionSelected]}
            onPress={() => toggleOption(optionValue)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Icon name="check" size={14} color={colors.white} />}
            </View>
            <Text style={styles.selectOptionText}>{optionValue}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Photo capture button with thumbnails and delete option
function PhotoInput({
  onAddPhoto,
  photoCount,
  photos,
  onRemovePhoto,
  disabled = false,
  onUpgradePress,
}: {
  onAddPhoto?: () => void;
  photoCount?: number;
  photos?: string[];
  onRemovePhoto?: (index: number) => void;
  disabled?: boolean;
  onUpgradePress?: () => void;
}) {
  const handlePress = () => {
    if (disabled && onUpgradePress) {
      onUpgradePress();
    } else if (onAddPhoto) {
      onAddPhoto();
    }
  };

  const handleRemove = (index: number) => {
    if (onRemovePhoto) {
      onRemovePhoto(index);
    }
  };

  const hasPhotos = photos && photos.length > 0;

  return (
    <View style={styles.photoInputContainer}>
      {/* Photo thumbnails */}
      {hasPhotos && (
        <View style={styles.photoThumbnailsContainer}>
          {photos.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoThumbnailWrapper}>
              <Image source={{ uri }} style={styles.photoThumbnail} resizeMode="cover" />
              <TouchableOpacity
                style={styles.photoDeleteButton}
                onPress={() => handleRemove(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="x" size={14} color={colors.white} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Add photo button */}
      <TouchableOpacity
        style={[styles.photoButton, disabled && styles.photoButtonDisabled]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Icon name="camera" size={20} color={disabled ? colors.neutral[300] : colors.text.secondary} />
        <Text style={[styles.photoButtonText, disabled && styles.photoButtonTextDisabled]}>
          {hasPhotos ? 'Add Another Photo' : 'Take Photo'}
        </Text>
        {disabled && <ProBadge size="sm" style={styles.photoProBadge} />}
      </TouchableOpacity>
    </View>
  );
}

// Signature input with modal canvas
function SignatureInput({
  value,
  onChange,
  onSignatureCapture,
  requiresName,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  onSignatureCapture?: (base64: string) => Promise<string>;
  requiresName?: boolean | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [saving, setSaving] = useState(false);
  const signatureRef = useRef<SignatureCanvasRef>(null);
  const insets = useSafeAreaInsets();

  const handleSignature = async (signature: string) => {
    if (!signature || signature === 'data:,') {
      return;
    }

    setSaving(true);
    try {
      if (onSignatureCapture) {
        // Upload signature and get storage path
        const storagePath = await onSignatureCapture(signature);
        // Store path and optionally signer name
        const responseValue = requiresName && signerName
          ? JSON.stringify({ path: storagePath, signerName })
          : storagePath;
        onChange(responseValue);
      } else {
        // Fallback: store base64 directly (not recommended for production)
        onChange(signature);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving signature:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const handleClearValue = () => {
    onChange(null);
    setSignerName('');
  };

  const hasSignature = !!value;

  return (
    <View>
      {hasSignature ? (
        <View style={styles.signaturePreview}>
          <View style={styles.signaturePreviewContent}>
            <Icon name="check-circle" size={18} color={colors.success} />
            <Text style={styles.signaturePreviewText}>Signature captured</Text>
          </View>
          <TouchableOpacity onPress={handleClearValue} style={styles.signatureClearButton}>
            <Text style={styles.signatureClearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.signatureButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <Icon name="pen-tool" size={24} color={colors.text.secondary} />
          <Text style={styles.signatureButtonText}>Tap to sign</Text>
        </TouchableOpacity>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="fullScreen">
        <View style={[styles.signatureModal, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.signatureModalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.signatureModalClose}>
              <Text style={styles.signatureModalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.signatureModalTitle}>Sign Here</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              style={styles.signatureModalDone}
              disabled={saving}
            >
              <Text style={styles.signatureModalDoneText}>{saving ? 'Saving...' : 'Done'}</Text>
            </TouchableOpacity>
          </View>

          {requiresName && (
            <View style={styles.signerNameContainer}>
              <Text style={styles.signerNameLabel}>Name:</Text>
              <TextInput
                style={styles.signerNameInput}
                value={signerName}
                onChangeText={setSignerName}
                placeholder="Enter your name"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          )}

          <View style={styles.signatureCanvasContainer}>
            <SignatureCanvas
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={() => console.log('Signature is empty')}
              backgroundColor={colors.white}
              penColor={colors.text.primary}
              style={styles.signatureCanvas}
            />
          </View>

          <View style={styles.signatureModalActions}>
            <TouchableOpacity style={styles.signatureClearAction} onPress={handleClear}>
              <Text style={styles.signatureClearActionText}>Clear Signature</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Declaration input with checkbox acknowledgment
function DeclarationInput({
  value,
  onChange,
  declarationText,
}: {
  value: string | null;
  onChange: (v: string) => void;
  declarationText?: string | null;
}) {
  const parsedValue = value ? JSON.parse(value) : { acknowledged: false, acknowledgedAt: null };
  const isAcknowledged = parsedValue.acknowledged === true;

  const handleToggle = () => {
    if (isAcknowledged) {
      // Un-acknowledge
      onChange(JSON.stringify({ acknowledged: false, acknowledgedAt: null }));
    } else {
      // Acknowledge with timestamp
      onChange(JSON.stringify({ acknowledged: true, acknowledgedAt: new Date().toISOString() }));
    }
  };

  return (
    <View style={styles.declarationContainer}>
      {declarationText && (
        <ScrollView style={styles.declarationTextScroll}>
          <Text style={styles.declarationText}>{declarationText}</Text>
        </ScrollView>
      )}
      <TouchableOpacity
        style={[styles.declarationCheckbox, isAcknowledged && styles.declarationCheckboxChecked]}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isAcknowledged && styles.checkboxSelected]}>
          {isAcknowledged && <Icon name="check" size={14} color={colors.white} />}
        </View>
        <Text style={styles.declarationCheckboxText}>I acknowledge and agree</Text>
      </TouchableOpacity>
      {isAcknowledged && parsedValue.acknowledgedAt && (
        <Text style={styles.declarationTimestamp}>
          {`Acknowledged at ${new Date(parsedValue.acknowledgedAt).toLocaleString()}`}
        </Text>
      )}
    </View>
  );
}

// DateTime input with native picker
function DateTimeInput({
  value,
  onChange,
  datetimeMode,
}: {
  value: string | null;
  onChange: (v: string) => void;
  datetimeMode?: DatetimeMode | null;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const mode = datetimeMode || 'datetime';

  const currentValue = value ? new Date(value) : new Date();

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      setShowTimePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    if (selectedDate) {
      // For datetime mode on Android, we need two pickers
      if (Platform.OS === 'android' && mode === 'datetime' && showPicker && !showTimePicker) {
        // Date was selected, now show time picker
        const tempDate = selectedDate;
        setShowPicker(false);
        setTimeout(() => {
          setShowTimePicker(true);
        }, 100);
        // Store temporary date for time picker to use
        onChange(tempDate.toISOString());
        return;
      }

      let formattedValue: string;
      if (mode === 'date') {
        formattedValue = selectedDate.toISOString().split('T')[0];
      } else if (mode === 'time') {
        formattedValue = selectedDate.toTimeString().split(' ')[0];
      } else {
        formattedValue = selectedDate.toISOString();
      }
      onChange(formattedValue);
    }
  };

  const formatDisplayValue = () => {
    if (!value) return 'Select...';
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      // Handle time-only strings
      if (mode === 'time') return value;
      return 'Select...';
    }
    if (mode === 'date') {
      return date.toLocaleDateString();
    } else if (mode === 'time') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getIconName = () => {
    if (mode === 'time') return 'clock' as const;
    return 'calendar' as const;
  };

  const getPickerMode = (): 'date' | 'time' | 'datetime' => {
    if (mode === 'time') return 'time';
    if (mode === 'date') return 'date';
    // For datetime, iOS supports 'datetime', Android needs separate pickers
    return Platform.OS === 'ios' ? 'datetime' : 'date';
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.datetimeButton}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Icon name={getIconName()} size={18} color={colors.primary.DEFAULT} />
        <Text style={[styles.datetimeText, !value && styles.datetimePlaceholder]}>
          {formatDisplayValue()}
        </Text>
      </TouchableOpacity>

      {(showPicker || showTimePicker) && (
        <DateTimePicker
          value={currentValue}
          mode={showTimePicker ? 'time' : getPickerMode()}
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

// Rating input with tappable stars
function RatingInput({
  value,
  onChange,
  ratingMax,
}: {
  value: string | null;
  onChange: (v: string) => void;
  ratingMax?: number | null;
}) {
  const maxStars = ratingMax || 5;
  const currentRating = value ? parseInt(value, 10) : 0;

  const handleStarPress = (star: number) => {
    // Tap same star to clear
    if (star === currentRating) {
      onChange('');
    } else {
      onChange(star.toString());
    }
  };

  return (
    <View style={styles.ratingContainer}>
      <View style={styles.ratingStars}>
        {Array.from({ length: maxStars }, (_, i) => i + 1).map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(star)}
            activeOpacity={0.7}
            style={styles.ratingStar}
          >
            <Icon
              name="star"
              size={28}
              color={star <= currentRating ? colors.warning : colors.border.DEFAULT}
            />
          </TouchableOpacity>
        ))}
      </View>
      {currentRating > 0 && (
        <Text style={styles.ratingLabel}>{`${currentRating} / ${maxStars}`}</Text>
      )}
    </View>
  );
}

// Main ResponseInput component
export function ResponseInput({
  itemType,
  value,
  onChange,
  options,
  photoRule,
  onAddPhoto,
  photoCount,
  photos,
  onRemovePhoto,
  helpText,
  placeholder,
  datetimeMode,
  ratingMax,
  declarationText,
  signatureRequiresName,
  onSignatureCapture,
  // Extended field type props
  minValue,
  maxValue,
  stepValue,
  unitOptions,
  defaultUnit,
  warningDaysBefore,
  instructionText,
  instructionStyle,
  checklistItems,
  // Video props
  onAddVideo,
  videoCount,
}: ResponseInputProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const canUsePhotos = useBillingStore((state) => state.canUsePhotos);
  const photosAllowed = canUsePhotos();

  const handleChange = (newValue: string | null) => {
    onChange(newValue);
  };

  const handleUpgradePress = () => {
    setShowUpgradeModal(true);
  };

  const showPhotoButton = () => {
    if (photoRule === 'always') return true;
    if (photoRule === 'on_fail') {
      // Show photo button for negative responses
      return (
        value === 'fail' ||
        value === 'no' ||
        value === 'poor' ||
        value === 'high' ||
        value === 'medium'
      );
    }
    return false;
  };

  const renderInput = () => {
    switch (itemType) {
      // Basic types
      case 'pass_fail':
        return <PassFailInput value={value} onChange={handleChange} />;
      case 'yes_no':
        return <YesNoInput value={value} onChange={handleChange} />;
      case 'condition':
        return <ConditionInput value={value} onChange={handleChange} />;
      case 'severity':
        return <SeverityInput value={value} onChange={handleChange} />;
      case 'text':
        return <TextInputField value={value} onChange={handleChange} />;
      case 'number':
        return <NumberInputField value={value} onChange={handleChange} />;
      case 'select':
        return <SelectInput value={value} onChange={handleChange} options={options || []} />;
      case 'multi_select':
        return <MultiSelectInput value={value} onChange={handleChange} options={options || []} />;
      case 'photo':
        return (
          <PhotoInput
            onAddPhoto={onAddPhoto}
            photoCount={photoCount}
            photos={photos}
            onRemovePhoto={onRemovePhoto}
            disabled={!photosAllowed}
            onUpgradePress={handleUpgradePress}
          />
        );
      case 'signature':
        return (
          <SignatureInput
            value={value}
            onChange={handleChange}
            onSignatureCapture={onSignatureCapture}
            requiresName={signatureRequiresName}
          />
        );
      case 'declaration':
        return (
          <DeclarationInput
            value={value}
            onChange={handleChange}
            declarationText={declarationText}
          />
        );
      case 'datetime':
        return (
          <DateTimeInput
            value={value}
            onChange={handleChange}
            datetimeMode={datetimeMode}
          />
        );
      case 'rating':
        return (
          <RatingInput
            value={value}
            onChange={handleChange}
            ratingMax={ratingMax}
          />
        );

      // Rating & Scales
      case 'rating_numeric':
        return (
          <RatingNumericInput
            value={value}
            onChange={handleChange}
            maxValue={maxValue || 10}
          />
        );
      case 'slider':
        return (
          <SliderInput
            value={value}
            onChange={handleChange}
            minValue={minValue || 0}
            maxValue={maxValue || 100}
            step={stepValue || 1}
          />
        );
      case 'traffic_light':
        return <TrafficLightInput value={value} onChange={handleChange} />;

      // Date & Time
      case 'date':
        return <DateInput value={value} onChange={handleChange} />;
      case 'time':
        return <TimeInput value={value} onChange={handleChange} />;
      case 'expiry_date':
        return (
          <ExpiryDateInput
            value={value}
            onChange={handleChange}
            warningDaysBefore={warningDaysBefore || 30}
          />
        );

      // Measurement & Counting
      case 'counter':
        return (
          <CounterInput
            value={value}
            onChange={handleChange}
            minValue={minValue || 0}
            maxValue={maxValue ?? undefined}
            step={stepValue || 1}
          />
        );
      case 'measurement':
        return (
          <MeasurementInput
            value={value}
            onChange={handleChange}
            unitOptions={unitOptions || ['m', 'cm', 'ft', 'mm']}
            defaultUnit={defaultUnit || 'm'}
          />
        );
      case 'temperature':
        return <TemperatureInput value={value} onChange={handleChange} />;
      case 'meter_reading':
        return (
          <MeterReadingInput
            value={value}
            onChange={handleChange}
            onAddPhoto={onAddPhoto}
            photoCount={photoCount}
          />
        );
      case 'currency':
        return (
          <CurrencyInput
            value={value}
            onChange={handleChange}
            currencyOptions={unitOptions || ['£', '$', '€']}
            defaultCurrency={defaultUnit || '£'}
          />
        );

      // Evidence & Media
      case 'photo_before_after':
        // For now, use standard photo input - will be enhanced later
        return (
          <PhotoInput
            onAddPhoto={onAddPhoto}
            photoCount={photoCount}
            photos={photos}
            onRemovePhoto={onRemovePhoto}
            disabled={!photosAllowed}
            onUpgradePress={handleUpgradePress}
          />
        );
      case 'video':
        return (
          <TouchableOpacity style={styles.photoButton} onPress={onAddVideo} activeOpacity={0.7}>
            <Icon name="video" size={20} color={colors.primary.DEFAULT} />
            <Text style={[styles.photoButtonText, { color: colors.primary.DEFAULT }]}>
              {videoCount ? `${videoCount} video(s) recorded` : 'Record Video'}
            </Text>
          </TouchableOpacity>
        );
      case 'audio':
        return <AudioRecorderInput value={value} onChange={handleChange} />;
      case 'annotated_photo':
        // For now, use standard photo input - annotation to be added later
        return (
          <PhotoInput
            onAddPhoto={onAddPhoto}
            photoCount={photoCount}
            photos={photos}
            onRemovePhoto={onRemovePhoto}
            disabled={!photosAllowed}
            onUpgradePress={handleUpgradePress}
          />
        );

      // Location & Assets
      case 'gps_location':
        return <GPSCaptureInput value={value} onChange={handleChange} />;
      case 'barcode_scan':
        return <BarcodeScanInput value={value} onChange={handleChange} />;
      case 'asset_lookup':
        // Placeholder - asset lookup to be implemented
        return (
          <TouchableOpacity style={styles.photoButton} onPress={onAddPhoto} activeOpacity={0.7}>
            <Icon name="tag" size={20} color={colors.text.secondary} />
            <Text style={styles.photoButtonText}>
              {value || 'Search or Scan Asset'}
            </Text>
          </TouchableOpacity>
        );

      // People
      case 'person_picker':
        return <PersonPickerInput value={value} onChange={handleChange} />;
      case 'contractor':
        return <ContractorInput value={value} onChange={handleChange} />;
      case 'witness':
        return (
          <WitnessInput
            value={value}
            onChange={handleChange}
            onSignatureCapture={onSignatureCapture}
          />
        );

      // Smart/Advanced
      case 'instruction':
        return (
          <InstructionInput
            text={instructionText || null}
            style={instructionStyle || 'info'}
          />
        );
      case 'checklist':
        return (
          <ChecklistInput
            value={value}
            onChange={handleChange}
            items={checklistItems || options || []}
          />
        );
      case 'auto_timestamp':
        return <AutoTimestampInput value={value} onChange={handleChange} />;
      case 'auto_weather':
        return <AutoWeatherDisplay value={value} onChange={handleChange} />;
      case 'repeater':
        // Placeholder - repeater to be implemented
        return <Text style={styles.unsupportedText}>Repeater fields coming soon</Text>;
      case 'conditional':
        // Conditional fields are handled at the form level, not here
        return <Text style={styles.unsupportedText}>Conditional field</Text>;

      default:
        return <Text style={styles.unsupportedText}>Unsupported field type: {itemType}</Text>;
    }
  };

  return (
    <>
      <View style={styles.container}>
        {renderInput()}
        {helpText && (
          <Text style={styles.helpText}>{helpText}</Text>
        )}
        {showPhotoButton() && itemType !== 'photo' && (
          <View style={styles.photoSection}>
            <PhotoInput
              onAddPhoto={onAddPhoto}
              photoCount={photoCount}
              photos={photos}
              onRemovePhoto={onRemovePhoto}
              disabled={!photosAllowed}
              onUpgradePress={handleUpgradePress}
            />
          </View>
        )}
      </View>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature="Photos"
        description="Photo attachments are only available on the Pro plan. Upgrade to add photos to your inspections."
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  optionButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.primary,
  },
  optionButtonTextSelected: {
    color: colors.white,
  },
  optionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  optionButtonTextWithIcon: {
    marginLeft: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
    minHeight: 48,
  },
  selectContainer: {
    gap: spacing.sm,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  selectOptionSelected: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  selectOptionText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.DEFAULT,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary.DEFAULT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary.DEFAULT,
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
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.DEFAULT,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  photoSection: {
    marginTop: spacing.md,
  },
  photoInputContainer: {
    gap: spacing.sm,
  },
  photoThumbnailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumbnailWrapper: {
    position: 'relative',
  },
  photoThumbnail: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  photoDeleteButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  photoButtonDisabled: {
    opacity: 0.7,
    backgroundColor: colors.neutral[50],
  },
  photoButtonTextDisabled: {
    color: colors.neutral[300],
  },
  photoProBadge: {
    marginLeft: spacing.xs,
  },
  photoButtonIcon: {
    fontSize: 20,
  },
  photoButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  unsupportedText: {
    fontSize: fontSize.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  helpText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  // Signature styles
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
  signatureButtonIcon: {
    fontSize: 24,
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
  signaturePreviewIcon: {
    fontSize: 18,
    color: colors.success,
    fontWeight: fontWeight.bold,
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
  signerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  signerNameLabel: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  signerNameInput: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    paddingVertical: spacing.xs,
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
  // Declaration styles
  declarationContainer: {
    gap: spacing.sm,
  },
  declarationTextScroll: {
    maxHeight: 150,
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  declarationText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    lineHeight: 22,
  },
  declarationCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
  },
  declarationCheckboxChecked: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  declarationCheckboxText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontWeight: fontWeight.medium,
  },
  declarationTimestamp: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
  },
  // DateTime styles
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
  datetimeIcon: {
    fontSize: 18,
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
  // Auto-timestamp styles (for auto_weather placeholder)
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
  autoTimestampIcon: {
    fontSize: 18,
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
