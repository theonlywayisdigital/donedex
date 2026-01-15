/**
 * AudioRecorderInput Component
 * Voice memo recording UI for inspection fields
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../constants/theme';
import { Icon } from '../ui';
import {
  startRecording,
  stopRecording,
  cancelRecording,
  createAudioPlayer,
  type AudioAsset,
} from '../../services/audioRecording';

interface AudioRecorderInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

type RecordingState = 'idle' | 'recording' | 'recorded';

export function AudioRecorderInput({ value, onChange }: AudioRecorderInputProps) {
  const [state, setState] = useState<RecordingState>(value ? 'recorded' : 'idle');
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Parse existing value for display
  const audioData: AudioAsset | null = value ? JSON.parse(value) : null;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    setLoading(true);
    try {
      const success = await startRecording();
      if (success) {
        setState('recording');
        setDuration(0);
        // Start duration timer
        intervalRef.current = setInterval(() => {
          setDuration((d) => d + 1000);
        }, 1000);
      }
    } catch (error) {
      console.error('[AudioRecorderInput] Failed to start recording:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    setLoading(true);
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      const audio = await stopRecording();
      if (audio) {
        onChange(JSON.stringify(audio));
        setState('recorded');
      } else {
        setState('idle');
        setDuration(0);
      }
    } catch (error) {
      console.error('[AudioRecorderInput] Failed to stop recording:', error);
      setState('idle');
      setDuration(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRecording = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await cancelRecording();
    setState('idle');
    setDuration(0);
  };

  const handlePlayPause = async () => {
    if (!audioData) return;

    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        if (!soundRef.current) {
          const sound = await createAudioPlayer(audioData.uri);
          if (!sound) return;
          soundRef.current = sound;

          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
            }
          });
        }
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('[AudioRecorderInput] Playback error:', error);
    }
  };

  const handleDelete = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    onChange(null);
    setState('idle');
    setDuration(0);
    setIsPlaying(false);
  };

  // Idle state - show record button
  if (state === 'idle') {
    return (
      <TouchableOpacity
        style={styles.recordButton}
        onPress={handleStartRecording}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.danger} />
        ) : (
          <View style={styles.recordIcon}>
            <Icon name="mic" size={24} color={colors.white} />
          </View>
        )}
        <Text style={styles.recordButtonText}>
          {loading ? 'Preparing...' : 'Tap to Record'}
        </Text>
      </TouchableOpacity>
    );
  }

  // Recording state - show timer and stop button
  if (state === 'recording') {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.recordingInfo}>
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
          </View>
          <Text style={styles.recordingTimer}>{formatDuration(duration)}</Text>
        </View>

        <View style={styles.recordingActions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRecording}
            activeOpacity={0.7}
          >
            <Icon name="x" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopRecording}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <View style={styles.stopIcon} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Recorded state - show playback controls
  return (
    <View style={styles.playbackContainer}>
      <TouchableOpacity
        style={styles.playButton}
        onPress={handlePlayPause}
        activeOpacity={0.7}
      >
        <Icon
          name={isPlaying ? 'pause-circle' : 'play-circle'}
          size={20}
          color={colors.white}
        />
      </TouchableOpacity>

      <View style={styles.playbackInfo}>
        <Text style={styles.playbackLabel}>Audio recorded</Text>
        <Text style={styles.playbackDuration}>
          {formatDuration(audioData?.duration || 0)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={handleDelete}
        activeOpacity={0.7}
      >
        <Icon name="trash-2" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Idle state
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 64,
    gap: spacing.sm,
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonText: {
    fontSize: fontSize.body,
    color: colors.text.secondary,
    fontWeight: fontWeight.medium,
  },

  // Recording state
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.danger + '10',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 64,
  },
  recordingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  recordingTimer: {
    fontSize: fontSize.sectionTitle,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
    fontVariant: ['tabular-nums'],
  },
  recordingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cancelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopIcon: {
    width: 16,
    height: 16,
    borderRadius: 2,
    backgroundColor: colors.white,
  },

  // Playback state
  playbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 56,
    gap: spacing.md,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playbackInfo: {
    flex: 1,
  },
  playbackLabel: {
    fontSize: fontSize.body,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  playbackDuration: {
    fontSize: fontSize.caption,
    color: colors.text.secondary,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AudioRecorderInput;
