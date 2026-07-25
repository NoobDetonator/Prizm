#!/usr/bin/env node
/**
 * Dispersion gate — math model + source coupling to prismMaterial.js.
 *
 * 1) Pure math: parallel slab cancels; wedge exit normal splits RGB.
 * 2) Source asserts: the shader must wire exit refraction through
 *    tBackfaceNormal → nOut, and must NOT use refractSpectral(T1*, -N, …).
 *
 * Reverting the shader to `-N` exit makes this test FAIL (V3.1).
 *
 * Usage: node scripts/test-dispersion.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const shaderPath = path.join(__dirname, '..', 'src', 'materials', 'prismMaterial.js')

function refract(I, N, eta) {
  const n = normalize(N)
  const i = normalize(I)
  const cosi = -dot(i, n)
  const k = 1 - eta * eta * (1 - cosi * cosi)
  if (k < 0) return [0, 0, 0]
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
    const n = normalize(N)
    const d = 2 * dot(n, I)
    return normalize([I[0] - d * n[0], I[1] - d * n[1], I[2] - d * n[2]])
  }
  return T
}

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

/** V3.1 — couple the math gate to the actual shader source. */
function assertShaderUsesBackfaceExit(source) {
  assert.match(
    source,
    /uniform\s+sampler2D\s+tBackfaceNormal/,
    'shader must declare tBackfaceNormal',
  )
  assert.match(
    source,
    /texture2D\s*\(\s*tBackfaceNormal/,
    'shader must sample tBackfaceNormal for exit normals',
  )
  assert.match(
    source,
    /vec3\s+nOut\s*=\s*-exitN/,
    'exit refraction must use nOut derived from exitN (backface)',
  )
  assert.match(
    source,
    /refractSpectral\s*\(\s*T1R\s*,\s*nOut\s*,/,
    'T2R must refract against nOut, not -N',
  )
  assert.match(
    source,
    /plateScreenUV\s*\(\s*vWorldPos\s*,\s*T1R\s*,\s*T2R/,
    'refraction plate must combine T1 displacement with T2 exit direction',
  )

  // Parallel-slab regression patterns — must NOT appear as the exit path.
  assert.doesNotMatch(
    source,
    /refractSpectral\s*\(\s*T1[RGB]\s*,\s*-N\s*,/,
    'FAIL V3.1: exit still uses -N (parallel-slab cancel). Backface exit required.',
  )
  assert.doesNotMatch(
    source,
    /if\s*\(\s*dot\s*\(\s*exitN\s*,\s*N\s*\)\s*>\s*0\.0\s*\)\s*exitN\s*=\s*-exitN/,
    'FAIL V3.3: exitN flip-vs-entry must not exist (breaks rounded-box wedges)',
  )

  console.log('OK — shader source wired to tBackfaceNormal / nOut / plateScreenUV(T1,T2)')
}

function main() {
  const source = fs.readFileSync(shaderPath, 'utf8')
  assertShaderUsesBackfaceExit(source)

  const entryN = [0, 0, 1]

  const parallel = exitDirections({ entryN, exitN: entryN })
  const parallelSplit = length2(sub(parallel.T2R, parallel.T2B))
  console.log('parallel-slab |T2R.xy - T2B.xy| =', parallelSplit.toExponential(3))
  assert.ok(parallelSplit < 1e-6, 'sanity: parallel slab must cancel spectral split')

  const wedgeRad = (15 * Math.PI) / 180
  const exitN = normalize([Math.sin(wedgeRad), 0, Math.cos(wedgeRad)])
  const wedge = exitDirections({ entryN, exitN })
  const wedgeSplit = length2(sub(wedge.T2R, wedge.T2B))
  console.log('wedge-15°   |T2R.xy - T2B.xy| =', wedgeSplit.toExponential(3))
  console.log('iors', wedge.iors)

  assert.ok(
    wedgeSplit > 1e-3,
    `FAIL: spectral split too small (${wedgeSplit}). Exit normal must differ from entry.`,
  )

  console.log('OK — math model + shader source gate passed')
}

main()
