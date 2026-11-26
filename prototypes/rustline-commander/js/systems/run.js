// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// A new sector's run: the state, the tank and what carries over, the camps and patrols. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- A new run ------------------------------------------------------------------------------------------
/** Generates the map and places the tank, the first squads and every raider. */
/** The hull the title screen has picked for the next run. */
const HULL_PICK = { id: 'apc' };
function newRun(carry) {
  genWorld();
  Object.assign(state, {
    ents: [], squads: [], proj: [], debris: [], fx: [], tracers: [], marks: [], pickups: [], floats: [], msgs: [], groups: [],
    fit: {}, depot: [], hpSel: null, lookKey: 1, blips: [], radarT: 0,
    hull: HULL_PICK.id, weapon: HULLS[HULL_PICK.id].weapon, stats: null, statsStep: -1, stepN: 0,
    scrap: tune.start_scrap, kills: 0, camps: 0, mode: 'tank', tpause: false, arm: null, gest: null, devSq: 0, devKind: 'rifle', devEnemy: 'r_rifle', tut: 0, nextId: 1, endT: 0, result: null,
    hurtT: -9, aimP: null, mouse3: null, snd: 0, shopTab: 0, shopMsg: '', roster: [], lastShot: -9, tagsWon: 0, campHint: false, fortHint: false,
    boss: null, menu: null, picked: null, rename: null, dragSoldier: null, event: null, campsKnown: false, goScene: null,
    systems: [], owned: [], weaponsOwned: [HULLS[HULL_PICK.id].weapon], ammo: null, shell: 'he', sysCd: {}, smokes: [], eraLeft: 3,
    techKills: 0, crushes: 0, newAch: [], turboUntil: 0, repairUntil: 0, salvo: null, relayL: null,
  });
  // the next sector: the tank, its parts and its scrap come along
  if (carry) Object.assign(state, { fit: JSON.parse(JSON.stringify(carry.fit || {})), depot: (carry.depot || []).map(f => Object.assign({}, f)), hull: carry.hull, weapon: carry.weapon, scrap: carry.scrap, kills: carry.kills, camps: carry.camps,
    systems: carry.systems.slice(), owned: carry.owned.slice(), weaponsOwned: carry.weaponsOwned.slice(), shell: carry.shell, techKills: carry.techKills, crushes: carry.crushes, newAch: carry.newAch.slice() });
  state.ammo = carry && carry.ammo ? Object.assign({}, carry.ammo) : freshAmmo();
  const s = world.sites, rm = s.roadMain;
  const tk = spawn('tank', s.start.x + 0.5, s.start.z + 0.5); tk.rad = HULLS[state.hull].rad;
  if (rm.length > 6) tk.heading = tk.turretYaw = Math.atan2(rm[6][0] - rm[0][0], rm[6][1] - rm[0][1]);
  tk.speed = 0; tk.spread = tune.spread_move; tk.reload = 0; tk.aligned = false; tk.pitch = 0; tk.roll = 0;
  state.tank = tk; state.startPos = { x: tk.x, z: tk.z };
  if (carry) tk.hp = Math.max(1, Math.round(tk.maxhp * carry.hp));
  const back = { x: tk.x - Math.sin(tk.heading) * 6, z: tk.z - Math.cos(tk.heading) * 6 };
  // the first sector starts with the tank alone ; later ones bring who came along
  if (carry) restoreSquads(carry.squads, back.x, back.z);
  // raiders
  for (const c of s.camps) {
    const g = newGroup('camp', c.x + 0.5, c.z + 0.5, c);
    const n = Math.round((4 + c.tier * 2) * tune.camp_men_k), kinds = [];
    for (let i = 0; i < n; i++) kinds.push(i === 1 ? 'r_mg' : i === 3 || (i === 6 && c.tier >= 3) ? 'r_rpg' : 'r_rifle');
    kinds.forEach((k, i) => { const p = c.spots[(i * 3) % c.spots.length] || spotNear(c.x, c.z, i); addRaider(g, k, p.x, p.z, c.tier); });
    addRaider(g, c.tier >= 2 ? 'r_mg' : 'r_rifle', c.tower.x, c.tower.z, c.tier, true);
    if (c.tier >= 3) { const p = spotNear(c.x + 8, c.z, 0); addRaider(g, 'technical', p.x, p.z, c.tier); }
    campExtras(g, c); // enemies.js: dogs, bombers, snipers, mortars, bikes, armour
  }
  for (const p of s.patrols) {
    const g = newGroup('patrol', p.x, p.z, null); g.first = !!p.first;
    g.wps = [];
    for (let k = 0; k < 3; k++) { const a2 = k * 2.1 + rng(), r = p.first ? 4 : 12; const w = spotNear(p.x + Math.cos(a2) * r, p.z + Math.sin(a2) * r, k); g.wps.push(w); }
    g.wpi = 0;
    patrolKinds(p).forEach((k, i) => { const q = spotNear(p.x, p.z, i); addRaider(g, k, q.x, q.z, p.tier); }); // enemies.js: gangs, packs, rabble
    if (!p.first && p.tier >= 3 && rng() < 0.6) { const q = spotNear(p.x, p.z, 5); addRaider(g, 'technical', q.x, q.z, p.tier); }
  }
  const f = s.fortress;
  if (f.kind === 'fortress' && !state.final) { // the old Chief's fortress (a map with no campaign)
  const fg = newGroup('fort', f.x + 0.5, f.z + 0.5, f);
  state.boss = addRaider(fg, 'boss', f.x + 0.5, f.z + 0.5, 3);
  state.boss.turretYaw = state.boss.heading = Math.atan2(f.gateDir.x, f.gateDir.z);
  for (const t of f.towers) addRaider(fg, 'r_mg', t.x, t.z, 3, true);
  for (let i = 0; i < 8; i++) { const p = spotNear(f.x + (i % 4 - 1.5) * 5, f.z + (i < 4 ? -5 : 6), i); addRaider(fg, i % 3 === 2 ? 'r_rpg' : 'r_rifle', p.x, p.z, 3); }
  for (let i = 0; i < 2; i++) { const p = spotNear(f.x + (i ? 8 : -8), f.z + 2, i); addRaider(fg, 'technical', p.x, p.z, 3); }
  }
  for (const w of s.wrecks) { state.pickups.push({ x: w.x, z: w.z, value: w.value, taken: false, wreck: true }); dropLoot(w.x + 1.5, w.z, tune.loot_wreck); dropAmmo(w.x - 1.5, w.z, 4, tune.ammo_drop_wreck); }
  scatterCrates();
  cam.x = tk.x; cam.z = tk.z; cam.y = tk.y; cam.dist = tune.cam_dist;
  // the camera starts behind the tank, on one of the four isometric bearings
  const behind = tk.heading + Math.PI, q4 = Math.PI / 2;
  cam.yawT = cam.yaw = Math.round((behind - Math.PI / 4) / q4) * q4 + Math.PI / 4;
  if (!carry) {
    say('Radio', 'Comandante, il battaglione è disperso. Sei solo: trova uomini lungo la strada e raggiungi l\'esercito.', '#9fe3a0');
    say('Radio', 'Click sinistro: arma principale (X cambia colpo: HE, AP, FRAG). Click destro: mitragliatrice coassiale.', '#9fe3a0');
  }
  if (state.node) setupMap();
}
function newGroup(kind, x, z, site) { const g = { kind, home: { x, z }, site, alert: false, known: null, seenT: -99, members: [], cleared: false }; state.groups.push(g); return g; }
function addRaider(g, kind, x, z, tier, fixed) {
  const e = spawn(kind, x, z, { tier, group: g, fixed: !!fixed, homeSpot: { x, z } });
  e.heading = e.turretYaw = rng() * 6.28;
  g.members.push(e); return e;
}
