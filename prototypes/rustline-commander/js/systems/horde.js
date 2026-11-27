// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// The Horde's registry: every enemy is one entry (its numbers, its weapon, its model and its ways), the
// systems read the entry and never name a kind. The enemies themselves are content: registerEnemy() calls
// in a content pack (js/content/base/raiders.js, enemies.js). (docs/architecture/rustline-modular-plan.md)
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

// ---- Events (core.js) ----------------------------------------------------------------------------------------
on('kill', e => { const D = ENEMY[e.kind]; if (D && D.onKill) D.onKill(e); }); // a bomber's charge, a fuel depot going up
