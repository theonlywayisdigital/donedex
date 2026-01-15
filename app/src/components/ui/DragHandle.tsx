import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing, borderRadius } from '../../constants/theme';

interface DragHandleProps {
  /** Function to call when drag is initiated */
  drag: () => void;
  /** Whether the item is currently being dragged */
  isActive: boolean;
}

/**
 * A drag handle component for reorderable lists.
 * Long-press to initiate drag.
 */
export function DragHandle({ drag, isActive }: DragHandleProps) {
  return (
    <TouchableOpacity
      onLongPress={drag}
      delayLongPress={100}
      style={[styles.handle, isActive && styles.handleActive]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon
        name="grip-vertical"
        size={20}
        color={isActive ? colors.primary.DEFAULT : colors.text.tertiary}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  handle: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleActive: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
  },
});
