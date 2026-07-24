# Débito técnico

## Cáusticas internas no transmission buffer (T1.2 → T7.5)

**Problema histórico:** lâminas aditivas transparentes não entram no *transmission render target* do Three (só opacos). Desenhá-las por cima do vidro (`depthTest: false`, `renderOrder: 3.5`) faz o slider funcionar, mas as cáusticas **não são refratadas** pelo volume.

**Resolução (T7.5):** o engine `custom` de `createPrism` injeta cáusticas **procedurais no fragment shader** (após Beer–Lambert), somando dentro do caminho transmitido. Lâminas aditivas ficam desligadas por default nesse engine (`shells.caustics: false`).

**Restante:** o demo principal (`src/main.js`) ainda usa `MeshPhysicalMaterial.transmission` + lâminas aditivas para manter o look streetwear já afinado com o pipeline de pós. Migrar o demo para `engine: 'custom'` + `beforeRender` é opcional e muda o caráter óptico (screen-space vs transmission RT do Three).

**Status:** resolvido na lib custom; demo physical ainda documentado como fake art-directed.
