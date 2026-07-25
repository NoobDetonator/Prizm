import {
  createPrismEnvironment,
  PROCEDURAL_ENV_PRESETS,
} from '../env/createPrismEnvironment.js'
import {
  createArtisticEnvironment,
  ARTISTIC_ENV_PRESETS,
} from '../env/createArtisticEnvironment.js'
import { loadArtisticImageEnvironment } from '../env/loadImageEnvironment.js'
import { loadHdrEnvironment } from '../env/loadHdrEnvironment.js'

function pickEnvQuality() {
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('envQuality')
  if (forced === 'high' || forced === 'medium') return forced

  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '')
  if (mobile) return 'medium'
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return 'medium'
  return 'high'
}

export function createEnvironmentManager({ renderer, scene, ui }) {
  const environmentCache = new Map()
  let envQuality = pickEnvQuality()
  let activeEnvironment = createPrismEnvironment(renderer, 'spectral', { quality: envQuality })
  environmentCache.set('proc:spectral', activeEnvironment)
  scene.environment = activeEnvironment
  let referenceEnvironment = null
  let hdrEnvironment = null

  function syncEnvNote(kind) {
    if (!ui.envNote) return
    if (kind?.startsWith('proc:')) {
      const id = kind.slice(5)
      ui.envNote.textContent = PROCEDURAL_ENV_PRESETS[id]?.note || 'procedural float HDR'
      return
    }
    if (kind?.startsWith('art:')) {
      const id = kind.slice(4)
      ui.envNote.textContent = ARTISTIC_ENV_PRESETS[id]?.note || 'artistic plate'
      return
    }
    if (kind === 'reference') {
      ui.envNote.textContent = 'LDR reference PNG · creative plate'
      return
    }
    if (kind === 'hdr') {
      ui.envNote.textContent = 'Radiance .hdr from /assets/studio.hdr'
      return
    }
    if (kind === 'procedural') ui.envNote.textContent = PROCEDURAL_ENV_PRESETS.spectral.note
  }

  async function ensureEnvironment(kind) {
    if (kind === 'procedural') kind = 'proc:spectral'

    if (environmentCache.has(kind)) return environmentCache.get(kind)

    if (kind.startsWith('proc:')) {
      const id = kind.slice(5)
      const env = createPrismEnvironment(renderer, id, { quality: envQuality })
      environmentCache.set(kind, env)
      return env
    }

    if (kind.startsWith('art:')) {
      const id = kind.slice(4)
      const env = createArtisticEnvironment(renderer, id, { quality: envQuality })
      environmentCache.set(kind, env)
      return env
    }

    if (kind === 'reference') {
      if (!referenceEnvironment) {
        referenceEnvironment = await loadArtisticImageEnvironment(
          renderer,
          '/assets/prism-environment-reference.png',
          { exposure: 1.7, quality: envQuality, highlightBoost: 5.5 },
        )
      }
      environmentCache.set('reference', referenceEnvironment)
      return referenceEnvironment
    }

    if (kind === 'hdr') {
      if (!hdrEnvironment) {
        hdrEnvironment = await loadHdrEnvironment(renderer, '/assets/studio.hdr')
      }
      environmentCache.set('hdr', hdrEnvironment)
      return hdrEnvironment
    }

    throw new Error(`Unknown environment: ${kind}`)
  }

  async function switchEnvironment(kind) {
    try {
      const env = await ensureEnvironment(kind)
      scene.environment = env
      scene.environmentRotation.y = kind.startsWith('art:') || kind === 'reference' ? 0.55 : 0
      activeEnvironment = env
      syncEnvNote(kind)
    } catch (error) {
      console.warn(`Environment "${kind}" failed — falling back to proc:spectral.`, error)
      ui.envSource.value = 'proc:spectral'
      const env = await ensureEnvironment('proc:spectral')
      scene.environment = env
      scene.environmentRotation.y = 0
      activeEnvironment = env
      syncEnvNote('proc:spectral')
    }
    if (window.__prizm) window.__prizm.environment = activeEnvironment
  }

  async function setEnvQuality(quality) {
    if (quality !== 'high' && quality !== 'medium') return envQuality
    if (quality === envQuality) return envQuality
    envQuality = quality
    const current = ui.envSource?.value || 'proc:spectral'
    environmentCache.clear()
    referenceEnvironment = null
    hdrEnvironment = null
    await switchEnvironment(current)
    return envQuality
  }

  function listEnvironments() {
    return {
      procedural: Object.values(PROCEDURAL_ENV_PRESETS).map((p) => ({
        id: `proc:${p.id}`,
        label: p.label,
        note: p.note,
      })),
      artistic: [
        ...Object.values(ARTISTIC_ENV_PRESETS).map((p) => ({
          id: `art:${p.id}`,
          label: p.label,
          note: p.note,
        })),
        { id: 'reference', label: 'Reference PNG', note: 'LDR creative plate' },
      ],
    }
  }

  return {
    get activeEnvironment() {
      return activeEnvironment
    },
    get envQuality() {
      return envQuality
    },
    syncEnvNote,
    switchEnvironment,
    setEnvQuality,
    listEnvironments,
  }
}
