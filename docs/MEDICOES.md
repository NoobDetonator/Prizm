# Medições

**Rasterizer note:** Chrome headless + **SwiftShader** (software). Absolute fps are **not** GPU results. Compare only relative Δ under the same backend. The old “≥30% drop” goal is **not claimed as met**.

## Performance (SwiftShader, 1920×1080)

| look | DPR | ms/frame | fps* | draw calls | triangles |
| --- | --- | --- | --- | --- | --- |
| `studio` | 1 | 28.533 | 35.05 | 51 | 45059 |
| `studio` | 2 | 33.833 | 29.56 | 51 | 45059 |
| `prismChaos` | 1 | 35.1 | 28.49 | 68 | 67578 |
| `prismChaos` | 2 | 36.967 | 27.05 | 68 | 67578 |

\*derived from SwiftShader ms — not hardware.

| look | DPR | before ms | after ms | Δ |
| --- | --- | --- | --- | --- |
| `studio` | 1 | 41.65 | 28.53 | −31.5% |
| `studio` | 2 | 40.72 | 33.83 | −16.9% |
| `prismChaos` | 1 | 40.27 | 35.10 | −12.8% |
| `prismChaos` | 2 | 39.99 | 36.97 | −7.6% |

Only one of four cells crossed −30%. Re-measure: `npm run measure:perf` (prints report; does not expand `docs/`).

## Leak test

`50×` `createPrism → attach → detach → dispose` (custom + physical).

| metric | before | after | Δ |
| --- | --- | --- | --- |
| geometries | 11 | 11 | **0** |
| textures | 32 | 32 | **0** |

**PASS.** Command: `npm run test:leak` (needs Vite + Chrome).

## Lib bundle (`npm run check:lib`)

Entry: `createPrism` / `createPrismStage` / `MATERIAL_PRESETS` only; `three` external.

- Bundle size: **~36 KB**
- Does **not** pull `src/demo/*` or post / look presets

## Slider audit (physical + custom)

Look `studio`, camera locked. MAD &lt; 0.15 ⇒ dead. Parents pinned for `dof-focus` / `ascii-cell`. `afterimage` = 8 motion frames. `transmission-scale` = **N/A** on custom.

Optical extract passes removed in `bff9915` are not audited.

### physical — 0 / 19 dead

All listed sliders alive (incl. roughness, speckle, dof-focus, ascii-cell, afterimage, dpr, transmission-scale).

### custom — 3 / 18 weak

| slider | MAD | note |
| --- | --- | --- |
| `dispersion` | 0.1458 | weak on parallel-ish hero at locked view |
| `roughness` | 0.0793 | mip/jitter subtle at audit range |
| `speckle` | 0.0266 | surface points less visible vs bright custom body |

Regenerate tables: `npm run audit:sliders` (writes this section’s source tables to stdout / refresh by re-running cleanup merge if needed). Latest machine-readable run also updates nothing outside these four docs by default — prefer pasting into this file when numbers change.
