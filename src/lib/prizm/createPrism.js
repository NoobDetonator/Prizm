import * as THREE from 'three'
import {
  createPhysicalGlassMaterial,
  applyPhysicalParams,
  MATERIAL_PRESETS,
} from '../../materials/physicalGlass.js'
import {
  createPrismMaterial,
  applyPrismMaterialParams,
} from '../../materials/prismMaterial.js'
import { createGlassInteriorRimMaterial, applyGlassInteriorRimParams } from '../../materials/glassInteriorRimMaterial.js'
import { createPrismRimMaterial } from '../../materials/prismRimMaterial.js'
import { createPrismTexture } from '../../textures/createPrismTexture.js'
import { createInternalCaustics } from '../../effects/createInternalCaustics.js'
import { createRefractionCapture } from './createRefractionCapture.js'
import { estimateThickness, createThicknessHintMap } from './estimateThickness.js'

/**
 * Reusable prism attachment for any Mesh.
 * Zero DOM. Multiple instances are safe (all state is closed over).
 *
 * @example
 * const prism = createPrism({ renderer, preset: 'crystal', engine: 'custom' })
 * prism.attach(mesh)
 * // each frame:
 * prism.beforeRender(renderer, scene, camera)
 * prism.update(t)
 * prism.setParams({ ior: 1.7, dispersion: 1.2 })
 * prism.dispose()
 *
 * Engines:
 * - `custom` — double-refract + spectral screen/env shader (Phase 7). Call beforeRender.
 * - `physical` — Three MeshPhysicalMaterial.transmission (sees opaque scene without capture).
 */
export function createPrism({
  renderer,
  preset = 'crystal',
  engine = 'custom',
  shells = null,
  maskLayer = 1,
  refractionScale = 0.5,
} = {}) {
  if (!renderer) throw new Error('createPrism requires a WebGLRenderer')

  const useCustom = engine === 'custom'
  const shellConfig = {
    outerRim: true,
    innerRim: true,
    surfaceDetail: false,
    // Additive blades are a physical-engine overlay; custom injects caustics in-shader.
    caustics: !useCustom,
    ...(shells || {}),
  }

  const textures = createPrismTexture(1024)
  const glass = useCustom
    ? createPrismMaterial({
        preset,
        map: textures.map,
        roughnessMap: textures.roughnessMap,
        normalMap: textures.normalMap,
      })
    : createPhysicalGlassMaterial(textures, preset)

  const interiorMat = createGlassInteriorRimMaterial()
  const rimMat = createPrismRimMaterial()
  ensureShellOffset(interiorMat)
  ensureShellOffset(rimMat)

  const refraction = useCustom
    ? createRefractionCapture({ scale: refractionScale })
    : null

  /** @type {THREE.Object3D | null} */
  let host = null
  /** @type {THREE.Group | null} */
  let root = null
  /** @type {THREE.Mesh | null} */
  let glassMesh = null
  /** @type {THREE.Mesh | null} */
  let interiorMesh = null
  /** @type {THREE.Mesh | null} */
  let rimMesh = null
  let caustics = null
  let thicknessHint = null
  let disposed = false
  let params = {
    presetKey: preset,
    ior: MATERIAL_PRESETS[preset]?.ior ?? 1.85,
    dispersion: MATERIAL_PRESETS[preset]?.dispersion ?? 1.55,
    thickness: MATERIAL_PRESETS[preset]?.thickness ?? 1.9,
    roughness: MATERIAL_PRESETS[preset]?.roughness ?? 0.02,
    translucency: 0.08,
    speckle: 0.3,
    caustics: 0.45,
  }

  function attach(mesh) {
    if (disposed) throw new Error('createPrism: disposed')
    if (!mesh?.isMesh) throw new Error('createPrism.attach expects a THREE.Mesh')
    detach()

    host = mesh
    mesh.geometry.computeBoundingSphere()
    mesh.geometry.computeBoundingBox()
    const radius = mesh.geometry.boundingSphere?.radius || 1
    const innerOffset = -0.008 * radius
    const outerOffset = 0.01 * radius

    // Auto thickness from bounds when caller has not overridden.
    if (params.thickness === (MATERIAL_PRESETS[preset]?.thickness ?? 1.9)) {
      params.thickness = estimateThickness(mesh.geometry)
    }

    if (!useCustom) {
      thicknessHint?.dispose?.()
      thicknessHint = createThicknessHintMap(mesh.geometry)
      glass.thicknessMap = thicknessHint
    }

    mesh.material = glass
    mesh.renderOrder = 2
    mesh.layers.enable(maskLayer)

    root = new THREE.Group()
    root.name = 'prizm-shells'
    mesh.add(root)

    if (shellConfig.innerRim) {
      interiorMesh = new THREE.Mesh(mesh.geometry, interiorMat)
      interiorMesh.name = 'prizm-inner-rim'
      interiorMat.uniforms.shellOffset.value = innerOffset
      interiorMesh.renderOrder = 3
      interiorMesh.layers.enable(maskLayer)
      root.add(interiorMesh)
    }

    if (shellConfig.outerRim) {
      rimMesh = new THREE.Mesh(mesh.geometry, rimMat)
      rimMesh.name = 'prizm-outer-rim'
      rimMat.uniforms.shellOffset.value = outerOffset
      rimMesh.renderOrder = 4
      rimMesh.layers.enable(maskLayer)
      root.add(rimMesh)
    }

    if (shellConfig.caustics) {
      caustics = createInternalCaustics()
      const s = radius / 1.2
      caustics.scale.setScalar(s)
      caustics.layers.enable(maskLayer)
      caustics.traverse((o) => o.layers.enable(maskLayer))
      root.add(caustics)
      caustics.userData.setIntensity?.(params.caustics)
    }

    glassMesh = mesh
    syncEnvironment(mesh)
    applyAll()
    return api
  }

  function syncEnvironment(mesh) {
    if (!useCustom || !glass.userData.setEnvMap) return
    let scene = mesh?.parent
    while (scene && !scene.isScene) scene = scene.parent
    if (scene?.environment) glass.userData.setEnvMap(scene.environment)
  }

  function detach() {
    if (root && host) host.remove(root)
    if (caustics?.userData.dispose) caustics.userData.dispose()
    root = null
    interiorMesh = null
    rimMesh = null
    caustics = null
    glassMesh = null
    host = null
  }

  function setParams(next = {}) {
    params = { ...params, ...next }
    if (next.preset && MATERIAL_PRESETS[next.preset]) {
      params.presetKey = next.preset
      const p = MATERIAL_PRESETS[next.preset]
      params.ior = next.ior ?? p.ior
      params.dispersion = next.dispersion ?? p.dispersion
      params.thickness = next.thickness ?? p.thickness
      params.roughness = next.roughness ?? p.roughness
    }
    applyAll()
    return api
  }

  function applyAll() {
    if (useCustom) {
      applyPrismMaterialParams(glass, params)
    } else {
      applyPhysicalParams(glass, params)
    }
    applyGlassInteriorRimParams(interiorMat, params)
    if (caustics?.userData.setIntensity) caustics.userData.setIntensity(params.caustics ?? 0)
    if (rimMat.uniforms?.intensity) {
      const bloom = params.bloom ?? 0.55
      rimMat.uniforms.intensity.value = 0.36 + bloom * 0.4 + params.dispersion * 0.065
    }
  }

  /**
   * Capture opaque scene into the refraction RT (custom engine only).
   * Hide the host (+ shells) so the crystal does not refract itself.
   * @param {THREE.Object3D[]} [extraHide] other prism hosts to exclude (multi-instance)
   */
  function beforeRender(rendererIn, scene, camera, extraHide = []) {
    if (!useCustom || !refraction || !host) return
    const size = new THREE.Vector2()
    rendererIn.getSize(size)
    const pr = rendererIn.getPixelRatio()
    refraction.setSize(size.x * pr, size.y * pr)
    glass.userData.setResolution?.(size.x * pr, size.y * pr)
    if (scene.environment) glass.userData.setEnvMap(scene.environment)
    const hide = [host, ...extraHide].filter(Boolean)
    const tex = refraction.capture(rendererIn, scene, camera, hide)
    glass.userData.setRefractionTexture(tex)
  }

  function update(elapsedTime) {
    if (disposed) return
    caustics?.userData.update?.(elapsedTime)
    if (useCustom) {
      applyPrismMaterialParams(glass, { causticsTime: elapsedTime, caustics: params.caustics })
    }
  }

  function dispose() {
    if (disposed) return
    disposed = true
    detach()
    glass.dispose()
    interiorMat.dispose()
    rimMat.dispose()
    thicknessHint?.dispose?.()
    refraction?.dispose?.()
    for (const key of ['map', 'roughnessMap', 'normalMap']) textures[key]?.dispose?.()
  }

  const api = {
    attach,
    detach,
    setParams,
    beforeRender,
    update,
    dispose,
    get engine() {
      return useCustom ? 'custom' : 'physical'
    },
    get material() {
      return glass
    },
    get params() {
      return { ...params }
    },
    get host() {
      return host
    },
  }

  return api
}

function ensureShellOffset(material) {
  if (!material.uniforms.shellOffset) {
    material.uniforms.shellOffset = { value: 0 }
  }
  if (material.userData._shellOffsetPatched) return

  material.vertexShader = material.vertexShader.replace(
    /void main\(\) \{/,
    `uniform float shellOffset;\n      void main() {`,
  )

  if (material.vertexShader.includes('modelViewMatrix * vec4(position')) {
    material.vertexShader = material.vertexShader.replace(
      'modelViewMatrix * vec4(position, 1.0)',
      'modelViewMatrix * vec4(position + normalize(normal) * shellOffset, 1.0)',
    )
  } else if (material.vertexShader.includes('modelMatrix * vec4(position')) {
    material.vertexShader = material.vertexShader.replace(
      'modelMatrix * vec4(position, 1.0)',
      'modelMatrix * vec4(position + normalize(normal) * shellOffset, 1.0)',
    )
  }

  material.needsUpdate = true
  material.userData._shellOffsetPatched = true
}

export { MATERIAL_PRESETS, estimateThickness, createThicknessHintMap }
