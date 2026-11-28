// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// The test map (title screen button "Mappa di test", or ?scene=test): 256 m, no enemies, a drawn relief with every kind of
// ground (ramps, roads, a gorge, a mountain, a plateau, a cliff, a river with a ford), an asset gallery, rocks and wrecks,
// and a few friendly squads, to try how vehicles and soldiers move, find their way and take cover.
'use strict';

/** The test sector: what genWorld and newRun read (world.spec). No camps, no patrols, no first raider wall. */
const TEST_SPEC = { test: true, camps: 0, outposts: 0, wrecks: 6, patrolK: 0, tier: 1, biome: 'desert', layout: 'villages', geos: ['hills'], shape: 'open', size: 256 };
/** The asset gallery's size in metres: a flat square beside the start with one of each structure in rows. */
const TEST_YARD_W = 88, TEST_YARD_D = 60;

/**
 * The drawn relief, after the generated one and before the sites (order 35), laid out in canonical space for a
 * 256 m map (scaled to another size): the start on the diagonal near (22..53, same), the exit past the river near
 * (203..234, same). Off the diagonal on the right of the way, a flat square for the asset gallery (wgTestYard);
 * on the left, a ridge with a gorge, a mesa with one ramp; an escarpment, low hills, a river with a ford. The slopes
 * step (55) turns gentle rises into 1:2 ramps and keeps every step of map_cliff or more a cliff wall.
 */
function wgTestRelief(G) {
  if (!(world.spec && world.spec.test)) return;
  const { N, WL, ns, canon, real } = G, Hf = G.Hf, base = WL + 4, k = N / 256;
  const seg = (px, pz, ax, az, bx, bz) => { // distance from p to the segment a-b, and where along it (0..1)
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
    return [Math.hypot(px - ax - dx * t, pz - az - dz * t), t];
  };
  // the gallery: an axis-aligned square in the real map round the canonical point (115, 35), right of the start
  const gc = real(115 * k, 35 * k), W = TEST_YARD_W, D = TEST_YARD_D;
  const yx = Math.max(6, Math.min(N - 6 - W, gc.x - (W >> 1))), yz = Math.max(6, Math.min(N - 6 - D, gc.z - (D >> 1)));
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const [c0, c1] = canon(x, z), cx = c0 / k, cz = c1 / k;
    let h = base + fbm(cx / 30, cz / 30, ns + 61, 3) * 3; // low rolling ground
    // 1. the ridge: 16 high, steep rock, on the left of the way; a gorge 8 wide cuts it
    const [dm, tm] = seg(cx, cz, 15, 110, 60, 165);
    const gorge = Math.abs(tm - 0.5) * 71 < 4;
    if (dm < 16 && !gorge) h = Math.max(h, base + (dm < 9 ? 16 - dm * 0.4 : (16 - 9 * 0.4) * (16 - dm) / 7));
    // 2. the mesa: 7 high with cliff sides, one ramp down its east face
    if (Math.hypot(cx - 95, cz - 185) < 18) h = base + 7;
    const [dr, tr] = seg(cx, cz, 112, 185, 130, 185); // the ramp: 18 long, 8 wide
    if (dr < 4 && cx > 111) h = Math.max(h, base + 7 * (1 - tr));
    // 3. the escarpment: a cliff 4 high along a line near the start, the high side away from it
    const [de] = seg(cx, cz, 30, 75, 60, 100);
    if ((cx - 30) * (100 - 75) - (cz - 75) * (60 - 30) < 0 && de < 18) h = Math.max(h, base + 4);
    // 4. low hills: round rises, gentle enough for the ramps
    for (const [hx, hz, hr, hh] of [[95, 130, 12, 4], [175, 135, 12, 3], [125, 100, 10, 3]]) { const d = Math.hypot(cx - hx, cz - hz); if (d < hr) h = Math.max(h, base + hh * (1 - d / hr)); }
    // 5. the river: across the way between start and exit, a ford where it is shallow
    const [dw, tw] = seg(cx, cz, 100, 240, 240, 100);
    if (dw < 8) h = Math.min(h, WL + 0.6 + (dw - 4) * 0.9);
    if (dw < 4) h = Math.min(h, Math.abs(tw - 0.5) < 0.04 ? WL - 0.6 : WL - 2.2);
    // 6. the gallery: level, the ground round it blending in over 8 m
    const ox = Math.max(yx - x, 0, x - (yx + W - 1)), oz = Math.max(yz - z, 0, z - (yz + D - 1)), od = Math.hypot(ox, oz);
    if (od < 8) h = base + (h - base) * od / 8;
    Hf[x + N * z] = h;
  }
  keepArea(yx, yz, W, D, 3); // nothing else is built in the gallery, no tree grows there
  Object.assign(G, { river: [], lakes: [], mesa: [], wide: false, fords: [], testYard: { x: yx, z: yz } });
}
registerWorldStep('testRelief', { order: 35, run: wgTestRelief });

/**
 * The asset gallery (order 72, after the sites' structures), on the flat square the relief left: one of each kind,
 * whole, in three rows, to look at them and try how they are damaged and fall.
 * Row 1, houses: brick cottage, plastered farmhouse, adobe hut, tin shack, barn, church, bunker, petrol station,
 * a half-ruined house. Row 2, the city: brick block, L, U and court blocks, a concrete frame with shops and
 * balconies, a tower of 12 storeys, a tower shot to its skeleton. Row 3, obstacles: water towers (wood, steel), a
 * silo, a hangar, containers (single, stacked, both ways), a pylon, hedgehogs, perimeter walls (brick, concrete),
 * wooden fences, sandbag walls (low, two high, an emplacement), hay, car wrecks, crates, barrels, tyres, a well.
 * world.testYard: its box.
 */
function wgTestYard(G) {
  world.testYard = null;
  if (!(world.spec && world.spec.test) || !G.testYard) return;
  const W = TEST_YARD_W, D = TEST_YARD_D, x = G.testYard.x, z = G.testYard.z, N = world.N;
  for (let dz = -3; dz < D + 3; dz++) for (let dx = -3; dx < W + 3; dx++) if (inMap(x + dx, z + dz)) world.road[x + dx + N * (z + dz)] = 0; // no road through it
  const g = areaG(x, z, W, D);
  levelGround(x, z, W, D, g, 1); recomputeArea(x - 2, z - 2, W + 4, D + 4);
  const H = (dx, dz, w, d, o) => buildHouse(x + dx, z + dz, w, d, g, Object.assign({ face: [0, -1], ruin: 0 }, o));
  const P = (dx, dz, t) => put(x + dx, g, z + dz, t), P2 = (dx, dz, t) => { put(x + dx, g, z + dz, t); put(x + dx, g + 1, z + dz, t); };
  // row 1: houses
  H(2, 3, 6, 5, { wall: V.BRICK, corner: V.CONC, roof: 'gable', roofT: V.TILE, chimney: true });
  H(11, 2, 7, 6, { wall: V.PLAST, corner: V.BRICK, roof: 'gable', roofT: V.TILE, chimney: true, floors: 2 });
  H(21, 3, 5, 5, { wall: V.ADOBE, roof: 'flat', roofSlab: V.ADOBE });
  H(29, 3, 5, 4, { wall: V.METAL, corner: V.RUST, roof: 'shed', roofT: V.RUST });
  H(37, 2, 7, 9, { wall: V.PLANK, corner: V.WOOD, roof: 'gable', roofT: V.METAL, extra: 1, win: false, doorW: 2, doorH: 3 });
  for (let k = 0; k < 3; k++) { P(35, 4 + k * 2, V.HAY); if (k !== 1) put(x + 35, g + 1, z + 4 + k * 2, V.HAY); }
  H(47, 1, 6, 10, { wall: V.PLAST, corner: V.CONC, floors: 2, roof: 'gable', roofT: V.TILE, doorW: 2, doorH: 3 });
  H(56, 4, 4, 4, { wall: V.CONC, roof: 'flat', roofSlab: V.CONC });
  petrolStation(x + 63, z + 1, g);
  H(76, 3, 7, 7, { wall: V.PLAST, corner: V.BRICK, roof: 'shed', roofT: V.TILE, floors: 2, ruin: 0.35 });
  // row 2: the city
  H(2, 17, 8, 8, { wall: V.BRICK, corner: V.CONC, floors: 3 });
  H(13, 17, 10, 10, { wall: V.PLAST, corner: V.CONC, floors: 3, shape: 'L' });
  H(26, 17, 10, 10, { wall: V.CONC, corner: V.CONC, floors: 2, shape: 'U' });
  H(39, 16, 12, 12, { wall: V.BRICK, corner: V.CONC, floors: 2, shape: 'court' });
  H(54, 17, 8, 8, { wall: V.PLAST, corner: V.CONC, floors: 5, system: 'frame', shop: true, balcony: true });
  H(65, 16, 10, 10, { wall: V.BRICK, corner: V.CONC, floors: 12, system: 'frame', shop: true });
  H(78, 17, 8, 8, { wall: V.PLAST, corner: V.CONC, floors: 10, system: 'frame', skeleton: true });
  // row 3: obstacles and industry
  waterTower(x + 3, z + 36, g); waterTower(x + 11, z + 36, g, true);
  silo(x + 21, z + 39, g);
  H(27, 34, 12, 9, { wall: V.METAL, corner: V.CONC, floors: 2, hall: true, system: 'frame', roof: 'gable', roofT: V.METAL, doorW: 3, doorH: 3 });
  container(x + 42, z + 34, g, true, false); container(x + 42, z + 38, g, true, true);
  container(x + 50, z + 34, g, false, false); container(x + 54, z + 34, g, false, true);
  pylon(x + 61, z + 36, g);
  for (let k = 0; k < 5; k++) hedgehog(x + 71 + k * 3, z + 37 + (k % 2) * 2, g);
  perimWall(x + 2, z + 48, 14, true, g, V.BRICK); perimWall(x + 18, z + 48, 14, true, g, V.CONC);
  for (let k = 0; k < 14; k++) if (k !== 6) P(34 + k, 48, V.WOOD); // a fence with a gate
  for (let k = 1; k < 6; k++) P(34, 48 + k, V.WOOD); // and its side
  for (let k = 0; k < 8; k++) P(51 + k, 48, V.BAG); // a low sandbag wall
  for (let k = 0; k < 8; k++) P2(51 + k, 51, V.BAG); // a sandbag wall two high
  for (let k = 0; k < 6; k++) { P2(63 + k, 47, V.BAG); if (k < 4) { P2(63, 48 + k, V.BAG); P2(68, 48 + k, V.BAG); } } // an emplacement open at the back
  addProp('crate', x + 65.5, g, z + 49.5, { ay: g - 1, crush: true });
  for (let k = 0; k < 4; k++) { P(73 + k * 2, 49, V.HAY); P(74 + k * 2, 49, V.HAY); if (k % 2 === 0) put(x + 73 + k * 2, g + 1, z + 49, V.HAY); } // hay bales
  carWreck(x + 2, z + 54, g, true); carWreck(x + 9, z + 54, g, false); carWreck(x + 15, z + 54, g, true);
  for (let k = 0; k < 4; k++) addProp('crate', x + 24.5 + k * 1.2, g, z + 55.5, { ay: g - 1, crush: true });
  for (let k = 0; k < 4; k++) addProp('barrel', x + 30.5 + k * 0.9, g, z + 55.5 + (k % 2) * 0.9, { ay: g - 1, crush: true, col: [0xa62f28, 0x56693a, 0x7d8b92, 0xffd36a][k] });
  for (let k = 0; k < 3; k++) addProp('tyres', x + 36.5 + k * 1.4, g, z + 55.5, { ay: g - 1, crush: true });
  cylinder(x + 43, z + 55, 1.6, g, 1, V.CONC, null, null); addProp('well', x + 43.5, g + 1, z + 55.5, { ay: g });
  keepArea(x, z, W, D, 1); recomputeArea(x - 4, z - 4, W + 8, D + 8);
  world.testYard = { x, z, w: W, d: D, g };
}
registerWorldStep('testYard', { order: 72, run: wgTestYard });

/**
 * The practice targets ahead of the start, in the tank's view: raiders standing in the open and behind sandbags at
 * 15 to 70 m, a technical, a buggy and a scrap tank. They neither move, nor shoot, nor answer; one destroyed comes
 * back where it stood after TEST_RESPAWN seconds. [kind, metres ahead, metres to the right, sandbags in front]
 */
const TEST_TARGETS = [['r_rifle', 15, -4], ['r_rifle', 15, 4], ['r_rifle', 25, -8, true], ['r_mg', 25, 0, true], ['r_rifle', 25, 8, true],
  ['buggy', 32, -14], ['r_rifle', 40, -3], ['r_rifle', 40, 3], ['technical', 45, 14], ['r_rifle', 55, -6, true], ['r_rpg', 55, 6, true], ['r_tank', 65, -12], ['r_rifle', 70, 0]];
const TEST_RESPAWN = 6;
function placeTargets() {
  const tk = state.tank, s = Math.sin(tk.heading), c = Math.cos(tk.heading), g = newGroup('target', tk.x, tk.z, null);
  state.testTargets = { g, back: [], down: 0 };
  TEST_TARGETS.forEach(([kind, ahead, right, bags], i) => {
    const x = tk.x + s * ahead - c * right, z = tk.z + c * ahead + s * right, p = spotNear(x, z, i);
    if (bags) for (let k = -1; k <= 1; k++) { // a low sandbag wall between the target and the tank
      const bx = Math.floor(p.x - s * 1.5 - c * k), bz = Math.floor(p.z - c * 1.5 + s * k);
      if (inMap(bx, bz) && !world.road[bx + world.N * bz]) placeFine(bx, world.hmap[bx + world.N * bz], bz, V.BAG); // on the fine grid (js/structs.js)
    }
    addTarget(kind, p.x, p.z);
  });
}
function addTarget(kind, x, z) {
  const tk = state.tank, e = addRaider(state.testTargets.g, kind, x, z, 1, true);
  e.dummy = true; e.heading = e.turretYaw = Math.atan2(tk.x - x, tk.z - z); e.y = e.vy = e.veh ? surfaceY(x, z) : hAt(x, z);
  return e;
}
on('kill', e => {
  if (!e.dummy || !state.testTargets) return;
  const T = state.testTargets; T.down++; T.back.push({ kind: e.kind, x: e.homeSpot ? e.homeSpot.x : e.x, z: e.homeSpot ? e.homeSpot.z : e.z, t: state.t + TEST_RESPAWN });
  floatText(e.x, e.y + 2.6, e.z, 'abbattuto · ' + T.down, '#ffd36a');
});
on('playStep', () => {
  if (!state.test || !state.testTargets) return;
  const T = state.testTargets;
  for (let i = T.back.length - 1; i >= 0; i--) if (state.t >= T.back[i].t) { const b = T.back.splice(i, 1)[0]; addTarget(b.kind, b.x, b.z); }
  if (pressed('KeyY')) testNextWeapon(); // Y: the next main weapon, to try how each one hurts (T is an active system's key)
  const m = ammoMax(); if (state.ammo && m) { state.ammo.he = Math.max(state.ammo.he, Math.round(m * 0.6)); state.ammo.ap = Math.max(state.ammo.ap, m - Math.round(m * 0.6)); state.ammo.frag = Math.max(state.ammo.frag, 10); state.ammo.inc = Math.max(state.ammo.inc || 0, 10); } // rounds never run out here
});
/**
 * The test map's weapon switch (Y): mounts the next main weapon, owned at once, racks full. The HUD's line says what it
 * fires: its damage, its penetration and the round loaded (X changes it).
 */
function testNextWeapon() {
  const ids = weaponIds(), id = ids[(ids.indexOf(state.weapon) + 1) % ids.length];
  if (!state.weaponsOwned.includes(id)) state.weaponsOwned.push(id);
  state.weapon = id; state.stats = null; state.lookKey++; state.ammo = freshAmmo();
  const W = weaponStats(id);
  say('Test', WEAPONS[id].name + ': danno ' + Math.round(W.dmg) + (W.pen ? ', perforazione ' + W.pen + ' mm' : '') + (W.dtype ? ', solo ' + DTYPES[W.dtype].name : W.kind === 'shell' ? ', Tab cambia colpo (HE, AP, FRAG)' : ', proiettili') + '. Y: arma successiva.', '#ffd36a');
}
/** The fog switch as it was before the test map, put back when a campaign starts (null: nothing to put back). */
let TEST_FOG = null;
on('campaignStart', () => { if (TEST_FOG !== null) { CONFIG.fog.value = TEST_FOG; TEST_FOG = null; } });
/** Starts the test map: the hull picked on the title screen, no Horde, no mission, a few squads to order about, no fog. */
function startTestMap() {
  reset();
  TEST_FOG = CONFIG.fog.value; CONFIG.fog.value = 0; // the whole map in sight (F2 switches the fog back on)
  world.spec = Object.assign({}, TEST_SPEC); state.node = null; state.test = true; state.t = 0;
  newRun(null);
  state.mission = null; state.npcs = []; state.quests = []; // no mission, no Horde, no one met on the way
  const tk = state.tank, back = (k, d) => ({ x: tk.x - Math.sin(tk.heading + k) * d, z: tk.z - Math.cos(tk.heading + k) * d });
  for (const [slots, k] of [[['rifle', 'rifle', 'rifle', 'mg'], 0.6], [['sniper', 'at'], -0.6], [['ltank'], 0.2], [['recruit', 'recruit', 'recruit'], -0.2], [['jeep'], 0]]) {
    const p = back(k, slots[0] === 'jeep' ? 14 : 9); const sq = addSquad(slots, p.x, p.z); if (sq) sq.order = { t: 'hold' }; // the usual posture: they fire at the targets in reach (Q in the order menu holds their fire)
  }
  state.scrap = 999;
  placeTargets();
  say('Test', 'Mappa di test: nessun nemico vero. Rampe, strada, gola nella montagna, altopiano con una rampa, scarpata, fiume con un guado, villaggi e rocce.', '#9fe3a0');
  if (world.testYard) say('Test', 'Galleria degli asset a destra della partenza (88 x 60 m): case, fienile, chiesa, bunker, distributore; palazzi in mattoni, a L, a U, a corte, a telaio, una torre di 12 piani e uno scheletro; cisterne, silos, capannone, container, traliccio, cavalli di frisia, muri, staccionate, sacchi di sabbia, balle, auto, casse e barili. Tutto intero, per provare danni e crolli.', '#9fe3a0');
  say('Test', 'Y: cambia arma (25mm, mitragliatrice, lanciagranate, 75mm, 105mm, lanciarazzi HEAT); Tab: tipo di colpo (HE, AP, FRAG, INC incendiario). Sopra i bersagli: i numeri del danno (grigio: fermato dalla corazza, giallo: fianco o retro).', '#ffd36a');
  say('Test', 'Davanti a te ' + TEST_TARGETS.length + ' bersagli da 15 a 70 m (alcuni dietro sacchi): non si muovono e non sparano, abbattuti ricompaiono dopo ' + TEST_RESPAWN + ' s. Colpi infiniti. Le squadre sparano ai bersagli a tiro: Q nel menu ordini (Non sparare) le ferma. Nuovi: la jeep con mitragliatrice e, col click destro su un bersaglio, il Fuoco di soppressione (S).', '#ffd36a');
}
