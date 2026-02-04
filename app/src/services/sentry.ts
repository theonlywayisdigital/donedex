/**
 * Sentry Error Reporting Service
 * Stub implementation - Sentry is currently disabled.
 * This file provides type declarations for platform-specific implementations.
 */

/**
 * Initialize Sentry - no-op (disabled)
 */
export function initSentry() {
  // Sentry disabled
}

/**
 * Capture an exception - logs to console
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  console.error('[Error]', error.message, context);
}

/**
 * Set user context - no-op (disabled)
 */
export function setUser(_userId: string, _email?: string) {
  // Sentry disabled
}

/**
 * Clear user context - no-op (disabled)
 */
export function clearUser() {
  // Sentry disabled
}

/**
 * Add a breadcrumb - no-op (disabled)
 */
export function addBreadcrumb(_message: string, _category?: string, _data?: Record<string, unknown>) {
  // Sentry disabled
}

// Export empty Sentry object for compatibility
export const Sentry = {
  init: () => {},
  captureException: (e: Error) => console.error(e),
  setUser: () => {},
  withScope: () => {},
  addBreadcrumb: () => {},
};
