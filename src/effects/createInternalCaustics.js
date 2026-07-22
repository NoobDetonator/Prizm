import * as THREE from 'three'

export function createInternalCaustics() {
  const group = new THREE.Group()
  group.name = 'internal-caustics'

  const cyan = createBlade({
    width: 0.24,
    height: 1.42,
    colors: ['#000000', '#003bff', '#13e9ff', '#ecffff', '#00a7ff', '#000000'],
    intensity: 1.15,
  })
  cyan.position.set(-0.42, -0.02, -0.18)
  cyan.rotation.y = -0.28
  group.add(cyan)

  const orange = createBlade({
    width: 0.17,
    height: 1.34,
    colors: ['#000000', '#d91d00', '#ff6a00', '#fff0c8', '#ff3000', '#000000'],
    intensity: 1.08,
  })
  orange.position.set(0.39, -0.04, -0.14)
  orange.rotation.y = 0.22
  group.add(orange)

  const spectrum = createBlade({
    width: 1.22,
    height: 0.11,
    colors: ['#002aff', '#00d9ff', '#f5ffff', '#ffe600', '#ff4700', '#ff003b'],
    intensity: 1.05,
  })
  spectrum.position.set(-0.02, 0.52, 0.1)
  spectrum.rotation.z = -0.19
  spectrum.rotation.y = 0.12
  group.add(spectrum)

  return group
}

function createBlade({ width, height, colors, intensity }) {
  const canvas = document.createElement('canvas')
  canvas.width = width > height ? 512 : 96
  canvas.height = width > height ? 96 : 512
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
  colors.forEach((color, index) => gradient.addColorStop(index / (colors.length - 1), color))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const longFade = width > height
    ? ctx.createLinearGradient(0, 0, canvas.width, 0)
    : ctx.createLinearGradient(0, 0, 0, canvas.height)
  longFade.addColorStop(0, 'rgba(0,0,0,1)')
  longFade.addColorStop(0.14, 'rgba(0,0,0,0)')
  longFade.addColorStop(0.86, 'rgba(0,0,0,0)')
  longFade.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.fillStyle = longFade
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const edgeFade = width > height
    ? ctx.createLinearGradient(0, 0, 0, canvas.height)
    : ctx.createLinearGradient(0, 0, canvas.width, 0)
  edgeFade.addColorStop(0, 'rgba(0,0,0,0.72)')
  edgeFade.addColorStop(0.32, 'rgba(0,0,0,0)')
  edgeFade.addColorStop(0.68, 'rgba(0,0,0,0)')
  edgeFade.addColorStop(1, 'rgba(0,0,0,0.72)')
  ctx.fillStyle = edgeFade
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color().setScalar(intensity),
    side: THREE.DoubleSide,
    depthWrite: true,
    toneMapped: false,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  mesh.renderOrder = 0
  return mesh
}
