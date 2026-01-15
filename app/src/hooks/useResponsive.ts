/**
 * useResponsive Hook
 * Provides responsive breakpoint detection for cross-platform layouts
 */

import { useState, useEffect, useCallback } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

/**
 * Breakpoint definitions (matching branding.md)
 */
export const BREAKPOINTS = {
  mobile: 0,     // 0px - Phones
  tablet: 768,   // 768px - iPad Mini and up
  desktop: 1024, // 1024px - iPad Pro landscape, web
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

export interface ResponsiveInfo {
  width: number;
  height: number;
  /** Current breakpoint name */
  breakpoint: BreakpointKey;
  /** True if width >= tablet breakpoint (768px) */
  isTablet: boolean;
  /** True if width >= desktop breakpoint (1024px) */
  isDesktop: boolean;
  /** True if width < tablet breakpoint (768px) */
  isMobile: boolean;
  /** True if running on web platform */
  isWeb: boolean;
  /** True if in landscape orientation */
  isLandscape: boolean;
  /** True if in portrait orientation */
  isPortrait: boolean;
}

/**
 * Get current breakpoint based on width
 */
function getBreakpoint(width: number): BreakpointKey {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Hook to get responsive information about the current screen
 * Updates automatically when dimensions change
 */
export function useResponsive(): ResponsiveInfo {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  const handleChange = useCallback(({ window }: { window: ScaledSize }) => {
    setDimensions(window);
  }, []);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', handleChange);
    return () => subscription?.remove();
  }, [handleChange]);

  const { width, height } = dimensions;
  const breakpoint = getBreakpoint(width);

  return {
    width,
    height,
    breakpoint,
    isTablet: width >= BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.desktop,
    isMobile: width < BREAKPOINTS.tablet,
    isWeb: Platform.OS === 'web',
    isLandscape: width > height,
    isPortrait: height >= width,
  };
}

/**
 * Hook to check if current width matches a specific breakpoint query
 * @param query - Breakpoint query like 'tablet', 'desktop', or custom min/max
 */
export function useBreakpoint(breakpoint: BreakpointKey): boolean {
  const { width } = useResponsive();
  return width >= BREAKPOINTS[breakpoint];
}

/**
 * Hook to get a value based on current breakpoint
 * Falls back to smaller breakpoint values if larger not specified
 */
export function useBreakpointValue<T>(values: Partial<Record<BreakpointKey, T>>): T | undefined {
  const { breakpoint } = useResponsive();

  // Priority: current breakpoint -> smaller breakpoints
  const breakpointOrder: BreakpointKey[] = ['desktop', 'tablet', 'mobile'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  // Look for value at current breakpoint or any smaller breakpoint
  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

/**
 * Utility to create responsive styles
 * Returns appropriate styles based on current breakpoint
 */
export function useResponsiveStyles<T extends Record<string, unknown>>(
  baseStyles: T,
  breakpointStyles?: Partial<Record<BreakpointKey, Partial<T>>>
): T {
  const { breakpoint } = useResponsive();

  if (!breakpointStyles) return baseStyles;

  // Merge base with breakpoint-specific styles
  const breakpointOrder: BreakpointKey[] = ['mobile', 'tablet', 'desktop'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);

  let mergedStyles = { ...baseStyles };

  // Apply styles from smallest to current breakpoint
  for (let i = 0; i <= currentIndex; i++) {
    const bp = breakpointOrder[i];
    if (breakpointStyles[bp]) {
      mergedStyles = { ...mergedStyles, ...breakpointStyles[bp] };
    }
  }

  return mergedStyles;
}

/**
 * Adaptive layout information for desktop-first SaaS web UI
 */
export interface AdaptiveLayoutInfo {
  /** Current layout mode */
  layoutMode: 'desktop' | 'tablet' | 'mobile';
  /** Whether to show sidebar navigation (desktop web only) */
  showSidebar: boolean;
  /** Whether to use table views for data (desktop web only) */
  showTable: boolean;
  /** Whether to use card views for data (mobile/tablet or native) */
  showCards: boolean;
  /** Content padding based on layout */
  contentPadding: number;
  /** Number of grid columns for multi-column layouts */
  gridColumns: 1 | 2 | 3 | 4;
}

/**
 * Hook for adaptive layout decisions
 * Provides helpers for switching between desktop SaaS and mobile layouts
 */
export function useAdaptiveLayout(): AdaptiveLayoutInfo {
  const { isWeb, isDesktop, isTablet, isMobile } = useResponsive();

  // Determine layout mode
  const layoutMode: 'desktop' | 'tablet' | 'mobile' = isDesktop
    ? 'desktop'
    : isTablet
    ? 'tablet'
    : 'mobile';

  // Sidebar only on desktop web
  const showSidebar = isWeb && isDesktop;

  // Tables only on desktop web
  const showTable = isWeb && isDesktop;

  // Cards on mobile, tablet, or native
  const showCards = !showTable;

  // Content padding based on layout
  const contentPadding = isDesktop ? 24 : isTablet ? 16 : 16;

  // Grid columns based on layout
  const gridColumns: 1 | 2 | 3 | 4 = isDesktop ? 4 : isTablet ? 2 : 1;

  return {
    layoutMode,
    showSidebar,
    showTable,
    showCards,
    contentPadding,
    gridColumns,
  };
}

export default useResponsive;
