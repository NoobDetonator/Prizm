import * as THREE from 'three'
import { createRefractionCapture } from './createRefractionCapture.js'

/**
 * Shared refraction plate for multiple createPrism instances.
 * One scene capture per frame; each prism still owns its own backface normal RT
 * (exit normals are mesh-specific).
 *
 * @example
 * const stage = createPrismStage({ renderer })
 * const a = createPrism({ renderer, engine: 'custom', stage })
 * const b = createPrism({ renderer, engine: 'custom', stage })
 * // frame:
 * stage.beforeRender(renderer, scene, camera)
 * a.update(t); b.update(t)
 * renderer.render(scene, camera)
 */
export function createPrismStage({ renderer, refractionScale = 0.5 } = {}) {
  if (!renderer) throw new Error('createPrismStage requires a WebGLRenderer')

  const refraction = createRefractionCapture({ scale: refractionScale })
  /** @type {Set<object>} */
  const members = new Set()
  const viewProjection = new THREE.Matrix4()
  const size = new THREE.Vector2()

  function register(prismApi) {
    members.add(prismApi)
    return () => members.delete(prismApi)
  }

  function beforeRender(rendererIn, scene, camera) {
    rendererIn.getSize(size)
    const pr = rendererIn.getPixelRatio()
    const w = Math.max(1, Math.floor(size.x * pr))
    const h = Math.max(1, Math.floor(size.y * pr))
    refraction.setSize(w, h)

    camera.updateMatrixWorld()
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)

    const hosts = []
    for (const prism of members) {
      if (prism.host) hosts.push(prism.host)
      prism._stagePrepare?.(w, h, viewProjection, scene)
    }

    // Single shared scene capture with all prism hosts hidden.
    const plate = refraction.capture(rendererIn, scene, camera, hosts)

    for (const prism of members) {
      prism._stageApplyPlate?.(plate, rendererIn, camera)
    }
  }

  function dispose() {
    members.clear()
    refraction.dispose()
  }

  return {
    register,
    beforeRender,
    dispose,
    get refraction() {
      return refraction
    },
  }
}
