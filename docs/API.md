# API — Prizm library

Public entry: `src/lib/prizm/index.js` (zero DOM, no demo imports).

## `createPrism(options)`

```js
const prism = createPrism({
  renderer,                 // required WebGLRenderer
  preset: 'crystal',        // glass | flint | crystal
  engine: 'custom',         // 'custom' | 'physical'
  maskLayer: 1,             // for demo cube-mask post
  refractionScale: 0.5,     // RT scale (custom)
  stage: null,              // optional createPrismStage
  shells: { outerRim, innerRim, caustics },
})
```

| Method | Notes |
| --- | --- |
| `attach(mesh)` | Swaps material; stores original for restore |
| `detach()` | Restores original material; removes shells |
| `setParams(partial)` | IOR, dispersion, thickness, roughness, … |
| `beforeRender(renderer, scene, camera)` | Custom only (or use `stage.beforeRender`) |
| `update(t)` | Per-frame (rims / time uniforms) |
| `dispose()` | Detach + free GPU resources |

Getters: `engine`, `material`, `params`, `host`.

## `createPrismStage({ renderer, refractionScale })`

Shared refraction plate for multiple custom prisms — **one** scene capture per frame.

```js
const stage = createPrismStage({ renderer })
const a = createPrism({ renderer, engine: 'custom', stage })
const b = createPrism({ renderer, engine: 'custom', stage })
// frame:
stage.beforeRender(renderer, scene, camera)
a.update(t); b.update(t)
renderer.render(scene, camera)
```

## `MATERIAL_PRESETS`

| id | approx. n | role |
| --- | --- | --- |
| `glass` | 1.52 | crown |
| `flint` | 1.62 | denser flint |
| `crystal` | 1.85 | art-directed hero |

Also: `estimateThicknessFromBounds(geometry)` (AABB heuristic; prefer authored thickness).

## Environment helpers

| API | Presets |
| --- | --- |
| `createPrismEnvironment(renderer, id, { quality })` | `spectral`, `midnight`, `tungsten`, `disco`, `overcast`, `aurora`, `liquidVoid` |
| `createArtisticEnvironment(renderer, id, { quality })` | `gradientStudio`, `neonAlley`, `paperSky`, `emberHall`, `iceRink` |
| `loadArtisticImageEnvironment(renderer, url, opts)` | any LDR equirect / plate |
| `loadHdrEnvironment(renderer, url)` | `.hdr` / RGBE |

Quality: `ENV_QUALITY.high` (4096) / `.medium` (2048). Force via `?envQuality=`.

## Demo look presets (`src/post/lookPresets.js`)

Used by the demo panel, not the lib:

`studio`, `anamorphic`, `portrait`, `neonAscii`, `ghostTrail`, `printShop`, `prismChaos`, `voidPrism`

## Engines (verified)

| Engine | Behavior | `beforeRender` |
| --- | --- | --- |
| `custom` | Screen-space double-refract + backface exit normals + per-channel IOR | yes |
| `physical` | `MeshPhysicalMaterial.transmission` | no |

Gate: `npm test` (math + `prismMaterial.js` source coupling). Parallel-face slabs cancel spectral split physically — use non-parallel / wedge geometry to see channel separation.
