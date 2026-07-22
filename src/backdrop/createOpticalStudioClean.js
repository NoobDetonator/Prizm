import * as THREE from 'three'

/**
 * Clean black stage. All high-energy color comes from the environment map and
 * the prism itself, so lighting equipment never leaks into the final asset.
 */
export function createOpticalStudio() {
  const group = new THREE.Group()
  group.name = 'optical-studio-clean'

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({ map: paintBackdrop(1536, 1024), toneMapped: false }),
  )
  backdrop.position.set(0, 0, -4.4)
  group.add(backdrop)

  return group
}

function paintBackdrop(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const cool = ctx.createRadialGradient(width * 0.32, height * 0.48, 0, width * 0.32, height * 0.48, width * 0.46)
  cool.addColorStop(0, 'rgba(0, 28, 70, 0.08)')
  cool.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = cool
  ctx.fillRect(0, 0, width, height)

  const warm = ctx.createRadialGradient(width * 0.72, height * 0.58, 0, width * 0.72, height * 0.58, width * 0.35)
  warm.addColorStop(0, 'rgba(80, 16, 0, 0.045)')
  warm.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, width, height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
