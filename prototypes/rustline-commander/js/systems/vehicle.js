// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The command vehicle: the hulls, what unlocks them between runs, and its live numbers. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

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
  else { s.dmg = W.dmg; s.reload = W.reload; s.blast = W.blast; s.fireSpread = tune.spread_fire * W.spreadK; s.barrel = W.barrel; s.pen = W.pen; s.dtype = W.dtype || null; }
  s.dmg *= G.dmg; s.reload *= G.reload; s.fireSpread *= G.spread; s.barrel *= G.barrel; // the gun's own modules
  const wk = W.weight * HULLS[h].weightK; s.speed = Math.max(2, s.speed - wk); s.reverse = Math.max(1, s.reverse - wk * 0.5);
  applyMods(s);
  state.stats = s; state.statsStep = state.stepN;
  return s;
}
function tankLook() { return { hull: state.hull || 'apc', barrel: tankBarrel(state.hull || 'apc'), antenna: 1.4, armor: 0, radio: 0 }; }
