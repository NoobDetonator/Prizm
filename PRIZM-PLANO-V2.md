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

Sliders still weak on physical demo: `roughness`, `speckle`, `dof-focus`, `afterimage`, `ascii-cell`, `dpr` — see `docs/slider-audit-after.md`.
