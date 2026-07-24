import * as THREE from 'three'

/**
 * Estimate a usable optical thickness from geometry bounds.
 * Not a true thickness map — a stable scalar for IOR path length / material.thickness.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {{ scale?: number }} [options]
 * @returns {number}
 */
export function estimateThickness(geometry, { scale = 0.85 } = {}) {
  if (!geometry) return 1
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const size = new THREE.Vector3()
  geometry.boundingBox.getSize(size)
  const minAxis = Math.max(1e-4, Math.min(size.x, size.y, size.z))
  return minAxis * scale
}

/**
 * Build a crude axial thickness hint texture (R = normalized depth along Z in local AABB).
 * Useful as MeshPhysicalMaterial.thicknessMap when no authored map exists.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {number} [resolution=64]
 * @returns {THREE.DataTexture}
 */
export function createThicknessHintMap(geometry, resolution = 64) {
  const data = new Uint8Array(resolution * resolution)
  // Soft center-weighted falloff — thicker in the middle of the silhouette.
  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const u = x / (resolution - 1)
      const v = y / (resolution - 1)
      const dx = u * 2 - 1
      const dy = v * 2 - 1
      const r = Math.sqrt(dx * dx + dy * dy)
      const t = Math.max(0, 1 - r)
      data[y * resolution + x] = Math.round(40 + t * t * 215)
    }
  }
  const map = new THREE.DataTexture(data, resolution, resolution, THREE.RedFormat)
  map.needsUpdate = true
  map.wrapS = THREE.ClampToEdgeWrapping
  map.wrapT = THREE.ClampToEdgeWrapping
  map.generateMipmaps = false
  map.minFilter = THREE.LinearFilter
  map.magFilter = THREE.LinearFilter
  // Silence unused-param lint while keeping API open for future UV baking from geometry.
  void geometry
  return map
}
