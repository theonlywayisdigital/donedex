/**
 * Push Notification Service (Web stub)
 * Web doesn't support Expo push notifications.
 */

/**
 * Register for push notifications - no-op on web.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

/**
 * Save push token - no-op on web.
 */
export async function savePushToken(_token: string): Promise<void> {
  // No-op on web
}

/**
 * Remove push token - no-op on web.
 */
export async function removePushToken(_token: string): Promise<void> {
  // No-op on web
}

/**
 * Add notification received listener - no-op on web.
 */
export function addNotificationReceivedListener(_callback: (notification: unknown) => void) {
  return { remove: () => {} };
}

/**
 * Add notification response listener - no-op on web.
 */
export function addNotificationResponseListener(_callback: (response: unknown) => void) {
  return { remove: () => {} };
}
