# Prizm

Visualizador web Three.js de um cubo-prisma artístico com física óptica aproximada, tipografia streetwear refratando atrás do cristal, e textura procedural.

## Rodar

```bash
npm install
npm run dev
```

## Física mapeada no material

| Fenômeno | Na natureza | No Three.js |
| --- | --- | --- |
| Refração (Snell) | \(n_1\sin\theta_1 = n_2\sin\theta_2\) | `ior` |
| Dispersão | \(n = n(\lambda)\); azul desvia mais que vermelho | `dispersion` (IOR por canal RGB) |
| Absorção no volume | Beer–Lambert | `attenuationColor` + `attenuationDistance` |
| Caminho óptico | espessura do meio | `thickness` |
| Translucidez | scatter + absorção | slider mistura transmission / attenuation |
| Micro-relevo | poeira / riscos | `roughnessMap` + `normalMap` |

Presets: crown glass \(n\approx1.52\), flint \(n\approx1.62\), crystal \(n\approx1.85\).

## O que tem

- Cubo com bordas arredondadas + transmission física
- Cáusticas espectrais internas animadas
- Estúdio óptico limpo + environment map de referência
- Pipeline de pós-processamento reutilizável:
  - Dual Kawase bloom
  - Glare anamórfico
  - Lens flare (ghosts)
  - Depth of field (Bokeh)
  - Afterimage / ghost trails
  - Halftone CMYK
  - ASCII em tempo real
  - Aberração cromática / vinheta / grain
- Presets artísticos (studio, anamorphic, portrait, neon ASCII, ghost trail, print shop, prism chaos)
- Controles de render: exposure, DPR, transmission scale, tone map
- Export de render 2×
- Painel com presets e sliders ao vivo
