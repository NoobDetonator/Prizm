import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'

/**
 * Thin reusable wrapper around Three's BokehPass with a friendlier API.
 * Works on any scene/camera pair — keep focus near your subject distance.
 */
export class DepthOfFieldPass extends BokehPass {
  /**
   * @param {import('three').Scene} scene
   * @param {import('three').Camera} camera
   * @param {object} [options]
   * @param {number} [options.focus=5]
   * @param {number} [options.aperture=0.00022]
   * @param {number} [options.maxblur=0.01]
   */
  constructor(scene, camera, { focus = 5, aperture = 0.00022, maxblur = 0.01 } = {}) {
    super(scene, camera, { focus, aperture, maxblur })
    this.enabled = false
  }

  setFocus(value) {
    this.uniforms.focus.value = value
  }

  setAperture(value) {
    this.uniforms.aperture.value = value
  }

  setMaxBlur(value) {
    this.uniforms.maxblur.value = value
  }

  /** Enable when strength > ~0; maps a 0–1 UI slider into aperture + blur. */
  setStrength(value) {
    const amount = Math.max(0, value)
    this.enabled = amount > 0.01
    // Higher strength → larger aperture + more blur
    this.uniforms.aperture.value = 0.00004 + amount * 0.00055
    this.uniforms.maxblur.value = 0.002 + amount * 0.018
  }

  syncCamera(camera) {
    this.camera = camera
    this.uniforms.aspect.value = camera.aspect
    this.uniforms.nearClip.value = camera.near
    this.uniforms.farClip.value = camera.far
  }
}
