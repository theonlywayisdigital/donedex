import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { ItemType } from '../../services/templates';
import { Icon } from '../ui';

interface FieldTypeMiniPreviewProps {
  type: ItemType;
  size?: number;
}

export function FieldTypeMiniPreview({ type, size = 40 }: FieldTypeMiniPreviewProps) {
  const renderPreview = () => {
    switch (type) {
      // Basic binary choices
      case 'pass_fail':
        return (
          <View style={styles.buttonRow}>
            <View style={[styles.miniButton, styles.successButton]}>
              <Text style={styles.miniButtonText}>P</Text>
            </View>
            <View style={[styles.miniButton, styles.dangerButton]}>
              <Text style={styles.miniButtonText}>F</Text>
            </View>
          </View>
        );

      case 'yes_no':
        return (
          <View style={styles.buttonRow}>
            <View style={[styles.miniButton, styles.successButton]}>
              <Text style={styles.miniButtonText}>Y</Text>
            </View>
            <View style={[styles.miniButton, styles.dangerButton]}>
              <Text style={styles.miniButtonText}>N</Text>
            </View>
          </View>
        );

      case 'condition':
        return (
          <View style={styles.buttonRow}>
            <View style={[styles.tinyButton, styles.successButton]}>
              <Text style={styles.tinyButtonText}>G</Text>
            </View>
            <View style={[styles.tinyButton, styles.warningButton]}>
              <Text style={styles.tinyButtonText}>F</Text>
            </View>
            <View style={[styles.tinyButton, styles.dangerButton]}>
              <Text style={styles.tinyButtonText}>P</Text>
            </View>
          </View>
        );

      case 'severity':
        return (
          <View style={styles.buttonRow}>
            <View style={[styles.tinyButton, styles.successButton]}>
              <Text style={styles.tinyButtonText}>L</Text>
            </View>
            <View style={[styles.tinyButton, styles.warningButton]}>
              <Text style={styles.tinyButtonText}>M</Text>
            </View>
            <View style={[styles.tinyButton, styles.dangerButton]}>
              <Text style={styles.tinyButtonText}>H</Text>
            </View>
          </View>
        );

      case 'traffic_light':
        return (
          <View style={styles.buttonRow}>
            <View style={[styles.circle, { backgroundColor: colors.success }]} />
            <View style={[styles.circle, { backgroundColor: colors.warning }]} />
            <View style={[styles.circle, { backgroundColor: colors.danger }]} />
          </View>
        );

      // Text inputs
      case 'text':
        return (
          <View style={styles.textInputPreview}>
            <Text style={styles.textInputPlaceholder}>Abc</Text>
          </View>
        );

      case 'number':
        return (
          <View style={styles.textInputPreview}>
            <Text style={styles.textInputPlaceholder}>123</Text>
          </View>
        );

      // Ratings
      case 'rating':
        return (
          <View style={styles.buttonRow}>
            <Icon name="star" size={10} color={colors.warning} />
            <Icon name="star" size={10} color={colors.warning} />
            <Icon name="star" size={10} color={colors.warning} />
            <Icon name="star" size={10} color={colors.neutral[300]} />
            <Icon name="star" size={10} color={colors.neutral[300]} />
          </View>
        );

      case 'rating_numeric':
        return (
          <View style={styles.numericRating}>
            <Text style={styles.numericText}>7/10</Text>
          </View>
        );

      case 'slider':
        return (
          <View style={styles.sliderPreview}>
            <View style={styles.sliderTrack}>
              <View style={styles.sliderFill} />
              <View style={styles.sliderThumb} />
            </View>
          </View>
        );

      // Date/Time
      case 'date':
      case 'expiry_date':
        return (
          <View style={styles.iconContainer}>
            <Icon name="calendar" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'time':
        return (
          <View style={styles.iconContainer}>
            <Icon name="clock" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'datetime':
        return (
          <View style={styles.iconContainer}>
            <Icon name="calendar" size={18} color={colors.text.secondary} />
          </View>
        );

      // Media
      case 'photo':
      case 'photo_before_after':
      case 'annotated_photo':
        return (
          <View style={styles.iconContainer}>
            <Icon name="camera" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'video':
        return (
          <View style={styles.iconContainer}>
            <Icon name="video" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'audio':
        return (
          <View style={styles.iconContainer}>
            <Icon name="mic" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'signature':
        return (
          <View style={styles.iconContainer}>
            <Icon name="pen-tool" size={18} color={colors.text.secondary} />
          </View>
        );

      // Select types
      case 'select':
        return (
          <View style={styles.selectPreview}>
            <Icon name="chevron-down" size={12} color={colors.text.secondary} />
          </View>
        );

      case 'multi_select':
        return (
          <View style={styles.checkboxRow}>
            <View style={[styles.checkbox, styles.checkboxChecked]}>
              <Icon name="check" size={8} color={colors.white} />
            </View>
            <View style={styles.checkbox} />
          </View>
        );

      // Measurements
      case 'counter':
        return (
          <View style={styles.counterPreview}>
            <Text style={styles.counterButton}>-</Text>
            <Text style={styles.counterValue}>5</Text>
            <Text style={styles.counterButton}>+</Text>
          </View>
        );

      case 'measurement':
        return (
          <View style={styles.measurementPreview}>
            <Text style={styles.measurementValue}>12</Text>
            <Text style={styles.measurementUnit}>m</Text>
          </View>
        );

      case 'temperature':
        return (
          <View style={styles.iconContainer}>
            <Icon name="thermometer" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'meter_reading':
        return (
          <View style={styles.iconContainer}>
            <Icon name="gauge" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'currency':
        return (
          <View style={styles.measurementPreview}>
            <Text style={styles.measurementUnit}>£</Text>
            <Text style={styles.measurementValue}>50</Text>
          </View>
        );

      // Location/Assets
      case 'gps_location':
        return (
          <View style={styles.iconContainer}>
            <Icon name="map-pin" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'barcode_scan':
        return (
          <View style={styles.iconContainer}>
            <Icon name="scan" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'asset_lookup':
        return (
          <View style={styles.iconContainer}>
            <Icon name="tag" size={18} color={colors.text.secondary} />
          </View>
        );

      // People
      case 'person_picker':
        return (
          <View style={styles.iconContainer}>
            <Icon name="user" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'contractor':
        return (
          <View style={styles.iconContainer}>
            <Icon name="users" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'witness':
        return (
          <View style={styles.iconContainer}>
            <Icon name="eye" size={18} color={colors.text.secondary} />
          </View>
        );

      // Advanced
      case 'instruction':
        return (
          <View style={styles.iconContainer}>
            <Icon name="info" size={18} color={colors.text.secondary} />
          </View>
        );

      case 'declaration':
        return (
          <View style={styles.checkboxRow}>
            <View style={[styles.checkbox, styles.checkboxChecked]}>
              <Icon name="check" size={8} color={colors.white} />
            </View>
            <View style={styles.declarationLines}>
              <View style={styles.declarationLine} />
              <View style={[styles.declarationLine, { width: '60%' }]} />
            </View>
          </View>
        );

      case 'checklist':
        return (
          <View style={styles.checklistPreview}>
            <View style={styles.checklistItem}>
              <View style={[styles.tinyCheckbox, styles.checkboxChecked]}>
                <Icon name="check" size={6} color={colors.white} />
              </View>
            </View>
            <View style={styles.checklistItem}>
              <View style={styles.tinyCheckbox} />
            </View>
            <View style={styles.checklistItem}>
              <View style={styles.tinyCheckbox} />
            </View>
          </View>
        );

      // Composite Field Groups
      case 'composite_person_name':
        return (
          <View style={styles.compositePreview}>
            <Icon name="user" size={14} color={colors.primary.DEFAULT} />
            <View style={styles.compositeBadge}>
              <Text style={styles.compositeBadgeText}>2</Text>
            </View>
          </View>
        );

      case 'composite_contact':
        return (
          <View style={styles.compositePreview}>
            <Icon name="contact" size={14} color={colors.primary.DEFAULT} />
            <View style={styles.compositeBadge}>
              <Text style={styles.compositeBadgeText}>3</Text>
            </View>
          </View>
        );

      case 'composite_address_uk':
      case 'composite_address_us':
      case 'composite_address_intl':
        return (
          <View style={styles.compositePreview}>
            <Icon name="home" size={14} color={colors.primary.DEFAULT} />
            <View style={styles.compositeBadge}>
              <Text style={styles.compositeBadgeText}>4</Text>
            </View>
          </View>
        );

      case 'composite_vehicle':
        return (
          <View style={styles.compositePreview}>
            <Icon name="car" size={14} color={colors.primary.DEFAULT} />
            <View style={styles.compositeBadge}>
              <Text style={styles.compositeBadgeText}>4</Text>
            </View>
          </View>
        );

      default:
        return (
          <View style={styles.iconContainer}>
            <Icon name="help-circle" size={18} color={colors.text.secondary} />
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {renderPreview()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    overflow: 'hidden',
    padding: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  miniButton: {
    width: 16,
    height: 16,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tinyButton: {
    width: 10,
    height: 10,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: colors.success,
  },
  warningButton: {
    backgroundColor: colors.warning,
  },
  dangerButton: {
    backgroundColor: colors.danger,
  },
  miniButtonText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  tinyButtonText: {
    fontSize: 6,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  circle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  textInputPreview: {
    width: '100%',
    height: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 2,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  textInputPlaceholder: {
    fontSize: 10,
    color: colors.text.secondary,
  },
  numericRating: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  numericText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  sliderPreview: {
    width: '100%',
    paddingHorizontal: 2,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderFill: {
    width: '60%',
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 2,
  },
  sliderThumb: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.DEFAULT,
    marginLeft: -4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectPreview: {
    width: '100%',
    height: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 2,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  selectText: {
    fontSize: 8,
    color: colors.text.secondary,
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  checkbox: {
    width: 12,
    height: 12,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  checkboxChecked: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  counterPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  counterButton: {
    fontSize: 10,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.bold,
  },
  counterValue: {
    fontSize: 10,
    color: colors.text.primary,
    fontWeight: fontWeight.bold,
    minWidth: 12,
    textAlign: 'center',
  },
  measurementPreview: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  measurementValue: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  measurementUnit: {
    fontSize: 8,
    color: colors.text.secondary,
  },
  declarationLines: {
    flex: 1,
    gap: 2,
  },
  declarationLine: {
    height: 2,
    backgroundColor: colors.neutral[200],
    borderRadius: 1,
    width: '100%',
  },
  checklistPreview: {
    gap: 2,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tinyCheckbox: {
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  // Composite field preview
  compositePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  compositeBadge: {
    backgroundColor: colors.primary.light,
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compositeBadgeText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
});
