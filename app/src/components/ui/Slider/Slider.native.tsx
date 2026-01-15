/**
 * Slider Native Implementation
 * Wraps @react-native-community/slider for iOS/Android
 */

import React from 'react';
import RNSlider from '@react-native-community/slider';
import type { SliderProps } from './types';

export default function SliderNative({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  disabled = false,
  style,
}: SliderProps) {
  return (
    <RNSlider
      value={value}
      onValueChange={onValueChange}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      minimumTrackTintColor={minimumTrackTintColor}
      maximumTrackTintColor={maximumTrackTintColor}
      thumbTintColor={thumbTintColor}
      disabled={disabled}
      style={style}
    />
  );
}
