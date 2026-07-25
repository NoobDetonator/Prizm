export async function exportRender(ctx, scale = 2) {
  const {
    exportInProgress,
    setExportInProgress,
    renderer,
    composer,
    cubeMask,
    scene,
    camera,
    selectivePass,
    cleanSavePass,
    asciiPass,
    bloomPass,
    glarePass,
    flarePass,
    ui,
    onResize,
  } = ctx

  if (exportInProgress()) return
  setExportInProgress(true)
  const previousText = ui.export.textContent
  ui.export.disabled = true
  ui.export.textContent = 'Renderizando…'

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxScale = Math.min(2.5, 4096 / Math.max(viewportWidth, viewportHeight))
  const exportScale = Math.max(1, Math.min(scale, maxScale))
  const width = Math.round(viewportWidth * exportScale)
  const height = Math.round(viewportHeight * exportScale)

  try {
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    composer.setPixelRatio(1)
    composer.setSize(width, height)
    cubeMask.setSize(width, height)
    cubeMask.renderMask(renderer, scene, camera)
    selectivePass.setMaskTexture(cubeMask.texture)
    selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
    asciiPass.setMaskTexture(cubeMask.texture)
    bloomPass.setMaskTexture(cubeMask.texture)
    glarePass.setMaskTexture(cubeMask.texture)
    flarePass.setMaskTexture(cubeMask.texture)
    asciiPass.setSize(width, height)
    composer.render()

    const blob = await new Promise((resolve, reject) => {
      ctx.canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('PNG export failed'))), 'image/png')
    })
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(blob)
    link.href = objectUrl
    link.download = `prizm-${width}x${height}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } finally {
    setExportInProgress(false)
    ui.export.disabled = false
    ui.export.textContent = previousText
    onResize()
  }
}

export async function captureDataURL(ctx, scale = 1, { restore = true } = {}) {
  const {
    autoSpin,
    setAutoSpin,
    renderer,
    composer,
    cubeMask,
    scene,
    camera,
    selectivePass,
    cleanSavePass,
    asciiPass,
    bloomPass,
    glarePass,
    flarePass,
    canvas,
    onResize,
  } = ctx

  const previousSpin = autoSpin()
  setAutoSpin(false)
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const width = Math.round(viewportWidth * scale)
  const height = Math.round(viewportHeight * scale)
  renderer.setPixelRatio(1)
  renderer.setSize(width, height, false)
  composer.setPixelRatio(1)
  composer.setSize(width, height)
  cubeMask.setSize(width, height)
  cubeMask.renderMask(renderer, scene, camera)
  selectivePass.setMaskTexture(cubeMask.texture)
  selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
  asciiPass.setMaskTexture(cubeMask.texture)
  bloomPass.setMaskTexture(cubeMask.texture)
  glarePass.setMaskTexture(cubeMask.texture)
  flarePass.setMaskTexture(cubeMask.texture)
  asciiPass.setSize(width, height)
  composer.render()
  const dataURL = canvas.toDataURL('image/png')
  setAutoSpin(previousSpin)
  if (restore) onResize()
  return dataURL
}

export async function capturePixels(ctx, scale = 1) {
  const { canvas, onResize } = ctx
  await captureDataURL(ctx, scale, { restore: false })
  const probe = document.createElement('canvas')
  probe.width = canvas.width
  probe.height = canvas.height
  const pctx = probe.getContext('2d')
  pctx.drawImage(canvas, 0, 0)
  const image = pctx.getImageData(0, 0, probe.width, probe.height)
  onResize()
  return {
    width: probe.width,
    height: probe.height,
    rgba: Array.from(image.data),
  }
}

export function sampleRenderStats(ctx) {
  const { renderer, cubeMask, scene, camera, composer } = ctx
  renderer.info.autoReset = false
  renderer.info.reset()
  cubeMask.renderMask(renderer, scene, camera)
  composer.render()
  const snapshot = {
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    points: renderer.info.render.points,
    lines: renderer.info.render.lines,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  }
  renderer.info.autoReset = true
  return snapshot
}
