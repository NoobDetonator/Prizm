# Arquitetura — Prizm

## Entry points

| Path | Role |
| --- | --- |
| `index.html` + `src/main.js` | Full demo (streetwear, post stack, UI) |
| `src/lib/prizm/index.js` | Public library surface |
| `examples/*.html` | Minimal consumers of `createPrism` |

## Library (`src/lib/prizm`)

```
createPrism({ renderer, engine, preset, shells })
  ├─ attach(mesh)      replace material, add rim/caustic shells
  ├─ beforeRender(...) custom: capture scene → refraction RT
  ├─ setParams / update / dispose
  └─ engines
       ├─ custom   → materials/prismMaterial.js + createRefractionCapture
       └─ physical → materials/physicalGlass.js (MeshPhysicalMaterial)
```

Supporting:

- `estimateThickness` / `createThicknessHintMap` — scalar / hint map from bounds
- `createRefractionCapture` — half-res scene plate for screen-space bend
- Env helpers re-exported: `createPrismEnvironment`, artistic LDR, HDR

## Demo render path

```
Scene (streetwear opaque + physical glass cube + additive rims/caustics)
  → EffectComposer
      RenderPass → SavePass (clean)
      Afterimage / Halftone / Chroma (destructive, cube-bound later)
      SelectiveCubeComposite (restore backdrop outside mask)
      ASCII (cube mask)
      Bloom / Glare / Flare (extract masked, composite full-frame)
      DoF → FilmGrade → Output
```

Mask: camera **layer 1** on prism meshes; `createCubeMaskRenderer` half-res MSAA.

## Why two glass engines

Three’s transmission buffer only includes **opaque** objects. Additive caustic blades never enter it. The custom engine avoids that by (1) capturing the opaque plate itself and (2) injecting caustics inside the fragment. The demo stays on physical transmission because the post-FX stack and streetwear look were tuned against that path.

## Folders

```
src/
  lib/prizm/     reusable API
  materials/     physicalGlass, prismMaterial, rim shaders
  post/          composer passes
  env/           HDR / artistic / procedural IBL
  backdrop/      streetwear canvases (opacity painted into pixels)
  effects/       additive caustic blades (physical demo)
  textures/      procedural crystal maps
```
