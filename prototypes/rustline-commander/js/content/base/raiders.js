// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Content pack "base": the Horde's base raiders and their weapons (the registry: js/systems/horde.js).
'use strict';

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
