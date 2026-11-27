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
const MODULES = adopt('module', {});
/** Adds a module (the fields above, and build(g, D, c): its look on the hull, D the hull's sizes, c its condition). */
function registerModule(id, D) { return register('module', id, D); }
/** The modules' ids in their order (the workshop rolls over them). */
function moduleIds() { return Object.keys(MODULES); }

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
  const pool = moduleIds().filter(id => fitsHull(id) && !exclude.includes(id));
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
/**
 * Puts the fitted modules on the command vehicle's model g (made by the hull's own builder). The
 * barrel length L comes from the weapon; the roof goes on the turret, or on the hull of the APC.
 */
function dressTank(g, hull) {
  const D = HULL_DIM[hull], u = g.userData, G = { hull: u.hull, tur: u.turret, gun: u.gun, root: g };
  const L = tankBarrel(hull);
  const R = D.roofHull ? { p: u.hull, x: D.roofHull[0], y: D.roofHull[1], z: D.roofHull[2] } : { p: u.turret, x: D.roofTur[0], y: D.roofTur[1], z: D.roofTur[2] };
  for (const p of hardpoints()) { const f = state.fit && state.fit[p.id]; if (f && MODULES[f.id] && MODULES[f.id].build) MODULES[f.id].build(G, D, f.cond, L, R); }
}
/** The command vehicle's barrel length on its model. */
function tankBarrel(hull) { return tankStats().barrel * (hull === 'mbt' ? 1 : hull === 'light' ? 0.8 : 0.9); }
/** The fitted plates, for the HUD: [{name, cond, side}]. */
function plateStatus() { return hardpoints().map(p => state.fit && state.fit[p.id]).filter(f => f && MODULES[f.id].plate).map(f => ({ name: MODULES[f.id].name, cond: f.cond, side: MODULES[f.id].plate.side })); }

// ---- The workshop tab (js/systems/workshop.js) -------------------------------------------------------------
registerShopTab('modules', {
  name: 'Moduli', order: 10,
  preview: true, // the vehicle turns in the middle window
  draw(x0, y0, w, h, cy) {
    // the modules: hardpoints on the left, the vehicle in the middle, this workshop's offer and the store on the right
    const lx = x0 + 24, lw = 356, rw = 330, rx = x0 + w - 24 - rw, wx = lx + lw + 12, ww = rx - 12 - wx, wy = cy - 4, wh = y0 + h - 56 - wy;
    ctx.clearRect(wx, wy, ww, wh); rrect(wx, wy, ww, wh, 6, null, '#7a5a40');
    const S0 = tankStats(), used = loadUsed(), cap = loadCap();
    rrect(wx + 4, wy + wh - 62, ww - 8, 58, 4, 'rgba(14,10,8,0.72)', null);
    text('Velocità ' + S0.speed.toFixed(1) + '   Integrità ' + Math.round(S0.hp), wx + ww / 2, wy + wh - 48, 12, HC.text);
    text('Radio ' + Math.round(S0.radio) + '   Torretta ' + Math.round(S0.turret) + '°/s', wx + ww / 2, wy + wh - 32, 12, HC.text);
    const pf = platesOn('front').reduce((a, o) => a * (1 - o.P.k * o.f.cond), 1), ps = platesOn('side').reduce((a, o) => a * (1 - o.P.k * o.f.cond), 1);
    text('Placche: fronte -' + Math.round((1 - pf) * 100) + '%  fianchi -' + Math.round((1 - ps) * 100) + '%', wx + ww / 2, wy + wh - 16, 12, '#b6d77a');
    text('Punti di attacco', lx, cy + 6, 17, '#ffd9a0', 'left');
    text('carico ' + used + ' / ' + cap, lx + lw, cy + 6, 14, used >= cap ? '#e0a070' : HC.gold, 'right');
    bar(lx, cy + 18, lw, 6, Math.min(1, used / Math.max(1, cap)), used >= cap ? '#e0a070' : '#ffe08a');
    const pts = hardpoints(), RH = 60;
    pts.forEach((p, r) => {
      const yy = cy + 32 + r * RH, f = state.fit[p.id], M = f && MODULES[f.id], sel = state.hpSel === p.id;
      button(lx, yy, lw - 84, RH - 6, '', () => { state.hpSel = sel ? null : p.id; state.shopMsg = sel ? '' : p.name + ': i moduli che compri o monti vanno qui (se ci stanno).'; }, { active: sel });
      partIcon(MOD_ICON[M ? M.type : p.types[0]], lx + 22, yy + 27, 26);
      text(p.name, lx + 44, yy + 14, 15, HC.text, 'left');
      text(p.types.map(t => MOD_TYPE[t]).join(', '), lx + 44 + ctx.measureText(p.name).width + 10, yy + 14, 11, HC.dim, 'left');
      if (M) {
        text(M.name, lx + 44, yy + 32, 14, RARITY[M.r].col, 'left'); text('peso ' + M.w, lx + lw - 92, yy + 32, 11, HC.dim, 'right');
        if (M.plate) { bar(lx + 44, yy + 41, 150, 6, f.cond, f.cond > 0.5 ? '#8fd86a' : f.cond > 0 ? '#e0a050' : '#5a3a32'); text(f.cond > 0 ? Math.round(f.cond * 100) + '%' : 'distrutta', lx + 200, yy + 45, 11, f.cond > 0 ? HC.dim : '#e0503a', 'left'); }
        else text(wrap(M.desc, lw - 140, 11)[0], lx + 44, yy + 46, 11, HC.dim, 'left');
        button(lx + lw - 78, yy + 12, 78, 30, 'Smonta', () => unmountModule(p.id), { size: 13 });
      } else text('vuoto: di serie', lx + 44, yy + 34, 13, sel ? '#d8e8b8' : '#8a7a68', 'left');
    });
    text('Click su un punto per scegliere dove montare.', lx, cy + 40 + pts.length * RH, 12, HC.dim, 'left');
    // the offer: rolled once per visit
    const offers = workshopOffers(state.shopSite);
    text('In vendita qui (' + offers.length + ')', rx, cy + 6, 17, '#ffd9a0', 'left');
    if (!offers.length) text('Oggi il meccanico non ha moduli nuovi.', rx, cy + 34, 13, HC.dim, 'left');
    offers.forEach((id, i) => {
      const M = MODULES[id], yy = cy + 20 + i * 86, c = modCost(id), t = targetPoint(id), afford = state.scrap >= c;
      button(rx, yy, rw, 80, '', () => buyModule(state.shopSite, id), { off: !afford });
      partIcon(MOD_ICON[M.type], rx + 20, yy + 22, 22);
      text(M.name, rx + 38, yy + 15, 14, afford ? RARITY[M.r].col : '#9a8a78', 'left');
      text(RARITY[M.r].name + ' · ' + MOD_TYPE[M.type] + ' · peso ' + M.w, rx + 38, yy + 31, 11, HC.dim, 'left');
      text(wrap(M.desc, rw - 20, 11)[0], rx + 10, yy + 48, 11, HC.text, 'left');
      if (M.bad) text(wrap(M.bad, rw - 20, 11)[0], rx + 10, yy + 63, 11, '#e08a6a', 'left'); else if (wrap(M.desc, rw - 20, 11)[1]) text(wrap(M.desc, rw - 20, 11)[1], rx + 10, yy + 63, 11, HC.text, 'left');
      text(c + ' rottami', rx + rw - 8, yy + 15, 13, HC.gold, 'right');
      text(t ? '→ ' + t.name : 'non va su questo scafo', rx + rw - 8, yy + 31, 11, t ? '#b6d77a' : '#e08a6a', 'right');
    });
    // the store: modules taken off, or bought with no room
    const sy = cy + 20 + Math.max(1, offers.length) * 86 + 14;
    text('Magazzino (' + state.depot.length + ')  ·  click per montare', rx, sy, 15, '#ffd9a0', 'left');
    if (!state.depot.length) text('Vuoto.', rx, sy + 22, 13, HC.dim, 'left');
    const maxN = Math.max(1, Math.floor((y0 + h - 60 - sy - 12) / 40));
    state.depot.slice(0, maxN).forEach((f, i) => {
      const M = MODULES[f.id], yy = sy + 12 + i * 40, v = sellValue(f);
      button(rx, yy, rw - 88, 36, '', () => mountFromDepot(i));
      text(M.name + (M.plate && f.cond < 0.999 ? ' (' + Math.round(f.cond * 100) + '%)' : ''), rx + 10, yy + 12, 13, RARITY[M.r].col, 'left');
      text(MOD_TYPE[M.type] + ' · peso ' + M.w, rx + 10, yy + 27, 11, HC.dim, 'left');
      button(rx + rw - 82, yy, 82, 36, 'Vendi ' + v, () => sellModule(i), { size: 12 });
    });
  },
});
