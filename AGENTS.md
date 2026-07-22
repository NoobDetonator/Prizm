# AGENTS.md

## Cursor Cloud specific instructions

Prizm is a single, purely client-side Vite + Three.js WebGL app (no backend, DB, or API). Standard commands live in `package.json`: `npm run dev` (Vite dev server, default port 5173), `npm run build`, `npm run preview`. There are no lint or automated test scripts in this repo.

### Rendering the app requires software WebGL (SwiftShader)

The cloud VM has no usable GPU, so Chrome's default hardware WebGL path fails and the canvas renders black (`THREE.WebGLRenderer: A WebGL context could not be created`). To see the 3D prism you MUST view it in Chrome launched via the environment wrapper `/usr/local/bin/google-chrome`, which passes `--use-gl=angle --use-angle=swiftshader-webgl` (software WebGL). The DOM/UI (control panel, sliders) works regardless; only the WebGL canvas depends on this.

Gotcha: Vite's `server.open: true` (in `vite.config.js`) auto-opens the URL via `x-www-browser` → `/opt/google/chrome/google-chrome`, which does NOT include the SwiftShader flags, so it shows a black canvas. If that happens, close that Chrome instance and relaunch with the wrapper, e.g. `DISPLAY=:1 /usr/local/bin/google-chrome "http://localhost:5173/"`. Chrome uses a single shared user-data-dir, so only one instance runs at a time — the first launcher's flags win.
