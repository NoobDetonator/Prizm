import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

/**
 * Load a real Radiance .hdr as a PMREM environment.
 * Falls back by throwing — caller should keep the procedural float env.
 */
export async function loadHdrEnvironment(renderer, url) {
  const texture = await new RGBELoader().loadAsync(url)
  texture.mapping = THREE.EquirectangularReflectionMapping

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const environment = pmrem.fromEquirectangular(texture).texture
  environment.userData.source = url
  environment.userData.kind = 'hdr'

  texture.dispose()
  pmrem.dispose()
  return environment
}
