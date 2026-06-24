import * as THREE from 'three';
import { AudioFrame } from '../../shared/types';
import { createLineTexture } from './textures';

interface LineParticle {
  velocity: THREE.Vector3;
  basePosition: THREE.Vector3;
  phase: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
}

export class LineParticleSystem {
  private count: number;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private particles: LineParticle[] = [];
  private scene: THREE.Scene;
  private visible = false;

  constructor(scene: THREE.Scene, count: number = 1200) {
    this.scene = scene;
    this.count = count;
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      color: 0xff00aa,
      size: 0.15,
      map: createLineTexture(),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.visible = false;
    this.scene.add(this.points);
    this.initParticles();
  }

  private initParticles(): void {
    const positions = new Float32Array(this.count * 3);
    const rotations = new Float32Array(this.count);

    for (let i = 0; i < this.count; i++) {
      const radius = 1.5 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta) - 2;

      rotations[i] = Math.random() * Math.PI * 2;

      this.particles.push({
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
          (Math.random() - 0.5) * 0.02,
        ),
        basePosition: new THREE.Vector3(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2],
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 1.2,
        rotation: rotations[i],
        rotationSpeed: (Math.random() - 0.5) * 0.02,
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  setFieldRadius(r: number): void {
    const s = r / 8;
    this.points.scale.set(s, s, s);
  }

  setColor(color: THREE.Color): void {
    this.material.color.copy(color);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.points.visible = v;
  }

  update(time: number, audio: AudioFrame): void {
    if (!this.visible) return;

    const posAttrib = this.geometry.attributes.position;
    const posArray = posAttrib.array as Float32Array;
    const bass = audio.bass;
    const treble = audio.treble;
    const vol = audio.volume;

    const explosion = treble * 4 + bass * 2;
    const pulse = bass * 2;

    for (let i = 0; i < this.count; i++) {
      const p = this.particles[i];
      const driftX = Math.sin(time * 0.3 + p.phase) * (0.15 + treble * 2 + bass * 1);
      const driftY = Math.cos(time * 0.25 + p.phase * 1.3) * (0.15 + treble * 2 + bass * 1);
      const driftZ = Math.sin(time * 0.2 + p.phase * 0.7) * (0.15 + treble * 1.5 + bass * 0.8);

      const burstX = Math.sin(time * 4 + p.phase) * explosion;
      const burstY = Math.cos(time * 3.5 + p.phase * 1.1) * explosion;
      const burstZ = Math.sin(time * 3 + p.phase * 0.9) * explosion * 0.5;

      posArray[i * 3] = p.basePosition.x + driftX + burstX;
      posArray[i * 3 + 1] = p.basePosition.y + driftY + burstY;
      posArray[i * 3 + 2] = p.basePosition.z + driftZ + burstZ;
    }

    posAttrib.needsUpdate = true;

    this.points.rotation.y += 0.002 + treble * 0.15;
    this.points.rotation.x += 0.001 + treble * 0.08;

    const hue = (0.85 + Math.sin(time * 0.04) * 0.08 + bass * 0.04) % 1;
    const color = new THREE.Color();
    color.setHSL(hue, 1.0, 0.5 + vol * 0.3);
    this.material.color.copy(color);

    this.material.size = 0.08 + audio.mid * 0.2 + bass * 0.15;
    this.material.opacity = 0.3 + vol * 0.6;
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.geometry.dispose();
    this.material.dispose();
  }
}
