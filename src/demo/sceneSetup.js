import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { createStreetwearBackdrop } from '../backdrop/createStreetwearBackdrop.js'
import { createSurfaceDetails } from './surfaceDetails.js'

export function createHeroPrism({ renderer, ui, maskLayer, createPrism }) {
  const prismDimensions = new THREE.Vector3(1.86, 1.64, 1.7)
  const geometry = new RoundedBoxGeometry(prismDimensions.x, prismDimensions.y, prismDimensions.z, 12, 0.105)
  const cubeMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial())
  cubeMesh.name = 'hero-cube'

  let libPrism = createPrism({
    renderer,
    preset: ui.preset?.value || 'crystal',
    engine: ui.engine?.value || 'physical',
    maskLayer,
  })
  libPrism.attach(cubeMesh)

  const surfaceDetails = createSurfaceDetails(prismDimensions, 420, 90)
  const hero = new THREE.Group()
  hero.name = 'hero-prism'
  hero.add(cubeMesh, surfaceDetails)
  hero.rotation.set(0.33, 0.66, 0.085)
  hero.position.set(0, -0.02, 0.08)
  hero.traverse((obj) => obj.layers.enable(maskLayer))

  function getLibPrism() {
    return libPrism
  }

  async function switchEngine(engine, readUi) {
    const params = { ...libPrism.params, ...readUi() }
    libPrism.dispose()
    libPrism = createPrism({
      renderer,
      preset: params.presetKey || ui.preset?.value || 'crystal',
      engine,
      maskLayer,
    })
    libPrism.setParams(params)
    libPrism.attach(cubeMesh)
  }

  return { hero, cubeMesh, surfaceDetails, getLibPrism, switchEngine }
}

export function createStudioLights(scene) {
  const keyLight = new THREE.DirectionalLight('#fff5ec', 2.3)
  keyLight.position.set(4.5, 6, 3.5)
  const coolRim = new THREE.DirectionalLight('#47bfff', 1.85)
  coolRim.position.set(-5, 2.2, 1)
  const warmRim = new THREE.DirectionalLight('#ff6434', 1.25)
  warmRim.position.set(4, -1.5, -2.5)
  const ambientFill = new THREE.AmbientLight('#10223a', 0.28)
  scene.add(keyLight, coolRim, warmRim, ambientFill)
  const studioLights = [keyLight, coolRim, warmRim, ambientFill]
  return { studioLights, studioLightBase: studioLights.map((l) => l.intensity) }
}

export function createStreetwear(scene) {
  const streetwear = createStreetwearBackdrop()
  scene.add(streetwear)
  return streetwear
}
