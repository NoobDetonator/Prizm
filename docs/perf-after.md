# Performance (after Phase 5)

**Rasterizer: Chrome headless + SwiftShader (software CPU).**  
These numbers are **not** a proxy for real GPU fill-rate, bandwidth, or fullscreen-pass cost. Do **not** treat absolute fps as hardware performance. Compare only relative deltas under the same SwiftShader configuration.

Viewport **1920×1080**, same method as `perf-before.md`.

**Engine coverage: `physical` only.** The `custom` engine pays an extra half-res
capture of the whole scene plus a backface pre-pass every frame, and none of that
is in the table below. Re-run `scripts/measure-perf.mjs` with the engine switched
before quoting these numbers for `custom`.

| look | DPR | ms/frame | fps* | draw calls | triangles | samples |
| --- | --- | --- | --- | --- | --- | --- |
| `studio` | 1 | 28.533 | 35.05 | 51 | 45059 | 6 |
| `studio` | 2 | 33.833 | 29.56 | 51 | 45059 | 9 |
| `prismChaos` | 1 | 35.1 | 28.49 | 68 | 67578 | 12 |
| `prismChaos` | 2 | 36.967 | 27.05 | 68 | 67578 | 15 |

\*fps derived from SwiftShader ms — **not hardware**.

## Delta vs Phase 0 baseline (same SwiftShader setup)

| look | DPR | before ms | after ms | Δ |
| --- | --- | --- | --- | --- |
| `studio` | 1 | 41.65 | 28.53 | −31.5% |
| `studio` | 2 | 40.72 | 33.83 | −16.9% |
| `prismChaos` | 1 | 40.27 | 35.10 | −12.8% |
| `prismChaos` | 2 | 39.99 | 36.97 | −7.6% |

**Goal status:** the Phase 5 “≥30% drop” target is **not claimed as met**. Only one of four cells (`studio` DPR1) crossed −30%; the others did not. Relative improvement is real under SwiftShader, but uneven.

Changes contributing: `preserveDrawingBuffer` off, `antialias` off (composer MSAA only),
layer-based half-res mask, pass `enabled=false` when amount≈0, adaptive DPR clamp.

To re-measure on real GPU: Chrome with `--use-angle=default` (or a desktop GPU machine) using `scripts/measure-perf.mjs`, and state the backend explicitly in the report.
