import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { buildPmremFromEquirect } from './buildPmremFromEquirect.js'

/**
 * Load a real Radiance .hdr as a PMREM environment.
 * Falls back by throwing — caller should keep the procedural float env.
 */
export async function loadHdrEnvironment(renderer, url) {
  const texture = await new RGBELoader().loadAsync(url)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.NoColorSpace
  // RGBELoader often ships with LinearFilter already; keep mipmaps off for PMREM ingest.
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  return buildPmremFromEquirect(renderer, texture, {
    source: url,
    kind: 'hdr',
    equirectSize: [texture.image?.width, texture.image?.height],
  })
}
