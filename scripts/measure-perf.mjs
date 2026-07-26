#!/usr/bin/env node
/**
 * T0.3 — Measure frame time + renderer.info at DPR 1 and 2.
 * Writes docs/perf-before.md
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from './findChrome.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outFile = path.join(root, 'docs', 'perf-before.md')
const baseUrl = process.argv[2] || 'http://localhost:5173/'

async function measure(page, look, dpr) {
  await page.evaluate((key, pixelRatio) => {
    window.__prizm.applyLook(key)
    const dprEl = document.getElementById('dpr')
    if (dprEl) {
      dprEl.value = String(pixelRatio)
      dprEl.dispatchEvent(new Event('input', { bubbles: true }))
      dprEl.dispatchEvent(new Event('change', { bubbles: true }))
    }
    window.__prizm.applyUi()
    window.__prizm.lockCamera()
    window.__prizm.setAutoSpin(false)
    // Force exact viewport sizing for the measurement
    window.__prizm.renderer.setPixelRatio(pixelRatio)
    window.__prizm.renderer.setSize(1920, 1080, false)
  }, look, dpr)

  await new Promise((r) => setTimeout(r, 2000))

  return page.evaluate(() => {
    const s = window.__prizm.stats
    const render = window.__prizm.sampleRenderStats()
    return {
      frameMs: Number(s.frameMs.toFixed(3)),
      fps: Number(s.fps.toFixed(2)),
      calls: render.calls,
      triangles: render.triangles,
      samples: s._samples.length,
      textures: render.textures,
      geometries: render.geometries,
    }
  })
}

async function main() {
  const executablePath = findChrome()
  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=1920,1080',
    ],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  })

  const page = await browser.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => Boolean(window.__prizm?.stats), { timeout: 60_000 })
  await new Promise((r) => setTimeout(r, 1500))

  const cases = [
    ['studio', 1],
    ['studio', 2],
    ['prismChaos', 1],
    ['prismChaos', 2],
  ]

  const rows = []
  for (const [look, dpr] of cases) {
    const m = await measure(page, look, dpr)
    rows.push({ look, dpr, ...m })
    console.log(look, 'DPR', dpr, m)
  }

  await browser.close()

  const lines = [
    '# Performance (before)',
    '',
    'Viewport locked to **1920×1080**. Frame time = moving average of up to 60 frames via `window.__prizm.stats`.',
    'Renderer: Chrome headless + SwiftShader (software GL) — absolute numbers are environment-specific; use for relative before/after.',
    '',
    '| look | DPR | ms/frame | fps | draw calls | triangles | samples |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| \`${r.look}\` | ${r.dpr} | ${r.frameMs} | ${r.fps} | ${r.calls} | ${r.triangles} | ${r.samples} |`),
    '',
    'Also recorded per sample via `sampleRenderStats()` (autoReset disabled for one compose).',
    '',
  ]
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, lines.join('\n'))
  console.log('wrote', outFile)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
