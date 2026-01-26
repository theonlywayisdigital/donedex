/**
 * Sidebar - Modern desktop navigation sidebar for web
 * Inspired by apps like Linear, Notion, Slack
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon, type IconName } from '../ui';
import { NotificationBell } from '../notifications';
import { useAuthStore } from '../../store/authStore';

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
  showNotifications?: boolean;
}

// Sidebar dimensions
const SIDEBAR_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 68;
const ITEM_HEIGHT = 40;

// Modern sidebar colors
const sidebarColors = {
  background: '#1a1d21', // Dark charcoal
  backgroundHover: '#2a2d31',
  backgroundActive: 'rgba(15, 76, 92, 0.3)', // Primary with transparency
  border: '#2a2d31',
  text: '#b4b7bc',
  textActive: '#ffffff',
  textMuted: '#6b6f76',
  accent: colors.primary.DEFAULT,
};

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
    transition: 'all 0.15s ease',
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
  const userProfile = useAuthStore((state) => state.profile);
  const organisation = useAuthStore((state) => state.organisation);

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
          webStyles.item as any,
        ]}
      >
        <View style={styles.itemContent}>
          <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
            <Icon
              name={item.icon}
              size={18}
              color={isActive ? sidebarColors.textActive : sidebarColors.text}
            />
          </View>
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
        {isActive && <View style={styles.activeIndicator} />}
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
        {collapsed && index > 0 && (
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
      {/* Header with org/branding */}
      <View style={styles.header}>
        {headerContent || (
          <View style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <Text style={styles.brandIconText}>
                {organisation?.name?.charAt(0)?.toUpperCase() || 'D'}
              </Text>
            </View>
            {!collapsed && (
              <View style={styles.brandInfo}>
                <Text style={styles.brandName} numberOfLines={1}>
                  {organisation?.name || 'Donedex'}
                </Text>
                <Text style={styles.brandPlan} numberOfLines={1}>
                  {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'Team Member'}
                </Text>
              </View>
            )}
          </View>
        )}
        {!collapsed && onCollapsedChange && (
          <Pressable
            style={({ hovered }: any) => [
              styles.collapseButton,
              hovered && styles.collapseButtonHovered,
            ]}
            onPress={() => onCollapsedChange(!collapsed)}
          >
            <Icon
              name="panel-left-close"
              size={16}
              color={sidebarColors.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* Navigation items */}
      <ScrollView
        style={[styles.scrollContainer, webStyles.scrollContainer as any]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sections.map(renderSection)}
      </ScrollView>

      {/* Footer with user info */}
      <View style={styles.footer}>
        {footerContent || (
          <Pressable
            style={({ hovered }: any) => [
              styles.userSection,
              hovered && styles.userSectionHovered,
            ]}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {userProfile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            {!collapsed && (
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {userProfile?.full_name || 'User'}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {userProfile?.email || ''}
                </Text>
              </View>
            )}
            {!collapsed && (
              <Icon name="settings" size={16} color={sidebarColors.textMuted} />
            )}
          </Pressable>
        )}
      </View>

      {/* Expand button when collapsed */}
      {collapsed && onCollapsedChange && (
        <Pressable
          style={styles.expandButton}
          onPress={() => onCollapsedChange(false)}
        >
          <Icon name="panel-left-open" size={16} color={sidebarColors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: sidebarColors.background,
    flexDirection: 'column',
    borderRightWidth: 1,
    borderRightColor: sidebarColors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: sidebarColors.border,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandIconText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    color: sidebarColors.textActive,
  },
  brandPlan: {
    fontSize: fontSize.caption - 1,
    color: sidebarColors.textMuted,
  },
  collapseButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseButtonHovered: {
    backgroundColor: sidebarColors.backgroundHover,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.sm,
  },
  section: {
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: sidebarColors.textMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: sidebarColors.border,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(15, 76, 92, 0.2)',
  },
  itemActive: {
    backgroundColor: sidebarColors.backgroundActive,
  },
  itemHovered: {
    backgroundColor: sidebarColors.backgroundHover,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -8,
    width: 3,
    height: 16,
    backgroundColor: colors.primary.DEFAULT,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  itemLabel: {
    flex: 1,
    fontSize: fontSize.body - 1,
    fontWeight: fontWeight.medium,
    color: sidebarColors.text,
  },
  itemLabelActive: {
    color: sidebarColors.textActive,
    fontWeight: fontWeight.semibold,
  },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: sidebarColors.border,
    padding: spacing.sm,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  userSectionHovered: {
    backgroundColor: sidebarColors.backgroundHover,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: sidebarColors.backgroundHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 13,
    fontWeight: fontWeight.semibold,
    color: sidebarColors.text,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.body - 1,
    fontWeight: fontWeight.medium,
    color: sidebarColors.textActive,
  },
  userEmail: {
    fontSize: fontSize.caption - 1,
    color: sidebarColors.textMuted,
  },
  expandButton: {
    position: 'absolute',
    bottom: spacing.md,
    left: '50%',
    marginLeft: -14,
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: sidebarColors.backgroundHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Sidebar;
