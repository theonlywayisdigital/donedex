/**
 * Audio Recording Types
 */

export interface AudioAsset {
  uri: string;
  duration: number; // milliseconds
  fileSize?: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  duration: number; // milliseconds
  metering?: number; // audio level for visualization
}
