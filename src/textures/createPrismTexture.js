import * as THREE from 'three'

/**
 * Artistic prism surface texture:
 * - micro dust / sparkles
 * - short vertical scratches
 * - subtle edge wear
 * Returns albedo, roughness, and normal maps.
 */
export function createPrismTexture(size = 1024, seed = 7) {
  const albedo = paintChannel(size, seed, 'albedo')
  const roughness = paintChannel(size, seed + 41, 'roughness')
  const normal = paintChannel(size, seed + 97, 'normal')

  const maps = {
    map: canvasToTexture(albedo.canvas, false),
    roughnessMap: canvasToTexture(roughness.canvas, false),
    normalMap: canvasToTexture(normal.canvas, false),
    canvas: albedo.canvas,
  }

  maps.map.colorSpace = THREE.SRGBColorSpace
  maps.roughnessMap.colorSpace = THREE.NoColorSpace
  maps.normalMap.colorSpace = THREE.NoColorSpace

  for (const key of ['map', 'roughnessMap', 'normalMap']) {
    maps[key].wrapS = THREE.RepeatWrapping
    maps[key].wrapT = THREE.RepeatWrapping
    maps[key].anisotropy = 8
    maps[key].needsUpdate = true
  }

  return maps
}

function canvasToTexture(canvas, flipY = true) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = flipY
  texture.generateMipmaps = true
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function paintChannel(size, seed, mode) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rand = mulberry32(seed)

  if (mode === 'albedo') {
    // Near-clear glass base with faint cool tint
    ctx.fillStyle = 'rgb(236, 244, 255)'
    ctx.fillRect(0, 0, size, size)

    // Soft spectral wash for artistic color catch
    const wash = ctx.createLinearGradient(0, 0, size, size)
    wash.addColorStop(0, 'rgba(80, 170, 255, 0.08)')
    wash.addColorStop(0.45, 'rgba(255, 140, 70, 0.05)')
    wash.addColorStop(1, 'rgba(120, 90, 255, 0.07)')
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, size, size)

    drawScratches(ctx, size, rand, {
      count: Math.floor(size * 1.8),
      color: (a) => `rgba(255,255,255,${a})`,
      alpha: [0.04, 0.22],
      length: [4, 28],
      width: [0.4, 1.4],
    })

    drawSpeckles(ctx, size, rand, {
      count: Math.floor(size * 4.5),
      color: (a) => `rgba(255,255,255,${a})`,
      alpha: [0.08, 0.55],
      radius: [0.3, 1.6],
    })

    // Occasional warm/cyan glints in the map itself
    drawSpeckles(ctx, size, rand, {
      count: Math.floor(size * 0.35),
      color: (a, warm) =>
        warm
          ? `rgba(255, 170, 90, ${a})`
          : `rgba(120, 210, 255, ${a})`,
      alpha: [0.12, 0.4],
      radius: [0.4, 1.8],
      tinted: true,
    })
  }

  if (mode === 'roughness') {
    // Dark base = glossy glass; bright flecks catch light like dust
    ctx.fillStyle = 'rgb(12, 12, 16)'
    ctx.fillRect(0, 0, size, size)

    drawScratches(ctx, size, rand, {
      count: Math.floor(size * 2.8),
      color: (a) => {
        const g = Math.floor(110 + a * 140)
        return `rgba(${g},${g},${g},${0.4 + a * 0.55})`
      },
      alpha: [0.25, 1],
      length: [6, 42],
      width: [0.5, 1.9],
    })

    drawSpeckles(ctx, size, rand, {
      count: Math.floor(size * 7),
      color: (a) => {
        const g = Math.floor(140 + a * 115)
        return `rgb(${g},${g},${g})`
      },
      alpha: [0.35, 1],
      radius: [0.3, 1.9],
    })
  }

  if (mode === 'normal') {
    ctx.fillStyle = 'rgb(128, 128, 255)'
    ctx.fillRect(0, 0, size, size)

    // Encode scratch direction as subtle normal perturbation
    for (let i = 0; i < size * 2.4; i++) {
      const x = rand() * size
      const y = rand() * size
      const len = 5 + rand() * 26
      const tilt = (rand() - 0.5) * 0.18
      const strength = 0.08 + rand() * 0.22
      const nx = Math.floor(128 + Math.sin(tilt) * 80 * strength)
      const ny = Math.floor(128 - Math.cos(tilt) * 80 * strength)

      ctx.strokeStyle = `rgba(${nx}, ${ny}, 255, ${0.25 + strength})`
      ctx.lineWidth = 0.6 + rand() * 1.1
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.sin(tilt) * len, y + len)
      ctx.stroke()
    }

    for (let i = 0; i < size * 2; i++) {
      const x = rand() * size
      const y = rand() * size
      const r = 0.4 + rand() * 1.4
      const nx = Math.floor(118 + rand() * 20)
      const ny = Math.floor(118 + rand() * 20)
      ctx.fillStyle = `rgba(${nx}, ${ny}, 255, ${0.25 + rand() * 0.45})`
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  return { canvas }
}

function drawScratches(ctx, size, rand, opts) {
  for (let i = 0; i < opts.count; i++) {
    const x = rand() * size
    const y = rand() * size
    const len = lerp(opts.length[0], opts.length[1], rand())
    const tilt = (rand() - 0.5) * 0.22
    const a = lerp(opts.alpha[0], opts.alpha[1], rand() ** 1.6)
    ctx.strokeStyle = opts.color(a)
    ctx.lineWidth = lerp(opts.width[0], opts.width[1], rand())
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.sin(tilt) * len * 0.25, y + len)
    ctx.stroke()
  }
}

function drawSpeckles(ctx, size, rand, opts) {
  for (let i = 0; i < opts.count; i++) {
    const x = rand() * size
    const y = rand() * size
    const r = lerp(opts.radius[0], opts.radius[1], rand() ** 2)
    const a = lerp(opts.alpha[0], opts.alpha[1], rand() ** 1.8)
    ctx.fillStyle = opts.tinted ? opts.color(a, rand() > 0.5) : opts.color(a)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
