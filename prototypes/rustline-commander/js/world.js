// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// The voxel world: storage, generation of one run's map, destruction, paths, sight and cover.
'use strict';

/** Voxel kinds. */
const V = { AIR: 0, BED: 1, SAND: 2, DIRT: 3, ROCK: 4, RED: 5, ROAD: 6, CONC: 7, RUST: 8, BAG: 9, JUNK: 10, WOOD: 11, GREEN: 12, RAID: 13, YEL: 14 };
/** Base colour of each kind (sRGB hex), the rust-desert palette. */
const VCOL = [0, 0x3b2b22, 0xd8a560, 0x9e6c47, 0x91624a, 0xb4573b, 0x7c6652, 0x9e968b, 0x8e4b27, 0xb99d6c, 0x5f5347, 0x7c5535, 0x56693a, 0xa62f28, 0xdab33d];
/** How hard each kind is to blow away (multiplies the blast radius). */
const VHARD = [0, 0, 1, 1, 0.55, 0.5, 0.95, 0.62, 0.78, 1.15, 1.15, 1.15, 0.78, 0.78, 0.78];
/** Soft kinds: chipped by bullets and crushed by tracks. */
const SOFTV = new Set([V.BAG, V.JUNK, V.WOOD]);
const VH = 40; // world height in voxels

/** The one world of the current run. */
const world = { N: 0, WL: 4, vox: null, hmap: null, road: null, dirty: new Set(), sites: null, gen: 0, mapDirty: true };

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
  d.add(cx + cz * 64);
  if ((x & 15) === 0 && cx > 0) d.add(cx - 1 + cz * 64);
  if ((x & 15) === 15) d.add(cx + 1 + cz * 64);
  if ((z & 15) === 0 && cz > 0) d.add(cx + (cz - 1) * 64);
  if ((z & 15) === 15) d.add(cx + (cz + 1) * 64);
  world.mapDirty = true;
}
function setV(x, y, z, t) {
  if (y < 0 || y >= VH || !inMap(x, z)) return;
  world.vox[vi(x, y, z)] = t; markDirty(x, z);
}
function solidF(x, y, z) { return getV(Math.floor(x), Math.floor(y), Math.floor(z)) !== V.AIR; }
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
function genWorld() {
  const N = Math.round(tune.map_size / 16) * 16, WL = Math.round(tune.water_level);
  world.N = N; world.WL = WL;
  world.vox = new Uint8Array(N * N * VH);
  world.hmap = new Uint8Array(N * N);
  world.road = new Uint8Array(N * N);
  world.dirty.clear(); world.gen++; world.mapDirty = true;
  const ns = Math.floor(rng() * 1e6);
  const flipX = rng() < 0.5, flipZ = rng() < 0.5;
  const real = (cx, cz) => ({ x: flipX ? N - 1 - cx : cx, z: flipZ ? N - 1 - cz : cz });

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
  const river = poly(-6, N * 0.92, N * 0.92, -6, 9, 8, ns + 3, 220);
  const mesa = poly(N * 0.3, N * 1.1, N * 1.1, N * 0.3, 5, 4, ns + 4, 160);
  const canyon = poly(N * 0.5, N * 0.5, N * 0.9, N * 0.9, 7, 7, ns + 5, 120);
  const distTo = (pts, x, z) => {
    let best = 1e9;
    for (let i = 0; i < pts.length; i++) { const dx = pts[i][0] - x, dz = pts[i][1] - z, d = dx * dx + dz * dz; if (d < best) best = d; }
    return Math.sqrt(best);
  };
  const lakes = [
    { x: N * (0.12 + rng() * 0.2), z: N * (0.6 + rng() * 0.2), r: 6 + rng() * 5 },
    { x: N * (0.6 + rng() * 0.2), z: N * (0.12 + rng() * 0.2), r: 6 + rng() * 5 },
  ];

  const Hf = new Float32Array(N * N);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const cx = flipX ? N - 1 - x : x, cz = flipZ ? N - 1 - z : z;
    let h = 6 + fbm(cx / 36, cz / 36, ns, 4) * 11;
    const rg = 1 - Math.abs(vnoise(cx / 20, cz / 20, ns + 7) * 2 - 1);
    const mask = smooth(0.52, 0.75, fbm(cx / 50, cz / 50, ns + 9, 3));
    h += mask * rg * rg * 20 * tune.mountain_amount;
    // the mesa band, cut by a canyon
    const dm = distTo(mesa, cx, cz);
    const raise = 9 * smooth(13, 9, dm);
    const dc = distTo(canyon, cx, cz);
    const cut = smooth(5.5, 3, dc);
    h += raise * (1 - cut);
    // the river valley
    const dr = distTo(river, cx, cz);
    if (dr < 10) h = Math.min(h, WL + 0.6 + (dr - 4) * 0.9);
    if (dr < 4.2) h = Math.min(h, WL - 1);
    if (dr < 2.6) h = Math.min(h, WL - 2.2);
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

  // Sites, in canonical space then mapped.
  const sites = { start: null, outposts: [], camps: [], fortress: null, wrecks: [], patrols: [], firstWall: null };
  const riverD = (cx, cz) => distTo(river, cx, cz);
  const okSpot = (cx, cz, avoid, minD) => {
    if (cx < 14 || cz < 14 || cx > N - 14 || cz > N - 14) return false;
    if (riverD(cx, cz) < 12) return false;
    for (const L of lakes) if (Math.hypot(cx - L.x, cz - L.z) < L.r + 10) return false;
    if (distTo(mesa, cx, cz) < 15) return false;
    for (const a of avoid) if (Math.hypot(cx - a.cx, cz - a.cz) < minD) return false;
    return true;
  };
  const placed = [];
  const place = (cx, cz, kind, extra) => { const r = real(Math.round(cx), Math.round(cz)); const s = Object.assign({ cx, cz, x: r.x, z: r.z, kind }, extra); placed.push(s); return s; };
  sites.start = place(22, 22, 'start');
  sites.fortress = place(N - 27, N - 27, 'fortress');
  // outposts along the way, one each side of the river
  for (const t of [0.3, 0.68]) {
    for (let tries = 0; tries < 200; tries++) {
      const off = (rng() - 0.5) * (60 + tries), along = (rng() - 0.5) * Math.min(40, tries * 0.3);
      const cx = N * t + off * 0.7 + along, cz = N * t - off * 0.7 + along;
      if (okSpot(cx, cz, placed, 26)) { sites.outposts.push(place(cx, cz, 'outpost')); break; }
    }
  }
  // camps, the first close to the start
  const want = Math.round(tune.camp_count);
  for (let tries = 0; tries < 600 && sites.camps.length < want; tries++) {
    let cx, cz;
    if (sites.camps.length === 0 && tries < 150) { const a = Math.PI / 4 + (rng() - 0.5) * 0.9, d = 54 + rng() * 8; cx = 22 + Math.cos(a) * d; cz = 22 + Math.sin(a) * d; }
    else { cx = 16 + rng() * (N - 32); cz = 16 + rng() * (N - 32); }
    if (Math.hypot(cx - 22, cz - 22) < 50) continue;
    if (Math.hypot(cx - (N - 27), cz - (N - 27)) < 30) continue;
    if (!okSpot(cx, cz, placed, 24)) continue;
    sites.camps.push(place(cx, cz, 'camp'));
  }
  sites.camps.sort((a, b) => Math.hypot(a.cx - 22, a.cz - 22) - Math.hypot(b.cx - 22, b.cz - 22));
  sites.camps.forEach((c, i) => { c.tier = 1 + Math.floor(i * 3 / Math.max(1, sites.camps.length)); c.name = 'Campo ' + 'ABCDEFGH'[i]; });
  sites.outposts.forEach((o, i) => { o.name = ['Avamposto Pozzo Secco', 'Avamposto Ferrovecchio'][i] || 'Avamposto'; });
  sites.start.name = 'Avamposto Base';
  sites.fortress.name = 'Fortezza del Capo';

  // flatten each site
  const flatten = (s, r) => {
    let sum = 0, n = 0;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = s.x + dx, z = s.z + dz; if (!inMap(x, z) || dx * dx + dz * dz > r * r) continue; sum += Hf[x + N * z]; n++;
    }
    const target = Math.max(WL + 2, Math.min(16, sum / Math.max(1, n)));
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

  const hi = new Int16Array(N * N);
  for (let i = 0; i < N * N; i++) hi[i] = Math.max(1, Math.min(VH - 12, Math.round(Hf[i])));

  // Roads: a chain from the start through every site to the fortress, carved and bridged.
  const chain = [sites.start, ...[...sites.camps, ...sites.outposts].sort((a, b) => Math.hypot(a.cx - 22, a.cz - 22) - Math.hypot(b.cx - 22, b.cz - 22)), sites.fortress];
  const roadPaths = [];
  for (let k = 0; k + 1 < chain.length; k++) {
    const p = roadAStar(hi, N, WL, chain[k], chain[k + 1]);
    if (p) { carveRoad(hi, N, WL, p); roadPaths.push(p); }
  }
  sites.roadMain = roadPaths[0] || [];
  // the sites keep their flat ground after the roads ran through
  for (const s of placed) {
    const r = s.kind === 'fortress' ? 17 : s.kind === 'camp' ? 8 : 10;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      const x = s.x + dx, z = s.z + dz; if (inMap(x, z)) { hi[x + N * z] = s.g; if (world.road[x + N * z] === 2) world.road[x + N * z] = 1; }
    }
  }

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

  // Structures.
  buildOutpost(sites.start, true);
  for (const o of sites.outposts) buildOutpost(o, false);
  for (const c of sites.camps) buildCamp(c);
  world.sitesStart = sites.start;
  buildFortress(sites.fortress);
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

  // the old raider wall across the road, a short drive from the start
  const rm = sites.roadMain;
  if (rm.length > 30) {
    const iw = Math.min(20, Math.floor(rm.length * 0.35)), ir = Math.floor(rm.length * 0.5), ip = Math.floor(rm.length * 0.72);
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
    rockPillar(Math.round(r[0] + px * 4), Math.round(r[1] + pz * 4), 1.6, 4);
    sites.patrols.push({ x: q[0] + px * 3, z: q[1] + pz * 3, n: 3, tier: 1, first: true });
    recomputeAll();
  }

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
  for (let k = 0; k < Math.round(tune.ruin_count); k++) { const s = freeSpot(18, 2); if (s) { buildRuin(s); recomputeAll(); } }
  for (let k = 0; k < Math.round(tune.rock_count); k++) {
    const s = freeSpot(14, 3); if (!s) continue;
    if (rng() < 0.25) rockArch(s.x, s.z); else rockPillar(s.x, s.z, 1.2 + rng() * 1.6, 5 + Math.floor(rng() * 8));
    recomputeAll();
  }
  for (let k = 0; k < 9; k++) {
    const s = freeSpot(16, 2); if (!s) continue;
    buildWreck(s); sites.wrecks.push({ x: s.x + 1, z: s.z + 1, value: tune.scrap_wreck, taken: false });
  }
  recomputeAll();
  // roaming patrols, away from the start
  for (let k = 0; k < Math.round(tune.patrol_count); k++) {
    for (let tries = 0; tries < 40; tries++) {
      const x = 10 + rng() * (N - 20), z = 10 + rng() * (N - 20);
      if (Math.hypot(x - sites.start.x, z - sites.start.z) < 50) continue;
      if (!walkable(Math.floor(x), Math.floor(z)) || shallow(x, z)) continue;
      const d = Math.hypot(x - sites.start.x, z - sites.start.z) / (N * 1.2);
      sites.patrols.push({ x, z, n: 2 + Math.floor(rng() * 3), tier: 1 + Math.min(2, Math.floor(d * 3)) });
      break;
    }
  }
  world.sites = sites;
  return sites;
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
  for (let i = 1; i < n; i++) { sm[i] = Math.min(sm[i], sm[i - 1] + 0.75); sm[i] = Math.max(sm[i], sm[i - 1] - 0.75); }
  for (let i = n - 2; i >= 0; i--) { sm[i] = Math.min(sm[i], sm[i + 1] + 0.75); sm[i] = Math.max(sm[i], sm[i + 1] - 0.75); }
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
}
function buildOutpost(s, home) {
  const g = s.g, R = 9;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (Math.abs(dx) !== R && Math.abs(dz) !== R) continue;
    if (Math.abs(dx) <= 2 || Math.abs(dz) <= 2) continue; // four gates
    let road = false; // and a gap wherever a road runs through the wall
    for (let a = -2; a <= 2 && !road; a++) for (let b = -2; b <= 2; b++) if (inMap(s.x + dx + a, s.z + dz + b) && world.road[s.x + dx + a + world.N * (s.z + dz + b)]) { road = true; break; }
    if (road) continue;
    const t = (dx + dz) % 4 === 0 ? V.GREEN : V.JUNK;
    put(s.x + dx, g, s.z + dz, t); put(s.x + dx, g + 1, s.z + dz, (dx * 7 + dz) % 3 ? V.JUNK : V.RUST);
  }
  const door = (dx, dz, y) => dz === 0 && dx === 1 && y < 2;
  // the outpost's own ground keeps no road voxels under its huts
  boxShell(s.x - 7, s.z - 7, 3, 3, g, 3, V.RUST, V.JUNK, door);
  boxShell(s.x + 4, s.z - 7, 3, 4, g, 3, V.RUST, V.RUST, door);
  boxShell(s.x - 7, s.z + 4, 4, 3, g, 3, V.RUST, V.JUNK, door);
  // the workshop with a green roof and a big door
  boxShell(s.x + 3, s.z + 3, 5, 5, g, 4, V.GREEN, V.RUST, (dx, dz, y) => dz === 0 && dx >= 1 && dx <= 3 && y < 3);
  for (let y = 0; y < 7; y++) put(s.x - 3, g + y, s.z + 4, V.WOOD); // flag pole
  put(s.x - 2, g + 6, s.z + 4, V.GREEN); put(s.x - 1, g + 6, s.z + 4, V.GREEN); put(s.x - 2, g + 5, s.z + 4, V.GREEN); put(s.x - 1, g + 5, s.z + 4, V.YEL);
  // fuel tank
  for (let y = 0; y < 3; y++) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(s.x + 6 + a, g + y, s.z - 3 + b, y === 2 ? V.YEL : V.RUST);
  s.home = home;
}
function buildCamp(c) {
  const g = c.g, tier = c.tier;
  c.spots = [];
  // sandbag arcs with gaps
  for (let a = 0; a < 64; a++) {
    const ang = a / 64 * Math.PI * 2;
    if ((a % 16) < 3) continue;
    const x = Math.round(c.x + Math.cos(ang) * 6.5), z = Math.round(c.z + Math.sin(ang) * 6.5);
    put(x, g, z, V.BAG); if (tier >= 3) put(x, g + 1, z, V.BAG);
    if (a % 5 === 0) c.spots.push({ x: c.x + 0.5 + Math.cos(ang) * 5.2, z: c.z + 0.5 + Math.sin(ang) * 5.2 });
  }
  // bunker in the middle
  boxShell(c.x - 2, c.z - 2, 5, 5, g, 3, V.CONC, V.CONC, (dx, dz, y) => (y === 1 && (dx === 2 || dz === 2)) || (dz === 4 && dx === 2 && y < 2));
  // watchtower
  const tx = c.x + 3, tz = c.z - 5;
  for (let y = 0; y < 4; y++) for (const [a, b] of [[0, 0], [2, 0], [0, 2], [2, 2]]) put(tx + a, g + y, tz + b, V.WOOD);
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) put(tx + a, g + 4, tz + b, V.WOOD);
  for (let a = 0; a < 3; a++) { put(tx + a, g + 5, tz, V.RAID); put(tx + a, g + 5, tz + 2, V.RAID); }
  c.tower = { x: tx + 1.5, z: tz + 1.5 };
  // banner and junk
  for (let y = 0; y < 6; y++) put(c.x - 4, g + y, c.z + 3, V.WOOD);
  put(c.x - 3, g + 5, c.z + 3, V.RAID); put(c.x - 3, g + 4, c.z + 3, V.YEL); put(c.x - 2, g + 5, c.z + 3, V.RAID);
  for (let k = 0; k < 4; k++) { const x = c.x - 4 + k * 2, z = c.z + 5; put(x, g, z, V.JUNK); if (k % 2) put(x, g + 1, z, V.RUST); }
}
function buildFortress(f) {
  const g = f.g, R = 15;
  const st = world.sitesStart || { x: 22, z: 22 };
  const sdx = Math.abs(st.x - f.x) >= Math.abs(st.z - f.z) ? Math.sign(st.x - f.x) : 0;
  const sdz = sdx ? 0 : Math.sign(st.z - f.z);
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const ring = Math.max(Math.abs(dx), Math.abs(dz));
    if (ring !== R && ring !== R - 1) continue;
    const onGate = (sdx && Math.abs(dx) >= R - 1 && Math.sign(dx) === sdx && Math.abs(dz) <= 2) || (sdz && Math.abs(dz) >= R - 1 && Math.sign(dz) === sdz && Math.abs(dx) <= 2);
    for (let y = 0; y < 5; y++) {
      let t;
      if (onGate) t = y < 4 ? V.RUST : V.AIR;
      else if (y === 4 && (dx + dz) % 2) t = V.AIR;
      else t = (y === 2 && (dx * 3 + dz) % 7 === 0) ? V.RAID : V.CONC;
      if (t) put(f.x + dx, g + y, f.z + dz, t);
    }
  }
  f.towers = [];
  for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x0 = f.x + ax * R - (ax > 0 ? 3 : 0), z0 = f.z + az * R - (az > 0 ? 3 : 0);
    for (let dz = 0; dz < 4; dz++) for (let dx = 0; dx < 4; dx++) {
      for (let y = 0; y < 7; y++) put(x0 + dx, g + y, z0 + dz, y === 6 ? V.RAID : V.CONC);
      if (dx === 0 || dz === 0 || dx === 3 || dz === 3) put(x0 + dx, g + 7, z0 + dz, V.CONC);
    }
    f.towers.push({ x: x0 + 2, z: z0 + 2 });
  }
  // inner sheds and the chief's banner
  boxShell(f.x - 9, f.z - 9, 5, 4, g, 3, V.RUST, V.RAID, (dx, dz, y) => dz === 3 && dx === 2 && y < 2);
  boxShell(f.x + 5, f.z - 9, 4, 5, g, 3, V.RUST, V.JUNK, (dx, dz, y) => dz === 4 && dx === 1 && y < 2);
  for (let y = 0; y < 9; y++) put(f.x - 8, g + y, f.z + 8, V.RUST);
  for (let k = 0; k < 3; k++) for (let y = 6; y < 9; y++) put(f.x - 7 + k, g + y, f.z + 8, (k + y) % 2 ? V.RAID : V.YEL);
  f.gateDir = { x: sdx, z: sdz };
}
function buildRuin(s) {
  const kind = rng();
  const t = rng() < 0.55 ? V.CONC : V.RUST, ns = Math.floor(rng() * 9999);
  if (kind < 0.65) {
    const w = 4 + Math.floor(rng() * 5), d = 4 + Math.floor(rng() * 5), h = 3 + Math.floor(rng() * 4);
    const roof = rng() < 0.45;
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      const edge = dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1;
      const x = s.x + dx, z = s.z + dz, g = colTop(x, z);
      if (edge) {
        const top = h - Math.floor(vnoise(dx * 0.6, dz * 0.6, ns) * 3);
        for (let y = 0; y < top; y++) {
          if (vnoise(x * 0.8 + y * 0.5, z * 0.8 - y * 0.4, ns + 1) > 0.66) continue; // holes
          if (y === 1 && (dx + dz) % 3 === 0) continue; // windows
          put(x, g + y, z, (y === 0 && rng() < 0.3) ? V.JUNK : t);
        }
      } else if (roof && vnoise(x * 0.5, z * 0.5, ns + 2) < 0.6) put(x, s.h + h - 1, z, t);
    }
  } else {
    const len = 5 + Math.floor(rng() * 7), h = 2 + Math.floor(rng() * 2), ax = rng() < 0.5;
    for (let k = 0; k < len; k++) {
      const x = s.x + (ax ? k : 0), z = s.z + (ax ? 0 : k), g = colTop(x, z);
      for (let y = 0; y < h - (k % 4 === 3 ? 1 : 0); y++) put(x, g + y, z, t);
    }
  }
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
function buildWreck(s) {
  const ax = rng() < 0.5, g = s.h;
  for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) {
    const x = s.x + (ax ? a : b), z = s.z + (ax ? b : a);
    put(x, g, z, V.RUST); if (a > 0 && a < 3) put(x, g + 1, z, a === 1 ? V.RUST : V.JUNK);
  }
}

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
    if (y < VH && inMap(x, z) && world.vox[vi(x, y, z)]) return { x, y, z, t };
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
      const k = vi(x, y, z), t = world.vox[k]; if (!t || t === V.BED) continue;
      const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy, ddz = z + 0.5 - cz;
      const rr = r * VHARD[t] * (0.85 + rng() * 0.3);
      if (ddx * ddx + ddy * ddy + ddz * ddz <= rr * rr) { world.vox[k] = 0; removed.push(x, y, z, t); markDirty(x, z); }
    }
  if (removed.length) {
    collapse(Math.floor(cx), Math.floor(cz), R + 6, removed);
    for (let z = z0 - 6; z <= z1 + 6; z++) for (let x = x0 - 6; x <= x1 + 6; x++) if (inMap(x, z)) recomputeColumn(x, z);
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
    if (world.vox[k] && !seen[li(x, y, z)]) { removed.push(x, y, z, world.vox[k]); world.vox[k] = 0; markDirty(x, z); }
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
function findPath(sx, sz, tx, tz, maxStep = 1, maxNodes = 7000, maxDrop = maxStep) {
  const N = world.N;
  if (PF.N !== N) { PF.N = N; PF.g = new Float32Array(N * N); PF.from = new Int32Array(N * N); PF.stamp = new Uint32Array(N * N); PF.closed = new Uint32Array(N * N); PF.cur = 0; }
  PF.cur++;
  const ax = Math.floor(sx), az = Math.floor(sz);
  let bx = Math.floor(tx), bz = Math.floor(tz);
  if (!inMap(ax, az) || !inMap(bx, bz)) return [];
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
      if (up > maxStep || -up > maxDrop) continue;
      if (dx && dz) { // no cutting corners
        const a = cx + dx + N * cz, b = cx + N * (cz + dz);
        if (!walkable(cx + dx, cz) || !walkable(cx, cz + dz) || Math.abs(hm[a] - hm[c]) > maxStep || Math.abs(hm[b] - hm[c]) > maxStep) continue;
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
    if (hAt(x + rx * 1.1, z + rz * 1.1) >= h + 1) return true;
  }
  return false;
}
/** How good the cover in the cell beside (x,z) at height h is: 0 none, 1 light (low or soft), 2 heavy. */
function coverQuality(x, z, h) {
  const nh = hAt(x, z);
  if (nh < h + 1 || nh > h + 8) return 0;
  if (nh >= h + 2) return 2;
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
