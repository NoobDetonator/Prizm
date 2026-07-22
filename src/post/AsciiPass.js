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
 * Grayscale ASCII pass — the object reads only through white/gray glyphs on black.
 * Optional coverage mask: cells on the mask fully replace the underlying geometry.
 */
export class AsciiPass extends Pass {
  /**
   * @param {object} [options]
   * @param {number} [options.amount=0] 0 = off, 1 = full opaque ASCII (hides geometry)
   * @param {number} [options.cellSize=10] pixel cell size
   * @param {string} [options.charset] denser = brighter
   */
  constructor({
    amount = 0,
    cellSize = 10,
    charset = ' .\'`^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  } = {}) {
    super()

    this.amount = amount
    this.cellSize = cellSize
    this.enabled = true

    this._atlas = createGlyphAtlas(charset)
    this._material = new ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tMask: { value: null },
        tAtlas: { value: this._atlas.texture },
        resolution: { value: new Vector2(1, 1) },
        cellSize: { value: cellSize },
        glyphCount: { value: this._atlas.count },
        amount: { value: amount },
        useMask: { value: 0 },
        contrast: { value: 1.25 },
        maskThreshold: { value: 0.22 },
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

  setContrast(value) {
    this._material.uniforms.contrast.value = value
  }

  /**
   * @param {import('three').Texture | null} texture cube/object coverage mask
   */
  setMaskTexture(texture) {
    this._material.uniforms.tMask.value = texture
    this._material.uniforms.useMask.value = texture ? 1 : 0
  }

  setSize(width, height) {
    this._material.uniforms.resolution.value.set(width, height)
  }

  render(renderer, writeBuffer, readBuffer) {
    this._material.uniforms.tDiffuse.value = readBuffer.texture

    if (!this.enabled || this.amount <= 0.001) {
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
  ctx.font = `bold ${Math.floor(cell * 0.84)}px "Courier New", ui-monospace, monospace`

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
  uniform sampler2D tMask;
  uniform sampler2D tAtlas;
  uniform vec2 resolution;
  uniform float cellSize;
  uniform float glyphCount;
  uniform float amount;
  uniform float useMask;
  uniform float contrast;
  uniform float maskThreshold;
  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
  }

  float cellMask(vec2 cellUv) {
    if (useMask < 0.5) return 1.0;
    vec2 texel = 1.0 / resolution;
    float span = cellSize * 0.28;
    float m = texture2D(tMask, cellUv).r;
    m = max(m, texture2D(tMask, cellUv + vec2( texel.x * span, 0.0)).r);
    m = max(m, texture2D(tMask, cellUv - vec2( texel.x * span, 0.0)).r);
    m = max(m, texture2D(tMask, cellUv + vec2(0.0,  texel.y * span)).r);
    m = max(m, texture2D(tMask, cellUv - vec2(0.0,  texel.y * span)).r);
    return step(maskThreshold, m);
  }

  float cellLuma(vec2 cellUv, float cell) {
    // Average a few taps so form lighting reads through the glyph choice
    vec2 texel = (cell * 0.22) / resolution;
    float b = luma(texture2D(tDiffuse, cellUv).rgb);
    b += luma(texture2D(tDiffuse, cellUv + vec2(texel.x, 0.0)).rgb);
    b += luma(texture2D(tDiffuse, cellUv - vec2(texel.x, 0.0)).rgb);
    b += luma(texture2D(tDiffuse, cellUv + vec2(0.0, texel.y)).rgb);
    b += luma(texture2D(tDiffuse, cellUv - vec2(0.0, texel.y)).rgb);
    return b * 0.2;
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
    float onObject = cellMask(cellUv);

    if (onObject < 0.5) {
      gl_FragColor = vec4(src, 1.0);
      return;
    }

    float brightness = clamp(cellLuma(cellUv, cell), 0.0, 1.0);
    brightness = clamp(pow(brightness, 1.0 / max(contrast, 0.2)), 0.0, 1.0);

    // Dense glyph = brighter region; gray level of the ink also tracks brightness
    float glyphIndex = floor(brightness * (glyphCount - 1.0) + 0.5);
    vec2 local = fract(pixel / cell);
    local.y = 1.0 - local.y;

    float atlasU = (glyphIndex + local.x) / glyphCount;
    float glyph = texture2D(tAtlas, vec2(atlasU, local.y)).r;

    // Pure black paper — underlying glass/geometry never shows through
    vec3 paper = vec3(0.0);
    // White → mid gray ink: highlights pop, shadows stay dim
    float inkTone = mix(0.22, 1.0, brightness);
    vec3 ink = vec3(inkTone);
    vec3 asciiColor = mix(paper, ink, glyph);

    // Soft cell edge so the block still reads as a lattice, not mush
    float grid = smoothstep(0.012, 0.06, min(min(local.x, local.y), min(1.0 - local.x, 1.0 - local.y)));
    asciiColor *= 0.9 + grid * 0.1;

    // amount fades ASCII in; at 1 the geometry is fully replaced
    float cover = clamp(amount, 0.0, 1.0);
    // Even mid values strongly hide the mesh so form is glyph-driven
    cover = smoothstep(0.0, 0.35, cover) * mix(0.85, 1.0, cover);

    vec3 color = mix(src, asciiColor, cover);
    gl_FragColor = vec4(color, 1.0);
  }
`
