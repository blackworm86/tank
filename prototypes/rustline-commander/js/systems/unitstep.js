// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Units each step: think, move, fire. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Units: think, move, fire ---------------------------------------------------------------------------
function updateUnits(dt) {
  const tk = state.tank;
  state.fogT = (state.fogT || 0) - dt; if (state.fogT <= 0) { state.fogT = 0.2; updateFog(); updateVision(); radarUpdate(0.2); }
  state.bldT = (state.bldT || 0) - dt; if (state.bldT <= 0) { state.bldT = 1; checkBuildings(); }
  for (const e of state.ents) {
    if (!e.alive) { if (!e.gone && state.t - e.deathT > (e.veh ? 40 : 9)) e.gone = true; continue; }
    if (e.kind === 'tank' || UT[e.kind].inert || e.dummy) continue; // (a depot only stands there; a practice target neither moves nor shoots)
    if (e.inside) { e.x = tk.x; e.z = tk.z; e.y = e.vy = tk.y; e.moving = false; continue; } // riding
    if (e.rideOn && !e.rideOn.alive) dismount(e); // its jeep is gone: on foot again (ride.js)
    const g = e.group;
    if (g && !g.alert && dist2(e, tk) > 90 * 90) continue; // far and calm: asleep
    e.think -= dt; e.cool -= dt; e.recoil = Math.max(0, (e.recoil || 0) - dt * 3);
    const w = weapon(UT[e.kind].w);
    if (e.think <= 0) {
      e.think = 0.35 + rng() * 0.15;
      e.target = e.climbH != null ? null : pickTarget(e, w); // on a rock face: hands on the rock, no shooting
      e.cover = e.veh || e.rideOn ? 0 : e.target ? coverFrom(e, e.target.x, e.target.z) : coverAround(e);
      e.inCover = e.cover > 0;
      if (e.team === 1) raiderThink(e, w);
      if (!e.veh && !e.fixed && !e.garrison && !e.moving && raised(e) && state.t - (e.strandT || -99) > 2) unstrand(e);
    }
    if (e.garrison) { e.path = null; e.moving = false; e.y = e.vy = e.garrison.g + (e.floorY || 0); } // inside a building, at a window (a sniper on the top floor)
    else if (e.rideOn) { seatPos(e); e.path = null; e.moving = false; } // on a jeep's seat: it goes where the jeep goes
    else {
      moveAlong(e, dt);
      if (e.climbH != null) e.y = e.vy; // on a rock face: moveAlong sets the height
      else {
        e.y = e.veh ? surfaceY(e.x, e.z) : hAt(e.x, e.z); // a vehicle rides the drawn ground, ramps and all (as the command tank)
        if (e.y >= 99) e.y = 0;
        e.vy += (e.y - e.vy) * Math.min(1, dt * 12);
      }
      if (deepWater(e.x, e.z)) { dmgTo(e, 999, 'drown', null); continue; }
      if (e.veh && e.team === 0 && e.moving) crushUnder(e, unitSpeed(e));
    }
    if (e.veh) { e.turretYaw += angDiff(e.prevHd ?? e.heading, e.heading); e.prevHd = e.heading; tiltVehicle(e, dt); } // the turret turns with the hull, the hull tilts with the ground
    const t = e.target;
    if (t && t.alive) {
      const want = angTo(e, t);
      if (e.veh) {
        e.lastFoe = { a: want, t: state.t }; // the gunner keeps watching that way after it is gone
        e.turretYaw = turnToward(e.turretYaw, want, turretRate(e) * dt);
        // a still hull turns its front to the enemy unless it was told which way to face
        if (!e.moving && e.face == null) e.heading = turnToward(e.heading, want, hullTurn(e) * Math.PI / 180 * dt);
      } else if (!e.moving) e.heading = turnToward(e.heading, want, (w.turn ? w.turn * Math.PI / 180 : 8) * dt);
      let aligned = !e.veh || Math.abs(angDiff(e.turretYaw, want)) < ((ENEMY[e.kind] && ENEMY[e.kind].alignTol) || 0.2);
      if (w.arc && Math.abs(angDiff(e.heading, want)) > w.arc * Math.PI / 180) aligned = false; // outside the arc: swing first
      if (w.kind === 'ap' && e.moving) aligned = false;
      if (e.kind === 'sniper' && e.moving) aligned = false; // a sniper shoots from a position, never on the move
      if (lurking(e)) { // an ambush: hold fire till they walk into it (or someone is hit)
        if (dist2(e, t) <= (w.range * tune.ambush_trigger) ** 2 || state.t - (e.shotT || -99) < 1) springAmbush(e.squad); else aligned = false;
      }
      if (!e.team && e.squad) { // the squad's posture decides whether it opens fire
        const r = roe(e), hit = state.t - (e.squad.attackedT || -99) < tune.posture_memory, ordered = t === e.pref;
        if (!ordered && (r === 'hold' || (r === 'return' && !hit))) aligned = false; // the rules of engagement (squads.js ROES)
        if (!e.veh && e.moving && gait(e) === 'run') aligned = false; // running: no fire on the move
        const lg = legNow(e); if (lg && lg.fire === 'none') aligned = false; // a leg of the plan told not to fire
      }
      const fw = e.kind === 'at' && !e.team && !t.veh ? weapon('pistol') : w; // the anti-tank keeps his rockets for hulls: a pistol on men
      if (e.cool <= 0 && aligned && (!e.moving || e.veh || fw.kind === 'bullet' || fw.move)) { fire(e, t, fw); e.revealed = true; e.cool = fw.rate * (0.85 + rng() * 0.3) * (e.team ? 1 : (1 - (e.rank || 0) * tune.rank_rate) * modOf(e).rate * (e.nest ? tune.nest_rate : 1)); }
    } else {
      if (!e.moving && e.face != null) e.heading = turnToward(e.heading, e.face, (e.veh ? hullTurn(e) * Math.PI / 180 : w && w.turn ? w.turn * Math.PI / 180 : 6) * dt);
      if (e.veh && UT[e.kind].w) e.turretYaw = turnToward(e.turretYaw, watchYaw(e), Math.min(turretRate(e), tune.turret_return * 2) * dt);
    }
    if (e.kind === 'medic' || e.kind === 'eng' || e.kind === 'mg') roleSkill(e, dt);
  }
  // soldiers keep a little space between them
  const inf = state.ents.filter(e => e.alive && !e.veh && !e.fixed && !e.inside && !e.rideOn);
  for (let i = 0; i < inf.length; i++) for (let j = i + 1; j < inf.length; j++) {
    const a = inf[i], b = inf[j], dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
    if (d2 > 0.0001 && d2 < 0.64) { const d = Math.sqrt(d2), p = (0.8 - d) * 0.25; nudge(a, -dx / d * p, -dz / d * p); nudge(b, dx / d * p, dz / d * p); }
  }
  // hulls never sit inside one another: overlapping vehicles push apart (the command tank and practice targets stand firm)
  const hulls = state.ents.filter(e => e.alive && e.veh && !e.inside);
  for (const a of hulls) {
    if (a.kind === 'tank' || a.dummy || a.fixed) continue;
    for (const b of hulls) {
      if (a === b) continue;
      const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz), ov = a.rad + b.rad - d;
      if (ov <= 0) continue;
      const share = b.kind === 'tank' || b.dummy || b.fixed ? 1 : 0.5, ux = d > 0.01 ? dx / d : Math.sin(a.id || 1), uz = d > 0.01 ? dz / d : Math.cos(a.id || 1);
      const nx = a.x + ux * Math.min(ov * share, 0.15), nz = a.z + uz * Math.min(ov * share, 0.15);
      if (vehCanGo(a, nx, nz)) { a.x = nx; a.z = nz; }
    }
  }
  for (const e of inf) { // and out from under vehicles
    for (const v of state.ents) {
      if (!v.alive || !v.veh) continue;
      const dx = e.x - v.x, dz = e.z - v.z, r = v.rad + 0.4, d2 = dx * dx + dz * dz;
      if (d2 < r * r && d2 > 0.0001) {
        // a soldier walking to a point clear of the vehicle is passing by: no shove, or it stalls at the hull
        if (e.team === 1 && v.team === 0 && (v.kind === 'tank' ? Math.abs(v.speed) > tune.crush_speed : v.moving)) continue; // run over, not pushed aside
        const wp = e.moving && e.path && e.path[e.pi];
        if (wp && (wp.x - v.x) ** 2 + (wp.z - v.z) ** 2 >= r * r) continue;
        if (wp && e.pi < e.path.length - 1) e.pi++; // a waypoint under the hull: skip it, or he walks into it for ever
        const d = Math.sqrt(d2), p = (r - d) * (e.moving ? 0.6 : 1); nudge(e, dx / d * p, dz / d * p);
      }
    }
  }
}
/** A vehicle's pitch and roll from the ground at its four corners (as the command tank's). */
function tiltVehicle(e, dt) {
  const s = Math.sin(e.heading), c = Math.cos(e.heading), L = e.rad * 1.05, Wd = e.rad * 0.6;
  const h = (lx, lz) => surfaceY(e.x + c * lx + s * lz, e.z - s * lx + c * lz);
  const f = (h(-Wd, L) + h(Wd, L)) / 2, b = (h(-Wd, -L) + h(Wd, -L)) / 2, l = (h(Wd, L) + h(Wd, -L)) / 2, r = (h(-Wd, L) + h(-Wd, -L)) / 2;
  const k = Math.min(1, dt * 6), cl = v => Math.max(-0.45, Math.min(0.45, v));
  e.pitch = (e.pitch || 0) + (cl(-(f - b) / (2 * L)) - (e.pitch || 0)) * k;
  e.roll = (e.roll || 0) + (cl((l - r) / (2 * Wd)) - (e.roll || 0)) * k;
}
/**
 * Infantry under a moving hull is run over: the command tank (above crush_speed) and the player's
 * other vehicles while they drive. The test is the hull's own box, not a circle round it.
 */
function crushUnder(v, speed) {
  if (Math.abs(speed) <= tune.crush_speed) return;
  const s = Math.sin(v.heading), c = Math.cos(v.heading), hw = v.rad * 0.72 + 0.35, hl = v.rad * 1.15 + 0.35;
  for (const e of state.ents) {
    if (!e.alive || e.veh || e.team !== 1 || e.garrison) continue;
    const dx = e.x - v.x, dz = e.z - v.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
    if (Math.abs(lx) < hw && lz > -hl && lz < hl + (speed > 0 ? 0.5 : 0)) {
      dmgTo(e, 999, 'crush', v); floatText(e.x, e.y + 2, e.z, 'schiacciato', '#ffb070'); sfx('crunch', e.x, e.z);
    }
  }
}
function nudge(e, dx, dz) {
  const nx = e.x + dx, nz = e.z + dz;
  if (walkable(Math.floor(nx), Math.floor(nz)) && Math.abs(hAt(nx, nz) - hAt(e.x, e.z)) <= 1) { e.x = nx; e.z = nz; }
}
/** A vehicle's turret speed, radians a second: the support tank's, the armoured car's, a raider's. */
function turretRate(e) { return (e.kind === 'ltank' ? 70 : e.kind === 'td' ? tune.td_traverse : e.kind === 'jeep' || e.kind === 'htrack' ? tune.jeep_turret : enemyTurret(ENEMY[e.kind])) * Math.PI / 180; }
/**
 * Where a vehicle's gunner looks with no target: along the way it drives, the way it was told to face, or the
 * last enemy seen, swept slowly turret_scan either side as the crew watches.
 */
function watchYaw(e) {
  const k = e.id || 0, sweep = Math.sin(state.t * 0.45 + k * 1.7) * tune.turret_scan;
  if (e.lastFoe && state.t - e.lastFoe.t < 12) return e.lastFoe.a + sweep * 0.4;
  if (e.moving) return e.heading + sweep * 0.6;
  return (e.face != null ? e.face : e.heading) + sweep;
}
/** Tracks turn on the spot; wheels need to roll to turn. */
function tracked(e) { return e.kind === 'ltank' || e.kind === 'td' || e.kind === 'htrack' || e.kind === 'tank' || !!(ENEMY[e.kind] && ENEMY[e.kind].heavy); }
/** Can a vehicle's centre go to (x, z) from where it is: no deep water, no hard wall, no cliff step (as tankFits). */
function vehCanGo(e, x, z) {
  const ix = Math.floor(x), iz = Math.floor(z); if (!inMap(ix, iz) || deepWater(x, z)) return false;
  const i = ix + world.N * iz, top = world.hmap[i], g = world.groundRaw[i];
  if (top - g > 1 && !SOFTV.has(world.vox[VH * i + top - 1]) && world.road[i] !== 2) return false;
  return Math.abs(smoothH(x, z) - smoothH(e.x, e.z)) <= tune.tank_step_max;
}
/**
 * The whole hull at (x,z) turned to hd: the centre may go there (vehCanGo) and its four corners stand on no wall,
 * no deep water and no step much taller than the centre's.
 */
function vehFits(e, x, z, hd) {
  if (!vehCanGo(e, x, z)) return false;
  const s = Math.sin(hd), c = Math.cos(hd), L = e.rad * 0.85, Wd = e.rad * 0.5, h0 = smoothH(x, z);
  for (const [lx, lz] of [[-Wd, L], [Wd, L], [-Wd, -L], [Wd, -L]]) {
    const px = x + c * lx + s * lz, pz = z - s * lx + c * lz, ix = Math.floor(px), iz = Math.floor(pz);
    if (!inMap(ix, iz) || deepWater(px, pz)) return false;
    const i = ix + world.N * iz, top = world.hmap[i], g = world.groundRaw[i];
    if (top - g > 1 && !SOFTV.has(world.vox[VH * i + top - 1]) && world.road[i] !== 2) return false;
    if (Math.abs(smoothH(px, pz) - h0) > tune.tank_step_max + 0.5) return false;
  }
  return true;
}
/** False when moving vehicle e to (x,z) would push its hull further into another vehicle's. */
function hullFree(e, x, z) {
  for (const o of state.ents) {
    if (o === e || !o.alive || !o.veh || o.inside) continue;
    const R = e.rad + o.rad - 0.1, dn = (o.x - x) ** 2 + (o.z - z) ** 2;
    if (dn < R * R && dn < (o.x - e.x) ** 2 + (o.z - e.z) ** 2) return false;
  }
  return true;
}
/** True when the hull can drive straight from where it is to (x,z). */
function vehLine(e, x, z) {
  const dx = x - e.x, dz = z - e.z, L = Math.hypot(dx, dz), n = Math.ceil(L / 0.7), hd = Math.atan2(dx, dz);
  for (let k = 1; k <= n; k++) if (!vehFits(e, e.x + dx * k / n, e.z + dz * k / n, hd)) return false;
  return true;
}
/**
 * A vehicle drives like the command tank: it steers its nose toward the farthest point of its path, up to
 * veh_lookahead ahead, that it can reach in a straight line with its whole hull (so it never cuts a corner into a
 * wall), and moves only along its nose, speeding up and slowing down by veh_accel, slowing into a turn and to a
 * stop at the end. Tracks pivot on the spot; wheels turn only as they roll. Blocked, it slides along the obstacle;
 * still blocked, it backs up and looks for another way. It gives way to the vehicle ahead (veh_gap).
 */
function driveAlong(e, dt) {
  const P = e.path, last = P.length - 1, LA = tune.veh_lookahead + e.rad * 0.5;
  if (e.backT > 0) { // backing out of a jam, then a new way
    e.backT -= dt; const v = 1.6, nx = e.x - Math.sin(e.heading) * v * dt, nz = e.z - Math.cos(e.heading) * v * dt;
    if (vehCanGo(e, nx, nz)) { e.x = nx; e.z = nz; e.vs = -v; } else e.backT = 0;
    e.moving = true;
    if (e.backT <= 0 && e.dest) { e.vs = 0; const d0 = e.dest; setDest(e, d0.x, d0.z); }
    return;
  }
  // (a point it is already on is always passed: steering at a point under the hull only spins it)
  while (e.pi < last && (Math.hypot(P[e.pi].x - e.x, P[e.pi].z - e.z) < 1 || (Math.hypot(P[e.pi].x - e.x, P[e.pi].z - e.z) < LA && vehLine(e, P[e.pi + 1].x, P[e.pi + 1].z)))) e.pi++;
  const wp = P[e.pi], dx = wp.x - e.x, dz = wp.z - e.z, d = Math.hypot(dx, dz);
  let top = unitSpeed(e) * (shallow(e.x, e.z) ? 0.55 : 1), want = Math.atan2(dx, dz), dir = 1;
  // told which way to face and the way runs the other way: back up, front to the enemy
  if (e.moveFace != null && Math.abs(angDiff(e.moveFace, want)) > 1.9) { want += Math.PI; top *= 0.55; dir = -1; }
  const off = Math.abs(angDiff(e.heading, want)), sp0 = Math.abs(e.vs || 0);
  // there, or so near that turning round to reach the very point would only spin it on the spot
  if (e.pi === last && (d < Math.max(0.7, e.rad * 0.5) || (d < e.rad + 1.2 && off > 1.2))) { e.pi = P.length; e.vs = 0; e.moving = false; e.stuckT = 0; return; }
  const full = ((ENEMY[e.kind] && ENEMY[e.kind].hullTurnMove) || Math.max(60, hullTurn(e) * 1.4)) * Math.PI / 180;
  const roll = tracked(e) ? 1 : Math.min(1, tune.veh_wheel_turn + sp0 / Math.max(0.1, top) * (1 - tune.veh_wheel_turn) * 1.5);
  e.heading = turnToward(e.heading, want, full * roll * dt);
  // the speed it wants: less into a turn, less near the end (tracks stop to pivot, wheels keep rolling)
  let aim = top * Math.max(tracked(e) ? 0 : 0.35, Math.cos(Math.min(Math.PI / 2, off)));
  if (e.pi === last) aim = Math.min(aim, 0.6 + d * 0.9);
  // give way: a hull just ahead stops it (a standing one, the command tank, or a moving one with the lower id); one a little further slows it
  const hs = Math.sin(e.heading) * dir, hc = Math.cos(e.heading) * dir;
  for (const o of state.ents) {
    if (o === e || !o.alive || !o.veh || o.inside) continue;
    const ox = o.x - e.x, oz = o.z - e.z, od = Math.hypot(ox, oz), Rr = e.rad + o.rad + tune.veh_gap;
    const fw = ox * hs + oz * hc, lat = Math.abs(ox * hc - oz * hs); // ahead, and how far off its line
    if (od > Rr + 3 || fw <= 0 || lat > e.rad + o.rad) continue; // not in the lane it is about to drive
    // a standing hull is a thing in the way like a wall (the path goes round it, the hull cannot enter it: hullFree);
    // a moving one is traffic: the one with the higher id waits
    const going = o.kind === 'tank' ? Math.abs(o.speed || 0) > 0.3 : o.moving && Math.abs(o.vs || 0) > 0.2;
    if (!going) continue;
    if (od < Rr) { if (o.kind === 'tank' || (o.id || 0) < (e.id || 0)) aim = 0; }
    else aim = Math.min(aim, top * (0.3 + (od - Rr) / 3 * 0.7));
  }
  const v = sp0 + Math.max(-tune.veh_accel * 2 * dt, Math.min(tune.veh_accel * dt, aim - sp0));
  // the hull must fit where it goes (only the centre while it is still wedged in somewhere); blocked, it slides along
  const strict = vehFits(e, e.x, e.z, e.heading), fits = (x, z) => (strict ? vehFits(e, x, z, e.heading) : vehCanGo(e, x, z)) && hullFree(e, x, z);
  const side = angDiff(e.heading, want) > 0 ? 1 : -1;
  let went = v < 1e-4;
  for (const [da, k] of [[0, 1], [0.6 * side, 0.6], [-0.6 * side, 0.6]]) {
    if (went) break;
    const a = e.heading + da, nx = e.x + Math.sin(a) * v * k * dir * dt, nz = e.z + Math.cos(a) * v * k * dir * dt;
    if (fits(nx, nz)) { e.x = nx; e.z = nz; went = true; }
  }
  if (went) { e.vs = v * dir; e.blockT = Math.max(0, (e.blockT || 0) - dt); }
  else { e.vs = 0; e.blockT = (e.blockT || 0) + dt; if (e.blockT > 0.6) { e.blockT = 0; e.backT = 0.9; } } // wedged: back up, then a new way
  e.moving = true;
  // no headway for a while (giving way, or circling): think again about the way, round the standing hulls
  const now = Math.hypot(wp.x - e.x, wp.z - e.z);
  e.stuckT = Math.max(0, (e.stuckT || 0) + (d - now < top * dt * 0.1 && (off < 0.5 || aim === 0) ? dt : -dt * 2));
  // held up a few metres short of the end (a hull parked there): close enough, it stops here
  if (e.stuckT > tune.unstick_time && e.dest && Math.hypot(e.dest.x - e.x, e.dest.z - e.z) < 5) { e.pi = P.length; e.vs = 0; e.moving = false; e.stuckT = 0; return; }
  if (e.stuckT > tune.unstick_time && e.dest) { const d0 = e.dest; e.stuckT = 0; setDest(e, d0.x + (rng() - 0.5) * 1.5, d0.z + (rng() - 0.5) * 1.5); }
}
/**
 * A climber on a rock face (iteration 56): at the foot (or the lip) of a face taller than a step it goes up
 * (or down) at climb_rate metres a second, then steps onto the cell beyond. It finishes the climb it started
 * even when its way changes meanwhile.
 */
function climbStep(e, dt) {
  const C = e.climbWp, dy = e.climbH - e.vy, st = tune.climb_rate * dt * (suppressed(e) ? 0.5 : 1);
  e.moving = true; e.stuckT = 0;
  if (Math.abs(dy) > st) { e.vy += Math.sign(dy) * st; return; }
  e.x = C.x; e.z = C.z; e.y = e.vy = hAt(C.x, C.z); e.climbH = null; e.climbWp = null;
  if (e.path && e.path[e.pi] === C) e.pi++;
}
function moveAlong(e, dt) {
  if (e.climbH != null) { climbStep(e, dt); return; }
  if (!e.path || e.pi >= e.path.length) { e.moving = false; if (e.veh) e.vs = 0; return; }
  if (e.veh) { driveAlong(e, dt); return; }
  const wp = e.path[e.pi], dx = wp.x - e.x, dz = wp.z - e.z, d = Math.hypot(dx, dz), lastN = e.pi === e.path.length - 1;
  if (d < 0.7 && d > 0.01 && climber(e)) { // the foot of a face (or its lip): start the climb
    const dh = hAt(wp.x, wp.z) - hAt(e.x, e.z);
    if (dh > 1.5 || dh < -3.5) {
      e.x = wp.x - dx / d * 0.6; e.z = wp.z - dz / d * 0.6; e.heading = Math.atan2(dx, dz);
      e.climbH = hAt(wp.x, wp.z); e.climbWp = wp; e.moving = true; return;
    }
  }
  const sp = unitSpeed(e) * (shallow(e.x, e.z) ? 0.55 : 1);
  if (d > 0.01) e.heading = turnToward(e.heading, Math.atan2(dx, dz), 10 * dt);
  const before = d;
  if (d <= sp * dt || (lastN && d < 0.35)) { if (d <= sp * dt) { e.x = wp.x; e.z = wp.z; } e.pi++; }
  else if (e.pi < e.path.length - 1 && d < 0.6) e.pi++; /* a node others crowd is close enough: walk on */ else { e.x += dx / d * sp * dt; e.z += dz / d * sp * dt; }
  e.moving = true;
  // no headway for a while (pushed, blocked): think again about the way
  const now = Math.hypot(wp.x - e.x, wp.z - e.z);
  e.stuckT = Math.max(0, (e.stuckT || 0) + (before - now < sp * dt * 0.25 && e.pi < e.path.length ? dt : -dt * 2));
  // the end of the way crowded by others (they shove him round it): here is close enough, he stops
  e.endT = lastN && now < 2.5 ? (e.endT || 0) + dt : 0;
  if (e.endT > 1.2) { e.pi = e.path.length; e.moving = false; e.stuckT = 0; e.endT = 0; return; }
  if (e.stuckT > tune.unstick_time && e.dest) { const d0 = e.dest; e.stuckT = 0; setDest(e, d0.x + (rng() - 0.5) * 1.5, d0.z + (rng() - 0.5) * 1.5); }
}
/** The best enemy this unit can shoot now: its ordered target first, then the nearest it can see. */
/** True for a member of a squad under a suppression order (orderSuppress). */
function suppressing(e) {
  const o = e.squad && e.squad.order; if (!o) return false;
  if (o.t === 'suppress') return true;
  const lg = o.t === 'move' && !o.done ? o.pts[o.i] : null; // a plan's leg with suppression on its target
  return !!(lg && lg.supp && lg.supp === e.pref);
}
/** The leg of its squad's plan a unit walks now (null: no plan, or arrived). */
function legNow(e) { const o = e.squad && e.squad.order; return o && o.t === 'move' && !o.done ? o.pts[o.i] : null; }
function pickTarget(e, w) {
  const sight = (e.team ? tune.raider_sight * (w.sight || 1) : e.kind === 'sniper' ? tune.sniper_sight : tune.sight_range) + (e.rank || 0) * 2;
  const spot = e.kind === 'sniper' && !e.team; // the sniper fires on what his side sees, as far as his rifle reaches (iteration 63)
  const R = w.indirect || spot ? w.range : Math.min(w.range, sight + (e.veh ? 6 : 0));
  const up = o => Math.max(0, Math.min(tune.high_max, e.y - o.y)) * tune.high_sight; // iteration 65: from above he sees farther (never past his weapon)
  if (e.pref && e.pref.alive && dist2(e, e.pref) <= R * R && (w.indirect ? seenByTeam(e.pref, e.team) : canSee(e, e.pref))) return e.pref;
  if (e.pref && e.pref.alive && suppressing(e) && !w.indirect && dist2(e, e.pref) <= w.range * w.range) return e.pref; // suppression: at where it is, seen or not
  const c = [];
  for (const o of state.ents) {
    if (!o.alive || o.team === e.team || o.inside) continue;
    if (w.noVeh && o.veh) continue; // dogs bite men, not hulls
    const d = dist2(e, o); if (d > Math.min(w.range, R + up(o)) ** 2) continue;
    if (e.team === 1 && (lurking(o) || stealthy(o)) && d > tune.ambush_reveal ** 2) continue; // an ambush, or a stealthy soldier, still unseen
    if (w.min && d < w.min * w.min) continue;
    if (e.kind === 'at' && !e.team && !o.veh && d > 14 * 14) continue; // men only within his pistol's reach
    c.push([d, o]);
  }
  if (w.kind === 'ap' || w.kind === 'rpg') for (const it of c) if (it[1].veh) it[0] *= 0.15; // anti-tank guns and rockets hunt vehicles first
  c.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < Math.min(4, c.length); i++) {
    const o = c[i][1];
    if (w.indirect ? seenByTeam(o, e.team) : canSee(e, o) && (!spot || c[i][0] <= sight * sight || seenByTeam(o, e.team))) return o;
  }
  return null;
}
/** True when any unit of the team can see the target (the mortar fires on what others spot). */
function seenByTeam(o, team) {
  for (const f of state.ents) if (f.alive && !f.inside && f.team === team && dist2(f, o) < tune.sight_range ** 2 && canSee(f, o)) return true;
  return false;
}
function raiderThink(e, w) {
  const g = e.group;
  if (g.kind === 'hunt') { // sent after the tank, or at the army's camp in the last stand
    const tk = state.tank, t = g.base && !(tk.alive && dist2(e, tk) < 40 * 40) ? g.base : tk;
    g.alert = true; g.seenT = state.t; g.known = { x: t.x, z: t.z };
  }
  if (e.target) alertGroup(g, e.target);
  const D = ENEMY[e.kind];
  if (!g.alert && D && D.spot) D.spot(e, g); // short reach: it raises the alarm on sight
  if (!g.alert) {
    if (g.kind === 'patrol' && !e.fixed) {
      const wp = g.wps[g.wpi];
      if (e === g.members.find(m => m.alive) && Math.hypot(e.x - wp.x, e.z - wp.z) < 2.5) g.wpi = (g.wpi + 1) % g.wps.length;
      if ((!e.path || e.pi >= e.path.length) && Math.hypot(e.x - wp.x, e.z - wp.z) > 2.5 && state.t - (e.pathT || -9) > 3) setDest(e, wp.x + (e.id % 3 - 1) * 1.5, wp.z + (e.id % 2) * 1.5);
    }
    return;
  }
  if (state.t - g.seenT > 14) {
    g.alert = false; g.known = null;
    if (e.homeSpot && !e.fixed) setDest(e, e.homeSpot.x, e.homeSpot.z);
    return;
  }
  if (e.fixed) return;
  if (D && D.think && D.think(e, w, g)) return; // the entry's own way of fighting (enemies.js)
  if (!e.veh && raiderTactics(e, w)) return;
  if (tune.smart_raiders && !e.veh && raiderRole(e, w)) return; // tactics.js: pin, flank, buildings, retreat
  if (tune.smart_raiders && D && D.circleSmart && circleTarget(e)) return; // technicals circle, firing on the move
  if (e.target && !e.veh) { e.path = null; return; }
  if (e.target && e.veh && dist2(e, e.target) < (w.range * tune.foe_veh_band) ** 2 && canSee(e, e.target)) { e.path = null; return; } // a hull holds at its gun's range (iteration 67)
  if (g.known && (!e.path || e.pi >= e.path.length || state.t - e.pathT > 3)) {
    const lim = g.kind === 'camp' ? tune.leash : g.kind === 'fort' ? 11 : g.kind === 'hunt' ? 999 : 36;
    let dx = g.known.x - g.home.x, dz = g.known.z - g.home.z; const L = Math.hypot(dx, dz);
    if (L > lim) { dx *= lim / L; dz *= lim / L; }
    const tx = g.home.x + dx + (e.id % 5 - 2) * 1.4, tz = g.home.z + dz + (e.id % 3 - 1) * 1.4;
    if (Math.hypot(tx - e.x, tz - e.z) > 2) setDest(e, tx, tz);
  }
}
/** The player's vehicle nearest to e within r (alive), or null. */
function nearestFriendVeh(e, r) {
  let best = null, bd = r * r;
  for (const v of state.ents) if (v.alive && v.veh && v.team === 0 && !v.inside) { const d = dist2(v, e); if (d < bd) { bd = d; best = v; } }
  return best;
}
/** True when vehicle v drives towards e (the command tank by its speed, the others while they move). */
function bearingDown(v, e) {
  const sp = v.kind === 'tank' ? v.speed : v.moving ? 1 : 0; if (Math.abs(sp) < 1) return false;
  const h = v.heading + (sp < 0 ? Math.PI : 0), dx = e.x - v.x, dz = e.z - v.z, L = Math.hypot(dx, dz) || 1;
  return (Math.sin(h) * dx + Math.cos(h) * dz) / L > 0.6;
}
/** A walkable spot near (x,z), or null. */
function openSpot(x, z) {
  for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 1], [-2, -1]]) {
    const px = x + a, pz = z + b; if (!inMap(Math.floor(px), Math.floor(pz))) continue;
    if (walkable(Math.floor(px), Math.floor(pz)) && !shallow(px, pz) && !perch(Math.floor(px), Math.floor(pz))) return { x: px, z: pz };
  }
  return null;
}
/**
 * How raiders on foot fight armour. A hull driving at them: they dive aside. Rocket men work round to
 * a vehicle's flank or rear (its weak armour) and fire as soon as they are there. Everyone else in a
 * fight runs to the nearest cover against his target. True when it set the raider's move.
 */
function raiderTactics(e, w) {
  if (e.fleeT && state.t - e.fleeT < 1.4 && e.path && e.pi < e.path.length) return true; // still diving clear
  const D = ENEMY[e.kind], v = nearestFriendVeh(e, Math.max(tune.raider_flee + 14, D && D.rocket ? tune.rpg_range * 1.7 : 0));
  // 1. out of the way of a hull bearing down
  const reach = v ? tune.raider_flee + Math.abs(v.kind === 'tank' ? v.speed : 3) * 1.2 : 0; // a fast hull is seen coming from further
  if (v && dist2(v, e) < reach * reach && bearingDown(v, e)) {
    const h = v.heading, rx = Math.cos(h), rz = -Math.sin(h), side = ((e.x - v.x) * rx + (e.z - v.z) * rz) >= 0 ? 1 : -1;
    const p = openSpot(e.x + rx * side * 7 - Math.sin(h) * 2, e.z + rz * side * 7 - Math.cos(h) * 2) || openSpot(e.x - rx * side * 7, e.z - rz * side * 7);
    if (p) { setDest(e, p.x, p.z); e.fleeT = state.t; e.coverT = 0; return true; }
  }
  // 2. rockets: to the vehicle's side or back, then fire
  if (D && D.rocket && v) {
    const off = Math.abs(angDiff(v.heading, angTo(v, e))), d = Math.sqrt(dist2(v, e));
    const there = off > tune.rpg_flank_angle * Math.PI / 180 && d < tune.rpg_range * 0.95 && canSee(e, v);
    if (there) { e.path = null; e.pref = v; return true; }
    if (!e.path || e.pi >= e.path.length || state.t - (e.pathT || -9) > 2.5) {
      const side = (e.id % 2 ? 1 : -1), a = v.heading + Math.PI + side * 0.8, r = tune.rpg_range * 0.6;
      const p = openSpot(v.x + Math.sin(a) * r, v.z + Math.cos(a) * r) || openSpot(v.x + Math.sin(a + side * 0.6) * r, v.z + Math.cos(a + side * 0.6) * r);
      if (p) setDest(e, p.x, p.z);
    }
    e.pref = v; return true;
  }
  // 3. a fight: into cover against the target, once in a while
  const t = e.target;
  if (!tune.smart_raiders && t && !e.inCover && state.t - (e.coverT || -99) > 5) {
    e.coverT = state.t;
    const dx = t.x - e.x, dz = t.z - e.z, L = Math.hypot(dx, dz) || 1;
    const spots = findCoverSpots(e.x, e.z, 1, { x: dx / L, z: dz / L }, 6);
    if (spots.length) { setDest(e, spots[0].x + 0.5, spots[0].z + 0.5); return true; }
  }
  if (e.coverT && state.t - e.coverT < 3 && e.path && e.pi < e.path.length) return true; // on the way to cover
  return false;
}
function alertGroup(g, src) {
  if (!g || !src) return;
  if (!g.alert) {
    g.alert = true;
    for (const m of g.members) if (m.alive) m.think = Math.min(m.think, 0.1 + rng() * 0.3);
    const tk = state.tank, d = Math.hypot(g.home.x - tk.x, g.home.z - tk.z);
    if (d < 80) {
      const rel = angDiff(tk.heading, Math.atan2(g.home.x - tk.x, g.home.z - tk.z));
      const clock = ((Math.round(-rel / (Math.PI / 6)) % 12) + 12) % 12 || 12;
      say('Radio', 'Contatto! Predoni a ore ' + clock + '.', '#ff9a7a');
      if (g.first) say('Radio', 'Fermati: da fermo il cerchio di tiro si stringe.', '#9fe3a0');
    }
  }
  g.known = { x: src.x, z: src.z }; g.seenT = state.t;
}
/** One shot from a unit at a target. */
/**
 * The height advantage (iteration 65): each metre the shooter's eye stands above the target's chest adds
 * high_acc to his aim (up to high_max metres); each metre below takes high_acc away (the target is in cover of the crest).
 */
function heightK(e, t) { const dh = (e.y + eyeH(e)) - (t.y + chestH(t)); return Math.max(0.5, 1 + Math.max(-tune.high_max, Math.min(tune.high_max, dh)) * tune.high_acc); }
function fire(e, t, w) {
  e.firedT = state.t;
  const yaw = e.veh ? e.turretYaw : e.heading, off = e.veh ? 1.6 : 0.6;
  const mx = e.x + Math.sin(yaw) * off, mz = e.z + Math.cos(yaw) * off, my = e.y + eyeH(e) - 0.2;
  e.recoil = 1;
  if (w.special) { w.special(e, t, w); return; } // enemies.js: bombs, bites, flames, molotovs, the big gun
  if (w.kind === 'bullet') {
    const d = Math.sqrt(dist2(e, t));
    let acc = w.acc * Math.max(0.35, Math.min(1, 1.25 - d / w.range * 0.6));
    if (e.moving || (e.rideOn && e.rideOn.moving)) acc *= 0.5; // on the move, or from a jeep on the move
    if (t.moving) acc *= 0.8;
    acc *= heightK(e, t); // iteration 65: from above he aims better, from below worse
    if (e.garrison) acc *= tune.bld_acc; // at a window, braced
    acc *= formAccK(e, t); // iteration 68: a line ahead, a wedge or an echelon
    if (t.garrison) acc *= tune.bld_cover; // a man behind a window is a small target
    if (!e.team) acc = Math.min(0.97, acc * rankK(e, 'rank_acc') * modOf(e).acc);
    if (suppressed(e)) acc *= tune.suppress_acc;
    if (e.squad && e.squad.order.sprungT != null && state.t - e.squad.order.sprungT < 4) acc = Math.min(0.97, acc * tune.ambush_bonus);
    const cover = t.veh || t.rideOn ? 0 : coverFrom(t, e.x, e.z); // a rider sits in the open
    if (cover === 2) acc *= tune.cover_factor; else if (cover === 1) acc *= tune.cover_light;
    if (cover) acc *= modOf(t).coverK;
    if (t.veh) acc = Math.min(1, acc * 1.7);
    const col = e.team ? [1, 0.45, 0.25] : [1, 0.88, 0.45];
    if (rng() < acc) {
      tracer(mx, my, mz, t.x, t.y + chestH(t) - 0.2, t.z, col);
      dmgTo(t, w.dmg, w.heavy ? 'heavy' : 'bullet', e);
    } else {
      const sh = structShot(mx, my, mz, t.x + (rng() - 0.5) * 3, t.y + 0.4 + rng(), t.z + (rng() - 0.5) * 3, w.heavy, 2, e.garrison); // js/structs.js: a wall in the way, or behind, is struck and chipped
      tracer(mx, my, mz, sh.x, sh.y, sh.z, col);
      if (!sh.hit && cover && rng() < tune.cover_chip * (w.chip || 1)) chipCover(t, e);
    }
    // machine guns pin infantry down: slower, worse aim for a while; so does every round of a suppression order
    if ((w.chip || (suppressing(e) && t === e.pref)) && !t.veh && t.alive) { if (!suppressed(t) && t.team === 1) floatText(t.x, t.y + 2.4, t.z, 'soppresso', '#9fd8ff'); t.supT = state.t + tune.suppress_time * modOf(e).sup * (e.nest ? tune.nest_sup : 1); }
    sfx(w.snd || 'small', e.x, e.z);
  } else if (w.kind === 'rpg') {
    launch({ kind: 'rpg', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, mx, my, mz, t.x + (rng() - 0.5) * 1.5, t.y + chestH(t), t.z + (rng() - 0.5) * 1.5, tune.rpg_speed, 3);
    muzzle(mx, my, mz, 0.6); sfx('rpg', e.x, e.z);
  } else if (w.kind === 'mortar') {
    const sc = tune.mortar_scatter * modOf(e).scatter, tx = t.x + (rng() - 0.5) * 2 * sc, tz = t.z + (rng() - 0.5) * 2 * sc;
    const D = Math.hypot(tx - e.x, tz - e.z);
    launch({ kind: 'mortar', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, mx, my + 0.6, mz, tx, hAt(tx, tz), tz, D / (2.4 + D / 25), 14);
    muzzle(mx, my + 0.6, mz, 0.5); sfx('mortar', e.x, e.z);
  } else if (w.kind === 'ap') { // the anti-tank gun: a flat fast round
    const d = Math.sqrt(dist2(e, t)), sp = 0.02 * d, a = rng() * 6.28, r = Math.sqrt(rng()) * sp;
    const gx = e.x + Math.sin(e.heading) * 1.6, gz = e.z + Math.cos(e.heading) * 1.6, gy = e.y + 0.8;
    launch({ kind: 'ap', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, gx, gy, gz, t.x + Math.cos(a) * r, t.y + chestH(t), t.z + Math.sin(a) * r, tune.at_speed, 4);
    muzzle(gx, gy, gz, 1.0); sfx('cannon', e.x, e.z);
  } else if (w.kind === 'shell') {
    const d = Math.sqrt(dist2(e, t)), sp = 0.035 * d, a = rng() * 6.28, r = Math.sqrt(rng()) * sp;
    const mz = (ENEMY[e.kind] && ENEMY[e.kind].muzzle) || [3.4, 1.75], go = mz[0], gx = e.x + Math.sin(e.turretYaw) * go, gz = e.z + Math.cos(e.turretYaw) * go, gy = e.y + mz[1];
    launch({ kind: 'shell', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, gx, gy, gz, t.x + Math.cos(a) * r, t.y + 1, t.z + Math.sin(a) * r, 60, 10);
    muzzle(gx, gy, gz, 1.5); sfx('cannon', e.x, e.z);
  }
}
/** A missed bullet chips a soft voxel off the target's cover. */
function chipCover(t, from) {
  const h = hAt(t.x, t.z), dx = from.x - t.x, dz = from.z - t.z, L = Math.hypot(dx, dz) || 1;
  const x = Math.floor(t.x + dx / L * 1.1), z = Math.floor(t.z + dz / L * 1.1);
  for (let y = h + 1; y >= h; y--) {
    const v = getV(x, y, z);
    if (SOFTV.has(v) && !world.fmark[vi(x, y, z)]) { setV(x, y, z, 0); recomputeColumn(x, z); spawnDebris([x, y, z, v], x + 0.5, y + 0.5, z + 0.5, 1); return; }
  }
}
