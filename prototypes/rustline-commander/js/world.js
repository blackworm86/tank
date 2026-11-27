// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// The voxel world: storage, generation of one run's map, destruction, paths, sight and cover.
'use strict';

/** Voxel kinds. */
const V = { AIR: 0, BED: 1, SAND: 2, DIRT: 3, ROCK: 4, RED: 5, ROAD: 6, CONC: 7, RUST: 8, BAG: 9, JUNK: 10, WOOD: 11, GREEN: 12, RAID: 13, YEL: 14, TREE: 15 };
/** Base colour of each kind (sRGB hex), the rust-desert palette. */
const VCOL = [0, 0x3b2b22, 0xd8a560, 0x9e6c47, 0x91624a, 0xb4573b, 0x7c6652, 0x9e968b, 0x8e4b27, 0xb99d6c, 0x5f5347, 0x7c5535, 0x56693a, 0xa62f28, 0xdab33d, 0x55603a];
/** How hard each kind is to blow away (multiplies the blast radius). */
const VHARD = [0, 0, 1, 1, 0.55, 0.5, 0.95, 0.62, 0.78, 1.15, 1.15, 1.15, 0.78, 0.78, 0.78, 1.3];
/** Soft kinds: chipped by bullets and crushed by tracks. */
const SOFTV = new Set([V.BAG, V.JUNK, V.WOOD, V.TREE]);
/** Voxel kinds that are natural ground (the drawn terrain), as opposed to walls, huts, junk and trees. */
const GROUNDV = new Set([V.BED, V.SAND, V.DIRT, V.ROCK, V.RED, V.ROAD]);
/**
 * True when a hard built column (a wall, a post) taller than 1 or deep water lies in the 3x3 around (x,z), or a
 * cliff edge in the 5x5: too tight for a hull (the hull's corners reach past the cell beside it).
 */
function hardNear(x, z) {
  const c = inMap(x, z) ? world.groundRaw[x + world.N * z] : 0;
  for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) {
    const xx = x + a, zz = z + b; if (!inMap(xx, zz)) continue;
    const i = xx + world.N * zz, h = world.hmap[i];
    if (Math.abs(world.groundRaw[i] - c) >= tune.map_cliff) return true; // a cliff edge, above or below (M7)
    if (a < -1 || a > 1 || b < -1 || b > 1) continue;
    if (h < world.WL - 1) return true; // deep water beside: a hull would hang over it
    if (h - world.groundRaw[i] > 1 && !SOFTV.has(world.vox[VH * i + h - 1]) && world.road[i] !== 2) return true;
  }
  return false;
}
/** True when column i ends in natural ground: its steps are slopes a vehicle can take, not walls. */
function natTop(i) { const h = world.hmap[i]; return h > 0 && GROUNDV.has(world.vox[VH * i + h - 1]); }
const VH = 40; // world height in voxels

/** The one world of the current run. */
const world = { N: 0, WL: 4, vox: null, hmap: null, road: null, scorch: null, groundRaw: null, gsm: null, dirty: new Set(), sites: null, gen: 0, mapDirty: true };

// ---- Noise (seeded hash, value noise) -----------------------------------------------------
function hash2(x, z, s) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, z, s) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz, s), b = hash2(ix + 1, iz, s), c = hash2(ix, iz + 1, s), d = hash2(ix + 1, iz + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z, s, oct) {
  let t = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { t += amp * vnoise(x * f, z * f, s + i * 31); n += amp; amp *= 0.5; f *= 2; }
  return t / n;
}
function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

// ---- Voxel access ---------------------------------------------------------------------------
function vi(x, y, z) { return y + VH * (x + world.N * z); }
function inMap(x, z) { return x >= 0 && z >= 0 && x < world.N && z < world.N; }
function getV(x, y, z) {
  if (y < 0) return V.BED;
  if (y >= VH || !inMap(x, z)) return V.AIR;
  return world.vox[vi(x, y, z)];
}
function markDirty(x, z) {
  const cx = x >> 4, cz = z >> 4, d = world.dirty;
  // the drawn ground reads four columns past a chunk edge: near an edge, the neighbour chunk redraws too
  const lx = x & 15, lz = z & 15, ox = lx <= 4 && cx > 0 ? -1 : lx >= 11 ? 1 : 0, oz = lz <= 4 && cz > 0 ? -1 : lz >= 11 ? 1 : 0;
  d.add(cx + cz * 64);
  if (ox) d.add(cx + ox + cz * 64);
  if (oz) d.add(cx + (cz + oz) * 64);
  if (ox && oz) d.add(cx + ox + (cz + oz) * 64);
  world.mapDirty = true;
}
function setV(x, y, z, t) {
  if (y < 0 || y >= VH || !inMap(x, z)) return;
  world.vox[vi(x, y, z)] = t; markDirty(x, z);
}
/** True when (x, y, z) is solid. In a structure (js/structs.js) its fine cells answer: windows and breaches let sight through. */
function solidF(x, y, z) {
  const s = structSolidAt(x, y, z);
  if (s === 1) return true;
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  if (s === 0) { const k = vi(ix, iy, iz); return world.vox[k] !== 0 && !world.fmark[k]; }
  return getV(ix, iy, iz) !== V.AIR;
}
/** Surface height of the column under (x, z): the top of the highest voxel. Off the map: a wall. */
function hAt(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  if (!inMap(ix, iz)) return 99;
  return world.hmap[ix + world.N * iz];
}
function recomputeColumn(x, z) {
  const base = VH * (x + world.N * z);
  let h = 0;
  for (let y = VH - 1; y >= 0; y--) if (world.vox[base + y]) { h = y + 1; break; }
  world.hmap[x + world.N * z] = h;
}
/** A cell a soldier can stand in: on the map and not deeper than a ford. */
function walkable(x, z) { return inMap(x, z) && world.hmap[x + world.N * z] >= world.WL - 1; }
/** A cell standing above most of its neighbours: the top of a wall, a crate, a pillar. Soldiers do not stand there. */
function perch(x, z) {
  if (!inMap(x, z)) return false;
  const h = world.hmap[x + world.N * z]; let hi = 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && hAt(x + dx, z + dz) <= h - 1) hi++;
  return hi >= 5;
}
function deepWater(x, z) { const h = hAt(x, z); return h < world.WL - 1; }
function shallow(x, z) { return hAt(x, z) < world.WL; }

// ---- Generation -----------------------------------------------------------------------------
/** Builds a whole new map for a run from rng(). Returns the sites (start, outposts, camps, fortress...). */
/**
 * The map's shape. map_simple 1 is the test map: smaller, gentle rolling ground, one river with its
 * bridges, no mountains, mesa, canyon or lakes, three camps, few ruins, rocks and woods.
 */
function mapPreset() {
  if (tune.map_simple) return biomePreset({ size: 128, relief: 4, mountains: 0, mesa: false, lakes: false, camps: 3, ruins: 6, rocks: 5, forest: 0.3 });
  return biomePreset({ size: Math.round(tune.map_size / 16) * 16, relief: 11, mountains: tune.mountain_amount, mesa: true, lakes: true, camps: Math.round(tune.camp_count), ruins: Math.round(tune.ruin_count), rocks: Math.round(tune.rock_count), forest: tune.forest_amount });
}
/**
 * The map is built by registered steps, in their order (low first). Each step reads and adds to G, the
 * map being built: P (the preset), S (the campaign sector), N, WL, ns (the map's noise seed), the frame
 * (C, real, canon, SC, EC), GS (the geography's shape), the water (river, mesa, canyon, lakes, wide, fords),
 * the relief (wallK, Hf), the sites (sites, placed), hi (the heights after the roads). A content pack adds
 * a step with registerWorldStep(id, { order, run(G) }); between two of these orders it sees all the
 * steps before it. Steps that use rng() change every map after them, as any new random call does.
 */
const WORLD_STEPS = adopt('worldStep', {});
/** Adds a map-building step. */
function registerWorldStep(id, D) { return register('worldStep', id, D); }
/** The steps' ids in their order. */
function worldSteps() { return Object.keys(WORLD_STEPS).sort((a, b) => (WORLD_STEPS[a].order || 0) - (WORLD_STEPS[b].order || 0)); }
/** Builds a whole new map for a run from rng(), step by step. Returns the sites (start, outposts, camps, fortress...). */
function genWorld() {
  const G = {};
  for (const id of worldSteps()) WORLD_STEPS[id].run(G);
  world.sites = G.sites;
  return G.sites;
}
/** The distance from (x, z) to the nearest point of a polyline. */
function distTo(pts, x, z) {
  let best = 1e9;
  for (let i = 0; i < pts.length; i++) { const dx = pts[i][0] - x, dz = pts[i][1] - z, d = dx * dx + dz * dz; if (d < best) best = d; }
  return Math.sqrt(best);
}

/** The frame: the preset, the arrays, the noise seed, the turn of the map, the geography and its land. */
function wgFrame(G) {
  const P = mapPreset(); world.preset = P;
  const S = world.spec || {}; // the campaign sector this map is for (camps, outposts, wrecks, patrols, tier)
  if (S.camps != null) P.camps = S.camps;
  if (S.size && !tune.map_simple) P.size = S.size; // the sector's own size
  const N = P.size, WL = Math.round(tune.water_level);
  world.N = N; world.WL = WL;
  world.vox = new Uint8Array(N * N * VH);
  world.hmap = new Uint8Array(N * N);
  world.road = new Uint8Array(N * N);
  world.scorch = new Uint8Array(N * N);
  world.groundRaw = new Uint8Array(N * N); world.gsm = new Float32Array(N * N); world.cor = new Float32Array(N * N * 4);
  world.buildings = []; world.bld = new Int16Array(N * N); world.props = []; world.keep = new Uint8Array(N * N);
  structsReset(N); // js/structs.js: the structures on their fine grid
  world.dirty.clear(); world.gen++; world.mapDirty = true;
  const ns = Math.floor(rng() * 1e6);
  // The frame: the map is laid out in a canonical space where the start and the exit sit on the diagonal,
  // then turned by a random angle about the centre, so they can be on any side, corner or edge.
  const C = N / 2, alpha = rng() * Math.PI * 2, ca = Math.cos(alpha), sa = Math.sin(alpha);
  const real = (cx, cz) => { const dx = cx - C, dz = cz - C; return { x: Math.max(1, Math.min(N - 2, Math.round(C + dx * ca - dz * sa))), z: Math.max(1, Math.min(N - 2, Math.round(C + dx * sa + dz * ca))) }; };
  const canon = (x, z) => { const dx = x - C, dz = z - C; return [C + dx * ca + dz * sa, C - dx * sa + dz * ca]; };
  const rdx = Math.SQRT1_2 * (ca - sa), rdz = Math.SQRT1_2 * (sa + ca), far = m => (N / 2 - m) / Math.max(Math.abs(rdx), Math.abs(rdz));
  const dS = far(22), dE = far(27), SC = [C - Math.SQRT1_2 * dS, C - Math.SQRT1_2 * dS], EC = [C + Math.SQRT1_2 * dE, C + Math.SQRT1_2 * dE];
  world.frame = { C, ca, sa, SC, EC };
  world.geos = mapGeoIds(); world.geo = world.geos[0]; world.shape = mapShapeId();
  const GS = geoShape(world.geos, N, ns, SC, EC); world.geoShape = GS; // biomes.js
  // the geography sets the land around it (the strongest one: hills, then ridges and plateaus, then a river)
  const lands = world.geos.map(g => GEOS[g]).filter(D => D.land).sort((a, b) => (b.landRank || 0) - (a.landRank || 0));
  if (lands.length) lands[0].land(P);
  Object.assign(G, { P, S, N, WL, ns, C, real, canon, SC, EC, GS });
}
/** The water and the long lines: the river (wide in the river geography), the mesa and its canyon, the lakes, the fords. */
function wgWater(G) {
  const { P, N, ns, canon, SC, EC } = G;
  const wideRiver = world.geos.some(g => GEOS[g].wideRiver);
  // Polylines in canonical space (start near 0,0; fortress near N,N).
  const poly = (ax, az, bx, bz, wig, freq, s, n) => {
    const pts = [], L = Math.hypot(bx - ax, bz - az), px = -(bz - az) / L, pz = (bx - ax) / L;
    const ph = rng() * 6.28;
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = Math.sin(t * freq + ph) * wig + (vnoise(t * 5, 0.5, s) - 0.5) * wig * 1.6;
      pts.push([ax + (bx - ax) * t + px * off, az + (bz - az) * t + pz * off, t]);
    }
    return pts;
  };
  // the river crosses the way somewhere between a third and two thirds of it, at a slant of its own (or there is none)
  const rt = 0.35 + rng() * 0.3, rb = (rng() - 0.5) * 1.3, rmx = SC[0] + (EC[0] - SC[0]) * rt, rmz = SC[1] + (EC[1] - SC[1]) * rt;
  const rdir = [Math.cos(-Math.PI / 4 + rb), Math.sin(-Math.PI / 4 + rb)], RL = N * 0.95;
  const river = wideRiver || rng() < tune.river_chance ? poly(rmx - rdir[0] * RL, rmz - rdir[1] * RL, rmx + rdir[0] * RL, rmz + rdir[1] * RL, 9, 8, ns + 3, 260) : [];
  const mesa = poly(N * 0.3, N * 1.1, N * 1.1, N * 0.3, 5, 4, ns + 4, 160);
  const canyon = poly(N * 0.5, N * 0.5, N * 0.9, N * 0.9, 7, 7, ns + 5, 120);
  const lakes = [];
  if (P.lakes) for (let k = 0; k < 6 && lakes.length < 2 + (rng() < 0.4 ? 1 : 0); k++) { // anywhere off the start, the exit and the river
    const [x, z] = canon(16 + rng() * (N - 32), 16 + rng() * (N - 32));
    if (Math.hypot(x - SC[0], z - SC[1]) < 34 || Math.hypot(x - EC[0], z - EC[1]) < 34 || (river.length && distTo(river, x, z) < 22)) continue;
    lakes.push({ x, z, r: 6 + rng() * 6 });
  }
  const wide = wideRiver && river.length > 0, fords = wide ? [river[Math.floor(river.length * (0.3 + rng() * 0.12))], river[Math.floor(river.length * (0.6 + rng() * 0.12))]] : [];
  Object.assign(G, { river, mesa, canyon, lakes, wide, fords });
}
/** The relief: noise, mountains, the mesa, the geography, the river valley, the shape's walls, the lakes; then the soft blurs. */
function wgRelief(G) {
  const { P, N, WL, ns, C, canon, GS, river, mesa, canyon, lakes, wide, fords } = G;
  // the map's shape: open, a valley between rock walls along the way, a basin ringed by mountains (biomes.js)
  const SH = SHAPES[world.shape], wallK = SH && SH.wall ? (cx, cz) => SH.wall(cx, cz, N, ns, C) : () => 0;
  const Hf = new Float32Array(N * N);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const [cx, cz] = canon(x, z);
    let h = 6 + fbm(cx / 36, cz / 36, ns, 4) * P.relief;
    const rg = 1 - Math.abs(vnoise(cx / 20, cz / 20, ns + 7) * 2 - 1);
    const mask = smooth(0.52, 0.75, fbm(cx / 50, cz / 50, ns + 9, 3));
    h += mask * rg * rg * 20 * P.mountains;
    // the mesa band, cut by a canyon
    const dm = distTo(mesa, cx, cz);
    const raise = 9 * smooth(13, 9, dm);
    const dc = distTo(canyon, cx, cz);
    const cut = smooth(5.5, 3, dc);
    if (P.mesa) h += raise * (1 - cut);
    h += GS.raise(cx, cz); // ridges and passes, plateaus
    // the river valley (wide and deep in the river geography: bridges and a ford or two are the only crossings)
    const dr = distTo(river, cx, cz), wd = wide ? 3.2 : 0;
    if (dr < 10 + wd * 1.5) h = Math.min(h, WL + 0.6 + (dr - 4 - wd) * 0.9);
    if (dr < 4.2 + wd) h = Math.min(h, WL - 1);
    if (dr < 2.6 + wd) h = Math.min(h, WL - 2.2);
    if (wide && dr < 4.2 + wd && fords.some(f => Math.hypot(cx - f[0], cz - f[1]) < 6)) h = Math.max(h, WL - 0.6); // a ford: shallow enough to drive
    const wk = wallK(cx, cz); if (wk > 0) h = h * (1 - wk) + (tune.wall_height + fbm(cx / 9, cz / 9, ns + 52, 2) * 4) * wk; // the rock walls of a valley or a basin
    for (const L of lakes) {
      const dl = Math.hypot(cx - L.x, cz - L.z);
      if (dl < L.r + 5) h = Math.min(h, WL + 0.5 + (dl - L.r) * 0.7);
      if (dl < L.r) h = Math.min(h, WL - 1.5 - (L.r - dl) * 0.25);
    }
    Hf[x + N * z] = h;
  }

  // soft blurs: hills become ramps a tank can climb, while mesas and ridges stay cliffs
  for (let pass = 0; pass < Math.round(tune.terrain_smooth); pass++) {
    const B = new Float32Array(N * N);
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      let s = 0, n = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= N || zz >= N) continue; s += Hf[xx + N * zz]; n++; }
      const i = x + N * z, m = s / n;
      B[i] = Math.abs(m - Hf[i]) < 2.5 ? m : Hf[i];
    }
    Hf.set(B);
  }
  Object.assign(G, { wallK, Hf });
}
/** The sites: the start, the exit or the fortress, the outposts, the camps; named, and the ground under them flattened. */
function wgSites(G) {
  const { P, S, N, WL, real, canon, SC, EC, GS, river, mesa, lakes, wide, wallK, Hf } = G;
  // Sites, in canonical space then mapped.
  const sites = { start: null, outposts: [], camps: [], fortress: null, wrecks: [], patrols: [], firstWall: null };
  const riverD = (cx, cz) => distTo(river, cx, cz);
  const okSpot = (cx, cz, avoid, minD) => {
    const rr = real(cx, cz); if (rr.x < 14 || rr.z < 14 || rr.x > N - 14 || rr.z > N - 14) return false;
    if (wallK(cx, cz) > 0) return false; // not in or under the walls
    if (riverD(cx, cz) < 12) return false;
    for (const L of lakes) if (Math.hypot(cx - L.x, cz - L.z) < L.r + 10) return false;
    if (P.mesa && distTo(mesa, cx, cz) < 15) return false;
    if (GS.block(cx, cz)) return false; // never on a ridge
    if (wide && riverD(cx, cz) < 17) return false;
    for (const a of avoid) if (Math.hypot(cx - a.cx, cz - a.cz) < minD) return false;
    return true;
  };
  const placed = [];
  const place = (cx, cz, kind, extra) => { const r = real(Math.round(cx), Math.round(cz)); const s = Object.assign({ cx, cz, x: r.x, z: r.z, kind }, extra); placed.push(s); return s; };
  sites.start = place(SC[0], SC[1], 'start');
  sites.fortress = place(EC[0], EC[1], world.spec && !S.final ? 'exit' : 'fortress'); // a sector's exit, or the Horde's gate
  // outposts along the way, one each side of the river
  for (const t of (S.outposts === 0 ? [] : S.outposts === 1 ? [0.5] : [0.3, 0.68])) {
    for (let tries = 0; tries < 200; tries++) {
      const off = (rng() - 0.5) * (60 + tries), along = (rng() - 0.5) * Math.min(40, tries * 0.3);
      const cx = SC[0] + (EC[0] - SC[0]) * t + off * 0.7 + along, cz = SC[1] + (EC[1] - SC[1]) * t - off * 0.7 + along;
      if (okSpot(cx, cz, placed, 26)) { sites.outposts.push(place(cx, cz, 'outpost')); break; }
    }
  }
  // camps, the first close to the start
  const want = P.camps;
  for (let tries = 0; tries < 600 && sites.camps.length < want; tries++) {
    let cx, cz;
    if (sites.camps.length === 0 && tries < 150) { const a = Math.PI / 4 + (rng() - 0.5) * 0.9, d = 54 + rng() * 8; cx = SC[0] + Math.cos(a) * d; cz = SC[1] + Math.sin(a) * d; }
    else [cx, cz] = canon(16 + rng() * (N - 32), 16 + rng() * (N - 32));
    if (Math.hypot(cx - SC[0], cz - SC[1]) < 50) continue;
    if (Math.hypot(cx - EC[0], cz - EC[1]) < 30) continue;
    if (!okSpot(cx, cz, placed, 24)) continue;
    sites.camps.push(place(cx, cz, 'camp'));
  }
  sites.camps.sort((a, b) => Math.hypot(a.cx - SC[0], a.cz - SC[1]) - Math.hypot(b.cx - SC[0], b.cz - SC[1]));
  sites.camps.forEach((c, i) => { c.tier = 1 + Math.floor(i * 3 / Math.max(1, sites.camps.length)); if (S.tier) c.tier = Math.min(3, S.tier + Math.floor(i * 2 / Math.max(2, sites.camps.length))); c.name = 'Campo ' + 'ABCDEFGH'[i]; });
  sites.outposts.forEach((o, i) => { o.name = ['Avamposto Pozzo Secco', 'Avamposto Ferrovecchio'][i] || 'Avamposto'; });
  sites.start.name = 'Avamposto Base';
  sites.fortress.name = sites.fortress.kind === 'exit' ? 'Uscita' : S.final ? 'Cancello dell\'Orda' : 'Fortezza del Capo';
  if (S.startBase) sites.start.name = 'Campo dell\'esercito';

  // flatten each site
  const flatten = (s, r) => {
    let sum = 0, n = 0;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = s.x + dx, z = s.z + dz; if (!inMap(x, z) || dx * dx + dz * dz > r * r) continue; sum += Hf[x + N * z]; n++;
    }
    const target = Math.max(WL + 2, Math.min(24, sum / Math.max(1, n))); // high ground stays high (plateau camps)
    for (let dz = -r - 7; dz <= r + 7; dz++) for (let dx = -r - 7; dx <= r + 7; dx++) {
      const x = s.x + dx, z = s.z + dz; if (!inMap(x, z)) continue;
      const d = Math.hypot(dx, dz), k = smooth(r + 7, r, d), i = x + N * z;
      Hf[i] = Hf[i] + (target - Hf[i]) * k;
    }
    s.g = Math.round(target);
  };
  flatten(sites.start, 11); flatten(sites.fortress, 18);
  for (const o of sites.outposts) flatten(o, 11);
  for (const c of sites.camps) flatten(c, 9);
  Object.assign(G, { sites, placed });
}
/** The roads: a chain from the start through every site to the exit, carved and bridged; the pads kept flat. */
function wgRoads(G) {
  const { N, WL, SC, Hf, sites, placed } = G;
  const hi = new Int16Array(N * N);
  for (let i = 0; i < N * N; i++) hi[i] = Math.max(1, Math.min(VH - 12, Math.round(Hf[i])));

  // Roads: a chain from the start through every site to the fortress, carved and bridged.
  const chain = [sites.start, ...[...sites.camps, ...sites.outposts].sort((a, b) => Math.hypot(a.cx - SC[0], a.cz - SC[1]) - Math.hypot(b.cx - SC[0], b.cz - SC[1])), sites.fortress];
  const roadPaths = [];
  for (let k = 0; k + 1 < chain.length; k++) {
    const p = roadAStar(hi, N, WL, chain[k], chain[k + 1]);
    if (p) { carveRoad(hi, N, WL, p); roadPaths.push(p); }
  }
  sites.roadMain = roadPaths[0] || [];
  // the sites keep their flat ground after the roads ran through
  for (const s of placed) {
    const r = padR(s), K = 6;
    for (let dz = -r - K; dz <= r + K; dz++) for (let dx = -r - K; dx <= r + K; dx++) {
      const x = s.x + dx, z = s.z + dz; if (!inMap(x, z)) continue;
      const i = x + N * z, d = Math.max(Math.abs(dx), Math.abs(dz)) - r;
      if (d <= 0) { hi[i] = s.g; if (world.road[i] === 2) world.road[i] = 1; continue; }
      // M9: a pad's skirt ramps 1 a cell into the land round it, so its edge is never a cliff
      if (hi[i] > s.g + d) hi[i] = s.g + d; else if (hi[i] < s.g - d) hi[i] = s.g - d;
    }
  }
  relaxRoads(hi, N, placed);
  G.hi = hi;
}
/**
 * The ramp and cliff rule (map rule M1), after the roads: natural ground climbs at most 1 voxel every ramp_run
 * cells, and a step of map_cliff or more is a cliff wall, left as it is. Roads, bridges and site pads hold their
 * heights: the land round them is cut down or banked up to meet them. Then no ledge (a
 * step above 1 that is not a cliff) and no 1-cell pit or spike is left. A water bed climbs to its bank at the ramp.
 */
function wgSlopes(G) {
  const { N, WL, hi, placed } = G, k = 1 / Math.max(1, tune.ramp_run), C = tune.map_cliff, D2 = Math.SQRT2 * k;
  const fix = new Uint8Array(N * N), f = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { if (world.road[i]) fix[i] = 1; f[i] = hi[i]; } // roads (graded at the ramp when carved) and bridges hold
  for (const s of placed) { const r = padR(s); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (inMap(s.x + dx, s.z + dz)) fix[s.x + dx + N * (s.z + dz)] = 1; }
  const wet = i => hi[i] < WL && !fix[i];
  const NB = [[1, 0, k], [-1, 0, k], [0, 1, k], [0, -1, k], [1, 1, D2], [-1, 1, D2], [1, -1, D2], [-1, -1, D2]];
  const sweep = (fn) => { // forward then backward over the map, until nothing changes
    for (let pass = 0; pass < 60; pass++) {
      let ch = 0;
      for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) ch += fn(x, z);
      for (let z = N - 1; z >= 0; z--) for (let x = N - 1; x >= 0; x--) ch += fn(x, z);
      if (!ch) break;
    }
  };
  // 0. steep ground becomes terraces: where the land climbs 2 or more a cell, its height is rounded to steps of
  // map_cliff + 1, so a mountain side or a gorge wall stays a stack of rock walls instead of being cut to a ramp
  const T = C + 1, steep = new Uint8Array(N * N);
  for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    const i = x + N * z; if (fix[i] || wet(i)) continue;
    let g = 0; for (const j of [i - 1, i + 1, i - N, i + N]) if (!wet(j)) g = Math.max(g, Math.abs(hi[i] - hi[j]));
    if (g >= 2) for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) steep[i + a + N * b] = 1;
  }
  for (let i = 0; i < N * N; i++) if (steep[i] && !fix[i] && !wet(i)) f[i] = Math.max(WL, WL + Math.round((f[i] - WL) / T) * T);
  // 1. cut down: no free land higher than a neighbour plus the ramp (cliffs and water's edge excepted)
  sweep((x, z) => {
    const i = x + N * z; if (fix[i] || wet(i)) return 0;
    let v = f[i];
    for (const [a, b, d] of NB) {
      const xx = x + a, zz = z + b; if (!inMap(xx, zz)) continue;
      const j = xx + N * zz, q = wet(j) ? Math.max(f[j], WL - 1) : f[j]; // the bank meets the shallow bed at the ramp
      if (Math.abs(f[i] - q) >= C) continue; // a cliff: the wall stays
      if (q + d < v) v = q + d;
    }
    if (v < f[i] - 1e-4) { f[i] = v; return 1; }
    return 0;
  });
  // 1b. shores: a water bed climbs to the bank at the ramp, so the land never drops more than a ramp into the water
  sweep((x, z) => {
    const i = x + N * z; if (!wet(i)) return 0;
    let v = f[i];
    for (const [a, b, d] of NB) {
      const xx = x + a, zz = z + b; if (!inMap(xx, zz)) continue;
      const j = xx + N * zz, q = wet(j) ? f[j] : Math.max(f[j], WL);
      if (Math.abs(f[i] - q) >= C) continue; // a canyon wall into the river stays
      if (q - d > v) v = q - d;
    }
    v = Math.min(v, WL - 1);
    if (v > f[i] + 1e-4) { f[i] = v; return 1; }
    return 0;
  });
  // 2. bank up: free land below a held cell (a road, a pad) rises to meet it at the ramp
  const g = new Float32Array(N * N).fill(-1e9);
  for (let i = 0; i < N * N; i++) if (fix[i]) g[i] = f[i];
  sweep((x, z) => {
    const i = x + N * z; if (fix[i] || wet(i)) return 0;
    let v = g[i];
    for (const [a, b, d] of NB) {
      const xx = x + a, zz = z + b; if (!inMap(xx, zz)) continue;
      const j = xx + N * zz; if (g[j] < -1e8) continue; // even across a cliff: a pad or a road never stands on a wall (M9)
      if (g[j] - d > v) v = g[j] - d;
    }
    if (v > g[i] + 1e-4) { g[i] = v; return 1; }
    return 0;
  });
  for (let i = 0; i < N * N; i++) if (!fix[i]) hi[i] = wet(i) ? Math.min(WL - 1, Math.round(f[i])) : Math.max(WL, Math.round(Math.max(f[i], g[i])));
  // 3. clean up, on whole voxels: ledges become ramps, 1-cell pits fill, 1-cell spikes go
  for (let pass = 0; pass < 20; pass++) {
    let ch = 0;
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
      const i = x + N * z; if (fix[i] || wet(i)) continue;
      const n4 = [i - 1, i + 1, i - N, i + N];
      let lo = 1e9, hiN = -1e9;
      for (const j of n4) { lo = Math.min(lo, hi[j]); hiN = Math.max(hiN, hi[j]); }
      if (hi[i] < lo) { hi[i] = lo; ch++; continue; }
      if (hi[i] > hiN) { hi[i] = hiN; ch++; continue; }
      for (const j of n4) {
        const d = hi[i] - hi[j];
        if (d >= 2 && d < C) { hi[i] = hi[j] + 1; ch++; break; } // a ledge above a neighbour: cut it to a ramp
        if (-d >= 2 && -d < C && fix[j] && hi[j] >= WL) { hi[i] = hi[j] - 1; ch++; break; } // below a held cell: bank it up
      }
    }
    if (!ch) break;
  }
}
/** The voxel columns: bedrock, strata, dirt and sand, roads and bridges. */
function wgColumns(G) {
  const { N, WL, ns, hi } = G;
  // Fill columns.
  const V_ = world.vox;
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = x + N * z, h = hi[i], base = VH * i;
    let slope = 0;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, zz = z + dz; if (!inMap(xx, zz)) continue; slope = Math.max(slope, Math.abs(h - hi[xx + N * zz]));
    }
    const sandy = fbm(x / 9, z / 9, ns + 11, 2) < 0.52;
    for (let y = 0; y < h; y++) {
      let t;
      const strata = (y % 5 < 2) ? V.RED : V.ROCK;
      if (y === 0) t = V.BED;
      else if (y === h - 1) {
        if (world.road[i] === 2) t = V.RUST;
        else if (world.road[i] === 1) t = V.ROAD;
        else if (h < WL) t = V.DIRT;
        else if (slope >= 2 || h >= 17) t = strata;
        else if (h <= WL + 1) t = V.SAND;
        else t = sandy ? V.SAND : V.DIRT;
      } else if (world.road[i] === 2 && y >= h - 3) t = V.RUST;
      else if (y >= h - 3 && slope < 2 && h < 17) t = V.DIRT;
      else t = strata;
      V_[base + y] = t;
    }
  }
}
/** The sites' structures: the outposts, the camps, the fortress or the exit; the friendly roads kept open. */
function wgStructures(G) {
  const { N, S, hi, sites } = G;
  // Structures.
  if (S.startBase) buildOutpost(sites.start, false); // the army's walled camp in the last stand
  else if (!world.spec) buildOutpost(sites.start, true); // a sector starts on open ground: the tank comes alone
  for (const o of sites.outposts) buildOutpost(o, false);
  for (const c of sites.camps) buildCamp(c);
  world.sitesStart = sites.start;
  if (sites.fortress.kind === 'fortress') buildFortress(sites.fortress); else buildExit(sites.fortress);
  // friendly outposts keep their roads open: nothing of theirs stands on a road or beside it
  for (const o of [sites.start, ...sites.outposts]) {
    for (let dz = -13; dz <= 13; dz++) for (let dx = -13; dx <= 13; dx++) {
      const x = o.x + dx, z = o.z + dz; if (!inMap(x, z)) continue;
      let road = false;
      for (let b = -1; b <= 1 && !road; b++) for (let a = -1; a <= 1; a++) if (inMap(x + a, z + b) && world.road[x + a + N * (z + b)]) { road = true; break; }
      if (!road) continue;
      for (let y = hi[x + N * z]; y < VH; y++) setV(x, y, z, 0);
    }
  }
  recomputeAll();
}
/** The old raider wall across the road a short drive from the start, a rock beside it, the first patrol. */
function wgFirstWall(G) {
  const { S, sites } = G;
  // the old raider wall across the road, a short drive from the start
  const rm = sites.roadMain;
  if (rm.length > 30 && !S.final && !S.test) { // (not in the army's camp, nor on the test map)
    const iw = Math.min(rm.length - 8, Math.max(padR(sites.start) + 12, Math.floor(rm.length * 0.3))), ir = Math.floor(rm.length * 0.5), ip = Math.floor(rm.length * 0.72); // the wall stands past the start's pad
    const a = rm[iw], b = rm[iw + 4];
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const px = -dz / L, pz = dx / L;
    for (let s = -3; s <= 3; s++) { // across the road only: a tank can blast it or drive round over the shoulder
      const x = Math.round(a[0] + px * s), z = Math.round(a[1] + pz * s);
      const top = hAt(x, z);
      for (let y = top; y < top + 2 + (Math.abs(s) % 3 === 1 ? 1 : 0); y++) setV(x, y, z, (s + y) % 3 === 0 ? V.RAID : V.JUNK);
    }
    sites.firstWall = { x: a[0], z: a[1] };
    // a rock for the squad to hide behind, and a first patrol beyond it
    const r = rm[ir], q = rm[ip];
    rockOutcrop(Math.round(r[0] + px * 7), Math.round(r[1] + pz * 7), 3, 3);
    sites.patrols.push({ x: q[0] + px * 3, z: q[1] + pz * 3, n: 3, tier: 1, first: true });
    recomputeAll();
  }
}
/** The layout's buildings (biomes.js), the settlement, rocks, wrecks, trees, the map rules and the smoothed ground. */
function wgScatter(G) {
  const { P, S, N, WL, ns, sites, placed } = G;
  // Ruins, rocks and wrecks scattered where nothing else stands.
  const freeSpot = (minSite, flatMax) => {
    for (let tries = 0; tries < 80; tries++) {
      const x = 6 + Math.floor(rng() * (N - 12)), z = 6 + Math.floor(rng() * (N - 12));
      const h = hAt(x, z); if (h < WL + 1) continue;
      let bad = false;
      for (const s of placed) if (Math.hypot(s.x - x, s.z - z) < minSite) { bad = true; break; }
      if (bad) continue;
      let maxd = 0, nearRoad = false;
      for (let dz = -3; dz <= 8; dz++) for (let dx = -3; dx <= 8; dx++) {
        if (!inMap(x + dx, z + dz)) { bad = true; continue; }
        if (dx <= 3 && dz <= 3) maxd = Math.max(maxd, Math.abs(hAt(x + dx, z + dz) - h));
        if (world.road[x + dx + N * (z + dz)]) nearRoad = true;
      }
      if (bad || nearRoad || maxd > flatMax) continue;
      return { x, z, h };
    }
    return null;
  };
  buildLayout(sites, placed, freeSpot, P, ns); // biomes.js: farms, villages, the city, petrol stations, huts, ruins
  recomputeAll();
  for (let k = 0; k < P.rocks; k++) {
    const s = freeSpot(14, 3); if (!s) continue;
    rockOutcrop(s.x + 2, s.z + 2, 2.5 + rng() * 2.5, 2 + Math.floor(rng() * 3));
    recomputeAll();
  }
  for (let k = 0; k < (S.wrecks ?? 9); k++) {
    const s = freeSpot(16, 2); if (!s) continue;
    buildWreck(s); sites.wrecks.push({ x: s.x + 1, z: s.z + 1, value: tune.scrap_wreck, taken: false });
  }
  recomputeAll();
  plantTrees(placed, ns);
  recomputeAll();
  applyMapRules(sites);
  updateGround(0, 0, N - 1, N - 1);
}
/** The roaming patrols, away from the start. */
function wgPatrols(G) {
  const { S, N, sites } = G;
  // roaming patrols, away from the start
  for (let k = 0; k < Math.round(tune.patrol_count * (S.patrolK ?? 1)); k++) {
    for (let tries = 0; tries < 40; tries++) {
      const x = 10 + rng() * (N - 20), z = 10 + rng() * (N - 20);
      if (Math.hypot(x - sites.start.x, z - sites.start.z) < 50) continue;
      if (!walkable(Math.floor(x), Math.floor(z)) || shallow(x, z)) continue;
      const d = Math.hypot(x - sites.start.x, z - sites.start.z) / (N * 1.2);
      sites.patrols.push({ x, z, n: 2 + Math.floor(rng() * 3), tier: 1 + Math.min(2, Math.floor(d * 3)) });
      break;
    }
  }
}
registerWorldStep('frame', { order: 10, run: wgFrame });
registerWorldStep('water', { order: 20, run: wgWater });
registerWorldStep('relief', { order: 30, run: wgRelief });
registerWorldStep('sites', { order: 40, run: wgSites });
registerWorldStep('roads', { order: 50, run: wgRoads });
registerWorldStep('slopes', { order: 55, run: wgSlopes });
registerWorldStep('columns', { order: 60, run: wgColumns });
registerWorldStep('structures', { order: 70, run: wgStructures });
registerWorldStep('firstWall', { order: 80, run: wgFirstWall });
registerWorldStep('scatter', { order: 90, run: wgScatter });
registerWorldStep('patrols', { order: 100, run: wgPatrols });

/**
 * Woods and forests: trunks two voxels tall (TREE) on open grass and dirt, thick where the forest
 * noise is high, a few lone trees elsewhere. Never on roads, water, slopes or near a site.
 * A tank crushes them (soft kind), shells blow them down, infantry hides behind them.
 */
function plantTrees(placed, ns) {
  const N = world.N, WL = world.WL;
  for (let z = 2; z < N - 2; z++) for (let x = 2; x < N - 2; x++) {
    const i = x + N * z, h = world.hmap[i];
    if (h < WL + 1) continue;
    const t = world.vox[vi(x, h - 1, z)]; if (t !== V.SAND && t !== V.DIRT && t !== V.ROCK && t !== V.RED) continue;
    if (world.bld[i] || world.keep[i]) continue; // never inside a building, a yard or a settlement
    let bad = false;
    for (let dz = -2; dz <= 2 && !bad; dz++) for (let dx = -2; dx <= 2; dx++) {
      const j = x + dx + N * (z + dz);
      if (world.road[j] || (Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && Math.abs(world.hmap[j] - h) > 1)) { bad = true; break; }
      if (Math.abs(dx) <= 1 && Math.abs(dz) <= 1 && (dx || dz) && world.vox[vi(x + dx, world.hmap[j], z + dz)] === V.TREE) { bad = true; break; }
    }
    if (bad) continue;
    for (const s of placed) { const r = s.kind === 'fortress' ? 24 : 16; if ((s.x - x) * (s.x - x) + (s.z - z) * (s.z - z) < r * r) { bad = true; break; } }
    if (bad) continue;
    const f = fbm(x / 26, z / 26, ns + 21, 3);
    const fa = world.preset ? world.preset.forest : tune.forest_amount;
    const forest = smooth(0.62 - fa * 0.22, 0.66 - fa * 0.22, f);
    const p = forest * tune.forest_density + tune.tree_scatter;
    if (hash2(x, z, ns + 23) >= p) continue;
    put(x, h, z, V.TREE); put(x, h + 1, z, V.TREE);
  }
}
// ---- The smoothed relief (what the tank drives on, what the terrain shows) --------------------------
/** Height of the natural ground in column (x,z): ground voxels stacked from the bottom. */
function groundOf(x, z) {
  const base = VH * (x + world.N * z);
  let y = 0; while (y < VH && GROUNDV.has(world.vox[base + y])) y++;
  return y;
}
/**
 * The height of one corner of a column's top (cx, cz in 0..1): the mean of the columns that share that corner
 * and are not a cliff away from this one (map_cliff). A step of 1 becomes a slope, a cliff stays a wall.
 * h(x, z) gives a column's height. The drawn ground (view.js) and the ridden ground (world.cor) both use it.
 */
function cornerOf(h, x, z, c, cx, cz) {
  let s = 0, n = 0;
  for (let b = cz - 1; b <= cz; b++) for (let a = cx - 1; a <= cx; a++) { const v = h(x + a, z + b); if (Math.abs(v - c) < tune.map_cliff) { s += v; n++; } }
  return s / n;
}
/**
 * Recomputes, for the box plus a margin, the ground heights (world.groundRaw: natural ground, or a bridge deck),
 * the four corner heights of each column's top (world.cor: the surface the ground is drawn and ridden as)
 * and the column's mean height (world.gsm).
 */
function updateGround(x0, z0, x1, z1) {
  const N = world.N, R = world.groundRaw, S = world.gsm, K = world.cor;
  const cl = v => v < 0 ? 0 : v >= N ? N - 1 : v;
  for (let z = cl(z0 - 2); z <= cl(z1 + 2); z++) for (let x = cl(x0 - 2); x <= cl(x1 + 2); x++) {
    const i = x + N * z; // a bridge deck is ridden like ground (map rule M9)
    R[i] = world.road[i] === 2 ? Math.max(groundOf(x, z), world.hmap[i]) : groundOf(x, z);
  }
  const at = (x, z) => R[cl(x) + N * cl(z)];
  for (let z = cl(z0 - 1); z <= cl(z1 + 1); z++) for (let x = cl(x0 - 1); x <= cl(x1 + 1); x++) {
    const i = x + N * z, c = R[i], k = i * 4;
    K[k] = cornerOf(at, x, z, c, 0, 0); K[k + 1] = cornerOf(at, x, z, c, 1, 0); K[k + 2] = cornerOf(at, x, z, c, 0, 1); K[k + 3] = cornerOf(at, x, z, c, 1, 1);
    S[i] = (K[k] + K[k + 1] + K[k + 2] + K[k + 3]) / 4;
  }
}
/** The ground height at a point: the column's top, bilinear between its four corners (as drawn: ramps slope, cliffs are walls). */
function smoothH(x, z) {
  const N = world.N, ix = Math.floor(x), iz = Math.floor(z);
  const i = (ix < 0 ? 0 : ix >= N ? N - 1 : ix) + N * (iz < 0 ? 0 : iz >= N ? N - 1 : iz), K = world.cor, k = i * 4;
  const fx = Math.min(1, Math.max(0, x - ix)), fz = Math.min(1, Math.max(0, z - iz));
  return (K[k] + (K[k + 1] - K[k]) * fx) * (1 - fz) + (K[k + 2] + (K[k + 3] - K[k + 2]) * fx) * fz;
}
function recomputeAll() { for (let z = 0; z < world.N; z++) for (let x = 0; x < world.N; x++) recomputeColumn(x, z); world.mapDirty = true; }

/** A* across the raw heights for a road: gentle slopes cheap, water costly (it gets a bridge). */
function roadAStar(hi, N, WL, a, b) {
  const sx = a.x, sz = a.z, tx = b.x, tz = b.z;
  const g = new Float32Array(N * N).fill(1e9), from = new Int32Array(N * N).fill(-1), closed = new Uint8Array(N * N);
  const heap = new MinHeap();
  const s = sx + N * sz; g[s] = 0; heap.push(s, 0);
  const goal = tx + N * tz;
  let found = false, it = 0;
  while (heap.size && it++ < 80000) {
    const c = heap.pop(); if (closed[c]) continue; closed[c] = 1;
    if (c === goal) { found = true; break; }
    const cx = c % N, cz = (c / N) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz; if (nx < 2 || nz < 2 || nx >= N - 2 || nz >= N - 2) continue;
      const n = nx + N * nz; if (closed[n]) continue;
      const dh = Math.abs(hi[n] - hi[c]);
      let cost = (dx && dz ? 1.414 : 1) + dh * dh * 2.5;
      if (hi[n] < WL) cost += 6;
      if (world.road[n]) cost *= 0.5;
      const ng = g[c] + cost;
      if (ng < g[n]) { g[n] = ng; from[n] = c; heap.push(n, ng + Math.hypot(tx - nx, tz - nz) * 1.1); }
    }
  }
  if (!found) return null;
  const path = []; let c = goal;
  while (c !== -1) { path.push([c % N, (c / N) | 0]); c = from[c]; }
  return path.reverse();
}

/** Carves a road into the heights: smoothed, slope-limited, bridged over water. */
function carveRoad(hi, N, WL, path) {
  const n = path.length, th = new Float32Array(n);
  for (let i = 0; i < n; i++) th[i] = hi[path[i][0] + N * path[i][1]];
  const sm = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0, c = 0; for (let k = -3; k <= 3; k++) { const j = i + k; if (j >= 0 && j < n) { s += th[j]; c++; } } sm[i] = Math.max(WL, s / c); }
  const gr = 1 / Math.max(1, tune.ramp_run); // a road climbs no steeper than a ramp (M1)
  for (let i = 1; i < n; i++) { sm[i] = Math.min(sm[i], sm[i - 1] + gr); sm[i] = Math.max(sm[i], sm[i - 1] - gr); }
  for (let i = n - 2; i >= 0; i--) { sm[i] = Math.min(sm[i], sm[i + 1] + gr); sm[i] = Math.max(sm[i], sm[i + 1] - gr); }
  for (let i = 0; i < n; i++) {
    const [x, z] = path[i], h = Math.max(WL, Math.round(sm[i]));
    const RW = Math.round(tune.road_half_width);
    for (let dz = -RW; dz <= RW; dz++) for (let dx = -RW; dx <= RW; dx++) {
      const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= N || zz >= N) continue;
      const j = xx + N * zz, was = hi[j];
      hi[j] = h;
      if (was < WL || world.road[j] === 2) world.road[j] = 2; else if (!world.road[j]) world.road[j] = 1;
    }
    // shoulders: 1-voxel steps a tank climbs, so the road is never a trench or a causeway
    const SW = RW + Math.round(tune.road_shoulder);
    for (let dz = -SW; dz <= SW; dz++) for (let dx = -SW; dx <= SW; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dz)); if (d <= RW) continue;
      const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= N || zz >= N) continue;
      const j = xx + N * zz; if (world.road[j]) continue;
      const lim = d - RW;
      if (hi[j] > h + lim) hi[j] = h + lim;
      if (hi[j] < h - lim && hi[j] >= WL) hi[j] = Math.max(WL, h - lim);
    }
  }
}

/** Half-size of a site's flat pad (map rule M9): an outpost's holds its wall and its tool shed. */
function padR(s) { return s.kind === 'fortress' ? 17 : s.kind === 'camp' ? 9 : s.kind === 'exit' ? 11 : 17; }
/**
 * Map rule M4b: along the roads no step is higher than 1, so roads that cross or run side by side at
 * different heights meet in ramps, never cliffs. A site's flat pad is never cut: its height reaches
 * along the road as a floor (the road climbs to meet it); road steps are then only cut down, and the
 * 3 cells of shoulder either side are fitted ring by ring within 1 of the cells nearer the road.
 */
function relaxRoads(hi, N, placed) {
  const pad = new Uint8Array(N * N), near = new Uint8Array(N * N).fill(255), q = [];
  for (const s of placed) {
    const r = padR(s);
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (inMap(s.x + dx, s.z + dz)) pad[s.x + dx + N * (s.z + dz)] = 1;
  }
  for (let i = 0; i < N * N; i++) if (world.road[i]) { near[i] = 0; q.push(i); }
  for (let k = 0; k < q.length; k++) {
    const i = q[k], x = i % N, z = (i / N) | 0; if (near[i] >= 3) continue;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + a, zz = z + b; if (!inMap(xx, zz)) continue; const j = xx + N * zz; if (near[j] === 255) { near[j] = near[i] + 1; q.push(j); } }
  }
  const nb = i => { const x = i % N, z = (i / N) | 0, o = []; if (x > 0) o.push(i - 1); if (x < N - 1) o.push(i + 1); if (z > 0) o.push(i - N); if (z < N - 1) o.push(i + N); return o; };
  const road = [], LB = new Int16Array(N * N);
  for (let i = 0; i < N * N; i++) if (near[i] === 0) road.push(i);
  // 1. a pad's height reaches along the road as a floor that drops 1 a cell (the road climbs to meet it)
  for (const i of road) LB[i] = pad[i] ? hi[i] : 0;
  for (let pass = 0, ch = 1; pass < 200 && ch; pass++) {
    ch = 0;
    for (const i of road) for (const j of nb(i)) if (near[j] === 0 && !pad[j] && LB[i] - 1 > LB[j]) { LB[j] = LB[i] - 1; ch++; }
  }
  for (const i of road) if (!pad[i] && hi[i] < LB[i]) hi[i] = LB[i];
  // 2. every road step above 1 is cut down (never below that floor): monotone, so it settles
  for (let pass = 0, ch = 1; pass < 200 && ch; pass++) {
    ch = 0;
    for (const i of road) for (const j of nb(i)) {
      if (near[j] !== 0 || pad[j] || hi[j] - hi[i] <= 1) continue;
      const v = Math.max(hi[i] + 1, LB[j]); if (v < hi[j]) { hi[j] = v; ch++; }
    }
  }
  // 3. the shoulders, ring by ring outward, keep within 1 of every cell nearer the road
  for (let r = 1; r <= 3; r++) for (let i = 0; i < N * N; i++) {
    if (near[i] !== r || pad[i]) continue;
    let mn = 1e9, mx = -1e9;
    for (const j of nb(i)) if (near[j] === r - 1) { mn = Math.min(mn, hi[j]); mx = Math.max(mx, hi[j]); }
    let v = hi[i]; if (v > mn + 1) v = mn + 1; if (v < mx - 1) v = mx - 1; hi[i] = v;
  }
}

/** Binary min-heap of integer ids by priority. */
class MinHeap {
  constructor() { this.ids = []; this.pr = []; this.size = 0; }
  push(id, p) {
    let i = this.size++; this.ids[i] = id; this.pr[i] = p;
    while (i > 0) { const q = (i - 1) >> 1; if (this.pr[q] <= this.pr[i]) break; this.swap(i, q); i = q; }
  }
  pop() {
    const top = this.ids[0]; this.size--;
    if (this.size > 0) {
      this.ids[0] = this.ids[this.size]; this.pr[0] = this.pr[this.size];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.size && this.pr[l] < this.pr[m]) m = l;
        if (r < this.size && this.pr[r] < this.pr[m]) m = r;
        if (m === i) break; this.swap(i, m); i = m;
      }
    }
    return top;
  }
  swap(a, b) { const t = this.ids[a]; this.ids[a] = this.ids[b]; this.ids[b] = t; const u = this.pr[a]; this.pr[a] = this.pr[b]; this.pr[b] = u; }
}

// ---- Structure builders (write voxels on top of the ground) ---------------------------------
function colTop(x, z) { // ground height straight from the voxels
  if (!inMap(x, z)) return 0;
  const base = VH * (x + world.N * z);
  for (let y = VH - 1; y >= 0; y--) if (world.vox[base + y]) return y + 1;
  return 0;
}
function put(x, y, z, t) { if (y >= 1 && y < VH && inMap(x, z)) world.vox[vi(x, y, z)] = t; }
function boxShell(x0, z0, w, d, y0, h, wallT, roofT, door) {
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
    const edge = dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1;
    for (let y = 0; y < h; y++) {
      if (edge) {
        if (door && door(dx, dz, y)) continue;
        put(x0 + dx, y0 + y, z0 + dz, wallT);
      }
    }
    if (roofT) put(x0 + dx, y0 + h, z0 + dz, roofT);
  }
  let door0 = null;
  if (door) for (let dz = 0; dz < d && !door0; dz++) for (let dx = 0; dx < w; dx++) {
    if ((dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1) && door(dx, dz, 0)) { door0 = { dx, dz }; break; }
  }
  if (door0) registerBuilding(x0, z0, w, d, y0, h, door0.dx, door0.dz);
}
/**
 * A building soldiers can enter (map rule M10): its footprint, floor, wall height, door and the
 * places inside. Registered by whatever builds it; world.bld maps each footprint cell to it.
 */
function registerBuilding(x0, z0, w, d, g, h, ddx, ddz) {
  if (w < 3 || d < 3) return null;
  const N = world.N, id = world.buildings.length;
  const nx = ddx === 0 ? -1 : ddx === w - 1 ? 1 : 0, nz = nx ? 0 : ddz === 0 ? -1 : 1;
  const slots = [];
  for (let dz = 1; dz < d - 1; dz++) for (let dx = 1; dx < w - 1; dx++) slots.push({ x: x0 + dx + 0.5, z: z0 + dz + 0.5 });
  const b = { id, x0, z0, w, d, g, h, slots, cap: Math.min(tune.garrison_cap, slots.length), occ: [], ruined: false,
    door: { x: x0 + ddx + 0.5, z: z0 + ddz + 0.5 }, out: { x: x0 + ddx + 0.5 + nx * 1.6, z: z0 + ddz + 0.5 + nz * 1.6 }, walls0: 0 };
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) if (inMap(x0 + dx, z0 + dz)) world.bld[x0 + dx + N * (z0 + dz)] = id + 1;
  world.buildings.push(b);
  return b;
}
/** The standing wall voxels of a building (its integrity, against walls0). */
function buildingWalls(b) {
  let n = 0;
  for (let dz = 0; dz < b.d; dz++) for (let dx = 0; dx < b.w; dx++) {
    if (dx && dz && dx < b.w - 1 && dz < b.d - 1) continue;
    const x = b.x0 + dx, z = b.z0 + dz; if (!inMap(x, z)) continue;
    const base = VH * (x + world.N * z);
    for (let y = b.g; y < b.g + b.h && y < VH; y++) if (world.vox[base + y] && !GROUNDV.has(world.vox[base + y])) n++;
  }
  return n;
}
/** The building whose footprint holds (x,z), or null. */
function buildingAt(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z); if (!inMap(ix, iz)) return null;
  const k = world.bld[ix + world.N * iz]; return k ? world.buildings[k - 1] : null;
}
/**
 * The Horde's fortress: four ruined blocks of flats round its yard, their doors to the yard, the gate side the
 * one toward the start (f.gateDir). The old walls and towers went with the fine-grid structures (iteration 38).
 */
function buildFortress(f) {
  const g = f.g;
  const st = world.sitesStart || { x: 22, z: 22 };
  const sdx = Math.abs(st.x - f.x) >= Math.abs(st.z - f.z) ? Math.sign(st.x - f.x) : 0;
  const sdz = sdx ? 0 : Math.sign(st.z - f.z);
  f.towers = [];
  for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const w = 7, d = 7, x0 = ax < 0 ? f.x - 13 : f.x + 6, z0 = az < 0 ? f.z - 13 : f.z + 6;
    levelGround(x0, z0, w, d, g, 1); recomputeArea(x0 - 2, z0 - 2, w + 4, d + 4);
    buildHouse(x0, z0, w, d, g, { wall: V.CONC, corner: V.CONC, floors: 3, face: [-ax, -az], ruin: 0.35 + rng() * 0.25 });
    f.towers.push({ x: x0 + w / 2, z: z0 + d / 2 });
  }
  f.gateDir = { x: sdx, z: sdz };
}
function buildRuin(s) {
  const kind = rng();
  const t = rng() < 0.55 ? V.CONC : V.RUST, ns = Math.floor(rng() * 9999);
  if (kind < 0.65) { // a ruined house on the fine grid (js/structs.js), its door on the side facing the flattest ground
    const w = 4 + Math.floor(rng() * 4), d = 4 + Math.floor(rng() * 4);
    const sides = [[0, -1, Math.floor(w / 2), -1], [0, 1, Math.floor(w / 2), d], [-1, 0, -1, Math.floor(d / 2)], [1, 0, w, Math.floor(d / 2)]];
    let face = [0, 1], bd = 1e9;
    for (const [fx, fz, ox, oz] of sides) { if (!inMap(s.x + ox, s.z + oz)) continue; const dh = Math.abs(colTop(s.x + ox, s.z + oz) - s.h) + rng() * 0.5; if (dh < bd) { bd = dh; face = [fx, fz]; } }
    levelGround(s.x, s.z, w, d, s.h, 0); recomputeArea(s.x - 1, s.z - 1, w + 2, d + 2);
    buildHouse(s.x, s.z, w, d, s.h, { wall: t === V.CONC ? V.CONC : V.BRICK, floors: rng() < 0.3 ? 2 : 1, face, ruin: 0.7 + rng() * 0.3 });
  } else {
    const len = 5 + Math.floor(rng() * 7), h = 2 + Math.floor(rng() * 2), ax = rng() < 0.5;
    for (let k = 0; k < len; k++) {
      const x = s.x + (ax ? k : 0), z = s.z + (ax ? 0 : k), g = colTop(x, z);
      for (let y = 0; y < h - (k % 4 === 3 ? 1 : 0); y++) put(x, g + y, z, t);
    }
  }
}
/** A rock outcrop (natural ground): a rounded block with cliff sides, at least map_cliff + 1 tall: cover for infantry, an obstacle a tank drives round. */
function rockOutcrop(x0, z0, r, h) {
  const ns = Math.floor(rng() * 9999), R = Math.ceil(r) + 1;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const x = x0 + dx, z = z0 + dz; if (!inMap(x, z)) continue;
    const d = Math.hypot(dx, dz) / (r * (0.85 + vnoise(x * 0.5, z * 0.5, ns) * 0.3));
    if (d >= 1) continue;
    const g = colTop(x, z), top = Math.max(tune.map_cliff + 1, h); // a rock is a flat-topped block with cliff sides (M1): never a 1-2 m ledge
    for (let y = 0; y < top; y++) put(x, g + y, z, ((g + y) % 4 < 2) ? V.RED : V.ROCK);
  }
}
/**
 * The map rules applied after everything is placed (the brief's Map rules):
 * M4 a road and 2 cells either side hold nothing built or grown (bridges and the first raider wall excepted);
 * M5 no natural spike: a column more than 3 voxels above all four neighbours comes down to 1 above the highest;
 * M1 bare ground keeps no ledge and no 1-cell pit after everything is built.
 */
function applyMapRules(sites) {
  const N = world.N, keep = sites.firstWall;
  const pads = [sites.start, ...sites.outposts, ...sites.camps, sites.fortress].map(o => ({ x: o.x, z: o.z, r: padR(o) + 2 }));
  const near = new Uint8Array(N * N);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (world.road[x + N * z] === 1) {
    for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (inMap(x + a, z + b)) near[x + a + N * (z + b)] = 1;
  }
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = x + N * z; if (!near[i] || world.road[i] === 2) continue;
    if (keep && Math.hypot(x - keep.x, z - keep.z) < 6) continue;
    if (pads.some(o => Math.hypot(x - o.x, z - o.z) < o.r)) continue; // a site keeps its own layout
    const base = VH * i;
    let g = 0; while (g < VH && GROUNDV.has(world.vox[base + g])) g++;
    for (let y = g; y < VH; y++) world.vox[base + y] = 0;
  }
  for (const b of world.buildings) { // M10: a doorway and the floor inside stay clear (trees, junk)
    const clear = (x, z, below) => { if (!inMap(x, z)) return; const base = VH * (x + N * z); for (let y = b.g; y < Math.min(VH, below); y++) if (!GROUNDV.has(world.vox[base + y])) world.vox[base + y] = 0; };
    clear(Math.floor(b.out.x), Math.floor(b.out.z), VH);
    for (let dz = 1; dz < b.d - 1; dz++) for (let dx = 1; dx < b.w - 1; dx++) clear(b.x0 + dx, b.z0 + dz, b.g + b.h - 1);
  }
  recomputeAll();
  for (const b of world.buildings) b.walls0 = Math.max(1, buildingWalls(b));
  for (let pass = 0; pass < 2; pass++) for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    const i = x + N * z, h = world.hmap[i]; if (!natTop(i)) continue;
    const m = Math.max(world.hmap[i - 1], world.hmap[i + 1], world.hmap[i - N], world.hmap[i + N]);
    if (h - m > 3) { for (let y = m + 1; y < h; y++) world.vox[VH * i + y] = 0; recomputeColumn(x, z); }
  }
  // M1 again, after the buildings, rocks and wrecks: bare ground keeps no ledge (a step of 2 up to map_cliff - 1)
  // and no 1-cell pit; the higher bare column comes down to 1 above its neighbour, a pit fills with dirt
  const C = tune.map_cliff, bare = i => natTop(i) && !world.bld[i] && world.road[i] !== 2 && world.hmap[i] === groundOf(i % N, (i / N) | 0);
  for (let pass = 0; pass < 10; pass++) {
    let ch = 0;
    for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
      const i = x + N * z; if (!bare(i)) continue;
      const h = world.hmap[i], n4 = [i - 1, i + 1, i - N, i + N];
      let lo = 99, cut = h;
      for (const j of n4) { const g = world.hmap[j]; lo = Math.min(lo, g); if (natTop(j) && h - g >= 2 && h - g < C) cut = Math.min(cut, g + 1); }
      if (h < lo && h >= world.WL) { for (let y = h; y < lo; y++) world.vox[VH * i + y] = V.DIRT; recomputeColumn(x, z); ch++; continue; }
      if (cut < h) { for (let y = cut; y < h; y++) world.vox[VH * i + y] = 0; world.vox[VH * i + cut - 1] = world.vox[VH * i + cut - 1] || V.DIRT; recomputeColumn(x, z); ch++; }
    }
    if (!ch) break;
  }
}
/**
 * Checks the map against the rules and reports observations (no verdict): sites the tank reaches from
 * the start over the smoothed relief, the share of dry land it reaches, spikes left, built voxels on roads.
 */
function mapReport() {
  const N = world.N, WL = world.WL, grade = tune.map_max_grade;
  const ok = new Uint8Array(N * N), rh = new Float32Array(N * N);
  const pads = [world.sites.start, ...world.sites.outposts, ...world.sites.camps, world.sites.fortress];
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const i = x + N * z;
    rh[i] = world.road[i] === 2 ? world.hmap[i] : world.gsm[i]; // a bridge deck is ridden on
    if (world.hmap[i] < WL - 1 && world.road[i] !== 2) continue; // deep water
    const built = world.hmap[i] - world.groundRaw[i];
    if (world.road[i] !== 2 && built > 1 && !SOFTV.has(world.vox[VH * i + world.hmap[i] - 1])) continue; // a wall
    ok[i] = 1;
  }
  const seen = new Uint8Array(N * N), s = world.sites.start, q = [s.x + N * s.z]; seen[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % N, z = (i / N) | 0;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + a, zz = z + b; if (!inMap(xx, zz)) continue;
      const j = xx + N * zz; if (seen[j] || !ok[j] || Math.abs(rh[j] - rh[i]) > grade) continue;
      seen[j] = 1; q.push(j);
    }
  }
  const reach = site => { for (let b = -4; b <= 4; b++) for (let a = -4; a <= 4; a++) if (inMap(site.x + a, site.z + b) && seen[site.x + a + N * (site.z + b)]) return true; return false; };
  const f = world.sites.fortress, gate = { x: f.x + (f.gateDir ? f.gateDir.x : 0) * 19, z: f.z + (f.gateDir ? f.gateDir.z : 0) * 19, name: f.name }; // the gate is shot open: its outside must be reachable
  const all = [...world.sites.camps, ...world.sites.outposts, gate];
  let dry = 0, got = 0, spikes = 0, roadside = 0;
  for (let i = 0; i < N * N; i++) if (world.hmap[i] >= WL) { dry++; if (seen[i]) got++; }
  for (let z = 1; z < N - 1; z++) for (let x = 1; x < N - 1; x++) {
    const i = x + N * z; if (natTop(i) && world.hmap[i] - Math.max(world.hmap[i - 1], world.hmap[i + 1], world.hmap[i - N], world.hmap[i + N]) > 3) spikes++;
    const fw = world.sites.firstWall;
    if (world.road[i] === 1 && world.hmap[i] > world.groundRaw[i] && !(fw && Math.hypot(x - fw.x, z - fw.z) < 6) && !pads.some(o => Math.hypot(x - o.x, z - o.z) < padR(o) + 2)) roadside++;
  }
  return { sites: all.length, unreachable: all.filter(s => !reach(s)).map(s => s.name), reachLand: +(got / Math.max(1, dry)).toFixed(2), spikes, builtOnRoad: roadside };
}
function rockPillar(x0, z0, r, h) {
  const ns = Math.floor(rng() * 9999);
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const x = x0 + dx, z = z0 + dz; if (!inMap(x, z)) continue;
    const g = colTop(x, z);
    for (let y = 0; y < h; y++) {
      const rr = r * (1 - y / h * 0.45) + (vnoise(x * 0.9, y * 0.7 + z, ns) - 0.5) * 1.2;
      if (dx * dx + dz * dz <= rr * rr) put(x, g + y, z, ((g + y) % 4 < 2) ? V.RED : V.ROCK);
    }
  }
}
function rockArch(x0, z0) {
  const ax = rng() < 0.5, span = 6;
  const g = colTop(x0, z0), h = 6 + Math.floor(rng() * 3);
  for (const k of [0, span]) {
    const x = x0 + (ax ? k : 0), z = z0 + (ax ? 0 : k);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const gg = colTop(x + dx, z + dz); for (let y = gg; y < g + h; y++) put(x + dx, y, z + dz, (y % 4 < 2) ? V.RED : V.ROCK); }
  }
  for (let k = -1; k <= span + 1; k++) for (let w = -1; w <= 1; w++) for (let y = 0; y < 2; y++) {
    const x = x0 + (ax ? k : w), z = z0 + (ax ? w : k); put(x, g + h + y - (k === -1 || k === span + 1 ? 1 : 0), z, (y + k) % 3 ? V.RED : V.ROCK);
  }
}
function buildWreck(s) { fineCar(s.x, s.z, s.h, rng() < 0.5, V.RUST); } // a rusted car hulk on the fine grid (js/structs.js): scrap to pick up

// ---- Rays, sight and blasts -------------------------------------------------------------------
/** Steps a ray through the voxels. Returns {x,y,z,t} of the first solid voxel, or null. */
function rayVoxel(ox, oy, oz, dx, dy, dz, maxT) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(1 / dx) : 1e9, tdy = dy ? Math.abs(1 / dy) : 1e9, tdz = dz ? Math.abs(1 / dz) : 1e9;
  let tx = dx ? ((dx > 0 ? x + 1 - ox : ox - x) * tdx) : 1e9;
  let ty = dy ? ((dy > 0 ? y + 1 - oy : oy - y) * tdy) : 1e9;
  let tz = dz ? ((dz > 0 ? z + 1 - oz : oz - z) * tdz) : 1e9;
  let t = 0;
  for (let i = 0; i < 3000 && t <= maxT; i++) {
    if (y < 0) return { x, y: 0, z, t };
    if (y < VH && inMap(x, z)) {
      const k = vi(x, y, z);
      if (world.fmark && world.fmark[k]) { const f = structRayT(ox, oy, oz, dx, dy, dz, t, Math.min(tx, ty, tz, maxT)); if (f >= 0) return { x, y, z, t: f }; } // a structure: its fine cells (windows, breaches)
      else if (world.vox[k]) return { x, y, z, t };
    }
    if (tx < ty && tx < tz) { x += sx; t = tx; tx += tdx; }
    else if (ty < tz) { y += sy; t = ty; ty += tdy; }
    else { z += sz; t = tz; tz += tdz; }
  }
  return null;
}
/** True when nothing solid lies between two points. */
function lineClear(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz), n = Math.ceil(L / 0.45);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidF(ax + dx * t, ay + dy * t, az + dz * t)) return false; }
  return true;
}
/**
 * Removes voxels in a sphere (harder kinds resist), then drops what is left hanging.
 * Returns the removed voxels as a flat array [x,y,z,kind, ...].
 */
function blastVoxels(cx, cy, cz, r) {
  const removed = [], R = Math.ceil(r);
  const x0 = Math.floor(cx) - R, x1 = Math.floor(cx) + R, z0 = Math.floor(cz) - R, z1 = Math.floor(cz) + R;
  for (let y = Math.max(1, Math.floor(cy) - R); y <= Math.min(VH - 1, Math.floor(cy) + R); y++)
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!inMap(x, z)) continue;
      const k = vi(x, y, z), t = world.vox[k]; if (!t || t === V.BED || world.fmark[k] === 1) continue; // a structure's cells: structBlast below
      const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy, ddz = z + 0.5 - cz;
      const rr = r * VHARD[t] * (0.85 + rng() * 0.3);
      if (ddx * ddx + ddy * ddy + ddz * ddz <= rr * rr) { world.vox[k] = 0; removed.push(x, y, z, t); markDirty(x, z); }
    }
  for (const v of structBlast(cx, cy, cz, r)) removed.push(v); // the structures on their fine grid (js/structs.js)
  // scorched ground around the blast (drawn darker, the grass burnt off)
  if (world.scorch) for (let z = z0 - 1; z <= z1 + 1; z++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (!inMap(x, z)) continue;
    const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz); if (d > r + 1.2) continue;
    const j = x + world.N * z; world.scorch[j] = Math.min(255, world.scorch[j] + Math.round(90 * (1 - d / (r + 1.2)) + 20)); markDirty(x, z);
  }
  if (removed.length) {
    collapse(Math.floor(cx), Math.floor(cz), R + 6, removed);
    for (let z = z0 - 6; z <= z1 + 6; z++) for (let x = x0 - 6; x <= x1 + 6; x++) if (inMap(x, z)) recomputeColumn(x, z);
    updateGround(x0 - 3, z0 - 3, x1 + 3, z1 + 3);
  }
  return removed;
}
/** Anything in the box no longer joined to the ground or the box's sides falls as debris. */
function collapse(cx, cz, rad, removed) {
  const x0 = Math.max(0, cx - rad), x1 = Math.min(world.N - 1, cx + rad), z0 = Math.max(0, cz - rad), z1 = Math.min(world.N - 1, cz + rad);
  const w = x1 - x0 + 1, d = z1 - z0 + 1, size = w * d * VH;
  const seen = new Uint8Array(size), q = new Int32Array(size);
  let qh = 0, qt = 0;
  const li = (x, y, z) => (x - x0) + w * ((z - z0) + d * y);
  const solid = (x, y, z) => world.vox[vi(x, y, z)] !== 0;
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) for (let y = 0; y < VH; y++) {
    const border = y === 0 || x === x0 || x === x1 || z === z0 || z === z1;
    if (border && solid(x, y, z)) { const l = li(x, y, z); if (!seen[l]) { seen[l] = 1; q[qt++] = l; } }
  }
  const nb = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
  while (qh < qt) {
    const l = q[qh++], x = x0 + (l % w), rest = (l / w) | 0, z = z0 + (rest % d), y = (rest / d) | 0;
    for (let k = 0; k < 18; k += 3) {
      const nx = x + nb[k], ny = y + nb[k + 1], nz = z + nb[k + 2];
      if (nx < x0 || nx > x1 || nz < z0 || nz > z1 || ny < 0 || ny >= VH) continue;
      const m = li(nx, ny, nz); if (seen[m] || !solid(nx, ny, nz)) continue;
      seen[m] = 1; q[qt++] = m;
    }
  }
  for (let y = 1; y < VH; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
    const k = vi(x, y, z);
    if (world.vox[k] && !seen[li(x, y, z)] && world.fmark[k] !== 1) { removed.push(x, y, z, world.vox[k]); world.vox[k] = 0; markDirty(x, z); }
  }
}

// ---- Paths and cover ----------------------------------------------------------------------------
const PF = { g: null, from: null, stamp: null, closed: null, cur: 0, N: 0, heap: new MinHeap() };
/**
 * A* over walkable cells; steps up or down more than maxStep are walls.
 * Returns waypoints [{x,z}] (cell centres) to the goal, or to the nearest reachable cell.
 */
/**
 * A* over the voxel columns from (sx,sz) to (tx,tz). A step may climb maxStep voxels and drop
 * maxDrop (soldiers jump down off a wall they cannot climb). Wall tops cost extra so nobody walks
 * along them. Returns the cells to walk, or the way to the nearest reachable cell.
 */
function findPath(sx, sz, tx, tz, maxStep = 1, maxNodes = 7000, maxDrop = maxStep, natStep = maxStep) {
  const N = world.N;
  if (PF.N !== N) { PF.N = N; PF.g = new Float32Array(N * N); PF.from = new Int32Array(N * N); PF.stamp = new Uint32Array(N * N); PF.closed = new Uint32Array(N * N); PF.cur = 0; }
  PF.cur++;
  const ax = Math.floor(sx), az = Math.floor(sz);
  // a goal off the map: the nearest point on its edge (not no way at all, which leaves a unit standing there)
  let bx = Math.max(1, Math.min(N - 2, Math.floor(tx))), bz = Math.max(1, Math.min(N - 2, Math.floor(tz)));
  if (!inMap(ax, az)) return [];
  if (!walkable(bx, bz) || perch(bx, bz)) { // nearest ground cell to the goal
    let best = null, bd = 1e9;
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) if (walkable(bx + dx, bz + dz) && !perch(bx + dx, bz + dz) && dx * dx + dz * dz < bd) { bd = dx * dx + dz * dz; best = [bx + dx, bz + dz]; }
    if (!best) return []; bx = best[0]; bz = best[1];
  }
  const H = PF.heap; H.size = 0;
  const s = ax + N * az, goal = bx + N * bz, hm = world.hmap;
  PF.stamp[s] = PF.cur; PF.g[s] = 0; PF.from[s] = -1; H.push(s, 0);
  let bestNode = s, bestH = 1e9, it = 0, found = false;
  while (H.size && it++ < maxNodes) {
    const c = H.pop(); if (PF.closed[c] === PF.cur) continue; PF.closed[c] = PF.cur;
    const cx = c % N, cz = (c / N) | 0;
    const hh = Math.abs(cx - bx) + Math.abs(cz - bz); if (hh < bestH) { bestH = hh; bestNode = c; }
    if (c === goal) { found = true; break; }
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz; if (!walkable(nx, nz)) continue;
      if (PF.avoid && PF.avoid(nx + 0.5, nz + 0.5)) continue;
      const n = nx + N * nz; if (PF.closed[n] === PF.cur) continue;
      const up = hm[n] - hm[c];
      // natural ground (both columns): a vehicle takes a taller step there, a wall stays a wall
      const lim = natStep > maxStep && natTop(n) && natTop(c) ? natStep : maxStep;
      if (up > lim || -up > Math.max(maxDrop, lim)) continue;
      if (natStep > maxStep && hardNear(nx, nz) && (Math.abs(nx - ax) > 2 || Math.abs(nz - az) > 2)) continue; // a vehicle keeps a cell clear of walls and posts
      if (dx && dz) { // no cutting corners
        const a = cx + dx + N * cz, b = cx + N * (cz + dz);
        if (!walkable(cx + dx, cz) || !walkable(cx, cz + dz) || Math.abs(hm[a] - hm[c]) > lim || Math.abs(hm[b] - hm[c]) > lim) continue;
      }
      let cost = dx && dz ? 1.414 : 1;
      if (hm[n] < world.WL) cost += 1.5;
      if (-up > maxStep) cost += 2; // a jump down: fine, not preferred
      if (perch(nx, nz)) cost += 6;
      const ng = PF.g[c] + cost;
      if (PF.stamp[n] !== PF.cur || ng < PF.g[n]) {
        PF.stamp[n] = PF.cur; PF.g[n] = ng; PF.from[n] = c;
        H.push(n, ng + Math.hypot(bx - nx, bz - nz));
      }
    }
  }
  const end = found ? goal : bestNode, out = [];
  let c = end;
  while (c !== -1 && c !== s) { out.push({ x: (c % N) + 0.5, z: ((c / N) | 0) + 0.5 }); c = PF.from[c]; }
  out.reverse();
  return out;
}
/** True when a taller column stands next to (x,z) on the side facing (fx,fz). */
function inCoverFrom(x, z, fx, fz) {
  const h = hAt(x, z), dx = fx - x, dz = fz - z, L = Math.hypot(dx, dz) || 1;
  const ux = dx / L, uz = dz / L;
  for (const a of [0, 0.7, -0.7]) {
    const c = Math.cos(a), s = Math.sin(a), rx = ux * c - uz * s, rz = ux * s + uz * c;
    if (coverQuality(Math.floor(x + rx * 1.1), Math.floor(z + rz * 1.1), h)) return true;
  }
  return false;
}
/**
 * How good the cover in the cell beside (x,z) is for someone standing at height h: 0 none, 1 light, 2 heavy.
 * Bare ground covers only as a wall: a step of map_cliff or more (a cliff, a terrace, a rock block); a ramp of
 * 1 m is open ground (map rule M1). Something built covers from 1 above the feet: soft things (sandbags, junk,
 * planks, trees) lightly, hard ones heavily.
 */
function coverQuality(x, z, h) {
  if (!inMap(x, z)) return 0;
  const i = x + world.N * z, nh = world.hmap[i], g = world.groundRaw[i];
  if (nh < h + 1 || nh > h + 8) return 0;
  if (nh <= g || world.road[i] === 2) return nh - h >= tune.map_cliff ? 2 : 0; // bare ground or a bridge deck
  return SOFTV.has(getV(x, nh - 1, z)) ? 1 : 2;
}
/**
 * Up to n cells near (tx,tz) with cover beside them (towards the threat when given), each with its
 * quality q (1 light, 2 heavy). Heavy cover and nearness win.
 */
function findCoverSpots(tx, tz, n, threat, radius = 5) {
  const out = [], cand = [];
  const cx = Math.floor(tx), cz = Math.floor(tz);
  for (let dz = -radius; dz <= radius; dz++) for (let dx = -radius; dx <= radius; dx++) {
    const x = cx + dx, z = cz + dz; if (!walkable(x, z) || shallow(x + 0.5, z + 0.5) || perch(x, z)) continue;
    const h = hAt(x, z); let q = 0;
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const cq = coverQuality(x + ox, z + oz, h); if (!cq) continue;
      if (threat) { const L = Math.hypot(ox, oz); if ((ox * threat.x + oz * threat.z) / L <= 0.3) continue; }
      q = Math.max(q, cq);
    }
    if (!q) continue;
    cand.push({ x: x + 0.5, z: z + 0.5, d: Math.hypot(dx, dz) - q * 0.8, q });
  }
  cand.sort((a, b) => a.d - b.d);
  for (const c of cand) {
    if (out.length >= n) break;
    if (out.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 1.4)) continue;
    out.push(c);
  }
  return out;
}
