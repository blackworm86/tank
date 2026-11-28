// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The unit types and their weapons (allies, the Horde's base raiders, vehicles). (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Units and weapons ----------------------------------------------------------------------------
/** Every unit kind. veh: a vehicle; rad: its body radius. The Horde's kinds join from the enemy registry (content/horde.js). */
const UT = {
  tank: { name: 'Carro comando', team: 0, veh: true, rad: 2.2 },
  rifle: { name: 'Fuciliere', team: 0, w: 'rifle', cost: 'cost_rifle' },
  sniper: { name: 'Cecchino', team: 0, w: 'sniper', cost: 'cost_sniper', climb: true },
  mg: { name: 'Mitragliere', team: 0, w: 'mg', cost: 'cost_mg' },
  medic: { name: 'Medico', team: 0, w: 'pistol', cost: 'cost_medic' },
  eng: { name: 'Geniere', team: 0, w: 'carbine', cost: 'cost_eng' },
  radio: { name: 'Operatore radio', team: 0, w: 'carbine', cost: 'cost_radio' },
  scout: { name: 'Esploratore', team: 0, w: 'scout', cost: 'cost_scout', climb: true },
  mortar: { name: 'Artigliere', team: 0, w: 'mortar', cost: 'cost_mortar' },
  at: { name: 'Cannone anticarro', team: 0, w: 'atgun', cost: 'cost_at' },
  car: { name: 'Autoblindo', team: 0, veh: true, rad: 1.6, w: 'autocannon', cost: 'cost_car' },
  ltank: { name: 'Carro di supporto', team: 0, veh: true, rad: 1.9, w: 'ltgun', cost: 'cost_ltank' },
  jeep: { name: 'Jeep', team: 0, veh: true, rad: 1.4, w: 'jeepmg', cost: 'cost_jeep' },
};
const INF_KINDS = ['rifle', 'mg', 'medic', 'eng', 'radio', 'scout', 'sniper', 'mortar', 'at'];
const VEH_KINDS = ['car', 'ltank', 'jeep'];
/** Vehicles whose hull shrugs off rifle fire. */
const HEAVY = new Set(['tank', 'ltank']); // and every enemy entry marked heavy
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
    case 'jeepmg': return { kind: 'bullet', range: tune.mg_range, dmg: tune.mg_damage, rate: tune.mg_rate, acc: tune.jeep_acc, snd: 'mg', chip: 0.5 }; // the mounted machine gun: no tripod arc, it turns on its post
    case 'autocannon': return { kind: 'bullet', heavy: true, range: tune.car_range, dmg: tune.car_damage, rate: tune.car_rate, acc: 0.6, snd: 'mg' };
  }
  const W = registry('weapon')[k]; return W ? W() : null; // the Horde's weapons (content/horde.js, enemies.js)
}
