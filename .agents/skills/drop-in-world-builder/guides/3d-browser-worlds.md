# 3D browser worlds

Use an appropriate renderer; Three.js is a useful option, not a universal requirement.

- Keep scene geometry, camera, lighting, materials, and interaction independent from host code.
- Bundle dependencies and assets into the production package. Procedural textures can avoid external asset requirements.
- Resize the renderer and camera from the actual container, including host-driven resizing. Cap device pixel ratio for mobile GPU use.
- Provide predictable orbit/zoom controls, reset, pause, accessible DOM controls, and a reduced-motion default.
- Pause background activity when hidden. Give a clear fallback if WebGL is unavailable.
- If embedded presentation is useful, offer an optional minimal or transparent mode; avoid requiring the host to adopt it.
- Test shader compilation, a real rendered frame, visual appearance, responsive sizing, interactions, and the relocated production package.
- Ship the built folder plus loading instructions. Static web bundles generally require an HTTP(S) server; do not claim double-click file loading unless tested.

## Chroma reference implementation

`dropworld` contains one Three.js scene with an orbiting spherical world and animated paint marbling. Paint color and brush-like grain are procedural shader output. Four palettes, flow speed, pause, reset, remix, and PNG capture are standalone controls.

The scene uses object-local positions for seam-free procedural texture coordinates, view-space normals for lighting, perspective orbit navigation, and a bounded animation delta. One WebGL renderer owns the scene; the CSS fallback appears only when rendering fails. Reduced motion starts paused. Mobile pixel ratio is capped at 1.75; geometry and uniforms are retained rather than recreated each frame. No permission-dependent features or external service credentials are required.

Default entry: `index.html` in the production `dist/` directory served over HTTP(S). Optional scene-only entry: `index.html?embed=1`. Hosts control container size and placement; no Backgrid or Vault Venture-specific API is claimed.
