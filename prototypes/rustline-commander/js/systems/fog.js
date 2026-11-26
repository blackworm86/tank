// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Fog of war: who is drawn, from what the tank and its friends in radio reach see. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Fog of war: the enemy is drawn only while the tank, or a friend in radio reach, sees it -----------
/** Marks each raider seen or not: in sight and line of sight of the tank or of a friend inside the radio ring; a shot gives it away for a moment. */
function updateFog() {
  const tk = state.tank, R = tankStats().radio;
  const eyes = state.ents.filter(f => f.alive && f.team === 0 && !f.inside && (f === tk || heardAt(f)));
  for (const e of state.ents) {
    if (e.team !== 1 || !e.alive) continue;
    if (!tune.fog) { e.seen = true; continue; }
    let s = state.t - (e.firedT || -99) < tune.fog_shot_reveal && tk.alive && dist2(e, tk) < (R + 25) ** 2;
    for (let k = 0; k < eyes.length && !s; k++) {
      const f = eyes[k], r = sightOf(f);
      if (dist2(f, e) <= r * r && canSee(f, e)) s = true;
    }
    e.seen = s || state.t < (e.pingT || 0); // a radar pulse shows them for a while
  }
}
/**
 * The fog drawn on the map: which 2x2 cells the tank and the friends in radio reach see. Rays go out
 * from each one's eyes; a cell is seen while no voxel column (hill, wall, tree) on the way rises above
 * the line to it. world.vis eases toward it so the edge of the fog moves softly.
 */
function updateVision() {
  const N = world.N, G = Math.ceil(N / 2), tk = state.tank, R = tankStats().radio;
  if (!world.vis || world.vis.length !== G * G) { world.vis = new Float32Array(G * G); world.visT = new Uint8Array(G * G); world.visG = G; }
  const T = world.visT; T.fill(tune.fog ? 0 : 1);
  if (tune.fog) {
    const eyes = state.ents.filter(f => f.alive && f.team === 0 && !f.inside && (f === tk || heardAt(f)));
    for (const f of eyes) {
      const r = Math.round(sightOf(f));
      const ey = (f === tk ? tk.vy : f.y) + eyeH(f), nr = Math.ceil(Math.PI * 2 * r / 1.3);
      const fx = Math.floor(f.x), fz = Math.floor(f.z); if (inMap(fx, fz)) T[(fx >> 1) + G * (fz >> 1)] = 1;
      for (let a = 0; a < nr; a++) {
        const dx = Math.sin(a / nr * Math.PI * 2), dz = Math.cos(a / nr * Math.PI * 2); let maxA = -1e9;
        for (let s = 1; s <= r; s++) {
          const ix = Math.floor(f.x + dx * s), iz = Math.floor(f.z + dz * s); if (!inMap(ix, iz)) break;
          const h = world.hmap[ix + N * iz], ang = (h - ey) / s;
          if (ang >= maxA - 0.05) T[(ix >> 1) + G * (iz >> 1)] = 1;
          if (ang > maxA) maxA = ang;
        }
      }
    }
  }
  exploreUpdate(T, G);
  const V = world.vis; for (let i = 0; i < V.length; i++) V[i] += (T[i] - V[i]) * 0.6;
  world.visN = (world.visN || 0) + 1;
}
/** True for a living raider the player cannot see now (the fog hides it). */
function hiddenFoe(e) { return e.team === 1 && e.alive && !!tune.fog && !e.seen; }
