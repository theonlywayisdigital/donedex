/**
 * WebContainer - Responsive container for web layouts
 * On mobile: full width
 * On tablet/desktop: centered with max-width and optional sidebar space
 */

import React from 'react';
import { View, StyleSheet, Platform, Dimensions, ViewStyle } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { colors } from '../../constants/theme';

interface WebContainerProps {
  children: React.ReactNode;
  /** Maximum width for the main content area */
  maxWidth?: number;
  /** Whether to show a sidebar layout on desktop */
  withSidebar?: boolean;
  /** Background color for the outer area */
  outerBackground?: string;
  /** Background color for the content area */
  contentBackground?: string;
  /** Whether to add shadow to content area on web */
  withShadow?: boolean;
}

// Get window height for web min-height
const windowHeight = Dimensions.get('window').height;

// Web-specific styles that use CSS values (typed as any since these are CSS-only)
const webStyles: Record<string, any> = Platform.OS === 'web' ? {
  outerContainer: {
    minHeight: '100vh',
  },
  contentContainer: {
    minHeight: '100vh',
  },
  contentShadow: {
    boxShadow: '0 0 20px rgba(0, 0, 0, 0.1)',
  },
  appShell: {
    minHeight: '100vh',
  },
  sidebar: {
    height: '100vh',
    position: 'sticky',
    top: 0,
  },
  cardWeb: {
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
} : {};

export function WebContainer({
  children,
  maxWidth = 1200,
  withSidebar = false,
  outerBackground = colors.neutral[100],
  contentBackground = colors.background,
  withShadow = true,
}: WebContainerProps) {
  const { isWeb, isDesktop, isTablet, width } = useResponsive();

  // On native or mobile web, just render children directly
  if (!isWeb || (!isDesktop && !isTablet)) {
    return <>{children}</>;
  }

  // Calculate content width based on screen size
  const contentWidth = Math.min(width - 48, maxWidth);

  return (
    <View
      style={[
        styles.outerContainer,
        webStyles.outerContainer,
        { backgroundColor: outerBackground }
      ]}
    >
      <View
        style={[
          styles.contentContainer,
          webStyles.contentContainer,
          {
            maxWidth: contentWidth,
            backgroundColor: contentBackground,
          },
          withShadow && webStyles.contentShadow,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * AppShell - Full app layout with optional navigation sidebar for web
 * Provides a more "desktop app" feel on larger screens
 */
interface AppShellProps {
  children: React.ReactNode;
  /** Sidebar content (navigation, etc.) */
  sidebar?: React.ReactNode;
  /** Width of the sidebar */
  sidebarWidth?: number;
  /** Whether sidebar is collapsed */
  sidebarCollapsed?: boolean;
}

export function AppShell({
  children,
  sidebar,
  sidebarWidth = 280,
  sidebarCollapsed = false,
}: AppShellProps) {
  const { isWeb, isDesktop } = useResponsive();

  // On native or non-desktop, just render children
  if (!isWeb || !isDesktop || !sidebar) {
    return <>{children}</>;
  }

  const actualSidebarWidth = sidebarCollapsed ? 72 : sidebarWidth;

  return (
    <View style={[styles.appShell, webStyles.appShell]}>
      <View style={[styles.sidebar, webStyles.sidebar, { width: actualSidebarWidth }]}>
        {sidebar}
      </View>
      <View style={styles.mainContent}>
        {children}
      </View>
    </View>
  );
}

/**
 * ContentCard - A card wrapper that adds proper spacing on web
 */
interface ContentCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function ContentCard({ children, style }: ContentCardProps) {
  const { isWeb, isTablet } = useResponsive();

  return (
    <View
      style={[
        styles.card,
        isWeb && isTablet && webStyles.cardWeb,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    width: '100%',
  },
  appShell: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.border.DEFAULT,
  },
  mainContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
  },
});
