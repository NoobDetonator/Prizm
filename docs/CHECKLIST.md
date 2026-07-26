# Checklist de revisão (Plano 1 + Plano V2)

Items are only markable when a **proof artifact** exists (screenshot, audit JSON/MD, or test output). Rubric-only self-scoring is not enough.

> **Post-mortem (2026-07-25).** This rule did not hold. Fase 7, A2 and V3.1–V3.3
> were all marked done, citing `npm test` — a gate that greps the shader source
> and runs a JS re-implementation of the math. Neither touches the GPU. The
> feature they certified (double refraction through captured backface exit
> normals) **never executed once**: `createBackfaceCapture` cleared depth to 1.0
> while testing `GREATER`, so the render target was empty on every frame and the
> shader always took its `-N` fallback.
>
> Two committed artifacts already contradicted the checkmarks and were read as
> something else: `slider-audit-after.md` reported `dispersion` and `roughness`
> DEAD on `custom` (filed under "still open sliders"), and every `*__custom.png`
> in `docs/matrix/` was a flat white brick.
>
> A proof artifact only counts if it can fail for the reason you are claiming.
> `scripts/test-refraction-gpu.mjs` renders and reads pixels; it is the gate the
> optical items below are now allowed to cite.

## Plano 1 — Fases 0–8 (historical)

### Fase 0 — Baseline
- [x] Capturas `docs/baseline/before-*.png` (7 looks)
- [x] `docs/slider-audit-before.md` (MAD)
- [x] `docs/perf-before.md`

### Fase 1 — Bugs críticos
- [x] T1.1 Rim interior additive — `glassInteriorRimMaterial.js`
- [ ] ~~T1.2 Cáusticas visíveis~~ — **revertido**: `createInternalCaustics.js` foi
  deletado em `bff9915`. Não há cáusticas em nenhum motor.
- [x] T1.3 Remoção de `cubeBack`
- [x] T1.4 Streetwear opaco (alpha na textura)
- [x] T1.5 `docs/visibility-audit.md`

### Fase 2 — Pipeline pós
- [x] Máscara na **extração** do bloom (glare e flare foram removidos em `bff9915`)
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

### Fase 7 — Shader próprio (corrigido no Plano V2, re-aberto e fechado em 2026-07-25)
- [x] Double-refract with **real backface exit normals** — proof: `npm run test:gpu`
  G1 (backface RT = 7024/25600 samples; era 0/25600 antes da correção do depth clear)
- [x] Linear unclamped output (`toneMapped: false`) for HDR bloom
- [x] `beforeRender` capture + optional `createPrismStage`
- [ ] ~~Cáusticas no shader (custom)~~ — nunca existiu no `prismMaterial.js`;
  `grep -ri caustic src/` retorna zero.

### Fase 8 — Docs
- [x] README física vs fake (honest after V2)
- [x] `docs/ARQUITETURA.md`
- [x] `docs/DEBITO-TECNICO.md`
- [x] Este checklist (rewritten against final review rubric)

## Plano V2 — verification gates

### Fase A — shader real
- [x] A1 `createBackfaceCapture.js`
- [x] A2 exit normals in `prismMaterial.js` — **estava quebrado até 2026-07-25**
  (depth clear); agora provado por `test:gpu` G1
- [x] A3 no inline ACES/clamp
- [x] A4 NDC-projected exit UV
- [x] A5 roughness mip — **corrigido**: o bias era no-op no equirect
  (`generateMipmaps = false`); agora via PMREM `textureCubeUV`
- [x] D3 `npm test` dispersion gate — mantido como gate de **fonte/matemática**;
  não substitui `test:gpu`

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
  — **insuficiente sozinho**: acopla ao texto do shader, não ao que roda
- [x] V3.2a backface kept; `plateScreenUV(T1,T2)` — agora com o retorno medido
  (MAD 2.4/255) e gate G4 em `docs/DEBITO-TECNICO.md`
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
