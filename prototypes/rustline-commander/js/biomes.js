// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Biomes (desert, forest, ice, burnt lands) and zone layouts (open lands, farmland, villages, ruined
// city); the structures they are built of, made to be read at a glance (houses with windows and pitched
// roofs, barns, silos, churches, city blocks, petrol stations, the garage, raider camps); the
// detail props and the site markers drawn over them. Loaded after world.js, before view.js.
'use strict';

// ---- More voxel kinds: building materials -------------------------------------------------------------
Object.assign(V, { BRICK: 16, PLAST: 17, TILE: 18, METAL: 19, GLASS: 20, CLOTH: 21, STRIPE: 22, HAY: 23, PLANK: 24, ADOBE: 25 });
VCOL.push(0x9c5038, 0xd2c3a2, 0xa04428, 0x7d8b92, 0x8e9ea8, 0xbba57c, 0xe4bc32, 0xd9bb62, 0x963f2a, 0xc79c6c);
VHARD.push(0.66, 0.74, 0.82, 0.8, 1.3, 1.3, 0.8, 1.3, 1.0, 0.8);
for (const k of [V.CLOTH, V.HAY, V.PLANK]) SOFTV.add(k);

// ---- Biomes and layouts ---------------------------------------------------------------------------------
/**
 * Each biome tints the five ground textures (rgb, how much), and sets the sky, the light, the water, the
 * trees (share of conifers, broadleaves, dead ones and their colours), the grass tufts and the map's
 * relief (mesa, lakes, forest share).
 */
const BIOMES = adopt('biome', {});
/** Adds a biome (the fields above; hut is the lone hut of open lands, a shack when it says none). */
function registerBiome(id, D) { return register('biome', id, D); }
/** The biomes' ids in their order (biome_force counts from 1 in it). */
function biomeIds() { return Object.keys(BIOMES); }
/**
 * What a zone is built of: its name, how much forest it keeps (forestK), how many lone ruins (ruins), how many
 * rocks (rocksK); build(placed, ns) puts its buildings up before the faction's settlement, after(placed, ns) after it.
 */
const LAYOUTS = adopt('layout', {});
/** Adds a zone layout. */
function registerLayout(id, D) { return register('layout', id, D); }
/** The layouts' ids in their order (layout_force counts from 1 in it). */
function layoutIds() { return Object.keys(LAYOUTS); }
/** The biome and layout of the map being built or played (config biome_force / layout_force override, for testing). */
function mapBiomeId() { const f = Math.round(tune.biome_force); return f ? biomeIds()[f - 1] : (world.spec && world.spec.biome) || 'desert'; }
function mapLayoutId() { const f = Math.round(tune.layout_force); return f ? layoutIds()[f - 1] : (world.spec && world.spec.layout) || 'wild'; }
function BIOME() { return BIOMES[world.biome] || BIOMES.desert; }
// ---- Geography: what stands between the start and the exit -------------------------------------------------
/**
 * The geographies. An entry: name, brief (the SITREP line); optional: land(P) (how it changes the preset;
 * the one with the highest landRank in the sector wins), shape(N, ns, SC, EC) (its relief in canonical space:
 * { raise(cx, cz) the height it adds, block(cx, cz) true where no site may sit }), wideRiver (the river is
 * always there, wide, with fords), pairsOnly (the only geographies it can be combined with).
 */
const GEOS = adopt('geo', {});
/** Adds a geography. */
function registerGeo(id, D) { return register('geo', id, D); }
/** The geographies' ids in their order (geo_force counts from 1 in it). */
function geoIds() { return Object.keys(GEOS); }
/** Can two geographies share a sector? */
function geoPairs(a, b) { const A = GEOS[a], B = GEOS[b]; return (!A.pairsOnly || A.pairsOnly.includes(b)) && (!B.pairsOnly || B.pairsOnly.includes(a)); }
/** The sector's geographies, one or two (config geo_force overrides, for testing). */
function mapGeoIds() {
  const f = Math.round(tune.geo_force), S = world.spec || {};
  if (f) return [geoIds()[f - 1]];
  if (S.geos && S.geos.length) return S.geos.slice();
  const ids = geoIds(); return [ids[Math.floor(rng() * ids.length)]];
}
function geoName(ids) { return ids.map(g => GEOS[g].name).join(' + '); }
/**
 * Map shapes: open, a valley between rock walls along the way, a basin ringed by mountains. wall(cx, cz, N, ns, C)
 * is how much of the rock wall stands at a canonical point (0 none, 1 all of it); no wall, an open map.
 */
const SHAPES = adopt('shape', {});
/** Adds a map shape. */
function registerShape(id, D) { return register('shape', id, D); }
/** The shapes' ids in their order (shape_force counts from 1 in it). */
function shapeIds() { return Object.keys(SHAPES); }
function mapShapeId() { const f = Math.round(tune.shape_force); return f ? shapeIds()[f - 1] : (world.spec && world.spec.shape) || 'open'; }
/**
 * The sector's geographies together, in canonical space (start near 0,0, exit near N,N), for genWorld: raise(cx,cz)
 * is the height they add, block(cx,cz) where no site may sit. Each geography's own shape is in its entry.
 */
function geoShape(G, N, ns, SC, EC) {
  const parts = G.map(g => GEOS[g].shape ? GEOS[g].shape(N, ns, SC, EC) : null).filter(Boolean);
  return {
    G, parts,
    raise(cx, cz) { let h = 0; for (const p of parts) if (p.raise) h += p.raise(cx, cz); return h; },
    block(cx, cz) { return parts.some(p => p.block && p.block(cx, cz)); },
  };
}
/** Fits the map preset to the biome and the layout (called by mapPreset). */
function biomePreset(P) {
  world.biome = mapBiomeId(); world.layout = mapLayoutId();
  const B = BIOMES[world.biome].map, L = LAYOUTS[world.layout];
  if (!tune.map_simple) { P.mesa = B.mesa; P.lakes = B.lakes; P.mountains *= B.mountains; }
  P.forest = Math.min(1, B.forest * L.forestK * (tune.map_simple ? 0.5 : 1));
  P.ruins = Math.round(P.ruins * L.ruins);
  if (L.rocksK) P.rocks = Math.round(P.rocks * L.rocksK);
  return P;
}

// ---- Building helpers ---------------------------------------------------------------------------------------
/** A solid box of voxels. */
function fillBox(x0, y0, z0, w, h, d, t) { for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) for (let y = 0; y < h; y++) put(x0 + dx, y0 + y, z0 + dz, t); }
/** The natural ground under a footprint (plus margin m) is levelled to height g: cut down or filled with dirt. */
function levelGround(x0, z0, w, d, g, m = 1) {
  for (let dz = -m; dz < d + m; dz++) for (let dx = -m; dx < w + m; dx++) {
    const x = x0 + dx, z = z0 + dz; if (!inMap(x, z) || x < 1 || z < 1 || x >= world.N - 1 || z >= world.N - 1) continue;
    const edge = dx < 0 || dz < 0 || dx >= w || dz >= d, base = VH * (x + world.N * z);
    let top = 0; while (top < VH && GROUNDV.has(world.vox[base + top])) top++;
    if (edge && Math.abs(top - g) <= 1) continue; // the margin only softens real steps
    for (let y = top; y < g; y++) world.vox[base + y] = V.DIRT;
    for (let y = g; y < top; y++) world.vox[base + y] = 0;
  }
}
/** World prop list: decorations drawn over the voxels, gone when the voxel they stand on goes. */
function addProp(k, x, y, z, o) { world.props.push(Object.assign({ k, x, y, z, yaw: 0, ax: Math.floor(x), ay: Math.floor(y) - 1, az: Math.floor(z) }, o)); }
/** A signboard on two posts (voxels), its painted board a prop facing yaw. */
function signboard(x, z, g, yaw, tex, wide) {
  const ux = Math.round(Math.cos(yaw)), uz = Math.round(-Math.sin(yaw)), half = wide ? 2 : 1;
  for (const s of [-half, half]) for (let y = 0; y < 3; y++) put(x + ux * s, g + y, z + uz * s, V.WOOD);
  addProp('sign', x + 0.5, g + 3.2, z + 0.5, { yaw, tex, w: wide ? 5.2 : 3.2, h: wide ? 1.9 : 1.5, ax: x + ux * half, ay: g + 2, az: z + uz * half });
}
/**
 * A house or block of flats: built on the fine grid by structHouse (js/structs.js), ruined, with a door on the side
 * facing o.face and o.floors storeys of 3 m. Registered as a building soldiers can enter.
 */
function buildHouse(x0, z0, w, d, g, o) { return structHouse(x0, z0, w, d, g, o); }
/** An upright cylinder (silos, fuel and water tanks, wells): built round on the fine grid by fineCylinder (js/structs.js). */
function cylinder(cx, cz, r, g, h, t, band, cap) { fineCylinder(cx, cz, r, g, h, t, band, cap); }
/** A wrecked car: rusty or painted body, the glass gone; built on the fine grid by fineCar (js/structs.js). Cover for infantry. */
function carWreck(x, z, g, ax) { fineCar(x, z, g, ax, [V.RUST, V.JUNK, V.METAL, V.RAID, V.PLAST][Math.floor(rng() * 5)]); }

// ---- Rural, village and city buildings ------------------------------------------------------------------------
/** A farmhouse: plastered walls, a tiled pitched roof with a chimney. */
function farmhouse(x, z, g, face) { return buildHouse(x, z, 6, 5, g, { wall: rng() < 0.6 ? V.PLAST : V.BRICK, corner: V.BRICK, roof: 'gable', roofT: V.TILE, chimney: true, floors: rng() < 0.5 ? 2 : 1, face }); }
/** A barn: red planks, a big door 3 wide on a short side, a metal pitched roof, hay bales by it. */
function barn(x, z, g, face) {
  const b = buildHouse(x, z, 7, 9, g, { wall: V.PLANK, corner: V.WOOD, roof: 'gable', roofT: V.METAL, extra: 1, win: false, doorW: 2, doorH: 3, face });
  for (let k = 0; k < 3; k++) { put(x - 2, g, z + 2 + k * 2, V.HAY); if (k !== 1) put(x - 2, g + 1, z + 2 + k * 2, V.HAY); }
  return b;
}
/** A grain silo: a tall ribbed cylinder with a cone cap. */
function silo(x, z, g) { cylinder(x, z, 2.2, g, 9, V.METAL, V.STRIPE, V.METAL); }
/**
 * A water tower, one structure on the fine grid: four wooden legs half a metre square, bare for the first 2.5 m,
 * two ring beams with crossed braces between them, a plank deck and the metal tank with a rusty cap on it. Lose
 * two legs (or one, with the tank's weight hanging off the frame) and it tips and comes down whole (staticsFail).
 */
function waterTower(x, z, g) {
  const S = objStruct(x - 1, z - 1, 6, 6, g, 15), W = FM.WOOD, top = g + 6.5, r0 = g + 2.5, r1 = g + 5;
  const legs = [[x + 0.25, z + 0.25], [x + 3.75, z + 0.25], [x + 3.75, z + 3.75], [x + 0.25, z + 3.75]];
  for (const [a, b] of legs) fbox(S, a - 0.25, g, b - 0.25, a + 0.25, top, b + 0.25, W);
  for (let i = 0; i < 4; i++) {
    const [a, b] = legs[i], [c, d] = legs[(i + 1) % 4];
    for (const ry of [r0, r1]) fbox(S, Math.min(a, c) - 0.125, ry, Math.min(b, d) - 0.125, Math.max(a, c) + 0.125, ry + 0.25, Math.max(b, d) + 0.125, W); // the ring beams
    fbeam(S, a, r0 + 0.25, b, c, r1, d, 0.25, W); fbeam(S, c, r0 + 0.25, d, a, r1, b, 0.25, W); // the crossed braces
  }
  fbox(S, x - 0.25, top, z - 0.25, x + 4.25, top + 0.5, z + 4.25, W); // the deck
  fineCylinder(x + 1.5, z + 1.5, 1.9, top + 0.5, 3, V.METAL, null, V.RUST, S);
  projectStruct(S); world.sdirty.add(S.id);
}
/** A church: a plastered nave with a tiled roof and a bell tower with open arches and a cross. */
function church(x, z, g, face) { return buildHouse(x, z, 6, 10, g, { wall: V.PLAST, corner: V.CONC, floors: 2, roof: 'gable', roofT: V.TILE, doorW: 2, doorH: 3, face: [0, 1] }); }
/** A city block: two to four storeys of concrete or brick, window rows, maybe a shop front, a flat roof, half shot away. */
function cityBlock(x, z, w, d, g, face) {
  const frame = rng() < 0.45, floors = frame ? 3 + Math.floor(rng() * 4) : 2 + Math.floor(rng() * 3), brick = !frame && rng() < 0.55;
  const shape = w >= 7 && d >= 7 ? ['rect', 'L', 'U', 'court'][Math.floor(rng() * (w >= 10 && d >= 10 ? 4 : 3))] : 'rect';
  return buildHouse(x, z, w, d, g, { wall: brick ? V.BRICK : frame ? (rng() < 0.5 ? V.PLAST : V.BRICK) : V.CONC, corner: V.CONC, floors, face, shape, system: frame ? 'frame' : 'masonry', shop: frame && rng() < 0.7, balcony: frame && rng() < 0.6, ruin: tune.struct_ruin * (0.8 + rng() * 0.6) });
}
/** A desert hut: adobe walls, a flat roof with a low parapet, small windows. */
function adobeHut(x, z, g, face) { return buildHouse(x, z, 4 + Math.floor(rng() * 3), 4 + Math.floor(rng() * 2), g, { wall: V.ADOBE, roof: 'flat', roofSlab: V.ADOBE, face }); }
/** A tin shack: corrugated walls and roof. */
function shack(x, z, g, face) { return buildHouse(x, z, 5, 4, g, { wall: V.METAL, corner: V.RUST, roof: 'shed', roofT: V.RUST, face }); }
/** A petrol station: a canopy on four posts over two pumps, a little shop, a sign. */
function petrolStation(x, z, g) {
  const S = objStruct(x, z, 6, 4, g, 5), top = g + 3; // the canopy, one structure on the fine grid: four posts, a slab with a striped rim
  for (const [a, b] of [[0.5, 0.5], [5.5, 0.5], [0.5, 3.5], [5.5, 3.5]]) fbox(S, x + a - 0.25, g, z + b - 0.25, x + a + 0.25, top, z + b + 0.25, FM.METAL);
  fbox(S, x, top, z, x + 6, top + 0.5, z + 4, FM.METAL);
  for (const [a0, b0, a1, b1] of [[0, 0, 6, 0.25], [0, 3.75, 6, 4], [0, 0, 0.25, 4], [5.75, 0, 6, 4]]) fbox(S, x + a0, top, z + b0, x + a1, top + 0.5, z + b1, FM.STRIPE);
  projectStruct(S); world.sdirty.add(S.id);
  addProp('pump', x + 2, g, z + 2, { ay: g - 1 }); addProp('pump', x + 4, g, z + 2, { ay: g - 1 });
  buildHouse(x, z + 6, 6, 4, g, { wall: V.PLAST, corner: V.STRIPE, roof: 'flat', shop: true, face: [0, -1] });
  signboard(x + 8, z + 1, g, 0, 'fuel', false);
  for (let k = 0; k < 3; k++) addProp('barrel', x + 7 + k * 0.9, g, z + 6 + (k % 2) * 0.9, { ay: g - 1, crush: true, col: [0xa62f28, 0x56693a, 0x7d8b92][k] });
}

/**
 * Finds a free, dry, fairly flat footprint w x d (plus margin) away from the sites, the roads and anything
 * already built. Returns {x, z, g} with g the height to level it to, or null.
 */
function findArea(w, d, o) {
  const N = world.N, m = o.margin ?? 2, flat = o.flat ?? 3, road = o.road ?? 3;
  for (let tries = 0; tries < (o.tries || 60); tries++) {
    const x = o.cx != null ? Math.round(o.cx + (rng() - 0.5) * 2 * o.r - w / 2) : 6 + Math.floor(rng() * (N - 12 - w));
    const z = o.cz != null ? Math.round(o.cz + (rng() - 0.5) * 2 * o.r - d / 2) : 6 + Math.floor(rng() * (N - 12 - d));
    if (x < 5 || z < 5 || x + w > N - 5 || z + d > N - 5) continue;
    if (areaOK(x, z, w, d, m, flat, road, o.sites)) return { x, z, g: areaG(x, z, w, d) };
  }
  return null;
}
function areaG(x, z, w, d) { let s = 0, n = 0; for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) { s += groundOf(x + dx, z + dz); n++; } return Math.max(world.WL + 1, Math.round(s / n)); }
function areaOK(x, z, w, d, m, flat, road, sites) {
  const N = world.N, WL = world.WL;
  let lo = 99, hi = 0;
  for (let dz = -m; dz < d + m; dz++) for (let dx = -m; dx < w + m; dx++) {
    const xx = x + dx, zz = z + dz; if (!inMap(xx, zz)) return false;
    const i = xx + N * zz, g = groundOf(xx, zz);
    if (g < WL + 1 || world.bld[i] || world.keep[i] || world.hmap[i] > g) return false; // water, a building, a kept place (the garage), anything built or grown
    if (dx >= 0 && dz >= 0 && dx < w && dz < d) { lo = Math.min(lo, g); hi = Math.max(hi, g); }
  }
  if (hi - lo > flat) return false;
  for (let dz = -road; dz < d + road; dz++) for (let dx = -road; dx < w + road; dx++) if (inMap(x + dx, z + dz) && world.road[x + dx + N * (z + dz)]) return false;
  for (const s of sites || []) { const r = padR(s) + 4, cx = Math.max(x, Math.min(x + w, s.x)), cz = Math.max(z, Math.min(z + d, s.z)); if (Math.hypot(cx - s.x, cz - s.z) < r) return false; }
  return true;
}
/** Builds something on a found area: levels the ground first, then calls make(x, z, g). */
function onArea(A, w, d, make) { if (!A) return false; levelGround(A.x, A.z, w, d, A.g, 1); recomputeArea(A.x - 2, A.z - 2, w + 4, d + 4); make(A.x, A.z, A.g); keepArea(A.x, A.z, w, d, 1); recomputeArea(A.x - 5, A.z - 5, w + 10, d + 10); return true; }
/** Marks a box (plus margin) as kept: nothing else is built there and no tree grows. */
function keepArea(x0, z0, w, d, m) { for (let z = z0 - m; z < z0 + d + m; z++) for (let x = x0 - m; x < x0 + w + m; x++) if (inMap(x, z)) world.keep[x + world.N * z] = 1; }
function recomputeArea(x0, z0, w, d) { for (let z = z0; z < z0 + d; z++) for (let x = x0; x < x0 + w; x++) if (inMap(x, z)) recomputeColumn(x, z); }

/** A farmstead: farmhouse, barn, a silo or a water tower, hay, a fence round the yard. */
function farmstead(sites) {
  const A = findArea(18, 16, { sites, flat: 3, margin: 2 });
  if (!A) return false;
  levelGround(A.x, A.z, 18, 16, A.g, 1); recomputeArea(A.x - 2, A.z - 2, 22, 20);
  const g = A.g;
  farmhouse(A.x + 1, A.z + 1, g, [0, 1]);
  barn(A.x + 10, A.z + 1, g, [0, 1]);
  if (rng() < 0.5) silo(A.x + 4, A.z + 12, g); else waterTower(A.x + 2, A.z + 10, g);
  for (let k = 0; k < 4; k++) { const hx = A.x + 9 + k * 2, hz = A.z + 13; put(hx, g, hz, V.HAY); put(hx + 1, g, hz, V.HAY); if (k % 2) put(hx, g + 1, hz, V.HAY); }
  for (let k = 0; k < 18; k++) { if (k % 7 === 3) continue; put(A.x + k, g, A.z + 15, V.WOOD); } // a fence with gaps
  for (let k = 0; k < 16; k++) { if (k % 6 === 2) continue; put(A.x + 17, g, A.z + k, V.WOOD); }
  addProp('barrel', A.x + 8.5, g, A.z + 7.5, { ay: g - 1, crush: true, col: 0x56693a });
  keepArea(A.x, A.z, 18, 16, 1);
  recomputeArea(A.x - 4, A.z - 4, 26, 24);
  return true;
}
/** A village: a church (or a well) on a paved square, houses round it with their doors to the square. */
function village(sites) {
  const C = findArea(12, 12, { sites, flat: 3, margin: 3, tries: 120 });
  if (!C) return false;
  const cx = C.x + 6, cz = C.z + 6;
  levelGround(C.x, C.z, 12, 12, C.g, 1);
  for (let dz = 0; dz < 12; dz++) for (let dx = 0; dx < 12; dx++) { const x = C.x + dx, z = C.z + dz, g = groundOf(x, z); if (g > 0) world.vox[vi(x, g - 1, z)] = V.ROAD; }
  recomputeArea(C.x - 2, C.z - 2, 16, 16); keepArea(C.x, C.z, 12, 12, 1);
  if (rng() < 0.65) church(C.x + 3, C.z + 2, C.g, [0, 1]);
  else { cylinder(cx, cz, 1.6, C.g, 1, V.CONC, null, null); addProp('well', cx + 0.5, C.g + 1, cz + 0.5, { ay: C.g }); }
  recomputeArea(C.x - 4, C.z - 4, 20, 20);
  let n = 0;
  for (let k = 0; k < 24 && n < 7; k++) {
    const a = rng() * 6.283, rr = 13 + rng() * 6, w = 5 + Math.floor(rng() * 3), d = 5 + Math.floor(rng() * 2);
    const hx = Math.round(cx + Math.cos(a) * rr - w / 2), hz = Math.round(cz + Math.sin(a) * rr - d / 2);
    if (hx < 5 || hz < 5 || hx + w > world.N - 5 || hz + d > world.N - 5 || !areaOK(hx, hz, w, d, 1, 3, 2, sites)) continue;
    const face = [cx - (hx + w / 2), cz - (hz + d / 2)];
    onArea({ x: hx, z: hz, g: areaG(hx, hz, w, d) }, w, d, (x, z, gg) => buildHouse(x, z, w, d, gg, { wall: [V.PLAST, V.BRICK, V.PLAST, V.ADOBE][Math.floor(rng() * 4)], corner: V.BRICK, roof: rng() < 0.8 ? 'gable' : 'flat', roofT: rng() < 0.75 ? V.TILE : V.METAL, chimney: rng() < 0.5, floors: rng() < 0.3 ? 2 : 1, shape: rng() < 0.3 ? 'L' : 'rect', face }));
    n++;
  }
  return true;
}
/**
 * The ruined city: a street grid over a district of the map. Blocks hold one city block (or two narrow ones,
 * or an empty lot with rubble); the streets are paved and littered with wrecked cars and lamp posts.
 */
function cityGrid(sites, ns) {
  const N = world.N, S = 14, B = 9, ox = 4 + Math.floor(rng() * 6), oz = 4 + Math.floor(rng() * 6);
  const district = (x, z) => fbm(x / 60, z / 60, ns + 91, 2) > 0.36;
  let built = 0;
  for (let bz = 0; oz + bz * S + B < N - 4; bz++) for (let bx = 0; ox + bx * S + B < N - 4; bx++) {
    const x = ox + bx * S, z = oz + bz * S; if (!district(x + B / 2, z + B / 2)) continue;
    for (let dz = -3; dz < S - 2; dz++) for (let dx = -3; dx < S - 2; dx++) { // the streets round the block: asphalt
      if (dx >= 0 && dz >= 0 && dx < B && dz < B) continue;
      const xx = x + dx, zz = z + dz; if (!inMap(xx, zz) || world.road[xx + N * zz]) continue;
      if (sites.some(s => Math.hypot(xx - s.x, zz - s.z) < padR(s) + 1)) continue;
      const g = groundOf(xx, zz); if (g > world.WL && world.hmap[xx + N * zz] === g) world.vox[vi(xx, g - 1, zz)] = V.ROAD;
    }
    if (!areaOK(x, z, B, B, 1, 4, 2, sites)) continue;
    const r = rng(), g = areaG(x, z, B, B);
    if (r < 0.62) { const w = 7 + Math.floor(rng() * 3), d = 7 + Math.floor(rng() * 3), f = [[0, 1], [1, 0], [0, -1], [-1, 0]][Math.floor(rng() * 4)]; onArea({ x, z, g }, w, d, (xx, zz, gg) => cityBlock(xx, zz, w, d, gg, f)); }
    else if (r < 0.85) { onArea({ x, z, g }, 4, 9, (xx, zz, gg) => cityBlock(xx, zz, 4, 9, gg, [-1, 0])); onArea({ x: x + 5, z, g }, 4, 9, (xx, zz, gg) => cityBlock(xx, zz, 4, 9, gg, [1, 0])); }
    else { levelGround(x, z, B, B, g, 0); recomputeArea(x, z, B, B); for (let k = 0; k < 14; k++) { const rx = x + Math.floor(rng() * B), rz = z + Math.floor(rng() * B); put(rx, colTop(rx, rz), rz, rng() < 0.5 ? V.CONC : V.BRICK); } recomputeArea(x, z, B, B); }
    if (rng() < 0.55) { // a wreck in the street
      const ax = rng() < 0.5, cx = ax ? x + Math.floor(rng() * 5) : x + B + 1, cz = ax ? z + B + 1 : z + Math.floor(rng() * 5);
      if (areaOK(cx, cz, ax ? 4 : 2, ax ? 2 : 4, 0, 1, 1, sites)) { carWreck(cx, cz, colTop(cx, cz), ax); recomputeArea(cx, cz, 4, 4); }
    }
    if (rng() < 0.6) { const lx = x - 1, lz = z - 1, lg = groundOf(lx, lz); if (inMap(lx, lz) && world.hmap[lx + N * lz] === lg) addProp('lamp', lx + 0.5, lg, lz + 0.5, { ay: lg - 1, crush: true }); }
    built++;
  }
  return built;
}
/**
 * The structures of the map's layout, after the sites and the roads: farmsteads, villages, the city, petrol
 * stations, desert huts and lone ruins. freeSpot is genWorld's helper for the old ruins.
 */
function buildLayout(sites, placed, freeSpot, P, ns) {
  const L = LAYOUTS[world.layout];
  if (L.build) L.build(placed, ns); // the layout's own buildings (the LAYOUTS entry)
  buildSettlement(sites, placed); // factions.js: the settlement of the faction holding the sector
  if (L.after) L.after(placed, ns);
  const rm = sites.roadMain; // a petrol station beside the main road
  if (rm && rm.length > 40 && rng() < 0.8) {
    const p = rm[Math.floor(rm.length * (0.4 + rng() * 0.3))];
    const A = findArea(9, 10, { sites: placed, cx: p[0], cz: p[1], r: 12, road: 2, tries: 90 });
    onArea(A, 9, 10, (x, z, g) => petrolStation(x, z, g));
  }
  for (let k = 0; k < P.ruins; k++) { const s = freeSpot(18, 2); if (s) { buildRuin(s); recomputeAll(); } }
}

// ---- The sites, rebuilt ---------------------------------------------------------------------------------------
/** A friendly outpost: three ruined houses in the corners no road crosses, doors to the yard, barrels and crates. */
function buildOutpost(s, home) {
  const g = s.g, N = world.N;
  const corners = [[-9, -9], [5, -9], [-9, 5], [5, 5]].filter(([a, b]) => {
    for (let dz = -1; dz <= 4; dz++) for (let dx = -1; dx <= 5; dx++) if (inMap(s.x + a + dx, s.z + b + dz) && world.road[s.x + a + dx + N * (s.z + b + dz)]) return false;
    return true;
  });
  corners.slice(0, 3).forEach(([a, b], k) => buildHouse(s.x + a, s.z + b, 5, 4, g, { wall: k === 1 ? V.PLAST : V.CONC, corner: V.CONC, face: [0, b < 0 ? 1 : -1], ruin: 0.3 + rng() * 0.3 }));
  for (let k = 0; k < 4; k++) addProp('barrel', s.x - 3 + k * 0.9, g, s.z + 3.5 + (k % 2) * 0.8, { ay: g - 1, crush: true, col: k % 2 ? 0x56693a : 0x8e4b27 });
  addProp('crate', s.x + 3.5, g, s.z - 3.5, { ay: g - 1, crush: true }); addProp('crate', s.x + 4.4, g, s.z - 3.3, { ay: g - 1, crush: true });
  s.home = home;
}
/**
 * The garage: a workshop hall open at the front, metal walls, a flat roof with a hazard-striped edge and the
 * OFFICINA sign, outside the outpost beside a gate, on levelled ground. Driving into it opens the garage menu.
 */
function buildGarage(s, R) {
  const N = world.N, WL = world.WL, W = 9, D = 8;
  let best = null;
  for (const [ux, uz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const side of [1, -1]) {
    const px = -uz * side, pz = ux * side; // along the wall; the hall opens toward -p, the gate's axis
    const cx = s.x + ux * (R + 6) + px * 10, cz = s.z + uz * (R + 6) + pz * 10;
    let score = 0, lo = 99, hi = 0;
    for (let b = -5; b <= 5; b++) for (let a = -5; a <= 5; a++) {
      const x = cx + a, z = cz + b; if (!inMap(x, z) || x < 3 || z < 3 || x > N - 4 || z > N - 4) { score += 100; continue; }
      if (world.road[x + N * z] && Math.abs(a) <= 4 && Math.abs(b) <= 4) score += 100;
      const h = colTop(x, z); lo = Math.min(lo, h); hi = Math.max(hi, h);
      if (h < WL + 1) score += 20;
    }
    score += (hi - lo) * 2;
    const gx = s.x + ux * (R + 2), gz = s.z + uz * (R + 2);
    if (inMap(gx, gz) && world.road[gx + N * gz]) score -= 4; // by the road's gate
    if (!best || score < best.score) best = { score, cx, cz, px, pz };
  }
  if (best.score >= 100) best = { cx: s.x + 6, cz: s.z + 6, px: 1, pz: 0 }; // nowhere outside: in the yard
  const { cx, cz, px, pz } = best;
  const alongX = px !== 0, w = alongX ? D : W, d = alongX ? W : D;
  const x0 = cx - Math.floor(w / 2), z0 = cz - Math.floor(d / 2);
  const g = Math.max(WL + 1, groundOf(cx, cz));
  levelGround(x0, z0, w, d, g, 2); recomputeArea(x0 - 3, z0 - 3, w + 6, d + 6);
  for (let dz = -4; dz < d + 4; dz++) for (let dx = -4; dx < w + 4; dx++) if (inMap(x0 + dx, z0 + dz)) world.keep[x0 + dx + N * (z0 + dz)] = 1; // nothing else is built here
  const front = (dx, dz) => alongX ? (px > 0 ? dx === 0 : dx === w - 1) : (pz > 0 ? dz === 0 : dz === d - 1);
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
    const edge = dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1, corner = (dx === 0 || dx === w - 1) && (dz === 0 || dz === d - 1);
    if (edge && (!front(dx, dz) || corner)) for (let y = 0; y < 4; y++) put(x0 + dx, g + y, z0 + dz, corner ? V.STRIPE : y === 3 ? V.RUST : V.METAL);
    put(x0 + dx, g + 4, z0 + dz, front(dx, dz) ? V.STRIPE : V.METAL);
  }
  // inside: a workbench along the back wall, a crane beam with its hook; outside: the sign over the front, tyres, barrels
  const bx = alongX ? (px > 0 ? x0 + w - 2 : x0 + 1) : x0 + 2, bz = alongX ? z0 + 2 : (pz > 0 ? z0 + d - 2 : z0 + 1);
  for (let k = 0; k < 3; k++) put(bx + (alongX ? 0 : k), g, bz + (alongX ? k : 0), V.WOOD);
  const fx = alongX ? (px > 0 ? x0 - 0.1 : x0 + w + 0.1) : cx + 0.5, fz = alongX ? cz + 0.5 : (pz > 0 ? z0 - 0.1 : z0 + d + 0.1);
  addProp('sign', fx, g + 5.5, fz, { yaw: Math.atan2(-px, -pz), tex: 'garage', w: 5.4, h: 1.8, ax: Math.floor(fx + px * 0.6), ay: g + 4, az: Math.floor(fz + pz * 0.6) });
  addProp('hook', cx + 0.5, g + 3.95, cz + 0.5, { ay: g + 4, ax: cx, az: cz, hang: true, yaw: alongX ? Math.PI / 2 : 0 });
  const outX = alongX ? (px > 0 ? x0 - 2 : x0 + w + 1) : x0 - 1, outZ = alongX ? z0 - 1 : (pz > 0 ? z0 - 2 : z0 + d + 1);
  addProp('tyres', outX + 0.5, g, outZ + 0.5, { ay: g - 1, crush: true }); addProp('tyres', outX + 1.4, g, outZ + 0.3, { ay: g - 1, crush: true });
  addProp('barrel', bx + 0.5 + (alongX ? 0 : 4), g, bz + 0.5 + (alongX ? 4 : 0), { ay: g - 1, crush: true, col: 0xa62f28 });
  s.shed = { x: cx + 0.5, z: cz + 0.5 };
}
/** A raider camp: a ruined concrete house in the middle (its garrison), the raiders' places round it, two fires. */
function buildCamp(c) {
  const g = c.g;
  c.spots = [];
  for (let a = 0; a < 64; a++) {
    const ang = a / 64 * Math.PI * 2;
    if ((a % 16) < 3) continue; // four ways in
    if (a % 5 === 0) c.spots.push({ x: c.x + 0.5 + Math.cos(ang) * 5.2, z: c.z + 0.5 + Math.sin(ang) * 5.2 });
  }
  buildHouse(c.x - 2, c.z - 2, 5, 5, g, { wall: V.CONC, corner: V.CONC, face: [0, 1], ruin: 0.35 + rng() * 0.3 });
  c.tower = { x: c.x + 3.5, z: c.z - 6.5 }; // the lookout's place (its tower comes back on the fine grid later)
  addProp('fire', c.x + 4.5, g, c.z + 3.5, { ay: g - 1 }); addProp('fire', c.x - 3.5, g, c.z + 3.5, { ay: g - 1 });
}
/** A sector's exit: a dashed yellow ring on the ground and striped beacon posts with green lights. */
function buildExit(s) {
  for (let dz = -9; dz <= 9; dz++) for (let dx = -9; dx <= 9; dx++) {
    const d = Math.hypot(dx, dz); if (d < 7.5 || d > 9) continue;
    if (((Math.atan2(dz, dx) + 7) * 4 | 0) % 2) continue; // dashed
    const x = s.x + dx, z = s.z + dz; if (!inMap(x, z)) continue;
    const t = colTop(x, z); if (t > 1) put(x, t - 1, z, V.YEL);
  }
  for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
    const x = s.x + a, z = s.z + b, t = colTop(x, z); if (!inMap(x, z) || world.road[x + world.N * z]) continue;
    for (let y = 0; y < 4; y++) put(x, t + y, z, y % 2 ? V.STRIPE : V.METAL);
    addProp('beacon', x + 0.5, t + 4, z + 0.5, { ay: t + 3, ax: x, az: z });
  }
}
/** Extra dress for the Horde's fortress: stakes along the wall tops, skull banners on the towers. */
function dressFortress(f) {
  const g = f.g, R = 15;
  for (let k = -R; k <= R; k += 3) for (const [x, z] of [[f.x + k, f.z - R], [f.x + k, f.z + R], [f.x - R, f.z + k], [f.x + R, f.z + k]]) if (getV(x, g + 3, z) === V.CONC) put(x, g + 4, z, V.WOOD);
  for (const t of f.towers || []) addProp('sign', t.x, g + 9.6, t.z, { yaw: Math.PI / 4, tex: 'horde', w: 2.6, h: 2.6, ax: Math.floor(t.x), ay: g + 7, az: Math.floor(t.z) });
}

// ---- The view: material textures, props, markers, the biome's light -----------------------------------------------
/**
 * The voxel face atlas: one 32px tile per kind, a grey pattern the face colour multiplies (bricks, plaster,
 * roof tiles, corrugated metal, window panes, planks, sandbags, canvas, hazard stripes...). The patterns
 * give the buildings detail finer than a voxel.
 */
function makeVoxAtlas() {
  const T = 32, C = 8, Rw = 4, cv = document.createElement('canvas'); cv.width = T * C; cv.height = T * Rw;
  const x = cv.getContext('2d');
  const gr = v => 'rgb(' + v + ',' + v + ',' + v + ')';
  for (let k = 0; k < C * Rw; k++) {
    const ox = (k % C) * T, oy = Math.floor(k / C) * T, r = (a, b, w, h, v) => { x.fillStyle = gr(Math.max(0, Math.min(255, v | 0))); x.fillRect(ox + a, oy + b, w, h); };
    const noise = (n, lo, hi) => { for (let i = 0; i < n; i++) r(Math.floor(hash2(k, i, 41) * T), Math.floor(hash2(i, k, 42) * T), 1 + (hash2(k, i, 43) * 2 | 0), 1 + (hash2(i, k, 44) * 2 | 0), lo + hash2(k * 7, i, 45) * (hi - lo)); };
    r(0, 0, T, T, 255);
    switch (k) {
      case V.BRICK: case V.ADOBE: {
        const adobe = k === V.ADOBE;
        r(0, 0, T, T, adobe ? 230 : 150);
        for (let row = 0; row < 8; row++) for (let c = 0; c < 5; c++) { const bx2 = c * 8 - (row % 2) * 4; r(bx2 + 1, row * 4, 6, 3, (adobe ? 225 : 205) + hash2(row, c, k) * 45); }
        if (adobe) noise(40, 200, 250); break;
      }
      case V.PLAST: r(0, 0, T, T, 238); noise(90, 212, 255); r(0, 29, T, 3, 196); break;
      case V.TILE: r(0, 0, T, T, 140); for (let row = 0; row < 4; row++) for (let c = 0; c < 5; c++) { const ox2 = c * 8 - (row % 2) * 4; r(ox2, row * 8, 7, 6, 205 + hash2(row, c, 9) * 50); r(ox2, row * 8 + 5, 7, 1, 170); } break;
      case V.METAL: for (let c = 0; c < 8; c++) { r(c * 4, 0, 2, T, 240); r(c * 4 + 2, 0, 1, T, 195); r(c * 4 + 3, 0, 1, T, 160); } noise(25, 150, 200); break;
      case V.GLASS: r(0, 0, T, T, 228); r(3, 3, T - 6, T - 6, 60); r(15, 3, 2, T - 6, 228); r(3, 15, T - 6, 2, 228); for (let i = 0; i < 8; i++) r(6 + i, 12 - i, 2, 1, 150); for (let i = 0; i < 6; i++) r(20 + i, 28 - i, 2, 1, 130); break;
      case V.CLOTH: for (let c = 0; c < 4; c++) { r(c * 8, 0, 4, T, 238); r(c * 8 + 4, 0, 4, T, 205); } noise(30, 180, 230); break;
      case V.STRIPE: for (let i = -T; i < T * 2; i += 12) for (let j = 0; j < T; j++) r(i + j, j, 6, 1, 36); break;
      case V.HAY: r(0, 0, T, T, 230); for (let i = 0; i < 70; i++) r(Math.floor(hash2(i, 1, 9) * T), Math.floor(hash2(i, 2, 9) * T), 5, 1, 170 + hash2(i, 3, 9) * 80); r(0, 10, T, 2, 130); r(0, 22, T, 2, 130); break;
      case V.PLANK: case V.WOOD: for (let c = 0; c < 4; c++) { r(c * 8, 0, 1, T, 130); r(c * 8 + 1, 0, 7, T, 205 + hash2(c, k, 3) * 45); for (let j = 0; j < 4; j++) r(c * 8 + 2 + (hash2(c, j, 4) * 5 | 0), hash2(j, c, 5) * T | 0, 1, 5, 170); } break;
      case V.CONC: r(0, 0, T, T, 232); noise(70, 170, 245); r(0, 15, T, 1, 192); r(15, 0, 1, T, 200); break;
      case V.BAG: r(0, 0, T, T, 150); for (let row = 0; row < 4; row++) for (let c = 0; c < 3; c++) { const bx2 = c * 16 - (row % 2) * 8; r(bx2 + 1, row * 8 + 1, 14, 6, 228); r(bx2 + 7, row * 8 + 3, 1, 2, 175); } break;
      case V.RUST: case V.JUNK: r(0, 0, T, T, 220); noise(140, 130, 255); r(0, 0, T, 1, 170); r(0, T - 1, T, 1, 170); for (const [a, b] of [[3, 3], [27, 3], [3, 27], [27, 27]]) r(a, b, 2, 2, 120); break;
      case V.RAID: r(0, 0, T, T, 230); noise(60, 170, 255); r(0, 13, T, 6, 120); break;
      default: r(0, 0, T, 1, 205); r(0, T - 1, T, 1, 205); r(0, 0, 1, T, 205); r(T - 1, 0, 1, T, 205); for (let i = 0; i < 9; i++) r(2 + ((i * 5) % 12) * 2, 2 + ((i * 7) % 12) * 2, 1, 1, 238);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { tex, C, Rw };
}
/** Atlas UV of a corner (u along the face, v up it, both 0..1) of a face of kind t. */
function atlasUV(t, u, v) { const A = R3.atlas, e = 0.05; return [((t % A.C) + e + u * (1 - 2 * e)) / A.C, 1 - (Math.floor(t / A.C) + e + (1 - v) * (1 - 2 * e)) / A.Rw]; }

/** A painted board texture: garage, exit, raiders, the Horde, petrol, bar. */
function signTex(kind) {
  R3.signTex = R3.signTex || {};
  if (R3.signTex[kind]) return R3.signTex[kind];
  const sq = kind === 'raid' || kind === 'horde' || kind === 'cult';
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = sq ? 256 : 96;
  const x = cv.getContext('2d'), Wd = cv.width, Hd = cv.height;
  const S = {
    garage: ['#26211c', '#ffc93c', 'OFFICINA'], exit: ['#1c3a24', '#c8ffb0', 'USCITA'], fuel: ['#e8e0cc', '#a62f28', 'BENZINA'], bar: ['#3a2418', '#ffd36a', 'BAR'],
    raid: ['#2a1210', '#e8dcc8', 'PREDONI'], horde: ['#1a0a08', '#ff5a40', "L'ORDA"], cult: ['#2a1408', '#e8905a', 'RUGGINE'],
    market: ['#2a1e10', '#ffd36a', 'MERCATO'], toll: ['#e8e0cc', '#a62f28', 'ALT · 4ª'], ratti: ['#1e1e1e', '#d0c0b0', 'RATTI'], village: ['#e8e0cc', '#3a5a2a', 'I POZZI'],
  }[kind];
  x.fillStyle = S[0]; x.fillRect(0, 0, Wd, Hd);
  x.strokeStyle = S[1]; x.lineWidth = 8; x.strokeRect(6, 6, Wd - 12, Hd - 12);
  x.fillStyle = S[1]; x.textAlign = 'center'; x.textBaseline = 'middle';
  if (sq) { // a skull and the name
    x.beginPath(); x.arc(128, 100, 58, 0, 6.3); x.fill(); x.fillRect(92, 134, 72, 44);
    x.fillStyle = S[0]; x.beginPath(); x.arc(104, 100, 17, 0, 6.3); x.arc(152, 100, 17, 0, 6.3); x.fill();
    x.beginPath(); x.moveTo(128, 116); x.lineTo(118, 136); x.lineTo(138, 136); x.fill();
    for (let i = 0; i < 4; i++) x.fillRect(99 + i * 18, 152, 6, 26);
    x.fillStyle = S[1]; x.font = 'bold 34px sans-serif'; x.fillText(S[2], 128, 220);
  } else if (kind === 'garage') { // a spanner before the word
    x.save(); x.translate(40, 48); x.rotate(-0.7); x.fillRect(-6, -22, 12, 48); x.beginPath(); x.arc(0, -24, 14, 0, 6.3); x.fill(); x.fillStyle = S[0]; x.fillRect(-5, -40, 10, 16); x.restore();
    x.fillStyle = S[1]; x.font = 'bold 44px sans-serif'; x.fillText(S[2], 150, 50);
  } else { x.font = 'bold ' + (kind === 'bar' ? 56 : 46) + 'px sans-serif'; x.fillText(S[2], 128, 50); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (R3.signTex[kind] = t);
}
/** A geometry made of boxes, cylinders, cones and rings [kind, sx, sy, sz, x, y, z, hex], with vertex colours. */
function partsGeo(parts) {
  const pos = [], nor = [], col = [], c = new THREE.Color();
  for (const [k, sx, sy, sz, px, py, pz, hex] of parts) {
    let g = k === 'cyl' ? new THREE.CylinderGeometry(sx / 2, sx / 2, sy, 10) : k === 'cone' ? new THREE.ConeGeometry(sx / 2, sy, 8) : k === 'torus' ? new THREE.TorusGeometry(sx / 2, sz, 6, 12) : new THREE.BoxGeometry(sx, sy, sz);
    if (k === 'torus' && sy !== 'up') g.rotateX(Math.PI / 2); // flat rings, or upright wheels
    g.translate(px, py + (k === 'torus' ? 0 : sy / 2), pz); // (a torus's sy is only its orientation) g = g.toNonIndexed();
    c.setHex(hex);
    const P = g.attributes.position, Nn = g.attributes.normal;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i)); col.push(c.r, c.g, c.b); }
    g.dispose();
  }
  const G = new THREE.BufferGeometry();
  G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  G.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  G.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return G;
}
/** The prop models (one instanced mesh each). */
function propModels() {
  return {
    barrel: partsGeo([['cyl', 0.62, 0.86, 0, 0, 0, 0, 0xffffff], ['cyl', 0.66, 0.06, 0, 0, 0.2, 0, 0xcccccc], ['cyl', 0.66, 0.06, 0, 0, 0.62, 0, 0xcccccc]]),
    crate: partsGeo([['box', 0.8, 0.7, 0.8, 0, 0, 0, 0x8a6a3c], ['box', 0.84, 0.08, 0.84, 0, 0.32, 0, 0x6a4e2a], ['box', 0.1, 0.72, 0.84, 0, 0, 0, 0x6a4e2a]]),
    tyres: partsGeo([['torus', 0.8, 0, 0.16, 0, 0.16, 0, 0x2a2828], ['torus', 0.8, 0, 0.16, 0, 0.46, 0, 0x2e2c2c], ['torus', 0.8, 0, 0.16, 0, 0.76, 0, 0x2a2828]]),
    pump: partsGeo([['box', 0.6, 0.15, 0.5, 0, 0, 0, 0x8a8a84], ['box', 0.46, 1.3, 0.36, 0, 0.15, 0, 0xc8302a], ['box', 0.36, 0.3, 0.38, 0, 1.0, 0, 0xe8e0cc], ['box', 0.08, 0.5, 0.08, 0.28, 0.55, 0, 0x222222]]),
    lamp: partsGeo([['cyl', 0.14, 4.2, 0, 0, 0, 0, 0x4a4e52], ['box', 1.1, 0.1, 0.12, 0.5, 4.1, 0, 0x4a4e52], ['box', 0.36, 0.14, 0.24, 1.0, 3.98, 0, 0xe8e4c0]]),
    antenna: partsGeo([['cyl', 0.08, 3.6, 0, 0, 0, 0, 0x9aa0a4], ['box', 0.7, 0.05, 0.05, 0, 2.6, 0, 0x9aa0a4], ['box', 0.5, 0.05, 0.05, 0, 3.1, 0, 0x9aa0a4], ['cone', 0.2, 0.3, 0, 0, 3.6, 0, 0xd03a2a]]),
    tank: partsGeo([['cyl', 1.6, 1.2, 0, 0, 0.3, 0, 0x7a6450], ['cone', 1.7, 0.5, 0, 0, 1.5, 0, 0x5a4a3c], ['box', 0.1, 0.3, 0.1, -0.6, 0, -0.6, 0x3a3a3a], ['box', 0.1, 0.3, 0.1, 0.6, 0, 0.6, 0x3a3a3a]]),
    well: partsGeo([['box', 0.1, 1.6, 0.1, -1, 0, 0, 0x5e4a38], ['box', 0.1, 1.6, 0.1, 1, 0, 0, 0x5e4a38], ['box', 2.4, 0.5, 0.9, 0, 1.6, 0, 0x8f3b26], ['cyl', 0.12, 1.9, 0, 0, 1.2, 0, 0x3a3a3a]]),
    beacon: partsGeo([['cyl', 0.5, 0.4, 0, 0, 0, 0, 0x8cff6a]]),
    fire: partsGeo([['cyl', 0.62, 0.86, 0, 0, 0, 0, 0x5a3a2a], ['cone', 0.5, 0.7, 0, 0, 0.86, 0, 0xff8a2a], ['cone', 0.3, 0.5, 0, 0.1, 0.9, 0.05, 0xffd34a]]),
    barrier: partsGeo([['box', 0.3, 1.1, 0.3, 0, 0, 0, 0x5a5a5a], ...Array.from({ length: 12 }, (_, i) => ['box', 1, 0.18, 0.18, i - 5.5, 0.9, 0, i % 2 ? 0xe8e0cc : 0xc8302a])]),
    bike: partsGeo([['torus', 0.6, 'up', 0.08, -0.55, 0.3, 0, 0x1a1a1a], ['torus', 0.6, 'up', 0.08, 0.55, 0.3, 0, 0x1a1a1a], ['box', 1.1, 0.3, 0.22, 0, 0.45, 0, 0xffffff], ['box', 0.06, 0.4, 0.5, 0.5, 0.7, 0, 0x777777]]),
    hook: partsGeo([['box', 0.06, 1.6, 0.06, 0, -1.6, 0, 0x333333], ['torus', 0.4, 0, 0.06, 0, -1.7, 0, 0xd8b030], ['box', 6.5, 0.25, 0.3, 0, -0.25, 0, 0xd8b030]]),
  };
}
/** Builds the prop meshes for the new world: instanced models, signboards, the site markers. */
function buildPropsView() {
  if (R3.propG) { R3.scene.remove(R3.propG); R3.propG.traverse(o => { if (o.userData.own) { o.geometry && o.geometry.dispose(); if (o.material && o.material.map && o.isSprite) o.material.map.dispose(); } }); }
  const G = new THREE.Group(); R3.propG = G; R3.scene.add(G);
  if (!R3.propModels) { R3.propModels = propModels(); R3.propMat = new THREE.MeshLambertMaterial({ vertexColors: true }); R3.propGlow = new THREE.MeshBasicMaterial({ vertexColors: true }); }
  R3.propInst = {};
  const props = world.props || [];
  for (const k of Object.keys(R3.propModels)) {
    const n = props.filter(p => p.k === k).length; if (!n) continue;
    const m = new THREE.InstancedMesh(R3.propModels[k], k === 'beacon' || k === 'fire' ? R3.propGlow : R3.propMat, n);
    m.castShadow = !CHEAP; m.receiveShadow = !CHEAP; m.frustumCulled = false; m.count = 0; m.setColorAt(0, new THREE.Color(1, 1, 1));
    G.add(m); R3.propInst[k] = m;
  }
  for (const p of props) if (p.k === 'sign') {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshLambertMaterial({ map: signTex(p.tex) })); b.userData.own = true; b.position.z = 0.05;
    const b2 = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshLambertMaterial({ map: signTex(p.tex) })); b2.userData.own = true; b2.rotation.y = Math.PI; b2.position.z = -0.05;
    const back = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.14, p.h + 0.14, 0.08), mat(0x3a2c22)); back.userData.own = true; back.castShadow = !CHEAP;
    const s = new THREE.Group(); s.add(back, b, b2); s.position.set(p.x, p.y, p.z); s.rotation.y = p.yaw;
    p.mesh = s; G.add(s);
  }
  // site markers: what each place is, floating over it once explored
  R3.markers = [];
  const S = world.sites; if (!S) return;
  const mk = (site, x, z, txt, col, icon) => { const sp = markerSprite(txt, col, icon); sp.position.set(x, 0, z); G.add(sp); R3.markers.push({ sp, site, x, z }); };
  for (const c of S.camps) mk(c, c.x + 0.5, c.z + 0.5, 'CAMPO PREDONI', '#ff6a50', 'skull');
  if (S.settle) mk(S.settle, S.settle.x, S.settle.z, FACTIONS[S.settle.fac].short.toUpperCase(), FACTIONS[S.settle.fac].col, 'flag');
  if (S.fortress) mk(S.fortress, S.fortress.x + 0.5, S.fortress.z + 0.5, S.fortress.kind === 'exit' ? 'USCITA' : S.fortress.name.toUpperCase(), S.fortress.kind === 'exit' ? '#8cff6a' : '#ff5a40', S.fortress.kind === 'exit' ? 'arrow' : 'skull');
  R3.propT = -1;
}
/** A floating label: an icon in a disc and the place's name. */
function markerSprite(txt, col, icon) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const x = cv.getContext('2d');
  x.font = 'bold 46px sans-serif'; const tw = x.measureText(txt).width;
  const w = Math.min(504, tw + 130), x0 = (512 - w) / 2;
  x.fillStyle = 'rgba(16,11,8,0.8)'; x.beginPath(); x.roundRect(x0, 20, w, 88, 44); x.fill();
  x.strokeStyle = col; x.lineWidth = 5; x.stroke();
  x.fillStyle = col; x.beginPath(); x.arc(x0 + 46, 64, 30, 0, 6.3); x.fill();
  x.fillStyle = '#1a120c'; x.save(); x.translate(x0 + 46, 64);
  if (icon === 'spanner') { x.rotate(-0.7); x.fillRect(-4, -12, 8, 30); x.beginPath(); x.arc(0, -14, 10, 0, 6.3); x.fill(); x.fillStyle = col; x.fillRect(-3.5, -26, 7, 11); }
  else if (icon === 'skull') { x.beginPath(); x.arc(0, -3, 15, 0, 6.3); x.fill(); x.fillRect(-9, 6, 18, 11); x.fillStyle = col; x.beginPath(); x.arc(-6, -3, 4.5, 0, 6.3); x.arc(6, -3, 4.5, 0, 6.3); x.fill(); }
  else if (icon === 'flag') { x.fillRect(-12, -16, 4, 32); x.beginPath(); x.moveTo(-8, -16); x.lineTo(16, -8); x.lineTo(-8, 0); x.fill(); }
  else { x.beginPath(); x.moveTo(-12, -14); x.lineTo(16, 0); x.lineTo(-12, 14); x.fill(); }
  x.restore();
  x.fillStyle = '#fff2d8'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(txt, x0 + 90, 66);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, fog: false }));
  sp.scale.set(12, 3, 1); sp.renderOrder = 40; sp.userData.own = true;
  return sp;
}
/** Each frame: props the tank drove over or whose voxel is gone disappear; unexplored ones are not drawn; markers float over their sites. */
function updatePropsView() {
  if (!R3.propG || !world.props) return;
  const now = performance.now(), tk = state.tank;
  if (tk && tk.alive) for (const p of world.props) if (!p.dead && p.crush && Math.abs(tk.x - p.x) < 2 && Math.abs(tk.z - p.z) < 2 && Math.hypot(tk.x - p.x, tk.z - p.z) < 1.8) { p.dead = true; R3.propT = -1; }
  const k = (cam.dist || 70) / 70;
  for (const m of R3.markers || []) {
    const on = !!tune.site_markers && scene === 'play' && explored(m.x, m.z) && !m.site.cleared; // not over the campaign map or the title
    m.sp.visible = on;
    if (on) { m.sp.position.y = hAt(m.x, m.z) + 8 + 4 * k; m.sp.scale.set(11 * k, 2.75 * k, 1); }
  }
  if (now - R3.propT < 400) return; R3.propT = now;
  const T = R3.decT, counts = {};
  for (const p of world.props) {
    if (!p.dead && p.ay >= 1 && !getV(p.ax, p.ay, p.az)) p.dead = true; // its voxel was blown away
    const vis = !p.dead && explored(p.x, p.z);
    if (p.k === 'sign') { if (p.mesh) p.mesh.visible = vis; continue; }
    const m = R3.propInst[p.k]; if (!m || !vis) continue;
    const n = counts[p.k] || 0;
    const y = p.hang || p.ay >= p.y - 1.5 ? p.y : surfaceAt(p.x, p.z, p.y);
    T.e.set(0, p.yaw + (p.k === 'barrel' || p.k === 'crate' ? hash2(p.x * 9 | 0, p.z * 9 | 0, 3) * 6.28 : 0), 0, 'YXZ'); T.q.setFromEuler(T.e); T.s.set(1, 1, 1); T.p.set(p.x, y, p.z);
    T.m.compose(T.p, T.q, T.s); m.setMatrixAt(n, T.m); T.c.setHex(p.col || 0xffffff); m.setColorAt(n, T.c);
    counts[p.k] = n + 1;
  }
  for (const key in R3.propInst) { const m = R3.propInst[key]; m.count = counts[key] || 0; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}
/** Where a prop set on the ground stands: the drawn surface of natural ground, or the top of what it was put on. */
function surfaceAt(x, z, y) { const ix = Math.floor(x), iz = Math.floor(z), h = hAt(ix, iz); return smoothLook() && TER.ground && h === TER.ground[ix + world.N * iz] ? terrainY(x, z) : h; }
/** Sky, fog, lights, water and ground tints of the map's biome; the void past the map is black. */
function applyBiomeView() {
  const B = BIOME(), sc = R3.scene;
  sc.background = new THREE.Color(0x000000);
  sc.fog.color.setHex(B.sky);
  if (!R3.hemi) sc.traverse(o => { if (o.isHemisphereLight) R3.hemi = o; });
  if (R3.hemi) { R3.hemi.color.setHex(B.hemi[0]); R3.hemi.groundColor.setHex(B.hemi[1]); R3.hemi.intensity = B.hemi[2]; }
  R3.sun.color.setHex(B.sun[0]); R3.sun.intensity = B.sun[1];
  R3.water.material.color.setHex(B.water[0]); R3.water.material.opacity = B.water[1];
  const U = R3.terU; if (U) for (const [k, u] of [['g', 'uTG'], ['m', 'uTM'], ['r', 'uTR'], ['a', 'uTA'], ['d', 'uTD']]) { const c = new THREE.Color(B.tint[k][0]); U[u].value.set(c.r, c.g, c.b, B.tint[k][1]); }
  PAL.conifer = B.conifer; PAL.leaf = B.leaf; PAL.dead = B.dead; PAL.tuft = B.tuft;
}
