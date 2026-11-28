// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Squads and orders: making squads, postures, orders and how a squad carries them out. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Squads and orders --------------------------------------------------------------------------------
function squadName(slots) {
  if (slots.some(k => !UT[k].veh)) slots = slots.filter(k => !TRANSPORTS.includes(k)); // a squad is named for its soldiers, not its transport
  const k = new Set(slots);
  if (k.size === 1) {
    const t = slots[0], n = slots.length;
    return { rifle: n > 1 ? 'Fucilieri' : 'Fuciliere', sniper: n > 1 ? 'Team cecchini' : 'Cecchino solitario', mg: n > 1 ? 'Mitraglieri' : 'Mitragliere',
      medic: n > 1 ? 'Medici' : 'Medico', recruit: n > 1 ? 'Reclute' : 'Recluta',
      eng: n > 1 ? 'Genieri' : 'Geniere', radio: n > 1 ? 'Operatori radio' : 'Operatore radio', scout: n > 1 ? 'Esploratori' : 'Esploratore',
      at: n > 1 ? 'Squadra anticarro' : 'Anticarro', ltank: n > 1 ? 'Plotone carri' : 'Carro leggero', td: 'Cacciacarri', jeep: 'Jeep', htrack: 'Half Track' }[t];
  }
  const tr = traitsOf(slots).find(t => t.squad);
  return tr ? tr.squad : 'Squadra';
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
/**
 * The fallen leave their squad fallen_show seconds after they die (the card shows them crossed out till then);
 * what they were stays in sq.fallen for the barracks to replace. A squad with nobody left goes from the cards
 * and the rest are numbered again (iteration 58).
 */
function pruneFallen() {
  let any = false;
  for (const sq of state.squads) {
    let out = false;
    for (let i = sq.members.length - 1; i >= 0; i--) {
      const m = sq.members[i]; if (m && m.alive) continue;
      if (m && state.t - (m.deathT || 0) < tune.fallen_show) continue;
      (sq.fallen || (sq.fallen = [])).push(sq.slots[i]);
      sq.members.splice(i, 1); sq.slots.splice(i, 1); out = true;
    }
    if (out) { any = true; if (sq.slots.length && !sq.named) sq.name = squadName(sq.slots); }
  }
  if (!any) return;
  const n = state.squads.length;
  state.squads = state.squads.filter(q => q.members.length);
  if (state.squads.length === n) return;
  state.squads.forEach((q, i) => { q.id = i; });
  if (state.rename && !state.squads.includes(state.rename.sq)) state.rename = null;
}
function inRadio(sq) { return state.tank.alive && alive(sq).some(heardAt); }
function setDest(m, x, z) {
  if (m.fixed || m.rideOn) return; // a rider goes where its jeep goes
  // paths go around the vehicles standing still (the command tank above all)
  // (a vehicle keeps its own hull's width more: the lane it gives way in, driveAlong)
  const mr = m.veh ? m.rad + 0.6 : 0.7;
  // a vehicle goes round every standing hull, even one it touches (never closer to it than it already is);
  // a soldier round those not already beside him
  const vs = state.ents.filter(v => v.alive && v.veh && v !== m && dist2(v, m) < 60 * 60 && (m.veh || dist2(v, m) > (v.rad + mr) ** 2) && !(v.moving || (v.kind === 'tank' && Math.abs(v.speed) > 0.5)))
    .map(v => ({ x: v.x, z: v.z, r: Math.min(v.rad + mr, Math.sqrt(dist2(v, m)) - 0.4) }));
  PF.avoid = (px, pz) => { for (const v of vs) if ((px - v.x) ** 2 + (pz - v.z) ** 2 < v.r * v.r) return true; return false; };
  PF.climb = climber(m) ? tune.climb_max : 0;
  m.path = findPath(m.x, m.z, x, z, 1, m.veh ? 9000 : 12000, m.veh ? 1 : 3, m.veh ? tune.tank_ground_climb : 1); PF.avoid = null; PF.climb = 0;
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
/** Where the other friendly units are or are going (each with the room it needs), but for those in skip. */
function takenSpots(skip) {
  const out = [];
  for (const o of state.ents) {
    if (!o.alive || o.team !== 0 || o.inside || o.rideOn || o.garrison || skip.has(o)) continue;
    const p = o.path && o.pi < o.path.length && o.dest ? o.dest : o;
    out.push({ x: p.x, z: p.z, gap: o.veh ? o.rad + tune.veh_gap / 2 : 0.65, veh: !!o.veh });
  }
  return out;
}
/**
 * The free spot nearest (x,z) for unit m: ground it can stand on (a vehicle: clear of walls and cliffs), not where
 * another unit is or is going. Claims it in taken.
 */
function claimSpot(m, x, z, taken) {
  const me = m.veh ? m.rad + tune.veh_gap / 2 : 0.65, step = m.veh ? 1.2 : 0.7;
  // a vehicle's spot: the hull fits there (judged at that spot, not from where the vehicle is now) and it drives
  // there straight from the point given, so the spot is on the same side of every wall; it minds only other hulls
  const hullAt = (px, pz, hd) => vehFits({ x: px, z: pz, rad: m.rad }, px, pz, hd);
  const reach = (px, pz) => {
    const dx = px - x, dz = pz - z, L = Math.hypot(dx, dz), n = Math.ceil(L / 0.8), hd = Math.atan2(dx, dz);
    for (let k = 1; k < n; k++) if (!hullAt(x + dx * k / n, z + dz * k / n, hd)) return false;
    return true;
  };
  const ok = (px, pz) => {
    const cx = Math.floor(px), cz = Math.floor(pz);
    if (!walkable(cx, cz) || deepWater(px, pz) || (m.veh ? hardNear(cx, cz) || !hullAt(px, pz, m.heading) || !reach(px, pz) : perch(cx, cz))) return false;
    for (const t of taken) if ((!m.veh || t.veh) && (t.x - px) ** 2 + (t.z - pz) ** 2 < (t.gap + me) ** 2) return false;
    return true;
  };
  for (let r = 0; r <= 14; r += step) {
    const n = r ? Math.ceil(2 * Math.PI * r / step) : 1;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2 + r * 0.7, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (ok(px, pz)) { taken.push({ x: px, z: pz, gap: me, veh: !!m.veh }); return { x: px, z: pz }; }
    }
  }
  return { x, z };
}
function goTo(sq, x, z, how, face) {
  const ms = alive(sq); if (!ms.length) return 0;
  let threat = null;
  if (face != null) threat = { x: Math.sin(face), z: Math.cos(face) };
  else {
    const en = nearestEnemyTo(x, z, 0, how === 'cover' ? 90 : 45);
    if (en) { const dx = en.x - x, dz = en.z - z, L = Math.hypot(dx, dz) || 1; threat = { x: dx / L, z: dz / L }; }
  }
  const fk = formOf(sq).k, inForm = fk !== 'free' && how !== 'cover'; // iteration 68: the squad's formation, unless sent to cover
  const fh = face != null ? face : headingTo(ms, x, z); sq.formFace = fh;
  const fpts = inForm ? formArrival(sq, ms, x, z, fh) : null;
  const inf = ms.filter(m => !m.veh), spots = how === 'none' || inForm ? [] : coverSpotsAt(x, z, inf.length, threat);
  // a line across the facing (or a loose ring without one) for whoever finds no cover
  const px = face != null ? Math.cos(face) : 0, pz = face != null ? -Math.sin(face) : 0;
  let k = 0;
  const taken = takenSpots(new Set(ms));
  for (const sp of spots) taken.push({ x: sp.x, z: sp.z, gap: 0.65 });
  ms.forEach((m, i) => {
    let d;
    if (!m.veh && spots[k]) d = spots[k++];
    else {
      // a line across the facing, or a loose ring (each man his own place: no two sent to one spot), then the nearest free spot
      if (fpts) d = fpts.get(m);
      else if (face != null) { const o = (i - (ms.length - 1) / 2) * (m.veh ? 3.2 : 1.7), back = m.veh ? 1.5 : 0; d = { x: x + px * o - Math.sin(face) * back, z: z + pz * o - Math.cos(face) * back }; }
      else { const a = i / Math.max(1, ms.length) * Math.PI * 2, r = m.veh || ms.length === 1 ? 0 : 1.6; d = { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r }; }
      d = claimSpot(m, d.x, d.z, taken);
    }
    setDest(m, d.x, d.z); m.pref = null; m.fDest = { x: d.x, z: d.z }; m.formDone = false;
    m.face = face != null ? face : fpts ? fh : null; m.moveFace = face;
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
/**
 * Suppression fire on target: the squad stays where it is and keeps firing at it, seen or not (pickTarget), whatever
 * its rules of engagement; every round at it pins it down (fire). It ends when the target falls.
 */
function orderSuppress(sq, target, stay = false) {
  const ms = alive(sq); if (!ms.length) return;
  for (const m of ms) { m.pref = target; m.path = null; m.moveFace = null; m.face = Math.atan2(target.x - m.x, target.z - m.z); }
  sq.order = { t: 'suppress', target, stay }; // stay: the end of a plan, they hold the spot even out of range
  sq.tick = 0;
  say(sq.name, (stay ? 'In posizione: fuoco su ' : 'Fuoco di soppressione su ') + UT[target.kind].name.toLowerCase() + '!');
  mark(target.x, target.z, 0x9fd8ff);
}
/** Infantry that can ride (not the anti-tank gun, not vehicles). */
function canRide(m) { return m && m.alive && !m.veh && !m.rideOn; }
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
  recruit: { cover: 5, back: 0 }, at: { cover: 6, back: 3 }, sniper: { cover: 8, back: 6 },
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
    if (m.veh || m.inside || m.garrison || m.task) continue; // a soldier on a task (iteration 71) does it first
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
  const ms = alive(sq).filter(m => !m.veh);
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
  m.floorY = m.kind === 'sniper' ? Math.max(0, Math.floor(b.h / 3) - 1) * 3 : 0; // the sniper takes the top floor (iteration 63)
  m.x = s.x; m.z = s.z; m.y = m.vy = b.g + m.floorY; m.path = null; m.moving = false; m.dest = null; m.face = null;
}
function exitBuilding(m, i) {
  const b = m.garrison; if (!b) return;
  b.occ = b.occ.filter(o => o !== m); m.garrison = null; m.floorY = 0;
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
function orderHold(sq) { for (const m of alive(sq)) { m.path = null; m.pref = null; m.formLead = false; } sq.order = { t: 'hold' }; say(sq.name, 'Teniamo la posizione.'); }
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
  if (sq.order.t === 'ride') { rideUpkeep(sq, ms); sq.tick = 0.3; return; } // ride.js
  squadSense(sq, ms); // tactics.js: a building to hold, or back to the tank (iteration 66)
  if (sq.order.t === 'garrison') {
    const b = sq.order.b; let left = 0;
    for (const m of ms) {
      if (m.veh || m.garrison || m.inside) continue;
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
  if (sq.order.t === 'escort') { if (!heard) { sq.order = { t: 'hold' }; say(sq.name, 'Segnale perso, teniamo la posizione.', '#e0a070'); return; } escortUpkeep(sq, ms); }
  else if (sq.order.t === 'follow') {
    if (!heard) { sq.order = { t: 'hold' }; say(sq.name, 'Segnale perso, teniamo la posizione.', '#e0a070'); return; }
    sq.formFace = tk.heading;
    if (!followInForm(sq, ms)) ms.forEach((m, i) => {
      if (m.task) return; // on a task (iteration 71)
      if (m.kind === 'sniper' && !m.veh) return; // its own post (roleUpkeep)
      if (state.t - (m.combatT || -99) < 6 && !m.veh) return; // fighting: stays in its cover till it is over
      const a = tk.heading + Math.PI + (i - (ms.length - 1) / 2) * 0.45 + (sq.id % 2 ? 0.6 : -0.6) * (1 + (sq.id >> 1) * 0.5), r = 7 + (sq.id >> 1) * 2 + (m.veh ? 3 : 0) + (m.kind === 'medic' ? 4 : 0);
      const px = tk.x + Math.sin(a) * r, pz = tk.z + Math.cos(a) * r;
      if ((m.x - px) ** 2 + (m.z - pz) ** 2 > 9 && (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2.5)) setDest(m, px, pz);
    });
  } else if (sq.order.t === 'suppress') {
    const t = sq.order.target;
    if (!t || !t.alive) { for (const m of ms) m.pref = null; sq.order = { t: 'hold' }; say(sq.name, 'Bersaglio abbattuto, cessiamo il fuoco.'); return; }
    for (const m of ms) { // out of reach: closer, just into range (no need to see it); in reach: they stay and fire
      m.pref = t; if (m.kind === 'medic') continue;
      const w = weapon(UT[m.kind].w), far = !sq.order.stay && dist2(m, t) > (w.range * 0.9) ** 2;
      if (!far) { if (m.path && m.suppGo) { m.path = null; m.suppGo = false; } if (!m.moving) m.face = Math.atan2(t.x - m.x, t.z - m.z); }
      else if (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2.5) { const d = Math.sqrt(dist2(m, t)) || 1, k = (d - w.range * 0.75) / d; setDest(m, m.x + (t.x - m.x) * k, m.z + (t.z - m.z) * k); m.suppGo = true; }
    }
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
    // the leg under way: suppression on its target (the ROE do not stop it), or none at all (the fire gate, unitstep.js)
    const lg = o.pts[o.i], sp = lg && lg.supp && lg.supp.alive ? lg.supp : null;
    for (const m of ms) { if (sp) m.pref = sp; else if (m.pref && m.pref === o.lastSupp) m.pref = null; }
    if (sp) o.lastSupp = sp;
    const bounding = boundStep(sq, ms, o); // tactics.js: bounding under fire
    if (!bounding) formMarch(sq, ms); else for (const m of ms) m.formLead = false; // formation.js: the march in formation
    if (bounding) { /* the bounds lead */ }
    else if (ms.every(m => !m.path || m.pi >= m.path.length || (m.dest && dist2(m, m.dest) < 9 && o.i < o.pts.length - 1))) {
      if (o.i < o.pts.length - 1) { o.i++; const p = o.pts[o.i]; o.cover = goTo(sq, p.x, p.z, p.how, p.face) > 0; sq.tick = 0.4; }
      else if (o.final && o.final.alive) { for (const m of ms) if (m.pref === o.lastSupp) m.pref = null; orderSuppress(sq, o.final, true); } // the plan's end: stop and fire on it till it falls
      else { o.done = true; if (o.fortify) fortifyNow(sq, ms, o); for (const m of ms) if (o.lastSupp && m.pref === o.lastSupp) m.pref = null; if (o.ambush) say(sq.name, 'In posizione. Aspettiamo che si avvicinino.'); else if (o.cover) say(sq.name, 'In posizione, al coperto.'); }
    }
  }
  roleUpkeep(sq, ms);
}
// ---- Comando orders (iteration 70): fall back on the tank, watch a sector, escort a unit -----------------------
/** A spot behind the tank, on the side away from the enemies the squad knows of near it (or behind its hull). */
function retreatSpot(sq) {
  const tk = state.tank, ms = alive(sq).filter(m => !m.veh); const src = ms.length ? ms : alive(sq);
  const c = src.reduce((a, m) => ({ x: a.x + m.x / src.length, z: a.z + m.z / src.length }), { x: 0, z: 0 });
  const foes = state.ents.filter(o => o.alive && o.team === 1 && !hiddenFoe(o) && (o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 45 * 45);
  const f = foes.length ? foes.reduce((a, o) => ({ x: a.x + o.x / foes.length, z: a.z + o.z / foes.length }), { x: 0, z: 0 }) : { x: tk.x + Math.sin(tk.heading) * 10, z: tk.z + Math.cos(tk.heading) * 10 };
  const dx = tk.x - f.x, dz = tk.z - f.z, L = Math.hypot(dx, dz) || 1;
  return spotNear(tk.x + dx / L * (tk.rad + 4), tk.z + dz / L * (tk.rad + 4), 0);
}
/** Ripiega sul carro: at a run to the far side of the tank, no stopping to fire on the way (retreat_speed faster). */
function orderRetreat(sq, msg = 'Ripieghiamo sul carro!') {
  leaveBuilding(sq);
  const p = retreatSpot(sq); orderMove(sq, p.x, p.z, 'none');
  sq.order.retreat = true; sq.order.pts[0].fire = 'none';
  say(sq.name, msg, '#ff9a7a');
}
/** Sorveglia settore: to (x,z), then fire only on what comes into the arc (watch_arc wide, facing face), aiming better (watch_acc). */
function orderWatch(sq, x, z, face) {
  if (face == null) { const en = nearestEnemyTo(x, z, 0, 60); face = en ? Math.atan2(en.x - x, en.z - z) : headingTo(alive(sq), x, z); }
  orderMove(sq, x, z, 'auto', false, face);
  sq.order.watch = { x, z, face, arc: tune.watch_arc * Math.PI / 180 };
  say(sq.name, 'Sorvegliamo il settore: spariamo a chi ci entra.', '#9fd8ff');
}
/** True when unit e of a squad watching a sector, in place, may fire on o (it is inside the arc). */
function inWatch(e, o) {
  const w = e.squad && e.squad.order.watch; if (!w || !e.squad.order.done) return true;
  return Math.abs(angDiff(w.face, Math.atan2(o.x - w.x, o.z - w.z))) <= w.arc / 2;
}
/** Scorta: the squad keeps by unit u (a soldier stands for his squad, a vehicle for itself), behind its back. */
function orderEscort(sq, u) {
  leaveBuilding(sq);
  sq.order = { t: 'escort', u, sq2: u.veh ? null : u.squad }; sq.tick = 0;
  say(sq.name, 'Ricevuto, scortiamo ' + (u.veh ? UT[u.kind].name.toLowerCase() : u.squad ? u.squad.name : 'loro') + '.');
}
/** The escort's upkeep: the escorted unit's place (its squad's first soldier alive), the squad's formation behind it. */
function escortUpkeep(sq, ms) {
  const o = sq.order, u = o.sq2 ? alive(o.sq2).find(m => !m.veh) || alive(o.sq2)[0] : o.u;
  if (!u || !u.alive) { sq.order = { t: 'hold' }; say(sq.name, 'Non c\'è più nessuno da scortare: teniamo la posizione.', '#e0a070'); return; }
  const h = u.heading || 0, back = u.veh ? u.rad + 5 : 5, ax = u.x - Math.sin(h) * back, az = u.z - Math.cos(h) * back;
  const k = formOf(sq).k === 'free' ? 'wedge' : formOf(sq).k, inf = ms.filter(m => !m.veh), veh = ms.filter(m => m.veh);
  const put = (m, p) => {
    if ((state.t - (m.combatT || -99) < 6 && !m.veh) || m.task) return; // fighting, or on a task: not now
    const d2 = (m.x - p.x) ** 2 + (m.z - p.z) ** 2; m.formCatch = d2 > tune.form_catch_d ** 2; // far behind: it hurries (formation.js)
    if (d2 > 4 && (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2)) setDest(m, p.x, p.z);
  };
  inf.forEach((m, i) => put(m, formPoint(k, i, tune.form_gap, ax, az, h)));
  veh.forEach((v, i) => put(v, formPoint(k, i, tune.form_veh_gap, ax - Math.sin(h) * (inf.length ? tune.form_veh_gap : 0), az - Math.cos(h) * (inf.length ? tune.form_veh_gap : 0), h)));
  sq.formFace = h; sq.tick = Math.min(sq.tick, 0.6);
}

// ---- Job skills on order (iteration 71): one soldier's task, or the squad's fortifying --------------------------
/** The soldier of kind k (any kind when k is null) in the chosen squads nearest (x,z), free of tasks; or null. */
function pickDoer(sel, k, x, z) {
  let best = null, bd = 1e9;
  for (const sq of sel) { if (!inRadio(sq)) continue; for (const m of alive(sq)) {
    if (m.veh || m.inside || m.rideOn || m.task || (k && m.kind !== k)) continue;
    const d = (m.x - x) ** 2 + (m.z - z) ** 2; if (d < bd) { bd = d; best = m; } } }
  return best;
}
/** Gives soldier m a task {k, ...}: it lasts while his squad's order stays the same and task_time has not run out. */
function giveTask(m, t, msg) {
  if (!m) return false;
  if (m.garrison && t.k !== 'nade') exitBuilding(m, m.squad ? m.squad.members.indexOf(m) : 0);
  m.task = Object.assign(t, { ord: m.squad && m.squad.order, t0: state.t, goT: -9 });
  if (msg && m.squad) say(m.squad.name, msg);
  sfx('radio'); return true;
}
/** Walks m toward (x,z) every 1.5 s while farther than r. True when he is there. */
function taskGo(m, x, z, r) {
  if ((m.x - x) ** 2 + (m.z - z) ** 2 <= r * r) { if (m.path && m.task.going) { m.path = null; m.task.going = false; } return true; }
  if (state.t - m.task.goT > 1.5 || !m.path || m.pi >= m.path.length) { m.task.goT = state.t; m.task.going = true; setDest(m, x, z); }
  return false;
}
/** A thrown smoke grenade lands: a cloud enemies cannot see through (smoke_nade_r wide, smoke_nade_time long). */
function smokeAt(x, z) {
  const r = tune.smoke_nade_r;
  state.smokes.push({ x, z, r, until: state.t + tune.smoke_nade_time });
  for (let i = 0; i < 16; i++) { const a = rng() * 6.28, q = rng() * r; state.fx.push({ kind: 'smoke', x: x + Math.cos(a) * q, y: hAt(x, z) + 1, z: z + Math.sin(a) * q, t: -rng() * 0.5, life: tune.smoke_nade_time, s: 2.2, rise: 0.3, col: 0xcfc8bd }); }
  sfx('rpg', x, z);
}
/** A soldier throws something from where he stands to (x,z): a grenade's splinters, or smoke. */
function throwAt(m, x, z, smoke) {
  const D = Math.hypot(x - m.x, z - m.z);
  launch(smoke ? { kind: 'mortar', grenade: true, smoke: true, team: 0, owner: m, dmg: 0, blast: 0.1, dtype: 'frag' }
    : { kind: 'mortar', grenade: true, team: 0, owner: m, dmg: tune.grenade_damage, blast: tune.grenade_blast, dtype: 'frag' },
    m.x, m.y + 1.7, m.z, x, hAt(x, z) + 0.6, z, D / (1.1 + D / 24), 14);
  floatText(m.x, m.y + 2.4, m.z, smoke ? 'fumogeno!' : 'granata!', smoke ? '#cfc8bd' : '#ffd36a');
}
/** One step of soldier m's task: walk, then do it; drops it when done, when his squad gets a new order, or after task_time. */
function taskStep(m, dt) {
  const t = m.task, sq = m.squad, tk = state.tank;
  if ((sq && sq.order !== t.ord) || state.t - t.t0 > tune.task_time) { if (m.carry) dropCarry(m); m.task = null; return; }
  if (t.k === 'nade' || t.k === 'smoke') { // within reach of the spot, then it flies
    const r = t.k === 'nade' ? tune.grenade_range : tune.smoke_throw;
    if (!taskGo(m, t.x, t.z, r * 0.9)) return;
    if (t.k === 'nade' && state.t - (m.nadeT ?? -99) < tune.grenade_cd * 0.4) return; // the last one has only just gone
    if (t.k === 'nade') m.nadeT = state.t; else sq.smokes = (sq.smokes ?? tune.squad_smokes) - 1;
    throwAt(m, t.x, t.z, t.k === 'smoke'); m.task = null; return;
  }
  if (t.k === 'fix') { // beside the hull till it is whole (engSkill repairs, out of the fight, for scrap)
    const v = t.v; if (!v.alive || v.hp >= v.maxhp - 0.5 || state.scrap <= 0) { if (sq) say(sq.name, v.alive && v.hp >= v.maxhp - 0.5 ? 'Riparato!' : 'Non si può riparare.'); m.task = null; return; }
    taskGo(m, v.x - Math.sin(v.heading) * (v.rad + 0.8), v.z - Math.cos(v.heading) * (v.rad + 0.8), tune.eng_radius + v.rad - 0.5); return;
  }
  if (t.k === 'heal') { // beside the wounded man till he is well (medicSkill tends him)
    const o = t.o; if (!o.alive || o.hp >= o.maxhp - 0.5 || medPower(m) <= 0) { m.task = null; return; }
    taskGo(m, o.x + 0.8, o.z + 0.4, tune.medic_radius * 0.6); return;
  }
  if (t.k === 'fetch') { // to the pickup, then back to the tank with it
    const p = t.p;
    if (!m.carry) {
      if (p.taken) { m.task = null; return; } // someone (the tank) got there first
      if (!taskGo(m, p.x, p.z, 1.4)) return;
      p.taken = true; m.carry = p; floatText(m.x, m.y + 2.2, m.z, 'preso', '#ffd36a'); m.task.goT = -9; return;
    }
    if (!tk.alive) { dropCarry(m); m.task = null; return; }
    if (!taskGo(m, tk.x - Math.sin(tk.heading) * (tk.rad + 1.2), tk.z - Math.cos(tk.heading) * (tk.rad + 1.2), tk.rad + 2.5)) return;
    deliverCarry(m); m.task = null;
  }
}
/** What soldier m carries reaches the tank: scrap counted, a crate opened (put down beside the hull if there is no room). */
function deliverCarry(m) {
  const p = m.carry; m.carry = null; if (!p) return;
  if (p.ammo || p.loot) { if (!takeCrate(p)) { p.taken = false; p.x = m.x; p.z = m.z; say('Equipaggio', 'Nessuno spazio: la cassa resta a terra accanto al carro.', '#e0a070'); } return; }
  state.scrap += p.value; floatText(m.x, m.y + 2, m.z, '+' + p.value + ' rottami', '#ffd36a'); sfx('coin');
}
/** A soldier who falls (or gives up) drops what he carries where he stands. */
function dropCarry(m) { const p = m.carry; if (!p) return; m.carry = null; p.taken = false; p.x = m.x; p.z = m.z; }
/** The untaken pickup within 2.5 m of (x,z), or null. */
function pickupAt(x, z) { let best = null, bd = 2.5 * 2.5; for (const p of state.pickups) { if (p.taken) continue; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; best = p; } } return best; }
/** Fortifica qui: the squad goes there; on arriving its engineers lay sandbags and its machine gunners dig a nest, facing face. */
function orderFortify(sq, x, z, face) {
  if (face == null) { const en = nearestEnemyTo(x, z, 0, 60); face = en ? Math.atan2(en.x - x, en.z - z) : headingTo(alive(sq), x, z); }
  orderMove(sq, x, z, 'auto', false, face); sq.order.fortify = { face };
  say(sq.name, 'Ricevuto, ci fortifichiamo lì.', '#e0c890');
}
/** The squad has arrived on a fortify order: bags and nests. */
function fortifyNow(sq, ms, o) {
  let n = 0;
  for (const m of ms) {
    if (m.veh || m.garrison || m.inside) continue;
    if (m.kind === 'eng') { n += placeBags(m, o.fortify.face); m.buildT = state.t; }
    else if (m.kind === 'mg') { n += placeBags(m, o.fortify.face); m.nest = true; m.stillT = state.t; floatText(m.x, m.y + 2.2, m.z, 'nido di mitragliatrice', '#e0c890'); }
  }
  if (n) { sfx('crunch', ms[0].x, ms[0].z); say(sq.name, 'Posizione fortificata.', '#e0c890'); } else say(sq.name, 'Niente da costruire qui.', '#e0a070');
  o.fortify = null;
}

// ---- Quick orders (iteration 69): Z X C in both modes ------------------------------------------------------------
/** Who a quick order goes to: the chosen squads in Comando, else every squad; only those in radio reach hear it. */
function quickSquads() {
  let ts = state.tpause ? selectedSquads() : []; if (!ts.length) ts = state.squads.filter(s => alive(s).length);
  const heard = ts.filter(inRadio);
  if (ts.length && !heard.length) say('Radio', 'Nessuna squadra in portata radio.', '#e0a070');
  return heard;
}
/** Z: form on me, every squad that hears it follows the tank. */
function quickFollow() { const ts = quickSquads(); for (const sq of ts) orderFollow(sq); if (ts.length) sfx('radio'); }
/** C: hold fire, or (when they all already hold it) back to the rules each had before. */
function quickHoldFire() {
  const ts = quickSquads(); if (!ts.length) return;
  const all = ts.every(sq => roeOf(sq).k === 'hold');
  for (const sq of ts) {
    if (all) setRoe(sq, sq.roePrev && sq.roePrev !== 'hold' ? sq.roePrev : 'free');
    else if (roeOf(sq).k !== 'hold') { sq.roePrev = roeOf(sq).k; setRoe(sq, 'hold'); }
  }
  sfx('radio');
}
/** U: out of the building and off the vehicle, for the chosen squads. */
function quickOut(sq) {
  if (alive(sq).some(m => m.garrison)) { leaveBuilding(sq); sq.order = { t: 'hold' }; say(sq.name, 'Usciamo!'); }
  if (alive(sq).some(m => m.rideOn || (seatsOf(m) > 0 && ridersOf(m).length))) { dismountSquad(sq); for (const v of alive(sq)) if (seatsOf(v) > 0) unloadVehicle(v); }
}
function selectedSquads() { return state.squads.filter(s => s.selected && alive(s).length); }
/**
 * Changes the plan of every selected squad that heard it and walks a path: f(order, lastStop). Returns how many.
 * The attack vectors: a leg without fire, suppression on an enemy along a leg, the action at the end.
 */
function legAll(f) {
  let n = 0;
  for (const sq of selectedSquads()) { const o = sq.order; if (!inRadio(sq) || o.t !== 'move' || o.done || !o.pts.length) continue; f(o, o.pts[o.pts.length - 1], sq); n++; }
  return n;
}
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
  if (kind === 'move' || kind === 'cover' || kind === 'ambush' || kind === 'watch' || kind === 'fortify') tgt = null;
  if (kind === 'suppress' && !(tgt && tgt.alive)) return false;
  let any = false;
  for (const sq of sel) {
    if (!inRadio(sq)) { say(sq.name, 'Fuori portata radio: non vi sentiamo.', '#e0a070'); continue; }
    any = true;
    if (!kind && !tgt && Math.hypot(pt.x - state.tank.x, pt.z - state.tank.z) < state.tank.rad + 0.9) { // right-click on the command vehicle
      if (tankStats().seats > 0 && alive(sq).some(m => canRide(m) && !m.inside)) orderBoard(sq); else orderFollow(sq); // climb in, or follow me
      continue;
    }
    const bAt = (!kind || kind === 'cover') && !tgt ? buildingAt(pt.x, pt.z) : null;
    if (bAt && alive(sq).some(m => !m.veh)) { // right-click on a building: go in
      if (sq.members.some(m => m && m.alive && m.inside)) unloadSquad(sq);
      orderGarrison(sq, bAt); continue;
    }
    if (leaveBuilding(sq)) say(sq.name, 'Usciamo!');
    if (sq.members.some(m => m && m.alive && m.inside)) unloadSquad(sq);
    { let n = 0; for (const m of alive(sq)) if (m.rideOn && m.rideOn.squad !== sq) { dismount(m); n++; } if (n) say(sq.name, 'Giù dal mezzo, ci andiamo a piedi.'); } // riders on another squad's vehicle walk; on their own, it drives them
    if (kind === 'ambush') orderAmbush(sq, pt.x, pt.z, face);
    else if (kind === 'watch') orderWatch(sq, pt.x, pt.z, face);
    else if (kind === 'fortify') orderFortify(sq, pt.x, pt.z, face);
    else if (kind === 'suppress') orderSuppress(sq, tgt);
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
  if (jobPickInput()) return true; // jobs.js: a soldier's choice of Job is open
  if (MS.lp) { const c = cardAt(MS.x, MS.y), ic = c && c.icons.find(i => i.job && Math.abs(MS.x - i.x - 7) < 7 && Math.abs(MS.y - i.y + 13) < 7); // the gold arrow: his choices
    if (ic) { MS.lp = false; MS.drag = null; state.menuBlock = true; openJobPick(ic.m, ic.x, ic.y); return true; } }
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
  if (c.form && inRect(c.form, MS.x, MS.y)) { cycleForm(c.sq); return true; }
  if (inRect(c.edit, MS.x, MS.y)) { state.rename = { sq: c.sq, text: c.sq.name }; return true; }
  const ic = c.icons.find(i => i.m && i.m.alive && Math.abs(MS.x - i.x) < 10 && Math.abs(MS.y - i.y) < 11);
  if (ic && !ic.m.veh) { state.dragSoldier = { m: ic.m, x0: MS.x, y0: MS.y, moved: false, add }; return true; }
  selectSquad(c.sq, add); state.picked = null;
  return true;
}
