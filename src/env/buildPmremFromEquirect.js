import * as THREE from 'three'

/**
 * Shared high-quality equirect → PMREM path.
 * Cube size is equirectWidth/4, so 2048→512 and 4096→1024 face resolution.
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {THREE.Texture} equirect float or LDR equirect texture
 * @param {object} [meta]
 */
export function buildPmremFromEquirect(renderer, equirect, meta = {}) {
  equirect.mapping = THREE.EquirectangularReflectionMapping
  equirect.generateMipmaps = false
  equirect.minFilter = THREE.LinearFilter
  equirect.magFilter = THREE.LinearFilter
  equirect.needsUpdate = true

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const target = pmrem.fromEquirectangular(equirect)
  const envMap = target.texture

  envMap.userData.equirect = equirect
  for (const [key, value] of Object.entries(meta)) {
    envMap.userData[key] = value
  }

  // Keep the RT alive via the texture; dispose generator only.
  pmrem.dispose()
  return envMap
}

/** sRGB byte → linear float */
export function srgb8ToLinear(c) {
  const x = c / 255
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

/**
 * Canvas 8-bit sRGB → Float32 linear equirect with highlight boost.
 * Hot pixels (neons / windows) get extra radiance so glass speculars spark.
 */
export function canvasToFloatEquirect(canvas, {
  exposure = 1,
  highlightBoost = 4.5,
  highlightStart = 0.72,
} = {}) {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const src = ctx.getImageData(0, 0, w, h).data
  const data = new Float32Array(w * h * 4)

  for (let i = 0, p = 0; i < src.length; i += 4, p += 4) {
    let r = srgb8ToLinear(src[i])
    let g = srgb8ToLinear(src[i + 1])
    let b = srgb8ToLinear(src[i + 2])

    // Relative luminance (Rec.709)
    const lum = r * 0.2126 + g * 0.7152 + b * 0.0722
    const t = THREE.MathUtils.smoothstep(highlightStart, 1, lum)
    const boost = 1 + t * t * (highlightBoost - 1)

    data[p] = r * exposure * boost
    data[p + 1] = g * exposure * boost
    data[p + 2] = b * exposure * boost
    data[p + 3] = 1
  }

  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

/** Resolution tiers for procedural / artistic generators */
export const ENV_QUALITY = {
  medium: { equirectWidth: 2048, label: 'medium' },
  high: { equirectWidth: 4096, label: 'high' },
}
