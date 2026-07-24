import {
  NoBlending,
  ShaderMaterial,
} from 'three'
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js'

/**
 * Mixes a clean beauty buffer with a fully stylized buffer using a cube mask.
 * Background (mask≈0) stays untouched; prism pixels get the post stack.
 * Soft edge avoids hard cutouts around the glass silhouette.
 */
export class SelectiveCubeCompositePass extends Pass {
  /**
   * @param {import('three').Texture} cleanTexture
   * @param {import('three').Texture} maskTexture
   */
  constructor(cleanTexture, maskTexture) {
    super()

    this.material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tClean: { value: cleanTexture },
        tMask: { value: maskTexture },
        edgeSoftness: { value: 0.22 },
        enabled: { value: 1 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })

    this._fsQuad = new FullScreenQuad(this.material)
  }

  setCleanTexture(texture) {
    this.material.uniforms.tClean.value = texture
  }

  setMaskTexture(texture) {
    this.material.uniforms.tMask.value = texture
  }

  setEdgeSoftness(value) {
    this.material.uniforms.edgeSoftness.value = value
  }

  setSelective(enabled) {
    this.material.uniforms.enabled.value = enabled ? 1 : 0
  }

  render(renderer, writeBuffer, readBuffer) {
    this.material.uniforms.tDiffuse.value = readBuffer.texture

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }

    this._fsQuad.render(renderer)
  }

  dispose() {
    this.material.dispose()
    this._fsQuad.dispose()
  }
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tClean;
  uniform sampler2D tMask;
  uniform float edgeSoftness;
  uniform float enabled;
  varying vec2 vUv;

  void main() {
    vec4 stylized = texture2D(tDiffuse, vUv);
    vec4 clean = texture2D(tClean, vUv);

    if (enabled < 0.5) {
      gl_FragColor = stylized;
      return;
    }

    float mask = texture2D(tMask, vUv).r;
    // Soft AA on the prism silhouette so glass edges don't stair-step
    float soft = max(edgeSoftness, 0.001);
    float m = smoothstep(0.08, 0.08 + soft, mask);

    // Preserve clean alpha outside the cube (transparent void looks).
    gl_FragColor = mix(clean, vec4(stylized.rgb, max(stylized.a, m)), m);
  }
`
