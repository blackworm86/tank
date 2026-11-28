// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Damage, death and explosions, and the effects they leave. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Damage, death, explosions ------------------------------------------------------------------------
const SIDE_NAME = { front: 'FRONTE', side: 'FIANCO', rear: 'RETRO', top: 'TETTO' };
/**
 * Which face of a vehicle a hit lands on: 'front', 'side', 'rear' or 'top'. hit carries the round's
 * velocity (vx,vy,vz), a blast point (x,z), or top for a falling mortar round; else the shooter's
 * position decides.
 */
function armorSide(e, hit, src) {
  if (hit && hit.top) return 'top';
  if (hit && hit.vx !== undefined && hit.vy < 0 && -hit.vy > 0.9 * Math.hypot(hit.vx, hit.vz)) return 'top';
  let ax, az;
  if (hit && hit.vx !== undefined) { ax = -hit.vx; az = -hit.vz; }
  else if (hit && hit.x !== undefined) { ax = hit.x - e.x; az = hit.z - e.z; }
  else if (src) { ax = src.x - e.x; az = src.z - e.z; }
  else return 'side';
  const rel = Math.abs(angDiff(e.heading, Math.atan2(ax, az)));
  return rel < tune.armor_front_arc * Math.PI / 180 ? 'front' : rel > Math.PI - tune.armor_rear_arc * Math.PI / 180 ? 'rear' : 'side';
}
function dmgTo(e, amt, kind, src, hit) {
  if (!e.alive) return;
  if (e.kind === 'tank' && state.god) return;
  const D = dmgProfile(kind, hit); // js/damage.js: its type and penetration
  let res = 'full', side = null;
  if (e.kind === 'tank') { // the command tank keeps its own armour: sides, the standard armour, advanced systems
    if (kind === 'bullet' || kind === 'heavy') amt *= kind === 'heavy' ? 0.3 : tune.small_arms_vs_tank;
    if (kind !== 'crush' && kind !== 'drown') {
      side = armorSide(e, hit, src);
      amt *= tune['armor_' + side] * tankModDmg(side, kind, src) * armorTake(side); // modules.js: the standard armour's level
      if (kind !== 'bullet' && kind !== 'heavy') { e.lastHit = { side, t: state.t }; floatText(e.x, e.y + 4.2, e.z, SIDE_NAME[side] + ' x' + tune['armor_' + side].toFixed(1), side === 'front' ? '#c8c8c8' : side === 'side' ? '#ffd36a' : '#ff8a4a'); }
    }
  } else if (e.veh && D.dtype) { // any other vehicle: the round's penetration against the face's thickness
    side = armorSide(e, hit, src);
    const A = armourHit(e, D, side); res = A.res;
    amt *= dtypeK(D.dtype, true) * A.k;
    if (!D.splash && D.dtype !== 'bullet') e.lastHit = { side, t: state.t };
  } else if (D.dtype) amt *= dtypeK(D.dtype, false); // a soldier: how much of that type counts
  if (e.kind === 'tank' && kind !== 'bullet' && kind !== 'heavy') amt *= 1 - Math.min(0.9, tankStats().armor);
  if (e.kind === 'tank') amt *= tankStats().hullArmor;
  if (kind === 'blast' && ENEMY[e.kind] && ENEMY[e.kind].blastK) amt *= ENEMY[e.kind].blastK;
  if (e.team === 0 && !e.veh) amt *= modOf(e).taken;
  if (e.kind === 'tank') { state.hurtT = state.t; cam.shake = Math.max(cam.shake, tune.shake * Math.min(1.6, amt / 30)); }
  e.hp -= amt;
  dmgNumber(e, amt, D, res, side, src); // js/damage.js
  if (src) { e.shotBy = src; e.shotT = state.t; e.revealed = true; if (!e.team && e.squad) e.squad.attackedT = state.t; }
  if (lurking(e)) springAmbush(e.squad);
  if (e.team === 1 && src && src.team === 0) { alertGroup(e.group, src); giveXp(src, tune.xp_hit * xpFactor(src, e)); }
  if (e.team === 0 && e.squad && src && src.team === 1 && state.t - (e.squad.fireMsgT || -99) > 12) { e.squad.fireMsgT = state.t; say(e.squad.name, 'Siamo sotto fuoco!', '#ff9a7a'); }
  if (e.hp <= 0 && !medicSave(e, kind)) kill(e, src, kind);
}
function kill(e, src, kind) {
  e.alive = false; e.hp = 0; e.deathT = state.t; e.path = null; e.moving = false; e.selected = false;
  emit('kill', e, src, kind); // enemies.js: a bomber's charge, a fuel depot going up
  if (e.veh) {
    blastFx(e.x, e.y + 1.2, e.z, 2.2);
    for (let i = 0; i < 6; i++) state.fx.push({ kind: 'smoke', x: e.x + (rng() - 0.5) * 2, y: e.y + 2, z: e.z + (rng() - 0.5) * 2, t: -i * 0.4, life: 3.5, s: 1.4, rise: 7, col: 0x2e2824 });
    sfx('boom', e.x, e.z);
    if (e.team === 1) {
      state.pickups.push({ x: e.x, z: e.z, value: tune.scrap_vehicle, taken: false });
      dropAmmo(e.x + 1.5, e.z + 1, 3, tune.ammo_drop_veh);
      dropLoot(e.x - 1.5, e.z - 1, ENEMY[e.kind] && ENEMY[e.kind].loot ? ENEMY[e.kind].loot() : tune.loot_technical);
    }
  }
  if (e.team === 1) {
    state.kills++;
    const D = ENEMY[e.kind];
    if (D && D.tally) state[D.tally] = (state[D.tally] || 0) + 1; // a counter an achievement reads
    if (kind === 'crush') state.crushes = (state.crushes || 0) + 1;
    if (src && src.team === 0) giveXp(src, killXp(src, e)); // jobs.js: the enemy's strength, less for those far above it
    if (!e.veh) { state.scrap += tune.scrap_infantry; floatText(e.x, e.y + 2.2, e.z, '+' + tune.scrap_infantry, '#ffd36a'); }
    if (D && D.deathSay && !e.dev) say('Radio', D.deathSay, '#9fe3a0');
  } else if (e.kind === 'tank') {
    state.result = 'lose'; state.endT = state.t + 3;
    say('Radio', 'Il carro comando è distrutto...', '#ff7a6a');
  } else if (e.squad) {
    const sq = e.squad; // he stays on the card, crossed out, till pruneFallen takes him off (squads.js)
    say(sq.name, alive(sq).length ? (kind === 'drown' ? 'Uomo in acqua, l\'abbiamo perso!' : 'Uomo a terra!') : 'Squadra annientata.', '#ff7a6a');
    if (!alive(sq).length) sq.selected = false;
  }
}
/** A shell, rocket or mortar round goes off: voxels fly, units in the radius are hurt. */
function explode(p, x, y, z, direct) {
  const removed = blastVoxels(x, y, z, p.blast, { dtype: p.dtype, dmg: p.dmg, pen: p.pen, vx: p.vx, vy: p.vy, vz: p.vz });
  spawnDebris(removed, x, y, z, 40);
  blastFx(x, y, z, p.blast);
  if (p.fire || p.dtype === 'fire') { fireSplash(x, y, z); igniteArea(x, y, z, p.blast * tune.fire_inc_r, p.owner); } // a molotov, an incendiary round (js/fire.js)
  sfx(p.kind === 'rpg' ? 'boomS' : 'boom', x, z);
  const tk = state.tank, d = Math.hypot(x - tk.x, z - tk.z);
  cam.shake = Math.max(cam.shake, tune.shake * Math.max(0, 1 - d / 60) * (p.kind === 'shell' ? 1 : 0.6));
  for (const e of state.ents) {
    if (!e.alive || e.inside) continue;
    if (e === direct) { dmgTo(e, p.dmg, p.kind === 'rpg' ? 'rocket' : 'shell', p.owner, { vx: p.vx, vy: p.vy, vz: p.vz, top: p.kind === 'mortar', dtype: p.dtype, pen: p.pen, range: Math.hypot(x - (p.ox ?? x), z - (p.oz ?? z)) }); continue; }
    const dx = e.x - x, dy = e.y + 0.9 - y, dz = e.z - z, R = p.blast * 1.8 + (e.veh ? e.rad * 0.6 : 0), dd = Math.hypot(dx, dy, dz);
    if (dd < R) {
      let a = p.dmg * (1 - dd / R) * (e.veh ? tune.splash_veh : 1) * (p.dtype === 'ap' || p.dtype === 'heat' ? tune.splash_pierce : 1); // a piercing round's splash is a small one
      if (p.shell === 'frag' && e.team === 1 && !e.veh) e.supT = state.t + tune.suppress_time * 1.5; // splinters pin them down
      if (p.owner && e.team === p.owner.team) a *= 0.5;
      const cq = e.veh || e.rideOn ? 0 : coverFrom(e, x, z);
      if (cq === 2) a *= tune.cover_blast; else if (cq === 1) a *= tune.cover_blast_light;
      dmgTo(e, a, 'blast', p.owner, { x, z, top: p.kind === 'mortar', dtype: p.dtype === 'frag' || p.dtype === 'fire' ? p.dtype : 'he' });
    }
  }
}
function updateProjectiles(dt) {
  const N = world.N;
  for (let i = state.proj.length - 1; i >= 0; i--) {
    const p = state.proj[i];
    const sp = Math.hypot(p.vx, p.vy, p.vz), n = Math.max(1, Math.ceil(sp * dt / 0.2)), h = dt / n;
    let done = false;
    for (let k = 0; k < n && !done; k++) {
      p.vy -= p.g * h; p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
      if (p.x < 0 || p.z < 0 || p.x >= N || p.z >= N || p.y < -2) { done = true; break; }
      if (solidF(p.x, p.y, p.z) || (p.y < world.WL - 0.2 && shallow(p.x, p.z))) {
        explode(p, p.x - p.vx * h * 0.5, p.y - p.vy * h * 0.5, p.z - p.vz * h * 0.5, null); done = true; break;
      }
      if (p.kind !== 'mortar' || p.vy < 0) for (const e of state.ents) {
        if (!e.alive || e.team === p.team || e.inside) continue;
        if (e.veh) { const dx = e.x - p.x, dz = e.z - p.z; if (dx * dx + dz * dz < e.rad * e.rad && p.y > e.y - 0.2 && p.y < e.y + 2.8) { explode(p, p.x, p.y, p.z, e); done = true; break; } }
        else { const dx = e.x - p.x, dy = e.y + 0.9 - p.y, dz = e.z - p.z; if (dx * dx + dy * dy + dz * dz < 0.55) { explode(p, p.x, p.y, p.z, e); done = true; break; } }
      }
    }
    p.life -= dt;
    if (done || p.life < 0) state.proj.splice(i, 1);
    else if (p.kind === 'rpg' && rng() < 0.5) state.fx.push({ kind: 'smoke', x: p.x, y: p.y, z: p.z, t: 0, life: 0.8, s: 0.35, rise: 0.6, col: 0xbdb3a6 });
  }
}

// ---- Effects ---------------------------------------------------------------------------------------------
function spawnDebris(rem, cx, cy, cz, maxN) {
  const n = rem.length / 4; if (!n) return;
  const step = Math.max(1, Math.floor(n / maxN));
  for (let i = 0; i < n; i += step) {
    const x = rem[i * 4] + 0.5, y = rem[i * 4 + 1] + 0.5, z = rem[i * 4 + 2] + 0.5, t = rem[i * 4 + 3];
    const dx = x - cx, dy = y - cy, dz = z - cz, L = Math.hypot(dx, dy, dz) || 1, f = 3 + rng() * 6;
    state.debris.push({ x, y, z, vx: dx / L * f + (rng() - 0.5) * 3, vy: 3 + rng() * 7 + Math.max(0, dy / L) * 3, vz: dz / L * f + (rng() - 0.5) * 3,
      rx: rng() * 3, ry: rng() * 3, vr: (rng() - 0.5) * 12, life: tune.debris_life * (0.7 + rng() * 0.6), s: 0.4 + rng() * 0.4, t, rest: false });
  }
  const over = state.debris.length - tune.debris_max; if (over > 0) state.debris.splice(0, over);
}
function blastFx(x, y, z, r) {
  state.fx.push({ kind: 'flash', x, y, z, t: 0, life: 0.28, s: r * 1.3 });
  for (let i = 0; i < 5; i++) state.fx.push({ kind: 'smoke', x: x + (rng() - 0.5) * r, y: y + rng(), z: z + (rng() - 0.5) * r, t: -i * 0.05, life: 1.6 + rng(), s: 0.8 + r * 0.4, rise: 3 + rng() * 2, col: i % 2 ? 0x6f6259 : 0x8a7b6c });
}
function muzzle(x, y, z, s) { state.fx.push({ kind: 'flash', x, y, z, t: 0, life: 0.09, s: s * 0.6 }); state.fx.push({ kind: 'smoke', x, y, z, t: 0, life: 0.9, s: s * 0.7, rise: 1.2, col: 0xb8ab9c }); }
function tracer(ax, ay, az, bx, by, bz, col) { state.tracers.push({ ax, ay, az, bx, by, bz, t: 0, life: 0.14, col }); if (state.tracers.length > 600) state.tracers.shift(); }
function mark(x, z, col) { state.marks.push({ x, y: hAt(x, z), z, t: 0, life: 0.9, col }); }
function floatText(x, y, z, s, col) { state.floats.push({ x, y, z, s, col, t: 0 }); }
function say(who, text, col) {
  state.msgs.push({ who, text, t: state.t, col: col || '#e8dcc8' });
  if (state.msgs.length > 7) state.msgs.shift();
}
function updateEffects(dt) {
  for (const f of state.fx) f.t += dt;
  state.fx = state.fx.filter(f => f.t < f.life);
  for (const t of state.tracers) t.t += dt;
  state.tracers = state.tracers.filter(t => t.t < t.life);
  for (const m of state.marks) m.t += dt;
  state.marks = state.marks.filter(m => m.t < m.life);
  for (const f of state.floats) f.t += dt;
  state.floats = state.floats.filter(f => f.t < 1.6);
  for (const d of state.debris) {
    d.life -= dt;
    if (d.rest) continue;
    d.vy -= 24 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; d.rx += d.vr * dt; d.ry += d.vr * 0.7 * dt;
    const g = hAt(d.x, d.z);
    if (g < 99 && d.y - d.s * 0.5 < g) {
      if (d.vy < 0 && d.y - d.s * 0.5 > g - 1.2) { d.y = g + d.s * 0.5; d.vy *= -0.3; d.vx *= 0.55; d.vz *= 0.55; d.vr *= 0.5; if (Math.abs(d.vy) < 1) d.rest = true; }
      else { d.vx *= -0.4; d.vz *= -0.4; }
    }
  }
  state.debris = state.debris.filter(d => d.life > 0);
}
