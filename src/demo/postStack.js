import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { SavePass } from 'three/addons/postprocessing/SavePass.js'
import { ChromaShader } from '../post/ChromaShader.js'
import { FilmGradeShader } from '../post/FilmGradeShader.js'
import { QualityBloomPass } from '../post/QualityBloomPass.js'
import { AsciiPass } from '../post/AsciiPass.js'
import { DepthOfFieldPass } from '../post/DepthOfFieldPass.js'
import { HalftoneStylePass } from '../post/HalftoneStylePass.js'
import { AfterimageStylePass } from '../post/AfterimageStylePass.js'
import { SelectiveCubeCompositePass } from '../post/SelectiveCubeCompositePass.js'
import { createCubeMaskRenderer } from '../post/createCubeMaskRenderer.js'

export function createPostStack({ renderer, scene, camera, maskLayer }) {
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  })
  composerTarget.samples = Math.min(4, renderer.capabilities.maxSamples || 4)

  const composer = new EffectComposer(renderer, composerTarget)
  composer.setPixelRatio(renderer.getPixelRatio())
  composer.setSize(window.innerWidth, window.innerHeight)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const cleanSavePass = new SavePass()
  composer.addPass(cleanSavePass)

  const cubeMask = createCubeMaskRenderer({ halfRes: true, samples: 4, maskLayer })
  cubeMask.setSize(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio())

  const afterimagePass = new AfterimageStylePass(0)
  composer.addPass(afterimagePass)

  const halftonePass = new HalftoneStylePass({ amount: 0, radius: 3.4, shape: 1 })
  composer.addPass(halftonePass)

  const chromaPass = new ShaderPass(ChromaShader)
  composer.addPass(chromaPass)

  const selectivePass = new SelectiveCubeCompositePass(cleanSavePass.renderTarget.texture, cubeMask.texture)
  selectivePass.setSelective(true)
  composer.addPass(selectivePass)

  const asciiPass = new AsciiPass({ amount: 0, cellSize: 10 })
  asciiPass.setMaskTexture(cubeMask.texture)
  composer.addPass(asciiPass)

  const bloomPass = new QualityBloomPass(0.02, 0.9, 0.68)
  bloomPass.setMaskTexture(cubeMask.texture)
  composer.addPass(bloomPass)

  const dofPass = new DepthOfFieldPass(scene, camera, {
    focus: 4.8,
    aperture: 0.00022,
    maxblur: 0.01,
  })
  dofPass.enabled = false
  composer.addPass(dofPass)

  const filmGradePass = new ShaderPass(FilmGradeShader)
  composer.addPass(filmGradePass)

  composer.addPass(new OutputPass())
  composer.setSize(window.innerWidth, window.innerHeight)

  function syncMaskTargets(width, height, dpr) {
    cubeMask.setSize(width * dpr, height * dpr)
    selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
    selectivePass.setMaskTexture(cubeMask.texture)
    asciiPass.setMaskTexture(cubeMask.texture)
    asciiPass.setSize(width * dpr, height * dpr)
    bloomPass.setMaskTexture(cubeMask.texture)
  }

  function resize(width, height, dpr) {
    composer.setPixelRatio(dpr)
    composer.setSize(width, height)
    syncMaskTargets(width, height, dpr)
    dofPass.syncCamera(camera)
  }

  function renderMask() {
    cubeMask.renderMask(renderer, scene, camera)
    selectivePass.setMaskTexture(cubeMask.texture)
    selectivePass.setCleanTexture(cleanSavePass.renderTarget.texture)
    asciiPass.setMaskTexture(cubeMask.texture)
    bloomPass.setMaskTexture(cubeMask.texture)
  }

  return {
    composer,
    renderPass,
    cleanSavePass,
    cubeMask,
    afterimagePass,
    halftonePass,
    chromaPass,
    selectivePass,
    asciiPass,
    bloomPass,
    dofPass,
    filmGradePass,
    resize,
    renderMask,
    syncMaskTargets,
  }
}
