#!/usr/bin/env node
/**
 * D3 / A2 — Numerical proof that exit refraction with a non-parallel exit normal
 * produces per-channel direction split (spectral dispersion).
 *
 * Pure math (no WebGL). Fails if T2R.xy ≈ T2B.xy (the parallel-slab bug).
 *
 * Usage: node scripts/test-dispersion.mjs
 */
import assert from 'node:assert/strict'

function refract(I, N, eta) {
  // GLSL refract(I, N, eta): I and N are normalized; I points toward surface.
  const n = normalize(N)
  const i = normalize(I)
  const cosi = -dot(i, n)
  const k = 1 - eta * eta * (1 - cosi * cosi)
  if (k < 0) {
    // TIR — mirror of GLSL: return zero vector
    return [0, 0, 0]
  }
  const a = eta * cosi - Math.sqrt(k)
  return normalize([
    eta * i[0] + a * n[0],
    eta * i[1] + a * n[1],
    eta * i[2] + a * n[2],
  ])
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function length2(v) {
  return Math.hypot(v[0], v[1])
}

function refractSpectral(I, N, eta) {
  const T = refract(I, N, eta)
  if (dot(T, T) < 1e-12) {
    // reflect(I, N) = I - 2*dot(N,I)*N  with GLSL convention
    const n = normalize(N)
    const d = 2 * dot(n, I)
    return normalize([I[0] - d * n[0], I[1] - d * n[1], I[2] - d * n[2]])
  }
  return T
}

/** Crystal preset IORs with dispersion * 0.028 spread (matches prismMaterial). */
function channelIors(ior = 1.85, dispersion = 1.55) {
  const disp = dispersion * 0.028
  return {
    R: Math.max(1.01, ior - disp),
    G: Math.max(1.01, ior),
    B: Math.max(1.01, ior + disp * 1.15),
  }
}

function exitDirections({ entryN, exitN, ior, dispersion, angleDeg = 35 }) {
  const rad = (angleDeg * Math.PI) / 180
  // Incident from air toward surface (into -Z), tilted in X.
  const I = normalize([Math.sin(rad), 0, -Math.cos(rad)])
  const iors = channelIors(ior, dispersion)

  const T1R = refractSpectral(I, entryN, 1 / iors.R)
  const T1G = refractSpectral(I, entryN, 1 / iors.G)
  const T1B = refractSpectral(I, entryN, 1 / iors.B)

  const T2R = refractSpectral(T1R, exitN.map((c) => -c), iors.R)
  const T2G = refractSpectral(T1G, exitN.map((c) => -c), iors.G)
  const T2B = refractSpectral(T1B, exitN.map((c) => -c), iors.B)

  return { I, T1R, T1G, T1B, T2R, T2G, T2B, iors }
}

function main() {
  const entryN = [0, 0, 1]

  // --- Bug reproduction: parallel slab (exitN = entryN) → dispersion cancels ---
  const parallel = exitDirections({ entryN, exitN: entryN })
  const parallelSplit = length2(sub(parallel.T2R, parallel.T2B))
  console.log('parallel-slab |T2R.xy - T2B.xy| =', parallelSplit.toExponential(3))
  assert.ok(
    parallelSplit < 1e-6,
    'sanity: parallel slab must cancel spectral split (proves the bug model)',
  )
  // Also: T2 should match incident direction (reversibility)
  const backToI = length2(sub(parallel.T2G, parallel.I.map((c, idx) => (idx === 2 ? -c : c))))
  // T2 points away from surface roughly along +view; compare to -I for outgoing
  console.log('parallel-slab |T2G - (-I)|.xy approx check skipped (direction sense)')

  // --- Fix: wedge exit normal (15° tilt) → real spectral split ---
  const wedgeRad = (15 * Math.PI) / 180
  const exitN = normalize([Math.sin(wedgeRad), 0, Math.cos(wedgeRad)])
  const wedge = exitDirections({ entryN, exitN })
  const wedgeSplit = length2(sub(wedge.T2R, wedge.T2B))
  console.log('wedge-15°   |T2R.xy - T2B.xy| =', wedgeSplit.toExponential(3))
  console.log('iors', wedge.iors)
  console.log('T2R', wedge.T2R.map((v) => v.toFixed(5)))
  console.log('T2G', wedge.T2G.map((v) => v.toFixed(5)))
  console.log('T2B', wedge.T2B.map((v) => v.toFixed(5)))

  assert.ok(
    wedgeSplit > 1e-3,
    `FAIL P1: spectral split too small (${wedgeSplit}). Exit normal must differ from entry.`,
  )

  console.log('OK — dispersion split with real exit normal exceeds 1e-3')
}

main()
