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
  mortar: { name: 'Mortaio', team: 0, w: 'mortar', cost: 'cost_mortar' },
  car: { name: 'Autoblindo', team: 0, veh: true, rad: 1.6, w: 'autocannon', cost: 'cost_car' },
  r_rifle: { name: 'Predone', team: 1, w: 'r_rifle' },
  r_mg: { name: 'Mitragliere predone', team: 1, w: 'r_mg' },
  r_rpg: { name: 'Razziere', team: 1, w: 'rpg' },
  technical: { name: 'Tecnica', team: 1, veh: true, rad: 1.6, w: 'r_mount' },
  boss: { name: 'Carro del Capo', team: 1, veh: true, rad: 2.8, w: 'boss' },
};
const INF_KINDS = ['rifle', 'sniper', 'mg', 'medic', 'mortar'];
/** A weapon's numbers, read live from config. */
function weapon(k) {
  switch (k) {
    case 'rifle': return { kind: 'bullet', range: tune.rifle_range, dmg: tune.rifle_damage, rate: tune.rifle_rate, acc: tune.rifle_acc };
    case 'sniper': return { kind: 'bullet', range: tune.sniper_range, dmg: tune.sniper_damage, rate: tune.sniper_rate, acc: tune.sniper_acc, snd: 'sniper' };
    case 'mg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate, acc: tune.mg_acc, snd: 'mg', chip: 0.5 };
    case 'pistol': return { kind: 'bullet', range: 14, dmg: 4, rate: 1.4, acc: 0.45 };
    case 'mortar': return { kind: 'mortar', range: tune.mortar_range, min: tune.mortar_min, dmg: tune.mortar_damage, rate: tune.mortar_rate, blast: tune.mortar_blast, indirect: true };
    case 'autocannon': return { kind: 'bullet', heavy: true, range: tune.car_range, dmg: tune.car_damage, rate: tune.car_rate, acc: 0.6, snd: 'mg' };
    case 'r_rifle': return { kind: 'bullet', range: tune.rifle_range * 0.95, dmg: tune.rifle_damage, rate: 1.4, acc: tune.raider_acc };
    case 'r_mg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate * 1.1, acc: tune.raider_acc * 0.7, snd: 'mg', chip: 0.5 };
    case 'rpg': return { kind: 'rpg', range: tune.rpg_range, dmg: tune.rpg_damage, rate: tune.rpg_rate, blast: 1.5 };
    case 'r_mount': return { kind: 'bullet', range: tune.mg_range + 2, dmg: tune.mg_damage, rate: tune.mg_rate * 1.2, acc: tune.raider_acc * 0.75, snd: 'mg', chip: 0.5 };
    case 'boss': return { kind: 'shell', range: 48, dmg: tune.boss_damage, rate: tune.boss_reload, blast: 2.3 };
  }
  return null;
}

// ---- Tank parts (the workshop) --------------------------------------------------------------------
const PARTS = {
  cannon: { label: 'Cannone', opts: [
    { name: '75mm di serie', cost: 0, desc: 'Il cannone di partenza.', mod: {} },
    { name: '75mm rettificato', cost: 150, desc: '+20% danno, ricarica 0.5 s più rapida.', mod: { dmg: 1.2, reload: -0.5 } },
    { name: '105mm da recupero', cost: 280, desc: '+70% danno, scoppio largo, ricarica lenta.', mod: { dmg: 1.7, blast: 1.45, reload: 1.0, spread: 1.15, barrel: 1.45 } },
    { name: 'Lanciagranate a tamburo', cost: 240, desc: 'Ricarica 1.1 s, -35% danno, meno preciso.', mod: { dmg: 0.65, blast: 1.15, reloadSet: 1.1, spread: 1.4, barrel: 0.65 } },
  ] },
  tracks: { label: 'Cingoli', opts: [
    { name: 'Cingoli di serie', cost: 0, desc: 'Lenti ma onesti.', mod: {} },
    { name: 'Cingoli larghi', cost: 120, desc: '+25% rotazione, sale gradini più alti.', mod: { turn: 1.25, climb: 0.5 } },
    { name: 'Cingoli da corsa', cost: 200, desc: '+40% velocità, +15% rotazione.', mod: { speed: 1.4, turn: 1.15 } },
  ] },
  engine: { label: 'Motore', opts: [
    { name: 'Diesel stanco', cost: 0, desc: 'Fuma, tossisce, va.', mod: {} },
    { name: 'Diesel rifatto', cost: 130, desc: '+15% velocità, accelera il doppio.', mod: { speed: 1.15, accel: 2 } },
    { name: 'Turbina da camion', cost: 260, desc: '+30% velocità, accelera x2.5, retro veloce.', mod: { speed: 1.3, accel: 2.5, reverse: 1.6 } },
  ] },
  armor: { label: 'Corazza', opts: [
    { name: 'Lamiera di serie', cost: 0, desc: 'Ferma i proiettili, non i razzi.', mod: {} },
    { name: 'Lamiere saldate', cost: 150, desc: '+100 integrità, +5% protezione, un po\' più lento.', mod: { hp: 100, armor: 0.05, speedAdd: -0.5 } },
    { name: 'Corazza reattiva', cost: 300, desc: '+150 integrità, +20% protezione, più lento.', mod: { hp: 150, armor: 0.2, speedAdd: -1 } },
  ] },
  radio: { label: 'Radio', opts: [
    { name: 'Radio da carro', cost: 0, desc: 'Raggio corto.', mod: {} },
    { name: 'Radio militare', cost: 120, desc: 'Raggio radio x1.45.', mod: { radio: 1.45 } },
    { name: 'Ripetitore a traliccio', cost: 220, desc: 'Raggio radio x2.', mod: { radio: 2.0 } },
    { name: 'Radio a lungo raggio', cost: 380, desc: 'Raggio radio x2.7.', mod: { radio: 2.7 } },
  ] },
  turret: { label: 'Torretta', opts: [
    { name: 'Anello arrugginito', cost: 0, desc: 'Gira piano.', mod: {} },
    { name: 'Anello oliato', cost: 110, desc: 'Torretta x1.5 più rapida.', mod: { turret: 1.5 } },
    { name: 'Servomotore elettrico', cost: 240, desc: 'Torretta x2.2 più rapida.', mod: { turret: 2.2 } },
  ] },
  stab: { label: 'Stabilizzatore', opts: [
    { name: 'Nessuno', cost: 0, desc: 'In movimento il tiro si allarga molto.', mod: {} },
    { name: 'Giroscopio', cost: 150, desc: '-40% dispersione in movimento.', mod: { moveSpread: 0.6 } },
    { name: 'Stabilizzatore attivo', cost: 300, desc: '-70% dispersione in movimento, mira più rapida.', mod: { moveSpread: 0.3, aim: 0.7 } },
  ] },
};
const SLOTS = ['cannon', 'tracks', 'engine', 'armor', 'radio', 'turret', 'stab'];

// ---- Between runs (piastrine) ---------------------------------------------------------------------
const META_KEY = 'rustline_meta_v1';
const PERKS = [
  { id: 'radio', name: 'Radio da campo', desc: '+6 raggio radio', max: 3, cost: l => 4 + l * 4 },
  { id: 'vet', name: 'Veterano', desc: '+1 fuciliere alla partenza', max: 2, cost: l => 5 + l * 5 },
  { id: 'scrap', name: 'Riserva di rottami', desc: '+60 rottami alla partenza', max: 3, cost: l => 3 + l * 3 },
  { id: 'hull', name: 'Scafo rinforzato', desc: '+40 integrità', max: 3, cost: l => 4 + l * 4 },
];
function loadMeta() {
  try { const s = localStorage.getItem(META_KEY); if (s) { const m = JSON.parse(s); return { piastrine: m.piastrine | 0, perks: m.perks || {} }; } } catch (e) { /* private window */ }
  return { piastrine: 0, perks: {} };
}
const meta = loadMeta();
function saveMeta() { try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* not kept */ } }
function perk(id) { return meta.perks[id] || 0; }
/** Buys the i-th permanent upgrade with piastrine. Returns a line to show. */
function buyPerk(i) {
  const p = PERKS[i]; if (!p) return '';
  const l = perk(p.id); if (l >= p.max) return p.name + ': già al massimo.';
  const c = p.cost(l); if (meta.piastrine < c) return 'Servono ' + c + ' piastrine.';
  meta.piastrine -= c; meta.perks[p.id] = l + 1; saveMeta(); sfx('coin');
  return p.name + ' livello ' + (l + 1) + '.';
}

// ---- Tank numbers ------------------------------------------------------------------------------------
/** The command tank's live numbers: config, permanent perks and fitted parts. */
function tankStats() {
  if (state.statsStep === state.stepN && state.stats) return state.stats;
  const s = {
    speed: tune.tank_speed, reverse: tune.tank_reverse, turn: tune.tank_turn, climb: tune.tank_climb,
    hp: tune.tank_hp + perk('hull') * 40, armor: tune.tank_armor, turret: tune.turret_speed,
    reload: tune.cannon_reload, dmg: tune.cannon_damage, blast: tune.cannon_blast, spread: 1, moveSpread: 1, aim: 1, accel: tune.tank_accel,
    radio: tune.radio_range + perk('radio') * 6, barrel: 2.6,
  };
  const p = state.parts || {};
  for (const slot of SLOTS) {
    const m = PARTS[slot].opts[p[slot] || 0].mod;
    if (m.dmg) s.dmg *= m.dmg; if (m.blast) s.blast *= m.blast; if (m.reload) s.reload += m.reload; if (m.reloadSet) s.reload = m.reloadSet;
    if (m.spread) s.spread *= m.spread; if (m.barrel) s.barrel *= m.barrel; if (m.turn) s.turn *= m.turn; if (m.climb) s.climb += m.climb;
    if (m.speed) { s.speed *= m.speed; s.reverse *= m.speed; } if (m.hp) s.hp += m.hp; if (m.armor) s.armor += m.armor;
    if (m.speedAdd) { s.speed += m.speedAdd; s.reverse += m.speedAdd * 0.5; } if (m.radio) s.radio *= m.radio;
    if (m.turret) s.turret *= m.turret; if (m.moveSpread) s.moveSpread *= m.moveSpread; if (m.aim) s.aim *= m.aim;
    if (m.accel) s.accel *= m.accel; if (m.reverse) s.reverse *= m.reverse;
  }
  s.reload = Math.max(0.3, s.reload);
  state.stats = s; state.statsStep = state.stepN;
  return s;
}
function tankLook() { const p = state.parts || {}; return { barrel: tankStats().barrel, antenna: 1.4 + (p.radio || 0) * 0.9, armor: p.armor || 0, radio: p.radio || 0 }; }

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
function unitHp(e) {
  const tier = e.tier || 1, k = 1 + (tier - 1) * tune.tier_scale;
  switch (e.kind) {
    case 'tank': return tankStats().hp;
    case 'car': return tune.car_hp;
    case 'technical': return tune.technical_hp * k;
    case 'boss': return tune.boss_hp;
    default: return (e.team ? tune.raider_hp * k : tune.inf_hp) * (e.kind === 'r_mg' ? 1.25 : 1);
  }
}
function unitSpeed(e) {
  switch (e.kind) {
    case 'car': return tune.car_speed;
    case 'technical': return tune.technical_speed;
    case 'boss': return 2.6;
    case 'mortar': case 'mg': case 'r_mg': return tune.inf_speed * 0.85;
    default: return tune.inf_speed * (e.team ? 0.92 : 1);
  }
}
function eyeH(e) { return e.kind === 'tank' ? 2.7 : e.kind === 'boss' ? 2.9 : e.veh ? 2.0 : (e.inCover && !e.moving ? 1.15 : 1.5); }
function chestH(e) { return e.veh ? 1.3 : 1.15; }
function canSee(a, b) { return lineClear(a.x, a.y + eyeH(a), a.z, b.x, b.y + chestH(b), b.z); }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function angTo(a, b) { return Math.atan2(b.x - a.x, b.z - a.z); }
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function turnToward(cur, target, maxStep) { const d = angDiff(cur, target); return Math.abs(d) <= maxStep ? target : cur + Math.sign(d) * maxStep; }
/** A free walkable spot near (x,z) for the i-th unit spawned there. */
function spotNear(x, z, i) {
  for (let r = 0; r < 8; r++) for (let k = 0; k < 12; k++) {
    const a = (i * 2.4 + k * 0.52), px = x + Math.cos(a) * (1.5 + r + i * 0.3), pz = z + Math.sin(a) * (1.5 + r + i * 0.3);
    if (walkable(Math.floor(px), Math.floor(pz)) && !shallow(px, pz) && Math.abs(hAt(px, pz) - hAt(x, z)) <= 1) return { x: px, z: pz };
  }
  return { x, z };
}

// ---- A new run ------------------------------------------------------------------------------------------
/** Generates the map and places the tank, the first squads and every raider. */
function newRun() {
  genWorld();
  Object.assign(state, {
    ents: [], squads: [], proj: [], debris: [], fx: [], tracers: [], marks: [], pickups: [], floats: [], msgs: [], groups: [],
    parts: { cannon: 0, tracks: 0, engine: 0, armor: 0, radio: 0, turret: 0, stab: 0 }, lookKey: 1, stats: null, statsStep: -1, stepN: 0,
    scrap: tune.start_scrap + perk('scrap') * 60, kills: 0, camps: 0, mode: 'tank', tpause: false, arm: null, tut: 0, nextId: 1, endT: 0, result: null,
    hurtT: -9, aimP: null, mouse3: null, snd: 0, shopTab: 0, shopMsg: '', roster: [], lastShot: -9, tagsWon: 0, campHint: false, fortHint: false,
  });
  const s = world.sites, rm = s.roadMain;
  const tk = spawn('tank', s.start.x + 0.5, s.start.z + 0.5);
  if (rm.length > 6) tk.heading = tk.turretYaw = Math.atan2(rm[6][0] - rm[0][0], rm[6][1] - rm[0][1]);
  tk.speed = 0; tk.spread = tune.spread_move; tk.reload = 0; tk.aligned = false; tk.pitch = 0; tk.roll = 0;
  state.tank = tk; state.startPos = { x: tk.x, z: tk.z };
  const back = { x: tk.x - Math.sin(tk.heading) * 6, z: tk.z - Math.cos(tk.heading) * 6 };
  const first = ['rifle', 'rifle', 'rifle']; for (let i = 0; i < perk('vet'); i++) first.push('rifle');
  const a = addSquad(first, back.x, back.z), b = addSquad(['sniper'], back.x - 3, back.z - 3);
  for (const q of [a, b]) if (q) q.order = { t: 'follow' };
  // raiders
  for (const c of s.camps) {
    const g = newGroup('camp', c.x + 0.5, c.z + 0.5, c);
    const n = 4 + c.tier * 2, kinds = [];
    for (let i = 0; i < n; i++) kinds.push(i === 1 ? 'r_mg' : i === 3 || (i === 6 && c.tier >= 3) ? 'r_rpg' : 'r_rifle');
    kinds.forEach((k, i) => { const p = c.spots[(i * 3) % c.spots.length] || spotNear(c.x, c.z, i); addRaider(g, k, p.x, p.z, c.tier); });
    addRaider(g, c.tier >= 2 ? 'r_mg' : 'r_rifle', c.tower.x, c.tower.z, c.tier, true);
    if (c.tier >= 3) { const p = spotNear(c.x + 8, c.z, 0); addRaider(g, 'technical', p.x, p.z, c.tier); }
  }
  for (const p of s.patrols) {
    const g = newGroup('patrol', p.x, p.z, null); g.first = !!p.first;
    g.wps = [];
    for (let k = 0; k < 3; k++) { const a2 = k * 2.1 + rng(), r = p.first ? 4 : 12; const w = spotNear(p.x + Math.cos(a2) * r, p.z + Math.sin(a2) * r, k); g.wps.push(w); }
    g.wpi = 0;
    for (let i = 0; i < p.n; i++) { const q = spotNear(p.x, p.z, i); addRaider(g, (!p.first && i === 2 && p.tier >= 2) ? 'r_rpg' : 'r_rifle', q.x, q.z, p.tier); }
    if (!p.first && p.tier >= 3 && rng() < 0.6) { const q = spotNear(p.x, p.z, 5); addRaider(g, 'technical', q.x, q.z, p.tier); }
  }
  const f = s.fortress, fg = newGroup('fort', f.x + 0.5, f.z + 0.5, f);
  state.boss = addRaider(fg, 'boss', f.x + 0.5, f.z + 0.5, 3);
  state.boss.turretYaw = state.boss.heading = Math.atan2(f.gateDir.x, f.gateDir.z);
  for (const t of f.towers) addRaider(fg, 'r_mg', t.x, t.z, 3, true);
  for (let i = 0; i < 8; i++) { const p = spotNear(f.x + (i % 4 - 1.5) * 5, f.z + (i < 4 ? -5 : 6), i); addRaider(fg, i % 3 === 2 ? 'r_rpg' : 'r_rifle', p.x, p.z, 3); }
  for (let i = 0; i < 2; i++) { const p = spotNear(f.x + (i ? 8 : -8), f.z + 2, i); addRaider(fg, 'technical', p.x, p.z, 3); }
  for (const w of s.wrecks) state.pickups.push({ x: w.x, z: w.z, value: w.value, taken: false, wreck: true });
  cam.x = tk.x; cam.z = tk.z; cam.y = tk.y; cam.dist = tune.cam_dist;
  // the camera starts behind the tank, on one of the four isometric bearings
  const behind = tk.heading + Math.PI, q4 = Math.PI / 2;
  cam.yawT = cam.yaw = Math.round((behind - Math.PI / 4) / q4) * q4 + Math.PI / 4;
  say('Radio', 'Comandante, il carro è tuo. W/S avanti e indietro, A/D per girare.', '#9fe3a0');
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
      medic: n > 1 ? 'Medici' : 'Medico', mortar: n > 1 ? 'Batteria mortai' : 'Pezzo di artiglieria', car: 'Autoblindo' }[t];
  }
  if (k.has('medic')) return 'Squadra con medico';
  if (k.has('mg')) return 'Squadra d\'appoggio';
  return 'Squadra mista';
}
/** Adds a squad of the given unit kinds near (x,z). */
function addSquad(slots, x, z) {
  if (state.squads.length >= tune.max_squads) return null;
  const sq = { id: state.squads.length, slots: slots.slice(), members: [], order: { t: 'hold' }, selected: false, tick: 0 };
  slots.forEach((k, i) => { const p = spotNear(x, z, i); const m = spawn(k, p.x, p.z); m.squad = sq; m.heading = state.tank ? state.tank.heading : 0; m.turretYaw = m.heading; sq.members[i] = m; });
  sq.name = squadName(slots);
  state.squads.push(sq);
  return sq;
}
function alive(sq) { return sq.members.filter(m => m && m.alive); }
function inRadio(sq) { const tk = state.tank, R = tankStats().radio; return tk.alive && alive(sq).some(m => dist2(m, tk) <= R * R); }
function setDest(m, x, z) {
  if (m.fixed) return;
  // paths go around the vehicles standing still (the command tank above all)
  const vs = state.ents.filter(v => v.alive && v.veh && v !== m && dist2(v, m) < 60 * 60 && dist2(v, m) > (v.rad + 1.2) ** 2 && !(v.moving || (v.kind === 'tank' && Math.abs(v.speed) > 0.5)));
  PF.avoid = (px, pz) => { for (const v of vs) { const r = v.rad + 0.7; if ((px - v.x) ** 2 + (pz - v.z) ** 2 < r * r) return true; } return false; };
  m.path = findPath(m.x, m.z, x, z, 1, m.veh ? 9000 : 6000); PF.avoid = null;
  m.pi = 0; m.dest = { x, z }; m.pathT = state.t;
}
function nearestEnemyTo(x, z, team, maxD) {
  let best = null, bd = maxD * maxD;
  for (const e of state.ents) if (e.alive && e.team !== team) { const d = (e.x - x) ** 2 + (e.z - z) ** 2; if (d < bd) { bd = d; best = e; } }
  return best;
}
/**
 * Sends a squad's members to (x,z). how: 'auto' (into cover if there is some), 'cover' (look harder
 * for cover against the nearest enemy), 'none' (straight there). Returns how many found cover.
 */
function goTo(sq, x, z, how) {
  const ms = alive(sq); if (!ms.length) return 0;
  const en = nearestEnemyTo(x, z, 0, how === 'cover' ? 90 : 45);
  let threat = null;
  if (en) { const dx = en.x - x, dz = en.z - z, L = Math.hypot(dx, dz) || 1; threat = { x: dx / L, z: dz / L }; }
  const inf = ms.filter(m => !m.veh), spots = how === 'none' ? [] : findCoverSpots(x, z, inf.length, threat);
  let k = 0;
  ms.forEach((m, i) => {
    let d;
    if (!m.veh && spots[k]) d = spots[k++];
    else { const a = i * 2.1, r = m.veh ? 0 : 1.6; d = { x: x + Math.cos(a) * r, z: z + Math.sin(a) * r }; }
    setDest(m, d.x, d.z); m.pref = null;
  });
  return spots.length;
}
/** A move order; with append it becomes the next stop of the squad's drawn path. */
function orderMove(sq, x, z, how = 'auto', append = false) {
  if (!alive(sq).length) return;
  const col = how === 'cover' ? 0x8fe36a : 0x4fe3e0;
  if (append && sq.order.t === 'move' && !sq.order.done) {
    sq.order.pts.push({ x, z, how });
    say(sq.name, 'Tappa ' + (sq.order.pts.length - sq.order.i) + ' aggiunta al percorso.');
    mark(x, z, col); return;
  }
  const n = goTo(sq, x, z, how);
  sq.order = { t: 'move', pts: [{ x, z, how }], i: 0, cover: n > 0, done: false };
  say(sq.name, how === 'cover' ? (n ? 'Ricevuto, prendiamo copertura.' : 'Nessuna copertura li, ci andiamo comunque.') : n ? 'Ricevuto, ci mettiamo al riparo.' : 'Ricevuto, in movimento.');
  mark(x, z, col);
}
function orderAttack(sq, target) {
  const ms = alive(sq); if (!ms.length) return;
  for (const m of ms) m.pref = target;
  sq.order = { t: 'attack', target };
  sq.tick = 0;
  say(sq.name, 'Bersaglio ricevuto: ' + UT[target.kind].name.toLowerCase() + '.');
  mark(target.x, target.z, 0xff6a4a);
}
function orderFollow(sq) { sq.order = { t: 'follow' }; sq.tick = 0; say(sq.name, 'Ricevuto, vi seguiamo.'); }
function orderHold(sq) { for (const m of alive(sq)) { m.path = null; m.pref = null; } sq.order = { t: 'hold' }; say(sq.name, 'Teniamo la posizione.'); }
function squadUpkeep(sq, dt) {
  sq.tick -= dt; if (sq.tick > 0) return; sq.tick = 1.2;
  const ms = alive(sq), tk = state.tank; if (!ms.length || !tk.alive) return;
  const heard = inRadio(sq);
  if (sq.order.t === 'follow') {
    if (!heard) { sq.order = { t: 'hold' }; say(sq.name, 'Segnale perso, teniamo la posizione.', '#e0a070'); return; }
    ms.forEach((m, i) => {
      const a = tk.heading + Math.PI + (i - (ms.length - 1) / 2) * 0.45 + (sq.id % 2 ? 0.6 : -0.6) * (1 + (sq.id >> 1) * 0.5), r = 7 + (sq.id >> 1) * 2 + (m.veh ? 3 : 0);
      const px = tk.x + Math.sin(a) * r, pz = tk.z + Math.cos(a) * r;
      if ((m.x - px) ** 2 + (m.z - pz) ** 2 > 9 && (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2.5)) setDest(m, px, pz);
    });
  } else if (sq.order.t === 'attack') {
    const t = sq.order.target;
    if (!t || !t.alive) { sq.order = { t: 'hold' }; say(sq.name, 'Bersaglio eliminato.'); return; }
    for (const m of ms) {
      const w = weapon(UT[m.kind].w), ok = dist2(m, t) <= (w.range * 0.9) ** 2 && (w.indirect || canSee(m, t));
      if (ok) m.path = null; else if (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2.5) setDest(m, t.x + (m.id % 3 - 1) * 2, t.z + (m.id % 2 - 0.5) * 3);
    }
  } else if (sq.order.t === 'move' && !sq.order.done) {
    const o = sq.order;
    if (ms.every(m => !m.path || m.pi >= m.path.length || (m.dest && dist2(m, m.dest) < 9 && o.i < o.pts.length - 1))) {
      if (o.i < o.pts.length - 1) { o.i++; const p = o.pts[o.i]; o.cover = goTo(sq, p.x, p.z, p.how) > 0; sq.tick = 0.4; }
      else { o.done = true; if (o.cover) say(sq.name, 'In posizione, al coperto.'); }
    }
  }
}
function selectedSquads() { return state.squads.filter(s => s.selected && alive(s).length); }
/**
 * Gives an order at the mouse to every selected squad the radio reaches. kind: null (enemy under the
 * mouse = attack, else move, into cover if near some), 'move', 'attack', 'cover'. append adds a stop
 * to the drawn path. Returns whether any squad heard it.
 */
function issueOrder(kind, append) {
  const sel = selectedSquads();
  if (!sel.length) { say('Radio', 'Nessuna squadra selezionata: click o tasti 1-6.', '#e0a070'); return false; }
  let tgt = null;
  if (kind === 'attack' || !kind) tgt = enemyUnderMouse() || (kind === 'attack' && state.mouse3 ? nearestEnemyTo(state.mouse3.x, state.mouse3.z, 0, 8) : null);
  if (kind === 'attack' && !tgt) { say('Radio', 'Nessun bersaglio: punta un nemico.', '#e0a070'); return false; }
  let any = false;
  for (const sq of sel) {
    if (!inRadio(sq)) { say(sq.name, 'Fuori portata radio: non vi sentiamo.', '#e0a070'); continue; }
    any = true;
    if (tgt) orderAttack(sq, tgt);
    else if (state.mouse3) orderMove(sq, state.mouse3.x, state.mouse3.z, kind === 'move' ? 'none' : kind === 'cover' ? 'cover' : 'auto', append);
  }
  if (any) { sfx('radio'); if (state.tut === 2) { state.tut = 3; say('Radio', 'Ti sentono solo dentro l\'anello ciano: la radio ha un raggio limitato. Migliorala in officina.', '#9fe3a0'); } }
  return any;
}
/** The order the next click gives, armed with a hotkey (V, F, C). */
const ARM = { move: 'VAI', attack: 'ATTACCA', cover: 'COPERTURA' };
/** Space: the tactical pause. Time stops; selection, orders and the camera still work. */
function setTacticalPause(on) {
  state.tpause = on; state.arm = null; MS.drag = null;
  say('Radio', on ? 'Pausa tattica: seleziona squadre e dai ordini, Spazio per riprendere.' : 'Si riprende.', '#ffd27a');
}
function enemyUnderMouse() {
  let best = null, bd = 26 * 26;
  for (const e of state.ents) {
    if (!e.alive || e.team !== 1) continue;
    const p = toScreen(e.x, e.y + 1, e.z); if (!p.on) continue;
    const d = (p.x - MS.x) ** 2 + (p.y - MS.y) ** 2; if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function friendlyUnderMouse() {
  let best = null, bd = 24 * 24;
  for (const e of state.ents) {
    if (!e.alive || !e.squad) continue;
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
    const ax = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
    const az = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0) - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
    const v = tune.pause_pan * cam.dist / 84 * dt, sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    cam.x += (cy * ax - sy * az) * v; cam.z += (-sy * ax - cy * az) * v;
    cam.x = Math.max(0, Math.min(world.N, cam.x)); cam.z = Math.max(0, Math.min(world.N, cam.z));
    MS.lp = MS.rp = MS.lr = false; MS.wheel = 0;
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
  cam.x += (tk.x + lx - cam.x) * k; cam.z += (tk.z + lz - cam.z) * k; cam.y += (tk.vy - cam.y) * k;
  cam.shake *= 0.9;
  MS.lp = MS.rp = MS.lr = false; MS.wheel = 0;
}
function handleInput() {
  const tk = state.tank;
  if (pressed('Tab')) {
    state.mode = state.mode === 'tank' ? 'cmd' : 'tank';
    say('Radio', state.mode === 'cmd' ? 'Modalità Comando: seleziona squadre e dai ordini col click destro.' : 'Modalità Carro: il mouse punta il cannone.', '#cfd8e0');
  }
  if (pressed('KeyQ')) cam.yawT -= Math.PI / 2;
  if (pressed('KeyE') && !state.canShop) cam.yawT += Math.PI / 2;
  if (MS.wheel) cam.dist = Math.max(tune.cam_dist_min, Math.min(tune.cam_dist_max, cam.dist * (MS.wheel > 0 ? 1.1 : 0.9)));
  for (let i = 0; i < 6; i++) if (pressed('Digit' + (i + 1))) selectSquad(state.squads[i], down.has('ShiftLeft') || down.has('ShiftRight'));
  if (pressed('KeyG')) for (const sq of selectedSquads()) { if (inRadio(sq)) orderFollow(sq); else say(sq.name, 'Fuori portata radio.', '#e0a070'); }
  if (pressed('KeyH')) for (const sq of selectedSquads()) { if (inRadio(sq)) orderHold(sq); else say(sq.name, 'Fuori portata radio.', '#e0a070'); }
  if (!tk.alive) return;
  const cmd = state.mode === 'cmd' || state.tpause, shift = down.has('ShiftLeft') || down.has('ShiftRight');
  if (cmd) {
    if (pressed('KeyV')) state.arm = state.arm === 'move' ? null : 'move';
    if (pressed('KeyF')) state.arm = state.arm === 'attack' ? null : 'attack';
    if (pressed('KeyC')) state.arm = state.arm === 'cover' ? null : 'cover';
    if (state.arm && MS.lp) { // an armed order goes out on the left click too
      if (issueOrder(state.arm, shift) && !shift) state.arm = null;
      MS.lp = false; MS.drag = null;
    }
  } else state.arm = null;
  if (cmd) {
    if (MS.lp) MS.drag = { x: MS.x, y: MS.y };
    if (MS.lr && MS.drag) {
      const d = MS.drag; MS.drag = null;
      const add = down.has('ShiftLeft') || down.has('ShiftRight');
      if (Math.abs(MS.x - d.x) < 6 && Math.abs(MS.y - d.y) < 6) { const f = friendlyUnderMouse(); selectSquad(f ? f.squad : null, add); }
      else {
        if (!add) for (const s of state.squads) s.selected = false;
        const x0 = Math.min(d.x, MS.x), x1 = Math.max(d.x, MS.x), y0 = Math.min(d.y, MS.y), y1 = Math.max(d.y, MS.y);
        for (const sq of state.squads) if (alive(sq).some(m => { const p = toScreen(m.x, m.y + 1, m.z); return p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1; })) selectSquad(sq, true);
      }
    }
  } else MS.drag = null;
  if (MS.rp) { const k = state.arm || (down.has('KeyF') ? 'attack' : null); if (issueOrder(k, shift) && state.arm && !shift) state.arm = null; }
  if (state.canShop && !state.tpause && pressed('KeyE')) { state.shopSite = state.canShop; state.shopTab = 0; state.shopMsg = ''; state.goScene = 'shop'; }
}

// ---- The command tank ------------------------------------------------------------------------------------
function tankFootprint(x, z, h) {
  const s = Math.sin(h), c = Math.cos(h), out = [];
  for (const lx of [-1.3, 0, 1.3]) for (const lz of [-2.3, 0, 2.3]) out.push({ x: x + c * lx + s * lz, z: z - s * lx + c * lz, lx, lz });
  return out;
}
/**
 * Can the tank move to (x,z,h)? Each footprint point is compared with where the same point of the
 * hull stands now, so a 1-voxel step or a ramp is climbable and a cliff is not. A footprint whose
 * height span grows past tank_slope_span is too steep. Crushes soft voxels in the way.
 * Returns the footprint or null.
 */
function tankFits(tk, x, z, h, climb) {
  const pts = tankFootprint(x, z, h), now = tankFootprint(tk.x, tk.z, tk.heading);
  let lo = 1e9, hi = -1e9, lo0 = 1e9, hi0 = -1e9;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    if (!inMap(Math.floor(p.x), Math.floor(p.z)) || deepWater(p.x, p.z)) return null;
    const g = hAt(p.x, p.z), g0 = Math.min(hAt(now[k].x, now[k].z), tk.y + 3);
    lo = Math.min(lo, g); hi = Math.max(hi, g); lo0 = Math.min(lo0, g0); hi0 = Math.max(hi0, g0);
    if (g - g0 > climb) {
      // crush a low soft obstacle (sandbags, junk, wood)
      const ix = Math.floor(p.x), iz = Math.floor(p.z), top = getV(ix, g - 1, iz);
      if (g - g0 <= 2.2 && SOFTV.has(top)) {
        const rem = [];
        for (let y = g - 1; y >= Math.ceil(g0); y--) { const t = getV(ix, y, iz); if (SOFTV.has(t)) { setV(ix, y, iz, 0); rem.push(ix, y, iz, t); } }
        recomputeColumn(ix, iz); spawnDebris(rem, p.x, tk.y + 1, p.z, 3);
        sfx('crunch', p.x, p.z);
      }
      return null;
    }
  }
  if (hi - lo > tune.tank_slope_span && hi - lo > hi0 - lo0 + 0.01) return null;
  return pts;
}
function updateTank(dt) {
  const tk = state.tank, S = tankStats();
  if (!tk.alive) return;
  tk.maxhp = S.hp; if (tk.hp > S.hp) tk.hp = S.hp;
  const fwd = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0) - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
  const turn = (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0) - (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0);
  const wet = shallow(tk.x, tk.z) ? 0.6 : 1;
  const target = fwd > 0 ? S.speed * wet : fwd < 0 ? -S.reverse * wet : 0;
  const acc = S.accel * (Math.sign(target) !== Math.sign(tk.speed) && tk.speed !== 0 ? 2 : 1);
  tk.speed += Math.max(-acc * dt, Math.min(acc * dt, target - tk.speed));
  const prevHead = tk.heading;
  if (turn) {
    const nh = tk.heading + turn * S.turn * Math.PI / 180 * dt * (fwd < 0 ? -1 : 1);
    if (tankFits(tk, tk.x, tk.z, nh, S.climb)) tk.heading = nh;
  }
  const hullTurn = Math.abs(angDiff(prevHead, tk.heading)) / dt;
  if (Math.abs(tk.speed) > 0.01) {
    const nx = tk.x + Math.sin(tk.heading) * tk.speed * dt, nz = tk.z + Math.cos(tk.heading) * tk.speed * dt;
    let pts = tankFits(tk, nx, nz, tk.heading, S.climb), bx = nx, bz = nz;
    if (pts && vehicleBlocked(tk, nx, nz)) pts = null;
    if (!pts) { // slide along the obstacle
      pts = tankFits(tk, nx, tk.z, tk.heading, S.climb); bx = nx; bz = tk.z;
      if (!pts || vehicleBlocked(tk, bx, bz)) { pts = tankFits(tk, tk.x, nz, tk.heading, S.climb); bx = tk.x; bz = nz; }
      if (pts && vehicleBlocked(tk, bx, bz)) pts = null;
      if (!pts) { // a caught corner: steer the hull a little off it and try again
        for (const sg of [1, -1]) {
          const nh = tk.heading + sg * tune.tank_glance * Math.PI / 180 * dt, mx = tk.x + Math.sin(nh) * tk.speed * dt * 0.6, mz = tk.z + Math.cos(nh) * tk.speed * dt * 0.6;
          const p2 = tankFits(tk, mx, mz, nh, S.climb);
          if (p2 && !vehicleBlocked(tk, mx, mz)) { pts = p2; bx = mx; bz = mz; tk.heading = nh; break; }
        }
      }
      tk.speed *= 0.6;
    }
    if (pts) { tk.x = bx; tk.z = bz; }
  }
  // ground, pitch and roll from the footprint
  const pts = tankFootprint(tk.x, tk.z, tk.heading);
  let sum = 0, front = 0, backH = 0, left = 0, right = 0;
  for (const p of pts) { const g = Math.min(hAt(p.x, p.z), tk.y + 3); sum += g; if (p.lz > 0) front += g; if (p.lz < 0) backH += g; if (p.lx < 0) right += g; if (p.lx > 0) left += g; }
  tk.y = Math.max(sum / pts.length, hAt(tk.x, tk.z) - 0.5);
  tk.vy += (tk.y - tk.vy) * Math.min(1, dt * 10);
  tk.pitch += (-(front - backH) / 3 / 4.6 - tk.pitch) * Math.min(1, dt * 8);
  tk.roll += ((left - right) / 3 / 2.6 - tk.roll) * Math.min(1, dt * 8);
  // crush infantry in the way
  if (Math.abs(tk.speed) > tune.crush_speed) for (const e of state.ents) {
    if (!e.alive || e.veh || e.team !== 1) continue;
    if (dist2(e, tk) < 4.4) { dmgTo(e, 999, 'crush', tk); floatText(e.x, e.y + 2, e.z, 'schiacciato', '#ffb070'); }
  }
  // the turret follows the mouse at its own speed: the hook
  const prevT = tk.turretYaw;
  if (state.mode === 'tank' && state.mouse3) {
    const want = Math.atan2(state.mouse3.x - tk.x, state.mouse3.z - tk.z);
    tk.turretYaw = turnToward(tk.turretYaw, want, S.turret * Math.PI / 180 * dt);
    tk.aligned = Math.abs(angDiff(tk.turretYaw, want)) < tune.aligned_deg * Math.PI / 180;
  } else tk.aligned = false;
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
  }
  if (state.mode === 'tank' && MS.l && tk.reload <= 0 && state.aimP) fireCannon(tk, S);
  // tutorial: the first moves
  if (state.tut === 0 && Math.hypot(tk.x - state.startPos.x, tk.z - state.startPos.z) > 6) {
    state.tut = 1; say('Radio', 'Il mouse punta il cannone, ma la torretta gira lenta. Da fermo il cerchio si stringe. Click sinistro: fuoco.', '#9fe3a0');
  }
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
  launch({ kind: 'shell', team: 0, owner: tk, dmg: S.dmg, blast: S.blast }, mx, my, mz, tx, ty, tz, tune.shell_speed, tune.shell_gravity);
  tk.reload = S.reload; tk.recoil = 1; tk.spread += tune.spread_fire;
  state.lastShot = state.t;
  muzzle(mx, my, mz, 1.3); sfx('cannon', tk.x, tk.z); cam.shake = Math.max(cam.shake, tune.shake * 0.6);
  if (state.tut === 1) { state.tut = 2; say('Radio', 'Bel colpo. Tab: modalità Comando. Seleziona una squadra (click o 1-6) e click destro per muoverla: vicino a un riparo si coprono.', '#9fe3a0'); }
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
  for (const e of state.ents) {
    if (!e.alive) { if (!e.gone && state.t - e.deathT > (e.veh ? 40 : 9)) e.gone = true; continue; }
    if (e.kind === 'tank') continue;
    const g = e.group;
    if (g && !g.alert && dist2(e, tk) > 90 * 90) continue; // far and calm: asleep
    e.think -= dt; e.cool -= dt; e.recoil = Math.max(0, (e.recoil || 0) - dt * 3);
    const w = weapon(UT[e.kind].w);
    if (e.think <= 0) {
      e.think = 0.35 + rng() * 0.15;
      e.target = pickTarget(e, w);
      e.inCover = e.target ? inCoverFrom(e.x, e.z, e.target.x, e.target.z) : coverAround(e);
      if (e.team === 1) raiderThink(e, w);
    }
    moveAlong(e, dt);
    e.y = hAt(e.x, e.z);
    if (e.y >= 99) e.y = 0;
    e.vy += (e.y - e.vy) * Math.min(1, dt * 12);
    if (deepWater(e.x, e.z)) { dmgTo(e, 999, 'drown', null); continue; }
    const t = e.target;
    if (t && t.alive) {
      const want = angTo(e, t);
      if (e.veh) e.turretYaw = turnToward(e.turretYaw, want, (e.kind === 'boss' ? tune.boss_turret_speed : 160) * Math.PI / 180 * dt);
      else if (!e.moving) e.heading = turnToward(e.heading, want, 8 * dt);
      const aligned = !e.veh || Math.abs(angDiff(e.turretYaw, want)) < (e.kind === 'boss' ? 0.05 : 0.2);
      if (e.cool <= 0 && aligned && (!e.moving || e.veh || w.kind === 'bullet')) { fire(e, t, w); e.cool = w.rate * (0.85 + rng() * 0.3); }
    } else if (e.veh && !e.moving) e.turretYaw = turnToward(e.turretYaw, e.heading, 0.8 * dt);
    if (e.kind === 'medic') for (const o of state.ents) if (o.alive && o.team === 0 && !o.veh && o.hp < o.maxhp && dist2(o, e) < tune.medic_radius ** 2) o.hp = Math.min(o.maxhp, o.hp + tune.medic_heal * dt);
  }
  // soldiers keep a little space between them
  const inf = state.ents.filter(e => e.alive && !e.veh && !e.fixed);
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
        const wp = e.moving && e.path && e.path[e.pi];
        if (wp && (wp.x - v.x) ** 2 + (wp.z - v.z) ** 2 >= r * r) continue;
        const d = Math.sqrt(d2), p = (r - d) * (e.moving ? 0.25 : 1); nudge(e, dx / d * p, dz / d * p);
      }
    }
  }
}
function nudge(e, dx, dz) {
  const nx = e.x + dx, nz = e.z + dz;
  if (walkable(Math.floor(nx), Math.floor(nz)) && Math.abs(hAt(nx, nz) - hAt(e.x, e.z)) <= 1) { e.x = nx; e.z = nz; }
}
function coverAround(e) {
  const h = hAt(e.x, e.z);
  for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (hAt(e.x + ox, e.z + oz) >= h + 1) return true;
  return false;
}
function moveAlong(e, dt) {
  if (!e.path || e.pi >= e.path.length) { e.moving = false; return; }
  const wp = e.path[e.pi], dx = wp.x - e.x, dz = wp.z - e.z, d = Math.hypot(dx, dz);
  let sp = unitSpeed(e) * (shallow(e.x, e.z) ? 0.55 : 1);
  if (e.veh) {
    const want = Math.atan2(dx, dz);
    e.heading = turnToward(e.heading, want, (e.kind === 'boss' ? 45 : 140) * Math.PI / 180 * dt);
    if (Math.abs(angDiff(e.heading, want)) > 0.8) sp *= 0.15;
  } else if (d > 0.01) e.heading = turnToward(e.heading, Math.atan2(dx, dz), 10 * dt);
  if (d <= sp * dt) { e.x = wp.x; e.z = wp.z; e.pi++; }
  else if (!e.veh && e.pi < e.path.length - 1 && d < 0.6) e.pi++; /* a node others crowd is close enough: walk on */ else { e.x += dx / d * sp * dt; e.z += dz / d * sp * dt; }
  e.moving = true;
}
/** The best enemy this unit can shoot now: its ordered target first, then the nearest it can see. */
function pickTarget(e, w) {
  const sight = e.team ? tune.raider_sight : tune.sight_range;
  const R = w.indirect ? w.range : Math.min(w.range, sight + (e.veh ? 6 : 0));
  if (e.pref && e.pref.alive && dist2(e, e.pref) <= R * R && (w.indirect ? seenByTeam(e.pref, e.team) : canSee(e, e.pref))) return e.pref;
  const c = [];
  for (const o of state.ents) {
    if (!o.alive || o.team === e.team) continue;
    const d = dist2(e, o); if (d > R * R) continue;
    if (w.min && d < w.min * w.min) continue;
    c.push([d, o]);
  }
  c.sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < Math.min(4, c.length); i++) {
    const o = c[i][1];
    if (w.indirect ? seenByTeam(o, e.team) : canSee(e, o)) return o;
  }
  return null;
}
/** True when any unit of the team can see the target (the mortar fires on what others spot). */
function seenByTeam(o, team) {
  for (const f of state.ents) if (f.alive && f.team === team && f.kind !== 'mortar' && dist2(f, o) < tune.sight_range ** 2 && canSee(f, o)) return true;
  return false;
}
function raiderThink(e, w) {
  const g = e.group;
  if (e.target) alertGroup(g, e.target);
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
  if (e.target && !e.veh) { e.path = null; return; }
  if (e.target && e.veh && dist2(e, e.target) < 16 * 16) { e.path = null; return; }
  if (g.known && (!e.path || e.pi >= e.path.length || state.t - e.pathT > 3)) {
    const lim = g.kind === 'camp' ? tune.leash : g.kind === 'fort' ? 11 : 36;
    let dx = g.known.x - g.home.x, dz = g.known.z - g.home.z; const L = Math.hypot(dx, dz);
    if (L > lim) { dx *= lim / L; dz *= lim / L; }
    const tx = g.home.x + dx + (e.id % 5 - 2) * 1.4, tz = g.home.z + dz + (e.id % 3 - 1) * 1.4;
    if (Math.hypot(tx - e.x, tz - e.z) > 2) setDest(e, tx, tz);
  }
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
  const yaw = e.veh ? e.turretYaw : e.heading, off = e.veh ? 1.6 : 0.6;
  const mx = e.x + Math.sin(yaw) * off, mz = e.z + Math.cos(yaw) * off, my = e.y + eyeH(e) - 0.2;
  e.recoil = 1;
  if (w.kind === 'bullet') {
    const d = Math.sqrt(dist2(e, t));
    let acc = w.acc * Math.max(0.35, Math.min(1, 1.25 - d / w.range * 0.6));
    if (e.moving) acc *= 0.5;
    if (t.moving) acc *= 0.8;
    const cover = !t.veh && inCoverFrom(t.x, t.z, e.x, e.z);
    if (cover) acc *= tune.cover_factor;
    if (t.veh) acc = Math.min(1, acc * 1.7);
    const col = e.team ? [1, 0.45, 0.25] : [1, 0.88, 0.45];
    if (rng() < acc) {
      tracer(mx, my, mz, t.x, t.y + chestH(t) - 0.2, t.z, col);
      dmgTo(t, w.dmg, w.heavy ? 'heavy' : 'bullet', e);
    } else {
      tracer(mx, my, mz, t.x + (rng() - 0.5) * 3, t.y + 0.4 + rng(), t.z + (rng() - 0.5) * 3, col);
      if (cover && rng() < tune.cover_chip * (w.chip || 1)) chipCover(t, e);
    }
    sfx(w.snd || 'small', e.x, e.z);
  } else if (w.kind === 'rpg') {
    launch({ kind: 'rpg', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, mx, my, mz, t.x + (rng() - 0.5) * 1.5, t.y + chestH(t), t.z + (rng() - 0.5) * 1.5, tune.rpg_speed, 3);
    muzzle(mx, my, mz, 0.6); sfx('rpg', e.x, e.z);
  } else if (w.kind === 'mortar') {
    const sc = tune.mortar_scatter, tx = t.x + (rng() - 0.5) * 2 * sc, tz = t.z + (rng() - 0.5) * 2 * sc;
    const D = Math.hypot(tx - e.x, tz - e.z);
    launch({ kind: 'mortar', team: e.team, owner: e, dmg: w.dmg, blast: w.blast }, mx, my + 0.6, mz, tx, hAt(tx, tz), tz, D / (2.4 + D / 25), 14);
    muzzle(mx, my + 0.6, mz, 0.5); sfx('mortar', e.x, e.z);
  } else if (w.kind === 'shell') {
    const d = Math.sqrt(dist2(e, t)), sp = 0.035 * d, a = rng() * 6.28, r = Math.sqrt(rng()) * sp;
    const gx = e.x + Math.sin(e.turretYaw) * 6.2, gz = e.z + Math.cos(e.turretYaw) * 6.2, gy = e.y + 2.4;
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
function dmgTo(e, amt, kind, src) {
  if (!e.alive) return;
  if (e.veh && (kind === 'bullet' || kind === 'heavy')) amt *= (e.kind === 'tank' || e.kind === 'boss') ? (kind === 'heavy' ? 0.3 : tune.small_arms_vs_tank) : (kind === 'heavy' ? 0.8 : 0.4);
  if (e.kind === 'tank' && kind !== 'bullet' && kind !== 'heavy') amt *= 1 - Math.min(0.9, tankStats().armor);
  if (e.kind === 'boss' && kind === 'blast') amt *= 0.8;
  if (e.kind === 'tank') { state.hurtT = state.t; cam.shake = Math.max(cam.shake, tune.shake * Math.min(1.6, amt / 30)); }
  e.hp -= amt;
  if (e.team === 1 && src && src.team === 0) alertGroup(e.group, src);
  if (e.team === 0 && e.squad && src && src.team === 1 && state.t - (e.squad.fireMsgT || -99) > 12) { e.squad.fireMsgT = state.t; say(e.squad.name, 'Siamo sotto fuoco!', '#ff9a7a'); }
  if (e.hp <= 0) kill(e, src, kind);
}
function kill(e, src, kind) {
  e.alive = false; e.hp = 0; e.deathT = state.t; e.path = null; e.moving = false; e.selected = false;
  if (e.veh) {
    blastFx(e.x, e.y + 1.2, e.z, 2.2);
    for (let i = 0; i < 6; i++) state.fx.push({ kind: 'smoke', x: e.x + (rng() - 0.5) * 2, y: e.y + 2, z: e.z + (rng() - 0.5) * 2, t: -i * 0.4, life: 3.5, s: 1.4, rise: 7, col: 0x2e2824 });
    sfx('boom', e.x, e.z);
    if (e.team === 1) state.pickups.push({ x: e.x, z: e.z, value: tune.scrap_vehicle, taken: false });
  }
  if (e.team === 1) {
    state.kills++;
    if (!e.veh) { state.scrap += tune.scrap_infantry; floatText(e.x, e.y + 2.2, e.z, '+' + tune.scrap_infantry, '#ffd36a'); }
    if (e.kind === 'boss') { state.result = 'win'; state.endT = state.t + 3; say('Radio', 'Il Carro del Capo è in fiamme! La fortezza è nostra!', '#9fe3a0'); }
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
  sfx(p.kind === 'rpg' ? 'boomS' : 'boom', x, z);
  const tk = state.tank, d = Math.hypot(x - tk.x, z - tk.z);
  cam.shake = Math.max(cam.shake, tune.shake * Math.max(0, 1 - d / 60) * (p.kind === 'shell' ? 1 : 0.6));
  for (const e of state.ents) {
    if (!e.alive) continue;
    if (e === direct) { dmgTo(e, p.dmg, p.kind === 'rpg' ? 'rocket' : 'shell', p.owner); continue; }
    const dx = e.x - x, dy = e.y + 0.9 - y, dz = e.z - z, R = p.blast * 1.8 + (e.veh ? e.rad * 0.6 : 0), dd = Math.hypot(dx, dy, dz);
    if (dd < R) {
      let a = p.dmg * (1 - dd / R) * (e.veh ? (p.kind === 'rpg' ? 0.6 : 0.35) : 1);
      if (p.owner && e.team === p.owner.team) a *= 0.5;
      dmgTo(e, a, 'blast', p.owner);
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
        if (!e.alive || e.team === p.team) continue;
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
  if (tk.alive) {
    for (const p of state.pickups) {
      if (p.taken || Math.hypot(p.x - tk.x, p.z - tk.z) > 3.6) continue;
      p.taken = true; state.scrap += p.value; floatText(p.x, hAt(p.x, p.z) + 2, p.z, '+' + p.value + ' rottami', '#ffd36a'); sfx('coin');
      if (p.wreck) say('Radio', 'Relitto smontato: ' + p.value + ' rottami.', '#ffd36a');
    }
  }
  for (const g of state.groups) {
    if (g.cleared || g.kind !== 'camp') continue;
    if (g.members.every(m => !m.alive)) {
      g.cleared = true; g.site.cleared = true; state.camps++;
      const bonus = Math.round(tune.scrap_camp * g.site.tier);
      state.scrap += bonus; sfx('coin');
      say('Radio', g.site.name + ' ripulito! +' + bonus + ' rottami. Spendili in un avamposto.', '#9fe3a0');
      floatText(g.home.x, g.site.g + 4, g.home.z, '+' + bonus + ' rottami', '#ffd36a');
    }
  }
  // near an outpost with no fight around: the workshop opens
  state.canShop = null;
  if (tk.alive) {
    const s = world.sites;
    for (const o of [s.start, ...s.outposts]) {
      if (Math.hypot(o.x + 0.5 - tk.x, o.z + 0.5 - tk.z) > tune.shop_radius) continue;
      const hot = state.groups.some(g => g.alert && g.members.some(m => m.alive && dist2(m, tk) < 30 * 30));
      if (!hot) state.canShop = o;
    }
  }
  if (state.tut >= 1 && !state.campHint) {
    const c = world.sites.camps.find(c => !c.cleared && Math.hypot(c.x - tk.x, c.z - tk.z) < 48);
    if (c) { state.campHint = true; say('Radio', c.name + ' avvistato: bunker e torretta di legno. Il cannone li apre, le squadre ripuliscono.', '#9fe3a0'); }
  }
  if (!state.fortHint && Math.hypot(world.sites.fortress.x - tk.x, world.sites.fortress.z - tk.z) < 60) { state.fortHint = true; say('Radio', 'La Fortezza del Capo. Mura spesse: sfonda il cancello di lamiera o apri una breccia.', '#ff9a7a'); }
  if (state.result && state.t >= state.endT) endRun();
}
/** Pays the piastrine for the run and moves to the end screen. */
function endRun() {
  const win = state.result === 'win';
  const tags = state.camps * tune.tags_per_camp + Math.floor(state.kills / 10) * tune.tags_per_10_kills + (win ? tune.tags_win : 0);
  state.tagsWon = tags; meta.piastrine += tags; saveMeta();
  state.gained = win ? 'La fortezza è caduta!' : 'Il carro comando è perso';
  state.goScene = win ? 'results' : 'over';
  state.result = null; state.perkMsg = '';
}

// ---- The workshop and the barracks ------------------------------------------------------------------
function buyPart(slot, i) {
  const o = PARTS[slot].opts[i];
  if (state.parts[slot] === i) { state.shopMsg = 'Già montato.'; return; }
  if (state.scrap < o.cost) { state.shopMsg = 'Servono ' + o.cost + ' rottami.'; return; }
  const hpBefore = tankStats().hp;
  state.scrap -= o.cost; state.parts[slot] = i; state.lookKey++; state.stats = null;
  const hpAfter = tankStats().hp; if (hpAfter > hpBefore) state.tank.hp += hpAfter - hpBefore;
  state.shopMsg = o.name + ' montato.'; sfx('coin');
}
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
  if (state.squads.length >= tune.max_squads) { state.shopMsg = 'Massimo ' + tune.max_squads + ' squadre.'; return; }
  const c = rosterCost(r); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c;
  const s = state.shopSite, sq = addSquad(r, s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = sq.name + ' arruolata.'; state.roster = []; sfx('coin');
}
function buyCar() {
  if (state.squads.length >= tune.max_squads) { state.shopMsg = 'Massimo ' + tune.max_squads + ' squadre.'; return; }
  if (state.scrap < tune.cost_car) { state.shopMsg = 'Servono ' + tune.cost_car + ' rottami.'; return; }
  state.scrap -= tune.cost_car;
  const s = state.shopSite, sq = addSquad(['car'], s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = 'Autoblindo pronta.'; sfx('coin');
}
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
