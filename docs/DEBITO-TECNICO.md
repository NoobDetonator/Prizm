# Débito técnico

## Cáusticas internas no transmission buffer

Engine `custom`: cáusticas procedurais no fragment. Engine `physical` (demo default): lâminas aditivas art-directed — não refratam pelo volume. Toggle no painel exercita os dois.

## Backface pre-pass (V3.2a — decisão)

Mantida. Custo: 1 RT + 1 draw do host/frame. Retorno: `plateScreenUV(T1, T2)` desloca a amostra da placa pela direção de saída; env continua em T2. Remover seria mais barato, mas o projeto já paga o capture — então ele tem de mover pixel.

## Roughness

Custom: mip bias + jitter. Physical: `roughness` + `clearcoatRoughness` acoplados ao slider. Não é GGX completo.

## Perf

`docs/perf-after.md` = SwiftShader. Só Δ relativo; sem meta de fps de GPU.
