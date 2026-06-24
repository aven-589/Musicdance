import * as THREE from 'three';
import { ThemeName } from '../shared/types';

export interface ThemeColors {
  primary: THREE.Color;
  secondary: THREE.Color;
  tertiary: THREE.Color;
  particleColor: THREE.Color;
  waveColor: THREE.Color;
  glowColor: THREE.Color;
  bgHue1: number;
  bgHue2: number;
  bgHue3: number;
}

const themes: Record<ThemeName, ThemeColors> = {
  'neon-wave': {
    primary: new THREE.Color(0xff00aa),
    secondary: new THREE.Color(0xff44cc),
    tertiary: new THREE.Color(0x00ffcc),
    particleColor: new THREE.Color(0xff44cc),
    waveColor: new THREE.Color(0xff00aa),
    glowColor: new THREE.Color(0xff0088),
    bgHue1: 0.85,
    bgHue2: 0.92,
    bgHue3: 0.50,
  },
  fluid: {
    primary: new THREE.Color(0xff6600),
    secondary: new THREE.Color(0xffaa00),
    tertiary: new THREE.Color(0x44ff88),
    particleColor: new THREE.Color(0xff8800),
    waveColor: new THREE.Color(0xff6600),
    glowColor: new THREE.Color(0xff8800),
    bgHue1: 0.05,
    bgHue2: 0.12,
    bgHue3: 0.42,
  },
};

export class ThemeManager {
  private currentTheme: ThemeName = 'neon-wave';
  private listeners: Array<(theme: ThemeName, colors: ThemeColors) => void> = [];

  getCurrent(): ThemeName {
    return this.currentTheme;
  }

  getColors(): ThemeColors {
    return themes[this.currentTheme];
  }

  setTheme(name: ThemeName): void {
    this.currentTheme = name;
    const colors = themes[name];
    this.listeners.forEach((fn) => fn(name, colors));
  }

  onChange(fn: (theme: ThemeName, colors: ThemeColors) => void): void {
    this.listeners.push(fn);
  }

  getAllThemes(): ThemeName[] {
    return Object.keys(themes) as ThemeName[];
  }
}
