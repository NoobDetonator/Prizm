# Prizm — Plano V3 (closeout)

Seis itens. Depois disso: parar de refatorar; usar a lib num hero real.

| ID | Status | Nota |
| --- | --- | --- |
| V3.1 | done | `npm test` lê `prismMaterial.js` — reverter para `-N` falha |
| V3.2 | done (a) | backface mantida; plate usa T1+T2 |
| V3.3 | done | flip `exitN` removido; invalid se `dot(exitN,V)>0` |
| V3.4 | done | audit com deps + motion + dual engine |
| V3.5 | done | `index.html` → `/src/demo/main.js`; shim deletado |
| V3.6 | done | `npm run check:lib` |

## Re-abertura (2026-07-25)

V3.1 e V3.2 foram fechados contra um gate que não podia falhar. O pre-pass de
backface nunca rodou: `depthFunc GreaterDepth` com o depth limpo em 1.0 rejeitava
todo fragmento, então o shader sempre usou o fallback `-N`. Detalhes e números em
`docs/CHECKLIST.md` (post-mortem) e `docs/DEBITO-TECNICO.md`.

Corrigido, mais: env do `custom` migrado do equirect cru para o PMREM, camada
`surface-details` reescalada (ela zerava a refração do motor `custom`), e
`scripts/test-refraction-gpu.mjs` adicionado como gate de pixel.
