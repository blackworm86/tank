// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Tactics for both sides. Cover is scored against every known threat (protected, still able to fire,
// in range, not too exposed to a flank, not where a comrade already is). The player's soldiers take
// positions by role (machine guns to the side with a wide view, anti-tank on the side a vehicle
// comes from, medics and radio men back) and advance in bounds under fire, half moving while half
// covers. Raider groups make a plan: some pin the target down from cover, some work round its flank,
// rockets go for a hull's side, technicals circle; they take to buildings, call for reinforcements
// when they bleed and fall back when beaten. Loaded after systems/.
'use strict';

// ---- Scoring cover --------------------------------------------------------------------------------------------
/** The enemies a unit should mind: the nearest few it (or its side) knows of, within r. */
function threatsFor(m, r) {
  const out = [];
  for (const o of state.ents) {
    if (!o.alive || o.inside || o.team === m.team) continue;
    if (m.team === 0 && hiddenFoe(o)) continue;
    if (m.team === 1 && (lurking(o) || stealthy(o)) && dist2(o, m) > tune.ambush_reveal ** 2) continue;
    const d = dist2(o, m); if (d < r * r) out.push([d, o]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out.slice(0, 4).map(a => a[1]);
}
/**
 * How good a spot is for unit m against the threats: cover toward each (heavy 10, light 6, none -7, a
 * vehicle's threat counting more), a line of fire to the nearest two, the right distance for its weapon,
 * a short walk, progress toward o.toward, height for o.highK, a gap from comrades.
 */
function scoreSpot(m, x, z, threats, o) {
  const cx = Math.floor(x), cz = Math.floor(z);
  if (!walkable(cx, cz) || shallow(x, z) || perch(cx, cz)) return -1e9;
  const h = hAt(x, z), pt = { x, z, garrison: null };
  let s = 0;
  threats.forEach((t, i) => {
    const wgt = (t.veh ? 1.5 : 1) / (1 + i * 0.6), q = coverFrom(pt, t.x, t.z);
    s += wgt * (q === 2 ? 10 : q === 1 ? 6 : -7);
    if (i < 2 && lineClear(x, h + (q ? 1.15 : 1.5), z, t.x, t.y + chestH(t), t.z)) s += wgt * (o.needLine ? 6 : 3);
    const d = Math.hypot(t.x - x, t.z - z);
    if (i === 0) { if (d < o.minD) s -= (o.minD - d) * 1.6; if (d > o.range) s -= (d - o.range) * 0.7; }
  });
  s -= Math.hypot(x - m.x, z - m.z) * (o.walkK ?? 0.35);
  if (o.toward) s += (Math.hypot(o.toward.x - m.x, o.toward.z - m.z) - Math.hypot(o.toward.x - x, o.toward.z - z)) * (o.progK || 0);
  if (o.highK) s += (h - hAt(m.x, m.z)) * o.highK;
  if (o.side) s -= Math.abs(Math.abs((x - o.side.x) * o.side.px + (z - o.side.z) * o.side.pz) - o.side.off) * 0.6; // the machine gun's place to the side
  if (o.flankV) { const a = Math.abs(angDiff(o.flankV.heading, Math.atan2(x - o.flankV.x, z - o.flankV.z))); s += a > 1.1 ? 8 : -4; } // the anti-tank gun: off the hull's front
  for (const f of state.ents) {
    if (f === m || !f.alive || f.team !== m.team || f.veh || f.inside) continue;
    const fx = f.dest && f.moving ? f.dest.x : f.x, fz = f.dest && f.moving ? f.dest.z : f.z;
    if (Math.abs(fx - x) < 1.4 && Math.abs(fz - z) < 1.4) s -= 9;
  }
  return s;
}
/** The best spot within R of (cx,cz) for m against the threats; {x, z, s}, or null. */
function bestSpot(m, cx, cz, R, threats, o) {
  let best = null;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    if (dx * dx + dz * dz > R * R) continue;
    const x = Math.floor(cx + dx) + 0.5, z = Math.floor(cz + dz) + 0.5;
    if (!inMap(Math.floor(x), Math.floor(z))) continue;
    if (o.leash && Math.hypot(x - o.leash.x, z - o.leash.z) > o.leash.r) continue;
    const s = scoreSpot(m, x, z, threats, o);
    if (!best || s > best.s) best = { x, z, s };
  }
  return best;
}
/** The role's way of taking position: search radius, distance band, height, side or flank wishes. */
function roleOpts(m, sq, threats) {
  const w = weapon(UT[m.kind].w), t = threats[0], o = { range: w.range * 0.85, minD: 6, R: 6, walkK: 0.35 };
  if (m.kind === 'mg') {
    Object.assign(o, { R: 8, highK: 0.6, needLine: true });
    const ms = alive(sq).filter(f => !f.veh); if (ms.length > 1 && t) { // to one side of the squad, across the line of fire
      const c = ms.reduce((a, f) => ({ x: a.x + f.x / ms.length, z: a.z + f.z / ms.length }), { x: 0, z: 0 }), dx = t.x - c.x, dz = t.z - c.z, L = Math.hypot(dx, dz) || 1;
      o.side = { x: c.x, z: c.z, px: -dz / L, pz: dx / L, off: 5 };
    }
  } else if (m.kind === 'at') {
    const v = threats.find(q => q.veh); if (v) Object.assign(o, { R: 9, flankV: v, range: w.range * 0.75, needLine: true });
  } else if (m.kind === 'medic' || m.kind === 'radio') Object.assign(o, { minD: 14, R: 7 });
  else if (m.kind === 'scout') Object.assign(o, { R: 7, highK: 0.3 });
  return o;
}

// ---- The player's soldiers -------------------------------------------------------------------------------------------
/**
 * A soldier in a fight finds the best position against all he knows of, by his role; he moves only when
 * a spot is clearly better than where he is.
 */
function soldierPosition(m, sq) {
  // experience (iteration 66): the higher on the ladder (jobs.js, 0-9), the sooner he looks again, the smaller gain moves him,
  // the farther he looks and the more he wants height; a Recruit moves only once he is shot at
  const lv = soldierLevel(m);
  if (state.t - (m.coverT || -99) < tune.cover_rethink * Math.max(0.5, 1.5 - lv * tune.ai_exp_k)) return;
  if (m.kind === 'recruit' && !(m.shotBy && state.t - (m.shotT || -99) < 3)) return;
  const threats = threatsFor(m, tune.sight_range + 12); if (!threats.length) return;
  m.coverT = state.t;
  const o = roleOpts(m, sq, threats), t = threats[0];
  o.R += Math.floor(lv / 3); o.highK = (o.highK || 0) + lv * tune.ai_high_k;
  let cx = m.x, cz = m.z;
  if (o.minD > 10) { const dx = t.x - m.x, dz = t.z - m.z, L = Math.hypot(dx, dz) || 1; if (L < o.minD) { cx -= dx / L * (o.minD - L); cz -= dz / L * (o.minD - L); } } // support men drop back
  const here = scoreSpot(m, m.x, m.z, threats, o), sp = bestSpot(m, cx, cz, o.R, threats, o);
  if (!sp || sp.s < here + tune.cover_margin * Math.max(0.4, 1.4 - lv * tune.ai_exp_k) || Math.hypot(sp.x - m.x, sp.z - m.z) < 1) return;
  setDest(m, sp.x, sp.z); m.face = Math.atan2(t.x - sp.x, t.z - sp.z);
  if (state.t - (sq.coverMsgT || -99) > 15) { sq.coverMsgT = state.t; say(sq.name, m.kind === 'mg' ? 'Mitragliatrice in posizione sul fianco!' : m.kind === 'at' && o.flankV ? 'Anticarro: lo prendo di fianco!' : 'Al riparo!'); }
}
/**
 * Bounding under fire: on a move order with the squad in a fight, half the men dash to the next good cover
 * toward the destination while the other half stays put and shoots; then they swap. True while bounding.
 */
function boundStep(sq, ms, o) {
  const p = o.pts[Math.min(o.i, o.pts.length - 1)];
  if (!tune.bounding || p.how === 'assault' || p.how === 'none' || o.ambush) return false;
  const inf = ms.filter(m => !m.veh);
  const fight = inf.some(m => state.t - (m.combatT || -99) < 5);
  const c = inf.length ? inf.reduce((a, f) => ({ x: a.x + f.x / inf.length, z: a.z + f.z / inf.length }), { x: 0, z: 0 }) : p, left = Math.hypot(p.x - c.x, p.z - c.z);
  if (!fight || inf.length < 2 || left < 9) { if (sq.bound) { sq.bound = null; goTo(sq, p.x, p.z, p.how, p.face); } return false; }
  if (!sq.bound) { sq.bound = { phase: 1, t: -9 }; say(sq.name, 'Sotto tiro: avanziamo a sbalzi!'); }
  const B = sq.bound, movers = inf.filter((m, i) => i % 2 === B.phase);
  if (movers.some(m => m.moving || (m.path && m.pi < m.path.length)) && state.t - B.t < 6) return true;
  B.phase ^= 1; B.t = state.t;
  inf.forEach((m, i) => {
    if (i % 2 !== B.phase) { m.path = null; m.moving = false; return; } // covering fire
    const threats = threatsFor(m, tune.sight_range + 12), dx = p.x - m.x, dz = p.z - m.z, L = Math.hypot(dx, dz) || 1, step = Math.min(7, L);
    const sp = bestSpot(m, m.x + dx / L * step, m.z + dz / L * step, 4, threats, { range: 99, minD: 4, toward: p, progK: 1.2, walkK: 0.1 });
    if (sp) { setDest(m, sp.x, sp.z); if (threats[0]) m.face = Math.atan2(threats[0].x - sp.x, threats[0].z - sp.z); }
  });
  for (const v of ms) if (v.veh && (!v.path || v.pi >= v.path.length)) setDest(v, p.x, p.z);
  return true;
}

// ---- The raiders ---------------------------------------------------------------------------------------------------
/**
 * The group's plan, every few seconds while alert: who pins and who flanks, calling for help when it
 * bleeds, falling back when it is beaten.
 */
function groupPlan(g) {
  if (state.t - (g.planT || -99) < 2.5) return;
  g.planT = state.t;
  const ms = g.members.filter(m => m.alive); if (!ms.length) return;
  if (g.n0 == null) {
    g.n0 = g.members.length;
    let k = 0; // roles: rockets hunt hulls, technicals circle, a share of riflemen go round the flank
    let nf = 0;
    for (const m of ms) { m.role = m.veh ? 'circle' : ENEMY[m.kind] && ENEMY[m.kind].rocket ? 'rocket' : m.fixed ? 'fixed' : !(ENEMY[m.kind] && ENEMY[m.kind].noFlank) && (k++ % Math.max(2, Math.round(1 / tune.flank_share))) === 1 ? 'flank' : 'pin'; if (m.role === 'flank') m.flankN = nf++; }
    g.flankSide = rng() < 0.5 ? 1 : -1;
  }
  const loss = 1 - ms.length / g.n0;
  if (!g.called && loss >= tune.reinforce_loss && g.known) { // help from the nearest calm group
    g.called = true;
    const h = state.groups.filter(o => o !== g && !o.alert && o.members.some(m => m.alive) && Math.hypot(o.home.x - g.home.x, o.home.z - g.home.z) < tune.reinforce_range && (o.kind === 'camp' || o.kind === 'patrol'))
      .sort((a, b) => Math.hypot(a.home.x - g.home.x, a.home.z - g.home.z) - Math.hypot(b.home.x - g.home.x, b.home.z - g.home.z))[0];
    if (h) { alertGroup(h, g.known); h.reinf = true; say('Radio', 'Intercettato: i predoni chiamano rinforzi!', '#ff9a7a'); }
  }
  if (!g.retreat && loss >= tune.retreat_loss && g.kind !== 'fort' && ms.length <= 3) {
    g.retreat = state.t; say('Radio', 'I predoni ripiegano!', '#9fe3a0');
    for (const m of ms) if (!m.fixed && !m.veh) { m.role = 'retreat'; m.roleT = -99; }
  }
  if (g.retreat && state.t - g.retreat > tune.retreat_time) { g.retreat = null; for (const m of ms) if (m.role === 'retreat') m.role = 'pin'; }
}
/** A raider on foot acts out his role. True when it set his move (or he holds a chosen spot). */
function raiderRole(e, w) {
  const g = e.group; groupPlan(g);
  if (e.garrison) { // a window to fire from; hunters leave it once the target is out of reach
    if (g.known && g.kind !== 'camp' && g.kind !== 'fort' && Math.hypot(g.known.x - e.x, g.known.z - e.z) > w.range * 1.4) { exitBuilding(e, e.id % 6); e.roleT = -99; }
    else return true;
  }
  if (!g.known || e.role === 'fixed' || e.role === 'rocket') return false;
  // iteration 67: the nearest foe it knows of is its mark (a squad as well as the tank), the group's last sighting otherwise
  const threats = threatsFor(e, 50), t = threats[0] || null, T = t && !t.veh && Math.hypot(t.x - e.x, t.z - e.z) < Math.hypot(g.known.x - e.x, g.known.z - e.z) ? t : g.known;
  const leash = g.kind === 'camp' ? { x: g.home.x, z: g.home.z, r: tune.leash + 6 } : g.kind === 'fort' ? { x: g.home.x, z: g.home.z, r: 14 } : null;
  if (e.moving && e.path && e.pi < e.path.length && state.t - (e.roleT || -99) < tune.cover_rethink) return true;
  if (state.t - (e.roleT || -99) < tune.cover_rethink) return !!t; // holding a chosen spot
  e.roleT = state.t;
  const dx = T.x - e.x, dz = T.z - e.z, L = Math.hypot(dx, dz) || 1;
  if (e.role === 'retreat') { // away from the enemy, into cover, back toward home
    const hx = g.home.x - e.x, hz = g.home.z - e.z, hl = Math.hypot(hx, hz);
    const ax = e.x - dx / L * 10 + (hl > 4 ? hx / hl * 4 : 0), az = e.z - dz / L * 10 + (hl > 4 ? hz / hl * 4 : 0);
    const sp = bestSpot(e, ax, az, 5, threats, { range: 99, minD: 18, walkK: 0.05 });
    if (sp) { setDest(e, sp.x, sp.z); return true; }
    return false;
  }
  if ((e.role === 'pin' || e.role === 'flank') && t && L > 9) { // a building within foe_bld_range: in, and fire from the windows
    const b = e.wantB && !e.wantB.ruined && e.wantB.occ.length < e.wantB.cap ? e.wantB : world.buildings.find(b => !b.ruined && b.occ.length < b.cap && Math.hypot(b.door.x - e.x, b.door.z - e.z) < tune.foe_bld_range && Math.hypot(b.door.x - T.x, b.door.z - T.z) > 8 && Math.hypot(b.door.x - T.x, b.door.z - T.z) < w.range * 1.05 && (!leash || Math.hypot(b.door.x - leash.x, b.door.z - leash.z) < leash.r));
    if (b && Math.hypot(b.out.x - e.x, b.out.z - e.z) < 1.8) { enterBuilding(e, b); e.wantB = null; return true; }
    if (b) { e.wantB = b; setDest(e, b.out.x, b.out.z); return true; }
  }
  // a band at foe_band of its range: no closer than it needs, cover within foe_cover_r, height valued (iteration 67)
  const band = w.range * tune.foe_band;
  let cx = e.x, cz = e.z, R = tune.foe_cover_r; const o = { range: w.range * 0.85, minD: band * 0.7, walkK: 0.2, leash, highK: tune.foe_high_k };
  if (e.role === 'flank') { // round to the side of the target, cover to cover
    const px = -dz / L * g.flankSide, pz = dx / L * g.flankSide;
    const side = (e.flankN || 0) % 2 ? -1 : 1, fx = T.x + px * side * tune.flank_dist - dx / L * 6, fz = T.z + pz * side * tune.flank_dist - dz / L * 6; // flankers split to both sides
    const fl = Math.hypot(fx - e.x, fz - e.z);
    if (fl > 5) { const st = Math.min(8, fl); cx = e.x + (fx - e.x) / fl * st; cz = e.z + (fz - e.z) / fl * st; Object.assign(o, { toward: { x: fx, z: fz }, progK: 1, walkK: 0.1 }); }
    else e.role = 'pin';
  } else if (L > band + 3) { const st = Math.min(9, L - band); cx += dx / L * st; cz += dz / L * st; Object.assign(o, { toward: { x: T.x - dx / L * band, z: T.z - dz / L * band }, progK: 0.5 }); } // closing to the band, cover to cover
  else if (L < band * 0.6) { const st = Math.min(6, band - L); cx -= dx / L * st; cz -= dz / L * st; } // too close: back to the band
  if (suppressed(e)) Object.assign(o, { progK: 0, walkK: 0.6, toward: null }); // pinned down: the nearest cover will do
  const here = scoreSpot(e, e.x, e.z, threats, o), sp = bestSpot(e, cx, cz, R, threats, o);
  if (sp && (sp.s > here + tune.cover_margin || o.toward) && Math.hypot(sp.x - e.x, sp.z - e.z) > 1) { setDest(e, sp.x, sp.z); return true; }
  e.path = null; return !!t;
}
/** A technical keeps moving round its target at a gunnery distance, firing on the move. True when it set the move. */
function circleTarget(e) {
  const t = e.target || (e.group.known && { x: e.group.known.x, z: e.group.known.z });
  if (!t) return false;
  if (e.path && e.pi < e.path.length - 1 && state.t - (e.pathT || -9) < 3) return true;
  const a = Math.atan2(e.x - t.x, e.z - t.z) + (e.id % 2 ? 0.8 : -0.8), r = tune.circle_radius;
  for (let k = 0; k < 4; k++) {
    const aa = a + k * 0.35 * (e.id % 2 ? 1 : -1), x = t.x + Math.sin(aa) * r, z = t.z + Math.cos(aa) * r;
    if (x > 6 && z > 6 && x < world.N - 6 && z < world.N - 6 && walkable(Math.floor(x), Math.floor(z)) && !shallow(x, z) && !hardNear(Math.floor(x), Math.floor(z))) { setDest(e, x, z); return true; }
  }
  return false;
}

// ---- The squad's sense (iteration 66): a building to hold, or back to the tank when it is lost ----------------
/** The squad's level: its soldiers' average place on the ladder (jobs.js, 0-9). */
function squadLevel(ms) { const inf = ms.filter(m => !m.veh); return inf.length ? inf.reduce((a, m) => a + soldierLevel(m), 0) / inf.length : 0; }
/**
 * Every squad tick, in a fight, on its own (a hold or a finished move): an experienced squad (ai_bld_level)
 * takes a free building close by; any squad that is losing badly (few left, hurt, outnumbered) falls back
 * behind the command tank. Each at most every ai_sense_cd seconds.
 */
function squadSense(sq, ms) {
  const tk = state.tank, inf = ms.filter(m => !m.veh && !m.inside && !m.rideOn); if (!inf.length || !tk.alive) return;
  const fighting = inf.some(m => state.t - (m.combatT || -99) < 6 || state.t - (m.shotT || -99) < 6 || (m.target && m.target.alive)); if (!fighting) return;
  const own = sq.order.t === 'hold' || (sq.order.t === 'move' && sq.order.done) || sq.order.t === 'follow';
  if (!own || state.t - (sq.senseT || -99) < tune.ai_sense_cd) return;
  const c = inf.reduce((a, m) => ({ x: a.x + m.x / inf.length, z: a.z + m.z / inf.length }), { x: 0, z: 0 });
  const foes = state.ents.filter(o => o.alive && o.team === 1 && !hiddenFoe(o) && (o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 30 * 30);
  const n0 = sq.slots.filter(k => !UT[k].veh).length || 1, hpF = inf.reduce((a, m) => a + m.hp / m.maxhp, 0) / inf.length;
  const lost = (inf.length / n0 <= tune.ai_retreat_alive && hpF < 0.6) || foes.reduce((a, o) => a + (o.veh ? 3 : 1), 0) >= inf.length * tune.ai_retreat_odds;
  if (lost && Math.hypot(c.x - tk.x, c.z - tk.z) > tk.rad + 8) { // back behind the tank, away from the enemy
    sq.senseT = state.t;
    const f = foes.length ? foes.reduce((a, o) => ({ x: a.x + o.x / foes.length, z: a.z + o.z / foes.length }), { x: 0, z: 0 }) : c;
    const dx = tk.x - f.x, dz = tk.z - f.z, L = Math.hypot(dx, dz) || 1, p = spotNear(tk.x + dx / L * 6, tk.z + dz / L * 6, 0);
    orderMove(sq, p.x, p.z, 'none'); sq.order.retreat = true;
    say(sq.name, 'Non reggiamo! Ripieghiamo sul carro!', '#ff9a7a');
    return;
  }
  if (squadLevel(inf) >= tune.ai_bld_level && foes.length) { // a building with room, close by, toward cover
    let best = null, bd = tune.ai_bld_range ** 2;
    for (const b of world.buildings) {
      if (b.ruined || b.cap - b.occ.length < inf.length) continue;
      const d = (b.out.x - c.x) ** 2 + (b.out.z - c.z) ** 2; if (d < bd) { bd = d; best = b; }
    }
    if (best) { sq.senseT = state.t; orderGarrison(sq, best); say(sq.name, "Prendiamo quell'edificio!", '#ffd36a'); }
  }
}
