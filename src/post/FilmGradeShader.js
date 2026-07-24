/**
 * Full-frame film grade — vignette + grain (after selective mix).
 */
export const FilmGradeShader = {
  name: 'FilmGradeShader',
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.26 },
    grain: { value: 0.004 },
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
      vec3 color = texture2D(tDiffuse, vUv).rgb;
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      float vignetteMask = smoothstep(0.26, 0.72, dist);
      color *= 1.0 - vignetteMask * vignette;

      float peak = max(color.r, max(color.g, color.b));
      float noise = hash(gl_FragCoord.xy + vec2(time * 71.0, time * 43.0)) - 0.5;
      color += noise * grain * (0.35 + peak * 0.65);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
}
