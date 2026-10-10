// Dropworld -> Universal Space: exterior-only interchange.
// The receiving Space host decides coordinates and placement.
const PROTOCOL = 'universal-space.exterior/1';
const MAX_BYTES = 50 * 1024 * 1024;
let importedFile = null;

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function isGLB(buffer) {
  if (buffer.byteLength < 12) return false;
  const view = new DataView(buffer);
  return view.getUint32(0, true) === 0x46546c67 &&
    view.getUint32(4, true) === 2 &&
    view.getUint32(8, true) === buffer.byteLength;
}

function status(message) {
  const notice = document.querySelector('#space-connector-status');
  if (notice) notice.textContent = message;
}

export function setupSpaceConnector(exportCurrent) {
  const input = document.querySelector('#import-space-glb');
  const exportButton = document.querySelector('#export-to-space');
  const downloadButton = document.querySelector('#download-space-package');
  if (!input || !exportButton || !downloadButton) return;

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) { status('GLB is larger than 50 MB.'); return; }
    const bytes = await file.arrayBuffer();
    if (!isGLB(bytes)) { status('Invalid GLB 2.0 file.'); return; }
    importedFile = new Blob([bytes], { type: 'model/gltf-binary' });
    status('Imported exterior: ' + file.name + '. Export to Space to transfer it.');
  });

  async function exterior() {
    if (importedFile) return importedFile;
    const binary = await exportCurrent();
    if (!isGLB(binary)) throw new Error('Export did not produce a valid GLB.');
    return new Blob([binary], { type: 'model/gltf-binary' });
  }

  async function packageData() {
    const glb = await exterior();
    return {
      manifest: {
        protocol: PROTOCOL,
        id: 'dropworld-chroma',
        name: 'Chroma',
        repository: 'https://github.com/jamescharlesmcintosh-web/dropworld',
        ref: 'main',
        exterior: { format: 'glb', filename: 'chroma-world.glb' }
      },
      glb
    };
  }

  downloadButton.addEventListener('click', async () => {
    downloadButton.disabled = true;
    try {
      const { manifest, glb } = await packageData();
      download(glb, 'chroma-world.glb');
      download(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), 'space.json');
      status('Downloaded GLB and Space descriptor. No website is included.');
    } catch (error) { status('Export failed: ' + error.message); }
    finally { downloadButton.disabled = false; }
  });

  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      const { manifest, glb } = await packageData();
      // A host can expose an explicit adapter. Do not assume a cross-origin
      // parent window is trusted, or send binary data to arbitrary origins.
      const host = window.UniversalSpace;
      if (!host || typeof host.createPlace !== 'function' || typeof host.mountWorld !== 'function') {
        download(glb, 'chroma-world.glb');
        download(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }), 'space.json');
        status('Space host not connected. Downloaded exterior and descriptor for import.');
        return;
      }
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const bytes = await glb.arrayBuffer();
      const worldModule = {
        manifest: { protocol: 'universal-space.world/1', id: manifest.id },
        async mount({ root }) {
          // Host uses a small canvas and loads only the GLB exterior.
          const THREE = await import('three');
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
          camera.position.z = 5.5;
          const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
          renderer.setSize(160, 160);
          root.append(renderer.domElement);
          scene.add(new THREE.HemisphereLight(0xffffff, 0x555577, 2));
          const loader = new GLTFLoader();
          const model = await loader.parseAsync(bytes, '');
          scene.add(model.scene);
          renderer.render(scene, camera);
          return () => { renderer.dispose(); renderer.domElement.remove(); };
        }
      };
      const place = await host.createPlace({ id: 'dropworld-chroma-' + Date.now(), x: 0, y: 0, z: 0 });
      await host.mountWorld(place.id, worldModule);
      status('Exterior placed in connected Space at 0, 0, 0.');
    } catch (error) { status('Space transfer failed: ' + error.message); }
    finally { exportButton.disabled = false; }
  });
}
