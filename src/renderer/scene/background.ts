import * as THREE from 'three';
import { AudioFrame } from '../../shared/types';

const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uVolume;
uniform vec3 uHues;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise2d(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise2d(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = vUv;

  vec2 center = uv * 2.0 - 1.0;
  center.x *= 1.777;

  float flow1 = fbm(vec2(
    uv.x * 2.0 + uTime * 0.03,
    uv.y * 2.0 + uTime * 0.02 + uBass * 0.3
  ));

  float flow2 = fbm(vec2(
    uv.x * 3.0 - uTime * 0.04 + uMid * 0.5,
    uv.y * 3.0 + uTime * 0.01
  ));

  float stars = 0.0;
  for (int i = 0; i < 3; i++) {
    vec2 starUv = uv * (8.0 + float(i) * 4.0);
    vec2 cell = floor(starUv);
    vec2 local = fract(starUv) - 0.5;
    float star = smoothstep(0.4, 0.0, length(local));
    float twinkle = sin(uTime * (1.5 + float(i)) + hash(cell) * 6.28) * 0.5 + 0.5;
    stars += star * twinkle * 0.3;
  }

  float hue1 = uHues.x + uBass * 0.08 + sin(uTime * 0.02) * 0.05;
  float hue2 = uHues.y + uMid * 0.1 + sin(uTime * 0.03 + 1.0) * 0.05;
  float hue3 = uHues.z + uTreble * 0.12 + sin(uTime * 0.04 + 2.0) * 0.05;

  vec3 color1 = 0.5 + 0.5 * cos(6.28318 * vec3(hue1, hue1 + 0.1, hue1 + 0.2));
  vec3 color2 = 0.5 + 0.5 * cos(6.28318 * vec3(hue2, hue2 + 0.1, hue2 + 0.2));
  vec3 color3 = 0.5 + 0.5 * cos(6.28318 * vec3(hue3, hue3 + 0.1, hue3 + 0.2));

  float rings = sin(length(center) * 15.0 - uTime * 0.5 + uBass * 2.0) * 0.5 + 0.5;
  rings *= smoothstep(0.8, 0.2, length(center));

  vec3 bgColor = mix(color1, color2, flow1);
  bgColor = mix(bgColor, color3, flow2 * 0.5);
  bgColor += stars;
  bgColor += rings * vec3(0.2, 0.4, 0.8) * (0.3 + uVolume * 0.5);

  float pulse = sin(uTime * 4.0 + uBass * 10.0) * 0.5 + 0.5;
  pulse = pow(pulse, 4.0);
  bgColor += vec3(0.3, 0.5, 1.0) * pulse * uBass * 0.6;

  float vignette = 1.0 - length(center) * 0.6;
  bgColor *= vignette;

  gl_FragColor = vec4(bgColor, 1.0);
}
`;

export class DynamicBackground {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uVolume: { value: 0 },
        uHues: { value: new THREE.Vector3(0.55, 0.65, 0.75) },
      },
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    this.scene.add(this.mesh);
  }

  setHues(h1: number, h2: number, h3: number): void {
    this.material.uniforms.uHues.value.set(h1, h2, h3);
  }

  update(time: number, audio: AudioFrame): void {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uBass.value = audio.bass;
    this.material.uniforms.uMid.value = audio.mid;
    this.material.uniforms.uTreble.value = audio.treble;
    this.material.uniforms.uVolume.value = audio.volume;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
