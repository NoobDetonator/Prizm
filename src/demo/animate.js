export function startAnimationLoop(ctx) {
  const {
    hero,
    autoSpinRef,
    filmGradePass,
    libPrismRef,
    streetwear,
    controls,
    post,
    composer,
    renderer,
    scene,
    camera,
    exportInProgress,
    maxDprCapRef,
    adaptiveDprFloor,
    ui,
    onResize,
    setValueLabel,
  } = ctx

  let slowFrameStreak = 0
  let lastFrame = performance.now()

  document.addEventListener('visibilitychange', () => {
    lastFrame = performance.now()
  })

  function animate(now) {
    requestAnimationFrame(animate)
    const delta = Math.min((now - lastFrame) / 1000, 0.05)
    lastFrame = now
    if (document.hidden || exportInProgress()) return

    const libPrism = libPrismRef()
    if (autoSpinRef.value) hero.rotation.y += delta * 0.035
    filmGradePass.uniforms.time.value = now * 0.001
    libPrism.update(now * 0.001)
    streetwear.userData.update(now * 0.001)
    controls.update()

    post.renderMask()
    if (libPrism.engine === 'custom') libPrism.beforeRender(renderer, scene, camera)
    composer.render()

    const stats = window.__prizm?.stats
    if (!stats) return

    const frameMs = delta * 1000
    stats._samples.push(frameMs)
    if (stats._samples.length > 60) stats._samples.shift()
    const avg = stats._samples.reduce((a, b) => a + b, 0) / stats._samples.length
    stats.frameMs = avg
    stats.fps = avg > 0 ? 1000 / avg : 0
    stats.calls = renderer.info.render.calls
    stats.triangles = renderer.info.render.triangles

    if (stats._samples.length >= 60 && avg > 22) slowFrameStreak += 1
    else slowFrameStreak = 0
    if (slowFrameStreak >= 90 && maxDprCapRef.value > adaptiveDprFloor) {
      maxDprCapRef.value = Math.max(adaptiveDprFloor, Number((maxDprCapRef.value - 0.25).toFixed(2)))
      ui.dpr.value = String(maxDprCapRef.value)
      setValueLabel(ui, 'dpr', maxDprCapRef.value.toFixed(2))
      slowFrameStreak = 0
      console.info(`[prizm] adaptive DPR → ${maxDprCapRef.value}`)
      onResize()
    }
  }

  animate(performance.now())
}
