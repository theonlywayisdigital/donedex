/**
 * Cross-platform alert utility
 * Uses native Alert on mobile and window.confirm/alert on web
 */

import { Alert, Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Show a cross-platform alert dialog
 * @param title - Alert title
 * @param message - Alert message (optional)
 * @param buttons - Array of buttons (optional, defaults to OK)
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS === 'web') {
    // On web, use window.confirm for Cancel/OK style alerts
    // or window.alert for simple notifications
    if (!buttons || buttons.length === 0) {
      window.alert(message ? `${title}\n\n${message}` : title);
      return;
    }

    if (buttons.length === 1) {
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons[0].onPress?.();
      return;
    }

    // For two or more buttons, use confirm
    // Find the "action" button (non-cancel)
    const cancelButton = buttons.find(b => b.style === 'cancel');
    const actionButton = buttons.find(b => b.style !== 'cancel') || buttons[buttons.length - 1];

    const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
    if (confirmed) {
      actionButton.onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
  } else {
    // On native, use the standard Alert
    Alert.alert(title, message, buttons);
  }
}

/**
 * Show a confirmation dialog
 * @param title - Dialog title
 * @param message - Dialog message
 * @param onConfirm - Callback when confirmed
 * @param onCancel - Optional callback when cancelled
 * @param confirmText - Text for confirm button (default: "OK")
 * @param cancelText - Text for cancel button (default: "Cancel")
 */
export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'OK',
  cancelText: string = 'Cancel'
): void {
  showAlert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, onPress: onConfirm },
  ]);
}

/**
 * Show a destructive confirmation dialog (e.g., for delete operations)
 * @param title - Dialog title
 * @param message - Dialog message
 * @param onConfirm - Callback when confirmed
 * @param onCancel - Optional callback when cancelled
 * @param confirmText - Text for destructive button (default: "Delete")
 * @param cancelText - Text for cancel button (default: "Cancel")
 */
export function showDestructiveConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'Delete',
  cancelText: string = 'Cancel'
): void {
  showAlert(title, message, [
    { text: cancelText, style: 'cancel', onPress: onCancel },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * Show a simple notification alert (just OK button)
 * @param title - Alert title
 * @param message - Alert message (optional)
 * @param onDismiss - Optional callback when dismissed
 */
export function showNotification(
  title: string,
  message?: string,
  onDismiss?: () => void
): void {
  showAlert(title, message, [
    { text: 'OK', onPress: onDismiss },
  ]);
}
