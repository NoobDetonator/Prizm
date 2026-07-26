# Prizm — Plano V2

Auditoria pós plano 1 + correções A→E.

## Status

**Implementado neste branch** (`cursor/plano-v2-shader-lib-44e4`):

| Fase | Entrega | Prova |
| --- | --- | --- |
| A | Backface exit normals, linear shader, NDC UV, roughness mips/jitter | `npm test` |
| B | Demo → `createPrism`; `src/demo/*` split; engine toggle | `wc -l src/demo/main.js` &lt; 250 |
| C | detach restore, `createPrismStage`, shellOffset, thickness flag/bounds | `examples/two-prisms.html` |
| D | slider-audit-after, leak-test PASS, matrix×42, perf honesty | `docs/*` |
| E | README / CHECKLIST / DÉBITO honestos | linked artifacts |

## Regra dura

Nenhuma feature óptica é “concluída” sem teste numérico (`npm test` / `scripts/test-dispersion.mjs`).
Perf em SwiftShader ≠ GPU — ver `docs/perf-after.md`.

## Open bugs (não marcar como feito)

**Fechado em 2026-07-25.** Todos os sliders listados aqui estão vivos na auditoria
atual (`physical` 0/19 mortos). Os que continuam abaixo do limiar são no motor
`custom` e estão justificados em `docs/DEBITO-TECNICO.md`:

- `transmission-scale` — morto por construção (só afeta `MeshPhysicalMaterial`)
- `speckle` — MAD 0.14; subir a camada decorativa até "passar" custaria o sinal
  de refração (medido)

## Correção do gate (2026-07-25)

A prova citada nesta tabela — `npm test` — não podia falhar pelo motivo alegado.
O pre-pass de backface nunca rodou. Ver `docs/CHECKLIST.md` (post-mortem) e o
novo gate de pixel `scripts/test-refraction-gpu.mjs`.
