import { BrowserWindow, app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { AudioAnalyzer } from './audio-analyzer';
import { AudioFrame, IPC_CHANNELS } from '../shared/types';

export class AudioCaptureManager {
  private process: ChildProcess | null = null;
  private analyzer: AudioAnalyzer;
  private isRunning = false;

  constructor() {
    this.analyzer = new AudioAnalyzer(512, 48000);
  }

  start(window: BrowserWindow): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Kill any leftover process from a previous run
    if (this.process) {
      try { this.process.kill(); } catch (_) {}
      this.process = null;
    }

    const exePath = app.isPackaged
      ? path.join(process.resourcesPath, 'audio-capture', 'capture.exe')
      : path.join(__dirname, '..', '..', 'audio-capture', 'capture.exe');

    try {
      this.process = spawn(exePath, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        env: { ...process.env },
      });

      const floatBuffer: number[] = [];
      let leftover = Buffer.alloc(0);

      this.process.stdout!.on('data', (chunk: Buffer) => {
        if (!this.isRunning) return;

        const data = Buffer.concat([leftover, chunk]);
        const floatSize = 4;
        const completeBytes = Math.floor(data.length / floatSize) * floatSize;
        leftover = data.slice(completeBytes);

        for (let i = 0; i < completeBytes; i += floatSize) {
          floatBuffer.push(data.readFloatLE(i));
        }

        const framesNeeded = this.analyzer['fftSize'];
        const samplesPerFrame = framesNeeded * 2;
        while (floatBuffer.length >= samplesPerFrame) {
          const frameSamples = floatBuffer.splice(0, samplesPerFrame);

          const monoInt16 = new Int16Array(framesNeeded);
          for (let j = 0; j < framesNeeded; j++) {
            const left = frameSamples[j * 2];
            const right = frameSamples[j * 2 + 1];
            const mono = (left + right) / 2;
            monoInt16[j] = Math.max(-32768, Math.min(32767, Math.round(mono * 32767)));
          }

          const audioData: AudioFrame = this.analyzer.process(monoInt16);
          if (!window.isDestroyed()) {
            window.webContents.send(IPC_CHANNELS.AUDIO_DATA, audioData);
          }
        }
      });

      this.process.stderr!.on('data', (data: Buffer) => {
        console.error('[AudioCapture]', data.toString().trim());
      });

      this.process.on('error', () => {
        this.isRunning = false;
      });

      this.process.on('exit', () => {
        this.isRunning = false;
        this.process = null;
        if (!window.isDestroyed()) {
          setTimeout(() => this.start(window), 2000);
        }
      });

      console.log('[AudioCapture] Started');
    } catch (err: any) {
      console.error('[AudioCapture] Failed to start:', err.message);
      this.isRunning = false;
    }
  }

  stop(): void {
    this.isRunning = false;
    if (this.process) {
      try { this.process.kill(); } catch (_) {}
      this.process = null;
    }
    this.analyzer.destroy();
  }
}
