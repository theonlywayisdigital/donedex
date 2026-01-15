/**
 * GPSCaptureInput Component
 * Captures device GPS location for inspection fields
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';

interface GPSLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: string;
}

interface GPSCaptureInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function GPSCaptureInput({ value, onChange }: GPSCaptureInputProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse existing value
  const location: GPSLocation | null = value ? JSON.parse(value) : null;

  const handleCapture = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const gpsData: GPSLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString(),
      };

      onChange(JSON.stringify(gpsData));
    } catch (err) {
      console.error('[GPSCaptureInput] Error capturing location:', err);
      setError('Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleOpenMaps = () => {
    if (!location) return;

    const { lat, lng } = location;
    const url = Platform.select({
      ios: `maps:?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
      default: `https://www.google.com/maps?q=${lat},${lng}`,
    });

    Linking.openURL(url);
  };

  const formatAccuracy = (accuracy: number | null): string => {
    if (!accuracy) return '';
    if (accuracy < 10) return 'High accuracy';
    if (accuracy < 50) return 'Good accuracy';
    return 'Low accuracy';
  };

  // No location captured yet
  if (!location) {
    return (
      <View>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
          ) : (
            <Icon name="map-pin" size={20} color={colors.primary.DEFAULT} />
          )}
          <Text style={styles.captureButtonText}>
            {loading ? 'Getting location...' : 'Capture Location'}
          </Text>
        </TouchableOpacity>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  // Location captured - show data
  return (
    <View style={styles.locationContainer}>
      <View style={styles.locationHeader}>
        <Icon name="map-pin" size={18} color={colors.success} />
        <Text style={styles.locationTitle}>Location captured</Text>
      </View>

      <View style={styles.locationData}>
        <View style={styles.coordinateRow}>
          <Text style={styles.coordinateLabel}>Lat:</Text>
          <Text style={styles.coordinateValue}>{location.lat.toFixed(6)}</Text>
        </View>
        <View style={styles.coordinateRow}>
          <Text style={styles.coordinateLabel}>Lng:</Text>
          <Text style={styles.coordinateValue}>{location.lng.toFixed(6)}</Text>
        </View>
        {location.accuracy && (
          <Text style={styles.accuracyText}>
            {`${formatAccuracy(location.accuracy)} (±${Math.round(location.accuracy)}m)`}
          </Text>
        )}
      </View>

      <View style={styles.locationActions}>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={handleOpenMaps}
          activeOpacity={0.7}
        >
          <Icon name="external-link" size={16} color={colors.primary.DEFAULT} />
          <Text style={styles.mapButtonText}>View on Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recaptureButton}
          onPress={handleCapture}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Icon name="refresh-cw" size={16} color={colors.text.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <Icon name="trash-2" size={16} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    gap: spacing.sm,
  },
  captureButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  errorText: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginTop: spacing.xs,
  },

  locationContainer: {
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  locationTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  locationData: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  coordinateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  coordinateLabel: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
    width: 32,
  },
  coordinateValue: {
    fontSize: fontSize.body,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  accuracyText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  mapButtonText: {
    fontSize: fontSize.caption,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },
  recaptureButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GPSCaptureInput;
