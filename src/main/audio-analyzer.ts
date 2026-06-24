import { AudioFrame } from '../shared/types';

/**
 * Audio Analyzer that processes raw PCM data and extracts
 * audio features: volume, bass, mid, treble, beat detection.
 */
export class AudioAnalyzer {
  private fftSize: number;
  private sampleRate: number;
  private buffer: Float64Array;
  private fft: FFT;
  private spectrum: Float64Array;

  // Beat detection state
  private beatHistory: number[] = [];
  private beatThreshold = 1.5;
  private readonly BEAT_HISTORY_SIZE = 43;

  // Energy smoothing
  private prevBass = 0;
  private prevMid = 0;
  private prevTreble = 0;
  private readonly SMOOTHING = 0.3;

  constructor(fftSize: number = 512, sampleRate: number = 48000) {
    this.fftSize = fftSize;
    this.sampleRate = sampleRate;
    this.buffer = new Float64Array(fftSize);
    this.fft = new FFT(fftSize);
    this.spectrum = new Float64Array(fftSize / 2);
  }

  /**
   * Process a stereo Int16 PCM buffer and return analyzed audio data.
   */
  process(pcmData: Int16Array): AudioFrame {
    // Convert stereo to mono and normalize to [-1, 1]
    const frameCount = pcmData.length / 2;
    for (let i = 0; i < this.fftSize; i++) {
      if (i < frameCount) {
        const left = pcmData[i * 2];
        const right = pcmData[i * 2 + 1];
        this.buffer[i] = (left + right) / 65536;
      } else {
        this.buffer[i] = 0;
      }
    }

    // Compute RMS volume
    let sumSquares = 0;
    for (let i = 0; i < frameCount; i++) {
      sumSquares += this.buffer[i] * this.buffer[i];
    }
    const volume = Math.sqrt(sumSquares / frameCount);

    // Apply FFT
    this.spectrum.fill(0);
    this.fft.calculate(this.buffer);
    this.fft.getSpectrum(this.spectrum);

    // Frequency bin mapping
    // bin 0 = DC, bin i = i * sampleRate / fftSize
    const binWidth = this.sampleRate / this.fftSize;
    const bassBins = Math.floor(250 / binWidth);     // 20-250 Hz
    const midBins = Math.floor(4000 / binWidth);     // 250-4000 Hz
    const trebleBins = Math.floor(20000 / binWidth); // 4000-20000 Hz

    // Clamp to spectrum length
    const bassEnd = Math.min(bassBins, this.spectrum.length);
    const midEnd = Math.min(midBins, this.spectrum.length);
    const trebleEnd = Math.min(trebleBins, this.spectrum.length);

    let bassEnergy = 0;
    let midEnergy = 0;
    let trebleEnergy = 0;
    let bassCount = 0;
    let midCount = 0;
    let trebleCount = 0;

    // Skip DC (bin 0), start from bin 1
    for (let i = 1; i < trebleEnd; i++) {
      const energy = this.spectrum[i];
      if (i < bassEnd) {
        bassEnergy += energy;
        bassCount++;
      } else if (i < midEnd) {
        midEnergy += energy;
        midCount++;
      } else {
        trebleEnergy += energy;
        trebleCount++;
      }
    }

    // Normalize energies with wider dynamic range
    const bass = bassCount > 0 ? Math.min(1, (bassEnergy / bassCount) * 40) : 0;
    const mid = midCount > 0 ? Math.min(1, (midEnergy / midCount) * 30) : 0;
    const treble = trebleCount > 0 ? Math.min(1, (trebleEnergy / trebleCount) * 50) : 0;

    // Smooth energy values
    const smoothBass = this.prevBass * this.SMOOTHING + bass * (1 - this.SMOOTHING);
    const smoothMid = this.prevMid * this.SMOOTHING + mid * (1 - this.SMOOTHING);
    const smoothTreble = this.prevTreble * this.SMOOTHING + treble * (1 - this.SMOOTHING);

    this.prevBass = smoothBass;
    this.prevMid = smoothMid;
    this.prevTreble = smoothTreble;

    // Beat detection (based on bass energy)
    this.beatHistory.push(bass);
    if (this.beatHistory.length > this.BEAT_HISTORY_SIZE) {
      this.beatHistory.shift();
    }

    const avg = this.beatHistory.reduce((a, b) => a + b, 0) / this.beatHistory.length;
    const beat = bass > avg * this.beatThreshold && bass > 0.15;

    return {
      volume: Math.min(1, volume * 4),
      bass: smoothBass,
      mid: smoothMid,
      treble: smoothTreble,
      beat,
    };
  }

  destroy(): void {
    this.beatHistory = [];
  }
}

/**
 * FFT wrapper using fft.js.
 * realTransform(input) -> stores complex output buffer internally.
 * getSpectrum(spectrum) -> fills spectrum with magnitude values.
 */
class FFT {
  private fft: import('fft.js');
  private size: number;
  private output: Float64Array;

  constructor(size: number) {
    this.size = size;
    this.fft = new (require('fft.js'))(size);
    this.output = new Float64Array(size * 2);
  }

  calculate(buffer: Float64Array): void {
    this.fft.realTransform(this.output, buffer);
  }

  getSpectrum(spectrum: Float64Array): void {
    const halfSize = this.size / 2;
    for (let i = 0; i < halfSize; i++) {
      const re = this.output[2 * i];
      const im = this.output[2 * i + 1];
      spectrum[i] = Math.sqrt(re * re + im * im) / this.size;
    }
  }
}
