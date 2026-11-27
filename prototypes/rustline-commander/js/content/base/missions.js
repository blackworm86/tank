// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// The sector missions, each one entry in the mission registry (campaign.js runs them): reach the exit,
// destroy a camp, free prisoners, recover supplies, hold a spot until the way opens, escort refugees, blow
// up a fuel depot, hunt a raider warlord, and the last stand. And trails that run over several sectors
// (the missing colonel, the depot map in three pieces, the Butcher): each step is a side objective in a
// sector, the next waits in the sectors that follow, the last pays well; they listen to the campaign's
// events (core.js) at the end of this file. (docs/architecture/rustline-modular-plan.md)
'use strict';

UT.civ = { name: 'Profugo', team: 0, w: 'none' };
registry('weapon').none = () => ({ kind: 'none', range: 0, rate: 99 });
registry('model').civ = () => { const g = makeSoldier('civ'), s = g.userData.body; bx(s, 0.6, 0.66, 0.4, 0x7a5a8a, 0, 0.92, 0); bx(s, 0.36, 0.14, 0.36, 0xb8a070, 0, 1.55, 0); bx(s, 0.44, 0.44, 0.3, 0x8a6a40, 0, 1.0, -0.34); return g; };

// ---- Helpers the missions share ------------------------------------------------------------------------------
/** The radio line when a mission from the first set is done. */
function missionDoneSay() { if (!state.final) say('Radio', 'Missione compiuta! Invio per lasciare il settore subito, o prosegui verso l\'uscita.', '#9fe3a0'); }
/** A mission done with its own message: the pay and the way out. */
function finishMission(M, msg) {
  M.done = true; state.scrap += tune.mission_scrap; sfx('coin');
  say('Radio', msg + ' +' + tune.mission_scrap + ' rottami. Invio per lasciare il settore, o prosegui verso l\'uscita.', '#9fe3a0');
}
/** The sector's tier (1-3) by its column. */
function sectorTier(n) { return Math.min(3, 1 + Math.floor(n.col / 3)); }
/** A point a share t along the main road (or near the start when there is no road). */
function roadAt(t) { const s = world.sites, rm = s.roadMain; return rm.length > 10 ? rm[Math.floor(rm.length * t)] : [s.start.x + 30, s.start.z + 30]; }
/** A raider warlord in his vehicle with an escort (the hunt mission, the Butcher's last step). */
function warlord(p, tier, title) {
  const q = spotNear(p[0] + 10, p[1] + 6, 0), g = newGroup('patrol', q.x, q.z, null);
  g.wps = [0, 1, 2].map(k => spotNear(q.x + Math.cos(k * 2.1) * 14, q.z + Math.sin(k * 2.1) * 14, k)); g.wpi = 0;
  const b = addRaider(g, tier >= 2 ? 'r_tank' : 'technical', q.x, q.z, tier); b.maxhp = b.hp = b.maxhp * tune.warlord_hp; b.title = title;
  ['r_rifle', 'r_rifle', 'r_rpg', 'r_bomber', 'bike', 'bike'].forEach((k, i) => { const r = spotNear(q.x - 4, q.z - 4, i); addRaider(g, k, r.x, r.z, tier); });
  return b;
}
/** A fuel depot went up (enemies.js onKill): the sabotage mission, or the trail's step. */
function missionDepotDown(e) {
  const M = state.mission; if (M && M.kind === 'sabotage' && M.depot === e && !M.done) finishMission(M, 'Il deposito di carburante salta in aria!');
  const S = state.side; if (S && S.depot === e && !S.done) sideDone(S);
}
/** A camp mission's target: a random camp, or no mission at all when the map has none. */
function campTarget(M) {
  const s = world.sites;
  if (s.camps.length) M.target = s.camps[Math.floor(rng() * s.camps.length)];
  else { M.kind = 'exit'; M.done = true; }
}

// ---- The missions, in the order the campaign picks them (w: the chance) --------------------------------------
registerMission('camp', {
  name: 'Distruggi il campo', brief: 'Un campo dell\'Orda controlla la zona: raderlo al suolo apre la via.', w: 0.17,
  prepare: campTarget,
  update(M) {
    if (!M.target.cleared) return;
    M.done = true; state.scrap += tune.mission_scrap; say('Radio', 'Campo distrutto: +' + tune.mission_scrap + ' rottami.', '#ffd36a');
    missionDoneSay();
  },
});
registerMission('rescue', {
  name: 'Libera i prigionieri', brief: 'Prigionieri in un campo dell\'Orda: ripuliscilo e si uniranno a te.', tag: 'PRIGIONIERI', sign: 'segnale di soccorso', w: 0.13,
  prepare: campTarget,
  update(M) {
    if (!M.target.cleared) return;
    M.done = true;
    joinSquad(['rifle', 'rifle', rng() < 0.5 ? 'mg' : 'medic'], 'Ex prigionieri', M.target.x + 0.5, M.target.z + 0.5);
    say('Ex prigionieri', 'Grazie, comandante! Siamo con te.', '#9fe3a0');
    missionDoneSay();
  },
});
registerMission('cache', {
  name: 'Recupera i rifornimenti', brief: 'Un deposito militare nascosto: portaci il carro.', tag: 'DEPOSITO', w: 0.12,
  prepare(M) {
    const s = world.sites, rm = s.roadMain, p = rm.length > 20 ? rm[Math.floor(rm.length * (0.45 + rng() * 0.25))] : [s.start.x + 30, s.start.z + 30];
    const q = spotNear(p[0] + 6, p[1] + 6, 0); M.cache = { x: q.x, z: q.z }; M.target = M.cache;
  },
  update(M) {
    const tk = state.tank; if (Math.hypot(M.cache.x - tk.x, M.cache.z - tk.z) >= 4.5) return;
    M.done = true; const v = tune.mission_scrap + tune.cache_bonus; state.scrap += v; sfx('coin');
    floatText(M.cache.x, hAt(M.cache.x, M.cache.z) + 2, M.cache.z, '+' + v + ' rottami', '#ffd36a');
    if (rng() < 0.5) { const sl = freeUpgrade(); say('Radio', 'Deposito aperto: ' + v + ' rottami' + (sl ? ' e un pezzo nuovo (' + sl + ')' : '') + '.', '#ffd36a'); }
    else { tk.hp = Math.min(tk.maxhp, tk.hp + tk.maxhp * 0.3); say('Radio', 'Deposito aperto: ' + v + ' rottami e materiale per le riparazioni.', '#ffd36a'); }
    missionDoneSay();
  },
});
registerMission('hold', {
  name: 'Resisti', tag: 'TIENI QUI', sign: 'posizione da tenere', w: 0.12,
  brief: 'I genieri aprono il varco verso l\'uscita: tieni il punto segnato finché finiscono, mentre l\'Orda attacca.',
  setup(M, n) { const p = roadAt(0.45 + rng() * 0.15), q = spotNear(p[0], p[1], 0); M.target = { x: q.x, z: q.z }; M.need = tune.hold_time; M.prog = 0; M.waveT = 6; M.tier = sectorTier(n); },
  update(M, dt) {
    const tk = state.tank, inZone = Math.hypot(M.target.x - tk.x, M.target.z - tk.z) < tune.hold_radius;
    if (inZone && !M.started) { M.started = true; say('Genieri', 'Siamo al lavoro! Tienili lontani per ' + fmtT(M.need) + '.', '#9fe3a0'); }
    if (M.started) {
      if (inZone) M.prog += dt; else if (state.t - (M.outSay || -99) > 12) { M.outSay = state.t; say('Genieri', 'Comandante, senza di te qui non lavoriamo! Torna al punto.', '#ff9a7a'); }
      M.waveT -= dt;
      if (M.waveT <= 0) { M.waveT = tune.hold_wave; M.waves = (M.waves || 0) + 1; spawnWave(Math.round(tune.wave_size + M.waves), M.tier, null); say('Radio', 'Nemici in arrivo sul punto (attacco ' + M.waves + ')!', '#ff9a7a'); }
      if (M.prog >= M.need) finishMission(M, 'Il varco è aperto!');
    }
    if (state.atExitRaw && state.t - (M.exitSay || -99) > 10) { M.exitSay = state.t; say('Radio', 'L\'uscita è bloccata: prima tieni il punto segnato per i genieri.', '#ff9a7a'); }
  },
  exitShut: M => !M.done, // the exit stays shut until the spot is held
  line(M) {
    if (M.done) return null;
    const tk = state.tank, d = Math.hypot(M.target.x - tk.x, M.target.z - tk.z);
    return M.started ? 'Resisti · ' + fmtT(M.need - M.prog) + (d < tune.hold_radius ? '' : ' · torna al punto!') : 'Raggiungi il punto da tenere · ' + Math.round(d) + ' m';
  },
  tags(M) { // the ring to hold, drawn on the ground
    if (M.done) return;
    ctx.strokeStyle = M.started ? '#ffd36a' : '#ff8a6a'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath();
    for (let k = 0; k <= 32; k++) { const a = k / 32 * 6.283, x = M.target.x + Math.sin(a) * tune.hold_radius, z = M.target.z + Math.cos(a) * tune.hold_radius, p = toScreen(x, hAt(x, z) + 0.3, z); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    ctx.stroke(); ctx.setLineDash([]);
  },
  minimap(M, ring) { if (!M.done) ring(M.target.x, M.target.z, tune.hold_radius, '#ffd36a'); },
});
registerMission('escort', {
  name: 'Scorta i profughi', sign: 'profughi da scortare', w: 0.12,
  brief: 'Una colonna di profughi chiede di seguirti: portali vivi all\'uscita. Ti seguono a piedi, aspettali.',
  setup(M) {
    const tk = state.tank; M.civs = [];
    for (let i = 0; i < tune.escort_count; i++) { const q = spotNear(tk.x - Math.sin(tk.heading) * 7, tk.z - Math.cos(tk.heading) * 7, i + 3); const c = spawn('civ', q.x, q.z); c.civ = true; M.civs.push(c); }
    M.n0 = M.civs.length;
  },
  update(M) {
    const tk = state.tank, ex = world.sites.fortress, alive = M.civs.filter(c => c.alive);
    alive.forEach((c, i) => { // they follow the tank, a little behind, and wait when it stops
      const d = Math.hypot(c.x - tk.x, c.z - tk.z);
      if (d > 6 && (!c.path || c.pi >= c.path.length || state.t - (c.pathT || -9) > 1.5)) { const a = tk.heading + Math.PI + (i - alive.length / 2) * 0.35; setDest(c, tk.x + Math.sin(a) * 4.5, tk.z + Math.cos(a) * 4.5); }
      else if (d < 3.5) c.path = null;
    });
    if (!alive.length) { M.done = true; M.failed = true; say('Radio', 'I profughi sono tutti morti. Non c\'è più niente da fare qui.', '#ff7a6a'); return; }
    if (alive.every(c => Math.hypot(c.x - ex.x, c.z - ex.z) < tune.exit_radius + 6)) {
      M.done = true; const n = alive.length, v = n * tune.escort_pay; state.scrap += v; addRep('coloni', n * 3); sfx('coin');
      say('Profughi', 'Siamo salvi! Grazie, comandante. (' + n + '/' + M.n0 + ' vivi, +' + v + ' rottami)', '#9fe3a0');
      if (n >= 3) joinSquad(['rifle', 'rifle'], 'Profughi armati', tk.x - 4, tk.z - 4);
    }
  },
  leave(M) { for (const c of M.civs || []) c.gone = true; }, // the refugees who made it go their way
  line(M) { if (M.done) return null; const tk = state.tank, ex = world.sites.fortress; return 'Profughi ' + M.civs.filter(c => c.alive).length + '/' + M.n0 + ' · uscita ' + Math.round(Math.hypot(ex.x - tk.x, ex.z - tk.z)) + ' m'; },
  tags(M) { if (!M.done) for (const c of M.civs) if (c.alive) { const p = toScreen(c.x, c.y + 2.6, c.z); if (p.on) { ctx.fillStyle = '#c8f07a'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill(); } } },
});
registerMission('sabotage', {
  name: 'Sabotaggio', tag: 'CARBURANTE', sign: 'deposito di carburante', w: 0.12, minCol: 2, instead: 'camp',
  brief: 'Un deposito di carburante dell\'Orda alimenta i loro mezzi: fallo saltare.',
  setup(M, n) {
    const s = world.sites, tier = sectorTier(n);
    const c = s.camps.length ? s.camps[s.camps.length - 1] : null, g = c && state.groups.find(gg => gg.site === c);
    const q = c ? spotNear(c.x + 6, c.z + 6, 0) : (() => { const p = roadAt(0.6); return spotNear(p[0] + 8, p[1] + 8, 0); })();
    const gg = g || newGroup('camp', q.x, q.z, null);
    M.depot = addRaider(gg, 'depot', q.x, q.z, tier, true); M.target = M.depot;
    if (!g) for (let i = 0; i < 4; i++) { const r = spotNear(q.x + 4, q.z, i); addRaider(gg, i === 2 ? 'r_mg' : 'r_rifle', r.x, r.z, tier); }
  }, // done by the depot's onKill (missionDepotDown)
});
registerMission('hunt', {
  name: 'Caccia al capo', tag: 'CAPO PREDONE', sign: 'un capo predone', w: 0.10, minCol: 2, instead: 'cache',
  brief: 'Un capo predone e la sua scorta tengono la zona: abbattilo.',
  setup(M, n) { M.boss = warlord(roadAt(0.55 + rng() * 0.2), sectorTier(n), 'Il Rasoio'); M.target = M.boss; },
  update(M) { if (!M.boss.alive) { finishMission(M, M.boss.title + ' è morto!'); const r = randomSystem(); if (r) say('Radio', 'Nel suo mezzo c\'era un sistema: ' + giveSystem(r) + '.', '#8fe0ff'); } },
  tags(M, tag) { if (M.boss && M.boss.alive) tag(M.boss.x, M.boss.z, M.boss.title.toUpperCase(), '#ff8a6a', 5); },
});
registerMission('exit', { name: 'Raggiungi l\'uscita', brief: 'Nessun obiettivo: trova l\'uscita del settore.', w: 0.12, fallback: true, startsDone: true, exitOnly: true });
registerMission('defend', { name: 'Ultima difesa', brief: '' }); // the last stand: setupFinal and the Horde's waves run it

// ---- Trails over several sectors -----------------------------------------------------------------------------
const CHAINS = {
  colonnello: { name: 'Il colonnello scomparso', steps: [
    { kind: 'find', tag: 'JEEP', text: 'Trova la jeep del colonnello Brandi' },
    { kind: 'scouts', tag: 'RAPITORI', text: 'Abbatti la banda che l\'ha preso' },
    { kind: 'camp', tag: 'COLONNELLO', text: 'Libera il colonnello dal campo' }], reward: 'colonel' },
  mappa: { name: 'La mappa del deposito', steps: [
    { kind: 'find', tag: 'PEZZO 1', text: 'Recupera il primo pezzo della mappa' },
    { kind: 'find', tag: 'PEZZO 2', text: 'Recupera il secondo pezzo della mappa' },
    { kind: 'find', tag: 'PEZZO 3', text: 'Recupera l\'ultimo pezzo della mappa' }], reward: 'depot' },
  macellaio: { name: 'Il Macellaio', steps: [
    { kind: 'scouts', tag: 'ESPLORATORI', text: 'Sbaraglia gli esploratori del Macellaio' },
    { kind: 'sabotage', tag: 'CARBURANTE', text: 'Fai saltare il carburante del Macellaio' },
    { kind: 'warlord', tag: 'MACELLAIO', text: 'Uccidi il Macellaio' }], reward: 'butcher' },
};
/** At a new campaign: two trails start in the early sectors. */
function seedChains() {
  const cols = state.camp.cols, ids = Object.keys(CHAINS).sort(() => rng() - 0.5).slice(0, 2);
  state.camp.chains = {};
  ids.forEach((id, k) => { state.camp.chains[id] = { step: 0, done: false }; const col = cols[1 + k]; col[Math.floor(rng() * col.length)].chain = { id, step: 0 }; });
}
/** The trail step of this sector, if any: a side objective on the map. */
function chainSetup(n) {
  state.side = null;
  if (!n.chain || n.final) return;
  const C = CHAINS[n.chain.id], st = C.steps[n.chain.step], ch = state.camp.chains[n.chain.id];
  if (!ch || ch.done || ch.step !== n.chain.step) return;
  const s = world.sites, rm = s.roadMain, tier = sectorTier(n);
  const far = () => { for (let k = 0; k < 40; k++) { const x = 12 + rng() * (world.N - 24), z = 12 + rng() * (world.N - 24); if (Math.hypot(x - s.start.x, z - s.start.z) > 45 && walkable(Math.floor(x), Math.floor(z)) && !shallow(x, z) && findPath(s.start.x, s.start.z, x, z, 1, 9000, 1, tune.tank_ground_climb)) return spotNear(x, z, 0); } const p = rm[Math.floor(rm.length * 0.6)] || [s.start.x + 20, s.start.z + 20]; return spotNear(p[0] + 6, p[1] + 6, 0); };
  const S = { id: n.chain.id, step: n.chain.step, kind: st.kind, tag: st.tag, text: st.text, done: false };
  if (st.kind === 'find') {
    S.target = far(); const g = newGroup('patrol', S.target.x, S.target.z, null); g.wps = [S.target, spotNear(S.target.x + 8, S.target.z, 1), spotNear(S.target.x, S.target.z + 8, 2)]; g.wpi = 0;
    for (let i = 0; i < 2 + tier; i++) { const q = spotNear(S.target.x + 5, S.target.z + 5, i); addRaider(g, i === 1 ? 'r_mg' : i === 3 ? 'dog' : 'r_rifle', q.x, q.z, tier); }
  } else if (st.kind === 'scouts') {
    const p = far(), g = newGroup('patrol', p.x, p.z, null); g.wps = [p, spotNear(p.x + 12, p.z, 1), spotNear(p.x, p.z + 12, 2)]; g.wpi = 0;
    ['bike', 'bike', 'buggy', 'r_rifle', 'r_rifle', 'r_rpg'].forEach((k, i) => { const q = spotNear(p.x, p.z, i); addRaider(g, k, q.x, q.z, tier); });
    S.group = g; S.target = p;
  } else if (st.kind === 'camp' && s.camps.length) {
    S.camp = s.camps[Math.floor(rng() * s.camps.length)]; S.target = S.camp;
  } else if (st.kind === 'sabotage') {
    const c = s.camps.length ? s.camps[0] : null, q = c ? spotNear(c.x - 6, c.z + 6, 0) : far(), g = (c && state.groups.find(gg => gg.site === c)) || newGroup('camp', q.x, q.z, null);
    S.depot = addRaider(g, 'depot', q.x, q.z, tier, true); S.target = S.depot;
  } else if (st.kind === 'warlord') {
    const p = far(); S.boss = warlord([p.x, p.z], Math.max(2, tier), 'Il Macellaio'); S.target = S.boss;
  } else { S.kind = 'find'; S.target = far(); }
  state.side = S;
  say('Pista', C.name + ' (' + (S.step + 1) + '/' + C.steps.length + '): ' + S.text + '. È segnato sulla mappa.', '#ffd36a');
}
function chainUpdate() {
  const S = state.side, tk = state.tank; if (!S || S.done) return;
  if (S.kind === 'find' && Math.hypot(S.target.x - tk.x, S.target.z - tk.z) < 5) sideDone(S);
  if (S.kind === 'scouts' && S.group.members.every(m => !m.alive)) sideDone(S);
  if (S.kind === 'camp' && S.camp.cleared) sideDone(S);
  if (S.kind === 'warlord' && !S.boss.alive) sideDone(S);
}
/** A trail step done: the next waits in the sectors ahead, or the trail pays out. */
function sideDone(S) {
  S.done = true; const C = CHAINS[S.id], ch = state.camp.chains[S.id]; ch.step = S.step + 1; sfx('coin');
  if (ch.step < C.steps.length) {
    for (const id of state.node.next) campNode(id).chain = { id: S.id, step: ch.step };
    say('Pista', C.name + ': fatto. La pista continua nel prossimo settore (' + C.steps[ch.step].text.toLowerCase() + ').', '#ffd36a');
    return;
  }
  ch.done = true; const tk = state.tank;
  if (C.reward === 'colonel') { const sq = joinSquad(['radio', 'mg', 'rifle', 'rifle'], 'Scorta del colonnello', tk.x - 4, tk.z - 4); if (sq) promote(sq, 2); state.scrap += 60; say('Colonnello Brandi', 'Vi devo la vita. La mia scorta è vostra, e conosco questi posti. (+60 rottami)', '#9fe3a0'); }
  if (C.reward === 'depot') { tk.hp = tk.maxhp; for (const k of SHELL_IDS) addAmmo(k, 99); const r = randomSystem(); state.scrap += 80; say('Pista', 'La mappa porta a un deposito dell\'esercito: riparazioni, rastrelliere piene, 80 rottami' + (r ? ' e ' + giveSystem(r) : '') + '.', '#9fe3a0'); }
  if (C.reward === 'butcher') { state.scrap += 140; for (const f of FACTION_IDS) addRep(f, 10); const r = randomSystem(true) || randomSystem(); say('Pista', 'Il Macellaio è morto: tutte le fazioni ne parlano. +140 rottami' + (r ? ', ' + giveSystem(r) : '') + '.', '#9fe3a0'); }
}
/** Leaving with a trail step undone: the trail follows into the next sectors. */
function chainLeave() {
  const S = state.side; if (!S || S.done) return;
  for (const id of state.node.next) campNode(id).chain = { id: S.id, step: S.step };
}
function chainHudLine() {
  const S = state.side; if (!S || S.done) return null;
  const C = CHAINS[S.id], tk = state.tank, d = S.target ? ' · ' + Math.round(Math.hypot(S.target.x - tk.x, S.target.z - tk.z)) + ' m' : '';
  return 'Pista ' + (S.step + 1) + '/' + C.steps.length + ': ' + S.text + d;
}

// ---- Events (core.js) -----------------------------------------------------------------------------------
on('campaignStart', () => seedChains());
on('sectorSideSetup', (M, n) => chainSetup(n)); // the trail's step, after the sector's mission
on('sectorStep', () => chainUpdate());
on('sectorLeave', () => chainLeave());
on('mapTags', tag => { // the trail's mark on the map and its line
  const S = state.side; if (S && !S.done && S.target && (S.target.alive !== false)) tag(S.target.x, S.target.z, S.tag, '#ffd36a', 6);
  const line = chainHudLine(); if (line) text(line, W - 110, 222, 11, '#ffd36a');
});
on('minimapMarks', ring => { const S = state.side; if (S && !S.done && S.target) ring(S.target.x, S.target.z, 8, '#ffd36a'); });
