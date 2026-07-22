import { HalftonePass } from 'three/addons/postprocessing/HalftonePass.js'

/**
 * Friendly wrapper around Three's HalftonePass.
 * amount 0 = off; 1 = full print look. Drop into any EffectComposer.
 */
export class HalftoneStylePass extends HalftonePass {
  /**
   * @param {object} [options]
   * @param {number} [options.amount=0]
   * @param {number} [options.radius=3.2]
   * @param {number} [options.shape=1] 1=dot 2=ellipse 3=ring 4=line
   */
  constructor({ amount = 0, radius = 3.2, shape = 1 } = {}) {
    super({
      shape,
      radius,
      rotateR: Math.PI / 12,
      rotateG: (Math.PI / 12) * 2,
      rotateB: (Math.PI / 12) * 3,
      scatter: 0.12,
      blending: amount,
      blendingMode: 1,
      greyscale: false,
    })
    this.amount = amount
    this.enabled = amount > 0.01
  }

  setAmount(value) {
    this.amount = value
    this.enabled = value > 0.01
    this.uniforms.blending.value = value
  }

  setRadius(value) {
    this.uniforms.radius.value = value
  }

  setShape(value) {
    this.uniforms.shape.value = value
  }

  setGreyscale(enabled) {
    this.uniforms.greyscale.value = enabled
  }
}
