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

- Demo: `index.html` → `src/demo/main.js`
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
| `custom` (lib default) | Double-refract screen-space: backface exit normals drive **T2** (plate beyond-exit offset) + per-channel IOR; env from the PMREM, used where the exit ray leaves the frame; gate: `npm test` (source/math **and** a headless GPU pass that reads pixels) | Yes (`prism.beforeRender` or `stage.beforeRender`) |
| `physical` (demo default) | `MeshPhysicalMaterial.transmission` | No |

Multi-instance: pass a shared `createPrismStage({ renderer })` so all custom prisms share **one** refraction plate per frame.

Backface pre-pass is kept on purpose (V3.2a): plate UVs combine T1 path displacement with T2 exit direction so exit normals change pixels, not only the 22% env mix.

Procedural presets: `spectral`, `midnight`, `tungsten`, `disco`, `overcast`, `aurora`  
Artistic presets: `gradientStudio`, `neonAlley`, `paperSky`, `emberHall`, `iceRink`

### Void prism

Look preset **Void prism** (`voidPrism`): transparent canvas clear + `proc:liquidVoid` IBL so the crystal keeps absurd spectral reflections while the page shows through (checkerboard in the UI).

![](docs/preview/void-prism-checker.png)

### HDR quality

Desktop defaults to **high** IBL (4096×2048 float equirect → sharper PMREM speculars). Mobile uses **medium** (2048). Artistic plates are converted to **linear float** with highlight boost (not clipped LDR). Force with `?envQuality=high` or `?envQuality=medium`.

Both engines read the PMREM, so the quality tier affects both. The source equirect is disposed once the PMREM is built.

## Honest physics map

| Phenomenon | Nature | In Prizm |
| --- | --- | --- |
| Refraction (Snell) | \(n_1\sin\theta_1 = n_2\sin\theta_2\) | Custom: entry+exit `refract()` with captured exit normal; physical: `ior` |
| Dispersion | \(n(\lambda)\) | Custom: per-channel IOR (requires non-parallel faces — see `scripts/test-dispersion.mjs`); physical: `dispersion` |
| Double refraction | Ray bends in **and** out | Custom: entry normal + backface exit normal + thickness path. The exit term only gets `PLATE_EXIT_STEP` (0.22) of the path, so its measured contribution is small — see `docs/DEBITO-TECNICO.md` |
| Absorption | Beer–Lambert | attenuation color / distance |
| IBL | HDR environment | Procedural float recipes + artistic canvas plates, sampled through the PMREM |
| Roughness blur | Microfacet smear | Custom: PMREM mip by roughness + direction jitter on the plate (approx.) |

Interior caustics are **not** implemented in either engine — the additive blade
effect was removed in `bff9915` and nothing replaced it.

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
npm test                  # source/math gate + headless GPU gate (needs Chrome)
npm run test:dispersion   # source/math only — fast, no browser
npm run test:gpu          # reads pixels: backface RT, dispersion, blowout, backface payoff
npm run verify            # npm test + check:lib
npm run check:lib         # lib-only bundle must not pull demo/post
npm run test:leak         # 50× create/attach/dispose (needs Vite + Chrome)
npm run audit:sliders     # rewrite slider-audit-after.md (needs Vite)
npm run calibrate:speckle # engine-vs-engine body stats sweep (needs Vite)
npm run capture:matrix    # 42 PNGs → docs/matrix/ (needs Vite)
```

Chrome is located by `scripts/findChrome.mjs` (Windows / macOS / Linux, or
`CHROME_PATH`). Scripts that need the dev server default to `http://localhost:5173/`.

`test:dispersion` checks the math model and greps the shader source — it passed
for the entire life of the project while the exit-normal path was dead at
runtime. `test:gpu` is the one that renders and measures.

## Rules

No `V2` / `New` / `Final` filenames. Edit in place; delete what you replace. No new dependencies without approval.
No optical feature is “done” without a numeric test. Do not present SwiftShader fps as GPU results.

A test only counts if it can fail for the reason you are citing it for. Asserting
that the shader *source* contains a string is not evidence that the shader *runs*:
`test:dispersion` stayed green for the entire life of the project while the
backface exit-normal path was dead on every frame. Optical claims cite
`test:gpu`, which renders and reads pixels. When a committed artifact disagrees
with a checkmark, the artifact wins.
