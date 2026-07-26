#!/usr/bin/env node
/**
 * Capture polished GitHub preview images (clean HUD, locked camera).
 * Usage: node scripts/capture-previews.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'
import { findChrome } from './findChrome.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'docs', 'preview')
const baseUrl = process.argv[2] || 'http://localhost:5173/'

const shots = [
  // Heroes for README top
  {
    file: 'hero-studio.png',
    look: 'studio',
    env: 'proc:midnight',
    exposure: 1.05,
    envIntensity: 2.4,
    w: 1600,
    h: 900,
  },
  {
    file: 'hero-spectral.png',
    look: 'studio',
    env: 'proc:spectral',
    exposure: 0.92,
    envIntensity: 1.85,
    w: 1600,
    h: 900,
  },
  {
    file: 'hero-neon.png',
    look: 'anamorphic',
    env: 'art:neonAlley',
    exposure: 1.0,
    envIntensity: 2.2,
    w: 1600,
    h: 900,
  },

  // Look gallery
  { file: 'look-anamorphic.png', look: 'anamorphic', env: 'proc:disco', exposure: 0.95, envIntensity: 1.7, w: 1280, h: 720 },
  { file: 'look-portrait.png', look: 'portrait', env: 'art:gradientStudio', exposure: 1.05, envIntensity: 2.0, w: 1280, h: 720 },
  { file: 'look-neon-ascii.png', look: 'neonAscii', env: 'art:neonAlley', exposure: 1.1, envIntensity: 2.3, w: 1280, h: 720 },
  { file: 'look-ghost-trail.png', look: 'ghostTrail', env: 'proc:midnight', exposure: 1.05, envIntensity: 2.3, w: 1280, h: 720 },
  { file: 'look-print-shop.png', look: 'printShop', env: 'art:paperSky', exposure: 1.0, envIntensity: 1.9, w: 1280, h: 720 },
  { file: 'look-prism-chaos.png', look: 'prismChaos', env: 'proc:aurora', exposure: 0.95, envIntensity: 2.0, w: 1280, h: 720 },

  // Environment showcases
  { file: 'env-spectral.png', look: 'studio', env: 'proc:spectral', exposure: 0.92, envIntensity: 1.8, w: 1280, h: 720 },
  { file: 'env-midnight.png', look: 'studio', env: 'proc:midnight', exposure: 1.05, envIntensity: 2.5, w: 1280, h: 720 },
  { file: 'env-tungsten.png', look: 'studio', env: 'proc:tungsten', exposure: 0.88, envIntensity: 1.55, w: 1280, h: 720 },
  { file: 'env-disco.png', look: 'anamorphic', env: 'proc:disco', exposure: 0.9, envIntensity: 1.6, w: 1280, h: 720 },
  { file: 'env-aurora.png', look: 'studio', env: 'proc:aurora', exposure: 0.95, envIntensity: 2.1, w: 1280, h: 720 },
  { file: 'env-overcast.png', look: 'portrait', env: 'proc:overcast', exposure: 1.0, envIntensity: 1.5, w: 1280, h: 720 },
  { file: 'env-gradient-studio.png', look: 'studio', env: 'art:gradientStudio', exposure: 1.0, envIntensity: 2.0, w: 1280, h: 720 },
  { file: 'env-neon-alley.png', look: 'anamorphic', env: 'art:neonAlley', exposure: 1.0, envIntensity: 2.2, w: 1280, h: 720 },
  { file: 'env-paper-sky.png', look: 'printShop', env: 'art:paperSky', exposure: 1.0, envIntensity: 1.85, w: 1280, h: 720 },
  { file: 'env-ember-hall.png', look: 'studio', env: 'art:emberHall', exposure: 0.9, envIntensity: 1.9, w: 1280, h: 720 },
  { file: 'env-ice-rink.png', look: 'portrait', env: 'art:iceRink', exposure: 1.0, envIntensity: 1.75, w: 1280, h: 720 },
]

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
      '--window-size=1600,900',
    ],
    defaultViewport: null,
  })

  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('pageerror', e.message))

  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
  await page.goto(baseUrl, { waitUntil: 'networkidle0', timeout: 60000 })
  await page.waitForFunction(
    () => window.__prizm?.lockCamera && window.__prizm?.setEnvironment && window.__prizm?.setRenderControls,
    { timeout: 30000 },
  )

  for (const shot of shots) {
    await page.setViewport({ width: shot.w, height: shot.h, deviceScaleFactor: 1 })
    await page.evaluate(async (cfg) => {
      const api = window.__prizm
      api.setUiVisible(false)
      api.setAutoSpin(false)
      api.lockCamera()
      api.applyLook(cfg.look)
      api.setRenderControls({
        exposure: cfg.exposure,
        envIntensity: cfg.envIntensity,
        dpr: 1.5,
      })
      await api.setEnvironment(cfg.env)
      await new Promise((r) => setTimeout(r, 500))
      api.lockCamera()
    }, shot)
    await new Promise((r) => setTimeout(r, 1000))
    const dest = path.join(outDir, shot.file)
    await page.screenshot({ path: dest, type: 'png' })
    console.log('wrote', path.relative(root, dest))
  }

  const libShots = [
    { url: new URL('examples/box.html', baseUrl).href, file: 'lib-box.png' },
    { url: new URL('examples/two-prisms.html', baseUrl).href, file: 'lib-two.png' },
    { url: new URL('examples/gltf.html', baseUrl).href, file: 'lib-assembly.png' },
  ]
  for (const shot of libShots) {
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 })
    await page.goto(shot.url, { waitUntil: 'networkidle0', timeout: 45000 })
    await new Promise((r) => setTimeout(r, 2200))
    const dest = path.join(outDir, shot.file)
    await page.screenshot({ path: dest, type: 'png' })
    console.log('wrote', path.relative(root, dest))
  }

  await browser.close()

  const md = [
    '# Preview gallery',
    '',
    'Generated by `node scripts/capture-previews.mjs`.',
    '',
    '## Heroes',
    '- `hero-studio.png` · studio / midnight',
    '- `hero-spectral.png` · studio / spectral',
    '- `hero-neon.png` · anamorphic / neon alley',
    '',
    '## Looks',
    ...shots.filter((s) => s.file.startsWith('look')).map((s) => `- \`${s.file}\` · ${s.look} / ${s.env}`),
    '',
    '## Environments',
    ...shots.filter((s) => s.file.startsWith('env')).map((s) => `- \`${s.file}\` · ${s.env}`),
    '',
    '## Library',
    '- `lib-box.png`',
    '- `lib-two.png`',
    '- `lib-assembly.png`',
    '',
  ].join('\n')
  fs.writeFileSync(path.join(outDir, 'README.md'), md)
  console.log('done')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
