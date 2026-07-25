import * as THREE from 'three'

const BACKFACE_LAYER = 7

/**
 * Capture farthest backface world-normals (+ view depth in A) for exit refraction.
 * Convex meshes: exit face along the view ray. Used by the custom prism engine.
 */
export function createBackfaceCapture({ scale = 0.5 } = {}) {
  const rt = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  })
  rt.texture.generateMipmaps = false

  const material = new THREE.ShaderMaterial({
    name: 'PrizmBackfaceNormal',
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: true,
    // Farthest backface: clear depth to 0, pass when fragment is farther.
    depthFunc: THREE.GreaterDepth,
    uniforms: {},
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying float vViewDepth;

      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        // Geometric normal (BackSide still provides outward mesh normals).
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 view = viewMatrix * world;
        vViewDepth = -view.z;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying float vViewDepth;

      void main() {
        // Pack world normal to 0..1; A stores positive view-space depth.
        gl_FragColor = vec4(normalize(vWorldNormal) * 0.5 + 0.5, vViewDepth);
      }
    `,
  })

  const scene = new THREE.Scene()
  /** @type {THREE.Mesh | null} */
  let proxy = null

  function setSize(w, h) {
    const width = Math.max(2, Math.round(w * scale))
    const height = Math.max(2, Math.round(h * scale))
    rt.setSize(width, height)
  }

  /**
   * Render only `mesh` backfaces into the RT (dedicated layer — no scene.overrideMaterial).
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Camera} camera
   * @param {THREE.Mesh} mesh
   */
  function capture(renderer, camera, mesh) {
    if (!mesh?.isMesh) return rt.texture

    if (!proxy || proxy.geometry !== mesh.geometry) {
      if (proxy) scene.remove(proxy)
      proxy = new THREE.Mesh(mesh.geometry, material)
      proxy.frustumCulled = false
      proxy.layers.set(BACKFACE_LAYER)
      scene.add(proxy)
    } else {
      proxy.geometry = mesh.geometry
    }

    mesh.updateWorldMatrix(true, false)
    proxy.matrixAutoUpdate = false
    proxy.matrixWorld.copy(mesh.matrixWorld)

    const prevTarget = renderer.getRenderTarget()
    const prevAutoClear = renderer.autoClear
    const prevLayers = camera.layers.mask
    const prevClearColor = new THREE.Color()
    const prevClearAlpha = renderer.getClearAlpha()
    renderer.getClearColor(prevClearColor)

    camera.layers.set(BACKFACE_LAYER)
    renderer.autoClear = false
    renderer.setRenderTarget(rt)
    // GreaterDepth: seed depth at 0 so farther fragments win.
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)

    renderer.setRenderTarget(prevTarget)
    renderer.autoClear = prevAutoClear
    camera.layers.mask = prevLayers
    renderer.setClearColor(prevClearColor, prevClearAlpha)

    return rt.texture
  }

  function dispose() {
    if (proxy) scene.remove(proxy)
    proxy = null
    material.dispose()
    rt.dispose()
  }

  return {
    get texture() {
      return rt.texture
    },
    get layer() {
      return BACKFACE_LAYER
    },
    setSize,
    capture,
    dispose,
  }
}
