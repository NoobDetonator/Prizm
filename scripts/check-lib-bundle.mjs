#!/usr/bin/env node
/**
 * V3.6 — Confirm importing only src/lib/prizm does not pull demo/post into the chunk.
 */
import { build } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'dist-lib-check')
const entry = path.join(root, 'scripts', '_lib-entry.mjs')

fs.mkdirSync(path.dirname(entry), { recursive: true })
fs.writeFileSync(
  entry,
  `export { createPrism, createPrismStage, MATERIAL_PRESETS } from '../src/lib/prizm/index.js'\n`,
)

fs.rmSync(outDir, { recursive: true, force: true })

await build({
  configFile: false,
  root,
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    lib: {
      entry,
      name: 'PrizmLib',
      formats: ['es'],
      fileName: () => 'prizm-lib.js',
    },
    rollupOptions: {
      external: ['three', /^three\//],
    },
  },
})

const bundlePath = path.join(outDir, 'prizm-lib.js')
const code = fs.readFileSync(bundlePath, 'utf8')
const sizeKb = Math.round(fs.statSync(bundlePath).size / 1024)

const banned = [
  [/src\/demo\//, 'demo'],
  [/createPostStack|EffectComposer|LOOK_PRESETS/, 'post/demo stack'],
  [/slider-audit|capture-matrix/, 'audit scripts'],
]

let failed = false
for (const [re, label] of banned) {
  if (re.test(code)) {
    console.error('FAIL — lib bundle contains', label, re)
    failed = true
  }
}

// Soft size note (three is external)
console.log(`lib bundle: ${sizeKb} KB (three external)`)
assert.ok(!failed, 'lib bundle pulled demo/post code')
assert.ok(sizeKb < 250, `lib bundle unexpectedly large (${sizeKb} KB) with three external`)

// cleanup temp entry + out
fs.rmSync(entry, { force: true })
fs.rmSync(outDir, { recursive: true, force: true })

console.log('OK — lib tree-shake boundary holds')
console.log(`  size: ${sizeKb} KB (three external)`)
console.log('  no demo/post in bundle')
