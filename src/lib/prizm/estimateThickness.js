import * as THREE from 'three'

/**
 * Heuristic optical thickness from geometry AABB.
 * Uses the shortest axis × scale — fine for boxes/rounded boxes, weak for
 * torus knots / thin shells (path length ≠ AABB min). Prefer an authored
 * thickness when available.
 *
 * @param {THREE.BufferGeometry} geometry
 * @param {{ scale?: number }} [options]
 * @returns {number}
 */
export function estimateThicknessFromBounds(geometry, { scale = 0.85 } = {}) {
  if (!geometry) return 1
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const size = new THREE.Vector3()
  geometry.boundingBox.getSize(size)
  const minAxis = Math.max(1e-4, Math.min(size.x, size.y, size.z))
  return minAxis * scale
}
