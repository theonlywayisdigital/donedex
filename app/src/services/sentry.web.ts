/**
 * Sentry Error Reporting Service (Web version)
 * Web placeholder - @sentry/react-native doesn't support web.
 * For full web error reporting, use @sentry/browser instead.
 */

/**
 * Initialize Sentry. No-op on web.
 */
export function initSentry() {
  console.log('[Sentry] Web platform - error reporting disabled');
}

/**
 * Capture an exception - logs to console on web.
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  console.error('[Sentry] Would report:', error.message, context);
}

/**
 * Set user context - no-op on web.
 */
export function setUser(_userId: string, _email?: string) {
  // No-op on web
}

/**
 * Clear user context - no-op on web.
 */
export function clearUser() {
  // No-op on web
}

/**
 * Add a breadcrumb - no-op on web.
 */
export function addBreadcrumb(_message: string, _category?: string, _data?: Record<string, unknown>) {
  // No-op on web
}

// Export empty Sentry object for compatibility
export const Sentry = {
  init: () => {},
  captureException: (e: Error) => console.error(e),
  setUser: () => {},
  withScope: () => {},
  addBreadcrumb: () => {},
};
