// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Structures on their own fine grid (struct_res cells a metre, 4 = 25 cm): simple ruined houses and blocks of
// flats. Each structure keeps a dense grid of material cells over its box. Its 1 m projection is written into
// world.vox and marked in world.fmark (1 = a 1 m cell the structure fills, 2 = one it fills in part), so the
// paths, cover, garrisons and vehicles keep reading the 1 m world while the view draws the fine cells.
'use strict';

/** Fine materials (0 is air). */
const FM = { AIR: 0, CONC: 1, BRICK: 2, PLAST: 3, ADOBE: 4, WOOD: 5, METAL: 6, RUST: 7, RUBC: 8, RUBB: 9, BEAM: 10, TILE: 11,
  BAG: 12, HAY: 13, CLOTH: 14, STRIPE: 15, RAID: 16, JUNK: 17, GLASS: 18, TYRE: 19 };
/**
 * The 1 m kind each fine material projects to. Sandbags, hay, canvas and junk stay soft (light cover, crushed by
 * tracks: vehCrush); a structure's wood (barns, fences, platforms) projects hard.
 */
const FMV = [0, V.CONC, V.BRICK, V.PLAST, V.ADOBE, V.ADOBE, V.METAL, V.RUST, V.CONC, V.BRICK, V.CONC, V.TILE,
  V.BAG, V.HAY, V.CLOTH, V.STRIPE, V.RAID, V.JUNK, V.GLASS, V.JUNK];
/** How hard each fine material is to blow away (multiplies the blast radius). */
const FMH = [0, 0.62, 0.72, 0.8, 0.9, 1.1, 0.75, 0.8, 1.05, 1.05, 0.55, 1, 1.15, 1.3, 1.4, 0.78, 0.78, 1.15, 1.5, 1.1];
/** Fine material colours (sRGB hex). */
const FMCOL = [0, 0x9e968b, 0x9c5038, 0xd2c3a2, 0xbba57c, 0x7c5535, 0x7d8b92, 0x8e4b27, 0x8a8279, 0x86513c, 0x5c4a3a, 0xa04428,
  VCOL[V.BAG], VCOL[V.HAY], VCOL[V.CLOTH], VCOL[V.STRIPE], VCOL[V.RAID], VCOL[V.JUNK], VCOL[V.GLASS], 0x2b2724];
/** Fine materials tracks crush (vehCrush). */
const FSOFT = new Set([FM.WOOD, FM.BAG, FM.HAY, FM.CLOTH, FM.JUNK]);
/**
 * The statics (staticsFail), a value a material: FMW the weight of a fine cell (metal shells are thin sheet drawn
 * half a metre thick, so light); FMC the load a cell bearing on the one under it carries before it is crushed
 * (statics_load times); FMM the moment (weight times metres of overhang) a bearing cell holds (statics_moment
 * times); FMS the metres a cell may reach out from the nearest cell that bears (statics_span times).
 *            AIR  CONC BRICK PLAST ADOBE WOOD METAL RUST RUBC RUBB BEAM TILE BAG  HAY  CLOTH STRIPE RAID JUNK GLASS TYRE */
const FMW = [0,   1,   0.9,  0.85, 0.8,  0.35, 0.15, 0.15, 0.8, 0.75, 0.4, 0.7, 0.6, 0.2, 0.05, 0.15,  0.15, 0.3, 0.3,  0.2];
const FMC = [0,   400, 250,  200,  120,  80,   300,  150,  20,  20,   120, 60,  40,  15,  5,    300,   200,  30,  10,   200];
const FMM = [0,   150, 60,   50,   30,   130,  50,   30,   5,   5,    150, 10,  10,  5,   5,    50,    40,   15,  5,    100];
const FMS = [0,   6,   1.5,  1.5,  1,    3,    4,    3,    0.5, 0.5,  4,   1,   0.5, 0.5, 2,    4,     3,    2,   0.5,  0.5];
/**
 * Damage (iteration 53): FMHP the integrity of a fine cell (the damage it takes before it goes; on the way it cracks,
 * drawn darker, and bears less: struct_weak); FMARM the mm of penetration a piercing round or a shaped charge spends
 * crossing it; FMSOFT how much bullets and splinters bite it (soft wood, glass and canvas; hardly concrete).
 *              AIR CONC BRICK PLAST ADOBE WOOD METAL RUST RUBC RUBB BEAM TILE BAG  HAY  CLOTH STRIPE RAID JUNK GLASS TYRE */
const FMHP   = [0,  60,  40,   30,   25,   30,  50,   35,  15,  15,  35,  15,  40,  15,  5,    50,    40,  20,  3,    40];
const FMARM  = [0,  60,  40,   25,   25,   12,  25,   18,  20,  20,  15,  10,  30,  5,   1,    25,    25,  15,  2,    20];
const FMSOFT = [0,  0.05, 0.1, 0.35, 0.3,  0.8, 0.15, 0.25, 0.5, 0.5, 0.6, 0.6, 0.2, 1,   1,    0.15,  0.15, 0.5, 1.5, 0.3];
/** The fine material a 1 m kind becomes (d when it has none). */
function fmOf(t, d) {
  const m = { [V.CONC]: FM.CONC, [V.BRICK]: FM.BRICK, [V.PLAST]: FM.PLAST, [V.ADOBE]: FM.ADOBE, [V.PLANK]: FM.WOOD, [V.WOOD]: FM.WOOD, [V.METAL]: FM.METAL, [V.RUST]: FM.RUST, [V.TILE]: FM.TILE,
    [V.BAG]: FM.BAG, [V.HAY]: FM.HAY, [V.CLOTH]: FM.CLOTH, [V.STRIPE]: FM.STRIPE, [V.RAID]: FM.RAID, [V.JUNK]: FM.JUNK, [V.GLASS]: FM.GLASS, [V.GREEN]: FM.CLOTH }[t];
  return m || d;
}
/** Fine cells a metre. */
function structRes() { return Math.max(2, Math.min(4, Math.round(tune.struct_res))); }

// ---- Storage ---------------------------------------------------------------------------------------------
/** Clears the structures for a new map of N x N columns. */
function structsReset(N) { world.structs = []; world.sown = new Int16Array(N * N); world.fmark = new Uint8Array(N * N * VH); world.sdirty = new Set(); world.schip = new Set(); world.settleT = 0; world.pieces = []; }
/**
 * A new structure over the 1 m box from (x0, z0), w x d columns, its ground floor at height g, h metres tall
 * above it and `below` metres of foundation under it. Columns another structure already holds stay out of it,
 * and with cols (a Set of column indices x + N z) so do the columns not in it.
 */
function newStruct(x0, z0, w, d, g, h, below, cols) {
  const F = structRes(), N = world.N, yb = g - below, hgt = Math.min(VH - yb, h + below);
  const S = { id: world.structs.length, x0, z0, w, d, g, yb, hgt, F, sx: w * F, sy: hgt * F, sz: d * F, own: new Uint8Array(w * d), mesh: null, bld: null };
  S.cells = new Uint8Array(S.sx * S.sy * S.sz);
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
    const x = x0 + dx, z = z0 + dz; if (!inMap(x, z)) continue;
    const i = x + N * z; if (world.sown[i] || (cols && !cols.has(i))) continue;
    world.sown[i] = S.id + 1; S.own[dx + w * dz] = 1;
  }
  world.structs.push(S);
  return S;
}
function sget(S, x, y, z) { return x < 0 || y < 0 || z < 0 || x >= S.sx || y >= S.sy || z >= S.sz ? 0 : S.cells[x + S.sx * (z + S.sz * y)]; }
/** Sets a fine cell, inside the box and in a column the structure holds. */
function sset(S, x, y, z, m) {
  if (x < 0 || y < 0 || z < 0 || x >= S.sx || y >= S.sy || z >= S.sz) return;
  if (!S.own[((x / S.F) | 0) + S.w * ((z / S.F) | 0)]) return;
  const l = x + S.sx * (z + S.sz * y); S.cells[l] = m; if (S.dmg) S.dmg[l] = 0; // a new cell is whole
}
/** 0 or 1: the fine cell at world point (x, y, z), or -1 where no structure holds that point. */
function structSolidAt(x, y, z) {
  if (!world.sown) return -1;
  const ix = Math.floor(x), iz = Math.floor(z); if (!inMap(ix, iz)) return -1;
  const o = world.sown[ix + world.N * iz]; if (!o) return -1;
  const S = world.structs[o - 1], fy = Math.floor((y - S.yb) * S.F);
  if (fy < 0 || fy >= S.sy) return -1;
  return sget(S, Math.floor((x - S.x0) * S.F), fy, Math.floor((z - S.z0) * S.F)) ? 1 : 0;
}

// ---- The 1 m projection ------------------------------------------------------------------------------------
/**
 * Writes the structure's 1 m cells above its ground floor into world.vox: a 1 m cell at least struct_fill full
 * is solid (its kind the material most of its fine cells are), one less full is open.
 */
function projectStruct(S) {
  const F = S.F, thr = Math.max(1, Math.round(tune.struct_fill * F * F * F)), N = world.N, cnt = new Uint16Array(32);
  for (let cz = 0; cz < S.d; cz++) for (let cx = 0; cx < S.w; cx++) {
    if (!S.own[cx + S.w * cz]) continue;
    const X = S.x0 + cx, Z = S.z0 + cz;
    for (let cy = S.g - S.yb; cy < S.hgt; cy++) {
      const y = S.yb + cy; if (y >= VH) break;
      cnt.fill(0); let n = 0;
      for (let fy = cy * F; fy < cy * F + F; fy++) for (let fz = cz * F; fz < cz * F + F; fz++) {
        const row = S.sx * (fz + S.sz * fy);
        for (let fx = cx * F; fx < cx * F + F; fx++) { const m = S.cells[fx + row]; if (m) { cnt[m]++; n++; } }
      }
      const k = vi(X, y, Z);
      if (n >= thr) { let best = 1; for (let m = 2; m < 32; m++) if (cnt[m] > cnt[best]) best = m; world.vox[k] = FMV[best]; world.fmark[k] = 1; }
      else { if (world.fmark[k] === 1) world.vox[k] = 0; world.fmark[k] = n ? 2 : 0; }
    }
    recomputeColumn(X, Z); markDirty(X, Z);
  }
}
/**
 * After the map rules: a 1 m cell a rule emptied (a doorway, a road kept open) loses its fine cells too, then
 * every structure is projected again.
 */
function structsSync() {
  for (const S of world.structs) {
    const F = S.F;
    for (let cz = 0; cz < S.d; cz++) for (let cx = 0; cx < S.w; cx++) {
      if (!S.own[cx + S.w * cz]) continue;
      for (let cy = S.g - S.yb; cy < S.hgt; cy++) {
        const k = vi(S.x0 + cx, S.yb + cy, S.z0 + cz); if (world.fmark[k] !== 1 || world.vox[k]) continue;
        for (let fy = cy * F; fy < cy * F + F; fy++) for (let fz = cz * F; fz < cz * F + F; fz++) for (let fx = cx * F; fx < cx * F + F; fx++) S.cells[fx + S.sx * (fz + S.sz * fy)] = 0;
      }
    }
    if (!S.port) structCheck(S, false); // what cannot stand goes before play (ported 1 m decor keeps its odd joins, a tent's ridge on its sides, till it is hit)
    projectStruct(S);
    world.sdirty.add(S.id);
  }
}
registerWorldStep('structSync', { order: 95, run: () => structsSync() });

// ---- Damage ------------------------------------------------------------------------------------------------
/**
 * Where an object leans on an older structure: its fine cells touching, side by side, a solid fine cell of a
 * structure built before it (a lean-to against a wall, a fence run up to a house) are held by it, as by the ground.
 * Only objects lean (S.obj), and only on what was built earlier, so two things never hold each other up. A mask
 * over S.cells, or null.
 */
function leanMask(S) {
  if (!S.obj) return null;
  const { sx, sy, sz, F } = S, N = world.N; let M = null;
  for (let fz = 0; fz < sz; fz++) for (let fx = 0; fx < sx; fx++) {
    const cx = (fx / F) | 0, cz = (fz / F) | 0; if (!S.own[cx + S.w * cz]) continue;
    const ex = fx % F, ez = fz % F; if (ex && ex < F - 1 && ez && ez < F - 1) continue;
    for (let s = 0; s < 4; s++) {
      const nx = fx + (s === 0 ? -1 : s === 1 ? 1 : 0), nz = fz + (s === 2 ? -1 : s === 3 ? 1 : 0), ncx = Math.floor(nx / F), ncz = Math.floor(nz / F);
      if (ncx === cx && ncz === cz) continue;
      const X = S.x0 + ncx, Z = S.z0 + ncz; if (!inMap(X, Z)) continue;
      const o = world.sown[X + N * Z]; if (!o || o - 1 >= S.id) continue;
      const T = world.structs[o - 1], tx = Math.floor((S.x0 + (nx + 0.5) / F - T.x0) * T.F), tz = Math.floor((S.z0 + (nz + 0.5) / F - T.z0) * T.F);
      for (let fy = 0; fy < sy; fy++) {
        const l = fx + sx * (fz + sz * fy); if (!S.cells[l]) continue;
        if (sget(T, tx, Math.floor((S.yb + (fy + 0.5) / F - T.yb) * T.F), tz)) (M || (M = new Uint8Array(sx * sy * sz)))[l] = 1;
      }
    }
  }
  return M;
}
/**
 * Removes what no longer stands: a fine cell is anchored when the 1 m cell under it is solid ground or another
 * 1 m voxel no structure holds (never merely because it is the bottom of its box), and the rest stands through
 * its six neighbours. Returns how many fine cells fell. With fall (in play)
 * the loose cells come away as falling pieces (spawnPieces); without (building the map) they just go.
 */
function dropLoose(S, fall) {
  const { sx, sy, sz, F } = S, n = sx * sy * sz, seen = new Uint8Array(n), q = new Int32Array(n), C = S.cells;
  let qh = 0, qt = 0;
  for (let fz = 0; fz < sz; fz++) for (let fx = 0; fx < sx; fx++) {
    const X = S.x0 + ((fx / F) | 0), Z = S.z0 + ((fz / F) | 0);
    for (let fy = 0; fy < sy; fy += F) { // the first fine row of each 1 m layer rests on the 1 m cell below
      const l = fx + sx * (fz + sz * fy); if (!C[l]) continue;
      const y = S.yb + fy / F, k = y > 0 ? vi(X, y - 1, Z) : -1;
      if (y === 0 || (k >= 0 && world.vox[k] && !world.fmark[k])) { seen[l] = 1; q[qt++] = l; }
    }
  }
  const lean = leanMask(S); if (lean) for (let l = 0; l < n; l++) if (lean[l] && !seen[l]) { seen[l] = 1; q[qt++] = l; } // leaning on an older structure
  const sxz = sx * sz;
  while (qh < qt) {
    const l = q[qh++], fx = l % sx, fz = ((l / sx) | 0) % sz, fy = (l / sxz) | 0;
    if (fx > 0 && C[l - 1] && !seen[l - 1]) { seen[l - 1] = 1; q[qt++] = l - 1; }
    if (fx < sx - 1 && C[l + 1] && !seen[l + 1]) { seen[l + 1] = 1; q[qt++] = l + 1; }
    if (fz > 0 && C[l - sx] && !seen[l - sx]) { seen[l - sx] = 1; q[qt++] = l - sx; }
    if (fz < sz - 1 && C[l + sx] && !seen[l + sx]) { seen[l + sx] = 1; q[qt++] = l + sx; }
    if (fy > 0 && C[l - sxz] && !seen[l - sxz]) { seen[l - sxz] = 1; q[qt++] = l - sxz; }
    if (fy < sy - 1 && C[l + sxz] && !seen[l + sxz]) { seen[l + sxz] = 1; q[qt++] = l + sxz; }
  }
  if (fall) return spawnPieces(S, seen);
  let fell = 0;
  for (let l = 0; l < n; l++) if (C[l] && !seen[l]) { C[l] = 0; fell++; }
  return fell;
}
/**
 * The statics of a structure. First, from the bottom up, which fine cells are held up: one on solid ground (the
 * anchors of dropLoose) or on a held cell, or reaching out through its layer from one no farther than its
 * material's span (FMS, statics_span: a slab over its walls, a canopy round its posts). A cell not held that has a
 * cell over it hangs from it (a cut leg under its deck: no weight counted); one with nothing over it breaks off.
 * Then from the top down, the loads: each held cell weighs FMW; one on a held cell bears and passes its load down,
 * one reaching out passes it sideways to the nearest bearing cell of its layer (through the layer, eight ways),
 * with a moment of its load times the overhang. The bearing cells of a layer joined side by side are one section
 * (a post, a wall): crushed when its load passes the sum of its cells' FMC (statics_load); the cells of a layer
 * joined side by side are one plate (a slab and its posts), snapped when the moments of all its sections pass the
 * sum of their FMM (statics_moment); else a section's load is shared evenly by its cells and goes down. And a
 * layer tips over when the centre of what stands on it lies outside the outline of its bearing cells (by more than
 * statics_tip metres): every section of it fails. Returns the fine cells that fail (index into S.cells).
 */
function staticsFail(S) {
  const { sx, sy, sz, F } = S, A = sx * sz, n = A * sy, C = S.cells, kS = tune.statics_span * F, kL = tune.statics_load, kM = tune.statics_moment, tol = tune.statics_tip * F, D2 = Math.SQRT2;
  const held = new Uint8Array(n), down = new Float32Array(A), L = new Float32Array(A), dist = new Float32Array(A), root = new Int32Array(A), comp = new Int32Array(A), q = new Int32Array(A), lc = new Int32Array(A), lean = leanMask(S);
  const Dm = S.dmg, wk = tune.struct_weak / 255; // a cracked cell bears less (struct_weak at the point of giving way)
  const onGround = (i, fy) => {
    if (fy % F) return false;
    const y = S.yb + fy / F; if (y <= 0) return true;
    const k = vi(S.x0 + (((i % sx) / F) | 0), y - 1, S.z0 + ((((i / sx) | 0) / F) | 0)); return !!world.vox[k] && !world.fmark[k];
  };
  const sweep = () => { // distances through the layer's cells (dist >= 0) from those at 0, with the nearest one (root)
    for (let rep = 0; rep < 2; rep++) {
      for (let fz = 0; fz < sz; fz++) for (let fx = 0; fx < sx; fx++) {
        const i = fx + sx * fz; if (dist[i] <= 0) continue;
        let d = dist[i], r = root[i];
        if (fx > 0 && dist[i - 1] >= 0 && dist[i - 1] + 1 < d) { d = dist[i - 1] + 1; r = root[i - 1]; }
        if (fz > 0) {
          const j = i - sx;
          if (dist[j] >= 0 && dist[j] + 1 < d) { d = dist[j] + 1; r = root[j]; }
          if (fx > 0 && dist[j - 1] >= 0 && dist[j - 1] + D2 < d) { d = dist[j - 1] + D2; r = root[j - 1]; }
          if (fx < sx - 1 && dist[j + 1] >= 0 && dist[j + 1] + D2 < d) { d = dist[j + 1] + D2; r = root[j + 1]; }
        }
        dist[i] = d; root[i] = r;
      }
      for (let fz = sz - 1; fz >= 0; fz--) for (let fx = sx - 1; fx >= 0; fx--) {
        const i = fx + sx * fz; if (dist[i] <= 0) continue;
        let d = dist[i], r = root[i];
        if (fx < sx - 1 && dist[i + 1] >= 0 && dist[i + 1] + 1 < d) { d = dist[i + 1] + 1; r = root[i + 1]; }
        if (fz < sz - 1) {
          const j = i + sx;
          if (dist[j] >= 0 && dist[j] + 1 < d) { d = dist[j] + 1; r = root[j]; }
          if (fx < sx - 1 && dist[j + 1] >= 0 && dist[j + 1] + D2 < d) { d = dist[j + 1] + D2; r = root[j + 1]; }
          if (fx > 0 && dist[j - 1] >= 0 && dist[j - 1] + D2 < d) { d = dist[j - 1] + D2; r = root[j - 1]; }
        }
        dist[i] = d; root[i] = r;
      }
    }
  };
  // 1. from the bottom up: what is held up
  for (let fy = 0; fy < sy; fy++) {
    const base = A * fy; let any = false;
    for (let i = 0; i < A; i++) {
      if (!C[base + i]) { dist[i] = -1; continue; }
      any = true; root[i] = i; dist[i] = (fy > 0 && held[base - A + i]) || onGround(i, fy) || (lean && lean[base + i]) ? 0 : 1e9;
    }
    if (!any) continue;
    sweep();
    for (let i = 0; i < A; i++) if (dist[i] >= 0 && dist[i] <= FMS[C[base + i]] * kS) held[base + i] = 1;
  }
  // 2. from the top down: loads, sections, tipping
  const bad = []; let Wt = 0, Wx = 0, Wz = 0;
  for (let fy = sy - 1; fy >= 0; fy--) {
    const base = A * fy; let any = false;
    for (let i = 0; i < A; i++) {
      const l = base + i, m = C[l]; comp[i] = -1;
      if (!m || !held[l]) { dist[i] = -1; if (m && !(fy < sy - 1 && C[l + A])) bad.push(l); continue; }
      any = true; L[i] = FMW[m] + down[i]; root[i] = i;
      dist[i] = (fy > 0 && held[l - A]) || onGround(i, fy) || (lean && lean[l]) ? 0 : 1e9;
      Wt += FMW[m]; Wx += FMW[m] * (i % sx + 0.5); Wz += FMW[m] * (((i / sx) | 0) + 0.5);
    }
    down.fill(0);
    if (!any) continue;
    sweep();
    // the sections: bearing cells joined side by side
    const cLoad = [], cMom = [], cCap = [], cMc = [], cN = [], cAt = [];
    for (let i = 0; i < A; i++) {
      if (dist[i] !== 0 || comp[i] >= 0) continue;
      const id = cLoad.length; cAt.push(i); let qh = 0, qt = 0, cap = 0, mc = 0, ld = 0;
      q[qt++] = i; comp[i] = id;
      while (qh < qt) {
        const j = q[qh++], m = C[base + j], fx = j % sx, fz = (j / sx) | 0;
        const sound = Dm ? 1 - Dm[base + j] * wk : 1; cap += FMC[m] * sound; mc += FMM[m] * sound; ld += L[j];
        if (fx > 0 && dist[j - 1] === 0 && comp[j - 1] < 0) { comp[j - 1] = id; q[qt++] = j - 1; }
        if (fx < sx - 1 && dist[j + 1] === 0 && comp[j + 1] < 0) { comp[j + 1] = id; q[qt++] = j + 1; }
        if (fz > 0 && dist[j - sx] === 0 && comp[j - sx] < 0) { comp[j - sx] = id; q[qt++] = j - sx; }
        if (fz < sz - 1 && dist[j + sx] === 0 && comp[j + sx] < 0) { comp[j + sx] = id; q[qt++] = j + sx; }
      }
      cLoad.push(ld); cMom.push(0); cCap.push(cap); cMc.push(mc); cN.push(qt);
    }
    // what reaches out weighs on its section
    for (let i = 0; i < A; i++) {
      const d = dist[i]; if (d <= 0) continue;
      const c = comp[root[i]]; if (c < 0 || d > FMS[C[base + i]] * kS + 0.01) { bad.push(base + i); continue; }
      cLoad[c] += L[i]; cMom[c] += L[i] * d / F;
    }
    // tipping: the centre of what stands on this layer over the outline of its bearing cells
    let tip = false;
    if (Wt > 0 && cLoad.length) {
      const pts = []; let mx = 0, mz = 0, mn = 0;
      for (let fz = 0; fz < sz; fz++) {
        let a0 = -1, b0 = -1;
        for (let fx = 0; fx < sx; fx++) if (dist[fx + sx * fz] === 0) { if (a0 < 0) a0 = fx; b0 = fx; mx += fx + 0.5; mz += fz + 0.5; mn++; }
        if (a0 >= 0) pts.push([a0, fz], [b0 + 1, fz], [a0, fz + 1], [b0 + 1, fz + 1]);
      }
      tip = outsideHull(pts, Wx / Wt, Wz / Wt, tol);
      if (tip) { const dx = Wx / Wt - mx / mn, dz = Wz / Wt - mz / mn, dl = Math.hypot(dx, dz) || 1; S.tip = [dx / dl, dz / dl]; } // the way it goes over (spawnPieces)
    }
    // the plates: the layer's cells joined side by side share the moment of what hangs from them over all their
    // sections (a slab spreads its weight over every post under it, a damaged one or not)
    lc.fill(-1); const pMom = [], pMc = [];
    for (let i = 0; i < A; i++) {
      if (dist[i] < 0 || lc[i] >= 0) continue;
      const id = pMom.length; let qh = 0, qt = 0; q[qt++] = i; lc[i] = id;
      while (qh < qt) {
        const j = q[qh++], fx = j % sx, fz = (j / sx) | 0;
        if (fx > 0 && dist[j - 1] >= 0 && lc[j - 1] < 0) { lc[j - 1] = id; q[qt++] = j - 1; }
        if (fx < sx - 1 && dist[j + 1] >= 0 && lc[j + 1] < 0) { lc[j + 1] = id; q[qt++] = j + 1; }
        if (fz > 0 && dist[j - sx] >= 0 && lc[j - sx] < 0) { lc[j - sx] = id; q[qt++] = j - sx; }
        if (fz < sz - 1 && dist[j + sx] >= 0 && lc[j + sx] < 0) { lc[j + sx] = id; q[qt++] = j + sx; }
      }
      pMom.push(0); pMc.push(0);
    }
    for (let c = 0; c < cLoad.length; c++) { const p = lc[cAt[c]]; pMom[p] += cMom[c]; pMc[p] += cMc[c]; }
    // each section holds or fails (crushed by its load, or its plate snapped by its moment); what holds passes its
    // load down, shared evenly
    for (let c = 0; c < cLoad.length; c++) {
      const p = lc[cAt[c]], fail = tip || cLoad[c] > cCap[c] * kL || pMom[p] > pMc[p] * kM;
      cLoad[c] = fail ? -1 : cLoad[c] / cN[c];
    }
    for (let i = 0; i < A; i++) {
      if (dist[i] !== 0) continue;
      const per = cLoad[comp[i]];
      if (per < 0) { bad.push(base + i); continue; }
      if (fy > 0 && held[base - A + i]) down[i] += per;
    }
  }
  return bad;
}
/** Whether point (px, pz) lies outside the convex outline of pts ([x, z] pairs) by more than tol. */
function outsideHull(pts, px, pz, tol) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], hi = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  const H = lo.slice(0, -1).concat(hi.slice(0, -1));
  if (H.length < 3) return false;
  for (let i = 0; i < H.length; i++) {
    const a = H[i], b = H[(i + 1) % H.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    if (cr(a, b, [px, pz]) / len < -tol) return true;
  }
  return false;
}
/** Fine cells a failing structure loses where it gives way: crushed to dust and a few chips. */
function crumble(S, bad, fall) {
  const C = S.cells, A = S.sx * S.sz, F = S.F;
  let ax = 0, ay = 0, az = 0, m0 = 0;
  for (const l of bad) { if (!m0) m0 = C[l]; C[l] = 0; ax += l % S.sx; az += ((l / S.sx) | 0) % S.sz; ay += (l / A) | 0; }
  if (!fall || !bad.length) return;
  const n = bad.length, x = S.x0 + ax / n / F, y = S.yb + ay / n / F, z = S.z0 + az / n / F;
  if (state.fx) state.fx.push({ kind: 'smoke', x, y, z, t: 0, life: 1.2, s: 0.4 + Math.min(1.5, n / 200), rise: 0.6, col: FMCOL[m0] || 0x9a8e80 });
  for (let i = 0; i < Math.min(5, 1 + n / 40); i++) { const l = bad[Math.floor(rng() * n)]; spawnDebris([Math.floor(x), Math.floor(y), Math.floor(z), FMV[m0] || V.CONC], S.x0 + (l % S.sx + 0.5) / F, S.yb + (((l / A) | 0) + 0.5) / F, S.z0 + ((((l / S.sx) | 0) % S.sz) + 0.5) / F, 1); }
}
/**
 * After damage: what is cut off falls (dropLoose), then the statics, statics_iter rounds of failing sections and
 * what they leave hanging. In play (fall) a collapse still going on comes back at the next settle, a round at a
 * time; building the map it goes on till it stands. Returns how many fine cells came away.
 */
function structCheck(S, fall) {
  let fell = dropLoose(S, fall);
  const rounds = fall ? Math.max(1, Math.round(tune.statics_iter)) : 30;
  for (let it = 0; it < rounds; it++) {
    S.tip = null;
    const bad = staticsFail(S); if (!bad.length) { S.tip = null; S.creakT = 0; if (fall && fell) touchNeighbours(S); return fell; }
    if (fall) { // in play it creaks first (dust, a groan), then gives way: storey after storey, not all at once
      if (!S.creakT) { S.creakT = state.t + tune.collapse_delay * (0.5 + rng()); creakFx(S, bad); world.schip.add(S.id); S.tip = null; return fell; }
      if (state.t < S.creakT) { world.schip.add(S.id); S.tip = null; return fell; }
      S.creakT = 0;
    }
    crumble(S, bad, fall); fell += bad.length + dropLoose(S, fall); // (a piece that tips goes over S.tip's way)
  }
  S.tip = null;
  if (fall) world.schip.add(S.id);
  if (fall) touchNeighbours(S);
  return fell;
}
/** The creak of a structure about to give way: dust trickling from a few of the failing cells, a groan. */
function creakFx(S, bad) {
  const A = S.sx * S.sz, F = S.F;
  if (state.fx) for (let i = 0; i < Math.min(5, 1 + bad.length / 30); i++) {
    const l = bad[Math.floor(rng() * bad.length)];
    state.fx.push({ kind: 'smoke', x: S.x0 + (l % S.sx + 0.5) / F, y: S.yb + (((l / A) | 0) + 0.5) / F, z: S.z0 + ((((l / S.sx) | 0) % S.sz) + 0.5) / F, t: -i * 0.1, life: 1.6, s: 0.35, rise: -0.4, col: 0xa89a88 });
  }
  if (typeof sfx === 'function') sfx('crunch', S.x0 + S.w / 2, S.z0 + S.d / 2);
}
/** The structures touching S's box (a metre round it) are checked again at the next settle: what leaned on it, what it fell on. */
function touchNeighbours(S) {
  for (const T of world.structs) {
    if (T === S || T.x0 > S.x0 + S.w || T.x0 + T.w < S.x0 || T.z0 > S.z0 + S.d || T.z0 + T.d < S.z0) continue;
    world.schip.add(T.id);
  }
}
/** Carves a sphere (fine units: centre and radius) out of a structure; each material resists by its hardness. */
function carveSphere(S, cx, cy, cz, r, noisy) {
  const R = Math.ceil(r * 1.2), C = S.cells;
  let n = 0;
  for (let fy = Math.max(0, Math.floor(cy - R)); fy <= Math.min(S.sy - 1, cy + R); fy++)
    for (let fz = Math.max(0, Math.floor(cz - R)); fz <= Math.min(S.sz - 1, cz + R); fz++)
      for (let fx = Math.max(0, Math.floor(cx - R)); fx <= Math.min(S.sx - 1, cx + R); fx++) {
        const l = fx + S.sx * (fz + S.sz * fy), m = C[l]; if (!m) continue;
        const dx = fx + 0.5 - cx, dy = fy + 0.5 - cy, dz = fz + 0.5 - cz;
        const rr = r * FMH[m] * (noisy ? 0.8 + hash2(fx * 3 + fy * 7, fz * 5 - fy, 41) * 0.4 : 1);
        if (dx * dx + dy * dy + dz * dz <= rr * rr) { C[l] = 0; n++; }
      }
  return n;
}
/**
 * Damages fine cell l of S by amt: its share of the material's integrity (FMHP) adds to S.dmg[l] (0..255); at 255
 * the cell goes. Returns 1 when it went.
 */
function cellHurt(S, l, amt) {
  const m = S.cells[l]; if (!m || amt <= 0) return 0;
  const D = S.dmg || (S.dmg = new Uint8Array(S.cells.length)), v = D[l] + 255 * amt / FMHP[m];
  if (v >= 255) { S.cells[l] = 0; D[l] = 0; return 1; }
  D[l] = v; return 0;
}
/**
 * A hit on structure S (fine units: point c, radius r; metres for dir), by its type (js/damage.js), each cell's
 * damage taken off its integrity (cellHurt). The strength of a hit is struct_dmg times its damage to the
 * struct_dmg_exp (a big gun hurts more, not in proportion).
 *  - he, fire, heat's back blast: a sphere of r times struct_he_r, the damage falling off with the square of the distance:
 *    the middle blown out, cracks round it (the shock that weakens a wall).
 *  - ap, heat: a ray along the round's flight; each cell crossed takes struct_ap_k of the strength (and the cells round
 *    it, within struct_ap_hole of the round's blast radius, part of it) and spends FMARM mm of the penetration: a narrow tunnel as deep as the round's bite, then its small burst.
 *  - frag: the sphere at r, biting by FMSOFT: wood, glass and canvas go, concrete hardly marked.
 * Returns { gone, hit }: cells removed, cells touched.
 */
function structHurt(S, cx, cy, cz, r, H) {
  const F = S.F, C = S.cells, I = tune.struct_dmg * Math.pow(Math.max(1, H.dmg || 20), tune.struct_dmg_exp), dt = H.dtype || 'he';
  let gone = 0, hit = 0;
  const sphere = (px, py, pz, rad, k, soft) => {
    const R = Math.ceil(rad);
    for (let fy = Math.max(0, Math.floor(py - R)); fy <= Math.min(S.sy - 1, py + R); fy++)
      for (let fz = Math.max(0, Math.floor(pz - R)); fz <= Math.min(S.sz - 1, pz + R); fz++)
        for (let fx = Math.max(0, Math.floor(px - R)); fx <= Math.min(S.sx - 1, px + R); fx++) {
          const l = fx + S.sx * (fz + S.sz * fy), m = C[l]; if (!m) continue;
          const d = Math.hypot(fx + 0.5 - px, fy + 0.5 - py, fz + 0.5 - pz) / rad; if (d >= 1) continue;
          const f = (1 - d) * (1 - d) * (0.85 + hash2(fx * 3 + fy * 7, fz * 5 - fy, 41) * 0.3); // rough edges
          hit++; gone += cellHurt(S, l, k * f * (soft ? FMSOFT[m] : 1));
        }
  };
  if (dt === 'ap' || dt === 'heat') {
    const L = Math.hypot(H.vx || 0, H.vy || 0, H.vz || 0) || 1, ux = (H.vx || 0) / L, uy = (H.vy || 0) / L, uz = (H.vz || 0) / L;
    let pen = H.pen || 0, px = cx - ux * F * 0.5, py = cy - uy * F * 0.5, pz = cz - uz * F * 0.5, last = -1;
    for (let s = 0; s < 40 * F && pen > 0; s++) { // half a cell a step
      px += ux * 0.5; py += uy * 0.5; pz += uz * 0.5;
      const fx = Math.floor(px), fy = Math.floor(py), fz = Math.floor(pz); if (fx < 0 || fy < 0 || fz < 0 || fx >= S.sx || fy >= S.sy || fz >= S.sz) { if (s > 4) break; continue; }
      const l = fx + S.sx * (fz + S.sz * fy); if (l === last) continue; last = l;
      const m = C[l]; if (!m) continue;
      const left = Math.min(1, pen / FMARM[m]); pen -= FMARM[m];
      hit++; gone += cellHurt(S, l, I * tune.struct_ap_k * left);
      sphere(fx + 0.5, fy + 0.5, fz + 0.5, Math.max(1.5, r * tune.struct_ap_hole), I * tune.struct_ap_k * left * 0.6, false); // the hole's rim: wider for a bigger round
    }
    sphere(px, py, pz, Math.max(F * 0.6, r * tune.struct_he_r), I * (dt === 'heat' ? 0.6 : 0.3), false); // the burst where it stops
  } else if (dt === 'frag') sphere(cx, cy, cz, r, I, true);
  else if (dt === 'fire') sphere(cx, cy, cz, r, I * 0.25, false); // an incendiary bursts weakly; its fire does the rest (js/fire.js)
  else sphere(cx, cy, cz, r * tune.struct_he_r, I, false);
  return { gone, hit };
}
/**
 * A blast of radius r metres at (x, y, z) hurts every structure it reaches (structHurt, by the hit H's type; without
 * H, a falling piece's blow: carved as a sphere), drops what is left hanging and projects again. Returns the 1 m
 * cells it emptied as [x, y, z, kind, ...] (the debris thrown).
 */
function structBlast(x, y, z, r, H) {
  const out = []; if (!world.structs) return out;
  for (const S of world.structs) {
    const rr = r * (H ? Math.max(tune.struct_he_r, H.dtype === 'ap' || H.dtype === 'heat' ? 4 : 1) : 1); // a piercing round goes on into it
    if (x + rr < S.x0 || x - rr > S.x0 + S.w || z + rr < S.z0 || z - rr > S.z0 + S.d || y + rr < S.yb || y - rr > S.yb + S.hgt) continue;
    const F = S.F;
    if (H) { const o = structHurt(S, (x - S.x0) * F, (y - S.yb) * F, (z - S.z0) * F, r * F, H); if (!o.hit) continue; if (!o.gone) { world.schip.add(S.id); world.sdirty.add(S.id); continue; } } // only cracked: the statics at the next settle
    else if (!carveSphere(S, (x - S.x0) * F, (y - S.yb) * F, (z - S.z0) * F, r * F, true)) continue;
    const before = [];
    for (let cz = 0; cz < S.d; cz++) for (let cx = 0; cx < S.w; cx++) for (let cy = S.g - S.yb; cy < S.hgt; cy++) {
      const k = vi(S.x0 + cx, S.yb + cy, S.z0 + cz); if (S.own[cx + S.w * cz] && world.fmark[k] === 1) before.push(cx, cy, cz, world.vox[k]);
    }
    structCheck(S, true);
    projectStruct(S);
    for (let i = 0; i < before.length; i += 4) {
      const X = S.x0 + before[i], Y = S.yb + before[i + 1], Z = S.z0 + before[i + 2];
      if (!world.vox[vi(X, Y, Z)]) out.push(X, Y, Z, before[i + 3]);
    }
    world.sdirty.add(S.id);
  }
  return out;
}

// ---- Collapse: loose parts fall as pieces, hurt what is under them, settle as rubble -------------------------------
/**
 * Breaks a structure's loose cells (those not in seen) into connected pieces that fall (world.pieces); a crumb
 * smaller than collapse_min m3 goes as dust. Returns how many fine cells came away.
 */
function spawnPieces(S, seen) {
  const { sx, sy, sz, F } = S, C = S.cells, sxz = sx * sz, n = sx * sy * sz, q = new Int32Array(n);
  const minCells = Math.max(1, Math.round(tune.collapse_min * F * F * F)), fresh = [];
  let fell = 0;
  for (let l0 = 0; l0 < n; l0++) {
    if (!C[l0] || seen[l0]) continue;
    let qh = 0, qt = 0, x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1, y1 = -1, z1 = -1;
    q[qt++] = l0; seen[l0] = 2;
    while (qh < qt) {
      const l = q[qh++], fx = l % sx, fz = ((l / sx) | 0) % sz, fy = (l / sxz) | 0;
      if (fx < x0) x0 = fx; if (fx > x1) x1 = fx; if (fy < y0) y0 = fy; if (fy > y1) y1 = fy; if (fz < z0) z0 = fz; if (fz > z1) z1 = fz;
      if (fx > 0 && C[l - 1] && !seen[l - 1]) { seen[l - 1] = 2; q[qt++] = l - 1; }
      if (fx < sx - 1 && C[l + 1] && !seen[l + 1]) { seen[l + 1] = 2; q[qt++] = l + 1; }
      if (fz > 0 && C[l - sx] && !seen[l - sx]) { seen[l - sx] = 2; q[qt++] = l - sx; }
      if (fz < sz - 1 && C[l + sx] && !seen[l + sx]) { seen[l + sx] = 2; q[qt++] = l + sx; }
      if (fy > 0 && C[l - sxz] && !seen[l - sxz]) { seen[l - sxz] = 2; q[qt++] = l - sxz; }
      if (fy < sy - 1 && C[l + sxz] && !seen[l + sxz]) { seen[l + sxz] = 2; q[qt++] = l + sxz; }
    }
    fell += qt;
    if (qt < minCells || !world.pieces) { for (let i = 0; i < qt; i++) C[q[i]] = 0; continue; } // dust
    const P = { F, sx: x1 - x0 + 1, sy: y1 - y0 + 1, sz: z1 - z0 + 1, n: qt, x: S.x0 + x0 / F, y: S.yb + y0 / F, z: S.z0 + z0 / F,
      vy: 0, drop: 0, fallen: 0, rx: 0, rz: 0, vrx: (rng() - 0.5) * 0.5, vrz: (rng() - 0.5) * 0.5, vx: 0, vz: 0, lim: 0.35, mesh: null };
    if (S.tip) {
      const ax = Math.abs(S.tip[0]) >= Math.abs(S.tip[1]) ? 0 : 2, sg = Math.sign(S.tip[ax ? 1 : 0]) || 1, wide = ax ? P.sz : P.sx;
      if (P.sy >= wide * 0.6 && P.sy >= 2 * F) P.hinge = { ax, s: sg, a: 0, w: 0.15 }; // tall: it turns over on its foot's edge (updatePieces)
      else { const k = tune.collapse_tip; P.vx = S.tip[0] * k; P.vz = S.tip[1] * k; P.vrx = S.tip[1] * k * 0.8; P.vrz = -S.tip[0] * k * 0.8; P.lim = 1.3; } // flat: it slides and turns that way
    }
    P.yb = P.y; P.cells = new Uint8Array(P.sx * P.sy * P.sz);
    for (let i = 0; i < qt; i++) {
      const l = q[i], fx = l % sx, fz = ((l / sx) | 0) % sz, fy = (l / sxz) | 0;
      P.cells[(fx - x0) + P.sx * ((fz - z0) + P.sz * (fy - y0))] = C[l]; C[l] = 0;
    }
    fresh.push(P); world.pieces.push(P);
  }
  for (const P of fresh) pieceDrop(P); // once all of them are out: none rests on another's old place
  return fell;
}
/** How far a piece falls: the least gap, over its columns, between its lowest cell and whatever is solid below. */
function pieceDrop(P) {
  const F = P.F, st = 1 / F;
  let drop = 1e9;
  for (let pz = 0; pz < P.sz; pz++) for (let px = 0; px < P.sx; px++) {
    let low = -1;
    for (let py = 0; py < P.sy; py++) if (P.cells[px + P.sx * (pz + P.sz * py)]) { low = py; break; }
    if (low < 0) continue;
    const X = P.x + (px + 0.5) / F, Z = P.z + (pz + 0.5) / F, y = P.y + low / F;
    const d = y - supportBelow(X, y, Z, st, y - drop);
    if (d < drop) drop = d;
  }
  P.drop = drop === 1e9 ? 0 : drop;
}
/**
 * From height y down at (X, Z): the first height on y's grid of step st with something solid just under it (0 at
 * the bottom, or floor when it gets there first). Open 1 m cells are crossed a metre at a time; only a cell that
 * holds something (a structure's, or solid) is looked at finely.
 */
function supportBelow(X, y, Z, st, floor) {
  const ix = Math.floor(X), iz = Math.floor(Z); if (!inMap(ix, iz)) return 0;
  const base = VH * (ix + world.N * iz), lo = Math.max(0, floor ?? 0);
  let yy = y;
  while (yy > lo) {
    const cy = Math.floor(yy - st * 0.5); if (cy < 0) return 0;
    if (cy < VH && (world.fmark[base + cy] || world.vox[base + cy])) { if (solidF(X, yy - st * 0.5, Z)) return yy; yy -= st; continue; }
    yy -= Math.max(1, Math.ceil((yy - cy) / st - 1e-6)) * st; // an open 1 m cell: to its bottom, on the same grid
  }
  return Math.max(yy, lo);
}
/**
 * A piece going over on its edge (P.hinge: axis 0 x or 2 z, side s, angle a, turn rate w): it turns faster as it leans
 * (collapse_hinge); past most of a right angle its cells are turned a quarter (hingeSnap) and it falls the rest.
 * Returns true while it is still turning.
 */
function hingeStep(P, dt) {
  const H = P.hinge, F = P.F, h = P.sy / F;
  H.w += tune.collapse_g * tune.collapse_hinge / Math.max(1, h) * Math.sin(H.a + 0.25) * dt; H.a += H.w * dt;
  if (H.a >= Math.PI / 2 * 0.9) { hingeSnap(P); return false; }
  if (P.mesh) {
    const hx = P.sx / F / 2, hy = P.sy / F / 2, hz = P.sz / F / 2, y0 = P.y - P.fallen;
    if (H.ax === 0) { const px = H.s > 0 ? P.x + 2 * hx : P.x, rx = (P.x + hx) - px, f = -H.s * H.a, c = Math.cos(f), s = Math.sin(f); P.mesh.position.set(px + rx * c - hy * s, y0 + rx * s + hy * c, P.z + hz); P.mesh.rotation.set(0, 0, f); }
    else { const pz = H.s > 0 ? P.z + 2 * hz : P.z, rz = (P.z + hz) - pz, f = H.s * H.a, c = Math.cos(f), s = Math.sin(f); P.mesh.position.set(P.x + hx, y0 + hy * c - rz * s, pz + hy * s + rz * c); P.mesh.rotation.set(f, 0, 0); }
  }
  return true;
}
/** A piece that went over: its cells turned a quarter onto the side it fell to, lying from its old foot's edge; it falls on from there with the speed its top had. */
function hingeSnap(P) {
  const F = P.F, H = P.hinge, { sx, sy, sz } = P, C = P.cells;
  let nx = sx, ny = sy, nz = sz;
  if (H.ax === 0) { nx = sy; ny = sx; } else { nz = sy; ny = sz; }
  const N = new Uint8Array(nx * ny * nz);
  for (let py = 0; py < sy; py++) for (let pz = 0; pz < sz; pz++) for (let px = 0; px < sx; px++) {
    const m = C[px + sx * (pz + sz * py)]; if (!m) continue;
    if (H.ax === 0) N[(H.s > 0 ? py : sy - 1 - py) + nx * (pz + nz * (H.s > 0 ? sx - 1 - px : px))] = m;
    else N[px + nx * ((H.s > 0 ? py : sy - 1 - py) + nz * (H.s > 0 ? sz - 1 - pz : pz))] = m;
  }
  if (H.ax === 0) P.x = H.s > 0 ? P.x + sx / F : P.x - sy / F; else P.z = H.s > 0 ? P.z + sz / F : P.z - sy / F;
  P.y -= P.fallen; P.fallen = 0; P.sx = nx; P.sy = ny; P.sz = nz; P.cells = N;
  P.vy = H.w * sy / F * 0.5; P.vx = H.ax === 0 ? H.s * H.w * 0.5 : 0; P.vz = H.ax === 2 ? H.s * H.w * 0.5 : 0; P.hinge = null; P.rx = P.rz = 0; P.vrx = P.vrz = 0;
  if (P.mesh) { P.mesh.geometry.dispose(); if (P.mesh.parent) P.mesh.parent.remove(P.mesh); P.mesh = null; }
  pieceDrop(P);
}
/** The falling pieces: gravity (collapse_g), a slow tumble drawn on the mesh, a tall one going over on its edge (hingeStep); on the ground, landPiece. */
function updatePieces(dt) {
  const L = world.pieces; if (!L || !L.length) return;
  for (let i = L.length - 1; i >= 0; i--) {
    const P = L[i];
    if (P.hinge) {
      if (!P.mesh && typeof R3 !== 'undefined' && R3.structGroup) { structTex(); const g = structGeo(P); g.translate(-P.sx / P.F / 2, -P.sy / P.F / 2, -P.sz / P.F / 2); P.mesh = new THREE.Mesh(g, R3.structMat); P.mesh.castShadow = !CHEAP; R3.structGroup.add(P.mesh); }
      if (hingeStep(P, dt)) continue;
    }
    P.vy += tune.collapse_g * dt; P.fallen += P.vy * dt;
    if (P.fallen >= P.drop) { P.fallen = P.drop; landPiece(P); L.splice(i, 1); continue; }
    P.x += P.vx * dt; P.z += P.vz * dt;
    P.rx = Math.max(-P.lim, Math.min(P.lim, P.rx + P.vrx * dt)); P.rz = Math.max(-P.lim, Math.min(P.lim, P.rz + P.vrz * dt));
    if (!P.mesh && typeof R3 !== 'undefined' && R3.structGroup) {
      structTex();
      const g = structGeo(P), hx = P.sx / P.F / 2, hy = P.sy / P.F / 2, hz = P.sz / P.F / 2;
      g.translate(-hx, -hy, -hz);
      P.mesh = new THREE.Mesh(g, R3.structMat); P.mesh.castShadow = !CHEAP;
      R3.structGroup.add(P.mesh);
    }
    if (P.mesh) { const hx = P.sx / P.F / 2, hy = P.sy / P.F / 2, hz = P.sz / P.F / 2; P.mesh.position.set(P.x + hx, P.y - P.fallen + hy, P.z + hz); P.mesh.rotation.set(P.rx, 0, P.rz); }
  }
}
on('playStep', dt => updatePieces(dt));
/**
 * A landed piece breaks into blocks (iteration 54): a grid of collapse_chunk metres at 7 m/s, finer the harder it
 * struck (by the square root of the speed), coarser for wood and metal that bend; the cells along the cracks between blocks break off (collapse_frac)
 * and blocks too small to stand go too: those come back as rubble (the heap). The blocks, lowest first, each lands as a
 * rigid whole on whatever is under it (a block lands on the one before), a little apart the harder it struck, and is
 * written as cells of its own material into the structures that hold those columns: a slab of wall, a length of beam,
 * new cover that can be shot again. Returns the rubble cells (in P's frame).
 */
function landBlocks(P, yb, v) {
  const F = P.F, { sx, sy, sz } = P, C = P.cells, n = sx * sy * sz, rub = new Uint8Array(n);
  let bend = 0, tot = 0; for (let l = 0; l < n; l += 7) if (C[l]) { tot++; if (FMBEND.has(C[l])) bend++; }
  const s = Math.max(0.5, Math.min(4, tune.collapse_chunk * Math.sqrt(7 / Math.max(2, v)) * (tot && bend / tot > 0.5 ? 2 : 1))), cs = Math.max(1, Math.round(s * F));
  const ox = Math.floor(rng() * cs), oy = Math.floor(rng() * cs), oz = Math.floor(rng() * cs), key = (px, py, pz) => Math.floor((px + ox) / cs) + 1000 * (Math.floor((py + oy) / cs) + 1000 * Math.floor((pz + oz) / cs));
  const groups = new Map();
  for (let py = 0; py < sy; py++) for (let pz = 0; pz < sz; pz++) for (let px = 0; px < sx; px++) {
    const l = px + sx * (pz + sz * py), m = C[l]; if (!m) continue;
    const k = key(px, py, pz);
    let crack = false; // on a crack between blocks: a neighbour in another block
    if (px + 1 < sx && C[l + 1] && key(px + 1, py, pz) !== k || pz + 1 < sz && C[l + sx] && key(px, py, pz + 1) !== k || py + 1 < sy && C[l + sx * sz] && key(px, py + 1, pz) !== k) crack = true;
    if (crack && rng() < tune.collapse_frac) { rub[l] = rubbleOf(m); continue; }
    let g = groups.get(k); if (!g) { g = []; groups.set(k, g); } g.push(l);
  }
  const minCells = Math.max(2, Math.round(tune.collapse_block * F * F * F)), blocks = [];
  for (const g of groups.values()) { if (g.length < minCells) { for (const l of g) rub[l] = rubbleOf(C[l]); continue; } blocks.push(g); }
  blocks.sort((a, b) => Math.floor(a[0] / (sx * sz)) - Math.floor(b[0] / (sx * sz))); // lowest first: the upper ones land on them
  const cx = P.x + sx / F / 2, cz = P.z + sz / F / 2, spread = Math.min(1.5, v / 10) * tune.collapse_spread, touched = new Set(), st = 1 / F;
  for (const g of blocks.slice(0, 48)) {
    let bx = 0, bz = 0; for (const l of g) { bx += l % sx; bz += ((l / sx) | 0) % sz; } bx = P.x + (bx / g.length + 0.5) / F; bz = P.z + (bz / g.length + 0.5) / F;
    const dl = Math.hypot(bx - cx, bz - cz) || 1, dx = (bx - cx) / dl * spread * (0.5 + rng()) + (P.vx || 0) * 0.15, dz = (bz - cz) / dl * spread * (0.5 + rng()) + (P.vz || 0) * 0.15;
    let drop = 1e9; // a rigid block: the least gap under its columns
    const low = new Map();
    for (const l of g) { const px = l % sx, pz = ((l / sx) | 0) % sz, py = (l / (sx * sz)) | 0, c = px + sx * pz; if (!low.has(c) || py < low.get(c)) low.set(c, py); }
    for (const [c, py] of low) { const X = P.x + (c % sx + 0.5) / F + dx, Z = P.z + (((c / sx) | 0) + 0.5) / F + dz, y = yb + py / F; if (!inMap(Math.floor(X), Math.floor(Z))) continue; drop = Math.min(drop, y - supportBelow(X, y, Z, st, y - 30)); }
    if (drop === 1e9) continue; drop = Math.max(0, drop);
    const here = new Set();
    for (const l of g) {
      const px = l % sx, pz = ((l / sx) | 0) % sz, py = (l / (sx * sz)) | 0, X = P.x + (px + 0.5) / F + dx, Y = yb + (py + 0.5) / F - drop, Z = P.z + (pz + 0.5) / F + dz;
      const T = rubbleStructAt(X, Z); if (!T) { rub[l] = rubbleOf(C[l]); continue; }
      const fx = Math.floor((X - T.x0) * F), fy = Math.floor((Y - T.yb) * F), fz = Math.floor((Z - T.z0) * F);
      if (fy < 0 || fy >= T.sy || sget(T, fx, fy, fz)) { rub[l] = rubbleOf(C[l]); continue; } // a place already taken: that bit is crushed
      sset(T, fx, fy, fz, C[l]); here.add(T);
    }
    for (const T of here) { projectStruct(T); touched.add(T); } // the next block lands on this one
  }
  for (const g of blocks.slice(48)) for (const l of g) rub[l] = rubbleOf(C[l]);
  for (const T of touched) { world.sdirty.add(T.id); if (!T.rubble) world.schip.add(T.id); }
  world.blocks = (world.blocks || 0) + Math.min(48, blocks.length);
  return rub;
}
/** Materials that bend rather than shatter: they land in bigger blocks. */
const FMBEND = new Set([FM.WOOD, FM.METAL, FM.RUST, FM.BEAM, FM.STRIPE, FM.RAID, FM.TYRE]);
/** The rubble kind a falling piece's material breaks into. */
function rubbleOf(m) { return m === FM.BRICK || m === FM.RUBB || m === FM.TILE ? FM.RUBB : m === FM.WOOD || m === FM.BEAM ? FM.BEAM : m === FM.METAL || m === FM.RUST || m === FM.STRIPE || m === FM.RAID || m === FM.JUNK ? FM.RUST : m === FM.ADOBE || m === FM.HAY || m === FM.BAG ? m : FM.RUBC; } // metal comes down as scrap
/**
 * The structure holding column (x, z); a free column gets a new one, a 4 x 4 m tile of the free columns round it
 * from the lowest natural ground there, 12 m tall (rubble, ported 1 m things, sandbags laid in play).
 */
function rubbleStructAt(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), N = world.N; if (!inMap(ix, iz)) return null;
  const o = world.sown[ix + N * iz]; if (o) return world.structs[o - 1];
  const tx = Math.floor(ix / 4) * 4, tz = Math.floor(iz / 4) * 4;
  let g = VH; for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) if (inMap(tx + a, tz + b) && !world.sown[tx + a + N * (tz + b)]) g = Math.min(g, groundOf(tx + a, tz + b));
  const T = newStruct(tx, tz, 4, 4, g, Math.min(12, VH - g), 0); T.rubble = true;
  return world.sown[ix + N * iz] === T.id + 1 ? T : null;
}
/**
 * A piece hits the ground: whoever stands under it is hurt (collapse_dmg a m3, up to collapse_cap m3, by the speed
 * it fell; vehicles collapse_veh, on the roof armour), then it breaks into a heap of rubble no steeper than a cell a
 * cell, written into the structures that hold those columns: new obstacles and cover.
 */
function landPiece(P) {
  const F = P.F, vol = P.n / (F * F * F), yb = P.y - P.drop, top = yb + P.sy / F, x0 = P.x, z0 = P.z, x1 = P.x + P.sx / F, z1 = P.z + P.sz / F;
  if (P.mesh) { P.mesh.geometry.dispose(); if (P.mesh.parent) P.mesh.parent.remove(P.mesh); P.mesh = null; }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // who is under it
  const k = Math.min(1.5, Math.max(0.4, P.vy / 7));
  if (state.ents) for (const e of state.ents) {
    if (!e.alive || e.inside) continue;
    const r = e.veh ? e.rad * 0.7 : 0.3;
    if (e.x + r < x0 || e.x - r > x1 || e.z + r < z0 || e.z - r > z1) continue;
    if (e.y + (e.veh ? 2.4 : 1.8) < yb - 0.3 || e.y > P.y + P.sy / F) continue;
    let a = tune.collapse_dmg * Math.min(vol, tune.collapse_cap) * k;
    if (e.veh) a *= HEAVY.has(e.kind) ? tune.collapse_heavy : tune.collapse_veh; // soft targets suffer, tanks shrug it off
    dmgTo(e, a, 'collapse', null, { x: e.x, z: e.z, top: true });
    if (e.alive && !e.veh) e.supT = state.t + tune.suppress_time;
    world.crushed = (world.crushed || 0) + 1;
  }
  // a structure it lands on takes the blow: a crater by its volume and speed (collapse_impact), then its statics
  if (tune.collapse_impact > 0) for (const [px, pz] of [[cx, cz], [x0 + 0.3, z0 + 0.3], [x1 - 0.3, z0 + 0.3], [x0 + 0.3, z1 - 0.3], [x1 - 0.3, z1 - 0.3]]) {
    if (structSolidAt(px, yb - 0.15, pz) !== 1) continue;
    const r = Math.min(2.5, tune.collapse_impact * Math.cbrt(vol) * k);
    if (r > 0.2) { structBlast(px, yb - 0.15, pz, r); world.impacts = (world.impacts || 0) + 1; }
    break;
  }
  // the blocks: it breaks along a grid as fine as it struck hard, the blocks lie where they land (landBlocks); what breaks off is the heap
  const rub = landBlocks(P, yb, Math.hypot(P.vy, P.vx || 0, P.vz || 0));
  // the heap: each column of the rubble slumps outward until no column stands more than a cell over its neighbour
  let nr = 0; for (let l = 0; l < rub.length; l++) if (rub[l]) nr++;
  const R = Math.min(4 * F, Math.max(1, Math.round(F * 0.5 + 0.7 * nr / (P.sx * P.sz)))), W = P.sx + 2 * R, D = P.sz + 2 * R, h = new Int16Array(W * D), mats = []; // more rubble spreads wider
  for (let pz = 0; pz < P.sz; pz++) for (let px = 0; px < P.sx; px++) for (let py = 0; py < P.sy; py++) {
    const m = rub[px + P.sx * (pz + P.sz * py)]; if (!m) continue;
    h[px + R + W * (pz + R)]++; if (mats.length < 64) mats.push(rubbleOf(m));
  }
  const ns = Math.floor(rng() * 9999);
  const lim = new Uint8Array(W * D); for (let c = 0; c < W * D; c++) lim[c] = 1 + (hash2(c % W, (c / W) | 0, ns) < 0.3 ? 1 : 0); // rough slopes: some columns hold a cell more
  for (let pass = 0, moved = 1; pass < 2 * R + 8 && moved; pass++) {
    moved = 0;
    for (let c = 0; c < W * D; c++) {
      const hc = h[c]; if (hc <= lim[c]) continue;
      const cxi = c % W, czi = (c / W) | 0;
      for (let s = 0; s < 4; s++) {
        const nx = cxi + (s === 0 ? 1 : s === 1 ? -1 : 0), nz = czi + (s === 2 ? 1 : s === 3 ? -1 : 0); if (nx < 0 || nz < 0 || nx >= W || nz >= D) continue;
        const nc = nx + W * nz; if (h[c] - h[nc] > lim[c]) { const mv = (h[c] - h[nc]) >> 1; h[c] -= mv; h[nc] += mv; moved = 1; }
      }
    }
  }
  for (let c = 0; c < W * D; c++) if (h[c] > 1) h[c] += Math.round((hash2(c, 7, ns) - 0.5) * 3); // a lumpy top
  const touched = new Set(), st = 1 / F;
  for (let czi = 0; czi < D; czi++) for (let cxi = 0; cxi < W; cxi++) {
    const hh = h[cxi + W * czi]; if (!hh) continue;
    const X = P.x + (cxi - R + 0.5) / F, Z = P.z + (czi - R + 0.5) / F;
    if (!inMap(Math.floor(X), Math.floor(Z)) || solidF(X, top - st * 0.5, Z)) continue; // a wall stands there: that share is lost
    const y = supportBelow(X, top, Z, st);
    const T = rubbleStructAt(X, Z); if (!T) continue;
    const fx = Math.floor((X - T.x0) * F), fz = Math.floor((Z - T.z0) * F), fy0 = Math.round((y - T.yb) * F);
    for (let j = 0; j < hh; j++) if (!sget(T, fx, fy0 + j, fz)) sset(T, fx, fy0 + j, fz, mats.length ? mats[Math.floor(rng() * mats.length)] : FM.RUBC);
    touched.add(T);
  }
  for (const T of touched) { projectStruct(T); world.sdirty.add(T.id); if (!T.rubble) world.schip.add(T.id); } // a heap on a slab weighs on it (the statics at the next settle)
  // dust, a thud, a few chips
  if (state.fx) for (let i = 0; i < Math.min(6, 1 + vol * 2); i++) state.fx.push({ kind: 'smoke', x: cx + (rng() - 0.5) * (x1 - x0), y: yb + 0.3, z: cz + (rng() - 0.5) * (z1 - z0), t: -i * 0.05, life: 1.4 + rng(), s: 0.5 + Math.min(2, vol) * 0.5, rise: 1.2, col: 0x9a8e80 });
  if (vol > 0.4 && typeof sfx === 'function') sfx('boomS', cx, cz);
  if (vol > 1 && state.tank) cam.shake = Math.max(cam.shake, tune.shake * 0.4 * Math.max(0, 1 - Math.hypot(cx - state.tank.x, cz - state.tank.z) / 40));
}

// ---- Rounds: the fine surface along a line, chips ----------------------------------------------------------------
/**
 * The first fine cell of any structure on the segment a-b (skip: a building whose own walls do not count, the
 * shooter's garrison): {x, y, z (a point inside the struck cell), t (0..1 along the segment), S, m} or null.
 */
function structRay(ax, ay, az, bx, by, bz, skip) {
  if (!world.structs || !world.structs.length) return null;
  const d = [bx - ax, by - ay, bz - az], a = [ax, ay, az];
  let best = null;
  for (const S of world.structs) {
    if (skip && S.bld === skip) continue;
    const lo = [S.x0, S.yb, S.z0], hi = [S.x0 + S.w, S.yb + S.hgt, S.z0 + S.d];
    let t0 = 0, t1 = best ? best.t : 1, ok = true;
    for (let k = 0; k < 3 && ok; k++) {
      if (Math.abs(d[k]) < 1e-9) { if (a[k] < lo[k] || a[k] > hi[k]) ok = false; continue; }
      let ta = (lo[k] - a[k]) / d[k], tb = (hi[k] - a[k]) / d[k]; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) ok = false;
    }
    if (!ok) continue;
    const F = S.F, n = Math.ceil(Math.hypot(d[0], d[1], d[2]) * (t1 - t0) * F * 2) + 1;
    for (let i = 0; i <= n; i++) {
      const t = t0 + (t1 - t0) * i / n, x = ax + d[0] * t, y = ay + d[1] * t, z = az + d[2] * t;
      const m = sget(S, Math.floor((x - S.x0) * F), Math.floor((y - S.yb) * F), Math.floor((z - S.z0) * F));
      if (m) { best = { x, y, z, t, S, m }; break; }
    }
  }
  return best;
}
/**
 * A round strikes a structure: the fine cells within struct_chip metres take struct_bullet times their softness (FMSOFT)
 * off their integrity (cellHurt); The fine cells
 * within struct_chip metres of the point chip off (heavy rounds: 1.8 times as far, 2.5 times as likely); dust puffs.
 * The 1 m projection and the mesh follow at the next settle (struct_settle).
 */
function structChip(h, heavy) {
  const S = h.S, F = S.F;
  if (state.fx) state.fx.push({ kind: 'smoke', x: h.x, y: h.y, z: h.z, t: 0, life: 0.5, s: heavy ? 0.45 : 0.28, rise: 0.4, col: FMCOL[h.m] });
  const r = tune.struct_chip * (heavy ? 1.8 : 1) * F, cx = (h.x - S.x0) * F, cy = (h.y - S.yb) * F, cz = (h.z - S.z0) * F, R = Math.ceil(r) + 1;
  const amt = tune.struct_bullet * (heavy ? 3 : 1); // each round bites by how soft the cell is (FMSOFT): wood splinters, concrete hardly marks
  let n = 0, any = 0;
  for (let fy = Math.floor(cy) - R; fy <= cy + R; fy++) for (let fz = Math.floor(cz) - R; fz <= cz + R; fz++) for (let fx = Math.floor(cx) - R; fx <= cx + R; fx++) {
    const m = sget(S, fx, fy, fz); if (!m) continue;
    const inCell = fx === Math.floor(cx) && fy === Math.floor(cy) && fz === Math.floor(cz);
    if (!inCell && (fx + 0.5 - cx) ** 2 + (fy + 0.5 - cy) ** 2 + (fz + 0.5 - cz) ** 2 > r * r) continue;
    any++; n += cellHurt(S, fx + S.sx * (fz + S.sz * fy), amt * FMSOFT[m] * (inCell ? 1 : 0.5));
  }
  if (any) { world.schip.add(S.id); world.sdirty.add(S.id); }
  if (n) {
    world.schip.add(S.id);
    if (state.debris && rng() < 0.6) state.debris.push({ x: h.x, y: h.y, z: h.z, vx: (rng() - 0.5) * 3, vy: 1.5 + rng() * 2.5, vz: (rng() - 0.5) * 3, rx: rng() * 3, ry: rng() * 3, vr: (rng() - 0.5) * 12, life: tune.debris_life * 0.5, s: 0.1 + rng() * 0.1, t: FMV[h.m], rest: false }); // a chip, not a block
  }
  return n;
}
/**
 * A round from a toward b: where it ends, {x, y, z, hit}: the first structure cell it strikes (chipped) or b.
 * ext metres past b count too (a miss flies on into the wall behind); skip: the shooter's own building.
 */
function structShot(ax, ay, az, bx, by, bz, heavy, ext, skip) {
  let ex = bx, ey = by, ez = bz;
  if (ext) { const L = Math.hypot(bx - ax, by - ay, bz - az) || 1, k = 1 + ext / L; ex = ax + (bx - ax) * k; ey = ay + (by - ay) * k; ez = az + (bz - az) * k; }
  const h = structRay(ax, ay, az, ex, ey, ez, skip);
  if (!h) return { x: bx, y: by, z: bz, hit: false };
  structChip(h, heavy);
  return { x: h.x, y: h.y, z: h.z, hit: true };
}
/** Every struct_settle seconds the chipped structures drop what no longer stands and project again (cover, paths, garrisons). */
function structSettle(dt) {
  if (!world.schip || !world.schip.size) return;
  world.settleT -= dt; if (world.settleT > 0) return;
  world.settleT = tune.struct_settle;
  const ids = [...world.schip]; world.schip.clear(); // (a collapse still going on puts itself back for the next settle)
  for (const id of ids) { const S = world.structs[id]; if (!S) continue; structCheck(S, true); projectStruct(S); world.sdirty.add(id); }
}
on('playStep', dt => structSettle(dt));
/** The first fine cell on the ray from o along d (t in d's units) between t0 and t1, or -1: rayVoxel's look inside a structure's 1 m cell. */
function structRayT(ox, oy, oz, dx, dy, dz, t0, t1) {
  const L = Math.hypot(dx, dy, dz) || 1, st = 0.1 / L;
  for (let t = t0 + st * 0.5; t < t1; t += st) if (structSolidAt(ox + dx * t, oy + dy * t, oz + dz * t) === 1) return t;
  return -1;
}

// ---- Generation: ruined houses and blocks of flats ------------------------------------------------------------
/**
 * A building on the fine grid (houses, barns, churches, blocks of flats), footprint w x d metres from (x0, z0),
 * ground floor at g. o:
 *  - shape: 'rect', 'L' (the back corner left out), 'U' (a notch in the back), 'court' (a courtyard in the middle);
 *    the front, where the door is, always runs full. Small footprints stay rectangles.
 *  - system: 'masonry' (load-bearing walls half a metre thick, a slab half a metre thick over each storey) or
 *    'frame' (concrete pillars a metre square every 4 m, thin slabs, infill walls with ribbon windows; with shop a
 *    ground floor open between its pillars, with balcony balconies on the front).
 *  - roof: 'flat' (a low parapet with gaps), 'gable' (two slopes, the ridge along the long side, the gable walls
 *    built up under it) or 'shed' (one slope, high at the back); pitched roofs only on rectangles, built in steps
 *    two cells thick so each rests on the one below it down to the eaves (staticsFail); roofT their material.
 *  - wall, corner (1 m kinds), floors, face (the door's side), doorW, doorH (metres), win (false: no windows),
 *    chimney, hall (no slabs but the top one: a warehouse, a hangar, its windows high up), skeleton (a frame
 *    with most of its infill walls gone above the ground floor), ruin (0..1, else
 *    struct_ruin x 0.6..1.4).
 * Then ruined (ruinHouse) and what cannot stand goes at structSync (the statics). Registered as a building soldiers
 * can enter, its slots inside the footprint.
 */
function structHouse(x0, z0, w, d, g, o) {
  const fl = o.floors || 1, F = structRes(), M = 1, below = 1, SH = 3 * F, frame = o.system === 'frame';
  const T = Math.max(1, F >> 1), SL = frame ? 1 : Math.max(1, F >> 1), PR = Math.max(1, F >> 1);
  const wallM = fmOf(o.wall, FM.PLAST), cornM = fmOf(o.corner, wallM), roofM = fmOf(o.roofT, FM.TILE);
  // the door side and the footprint, in the door's frame: u along the front, v back from it
  const f = o.face || [0, 1];
  const side = Math.abs(f[0]) > Math.abs(f[1]) ? (f[0] > 0 ? 'e' : 'w') : (f[1] > 0 ? 's' : 'n');
  const U = side === 'n' || side === 's' ? w : d, VD = side === 'n' || side === 's' ? d : w;
  const uv = (mx, mz) => side === 's' ? [mx, d - 1 - mz] : side === 'n' ? [mx, mz] : side === 'e' ? [mz, w - 1 - mx] : [mz, mx];
  let shape = o.shape || 'rect';
  if (shape === 'court' && (U < 10 || VD < 10)) shape = U >= 7 && VD >= 7 ? 'L' : 'rect';
  if ((shape === 'L' || shape === 'U') && (U < 7 || VD < 7)) shape = 'rect';
  const fp = new Uint8Array(w * d);
  for (let mz = 0; mz < d; mz++) for (let mx = 0; mx < w; mx++) {
    const [u, v] = uv(mx, mz); let inn = true;
    if (shape === 'L') inn = !(u >= Math.ceil(U * 0.5) && v >= Math.ceil(VD * 0.5));
    else if (shape === 'U') { const a = Math.floor(U / 3); inn = !(u >= a && u < U - a && v >= Math.ceil(VD * 0.45)); }
    else if (shape === 'court') inn = !(u >= 3 && u < U - 3 && v >= 3 && v < VD - 3);
    fp[mx + w * mz] = inn ? 1 : 0;
  }
  const IN = (mx, mz) => mx >= 0 && mz >= 0 && mx < w && mz < d && fp[mx + w * mz] === 1;
  const roof = shape === 'rect' && (o.roof === 'gable' || o.roof === 'shed') ? o.roof : 'flat';
  // the roof's height over the top slab, a fine column at a time (fine cells): ridge along the long side
  const W = w * F, D = d * F, alongX = w >= d, run = alongX ? D : W, slope = roof === 'shed' ? 0.4 : 0.6;
  const backHigh = roof === 'shed' ? (alongX ? (side === 'n' ? 1 : 0) : (side === 'w' ? 1 : 0)) : 0;
  const RH = (fx, fz) => {
    if (roof === 'flat') return 0;
    const r = alongX ? fz : fx;
    if (roof === 'gable') return Math.floor(Math.min(r + 0.5, run - r - 0.5) * slope);
    return Math.floor((backHigh ? run - r - 0.5 : r + 0.5) * slope);
  };
  let maxRH = 0; for (let r = 0; r < run; r++) maxRH = Math.max(maxRH, RH(alongX ? 0 : r, alongX ? r : 0));
  const chim = o.chimney && roof !== 'flat', roofTopM = Math.ceil((maxRH + 2) / F) + (chim ? 1 : 0) + 1;
  const S = newStruct(x0 - M, z0 - M, w + 2 * M, d + 2 * M, g, fl * 3 + roofTopM, below);
  const gy = below * F, fx0 = M * F, fz0 = M * F, base = gy + fl * SH; // base: the layer over the top slab
  // the door: the middle of the front
  const dX = side === 'w' ? 0 : side === 'e' ? w - 1 : Math.floor(w / 2), dZ = side === 'n' ? 0 : side === 's' ? d - 1 : Math.floor(d / 2);
  const dw = o.doorW || 1, doorH = Math.round((o.doorH || 2.25) * F), sill = F, winH = Math.round((frame ? 1.5 : 1.25) * F);
  const bay = 4, pillarAt = (mx, mz) => frame && (mx % bay === 0 || mx === w - 1) && (mz % bay === 0 || mz === d - 1);
  for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) if (IN((fx / F) | 0, (fz / F) | 0)) for (let fy = 0; fy < gy; fy++) sset(S, fx0 + fx, fy, fz0 + fz, FM.CONC); // the foundation
  for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) {
    const mx = (fx / F) | 0, mz = (fz / F) | 0; if (!IN(mx, mz)) continue;
    const ix = fx % F, iz = fz % F;
    const xm = ix < T && !IN(mx - 1, mz), xp = ix >= F - T && !IN(mx + 1, mz), zm = iz < T && !IN(mx, mz - 1), zp = iz >= F - T && !IN(mx, mz + 1);
    const ic = (ax, az) => IN(mx + ax, mz) && IN(mx, mz + az) && !IN(mx + ax, mz + az); // an inner corner: both sides in, the diagonal out
    const inner = (ix < T && iz < T && ic(-1, -1)) || (ix >= F - T && iz < T && ic(1, -1)) || (ix < T && iz >= F - T && ic(-1, 1)) || (ix >= F - T && iz >= F - T && ic(1, 1));
    const wall = xm || xp || zm || zp || inner, wx = xm || xp, wz = zm || zp;
    const corner = ((!IN(mx - 1, mz) || !IN(mx + 1, mz)) && (!IN(mx, mz - 1) || !IN(mx, mz + 1))) || ic(-1, -1) || ic(1, -1) || ic(-1, 1) || ic(1, 1);
    const front = (side === 'n' && zm && mz === 0) || (side === 's' && zp && mz === d - 1) || (side === 'w' && xm && mx === 0) || (side === 'e' && xp && mx === w - 1);
    const along = wz ? mx : mz, dAt = wz ? dX : dZ, pil = pillarAt(mx, mz) && ix >= F / 2 - 2 && ix < F / 2 + 2 && iz >= F / 2 - 2 && iz < F / 2 + 2;
    const pilWall = pillarAt(mx, mz) && wall; // a pillar's metre of wall stays whole
    const rh = RH(fx, fz);
    for (let ly = 0; ly < fl * SH + PR + rh + 2; ly++) {
      const st = Math.floor(ly / SH), sy = ly % SH, slab = st < fl && sy >= SH - SL && !(o.hall && st < fl - 1); // a hall: one room up to the top slab
      let m = 0;
      if (ly < fl * SH) {
        if (pil) m = FM.CONC;
        else if (slab) m = wall && !frame ? (fl > 1 ? FM.CONC : corner ? cornM : wallM) : FM.CONC;
        else if (wall) {
          m = corner || pilWall ? (frame ? FM.CONC : cornM) : wallM;
          if (!corner && !pilWall) {
            const onDoor = front && st === 0 && Math.abs(along - dAt) < dw && sy < doorH;
            const shopOpen = frame && o.shop && front && st === 0 && sy < doorH;
            const winOK = o.win !== false && sy >= sill && sy < sill + winH && (!o.hall || st === fl - 1) && (frame ? true : along % 2 === 1 && (wz ? ix : iz) < F - 1);
            if (onDoor || shopOpen || winOK) m = 0;
            if (o.skeleton && st >= 1 && hash2(mx * 7 + st * 3, mz * 13 + st, 77) < 0.75) m = 0; // a skeleton: most infill gone, the frame left
            if (frame && sy === SH - SL - 1) m = 0; // an infill wall stops short of the slab over it: each floor's walls weigh on their own slab, carried to the pillars, never on the walls below
          }
        }
      } else if (roof === 'flat') {
        if (ly < fl * SH + PR && wall && along % 5 !== 2) m = corner ? cornM : wallM; // the parapet, with gaps
      } else {
        const ry = ly - fl * SH; // the pitched roof: two cells thick over the eaves, the gable walls up under it
        if (ry === rh || ry === rh + 1) m = roofM;
        else if (ry < rh && wall && (alongX ? wx : wz)) m = wallM;
      }
      if (m) sset(S, fx0 + fx, gy + ly, fz0 + fz, m);
    }
  }
  // balconies on the front of a frame building's upper storeys: a slab a metre out, every other pair of metres, a railing
  if (frame && o.balcony) for (let st = 1; st < fl; st++) for (let u = 1; u < U - 1; u++) {
    if (Math.floor(u / 2) % 2 === 0) continue;
    const mx = side === 'n' || side === 's' ? u : side === 'w' ? -1 : w, mz = side === 'e' || side === 'w' ? u : side === 'n' ? -1 : d;
    for (let iz = 0; iz < F; iz++) for (let ix = 0; ix < F; ix++) {
      const fx = fx0 + mx * F + ix, fz = fz0 + mz * F + iz, ly0 = gy + st * SH - SL;
      for (let k = 0; k < SL; k++) sset(S, fx, ly0 + k, fz, FM.CONC);
      const edge = (side === 'n' && iz === 0) || (side === 's' && iz === F - 1) || (side === 'w' && ix === 0) || (side === 'e' && ix === F - 1);
      if (edge) for (let k = 0; k < F; k++) sset(S, fx, ly0 + SL + k, fz, FM.METAL);
    }
  }
  // a chimney through a pitched roof
  if (chim) {
    const cmx = Math.min(w - 2, 1), cmz = Math.min(d - 2, 1);
    for (let iz = 0; iz < F; iz++) for (let ix = 0; ix < F; ix++) for (let ly = base; ly < base + maxRH + 2 + F; ly++) sset(S, fx0 + cmx * F + ix, ly, fz0 + cmz * F + iz, FM.BRICK);
  }
  // the doorstep outside kept clear of 1 m stuff
  const ox = x0 + dX + (side === 'w' ? -1 : side === 'e' ? 1 : 0), oz = z0 + dZ + (side === 'n' ? -1 : side === 's' ? 1 : 0);
  if (inMap(ox, oz)) for (let y = g; y < g + 3; y++) if (!GROUNDV.has(getV(ox, y, oz))) world.vox[vi(ox, y, oz)] = 0;
  ruinHouse(S, { w, d, fl, g, M, wallM, dX, dZ, ox, oz, SL, top: base + maxRH + 2, ruin: o.ruin ?? tune.struct_ruin * (0.6 + rng() * 0.8) });
  projectStruct(S);
  const b = registerBuilding(x0, z0, w, d, g, fl * 3, dX, dZ);
  if (b && shape !== 'rect') { b.slots = b.slots.filter(p => IN(Math.floor(p.x) - x0, Math.floor(p.z) - z0)); b.cap = Math.min(tune.garrison_cap, b.slots.length); }
  S.bld = b; S.shape = shape; S.system = frame ? 'frame' : 'masonry'; world.sdirty.add(S.id);
  return b;
}
/** Ruins a fresh house: dmg 0 leaves it whole, 1 leaves little more than the ground floor's stumps. */
function ruinHouse(S, H) {
  const { F } = S, { w, d, fl, M } = H, dmg = Math.max(0, Math.min(1, H.ruin)), ns = Math.floor(rng() * 99999);
  const SH = 3 * F, gy = (S.g - S.yb) * F, fx0 = M * F, fz0 = M * F, W = w * F, D = d * F, top = H.top || gy + fl * SH + Math.max(1, F >> 1), SL = H.SL || Math.max(1, F >> 1);
  const holes = [];
  // broken wall tops: each wall column loses up to a storey and a half, more where the noise says
  for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) {
    const along = (fx + fz) / F, cut = Math.floor(dmg * SH * 1.6 * smooth(0.3, 0.75, vnoise(along / 2.2, 0.5, ns)) + dmg * SH * 0.4 * vnoise(along * 1.7, 2.5, ns + 3));
    for (let fy = top - cut; fy < top; fy++) sset(S, fx0 + fx, fy, fz0 + fz, 0);
  }
  // holes in the slabs, larger in the upper storeys
  for (let st = 0; st < fl; st++) {
    const lim = dmg * (0.35 + 0.45 * (st + 1) / fl);
    for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) if (fbm(fx / (2.5 * F), fz / (2.5 * F), ns + 7 + st * 13, 2) < lim) for (let k = 1; k <= SL; k++) sset(S, fx0 + fx, gy + (st + 1) * SH - k, fz0 + fz, 0);
  }
  // shell holes through the walls
  const nh = Math.round(dmg * (2 + fl) + rng() * 1.5 * Math.min(1, dmg * 3));
  for (let k = 0; k < nh; k++) {
    const sd = Math.floor(rng() * 4), t = 0.15 + rng() * 0.7, hy = gy + F * 1.2 + rng() * (fl * SH - F * 1.5), r = F * (0.6 + rng() * 1.1 * (0.5 + dmg));
    const hx = sd < 2 ? fx0 + t * W : sd === 2 ? fx0 : fx0 + W - 1, hz = sd < 2 ? (sd === 0 ? fz0 : fz0 + D - 1) : fz0 + t * D;
    carveSphere(S, hx, hy, hz, r, true); holes.push([hx, hz, r, sd]);
  }
  // a fallen corner
  if (rng() < dmg * 1.1) {
    const cx = rng() < 0.5 ? fx0 : fx0 + W - 1, cz = rng() < 0.5 ? fz0 : fz0 + D - 1, r = F * (1.8 + rng() * 1.6) * (0.6 + dmg * 0.6);
    carveSphere(S, cx, top - rng() * SH, cz, r, true); holes.push([cx, cz, r * 1.2, cx === fx0 ? 2 : 3]);
  }
  dropLoose(S);
  // the rubble: a heap under each hole, outside the walls and along them, never in the rooms, the door or its step
  const rub = H.wallM === FM.BRICK ? FM.RUBB : FM.RUBC, kx = H.dX + M, kz = H.dZ + M;
  for (const [hx, hz, r, sd] of holes) {
    const out = F * 0.6, cx = hx + (sd === 2 ? -out : sd === 3 ? out : 0), cz = hz + (sd === 0 ? -out : sd === 1 ? out : 0);
    const R = r * 1.1 + F * 0.6, Hh = Math.min(F * 1.4, r * 0.55 + F * 0.3) * (0.5 + tune.struct_rubble * 0.5);
    for (let fz = Math.floor(cz - R); fz <= cz + R; fz++) for (let fx = Math.floor(cx - R); fx <= cx + R; fx++) {
      if (fx < 0 || fz < 0 || fx >= S.sx || fz >= S.sz) continue;
      const mx = Math.floor(fx / F), mz = Math.floor(fz / F);
      if (mx > M && mz > M && mx < M + w - 1 && mz < M + d - 1) continue; // the rooms stay clear (map rule M10)
      if ((mx === kx && mz === kz) || (S.x0 + mx === H.ox && S.z0 + mz === H.oz)) continue; // the door and its step
      const dd = Math.hypot(fx + 0.5 - cx, fz + 0.5 - cz) / R; if (dd >= 1) continue;
      const hh = Math.round(Hh * (1 - dd * dd) * (0.7 + 0.6 * hash2(fx, fz, ns + 9))); if (hh <= 0) continue;
      const X = S.x0 + mx, Z = S.z0 + mz, base = Math.max(0, (groundOf(X, Z) - S.yb) * F);
      for (let fy = base; fy < base + hh; fy++) if (!sget(S, fx, fy, fz)) sset(S, fx, fy, fz, hash2(fx * 3, fz + fy * 5, ns) < 0.08 ? FM.BEAM : hash2(fx, fy * 7 + fz, ns + 1) < 0.25 ? H.wallM : rub);
    }
  }
}

// ---- Everything else built: objects on the fine grid, and the 1 m things ported to it -----------------------------
/** Writes fine material m at world point (x, y, z) into the structure holding that column (inside its box). Returns it, or null. */
function fput(x, y, z, m) {
  const ix = Math.floor(x), iz = Math.floor(z); if (!inMap(ix, iz)) return null;
  const o = world.sown[ix + world.N * iz]; if (!o) return null;
  const S = world.structs[o - 1], F = S.F;
  sset(S, Math.floor((x - S.x0) * F + 1e-6), Math.floor((y - S.yb) * F + 1e-6), Math.floor((z - S.z0) * F + 1e-6), m);
  return S;
}
// ---- The kit: one object, one structure, built straight on the fine grid ------------------------------------
/** A structure for one built object, w x d columns from (x0, z0), from height g (its lowest cell), h metres tall. */
function objStruct(x0, z0, w, d, g, h) { const S = newStruct(x0, z0, w, d, g, Math.max(1, Math.min(VH - g, h)), 0); S.obj = true; return S; }
/** Fills the box between world points a and b (metres) with material m: the fine cells whose centres fall inside. */
function fbox(S, ax, ay, az, bx, by, bz, m) {
  const F = S.F, r = v => Math.round(v * F);
  const y0 = Math.max(0, r(ay - S.yb)), y1 = Math.min(S.sy, r(by - S.yb)), z0 = Math.max(0, r(az - S.z0)), z1 = Math.min(S.sz, r(bz - S.z0)), x0 = Math.max(0, r(ax - S.x0)), x1 = Math.min(S.sx, r(bx - S.x0));
  for (let fy = y0; fy < y1; fy++) for (let fz = z0; fz < z1; fz++) for (let fx = x0; fx < x1; fx++) sset(S, fx, fy, fz, m);
}
/** A beam s metres thick from world point a to b, its cells joined face to face (a brace, a strut, a girder). */
function fbeam(S, ax, ay, az, bx, by, bz, s, m) {
  const F = S.F, k = Math.max(1, Math.round(s * F)), o = k >> 1, n = Math.ceil(Math.hypot(bx - ax, by - ay, bz - az) * F * 3) + 1;
  const cell = t => [Math.floor((ax + (bx - ax) * t - S.x0) * F), Math.floor((ay + (by - ay) * t - S.yb) * F), Math.floor((az + (bz - az) * t - S.z0) * F)];
  const put = c => { for (let dy = 0; dy < k; dy++) for (let dz = 0; dz < k; dz++) for (let dx = 0; dx < k; dx++) sset(S, c[0] + dx - o, c[1] + dy - o, c[2] + dz - o, m); };
  let p = null;
  for (let i = 0; i <= n; i++) {
    const c = cell(i / n);
    if (!p) put(c); else for (let a = 0; a < 3; a++) while (p[a] !== c[a]) { p[a] += Math.sign(c[a] - p[a]); put(p); }
    p = c.slice();
  }
}
/**
 * An upright cylinder on the fine grid (silos, water tanks, wells): a round shell half a metre thick on a solid
 * floor, a band of `band` every 4 m, a cone cap of `cap`. Centred where the old voxel cylinder was, (cx + 0.5, cz + 0.5).
 * into: the structure to build it in (a water tower's tank on its legs), else a new one.
 */
function fineCylinder(cx, cz, r, g, h, t, band, cap, into) {
  const F = structRes(), R = Math.ceil(r) + 1, capH = cap ? Math.ceil(r) : 0;
  const S = into || objStruct(Math.floor(cx) - R, Math.floor(cz) - R, 2 * R + 2, 2 * R + 2, g, h + capH + 1);
  const m = fmOf(t, FM.METAL), mb = band ? fmOf(band, m) : m, mc = cap ? fmOf(cap, m) : m, ox = cx + 0.5, oz = cz + 0.5, rr = r + 0.35, th = 0.5, touched = new Set([S]);
  for (let fy = 0; fy < (h + capH) * F; fy++) for (let fz = 0; fz < S.sz; fz++) for (let fx = 0; fx < S.sx; fx++) {
    const X = S.x0 + (fx + 0.5) / F, Z = S.z0 + (fz + 0.5) / F, d = Math.hypot(X - ox, Z - oz);
    let mm = 0;
    if (fy < h * F) { if (d <= rr && (fy < th * F || d > rr - th)) mm = band && Math.floor(fy / F) % 4 === 3 ? mb : m; }
    else { const rc = rr * (1 - (fy - h * F) / (capH * F)); if (d <= rc && d > rc - th * 1.6) mm = mc; }
    if (mm) { const T = fput(X, g + (fy + 0.5) / F, Z, mm); if (T) touched.add(T); }
  }
  for (const T of touched) { projectStruct(T); world.sdirty.add(T.id); }
}
/**
 * A wrecked car on the fine grid, 4 x 2 m from (x, z) (along x when ax): a body of bodyK rusted through in places,
 * four tyres, a cab of pillars and a roof with the glass gone. Cover for infantry.
 */
function fineCar(x, z, g, ax, bodyK) {
  const F = structRes(), S = objStruct(x, z, ax ? 4 : 2, ax ? 2 : 4, g, 3), bm = fmOf(bodyK, FM.RUST), L = 4 * F, Wd = 2 * F, ns = Math.floor(rng() * 9999), touched = new Set([S]);
  const c0 = Math.round(L * 0.3), c1 = Math.round(L * 0.72), cabH = Math.round(F * 0.75), wb = [Math.round(L * 0.12), Math.round(L * 0.25)], wf = [Math.round(L * 0.72), Math.round(L * 0.85)];
  for (let l = 0; l < L; l++) for (let w = 0; w < Wd; w++) for (let y = 0; y <= F + cabH; y++) {
    let m = 0;
    if (((l >= wb[0] && l <= wb[1]) || (l >= wf[0] && l <= wf[1])) && (w === 0 || w === Wd - 1) && y < 2) m = FM.TYRE;
    else if (y >= 1 && y <= F) { // the body
      const surf = w === 0 || w === Wd - 1 || y === F || l === 0 || l === L - 1;
      if ((l === 0 || l === L - 1) && y === F) m = 0; // rounded ends
      else if (surf && hash2(l * 3 + y, w * 7 + y, ns) < 0.14) m = 0; // rusted through
      else m = bm;
    } else if (y > F && l >= c0 && l < c1 && w >= 1 && w < Wd - 1 && (y === F + cabH || l === c0 || l === c1 - 1 || l === ((c0 + c1) >> 1))) m = bm; // the cab
    if (m) { const T = fput(x + ((ax ? l : w) + 0.5) / F, g + (y + 0.5) / F, z + ((ax ? w : l) + 0.5) / F, m); if (T) touched.add(T); }
  }
  for (const T of touched) { projectStruct(T); world.sdirty.add(T.id); }
}
/**
 * One 1 m voxel of kind t at (x, y, z) on the fine grid, in the structure holding its column (a new tile when none);
 * nb: its six neighbours' kinds [+x, -x, +z, -z, +y, -y]. Its shape follows what it is and what it touches: a post
 * (nothing beside it, something above or below), a fence (wood with one or two wooden neighbours: a post and two
 * rails toward them), a thin slab (a canopy, a platform: nothing under it), a sandbag or a bale (rounded), a lone
 * lump (a little mound), else a block with its open top edges worn. into: the structure to write it in (its
 * object), else the one holding the column (a new rubble tile when none). Returns the structure, or null.
 */
function portVoxel(x, y, z, t, nb, into) {
  const m = fmOf(t, 0); if (!m) return null;
  const S = into || rubbleStructAt(x + 0.5, z + 0.5); if (!S) return null;
  const F = S.F, fy0 = (y - S.yb) * F; if (fy0 < 0 || fy0 + F > S.sy) return null;
  const built = k => !!k && !GROUNDV.has(k) && k !== V.TREE, wood = k => k === V.WOOD || k === V.PLANK;
  const hx = (built(nb[0]) ? 1 : 0) + (built(nb[1]) ? 1 : 0) + (built(nb[2]) ? 1 : 0) + (built(nb[3]) ? 1 : 0), up = built(nb[4]), down = built(nb[5]);
  const pa = Math.max(0, (F >> 1) - 1), pb = Math.min(F - 1, F >> 1), postK = m === FM.WOOD || m === FM.METAL || m === FM.STRIPE || m === FM.RUST || m === FM.RAID;
  const fx0 = (x - S.x0) * F, fz0 = (z - S.z0) * F;
  for (let k = 0; k < F; k++) for (let j = 0; j < F; j++) for (let i = 0; i < F; i++) {
    const post = i >= pa && i <= pb && j >= pa && j <= pb, h = hash2(x * F + i + k * 31, z * F + j + y * 17, 23);
    let on;
    if (postK && !hx && (up || down || m === FM.WOOD)) on = post;
    else if (m === FM.WOOD && hx <= 2) {
      const rail = (k === 1 || k === F - 1) && ((j >= pa && j <= pb && ((i > pb && wood(nb[0])) || (i < pa && wood(nb[1])))) || (i >= pa && i <= pb && ((j > pb && wood(nb[2])) || (j < pa && wood(nb[3])))));
      on = post || rail;
    } else if (postK && !down && hx >= 2) on = k >= F - Math.max(1, F >> 1);
    else if (m === FM.BAG || m === FM.HAY) { const edge = (i === 0 || i === F - 1 ? 1 : 0) + (j === 0 || j === F - 1 ? 1 : 0); on = !(k === F - 1 && edge && !up) && !(edge === 2 && h < 0.5); }
    else if (!hx && !up && !down) { const dx = (i + 0.5) / F - 0.5, dz = (j + 0.5) / F - 0.5; on = (k + 0.5) / F < 0.9 - 2.2 * (dx * dx + dz * dz) - h * 0.25; }
    else {
      const open = !up && k === F - 1 && ((i === F - 1 && !built(nb[0])) || (i === 0 && !built(nb[1])) || (j === F - 1 && !built(nb[2])) || (j === 0 && !built(nb[3])));
      on = !(open && h < 0.45);
    }
    if (on && m === FM.JUNK && h > 0.8) on = false;
    if (on) sset(S, fx0 + i, fy0 + k, fz0 + j, m);
  }
  if (S.rubble) S.port = true;
  return S;
}
/**
 * After the map rules (before structSync): every built 1 m voxel still left (fences, hay, posts, walls, tents, junk)
 * goes onto the fine grid. One in a column a structure holds joins that structure; the rest are grouped into
 * objects, the voxels joined face to face or sharing a column, and each object becomes one structure holding just
 * its own columns: a fence, a stack of bales, a lean-to stand and fall as one thing, never cut into map tiles.
 */
function structPort() {
  const N = world.N, list = [], colOf = new Map();
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const base = VH * (x + N * z);
    for (let y = 1; y < VH; y++) {
      const k = base + y, t = world.vox[k];
      if (!t || GROUNDV.has(t) || t === V.TREE || t === V.YEL || world.fmark[k] || !fmOf(t, 0)) continue;
      const c = x + N * z; if (!colOf.has(c)) colOf.set(c, []); colOf.get(c).push(list.length);
      list.push([x, y, z, t, [getV(x + 1, y, z), getV(x - 1, y, z), getV(x, y, z + 1), getV(x, y, z - 1), getV(x, y + 1, z), getV(x, y - 1, z)]]);
    }
  }
  world.ported = 0; world.portObjs = 0;
  const done = new Uint8Array(list.length), port = (j, S) => { const [x, y, z, t, nb] = list[j]; if (portVoxel(x, y, z, t, nb, S)) { world.vox[vi(x, y, z)] = 0; world.ported++; } };
  for (let i0 = 0; i0 < list.length; i0++) {
    if (done[i0]) continue;
    if (world.sown[list[i0][0] + N * list[i0][2]]) { done[i0] = 1; port(i0, null); continue; }
    const q = [i0]; done[i0] = 1;
    for (let h = 0; h < q.length; h++) {
      const [x, y, z] = list[q[h]], near = (colOf.get(x + N * z) || []).slice();
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const j of colOf.get(x + a + N * (z + b)) || []) if (list[j][1] === y) near.push(j);
      for (const j of near) if (!done[j] && !world.sown[list[j][0] + N * list[j][2]]) { done[j] = 1; q.push(j); }
    }
    let ax = 1e9, az = 1e9, ay = 1e9, bx = -1, bz = -1, by = -1; const cols = new Set();
    for (const j of q) { const [x, y, z] = list[j]; ax = Math.min(ax, x); bx = Math.max(bx, x); ay = Math.min(ay, y); by = Math.max(by, y); az = Math.min(az, z); bz = Math.max(bz, z); cols.add(x + N * z); }
    const S = newStruct(ax, az, bx - ax + 1, bz - az + 1, ay, Math.min(VH - ay, Math.max(6, by - ay + 3)), 0, cols);
    S.port = true; S.obj = true; world.portObjs++;
    for (const j of q) port(j, S);
  }
}
registerWorldStep('structPort', { order: 94, run: () => structPort() });
/** Lays a 1 m voxel of kind t at (x, y, z) on the fine grid in play (sandbags), projected at once; the old 1 m voxel when it cannot. */
function placeFine(x, y, z, t) {
  const S = portVoxel(x, y, z, t, [getV(x + 1, y, z), getV(x - 1, y, z), getV(x, y, z + 1), getV(x, y, z - 1), getV(x, y + 1, z), getV(x, y - 1, z)]);
  if (!S) { setV(x, y, z, t); recomputeColumn(x, z); return; }
  projectStruct(S); world.sdirty.add(S.id);
}
/**
 * Every 0.1 s each vehicle that moved crushes the soft fine cells (FSOFT: fences, planks, sandbags, hay, canvas,
 * junk) inside its hull (rad, 2.2 m up); what that leaves hanging falls at the next settle.
 */
function vehCrush(dt) {
  world.crushT = (world.crushT || 0) - dt;
  if (world.crushT > 0 || !world.structs || !world.structs.length || !state.ents) return;
  world.crushT = 0.1;
  const N = world.N;
  for (const e of state.ents) {
    if (!e.alive || e.gone || !(e.veh || e.kind === 'tank')) continue;
    const mv = e._crx === undefined ? 1 : Math.hypot(e.x - e._crx, e.z - e._crz); e._crx = e.x; e._crz = e.z;
    if (mv < 0.05) continue;
    const r = (e.rad || 1.7) * 0.85, y0 = (e.vy ?? e.y) + 0.15, y1 = y0 + 2.05;
    let n = 0, last = 0;
    for (let iz = Math.floor(e.z - r); iz <= Math.floor(e.z + r); iz++) for (let ix = Math.floor(e.x - r); ix <= Math.floor(e.x + r); ix++) {
      if (!inMap(ix, iz)) continue;
      const o = world.sown[ix + N * iz]; if (!o) continue;
      const S = world.structs[o - 1], F = S.F, a = Math.max(0, Math.floor((y0 - S.yb) * F)), b = Math.min(S.sy - 1, Math.floor((y1 - S.yb) * F));
      let hit = 0;
      for (let fz = (iz - S.z0) * F; fz < (iz - S.z0 + 1) * F; fz++) for (let fx = (ix - S.x0) * F; fx < (ix - S.x0 + 1) * F; fx++) {
        if (Math.hypot(S.x0 + (fx + 0.5) / F - e.x, S.z0 + (fz + 0.5) / F - e.z) > r) continue;
        for (let fy = a; fy <= b; fy++) { const l = fx + S.sx * (fz + S.sz * fy), m = S.cells[l]; if (m && FSOFT.has(m)) { S.cells[l] = 0; hit++; last = m; } }
      }
      if (hit) { n += hit; world.schip.add(S.id); }
    }
    if (n) {
      if (state.debris) for (let i = 0; i < Math.min(4, 1 + n / 16); i++) state.debris.push({ x: e.x + (rng() - 0.5) * r, y: y0 + 0.5, z: e.z + (rng() - 0.5) * r, vx: (rng() - 0.5) * 4, vy: 2 + rng() * 2, vz: (rng() - 0.5) * 4, rx: rng() * 3, ry: rng() * 3, vr: (rng() - 0.5) * 12, life: tune.debris_life * 0.5, s: 0.15 + rng() * 0.15, t: FMV[last], rest: false });
      if (n > 6 && typeof sfx === 'function') sfx('crunch', e.x, e.z);
      if (world.settleT > 0.1) world.settleT = 0.1; // the crushed thing updates soon
    }
  }
}
on('playStep', dt => vehCrush(dt));

// ---- The view: one mesh a structure, faces merged into rectangles --------------------------------------------
/** The fine cells' look: a 4 x 4 tile of cells, each a little lighter or darker with a thin dark rim. */
function structTex() {
  if (R3.structTex) return R3.structTex;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const v = Math.round(243 + hash2(i, j, 3) * 12);
    x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(i * 8, j * 8, 8, 8); // soft colour variation, no rim between cells
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  R3.structTex = t;
  R3.structMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: t });
  R3.fmlin = FMCOL.map(h => new THREE.Color(h || 0));
  return t;
}
/**
 * The structure's surface: for each axis and side, the faces between a cell and air merged greedily into rectangles.
 * A face whose air side lies under the natural ground (a foundation's sides and bottom) is buried: not drawn.
 */
function structGeo(S) {
  const dims = [S.sx, S.sy, S.sz], F = S.F, inv = 1 / F, pos = [], nor = [], col = [], uv = [], idx = [];
  const Dm = S.dmg, get = Dm ? (x, y, z) => { const m = sget(S, x, y, z); return m ? m | (Math.min(3, Dm[x + S.sx * (z + S.sz * y)] >> 6) << 5) : 0; } : (x, y, z) => sget(S, x, y, z); // material, and in bits 5-6 how cracked
  const cull = S.x0 !== undefined, GW = (S.w || 0) + 2, GH = cull ? new Int16Array(GW * (S.d + 2)) : null;
  if (cull) for (let b = 0; b < S.d + 2; b++) for (let a = 0; a < GW; a++) { const x = S.x0 - 1 + a, z = S.z0 - 1 + b; GH[a + GW * b] = inMap(x, z) ? groundOf(x, z) : 0; }
  const buried = (x, y, z) => S.yb + (y + 1) * inv <= GH[Math.floor(x / F) + 1 + GW * (Math.floor(z / F) + 1)] - 0.5; // (half a metre kept: the drawn ground dips on slopes)
  let vc = 0;
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3, du = dims[u], dv = dims[v], mask = new Int16Array(du * dv), p = [0, 0, 0], q = [0, 0, 0];
    q[d] = 1;
    for (p[d] = -1; p[d] < dims[d];) {
      let n = 0;
      for (p[v] = 0; p[v] < dv; p[v]++) for (p[u] = 0; p[u] < du; p[u]++) {
        const a = p[d] >= 0 ? get(p[0], p[1], p[2]) : 0, b = p[d] < dims[d] - 1 ? get(p[0] + q[0], p[1] + q[1], p[2] + q[2]) : 0;
        let f = a && !b ? a : !a && b ? -b : 0;
        if (f && cull && (f > 0 ? buried(p[0] + q[0], p[1] + q[1], p[2] + q[2]) : buried(p[0], p[1], p[2]))) f = 0;
        mask[n++] = f;
      }
      p[d]++;
      n = 0;
      for (let j = 0; j < dv; j++) for (let i = 0; i < du;) {
        const c = mask[n]; if (!c) { i++; n++; continue; }
        let wq = 1; while (i + wq < du && mask[n + wq] === c) wq++;
        let hq = 1, done = false;
        for (; j + hq < dv; hq++) { for (let k = 0; k < wq; k++) if (mask[n + k + hq * du] !== c) { done = true; break; } if (done) break; }
        // one rectangle at slice p[d], from (i, j) wq x hq in (u, v)
        const m = Math.abs(c) & 31, crack = Math.abs(c) >> 5, sgn = c > 0 ? 1 : -1, bc = R3.fmlin[m];
        const o = [0, 0, 0]; o[d] = p[d]; o[u] = i; o[v] = j;
        const e1 = [0, 0, 0], e2 = [0, 0, 0]; e1[u] = wq; e2[v] = hq;
        const corners = sgn > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[0, 0], [0, 1], [1, 1], [1, 0]];
        const yb = o[1] * inv + S.yb;
        let k = 0.96 + hash2(o[0] * 7 + o[1] * 3, o[2] * 13 + d, 77) * tune.vox_jitter;
        if (d !== 1) k *= 0.82 + 0.18 * Math.min(1, yb / 14); else if (sgn < 0) k *= 0.7;
        if (crack) k *= 1 - tune.struct_crack_dark * crack / 3;
        for (const [a, bq] of corners) {
          const X = o[0] + e1[0] * a + e2[0] * bq, Y = o[1] + e1[1] * a + e2[1] * bq, Z = o[2] + e1[2] * a + e2[2] * bq;
          pos.push(X * inv, Y * inv, Z * inv);
          nor.push(d === 0 ? sgn : 0, d === 1 ? sgn : 0, d === 2 ? sgn : 0);
          col.push(bc.r * k, bc.g * k, bc.b * k);
          uv.push((i + wq * a) / 4, (j + hq * bq) / 4);
        }
        idx.push(vc, vc + 1, vc + 2, vc, vc + 2, vc + 3); vc += 4;
        for (let l = 0; l < hq; l++) for (let k2 = 0; k2 < wq; k2++) mask[n + k2 + l * du] = 0;
        i += wq; n += wq;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(vc > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
/** Builds (or rebuilds) one structure's mesh. */
function setStructMesh(S) {
  structTex();
  const g = structGeo(S);
  if (S.mesh) { S.mesh.geometry.dispose(); S.mesh.geometry = g; return; }
  const m = new THREE.Mesh(g, R3.structMat);
  m.position.set(S.x0, S.yb, S.z0); m.castShadow = !CHEAP; m.receiveShadow = !CHEAP;
  S.mesh = m; R3.structGroup.add(m);
}
/** Throws away the old map's structure meshes and builds the new map's. */
function rebuildStructsView() {
  if (!R3.structGroup) { R3.structGroup = new THREE.Group(); R3.scene.add(R3.structGroup); }
  for (const m of R3.structGroup.children.slice()) { m.geometry.dispose(); R3.structGroup.remove(m); }
  for (const S of world.structs || []) { S.mesh = null; setStructMesh(S); }
  for (const P of world.pieces || []) P.mesh = null; // (falling pieces make their own again)
  if (world.sdirty) world.sdirty.clear();
}
/** Rebuilds up to max damaged structures' meshes. */
function rebuildStructsDirty(max) {
  if (!world.sdirty || !world.sdirty.size) return;
  let n = 0; const t0 = performance.now(), ms = tune.struct_mesh_ms; // a frame budget: at least one mesh, then more while under struct_mesh_ms
  for (const id of world.sdirty) { const S = world.structs[id]; if (S) setStructMesh(S); world.sdirty.delete(id); if (++n >= max || performance.now() - t0 >= ms) break; }
}
