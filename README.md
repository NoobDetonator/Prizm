# Prizm

Three.js optical crystal — reusable prism for any mesh, plus a streetwear demo with cube-only post-FX.

<p align="center">
  <img src="docs/preview/hero-studio.png" alt="Prizm hero — midnight studio" width="100%" />
</p>

<p align="center">
  <img src="docs/preview/hero-spectral.png" alt="Spectral HDR environment" width="49%" />
  <img src="docs/preview/hero-neon.png" alt="Neon alley anamorphic" width="49%" />
</p>

## Install & run

```bash
npm install
npm run dev
```

- Demo: `index.html` → `src/demo/main.js`
- Library examples: [`examples/`](examples/)

## Minimal library use

```js
import {
  createPrism,
  createPrismEnvironment,
} from './src/lib/prizm/index.js'

scene.environment = createPrismEnvironment(renderer, 'midnight')

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
| `custom` (lib default) | Screen-space double-refract + backface exit normals + per-channel IOR | Yes |
| `physical` (demo default) | `MeshPhysicalMaterial.transmission` | No |

Multi-instance: `createPrismStage({ renderer })` → one shared refraction plate per frame.

## Looks & environments

| Studio / Midnight | Anamorphic / Disco | Neon ASCII |
| --- | --- | --- |
| ![](docs/preview/env-midnight.png) | ![](docs/preview/look-anamorphic.png) | ![](docs/preview/look-neon-ascii.png) |

| Portrait | Print shop | Prism chaos |
| --- | --- | --- |
| ![](docs/preview/look-portrait.png) | ![](docs/preview/look-print-shop.png) | ![](docs/preview/look-prism-chaos.png) |

Procedural float HDR: spectral · midnight · tungsten · disco · aurora · overcast · liquidVoid  

Artistic plates: gradientStudio · neonAlley · paperSky · emberHall · iceRink

| Spectral | Midnight | Tungsten |
| --- | --- | --- |
| ![](docs/preview/env-spectral.png) | ![](docs/preview/env-midnight.png) | ![](docs/preview/env-tungsten.png) |

| Disco | Aurora | Overcast |
| --- | --- | --- |
| ![](docs/preview/env-disco.png) | ![](docs/preview/env-aurora.png) | ![](docs/preview/env-overcast.png) |

| Gradient studio | Neon alley | Paper sky |
| --- | --- | --- |
| ![](docs/preview/env-gradient-studio.png) | ![](docs/preview/env-neon-alley.png) | ![](docs/preview/env-paper-sky.png) |

| Ember hall | Ice rink |
| --- | --- | --- |
| ![](docs/preview/env-ember-hall.png) | ![](docs/preview/env-ice-rink.png) |

**Void prism** look: transparent clear + `proc:liquidVoid` IBL.

![](docs/preview/void-prism-checker.png)

## Docs

- [`docs/API.md`](docs/API.md) — `createPrism`, stage, presets
- [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) — pipeline map
- [`docs/DEBITO-TECNICO.md`](docs/DEBITO-TECNICO.md) — known limits
- [`docs/MEDICOES.md`](docs/MEDICOES.md) — perf / leak / bundle / slider audit

## Tests

```bash
npm test              # dispersion gate (math + shader source)
npm run check:lib     # lib bundle must not pull demo/post
npm run test:leak     # 50× create/attach/dispose (Vite + Chrome)
```
