// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The tank's loadout and the soldiers' trades: counted main-gun rounds, hull modules found on the
// battlefield (second weapon, protection, system), the squads' specialisations and each role's skill.
'use strict';

// ---- The main weapon and its rounds ------------------------------------------------------------------------
/**
 * The main weapons a hull can mount (bought once at a garage, swapped free after). kind shell: counted
 * rounds of three types; bullet: a machine gun, never counted. Numbers come from config (weaponStats).
 * vsHeavy multiplies damage on tanks (the 25mm barely scratches them); weight slows the hull.
 */
const WEAPONS = adopt('weapon_main', {});
/** Adds a main weapon (its numbers come from config, by id, in weaponStats). */
function registerWeapon(id, D) { return register('weapon_main', id, D); }
/** The main weapons' ids in their order. */
function weaponIds() { return Object.keys(WEAPONS); }
/** A main weapon's live numbers. */
function weaponStats(id) {
  switch (id) {
    case 'hmg': return { kind: 'bullet', dmg: tune.tank_hmg_damage, reload: tune.tank_hmg_rate, range: tune.tank_mg_range, ammo: 0, weight: 0 };
    case 'gl': return { kind: 'shell', dmg: tune.cannon_damage * 0.5, reload: tune.gl_reload, blast: tune.cannon_blast * 1.05, spreadK: 1.3, barrel: 1.1, ammo: tune.ammo_gl, vsHeavy: tune.gl_vs_heavy, weight: tune.gl_weight };
    case 'c75': return { kind: 'shell', dmg: tune.cannon_damage, reload: tune.cannon_reload, blast: tune.cannon_blast, spreadK: 1, barrel: 2.6, ammo: tune.ammo_c75, vsHeavy: 1, weight: tune.c75_weight };
    case 'c105': return { kind: 'shell', dmg: tune.cannon_damage * 1.7, reload: tune.cannon_reload + 1, blast: tune.cannon_blast * 1.45, spreadK: 1.15, barrel: 3.8, ammo: tune.ammo_c105, vsHeavy: 1.25, weight: tune.c105_weight };
    default: return { kind: 'shell', dmg: tune.tank_ac_damage, reload: tune.tank_ac_reload, blast: tune.tank_ac_blast, spreadK: 0.25, barrel: 1.6, ammo: tune.ammo_ac, vsHeavy: tune.ac_vs_heavy, weight: 0 };
  }
}
/** Buys (once) or equips a main weapon at the garage. The rounds carried scale to the new racks. */
function equipWeapon(id) {
  if (state.weapon === id) { state.shopMsg = 'Già montata.'; return; }
  const W = WEAPONS[id];
  if (!state.weaponsOwned.includes(id)) {
    if (state.scrap < W.cost) { state.shopMsg = 'Servono ' + W.cost + ' rottami.'; return; }
    state.scrap -= W.cost; state.weaponsOwned.push(id);
  }
  const max0 = ammoMax(); state.weapon = id; state.stats = null; state.lookKey++;
  const max1 = ammoMax();
  for (const k of SHELL_IDS) state.ammo[k] = max0 && max1 ? Math.round(state.ammo[k] * max1 / max0) : max1 ? (k === 'he' ? Math.round(max1 * 0.6) : k === 'ap' ? max1 - Math.round(max1 * 0.6) : 0) : 0;
  state.shopMsg = W.name + ' montata.'; sfx('coin');
}
/** The three kinds of round for the main gun. veh/inf: damage on vehicles and infantry; blast: radius. */
const SHELLS = {
  he: { name: 'Esplosivo', short: 'HE', desc: 'Scoppio largo: fanteria e coperture. Debole sui mezzi.', veh: 0.6, inf: 1.2, blast: 1.35 },
  ap: { name: 'Perforante', short: 'AP', desc: 'Buca le corazze: molto danno ai mezzi, poco scoppio.', veh: 1.6, inf: 0.5, blast: 0.4 },
  frag: { name: 'Frammentazione', short: 'FRAG', desc: 'Pioggia di schegge: sopprime la fanteria su un\'area larga.', veh: 0.2, inf: 0.75, blast: 2.2 },
};
const SHELL_IDS = ['he', 'ap', 'frag'];
/** True while the weapon in use fires counted rounds. */
function countedGun() { return weaponStats(state.weapon).kind === 'shell'; }
/** How many rounds fit in the racks (all types together; 0 for a machine gun). */
function ammoMax() { const W = weaponStats(state.weapon); return W.ammo ? Math.round(W.ammo * (modOn('rack') ? tune.mod_rack_ammo : 1)) : 0; }
function ammoTotal() { return SHELL_IDS.reduce((a, k) => a + ((state.ammo && state.ammo[k]) || 0), 0); }
/** Full racks: 60% explosive, 40% piercing. */
function freshAmmo() { const m = ammoMax(); return { he: Math.round(m * 0.6), ap: m - Math.round(m * 0.6), frag: 0 }; }
/** X while driving: the next type of round that has any left. */
function cycleShell() {
  if (!countedGun()) return;
  const i = SHELL_IDS.indexOf(state.shell);
  for (let k = 1; k <= 3; k++) {
    const s = SHELL_IDS[(i + k) % 3];
    if (state.ammo[s] > 0 || k === 3) {
      if (s !== state.shell) { state.shell = s; state.tank.reload = Math.max(state.tank.reload, 0.8); say('Equipaggio', 'Carico ' + SHELLS[s].name.toLowerCase() + ' (' + state.ammo[s] + ').', '#ffe08a'); }
      return;
    }
  }
}
/** Spends one round of the loaded type. Empty: switches to a type with rounds, or says the racks are dry. */
function useRound() {
  if (!countedGun()) return true;
  if (!(state.ammo[state.shell] > 0)) {
    const other = SHELL_IDS.find(s => state.ammo[s] > 0);
    if (other) { state.shell = other; say('Equipaggio', 'Finiti quelli: carico ' + SHELLS[other].name.toLowerCase() + '.', '#e0a070'); state.tank.reload = 1; return false; }
    if (state.t - (state.dryT || -9) > 2.5) { state.dryT = state.t; say('Equipaggio', 'Colpi finiti! Cerca casse di munizioni o comprale all\'officina.', '#ff9a7a'); }
    return false;
  }
  state.ammo[state.shell]--;
  if (ammoTotal() === Math.ceil(ammoMax() * 0.2)) say('Equipaggio', 'Restano ' + ammoTotal() + ' colpi!', '#e0a070');
  return true;
}
function shellCost(type) { return Math.round(tune.ammo_cost * (type === 'he' ? 1 : 1.4)); }
/** The garage sells rounds of one type: n of them (0: fill the racks with it). */
function buyAmmo(type, n) {
  const max = ammoMax(), room = max - ammoTotal(); if (!max) { state.shopMsg = 'Questa arma non usa colpi contati.'; return; }
  if (room <= 0) { state.shopMsg = 'Rastrelliere piene.'; return; }
  const cost = shellCost(type);
  let k = n ? Math.min(n, room) : room; k = Math.min(k, Math.floor(state.scrap / Math.max(1, cost)));
  if (k <= 0) { state.shopMsg = 'Non bastano i rottami.'; return; }
  state.scrap -= k * cost; state.ammo[type] += k; state.shopMsg = '+' + k + ' ' + SHELLS[type].name.toLowerCase() + '.'; sfx('coin');
}
/** A round's damage multiplier on unit e: its type, and the gun's bite on heavy armour. */
function shellK(p, e) {
  const S = SHELLS[p.shell]; if (!S) return 1;
  return e.veh ? S.veh * (HEAVY.has(e.kind) ? (p.vsHeavy ?? 1) : 1) : S.inf;
}

// ---- Advanced systems (3 slots on the modular APC, up to 5 with its frame) --------------------------------------
/**
 * Systems: passive ones work while mounted; active ones fire with the key of their slot (1-5) while
 * driving, then recharge (cd seconds). Bought at garages (each sells a couple) or found in rare crates.
 */
const SYSTEMS = adopt('system', {});
/** Adds an advanced system (active ones: use(tk), what the key does). */
function registerSystem(id, D) { return register('system', id, D); }
/** The systems' ids in their order. */
function systemIds() { return Object.keys(SYSTEMS); }
/** True when system id is mounted. */
function modOn(id) { return !!state.systems && state.systems.includes(id); }
/** How many advanced systems the hull takes now. */
function sysSlots() { return tankStats().slots; }
/** Mounts an owned system in a free slot. */
function mountSystem(id) {
  if (modOn(id)) return;
  if (state.systems.length >= sysSlots()) { state.shopMsg = 'Nessuno slot libero: smonta prima un sistema.'; return; }
  const hp0 = tankStats().hp; state.systems.push(id); state.stats = null; state.lookKey++;
  const hp1 = tankStats().hp; if (hp1 > hp0) state.tank.hp += hp1 - hp0;
  state.shopMsg = SYSTEMS[id].name + ' montato' + (SYSTEMS[id].active ? ' (tasto ' + state.systems.length + ').' : '.'); sfx('coin');
}
/** Takes a system off (it stays in the store). */
function unmountSystem(id) {
  const i = state.systems.indexOf(id); if (i < 0) return;
  state.systems.splice(i, 1); state.stats = null; state.lookKey++;
  const m = ammoMax(); while (ammoTotal() > m) { const k = SHELL_IDS.find(s => state.ammo[s] > 0); state.ammo[k]--; }
  state.shopMsg = SYSTEMS[id].name + ' smontato.';
}
/** Fewer slots than systems (a lighter frame): the extra ones go back to the store. */
function trimSystems() { state.stats = null; while (state.systems.length > sysSlots()) state.systems.pop(); }
/** A garage's stock: two systems the player lacks, picked once per garage. */
function garageStock(site) {
  if (!site.stock) {
    const pool = systemIds().filter(id => !state.owned.includes(id)), out = [];
    for (let k = 0; k < 2 && pool.length; k++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    site.stock = out;
  }
  return site.stock.filter(id => !state.owned.includes(id));
}
function systemCost(id) { return Math.round(tune.sys_cost * (SYSTEMS[id].active ? 1.35 : 1)); }
function buySystem(id) {
  const c = systemCost(id); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c; state.owned.push(id); sfx('coin');
  if (state.systems.length < sysSlots()) mountSystem(id); else state.shopMsg = SYSTEMS[id].name + ' comprato: in magazzino.';
}
/** The mounted systems' effect on the tank's numbers (called by tankStats). */
function applyMods(s) {
  s.sight = tune.tank_sight * (modOn('thermal') ? tune.mod_thermal : 1);
  if (modOn('loader') && s.wkind === 'shell') s.reload *= 1 - tune.mod_loader;
  if (modOn('relay')) s.radio *= tune.mod_relay;
  if (state.t < (state.turboUntil || 0)) { s.speed *= 1.6; s.accel *= 2; }
}
/** The mounted protection against a hit on the command tank: a damage multiplier. */
function tankModDmg(side, kind, src) {
  let k = 1;
  if (modOn('cage') && (kind === 'rocket' || (kind === 'blast' && src && ENEMY[src.kind] && ENEMY[src.kind].rocket))) k *= 1 - tune.mod_cage;
  if (modOn('skirts') && (side === 'side' || side === 'rear')) k *= 1 - tune.mod_skirts;
  if (modOn('era') && (kind === 'rocket' || kind === 'shell') && (state.eraLeft ?? 3) > 0) {
    state.eraLeft = (state.eraLeft ?? 3) - 1; floatText(state.tank.x, state.tank.y + 3.6, state.tank.z, 'carica reattiva! (' + state.eraLeft + ')', '#ffd36a'); return 0;
  }
  return k;
}
/** The coaxial machine gun every hull carries: right button while driving. */
function secWeapon() { return { id: 'coax', kind: 'bullet', dmg: tune.tank_mg_damage, rate: tune.tank_mg_rate, range: tune.tank_mg_range, heavy: false }; }
/** One anti-tank rocket from the hull toward the aim. */
function fireRocket(tk) {
  const a = state.aimP; if (!a) return;
  const R = tk.spread * a.dist * 0.6, an = rng() * 6.28, rr = Math.sqrt(rng()) * R;
  const tx = a.x + Math.cos(an) * rr, tz = a.z + Math.sin(an) * rr, ty = (tk.aligned && rr < 1 ? a.y : hAt(tx, tz)) + 0.8;
  const sx = Math.cos(tk.turretYaw) * 0.9, sz = -Math.sin(tk.turretYaw) * 0.9;
  const mx = tk.x + Math.sin(tk.turretYaw) * 1.4 + sx, mz = tk.z + Math.cos(tk.turretYaw) * 1.4 + sz, my = tk.vy + 2.3;
  launch({ kind: 'rpg', team: 0, owner: tk, dmg: tune.mod_rocket_damage, blast: 1.5 }, mx, my, mz, tx, ty, tz, tune.rpg_speed * 1.2, 3);
  muzzle(mx, my, mz, 0.6); sfx('rpg', tk.x, tk.z); state.lastShot = state.t;
}
/** Seconds until system id is ready again (0: ready). */
function sysWait(id) { return Math.max(0, ((state.sysCd || {})[id] || 0) - state.t); }
/** Fires an active system. */
function activateSystem(id) {
  const S = SYSTEMS[id], tk = state.tank; if (!S || !S.active || !tk.alive) return;
  if (sysWait(id) > 0) { say('Equipaggio', S.name + ': pronto tra ' + Math.ceil(sysWait(id)) + ' s.', '#e0a070'); return; }
  state.sysCd[id] = state.t + S.cd;
  if (S.use) S.use(tk); // the entry's own effect
  say('Equipaggio', S.name + '!', '#8fe0ff');
}
/** True when the line from a to b crosses a smoke screen (they cannot see each other through it). */
function smokeBlocks(a, b) {
  for (const s of state.smokes || []) {
    if (state.t > s.until) continue;
    const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.z - a.z) * dz) / L2));
    if ((a.x + dx * t - s.x) ** 2 + (a.z + dz * t - s.z) ** 2 < s.r * s.r) return true;
  }
  return false;
}
/** The tank's systems each step: coax on the right button, active keys 1-5, X for rounds, repairs, salvos, the field hospital. */
function tankSystems(tk, dt) {
  tk.reload2 = Math.max(0, (tk.reload2 || 0) - dt);
  const driving = state.mode === 'tank' && !state.tpause && !state.menu && !state.menuBlock;
  const w = secWeapon(), S = tankStats();
  // the coax heats with every round: a full heat locks it until it has cooled to mg_unjam
  tk.heat = tk.heat || 0; tk.heatIdle = (tk.heatIdle || 0) + dt;
  if (tk.heatIdle > tune.mg_cool_wait || tk.jammed) tk.heat = Math.max(0, tk.heat - dt * tune.mg_cool * S.mgCool);
  if (tk.jammed && tk.heat <= tune.mg_unjam) tk.jammed = false;
  if (driving && MS.r && tk.reload2 <= 0 && state.aimP) {
    if (tk.jammed) { if (state.t - (state.jamSay || -9) > 4) { state.jamSay = state.t; say('Equipaggio', 'Coassiale surriscaldata! Lasciala raffreddare.', '#ff9a7a'); } }
    else {
      const rate = w.rate * S.mgRate; tk.reload2 = rate; tk.heatIdle = 0;
      const sp = tk.spread; tk.spread *= 1 + tk.heat * tune.mg_heat_spread; fireTankMG(tk, S, w); tk.spread = sp; // a hot barrel scatters
      tk.heat = Math.min(1, tk.heat + rate / (tune.mg_heat_time * S.mgHeat));
      if (tk.heat >= 1) { tk.jammed = true; sfx('crunch', tk.x, tk.z); }
    }
  }
  if (driving) state.systems.forEach((id, i) => { if (SYSTEMS[id].active && pressed('Digit' + (i + 1))) activateSystem(id); });
  if (driving && pressed('KeyX')) cycleShell();
  if (state.salvo && state.salvo.n > 0 && state.t >= state.salvo.next) { fireRocket(tk); state.salvo.n--; state.salvo.next = state.t + 0.25; }
  if (state.t < (state.repairUntil || 0)) tk.hp = Math.min(tk.maxhp, tk.hp + tk.maxhp * 0.35 / 4 * dt);
  if (modOn('autorep') && tk.hp < tk.maxhp && state.t - state.hurtT > tune.mod_autorep_wait) tk.hp = Math.min(tk.maxhp, tk.hp + tune.mod_autorep * dt);
  if (modOn('medbay')) for (const o of state.ents) if (o.alive && o.team === 0 && !o.veh && o.hp < o.maxhp && (o.inside || dist2(o, tk) < 64)) o.hp = Math.min(o.maxhp, o.hp + tune.mod_medbay * dt);
  if (state.turboUntil && state.t > state.turboUntil) { state.turboUntil = 0; state.stats = null; }
}

// ---- Achievements: the only way to unlock new hulls --------------------------------------------------------------
const ACHIEVEMENTS = [
  { id: 'sector4', name: 'Oltre metà strada', desc: 'Raggiungi il settore 4.', unlock: 'light' },
  { id: 'techs', name: 'Sfasciatecniche', desc: 'Distruggi 6 tecniche in un solo run.', unlock: 'light' },
  { id: 'win', name: 'L\'Orda respinta', desc: 'Vinci l\'ultima difesa.', unlock: 'mbt' },
  { id: 'camps', name: 'Terra bruciata', desc: 'Ripulisci 6 campi in un solo run.', unlock: 'mbt' },
  { id: 'allhome', name: 'Nessuno resta indietro', desc: 'Lascia un settore con 3 squadre e nessuno indietro.' },
  { id: 'crush', name: 'Schiacciasassi', desc: 'Investi 10 predoni in un solo run.' },
];
/** Gives an achievement (once ever) and the hull it unlocks. */
function grantAch(id) {
  if (meta.ach[id]) return;
  const A = ACHIEVEMENTS.find(a => a.id === id); if (!A) return;
  meta.ach[id] = true;
  let line = 'Achievement: ' + A.name + '.';
  if (A.unlock && !meta.unlocked.includes(A.unlock)) { meta.unlocked.push(A.unlock); line += ' Sbloccato: ' + HULLS[A.unlock].name + '!'; }
  saveMeta(); sfx('coin'); say('Comando', line, '#ffd36a');
  (state.newAch = state.newAch || []).push(A.name);
}
/** Checks the run's counters against the achievements (each second, and at the end of a run). */
function checkAch() {
  if (!state.camp) return;
  if (state.camp.sector >= 4) grantAch('sector4');
  if ((state.techKills || 0) >= 6) grantAch('techs');
  if (state.camps >= 6) grantAch('camps');
  if ((state.crushes || 0) >= 10) grantAch('crush');
  if (state.result === 'win') grantAch('win');
}
/** Development: wipes achievements and unlocks (the title's RESET button). */
function resetMeta() {
  meta.ach = {}; meta.unlocked = ['apc']; saveMeta();
  try { localStorage.removeItem('rustline_meta_v1'); } catch (e) { /* none */ }
  HULL_PICK.id = 'apc'; state.titleMsg = 'Dati azzerati: si riparte dall\'APC modulare.';
}

// ---- Crates on the battlefield: rounds and systems ---------------------------------------------------------
/** Leaves a crate of a system the tank does not have yet at (x,z), with probability chance. */
function dropLoot(x, z, chance) {
  if (rng() >= chance) return;
  const lying = new Set(state.pickups.filter(p => p.loot && !p.taken).map(p => p.loot));
  const pool = systemIds().filter(id => !state.owned.includes(id) && !lying.has(id)); if (!pool.length) return;
  const q = spotNear(x, z, 0); state.pickups.push({ x: q.x, z: q.z, value: 0, loot: pool[Math.floor(rng() * pool.length)], taken: false });
}
/** Leaves a crate of n rounds at (x,z), with probability chance (none while the gun is a machine gun). */
function dropAmmo(x, z, n, chance) {
  if (rng() >= chance || !ammoMax()) return;
  const q = spotNear(x, z, 1); state.pickups.push({ x: q.x, z: q.z, value: 0, ammo: n, taken: false });
}
/** The tank drives over a crate: true when it was taken (full racks leave a rounds crate lying). */
function takeCrate(p) {
  if (p.ammo) {
    const room = ammoMax() - ammoTotal(); if (room <= 0) return false;
    const k = Math.min(room, p.ammo), type = rng() < 0.5 ? 'he' : rng() < 0.6 ? 'ap' : 'frag';
    state.ammo[type] += k; floatText(p.x, hAt(p.x, p.z) + 2, p.z, '+' + k + ' ' + SHELLS[type].short, '#ffe08a'); sfx('coin');
    say('Equipaggio', 'Cassa di munizioni: +' + k + ' ' + SHELLS[type].name.toLowerCase() + '.', '#ffe08a');
    return true;
  }
  const M = SYSTEMS[p.loot]; state.owned.push(p.loot); sfx('coin');
  floatText(p.x, hAt(p.x, p.z) + 2, p.z, M.name, '#8fe0ff');
  if (state.systems.length < sysSlots()) { state.systems.push(p.loot); state.stats = null; say('Equipaggio', 'Trovato e montato: ' + M.name + '. ' + M.desc, '#8fe0ff'); }
  else say('Equipaggio', 'Trovato: ' + M.name + '. Montalo all\'officina, all\'uscita (Sistemi avanzati).', '#8fe0ff');
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
    placeFine(x, g, z, V.BAG); n++; // on the fine grid (js/structs.js)
  }
  if (n) { floatText(e.x, e.y + 2.2, e.z, 'sacchi di sabbia', '#e0c890'); sfx('crunch', e.x, e.z); }
}

// ---- The workshop tabs (js/systems/workshop.js) ------------------------------------------------------------
registerShopTab('weapon', {
  name: 'Arma e colpi', order: 20,
  draw(x0, y0, w, h, cy) {
    // the main weapon: bought once, swapped free after
    text('Arma principale (comprata una volta, poi si cambia gratis)', x0 + 24, cy + 6, 17, '#ffd9a0', 'left');
    const cw = Math.floor((w - 48 - 4 * 10) / 5);
    weaponIds().forEach((id, i) => {
      const W0 = WEAPONS[id], bx0 = x0 + 24 + i * (cw + 10), own = state.weaponsOwned.includes(id), eq = state.weapon === id, afford = own || state.scrap >= W0.cost;
      button(bx0, cy + 24, cw, 92, '', () => equipWeapon(id), { active: eq, off: !afford });
      text(W0.name, bx0 + 8, cy + 40, 14, eq ? '#eaf7d0' : afford ? HC.text : '#9a8a78', 'left');
      wrap(W0.desc, cw - 16, 12).slice(0, 3).forEach((l, k) => text(l, bx0 + 8, cy + 58 + k * 14, 12, HC.dim, 'left'));
      text(eq ? 'Montata' : own ? 'Tua: monta' : W0.cost + ' rottami', bx0 + cw - 8, cy + 104, 12, eq ? '#b6d77a' : own ? HC.text : HC.gold, 'right');
    });
    // the rounds: three types share the racks
    const am = ammoMax(), tot = ammoTotal(), room = am - tot;
    text('Colpi dell\'arma principale', x0 + 24, cy + 146, 17, '#ffd9a0', 'left');
    if (am) {
      bar(x0 + 24, cy + 164, 520, 20, tot / am, '#ffe08a'); text(tot + ' / ' + am + ' colpi nelle rastrelliere', x0 + 284, cy + 174, 13, '#10140c');
      SHELL_IDS.forEach((k, r) => {
        const yy = cy + 200 + r * 58, S0 = SHELLS[k], c = shellCost(k);
        rrect(x0 + 24, yy, 780, 52, 5, state.shell === k ? 'rgba(255,224,138,0.1)' : 'rgba(0,0,0,0.3)', state.shell === k ? '#ffe08a' : '#5a4030');
        text(S0.short + '  ' + S0.name, x0 + 36, yy + 16, 15, HC.text, 'left'); text(S0.desc, x0 + 36, yy + 36, 12, HC.dim, 'left');
        text(String(state.ammo[k]), x0 + 520, yy + 26, 20, '#ffe08a', 'right');
        button(x0 + 540, yy + 8, 120, 36, '+5 (' + Math.min(5, Math.max(0, room)) * c + ')', () => buyAmmo(k, 5), { off: room <= 0 || state.scrap < c, size: 13 });
        button(x0 + 670, yy + 8, 126, 36, 'Riempi (' + Math.max(0, room) * c + ')', () => buyAmmo(k, 0), { off: room <= 0 || state.scrap < c, size: 13 });
      });
      text('In marcia X cambia il tipo caricato. Le mitragliatrici non consumano colpi.', x0 + 24, cy + 384, 13, HC.dim, 'left');
    } else text('La mitragliatrice pesante non usa colpi contati.', x0 + 24, cy + 176, 14, HC.dim, 'left');
  },
});
registerShopTab('systems', {
  name: 'Sistemi avanzati', order: 30,
  draw(x0, y0, w, h, cy) {
    // advanced systems: the slots, the store, this garage's stock
    const n = sysSlots(), cw = Math.floor((w - 48 - 4 * 10) / 5);
    text('Sistemi avanzati montati (' + state.systems.length + ' / ' + n + ')  ·  click per smontare  ·  in marcia i tasti 1-5 usano quelli attivi', x0 + 24, cy + 6, 15, '#ffd9a0', 'left');
    const card = (bx0, by, id, label, fn, opts) => {
      button(bx0, by, cw, 78, '', fn, opts);
      const S0 = SYSTEMS[id];
      text(S0.name, bx0 + 8, by + 16, 13, HC.text, 'left');
      wrap(S0.desc, cw - 16, 11).slice(0, 3).forEach((l, k) => text(l, bx0 + 8, by + 33 + k * 13, 11, S0.active ? '#9fd8ff' : HC.dim, 'left'));
      if (label) text(label, bx0 + cw - 8, by + 68, 11, HC.gold, 'right');
    };
    for (let i = 0; i < 5; i++) {
      const bx0 = x0 + 24 + i * (cw + 10), id = state.systems[i];
      if (id) card(bx0, cy + 22, id, SYSTEMS[id].active ? 'tasto ' + (i + 1) : '', () => unmountSystem(id), { active: true });
      else { rrect(bx0, cy + 22, cw, 78, 5, 'rgba(0,0,0,0.25)', i < n ? '#5a4030' : '#2e241c'); text(i < n ? 'Slot libero' : (state.hull === 'apc' ? 'Serve un telaio migliore' : 'Non su questo scafo'), bx0 + cw / 2, cy + 61, 12, i < n ? HC.dim : '#5a4a3a'); }
    }
    const store = state.owned.filter(id => !modOn(id));
    text('In magazzino (click per montare)', x0 + 24, cy + 124, 15, '#ffd9a0', 'left');
    if (!store.length) text('Vuoto.', x0 + 24, cy + 150, 13, HC.dim, 'left');
    store.slice(0, 10).forEach((id, i) => card(x0 + 24 + (i % 5) * (cw + 10), cy + 140 + Math.floor(i / 5) * 86, id, '', () => mountSystem(id), { off: state.systems.length >= n }));
    const stock = garageStock(state.shopSite), sy = cy + 140 + (store.length > 5 ? 172 : store.length ? 86 : 30);
    text('In vendita da questa officina', x0 + 24, sy, 15, '#ffd9a0', 'left');
    if (!stock.length) text('Niente di nuovo da vendere.', x0 + 24, sy + 26, 13, HC.dim, 'left');
    stock.forEach((id, i) => card(x0 + 24 + i * (cw + 10), sy + 16, id, systemCost(id) + ' rottami', () => buySystem(id), { off: state.scrap < systemCost(id) }));
  },
});
