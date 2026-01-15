/**
 * Donedex Configuration
 */

// Supabase configuration (loaded from environment)
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// App configuration
export const APP_CONFIG = {
  // Photo settings
  photo: {
    maxWidth: 2000,
    maxHeight: 2000,
    quality: 0.8,
    format: 'jpeg' as const,
  },

  // Storage paths
  storage: {
    reportPhotos: 'report-photos',
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
  },
} as const;
