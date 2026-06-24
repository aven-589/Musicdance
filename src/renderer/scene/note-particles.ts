import * as THREE from 'three';
import { AudioFrame } from '../../shared/types';
import { createNoteTexture, NOTE_SYMBOLS } from './textures';

const GROUP_COUNT = NOTE_SYMBOLS.length;

interface NoteParticle {
  velocity: THREE.Vector3;
  basePosition: THREE.Vector3;
  phase: number;
  speed: number;
}

class NoteGroup {
  geometry: THREE.BufferGeometry;
  material: THREE.PointsMaterial;
  points: THREE.Points;
  particles: NoteParticle[] = [];
  count: number;

  constructor(scene: THREE.Scene, textureIndex: number, count: number) {
    this.count = count;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.22,
      map: createNoteTexture(textureIndex),
      transparent: true,
      opacity: 0.9,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    scene.add(this.points);
    this.init();
  }

  private init(): void {
    const positions = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
      const radius = 1.5 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 2;
      this.particles.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
        ),
        basePosition: new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 1.2,
      });
    }
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  setColor(color: THREE.Color): void {
    this.material.color.copy(color);
  }

  setVisible(v: boolean): void {
    this.points.visible = v;
  }

  update(time: number, treble: number, bass: number): void {
    const pos = this.geometry.attributes.position.array as Float32Array;
    const explosion = treble * 4 + bass * 2;
    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      pos[i * 3] = p.basePosition.x + Math.sin(time * 0.3 + p.phase) * (0.15 + treble * 2 + bass * 1)
        + Math.sin(time * 4 + p.phase) * explosion;
      pos[i * 3 + 1] = p.basePosition.y + Math.cos(time * 0.25 + p.phase * 1.3) * (0.15 + treble * 2 + bass * 1)
        + Math.cos(time * 3.5 + p.phase * 1.1) * explosion;
      pos[i * 3 + 2] = p.basePosition.z + Math.sin(time * 0.2 + p.phase * 0.7) * (0.15 + treble * 1.5 + bass * 0.8)
        + Math.sin(time * 3 + p.phase * 0.9) * explosion * 0.5;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.points.rotation.y += 0.002 + treble * 0.15;
    this.points.rotation.x += 0.001 + treble * 0.08;
  }

  setSize(s: number): void { this.material.size = s; }
  setOpacity(o: number): void { this.material.opacity = o; }

  dispose(): void {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

export class NoteParticleSystem {
  private groups: NoteGroup[] = [];
  private scene: THREE.Scene;
  private visible = false;

  constructor(scene: THREE.Scene, totalCount: number = 840) {
    this.scene = scene;
    const perGroup = Math.floor(totalCount / GROUP_COUNT);
    for (let i = 0; i < GROUP_COUNT; i++) {
      this.groups.push(new NoteGroup(scene, i, perGroup));
    }
  }

  setFieldRadius(r: number): void {
    const s = r / 8;
    this.groups.forEach((g) => g.points.scale.set(s, s, s));
  }

  setColor(color: THREE.Color): void {
    this.groups.forEach((g) => g.setColor(color));
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.groups.forEach((g) => g.setVisible(v));
  }

  update(time: number, audio: AudioFrame): void {
    if (!this.visible) return;
    const treble = audio.treble;
    const bass = audio.bass;
    const vol = audio.volume;
    this.groups.forEach((g) => g.update(time, treble, bass));

    const hue = (0.08 + Math.sin(time * 0.04) * 0.06 + bass * 0.04) % 1;
    const color = new THREE.Color();
    color.setHSL(hue, 0.9, 0.5 + vol * 0.3);
    this.groups.forEach((g) => {
      g.material.color.copy(color);
      g.setSize(0.16 + audio.mid * 0.15 + bass * 0.12);
      g.setOpacity(0.3 + vol * 0.6);
    });
  }

  dispose(): void {
    this.groups.forEach((g) => g.dispose());
  }
}
