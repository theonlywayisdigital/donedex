/**
 * DateTimePicker Types
 */

export type DateTimePickerMode = 'date' | 'time' | 'datetime';

export interface DateTimePickerEvent {
  type: 'set' | 'dismissed';
  nativeEvent: {
    timestamp?: number;
  };
}

export interface DateTimePickerProps {
  value: Date;
  mode: DateTimePickerMode;
  display?: 'default' | 'spinner' | 'calendar' | 'clock';
  onChange: (event: DateTimePickerEvent, date?: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  is24Hour?: boolean;
}
