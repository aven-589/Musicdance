import * as THREE from 'three';

export function createCircleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export const NOTE_SYMBOLS = ['♩', '♪', '♫', '♬', '♭', '♮', '♯'];

export function createNoteTexture(index: number): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const font = 'bold 80px "Segoe UI", "Arial Unicode MS", sans-serif';
  const char = NOTE_SYMBOLS[index];
  const cx = size / 2;
  const cy = size / 2 + 4;

  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 1. Extrusion layers (offset shadows for depth)
  for (let i = 5; i >= 1; i--) {
    ctx.fillStyle = `rgba(0,0,0,${0.03 + i * 0.04})`;
    ctx.fillText(char, cx + i * 1.5, cy + i * 1.5);
  }

  // 2. Thick outline
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.strokeText(char, cx, cy);

  // 3. Slightly offset inner edge (bevel transition)
  ctx.strokeStyle = 'rgba(160,160,220,0.3)';
  ctx.lineWidth = 1.5;
  ctx.strokeText(char, cx - 0.5, cy - 0.5);

  // 4. Radial gradient fill (3D lighting from top-left)
  const gradient = ctx.createRadialGradient(
    cx - 12, cy - 14, 4,
    cx, cy, size * 0.55
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(230,230,255,0.95)');
  gradient.addColorStop(0.55, 'rgba(190,190,240,0.9)');
  gradient.addColorStop(0.85, 'rgba(130,130,200,0.85)');
  gradient.addColorStop(1, 'rgba(80,80,160,0.8)');
  ctx.fillStyle = gradient;
  ctx.fillText(char, cx, cy);

  // 5. Shiny highlight (top-left specular)
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(char, cx - 2.5, cy - 2.5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createLineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 16);
  const gradient = ctx.createLinearGradient(0, 8, 128, 8);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.8, 'rgba(255,255,255,1)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 2, 128, 12);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
