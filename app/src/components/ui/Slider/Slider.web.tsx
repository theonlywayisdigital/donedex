/**
 * Slider Web Implementation
 * Uses HTML5 range input for web
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../../constants/theme';
import type { SliderProps } from './types';

export default function SliderWeb({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  minimumTrackTintColor = colors.primary.DEFAULT,
  maximumTrackTintColor = colors.border.light,
  disabled = false,
  style,
}: SliderProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(Number(event.target.value));
  };

  // Calculate percentage for gradient background
  const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;

  return (
    <View style={[styles.container, style]}>
      <input
        type="range"
        value={value}
        min={minimumValue}
        max={maximumValue}
        step={step}
        onChange={handleChange}
        disabled={disabled}
        style={{
          ...inputStyles,
          background: `linear-gradient(to right, ${minimumTrackTintColor} 0%, ${minimumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} ${percentage}%, ${maximumTrackTintColor} 100%)`,
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
});

// Web-specific styles for the range input
const inputStyles: React.CSSProperties = {
  width: '100%',
  height: 4,
  borderRadius: 2,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  outline: 'none',
};
