// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The Horde's registry and its base raiders. Every enemy is one entry: its numbers, its weapon, its
// model and its ways; the systems read the entry and never name a kind. A new enemy is one
// registerEnemy() call (enemies.js adds twelve). (docs/architecture/rustline-modular-plan.md)
'use strict';

/**
 * The enemy registry. An entry:
 *   name, short (dev panel), veh, rad (body radius), heavy (shrugs off rifles), w (its weapon id),
 *   hp(e) the hit points before the tier (or hpOf(e, k) for the whole value), speed() its pace;
 * optional:
 *   eye (eye height), turret (deg/s, or a function), alignTol (rad before it fires), hullTurnMove
 *   (deg/s while driving), muzzle [ahead, up], blastK (blast damage taken), loot() (chance of a crate),
 *   tally (state counter bumped by a kill), deathSay (the radio line), bigBar (a long health bar),
 *   rocket (an anti-tank rocket man), noFlank (never sent round the side), circleSmart (circles the
 *   target, firing), model() (its figure), think(e, w, g) (its own way of fighting, true when it
 *   decided), spot(e, g) (raises the alarm on sight), onKill(e).
 */
const ENEMY = adopt('enemy', {});
/** Weapon makers by id, for every weapon the allies' own switch does not know (weapon() asks here). */
const EXTRA_W = adopt('weapon', {});

/** Adds an enemy kind: the registry, the unit table, the heavy set, the dev panel and the figures sheet. */
function registerEnemy(id, D) {
  register('enemy', id, D);
  UT[id] = { name: D.name, team: 1, veh: !!D.veh, rad: D.rad, w: D.w, inert: !!D.inert };
  if (D.heavy) HEAVY.add(id);
  DEV_ENEMIES.push(id);
  FIGS.push([id, D.name]);
  if (D.model) registry('model')[id] = D.model;
  return D;
}
/** An enemy's hit points: its own, times the tier (square-rooted on vehicles). */
function enemyHp(e) {
  const D = ENEMY[e.kind], k = 1 + ((e.tier || 1) - 1) * tune.tier_scale;
  return D.hpOf ? D.hpOf(e, k) : D.hp() * (D.veh ? Math.sqrt(k) : k);
}
/** An enemy's turret speed, deg/s (160 when it says nothing). */
function enemyTurret(D) { return (D && (typeof D.turret === 'function' ? D.turret() : D.turret)) || 160; }

// ---- The base raiders' weapons ------------------------------------------------------------------------------
Object.assign(EXTRA_W, {
  r_rifle: () => ({ kind: 'bullet', range: tune.rifle_range * 0.95, dmg: tune.rifle_damage, rate: 1.4, acc: tune.raider_acc }),
  r_mg: () => ({ kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate * 1.1, acc: tune.raider_acc * 0.7, snd: 'mg', chip: 0.5, arc: tune.mg_arc, turn: tune.mg_turn }),
  rpg: () => ({ kind: 'rpg', range: tune.rpg_range, dmg: tune.rpg_damage, rate: tune.rpg_rate, blast: 1.5 }),
  r_mount: () => ({ kind: 'bullet', range: tune.mg_range + 2, dmg: tune.mg_damage, rate: tune.mg_rate * 1.2, acc: tune.raider_acc * 0.75, snd: 'mg', chip: 0.5 }),
  boss: () => ({ kind: 'shell', range: 48, dmg: tune.boss_damage, rate: tune.boss_reload, blast: 2.3 }),
});

// ---- The base raiders ----------------------------------------------------------------------------------------
registerEnemy('r_rifle', { name: 'Predone', short: 'Fucile', w: 'r_rifle', hpOf: (e, k) => tune.raider_hp * k, speed: () => tune.inf_speed * 0.92, model: () => makeSoldier('r_rifle') });
registerEnemy('r_mg', { name: 'Mitragliere predone', short: 'Mitragl.', w: 'r_mg', hpOf: (e, k) => tune.raider_hp * k * 1.25, speed: () => tune.inf_speed * 0.85, noFlank: true, model: () => makeSoldier('r_mg') });
registerEnemy('r_rpg', { name: 'Razziere', short: 'Razzi', w: 'rpg', hpOf: (e, k) => tune.raider_hp * k, speed: () => tune.inf_speed * 0.92, rocket: true, model: () => makeSoldier('r_rpg') });
registerEnemy('technical', { name: 'Tecnica', short: 'Tecnica', veh: true, rad: 1.6, w: 'r_mount', hpOf: (e, k) => tune.technical_hp * k, speed: () => tune.technical_speed, circleSmart: true, tally: 'techKills', model: () => makeTechnicalModel() });
registerEnemy('boss', {
  name: 'Carro del Capo', short: 'Capo', veh: true, heavy: true, rad: 2.8, w: 'boss', hpOf: () => tune.boss_hp, speed: () => 2.6,
  eye: 2.9, turret: () => tune.boss_turret_speed, alignTol: 0.05, hullTurnMove: 45, muzzle: [6.2, 2.4], blastK: 0.8, loot: () => 1,
  deathSay: 'Il Carro del Capo è in fiamme!', bigBar: true, model: () => makeBossModel(),
});

// ---- Events (core.js) ----------------------------------------------------------------------------------------
on('kill', e => { const D = ENEMY[e.kind]; if (D && D.onKill) D.onKill(e); }); // a bomber's charge, a fuel depot going up
