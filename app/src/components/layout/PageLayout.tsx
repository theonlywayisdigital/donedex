/**
 * PageLayout - Standard page structure for desktop web
 * Provides consistent header with title, breadcrumbs, and actions
 */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';
import { useResponsive } from '../../hooks/useResponsive';

// Breadcrumb item
export interface BreadcrumbItem {
  label: string;
  route?: string;
}

// Page layout props
export interface PageLayoutProps {
  /** Page title */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Breadcrumb navigation path */
  breadcrumbs?: BreadcrumbItem[];
  /** Action buttons for the header */
  actions?: React.ReactNode;
  /** Page content */
  children: React.ReactNode;
  /** Whether to use ScrollView wrapper (default: true) */
  scrollable?: boolean;
  /** Padding for content area */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Background color */
  background?: 'default' | 'white';
}

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  container: {
    minHeight: '100%',
  },
  header: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
  },
  breadcrumbLink: {
    cursor: 'pointer',
  },
} : {};

// Padding values
const PADDING_MAP = {
  none: 0,
  sm: spacing.sm,
  md: spacing.md,
  lg: spacing.lg,
};

export function PageLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
  scrollable = true,
  padding = 'lg',
  background = 'default',
}: PageLayoutProps) {
  const navigation = useNavigation<any>();
  const { isWeb, isDesktop } = useResponsive();
  const showDesktopHeader = isWeb && isDesktop;

  const contentPadding = PADDING_MAP[padding];
  const backgroundColor = background === 'white' ? colors.white : colors.background;

  // Handle breadcrumb navigation
  const handleBreadcrumbPress = (item: BreadcrumbItem) => {
    if (item.route) {
      navigation.navigate(item.route);
    }
  };

  // Render breadcrumbs
  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <View style={styles.breadcrumbs}>
        {breadcrumbs.map((item, index) => (
          <View key={index} style={styles.breadcrumbItem}>
            {index > 0 && (
              <Icon
                name="chevron-right"
                size={14}
                color={colors.text.tertiary}
                style={styles.breadcrumbSeparator}
              />
            )}
            {item.route ? (
              <Pressable
                onPress={() => handleBreadcrumbPress(item)}
                style={webStyles.breadcrumbLink as any}
              >
                <Text style={styles.breadcrumbLink}>{item.label}</Text>
              </Pressable>
            ) : (
              <Text style={styles.breadcrumbCurrent}>{item.label}</Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  // Desktop header with breadcrumbs, title, and actions
  const renderDesktopHeader = () => {
    if (!showDesktopHeader) return null;

    return (
      <View style={[styles.header, webStyles.header as any]}>
        {renderBreadcrumbs()}
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {actions && <View style={styles.actions}>{actions}</View>}
        </View>
      </View>
    );
  };

  // Content wrapper
  const renderContent = () => {
    const contentStyle = [
      styles.content,
      { padding: contentPadding, backgroundColor },
    ];

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      );
    }

    return <View style={contentStyle}>{children}</View>;
  };

  // On mobile, just render children with minimal wrapper
  if (!showDesktopHeader) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={[styles.container, webStyles.container as any, { backgroundColor }]}>
      {renderDesktopHeader()}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    marginHorizontal: spacing.xs,
  },
  breadcrumbLink: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
  },
  breadcrumbCurrent: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.pageTitle,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default PageLayout;
