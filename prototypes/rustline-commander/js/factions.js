// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The five factions besides the Horde: the merchants' caravan, the well settlers, the army deserters,
// the Rust cult and the Iron Rats. Each has a reputation that lasts the whole campaign, a settlement on
// the sectors it holds (market, hamlet, road checkpoint, shrine, scavengers' camp), its own dialogue
// with trade, jobs and threats, and its own ways (the toll, the cult's sacred wrecks, the rats' looting).
// Loaded after campaign.js.
'use strict';

/** The factions: names, colour, settlement, figure, a line for the SITREP. */
const FACTIONS = {
  mercanti: { name: 'Carovana dei Mercanti', short: 'Mercanti', col: '#ffd36a', sign: 'Carovana dei mercanti', fig: 'rifle', place: 'un mercato lungo la strada' },
  coloni: { name: 'Coloni dei Pozzi', short: 'Coloni', col: '#b9f59a', sign: 'Coloni dei pozzi', fig: 'medic', place: 'un borgo di coloni' },
  disertori: { name: 'Disertori della 4ª Divisione', short: 'Disertori', col: '#9fd8ff', sign: 'Posto di blocco dei disertori', fig: 'mg', place: 'un posto di blocco sulla strada' },
  culto: { name: 'Culto della Ruggine', short: 'Culto', col: '#e8905a', sign: 'Santuario del Culto della Ruggine', fig: 'r_rpg', place: 'un santuario di rottami' },
  ratti: { name: 'Ratti di Ferro', short: 'Ratti', col: '#d0c0b0', sign: 'Recuperatori dei Ratti di Ferro', fig: 'r_rifle', place: 'un accampamento di recuperatori' },
};
const FACTION_IDS = Object.keys(FACTIONS);

// ---- Reputation -------------------------------------------------------------------------------------------
/** A faction's standing with the tank, -100..100, kept for the whole campaign. */
function rep(f) { return (state.camp && state.camp.rep && state.camp.rep[f]) || 0; }
function addRep(f, d) {
  if (!state.camp) return;
  const R = state.camp.rep || (state.camp.rep = {}), was = repLabel(f);
  R[f] = Math.max(-100, Math.min(100, (R[f] || 0) + d));
  const now = repLabel(f);
  say(FACTIONS[f].short, 'Reputazione ' + (d > 0 ? '+' : '') + d + ' (' + R[f] + ', ' + now + ')' + (now !== was ? ': ora siamo ' + now + '.' : '.'), d > 0 ? '#9fe3a0' : '#ff9a7a');
}
function repLabel(f) { const r = rep(f); return r >= tune.rep_friend ? 'amici' : r <= -tune.rep_friend ? 'ostili' : 'neutrali'; }
function repCol(f) { const l = repLabel(f); return l === 'amici' ? '#9fe3a0' : l === 'ostili' ? '#ff7a6a' : '#e8d8c0'; }
/** A price with the faction's discount (friends) or markup (enemies). */
function fprice(f, base) { return Math.round(base * (1 - Math.max(-1, Math.min(1, rep(f) / 100)) * tune.rep_discount)); }

// ---- Settlements (built with the map) -------------------------------------------------------------------------
/**
 * The settlement of the faction holding the sector: placed after the layout, on free ground; its place
 * (sites.settle) is where its people stand and talk. The deserters' checkpoint sits across the main road.
 */
function buildSettlement(sites, placed) {
  const f = world.spec && world.spec.faction; if (!f) return;
  const rm = sites.roadMain || [];
  let S = null;
  if (f === 'disertori' && rm.length > 40) S = buildCheckpoint(rm);
  else {
    const size = { mercanti: [14, 11], coloni: [18, 14], culto: [13, 13], ratti: [12, 10] }[f] || [12, 12];
    const p = rm.length > 30 ? rm[Math.floor(rm.length * (0.3 + rng() * 0.35))] : null;
    let A = p ? findArea(size[0], size[1], { sites: placed, cx: p[0], cz: p[1], r: 18, road: 3, tries: 120 }) : null;
    if (!A) A = findArea(size[0], size[1], { sites: placed, tries: 120 });
    if (A) {
      levelGround(A.x, A.z, size[0], size[1], A.g, 1); recomputeArea(A.x - 2, A.z - 2, size[0] + 4, size[1] + 4);
      S = ({ mercanti: market, coloni: hamlet, culto: shrine, ratti: ratsCamp })[f](A.x, A.z, A.g);
      keepArea(A.x, A.z, size[0], size[1], 3); recomputeArea(A.x - 5, A.z - 5, size[0] + 10, size[1] + 10);
    }
  }
  if (S) { S.fac = f; S.kind = 'settle'; sites.settle = S; }
}
/** The merchants' market: striped stalls of canvas on posts, a lorry with its load, crates, the sign. */
function market(x, z, g) {
  for (let k = 0; k < 3; k++) {
    const sx = x + 1 + k * 4, sz = z + 1;
    for (const [a, b] of [[0, 0], [2, 0], [0, 2], [2, 2]]) for (let y = 0; y < 2; y++) put(sx + a, g + y, sz + b, V.WOOD);
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) put(sx + a, g + 2, sz + b, (a + k) % 2 ? V.CLOTH : V.RAID);
    put(sx + 1, g, sz + 2, V.WOOD); // the counter
    addProp('crate', sx + 1.5, g, sz + 0.6, { ay: g - 1, crush: true });
  }
  const lx = x + 2, lz = z + 6; // the lorry: cab with glass, a bed with crates
  for (let a = 0; a < 7; a++) for (let b = 0; b < 3; b++) {
    put(lx + a, g, lz + b, V.JUNK);
    if (a < 2) { put(lx + a, g + 1, lz + b, b === 1 ? V.GLASS : V.METAL); put(lx + a, g + 2, lz + b, V.METAL); }
    else if (b !== 1) put(lx + a, g + 1, lz + b, V.RUST);
  }
  for (let k = 0; k < 3; k++) addProp('crate', lx + 3 + k * 1.2, g + 1, lz + 1.5, { ay: g });
  signboard(x + 11, z + 8, g, 0, 'market', false);
  addProp('barrel', x + 10.5, g, z + 5.5, { ay: g - 1, crush: true, col: 0xffd36a });
  return { x: x + 6.5, z: z + 4.8, g };
}
/** The settlers' hamlet: two farmhouses, a well, hay and a fence. */
function hamlet(x, z, g) {
  farmhouse(x + 1, z + 1, g, [0, 1]);
  farmhouse(x + 10, z + 1, g, [0, 1]);
  cylinder(x + 8, z + 10, 1.6, g, 1, V.CONC, null, null); addProp('well', x + 8.5, g + 1, z + 10.5, { ay: g });
  for (let k = 0; k < 3; k++) { put(x + 2 + k * 2, g, z + 12, V.HAY); put(x + 3 + k * 2, g, z + 12, V.HAY); }
  for (let k = 0; k < 18; k++) if (k % 6 !== 3) put(x + k, g, z + 13, V.WOOD);
  signboard(x + 14, z + 10, g, 0, 'village', false);
  return { x: x + 8.5, z: z + 8, g };
}
/** The Rust cult's shrine: a ring of scrap totems with red tops round a heap of wrecks, fires, a banner. */
function shrine(x, z, g) {
  const cx = x + 6, cz = z + 6;
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * 6.283, tx = Math.round(cx + Math.cos(a) * 5.5), tz = Math.round(cz + Math.sin(a) * 5.5);
    for (let y = 0; y < 5; y++) put(tx, g + y, tz, y === 4 ? V.RAID : y % 2 ? V.RUST : V.JUNK);
    if (k % 2) addProp('fire', tx + 0.5 - Math.cos(a) * 1.2, g, tz + 0.5 - Math.sin(a) * 1.2, { ay: g - 1 });
  }
  carWreck(cx - 2, cz - 1, g, true); carWreck(cx - 1, cz + 1, g + 1, true); // the heap of sacred wrecks
  for (let y = 0; y < 7; y++) put(cx + 3, g + y, cz - 3, V.RUST);
  addProp('sign', cx + 3.5, g + 6.4, cz - 2.5, { yaw: Math.PI / 4, tex: 'cult', w: 2.4, h: 2.4, ax: cx + 3, ay: g + 6, az: cz - 3 });
  return { x: cx + 0.5, z: cz + 4.5, g };
}
/** The Iron Rats' camp: tents, junk heaps, their motorbikes, a fire, the sign. */
function ratsCamp(x, z, g) {
  for (const [tx, tz] of [[1, 1], [6, 1]]) for (let l = 0; l < 3; l++) { put(x + tx, g, z + tz + l, V.CLOTH); put(x + tx + 2, g, z + tz + l, V.CLOTH); put(x + tx + 1, g + 1, z + tz + l, V.CLOTH); }
  for (let k = 0; k < 5; k++) { const jx = x + 1 + k * 2, jz = z + 8; put(jx, g, jz, k % 2 ? V.RUST : V.JUNK); if (k % 2 === 0) put(jx, g + 1, jz, V.JUNK); }
  for (let k = 0; k < 3; k++) addProp('bike', x + 3 + k * 1.6, g, z + 6, { ay: g - 1, crush: true, yaw: 0.4 * k, col: [0x8a2a20, 0x2a3a5a, 0x3a3a3a][k] });
  addProp('fire', x + 10.5, g, z + 5.5, { ay: g - 1 });
  signboard(x + 10, z + 1, g, 0, 'ratti', false);
  return { x: x + 6, z: z + 5.5, g };
}
/** The deserters' checkpoint across the main road: sandbag walls either side, a striped barrier, a bunker. */
function buildCheckpoint(rm) {
  const i = Math.floor(rm.length * 0.38), a = rm[i], b = rm[Math.min(rm.length - 1, i + 4)];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1, px = -dz / L, pz = dx / L;
  const RW = Math.round(tune.road_half_width), off = RW + 4;
  for (const side of [1, -1]) for (let s = 0; s < 5; s++) for (let t = -1; t <= 1; t++) {
    const x = Math.round(a[0] + px * side * (off + s) + dx / L * t), z = Math.round(a[1] + pz * side * (off + s) + dz / L * t);
    if (!inMap(x, z) || world.road[x + world.N * z]) continue;
    const h = colTop(x, z); put(x, h, z, V.BAG); if (t === 0) put(x, h + 1, z, s === 0 ? V.STRIPE : V.BAG);
  }
  // the bunker on one side, the barrier pole across the road (a prop: it lifts once the toll is paid)
  const bx = Math.round(a[0] + px * (off + 7)), bz = Math.round(a[1] + pz * (off + 7));
  if (inMap(bx - 3, bz - 3) && inMap(bx + 3, bz + 3) && areaOK(bx - 2, bz - 2, 4, 4, 0, 3, 1, [])) { const g = areaG(bx - 2, bz - 2, 4, 4); levelGround(bx - 2, bz - 2, 4, 4, g, 0); recomputeArea(bx - 3, bz - 3, 6, 6); buildHouse(bx - 2, bz - 2, 4, 4, g, { wall: V.CONC, roof: 'flat', roofSlab: V.CONC, face: [-px, -pz] }); }
  const g = colTop(a[0], a[1]);
  addProp('barrier', a[0] + 0.5, g, a[1] + 0.5, { yaw: Math.atan2(-pz, px), ay: -1 });
  const sx = Math.round(a[0] + px * (off + 1) - dx / L * 3), sz = Math.round(a[1] + pz * (off + 1) - dz / L * 3);
  addProp('sign', sx + 0.5, colTop(sx, sz) + 2.2, sz + 0.5, { yaw: Math.atan2(-dx, -dz), tex: 'toll', w: 2.8, h: 1.1, ay: -1 });
  return { x: a[0] + 0.5 + px * (off - 1), z: a[1] + 0.5 + pz * (off - 1), g, road: { x: a[0] + 0.5, z: a[1] + 0.5 } };
}

// ---- On the map -----------------------------------------------------------------------------------------------
/** After setupMap: the settlement's people, the faction's ways on this map, a SITREP line. */
function setupFactions() {
  const s = world.sites, n = state.node, f = n && n.faction; state.rats = false; state.cultMad = false; state.facRaidT = 0;
  if (!f || n.final) return;
  const S = s.settle;
  let pos = S ? { x: S.x, z: S.z } : null;
  if (!pos) { const rm = s.roadMain, p = rm[Math.floor(rm.length * 0.45)] || [s.start.x + 20, s.start.z + 20]; pos = spotNear(p[0] + 6, p[1] + 4, 0); }
  const host = repLabel(f) === 'ostili';
  state.npcs.push({ x: pos.x, z: pos.z, fac: f, settle: true, done: host, hostile: host, seen: false, kind: FACTIONS[f].fig, n: f === 'disertori' ? 3 : 2, mk: factionEvent, r: f === 'disertori' && S ? 12 : null });
  say('SITREP', 'Zona dei ' + FACTIONS[f].name + ' (' + repLabel(f) + '): ' + FACTIONS[f].place + '.', FACTIONS[f].col);
  if (host) { // they remember: an armed welcome
    state.facRaidT = 8; state.facRaidAt = { x: pos.x, z: pos.z, f };
    say(FACTIONS[f].short, 'Sei sulla nostra lista, comandante. Non uscirai vivo da qui.', '#ff7a6a');
  }
  if (f === 'ratti' && repLabel(f) !== 'amici') { // the rats got to the wrecks first
    let k = 0; for (const p of state.pickups) if (p.wreck && !p.taken && rng() < 0.5) { p.taken = true; k++; }
    if (k) say('Radio', 'I Ratti di Ferro hanno già spolpato ' + k + ' relitti in questa zona.', '#d0c0b0');
    state.rats = true;
  }
  if (f === 'culto') say('Radio', 'Attento: il Culto della Ruggine considera sacri i relitti. Spogliarli li offende.', '#e8905a');
  for (const p of state.pickups) if (p.wreck) p.was = p.taken;
}
/** Each step: settlements to talk to again, jobs, raids, the cult's eyes on the wrecks. */
function factionUpdate(dt) {
  const tk = state.tank, f = state.node && state.node.faction;
  for (const p of state.npcs) if (p.settle && p.done && !p.hostile && Math.hypot(p.x - tk.x, p.z - tk.z) > (p.r || tune.npc_radius) + 8) p.done = false; // drive off and back to talk again
  if (state.facRaidT > 0) { state.facRaidT -= dt; if (state.facRaidT <= 0) { const A = state.facRaidAt; factionAttack(A.f, A.x, A.z, 5); } }
  for (const q of state.quests) {
    if (q.done) continue;
    if (q.kind === 'deliver' && state.atExit) { q.done = true; state.scrap += q.scrap; sfx('coin'); say(q.giver, 'La cassa è arrivata. Eccovi ' + q.scrap + ' rottami.', '#ffd36a'); addRep(q.fac, 20); }
    if (q.kind === 'defend') {
      if (!q.g && state.t >= q.at) { q.g = raidOn(q.site, Math.round(4 + state.node.col * 0.8)); say('Coloni', 'Arrivano! I predoni sono al borgo!', '#ff9a7a'); }
      if (q.g && q.g.members.every(m => !m.alive)) { q.done = true; state.scrap += q.scrap; sfx('coin'); joinSquad(['recruit', 'recruit'], 'Milizia dei pozzi', q.site.x, q.site.z); tk.hp = Math.min(tk.maxhp, tk.hp + tk.maxhp * 0.3); say('Coloni', 'Il borgo è salvo! ' + q.scrap + ' rottami, riparazioni e due dei nostri con voi.', '#9fe3a0'); addRep('coloni', 25); }
    }
  }
  if (f === 'culto') for (const p of state.pickups) if (p.wreck && p.taken && !p.was) {
    p.was = true; addRep('culto', -8); say('Culto', 'Hai profanato un relitto sacro. Il Culto ti osserva.', '#e8905a');
    if (repLabel('culto') === 'ostili' && !state.cultMad) { state.cultMad = true; const S = world.sites.settle; factionAttack('culto', S ? S.x : tk.x + 20, S ? S.z : tk.z + 20, 4); }
  }
}
/** The faction's fighters turn on the tank: a group of armed men from (x,z), alerted. */
function factionAttack(f, x, z, n) {
  const g = newGroup('hunt', x, z, null); g.alert = true; g.seenT = state.t; g.known = { x: state.tank.x, z: state.tank.z }; g.fac = f;
  const tier = Math.min(3, 1 + (state.node.col >> 1) + (f === 'disertori' ? 1 : 0));
  for (let i = 0; i < n; i++) { const q = spotNear(x, z, i), k = f === 'culto' ? (i % 2 ? 'r_rpg' : 'r_rifle') : f === 'disertori' && i === 1 ? 'r_mg' : i === 3 ? 'r_rpg' : 'r_rifle'; addRaider(g, k, q.x, q.z, tier); }
  if (f === 'ratti' || (f === 'mercanti' && n >= 4)) { const q = spotNear(x + 4, z, 6); addRaider(g, 'technical', q.x, q.z, tier); }
  for (const p of state.npcs) if (p.fac === f) { p.done = true; p.hostile = true; }
  say(FACTIONS[f].short, 'Aprite il fuoco!', '#ff7a6a');
  return g;
}
/** A Horde raid on a place (the settlers' hamlet): they come from a distance and go for it. */
function raidOn(site, n) {
  let p = null;
  for (let tries = 0; tries < 40 && !p; tries++) { const a = rng() * 6.28, x = site.x + Math.sin(a) * 40, z = site.z + Math.cos(a) * 40; if (x > 6 && z > 6 && x < world.N - 6 && z < world.N - 6 && walkable(Math.floor(x), Math.floor(z))) p = { x, z }; }
  if (!p) p = { x: Math.min(world.N - 8, site.x + 30), z: site.z };
  const g = spawnWave(n, Math.min(3, 1 + (state.node.col >> 1)), p); g.base = { x: site.x, z: site.z }; g.known = { x: site.x, z: site.z };
  return g;
}
function addAmmo(type, n) { let k = 0; while (n-- > 0 && ammoTotal() < ammoMax()) { state.ammo[type]++; k++; } return k; }
function randomSystem(activeFirst) {
  const pool = systemIds().filter(id => !state.owned.includes(id)), act = pool.filter(id => SYSTEMS[id].active);
  const from = activeFirst && act.length ? act : pool; return from.length ? from[Math.floor(rng() * from.length)] : null;
}
function giveSystem(id) { state.owned.push(id); if (state.systems.length < sysSlots()) mountSystem(id); return SYSTEMS[id].name + (modOn(id) ? ' (montato)' : ' (in magazzino: montalo all\'officina, all\'uscita)'); }

// ---- The dialogues ------------------------------------------------------------------------------------------------
/** The settlement's window, built when the tank comes up: lines and choices depend on the reputation. */
function factionEvent(p) {
  const f = p.fac, F = FACTIONS[f], friend = repLabel(f) === 'amici', tk = state.tank, C = [];
  const once = k => !p['o_' + k], mark = k => { p['o_' + k] = true; };
  let text = '';
  if (f === 'mercanti') {
    text = friend ? '"Il nostro miglior cliente! Per te prezzi di favore, comandante."' : 'Bancarelle sotto i teloni, un camion carico e guardie con le mani sui fucili. "Si compra, si vende. Niente risse."';
    const pa = fprice(f, 45), pr = fprice(f, 50), ps = fprice(f, tune.sys_cost);
    C.push({ label: 'Compra 10 colpi, HE e AP (' + pa + ' rottami)', need: () => state.scrap >= pa && ammoTotal() < ammoMax(), act: () => { state.scrap -= pa; const k = addAmmo('he', 5) + addAmmo('ap', 5); addRep(f, 3); return k + ' colpi caricati nelle rastrelliere.'; } });
    C.push({ label: 'Riparazioni, +50% integrità (' + pr + ')', need: () => state.scrap >= pr && tk.hp < tk.maxhp, act: () => { state.scrap -= pr; tk.hp = Math.min(tk.maxhp, tk.hp + tk.maxhp * 0.5); addRep(f, 3); return 'Saldature fresche sullo scafo.'; } });
    if (once('sys')) C.push({ label: 'Un sistema avanzato dal camion (' + ps + ')', need: () => state.scrap >= ps && !!randomSystem(), act: () => { state.scrap -= ps; mark('sys'); const r = giveSystem(randomSystem()); addRep(f, 5); return 'Affare fatto: ' + r + '.'; } });
    if (once('job')) C.push({ label: 'Incarico: porta una loro cassa all\'uscita (+' + tune.job_scrap + ' rottami)', act: () => { mark('job'); state.quests.push({ kind: 'deliver', fac: f, scrap: tune.job_scrap, giver: F.short, text: 'Porta la cassa dei mercanti all\'uscita' }); return 'La cassa è nel vano. Portala all\'uscita del settore.'; } });
    C.push({ label: 'Rapina la carovana (+60 rottami, diventano ostili)', act: () => { state.scrap += 60; addRep(f, -60); factionAttack(f, p.x, p.z, 4); return 'Prendi quello che puoi. Le guardie aprono il fuoco!'; } });
  } else if (f === 'coloni') {
    text = friend ? '"Gli amici dei pozzi sono sempre i benvenuti. Cosa possiamo fare per voi?"' : 'Case basse, un pozzo, gente magra e diffidente. "Qui abbiamo poco, e i predoni vengono a prenderselo."';
    const pr = fprice(f, 30);
    C.push({ label: 'Lascia loro delle scorte (30 rottami)', need: () => state.scrap >= 30, act: () => { state.scrap -= 30; addRep(f, 15); if (once('medic')) { mark('medic'); joinSquad(['medic'], 'Medico dei pozzi', tk.x - 3, tk.z - 3); return 'Ti ringraziano. Il loro medico viene con te.'; } return 'Ti ringraziano con le lacrime agli occhi.'; } });
    if (once('def')) C.push({ label: 'Incarico: difendi il borgo dalla prossima razzia', act: () => { mark('def'); state.quests.push({ kind: 'defend', site: { x: p.x, z: p.z }, at: state.t + tune.raid_delay, scrap: tune.job_scrap, giver: F.short, text: 'Difendi il borgo dei coloni' }); return 'I predoni arriveranno tra poco. Prepara le difese attorno al borgo.'; } });
    if (friend && once('vol')) C.push({ label: 'Chiedi dei volontari', act: () => { mark('vol'); joinSquad(['recruit', 'recruit'], 'Volontari dei pozzi', tk.x - 4, tk.z - 4); return 'Due giovani prendono i fucili e salgono dietro al carro.'; } });
    C.push({ label: 'I fabbri del borgo: +30% integrità (' + pr + ')', need: () => state.scrap >= pr && tk.hp < tk.maxhp, act: () => { state.scrap -= pr; tk.hp = Math.min(tk.maxhp, tk.hp + tk.maxhp * 0.3); return 'Lamiere battute a mano, ma reggono.'; } });
    C.push({ label: 'Requisisci le provviste (+30 rottami, li tradisci)', act: () => { state.scrap += 30; addRep(f, -45); return 'Prendi tutto. Ti guardano andare via in silenzio.'; } });
  } else if (f === 'disertori') {
    const toll = friend ? 0 : fprice(f, tune.toll);
    text = friend ? '"Passa pure, comandante. Chi combatte l\'Orda è dei nostri."' : 'Sacchetti di sabbia, una sbarra a strisce e mitragliatrici puntate. "Posto di blocco della 4ª. Si paga, o si torna indietro."';
    C.push({ label: toll ? 'Paga il pedaggio (' + toll + ' rottami)' : 'Passa (sei un amico)', need: () => state.scrap >= toll, act: () => { state.scrap -= toll; liftBarrier(); addRep(f, 5); return 'La sbarra si alza. "Buona strada."'; } });
    const pv = fprice(f, 140);
    if (p.vetOk == null) p.vetOk = rng() < tune.vet_squad_chance; // iteration 76: a whole squad is rare
    if (once('vet') && p.vetOk) C.push({ label: 'Assolda una squadra di veterani (' + pv + ')', need: () => state.scrap >= pv, act: () => { state.scrap -= pv; mark('vet'); promote(joinSquad(['rifle', 'mg', 'at'], 'Veterani della 4ª', tk.x - 4, tk.z - 4, true), 2); addRep(f, 5); return 'Tre veterani salgono a bordo. Sanno il fatto loro.'; } });
    if (friend && once('ap')) C.push({ label: 'Colpi perforanti dal loro deposito (8 AP, 25)', need: () => state.scrap >= 25 && ammoTotal() < ammoMax(), act: () => { state.scrap -= 25; mark('ap'); return addAmmo('ap', 8) + ' colpi AP caricati.'; } });
    const half = Math.round(WEAPONS.c75.cost / 2);
    if (friend && once('gun') && !state.weaponsOwned.includes('c75')) C.push({ label: 'Cannone 75mm a metà prezzo (' + half + ')', need: () => state.scrap >= half, act: () => { state.scrap -= half; mark('gun'); state.weaponsOwned.push('c75'); return 'Il cannone è tuo: montalo all\'officina, all\'uscita dal settore (Arma e colpi).'; } });
    C.push({ label: 'Passa con la forza', act: () => { liftBarrier(); addRep(f, -40); factionAttack(f, p.x, p.z, 5); return 'Sfondi la sbarra. Dal bunker partono le raffiche!'; } });
  } else if (f === 'culto') {
    text = friend ? '"Il Ferro ti riconosce, fratello. Le macchine antiche parlano di te."' : 'Totem di lamiera, fuochi e uomini con maschere di rottami che cantano attorno a un mucchio di relitti. "Il Ferro dorme qui. Non svegliarlo."';
    const ps = fprice(f, Math.round(tune.sys_cost * 1.1)), pb = fprice(f, 80);
    C.push({ label: 'Offerta di rottami al Ferro (40)', need: () => state.scrap >= 40, act: () => { state.scrap -= 40; addRep(f, 15); return 'Il sacerdote annuisce. Il Culto ti guarda con meno sospetto.'; } });
    if (rep(f) >= 0 && once('sys')) C.push({ label: 'Baratta un sistema antico (' + ps + ')', need: () => state.scrap >= ps && !!randomSystem(true), act: () => { state.scrap -= ps; mark('sys'); const r = giveSystem(randomSystem(true)); addRep(f, 5); return 'Ti consegnano una reliquia funzionante: ' + r + '.'; } });
    if (friend) C.push({ label: 'Benedizione del Ferro: ripara tutto (' + pb + ')', need: () => state.scrap >= pb && tk.hp < tk.maxhp, act: () => { state.scrap -= pb; tk.hp = tk.maxhp; return 'Mani esperte e canti strani: lo scafo è come nuovo.'; } });
    C.push({ label: 'Profana il santuario (+40 rottami, diventano ostili)', act: () => { state.scrap += 40; addRep(f, -60); factionAttack(f, p.x, p.z, 5); return 'Spogli i relitti sacri. Le maschere imbracciano i lanciarazzi!'; } });
    C.push({ label: 'Vattene in silenzio', act: () => 'I canti riprendono alle tue spalle.' });
  } else if (f === 'ratti') {
    text = friend ? '"Ehi, socio! Abbiamo trovato roba buona, ne vuoi una parte?"' : 'Moto truccate, tende e cumuli di ferraglia. Un tipo magro con gli occhiali da saldatore ti squadra. "Questi relitti sono nostri. Chi arriva prima, prende."';
    const px = fprice(f, 50);
    if (once('share')) C.push({ label: 'Spartisci il bottino (+20 rottami)', act: () => { mark('share'); state.scrap += 20; addRep(f, 15); return 'Ti passano una parte del bottino: 20 rottami. "Alla prossima, socio."'; } });
    if (once('scout')) C.push({ label: 'Assolda i loro esploratori (' + px + '): rivelano la zona', need: () => state.scrap >= px, act: () => { state.scrap -= px; mark('scout'); revealAround(p.x, p.z, tune.scout_reveal); state.campsKnown = true; addRep(f, 5); return 'Ti segnano campi e strade: la zona attorno è scoperta, i campi cerchiati.'; } });
    C.push({ label: 'Cacciali via (i relitti tornano liberi)', act: () => { addRep(f, -35); factionAttack(f, p.x, p.z, 3); state.rats = false; return 'I Ratti montano in sella e aprono il fuoco!'; } });
    C.push({ label: 'Lasciali in pace', act: () => '"Saggio, comandante."' });
  }
  return { title: F.name + ' · ' + repLabel(f) + ' (' + rep(f) + ')', text, choices: C };
}
/** The deserters' barrier lifts: its pole is gone. */
function liftBarrier() { for (const q of world.props || []) if (q.k === 'barrier') q.dead = true; R3.propT = -1; }
/** The rats' scouts: the map round (x,z) is explored. */
function revealAround(x, z, r) {
  const G = world.visG, E = world.expT; if (!G || !E) return;
  for (let gz = 0; gz < G; gz++) for (let gx = 0; gx < G; gx++) if (Math.hypot(gx * 2 + 1 - x, gz * 2 + 1 - z) < r) E[gx + G * gz] = 1;
  world.mapDirty = true;
}

// ---- Events (core.js) -----------------------------------------------------------------------------------
on('sectorSetup', () => setupFactions()); // the settlement, its people and the faction's ways
