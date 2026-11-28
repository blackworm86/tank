// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The order menu: right-click shows the orders that fit what is under the mouse. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The order menu: right-click shows the orders that fit what is under the mouse ---------------------
/** Menu layout, shared by the drawing and the mouse. */
const MENU = { w: 300, row: 26, head: 26, pad: 6, foot: 36 };
/** Every order the selected squads can take at the clicked point (an enemy, a building, the own vehicle, open ground). */
function menuItems(g, append) {
  const sel = selectedSquads(), tk = state.tank, p = g.p, items = [];
  if (append) { // a stop on the drawn path: how to get there
    const n = Math.max(1, ...sel.map(sq => sq.order.t === 'move' && !sq.order.done && sq.order.pts ? sq.order.pts.length - (sq.order.i || 0) + 1 : 1));
    if (g.tgt && g.tgt.alive) { // Shift + right click on an enemy: what the path does about it
      const t = g.tgt, nm = UT[t.kind].name.toLowerCase(), has = sel.some(sq => sq.order.t === 'move' && !sq.order.done), last = n - 1;
      const sent = k => () => { const c = legAll(k); if (c) { sfx('radio'); mark(t.x, t.z, 0x9fd8ff); } else say('Radio', 'Prima traccia un percorso (click destro, poi Shift + click destro per le tappe).', '#e0a070'); };
      items.push({ key: 'G', label: 'Sopprimilo lungo il tratto ' + last, col: '#9fd8ff', desc: DESC.legSupp, off: !has, act: sent((o, p) => { p.supp = t; if (p.fire === 'none') p.fire = null; }) });
      items.push({ key: 'F', label: 'All\'arrivo: fermi lì, fuoco su di lui', col: '#ff8a6a', desc: DESC.final, off: !has, act: sent(o => { o.final = t; }) });
      items.push({ key: 'K', label: 'Entrambe le cose', col: '#ffb070', desc: DESC.both, off: !has, act: sent((o, p) => { p.supp = t; if (p.fire === 'none') p.fire = null; o.final = t; }) });
      return items;
    }
    items.push({ key: 'V', label: 'Tappa ' + n + ': vai', desc: DESC.move, act: () => issueOrder('move', true, p, g.face) });
    items.push({ key: 'N', label: 'Tappa ' + n + ': vai senza sparare', col: '#b8b0a0', desc: DESC.nofire, act: () => { if (issueOrder('move', true, p, g.face)) legAll((o, q) => { q.fire = 'none'; }); } });
    if (sel.some(sq => alive(sq).some(m => !m.veh))) items.push({ key: 'R', label: 'Tappa ' + n + ': vai al riparo', col: '#b9f59a', desc: DESC.cover, act: () => issueOrder('cover', true, p, g.face) });
    items.push({ key: 'F', label: 'Tappa ' + n + ': assalto', col: '#ff8a6a', desc: DESC.assault, act: () => issueOrder('attack', true, p, g.face, null) });
    return items;
  }
  const ms = sel.flatMap(sq => alive(sq)), inf = ms.some(m => !m.veh), riders = ms.some(m => canRide(m) && !m.inside);
  const onTank = Math.hypot(p.x - tk.x, p.z - tk.z) < tk.rad + 0.9;
  const b = inf && !onTank && !g.tgt ? buildingAt(p.x, p.z) : null;
  const all = f => () => { let any = false; for (const sq of sel) { if (inRadio(sq)) { f(sq); any = true; } else say(sq.name, 'Fuori portata radio: non vi sentiamo.', '#e0a070'); } if (any) sfx('radio'); };
  // iteration 71: the Job skills on order
  const has = k => sel.some(sq => inRadio(sq) && alive(sq).some(m => m.kind === k && !m.inside && !m.rideOn));
  const sendTask = (k, t, msg) => () => { const m = pickDoer(sel, k, p.x, p.z); if (!m) { say('Radio', 'Nessuno libero per farlo, o fuori portata radio.', '#e0a070'); return; } giveTask(m, t(), msg); };
  const fu = g.fu, vfix = onTank ? (tk.hp < tk.maxhp ? tk : null) : fu && fu.veh && fu.hp < fu.maxhp ? fu : null;
  if (vfix) items.push({ key: 'Y', alt: ['C', 'K', 'J'], label: 'Ripara: ' + (vfix === tk ? 'il carro' : UT[vfix.kind].name), col: '#9fd8ff', desc: DESC.fix, off: !has('eng'), act: sendTask('eng', () => ({ k: 'fix', v: vfix }), 'Il geniere va a riparare.') });
  if (fu && !fu.veh && fu.hp < fu.maxhp) items.push({ key: 'Y', alt: ['C', 'K', 'J'], label: 'Cura: ' + UT[fu.kind].name, col: '#7fe07a', desc: DESC.heal, off: !has('medic'), act: sendTask('medic', () => ({ k: 'heal', o: fu }), 'Il medico va da lui.') });
  const pk = !onTank && !g.tgt ? pickupAt(p.x, p.z) : null;
  if (pk) items.push({ key: 'Y', alt: ['C', 'K', 'J'], label: 'Raccogli: ' + (pk.ammo ? 'cassa di munizioni' : pk.loot ? 'cassa' : pk.value + ' rottami'), col: '#ffd36a', desc: DESC.fetch, act: sendTask(null, () => ({ k: 'fetch', p: pk }), 'Lo prendiamo e lo portiamo al carro.') });
  if (!onTank && has('eng')) items.push({ key: 'C', alt: ['Y', 'K', 'J'], label: g.tgt ? 'Granata su: ' + UT[g.tgt.kind].name.toLowerCase() : 'Granata qui', col: '#ffd36a', desc: DESC.nade, act: sendTask('eng', () => ({ k: 'nade', x: g.tgt ? g.tgt.x : p.x, z: g.tgt ? g.tgt.z : p.z }), 'Granata in arrivo!') });
  if (!onTank) { const left = sel.reduce((a, sq) => a + Math.max(0, sq.smokes ?? tune.squad_smokes), 0);
    items.push({ key: 'K', alt: ['Y', 'C', 'J'], label: 'Fumogeno qui (' + left + ')', col: '#cfc8bd', desc: DESC.smoke(), off: !left, act: () => { const sq2 = sel.find(sq => inRadio(sq) && (sq.smokes ?? tune.squad_smokes) > 0); const m = sq2 && pickDoer([sq2], null, p.x, p.z); if (m) giveTask(m, { k: 'smoke', x: p.x, z: p.z }, 'Fumogeno!'); else say('Radio', 'Niente fumogeni, o fuori portata radio.', '#e0a070'); } }); }
  if (!onTank && !g.tgt && (has('eng') || has('mg'))) items.push({ key: 'J', alt: ['K', 'Y', 'C'], label: 'Fortifica qui', col: '#e0c890', desc: DESC.fortify, act: () => issueOrder('fortify', false, p, g.face) });
  if (g.fr && !onTank) { // a unit of ours not among the chosen: escort it (iteration 70)
    const u = g.fr, nm = u.veh ? UT[u.kind].name : u.squad ? u.squad.name : UT[u.kind].name;
    items.push({ key: 'Z', alt: ['J', 'K'], label: 'Scorta: ' + nm, col: '#9fe3a0', desc: DESC.escort, act: all(sq => orderEscort(sq, u)) });
  }
  if (g.tgt) {
    const nm = UT[g.tgt.kind].name.toLowerCase();
    items.push({ key: 'F', label: 'Attacca: ' + nm, col: '#ff8a6a', desc: DESC.attack, act: () => issueOrder('attack', false, p, g.face, g.tgt) });
    items.push({ key: 'G', label: 'Fuoco di soppressione su: ' + nm, col: '#9fd8ff', desc: DESC.suppress, act: () => issueOrder('suppress', false, p, g.face, g.tgt) });
  }
  if (onTank) {
    items.push({ key: 'Z', label: 'Seguimi', desc: DESC.follow, act: all(orderFollow) });
    if (riders && tankStats().seats > 0) items.push({ key: 'B', label: 'Sali a bordo (' + Math.max(0, seatsFree()) + ' posti)', desc: DESC.board, act: () => { let any = false; for (const sq of sel) if (inRadio(sq)) any = orderBoard(sq) || any; if (any) sfx('radio'); } });
  }
  if (b) {
    if (!b.ruined && buildingWalls(b) < b.walls0 * tune.garrison_ruin) b.ruined = true;
    items.push(b.ruined ? { key: 'Y', label: 'Edificio crollato', off: true, desc: 'Troppo distrutto per entrarci.' } : { key: 'Y', label: 'Entra nell\'edificio (' + b.occ.length + '/' + b.cap + ')', col: '#b9f59a', desc: DESC.enter, act: () => issueOrder(null, false, p, null, null) });
  }
  if (!onTank) {
    items.push({ key: 'V', label: g.tgt ? 'Vai lì (senza attaccare)' : 'Vai qui', desc: DESC.move, act: () => issueOrder('move', false, p, g.face) });
    if (!g.tgt) items.push({ key: 'N', label: 'Vai qui senza sparare', col: '#b8b0a0', desc: DESC.nofire, act: () => { if (issueOrder('move', false, p, g.face)) legAll((o, q) => { q.fire = 'none'; }); } });
    if (inf) items.push({ key: 'R', label: 'Vai al riparo qui', col: '#b9f59a', desc: DESC.cover, act: () => issueOrder('cover', false, p, g.face) });
    if (!g.tgt) items.push({ key: 'F', label: 'Assalto fin qui', col: '#ff8a6a', desc: DESC.assault, act: () => issueOrder('attack', false, p, g.face, null) });
    if (inf) items.push({ key: 'T', label: 'Agguato qui', desc: DESC.ambush(), act: () => issueOrder('ambush', false, p, g.face) });
    if (!g.tgt) items.push({ key: 'G', alt: ['C', 'Y', 'K'], label: 'Sorveglia il settore qui', col: '#9fd8ff', desc: DESC.watch(), act: () => issueOrder('watch', false, p, g.face) });
    if (sel.some(sq => sq.order.t === 'move' && !sq.order.done)) items.push({ key: 'K', label: 'Aggiungi tappa al percorso', desc: DESC.stop, act: () => issueOrder('move', true, p, g.face) });
    items.push({ key: 'Z', label: 'Seguimi', desc: DESC.follow, act: all(orderFollow) });
  }
  items.push({ key: 'H', label: 'Fermi qui', desc: DESC.hold, act: all(orderHold) });
  if (!onTank) items.push({ key: 'B', alt: ['C', 'G'], label: 'Ripiega sul carro', col: '#ff9a7a', desc: DESC.retreat, act: all(sq => orderRetreat(sq)) });
  { const cur = roeOf(sel[0]), nx = nextOf(ROES, cur.k), g = gaitOf(sel[0]), ng = nextOf(GAITS, g.k);
    items.push({ key: 'I', keep: true, label: 'Ingaggio: ' + cur.name + ' → ' + nx.name, col: nx.col, desc: nx.name + ': ' + nx.desc, act: () => { for (const sq of sel) setRoe(sq, nx.k); } });
    items.push({ key: 'L', keep: true, label: 'Andatura: ' + g.name + ' → ' + ng.name, col: ng.col, desc: ng.name + ': ' + ng.desc, act: () => { for (const sq of sel) setGait(sq, ng.k); } });
    const fo = formOf(sel[0]), nf = nextOf(FORMS, fo.k), tf = tankForm(), ntf = nextOf(FORMS, tf.k); // iteration 68
    items.push({ key: 'O', keep: true, label: 'Formazione: ' + fo.name + ' → ' + nf.name, col: nf.col, desc: nf.name + ': ' + nf.desc, act: () => { for (const sq of sel) setForm(sq, nf.k); } });
    items.push({ key: 'X', keep: true, label: 'Seguendo il carro: ' + tf.name + ' → ' + ntf.name, col: ntf.col, desc: 'Come si dispongono attorno al carro le squadre col Seguimi (non muove nessuno da sola). ' + ntf.name + ': ' + ntf.desc, act: () => setTankForm(ntf.k) }); }
  const rv = !g.tgt ? rideAt(p) : null; // a transport under the mouse: climb on it (the squad's own too)
  if (rv && ms.some(m => canRide(m) && !m.inside)) items.unshift({ key: 'J', label: 'Sali su ' + UT[rv.kind].name + ' (' + Math.max(0, rideFree(rv)) + ' posti liberi)', col: '#4fe3e0', desc: DESC.ride, off: rideFree(rv) <= 0, act: all(sq => { if (alive(sq).some(m => canRide(m))) orderRide(sq, rv); }) });
  const rodeV = sel.flatMap(sq => alive(sq)).filter(m => seatsOf(m) > 0 && ridersOf(m).length);
  { const inB = ms.some(m => m.garrison), onV = ms.some(m => m.rideOn) || rodeV.length > 0; // U: out of the building, off the vehicle, or both
    if (inB || onV) items.push({ key: 'U', label: inB && onV ? 'Esci e scendi' : inB ? 'Esci dall\'edificio' : 'Scendi dal mezzo', col: '#4fe3e0', desc: inB && !onV ? 'Escono dalla porta e si fermano fuori.' : DESC.getoff, act: all(quickOut) }); }
  if (ms.some(m => m.inside)) items.push({ key: 'B', label: 'Scendi dal mezzo', desc: 'Chi è a bordo scende accanto al carro comando.', act: () => unloadSelected() });
  return items;
}
/** What each order does, shown at the menu's foot under the highlighted row. */
const DESC = {
  nade: 'Il geniere più vicino si avvicina a tiro e lancia una granata lì: le schegge passano coperture e finestre.',
  smoke: () => 'Un soldato lancia un fumogeno lì: per ' + Math.round(tune.smoke_nade_time) + ' s i nemici non vedono attraverso. ' + Math.round(tune.squad_smokes) + ' per squadra a settore.',
  fix: 'Il geniere va accanto al mezzo e lo ripara, lontano dal fuoco e pagando in rottami.',
  heal: 'Il medico va dal ferito e lo cura finché ha bende.',
  fortify: 'La squadra va lì: i genieri mettono sacchi di sabbia, i mitraglieri scavano il nido, verso il nemico o dove trascini.',
  fetch: 'Il soldato più vicino va a prenderlo e lo porta al carro; se cade, resta dove è caduto.',
  retreat: 'Corrono al carro senza fermarsi a sparare e si mettono dietro lo scafo, dal lato lontano dal nemico.',
  watch: () => 'Vanno lì e restano: sparano solo a chi entra nell\'arco di ' + Math.round(tune.watch_arc) + '° (trascina per orientarlo), mirando meglio.',
  escort: 'Restano alle spalle di quell\'unità, nella loro formazione, e la seguono dove va.',
  move: 'Ci vanno per la via più rapida, senza cercare riparo; in marcia sparano secondo le regole d\'ingaggio.',
  cover: 'Ci vanno e si mettono dietro la copertura migliore lì vicino, rivolti verso la freccia trascinata o verso il nemico.',
  assault: 'Avanzano fin qui sparando a ciò che incontrano, senza fermarsi né cercare riparo. Rapido ma esposto.',
  ambush: () => 'Si appostano al coperto e restano nascosti (il nemico li vede solo entro ' + tune.ambush_reveal + ' m). Aprono il fuoco tutti insieme quando il nemico arriva a ' + Math.round(tune.ambush_trigger * 100) + '% della loro portata, con mira migliore per 4 s.',
  stop: 'La squadra ci passa dopo l\'ultima tappa del percorso (anche Shift + click destro).',
  nofire: 'Ci vanno senza sparare un colpo, qualunque siano le regole d\'ingaggio: per passare senza farsi notare. Arrivati, tornano alle regole d\'ingaggio.',
  legSupp: 'Mentre percorrono il tratto verso l\'ultima tappa tracciata tengono il nemico sotto fuoco di soppressione (anche senza vederlo, se a tiro).',
  final: 'Arrivati all\'ultima tappa si fermano lì, rivolti al nemico, e gli sparano finché cade; poi tornano alle regole d\'ingaggio e ingaggiano il prossimo.',
  both: 'Soppressione sul nemico lungo il tratto verso l\'ultima tappa, poi fermi lì a sparargli finché cade.',
  follow: 'Seguono il carro comando restandogli dietro; se ingaggiati si fermano a combattere al riparo.',
  hold: 'Si fermano dove sono e sparano secondo le regole d\'ingaggio.',
  attack: 'Si avvicinano finché il bersaglio è a tiro e in vista, poi gli sparano anche se le regole d\'ingaggio dicono di non sparare. Abbattuto, si fermano.',
  suppress: 'Se serve si portano appena a tiro, poi restano lì e tengono il bersaglio sotto fuoco continuo, anche senza vederlo: ogni colpo, a segno o no, lo sopprime (mira e passo peggiori). Abbattuto, smettono.',
  board: 'La fanteria sale nel carro comando: viaggia al sicuro e scende dove serve.',
  ride: 'La fanteria raggiunge il mezzo (jeep, half track) e sale finché ci sono posti. A bordo va dove va il mezzo e spara con le sue armi dai finestrini, meno precisa in corsa. Sul mezzo della sua squadra, gli ordini alla squadra li porta il mezzo.',
  getoff: 'Chi è a bordo scende accanto al mezzo e si ferma lì.',
  enter: 'Entrano e sparano dalle finestre: l\'edificio li protegge finché non crolla.',
};
/** Opens the menu at the mouse for the order gesture g (its point, its dragged bearing, its enemy). */
/** The menu's letters (iteration 70): each row the first of its wishes (key, then alt) not taken above it and not W A S D Q E P M. */
function menuKeys(items) {
  const used = new Set('WASDQEPM'.split(''));
  for (const it of items) { const k = [it.key, ...(it.alt || [])].find(c => c && !used.has(c)); it.key = k || ''; if (k) used.add(k); }
  return items;
}
function openMenu(g, append) {
  const items = menuKeys(menuItems(g, append)); if (!items.length) return;
  // the foot: what the highlighted order does, as tall as the longest explanation needs
  const lines = Math.max(2, ...items.map(it => it.desc ? wrap(it.desc, MENU.w - 24, 11).length : 1)), foot = MENU.foot + (lines - 2) * 13;
  const h = MENU.head + items.length * MENU.row + MENU.pad + foot;
  const x = Math.min(MS.x + 6, W - MENU.w - 8), y = Math.max(8, Math.min(MS.y + 6, H - h - 8));
  const n = selectedSquads().length;
  state.menu = { g, append, x, y, h, foot, lines, items, p: g.p, face: g.face, title: append && g.tgt && g.tgt.alive ? 'Percorso → ' + UT[g.tgt.kind].name.toLowerCase() : (append ? 'Percorso · ' : '') + (n > 1 ? n + ' squadre' : selectedSquads()[0].name), sel: -1, mx: MS.x, my: MS.y };
}
/** The next order row that can be picked from row k, going dir (1 down, -1 up), wrapping round. */
function menuStep(m, k, dir) {
  for (let s = 1; s <= m.items.length; s++) { const j = ((k < 0 && dir < 0 ? 0 : k) + dir * s + m.items.length * 2) % m.items.length; if (!m.items[j].off && m.items[j].act) return j; }
  return -1;
}
/** Which menu row is under the mouse (-1: none). */
function menuHover() {
  const m = state.menu; if (!m) return -1;
  if (MS.x < m.x || MS.x > m.x + MENU.w || MS.y < m.y + MENU.head) return -1;
  const k = Math.floor((MS.y - m.y - MENU.head) / MENU.row); return k >= 0 && k < m.items.length ? k : -1;
}
/**
 * The menu's input: a click on a row or its letter sends the order; Tab (Shift+Tab back) or the arrows move the
 * highlighted row and Enter or Space sends it; the mouse moving over a row highlights it; Esc or a click outside closes it.
 */
function menuInput() {
  const m = state.menu; let pick = null;
  if (MS.x !== m.mx || MS.y !== m.my) { m.mx = MS.x; m.my = MS.y; const k = menuHover(); if (k >= 0 && !m.items[k].off) m.sel = k; }
  const back = down.has('ShiftLeft') || down.has('ShiftRight');
  if (pressed('Tab')) m.sel = menuStep(m, m.sel, back ? -1 : 1);
  if (pressed('ArrowDown')) m.sel = menuStep(m, m.sel, 1);
  if (pressed('ArrowUp')) m.sel = menuStep(m, m.sel, -1);
  if ((pressed('Enter') || pressed('NumpadEnter') || pressed('Space')) && m.sel >= 0) pick = m.items[m.sel];
  for (const it of m.items) if (!pick && !it.off && it.act && it.key && pressed('Key' + it.key)) { pick = it; break; }
  if (!pick && MS.lp) {
    const k = menuHover(); MS.lp = false; MS.drag = null; state.menuBlock = true; // this click is the menu's, not the cannon's
    if (k < 0) { if (!(MS.x >= m.x && MS.x <= m.x + MENU.w && MS.y >= m.y && MS.y <= m.y + m.h)) state.menu = null; return; }
    pick = m.items[k];
  }
  if (MS.lr) MS.lr = false;
  if (pressed('Escape')) { state.menu = null; return; }
  if (pick && !pick.off && pick.act) {
    if (pick.keep) { pick.act(); const k = m.items.indexOf(pick); m.items = menuKeys(menuItems(m.g, m.append)); m.sel = Math.min(k, m.items.length - 1); return; } // a setting: the next one, and the menu stays
    state.menu = null; pick.act();
  }
}
/** The order the next click gives, armed with a hotkey (V, F, R, T: iteration 69). */
const ARM = { move: 'VAI', attack: 'ATTACCA / ASSALTO', cover: 'AL RIPARO', ambush: 'AGGUATO' };
/** WASD (or the arrows) slide the view over the map, at a speed that follows the zoom. */
function panCamera(dt) {
  const ax = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0) - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
  const az = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0) - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
  const v = tune.pause_pan * cam.dist / 84 * dt, sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
  cam.x += (cy * ax - sy * az) * v; cam.z += (-sy * ax - cy * az) * v;
  cam.x = Math.max(0, Math.min(world.N, cam.x)); cam.z = Math.max(0, Math.min(world.N, cam.z));
  cam.y += (Math.min(40, hAt(cam.x, cam.z)) - cam.y) * Math.min(1, dt * 3);
}
/**
 * Space: the tactical pause (Comando mode), the one place orders are given. Time stops; the squads are
 * picked and told what to do, the view moves with WASD; the orders start the moment play resumes.
 */
function setTacticalPause(on) {
  state.tpause = on; state.mode = on ? 'cmd' : 'tank'; state.arm = null; MS.drag = null; state.gest = null;
  if (!on) { state.menu = null; state.dragSoldier = null; }
  const before = state.pauseOrders || new Map(), n = on ? 0 : state.squads.filter(sq => before.has(sq) && before.get(sq) !== sq.order).length;
  state.pauseOrders = on ? new Map(state.squads.map(sq => [sq, sq.order])) : null; // to tell at the resume who got new orders
  say('Radio', on ? 'Pausa tattica: scegli le squadre e dai gli ordini; partono quando riprendi (Spazio).' : n ? 'Ordini ricevuti, si parte!' : 'Si riprende.', '#ffd27a');
}
function enemyUnderMouse() {
  let best = null, bd = 26 * 26;
  for (const e of state.ents) {
    if (!e.alive || e.team !== 1 || hiddenFoe(e)) continue;
    const p = toScreen(e.x, e.y + 1, e.z); if (!p.on) continue;
    const d = (p.x - MS.x) ** 2 + (p.y - MS.y) ** 2; if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function friendlyUnderMouse() {
  let best = null, bd = 24 * 24;
  for (const e of state.ents) {
    if (!e.alive || !e.squad || e.inside) continue;
    const p = toScreen(e.x, e.y + 1, e.z); if (!p.on) continue;
    const d = (p.x - MS.x) ** 2 + (p.y - MS.y) ** 2; if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function selectSquad(sq, add) {
  if (!add) for (const s of state.squads) s.selected = false;
  if (!sq) return;
  if (!alive(sq).length) { say('Radio', sq.name + ': nessuno risponde.', '#e0a070'); return; }
  if (!inRadio(sq)) { say(sq.name, 'Fuori portata radio.', '#e0a070'); sq.selected = false; return; }
  sq.selected = true; sfx('radio');
}
