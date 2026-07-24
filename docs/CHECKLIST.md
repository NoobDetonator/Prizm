# Checklist de revisão (Fases 0–8)

## Fase 0 — Baseline
- [x] Capturas `docs/baseline/before-*.png` (7 looks)
- [x] `docs/slider-audit-before.md` (MAD)
- [x] `docs/perf-before.md`

## Fase 1 — Bugs críticos
- [x] T1.1 Rim interior additive (sem casca preta no transmission)
- [x] T1.2 Cáusticas visíveis (slider MAD > 0)
- [x] T1.3 Remoção de `cubeBack`
- [x] T1.4 Streetwear opaco (alpha na textura)
- [x] T1.5 Visibility audit

## Fase 2 — Pipeline pós
- [x] Máscara na **extração** bloom/glare/flare
- [x] Ordem: clean → stylize → selective → ASCII → optical → DoF → film → out
- [x] Film grade full-frame; chroma pré-mix

## Fase 3 — Environment HDR
- [x] Procedural Float32 + `environmentIntensity`
- [x] Artistic LDR + path HDR opcional

## Fase 4 — Limpeza
- [x] Órfãos removidos; sem sufixos V2/New/Final no entry

## Fase 5 — Perf
- [x] `antialias: false`, mask por layers, pass bypass, DPR adaptativo
- [x] `docs/perf-after.md`

## Fase 6 — Biblioteca
- [x] `createPrism` attach / setParams / update / dispose
- [x] Examples: box, torus, two-prisms, gltf-like, embedded, physical
- [x] `estimateThickness` + thickness hint map (physical)

## Fase 7 — Shader próprio
- [x] Double-refract + spectral RGB (`prismMaterial.js`)
- [x] `beforeRender` capture
- [x] Cáusticas no shader (custom); débito atualizado

## Fase 8 — Docs
- [x] README honesto (física vs fake)
- [x] `docs/ARQUITETURA.md`
- [x] `docs/DEBITO-TECNICO.md`
- [x] Este checklist

## Anti-objetivos (não fazer)
- Não adicionar React/UI frameworks
- Não novos npm deps sem aprovação
- Não arquivos `*V2*` / `*Final*`
- Não “path tracer” completo no fragment
