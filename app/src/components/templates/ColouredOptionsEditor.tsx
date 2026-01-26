import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from '../ui';

interface ColouredOption {
  label: string;
  color: string;
}

interface ColouredOptionsEditorProps {
  visible: boolean;
  options: ColouredOption[];
  onSave: (options: ColouredOption[]) => void;
  onClose: () => void;
}

// Predefined color palette
const COLOR_PALETTE = [
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6B7280', // Gray
  '#1F2937', // Dark
];

export function ColouredOptionsEditor({
  visible,
  options: initialOptions,
  onSave,
  onClose,
}: ColouredOptionsEditorProps) {
  const { width: windowWidth } = useWindowDimensions();
  const modalMaxWidth = Math.min(500, windowWidth - spacing.lg * 2);

  const [options, setOptions] = useState<ColouredOption[]>(initialOptions);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);

  const handleAddOption = () => {
    const usedColors = options.map((o) => o.color);
    const availableColor = COLOR_PALETTE.find((c) => !usedColors.includes(c)) || COLOR_PALETTE[0];
    setOptions([
      ...options,
      { label: `Option ${options.length + 1}`, color: availableColor },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return; // Minimum 2 options
    setOptions(options.filter((_, i) => i !== index));
    if (editingColorIndex === index) {
      setEditingColorIndex(null);
    }
  };

  const handleUpdateLabel = (index: number, label: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], label };
    setOptions(newOptions);
  };

  const handleUpdateColor = (index: number, color: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], color };
    setOptions(newOptions);
    setEditingColorIndex(null);
  };

  const handleSave = () => {
    // Filter out empty labels
    const validOptions = options.filter((o) => o.label.trim().length > 0);
    if (validOptions.length >= 2) {
      onSave(validOptions);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOptions = [...options];
    [newOptions[index - 1], newOptions[index]] = [newOptions[index], newOptions[index - 1]];
    setOptions(newOptions);
  };

  const handleMoveDown = (index: number) => {
    if (index === options.length - 1) return;
    const newOptions = [...options];
    [newOptions[index], newOptions[index + 1]] = [newOptions[index + 1], newOptions[index]];
    setOptions(newOptions);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.container, { maxWidth: modalMaxWidth }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Coloured Options</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon name="x" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.subtitle}>
              Configure the options that users can select from. Each option has a label and color.
            </Text>

            {options.map((option, index) => (
              <View key={index} style={styles.optionRow}>
                <View style={styles.optionReorderButtons}>
                  <TouchableOpacity
                    style={[styles.reorderButton, index === 0 && styles.reorderButtonDisabled]}
                    onPress={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <Icon name="chevron-up" size={16} color={index === 0 ? colors.neutral[300] : colors.text.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderButton, index === options.length - 1 && styles.reorderButtonDisabled]}
                    onPress={() => handleMoveDown(index)}
                    disabled={index === options.length - 1}
                  >
                    <Icon name="chevron-down" size={16} color={index === options.length - 1 ? colors.neutral[300] : colors.text.secondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.colorButton, { backgroundColor: option.color }]}
                  onPress={() => setEditingColorIndex(editingColorIndex === index ? null : index)}
                >
                  {editingColorIndex === index && (
                    <Icon name="check" size={16} color={colors.white} />
                  )}
                </TouchableOpacity>

                <TextInput
                  style={styles.labelInput}
                  value={option.label}
                  onChangeText={(text) => handleUpdateLabel(index, text)}
                  placeholder="Option label"
                  placeholderTextColor={colors.text.tertiary}
                />

                <TouchableOpacity
                  style={[styles.deleteButton, options.length <= 2 && styles.deleteButtonDisabled]}
                  onPress={() => handleRemoveOption(index)}
                  disabled={options.length <= 2}
                >
                  <Icon name="trash-2" size={18} color={options.length <= 2 ? colors.neutral[300] : colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Color palette picker */}
            {editingColorIndex !== null && (
              <View style={styles.colorPalette}>
                <Text style={styles.colorPaletteLabel}>Select a color:</Text>
                <View style={styles.colorGrid}>
                  {COLOR_PALETTE.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.paletteColor,
                        { backgroundColor: color },
                        options[editingColorIndex]?.color === color && styles.paletteColorSelected,
                      ]}
                      onPress={() => handleUpdateColor(editingColorIndex, color)}
                    >
                      {options[editingColorIndex]?.color === color && (
                        <Icon name="check" size={14} color={colors.white} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.addButton} onPress={handleAddOption}>
              <Icon name="plus" size={18} color={colors.primary.DEFAULT} />
              <Text style={styles.addButtonText}>Add Option</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, options.length < 2 && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={options.length < 2}
            >
              <Text style={styles.saveButtonText}>Save Options</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    width: '100%',
    maxHeight: '80%',
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionReorderButtons: {
    gap: 2,
  },
  reorderButton: {
    padding: 2,
  },
  reorderButtonDisabled: {
    opacity: 0.5,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    ...shadows.card,
  },
  labelInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  colorPalette: {
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  colorPaletteLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paletteColor: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteColorSelected: {
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.card,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  addButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.md,
    minHeight: 48,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.neutral[300],
  },
  saveButtonText: {
    fontSize: fontSize.body,
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
});
