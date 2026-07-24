import * as THREE from 'three'
import {
  ENV_QUALITY,
  buildPmremFromEquirect,
  canvasToFloatEquirect,
} from './buildPmremFromEquirect.js'

/**
 * Canvas-painted artistic IBL plates → true float linear equirect → PMREM.
 * Not physically metered — art-directed lighting for the prism demo.
 */

export const ARTISTIC_ENV_PRESETS = {
  gradientStudio: {
    id: 'gradientStudio',
    label: 'Gradient studio',
    note: 'soft window · cool/warm split',
    exposure: 1.65,
    highlightBoost: 5.5,
    paint(ctx, w, h) {
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, '#9eb6d4')
      sky.addColorStop(0.45, '#e8eef5')
      sky.addColorStop(1, '#c4a88a')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      softRect(ctx, w * 0.08, h * 0.12, w * 0.22, h * 0.55, 'rgba(255,252,245,0.95)', 56)
      softRect(ctx, w * 0.12, h * 0.18, w * 0.14, h * 0.4, 'rgba(200,230,255,0.55)', 36)
      softRect(ctx, w * 0.68, h * 0.2, w * 0.26, h * 0.5, 'rgba(255,180,120,0.55)', 68)
      softDisc(ctx, w * 0.78, h * 0.28, w * 0.08, 'rgba(255,240,210,0.95)')
      softRect(ctx, 0, h * 0.72, w, h * 0.28, 'rgba(255,220,190,0.35)', 10)
    },
  },

  neonAlley: {
    id: 'neonAlley',
    label: 'Neon alley',
    note: 'magenta / cyan strips · night',
    exposure: 1.35,
    highlightBoost: 9,
    paint(ctx, w, h) {
      ctx.fillStyle = '#05040a'
      ctx.fillRect(0, 0, w, h)

      const fog = ctx.createRadialGradient(w * 0.5, h * 0.55, 10, w * 0.5, h * 0.55, w * 0.55)
      fog.addColorStop(0, 'rgba(40,10,60,0.9)')
      fog.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = fog
      ctx.fillRect(0, 0, w, h)

      neonStrip(ctx, w * 0.18, h * 0.1, w * 0.03, h * 0.7, '#ff2bd6', '#ff7ae8')
      neonStrip(ctx, w * 0.32, h * 0.15, w * 0.02, h * 0.6, '#00e5ff', '#7af0ff')
      neonStrip(ctx, w * 0.7, h * 0.08, w * 0.025, h * 0.75, '#ff4d00', '#ffb000')
      neonStrip(ctx, w * 0.82, h * 0.2, w * 0.018, h * 0.5, '#7bff4a', '#c8ff90')

      softDisc(ctx, w * 0.5, h * 0.25, w * 0.055, 'rgba(255,255,255,1)')
      softDisc(ctx, w * 0.25, h * 0.75, w * 0.05, 'rgba(255,80,200,0.55)')
      softDisc(ctx, w * 0.75, h * 0.7, w * 0.05, 'rgba(80,220,255,0.5)')
    },
  },

  paperSky: {
    id: 'paperSky',
    label: 'Paper sky',
    note: 'bright print-shop plate',
    exposure: 1.45,
    highlightBoost: 3.2,
    paint(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, '#f7f3ea')
      g.addColorStop(0.35, '#ffffff')
      g.addColorStop(0.7, '#e4eef8')
      g.addColorStop(1, '#f0d8c8')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      softDisc(ctx, w * 0.2, h * 0.3, w * 0.18, 'rgba(0,180,255,0.18)')
      softDisc(ctx, w * 0.55, h * 0.35, w * 0.16, 'rgba(255,0,140,0.14)')
      softDisc(ctx, w * 0.75, h * 0.55, w * 0.2, 'rgba(255,220,0,0.16)')
      softDisc(ctx, w * 0.4, h * 0.7, w * 0.22, 'rgba(40,40,40,0.08)')
      softRect(ctx, w * 0.4, h * 0.08, w * 0.35, h * 0.2, 'rgba(255,255,255,0.9)', 44)
    },
  },

  emberHall: {
    id: 'emberHall',
    label: 'Ember hall',
    note: 'hot corridor · copper bounce',
    exposure: 1.55,
    highlightBoost: 7,
    paint(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#1a0c08')
      g.addColorStop(0.5, '#3a1810')
      g.addColorStop(1, '#120805')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      softRect(ctx, w * 0.35, h * 0.05, w * 0.3, h * 0.9, 'rgba(255,120,40,0.35)', 24)
      softRect(ctx, w * 0.42, h * 0.1, w * 0.16, h * 0.8, 'rgba(255,200,120,0.55)', 14)
      softDisc(ctx, w * 0.5, h * 0.2, w * 0.1, 'rgba(255,240,200,1)')
      softDisc(ctx, w * 0.2, h * 0.65, w * 0.12, 'rgba(180,40,10,0.45)')
      softDisc(ctx, w * 0.82, h * 0.55, w * 0.1, 'rgba(255,80,20,0.4)')
    },
  },

  iceRink: {
    id: 'iceRink',
    label: 'Ice rink',
    note: 'cold white · blue bounce',
    exposure: 1.5,
    highlightBoost: 4,
    paint(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#d8e8f8')
      g.addColorStop(0.55, '#f4f8fc')
      g.addColorStop(1, '#a8c4d8')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      softRect(ctx, w * 0.1, h * 0.15, w * 0.8, h * 0.2, 'rgba(255,255,255,0.92)', 34)
      softRect(ctx, 0, h * 0.65, w, h * 0.35, 'rgba(160,210,255,0.35)', 12)
      softDisc(ctx, w * 0.3, h * 0.4, w * 0.12, 'rgba(120,190,255,0.35)')
      softDisc(ctx, w * 0.7, h * 0.35, w * 0.1, 'rgba(255,255,255,0.9)')
      neonStrip(ctx, w * 0.15, h * 0.55, w * 0.7, h * 0.015, '#7ad0ff', '#e8f6ff')
    },
  },
}

export const DEFAULT_ARTISTIC_ENV = 'gradientStudio'

/**
 * @param {THREE.WebGLRenderer} renderer
 * @param {string} presetId
 * @param {{ quality?: 'medium'|'high' }} [options]
 */
export function createArtisticEnvironment(renderer, presetId = DEFAULT_ARTISTIC_ENV, options = {}) {
  const recipe = ARTISTIC_ENV_PRESETS[presetId] ?? ARTISTIC_ENV_PRESETS[DEFAULT_ARTISTIC_ENV]
  const quality = ENV_QUALITY[options.quality] ?? ENV_QUALITY.high
  const width = quality.equirectWidth
  const height = width / 2

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  recipe.paint(ctx, width, height)

  // Soft equirect seam (darken wrap edge — less obvious on glass).
  const seam = ctx.createLinearGradient(0, 0, width, 0)
  seam.addColorStop(0, 'rgba(0,0,0,0.45)')
  seam.addColorStop(0.03, 'rgba(0,0,0,0)')
  seam.addColorStop(0.97, 'rgba(0,0,0,0)')
  seam.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = seam
  ctx.fillRect(0, 0, width, height)

  // LDR canvas → float linear radiance (highlights can exceed 1.0).
  const equirect = canvasToFloatEquirect(canvas, {
    exposure: recipe.exposure,
    highlightBoost: recipe.highlightBoost ?? 4.5,
  })

  return buildPmremFromEquirect(renderer, equirect, {
    kind: 'artistic-float',
    preset: recipe.id,
    label: recipe.label,
    note: recipe.note,
    exposure: recipe.exposure,
    quality: quality.label,
    equirectSize: [width, height],
  })
}

export { ENV_QUALITY }

function softDisc(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function softRect(ctx, x, y, w, h, color, blur) {
  ctx.save()
  ctx.filter = `blur(${blur}px)`
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

function neonStrip(ctx, x, y, w, h, core, glow) {
  ctx.save()
  ctx.filter = 'blur(22px)'
  ctx.fillStyle = glow
  ctx.fillRect(x - w, y - h * 0.05, w * 3, h * 1.1)
  ctx.filter = 'blur(5px)'
  ctx.fillStyle = core
  ctx.fillRect(x, y, w, h)
  ctx.filter = 'none'
  ctx.fillStyle = '#ffffff'
  ctx.globalAlpha = 0.9
  ctx.fillRect(x + w * 0.25, y, w * 0.5, h)
  ctx.globalAlpha = 1
  ctx.restore()
}
