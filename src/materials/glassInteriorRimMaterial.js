import * as THREE from 'three'

/**
 * Art-directed interior rim glow drawn *over* the transmissive front glass.
 *
 * NOT a physical Beer–Lambert volume path. With AdditiveBlending + transparent
 * the shell leaves the opaque queue, so it never enters Three's transmission
 * render target. We intentionally draw it after the glass (renderOrder 3,
 * depthTest false) as a fresnel edge highlight — fake, readable, reusable.
 *
 * Schlick Fresnel (for the edge falloff only):
 *   F0 = ((n - 1) / (n + 1))^2
 *   F  = F0 + (1 - F0) * (1 - cosθ)^5
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
      shellOffset: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float shellOffset;
      varying vec3 vViewNormal;
      varying vec3 vViewDirection;
      varying vec3 vWorldNormal;

      void main() {
        vec3 displaced = position + normalize(normal) * shellOffset;
        vec4 viewPosition = modelViewMatrix * vec4(displaced, 1.0);
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

        // Soft path-length cue for spectral tint only — not a real volume integral.
        float opticalPath = thickness / max(cosTheta, 0.18);
        vec3 transmittance = exp(-absorption * opticalPath);

        float rearEdge = smoothstep(0.16, 0.86, fresnel);
        float sideMix = clamp(vWorldNormal.x * 0.5 + 0.5, 0.0, 1.0);
        vec3 spectral = mix(coolColor, warmColor, sideMix);
        vec3 color = mix(spectral * transmittance, whiteColor, fresnel * 0.48);
        float averageTransmission = dot(transmittance, vec3(0.333333));
        float alpha = rearEdge * intensity * mix(0.68, 1.0, averageTransmission);

        // Do NOT premultiply into A=1 — AdditiveBlending needs a real alpha.
        gl_FragColor = vec4(color * (0.78 + fresnel * 0.72), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
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
