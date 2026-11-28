// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The campaign: eight sectors on a branching map (as in FTL), each a battle map to escape from by its exit
// or by finishing its mission; neutral people met on the way with choices and side jobs; the Horde's
// hunters after a while on a map; and the last stand with the army in the eighth sector.
'use strict';

// ---- The campaign map ---------------------------------------------------------------------------------
// FACTIONS: js/factions.js
const LEVEL = ['', 'bassa', 'media', 'alta'], PLENTY = ['', 'pochi', 'discreti', 'molti'];
/**
 * The mission registry (missions.js fills it; this file runs whatever is there). An entry:
 *   name, brief (the SITREP), tag (the label over its target), sign (the hint on the campaign map),
 *   w (its chance in pickMission, in registration order; minCol + instead: before that column it is
 *   another), fallback (picked when the chances run out), startsDone, exitOnly (only the exit lets you go);
 * and its steps, all optional: prepare(M, n) right after the map is built, setup(M, n) after the factions,
 *   update(M, dt) each step while not done, exitShut(M) (true keeps the exit shut), leave(M) on leaving,
 *   line(M) (the line under the minimap, or null), tags(M, tag) (marks on the map), minimap(M, ring).
 */
const MISSIONS = adopt('mission', {});
function registerMission(id, D) { return register('mission', id, D); }
/** The entry of the sector's mission (its kind can change in prepare: a camp mission with no camp). */
function missionOf(M) { return MISSIONS[M.kind]; }
/** A sector's mission (not in the first sector: that one is set by hand): one roll over the chances. */
function pickMission(col) {
  const m = rng(); let acc = 0;
  for (const id in MISSIONS) {
    const D = MISSIONS[id]; if (!D.w) continue;
    acc += D.w; if (m < acc) return col < (D.minCol || 0) ? D.instead : id;
  }
  for (const id in MISSIONS) if (MISSIONS[id].fallback) return id;
  return 'exit';
}

/** A new campaign: 8 columns, one start, one last stand, 2-4 sectors between, each linked forward. */
function newCampaign() {
  const cols = [];
  let id = 0, colBiome = 'desert';
  for (let c = 0; c < 8; c++) {
    const k = c === 0 || c === 7 ? 1 : 2 + Math.floor(rng() * 3), col = [];
    if (c === 0 || rng() < 0.45) colBiome = biomeIds()[Math.floor(rng() * biomeIds().length)]; // the land changes every few sectors
    for (let r = 0; r < k; r++) {
      const n = { id: id++, col: c, row: r, y: (r + 0.5) / k + (k > 1 ? (rng() - 0.5) * 0.12 : 0), next: [] };
      n.enemy = Math.max(1, Math.min(3, 1 + Math.floor(c / 3) + (rng() < 0.4 ? 1 : 0) - (rng() < 0.25 ? 1 : 0)));
      n.scrap = 1 + Math.floor(rng() * 3);
      n.faction = rng() < 0.82 ? FACTION_IDS[Math.floor(rng() * FACTION_IDS.length)] : null; // who holds the sector
      n.outpost = rng() < 0.3;
      n.biome = rng() < 0.6 ? colBiome : biomeIds()[Math.floor(rng() * biomeIds().length)];
      n.layout = layoutIds()[Math.floor(rng() * layoutIds().length)];
      n.geo = geoIds()[Math.floor(rng() * geoIds().length)];
      if (rng() < tune.geo_combo) { const o = geoIds().filter(g => g !== n.geo && geoPairs(n.geo, g)); n.geo2 = o[Math.floor(rng() * o.length)]; }
      const sh = rng(); n.shape = sh < 0.45 ? 'open' : sh < 0.75 ? 'valley' : 'basin';
      n.size = n.shape === 'valley' ? 224 : [160, 192, 208][Math.floor(rng() * 3)];
      n.mission = pickMission(c); // the mission registry
      col.push(n);
    }
    cols.push(col);
  }
  // the first sector: few raiders, prisoners to free and deserters to meet, so the tank finds its first men
  Object.assign(cols[0][0], { enemy: 1, scrap: 2, faction: 'coloni', outpost: false, mission: 'rescue', layout: rng() < 0.5 ? 'rural' : 'villages' });
  Object.assign(cols[7][0], { final: true, enemy: 3, faction: null, outpost: true, mission: 'defend' });
  // links: each sector to the one or two nearest in the next column, and every sector reached
  for (let c = 0; c < 7; c++) {
    const A = cols[c], B = cols[c + 1];
    for (const a of A) {
      const byD = B.slice().sort((p, q) => Math.abs(p.y - a.y) - Math.abs(q.y - a.y));
      a.next.push(byD[0].id); if (byD[1] && rng() < 0.55) a.next.push(byD[1].id);
    }
    for (const b of B) if (!A.some(a => a.next.includes(b.id))) A.slice().sort((p, q) => Math.abs(p.y - b.y) - Math.abs(q.y - b.y))[0].next.push(b.id);
  }
  state.camp = { cols, cur: 0, visited: [0], lost: 0, sector: 1, rep: {} };
  emit('campaignStart'); // core.js events: the trails over several sectors (missions.js)
}
function campNode(id) { for (const c of state.camp.cols) for (const n of c) if (n.id === id) return n; return null; }
/** What a sector's map holds, from its SITREP. */
function nodeSpec(n) {
  if (n.final) return { final: true, camps: 0, outposts: 0, wrecks: 5, patrolK: 0, startBase: true, tier: 3, biome: n.biome, layout: n.layout, geos: ['hills'], shape: 'open', size: 176 };
  return { faction: n.faction, biome: n.biome, layout: n.layout, geos: [n.geo, n.geo2].filter(Boolean), shape: n.shape, size: n.size, camps: n.enemy + 1, outposts: 0, wrecks: [0, 1, 2, 3][n.scrap], patrolK: [0, 0.35, 0.7, 1.1][n.enemy], tier: Math.min(3, 1 + Math.floor(n.col / 3)) };
}
/** Leaves for sector n: makes its map and brings the tank and whoever came along. */
function startNode(n, carry) {
  state.camp.cur = n.id; if (!state.camp.visited.includes(n.id)) state.camp.visited.push(n.id);
  state.camp.sector = n.col + 1;
  world.spec = nodeSpec(n); state.node = n; state.final = !!n.final;
  state.t = 0;
  newRun(carry);
  state.goScene = 'play';
}

// ---- What crosses from one map to the next -------------------------------------------------------------
/** The tank, the scrap and the soldiers in radio reach (or on board); everyone else stays behind. */
function carryOut() {
  const tk = state.tank, R = tankStats().radio, with_ = m => m && m.alive && (m.inside || dist2(m, tk) <= R * R);
  let lost = 0;
  const squads = [];
  for (const sq of state.squads) {
    const slots = [], mem = [];
    const with_ = m => m && m.alive && heardAt(m);
    sq.slots.forEach((k, i) => {
      const m = sq.members[i];
      if (!m || !m.alive) return; // the fallen are gone
      if (!with_(m)) { lost++; return; }
      slots.push(k); mem.push({ kind: m.kind, rank: m.rank || 0, xp: m.xp || 0, hp: m.veh ? m.hp / m.maxhp : 1 });
    });
    if (mem.length) squads.push({ name: sq.name, named: !!sq.named, color: sq.color, roe: roeOf(sq).k, gait: gaitOf(sq).k, slots, mem });
  }
  return { hp: tk.hp / tk.maxhp, lv: Object.assign({}, state.lv), systems: state.systems.slice(), owned: state.owned.slice(), weaponsOwned: state.weaponsOwned.slice(),
    ammo: Object.assign({}, state.ammo), shell: state.shell, techKills: state.techKills, crushes: state.crushes, newAch: (state.newAch || []).slice(), hull: state.hull, weapon: state.weapon, scrap: state.scrap, kills: state.kills, camps: state.camps, squads, lost, time: (state.carryT || 0) + state.t };
}
/** Who would come along now, and who would stay behind (for the exit prompt). */
function exitCount() {
  const tk = state.tank, R = tankStats().radio; let go = 0, stay = 0;
  for (const sq of state.squads) for (const m of alive(sq)) { if (heardAt(m)) go++; else stay++; }
  return { go, stay };
}
/** Brings the carried squads back near (x,z), facing like the tank. */
function restoreSquads(list, x, z) {
  list.forEach((d, j) => {
    const sq = { id: state.squads.length, slots: d.slots.slice(), members: [], order: { t: 'follow' }, selected: false, tick: 0, roe: d.roe || 'free', gait: d.gait || 'normal', name: d.name, named: d.named, color: d.color };
    d.mem.forEach((md, i) => {
      const p = spotNear(x - 3 * (j % 3), z - 3 * Math.floor(j / 3), i);
      const m = spawn(md.kind, p.x, p.z, { rank: md.rank, xp: md.xp });
      m.maxhp = unitHp(m); m.hp = Math.max(1, m.maxhp * md.hp); m.squad = sq; m.heading = m.turretYaw = state.tank.heading; sq.members[i] = m;
    });
    state.squads.push(sq); sqColor(sq);
  });
}

// ---- Setting up a sector's map -----------------------------------------------------------------------
/** After newRun built the map: the mission, the people met on the way, the Horde's clock. */
function setupMap() {
  const n = state.node, s = world.sites;
  state.mission = { kind: n.mission, done: !!MISSIONS[n.mission].startsDone, target: null, cache: null };
  state.npcs = []; state.quests = []; state.waveN = 0; state.hordeT = n.final ? tune.final_prep : tune.horde_time; state.waveT = 0; state.leaveOK = false;
  const M = state.mission;
  if (missionOf(M).prepare) missionOf(M).prepare(M, n); // right after the map: its target
  // the people met on the way: by the road, away from the camps
  const rm = s.roadMain, want = n.final ? 0 : 1 + (rng() < 0.5 ? 1 : 0);
  const used = new Set();
  for (let k = 0; k < want && rm.length > 30; k++) {
    for (let tries = 0; tries < 30; tries++) {
      const p = rm[Math.floor(rm.length * (0.18 + rng() * 0.6))], side = rng() < 0.5 ? 1 : -1;
      const q = spotNear(p[0] + side * 7, p[1] - side * 5, k);
      if (Math.hypot(q.x - s.start.x, q.z - s.start.z) < 18) continue;
      if (s.camps.some(c => Math.hypot(c.x - q.x, c.z - q.z) < 26)) continue;
      if (state.npcs.some(o => Math.hypot(o.x - q.x, o.z - q.z) < 24)) continue;
      const ev = pickEvent(n.faction, used, n.col === 0 && k === 0); used.add(ev.id);
      state.npcs.push({ x: q.x, z: q.z, ev, done: false, seen: false, kind: ev.fig || 'rifle', n: ev.figs || 2 });
      break;
    }
  }
  emit('sectorSetup', M, n); // the settlement and its faction (factions.js)
  if (missionOf(M).setup) missionOf(M).setup(M, n); // the mission's own people and places
  emit('sectorSideSetup', M, n); // the trail's step (missions.js)
  if (n.final) setupFinal();
  else {
    say('SITREP', 'Settore ' + (n.col + 1) + '/8 · ' + BIOME().name + ', ' + LAYOUTS[world.layout].name + ' · ' + MISSIONS[M.kind].brief + ' L\'Orda ci darà la caccia tra ' + fmtT(state.hordeT) + '. (Campagna ' + campSeed + ': ?seed=' + campSeed + ' la rigioca.)', '#ffd9a0');
    say('SITREP', world.geos.map(g => GEOS[g].brief).join(' ') + (world.shape !== 'open' ? ' Mappa: ' + SHAPES[world.shape].name + '.' : '') + ' Nessuna officina qui: riparazioni e modifiche solo all\'uscita dal settore.', '#b6d77a');
  }
}
/** The eighth sector: the army's last camp, its squads and tanks, and the Horde's gate. */
function setupFinal() {
  const b = world.sites.start;
  const army = [['rifle', 'rifle', 'rifle', 'rifle', 'mg'], ['rifle', 'rifle', 'at'], ['sniper', 'sniper'], ['ltank'], ['td']];
  let k = 0;
  for (const slots of army) {
    if (state.squads.length >= maxSquads()) break;
    const p = spotNear(b.x + 0.5 + (k % 3 - 1) * 7, b.z + 0.5 + (Math.floor(k / 3) - 0.5) * 7, k);
    const sq = addSquad(slots, p.x, p.z);
    if (sq) { sq.order = { t: 'hold' }; sq.name = (slots[0] === 'ltank' ? 'Carro ' : slots[0] === 'td' ? 'Cacciacarri ' : 'Plotone ') + ['Ascia', 'Brace', 'Corvo', 'Dente', 'Eco'][k]; sq.named = true; }
    k++;
  }
  say('Comando', 'Comandante! Quello che resta dell\'esercito è ai tuoi ordini. Prepara le difese: l\'Orda arriva tra ' + fmtT(state.hordeT) + '.', '#9fe3a0');
}
/** At most this many squads: four more in the last stand, where the army joins. */
function maxSquads() { return tune.max_squads + (state.final ? 4 : 0); }
function fmtT(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

// ---- Each step on a sector's map ---------------------------------------------------------------------
function campaignUpdate(dt) {
  const tk = state.tank, M = state.mission; if (!M || !tk.alive) return;
  // the mission, then the trail
  if (!M.done && missionOf(M).update) missionOf(M).update(M, dt);
  emit('sectorStep', M, dt); // missions.js: the trail
  // side jobs
  for (const q of state.quests) {
    if (q.done) continue;
    if ((q.kind === 'camp' && q.site.cleared) || (q.kind === 'kills' && state.kills - q.k0 >= q.n)) {
      q.done = true; state.scrap += q.scrap; sfx('coin');
      say(q.giver, 'Lavoro fatto. Eccovi ' + q.scrap + ' rottami' + (q.recruits ? ' e ' + q.recruits.length + ' volontari.' : '.'), '#ffd36a');
      if (q.recruits) joinSquad(q.recruits, 'Volontari', tk.x - 4, tk.z - 4);
    }
  }
  factionUpdate(dt); // factions.js: jobs, raids, the cult's eyes
  // people on the way: spotted from afar, talked to up close
  for (const p of state.npcs) {
    if (p.done) continue;
    const d = Math.hypot(p.x - tk.x, p.z - tk.z);
    if (!p.seen && d < 46) { p.seen = true; say('Radio', p.fac ? FACTIONS[p.fac].sign + ' in vista. Avvicinati col carro per parlarci.' : 'Gente in vista, sembrano neutrali. Avvicinati col carro per parlarci.', p.fac ? FACTIONS[p.fac].col : '#cfd8e0'); }
    if (d < (p.r || tune.npc_radius) && !state.goScene && !state.tpause) { p.done = true; tk.speed = 0; state.event = { p, ev: p.mk ? p.mk(p) : p.ev, res: null }; state.goScene = 'event'; }
  }
  // the Horde's clock
  state.hordeT -= dt;
  if (state.final) finalUpdate(dt);
  else if (state.hordeT <= 0) {
    state.waveT -= dt;
    if (state.waveT <= 0) {
      state.waveN++; state.waveT = tune.wave_every;
      const n = Math.round(tune.wave_size + state.waveN * tune.wave_grow);
      spawnWave(n, Math.min(3, (state.node.col >> 1) + 1 + (state.waveN > 3 ? 1 : 0)), null);
      say('Radio', state.waveN === 1 ? 'L\'Orda ci ha trovati! Cacciatori in arrivo: muoviti verso l\'uscita.' : 'Altri cacciatori dell\'Orda (ondata ' + state.waveN + ').', '#ff9a7a');
    }
  }
  // leaving: at the exit, or anywhere once the mission is done
  const ex = world.sites.fortress;
  state.atExitRaw = !state.final && Math.hypot(ex.x - tk.x, ex.z - tk.z) < tune.exit_radius;
  state.atExit = state.atExitRaw && exitOpen(M); // a spot still to hold keeps the exit shut
  state.leaveOK = !state.final && (state.atExit || (M.done && !missionOf(M).exitOnly));
  if (state.leaveOK && pressed('Enter') && !state.goScene) leaveSector();
}
/** Can the tank leave by the exit? (a mission can keep it shut: a spot still to hold) */
function exitOpen(M) { const D = M && MISSIONS[M.kind]; return !(D && D.exitShut && D.exitShut(M)); }
/** At the exit: the field workshop opens first (upgrades, rounds, repairs, men); closing it leaves the map. */
function leaveSector() {
  const n = state.node;
  n.ws = n.ws || { name: 'Officina da campo', field: true };
  Object.assign(n.ws, { x: state.tank.x - 4, z: state.tank.z - 4 }); // recruits and reinforcements gather by the tank
  state.shopSite = n.ws; state.leaving = true; state.shopTab = 'standard'; state.shopMsg = ''; state.confirm = null; state.tank.speed = 0;
  state.goScene = 'shop'; sfx('radio');
}
/** The tank leaves the map: the soldiers in radio reach come, the others stay behind. */
function departSector() {
  state.leaving = false;
  const M = state.mission; if (M && missionOf(M).leave) missionOf(M).leave(M); // what the mission leaves behind
  emit('sectorLeave', M); // missions.js: the trail follows
  const c = carryOut();
  if (!c.lost && c.squads.length >= 3) grantAch('allhome');
  state.carry = c; state.carryT = c.time; state.camp.lost = c.lost;
  state.goScene = 'campaign'; sfx('radio');
}
/** The hunters: a group sent at the tank (or at the army's camp) from far away. */
function spawnWave(n, tier, from) {
  const tk = state.tank, N = world.N;
  let p = from;
  for (let tries = 0; !p && tries < 60; tries++) {
    const a = rng() * 6.28, r = 58 + rng() * 14, x = tk.x + Math.sin(a) * r, z = tk.z + Math.cos(a) * r;
    if (x < 6 || z < 6 || x > N - 6 || z > N - 6) continue;
    if (!walkable(Math.floor(x), Math.floor(z)) || shallow(x, z) || !canReach(x, z, false)) continue;
    p = { x, z };
  }
  if (!p) p = { x: N - 10, z: N - 10 };
  const g = newGroup('hunt', p.x, p.z, null); g.alert = true; g.seenT = state.t; g.known = { x: tk.x, z: tk.z };
  waveKinds(n, tier, state.waveN || 0).forEach((k, i) => { // enemies.js: dogs, bikes, rabble, trucks, tanks by turns
    const q = spotNear(p.x, p.z, i), e = addRaider(g, k, q.x, q.z, tier); e.think = 0.2 + rng() * 0.5;
  });
  if (tier >= 2 && n >= 6) { const q = spotNear(p.x + 4, p.z, 7); addRaider(g, 'technical', q.x, q.z, tier); }
  return g;
}
/** The last stand: the waves come from the Horde's gate at the army's camp; the last brings the Chief. */
function finalUpdate(dt) {
  const s = world.sites, gate = s.fortress, base = s.start;
  const hunters = state.groups.filter(g => g.kind === 'hunt'), left = hunters.reduce((a, g) => a + g.members.filter(m => m.alive).length, 0);
  if (state.waveN > 0 && state.waveN < tune.final_waves && left === 0 && state.hordeT > 12) { state.hordeT = 12; say('Comando', 'Ondata respinta! La prossima tra pochi secondi.', '#9fe3a0'); } // a beaten wave: a short breather
  if (state.waveN < tune.final_waves && state.hordeT <= 0) {
    state.waveN++; state.hordeT = tune.final_gap;
    const last = state.waveN === tune.final_waves, n = Math.round(tune.wave_size + 2 + state.waveN * 2);
    const g = spawnWave(n, Math.min(3, 1 + state.waveN), { x: gate.x + 0.5, z: gate.z + 0.5 });
    g.base = { x: base.x + 0.5, z: base.z + 0.5 };
    if (state.waveN >= 3) { const q = spotNear(gate.x + 6, gate.z, 3); addRaider(g, 'technical', q.x, q.z, 3); }
    if (last) { const q = spotNear(gate.x, gate.z + 5, 9); state.boss = addRaider(g, 'boss', q.x, q.z, 3); say('Radio', 'Il Carro del Capo guida l\'ultimo assalto!', '#ff7a6a'); }
    say('Comando', 'Ondata ' + state.waveN + ' di ' + tune.final_waves + ' in arrivo dal cancello dell\'Orda!', '#ff9a7a');
  }
  if (state.waveN >= tune.final_waves && left === 0 && !state.result) {
    state.result = 'win'; state.endT = state.t + 3;
    say('Comando', 'L\'Orda si ritira! Abbiamo tenuto la linea, comandante.', '#9fe3a0');
  }
}

// ---- Help for the events -----------------------------------------------------------------------------
/** New men join as a squad of their own near (x,z); with no room left they bring scrap instead. */
function joinSquad(kinds, name, x, z) {
  if (state.squads.length >= maxSquads()) { const v = 10 * kinds.length; state.scrap += v; say('Radio', 'Non abbiamo posto per altre squadre: ci lasciano ' + v + ' rottami.', '#ffd36a'); return null; }
  const sq = addSquad(kinds, x, z); if (!sq) return null;
  sq.order = { t: 'follow' }; sq.name = name; sq.named = true;
  return sq;
}
/** A random module for free (modules.js); returns its name (or null if there is none left to give). */
function freeUpgrade() { return giveModule(); }
function hurtTank(k) { const tk = state.tank; tk.hp = Math.max(1, tk.hp - tk.maxhp * k); state.hurtT = state.t; }
function ambush(n) { const tk = state.tank; return spawnWave(n, Math.min(3, 1 + (state.node.col >> 1)), spotNear(tk.x + 14, tk.z + 10, 0)); }
function nearestCamp() { const tk = state.tank; return world.sites.camps.filter(c => !c.cleared).sort((a, b) => Math.hypot(a.x - tk.x, a.z - tk.z) - Math.hypot(b.x - tk.x, b.z - tk.z))[0]; }
function promote(sq, r) { if (sq) for (const m of alive(sq)) { m.rank = r; m.xp = tune['rank_xp_' + r]; m.maxhp = unitHp(m); m.hp = m.maxhp; } }

/**
 * The people met on the way. Each event: a few lines, then two or three choices; a choice returns the
 * line shown as its outcome. fac: the faction it comes with (null: anyone); fig: their figure.
 */
const EVENTS = [
  { id: 'disertori', fac: null, fig: 'r_rifle', title: 'Disertori dell\'Orda', text: 'Tre uomini con le insegne dell\'Orda strappate alzano le mani. "Ne abbiamo abbastanza del Capo. Prendeteci con voi, sappiamo sparare."',
    choices: [
      { label: 'Accoglili nel gruppo', act: () => { if (state.node.col > 0 && rng() < 0.2) { ambush(5); return 'Era una trappola! Altri predoni escono dai cespugli.'; } joinSquad(['rifle', 'rifle', 'mg'], 'Disertori', state.tank.x - 4, state.tank.z - 4); return 'Si mettono in fila dietro al carro. Una squadra in più.'; } },
      { label: 'Prendi le loro armi e mandali via (+20 rottami)', act: () => { state.scrap += 20; return 'Lasciano fucili e munizioni e spariscono tra le rovine.'; } },
      { label: 'Tira dritto', act: () => 'Li lasci al loro destino.' },
    ] },
  { id: 'cecchino', fac: null, fig: 'sniper', figs: 1, title: 'Il cecchino solitario', text: 'Un tiratore scelto ti osserva da un tetto. "Ho una buona canna e la mira ferma. Per 60 rottami lavoro per te fino alla fine."',
    choices: [
      { label: 'Paga 60 rottami', need: () => state.scrap >= 60, act: () => { state.scrap -= 60; promote(joinSquad(['sniper'], 'Occhio di Falco', state.tank.x - 3, state.tank.z - 3), 2); return 'Un veterano in più: scende dal tetto e si unisce a te.'; } },
      { label: 'Non ci serve', act: () => 'Alza le spalle e torna a guardare l\'orizzonte.' },
    ] },
  { id: 'affamati', fac: 'coloni', fig: 'medic', title: 'Coloni affamati', text: 'Una famiglia di coloni accanto a un fuoco spento. "Non mangiamo da giorni. Se ci aiutate, mio figlio viene con voi: è sveglio e sa curare."',
    choices: [
      { label: 'Dividi le scorte (30 rottami)', need: () => state.scrap >= 30, act: () => { state.scrap -= 30; joinSquad(['medic'], 'Medico dei coloni', state.tank.x - 3, state.tank.z - 3); return 'Il ragazzo prende la borsa del medico e sale dietro al carro.'; } },
      { label: 'Indica loro un avamposto e prosegui', act: () => 'Ti ringraziano comunque.' },
    ] },
  { id: 'capovillaggio', fac: 'coloni', fig: 'rifle', title: 'Il capo villaggio', text: '"I predoni del campo qui vicino ci portano via tutto. Distruggetelo e vi pagheremo, e i nostri giovani vi seguiranno."',
    choices: [
      { label: 'Accetta l\'incarico', need: () => !!nearestCamp(), act: () => { const c = nearestCamp(); state.quests.push({ kind: 'camp', site: c, scrap: 45, recruits: ['rifle', 'rifle'], giver: 'Capo villaggio', text: 'Distruggi ' + c.name }); return 'Incarico: distruggi ' + c.name + '. Ricompensa: 45 rottami e due volontari.'; } },
      { label: 'Non abbiamo tempo', act: () => 'Il vecchio abbassa lo sguardo.' },
    ] },
  { id: 'mercante', fac: 'mercanti', fig: 'rifle', title: 'La carovana dei mercanti', text: 'Camion carichi di ferraglia e un mercante dal sorriso d\'oro. "Pezzi buoni, comandante. Prezzi onesti... quasi."',
    choices: [
      { label: 'Paga un miglioramento a sorpresa (90 rottami)', need: () => state.scrap >= 90, act: () => { state.scrap -= 90; const p = freeUpgrade(); if (p) return 'Il meccanico lavora sul carro: ' + p + '.'; state.scrap += 90; return 'Non ha niente di meglio di quello che hai: ti rende i rottami.'; } },
      { label: 'Riparazioni (50 rottami, +50% integrità)', need: () => state.scrap >= 50 && state.tank.hp < state.tank.maxhp, act: () => { state.scrap -= 50; state.tank.hp = Math.min(state.tank.maxhp, state.tank.hp + state.tank.maxhp * 0.5); return 'Saldature fresche sullo scafo.'; } },
      { label: 'Assolda le sue guardie (80 rottami)', need: () => state.scrap >= 80, act: () => { state.scrap -= 80; joinSquad(['mg', 'rifle'], 'Guardie della carovana', state.tank.x - 4, state.tank.z - 4); return 'Due guardie armate passano al tuo servizio.'; } },
    ] },
  { id: 'contrabbando', fac: 'mercanti', fig: 'rifle', title: 'Il contrabbandiere', text: '"Ho una cassa di munizioni speciali e nessuno a cui venderla. 40 rottami e la cassa è tua. Garantito... più o meno."',
    choices: [
      { label: 'Compra la cassa (40 rottami)', need: () => state.scrap >= 40, act: () => { state.scrap -= 40; if (rng() < 0.6) { state.scrap += 65; return 'Dentro c\'è roba buona: la rivendi subito per 65 rottami.'; } hurtTank(0.12); return 'La cassa esplode quando la apri. Il carro incassa il colpo.'; } },
      { label: 'Lascia perdere', act: () => 'Il contrabbandiere sputa per terra.' },
    ] },
  { id: 'ferito', fac: null, fig: 'rifle', figs: 1, title: 'Un soldato ferito', text: 'Un soldato del tuo vecchio battaglione, ferito a una gamba. "Comandante... pensavo foste tutti morti. Portatemi con voi."',
    choices: [
      { label: 'Caricalo e curalo (20 rottami)', need: () => state.scrap >= 20, act: () => { state.scrap -= 20; promote(joinSquad(['rifle'], 'Sopravvissuto', state.tank.x - 3, state.tank.z - 3), 1); return 'Un veterano esperto torna in servizio.'; } },
      { label: 'Lascialo all\'ombra con dell\'acqua', act: () => 'Ti saluta con la mano mentre ti allontani.' },
    ] },
  { id: 'deposito', fac: null, fig: 'rifle', figs: 1, title: 'Il deposito sepolto', text: 'Un vecchio indica una botola mezza sepolta. "Roba dell\'esercito, prima della fine. Io non ci scendo: potrebbe essere minata."',
    choices: [
      { label: 'Apri la botola', act: () => { if (rng() < 0.6) { state.scrap += 35; return 'Casse intatte: 35 rottami.'; } hurtTank(0.18); return 'Una mina! Il carro è danneggiato.'; } },
      { label: 'Lascia stare', act: () => 'Meglio non rischiare.' },
    ] },
  { id: 'segnale', fac: null, fig: 'rifle', figs: 1, title: 'Il radioamatore', text: 'Un uomo con un\'antenna fatta di rottami. "Ascolto le frequenze dell\'Orda da mesi. Per 30 rottami vi dico dove sono i loro campi."',
    choices: [
      { label: 'Paga 30 rottami', need: () => state.scrap >= 30, act: () => { state.scrap -= 30; state.campsKnown = true; return 'Segna i campi sulla tua mappa: ora sono cerchiati sulla minimappa.'; } },
      { label: 'Abbiamo i nostri occhi', act: () => 'Torna alle sue cuffie.' },
    ] },
  { id: 'caccia', fac: null, fig: 'rifle', title: 'I cacciatori di taglie', text: '"Il Capo paga per ogni testa dei suoi nemici; noi paghiamo per le teste dei suoi. Abbattete 8 predoni e vi diamo 70 rottami."',
    choices: [
      { label: 'Accetta', act: () => { state.quests.push({ kind: 'kills', n: 8, k0: state.kills, scrap: 35, giver: 'Cacciatori di taglie', text: 'Abbatti 8 predoni' }); return 'Incarico: abbatti 8 predoni. Ricompensa: 35 rottami.'; } },
      { label: 'Non siamo mercenari', act: () => '"Come volete."' },
    ] },
];
function pickEvent(fac, used, firstRecruit) {
  if (firstRecruit) return EVENTS.find(e => e.id === 'disertori');
  const pool = EVENTS.filter(e => !used.has(e.id) && (e.fac === fac || (!e.fac && rng() < 0.7)));
  const any = pool.length ? pool : EVENTS.filter(e => !used.has(e.id));
  return any[Math.floor(rng() * any.length)] || EVENTS[0];
}
/** The event window's input: a number or a click picks; after the outcome Enter or a click goes on. */
function eventInput() {
  const E = state.event; if (!E) { state.goScene = 'play'; return; }
  if (E.res) { if (pressed('Enter') || pressed('Space') || pressed('Escape')) { state.event = null; state.goScene = 'play'; } clickButtons(); return; }
  E.ev.choices.forEach((c, i) => { if (pressed('Digit' + (i + 1)) && (!c.need || c.need())) chooseEvent(c); });
  clickButtons();
}
function chooseEvent(c) { const E = state.event; if (!E || E.res) return; E.res = c.act(); sfx('radio'); }

// ---- Drawing ---------------------------------------------------------------------------------------
function drawEvent() {
  const E = state.event; if (!E) return;
  UI.buttons = [];
  ctx.fillStyle = 'rgba(14,10,8,0.55)'; ctx.fillRect(0, 0, W, H);
  const w = 640, x0 = W / 2 - w / 2, lines = wrap(E.ev.text, w - 48, 16), rl = E.res ? wrap(E.res, w - 48, 16) : [];
  const h = 110 + lines.length * 22 + (E.res ? rl.length * 22 + 70 : E.ev.choices.length * 46), y0 = H / 2 - h / 2;
  panel(x0, y0, w, h);
  text(E.ev.title, x0 + 24, y0 + 30, 24, '#ffd9a0', 'left');
  lines.forEach((l, i) => text(l, x0 + 24, y0 + 66 + i * 22, 16, HC.text, 'left'));
  let y = y0 + 80 + lines.length * 22;
  if (!E.res) {
    E.ev.choices.forEach((c, i) => {
      const ok = !c.need || c.need();
      button(x0 + 24, y, w - 48, 38, '', () => { if (ok) chooseEvent(c); }, { off: !ok });
      text((i + 1) + '.  ' + c.label, x0 + 40, y + 19, 15, ok ? HC.text : '#8a7a68', 'left');
      y += 46;
    });
  } else {
    rl.forEach((l, i) => text(l, x0 + 24, y + 6 + i * 22, 16, HC.gold, 'left'));
    button(W / 2 - 100, y0 + h - 52, 200, 38, 'Continua (Invio)', () => { state.event = null; state.goScene = 'play'; });
  }
}
/** The map's own HUD: the Horde's clock, the exit prompt, labels over the exit, the mission and the people. */
function drawMapHUD() {
  if (!state.mission) return;
  const s = world.sites;
  let line, col = '#ffd9a0';
  if (state.final) line = state.waveN ? 'ULTIMA DIFESA · ondata ' + state.waveN + '/' + tune.final_waves + (state.waveN < tune.final_waves ? ' · prossima tra ' + fmtT(state.hordeT) : '') : 'ULTIMA DIFESA · l\'Orda arriva tra ' + fmtT(state.hordeT);
  else if (state.hordeT > 0) line = 'Settore ' + state.camp.sector + '/8 · l\'Orda ci troverà tra ' + fmtT(state.hordeT);
  else { line = 'Settore ' + state.camp.sector + '/8 · CACCIATORI DELL\'ORDA · ondata ' + state.waveN; col = '#ff9a7a'; }
  ctx.font = `bold 12px ${FONT}`; const lw = ctx.measureText(line).width + 20;
  rrect(W / 2 - lw / 2, 40, lw, 20, 5, 'rgba(20,14,10,0.78)', null); text(line, W / 2, 50, 12, col);
  const qs = state.quests.filter(q => !q.done);
  qs.forEach((q, i) => text('Incarico: ' + q.text + (q.kind === 'kills' ? ' (' + Math.min(q.n, state.kills - q.k0) + '/' + q.n + ')' : ''), W - 110, 240 + i * 16, 11, '#ffd36a'));
  const tag = (x, z, lab, c, lift) => { const p = toScreen(x, hAt(x, z) + (lift || 4), z); if (!p.on) return; ctx.font = `bold 12px ${FONT}`; const w = ctx.measureText(lab).width + 14; rrect(p.x - w / 2, p.y - 10, w, 20, 5, 'rgba(14,10,8,0.82)', c); text(lab, p.x, p.y, 12, c); };
  if (!state.final) tag(s.fortress.x, s.fortress.z, 'USCITA', '#ffd36a', 6);
  const M = state.mission;
  if (M.target && !M.done) tag(M.target.x, M.target.z, missionOf(M).tag || 'OBIETTIVO', '#ff8a6a', 7);
  if (missionOf(M).tags) missionOf(M).tags(M, tag); // the boss, the refugees, the ring to hold
  emit('mapTags', tag); // missions.js: the trail
  for (const p of state.npcs) if (p.seen && !p.done) tag(p.x, p.z, p.fac ? FACTIONS[p.fac].short : '?', p.fac ? FACTIONS[p.fac].col : '#b9f59a', 3.4);
  if (state.leaveOK) {
    const c = exitCount(), msg = (state.atExit ? 'USCITA' : 'MISSIONE COMPIUTA') + ' · Invio: lascia il settore · con te ' + c.go + (c.stay ? ', ' + c.stay + ' restano indietro (fuori radio)' : '');
    ctx.font = `bold 14px ${FONT}`; const w = ctx.measureText(msg).width + 30;
    rrect(W / 2 - w / 2, H - 150, w, 32, 6, 'rgba(40,70,30,0.92)', '#b6d77a'); text(msg, W / 2, H - 134, 14, '#eaf7d0');
  }
}
/** One line for under the minimap: what this sector asks. */
function missionLine() {
  const M = state.mission, tk = state.tank, s = world.sites; if (!M) return '';
  if (state.final) return 'Difendi il campo dell\'esercito';
  const ex = missionOf(M).line && missionOf(M).line(M); if (ex) return ex; // the mission's own line
  if (!M.done && M.target) return MISSIONS[M.kind].name + ' · ' + Math.round(Math.hypot(M.target.x - tk.x, M.target.z - tk.z)) + ' m';
  return 'Uscita · ' + Math.round(Math.hypot(s.fortress.x - tk.x, s.fortress.z - tk.z)) + ' m';
}
/** Marks on the minimap, drawn in world units inside its transform. */
function minimapMarks(k) {
  const M = state.mission; if (!M) return;
  const ring = (x, z, r, c) => { ctx.strokeStyle = c; ctx.lineWidth = 2 / k; ctx.beginPath(); ctx.arc(x, z, r, 0, 6.3); ctx.stroke(); };
  if (M.target && !M.done) ring(M.target.x, M.target.z, 7, '#ff8a6a');
  if (missionOf(M).minimap) missionOf(M).minimap(M, ring);
  emit('minimapMarks', ring); // missions.js: the trail
  for (const p of state.npcs) if (p.seen && !p.done) { ctx.fillStyle = '#b9f59a'; ctx.beginPath(); ctx.arc(p.x, p.z, 2.6, 0, 6.3); ctx.fill(); }
  for (const q of state.quests) if (!q.done && q.site) ring(q.site.x, q.site.z, 9, '#ffd36a');
  if (state.campsKnown) for (const c of world.sites.camps) if (!c.cleared) ring(c.x, c.z, 11, '#ff5a40');
}

// ---- The campaign screen ----------------------------------------------------------------------------
function campPos(n) { return { x: 120 + n.col * (W - 240) / 7, y: 130 + n.y * (H - 310) }; }
function reachable() { const cur = campNode(state.camp.cur); return cur ? cur.next.map(campNode) : []; }
function campaignInput() {
  const R = reachable();
  R.forEach((n, i) => { if (pressed('Digit' + (i + 1))) startNode(n, state.carry); });
  if (!state.goScene) clickButtons();
}
function drawCampaign() {
  UI.buttons = [];
  ctx.fillStyle = 'rgba(16,11,8,0.92)'; ctx.fillRect(0, 0, W, H);
  const C = state.camp, R = reachable();
  text('LA RITIRATA', W / 2, 36, 32, '#ffcf8a');
  text('Otto settori fino a quello che resta dell\'esercito. Scegli dove andare: il SITREP dice cosa ti aspetta, ma non tutto.', W / 2, 68, 15, HC.dim);
  for (const col of C.cols) for (const n of col) for (const id of n.next) {
    const m = campNode(id), a = campPos(n), b = campPos(m), lit = (n.id === C.cur && R.includes(m)) || (C.visited.includes(n.id) && C.visited.includes(m.id));
    ctx.strokeStyle = lit ? 'rgba(255,211,106,0.85)' : 'rgba(201,183,154,0.22)'; ctx.lineWidth = lit ? 3 : 1.5; ctx.setLineDash(lit ? [] : [5, 5]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  let hover = null;
  for (const col of C.cols) for (const n of col) {
    const p = campPos(n), on = R.includes(n), visited = C.visited.includes(n.id), here = n.id === C.cur;
    const hv = Math.hypot(MS.x - p.x, MS.y - p.y) < 22; if (hv) hover = n;
    if (n.chain && state.camp.chains && !state.camp.chains[n.chain.id].done && state.camp.chains[n.chain.id].step === n.chain.step) text('★', p.x + 17, p.y - 17, 15, '#ffd36a'); // a trail goes on here
    const r = n.final ? 22 : 15, pulse = on ? 1 + Math.sin(performance.now() / 220) * 0.12 : 1;
    ctx.fillStyle = here ? '#4fe3e0' : visited ? '#6a5a4a' : on ? '#ffd36a' : n.final ? '#8a2f28' : '#3a2c22';
    ctx.strokeStyle = n.final ? '#ff7a6a' : on ? '#fff2d8' : '#8e4b27'; ctx.lineWidth = on || hv ? 3 : 1.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * pulse, 0, 6.3); ctx.fill(); ctx.stroke();
    if (on) { text(String(R.indexOf(n) + 1), p.x, p.y + 1, 14, '#1a120c'); UI.buttons.push({ x: p.x - 22, y: p.y - 22, w: 44, h: 44, onClick: () => startNode(n, state.carry) }); }
    if (n.final) text('ESERCITO', p.x, p.y + 36, 12, '#ff9a7a');
    if (here) text('SEI QUI', p.x, p.y - 28, 11, HC.cyan);
  }
  for (let c = 0; c < 8; c++) text('Settore ' + (c + 1), 120 + c * (W - 240) / 7, H - 162, 12, HC.dim);
  const sel = hover && R.includes(hover) ? hover : R.length === 1 ? R[0] : null;
  const bx = W - 460, by = H - 140;
  panel(bx, by, 440, 124);
  if (sel) {
    text('SITREP · settore ' + (sel.col + 1) + (sel.final ? ' · ULTIMA DIFESA' : ''), bx + 16, by + 16, 15, '#ffd9a0', 'left');
    if (sel.biome) text(BIOMES[sel.biome].name + ' · ' + LAYOUTS[sel.layout].name + (sel.geo ? ' · ' + geoName([sel.geo, sel.geo2].filter(Boolean)) + (sel.shape && sel.shape !== 'open' ? ', ' + SHAPES[sel.shape].name : '') : ''), bx + 16, by + 35, 12, '#9fd8ff', 'left'); // the land: biome, zone, geography, shape
    if (sel.final) wrap('Il campo dell\'esercito. L\'Orda attaccherà con tutto quello che ha: ondate su ondate, poi il Carro del Capo.', 410, 14).forEach((l, i) => text(l, bx + 16, by + 56 + i * 18, 13, HC.text, 'left'));
    else {
      text('Presenza nemica: ' + LEVEL[sel.enemy], bx + 16, by + 54, 13, ['', HC.ok, HC.warn, HC.bad][sel.enemy], 'left');
      text('Rottami: ' + PLENTY[sel.scrap], bx + 240, by + 54, 13, HC.gold, 'left');
      const signs = [];
      if (sel.faction) signs.push(FACTIONS[sel.faction].sign + ' (' + repLabel(sel.faction) + ')');
      if (MISSIONS[sel.mission] && MISSIONS[sel.mission].sign) signs.push(MISSIONS[sel.mission].sign);
      if (sel.chain && !state.camp.chains[sel.chain.id].done) signs.push('pista: ' + CHAINS[sel.chain.id].name);
      wrap((MISSIONS[sel.mission] ? 'Missione: ' + MISSIONS[sel.mission].name.toLowerCase() + '. ' : '') + 'Segnali: ' + (signs.length ? signs.join(', ') : 'nessuno'), 412, 12).slice(0, 2).forEach((l, i) => text(l, bx + 16, by + 73 + i * 16, 12, HC.text, 'left'));
    }
    text('Click o tasto ' + (R.indexOf(sel) + 1) + ' per partire', bx + 16, by + 112, 12, HC.dim, 'left');
  } else text('Passa il mouse su un settore giallo per il SITREP.', bx + 16, by + 60, 14, HC.dim, 'left');
  const rx = 575, ry = H - 140; panel(rx, ry, 230, 124); // the factions' standing
  text('Reputazione', rx + 12, ry + 16, 13, '#ffd9a0', 'left');
  FACTION_IDS.forEach((f, i) => { const y = ry + 36 + i * 18, r = rep(f); text(FACTIONS[f].short, rx + 12, y, 12, FACTIONS[f].col, 'left'); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(rx + 80, y - 4, 80, 8); ctx.fillStyle = repCol(f); ctx.fillRect(rx + 120, y - 4, r * 0.4, 8); text(repLabel(f), rx + 218, y, 11, repCol(f), 'right'); });
  const cx = 20, cy = H - 140; panel(cx, cy, 540, 124);
  const ca = state.carry, hpk = ca ? ca.hp : 1;
  text('Carro · integrità', cx + 16, cy + 20, 14, HC.text, 'left'); bar(cx + 150, cy + 13, 200, 13, hpk, hpk > 0.35 ? '#8fd86a' : '#e0503a');
  text((ca ? ca.scrap : state.scrap) + ' rottami', cx + 520, cy + 20, 14, HC.gold, 'right');
  const sqs = ca ? ca.squads : [];
  wrap(sqs.length ? 'Squadre: ' + sqs.map(q => q.name + ' (' + q.mem.length + ')').join(', ') : 'Nessuna squadra con te.', 505, 13).slice(0, 2).forEach((l, i) => text(l, cx + 16, cy + 46 + i * 18, 13, HC.text, 'left'));
  if (C.lost) text(C.lost + ' uomini sono rimasti indietro nell\'ultimo settore.', cx + 16, cy + 84, 13, HC.warn, 'left');
  text("I feriti guariscono in marcia. Il carro si ripara solo all'officina, all'uscita da un settore, o dai mercanti.", cx + 16, cy + 106, 12, HC.dim, 'left');
}
