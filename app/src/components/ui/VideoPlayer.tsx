/**
 * VideoPlayer Component
 * Cross-platform video player that uses HTML5 video on web
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../../constants/theme';
import { Icon } from './Icon';

interface VideoPlayerProps {
  uri: string;
  style?: object;
  thumbnailMode?: boolean; // Show as thumbnail with play button overlay
  onPress?: () => void;
}

export function VideoPlayer({ uri, style, thumbnailMode = false, onPress }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);

  if (Platform.OS !== 'web') {
    // For native, show a placeholder that links to the video
    // Full native video support would require expo-av
    return (
      <TouchableOpacity
        style={[styles.container, styles.nativePlaceholder, style]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Icon name="video" size={32} color={colors.primary.DEFAULT} />
        <Text style={styles.nativeText}>Tap to view video</Text>
      </TouchableOpacity>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Icon name="alert-circle" size={24} color={colors.danger} />
        <Text style={styles.errorText}>Video unavailable</Text>
      </View>
    );
  }

  if (thumbnailMode && !isPlaying) {
    return (
      <TouchableOpacity
        style={[styles.container, styles.thumbnailContainer, style]}
        onPress={() => setIsPlaying(true)}
        activeOpacity={0.8}
      >
        <View style={styles.playButton}>
          <Icon name="play-circle" size={32} color={colors.white} />
        </View>
        <Text style={styles.thumbnailText}>Play Video</Text>
      </TouchableOpacity>
    );
  }

  // Web video player using HTML5 video element
  return (
    <View style={[styles.container, style]}>
      {/* @ts-ignore - video element is web-only */}
      <video
        src={uri}
        controls
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 8,
          backgroundColor: colors.neutral[900],
        }}
        onError={() => setError(true)}
      >
        Your browser does not support video playback.
      </video>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  thumbnailContainer: {
    backgroundColor: colors.neutral[900],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  thumbnailText: {
    color: colors.white,
    fontSize: fontSize.body,
  },
  nativePlaceholder: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    minHeight: 100,
  },
  nativeText: {
    color: colors.primary.DEFAULT,
    fontSize: fontSize.body,
    marginTop: spacing.sm,
  },
  errorContainer: {
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  errorText: {
    color: colors.danger,
    fontSize: fontSize.caption,
    marginTop: spacing.xs,
  },
});

export default VideoPlayer;
