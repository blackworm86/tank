// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The unit types and their weapons (allies, the Horde's base raiders, vehicles). (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Units and weapons ----------------------------------------------------------------------------
/** Every unit kind. veh: a vehicle; rad: its body radius. */
const UT = {
  tank: { name: 'Carro comando', team: 0, veh: true, rad: 2.2 },
  rifle: { name: 'Fuciliere', team: 0, w: 'rifle', cost: 'cost_rifle' },
  sniper: { name: 'Cecchino', team: 0, w: 'sniper', cost: 'cost_sniper' },
  mg: { name: 'Mitragliere', team: 0, w: 'mg', cost: 'cost_mg' },
  medic: { name: 'Medico', team: 0, w: 'pistol', cost: 'cost_medic' },
  eng: { name: 'Geniere', team: 0, w: 'carbine', cost: 'cost_eng' },
  radio: { name: 'Operatore radio', team: 0, w: 'carbine', cost: 'cost_radio' },
  scout: { name: 'Esploratore', team: 0, w: 'scout', cost: 'cost_scout' },
  mortar: { name: 'Artigliere', team: 0, w: 'mortar', cost: 'cost_mortar' },
  at: { name: 'Cannone anticarro', team: 0, w: 'atgun', cost: 'cost_at' },
  car: { name: 'Autoblindo', team: 0, veh: true, rad: 1.6, w: 'autocannon', cost: 'cost_car' },
  ltank: { name: 'Carro di supporto', team: 0, veh: true, rad: 1.9, w: 'ltgun', cost: 'cost_ltank' },
  r_rifle: { name: 'Predone', team: 1, w: 'r_rifle' },
  r_mg: { name: 'Mitragliere predone', team: 1, w: 'r_mg' },
  r_rpg: { name: 'Razziere', team: 1, w: 'rpg' },
  technical: { name: 'Tecnica', team: 1, veh: true, rad: 1.6, w: 'r_mount' },
  boss: { name: 'Carro del Capo', team: 1, veh: true, rad: 2.8, w: 'boss' },
};
const INF_KINDS = ['rifle', 'mg', 'medic', 'eng', 'radio', 'scout', 'sniper', 'mortar', 'at'];
const VEH_KINDS = ['car', 'ltank'];
/** Vehicles whose hull shrugs off rifle fire. */
const HEAVY = new Set(['tank', 'boss', 'ltank']);
/** A weapon's numbers, read live from config. */
function weapon(k) {
  switch (k) {
    case 'rifle': return { kind: 'bullet', range: tune.rifle_range, dmg: tune.rifle_damage, rate: tune.rifle_rate, acc: tune.rifle_acc };
    case 'sniper': return { kind: 'bullet', range: tune.sniper_range, dmg: tune.sniper_damage, rate: tune.sniper_rate, acc: tune.sniper_acc, snd: 'sniper' };
    case 'mg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate, acc: tune.mg_acc, snd: 'mg', chip: 0.5, arc: tune.mg_arc, turn: tune.mg_turn };
    case 'atgun': return { kind: 'ap', range: tune.at_range, dmg: tune.at_damage, rate: tune.at_rate, blast: 0.8, arc: tune.at_arc, turn: tune.at_turn };
    case 'ltgun': return { kind: 'shell', range: tune.ltank_range, dmg: tune.ltank_damage, rate: tune.ltank_reload, blast: 1.4 };
    case 'carbine': return { kind: 'bullet', range: tune.rifle_range * 0.85, dmg: tune.rifle_damage * 0.8, rate: tune.rifle_rate * 0.9, acc: tune.rifle_acc * 0.95 };
    case 'scout': return { kind: 'bullet', range: tune.rifle_range * 0.95, dmg: tune.rifle_damage * 0.85, rate: tune.rifle_rate, acc: tune.rifle_acc };
    case 'pistol': return { kind: 'bullet', range: 14, dmg: 4, rate: 1.4, acc: 0.45 };
    case 'mortar': return { kind: 'mortar', range: tune.mortar_range, min: tune.mortar_min, dmg: tune.mortar_damage, rate: tune.mortar_rate, blast: tune.mortar_blast, indirect: true };
    case 'autocannon': return { kind: 'bullet', heavy: true, range: tune.car_range, dmg: tune.car_damage, rate: tune.car_rate, acc: 0.6, snd: 'mg' };
    case 'r_rifle': return { kind: 'bullet', range: tune.rifle_range * 0.95, dmg: tune.rifle_damage, rate: 1.4, acc: tune.raider_acc };
    case 'r_mg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate * 1.1, acc: tune.raider_acc * 0.7, snd: 'mg', chip: 0.5, arc: tune.mg_arc, turn: tune.mg_turn };
    case 'rpg': return { kind: 'rpg', range: tune.rpg_range, dmg: tune.rpg_damage, rate: tune.rpg_rate, blast: 1.5 };
    case 'r_mount': return { kind: 'bullet', range: tune.mg_range + 2, dmg: tune.mg_damage, rate: tune.mg_rate * 1.2, acc: tune.raider_acc * 0.75, snd: 'mg', chip: 0.5 };
    case 'boss': return { kind: 'shell', range: 48, dmg: tune.boss_damage, rate: tune.boss_reload, blast: 2.3 };
  }
  return extraWeapon(k); // enemies.js: the Horde's other weapons
}
