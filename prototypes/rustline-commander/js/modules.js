// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-28
// The command vehicle's 9 standard systems (iteration 61, the redesign in design/game-brief.md): each one
// is bought up level by level with scrap, FTL-style, and each level shows on the hull with the parts the
// old modules drew (content/base/modules.js: looks only). Advanced systems go in the hull's slots (loadout.js).
'use strict';

/**
 * The standard systems. icon: the HUD's part icon; look[l]: the part looks the hull wears at level l;
 * up(k): what one level gives, for the workshop's line (the numbers: std_<id>_k in config.js).
 */
const STD_SYSTEMS = [
  { id: 'turret', short: 'Torretta', desc: "Il motore che gira la torretta: più livelli, più in fretta il cannone arriva dove punta il mouse.", name: 'Torretta', icon: 'turret', look: [[], ['t_ring'], ['t_servo'], ['t_ring', 't_servo']], up: k => 'torretta +' + pc(k) },
  { id: 'stab', short: 'Stabilizzatore', desc: "Tiene il cannone fermo mentre lo scafo si muove: si spara meglio in marcia e si mira prima.", name: 'Stabilizzatore', icon: 'stab', look: [[], ['t_gyro'], ['t_gyro'], ['t_stab']], up: k => 'dispersione in moto -' + pc(k) + ', mira più rapida' },
  { id: 'gun', short: 'Arma principale', desc: "Lavori sull'arma principale: ricarica più rapida, più danno e meno dispersione.", name: 'Arma principale', icon: 'cannon', look: [[], ['g_brake'], ['g_long'], ['g_long', 'g_brake']], up: k => 'ricarica -' + pc(k) + ', danno +' + pc(k * 0.8) + ', dispersione -' + pc(k * 0.8) },
  { id: 'coax', short: 'Coassiale', desc: "La mitragliatrice del click destro: regge più a lungo prima di scaldarsi e spara più in fretta.", name: 'Mitragliatrice coassiale', icon: 'coax', look: [[], ['c_heavy'], ['c_water'], ['c_twin']], up: k => 'calore sopportato +' + pc(k) + ', cadenza +' + pc(k * 0.12) },
  { id: 'armor', short: 'Corazza', desc: "Piastre sullo scafo: meno danni presi (sul retro metà dell'effetto) e più integrità.", name: 'Corazza', icon: 'armor', look: [[], ['f_plates'], ['f_plates', 's_plates'], ['f_comp', 's_comp']], up: k => 'danni subiti -' + pc(k) + ' (retro metà), +' + Math.round(tune.std_armor_hp) + ' integrità' },
  { id: 'engine', short: 'Motore', desc: "Più velocità di punta e molta più accelerazione.", name: 'Motore', icon: 'engine', look: [[], ['d_diesel'], ['d_turbo'], ['d_v12']], up: k => 'velocità +' + pc(k) + ', accelerazione +' + pc(k * 4) },
  { id: 'tracks', short: 'Cingoli e ruote', desc: "Lo scafo ruota più in fretta e sale su gradini più alti.", name: 'Cingoli e ruote', icon: 'tracks', look: [[], ['d_wide'], ['d_wide'], ['d_race']], up: k => 'rotazione +' + pc(k) + ', sale +' + (k * 1.5).toFixed(2) + ' m' },
  { id: 'bay', short: 'Vano truppe', desc: "Più posti a bordo per portare la fanteria.", name: 'Vano truppe', icon: 'seats', look: [[], ['b_handles'], ['b_bay'], ['b_bay', 'b_handles']], up: k => '+' + Math.round(k) + ' posti' },
  { id: 'radio', short: 'Radio', desc: "Più raggio radio: si comandano e si portano avanti squadre più lontane.", name: 'Radio', icon: 'radio', look: [[], ['r_radio'], ['r_mast'], ['r_long']], up: k => 'raggio radio +' + pc(k) },
];
const STD = Object.fromEntries(STD_SYSTEMS.map(S => [S.id, S]));
function pc(k) { return Math.round(k * 100) + '%'; }
/** A standard system's level (0: as it came from the factory). */
function lvl(id) { return (state.lv && state.lv[id]) || 0; }
function stdMax() { return Math.round(tune.std_max_level); }
/** Scrap for the next level of system id (null at the top). */
function stdCost(id) { const l = lvl(id); return l >= stdMax() ? null : Math.round(tune.std_cost * (l + 1)); }
/** Raises system id one level; the tank keeps its damage, the new integrity comes whole. */
function raiseStd(id) {
  const hp0 = tankStats().hp;
  state.lv[id] = lvl(id) + 1; state.stats = null; state.lookKey++;
  const tk = state.tank, hp1 = tankStats().hp; if (tk && hp1 > hp0) { tk.maxhp = hp1; tk.hp += hp1 - hp0; }
}
/** Buys the next level of system id. */
function upgradeStd(id) {
  const c = stdCost(id); if (c == null) return;
  if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c; raiseStd(id); sfx('coin');
  state.shopMsg = STD[id].name + ' al livello ' + lvl(id) + '.';
}
/** A free level on a random standard system not at the top (a cache, a mechanic). Its name, or null. */
function giveModule() {
  const ids = STD_SYSTEMS.map(S => S.id).filter(id => lvl(id) < stdMax()); if (!ids.length) return null;
  const id = ids[Math.floor(rng() * ids.length)]; raiseStd(id);
  return STD[id].name + ' livello ' + lvl(id);
}
/** The standard systems' effect, in the keys tankStats reads (gun* act on top of the main weapon). */
function stdMods() {
  const L = id => lvl(id) * tune['std_' + id + '_k'];
  return [{
    turret: 1 + L('turret'), moveSpread: Math.max(0.2, 1 - L('stab')), aim: Math.max(0.5, 1 - L('stab') * 0.5),
    gunReload: Math.max(0.4, 1 - L('gun')), gunDmg: 1 + L('gun') * 0.8, gunSpread: Math.max(0.4, 1 - L('gun') * 0.8),
    mgHeat: 1 + L('coax'), mgCool: 1 + L('coax') * 0.5, mgRate: 1 / (1 + L('coax') * 0.12),
    hp: lvl('armor') * tune.std_armor_hp, speed: 1 + L('engine'), accel: 1 + L('engine') * 4,
    turn: 1 + L('tracks'), climb: L('tracks') * 1.5, seats: Math.round(L('bay')), radio: 1 + L('radio'),
  }];
}
/** The armour's share of a hit that gets through (combat.js): each level stops std_armor_k, half of it on the rear. */
function armorTake(side) { return Math.max(0.2, 1 - lvl('armor') * tune.std_armor_k * (side === 'rear' ? 0.5 : 1)); }

/** The old modules, now only the looks of the standard levels and of some advanced systems. */
const MODULES = adopt('module', {});
/** Adds a look (build(g, D, c, L, R): its parts on the hull, D the hull's sizes, c 1). */
function registerModule(id, D) { return register('module', id, D); }
/** How a plate looks: 4 whole (the standard armour does not wear). */
function plateStage(c) { return c <= 0.001 ? 0 : Math.ceil(c * 4); }

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
 * Puts the standard systems' looks and the advanced systems' looks on the command vehicle's model g
 * (made by the hull's own builder). The barrel length L comes from the weapon; the roof goes on the
 * turret, or on the hull of the APC.
 */
function dressTank(g, hull) {
  const D = HULL_DIM[hull], u = g.userData, G = { hull: u.hull, tur: u.turret, gun: u.gun, root: g };
  const L = tankBarrel(hull);
  const R = D.roofHull ? { p: u.hull, x: D.roofHull[0], y: D.roofHull[1], z: D.roofHull[2] } : { p: u.turret, x: D.roofTur[0], y: D.roofTur[1], z: D.roofTur[2] };
  const ids = [];
  for (const S of STD_SYSTEMS) ids.push(...S.look[Math.min(lvl(S.id), S.look.length - 1)]);
  for (const id of state.systems || []) if (SYSTEMS[id] && SYSTEMS[id].look) ids.push(SYSTEMS[id].look);
  for (const id of ids) if (MODULES[id] && MODULES[id].build) MODULES[id].build(G, D, 1, L, R);
}
/** The command vehicle's barrel length on its model. */
function tankBarrel(hull) { return tankStats().barrel * (hull === 'mbt' ? 1 : hull === 'light' ? 0.8 : 0.9); }
// The workshop tab and the field view of the systems: js/systems/tankscreen.js (iteration 72).
