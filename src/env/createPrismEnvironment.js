import * as THREE from 'three'

/**
 * High-contrast artistic environment for glass refraction.
 * Bright spectral strips + soft fills → colorful internal streaks.
 */
export function createPrismEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()

  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d')

  // Deep black void — high contrast feeds dramatic glass streaks
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Soft ambient pockets
  drawRadial(ctx, size * 0.2, size * 0.16, size * 0.3, 'rgba(20, 50, 110, 0.55)')
  drawRadial(ctx, size * 0.8, size * 0.28, size * 0.26, 'rgba(110, 35, 20, 0.42)')

  // Vertical light blades that become long refractions inside the cube
  const blades = [
    { x: 0.16, w: 0.04, color: ['#000810', '#2f7dff', '#eaf4ff', '#2f7dff', '#000810'] },
    { x: 0.3, w: 0.022, color: ['#140800', '#ff7a2f', '#ffe3b8', '#ff7a2f', '#140800'] },
    { x: 0.46, w: 0.055, color: ['#050010', '#a078ff', '#ffffff', '#5fd0ff', '#050010'] },
    { x: 0.6, w: 0.02, color: ['#120600', '#ff4d1f', '#ffc98a', '#ff4d1f', '#120600'] },
    { x: 0.74, w: 0.032, color: ['#001018', '#00f0d0', '#ffffff', '#00f0d0', '#001018'] },
    { x: 0.87, w: 0.016, color: ['#120008', '#ff3b7a', '#ffd0e8', '#ff3b7a', '#120008'] },
  ]

  for (const blade of blades) {
    const x = blade.x * size
    const w = blade.w * size
    const grad = ctx.createLinearGradient(x - w, 0, x + w, 0)
    grad.addColorStop(0, blade.color[0])
    grad.addColorStop(0.35, blade.color[1])
    grad.addColorStop(0.5, blade.color[2])
    grad.addColorStop(0.65, blade.color[3])
    grad.addColorStop(1, blade.color[4])
    ctx.fillStyle = grad
    ctx.fillRect(x - w, 0, w * 2, canvas.height)
  }

  // Hot specular suns for corner sparkles
  drawRadial(ctx, size * 0.5, size * 0.12, size * 0.08, 'rgba(255,255,255,0.95)')
  drawRadial(ctx, size * 0.27, size * 0.42, size * 0.05, 'rgba(255,220,180,0.85)')
  drawRadial(ctx, size * 0.7, size * 0.38, size * 0.045, 'rgba(180,230,255,0.8)')

  const texture = new THREE.CanvasTexture(canvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace

  const envMap = pmrem.fromEquirectangular(texture).texture
  texture.dispose()
  pmrem.dispose()

  return envMap
}

function drawRadial(ctx, x, y, radius, color) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, color)
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
}
