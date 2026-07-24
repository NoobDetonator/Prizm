#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outFile = path.join(root, 'docs', 'visibility-audit.md')
const baseUrl = process.argv[2] || 'http://127.0.0.1:5173/'
const MAD_DEAD = 0.05

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--window-size=960,540'],
    defaultViewport: { width: 960, height: 540, deviceScaleFactor: 1 },
  })
  const page = await browser.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => window.__prizm?.capturePixels)
  await new Promise((r) => setTimeout(r, 900))

  const rows = await page.evaluate(async (threshold) => {
    const p = window.__prizm
    p.applyLook('studio')
    p.lockCamera()
    p.setAutoSpin(false)

    const targets = []
    p.scene.traverse((obj) => {
      if ((obj.isMesh || obj.isPoints || obj.isLineSegments) && obj.visible) {
        targets.push(obj)
      }
    })

    const full = await p.capturePixels(1)
    const results = []

    for (const obj of targets) {
      obj.visible = false
      const hidden = await p.capturePixels(1)
      obj.visible = true
      let sum = 0
      for (let i = 0; i < full.rgba.length; i++) sum += Math.abs(full.rgba[i] - hidden.rgba[i])
      const mad = sum / full.rgba.length
      results.push({
        name: obj.name || obj.parent?.name || obj.type,
        uuid: obj.uuid.slice(0, 8),
        mad,
        dead: mad < threshold,
      })
    }
    return results
  }, MAD_DEAD)

  await browser.close()

  const dead = rows.filter((r) => r.dead)
  const lines = [
    '# Visibility audit (after T1.1–T1.4)',
    '',
    'Look `studio`, locked camera. Hide one mesh at a time; MAD < **' + MAD_DEAD + '** ⇒ dead.',
    '',
    '| object | MAD | contributes? |',
    '| --- | --- | --- |',
    ...rows
      .sort((a, b) => a.mad - b.mad)
      .map((r) => '| `' + r.name + '` (' + r.uuid + ') | ' + r.mad.toFixed(4) + ' | ' + (r.dead ? '**dead**' : 'yes') + ' |'),
    '',
    'Dead objects: **' + dead.length + '** / ' + rows.length,
    '',
  ]
  fs.writeFileSync(outFile, lines.join('\n'))
  console.log(lines.join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
