/**
 * AutoWeatherDisplay Component
 * Auto-fetches and displays weather data for inspection fields
 * Uses Open-Meteo API (free, no API key required)
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  conditions: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
}

interface AutoWeatherDisplayProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

// Weather code to condition mapping (WMO codes used by Open-Meteo)
const weatherCodeToCondition = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

// Use cloud-sun as main weather icon since specific weather icons aren't available
const getWeatherIcon = (_conditions: string): 'cloud-sun' => {
  return 'cloud-sun';
};

export function AutoWeatherDisplay({ value, onChange }: AutoWeatherDisplayProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse existing value
  const weatherData: WeatherData | null = value ? JSON.parse(value) : null;

  useEffect(() => {
    // Auto-fetch weather on mount if no value
    if (!value) {
      fetchWeather();
    }
  }, []);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission required');
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;

      // Fetch weather from Open-Meteo API (free, no key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&temperature_unit=celsius&wind_speed_unit=kmh`
      );

      if (!response.ok) {
        throw new Error('Weather API request failed');
      }

      const data = await response.json();

      const weather: WeatherData = {
        temperature: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        conditions: weatherCodeToCondition(data.current.weather_code),
        timestamp: new Date().toISOString(),
        location: {
          lat: latitude,
          lng: longitude,
        },
      };

      onChange(JSON.stringify(weather));
    } catch (err) {
      console.error('[AutoWeatherDisplay] Error fetching weather:', err);
      setError('Failed to fetch weather');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Fetching weather data...</Text>
      </View>
    );
  }

  // Error state
  if (error && !weatherData) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={20} color={colors.text.secondary} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWeather}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // No data yet
  if (!weatherData) {
    return (
      <TouchableOpacity style={styles.fetchButton} onPress={fetchWeather}>
        <Icon name="cloud-sun" size={20} color={colors.primary.DEFAULT} />
        <Text style={styles.fetchButtonText}>Fetch Weather</Text>
      </TouchableOpacity>
    );
  }

  // Weather data display
  const icon = getWeatherIcon(weatherData.conditions);

  return (
    <View style={styles.weatherContainer}>
      <View style={styles.weatherMain}>
        <View style={styles.weatherIcon}>
          <Icon name={icon} size={32} color={colors.primary.DEFAULT} />
        </View>

        <View style={styles.weatherInfo}>
          <Text style={styles.temperature}>{`${weatherData.temperature}°C`}</Text>
          <Text style={styles.conditions}>{weatherData.conditions}</Text>
        </View>
      </View>

      <View style={styles.weatherDetails}>
        <View style={styles.detailItem}>
          <Icon name="gauge" size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>{`${weatherData.humidity}% humidity`}</Text>
        </View>
        <View style={styles.detailItem}>
          <Icon name="activity" size={14} color={colors.text.secondary} />
          <Text style={styles.detailText}>{`${weatherData.windSpeed} km/h wind`}</Text>
        </View>
      </View>

      <View style={styles.weatherFooter}>
        <Text style={styles.timestampText}>
          {`Captured ${new Date(weatherData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={fetchWeather}>
          <Icon name="refresh-cw" size={14} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },

  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  errorText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    fontSize: fontSize.caption,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },

  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fetchButtonText: {
    fontSize: fontSize.body,
    color: colors.primary.DEFAULT,
    fontWeight: fontWeight.medium,
  },

  weatherContainer: {
    backgroundColor: colors.primary.light,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT + '30',
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  weatherIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  weatherInfo: {
    flex: 1,
  },
  temperature: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  conditions: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
  },
  weatherDetails: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  weatherFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timestampText: {
    fontSize: fontSize.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  refreshButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AutoWeatherDisplay;
