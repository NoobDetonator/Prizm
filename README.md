# Prizm

Three.js optical crystal — reusable prism material for any mesh, plus a streetwear demo with cube-only post-FX.

<p align="center">
  <img src="docs/preview/hero-studio.png" alt="Prizm hero — midnight studio" width="100%" />
</p>

<p align="center">
  <img src="docs/preview/hero-spectral.png" alt="Spectral HDR environment" width="49%" />
  <img src="docs/preview/hero-neon.png" alt="Neon alley anamorphic" width="49%" />
</p>

## Run

```bash
npm install
npm run dev
```

- Demo: `index.html` → `src/main.js`
- Library examples: `/examples/`
- Regenerate previews: `node scripts/capture-previews.mjs http://127.0.0.1:5173/`

## Looks

| Studio / Midnight | Anamorphic / Disco | Neon ASCII |
| --- | --- | --- |
| ![](docs/preview/env-midnight.png) | ![](docs/preview/look-anamorphic.png) | ![](docs/preview/look-neon-ascii.png) |

| Portrait | Print shop | Prism chaos |
| --- | --- | --- |
| ![](docs/preview/look-portrait.png) | ![](docs/preview/look-print-shop.png) | ![](docs/preview/look-prism-chaos.png) |

## Environment catalog

Procedural **float HDR** and painted **artistic plates** live in the Environment dropdown.

### Procedural float HDR

| Spectral | Midnight | Tungsten |
| --- | --- | --- |
| ![](docs/preview/env-spectral.png) | ![](docs/preview/env-midnight.png) | ![](docs/preview/env-tungsten.png) |

| Disco | Aurora | Overcast |
| --- | --- | --- |
| ![](docs/preview/env-disco.png) | ![](docs/preview/env-aurora.png) | ![](docs/preview/env-overcast.png) |

### Artistic plates

| Gradient studio | Neon alley | Paper sky |
| --- | --- | --- |
| ![](docs/preview/env-gradient-studio.png) | ![](docs/preview/env-neon-alley.png) | ![](docs/preview/env-paper-sky.png) |

| Ember hall | Ice rink |
| --- | --- | --- |
| ![](docs/preview/env-ember-hall.png) | ![](docs/preview/env-ice-rink.png) |

## Library

```js
import {
  createPrism,
  createPrismEnvironment,
  createArtisticEnvironment,
} from './src/lib/prizm/index.js'

scene.environment = createPrismEnvironment(renderer, 'midnight')
// or: createArtisticEnvironment(renderer, 'neonAlley')

const prism = createPrism({ renderer, preset: 'crystal', engine: 'custom' })
prism.attach(mesh)

// each frame (custom engine):
prism.beforeRender(renderer, scene, camera)
prism.update(t)
renderer.render(scene, camera)
```

<p align="center">
  <img src="docs/preview/lib-box.png" alt="createPrism on a box" width="32%" />
  <img src="docs/preview/lib-two.png" alt="Two prism instances" width="32%" />
  <img src="docs/preview/lib-assembly.png" alt="Multi-mesh assembly" width="32%" />
</p>

| Engine | What it is | Needs `beforeRender` |
| --- | --- | --- |
| `custom` (lib default) | Double-refract screen-space with **backface exit normals** + per-channel IOR (numeric proof: `npm test`) + in-shader caustics | Yes (`prism.beforeRender` or `stage.beforeRender`) |
| `physical` (demo default) | `MeshPhysicalMaterial.transmission` | No |

Multi-instance: pass a shared `createPrismStage({ renderer })` so all custom prisms share **one** refraction plate per frame.

Procedural presets: `spectral`, `midnight`, `tungsten`, `disco`, `overcast`, `aurora`  
Artistic presets: `gradientStudio`, `neonAlley`, `paperSky`, `emberHall`, `iceRink`

### Void prism

Look preset **Void prism** (`voidPrism`): transparent canvas clear + `proc:liquidVoid` IBL so the crystal keeps absurd spectral reflections while the page shows through (checkerboard in the UI).

![](docs/preview/void-prism-checker.png)

### HDR quality

Desktop defaults to **high** IBL (4096×2048 float equirect → sharper PMREM speculars). Mobile uses **medium** (2048). Artistic plates are converted to **linear float** with highlight boost (not clipped LDR). Force with `?envQuality=high` or `?envQuality=medium`.

## Honest physics map

| Phenomenon | Nature | In Prizm |
| --- | --- | --- |
| Refraction (Snell) | \(n_1\sin\theta_1 = n_2\sin\theta_2\) | Custom: entry+exit `refract()` with captured exit normal; physical: `ior` |
| Dispersion | \(n(\lambda)\) | Custom: per-channel IOR (requires non-parallel faces — see `scripts/test-dispersion.mjs`); physical: `dispersion` |
| Double refraction | Ray bends in **and** out | Custom: entry normal + backface exit normal + thickness path |
| Absorption | Beer–Lambert | attenuation color / distance |
| Interior caustics | Focused refracted light | Custom: in-shader; physical demo: additive blades |
| IBL | HDR environment | Procedural float recipes + artistic canvas plates |
| Roughness blur | Microfacet smear | Custom: mip bias + direction jitter on plate/env (approx.) |

Presets: crown glass \(n\approx1.52\), flint \(n\approx1.62\), crystal \(n\approx1.85\) (art-directed).

## Docs

- `docs/preview/` — README gallery shots
- `docs/ARQUITETURA.md` — pipeline map
- `docs/DEBITO-TECNICO.md` — known fakes
- `docs/CHECKLIST.md` — phase checklist (items need proof links)
- `docs/slider-audit-after.md` — slider MAD after Plano V2
- `docs/leak-test.md` — dispose leak gate
- `docs/matrix/` — look × material × engine captures

## Tests

```bash
npm test                 # dispersion numeric gate (D3)
npm run test:leak        # 50× create/attach/dispose (needs Vite + Chrome)
npm run audit:sliders    # rewrite slider-audit-after.md
npm run capture:matrix   # 42 PNGs → docs/matrix/
```

## Rules

No `V2` / `New` / `Final` filenames. Edit in place; delete what you replace. No new dependencies without approval.
No optical feature is “done” without a numeric test. Do not present SwiftShader fps as GPU results.
