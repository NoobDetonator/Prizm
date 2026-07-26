#!/usr/bin/env node
/**
 * Calibrates PRISM_EXPOSURE in `src/materials/prismMaterial.js`.
 *
 * The two engines have to be interchangeable in the demo. They were not: the
 * custom body sat ~1.5 stops below the physical one, which put it on the steep
 * part of the ACES curve, where the demo's additive `surface-details` layer —
 * measurably invisible on `physical` — washed the cube to flat white.
 *
 * This sweeps the uniform against a live demo and reports which value puts the
 * custom body at the same 8-bit luma as `physical` on the same frame. It prints a
 * table; it does not edit source. Requires `npm run dev` on :5173.
 *
 * Usage: node scripts/calibrate-exposure.mjs [baseUrl]
 */
import puppeteer from 'puppeteer-core'
import { findChrome, HEADLESS_GL_ARGS } from './findChrome.mjs'

const baseUrl = process.argv[2] || 'http://localhost:5173/'
const SWEEP = [0, 0.05, 0.1, 0.2, 0.3, 0.45, 0.7, 1.0]

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: 'new',
  args: [...HEADLESS_GL_ARGS, '--window-size=640,360'],
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
})

try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('PAGEERR', e.message))
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => Boolean(window.__prizm?.capturePixels), { timeout: 60_000 })
  await new Promise((r) => setTimeout(r, 1200))

  const rows = await page.evaluate(async (sweep) => {
    const p = window.__prizm
    const W = 640, H = 360, total = W * H

    await p.applyLook('studio')
    p.lockCamera()
    p.setAutoSpin(false)
    // Freeze the animated backdrop so every sample is the same frame.
    p.streetwear.userData.update = () => {}
    await new Promise((r) => setTimeout(r, 400))

    async function bodyStats() {
      const withCube = await p.capturePixels(1)
      p.prism.visible = false
      await new Promise((r) => setTimeout(r, 250))
      const without = await p.capturePixels(1)
      p.prism.visible = true
      await new Promise((r) => setTimeout(r, 250))
      const px = await p.capturePixels(1)

      let n = 0, sum = 0, sat = 0, chroma = 0
      for (let i = 0; i < total; i++) {
        const d = Math.abs(withCube.rgba[i * 4] - without.rgba[i * 4]) +
          Math.abs(withCube.rgba[i * 4 + 1] - without.rgba[i * 4 + 1]) +
          Math.abs(withCube.rgba[i * 4 + 2] - without.rgba[i * 4 + 2])
        if (d <= 12) continue
        const r = px.rgba[i * 4], g = px.rgba[i * 4 + 1], b = px.rgba[i * 4 + 2]
        sum += (r + g + b) / 3
        if (r >= 245 && g >= 245 && b >= 245) sat++
        chroma += Math.abs(r - b)
        n++
      }
      return { luma: sum / n, sat: (sat / n) * 100, chroma: chroma / n }
    }

    const out = []
    for (const engine of ['physical', 'custom']) {
      await p.setEngine(engine)
      p.lockCamera(); p.setAutoSpin(false)
      await new Promise((r) => setTimeout(r, 500))
      for (const value of sweep) {
        // The knob under test is the demo's additive speckle layer, which is what
        // actually sets the body level on the custom engine.
        p.surfaceDetails.userData.setIntensity(value)
        await new Promise((r) => setTimeout(r, 350))
        out.push({ engine, exposure: value, ...(await bodyStats()) })
      }
    }
    const ref = out.find((r) => r.engine === 'physical')
    return { ref, out }
  }, SWEEP)

  console.log('speckle sweep — body stats inside the prism silhouette')
  console.log('')
  console.log('engine     speckle   luma   white    |R-B|')
  for (const row of rows.out) {
    console.log(
      `${row.engine.padEnd(10)} ${String(row.exposure).padEnd(8)} ${row.luma.toFixed(1).padStart(6)} ${row.sat.toFixed(1).padStart(6)}% ${row.chroma.toFixed(1).padStart(8)}`,
    )
  }
  console.log('')
  console.log('Read the |R-B| column: it is the refraction signal. Where it collapses,')
  console.log('the additive speckle layer has buried the glass.')
} finally {
  await browser.close()
}
