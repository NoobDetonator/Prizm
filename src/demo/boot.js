import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MATERIAL_PRESETS } from '../lib/prizm/index.js'
import { applyLookPreset } from '../post/lookPresets.js'
import { createPrizmApi } from './prizmApi.js'
import { startAnimationLoop } from './animate.js'

export function createRenderer(canvas, maxDprCapRef) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDprCapRef.value))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor('#000000', 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.transmissionResolutionScale = 1
  return renderer
}

export function createCamera(maskLayer) {
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.layers.enable(0)
  camera.layers.enable(maskLayer)
  camera.position.set(2.55, 1.75, 3.75)
  camera.position.multiplyScalar(1 + Math.max(0, 1.05 - camera.aspect) * 0.9)
  return camera
}

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.055
  controls.enablePan = false
  controls.minDistance = 2.8
  controls.maxDistance = 8
  controls.target.set(0, -0.04, 0)
  controls.update()
  return controls
}

export async function bootDemo(ctx) {
  const {
    ui,
    applyUi,
    readUi,
    reducedMotion,
    autoSpinRef,
    onResize,
    createApiCtx,
    animateCtx,
  } = ctx

  if (document.fonts?.ready) await document.fonts.ready
  applyLookPreset(ui, ui.look.value || 'studio')
  if (ui.note && MATERIAL_PRESETS[ui.preset.value]) ui.note.textContent = MATERIAL_PRESETS[ui.preset.value].note
  applyUi()
  window.addEventListener('resize', onResize)
  reducedMotion.addEventListener?.('change', (event) => {
    autoSpinRef.value = !event.matches
  })

  window.__prizm = createPrizmApi(createApiCtx())
  startAnimationLoop(animateCtx())
}
