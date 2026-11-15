// Rendering engine: renderer, sky, sun + shadows, wind, rain, lightning, ocean.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const C = (h) => new THREE.Color(h);

// ---------------------------------------------------------------- wind
// uWind = (dirX, dirZ, strength). Shared by grass, trees, cloth, rain, sails.
export const matteU = { uGrain: { value: null }, uWet: { value: 0 } };
export const windU = { uTime: { value: 0 }, uWind: { value: new THREE.Vector3(1, 0, 0.5) } };

const WIND_HEAD = `
#ifdef USE_INSTANCING
  mat4 wM = modelMatrix * instanceMatrix;
#else
  mat4 wM = modelMatrix;
#endif
  vec3 wP = (wM * vec4(transformed, 1.0)).xyz;
  float ph = wP.x * 0.11 + wP.z * 0.13;
  float gust = 0.55 + 0.45 * sin(uTime * 0.7 + ph * 0.35);
  float sw = sin(uTime * 1.9 + ph) * 0.6 + sin(uTime * 3.7 + ph * 2.3) * 0.25 + 0.8;
  vec3 wl = normalize(vec3(uWind.x, 0.0, uWind.y) * mat3(wM) + 1e-5);
`;
const WIND_KIND = {
  grass: `transformed += wl * uWind.z * gust * sw * pow(uv.y, 1.6) * AMP * 0.4;`,
  tree: `transformed += wl * uWind.z * gust * sw * transformed.y * transformed.y * 0.0045 * AMP;
         transformed.y += sin(uTime * 4.0 + ph * 5.0 + transformed.x * 2.0) * 0.012 * uWind.z * transformed.y * AMP;`,
  cloth: `transformed += normal * (sin(uTime * 2.6 + ph * 3.0 + uv.x * 5.0) * 0.5 + sin(uTime * 4.1 + uv.y * 7.0 + ph) * 0.3)
            * (1.0 - uv.y) * AMP * (0.25 + uWind.z * 0.5);`,
  awning: `transformed += normal * (sin(uTime * 2.2 + ph * 3.0 + uv.x * 6.0) * 0.5 + sin(uTime * 3.6 + uv.y * 5.0) * 0.3)
            * sin(uv.x * 3.14159) * sin(uv.y * 3.14159) * AMP * (0.2 + uWind.z * 0.4);`,
  sail: `float sb = sin(uv.y * 3.14159) * sin(uv.x * 3.14159);
         transformed += normal * sb * (0.5 + uWind.z * 0.45) * AMP;
         transformed += normal * sin(uTime * 3.1 + uv.x * 7.0 + uv.y * 4.0) * sb * 0.12 * uWind.z * AMP;`,
};
export function windify(mat, kind, amp = 1) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = windU.uTime;
    sh.uniforms.uWind = windU.uWind;
    sh.vertexShader = 'uniform float uTime;\nuniform vec3 uWind;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n' + WIND_HEAD + WIND_KIND[kind].replace(/AMP/g, amp.toFixed(3)));
  };
  mat.customProgramCacheKey = () => 'wind-' + kind + '-' + amp.toFixed(3);
  return mat;
}

// ---------------------------------------------------------------- environment presets
const ENV_BASE = {
  sunElev: 55, sunAzim: 35, sunColor: C(0xfff1d6), sunInt: 2.9,
  hemiSky: C(0xbfd8ff), hemiGround: C(0x8a7355), hemiInt: 0.9,
  skyTop: C(0x2f6fcf), skyHorizon: C(0xbcd8f0), fog: C(0xbcd4e8), fogDensity: 0.0022,
  cloud: 0.35, cloudColor: C(0xffffff), cloudDark: C(0x9aa6b8), stars: 0, sunDisk: 1,
  wind: 0.6, windAngle: 0.6, rain: 0, lightning: 0, exposure: 0.88, bloom: 0.3,
  motes: 0.4, moteColor: C(0xfff2cc), waveAmp: 0.35,
  waterDeep: C(0x0a3a5c), waterShallow: C(0x1f8a9a), glory: 0,
};
export function makeEnv(o = {}) {
  const e = {};
  for (const k in ENV_BASE) e[k] = ENV_BASE[k].isColor ? ENV_BASE[k].clone() : ENV_BASE[k];
  for (const k in o) e[k] = (typeof o[k] === 'number' && ENV_BASE[k] && ENV_BASE[k].isColor) ? C(o[k]) : o[k];
  return e;
}
export const ENV = {
  noonDesert: () => makeEnv({ sunElev: 72, sunAzim: 25, sunColor: 0xfff3d8, sunInt: 3.0, hemiInt: 0.75, exposure: 0.82, skyTop: 0x1f63c8, skyHorizon: 0xb9cfe0, fog: 0xcfd0c0, fogDensity: 0.0024, cloud: 0.2, hemiGround: 0xb89a6a, wind: 0.5, motes: 0.8, moteColor: 0xf2deb0 }),
  seaDay: () => makeEnv({ sunElev: 48, sunAzim: -40, skyTop: 0x2a6ad0, skyHorizon: 0xb5dbf2, fog: 0xb4d6ee, fogDensity: 0.0012, cloud: 0.4, wind: 1.0, windAngle: 3.0, waveAmp: 0.5, motes: 0.1 }),
  golden: () => makeEnv({ sunElev: 20, sunAzim: -70, sunColor: 0xffcf96, sunInt: 3.1, skyTop: 0x3c62a8, skyHorizon: 0xf6c890, fog: 0xeec294, fogDensity: 0.0026, cloud: 0.45, cloudColor: 0xffe2bf, cloudDark: 0xa0788a, hemiSky: 0xc8d4f4, hemiGround: 0x9a8060, hemiInt: 0.95, wind: 0.7, moteColor: 0xffd9a0, motes: 0.7 }),
  windyPlateau: () => makeEnv({ sunElev: 32, sunAzim: 60, sunColor: 0xffe0b0, sunInt: 3.2, skyTop: 0x3a6cbc, skyHorizon: 0xdcd6c0, fog: 0xd8d0b8, fogDensity: 0.003, cloud: 0.6, cloudDark: 0x8a8c98, wind: 1.7, windAngle: 0.3, motes: 1.0, moteColor: 0xe8d6a8 }),
  overcast: () => makeEnv({ sunElev: 40, sunAzim: 30, sunColor: 0xdfe4ea, sunInt: 1.5, skyTop: 0x76828f, skyHorizon: 0xa9b2ba, fog: 0xa3adb5, fogDensity: 0.0048, cloud: 0.95, cloudColor: 0xbcc3ca, cloudDark: 0x6c747e, hemiSky: 0xb6c0cc, hemiGround: 0x6f6a5c, hemiInt: 1.1, sunDisk: 0.1, wind: 0.9, rain: 0.35, motes: 0, bloom: 0.2 }),
  dusk: () => makeEnv({ sunElev: 8, sunAzim: -80, sunColor: 0xff9a5a, sunInt: 2.3, skyTop: 0x27356e, skyHorizon: 0xf09a62, fog: 0xa87a70, fogDensity: 0.0034, cloud: 0.5, cloudColor: 0xffb48a, cloudDark: 0x5a4660, hemiSky: 0x98a0d8, hemiGround: 0x7a6050, hemiInt: 1.0, stars: 0.25, wind: 0.6, bloom: 0.5, moteColor: 0xffc890 }),
  night: () => makeEnv({ sunElev: 50, sunAzim: 130, sunColor: 0x9db8ff, sunInt: 0.55, skyTop: 0x050a1c, skyHorizon: 0x18233f, fog: 0x121a30, fogDensity: 0.004, cloud: 0.3, cloudColor: 0x2c3654, cloudDark: 0x0b0f1e, hemiSky: 0x38487c, hemiGround: 0x14141c, hemiInt: 0.5, stars: 1, sunDisk: 0.6, wind: 0.5, bloom: 0.65, motes: 0.1, exposure: 1.05, waterDeep: 0x020a16, waterShallow: 0x0a2c3c }),
  stormNight: () => makeEnv({ sunElev: 55, sunAzim: 100, sunColor: 0x8fa6d8, sunInt: 0.5, skyTop: 0x05070d, skyHorizon: 0x1a202b, fog: 0x161b24, fogDensity: 0.009, cloud: 1, cloudColor: 0x2b313c, cloudDark: 0x07090d, hemiSky: 0x3b4660, hemiGround: 0x12141a, hemiInt: 0.55, stars: 0, sunDisk: 0, wind: 3.0, windAngle: 2.3, rain: 1, lightning: 0.22, bloom: 0.6, motes: 0, waveAmp: 2.3, waterDeep: 0x030a12, waterShallow: 0x12303a }),
  stormDay: () => makeEnv({ sunElev: 30, sunAzim: 100, sunColor: 0xc8d0dc, sunInt: 1.1, skyTop: 0x3c444f, skyHorizon: 0x7c868e, fog: 0x77818a, fogDensity: 0.0055, cloud: 1, cloudColor: 0x868e96, cloudDark: 0x30363e, hemiSky: 0x9aa4b2, hemiGround: 0x4a4c50, hemiInt: 1.0, sunDisk: 0, wind: 2.4, windAngle: 2.3, rain: 0.8, lightning: 0.05, bloom: 0.25, motes: 0, waveAmp: 1.6, waterDeep: 0x10303c, waterShallow: 0x2f6f74 }),
  dawn: () => makeEnv({ sunElev: 7, sunAzim: 95, sunColor: 0xffb080, sunInt: 2.4, skyTop: 0x35508e, skyHorizon: 0xf4b890, fog: 0xc8a498, fogDensity: 0.0036, cloud: 0.55, cloudColor: 0xffc8a8, cloudDark: 0x6a5a78, hemiSky: 0x98a4d0, hemiGround: 0x6a5848, hemiInt: 0.7, stars: 0.08, wind: 0.8, bloom: 0.45 }),
};

// ---------------------------------------------------------------- shaders
const NOISE_GLSL = `
float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
float fbm(vec2 p){ float a = 0.5, s = 0.0; for(int i=0;i<5;i++){ s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
`;

const SKY_FRAG = `
uniform vec3 uTop, uHorizon, uSunDir, uSunColor, uCloudColor, uCloudDark;
uniform float uCloud, uStars, uTime, uFlash, uSunDisk;
uniform vec2 uWindDir;
varying vec3 vDir;
${NOISE_GLSL}
float hash3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uTop, pow(h, 0.42));
  if (d.y < 0.0) col = mix(uHorizon, uHorizon * 0.55, clamp(-d.y * 5.0, 0.0, 1.0));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 6.0) * 0.10 + pow(sd, 70.0) * 0.30) * uSunDisk;
  col += uSunColor * smoothstep(0.9992, 0.9996, sd) * 14.0 * uSunDisk;
  if (uStars > 0.01) {
    vec3 sp = d * 180.0; vec3 cell = floor(sp); float r = hash3(cell);
    float dd = length(fract(sp) - 0.5);
    col += uStars * step(0.992, r) * smoothstep(0.32, 0.0, dd) * smoothstep(0.0, 0.25, d.y)
         * (0.65 + 0.35 * sin(uTime * 2.0 + r * 100.0)) * vec3(1.0, 0.95, 0.88) * 2.2;
  }
  if (d.y > 0.01) {
    vec2 uv = d.xz / (d.y + 0.12) * 1.4 + uWindDir * uTime * 0.012;
    float n = fbm(uv) * 0.75 + fbm(uv * 2.3 + 7.0) * 0.25;
    float cov = smoothstep(1.0 - uCloud, 1.35 - uCloud, n + uCloud * 0.35);
    float shade = smoothstep(0.25, 0.85, fbm(uv + uSunDir.xz * 0.2));
    vec3 cc = mix(uCloudColor, uCloudDark, shade * 0.85);
    cc += uSunColor * pow(sd, 8.0) * 0.25 * (1.0 - shade);
    col = mix(col, cc, cov * smoothstep(0.01, 0.2, d.y));
  }
  col = mix(col, vec3(1.7, 1.7, 1.8), uFlash);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// Ocean waves: shared between GLSL and JS so ships and swimmers ride the same surface.
export const WAVES = [
  [0.86, 0.50, 0.060, 1.00, 0.85], [0.34, 0.94, 0.105, 0.55, 1.10], [-0.50, 0.86, 0.170, 0.32, 1.45],
  [0.98, -0.17, 0.290, 0.16, 1.90], [-0.77, -0.64, 0.470, 0.09, 2.50],
]; // dirX, dirZ, k, amp, speed
export function waveHeight(x, z, t, amp) {
  let h = 0;
  for (const w of WAVES) h += w[3] * Math.sin((w[0] * x + w[1] * z) * w[2] + t * w[4]);
  return h * amp;
}
const WAVE_GLSL = `
const int NW = ${WAVES.length};
uniform vec4 uWaveA[${WAVES.length}];
uniform float uWaveS[${WAVES.length}];
vec3 waveAt(vec2 p, float t){ // returns (height, dH/dx, dH/dz) for unit amplitude
  vec3 r = vec3(0.0);
  for(int i=0;i<NW;i++){ float a = dot(uWaveA[i].xy, p) * uWaveA[i].z + t * uWaveS[i];
    r.x += uWaveA[i].w * sin(a); float c = uWaveA[i].w * uWaveA[i].z * cos(a); r.y += c * uWaveA[i].x; r.z += c * uWaveA[i].y; }
  return r;
}`;
const WATER_VERT = `
uniform float uTime, uAmp; uniform vec3 uFocus;
varying vec3 vWorld; varying float vH;
${WAVE_GLSL}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float fade = 1.0 - smoothstep(180.0, 520.0, distance(wp.xz, uFocus.xz));
  vec3 w = waveAt(wp.xz, uTime);
  wp.y += w.x * uAmp * fade; vH = w.x * fade;
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const WATER_FRAG = `
uniform float uTime, uAmp, uFogDensity, uFoam; uniform vec3 uFocus;
uniform vec3 uDeep, uShallow, uSunDir, uSunColor, uTop, uHorizon, uFog, uAmbient;
uniform sampler2D uHMap; uniform vec4 uHRect; uniform float uLevel;
varying vec3 vWorld; varying float vH;
${NOISE_GLSL}
${WAVE_GLSL}
void main(){
  float dist = distance(vWorld, cameraPosition);
  float fade = 1.0 - smoothstep(180.0, 520.0, distance(vWorld.xz, uFocus.xz));
  vec3 w = waveAt(vWorld.xz, uTime);
  vec2 rp = vWorld.xz * 0.9; float e = 0.35;
  float n0 = fbm(rp + uTime * vec2(0.25, 0.18)), nx = fbm(rp + vec2(e, 0.0) + uTime * vec2(0.25, 0.18)), nz = fbm(rp + vec2(0.0, e) + uTime * vec2(0.25, 0.18));
  float rip = (0.35 + uAmp * 0.25) * (1.0 - smoothstep(40.0, 260.0, dist));
  vec3 N = normalize(vec3(-(w.y * uAmp * fade + (nx - n0) / e * rip), 1.0, -(w.z * uAmp * fade + (nz - n0) / e * rip)));
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 sky = mix(uHorizon, uTop, pow(clamp(R.y, 0.0, 1.0), 0.5));
  float ndl = max(dot(N, uSunDir), 0.0);
  vec3 body = mix(uDeep, uShallow, clamp(0.35 + vH * 0.45, 0.0, 1.0));
  float depth = 20.0;
  if (uHRect.w > 0.5) { vec2 huv = (vWorld.xz - uHRect.xy) / uHRect.z + 0.5; depth = uLevel - (texture2D(uHMap, huv).r * 16.0 - 12.0); }
  float shoreMix = 1.0 - smoothstep(0.0, 5.5, depth);
  float shoreFoam = (1.0 - smoothstep(0.15, 1.5, depth + vH * uAmp * 0.6)) * (0.55 + 0.45 * sin(depth * 4.0 - uTime * 1.7 + n0 * 7.0));
  body = mix(body, uShallow * 1.5 + vec3(0.02, 0.10, 0.09), shoreMix * 0.75);
  vec3 col = body * (uAmbient + uSunColor * ndl * 0.6);
  col = mix(col, sky, fres * 0.85);
  col += uSunColor * pow(max(dot(R, uSunDir), 0.0), 220.0) * 4.0;
  float fn = fbm(rp * 2.7 - uTime * vec2(0.12, 0.2));
  float crest = smoothstep(0.85, 1.5, vH + (n0 - 0.5) * 0.8) * smoothstep(0.38, 0.62, fn) * uFoam;
  float foam = clamp(crest + shoreFoam * smoothstep(0.3, 0.6, fn + shoreFoam * 0.3), 0.0, 1.0);
  col = mix(col, (uAmbient + uSunColor * 0.7) * vec3(0.95, 0.97, 1.0), foam * 0.85);
  float f = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  col = mix(col, uFog, f);
  gl_FragColor = vec4(col, clamp(mix(0.5, 0.97, smoothstep(0.0, 3.5, depth)) + fres + foam + f, 0.0, 1.0));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// ---------------------------------------------------------------- engine
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xffffff, 0.002);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.15, 3000);
    this.time = 0;
    this.env = ENV.noonDesert();
    this.envFrom = null; this.envTo = null; this.envT = 0; this.envDur = 0;
    this.focus = new THREE.Vector3();
    this.flashT = 0; this.flashPow = 0; this.onThunder = null;
    this.shakeAmt = 0; this.shakeT = 0;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1);
    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.05;
    this.flashLight = new THREE.DirectionalLight(0xcfdcff, 0);
    this.flashLight.position.set(0.3, 1, 0.2);
    this.scene.add(this.hemi, this.sun, this.sun.target, this.flashLight);
    this.sunDir = new THREE.Vector3(0, 1, 0);

    this.skyU = {
      uTop: { value: C(0) }, uHorizon: { value: C(0) }, uSunDir: { value: this.sunDir }, uSunColor: { value: C(0) },
      uCloudColor: { value: C(0) }, uCloudDark: { value: C(0) }, uCloud: { value: 0 }, uStars: { value: 0 },
      uTime: windU.uTime, uFlash: { value: 0 }, uSunDisk: { value: 1 }, uWindDir: { value: new THREE.Vector2(1, 0) },
    };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 20), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: SKY_FRAG,
    }));
    this.sky.renderOrder = -10; this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    this._makeRain(); this._makeMotes();
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.waters = [];
    this.quality = 'high';
    this.composer = null;
    this.setQuality('high');
    this.applyEnv();
  }

  setQuality(q) {
    this.quality = q;
    const r = this.renderer;
    const pr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'medium' ? 1.5 : 2);
    r.setPixelRatio(pr);
    const sm = q === 'low' ? 1024 : q === 'medium' ? 2048 : 4096;
    this.sun.shadow.mapSize.set(sm, sm);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    const S = this.shadowExtent = q === 'low' ? 45 : 65;
    const sc = this.sun.shadow.camera; sc.left = -S; sc.right = S; sc.top = S; sc.bottom = -S; sc.near = 1; sc.far = 500; sc.updateProjectionMatrix();
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    if (q !== 'low') {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
      this.composer = new EffectComposer(r, rt);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.3, 0.6, 0.92);
      this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.composer) { this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.composer.setSize(w, h); }
  }

  _makeRain() {
    const N = 9000, pos = new Float32Array(N * 6), end = new Float32Array(N * 2), rnd = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random(), y = Math.random(), z = Math.random(), r = Math.random();
      pos.set([x, y, z, x, y, z], i * 6); end.set([0, 1], i * 2); rnd.set([r, r], i * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    this.rainU = { uTime: windU.uTime, uWind: windU.uWind, uRain: { value: 0 }, uCam: { value: new THREE.Vector3() }, uTint: { value: C(0xc8d4e6) } };
    this.rain = new THREE.LineSegments(g, new THREE.ShaderMaterial({
      uniforms: this.rainU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `uniform float uTime, uRain; uniform vec3 uWind, uCam; attribute float aEnd, aRnd; varying float vA;
        void main(){ vec3 box = vec3(46.0, 30.0, 46.0); float sp = 24.0 + aRnd * 12.0;
          vec3 vel = vec3(uWind.x * uWind.z * 4.5, -sp, uWind.y * uWind.z * 4.5);
          vec3 p = position * box + vel * uTime;
          p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
          p += normalize(vel) * aEnd * (0.55 + aRnd * 0.5);
          vA = (1.0 - aEnd * 0.8) * step(aRnd, uRain);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0); }`,
      fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(uTint, vA * 0.42);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }));
    this.rain.frustumCulled = false; this.rain.renderOrder = 5; this.scene.add(this.rain);
  }

  _makeMotes() {
    const N = 1400, pos = new Float32Array(N * 3), rnd = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos.set([Math.random(), Math.random(), Math.random()], i * 3); rnd[i] = Math.random(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    this.moteU = { uTime: windU.uTime, uWind: windU.uWind, uAmt: { value: 0 }, uCam: { value: new THREE.Vector3() }, uTint: { value: C(0xffffff) }, uScale: { value: 300 } };
    this.motes = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.moteU, transparent: true, depthWrite: false, fog: false,
      vertexShader: `uniform float uTime, uAmt, uScale; uniform vec3 uWind, uCam; attribute float aRnd; varying float vA;
        void main(){ vec3 box = vec3(40.0, 14.0, 40.0);
          vec3 vel = vec3(uWind.x * uWind.z * 2.6, -0.12 - aRnd * 0.2, uWind.y * uWind.z * 2.6);
          vec3 p = position * box + vel * uTime * (0.6 + aRnd * 0.8);
          p += vec3(sin(uTime * 0.9 + aRnd * 40.0), cos(uTime * 0.7 + aRnd * 60.0) * 0.6, sin(uTime * 0.8 + aRnd * 80.0)) * 0.5;
          p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          vA = step(aRnd, uAmt) * smoothstep(20.0, 12.0, -mv.z) * smoothstep(0.4, 1.5, -mv.z);
          gl_PointSize = (0.03 + aRnd * 0.035) * uScale / max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uTint; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if (d > 0.5 || vA < 0.01) discard;
        gl_FragColor = vec4(uTint, vA * 0.5 * smoothstep(0.5, 0.1, d));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    }));
    this.motes.frustumCulled = false; this.motes.renderOrder = 4; this.scene.add(this.motes);
  }

  // Ocean / river surface. opts.size => finite flat sheet (river); otherwise an ocean that follows the focus point.
  addWater(level, opts = {}) {
    const u = {
      uTime: windU.uTime, uAmp: { value: 0.3 }, uFocus: { value: new THREE.Vector3() }, uFogDensity: { value: 0.002 }, uFoam: { value: 1 },
      uDeep: { value: C(0) }, uShallow: { value: C(0) }, uSunDir: { value: this.sunDir }, uSunColor: { value: C(0) },
      uTop: this.skyU.uTop, uHorizon: this.skyU.uHorizon, uFog: { value: C(0) }, uAmbient: { value: C(0) },
      uWaveA: { value: WAVES.map(w => new THREE.Vector4(w[0], w[1], w[2], w[3])) }, uWaveS: { value: WAVES.map(w => w[4]) },
      uHMap: { value: opts.hmap || null }, uHRect: { value: opts.hmap ? new THREE.Vector4(opts.hrect[0], opts.hrect[1], opts.hrect[2], 1) : new THREE.Vector4(0, 0, 1, 0) }, uLevel: { value: level },
    };
    let geo;
    if (opts.size) { geo = new THREE.PlaneGeometry(opts.size[0], opts.size[1], 64, 64); geo.rotateX(-Math.PI / 2); }
    else {
      const n = 220, R = 1400; geo = new THREE.PlaneGeometry(2, 2, n, n); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setXYZ(i, Math.sign(x) * Math.pow(Math.abs(x), 2.4) * R, 0, Math.sign(z) * Math.pow(Math.abs(z), 2.4) * R); }
    }
    const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: WATER_VERT, fragmentShader: WATER_FRAG, transparent: true }));
    mesh.position.y = level; if (opts.pos) mesh.position.set(opts.pos[0], level, opts.pos[1]);
    mesh.frustumCulled = false; mesh.renderOrder = 2;
    const w = { mesh, u, level, follow: !opts.size, ampScale: opts.ampScale ?? 1 };
    this.waters.push(w); this.world.add(mesh);
    return w;
  }
  waterHeight(x, z) {
    const w = this.waters[0]; if (!w) return -1e9;
    const fade = 1 - THREE.MathUtils.smoothstep(Math.hypot(x - this.focus.x, z - this.focus.z), 180, 520);
    return w.level + waveHeight(x, z, this.time, w.u.uAmp.value) * fade;
  }

  clearWorld() {
    this.world.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) for (const m of [].concat(o.material)) { if (m.userData.shared) continue; if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); }
    });
    this.scene.remove(this.world);
    this.world = new THREE.Group(); this.scene.add(this.world);
    this.waters = [];
  }

  setEnv(env) { this.env = env; this.envTo = null; this.applyEnv(); }
  transitionEnv(target, seconds) {
    const from = {}; for (const k in this.env) from[k] = this.env[k].isColor ? this.env[k].clone() : this.env[k];
    const to = {}; for (const k in from) to[k] = (k in target) ? ((typeof target[k] === 'number' && from[k].isColor) ? C(target[k]) : target[k]) : from[k];
    this.envFrom = from; this.envTo = to; this.envT = 0; this.envDur = Math.max(seconds, 0.001);
  }

  applyEnv() {
    const e = this.env, D = Math.PI / 180;
    const el = e.sunElev * D, az = e.sunAzim * D;
    this.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
    this.sun.color.copy(e.sunColor); this.sun.intensity = e.sunInt * (1 + e.glory * 2);
    this.hemi.color.copy(e.hemiSky); this.hemi.groundColor.copy(e.hemiGround); this.hemi.intensity = e.hemiInt * (1 + e.glory * 3);
    const flash = this.flashPow;
    this.scene.fog.color.copy(e.fog).lerp(C(0xffffff), Math.min(1, e.glory * 0.9 + flash * 0.25));
    this.scene.fog.density = e.fogDensity;
    const s = this.skyU;
    s.uTop.value.copy(e.skyTop); s.uHorizon.value.copy(e.skyHorizon);
    s.uSunColor.value.copy(e.sunColor).multiplyScalar(Math.min(e.sunInt, 3) / 3);
    s.uCloudColor.value.copy(e.cloudColor); s.uCloudDark.value.copy(e.cloudDark);
    s.uCloud.value = e.cloud; s.uStars.value = e.stars; s.uSunDisk.value = e.sunDisk;
    s.uFlash.value = Math.min(1, flash * 0.5 + e.glory);
    windU.uWind.value.set(Math.cos(e.windAngle), Math.sin(e.windAngle), e.wind);
    s.uWindDir.value.set(Math.cos(e.windAngle), Math.sin(e.windAngle)).multiplyScalar(0.5 + e.wind);
    this.rainU.uRain.value = e.rain; this.rain.visible = e.rain > 0.01;
    this.rainU.uTint.value.copy(e.hemiSky).lerp(C(0xffffff), 0.5).multiplyScalar(0.6 + flash * 2);
    this.moteU.uAmt.value = e.motes; this.motes.visible = e.motes > 0.01;
    this.moteU.uTint.value.copy(e.moteColor).multiply(e.sunColor).multiplyScalar(0.4 + e.sunInt * 0.25);
    this.renderer.toneMappingExposure = e.exposure * (1 + e.glory * 1.5);
    if (this.bloom) { this.bloom.strength = e.bloom + e.glory * 1.6; this.bloom.threshold = 0.92 - e.glory * 0.5; }
    this.flashLight.intensity = flash * 5;
    matteU.uWet.value += (Math.min(1, e.rain * 1.6) - matteU.uWet.value) * 0.02;
    for (const w of this.waters) {
      w.u.uAmp.value = e.waveAmp * w.ampScale; w.u.uDeep.value.copy(e.waterDeep); w.u.uShallow.value.copy(e.waterShallow);
      w.u.uSunColor.value.copy(e.sunColor).multiplyScalar(e.sunInt / 3); w.u.uFog.value.copy(this.scene.fog.color);
      w.u.uFogDensity.value = e.fogDensity; w.u.uFoam.value = 0.5 + e.wind * 0.35;
      w.u.uAmbient.value.copy(e.hemiSky).multiplyScalar(e.hemiInt * 0.45 + flash * 0.6);
    }
  }

  lightning(power = 1) { this.flashT = 0.5; this.flashMax = power; if (this.onThunder) this.onThunder(power); }
  shake(amount, seconds) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeT = Math.max(this.shakeT, seconds); this.shakeDur = this.shakeT; }

  update(dt, focus) {
    this.time += dt; windU.uTime.value = this.time;
    if (focus) this.focus.copy(focus);
    if (this.envTo) {
      this.envT += dt / this.envDur; const t = Math.min(1, this.envT), s = t * t * (3 - 2 * t);
      for (const k in this.envTo) { const a = this.envFrom[k], b = this.envTo[k]; if (a.isColor) this.env[k].copy(a).lerp(b, s); else this.env[k] = a + (b - a) * s; }
      if (t >= 1) this.envTo = null;
    }
    if (this.env.lightning > 0 && this.flashT <= 0 && Math.random() < this.env.lightning * dt) this.lightning(0.5 + Math.random() * 0.5);
    if (this.flashT > 0) {
      this.flashT -= dt; const t = 0.5 - this.flashT;
      this.flashPow = this.flashMax * Math.max(Math.exp(-t * 22), t > 0.12 ? Math.exp(-(t - 0.12) * 14) * 0.8 : 0);
      this.flashLight.position.set(Math.sin(this.time * 7), 1, Math.cos(this.time * 5));
    } else this.flashPow = 0;
    this.applyEnv();
    // shadow frustum follows the focus point, snapped to shadow texels to avoid shimmer
    const S = this.shadowExtent, texel = (2 * S) / this.sun.shadow.mapSize.x;
    const f = this.focus;
    this.sun.target.position.set(Math.round(f.x / texel) * texel, f.y, Math.round(f.z / texel) * texel);
    this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir, 220);
    for (const w of this.waters) if (w.follow) { w.mesh.position.x = Math.round(f.x / 4) * 4; w.mesh.position.z = Math.round(f.z / 4) * 4; w.u.uFocus.value.copy(f); } else w.u.uFocus.value.copy(w.mesh.position);
  }

  render(dt) {
    const cam = this.camera;
    if (this.shakeT > 0) {
      this.shakeT -= dt; const a = this.shakeAmt * Math.min(1, this.shakeT / (this.shakeDur * 0.6));
      cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a; cam.position.z += (Math.random() - 0.5) * a;
      cam.rotation.z += (Math.random() - 0.5) * a * 0.04;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
    this.sky.position.copy(cam.position);
    this.rainU.uCam.value.copy(cam.position); this.moteU.uCam.value.copy(cam.position);
    this.moteU.uScale.value = window.innerHeight * this.renderer.getPixelRatio() * 0.9;
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
  }
}
