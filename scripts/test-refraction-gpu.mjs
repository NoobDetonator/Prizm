#!/usr/bin/env node
/**
 * GPU gate — measures pixels, not source text.
 *
 * `scripts/test-dispersion.mjs` proves the *math model* and greps the shader
 * source. Both passed for months while the custom engine's exit-normal path was
 * dead at runtime (backface RT cleared to depth 1 with depthFunc GREATER ⇒ no
 * fragment ever passed). This gate imports the real `src/` modules, renders
 * them in headless Chrome, and reads back the framebuffer.
 *
 * G1 backface RT must contain samples          (catches the dead depth clear)
 * G2 dispersion must increase per-channel split (catches "dispersion does nothing")
 * G3 prism body must not be blown out to white  (catches the raw-HDR env mix)
 *
 * Usage: node scripts/test-refraction-gpu.mjs
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome, HEADLESS_GL_ARGS } from './findChrome.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const PORT = 5271

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
}

/** Serve the repo (incl. node_modules/three) so the page imports the real sources. */
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(req.url.split('?')[0])
      if (url === '/') {
        res.writeHead(200, { 'content-type': MIME['.html'] })
        res.end(PAGE)
        return
      }
      const file = path.join(root, url)
      if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' })
      fs.createReadStream(file).pipe(res)
    })
    server.listen(PORT, '127.0.0.1', () => resolve(server))
  })
}

const PAGE = /* html */ `<!doctype html>
<html><head><meta charset="utf-8"><title>prizm gpu gate</title></head>
<body style="margin:0;background:#000">
<canvas id="c" width="320" height="320"></canvas>
<script type="importmap">
{ "imports": {
  "three": "/node_modules/three/build/three.module.js",
  "three/addons/": "/node_modules/three/examples/jsm/"
} }
</script>
<script type="module">
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
// Real library sources — not copies.
import { createPrism, buildPmremFromEquirect } from '/src/lib/prizm/index.js'
import { createBackfaceCapture } from '/src/lib/prizm/createBackfaceCapture.js'

const SIZE = 320
const canvas = document.querySelector('#c')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(SIZE, SIZE, false)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08

// STRICTLY NEUTRAL environment: grey dome + white highlights, R=G=B everywhere.
// With a greyscale backdrop too, every |R-B| the prism produces has exactly one
// possible source — per-channel IOR. That is what makes G2b a real measurement
// instead of a proxy.
function neutralEnvironment() {
  const w = 512, h = 256
  const data = new Float32Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      let v = 0.25 + 0.75 * Math.sin((y / (h - 1)) * Math.PI)
      // A few neutral "lamps" so there is something for speculars to catch.
      for (const lamp of [[0.2, 0.3], [0.62, 0.22], [0.85, 0.45]]) {
        const dx = (x / w - lamp[0]) * 3.2
        const dy = (y / h - lamp[1]) * 3.2
        const d = Math.hypot(dx, dy)
        if (d < 0.12) v += 14 * (1 - d / 0.12) ** 2
      }
      data[o] = data[o + 1] = data[o + 2] = v
      data[o + 3] = 1
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType)
  tex.colorSpace = THREE.NoColorSpace
  tex.needsUpdate = true
  return buildPmremFromEquirect(renderer, tex, { kind: 'gate-neutral' })
}

const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')
scene.environment = neutralEnvironment()
scene.environmentIntensity = 2.5

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
camera.position.set(0, 0, 6.2)
camera.lookAt(0, 0, 0)
camera.updateMatrixWorld()

// Backdrop is deliberately GREYSCALE and high-frequency, and mostly dark like the
// demo's streetwear plate. Greyscale matters: any |R-B| the prism produces must
// come from its own per-channel split, not from backdrop colour. Mostly-dark
// matters: it reproduces the demo condition where a raw HDR env mix can wash the
// body out to white.
const stripes = document.createElement('canvas')
stripes.width = stripes.height = 512
{
  const g = stripes.getContext('2d')
  g.fillStyle = '#000000'
  g.fillRect(0, 0, 512, 512)
  for (let i = 0; i < 8; i++) {
    g.fillStyle = ['#ffffff', '#8a8a8a', '#d0d0d0', '#4a4a4a'][i % 4]
    g.fillRect(24, i * 64 + 10, 464, 34)
  }
  g.fillStyle = '#ffffff'
  for (let i = 0; i < 64; i++) g.fillRect(i * 8, 0, 3, 512)
}
const backdropTex = new THREE.CanvasTexture(stripes)
backdropTex.colorSpace = THREE.SRGBColorSpace
backdropTex.wrapS = backdropTex.wrapT = THREE.RepeatWrapping
backdropTex.repeat.set(3, 3)
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshBasicMaterial({ map: backdropTex }),
)
backdrop.position.z = -4
scene.add(backdrop)

const mesh = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.7, 1.75, 8, 0.11))
mesh.rotation.set(0.33, 0.66, 0.085)
scene.add(mesh)

const composer = new EffectComposer(renderer)
composer.setSize(SIZE, SIZE)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new OutputPass())

const prism = createPrism({ renderer, preset: 'crystal', engine: 'custom' })
prism.attach(mesh)

const gl = renderer.getContext()
function readFrame() {
  const px = new Uint8Array(SIZE * SIZE * 4)
  gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, px)
  return px
}
function drawAndRead() {
  prism.beforeRender(renderer, scene, camera)
  composer.render()
  return readFrame()
}

/**
 * Same frame, but with the backface normal texture detached so the shader takes
 * its "exitN = -N" fallback. The difference is the entire payoff of the backface
 * pre-pass, which costs one extra RT and one extra draw per prism per frame.
 */
function drawWithoutBackface() {
  prism.beforeRender(renderer, scene, camera)
  prism.material.userData.setBackfaceTexture(null)
  composer.render()
  return readFrame()
}

// ---- silhouette mask: which pixels does the prism actually cover? ----
mesh.visible = false
composer.render()
const bg = readFrame()
mesh.visible = true
const withPrism = drawAndRead()
const mask = new Uint8Array(SIZE * SIZE)
let covered = 0
for (let i = 0; i < SIZE * SIZE; i++) {
  const d =
    Math.abs(withPrism[i * 4] - bg[i * 4]) +
    Math.abs(withPrism[i * 4 + 1] - bg[i * 4 + 1]) +
    Math.abs(withPrism[i * 4 + 2] - bg[i * 4 + 2])
  if (d > 12) { mask[i] = 1; covered++ }
}

// ---- G1: does the backface RT contain anything? ----
const bf = createBackfaceCapture({ scale: 0.5 })
bf.setSize(SIZE, SIZE)
bf.capture(renderer, camera, mesh)
const bw = Math.max(2, Math.round(SIZE * 0.5))
const half = new Uint16Array(bw * bw * 4)
renderer.readRenderTargetPixels(bf.renderTarget, 0, 0, bw, bw, half)
function h2f(u) {
  const s = (u & 0x8000) >> 15, e = (u & 0x7c00) >> 10, f = u & 0x03ff
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024)
  if (e === 0x1f) return f ? NaN : (s ? -Infinity : Infinity)
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024)
}
let bfSamples = 0
for (let i = 0; i < bw * bw; i++) if (h2f(half[i * 4 + 3]) > 1e-4) bfSamples++

// ---- G2 / G3: dispersion response + blowout on the prism silhouette ----
// Every metric is differential (max minus min), so constant contributions —
// env reflection colour, backdrop luminance — cancel out.
function stats(px) {
  let chroma = 0, saturated = 0, n = 0
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!mask[i]) continue
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2]
    chroma += Math.abs(r - b)
    if (r >= 250 && g >= 250 && b >= 250) saturated++
    n++
  }
  return { chroma: n ? chroma / n : 0, saturatedFrac: n ? saturated / n : 0, n }
}

function madOnMask(a, b) {
  let sum = 0, n = 0
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!mask[i]) continue
    sum += Math.abs(a[i * 4] - b[i * 4])
    sum += Math.abs(a[i * 4 + 1] - b[i * 4 + 1])
    sum += Math.abs(a[i * 4 + 2] - b[i * 4 + 2])
    n += 3
  }
  return n ? sum / n : 0
}

/**
 * The dispersion metric. Absolute |R-B| is useless here: the material tint
 * (color #f8fbff, attenuation #d8ecff) puts a large constant offset on it that
 * swamps the effect. What dispersion means is that R and B move *differently*
 * when the parameter changes — common-mode change cancels, tint cancels.
 */
function channelSplit(a, b) {
  let sum = 0, n = 0
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (!mask[i]) continue
    const dR = b[i * 4] - a[i * 4]
    const dB = b[i * 4 + 2] - a[i * 4 + 2]
    sum += Math.abs(dR - dB)
    n++
  }
  return n ? sum / n : 0
}

// Control: does the screen-space plate respond to refraction at all? If IOR moves
// pixels but dispersion does not, the pipeline works and only the split is small.
prism.setParams({ ior: 1.1 })
const iorLowPx = drawAndRead()
prism.setParams({ ior: 2.4 })
const iorHighPx = drawAndRead()
prism.setParams({ ior: 1.85 })

prism.setParams({ dispersion: 0 })
const lowPx = drawAndRead()
const low = stats(lowPx)
prism.setParams({ dispersion: 2.5 })
const highPx = drawAndRead()
const high = stats(highPx)

// What does the backface pre-pass actually buy, in pixels?
const bfOn = drawAndRead()
const bfOff = drawWithoutBackface()

window.__result = {
  covered,
  coveredFrac: covered / (SIZE * SIZE),
  backfaceSamples: bfSamples,
  backfaceTotal: bw * bw,
  chromaLow: low.chroma,
  chromaHigh: high.chroma,
  dispersionMad: madOnMask(lowPx, highPx),
  dispersionSplit: channelSplit(lowPx, highPx),
  // Control: raising IOR bends all three channels together, so a working pipeline
  // shows a large MAD here and only a small channel split.
  iorMad: madOnMask(iorLowPx, iorHighPx),
  iorSplit: channelSplit(iorLowPx, iorHighPx),
  backfacePayoffMad: madOnMask(bfOn, bfOff),
  saturatedFrac: high.saturatedFrac,
}
window.__done = true
</script>
</body></html>`

async function main() {
  const executablePath = findChrome()
  const server = await serve()
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [...HEADLESS_GL_ARGS, '--window-size=400,400'],
    defaultViewport: { width: 400, height: 400, deviceScaleFactor: 1 },
  })

  let result
  try {
    const page = await browser.newPage()
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') pageErrors.push(m.text())
    })

    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' })
    await page
      .waitForFunction(() => window.__done === true, { timeout: 180_000 })
      .catch(() => {
        throw new Error(`page never finished. errors:\n${pageErrors.join('\n') || '(none)'}`)
      })
    result = await page.evaluate(() => window.__result)
  } finally {
    await browser.close()
    server.close()
  }

  const failures = []
  const report = []

  report.push(`prism coverage        ${result.covered} px (${(result.coveredFrac * 100).toFixed(1)}% of frame)`)
  report.push(`backface RT samples   ${result.backfaceSamples} / ${result.backfaceTotal}`)
  report.push(`chroma |R-B| disp=0   ${result.chromaLow.toFixed(3)}  (material tint, constant)`)
  report.push(`chroma |R-B| disp=2.5 ${result.chromaHigh.toFixed(3)}`)
  report.push(`dispersion MAD        ${result.dispersionMad.toFixed(3)}`)
  report.push(`dispersion R/B split  ${result.dispersionSplit.toFixed(3)}   <- the gated number`)
  report.push(`ior MAD (control)     ${result.iorMad.toFixed(3)}`)
  report.push(`ior R/B split (ctrl)  ${result.iorSplit.toFixed(3)}`)
  report.push(`backface payoff MAD   ${result.backfacePayoffMad.toFixed(3)}   (cost: +1 RT, +1 draw per prism)`)
  report.push(`saturated body        ${(result.saturatedFrac * 100).toFixed(1)}%`)
  console.log(report.join('\n'))
  console.log('')

  if (result.coveredFrac < 0.05) {
    failures.push(`setup: prism covers only ${(result.coveredFrac * 100).toFixed(1)}% of the frame — scene is wrong, other gates are meaningless`)
  }

  // G1 — the exit-normal pre-pass must produce samples.
  if (result.backfaceSamples < result.backfaceTotal * 0.05) {
    failures.push(
      `G1 backface RT is empty (${result.backfaceSamples} samples). ` +
        `depthFunc GREATER needs the depth buffer seeded to 0; exit normals never reach the shader.`,
    )
  }

  // Control first: if the plate does not respond to refraction at all, G2 cannot
  // mean anything and the real defect is upstream.
  if (result.iorMad < 10) {
    failures.push(
      `G2-control screen-space refraction is inert (IOR MAD = ${result.iorMad.toFixed(3)}, need > 10). ` +
        `The plate path itself is broken; the dispersion number below is meaningless.`,
    )
  }

  // G2 — raising dispersion must move R and B differently.
  // Measured on this scene: 0.732 with exit normals live, 0.616 with them dead,
  // and ~0 if the dispersion uniform were disconnected entirely. So this gate
  // proves dispersion reaches pixels; it deliberately does NOT claim to prove the
  // backface pre-pass matters — G4 measures that separately, because the gap
  // between those two states is only ~19%.
  if (result.dispersionSplit < 0.3) {
    failures.push(
      `G2 dispersion does not reach pixels (R/B split = ${result.dispersionSplit.toFixed(3)}, need > 0.3). ` +
        `Backdrop and environment are both greyscale, so per-channel IOR is the only possible source.`,
    )
  }

  // G4 — the backface pre-pass has to earn its cost. `docs/DEBITO-TECNICO.md`
  // justified keeping it with "então ele tem de mover pixel"; this is that claim
  // as a number instead of a sentence.
  if (result.backfacePayoffMad < 0.5) {
    failures.push(
      `G4 backface pre-pass changes almost nothing (MAD = ${result.backfacePayoffMad.toFixed(3)}, need > 0.5). ` +
        `It costs an extra render target and an extra draw per prism per frame — either make the ` +
        `exit normal matter or delete createBackfaceCapture and drop to the -N fallback.`,
    )
  }

  // G3 — a white brick is not glass.
  if (result.saturatedFrac > 0.35) {
    failures.push(
      `G3 prism body is blown out (${(result.saturatedFrac * 100).toFixed(1)}% fully saturated, max 35%). ` +
        `Raw HDR env is being mixed in without BRDF weighting.`,
    )
  }

  if (failures.length) {
    console.error('FAIL\n' + failures.map((f) => `  - ${f}`).join('\n'))
    process.exit(1)
  }
  console.log('OK — G1 backface samples, G2 dispersion response, G3 no blowout')
}

main().catch((error) => {
  console.error(error.message || error)
  process.exit(1)
})
