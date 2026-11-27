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
  for (const [slots, k] of [[['rifle', 'rifle', 'rifle', 'mg'], 0.6], [['sniper', 'at'], -0.6], [['ltank'], 0.2], [['car'], -0.2]]) {
    const p = back(k, 9); const sq = addSquad(slots, p.x, p.z); if (sq) sq.order = { t: 'hold' };
  }
  state.scrap = 999;
  say('Test', 'Mappa di test: nessun nemico. Rampe, strada, gola nella montagna, altopiano con una rampa, scarpata, fiume con un guado, villaggi e rocce.', '#9fe3a0');
}
