#!/usr/bin/env node
/**
 * D4 — 7 looks × 3 materials × 2 engines = 42 captures → docs/matrix/
 * Usage: node scripts/capture-matrix.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'docs', 'matrix')
const baseUrl = process.argv[2] || 'http://127.0.0.1:5173/'

const looks = ['studio', 'anamorphic', 'portrait', 'neonAscii', 'ghostTrail', 'printShop', 'prismChaos']
const materials = ['glass', 'flint', 'crystal']
const engines = ['physical', 'custom']

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

async function main() {
  fs.mkdirSync(outDir, { recursive: true })
  const executablePath = chromeCandidates.find((c) => fs.existsSync(c))
  if (!executablePath) throw new Error('Chrome not found')

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--window-size=960,540',
    ],
    defaultViewport: { width: 960, height: 540, deviceScaleFactor: 1 },
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

  let n = 0
  for (const engine of engines) {
    await page.evaluate(async (e) => window.__prizm.setEngine(e), engine)
    await new Promise((r) => setTimeout(r, 400))
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
        const base64 = dataURL.replace(/^data:image\/png;base64,/, '')
        const file = path.join(outDir, `${look}__${material}__${engine}.png`)
        fs.writeFileSync(file, Buffer.from(base64, 'base64'))
        n += 1
        console.log(`[${n}/42]`, path.basename(file))
      }
    }
  }

  await browser.close()
  const index = [
    '# Capture matrix (D4)',
    '',
    '7 looks × 3 materials × 2 engines = **42** PNGs in this folder.',
    'Naming: `{look}__{material}__{engine}.png`',
    '',
    'Captured via Chrome headless + SwiftShader (visual reference, not GPU-faithful).',
    '',
  ]
  fs.writeFileSync(path.join(outDir, 'README.md'), index.join('\n'))
  console.log('matrix complete:', n, 'files')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
