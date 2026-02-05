/**
 * Session Heartbeat Hook
 * Updates the session's last_active_at timestamp periodically
 * to prevent automatic session expiry
 */
import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { updateHeartbeat } from '../services/deviceSession';

// Heartbeat interval: 5 minutes
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

interface UseSessionHeartbeatOptions {
  enabled?: boolean;
}

/**
 * Hook to keep the user's session alive with periodic heartbeats
 * Only runs when the app is in the foreground
 */
export function useSessionHeartbeat(options: UseSessionHeartbeatOptions = {}) {
  const { enabled = true } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  const sendHeartbeat = useCallback(async () => {
    if (!enabled) return;

    try {
      const success = await updateHeartbeat();
      if (success) {
        console.log('[SessionHeartbeat] Heartbeat sent successfully');
      }
    } catch (error) {
      console.error('[SessionHeartbeat] Failed to send heartbeat:', error);
    }
  }, [enabled]);

  const startHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Send initial heartbeat immediately
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    console.log('[SessionHeartbeat] Started heartbeat interval');
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('[SessionHeartbeat] Stopped heartbeat interval');
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopHeartbeat();
      return;
    }

    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - restart heartbeat
        console.log('[SessionHeartbeat] App came to foreground');
        startHeartbeat();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop heartbeat
        console.log('[SessionHeartbeat] App went to background');
        stopHeartbeat();
      }
      appState.current = nextAppState;
    };

    // Start heartbeat immediately
    startHeartbeat();

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      stopHeartbeat();
      subscription.remove();
    };
  }, [enabled, startHeartbeat, stopHeartbeat]);

  return {
    sendHeartbeat,
  };
}
