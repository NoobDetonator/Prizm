import * as THREE from 'three'
import { createPrism } from '../lib/prizm/index.js'
import { createPostStack } from './postStack.js'
import { createEnvironmentManager } from './environments.js'
import { collectUi, createPanelToggle, createUiController, setValueLabel } from './panel.js'
import { setVoidMode as applyVoidMode } from './voidMode.js'
import { exportRender } from './exportRender.js'
import { createHeroPrism, createStudioLights, createStreetwear } from './sceneSetup.js'
import { createRenderer, createCamera, createControls, bootDemo } from './boot.js'

const MASK_LAYER = 1
const canvas = document.querySelector('#canvas')
canvas.setAttribute('role', 'img')
canvas.setAttribute('aria-label', 'Prisma de cristal artístico interativo em um estúdio óptico')
canvas.tabIndex = 0

const ui = collectUi()
document.querySelector('.tag').textContent = 'streetwear refraction / cube-only post FX'
document.querySelector('.hint').textContent = 'arraste para orbitar · scroll para zoom · FX só no cubo · texto refrata atrás'
const panelToggle = createPanelToggle(ui)

const maxDprCapRef = { value: Number(ui.dpr.value) || 2 }
const voidModeRef = { value: false }
const autoSpinRef = { value: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }
let exportInProgress = false
const adaptiveDprFloor = 1
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

const renderer = createRenderer(canvas, maxDprCapRef)
const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')
scene.environmentIntensity = 2.5

const camera = createCamera(MASK_LAYER)
const controls = createControls(camera, canvas)
const env = createEnvironmentManager({ renderer, scene, ui })
env.syncEnvNote(ui.envSource?.value || 'proc:spectral')

const { hero, cubeMesh, surfaceDetails, getLibPrism, switchEngine: rebuildEngine } = createHeroPrism({
  renderer,
  ui,
  maskLayer: MASK_LAYER,
  createPrism,
})
scene.add(hero)

const streetwear = createStreetwear(scene)
const { studioLights, studioLightBase } = createStudioLights(scene)
const post = createPostStack({ renderer, scene, camera, maskLayer: MASK_LAYER })
const { composer, renderPass, filmGradePass, glarePass } = post

const voidCtx = { scene, renderer, renderPass, streetwear, studioLights, studioLightBase, voidModeRef }
const setVoidMode = (enabled) => applyVoidMode(voidCtx, enabled)
const switchEnvironment = (kind) => env.switchEnvironment(kind)
const switchEngine = (engine) => rebuildEngine(engine, readUi)

function onResize() {
  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio, maxDprCapRef.value)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height)
  post.resize(width, height, dpr)
}

function lockCamera() {
  autoSpinRef.value = false
  hero.rotation.set(0.33, 0.66, 0.085)
  camera.position.set(2.55, 1.75, 3.75)
  camera.position.multiplyScalar(1 + Math.max(0, 1.05 - camera.aspect) * 0.9)
  controls.target.set(0, -0.04, 0)
  controls.update()
}

const exportCtx = {
  get exportInProgress() {
    return exportInProgress
  },
  setExportInProgress: (v) => {
    exportInProgress = v
  },
  autoSpin: () => autoSpinRef.value,
  setAutoSpin: (v) => {
    autoSpinRef.value = v
  },
  renderer,
  composer,
  canvas,
  scene,
  camera,
  onResize,
  ...post,
}

const { applyUi, bindUi, readUi } = createUiController({
  ui,
  getLibPrism,
  getVoidMode: () => voidModeRef.value,
  surfaceDetails,
  post,
  scene,
  renderer,
  maxDprCapRef,
  onResize,
})

bindUi({
  switchEnvironment,
  switchEngine,
  setVoidMode,
  exportRender: (scale) => exportRender(exportCtx, scale),
  autoSpinRef,
  reducedMotion,
  hero,
  camera,
  controls,
  canvas,
  panelToggle,
})

bootDemo({
  ui,
  applyUi,
  readUi,
  reducedMotion,
  autoSpinRef,
  onResize,
  createApiCtx: () => ({
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
    switchEngine,
    setEnvQuality: (q) => env.setEnvQuality(q),
    lockCamera,
  }),
  animateCtx: () => ({
    hero,
    autoSpinRef,
    filmGradePass,
    glarePass,
    libPrismRef: getLibPrism,
    streetwear,
    controls,
    post,
    composer,
    renderer,
    scene,
    camera,
    exportInProgress: () => exportInProgress,
    maxDprCapRef,
    adaptiveDprFloor,
    ui,
    onResize,
    setValueLabel,
  }),
})
