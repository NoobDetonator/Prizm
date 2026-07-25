import * as THREE from 'three'
import {
  ENV_QUALITY,
  buildPmremFromEquirect,
  canvasToFloatEquirect,
} from './buildPmremFromEquirect.js'

/**
 * Artistic LDR image → float linear equirect → PMREM.
 * Not physically correct IBL (PNG poles distort), but highlights now exceed 1.0
 * so glass speculars / bloom can spark instead of hard-clipping at white.
 */
export async function loadArtisticImageEnvironment(renderer, url, options = {}) {
  const quality = ENV_QUALITY[options.quality] ?? ENV_QUALITY.high
  const size = options.size ?? quality.equirectWidth
  const saturation = options.saturation ?? 1.22
  const contrast = options.contrast ?? 1.12
  const brightness = options.brightness ?? 1.05
  const exposure = options.exposure ?? 1.7
  const highlightBoost = options.highlightBoost ?? 5.5

  const source = await new THREE.TextureLoader().loadAsync(url)
  const image = source.image
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const sourceAspect = image.width / image.height
  const targetAspect = canvas.width / canvas.height
  let sx = 0
  let sy = 0
  let sw = image.width
  let sh = image.height

  if (sourceAspect < targetAspect) {
    sh = image.width / targetAspect
    sy = (image.height - sh) / 2
  } else if (sourceAspect > targetAspect) {
    sw = image.height * targetAspect
    sx = (image.width - sw) / 2
  }

  // Grade in LDR first (canvas filters), then expand to float radiance.
  ctx.filter = `saturate(${saturation}) contrast(${contrast}) brightness(${brightness})`
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'

  const seam = ctx.createLinearGradient(0, 0, canvas.width, 0)
  seam.addColorStop(0, 'rgba(0,0,0,0.7)')
  seam.addColorStop(0.035, 'rgba(0,0,0,0)')
  seam.addColorStop(0.965, 'rgba(0,0,0,0)')
  seam.addColorStop(1, 'rgba(0,0,0,0.7)')
  ctx.fillStyle = seam
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const equirect = canvasToFloatEquirect(canvas, { exposure, highlightBoost })
  source.dispose()

  return buildPmremFromEquirect(renderer, equirect, {
    source: url,
    kind: 'artistic-ldr-float',
    exposure,
    highlightBoost,
    sourceSize: [image.width, image.height],
    quality: quality.label,
    equirectSize: [canvas.width, canvas.height],
  })
}
