export const ChromaticAberrationShader = {
  name: 'ChromaticAberrationShader',
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0014 },
    intensity: { value: 0.72 },
    vignette: { value: 0.28 },
    grain: { value: 0.012 },
    time: { value: 0 },
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
    uniform float vignette;
    uniform float grain;
    uniform float time;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);
      vec2 direction = centered / max(dist, 0.0001);
      vec2 offset = direction * amount * (0.35 + dist * 1.85);

      vec3 source = texture2D(tDiffuse, vUv).rgb;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float b = texture2D(tDiffuse, vUv - offset).b;
      vec3 split = vec3(r, source.g, b);

      float peak = max(source.r, max(source.g, source.b));
      float highlightMask = smoothstep(0.34, 1.4, peak);
      float edgeMask = smoothstep(0.12, 0.72, dist);
      float chromaMask = clamp(highlightMask * 0.82 + edgeMask * 0.18, 0.0, 1.0);
      vec3 color = mix(source, split, chromaMask * intensity);

      float vignetteMask = smoothstep(0.26, 0.72, dist);
      color *= 1.0 - vignetteMask * vignette;

      float noise = hash(gl_FragCoord.xy + vec2(time * 71.0, time * 43.0)) - 0.5;
      color += noise * grain * (0.25 + highlightMask * 0.75);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}
