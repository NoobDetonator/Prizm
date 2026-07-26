# AGENTS.md

## Cursor Cloud specific instructions

Prizm is a single, purely client-side Vite + Three.js WebGL app (no backend, DB, or API).

Standard commands (`package.json`):

- `npm run dev` — Vite (default port 5173)
- `npm run build` / `npm run preview`
- `npm test` — source/math gate **and** the headless GPU gate (needs Chrome)
- `npm run test:dispersion` — source/math only, no browser
- `npm run test:gpu` — renders and reads pixels; the gate optical claims must cite
- `npm run verify` — `test` + `check:lib`
- `npm run check:lib` — lib-only bundle must not pull `demo`/`post`
- `npm run test:leak` / `npm run audit:sliders` / `npm run capture:matrix` /
  `npm run calibrate:speckle` — need Vite on :5173 + Chrome

Chrome is resolved by `scripts/findChrome.mjs` (Windows/macOS/Linux, or `CHROME_PATH`).
Scripts that need the dev server default to `http://localhost:5173/`, not `127.0.0.1` —
Vite binds `::1` on some hosts and the literal IPv4 address refuses the connection.

### Do not trust a gate that cannot fail

`test:dispersion` greps the shader source and runs a JS re-implementation of the
refraction math. It stayed green for the entire life of the project while the
backface exit-normal pre-pass was dead at runtime (depth cleared to 1.0 against
`depthFunc GREATER`, so the render target was empty every frame). If you are
claiming an optical feature works, cite `test:gpu`, which renders it. When a
committed artifact (`docs/matrix/*.png`, `docs/slider-audit-after.md`) disagrees
with a checkmark, the artifact wins. See the post-mortem in `docs/CHECKLIST.md`.

### Rendering requires software WebGL (SwiftShader)

The cloud VM has no usable GPU, so Chrome's default hardware WebGL path fails and the canvas renders black (`THREE.WebGLRenderer: A WebGL context could not be created`). To see the 3D prism you MUST view it in Chrome launched via `/usr/local/bin/google-chrome`, which passes `--use-gl=angle --use-angle=swiftshader-webgl`. The DOM/UI works regardless; only the WebGL canvas depends on this.

Gotcha: Vite's `server.open: true` (in `vite.config.js`) auto-opens via `x-www-browser` → `/opt/google/chrome/google-chrome`, which does **not** include SwiftShader flags (black canvas). Relaunch with the wrapper, e.g. `DISPLAY=:1 /usr/local/bin/google-chrome "http://localhost:5173/"`. Chrome shares one user-data-dir — the first launcher's flags win.
