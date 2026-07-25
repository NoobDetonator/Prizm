# Checklist de revisão (Plano 1 + Plano V2)

Items are only markable when a **proof artifact** exists (screenshot, audit JSON/MD, or test output). Rubric-only self-scoring is not enough.

## Plano 1 — Fases 0–8 (historical)

### Fase 0 — Baseline
- [x] Capturas `docs/baseline/before-*.png` (7 looks)
- [x] `docs/slider-audit-before.md` (MAD)
- [x] `docs/perf-before.md`

### Fase 1 — Bugs críticos
- [x] T1.1 Rim interior additive — `glassInteriorRimMaterial.js`
- [x] T1.2 Cáusticas visíveis — `createInternalCaustics.js` (`depthTest: false`)
- [x] T1.3 Remoção de `cubeBack`
- [x] T1.4 Streetwear opaco (alpha na textura)
- [x] T1.5 `docs/visibility-audit.md`

### Fase 2 — Pipeline pós
- [x] Máscara na **extração** bloom/glare/flare
- [x] Ordem: clean → stylize → selective → ASCII → optical → DoF → film → out
- [x] Film grade full-frame; chroma pré-mix

### Fase 3 — Environment HDR
- [x] Procedural Float32 + `environmentIntensity` — `buildPmremFromEquirect.js`
- [x] Artistic LDR + path HDR opcional

### Fase 4 — Limpeza
- [x] Órfãos removidos; sem sufixos V2/New/Final no entry

### Fase 5 — Perf
- [x] `antialias: false`, mask por layers, pass bypass, DPR adaptativo
- [x] `docs/perf-after.md` — **SwiftShader only; relative Δ only; no GPU claim**

### Fase 6 — Biblioteca
- [x] `createPrism` attach / setParams / update / dispose / detach restore
- [x] Examples: box, torus, two-prisms (shared stage), gltf-like, embedded, physical
- [x] `estimateThicknessFromBounds` (AABB heuristic, documented)

### Fase 7 — Shader próprio (corrigido no Plano V2)
- [x] Double-refract with **real backface exit normals** — proof: `npm test` / `scripts/test-dispersion.mjs`
- [x] Linear unclamped output (`toneMapped: false`) for HDR bloom
- [x] `beforeRender` capture + optional `createPrismStage`
- [x] Cáusticas no shader (custom)

### Fase 8 — Docs
- [x] README física vs fake (honest after V2)
- [x] `docs/ARQUITETURA.md`
- [x] `docs/DEBITO-TECNICO.md`
- [x] Este checklist (rewritten against final review rubric)

## Plano V2 — verification gates

### Fase A — shader real
- [x] A1 `createBackfaceCapture.js`
- [x] A2 exit normals in `prismMaterial.js`
- [x] A3 no inline ACES/clamp
- [x] A4 NDC-projected exit UV
- [x] A5 roughness mip bias + jitter
- [x] D3 `npm test` dispersion gate

### Fase B — demo = lib consumer
- [x] B1 demo uses `createPrism` — `src/demo/sceneSetup.js`
- [x] B2 no `setScalar` shells in demo
- [x] B3 engine `<select>` physical/custom
- [x] B4 `wc -l src/demo/main.js` &lt; 250; no `src/lib` → `src/demo` imports

### Fase C — API
- [x] C1 detach restores material
- [x] C2 `createPrismStage` + `examples/two-prisms.html`
- [x] C3 `thicknessOverridden` flag
- [x] C4 `shellOffset` in rim shader sources
- [x] C5 fake thickness hint map deleted
- [x] C6 `estimateThicknessFromBounds` rename

### Fase D — non-fakable verification
- [x] D1 `docs/slider-audit-after.md` (6/22 still dead/weak — open bugs listed)
- [x] D2 `docs/leak-test.md` — **PASS** Δgeo=0 Δtex=0
- [x] D3 dispersion test in `npm test`
- [x] D4 `docs/matrix/` 42 captures + README
- [x] D5 `docs/perf-after.md` honesty note (SwiftShader, no meta claim)

### Fase E — docs
- [x] E1 README engine table / physics map honest
- [x] E2 this checklist uses proof links
- [x] E3 demo migration is active (resolved via Fase B), not “optional”

## Plano V3 — closeout
- [x] V3.1 `npm test` couples to `prismMaterial.js` source (reverting to `-N` fails)
- [x] V3.2a backface kept; `plateScreenUV(T1,T2)` — see `docs/DEBITO-TECNICO.md`
- [x] V3.3 exitN flip removed
- [x] V3.4 slider audit methodology + dual engine — `docs/slider-audit-after.md`
- [x] V3.5 `src/main.js` shim deleted; `index.html` → `/src/demo/main.js`
- [x] V3.6 `docs/lib-bundle-check.md` (36 KB, no demo/post)

## Anti-objetivos
- Não adicionar React/UI frameworks
- Não novos npm deps sem aprovação
- Não arquivos `*V2*` / `*Final*` no código (docs de plano ok)
- Não “path tracer” completo no fragment
- Nenhuma feature óptica concluída sem teste numérico
- Não apresentar perf de SwiftShader como GPU
