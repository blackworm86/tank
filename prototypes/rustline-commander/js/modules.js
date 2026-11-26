// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The command vehicle's modules: each hull has its own hardpoints (APC 6, light tank 4, battle tank 5)
// and a load it can carry; the field workshop at a map's exit offers 0-3 random modules; every module
// shows on the hull; armour plates wear with the hits they take, lose their protection down to nothing
// and look it, until they are repaired.
'use strict';

/** The hardpoints of each hull: what kinds of module each takes. cap: the load the hull carries. */
const HARDPOINTS = {
  apc: { cap: () => tune.cap_apc, pts: [
    { id: 'front', name: 'Fronte', types: ['front'] },
    { id: 'side', name: 'Fianchi', types: ['side'] },
    { id: 'drive', name: 'Trazione', types: ['drive'] },
    { id: 'turret', name: 'Torretta', types: ['turret', 'coax'] },
    { id: 'roof', name: 'Tetto', types: ['roof'] },
    { id: 'bay', name: 'Vano', types: ['bay'] },
  ] },
  light: { cap: () => tune.cap_light, pts: [
    { id: 'armor', name: 'Corazza', types: ['front', 'side'] },
    { id: 'drive', name: 'Trazione', types: ['drive'] },
    { id: 'turret', name: 'Torretta', types: ['turret', 'coax', 'gun'] },
    { id: 'roof', name: 'Tetto', types: ['roof'] },
  ] },
  mbt: { cap: () => tune.cap_mbt, pts: [
    { id: 'front', name: 'Fronte', types: ['front'] },
    { id: 'side', name: 'Fianchi', types: ['side'] },
    { id: 'drive', name: 'Trazione', types: ['drive'] },
    { id: 'turret', name: 'Torretta', types: ['turret', 'coax', 'gun', 'heavy'] },
    { id: 'roof', name: 'Tetto', types: ['roof'] },
  ] },
};
const MOD_TYPE = { front: 'piastra frontale', side: 'fianchi', drive: 'motore o cingoli', turret: 'meccanica', coax: 'coassiale', gun: 'cannone', heavy: 'torretta pesante', roof: 'radio o sensori', bay: 'vano e telaio' };
const MOD_ICON = { front: 'armor', side: 'armor', drive: 'engine', turret: 'turret', coax: 'coax', gun: 'cannon', heavy: 'turret', roof: 'radio', bay: 'seats' };
const RARITY = [{ name: 'comune', col: '#d8ccb4' }, { name: 'raro', col: '#7ab8ff' }, { name: 'eccezionale', col: '#e0a0ff' }];

/**
 * The modules. type: the hardpoint kind; r: rarity (0-2); cost in scrap (times module_cost_k); w: load;
 * mod: the same keys tankStats reads (gun* apply on top of the main weapon); plate: an armour plate on
 * one side of the hull, k = the share of the damage it stops when whole, dur = how much it takes.
 */
const MODULES = {
  f_plates: { name: 'Lamiere frontali', type: 'front', r: 0, cost: 60, w: 2, desc: 'Piastre imbullonate sul muso: -35% danni frontali.', plate: { side: 'front', k: 0.35, dur: 160 }, mod: {} },
  f_blade: { name: 'Lama apripista', type: 'front', r: 1, cost: 100, w: 2, desc: 'Lama d\'acciaio: -25% danni frontali, sfonda i gradini.', plate: { side: 'front', k: 0.25, dur: 220 }, mod: { climb: 0.5 } },
  f_comp: { name: 'Corazza composita frontale', type: 'front', r: 2, cost: 170, w: 3, desc: 'Strati di acciaio e ceramica: -55% danni frontali.', bad: '-10% rotazione.', plate: { side: 'front', k: 0.55, dur: 280 }, mod: { turn: 0.9 } },
  s_plates: { name: 'Lamiere laterali', type: 'side', r: 0, cost: 60, w: 2, desc: 'Lastre sui fianchi: -30% danni laterali.', plate: { side: 'side', k: 0.3, dur: 160 }, mod: {} },
  s_skirts: { name: 'Gonne a rete', type: 'side', r: 1, cost: 90, w: 1, desc: 'Reti d\'acciaio: -20% danni laterali, -45% dai razzi.', plate: { side: 'side', k: 0.2, rocket: 0.45, dur: 140 }, mod: {} },
  s_comp: { name: 'Corazza a strati', type: 'side', r: 2, cost: 180, w: 3, desc: 'Doppio strato sui fianchi e sul retro: -45%.', bad: '-0.5 velocità.', plate: { side: 'side', rear: true, k: 0.45, dur: 260 }, mod: { speedAdd: -0.5 } },
  d_diesel: { name: 'Diesel rifatto', type: 'drive', r: 0, cost: 70, w: 0, desc: '+15% velocità, accelera il doppio.', bad: 'Vibra: +10% dispersione.', mod: { speed: 1.15, accel: 2, spread: 1.1 } },
  d_wide: { name: 'Cingoli larghi', type: 'drive', r: 0, cost: 65, w: 1, desc: '+25% rotazione, sale gradini più alti.', bad: '-8% velocità.', mod: { turn: 1.25, climb: 0.5, speed: 0.92 } },
  d_race: { name: 'Cingoli da corsa', type: 'drive', r: 1, cost: 120, w: 0, desc: '+40% velocità, +15% rotazione.', bad: 'Sale meno, -30 integrità.', mod: { speed: 1.4, turn: 1.15, climb: -0.4, hp: -30 } },
  d_turbo: { name: 'Turbina da camion', type: 'drive', r: 1, cost: 150, w: 1, desc: '+30% velocità, accelera x2.5, retro veloce.', bad: '+25% dispersione, -40 integrità.', mod: { speed: 1.3, accel: 2.5, reverse: 1.6, spread: 1.25, hp: -40 } },
  d_v12: { name: 'V12 di recupero', type: 'drive', r: 2, cost: 240, w: 2, desc: '+35% velocità, accelera x2.5, sale meglio.', mod: { speed: 1.35, accel: 2.5, climb: 0.3 } },
  t_ring: { name: 'Anello oliato', type: 'turret', r: 0, cost: 55, w: 0, desc: 'Torretta x1.5 più rapida.', mod: { turret: 1.5 } },
  t_gyro: { name: 'Giroscopio', type: 'turret', r: 0, cost: 75, w: 0, desc: '-40% dispersione in movimento.', bad: 'Torretta -10%.', mod: { moveSpread: 0.6, turret: 0.9 } },
  t_servo: { name: 'Servomotore elettrico', type: 'turret', r: 1, cost: 130, w: 1, desc: 'Torretta x2.2 più rapida.', bad: 'Assorbe corrente: -15% radio.', mod: { turret: 2.2, radio: 0.85 } },
  t_stab: { name: 'Stabilizzatore attivo', type: 'turret', r: 2, cost: 190, w: 1, desc: '-70% dispersione in movimento, mira più rapida, torretta x1.3.', mod: { moveSpread: 0.3, aim: 0.7, turret: 1.3 } },
  c_heavy: { name: 'Canna pesante', type: 'coax', r: 0, cost: 55, w: 0, desc: 'La coassiale regge il calore x1.7.', mod: { mgHeat: 1.7 } },
  c_water: { name: 'Coassiale ad acqua', type: 'coax', r: 1, cost: 120, w: 1, desc: 'Calore x2.6, si raffredda x1.8.', mod: { mgHeat: 2.6, mgCool: 1.8 } },
  c_twin: { name: 'Binata a nastro', type: 'coax', r: 2, cost: 210, w: 1, desc: 'Due mitragliatrici: calore x4, cadenza +30%.', bad: '+10% dispersione.', mod: { mgHeat: 4, mgCool: 2, mgRate: 0.77, spread: 1.1 } },
  g_brake: { name: 'Freno di bocca', type: 'gun', r: 0, cost: 70, w: 0, desc: 'Meno rinculo: -15% dispersione, ricarica -10%.', mod: { gunSpread: 0.85, gunReload: 0.9 } },
  g_long: { name: 'Canna lunga', type: 'gun', r: 1, cost: 140, w: 1, desc: '+15% danno, -20% dispersione.', bad: 'Torretta -10%.', mod: { gunDmg: 1.15, gunSpread: 0.8, gunBarrel: 1.3, turret: 0.9 } },
  g_twin: { name: 'Cannone binato', type: 'gun', r: 2, cost: 300, w: 3, desc: 'Due canne che sparano a turno: ricarica -40%.', bad: '+15% dispersione, -0.4 velocità.', mod: { gunReload: 0.6, gunSpread: 1.15, speedAdd: -0.4 } },
  h_turret: { name: 'Torretta pesante', type: 'heavy', r: 2, cost: 280, w: 4, desc: 'Guance corazzate e cesta: +120 integrità, +8% protezione, +15% danno.', bad: 'Torretta -20%.', mod: { hp: 120, armor: 0.08, gunDmg: 1.15, turret: 0.8 } },
  r_radio: { name: 'Radio militare', type: 'roof', r: 0, cost: 65, w: 0, desc: 'Raggio radio x1.45.', mod: { radio: 1.45 } },
  r_seis: { name: 'Sensori sismici', type: 'roof', r: 0, cost: 75, w: 1, desc: 'Rivela la mappa fino a 70 attorno al mezzo.', mod: { sensor: 70 } },
  r_mast: { name: 'Ripetitore a traliccio', type: 'roof', r: 1, cost: 130, w: 1, desc: 'Raggio radio x2.', bad: 'Antenna ingombrante: torretta -10%.', mod: { radio: 2.0, turret: 0.9 } },
  r_radar: { name: 'Radar di scoperta', type: 'roof', r: 1, cost: 150, w: 1, desc: 'Mappa fino a 95, blip dei nemici entro 85 ogni 5 s.', bad: 'Disturba la radio: -10%.', mod: { sensor: 95, radar: 85, radarT: 5, radio: 0.9 } },
  r_long: { name: 'Radio a lungo raggio', type: 'roof', r: 2, cost: 230, w: 1, desc: 'Raggio radio x2.7.', bad: 'Torretta -15%.', mod: { radio: 2.7, turret: 0.85 } },
  r_tac: { name: 'Radar tattico', type: 'roof', r: 2, cost: 250, w: 2, desc: 'Mappa fino a 125, blip entro 115 ogni 2.5 s.', bad: '-15% radio.', mod: { sensor: 125, radar: 115, radarT: 2.5, radio: 0.85 } },
  b_handles: { name: 'Maniglie esterne', type: 'bay', r: 0, cost: 45, w: 0, desc: '+2 posti: fanti aggrappati allo scafo.', mod: { seats: 2 } },
  b_bay: { name: 'Vano ampliato', type: 'bay', r: 1, cost: 110, w: 1, desc: '+4 posti.', bad: '-0.3 velocità.', mod: { seats: 4, speedAdd: -0.3 } },
  b_frame: { name: 'Telaio rinforzato', type: 'bay', r: 1, cost: 140, w: 1, desc: '+1 slot sistemi avanzati.', bad: '-0.4 velocità.', mod: { slots: 1, speedAdd: -0.4 } },
  b_rack: { name: 'Telaio modulare', type: 'bay', r: 2, cost: 240, w: 2, desc: '+2 slot sistemi avanzati.', bad: '-0.8 velocità, -30 integrità.', mod: { slots: 2, speedAdd: -0.8, hp: -30 } },
};
const MODULE_IDS = Object.keys(MODULES);

/** The hardpoints of the hull in use. */
function hardpoints() { return HARDPOINTS[state.hull || 'apc'].pts; }
function loadCap() { return HARDPOINTS[state.hull || 'apc'].cap(); }
/** The load the fitted modules weigh. */
function loadUsed() { return hardpoints().reduce((a, p) => a + (state.fit && state.fit[p.id] ? MODULES[state.fit[p.id].id].w : 0), 0); }
function modCost(id) { return Math.round(MODULES[id].cost * tune.module_cost_k); }
/** True when some hardpoint of this hull takes module id. */
function fitsHull(id) { return hardpoints().some(p => p.types.includes(MODULES[id].type)); }
/** The mod tables of the fitted modules (plates act through platesTake, not here). */
function fittedMods() { const out = []; for (const p of hardpoints()) { const f = state.fit && state.fit[p.id]; if (f) out.push(MODULES[f.id].mod); } return out; }
/** Every module the player has, mounted or in the store. */
function ownedModules() { return Object.values(state.fit || {}).map(f => f.id).concat((state.depot || []).map(f => f.id)); }

// ---- The plates ------------------------------------------------------------------------------------
/** The fitted plates covering one side of the hull: [{f, P}]. */
function platesOn(side) {
  const out = [];
  for (const p of hardpoints()) {
    const f = state.fit && state.fit[p.id]; if (!f) continue;
    const P = MODULES[f.id].plate; if (!P) continue;
    if (P.side === side || (side === 'rear' && P.rear)) out.push({ f, P });
  }
  return out;
}
/** How a plate looks: 4 whole, 3-1 worn, 0 wrecked (the model is rebuilt when this changes). */
function plateStage(c) { return c <= 0.001 ? 0 : Math.ceil(c * 4); }
/**
 * A hit on one side of the command tank: the plates there stop their share (times how whole they
 * are) and wear by the damage they stopped. Returns the damage multiplier.
 */
function platesTake(side, kind, amt) {
  let k = 1;
  for (const { f, P } of platesOn(side)) {
    if (f.cond <= 0) continue;
    const stop = (kind === 'rocket' && P.rocket ? Math.max(P.k, P.rocket) : P.k) * f.cond;
    k *= 1 - stop;
    const before = plateStage(f.cond);
    f.cond = Math.max(0, f.cond - amt * tune.plate_wear * (kind === 'bullet' || kind === 'heavy' ? tune.plate_wear_bullet : 1) / P.dur);
    if (plateStage(f.cond) !== before) {
      state.lookKey++;
      const tk = state.tank;
      if (f.cond <= 0) { floatText(tk.x, tk.y + 3.8, tk.z, MODULES[f.id].name + ' distrutta!', '#ff8a4a'); say('Pilota', MODULES[f.id].name + ': non tiene più niente, va riparata in officina.', '#ff9a7a'); }
      else floatText(tk.x, tk.y + 3.8, tk.z, MODULES[f.id].name + ' ' + Math.round(f.cond * 100) + '%', '#ffd36a');
    }
  }
  return k;
}
/** Scrap to make a plate whole again. */
function plateRepairCost(f) { return Math.ceil((1 - f.cond) * modCost(f.id) * tune.plate_repair_k); }
/** The fitted plates that took damage: [{p (hardpoint), f}]. */
function wornPlates() { return hardpoints().map(p => ({ p, f: state.fit && state.fit[p.id] })).filter(o => o.f && MODULES[o.f.id].plate && o.f.cond < 0.999); }
function repairPlate(hpId) {
  const f = state.fit[hpId]; if (!f) return;
  const c = plateRepairCost(f); if (c <= 0) { state.shopMsg = 'Placca integra.'; return; }
  if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c; f.cond = 1; state.lookKey++; state.shopMsg = MODULES[f.id].name + ' riparata.'; sfx('coin');
}
function repairAllPlates() { for (const o of wornPlates()) if (state.scrap >= plateRepairCost(o.f)) repairPlate(o.p.id); }

// ---- The workshop: offers, mounting, the store -----------------------------------------------------------
/** A random module this hull takes and the player lacks, rarer ones further into the campaign. */
function rollModule(exclude) {
  const pool = MODULE_IDS.filter(id => fitsHull(id) && !exclude.includes(id));
  if (!pool.length) return null;
  const col = (state.node && state.node.col) || 0;
  const wr = [1, tune.mod_rare_w + col * 0.04, tune.mod_exc_w + col * 0.03];
  let x = rng() * (wr[0] + wr[1] + wr[2]), r = 0; while (r < 2 && x > wr[r]) { x -= wr[r]; r++; }
  const same = pool.filter(id => MODULES[id].r === r);
  const from = same.length ? same : pool;
  return from[Math.floor(rng() * from.length)];
}
/** This workshop's offer: 0-3 random modules, rolled once per visit. */
function workshopOffers(site) {
  if (!site.offers) {
    const n = rng() < tune.ws_none ? 0 : 1 + Math.floor(rng() * tune.ws_offers_max), out = [];
    for (let i = 0; i < n; i++) { const id = rollModule(ownedModules().concat(out)); if (id) out.push(id); }
    site.offers = out;
  }
  return site.offers;
}
/** The hardpoint module id would go on: the chosen one if it fits, else a free one, else the first that fits. */
function targetPoint(id) {
  const t = MODULES[id].type, ok = hardpoints().filter(p => p.types.includes(t));
  const sel = ok.find(p => p.id === state.hpSel);
  return sel || ok.find(p => !state.fit[p.id]) || ok[0] || null;
}
/** Mounts module {id, cond} on its hardpoint; what was there goes to the store. False when it cannot. */
function mountModule(mod, quiet) {
  const p = targetPoint(mod.id); if (!p) { state.shopMsg = 'Questo scafo non ha un punto per ' + MODULES[mod.id].name + '.'; return false; }
  const old = state.fit[p.id], load = loadUsed() - (old ? MODULES[old.id].w : 0) + MODULES[mod.id].w;
  if (load > loadCap()) { state.shopMsg = 'Troppo peso: carico ' + load + ' / ' + loadCap() + '. Smonta qualcosa prima.'; return false; }
  const hp0 = tankStats().hp;
  if (old) state.depot.push(old);
  state.fit[p.id] = mod; state.stats = null; state.lookKey++;
  trimSystems();
  const hp1 = tankStats().hp; if (state.tank) { if (hp1 > hp0) state.tank.hp += hp1 - hp0; state.tank.hp = Math.min(state.tank.hp, hp1); }
  if (!quiet) { state.shopMsg = MODULES[mod.id].name + ' montato su ' + p.name + (old ? ' (' + MODULES[old.id].name + ' in magazzino).' : '.'); sfx('coin'); }
  return true;
}
/** Takes the module off a hardpoint into the store. */
function unmountModule(hpId) {
  const f = state.fit[hpId]; if (!f) return;
  delete state.fit[hpId]; state.depot.push(f); state.stats = null; state.lookKey++; trimSystems();
  if (state.tank) state.tank.hp = Math.min(state.tank.hp, tankStats().hp);
  state.shopMsg = MODULES[f.id].name + ' smontato: in magazzino.';
}
/** Mounts a module from the store. */
function mountFromDepot(i) { const f = state.depot[i]; if (!f) return; state.depot.splice(i, 1); if (!mountModule(f)) state.depot.splice(i, 0, f); }
/** What a stored module sells for: module_refund of its price (a worn plate less). */
function sellValue(f) { return Math.floor(modCost(f.id) * tune.module_refund * (MODULES[f.id].plate ? Math.max(0.2, f.cond) : 1)); }
function sellModule(i) {
  const f = state.depot[i]; if (!f) return;
  const v = sellValue(f);
  state.depot.splice(i, 1); state.scrap += v; state.shopMsg = MODULES[f.id].name + ' venduto: +' + v + ' rottami.'; sfx('coin');
}
/** Buys an offered module: mounted at once when it can be, else kept in the store. */
function buyModule(site, id) {
  const c = modCost(id); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c; site.offers = site.offers.filter(o => o !== id);
  const mod = { id, cond: 1 };
  if (!mountModule(mod)) { state.depot.push(mod); state.shopMsg = MODULES[id].name + ' comprato, in magazzino. ' + state.shopMsg; sfx('coin'); }
}
/** A module for free (a cache, a mechanic): on a free hardpoint when it fits, else in the store. Its name. */
function giveModule() {
  const id = rollModule(ownedModules()); if (!id) return null;
  const mod = { id, cond: 1 }, p = targetPoint(id), msg = state.shopMsg;
  if (!(p && !state.fit[p.id] && mountModule(mod, true))) state.depot.push(mod);
  state.shopMsg = msg;
  return MODULES[id].name;
}

// ---- The look: modules on the hull ---------------------------------------------------------------------
/** Where things go on each hull (model units). */
const HULL_DIM = {
  apc: { sx: 1.88, sy: 0.95, len: 4.6, fz: 2.95, fy: 0.85, fw: 2.5, rz: -2.72, ry: 1.25, top: 1.82, roofHull: [-0.5, 1.82, -1.4], tw: 1.0, td: 1.0, th: 0.45, trackX: 1.45, trackW: 0.8, trackL: 5.2 },
  light: { sx: 1.62, sy: 0.72, len: 3.8, fz: 2.4, fy: 0.72, fw: 2.3, rz: -2.05, ry: 1.0, top: 1.27, tw: 1.7, td: 1.9, th: 0.65, roofTur: [-0.55, 0.65, -0.6], trackX: 1.2, trackW: 0.75, trackL: 4.2 },
  mbt: { sx: 1.98, sy: 0.88, len: 4.8, fz: 2.95, fy: 0.85, fw: 2.9, rz: -2.62, ry: 1.25, top: 1.47, tw: 2.2, td: 2.5, th: 0.8, roofTur: [-0.75, 0.9, -0.95], trackX: 1.45, trackW: 0.9, trackL: 5.4 },
};
function hash01(i, s) { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); }
function lerpHex(a, b, t) {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * t, g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t, bl = (a & 255) + ((b & 255) - (a & 255)) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
/**
 * One armour plate made of pieces: whole it is clean; worn it rusts, scorches, bends and loses pieces;
 * at 0 only a few blackened stubs are left. pieces: [[sx, sy, sz, x, y, z, rx, ry, rz]].
 */
function plateParts(par, pieces, hex, cond, seed) {
  const c = plateStage(cond) / 4, col = lerpHex(hex, 0x2e1c14, (1 - c) * 0.85);
  pieces.forEach((q, i) => {
    const h = hash01(i, seed);
    if (h > 0.22 + c * 0.9) return; // shot off
    const bend = (1 - c) * (hash01(i, seed + 3) - 0.5) * 0.9, sag = (1 - c) * hash01(i, seed + 5) * 0.25;
    bx(par, q[0], q[1] * (c ? 1 : 0.55), q[2], h > 0.75 ? lerpHex(col, 0x8e4b27, 0.4) : col, q[3], q[4] - sag, q[5], (q[6] || 0) + bend * 0.5, q[7] || 0, (q[8] || 0) + bend);
  });
  const burns = Math.round((1 - c) * 5);
  for (let i = 0; i < burns && pieces.length; i++) { const q = pieces[Math.floor(hash01(i, seed + 9) * pieces.length)]; bx(par, q[0] * 0.4 + 0.04, q[1] * 0.4, q[2] * 0.4 + 0.04, 0x141210, q[3] + (hash01(i, seed + 11) - 0.5) * 0.2, q[4], q[5], q[6] || 0, q[7] || 0, q[8] || 0); }
}
const MODEL_BUILD = {
  f_plates(g, D, c) { const P = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) P.push([D.fw / 3 - 0.06, 0.42, 0.14, (i - 1) * D.fw / 3, D.fy + j * 0.42, D.fz + j * -0.12, -0.35]); plateParts(g.hull, P, PC.drab, c, 1); for (let i = 0; i < 3; i++) if (plateStage(c) > 1) bx(g.hull, 0.1, 0.1, 0.06, PC.metal, (i - 1) * D.fw / 3, D.fy + 0.2, D.fz + 0.1); },
  f_blade(g, D, c) {
    const P = []; for (let i = 0; i < 5; i++) P.push([D.fw / 5 + 0.2, 0.85, 0.16, (i - 2) * (D.fw + 1) / 5, D.fy - 0.3, D.fz + 0.55 - Math.abs(i - 2) * 0.14, -0.2, (i - 2) * -0.18]);
    plateParts(g.hull, P, 0x8a7a3a, c, 2);
    if (plateStage(c) >= 2) for (let i = 0; i < 4; i++) bx(g.hull, 0.36, 0.14, 0.17, i % 2 ? PC.black : PC.yel, (i - 1.5) * 0.5, D.fy - 0.05, D.fz + 0.63, -0.2);
    for (const s of [-1, 1]) bx(g.hull, 0.14, 0.14, 0.8, PC.metal, s * D.fw * 0.3, D.fy - 0.25, D.fz + 0.2);
  },
  f_comp(g, D, c) { const P = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P.push([D.fw / 4 - 0.04, 0.46, 0.3, (i - 1.5) * D.fw / 4, D.fy + j * 0.44, D.fz + 0.06 - j * 0.16, -0.45]); plateParts(g.hull, P, 0x6a6e5a, c, 3); if (plateStage(c) >= 3) bx(g.hull, D.fw + 0.05, 0.08, 0.32, PC.stripe, 0, D.fy + 0.66, D.fz - 0.1, -0.45); },
  s_plates(g, D, c) { for (const s of [-1, 1]) { const P = []; for (let i = 0; i < 4; i++) P.push([0.14, D.sy, D.len / 4 - 0.08, s * D.sx, D.sy * 0.9 + 0.2, (i - 1.5) * D.len / 4]); plateParts(g.hull, P, PC.drab, c, s + 5); } },
  s_skirts(g, D, c) {
    for (const s of [-1, 1]) {
      const P = []; for (let i = 0; i < 9; i++) P.push([0.08, D.sy * 1.05, 0.08, s * (D.sx + 0.12), D.sy * 0.85 + 0.25, -D.len / 2 + i * D.len / 8]);
      for (let j = 0; j < 3; j++) P.push([0.06, 0.06, D.len, s * (D.sx + 0.12), 0.45 + j * D.sy * 0.45, 0]);
      plateParts(g.hull, P, 0x5a5a50, c, s + 8);
    }
  },
  s_comp(g, D, c) {
    for (const s of [-1, 1]) { const P = []; for (let i = 0; i < 5; i++) { P.push([0.24, D.sy * 1.1, D.len / 5 - 0.06, s * D.sx, D.sy * 0.85 + 0.25, (i - 2) * D.len / 5]); P.push([0.1, 0.3, D.len / 5 - 0.1, s * (D.sx + 0.16), D.sy * 1.4 + 0.2, (i - 2) * D.len / 5]); } plateParts(g.hull, P, 0x6a6e5a, c, s + 12); }
    const R = []; for (let i = 0; i < 3; i++) R.push([D.fw / 3 - 0.06, 0.6, 0.2, (i - 1) * D.fw / 3, D.ry, D.rz - 0.12]); plateParts(g.hull, R, 0x6a6e5a, c, 15);
  },
  d_diesel(g, D) { bx(g.hull, 1.3, 0.35, 0.9, PC.olive2, 0, D.ry + 0.15, D.rz + 0.55); for (const s of [-1, 1]) { bx(g.hull, 0.14, 0.9, 0.14, PC.black, s * 0.75, D.ry + 0.55, D.rz + 0.25); bx(g.hull, 0.2, 0.08, 0.2, PC.rust, s * 0.75, D.ry + 1.0, D.rz + 0.25); } },
  d_turbo(g, D) { bx(g.hull, 1.5, 0.5, 1.0, PC.metal, 0, D.ry + 0.2, D.rz + 0.6); bx(g.hull, 0.6, 0.6, 0.6, PC.grey, 0.4, D.ry + 0.65, D.rz + 0.55); for (const s of [-1, 1]) bx(g.hull, 0.16, 1.2, 0.16, PC.black, s * 0.8, D.ry + 0.8, D.rz + 0.15); bx(g.hull, 0.7, 0.08, 0.7, PC.rust, -0.3, D.ry + 0.46, D.rz + 0.6); },
  d_v12(g, D) { bx(g.hull, 1.9, 0.6, 1.3, 0x6a3518, 0, D.ry + 0.25, D.rz + 0.7); for (let i = 0; i < 6; i++) bx(g.hull, 0.12, 0.7 + (i % 2) * 0.2, 0.12, PC.metal, (i % 2 ? 1 : -1) * 0.95, D.ry + 0.6, D.rz + 0.3 + Math.floor(i / 2) * 0.4, 0, 0, (i % 2 ? -1 : 1) * 0.3); bx(g.hull, 1.0, 0.25, 0.3, PC.yel, 0, D.ry + 0.6, D.rz + 1.2); },
  d_wide(g, D) { for (const s of [-1, 1]) { bx(g.hull, 0.35, 0.3, D.trackL, PC.track, s * (D.trackX + D.trackW / 2 + 0.15), 0.18, 0); for (let i = 0; i < 9; i++) bx(g.hull, 0.4, 0.08, 0.2, 0x45403a, s * (D.trackX + D.trackW / 2 + 0.15), 0.34, -D.trackL / 2 + 0.3 + i * (D.trackL - 0.6) / 8); } },
  d_race(g, D) { for (const s of [-1, 1]) { for (let i = -2; i <= 2; i++) bx(g.hull, 0.1, 0.32, 0.32, 0xc8502a, s * (D.trackX + D.trackW / 2 + 0.04), 0.36, i * D.trackL / 5.2); bx(g.hull, 0.1, 0.08, D.trackL * 0.9, PC.yel, s * (D.trackX + D.trackW / 2 + 0.05), 0.72, 0); } },
  t_ring(g, D) { bx(g.tur, D.tw + 0.25, 0.1, D.td + 0.25, PC.brass, 0, 0.03, 0); },
  t_gyro(g, D) { bx(g.tur, 0.42, 0.42, 0.42, PC.metal, D.tw / 2 + 0.2, D.th * 0.5, -D.td * 0.15); bx(g.tur, 0.5, 0.06, 0.5, PC.cyan, D.tw / 2 + 0.2, D.th * 0.5 + 0.24, -D.td * 0.15); },
  t_servo(g, D) { bx(g.tur, D.tw * 0.6, D.th * 0.6, 0.5, PC.metal, 0, D.th * 0.4, -D.td / 2 - 0.25); bx(g.tur, 0.08, 0.08, 0.8, PC.yel, D.tw * 0.25, D.th * 0.2, -D.td / 2 - 0.2); },
  t_stab(g, D) { bx(g.tur, 0.5, 0.36, 0.7, PC.black, -D.tw / 2 - 0.2, D.th * 0.55, D.td * 0.1); bx(g.tur, 0.3, 0.2, 0.08, PC.cyan, -D.tw / 2 - 0.2, D.th * 0.6, D.td * 0.1 + 0.37); bx(g.tur, D.tw + 0.25, 0.1, D.td + 0.25, PC.brass, 0, 0.03, 0); },
  c_heavy(g, D) { bx(g.tur, 0.18, 0.18, 1.3, PC.black, D.tw * 0.3, D.th * 0.55, D.td / 2 + 0.55); },
  c_water(g, D) { bx(g.tur, 0.3, 0.3, 1.0, 0x6b6a45, D.tw * 0.3, D.th * 0.55, D.td / 2 + 0.45); bx(g.tur, 0.12, 0.12, 0.5, PC.black, D.tw * 0.3, D.th * 0.55, D.td / 2 + 1.15); },
  c_twin(g, D) { for (const s of [0.22, 0.42]) bx(g.tur, 0.14, 0.14, 1.3, PC.black, D.tw * s, D.th * 0.55, D.td / 2 + 0.55); bx(g.tur, 0.5, 0.36, 0.4, 0x4a4a30, D.tw * 0.32, D.th * 0.55, D.td / 2 - 0.1); bx(g.tur, 0.5, 0.06, 0.06, PC.brass, D.tw * 0.32, D.th * 0.3, D.td / 2 + 0.05); },
  g_brake(g, D, c, L) { bx(g.gun, 0.6, 0.36, 0.5, PC.black, 0, 0, L + 0.1); bx(g.gun, 0.64, 0.1, 0.12, PC.metal, 0, 0, L + 0.25); },
  g_long(g, D, c, L) { bx(g.gun, 0.38, 0.38, 0.5, PC.olive2, 0, 0, L * 0.45); bx(g.gun, 0.34, 0.34, 0.4, PC.black, 0, 0, L); },
  g_twin(g, D, c, L) { const o = D.tw * 0.24; bx(g.gun, 0.28, 0.28, L, PC.metal, o, 0, L / 2); bx(g.gun, 0.4, 0.4, 0.4, PC.black, o, 0, L); bx(g.gun, o + 0.4, 0.4, 0.5, PC.olive2, o / 2, 0, 0.2); },
  h_turret(g, D) { for (const s of [-1, 1]) { bx(g.tur, 0.36, D.th * 1.05, D.td * 0.7, PC.drab, s * (D.tw / 2 + 0.16), D.th * 0.5, D.td * 0.1, 0, s * 0.12, 0); bx(g.tur, 0.4, 0.1, D.td * 0.7, PC.stripe, s * (D.tw / 2 + 0.18), D.th * 1.02, D.td * 0.1, 0, s * 0.12, 0); } bx(g.tur, D.tw * 0.9, D.th * 0.75, 0.9, PC.olive2, 0, D.th * 0.45, -D.td / 2 - 0.4); for (let i = 0; i < 3; i++) bx(g.tur, 0.5, 0.3, 0.3, 0x6b7a3a, (i - 1) * 0.6, D.th * 0.95, -D.td / 2 - 0.5); },
  r_radio(g, D, c, L, R) { bx(R.p, 0.09, 2.6, 0.09, PC.black, R.x, R.y + 1.3, R.z); bx(R.p, 0.5, 0.35, 0.4, 0x4f5a34, R.x, R.y + 0.18, R.z + 0.3); bx(R.p, 0.2, 0.2, 0.2, PC.cyan, R.x, R.y + 2.6, R.z); },
  r_seis(g, D, c, L, R) { for (const s of [-1, 1]) { bx(g.hull, 0.3, 0.3, 0.3, PC.yel, s * (D.sx - 0.3), D.top + 0.1, D.rz + 0.5); bx(g.hull, 0.08, 0.9, 0.08, PC.metal, s * (D.sx - 0.3), D.top - 0.2, D.rz + 0.5); } bx(R.p, 0.4, 0.2, 0.4, PC.metal, R.x, R.y + 0.1, R.z); },
  r_mast(g, D, c, L, R) { const H = 3.4; for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [0, 0.18]]) bx(R.p, 0.06, H, 0.06, PC.metal, R.x + dx, R.y + H / 2, R.z + dz); for (let i = 1; i < 5; i++) bx(R.p, 0.44, 0.05, 0.44, PC.metal, R.x, R.y + i * H / 5, R.z, 0, i * 0.5, 0); bx(R.p, 0.9, 0.06, 0.06, PC.black, R.x, R.y + H, R.z); bx(R.p, 0.22, 0.22, 0.22, PC.red, R.x, R.y + H + 0.12, R.z); },
  r_long(g, D, c, L, R) { const H = 4.2; bx(R.p, 0.1, H, 0.1, PC.black, R.x, R.y + H / 2, R.z); for (const h of [0.5, 0.7, 0.85]) bx(R.p, 1.2 - h, 0.05, 0.05, PC.black, R.x, R.y + H * h, R.z); bx(R.p, 0.7, 0.5, 0.5, 0x4f5a34, R.x, R.y + 0.25, R.z + 0.35); bx(R.p, 0.2, 0.2, 0.2, PC.cyan, R.x, R.y + H, R.z); },
  r_radar(g, D, c, L, R) { bx(R.p, 0.12, 0.8, 0.12, PC.metal, R.x, R.y + 0.4, R.z); const d = new THREE.Group(); d.position.set(R.x, R.y + 0.85, R.z); R.p.add(d); bx(d, 1.3, 0.5, 0.08, PC.grey, 0, 0, 0, 0.3); bx(d, 0.1, 0.1, 0.3, PC.black, 0, 0, 0.15); g.root.userData.radar = d; },
  r_tac(g, D, c, L, R) { bx(R.p, 0.14, 1.0, 0.14, PC.metal, R.x, R.y + 0.5, R.z); const d = new THREE.Group(); d.position.set(R.x, R.y + 1.1, R.z); R.p.add(d); bx(d, 1.6, 0.7, 0.1, 0x3a4a52, 0, 0, 0, 0.2); for (let i = 0; i < 4; i++) bx(d, 0.3, 0.5, 0.04, PC.cyan, (i - 1.5) * 0.36, 0, 0.06, 0.2); g.root.userData.radar = d; },
  b_handles(g, D) { for (const s of [-1, 1]) { bx(g.hull, 0.06, 0.06, D.len * 0.8, PC.brass, s * (D.sx - 0.55), D.top + 0.18, -0.3); for (let i = 0; i < 4; i++) bx(g.hull, 0.06, 0.2, 0.06, PC.brass, s * (D.sx - 0.55), D.top + 0.08, -0.3 - D.len * 0.35 + i * D.len * 0.23); } },
  b_bay(g, D) { bx(g.hull, 2.1, 0.55, 2.0, PC.olive2, 0, D.top + 0.27, -1.3); bx(g.hull, 2.12, 0.08, 0.3, PC.stripe, 0, D.top + 0.4, -0.4); for (const s of [-1, 1]) bx(g.hull, 0.04, 0.16, 0.4, PC.black, s * 1.06, D.top + 0.3, -1.4); },
  b_frame(g, D) { for (const s of [-1, 1]) for (const z of [-2.2, -0.4]) bx(g.hull, 0.1, 0.6, 0.1, PC.metal, s * 1.0, D.top + 0.3, z); for (const s of [-1, 1]) bx(g.hull, 0.1, 0.1, 1.9, PC.metal, s * 1.0, D.top + 0.6, -1.3); bx(g.hull, 0.8, 0.5, 0.6, 0x6b7a3a, 0.4, D.top + 0.25, -1.9); },
  b_rack(g, D) { for (const s of [-1, 1]) for (const z of [-2.4, -1.3, -0.2]) bx(g.hull, 0.1, 0.8, 0.1, PC.metal, s * 1.05, D.top + 0.4, z); for (const s of [-1, 1]) bx(g.hull, 0.1, 0.1, 2.3, PC.metal, s * 1.05, D.top + 0.8, -1.3); for (let i = 0; i < 3; i++) bx(g.hull, 0.6, 0.45, 0.6, i % 2 ? 0x8a6a3c : 0x6b7a3a, -0.6 + i * 0.6, D.top + 0.23, -1.3 - (i % 2) * 0.6); },
};
/**
 * Puts the fitted modules on the command vehicle's model g (made by the hull's own builder). The
 * barrel length L comes from the weapon; the roof goes on the turret, or on the hull of the APC.
 */
function dressTank(g, hull) {
  const D = HULL_DIM[hull], u = g.userData, G = { hull: u.hull, tur: u.turret, gun: u.gun, root: g };
  const L = tankBarrel(hull);
  const R = D.roofHull ? { p: u.hull, x: D.roofHull[0], y: D.roofHull[1], z: D.roofHull[2] } : { p: u.turret, x: D.roofTur[0], y: D.roofTur[1], z: D.roofTur[2] };
  for (const p of hardpoints()) { const f = state.fit && state.fit[p.id]; if (f && MODEL_BUILD[f.id]) MODEL_BUILD[f.id](G, D, f.cond, L, R); }
}
/** The command vehicle's barrel length on its model. */
function tankBarrel(hull) { return tankStats().barrel * (hull === 'mbt' ? 1 : hull === 'light' ? 0.8 : 0.9); }
/** The fitted plates, for the HUD: [{name, cond, side}]. */
function plateStatus() { return hardpoints().map(p => state.fit && state.fit[p.id]).filter(f => f && MODULES[f.id].plate).map(f => ({ name: MODULES[f.id].name, cond: f.cond, side: MODULES[f.id].plate.side })); }
