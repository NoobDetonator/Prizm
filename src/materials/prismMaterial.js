import * as THREE from 'three'
import { MATERIAL_PRESETS } from './physicalGlass.js'

/**
 * Custom double-refraction prism material (screen-space + env).
 *
 * Pipeline per fragment:
 *  1. Fresnel (Schlick) splits reflection vs transmission.
 *  2. Entry refraction with per-channel IOR (dispersion).
 *  3. Exit refraction using captured backface world-normal (not -N).
 *  4. Sample scene RT via NDC-projected exit points (per channel); rays whose
 *     exit point leaves the captured frame fall back to the environment.
 *  5. Beer–Lambert attenuation.
 *
 * The environment is read through three's PMREM (`textureCubeUV`), so roughness
 * selects a convolved mip. Sampling the raw equirect instead — as this material
 * used to — meant the roughness mip bias was a no-op (the equirect is built with
 * `generateMipmaps = false`), the u=0/1 seam was visible, and a flat 22% of
 * unconvolved HDR radiance was mixed into the transmitted term on every fragment,
 * whether or not the plate had valid data for it. See `scripts/test-refraction-gpu.mjs`.
 *
 * (The flat-white `*__custom.png` captures were a separate defect — the demo's
 * additive `surface-details` layer, see `docs/DEBITO-TECNICO.md`.)
 *
 * Output is **linear, unclamped** — tone mapping belongs to EffectComposer OutputPass.
 *
 * Call each frame (via createPrism.beforeRender):
 *   setBackfaceTexture / setRefractionTexture / setResolution / setViewProjection
 */
/**
 * Linear radiance scale applied to the custom engine's output before the
 * composer's ACES pass. Calibrated, not taste: with the previous value (0.28) the
 * body landed at 8-bit luma 91 against the `physical` engine's 138 on the same
 * frame — low enough on the ACES curve that the demo's additive `surface-details`
 * layer, which is invisible on `physical`, washed the whole cube to white and cut
 * measured chroma from 46.6 to 13.5. See `scripts/calibrate-exposure.mjs`.
 */
export const PRISM_EXPOSURE = 0.28

export function createPrismMaterial({
  preset = 'crystal',
  map = null,
  roughnessMap = null,
  normalMap = null,
} = {}) {
  const p = MATERIAL_PRESETS[preset] ?? MATERIAL_PRESETS.crystal

  const material = new THREE.ShaderMaterial({
    name: 'PrizmDoubleRefract',
    // CUBEUV_* are filled in by setEnvMap once a PMREM is attached.
    defines: {},
    uniforms: {
      tRefraction: { value: null },
      tBackfaceNormal: { value: null },
      envMap: { value: null },
      envMapIntensity: { value: p.envMapIntensity },
      environmentIntensity: { value: 1 },
      resolution: { value: new THREE.Vector2(1, 1) },
      viewMatrixInverse: { value: new THREE.Matrix4() },
      // projection * view — for NDC exit projection
      viewProjectionMatrix: { value: new THREE.Matrix4() },
      ior: { value: p.ior },
      dispersion: { value: p.dispersion },
      thickness: { value: p.thickness },
      roughness: { value: p.roughness },
      attenuationColor: { value: new THREE.Color(p.attenuationColor) },
      attenuationDistance: { value: p.attenuationDistance },
      translucency: { value: 0.08 },
      exposure: { value: PRISM_EXPOSURE },
      map: { value: map },
      roughnessMap: { value: roughnessMap },
      normalMap: { value: normalMap },
      normalScale: { value: new THREE.Vector2(0.16, 0.16) },
      hasMap: { value: map ? 1 : 0 },
      hasRoughnessMap: { value: roughnessMap ? 1 : 0 },
      hasNormalMap: { value: normalMap ? 1 : 0 },
      hasRefraction: { value: 0 },
      hasBackface: { value: 0 },
      hasEnvMap: { value: 0 },
      color: { value: new THREE.Color('#f8fbff') },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying vec4 vClip;

      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewDir = cameraPosition - world.xyz;
        vClip = projectionMatrix * viewMatrix * world;
        gl_Position = vClip;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;

      #include <common>
      #include <cube_uv_reflection_fragment>

      uniform sampler2D tRefraction;
      uniform sampler2D tBackfaceNormal;
      uniform sampler2D envMap;
      uniform float envMapIntensity;
      uniform float environmentIntensity;
      uniform vec2 resolution;
      uniform mat4 viewProjectionMatrix;
      uniform float ior;
      uniform float dispersion;
      uniform float thickness;
      uniform float roughness;
      uniform vec3 attenuationColor;
      uniform float attenuationDistance;
      uniform float translucency;
      uniform float exposure;
      uniform sampler2D map;
      uniform sampler2D roughnessMap;
      uniform sampler2D normalMap;
      uniform vec2 normalScale;
      uniform float hasMap;
      uniform float hasRoughnessMap;
      uniform float hasNormalMap;
      uniform float hasRefraction;
      uniform float hasBackface;
      uniform float hasEnvMap;
      uniform vec3 color;

      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying vec4 vClip;

      // How far past the exit point the plate is re-sampled along T2, as a fraction
      // of the interior path length. Art-directed: large enough that the backface
      // exit normal visibly moves the read, small enough not to detach the sample
      // from the geometry behind the prism.
      #define PLATE_EXIT_STEP 0.22

      // Cheap hash for roughness jitter (stable per-fragment, not temporal).
      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      vec3 jitterDir(vec3 dir, float amount, float seed) {
        if (amount < 1e-4) return dir;
        vec3 n = normalize(dir);
        vec3 t = abs(n.y) < 0.99 ? normalize(cross(n, vec3(0.0, 1.0, 0.0))) : vec3(1.0, 0.0, 0.0);
        vec3 b = cross(n, t);
        float u = hash12(gl_FragCoord.xy + seed) * 6.2831853;
        float v = hash12(gl_FragCoord.xy * 1.37 + seed + 17.0);
        float r = amount * sqrt(v);
        return normalize(n + (cos(u) * t + sin(u) * b) * r);
      }

      vec3 sampleEnv(vec3 dir, float rough) {
        #ifdef ENVMAP_TYPE_CUBE_UV
          if (hasEnvMap < 0.5) return vec3(0.02, 0.03, 0.05);
          // PMREM: roughness picks a pre-convolved mip. No seam, no aliasing on
          // the 4K equirect, and roughness actually reaches the specular lobe.
          return textureCubeUV(envMap, dir, rough).rgb * envMapIntensity * environmentIntensity;
        #else
          return vec3(0.02, 0.03, 0.05);
        #endif
      }

      vec3 sampleRefraction(vec2 uv, float rough) {
        float bias = rough * rough * 6.0;
        return texture2D(tRefraction, uv, bias).rgb;
      }

      vec3 refractSpectral(vec3 I, vec3 N, float eta) {
        vec3 T = refract(I, N, eta);
        if (dot(T, T) < 1e-6) return reflect(I, N);
        return normalize(T);
      }

      /**
       * Plate UV: march to exit along T1, then sample a short step beyond along T2.
       * T1 alone already smears by entry IOR; T2 makes the backface exit normal
       * change which texel is read (otherwise the RT path ignores exitN).
       *
       * Returns xy = clamped screen UV, z = how far outside the captured frame the
       * sample landed (0 = inside, 1 = fully outside). The plate only holds what the
       * camera saw, so off-frame rays must fall back to the environment instead of
       * smearing the border texel.
       */
      vec3 plateScreenUV(vec3 entryPos, vec3 T1, vec3 T2, float path) {
        vec3 exitPos = entryPos + T1 * path;
        vec3 beyond = exitPos + T2 * (path * PLATE_EXIT_STEP);
        vec4 clip = viewProjectionMatrix * vec4(beyond, 1.0);
        vec2 uv = (clip.xy / max(abs(clip.w), 1e-4)) * 0.5 + 0.5;
        vec2 outside = max(vec2(0.0) - uv, uv - vec2(1.0));
        float off = clamp(max(max(outside.x, outside.y) * 6.0, step(clip.w, 0.0)), 0.0, 1.0);
        return vec3(clamp(uv, vec2(0.001), vec2(0.999)), off);
      }

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(vViewDir);
        float facing = dot(N, V);

        if (facing < 0.0) {
          N = -N;
          facing = -facing;
        }

        float rough = roughness;
        if (hasRoughnessMap > 0.5) {
          rough = clamp(rough * texture2D(roughnessMap, vUv).g, 0.0, 1.0);
        }

        if (hasNormalMap > 0.5) {
          vec3 nTex = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          N = normalize(N + vec3(nTex.xy * normalScale, 0.0));
        }

        // Exit normal from backface pre-pass (world space). Fallback -N only if missing.
        // Capture is BackSide + GreaterDepth — sample is already the far face; do not flip.
        vec3 exitN = -N;
        if (hasBackface > 0.5) {
          vec2 sUv = gl_FragCoord.xy / resolution;
          vec4 packed = texture2D(tBackfaceNormal, sUv);
          if (packed.a > 1e-4) {
            vec3 sampled = normalize(packed.xyz * 2.0 - 1.0);
            // Invalid if normal faces the camera (front-face leak); keep fallback -N.
            if (dot(sampled, V) <= 0.0) {
              exitN = sampled;
            }
          }
        }

        float eta0 = (ior - 1.0) / (ior + 1.0);
        float F0 = eta0 * eta0;
        float cosTheta = clamp(facing, 0.0, 1.0);
        float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
        fresnel = mix(fresnel, 1.0, rough * 0.25);

        float disp = dispersion * 0.028;
        float iorR = max(1.01, ior - disp);
        float iorG = max(1.01, ior);
        float iorB = max(1.01, ior + disp * 1.15);

        vec3 I = normalize(-V);
        float jitterAmt = rough * 0.35;
        vec3 T1R = jitterDir(refractSpectral(I, N, 1.0 / iorR), jitterAmt, 1.1);
        vec3 T1G = jitterDir(refractSpectral(I, N, 1.0 / iorG), jitterAmt, 2.3);
        vec3 T1B = jitterDir(refractSpectral(I, N, 1.0 / iorB), jitterAmt, 3.7);

        float path = thickness / max(cosTheta, 0.2);

        // Exit: refract out against the real backface normal (eta = ior).
        // GLSL refract expects N pointing toward the incident side; for exit from glass→air
        // the interface normal should point into the glass (opposite outward exitN).
        vec3 nOut = -exitN;
        vec3 T2R = jitterDir(refractSpectral(T1R, nOut, iorR), jitterAmt * 0.5, 4.1);
        vec3 T2G = jitterDir(refractSpectral(T1G, nOut, iorG), jitterAmt * 0.5, 5.2);
        vec3 T2B = jitterDir(refractSpectral(T1B, nOut, iorB), jitterAmt * 0.5, 6.3);

        vec3 transmitted;
        if (hasRefraction > 0.5) {
          // T1 path + T2 beyond-exit: backface IOR split moves the plate read.
          vec3 uvR = plateScreenUV(vWorldPos, T1R, T2R, path);
          vec3 uvG = plateScreenUV(vWorldPos, T1G, T2G, path);
          vec3 uvB = plateScreenUV(vWorldPos, T1B, T2B, path);
          transmitted = vec3(
            sampleRefraction(uvR.xy, rough).r,
            sampleRefraction(uvG.xy, rough).g,
            sampleRefraction(uvB.xy, rough).b
          );

          // Only rays that exit the captured frame read the environment. The old
          // code mixed in 22% raw HDR unconditionally, ignoring plate validity.
          float off = max(uvR.z, max(uvG.z, uvB.z));
          if (off > 0.001) {
            vec3 envT = vec3(
              sampleEnv(T2R, rough).r,
              sampleEnv(T2G, rough).g,
              sampleEnv(T2B, rough).b
            );
            transmitted = mix(transmitted, envT, off);
          }
        } else {
          transmitted = vec3(
            sampleEnv(T2R, rough).r,
            sampleEnv(T2G, rough).g,
            sampleEnv(T2B, rough).b
          );
        }

        vec3 reflected = sampleEnv(reflect(I, N), rough);

        float attenDist = max(attenuationDistance, 0.05);
        vec3 absorb = -log(max(attenuationColor, vec3(0.05))) / attenDist;
        vec3 beer = exp(-absorb * path * (0.65 + translucency * 0.9));
        transmitted *= beer * color;

        if (hasMap > 0.5) {
          transmitted *= texture2D(map, vUv).rgb;
        }

        vec3 lit = mix(transmitted, reflected, fresnel);
        lit = mix(lit, mix(lit, attenuationColor, 0.35), translucency * 0.5);

        // Linear radiance scale only — NOT tone mapping, NOT clamp.
        // Highlights stay >1 so bloom can extract them (OutputPass owns ACES).
        lit *= exposure;

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: false,
  })

  material.userData.isPrismMaterial = true
  material.userData.setRefractionTexture = (texture) => {
    material.uniforms.tRefraction.value = texture
    material.uniforms.hasRefraction.value = texture ? 1 : 0
  }
  material.userData.setBackfaceTexture = (texture) => {
    material.uniforms.tBackfaceNormal.value = texture
    material.uniforms.hasBackface.value = texture ? 1 : 0
  }
  /**
   * Takes the PMREM produced by `buildPmremFromEquirect` (i.e. `scene.environment`).
   * The CubeUV defines mirror three's own `generateCubeUVSize`, so `textureCubeUV`
   * decodes the packed atlas exactly as MeshStandardMaterial does.
   */
  material.userData.setEnvMap = (env) => {
    const pmrem = env?.mapping === THREE.CubeUVReflectionMapping ? env : null
    material.uniforms.envMap.value = pmrem
    material.uniforms.hasEnvMap.value = pmrem ? 1 : 0
    if (!pmrem) return

    const height = pmrem.image?.height || 256
    const maxMip = Math.log2(height) - 2
    const next = {
      ENVMAP_TYPE_CUBE_UV: '',
      CUBEUV_TEXEL_WIDTH: 1 / (3 * Math.max(2 ** maxMip, 7 * 16)),
      CUBEUV_TEXEL_HEIGHT: 1 / height,
      CUBEUV_MAX_MIP: `${maxMip}.0`,
    }
    const changed = Object.keys(next).some((key) => material.defines[key] !== next[key])
    if (changed) {
      material.defines = next
      material.needsUpdate = true
    }
  }
  material.userData.setEnvironmentIntensity = (value) => {
    material.uniforms.environmentIntensity.value = value ?? 1
  }
  material.userData.setResolution = (w, h) => {
    material.uniforms.resolution.value.set(w, h)
  }
  material.userData.setViewProjectionMatrix = (matrix) => {
    material.uniforms.viewProjectionMatrix.value.copy(matrix)
  }

  return material
}

export function applyPrismMaterialParams(material, params = {}) {
  if (!material?.uniforms) return
  const u = material.uniforms
  if (params.ior != null) u.ior.value = params.ior
  if (params.dispersion != null) u.dispersion.value = params.dispersion
  if (params.thickness != null) u.thickness.value = params.thickness
  if (params.roughness != null) u.roughness.value = params.roughness
  if (params.translucency != null) u.translucency.value = params.translucency
  if (params.envMapIntensity != null) u.envMapIntensity.value = params.envMapIntensity
  if (params.speckle != null) {
    // Mirrors applyPhysicalParams: speckle drives normal-map strength. Without
    // this the custom engine ignored the control entirely and its only outlet was
    // the demo's additive `surface-details` layer, which is decoration, not glass.
    const normalStrength = 0.055 + params.speckle * 0.45
    u.normalScale.value.set(normalStrength, normalStrength)
  }

  if (params.presetKey && MATERIAL_PRESETS[params.presetKey]) {
    const p = MATERIAL_PRESETS[params.presetKey]
    u.attenuationColor.value.set(p.attenuationColor)
    u.attenuationDistance.value = p.attenuationDistance
    if (params.envMapIntensity == null) u.envMapIntensity.value = p.envMapIntensity
  }
}
