/**
 * Public surface for the reusable Prizm library.
 * Demo app code must NOT be imported from here.
 */
export {
  createPrism,
  MATERIAL_PRESETS,
  estimateThickness,
  createThicknessHintMap,
} from './createPrism.js'
export { createRefractionCapture } from './createRefractionCapture.js'
export { createPrismMaterial, applyPrismMaterialParams } from '../../materials/prismMaterial.js'
export {
  createPrismEnvironment,
  PROCEDURAL_ENV_PRESETS,
  DEFAULT_PROCEDURAL_ENV,
} from '../../env/createPrismEnvironment.js'
export {
  createArtisticEnvironment,
  ARTISTIC_ENV_PRESETS,
  DEFAULT_ARTISTIC_ENV,
} from '../../env/createArtisticEnvironment.js'
export { loadArtisticImageEnvironment } from '../../env/loadImageEnvironment.js'
export { loadHdrEnvironment } from '../../env/loadHdrEnvironment.js'
