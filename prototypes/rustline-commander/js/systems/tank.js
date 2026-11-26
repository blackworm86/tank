// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The command tank: driving, the turret, the main gun. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The command tank ------------------------------------------------------------------------------------
function tankFootprint(x, z, h, dense) {
  const s = Math.sin(h), c = Math.cos(h), out = [];
  for (const lx of [-1.3, 0, 1.3]) for (const lz of dense ? [-2.3, -1.15, 0, 1.15, 2.3] : [-2.3, 0, 2.3]) out.push({ x: x + c * lx + s * lz, z: z - s * lx + c * lz, lx, lz });
  return out;
}
/** Ground under a hull point: the smoothed relief (as drawn), or the top of something low and hard it drives onto. */
function rideH(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z); if (!inMap(ix, iz)) return 99;
  const i = ix + world.N * iz, s = smoothH(x, z), top = world.hmap[i];
  return top > world.groundRaw[i] ? Math.max(s, top) : s;
}
/** The tank flattens what is soft in a column it drives into (trees, sandbags, junk, planks). */
function crushColumn(ix, iz, g, px, pz, tk) {
  const rem = [];
  for (let y = world.hmap[ix + world.N * iz] - 1; y >= g; y--) { const t = getV(ix, y, iz); if (SOFTV.has(t)) { setV(ix, y, iz, 0); rem.push(ix, y, iz, t); } else break; }
  if (rem.length) { recomputeColumn(ix, iz); spawnDebris(rem, px, tk.y + 1, pz, 3); sfx('crunch', px, pz); }
}
/**
 * Can the tank stand at (x,z,h)? The hull rides the smoothed relief, the same ground that is drawn:
 * natural steps never stop it, only a footprint steeper than tank_slope_span does (a cliff). Built
 * things stop it when they rise more than climb above the ground there; soft ones it crushes.
 * Returns the footprint or null.
 */
function tankFits(tk, x, z, h, climb) {
  const pts = tankFootprint(x, z, h, true), now = tankFootprint(tk.x, tk.z, tk.heading, true), N = world.N;
  let lo = 1e9, hi = -1e9, l0 = 1e9, h0 = -1e9;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k], ix = Math.floor(p.x), iz = Math.floor(p.z);
    if (!inMap(ix, iz) || deepWater(p.x, p.z)) return null;
    const i = ix + N * iz, g = world.groundRaw[i], s = smoothH(p.x, p.z);
    let top = world.hmap[i];
    if (top > g && top - s > 0.6) { // something built or grown stands here
      const t = world.vox[VH * i + top - 1];
      if (SOFTV.has(t)) { crushColumn(ix, iz, g, p.x, p.z, tk); top = world.hmap[i]; }
      // hard: a wall when it rises past climb above where this point of the hull rides now (a bridge deck does not)
      if (top > g && top - Math.min(rideH(now[k].x, now[k].z), tk.y + 3) > climb) return null;
    }
    const r = rideH(p.x, p.z), r0 = rideH(now[k].x, now[k].z);
    lo = Math.min(lo, r); hi = Math.max(hi, r); l0 = Math.min(l0, r0); h0 = Math.max(h0, r0);
  }
  // too steep (a cliff), unless no steeper than where the hull stands now
  if (hi - lo > tune.tank_slope_span && hi - lo > h0 - l0 + 0.01) return null;
  return pts;
}
function updateTank(dt) {
  const tk = state.tank, S = tankStats();
  if (!tk.alive) return;
  tk.maxhp = S.hp; if (tk.hp > S.hp) tk.hp = S.hp;
  const drive = state.mode !== 'cmd' && !state.rename; // in command mode WASD pans the map and the tank holds still
  const fwd = drive ? (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0) - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0) : 0;
  const turn = drive ? (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0) - (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) : 0;
  const wet = shallow(tk.x, tk.z) ? 0.6 : 1;
  const target = fwd > 0 ? S.speed * wet : fwd < 0 ? -S.reverse * wet : 0;
  const acc = S.accel * (Math.sign(target) !== Math.sign(tk.speed) && tk.speed !== 0 ? 2 : 1);
  tk.speed += Math.max(-acc * dt, Math.min(acc * dt, target - tk.speed));
  const prevHead = tk.heading, px0 = tk.x, pz0 = tk.z;
  if (turn) {
    const nh = tk.heading + turn * S.turn * Math.PI / 180 * dt * (fwd < 0 ? -1 : 1);
    if (tankFits(tk, tk.x, tk.z, nh, S.climb)) tk.heading = nh;
  }
  const hullTurn = Math.abs(angDiff(prevHead, tk.heading)) / dt;
  if (Math.abs(tk.speed) > 0.01) {
    const nx = tk.x + Math.sin(tk.heading) * tk.speed * dt, nz = tk.z + Math.cos(tk.heading) * tk.speed * dt;
    let pts = tankFits(tk, nx, nz, tk.heading, S.climb), bx = nx, bz = nz;
    if (pts && vehicleBlocked(tk, nx, nz)) pts = null;
    if (!pts) { // slide along the obstacle: the nearest bearing off the line of travel that fits
      const v = tk.speed * dt;
      for (const a of [0.3, -0.3, 0.65, -0.65, 1.0, -1.0, 1.35, -1.35]) {
        const k = Math.cos(a), mx = tk.x + Math.sin(tk.heading + a) * v * k, mz = tk.z + Math.cos(tk.heading + a) * v * k;
        const p2 = tankFits(tk, mx, mz, tk.heading, S.climb);
        if (p2 && !vehicleBlocked(tk, mx, mz)) { pts = p2; bx = mx; bz = mz; break; }
      }
      if (!pts) { // a caught corner: steer the hull a little off it and try again
        for (const sg of [1, -1]) {
          const nh = tk.heading + sg * tune.tank_glance * Math.PI / 180 * dt, mx = tk.x + Math.sin(nh) * tk.speed * dt * 0.6, mz = tk.z + Math.cos(nh) * tk.speed * dt * 0.6;
          const p2 = tankFits(tk, mx, mz, nh, S.climb);
          if (p2 && !vehicleBlocked(tk, mx, mz)) { pts = p2; bx = mx; bz = mz; tk.heading = nh; break; }
        }
      }
      tk.speed *= pts ? 0.92 : 0.6;
    }
    if (pts) { tk.x = bx; tk.z = bz; }
  }
  // wedged (the driver pushes, nothing moves or turns): slide the hull to the nearest pose that fits
  const tried = fwd || turn, still = Math.hypot(tk.x - px0, tk.z - pz0) < 0.002 && tk.heading === prevHead;
  tk.stuckT = tried && still ? (tk.stuckT || 0) + dt : 0;
  if (tk.stuckT > tune.tank_unstick_time) {
    tk.stuckT = 0;
    search: for (const r of [0.4, 0.8, 1.2, 1.7, 2.3, 3.0]) for (let k = 0; k < 16; k++) {
      const a = k / 16 * Math.PI * 2, nx = tk.x + Math.sin(a) * r, nz = tk.z + Math.cos(a) * r;
      for (const dh of [0, 0.3, -0.3, 0.7, -0.7]) {
        if (tankFits(tk, nx, nz, tk.heading + dh, S.climb + 1) && !vehicleBlocked(tk, nx, nz)) { tk.x = nx; tk.z = nz; tk.heading += dh; tk.speed = 0; break search; }
      }
    }
  }
  // ground, pitch and roll from the footprint
  const pts = tankFootprint(tk.x, tk.z, tk.heading);
  let sum = 0, front = 0, backH = 0, left = 0, right = 0;
  for (const p of pts) { const g = Math.min(rideH(p.x, p.z), tk.y + 3); sum += g; if (p.lz > 0) front += g; if (p.lz < 0) backH += g; if (p.lx < 0) right += g; if (p.lx > 0) left += g; }
  tk.y = Math.max(sum / pts.length, rideH(tk.x, tk.z) - 0.5);
  tk.vy += (tk.y - tk.vy) * Math.min(1, dt * 10);
  tk.pitch += (-(front - backH) / 3 / 4.6 - tk.pitch) * Math.min(1, dt * 8);
  tk.roll += ((left - right) / 3 / 2.6 - tk.roll) * Math.min(1, dt * 8);
  // crush infantry in the way
  crushUnder(tk, tk.speed);
  // the turret follows the mouse at its own speed: the hook
  // the turret sits on the hull: it turns with it, then traverses on its own toward the mouse
  tk.turretYaw += angDiff(tk.prevHd ?? tk.heading, tk.heading); tk.prevHd = tk.heading;
  const prevT = tk.turretYaw;
  if (state.mode === 'tank' && state.mouse3 && !state.menu) {
    const want = Math.atan2(state.mouse3.x - tk.x, state.mouse3.z - tk.z);
    tk.turretYaw = turnToward(tk.turretYaw, want, S.turret * Math.PI / 180 * dt);
    tk.aligned = Math.abs(angDiff(tk.turretYaw, want)) < tune.aligned_deg * Math.PI / 180;
  } else { tk.aligned = false; tk.turretYaw = turnToward(tk.turretYaw, tk.heading, S.turret * Math.PI / 180 * dt); } // command mode: gun back to the front
  const tTurn = Math.abs(angDiff(prevT, tk.turretYaw)) / dt;
  // dispersion: grows with motion, closes while still
  const mv = Math.min(1, Math.abs(tk.speed) / Math.max(1, S.speed));
  const want = tune.spread_min * S.spread + tune.spread_move * S.moveSpread * mv * S.spread
    + tune.spread_turn * S.moveSpread * Math.min(1, hullTurn / (S.turn * Math.PI / 180)) + tune.spread_turn * 0.6 * Math.min(1, tTurn / (S.turret * Math.PI / 180));
  if (want > tk.spread) tk.spread += (want - tk.spread) * Math.min(1, dt * 6);
  else tk.spread += (want - tk.spread) * (1 - Math.exp(-dt / (tune.aim_time * S.aim)));
  tk.reload = Math.max(0, tk.reload - dt);
  tk.recoil = Math.max(0, tk.recoil - dt * 2.5);
  // where the gun points now, at the mouse's distance
  if (state.mouse3) {
    const m = state.mouse3, d = Math.max(5, Math.min(150, Math.hypot(m.x - tk.x, m.z - tk.z)));
    const ax = tk.x + Math.sin(tk.turretYaw) * d, az = tk.z + Math.cos(tk.turretYaw) * d;
    const ay = tk.aligned ? m.y : Math.max(world.WL - 0.2, Math.min(hAt(ax, az), 60));
    state.aimP = { x: ax, y: ay, z: az, dist: d };
    state.fireLine = lineOfFire(tk, S, state.aimP);
  }
  if (state.mode === 'tank' && MS.l && !state.menu && !state.menuBlock && tk.reload <= 0 && state.aimP) { if (S.wkind === 'bullet') fireTankMG(tk, S); else if (useRound()) fireCannon(tk, S); else tk.reload = 0.4; }
  tankSystems(tk, dt);
  // tutorial: the first moves
  if (state.tut === 0 && Math.hypot(tk.x - state.startPos.x, tk.z - state.startPos.z) > 6) {
    state.tut = 1; say('Radio', 'Il mouse punta il cannone, ma la torretta gira lenta. Da fermo il cerchio si stringe. Click sinistro: cannone (colpi contati). Click destro: arma secondaria.', '#9fe3a0');
  }
}
/**
 * The path the round would take now (the gun's bearing, the mouse's distance): 33 points from the
 * muzzle along the shell's arc (straight for the machine gun), and the index of the first point
 * inside something solid (-1: a clear line). The HUD draws it red from there on.
 */
function lineOfFire(tk, S, a) {
  const bullet = S.wkind === 'bullet', off = bullet ? 2.2 : 1.2 + S.barrel;
  const mx = tk.x + Math.sin(tk.turretYaw) * off, mz = tk.z + Math.cos(tk.turretYaw) * off, my = tk.vy + 1.95;
  const g = bullet ? 0 : tune.shell_gravity, D = Math.max(0.5, Math.hypot(a.x - mx, a.z - mz)), T = D / tune.shell_speed;
  const ty = (bullet ? a.y + 0.6 : a.y), vy = (ty - my + 0.5 * g * T * T) / T;
  const pts = []; let block = -1;
  for (let k = 0; k <= 32; k++) {
    const t = T * k / 32, x = mx + (a.x - mx) * k / 32, z = mz + (a.z - mz) * k / 32, y = my + vy * t - 0.5 * g * t * t;
    pts.push({ x, y, z });
    if (block < 0 && k > 0 && k < 32 && (x - tk.x) ** 2 + (z - tk.z) ** 2 > 9 && solidF(x, y, z)) block = k;
  }
  if (block < 0) { // the stretch to the last point too: the round lands at the mouse unless something stands right before it
    const p = pts[31], q = pts[32];
    for (let s = 1; s < 4; s++) { const f = s / 4; if (solidF(p.x + (q.x - p.x) * f, p.y + (q.y - p.y) * f - 0.25, p.z + (q.z - p.z) * f)) { block = 32; break; } }
  }
  return { pts, block };
}
function vehicleBlocked(tk, x, z) {
  for (const e of state.ents) {
    if (e === tk || !e.alive || !e.veh) continue;
    const r = e.rad + tk.rad, dx = e.x - x, dz = e.z - z;
    if (dx * dx + dz * dz < r * r && dx * dx + dz * dz < (e.x - tk.x) ** 2 + (e.z - tk.z) ** 2) return true;
  }
  return false;
}
function fireCannon(tk, S) {
  const a = state.aimP, R = tk.spread * a.dist;
  const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * R;
  const tx = a.x + Math.cos(ang) * rr, tz = a.z + Math.sin(ang) * rr;
  const ty = tk.aligned && rr < 1.2 ? a.y : Math.max(world.WL - 0.2, hAt(tx, tz));
  const mx = tk.x + Math.sin(tk.turretYaw) * (1.2 + S.barrel), mz = tk.z + Math.cos(tk.turretYaw) * (1.2 + S.barrel), my = tk.vy + 1.95;
  launch({ kind: 'shell', team: 0, owner: tk, dmg: S.dmg, blast: S.blast * SHELLS[state.shell].blast, shell: state.shell, vsHeavy: S.vsHeavy }, mx, my, mz, tx, ty, tz, tune.shell_speed, tune.shell_gravity);
  tk.reload = S.reload; tk.recoil = state.weapon === 'c75' || state.weapon === 'c105' ? 1 : 0.35; tk.spread += S.fireSpread;
  state.lastShot = state.t;
  muzzle(mx, my, mz, 1.3); sfx('cannon', tk.x, tk.z); cam.shake = Math.max(cam.shake, tune.shake * 0.6);
  if (state.tut === 1) { state.tut = 2; say('Radio', 'Bel colpo. Spazio o Tab: pausa tattica. Lì scegli una squadra (click o 1-6) e click destro: il menu degli ordini, che partono alla ripresa.', '#9fe3a0'); }
}
/**
 * The hull's machine gun: one round along the gun line into the dispersion circle. The first enemy
 * near the line that the gun can see is hit (cover makes it miss more); a miss chews soft cover.
 */
function fireTankMG(tk, S, sec) {
  const W = sec || { dmg: S.dmg, range: S.range, heavy: state.weapon === 'hmg' };
  const a = state.aimP, d = Math.min(a.dist, W.range), R = tk.spread * d + 0.25;
  const ang = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * R;
  const ex = tk.x + Math.sin(tk.turretYaw) * d + Math.cos(ang) * rr, ez = tk.z + Math.cos(tk.turretYaw) * d + Math.sin(ang) * rr;
  const ey = d < a.dist ? tk.vy + 1.6 : (tk.aligned ? a.y : hAt(ex, ez)) + 0.6;
  const mx = tk.x + Math.sin(tk.turretYaw) * 2.2, mz = tk.z + Math.cos(tk.turretYaw) * 2.2, my = tk.vy + 1.95;
  const vx = ex - mx, vy = ey - my, vz = ez - mz, L2 = vx * vx + vy * vy + vz * vz || 1;
  let best = null, bt = 2;
  for (const e of state.ents) {
    if (!e.alive || e.team !== 1 || e.inside) continue;
    const cy = e.y + chestH(e), t = ((e.x - mx) * vx + (cy - my) * vy + (e.z - mz) * vz) / L2;
    if (t < 0 || t > 1.08 || t >= bt) continue;
    const px = mx + vx * t, py = my + vy * t, pz = mz + vz * t, r = e.veh ? e.rad : 0.75;
    if ((px - e.x) ** 2 + (pz - e.z) ** 2 + ((py - cy) * 0.6) ** 2 > r * r) continue;
    if (!lineClear(mx, my, mz, e.x, cy, e.z)) continue;
    best = e; bt = t;
  }
  let hx = ex, hy = ey, hz = ez;
  if (best) {
    const cov = best.veh ? 0 : coverFrom(best, tk.x, tk.z), miss = cov === 2 ? 0.55 : cov === 1 ? 0.3 : 0;
    hx = best.x; hy = best.y + chestH(best); hz = best.z;
    if (rng() >= miss) dmgTo(best, W.dmg, W.heavy ? 'heavy' : 'bullet', tk);
    else if (rng() < tune.cover_chip) chipCover(best, tk);
  } else if (rng() < 0.25) { // a burst chews soft cover where it lands
    const ix = Math.floor(ex), iz = Math.floor(ez), g = hAt(ex, ez), v = getV(ix, g - 1, iz);
    if (SOFTV.has(v)) { setV(ix, g - 1, iz, 0); recomputeColumn(ix, iz); spawnDebris([ix, g - 1, iz, v], ix + 0.5, g - 0.5, iz + 0.5, 1); }
  }
  tracer(mx, my, mz, hx, hy, hz, [1, 0.9, 0.5]);
  if (sec) tk.spread += tune.spread_fire * 0.03; else { tk.reload = S.reload; tk.recoil = 0.25; tk.spread += S.fireSpread; }
  state.lastShot = state.t;
  sfx('mg', tk.x, tk.z);
  if (state.tut === 1) { state.tut = 2; say('Radio', 'Bel tiro. Spazio o Tab: pausa tattica. Lì scegli una squadra (click o 1-6) e click destro per muoverla: partirà alla ripresa.', '#9fe3a0'); }
}
/** Sends a projectile on a ballistic arc from (x,y,z) to (tx,ty,tz). */
function launch(p, x, y, z, tx, ty, tz, speed, g) {
  const dx = tx - x, dz = tz - z, D = Math.max(0.5, Math.hypot(dx, dz)), t = D / speed;
  Object.assign(p, { x, y, z, vx: dx / t, vz: dz / t, vy: (ty - y + 0.5 * g * t * t) / t, g, life: t + 2 });
  state.proj.push(p);
}
