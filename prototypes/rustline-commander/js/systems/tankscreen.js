// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-28
// The vehicle screen (iteration 72): the command vehicle seen from above with its 9 standard systems around it,
// the main weapon and its rounds on the left, the advanced slots on the right and a detail card for whatever the
// mouse is on. In the field (K) it pauses the game and only shows; in the workshop it is the "Mezzo" tab, where
// the same screen buys and mounts. Every line wraps; nothing is cut and no text is under 13 px.
'use strict';

/** What each standard system changes, as [label, value(stats)] rows (the detail card shows now → next level). */
const STD_ROWS = {
  turret: [['Brandeggio', s => Math.round(s.turret) + '°/s']],
  stab: [['Dispersione in moto', s => 'x' + s.moveSpread.toFixed(2)], ['Tempo di mira', s => 'x' + s.aim.toFixed(2)]],
  gun: [['Ricarica', s => s.reload.toFixed(2) + ' s'], ['Danno', s => Math.round(s.dmg)], ['Dispersione', s => 'x' + (s.fireSpread / tune.spread_fire).toFixed(2)]],
  coax: [['Calore sopportato', s => 'x' + s.mgHeat.toFixed(2)], ['Cadenza', s => 'x' + (1 / s.mgRate).toFixed(2)]],
  armor: [['Danni frontali', () => '-' + Math.round((1 - armorTake('front')) * 100) + '%'], ['Integrità', s => Math.round(s.hp)]],
  engine: [['Velocità', s => s.speed.toFixed(1) + ' m/s'], ['Accelerazione', s => s.accel.toFixed(1)]],
  tracks: [['Rotazione', s => Math.round(s.turn) + '°/s'], ['Sale gradini fino a', s => s.climb.toFixed(2) + ' m']],
  bay: [['Posti a bordo', s => String(s.seats)]],
  radio: [['Raggio radio', s => Math.round(s.radio) + ' m']],
};
/** Which side of the hull drawing each standard system's box sits on. */
const STD_LEFT = ['turret', 'stab', 'gun', 'coax', 'radio'], STD_RIGHT = ['armor', 'engine', 'tracks', 'bay'];

/** Rows of [label, now, next] for standard system id (next null at the top level). */
function stdPreview(id) {
  const rows = STD_ROWS[id] || [], now = rows.map(r => r[1](tankStats()));
  if (lvl(id) >= stdMax()) return rows.map((r, i) => [r[0], now[i], null]);
  let nx;
  state.lv[id] = lvl(id) + 1; state.stats = null;
  try { nx = rows.map(r => r[1](tankStats())); } finally { state.lv[id]--; state.stats = null; }
  return rows.map((r, i) => [r[0], now[i], nx[i]]);
}

// ---- Hover zones: the detail card shows the last zone under the mouse -------------------------------------
const TSZ = { hot: null };
function tsZone(x, y, w, h, item) { if (MS.x >= x && MS.x <= x + w && MS.y >= y && MS.y <= y + h) TSZ.hot = item; return TSZ.hot === item; }

/**
 * The screen's content between x0 and x0+w, from cy down to bottom. live: the workshop (buttons buy and mount);
 * false in the field (it only shows).
 */
function drawTankPanel(x0, w, cy, bottom, live) {
  TSZ.hot = null;
  const L = { x: x0 + 24, w: 250 }, R = { x: x0 + w - 24 - 250, w: 250 };
  const C = { x: L.x + L.w + 20, w: R.x - 20 - (L.x + L.w + 20) };
  const detH = 122, mainB = bottom - detH - 10;
  drawWeaponCol(L, cy, mainB, live);
  drawSysCol(R, cy, mainB, live);
  if (live && state.tsPick) drawPick(C, cy, mainB);
  else drawHullCol(C, cy, mainB, live);
  drawDetail(x0 + 24, bottom - detH, w - 48, detH, live);
}

// ---- Left: the main weapon and its rounds ------------------------------------------------------------------
function drawWeaponCol(L, cy, mainB, live) {
  const W0 = WEAPONS[state.weapon];
  text('Arma principale', L.x, cy + 8, 16, '#ffd9a0', 'left');
  const wy = cy + 22, desc = wrap(W0.desc, L.w - 20, 13).slice(0, 3), wh = 34 + desc.length * 16;
  const hot = tsZone(L.x, wy, L.w, wh, 'w:' + state.weapon);
  rrect(L.x, wy, L.w, wh, 5, hot ? 'rgba(120,70,40,0.45)' : 'rgba(0,0,0,0.3)', '#8a6a40');
  partIcon('cannon', L.x + 18, wy + 16, 20);
  text(W0.name, L.x + 34, wy + 16, 15, HC.text, 'left');
  desc.forEach((l, k) => text(l, L.x + 10, wy + 38 + k * 16, 13, HC.dim, 'left'));
  let y = wy + wh + 8;
  if (live) { button(L.x, y, L.w, 26, state.tsPick === 'weapon' ? 'Chiudi la scelta' : 'Cambia arma', () => { state.tsPick = state.tsPick === 'weapon' ? null : 'weapon'; }, { size: 14, active: state.tsPick === 'weapon' }); y += 34; }
  const am = ammoMax(), tot = ammoTotal();
  text('Colpi', L.x, y + 8, 16, '#ffd9a0', 'left');
  if (!am) { wrap('Questa arma non usa colpi contati.', L.w, 13).forEach((l, k) => text(l, L.x, y + 30 + k * 16, 13, HC.dim, 'left')); return; }
  text(tot + ' / ' + am, L.x + L.w, y + 8, 14, '#ffe08a', 'right');
  bar(L.x, y + 18, L.w, 6, tot / am, '#ffe08a'); y += 30;
  const room = am - tot, rh = Math.min(46, Math.floor((mainB - y) / SHELL_IDS.length));
  SHELL_IDS.forEach((k, r) => {
    const S0 = SHELLS[k], yy = y + r * rh, c = shellCost(k), on = state.shell === k;
    const hot2 = tsZone(L.x, yy, L.w, rh - 4, 's:' + k);
    rrect(L.x, yy, L.w, rh - 4, 4, on ? 'rgba(255,224,138,0.12)' : hot2 ? 'rgba(120,70,40,0.4)' : 'rgba(0,0,0,0.3)', on ? '#ffe08a' : '#5a4030');
    text(S0.short + '  ' + S0.name, L.x + 10, yy + 12, 14, HC.text, 'left');
    text(String(state.ammo[k] || 0), L.x + L.w - 10, yy + 12, 15, '#ffe08a', 'right');
    if (live) {
      const n5 = Math.min(5, Math.max(0, room));
      button(L.x + 8, yy + 22, 96, 18, '+5 (' + n5 * c + ')', () => buyAmmo(k, 5), { off: room <= 0 || state.scrap < c, size: 13 });
      button(L.x + 110, yy + 22, L.w - 118, 18, 'Riempi (' + Math.max(0, room) * c + ')', () => buyAmmo(k, 0), { off: room <= 0 || state.scrap < c, size: 13 });
    } else text('Mezzi x' + shellK(k, 'veh') + ' · Fanteria x' + shellK(k, 'inf'), L.x + 10, yy + 30, 13, HC.dim, 'left');
  });
}

// ---- Middle: the hull from above with the 9 standard systems around it ---------------------------------------
function drawHullCol(C, cy, mainB, live) {
  text('Sistemi standard · ' + stdMax() + ' livelli', C.x + C.w / 2, cy + 8, 16, '#ffd9a0');
  const bw = 160, top = cy + 22, n = STD_LEFT.length, step = Math.floor((mainB - top) / n), bh = Math.min(64, step - 6);
  const hx0 = C.x + bw + 14, hx1 = C.x + C.w - bw - 14, hw = hx1 - hx0, mid = (hx0 + hx1) / 2;
  // the drawing: tracks, hull, turret, barrel, antenna
  const hh = Math.min(mainB - top - 60, hw * 2.1), ht = top + 40 + Math.max(0, (mainB - top - 50 - hh) / 2), hb = ht + hh;
  ctx.fillStyle = '#2a201a'; ctx.fillRect(hx0 + 2, ht, hw * 0.2, hh); ctx.fillRect(hx1 - 2 - hw * 0.2, ht, hw * 0.2, hh);
  ctx.strokeStyle = '#4a3a2e'; ctx.lineWidth = 1;
  for (let yy = ht + 6; yy < hb; yy += 10) { ctx.beginPath(); ctx.moveTo(hx0 + 2, yy); ctx.lineTo(hx0 + 2 + hw * 0.2, yy); ctx.moveTo(hx1 - 2 - hw * 0.2, yy); ctx.lineTo(hx1 - 2, yy); ctx.stroke(); }
  rrect(hx0 + hw * 0.16, ht + 8, hw * 0.68, hh - 16, 8, '#5e5034', '#8a7650');
  const tx = mid, ty = ht + hh * 0.42, tr = hw * 0.26;
  ctx.fillStyle = '#6e5e3c'; ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a7650'; ctx.fillRect(tx - 4, top + 4, 8, ty - tr - top - 2);
  ctx.fillStyle = '#4a4030'; ctx.fillRect(tx + 7, ty - tr - 22, 4, 22);
  const ax = hx0 + hw * 0.27, ay = hb - 30; ctx.strokeStyle = '#c8b48a'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - 26); ctx.stroke();
  // where each system sits on the drawing
  const AT = {
    turret: [tx, ty], stab: [tx - tr * 0.6, ty + tr * 0.4], gun: [tx, top + 14], coax: [tx + 9, ty - tr - 14], radio: [ax, ay - 20],
    armor: [mid + hw * 0.2, ht + 14], engine: [mid + hw * 0.15, hb - 18], tracks: [hx1 - 2 - hw * 0.1, ht + hh * 0.5], bay: [mid + hw * 0.05, ty + tr + (hb - ty - tr) * 0.4],
  };
  const box = (id, x, y, left) => {
    const S = STD[id], l = lvl(id), c = stdCost(id), hot = tsZone(x, y, bw, bh, 'std:' + id);
    const [px, py] = AT[id], ex = left ? x + bw : x;
    ctx.strokeStyle = hot ? '#ffe08a' : l ? 'rgba(255,211,106,0.55)' : 'rgba(200,180,140,0.25)'; ctx.lineWidth = hot ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(ex, y + bh / 2); ctx.lineTo(px, py); ctx.stroke();
    ctx.fillStyle = hot ? '#ffe08a' : '#d8c6a4'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
    rrect(x, y, bw, bh, 5, hot ? 'rgba(120,70,40,0.6)' : 'rgba(20,14,10,0.85)', l ? '#c8a050' : '#5a4030');
    partIcon(S.icon, x + 16, y + 14, 18);
    text(S.short, x + 30, y + 14, 14, HC.text, 'left');
    for (let i = 0; i < stdMax(); i++) rrect(x + 10 + i * 18, y + 27, 14, 8, 2, i < l ? '#ffd36a' : 'rgba(255,255,255,0.08)', '#8a6a40');
    text('liv. ' + l + '/' + stdMax(), x + bw - 8, y + 31, 13, l ? '#ffd36a' : HC.dim, 'right');
    if (c == null) text('Al massimo', x + 10, y + bh - 13, 13, '#b6d77a', 'left');
    else if (live) button(x + 6, y + bh - 22, bw - 12 - (state.sandbox ? 28 : 0), 18, 'Migliora (' + (state.sandbox ? 'gratis' : c) + ')', () => upgradeStd(id), { off: state.scrap < c, size: 13 });
    else text('Prossimo: ' + c + ' rottami', x + 10, y + bh - 13, 13, HC.dim, 'left');
    if (live && state.sandbox && l > 0) button(x + bw - 30, y + bh - 22, 24, 18, '−', () => lowerStd(id), { size: 14 });
  };
  STD_LEFT.forEach((id, i) => box(id, C.x, top + i * step, true));
  STD_RIGHT.forEach((id, i) => box(id, C.x + C.w - bw, top + Math.round((i + 0.5) * step * n / STD_RIGHT.length - step / 2), false));
}

// ---- Right: the advanced slots -------------------------------------------------------------------------
function drawSysCol(R, cy, mainB, live) {
  const n = sysSlots();
  text('Sistemi avanzati', R.x, cy + 8, 16, '#ffd9a0', 'left'); text(state.systems.length + ' / ' + n, R.x + R.w, cy + 8, 14, HC.gold, 'right');
  const sh = 52;
  for (let i = 0; i < n; i++) {
    const y = cy + 22 + i * (sh + 6), id = state.systems[i];
    if (!id) {
      rrect(R.x, y, R.w, sh, 5, 'rgba(0,0,0,0.2)', '#3a2a20');
      text('Slot libero', R.x + 10, y + 16, 14, '#8a7a66', 'left');
      if (live) button(R.x + 8, y + 28, R.w - 16, 18, 'Monta o compra un sistema', () => { state.tsPick = 'system'; }, { size: 13 });
      continue;
    }
    const S0 = SYSTEMS[id], k = S0.active && sysKey(id), hot = tsZone(R.x, y, R.w, sh, 'sys:' + id);
    rrect(R.x, y, R.w, sh, 5, hot ? 'rgba(120,70,40,0.5)' : 'rgba(0,0,0,0.3)', S0.active ? '#8fe0ff' : '#8a6a40');
    text(S0.name, R.x + 10, y + 15, 14, S0.active ? '#eaf7ff' : HC.text, 'left');
    text(S0.active ? 'Attivo · tasto ' + (k ? k.slice(3) : '-') : 'Passivo', R.x + 10, y + 36, 13, S0.active ? '#9fd8ff' : HC.dim, 'left');
    if (live) button(R.x + R.w - 74, y + 27, 66, 18, 'Smonta', () => unmountSystem(id), { size: 13 });
  }
  const y = cy + 22 + n * (sh + 6) + 4, store = state.owned.filter(id => !modOn(id)).length;
  if (live) button(R.x, y, R.w, 26, state.tsPick === 'system' ? 'Chiudi la scelta' : 'Magazzino (' + store + ') e vendita', () => { state.tsPick = state.tsPick === 'system' ? null : 'system'; }, { size: 14, active: state.tsPick === 'system' });
  else wrap('Si comprano e si montano in officina. ' + (store ? store + ' in magazzino.' : ''), R.w, 13).forEach((l, k) => text(l, R.x, y + 10 + k * 16, 13, HC.dim, 'left'));
}

// ---- The choice (workshop): main weapons, or the store and this garage's stock --------------------------------
function drawPick(C, cy, mainB) {
  rrect(C.x, cy, C.w, mainB - cy, 6, 'rgba(20,14,10,0.92)', '#8a6a40');
  const wpn = state.tsPick === 'weapon';
  text(wpn ? 'Scegli l\'arma principale' : 'Sistemi avanzati: magazzino e vendita', C.x + 14, cy + 16, 16, '#ffd9a0', 'left');
  button(C.x + C.w - 104, cy + 6, 96, 22, 'Indietro', () => { state.tsPick = null; }, { size: 13 });
  const items = [];
  if (wpn) weaponIds().forEach(id => {
    const own = state.weaponsOwned.includes(id), eq = state.weapon === id, c = WEAPONS[id].cost;
    items.push({ key: 'w:' + id, name: WEAPONS[id].name, line: eq ? 'Montata' : own ? 'Tua: click per montare' : state.sandbox ? 'Prendi e monta (gratis)' : 'Compra e monta: ' + c + ' rottami', col: eq ? '#b6d77a' : own ? HC.text : HC.gold, off: !own && state.scrap < c, active: eq, fn: () => { equipWeapon(id); if (state.weapon === id) state.tsPick = null; } });
  });
  else {
    const free = state.systems.length < sysSlots();
    state.owned.filter(id => !modOn(id)).forEach(id => items.push({ key: 'sys:' + id, name: SYSTEMS[id].name, line: free ? 'In magazzino: click per montare' : 'In magazzino (nessuno slot libero)', col: HC.text, off: !free, fn: () => { mountSystem(id); if (state.systems.length >= sysSlots()) state.tsPick = null; } }));
    (state.sandbox ? systemIds().filter(id => !state.owned.includes(id)) : garageStock(state.shopSite)).forEach(id => items.push({ key: 'sys:' + id, name: SYSTEMS[id].name, line: state.sandbox ? 'Prendi (gratis)' : 'Compra: ' + systemCost(id) + ' rottami', col: HC.gold, off: state.scrap < systemCost(id), fn: () => buySystem(id) }));
    if (!items.length) wrap('Niente in magazzino e niente in vendita in questa officina.', C.w - 28, 13).forEach((l, k) => text(l, C.x + 14, cy + 50 + k * 16, 13, HC.dim, 'left'));
  }
  const many = items.length > 10, cw = Math.floor((C.w - 38) / 2), ch = many ? 40 : 52, gap = many ? 6 : 8, rows = Math.max(1, Math.floor((mainB - cy - 44) / (ch + gap)));
  items.slice(0, rows * 2).forEach((it, i) => {
    const x = C.x + 14 + (i % 2) * (cw + 10), y = cy + 38 + Math.floor(i / 2) * (ch + gap);
    button(x, y, cw, ch, '', it.fn, { off: it.off, active: it.active });
    tsZone(x, y, cw, ch, it.key);
    wrap(it.name, cw - 16, 14).slice(0, 1).forEach(l => text(l, x + 8, y + (many ? 12 : 16), 14, HC.text, 'left'));
    text(it.line, x + 8, y + (many ? 29 : 37), 13, it.off ? '#9a8a78' : it.col, 'left');
  });
}

// ---- Bottom: the detail of what the mouse is on, and the vehicle's numbers ---------------------------------
function drawDetail(x, y, w, h, live) {
  rrect(x, y, w, h, 6, 'rgba(14,10,8,0.85)', '#7a5a40');
  const sw = 300, dw = w - sw - 30, it = TSZ.hot, L = [];
  let title = '', desc = '', foot = '', footCol = HC.dim;
  if (!it) { title = 'Dettagli'; desc = 'Passa il mouse su un sistema, sull\'arma, su un colpo o su uno slot per vedere cosa fa' + (live ? ' e quanto costa.' : '.'); }
  else if (it.startsWith('std:')) {
    const id = it.slice(4), S = STD[id], c = stdCost(id);
    title = S.name + ' · livello ' + lvl(id) + '/' + stdMax(); desc = S.desc;
    stdPreview(id).forEach(([k, a, b]) => L.push(k + ': ' + a + (b != null ? '  →  ' + b : '')));
    foot = c == null ? 'Al livello massimo.' : state.sandbox ? 'Prova: i livelli salgono e scendono gratis (− abbassa).' : 'Prossimo livello: ' + c + ' rottami' + (live ? '' : ' (in officina)'); footCol = c == null ? '#b6d77a' : HC.gold;
  } else if (it.startsWith('w:')) {
    const id = it.slice(2), W0 = WEAPONS[id], st = weaponStats(id);
    title = W0.name + (state.weapon === id ? ' · montata' : ''); desc = W0.desc;
    L.push('Danno ' + Math.round(st.dmg) + ' · ' + (st.kind === 'bullet' ? 'un colpo ogni ' + st.reload.toFixed(2) + ' s' : 'ricarica ' + st.reload.toFixed(1) + ' s') + (st.ammo ? ' · ' + st.ammo + ' colpi' : ' · colpi infiniti') + (st.weight ? ' · pesa (meno velocità)' : ''));
    if (!state.weaponsOwned.includes(id) && !state.sandbox) { foot = 'Costa ' + W0.cost + ' rottami (poi si cambia gratis).'; footCol = HC.gold; }
  } else if (it.startsWith('s:')) {
    const k = it.slice(2), S0 = SHELLS[k];
    title = S0.short + ' · ' + S0.name + (state.shell === k ? ' · caricato' : ''); desc = S0.desc;
    L.push('Danno: fanteria x' + shellK(k, 'inf') + ' · mezzi x' + shellK(k, 'veh') + ' · scoppio sugli uomini x' + shellK(k, 'unit'));
    L.push('Muri x' + shellK(k, 'bld') + ' · cratere nel terreno x' + shellK(k, 'ground') + (k === 'frag' ? ' · i ripari leggeri non fermano le schegge' : k === 'ap' ? ' · trapassa i muri' : k === 'inc' ? ' · incendia ciò che brucia' : ''));
    foot = 'Un colpo: ' + shellCost(k) + ' rottami. In marcia Tab cambia il tipo caricato.';
  } else if (it.startsWith('sys:')) {
    const id = it.slice(4), S0 = SYSTEMS[id], k = S0.active && sysKey(id);
    title = S0.name; desc = S0.desc;
    L.push(S0.active ? (k ? 'Si usa col tasto ' + k.slice(3) + ', poi si ricarica.' : 'Montato prende uno dei tasti R T F G V B.') : 'Lavora da solo finché è montato.');
    if (!state.owned.includes(id) && !state.sandbox) { foot = 'Costa ' + systemCost(id) + ' rottami.'; footCol = HC.gold; }
  }
  text(title, x + 14, y + 16, 16, '#ffd9a0', 'left');
  const dl = wrap(desc, dw, 13).slice(0, 2);
  dl.forEach((l, k) => text(l, x + 14, y + 36 + k * 16, 13, HC.text, 'left'));
  let ly = y + 36 + dl.length * 16;
  L.slice(0, 3).forEach(l => { wrap(l, dw, 13).slice(0, 1).forEach(s => text(s, x + 14, ly, 13, '#cfe6a8', 'left')); ly += 16; });
  if (foot) text(foot, x + 14, Math.max(ly + 2, y + h - 14), 13, footCol, 'left');
  // the vehicle's numbers
  const S0 = tankStats(), tk = state.tank, sx = x + w - sw - 14;
  ctx.strokeStyle = '#5a4030'; ctx.beginPath(); ctx.moveTo(sx - 12, y + 10); ctx.lineTo(sx - 12, y + h - 10); ctx.stroke();
  const rows = [['Integrità', Math.round(tk ? tk.hp : S0.hp) + ' / ' + Math.round(S0.hp)], ['Velocità', S0.speed.toFixed(1) + ' m/s'], ['Corazza fronte', '-' + Math.round((1 - armorTake('front')) * 100) + '%'], ['Torretta', Math.round(S0.turret) + '°/s'],
    ['Ricarica', S0.reload.toFixed(2) + ' s'], ['Radio', Math.round(S0.radio) + ' m'], ['Posti', String(S0.seats)], ['Slot avanzati', String(sysSlots())]];
  rows.forEach(([k, v], i) => { const cx = sx + (i % 2) * (sw / 2), yy = y + 18 + Math.floor(i / 2) * 22; text(k, cx, yy, 13, HC.dim, 'left'); text(v, cx + sw / 2 - 12, yy, 13, HC.text, 'right'); });
}

// ---- In the field: K opens it (the game waits), K or Esc closes it ----------------------------------------
/** The field view of the vehicle screen, over the paused battlefield. */
function drawTankScreen() {
  UI.buttons = [];
  ctx.fillStyle = 'rgba(14,10,8,0.62)'; ctx.fillRect(0, 0, W, H);
  const x0 = 110, y0 = 40, w = W - 220, h = H - 80;
  panel(x0, y0, w, h);
  text('Mezzo · ' + HULLS[state.hull].name, x0 + 24, y0 + 30, 24, '#ffd9a0', 'left');
  gearIcon(x0 + w - 200, y0 + 30, 10, HC.gold); text(state.scrap + ' rottami', x0 + w - 184, y0 + 30, 18, HC.gold, 'left');
  drawTankPanel(x0, w, y0 + 62, y0 + h - 40, false);
  text('K o Esc: torna alla guida   ·   il gioco è in pausa   ·   in officina si comprano e si montano i pezzi', x0 + w / 2, y0 + h - 20, 13, HC.dim);
  ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.moveTo(MS.x, MS.y); ctx.lineTo(MS.x + 13, MS.y + 5); ctx.lineTo(MS.x + 6, MS.y + 7); ctx.lineTo(MS.x + 4, MS.y + 14); ctx.closePath(); ctx.fill();
}
/** The field view's keys. */
function tankScreenInput() {
  if (pressed('KeyK') || pressed('Escape')) scene = 'play';
  MS.lp = MS.rp = MS.lr = MS.rr = false;
}

// ---- The workshop tab (js/systems/workshop.js): the same screen, live ---------------------------------------
registerShopTab('tank', {
  name: 'Mezzo', order: 10,
  draw(x0, y0, w, h, cy) {
    if (state.sandbox) { // the test map's sandbox (iteration 73): the hull changes here
      text('Scafo', x0 + w - 24 - 3 * 112 - 8, y0 + 73, 14, '#ffd9a0', 'right');
      HULL_IDS.forEach((id, i) => button(x0 + w - 24 - (3 - i) * 112, y0 + 56, 104, 34, HULLS[id].short, () => setHull(id), { active: state.hull === id, size: 14 }));
    }
    drawTankPanel(x0, w, cy - 6, y0 + h - 46, true);
  },
});

// ---- The test map's sandbox (iteration 73) -------------------------------------------------------------------
/** Sandbox: one level down on standard system id (to compare the levels). */
function lowerStd(id) {
  if (lvl(id) <= 0) return;
  state.lv[id] = lvl(id) - 1; state.stats = null; state.lookKey++;
  const tk = state.tank, hp = tankStats().hp; if (tk) { tk.maxhp = hp; tk.hp = Math.min(tk.hp, hp); }
  state.shopMsg = STD[id].name + ' al livello ' + lvl(id) + '.';
}
/** Sandbox: the command vehicle becomes hull id where it stands, whole; systems beyond its slots go back to the store. */
function setHull(id) {
  if (state.hull === id || !HULLS[id]) return;
  state.hull = id; state.stats = null; state.lookKey++; trimSystems();
  const tk = state.tank; if (tk) { tk.rad = HULLS[id].rad; tk.maxhp = tankStats().hp; tk.hp = tk.maxhp; }
  const m = ammoMax(); while (ammoTotal() > m) { const k = SHELL_IDS.find(s => state.ammo[s] > 0); state.ammo[k]--; }
  state.shopMsg = 'Ora guidi: ' + HULLS[id].name + '.';
}
