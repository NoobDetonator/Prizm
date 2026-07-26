# Arquitetura — Prizm

## Entry points

| Path | Role |
| --- | --- |
| `index.html` + `src/demo/main.js` | Full demo (streetwear, post stack, UI) |
| `src/lib/prizm/index.js` | Public library surface |
| `examples/*.html` | Minimal consumers of `createPrism` |

## Library (`src/lib/prizm`)

```
createPrism({ renderer, engine, preset, shells })
  ├─ attach(mesh)      replace material, add rim shells
  ├─ beforeRender(...) custom: backface normals → scene plate → material
  ├─ setParams / update / dispose
  └─ engines
       ├─ custom   → materials/prismMaterial.js + createRefractionCapture
       └─ physical → materials/physicalGlass.js (MeshPhysicalMaterial)
```

Supporting:

- `estimateThicknessFromBounds` — scalar optical thickness from the AABB
- `createRefractionCapture` — half-res scene plate for screen-space bend
- `createBackfaceCapture` — farthest-backface world normals for the exit refraction
- `createPrismStage` — one shared plate for multiple prisms
- Env helpers re-exported: `createPrismEnvironment`, artistic LDR, HDR

Note: the public surface re-exports from `src/materials/` and `src/env/`, so the
library is not self-contained inside `src/lib/prizm/`. `npm run check:lib` only
enforces that demo/post code stays out of the bundle.

## Demo render path

```
Scene (streetwear opaque + glass cube + additive rim shells)
  → EffectComposer
      RenderPass → SavePass (clean)
      Afterimage / Halftone / Chroma (destructive, cube-bound later)
      SelectiveCubeComposite (restore backdrop outside mask)
      ASCII (cube mask)
      Bloom (extract masked, composite full-frame)
      DoF → FilmGrade → Output
```

Mask: camera **layer 1** on prism meshes; `createCubeMaskRenderer` half-res MSAA.

## Why two glass engines

Three's transmission buffer only includes **opaque** objects, so anything drawn
additively never enters it. The custom engine sidesteps that by capturing the
opaque plate itself and sampling it per channel in the fragment. The demo still
defaults to `physical` because the post-FX stack and the streetwear look were
tuned against that path.

## Folders

```
src/
  lib/prizm/     reusable API
  materials/     physicalGlass, prismMaterial, rim shaders
  post/          composer passes
  env/           HDR / artistic / procedural IBL
  backdrop/      streetwear canvases (opacity painted into pixels)
  demo/          demo wiring, panel, surface details
  textures/      procedural crystal maps
```
