/**
 * useUnsavedChanges Hook
 * Prevents accidental navigation away from screens with unsaved changes.
 * Shows an alert asking the user to confirm discarding changes.
 */

import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';

/**
 * Prevents back navigation when there are unsaved changes.
 * Uses React Navigation's beforeRemove event to intercept navigation.
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Optional custom message for the confirmation dialog
 */
export function useUnsavedChanges(
  isDirty: boolean,
  message = 'You have unsaved changes. Are you sure you want to discard them?'
) {
  const navigation = useNavigation();

  useEffect(() => {
    if (!isDirty) return;

    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default behavior of leaving the screen
      e.preventDefault();

      if (Platform.OS === 'web') {
        // On web, use window.confirm for simpler UX
        const confirmed = window.confirm(message);
        if (confirmed) {
          navigation.dispatch(e.data.action);
        }
      } else {
        Alert.alert(
          'Discard changes?',
          message,
          [
            { text: 'Keep editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => navigation.dispatch(e.data.action),
            },
          ]
        );
      }
    });

    return unsubscribe;
  }, [isDirty, navigation, message]);
}
