import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js'

/**
 * Friendly wrapper around Three's AfterimagePass.
 * amount 0 = off; 1 = long ghost trails. Reusable on any composer stack.
 */
export class AfterimageStylePass extends AfterimagePass {
  /**
   * @param {number} [amount=0]
   */
  constructor(amount = 0) {
    // High damp = stronger persistence
    super(0.86)
    this.amount = amount
    this.enabled = amount > 0.01
    this.setAmount(amount)
  }

  setAmount(value) {
    this.amount = value
    this.enabled = value > 0.01
    // Map 0→1 UI into a useful damp curve (0.72 … 0.975)
    this.uniforms.damp.value = 0.72 + Math.max(0, value) * 0.255
    this.damp = this.uniforms.damp.value
  }
}
