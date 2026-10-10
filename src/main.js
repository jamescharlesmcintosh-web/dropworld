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
let renderer, scene, camera, controls, globe, halo, rings;
let rotationSpeed = .075;
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
  palettes[index].forEach((color, i) => { document.querySelector(`#color-${i}`).value = color; });
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
      uTime: { value: 0 }, uSeed: { value: seed }, uType: { value: 0 }, uDetail: { value: 1.7 },
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
      uniform float uTime, uSeed, uType, uDetail;
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
        vec3 p = vPosition*uDetail + vec3(uSeed,0.0,uSeed*.4);
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
        if (uType > .5 && uType < 1.5) color = mix(uColor0,uColor1,smoothstep(.2,.8,fbm(p*2.0))) * (.65+.35*noise(p*35.0));
        if (uType > 1.5 && uType < 2.5) color = mix(uColor0,uColor1,smoothstep(.48,.55,fbm(p))) + uColor2*smoothstep(.54,.57,fbm(p))*.15;
        if (uType > 2.5 && uType < 3.5) color = mix(mix(uColor0,uColor1,bands),uColor2,.5+.5*sin(p.y*9.0+fbm(p)*4.0));
        if (uType > 3.5 && uType < 4.5) color = mix(uColor0,uColor1,fbm(p*2.0)) + uColor2*pow(abs(sin(fbm(p)*35.0)),18.0)*.3;
        if (uType > 4.5) color = mix(uColor0,uColor1,smoothstep(.85,.95,abs(sin(fbm(p)*30.0)))) + uColor2*smoothstep(.93,.99,abs(sin(fbm(p)*30.0)))*.5;
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
  halo = new THREE.Mesh(new THREE.SphereGeometry(1.53,64,48),new THREE.ShaderMaterial({
    uniforms:{uGlow:{value:.22},uGlowColor:{value:new THREE.Color("#8257e8")}},
    transparent:true,depthWrite:false,side:THREE.BackSide,
    vertexShader:`varying vec3 vN; varying vec3 vV; void main(){vN=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.0);vV=-p.xyz;gl_Position=projectionMatrix*p;}`,
    fragmentShader:`uniform float uGlow; uniform vec3 uGlowColor; varying vec3 vN; varying vec3 vV; void main(){float rim=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.0);gl_FragColor=vec4(uGlowColor,rim*uGlow);}`,
  }));
  scene.add(halo);
  rings = new THREE.Mesh(new THREE.RingGeometry(1.48*1.18,1.48*1.8,128),new THREE.MeshBasicMaterial({color:'#c5b0ff',side:THREE.DoubleSide,transparent:true,opacity:.7}));
  rings.rotation.x = -Math.PI/2; rings.rotation.z = THREE.MathUtils.degToRad(25); rings.visible=false; scene.add(rings);
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height);
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    // Keep the desktop copy clear while framing the globe below the mobile title.
    const narrow = width < 700;
    const x = 0;
    const y = 0;
    globe.position.set(x,y,0); halo.position.copy(globe.position); rings.position.copy(globe.position);
    const scale = Math.min(1, (width / height) * 1.4);
    globe.scale.setScalar(scale); halo.scale.setScalar(scale); rings.scale.setScalar(scale);
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
      globe.rotation.y += delta*rotationSpeed;
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
    const binary = await exportWorld(renderer, globe, names[palette], [rings, halo], currentDesign());
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
  return exportWorld(renderer, globe, names[palette], [rings, halo], currentDesign());
});

const designIds = ['world-name','planet-type','surface-detail','rotation-speed','axial-tilt','rings-enabled','ring-size','ring-tilt','ring-color','atmosphere-enabled','atmosphere-glow','atmosphere-color', 'color-0','color-1','color-2','color-3'];
function currentDesign() {
  return Object.fromEntries(designIds.map(id => {const input=document.getElementById(id);return [id,input.type==='checkbox'?input.checked:input.value];}).concat([['paintSeed',seed],['paintTime',elapsed],['flow',flow],['palette',palette]]));
}
const defaults=currentDesign();
function applyDesign() {
  document.querySelector('h1 em').textContent=document.getElementById('world-name').value.trim()||'Untitled';
  if (!globe) return;
  globe.material.uniforms.uType.value=Number(document.getElementById('planet-type').value);
  globe.material.uniforms.uDetail.value=Number(document.getElementById('surface-detail').value);
  for(let i=0;i<4;i++) globe.material.uniforms['uColor'+i].value.set(document.getElementById('color-'+i).value);
  rotationSpeed=Number(document.getElementById('rotation-speed').value)/100;
  globe.rotation.z=THREE.MathUtils.degToRad(Number(document.getElementById('axial-tilt').value));
  rings.visible=document.getElementById('rings-enabled').checked;
  rings.geometry.dispose();rings.geometry=new THREE.RingGeometry(1.48*1.18,1.48*Number(document.getElementById('ring-size').value),128);
  rings.rotation.z=THREE.MathUtils.degToRad(Number(document.getElementById('ring-tilt').value));
  rings.material.color.set(document.getElementById('ring-color').value);
  halo.visible=document.getElementById('atmosphere-enabled').checked;
  halo.material.uniforms.uGlow.value=Number(document.getElementById('atmosphere-glow').value)/100;
  halo.material.uniforms.uGlowColor.value.set(document.getElementById('atmosphere-color').value);
  dirty=true;
}
function restoreDesign(design) {
  for(const id of designIds){const input=document.getElementById(id);if(design[id]!==undefined){if(input.type==='checkbox') input.checked=design[id];else input.value=design[id];}}
  seed=design.paintSeed??2.4; elapsed=design.paintTime??0; flow=design.flow??.35; palette=design.palette??0;
  document.getElementById('flow').value=flow*100;
  if(globe){globe.material.uniforms.uSeed.value=seed;globe.material.uniforms.uTime.value=elapsed;}
  applyDesign();
}
const designStatus=document.getElementById('design-status');
function readDesigns(){try{return JSON.parse(localStorage.getItem('dropworld-saved-designs')||'{}');}catch{return {};}}
function refreshDesigns(){const select=document.getElementById('saved-designs');select.replaceChildren(new Option('Choose a design',''));for(const [id,design] of Object.entries(readDesigns())) select.add(new Option(design['world-name']||'Untitled',id));}
for(const id of designIds) document.getElementById(id).addEventListener('input',applyDesign);
document.getElementById('planet-type').addEventListener('change',()=>{
  const colors=[palettes[0],['#a59982','#514a46','#d5c6a1','#272424'],['#176aaf','#5cac64','#b9e1ef','#164062'],['#e6c59e','#b3694d','#f1deb7','#75577b'],['#e0f5ff','#68accb','#ffffff','#405c8b'],['#211e27','#ff5b18','#ffbe36','#6e141c']][Number(document.getElementById('planet-type').value)];
  colors.forEach((color,i)=>document.getElementById('color-'+i).value=color);applyDesign();
});
document.getElementById('new-design').addEventListener('click',()=>{restoreDesign(defaults);document.getElementById('saved-designs').value='';designStatus.textContent='New world ready to design.';});
document.getElementById('reset').addEventListener('click',()=>restoreDesign(defaults));
document.getElementById('save-design').addEventListener('click',()=>{try{const designs=readDesigns();const id=document.getElementById('saved-designs').value||crypto.randomUUID();designs[id]=currentDesign();localStorage.setItem('dropworld-saved-designs',JSON.stringify(designs));refreshDesigns();document.getElementById('saved-designs').value=id;designStatus.textContent='Design saved in this browser.';}catch{designStatus.textContent='Browser storage is unavailable. Your current design can still be exported.';}});
document.getElementById('load-design').addEventListener('click',()=>{const design=readDesigns()[document.getElementById('saved-designs').value];if(design){restoreDesign(design);designStatus.textContent='Design loaded.';}else designStatus.textContent='Choose a saved design first.';});
document.getElementById('delete-design').addEventListener('click',()=>{try{const designs=readDesigns();delete designs[document.getElementById('saved-designs').value];localStorage.setItem('dropworld-saved-designs',JSON.stringify(designs));refreshDesigns();designStatus.textContent='Saved design removed. Current world remains editable.';}catch{designStatus.textContent='Browser storage is unavailable.';}});
refreshDesigns();applyDesign();
