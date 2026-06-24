/** Audio analysis data sent from main to renderer */
export interface AudioFrame {
  volume: number;  // RMS volume (0-1)
  bass: number;    // 20-250 Hz
  mid: number;     // 250-4000 Hz
  treble: number;  // 4000-20000 Hz
  beat: boolean;   // Beat detection flag
}

/** IPC channel names */
export const IPC_CHANNELS = {
  AUDIO_DATA: 'audio-data',
  TOGGLE_VISUAL: 'toggle-visual',
  SET_INTENSITY: 'set-intensity',
  SET_THEME: 'set-theme',
} as const;

/** Visual themes */
export type ThemeName = 'neon-wave' | 'fluid';

export interface ThemeConfig {
  name: ThemeName;
  label: string;
}
