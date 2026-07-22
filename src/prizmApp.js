import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { SavePass } from 'three/addons/postprocessing/SavePass.js'
import { createPrismTexture } from './textures/createPrismTexture.js'
import { createPrismEnvironment } from './env/createPrismEnvironment.js'
import { loadImageEnvironment } from './env/loadImageEnvironment.js'
import { createStreetwearBackdrop } from './backdrop/createStreetwearBackdrop.js'
import { CinematicPrismShader } from './post/CinematicPrismShader.js'
import { QualityBloomPass } from './post/QualityBloomPass.js'
import { GlarePass } from './post/GlarePass.js'
import { LensFlarePass } from './post/LensFlarePass.js'
import { AsciiPass } from './post/AsciiPass.js'
import { DepthOfFieldPass } from './post/DepthOfFieldPass.js'
import { HalftoneStylePass } from './post/HalftoneStylePass.js'
import { AfterimageStylePass } from './post/AfterimageStylePass.js'
import { SelectiveCubeCompositePass } from './post/SelectiveCubeCompositePass.js'
import { createCubeMaskRenderer } from './post/createCubeMaskRenderer.js'
import { LOOK_PRESETS, applyLookPreset } from './post/lookPresets.js'
import { createInternalCaustics } from './effects/createInternalCaustics.js'
import { createPrismRimMaterial } from './materials/prismRimMaterial.js'
import { applyGlassInteriorRimParams, createGlassInteriorRimMaterial } from './materials/glassInteriorRimMaterial.js'
import {
  MATERIAL_PRESETS,
  applyBackFaceParams,
  applyPhysicalParams,
  createGlassBackMaterial,
  createPhysicalGlassMaterial,
} from './materials/physicalGlassV2.js'

const TONE_MAP = {
  aces: THREE.ACESFilmicToneMapping,
  reinhard: THREE.ReinhardToneMapping,
  cineon: THREE.CineonToneMapping,
  none: THREE.NoToneMapping,
}

const canvas = document.querySelector('#canvas')
canvas.setAttribute('role', 'img')
canvas.setAttribute('aria-label', 'Prisma de cristal artístico interativo em um estúdio óptico')
canvas.tabIndex = 0

const ui = {
  panel: document.querySelector('.panel'),
  look: document.querySelector('#look'),
  lookNote: document.querySelector('#look-note'),
  preset: document.querySelector('#preset'),
  dispersion: document.querySelector('#dispersion'),
  thickness: document.querySelector('#thickness'),
  ior: document.querySelector('#ior'),
  roughness: document.querySelector('#roughness'),
  translucency: document.querySelector('#translucency'),
  bloom: document.querySelector('#bloom'),
  glare: document.querySelector('#glare'),
  flare: document.querySelector('#flare'),
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
  dpr: document.querySelector('#dpr'),
  transmissionScale: document.querySelector('#transmission-scale'),
  tonemap: document.querySelector('#tonemap'),
  speckle: document.querySelector('#speckle'),
  caustics: document.querySelector('#caustics'),
  export: document.querySelector('#download-texture'),
  note: document.querySelector('#preset-note'),
  values: Object.fromEntries(
    [...document.querySelectorAll('[data-value]')].map((el) => [el.getAttribute('data-value'), el]),
  ),
}

document.querySelector('.tag').textContent = 'streetwear refraction / cube-only post FX'
document.querySelector('.hint').textContent = 'arraste para orbitar · scroll para zoom · FX só no cubo · texto refrata atrás'

const panelToggle = document.createElement('button')
panelToggle.type = 'button'
panelToggle.className = 'panel-toggle'
panelToggle.textContent = 'Controles'
panelToggle.setAttribute('aria-controls', ui.panel.id)
panelToggle.setAttribute('aria-expanded', 'false')
document.querySelector('#app').append(panelToggle)

let maxDprCap = Number(ui.dpr.value) || 2
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  stencil: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDprCap))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor('#000000', 1)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08
renderer.transmissionResolutionScale = 1

const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')

const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(2.55, 1.75, 3.75)
camera.position.multiplyScalar(1 + Math.max(0, 1.05 - camera.aspect) * 0.9)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.055
controls.enablePan = false
controls.minDistance = 2.8
controls.maxDistance = 8
controls.target.set(0, -0.04, 0)
controls.update()

let activeEnvironment = createPrismEnvironment(renderer)
scene.environment = activeEnvironment

const textures = createPrismTexture(1536)
const maxAnisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy())
for (const key of ['map', 'roughnessMap', 'normalMap']) textures[key].anisotropy = maxAnisotropy

const prismDimensions = new THREE.Vector3(1.86, 1.64, 1.7)
const geometry = new RoundedBoxGeometry(
  prismDimensions.x,
  prismDimensions.y,
  prismDimensions.z,
  12,
  0.105,
)

let presetKey = ui.preset?.value || 'crystal'
const material = createPhysicalGlassMaterial(textures, presetKey)
const backMaterial = createGlassBackMaterial(material)
const interiorRimMaterial = createGlassInteriorRimMaterial()
const rimMaterial = createPrismRimMaterial()

const cubeBack = new THREE.Mesh(geometry, backMaterial)
cubeBack.renderOrder = 1

const interiorRim = new THREE.Mesh(geometry, interiorRimMaterial)
interiorRim.name = 'glass-interior-rim'
interiorRim.scale.setScalar(0.945)
interiorRim.renderOrder = 1.5

const cubeFront = new THREE.Mesh(geometry, material)
cubeFront.renderOrder = 2

const rim = new THREE.Mesh(geometry, rimMaterial)
rim.scale.setScalar(1.012)
rim.renderOrder = 4

const surfaceDetails = createSurfaceDetails(prismDimensions, 420, 90)
const caustics = createInternalCaustics()

const prism = new THREE.Group()
prism.name = 'hero-prism'
prism.add(cubeBack, caustics, interiorRim, cubeFront, surfaceDetails, rim)
prism.rotation.set(0.33, 0.66, 0.085)
prism.position.set(0, -0.02, 0.08)
scene.add(prism)

const streetwear = createStreetwearBackdrop()
scene.add(streetwear)

const keyLight = new THREE.DirectionalLight('#fff5ec', 2.3)
keyLight.position.set(4.5, 6, 3.5)
scene.add(keyLight)

const coolRim = new THREE.DirectionalLight('#47bfff', 1.85)
coolRim.position.set(-5, 2.2, 1)
scene.add(coolRim)

const warmRim = new THREE.DirectionalLight('#ff6434', 1.25)
warmRim.position.set(4, -1.5, -2.5)
scene.add(warmRim)

scene.add(new THREE.AmbientLight('#10223a', 0.28))

const composerTarget = new THREE.WebGLRenderTarget(1, 1, {
  type: THREE.HalfFloatType,
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  depthBuffer: true,
  stencilBuffer: false,
})
composerTarget.samples = Math.min(4, renderer.capabilities.maxSamples || 4)

const composer = new EffectComposer(renderer, composerTarget)
composer.setPixelRatio(renderer.getPixelRatio())
composer.setSize(window.innerWidth, window.innerHeight)
composer.addPass(new RenderPass(scene, camera))

// Freeze a clean beauty copy BEFORE stylization so the backdrop stays untouched.
const cleanSavePass = new SavePass()
composer.addPass(cleanSavePass)

const cubeMask = createCubeMaskRenderer()
cubeMask.setSize(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio())

// Pipeline: beauty → save clean → DoF → bloom → glare → flare → afterimage → cinematic →
// halftone → ASCII → selective mix (cube only) → output
const dofPass = new DepthOfFieldPass(scene, camera, {
  focus: 4.8,
  aperture: 0.00022,
  maxblur: 0.01,
})
dofPass.enabled = false
composer.addPass(dofPass)

const bloomPass = new QualityBloomPass(0.55, 0.9, 0.68)
composer.addPass(bloomPass)

const glarePass = new GlarePass({ strength: 0.35, threshold: 0.7, stretch: 1.55, angle: 0.08 })
composer.addPass(glarePass)

const flarePass = new LensFlarePass({ strength: 0.25, threshold: 0.8, ghosts: 6, haloWidth: 0.4 })
composer.addPass(flarePass)

const afterimagePass = new AfterimageStylePass(0)
composer.addPass(afterimagePass)

const cinematicPass = new ShaderPass(CinematicPrismShader)
composer.addPass(cinematicPass)

const halftonePass = new HalftoneStylePass({ amount: 0, radius: 3.4, shape: 1 })
composer.addPass(halftonePass)

const selectivePass = new SelectiveCubeCompositePass(cleanSavePass.renderTarget.texture, cubeMask.texture)
selectivePass.setSelective(true)
composer.addPass(selectivePass)

// ASCII after selective mix: whole glyphs only on cube cells, streetwear stays clean.
const asciiPass = new AsciiPass({ amount: 0, cellSize: 10, colorize: true, solid: true })
asciiPass.setMaskTexture(cubeMask.texture)
composer.addPass(asciiPass)

composer.addPass(new OutputPass())
composer.setSize(window.innerWidth, window.innerHeight)

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
let autoSpin = !reducedMotion.matches
let exportInProgress = false
let lastFrame = performance.now()

boot()

async function boot() {
  if (document.fonts?.ready) await document.fonts.ready

  applyLookPreset(ui, ui.look.value || 'studio')
  if (ui.note && MATERIAL_PRESETS[ui.preset.value]) {
    ui.note.textContent = MATERIAL_PRESETS[ui.preset.value].note
  }
  applyUi()
  bindUi()
  window.addEventListener('resize', onResize)
  document.addEventListener('visibilitychange', onVisibilityChange)
  reducedMotion.addEventListener?.('change', onMotionPreferenceChange)
  animate(performance.now())

  window.__prizm = {
    renderer,
    scene,
    environment: activeEnvironment,
    camera,
    prism,
    material,
    backMaterial,
    interiorRimMaterial,
    rimMaterial,
    caustics,
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
    cinematicPass,
    LOOK_PRESETS,
    exportRender,
    applyUi,
    readUi,
  }

  try {
    const imageEnvironment = await loadImageEnvironment(renderer, '/assets/prism-environment-reference.png')
    scene.environment = imageEnvironment
    scene.environmentRotation.y = 0.72
    activeEnvironment.dispose()
    activeEnvironment = imageEnvironment
    window.__prizm.environment = activeEnvironment
  } catch (error) {
    console.warn('Reference environment could not be loaded; using procedural fallback.', error)
  }
}

function readUi() {
  return {
    preset: ui.preset.value,
    dispersion: Number(ui.dispersion.value),
    thickness: Number(ui.thickness.value),
    ior: Number(ui.ior.value),
    roughness: Number(ui.roughness.value),
    translucency: Number(ui.translucency.value),
    bloom: Number(ui.bloom.value),
    glare: Number(ui.glare.value),
    flare: Number(ui.flare.value),
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
    dpr: Number(ui.dpr.value),
    transmissionScale: Number(ui.transmissionScale.value),
    tonemap: ui.tonemap.value,
    speckle: Number(ui.speckle.value),
    caustics: Number(ui.caustics.value),
  }
}

function syncPresetToSliders(key) {
  const preset = MATERIAL_PRESETS[key]
  if (!preset) return
  ui.ior.value = String(preset.ior)
  ui.dispersion.value = String(preset.dispersion)
  ui.thickness.value = String(preset.thickness)
  ui.roughness.value = String(preset.roughness)
  ui.note.textContent = preset.note
}

function applyUi() {
  const values = readUi()
  presetKey = values.preset

  applyPhysicalParams(material, { ...values, presetKey })
  applyBackFaceParams(backMaterial, material, values.translucency)
  applyGlassInteriorRimParams(interiorRimMaterial, values)
  surfaceDetails.userData.setIntensity(values.speckle)
  caustics.userData.setIntensity(values.caustics)

  bloomPass.setStrength(values.bloom * 1.15)
  bloomPass.setRadius(THREE.MathUtils.lerp(0.55, 1.15, Math.min(values.bloom, 1.5) / 1.5))
  bloomPass.setThreshold(THREE.MathUtils.lerp(0.78, 0.58, Math.min(values.bloom, 1.5) / 1.5))
  rimMaterial.uniforms.intensity.value = 0.36 + values.bloom * 0.4 + values.dispersion * 0.065

  glarePass.setStrength(values.glare)
  glarePass.enabled = values.glare > 0.01
  glarePass.setStretch(0.9 + values.glare * 1.1)

  flarePass.setStrength(values.flare)
  flarePass.enabled = values.flare > 0.01

  dofPass.setFocus(values.dofFocus)
  dofPass.setStrength(values.dof)

  afterimagePass.setAmount(values.afterimage)
  halftonePass.setAmount(values.halftone)
  halftonePass.setRadius(2.4 + values.halftone * 2.8)

  asciiPass.setAmount(values.ascii)
  asciiPass.setCellSize(values.asciiCell)
  asciiPass.setContrast(1.15 + values.ascii * 0.55)
  asciiPass.setMaskTexture(cubeMask.texture)
  asciiPass.enabled = values.ascii > 0.01

  cinematicPass.uniforms.intensity.value = values.chroma
  cinematicPass.uniforms.amount.value = 0.0004 + values.chroma * 0.0018
  cinematicPass.uniforms.vignette.value = values.vignette
  cinematicPass.uniforms.grain.value = values.grain * 0.014

  renderer.toneMappingExposure = values.exposure
  renderer.toneMapping = TONE_MAP[values.tonemap] ?? THREE.ACESFilmicToneMapping
  renderer.transmissionResolutionScale = values.transmissionScale

  const nextDprCap = THREE.MathUtils.clamp(values.dpr, 1, 2)
  if (Math.abs(nextDprCap - maxDprCap) > 0.001) {
    maxDprCap = nextDprCap
    onResize()
  }

  setValueLabel('dispersion', values.dispersion.toFixed(2))
  setValueLabel('thickness', values.thickness.toFixed(2))
  setValueLabel('ior', values.ior.toFixed(2))
  setValueLabel('roughness', values.roughness.toFixed(3))
  setValueLabel('translucency', values.translucency.toFixed(2))
  setValueLabel('bloom', values.bloom.toFixed(2))
  setValueLabel('glare', values.glare.toFixed(2))
  setValueLabel('flare', values.flare.toFixed(2))
  setValueLabel('dof', values.dof.toFixed(2))
  setValueLabel('dof-focus', values.dofFocus.toFixed(2))
  setValueLabel('afterimage', values.afterimage.toFixed(2))
  setValueLabel('halftone', values.halftone.toFixed(2))
  setValueLabel('ascii', values.ascii.toFixed(2))
  setValueLabel('ascii-cell', String(Math.round(values.asciiCell)))
  setValueLabel('chroma', values.chroma.toFixed(2))
  setValueLabel('vignette', values.vignette.toFixed(2))
  setValueLabel('grain', values.grain.toFixed(2))
  setValueLabel('exposure', values.exposure.toFixed(2))
  setValueLabel('dpr', values.dpr.toFixed(2))
  setValueLabel('transmission-scale', values.transmissionScale.toFixed(2))
  setValueLabel('speckle', values.speckle.toFixed(2))
  setValueLabel('caustics', values.caustics.toFixed(2))
}

function setValueLabel(key, value) {
  if (ui.values[key]) ui.values[key].textContent = value
}

function bindUi() {
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
    syncPresetToSliders(ui.preset.value)
    applyUi()
  })

  ui.look.addEventListener('change', (event) => {
    stop(event)
    applyLookPreset(ui, ui.look.value)
    if (ui.note && MATERIAL_PRESETS[ui.preset.value]) {
      ui.note.textContent = MATERIAL_PRESETS[ui.preset.value].note
    }
    applyUi()
  })

  ui.tonemap.addEventListener('change', update)

  const sliders = [
    ui.dispersion,
    ui.thickness,
    ui.ior,
    ui.roughness,
    ui.translucency,
    ui.bloom,
    ui.glare,
    ui.flare,
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
    ui.dpr,
    ui.transmissionScale,
    ui.speckle,
    ui.caustics,
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
    autoSpin = false
  })

  canvas.addEventListener('dblclick', () => {
    autoSpin = !reducedMotion.matches
    prism.rotation.set(0.33, 0.66, 0.085)
    camera.position.set(2.55, 1.75, 3.75)
    camera.position.multiplyScalar(1 + Math.max(0, 1.05 - camera.aspect) * 0.9)
    controls.target.set(0, -0.04, 0)
    controls.update()
  })
}

function onResize() {
  const width = window.innerWidth
  const height = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio, maxDprCap)

  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height)
  composer.setPixelRatio(dpr)
  composer.setSize(width, height)
  cubeMask.setSize(width * dpr, height * dpr)
  selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
  selectivePass.setMaskTexture(cubeMask.texture)
  asciiPass.setMaskTexture(cubeMask.texture)
  asciiPass.setSize(width * dpr, height * dpr)
  dofPass.syncCamera(camera)
}

function onVisibilityChange() {
  lastFrame = performance.now()
}

function onMotionPreferenceChange(event) {
  autoSpin = !event.matches
}

function animate(now) {
  requestAnimationFrame(animate)
  const delta = Math.min((now - lastFrame) / 1000, 0.05)
  lastFrame = now

  if (document.hidden || exportInProgress) return
  if (autoSpin) prism.rotation.y += delta * 0.035

  cinematicPass.uniforms.time.value = now * 0.001
  // Slow anamorphic rotation for living glare
  glarePass.setAngle(0.08 + Math.sin(now * 0.00015) * 0.04)
  caustics.userData.update(now * 0.001)
  streetwear.userData.update(now * 0.001)
  controls.update()

  // Mask first so selective composite can keep the streetwear wall clean.
  cubeMask.renderMask(renderer, scene, camera, [streetwear])
  selectivePass.setMaskTexture(cubeMask.texture)
  selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
  asciiPass.setMaskTexture(cubeMask.texture)
  composer.render()
}

async function exportRender(scale = 2) {
  if (exportInProgress) return
  exportInProgress = true
  const previousText = ui.export.textContent
  ui.export.disabled = true
  ui.export.textContent = 'Renderizando…'

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxScale = Math.min(2.5, 4096 / Math.max(viewportWidth, viewportHeight))
  const exportScale = Math.max(1, Math.min(scale, maxScale))
  const width = Math.round(viewportWidth * exportScale)
  const height = Math.round(viewportHeight * exportScale)

  try {
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    composer.setPixelRatio(1)
    composer.setSize(width, height)
    cubeMask.setSize(width, height)
    cubeMask.renderMask(renderer, scene, camera, [streetwear])
    selectivePass.setMaskTexture(cubeMask.texture)
    selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
    asciiPass.setMaskTexture(cubeMask.texture)
    asciiPass.setSize(width, height)
    composer.render()

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG export failed'))), 'image/png')
    })
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(blob)
    link.href = objectUrl
    link.download = `prizm-${width}x${height}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } finally {
    exportInProgress = false
    ui.export.disabled = false
    ui.export.textContent = previousText
    onResize()
  }
}

function createSurfaceDetails(dimensions, speckleCount, scratchCount) {
  const group = new THREE.Group()
  group.name = 'surface-details'
  const random = mulberry32(29)
  const half = dimensions.clone().multiplyScalar(0.5)
  const faces = [
    { normal: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(0, 0, 1), hu: half.y, hv: half.z },
    { normal: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(0, 0, -1), hu: half.y, hv: half.z },
    { normal: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1), hu: half.x, hv: half.z },
    { normal: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1), hu: half.x, hv: half.z },
    { normal: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), hu: half.x, hv: half.y },
    { normal: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0), hu: half.x, hv: half.y },
  ]

  const pointPositions = new Float32Array(speckleCount * 3)
  const pointColors = new Float32Array(speckleCount * 3)
  const palette = ['#ffffff', '#b7e9ff', '#66caff', '#ffbb88']
  const color = new THREE.Color()

  for (let index = 0; index < speckleCount; index++) {
    const face = faces[Math.floor(random() * faces.length)]
    const point = surfacePoint(face, random, 0.018)
    point.toArray(pointPositions, index * 3)
    color.set(palette[Math.floor(random() * palette.length)])
    color.multiplyScalar(0.55 + random() * 0.75)
    color.toArray(pointColors, index * 3)
  }

  const pointsGeometry = new THREE.BufferGeometry()
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))
  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.009,
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  pointsMaterial.toneMapped = false
  const points = new THREE.Points(pointsGeometry, pointsMaterial)
  points.renderOrder = 3
  group.add(points)

  const scratchPositions = new Float32Array(scratchCount * 6)
  const scratchColors = new Float32Array(scratchCount * 6)
  for (let index = 0; index < scratchCount; index++) {
    const face = faces[Math.floor(random() * faces.length)]
    const start = surfacePoint(face, random, 0.02)
    const length = 0.018 + random() * 0.068
    const drift = (random() - 0.5) * 0.016
    const end = start.clone().addScaledVector(face.v, length).addScaledVector(face.u, drift)
    start.toArray(scratchPositions, index * 6)
    end.toArray(scratchPositions, index * 6 + 3)
    color.set(random() > 0.82 ? '#74d8ff' : '#ffffff').multiplyScalar(0.65 + random() * 0.45)
    color.toArray(scratchColors, index * 6)
    color.toArray(scratchColors, index * 6 + 3)
  }

  const scratchGeometry = new THREE.BufferGeometry()
  scratchGeometry.setAttribute('position', new THREE.BufferAttribute(scratchPositions, 3))
  scratchGeometry.setAttribute('color', new THREE.BufferAttribute(scratchColors, 3))
  const scratchMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
  scratchMaterial.toneMapped = false
  const scratches = new THREE.LineSegments(scratchGeometry, scratchMaterial)
  scratches.renderOrder = 3
  group.add(scratches)

  group.userData.setIntensity = (value) => {
    const amount = THREE.MathUtils.clamp(value, 0, 1)
    pointsMaterial.opacity = amount * 0.72
    scratchMaterial.opacity = amount * 0.42
    group.visible = amount > 0.01
  }

  return group
}

function surfacePoint(face, random, offset) {
  const margin = 0.1
  const u = (random() * 2 - 1) * Math.max(0, face.hu - margin)
  const v = (random() * 2 - 1) * Math.max(0, face.hv - margin)
  const normalExtent = Math.abs(face.normal.x) * prismDimensions.x * 0.5
    + Math.abs(face.normal.y) * prismDimensions.y * 0.5
    + Math.abs(face.normal.z) * prismDimensions.z * 0.5
  return face.normal.clone().multiplyScalar(normalExtent + offset)
    .addScaledVector(face.u, u)
    .addScaledVector(face.v, v)
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
