const PROTOCOL = 'universal-space.exterior/1';
const REPOSITORY = 'https://github.com/jamescharlesmcintosh-web/dropworld';
const DEFAULT_SPACE = 'https://jamescharlesmcintosh-web.github.io/space/';

export function setupSpaceConnector(exportCurrent) {
  const input = document.querySelector('#import-space-glb');
  const publish = document.querySelector('#export-to-space');
  const download = document.querySelector('#download-space-package');
  const notice = document.querySelector('#space-connector-status');
  let imported = null;
  const status = text => { notice.textContent = text; };

  const valid = bytes => {
    if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 12 || bytes.byteLength > 50 * 1024 * 1024) return false;
    const view = new DataView(bytes);
    return view.getUint32(0, true) === 0x46546c67 && view.getUint32(4, true) === 2 && view.getUint32(8, true) === bytes.byteLength;
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const bytes = await file.arrayBuffer();
    if (!valid(bytes)) { status('Invalid GLB 2.0 (50 MB maximum).'); return; }
    imported = bytes;
    status('Imported ' + file.name + '. Ready to publish.');
  });

  async function bytes() {
    const result = imported || await exportCurrent();
    if (!valid(result)) throw new Error('Exterior is not a valid GLB.');
    return result;
  }

  download.addEventListener('click', async () => {
    try {
      const binary = await bytes();
      const url = URL.createObjectURL(new Blob([binary], { type: 'model/gltf-binary' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'chroma-world.glb'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status('GLB downloaded.');
    } catch (error) { status(error.message); }
  });

  publish.addEventListener('click', async () => {
    publish.disabled = true;
    let popup;
    let timeout;
    let listener;
    try {
      const target = new URL(localStorage.getItem('dropworld-space-url') || DEFAULT_SPACE);
      if (target.protocol !== 'https:') throw new Error('Space must use HTTPS.');
      target.searchParams.set('connect_origin', location.origin);
      popup = window.open(target.href, 'dropworld-space', 'width=1100,height=750');
      if (!popup) throw new Error('Allow the Space popup and try again.');
      status('Connecting to Space…');
      const binary = await bytes();
      const requestId = crypto.randomUUID();
      await new Promise((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Space did not respond. Check the Space URL and deployment.')), 25000);
        listener = event => {
          if (event.origin !== target.origin || event.source !== popup || event.data?.protocol !== PROTOCOL) return;
          if (event.data.type === 'ready') {
            popup.postMessage({ protocol: PROTOCOL, type: 'publish', requestId, repository: REPOSITORY, exteriorId: 'chroma', bytes: binary }, target.origin);
          } else if (event.data.requestId === requestId && event.data.type === 'published') {
            status('Placed in Space: ' + event.data.placeId);
            resolve();
          } else if (event.data.requestId === requestId && event.data.type === 'error') {
            reject(new Error(event.data.message));
          }
        };
        window.addEventListener('message', listener);
      });
    } catch (error) { status(error.message); }
    finally {
      if (timeout) clearTimeout(timeout);
      if (listener) window.removeEventListener('message', listener);
      publish.disabled = false;
    }
  });
}
