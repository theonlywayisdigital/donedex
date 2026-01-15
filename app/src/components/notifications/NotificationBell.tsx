/**
 * NotificationBell Component
 * Bell icon with unread count badge that opens notification dropdown
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
} from 'react-native';
import { Icon } from '../ui';
import { getUnreadNotificationCount } from '../../services/notifications';
import { colors, spacing, fontSize, fontWeight } from '../../constants/theme';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
  /** Size of the bell icon */
  size?: number;
  /** Color of the bell icon */
  color?: string;
}

export function NotificationBell({
  size = 24,
  color = colors.text.primary,
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('[NotificationBell] Error loading unread count:', err);
    }
  }, []);

  // Load count on mount and poll every 60 seconds
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Pulse animation when count changes
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unreadCount, pulseAnim]);

  const handlePress = () => {
    setShowDropdown(true);
  };

  const handleCloseDropdown = () => {
    setShowDropdown(false);
    // Refresh count when dropdown closes
    loadUnreadCount();
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="bell" size={size} color={color} />
        {unreadCount > 0 && (
          <Animated.View
            style={[
              styles.badge,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>

      <NotificationDropdown
        visible={showDropdown}
        onClose={handleCloseDropdown}
        onCountChange={setUnreadCount}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.semibold,
  },
});
