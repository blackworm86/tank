// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The tank's loadout and the soldiers' trades: counted main-gun rounds, hull modules found on the
// battlefield (second weapon, protection, system), the squads' specialisations and each role's skill.
'use strict';

// ---- Counted main-gun rounds ---------------------------------------------------------------------------
/** True while the weapon in use fires counted rounds (cannon and autocannon; machine guns never). */
function countedGun() { const w = state.weapon || 'cannon'; return w === 'cannon' || w === 'autocannon'; }
/** How many rounds the hull carries (0: a hull with machine guns only). */
function ammoMax() {
  const ws = HULLS[state.hull || 'mbt'].weapons;
  const base = ws.includes('cannon') ? tune.ammo_cannon : ws.includes('autocannon') ? tune.ammo_autocannon : 0;
  return Math.round(base * (modOn('rack') ? tune.mod_rack_ammo : 1));
}
/** Spends one round for the main gun. False, with a word from the crew, when the racks are empty. */
function useRound() {
  if (!countedGun()) return true;
  if (state.ammo > 0) {
    state.ammo--;
    if (state.ammo === Math.ceil(ammoMax() * 0.2)) say('Equipaggio', 'Restano ' + state.ammo + ' colpi!', '#e0a070');
    return true;
  }
  if (state.t - (state.dryT || -9) > 2.5) { state.dryT = state.t; say('Equipaggio', 'Colpi finiti! Cerca casse di munizioni o comprale al garage.', '#ff9a7a'); }
  return false;
}
/** The garage sells rounds: n of them, or as many as fit when n is 0. */
function buyAmmo(n) {
  const max = ammoMax(), room = max - state.ammo; if (!max) { state.shopMsg = 'Questo scafo non usa colpi contati.'; return; }
  if (room <= 0) { state.shopMsg = 'Rastrelliere piene.'; return; }
  let k = n ? Math.min(n, room) : room;
  k = Math.min(k, Math.floor(state.scrap / Math.max(1, tune.ammo_cost)));
  if (k <= 0) { state.shopMsg = 'Non bastano i rottami.'; return; }
  state.scrap -= k * tune.ammo_cost; state.ammo += k; state.shopMsg = '+' + k + ' colpi caricati.'; sfx('coin');
}

// ---- Hull modules found on the battlefield --------------------------------------------------------------
/** Every module: its slot (arma: the second weapon on the right button, prot: protection, sys: a system). */
const MODS = {
  coax: { slot: 'arma', name: 'Mitragliatrice coassiale', desc: 'Tasto destro: raffiche contro la fanteria.' },
  hmg: { slot: 'arma', name: 'Mitragliatrice pesante', desc: 'Tasto destro: più danno, buca le tecniche.' },
  rockets: { slot: 'arma', name: 'Lanciarazzi', desc: 'Tasto destro: un razzo anticarro, ricarica lenta.' },
  cage: { slot: 'prot', name: 'Gabbia antirazzo', desc: 'Razzi: danni ridotti di molto.' },
  plates: { slot: 'prot', name: 'Piastre di recupero', desc: 'Più integrità, un po\' più lento.' },
  skirts: { slot: 'prot', name: 'Minigonne', desc: 'Fianchi e retro: danni ridotti.' },
  thermal: { slot: 'sys', name: 'Visore termico', desc: 'Il carro vede molto più lontano.' },
  autorep: { slot: 'sys', name: 'Kit autoriparante', desc: 'Lontano dal fuoco lo scafo si ripara.' },
  loader: { slot: 'sys', name: 'Caricatore automatico', desc: 'Ricarica del cannone più rapida.' },
  rack: { slot: 'sys', name: 'Rastrelliera extra', desc: 'Più colpi trasportati.' },
};
const MOD_IDS = Object.keys(MODS);
const MOD_SLOTS = [['arma', 'Arma secondaria'], ['prot', 'Protezione'], ['sys', 'Sistema']];
/** True when module id is mounted. */
function modOn(id) { const m = state.mods; return !!m && (m.arma === id || m.prot === id || m.sys === id); }
/** The modules a fresh hull comes with: the battle tank has its coaxial machine gun. */
function startMods(hull) { return { arma: hull === 'mbt' ? 'coax' : null, prot: null, sys: null }; }
function startLoot(hull) { return hull === 'mbt' ? ['coax'] : []; }
/** Mounts a found module in its slot (id null: empties slot). Free, any time at a garage. */
function mountMod(slot, id) {
  const hp0 = tankStats().hp, max0 = ammoMax();
  state.mods[slot] = id; state.stats = null; state.lookKey++;
  const hp1 = tankStats().hp; if (hp1 > hp0) state.tank.hp += hp1 - hp0;
  const max1 = ammoMax(); if (max1 < max0) state.ammo = Math.min(state.ammo, max1);
  state.shopMsg = id ? MODS[id].name + ' montato.' : 'Slot svuotato.'; sfx('coin');
}
/** The fitted modules' effect on the tank's numbers (called by tankStats). */
function applyMods(s) {
  s.sight = tune.tank_sight * (modOn('thermal') ? tune.mod_thermal : 1);
  if (modOn('plates')) { s.hp += tune.mod_plates_hp; s.speed -= tune.mod_plates_slow; s.reverse -= tune.mod_plates_slow * 0.5; }
  if (modOn('loader') && s.wkind === 'shell') s.reload *= 1 - tune.mod_loader;
}
/** The fitted protection against a hit on the command tank: a damage multiplier. */
function tankModDmg(side, kind, src) {
  let k = 1;
  if (modOn('cage') && (kind === 'rocket' || (kind === 'blast' && src && src.kind === 'r_rpg'))) k *= 1 - tune.mod_cage;
  if (modOn('skirts') && (side === 'side' || side === 'rear')) k *= 1 - tune.mod_skirts;
  return k;
}
/** The second weapon on the right button, or null. */
function secWeapon() {
  const a = state.mods && state.mods.arma;
  if (a === 'coax') return { id: a, kind: 'bullet', dmg: tune.tank_mg_damage, rate: tune.tank_mg_rate, range: tune.tank_mg_range, heavy: false };
  if (a === 'hmg') return { id: a, kind: 'bullet', dmg: tune.tank_hmg_damage, rate: tune.tank_hmg_rate, range: tune.tank_mg_range, heavy: true };
  if (a === 'rockets') return { id: a, kind: 'rocket', dmg: tune.mod_rocket_damage, rate: tune.mod_rocket_rate, range: tune.rpg_range * 1.6 };
  return null;
}
/** The tank's systems each step: the second weapon (right button, while driving) and self-repair. */
function tankSystems(tk, dt) {
  tk.reload2 = Math.max(0, (tk.reload2 || 0) - dt);
  const w = secWeapon();
  if (w && state.mode === 'tank' && !state.tpause && MS.r && !state.menu && !state.menuBlock && tk.reload2 <= 0 && state.aimP) {
    tk.reload2 = w.rate;
    if (w.kind === 'bullet') fireTankMG(tk, tankStats(), w);
    else {
      const a = state.aimP, R = tk.spread * a.dist * 0.6, an = rng() * 6.28, rr = Math.sqrt(rng()) * R;
      const tx = a.x + Math.cos(an) * rr, tz = a.z + Math.sin(an) * rr, ty = (tk.aligned && rr < 1 ? a.y : hAt(tx, tz)) + 0.8;
      const sx = Math.cos(tk.turretYaw) * 0.9, sz = -Math.sin(tk.turretYaw) * 0.9;
      const mx = tk.x + Math.sin(tk.turretYaw) * 1.4 + sx, mz = tk.z + Math.cos(tk.turretYaw) * 1.4 + sz, my = tk.vy + 2.3;
      launch({ kind: 'rpg', team: 0, owner: tk, dmg: w.dmg, blast: 1.5 }, mx, my, mz, tx, ty, tz, tune.rpg_speed * 1.2, 3);
      muzzle(mx, my, mz, 0.6); sfx('rpg', tk.x, tk.z); state.lastShot = state.t;
    }
  }
  if (modOn('autorep') && tk.hp < tk.maxhp && state.t - state.hurtT > tune.mod_autorep_wait) tk.hp = Math.min(tk.maxhp, tk.hp + tune.mod_autorep * dt);
}

// ---- Crates on the battlefield: rounds and modules ---------------------------------------------------------
/** Leaves a crate of a module the tank does not have yet at (x,z), with probability chance. */
function dropLoot(x, z, chance) {
  if (rng() >= chance) return;
  const lying = new Set(state.pickups.filter(p => p.loot && !p.taken).map(p => p.loot));
  const pool = MOD_IDS.filter(id => !state.loot.includes(id) && !lying.has(id)); if (!pool.length) return;
  const q = spotNear(x, z, 0); state.pickups.push({ x: q.x, z: q.z, value: 0, loot: pool[Math.floor(rng() * pool.length)], taken: false });
}
/** Leaves a crate of n rounds at (x,z), with probability chance (none for a hull without counted rounds). */
function dropAmmo(x, z, n, chance) {
  if (rng() >= chance || !ammoMax()) return;
  const q = spotNear(x, z, 1); state.pickups.push({ x: q.x, z: q.z, value: 0, ammo: n, taken: false });
}
/** The tank drives over a crate: true when it was taken (a full rack leaves a rounds crate lying). */
function takeCrate(p) {
  if (p.ammo) {
    const room = ammoMax() - state.ammo; if (room <= 0) return false;
    const k = Math.min(room, p.ammo); state.ammo += k; floatText(p.x, hAt(p.x, p.z) + 2, p.z, '+' + k + ' colpi', '#ffe08a'); sfx('coin');
    say('Equipaggio', 'Cassa di munizioni: +' + k + ' colpi (' + state.ammo + '/' + ammoMax() + ').', '#ffe08a');
    return true;
  }
  const M = MODS[p.loot]; state.loot.push(p.loot); sfx('coin');
  floatText(p.x, hAt(p.x, p.z) + 2, p.z, M.name, '#8fe0ff');
  if (!state.mods[M.slot]) { state.mods[M.slot] = p.loot; state.stats = null; state.lookKey++; say('Equipaggio', 'Trovato e montato: ' + M.name + '. ' + M.desc, '#8fe0ff'); }
  else say('Equipaggio', 'Trovato: ' + M.name + '. Montalo al garage (Pezzi trovati).', '#8fe0ff');
  return true;
}
/** A few crates of rounds by the road of a new map (they are rare). */
function scatterCrates() {
  const rm = world.sites.roadMain; if (rm.length < 30) return;
  for (let k = 0; k < tune.ammo_crates; k++) {
    const p = rm[Math.floor(rm.length * (0.25 + rng() * 0.6))], side = rng() < 0.5 ? 1 : -1;
    dropAmmo(p[0] + side * 5, p[1] + side * 3, tune.ammo_crate_size, 1);
  }
}

// ---- The soldiers' trades -------------------------------------------------------------------------------------
/** What each kind of soldier does, for the barracks. */
const ROLE_DESC = {
  rifle: 'Fucile affidabile. Due o più: squadra d\'assalto.',
  mg: 'Raffiche che sopprimono: chi è colpito mira peggio e rallenta.',
  medic: 'Cura chi gli sta vicino, corre dai feriti e può salvare chi cade.',
  eng: 'Ripara i mezzi vicini (anche il carro), alza sacchi di sabbia da fermo.',
  radio: 'Sente la radio da più lontano e fa da ponte: chi gli è vicino riceve gli ordini.',
  scout: 'Vede lontano, corre, i nemici lo notano tardi.',
  sniper: 'Tiro lungo da una posizione alta.',
  mortar: 'Artigliere: tiro indiretto oltre le coperture.',
  at: 'Cannone anticarro trainato: perfora i mezzi.',
};
/** The squads' specialisations: read from who is in the squad, each with its bonus or malus. */
const TRAITS = [
  { id: 'assalto', name: 'Assalto', desc: '+15% precisione', test: c => c.rifle >= 2, mod: { acc: 1.15 }, squad: 'Squadra d\'assalto' },
  { id: 'copertura', name: 'Fuoco di copertura', desc: 'soppressione +60%', test: c => c.mg >= 2 || (c.mg >= 1 && c.rifle >= 2), mod: { sup: 1.6 }, squad: 'Squadra d\'appoggio' },
  { id: 'medica', name: 'Supporto medico', desc: '-20% danni subiti', test: c => c.medic >= 1 && c.n >= 3, mod: { taken: 0.8 }, squad: 'Squadra con medico' },
  { id: 'genio', name: 'Genio', desc: 'al riparo: -20% colpi presi', test: c => c.eng >= 1 && c.n >= 2, mod: { coverK: 0.8 }, squad: 'Squadra del genio' },
  { id: 'comando', name: 'Comando', desc: '+12% cadenza di tiro', test: c => c.radio >= 1 && c.n >= 2, mod: { rate: 0.88 }, squad: 'Squadra comando' },
  { id: 'ricognizione', name: 'Ricognizione', desc: '+30% vista, +10% velocità, -10% precisione', test: c => c.scout >= 2 || (c.scout >= 1 && c.n <= 2), mod: { sight: 1.3, speed: 1.1, acc: 0.9 }, squad: 'Pattuglia' },
  { id: 'artiglieria', name: 'Artiglieria', desc: 'mortai: -40% dispersione', test: c => c.mortar >= 2 || (c.mortar >= 1 && (c.scout + c.radio) >= 1), mod: { scatter: 0.6 }, squad: 'Batteria' },
  { id: 'specialisti', name: 'Specialisti', desc: '+6% precisione e cadenza', test: c => c.n >= 3 && c.kinds === c.n, mod: { acc: 1.06, rate: 0.94 }, squad: 'Specialisti' },
  { id: 'lenta', name: 'Lenta', bad: true, desc: '-15% velocità: armi pesanti', test: c => c.mg + c.mortar + c.at >= 2, mod: { speed: 0.85 } },
  { id: 'sbandati', name: 'Sbandati', bad: true, desc: '-15% precisione: nessuno che spari sul serio', test: c => c.n >= 2 && !c.rifle && !c.mg && !c.sniper && !c.scout, mod: { acc: 0.85 } },
];
const NO_MOD = Object.freeze({ acc: 1, sup: 1, taken: 1, coverK: 1, rate: 1, sight: 1, speed: 1, scatter: 1 });
/** The specialisations a squad of these kinds gets. */
function traitsOf(kinds) {
  const c = { n: kinds.length, kinds: new Set(kinds).size };
  for (const k of [...INF_KINDS, ...VEH_KINDS]) c[k] = 0;
  for (const k of kinds) c[k]++;
  return TRAITS.filter(t => t.test(c));
}
/** A squad's combined multipliers from its specialisations (kept until who is alive in it changes). */
function squadMod(sq) {
  if (!sq) return NO_MOD;
  const kinds = sq.members.filter(m => m && m.alive && !m.veh).map(m => m.kind), key = kinds.join();
  if (sq.modKey === key && sq.mod) return sq.mod;
  const m = Object.assign({}, NO_MOD), tr = traitsOf(kinds);
  for (const t of tr) for (const k in t.mod) m[k] *= t.mod[k];
  sq.modKey = key; sq.mod = m; sq.traits = tr;
  return m;
}
/** One unit's multipliers: its squad's, for our soldiers; none for everyone else. */
function modOf(e) { return e && e.team === 0 && e.squad && !e.veh ? squadMod(e.squad) : NO_MOD; }

// ---- The radio: the tank's ring, stretched by radiomen ------------------------------------------------------------
/** Radiomen who hear the tank (their own reach is longer); cached for the step. */
function relays() {
  if (state.relayN === state.stepN && state.relayL) return state.relayL;
  const tk = state.tank, R = tankStats().radio * tune.radioman_range;
  state.relayL = tk && tk.alive ? state.ents.filter(e => e.alive && e.team === 0 && e.kind === 'radio' && !e.inside && dist2(e, tk) <= R * R) : [];
  state.relayN = state.stepN;
  return state.relayL;
}
/** True when soldier m hears the tank's radio: inside the ring, a radioman inside his longer reach, or near one who does. */
function heardAt(m) {
  const tk = state.tank; if (!tk || !tk.alive || !m) return false;
  if (m === tk || m.inside) return true;
  const R = tankStats().radio; if (dist2(m, tk) <= R * R) return true;
  const rl = relays(); if (m.kind === 'radio' && rl.includes(m)) return true;
  return rl.some(r => dist2(r, m) <= tune.radio_relay ** 2);
}
/** How far a friendly unit spots enemies. */
function sightOf(f) {
  if (f === state.tank) return tankStats().sight;
  const r = f.kind === 'sniper' ? tune.sniper_sight : f.kind === 'scout' ? tune.scout_sight : tune.sight_range;
  return r * modOf(f).sight;
}

// ---- Exploration and sensors --------------------------------------------------------------------------------
/**
 * The map is unknown until explored: a 2x2 cell counts as explored once someone saw it, or once it was
 * inside the tank's sensor bubble (a plain circle, wider than sight, needing no line of view). T holds
 * the cells seen this tick. world.exp eases toward world.expT so the edge moves softly.
 */
function exploreUpdate(T, G) {
  if (!world.expT || world.expT.length !== G * G || world.expGen !== world.gen) { world.expT = new Uint8Array(G * G); world.exp = new Float32Array(G * G); world.expGen = world.gen; }
  const E = world.expT, tk = state.tank, r = tankStats().sensor;
  if (!tune.fog) E.fill(1); else for (let i = 0; i < G * G; i++) if (T[i]) E[i] = 1;
  if (r && tk && tk.alive) {
    const cx = tk.x / 2, cz = tk.z / 2, rr = r / 2;
    for (let z = Math.max(0, Math.floor(cz - rr)); z <= Math.min(G - 1, Math.ceil(cz + rr)); z++)
      for (let x = Math.max(0, Math.floor(cx - rr)); x <= Math.min(G - 1, Math.ceil(cx + rr)); x++)
        if ((x + 0.5 - cx) ** 2 + (z + 0.5 - cz) ** 2 <= rr * rr) E[x + G * z] = 1;
  }
  const X = world.exp; for (let i = 0; i < G * G; i++) X[i] += (E[i] - X[i]) * 0.5;
}
/** True when the map cell at world (x,z) has been explored. */
function explored(x, z) {
  const G = world.visG, E = world.expT; if (!E || !G) return false;
  const cx = Math.max(0, Math.min(G - 1, Math.floor(x) >> 1)), cz = Math.max(0, Math.min(G - 1, Math.floor(z) >> 1));
  return E[cx + G * cz] === 1;
}
/**
 * The radar (advanced sensors): every radarT seconds it marks where the unseen enemies within its range
 * stand, as blips that say nothing of what they are. Called with the fog's tick.
 */
function radarUpdate(dt) {
  const S = tankStats(), tk = state.tank;
  if (!S.radar || !tk.alive) { state.blips = []; return; }
  state.radarT = (state.radarT || 0) - dt;
  if (state.radarT > 0) return;
  state.radarT = S.radarT; state.radarAt = state.t;
  state.blips = state.ents.filter(e => e.alive && e.team === 1 && !e.seen && dist2(e, tk) <= S.radar * S.radar).map(e => ({ x: e.x, z: e.z }));
  if (state.blips.length) sfx('radio');
}
/** Blip markers on the 3D view: pulsing red rings that fade before the next sweep. */
function drawBlips3D() {
  if (!state.blips || !state.blips.length) return;
  const age = (state.t - (state.radarAt || 0)) / Math.max(0.5, tankStats().radarT || 1), a = Math.max(0.15, 1 - age * 0.8);
  for (const b of state.blips) {
    const p = toScreen(b.x, hAt(b.x, b.z) + 0.5, b.z); if (!p.on) continue;
    const r = 7 + (age * 14) % 10;
    ctx.globalAlpha = a; ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ff6a4a'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}
/** Blips on the minimap (inside its transform; k: its scale). */
function minimapBlips(k) {
  if (!state.blips || !state.blips.length) return;
  const age = (state.t - (state.radarAt || 0)) / Math.max(0.5, tankStats().radarT || 1);
  ctx.globalAlpha = Math.max(0.25, 1 - age * 0.7); ctx.strokeStyle = '#ff6a4a'; ctx.lineWidth = 1.6 / k;
  for (const b of state.blips) { ctx.beginPath(); ctx.arc(b.x, b.z, 3 + (age * 3) % 3, 0, Math.PI * 2); ctx.stroke(); }
  const tk = state.tank; ctx.globalAlpha = 0.35; ctx.setLineDash([2 / k, 3 / k]);
  ctx.beginPath(); ctx.arc(tk.x, tk.z, tankStats().radar, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

// ---- Each role's skill, every step -------------------------------------------------------------------------
/** The medic, the engineer: what they do on their own beside fighting. */
function roleSkill(e, dt) {
  if (e.team !== 0 || e.inside || e.garrison) return;
  if (e.kind === 'medic') medicSkill(e, dt);
  else if (e.kind === 'eng') engSkill(e, dt);
}
function medicSkill(e, dt) {
  let tended = false;
  for (const o of state.ents) {
    if (!o.alive || o.team !== 0 || o.veh || o.inside || o.hp >= o.maxhp || dist2(o, e) > tune.medic_radius ** 2) continue;
    const h = Math.min(o.maxhp - o.hp, tune.medic_heal * dt); o.hp += h; tended = true;
    o.healAcc = (o.healAcc || 0) + h;
    if (o.healAcc >= 5) { floatText(o.x, o.y + 2.2, o.z, '+' + Math.round(o.healAcc), '#7fe07a'); o.healAcc = 0; }
  }
  if (tended) { if (state.t - (e.fxT || -9) > 0.5) { e.fxT = state.t; state.fx.push({ kind: 'smoke', x: e.x, y: e.y + 1.4, z: e.z, t: 0, life: 0.6, s: 0.3, rise: 1.2, col: 0x8fe08a }); } return; }
  // nobody to tend here: to the nearest wounded friend not too far, unless the squad is on the march
  const sq = e.squad, marching = sq && sq.order && sq.order.t === 'move' && !sq.order.done;
  if (e.moving || marching || state.t - (e.seekT || -9) < 1.5) return;
  e.seekT = state.t;
  let best = null, bd = tune.medic_seek ** 2;
  for (const o of state.ents) if (o.alive && o !== e && o.team === 0 && !o.veh && !o.inside && !o.garrison && o.hp < o.maxhp * 0.85) { const d = dist2(o, e); if (d < bd) { bd = d; best = o; } }
  if (best && bd > (tune.medic_radius * 0.6) ** 2) setDest(e, best.x + 0.8, best.z + 0.4);
}
/**
 * A soldier of ours who would die with a medic close by is saved (once or twice a sector, by chance):
 * he gets up with a little health. True when he was saved.
 */
function medicSave(e, kind) {
  if (e.team !== 0 || e.veh || e.kind === 'tank' || kind === 'drown' || kind === 'crush' || (e.saved || 0) >= 2) return false;
  const m = state.ents.find(o => o.alive && o !== e && o.kind === 'medic' && o.team === 0 && !o.inside && dist2(o, e) < tune.medic_save_radius ** 2);
  if (!m || rng() >= tune.medic_save) return false;
  e.saved = (e.saved || 0) + 1; e.hp = e.maxhp * 0.3; e.supT = state.t + 2;
  floatText(e.x, e.y + 2.4, e.z, 'salvato dal medico', '#7fe07a');
  if (e.squad) say(e.squad.name, 'Medico! ...È vivo, lo rimettiamo in piedi!', '#7fe07a');
  return true;
}
function engSkill(e, dt) {
  // repairs our vehicles beside him, the command tank too
  for (const v of state.ents) {
    if (!v.alive || v.team !== 0 || !v.veh || v.hp >= v.maxhp || dist2(v, e) > (tune.eng_radius + v.rad) ** 2) continue;
    const h = Math.min(v.maxhp - v.hp, tune.eng_repair * dt); v.hp += h; v.fixAcc = (v.fixAcc || 0) + h;
    if (v.fixAcc >= 8) { floatText(v.x, v.y + 3, v.z, '+' + Math.round(v.fixAcc) + ' riparato', '#9fd8ff'); v.fixAcc = 0; }
    break;
  }
  // standing still without solid cover, a threat about or told to hold: sandbags in front of him
  if (e.moving || e.cover >= 2 || state.t - (e.buildT || -99) < tune.eng_build_time) return;
  const th = (e.target && e.target.alive && e.target) || (e.threat && e.threat.alive && state.t - (e.combatT || -99) < 8 && e.threat);
  const sq = e.squad, holding = sq && sq.order && (sq.order.t === 'hold' || (sq.order.t === 'move' && sq.order.done));
  if (!th && !holding) return;
  e.buildT = state.t;
  const a = th ? angTo(e, th) : e.heading, fx = Math.sin(a), fz = Math.cos(a), g0 = hAt(e.x, e.z);
  let n = 0;
  for (const s of [-1, 0, 1]) {
    const x = Math.floor(e.x + fx * 1.4 + fz * s), z = Math.floor(e.z + fz * 1.4 - fx * s); if (!inMap(x, z)) continue;
    const g = hAt(x + 0.5, z + 0.5); if (Math.abs(g - g0) > 1 || getV(x, g, z) !== V.AIR) continue;
    if (state.ents.some(o => o.alive && Math.floor(o.x) === x && Math.floor(o.z) === z)) continue;
    setV(x, g, z, V.BAG); recomputeColumn(x, z); n++;
  }
  if (n) { floatText(e.x, e.y + 2.2, e.z, 'sacchi di sabbia', '#e0c890'); sfx('crunch', e.x, e.z); }
}
