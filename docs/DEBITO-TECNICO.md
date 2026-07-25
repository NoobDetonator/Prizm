# Débito técnico

## Cáusticas internas no transmission buffer (T1.2 → T7.5)

**Problema histórico:** lâminas aditivas transparentes não entram no *transmission render target* do Three (só opacos). Desenhá-las por cima do vidro (`depthTest: false`, `renderOrder: 3.5`) faz o slider funcionar, mas as cáusticas **não são refratadas** pelo volume.

**Resolução (T7.5):** o engine `custom` de `createPrism` injeta cáusticas **procedurais no fragment shader** (após Beer–Lambert). Lâminas aditivas ficam desligadas por default nesse engine (`shells.caustics: false`).

**Demo (Plano V2 / Fase B):** o app principal consome `createPrism` e defaulta para `engine: 'physical'` (transmission + lâminas) para preservar o look streetwear afinado com o pós. O painel expõe toggle `physical` / `custom` — o caminho custom é exercitado no mesmo app (regra: se o demo não consome a API, ela não está pronta).

**Status:** resolvido na lib custom; demo physical ainda usa lâminas art-directed (fake óptico consciente). Migrar o default do demo para `custom` continua aberto se o look streetwear for re-afinado.

## Roughness (A5 — parcial)

Custom engine aplica **mip bias + jitter** na placa de refração e no equirect. Não é microfacet GGX completo.

No audit physical (`docs/slider-audit-after.md`), `roughness` ainda está **DEAD/WEAK** (MAD 0.11) — esperado no transmission path se o IBL/specular não responder no range do slider. Re-auditar com `engine=custom`.

## Sliders ainda mortos (physical demo)

De `docs/slider-audit-after.md`: `roughness`, `speckle`, `dof-focus`, `afterimage`, `ascii-cell`, `dpr`. Tratar como bugs abertos — não como itens concluídos.

## Perf numbers

`docs/perf-after.md` foi medido em **SwiftShader**. Não usar esses fps absolutos como evidência de GPU. Comparar só Δ relativo na mesma configuração, ou re-medir com `--use-angle=default` em máquina com GPU.
