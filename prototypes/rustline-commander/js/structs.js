// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Structures on their own fine grid (struct_res cells a metre, 4 = 25 cm): simple ruined houses and blocks of
// flats. Each structure keeps a dense grid of material cells over its box. Its 1 m projection is written into
// world.vox and marked in world.fmark (1 = a 1 m cell the structure fills, 2 = one it fills in part), so the
// paths, cover, garrisons and vehicles keep reading the 1 m world while the view draws the fine cells.
'use strict';

/** Fine materials (0 is air). */
const FM = { AIR: 0, CONC: 1, BRICK: 2, PLAST: 3, ADOBE: 4, WOOD: 5, METAL: 6, RUST: 7, RUBC: 8, RUBB: 9, BEAM: 10, TILE: 11 };
/** The 1 m kind each fine material projects to (never a soft kind: bullets and tracks chip soft 1 m voxels only). */
const FMV = [0, V.CONC, V.BRICK, V.PLAST, V.ADOBE, V.ADOBE, V.METAL, V.RUST, V.CONC, V.BRICK, V.CONC, V.TILE];
/** How hard each fine material is to blow away (multiplies the blast radius). */
const FMH = [0, 0.62, 0.72, 0.8, 0.9, 1.1, 0.75, 0.8, 1.05, 1.05, 0.55, 1];
/** Fine material colours (sRGB hex). */
const FMCOL = [0, 0x9e968b, 0x9c5038, 0xd2c3a2, 0xbba57c, 0x7c5535, 0x7d8b92, 0x8e4b27, 0x8a8279, 0x86513c, 0x5c4a3a, 0xa04428];
/** The fine material a builder's 1 m wall kind becomes. */
function fmOf(t, d) {
  const m = { [V.CONC]: FM.CONC, [V.BRICK]: FM.BRICK, [V.PLAST]: FM.PLAST, [V.ADOBE]: FM.ADOBE, [V.PLANK]: FM.WOOD, [V.WOOD]: FM.WOOD, [V.METAL]: FM.METAL, [V.RUST]: FM.RUST, [V.TILE]: FM.TILE }[t];
  return m || d;
}
/** Fine cells a metre. */
function structRes() { return Math.max(2, Math.min(4, Math.round(tune.struct_res))); }

// ---- Storage ---------------------------------------------------------------------------------------------
/** Clears the structures for a new map of N x N columns. */
function structsReset(N) { world.structs = []; world.sown = new Int16Array(N * N); world.fmark = new Uint8Array(N * N * VH); world.sdirty = new Set(); world.schip = new Set(); world.settleT = 0; }
/**
 * A new structure over the 1 m box from (x0, z0), w x d columns, its ground floor at height g, h metres tall
 * above it and `below` metres of foundation under it. Columns another structure already holds stay out of it.
 */
function newStruct(x0, z0, w, d, g, h, below) {
  const F = structRes(), N = world.N, yb = g - below, hgt = Math.min(VH - yb, h + below);
  const S = { id: world.structs.length, x0, z0, w, d, g, yb, hgt, F, sx: w * F, sy: hgt * F, sz: d * F, own: new Uint8Array(w * d), mesh: null, bld: null };
  S.cells = new Uint8Array(S.sx * S.sy * S.sz);
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
    const x = x0 + dx, z = z0 + dz; if (!inMap(x, z)) continue;
    const i = x + N * z; if (world.sown[i]) continue;
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
  S.cells[x + S.sx * (z + S.sz * y)] = m;
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
  const F = S.F, thr = Math.max(1, Math.round(tune.struct_fill * F * F * F)), N = world.N, cnt = new Uint16Array(16);
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
      if (n >= thr) { let best = 1; for (let m = 2; m < 16; m++) if (cnt[m] > cnt[best]) best = m; world.vox[k] = FMV[best]; world.fmark[k] = 1; }
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
    dropLoose(S);
    projectStruct(S);
    world.sdirty.add(S.id);
  }
}
registerWorldStep('structSync', { order: 95, run: () => structsSync() });

// ---- Damage ------------------------------------------------------------------------------------------------
/**
 * Removes what no longer stands: a fine cell joins the ground when it rests on the foundation's bottom or on
 * 1 m ground below the box, and through its six neighbours. Returns how many fine cells fell.
 */
function dropLoose(S) {
  const { sx, sy, sz, F } = S, n = sx * sy * sz, seen = new Uint8Array(n), q = new Int32Array(n), C = S.cells;
  let qh = 0, qt = 0;
  for (let fz = 0; fz < sz; fz++) for (let fx = 0; fx < sx; fx++) {
    const X = S.x0 + ((fx / F) | 0), Z = S.z0 + ((fz / F) | 0);
    for (let fy = 0; fy < sy; fy += F) { // the first fine row of each 1 m layer rests on the 1 m cell below
      const l = fx + sx * (fz + sz * fy); if (!C[l]) continue;
      const y = S.yb + fy / F, k = y > 0 ? vi(X, y - 1, Z) : -1;
      if (fy === 0 || (k >= 0 && world.vox[k] && !world.fmark[k])) { seen[l] = 1; q[qt++] = l; }
    }
  }
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
  let fell = 0;
  for (let l = 0; l < n; l++) if (C[l] && !seen[l]) { C[l] = 0; fell++; }
  return fell;
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
 * A blast of radius r metres at (x, y, z) carves every structure it reaches, drops what is left hanging and
 * projects again. Returns the 1 m cells it emptied as [x, y, z, kind, ...] (the debris thrown).
 */
function structBlast(x, y, z, r) {
  const out = []; if (!world.structs) return out;
  for (const S of world.structs) {
    if (x + r < S.x0 || x - r > S.x0 + S.w || z + r < S.z0 || z - r > S.z0 + S.d || y + r < S.yb || y - r > S.yb + S.hgt) continue;
    const F = S.F;
    if (!carveSphere(S, (x - S.x0) * F, (y - S.yb) * F, (z - S.z0) * F, r * F, true)) continue;
    const before = [];
    for (let cz = 0; cz < S.d; cz++) for (let cx = 0; cx < S.w; cx++) for (let cy = S.g - S.yb; cy < S.hgt; cy++) {
      const k = vi(S.x0 + cx, S.yb + cy, S.z0 + cz); if (S.own[cx + S.w * cz] && world.fmark[k] === 1) before.push(cx, cy, cz, world.vox[k]);
    }
    dropLoose(S);
    projectStruct(S);
    for (let i = 0; i < before.length; i += 4) {
      const X = S.x0 + before[i], Y = S.yb + before[i + 1], Z = S.z0 + before[i + 2];
      if (!world.vox[vi(X, Y, Z)]) out.push(X, Y, Z, before[i + 3]);
    }
    world.sdirty.add(S.id);
  }
  return out;
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
 * A round strikes a structure: with a chance of struct_chip_p times the material's softness (FMH) the fine cells
 * within struct_chip metres of the point chip off (heavy rounds: 1.8 times as far, 2.5 times as likely); dust puffs.
 * The 1 m projection and the mesh follow at the next settle (struct_settle).
 */
function structChip(h, heavy) {
  const S = h.S, F = S.F;
  if (state.fx) state.fx.push({ kind: 'smoke', x: h.x, y: h.y, z: h.z, t: 0, life: 0.5, s: heavy ? 0.45 : 0.28, rise: 0.4, col: FMCOL[h.m] });
  if (rng() >= Math.min(1, tune.struct_chip_p * FMH[h.m] * (heavy ? 2.5 : 1))) return 0;
  const r = tune.struct_chip * (heavy ? 1.8 : 1) * F, cx = (h.x - S.x0) * F, cy = (h.y - S.yb) * F, cz = (h.z - S.z0) * F, R = Math.ceil(r) + 1;
  let n = 0;
  for (let fy = Math.floor(cy) - R; fy <= cy + R; fy++) for (let fz = Math.floor(cz) - R; fz <= cz + R; fz++) for (let fx = Math.floor(cx) - R; fx <= cx + R; fx++) {
    if (!sget(S, fx, fy, fz)) continue;
    const inCell = fx === Math.floor(cx) && fy === Math.floor(cy) && fz === Math.floor(cz);
    if (!inCell && (fx + 0.5 - cx) ** 2 + (fy + 0.5 - cy) ** 2 + (fz + 0.5 - cz) ** 2 > r * r) continue;
    S.cells[fx + S.sx * (fz + S.sz * fy)] = 0; n++;
  }
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
  for (const id of world.schip) { const S = world.structs[id]; if (!S) continue; dropLoose(S); projectStruct(S); world.sdirty.add(id); }
  world.schip.clear();
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
 * A house or block of flats on the fine grid, footprint w x d metres from (x0, z0), ground floor at g: walls half
 * a metre thick with windows, a door on the side facing o.face, a concrete slab over each storey and a low
 * parapet on the flat roof; then ruined (o.ruin, 0..1, else struct_ruin): broken wall tops, holes in the slabs,
 * shell holes, a fallen corner, the rubble heaped round it. Registered as a building soldiers can enter.
 * o: wall, corner (1 m kinds), floors, face, doorW, ruin.
 */
function structHouse(x0, z0, w, d, g, o) {
  const fl = o.floors || 1, F = structRes(), M = 1, below = 1;
  const SH = 3 * F, T = Math.max(1, F >> 1), SL = Math.max(1, F >> 1), PR = Math.max(1, F >> 1);
  const wallM = fmOf(o.wall, FM.PLAST), cornM = fmOf(o.corner, wallM);
  const S = newStruct(x0 - M, z0 - M, w + 2 * M, d + 2 * M, g, fl * 3 + 1, below);
  const gy = below * F, fx0 = M * F, fz0 = M * F, W = w * F, D = d * F;
  // the door side: the one facing o.face, else the south side; dX, dZ the door's column in the footprint
  const f = o.face || [0, 1];
  const side = Math.abs(f[0]) > Math.abs(f[1]) ? (f[0] > 0 ? 'e' : 'w') : (f[1] > 0 ? 's' : 'n');
  const dX = side === 'w' ? 0 : side === 'e' ? w - 1 : Math.floor(w / 2), dZ = side === 'n' ? 0 : side === 's' ? d - 1 : Math.floor(d / 2);
  const dw = o.doorW || 1, doorH = Math.round(2.25 * F), sill = F, winH = Math.round(1.25 * F);
  for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) for (let fy = 0; fy < gy; fy++) sset(S, fx0 + fx, fy, fz0 + fz, FM.CONC); // the foundation
  for (let ly = 0; ly < fl * SH + PR; ly++) {
    const st = Math.floor(ly / SH), sy = ly % SH, slab = st < fl && sy >= SH - SL;
    for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) {
      const wx = fx < T || fx >= W - T, wz = fz < T || fz >= D - T, wall = wx || wz;
      if (!wall && !slab) continue;
      if (st >= fl && !wall) continue;
      const mx = Math.floor(fx / F), mz = Math.floor(fz / F), corner = (mx === 0 || mx === w - 1) && (mz === 0 || mz === d - 1);
      let m = slab && !wall ? FM.CONC : corner ? cornM : wallM;
      if (wall && st < fl && !corner) {
        const along = wz ? mx : mz, inA = (wz ? fx : fz) % F;
        const onDoor = (side === 'n' && fz < T) || (side === 's' && fz >= D - T) || (side === 'w' && fx < T) || (side === 'e' && fx >= W - T);
        const dAt = wz ? dX : dZ;
        if (onDoor && st === 0 && Math.abs(along - dAt) < dw && sy < doorH) continue; // the door
        if (along % 2 === 1 && !(onDoor && st === 0 && Math.abs(along - dAt) <= dw) && sy >= sill && sy < sill + winH && inA < F - 1) continue; // a window
        if (slab && fl > 1) m = FM.CONC; // the slab's edge shows as a band on the facade
      }
      if (st >= fl && (Math.floor((wz ? fx : fz) / F) % 5 === 2)) continue; // gaps in the parapet
      sset(S, fx0 + fx, gy + ly, fz0 + fz, m);
    }
  }
  // the doorstep outside kept clear of 1 m stuff
  const ox = x0 + dX + (side === 'w' ? -1 : side === 'e' ? 1 : 0), oz = z0 + dZ + (side === 'n' ? -1 : side === 's' ? 1 : 0);
  if (inMap(ox, oz)) for (let y = g; y < g + 3; y++) if (!GROUNDV.has(getV(ox, y, oz))) world.vox[vi(ox, y, oz)] = 0;
  ruinHouse(S, { w, d, fl, g, M, wallM, dX, dZ, ox, oz, ruin: o.ruin ?? tune.struct_ruin * (0.6 + rng() * 0.8) });
  projectStruct(S);
  const b = registerBuilding(x0, z0, w, d, g, fl * 3, dX, dZ);
  S.bld = b; world.sdirty.add(S.id);
  return b;
}
/** Ruins a fresh house: dmg 0 leaves it whole, 1 leaves little more than the ground floor's stumps. */
function ruinHouse(S, H) {
  const { F } = S, { w, d, fl, M } = H, dmg = Math.max(0, Math.min(1, H.ruin)), ns = Math.floor(rng() * 99999);
  const SH = 3 * F, gy = (S.g - S.yb) * F, fx0 = M * F, fz0 = M * F, W = w * F, D = d * F, top = gy + fl * SH + Math.max(1, F >> 1);
  const holes = [];
  // broken wall tops: each wall column loses up to a storey and a half, more where the noise says
  for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) {
    const along = (fx + fz) / F, cut = Math.floor(dmg * SH * 1.6 * smooth(0.3, 0.75, vnoise(along / 2.2, 0.5, ns)) + dmg * SH * 0.4 * vnoise(along * 1.7, 2.5, ns + 3));
    for (let fy = top - cut; fy < top; fy++) sset(S, fx0 + fx, fy, fz0 + fz, 0);
  }
  // holes in the slabs, larger in the upper storeys
  for (let st = 0; st < fl; st++) {
    const lim = dmg * (0.35 + 0.45 * (st + 1) / fl);
    for (let fz = 0; fz < D; fz++) for (let fx = 0; fx < W; fx++) if (fbm(fx / (2.5 * F), fz / (2.5 * F), ns + 7 + st * 13, 2) < lim) for (let k = 1; k <= Math.max(1, F >> 1); k++) sset(S, fx0 + fx, gy + (st + 1) * SH - k, fz0 + fz, 0);
  }
  // shell holes through the walls
  const nh = Math.round(dmg * (2 + fl) + rng() * 1.5);
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

// ---- The view: one mesh a structure, faces merged into rectangles --------------------------------------------
/** The fine cells' look: a 4 x 4 tile of cells, each a little lighter or darker with a thin dark rim. */
function structTex() {
  if (R3.structTex) return R3.structTex;
  const c = document.createElement('canvas'); c.width = c.height = 32;
  const x = c.getContext('2d');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const v = Math.round(232 + hash2(i, j, 3) * 23);
    x.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; x.fillRect(i * 8, j * 8, 8, 8);
    x.fillStyle = 'rgba(0,0,0,0.16)'; x.fillRect(i * 8, j * 8 + 7, 8, 1); x.fillRect(i * 8 + 7, j * 8, 1, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  R3.structTex = t;
  R3.structMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: t });
  R3.fmlin = FMCOL.map(h => new THREE.Color(h || 0));
  return t;
}
/** The structure's surface: for each axis and side, the faces between a cell and air merged greedily into rectangles. */
function structGeo(S) {
  const dims = [S.sx, S.sy, S.sz], F = S.F, inv = 1 / F, pos = [], nor = [], col = [], uv = [], idx = [];
  const get = (x, y, z) => sget(S, x, y, z);
  let vc = 0;
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3, v = (d + 2) % 3, du = dims[u], dv = dims[v], mask = new Int16Array(du * dv), p = [0, 0, 0], q = [0, 0, 0];
    q[d] = 1;
    for (p[d] = -1; p[d] < dims[d];) {
      let n = 0;
      for (p[v] = 0; p[v] < dv; p[v]++) for (p[u] = 0; p[u] < du; p[u]++) {
        const a = p[d] >= 0 ? get(p[0], p[1], p[2]) : 0, b = p[d] < dims[d] - 1 ? get(p[0] + q[0], p[1] + q[1], p[2] + q[2]) : 0;
        mask[n++] = a && !b ? a : !a && b ? -b : 0;
      }
      p[d]++;
      n = 0;
      for (let j = 0; j < dv; j++) for (let i = 0; i < du;) {
        const c = mask[n]; if (!c) { i++; n++; continue; }
        let wq = 1; while (i + wq < du && mask[n + wq] === c) wq++;
        let hq = 1, done = false;
        for (; j + hq < dv; hq++) { for (let k = 0; k < wq; k++) if (mask[n + k + hq * du] !== c) { done = true; break; } if (done) break; }
        // one rectangle at slice p[d], from (i, j) wq x hq in (u, v)
        const m = Math.abs(c), sgn = c > 0 ? 1 : -1, bc = R3.fmlin[m];
        const o = [0, 0, 0]; o[d] = p[d]; o[u] = i; o[v] = j;
        const e1 = [0, 0, 0], e2 = [0, 0, 0]; e1[u] = wq; e2[v] = hq;
        const corners = sgn > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[0, 0], [0, 1], [1, 1], [1, 0]];
        const yb = o[1] * inv + S.yb;
        let k = 0.9 + hash2(o[0] * 7 + o[1] * 3, o[2] * 13 + d, 77) * 0.12;
        if (d !== 1) k *= 0.82 + 0.18 * Math.min(1, yb / 14); else if (sgn < 0) k *= 0.7;
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
  if (world.sdirty) world.sdirty.clear();
}
/** Rebuilds up to max damaged structures' meshes. */
function rebuildStructsDirty(max) {
  if (!world.sdirty || !world.sdirty.size) return;
  let n = 0;
  for (const id of world.sdirty) { const S = world.structs[id]; if (S) setStructMesh(S); world.sdirty.delete(id); if (++n >= max) break; }
}
