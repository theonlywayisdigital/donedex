/**
 * Audio Recording Service
 * Uses expo-av for audio recording on iOS/Android
 */

import { Audio } from 'expo-av';
import type { AudioAsset } from './types';

export type { AudioAsset, AudioRecordingState } from './types';

let recording: Audio.Recording | null = null;

/**
 * Request audio recording permissions
 */
export async function requestAudioPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Configure audio mode for recording
 */
async function configureAudioMode(): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
}

/**
 * Start audio recording
 */
export async function startRecording(): Promise<boolean> {
  try {
    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      console.warn('[AudioRecording] Permission denied');
      return false;
    }

    // Stop any existing recording
    if (recording) {
      await stopRecording();
    }

    await configureAudioMode();

    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    recording = newRecording;
    return true;
  } catch (error) {
    console.error('[AudioRecording] Failed to start recording:', error);
    return false;
  }
}

/**
 * Stop recording and get the audio file
 */
export async function stopRecording(): Promise<AudioAsset | null> {
  if (!recording) {
    return null;
  }

  try {
    await recording.stopAndUnloadAsync();

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });

    const uri = recording.getURI();
    const status = await recording.getStatusAsync();

    recording = null;

    if (!uri) {
      return null;
    }

    return {
      uri,
      duration: status.durationMillis || 0,
    };
  } catch (error) {
    console.error('[AudioRecording] Failed to stop recording:', error);
    recording = null;
    return null;
  }
}

/**
 * Cancel recording without saving
 */
export async function cancelRecording(): Promise<void> {
  if (!recording) {
    return;
  }

  try {
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  } catch (error) {
    console.error('[AudioRecording] Failed to cancel recording:', error);
  } finally {
    recording = null;
  }
}

/**
 * Get current recording status
 */
export async function getRecordingStatus(): Promise<{
  isRecording: boolean;
  duration: number;
  metering?: number;
}> {
  if (!recording) {
    return { isRecording: false, duration: 0 };
  }

  try {
    const status = await recording.getStatusAsync();
    return {
      isRecording: status.isRecording,
      duration: status.durationMillis || 0,
      metering: status.metering,
    };
  } catch {
    return { isRecording: false, duration: 0 };
  }
}

/**
 * Create audio player for playback
 */
export async function createAudioPlayer(uri: string): Promise<Audio.Sound | null> {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    return sound;
  } catch (error) {
    console.error('[AudioRecording] Failed to create audio player:', error);
    return null;
  }
}
