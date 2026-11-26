// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// The simulation: the command tank, squads and orders, raiders, shells, the economy and the run.
'use strict';

// ---- Units and weapons ----------------------------------------------------------------------------
/** Every unit kind. veh: a vehicle; rad: its body radius. */
const UT = {
  tank: { name: 'Carro comando', team: 0, veh: true, rad: 2.2 },
  rifle: { name: 'Fuciliere', team: 0, w: 'rifle', cost: 'cost_rifle' },
  sniper: { name: 'Cecchino', team: 0, w: 'sniper', cost: 'cost_sniper' },
  mg: { name: 'Mitragliere', team: 0, w: 'mg', cost: 'cost_mg' },
  medic: { name: 'Medico', team: 0, w: 'pistol', cost: 'cost_medic' },
  eng: { name: 'Geniere', team: 0, w: 'carbine', cost: 'cost_eng' },
  radio: { name: 'Operatore radio', team: 0, w: 'carbine', cost: 'cost_radio' },
  scout: { name: 'Esploratore', team: 0, w: 'scout', cost: 'cost_scout' },
  mortar: { name: 'Artigliere', team: 0, w: 'mortar', cost: 'cost_mortar' },
  at: { name: 'Cannone anticarro', team: 0, w: 'atgun', cost: 'cost_at' },
  car: { name: 'Autoblindo', team: 0, veh: true, rad: 1.6, w: 'autocannon', cost: 'cost_car' },
  ltank: { name: 'Carro di supporto', team: 0, veh: true, rad: 1.9, w: 'ltgun', cost: 'cost_ltank' },
  r_rifle: { name: 'Predone', team: 1, w: 'r_rifle' },
  r_mg: { name: 'Mitragliere predone', team: 1, w: 'r_mg' },
  r_rpg: { name: 'Razziere', team: 1, w: 'rpg' },
  technical: { name: 'Tecnica', team: 1, veh: true, rad: 1.6, w: 'r_mount' },
  boss: { name: 'Carro del Capo', team: 1, veh: true, rad: 2.8, w: 'boss' },
};
const INF_KINDS = ['rifle', 'mg', 'medic', 'eng', 'radio', 'scout', 'sniper', 'mortar', 'at'];
const VEH_KINDS = ['car', 'ltank'];
/** Vehicles whose hull shrugs off rifle fire. */
const HEAVY = new Set(['tank', 'boss', 'ltank']);
/** A weapon's numbers, read live from config. */
function weapon(k) {
  switch (k) {
    case 'rifle': return { kind: 'bullet', range: tune.rifle_range, dmg: tune.rifle_damage, rate: tune.rifle_rate, acc: tune.rifle_acc };
    case 'sniper': return { kind: 'bullet', range: tune.sniper_range, dmg: tune.sniper_damage, rate: tune.sniper_rate, acc: tune.sniper_acc, snd: 'sniper' };
    case 'mg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate, acc: tune.mg_acc, snd: 'mg', chip: 0.5, arc: tune.mg_arc, turn: tune.mg_turn };
    case 'atgun': return { kind: 'ap', range: tune.at_range, dmg: tune.at_damage, rate: tune.at_rate, blast: 0.8, arc: tune.at_arc, turn: tune.at_turn };
    case 'ltgun': return { kind: 'shell', range: tune.ltank_range, dmg: tune.ltank_damage, rate: tune.ltank_reload, blast: 1.4 };
    case 'carbine': return { kind: 'bullet', range: tune.rifle_range * 0.85, dmg: tune.rifle_damage * 0.8, rate: tune.rifle_rate * 0.9, acc: tune.rifle_acc * 0.95 };
    case 'scout': return { kind: 'bullet', range: tune.rifle_range * 0.95, dmg: tune.rifle_damage * 0.85, rate: tune.rifle_rate, acc: tune.rifle_acc };
    case 'pistol': return { kind: 'bullet', range: 14, dmg: 4, rate: 1.4, acc: 0.45 };
    case 'mortar': return { kind: 'mortar', range: tune.mortar_range, min: tune.mortar_min, dmg: tune.mortar_damage, rate: tune.mortar_rate, blast: tune.mortar_blast, indirect: true };
    case 'autocannon': return { kind: 'bullet', heavy: true, range: tune.car_range, dmg: tune.car_damage, rate: tune.car_rate, acc: 0.6, snd: 'mg' };
    case 'r_rifle': return { kind: 'bullet', range: tune.rifle_range * 0.95, dmg: tune.rifle_damage, rate: 1.4, acc: tune.raider_acc };
    case 'r_mg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate * 1.1, acc: tune.raider_acc * 0.7, snd: 'mg', chip: 0.5, arc: tune.mg_arc, turn: tune.mg_turn };
    case 'rpg': return { kind: 'rpg', range: tune.rpg_range, dmg: tune.rpg_damage, rate: tune.rpg_rate, blast: 1.5 };
    case 'r_mount': return { kind: 'bullet', range: tune.mg_range + 2, dmg: tune.mg_damage, rate: tune.mg_rate * 1.2, acc: tune.raider_acc * 0.75, snd: 'mg', chip: 0.5 };
    case 'boss': return { kind: 'shell', range: 48, dmg: tune.boss_damage, rate: tune.boss_reload, blast: 2.3 };
  }
  return extraWeapon(k); // enemies.js: the Horde's other weapons
}

// ---- Tank parts: the hardpoints and modules live in modules.js ----------------------------------------
/**
 * The hulls the run can start with. Numbers live in config.js as hull_<id>_* multipliers on the
 * tank's own values (the battle tank is the 1.0 of everything).
 */
const HULLS = {
  apc: { name: 'APC modulare', short: 'APC', desc: ['Veloce, corazza leggera.', 'Cannoncino 25mm + coass.', 'Tutto si smonta e rimonta.'], weapon: 'ac25', slots: 3, weightK: 1, rad: 2.0 },
  light: { name: 'Carro leggero', short: 'Leggero', desc: ['Velocissimo, sottile.', 'Cannone 75mm + coass.', '2 sistemi avanzati.'], weapon: 'c75', slots: 2, weightK: 0.5, rad: 1.9 },
  mbt: { name: 'Carro da battaglia', short: 'MBT', desc: ['Corazza spessa,', 'cannone 105mm + coass.', '2 sistemi avanzati.'], weapon: 'c105', slots: 2, weightK: 0.15, rad: 2.2 },
};
const HULL_IDS = ['apc', 'light', 'mbt'];

// ---- Between runs: achievements and the hulls they unlock (see loadout.js) ----------------------------------
const META_KEY = 'rustline_meta_v2';
function loadMeta() {
  try { const s = localStorage.getItem(META_KEY); if (s) { const m = JSON.parse(s); return { ach: m.ach || {}, unlocked: Array.isArray(m.unlocked) && m.unlocked.length ? m.unlocked : ['apc'] }; } } catch (e) { /* private window */ }
  return { ach: {}, unlocked: ['apc'] };
}
const meta = loadMeta();
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* not kept */ } }

// ---- Tank numbers ------------------------------------------------------------------------------------
/** The command tank's live numbers: config, the hull, its base systems, weapon and advanced systems. */
function tankStats() {
  if (state.statsStep === state.stepN && state.stats) return state.stats;
  const s = {
    speed: tune.tank_speed, reverse: tune.tank_reverse, turn: tune.tank_turn, climb: tune.tank_climb,
    hp: tune.tank_hp, armor: tune.tank_armor, turret: tune.turret_speed,
    reload: tune.cannon_reload, dmg: tune.cannon_damage, blast: tune.cannon_blast, spread: 1, moveSpread: 1, aim: 1, accel: tune.tank_accel,
    radio: tune.radio_range, barrel: 2.6, seats: 0, hullArmor: 1, sensor: 0, radar: 0, radarT: 0, slots: 0, mgHeat: 1, mgCool: 1, mgRate: 1,
  };
  const G = { dmg: 1, reload: 1, spread: 1, barrel: 1 };
  for (const m of fittedMods()) { // modules.js: what is mounted on the hardpoints
    if (m.gunDmg) G.dmg *= m.gunDmg; if (m.gunReload) G.reload *= m.gunReload; if (m.gunSpread) G.spread *= m.gunSpread; if (m.gunBarrel) G.barrel *= m.gunBarrel;
    if (m.slots) s.slots += m.slots;
    if (m.dmg) s.dmg *= m.dmg; if (m.blast) s.blast *= m.blast; if (m.reload) s.reload += m.reload; if (m.reloadSet) s.reload = m.reloadSet;
    if (m.spread) s.spread *= m.spread; if (m.barrel) s.barrel *= m.barrel; if (m.turn) s.turn *= m.turn; if (m.climb) s.climb += m.climb;
    if (m.speed) { s.speed *= m.speed; s.reverse *= m.speed; } if (m.hp) s.hp += m.hp; if (m.armor) s.armor += m.armor;
    if (m.speedAdd) { s.speed += m.speedAdd; s.reverse += m.speedAdd * 0.5; } if (m.radio) s.radio *= m.radio;
    if (m.turret) s.turret *= m.turret; if (m.moveSpread) s.moveSpread *= m.moveSpread; if (m.aim) s.aim *= m.aim;
    if (m.sensor) s.sensor = m.sensor; if (m.radar) { s.radar = m.radar; s.radarT = m.radarT; }
    if (m.accel) s.accel *= m.accel; if (m.reverse) s.reverse *= m.reverse; if (m.seats) s.seats += m.seats;
    if (m.mgHeat) s.mgHeat *= m.mgHeat; if (m.mgCool) s.mgCool *= m.mgCool; if (m.mgRate) s.mgRate *= m.mgRate;
  }
  s.reload = Math.max(0.3, s.reload);
  // the hull: lighter ones are faster, thinner and carry infantry
  const h = state.hull || 'apc';
  if (h !== 'mbt') {
    const k = n => tune['hull_' + h + '_' + n];
    s.hp *= k('hp'); s.speed *= k('speed'); s.reverse *= k('speed'); s.turn *= k('turn'); s.hullArmor = k('armor');
  }
  s.seats += tune['hull_' + h + '_seats'];
  s.slots += HULLS[h].slots;
  // the main weapon
  const wid = state.weapon || HULLS[h].weapon, W = weaponStats(wid);
  s.wname = WEAPONS[wid].name; s.wkind = W.kind;
  if (W.kind === 'bullet') { s.dmg = W.dmg; s.reload = W.reload; s.range = W.range; s.fireSpread = tune.spread_fire * 0.06; }
  else { s.dmg = W.dmg; s.reload = W.reload; s.blast = W.blast; s.fireSpread = tune.spread_fire * W.spreadK; s.barrel = W.barrel; s.vsHeavy = W.vsHeavy; }
  s.dmg *= G.dmg; s.reload *= G.reload; s.fireSpread *= G.spread; s.barrel *= G.barrel; // the gun's own modules
  const wk = W.weight * HULLS[h].weightK; s.speed = Math.max(2, s.speed - wk); s.reverse = Math.max(1, s.reverse - wk * 0.5);
  applyMods(s);
  state.stats = s; state.statsStep = state.stepN;
  return s;
}
function tankLook() { return { hull: state.hull || 'apc', barrel: tankBarrel(state.hull || 'apc'), antenna: 1.4, armor: 0, radio: 0 }; }

// ---- Entities -------------------------------------------------------------------------------------------
function spawn(kind, x, z, extra) {
  const d = UT[kind];
  const e = Object.assign({
    id: state.nextId++, kind, team: d.team, veh: !!d.veh, rad: d.rad || 0.45, x, z, y: hAt(x, z), vy: hAt(x, z),
    heading: 0, turretYaw: 0, hp: 1, maxhp: 1, alive: true, cool: rng() * 1.2, think: rng() * 0.4,
    path: null, pi: 0, moving: false, target: null, pref: null, squad: null, group: null, inCover: false, recoil: 0,
  }, extra || {});
  e.maxhp = e.hp = unitHp(e);
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
    case 'depot': return enemyHp(e);
    case 'car': return tune.car_hp;
    case 'ltank': return tune.ltank_hp;
    case 'at': return tune.at_hp;
    case 'technical': return tune.technical_hp * k;
    case 'boss': return tune.boss_hp;
    default: if (ENEMY[e.kind]) return enemyHp(e); // enemies.js
      return (e.team ? tune.raider_hp * k : tune.inf_hp * rankK(e, 'rank_hp')) * (e.kind === 'r_mg' ? 1.25 : 1);
  }
}
function unitSpeed(e) {
  const k = (e.team ? 1 : rankK(e, 'rank_speed')) * (suppressed(e) ? tune.suppress_speed : 1) * (!e.team && !e.veh && posture(e) === 'stealth' ? tune.stealth_speed : 1);
  return k * baseSpeed(e) * modOf(e).speed;
}
function baseSpeed(e) {
  if (ENEMY[e.kind]) return ENEMY[e.kind].speed(); // enemies.js
  switch (e.kind) {
    case 'car': return tune.car_speed;
    case 'ltank': return tune.ltank_speed;
    case 'at': return tune.inf_speed * 0.55;
    case 'technical': return tune.technical_speed;
    case 'boss': return 2.6;
    case 'mortar': case 'mg': case 'r_mg': return tune.inf_speed * 0.85;
    case 'scout': return tune.inf_speed * tune.scout_speed;
    default: return tune.inf_speed * (e.team ? 0.92 : 1);
  }
}
function eyeH(e) { return e.kind === 'tank' ? 2.7 : e.kind === 'boss' ? 2.9 : e.kind === 'ltank' ? 2.2 : e.veh ? 2.0 : (e.inCover && !e.moving ? 1.15 : 1.5); }
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

// ---- A new run ------------------------------------------------------------------------------------------
/** Generates the map and places the tank, the first squads and every raider. */
/** The hull the title screen has picked for the next run. */
const HULL_PICK = { id: 'apc' };
function newRun(carry) {
  genWorld();
  Object.assign(state, {
    ents: [], squads: [], proj: [], debris: [], fx: [], tracers: [], marks: [], pickups: [], floats: [], msgs: [], groups: [],
    fit: {}, depot: [], hpSel: null, lookKey: 1, blips: [], radarT: 0,
    hull: HULL_PICK.id, weapon: HULLS[HULL_PICK.id].weapon, stats: null, statsStep: -1, stepN: 0,
    scrap: tune.start_scrap, kills: 0, camps: 0, mode: 'tank', tpause: false, arm: null, gest: null, devSq: 0, devKind: 'rifle', devEnemy: 'r_rifle', tut: 0, nextId: 1, endT: 0, result: null,
    hurtT: -9, aimP: null, mouse3: null, snd: 0, shopTab: 0, shopMsg: '', roster: [], lastShot: -9, tagsWon: 0, campHint: false, fortHint: false,
    boss: null, menu: null, picked: null, rename: null, dragSoldier: null, event: null, campsKnown: false, goScene: null,
    systems: [], owned: [], weaponsOwned: [HULLS[HULL_PICK.id].weapon], ammo: null, shell: 'he', sysCd: {}, smokes: [], eraLeft: 3,
    techKills: 0, crushes: 0, newAch: [], turboUntil: 0, repairUntil: 0, salvo: null, relayL: null,
  });
  // the next sector: the tank, its parts and its scrap come along
  if (carry) Object.assign(state, { fit: JSON.parse(JSON.stringify(carry.fit || {})), depot: (carry.depot || []).map(f => Object.assign({}, f)), hull: carry.hull, weapon: carry.weapon, scrap: carry.scrap, kills: carry.kills, camps: carry.camps,
    systems: carry.systems.slice(), owned: carry.owned.slice(), weaponsOwned: carry.weaponsOwned.slice(), shell: carry.shell, techKills: carry.techKills, crushes: carry.crushes, newAch: carry.newAch.slice() });
  state.ammo = carry && carry.ammo ? Object.assign({}, carry.ammo) : freshAmmo();
  const s = world.sites, rm = s.roadMain;
  const tk = spawn('tank', s.start.x + 0.5, s.start.z + 0.5); tk.rad = HULLS[state.hull].rad;
  if (rm.length > 6) tk.heading = tk.turretYaw = Math.atan2(rm[6][0] - rm[0][0], rm[6][1] - rm[0][1]);
  tk.speed = 0; tk.spread = tune.spread_move; tk.reload = 0; tk.aligned = false; tk.pitch = 0; tk.roll = 0;
  state.tank = tk; state.startPos = { x: tk.x, z: tk.z };
  if (carry) tk.hp = Math.max(1, Math.round(tk.maxhp * carry.hp));
  const back = { x: tk.x - Math.sin(tk.heading) * 6, z: tk.z - Math.cos(tk.heading) * 6 };
  // the first sector starts with the tank alone ; later ones bring who came along
  if (carry) restoreSquads(carry.squads, back.x, back.z);
  // raiders
  for (const c of s.camps) {
    const g = newGroup('camp', c.x + 0.5, c.z + 0.5, c);
    const n = Math.round((4 + c.tier * 2) * tune.camp_men_k), kinds = [];
    for (let i = 0; i < n; i++) kinds.push(i === 1 ? 'r_mg' : i === 3 || (i === 6 && c.tier >= 3) ? 'r_rpg' : 'r_rifle');
    kinds.forEach((k, i) => { const p = c.spots[(i * 3) % c.spots.length] || spotNear(c.x, c.z, i); addRaider(g, k, p.x, p.z, c.tier); });
    addRaider(g, c.tier >= 2 ? 'r_mg' : 'r_rifle', c.tower.x, c.tower.z, c.tier, true);
    if (c.tier >= 3) { const p = spotNear(c.x + 8, c.z, 0); addRaider(g, 'technical', p.x, p.z, c.tier); }
    campExtras(g, c); // enemies.js: dogs, bombers, snipers, mortars, bikes, armour
  }
  for (const p of s.patrols) {
    const g = newGroup('patrol', p.x, p.z, null); g.first = !!p.first;
    g.wps = [];
    for (let k = 0; k < 3; k++) { const a2 = k * 2.1 + rng(), r = p.first ? 4 : 12; const w = spotNear(p.x + Math.cos(a2) * r, p.z + Math.sin(a2) * r, k); g.wps.push(w); }
    g.wpi = 0;
    patrolKinds(p).forEach((k, i) => { const q = spotNear(p.x, p.z, i); addRaider(g, k, q.x, q.z, p.tier); }); // enemies.js: gangs, packs, rabble
    if (!p.first && p.tier >= 3 && rng() < 0.6) { const q = spotNear(p.x, p.z, 5); addRaider(g, 'technical', q.x, q.z, p.tier); }
  }
  const f = s.fortress;
  if (f.kind === 'fortress' && !state.final) { // the old Chief's fortress (a map with no campaign)
  const fg = newGroup('fort', f.x + 0.5, f.z + 0.5, f);
  state.boss = addRaider(fg, 'boss', f.x + 0.5, f.z + 0.5, 3);
  state.boss.turretYaw = state.boss.heading = Math.atan2(f.gateDir.x, f.gateDir.z);
  for (const t of f.towers) addRaider(fg, 'r_mg', t.x, t.z, 3, true);
  for (let i = 0; i < 8; i++) { const p = spotNear(f.x + (i % 4 - 1.5) * 5, f.z + (i < 4 ? -5 : 6), i); addRaider(fg, i % 3 === 2 ? 'r_rpg' : 'r_rifle', p.x, p.z, 3); }
  for (let i = 0; i < 2; i++) { const p = spotNear(f.x + (i ? 8 : -8), f.z + 2, i); addRaider(fg, 'technical', p.x, p.z, 3); }
  }
  for (const w of s.wrecks) { state.pickups.push({ x: w.x, z: w.z, value: w.value, taken: false, wreck: true }); dropLoot(w.x + 1.5, w.z, tune.loot_wreck); dropAmmo(w.x - 1.5, w.z, 4, tune.ammo_drop_wreck); }
  scatterCrates();
  cam.x = tk.x; cam.z = tk.z; cam.y = tk.y; cam.dist = tune.cam_dist;
  // the camera starts behind the tank, on one of the four isometric bearings
  const behind = tk.heading + Math.PI, q4 = Math.PI / 2;
  cam.yawT = cam.yaw = Math.round((behind - Math.PI / 4) / q4) * q4 + Math.PI / 4;
  if (!carry) {
    say('Radio', 'Comandante, il battaglione è disperso. Sei solo: trova uomini lungo la strada e raggiungi l\'esercito.', '#9fe3a0');
    say('Radio', 'Click sinistro: arma principale (X cambia colpo: HE, AP, FRAG). Click destro: mitragliatrice coassiale.', '#9fe3a0');
  }
  if (state.node) setupMap();
}
function newGroup(kind, x, z, site) { const g = { kind, home: { x, z }, site, alert: false, known: null, seenT: -99, members: [], cleared: false }; state.groups.push(g); return g; }
function addRaider(g, kind, x, z, tier, fixed) {
  const e = spawn(kind, x, z, { tier, group: g, fixed: !!fixed, homeSpot: { x, z } });
  e.heading = e.turretYaw = rng() * 6.28;
  g.members.push(e); return e;
}

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
 * How a squad fights. aggressive: goes for every enemy it sees; neutral: fires on what comes in range
 * and takes cover; return: fires only once shot at; stealth: slow and hard to spot, fires only up close
 * or once shot at; hold: never fires.
 */
const POSTURES = [
  { k: 'aggressive', name: 'Aggressiva', short: 'AGG', col: '#ff8a6a' },
  { k: 'neutral', name: 'Neutrale', short: 'NEU', col: '#e8dcc4' },
  { k: 'return', name: 'Risponde al fuoco', short: 'RISP', col: '#ffd36a' },
  { k: 'stealth', name: 'Furtiva', short: 'FURT', col: '#9fd8ff' },
  { k: 'hold', name: 'Non sparare', short: 'NO', col: '#b0a8a0' },
];
function postureOf(sq) { return POSTURES.find(q => q.k === ((sq && sq.posture) || 'neutral')); }
function posture(e) { return (e.squad && e.squad.posture) || 'neutral'; }
function setPosture(sq, k) { sq.posture = k; say(sq.name, 'Atteggiamento: ' + postureOf(sq).name.toLowerCase() + '.', postureOf(sq).col); }
function cyclePosture(sq) { const i = POSTURES.findIndex(q => q.k === postureOf(sq).k); setPosture(sq, POSTURES[(i + 1) % POSTURES.length].k); }
/** A soldier in stealth that has not fired lately: raiders spot it only up close. */
function stealthy(o) { return !o.team && !o.veh && posture(o) === 'stealth' && state.t - (o.firedT || -99) > 3; }
/** An empty squad at the end of the list, with its own colour. */
function newSquad() {
  const sq = { id: state.squads.length, slots: [], members: [], order: { t: 'hold' }, selected: false, tick: 0, posture: 'neutral' };
  state.squads.push(sq); sqColor(sq); return sq;
}
/** Adds a squad of the given unit kinds near (x,z). */
function addSquad(slots, x, z, force) {
  if (state.squads.length >= maxSquads()) return null;
  const sq = { id: state.squads.length, slots: slots.slice(), members: [], order: { t: 'hold' }, selected: false, tick: 0, posture: 'neutral' };
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
    if (sq.posture === 'aggressive' && !marching && !sq.order.ambush && !m.garrison) { // goes for the nearest enemy it sees, no waiting in cover
      const t = nearestSeenFoe(m, tune.sight_range + 10);
      if (t) {
        const w = weapon(UT[m.kind].w);
        if ((dist2(m, t) > (w.range * 0.7) ** 2 || !canSee(m, t)) && (!m.path || m.pi >= m.path.length || state.t - (m.pathT || 0) > 2.5)) { setDest(m, t.x + (m.id % 3 - 1) * 2, t.z + (m.id % 2 - 0.5) * 3); m.pathT = state.t; }
        continue;
      }
    }
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
  if (inRect(c.post, MS.x, MS.y)) { cyclePosture(c.sq); return true; }
  if (inRect(c.edit, MS.x, MS.y)) { state.rename = { sq: c.sq, text: c.sq.name }; return true; }
  const ic = c.icons.find(i => i.m && i.m.alive && Math.abs(MS.x - i.x) < 10 && Math.abs(MS.y - i.y) < 11);
  if (ic && !ic.m.veh) { state.dragSoldier = { m: ic.m, x0: MS.x, y0: MS.y, moved: false, add }; return true; }
  selectSquad(c.sq, add); state.picked = null;
  return true;
}

// ---- Fog of war: the enemy is drawn only while the tank, or a friend in radio reach, sees it -----------
/** Marks each raider seen or not: in sight and line of sight of the tank or of a friend inside the radio ring; a shot gives it away for a moment. */
function updateFog() {
  const tk = state.tank, R = tankStats().radio;
  const eyes = state.ents.filter(f => f.alive && f.team === 0 && !f.inside && (f === tk || heardAt(f)));
  for (const e of state.ents) {
    if (e.team !== 1 || !e.alive) continue;
    if (!tune.fog) { e.seen = true; continue; }
    let s = state.t - (e.firedT || -99) < tune.fog_shot_reveal && tk.alive && dist2(e, tk) < (R + 25) ** 2;
    for (let k = 0; k < eyes.length && !s; k++) {
      const f = eyes[k], r = sightOf(f);
      if (dist2(f, e) <= r * r && canSee(f, e)) s = true;
    }
    e.seen = s || state.t < (e.pingT || 0); // a radar pulse shows them for a while
  }
}
/**
 * The fog drawn on the map: which 2x2 cells the tank and the friends in radio reach see. Rays go out
 * from each one's eyes; a cell is seen while no voxel column (hill, wall, tree) on the way rises above
 * the line to it. world.vis eases toward it so the edge of the fog moves softly.
 */
function updateVision() {
  const N = world.N, G = Math.ceil(N / 2), tk = state.tank, R = tankStats().radio;
  if (!world.vis || world.vis.length !== G * G) { world.vis = new Float32Array(G * G); world.visT = new Uint8Array(G * G); world.visG = G; }
  const T = world.visT; T.fill(tune.fog ? 0 : 1);
  if (tune.fog) {
    const eyes = state.ents.filter(f => f.alive && f.team === 0 && !f.inside && (f === tk || heardAt(f)));
    for (const f of eyes) {
      const r = Math.round(sightOf(f));
      const ey = (f === tk ? tk.vy : f.y) + eyeH(f), nr = Math.ceil(Math.PI * 2 * r / 1.3);
      const fx = Math.floor(f.x), fz = Math.floor(f.z); if (inMap(fx, fz)) T[(fx >> 1) + G * (fz >> 1)] = 1;
      for (let a = 0; a < nr; a++) {
        const dx = Math.sin(a / nr * Math.PI * 2), dz = Math.cos(a / nr * Math.PI * 2); let maxA = -1e9;
        for (let s = 1; s <= r; s++) {
          const ix = Math.floor(f.x + dx * s), iz = Math.floor(f.z + dz * s); if (!inMap(ix, iz)) break;
          const h = world.hmap[ix + N * iz], ang = (h - ey) / s;
          if (ang >= maxA - 0.05) T[(ix >> 1) + G * (iz >> 1)] = 1;
          if (ang > maxA) maxA = ang;
        }
      }
    }
  }
  exploreUpdate(T, G);
  const V = world.vis; for (let i = 0; i < V.length; i++) V[i] += (T[i] - V[i]) * 0.6;
  world.visN = (world.visN || 0) + 1;
}
/** True for a living raider the player cannot see now (the fog hides it). */
function hiddenFoe(e) { return e.team === 1 && e.alive && !!tune.fog && !e.seen; }

// ---- The order menu: right-click shows the orders that fit what is under the mouse ---------------------
/** Menu layout, shared by the drawing and the mouse. */
const MENU = { w: 250, row: 26, head: 26, pad: 6 };
/** Every order the selected squads can take at the clicked point (an enemy, a building, the own vehicle, open ground). */
function menuItems(g, append) {
  const sel = selectedSquads(), tk = state.tank, p = g.p, items = [];
  if (append) { // a stop on the drawn path: how to get there
    const n = Math.max(1, ...sel.map(sq => sq.order.t === 'move' && !sq.order.done && sq.order.pts ? sq.order.pts.length - (sq.order.i || 0) + 1 : 1));
    items.push({ key: 'V', label: 'Tappa ' + n + ': vai', act: () => issueOrder('move', true, p, g.face) });
    if (sel.some(sq => alive(sq).some(m => !m.veh))) items.push({ key: 'C', label: 'Tappa ' + n + ': al riparo', col: '#b9f59a', act: () => issueOrder('cover', true, p, g.face) });
    items.push({ key: 'F', label: 'Tappa ' + n + ': avanza all\'attacco', col: '#ff8a6a', act: () => issueOrder('attack', true, p, g.face, null) });
    return items;
  }
  const ms = sel.flatMap(sq => alive(sq)), inf = ms.some(m => !m.veh && m.kind !== 'at'), riders = ms.some(m => canRide(m) && !m.inside);
  const onTank = Math.hypot(p.x - tk.x, p.z - tk.z) < tk.rad + 0.9;
  const b = inf && !onTank && !g.tgt ? buildingAt(p.x, p.z) : null;
  const all = f => () => { let any = false; for (const sq of sel) { if (inRadio(sq)) { f(sq); any = true; } else say(sq.name, 'Fuori portata radio: non vi sentiamo.', '#e0a070'); } if (any) sfx('radio'); };
  if (g.tgt) items.push({ key: 'F', label: 'Attacca: ' + UT[g.tgt.kind].name.toLowerCase(), col: '#ff8a6a', act: () => issueOrder('attack', false, p, g.face, g.tgt) });
  if (onTank) {
    items.push({ key: 'G', label: 'Seguimi', act: all(orderFollow) });
    if (riders && tankStats().seats > 0) items.push({ key: 'B', label: 'Sali a bordo (' + Math.max(0, seatsFree()) + ' posti)', act: () => { let any = false; for (const sq of sel) if (inRadio(sq)) any = orderBoard(sq) || any; if (any) sfx('radio'); } });
  }
  if (b) {
    if (!b.ruined && buildingWalls(b) < b.walls0 * tune.garrison_ruin) b.ruined = true;
    items.push(b.ruined ? { key: 'E', label: 'Edificio crollato', off: true } : { key: 'E', label: 'Entra nell\'edificio (' + b.occ.length + '/' + b.cap + ')', col: '#b9f59a', act: () => issueOrder(null, false, p, null, null) });
  }
  if (!onTank) {
    items.push({ key: 'V', label: g.tgt ? 'Vai lì (senza attaccare)' : 'Vai qui', act: () => issueOrder('move', false, p, g.face) });
    if (inf) items.push({ key: 'C', label: 'Al riparo qui', col: '#b9f59a', act: () => issueOrder('cover', false, p, g.face) });
    if (!g.tgt) items.push({ key: 'F', label: 'Avanza all\'attacco', col: '#ff8a6a', act: () => issueOrder('attack', false, p, g.face, null) });
    if (inf) items.push({ key: 'R', label: 'Imboscata qui', act: () => issueOrder('ambush', false, p, g.face) });
    if (sel.some(sq => sq.order.t === 'move' && !sq.order.done)) items.push({ key: 'T', label: 'Aggiungi tappa al percorso', act: () => issueOrder('move', true, p, g.face) });
    items.push({ key: 'G', label: 'Seguimi', act: all(orderFollow) });
  }
  items.push({ key: 'Z', label: 'Fermi dove siete', act: all(orderHold) });
  { const cur = postureOf(sel[0]), nx = POSTURES[(POSTURES.findIndex(q => q.k === cur.k) + 1) % POSTURES.length];
    items.push({ key: 'Q', label: 'Atteggiamento: ' + cur.name + ' → ' + nx.name, col: nx.col, act: () => { for (const sq of sel) setPosture(sq, nx.k); } }); }
  if (ms.some(m => m.garrison)) items.push({ key: 'X', label: 'Esci dall\'edificio', act: all(sq => { leaveBuilding(sq); sq.order = { t: 'hold' }; say(sq.name, 'Usciamo!'); }) });
  if (ms.some(m => m.inside)) items.push({ key: 'B', label: 'Scendi dal mezzo', act: () => unloadSelected() });
  return items;
}
/** Opens the menu at the mouse for the order gesture g (its point, its dragged bearing, its enemy). */
function openMenu(g, append) {
  const items = menuItems(g, append); if (!items.length) return;
  const h = MENU.head + items.length * MENU.row + MENU.pad;
  const x = Math.min(MS.x + 6, W - MENU.w - 8), y = Math.max(8, Math.min(MS.y + 6, H - h - 8));
  const n = selectedSquads().length;
  state.menu = { x, y, h, items, p: g.p, face: g.face, title: (append ? 'Percorso · ' : '') + (n > 1 ? n + ' squadre' : selectedSquads()[0].name) };
}
/** Which menu row is under the mouse (-1: none). */
function menuHover() {
  const m = state.menu; if (!m) return -1;
  if (MS.x < m.x || MS.x > m.x + MENU.w || MS.y < m.y + MENU.head) return -1;
  const k = Math.floor((MS.y - m.y - MENU.head) / MENU.row); return k >= 0 && k < m.items.length ? k : -1;
}
/** The menu's input: a click on a row or its letter sends the order; Esc or a click outside closes it. */
function menuInput() {
  const m = state.menu; let pick = null;
  for (const it of m.items) if (!it.off && it.act && pressed('Key' + it.key)) { pick = it; break; }
  if (!pick && MS.lp) {
    const k = menuHover(); MS.lp = false; MS.drag = null; state.menuBlock = true; // this click is the menu's, not the cannon's
    if (k < 0) { if (!(MS.x >= m.x && MS.x <= m.x + MENU.w && MS.y >= m.y && MS.y <= m.y + m.h)) state.menu = null; return; }
    pick = m.items[k];
  }
  if (MS.lr) MS.lr = false;
  if (pressed('Escape')) { state.menu = null; return; }
  if (pick && !pick.off && pick.act) { state.menu = null; pick.act(); }
}
/** The order the next click gives, armed with a hotkey (V, F, C). */
const ARM = { move: 'VAI', attack: 'ATTACCA', cover: 'COPERTURA', ambush: 'IMBOSCATA' };
/** WASD (or the arrows) slide the view over the map, at a speed that follows the zoom. */
function panCamera(dt) {
  const ax = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
  const az = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0) - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
  const v = tune.pause_pan * cam.dist / 84 * dt, sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  cam.x += (cy * ax - sy * az) * v; cam.z += (-sy * ax - cy * az) * v;
  cam.x = Math.max(0, Math.min(world.N, cam.x)); cam.z = Math.max(0, Math.min(world.N, cam.z));
  cam.y += (Math.min(40, hAt(cam.x, cam.z)) - cam.y) * Math.min(1, dt * 3);
}
/**
 * Space or Tab: the tactical pause, the one place orders are given. Time stops; the squads are
 * picked and told what to do, the view moves with WASD; the orders start the moment play resumes.
 */
function setTacticalPause(on) {
  state.tpause = on; state.mode = on ? 'cmd' : 'tank'; state.arm = null; MS.drag = null; state.gest = null;
  if (!on) { state.menu = null; state.dragSoldier = null; }
  const before = state.pauseOrders || new Map(), n = on ? 0 : state.squads.filter(sq => before.has(sq) && before.get(sq) !== sq.order).length;
  state.pauseOrders = on ? new Map(state.squads.map(sq => [sq, sq.order])) : null; // to tell at the resume who got new orders
  say('Radio', on ? 'Pausa tattica: scegli le squadre e dai gli ordini; partono quando riprendi (Spazio o Tab).' : n ? 'Ordini ricevuti, si parte!' : 'Si riprende.', '#ffd27a');
}
function enemyUnderMouse() {
  let best = null, bd = 26 * 26;
  for (const e of state.ents) {
    if (!e.alive || e.team !== 1 || hiddenFoe(e)) continue;
    const p = toScreen(e.x, e.y + 1, e.z); if (!p.on) continue;
    const d = (p.x - MS.x) ** 2 + (p.y - MS.y) ** 2; if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function friendlyUnderMouse() {
  let best = null, bd = 24 * 24;
  for (const e of state.ents) {
    if (!e.alive || !e.squad || e.inside) continue;
    const p = toScreen(e.x, e.y + 1, e.z); if (!p.on) continue;
    const d = (p.x - MS.x) ** 2 + (p.y - MS.y) ** 2; if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function selectSquad(sq, add) {
  if (!add) for (const s of state.squads) s.selected = false;
  if (!sq) return;
  if (!alive(sq).length) { say('Radio', sq.name + ': nessuno risponde.', '#e0a070'); return; }
  if (!inRadio(sq)) { say(sq.name, 'Fuori portata radio.', '#e0a070'); sq.selected = false; return; }
  sq.selected = true; sfx('radio');
}

// ---- The play step ----------------------------------------------------------------------------------
/** One fixed step of play. */
function stepPlay(dt) {
  if (pressed('Space') && state.tank.alive) setTacticalPause(!state.tpause);
  if (state.tpause) { // frozen: only orders and the camera move
    if (R3.ready) state.mouse3 = pickWorld(MS.x, MS.y);
    handleInput();
    if (!state.rename) panCamera(dt);
    MS.lp = MS.rp = MS.lr = MS.rr = false; MS.wheel = 0;
    return;
  }
  state.t += dt; state.stepN++; state.snd = 0;
  if (R3.ready) state.mouse3 = pickWorld(MS.x, MS.y);
  handleInput();
  updateTank(dt);
  for (const sq of state.squads) { squadUpkeep(sq, dt); for (const m of sq.members) if (m) m.selected = sq.selected; }
  updateUnits(dt);
  updateProjectiles(dt);
  updateEffects(dt);
  updateRun(dt);
  const tk = state.tank, aim = state.mode === 'tank' && state.mouse3 ? state.mouse3 : null;
  let lx = 0, lz = 0;
  if (aim) { lx = (aim.x - tk.x) * 0.22; lz = (aim.z - tk.z) * 0.22; const L = Math.hypot(lx, lz); if (L > 12) { lx *= 12 / L; lz *= 12 / L; } }
  const k = Math.min(1, dt * 4);
  if (state.mode === 'cmd') { if (!state.rename) panCamera(dt); } // command mode: the view is the player's to move
  else { cam.x += (tk.x + lx - cam.x) * k; cam.z += (tk.z + lz - cam.z) * k; cam.y += (tk.vy - cam.y) * k; }
  cam.shake *= 0.9;
  MS.lp = MS.rp = MS.lr = MS.rr = false; MS.wheel = 0;
}
function handleInput() {
  const tk = state.tank;
  if (!MS.l) state.menuBlock = false;
  if (state.rename) { MS.lp = MS.rp = false; return; } // typing a squad's name: keys go to the name
  if (pressed('F1')) state.help = !state.help;
  if (cardInput()) return;
  if (state.menu) { // the order menu takes the mouse and the order keys till it closes
    if (MS.rp || !tk.alive) state.menu = null; // a new right-click: a new order (and a new menu)
    else { menuInput(); return; }
  }
  if (pressed('Tab') && tk.alive && !state.rename) setTacticalPause(!state.tpause); // Tab works as Space
  if (pressed('KeyQ')) cam.yawT -= Math.PI / 2;
  if (pressed('KeyE') && !state.canShop) cam.yawT += Math.PI / 2;
  if (MS.wheel) cam.dist = Math.max(tune.cam_dist_min, Math.min(tune.cam_dist_max, cam.dist * (MS.wheel > 0 ? 1.1 : 0.9)));
  // the left hand: 1-6 pick a squad (Shift adds), Alt+1-6 puts the chosen soldiers in that squad, the key left of 1 picks them all
  const alt = down.has('AltLeft') || down.has('AltRight');
  if (state.tpause) { // squads are picked and ordered only in the tactical pause
    for (let i = 0; i < 6; i++) if (pressed('Digit' + (i + 1))) { if (alt) regroupTo(i); else { selectSquad(state.squads[i], down.has('ShiftLeft') || down.has('ShiftRight')); state.picked = null; } }
    if (pressed('Backquote') || pressed('IntlBackslash')) { for (const s of state.squads) s.selected = alive(s).length > 0; state.picked = null; }
    if (pressed('KeyG')) for (const sq of selectedSquads()) { if (inRadio(sq)) orderFollow(sq); else say(sq.name, 'Fuori portata radio.', '#e0a070'); }
    if (pressed('KeyZ')) for (const sq of selectedSquads()) { if (inRadio(sq)) orderHold(sq); else say(sq.name, 'Fuori portata radio.', '#e0a070'); }
    if (pressed('KeyB')) boardOrUnload();
  }
  if (pressed('F2')) { state.dev = !state.dev; say('Radio', state.dev ? 'Pannello sviluppo aperto (F2). K: nemico sotto il mouse.' : 'Pannello sviluppo chiuso.', '#c8a0ff'); }
  if (state.dev) devInput();
  if (!tk.alive) return;
  const cmd = state.mode === 'cmd' || state.tpause, shift = down.has('ShiftLeft') || down.has('ShiftRight');
  if (cmd) {
    if (pressed('KeyV')) state.arm = state.arm === 'move' ? null : 'move';
    if (pressed('KeyF')) state.arm = state.arm === 'attack' ? null : 'attack';
    if (pressed('KeyC')) state.arm = state.arm === 'cover' ? null : 'cover';
    if (pressed('KeyR')) state.arm = state.arm === 'ambush' ? null : 'ambush';
    // the keyboard's Menu key opens the order menu at the mouse, like a right-click
    if (pressed('ContextMenu') && state.mouse3 && selectedSquads().length) openMenu({ p: { x: state.mouse3.x, y: state.mouse3.y, z: state.mouse3.z }, face: null, tgt: enemyUnderMouse(), kind: null });
  } else state.arm = null;
  // the order gesture: press on the ground (right button, or left with an armed order), drag the
  // arrow for the bearing to hold, let go to send it
  if (cmd && state.mouse3 && (MS.rp || (state.arm && MS.lp))) {
    state.gest = { btn: MS.rp ? 'r' : 'l', sx: MS.x, sy: MS.y, p: { x: state.mouse3.x, y: state.mouse3.y, z: state.mouse3.z }, tgt: enemyUnderMouse(),
      kind: state.arm || (down.has('KeyF') ? 'attack' : null), face: null };
    if (state.gest.btn === 'l') { MS.lp = false; MS.drag = null; }
  }
  if (state.gest) {
    const g = state.gest;
    g.face = Math.hypot(MS.x - g.sx, MS.y - g.sy) > 14 && state.mouse3 ? Math.atan2(state.mouse3.x - g.p.x, state.mouse3.z - g.p.z) : null;
    if (g.btn === 'r' ? (MS.rr || !MS.r) : (MS.lr || !MS.l)) {
      // a plain right-click with squads selected opens the menu of orders; Shift or an armed order sends at once
      if (g.btn === 'r' && !g.kind && tune.context_menu && selectedSquads().length) openMenu(g, shift); // Shift: the menu of a path stop
      else if (issueOrder(g.kind, shift, g.p, g.face, g.face == null || g.kind === 'attack' ? g.tgt : null) && state.arm && !shift) state.arm = null;
      state.gest = null; if (g.btn === 'l') MS.lr = false;
    }
  }
  if (cmd) {
    if (MS.lp) MS.drag = { x: MS.x, y: MS.y };
    if (MS.lr && MS.drag) {
      const d = MS.drag; MS.drag = null;
      const add = down.has('ShiftLeft') || down.has('ShiftRight');
      if (Math.abs(MS.x - d.x) < 6 && Math.abs(MS.y - d.y) < 6) {
        const f = friendlyUnderMouse(); selectSquad(f ? f.squad : null, add);
        // the soldier clicked is picked too (for Alt+1-6); Shift adds to the picked
        if (!f) state.picked = null; else { if (!add || !state.picked) state.picked = new Set(); state.picked.add(f); }
      }
      else {
        if (!add) for (const s of state.squads) s.selected = false;
        const x0 = Math.min(d.x, MS.x), x1 = Math.max(d.x, MS.x), y0 = Math.min(d.y, MS.y), y1 = Math.max(d.y, MS.y);
        if (!add || !state.picked) state.picked = new Set();
        for (const sq of state.squads) for (const m of alive(sq)) { const p = toScreen(m.x, m.y + 1, m.z); if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) { selectSquad(sq, true); state.picked.add(m); } }
      }
    }
  } else MS.drag = null;
}

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

// ---- Units: think, move, fire ---------------------------------------------------------------------------
function updateUnits(dt) {
  const tk = state.tank;
  state.fogT = (state.fogT || 0) - dt; if (state.fogT <= 0) { state.fogT = 0.2; updateFog(); updateVision(); radarUpdate(0.2); }
  state.bldT = (state.bldT || 0) - dt; if (state.bldT <= 0) { state.bldT = 1; checkBuildings(); }
  for (const e of state.ents) {
    if (!e.alive) { if (!e.gone && state.t - e.deathT > (e.veh ? 40 : 9)) e.gone = true; continue; }
    if (e.kind === 'tank' || UT[e.kind].inert) continue; // (a depot only stands there)
    if (e.inside) { e.x = tk.x; e.z = tk.z; e.y = e.vy = tk.y; e.moving = false; continue; } // riding
    const g = e.group;
    if (g && !g.alert && dist2(e, tk) > 90 * 90) continue; // far and calm: asleep
    e.think -= dt; e.cool -= dt; e.recoil = Math.max(0, (e.recoil || 0) - dt * 3);
    const w = weapon(UT[e.kind].w);
    if (e.think <= 0) {
      e.think = 0.35 + rng() * 0.15;
      e.target = pickTarget(e, w);
      e.cover = e.veh ? 0 : e.target ? coverFrom(e, e.target.x, e.target.z) : coverAround(e);
      e.inCover = e.cover > 0;
      if (e.team === 1) raiderThink(e, w);
      if (!e.veh && !e.fixed && !e.garrison && !e.moving && raised(e) && state.t - (e.strandT || -99) > 2) unstrand(e);
    }
    if (e.garrison) { e.path = null; e.moving = false; e.y = e.vy = e.garrison.g; } // inside a building, at a window
    else {
      moveAlong(e, dt);
      e.y = hAt(e.x, e.z);
      if (e.y >= 99) e.y = 0;
      e.vy += (e.y - e.vy) * Math.min(1, dt * 12);
      if (deepWater(e.x, e.z)) { dmgTo(e, 999, 'drown', null); continue; }
      if (e.veh && e.team === 0 && e.moving) crushUnder(e, unitSpeed(e));
    }
    if (e.veh) { e.turretYaw += angDiff(e.prevHd ?? e.heading, e.heading); e.prevHd = e.heading; tiltVehicle(e, dt); } // the turret turns with the hull, the hull tilts with the ground
    const t = e.target;
    if (t && t.alive) {
      const want = angTo(e, t);
      if (e.veh) {
        e.turretYaw = turnToward(e.turretYaw, want, (e.kind === 'boss' ? tune.boss_turret_speed : e.kind === 'ltank' ? 70 : (ENEMY[e.kind] && ENEMY[e.kind].turret) || 160) * Math.PI / 180 * dt);
        // a still hull turns its front to the enemy unless it was told which way to face
        if (!e.moving && e.face == null) e.heading = turnToward(e.heading, want, hullTurn(e) * Math.PI / 180 * dt);
      } else if (!e.moving) e.heading = turnToward(e.heading, want, (w.turn ? w.turn * Math.PI / 180 : 8) * dt);
      let aligned = !e.veh || Math.abs(angDiff(e.turretYaw, want)) < (e.kind === 'boss' ? 0.05 : 0.2);
      if (w.arc && Math.abs(angDiff(e.heading, want)) > w.arc * Math.PI / 180) aligned = false; // outside the arc: swing first
      if (w.kind === 'ap' && e.moving) aligned = false;
      if (e.kind === 'sniper' && e.moving) aligned = false; // a sniper shoots from a position, never on the move
      if (lurking(e)) { // an ambush: hold fire till they walk into it (or someone is hit)
        if (dist2(e, t) <= (w.range * tune.ambush_trigger) ** 2 || state.t - (e.shotT || -99) < 1) springAmbush(e.squad); else aligned = false;
      }
      if (e.kind === 'at' && !e.revealed && dist2(e, t) > (w.range * tune.at_ambush) ** 2) aligned = false; // the gun waits for a sure shot
      if (!e.team && e.squad) { // the squad's posture decides whether it opens fire
        const ps = posture(e), hit = state.t - (e.squad.attackedT || -99) < tune.posture_memory;
        if (ps === 'hold' || (ps === 'return' && !hit) || (ps === 'stealth' && !hit && dist2(e, t) > (w.range * tune.stealth_trigger) ** 2)) aligned = false;
      }
      if (e.cool <= 0 && aligned && (!e.moving || e.veh || w.kind === 'bullet' || w.move)) { fire(e, t, w); e.revealed = true; e.cool = w.rate * (0.85 + rng() * 0.3) * (e.team ? 1 : (1 - (e.rank || 0) * tune.rank_rate) * modOf(e).rate); }
    } else if (!e.moving) {
      if (e.face != null) e.heading = turnToward(e.heading, e.face, (e.veh ? hullTurn(e) * Math.PI / 180 : w && w.turn ? w.turn * Math.PI / 180 : 6) * dt);
      if (e.veh) e.turretYaw = turnToward(e.turretYaw, e.heading, tune.turret_return * dt);
    }
    if (e.kind === 'medic' || e.kind === 'eng') roleSkill(e, dt);
  }
  // soldiers keep a little space between them
  const inf = state.ents.filter(e => e.alive && !e.veh && !e.fixed && !e.inside);
  for (let i = 0; i < inf.length; i++) for (let j = i + 1; j < inf.length; j++) {
    const a = inf[i], b = inf[j], dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz;
    if (d2 > 0.0001 && d2 < 0.64) { const d = Math.sqrt(d2), p = (0.8 - d) * 0.25; nudge(a, -dx / d * p, -dz / d * p); nudge(b, dx / d * p, dz / d * p); }
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
  const h = (lx, lz) => hAt(e.x + c * lx + s * lz, e.z - s * lx + c * lz);
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
function moveAlong(e, dt) {
  if (!e.path || e.pi >= e.path.length) { e.moving = false; return; }
  const wp = e.path[e.pi], dx = wp.x - e.x, dz = wp.z - e.z, d = Math.hypot(dx, dz);
  let sp = unitSpeed(e) * (shallow(e.x, e.z) ? 0.55 : 1);
  if (e.veh) {
    let want = Math.atan2(dx, dz);
    // told which way to face and the way runs the other way: back up, front to the enemy
    if (e.moveFace != null && Math.abs(angDiff(e.moveFace, want)) > 1.9) { want += Math.PI; sp *= 0.55; }
    e.heading = turnToward(e.heading, want, (e.kind === 'boss' ? 45 : Math.max(60, hullTurn(e) * 1.4)) * Math.PI / 180 * dt);
    if (Math.abs(angDiff(e.heading, want)) > 0.8) sp *= 0.15;
  } else if (d > 0.01) e.heading = turnToward(e.heading, Math.atan2(dx, dz), 10 * dt);
  const before = d;
  if (d <= sp * dt) { e.x = wp.x; e.z = wp.z; e.pi++; }
  else if (!e.veh && e.pi < e.path.length - 1 && d < 0.6) e.pi++; /* a node others crowd is close enough: walk on */ else { e.x += dx / d * sp * dt; e.z += dz / d * sp * dt; }
  e.moving = true;
  // no headway for a while (pushed, blocked): think again about the way
  const now = Math.hypot(wp.x - e.x, wp.z - e.z);
  e.stuckT = Math.max(0, (e.stuckT || 0) + (before - now < sp * dt * 0.25 && e.pi < e.path.length ? dt : -dt * 2));
  if (e.stuckT > tune.unstick_time && e.dest) { const d0 = e.dest; e.stuckT = 0; setDest(e, d0.x + (rng() - 0.5) * 1.5, d0.z + (rng() - 0.5) * 1.5); }
}
/** The best enemy this unit can shoot now: its ordered target first, then the nearest it can see. */
function pickTarget(e, w) {
  const sight = (e.team ? tune.raider_sight * (w.sight || 1) : e.kind === 'sniper' ? tune.sniper_sight : tune.sight_range) + (e.rank || 0) * 2;
  const R = w.indirect ? w.range : Math.min(w.range, sight + (e.veh ? 6 : 0));
  if (e.pref && e.pref.alive && dist2(e, e.pref) <= R * R && (w.indirect ? seenByTeam(e.pref, e.team) : canSee(e, e.pref))) return e.pref;
  const c = [];
  for (const o of state.ents) {
    if (!o.alive || o.team === e.team || o.inside) continue;
    if (w.noVeh && o.veh) continue; // dogs bite men, not hulls
    const d = dist2(e, o); if (d > R * R) continue;
    if (e.team === 1 && (lurking(o) || stealthy(o)) && d > tune.ambush_reveal ** 2) continue; // an ambush, or a stealthy soldier, still unseen
    if (w.min && d < w.min * w.min) continue;
    c.push([d, o]);
  }
  if (w.kind === 'ap' || w.kind === 'rpg') for (const it of c) if (it[1].veh) it[0] *= 0.15; // anti-tank guns and rockets hunt vehicles first
  c.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < Math.min(4, c.length); i++) {
    const o = c[i][1];
    if (w.indirect ? seenByTeam(o, e.team) : canSee(e, o)) return o;
  }
  return null;
}
/** True when any unit of the team can see the target (the mortar fires on what others spot). */
function seenByTeam(o, team) {
  for (const f of state.ents) if (f.alive && !f.inside && f.team === team && f.kind !== 'mortar' && dist2(f, o) < tune.sight_range ** 2 && canSee(f, o)) return true;
  return false;
}
function raiderThink(e, w) {
  const g = e.group;
  if (g.kind === 'hunt') { // sent after the tank, or at the army's camp in the last stand
    const tk = state.tank, t = g.base && !(tk.alive && dist2(e, tk) < 40 * 40) ? g.base : tk;
    g.alert = true; g.seenT = state.t; g.known = { x: t.x, z: t.z };
  }
  if (e.target) alertGroup(g, e.target);
  if (!g.alert && ENEMY[e.kind]) enemySpot(e, g); // short reach: it raises the alarm on sight
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
  if (ENEMY[e.kind] && enemyThink(e, w, g)) return; // enemies.js: each special kind's way
  if (!e.veh && raiderTactics(e, w)) return;
  if (tune.smart_raiders && !e.veh && raiderRole(e, w)) return; // tactics.js: pin, flank, buildings, retreat
  if (tune.smart_raiders && e.kind === 'technical' && circleTarget(e)) return; // technicals circle, firing on the move
  if (e.target && !e.veh) { e.path = null; return; }
  if (e.target && e.veh && dist2(e, e.target) < 16 * 16) { e.path = null; return; }
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
  const v = nearestFriendVeh(e, Math.max(tune.raider_flee + 14, e.kind === 'r_rpg' ? tune.rpg_range * 1.7 : 0));
  // 1. out of the way of a hull bearing down
  const reach = v ? tune.raider_flee + Math.abs(v.kind === 'tank' ? v.speed : 3) * 1.2 : 0; // a fast hull is seen coming from further
  if (v && dist2(v, e) < reach * reach && bearingDown(v, e)) {
    const h = v.heading, rx = Math.cos(h), rz = -Math.sin(h), side = ((e.x - v.x) * rx + (e.z - v.z) * rz) >= 0 ? 1 : -1;
    const p = openSpot(e.x + rx * side * 7 - Math.sin(h) * 2, e.z + rz * side * 7 - Math.cos(h) * 2) || openSpot(e.x - rx * side * 7, e.z - rz * side * 7);
    if (p) { setDest(e, p.x, p.z); e.fleeT = state.t; e.coverT = 0; return true; }
  }
  // 2. rockets: to the vehicle's side or back, then fire
  if (e.kind === 'r_rpg' && v) {
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
function fire(e, t, w) {
  e.firedT = state.t;
  const yaw = e.veh ? e.turretYaw : e.heading, off = e.veh ? 1.6 : 0.6;
  const mx = e.x + Math.sin(yaw) * off, mz = e.z + Math.cos(yaw) * off, my = e.y + eyeH(e) - 0.2;
  e.recoil = 1;
  if (w.special) { w.special(e, t, w); return; } // enemies.js: bombs, bites, flames, molotovs, the big gun
  if (w.kind === 'bullet') {
    const d = Math.sqrt(dist2(e, t));
    let acc = w.acc * Math.max(0.35, Math.min(1, 1.25 - d / w.range * 0.6));
    if (e.moving) acc *= 0.5;
    if (t.moving) acc *= 0.8;
    if (!e.team) acc = Math.min(0.97, acc * rankK(e, 'rank_acc') * modOf(e).acc);
    if (suppressed(e)) acc *= tune.suppress_acc;
    if (e.squad && e.squad.order.sprungT != null && state.t - e.squad.order.sprungT < 4) acc = Math.min(0.97, acc * tune.ambush_bonus);
    const cover = t.veh ? 0 : coverFrom(t, e.x, e.z);
    if (cover === 2) acc *= tune.cover_factor; else if (cover === 1) acc *= tune.cover_light;
    if (cover) acc *= modOf(t).coverK;
    if (t.veh) acc = Math.min(1, acc * 1.7);
    const col = e.team ? [1, 0.45, 0.25] : [1, 0.88, 0.45];
    if (rng() < acc) {
      tracer(mx, my, mz, t.x, t.y + chestH(t) - 0.2, t.z, col);
      dmgTo(t, w.dmg, w.heavy ? 'heavy' : 'bullet', e);
    } else {
      tracer(mx, my, mz, t.x + (rng() - 0.5) * 3, t.y + 0.4 + rng(), t.z + (rng() - 0.5) * 3, col);
      if (cover && rng() < tune.cover_chip * (w.chip || 1)) chipCover(t, e);
    }
    // machine guns pin infantry down: slower, worse aim for a while
    if (w.chip && !t.veh && t.alive) { if (!suppressed(t) && t.team === 1) floatText(t.x, t.y + 2.4, t.z, 'soppresso', '#9fd8ff'); t.supT = state.t + tune.suppress_time * modOf(e).sup; }
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
    const go = e.kind === 'boss' ? 6.2 : 3.4, gx = e.x + Math.sin(e.turretYaw) * go, gz = e.z + Math.cos(e.turretYaw) * go, gy = e.y + (e.kind === 'boss' ? 2.4 : 1.75);
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
    if (SOFTV.has(v)) { setV(x, y, z, 0); recomputeColumn(x, z); spawnDebris([x, y, z, v], x + 0.5, y + 0.5, z + 0.5, 1); return; }
  }
}

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
  if (e.veh && (kind === 'bullet' || kind === 'heavy')) amt *= HEAVY.has(e.kind) ? (kind === 'heavy' ? 0.3 : tune.small_arms_vs_tank) : (kind === 'heavy' ? 0.8 : 0.4);
  if (e.veh && kind !== 'crush' && kind !== 'drown') {
    const side = armorSide(e, hit, src);
    amt *= tune['armor_' + side];
    if (e.kind === 'tank') amt *= tankModDmg(side, kind, src) * platesTake(side, kind, amt); // modules.js: the plates on that side
    if (kind !== 'bullet' && kind !== 'heavy') {
      e.lastHit = { side, t: state.t };
      if (e.kind === 'tank' || (src && src.team === 0)) floatText(e.x, e.y + 3.4, e.z, SIDE_NAME[side] + ' x' + tune['armor_' + side].toFixed(1), side === 'front' ? '#c8c8c8' : side === 'side' ? '#ffd36a' : '#ff8a4a');
    }
  }
  if (e.kind === 'tank' && kind !== 'bullet' && kind !== 'heavy') amt *= 1 - Math.min(0.9, tankStats().armor);
  if (e.kind === 'tank') amt *= tankStats().hullArmor;
  if (e.kind === 'boss' && kind === 'blast') amt *= 0.8;
  if (e.team === 0 && !e.veh) amt *= modOf(e).taken;
  if (e.kind === 'tank') { state.hurtT = state.t; cam.shake = Math.max(cam.shake, tune.shake * Math.min(1.6, amt / 30)); }
  e.hp -= amt;
  if (src) { e.shotBy = src; e.shotT = state.t; e.revealed = true; if (!e.team && e.squad) e.squad.attackedT = state.t; }
  if (lurking(e)) springAmbush(e.squad);
  if (e.team === 1 && src && src.team === 0) { alertGroup(e.group, src); giveXp(src, tune.xp_hit); }
  if (e.team === 0 && e.squad && src && src.team === 1 && state.t - (e.squad.fireMsgT || -99) > 12) { e.squad.fireMsgT = state.t; say(e.squad.name, 'Siamo sotto fuoco!', '#ff9a7a'); }
  if (e.hp <= 0 && !medicSave(e, kind)) kill(e, src, kind);
}
function kill(e, src, kind) {
  e.alive = false; e.hp = 0; e.deathT = state.t; e.path = null; e.moving = false; e.selected = false;
  if (ENEMY[e.kind]) enemyOnKill(e); // a bomber's charge, a fuel depot going up
  if (e.veh) {
    blastFx(e.x, e.y + 1.2, e.z, 2.2);
    for (let i = 0; i < 6; i++) state.fx.push({ kind: 'smoke', x: e.x + (rng() - 0.5) * 2, y: e.y + 2, z: e.z + (rng() - 0.5) * 2, t: -i * 0.4, life: 3.5, s: 1.4, rise: 7, col: 0x2e2824 });
    sfx('boom', e.x, e.z);
    if (e.team === 1) {
      state.pickups.push({ x: e.x, z: e.z, value: tune.scrap_vehicle, taken: false });
      dropAmmo(e.x + 1.5, e.z + 1, 3, tune.ammo_drop_veh);
      dropLoot(e.x - 1.5, e.z - 1, e.kind === 'boss' ? 1 : tune.loot_technical);
    }
  }
  if (e.team === 1) {
    state.kills++;
    if (e.kind === 'technical') state.techKills = (state.techKills || 0) + 1;
    if (kind === 'crush') state.crushes = (state.crushes || 0) + 1;
    if (src && src.team === 0) giveXp(src, tune.xp_kill * (e.veh ? 3 : 1));
    if (!e.veh) { state.scrap += tune.scrap_infantry; floatText(e.x, e.y + 2.2, e.z, '+' + tune.scrap_infantry, '#ffd36a'); }
    if (e.kind === 'boss' && !e.dev) say('Radio', 'Il Carro del Capo è in fiamme!', '#9fe3a0');
  } else if (e.kind === 'tank') {
    state.result = 'lose'; state.endT = state.t + 3;
    say('Radio', 'Il carro comando è distrutto...', '#ff7a6a');
  } else if (e.squad) {
    const sq = e.squad, i = sq.members.indexOf(e);
    if (i >= 0) sq.members[i] = null;
    say(sq.name, alive(sq).length ? (kind === 'drown' ? 'Uomo in acqua, l\'abbiamo perso!' : 'Uomo a terra!') : 'Squadra annientata.', '#ff7a6a');
    if (!alive(sq).length) sq.selected = false;
  }
}
/** A shell, rocket or mortar round goes off: voxels fly, units in the radius are hurt. */
function explode(p, x, y, z, direct) {
  const removed = blastVoxels(x, y, z, p.blast);
  spawnDebris(removed, x, y, z, 40);
  blastFx(x, y, z, p.blast);
  if (p.fire) fireSplash(x, y, z); // a molotov
  sfx(p.kind === 'rpg' ? 'boomS' : 'boom', x, z);
  const tk = state.tank, d = Math.hypot(x - tk.x, z - tk.z);
  cam.shake = Math.max(cam.shake, tune.shake * Math.max(0, 1 - d / 60) * (p.kind === 'shell' ? 1 : 0.6));
  for (const e of state.ents) {
    if (!e.alive || e.inside) continue;
    if (e === direct) { dmgTo(e, p.dmg * shellK(p, e), p.kind === 'rpg' ? 'rocket' : 'shell', p.owner, { vx: p.vx, vy: p.vy, vz: p.vz, top: p.kind === 'mortar' }); continue; }
    const dx = e.x - x, dy = e.y + 0.9 - y, dz = e.z - z, R = p.blast * 1.8 + (e.veh ? e.rad * 0.6 : 0), dd = Math.hypot(dx, dy, dz);
    if (dd < R) {
      let a = p.dmg * (1 - dd / R) * (e.veh ? (p.kind === 'rpg' ? 0.6 : 0.35) : 1) * shellK(p, e);
      if (p.shell === 'frag' && e.team === 1 && !e.veh) e.supT = state.t + tune.suppress_time * 1.5; // splinters pin them down
      if (p.owner && e.team === p.owner.team) a *= 0.5;
      if (!e.veh && coverFrom(e, x, z) === 2) a *= tune.cover_blast;
      dmgTo(e, a, 'blast', p.owner, { x, z, top: p.kind === 'mortar' });
    }
  }
}
function updateProjectiles(dt) {
  const N = world.N;
  for (let i = state.proj.length - 1; i >= 0; i--) {
    const p = state.proj[i];
    const sp = Math.hypot(p.vx, p.vy, p.vz), n = Math.max(1, Math.ceil(sp * dt / 0.35)), h = dt / n;
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

// ---- The run: pickups, camps, the shop's reach, the end ----------------------------------------------
function updateRun(dt) {
  const tk = state.tank;
  state.achT = (state.achT || 0) - dt; if (state.achT <= 0) { state.achT = 1; checkAch(); }
  if (tk.alive) {
    for (const p of state.pickups) {
      if (p.taken || Math.hypot(p.x - tk.x, p.z - tk.z) > 3.6) continue;
      if (p.ammo || p.loot) { if (takeCrate(p)) p.taken = true; continue; }
      p.taken = true; state.scrap += p.value; floatText(p.x, hAt(p.x, p.z) + 2, p.z, '+' + p.value + ' rottami', '#ffd36a'); sfx('coin');
      if (p.wreck) say('Radio', 'Relitto smontato: ' + p.value + ' rottami.', '#ffd36a');
    }
  }
  for (const g of state.groups) {
    if (g.cleared || g.kind !== 'camp') continue;
    if (g.members.every(m => !m.alive)) {
      g.cleared = true; g.site.cleared = true; state.camps++;
      for (const sq of state.squads) for (const m of alive(sq)) giveXp(m, tune.xp_camp);
      const bonus = Math.round(tune.scrap_camp * g.site.tier);
      dropLoot(g.home.x + 2, g.home.z + 1, tune.loot_camp); dropAmmo(g.home.x - 2, g.home.z - 1, 6, tune.ammo_drop_camp);
      state.scrap += bonus; sfx('coin');
      say('Radio', g.site.name + ' ripulito! +' + bonus + ' rottami. Spendili all\'officina, all\'uscita dal settore.', '#9fe3a0');
      floatText(g.home.x, g.site.g + 4, g.home.z, '+' + bonus + ' rottami', '#ffd36a');
    }
  }
  state.canShop = null; // no garages on the map: the field workshop opens at the exit (campaign.js leaveSector)
  if (state.tut >= 1 && !state.campHint) {
    const c = world.sites.camps.find(c => !c.cleared && Math.hypot(c.x - tk.x, c.z - tk.z) < 48);
    if (c) { state.campHint = true; say('Radio', c.name + ' avvistato: bunker e torretta di legno. Il cannone li apre, le squadre ripuliscono.', '#9fe3a0'); }
  }
  if (typeof campaignUpdate === 'function') campaignUpdate(dt);
  if (state.result && state.t >= state.endT) endRun();
}
/** Checks the achievements one last time and moves to the end screen. */
function endRun() {
  const win = state.result === 'win';
  const sector = state.camp ? state.camp.sector : 1;
  checkAch();
  state.gained = win ? 'L\'Orda è respinta!' : 'Il carro comando è perso · settore ' + sector + '/8';
  state.goScene = win ? 'results' : 'over';
  state.result = null;
}

// ---- The workshop and the barracks ------------------------------------------------------------------
function missingIn(sq) { return sq.slots.map((k, i) => (!sq.members[i] || !sq.members[i].alive) ? k : null).filter(Boolean); }
function reinforceCost(sq) { return missingIn(sq).reduce((a, k) => a + tune[UT[k].cost], 0); }
function reinforce(sq) {
  const miss = missingIn(sq); if (!miss.length) { state.shopMsg = 'Squadra al completo.'; return; }
  const c = reinforceCost(sq); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c;
  const s = state.shopSite;
  sq.slots.forEach((k, i) => {
    if (sq.members[i] && sq.members[i].alive) return;
    const p = spotNear(s.x + 0.5, s.z + 0.5, i); const m = spawn(k, p.x, p.z); m.squad = sq; sq.members[i] = m;
  });
  sq.order = { t: 'follow' };
  state.shopMsg = sq.name + ': rimpiazzi arruolati (' + miss.length + ').'; sfx('coin');
}
function rosterCost(r) { return r.reduce((a, k) => a + tune[UT[k].cost], 0); }
function recruitRoster() {
  const r = state.roster; if (!r.length) { state.shopMsg = 'Aggiungi soldati alla nuova squadra.'; return; }
  if (state.squads.length >= maxSquads()) { state.shopMsg = 'Massimo ' + maxSquads() + ' squadre.'; return; }
  const c = rosterCost(r); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c;
  const s = state.shopSite, sq = addSquad(r, s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = sq.name + ' arruolata.'; state.roster = []; sfx('coin');
}
/** Buys a support vehicle (car or ltank) as a squad of its own. */
function buyVehicle(kind) {
  const cost = tune[UT[kind].cost];
  if (state.squads.length >= maxSquads()) { state.shopMsg = 'Massimo ' + maxSquads() + ' squadre.'; return; }
  if (state.scrap < cost) { state.shopMsg = 'Servono ' + cost + ' rottami.'; return; }
  state.scrap -= cost;
  const s = state.shopSite, sq = addSquad([kind], s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = UT[kind].name + ' pronto.'; sfx('coin');
}
function buyCar() { buyVehicle('car'); }
function repairCost(n) { return Math.ceil(n * tune.repair_cost); }
function repair(all) {
  const tk = state.tank, miss = Math.ceil(tk.maxhp - tk.hp); if (miss <= 0) { state.shopMsg = 'Il carro è integro.'; return; }
  let n = all ? miss : Math.min(miss, 50);
  if (state.scrap < repairCost(n)) n = Math.floor(state.scrap / Math.max(0.01, tune.repair_cost));
  if (n <= 0) { state.shopMsg = 'Non bastano i rottami.'; return; }
  state.scrap -= repairCost(n); tk.hp = Math.min(tk.maxhp, tk.hp + n);
  state.shopMsg = 'Riparati ' + n + ' punti.'; sfx('coin');
}

// ---- Sound ---------------------------------------------------------------------------------------------
let NOISE = null;
function noiseBuf() {
  if (!NOISE && audio) {
    const ac = audio.ac, n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = hash2(i, 7, 9) * 2 - 1;
    NOISE = b;
  }
  return NOISE;
}
function boom(vol, dur, freq) {
  if (!audio || muted || vol <= 0.01) return;
  const ac = audio.ac, t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noiseBuf();
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(50, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(audio.out); src.start(t, (state.stepN % 50) / 100); src.stop(t + dur);
}
function sfx(kind, x, z) {
  if (!audio || muted || !state) return;
  if (state.snd > 8) return; state.snd = (state.snd || 0) + 1;
  const v = x === undefined ? 1 : Math.max(0, 1 - Math.hypot(x - cam.x, z - cam.z) / 110);
  if (v <= 0.02) return;
  switch (kind) {
    case 'cannon': boom(1.0 * v, 1.0, 1600); tone(48, 0.45, 'sine', 0.45 * v); break;
    case 'boom': boom(0.9 * v, 1.3, 900); tone(40, 0.6, 'sine', 0.35 * v); break;
    case 'boomS': boom(0.6 * v, 0.8, 1400); break;
    case 'small': boom(0.22 * v, 0.1, 4200); break;
    case 'sniper': boom(0.4 * v, 0.25, 3000); break;
    case 'mg': boom(0.16 * v, 0.06, 5200); break;
    case 'rpg': boom(0.35 * v, 0.5, 2600); break;
    case 'mortar': boom(0.3 * v, 0.35, 700); tone(220, 0.2, 'sine', 0.2 * v); break;
    case 'crunch': boom(0.35 * v, 0.25, 1200); break;
    case 'radio': tone(1250, 0.05, 'square', 0.08); tone(1650, 0.08, 'square', 0.06); break;
    case 'coin': tone(880, 0.08, 'triangle', 0.18); tone(1320, 0.14, 'triangle', 0.14); break;
  }
}

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
