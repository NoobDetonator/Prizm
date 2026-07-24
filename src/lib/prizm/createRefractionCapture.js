import * as THREE from 'three'

/**
 * Capture the scene without prism meshes into a RT for screen-space refraction.
 */
export function createRefractionCapture({
  scale = 0.5,
  type = THREE.HalfFloatType,
} = {}) {
  const rt = new THREE.WebGLRenderTarget(4, 4, {
    type,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  })
  rt.texture.generateMipmaps = false

  let width = 4
  let height = 4

  function setSize(w, h) {
    width = Math.max(2, Math.round(w * scale))
    height = Math.max(2, Math.round(h * scale))
    rt.setSize(width, height)
  }

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {THREE.Object3D[]} hideObjects objects to hide during capture (the prism)
   */
  function capture(renderer, scene, camera, hideObjects = []) {
    const visibility = hideObjects.map((o) => {
      const prev = o.visible
      o.visible = false
      return prev
    })

    const prevTarget = renderer.getRenderTarget()
    const prevAutoClear = renderer.autoClear
    renderer.autoClear = true
    renderer.setRenderTarget(rt)
    renderer.clear()
    renderer.render(scene, camera)
    renderer.setRenderTarget(prevTarget)
    renderer.autoClear = prevAutoClear

    hideObjects.forEach((o, i) => {
      o.visible = visibility[i]
    })

    return rt.texture
  }

  function dispose() {
    rt.dispose()
  }

  return {
    get texture() {
      return rt.texture
    },
    setSize,
    capture,
    dispose,
  }
}
