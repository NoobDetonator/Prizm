import * as THREE from 'three'

export const MATERIAL_PRESETS = {
  glass: {
    ior: 1.52,
    dispersion: 0.72,
    roughness: 0.025,
    thickness: 1.65,
    transmission: 1,
    attenuationColor: '#e8f2ff',
    attenuationDistance: 2.8,
    envMapIntensity: 1.45,
    note: 'n≈1.52 · clean crown glass',
  },
  flint: {
    ior: 1.62,
    dispersion: 1.2,
    roughness: 0.022,
    thickness: 1.75,
    transmission: 1,
    attenuationColor: '#ffe8d8',
    attenuationDistance: 1.8,
    envMapIntensity: 1.7,
    note: 'n≈1.62 · warm high-dispersion flint',
  },
  crystal: {
    ior: 1.85,
    dispersion: 1.55,
    roughness: 0.018,
    thickness: 1.9,
    transmission: 1,
    attenuationColor: '#d8ecff',
    attenuationDistance: 1.7,
    envMapIntensity: 2,
    note: 'n≈1.85 · art-directed optical crystal',
  },
}

const MILKY_TINT = new THREE.Color('#b8d4f5')

export function createPhysicalGlassMaterial(textures, presetKey = 'crystal') {
  const preset = MATERIAL_PRESETS[presetKey] ?? MATERIAL_PRESETS.crystal
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#f8fbff'),
    metalness: 0,
    roughness: preset.roughness,
    transmission: preset.transmission,
    thickness: preset.thickness,
    ior: preset.ior,
    dispersion: preset.dispersion,
    specularIntensity: 1,
    specularColor: new THREE.Color('#ffffff'),
    envMapIntensity: preset.envMapIntensity,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    attenuationColor: new THREE.Color(preset.attenuationColor),
    attenuationDistance: preset.attenuationDistance,
    transparent: false,
    opacity: 1,
    map: textures.map,
    roughnessMap: textures.roughnessMap,
    normalMap: textures.normalMap,
    normalScale: new THREE.Vector2(0.16, 0.16),
    clearcoatNormalMap: textures.normalMap,
    clearcoatNormalScale: new THREE.Vector2(0.07, 0.07),
    side: THREE.FrontSide,
  })

  for (const map of [material.map, material.roughnessMap, material.normalMap, material.clearcoatNormalMap]) {
    map.repeat.set(2.1, 2.1)
  }

  return material
}

export function applyPhysicalParams(material, params) {
  const preset = MATERIAL_PRESETS[params.presetKey] ?? MATERIAL_PRESETS.crystal
  const translucency = THREE.MathUtils.clamp(params.translucency, 0, 1)

  material.ior = params.ior
  material.dispersion = params.dispersion
  material.thickness = params.thickness
  // translucency still drives volume look via transmission / attenuation / roughness
  material.transmission = THREE.MathUtils.lerp(preset.transmission, 0.95, translucency)
  material.attenuationDistance = THREE.MathUtils.lerp(
    preset.attenuationDistance * 2.5,
    Math.max(0.85, preset.attenuationDistance * 0.55),
    translucency,
  )
  material.attenuationColor.set(preset.attenuationColor).lerp(MILKY_TINT, translucency * 0.24)
  material.roughness = THREE.MathUtils.clamp(params.roughness + translucency * 0.025, 0, 0.4)
  material.envMapIntensity = preset.envMapIntensity * (1.08 - translucency * 0.06)
  const normalStrength = 0.055 + params.speckle * 0.3
  material.normalScale.set(normalStrength, normalStrength)
  material.clearcoatNormalScale.set(normalStrength * 0.35, normalStrength * 0.35)
}
