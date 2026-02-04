/**
 * Push Notification Service
 * Base file for TypeScript type declarations.
 * Platform-specific implementations are in .native.ts and .web.ts
 */

// Notification type for listeners
export interface PushNotification {
  request: {
    content: {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    };
  };
}

export interface NotificationResponse {
  notification: PushNotification;
}

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if registration fails or is unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

/**
 * Save push token to the database for the current user
 */
export async function savePushToken(_token: string): Promise<void> {
  // No-op in base implementation
}

/**
 * Remove push token from database (e.g. on sign out)
 */
export async function removePushToken(_token: string): Promise<void> {
  // No-op in base implementation
}

/**
 * Add a listener for when a notification is received while app is foregrounded
 */
export function addNotificationReceivedListener(
  _callback: (notification: PushNotification) => void
): { remove: () => void } {
  return { remove: () => {} };
}

/**
 * Add a listener for when user taps on a notification
 */
export function addNotificationResponseListener(
  _callback: (response: NotificationResponse) => void
): { remove: () => void } {
  return { remove: () => {} };
}
