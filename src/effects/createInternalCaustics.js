import * as THREE from 'three'

/**
 * Internal spectral caustic blades that live inside a glass volume.
 * Reusable: parent the group under any refractive mesh and call setIntensity / update.
 */
export function createInternalCaustics() {
  const group = new THREE.Group()
  group.name = 'internal-caustics'

  const blades = [
    createBlade({
      width: 0.24,
      height: 1.42,
      colors: ['#000000', '#003bff', '#13e9ff', '#ecffff', '#00a7ff', '#000000'],
      intensity: 1.15,
      position: [-0.42, -0.02, -0.18],
      rotation: [0, -0.28, 0],
      phase: 0.2,
      speed: 0.55,
    }),
    createBlade({
      width: 0.17,
      height: 1.34,
      colors: ['#000000', '#d91d00', '#ff6a00', '#fff0c8', '#ff3000', '#000000'],
      intensity: 1.08,
      position: [0.39, -0.04, -0.14],
      rotation: [0, 0.22, 0],
      phase: 1.1,
      speed: 0.42,
    }),
    createBlade({
      width: 1.22,
      height: 0.11,
      colors: ['#002aff', '#00d9ff', '#f5ffff', '#ffe600', '#ff4700', '#ff003b'],
      intensity: 1.05,
      position: [-0.02, 0.52, 0.1],
      rotation: [0, 0.12, -0.19],
      phase: 2.4,
      speed: 0.68,
    }),
    createBlade({
      width: 0.13,
      height: 1.05,
      colors: ['#000000', '#7b2dff', '#d4a0ff', '#ffffff', '#5ce1ff', '#000000'],
      intensity: 0.92,
      position: [0.08, -0.18, 0.22],
      rotation: [0.15, -0.55, 0.08],
      phase: 3.3,
      speed: 0.5,
    }),
  ]

  for (const blade of blades) group.add(blade)

  let intensity = 0.55

  group.userData.setIntensity = (value) => {
    intensity = THREE.MathUtils.clamp(value, 0, 1)
    group.visible = intensity > 0.01
    for (const blade of blades) {
      const base = blade.userData.baseIntensity
      blade.material.color.setScalar(base * (0.35 + intensity * 1.15))
      blade.material.opacity = 0.55 + intensity * 0.45
    }
  }

  group.userData.update = (time) => {
    if (!group.visible) return
    for (const blade of blades) {
      const { phase, speed, basePosition, baseRotation } = blade.userData
      const wobble = Math.sin(time * speed + phase)
      blade.position.x = basePosition.x + wobble * 0.035
      blade.position.y = basePosition.y + Math.cos(time * speed * 0.8 + phase) * 0.02
      blade.rotation.y = baseRotation.y + wobble * 0.06
      blade.rotation.z = baseRotation.z + Math.sin(time * speed * 1.2 + phase) * 0.04
      blade.material.color.setScalar(
        blade.userData.baseIntensity * (0.35 + intensity * 1.15) * (0.88 + wobble * 0.12),
      )
    }
  }

  group.userData.setIntensity(intensity)
  return group
}

function createBlade({ width, height, colors, intensity, position, rotation, phase, speed }) {
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
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  // After opaque/transmissive glass (renderOrder 2) so additive blades are not depth-killed.
  mesh.renderOrder = 3.5
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.userData.baseIntensity = intensity * 0.45
  mesh.userData.basePosition = mesh.position.clone()
  mesh.userData.baseRotation = mesh.rotation.clone()
  mesh.userData.phase = phase
  mesh.userData.speed = speed
  return mesh
}
