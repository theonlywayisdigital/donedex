/**
 * DrawerSidebar - Slide-out navigation drawer for mobile/tablet web
 * Used when screen width is below desktop breakpoint
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon, type IconName } from '../ui';
import { type SidebarSection, type SidebarItem } from './Sidebar';

interface DrawerSidebarProps {
  open: boolean;
  onClose: () => void;
  sections: SidebarSection[];
  activeKey?: string;
  userRole?: 'user' | 'admin' | 'owner';
  isSuperAdmin?: boolean;
}

const DRAWER_WIDTH = 280;

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  overlay: {
    cursor: 'pointer' as const,
  },
  drawer: {
    boxShadow: '4px 0 10px rgba(0, 0, 0, 0.15)',
  },
} : {};

export function DrawerSidebar({
  open,
  onClose,
  sections,
  activeKey,
  userRole = 'user',
  isSuperAdmin = false,
}: DrawerSidebarProps) {
  const navigation = useNavigation<any>();

  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const isAdmin = userRole === 'admin' || userRole === 'owner';

  // Filter items based on role
  const filterItems = (items: SidebarItem[]): SidebarItem[] => {
    return items.filter(item => {
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (item.adminOnly && !isAdmin && !isSuperAdmin) return false;
      return true;
    });
  };

  // Handle navigation
  const handlePress = (item: SidebarItem) => {
    navigation.navigate(item.route);
    onClose();
  };

  // Render a single item
  const renderItem = (item: SidebarItem) => {
    const isActive = activeKey === item.key;

    return (
      <Pressable
        key={item.key}
        onPress={() => handlePress(item)}
        style={({ pressed }) => [
          styles.item,
          isActive && styles.itemActive,
          pressed && !isActive && styles.itemPressed,
        ]}
      >
        <Icon
          name={item.icon}
          size={20}
          color={isActive ? colors.primary.DEFAULT : colors.text.secondary}
        />
        <Text
          style={[
            styles.itemLabel,
            isActive && styles.itemLabelActive,
          ]}
        >
          {item.label}
        </Text>
        {item.badge !== undefined && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.badge > 99 ? '99+' : item.badge}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Render a section
  const renderSection = (section: SidebarSection, index: number) => {
    const filteredItems = filterItems(section.items);
    if (filteredItems.length === 0) return null;

    return (
      <View key={index} style={styles.section}>
        {section.title && (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        {filteredItems.map(renderItem)}
      </View>
    );
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      visible={open}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Overlay - tap to close */}
        <Pressable
          style={[styles.overlay, webStyles.overlay as any]}
          onPress={onClose}
        />

        {/* Drawer */}
        <View style={[styles.drawer, webStyles.drawer as any]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoText}>Donedex</Text>
            <Pressable
              style={styles.closeButton}
              onPress={onClose}
            >
              <Icon name="x" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          {/* Navigation items */}
          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {sections.map(renderSection)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  logoText: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text.tertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  itemActive: {
    backgroundColor: colors.primary.light,
  },
  itemPressed: {
    backgroundColor: colors.neutral[100],
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  itemLabelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.bold,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});

export default DrawerSidebar;
