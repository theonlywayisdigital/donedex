/**
 * Sidebar - Desktop navigation sidebar for web
 * Only renders on web desktop; returns null on mobile/native
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon, type IconName } from '../ui';
import { NotificationBell } from '../notifications';

// Sidebar item definition
export interface SidebarItem {
  key: string;
  label: string;
  icon: IconName;
  route: string;
  badge?: number;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

// Sidebar section with optional title
export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

// Props for the sidebar component
export interface SidebarProps {
  sections: SidebarSection[];
  activeKey?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  userRole?: 'user' | 'admin' | 'owner';
  isSuperAdmin?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  /** Show notification bell in header */
  showNotifications?: boolean;
}

// Sidebar dimensions
const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const ITEM_HEIGHT = 44;

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  sidebar: {
    height: '100vh',
    position: 'sticky' as const,
    top: 0,
    transition: 'width 0.2s ease-in-out',
  },
  item: {
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  scrollContainer: {
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
  },
} : {};

export function Sidebar({
  sections,
  activeKey,
  collapsed = false,
  onCollapsedChange,
  userRole = 'user',
  isSuperAdmin = false,
  headerContent,
  footerContent,
  showNotifications = true,
}: SidebarProps) {
  const navigation = useNavigation<any>();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

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
  };

  // Render a single item
  const renderItem = (item: SidebarItem) => {
    const isActive = activeKey === item.key;
    const isHovered = hoveredKey === item.key;

    return (
      <Pressable
        key={item.key}
        onPress={() => handlePress(item)}
        onHoverIn={() => setHoveredKey(item.key)}
        onHoverOut={() => setHoveredKey(null)}
        style={[
          styles.item,
          isActive && styles.itemActive,
          isHovered && !isActive && styles.itemHovered,
          { height: ITEM_HEIGHT },
        ]}
      >
        <View style={styles.itemContent}>
          <Icon
            name={item.icon}
            size={20}
            color={isActive ? colors.primary.DEFAULT : colors.text.secondary}
          />
          {!collapsed && (
            <Text
              style={[
                styles.itemLabel,
                isActive && styles.itemLabelActive,
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          )}
          {!collapsed && item.badge !== undefined && item.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.badge > 99 ? '99+' : item.badge}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // Render a section
  const renderSection = (section: SidebarSection, index: number) => {
    const filteredItems = filterItems(section.items);
    if (filteredItems.length === 0) return null;

    return (
      <View key={index} style={styles.section}>
        {section.title && !collapsed && (
          <Text style={styles.sectionTitle}>{section.title}</Text>
        )}
        {collapsed && section.title && (
          <View style={styles.sectionDivider} />
        )}
        {filteredItems.map(renderItem)}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.sidebar,
        { width: sidebarWidth },
        webStyles.sidebar as any,
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        {headerContent || (
          <View style={styles.logoContainer}>
            {!collapsed ? (
              <Text style={styles.logoText}>Donedex</Text>
            ) : (
              <Text style={styles.logoTextCollapsed}>DD</Text>
            )}
          </View>
        )}
        <View style={styles.headerActions}>
          {showNotifications && !collapsed && (
            <NotificationBell size={20} color={colors.text.secondary} />
          )}
          {onCollapsedChange && (
            <Pressable
              style={styles.collapseButton}
              onPress={() => onCollapsedChange(!collapsed)}
            >
              <Icon
                name={collapsed ? 'chevron-right' : 'chevron-left'}
                size={18}
                color={colors.text.secondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Navigation items */}
      <ScrollView
        style={[styles.scrollContainer, webStyles.scrollContainer as any]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map(renderSection)}
      </ScrollView>

      {/* Footer */}
      {footerContent && (
        <View style={styles.footer}>
          {footerContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border.DEFAULT,
    flexDirection: 'column',
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
  logoContainer: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoText: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  logoTextCollapsed: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.bold,
    color: colors.primary.DEFAULT,
    textAlign: 'center',
  },
  collapseButton: {
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
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  itemActive: {
    backgroundColor: colors.primary.light,
  },
  itemHovered: {
    backgroundColor: colors.neutral[100],
  },
  itemPressed: {
    backgroundColor: colors.neutral[200],
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  itemLabelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.semibold,
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
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});

export default Sidebar;
