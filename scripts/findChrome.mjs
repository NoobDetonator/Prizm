import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Cross-platform Chrome discovery for the puppeteer-driven gates.
 *
 * Previously every script hardcoded two Linux paths, so `test:leak`,
 * `audit:sliders` and `capture:matrix` only ran inside the cloud VM and failed
 * with "Chrome not found" on the machine the project is actually developed on.
 */
export function findChrome() {
  const candidates = [process.env.CHROME_PATH]

  if (process.platform === 'win32') {
    const programFiles = process.env['PROGRAMFILES'] || 'C:\\Program Files'
    const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    candidates.push(
      path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
      path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
      path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    )
  } else {
    candidates.push(
      '/usr/local/bin/google-chrome',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    )
  }

  const found = candidates.filter(Boolean).find((c) => fs.existsSync(c))
  if (!found) {
    throw new Error(
      `Chrome not found on ${process.platform}. Set CHROME_PATH=/path/to/chrome and re-run.\n` +
        `Tried:\n${candidates.filter(Boolean).map((c) => `  ${c}`).join('\n')}`,
    )
  }
  return found
}

/** Flags shared by every headless gate. SwiftShader keeps results comparable across machines. */
export const HEADLESS_GL_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--enable-webgl',
  '--ignore-gpu-blocklist',
]
