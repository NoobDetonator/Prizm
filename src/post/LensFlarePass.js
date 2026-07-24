import {
  HalfFloatType,
  LinearFilter,
  NoBlending,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three'
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js'

/**
 * Screen-space ghost lens flare — reusable EffectComposer pass.
 * Samples bright regions and paints chromatic ghosts along the optical axis.
 */
export class LensFlarePass extends Pass {
  /**
   * @param {object} [options]
   * @param {number} [options.strength=0.45]
   * @param {number} [options.threshold=0.82]
   * @param {number} [options.ghosts=6]
   * @param {number} [options.haloWidth=0.42]
   */
  constructor({ strength = 0.45, threshold = 0.82, ghosts = 6, haloWidth = 0.42 } = {}) {
    super()

    this.strength = strength
    this.threshold = threshold
    this.ghosts = ghosts
    this.haloWidth = haloWidth
    this.enabled = true

    this._extract = makeMaterial(FRAG_EXTRACT, {
      tDiffuse: { value: null },
      tMask: { value: null },
      maskEnabled: { value: 0 },
      threshold: { value: threshold },
    })

    this._flare = makeMaterial(FRAG_FLARE, {
      tDiffuse: { value: null },
      tBright: { value: null },
      strength: { value: strength },
      ghostCount: { value: ghosts },
      haloWidth: { value: haloWidth },
      resolution: { value: new Vector2(1, 1) },
    })

    this._fsQuad = new FullScreenQuad(null)
    this._bright = null
    this.setSize(1, 1)
  }

  setStrength(value) {
    this.strength = value
    this._flare.uniforms.strength.value = value
  }

  setThreshold(value) {
    this.threshold = value
    this._extract.uniforms.threshold.value = value
  }

  setGhosts(value) {
    this.ghosts = value
    this._flare.uniforms.ghostCount.value = value
  }

  setHaloWidth(value) {
    this.haloWidth = value
    this._flare.uniforms.haloWidth.value = value
  }

  setMaskTexture(texture) {
    this._extract.uniforms.tMask.value = texture
    this._extract.uniforms.maskEnabled.value = texture ? 1 : 0
  }

  setSize(width, height) {
    this._bright?.dispose()
    const w = Math.max(1, Math.floor(width / 4))
    const h = Math.max(1, Math.floor(height / 4))
    this._bright = makeTarget(w, h)
    this._flare.uniforms.resolution.value.set(width, height)
  }

  render(renderer, writeBuffer, readBuffer) {
    if (!this.enabled || this.strength <= 0.001) {
      this._blit(renderer, writeBuffer, readBuffer)
      return
    }

    const prevAutoClear = renderer.autoClear
    renderer.autoClear = false

    this._extract.uniforms.tDiffuse.value = readBuffer.texture
    this._fsQuad.material = this._extract
    renderer.setRenderTarget(this._bright)
    renderer.clear()
    this._fsQuad.render(renderer)

    this._flare.uniforms.tDiffuse.value = readBuffer.texture
    this._flare.uniforms.tBright.value = this._bright.texture
    this._flare.uniforms.strength.value = this.strength

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }

    this._fsQuad.material = this._flare
    this._fsQuad.render(renderer)
    renderer.autoClear = prevAutoClear
  }

  _blit(renderer, writeBuffer, readBuffer) {
    this._flare.uniforms.tDiffuse.value = readBuffer.texture
    this._flare.uniforms.tBright.value = readBuffer.texture
    this._flare.uniforms.strength.value = 0
    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }
    this._fsQuad.material = this._flare
    this._fsQuad.render(renderer)
    this._flare.uniforms.strength.value = this.strength
  }

  dispose() {
    this._bright?.dispose()
    this._extract.dispose()
    this._flare.dispose()
    this._fsQuad.dispose()
  }
}

function makeTarget(width, height) {
  const rt = new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    minFilter: LinearFilter,
    magFilter: LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
  rt.texture.generateMipmaps = false
  return rt
}

function makeMaterial(fragmentShader, uniforms) {
  return new ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader,
    blending: NoBlending,
    depthTest: false,
    depthWrite: false,
  })
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG_EXTRACT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tMask;
  uniform float maskEnabled;
  uniform float threshold;
  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    float b = luma(color);
    float brightMask = smoothstep(threshold, threshold + 0.35, b);
    float objectMask = mix(1.0, texture2D(tMask, vUv).r, maskEnabled);
    float mask = brightMask * objectMask;
    gl_FragColor = vec4(color * mask, mask);
  }
`

const FRAG_FLARE = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tBright;
  uniform float strength;
  uniform float ghostCount;
  uniform float haloWidth;
  uniform vec2 resolution;
  varying vec2 vUv;

  vec3 ghostTint(float t) {
    return mix(vec3(0.35, 0.75, 1.35), vec3(1.35, 0.55, 0.28), t);
  }

  void main() {
    vec3 src = texture2D(tDiffuse, vUv).rgb;
    if (strength < 0.001) {
      gl_FragColor = vec4(src, 1.0);
      return;
    }

    vec2 center = vec2(0.5);
    vec2 toCenter = center - vUv;
    vec3 flare = vec3(0.0);

    float ghosts = max(ghostCount, 1.0);
    for (int i = 0; i < 8; i++) {
      if (float(i) >= ghosts) break;
      float t = (float(i) + 1.0) / (ghosts + 1.0);
      vec2 sampleUv = fract(vUv + toCenter * t * 2.0);
      vec4 bright = texture2D(tBright, sampleUv);
      float falloff = 1.0 - smoothstep(0.0, 0.72, length(sampleUv - center));
      flare += bright.rgb * ghostTint(t) * bright.a * falloff * (1.0 - t * 0.55);
    }

    // Halo ring
    float dist = length(vUv - center);
    float halo = max(0.0, 1.0 - abs(dist - haloWidth) / 0.08);
    vec2 haloUv = fract(center + normalize(vUv - center + 1e-5) * haloWidth);
    vec4 haloSample = texture2D(tBright, haloUv);
    flare += haloSample.rgb * vec3(0.55, 0.9, 1.4) * halo * haloSample.a * 0.85;

    // Soft central bloom sparkle from brightest texel neighborhood
    vec4 core = texture2D(tBright, vUv);
    flare += core.rgb * core.a * 0.35;

    flare *= strength;
    flare = flare / (vec3(1.0) + flare);
    gl_FragColor = vec4(src + flare, 1.0);
  }
`
