#!/usr/bin/env node
/**
 * T0.1 — Capture baseline PNGs for each look preset at a locked camera.
 * Usage: node scripts/capture-baseline.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from './findChrome.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'docs', 'baseline')
const baseUrl = process.argv[2] || 'http://localhost:5173/'
const presets = ['studio', 'anamorphic', 'portrait', 'neonAscii', 'ghostTrail', 'printShop', 'prismChaos']

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const executablePath = findChrome()
  if (!executablePath) throw new Error('Chrome/Chromium not found')

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
  page.setDefaultTimeout(120_000)
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => Boolean(window.__prizm?.applyLook), { timeout: 60_000 })
  // Wait for fonts + optional env map
  await new Promise((resolve) => setTimeout(resolve, 1500))

  await page.evaluate(() => {
    window.__prizm.lockCamera()
    window.__prizm.setAutoSpin(false)
  })

  for (const preset of presets) {
    const ok = await page.evaluate((key) => window.__prizm.applyLook(key), preset)
    if (!ok) throw new Error(`Failed to apply look preset: ${preset}`)
    await new Promise((resolve) => setTimeout(resolve, 700))
    const dataURL = await page.evaluate(async () => window.__prizm.captureDataURL(1))
    const base64 = dataURL.replace(/^data:image\/png;base64,/, '')
    const file = path.join(outDir, `before-${preset}.png`)
    fs.writeFileSync(file, Buffer.from(base64, 'base64'))
    console.log('wrote', file, `(${Math.round(base64.length * 0.75 / 1024)} KB)`)
  }

  await browser.close()
  console.log('baseline complete:', presets.length, 'presets')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
