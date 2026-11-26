// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The development panel (F2): change and test squads and enemies freely. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The development panel (F2): change and test squads freely -----------------------------------
const DEV_KINDS = [...INF_KINDS, ...VEH_KINDS];
const DEV_ENEMIES = ['r_rifle', 'r_mg', 'r_rpg', 'technical', 'boss'];
function devSquad() { return state.squads[state.devSq] || null; }
/** A new squad of one unit of this kind, behind the tank, following it. */
function devAddSquad(kind) {
  const tk = state.tank, b = { x: tk.x - Math.sin(tk.heading) * 7, z: tk.z - Math.cos(tk.heading) * 7 };
  const sq = addSquad([kind], b.x, b.z, true);
  if (!sq) { say('Sviluppo', 'Massimo ' + maxSquads() + ' squadre.', '#c8a0ff'); return; }
  sq.order = { t: 'follow' }; state.devSq = state.squads.indexOf(sq);
}
/** One more unit of this kind in the squad (a new squad when none is picked). */
function devAddMember(sq, kind) {
  if (!sq || UT[kind].veh || sq.members.some(m => m && m.veh)) { devAddSquad(kind); return; } // a vehicle is always a squad of its own
  if (sq.slots.length >= 8) { say('Sviluppo', 'Squadra piena (8).', '#c8a0ff'); return; }
  const near = alive(sq)[0] || state.tank, p = spotNear(near.x, near.z, sq.slots.length);
  const m = spawn(kind, p.x, p.z); m.squad = sq; m.heading = m.turretYaw = near.heading || 0;
  sq.slots.push(kind); sq.members.push(m); sq.name = squadName(sq.slots);
}
/** Takes the squad's last unit away (the squad goes when it is empty). */
function devRemoveMember(sq) {
  if (!sq || !sq.slots.length) return;
  const m = sq.members.pop(); sq.slots.pop();
  if (m) { m.alive = false; m.gone = true; m.squad = null; }
  if (!sq.slots.length) devDeleteSquad(sq); else sq.name = squadName(sq.slots);
}
function devDeleteSquad(sq) {
  if (!sq) return;
  for (const m of sq.members) if (m) { m.alive = false; m.gone = true; }
  state.squads.splice(state.squads.indexOf(sq), 1);
  state.squads.forEach((q, i) => { q.id = i; });
  state.devSq = Math.max(0, Math.min(state.devSq, state.squads.length - 1));
}
/** Fills every dead slot of the squad again and heals the rest. */
function devRefill(sq) {
  if (!sq) return;
  const near = alive(sq)[0] || state.tank;
  sq.slots.forEach((k, i) => {
    const m = sq.members[i];
    if (m && m.alive) { m.hp = m.maxhp; return; }
    const p = spotNear(near.x, near.z, i), n = spawn(k, p.x, p.z); n.squad = sq; sq.members[i] = n;
  });
}
/** An enemy of this kind at (x,z), on a short patrol there; it never ends the run. */
function devSpawnEnemy(kind, x, z) {
  const g = newGroup('patrol', x, z, null); g.wps = [{ x, z }]; g.wpi = 0;
  const e = addRaider(g, kind, x, z, 2); e.dev = true;
  say('Sviluppo', UT[kind].name + ' piazzato.', '#c8a0ff');
}
/** The panel's own input: K drops the chosen enemy at the mouse; clicks on the panel stay on it. */
/** A friendly unit of the picked kind as a new squad at (x,z) (dev). */
function devSpawnAlly(kind, x, z) {
  if (state.squads.length >= maxSquads()) { say('Sviluppo', 'Massimo ' + maxSquads() + ' squadre.', '#c8a0ff'); return; }
  const sq = addSquad([kind], x, z, true); if (!sq) return;
  sq.order = { t: 'hold' };
  say('Sviluppo', UT[kind].name + ' piazzato (squadra ' + (state.squads.indexOf(sq) + 1) + ').', '#c8a0ff');
}
/** Kills every raider within r of the tank (dev). */
function devKillNear(r) { let n = 0; for (const e of state.ents) if (e.alive && e.team === 1 && dist2(e, state.tank) < r * r) { dmgTo(e, 9999, 'blast', null); n++; } say('Sviluppo', n + ' nemici eliminati.', '#c8a0ff'); }
/** Moves the own tank to (x,z) if it fits there (dev). */
function devTeleport(x, z) { const tk = state.tank; if (tankFits(tk, x, z, tk.heading, 99)) { tk.x = x; tk.z = z; tk.speed = 0; } else say('Sviluppo', 'Il carro lì non ci sta.', '#c8a0ff'); }
function devInput() {
  if (pressed('KeyJ') && state.mouse3) devSpawnAlly(state.devKind || 'rifle', state.mouse3.x, state.mouse3.z);
  if (pressed('KeyL') && state.mouse3) devTeleport(state.mouse3.x, state.mouse3.z);
  if (pressed('KeyN') && state.mission && !state.final) leaveSector(); // dev: on to the campaign map now
  if (pressed('KeyK') && state.mouse3) devSpawnEnemy(state.devEnemy || 'r_rifle', state.mouse3.x, state.mouse3.z);
  const r = UI.devRect;
  if (r && MS.x >= r.x && MS.x <= r.x + r.w && MS.y >= r.y && MS.y <= r.y + r.h) {
    if (MS.lp) clickButtons();
    MS.lp = MS.rp = MS.lr = MS.rr = false; MS.drag = null;
  }
}
