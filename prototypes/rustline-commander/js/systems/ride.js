// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Soldiers riding in the open on a friendly vehicle (the jeep): they sit on its seats, go where it goes and fire
// their own weapons from it, while its crew works the mounted gun. Unlike the command vehicle's troop bay
// (m.inside, squads.js), a rider is seen, shoots and can be shot.
'use strict';

/** The open seats of each vehicle that carries riders: [metres right, metres forward] from its centre. */
const RIDE_SEATS = { jeep: [[0.42, 0.15], [-0.48, -1.15], [0.48, -1.15], [-0.42, 0.15]] };
/** How many soldiers the vehicle carries (config <kind>_seats, at most its drawn seats). */
function seatsOf(v) { return v && RIDE_SEATS[v.kind] ? Math.min(tune[v.kind + '_seats'] || 0, RIDE_SEATS[v.kind].length) : 0; }
function ridersOf(v) { return state.ents.filter(e => e.alive && e.rideOn === v); }
function rideFree(v) { return seatsOf(v) - ridersOf(v).length; }
/** A friendly vehicle with seats near the ground point p (null: none). */
function rideAt(p) { return state.ents.find(v => v.alive && v.team === 0 && seatsOf(v) > 0 && Math.hypot(p.x - v.x, p.z - v.z) < v.rad + 1.5) || null; }

/** Puts soldier m on the first free seat of v. */
function mountOn(m, v) {
  const used = new Set(ridersOf(v).map(r => r.seat)); let s = 0; while (used.has(s)) s++;
  m.rideOn = v; m.seat = s; m.path = null; m.moving = false; m.face = null; m.inCover = false; m.cover = 0;
  seatPos(m);
}
/** Keeps a rider on its seat as the vehicle moves and turns. */
function seatPos(m) {
  const v = m.rideOn, [r, f] = RIDE_SEATS[v.kind][m.seat], s = Math.sin(v.heading), c = Math.cos(v.heading);
  m.x = v.x + s * f + c * r; m.z = v.z + c * f - s * r; m.y = m.vy = (v.vy ?? v.y) + 0.45;
}
/** Soldier m jumps down beside the vehicle, on its seat's side. */
function dismount(m) {
  const v = m.rideOn; if (!v) return;
  const side = RIDE_SEATS[v.kind][m.seat][0] < 0 ? -1 : 1, d = v.rad + 1.1;
  const p = spotNear(v.x + Math.cos(v.heading) * side * d, v.z - Math.sin(v.heading) * side * d, m.seat);
  m.rideOn = null; m.x = p.x; m.z = p.z; m.y = m.vy = hAt(p.x, p.z); m.path = null; m.face = null;
}
/** The squad's riders get down; returns how many. */
function dismountSquad(sq, quiet) {
  let n = 0; for (const m of alive(sq)) if (m.rideOn) { dismount(m); n++; }
  if (n && !quiet) { sq.order = { t: 'hold' }; say(sq.name, 'Giù dalla jeep!'); }
  return n;
}
/** Everyone riding v gets down. */
function unloadVehicle(v) { const sqs = new Set(ridersOf(v).map(m => m.squad)); for (const sq of sqs) dismountSquad(sq); return sqs.size; }

/** The squad's soldiers walk to the vehicle and climb on while seats are free. */
function orderRide(sq, v) {
  const ms = alive(sq).filter(m => canRide(m) && !m.inside && !m.rideOn);
  if (!ms.length) { say(sq.name, 'Non possiamo salire.', '#e0a070'); return false; }
  if (rideFree(v) <= 0) { say(sq.name, 'La jeep è piena.', '#e0a070'); return false; }
  if (leaveBuilding(sq)) say(sq.name, 'Usciamo!');
  if (sq.members.some(m => m && m.alive && m.inside)) unloadSquad(sq);
  for (const m of ms) m.pref = null;
  sq.order = { t: 'ride', veh: v, done: false }; sq.tick = 0;
  say(sq.name, 'Saliamo sulla jeep!');
  mark(v.x, v.z, 0x4fe3e0);
  return true;
}
/** The ride order, each squad tick: walk to the vehicle (it may be moving), climb on, say who stays behind. */
function rideUpkeep(sq, ms) {
  const o = sq.order, v = o.veh;
  if (!v || !v.alive) { dismountSquad(sq, true); sq.order = { t: 'hold' }; return; }
  let walking = 0, left = 0;
  for (const m of ms) {
    if (m.rideOn || !canRide(m)) continue;
    if (rideFree(v) <= 0) { left++; m.path = null; continue; }
    if (dist2(m, v) < (v.rad + tune.board_radius) ** 2) { mountOn(m, v); continue; }
    walking++;
    if (!m.path || m.pi >= m.path.length || state.t - m.pathT > 1.5) setDest(m, v.x, v.z);
  }
  if (!walking && !o.done) { o.done = true; say(sq.name, left ? 'Sulla jeep. Posti finiti: ' + left + ' a terra.' : 'Tutti sulla jeep!'); }
}
