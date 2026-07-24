import * as THREE from 'three'

/**
 * Oversized streetwear type wall behind the prism.
 * All layers are OPAQUE so they enter Three's transmission render target
 * and actually refract through MeshPhysicalMaterial glass.
 * Relative “opacity” is painted into the canvas (globalAlpha), not the material.
 */
export function createStreetwearBackdrop() {
  const group = new THREE.Group()
  group.name = 'streetwear-backdrop'

  const layers = [
    {
      lines: ['PRIZM', 'SPLIT THE LIGHT', 'NO FILTER', 'REFRACT', 'SS26'],
      size: [16, 11],
      position: [0, 0, -2.85],
      paintAlpha: 1,
      speedY: 0.045,
      speedX: 0.012,
      scale: 1,
    },
    {
      lines: ['OPTICAL CHAOS', 'BEND REALITY', 'CRYSTAL CORE', 'VOID / GLASS'],
      size: [18, 9],
      position: [0.35, 0.15, -3.55],
      paintAlpha: 0.62,
      speedY: -0.028,
      speedX: -0.018,
      scale: 1.08,
    },
    {
      lines: ['RAW OPTICS', 'LIGHT ENTERS', 'COLOR LEAVES', 'NO CAP'],
      size: [20, 10],
      position: [-0.2, -0.1, -4.05],
      paintAlpha: 0.28,
      speedY: 0.02,
      speedX: 0.03,
      scale: 1.15,
    },
  ]

  const meshes = []

  // Farthest first so opaque depth writes compose correctly
  const ordered = [...layers].sort((a, b) => a.position[2] - b.position[2])

  for (const layer of ordered) {
    const { texture, canvas } = paintStreetwearTexture(layer.lines, 2048, 1280, layer.paintAlpha)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    const geo = new THREE.PlaneGeometry(layer.size[0], layer.size[1])
    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      side: THREE.FrontSide,
      toneMapped: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(...layer.position)
    mesh.scale.setScalar(layer.scale)
    mesh.userData.speedY = layer.speedY
    mesh.userData.speedX = layer.speedX
    mesh.userData.canvas = canvas
    mesh.userData.texture = texture
    mesh.userData.lines = layer.lines
    group.add(mesh)
    meshes.push(mesh)
  }

  // Opaque dark wash — black-on-black, kept as solid so transmission has a floor
  const wash = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 14),
    new THREE.MeshBasicMaterial({
      color: '#05070c',
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      toneMapped: false,
    }),
  )
  wash.position.z = -4.55
  group.add(wash)

  group.userData.update = (time) => {
    for (const mesh of meshes) {
      const map = mesh.material.map
      if (!map) continue
      map.offset.y = (time * mesh.userData.speedY) % 1
      map.offset.x = (time * mesh.userData.speedX) % 1
    }
  }

  return group
}

function paintStreetwearTexture(lines, width, height, alpha = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // Always opaque base so the material can stay non-transparent
  ctx.fillStyle = '#050505'
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalAlpha = alpha

  // Faint grid / poster texture
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let x = 0; x < width; x += 64) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  const stack = []
  while (stack.length < 18) {
    for (const line of lines) stack.push(line)
  }

  let y = 40
  stack.forEach((line, i) => {
    const huge = i % 3 === 0
    const size = huge ? 148 : 78
    ctx.font = `800 ${size}px "Archivo Black", "Syne", Impact, sans-serif`
    ctx.textBaseline = 'top'
    ctx.fillStyle = huge ? '#f4f1ea' : 'rgba(244,241,234,0.55)'
    ctx.letterSpacing = huge ? '-0.04em' : '0.08em'

    const text = i % 4 === 1 ? line : `${line}  ·  ${line}`
    const metrics = ctx.measureText(text)
    const x = (i % 2 === 0 ? 48 : width - metrics.width - 48) + Math.sin(i * 1.7) * 20

    if (huge) {
      ctx.strokeStyle = 'rgba(0,0,0,0.65)'
      ctx.lineWidth = 10
      ctx.strokeText(text, x, y)
    }
    ctx.fillText(text, x, y)

    if (huge) {
      ctx.fillStyle = '#ff4d1f'
      ctx.fillRect(x, y + size + 8, Math.min(220, metrics.width * 0.35), 6)
    }

    y += size + (huge ? 36 : 28)
  })

  ctx.font = '600 28px "Instrument Sans", sans-serif'
  ctx.fillStyle = 'rgba(126,200,255,0.75)'
  ctx.fillText('PRIZM / OPTICS DEPT.', 48, height - 56)
  ctx.fillStyle = 'rgba(244,241,234,0.35)'
  ctx.fillText('LIGHT ENTERS · COLOR LEAVES', width - 520, height - 56)

  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  texture.needsUpdate = true

  return { texture, canvas }
}
