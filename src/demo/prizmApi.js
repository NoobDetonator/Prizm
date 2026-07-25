import { LOOK_PRESETS, applyLookPreset } from '../post/lookPresets.js'
import { MATERIAL_PRESETS } from '../lib/prizm/index.js'
import { captureDataURL, capturePixels, exportRender, sampleRenderStats } from './exportRender.js'
import { findPrismShells } from './panel.js'

export function createPrizmApi(ctx) {
  const {
    renderer,
    scene,
    camera,
    controls,
    hero,
    cubeMesh,
    getLibPrism,
    surfaceDetails,
    streetwear,
    post,
    env,
    ui,
    panelToggle,
    voidModeRef,
    autoSpinRef,
    maxDprCapRef,
    exportCtx,
    applyUi,
    readUi,
    setVoidMode,
    switchEnvironment,
    setEnvQuality,
    lockCamera,
  } = ctx

  const {
    cubeMask,
    selectivePass,
    bloomPass,
    glarePass,
    flarePass,
    dofPass,
    afterimagePass,
    halftonePass,
    asciiPass,
    chromaPass,
    filmGradePass,
  } = post

  function shells() {
    return findPrismShells(cubeMesh)
  }

  return {
    renderer,
    scene,
    environment: env.activeEnvironment,
    camera,
    controls,
    prism: hero,
    cubeFront: cubeMesh,
    get interiorRim() {
      return shells().interiorRim
    },
    get rim() {
      return shells().rim
    },
    surfaceDetails,
    get material() {
      return getLibPrism().material
    },
    get interiorRimMaterial() {
      return shells().interiorRimMaterial
    },
    get rimMaterial() {
      return shells().rimMaterial
    },
    get caustics() {
      return shells().caustics
    },
    get libPrism() {
      return getLibPrism()
    },
    streetwear,
    cubeMask,
    selectivePass,
    bloomPass,
    glarePass,
    flarePass,
    dofPass,
    afterimagePass,
    halftonePass,
    asciiPass,
    chromaPass,
    filmGradePass,
    cinematicPass: filmGradePass,
    LOOK_PRESETS,
    exportRender: (scale) => exportRender(exportCtx, scale),
    applyUi,
    readUi,
    async applyLook(key) {
      if (!applyLookPreset(ui, key)) return false
      if (ui.look) ui.look.value = key
      if (ui.note && MATERIAL_PRESETS[ui.preset.value]) {
        ui.note.textContent = MATERIAL_PRESETS[ui.preset.value].note
      }
      const look = LOOK_PRESETS[key]
      setVoidMode(Boolean(look?.voidMode))
      if (look?.values?.envSource) {
        await switchEnvironment(look.values.envSource)
      }
      applyUi()
      return true
    },
    setVoidMode,
    get voidMode() {
      return voidModeRef.value
    },
    async setEnvironment(kind) {
      if (ui.envSource) ui.envSource.value = kind
      await switchEnvironment(kind)
      applyUi()
      return kind
    },
    get envQuality() {
      return env.envQuality
    },
    async setEnvQuality(quality) {
      const result = await setEnvQuality(quality)
      applyUi()
      return result
    },
    listEnvironments: () => env.listEnvironments(),
    setUiVisible(visible) {
      const show = Boolean(visible)
      ui.panel.classList.remove('is-open')
      ui.panel.style.display = show ? '' : 'none'
      panelToggle.style.display = show ? '' : 'none'
      const hud = document.querySelector('.hud')
      const hint = document.querySelector('.hint')
      if (hud) hud.style.display = show ? '' : 'none'
      if (hint) hint.style.display = show ? '' : 'none'
      panelToggle.setAttribute('aria-expanded', 'false')
      panelToggle.textContent = 'Controles'
    },
    setRenderControls(partial = {}) {
      if (partial.exposure != null && ui.exposure) ui.exposure.value = String(partial.exposure)
      if (partial.envIntensity != null && ui.envIntensity) ui.envIntensity.value = String(partial.envIntensity)
      if (partial.dpr != null && ui.dpr) ui.dpr.value = String(partial.dpr)
      applyUi()
    },
    setAutoSpin(value) {
      autoSpinRef.value = Boolean(value)
    },
    lockCamera,
    captureDataURL: (scale, opts) => captureDataURL(exportCtx, scale, opts),
    capturePixels: (scale) => capturePixels(exportCtx, scale),
    sampleRenderStats: () => sampleRenderStats(exportCtx),
    stats: {
      frameMs: 0,
      fps: 0,
      calls: 0,
      triangles: 0,
      _samples: [],
    },
  }
}
