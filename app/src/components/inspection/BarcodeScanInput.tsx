/**
 * BarcodeScanInput Component
 * Base file for TypeScript type declarations.
 * Platform-specific implementations are in .native.tsx and .web.tsx
 */

import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';

export interface BarcodeScanInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function BarcodeScanInput({ value, onChange }: BarcodeScanInputProps) {
  const handleClear = () => {
    onChange(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <View style={styles.iconContainer}>
          <Icon name="scan" size={20} color={colors.text.secondary} />
        </View>
        <TextInput
          style={styles.input}
          value={value || ''}
          onChangeText={(text) => onChange(text || null)}
          placeholder="Enter barcode manually"
          placeholderTextColor={colors.text.secondary}
        />
        {value && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Icon name="x" size={16} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    minHeight: 48,
  },
  iconContainer: {
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  clearButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
});

export default BarcodeScanInput;
