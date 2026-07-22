import * as THREE from 'three'

/**
 * Turns an ordinary reference image into a lighting-ready equirectangular
 * environment. The source remains LDR, but the PMREM output behaves like an
 * artistic image-based lighting rig for reflections and transmission.
 */
export async function loadImageEnvironment(renderer, url, options = {}) {
  const size = options.size ?? 2048
  const saturation = options.saturation ?? 1.28
  const contrast = options.contrast ?? 1.18
  const brightness = options.brightness ?? 1.08

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

  ctx.filter = `saturate(${saturation}) contrast(${contrast}) brightness(${brightness})`
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  ctx.filter = 'none'

  // Dark, matching borders make the longitude seam disappear in reflections.
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
  environment.userData.sourceSize = [image.width, image.height]
  environment.userData.projectionSize = [canvas.width, canvas.height]

  source.dispose()
  equirectangular.dispose()
  pmrem.dispose()
  return environment
}
