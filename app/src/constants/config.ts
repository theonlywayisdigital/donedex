/**
 * Donedex Configuration
 */

// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCjnvHSOEWABSdhjJfpW-q--B6I2Cllxzk",
  authDomain: "donedex-72116.firebaseapp.com",
  projectId: "donedex-72116",
  storageBucket: "donedex-72116.firebasestorage.app",
  messagingSenderId: "317949580481",
  appId: "1:317949580481:web:11282010bc5ba89d5ff040",
  measurementId: "G-2BBD002MYZ"
};

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
