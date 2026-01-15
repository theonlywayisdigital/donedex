/**
 * DateTimePicker Web Implementation
 * Uses HTML5 input types for date/time selection on web
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing, fontSize } from '../../../constants/theme';
import type { DateTimePickerProps } from './types';

// Format date for HTML input
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format time for HTML input
function formatTimeForInput(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Format datetime-local for HTML input
function formatDateTimeForInput(date: Date): string {
  return `${formatDateForInput(date)}T${formatTimeForInput(date)}`;
}

// Format min/max date for HTML input
function formatDateConstraint(date: Date | undefined, mode: string): string | undefined {
  if (!date) return undefined;
  if (mode === 'time') return formatTimeForInput(date);
  if (mode === 'datetime') return formatDateTimeForInput(date);
  return formatDateForInput(date);
}

export default function DateTimePickerWeb({
  value,
  mode,
  onChange,
  minimumDate,
  maximumDate,
}: DateTimePickerProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    if (!inputValue) {
      // User cleared the input
      onChange({ type: 'dismissed', nativeEvent: {} });
      return;
    }

    let newDate: Date;

    if (mode === 'time') {
      // Parse time (HH:MM format)
      const [hours, minutes] = inputValue.split(':').map(Number);
      newDate = new Date(value);
      newDate.setHours(hours, minutes, 0, 0);
    } else if (mode === 'datetime') {
      // Parse datetime-local format
      newDate = new Date(inputValue);
    } else {
      // Parse date (YYYY-MM-DD format)
      newDate = new Date(inputValue + 'T00:00:00');
    }

    onChange(
      { type: 'set', nativeEvent: { timestamp: newDate.getTime() } },
      newDate
    );
  };

  // Determine input type based on mode
  const inputType = mode === 'time' ? 'time' : mode === 'datetime' ? 'datetime-local' : 'date';

  // Format value for input
  const inputValue = mode === 'time'
    ? formatTimeForInput(value)
    : mode === 'datetime'
    ? formatDateTimeForInput(value)
    : formatDateForInput(value);

  return (
    <View style={styles.container}>
      <input
        type={inputType}
        value={inputValue}
        onChange={handleChange}
        min={formatDateConstraint(minimumDate, mode)}
        max={formatDateConstraint(maximumDate, mode)}
        style={inputStyles}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

// Web-specific styles (CSS-in-JS for the native HTML input)
const inputStyles: React.CSSProperties = {
  width: '100%',
  height: 48,
  padding: '0 16px',
  fontSize: 16,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: '#111827',
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: 8,
  outline: 'none',
  boxSizing: 'border-box',
  cursor: 'pointer',
};
