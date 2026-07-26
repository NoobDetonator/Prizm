import * as THREE from 'three'

export function createSurfaceDetails(dimensions, speckleCount, scratchCount) {
  const group = new THREE.Group()
  group.name = 'surface-details'
  const random = mulberry32(29)
  const half = dimensions.clone().multiplyScalar(0.5)
  const faces = [
    { normal: new THREE.Vector3(1, 0, 0), u: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(0, 0, 1), hu: half.y, hv: half.z },
    { normal: new THREE.Vector3(-1, 0, 0), u: new THREE.Vector3(0, 1, 0), v: new THREE.Vector3(0, 0, -1), hu: half.y, hv: half.z },
    { normal: new THREE.Vector3(0, 1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, -1), hu: half.x, hv: half.z },
    { normal: new THREE.Vector3(0, -1, 0), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 0, 1), hu: half.x, hv: half.z },
    { normal: new THREE.Vector3(0, 0, 1), u: new THREE.Vector3(1, 0, 0), v: new THREE.Vector3(0, 1, 0), hu: half.x, hv: half.y },
    { normal: new THREE.Vector3(0, 0, -1), u: new THREE.Vector3(-1, 0, 0), v: new THREE.Vector3(0, 1, 0), hu: half.x, hv: half.y },
  ]

  const pointPositions = new Float32Array(speckleCount * 3)
  const pointColors = new Float32Array(speckleCount * 3)
  const palette = ['#ffffff', '#b7e9ff', '#66caff', '#ffbb88']
  const color = new THREE.Color()

  for (let index = 0; index < speckleCount; index++) {
    const face = faces[Math.floor(random() * faces.length)]
    const point = surfacePoint(face, random, dimensions, 0.018)
    point.toArray(pointPositions, index * 3)
    color.set(palette[Math.floor(random() * palette.length)])
    color.multiplyScalar(0.55 + random() * 0.75)
    color.toArray(pointColors, index * 3)
  }

  const pointsGeometry = new THREE.BufferGeometry()
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(pointColors, 3))
  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.014,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  pointsMaterial.toneMapped = false
  const points = new THREE.Points(pointsGeometry, pointsMaterial)
  points.renderOrder = 5
  group.add(points)

  const scratchPositions = new Float32Array(scratchCount * 6)
  const scratchColors = new Float32Array(scratchCount * 6)
  for (let index = 0; index < scratchCount; index++) {
    const face = faces[Math.floor(random() * faces.length)]
    const start = surfacePoint(face, random, dimensions, 0.02)
    const length = 0.018 + random() * 0.068
    const drift = (random() - 0.5) * 0.016
    const end = start.clone().addScaledVector(face.v, length).addScaledVector(face.u, drift)
    start.toArray(scratchPositions, index * 6)
    end.toArray(scratchPositions, index * 6 + 3)
    color.set(random() > 0.82 ? '#74d8ff' : '#ffffff').multiplyScalar(0.65 + random() * 0.45)
    color.toArray(scratchColors, index * 6)
    color.toArray(scratchColors, index * 6 + 3)
  }

  const scratchGeometry = new THREE.BufferGeometry()
  scratchGeometry.setAttribute('position', new THREE.BufferAttribute(scratchPositions, 3))
  scratchGeometry.setAttribute('color', new THREE.BufferAttribute(scratchColors, 3))
  const scratchMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  })
  scratchMaterial.toneMapped = false
  const scratches = new THREE.LineSegments(scratchGeometry, scratchMaterial)
  scratches.renderOrder = 5
  group.add(scratches)

  /**
   * Intensity must move pixels — but as surface sparkle, not as a wash.
   *
   * The previous scaling (opacity up to 0.95, size up to 0.034) was tuned by eye
   * against the `physical` engine, where it is measurably a no-op: sweeping it
   * 0 → 1 moves the body luma 135.1 → 135.5 and chroma 42.5 → 42.2. On `custom`
   * the same layer buried the render — at the demo default of 0.45 it pushed luma
   * 90 → 165, turned 37% of the body pure white and cut chroma from 46.5 to 12.9,
   * which is why every `*__custom.png` capture was a flat white brick.
   * Re-scaled so both engines stay readable; `npm run calibrate:speckle` reproduces
   * the sweep, and `scripts/test-refraction-gpu.mjs` G3 guards the blowout.
   */
  group.userData.setIntensity = (value) => {
    const amount = THREE.MathUtils.clamp(value, 0, 1)
    pointsMaterial.opacity = amount * 0.12
    pointsMaterial.size = 0.004 + amount * 0.005
    scratchMaterial.opacity = amount * 0.08
    group.visible = amount > 0.005
  }

  return group
}

function surfacePoint(face, random, dimensions, offset) {
  const margin = 0.1
  const u = (random() * 2 - 1) * Math.max(0, face.hu - margin)
  const v = (random() * 2 - 1) * Math.max(0, face.hv - margin)
  const normalExtent = Math.abs(face.normal.x) * dimensions.x * 0.5
    + Math.abs(face.normal.y) * dimensions.y * 0.5
    + Math.abs(face.normal.z) * dimensions.z * 0.5
  return face.normal.clone().multiplyScalar(normalExtent + offset)
    .addScaledVector(face.u, u)
    .addScaledVector(face.v, v)
}

function mulberry32(seed) {
  return function random() {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
