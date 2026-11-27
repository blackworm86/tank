// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The order menu: right-click shows the orders that fit what is under the mouse. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The order menu: right-click shows the orders that fit what is under the mouse ---------------------
/** Menu layout, shared by the drawing and the mouse. */
const MENU = { w: 250, row: 26, head: 26, pad: 6 };
/** Every order the selected squads can take at the clicked point (an enemy, a building, the own vehicle, open ground). */
function menuItems(g, append) {
  const sel = selectedSquads(), tk = state.tank, p = g.p, items = [];
  if (append) { // a stop on the drawn path: how to get there
    const n = Math.max(1, ...sel.map(sq => sq.order.t === 'move' && !sq.order.done && sq.order.pts ? sq.order.pts.length - (sq.order.i || 0) + 1 : 1));
    items.push({ key: 'V', label: 'Tappa ' + n + ': vai', act: () => issueOrder('move', true, p, g.face) });
    if (sel.some(sq => alive(sq).some(m => !m.veh))) items.push({ key: 'C', label: 'Tappa ' + n + ': al riparo', col: '#b9f59a', act: () => issueOrder('cover', true, p, g.face) });
    items.push({ key: 'F', label: 'Tappa ' + n + ': avanza all\'attacco', col: '#ff8a6a', act: () => issueOrder('attack', true, p, g.face, null) });
    return items;
  }
  const ms = sel.flatMap(sq => alive(sq)), inf = ms.some(m => !m.veh && m.kind !== 'at'), riders = ms.some(m => canRide(m) && !m.inside);
  const onTank = Math.hypot(p.x - tk.x, p.z - tk.z) < tk.rad + 0.9;
  const b = inf && !onTank && !g.tgt ? buildingAt(p.x, p.z) : null;
  const all = f => () => { let any = false; for (const sq of sel) { if (inRadio(sq)) { f(sq); any = true; } else say(sq.name, 'Fuori portata radio: non vi sentiamo.', '#e0a070'); } if (any) sfx('radio'); };
  if (g.tgt) items.push({ key: 'F', label: 'Attacca: ' + UT[g.tgt.kind].name.toLowerCase(), col: '#ff8a6a', act: () => issueOrder('attack', false, p, g.face, g.tgt) });
  if (onTank) {
    items.push({ key: 'G', label: 'Seguimi', act: all(orderFollow) });
    if (riders && tankStats().seats > 0) items.push({ key: 'B', label: 'Sali a bordo (' + Math.max(0, seatsFree()) + ' posti)', act: () => { let any = false; for (const sq of sel) if (inRadio(sq)) any = orderBoard(sq) || any; if (any) sfx('radio'); } });
  }
  if (b) {
    if (!b.ruined && buildingWalls(b) < b.walls0 * tune.garrison_ruin) b.ruined = true;
    items.push(b.ruined ? { key: 'E', label: 'Edificio crollato', off: true } : { key: 'E', label: 'Entra nell\'edificio (' + b.occ.length + '/' + b.cap + ')', col: '#b9f59a', act: () => issueOrder(null, false, p, null, null) });
  }
  if (!onTank) {
    items.push({ key: 'V', label: g.tgt ? 'Vai lì (senza attaccare)' : 'Vai qui', act: () => issueOrder('move', false, p, g.face) });
    if (inf) items.push({ key: 'C', label: 'Al riparo qui', col: '#b9f59a', act: () => issueOrder('cover', false, p, g.face) });
    if (!g.tgt) items.push({ key: 'F', label: 'Avanza all\'attacco', col: '#ff8a6a', act: () => issueOrder('attack', false, p, g.face, null) });
    if (inf) items.push({ key: 'R', label: 'Imboscata qui', act: () => issueOrder('ambush', false, p, g.face) });
    if (sel.some(sq => sq.order.t === 'move' && !sq.order.done)) items.push({ key: 'T', label: 'Aggiungi tappa al percorso', act: () => issueOrder('move', true, p, g.face) });
    items.push({ key: 'G', label: 'Seguimi', act: all(orderFollow) });
  }
  items.push({ key: 'Z', label: 'Fermi dove siete', act: all(orderHold) });
  { const cur = postureOf(sel[0]), nx = POSTURES[(POSTURES.findIndex(q => q.k === cur.k) + 1) % POSTURES.length];
    items.push({ key: 'Q', label: 'Atteggiamento: ' + cur.name + ' → ' + nx.name, col: nx.col, act: () => { for (const sq of sel) setPosture(sq, nx.k); } }); }
  if (ms.some(m => m.garrison)) items.push({ key: 'X', label: 'Esci dall\'edificio', act: all(sq => { leaveBuilding(sq); sq.order = { t: 'hold' }; say(sq.name, 'Usciamo!'); }) });
  if (ms.some(m => m.inside)) items.push({ key: 'B', label: 'Scendi dal mezzo', act: () => unloadSelected() });
  return items;
}
/** Opens the menu at the mouse for the order gesture g (its point, its dragged bearing, its enemy). */
function openMenu(g, append) {
  const items = menuItems(g, append); if (!items.length) return;
  const h = MENU.head + items.length * MENU.row + MENU.pad;
  const x = Math.min(MS.x + 6, W - MENU.w - 8), y = Math.max(8, Math.min(MS.y + 6, H - h - 8));
  const n = selectedSquads().length;
  state.menu = { x, y, h, items, p: g.p, face: g.face, title: (append ? 'Percorso · ' : '') + (n > 1 ? n + ' squadre' : selectedSquads()[0].name), sel: -1, mx: MS.x, my: MS.y };
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
  for (const it of m.items) if (!pick && !it.off && it.act && pressed('Key' + it.key)) { pick = it; break; }
  if (!pick && MS.lp) {
    const k = menuHover(); MS.lp = false; MS.drag = null; state.menuBlock = true; // this click is the menu's, not the cannon's
    if (k < 0) { if (!(MS.x >= m.x && MS.x <= m.x + MENU.w && MS.y >= m.y && MS.y <= m.y + m.h)) state.menu = null; return; }
    pick = m.items[k];
  }
  if (MS.lr) MS.lr = false;
  if (pressed('Escape')) { state.menu = null; return; }
  if (pick && !pick.off && pick.act) { state.menu = null; pick.act(); }
}
/** The order the next click gives, armed with a hotkey (V, F, C). */
const ARM = { move: 'VAI', attack: 'ATTACCA', cover: 'COPERTURA', ambush: 'IMBOSCATA' };
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
 * Space or Tab: the tactical pause, the one place orders are given. Time stops; the squads are
 * picked and told what to do, the view moves with WASD; the orders start the moment play resumes.
 */
function setTacticalPause(on) {
  state.tpause = on; state.mode = on ? 'cmd' : 'tank'; state.arm = null; MS.drag = null; state.gest = null;
  if (!on) { state.menu = null; state.dragSoldier = null; }
  const before = state.pauseOrders || new Map(), n = on ? 0 : state.squads.filter(sq => before.has(sq) && before.get(sq) !== sq.order).length;
  state.pauseOrders = on ? new Map(state.squads.map(sq => [sq, sq.order])) : null; // to tell at the resume who got new orders
  say('Radio', on ? 'Pausa tattica: scegli le squadre e dai gli ordini; partono quando riprendi (Spazio o Tab).' : n ? 'Ordini ricevuti, si parte!' : 'Si riprende.', '#ffd27a');
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
