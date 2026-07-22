import * as THREE from 'three'

/**
 * Minimal optical studio used to reveal the prism.
 * Every visible card is opaque so it is included in Three.js' transmission
 * buffer and can be bent by the glass volume.
 */
export function createOpticalStudio() {
  const group = new THREE.Group()
  group.name = 'optical-studio'

  const backdropTexture = paintBackdrop(1536, 1024)
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({ map: backdropTexture, toneMapped: false }),
  )
  backdrop.position.set(0, 0, -4.4)
  group.add(backdrop)

  const cards = [
    createLightCard({
      width: 0.58,
      height: 6.8,
      position: [-2.05, 0.05, -2.75],
      rotation: 0.04,
      colors: ['#00020a', '#004dff', '#25dfff', '#eaffff', '#006eff', '#000006'],
      intensity: 1.45,
    }),
    createLightCard({
      width: 0.24,
      height: 6.5,
      position: [-1.18, -0.05, -2.7],
      rotation: -0.035,
      colors: ['#000000', '#61d7ff', '#ffffff', '#16b8ff', '#000000'],
      intensity: 1.6,
    }),
    createLightCard({
      width: 0.48,
      height: 6.4,
      position: [1.42, 0.05, -2.72],
      rotation: -0.025,
      colors: ['#050000', '#e52800', '#ff6b00', '#ffd29a', '#ff2600', '#030000'],
      intensity: 1.45,
    }),
    createLightCard({
      width: 0.14,
      height: 6.1,
      position: [2.08, 0, -2.68],
      rotation: 0.045,
      colors: ['#000000', '#ff376e', '#ffffff', '#ff5a00', '#000000'],
      intensity: 1.35,
    }),
  ]
  group.add(...cards)

  const spectrum = createSpectrumSlash()
  spectrum.position.set(0.15, 1.58, -2.55)
  spectrum.rotation.z = -0.17
  group.add(spectrum)

  const horizon = createLightCard({
    width: 5.5,
    height: 0.14,
    position: [0, -1.62, -2.62],
    rotation: 0,
    horizontal: true,
    colors: ['#080808', '#a9dfff', '#ffffff', '#ffd3b5', '#080808'],
    intensity: 1.35,
  })
  group.add(horizon)

  const glowTexture = paintGlow(512, 256)
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: '#b8ddff',
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    }),
  )
  glow.position.set(0, -1.18, -0.45)
  glow.scale.set(3.5, 1.1, 1)
  group.add(glow)

  return group
}

function createLightCard({ width, height, position, rotation, colors, intensity, horizontal = false }) {
  const texture = paintStrip(colors, horizontal ? 512 : 96, horizontal ? 96 : 512, horizontal)
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color().setScalar(intensity),
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  mesh.position.set(...position)
  mesh.rotation.z = rotation
  return mesh
}

function createSpectrumSlash() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 80
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
  const stops = [
    [0, '#000000'],
    [0.08, '#00bfff'],
    [0.2, '#00f6ff'],
    [0.36, '#ffffff'],
    [0.5, '#ffe900'],
    [0.66, '#ff5b00'],
    [0.82, '#ff143d'],
    [1, '#000000'],
  ]
  for (const [offset, color] of stops) gradient.addColorStop(offset, color)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 24, canvas.width, 32)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  return new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.3), material)
}

function paintBackdrop(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, width, height)

  const blue = ctx.createRadialGradient(width * 0.22, height * 0.48, 0, width * 0.22, height * 0.48, width * 0.42)
  blue.addColorStop(0, 'rgba(0, 42, 105, 0.19)')
  blue.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = blue
  ctx.fillRect(0, 0, width, height)

  const warm = ctx.createRadialGradient(width * 0.76, height * 0.55, 0, width * 0.76, height * 0.55, width * 0.35)
  warm.addColorStop(0, 'rgba(105, 24, 0, 0.12)')
  warm.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, width, height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function paintStrip(colors, width, height, horizontal) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const gradient = horizontal
    ? ctx.createLinearGradient(0, 0, width, 0)
    : ctx.createLinearGradient(0, 0, width, 0)

  colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

function paintGlow(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2)
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
  gradient.addColorStop(0.18, 'rgba(120,190,255,0.38)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
