// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- World (voxels; 1 voxel = 1 unit = about 1 m) ----
  map_size: { value: 160, min: 96, max: 224, step: 16 },        // voxels per side
  water_level: { value: 4, min: 2, max: 8, step: 1 },           // water surface height, voxels
  mountain_amount: { value: 1, min: 0, max: 2, step: 0.1 },     // how tall the ridges grow
  camp_count: { value: 5, min: 2, max: 8, step: 1 },            // raider camps per run
  patrol_count: { value: 6, min: 0, max: 14, step: 1 },         // roaming raider patrols
  ruin_count: { value: 22, min: 0, max: 50, step: 1 },          // ruined buildings and walls
  rock_count: { value: 26, min: 0, max: 60, step: 1 },          // rock pillars and arches

  // ---- Camera ----
  cam_pitch: { value: 55, min: 35, max: 75, step: 1 },          // degrees down from horizon
  cam_fov: { value: 32, min: 20, max: 60, step: 1 },            // degrees
  cam_dist: { value: 84, min: 30, max: 140, step: 1 },          // starting zoom distance
  cam_dist_min: { value: 35, min: 20, max: 80, step: 1 },
  cam_dist_max: { value: 130, min: 80, max: 220, step: 1 },

  // ---- Command tank: hull ----
  tank_speed: { value: 7, min: 2, max: 16, step: 0.5 },         // forward units/s
  tank_reverse: { value: 3.5, min: 1, max: 10, step: 0.5 },     // reverse units/s
  tank_accel: { value: 6, min: 1, max: 20, step: 0.5 },         // units/s^2
  tank_turn: { value: 60, min: 20, max: 140, step: 5 },         // hull degrees/s
  tank_climb: { value: 1.25, min: 0.5, max: 3, step: 0.05 },    // max height step it can climb
  tank_hp: { value: 300, min: 50, max: 1500, step: 10 },        // base integrity
  tank_armor: { value: 0.3, min: 0, max: 0.9, step: 0.05 },     // fraction of heavy damage blocked
  small_arms_vs_tank: { value: 0.12, min: 0, max: 1, step: 0.01 }, // share of rifle/MG damage that gets through
  crush_speed: { value: 2, min: 0, max: 10, step: 0.5 },        // speed above which the tank crushes infantry

  // ---- Command tank: turret and fire solution (the hook) ----
  turret_speed: { value: 50, min: 10, max: 200, step: 5 },      // turret degrees/s
  cannon_damage: { value: 110, min: 20, max: 400, step: 5 },    // direct hit damage
  cannon_blast: { value: 2.1, min: 0.5, max: 5, step: 0.1 },    // explosion radius, voxels
  cannon_reload: { value: 2.6, min: 0.3, max: 8, step: 0.1 },   // seconds
  shell_speed: { value: 70, min: 20, max: 150, step: 5 },       // units/s
  shell_gravity: { value: 14, min: 0, max: 40, step: 1 },       // units/s^2 (arc of the shell)
  spread_min: { value: 0.012, min: 0, max: 0.1, step: 0.002 },  // radians, standing still and settled
  spread_move: { value: 0.09, min: 0, max: 0.3, step: 0.005 },  // radians added at full speed
  spread_turn: { value: 0.05, min: 0, max: 0.3, step: 0.005 },  // radians added while hull or turret turns
  spread_fire: { value: 0.04, min: 0, max: 0.3, step: 0.005 },  // radians added by each shot
  aim_time: { value: 1.1, min: 0.1, max: 4, step: 0.05 },       // seconds for the circle to close by ~63%
  aligned_deg: { value: 2, min: 0.2, max: 10, step: 0.2 },      // turret counts as "on target" under this

  // ---- Radio ----
  radio_range: { value: 28, min: 8, max: 120, step: 1 },        // base radio radius, units

  // ---- Friendly soldiers ----
  inf_speed: { value: 4.2, min: 1, max: 10, step: 0.1 },        // units/s
  inf_hp: { value: 30, min: 5, max: 150, step: 1 },
  rifle_range: { value: 22, min: 5, max: 60, step: 1 },
  rifle_damage: { value: 6, min: 1, max: 50, step: 1 },
  rifle_rate: { value: 1.2, min: 0.1, max: 5, step: 0.05 },     // seconds between shots
  rifle_acc: { value: 0.5, min: 0.05, max: 1, step: 0.05 },
  sniper_range: { value: 40, min: 10, max: 80, step: 1 },
  sniper_damage: { value: 28, min: 5, max: 100, step: 1 },
  sniper_rate: { value: 3.4, min: 0.5, max: 10, step: 0.1 },
  sniper_acc: { value: 0.85, min: 0.05, max: 1, step: 0.05 },
  mg_range: { value: 25, min: 5, max: 60, step: 1 },
  mg_damage: { value: 4, min: 1, max: 30, step: 1 },
  mg_rate: { value: 0.16, min: 0.03, max: 1, step: 0.01 },
  mg_acc: { value: 0.3, min: 0.05, max: 1, step: 0.05 },
  medic_heal: { value: 4, min: 0, max: 30, step: 0.5 },         // hp/s to hurt allies nearby
  medic_radius: { value: 6, min: 1, max: 20, step: 0.5 },
  mortar_range: { value: 44, min: 10, max: 90, step: 1 },
  mortar_min: { value: 8, min: 0, max: 30, step: 1 },
  mortar_damage: { value: 45, min: 5, max: 200, step: 5 },
  mortar_blast: { value: 1.9, min: 0.5, max: 5, step: 0.1 },
  mortar_rate: { value: 6, min: 1, max: 20, step: 0.5 },
  mortar_scatter: { value: 3, min: 0, max: 10, step: 0.25 },    // landing error, units
  car_hp: { value: 160, min: 30, max: 600, step: 10 },          // armoured car
  car_speed: { value: 8, min: 2, max: 16, step: 0.5 },
  car_range: { value: 28, min: 5, max: 60, step: 1 },
  car_damage: { value: 14, min: 1, max: 80, step: 1 },
  car_rate: { value: 0.5, min: 0.1, max: 3, step: 0.05 },
  cover_factor: { value: 0.35, min: 0, max: 1, step: 0.05 },    // hit chance multiplier when in cover
  cover_chip: { value: 0.15, min: 0, max: 1, step: 0.05 },      // chance a miss chips a soft cover voxel
  sight_range: { value: 34, min: 10, max: 80, step: 1 },        // how far any soldier spots enemies

  // ---- Raiders ----
  raider_hp: { value: 26, min: 5, max: 150, step: 1 },
  raider_sight: { value: 30, min: 10, max: 80, step: 1 },
  raider_acc: { value: 0.4, min: 0.05, max: 1, step: 0.05 },
  rpg_range: { value: 24, min: 5, max: 60, step: 1 },
  rpg_damage: { value: 70, min: 5, max: 300, step: 5 },
  rpg_rate: { value: 6, min: 1, max: 20, step: 0.5 },
  rpg_speed: { value: 26, min: 5, max: 80, step: 1 },
  technical_hp: { value: 120, min: 20, max: 600, step: 10 },
  technical_speed: { value: 8.5, min: 1, max: 20, step: 0.5 },
  boss_hp: { value: 900, min: 100, max: 4000, step: 50 },
  boss_damage: { value: 85, min: 10, max: 400, step: 5 },
  boss_reload: { value: 4.5, min: 1, max: 15, step: 0.5 },
  boss_turret_speed: { value: 24, min: 5, max: 120, step: 1 },
  tier_scale: { value: 0.25, min: 0, max: 1, step: 0.05 },      // extra hp and numbers per camp tier
  leash: { value: 22, min: 5, max: 80, step: 1 },               // how far camp raiders chase from home

  // ---- Economy ----
  start_scrap: { value: 120, min: 0, max: 2000, step: 10 },
  scrap_infantry: { value: 8, min: 0, max: 100, step: 1 },      // per raider killed
  scrap_vehicle: { value: 45, min: 0, max: 300, step: 5 },
  scrap_camp: { value: 90, min: 0, max: 600, step: 10 },        // bonus per camp cleared (x tier)
  scrap_wreck: { value: 25, min: 0, max: 200, step: 5 },        // per wreck picked up
  repair_cost: { value: 0.5, min: 0, max: 5, step: 0.1 },       // scrap per integrity point
  cost_rifle: { value: 30, min: 0, max: 300, step: 5 },
  cost_sniper: { value: 60, min: 0, max: 300, step: 5 },
  cost_mg: { value: 55, min: 0, max: 300, step: 5 },
  cost_medic: { value: 50, min: 0, max: 300, step: 5 },
  cost_mortar: { value: 85, min: 0, max: 400, step: 5 },
  cost_car: { value: 220, min: 0, max: 1000, step: 10 },
  max_squads: { value: 6, min: 1, max: 9, step: 1 },
  squad_max_size: { value: 4, min: 1, max: 8, step: 1 },
  shop_radius: { value: 11, min: 4, max: 30, step: 1 },         // how near an outpost the tank must be

  // ---- Between runs (piastrine) ----
  tags_per_camp: { value: 2, min: 0, max: 20, step: 1 },
  tags_per_10_kills: { value: 1, min: 0, max: 10, step: 1 },
  tags_win: { value: 8, min: 0, max: 50, step: 1 },

  // ---- Effects ----
  debris_max: { value: 500, min: 0, max: 2000, step: 50 },
  debris_life: { value: 5, min: 0.5, max: 20, step: 0.5 },      // seconds a debris cube stays
  shake: { value: 0.6, min: 0, max: 3, step: 0.1 },
};
