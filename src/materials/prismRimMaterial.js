import * as THREE from 'three'

export function createPrismRimMaterial() {
  return new THREE.ShaderMaterial({
    name: 'PrismFresnelRim',
    uniforms: {
      intensity: { value: 0.72 },
      coolColor: { value: new THREE.Color('#43ccff') },
      warmColor: { value: new THREE.Color('#ff6532') },
      whiteColor: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDirection = normalize(cameraPosition - worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float intensity;
      uniform vec3 coolColor;
      uniform vec3 warmColor;
      uniform vec3 whiteColor;
      varying vec3 vWorldNormal;
      varying vec3 vViewDirection;

      void main() {
        vec3 normal = normalize(vWorldNormal);
        float fresnel = pow(1.0 - max(dot(normal, normalize(vViewDirection)), 0.0), 3.4);
        float rim = smoothstep(0.12, 0.92, fresnel);
        float sideMix = clamp(normal.x * 0.5 + 0.5, 0.0, 1.0);
        vec3 spectral = mix(coolColor, warmColor, sideMix);
        vec3 color = mix(spectral, whiteColor, smoothstep(0.55, 1.0, rim));
        float alpha = rim * intensity;
        gl_FragColor = vec4(color * (1.25 + rim * 1.4), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    toneMapped: false,
  })
}
