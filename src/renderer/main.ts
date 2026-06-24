import './global';
import * as THREE from 'three';
import { LineParticleSystem } from './scene/line-particles';
import { NoteParticleSystem } from './scene/note-particles';
import { GlowCenters } from './scene/glow-centers';
import { AudioFrame, ThemeName } from '../shared/types';
import { ThemeManager } from './theme';
import { UIController } from './ui';

console.log('[Renderer] Starting');

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 6);
camera.lookAt(0, 0, -1);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const loading = document.getElementById('loading');
if (loading) loading.style.display = 'none';

const lineParticles = new LineParticleSystem(scene);
const noteParticles = new NoteParticleSystem(scene);
const glowCenters = new GlowCenters(scene);

const themeManager = new ThemeManager();
themeManager.onChange((theme, colors) => {
  glowCenters.setColor(colors.glowColor);
  lineParticles.setColor(colors.particleColor);
  noteParticles.setColor(colors.particleColor);

  lineParticles.setVisible(theme === 'neon-wave');
  noteParticles.setVisible(theme === 'fluid');
});

const colors = themeManager.getColors();
glowCenters.setColor(colors.glowColor);
lineParticles.setColor(colors.particleColor);
noteParticles.setColor(colors.particleColor);

lineParticles.setVisible(true);
noteParticles.setVisible(false);

let isPaused = false;
let autoRotate = true;
let immersive = false;
let intensity = 1.0;
let centerCount = 1;
let cameraRadius = 8;

// Camera orbit state (spherical coords)
let camTheta = 0;
let camPhi = 0.15;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragTheta = 0;
let dragPhi = 0;

// Real-time audio from main process
let currentAudio: AudioFrame | null = null;
let lastAudioTime = 0;

document.addEventListener('keydown', (e) => {
  if (e.key === 'b' || e.key === 'B') {
    toggleImmersive();
    e.preventDefault();
  }
});

// Global shortcut from main process (Ctrl+Shift+B)
if (typeof window.electronAPI !== 'undefined' && window.electronAPI.onToggleImmersive) {
  window.electronAPI.onToggleImmersive(() => toggleImmersive());
}

function toggleImmersive(): void {
  immersive = !immersive;
  ui.setLocked(immersive);
}

// Real-time audio from main process
if (typeof window.electronAPI !== 'undefined' && window.electronAPI.onAudioData) {
  window.electronAPI.onAudioData((data: AudioFrame) => {
    currentAudio = { ...data };
    lastAudioTime = performance.now();
  });
}

function getAudio(): AudioFrame {
  if (currentAudio !== null && (performance.now() - lastAudioTime < 2000) && currentAudio.volume > 0) {
    return currentAudio;
  }
  return { volume: 0.02, bass: 0.01, mid: 0.01, treble: 0.01, beat: false };
}

const ui = new UIController({
  onTogglePause: () => { isPaused = !isPaused; },
  onToggleAutoRotate: () => { autoRotate = !autoRotate; },
  onSetIntensity: (value: number) => { intensity = value; },
  onSetTheme: (theme: ThemeName) => { themeManager.setTheme(theme); },
  onSetCenterCount: (n: number) => {
    centerCount = n;
    glowCenters.setCount(n);
  },
  onSetRingWidth: (v: number) => {
    glowCenters.setRingWidth(v);
  },
  onSetSpread: (v: number) => {
    glowCenters.setSpread(v);
  },
  onSetCameraRadius: (v: number) => {
    cameraRadius = v;
    lineParticles.setFieldRadius(v);
    noteParticles.setFieldRadius(v);
  },
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse drag orbit
renderer.domElement.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragTheta = camTheta;
  dragPhi = camPhi;
});

document.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.clientX - dragStartX;
  const dy = e.clientY - dragStartY;
  camTheta = dragTheta - dx * 0.008;
  camPhi = Math.max(-0.3, Math.min(0.8, dragPhi + dy * 0.008));
});

document.addEventListener('mouseup', () => {
  isDragging = false;
});

function updateCamera(): void {
  const radius = cameraRadius;
  camera.position.x = radius * Math.cos(camPhi) * Math.sin(camTheta);
  camera.position.y = radius * Math.sin(camPhi) + 0.5;
  camera.position.z = radius * Math.cos(camPhi) * Math.cos(camTheta);
  camera.lookAt(0, 0, -1);
}

function animate() {
  requestAnimationFrame(animate);
  const time = performance.now() / 1000;

  const raw = getAudio();
  const vol = raw.volume;
  const bass = raw.bass;
  const mid = raw.mid;
  const treble = raw.treble;

  const scaledAudio: AudioFrame = {
    volume: vol * intensity,
    bass: bass * intensity,
    mid: mid * intensity,
    treble: treble * intensity,
    beat: raw.beat,
  };

  if (!isPaused) {
    lineParticles.update(time, scaledAudio);
    noteParticles.update(time, scaledAudio);
    glowCenters.update(time, scaledAudio);
  }

  if (autoRotate && !isPaused) {
    camTheta += 0.01;
  }
  updateCamera();

  renderer.render(scene, camera);
}

animate();
console.log('[Renderer] Running');
