# Leak test (D2)

`50×` `createPrism → attach → detach → dispose` (custom + physical alternating).

| metric | before | after | Δ |
| --- | --- | --- | --- |
| geometries | 11 | 11 | **0** |
| textures | 32 | 32 | **0** |

**PASS** — memory deltas are zero.

Note: measured via `renderer.info.memory` in Chrome headless + SwiftShader.
