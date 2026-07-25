/**
 * Re-capture only custom-engine cells of the D4 matrix (after exposure tweak).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'docs', 'matrix')
const looks = ['studio', 'anamorphic', 'portrait', 'neonAscii', 'ghostTrail', 'printShop', 'prismChaos']
const materials = ['glass', 'flint', 'crystal']

const browser = await puppeteer.launch({
  executablePath: '/usr/local/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--window-size=960,540'],
  defaultViewport: { width: 960, height: 540, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.setDefaultTimeout(180_000)
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' })
await page.waitForFunction(() => window.__prizm?.setEngine)
await page.evaluate(() => {
  window.__prizm.lockCamera()
  window.__prizm.setAutoSpin(false)
  window.__prizm.setUiVisible(false)
})
await page.evaluate(async () => window.__prizm.setEngine('custom'))
await new Promise((r) => setTimeout(r, 400))

let n = 0
for (const look of looks) {
  await page.evaluate(async (key) => window.__prizm.applyLook(key), look)
  for (const material of materials) {
    await page.evaluate((mat) => {
      const el = document.getElementById('preset')
      if (el) {
        el.value = mat
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }
      window.__prizm.applyUi()
    }, material)
    await new Promise((r) => setTimeout(r, 500))
    const dataURL = await page.evaluate(async () => window.__prizm.captureDataURL(1))
    const file = path.join(outDir, `${look}__${material}__custom.png`)
    fs.writeFileSync(file, Buffer.from(dataURL.replace(/^data:image\/png;base64,/, ''), 'base64'))
    n += 1
    console.log(`[${n}/21]`, path.basename(file))
  }
}
await browser.close()
console.log('custom matrix refresh done')
