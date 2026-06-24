import * as THREE from 'three';
import { AudioFrame } from '../../shared/types';

export class WaveSystem {
  private rings: WaveRing[] = [];
  private scene: THREE.Scene;
  private ringCount = 8;
  private baseColor: THREE.Color;
  private prevTreble = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.baseColor = new THREE.Color(0x00aaff);
    this.initBaseRings();
  }

  setColor(color: THREE.Color): void {
    this.baseColor.copy(color);
    this.rings.forEach((ring) => ring.setBaseColor(color));
  }

  private initBaseRings(): void {
    for (let i = 0; i < this.ringCount; i++) {
      const ring = new WaveRing(this.scene, i);
      this.rings.push(ring);
    }
  }

  update(time: number, audio: AudioFrame): void {
    // Treble spike detection
    const trebleDelta = audio.treble - this.prevTreble;
    this.prevTreble = audio.treble;

    this.rings.forEach((ring) => {
      // Treble sudden jump → trigger kick
      if (trebleDelta > 0.01) {
        ring.addKick(audio.treble);
      }

      // Volume drives overall expansion
      ring.update(time, audio.volume, audio.bass);
    });
  }
}

class WaveRing {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private geometry: THREE.RingGeometry;
  private baseColor: THREE.Color;
  private kick = 0;
  private index: number;

  constructor(private scene: THREE.Scene, index: number) {
    this.index = index;
    this.baseColor = new THREE.Color(0x00aaff);
    // Thicker rings for visibility
    const radius = 0.8 + index * 0.6;
    this.geometry = new THREE.RingGeometry(radius, radius + 0.08, 64);
    this.material = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.z = -2;
    this.mesh.rotation.x = -Math.PI / 3;
    this.scene.add(this.mesh);
  }

  setBaseColor(color: THREE.Color): void {
    this.baseColor.copy(color);
  }

  addKick(treble: number): void {
    this.kick = Math.min(1, this.kick + treble * 3);
  }

  update(time: number, volume: number, bass: number): void {
    // Kick decays
    this.kick *= 0.92;

    // Natural slow expansion + volume + kick
    const phase = time * (0.3 + this.index * 0.04) + this.index * 0.7;
    const pulse = Math.sin(phase) * 0.5 + 0.5;
    const expansion = 0.4 + pulse * 0.3 + volume * 0.4 + this.kick * 0.6;

    const scale = Math.max(0.3, expansion);
    const opacity = Math.min(0.8, 0.1 + volume * 0.3 + this.kick * 0.4);
    const brightness = 0.4 + volume * 0.2 + this.kick * 0.3;

    this.mesh.scale.set(scale, scale, 1);
    this.material.opacity = opacity;
    this.material.color.setHSL(0.55 + bass * 0.05, 0.8, brightness);
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
  }
}
