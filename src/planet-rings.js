import * as THREE from 'three';

export function createPlanetRings(count, colors, { innerRadius = 1.75, outerRadius = 2.65 } = {}) {
  const group = new THREE.Group();
  group.name = 'PlanetRings';
  group.rotation.set(1.08, -.25, -.18);
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 16;
    const context = canvas.getContext('2d');
    for (let x = 0; x < canvas.width; x++) {
      const angle = x / canvas.width * Math.PI * 2;
      const color = new THREE.Color(colors[i % colors.length]);
      const streak = .65 + .35 * Math.pow(.5 + .5 * Math.sin(angle * (9 + i * 2) + i), 3);
      color.multiplyScalar(streak);
      context.fillStyle = '#' + color.getHexString();
      context.fillRect(x, 0, 1, canvas.height);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(innerRadius + (outerRadius - innerRadius) * (i + .5) / count, Math.min(.08, (outerRadius - innerRadius) / count * .3), 8, 192),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    ring.name = `ChromaRing${i + 1}`;
    ring.scale.z = .3;
    ring.rotation.z = i * .8;
    group.add(ring);
  }
  return group;
}

export function disposePlanetRings(group) {
  if (!group) return;
  group.children.forEach(ring => {
    ring.geometry.dispose(); ring.material.map.dispose(); ring.material.dispose();
  });
}

export function ringAngularSpeed(index, speed) {
  return (.3 * (index + 1)) * speed * (index % 2 ? -1 : 1);
}

export function createRingAnimation(group, speed) {
  const tracks = [];
  group.children.forEach((ring, index) => {
    const angularSpeed = ringAngularSpeed(index, speed);
    if (!angularSpeed) return;
    const duration = 2 * Math.PI / (.3 * speed);
    const times = [], values = [];
    for (let frame = 0; frame <= 96; frame++) {
      times.push(duration * frame / 96);
      const quaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), ring.rotation.z + angularSpeed * duration * frame / 96);
      values.push(...quaternion.toArray());
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${ring.name}.quaternion`, times, values));
  });
  return tracks.length ? [new THREE.AnimationClip('Ring motion', -1, tracks)] : [];
}
