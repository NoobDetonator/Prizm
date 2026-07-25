# Débito técnico

## Demo ↔ lib — resolvido

O demo consome `createPrism` (`src/demo/`). Toggle `physical` / `custom` no painel. Não há mais montagem paralela de materiais.

## Dispersão em lâmina paralela

Em geometria de faces paralelas (slab), Snell é reversível: `refract(refract(I,N,1/η),-N,η) ≡ I`. Com exit normal ≈ −entry, o split RGB **cancela** — isso é óptica, não bug de implementação. A captura de backface + `plateScreenUV(T1,T2)` só separa canais quando a normal de saída difere (quinas, cunha, malha orgânica).

## Backface pre-pass (mantida)

Custo: 1 RT + 1 draw do host/frame. Retorno: T2 move a amostra da placa e o lóbulo de env. Documentado como decisão consciente (não meio-termo).

## Roughness

Custom: mip bias + jitter (aprox.). Physical: `roughness` + `clearcoatRoughness`. Não é microfacet GGX completo.

## Cáusticas / glare / flare

Removidos do demo em `bff9915` (passes e lâminas internas). Bloom permanece, default baixo.

## Perf

Medições em SwiftShader — ver `docs/MEDICOES.md`. Sem meta de fps de GPU.
