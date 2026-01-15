/**
 * DateTimePicker Native Implementation
 * Wraps @react-native-community/datetimepicker for iOS/Android
 */

import React from 'react';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerProps } from './types';

export default function DateTimePickerNative({
  value,
  mode,
  display = 'default',
  onChange,
  minimumDate,
  maximumDate,
  is24Hour,
}: DateTimePickerProps) {
  const handleChange = (event: any, selectedDate?: Date) => {
    // Convert native event to our standardized event format
    const standardizedEvent = {
      type: event.type as 'set' | 'dismissed',
      nativeEvent: {
        timestamp: selectedDate?.getTime(),
      },
    };
    onChange(standardizedEvent, selectedDate);
  };

  return (
    <RNDateTimePicker
      value={value}
      mode={mode === 'datetime' ? 'date' : mode}
      display={display}
      onChange={handleChange}
      minimumDate={minimumDate}
      maximumDate={maximumDate}
      is24Hour={is24Hour}
    />
  );
}
