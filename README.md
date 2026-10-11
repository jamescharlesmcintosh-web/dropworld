# Dropworld · Chroma

A standalone 3D planet with animated, colorful paint textures. Drag to orbit, scroll or pinch to zoom, choose a palette, adjust paint flow, or remix the world. Pause motion, reset the view, and capture a PNG with the controls. Reduced-motion preferences start the experience paused.

## Run and build

Requires Node.js 20.19+ or 22.12+ (tested on Node 24) and npm.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Development entry: the root page served by Vite (default port 5173). Production entry: `dist/index.html`, served over HTTP(S). The generated `dist/` folder includes all runtime dependencies and uses relative asset paths. No API keys, external fonts, or remote texture requests are needed.

## Export the 3D world itself

Click **Export world** to download `chroma-world.glb`. It contains the sphere geometry, material, and a baked 2048 × 1024 PNG of the current paint texture in one file. Import it into any compatible glTF/GLB viewer or engine. The planet is centered at the origin with radius 1.48 units; the host chooses placement, scale, and lighting. No website UI or star field is included.

GLB captures the paint at export time. The procedural paint animation and browser controls remain in the standalone web bundle; they are not converted into GLB animations. Use the web experience when you need continuously changing paint.

## Drop it into another environment

Copy the entire `dist/` folder to any static web host. The completed folder can be moved without rebuilding. Open its `index.html` URL directly, or load it in a host-controlled iframe:

```html
<iframe
  src="/worlds/chroma/index.html?embed=1"
  title="Chroma paint planet"
  style="width:100%;height:100%;border:0"
></iframe>
```

Give the iframe's parent a size. Omit `?embed=1` to show the full standalone interface. Embed mode shows only the orbitable animated planet on a transparent canvas. The host controls the iframe's size, location, navigation, and integration. No host API is required. Browser security means the bundle should be served over HTTP(S), rather than opened using `file://`.

For Backgrid or Vault Venture, use their existing URL/file loading facility. No destination-specific integration has been assumed or implemented.

## Reusable skill

[Drop-in World Builder](.agents/skills/drop-in-world-builder/SKILL.md) defines the format-neutral minimum build contract. Its [3D guide](.agents/skills/drop-in-world-builder/guides/3d-browser-worlds.md) documents the browser-world approach used here. This is a repository skill source, not a claim of global skill installation.

## Rendering

One Three.js WebGL renderer, a procedural paint shader, no downloaded textures. Container resizing updates the camera and canvas. Device pixel ratio is capped, hidden pages stop rendering, and a static color globe appears when WebGL cannot initialize. Touch orbit and pinch are supported; UI controls are keyboard accessible. Capture exports the scene canvas, not the surrounding page.

## Design options

Choose paint, rocky, ocean, gas giant, ice or lava surfaces. Customize four surface colors, detail, rotation and axial tilt. Add rings with size, tilt and color controls, and adjust atmosphere color and glow. New world resets the design; Save design, Load and Delete saved manage multiple designs in this browser. Saving an existing selected design updates it; choose New world to create a separate design. Browser storage does not sync between devices.

GLB exports now include enabled rings, the named world and its design settings. Atmosphere exports as a translucent shell approximating the browser rim glow; destination lighting and transparency affect its appearance. Paint and rotation remain static snapshots in GLB. These changes add design tools only: site attachment and the Space connector update remain separate work.

## Multiple moving rings

Enable **Rings**, then choose one to five rings. **Move rings** rotates visible textured streaks in alternating directions; **Ring speed** controls movement. Size, tilt, and color remain adjustable. Pause motion freezes both planet and rings; reduced motion starts paused. New ring settings are included in saved designs.

World export and Space export include all enabled rings. GLB includes a looping ring-rotation animation when Move rings is enabled, world motion is running, and ring speed is above zero. The destination must play that animation. Paused rings export as static geometry; paint stays a baked snapshot.
