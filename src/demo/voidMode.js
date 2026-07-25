import * as THREE from 'three'

export function setVoidMode(ctx, enabled) {
  const {
    scene,
    renderer,
    renderPass,
    streetwear,
    studioLights,
    studioLightBase,
    voidModeRef,
  } = ctx

  voidModeRef.value = Boolean(enabled)
  document.querySelector('#app')?.classList.toggle('is-void', voidModeRef.value)

  if (voidModeRef.value) {
    scene.background = null
    renderer.setClearColor(0x000000, 0)
    renderPass.clearAlpha = 0
    streetwear.visible = false
    studioLights.forEach((light, i) => {
      light.intensity = studioLightBase[i] * 0.08
    })
    document.querySelector('.tag').textContent = 'void refraction · transparent plate · cube IBL'
  } else {
    scene.background = new THREE.Color('#000000')
    renderer.setClearColor('#000000', 1)
    renderPass.clearAlpha = 1
    streetwear.visible = true
    studioLights.forEach((light, i) => {
      light.intensity = studioLightBase[i]
    })
    document.querySelector('.tag').textContent = 'streetwear refraction / cube-only post FX'
  }
}
