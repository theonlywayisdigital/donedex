/**
 * DesktopLayout - Desktop app shell with sidebar and content area
 * Only used on web desktop; on mobile, renders children directly
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';

interface DesktopLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}

// Web-specific styles
const webStyles: Record<string, React.CSSProperties> = Platform.OS === 'web' ? {
  container: {
    minHeight: '100vh',
  },
  content: {
    minHeight: '100vh',
    overflowY: 'auto' as const,
  },
} : {};

export function DesktopLayout({ children, sidebar }: DesktopLayoutProps) {
  const { isWeb, isDesktop } = useResponsive();

  // On native or non-desktop web, render children directly
  if (!isWeb || !isDesktop) {
    return <>{children}</>;
  }

  return (
    <View
      style={[styles.container, webStyles.container as any]}
    >
      {/* Sidebar */}
      {sidebar}

      {/* Main content area */}
      <View style={[styles.content, webStyles.content as any]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default DesktopLayout;
