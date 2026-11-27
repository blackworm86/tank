// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.
// One file on purpose (the tweak panel, the brief's pins and the grow step read it whole), laid out in
// one section a system: each section names the files that read its keys. A content pack adds its own
// values with registerTune() (js/core.js); a key written here wins over a pack's.
window.CONFIG = {
  // ---- Core: seed and sound (index.html, js/systems/sound.js) ----
  seed: 0, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address); 0 = a new seed each campaign (checks use 1)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- World: map generation (js/world.js, js/biomes.js, js/terrain.js, js/content/base/lands.js) ----
  map_simple: { value: 0, min: 0, max: 1, step: 1 },            // 1: the simple test map (128, gentle ground, one river, 3 camps); 0: the full map below
  map_size: { value: 192, min: 96, max: 256, step: 16 },        // voxels per side
  water_level: { value: 4, min: 2, max: 8, step: 1 },           // water surface height, voxels
  mountain_amount: { value: 1, min: 0, max: 2, step: 0.1 },     // how tall the ridges grow
  terrain_look: { value: 0, min: 0, max: 1, step: 1 },          // 0 = voxel ground with sloped ramps (the test look), 1 = the smooth detailed ground (grass, mud, rock, asphalt)
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
  patrol_count: { value: 8, min: 0, max: 14, step: 1 },         // roaming raider patrols
  ruin_count: { value: 14, min: 0, max: 50, step: 1 },          // ruined buildings and walls
  rock_count: { value: 18, min: 0, max: 60, step: 1 },          // rounded rock outcrops (map rule M3: no pillars or arches)
  map_max_grade: { value: 1.1, min: 0.3, max: 3, step: 0.1 },
  map_cliff: { value: 3, min: 2, max: 6, step: 1 },              // a ground step at least this high is a cliff wall: never a slope, never driven (M1)
  ramp_run: { value: 2, min: 1, max: 4, step: 1 },               // cells a ramp takes to climb 1 voxel: 2 = 1 m every 2 m, about 27 degrees (M1)
  biome_force: { value: 0, min: 0, max: 4, step: 1 },          // 0 = the campaign's biome; 1 desert, 2 forest, 3 ice, 4 burnt lands (testing)
  layout_force: { value: 0, min: 0, max: 4, step: 1 },         // 0 = the campaign's layout; 1 open lands, 2 farmland, 3 villages, 4 ruined city (testing)
  site_markers: { value: 1, min: 0, max: 1, step: 1 },         // 1 = floating labels over the garage, the camps and the exit once explored
  shape_force: { value: 0, min: 0, max: 3, step: 1 },          // 0 = the campaign's map shape; 1 open, 2 valley, 3 basin (testing)
  valley_width: { value: 0.24, min: 0.12, max: 0.45, step: 0.01 }, // a valley map's half width (share of the map side)
  wall_height: { value: 25, min: 14, max: 28, step: 1 },         // the rock walls round a valley or a basin
  river_chance: { value: 0.65, min: 0, max: 1, step: 0.05 },     // chance a sector without the river geography still has a river
  geo_force: { value: 0, min: 0, max: 4, step: 1 },            // 0 = the campaign's geography; 1 ridges, 2 wide river, 3 plateaus, 4 hills (testing)
  ridge_height: { value: 13, min: 4, max: 20, step: 1 },        // how tall the ridges stand over the land (passes cut through)
  plateau_height: { value: 10, min: 3, max: 16, step: 1 },      // the plateaus' cliff height
  hills_k: { value: 1.8, min: 1, max: 3, step: 0.1 },           // the hills geography: how much taller the mountains grow

  // ---- Camera and orders menu (js/view.js, js/systems/play.js, js/systems/ordermenu.js) ----
  context_menu: { value: 1, min: 0, max: 1, step: 1 },          // 1: right-click opens the menu of orders; 0: right-click orders at once (move/attack/enter)
  cam_pitch: { value: 55, min: 35, max: 75, step: 1 },          // degrees down from horizon
  cam_fov: { value: 32, min: 20, max: 60, step: 1 },            // degrees
  cam_dist: { value: 84, min: 30, max: 140, step: 1 },          // starting zoom distance
  cam_dist_min: { value: 35, min: 20, max: 80, step: 1 },
  cam_dist_max: { value: 130, min: 80, max: 220, step: 1 },
  pause_pan: { value: 40, min: 10, max: 120, step: 5 },        // camera pan speed with WASD during the tactical pause (m/s at default zoom)

  // ---- Fog, sight and stealth (js/systems/fog.js, js/view.js, js/systems/unitstep.js) ----
  fog: { value: 1, min: 0, max: 1, step: 1 },                   // 1: fog of war, raiders shown only while seen by the tank or a friend in radio reach
  tank_sight: { value: 50, min: 10, max: 120, step: 1 },          // how far the command tank's crew spots enemies
  fog_shot_reveal: { value: 1.5, min: 0, max: 6, step: 0.5 },    // seconds a raider's shot gives its place away (near the radio ring)
  fog_unknown: { value: 0.97, min: 0, max: 1, step: 0.01 },     // how dark the ground nobody has explored yet is drawn (map and minimap)
  fog_lid: { value: 11, min: 0, max: 30, step: 1 },              // how high the unexplored fog sits above the ground, covering trees and buildings
  fog_dark: { value: 0.7, min: 0, max: 0.9, step: 0.05 },      // how dark the ground nobody sees is drawn
  posture_memory: { value: 8, min: 1, max: 30, step: 1 },        // seconds a squad counts as 'shot at' (the Rispondi al fuoco rule of engagement)
  stealth_speed: { value: 0.7, min: 0.3, max: 1, step: 0.05 },   // a soldier's speed in the Furtiva gait
  run_speed: { value: 1.4, min: 1, max: 2.5, step: 0.05 },       // a soldier's speed in the Di corsa gait (no fire on the move)
  sight_range: { value: 34, min: 10, max: 80, step: 1 },        // how far any soldier spots enemies

  // ---- Command tank: hull (js/systems/vehicle.js, js/systems/tank.js) ----
  tank_speed: { value: 7, min: 2, max: 16, step: 0.5 },         // forward units/s
  tank_reverse: { value: 3.5, min: 1, max: 10, step: 0.5 },     // reverse units/s
  tank_accel: { value: 6, min: 1, max: 20, step: 0.5 },         // units/s^2
  tank_turn: { value: 60, min: 20, max: 140, step: 5 },         // hull degrees/s
  tank_ground_climb: { value: 2.3, min: 1, max: 4, step: 0.1 }, // max step on natural ground (a slope, not a wall) for the tank and vehicle paths (voxels)
  tank_unstick_time: { value: 0.8, min: 0.2, max: 3, step: 0.1 }, // seconds pushing without moving before the hull slides free
  tank_climb: { value: 1.25, min: 0.5, max: 3, step: 0.05 },    // max step one point of the hull can climb at once (voxels)
  tank_slope_span: { value: 3.5, min: 2, max: 10, step: 0.5 },  // max height difference across the hull footprint: steeper is impassable
  tank_step_max: { value: 1.5, min: 0.5, max: 3, step: 0.1 },   // max rise between two neighbouring points of the hull on the ground: a cliff edge is more
  tank_glance: { value: 70, min: 0, max: 180, step: 5 },        // deg/s the hull steers itself off a corner it is caught on
  tank_hp: { value: 300, min: 50, max: 1500, step: 10 },        // base integrity
  tank_armor: { value: 0.3, min: 0, max: 0.9, step: 0.05 },     // fraction of heavy damage blocked
  small_arms_vs_tank: { value: 0.12, min: 0, max: 1, step: 0.01 }, // share of rifle/MG damage that gets through
  raider_flee: { value: 10, min: 0, max: 30, step: 1 },           // raiders on foot dive aside from a hull driving at them within this
  rpg_flank_angle: { value: 70, min: 0, max: 180, step: 5 },       // a rocket man fires once this far off a vehicle's nose (degrees): its flank or rear
  crush_speed: { value: 2, min: 0, max: 10, step: 0.5 },        // speed above which the tank crushes infantry

  // ---- Command tank: turret and fire solution, the hook (js/systems/vehicle.js, js/systems/tank.js) ----
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
  spread_long: { value: 1.6, min: 1, max: 3, step: 0.1 },       // the cannon's scatter is an ellipse this many times longer (along the shot) than wide, same area as the circle
  aim_time: { value: 1.1, min: 0.1, max: 4, step: 0.05 },       // seconds for the circle to close by ~63%
  aligned_deg: { value: 2, min: 0.2, max: 10, step: 0.2 },      // turret counts as "on target" under this

  // ---- Command vehicle hulls: multipliers on the battle tank's tank_* values (js/systems/vehicle.js) ----
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
  hull_apc_seats: { value: 4, min: 0, max: 12, step: 1 },
  board_radius: { value: 3, min: 1, max: 8, step: 0.5 },        // how close to the hull infantry climb in

  // ---- Radio (js/systems/vehicle.js, js/loadout.js) ----
  radio_range: { value: 28, min: 8, max: 120, step: 1 },        // base radio radius, units
  radioman_range: { value: 1.6, min: 1, max: 4, step: 0.1 },      // a radioman hears the tank this much farther
  radio_relay: { value: 14, min: 0, max: 50, step: 1 },           // and relays orders to friends this near him

  // ---- Main weapons, coax and rounds (js/loadout.js) ----
  tank_ac_damage: { value: 22, min: 2, max: 150, step: 1 },     // autocannon round
  tank_ac_reload: { value: 0.35, min: 0.1, max: 3, step: 0.05 },
  tank_ac_blast: { value: 0.75, min: 0.2, max: 3, step: 0.05 },
  tank_mg_damage: { value: 7, min: 1, max: 60, step: 1 },       // light hull's machine gun
  tank_mg_rate: { value: 0.09, min: 0.03, max: 1, step: 0.01 },  // seconds between rounds
  tank_hmg_damage: { value: 11, min: 1, max: 80, step: 1 },     // APC heavy machine gun
  tank_hmg_rate: { value: 0.13, min: 0.03, max: 1, step: 0.01 },
  mg_heat_time: { value: 3.2, min: 0.5, max: 30, step: 0.1 },   // seconds of steady coax fire from cold to locked (base barrel)
  mg_cool: { value: 0.28, min: 0.05, max: 2, step: 0.01 },      // heat shed per second once it stops firing
  mg_cool_wait: { value: 0.35, min: 0, max: 3, step: 0.05 },    // seconds after the last round before it cools
  mg_unjam: { value: 0.3, min: 0, max: 0.9, step: 0.05 },       // a locked coax fires again when cooled to this
  mg_heat_spread: { value: 0.7, min: 0, max: 3, step: 0.1 },    // extra scatter at full heat
  tank_mg_range: { value: 46, min: 10, max: 100, step: 1 },
  ammo_ac: { value: 60, min: 1, max: 400, step: 5 },              // rounds the 25mm autocannon's racks hold
  ammo_gl: { value: 36, min: 1, max: 300, step: 1 },              // grenade launcher
  ammo_c75: { value: 30, min: 1, max: 200, step: 1 },             // 75mm cannon
  ammo_c105: { value: 20, min: 1, max: 200, step: 1 },            // 105mm cannon
  ac_vs_heavy: { value: 0.12, min: 0, max: 1, step: 0.02 },       // 25mm damage on tanks (light, medium, heavy), x
  gl_vs_heavy: { value: 0.3, min: 0, max: 1, step: 0.05 },
  gl_reload: { value: 1.1, min: 0.2, max: 5, step: 0.1 },
  gl_weight: { value: 0.2, min: 0, max: 3, step: 0.1 },           // speed the weapon costs the hull (APC x1, light x0.5, MBT x0.15)
  c75_weight: { value: 0.7, min: 0, max: 3, step: 0.1 },
  c105_weight: { value: 1.3, min: 0, max: 3, step: 0.1 },
  ammo_cost: { value: 5, min: 0, max: 50, step: 1 },              // scrap per round at the garage
  ammo_crates: { value: 1, min: 0, max: 10, step: 1 },            // crates of rounds lying by the road of each map
  ammo_crate_size: { value: 6, min: 1, max: 30, step: 1 },
  ammo_drop_wreck: { value: 0.08, min: 0, max: 1, step: 0.05 },    // chance a wreck hides a few rounds
  ammo_drop_veh: { value: 0.15, min: 0, max: 1, step: 0.05 },     // chance a destroyed raider vehicle leaves rounds
  ammo_drop_camp: { value: 0.35, min: 0, max: 1, step: 0.05 },     // chance a cleared camp leaves rounds

  // ---- Advanced systems (js/loadout.js, js/content/base/arsenal.js) ----
  sys_cost: { value: 170, min: 0, max: 1000, step: 10 },          // an advanced system at a garage (active ones x1.35)
  mod_relay: { value: 1.4, min: 1, max: 3, step: 0.05 },          // radio range with the onboard relay
  mod_medbay: { value: 2, min: 0, max: 20, step: 0.5 },           // hp/s the field hospital gives soldiers near the hull
  smoke_radius: { value: 8, min: 2, max: 20, step: 1 },
  mod_rocket_damage: { value: 70, min: 5, max: 300, step: 5 },    // rocket pod (second weapon)
  mod_cage: { value: 0.45, min: 0, max: 0.9, step: 0.05 },        // rocket damage the cage stops
  mod_skirts: { value: 0.3, min: 0, max: 0.9, step: 0.05 },       // side and rear damage the skirts stop
  mod_thermal: { value: 1.4, min: 1, max: 3, step: 0.05 },        // tank sight multiplier
  mod_autorep: { value: 1.5, min: 0, max: 20, step: 0.5 },        // hp/s once out of fire
  mod_autorep_wait: { value: 6, min: 0, max: 30, step: 1 },
  mod_loader: { value: 0.25, min: 0, max: 0.8, step: 0.05 },      // reload time the autoloader cuts
  mod_rack_ammo: { value: 1.5, min: 1, max: 3, step: 0.1 },       // rounds carried multiplier

  // ---- Vehicle modules, plates and the workshop (js/modules.js, js/systems/workshop.js) ----
  cap_apc: { value: 9, min: 2, max: 30, step: 1 },              // the load the APC's hardpoints carry
  cap_light: { value: 5, min: 2, max: 30, step: 1 },            // the light tank's
  cap_mbt: { value: 10, min: 2, max: 30, step: 1 },             // the battle tank's
  module_cost_k: { value: 1, min: 0.2, max: 4, step: 0.05 },     // every module's price, times this
  module_refund: { value: 0.5, min: 0, max: 1, step: 0.05 },     // share of a module's price a sale pays back
  ws_none: { value: 0.15, min: 0, max: 1, step: 0.05 },          // chance a workshop has no module to sell
  ws_offers_max: { value: 3, min: 1, max: 6, step: 1 },          // otherwise it offers 1 to this many
  mod_rare_w: { value: 0.4, min: 0, max: 3, step: 0.05 },        // weight of a rare module (a common one is 1; grows along the campaign)
  mod_exc_w: { value: 0.12, min: 0, max: 3, step: 0.02 },        // weight of an exceptional one
  plate_wear: { value: 1, min: 0, max: 5, step: 0.1 },           // how fast plates wear (damage over their durability)
  plate_wear_bullet: { value: 0.15, min: 0, max: 1, step: 0.05 },  // bullets wear them this much less
  plate_repair_k: { value: 0.45, min: 0, max: 2, step: 0.05 },   // a wrecked plate costs this share of its price to make whole
  part_refund: { value: 0.7, min: 0, max: 1, step: 0.05 },      // share of a part's cost paid back when it is taken off

  // ---- Friendly soldiers (js/systems/units.js, js/systems/entities.js, js/systems/unitstep.js) ----
  turret_return: { value: 2, min: 0.2, max: 6, step: 0.1 },      // rad/s an idle vehicle turret swings back to the front
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
  sniper_damage: { value: 28, min: 5, max: 100, step: 1 },
  sniper_rate: { value: 3.4, min: 0.5, max: 10, step: 0.1 },
  sniper_acc: { value: 0.85, min: 0.05, max: 1, step: 0.05 },
  mg_range: { value: 25, min: 5, max: 60, step: 1 },
  mg_damage: { value: 4, min: 1, max: 30, step: 1 },
  mg_rate: { value: 0.16, min: 0.03, max: 1, step: 0.01 },
  mg_acc: { value: 0.3, min: 0.05, max: 1, step: 0.05 },
  mortar_range: { value: 44, min: 10, max: 90, step: 1 },
  mortar_min: { value: 8, min: 0, max: 30, step: 1 },
  mortar_damage: { value: 45, min: 5, max: 200, step: 5 },
  mortar_blast: { value: 1.9, min: 0.5, max: 5, step: 0.1 },
  mortar_rate: { value: 6, min: 1, max: 20, step: 0.5 },
  mortar_scatter: { value: 3, min: 0, max: 10, step: 0.25 },    // landing error, units
  cover_factor: { value: 0.35, min: 0, max: 1, step: 0.05 },    // hit chance multiplier when in cover
  cover_chip: { value: 0.15, min: 0, max: 1, step: 0.05 },      // chance a miss chips a soft cover voxel
  cover_light: { value: 0.65, min: 0, max: 1, step: 0.05 },     // hit chance multiplier behind light cover (sandbags, junk, a 1-voxel ledge)
  cover_blast: { value: 0.55, min: 0, max: 1, step: 0.05 },     // blast damage multiplier for infantry in heavy cover from the blast side
  unstick_time: { value: 1.6, min: 0.5, max: 6, step: 0.1 },    // seconds without headway before a unit looks for another way

  // ---- Experience and ranks (js/systems/combat.js, js/systems/entities.js, js/systems/unitstep.js) ----
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

  // ---- Soldier trades: medic, engineer, scout (js/loadout.js) ----
  medic_heal: { value: 6, min: 0, max: 30, step: 0.5 },         // hp/s to hurt allies nearby
  medic_radius: { value: 6, min: 1, max: 20, step: 0.5 },
  medic_seek: { value: 16, min: 0, max: 50, step: 1 },            // a medic walks to wounded friends this near
  medic_save: { value: 0.5, min: 0, max: 1, step: 0.05 },         // chance a soldier falling near a medic is saved
  medic_save_radius: { value: 10, min: 0, max: 40, step: 1 },
  eng_radius: { value: 4, min: 1, max: 15, step: 0.5 },           // engineers repair our vehicles this close
  eng_repair: { value: 4, min: 0, max: 30, step: 0.5 },           // hp/s
  eng_build_time: { value: 7, min: 1, max: 60, step: 1 },         // seconds between sandbag rows
  scout_sight: { value: 54, min: 10, max: 120, step: 1 },
  scout_speed: { value: 1.25, min: 0.5, max: 2, step: 0.05 },

  // ---- Squads, orders and garrisons (js/systems/squads.js, js/systems/ordermenu.js) ----
  squad_size: { value: 8, min: 1, max: 12, step: 1 },            // most soldiers in one squad (Alt+1-6)
  smart_soldiers: { value: 1, min: 0, max: 1, step: 1 },        // 1 = soldiers score cover against every threat and take positions by role
  garrison_cap: { value: 6, min: 1, max: 12, step: 1 },          // most soldiers one building takes
  garrison_ruin: { value: 0.45, min: 0.1, max: 0.9, step: 0.05 }, // share of its walls left below which a building throws its soldiers out
  garrison_hurt: { value: 12, min: 0, max: 50, step: 1 },        // damage to each soldier thrown out by a collapse   // steepest smoothed rise between cells the tank takes (map report)

  // ---- Friendly vehicles: armoured car, anti-tank gun, support tank (js/systems/units.js, js/systems/entities.js) ----
  veh_accel: { value: 4, min: 1, max: 20, step: 0.5 },          // every vehicle but the command tank: speed gained or lost a second (m/s2)
  veh_lookahead: { value: 3.5, min: 1, max: 8, step: 0.5 },     // how far ahead along its path a driver steers (m): wider curves, no zigzag
  veh_wheel_turn: { value: 0.35, min: 0, max: 1, step: 0.05 },  // a wheeled vehicle's turning at a standstill, of its full turn rate (tracks pivot: 1)
  turret_scan: { value: 0.6, min: 0, max: 1.5, step: 0.05 },    // how far a vehicle's turret sweeps either side of its watch bearing with no target (rad)
  car_turret: { value: 90, min: 20, max: 300, step: 5 },        // armoured car turret, degrees a second
  car_hp: { value: 160, min: 30, max: 600, step: 10 },          // armoured car
  car_speed: { value: 8, min: 2, max: 16, step: 0.5 },
  car_range: { value: 28, min: 5, max: 60, step: 1 },
  car_damage: { value: 14, min: 1, max: 80, step: 1 },
  car_rate: { value: 0.5, min: 0.1, max: 3, step: 0.05 },
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

  // ---- Directional armour, hull turning and arcs of fire (js/systems/combat.js, js/systems/entities.js, js/systems/units.js) ----
  armor_front: { value: 0.5, min: 0.1, max: 2, step: 0.05 },
  armor_side: { value: 1, min: 0.1, max: 3, step: 0.05 },
  armor_rear: { value: 1.7, min: 0.1, max: 4, step: 0.05 },
  armor_top: { value: 1.4, min: 0.1, max: 4, step: 0.05 },      // mortar rounds and plunging hits
  armor_front_arc: { value: 45, min: 10, max: 80, step: 5 },    // half-angle of the front face, degrees
  armor_rear_arc: { value: 45, min: 10, max: 80, step: 5 },     // half-angle of the rear face, degrees
  hull_turn_boss: { value: 22, min: 5, max: 120, step: 1 },     // deg/s a still hull turns to face its enemy
  hull_turn_technical: { value: 80, min: 5, max: 200, step: 5 },
  hull_turn_enemy: { value: 90, min: 5, max: 300, step: 5 },      // the Horde's other vehicles (bikes and buggies turn on the spot, tanks slowly: see enemies.js)
  hull_turn_car: { value: 100, min: 5, max: 200, step: 5 },
  hull_turn_ltank: { value: 45, min: 5, max: 200, step: 5 },
  mg_arc: { value: 40, min: 10, max: 180, step: 5 },           // half-angle, degrees
  mg_turn: { value: 70, min: 10, max: 360, step: 5 },          // deg/s
  at_arc: { value: 30, min: 10, max: 180, step: 5 },
  at_turn: { value: 30, min: 5, max: 360, step: 5 },

  // ---- The Horde: enemies (js/systems/horde.js, js/content/base/raiders.js, js/content/base/enemies.js) ----
  camp_men_k: { value: 1.3, min: 0.5, max: 3, step: 0.1 },       // raiders in a camp, times the old count
  bomb_damage: { value: 120, min: 20, max: 400, step: 10 },      // a bomber's charge
  bomber_speed: { value: 1.5, min: 0.5, max: 3, step: 0.1 },     // bombers run (times the infantry speed)
  dog_speed: { value: 2.0, min: 0.5, max: 4, step: 0.1 },        // war dogs (times the infantry speed)
  dog_damage: { value: 9, min: 1, max: 60, step: 1 },            // a bite
  flame_damage: { value: 11, min: 1, max: 60, step: 1 },         // a flamethrower's burst (each 0.3 s)
  bike_hp: { value: 50, min: 10, max: 300, step: 10 },
  bike_speed: { value: 11, min: 2, max: 20, step: 0.5 },
  buggy_hp: { value: 80, min: 10, max: 400, step: 10 },
  buggy_speed: { value: 10, min: 2, max: 20, step: 0.5 },
  truck_hp: { value: 240, min: 50, max: 900, step: 10 },
  truck_speed: { value: 6.5, min: 1, max: 15, step: 0.5 },
  truck_unload: { value: 26, min: 6, max: 60, step: 1 },          // how near the fight an armoured truck drops its men
  rtank_hp: { value: 340, min: 50, max: 1500, step: 10 },          // the raiders' scrap tank
  rtank_speed: { value: 4, min: 1, max: 12, step: 0.5 },
  spg_hp: { value: 220, min: 50, max: 1000, step: 10 },            // the self-propelled gun
  spg_range: { value: 95, min: 30, max: 160, step: 5 },
  spg_damage: { value: 70, min: 10, max: 300, step: 5 },
  spg_reload: { value: 9, min: 2, max: 30, step: 0.5 },
  spg_scatter: { value: 5, min: 0, max: 15, step: 0.5 },
  depot_hp: { value: 400, min: 50, max: 2000, step: 10 },          // a fuel depot to blow up
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

  // ---- Tactics: how squads and raiders move under fire (js/tactics.js, js/systems/unitstep.js) ----
  smart_raiders: { value: 1, min: 0, max: 1, step: 1 },         // 1 = raider groups pin, flank, use buildings, call help and fall back
  bounding: { value: 1, min: 0, max: 1, step: 1 },              // 1 = squads ordered to move under fire advance in bounds, half covering
  cover_rethink: { value: 3, min: 1, max: 8, step: 0.5 },       // seconds between a unit's looks for a better position
  cover_margin: { value: 4, min: 0, max: 15, step: 1 },         // how much better a spot must score before a unit moves to it
  flank_share: { value: 0.34, min: 0, max: 0.6, step: 0.02 },   // share of a raider group's riflemen sent round the flank
  flank_dist: { value: 16, min: 8, max: 30, step: 1 },          // how far to the side of the target the flankers go
  reinforce_loss: { value: 0.3, min: 0.1, max: 0.9, step: 0.05 }, // losses at which a raider group calls the nearest calm group
  reinforce_range: { value: 90, min: 20, max: 200, step: 5 },   // how far that call reaches
  retreat_loss: { value: 0.6, min: 0.3, max: 1, step: 0.05 },   // losses at which a raider group falls back
  retreat_time: { value: 20, min: 5, max: 60, step: 1 },        // seconds a beaten group stays back before fighting on
  circle_radius: { value: 18, min: 8, max: 35, step: 1 },       // the distance technicals circle their target at
  leash: { value: 22, min: 5, max: 80, step: 1 },               // how far camp raiders chase from home

  // ---- Campaign, waves and missions (js/campaign.js, js/content/base/missions.js) ----
  horde_time: { value: 420, min: 30, max: 900, step: 10 },       // seconds on a sector before the Horde's hunters come
  wave_every: { value: 45, min: 10, max: 180, step: 5 },          // seconds between hunter waves
  wave_size: { value: 4, min: 1, max: 12, step: 1 },              // raiders in the first wave
  wave_grow: { value: 1, min: 0, max: 5, step: 0.5 },             // more raiders each wave
  exit_radius: { value: 10, min: 4, max: 20, step: 1 },           // how close to the exit the tank must be to leave
  hold_time: { value: 120, min: 20, max: 600, step: 10 },        // seconds to hold the spot for the engineers
  hold_radius: { value: 16, min: 6, max: 40, step: 1 },          // the ring the tank must stay in
  hold_wave: { value: 28, min: 8, max: 120, step: 2 },           // seconds between attacks on the held spot
  escort_count: { value: 5, min: 1, max: 12, step: 1 },          // refugees to bring to the exit
  escort_pay: { value: 10, min: 0, max: 100, step: 1 },          // scrap per refugee saved
  warlord_hp: { value: 1.6, min: 1, max: 5, step: 0.1 },         // a warlord vehicle is this much tougher
  npc_radius: { value: 7, min: 3, max: 15, step: 1 },             // how close the tank must come to talk to people
  mission_scrap: { value: 25, min: 0, max: 400, step: 10 },       // scrap for a sector's mission
  final_waves: { value: 6, min: 1, max: 15, step: 1 },            // waves in the last stand (the last brings the Chief)
  final_prep: { value: 60, min: 10, max: 300, step: 5 },          // seconds to set up before the first wave of the last stand
  final_gap: { value: 70, min: 20, max: 200, step: 5 },           // seconds between last-stand waves (sooner once a wave is beaten)
  max_squads: { value: 6, min: 1, max: 9, step: 1 },
  geo_combo: { value: 0.4, min: 0, max: 1, step: 0.05 },         // chance a sector has a second geography
  cache_bonus: { value: 15, min: 0, max: 200, step: 5 },        // extra scrap in a mission's cache

  // ---- Factions (js/factions.js) ----
  rep_friend: { value: 30, min: 10, max: 80, step: 5 },          // reputation at which a faction is a friend (and minus it, an enemy)
  rep_discount: { value: 0.35, min: 0, max: 0.8, step: 0.05 },   // price change at full reputation (friends pay less, enemies more)
  job_scrap: { value: 45, min: 20, max: 300, step: 10 },         // pay for a faction job (delivery, defence)
  raid_delay: { value: 30, min: 5, max: 120, step: 5 },           // seconds before the raid on the settlers' hamlet
  toll: { value: 40, min: 0, max: 200, step: 5 },                 // the deserters' toll at their checkpoint
  scout_reveal: { value: 60, min: 20, max: 160, step: 5 },        // radius the rats' scouts reveal

  // ---- Economy and barracks (js/systems/economy.js, js/systems/barracks.js, js/systems/units.js) ----
  loot_camp: { value: 0.12, min: 0, max: 1, step: 0.05 },          // chance a cleared camp leaves a hull module
  loot_technical: { value: 0.06, min: 0, max: 1, step: 0.05 },    // chance a destroyed technical leaves one
  loot_wreck: { value: 0.02, min: 0, max: 1, step: 0.05 },         // chance a wreck hides one
  cost_eng: { value: 50, min: 0, max: 300, step: 5 },
  cost_radio: { value: 45, min: 0, max: 300, step: 5 },
  cost_scout: { value: 40, min: 0, max: 300, step: 5 },
  start_scrap: { value: 40, min: 0, max: 2000, step: 10 },
  scrap_infantry: { value: 1, min: 0, max: 100, step: 1 },      // per raider killed
  scrap_vehicle: { value: 8, min: 0, max: 300, step: 5 },
  scrap_camp: { value: 15, min: 0, max: 600, step: 10 },        // bonus per camp cleared (x tier)
  scrap_wreck: { value: 6, min: 0, max: 200, step: 5 },        // per wreck picked up
  repair_cost: { value: 0.5, min: 0, max: 5, step: 0.1 },       // scrap per integrity point
  cost_rifle: { value: 30, min: 0, max: 300, step: 5 },
  cost_sniper: { value: 60, min: 0, max: 300, step: 5 },
  cost_mg: { value: 55, min: 0, max: 300, step: 5 },
  cost_medic: { value: 50, min: 0, max: 300, step: 5 },
  cost_mortar: { value: 85, min: 0, max: 400, step: 5 },
  cost_car: { value: 220, min: 0, max: 1000, step: 10 },
  cost_at: { value: 110, min: 0, max: 500, step: 5 },
  cost_ltank: { value: 340, min: 0, max: 1500, step: 10 },
  squad_max_size: { value: 4, min: 1, max: 8, step: 1 },

  // ---- Effects (js/systems/combat.js, js/systems/tank.js) ----
  debris_max: { value: 500, min: 0, max: 2000, step: 50 },
  debris_life: { value: 5, min: 0.5, max: 20, step: 0.5 },      // seconds a debris cube stays
  shake: { value: 0.6, min: 0, max: 3, step: 0.1 },
};
