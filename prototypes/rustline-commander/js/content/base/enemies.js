// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Content pack "base".
// The Horde's other faces: special infantry (bombers, snipers, mortar crews, flamethrowers, rabble), war
// dogs, light vehicles (bikes with molotovs, buggies, armoured trucks that unload men), heavy ones (the
// raiders' scrap tank, the self-propelled gun) and the fuel depot to blow up. Each kind has its numbers,
// its weapon, its model and its way of fighting (enemyThink); campExtras, patrolKinds and waveKinds
// decide who turns up where. Each kind is an entry in the enemy registry (content/horde.js), with
// think, spot and onKill; the systems read the entries.

/**
 * The new kinds. hp and speed are functions of the config (and of the tier for the infantry).
 * charge: runs straight at the enemy; close: closes to that range; perch: a high post near home;
 * stay: keeps to its home spot; circle: drives round the target; carry: unloads men near the fight;
 * standoff: keeps that distance; inert: never acts (a target to destroy).
 */
const HORDE_SPECIAL = {
  r_bomber: { name: 'Kamikaze', short: 'Kamik.', w: 'bomb', hp: () => tune.raider_hp * 0.6, speed: () => tune.inf_speed * tune.bomber_speed, charge: true },
  r_sniper: { name: 'Cecchino predone', short: 'Cecch.', w: 'r_sniper', hp: () => tune.raider_hp * 0.9, speed: () => tune.inf_speed * 0.85, perch: true, climb: true },
  r_mortar: { name: 'Mortaista predone', short: 'Mort.', w: 'r_mortar', hp: () => tune.raider_hp * 0.9, speed: () => tune.inf_speed * 0.8, stay: true },
  r_flame: { name: 'Lanciafiamme', short: 'Fiamme', w: 'flame', hp: () => tune.raider_hp * 1.4, speed: () => tune.inf_speed * 0.95, close: 6.5 },
  r_rabble: { name: 'Straccione', short: 'Stracc.', w: 'r_pistol', hp: () => tune.raider_hp * 0.55, speed: () => tune.inf_speed * 1.05 },
  dog: { name: 'Cane dell\'Orda', short: 'Cani', w: 'bite', hp: () => tune.raider_hp * 0.5, speed: () => tune.inf_speed * tune.dog_speed, charge: true, beast: true },
  bike: { name: 'Moto', short: 'Moto', veh: true, rad: 1.0, w: 'molotov', hp: () => tune.bike_hp, speed: () => tune.bike_speed, circle: true, turret: 400 },
  buggy: { name: 'Buggy', short: 'Buggy', veh: true, rad: 1.3, w: 'r_mount', hp: () => tune.buggy_hp, speed: () => tune.buggy_speed, circle: true, turret: 240 },
  truck: { name: 'Camion blindato', short: 'Camion', veh: true, rad: 2.0, w: 'r_mount', hp: () => tune.truck_hp, speed: () => tune.truck_speed, carry: true, turret: 160 },
  r_tank: { name: 'Carro rottame', short: 'Carro', veh: true, heavy: true, rad: 2.0, w: 'r_gun', hp: () => tune.rtank_hp, speed: () => tune.rtank_speed, standoff: 26, turret: 50 },
  r_spg: { name: 'Semovente', short: 'Semov.', veh: true, rad: 2.2, w: 'howitzer', hp: () => tune.spg_hp, speed: () => tune.rtank_speed * 0.8, standoff: 60, turret: 35 },
  depot: { name: 'Deposito di carburante', short: 'Depos.', veh: true, rad: 3.2, w: null, hp: () => tune.depot_hp, speed: () => 0, inert: true },
};
// each one through the registry (content/horde.js), with the special kinds' own ways
for (const k in HORDE_SPECIAL) registerEnemy(k, Object.assign(HORDE_SPECIAL[k], { think: enemyThink, spot: enemySpot, onKill: enemyOnKill }));

/** The extra weapons (weapon() in systems/units.js asks here for kinds it does not know). */
Object.assign(EXTRA_W, {
  bomb: () => ({ kind: 'bomb', special: bombFire, range: 2.4, dmg: tune.bomb_damage, rate: 0.4, blast: 2.3, move: true }),
  r_sniper: () => ({ kind: 'bullet', range: tune.sniper_range * 0.9, dmg: tune.sniper_damage * 0.8, rate: tune.sniper_rate * 1.25, acc: Math.min(0.9, tune.raider_acc * 1.8), snd: 'sniper', sight: 1.7 }),
  r_mortar: () => ({ kind: 'mortar', range: tune.mortar_range, min: tune.mortar_min, dmg: tune.mortar_damage * 0.8, rate: tune.mortar_rate * 1.3, blast: tune.mortar_blast, indirect: true }),
  flame: () => ({ kind: 'flame', special: flameFire, range: 7.5, dmg: tune.flame_damage, rate: 0.3, move: true }),
  r_pistol: () => ({ kind: 'bullet', range: 16, dmg: tune.rifle_damage * 0.6, rate: 1.6, acc: tune.raider_acc * 0.8 }),
  bite: () => ({ kind: 'bite', special: biteFire, range: 1.8, dmg: tune.dog_damage, rate: 0.9, move: true, noVeh: true }),
  molotov: () => ({ kind: 'molotov', special: molotovFire, range: 15, dmg: 26, rate: 3.2, blast: 1.7 }),
  r_gun: () => ({ kind: 'shell', range: 40, dmg: tune.ltank_damage * 0.85, rate: tune.ltank_reload * 1.3, blast: 1.5 }),
  howitzer: () => ({ kind: 'howitzer', special: howitzerFire, range: tune.spg_range, min: 22, dmg: tune.spg_damage, rate: tune.spg_reload, blast: 2.6, indirect: true }),
});

// ---- The special weapons ------------------------------------------------------------------------------------
/** A bomber's charge goes off on him: everyone close is hurt, him first. */
function blowUp(e, dmg, blast) {
  e.alive = false; e.hp = 0; e.deathT = state.t; e.path = null; e.moving = false; // no kill credit: he did it himself
  explode({ kind: 'rpg', team: 1, owner: e, dmg, blast }, e.x, e.y + 0.9, e.z, null);
}
function bombFire(e, t, w) { blowUp(e, w.dmg, w.blast); }
function biteFire(e, t, w) { dmgTo(t, w.dmg, 'bullet', e); sfx('small', e.x, e.z); }
/** A short cone of fire ahead: infantry burn and break, hulls only scorch. */
function flameFire(e, t, w) {
  const yaw = angTo(e, t);
  for (const o of state.ents) {
    if (!o.alive || o.team === e.team || o.inside) continue;
    const d = Math.sqrt(dist2(e, o)); if (d > w.range || Math.abs(angDiff(yaw, angTo(e, o))) > 0.45) continue;
    dmgTo(o, w.dmg * (o.veh ? 0.3 : 1) * (1 - d / w.range * 0.4), 'blast', e);
    if (!o.veh && o.alive) o.supT = state.t + tune.suppress_time;
  }
  for (let i = 1; i <= 6; i++) { const r = i * w.range / 6; state.fx.push({ kind: i % 2 ? 'flash' : 'smoke', x: e.x + Math.sin(yaw) * r + (rng() - 0.5) * r * 0.3, y: e.y + 1, z: e.z + Math.cos(yaw) * r + (rng() - 0.5) * r * 0.3, t: 0, life: 0.35, s: 0.4 + r * 0.08, rise: 1.5, col: 0xff7a20 }); }
  sfx('small', e.x, e.z);
}
/** A bottle of fuel lobbed from a bike: a small blast and a patch of fire. */
function molotovFire(e, t, w) {
  const tx = t.x + (rng() - 0.5) * 3, tz = t.z + (rng() - 0.5) * 3, D = Math.hypot(tx - e.x, tz - e.z);
  launch({ kind: 'mortar', team: e.team, owner: e, dmg: w.dmg, blast: w.blast, fire: true, dtype: 'fire' }, e.x, e.y + 1.6, e.z, tx, hAt(tx, tz), tz, D / (1.2 + D / 22), 14);
}
/** The self-propelled gun: a heavy round from far off; its landing spot is marked so it can be dodged. */
function howitzerFire(e, t, w) {
  const sc = tune.spg_scatter, tx = t.x + (rng() - 0.5) * 2 * sc, tz = t.z + (rng() - 0.5) * 2 * sc, D = Math.hypot(tx - e.x, tz - e.z), sp = D / (3 + D / 25);
  launch({ kind: 'mortar', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, e.x + Math.sin(e.turretYaw) * 3, e.y + 2.4, e.z + Math.cos(e.turretYaw) * 3, tx, hAt(tx, tz), tz, sp, 14);
  state.marks.push({ x: tx, y: hAt(tx, tz), z: tz, t: 0, life: D / sp + 0.4, col: 0xff3a2a }); // where it will land
  muzzle(e.x, e.y + 2.4, e.z, 1.6); sfx('cannon', e.x, e.z);
  if (state.t - (state.artSay || -99) > 20 && dist2(t, state.tank) < 30 * 30) { state.artSay = state.t; say('Radio', 'Artiglieria! Il cerchio rosso è dove cade: muoviti.', '#ff9a7a'); }
}
/** A killed bomber's charge still goes off; a burst fuel depot burns everything round it. */
function enemyOnKill(e) {
  if (e.kind === 'r_bomber') explode({ kind: 'rpg', team: 1, owner: null, dmg: tune.bomb_damage * 0.6, blast: 1.8 }, e.x, e.y + 0.9, e.z, null);
  if (e.kind === 'depot') {
    for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4; explode({ kind: 'shell', team: 1, owner: null, dmg: 90, blast: 3 }, e.x + Math.sin(a) * 2.5, e.y + 1, e.z + Math.cos(a) * 2.5, null); }
    for (let i = 0; i < 10; i++) state.fx.push({ kind: 'smoke', x: e.x + (rng() - 0.5) * 5, y: e.y + 2, z: e.z + (rng() - 0.5) * 5, t: -i * 0.5, life: 6, s: 2, rise: 10, col: 0x1e1a18 });
    if (typeof missionDepotDown === 'function') missionDepotDown(e);
  }
}
/** Fire splashes where a molotov breaks. */
function fireSplash(x, y, z) { for (let i = 0; i < 7; i++) state.fx.push({ kind: i % 2 ? 'flash' : 'smoke', x: x + (rng() - 0.5) * 3, y: y + 0.3, z: z + (rng() - 0.5) * 3, t: -i * 0.15, life: 1.4, s: 0.6, rise: 2, col: 0xff6a18 }); }

// ---- How they fight --------------------------------------------------------------------------------------------
/** The special kinds' own ways (called by raiderThink once the group is alert); true when it decided. */
function enemyThink(e, w, g) {
  const D = ENEMY[e.kind]; if (!D || D.inert) return !!(D && D.inert);
  const tgt = e.target || (g.known ? { x: g.known.x, z: g.known.z } : null);
  if (!tgt) return false;
  const repath = s => !e.path || e.pi >= e.path.length || state.t - (e.pathT || -9) > (s || 1.2);
  const d = Math.hypot(tgt.x - e.x, tgt.z - e.z);
  if (D.charge) { // dogs and bombers run straight in; a bomber wants a hull
    let t = tgt;
    if (e.kind === 'r_bomber') { const v = nearestFriendVeh(e, 45); if (v) t = v; }
    if (repath(0.9) && Math.hypot(t.x - e.x, t.z - e.z) > 1.2) setDest(e, t.x, t.z);
    return true;
  }
  if (D.close) { if (d > D.close) { if (repath()) setDest(e, tgt.x, tgt.z); } else e.path = null; return true; }
  if (D.perch) { // a high post near home, then it stays and shoots
    if (!e.post) e.post = overwatchSpot(e.homeSpot.x, e.homeSpot.z, 14, tgt) || e.homeSpot;
    if (e.target) e.path = null;
    else if (Math.hypot(e.post.x - e.x, e.post.z - e.z) > 1.5 && repath(3)) setDest(e, e.post.x, e.post.z);
    return true;
  }
  if (D.stay) { if (Math.hypot(e.homeSpot.x - e.x, e.homeSpot.z - e.z) > 5 && repath(3)) setDest(e, e.homeSpot.x, e.homeSpot.z); else e.path = null; return true; }
  if (D.circle) return circleTarget(e);
  if (D.carry && !e.unloaded) {
    if (d < tune.truck_unload || e.hp < e.maxhp * 0.5) unloadTruck(e, g);
    else if (repath(2)) setDest(e, tgt.x, tgt.z);
    return true;
  }
  if (D.standoff) {
    if (e.kind === 'r_spg' && d < D.standoff * 0.5) { // too close for a gun: back off
      if (repath(2)) setDest(e, e.x + (e.x - tgt.x) / (d || 1) * 20, e.z + (e.z - tgt.z) / (d || 1) * 20);
    } else if (d > D.standoff && !(e.target && e.kind === 'r_spg')) {
      if (repath(2)) { const k = (d - D.standoff * 0.85) / d; setDest(e, e.x + (tgt.x - e.x) * k, e.z + (tgt.z - e.z) * k); }
    } else e.path = null;
    return true;
  }
  if (e.unloaded) { if (e.target) e.path = null; return true; } // an emptied truck stays and fires its gun
  return false;
}
/** A short-reach kind (a dog, a bomber) that sees a foe raises the alarm for its group and goes for it. */
function enemySpot(e, g) {
  let best = null, bd = tune.raider_sight ** 2;
  for (const o of state.ents) {
    if (!o.alive || o.team !== 0 || o.inside) continue;
    const d = dist2(e, o); if (d < bd && canSee(e, o)) { bd = d; best = o; }
  }
  if (best) alertGroup(g, best);
}
/** An armoured truck stops and its men jump down. */
function unloadTruck(e, g) {
  e.unloaded = true; e.path = null;
  const kinds = ['r_rifle', 'r_rifle', 'r_rpg', 'r_rifle', (e.tier || 1) >= 2 ? 'r_flame' : 'r_mg', 'r_bomber'];
  kinds.forEach((k, i) => { const q = spotNear(e.x - Math.sin(e.heading) * 3.5, e.z - Math.cos(e.heading) * 3.5, i); const m = addRaider(g, k, q.x, q.z, e.tier || 1); m.think = 0.3 + i * 0.1; });
  if (dist2(e, state.tank) < 80 * 80) say('Radio', 'Un camion blindato scarica fanti!', '#ff9a7a');
}

// ---- Who turns up where ----------------------------------------------------------------------------------------
/** More of a camp's people: dogs, bombers, a sniper, a mortar, flamethrowers, bikes, a tank or a truck, the gun. */
function campExtras(g, c) {
  const t = c.tier || 1, add = (k, fixed, r) => { const p = spotNear(c.x + (rng() - 0.5) * (r || 10), c.z + (rng() - 0.5) * (r || 10), g.members.length); return addRaider(g, k, p.x, p.z, t, fixed); };
  if (rng() < 0.5) for (let i = 0; i < 2 + t; i++) add('dog');
  if (rng() < 0.3 + t * 0.15) add('r_bomber');
  if (rng() < 0.35 + t * 0.15) add('r_sniper');
  if (t >= 2) { add('r_mortar', false, 6); if (rng() < 0.6) add('r_flame'); if (rng() < 0.5) { add('bike', false, 16); add('bike', false, 16); } else if (rng() < 0.4) add('buggy', false, 16); }
  if (t >= 3) { add(rng() < 0.5 ? 'r_tank' : 'truck', false, 18); if (rng() < 0.4) add('r_spg', false, 12); }
}
/** A roaming patrol's make-up: plain raiders, a bike gang, a dog pack, rabble, an assault squad or armour. */
function patrolKinds(p) {
  const n = p.n, t = p.tier || 1;
  if (p.first) return Array.from({ length: n }, () => 'r_rifle');
  const r = rng();
  if (r < 0.18) return t >= 2 ? ['bike', 'bike', 'buggy'] : ['bike', 'bike'];
  if (r < 0.34) return ['r_rifle', ...Array.from({ length: 3 + t }, () => 'dog')];
  if (r < 0.48) return Array.from({ length: 5 + t * 2 }, () => 'r_rabble');
  if (r < 0.62 && t >= 2) return ['r_rifle', 'r_rifle', 'r_flame', 'r_bomber', 'r_rpg'];
  if (r < 0.7 && t >= 3) return ['r_tank', 'r_rifle', 'r_rifle'];
  return Array.from({ length: n + 1 }, (_, i) => i === 2 && t >= 2 ? 'r_rpg' : i === 3 ? 'r_mg' : 'r_rifle');
}
/** A hunter wave from the Horde: grows and changes with each wave. */
function waveKinds(n, tier, waveN) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(i % 5 === 1 ? 'r_mg' : i % 4 === 3 ? 'r_rpg' : i % 6 === 5 ? 'r_bomber' : 'r_rifle');
  const flavour = (waveN + Math.floor(rng() * 3)) % 5;
  if (flavour === 0) for (let i = 0; i < 3 + tier; i++) out.push('dog');
  if (flavour === 1) out.push('bike', 'bike');
  if (flavour === 2) for (let i = 0; i < 4 + tier * 2; i++) out.push('r_rabble');
  if (flavour === 3 && tier >= 2) out.push('truck');
  if (flavour === 4 && tier >= 2) out.push(tier >= 3 ? 'r_tank' : 'buggy', 'r_flame');
  return out;
}

// ---- Models -----------------------------------------------------------------------------------------------------
const ENEMY_MODELS = {
  r_bomber: () => { const g = makeSoldier('r_x'), s = g.userData.body; for (let i = -1; i <= 1; i++) bx(s, 0.12, 0.42, 0.12, PC.red, i * 0.16, 0.95, 0.22); bx(s, 0.58, 0.08, 0.3, PC.yel, 0, 1.1, 0.12); bx(s, 0.05, 0.3, 0.05, PC.black, 0.3, 1.2, 0.2); bx(s, 0.34, 0.16, 0.34, PC.yel, 0, 1.55, 0); return g; },
  r_sniper: () => { const g = makeSoldier('r_x'), s = g.userData.body; bx(s, 0.42, 0.14, 0.42, PC.leather, 0, 1.55, 0); bx(s, 0.6, 0.12, 0.08, PC.leather, 0, 1.46, 0); bx(s, 0.07, 0.09, 1.5, 0x2e2a20, 0.24, 1.08, 0.55); bx(s, 0.11, 0.12, 0.32, PC.black, 0.24, 1.18, 0.4); return g; },
  r_mortar: () => { const g = makeSoldier('r_x'), s = g.userData.body; bx(s, 0.36, 0.2, 0.36, PC.grey, 0, 1.55, 0); bx(s, 0.7, 0.08, 0.7, PC.metal, 0.62, 0.04, 0.45); bx(s, 0.2, 1.2, 0.2, 0x3a3a35, 0.62, 0.6, 0.6, -0.5); bx(s, 0.42, 0.28, 0.3, PC.rust, -0.6, 0.14, 0.3); return g; },
  r_flame: () => { const g = makeSoldier('r_x'), s = g.userData.body; bx(s, 0.42, 0.42, 0.42, PC.grey, 0, 1.4, 0); bx(s, 0.3, 0.1, 0.05, 0xff8a2a, 0, 1.44, 0.22); for (const x of [-0.14, 0.14]) bx(s, 0.22, 0.62, 0.22, PC.red, x, 1.0, -0.32); bx(s, 0.12, 0.12, 0.9, PC.metal, 0.28, 0.95, 0.45); bx(s, 0.16, 0.16, 0.12, 0xff8a2a, 0.28, 0.95, 0.92); return g; },
  r_rabble: () => { const g = makeSoldier('r_x'), s = g.userData.body; bx(s, 0.62, 0.3, 0.38, 0x6a5a48, 0, 0.75, 0); bx(s, 0.36, 0.12, 0.36, 0x8a7a60, 0, 1.55, 0); bx(s, 0.06, 0.08, 0.5, PC.metal, 0.3, 0.95, 0.25); return g; },
  dog: () => {
    const g = new THREE.Group(), s = new THREE.Group(); g.add(s); s.scale.setScalar(1.2);
    const fur = 0x4a3a2c;
    bx(s, 0.34, 0.34, 1.0, fur, 0, 0.6, 0); bx(s, 0.3, 0.3, 0.38, fur, 0, 0.82, 0.62); bx(s, 0.2, 0.16, 0.24, 0x2a2018, 0, 0.74, 0.86);
    bx(s, 0.08, 0.14, 0.08, fur, -0.1, 1.02, 0.56); bx(s, 0.08, 0.14, 0.08, fur, 0.1, 1.02, 0.56); bx(s, 0.36, 0.08, 0.36, PC.red, 0, 0.72, 0.42);
    bx(s, 0.08, 0.08, 0.36, fur, 0, 0.74, -0.62, 0.6);
    const lg = [bx(s, 0.1, 0.44, 0.1, fur, -0.12, 0.22, 0.36), bx(s, 0.1, 0.44, 0.1, fur, 0.12, 0.22, -0.36)];
    bx(s, 0.1, 0.44, 0.1, fur, 0.12, 0.22, 0.36); bx(s, 0.1, 0.44, 0.1, fur, -0.12, 0.22, -0.36);
    g.userData = { body: s, legs: lg }; selRing(g, 0.9); return g;
  },
  bike: () => {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    bx(b, 0.2, 0.7, 0.7, PC.track, 0, 0.35, 0.8); bx(b, 0.2, 0.7, 0.7, PC.track, 0, 0.35, -0.8);
    bx(b, 0.3, 0.3, 1.5, PC.rust, 0, 0.75, 0); bx(b, 0.36, 0.3, 0.6, PC.rustD, 0, 0.95, -0.2); bx(b, 0.8, 0.06, 0.06, PC.metal, 0, 1.25, 0.6);
    const tur = new THREE.Group(); tur.position.set(0, 0.9, -0.1); g.add(tur);
    bx(tur, 0.42, 0.5, 0.3, PC.rshirt, 0, 0.45, 0); bx(tur, 0.26, 0.26, 0.26, PC.skin, 0, 0.86, 0); bx(tur, 0.3, 0.1, 0.3, PC.red, 0, 1.0, 0);
    const gun = new THREE.Group(); gun.position.set(0.25, 0.5, 0.1); tur.add(gun); bx(gun, 0.12, 0.22, 0.12, 0x3a7a3a, 0, 0, 0.1); bx(gun, 0.08, 0.1, 0.08, 0xff8a2a, 0, 0.16, 0.1);
    g.userData = { turret: tur, gun, hull: b, gunZ: 0.1 }; selRing(g, 1.5); return g;
  },
  buggy: () => {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    for (const sx of [-1, 1]) for (const sz of [-0.9, 0.9]) bx(b, 0.36, 0.8, 0.8, PC.track, sx * 0.95, 0.4, sz);
    bx(b, 1.5, 0.35, 2.6, PC.rustD, 0, 0.7, 0); for (const sx of [-0.6, 0.6]) { bx(b, 0.08, 0.9, 0.08, PC.metal, sx, 1.3, 0.4); bx(b, 0.08, 0.9, 0.08, PC.metal, sx, 1.3, -0.6); }
    bx(b, 1.3, 0.08, 1.2, PC.metal, 0, 1.75, -0.1); bx(b, 1.52, 0.1, 0.3, PC.yel, 0, 0.9, 1.25);
    const tur = new THREE.Group(); tur.position.set(0, 1.8, -0.3); g.add(tur);
    const gun = new THREE.Group(); gun.position.set(0, 0.2, 0.2); tur.add(gun); bx(gun, 0.14, 0.16, 1.1, PC.metal, 0, 0, 0.5);
    bx(tur, 0.36, 0.4, 0.26, PC.rshirt, 0, 0.2, -0.3); bx(tur, 0.24, 0.24, 0.24, PC.skin, 0, 0.55, -0.3);
    g.userData = { turret: tur, gun, hull: b, gunZ: 0.2 }; selRing(g, 2.0); return g;
  },
  truck: () => {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    for (const sx of [-1, 1]) for (const sz of [-1.6, 0, 1.6]) bx(b, 0.42, 0.9, 0.9, PC.track, sx * 1.15, 0.45, sz);
    bx(b, 2.2, 0.5, 5.0, PC.rustD, 0, 0.95, 0); bx(b, 2.1, 1.3, 1.5, PC.rust, 0, 1.8, 1.7); bx(b, 1.6, 0.3, 0.06, PC.glass, 0, 2.1, 2.46);
    bx(b, 2.2, 1.4, 3.0, 0x5a5048, 0, 1.9, -0.9); for (let i = 0; i < 4; i++) bx(b, 2.24, 0.12, 0.3, PC.yel, 0, 1.4 + i * 0.35, -2.3 + (i % 2) * 2.6);
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) bx(b, 0.06, 0.16, 0.4, PC.black, sx * 1.12, 2.1, -1.8 + i * 0.9);
    bx(b, 2.3, 0.3, 0.25, PC.grey, 0, 0.9, 2.55);
    const tur = new THREE.Group(); tur.position.set(0, 2.6, -0.6); g.add(tur);
    bx(tur, 0.8, 0.4, 0.8, PC.rust, 0, 0.2, 0); const gun = new THREE.Group(); gun.position.set(0, 0.3, 0.3); tur.add(gun); bx(gun, 0.14, 0.16, 1.2, PC.metal, 0, 0, 0.55);
    g.userData = { turret: tur, gun, hull: b, gunZ: 0.3 }; selRing(g, 3.0); return g;
  },
  r_tank: () => {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    for (const s of [-1, 1]) { bx(b, 0.8, 0.95, 4.8, PC.track, s * 1.35, 0.48, 0); for (let i = -2; i <= 2; i++) bx(b, 0.86, 0.46, 0.46, PC.wheel, s * 1.35, 0.36, i * 0.95); }
    bx(b, 2.2, 0.9, 4.6, PC.rustD, 0, 1.05, 0); bx(b, 2.9, 0.12, 4.0, PC.rust, 0, 1.55, -0.1);
    for (let i = 0; i < 5; i++) bx(b, 0.5 + (i % 2) * 0.3, 0.06, 0.6, i % 2 ? PC.yel : PC.metal, -1 + i * 0.5, 1.62, -1.4 + (i % 3) * 0.9);
    bx(b, 2.4, 0.5, 0.3, PC.grey, 0, 0.8, 2.45); for (const s of [-0.8, 0, 0.8]) bx(b, 0.1, 0.1, 0.5, 0xcfc8bd, s, 0.85, 2.7);
    const tur = new THREE.Group(); tur.position.set(0, 1.62, -0.3); g.add(tur);
    bx(tur, 1.8, 0.75, 2.0, PC.rust, 0, 0.38, 0); bx(tur, 1.84, 0.1, 0.4, PC.yel, 0, 0.6, 0.6); bx(tur, 0.5, 0.3, 0.5, PC.rustD, 0.4, 0.9, -0.4);
    const gun = new THREE.Group(); gun.position.set(0, 0.45, 1.0); tur.add(gun); bx(gun, 0.3, 0.3, 2.0, PC.metal, 0, 0, 1.0); bx(gun, 0.42, 0.42, 0.4, PC.black, 0, 0, 2.0);
    g.userData = { turret: tur, gun, hull: b, gunZ: 1.0 }; selRing(g, 3.4); return g;
  },
  r_spg: () => {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    for (const s of [-1, 1]) { bx(b, 0.8, 0.95, 5.2, PC.track, s * 1.45, 0.48, 0); for (let i = -2; i <= 2; i++) bx(b, 0.86, 0.46, 0.46, PC.wheel, s * 1.45, 0.36, i * 1.0); }
    bx(b, 2.3, 0.9, 5.0, 0x5a5048, 0, 1.05, 0); bx(b, 2.6, 0.3, 1.0, PC.rust, 0, 1.6, -2.0);
    const tur = new THREE.Group(); tur.position.set(0, 1.5, 0.2); g.add(tur);
    bx(tur, 2.2, 1.1, 2.4, 0x5a5048, 0, 0.55, -0.4); bx(tur, 2.24, 0.12, 0.3, PC.yel, 0, 0.9, 0.6);
    const gun = new THREE.Group(); gun.position.set(0, 0.8, 0.8); tur.add(gun); gun.rotation.x = -0.35; bx(gun, 0.4, 0.4, 3.4, PC.metal, 0, 0, 1.7); bx(gun, 0.56, 0.56, 0.5, PC.black, 0, 0, 3.3);
    g.userData = { turret: tur, gun, hull: b, gunZ: 0.8 }; selRing(g, 3.6); return g;
  },
  depot: () => {
    const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
    for (const [x, z] of [[-1.6, -0.8], [1.6, -0.8], [0, 1.4]]) { bx(b, 2.0, 2.0, 2.0, 0x8a8a80, x, 1.0, z); bx(b, 2.04, 0.3, 2.04, PC.red, x, 1.4, z); bx(b, 2.04, 0.1, 2.04, PC.yel, x, 2.0, z); }
    for (let i = 0; i < 6; i++) bx(b, 0.5, 0.8, 0.5, i % 2 ? PC.red : PC.rust, -2.4 + i * 0.95, 0.4, 2.6);
    bx(b, 0.1, 2.6, 0.1, PC.black, 2.8, 1.3, 2.4); bx(b, 0.9, 0.5, 0.06, PC.red, 3.2, 2.4, 2.4);
    g.userData = { hull: b }; selRing(g, 4.2); return g;
  },
};

Object.assign(registry('model'), ENEMY_MODELS); // modelFor (view.js) finds them there
