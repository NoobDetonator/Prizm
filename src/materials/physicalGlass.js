import * as THREE from 'three'

/**
 * Real-world optical anchors → Three.js MeshPhysicalMaterial.
 *
 * Physics cheat-sheet:
 * - Snell's law: n1·sinθ1 = n2·sinθ2  →  `ior`
 * - Dispersion: n = n(λ); blue bends more than red  →  `dispersion`
 *   (Three.js / KHR_materials_dispersion evaluates transmission per RGB channel)
 * - Beer–Lambert absorption through volume  →  `attenuationColor` + `attenuationDistance`
 * - Optical path length through the slab  →  `thickness`
 * - Microfacet surface scatter  →  `roughness`
 * - Specular still present on clear dielectrics  →  keep `opacity: 1`, use `transmission`
 *
 * Typical nD (589 nm):
 *   crown glass ~1.52 | flint glass ~1.62 | sapphire ~1.77 | cubic zirconia ~2.17
 */

export const MATERIAL_PRESETS = {
  glass: {
    label: 'Crown glass',
    ior: 1.52,
    dispersion: 0.55,
    roughness: 0.04,
    thickness: 1.4,
    transmission: 1,
    attenuationColor: '#e8f2ff',
    attenuationDistance: 2.8,
    envMapIntensity: 1.25,
    note: 'n≈1.52 · low dispersion (high Abbe)',
  },
  flint: {
    label: 'Flint glass',
    ior: 1.62,
    dispersion: 1.05,
    roughness: 0.035,
    thickness: 1.55,
    transmission: 1,
    attenuationColor: '#ffe8d8',
    attenuationDistance: 1.8,
    envMapIntensity: 1.45,
    note: 'n≈1.62 · stronger prism split',
  },
  crystal: {
    label: 'Crystal',
    ior: 1.85,
    dispersion: 1.35,
    roughness: 0.04,
    thickness: 1.55,
    transmission: 1,
    attenuationColor: '#e4f0ff',
    attenuationDistance: 2.2,
    envMapIntensity: 1.55,
    note: 'n≈1.85 · translucent crystal body',
  },
}

export function createPhysicalGlassMaterial(textures, presetKey = 'crystal') {
  const p = MATERIAL_PRESETS[presetKey] ?? MATERIAL_PRESETS.crystal

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    metalness: 0,
    roughness: p.roughness,
    transmission: p.transmission,
    thickness: p.thickness,
    ior: p.ior,
    dispersion: p.dispersion,
    specularIntensity: 0.85,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: p.envMapIntensity,
    clearcoat: 0.65,
    clearcoatRoughness: 0.06,
    attenuationColor: new THREE.Color(p.attenuationColor),
    attenuationDistance: p.attenuationDistance,
    // Opacity stays 1 — translucency is physical transmission + attenuation
    transparent: true,
    opacity: 1,
    roughnessMap: textures.roughnessMap,
    normalMap: textures.normalMap,
    normalScale: new THREE.Vector2(0.35, 0.35),
    // Front only here — main.js adds a BackSide pass so rear edges
    // stay visible through the volume (as in real glass).
    side: THREE.FrontSide,
  })

  material.roughnessMap.repeat.set(2.1, 2.1)
  material.normalMap.repeat.set(2.1, 2.1)

  return material
}

/**
 * Interior / far-side shell of the glass volume.
 *
 * Important: must NOT use transmission. Transmissive meshes are skipped when
 * Three.js builds the refraction buffer — so a transmitting back-face would
 * never show up through the front. A lit dielectric shell is sampled instead,
 * which is what lets you see the rear edges through the crystal.
 */
export function createGlassBackMaterial(frontMaterial) {
  const back = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f4f8ff'),
    metalness: 0,
    roughness: Math.min(1, frontMaterial.roughness + 0.04),
    transmission: 0,
    transparent: true,
    opacity: 0.22,
    ior: frontMaterial.ior,
    thickness: 0,
    specularIntensity: 1,
    envMapIntensity: frontMaterial.envMapIntensity * 1.1,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: THREE.BackSide,
    depthWrite: false,
  })
  return back
}

export function applyBackFaceParams(backMaterial, frontMaterial, translucency = 0.22) {
  const t = THREE.MathUtils.clamp(translucency, 0, 1)
  // Clearer glass → stronger rear shell so far edges read through the volume
  backMaterial.opacity = THREE.MathUtils.lerp(0.55, 0.2, t)
  backMaterial.roughness = Math.min(1, frontMaterial.roughness + 0.03)
  backMaterial.ior = frontMaterial.ior
  backMaterial.envMapIntensity = frontMaterial.envMapIntensity * 1.25
  backMaterial.color.set('#ffffff').lerp(new THREE.Color('#b7cceb'), t * 0.35)
  backMaterial.side = THREE.BackSide
  backMaterial.transmission = 0
  backMaterial.depthWrite = false
  backMaterial.needsUpdate = true
}

/**
 * @param {THREE.MeshPhysicalMaterial} material
 * @param {object} params
 * @param {number} params.translucency 0 = clear glass, 1 = milky crystal body
 */
export function applyPhysicalParams(material, params) {
  const {
    ior,
    dispersion,
    thickness,
    roughness,
    translucency = 0.35,
    speckle = 0.55,
    presetKey = 'crystal',
  } = params

  const preset = MATERIAL_PRESETS[presetKey] ?? MATERIAL_PRESETS.crystal

  material.ior = ior
  material.dispersion = dispersion
  material.thickness = thickness
  material.roughness = roughness

  // Translucency = volume body (Beer–Lambert), not fake opacity.
  // Keep transmission high so backdrop text still refracts through.
  const t = THREE.MathUtils.clamp(translucency, 0, 1)
  material.transmission = THREE.MathUtils.lerp(1, 0.96, t)
  material.attenuationDistance = THREE.MathUtils.lerp(6.5, 1.6, t)
  material.attenuationColor.set(preset.attenuationColor).lerp(new THREE.Color('#c2d8f5'), t * 0.25)
  material.roughness = THREE.MathUtils.clamp(roughness + t * 0.035, 0, 0.45)
  material.envMapIntensity = preset.envMapIntensity * (1.1 - t * 0.08)
  material.normalScale.set(0.1 + speckle * 0.55, 0.1 + speckle * 0.55)
  material.needsUpdate = true
}
