import * as THREE from 'three';
import { AudioFrame } from '../../shared/types';

function buildGuitar(_size: number, color: number): THREE.Group {
  const g = new THREE.Group();
  const s = _size;

  const noteHead = new THREE.Mesh(
    new THREE.SphereGeometry(s * 0.22, 14, 14),
    new THREE.MeshBasicMaterial({ color })
  );
  noteHead.scale.set(1.15, 0.65, 0.7);
  noteHead.position.set(0, 0, 0);
  g.add(noteHead);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(s * 0.02, s * 0.025, s * 0.7, 6),
    new THREE.MeshBasicMaterial({ color })
  );
  stem.position.set(s * 0.2, s * 0.35, 0);
  g.add(stem);

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.bezierCurveTo(s * 0.28, s * 0.12, s * 0.22, s * 0.42, 0, s * 0.58);
  flagShape.bezierCurveTo(-s * 0.06, s * 0.42, -s * 0.06, s * 0.15, 0, 0);
  const flag = new THREE.Mesh(
    new THREE.ExtrudeGeometry(flagShape, { depth: s * 0.02, bevelEnabled: false }),
    new THREE.MeshBasicMaterial({ color })
  );
  flag.position.set(s * 0.2, s * 0.65, 0);
  g.add(flag);

  return g;
}

function layout(n: number): Array<{ x: number; y: number }> {
  const jitter = () => (Math.random() - 0.5) * 0.8;
  switch (n) {
    case 1: return [{ x: 0, y: 0 }];
    case 2: return [
      { x: -5.5 + jitter(), y: 0.5 + jitter() },
      { x: 5.5 + jitter(), y: -0.5 + jitter() },
    ];
    case 3: return [
      { x: 0 + jitter(), y: 3.5 + jitter() },
      { x: -4.8 + jitter(), y: -2.5 + jitter() },
      { x: 4.8 + jitter(), y: -2.5 + jitter() },
    ];
    case 4: return [
      { x: -4 + jitter(), y: 3 + jitter() },
      { x: 4 + jitter(), y: 3 + jitter() },
      { x: -4 + jitter(), y: -3 + jitter() },
      { x: 4 + jitter(), y: -3 + jitter() },
    ];
    case 5: return [
      { x: 0 + jitter(), y: 3.8 + jitter() },
      { x: -5 + jitter(), y: 1.2 + jitter() },
      { x: 5 + jitter(), y: 1.2 + jitter() },
      { x: -3.2 + jitter(), y: -3.2 + jitter() },
      { x: 3.2 + jitter(), y: -3.2 + jitter() },
    ];
    default: return [{ x: 0, y: 0 }];
  }
}

function sphereSize(count: number): number {
  const sizes = [0.45, 0.4, 0.35, 0.3, 0.28];
  return sizes[count - 1] ?? 0.25;
}

function ringCount(_count: number): number {
  return 12;
}

const CENTER_COLORS = [0xff3333, 0x33ff33, 0x3388ff, 0xffcc00, 0xff66ff];
const RING_COLORS = [0xff4444, 0xff8844, 0xffcc44, 0x44ff88, 0x44aaff, 0xcc66ff];

class PerCenterRing {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  private scene: THREE.Scene;
  index: number;
  t = 1;
  speed = 1;
  private innerR = 0.15;
  private outerR = 0.16;

  constructor(scene: THREE.Scene, index: number, x: number, y: number, z: number, color: number, width: number) {
    this.scene = scene;
    this.index = index;
    this.innerR = 0.15;
    this.outerR = this.innerR + width;
    const geo = new THREE.RingGeometry(this.innerR, this.outerR, 48);
    this.material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.set(x, y, z);
    this.mesh.rotation.x = -Math.PI / 3;
    this.mesh.scale.set(0.1, 0.1, 1);
    scene.add(this.mesh);
  }

  setWidth(w: number): void {
    this.outerR = this.innerR + w;
    const old = this.mesh.geometry;
    this.mesh.geometry = new THREE.RingGeometry(this.innerR, this.outerR, 48);
    old.dispose();
  }

  reset(): void {
    this.t = 0;
    this.speed = 0.35 + Math.random() * 0.2;
    this.mesh.scale.set(0.1, 0.1, 1);
    this.material.opacity = 0.9;
    this.mesh.visible = true;
  }

  setColor(_c: THREE.Color): void {
  }

  update(_time: number, vol: number, bass: number, volDelta: number, bassDelta: number): void {
    if (this.t >= 1) {
      this.mesh.visible = false;
      return;
    }
    this.t += 0.016 * this.speed * (1 + vol * 1.5 + bass);
    if (this.t >= 1) {
      this.t = 1;
      this.mesh.visible = false;
      return;
    }

    const pulse = 1 + Math.abs(volDelta) * 5 + Math.abs(bassDelta) * 3;
    const scale = (0.1 + this.t * 18) * pulse;
    const opacity = (1 - this.t) * 0.9;
    this.mesh.scale.set(scale, scale, 1);
    this.material.opacity = opacity;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

interface CenterUnit {
  rings: PerCenterRing[];
  nextRing: number;
  spawnTimer: number;
  prevVol: number;
  prevBass: number;
  instrument: THREE.Group;
  x: number;
  y: number;
  baseY: number;
}

export class GlowCenters {
  private units: CenterUnit[] = [];
  private scene: THREE.Scene;
  private _count = 1;
  private _ringWidth = 0.01;
  private _spread = 0.7;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.build(1);
  }

  get count(): number { return this._count; }

  setRingWidth(w: number): void {
    this._ringWidth = Math.max(0.002, Math.min(0.1, w));
    for (const u of this.units) {
      for (const r of u.rings) r.setWidth(this._ringWidth);
    }
  }

  setSpread(v: number): void {
    this._spread = Math.max(0.4, Math.min(1, v));
    this.rebuild();
  }

  setCount(n: number): void {
    this._count = Math.max(1, Math.min(5, n));
    this.rebuild();
  }

  private rebuild(): void {
    this.clear();
    this.build(this._count);
  }

  private clear(): void {
    for (const u of this.units) {
      for (const r of u.rings) r.dispose();
      u.instrument.removeFromParent();
      u.instrument.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
    }
    this.units = [];
  }

  private build(n: number): void {
    const raw = layout(n);
    let maxDist = 0;
    for (const p of raw) {
      const d = Math.sqrt(p.x * p.x + p.y * p.y);
      if (d > maxDist) maxDist = d;
    }
    const scale = maxDist > 0 ? this._spread * 8 / maxDist : 1;
    const positions = raw.map(p => ({ x: p.x * scale, y: p.y * scale }));
    const baseSize = sphereSize(n);
    const rCount = ringCount(n);

    for (let i = 0; i < n; i++) {
      const { x, y } = positions[i];
      const zPos = -2;

      const rings: PerCenterRing[] = [];
      for (let ri = 0; ri < rCount; ri++) {
        const ringColor = RING_COLORS[ri % RING_COLORS.length];
        rings.push(new PerCenterRing(this.scene, ri, x, y, zPos + 0.05, ringColor, this._ringWidth));
      }
      rings[0].reset();

      const color = CENTER_COLORS[i % CENTER_COLORS.length];
      const inst = buildGuitar(baseSize, color);
      inst.position.set(x, y, zPos);
      this.scene.add(inst);

      this.units.push({ rings, nextRing: 1, spawnTimer: 0, prevVol: 0, prevBass: 0, instrument: inst, x, y, baseY: y });
    }
  }

  setColor(_color: THREE.Color): void {
  }

  update(_time: number, audio: AudioFrame): void {
    const bass = audio.bass;
    const vol = audio.volume;

    for (const u of this.units) {
      const volDelta = vol - u.prevVol;
      const bassDelta = bass - u.prevBass;
      u.prevVol = vol;
      u.prevBass = bass;

      u.spawnTimer += 0.016;
      if (u.spawnTimer >= 0.25) {
        u.spawnTimer = 0;
        u.rings[u.nextRing].reset();
        u.nextRing = (u.nextRing + 1) % u.rings.length;
      }

      for (const r of u.rings) {
        r.update(_time, vol, bass, volDelta, bassDelta);
      }

      const bounce = bass * 0.8 + (audio.beat ? 0.3 : 0);
      u.instrument.position.y = u.baseY + bounce;
      const pulse = 1 + bass * 0.5 * vol;
      u.instrument.scale.setScalar(pulse);
    }
  }

  dispose(): void {
    this.clear();
  }
}
