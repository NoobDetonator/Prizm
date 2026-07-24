import * as THREE from 'three'
import { DEFAULT_PROCEDURAL_ENV, PROCEDURAL_ENV_PRESETS } from './proceduralPresets.js'
import { ENV_QUALITY, buildPmremFromEquirect } from './buildPmremFromEquirect.js'

/**
 * Float HDR procedural environment for glass IBL.
 * Pass a preset id from PROCEDURAL_ENV_PRESETS (spectral, midnight, tungsten, …).
 *
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} [presetId]
 * @param {{ quality?: 'medium'|'high' }} [options]
 */
export function createPrismEnvironment(renderer, presetId = DEFAULT_PROCEDURAL_ENV, options = {}) {
  const recipe = PROCEDURAL_ENV_PRESETS[presetId] ?? PROCEDURAL_ENV_PRESETS[DEFAULT_PROCEDURAL_ENV]
  const quality = ENV_QUALITY[options.quality] ?? ENV_QUALITY.high
  const width = quality.equirectWidth
  const height = width / 2
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
    // Slightly softer core + hotter peak for cleaner speculars on glass
    stampRadial(data, width, height, sun.x, sun.y, sun.r * 1.35, sun.rgb.map((c) => c * 0.22), sun.gain)
    stampRadial(data, width, height, sun.x, sun.y, sun.r * 0.55, sun.rgb.map((c) => c * 1.35), sun.gain)
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  texture.colorSpace = THREE.NoColorSpace
  texture.userData.kind = 'procedural-hdr'
  texture.userData.preset = recipe.id
  texture.userData.quality = quality.label

  return buildPmremFromEquirect(renderer, texture, {
    kind: 'procedural-hdr',
    preset: recipe.id,
    label: recipe.label,
    note: recipe.note,
    quality: quality.label,
    equirectSize: [width, height],
  })
}

export { PROCEDURAL_ENV_PRESETS, DEFAULT_PROCEDURAL_ENV, ENV_QUALITY }

/**
 * Vertical spectral blade with soft horizontal AA + mild vertical vignette
 * so the IBL does not look like infinite hard slits.
 */
function stampBlade(data, width, height, { x, w, peak, edge }) {
  const cx = x * width
  const half = Math.max(w * width, 0.75)
  const x0 = Math.max(0, Math.floor(cx - half * 2.5))
  const x1 = Math.min(width - 1, Math.ceil(cx + half * 2.5))

  for (let py = 0; py < height; py++) {
    // Soften toward poles (equirect stretch) and mid-band emphasis
    const v = py / (height - 1)
    const pole = Math.sin(v * Math.PI)
    const band = 0.55 + 0.45 * pole

    for (let px = x0; px <= x1; px++) {
      // 2-tap horizontal supersample for thinner blades
      let fall = 0
      for (let s = -0.5; s <= 0.5; s += 1) {
        const t = Math.abs(px + s - cx) / half
        if (t > 2.2) continue
        const lobe = t < 1
          ? (1 - t) * (1 - t) * (1 - t * 0.15)
          : Math.pow(Math.max(0, 2.2 - t) / 1.2, 2) * 0.22
        fall += lobe
      }
      fall *= 0.5 * band
      if (fall <= 1e-5) continue

      const rgb = [
        edge[0] + (peak[0] - edge[0]) * Math.min(1, fall * 1.15),
        edge[1] + (peak[1] - edge[1]) * Math.min(1, fall * 1.15),
        edge[2] + (peak[2] - edge[2]) * Math.min(1, fall * 1.15),
      ]
      addPixel(data, width, px, py, rgb, fall)
    }
  }
}

function stampRadial(data, width, height, nx, ny, radiusN, rgb, gain) {
  const cx = nx * width
  const cy = ny * height
  // Compensate equirect horizontal stretch near poles a bit via elliptical falloff
  const radiusX = radiusN * width
  const radiusY = radiusN * width * (0.72 + 0.28 * Math.sin((ny) * Math.PI))
  const x0 = Math.max(0, Math.floor(cx - radiusX))
  const x1 = Math.min(width - 1, Math.ceil(cx + radiusX))
  const y0 = Math.max(0, Math.floor(cy - radiusY))
  const y1 = Math.min(height - 1, Math.ceil(cy + radiusY))

  for (let py = y0; py <= y1; py++) {
    for (let px = x0; px <= x1; px++) {
      const dx = (px - cx) / Math.max(radiusX, 1e-4)
      const dy = (py - cy) / Math.max(radiusY, 1e-4)
      const d2 = dx * dx + dy * dy
      if (d2 > 1) continue
      // Smoothstep^2 gaussian-ish
      const u = 1 - d2
      const fall = u * u * (3 - 2 * u) * gain
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
