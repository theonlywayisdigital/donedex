/**
 * Donedex Theme Constants
 * Reference: docs/branding.md
 */

export const colors = {
  // Primary palette (Deep Teal)
  primary: {
    DEFAULT: '#0A3D4F',  // Deep Teal - logo, primary buttons, main actions
    dark: '#062A36',     // Pressed states, button depth borders
    mid: '#1B6B82',      // Hover states, secondary actions, highlights
    light: '#E8F4F7',    // Backgrounds, highlights, selected states
    subtle: '#F0F7F9',   // Barely-there tint for secondary button backgrounds
  },

  // Accent palette (Mint)
  accent: {
    DEFAULT: '#00C2A8',  // Vibrant mint teal - highlights, Pro badges
    light: '#E6FAF6',    // Accent backgrounds
    dark: '#00A08A',     // Pressed states
  },

  // Semantic colours
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',

  // Neutrals (Warm Stone)
  neutral: {
    900: '#1C1917',  // Stone - primary text
    700: '#44403C',  // Stone
    500: '#78716C',  // Stone - secondary text, placeholders
    300: '#D6D3D1',  // Stone
    200: '#E7E5E4',  // Stone - borders, dividers
    100: '#F5F5F4',  // Stone
    50: '#FAFAF9',   // Stone - page backgrounds
  },

  white: '#FFFFFF',
  black: '#000000',

  // Semantic aliases
  text: {
    primary: '#1C1917',    // Stone 900
    secondary: '#78716C',  // Stone 500
    tertiary: '#A8A29E',   // Stone 400
  },
  border: {
    DEFAULT: '#E7E5E4',  // Stone 200
    light: '#F5F5F4',    // Stone 100
  },
  background: '#FAFAF9',  // Stone 50
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
  md: 10,    // was 8 - rounder for buttons, inputs, chips
  lg: 14,    // was 12 - rounder for cards
  xl: 20,    // modals, bottom sheets
  full: 9999,
} as const;

export const fontSize = {
  caption: 14,
  body: 16,
  bodyLarge: 18,
  sectionTitle: 20,
  pageTitle: 32,  // was 28 - bolder heading presence
} as const;

export const letterSpacing = {
  tighter: -0.8,  // Large display text
  tight: -0.5,    // Page titles
  normal: 0,      // Body text
  wide: 0.3,      // Buttons, labels
  wider: 0.8,     // Overlines, badges
} as const;

// DM Sans font family
export const fontFamily = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  bold: 'DMSans_700Bold',
  // System font fallbacks
  system: 'System',
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  bold: '700' as const,
};

export const shadows = {
  card: {
    shadowColor: '#0A3D4F',  // Teal-tinted
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0A3D4F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  modal: {
    shadowColor: '#0A3D4F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
  },
  focusRing: {
    shadowColor: '#0A3D4F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 0,
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
    borderWidth: 0,  // was 1 - rely on tinted shadow instead
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
