import * as THREE from 'three'
import { MATERIAL_PRESETS } from './physicalGlass.js'

/**
 * Custom double-refraction prism material (screen-space + env).
 *
 * Pipeline per fragment:
 *  1. Fresnel (Schlick) splits reflection vs transmission.
 *  2. Entry refraction with per-channel IOR (dispersion).
 *  3. Exit refraction using captured backface world-normal (not -N).
 *  4. Sample scene RT / env via NDC-projected exit points (per channel).
 *  5. Beer–Lambert + procedural caustics.
 *
 * Output is **linear, unclamped** — tone mapping belongs to EffectComposer OutputPass.
 *
 * Call each frame (via createPrism.beforeRender):
 *   setBackfaceTexture / setRefractionTexture / setResolution / setViewProjection
 */
export function createPrismMaterial({
  preset = 'crystal',
  map = null,
  roughnessMap = null,
  normalMap = null,
} = {}) {
  const p = MATERIAL_PRESETS[preset] ?? MATERIAL_PRESETS.crystal

  const material = new THREE.ShaderMaterial({
    name: 'PrizmDoubleRefract',
    uniforms: {
      tRefraction: { value: null },
      tBackfaceNormal: { value: null },
      envMap: { value: null },
      envMapIntensity: { value: p.envMapIntensity },
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
      causticsIntensity: { value: 0.45 },
      causticsTime: { value: 0 },
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

      uniform sampler2D tRefraction;
      uniform sampler2D tBackfaceNormal;
      uniform sampler2D envMap;
      uniform float envMapIntensity;
      uniform vec2 resolution;
      uniform mat4 viewProjectionMatrix;
      uniform float ior;
      uniform float dispersion;
      uniform float thickness;
      uniform float roughness;
      uniform vec3 attenuationColor;
      uniform float attenuationDistance;
      uniform float translucency;
      uniform float causticsIntensity;
      uniform float causticsTime;
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

      vec2 equirectUv(vec3 dir) {
        vec3 d = normalize(dir);
        float u = atan(d.z, d.x) * 0.15915494309189535 + 0.5;
        float v = asin(clamp(d.y, -1.0, 1.0)) * 0.3183098861837907 + 0.5;
        return vec2(u, v);
      }

      vec3 sampleEnv(vec3 dir) {
        if (hasEnvMap < 0.5) return vec3(0.02, 0.03, 0.05);
        return texture2D(envMap, equirectUv(dir)).rgb * envMapIntensity;
      }

      vec3 refractSpectral(vec3 I, vec3 N, float eta) {
        vec3 T = refract(I, N, eta);
        if (dot(T, T) < 1e-6) return reflect(I, N);
        return normalize(T);
      }

      // Project a world-space point to screen UV via the frame's viewProjection.
      vec2 projectToScreenUV(vec3 worldPos) {
        vec4 clip = viewProjectionMatrix * vec4(worldPos, 1.0);
        vec2 ndc = clip.xy / max(clip.w, 1e-4);
        return clamp(ndc * 0.5 + 0.5, vec2(0.001), vec2(0.999));
      }

      /**
       * Screen UV for a channel: travel along T1 inside the volume, then look up
       * the projected exit point. Uses real exit normal for the outgoing ray when
       * sampling env; for the RT we sample at the projected exit footprint.
       */
      vec2 exitScreenUV(vec3 entryPos, vec3 T1, float path) {
        vec3 exitPos = entryPos + T1 * path;
        return projectToScreenUV(exitPos);
      }

      vec3 proceduralCaustics(vec3 wp, float t) {
        float w1 = sin(wp.x * 7.2 + t * 1.3) * cos(wp.y * 5.1 - t * 0.9);
        float w2 = sin(wp.z * 6.4 - t * 1.1 + wp.x * 2.0);
        float band = smoothstep(0.55, 0.95, abs(w1)) * smoothstep(0.4, 0.9, abs(w2));
        vec3 cool = vec3(0.15, 0.75, 1.0);
        vec3 warm = vec3(1.0, 0.35, 0.12);
        float side = clamp(wp.x * 0.5 + 0.5, 0.0, 1.0);
        return mix(cool, warm, side) * band * (0.55 + 0.45 * sin(t * 2.0 + wp.y * 3.0));
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
        vec3 exitN = -N;
        if (hasBackface > 0.5) {
          vec2 sUv = gl_FragCoord.xy / resolution;
          vec4 packed = texture2D(tBackfaceNormal, sUv);
          // Valid sample when depth was written (A > 0).
          if (packed.a > 1e-4) {
            exitN = normalize(packed.xyz * 2.0 - 1.0);
            // Ensure exit normal faces roughly opposite the entry (outward on far face).
            if (dot(exitN, N) > 0.0) exitN = -exitN;
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
        vec3 T1R = refractSpectral(I, N, 1.0 / iorR);
        vec3 T1G = refractSpectral(I, N, 1.0 / iorG);
        vec3 T1B = refractSpectral(I, N, 1.0 / iorB);

        float path = thickness / max(cosTheta, 0.2);

        // Exit: refract out against the real backface normal (eta = ior).
        // GLSL refract expects N pointing toward the incident side; for exit from glass→air
        // the interface normal should point into the glass (opposite outward exitN).
        vec3 nOut = -exitN;
        vec3 T2R = refractSpectral(T1R, nOut, iorR);
        vec3 T2G = refractSpectral(T1G, nOut, iorG);
        vec3 T2B = refractSpectral(T1B, nOut, iorB);

        vec3 transmitted;
        if (hasRefraction > 0.5) {
          // Per-channel screen lookup at projected exit footprints (T1 path differs by IOR).
          float r = texture2D(tRefraction, exitScreenUV(vWorldPos, T1R, path)).r;
          float g = texture2D(tRefraction, exitScreenUV(vWorldPos, T1G, path)).g;
          float b = texture2D(tRefraction, exitScreenUV(vWorldPos, T1B, path)).b;
          transmitted = vec3(r, g, b);
        } else {
          transmitted = vec3(
            sampleEnv(T2R).r,
            sampleEnv(T2G).g,
            sampleEnv(T2B).b
          );
        }

        if (hasEnvMap > 0.5) {
          vec3 envT = vec3(sampleEnv(T2R).r, sampleEnv(T2G).g, sampleEnv(T2B).b);
          transmitted = mix(transmitted, envT, 0.22 + translucency * 0.15);
        }

        vec3 reflected = sampleEnv(reflect(I, N));

        float attenDist = max(attenuationDistance, 0.05);
        vec3 absorb = -log(max(attenuationColor, vec3(0.05))) / attenDist;
        vec3 beer = exp(-absorb * path * (0.65 + translucency * 0.9));
        transmitted *= beer * color;

        if (hasMap > 0.5) {
          transmitted *= texture2D(map, vUv).rgb;
        }

        vec3 caustics = proceduralCaustics(vWorldPos, causticsTime) * causticsIntensity;
        transmitted += caustics * beer;

        vec3 lit = mix(transmitted, reflected, fresnel);
        lit = mix(lit, mix(lit, attenuationColor, 0.35), translucency * 0.5);

        // Linear HDR — NO ACES / clamp here. OutputPass owns tone mapping.
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
  material.userData.setEnvMap = (env) => {
    const equirect = env?.userData?.equirect || (env?.isDataTexture ? env : null) || null
    material.uniforms.envMap.value = equirect
    material.uniforms.hasEnvMap.value = equirect ? 1 : 0
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
  if (params.caustics != null) u.causticsIntensity.value = params.caustics
  if (params.causticsTime != null) u.causticsTime.value = params.causticsTime
  if (params.envMapIntensity != null) u.envMapIntensity.value = params.envMapIntensity

  if (params.presetKey && MATERIAL_PRESETS[params.presetKey]) {
    const p = MATERIAL_PRESETS[params.presetKey]
    u.attenuationColor.value.set(p.attenuationColor)
    u.attenuationDistance.value = p.attenuationDistance
    if (params.envMapIntensity == null) u.envMapIntensity.value = p.envMapIntensity
  }
}
