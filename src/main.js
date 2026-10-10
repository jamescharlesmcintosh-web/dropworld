import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const embedded = new URLSearchParams(location.search).get('embed') === '1';
if (embedded) document.body.classList.add('embed');
const container = document.querySelector('#scene');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const names = ['Prismatic', 'Lagoon', 'Ember', 'Twilight'];
const palettes = [
  ['#75e1cf', '#6258df', '#ee70b4', '#ffbc77'],
  ['#c8ef84', '#49dcbf', '#197fa8', '#423d9f'],
  ['#fff0a6', '#ffad68', '#e85174', '#792d76'],
  ['#b9edf5', '#be99ed', '#7960bd', '#3c5489'],
];
let renderer, scene, camera, controls, globe;
let paused = reducedMotion.matches, flow = 0.35, seed = 2.4, palette = 0;
let dirty = true, elapsed = 0, previous = performance.now();
const announce = (message) => { document.querySelector('#announcement').textContent = message; };
function syncPause() {
  const button = document.querySelector('#pause');
  button.setAttribute('aria-pressed', String(paused));
  button.innerHTML = paused ? '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1l8 5-8 5z" fill="none" stroke="currentColor"/></svg><span>Resume motion</span>' : '<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1v10M9 1v10" stroke="currentColor" stroke-width="2"/></svg><span>Pause motion</span>';
  document.querySelector('#motion-status').textContent = paused ? 'WORLD AT REST' : 'WORLD IN MOTION';
}
function selectPalette(index) {
  palette = index;
  if (globe) palettes[index].forEach((color, i) => globe.material.uniforms[`uColor${i}`].value.set(color));
  document.querySelectorAll('.palette').forEach((button) => {
    const active = Number(button.dataset.palette) === index;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.querySelector('#palette-name').textContent = names[index];
  dirty = true;
}

try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x0c0e16, embedded ? 0 : 1);
  container.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6.9);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = !reducedMotion.matches;
  controls.dampingFactor = 0.07;
  controls.minDistance = 4.2;
  controls.maxDistance = 10;
  controls.addEventListener('change', () => { dirty = true; });
  globe = new THREE.Mesh(new THREE.SphereGeometry(1.48, 128, 96), new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uSeed: { value: seed },
      ...Object.fromEntries(palettes[0].map((color, i) => [`uColor${i}`, { value: new THREE.Color(color) }])),
    },
    vertexShader: `
      varying vec3 vPosition;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vView = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime, uSeed;
      uniform vec3 uColor0, uColor1, uColor2, uColor3;
      varying vec3 vPosition, vNormal, vView;
      float hash(vec3 p) { p = fract(p * .3183099 + vec3(.1,.2,.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
      float fbm(vec3 p) {
        float v=0.0, a=.5;
        for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(1.7,9.2,4.6);a*=.5;}
        return v;
      }
      void main() {
        vec3 p = vPosition*1.7 + vec3(uSeed,0.0,uSeed*.4);
        float t = uTime*.075;
        vec3 q = vec3(fbm(p+vec3(0,t,0)),fbm(p+vec3(3.4,1.2,t)),fbm(p+vec3(t,7.1,2.4)));
        vec3 r = vec3(fbm(p+3.4*q+vec3(1.7,9.2,t)),fbm(p+3.4*q+vec3(8.3,t,2.8)),fbm(p+3.4*q+vec3(t,2.2,6.4)));
        float pigment = fbm(p+3.6*r);
        float marble = sin(p.z*2.0 + pigment*18.0 + r.y*7.0);
        float bands = marble*.5+.5;
        vec3 color = mix(uColor0,uColor1,smoothstep(.04,.5,bands));
        color = mix(color,uColor2,smoothstep(.42,.8,bands));
        color = mix(color,uColor3,smoothstep(.76,1.0,bands));
        float strokes = sin(pigment*170.0+r.x*20.0);
        float grain = noise(p*180.0);
        color *= .88+.12*strokes+.035*grain;
        vec3 n = normalize(vNormal), view = normalize(vView);
        vec3 light = normalize(vec3(-.65,.9,1.3));
        float diffuse = max(dot(n,light),0.0);
        float spec = pow(max(dot(n,normalize(light+view)),0.0),46.0);
        float rim = pow(1.0-max(dot(n,view),0.0),3.0);
        color *= .26 + .91*diffuse;
        color += vec3(.86,.79,1.0)*spec*.24 + vec3(.22,.13,.4)*rim*.5;
        gl_FragColor = vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
  globe.rotation.z = -.18;
  scene.add(globe);
  // Quiet stars stay behind the planet; none are external assets.
  const positions = new Float32Array(240 * 3);
  let randomState = 321;
  const random = () => { randomState = (randomState * 1664525 + 1013904223) >>> 0; return randomState / 4294967296; };
  for (let i=0;i<240;i++) positions.set([(random()-.5)*28,(random()-.5)*18,-5-random()*12],i*3);
  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions,3));
  const stars = new THREE.Points(starsGeometry,new THREE.PointsMaterial({ color:0xa29bc4,size:.014,transparent:true,opacity:.5 }));
  if (!embedded) scene.add(stars);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.53,64,48),new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.BackSide,
    vertexShader:`varying vec3 vN; varying vec3 vV; void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vV=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`varying vec3 vN; varying vec3 vV; void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);gl_FragColor=vec4(.51,.34,.91,rim*.22);}`,
  }));
  scene.add(halo);
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    // Keep the desktop copy clear while framing the globe below the mobile title.
    const narrow = width < 700;
    const x = embedded ? 0 : narrow ? 0 : .65;
    const y = embedded ? 0 : narrow ? -.45 : 0;
    globe.position.set(x,y,0); halo.position.copy(globe.position);
    const scale = embedded ? Math.min(1, (width / height) * 1.4) : narrow ? .82 : 1;
    globe.scale.setScalar(scale); halo.scale.setScalar(scale);
    controls.target.set(0,0,0);
    dirty = true;
  }
  new ResizeObserver(resize).observe(container);
  resize();
  function render(now) {
    requestAnimationFrame(render);
    const delta = Math.min((now-previous)/1000,.05);
    previous = now;
    if (document.hidden || !container.clientWidth || !container.clientHeight) return;
    if (!paused) {
      elapsed += delta*flow;
      globe.material.uniforms.uTime.value = elapsed;
      globe.rotation.y += delta*.075;
      dirty = true;
    }
    controls.update();
    if (dirty) {
      renderer.render(scene,camera);
      dirty = false;
      document.documentElement.dataset.ready = 'true';
    }
  }
  requestAnimationFrame(render);
  renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    container.hidden = true;
    document.querySelector('#fallback').hidden = false;
    announce('3D rendering was interrupted. Reload to restore it.');
  });
} catch (error) {
  console.error('Unable to initialize the 3D planet:', error);
  container.hidden = true;
  document.querySelector('#fallback').hidden = false;
  document.documentElement.dataset.ready = 'fallback';
}

syncPause();
document.querySelectorAll('.palette').forEach((button) => button.addEventListener('click', () => {
  selectPalette(Number(button.dataset.palette)); announce(`${names[palette]} palette selected.`);
}));
document.querySelector('#flow').addEventListener('input', (event) => { flow = Number(event.target.value)/100; });
document.querySelector('#pause').addEventListener('click', () => { paused = !paused; syncPause(); announce(paused ? 'Motion paused.' : 'Motion resumed.'); });
document.querySelector('#remix').addEventListener('click', () => {
  seed = Math.random()*100;
  if (globe) globe.material.uniforms.uSeed.value = seed;
  selectPalette((palette+1)%palettes.length);
  announce(`World remixed with ${names[palette]} paint.`);
});
document.querySelector('#reset').addEventListener('click', () => {
  elapsed = 0; seed = 2.4; flow = .35; paused = reducedMotion.matches;
  document.querySelector('#flow').value = '35';
  if (globe) { globe.material.uniforms.uSeed.value = seed; globe.material.uniforms.uTime.value=0; globe.rotation.set(0,0,-.18); }
  controls?.reset(); selectPalette(0); syncPause(); announce('Planet and view reset.');
});
document.querySelector('#snapshot').addEventListener('click', () => {
  if (!renderer || container.hidden) { announce('Image capture requires an active 3D renderer.'); return; }
  renderer.render(scene,camera);
  const link = document.createElement('a');
  link.download = 'dropworld-chroma.png'; link.href=renderer.domElement.toDataURL('image/png'); link.click();
  announce('Planet image saved.');
});
reducedMotion.addEventListener('change', (event) => {
  paused=event.matches; if(controls) controls.enableDamping=!event.matches; syncPause(); dirty=true;
});

const exportButton = document.querySelector('#export-world');
exportButton.addEventListener('click', async () => {
  const notice = document.querySelector('#export-notice');
  notice.hidden = false;
  if (!renderer || !globe || container.hidden) {
    notice.textContent = 'World export requires an active 3D renderer.';
    return;
  }
  exportButton.disabled = true;
  exportButton.textContent = 'Exporting…';
  notice.textContent = 'Preparing your planet and paint texture…';
  try {
    const { exportWorld } = await import('./export-world.js');
    const binary = await exportWorld(renderer, globe, names[palette]);
    const url = URL.createObjectURL(new Blob([binary], { type: 'model/gltf-binary' }));
    const link = document.createElement('a');
    link.download = 'chroma-world.glb'; link.href = url; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    notice.textContent = 'World exported as GLB with its current paint texture. Animated paint stays in the web experience.';
  } catch (error) {
    console.error('World export failed:', error);
    notice.textContent = 'Export failed. Please try again or reload the experience.';
  } finally {
    dirty = true;
    exportButton.disabled = false;
    exportButton.innerHTML = '↓ &nbsp; Export world';
  }
});

import { setupSpaceConnector } from './space-connector.js';
setupSpaceConnector(async () => {
  if (!renderer || !globe || container.hidden) throw new Error('3D renderer unavailable.');
  const { exportWorld } = await import('./export-world.js');
  return exportWorld(renderer, globe, names[palette]);
});
