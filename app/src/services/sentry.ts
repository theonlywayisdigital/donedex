/**
 * Sentry Error Reporting Service
 * Initializes Sentry for crash reporting and error tracking.
 *
 * Setup: Set SENTRY_DSN in your environment / app config.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = Constants.expoConfig?.extra?.sentryDsn as string | undefined;

/**
 * Initialize Sentry. Call once at app startup.
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured — error reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__, // Only report in production builds
    tracesSampleRate: 0.2, // 20% of transactions for performance monitoring
    sendDefaultPii: false, // Don't send personally identifiable info by default
  });
}

/**
 * Capture an exception and send it to Sentry.
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error('[Sentry] Would report:', error.message);
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Set user context for Sentry (call after login).
 */
export function setUser(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

/**
 * Clear user context (call on logout).
 */
export function clearUser() {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for debugging context.
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category: category ?? 'app',
    data,
    level: 'info',
  });
}

export { Sentry };
