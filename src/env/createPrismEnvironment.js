import * as THREE from 'three'

/**
 * Float HDR procedural environment for glass IBL.
 * Same visual language as the old canvas version (spectral blades + soft fills),
 * but with true values above 1.0 so bloom / ACES / speculars can spark.
 */
export function createPrismEnvironment(renderer) {
  const width = 1024
  const height = 512
  const data = new Float32Array(width * height * 4)

  // Near-black void with slight cool fill
  for (let i = 0; i < width * height; i++) {
    const o = i * 4
    data[o] = 0.008
    data[o + 1] = 0.012
    data[o + 2] = 0.028
    data[o + 3] = 1
  }

  // Soft ambient pockets (HDR soft)
  stampRadial(data, width, height, 0.2, 0.32, 0.3, [0.35, 0.85, 2.4], 1.8)
  stampRadial(data, width, height, 0.8, 0.56, 0.26, [2.2, 0.55, 0.28], 1.4)

  const blades = [
    { x: 0.16, w: 0.04, peak: [1.2, 4.5, 18], edge: [0.05, 0.2, 0.8] },
    { x: 0.3, w: 0.022, peak: [18, 6, 1.5], edge: [0.7, 0.15, 0.04] },
    { x: 0.46, w: 0.055, peak: [22, 22, 25], edge: [0.5, 0.35, 1.2] },
    { x: 0.6, w: 0.02, peak: [20, 4, 0.8], edge: [0.6, 0.1, 0.03] },
    { x: 0.74, w: 0.032, peak: [1, 18, 16], edge: [0.02, 0.7, 0.65] },
    { x: 0.87, w: 0.016, peak: [18, 2.5, 6], edge: [0.7, 0.05, 0.2] },
  ]

  for (const blade of blades) {
    stampBlade(data, width, height, blade)
  }

  // Hot specular suns — values well above 1
  stampRadial(data, width, height, 0.5, 0.24, 0.07, [80, 80, 80], 1)
  stampRadial(data, width, height, 0.27, 0.84, 0.05, [55, 38, 18], 1)
  stampRadial(data, width, height, 0.7, 0.76, 0.045, [22, 40, 60], 1)

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.NoColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const envMap = pmrem.fromEquirectangular(texture).texture
  // Keep equirect for custom prism shaders (PMREM is CubeUV — not samplerCube).
  envMap.userData.equirect = texture
  pmrem.dispose()
  return envMap
}

function stampBlade(data, width, height, { x, w, peak, edge }) {
  const cx = x * width
  const half = w * width
  for (let py = 0; py < height; py++) {
    for (let px = Math.floor(cx - half * 2); px <= Math.ceil(cx + half * 2); px++) {
      if (px < 0 || px >= width) continue
      const t = Math.abs(px - cx) / Math.max(half, 1e-4)
      if (t > 2) continue
      // Smooth peak in the center of the blade
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
