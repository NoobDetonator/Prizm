# Performance (before)

Viewport locked to **1920×1080**. Frame time = moving average of up to 60 frames via `window.__prizm.stats`.
Renderer: Chrome headless + SwiftShader (software GL) — absolute numbers are environment-specific; use for relative before/after.

| look | DPR | ms/frame | fps | draw calls | triangles | samples |
| --- | --- | --- | --- | --- | --- | --- |
| `studio` | 1 | 41.65 | 24.01 | 52 | 67556 | 6 |
| `studio` | 2 | 40.722 | 24.56 | 52 | 67556 | 9 |
| `prismChaos` | 1 | 40.267 | 24.83 | 71 | 97577 | 12 |
| `prismChaos` | 2 | 39.993 | 25 | 71 | 97577 | 15 |

Also recorded per sample via `sampleRenderStats()` (autoReset disabled for one compose).
