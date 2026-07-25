#!/usr/bin/env node
/**
 * Slider MAD audit (Plano V3.4).
 *
 * - Dependent sliders run with parent pinned at max (dof-focus→dof, ascii-cell→ascii).
 * - afterimage measured over N frames with camera motion.
 * - Runs for both engines: physical + custom.
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
  'dispersion', 'thickness', 'ior', 'roughness', 'translucency', 'speckle',
  'bloom', 'dof', 'dof-focus', 'afterimage', 'halftone', 'ascii', 'ascii-cell',
  'chroma', 'vignette', 'grain', 'exposure', 'dpr', 'transmission-scale',
]

/** Child slider → parent that must be > 0 for the child to matter. */
const dependsOn = {
  'dof-focus': 'dof',
  'ascii-cell': 'ascii',
}

const engines = ['physical', 'custom']

const chromeCandidates = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
].filter(Boolean)

function parseBeforeMad(md) {
  /** @type {Record<string, number|null>} */
  const map = {}
  for (const line of md.split('\n')) {
    const m = line.match(/^\| `([^`]+)` \| .*?MAD=([0-9.]+)/)
    if (m) map[m[1]] = Number(m[2])
  }
  return map
}

async function auditEngine(page, engine) {
  await page.evaluate(async (e) => {
    await window.__prizm.setEngine(e)
    await window.__prizm.applyLook('studio')
    window.__prizm.lockCamera()
    window.__prizm.setAutoSpin(false)
  }, engine)
  await new Promise((r) => setTimeout(r, 600))

  const rows = []
  for (const id of sliders) {
    const result = await page.evaluate(async ({ sliderId, dependsOn: deps }) => {
      const el = document.getElementById(sliderId)
      if (!el) return { ok: false, reason: 'missing element' }

      const setVal = (node, v) => {
        node.value = String(v)
        node.dispatchEvent(new Event('input', { bubbles: true }))
        node.dispatchEvent(new Event('change', { bubbles: true }))
        window.__prizm.applyUi()
      }

      const parentId = deps[sliderId]
      let parentOriginal = null
      if (parentId) {
        const parent = document.getElementById(parentId)
        if (!parent) return { ok: false, reason: `missing parent ${parentId}` }
        parentOriginal = parent.value
        setVal(parent, parent.max)
      }

      const min = Number(el.min)
      const max = Number(el.max)
      const original = el.value

      // afterimage: needs temporal accumulation + motion
      if (sliderId === 'afterimage') {
        const cam = window.__prizm.camera
        const basePos = cam.position.clone()
        const madFor = async (amount) => {
          setVal(el, amount)
          // Reset trail by disabling then enabling
          window.__prizm.afterimagePass.enabled = false
          await window.__prizm.capturePixels(1)
          window.__prizm.afterimagePass.enabled = amount > 0.01
          for (let i = 0; i < 8; i++) {
            cam.position.set(
              basePos.x + Math.sin(i * 0.7) * 0.12,
              basePos.y + Math.cos(i * 0.5) * 0.06,
              basePos.z,
            )
            cam.lookAt(0, 0, 0)
            await window.__prizm.capturePixels(1)
          }
          return window.__prizm.capturePixels(1)
        }

        const a = await madFor(min)
        const b = await madFor(max)
        cam.position.copy(basePos)
        cam.lookAt(0, 0, 0)
        setVal(el, original)

        let sum = 0
        for (let i = 0; i < a.rgba.length; i++) sum += Math.abs(a.rgba[i] - b.rgba[i])
        return { ok: true, min, max, mad: sum / a.rgba.length, width: a.width, height: a.height, method: 'temporal+motion' }
      }

      // dpr: must resize between captures
      if (sliderId === 'dpr') {
        setVal(el, min)
        window.__prizm.applyUi()
        await new Promise((r) => requestAnimationFrame(() => r()))
        const a = await window.__prizm.capturePixels(1)
        setVal(el, max)
        window.__prizm.applyUi()
        await new Promise((r) => requestAnimationFrame(() => r()))
        const b = await window.__prizm.capturePixels(1)
        setVal(el, original)
        // Compare downsampled common size via MAD on raw buffers if same length,
        // else treat resolution change as alive when lengths differ.
        if (a.rgba.length !== b.rgba.length) {
          return { ok: true, min, max, mad: 999, width: a.width, height: a.height, method: 'resolution-change' }
        }
        let sum = 0
        for (let i = 0; i < a.rgba.length; i++) sum += Math.abs(a.rgba[i] - b.rgba[i])
        return { ok: true, min, max, mad: sum / a.rgba.length, width: a.width, height: a.height, method: 'static' }
      }

      setVal(el, min)
      const a = await window.__prizm.capturePixels(1)
      setVal(el, max)
      const b = await window.__prizm.capturePixels(1)
      setVal(el, original)

      if (parentId) {
        const parent = document.getElementById(parentId)
        setVal(parent, parentOriginal)
      }

      let sum = 0
      for (let i = 0; i < a.rgba.length; i++) sum += Math.abs(a.rgba[i] - b.rgba[i])
      return {
        ok: true,
        min,
        max,
        mad: sum / a.rgba.length,
        width: a.width,
        height: a.height,
        method: parentId ? `parent=${parentId}@max` : 'static',
      }
    }, { sliderId: id, dependsOn })

    if (!result.ok) {
      rows.push({ slider: id, changed: false, mad: null, note: result.reason })
      continue
    }

    const changed = result.mad >= MAD_DEAD
    rows.push({
      slider: id,
      changed,
      mad: result.mad,
      note: `MAD=${result.mad.toFixed(4)} @ ${result.width}×${result.height} (${result.method}; min=${result.min} max=${result.max})`,
    })
    console.log(`[${engine}]`, id, changed ? 'CHANGED' : 'DEAD/WEAK', result.mad.toFixed(4))
  }
  return rows
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
  await page.waitForFunction(
    () => Boolean(window.__prizm?.capturePixels && window.__prizm?.setEngine),
    { timeout: 60_000 },
  )
  await new Promise((r) => setTimeout(r, 1000))

  /** @type {Record<string, any[]>} */
  const byEngine = {}
  for (const engine of engines) {
    byEngine[engine] = await auditEngine(page, engine)
  }

  await browser.close()

  const lines = [
    '# Slider audit (after — Plano V3)',
    '',
    'Look: `studio`, camera locked, auto-spin off.',
    `Threshold: MAD < **${MAD_DEAD}** ⇒ dead / effectively dead.`,
    '',
    'Methodology (V3.4):',
    '- `dof-focus` / `ascii-cell` audited with parent slider pinned at max.',
    '- `afterimage` audited over 8 motion frames (not a single still).',
    '- Both engines: `physical` and `custom`.',
    '',
  ]

  for (const engine of engines) {
    const rows = byEngine[engine]
    const dead = rows.filter((r) => !r.changed)
    lines.push(`## Engine: \`${engine}\``, '')
    lines.push('| slider | mudou? | MAD | MAD before (V0 physical) | observação |')
    lines.push('| --- | --- | --- | --- | --- |')
    for (const row of rows) {
      const before = beforeMad[row.slider]
      const beforeStr = before != null ? before.toFixed(4) : '—'
      const afterStr = row.mad != null ? row.mad.toFixed(4) : '—'
      lines.push(
        `| \`${row.slider}\` | ${row.changed ? 'sim' : '**não**'} | ${afterStr} | ${beforeStr} | ${row.note} |`,
      )
    }
    lines.push('', `Dead / weak: **${dead.length}** / ${rows.length}`, '')
    if (dead.length) {
      lines.push('### Still open', '')
      for (const r of dead) lines.push(`- \`${r.slider}\` — ${r.note}`)
      lines.push('')
    }
  }

  lines.push(
    '## Classification',
    '',
    '- Methodology artifacts fixed above should no longer appear as false dead for dof-focus / ascii-cell / afterimage.',
    '- Remaining DEAD/WEAK rows are real product bugs or known capture limits (`dpr` if buffer path ignores resize).',
    '',
  )

  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, lines.join('\n'))
  console.log('wrote', outFile)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
