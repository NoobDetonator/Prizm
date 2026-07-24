# Prizm

Three.js optical crystal — reusable prism material for any mesh, plus a streetwear demo.

## Run

```bash
npm install
npm run dev
```

- Demo: `index.html` → `src/main.js`
- Library examples: `/examples/` (`box`, `torusknot`, `two-prisms`, `gltf`, `embedded`, `physical`)

## Library

```js
import { createPrism, createPrismEnvironment } from './src/lib/prizm/index.js'

const prism = createPrism({ renderer, preset: 'crystal', engine: 'custom' })
prism.attach(mesh)

// each frame (custom engine):
prism.beforeRender(renderer, scene, camera)
prism.update(t)
renderer.render(scene, camera)
```

| Engine | What it is | Needs `beforeRender` |
| --- | --- | --- |
| `custom` (default) | Own double-refract + spectral RGB + in-shader caustics | Yes — captures opaque scene |
| `physical` | `MeshPhysicalMaterial.transmission` (Three’s path) | No |

Zero DOM. Multiple instances are safe. `dispose()` releases materials, textures, and refraction RTs.

## Honest physics map

| Phenomenon | Nature | In Prizm |
| --- | --- | --- |
| Refraction (Snell) | \(n_1\sin\theta_1 = n_2\sin\theta_2\) | Custom: entry+exit `refract()`; physical: `ior` |
| Dispersion | \(n(\lambda)\) | Custom: per-channel IOR samples; physical: `dispersion` |
| Double refraction | Ray bends in **and** out | Custom approximates exit with \(-N\) + thickness; not a full path tracer |
| Absorption | Beer–Lambert | `attenuationColor` / distance (both engines) |
| Thickness | Optical path | `estimateThickness(geometry)` or slider; optional thickness hint map on physical |
| Interior caustics | Focused refracted light | Custom: **procedural in-shader**; demo physical: additive blades (not in transmission RT) |
| Streetwear wall | Opaque plate behind glass | Demo physical sees it via Three transmission; custom sees it via screen-space capture |

Presets: crown glass \(n\approx1.52\), flint \(n\approx1.62\), crystal \(n\approx1.85\) (art-directed).

## Demo vs library

The **demo** keeps `MeshPhysicalMaterial` + selective post-FX (bloom, glare, flare, DoF, ASCII, …) so the streetwear look stays stable. The **library** is the reusable API (`createPrism`) with the custom prism shader as the default engine.

See `docs/ARQUITETURA.md` and `docs/DEBITO-TECNICO.md`.

## Rules

No `V2` / `New` / `Final` filenames. Edit in place; delete what you replace. No new dependencies without approval.
