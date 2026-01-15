import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, components } from '../../constants/theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  secureTextEntry?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  secureTextEntry,
  testID,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const showPasswordToggle = secureTextEntry !== undefined;

  // Build accessibility label from label prop if not provided
  const a11yLabel = accessibilityLabel || label;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text
          style={styles.label}
          accessibilityRole="text"
        >
          {label}
          {props.editable === false ? '' : ''}
        </Text>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.input,
            isFocused && styles.inputFocused,
            error && styles.inputError,
            inputStyle,
          ]}
          placeholderTextColor={colors.neutral[500]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          accessibilityLabel={a11yLabel}
          accessibilityHint={accessibilityHint || (error ? `Error: ${error}` : undefined)}
          accessibilityState={{
            disabled: props.editable === false,
          }}
          testID={testID}
          {...props}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Hide password' : 'Show password'}
            accessibilityHint="Toggles password visibility"
            testID={testID ? `${testID}-toggle` : undefined}
          >
            <Text style={styles.toggleText}>
              {isPasswordVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text
          style={styles.error}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: components.input.height,
    borderRadius: components.input.borderRadius,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  inputFocused: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  toggleButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
  },
});
