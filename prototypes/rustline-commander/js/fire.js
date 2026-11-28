// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Fire (iteration 55): an incendiary round or a molotov sets the ground and the burnable cells round it alight (wood,
// beams, hay, canvas, sandbags, tyres, junk). A burning cell eats its own integrity away, spreads to burnable cells
// next to it (upward most), hurts and scatters the soldiers by it; a burning beam that goes can bring the rest down
// (the statics at the next settle). state.fires: { ground, x, y, z, until } or { S, l } (a structure's fine cell).
'use strict';

/** How readily each fine material burns (0: never). Index: FM (js/structs.js). */
const FMFIRE = [0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0.7, 0, 0.35, 1, 1, 0, 0, 0.3, 0, 0.5];

/** Sets fire round (x, y, z): a burning patch on the ground, and a few of the burnable cells within r metres (fire_ignite times how readily they burn, fire_ignite_max at most). */
function igniteArea(x, y, z, r, src) {
  if (!state.fires) { state.fires = []; state.fireKeys = new Set(); }
  if (state.fires.length < tune.fire_max) state.fires.push({ ground: true, x, y: hAt(x, z), z, until: state.t + tune.fire_ground_s, src, tick: 0 });
  if (!world.structs) return;
  let n = 0; // a few spots catch (fire_ignite), the fire spreads from them
  for (const S of world.structs) {
    if (x + r < S.x0 || x - r > S.x0 + S.w || z + r < S.z0 || z - r > S.z0 + S.d || y + r < S.yb || y - r > S.yb + S.hgt) continue;
    const F = S.F, cx = (x - S.x0) * F, cy = (y - S.yb) * F, cz = (z - S.z0) * F, R = r * F;
    for (let fy = Math.max(0, Math.floor(cy - R)); fy <= Math.min(S.sy - 1, cy + R); fy++)
      for (let fz = Math.max(0, Math.floor(cz - R)); fz <= Math.min(S.sz - 1, cz + R); fz++)
        for (let fx = Math.max(0, Math.floor(cx - R)); fx <= Math.min(S.sx - 1, cx + R); fx++) {
          const l = fx + S.sx * (fz + S.sz * fy), m = S.cells[l]; if (!m || !FMFIRE[m]) continue;
          if ((fx + 0.5 - cx) ** 2 + (fy + 0.5 - cy) ** 2 + (fz + 0.5 - cz) ** 2 > R * R) continue;
          if (n < tune.fire_ignite_max && rng() < FMFIRE[m] * tune.fire_ignite) { burnCell(S, l, src); n++; }
        }
  }
}
/** Fine cell l of S catches fire (once; never past fire_max fires). */
function burnCell(S, l, src) {
  const key = S.id * 16777216 + l;
  if (state.fireKeys.has(key) || state.fires.length >= tune.fire_max) return;
  state.fireKeys.add(key); state.fires.push({ S: S.id, l, src, tick: rng() * 0.5 });
}
/** Where a fire is, in metres. */
function firePos(f) {
  if (f.ground) return f;
  const S = world.structs[f.S], A = S.sx * S.sz, F = S.F;
  return { x: S.x0 + (f.l % S.sx + 0.5) / F, y: S.yb + (((f.l / A) | 0) + 0.5) / F, z: S.z0 + ((((f.l / S.sx) | 0) % S.sz) + 0.5) / F };
}
/**
 * Every half second each fire: burns its cell (fire_burn of its integrity a second: cellHurt), may spread to a burnable
 * neighbour (fire_spread times how readily it burns, twice upward), hurts whoever is within fire_r (once a half second
 * each: fire damage, js/damage.js) and sends a soldier running from it; flames and smoke.
 */
function updateFires(dt) {
  const L = state.fires; if (!L || !L.length) return;
  const fxP = Math.min(1, 40 / L.length), burnt = new Set();
  for (let i = L.length - 1; i >= 0; i--) {
    const f = L[i];
    if (f.ground) { if (state.t > f.until) { L.splice(i, 1); continue; } }
    else { const S = world.structs[f.S]; if (!S || !S.cells[f.l]) { state.fireKeys.delete(f.S * 16777216 + f.l); L.splice(i, 1); continue; } }
    f.tick -= dt; if (f.tick > 0) continue; f.tick = 0.5;
    const p = firePos(f);
    if (state.fx && rng() < fxP) state.fx.push({ kind: 'smoke', x: p.x + (rng() - 0.5) * 0.4, y: p.y + 0.2, z: p.z + (rng() - 0.5) * 0.4, t: 0, life: 0.7, s: 0.45, rise: 2.2, col: rng() < 0.5 ? 0xff7a1a : 0xffb030 });
    if (state.fx && rng() < fxP * 0.5) state.fx.push({ kind: 'smoke', x: p.x + (rng() - 0.5) * 0.6, y: p.y + 1, z: p.z + (rng() - 0.5) * 0.6, t: 0, life: 3 + rng() * 1.5, s: 0.8 + rng() * 0.4, rise: 4.5, col: rng() < 0.5 ? 0x2a2420 : 0x3a302a });
    if (state.fx && rng() < fxP * 0.35 * tune.fx_embers) state.fx.push({ kind: 'ember', x: p.x + (rng() - 0.5) * 0.6, y: p.y + 0.3, z: p.z + (rng() - 0.5) * 0.6, t: 0, life: 1 + rng() * 1.2, s: 0.09 + rng() * 0.06, rise: 2.5 + rng() * 2.5, vx: (rng() - 0.5) * 0.8, vz: (rng() - 0.5) * 0.8 });
    if (!f.ground) {
      const S = world.structs[f.S], m = S.cells[f.l], C = S.cells;
      if (cellHurt(S, f.l, FMHP[m] * tune.fire_burn * 0.5)) burnt.add(S); else world.sdirty.add(S.id);
      const fx = f.l % S.sx, fz = ((f.l / S.sx) | 0) % S.sz, fy = (f.l / (S.sx * S.sz)) | 0;
      for (const [a, b, c, k] of [[1, 0, 0, 1], [-1, 0, 0, 1], [0, 0, 1, 1], [0, 0, -1, 1], [0, 1, 0, 2], [0, -1, 0, 0.5]]) {
        const nx = fx + a, ny = fy + b, nz = fz + c; if (nx < 0 || ny < 0 || nz < 0 || nx >= S.sx || ny >= S.sy || nz >= S.sz) continue;
        const n = nx + S.sx * (nz + S.sz * ny), mn = C[n]; if (mn && FMFIRE[mn] && rng() < tune.fire_spread * FMFIRE[mn] * k) burnCell(S, n, f.src);
      }
    }
    for (const e of state.ents) { // who stands in it
      if (!e.alive || e.inside || (e._burnT || -1) > state.t) continue;
      const r = tune.fire_r + (e.veh ? e.rad : 0), dx = e.x - p.x, dz = e.z - p.z;
      if (dx * dx + dz * dz > r * r || Math.abs(e.y + 0.8 - p.y) > 2) continue;
      e._burnT = state.t + 0.5;
      dmgTo(e, tune.fire_dps * 0.5, 'fire', f.src, { x: p.x, z: p.z });
      if (e.alive && !e.veh) { e.supT = state.t + tune.suppress_time; const d = Math.hypot(dx, dz) || 1; if (typeof setDest === 'function' && !e.inside) { setDest(e, e.x + dx / d * 6, e.z + dz / d * 6); e.fleeT = state.t; } }
    }
  }
  for (const S of burnt) { world.sdirty.add(S.id); world.schip.add(S.id); } // what burnt through may bring the rest down
}
on('playStep', dt => updateFires(dt));
