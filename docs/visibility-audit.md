# Visibility audit (after T1.1–T1.4)

Look `studio`, locked camera. Hide one mesh at a time; MAD < **0.05** ⇒ dead.

> **Snapshot histórico.** Mede um build que não existe mais: `internal-caustics`
> foi deletado em `bff9915`.
>
> Vale reler a primeira linha. `surface-details` foi medido como **dead** aqui
> (MAD 0.02) e mantido assim mesmo. Ele era invisível porque a medição rodou no
> motor `physical` — em 2026-07-25 descobriu-se que, no motor `custom`, essa mesma
> camada aditiva levava 37% do corpo a branco puro e derrubava a cromaticidade da
> refração de 46.5 para 12.9. Um objeto medido como "não contribui" não é inócuo:
> é um objeto que ninguém sabe o que faz. Ver `docs/DEBITO-TECNICO.md`.

| object | MAD | contributes? |
| --- | --- | --- |
| `surface-details` (cb05c294) | 0.0215 | **dead** |
| `surface-details` (f3d8f275) | 0.0258 | **dead** |
| `streetwear-backdrop` (7afb6bc9) | 0.1608 | yes |
| `streetwear-backdrop` (7b4431a7) | 0.1837 | yes |
| `internal-caustics` (ba790cc7) | 0.2411 | yes |
| `internal-caustics` (1fcc49c6) | 0.3960 | yes |
| `internal-caustics` (3ce6559c) | 0.4639 | yes |
| `internal-caustics` (40f0370b) | 0.6404 | yes |
| `hero-prism` (4011f3fd) | 0.9662 | yes |
| `glass-interior-rim` (f986cae8) | 1.2227 | yes |
| `hero-prism` (2c0e3d78) | 20.1772 | yes |
| `streetwear-backdrop` (21c8f49b) | 26.3622 | yes |

Dead objects: **2** / 12

## Notes

- `surface-details` (points + scratches) fall under the threshold at look \`studio\`
  (\`speckle=0.28\`). At \`speckle=1\` MAD ≈ **0.125** — intensity-gated, not dead code.
- The opaque black wash slab behind streetwear was removed (MAD ≈ 0 against black bg).
- No remaining always-invisible meshes after T1.1–T1.4.
