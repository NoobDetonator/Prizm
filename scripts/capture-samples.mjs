#!/usr/bin/env node
/**
 * Curated sample shots for sharing after V2 merge.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outs = [
  path.join(root, 'docs', 'samples'),
  '/opt/cursor/artifacts/prizm-samples',
]
const baseUrl = process.argv[2] || 'http://127.0.0.1:5173/'

const shots = [
  { file: '01-studio-physical.png', look: 'studio', engine: 'physical', material: 'crystal' },
  { file: '02-studio-custom.png', look: 'studio', engine: 'custom', material: 'crystal' },
  { file: '03-anamorphic-physical.png', look: 'anamorphic', engine: 'physical', material: 'flint' },
  { file: '04-portrait-physical.png', look: 'portrait', engine: 'physical', material: 'crystal' },
  { file: '05-neon-ascii-custom.png', look: 'neonAscii', engine: 'custom', material: 'glass' },
  { file: '06-print-shop-physical.png', look: 'printShop', engine: 'physical', material: 'crystal' },
  { file: '07-prism-chaos-physical.png', look: 'prismChaos', engine: 'physical', material: 'crystal' },
  { file: '08-void-prism-physical.png', look: 'voidPrism', engine: 'physical', material: 'crystal' },
]

for (const dir of outs) fs.mkdirSync(dir, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--window-size=1600,900',
  ],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 1 },
})

const page = await browser.newPage()
page.setDefaultTimeout(180_000)
await page.goto(baseUrl, { waitUntil: 'networkidle0' })
await page.waitForFunction(() => Boolean(window.__prizm?.applyLook && window.__prizm?.setEngine), {
  timeout: 60_000,
})
await new Promise((r) => setTimeout(r, 1200))
await page.evaluate(() => {
  window.__prizm.lockCamera()
  window.__prizm.setAutoSpin(false)
  window.__prizm.setUiVisible(false)
})

for (const shot of shots) {
  await page.evaluate(async (s) => {
    await window.__prizm.setEngine(s.engine)
    await window.__prizm.applyLook(s.look)
    const el = document.getElementById('preset')
    if (el) {
      el.value = s.material
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    window.__prizm.applyUi()
  }, shot)
  await new Promise((r) => setTimeout(r, 900))
  const dataURL = await page.evaluate(async () => window.__prizm.captureDataURL(1))
  const buf = Buffer.from(dataURL.replace(/^data:image\/png;base64,/, ''), 'base64')
  for (const dir of outs) {
    const file = path.join(dir, shot.file)
    fs.writeFileSync(file, buf)
  }
  console.log('wrote', shot.file, `(${Math.round(buf.length / 1024)} KB)`)
}

await browser.close()
console.log('samples complete:', shots.length)
