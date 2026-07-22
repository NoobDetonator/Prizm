import * as THREE from 'three'

/**
 * Rear-facing optical shell rendered before the transmissive front surface.
 *
 * Schlick Fresnel approximation:
 *   F0 = ((n1 - n2) / (n1 + n2))^2
 *   F  = F0 + (1 - F0) * (1 - cos(theta))^5
 *
 * Beer-Lambert attenuation:
 *   T = exp(-absorption * opticalPathLength)
 *
 * This is an art-directed real-time approximation: it reveals the far edges
 * through the glass while leaving face-on areas almost completely clear.
 */
export function createGlassInteriorRimMaterial() {
  return new THREE.ShaderMaterial({
    name: 'GlassInteriorFresnel',
    uniforms: {
      ior: { value: 1.85 },
      thickness: { value: 1.9 },
      intensity: { value: 0.62 },
      absorption: { value: new THREE.Vector3(0.06, 0.025, 0.009) },
      coolColor: { value: new THREE.Color('#62d9ff') },
      warmColor: { value: new THREE.Color('#ff8560') },
      whiteColor: { value: new THREE.Color('#f7fbff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying vec3 vWorldNormal;

      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vViewNormal = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float ior;
      uniform float thickness;
      uniform float intensity;
      uniform vec3 absorption;
      uniform vec3 coolColor;
      uniform vec3 warmColor;
      uniform vec3 whiteColor;

      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying vec3 vWorldNormal;

      void main() {
        float cosTheta = clamp(abs(dot(normalize(vViewNormal), normalize(vViewDirection))), 0.0, 1.0);
        float eta = (ior - 1.0) / (ior + 1.0);
        float f0 = eta * eta;
        float fresnel = f0 + (1.0 - f0) * pow(1.0 - cosTheta, 5.0);

        float opticalPath = thickness / max(cosTheta, 0.18);
        vec3 transmittance = exp(-absorption * opticalPath);

        float rearEdge = smoothstep(0.16, 0.86, fresnel);
        float sideMix = clamp(vWorldNormal.x * 0.5 + 0.5, 0.0, 1.0);
        vec3 spectral = mix(coolColor, warmColor, sideMix);
        vec3 color = mix(spectral * transmittance, whiteColor, fresnel * 0.48);
        float averageTransmission = dot(transmittance, vec3(0.333333));
        float alpha = rearEdge * intensity * mix(0.68, 1.0, averageTransmission);

        gl_FragColor = vec4(color * (0.78 + fresnel * 0.72) * alpha, 1.0);
      }
    `,
    transparent: false,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    side: THREE.BackSide,
    toneMapped: false,
  })
}

export function applyGlassInteriorRimParams(material, params) {
  const translucency = THREE.MathUtils.clamp(params.translucency, 0, 1)
  material.uniforms.ior.value = params.ior
  material.uniforms.thickness.value = params.thickness
  material.uniforms.intensity.value = THREE.MathUtils.clamp(
    0.18 + params.dispersion * 0.04 - translucency * 0.025,
    0.2,
    0.3,
  )
  material.uniforms.absorption.value.set(
    0.05 + translucency * 0.14,
    0.021 + translucency * 0.07,
    0.007 + translucency * 0.035,
  )
}
