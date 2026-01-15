/**
 * Donedex Theme Constants
 * Reference: docs/branding.md
 */

export const colors = {
  // Primary palette (Deep Teal)
  primary: {
    DEFAULT: '#0F4C5C',  // Deep Teal - logo, primary buttons, main actions
    dark: '#1F6F8B',     // Medium Blue - hover states, secondary actions
    light: '#E6F2F5',    // Light Blue - backgrounds, highlights, selected states
  },

  // Semantic colours
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',

  // Neutrals
  neutral: {
    900: '#1A1A1A',  // Dark Charcoal - primary text
    700: '#374151',
    500: '#6B7280',  // Mid Grey - secondary text, placeholders
    300: '#D1D5DB',
    200: '#E5E7EB',  // Light Grey - borders, dividers
    100: '#F3F4F6',
    50: '#F9FAFB',   // Page backgrounds
  },

  white: '#FFFFFF',
  black: '#000000',

  // Semantic aliases
  text: {
    primary: '#1A1A1A',    // Dark Charcoal
    secondary: '#6B7280',  // Mid Grey
    tertiary: '#9CA3AF',
  },
  border: {
    DEFAULT: '#E5E7EB',
    light: '#F3F4F6',
  },
  background: '#F9FAFB',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const fontSize = {
  caption: 14,
  body: 16,
  bodyLarge: 18,
  sectionTitle: 20,
  pageTitle: 28,
} as const;

// Inter font family (falls back to system fonts)
export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  // System font fallbacks
  system: 'System',
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 10,
  },
} as const;

// Component-specific constants
export const components = {
  button: {
    height: 48,
    borderRadius: borderRadius.md,
  },
  input: {
    height: 48,
    borderRadius: borderRadius.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  touchTarget: {
    minSize: 48,
  },
} as const;

// Responsive breakpoints
export const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
} as const;

// Web-specific component dimensions
export const webComponents = {
  sidebar: {
    width: 280,
    collapsedWidth: 72,
    itemHeight: 44,
  },
  table: {
    headerHeight: 48,
    rowHeight: 52,
    cellPadding: 16,
  },
  actionBar: {
    height: 56,
  },
  pageHeader: {
    height: 64,
  },
} as const;

export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type WebComponents = typeof webComponents;
