import { AudioFrame } from '../shared/types';

declare global {
  interface Window {
    electronAPI?: {
      onAudioData: (callback: (data: AudioFrame) => void) => () => void;
      onToggleImmersive: (callback: () => void) => () => void;
      send: (channel: string, ...args: unknown[]) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

export {};
