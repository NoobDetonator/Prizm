import * as THREE from 'three'

/**
 * Artistic LDR image → equirectangular PMREM.
 * This is NOT physically correct IBL (PNG poles distort; values clamp at 1.0).
 * Kept as a creative lighting plate. Use `exposure` to push some dynamic range
 * into the canvas before PMREM so speculars can still bloom.
 */
export async function loadArtisticImageEnvironment(renderer, url, options = {}) {
  const size = options.size ?? 2048
  const saturation = options.saturation ?? 1.28
  const contrast = options.contrast ?? 1.18
  const brightness = options.brightness ?? 1.08
  const exposure = options.exposure ?? 2.0

  const source = await new THREE.TextureLoader().loadAsync(url)
  const image = source.image
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2
  const ctx = canvas.getContext('2d')
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

  // Bake exposure into the LDR plate so PMREM gets brighter midtones/highlights.
  ctx.filter = `saturate(${saturation}) contrast(${contrast}) brightness(${brightness * exposure})`
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'

  const seam = ctx.createLinearGradient(0, 0, canvas.width, 0)
  seam.addColorStop(0, 'rgba(0,0,0,0.88)')
  seam.addColorStop(0.045, 'rgba(0,0,0,0)')
  seam.addColorStop(0.955, 'rgba(0,0,0,0)')
  seam.addColorStop(1, 'rgba(0,0,0,0.88)')
  ctx.fillStyle = seam
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const equirectangular = new THREE.CanvasTexture(canvas)
  equirectangular.mapping = THREE.EquirectangularReflectionMapping
  equirectangular.colorSpace = THREE.SRGBColorSpace
  equirectangular.minFilter = THREE.LinearFilter
  equirectangular.magFilter = THREE.LinearFilter
  equirectangular.needsUpdate = true

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const environment = pmrem.fromEquirectangular(equirectangular).texture
  environment.userData.source = url
  environment.userData.kind = 'artistic-ldr'
  environment.userData.exposure = exposure
  environment.userData.sourceSize = [image.width, image.height]

  source.dispose()
  equirectangular.dispose()
  pmrem.dispose()
  return environment
}

/** @deprecated use loadArtisticImageEnvironment */
export const loadImageEnvironment = loadArtisticImageEnvironment
