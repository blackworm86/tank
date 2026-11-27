// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Squads and orders: making squads, postures, orders and how a squad carries them out. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Squads and orders --------------------------------------------------------------------------------
function squadName(slots) {
  const k = new Set(slots);
  if (k.size === 1) {
    const t = slots[0], n = slots.length;
    return { rifle: n > 1 ? 'Fucilieri' : 'Fuciliere', sniper: n > 1 ? 'Team cecchini' : 'Cecchino solitario', mg: n > 1 ? 'Mitraglieri' : 'Mitragliere',
      medic: n > 1 ? 'Medici' : 'Medico', mortar: n > 1 ? 'Batteria mortai' : 'Artigliere', car: n > 1 ? 'Autoblinde' : 'Autoblindo',
      eng: n > 1 ? 'Genieri' : 'Geniere', radio: n > 1 ? 'Operatori radio' : 'Operatore radio', scout: n > 1 ? 'Esploratori' : 'Esploratore',
      at: n > 1 ? 'Batteria anticarro' : 'Cannone anticarro', ltank: n > 1 ? 'Plotone carri' : 'Carro di supporto' }[t];
  }
  const tr = traitsOf(slots).find(t => t.squad);
  return tr ? tr.squad : 'Squadra mista';
}
/** The squads' colours: on their cards, rings, paths and minimap numbers. */
const SQ_COLORS = ['#4fe3e0', '#ffd36a', '#ff8ad8', '#9fe35a', '#b48cff', '#ff9a4a'];
function sqColor(sq) {
  if (!sq.color) { const used = new Set(state.squads.filter(q => q !== sq).map(q => q.color)); sq.color = SQ_COLORS.find(c => !used.has(c)) || SQ_COLORS[sq.id % SQ_COLORS.length]; }
  return sq.color;
}
/**
 * The squad's rules of engagement (ROE): when it opens fire. An ordered target (Attacca) is always fired on.
 * free: every enemy in reach, and it takes cover once engaged; return: only after the squad has been shot at,
 * for posture_memory seconds; hold: only the ordered target.
 */
const ROES = [
  { k: 'free', name: 'Fuoco libero', short: 'LIBERO', col: '#ff8a6a', desc: 'Spara a ogni nemico a tiro; ingaggiata, cerca riparo.' },
  { k: 'return', name: 'Rispondi al fuoco', short: 'RISPONDI', col: '#ffd36a', desc: 'Spara solo se le hanno sparato negli ultimi secondi.' },
  { k: 'hold', name: 'Fuoco trattenuto', short: 'TRATTIENI', col: '#b0a8a0', desc: 'Spara solo al bersaglio che le ordini (Attacca).' },
];
/**
 * How the squad's soldiers move (vehicles drive as they do). normal; run: faster by run_speed, no fire on the
 * move; stealth: slower by stealth_speed, seen by raiders only within ambush_reveal until it fires.
 */
const GAITS = [
  { k: 'normal', name: 'Normale', short: 'PASSO', col: '#e8dcc4', desc: 'Si muove e spara secondo le regole d\'ingaggio.' },
  { k: 'run', name: 'Di corsa', short: 'CORSA', col: '#9fe3a0', desc: 'Più veloce; non spara mentre corre.' },
  { k: 'stealth', name: 'Furtiva', short: 'FURTIVA', col: '#9fd8ff', desc: 'Più lenta; i nemici la vedono solo da vicino finché non spara.' },
];
/** An old save's posture as the new rules and gait. */
function migratePosture(sq) {
  if (!sq.posture) return;
  sq.roe = sq.roe || ({ hold: 'hold', return: 'return' }[sq.posture] || 'free');
  sq.gait = sq.gait || (sq.posture === 'stealth' ? 'stealth' : 'normal');
  delete sq.posture;
}
function roeOf(sq) { if (sq) migratePosture(sq); return ROES.find(q => q.k === ((sq && sq.roe) || 'free')); }
function gaitOf(sq) { if (sq) migratePosture(sq); return GAITS.find(q => q.k === ((sq && sq.gait) || 'normal')); }
/** A soldier's squad's rules of engagement and gait ('free', 'normal' with no squad). */
function roe(e) { return e.squad ? roeOf(e.squad).k : 'free'; }
function gait(e) { return e.squad ? gaitOf(e.squad).k : 'normal'; }
function setRoe(sq, k) { sq.roe = k; const r = roeOf(sq); say(sq.name, 'Regole d\'ingaggio: ' + r.name.toLowerCase() + '.', r.col); }
function setGait(sq, k) { sq.gait = k; const g = gaitOf(sq); say(sq.name, 'Andatura: ' + g.name.toLowerCase() + '.', g.col); }
function nextOf(list, k) { return list[(list.findIndex(q => q.k === k) + 1) % list.length]; }
function cycleRoe(sq) { setRoe(sq, nextOf(ROES, roeOf(sq).k).k); }
function cycleGait(sq) { setGait(sq, nextOf(GAITS, gaitOf(sq).k).k); }
/** A soldier moving in stealth that has not fired lately: raiders spot it only up close. */
function stealthy(o) { return !o.team && !o.veh && gait(o) === 'stealth' && state.t - (o.firedT || -99) > 3; }
/** An empty squad at the end of the list, with its own colour. */
function newSquad() {
  const sq = { id: state.squads.length, slots: [], members: [], order: { t: 'hold' }, selected: false, tick: 0, roe: 'free', gait: 'normal' };
  state.squads.push(sq); sqColor(sq); return sq;
}
/** Adds a squad of the given unit kinds near (x,z). */
function addSquad(slots, x, z, force) {
  if (state.squads.length >= maxSquads()) return null;
  const sq = { id: state.squads.length, slots: slots.slice(), members: [], order: { t: 'hold' }, selected: false, tick: 0, roe: 'free', gait: 'normal' };
  slots.forEach((k, i) => { const p = spotNear(x, z, i); const m = spawn(k, p.x, p.z); m.squad = sq; m.heading = state.tank ? state.tank.heading : 0; m.turretYaw = m.heading; sq.members[i] = m; });
  sq.name = squadName(slots);
  state.squads.push(sq); sqColor(sq);
  return sq;
}
function alive(sq) { return sq.members.filter(m => m && m.alive); }
function inRadio(sq) { return state.tank.alive && alive(sq).some(heardAt); }
function setDest(m, x, z) {
  if (m.fixed) return;
  // paths go around the vehicles standing still (the command tank above all)
  const vs = state.ents.filter(v => v.alive && v.veh && v !== m && dist2(v, m) < 60 * 60 && dist2(v, m) > (v.rad + 1.2) ** 2 && !(v.moving || (v.kind === 'tank' && Math.abs(v.speed) > 0.5)));
  PF.avoid = (px, pz) => { for (const v of vs) { const r = v.rad + 0.7; if ((px - v.x) ** 2 + (pz - v.z) ** 2 < r * r) return true; } return false; };
  m.path = findPath(m.x, m.z, x, z, 1, m.veh ? 9000 : 6000, m.veh ? 1 : 3, m.veh ? tune.tank_ground_climb : 1); PF.avoid = null;
  if ((!m.path || m.path.length < 2) && !m.veh && raised(m)) { // stranded on a roof with no way down: he climbs down beside it
    const p = spotNear(m.x, m.z, m.id % 6); m.x = p.x; m.z = p.z; m.y = m.vy = hAt(p.x, p.z);
    m.path = findPath(m.x, m.z, x, z, 1, 6000, 3, 1);
  }
  m.pi = 0; m.dest = { x, z }; m.pathT = state.t; m.stuckT = 0;
}
/**
 * The cover a unit at (e.x,e.z) has against fire from (fx,fz): 0 none, 1 light, 2 heavy. Walls,
 * rocks and houses count, and so does a vehicle (alive or a wreck) between it and the shooter.
 */
function coverFrom(e, fx, fz) {
  if (e.garrison) return 2; // inside a building: walls all round
  const h = hAt(e.x, e.z), dx = fx - e.x, dz = fz - e.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
  let q = 0;
  for (const a of [0, 0.7, -0.7]) {
    const c = Math.cos(a), sn = Math.sin(a), rx = ux * c - uz * sn, rz = ux * sn + uz * c;
    q = Math.max(q, coverQuality(Math.floor(e.x + rx * 1.1), Math.floor(e.z + rz * 1.1), h));
  }
  if (q < 2) for (const v of state.ents) {
    if (!v.veh || v.gone || v === e) continue;
    const vx = v.x - e.x, vz = v.z - e.z, d = Math.hypot(vx, vz);
    if (d < v.rad + 1.5 && d > 0.01 && (vx * ux + vz * uz) / d > 0.45) return 2;
  }
  return q;
}
/** The best cover around a unit from any side (or the side it faces). */
function coverAround(e) {
  if (e.face != null) return coverFrom(e, e.x + Math.sin(e.face) * 10, e.z + Math.cos(e.face) * 10);
  let q = 0; for (let k = 0; k < 4; k++) q = Math.max(q, coverFrom(e, e.x + Math.sin(k * 1.57) * 10, e.z + Math.cos(k * 1.57) * 10));
  return q;
}
/**
 * Where infantry would take cover near (x,z): voxel cover from the map plus spots behind friendly
 * vehicles and wrecks (away from the threat, or on the side of the point when there is none).
 */
function coverSpotsAt(x, z, n, threat) {
  const cand = findCoverSpots(x, z, n + 6, threat).slice();
  for (const v of state.ents) {
    if (!v.veh || v.gone || (v.alive && v.team !== 0)) continue;
    if ((v.x - x) ** 2 + (v.z - z) ** 2 > 8 * 8) continue;
    if (v.alive && (v.moving || (v.kind === 'tank' && Math.abs(v.speed) > 0.5))) continue;
    let bx = -(threat ? threat.x : 0), bz = -(threat ? threat.z : 0);
    if (!threat) { bx = x - v.x; bz = z - v.z; }
    const L = Math.hypot(bx, bz) || 1; bx /= L; bz /= L;
    const px = -bz, pz = bx, r = v.rad + 0.8;
    for (const o of [0, 1.1, -1.1, 2.2, -2.2]) {
      const sx = v.x + bx * r + px * o, sz = v.z + bz * r + pz * o, cx = Math.floor(sx), cz = Math.floor(sz);
      if (!walkable(cx, cz) || perch(cx, cz) || shallow(sx, sz) || Math.abs(hAt(sx, sz) - hAt(v.x, v.z)) > 1) continue;
      // the point right beside a vehicle: its hull is the cover meant
      const near = Math.hypot(v.x - x, v.z - z) < v.rad + 3.2 ? 5 : 1.8;
      cand.push({ x: sx, z: sz, d: Math.hypot(sx - x, sz - z) - near, q: 2, veh: v });
    }
  }
  cand.sort((a, b) => a.d - b.d);
  const out = [];
  for (const c of cand) {
    if (out.length >= n) break;
    if (out.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 1.3)) continue;
    out.push(c);
  }
  return out;
}
/** The nearest raider the player sees (the fog of war) within maxD of a unit. */
function nearestSeenFoe(m, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of state.ents) if (e.alive && e.team === 1 && !hiddenFoe(e) && !e.inside) { const d = dist2(e, m); if (d < bd) { bd = d; best = e; } }
  return best;
}
function nearestEnemyTo(x, z, team, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of state.ents) if (e.alive && e.team !== team) { const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
/**
 * Sends a squad's members to (x,z). how: 'auto' (into cover if there is some), 'cover' (look harder
 * for cover), 'none' (straight there). face: the bearing to hold there (null: none given); it is
 * also where the threat is when choosing cover. Returns how many found cover.
 */
function goTo(sq, x, z, how, face) {
  const ms = alive(sq); if (!ms.length) return 0;
  let threat = null;
  if (face != null) threat = { x: Math.sin(face), z: Math.cos(face) };
  else {
    const en = nearestEnemyTo(x, z, 0, how === 'cover' ? 90 : 45);
    if (en) { const dx = en.x - x, dz = en.z - z, L = Math.hypot(dx, dz) || 1; threat = { x: dx / L, z: dz / L }; }
  }
  const inf = ms.filter(m => !m.veh), spots = how === 'none' ? [] : coverSpotsAt(x, z, inf.length, threat);
  // a line across the facing (or a loose ring without one) for whoever finds no cover
  const px = face != null ? Math.cos(face) : 0, pz = face != null ? -Math.sin(face) : 0;
  let k = 0;
  ms.forEach((m, i) => {
    let d;
    if (!m.veh && spots[k]) d = spots[k++];
    else if (face != null) { const o = (i - (ms.length - 1) / 2) * (m.veh ? 3.2 : 1.7), back = m.veh ? 1.5 : 0; d = { x: x + px * o - Math.sin(face) * back, z: z + pz * o - Math.cos(face) * back }; }
    else { const a = i * 2.1, r = m.veh ? 0 : 1.6; d = { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r }; }
    setDest(m, d.x, d.z); m.pref = null;
    m.face = face; m.moveFace = face;
  });
  return spots.length;
}
/** A move order; with append it becomes the next stop of the squad's drawn path. how 'assault': straight there, all guns going. */
function orderMove(sq, x, z, how = 'auto', append = false, face = null) {
  if (!alive(sq).length) return;
  const col = how === 'cover' ? 0x8fe36a : how === 'assault' ? 0xff6a4a : 0x4fe3e0;
  const h2 = how === 'assault' ? 'none' : how;
  if (append && sq.order.t === 'move' && !sq.order.done) {
    sq.order.pts.push({ x, z, how: h2, face, assault: how === 'assault' });
    say(sq.name, 'Tappa ' + (sq.order.pts.length - sq.order.i) + ' aggiunta al percorso.');
    mark(x, z, col); return;
  }
  const n = goTo(sq, x, z, h2, face);
  sq.order = { t: 'move', pts: [{ x, z, how: h2, face, assault: how === 'assault' }], i: 0, cover: n > 0, done: false };
  say(sq.name, how === 'assault' ? 'Avanziamo all\'attacco!' : how === 'cover' ? (n ? 'Ricevuto, prendiamo copertura.' : 'Nessuna copertura li, ci andiamo comunque.') : n ? 'Ricevuto, ci mettiamo al riparo.' : 'Ricevuto, in movimento.');
  mark(x, z, col);
}
function orderAttack(sq, target) {
  const ms = alive(sq); if (!ms.length) return;
  for (const m of ms) { m.pref = target; m.face = null; m.moveFace = null; }
  sq.order = { t: 'attack', target };
  sq.tick = 0;
  say(sq.name, 'Bersaglio ricevuto: ' + UT[target.kind].name.toLowerCase() + '.');
  mark(target.x, target.z, 0xff6a4a);
}
/** Infantry that can ride (not the anti-tank gun, not vehicles). */
function canRide(m) { return m && m.alive && !m.veh && m.kind !== 'at'; }
function passengers() { return state.ents.filter(e => e.alive && e.inside); }
function seatsFree() { return tankStats().seats - passengers().length; }
/** Sends the squad's infantry to the command vehicle to climb in. */
function orderBoard(sq) {
  const S = tankStats();
  if (!S.seats) { say('Radio', 'Il mezzo non ha posti: montali all\'officina (Vano truppe).', '#e0a070'); return false; }
  if (!alive(sq).some(m => canRide(m) && !m.inside)) { say(sq.name, sq.members.some(m => m && m.inside) ? 'Siamo già a bordo.' : 'Non possiamo salire.', '#e0a070'); return false; }
  sq.order = { t: 'board' }; sq.tick = 0;
  say(sq.name, 'Arriviamo, teneteci un posto!');
  return true;
}
function boardOne(m) { const tk = state.tank; m.inside = true; m.path = null; m.moving = false; m.target = null; m.pref = null; m.x = tk.x; m.z = tk.z; }
/** Lets the squad's passengers out behind the vehicle. Returns how many got out. */
function unloadSquad(sq) {
  const tk = state.tank; let n = 0;
  sq.members.forEach((m, i) => {
    if (!m || !m.alive || !m.inside) return;
    const p = spotNear(tk.x - Math.sin(tk.heading) * (tk.rad + 1.6), tk.z - Math.cos(tk.heading) * (tk.rad + 1.6), i + n);
    m.inside = false; m.x = p.x; m.z = p.z; m.y = m.vy = hAt(p.x, p.z); m.heading = tk.heading + Math.PI; m.face = null; n++;
  });
  if (n) { sq.order = { t: 'hold' }; say(sq.name, 'Fuori! Scesi in ' + n + '.'); }
  return n;
}
/** U: the selected squads get out, or everyone aboard when none of the selected rides. */
function unloadSelected() {
  let sqs = selectedSquads().filter(sq => sq.members.some(m => m && m.alive && m.inside));
  if (!sqs.length) sqs = state.squads.filter(sq => sq.members.some(m => m && m.alive && m.inside));
  if (!sqs.length) { say('Radio', 'Nessuno a bordo.', '#e0a070'); return; }
  for (const sq of sqs) unloadSquad(sq);
  sfx('radio');
}
/** An ambush: the squad hides in cover at (x,z) and holds fire until the enemy comes close, then all fire at once. */
function orderAmbush(sq, x, z, face) {
  orderMove(sq, x, z, 'cover', false, face);
  sq.order.ambush = true; sq.order.sprung = false; sq.order.sprungT = null;
  say(sq.name, 'Ricevuto: ci appostiamo e aspettiamo.');
}
/** True for a soldier of an ambush that has not fired yet (in place, out of sight). */
function lurking(e) { const o = e.squad && e.squad.order; return !!(o && o.ambush && !o.sprung && o.done && !e.moving); }
function springAmbush(sq) {
  const o = sq && sq.order; if (!o || !o.ambush || o.sprung) return;
  o.sprung = true; o.sprungT = state.t;
  say(sq.name, 'Fuoco! Imboscata!', '#ffb070');
}
/** How each kind fights: cover = how far it looks for cover, back = how far it keeps behind the threat. */
const ROLE = {
  rifle: { cover: 6, back: 0 }, mg: { cover: 8, back: 3 }, medic: { cover: 6, back: 6 }, eng: { cover: 6, back: 3 }, radio: { cover: 6, back: 5 }, scout: { cover: 7, back: 0 },
  mortar: { cover: 6, back: 12 }, at: { cover: 5, back: 0 },
};
/**
 * The soldiers' own sense, every squad tick: in a fight, out of cover, each kind finds cover toward the
 * threat within its reach (support kinds a little behind); the sniper keeps a high post far off.
 */
function roleUpkeep(sq, ms) {
  if (sq.order.t === 'board' || sq.order.t === 'inside') return;
  const marching = sq.order.t === 'move' && !sq.order.done;
  let told = false;
  for (const m of ms) {
    if (m.veh || m.inside || m.garrison) continue;
    const th = (m.target && m.target.alive && m.target) || (m.shotBy && m.shotBy.alive && state.t - m.shotT < 6 && m.shotBy) || null;
    if (th) { m.combatT = state.t; m.threat = th; }
    if (m.kind === 'sniper') { sniperUpkeep(m, sq); continue; }
    if (marching || sq.order.ambush || m.moving) continue;
    if (!(state.t - (m.combatT || -99) < 6 && m.threat && m.threat.alive)) continue;
    if (tune.smart_soldiers) { soldierPosition(m, sq); continue; } // tactics.js: the best spot by role against every threat
    if (state.t - (m.coverT || -99) < 4) continue;
    const R = ROLE[m.kind] || ROLE.rifle, t = m.threat;
    const dx = t.x - m.x, dz = t.z - m.z, L = Math.hypot(dx, dz) || 1, dir = { x: dx / L, z: dz / L };
    const w = weapon(UT[m.kind].w), tooClose = R.back && L < Math.min(w.range * 0.7, 18);
    if (m.cover > 0 && !tooClose) continue;
    m.coverT = state.t;
    const ax = m.x - dir.x * (tooClose ? R.back : 0), az = m.z - dir.z * (tooClose ? R.back : 0);
    const spots = coverSpotsAt(ax, az, 5, dir).filter(sp => Math.hypot(sp.x - m.x, sp.z - m.z) <= R.cover + R.back
      && Math.hypot(t.x - sp.x, t.z - sp.z) > L - 2
      && !state.ents.some(o => o !== m && o.alive && o.team === 0 && !o.veh && Math.hypot((o.dest ? o.dest.x : o.x) - sp.x, (o.dest ? o.dest.z : o.z) - sp.z) < 1));
    const sp = spots[0];
    if (sp) { setDest(m, sp.x, sp.z); m.face = Math.atan2(dx, dz); if (!told) { told = true; if (state.t - (sq.coverMsgT || -99) > 15) { sq.coverMsgT = state.t; say(sq.name, 'Al riparo!'); } } }
  }
}
/** The sniper: a high post with a line of fire, well back from the enemy; it moves when they close in or the squad moves on. */
function sniperUpkeep(m, sq) {
  if (m.moving && state.t - (m.snipeT || -99) < 5) return;
  const tk = state.tank, o = sq.order;
  let ax = m.x, az = m.z, R = 9;
  if (o.t === 'follow') { ax = tk.x - Math.sin(tk.heading) * 14; az = tk.z - Math.cos(tk.heading) * 14; R = 12; }
  else if (o.t === 'move') { const p = o.pts[Math.min(o.i, o.pts.length - 1)]; ax = p.x; az = p.z; R = 10; }
  else if (o.t === 'attack' && o.target && o.target.alive) {
    const t = o.target, d = Math.hypot(m.x - t.x, m.z - t.z) || 1, keep = Math.min(d, tune.sniper_range * 0.8);
    ax = t.x + (m.x - t.x) / d * keep; az = t.z + (m.z - t.z) / d * keep; R = 12;
  }
  const en = m.threat && m.threat.alive && state.t - (m.combatT || -99) < 8 ? m.threat : nearestEnemyTo(m.x, m.z, 0, tune.sniper_sight);
  const close = en && Math.hypot(en.x - m.x, en.z - m.z) < tune.sniper_standoff * 0.6;
  const far = Math.hypot(ax - m.x, az - m.z) > R;
  if (!close && !far && m.post && state.t - (m.snipeT || -99) < 10) return;
  m.snipeT = state.t;
  const sp = overwatchSpot(ax, az, R, en);
  if (sp && Math.hypot(sp.x - m.x, sp.z - m.z) > 1.2) {
    setDest(m, sp.x, sp.z); m.post = sp;
    if (en) m.face = Math.atan2(en.x - sp.x, en.z - sp.z);
    if (close) say(sq.name, 'Cecchino: troppo vicini, cambio posizione.');
  } else m.post = sp || { x: m.x, z: m.z };
}
/** The best sniper post near (ax,az): high ground, a clear line to the enemy, cover toward it, beyond sniper_standoff. */
function overwatchSpot(ax, az, R, en) {
  let best = null, bs = -1e9;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dz * dz > R * R) continue;
    const x = Math.floor(ax + dx), z = Math.floor(az + dz);
    if (!walkable(x, z) || perch(x, z) || shallow(x + 0.5, z + 0.5)) continue;
    const h = hAt(x, z); let s = h * 1.2 - Math.hypot(dx, dz) * 0.12;
    if (en) {
      const d = Math.hypot(en.x - x - 0.5, en.z - z - 0.5);
      if (d < tune.sniper_standoff) s -= (tune.sniper_standoff - d) * 2;
      if (d > tune.sniper_range) s -= d - tune.sniper_range;
      if (lineClear(x + 0.5, h + 1.15, z + 0.5, en.x, en.y + 1.2, en.z)) s += 20; // a post that cannot see is no post
      if (inCoverFrom(x, z, en.x, en.z)) s += 3;
    }
    if (state.ents.some(o => o.alive && o.team === 0 && o.kind !== 'sniper' && Math.abs(o.x - x - 0.5) < 1 && Math.abs(o.z - z - 0.5) < 1)) s -= 4;
    if (s > bs) { bs = s; best = { x: x + 0.5, z: z + 0.5 }; }
  }
  return best;
}
function orderFollow(sq) { leaveBuilding(sq); sq.order = { t: 'follow' }; sq.tick = 0; say(sq.name, 'Ricevuto, vi seguiamo.'); }
/** Sends the squad's infantry into a building: they walk to its door and take the places inside. */
function orderGarrison(sq, b) {
  const ms = alive(sq).filter(m => !m.veh && m.kind !== 'at');
  if (!b.ruined && buildingWalls(b) < b.walls0 * tune.garrison_ruin) b.ruined = true;
  if (b.ruined) { say(sq.name, 'È crollato, lì dentro non si entra.', '#e0a070'); return false; }
  if (!ms.length) { say(sq.name, 'Non possiamo entrare.', '#e0a070'); return false; }
  const mine = ms.filter(m => m.garrison === b).length;
  if (mine === ms.length) { say(sq.name, 'Siamo già dentro.'); return false; }
  leaveBuilding(sq);
  sq.order = { t: 'garrison', b }; sq.tick = 0;
  for (const m of ms) { setDest(m, b.out.x, b.out.z); m.face = null; m.pref = null; }
  say(sq.name, 'Entriamo nell\'edificio!'); mark(b.door.x, b.door.z, 0x8fe36a);
  return true;
}
/** Puts a soldier at a free place inside the building (spread over the floor). */
function enterBuilding(m, b) {
  const used = new Set(b.occ.map(o => o.slotI)); let k = 0; while (used.has(k)) k++;
  const s = b.slots[Math.min(b.slots.length - 1, Math.floor(k * b.slots.length / b.cap))];
  m.garrison = b; m.slotI = k; b.occ.push(m);
  m.x = s.x; m.z = s.z; m.y = m.vy = b.g; m.path = null; m.moving = false; m.dest = null; m.face = null;
}
function exitBuilding(m, i) {
  const b = m.garrison; if (!b) return;
  b.occ = b.occ.filter(o => o !== m); m.garrison = null;
  const p = spotNear(b.out.x, b.out.z, i || 0); m.x = p.x; m.z = p.z; m.y = m.vy = hAt(p.x, p.z);
}
/** Everyone of the squad inside a building comes out by its door. Returns how many. */
function leaveBuilding(sq) { let n = 0; sq.members.forEach((m, i) => { if (m && m.alive && m.garrison) { exitBuilding(m, i); n++; } }); return n; }
/** A building that lost most of its walls throws its soldiers out, hurt. */
function checkBuildings() {
  for (const b of world.buildings) {
    if (!b.occ.length) continue;
    b.occ = b.occ.filter(m => m.alive && m.garrison === b);
    if (!b.occ.length || buildingWalls(b) >= b.walls0 * tune.garrison_ruin) continue;
    b.ruined = true;
    const ms = b.occ.slice();
    ms.forEach((m, i) => { exitBuilding(m, i); dmgTo(m, tune.garrison_hurt, 'blast', null); });
    const sq = ms[0] && ms[0].squad;
    if (sq) { sq.order = { t: 'hold' }; say(sq.name, 'L\'edificio crolla! Fuori!', '#ffb070'); }
  }
}
function orderHold(sq) { for (const m of alive(sq)) { m.path = null; m.pref = null; } sq.order = { t: 'hold' }; say(sq.name, 'Teniamo la posizione.'); }
function squadUpkeep(sq, dt) {
  sq.tick -= dt; if (sq.tick > 0) return; sq.tick = 1.2;
  const ms = alive(sq), tk = state.tank; if (!ms.length || !tk.alive) return;
  const heard = inRadio(sq);
  if (sq.order.t === 'board') {
    let left = 0;
    for (const m of ms) {
      if (!canRide(m) || m.inside) continue;
      if (Math.hypot(m.x - tk.x, m.z - tk.z) < tk.rad + tune.board_radius) {
        if (seatsFree() > 0) { boardOne(m); continue; }
        say(sq.name, 'Il mezzo è pieno!', '#e0a070'); sq.order = { t: 'hold' }; return;
      }
      left++;
      if (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2) setDest(m, tk.x - Math.sin(tk.heading) * (tk.rad + 1.2), tk.z - Math.cos(tk.heading) * (tk.rad + 1.2));
    }
    sq.tick = 0.3;
    if (!left) { sq.order = { t: 'inside' }; say(sq.name, 'A bordo!'); }
    return;
  }
  if (sq.order.t === 'inside') return;
  if (sq.order.t === 'garrison') {
    const b = sq.order.b; let left = 0;
    for (const m of ms) {
      if (m.veh || m.kind === 'at' || m.garrison || m.inside) continue;
      if (Math.hypot(m.x - b.out.x, m.z - b.out.z) < 1.8 || Math.hypot(m.x - b.door.x, m.z - b.door.z) < 1.4) {
        if (b.occ.length < b.cap && !b.ruined) { enterBuilding(m, b); continue; }
        say(sq.name, 'Dentro non c\'è più posto.', '#e0a070'); sq.order = { t: 'hold' }; return;
      }
      left++;
      if (!m.path || m.pi >= m.path.length || state.t - m.pathT > 3) setDest(m, b.out.x, b.out.z);
    }
    sq.tick = 0.3;
    if (!left) { sq.order = { t: 'garrisoned', b }; say(sq.name, 'Dentro! Teniamo l\'edificio.'); }
    return;
  }
  if (sq.order.t === 'garrisoned') return;
  if (sq.order.t === 'follow') {
    if (!heard) { sq.order = { t: 'hold' }; say(sq.name, 'Segnale perso, teniamo la posizione.', '#e0a070'); return; }
    ms.forEach((m, i) => {
      if (m.kind === 'sniper' && !m.veh) return; // its own post (roleUpkeep)
      if (state.t - (m.combatT || -99) < 6 && !m.veh) return; // fighting: stays in its cover till it is over
      const a = tk.heading + Math.PI + (i - (ms.length - 1) / 2) * 0.45 + (sq.id % 2 ? 0.6 : -0.6) * (1 + (sq.id >> 1) * 0.5), r = 7 + (sq.id >> 1) * 2 + (m.veh ? 3 : 0) + (m.kind === 'mortar' || m.kind === 'medic' ? 4 : 0);
      const px = tk.x + Math.sin(a) * r, pz = tk.z + Math.cos(a) * r;
      if ((m.x - px) ** 2 + (m.z - pz) ** 2 > 9 && (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2.5)) setDest(m, px, pz);
    });
  } else if (sq.order.t === 'attack') {
    const t = sq.order.target;
    if (!t || !t.alive) { sq.order = { t: 'hold' }; say(sq.name, 'Bersaglio eliminato.'); return; }
    for (const m of ms) {
      if (m.kind === 'sniper' || m.kind === 'medic') continue; // the sniper picks a post, the medic stays with the wounded
      const w = weapon(UT[m.kind].w), ok = dist2(m, t) <= (w.range * 0.9) ** 2 && (w.indirect || canSee(m, t));
      if (ok) m.path = null; else if (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2.5) setDest(m, t.x + (m.id % 3 - 1) * 2, t.z + (m.id % 2 - 0.5) * 3);
    }
  } else if (sq.order.t === 'move' && !sq.order.done) {
    const o = sq.order;
    if (boundStep(sq, ms, o)) { /* tactics.js: bounding under fire */ }
    else if (ms.every(m => !m.path || m.pi >= m.path.length || (m.dest && dist2(m, m.dest) < 9 && o.i < o.pts.length - 1))) {
      if (o.i < o.pts.length - 1) { o.i++; const p = o.pts[o.i]; o.cover = goTo(sq, p.x, p.z, p.how, p.face) > 0; sq.tick = 0.4; }
      else { o.done = true; if (o.ambush) say(sq.name, 'In posizione. Aspettiamo che si avvicinino.'); else if (o.cover) say(sq.name, 'In posizione, al coperto.'); }
    }
  }
  roleUpkeep(sq, ms);
}
function selectedSquads() { return state.squads.filter(s => s.selected && alive(s).length); }
/**
 * Gives an order to every selected squad the radio reaches. kind: null (an enemy = attack, else
 * move, into cover if near some), 'move', 'attack' (an enemy, or an assault to the ground),
 * 'cover'. pt: the ground point; face: the bearing dragged out with the arrow (or null); tgt: the
 * enemy clicked. append adds a stop to the drawn path. Returns whether any squad heard it.
 */
function issueOrder(kind, append, pt, face, tgt) {
  const sel = selectedSquads();
  if (!sel.length) { say('Radio', 'Nessuna squadra selezionata: click o tasti 1-6.', '#e0a070'); return false; }
  pt = pt || state.mouse3; if (!pt) return false;
  if (kind === 'attack' && !tgt) tgt = nearestEnemyTo(pt.x, pt.z, 0, 4);
  if (kind === 'move' || kind === 'cover' || kind === 'ambush') tgt = null;
  let any = false;
  for (const sq of sel) {
    if (!inRadio(sq)) { say(sq.name, 'Fuori portata radio: non vi sentiamo.', '#e0a070'); continue; }
    any = true;
    if (!kind && !tgt && Math.hypot(pt.x - state.tank.x, pt.z - state.tank.z) < state.tank.rad + 0.9) { // right-click on the command vehicle
      if (tankStats().seats > 0 && alive(sq).some(m => canRide(m) && !m.inside)) orderBoard(sq); else orderFollow(sq); // climb in, or follow me
      continue;
    }
    const bAt = (!kind || kind === 'cover') && !tgt ? buildingAt(pt.x, pt.z) : null;
    if (bAt && alive(sq).some(m => !m.veh && m.kind !== 'at')) { // right-click on a building: go in
      if (sq.members.some(m => m && m.alive && m.inside)) unloadSquad(sq);
      orderGarrison(sq, bAt); continue;
    }
    if (leaveBuilding(sq)) say(sq.name, 'Usciamo!');
    if (sq.members.some(m => m && m.alive && m.inside)) unloadSquad(sq);
    if (kind === 'ambush') orderAmbush(sq, pt.x, pt.z, face);
    else if (tgt) orderAttack(sq, tgt);
    else orderMove(sq, pt.x, pt.z, kind === 'move' ? 'none' : kind === 'cover' ? 'cover' : kind === 'attack' ? 'assault' : 'auto', append, face);
  }
  if (any) { sfx('radio'); if (state.tut === 2) { state.tut = 3; say('Radio', 'Ti sentono solo dentro l\'anello ciano: la radio ha un raggio limitato. Migliorala all\'officina, tra un settore e l\'altro.', '#9fe3a0'); } }
  return any;
}
/** B: the selected squads climb in, or get out if some of them ride. */
function boardOrUnload() {
  const sel = selectedSquads();
  if (sel.some(sq => sq.members.some(m => m && m.alive && m.inside))) { unloadSelected(); return; }
  let any = false; for (const sq of sel) { if (inRadio(sq)) any = orderBoard(sq) || any; else say(sq.name, 'Fuori portata radio.', '#e0a070'); }
  if (any) sfx('radio');
}
/**
 * Alt+N: the picked soldiers (or every soldier of the selected squads) join squad N, or make a new
 * squad when N is past the last (at most max_squads). A vehicle is always a squad of its own; a squad
 * left with nobody alive goes, and the squads are numbered again.
 */
function regroupTo(n) {
  const sel = selectedSquads();
  let us = (state.picked && state.picked.size ? [...state.picked] : sel.flatMap(sq => alive(sq))).filter(m => m.alive && m.squad && !m.inside);
  if (!us.length) { say('Radio', 'Scegli prima i soldati: click, riquadro o 1-6.', '#e0a070'); return; }
  const veh = us.some(m => m.veh); us = us.filter(m => !m.veh);
  if (!us.length) { say('Radio', 'Un mezzo resta sempre una squadra a sé.', '#e0a070'); return; }
  const to = moveUnits(us, state.squads[n] || null);
  if (to) { for (const s of state.squads) s.selected = s === to; state.picked = null; if (veh) say('Radio', 'I mezzi restano squadre a sé.', '#e0a070'); }
}
/**
 * Moves soldiers into squad `to` (null: a new squad at the end). Vehicles never move: a vehicle is a
 * squad of its own. Squads left with nobody alive go and the rest are numbered again. Returns the squad.
 */
function moveUnits(us, to) {
  us = us.filter(m => m.alive && m.squad && !m.veh && !m.inside && m.squad !== to);
  if (!us.length) return null;
  if (to && to.members.some(m => m && m.veh)) { say('Radio', 'Un mezzo resta sempre una squadra a sé.', '#e0a070'); return null; }
  let made = false;
  if (!to) {
    if (state.squads.length >= maxSquads()) { say('Radio', 'Massimo ' + maxSquads() + ' squadre.', '#e0a070'); return null; }
    to = newSquad(); made = true;
  }
  if (to.slots.length + us.length > tune.squad_size) { say('Radio', 'Al massimo ' + tune.squad_size + ' soldati per squadra.', '#e0a070'); if (made) state.squads.splice(state.squads.indexOf(to), 1); return null; }
  const from = new Set();
  for (const m of us) {
    const q = m.squad, i = q.members.indexOf(m);
    if (m.garrison) exitBuilding(m, 0);
    q.members.splice(i, 1); q.slots.splice(i, 1); from.add(q);
    m.squad = to; to.members.push(m); to.slots.push(m.kind); m.path = null; m.pref = null; m.face = null;
  }
  for (const q of from) if (q.slots.length && !q.named) q.name = squadName(q.slots);
  state.squads = state.squads.filter(q => q === to || !from.has(q) || q.members.some(m => m && m.alive));
  state.squads.forEach((q, i) => { q.id = i; });
  if (!to.named) to.name = squadName(to.slots);
  to.order = { t: 'hold' };
  say(to.name, 'Squadra ' + (state.squads.indexOf(to) + 1) + ': ' + to.slots.length + (to.slots.length > 1 ? ' soldati.' : ' soldato.'));
  sfx('radio');
  return to;
}
/** The squad card (drawn by the HUD) under (x,y). */
function cardAt(x, y) { for (const c of UI.cards || []) if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) return c; return null; }
function inRect(r, x, y) { return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
/**
 * The squad cards take the mouse: a click on a card selects the squad, on its posture tag changes the
 * posture, on the pencil renames it; a soldier's icon picks that soldier (Shift adds) or, dragged onto
 * another card or the 'new squad' slot, moves him (with the other picked soldiers). True when the
 * mouse was the cards' this step.
 */
function cardInput() {
  if (!state.tpause) { // driving: the cards are only a display, and a click on one is not a shot
    if (MS.lp && cardAt(MS.x, MS.y)) { MS.lp = false; state.menuBlock = true; return true; }
    return false;
  }
  const d = state.dragSoldier, add = down.has('ShiftLeft') || down.has('ShiftRight');
  if (d) {
    if (Math.hypot(MS.x - d.x0, MS.y - d.y0) > 6) d.moved = true;
    state.menuBlock = true; MS.lp = false; MS.drag = null;
    if (!MS.l) {
      state.dragSoldier = null; MS.lr = false;
      if (d.moved) {
        const c = cardAt(MS.x, MS.y), us = state.picked && state.picked.has(d.m) ? [...state.picked] : [d.m];
        let to = null;
        if (c && c.sq !== d.m.squad) to = moveUnits(us, c.sq);
        else if (!c && inRect(UI.newCard, MS.x, MS.y)) to = moveUnits(us, null);
        if (to) { state.picked = null; for (const s of state.squads) s.selected = s === to; }
      } else {
        if (!d.add || !state.picked) state.picked = new Set();
        if (d.add && state.picked.has(d.m)) state.picked.delete(d.m); else state.picked.add(d.m);
        if (!d.add) for (const s of state.squads) s.selected = false;
        if (inRadio(d.m.squad)) d.m.squad.selected = true;
        if (!state.picked.size) state.picked = null;
      }
    }
    return true;
  }
  if (!MS.lp) return false;
  const c = cardAt(MS.x, MS.y); if (!c) return false;
  MS.lp = false; MS.drag = null; state.menuBlock = true; state.menu = null;
  if (inRect(c.post, MS.x, MS.y)) { cycleRoe(c.sq); return true; }
  if (c.gait && inRect(c.gait, MS.x, MS.y)) { cycleGait(c.sq); return true; }
  if (inRect(c.edit, MS.x, MS.y)) { state.rename = { sq: c.sq, text: c.sq.name }; return true; }
  const ic = c.icons.find(i => i.m && i.m.alive && Math.abs(MS.x - i.x) < 10 && Math.abs(MS.y - i.y) < 11);
  if (ic && !ic.m.veh) { state.dragSoldier = { m: ic.m, x0: MS.x, y0: MS.y, moved: false, add }; return true; }
  selectSquad(c.sq, add); state.picked = null;
  return true;
}
