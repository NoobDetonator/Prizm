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
import { createBackfaceCapture } from './createBackfaceCapture.js'
import { estimateThicknessFromBounds } from './estimateThickness.js'

/**
 * Reusable prism attachment for any Mesh.
 * Zero DOM. Multiple instances are safe (all state is closed over).
 *
 * Engines:
 * - `custom` — double-refract + spectral RGB with backface exit normals. Call beforeRender.
 * - `physical` — Three MeshPhysicalMaterial.transmission.
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

  const refraction = useCustom ? createRefractionCapture({ scale: refractionScale }) : null
  const backface = useCustom ? createBackfaceCapture({ scale: refractionScale }) : null
  const viewProjection = new THREE.Matrix4()

  /** @type {THREE.Object3D | null} */
  let host = null
  /** @type {THREE.Material | THREE.Material[] | null} */
  let originalMaterial = null
  /** @type {THREE.Group | null} */
  let root = null
  /** @type {THREE.Mesh | null} */
  let interiorMesh = null
  /** @type {THREE.Mesh | null} */
  let rimMesh = null
  let caustics = null
  let disposed = false
  let thicknessOverridden = false
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
    originalMaterial = mesh.material
    mesh.userData._prizmOriginalMaterial = originalMaterial

    mesh.geometry.computeBoundingSphere()
    mesh.geometry.computeBoundingBox()
    const radius = mesh.geometry.boundingSphere?.radius || 1
    const innerOffset = -0.008 * radius
    const outerOffset = 0.01 * radius

    if (!thicknessOverridden) {
      params.thickness = estimateThicknessFromBounds(mesh.geometry)
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
    if (host) {
      if (root) host.remove(root)
      // Restore pre-attach material (C1)
      if (originalMaterial != null) {
        host.material = originalMaterial
      }
      delete host.userData._prizmOriginalMaterial
    }
    if (caustics?.userData.dispose) caustics.userData.dispose()
    root = null
    interiorMesh = null
    rimMesh = null
    caustics = null
    host = null
    originalMaterial = null
  }

  function setParams(next = {}) {
    if (next.thickness != null) thicknessOverridden = true
    params = { ...params, ...next }
    if (next.preset && MATERIAL_PRESETS[next.preset]) {
      params.presetKey = next.preset
      const p = MATERIAL_PRESETS[next.preset]
      params.ior = next.ior ?? p.ior
      params.dispersion = next.dispersion ?? p.dispersion
      if (next.thickness == null && !thicknessOverridden) params.thickness = p.thickness
      else if (next.thickness != null) params.thickness = next.thickness
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
   * Custom engine: backface normals → scene refraction plate → feed material.
   * @param {THREE.Object3D[]} [extraHide]
   */
  function beforeRender(rendererIn, scene, camera, extraHide = []) {
    if (!useCustom || !refraction || !backface || !host) return

    const size = new THREE.Vector2()
    rendererIn.getSize(size)
    const pr = rendererIn.getPixelRatio()
    const w = size.x * pr
    const h = size.y * pr

    backface.setSize(w, h)
    refraction.setSize(w, h)
    glass.userData.setResolution?.(w, h)

    camera.updateMatrixWorld()
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    glass.userData.setViewProjectionMatrix?.(viewProjection)

    if (scene.environment) glass.userData.setEnvMap(scene.environment)

    const backTex = backface.capture(rendererIn, camera, host)
    glass.userData.setBackfaceTexture?.(backTex)

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
    refraction?.dispose?.()
    backface?.dispose?.()
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

export { MATERIAL_PRESETS, estimateThicknessFromBounds }
export { estimateThicknessFromBounds as estimateThickness }
