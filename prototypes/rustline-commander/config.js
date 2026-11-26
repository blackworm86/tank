// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
window.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- World (voxels; 1 voxel = 1 unit = about 1 m) ----
  map_simple: { value: 1, min: 0, max: 1, step: 1 },            // 1: the simple test map (128, gentle ground, one river, 3 camps); 0: the full map below
  map_size: { value: 160, min: 96, max: 224, step: 16 },        // voxels per side
  water_level: { value: 4, min: 2, max: 8, step: 1 },           // water surface height, voxels
  mountain_amount: { value: 1, min: 0, max: 2, step: 0.1 },     // how tall the ridges grow
  terrain_look: { value: 1, min: 0, max: 1, step: 1 },          // 1 = smooth detailed ground (grass, mud, rock, asphalt), 0 = the old voxel blocks
  terrain_detail: { value: 3, min: 1, max: 4, step: 1 },        // ground mesh subdivisions per voxel: more = finer relief
  terrain_grain: { value: 0.16, min: 0, max: 0.6, step: 0.02 }, // small bumps in the ground, metres
  mud_patches: { value: 0.4, min: 0, max: 1, step: 0.05 },      // how much mud lies in hollows away from water
  forest_amount: { value: 0.6, min: 0, max: 1, step: 0.05 },    // share of the map under woods and forests
  forest_density: { value: 0.34, min: 0.05, max: 0.5, step: 0.01 }, // trees per cell inside a forest
  tree_scatter: { value: 0.006, min: 0, max: 0.05, step: 0.002 }, // lone trees per cell elsewhere
  grass_tufts: { value: 1.4, min: 0, max: 3, step: 0.1 },       // dry grass tufts per grassy cell (looks only)
  stone_density: { value: 0.08, min: 0, max: 0.4, step: 0.01 }, // loose stones and boulders (looks only)
  terrain_smooth: { value: 2, min: 0, max: 5, step: 1 },        // blur passes over the hills: more = gentler ramps (cliffs stay)
  road_half_width: { value: 3, min: 1, max: 4, step: 1 },       // road is 2*this+1 voxels wide (map rule M4: 7 wide)
  road_shoulder: { value: 6, min: 2, max: 10, step: 1 },        // how far the 1-per-voxel ramp beside a road reaches
  camp_count: { value: 5, min: 2, max: 8, step: 1 },            // raider camps per run
  patrol_count: { value: 6, min: 0, max: 14, step: 1 },         // roaming raider patrols
  ruin_count: { value: 14, min: 0, max: 50, step: 1 },          // ruined buildings and walls
  rock_count: { value: 18, min: 0, max: 60, step: 1 },          // rounded rock outcrops (map rule M3: no pillars or arches)
  map_max_grade: { value: 1.1, min: 0.3, max: 3, step: 0.1 },
  map_cliff: { value: 2.5, min: 1, max: 6, step: 0.5 },          // a ground step at least this high is a cliff: never smoothed into a slope
  fog: { value: 1, min: 0, max: 1, step: 1 },                   // 1: fog of war, raiders shown only while seen by the tank or a friend in radio reach
  tank_sight: { value: 50, min: 10, max: 120, step: 1 },          // how far the command tank's crew spots enemies
  fog_shot_reveal: { value: 1.5, min: 0, max: 6, step: 0.5 },    // seconds a raider's shot gives its place away (near the radio ring)
  turret_return: { value: 2, min: 0.2, max: 6, step: 0.1 },      // rad/s an idle vehicle turret swings back to the front
  squad_size: { value: 8, min: 1, max: 12, step: 1 },            // most soldiers in one squad (Alt+1-6)
  fog_dark: { value: 0.7, min: 0, max: 0.9, step: 0.05 },      // how dark the ground nobody sees is drawn
  posture_memory: { value: 8, min: 1, max: 30, step: 1 },        // seconds a squad counts as 'shot at' (return-fire and stealth postures)
  stealth_trigger: { value: 0.45, min: 0.1, max: 1, step: 0.05 }, // a stealthy squad opens fire inside this share of its range
  stealth_speed: { value: 0.7, min: 0.3, max: 1, step: 0.05 },   // a stealthy soldier's speed
  horde_time: { value: 300, min: 30, max: 900, step: 10 },       // seconds on a sector before the Horde's hunters come
  wave_every: { value: 45, min: 10, max: 180, step: 5 },          // seconds between hunter waves
  wave_size: { value: 3, min: 1, max: 12, step: 1 },              // raiders in the first wave
  wave_grow: { value: 1, min: 0, max: 5, step: 0.5 },             // more raiders each wave
  exit_radius: { value: 10, min: 4, max: 20, step: 1 },           // how close to the exit the tank must be to leave
  npc_radius: { value: 7, min: 3, max: 15, step: 1 },             // how close the tank must come to talk to people
  mission_scrap: { value: 80, min: 0, max: 400, step: 10 },       // scrap for a sector's mission
  final_waves: { value: 6, min: 1, max: 15, step: 1 },            // waves in the last stand (the last brings the Chief)
  final_prep: { value: 60, min: 10, max: 300, step: 5 },          // seconds to set up before the first wave of the last stand
  final_gap: { value: 70, min: 20, max: 200, step: 5 },           // seconds between last-stand waves (sooner once a wave is beaten)
  tags_per_sector: { value: 1, min: 0, max: 10, step: 1 },        // piastrine per sector crossed
  context_menu: { value: 1, min: 0, max: 1, step: 1 },          // 1: right-click opens the menu of orders; 0: right-click orders at once (move/attack/enter)
  garrison_cap: { value: 6, min: 1, max: 12, step: 1 },          // most soldiers one building takes
  garrison_ruin: { value: 0.45, min: 0.1, max: 0.9, step: 0.05 }, // share of its walls left below which a building throws its soldiers out
  garrison_hurt: { value: 12, min: 0, max: 50, step: 1 },        // damage to each soldier thrown out by a collapse   // steepest smoothed rise between cells the tank takes (map report)

  // ---- Camera ----
  cam_pitch: { value: 55, min: 35, max: 75, step: 1 },          // degrees down from horizon
  cam_fov: { value: 32, min: 20, max: 60, step: 1 },            // degrees
  cam_dist: { value: 84, min: 30, max: 140, step: 1 },          // starting zoom distance
  cam_dist_min: { value: 35, min: 20, max: 80, step: 1 },
  cam_dist_max: { value: 130, min: 80, max: 220, step: 1 },
  pause_pan: { value: 40, min: 10, max: 120, step: 5 },        // camera pan speed with WASD during the tactical pause (m/s at default zoom)

  // ---- Command tank: hull ----
  tank_speed: { value: 7, min: 2, max: 16, step: 0.5 },         // forward units/s
  tank_reverse: { value: 3.5, min: 1, max: 10, step: 0.5 },     // reverse units/s
  tank_accel: { value: 6, min: 1, max: 20, step: 0.5 },         // units/s^2
  tank_turn: { value: 60, min: 20, max: 140, step: 5 },         // hull degrees/s
  tank_ground_climb: { value: 2.3, min: 1, max: 4, step: 0.1 }, // max step on natural ground (a slope, not a wall) for the tank and vehicle paths (voxels)
  tank_unstick_time: { value: 0.8, min: 0.2, max: 3, step: 0.1 }, // seconds pushing without moving before the hull slides free
  tank_climb: { value: 1.25, min: 0.5, max: 3, step: 0.05 },    // max step one point of the hull can climb at once (voxels)
  tank_slope_span: { value: 5.5, min: 2, max: 10, step: 0.5 },  // max height difference across the hull footprint: steeper is impassable
  tank_glance: { value: 70, min: 0, max: 180, step: 5 },        // deg/s the hull steers itself off a corner it is caught on
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
  sniper_range: { value: 50, min: 10, max: 90, step: 1 },
  sniper_sight: { value: 54, min: 20, max: 100, step: 1 },        // how far a sniper spots enemies
  sniper_standoff: { value: 24, min: 8, max: 50, step: 1 },       // a sniper keeps this far from the enemy
  ambush_trigger: { value: 0.6, min: 0.2, max: 1, step: 0.05 },   // an ambush opens fire when the enemy is within this share of its range
  ambush_reveal: { value: 8, min: 2, max: 30, step: 1 },          // raiders see an unsprung ambush only this close
  ambush_bonus: { value: 1.6, min: 1, max: 3, step: 0.1 },        // aim multiplier for 4 s after an ambush springs
  at_ambush: { value: 0.7, min: 0.3, max: 1, step: 0.05 },        // an unseen AT gun waits till its target is this close (share of range)
  suppress_time: { value: 2.5, min: 0.5, max: 8, step: 0.5 },     // seconds a machine-gun burst pins infantry down
  suppress_acc: { value: 0.5, min: 0.1, max: 1, step: 0.05 },     // aim while pinned down
  suppress_speed: { value: 0.6, min: 0.2, max: 1, step: 0.05 },   // speed while pinned down
  xp_kill: { value: 10, min: 0, max: 50, step: 1 },               // xp for a kill (x3 for a vehicle)
  xp_hit: { value: 1, min: 0, max: 10, step: 1 },                 // xp for each hit on an enemy
  xp_camp: { value: 8, min: 0, max: 50, step: 1 },                // xp to every soldier alive when a camp falls
  rank_xp_1: { value: 15, min: 1, max: 200, step: 1 },            // xp for Esperto
  rank_xp_2: { value: 40, min: 1, max: 400, step: 1 },            // xp for Veterano
  rank_xp_3: { value: 80, min: 1, max: 800, step: 1 },            // xp for Elite
  rank_speed: { value: 0.06, min: 0, max: 0.3, step: 0.01 },      // speed per rank
  rank_acc: { value: 0.1, min: 0, max: 0.5, step: 0.01 },         // aim per rank
  rank_hp: { value: 0.1, min: 0, max: 0.5, step: 0.01 },          // health per rank
  rank_rate: { value: 0.07, min: 0, max: 0.2, step: 0.01 },       // shorter time between shots per rank
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
  cover_light: { value: 0.65, min: 0, max: 1, step: 0.05 },     // hit chance multiplier behind light cover (sandbags, junk, a 1-voxel ledge)
  cover_blast: { value: 0.55, min: 0, max: 1, step: 0.05 },     // blast damage multiplier for infantry in heavy cover from the blast side
  unstick_time: { value: 1.6, min: 0.5, max: 6, step: 0.1 },    // seconds without headway before a unit looks for another way

  // ---- Directional armour (damage multipliers on vehicles) ----
  armor_front: { value: 0.5, min: 0.1, max: 2, step: 0.05 },
  armor_side: { value: 1, min: 0.1, max: 3, step: 0.05 },
  armor_rear: { value: 1.7, min: 0.1, max: 4, step: 0.05 },
  armor_top: { value: 1.4, min: 0.1, max: 4, step: 0.05 },      // mortar rounds and plunging hits
  armor_front_arc: { value: 45, min: 10, max: 80, step: 5 },    // half-angle of the front face, degrees
  armor_rear_arc: { value: 45, min: 10, max: 80, step: 5 },     // half-angle of the rear face, degrees
  hull_turn_boss: { value: 22, min: 5, max: 120, step: 1 },     // deg/s a still hull turns to face its enemy
  hull_turn_technical: { value: 80, min: 5, max: 200, step: 5 },
  hull_turn_car: { value: 100, min: 5, max: 200, step: 5 },
  hull_turn_ltank: { value: 45, min: 5, max: 200, step: 5 },

  // ---- Arcs of fire (deployed weapons swing slowly to a target outside the arc) ----
  mg_arc: { value: 40, min: 10, max: 180, step: 5 },           // half-angle, degrees
  mg_turn: { value: 70, min: 10, max: 360, step: 5 },          // deg/s
  at_arc: { value: 30, min: 10, max: 180, step: 5 },
  at_turn: { value: 30, min: 5, max: 360, step: 5 },

  // ---- Anti-tank gun and support tank ----
  at_hp: { value: 45, min: 10, max: 300, step: 5 },
  at_range: { value: 42, min: 10, max: 90, step: 1 },
  at_damage: { value: 95, min: 10, max: 400, step: 5 },
  at_rate: { value: 4.5, min: 0.5, max: 15, step: 0.25 },       // seconds between rounds
  at_speed: { value: 70, min: 20, max: 160, step: 5 },          // round speed, units/s
  ltank_hp: { value: 260, min: 50, max: 1000, step: 10 },
  ltank_speed: { value: 5.5, min: 1, max: 14, step: 0.5 },
  ltank_range: { value: 38, min: 10, max: 80, step: 1 },
  ltank_damage: { value: 60, min: 5, max: 300, step: 5 },
  ltank_reload: { value: 4, min: 0.5, max: 15, step: 0.25 },

  // ---- Command vehicle hulls (multipliers on the battle tank's tank_* values) ----
  hull_mbt_seats: { value: 0, min: 0, max: 12, step: 1 },      // infantry it carries before parts
  hull_light_hp: { value: 0.7, min: 0.2, max: 2, step: 0.05 },
  hull_light_speed: { value: 1.3, min: 0.5, max: 2.5, step: 0.05 },
  hull_light_turn: { value: 1.25, min: 0.5, max: 2.5, step: 0.05 },
  hull_light_armor: { value: 1.35, min: 0.5, max: 3, step: 0.05 }, // damage taken, x
  hull_light_seats: { value: 2, min: 0, max: 12, step: 1 },
  hull_apc_hp: { value: 0.85, min: 0.2, max: 2, step: 0.05 },
  hull_apc_speed: { value: 1.2, min: 0.5, max: 2.5, step: 0.05 },
  hull_apc_turn: { value: 1.1, min: 0.5, max: 2.5, step: 0.05 },
  hull_apc_armor: { value: 1.2, min: 0.5, max: 3, step: 0.05 },
  hull_apc_seats: { value: 6, min: 0, max: 12, step: 1 },
  board_radius: { value: 3, min: 1, max: 8, step: 0.5 },        // how close to the hull infantry climb in
  // the light hull's guns and the APC's heavy machine gun
  tank_ac_damage: { value: 22, min: 2, max: 150, step: 1 },     // autocannon round
  tank_ac_reload: { value: 0.35, min: 0.1, max: 3, step: 0.05 },
  tank_ac_blast: { value: 0.75, min: 0.2, max: 3, step: 0.05 },
  tank_mg_damage: { value: 7, min: 1, max: 60, step: 1 },       // light hull's machine gun
  tank_mg_rate: { value: 0.09, min: 0.03, max: 1, step: 0.01 },  // seconds between rounds
  tank_hmg_damage: { value: 11, min: 1, max: 80, step: 1 },     // APC heavy machine gun
  tank_hmg_rate: { value: 0.13, min: 0.03, max: 1, step: 0.01 },
  tank_mg_range: { value: 46, min: 10, max: 100, step: 1 },
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
  cost_at: { value: 110, min: 0, max: 500, step: 5 },
  cost_ltank: { value: 340, min: 0, max: 1500, step: 10 },
  max_squads: { value: 6, min: 1, max: 9, step: 1 },
  squad_max_size: { value: 4, min: 1, max: 8, step: 1 },
  shop_radius: { value: 6, min: 3, max: 20, step: 1 },          // how near the tool shed the tank must be for the menu to open
  part_refund: { value: 0.7, min: 0, max: 1, step: 0.05 },      // share of a part's cost paid back when it is taken off

  // ---- Between runs (piastrine) ----
  tags_per_camp: { value: 2, min: 0, max: 20, step: 1 },
  tags_per_10_kills: { value: 1, min: 0, max: 10, step: 1 },
  tags_win: { value: 8, min: 0, max: 50, step: 1 },

  // ---- Effects ----
  debris_max: { value: 500, min: 0, max: 2000, step: 50 },
  debris_life: { value: 5, min: 0.5, max: 20, step: 0.5 },      // seconds a debris cube stays
  shake: { value: 0.6, min: 0, max: 3, step: 0.1 },
};
