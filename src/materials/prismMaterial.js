import * as THREE from 'three'
import { MATERIAL_PRESETS } from './physicalGlass.js'

/**
 * Custom double-refraction prism material (screen-space + env).
 *
 * Pipeline per fragment:
 *  1. Fresnel (Schlick) splits reflection vs transmission.
 *  2. Entry refraction with per-channel IOR (dispersion).
 *  3. Exit refraction approximated with -N and thickness.
 *  4. Sample the pre-captured scene RT (tRefraction) and/or envMap.
 *  5. Beer–Lambert attenuation + optional procedural caustics inside the volume.
 *
 * Call `material.userData.setRefractionTexture(tex)` each frame after capture.
 * This is NOT MeshPhysicalMaterial.transmission — opaque scene content must be
 * captured via createRefractionCapture / createPrism.beforeRender.
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
      envMap: { value: null }, // equirect float/LDR — not PMREM CubeUV
      envMapIntensity: { value: p.envMapIntensity },
      resolution: { value: new THREE.Vector2(1, 1) },
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
      uniform sampler2D envMap;
      uniform float envMapIntensity;
      uniform vec2 resolution;
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

      vec2 screenUV(vec3 offsetView) {
        vec2 ndc = vClip.xy / max(vClip.w, 1e-4);
        vec2 uv = ndc * 0.5 + 0.5;
        // Push UVs along projected refraction bend (screen-space double-refract cue).
        uv += offsetView.xy * (0.04 + thickness * 0.035);
        return clamp(uv, vec2(0.001), vec2(0.999));
      }

      vec3 refractSpectral(vec3 I, vec3 N, float eta) {
        vec3 T = refract(I, N, eta);
        // Total internal reflection fallback — graze to reflection.
        if (dot(T, T) < 1e-6) return reflect(I, N);
        return normalize(T);
      }

      // Cheap interior caustic ribbons in local UV / world space (injected into volume).
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

        // Flip for back faces if ever drawn double-sided.
        if (facing < 0.0) {
          N = -N;
          facing = -facing;
        }

        float rough = roughness;
        if (hasRoughnessMap > 0.5) {
          rough = clamp(rough * texture2D(roughnessMap, vUv).g, 0.0, 1.0);
        }

        if (hasNormalMap > 0.5) {
          // Tangent-less object-space nudge — enough for procedural speckles.
          vec3 nTex = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          N = normalize(N + vec3(nTex.xy * normalScale, 0.0));
        }

        // Schlick F0 from IOR (air → glass).
        float eta0 = (ior - 1.0) / (ior + 1.0);
        float F0 = eta0 * eta0;
        float cosTheta = clamp(facing, 0.0, 1.0);
        float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
        fresnel = mix(fresnel, 1.0, rough * 0.25);

        // Dispersion: blue bends more (higher IOR) than red.
        float disp = dispersion * 0.028;
        float iorR = max(1.01, ior - disp);
        float iorG = max(1.01, ior);
        float iorB = max(1.01, ior + disp * 1.15);

        // Incident from air into medium: eta = 1/ior
        vec3 I = normalize(-V);
        vec3 T1R = refractSpectral(I, N, 1.0 / iorR);
        vec3 T1G = refractSpectral(I, N, 1.0 / iorG);
        vec3 T1B = refractSpectral(I, N, 1.0 / iorB);

        // Exit: travel ~thickness along refracted ray, then leave with eta = ior.
        // Approximate exit normal as -N (parallel slab). Real meshes use thickness as path cue.
        float path = thickness / max(cosTheta, 0.2);
        vec3 T2R = refractSpectral(T1R, -N, iorR);
        vec3 T2G = refractSpectral(T1G, -N, iorG);
        vec3 T2B = refractSpectral(T1B, -N, iorB);

        vec3 transmitted;
        if (hasRefraction > 0.5) {
          float r = texture2D(tRefraction, screenUV(T2R * path)).r;
          float g = texture2D(tRefraction, screenUV(T2G * path)).g;
          float b = texture2D(tRefraction, screenUV(T2B * path)).b;
          transmitted = vec3(r, g, b);
        } else {
          transmitted = vec3(
            sampleEnv(T2R).r,
            sampleEnv(T2G).g,
            sampleEnv(T2B).b
          );
        }

        // Mix a little env into transmission for HDR specular environment energy.
        if (hasEnvMap > 0.5) {
          vec3 envT = vec3(sampleEnv(T2R).r, sampleEnv(T2G).g, sampleEnv(T2B).b);
          transmitted = mix(transmitted, envT, 0.22 + translucency * 0.15);
        }

        vec3 reflected = sampleEnv(reflect(I, N));

        // Beer–Lambert attenuation along path length.
        float attenDist = max(attenuationDistance, 0.05);
        vec3 absorb = -log(max(attenuationColor, vec3(0.05))) / attenDist;
        vec3 beer = exp(-absorb * path * (0.65 + translucency * 0.9));
        transmitted *= beer * color;

        if (hasMap > 0.5) {
          transmitted *= texture2D(map, vUv).rgb;
        }

        // Inject caustics inside the volume (true fix vs additive overlay blades).
        vec3 caustics = proceduralCaustics(vWorldPos, causticsTime) * causticsIntensity;
        transmitted += caustics * beer;

        vec3 lit = mix(transmitted, reflected, fresnel);
        // Soft milky scatter from translucency.
        lit = mix(lit, mix(lit, attenuationColor, 0.35), translucency * 0.5);

        // ACES-ish filmic — ShaderMaterial does not inherit renderer.toneMapping chunks.
        lit *= 0.65;
        lit = clamp((lit * (2.51 * lit + 0.03)) / (lit * (2.43 * lit + 0.59) + 0.14), 0.0, 1.0);

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    side: THREE.FrontSide,
    toneMapped: true,
  })

  material.userData.isPrismMaterial = true
  material.userData.setRefractionTexture = (texture) => {
    material.uniforms.tRefraction.value = texture
    material.uniforms.hasRefraction.value = texture ? 1 : 0
  }
  material.userData.setEnvMap = (env) => {
    // scene.environment is usually PMREM CubeUV — custom shader needs the equirect source.
    const equirect = env?.userData?.equirect || (env?.isDataTexture ? env : null) || null
    material.uniforms.envMap.value = equirect
    material.uniforms.hasEnvMap.value = equirect ? 1 : 0
  }
  material.userData.setResolution = (w, h) => {
    material.uniforms.resolution.value.set(w, h)
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
