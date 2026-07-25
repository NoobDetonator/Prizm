#!/usr/bin/env node
/**
 * D1 — Re-run slider MAD audit and compare against docs/slider-audit-before.md.
 * Writes docs/slider-audit-after.md
 *
 * Usage: node scripts/slider-audit-after.mjs [baseUrl]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outFile = path.join(root, 'docs', 'slider-audit-after.md')
const beforeFile = path.join(root, 'docs', 'slider-audit-before.md')
const baseUrl = process.argv[2] || 'http://127.0.0.1:5173/'
const MAD_DEAD = 0.15

const sliders = [
  'dispersion', 'thickness', 'ior', 'roughness', 'translucency', 'speckle', 'caustics',
  'bloom', 'glare', 'flare', 'dof', 'dof-focus', 'afterimage', 'halftone', 'ascii', 'ascii-cell',
  'chroma', 'vignette', 'grain', 'exposure', 'dpr', 'transmission-scale',
]

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

function parseBeforeMad(md) {
  /** @type {Record<string, number|null>} */
  const map = {}
  for (const line of md.split('\n')) {
    const m = line.match(/^\| `([^`]+)` \| .* \| MAD=([0-9.]+)/)
    if (m) map[m[1]] = Number(m[2])
    else if (line.match(/^\| `([^`]+)` \|/)) {
      const id = line.match(/^\| `([^`]+)` \|/)[1]
      if (!(id in map)) map[id] = null
    }
  }
  return map
}

async function main() {
  const executablePath = chromeCandidates.find((c) => fs.existsSync(c))
  if (!executablePath) throw new Error('Chrome not found')

  const beforeMad = fs.existsSync(beforeFile) ? parseBeforeMad(fs.readFileSync(beforeFile, 'utf8')) : {}

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
  await page.goto(baseUrl, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => Boolean(window.__prizm?.capturePixels), { timeout: 60_000 })
  await new Promise((r) => setTimeout(r, 1200))
  await page.evaluate(() => {
    window.__prizm.applyLook('studio')
    window.__prizm.lockCamera()
    window.__prizm.setAutoSpin(false)
  })
  await new Promise((r) => setTimeout(r, 500))

  const rows = []
  for (const id of sliders) {
    const result = await page.evaluate(async (sliderId) => {
      const el = document.getElementById(sliderId)
      if (!el) return { ok: false, reason: 'missing element' }

      const min = Number(el.min)
      const max = Number(el.max)
      const original = el.value

      const setVal = (v) => {
        el.value = String(v)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        window.__prizm.applyUi()
      }

      setVal(min)
      const a = await window.__prizm.capturePixels(1)
      setVal(max)
      const b = await window.__prizm.capturePixels(1)
      setVal(original)

      let sum = 0
      const n = a.rgba.length
      for (let i = 0; i < n; i++) sum += Math.abs(a.rgba[i] - b.rgba[i])
      return { ok: true, min, max, mad: sum / n, width: a.width, height: a.height }
    }, id)

    if (!result.ok) {
      rows.push({ slider: id, changed: false, mad: null, note: result.reason })
      continue
    }

    const changed = result.mad >= MAD_DEAD
    rows.push({
      slider: id,
      changed,
      mad: result.mad,
      note: `MAD=${result.mad.toFixed(4)} @ ${result.width}×${result.height} (min=${result.min} max=${result.max})`,
    })
    console.log(id, changed ? 'CHANGED' : 'DEAD/WEAK', result.mad.toFixed(4))
  }

  await browser.close()

  const dead = rows.filter((r) => !r.changed)
  const lines = [
    '# Slider audit (after — Plano V2)',
    '',
    'Look: `studio`, camera locked, auto-spin off.',
    'Method: set slider min → capture RGBA → set max → capture → mean absolute channel difference (MAD).',
    `Threshold: MAD < **${MAD_DEAD}** ⇒ dead / effectively dead.`,
    'Engine: demo default (`physical` via `createPrism`).',
    '',
    '| slider | mudou? | MAD after | MAD before | Δ MAD | observação |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => {
      const before = beforeMad[row.slider]
      const after = row.mad
      const delta =
        after != null && before != null ? (after - before).toFixed(4) : '—'
      const beforeStr = before != null ? before.toFixed(4) : '—'
      const afterStr = after != null ? after.toFixed(4) : '—'
      return `| \`${row.slider}\` | ${row.changed ? 'sim' : '**não**'} | ${afterStr} | ${beforeStr} | ${delta} | ${row.note} |`
    }),
    '',
    `Dead / weak count: **${dead.length}** / ${rows.length}`,
    '',
    '## Open bugs (MAD ≈ 0)',
    '',
    ...(dead.length
      ? dead.map((r) => `- \`${r.slider}\` — ${r.note}`)
      : ['- none']),
    '',
    '## Notas',
    '',
    '- Any slider with MAD ≈ 0 is an **open bug**, not a completed checklist item.',
    '- `dpr` may report low MAD if capture path re-reads at the same buffer size.',
    '- Re-run with engine=`custom` separately if comparing custom roughness / dispersion.',
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
