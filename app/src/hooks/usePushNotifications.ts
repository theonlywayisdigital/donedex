/**
 * usePushNotifications Hook
 * Registers for push notifications when user is authenticated.
 * Handles token registration and notification listeners.
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '../services/pushNotifications';

/**
 * Registers for push notifications when mounted.
 * Should be called when user is authenticated.
 */
export function usePushNotifications() {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip on web
    if (Platform.OS === 'web') return;

    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    async function setup() {
      try {
        // Register and save token
        const token = await registerForPushNotifications();
        if (token) {
          tokenRef.current = token;
          await savePushToken(token);
        }

        // Listen for notifications received while app is foregrounded
        receivedSubscription = addNotificationReceivedListener((_notification) => {
          // Notification received in foreground - the handler will show it as alert
        });

        // Listen for when user taps on a notification
        responseSubscription = addNotificationResponseListener((response) => {
          const data = response.notification.request.content.data;
          // Handle notification tap - URL routing could be implemented here
        });
      } catch (err) {
        // Push notification setup is non-critical - log and continue
        console.error('Push notification setup failed:', err);
      }
    }

    setup();

    return () => {
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, []);

  return tokenRef.current;
}
