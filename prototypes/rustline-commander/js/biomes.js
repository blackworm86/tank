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
const BIOMES = {
  desert: { name: 'Deserto', sky: 0xdcc6a0, hemi: [0xffeedd, 0x5e5238, 1.35], sun: [0xfff0d8, 2.5], water: [0x4a6a5a, 0.84],
    tint: { g: [0xd8b47a, 0.78], m: [0x8a6a4a, 0.45], r: [0xb27a58, 0.3], a: [0xb8a080, 0.12], d: [0xcfa26a, 0.55] },
    trees: [0.04, 0.42], conifer: [0x4a5232, 0x55593a], leaf: [0x7d7440, 0x8a7a44, 0x6c7140], dead: [0x7a6a58, 0x8a7864, 0x6a5a4a],
    tuft: [0xc8b070, 0xb7a467, 0xd4bc80, 0xa89458], tufts: 0.45, mud: 0.3, map: { mesa: true, lakes: false, forest: 0.12, mountains: 1 } },
  forest: { name: 'Foresta', sky: 0xb4c0a6, hemi: [0xeef6e0, 0x3a4630, 1.3], sun: [0xfff2dc, 2.3], water: [0x2e4c42, 0.86],
    tint: { g: [0x5a7e36, 0.62], m: [0x4a3a28, 0.3], r: [0x7a806a, 0.25], a: [0x5a5a56, 0.05], d: [0x6e5a3e, 0.35] },
    trees: [0.5, 0.95], conifer: [0x2c4628, 0x34502c, 0x3c5a30, 0x284024], leaf: [0x4c7630, 0x5a8434, 0x66883a, 0x46682c], dead: [0x5d5148, 0x6a5a4a],
    tuft: [0x6f8a3c, 0x7e9446, 0x5f7a34, 0x8c9a50], tufts: 1.3, mud: 1, map: { mesa: false, lakes: true, forest: 1, mountains: 0.8 } },
  ice: { name: 'Ghiaccio', sky: 0xd2dbe4, hemi: [0xeaf2ff, 0x6a7482, 1.4], sun: [0xf2f6ff, 2.2], water: [0x9cb8c8, 0.95],
    tint: { g: [0xf0f4f8, 0.9], m: [0x8a96a2, 0.85], r: [0x8a929c, 0.45], a: [0xc8ccd2, 0.3], d: [0xdfe5ec, 0.8] },
    trees: [0.78, 0.84], conifer: [0x5e746a, 0x6c8278, 0x536860, 0x7a8e86], leaf: [0x7a8274, 0x6c7466], dead: [0x5a5450, 0x6a625c],
    tuft: [0xc8ccc4, 0xb4b8ae, 0xd8dcd4], tufts: 0.25, mud: 0.25, snow: true, map: { mesa: false, lakes: true, forest: 0.45, mountains: 1.3 } },
  ash: { name: 'Terre bruciate', sky: 0x9e968e, hemi: [0xdcd2c8, 0x3e3834, 1.25], sun: [0xffd6ae, 1.9], water: [0x3a3a32, 0.88],
    tint: { g: [0x6a625a, 0.76], m: [0x2a2826, 0.5], r: [0x5a5450, 0.4], a: [0x4a4846, 0.1], d: [0x5c544c, 0.62] },
    trees: [0.08, 0.2], conifer: [0x2e3028, 0x3a3a30], leaf: [0x4e4a38, 0x5a5440], dead: [0x3a3430, 0x2e2a28, 0x4a423c],
    tuft: [0x6a645a, 0x5a564e, 0x7a7266], tufts: 0.55, mud: 0.7, map: { mesa: true, lakes: false, forest: 0.35, mountains: 1 } },
};
const BIOME_IDS = ['desert', 'forest', 'ice', 'ash'];
/** What a zone is built of: its name, how much forest it keeps, and how many lone ruins. */
const LAYOUTS = {
  wild: { name: 'lande aperte', forestK: 1, ruins: 1 },
  rural: { name: 'campagna', forestK: 0.7, ruins: 0.3 },
  villages: { name: 'villaggi', forestK: 0.8, ruins: 0.3 },
  city: { name: 'città distrutta', forestK: 0.2, ruins: 0 },
};
const LAYOUT_IDS = ['wild', 'rural', 'villages', 'city'];
/** The biome and layout of the map being built or played (config biome_force / layout_force override, for testing). */
function mapBiomeId() { const f = Math.round(tune.biome_force); return f ? BIOME_IDS[f - 1] : (world.spec && world.spec.biome) || 'desert'; }
function mapLayoutId() { const f = Math.round(tune.layout_force); return f ? LAYOUT_IDS[f - 1] : (world.spec && world.spec.layout) || 'wild'; }
function BIOME() { return BIOMES[world.biome] || BIOMES.desert; }
/** Fits the map preset to the biome and the layout (called by mapPreset). */
function biomePreset(P) {
  world.biome = mapBiomeId(); world.layout = mapLayoutId();
  const B = BIOMES[world.biome].map, L = LAYOUTS[world.layout];
  if (!tune.map_simple) { P.mesa = B.mesa; P.lakes = B.lakes; P.mountains *= B.mountains; }
  P.forest = Math.min(1, B.forest * L.forestK * (tune.map_simple ? 0.5 : 1));
  P.ruins = Math.round(P.ruins * L.ruins);
  if (world.layout === 'city') P.rocks = Math.round(P.rocks * 0.4);
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
 * A house: walls of `wall` with window rows (glass), a door 2 high on the side facing o.face, and a roof:
 * 'gable' (pitched, ridge along the long side, gable ends in the wall stuff), 'flat' (with a parapet) or
 * 'none'. Floors are 3 voxels tall. Registered as a building soldiers can enter.
 */
function buildHouse(x0, z0, w, d, g, o) {
  const fl = o.floors || 1, H = fl * 3 + (o.extra || 0), wall = o.wall;
  // the door side: the one facing o.face, else the south side
  const f = o.face || [0, 1];
  const side = Math.abs(f[0]) > Math.abs(f[1]) ? (f[0] > 0 ? 'e' : 'w') : (f[1] > 0 ? 's' : 'n');
  const dX = side === 'w' ? 0 : side === 'e' ? w - 1 : Math.floor(w / 2), dZ = side === 'n' ? 0 : side === 's' ? d - 1 : Math.floor(d / 2);
  const dw = o.doorW || 1;
  for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
    const ex = dx === 0 || dx === w - 1, ez = dz === 0 || dz === d - 1; if (!ex && !ez) continue;
    const corner = ex && ez, along = ez ? dx : dz;
    const onDoorSide = (side === 'n' && dz === 0) || (side === 's' && dz === d - 1) || (side === 'w' && dx === 0) || (side === 'e' && dx === w - 1);
    const dAt = ez ? dX : dZ;
    for (let y = 0; y < H; y++) {
      const isDoor = onDoorSide && !corner && Math.abs(along - dAt) < dw && y < (o.doorH || 2);
      if (isDoor) continue;
      let t = corner ? (o.corner || wall) : wall;
      const fy = y % 3;
      if (!corner && y < fl * 3) {
        if (o.shop && y < 2 && onDoorSide) t = V.GLASS; // a shop front: big panes at the ground floor
        else if (fy === 1 && along % 2 === 1 && !(onDoorSide && Math.abs(along - dAt) <= dw)) t = o.win === false ? wall : V.GLASS;
        else if (o.band && fy === 2) t = o.band;
      }
      put(x0 + dx, g + y, z0 + dz, t);
    }
  }
  const roof = o.roof || 'gable', rt = o.roofT || V.TILE;
  if (roof === 'flat') {
    fillBox(x0, g + H, z0, w, 1, d, o.roofSlab || V.CONC);
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) if (dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1) if ((dx + dz) % 5 !== 2) put(x0 + dx, g + H + 1, z0 + dz, wall);
  } else if (roof === 'gable') {
    const alongX = w >= d, span = alongX ? d : w, len = alongX ? w : d;
    for (let k = -1; k * 2 < span; k++) { // k = -1: the eaves, overhanging one cell along the long sides
      const y = g + H + Math.max(0, k) - (k < 0 ? 1 : 0);
      for (let l = 0; l < len; l++) for (const r of [k, span - 1 - k]) {
        if (alongX) put(x0 + l, y, z0 + r, rt); else put(x0 + r, y, z0 + l, rt);
      }
      if (k >= 0) for (let r = k + 1; r < span - 1 - k; r++) for (const l of [0, len - 1]) { // the gable ends
        if (alongX) put(x0 + l, y, z0 + r, wall); else put(x0 + r, y, z0 + l, wall);
      }
    }
    if (o.chimney) for (let y = H; y < H + Math.ceil(span / 2) + 2; y++) put(x0 + 1, g + y, z0 + 1, V.BRICK);
  }
  // the doorstep outside kept clear, and the building registered for its garrison
  const ox = x0 + dX + (side === 'w' ? -1 : side === 'e' ? 1 : 0), oz = z0 + dZ + (side === 'n' ? -1 : side === 's' ? 1 : 0);
  if (inMap(ox, oz)) for (let y = g; y < g + 3; y++) if (!GROUNDV.has(getV(ox, y, oz))) world.vox[vi(ox, y, oz)] = 0;
  return registerBuilding(x0, z0, w, d, g, H, dX, dZ);
}
/** An upright cylinder shell of voxels (silos, fuel and water tanks), a cone cap on top. */
function cylinder(cx, cz, r, g, h, t, band, cap) {
  const R = Math.ceil(r);
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const d = Math.hypot(dx, dz); if (d > r + 0.35) continue;
    const shell = d > r - 1.1;
    for (let y = 0; y < h; y++) if (shell || y === 0) put(Math.round(cx + dx), g + y, Math.round(cz + dz), band && y % 4 === 3 ? band : t);
  }
  if (cap) for (let k = 0; k < Math.ceil(r); k++) {
    const rr = r - k - 0.5;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) if (Math.hypot(dx, dz) <= rr + 0.35) put(Math.round(cx + dx), g + h + k, Math.round(cz + dz), cap);
  }
}
/** A wrecked car: rusty or painted body, broken glass. Cover for infantry. */
function carWreck(x, z, g, ax) {
  const body = [V.RUST, V.JUNK, V.METAL, V.RAID, V.PLAST][Math.floor(rng() * 5)];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 2; b++) {
    const xx = x + (ax ? a : b), zz = z + (ax ? b : a);
    put(xx, g, zz, body);
    if (a === 1 || a === 2) put(xx, g + 1, zz, rng() < 0.6 ? V.GLASS : body);
  }
}

// ---- Rural, village and city buildings ------------------------------------------------------------------------
/** A farmhouse: plastered walls, a tiled pitched roof with a chimney. */
function farmhouse(x, z, g, face) { return buildHouse(x, z, 6, 5, g, { wall: rng() < 0.6 ? V.PLAST : V.BRICK, corner: V.BRICK, roof: 'gable', roofT: V.TILE, chimney: true, face }); }
/** A barn: red planks, a big door 3 wide on a short side, a metal pitched roof, hay bales by it. */
function barn(x, z, g, face) {
  const b = buildHouse(x, z, 7, 9, g, { wall: V.PLANK, corner: V.WOOD, roof: 'gable', roofT: V.METAL, extra: 1, win: false, doorW: 2, doorH: 3, face });
  for (let k = 0; k < 3; k++) { put(x - 2, g, z + 2 + k * 2, V.HAY); if (k !== 1) put(x - 2, g + 1, z + 2 + k * 2, V.HAY); }
  return b;
}
/** A grain silo: a tall ribbed cylinder with a cone cap. */
function silo(x, z, g) { cylinder(x, z, 2.2, g, 9, V.METAL, V.STRIPE, V.METAL); }
/** A water tower: four wooden legs, a tank and a cap on top. */
function waterTower(x, z, g) {
  for (const [a, b] of [[0, 0], [3, 0], [0, 3], [3, 3]]) for (let y = 0; y < 6; y++) put(x + a, g + y, z + b, V.WOOD);
  fillBox(x, g + 6, z, 4, 1, 4, V.WOOD);
  cylinder(x + 1.5, z + 1.5, 1.9, g + 7, 3, V.METAL, null, V.RUST);
}
/** A church: a plastered nave with a tiled roof and a bell tower with open arches and a cross. */
function church(x, z, g, face) {
  const b = buildHouse(x, z, 6, 10, g, { wall: V.PLAST, corner: V.CONC, roof: 'gable', roofT: V.TILE, extra: 1, face: [0, 1] });
  const tx = x + 1, tz = z - 3; // the tower behind the nave, away from the door
  for (let dz = 0; dz < 3; dz++) for (let dx = 0; dx < 3; dx++) for (let y = 0; y < 12; y++) {
    const edge = dx !== 1 || dz !== 1; if (!edge && y < 11) continue;
    if (y >= 8 && y <= 9 && (dx === 1 || dz === 1)) continue; // the bell arches
    put(tx + dx, g + y, tz + dz, y === 7 || y === 10 ? V.CONC : V.PLAST);
  }
  const cx = tx + 1, cz = tz + 1;
  put(cx, g + 12, cz, V.TILE);
  for (let y = 13; y < 16; y++) put(cx, g + y, cz, V.WOOD);
  put(cx - 1, g + 14, cz, V.WOOD); put(cx + 1, g + 14, cz, V.WOOD);
  return b;
}
/** A city block: two to four storeys of concrete or brick, window rows, maybe a shop front, a flat roof, half shot away. */
function cityBlock(x, z, w, d, g, face) {
  const floors = 2 + Math.floor(rng() * 3), brick = rng() < 0.45;
  const b = buildHouse(x, z, w, d, g, { wall: brick ? V.BRICK : V.CONC, corner: V.CONC, band: brick ? V.CONC : null, roof: 'flat', roofSlab: V.CONC, floors, shop: rng() < 0.5, face });
  const H = floors * 3;
  if (rng() < 0.5) { const rx = x + 1 + Math.floor(rng() * (w - 3)), rz = z + 1 + Math.floor(rng() * (d - 3)); addProp('tank', rx + 0.5, g + H + 1, rz + 0.5, { ay: g + H }); }
  if (rng() < 0.4) addProp('antenna', x + w - 1.5, g + H + 1, z + 1.5, { ay: g + H, ax: x + w - 2, az: z + 1 });
  // the war: a corner or two blown out, rubble spilt round the foot
  for (let k = 0; k < 1 + Math.floor(rng() * 2); k++) {
    const cx = x + (rng() < 0.5 ? 0 : w - 1), cz = z + (rng() < 0.5 ? 0 : d - 1), cy = g + 3 + rng() * H, r = 2 + rng() * 2.2;
    for (let dz = -4; dz <= 4; dz++) for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) {
      if (dx * dx + dz * dz + dy * dy > r * r || cy + dy < g + 3) continue;
      const xx = cx + dx, zz = cz + dz, yy = Math.floor(cy + dy); if (!inMap(xx, zz) || yy >= VH || xx < x || zz < z || xx >= x + w || zz >= z + d) continue; // only its own walls
      const t = world.vox[vi(xx, yy, zz)]; if (t && !GROUNDV.has(t)) world.vox[vi(xx, yy, zz)] = 0;
    }
    const sx = Math.sign(cx - x - w / 2) || 1, sz = Math.sign(cz - z - d / 2) || 1;
    for (let n = 0; n < 9; n++) {
      const rx = cx + sx * (1 + Math.floor(rng() * 3)), rz = cz + sz * (1 + Math.floor(rng() * 3));
      if (!inMap(rx, rz) || buildingAt(rx + 0.5, rz + 0.5)) continue;
      put(rx, colTop(rx, rz), rz, rng() < 0.5 ? (brick ? V.BRICK : V.CONC) : V.JUNK);
    }
  }
  return b;
}
/** A desert hut: adobe walls, a flat roof with a low parapet, small windows. */
function adobeHut(x, z, g, face) { return buildHouse(x, z, 4 + Math.floor(rng() * 3), 4 + Math.floor(rng() * 2), g, { wall: V.ADOBE, roof: 'flat', roofSlab: V.ADOBE, face }); }
/** A tin shack: corrugated walls and roof. */
function shack(x, z, g, face) { return buildHouse(x, z, 5, 4, g, { wall: V.METAL, corner: V.RUST, roof: 'gable', roofT: V.RUST, face }); }
/** A petrol station: a canopy on four posts over two pumps, a little shop, a sign. */
function petrolStation(x, z, g) {
  for (const [a, b] of [[0, 0], [5, 0], [0, 3], [5, 3]]) for (let y = 0; y < 3; y++) put(x + a, g + y, z + b, V.METAL);
  for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) put(x + a, g + 3, z + b, a === 0 || a === 5 || b === 0 || b === 3 ? V.STRIPE : V.METAL);
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
function onArea(A, w, d, make) { if (!A) return false; levelGround(A.x, A.z, w, d, A.g, 1); recomputeArea(A.x - 2, A.z - 2, w + 4, d + 4); make(A.x, A.z, A.g); recomputeArea(A.x - 5, A.z - 5, w + 10, d + 10); return true; }
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
  recomputeArea(C.x - 2, C.z - 2, 16, 16);
  if (rng() < 0.65) church(C.x + 3, C.z + 2, C.g, [0, 1]);
  else { cylinder(cx, cz, 1.6, C.g, 1, V.CONC, null, null); addProp('well', cx + 0.5, C.g + 1, cz + 0.5, { ay: C.g }); }
  recomputeArea(C.x - 4, C.z - 4, 20, 20);
  let n = 0;
  for (let k = 0; k < 24 && n < 7; k++) {
    const a = rng() * 6.283, rr = 13 + rng() * 6, w = 5 + Math.floor(rng() * 3), d = 5 + Math.floor(rng() * 2);
    const hx = Math.round(cx + Math.cos(a) * rr - w / 2), hz = Math.round(cz + Math.sin(a) * rr - d / 2);
    if (hx < 5 || hz < 5 || hx + w > world.N - 5 || hz + d > world.N - 5 || !areaOK(hx, hz, w, d, 1, 3, 2, sites)) continue;
    const face = [cx - (hx + w / 2), cz - (hz + d / 2)];
    onArea({ x: hx, z: hz, g: areaG(hx, hz, w, d) }, w, d, (x, z, gg) => buildHouse(x, z, w, d, gg, { wall: [V.PLAST, V.BRICK, V.PLAST, V.ADOBE][Math.floor(rng() * 4)], corner: V.BRICK, roof: 'gable', roofT: rng() < 0.75 ? V.TILE : V.METAL, chimney: rng() < 0.5, floors: rng() < 0.25 ? 2 : 1, face }));
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
  const L = world.layout, desert = world.biome === 'desert';
  if (L === 'rural') for (let k = 0; k < 6; k++) farmstead(placed);
  if (L === 'villages') { for (let k = 0; k < 3; k++) village(placed); for (let k = 0; k < 2; k++) farmstead(placed); }
  if (L === 'city') cityGrid(placed, ns);
  if (L === 'wild') for (let k = 0; k < 4; k++) { const A = findArea(6, 6, { sites: placed }); onArea(A, 6, 6, (x, z, g) => (desert ? adobeHut : shack)(x, z, g, [rng() - 0.5, rng() - 0.5])); }
  const rm = sites.roadMain; // a petrol station beside the main road
  if (rm && rm.length > 40 && rng() < 0.8) {
    const p = rm[Math.floor(rm.length * (0.4 + rng() * 0.3))];
    const A = findArea(9, 10, { sites: placed, cx: p[0], cz: p[1], r: 12, road: 2, tries: 90 });
    onArea(A, 9, 10, (x, z, g) => petrolStation(x, z, g));
  }
  for (let k = 0; k < P.ruins; k++) { const s = freeSpot(18, 2); if (s) { buildRuin(s); recomputeAll(); } }
}

// ---- The sites, rebuilt ---------------------------------------------------------------------------------------
/** A friendly outpost: a wall of sandbags and metal panels with posts and striped gates, corner watchtowers, barracks, a fuel tank, the garage. */
function buildOutpost(s, home) {
  const g = s.g, R = 13, N = world.N;
  if (!home) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { // the start has no wall (M9)
    if (Math.abs(dx) !== R && Math.abs(dz) !== R) continue;
    const along = Math.abs(dx) === R ? Math.abs(dz) : Math.abs(dx);
    if (along <= 4) continue; // four gates 9 wide
    let road = false; // and a gap wherever a road runs through the wall
    for (let a = -2; a <= 2 && !road; a++) for (let b = -2; b <= 2; b++) if (inMap(s.x + dx + a, s.z + dz + b) && world.road[s.x + dx + a + N * (s.z + dz + b)]) { road = true; break; }
    if (road) continue;
    const post = along % 4 === 1, h = post ? 3 : 2;
    for (let y = 0; y < h; y++) put(s.x + dx, g + y, s.z + dz, along === 5 ? V.STRIPE : post ? V.CONC : (y === 1 ? V.METAL : V.BAG));
  }
  if (!home) for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { // corner towers
    const x0 = s.x + ax * R - (ax > 0 ? 2 : 0), z0 = s.z + az * R - (az > 0 ? 2 : 0);
    let road = false; for (let b = -1; b <= 3 && !road; b++) for (let a = -1; a <= 3; a++) if (inMap(x0 + a, z0 + b) && world.road[x0 + a + N * (z0 + b)]) { road = true; break; }
    if (road) continue;
    for (const [a, b] of [[0, 0], [2, 0], [0, 2], [2, 2]]) for (let y = 0; y < 4; y++) put(x0 + a, g + y, z0 + b, V.WOOD);
    fillBox(x0, g + 4, z0, 3, 1, 3, V.WOOD);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (a !== 1 || b !== 1) put(x0 + a, g + 5, z0 + b, V.BAG);
  }
  // barracks in the corners no road crosses, doors toward the yard; the fuel tank in a free corner left over
  const corners = [[-9, -9], [5, -9], [-9, 5], [5, 5]].filter(([a, b]) => {
    for (let dz = -1; dz <= 4; dz++) for (let dx = -1; dx <= 5; dx++) if (inMap(s.x + a + dx, s.z + b + dz) && world.road[s.x + a + dx + N * (s.z + b + dz)]) return false;
    return true;
  });
  corners.slice(0, 3).forEach(([a, b], k) => {
    buildHouse(s.x + a, s.z + b, 5, 4, g, { wall: k === 1 ? V.PLAST : V.METAL, corner: V.RUST, roof: 'gable', roofT: k === 1 ? V.TILE : V.METAL, face: [0, b < 0 ? 1 : -1] });
    if (k === 0) { // the flag on a pole beside the first barracks, a radio mast on its roof
      const fx = s.x + a + (a < 0 ? 5 : -1), fz = s.z + b + 1;
      for (let y = 0; y < 8; y++) put(fx, g + y, fz, V.METAL);
      for (let y = 6; y < 8; y++) for (let q = 1; q <= 3; q++) put(fx, g + y, fz + q, (y === 7 && q === 3) ? V.YEL : V.GREEN);
      addProp('antenna', s.x + a + 2.5, g + 5, s.z + b + 2.5, { ay: g + 3, ax: s.x + a + 2, az: s.z + b + 1 });
    }
  });
  const ft = corners[3];
  if (ft) { const fx = s.x + ft[0] + 2, fz = s.z + ft[1] + 2; fillBox(fx - 2, g, fz - 2, 5, 1, 5, V.CONC); cylinder(fx, fz, 1.7, g + 1, 3, V.METAL, V.STRIPE, V.RUST); }
  for (let k = 0; k < 4; k++) addProp('barrel', s.x - 3 + k * 0.9, g, s.z + 3.5 + (k % 2) * 0.8, { ay: g - 1, crush: true, col: k % 2 ? 0x56693a : 0x8e4b27 });
  addProp('crate', s.x + 3.5, g, s.z - 3.5, { ay: g - 1, crush: true }); addProp('crate', s.x + 4.4, g, s.z - 3.3, { ay: g - 1, crush: true });
  buildGarage(s, home ? 11 : R);
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
/** A raider camp: a palisade of stakes with spikes, a concrete bunker with gun slits and sandbags on top, tents, a watchtower, a skull banner. */
function buildCamp(c) {
  const g = c.g, tier = c.tier;
  c.spots = [];
  for (let a = 0; a < 64; a++) {
    const ang = a / 64 * Math.PI * 2;
    if ((a % 16) < 3) continue; // four ways in
    const x = Math.round(c.x + Math.cos(ang) * 6.5), z = Math.round(c.z + Math.sin(ang) * 6.5);
    put(x, g, z, tier >= 3 ? V.BAG : V.JUNK); put(x, g + 1, z, a % 3 ? V.WOOD : V.RUST);
    if (a % 3 === 0 || tier >= 2) put(x, g + 2, z, a % 2 ? V.WOOD : V.RAID); // the stakes' points
    if (a % 5 === 0) c.spots.push({ x: c.x + 0.5 + Math.cos(ang) * 5.2, z: c.z + 0.5 + Math.sin(ang) * 5.2 });
  }
  // the bunker: concrete, a red band, gun slits on every side, a door, sandbags round the roof
  for (let dz = 0; dz < 5; dz++) for (let dx = 0; dx < 5; dx++) {
    const edge = dx === 0 || dz === 0 || dx === 4 || dz === 4, x = c.x - 2 + dx, z = c.z - 2 + dz;
    if (edge) for (let y = 0; y < 3; y++) {
      if (dz === 4 && dx === 2 && y < 2) continue; // the door
      if (y === 1 && (dx === 2 || dz === 2)) continue; // slits
      put(x, g + y, z, y === 2 ? V.RAID : V.CONC);
    }
    put(x, g + 3, z, V.CONC);
    if (edge && (dx + dz) % 4 !== 1) put(x, g + 4, z, V.BAG);
  }
  registerBuilding(c.x - 2, c.z - 2, 5, 5, g, 3, 2, 4);
  for (const [tx, tz] of [[-5, -1], [3, -1]]) // two tents, A-frames of canvas
    for (let l = 0; l < 3; l++) { put(c.x + tx, g, c.z + tz + l, V.CLOTH); put(c.x + tx + 2, g, c.z + tz + l, V.CLOTH); put(c.x + tx + 1, g + 1, c.z + tz + l, V.CLOTH); }
  // the watchtower, 3 cells clear of the bunker (M9): legs, a platform, sandbags, a tin roof on posts
  const tx = c.x + 2, tz = c.z - 8;
  for (const [a, b] of [[0, 0], [2, 0], [0, 2], [2, 2]]) for (let y = 0; y < 7; y++) put(tx + a, g + y, tz + b, V.WOOD);
  fillBox(tx, g + 4, tz, 3, 1, 3, V.WOOD);
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { if ((a !== 1 || b !== 1) && !(a === 1 && b === 2)) put(tx + a, g + 5, tz + b, V.BAG); put(tx + a, g + 7, tz + b, V.RAID); }
  c.tower = { x: tx + 1.5, z: tz + 1.5 };
  // the banner on its pole, junk heaps, burning barrels
  for (let y = 0; y < 7; y++) put(c.x - 6, g + y, c.z + 6, V.WOOD);
  addProp('sign', c.x - 6 + 0.5, g + 5.6, c.z + 6 + 0.5, { yaw: Math.PI / 4, tex: 'raid', w: 2.4, h: 2.4, ax: c.x - 6, ay: g + 6, az: c.z + 6 });
  for (let k = 0; k < 4; k++) { const x = c.x - 4 + k * 2, z = c.z + 8; put(x, g, z, V.JUNK); if (k % 2) put(x, g + 1, z, V.RUST); }
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
  const sq = kind === 'raid' || kind === 'horde';
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = sq ? 256 : 96;
  const x = cv.getContext('2d'), Wd = cv.width, Hd = cv.height;
  const S = {
    garage: ['#26211c', '#ffc93c', 'OFFICINA'], exit: ['#1c3a24', '#c8ffb0', 'USCITA'], fuel: ['#e8e0cc', '#a62f28', 'BENZINA'], bar: ['#3a2418', '#ffd36a', 'BAR'],
    raid: ['#2a1210', '#e8dcc8', 'PREDONI'], horde: ['#1a0a08', '#ff5a40', "L'ORDA"],
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
    if (k === 'torus') g.rotateX(Math.PI / 2);
    g.translate(px, py + (k === 'torus' ? 0 : sy / 2), pz); g = g.toNonIndexed();
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
  for (const o of [S.start, ...S.outposts]) if (o.shed) mk(o, o.shed.x, o.shed.z, 'GARAGE', '#ffc93c', 'spanner');
  for (const c of S.camps) mk(c, c.x + 0.5, c.z + 0.5, 'CAMPO PREDONI', '#ff6a50', 'skull');
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
