import * as THREE from 'three'
import { DEFAULT_PROCEDURAL_ENV, PROCEDURAL_ENV_PRESETS } from './proceduralPresets.js'

/**
 * Float HDR procedural environment for glass IBL.
 * Pass a preset id from PROCEDURAL_ENV_PRESETS (spectral, midnight, tungsten, …).
 */
export function createPrismEnvironment(renderer, presetId = DEFAULT_PROCEDURAL_ENV) {
  const recipe = PROCEDURAL_ENV_PRESETS[presetId] ?? PROCEDURAL_ENV_PRESETS[DEFAULT_PROCEDURAL_ENV]
  const width = 1024
  const height = 512
  const data = new Float32Array(width * height * 4)

  const [fr, fg, fb] = recipe.fill
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    data[o] = fr
    data[o + 1] = fg
    data[o + 2] = fb
    data[o + 3] = 1
  }

  for (const p of recipe.pockets) {
    stampRadial(data, width, height, p.x, p.y, p.r, p.rgb, p.gain)
  }
  for (const blade of recipe.blades) {
    stampBlade(data, width, height, blade)
  }
  for (const sun of recipe.suns) {
    stampRadial(data, width, height, sun.x, sun.y, sun.r, sun.rgb, sun.gain)
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  texture.userData.kind = 'procedural-hdr'
  texture.userData.preset = recipe.id

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const envMap = pmrem.fromEquirectangular(texture).texture
  envMap.userData.equirect = texture
  envMap.userData.kind = 'procedural-hdr'
  envMap.userData.preset = recipe.id
  envMap.userData.label = recipe.label
  envMap.userData.note = recipe.note
  pmrem.dispose()
  return envMap
}

export { PROCEDURAL_ENV_PRESETS, DEFAULT_PROCEDURAL_ENV }

function stampBlade(data, width, height, { x, w, peak, edge }) {
  const cx = x * width
  const half = w * width
  for (let py = 0; py < height; py++) {
    for (let px = Math.floor(cx - half * 2); px <= Math.ceil(cx + half * 2); px++) {
      if (px < 0 || px >= width) continue
      const t = Math.abs(px - cx) / Math.max(half, 1e-4)
      if (t > 2) continue
      const fall = t < 1 ? Math.pow(1 - t, 2) : Math.pow(Math.max(0, 2 - t), 2) * 0.25
      const rgb = [
        edge[0] + (peak[0] - edge[0]) * fall,
        edge[1] + (peak[1] - edge[1]) * fall,
        edge[2] + (peak[2] - edge[2]) * fall,
      ]
      addPixel(data, width, px, py, rgb, fall)
    }
  }
}

function stampRadial(data, width, height, nx, ny, radiusN, rgb, gain) {
  const cx = nx * width
  const cy = ny * height
  const radius = radiusN * width
  const r2 = radius * radius
  const x0 = Math.max(0, Math.floor(cx - radius))
  const x1 = Math.min(width - 1, Math.ceil(cx + radius))
  const y0 = Math.max(0, Math.floor(cy - radius))
  const y1 = Math.min(height - 1, Math.ceil(cy + radius))
  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx
      const dy = py - cy
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const fall = Math.pow(1 - d2 / r2, 2) * gain
      addPixel(data, width, px, py, rgb, fall)
    }
  }
}

function addPixel(data, width, px, py, rgb, fall) {
  const o = (py * width + px) * 4
  data[o] += rgb[0] * fall
  data[o + 1] += rgb[1] * fall
  data[o + 2] += rgb[2] * fall
  data[o + 3] = 1
}
