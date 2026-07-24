import {
  Color,
  LinearFilter,
  MeshBasicMaterial,
  WebGLRenderTarget,
} from 'three'

/**
 * Renders an opaque coverage mask of selected roots (e.g. the prism group).
 * MSAA + linear filtering give real intermediate edge values for soft composite.
 * Optionally half-res (default) — mask is a soft signal.
 */
export function createCubeMaskRenderer({ halfRes = true, samples = 4 } = {}) {
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
  const hidden = []
  let scale = halfRes ? 0.5 : 1

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
    get texture() {
      return maskTarget.texture
    },
    renderMask,
    setSize,
    dispose,
  }
}
