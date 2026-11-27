// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// More kinds of sector: hold a spot until the way opens (waves come), escort refugees to the exit, blow up
// a fuel depot, hunt down a raider warlord and his escort. And trails that run over several sectors (the
// missing colonel, the depot map in three pieces, the Butcher): each step is a side objective in a sector,
// the next step waits in the sectors that follow, the last pays well. It listens to the campaign's
// events (core.js: campaignStart, sectorSetup, sectorStep, sectorLeave, at the end of this file); campaign.js
// still calls pickMission, the map tags, the mission line and the minimap directly.

Object.assign(MISSIONS, {
  hold: { name: 'Resisti', tag: 'TIENI QUI', sign: 'posizione da tenere', brief: 'I genieri aprono il varco verso l\'uscita: tieni il punto segnato finché finiscono, mentre l\'Orda attacca.' },
  escort: { name: 'Scorta i profughi', sign: 'profughi da scortare', brief: 'Una colonna di profughi chiede di seguirti: portali vivi all\'uscita. Ti seguono a piedi, aspettali.' },
  sabotage: { name: 'Sabotaggio', tag: 'CARBURANTE', sign: 'deposito di carburante', brief: 'Un deposito di carburante dell\'Orda alimenta i loro mezzi: fallo saltare.' },
  hunt: { name: 'Caccia al capo', tag: 'CAPO PREDONE', sign: 'un capo predone', brief: 'Un capo predone e la sua scorta tengono la zona: abbattilo.' },
});
UT.civ = { name: 'Profugo', team: 0, w: 'none' };
registry('weapon').none = () => ({ kind: 'none', range: 0, rate: 99 });
registry('model').civ = () => { const g = makeSoldier('civ'), s = g.userData.body; bx(s, 0.6, 0.66, 0.4, 0x7a5a8a, 0, 0.92, 0); bx(s, 0.36, 0.14, 0.36, 0xb8a070, 0, 1.55, 0); bx(s, 0.44, 0.44, 0.3, 0x8a6a40, 0, 1.0, -0.34); return g; };

/** A sector's mission (not in the first sector: that one is set by hand). */
function pickMission(col) {
  const m = rng();
  if (m < 0.17) return 'camp';
  if (m < 0.3) return 'rescue';
  if (m < 0.42) return 'cache';
  if (m < 0.54) return 'hold';
  if (m < 0.66) return 'escort';
  if (m < 0.78) return col >= 2 ? 'sabotage' : 'camp';
  if (m < 0.88) return col >= 2 ? 'hunt' : 'cache';
  return 'exit';
}

// ---- The new missions on the map ---------------------------------------------------------------------------
function missionSetup(M, n) {
  const s = world.sites, rm = s.roadMain, tier = Math.min(3, 1 + Math.floor(n.col / 3));
  const roadAt = t => rm.length > 10 ? rm[Math.floor(rm.length * t)] : [s.start.x + 30, s.start.z + 30];
  if (M.kind === 'hold') {
    const p = roadAt(0.45 + rng() * 0.15), q = spotNear(p[0], p[1], 0);
    M.target = { x: q.x, z: q.z }; M.need = tune.hold_time; M.prog = 0; M.waveT = 6; M.tier = tier;
  } else if (M.kind === 'escort') {
    const tk = state.tank; M.civs = [];
    for (let i = 0; i < tune.escort_count; i++) { const q = spotNear(tk.x - Math.sin(tk.heading) * 7, tk.z - Math.cos(tk.heading) * 7, i + 3); const c = spawn('civ', q.x, q.z); c.civ = true; M.civs.push(c); }
    M.n0 = M.civs.length;
  } else if (M.kind === 'sabotage') {
    const c = s.camps.length ? s.camps[s.camps.length - 1] : null, g = c && state.groups.find(gg => gg.site === c);
    const q = c ? spotNear(c.x + 6, c.z + 6, 0) : (() => { const p = roadAt(0.6); return spotNear(p[0] + 8, p[1] + 8, 0); })();
    const gg = g || newGroup('camp', q.x, q.z, null);
    M.depot = addRaider(gg, 'depot', q.x, q.z, tier, true); M.target = M.depot;
    if (!g) for (let i = 0; i < 4; i++) { const r = spotNear(q.x + 4, q.z, i); addRaider(gg, i === 2 ? 'r_mg' : 'r_rifle', r.x, r.z, tier); }
  } else if (M.kind === 'hunt') {
    M.boss = warlord(roadAt(0.55 + rng() * 0.2), tier, 'Il Rasoio'); M.target = M.boss;
  }
}
/** A raider warlord in his vehicle with an escort (the hunt mission, the Butcher's last step). */
function warlord(p, tier, title) {
  const q = spotNear(p[0] + 10, p[1] + 6, 0), g = newGroup('patrol', q.x, q.z, null);
  g.wps = [0, 1, 2].map(k => spotNear(q.x + Math.cos(k * 2.1) * 14, q.z + Math.sin(k * 2.1) * 14, k)); g.wpi = 0;
  const b = addRaider(g, tier >= 2 ? 'r_tank' : 'technical', q.x, q.z, tier); b.maxhp = b.hp = b.maxhp * tune.warlord_hp; b.title = title;
  ['r_rifle', 'r_rifle', 'r_rpg', 'r_bomber', 'bike', 'bike'].forEach((k, i) => { const r = spotNear(q.x - 4, q.z - 4, i); addRaider(g, k, r.x, r.z, tier); });
  return b;
}
function missionDepotDown(e) {
  const M = state.mission; if (M && M.kind === 'sabotage' && M.depot === e && !M.done) finishMission(M, 'Il deposito di carburante salta in aria!');
  const S = state.side; if (S && S.depot === e && !S.done) sideDone(S);
}
function finishMission(M, msg) {
  M.done = true; state.scrap += tune.mission_scrap; sfx('coin');
  say('Radio', msg + ' +' + tune.mission_scrap + ' rottami. Invio per lasciare il settore, o prosegui verso l\'uscita.', '#9fe3a0');
}
/** Each step of the new missions (campaignUpdate, while not done). */
function missionUpdate(M, dt) {
  const tk = state.tank;
  if (M.done) return;
  if (M.kind === 'hold') {
    const inZone = Math.hypot(M.target.x - tk.x, M.target.z - tk.z) < tune.hold_radius;
    if (inZone && !M.started) { M.started = true; say('Genieri', 'Siamo al lavoro! Tienili lontani per ' + fmtT(M.need) + '.', '#9fe3a0'); }
    if (M.started) {
      if (inZone) M.prog += dt; else if (state.t - (M.outSay || -99) > 12) { M.outSay = state.t; say('Genieri', 'Comandante, senza di te qui non lavoriamo! Torna al punto.', '#ff9a7a'); }
      M.waveT -= dt;
      if (M.waveT <= 0) { M.waveT = tune.hold_wave; M.waves = (M.waves || 0) + 1; spawnWave(Math.round(tune.wave_size + M.waves), M.tier, null); say('Radio', 'Nemici in arrivo sul punto (attacco ' + M.waves + ')!', '#ff9a7a'); }
      if (M.prog >= M.need) finishMission(M, 'Il varco è aperto!');
    }
    if (state.atExitRaw && state.t - (M.exitSay || -99) > 10) { M.exitSay = state.t; say('Radio', 'L\'uscita è bloccata: prima tieni il punto segnato per i genieri.', '#ff9a7a'); }
  } else if (M.kind === 'escort') {
    const ex = world.sites.fortress, alive = M.civs.filter(c => c.alive);
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
  } else if (M.kind === 'hunt') {
    if (!M.boss.alive) { finishMission(M, M.boss.title + ' è morto!'); const r = randomSystem(); if (r) say('Radio', 'Nel suo mezzo c\'era un sistema: ' + giveSystem(r) + '.', '#8fe0ff'); }
  }
}
/** Leaving a sector: the refugees who made it. */
function missionLeave(M) { if (M && M.kind === 'escort') for (const c of M.civs || []) c.gone = true; }
/** Can the tank leave by the exit? (a held spot must be done first) */
function exitOpen(M) { return !(M && M.kind === 'hold' && !M.done); }
function missionLineExtra(M) {
  const tk = state.tank;
  if (M.kind === 'hold' && !M.done) return M.started ? 'Resisti · ' + fmtT(M.need - M.prog) + (Math.hypot(M.target.x - tk.x, M.target.z - tk.z) < tune.hold_radius ? '' : ' · torna al punto!') : 'Raggiungi il punto da tenere · ' + Math.round(Math.hypot(M.target.x - tk.x, M.target.z - tk.z)) + ' m';
  if (M.kind === 'escort' && !M.done) { const ex = world.sites.fortress; return 'Profughi ' + M.civs.filter(c => c.alive).length + '/' + M.n0 + ' · uscita ' + Math.round(Math.hypot(ex.x - tk.x, ex.z - tk.z)) + ' m'; }
  return null;
}

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
  const s = world.sites, rm = s.roadMain, tier = Math.min(3, 1 + Math.floor(n.col / 3));
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
function chainUpdate(dt) {
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
/** Map tags of the new missions and the trail; tag(x,z,label,colour,lift) from drawMapHUD. */
function missionTags(tag) {
  const M = state.mission, S = state.side;
  if (S && !S.done && S.target && (S.target.alive !== false)) tag(S.target.x, S.target.z, S.tag, '#ffd36a', 6);
  if (M && M.kind === 'hunt' && M.boss && M.boss.alive) tag(M.boss.x, M.boss.z, M.boss.title.toUpperCase(), '#ff8a6a', 5);
  if (M && M.kind === 'escort' && !M.done) for (const c of M.civs) if (c.alive) { const p = toScreen(c.x, c.y + 2.6, c.z); if (p.on) { ctx.fillStyle = '#c8f07a'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 6.3); ctx.fill(); } }
  if (M && M.kind === 'hold' && !M.done) { // the ring to hold, drawn on the ground
    ctx.strokeStyle = M.started ? '#ffd36a' : '#ff8a6a'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath();
    for (let k = 0; k <= 32; k++) { const a = k / 32 * 6.283, x = M.target.x + Math.sin(a) * tune.hold_radius, z = M.target.z + Math.cos(a) * tune.hold_radius, p = toScreen(x, hAt(x, z) + 0.3, z); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    ctx.stroke(); ctx.setLineDash([]);
  }
  const line = chainHudLine(); if (line) text(line, W - 110, 222, 11, '#ffd36a');
}
function missionMinimap(ring) {
  const S = state.side; if (S && !S.done && S.target) ring(S.target.x, S.target.z, 8, '#ffd36a');
  const M = state.mission; if (M && M.kind === 'hold' && !M.done) ring(M.target.x, M.target.z, tune.hold_radius, '#ffd36a');
}

// ---- Events (core.js) -----------------------------------------------------------------------------------
on('campaignStart', () => seedChains());
on('sectorSetup', (M, n) => { missionSetup(M, n); chainSetup(n); }); // hold, escort, sabotage, hunt; the trail's step
on('sectorStep', (M, dt) => { missionUpdate(M, dt); chainUpdate(dt); });
on('sectorLeave', mission => { missionLeave(mission); chainLeave(); });
