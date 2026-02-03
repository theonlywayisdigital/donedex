import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { FIELD_TYPE_CONFIG, isCompositeFieldType, COMPOSITE_DEFINITIONS } from '../../constants/fieldTypes';
import { ItemType } from '../../services/templates';
import { FieldTypeCategory } from './FieldTypeCategoryPicker';
import { FieldTypeMiniPreview } from './FieldTypeMiniPreview';
import { Icon, ProBadge, UpgradeModal } from '../ui';
import { useBillingStore } from '../../store/billingStore';

interface FieldTypeListPickerProps {
  visible: boolean;
  category: FieldTypeCategory | null;
  currentType: ItemType;
  onClose: () => void;
  onBack: () => void;
  onSelectType: (type: ItemType) => void;
}

export function FieldTypeListPicker({
  visible,
  category,
  currentType,
  onClose,
  onBack,
  onSelectType,
}: FieldTypeListPickerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const modalMaxWidth = Math.min(400, windowWidth - spacing.lg * 2);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedProFeature, setSelectedProFeature] = useState('');
  const isFieldTypeAllowed = useBillingStore((state) => state.isFieldTypeAllowed);

  if (!category) return null;

  // Filter to only types that have config defined
  const availableTypes = category.types.filter(
    (type) => FIELD_TYPE_CONFIG[type]
  );

  const handleTypePress = (type: string, label: string) => {
    if (isFieldTypeAllowed(type)) {
      onSelectType(type as ItemType);
    } else {
      setSelectedProFeature(label);
      setShowUpgradeModal(true);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={[styles.container, { maxWidth: modalMaxWidth }]} onStartShouldSetResponder={() => true}>
            {/* Header with Back Button */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
              >
                <Icon name="arrow-left" size={20} color={colors.primary.DEFAULT} />
              </TouchableOpacity>
              <Text style={styles.title}>{category.label}</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Types List */}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {availableTypes.map((type) => {
                const config = FIELD_TYPE_CONFIG[type];
                const isSelected = currentType === type;
                const isAllowed = isFieldTypeAllowed(type);
                const isComposite = isCompositeFieldType(type);
                const compositeDefinition = isComposite ? COMPOSITE_DEFINITIONS[type] : null;

                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeRow,
                      isComposite && styles.typeRowComposite,
                      isSelected && styles.typeRowSelected,
                      !isAllowed && styles.typeRowDisabled,
                    ]}
                    onPress={() => handleTypePress(type, config.label)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.miniPreviewContainer}>
                      <FieldTypeMiniPreview type={type as ItemType} />
                    </View>
                    <View style={styles.typeInfo}>
                      <View style={styles.typeLabelRow}>
                        <Text
                          style={[
                            styles.typeLabel,
                            isSelected && styles.typeLabelSelected,
                            !isAllowed && styles.typeLabelDisabled,
                          ]}
                        >
                          {config.label}
                        </Text>
                        {!isAllowed && <ProBadge size="sm" style={styles.proBadge} />}
                      </View>
                      <Text
                        style={[
                          styles.typeDescription,
                          !isAllowed && styles.typeDescriptionDisabled,
                        ]}
                      >
                        {config.description}
                      </Text>
                      {/* Show sub-fields preview for composite types */}
                      {isComposite && compositeDefinition && (
                        <View style={styles.subFieldsPreview}>
                          <Text style={styles.subFieldsLabel}>Includes:</Text>
                          <View style={styles.subFieldsList}>
                            {compositeDefinition.subFields.map((subField, index) => (
                              <View key={subField.key} style={styles.subFieldChip}>
                                <Text style={styles.subFieldChipText}>
                                  {subField.label}
                                  {subField.required && <Text style={styles.requiredStar}> *</Text>}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </View>
                    {isSelected && isAllowed && (
                      <Icon name="check" size={20} color={colors.primary.DEFAULT} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={selectedProFeature}
        description={`The ${selectedProFeature} field type is only available on the Pro plan. Upgrade to unlock all field types.`}
      />
    </>
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
    maxWidth: 400,
    maxHeight: '80%',
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    minHeight: 48,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Balance the back button
  },
  list: {
    padding: spacing.md,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    minHeight: 72,
  },
  typeRowComposite: {
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  typeRowSelected: {
    backgroundColor: colors.primary.light,
  },
  typeRowDisabled: {
    opacity: 0.7,
  },
  miniPreviewContainer: {
    width: 48,
    height: 48,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  typeLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  typeLabelSelected: {
    color: colors.primary.DEFAULT,
  },
  typeLabelDisabled: {
    color: colors.neutral[500],
  },
  proBadge: {
    marginLeft: spacing.xs,
  },
  typeDescription: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  typeDescriptionDisabled: {
    color: colors.neutral[300],
  },
  cancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
  // Sub-fields preview styles
  subFieldsPreview: {
    marginTop: spacing.sm,
  },
  subFieldsLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  subFieldsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  subFieldChip: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  subFieldChipText: {
    fontSize: fontSize.caption,
    color: colors.text.primary,
  },
  requiredStar: {
    color: colors.danger,
    fontWeight: fontWeight.bold,
  },
});
