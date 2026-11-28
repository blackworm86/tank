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
  struct_res: { value: 4, min: 2, max: 4, step: 2 },           // fine cells a metre in houses and blocks of flats (4 = 25 cm), read when a map is built (js/structs.js)
  struct_fill: { value: 0.375, min: 0.1, max: 0.9, step: 0.025 }, // share of a 1 m cell's fine cells that makes it solid for paths, cover and garrisons
  struct_ruin: { value: 0.55, min: 0, max: 1, step: 0.05 },     // how ruined the buildings stand at the start (0 whole, 1 stumps)
  struct_rubble: { value: 1, min: 0, max: 2, step: 0.1 },       // how high the rubble heaps under the ruins' holes
  struct_chip: { value: 0.2, min: 0.05, max: 0.6, step: 0.05 },  // metres a round chips off a wall where it strikes (heavy rounds 1.8 times)
  struct_settle: { value: 0.3, min: 0.1, max: 2, step: 0.1 },    // seconds between the chipped walls' updates (what falls, cover, paths, the drawn walls)
  industry_p: { value: 0.6, min: 0, max: 1, step: 0.05 },       // the chance a map holds an industrial zone (hangar, containers, steel water tower, walls, hedgehogs)
  pylon_gap: { value: 30, min: 0, max: 80, step: 5 },            // metres between the pylons of the power line across the map (0: none)
  trap_clusters: { value: 3, min: 0, max: 10, step: 1 },          // clusters of hedgehogs beside the roads a map
  city_tower: { value: 0.2, min: 0, max: 1, step: 0.05 },       // the chance a wide city lot holds a tower of 8 to 15 storeys (40% of them shot to a skeleton)
  statics_span: { value: 1, min: 0.3, max: 3, step: 0.1 },      // how far each material may reach out from what bears it (concrete 6 m, metal 4, wood 3, brick 1.5), times
  statics_load: { value: 1, min: 0.2, max: 5, step: 0.1 },       // the load a post or a wall carries before it is crushed, times
  statics_moment: { value: 1, min: 0.2, max: 5, step: 0.1 },     // the overhang (weight times metres) a post or a wall holds before it snaps, times
  statics_tip: { value: 0.3, min: 0, max: 2, step: 0.05 },      // metres the centre of what stands on a floor may lie outside what bears it before it tips over
  struct_dmg: { value: 8, min: 0.5, max: 40, step: 0.5 },         // a hit's strength on structures: this times its damage to struct_dmg_exp (cell integrity FMHP: concrete 60, brick 40, plaster 30, wood 30)
  struct_dmg_exp: { value: 0.7, min: 0.3, max: 1, step: 0.05 },   // how a bigger gun's damage counts on walls (1: in proportion)
  struct_he_r: { value: 1.2, min: 0.5, max: 3, step: 0.05 },      // a blast's reach on structures, times its radius (the damage falls off with the square of the distance)
  struct_ap_k: { value: 1.6, min: 0.2, max: 5, step: 0.1 },       // a piercing round's or a shaped charge's strength on each cell it crosses, times
  struct_ap_hole: { value: 0.6, min: 0.1, max: 2, step: 0.05 },   // the rim of a piercing round's hole, times its blast radius (a 105 makes a wider hole than a 25)
  struct_bullet: { value: 6, min: 0, max: 40, step: 0.5 },        // a bullet's damage on a wall cell, times its softness (heavy machine gun: 3 times)
  struct_weak: { value: 0.8, min: 0, max: 1, step: 0.05 },        // share of its load and moment a cell about to give way no longer bears
  struct_crack_dark: { value: 0.5, min: 0, max: 0.8, step: 0.05 }, // how much darker the most cracked cells are drawn
  collapse_impact: { value: 0.5, min: 0, max: 2, step: 0.05 },   // how hard a falling piece strikes a roof or a wall it lands on: crater radius a cube root of m3, times its speed
  collapse_tip: { value: 3, min: 0, max: 8, step: 0.5 },         // metres a second (and a turn) a piece that tips over goes that way as it falls
  statics_iter: { value: 3, min: 1, max: 10, step: 1 },          // rounds of a collapse worked out a settle (the rest at the next one)
  struct_mesh_ms: { value: 6, min: 1, max: 30, step: 1 },       // milliseconds a frame may spend redrawing changed structures (at least one a frame)
  collapse_dmg: { value: 80, min: 0, max: 300, step: 5 },        // damage a falling piece does a cubic metre to whoever is under it (soldiers have inf_hp 30)
  collapse_cap: { value: 3, min: 0.5, max: 10, step: 0.5 },      // cubic metres of a piece that count for its damage at most
  collapse_veh: { value: 0.35, min: 0, max: 1, step: 0.05 },     // a light vehicle takes this share (then its roof armour, armor_top)
  collapse_heavy: { value: 0.1, min: 0, max: 1, step: 0.05 },    // a tank takes this share (then its roof armour)
  collapse_min: { value: 0.06, min: 0.01, max: 0.5, step: 0.01 }, // cubic metres below which a loose bit crumbles to dust instead of falling
  collapse_delay: { value: 0.7, min: 0, max: 3, step: 0.05 },     // seconds a failing structure creaks (dust, a groan) before it gives way, give or take half
  collapse_hinge: { value: 1.6, min: 0.3, max: 5, step: 0.1 },    // how fast a tall piece going over turns on its edge
  collapse_chunk: { value: 2.6, min: 0.3, max: 5, step: 0.1 },    // metres the blocks a piece breaks into when it lands at 7 m/s (harder: smaller; wood and metal: twice)
  collapse_frac: { value: 0.15, min: 0, max: 1, step: 0.05 },      // share of the cells along the cracks between blocks that break off as rubble
  collapse_block: { value: 0.08, min: 0.01, max: 1, step: 0.01 }, // cubic metres below which a block goes to rubble
  collapse_spread: { value: 0.8, min: 0, max: 3, step: 0.1 },     // metres the blocks scatter from where the piece lands, at 10 m/s
  collapse_g: { value: 12, min: 4, max: 30, step: 1 },           // how fast the pieces fall, m/s2
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
  river_fords: { value: 1, min: 0, max: 3, step: 1 },            // fords on a river that is not the wide one (the wide river always has 2)
  bridge_rubble: { value: 1, min: 1, max: 1, step: 1 },          // a blown bridge deck lies this many metres under the water: a ford of wreckage, never a gap
  geo_force: { value: 0, min: 0, max: 4, step: 1 },            // 0 = the campaign's geography; 1 ridges, 2 wide river, 3 plateaus, 4 hills (testing)
  ridge_height: { value: 13, min: 4, max: 20, step: 1 },        // how tall the ridges stand over the land (passes cut through)
  plateau_height: { value: 10, min: 3, max: 16, step: 1 },      // the plateaus' cliff height
  hills_k: { value: 1.8, min: 1, max: 3, step: 0.1 },           // the hills geography: how much taller the mountains grow

  // ---- Camera and orders menu (js/view.js, js/systems/play.js, js/systems/ordermenu.js) ----
  context_menu: { value: 1, min: 0, max: 1, step: 1 },          // 1: right-click opens the menu of orders; 0: right-click orders at once (move/attack/enter)
  cam_pitch: { value: 56, min: 35, max: 75, step: 1 },          // degrees down from horizon, zoomed out (bird's eye)
  cam_pitch_near: { value: 33, min: 15, max: 60, step: 1 },     // degrees down from horizon, zoomed in (over the tank's shoulders, RTS-style)
  cam_ahead: { value: 4, min: 0, max: 30, step: 1 },            // metres the camera looks ahead of the tank, zoomed in (none zoomed out)
  vox_jitter: { value: 0.05, min: 0, max: 0.2, step: 0.01 },   // per-voxel brightness variation (the larger, the more the surface looks gridded)
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
  march_speed: { value: 3.8, min: 2, max: 8, step: 0.1 },        // the tank's infantry pace (the default; Caps Lock: full speed, Shift held: the other one)
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
  rl_damage: { value: 150, min: 20, max: 500, step: 5 },          // shaped-charge rocket launcher (test map, garage)
  rl_reload: { value: 2.6, min: 0.5, max: 8, step: 0.1 },
  rl_blast: { value: 0.9, min: 0.2, max: 3, step: 0.05 },
  ammo_rl: { value: 14, min: 1, max: 100, step: 1 },
  rl_weight: { value: 0.4, min: 0, max: 3, step: 0.1 },
  gl_reload: { value: 1.1, min: 0.2, max: 5, step: 0.1 },
  // iteration 75: each main weapon its own way of fighting. *_move: its scatter while moving (times the hull's);
  // the grenade launcher lobs (speed and gravity of its grenades, times a shell's): over walls and cover
  ac25_move: { value: 0.6, min: 0.2, max: 3, step: 0.05 },        // the 25mm: steady on the move, for a tank that never stops
  gl_move: { value: 1, min: 0.2, max: 3, step: 0.05 },
  gl_speed_k: { value: 0.45, min: 0.2, max: 1, step: 0.05 },
  gl_g_k: { value: 3, min: 1, max: 6, step: 0.1 },
  c75_move: { value: 0.85, min: 0.2, max: 3, step: 0.05 },        // the 75mm: the balanced gun
  c105_move: { value: 1.6, min: 0.2, max: 3, step: 0.05 },        // the 105mm: stop and shoot
  rl_move: { value: 1.1, min: 0.2, max: 3, step: 0.05 },
  flamer_dps: { value: 60, min: 5, max: 300, step: 5 },           // the flamethrower: damage a second to whoever is in the stream (fire type: dk_fire_*), cover or not
  flamer_range: { value: 16, min: 4, max: 40, step: 1 },          // metres the stream reaches
  flamer_cone: { value: 12, min: 2, max: 45, step: 1 },           // half the stream's width, degrees
  flamer_fuel: { value: 7, min: 1, max: 30, step: 0.5 },          // seconds of stream in the tank
  flamer_regen: { value: 0.7, min: 0, max: 5, step: 0.05 },       // seconds of fuel back each second it is not firing
  flamer_wait: { value: 0.8, min: 0, max: 5, step: 0.1 },         // seconds after a stream before the fuel comes back
  flamer_ignite: { value: 0.25, min: 0.05, max: 2, step: 0.05 },  // seconds between the fires the stream lights where it ends
  flamer_move: { value: 1, min: 0.2, max: 3, step: 0.05 },
  flamer_weight: { value: 0.3, min: 0, max: 3, step: 0.1 },
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
  mod_medbay: { value: 2, min: 0, max: 20, step: 0.5 },           // hp/s the field hospital gives soldiers near the hull
  smoke_radius: { value: 8, min: 2, max: 20, step: 1 },
  mod_rocket_damage: { value: 70, min: 5, max: 300, step: 5 },    // rocket pod (second weapon)
  mod_cage: { value: 0.45, min: 0, max: 0.9, step: 0.05 },        // rocket damage the cage stops
  mod_skirts: { value: 0.3, min: 0, max: 0.9, step: 0.05 },       // side and rear damage the skirts stop
  mod_blade: { value: 0.25, min: 0, max: 0.9, step: 0.05 },       // front damage the dozer blade stops
  mod_blade_climb: { value: 0.5, min: 0, max: 4, step: 0.1 },    // metres more the blade lets the hull climb
  mod_radar_map: { value: 95, min: 0, max: 300, step: 5 },       // the search radar: map revealed this far
  mod_radar_blip: { value: 85, min: 0, max: 300, step: 5 },      // enemies shown as blips this far
  mod_radar_every: { value: 5, min: 0.5, max: 20, step: 0.5 },   // seconds between sweeps
  mod_thermal: { value: 1.4, min: 1, max: 3, step: 0.05 },        // tank sight multiplier
  mod_autorep: { value: 1.5, min: 0, max: 20, step: 0.5 },        // hp/s once out of fire
  mod_autorep_wait: { value: 6, min: 0, max: 30, step: 1 },
  mod_rack_ammo: { value: 1.5, min: 1, max: 3, step: 0.1 },       // rounds carried multiplier

  // ---- The 9 standard systems (js/modules.js; iteration 61): each level costs std_cost x the level ----
  std_max_level: { value: 3, min: 1, max: 6, step: 1 },          // levels each standard system has
  std_cost: { value: 50, min: 0, max: 500, step: 5 },            // scrap for level 1 (level n: n times this)
  std_turret_k: { value: 0.35, min: 0, max: 1, step: 0.05 },     // turret traverse per level
  std_stab_k: { value: 0.2, min: 0, max: 0.4, step: 0.02 },      // spread on the move cut per level (aim half of it)
  std_gun_k: { value: 0.1, min: 0, max: 0.25, step: 0.01 },      // reload cut per level (damage and spread 0.8 of it)
  std_coax_k: { value: 0.6, min: 0, max: 2, step: 0.05 },        // coax heat it bears per level (cooling half, rate 0.12)
  std_armor_k: { value: 0.12, min: 0, max: 0.3, step: 0.01 },    // damage the armour stops per level (rear half)
  std_armor_hp: { value: 40, min: 0, max: 200, step: 5 },        // integrity per armour level
  std_engine_k: { value: 0.1, min: 0, max: 0.4, step: 0.02 },    // speed per level (acceleration 4x)
  std_tracks_k: { value: 0.1, min: 0, max: 0.4, step: 0.02 },    // turn per level (climb: 1.5 m times it; at the top it stays under map_cliff)
  std_bay_k: { value: 2, min: 0, max: 6, step: 1 },              // seats per level
  std_radio_k: { value: 0.35, min: 0, max: 1, step: 0.05 },      // radio range per level


  // ---- Friendly soldiers (js/systems/units.js, js/systems/entities.js, js/systems/unitstep.js) ----
  turret_return: { value: 2, min: 0.2, max: 6, step: 0.1 },      // rad/s an idle vehicle turret swings back to the front
  inf_speed: { value: 4.2, min: 1, max: 10, step: 0.1 },        // units/s
  fallen_show: { value: 4, min: 0, max: 15, step: 0.5 },          // seconds a fallen soldier stays crossed out on his squad's card before he leaves it
  inf_hp: { value: 30, min: 5, max: 150, step: 1 },
  rifle_range: { value: 22, min: 5, max: 60, step: 1 },
  rifle_damage: { value: 6, min: 1, max: 50, step: 1 },
  rifle_rate: { value: 1.2, min: 0.1, max: 5, step: 0.05 },     // seconds between shots
  rifle_acc: { value: 0.5, min: 0.05, max: 1, step: 0.05 },
  sniper_range: { value: 80, min: 10, max: 90, step: 1 },
  sniper_sight: { value: 54, min: 20, max: 100, step: 1 },        // how far a sniper spots enemies
  sniper_standoff: { value: 24, min: 8, max: 50, step: 1 },       // a sniper keeps this far from the enemy
  climb_max: { value: 12, min: 2, max: 30, step: 1 },              // the tallest natural rock face a sniper or a scout scales (m)
  climb_anim: { value: 2.6, min: 0.5, max: 8, step: 0.1 },     // radians of the climbing stroke per metre climbed (the hands' pace on a rock face)
  climb_rate: { value: 1.1, min: 0.2, max: 4, step: 0.1 },         // metres a second up or down a rock face
  climb_cost: { value: 1.2, min: 0.2, max: 6, step: 0.1 },         // path cost per metre climbed (higher: they look longer for a way round)
  ambush_trigger: { value: 0.6, min: 0.2, max: 1, step: 0.05 },   // an ambush opens fire when the enemy is within this share of its range
  ambush_reveal: { value: 8, min: 2, max: 30, step: 1 },          // raiders see an unsprung ambush only this close
  ambush_bonus: { value: 1.6, min: 1, max: 3, step: 0.1 },        // aim multiplier for 4 s after an ambush springs
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
  cover_blast_light: { value: 0.8, min: 0, max: 1, step: 0.05 }, // blast damage multiplier behind light cover (sandbags, junk)
  cover_show: { value: 6, min: 2, max: 12, step: 1 },            // metres around the mouse the cover map shows (command mode, infantry selected)
  cover_blast: { value: 0.55, min: 0, max: 1, step: 0.05 },     // blast damage multiplier for infantry in heavy cover from the blast side
  unstick_time: { value: 1.6, min: 0.5, max: 6, step: 0.1 },    // seconds without headway before a unit looks for another way

  // ---- Experience and ranks (js/systems/combat.js, js/systems/entities.js, js/systems/unitstep.js) ----
  xp_kill: { value: 10, min: 0, max: 50, step: 1 },               // xp for a kill (x3 for a vehicle)
  xp_hit: { value: 1, min: 0, max: 10, step: 1 },                 // xp for each hit on an enemy
  xp_camp: { value: 8, min: 0, max: 50, step: 1 },                // xp to every soldier alive when a camp falls
  rank_xp_1: { value: 15, min: 1, max: 200, step: 1 },            // xp for Esperto
  rank_xp_2: { value: 40, min: 1, max: 400, step: 1 },            // xp for Veterano
  rank_xp_3: { value: 80, min: 1, max: 800, step: 1 },            // xp for Elite
  xp_ref_hp: { value: 26, min: 1, max: 300, step: 1 },           // an enemy with this much health (a raider) is worth xp_kill; vehicles count twice
  xp_falloff: { value: 0.25, min: 0, max: 1, step: 0.05 },        // XP lost for each level a soldier stands above the enemy (0-9 ladder)
  spec_level: { value: 2, min: 1, max: 3, step: 1 },              // the Job level that unlocks its specialisation
  recruit_k: { value: 0.75, min: 0.3, max: 1, step: 0.05 },       // a Recruit's damage and aim against a rifleman's
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
  medic_power: { value: 100, min: 0, max: 500, step: 10 },        // a medic's healing each sector, hp for hp (iteration 63)
  medic_save_cost: { value: 25, min: 0, max: 100, step: 5 },      // power a save from death costs him
  eng_calm: { value: 5, min: 0, max: 30, step: 0.5 },             // seconds out of the fight before an engineer repairs
  eng_scrap_hp: { value: 0.3, min: 0, max: 3, step: 0.05 },       // scrap each hp his repairs cost
  grenade_cd: { value: 9, min: 1, max: 60, step: 0.5 },           // seconds between an engineer's grenades
  grenade_range: { value: 16, min: 4, max: 40, step: 1 },
  grenade_damage: { value: 40, min: 5, max: 200, step: 5 },
  grenade_blast: { value: 1.6, min: 0.5, max: 4, step: 0.1 },
  nest_time: { value: 4, min: 0, max: 30, step: 0.5 },            // seconds a machine gunner stands before his nest is up
  nest_rate: { value: 0.75, min: 0.3, max: 1, step: 0.05 },       // his time between bursts in the nest
  nest_sup: { value: 1.6, min: 1, max: 4, step: 0.1 },            // and how much longer it pins them down
  radio_op_range: { value: 18, min: 4, max: 60, step: 1 },        // a radio operator's own ring
  high_acc: { value: 0.05, min: 0, max: 0.2, step: 0.01 },       // aim per metre above the target (iteration 65), less per metre below
  high_max: { value: 10, min: 0, max: 30, step: 1 },              // metres of height that count
  high_sight: { value: 1.2, min: 0, max: 4, step: 0.1 },          // metres more he spots per metre above
  bld_acc: { value: 1.2, min: 1, max: 2, step: 0.05 },            // aim from a window
  bld_cover: { value: 0.55, min: 0.1, max: 1, step: 0.05 },       // aim at a man behind a window
  bld_taken: { value: 0.7, min: 0.1, max: 1, step: 0.05 },        // what gets through to a man inside (walls)
  scout_sight: { value: 54, min: 10, max: 120, step: 1 },
  scout_speed: { value: 1.25, min: 0.5, max: 2, step: 0.05 },

  // ---- Squads, orders and garrisons (js/systems/squads.js, js/systems/ordermenu.js) ----
  squad_size: { value: 8, min: 1, max: 12, step: 1 },            // most soldiers in one squad (Alt+1-6)
  smart_soldiers: { value: 1, min: 0, max: 1, step: 1 },        // 1 = soldiers score cover against every threat and take positions by role
  garrison_cap: { value: 6, min: 1, max: 12, step: 1 },          // most soldiers one building takes
  garrison_ruin: { value: 0.45, min: 0.1, max: 0.9, step: 0.05 }, // share of its walls left below which a building throws its soldiers out
  garrison_hurt: { value: 12, min: 0, max: 50, step: 1 },        // damage to each soldier thrown out by a collapse   // steepest smoothed rise between cells the tank takes (map report)

  // ---- Friendly vehicles: armoured car, anti-tank gun, support tank (js/systems/units.js, js/systems/entities.js) ----
  veh_gap: { value: 1.2, min: 0.2, max: 4, step: 0.1 },          // metres two vehicles keep between their hulls: arrival spots, giving way
  veh_accel: { value: 4, min: 1, max: 20, step: 0.5 },          // every vehicle but the command tank: speed gained or lost a second (m/s2)
  veh_lookahead: { value: 3.5, min: 1, max: 8, step: 0.5 },     // how far ahead along its path a driver steers (m): wider curves, no zigzag
  veh_wheel_turn: { value: 0.35, min: 0, max: 1, step: 0.05 },  // a wheeled vehicle's turning at a standstill, of its full turn rate (tracks pivot: 1)
  turret_scan: { value: 0.6, min: 0, max: 1.5, step: 0.05 },    // how far a vehicle's turret sweeps either side of its watch bearing with no target (rad)
  jeep_hp: { value: 90, min: 20, max: 400, step: 5 },            // jeep: open, fast, thin-skinned (rifles hurt it)
  jeep_speed: { value: 10.5, min: 2, max: 18, step: 0.5 },
  jeep_turret: { value: 160, min: 20, max: 400, step: 5 },       // its pintle machine gun, degrees a second
  jeep_seats: { value: 4, min: 0, max: 4, step: 1 },             // soldiers it carries in the open: they fire their own weapons from it
  jeep_acc: { value: 0.55, min: 0.05, max: 1, step: 0.01 },
  at_range: { value: 34, min: 10, max: 90, step: 1 },          // the Anti-tank soldier's rocket
  at_damage: { value: 95, min: 10, max: 400, step: 5 },
  at_rate: { value: 8, min: 0.5, max: 30, step: 0.5 },          // seconds between his rockets
  at_speed: { value: 70, min: 20, max: 160, step: 5 },          // round speed, units/s
  ltank_hp: { value: 260, min: 50, max: 1000, step: 10 },
  ltank_speed: { value: 5.5, min: 1, max: 14, step: 0.5 },
  ltank_range: { value: 38, min: 10, max: 80, step: 1 },
  ltank_damage: { value: 60, min: 5, max: 300, step: 5 },
  ltank_reload: { value: 4, min: 0.5, max: 15, step: 0.25 },
  htrack_hp: { value: 200, min: 30, max: 800, step: 10 },        // the half-track (iteration 64)
  htrack_speed: { value: 8, min: 2, max: 16, step: 0.5 },
  htrack_seats: { value: 6, min: 0, max: 6, step: 1 },
  hmg_k: { value: 1.6, min: 0.5, max: 4, step: 0.1 },             // its heavy machine gun's damage against a machine gun's
  td_hp: { value: 300, min: 50, max: 1200, step: 10 },            // the tank destroyer
  td_speed: { value: 5, min: 1, max: 14, step: 0.5 },
  td_range: { value: 55, min: 10, max: 90, step: 1 },
  td_damage: { value: 170, min: 10, max: 600, step: 10 },
  td_reload: { value: 6, min: 1, max: 20, step: 0.5 },
  td_traverse: { value: 18, min: 5, max: 120, step: 1 },          // degrees a second its casemate gun turns

  // ---- Damage types and armour thickness (js/damage.js, js/systems/combat.js) ----
  pen_ac25: { value: 30, min: 0, max: 300, step: 5 },             // mm a piercing round of the 25mm gets through at point blank
  pen_gl: { value: 20, min: 0, max: 300, step: 5 },
  pen_c75: { value: 90, min: 0, max: 300, step: 5 },
  pen_c105: { value: 140, min: 0, max: 300, step: 5 },
  pen_rl: { value: 180, min: 0, max: 400, step: 5 },              // shaped charge: the same at any range
  pen_ap: { value: 90, min: 0, max: 300, step: 5 },               // a piercing round with none of its own (the anti-tank gun)
  pen_heat: { value: 120, min: 0, max: 400, step: 5 },            // a rocket with none of its own (RPG)
  pen_he: { value: 15, min: 0, max: 100, step: 1 },               // blast: only thin plate
  pen_frag: { value: 4, min: 0, max: 50, step: 1 },
  pen_bullet: { value: 4, min: 0, max: 50, step: 1 },
  pen_heavy: { value: 18, min: 0, max: 80, step: 1 },             // heavy machine gun
  ap_falloff: { value: 400, min: 50, max: 2000, step: 25 },       // metres over which a piercing round loses all its bite (never under 40%)
  armor_mm_light: { value: 10, min: 0, max: 100, step: 1 },       // front plate of jeeps, buggies, technicals, armoured cars
  armor_mm_medium: { value: 40, min: 0, max: 200, step: 5 },      // support tank, armoured lorry, guns
  armor_mm_heavy: { value: 100, min: 0, max: 300, step: 5 },      // tanks
  armor_mm_side: { value: 0.6, min: 0.1, max: 1, step: 0.05 },    // the sides' thickness, a share of the front's
  armor_mm_rear: { value: 0.4, min: 0.1, max: 1, step: 0.05 },
  armor_mm_top: { value: 0.25, min: 0.05, max: 1, step: 0.05 },
  ricochet_r: { value: 0.7, min: 0.1, max: 1, step: 0.05 },       // a piercing round under this share of the plate glances off
  ricochet_k: { value: 0.04, min: 0, max: 0.5, step: 0.01 },      // the share of damage a ricochet still does
  dk_bullet_inf: { value: 1, min: 0, max: 3, step: 0.05 },        // damage types: share that counts on soldiers (inf) and vehicles (veh)
  dk_bullet_veh: { value: 1, min: 0, max: 3, step: 0.05 },
  dk_frag_inf: { value: 0.8, min: 0, max: 3, step: 0.05 },
  dk_frag_veh: { value: 0.3, min: 0, max: 3, step: 0.05 },
  dk_he_inf: { value: 1.1, min: 0, max: 3, step: 0.05 },
  dk_he_veh: { value: 0.6, min: 0, max: 3, step: 0.05 },
  dk_ap_inf: { value: 0.5, min: 0, max: 3, step: 0.05 },
  dk_ap_veh: { value: 1.4, min: 0, max: 3, step: 0.05 },
  dk_heat_inf: { value: 0.6, min: 0, max: 3, step: 0.05 },
  dk_heat_veh: { value: 1.3, min: 0, max: 3, step: 0.05 },
  dk_fire_inf: { value: 1, min: 0, max: 3, step: 0.05 },
  dk_fire_veh: { value: 0.15, min: 0, max: 3, step: 0.05 },
  // the main gun's rounds (iteration 74): unit, the blast's reach on men and vehicles; ground, the crater it digs in earth
  // and rock; bld, its strength on walls (times the hit's damage); all times the weapon's own blast and damage
  shell_he_unit: { value: 1, min: 0.1, max: 3, step: 0.05 },     // explosive: the all-rounder, breaches walls and cover
  shell_he_ground: { value: 1, min: 0, max: 3, step: 0.05 },
  shell_he_bld: { value: 1, min: 0, max: 3, step: 0.05 },
  shell_ap_unit: { value: 0.4, min: 0.1, max: 3, step: 0.05 },   // piercing: armour; a narrow hole through a wall, next to no blast
  shell_ap_ground: { value: 0.35, min: 0, max: 3, step: 0.05 },
  shell_ap_bld: { value: 0.7, min: 0, max: 3, step: 0.05 },
  shell_frag_unit: { value: 2, min: 0.1, max: 3, step: 0.05 },   // fragmentation: a wide hail on men, scarcely a scratch on walls and ground
  shell_frag_ground: { value: 0.3, min: 0, max: 3, step: 0.05 },
  shell_frag_bld: { value: 0.15, min: 0, max: 3, step: 0.05 },
  shell_frag_cover: { value: 0.5, min: 0, max: 1, step: 0.05 },  // splinters over cover: how much of the cover's protection still counts (light cover none)
  shell_inc_unit: { value: 1.1, min: 0.1, max: 3, step: 0.05 },  // incendiary: fire on what burns, no crater
  shell_inc_ground: { value: 0.25, min: 0, max: 3, step: 0.05 },
  shell_inc_bld: { value: 0.2, min: 0, max: 3, step: 0.05 },
  splash_veh: { value: 0.45, min: 0, max: 1, step: 0.05 },        // share of a blast's splash a vehicle takes (then its armour)
  splash_pierce: { value: 0.4, min: 0, max: 1, step: 0.05 },      // a piercing or shaped-charge round's splash, a share of a blast's
  dmg_numbers: { value: 1, min: 0, max: 1, step: 1 },             // 1: damage numbers over the units hit
  dmg_merge: { value: 0.35, min: 0, max: 2, step: 0.05 },         // seconds within which hits on a unit add up into one number

  // ---- Fire (js/fire.js) ----
  fire_burn: { value: 0.12, min: 0.01, max: 1, step: 0.01 },      // share of a burning cell's integrity gone a second (a plank lasts about 8 s)
  fire_spread: { value: 0.08, min: 0, max: 1, step: 0.01 },       // chance a half second a fire catches a burnable neighbour, times how readily it burns (upward twice)
  fire_max: { value: 400, min: 0, max: 2000, step: 50 },          // fires burning at once at most
  fire_dps: { value: 14, min: 0, max: 100, step: 1 },             // damage a second to whoever stands within fire_r of a fire (fire type: dk_fire_*)
  fire_r: { value: 1.3, min: 0.3, max: 4, step: 0.1 },
  fire_ground_s: { value: 8, min: 0, max: 30, step: 0.5 },        // seconds a burning patch on the ground lasts
  fire_ignite: { value: 0.35, min: 0.01, max: 1, step: 0.01 },    // chance a burnable cell in an incendiary's reach catches, times how readily it burns
  fire_ignite_max: { value: 24, min: 1, max: 200, step: 1 },      // cells an incendiary sets alight at most (the fire spreads from them)
  fire_inc_r: { value: 0.9, min: 0.5, max: 4, step: 0.1 },        // reach of an incendiary's flames, times its blast radius

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
  hull_turn_jeep: { value: 130, min: 5, max: 300, step: 5 },
  hull_turn_ltank: { value: 45, min: 5, max: 200, step: 5 },
  hull_turn_td: { value: 40, min: 5, max: 200, step: 5 },
  hull_turn_htrack: { value: 80, min: 5, max: 300, step: 5 },
  mg_arc: { value: 40, min: 10, max: 180, step: 5 },           // half-angle, degrees
  mg_turn: { value: 70, min: 10, max: 360, step: 5 },          // deg/s

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
  ai_exp_k: { value: 0.1, min: 0, max: 0.2, step: 0.01 },         // per level (0-9): how much sooner and readier a soldier repositions (iteration 66)
  ai_high_k: { value: 0.25, min: 0, max: 1, step: 0.05 },         // per level: how much he wants height
  ai_sense_cd: { value: 20, min: 2, max: 120, step: 1 },          // seconds between a squad's own decisions (a building, a retreat)
  ai_retreat_alive: { value: 0.5, min: 0, max: 1, step: 0.05 },   // share of the squad left, hurt, that makes it fall back
  ai_retreat_odds: { value: 2.5, min: 1, max: 6, step: 0.5 },     // or enemies near it (vehicles x3) per soldier
  ai_bld_level: { value: 4, min: 0, max: 9, step: 1 },            // squad level that takes buildings on its own
  ai_bld_range: { value: 14, min: 4, max: 40, step: 1 },          // how far it looks for one
  flank_share: { value: 0.5, min: 0, max: 0.6, step: 0.02 },   // share of a raider group's riflemen sent round the flank
  flank_dist: { value: 16, min: 8, max: 30, step: 1 },          // how far to the side of the target the flankers go
  task_time: { value: 40, min: 10, max: 120, step: 5 },          // seconds a soldier keeps at a task the player gave before giving up (iteration 71)
  smoke_throw: { value: 22, min: 8, max: 40, step: 1 },           // how far a soldier throws a smoke grenade
  smoke_nade_r: { value: 4.5, min: 2, max: 10, step: 0.5 },       // the smoke cloud's radius
  smoke_nade_time: { value: 12, min: 4, max: 30, step: 1 },       // seconds the smoke lasts
  squad_smokes: { value: 2, min: 0, max: 6, step: 1 },            // smoke grenades each squad has per sector
  retreat_speed: { value: 1.25, min: 1, max: 1.8, step: 0.05 }, // falling back on the tank, the soldiers run this much faster (iteration 70)
  watch_arc: { value: 90, min: 30, max: 180, step: 5 },          // degrees of the sector a watching squad covers
  watch_acc: { value: 1.15, min: 1, max: 1.6, step: 0.05 },      // aim of a squad set in its sector
  watch_draw: { value: 20, min: 8, max: 40, step: 1 },            // metres of the sector's fan drawn on the ground
  form_gap: { value: 1.8, min: 1, max: 4, step: 0.1 },          // metres between soldiers in a formation (iteration 68)
  form_veh_gap: { value: 5, min: 3, max: 10, step: 0.5 },       // metres between a squad's vehicles in a formation
  form_sq_gap: { value: 9, min: 5, max: 18, step: 1 },          // metres between the squads following the tank in its formation
  form_lead: { value: 1.8, min: 0, max: 4, step: 0.2 },         // the march slots are set this far ahead of the leader, so the men keep pace with him
  form_radio_k: { value: 0.55, min: 0.3, max: 0.9, step: 0.05 }, // the tank's formation fits within this share of the radio's reach
  form_catch_d: { value: 8, min: 3, max: 20, step: 1 },         // a following unit this far from its slot in the tank's formation hurries
  form_catch_speed: { value: 1.3, min: 1, max: 1.8, step: 0.05 }, // how much it hurries
  form_join: { value: 7, min: 2, max: 15, step: 1 },            // the leader this close to the end: the formation breaks and each goes to his place
  form_lead_speed: { value: 0.85, min: 0.5, max: 1, step: 0.05 }, // the leader of a formation walks this much slower, so his men keep up
  form_wait_lag: { value: 3, min: 1, max: 8, step: 0.5 },       // a man this far behind his slot makes the leader wait
  form_wait_speed: { value: 0.4, min: 0.1, max: 1, step: 0.05 }, // the leader's pace while he waits
  form_col_speed: { value: 1.1, min: 1, max: 1.4, step: 0.05 }, // a column on the march moves this much faster
  form_line_acc: { value: 1.1, min: 1, max: 1.5, step: 0.05 },  // a line's aim at targets ahead of it
  form_line_flank: { value: 1.15, min: 1, max: 1.6, step: 0.05 }, // damage a line takes from the flank or back
  form_wedge_acc: { value: 1.05, min: 1, max: 1.3, step: 0.05 }, // a wedge's or an echelon's aim
  foe_band: { value: 0.75, min: 0.3, max: 1, step: 0.05 },      // raiders on foot hold at this share of their weapon's range (iteration 67)
  foe_cover_r: { value: 9, min: 3, max: 14, step: 1 },          // how far round a raider looks for cover
  foe_high_k: { value: 0.8, min: 0, max: 3, step: 0.1 },        // score a raider gives each metre of height
  foe_bld_range: { value: 18, min: 0, max: 30, step: 1 },       // a raider takes a free building with its door this close
  foe_veh_band: { value: 0.7, min: 0.3, max: 1, step: 0.05 },   // an enemy vehicle stops at this share of its gun's range once it sees its target
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
  max_squads: { value: 4, min: 1, max: 9, step: 1 },
  vet_squad_chance: { value: 0.3, min: 0, max: 1, step: 0.05 },   // chance a checkpoint of the 4th offers its squad of veterans (iteration 76: whole squads are rare)
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
  cost_recruit: { value: 20, min: 0, max: 300, step: 5 },        // every new soldier is a Recruit (iteration 62)
  cost_rifle: { value: 30, min: 0, max: 300, step: 5 },
  cost_sniper: { value: 60, min: 0, max: 300, step: 5 },
  cost_mg: { value: 55, min: 0, max: 300, step: 5 },
  cost_medic: { value: 50, min: 0, max: 300, step: 5 },
  cost_jeep: { value: 140, min: 0, max: 1000, step: 10 },
  cost_at: { value: 110, min: 0, max: 500, step: 5 },
  cost_ltank: { value: 340, min: 0, max: 1500, step: 10 },
  cost_td: { value: 360, min: 0, max: 1500, step: 10 },
  cost_htrack: { value: 220, min: 0, max: 1000, step: 10 },
  squad_max_size: { value: 6, min: 1, max: 8, step: 1 },

  // ---- Effects (js/systems/combat.js, js/systems/tank.js) ----
  debris_max: { value: 500, min: 0, max: 2000, step: 50 },
  debris_life: { value: 5, min: 0.5, max: 20, step: 0.5 },      // seconds a debris cube stays
  shake: { value: 0.6, min: 0, max: 3, step: 0.1 },
};
