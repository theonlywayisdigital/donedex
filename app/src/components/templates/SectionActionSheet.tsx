import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../ui';

interface SectionActionSheetProps {
  visible: boolean;
  sectionName: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onClose: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onDelete: () => void;
}

export function SectionActionSheet({
  visible,
  sectionName,
  canMoveUp,
  canMoveDown,
  onClose,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  onDelete,
}: SectionActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {sectionName || 'Section'}
            </Text>
            <Text style={styles.headerSubtitle}>Actions</Text>
          </View>

          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onDuplicate();
                onClose();
              }}
            >
              <View style={styles.actionIconContainer}>
                <Icon name="copy" size={20} color={colors.text.secondary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionLabel}>Duplicate Section</Text>
                <Text style={styles.actionDescription}>
                  Create a copy with all items
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionGroup}>
            <Text style={styles.groupLabel}>Move Section</Text>

            {canMoveUp && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onMoveUp();
                  onClose();
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="arrow-up" size={20} color={colors.text.secondary} />
                </View>
                <Text style={styles.actionLabel}>Move Up</Text>
              </TouchableOpacity>
            )}

            {canMoveDown && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onMoveDown();
                  onClose();
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="arrow-down" size={20} color={colors.text.secondary} />
                </View>
                <Text style={styles.actionLabel}>Move Down</Text>
              </TouchableOpacity>
            )}

            {canMoveUp && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onMoveToTop();
                  onClose();
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="chevrons-up" size={20} color={colors.text.secondary} />
                </View>
                <Text style={styles.actionLabel}>Move to Top</Text>
              </TouchableOpacity>
            )}

            {canMoveDown && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onMoveToBottom();
                  onClose();
                }}
              >
                <View style={styles.actionIconContainer}>
                  <Icon name="chevrons-down" size={20} color={colors.text.secondary} />
                </View>
                <Text style={styles.actionLabel}>Move to Bottom</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onDelete();
                onClose();
              }}
            >
              <View style={styles.actionIconContainer}>
                <Icon name="trash-2" size={20} color={colors.danger} />
              </View>
              <Text style={[styles.actionLabel, styles.dangerText]}>Delete Section</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingBottom: spacing.xl,
    ...shadows.modal,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actionGroup: {
    paddingVertical: spacing.sm,
  },
  groupLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  actionIconContainer: {
    width: 32,
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  actionDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  dangerText: {
    color: colors.danger,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
    marginHorizontal: spacing.lg,
  },
  cancelButton: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
});
