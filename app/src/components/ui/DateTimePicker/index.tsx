/**
 * DateTimePicker - Platform-specific date/time picker
 * Uses native picker on iOS/Android, HTML5 input on web
 */

import { Platform } from 'react-native';

// Re-export the appropriate implementation based on platform
// Metro bundler will automatically resolve .native.tsx for native and .web.tsx for web

export type { DateTimePickerProps, DateTimePickerMode } from './types';

// Platform-specific export
import DateTimePickerNative from './DateTimePicker.native';
import DateTimePickerWeb from './DateTimePicker.web';

const DateTimePicker = Platform.OS === 'web' ? DateTimePickerWeb : DateTimePickerNative;

export default DateTimePicker;
