import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Bake object-space paint into an equirectangular image. Lighting remains
// the destination's responsibility, rather than being painted into the map.
export async function exportWorld(renderer, globe, paletteName) {
  const width = 2048, height = 1024;
  const target = new THREE.WebGLRenderTarget(width, height);
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const bakeScene = new THREE.Scene();
  const bakeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  bakeCamera.position.z = 1;
  const material = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.clone(globe.material.uniforms),
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: globe.material.fragmentShader
      .replace('varying vec3 vPosition, vNormal, vView;', 'varying vec2 vUv;')
      .replace('void main() {', `void main() {
        float phi = vUv.x * 6.28318530718;
        float theta = (1.0 - vUv.y) * 3.14159265359;
        vec3 vPosition = 1.48 * vec3(-cos(phi)*sin(theta), cos(theta), sin(phi)*sin(theta));`)
      .replace(/vec3 n = normalize\(vNormal\)[\s\S]*?gl_FragColor = vec4\(color,1\.0\);/, 'gl_FragColor = vec4(color,1.0);'),
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  bakeScene.add(plane);
  const previousTarget = renderer.getRenderTarget();
  let exportedMesh, texture;
  try {
    const pixels = new Uint8Array(width * height * 4);
    try {
      renderer.setRenderTarget(target);
      renderer.render(bakeScene, bakeCamera);
      renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    } finally {
      renderer.setRenderTarget(previousTarget);
    }
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Texture export requires Canvas2D support.');
    const image = context.createImageData(width, height);
    const rowBytes = width * 4;
    for (let y = 0; y < height; y++) {
      image.data.set(pixels.subarray((height-1-y)*rowBytes, (height-y)*rowBytes), y*rowBytes);
    }
    context.putImageData(image, 0, 0);
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    exportedMesh = new THREE.Mesh(globe.geometry.clone(), new THREE.MeshStandardMaterial({ map: texture, roughness: .82, metalness: 0 }));
    exportedMesh.name = 'Chroma';
    exportedMesh.quaternion.copy(globe.quaternion);
    exportedMesh.userData = {
      world: 'Chroma', palette: paletteName, paintSeed: material.uniforms.uSeed.value,
      paintTime: material.uniforms.uTime.value,
      note: 'Static paint snapshot. Host controls placement, scale, lighting, and animation.',
    };
    const exportScene = new THREE.Scene();
    exportScene.name = 'Dropworld'; exportScene.add(exportedMesh);
    return await new GLTFExporter().parseAsync(exportScene, { binary: true });
  } finally {
    target.dispose(); plane.geometry.dispose(); material.dispose();
    texture?.dispose(); exportedMesh?.geometry.dispose(); exportedMesh?.material.dispose();
  }
}
