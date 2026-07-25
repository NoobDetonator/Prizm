# Arquitetura — Prizm

## Entry points

| Path | Role |
| --- | --- |
| `index.html` + `src/demo/main.js` | Full demo (streetwear, post stack, UI) |
| `src/lib/prizm/index.js` | Public library surface |
| `examples/*.html` | Minimal consumers of `createPrism` |

## Library (`src/lib/prizm`)

```
createPrism({ renderer, engine, preset, shells, stage })
  ├─ attach(mesh)      replace material, add rim shells
  ├─ beforeRender(...) custom: backface + refraction plate
  ├─ setParams / update / detach / dispose
  └─ engines
       ├─ custom   → materials/prismMaterial.js + captures
       └─ physical → materials/physicalGlass.js (MeshPhysicalMaterial)
```

Supporting:

- `createPrismStage` — shared refraction plate for multiple custom instances
- `estimateThicknessFromBounds` — AABB heuristic
- `createBackfaceCapture` / `createRefractionCapture`
- Env helpers re-exported: procedural float HDR, artistic plates, HDR loader

## Demo render path

```
Scene (streetwear opaque + glass cube + additive rims)
  → EffectComposer
      RenderPass → SavePass (clean)
      Afterimage / Halftone / Chroma (destructive, cube-bound later)
      SelectiveCubeComposite (restore backdrop outside mask)
      ASCII (cube mask)
      Bloom (extract masked, composite full-frame)
      DoF → FilmGrade → Output
```

Mask: camera **layer 1** on prism meshes; `createCubeMaskRenderer` half-res MSAA.

Glare / LensFlare passes were removed (`bff9915`) — not part of the stack anymore.

## Why two glass engines

Three’s transmission buffer only includes **opaque** objects. The custom engine captures an opaque plate and bends UVs in the fragment; the demo defaults to physical transmission because the post-FX stack and streetwear look were tuned against that path. Panel toggle exercises both.

## Folders

```
src/
  lib/prizm/     reusable API
  materials/     physicalGlass, prismMaterial, rim shaders
  demo/          panel, boot, scene, post wiring
  post/          composer passes
  env/           HDR / artistic / procedural IBL
  backdrop/      streetwear canvases (opacity painted into pixels)
  textures/      procedural crystal maps
```
