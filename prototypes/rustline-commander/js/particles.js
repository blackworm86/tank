// PROTOTYPE - NOT FOR PRODUCTION
// Iteration 78: fire and smoke as soft camera-facing particles. Two instanced layers: flames, flashes and embers glow
// (additive, colour over life: white-yellow, orange, deep red, gone), smoke billows (soft puffs that swell, rise with an
// easing, drift with the wind, lit from above and fading in and out). Every burning fire also flickers each frame and lights
// the ground around it with a few pooled point lights. Reads state.fx ({kind:'flash'|'smoke'|'ember', x,y,z,t,life,s,rise,col})
// and state.fires (firePos, js/fire.js); the values are in config.js (fx_*).

const PFX = { ready: false };

/** A soft round sprite: a glow (fire) or a lumpy puff (smoke), drawn on a canvas once. */
function pfxTexture(puff) {
  const N = 128, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d');
  if (!puff) {
    const r = g.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    r.addColorStop(0.55, 'rgba(255,255,255,0.22)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, N, N);
  } else {
    // a puff: overlapping soft blobs (a fixed pattern, not the game's rng: it is only a picture)
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.28, d = Math.sqrt(rnd()) * N * 0.24, x = N / 2 + Math.cos(a) * d, y = N / 2 + Math.sin(a) * d, rr = N * (0.1 + rnd() * 0.15);
      const r = g.createRadialGradient(x, y, 0, x, y, rr);
      r.addColorStop(0, 'rgba(255,255,255,0.5)'); r.addColorStop(0.55, 'rgba(255,255,255,0.24)'); r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r; g.fillRect(0, 0, N, N);
    }
  }
  const t = new THREE.CanvasTexture(c); t.needsUpdate = true; return t;
}

/** One instanced layer of camera-facing quads: per instance a centre, a size, a spin and an rgba colour. */
function pfxLayer(max, additive, puff) {
  const g = new THREE.InstancedBufferGeometry();
  const q = new THREE.PlaneGeometry(1, 1);
  g.index = q.index; g.setAttribute('position', q.getAttribute('position')); g.setAttribute('uv', q.getAttribute('uv'));
  const pos = new Float32Array(max * 3), sz = new Float32Array(max * 3), col = new Float32Array(max * 4);
  g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iSz', new THREE.InstancedBufferAttribute(sz, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('iCol', new THREE.InstancedBufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  g.instanceCount = 0;
  const m = new THREE.ShaderMaterial({
    uniforms: { map: { value: pfxTexture(puff) }, fogCol: { value: new THREE.Color() }, fogNear: { value: 100 }, fogFar: { value: 300 }, lit: { value: puff ? 1 : 0 }, occ: { value: 0.35 } },
    vertexShader: `
      attribute vec3 iPos; attribute vec3 iSz; attribute vec4 iCol;
      uniform float lit;
      varying vec2 vUv; varying vec2 vLoc; varying vec4 vCol; varying float vDepth; varying float vHeat; varying vec2 vRot;
      void main() {
        vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
        float c = cos(iSz.y), s = sin(iSz.y);
        // iSz.z: a flame's height over its width; for smoke, the heat of the fire under it (a glow from below)
        vec2 p = position.xy * vec2(1.0, lit > 0.5 ? 1.0 : iSz.z);
        vec2 r = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
        mv.xy += r * iSz.x;
        vUv = uv; vLoc = r; vCol = iCol; vDepth = -mv.z; vHeat = lit > 0.5 ? iSz.z : 0.0; vRot = vec2(c, s);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 fogCol; uniform float fogNear, fogFar, lit, occ;
      varying vec2 vUv; varying vec2 vLoc; varying vec4 vCol; varying float vDepth; varying float vHeat; varying vec2 vRot;
      void main() {
        float a0 = texture2D(map, vUv).a, a = a0 * vCol.a;
        if (a < 0.004) discard;
        vec3 c = vCol.rgb;
        if (lit > 0.5) {
          // smoke as a volume: each puff a lumpy ball, its normal from its round shape and the bumps of its texture,
          // lit by the sun from above and the side, dark in its own shadow; a fire under it glows orange on its belly
          const float e = 0.035;
          vec2 g = vec2(texture2D(map, vUv + vec2(e, 0.0)).a - texture2D(map, vUv - vec2(e, 0.0)).a,
                        texture2D(map, vUv + vec2(0.0, e)).a - texture2D(map, vUv - vec2(0.0, e)).a);
          g = vec2(vRot.x * g.x - vRot.y * g.y, vRot.y * g.x + vRot.x * g.y);
          vec2 q = vLoc * 2.0;
          vec3 n = normalize(vec3(q * 0.75 - g * 2.2, sqrt(max(0.06, 1.0 - dot(q, q)))));
          float d = dot(n, normalize(vec3(-0.35, 0.8, 0.5))) * 0.5 + 0.5;
          c = c * mix(0.4, 1.3, d) + vec3(0.1, 0.095, 0.09) * d * d;   // black smoke still shows grey where the sun is on it
          c += vHeat * vec3(1.0, 0.36, 0.07) * smoothstep(0.35, -0.6, q.y) * (0.6 + 0.4 * (1.0 - d));
          a = 1.0 - pow(1.0 - a, 1.4);                                   // thicker in its heart
        }
        float f = smoothstep(fogNear, fogFar, vDepth);
        if (lit > 0.5) c = mix(c, fogCol, f); else a *= 1.0 - f * 0.7;
        // smoke: plain alpha; fire: premultiplied, it adds its light and also dims what is behind a little,
        // so a flame still reads on pale sand instead of washing out to white
        gl_FragColor = lit > 0.5 ? vec4(c, a) : vec4(c * a, a * occ);
      }`,
    transparent: true, depthWrite: false, fog: false,
    blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
    blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
  });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = additive ? 3 : 2;
  R3.scene.add(mesh);
  return { mesh, g, pos, sz, col, n: 0, max };
}

/** Builds the layers and the fire lights (after the scene: initView). */
function initParticles() {
  PFX.smoke = pfxLayer(3000, false, true);
  PFX.fire = pfxLayer(4000, true, false);
  PFX.lights = [];
  for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xff8a3a, 0, 14, 1.6); R3.scene.add(l); PFX.lights.push(l); }
  PFX.ready = true;
}
/** Keeps the tunable look in step with config (fx_fire_occlude). */
function pfxTune() { PFX.fire.mesh.material.uniforms.occ.value = tune.fx_fire_occlude; }

const SMK = [];   // this frame's smoke, sorted far to near before it is drawn (puffs over puffs read as one volume)
function pfxPut(L, x, y, z, size, rot, r, g, b, a, tall) {
  if (L.n >= L.max || a <= 0.003 || size <= 0) return;
  const i = L.n++;
  L.pos[i * 3] = x; L.pos[i * 3 + 1] = y; L.pos[i * 3 + 2] = z;
  L.sz[i * 3] = size; L.sz[i * 3 + 1] = rot; L.sz[i * 3 + 2] = tall == null ? 1 : tall;
  L.col[i * 4] = r; L.col[i * 4 + 1] = g; L.col[i * 4 + 2] = b; L.col[i * 4 + 3] = a;
}
/** A flame's colour at k (0 born, 1 gone): white-yellow, orange, deep red. */
const FLAME_RAMP = [[1, 0.96, 0.78], [1, 0.72, 0.28], [1, 0.42, 0.08], [0.62, 0.12, 0.03], [0.2, 0.04, 0.02]];
function flameCol(k) {
  const x = Math.max(0, Math.min(0.999, k)) * (FLAME_RAMP.length - 1), i = x | 0, f = x - i, a = FLAME_RAMP[i], b = FLAME_RAMP[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
/** A colour reads as flame when it is hot: red high, blue low (fire.js and the flamethrower send flames as coloured smoke). */
function isHot(c) { if (c == null) return false; const r = c >> 16 & 255, g = c >> 8 & 255, b = c & 255; return r > 0xd0 && b < 0x60 && g < 0xd0; }
const pfxHash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

/** Fills both layers from state.fx and state.fires, and places the fire lights. Called each frame by renderWorld. */
function drawParticles() {
  if (!PFX.ready) initParticles();
  const S = PFX.smoke, F = PFX.fire, T = state.t || 0;
  S.n = 0; F.n = 0; pfxTune();
  const wx = tune.fx_wind_x, wz = tune.fx_wind_z, fs = tune.fx_flame_size, sa = tune.fx_smoke_alpha, gl = tune.fx_glow;
  const flashes = [];
  SMK.length = 0;
  for (const f of state.fx || []) {
    if (f.t < 0) continue; // not born yet (a delayed puff)
    const k = f.t / f.life, h = pfxHash(f.x, f.z), rot0 = h * 6.28;
    if (f.kind === 'flash') {
      // a fireball: a hot core, a wide soft glow; tinted by its colour when it has one
      const c = flameCol(k * 0.9), e = Math.pow(1 - k, 1.4), sz = f.s * (0.9 + k * 1.1) * 1.6;
      let r = c[0], g = c[1], b = c[2];
      if (f.col != null) { r = (r + (f.col >> 16 & 255) / 255) / 2; g = (g + (f.col >> 8 & 255) / 255) / 2; b = (b + (f.col & 255) / 255) / 2; }
      pfxPut(F, f.x, f.y + k * f.s * 0.3, f.z, sz * 2.2, rot0, r * 0.55 * gl, g * 0.4 * gl, b * 0.3 * gl, e * 0.6);
      pfxPut(F, f.x, f.y + k * f.s * 0.3, f.z, sz, rot0 + k, r, g, b, e);
      pfxPut(F, f.x, f.y, f.z, sz * 0.45, -rot0, 1, 0.98, 0.9, e * e);
      if (f.s > 0.6 && k < 0.5) flashes.push({ x: f.x, y: f.y, z: f.z, w: f.s * (1 - k * 2) });
    } else if (f.kind === 'ember') {
      // a spark: small, bright, wandering up and going out red
      const c = flameCol(0.2 + k * 0.7), t = f.t;
      const x = f.x + (f.vx || 0) * t + Math.sin(t * 7 + rot0) * 0.25 + wx * t * 0.6, z = f.z + (f.vz || 0) * t + Math.cos(t * 6 + rot0) * 0.25 + wz * t * 0.6;
      const y = f.y + f.rise * (1 - (1 - k) * (1 - k));
      const tw = 0.7 + 0.3 * Math.sin(t * 30 + rot0 * 5);
      pfxPut(F, x, y, z, f.s * (1 - k * 0.5), 0, c[0] * 1.2, c[1] * 1.1, c[2], (1 - k) * tw);
    } else if (isHot(f.col)) {
      // a tongue of flame: rises, narrows, goes yellow to red
      const c = flameCol(k * 1.05), up = f.rise * (k * 0.8 + k * k * 0.2), fl = 0.85 + 0.15 * Math.sin(T * 24 + rot0 * 7);
      const sz = f.s * fs * (1.25 - k * 0.75) * fl * 2.0;
      pfxPut(F, f.x + wx * f.t * 0.3, f.y + up, f.z + wz * f.t * 0.3, sz, (h - 0.5) * 0.4, c[0], c[1], c[2], Math.min(1, k * 8) * (1 - k) * 0.95, 1.5 - k * 0.4);
    } else {
      // a puff of smoke: swells, rises with an easing, drifts with the wind, fades in and out
      const c = f.col != null ? f.col : 0x6f6259, r = (c >> 16 & 255) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255;
      const ease = 1 - (1 - k) * (1 - k), sz = f.s * (0.8 + ease * 1.6) * 1.5;
      const a = Math.min(1, k / 0.1) * Math.pow(1 - k, 1.3) * (f.heat ? tune.fx_black_smoke : sa);
      const dr = f.t * (0.4 + k * 1.6);   // the higher, the more the wind takes it
      const tx = Math.sin(f.t * 0.9 + rot0 * 3) * 0.3 * k, tz = Math.cos(f.t * 0.8 + rot0 * 2) * 0.3 * k;   // a slow churn
      SMK.push([f.x + wx * dr + tx, f.y + f.rise * ease, f.z + wz * dr + tz, sz, rot0 + f.t * (h - 0.5) * 0.6, r, g, b, a, (f.heat || 0) * Math.pow(Math.max(0, 1 - k * 2.2), 2)]);
    }
  }
  // every burning fire flickers each frame: a glow on the ground and three dancing flames
  const lights = [];
  const L = state.fires || [];
  const step = Math.max(1, Math.ceil(L.length / 260));
  for (let i = 0; i < L.length; i += step) {
    const f = L[i], p = firePos(f), h = pfxHash(p.x, p.z);
    const life = f.ground ? Math.min(1, (f.until - T) / 2, 0.25 + Math.max(0, T - (f.t0 == null ? -9 : f.t0)) / 1.8) : 1;   // a patch on the ground grows in its first seconds and dies down in its last
    if (life <= 0) continue;
    const wob = 0.8 + 0.2 * Math.sin(T * 11 + h * 40) * Math.sin(T * 7.3 + h * 13);
    const base = f.ground ? p.y + 0.15 : p.y - 0.05;
    const big = (0.75 + 0.6 * h) * fs * life * (step > 1 ? 1.3 : 1);   // fires differ: some roar, some lick
    pfxPut(F, p.x, base + 0.4, p.z, 3.4 * gl * life * Math.sqrt(step), 0, 0.55 * wob, 0.2 * wob, 0.04, 0.6);
    for (let j = 0; j < 4; j++) {
      const ph = (T * (1.3 + j * 0.31 + h * 0.4) + h * 3 + j * 0.29) % 1;   // each flame climbs and is born again
      const c = flameCol(ph * 0.95), sw = Math.sin(T * 9 + j * 2 + h * 20) * 0.15, o = (j - 1.5) * 0.22;
      pfxPut(F, p.x + sw + o + wx * ph * 0.35, base + 0.1 + ph * 2.1 * big, p.z + o * 0.6 + wz * ph * 0.35,
        (1.6 - ph * 1.05) * big, sw * 0.8, c[0], c[1], c[2], Math.min(1, ph * 7) * (1 - ph) * 0.95 * life, 1.7 - ph * 0.5);
    }
    if (lights.length < PFX.lights.length && !lights.some(q => (q.x - p.x) ** 2 + (q.z - p.z) ** 2 < 64)) lights.push({ x: p.x, y: base + 1.2, z: p.z, w: wob * life, fire: true });
  }
  // smoke far to near
  const cp = R3.camera.position;
  for (const q of SMK) q[11] = (q[0] - cp.x) ** 2 + (q[1] - cp.y) ** 2 + (q[2] - cp.z) ** 2;
  SMK.sort((a, b) => b[11] - a[11]);
  for (const q of SMK) pfxPut(S, q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9]);
  // the lights: the biggest blasts first, then fires
  flashes.sort((a, b) => b.w - a.w);
  const use = flashes.slice(0, 2).map(q => ({ x: q.x, y: q.y + 1, z: q.z, w: Math.min(3, q.w), fire: false })).concat(lights);
  PFX.lights.forEach((l, i) => {
    const q = use[i];
    if (!q) { l.intensity = 0; return; }
    l.position.set(q.x, q.y, q.z);
    l.intensity = tune.fire_light * (q.fire ? q.w : q.w * 3);
    l.distance = q.fire ? 12 : 10 + q.w * 4;
  });
  for (const Lr of [S, F]) {
    Lr.g.instanceCount = Lr.n;
    for (const a of ['iPos', 'iSz', 'iCol']) Lr.g.getAttribute(a).needsUpdate = true;
    const fg = R3.scene.fog, u = Lr.mesh.material.uniforms;
    if (fg) { u.fogCol.value.copy(fg.color); u.fogNear.value = fg.near; u.fogFar.value = fg.far; }
  }
}
