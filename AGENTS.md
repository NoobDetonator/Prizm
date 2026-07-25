# AGENTS.md

## Cursor Cloud specific instructions

Prizm is a single, purely client-side Vite + Three.js WebGL app (no backend, DB, or API).

Standard commands (`package.json`):

- `npm run dev` — Vite (default port 5173)
- `npm run build` / `npm run preview`
- `npm test` — dispersion gate (math + `prismMaterial.js` source coupling)
- `npm run check:lib` — lib-only bundle must not pull `demo`/`post`
- `npm run test:leak` / `npm run audit:sliders` — need Vite + Chrome

### Rendering requires software WebGL (SwiftShader)

The cloud VM has no usable GPU, so Chrome's default hardware WebGL path fails and the canvas renders black (`THREE.WebGLRenderer: A WebGL context could not be created`). To see the 3D prism you MUST view it in Chrome launched via `/usr/local/bin/google-chrome`, which passes `--use-gl=angle --use-angle=swiftshader-webgl`. The DOM/UI works regardless; only the WebGL canvas depends on this.

Gotcha: Vite's `server.open: true` (in `vite.config.js`) auto-opens via `x-www-browser` → `/opt/google/chrome/google-chrome`, which does **not** include SwiftShader flags (black canvas). Relaunch with the wrapper, e.g. `DISPLAY=:1 /usr/local/bin/google-chrome "http://localhost:5173/"`. Chrome shares one user-data-dir — the first launcher's flags win.
