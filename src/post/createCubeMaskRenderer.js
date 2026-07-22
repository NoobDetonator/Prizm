import {
  Color,
  MeshBasicMaterial,
  NearestFilter,
  WebGLRenderTarget,
} from 'three'

/**
 * Renders an opaque coverage mask of selected roots (e.g. the prism group).
 * Reusable for selective post stacks on any object subset.
 */
export function createCubeMaskRenderer() {
  const maskMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
  })

  const maskTarget = new WebGLRenderTarget(1, 1, {
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: true,
    stencilBuffer: false,
  })
  maskTarget.texture.name = 'CubeMask'

  const clearColor = new Color()
  const hidden = []

  /**
   * @param {import('three').WebGLRenderer} renderer
   * @param {import('three').Scene} scene
   * @param {import('three').Camera} camera
   * @param {import('three').Object3D[]} hideObjects objects to hide while masking (backdrop, etc.)
   */
  function renderMask(renderer, scene, camera, hideObjects = []) {
    hidden.length = 0
    for (const object of hideObjects) {
      if (!object) continue
      hidden.push([object, object.visible])
      object.visible = false
    }

    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    renderer.getClearColor(clearColor)
    const previousClearAlpha = renderer.getClearAlpha()
    const previousAutoClear = renderer.autoClear

    scene.overrideMaterial = maskMaterial
    scene.background = null

    renderer.autoClear = true
    renderer.setClearColor(0x000000, 1)
    renderer.setRenderTarget(maskTarget)
    renderer.clear()
    renderer.render(scene, camera)

    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setClearColor(clearColor, previousClearAlpha)
    renderer.autoClear = previousAutoClear
    renderer.setRenderTarget(null)

    for (const [object, visible] of hidden) object.visible = visible
  }

  function setSize(width, height) {
    maskTarget.setSize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)))
  }

  function dispose() {
    maskMaterial.dispose()
    maskTarget.dispose()
  }

  return {
    maskTarget,
    get texture() {
      return maskTarget.texture
    },
    renderMask,
    setSize,
    dispose,
  }
}
