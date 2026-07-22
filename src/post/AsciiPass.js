import {
  CanvasTexture,
  LinearFilter,
  NearestFilter,
  NoBlending,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
} from 'three'
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js'

/**
 * Real-time ASCII overlay pass — reusable on any EffectComposer stack.
 * Builds a glyph atlas once and maps scene luminance to characters.
 */
export class AsciiPass extends Pass {
  /**
   * @param {object} [options]
   * @param {number} [options.amount=0] 0 = off, 1 = full ASCII
   * @param {number} [options.cellSize=10] pixel cell size
   * @param {boolean} [options.colorize=true] tint glyphs with scene color
   * @param {string} [options.charset] denser = brighter
   */
  constructor({
    amount = 0,
    cellSize = 10,
    colorize = true,
    charset = ' .\'`^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  } = {}) {
    super()

    this.amount = amount
    this.cellSize = cellSize
    this.colorize = colorize
    this.enabled = true

    this._atlas = createGlyphAtlas(charset)
    this._material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tAtlas: { value: this._atlas.texture },
        resolution: { value: new Vector2(1, 1) },
        cellSize: { value: cellSize },
        glyphCount: { value: this._atlas.count },
        amount: { value: amount },
        colorize: { value: colorize ? 1 : 0 },
        invert: { value: 0 },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      blending: NoBlending,
      depthTest: false,
      depthWrite: false,
    })

    this._fsQuad = new FullScreenQuad(this._material)
  }

  setAmount(value) {
    this.amount = value
    this._material.uniforms.amount.value = value
  }

  setCellSize(value) {
    this.cellSize = value
    this._material.uniforms.cellSize.value = value
  }

  setColorize(enabled) {
    this.colorize = enabled
    this._material.uniforms.colorize.value = enabled ? 1 : 0
  }

  setSize(width, height) {
    this._material.uniforms.resolution.value.set(width, height)
  }

  render(renderer, writeBuffer, readBuffer) {
    this._material.uniforms.tDiffuse.value = readBuffer.texture

    if (!this.enabled || this.amount <= 0.001) {
      // Passthrough via amount=0 still samples correctly
      this._material.uniforms.amount.value = 0
    } else {
      this._material.uniforms.amount.value = this.amount
    }

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }

    this._fsQuad.render(renderer)
    this._material.uniforms.amount.value = this.amount
  }

  dispose() {
    this._atlas.texture.dispose()
    this._material.dispose()
    this._fsQuad.dispose()
  }
}

function createGlyphAtlas(charset) {
  const chars = Array.from(charset)
  const cell = 64
  const canvas = document.createElement('canvas')
  canvas.width = cell * chars.length
  canvas.height = cell
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `bold ${Math.floor(cell * 0.78)}px "Courier New", ui-monospace, monospace`

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], (i + 0.5) * cell, cell * 0.55)
  }

  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = NearestFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true

  return { texture, count: chars.length, canvas }
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
  uniform sampler2D tAtlas;
  uniform vec2 resolution;
  uniform float cellSize;
  uniform float glyphCount;
  uniform float amount;
  uniform float colorize;
  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  void main() {
    vec3 src = texture2D(tDiffuse, vUv).rgb;

    if (amount < 0.001) {
      gl_FragColor = vec4(src, 1.0);
      return;
    }

    float cell = max(cellSize, 2.0);
    vec2 pixel = vUv * resolution;
    vec2 cellCoord = floor(pixel / cell);
    vec2 cellUv = (cellCoord + 0.5) * cell / resolution;

    vec3 sampleColor = texture2D(tDiffuse, cellUv).rgb;
    float brightness = clamp(luma(sampleColor), 0.0, 1.0);

    float glyphIndex = floor(brightness * (glyphCount - 1.0) + 0.5);
    vec2 local = fract(pixel / cell);
    // Flip Y so glyphs read upright
    local.y = 1.0 - local.y;

    float atlasU = (glyphIndex + local.x) / glyphCount;
    float atlasV = local.y;
    float glyph = texture2D(tAtlas, vec2(atlasU, atlasV)).r;

    vec3 asciiColor = colorize > 0.5
      ? sampleColor * (0.35 + glyph * 1.35)
      : vec3(glyph);

    // Slight cell grid breathing for a terminal feel
    float grid = smoothstep(0.02, 0.08, min(min(local.x, local.y), min(1.0 - local.x, 1.0 - local.y)));
    asciiColor *= 0.82 + grid * 0.18;

    vec3 color = mix(src, asciiColor, amount);
    gl_FragColor = vec4(color, 1.0);
  }
`
