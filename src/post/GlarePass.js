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
 * Anamorphic glare / streak pass — reusable on any EffectComposer stack.
 * Extracts highlights and smears them along a configurable axis + cross axis.
 */
export class GlarePass extends Pass {
  /**
   * @param {object} [options]
   * @param {number} [options.strength=0.55]
   * @param {number} [options.threshold=0.72]
   * @param {number} [options.stretch=1.4]
   * @param {number} [options.angle=0] radians — 0 = horizontal anamorphic
   */
  constructor({ strength = 0.55, threshold = 0.72, stretch = 1.4, angle = 0 } = {}) {
    super()

    this.strength = strength
    this.threshold = threshold
    this.stretch = stretch
    this.angle = angle
    this.enabled = true

    this._extract = makeMaterial(FRAG_EXTRACT, {
      tDiffuse: { value: null },
      tMask: { value: null },
      maskEnabled: { value: 0 },
      threshold: { value: threshold },
      softKnee: { value: 0.45 },
    })

    this._blur = makeMaterial(FRAG_STREAK, {
      tDiffuse: { value: null },
      texelSize: { value: new Vector2(1, 1) },
      direction: { value: new Vector2(1, 0) },
      stretch: { value: stretch },
    })

    this._composite = makeMaterial(FRAG_COMPOSITE, {
      tDiffuse: { value: null },
      tGlareA: { value: null },
      tGlareB: { value: null },
      strength: { value: strength },
    })

    this._fsQuad = new FullScreenQuad(null)
    this._bright = null
    this._streakA = null
    this._streakB = null
    this.setSize(1, 1)
  }

  setStrength(value) {
    this.strength = value
    this._composite.uniforms.strength.value = value
  }

  setThreshold(value) {
    this.threshold = value
    this._extract.uniforms.threshold.value = value
  }

  setStretch(value) {
    this.stretch = value
    this._blur.uniforms.stretch.value = value
  }

  setAngle(radians) {
    this.angle = radians
  }

  setMaskTexture(texture) {
    this._extract.uniforms.tMask.value = texture
    this._extract.uniforms.maskEnabled.value = texture ? 1 : 0
  }

  setSize(width, height) {
    this._disposeTargets()
    const w = Math.max(1, Math.floor(width * 0.5))
    const h = Math.max(1, Math.floor(height * 0.5))
    this._bright = makeTarget(w, h)
    this._streakA = makeTarget(w, h)
    this._streakB = makeTarget(w, h)
    this._blur.uniforms.texelSize.value.set(1 / w, 1 / h)
  }

  render(renderer, writeBuffer, readBuffer) {
    if (!this.enabled || this.strength <= 0.001) {
      this._blit(renderer, writeBuffer, readBuffer)
      return
    }

    const prevAutoClear = renderer.autoClear
    renderer.autoClear = false

    this._extract.uniforms.tDiffuse.value = readBuffer.texture
    this._draw(renderer, this._extract, this._bright)

    const cos = Math.cos(this.angle)
    const sin = Math.sin(this.angle)

    this._blur.uniforms.tDiffuse.value = this._bright.texture
    this._blur.uniforms.direction.value.set(cos, sin)
    this._blur.uniforms.stretch.value = this.stretch
    this._draw(renderer, this._blur, this._streakA)

    this._blur.uniforms.direction.value.set(-sin, cos)
    this._blur.uniforms.stretch.value = this.stretch * 0.38
    this._draw(renderer, this._blur, this._streakB)
    this._blur.uniforms.stretch.value = this.stretch

    this._composite.uniforms.tDiffuse.value = readBuffer.texture
    this._composite.uniforms.tGlareA.value = this._streakA.texture
    this._composite.uniforms.tGlareB.value = this._streakB.texture
    this._composite.uniforms.strength.value = this.strength

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }

    this._fsQuad.material = this._composite
    this._fsQuad.render(renderer)
    renderer.autoClear = prevAutoClear
  }

  _blit(renderer, writeBuffer, readBuffer) {
    this._composite.uniforms.tDiffuse.value = readBuffer.texture
    this._composite.uniforms.tGlareA.value = readBuffer.texture
    this._composite.uniforms.tGlareB.value = readBuffer.texture
    this._composite.uniforms.strength.value = 0
    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }
    this._fsQuad.material = this._composite
    this._fsQuad.render(renderer)
    this._composite.uniforms.strength.value = this.strength
  }

  _draw(renderer, material, target) {
    this._fsQuad.material = material
    renderer.setRenderTarget(target)
    renderer.clear()
    this._fsQuad.render(renderer)
  }

  dispose() {
    this._disposeTargets()
    this._extract.dispose()
    this._blur.dispose()
    this._composite.dispose()
    this._fsQuad.dispose()
  }

  _disposeTargets() {
    this._bright?.dispose()
    this._streakA?.dispose()
    this._streakB?.dispose()
    this._bright = this._streakA = this._streakB = null
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

const FRAG_STREAK = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 texelSize;
  uniform vec2 direction;
  uniform float stretch;
  varying vec2 vUv;

  void main() {
    vec2 dir = normalize(direction) * texelSize * stretch;
    vec3 sum = vec3(0.0);
    float weightSum = 0.0;

    for (int i = -8; i <= 8; i++) {
      float t = float(i);
      float w = exp(-0.085 * t * t);
      sum += texture2D(tDiffuse, vUv + dir * t).rgb * w;
      weightSum += w;
    }

    vec3 color = sum / max(weightSum, 1e-4);
    color.r *= 1.08;
    color.b *= 1.12;
    gl_FragColor = vec4(color, 1.0);
  }
`

const FRAG_COMPOSITE = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform sampler2D tGlareA;
  uniform sampler2D tGlareB;
  uniform float strength;
  varying vec2 vUv;

  void main() {
    vec3 src = texture2D(tDiffuse, vUv).rgb;
    vec3 glare = texture2D(tGlareA, vUv).rgb + texture2D(tGlareB, vUv).rgb * 0.45;
    glare *= strength;
    glare = glare / (vec3(1.0) + glare * 0.65);
    gl_FragColor = vec4(src + glare, 1.0);
  }
`
