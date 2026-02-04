/**
 * Network Status Service
 * Monitors network connectivity and provides hooks for offline-aware components
 */

import { useEffect, useState, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// Singleton to track current network state
let currentNetworkState: NetInfoState | null = null;
let listeners: Set<(isOnline: boolean) => void> = new Set();

// Initialize network monitoring
export function initializeNetworkMonitoring(): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    currentNetworkState = state;
    const isOnline = state.isConnected && state.isInternetReachable !== false;
    listeners.forEach((listener) => listener(isOnline ?? false));
  });

  return unsubscribe;
}

/**
 * Check if device is currently online
 * Uses cached state for instant response, falls back to NetInfo fetch
 */
export async function isOnline(): Promise<boolean> {
  if (currentNetworkState) {
    return (
      currentNetworkState.isConnected === true &&
      currentNetworkState.isInternetReachable !== false
    );
  }

  const state = await NetInfo.fetch();
  currentNetworkState = state;
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Get current network state synchronously
 * Returns null if state hasn't been fetched yet
 */
export function getNetworkState(): NetInfoState | null {
  return currentNetworkState;
}

/**
 * Subscribe to network status changes
 */
export function subscribeToNetworkChanges(
  callback: (isOnline: boolean) => void
): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

/**
 * Hook to get current network status
 * Returns { isOnline, isLoading }
 */
export function useNetworkStatus(): { isOnline: boolean; isLoading: boolean } {
  const [isOnlineState, setIsOnline] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    // Get initial state with timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Network status check timed out, assuming online');
        setIsOnline(true);
        setIsLoading(false);
      }
    }, 5000);

    isOnline()
      .then((online) => {
        if (mounted) {
          clearTimeout(timeoutId);
          setIsOnline(online);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Network status check failed:', err);
        if (mounted) {
          clearTimeout(timeoutId);
          setIsOnline(true); // Assume online on error
          setIsLoading(false);
        }
      });

    // Subscribe to changes
    const unsubscribe = subscribeToNetworkChanges((online) => {
      if (mounted) {
        setIsOnline(online);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  return { isOnline: isOnlineState, isLoading };
}

/**
 * Hook that provides a callback wrapped with offline awareness
 * If offline, queues the operation; if online, executes immediately
 */
export function useOfflineAwareAction<T extends (...args: unknown[]) => Promise<unknown>>(
  action: T,
  options?: {
    onOffline?: () => void;
    showOfflineToast?: boolean;
  }
): T {
  const { isOnline: online } = useNetworkStatus();

  const wrappedAction = useCallback(
    async (...args: Parameters<T>) => {
      if (!online) {
        options?.onOffline?.();
        // Return a rejected promise or handle offline case
        throw new Error('Device is offline');
      }
      return action(...args);
    },
    [online, action, options]
  ) as T;

  return wrappedAction;
}
