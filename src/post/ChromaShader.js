/**
 * Chromatic aberration only — cube-local stylization (before selective mix).
 */
export const ChromaShader = {
  name: 'ChromaShader',
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.00135 },
    intensity: { value: 0.7 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float intensity;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      vec2 direction = centered / max(dist, 0.0001);
      vec2 offset = direction * amount * (0.35 + dist * 1.85);

      vec3 source = texture2D(tDiffuse, vUv).rgb;
      float red = texture2D(tDiffuse, vUv + offset).r;
      float blue = texture2D(tDiffuse, vUv - offset).b;
      vec3 split = vec3(red, source.g, blue);

      float peak = max(source.r, max(source.g, source.b));
      float highlightMask = smoothstep(0.34, 1.4, peak);
      float edgeMask = smoothstep(0.12, 0.72, dist);
      float chromaMask = clamp(highlightMask * 0.82 + edgeMask * 0.18, 0.0, 1.0);
      vec3 color = mix(source, split, chromaMask * intensity);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}
