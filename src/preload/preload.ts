import { contextBridge, ipcRenderer } from 'electron';

const IPC_CHANNELS = {
  AUDIO_DATA: 'audio-data',
  TOGGLE_VISUAL: 'toggle-visual',
  SET_INTENSITY: 'set-intensity',
  SET_THEME: 'set-theme',
  TOGGLE_IMMERSIVE: 'toggle-immersive',
} as const;

interface AudioFrame {
  volume: number;
  bass: number;
  mid: number;
  treble: number;
  beat: boolean;
}

contextBridge.exposeInMainWorld('electronAPI', {
  onAudioData: (callback: (data: AudioFrame) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: AudioFrame) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.AUDIO_DATA, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.AUDIO_DATA, handler);
    };
  },

  onToggleImmersive: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(IPC_CHANNELS.TOGGLE_IMMERSIVE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.TOGGLE_IMMERSIVE, handler);
    };
  },

  send: (channel: string, ...args: unknown[]) => {
    const validChannels = [IPC_CHANNELS.TOGGLE_VISUAL, IPC_CHANNELS.SET_INTENSITY, IPC_CHANNELS.SET_THEME];
    if (validChannels.includes(channel as any)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});
