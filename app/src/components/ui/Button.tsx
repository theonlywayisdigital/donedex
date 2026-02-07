import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, fontFamily, components, letterSpacing } from '../../constants/theme';
import { Icon, IconName } from './Icon';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: IconName;
  rightIcon?: IconName;
  style?: ViewStyle;
  textStyle?: TextStyle;
  /** Accessibility label override - defaults to title */
  accessibilityLabel?: string;
  /** Accessibility hint - describes result of action */
  accessibilityHint?: string;
  /** Test ID for testing */
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    fullWidth ? styles.fullWidth : {},
    isDisabled ? styles.disabled : {},
    style || {},
  ].filter(Boolean) as ViewStyle[];

  const textStyles = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles],
    isDisabled && styles.disabledText,
    leftIcon && styles.textWithLeftIcon,
    rightIcon && styles.textWithRightIcon,
    textStyle,
  ];

  const iconColor = variant === 'primary' || variant === 'danger'
    ? colors.white
    : colors.primary.DEFAULT;

  // Build accessibility label
  const a11yLabel = accessibilityLabel || title;
  const a11yState = {
    disabled: isDisabled,
    busy: loading,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        ...buttonStyles,
        pressed && !isDisabled && { opacity: 0.8 },
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={loading ? `${a11yLabel}, loading` : a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={a11yState}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator
          color={iconColor}
          size="small"
          accessibilityLabel="Loading"
        />
      ) : (
        <View style={styles.contentContainer}>
          {leftIcon && <Icon name={leftIcon} size={20} color={iconColor} />}
          <Text style={textStyles}>{title}</Text>
          {rightIcon && <Icon name={rightIcon} size={20} color={iconColor} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: components.button.height,
    borderRadius: components.button.borderRadius,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    // @ts-ignore - web only
    cursor: 'pointer',
    userSelect: 'none',
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: colors.primary.DEFAULT,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.dark,
  },
  secondary: {
    backgroundColor: colors.primary.subtle,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
    borderBottomWidth: 2,
    borderBottomColor: '#B91C1C',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.wide,
  },
  primaryText: {
    color: colors.white,
  },
  secondaryText: {
    color: colors.primary.DEFAULT,
  },
  ghostText: {
    color: colors.primary.DEFAULT,
  },
  dangerText: {
    color: colors.white,
  },
  disabledText: {
    opacity: 0.7,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  textWithRightIcon: {
    marginRight: spacing.sm,
  },
});
