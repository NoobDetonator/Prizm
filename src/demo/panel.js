import * as THREE from 'three'
import { MATERIAL_PRESETS } from '../lib/prizm/index.js'
import { LOOK_PRESETS, applyLookPreset } from '../post/lookPresets.js'

const TONE_MAP = {
  aces: THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping,
  none: THREE.NoToneMapping,
}

export function collectUi() {
  return {
    panel: document.querySelector('.panel'),
    look: document.querySelector('#look'),
    lookNote: document.querySelector('#look-note'),
    engine: document.querySelector('#engine'),
    preset: document.querySelector('#preset'),
    dispersion: document.querySelector('#dispersion'),
    thickness: document.querySelector('#thickness'),
    ior: document.querySelector('#ior'),
    roughness: document.querySelector('#roughness'),
    translucency: document.querySelector('#translucency'),
    bloom: document.querySelector('#bloom'),
    dof: document.querySelector('#dof'),
    dofFocus: document.querySelector('#dof-focus'),
    afterimage: document.querySelector('#afterimage'),
    halftone: document.querySelector('#halftone'),
    ascii: document.querySelector('#ascii'),
    asciiCell: document.querySelector('#ascii-cell'),
    chroma: document.querySelector('#chroma'),
    vignette: document.querySelector('#vignette'),
    grain: document.querySelector('#grain'),
    exposure: document.querySelector('#exposure'),
    envIntensity: document.querySelector('#env-intensity'),
    envSource: document.querySelector('#env-source'),
    envNote: document.querySelector('#env-note'),
    dpr: document.querySelector('#dpr'),
    transmissionScale: document.querySelector('#transmission-scale'),
    tonemap: document.querySelector('#tonemap'),
    speckle: document.querySelector('#speckle'),
    export: document.querySelector('#export-render'),
    note: document.querySelector('#preset-note'),
    values: Object.fromEntries(
      [...document.querySelectorAll('[data-value]')].map((el) => [el.getAttribute('data-value'), el]),
    ),
  }
}

export function createPanelToggle(ui) {
  const panelToggle = document.createElement('button')
  panelToggle.type = 'button'
  panelToggle.className = 'panel-toggle'
  panelToggle.textContent = 'Controles'
  panelToggle.setAttribute('aria-controls', ui.panel.id)
  panelToggle.setAttribute('aria-expanded', 'false')
  document.querySelector('#app').append(panelToggle)
  return panelToggle
}

function readUi(ui) {
  return {
    engine: ui.engine?.value || 'physical',
    preset: ui.preset.value,
    dispersion: Number(ui.dispersion.value),
    thickness: Number(ui.thickness.value),
    ior: Number(ui.ior.value),
    roughness: Number(ui.roughness.value),
    translucency: Number(ui.translucency.value),
    bloom: Number(ui.bloom.value),
    dof: Number(ui.dof.value),
    dofFocus: Number(ui.dofFocus.value),
    afterimage: Number(ui.afterimage.value),
    halftone: Number(ui.halftone.value),
    ascii: Number(ui.ascii.value),
    asciiCell: Number(ui.asciiCell.value),
    chroma: Number(ui.chroma.value),
    vignette: Number(ui.vignette.value),
    grain: Number(ui.grain.value),
    exposure: Number(ui.exposure.value),
    envIntensity: Number(ui.envIntensity.value),
    envSource: ui.envSource.value,
    dpr: Number(ui.dpr.value),
    transmissionScale: Number(ui.transmissionScale.value),
    tonemap: ui.tonemap.value,
    speckle: Number(ui.speckle.value),
  }
}

function syncPresetToSliders(ui, key) {
  const preset = MATERIAL_PRESETS[key]
  if (!preset) return
  ui.ior.value = String(preset.ior)
  ui.dispersion.value = String(preset.dispersion)
  ui.thickness.value = String(preset.thickness)
  ui.roughness.value = String(preset.roughness)
  ui.note.textContent = preset.note
}

export function setValueLabel(ui, key, value) {
  if (ui.values[key]) ui.values[key].textContent = value
}

export function createUiController(ctx) {
  const { ui, getLibPrism, getVoidMode, surfaceDetails, post, scene, renderer, maxDprCapRef, onResize } = ctx
  const {
    bloomPass,
    dofPass,
    afterimagePass,
    halftonePass,
    asciiPass,
    chromaPass,
    filmGradePass,
    cubeMask,
  } = post

  function applyUi() {
    const values = readUi(ui)
    const libPrism = getLibPrism()
    const voidMode = getVoidMode()

    libPrism.setParams({
      preset: values.preset,
      dispersion: values.dispersion,
      thickness: values.thickness,
      ior: values.ior,
      roughness: values.roughness,
      translucency: values.translucency,
      speckle: values.speckle,
      bloom: values.bloom,
    })

    if (voidMode && libPrism.engine === 'physical') {
      const mat = libPrism.material
      mat.envMapIntensity *= 1.22
      mat.clearcoatRoughness = 0.008
    }

    surfaceDetails.userData.setIntensity(voidMode ? values.speckle * 0.35 : values.speckle)

    bloomPass.setStrength(values.bloom * 1.15)
    bloomPass.setRadius(THREE.MathUtils.lerp(0.55, 1.15, Math.min(values.bloom, 1.5) / 1.5))
    bloomPass.setThreshold(THREE.MathUtils.lerp(0.78, 0.58, Math.min(values.bloom, 1.5) / 1.5))
    bloomPass.enabled = values.bloom > 0.005

    dofPass.setFocus(values.dofFocus)
    dofPass.setStrength(values.dof)

    afterimagePass.setAmount(values.afterimage)
    afterimagePass.enabled = values.afterimage > 0.01
    halftonePass.setAmount(values.halftone)
    halftonePass.setRadius(2.4 + values.halftone * 2.8)

    asciiPass.setAmount(values.ascii)
    asciiPass.setCellSize(values.asciiCell)
    asciiPass.setContrast(1.05 + values.ascii * 0.45)
    asciiPass.setMaskTexture(cubeMask.texture)
    asciiPass.enabled = values.ascii > 0.01

    bloomPass.setMaskTexture(cubeMask.texture)

    chromaPass.uniforms.intensity.value = values.chroma
    chromaPass.uniforms.amount.value = 0.0004 + values.chroma * 0.0018
    chromaPass.enabled = values.chroma > 0.01
    filmGradePass.uniforms.vignette.value = values.vignette
    filmGradePass.uniforms.grain.value = values.grain * 0.014
    filmGradePass.enabled = values.vignette > 0.01 || values.grain > 0.01

    renderer.toneMappingExposure = values.exposure
    renderer.toneMapping = TONE_MAP[values.tonemap] ?? THREE.ACESFilmicToneMapping
    renderer.transmissionResolutionScale = values.transmissionScale
    scene.environmentIntensity = values.envIntensity

    const nextDprCap = THREE.MathUtils.clamp(values.dpr, 1, 2)
    if (Math.abs(nextDprCap - maxDprCapRef.value) > 0.001) {
      maxDprCapRef.value = nextDprCap
      onResize()
    }

    setValueLabel(ui, 'dispersion', values.dispersion.toFixed(2))
    setValueLabel(ui, 'thickness', values.thickness.toFixed(2))
    setValueLabel(ui, 'ior', values.ior.toFixed(2))
    setValueLabel(ui, 'roughness', values.roughness.toFixed(3))
    setValueLabel(ui, 'translucency', values.translucency.toFixed(2))
    setValueLabel(ui, 'bloom', values.bloom.toFixed(2))
    setValueLabel(ui, 'dof', values.dof.toFixed(2))
    setValueLabel(ui, 'dof-focus', values.dofFocus.toFixed(2))
    setValueLabel(ui, 'afterimage', values.afterimage.toFixed(2))
    setValueLabel(ui, 'halftone', values.halftone.toFixed(2))
    setValueLabel(ui, 'ascii', values.ascii.toFixed(2))
    setValueLabel(ui, 'ascii-cell', String(Math.round(values.asciiCell)))
    setValueLabel(ui, 'chroma', values.chroma.toFixed(2))
    setValueLabel(ui, 'vignette', values.vignette.toFixed(2))
    setValueLabel(ui, 'grain', values.grain.toFixed(2))
    setValueLabel(ui, 'exposure', values.exposure.toFixed(2))
    setValueLabel(ui, 'env-intensity', values.envIntensity.toFixed(2))
    setValueLabel(ui, 'dpr', values.dpr.toFixed(2))
    setValueLabel(ui, 'transmission-scale', values.transmissionScale.toFixed(2))
    setValueLabel(ui, 'speckle', values.speckle.toFixed(2))
  }

  function bindUi(handlers) {
    const {
      switchEnvironment,
      switchEngine,
      setVoidMode,
      exportRender,
      autoSpinRef,
      reducedMotion,
      hero,
      camera,
      controls,
      canvas,
      panelToggle,
    } = handlers

    const stop = (event) => event.stopPropagation()
    const update = (event) => {
      stop(event)
      applyUi()
    }

    ui.panel.addEventListener('pointerdown', stop)
    ui.panel.addEventListener('pointermove', stop)
    ui.panel.addEventListener('wheel', stop, { passive: true })

    ui.preset.addEventListener('change', (event) => {
      stop(event)
      syncPresetToSliders(ui, ui.preset.value)
      applyUi()
    })

    ui.engine?.addEventListener('change', async (event) => {
      stop(event)
      await switchEngine(ui.engine.value)
      applyUi()
    })

    ui.look.addEventListener('change', async (event) => {
      stop(event)
      applyLookPreset(ui, ui.look.value)
      if (ui.note && MATERIAL_PRESETS[ui.preset.value]) {
        ui.note.textContent = MATERIAL_PRESETS[ui.preset.value].note
      }
      const look = LOOK_PRESETS[ui.look.value]
      setVoidMode(Boolean(look?.voidMode))
      if (look?.values?.envSource) {
        await switchEnvironment(look.values.envSource)
      } else if (!look?.voidMode && getVoidMode()) {
        setVoidMode(false)
      }
      applyUi()
    })

    ui.tonemap.addEventListener('change', update)
    ui.envSource.addEventListener('change', async (event) => {
      stop(event)
      await switchEnvironment(ui.envSource.value)
      applyUi()
    })

    const sliders = [
      ui.dispersion,
      ui.thickness,
      ui.ior,
      ui.roughness,
      ui.translucency,
      ui.bloom,
      ui.dof,
      ui.dofFocus,
      ui.afterimage,
      ui.halftone,
      ui.ascii,
      ui.asciiCell,
      ui.chroma,
      ui.vignette,
      ui.grain,
      ui.exposure,
      ui.envIntensity,
      ui.dpr,
      ui.transmissionScale,
      ui.speckle,
    ]

    for (const element of sliders) {
      element.addEventListener('pointerdown', stop)
      element.addEventListener('input', update)
      element.addEventListener('change', update)
    }

    ui.export.addEventListener('click', async (event) => {
      stop(event)
      await exportRender(2)
    })

    panelToggle.addEventListener('click', () => {
      const open = ui.panel.classList.toggle('is-open')
      panelToggle.setAttribute('aria-expanded', String(open))
      panelToggle.textContent = open ? 'Fechar' : 'Controles'
    })

    canvas.addEventListener('pointerdown', () => {
      autoSpinRef.value = false
    })

    canvas.addEventListener('dblclick', () => {
      autoSpinRef.value = !reducedMotion.matches
      hero.rotation.set(0.33, 0.66, 0.085)
      camera.position.set(2.55, 1.75, 3.75)
      camera.position.multiplyScalar(1 + Math.max(0, 1.05 - camera.aspect) * 0.9)
      controls.target.set(0, -0.04, 0)
      controls.update()
    })
  }

  return { applyUi, bindUi, readUi: () => readUi(ui) }
}

export function findPrismShells(host) {
  const shells = host?.getObjectByName('prizm-shells')
  return {
    interiorRim: shells?.getObjectByName('prizm-inner-rim') ?? null,
    rim: shells?.getObjectByName('prizm-outer-rim') ?? null,
    interiorRimMaterial: shells?.getObjectByName('prizm-inner-rim')?.material ?? null,
    rimMaterial: shells?.getObjectByName('prizm-outer-rim')?.material ?? null,
  }
}
