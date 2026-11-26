// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The ground drawn as a smooth, detailed surface over the voxel columns: blended textures (dry grass,
// mud, rock, asphalt, dirt), scorch marks, water with ripples, and woods, grass tufts and stones.
// The game still plays on the voxels (paths, cover, destruction); this file only draws them.
'use strict';

/** Ground cache: natural ground height per column and the four ground weights (grass, mud, rock, asphalt) per cell. */
const TER = { ground: null, gs: null, cellW: null, N: 0, decorDirty: false, decorAt: 0, meshes: new Map() };
/** True when the smooth ground is drawn (config terrain_look), false for the old voxel blocks. */
function smoothLook() { return tune.terrain_look >= 0.5; }

// ---- Ground cache --------------------------------------------------------------------------------
function groundCol(x, z) {
  const base = VH * (x + world.N * z);
  let y = 0; while (y < VH && GROUNDV.has(world.vox[base + y])) y++;
  return y;
}
function tG(x, z) { const N = TER.N; x = x < 0 ? 0 : x >= N ? N - 1 : x; z = z < 0 ? 0 : z >= N ? N - 1 : z; return TER.gs[x + N * z]; }
function tR(x, z) { const N = TER.N; x = x < 0 ? 0 : x >= N ? N - 1 : x; z = z < 0 ? 0 : z >= N ? N - 1 : z; return TER.ground[x + N * z]; }
const BINO = [1, 4, 6, 4, 1];
function tW(x, z, c) { const N = TER.N; x = x < 0 ? 0 : x >= N ? N - 1 : x; z = z < 0 ? 0 : z >= N ? N - 1 : z; return TER.cellW[(x + N * z) * 4 + c]; }
/** Allocates the cache for the current world. */
function terrainReset() {
  TER.N = world.N; TER.ground = new Float32Array(world.N * world.N); TER.gs = new Float32Array(world.N * world.N); TER.cellW = new Float32Array(world.N * world.N * 4);
  terrainCells(0, 0, world.N - 1, world.N - 1);
}
/** Recomputes ground heights and ground weights for cells in the box (heights 3 cells wider). */
function terrainCells(x0, z0, x1, z1) {
  const N = world.N, WL = world.WL;
  x0 = Math.max(0, x0); z0 = Math.max(0, z0); x1 = Math.min(N - 1, x1); z1 = Math.min(N - 1, z1);
  for (let z = z0 - 5; z <= z1 + 5; z++) for (let x = x0 - 5; x <= x1 + 5; x++) if (inMap(x, z)) TER.ground[x + N * z] = groundCol(x, z);
  // the drawn heights are the voxel heights blurred (5x5 binomial): cliffs round off instead of showing voxel steps
  for (let z = z0 - 3; z <= z1 + 3; z++) for (let x = x0 - 3; x <= x1 + 3; x++) {
    if (!inMap(x, z)) continue;
    let t = 0;
    for (let b = 0; b < 5; b++) for (let a = 0; a < 5; a++) t += BINO[a] * BINO[b] * tR(x + a - 2, z + b - 2);
    TER.gs[x + N * z] = t / 256;
  }
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const i = x + N * z, g = TER.ground[i], t = g > 0 ? world.vox[VH * i + g - 1] : V.BED;
    let slope = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) slope = Math.max(slope, Math.abs(tR(x + dx, z + dz) - g));
    let asph = 0, rock = 0, mud = 0, grass = 0;
    if (t === V.ROAD && world.road[i] === 1) asph = 1;
    else {
      const stony = t === V.ROCK || t === V.RED;
      rock = stony ? Math.max(0.3, smooth(0.5, 1.6, slope)) : smooth(1, 2.6, slope); // plateaus grassed over, rock on the steep sides
      if (g < WL) mud = 1;
      else {
        let wd = 9;
        for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (tR(x + dx, z + dz) < WL) wd = Math.min(wd, Math.max(Math.abs(dx), Math.abs(dz)));
        mud = wd <= 1 ? 0.9 : wd <= 2 ? 0.5 : 0;
      }
      mud = Math.min(1, Math.max(mud, smooth(0.6, 0.7, fbm(x / 7, z / 7, 501, 2)) * tune.mud_patches * 1.6));
      let nearRoad = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (inMap(x + dx, z + dz) && world.road[x + dx + N * (z + dz)]) nearRoad = 1;
      grass = (t === V.SAND || t === V.DIRT || stony) ? 0.3 + 0.7 * smooth(0.3, 0.52, fbm(x / 11, z / 11, 502, 3)) : 0;
      grass *= (1 - rock) * (1 - mud) * (1 - Math.min(1, world.scorch[i] / 110)) * (nearRoad ? 0.3 : 1);
      mud *= 1 - rock * 0.7;
    }
    const s = asph + rock + mud + grass, k = i * 4, d = s > 1 ? s : 1;
    TER.cellW[k] = grass / d; TER.cellW[k + 1] = mud / d; TER.cellW[k + 2] = rock / d; TER.cellW[k + 3] = asph / d;
  }
}

// ---- The surface ---------------------------------------------------------------------------------
function catmull(a, b, c, d, t) { return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a))); }
/** Smooth ground height at a point: a Catmull-Rom patch through the column centres, never past its four nearest columns. */
function baseH(px, pz) {
  const u = px - 0.5, v = pz - 0.5, ix = Math.floor(u), iz = Math.floor(v), fx = u - ix, fz = v - iz;
  const r0 = catmull(tG(ix - 1, iz - 1), tG(ix, iz - 1), tG(ix + 1, iz - 1), tG(ix + 2, iz - 1), fx);
  const r1 = catmull(tG(ix - 1, iz), tG(ix, iz), tG(ix + 1, iz), tG(ix + 2, iz), fx);
  const r2 = catmull(tG(ix - 1, iz + 1), tG(ix, iz + 1), tG(ix + 1, iz + 1), tG(ix + 2, iz + 1), fx);
  const r3 = catmull(tG(ix - 1, iz + 2), tG(ix, iz + 2), tG(ix + 1, iz + 2), tG(ix + 2, iz + 2), fx);
  const h = catmull(r0, r1, r2, r3, fz);
  const a = tG(ix, iz), b = tG(ix + 1, iz), c = tG(ix, iz + 1), d = tG(ix + 1, iz + 1);
  return Math.max(Math.min(a, b, c, d), Math.min(Math.max(a, b, c, d), h));
}
function bilW(px, pz, c) {
  const u = px - 0.5, v = pz - 0.5, ix = Math.floor(u), iz = Math.floor(v), fx = u - ix, fz = v - iz;
  const a = tW(ix, iz, c), b = tW(ix + 1, iz, c), e = tW(ix, iz + 1, c), d = tW(ix + 1, iz + 1, c);
  return (a + (b - a) * fx) * (1 - fz) + (e + (d - e) * fx) * fz;
}
/** Ground weights at a point into out[0..3]; borders wander (warped lookup) except the asphalt edge. */
function wAt(px, pz, out) {
  const wx = px + (vnoise(px * 0.6, pz * 0.6, 611) - 0.5) * 1.4, wz = pz + (vnoise(px * 0.6 + 40, pz * 0.6, 612) - 0.5) * 1.4;
  let g = bilW(wx, wz, 0), m = bilW(wx, wz, 1), r = bilW(wx, wz, 2);
  const a = smooth(0.3, 0.7, bilW(px, pz, 3)), rest = g + m + r;
  if (rest > 1 - a && rest > 0) { const k = (1 - a) / rest; g *= k; m *= k; r *= k; }
  out[0] = g; out[1] = m; out[2] = r; out[3] = a;
}
function grain(px, pz, w) {
  const n = (vnoise(px * 1.3, pz * 1.3, 621) - 0.5) + (vnoise(px * 3.3, pz * 3.3, 622) - 0.5) * 0.5 + (vnoise(px * 7.1, pz * 7.1, 623) - 0.5) * 0.25;
  return n * tune.terrain_grain * (1 - w[3] * 0.95) * (1 + w[2] * 2);
}
const _w4 = [0, 0, 0, 0];
/** Drawn ground height at a point, bumps included. */
function terrainY(px, pz) { wAt(px, pz, _w4); return baseH(px, pz) + grain(px, pz, _w4); }
/** Where a figure's feet go at (x,z): on the drawn ground when the column is bare, else on top of the column. */
function surfaceY(x, z) {
  if (!TER.ground || !smoothLook() || TER.N !== world.N) return hAt(x, z);
  const ix = Math.floor(x), iz = Math.floor(z); if (!inMap(ix, iz)) return hAt(x, z);
  const i = ix + world.N * iz;
  return world.hmap[i] === TER.ground[i] ? baseH(x, z) : hAt(x, z);
}

/** One chunk of drawn ground, (16 * terrain_detail)^2 quads. */
function buildTerrainGeo(cx, cz, detail) {
  const S = detail || Math.max(1, Math.round(CHEAP ? Math.min(2, tune.terrain_detail) : tune.terrain_detail));
  const n = 16 * S, x0 = cx * 16, z0 = cz * 16, M = n + 3, WL = world.WL, N = world.N;
  const hg = new Float32Array(M * M), w = [0, 0, 0, 0];
  const V1 = (n + 1) * (n + 1);
  const pos = new Float32Array(V1 * 3), nor = new Float32Array(V1 * 3), col = new Float32Array(V1 * 3), spl = new Float32Array(V1 * 4), stp = new Float32Array(V1);
  for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    const px = x0 + (i - 1) / S, pz = z0 + (j - 1) / S;
    wAt(px, pz, w);
    hg[i + M * j] = baseH(px, pz) + grain(px, pz, w);
    if (i >= 1 && j >= 1 && i <= n + 1 && j <= n + 1) spl.set(w, ((i - 1) + (n + 1) * (j - 1)) * 4);
  }
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const gi = i + 1, gj = j + 1, k = i + (n + 1) * j, h = hg[gi + M * gj];
    const px = x0 + i / S, pz = z0 + j / S;
    pos[k * 3] = px; pos[k * 3 + 1] = h; pos[k * 3 + 2] = pz;
    let nx = (hg[gi - 1 + M * gj] - hg[gi + 1 + M * gj]) * S / 2, nz = (hg[gi + M * (gj - 1)] - hg[gi + M * (gj + 1)]) * S / 2, ny = 1;
    const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
    nor[k * 3] = nx; nor[k * 3 + 1] = ny; nor[k * 3 + 2] = nz;
    stp[k] = Math.min(1, (1 - ny) * 2.5);
    // light: broad variation, hollows a little darker, scorch marks, wet bed under the water
    const lap = (hg[gi - 1 + M * gj] + hg[gi + 1 + M * gj] + hg[gi + M * (gj - 1)] + hg[gi + M * (gj + 1)]) / 4 - h;
    let v = 0.88 + 0.24 * vnoise(px / 9, pz / 9, 631);
    v *= 1 - Math.max(-0.06, Math.min(0.16, lap * 0.8));
    const sx = Math.min(N - 1, Math.max(0, Math.floor(px))), sz = Math.min(N - 1, Math.max(0, Math.floor(pz)));
    const sc = world.scorch[sx + N * sz] / 255;
    v *= 1 - Math.min(0.62, sc * 1.7 * (0.75 + 0.5 * vnoise(px * 1.7, pz * 1.7, 632)));
    let r = v, g = v, b = v;
    if (h < WL - 0.2) { const d = Math.min(1, (WL - 0.2 - h) / 2.5); r *= 1 - d * 0.45; g *= 1 - d * 0.3; b *= 1 - d * 0.25; }
    col[k * 3] = r; col[k * 3 + 1] = g; col[k * 3 + 2] = b;
  }
  const idx = new (V1 > 65535 ? Uint32Array : Uint16Array)(n * n * 6);
  let q = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = i + (n + 1) * j, b = a + 1, c = a + (n + 1), d = c + 1;
    if ((i + j) & 1) { idx[q++] = a; idx[q++] = c; idx[q++] = b; idx[q++] = b; idx[q++] = c; idx[q++] = d; }
    else { idx[q++] = a; idx[q++] = c; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = b; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('splat', new THREE.BufferAttribute(spl, 4));
  geo.setAttribute('steep', new THREE.BufferAttribute(stp, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}
/** Rebuilds the drawn ground of one chunk (key = cx + cz * 64). Called by setChunk. */
function setTerrainChunk(key) {
  const cx = key % 64, cz = Math.floor(key / 64);
  let m = TER.meshes.get(key);
  if (!smoothLook()) { if (m) { m.geometry.dispose(); R3.chunkGroup.remove(m); TER.meshes.delete(key); } return; }
  const g = buildTerrainGeo(cx, cz);
  if (m) { m.geometry.dispose(); m.geometry = g; }
  else { m = new THREE.Mesh(g, R3.terMat); m.castShadow = !CHEAP; m.receiveShadow = !CHEAP; TER.meshes.set(key, m); R3.chunkGroup.add(m); }
  TER.decorDirty = true;
}
function clearTerrainChunks() {
  for (const m of TER.meshes.values()) { m.geometry.dispose(); R3.chunkGroup.remove(m); }
  TER.meshes.clear();
  for (const m of TER.outer || []) { m.geometry.dispose(); R3.chunkGroup.remove(m); }
  TER.outer = [];
}
/** The land past the map's edge, coarse: the edge columns carried outwards, so the world has no cut-off rim. */
function buildOuterRing() {
  if (!smoothLook()) return;
  const n = world.N / 16, R = 3;
  for (let cz = -R; cz < n + R; cz++) for (let cx = -R; cx < n + R; cx++) {
    if (cx >= 0 && cz >= 0 && cx < n && cz < n) continue;
    const m = new THREE.Mesh(buildTerrainGeo(cx, cz, 1), R3.terMat); m.receiveShadow = !CHEAP;
    TER.outer.push(m); R3.chunkGroup.add(m);
  }
}

// ---- Textures, painted once at start ---------------------------------------------------------------
function pnoise(x, y, P, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), m = k => ((k % P) + P) % P;
  const a = hash2(m(ix), m(iy), s), b = hash2(m(ix + 1), m(iy), s), c = hash2(m(ix), m(iy + 1), s), d = hash2(m(ix + 1), m(iy + 1), s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Tileable fractal noise over a size-pixel square, base lattice cells across, oct octaves. */
function pfbm(px, py, size, base, oct, s) {
  let t = 0, amp = 0.5, n = 0, P = base;
  for (let o = 0; o < oct; o++) { t += amp * pnoise(px / size * P, py / size * P, P, s + o * 17); n += amp; amp *= 0.5; P *= 2; }
  return t / n;
}
function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
/** A tileable canvas texture: pix(px,py) gives the base colour, then marks(ctx, rnd, wrap, size) paints strokes that wrap. */
function paintTex(size, pix, marks, srgb = true) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const p = pix(px, py), i = (px + size * py) * 4;
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  if (marks) {
    let k = 0; const rnd = () => hash2(k++, 913, size);
    const wrap = draw => { for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) { x.save(); x.translate(ox, oy); draw(); x.restore(); } };
    marks(x, rnd, wrap, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, R3.renderer.capabilities.getMaxAnisotropy());
  return t;
}
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function crackWalks(x, rnd, wrap, size, n, steps, color, width) {
  for (let i = 0; i < n; i++) {
    let px = rnd() * size, py = rnd() * size, a = rnd() * 6.28; const pts = [[px, py]];
    for (let s = 0; s < steps; s++) { a += (rnd() - 0.5) * 1.1; px += Math.cos(a) * 2.2; py += Math.sin(a) * 2.2; pts.push([px, py]); }
    wrap(() => { x.strokeStyle = color; x.lineWidth = width; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts) x.lineTo(p[0], p[1]); x.stroke(); });
  }
}
function makeGroundTextures() {
  const S = CHEAP ? 128 : 256, f = S / 256;
  const hpix = (px, py, s, j) => (hash2(px, py, s) - 0.5) * j;
  const grass = paintTex(S, (px, py) => {
    const n = pfbm(px, py, S, 4, 4, 701), g2 = pfbm(px, py, S, 16, 2, 702);
    let c = mixc([168, 152, 94], [116, 110, 64], n);
    if (g2 < 0.4) c = mixc(c, [96, 80, 56], Math.min(1, (0.4 - g2) * 3.5));
    const j = hpix(px, py, 703, 14); return [c[0] + j, c[1] + j, c[2] + j * 0.6];
  }, (x, rnd, wrap, size) => {
    const pal = [[212, 192, 128], [188, 168, 100], [150, 142, 84], [128, 124, 72], [108, 96, 58], [174, 154, 112], [140, 150, 84]];
    const strokes = [];
    for (let i = 0; i < 7000 * f * f; i++) { const a = rnd() * 6.28, L = (2 + rnd() * 5) * f; strokes.push([rnd() * size, rnd() * size, a, L, pal[Math.floor(rnd() * pal.length)]]); }
    wrap(() => { x.lineWidth = Math.max(1, f); for (const [px, py, a, L, c] of strokes) { x.strokeStyle = rgb(c, 0.85); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); } });
  });
  const mud = paintTex(S, (px, py) => {
    const n = pfbm(px, py, S, 4, 4, 711), w = pfbm(px, py, S, 8, 3, 712);
    let c = mixc([96, 75, 54], [64, 50, 38], n);
    if (w > 0.6) c = mixc(c, [46, 40, 35], Math.min(1, (w - 0.6) * 5));
    if (w > 0.7 && w < 0.72) c = mixc(c, [128, 120, 106], 0.5); // wet shine at a puddle's rim
    const j = hpix(px, py, 713, 10); return [c[0] + j, c[1] + j, c[2] + j];
  }, (x, rnd, wrap, size) => {
    const ruts = []; for (let i = 0; i < 260 * f * f; i++) ruts.push([rnd() * size, rnd() * size, (0.6 + rnd()) * f, rnd() < 0.5 ? [124, 108, 86] : [52, 44, 36]]);
    wrap(() => { for (const [px, py, r, c] of ruts) { x.fillStyle = rgb(c, 0.8); x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill(); } });
  });
  const rock = paintTex(S, (px, py) => {
    const n = pfbm(px, py, S, 4, 5, 721), l = pfbm(px, py, S, 12, 2, 722);
    let c = mixc([146, 138, 124], [94, 88, 80], n);
    if (l > 0.66) c = mixc(c, [122, 124, 92], Math.min(1, (l - 0.66) * 4)); // lichen
    const j = hpix(px, py, 723, 18); return [c[0] + j, c[1] + j, c[2] + j];
  }, (x, rnd, wrap, size) => crackWalks(x, rnd, wrap, size, 34 * f, 26, 'rgba(56,52,48,0.42)', Math.max(1, f)));
  const asph = paintTex(S, (px, py) => {
    const n = pfbm(px, py, S, 8, 4, 731), p = pfbm(px, py, S, 3, 3, 732);
    let v = 62 + (n - 0.5) * 18 + hpix(px, py, 733, 16);
    if (hash2(px, py, 734) < 0.04) v += 40;
    if (p > 0.64) v += 11;
    const dust = pfbm(px, py, S, 5, 3, 735);
    return dust > 0.68 ? mixc([v, v, v + 2], [104, 96, 84], Math.min(1, (dust - 0.68) * 3)) : [v, v, v + 2];
  }, (x, rnd, wrap, size) => crackWalks(x, rnd, wrap, size, 16 * f, 30, 'rgba(30,30,32,0.85)', Math.max(1, f)));
  const dirt = paintTex(S, (px, py) => {
    const n = pfbm(px, py, S, 4, 4, 741);
    const c = mixc([152, 120, 86], [110, 87, 63], n), j = hpix(px, py, 742, 12);
    return [c[0] + j, c[1] + j, c[2] + j];
  }, (x, rnd, wrap, size) => {
    const pal = [[176, 164, 146], [92, 84, 74], [134, 114, 92], [160, 140, 112]], peb = [];
    for (let i = 0; i < 520 * f * f; i++) peb.push([rnd() * size, rnd() * size, (0.6 + rnd() * 1.1) * f, pal[Math.floor(rnd() * 4)]]);
    wrap(() => { for (const [px, py, r, c] of peb) { x.fillStyle = rgb(c, 0.9); x.beginPath(); x.arc(px, py, r, 0, 6.28); x.fill(); } });
  });
  const height = paintTex(S, (px, py) => { const v = pfbm(px, py, S, 8, 4, 751) * 255; return [v, v, v]; }, null, false);
  // water ripples as a normal map
  const H = new Float32Array(S * S);
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) H[px + S * py] = pfbm(px, py, S, 6, 4, 761);
  const wn = paintTex(S, (px, py) => {
    const hx = H[((px + 1) % S) + S * py] - H[((px + S - 1) % S) + S * py], hy = H[px + S * ((py + 1) % S)] - H[px + S * ((py + S - 1) % S)];
    const nx = -hx * 6, ny = -hy * 6, nz = 1, L = Math.hypot(nx, ny, nz);
    return [(nx / L * 0.5 + 0.5) * 255, (ny / L * 0.5 + 0.5) * 255, (nz / L * 0.5 + 0.5) * 255];
  }, null, false);
  return { grass, mud, rock, asph, dirt, height, wn };
}

const TER_FRAG = `
vec2 tp = vTPos.xz;
vec3 cG = texture2D(tGrass, tp * 0.26).rgb;
vec3 cM = texture2D(tMud, tp * 0.21).rgb;
vec3 cR = mix(texture2D(tRock, tp * 0.17).rgb, texture2D(tRock, vec2(vTPos.x + vTPos.z * 0.7, vTPos.y * 1.3) * 0.17).rgb, clamp(vSteep * 2.0, 0.0, 1.0));
vec3 cA = texture2D(tAsph, tp * 0.16).rgb;
vec3 cD = texture2D(tDirt, tp * 0.23).rgb;
vec4 hh = vec4(texture2D(tHeight, tp * 0.26).r, texture2D(tHeight, tp * 0.21 + 0.3).r, texture2D(tHeight, tp * 0.17 + 0.6).r, texture2D(tHeight, tp * 0.16 + 0.1).r);
float hd = texture2D(tHeight, tp * 0.23 + 0.8).r;
float wd = max(0.0, 1.0 - vSplat.x - vSplat.y - vSplat.z - vSplat.w);
// height blend: where two grounds meet, the one whose texture stands higher shows through
vec4 on = step(0.015, vSplat);
vec4 ha = mix(vec4(-1.0), vSplat + hh * 0.45, on);
float hdd = wd > 0.015 ? wd + hd * 0.45 : -1.0;
float mx = max(max(max(ha.x, ha.y), max(ha.z, ha.w)), hdd);
vec4 ws = max(ha - mx + 0.16, 0.0);
float wsd = max(hdd - mx + 0.16, 0.0);
float tot = ws.x + ws.y + ws.z + ws.w + wsd + 1e-4;
vec3 gc = (cG * ws.x + cM * ws.y + cR * ws.z + cA * ws.w + cD * wsd) / tot;
float big = texture2D(tHeight, tp * 0.027).r;
gc *= 0.84 + big * 0.32;
diffuseColor.rgb *= gc;
`;
function makeTerrainMaterial(T) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { tGrass: { value: T.grass }, tMud: { value: T.mud }, tRock: { value: T.rock }, tAsph: { value: T.asph }, tDirt: { value: T.dirt }, tHeight: { value: T.height } });
    sh.vertexShader = 'attribute vec4 splat;\nattribute float steep;\nvarying vec4 vSplat;\nvarying float vSteep;\nvarying vec3 vTPos;\n' +
      sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSplat = splat; vSteep = steep; vTPos = position;');
    sh.fragmentShader = 'uniform sampler2D tGrass;\nuniform sampler2D tMud;\nuniform sampler2D tRock;\nuniform sampler2D tAsph;\nuniform sampler2D tDirt;\nuniform sampler2D tHeight;\nvarying vec4 vSplat;\nvarying float vSteep;\nvarying vec3 vTPos;\n' +
      sh.fragmentShader.replace('#include <map_fragment>', TER_FRAG);
  };
  m.customProgramCacheKey = () => 'terrain-splat';
  return m;
}

// ---- Woods, tufts and stones -------------------------------------------------------------------------
function jitterGeo(geo, amt, seed) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = Math.round(x * 97) * 7 + Math.round(y * 89) * 13 + Math.round(z * 83) * 31; // shared corners move together
    p.setXYZ(i, x + (hash2(k, 1, seed) - 0.5) * amt, y + (hash2(k, 2, seed) - 0.5) * amt, z + (hash2(k, 3, seed) - 0.5) * amt);
  }
  geo.computeVertexNormals();
  return geo;
}
function tuftGeo() {
  const pos = [], col = [];
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * 6.28 + hash2(b, 5, 1) * 0.6, r = 0.05 + hash2(b, 6, 1) * 0.12, h = 0.32 + hash2(b, 7, 1) * 0.34, lean = 0.12 + hash2(b, 8, 1) * 0.2;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r, tx = Math.cos(a) * (r + lean), tz = Math.sin(a) * (r + lean), px = -Math.sin(a) * 0.035, pz = Math.cos(a) * 0.035;
    pos.push(cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz, cx + px, 0, cz + pz, cx - px, 0, cz - pz, tx, h, tz); // both faces, so neither is lit from behind
    for (let f = 0; f < 2; f++) col.push(0.62, 0.58, 0.46, 0.62, 0.58, 0.46, 1.1, 1.08, 1.0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); // lit like the ground under it
  return g;
}
function instMesh(geo, mat, n, shadow) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.count = 0; m.castShadow = shadow && !CHEAP; m.receiveShadow = !CHEAP; m.frustumCulled = false;
  m.setColorAt(0, new THREE.Color(1, 1, 1));
  R3.scene.add(m); return m;
}
/** Builds the terrain textures, materials and the decoration meshes. Called by initView. */
function initTerrain() {
  const T = makeGroundTextures(); R3.terTex = T;
  R3.terMat = makeTerrainMaterial(T);
  const trunk = new THREE.CylinderGeometry(0.6, 1, 1, 6); trunk.translate(0, 0.5, 0);
  const cone = jitterGeo(new THREE.ConeGeometry(1, 1, 8, 2).translate(0, 0.5, 0), 0.12, 3);
  const blob = jitterGeo(new THREE.IcosahedronGeometry(1, 1), 0.22, 4);
  const stone = jitterGeo(new THREE.IcosahedronGeometry(1, 0), 0.45, 5);
  const plain = new THREE.MeshLambertMaterial({ color: 0xffffff });
  R3.dec = {
    trunk: instMesh(trunk, plain, 9000, true),
    cone: instMesh(cone, plain, 9000, true),
    blob: instMesh(blob, plain, 9000, true),
    stone: instMesh(stone, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), 7000, true),
    tuft: instMesh(tuftGeo(), new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }), 30000, false),
  };
  R3.decT = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(0, 0, 0, 'YXZ'), s: new THREE.Vector3(), p: new THREE.Vector3(), c: new THREE.Color() };
}
const PAL = {
  conifer: [0x3c4a2e, 0x46532f, 0x4f5935, 0x5d5a36, 0x64603a],
  leaf: [0x5c6b36, 0x6c7140, 0x7d7440, 0x8a7a44, 0x667a3c],
  trunk: [0x4b3a2a, 0x56422f, 0x5e4a38], dead: [0x6a5a4a, 0x5d5148, 0x7a6a58],
  tuft: [0xb7a467, 0xa39457, 0x8e8a50, 0xc2ad72, 0x7f7a46, 0x9c9a5a],
  stone: [0x8d877c, 0x77726a, 0x9a9284, 0x6a655e, 0x857d70],
};
function putInst(mesh, cnt, x, y, z, ex, ey, ez, sx, sy, sz, hex, k) {
  if (cnt >= mesh.instanceMatrix.count) return cnt;
  const T = R3.decT;
  T.e.set(ex, ey, ez, 'YXZ'); T.q.setFromEuler(T.e); T.s.set(sx, sy, sz); T.p.set(x, y, z);
  T.m.compose(T.p, T.q, T.s); mesh.setMatrixAt(cnt, T.m);
  T.c.setHex(hex).multiplyScalar(k); mesh.setColorAt(cnt, T.c);
  return cnt + 1;
}
const pick = (a, h) => a[Math.floor(h * a.length) % a.length];
/** Places every tree (from the TREE voxels), tuft and stone again from the current ground. */
function rebuildDecor() {
  if (!R3.dec || !TER.ground) return;
  TER.decorDirty = false; TER.decorAt = performance.now();
  const N = world.N, WL = world.WL, D = R3.dec, sm = smoothLook();
  let nt = 0, nc = 0, nb = 0, ng = 0, ns = 0;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = x + N * z, h = world.hmap[i], g = TER.ground[i];
    if (h > g && world.vox[VH * i + h - 1] === V.TREE) {
      let c = 0; while (c < h - g && world.vox[VH * i + h - 1 - c] === V.TREE) c++;
      const px = x + 0.3 + hash2(x, z, 820) * 0.4, pz = z + 0.3 + hash2(z, x, 820) * 0.4;
      const y = (sm ? terrainY(px, pz) : h - c) - 0.05, s = 0.8 + hash2(x, z, 822) * 0.55, kind = hash2(x, z, 821), yaw = hash2(x, z, 823) * 6.28, br = 0.88 + hash2(x, z, 824) * 0.24;
      if (c < 2) { // a broken stump and the trunk lying beside it
        nt = putInst(D.trunk, nt, px, y, pz, 0, yaw, 0, 0.32 * s, 0.7, 0.32 * s, pick(PAL.trunk, kind), br);
        nt = putInst(D.trunk, nt, px + Math.sin(yaw) * 0.4, y + 0.25, pz + Math.cos(yaw) * 0.4, Math.PI / 2, yaw, 0, 0.24 * s, 3.2 * s, 0.24 * s, pick(PAL.trunk, kind), br * 0.9);
        continue;
      }
      if (kind < 0.45) { // conifer
        nt = putInst(D.trunk, nt, px, y, pz, 0, yaw, 0, 0.22 * s, 1.8 * s, 0.22 * s, pick(PAL.trunk, kind * 2), br);
        const cc = pick(PAL.conifer, hash2(x, z, 825));
        nc = putInst(D.cone, nc, px, y + 1.1 * s, pz, 0, yaw, 0, 1.55 * s, 2.3 * s, 1.55 * s, cc, br);
        nc = putInst(D.cone, nc, px, y + 2.3 * s, pz, 0, yaw + 1, 0, 1.2 * s, 2.0 * s, 1.2 * s, cc, br * 1.04);
        nc = putInst(D.cone, nc, px, y + 3.4 * s, pz, 0, yaw + 2, 0, 0.82 * s, 1.8 * s, 0.82 * s, cc, br * 1.08);
      } else if (kind < 0.88) { // broadleaf, dry
        nt = putInst(D.trunk, nt, px, y, pz, 0, yaw, 0, 0.28 * s, 2.6 * s, 0.28 * s, pick(PAL.trunk, kind), br);
        const lc = pick(PAL.leaf, hash2(x, z, 826));
        nb = putInst(D.blob, nb, px, y + 3.2 * s, pz, 0, yaw, 0, 1.55 * s, 1.25 * s, 1.55 * s, lc, br);
        nb = putInst(D.blob, nb, px + Math.sin(yaw) * 0.8 * s, y + 2.7 * s, pz + Math.cos(yaw) * 0.8 * s, 0, yaw, 0, 1.1 * s, 0.95 * s, 1.1 * s, lc, br * 0.94);
        nb = putInst(D.blob, nb, px - Math.cos(yaw) * 0.7 * s, y + 2.8 * s, pz + Math.sin(yaw) * 0.7 * s, 0, yaw, 0, 1.0 * s, 0.9 * s, 1.0 * s, lc, br * 1.06);
      } else { // dead, bare branches
        const dc = pick(PAL.dead, kind * 3);
        nt = putInst(D.trunk, nt, px, y, pz, 0, yaw, 0, 0.22 * s, 3.6 * s, 0.22 * s, dc, br);
        for (let b = 0; b < 4; b++) nt = putInst(D.trunk, nt, px, y + (1.6 + b * 0.5) * s, pz, 0.75 + b * 0.12, yaw + b * 1.7, 0, 0.09 * s, (1.6 - b * 0.2) * s, 0.09 * s, dc, br * 0.95);
      }
      continue;
    }
    if (!sm || h !== g || g < WL) continue;
    const k = i * 4, gw = TER.cellW[k], rw = TER.cellW[k + 2], aw = TER.cellW[k + 3];
    if (aw > 0.3) continue;
    const want = gw * tune.grass_tufts, cnt = Math.floor(want) + (hash2(x, z, 801) < want % 1 ? 1 : 0);
    const burnt = world.scorch[i] > 60;
    for (let j = 0; j < cnt; j++) {
      const px = x + hash2(x * 3 + j, z, 802), pz = z + hash2(x, z * 3 + j, 803), s = 0.6 + hash2(x + j, z, 804) * 0.9;
      ng = putInst(D.tuft, ng, px, terrainY(px, pz) - 0.04, pz, 0, hash2(x, z + j, 805) * 6.28, 0, s, s * (0.8 + hash2(j, x, 806) * 0.5), s, burnt ? 0x4a4238 : pick(PAL.tuft, hash2(x, z + j * 7, 807)), 1);
    }
    if (hash2(x, z, 811) < tune.stone_density * (0.5 + rw * 1.5)) {
      const big = rw > 0.5 && hash2(x, z, 812) < 0.08;
      const s = big ? 0.5 + hash2(x, z, 813) * 0.5 : 0.1 + hash2(x, z, 813) * 0.22;
      const px = x + 0.2 + hash2(x, z, 814) * 0.6, pz = z + 0.2 + hash2(z, x, 814) * 0.6;
      ns = putInst(D.stone, ns, px, terrainY(px, pz) + s * 0.15, pz, hash2(x, z, 815), hash2(x, z, 816) * 6.28, 0, s * (1 + hash2(x, z, 817) * 0.5), s * 0.65, s, pick(PAL.stone, hash2(x, z, 818)), 1);
    }
  }
  for (const [m, n] of [[D.trunk, nt], [D.cone, nc], [D.blob, nb], [D.tuft, ng], [D.stone, ns]]) {
    m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }
}
