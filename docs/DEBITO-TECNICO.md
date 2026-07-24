# Débito técnico

## Cáusticas internas no transmission buffer (adiado da T1.2)

**Problema:** lâminas aditivas transparentes não entram no *transmission render target* do Three (só opacos). Desenhá-las por cima do vidro (`depthTest: false`, `renderOrder: 3.5`) faz o slider funcionar, mas as cáusticas **não são refratadas** pelo volume.

**Solução correta (Fase 7):** renderizar as lâminas num RT próprio e injetar como `emissiveMap` / uniform no shader de prisma custom, somando *dentro* do cálculo de transmissão.

**Status:** aceito como fake art-directed até T7.5.
