---
name: drop-in-world-builder
description: Build independent, portable worlds, sites, images, animations, and experiences in 2D, 3D, or other suitable formats for loading into Backgrid, Vault Venture, or another destination.
---

# Drop-in World Builder

Build the experience independently. The destination handles placement, display, navigation, and integration. Do not impose unnecessary restrictions on design, content, dimensions, or technology.

## Minimum contract

1. **Self-contained:** Include all necessary files and assets or document accessible dependencies. Prefer bundling assets for offline reuse when appropriate.
2. **Independent:** The experience works without the host environment.
3. **Flexible format:** Use 2D, 3D, a site, image, animation, or interactive experience as suited to the request.
4. **Scalable:** The destination can resize the experience. Preserve appropriate aspect, readability, and interaction behavior; document intrinsic dimensions where relevant.
5. **Positionable:** The host controls the experience's placement. Keep internal layout separate from host coordinates.
6. **Accessible entry:** Supply a URL, file, or entry point the host can open or load. Also provide appropriate user accessibility for the chosen format.
7. **Portable:** Move or reuse the finished package without rebuilding. Document any runtime services it actually requires.

## Workflow

- Inspect the existing project and preserve unrelated user work. Use the existing isolated checkout; do not create a worktree unless requested.
- Follow the requested scope: plan only means no implementation. Ask only questions that materially affect the build; use sensible defaults otherwise.
- Establish format, interaction, required assets, supported loading method, and completion checks. Choose technology for the experience rather than making an engine a universal requirement.
- Build and test the standalone experience before adding optional host adapters.
- Use local assets and relative paths where possible. Keep credentials out of shipped bundles.
- For browser experiences, support container resizing, keyboard-operable controls, touch input, reduced motion, and an understandable rendering failure state.
- Validate a representative functional interaction, loading from the production package, and relocation without rebuilding. Distinguish checks actually run from intended checks.
- Deliver the working asset, required files/dependencies, entry URL or path, and brief loading instructions. Document limitations honestly.

## Host boundary

Backgrid, Vault Venture, and other builds may open a URL, load a file, or use a format-specific adapter. Their loading contracts are not assumed. Ask for existing requirements when an adapter is needed; otherwise provide the minimum standalone contract above.

A host may resize or position an iframe or other container. It owns navigation and integration. Optional messaging APIs, manifests, coordinate systems, and shared accounts are only added when required; they are not prerequisites for every world.

## Format guides

For 3D browser worlds, see [3D browser worlds](guides/3d-browser-worlds.md). Add other guides when a concrete build needs them; keep the core contract format-neutral.
