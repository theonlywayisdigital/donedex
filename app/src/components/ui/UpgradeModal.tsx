import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../constants/theme';
import { Icon } from './Icon';
import { Button } from './Button';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  description?: string;
}

/**
 * UpgradeModal - Shows when Free users try to access Pro features
 * Prompts users to upgrade to Pro plan to unlock the feature
 */
export function UpgradeModal({
  visible,
  onClose,
  feature,
  description,
}: UpgradeModalProps) {
  const navigation = useNavigation<any>();

  const handleUpgrade = () => {
    onClose();
    // Navigate to billing screen
    navigation.navigate('Billing');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Close button */}
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Icon name="x" size={24} color={colors.text.secondary} />
              </TouchableOpacity>

              {/* Icon */}
              <View style={styles.iconContainer}>
                <Icon name="crown" size={40} color={colors.primary.DEFAULT} />
              </View>

              {/* Title */}
              <Text style={styles.title}>Upgrade to Pro</Text>

              {/* Feature name */}
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>{feature}</Text>
              </View>

              {/* Description */}
              <Text style={styles.description}>
                {description || `${feature} is a Pro feature. Upgrade your plan to unlock this and many more powerful features.`}
              </Text>

              {/* Benefits list */}
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <Icon name="check" size={16} color={colors.success} />
                  <Text style={styles.benefitText}>All field types and categories</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check" size={16} color={colors.success} />
                  <Text style={styles.benefitText}>Photo attachments</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check" size={16} color={colors.success} />
                  <Text style={styles.benefitText}>AI Template Builder</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check" size={16} color={colors.success} />
                  <Text style={styles.benefitText}>Custom branding</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Icon name="check" size={16} color={colors.success} />
                  <Text style={styles.benefitText}>Starter templates</Text>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.buttons}>
                <Button
                  title="Upgrade to Pro"
                  onPress={handleUpgrade}
                  fullWidth
                  leftIcon="arrow-up-right"
                />
                <TouchableOpacity style={styles.laterButton} onPress={onClose}>
                  <Text style={styles.laterText}>Maybe later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...shadows.modal,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  featureBadge: {
    backgroundColor: colors.primary.light,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  featureText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary.DEFAULT,
  },
  description: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  benefitsList: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  benefitText: {
    fontSize: fontSize.body,
    color: colors.text.primary,
  },
  buttons: {
    width: '100%',
    gap: spacing.sm,
  },
  laterButton: {
    padding: spacing.sm,
    alignItems: 'center',
  },
  laterText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
});
