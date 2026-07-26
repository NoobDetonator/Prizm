# Débito técnico

## Backface pre-pass (V3.2a — decisão revisada)

Mantida, mas agora com número. Custo: 1 RT + 1 draw do host/frame.

Durante todo o Plano V2/V3 esse pre-pass **nunca rodou**: `createBackfaceCapture`
usava `depthFunc: GreaterDepth` sem semear o depth clear em 0, então o WebGL
limpava para 1.0 e o teste `GREATER` rejeitava todo fragmento. O RT ficava vazio,
`packed.a > 1e-4` era sempre falso e o shader caía no fallback `exitN = -N` — o
caso de lâmina paralela que o próprio `npm test` prova que cancela a dispersão.
Corrigido; gate em `scripts/test-refraction-gpu.mjs` (G1).

Com ele vivo, o retorno medido é modesto: desligar o pre-pass muda a imagem em
MAD ≈ 2.4/255, e o split R/B da dispersão sobe apenas de 0.616 para 0.732. O
motivo é estrutural — `plateScreenUV` dá ao T2 só `PLATE_EXIT_STEP` (0.22) do
caminho, contra o caminho inteiro do T1. Gate G4 falha se esse retorno cair
abaixo de 0.5, para que a decisão de manter ou deletar seja tomada com medição.

## Environment no motor `custom`

O shader amostrava o **equirect cru** (`userData.equirect`), não o PMREM. Três
consequências, todas corrigidas:

- `roughness` era inerte: o bias de mip não faz nada num equirect construído com
  `generateMipmaps = false` + `LinearFilter`.
- Costura visível em u=0/1 (`wrapS` default é `ClampToEdge`) e aliasing ao
  amostrar 4096×2048 por fragmento sem mips.
- 22% de radiância HDR não convolvida era injetada no termo transmitido de forma
  incondicional, independentemente de haver placa válida.

Agora usa `textureCubeUV` (chunk do próprio three) sobre o PMREM, e o env só
entra onde o raio sai do frame capturado. O equirect de origem é descartado após
a geração do PMREM — eram ~134 MB de textura float viva sem uso.

## Roughness

Custom: mip do PMREM por roughness + jitter direcional. Physical: `roughness` +
`clearcoatRoughness` acoplados ao slider. Não é GGX completo em nenhum dos dois.

## `surface-details` (demo)

Camada aditiva de 420 pontos + 90 riscos, ajustada a olho contra o `physical`.
Medição por silhueta, varrendo a intensidade de 0 a 1:

| engine | luma 0 → 1 | \|R-B\| 0 → 1 |
| --- | --- | --- |
| `physical` | 135.1 → 135.5 | 42.5 → 42.2 |
| `custom` (antes) | 90.3 → 167.0 | 46.5 → 16.1 |

Ou seja: **no-op** no motor onde foi ajustada, e destruía o outro — no default
0.45 do demo ela levava 37% do corpo a branco puro. Reescalada. Reproduzir com
`npm run calibrate:speckle`.

Consequência assumida: com a camada suave, `speckle` fica **abaixo do limiar de
0.15** na auditoria do motor `custom` (MAD ≈ 0.14). Subir a decoração até o
slider "passar" custa o sinal de refração — medido: no default 0.45, \|R-B\| cai
de 37.5 para 26.8. Preferimos o slider fraco e honesto ao número maquiado.
`speckle` agora também alimenta `normalScale` no `prismMaterial` (espelhando
`applyPhysicalParams`), que é a saída material legítima; a decoração aditiva não
deveria ser o único caminho de um controle.

## `transmission-scale` no motor `custom`

Morto por construção: `renderer.transmissionResolutionScale` só afeta o buffer de
transmissão do `MeshPhysicalMaterial`. O motor `custom` captura a própria placa.
Aparece como DEAD na auditoria e é esperado — não é bug.

## Perf

`docs/perf-after.md` = SwiftShader, e mediu apenas o motor `physical`. O `custom`
paga uma captura extra da cena (meia-res) + o pre-pass de backface por frame, o
que **não** está nessa tabela. Só Δ relativo; sem meta de fps de GPU.
