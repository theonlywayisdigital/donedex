import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon, IconName, ProBadge, UpgradeModal } from '../ui';
import { useBillingStore } from '../../store/billingStore';
import { getCompositeFieldTypes } from '../../constants/fieldTypes';

export interface FieldTypeCategory {
  key: string;
  label: string;
  icon: IconName;
  subtitle: string;
  types: string[];
}

// 7 consolidated categories (including Field Groups)
export const FIELD_TYPE_CATEGORIES_V2: FieldTypeCategory[] = [
  {
    key: 'groups',
    label: 'Field Groups',
    icon: 'layers',
    subtitle: 'Name, Address, Vehicle',
    types: getCompositeFieldTypes(),
  },
  {
    key: 'basic',
    label: 'Basic Checks',
    icon: 'check-circle',
    subtitle: 'Pass/Fail, Yes/No',
    types: ['pass_fail', 'yes_no', 'condition', 'severity', 'text', 'number', 'select', 'multi_select', 'coloured_selection'],
  },
  {
    key: 'rating',
    label: 'Ratings & Scales',
    icon: 'star',
    subtitle: 'Stars, Slider',
    types: ['rating', 'rating_numeric', 'slider', 'traffic_light'],
  },
  {
    key: 'datetime',
    label: 'Date & Time',
    icon: 'calendar',
    subtitle: 'Date, Expiry',
    types: ['date', 'time', 'datetime', 'expiry_date'],
  },
  {
    key: 'evidence',
    label: 'Evidence & Media',
    icon: 'camera',
    subtitle: 'Photos, Signature',
    types: ['photo', 'photo_before_after', 'signature', 'annotated_photo'],
  },
  {
    key: 'measurement',
    label: 'Measurements',
    icon: 'ruler',
    subtitle: 'Counter, Temp',
    types: ['counter', 'measurement', 'temperature', 'meter_reading', 'currency'],
  },
  {
    key: 'advanced',
    label: 'Advanced',
    icon: 'settings',
    subtitle: 'Conditional, etc.',
    types: ['gps_location', 'barcode_scan', 'asset_lookup', 'person_picker', 'contractor', 'witness', 'instruction', 'checklist', 'declaration', 'title', 'paragraph'],
  },
];

interface FieldTypeCategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory: (category: FieldTypeCategory) => void;
}

export function FieldTypeCategoryPicker({
  visible,
  onClose,
  onSelectCategory,
}: FieldTypeCategoryPickerProps) {
  const { width: windowWidth } = useWindowDimensions();
  const modalMaxWidth = Math.min(400, windowWidth - spacing.lg * 2);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedProFeature, setSelectedProFeature] = useState('');
  const isCategoryAllowed = useBillingStore((state) => state.isCategoryAllowed);

  const handleCategoryPress = (category: FieldTypeCategory) => {
    if (isCategoryAllowed(category.key)) {
      onSelectCategory(category);
    } else {
      setSelectedProFeature(category.label);
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
            <Text style={styles.title}>Select Field Type</Text>
            <Text style={styles.subtitle}>Choose a category</Text>

            <View style={styles.grid}>
              {FIELD_TYPE_CATEGORIES_V2.map((category) => {
                const isAllowed = isCategoryAllowed(category.key);
                return (
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.categoryCard,
                      !isAllowed && styles.categoryCardDisabled,
                    ]}
                    onPress={() => handleCategoryPress(category)}
                    activeOpacity={0.7}
                  >
                    {!isAllowed && (
                      <View style={styles.proBadgeContainer}>
                        <ProBadge size="sm" />
                      </View>
                    )}
                    <View style={styles.categoryIconContainer}>
                      <Icon
                        name={category.icon}
                        size={28}
                        color={isAllowed ? colors.primary.DEFAULT : colors.neutral[300]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        !isAllowed && styles.categoryLabelDisabled,
                      ]}
                    >
                      {category.label}
                    </Text>
                    <Text
                      style={[
                        styles.categorySubtitle,
                        !isAllowed && styles.categorySubtitleDisabled,
                      ]}
                    >
                      {category.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

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
        description={`${selectedProFeature} field types are only available on the Pro plan. Upgrade to unlock all field types and categories.`}
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
    padding: spacing.lg,
    ...shadows.modal,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    minHeight: 100,
    backgroundColor: colors.neutral[50],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryCardDisabled: {
    opacity: 0.7,
    backgroundColor: colors.neutral[100],
  },
  proBadgeContainer: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  categoryIconContainer: {
    marginBottom: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  categoryLabelDisabled: {
    color: colors.neutral[500],
  },
  categorySubtitle: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
  },
  categorySubtitleDisabled: {
    color: colors.neutral[300],
  },
  cancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },
});
