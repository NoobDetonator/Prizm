import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { createPrismTexture, downloadTexture } from './textures/createPrismTexture.js'
import { createPrismEnvironment } from './env/createPrismEnvironment.js'
import { ChromaticAberrationShader } from './post/ChromaticAberrationShader.js'
import { createSoftBloomPass } from './post/SoftBloomPass.js'
import { createStreetwearBackdrop } from './backdrop/createStreetwearBackdrop.js'
import {
  MATERIAL_PRESETS,
  createPhysicalGlassMaterial,
  createGlassBackMaterial,
  applyPhysicalParams,
  applyBackFaceParams,
} from './materials/physicalGlass.js'

const canvas = document.querySelector('#canvas')
const ui = {
  preset: document.querySelector('#preset'),
  dispersion: document.querySelector('#dispersion'),
  thickness: document.querySelector('#thickness'),
  ior: document.querySelector('#ior'),
  roughness: document.querySelector('#roughness'),
  translucency: document.querySelector('#translucency'),
  bloom: document.querySelector('#bloom'),
  speckle: document.querySelector('#speckle'),
  download: document.querySelector('#download-texture'),
  note: document.querySelector('#preset-note'),
  values: {
    dispersion: document.querySelector('[data-value="dispersion"]'),
    thickness: document.querySelector('[data-value="thickness"]'),
    ior: document.querySelector('[data-value="ior"]'),
    roughness: document.querySelector('[data-value="roughness"]'),
    translucency: document.querySelector('[data-value="translucency"]'),
    bloom: document.querySelector('[data-value="bloom"]'),
    speckle: document.querySelector('[data-value="speckle"]'),
  },
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2

const scene = new THREE.Scene()
scene.background = new THREE.Color('#050505')

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(2.8, 1.6, 4.6)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minDistance = 2.4
controls.maxDistance = 12
controls.target.set(0, 0, -0.4)
controls.autoRotate = true
controls.autoRotateSpeed = 0.4

const envMap = createPrismEnvironment(renderer)
scene.environment = envMap

const textures = createPrismTexture(1024)
const cubeSize = 1.55
const geometry = new RoundedBoxGeometry(cubeSize, cubeSize, cubeSize, 6, 0.085)

let presetKey = ui.preset?.value || 'crystal'
const material = createPhysicalGlassMaterial(textures, presetKey)
const backMaterial = createGlassBackMaterial(material)

// Two-pass glass: draw inner (back) faces first, then outer (front).
// That's why you can see the far edges through the volume — like real crystal.
const cubeBack = new THREE.Mesh(geometry, backMaterial)
cubeBack.renderOrder = 2

const cubeFront = new THREE.Mesh(geometry, material)
cubeFront.renderOrder = 3

const cube = new THREE.Group()
cube.add(cubeBack)
cube.add(cubeFront)

// Full 12-edge cage — opaque so it is sampled into the refraction buffer
// (transparent lines often get skipped / sorted away). Far edges then show
// through the front faces, like looking into a real glass cube.
const edgeLines = new THREE.LineSegments(
  new THREE.EdgesGeometry(geometry, 1),
  new THREE.LineBasicMaterial({
    color: '#f2f7ff',
    transparent: false,
    depthWrite: true,
    toneMapped: false,
  }),
)
edgeLines.renderOrder = 0
cube.add(edgeLines)

cube.rotation.set(0.35, 0.7, 0.12)
cube.position.z = 0.15
scene.add(cube)

const sparkles = createInnerSparkles(420, cubeSize * 0.3)
cube.add(sparkles)

const key = new THREE.DirectionalLight('#fff4e8', 1.8)
key.position.set(4, 6, 2)
scene.add(key)

const rim = new THREE.DirectionalLight('#8ecbff', 1.0)
rim.position.set(-5, 2, -3)
scene.add(rim)

// Light the poster wall so transmission has signal to bend
const posterLight = new THREE.DirectionalLight('#ffffff', 1.6)
posterLight.position.set(0, 1, 6)
scene.add(posterLight)

scene.add(new THREE.AmbientLight('#1a2230', 0.45))

const composer = new EffectComposer(renderer)
composer.setPixelRatio(renderer.getPixelRatio())
composer.addPass(new RenderPass(scene, camera))

const bloomPass = createSoftBloomPass()
composer.addPass(bloomPass)

const chromaPass = new ShaderPass(ChromaticAberrationShader)
chromaPass.uniforms.amount.value = 0.0012
composer.addPass(chromaPass)
composer.addPass(new OutputPass())

let backdrop = null

async function boot() {
  // Wait for Archivo Black so the poster isn't painted in a fallback face
  if (document.fonts?.ready) await document.fonts.ready

  backdrop = createStreetwearBackdrop()
  scene.add(backdrop)

  syncPresetToSliders(presetKey)
  applyUi()
  bindUi()
  syncBloomResolution()
  window.addEventListener('resize', onResize)
  animate()

  window.__prizm = { material, backMaterial, bloomPass, sparkles, backdrop, applyUi, readUi }
}

boot()

function readUi() {
  return {
    preset: ui.preset.value,
    dispersion: Number(ui.dispersion.value),
    thickness: Number(ui.thickness.value),
    ior: Number(ui.ior.value),
    roughness: Number(ui.roughness.value),
    translucency: Number(ui.translucency.value),
    bloom: Number(ui.bloom.value),
    speckle: Number(ui.speckle.value),
  }
}

function syncPresetToSliders(key) {
  const p = MATERIAL_PRESETS[key]
  if (!p) return
  ui.ior.value = String(p.ior)
  ui.dispersion.value = String(p.dispersion)
  ui.thickness.value = String(p.thickness)
  ui.roughness.value = String(p.roughness)
  if (ui.note) ui.note.textContent = p.note
}

function applyUi() {
  const v = readUi()
  presetKey = v.preset

  const physical = {
    ior: v.ior,
    dispersion: v.dispersion,
    thickness: v.thickness,
    roughness: v.roughness,
    translucency: v.translucency,
    speckle: v.speckle,
    presetKey,
  }
  applyPhysicalParams(material, physical)
  applyBackFaceParams(backMaterial, material, v.translucency)

  bloomPass.setStrength(v.bloom)
  bloomPass.setThreshold(0.82)

  sparkles.material.opacity = v.speckle * 0.75
  sparkles.visible = v.speckle > 0.02
  // Dim edge cage slightly as the body gets milkier
  edgeLines.material.color.set(v.translucency > 0.55 ? '#b8c8dc' : '#f2f7ff')

  setValueLabel('dispersion', v.dispersion.toFixed(2))
  setValueLabel('thickness', v.thickness.toFixed(2))
  setValueLabel('ior', v.ior.toFixed(2))
  setValueLabel('roughness', v.roughness.toFixed(3))
  setValueLabel('translucency', v.translucency.toFixed(2))
  setValueLabel('bloom', v.bloom.toFixed(2))
  setValueLabel('speckle', v.speckle.toFixed(2))
}

function setValueLabel(key, text) {
  const el = ui.values[key]
  if (el) el.textContent = text
}

function bindUi() {
  const stop = (e) => e.stopPropagation()
  const onInput = (e) => {
    stop(e)
    applyUi()
  }

  const panel = document.querySelector('.panel')
  panel.addEventListener('pointerdown', stop)
  panel.addEventListener('pointermove', stop)
  panel.addEventListener('wheel', stop, { passive: true })

  ui.preset.addEventListener('change', (e) => {
    stop(e)
    syncPresetToSliders(ui.preset.value)
    applyUi()
  })

  for (const el of [
    ui.dispersion,
    ui.thickness,
    ui.ior,
    ui.roughness,
    ui.translucency,
    ui.bloom,
    ui.speckle,
  ]) {
    el.addEventListener('pointerdown', stop)
    el.addEventListener('input', onInput)
    el.addEventListener('change', onInput)
  }

  ui.download.addEventListener('click', (e) => {
    stop(e)
    downloadTexture(textures.canvas, 'prizm-surface.png')
  })

  canvas.addEventListener('pointerdown', () => {
    controls.autoRotate = false
  })
}

function syncBloomResolution() {
  const dpr = renderer.getPixelRatio()
  bloomPass.uniforms.resolution.value.x = window.innerWidth * dpr
  bloomPass.uniforms.resolution.value.y = window.innerHeight * dpr
}

function onResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = Math.min(window.devicePixelRatio, 2)

  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(dpr)
  renderer.setSize(w, h)
  composer.setPixelRatio(dpr)
  composer.setSize(w, h)
  syncBloomResolution()
}

function animate() {
  requestAnimationFrame(animate)
  const t = performance.now() * 0.001
  cube.rotation.y += 0.0016
  backdrop?.userData.update?.(t)
  controls.update()
  composer.render()
}

function createInnerSparkles(count, halfExtent) {
  const geo = new THREE.SphereGeometry(0.007, 6, 6)
  const mat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })

  const mesh = new THREE.InstancedMesh(geo, mat, count)
  mesh.renderOrder = -1
  mesh.frustumCulled = false

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const palette = ['#ffffff', '#9fd4ff', '#ffb07a', '#7ef0d8']

  for (let i = 0; i < count; i++) {
    dummy.position.set(
      (Math.random() * 2 - 1) * halfExtent,
      (Math.random() * 2 - 1) * halfExtent,
      (Math.random() * 2 - 1) * halfExtent,
    )
    dummy.scale.setScalar(0.45 + Math.random() * 1.1)
    dummy.updateMatrix()
    mesh.setMatrixAt(i, dummy.matrix)
    color.set(palette[i % palette.length])
    mesh.setColorAt(i, color)
  }

  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}
