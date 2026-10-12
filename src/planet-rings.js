import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ringDefaults = { style: 'band', tiltX: 0, tiltY: 0, tiltZ: 0, size: 1, width: 1, speed: 1, direction: 'auto', color: null };
export function normalizeRing(config = {}) { return { ...ringDefaults, ...config }; }

function ringGeometry(style, radius, width) {
  if (style === 'band' || style === 'tube') return new THREE.TorusGeometry(radius, width, 12, 192);
  const parts = [];
  const count = style === 'dashed' ? 32 : style === 'beads' ? 64 : 180;
  for (let i = 0; i < count; i++) {
    const angle = i / count * Math.PI * 2;
    if (style === 'dashed') {
      const part = new THREE.TorusGeometry(radius, width, 8, 8, Math.PI * 2 / count * .65);
      part.rotateZ(angle); parts.push(part);
    } else {
      const jitter = style === 'dust' ? Math.sin(i * 127.1) * width * 2 : 0;
      const size = style === 'dust' ? width * (.25 + .35 * (Math.sin(i * 91.7) + 1) / 2) : width * .85;
      const part = new THREE.SphereGeometry(size, 8, 6);
      part.translate(Math.cos(angle) * (radius + jitter), Math.sin(angle) * (radius + jitter), style === 'dust' ? Math.sin(i * 37.4) * width : 0);
      parts.push(part);
    }
  }
  const geometry = mergeGeometries(parts);
  parts.forEach(part => part.dispose());
  return geometry;
}

export function createPlanetRings(count, colors, { innerRadius = 1.75, outerRadius = 2.65, configs = [] } = {}) {
  const group = new THREE.Group(); group.name = 'PlanetRings';
  group.rotation.set(1.08, -.25, -.18);
  for (let i = 0; i < count; i++) {
    const config = normalizeRing(configs[i]);
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 16;
    const context = canvas.getContext('2d');
    for (let x = 0; x < canvas.width; x++) {
      const angle = x / canvas.width * Math.PI * 2;
      const color = new THREE.Color(config.color || colors[i % colors.length]);
      color.multiplyScalar(.65 + .35 * Math.pow(.5 + .5 * Math.sin(angle * (9 + i * 2) + i), 3));
      context.fillStyle = '#' + color.getHexString(); context.fillRect(x, 0, 1, canvas.height);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping;
    const radius = (innerRadius + (outerRadius - innerRadius) * (i + .5) / count) * config.size;
    const width = Math.min(.08, (outerRadius - innerRadius) / count * .3) * config.width;
    const ring = new THREE.Mesh(ringGeometry(config.style, radius, width), new THREE.MeshBasicMaterial({ map: texture }));
    ring.name = `ChromaRing${i + 1}`;
    ring.scale.z = config.style === 'band' || config.style === 'dashed' ? .3 : 1;
    ring.rotation.z = i * .8;
    ring.userData.ringSettings = config;
    // Tilt belongs to the pivot; spin stays on its child and preserves the chosen axis.
    const pivot = new THREE.Group(); pivot.name = `ChromaRingAxis${i + 1}`;
    pivot.rotation.set(...[config.tiltX, config.tiltY, config.tiltZ].map(THREE.MathUtils.degToRad));
    pivot.add(ring); group.add(pivot);
  }
  return group;
}

export function disposePlanetRings(group) {
  group?.traverse(ring => { if (ring.isMesh) { ring.geometry.dispose(); ring.material.map.dispose(); ring.material.dispose(); } });
}
export function ringAngularSpeed(index, speed, config = ringDefaults) {
  const direction = config.direction === 'clockwise' ? -1 : config.direction === 'counterclockwise' ? 1 : index % 2 ? -1 : 1;
  return .3 * (index + 1) * speed * config.speed * direction;
}
export function advanceRings(group, delta, speed) {
  group.children.forEach((pivot, index) => {
    const ring = pivot.children[0]; ring.rotation.z += delta * ringAngularSpeed(index, speed, ring.userData.ringSettings);
  });
}
export function createRingAnimation(group, speed) {
  const clips = [];
  group.children.forEach((pivot, index) => {
    const ring = pivot.children[0];
    const angularSpeed = ringAngularSpeed(index, speed, ring.userData.ringSettings);
    if (!angularSpeed) return;
    const duration = 2 * Math.PI / Math.abs(angularSpeed), times = [], values = [];
    for (let frame = 0; frame <= 96; frame++) {
      times.push(duration * frame / 96);
      values.push(...new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), ring.rotation.z + angularSpeed * duration * frame / 96).toArray());
    }
    clips.push(new THREE.AnimationClip(`Ring ${index + 1} spin`, duration, [new THREE.QuaternionKeyframeTrack(`${ring.name}.quaternion`, times, values)]));
  });
  return clips;
}
