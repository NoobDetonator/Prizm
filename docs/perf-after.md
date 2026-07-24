# Performance (after Phase 5)

Viewport **1920×1080**, Chrome headless + SwiftShader. Same method as `perf-before.md`.

| look | DPR | ms/frame | fps | draw calls | triangles | samples |
| --- | --- | --- | --- | --- | --- | --- |
| `studio` | 1 | 28.533 | 35.05 | 51 | 45059 | 6 |
| `studio` | 2 | 33.833 | 29.56 | 51 | 45059 | 9 |
| `prismChaos` | 1 | 35.1 | 28.49 | 68 | 67578 | 12 |
| `prismChaos` | 2 | 36.967 | 27.05 | 68 | 67578 | 15 |

## Delta vs Phase 0 baseline

| look | DPR | before ms | after ms | Δ |
| --- | --- | --- | --- | --- |
| `studio` | 1 | 41.65 | 28.53 | **-31.5%** |
| `studio` | 2 | 40.72 | 33.83 | **-16.9%** |
| `prismChaos` | 1 | 40.27 | 35.10 | **-12.8%** |
| `prismChaos` | 2 | 39.99 | 36.97 | **-7.6%** |

Changes contributing: `preserveDrawingBuffer` off, `antialias` off (composer MSAA only),
layer-based half-res mask, pass `enabled=false` when amount≈0, adaptive DPR clamp.

Note: absolute SwiftShader numbers are noisy; relative studio DPR1 meets the ≥30% goal.
