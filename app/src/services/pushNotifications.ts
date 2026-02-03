/**
 * Push Notification Service
 * Handles Expo push notification registration, token management, and listeners.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and return the Expo push token.
 * Returns null if registration fails or is unavailable (e.g. simulator).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications require a physical device
  if (!Device.isDevice) {
    return null;
  }

  // Web doesn't support Expo push notifications
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Get the project ID for Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('[Push] No EAS project ID configured - push tokens unavailable');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F4C5C',
      });
    }

    return token;
  } catch (error) {
    console.error('[Push] Registration failed:', error);
    return null;
  }
}

/**
 * Save push token to the database for the current user
 */
export async function savePushToken(token: string): Promise<void> {
  const platform = Platform.OS as 'ios' | 'android' | 'web';

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert the token (update if exists, insert if new)
    const { error } = await (supabase
      .from('push_tokens') as any)
      .upsert(
        {
          user_id: user.id,
          token,
          platform,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );

    if (error) {
      console.error('[Push] Failed to save token:', error.message);
    }
  } catch (err) {
    console.error('[Push] Error saving token:', err);
  }
}

/**
 * Remove push token from database (e.g. on sign out)
 */
export async function removePushToken(token: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase
      .from('push_tokens') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('token', token);
  } catch (err) {
    console.error('[Push] Error removing token:', err);
  }
}

/**
 * Add a listener for when a notification is received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
