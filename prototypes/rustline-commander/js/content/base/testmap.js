// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// The test map (title screen button "Mappa di test", or ?scene=test): no enemies, a drawn relief with every kind of
// ground (ramps, roads, a gorge, a mountain, a plateau, a cliff, a river with a ford), buildings, rocks and wrecks,
// and a few friendly squads, to try how vehicles and soldiers move, find their way and take cover.
'use strict';

/** The test sector: what genWorld and newRun read (world.spec). No camps, no patrols, no first raider wall. */
const TEST_SPEC = { test: true, camps: 0, outposts: 0, wrecks: 6, patrolK: 0, tier: 1, biome: 'desert', layout: 'villages', geos: ['hills'], shape: 'open', size: 160 };

/**
 * The drawn relief, after the generated one and before the sites (order 35): in canonical space, the start near
 * (22, 22) and the exit near (138, 138). The slopes step (55) turns its gentle rises into 1:2 ramps and keeps
 * every step of map_cliff or more a cliff wall.
 */
function wgTestRelief(G) {
  if (!(world.spec && world.spec.test)) return;
  const { N, WL, ns, canon } = G, Hf = G.Hf, base = WL + 4;
  const seg = (px, pz, ax, az, bx, bz) => { // distance from p to the segment a-b, and where along it (0..1)
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L2));
    return [Math.hypot(px - ax - dx * t, pz - az - dz * t), t];
  };
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const [cx, cz] = canon(x, z);
    let h = base + fbm(cx / 30, cz / 30, ns + 61, 3) * 3; // low rolling ground
    // 1. the mountain: a long ridge across the left side, 16 high, steep rock; a gorge 8 wide cuts it
    const [dm, tm] = seg(cx, cz, 20, 95, 95, 150);
    const gorge = Math.abs(tm - 0.45) * 95 < 4;
    if (dm < 16 && !gorge) h = Math.max(h, base + (dm < 9 ? 16 - dm * 0.4 : (16 - 9 * 0.4) * (16 - dm) / 7));
    // 2. the plateau: a mesa 7 high with cliff sides, one ramp up its south face
    const dp = Math.hypot(cx - 105, cz - 45);
    if (dp < 20) h = base + 7;
    const [dr, tr] = seg(cx, cz, 105, 65, 105, 82); // the ramp: 17 cells long, 8 wide
    if (dr < 4 && cz > 64) h = Math.max(h, base + 7 * (1 - tr));
    // 3. the escarpment: a cliff 4 high along a line, the high side to the north
    const [de] = seg(cx, cz, 55, 40, 85, 15);
    if ((cx - 55) * (15 - 40) - (cz - 40) * (85 - 55) > 0 && de < 18) h = Math.max(h, base + 4);
    // 4. low hills: a few round rises, gentle enough for the ramps
    for (const [hx, hz, hr, hh] of [[40, 60, 12, 4], [70, 75, 10, 3], [130, 100, 14, 5]]) { const d = Math.hypot(cx - hx, cz - hz); if (d < hr) h = Math.max(h, base + hh * (1 - d / hr)); }
    // 5. the river: across the way between start and exit, a ford where it is shallow
    const [dw, tw] = seg(cx, cz, 60, 170, 170, 60);
    if (dw < 8) h = Math.min(h, WL + 0.6 + (dw - 4) * 0.9);
    if (dw < 4) h = Math.min(h, Math.abs(tw - 0.72) < 0.05 ? WL - 0.6 : WL - 2.2);
    Hf[x + N * z] = h;
  }
  Object.assign(G, { river: [], lakes: [], mesa: [], wide: false, fords: [] });
}
registerWorldStep('testRelief', { order: 35, run: wgTestRelief });

/**
 * The test yard, near the start (order 72, after the sites' structures): one of each kind of structure, whole, on
 * level ground, to try how they are damaged and how they fall: a water tower, a petrol station, a silo, a brick
 * house, a four-storey block, a car wreck, a fence and a stack of bales; containers, a pylon, hedgehogs, a wall. world.testYard: its box.
 */
function wgTestYard(G) {
  world.testYard = null;
  if (!(world.spec && world.spec.test)) return;
  const st = G.sites.start, W = 50, D = 26;
  let A = null;
  for (const r of [20, 35, 55]) { A = findArea(W, D, { sites: [st], cx: st.x, cz: st.z, r, flat: 4, road: 1, margin: 2, tries: 200 }); if (A) break; }
  if (!A) return;
  levelGround(A.x, A.z, W, D, A.g, 1); recomputeArea(A.x - 2, A.z - 2, W + 4, D + 4);
  const x = A.x, z = A.z, g = A.g;
  waterTower(x + 2, z + 2, g);
  petrolStation(x + 10, z + 1, g);
  silo(x + 24, z + 4, g);
  buildHouse(x + 2, z + 15, 6, 5, g, { wall: V.BRICK, corner: V.CONC, roof: 'gable', roofT: V.TILE, chimney: true, face: [0, -1], ruin: 0 });
  buildHouse(x + 12, z + 15, 8, 8, g, { wall: V.CONC, corner: V.CONC, floors: 4, face: [0, -1], ruin: 0 });
  carWreck(x + 24, z + 16, g, true);
  for (let k = 0; k < 11; k++) if (k !== 5) put(x + 24 + k, g, z + 22, V.WOOD); // a fence with a gap
  for (let k = 0; k < 3; k++) { put(x + 30 + k, g, z + 10, V.HAY); put(x + 30 + k, g, z + 11, V.HAY); if (k < 2) put(x + 30 + k, g + 1, z + 10, V.HAY); }
  container(x + 38, z + 2, g, false, true); container(x + 41, z + 2, g, false, false); // obstacles and industry (iteration 48)
  pylon(x + 44, z + 10, g);
  for (let k = 0; k < 4; k++) hedgehog(x + 38 + k * 2, z + 18, g);
  perimWall(x + 37, z + 23, 13, true, g, V.BRICK);
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
  const m = ammoMax(); if (state.ammo && m) { state.ammo.he = Math.max(state.ammo.he, Math.round(m * 0.6)); state.ammo.ap = Math.max(state.ammo.ap, m - Math.round(m * 0.6)); state.ammo.frag = Math.max(state.ammo.frag, 10); } // rounds never run out here
});
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
  for (const [slots, k] of [[['rifle', 'rifle', 'rifle', 'mg'], 0.6], [['sniper', 'at'], -0.6], [['ltank'], 0.2], [['car'], -0.2], [['jeep'], 0]]) {
    const p = back(k, slots[0] === 'jeep' ? 14 : 9); const sq = addSquad(slots, p.x, p.z); if (sq) sq.order = { t: 'hold' }; // the usual posture: they fire at the targets in reach (Q in the order menu holds their fire)
  }
  state.scrap = 999;
  placeTargets();
  say('Test', 'Mappa di test: nessun nemico vero. Rampe, strada, gola nella montagna, altopiano con una rampa, scarpata, fiume con un guado, villaggi e rocce.', '#9fe3a0');
  if (world.testYard) say('Test', 'Cantiere vicino alla partenza: cisterna su gambe, pensilina, silos, casa, palazzo di 4 piani, auto, recinzione e balle, container, traliccio, cavalli di frisia e un muro, interi, per provare danni e crolli.', '#9fe3a0');
  say('Test', 'Davanti a te ' + TEST_TARGETS.length + ' bersagli da 15 a 70 m (alcuni dietro sacchi): non si muovono e non sparano, abbattuti ricompaiono dopo ' + TEST_RESPAWN + ' s. Colpi infiniti. Le squadre sparano ai bersagli a tiro: Q nel menu ordini (Non sparare) le ferma. Nuovi: la jeep con mitragliatrice e, col click destro su un bersaglio, il Fuoco di soppressione (S).', '#ffd36a');
}
