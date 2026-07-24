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
 * Dual Kawase bloom — smooth halos at compositor resolution.
 * Replaces UnrealBloomPass (blocky mip pyramid).
 */
export class QualityBloomPass extends Pass {
  /**
   * @param {number} [strength=0.55]
   * @param {number} [radius=0.85]
   * @param {number} [threshold=0.7]
   */
  constructor(strength = 0.55, radius = 0.85, threshold = 0.7) {
    super()

    this.strength = strength
    this.radius = radius
    this.threshold = threshold
    this.softKnee = 0.5
    this.levels = 6

    /** @type {WebGLRenderTarget[]} */
    this.downSamples = []
    /** @type {WebGLRenderTarget[]} */
    this.upSamples = []

    this.brightMaterial = makeMaterial(FRAG_BRIGHT, {
      tDiffuse: { value: null },
      tMask: { value: null },
      maskEnabled: { value: 0 },
      threshold: { value: threshold },
      softKnee: { value: this.softKnee },
    })

    this.downMaterial = makeMaterial(FRAG_KAWASE_DOWN, {
      tDiffuse: { value: null },
      texelSize: { value: new Vector2() },
      offset: { value: 1 },
    })

    this.upMaterial = makeMaterial(FRAG_KAWASE_UP, {
      tDiffuse: { value: null },
      tAdd: { value: null },
      texelSize: { value: new Vector2() },
      offset: { value: 1 },
      addMix: { value: 1 },
    })

    this.compositeMaterial = makeMaterial(FRAG_COMPOSITE, {
      tDiffuse: { value: null },
      tBloom: { value: null },
      strength: { value: strength },
      bloomTexel: { value: new Vector2(1, 1) },
    })

    this.fsQuad = new FullScreenQuad(null)
    this.setRadius(radius)
    this.setSize(1, 1)
  }

  setStrength(value) {
    this.strength = value
    this.compositeMaterial.uniforms.strength.value = value
  }

  setThreshold(value) {
    this.threshold = value
    this.brightMaterial.uniforms.threshold.value = value
  }

  setRadius(value) {
    this.radius = value
    const offset = 0.6 + value * 1.4
    this.downMaterial.uniforms.offset.value = offset
    this.upMaterial.uniforms.offset.value = offset
  }

  /** Limit bright extract to the cube mask; bloom still composites full-frame. */
  setMaskTexture(texture) {
    this.brightMaterial.uniforms.tMask.value = texture
    this.brightMaterial.uniforms.maskEnabled.value = texture ? 1 : 0
  }

  setSize(width, height) {
    this._disposeTargets()

    let w = Math.max(1, Math.floor(width))
    let h = Math.max(1, Math.floor(height))

    for (let i = 0; i < this.levels; i++) {
      this.downSamples.push(makeTarget(w, h))
      this.upSamples.push(makeTarget(w, h))
      w = Math.max(1, Math.floor(w * 0.5))
      h = Math.max(1, Math.floor(h * 0.5))
    }
  }

  render(renderer, writeBuffer, readBuffer) {
    const prevAutoClear = renderer.autoClear
    renderer.autoClear = false

    const { downSamples: down, upSamples: up, levels } = this

    // 1. Soft-knee bright extract @ full res
    this.brightMaterial.uniforms.tDiffuse.value = readBuffer.texture
    this.brightMaterial.uniforms.threshold.value = this.threshold
    this.brightMaterial.uniforms.softKnee.value = this.softKnee
    this._draw(renderer, this.brightMaterial, down[0])

    // 2. Kawase downsample pyramid
    for (let i = 0; i < levels - 1; i++) {
      this.downMaterial.uniforms.tDiffuse.value = down[i].texture
      this.downMaterial.uniforms.texelSize.value.set(1 / down[i].width, 1 / down[i].height)
      this._draw(renderer, this.downMaterial, down[i + 1])
    }

    // 3. Kawase upsample, accumulating into each larger level
    //    Start from the smallest mip; each step blends with the matching downsample.
    let current = down[levels - 1]
    for (let i = levels - 2; i >= 0; i--) {
      this.upMaterial.uniforms.tDiffuse.value = current.texture
      this.upMaterial.uniforms.tAdd.value = down[i].texture
      this.upMaterial.uniforms.addMix.value = 1
      this.upMaterial.uniforms.texelSize.value.set(1 / current.width, 1 / current.height)
      this._draw(renderer, this.upMaterial, up[i])
      current = up[i]
    }

    // 4. Composite onto the scene color
    this.compositeMaterial.uniforms.tDiffuse.value = readBuffer.texture
    this.compositeMaterial.uniforms.tBloom.value = current.texture
    this.compositeMaterial.uniforms.strength.value = this.strength
    this.compositeMaterial.uniforms.bloomTexel.value.set(1 / current.width, 1 / current.height)

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }

    this.fsQuad.material = this.compositeMaterial
    this.fsQuad.render(renderer)
    renderer.autoClear = prevAutoClear
  }

  dispose() {
    this._disposeTargets()
    this.brightMaterial.dispose()
    this.downMaterial.dispose()
    this.upMaterial.dispose()
    this.compositeMaterial.dispose()
    this.fsQuad.dispose()
  }

  _draw(renderer, material, target) {
    this.fsQuad.material = material
    renderer.setRenderTarget(target)
    renderer.clear()
    this.fsQuad.render(renderer)
  }

  _disposeTargets() {
    for (const rt of this.downSamples) rt.dispose()
    for (const rt of this.upSamples) rt.dispose()
    this.downSamples = []
    this.upSamples = []
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

const FRAG_BRIGHT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tMask;
  uniform float maskEnabled;
  uniform float threshold;
  uniform float softKnee;
  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec3 color = texture2D(tDiffuse, vUv).rgb;
    float brightness = luma(color);
    float knee = max(threshold * softKnee, 1e-4);
    float soft = clamp(brightness - threshold + knee, 0.0, 2.0 * knee);
    soft = (soft * soft) / (4.0 * knee);
    float contribution = max(soft, brightness - threshold) / max(brightness, 1e-4);
    float mask = mix(1.0, texture2D(tMask, vUv).r, maskEnabled);
    gl_FragColor = vec4(color * contribution * mask, 1.0);
  }
`

const FRAG_KAWASE_DOWN = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 texelSize;
  uniform float offset;
  varying vec2 vUv;

  void main() {
    vec2 o = texelSize * offset;
    vec3 c = texture2D(tDiffuse, vUv).rgb * 4.0;
    c += texture2D(tDiffuse, vUv + vec2(-o.x, -o.y)).rgb;
    c += texture2D(tDiffuse, vUv + vec2( o.x, -o.y)).rgb;
    c += texture2D(tDiffuse, vUv + vec2(-o.x,  o.y)).rgb;
    c += texture2D(tDiffuse, vUv + vec2( o.x,  o.y)).rgb;
    gl_FragColor = vec4(c * 0.125, 1.0);
  }
`

const FRAG_KAWASE_UP = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tAdd;
  uniform vec2 texelSize;
  uniform float offset;
  uniform float addMix;
  varying vec2 vUv;

  void main() {
    vec2 o = texelSize * offset;

    // Classic Dual Filter upsample — diamond pattern, very smooth
    vec3 sum =
        texture2D(tDiffuse, vUv + vec2(-o.x, 0.0)).rgb
      + texture2D(tDiffuse, vUv + vec2( o.x, 0.0)).rgb
      + texture2D(tDiffuse, vUv + vec2(0.0, -o.y)).rgb
      + texture2D(tDiffuse, vUv + vec2(0.0,  o.y)).rgb;

    sum +=
        texture2D(tDiffuse, vUv + vec2(-o.x, -o.y)).rgb * 2.0
      + texture2D(tDiffuse, vUv + vec2( o.x, -o.y)).rgb * 2.0
      + texture2D(tDiffuse, vUv + vec2( o.x,  o.y)).rgb * 2.0
      + texture2D(tDiffuse, vUv + vec2(-o.x,  o.y)).rgb * 2.0;

    vec3 c = sum / 12.0;
    vec3 hi = texture2D(tAdd, vUv).rgb;
    gl_FragColor = vec4(c + hi * addMix, 1.0);
  }
`

const FRAG_COMPOSITE = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tBloom;
  uniform float strength;
  uniform vec2 bloomTexel;
  varying vec2 vUv;

  void main() {
    vec4 src4 = texture2D(tDiffuse, vUv);
    vec3 src = src4.rgb;
    vec2 t = bloomTexel;
    vec3 bloom =
        texture2D(tBloom, vUv).rgb * 0.36
      + texture2D(tBloom, vUv + vec2( t.x, 0.0)).rgb * 0.16
      + texture2D(tBloom, vUv - vec2( t.x, 0.0)).rgb * 0.16
      + texture2D(tBloom, vUv + vec2(0.0,  t.y)).rgb * 0.16
      + texture2D(tBloom, vUv - vec2(0.0,  t.y)).rgb * 0.16;

    vec3 glow = max(bloom, vec3(0.0)) * strength;
    glow = glow / (vec3(1.0) + glow * 0.5);
    float glowA = max(glow.r, max(glow.g, glow.b));
    gl_FragColor = vec4(src + glow, max(src4.a, smoothstep(0.02, 0.35, glowA)));
  }
`
