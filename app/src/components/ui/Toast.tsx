import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Icon, IconName } from './Icon';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '../../constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  icon: IconName;
  color: string;
  backgroundColor: string;
}

const toastConfig: Record<ToastType, ToastConfig> = {
  success: {
    icon: 'check-circle',
    color: colors.success,
    backgroundColor: '#ECFDF5',
  },
  error: {
    icon: 'x-circle',
    color: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  warning: {
    icon: 'alert-triangle',
    color: colors.warning,
    backgroundColor: '#FFFBEB',
  },
  info: {
    icon: 'info',
    color: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
};

export interface ToastProps {
  type: ToastType;
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function Toast({
  type,
  message,
  visible,
  onHide,
  duration = 3000,
  action,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible) return null;

  const config = toastConfig[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.color,
        },
      ]}
    >
      <View style={styles.content}>
        <Icon name={config.icon} size={20} color={config.color} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
      {action && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            action.onPress();
            hideToast();
          }}
        >
          <Text style={[styles.actionText, { color: config.color }]}>
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.closeButton} onPress={hideToast}>
        <Icon name="x" size={16} color={colors.text.secondary} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    ...shadows.elevated,
    zIndex: 9999,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginLeft: spacing.sm,
  },
  actionText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
