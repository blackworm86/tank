// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Entities: spawning a unit, and ranks for soldiers who live through fights. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Entities -------------------------------------------------------------------------------------------
function spawn(kind, x, z, extra) {
  const d = UT[kind];
  const e = Object.assign({
    id: state.nextId++, kind, team: d.team, veh: !!d.veh, rad: d.rad || 0.45, x, z, y: hAt(x, z), vy: hAt(x, z),
    heading: 0, turretYaw: 0, hp: 1, maxhp: 1, alive: true, cool: rng() * 1.2, think: rng() * 0.4,
    path: null, pi: 0, moving: false, target: null, pref: null, squad: null, group: null, inCover: false, recoil: 0,
  }, extra || {});
  e.maxhp = e.hp = unitHp(e);
  // a unit that would stand where it cannot get to the fight from (a mesa top, a rock, a walled pocket) is
  // moved to the nearest spot it can (iteration 56); a fixed gun, the command tank and a test dummy stay put
  if (kind !== 'tank' && !e.fixed && !e.inside && !e.dummy && !canReach(x, z, e.veh)) {
    const p = reachSpotNear(x, z, e.veh);
    if (p) { e.x = p.x; e.z = p.z; e.y = e.vy = hAt(p.x, p.z); if (e.homeSpot && e.homeSpot.x === x && e.homeSpot.z === z) e.homeSpot = { x: p.x, z: p.z }; }
  }
  state.ents.push(e);
  return e;
}
// ---- Ranks: soldiers who live through fights get better ------------------------------------------------
const RANKS = ['Recluta', 'Esperto', 'Veterano', 'Élite'];
/** XP to a soldier of ours; past each rank_xp_N threshold it is promoted (faster, steadier aim, tougher, quicker to fire). */
function giveXp(e, n) {
  if (!e || !e.alive || e.team !== 0 || e.veh) return;
  e.xp = (e.xp || 0) + n;
  let r = 0; for (let k = 1; k <= 3; k++) if (e.xp >= tune['rank_xp_' + k]) r = k;
  if (r > (e.rank || 0)) {
    const hp0 = e.maxhp; e.rank = r; e.maxhp = unitHp(e); e.hp += e.maxhp - hp0;
    floatText(e.x, e.y + 2.6, e.z, 'Promosso: ' + RANKS[r], '#ffd36a');
    if (e.squad) say(e.squad.name, UT[e.kind].name + ' promosso a ' + RANKS[r] + '.', '#ffd36a');
  }
}
function rankK(e, key) { return 1 + (e.rank || 0) * tune[key]; }
function suppressed(e) { return state.t < (e.supT || 0); }
function unitHp(e) {
  const tier = e.tier || 1, k = 1 + (tier - 1) * tune.tier_scale;
  switch (e.kind) {
    case 'tank': return tankStats().hp;
    case 'car': return tune.car_hp;
    case 'jeep': return tune.jeep_hp;
    case 'ltank': return tune.ltank_hp;
    case 'at': return tune.at_hp;
    default: if (ENEMY[e.kind]) return enemyHp(e); // the enemy registry (content/horde.js)
      return e.team ? tune.raider_hp * k : tune.inf_hp * rankK(e, 'rank_hp');
  }
}
function unitSpeed(e) {
  const k = (e.team ? 1 : rankK(e, 'rank_speed')) * (suppressed(e) ? tune.suppress_speed : 1) * (!e.team && !e.veh ? (gait(e) === 'stealth' ? tune.stealth_speed : gait(e) === 'run' ? tune.run_speed : 1) : 1);
  return k * baseSpeed(e) * modOf(e).speed;
}
function baseSpeed(e) {
  if (ENEMY[e.kind]) return ENEMY[e.kind].speed(); // the enemy registry
  switch (e.kind) {
    case 'car': return tune.car_speed;
    case 'jeep': return tune.jeep_speed;
    case 'ltank': return tune.ltank_speed;
    case 'at': return tune.inf_speed * 0.55;
    case 'mortar': case 'mg': return tune.inf_speed * 0.85;
    case 'scout': return tune.inf_speed * tune.scout_speed;
    default: return tune.inf_speed * (e.team ? 0.92 : 1);
  }
}
function eyeH(e) { return e.kind === 'tank' ? 2.7 : ENEMY[e.kind] && ENEMY[e.kind].eye ? ENEMY[e.kind].eye : e.kind === 'ltank' ? 2.2 : e.veh ? 2.0 : (e.inCover && !e.moving ? 1.15 : 1.5); }
/** How fast a vehicle's hull turns, deg/s. */
function hullTurn(e) { const k = 'hull_turn_' + e.kind; return (k in CONFIG ? tune[k] : ENEMY[e.kind] && ENEMY[e.kind].veh ? tune.hull_turn_enemy : 0) || 90; }
function chestH(e) { return e.veh ? 1.3 : 1.15; }
function canSee(a, b) {
  if (state.smokes && state.smokes.length && smokeBlocks(a, b)) return false; // nobody sees through a smoke screen
  if (a.garrison || b.garrison) return lineClearPast(a.x, a.y + eyeH(a), a.z, b.x, b.y + chestH(b), b.z, a.garrison, b.garrison);
  return lineClear(a.x, a.y + eyeH(a), a.z, b.x, b.y + chestH(b), b.z);
}
/** A line of sight that ignores the walls of the buildings at either end: soldiers inside shoot from the windows. */
function lineClearPast(ax, ay, az, bx, by, bz, ba, bb) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz), n = Math.ceil(L / 0.45);
  for (let i = 1; i < n; i++) {
    const t = i / n, x = ax + dx * t, z = az + dz * t, here = (ba || bb) && buildingAt(x, z);
    if (here && (here === ba || here === bb)) continue;
    if (solidF(x, ay + dy * t, z)) return false;
  }
  return true;
}
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function angTo(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function turnToward(cur, target, maxStep) { const d = angDiff(cur, target); return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep; }
/** A free walkable spot near (x,z) for the i-th unit spawned there. */
/** The natural ground under (x,z), below any building or wall standing there. */
function groundAt(x, z) { const ix = Math.floor(x), iz = Math.floor(z); return inMap(ix, iz) && world.groundRaw ? world.groundRaw[ix + world.N * iz] : hAt(x, z); }
/** A soldier on a roof with no way down to the ground beside it climbs down (a sniper who walked up keeps his post). */
function unstrand(m) {
  m.strandT = state.t;
  const p = spotNear(m.x, m.z, m.id % 6); if (Math.hypot(p.x - m.x, p.z - m.z) < 0.5) return;
  const fp = findPath(m.x, m.z, p.x, p.z, 1, 3000, 3, 1), end = fp && fp[fp.length - 1];
  if (end && fp.length > 1 && Math.hypot(end.x - p.x, end.z - p.z) < 1.5) return; // there is a way down: not stranded
  m.x = p.x; m.z = p.z; m.y = m.vy = hAt(p.x, p.z); m.path = null;
}
/** True for a soldier standing on top of a structure (a roof, a wall) well above the ground. */
/** A soldier who scales natural rock faces (UT or ENEMY climb: the sniper, the scout, the raiders' sniper). */
function climber(e) { return !e.veh && !!((UT[e.kind] && UT[e.kind].climb) || (typeof ENEMY !== 'undefined' && ENEMY[e.kind] && ENEMY[e.kind].climb)); }
function raised(m) { return hAt(m.x, m.z) - groundAt(m.x, m.z) > 2; }
function spotNear(x, z, i) {
  // the ground height there: a centre on a wall top measures from the ground beside it
  let ref = hAt(x, z);
  if (perch(Math.floor(x), Math.floor(z))) for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) ref = Math.min(ref, hAt(x + dx, z + dz));
  const gr = groundAt(x, z); if (ref - gr > 1.5) ref = gr; // a centre on a roof (a camp's bunker) measures from the ground, not the roof
  for (let r = 0; r < 8; r++) for (let k = 0; k < 12; k++) {
    const a = (i * 2.4 + k * 0.52), px = x + Math.cos(a) * (1.5 + r + i * 0.3), pz = z + Math.sin(a) * (1.5 + r + i * 0.3);
    const cx = Math.floor(px), cz = Math.floor(pz);
    if (walkable(cx, cz) && !perch(cx, cz) && !shallow(px, pz) && Math.abs(hAt(px, pz) - ref) <= 1) return { x: px, z: pz };
  }
  return { x, z };
}
