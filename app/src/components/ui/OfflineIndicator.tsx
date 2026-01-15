/**
 * Offline Indicator Component
 * Shows a banner when the device is offline and sync status
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { WifiOff, CloudOff, RefreshCw, Check } from 'lucide-react-native';
import { useNetworkStatus } from '../../services/networkStatus';
import { subscribeToSyncStatus, forceSyncNow } from '../../services/syncService';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';

interface OfflineIndicatorProps {
  /**
   * Show sync status even when online
   */
  showSyncStatus?: boolean;
}

export function OfflineIndicator({ showSyncStatus = false }: OfflineIndicatorProps) {
  const { isOnline, isLoading } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState(0);
  const [slideAnim] = useState(new Animated.Value(-50));

  // Subscribe to sync status
  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((syncing, pending) => {
      setIsSyncing(syncing);
      setPendingItems(pending);
    });

    return unsubscribe;
  }, []);

  // Animate in/out
  useEffect(() => {
    const shouldShow = !isOnline || (showSyncStatus && pendingItems > 0);

    Animated.timing(slideAnim, {
      toValue: shouldShow ? 0 : -50,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, pendingItems, showSyncStatus, slideAnim]);

  const handleSyncPress = async () => {
    if (!isOnline || isSyncing) return;
    await forceSyncNow();
  };

  // Don't show anything if loading or online with no pending items
  if (isLoading) return null;
  if (isOnline && pendingItems === 0 && !showSyncStatus) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        isOnline ? styles.containerOnline : styles.containerOffline,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {!isOnline ? (
        <>
          <WifiOff size={16} color={colors.white} />
          <Text style={styles.text}>You're offline</Text>
          {pendingItems > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingItems} pending</Text>
            </View>
          )}
        </>
      ) : pendingItems > 0 ? (
        <>
          {isSyncing ? (
            <RefreshCw size={16} color={colors.white} />
          ) : (
            <CloudOff size={16} color={colors.white} />
          )}
          <Text style={styles.text}>
            {isSyncing ? 'Syncing...' : `${pendingItems} item${pendingItems > 1 ? 's' : ''} to sync`}
          </Text>
          {!isSyncing && (
            <TouchableOpacity onPress={handleSyncPress} style={styles.syncButton}>
              <Text style={styles.syncButtonText}>Sync Now</Text>
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <Check size={16} color={colors.white} />
          <Text style={styles.text}>All synced</Text>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  containerOffline: {
    backgroundColor: colors.danger,
  },
  containerOnline: {
    backgroundColor: colors.primary.DEFAULT,
  },
  text: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.xs,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  syncButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: spacing.xs,
  },
  syncButtonText: {
    color: colors.white,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.semibold,
  },
});
