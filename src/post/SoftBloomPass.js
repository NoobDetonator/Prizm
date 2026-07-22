import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

/**
 * Subtle highlight glow at native resolution.
 * No mip pyramid — avoids the blocky UnrealBloom look.
 */
export function createSoftBloomPass() {
  const pass = new ShaderPass(SoftBloomShader)
  pass.setStrength = (v) => {
    pass.uniforms.strength.value = v
  }
  pass.setThreshold = (v) => {
    pass.uniforms.threshold.value = v
  }
  return pass
}

const SoftBloomShader = {
  name: 'SoftBloomShader',
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.18 },
    threshold: { value: 0.78 },
    resolution: { value: { x: 1, y: 1 } },
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
    uniform float strength;
    uniform float threshold;
    uniform vec2 resolution;
    varying vec2 vUv;

    float luma(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 extract(vec3 c) {
      float soft = 0.12;
      float l = luma(c);
      float contrib = smoothstep(threshold, threshold + soft, l);
      return c * contrib;
    }

    void main() {
      vec2 t = 1.0 / resolution;
      vec3 src = texture2D(tDiffuse, vUv).rgb;

      // Separable-ish small kernel — crisp, not mushy
      vec3 b = extract(src) * 0.28;
      b += extract(texture2D(tDiffuse, vUv + vec2(t.x, 0.0)).rgb) * 0.15;
      b += extract(texture2D(tDiffuse, vUv - vec2(t.x, 0.0)).rgb) * 0.15;
      b += extract(texture2D(tDiffuse, vUv + vec2(0.0, t.y)).rgb) * 0.15;
      b += extract(texture2D(tDiffuse, vUv - vec2(0.0, t.y)).rgb) * 0.15;
      b += extract(texture2D(tDiffuse, vUv + t).rgb) * 0.06;
      b += extract(texture2D(tDiffuse, vUv - t).rgb) * 0.06;

      gl_FragColor = vec4(src + b * strength, 1.0);
    }
  `,
}
