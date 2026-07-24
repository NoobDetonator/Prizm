import {
  Color,
  LinearFilter,
  MeshBasicMaterial,
  WebGLRenderTarget,
} from 'three'

/**
 * Coverage mask for selective post / optical extract.
 * Renders only objects on `maskLayer` (default 1) — no per-frame visibility toggles.
 * Half-res + MSAA + linear filtering for soft silhouette edges.
 */
export function createCubeMaskRenderer({
  halfRes = true,
  samples = 4,
  maskLayer = 1,
} = {}) {
  const maskMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    toneMapped: false,
  })

  const maskTarget = new WebGLRenderTarget(1, 1, {
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
    samples: Math.min(samples, 4),
  })
  maskTarget.texture.name = 'CubeMask'

  const clearColor = new Color()
  const scale = halfRes ? 0.5 : 1
  let savedLayerMask = 0

  /**
   * @param {import('three').WebGLRenderer} renderer
   * @param {import('three').Scene} scene
   * @param {import('three').Camera} camera
   */
  function renderMask(renderer, scene, camera) {
    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    renderer.getClearColor(clearColor)
    const previousClearAlpha = renderer.getClearAlpha()
    const previousAutoClear = renderer.autoClear

    savedLayerMask = camera.layers.mask
    camera.layers.set(maskLayer)

    scene.overrideMaterial = maskMaterial
    scene.background = null

    renderer.autoClear = true
    renderer.setClearColor(0x000000, 1)
    renderer.setRenderTarget(maskTarget)
    renderer.clear()
    renderer.render(scene, camera)

    camera.layers.mask = savedLayerMask
    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setClearColor(clearColor, previousClearAlpha)
    renderer.autoClear = previousAutoClear
    renderer.setRenderTarget(null)
  }

  function setSize(width, height) {
    const w = Math.max(1, Math.floor(width * scale))
    const h = Math.max(1, Math.floor(height * scale))
    maskTarget.setSize(w, h)
  }

  function dispose() {
    maskMaterial.dispose()
    maskTarget.dispose()
  }

  return {
    maskTarget,
    maskLayer,
    get texture() {
      return maskTarget.texture
    },
    renderMask,
    setSize,
    dispose,
  }
}
