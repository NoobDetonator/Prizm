#!/usr/bin/env node
/**
 * D2 — 50× createPrism → attach → dispose; memory deltas must be ~0.
 * Writes docs/leak-test.md
 *
 * Usage: node scripts/leak-test.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outFile = path.join(root, 'docs', 'leak-test.md')
const baseUrl = process.argv[2] || 'http://127.0.0.1:5173/'
const CYCLES = 50

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

async function main() {
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
      '--window-size=640,360',
    ],
    defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
  })

  const page = await browser.newPage()
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => Boolean(window.__prizm?.runLeakTest), { timeout: 60_000 })
  await new Promise((r) => setTimeout(r, 800))

  const result = await page.evaluate(async (cycles) => window.__prizm.runLeakTest(cycles), CYCLES)
  await browser.close()

  const lines = [
    '# Leak test (D2)',
    '',
    `\`${CYCLES}×\` \`createPrism → attach → detach → dispose\` (custom + physical alternating).`,
    '',
    `| metric | before | after | Δ |`,
    `| --- | --- | --- | --- |`,
    `| geometries | ${result.before?.geometries} | ${result.after?.geometries} | **${result.deltaGeo ?? 'n/a'}** |`,
    `| textures | ${result.before?.textures} | ${result.after?.textures} | **${result.deltaTex ?? 'n/a'}** |`,
    '',
    result.ok
      ? '**PASS** — memory deltas are zero.'
      : `**FAIL** — ${result.reason || `non-zero delta (geo ${result.deltaGeo}, tex ${result.deltaTex})`}.`,
    '',
    'Note: measured via `renderer.info.memory` in Chrome headless + SwiftShader.',
    '',
  ]
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, lines.join('\n'))
  console.log(lines.join('\n'))
  if (!result.ok) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
