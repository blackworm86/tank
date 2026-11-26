// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// The 2D layer over the 3D view: HUD, minimap, squad cards, the outpost workshop, title and end screens.
'use strict';

const UI = { buttons: [], map: null, mapT: -9, mapGen: -1 };
const HC = { panel: 'rgba(28,20,16,0.82)', edge: '#8e4b27', text: '#f1e4cc', dim: '#c9b79a', ok: '#9fe3a0', warn: '#ffb070', bad: '#ff7a6a', cyan: '#4fe3e0', gold: '#ffd36a' };

function rrect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
}
function panel(x, y, w, h) { rrect(x, y, w, h, 6, HC.panel, HC.edge); ctx.fillStyle = 'rgba(142,75,39,0.55)'; ctx.fillRect(x + 6, y + 3, w - 12, 2); }
function bar(x, y, w, h, k, col, back) { ctx.fillStyle = back || 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
function wrap(s, maxW, size) {
  ctx.font = `${size}px ${FONT}`; const words = s.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function button(x, y, w, h, label, onClick, opts = {}) {
  const hover = MS.x >= x && MS.x <= x + w && MS.y >= y && MS.y <= y + h;
  rrect(x, y, w, h, 5, opts.active ? 'rgba(86,105,58,0.9)' : opts.off ? 'rgba(50,40,34,0.8)' : hover ? 'rgba(120,70,40,0.95)' : 'rgba(70,46,32,0.92)', opts.active ? '#b6d77a' : HC.edge);
  if (label) text(label, x + w / 2, y + h / 2, opts.size || 16, opts.off ? '#9a8a78' : HC.text);
  UI.buttons.push({ x, y, w, h, onClick });
}
function clickButtons() {
  if (!MS.lp) return;
  for (let i = UI.buttons.length - 1; i >= 0; i--) { const b = UI.buttons[i]; if (MS.x >= b.x && MS.x <= b.x + b.w && MS.y >= b.y && MS.y <= b.y + b.h) { b.onClick(); break; } }
}

// ---- Small drawn icons (no emoji, every one drawn) ------------------------------------------------
/** A tiny silhouette of a unit kind, for squad cards and the barracks. */
function unitIcon(kind, x, y, s, col) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20); ctx.fillStyle = col;
  const dead = col === '#5a3a32';
  if (kind === 'car') {
    ctx.fillRect(-9, -3, 18, 7); ctx.fillRect(-4, -7, 8, 4); ctx.fillRect(3, -6, 8, 2);
    ctx.fillStyle = '#1d1b1a'; ctx.fillRect(-8, 4, 4, 4); ctx.fillRect(4, 4, 4, 4);
  } else {
    ctx.fillRect(-2, -9, 4, 4); // head
    ctx.fillRect(-3, -5, 6, 7); // body
    ctx.fillRect(-3, 2, 2, 6); ctx.fillRect(1, 2, 2, 6); // legs
    ctx.fillStyle = dead ? col : '#2a2220';
    if (kind === 'rifle') ctx.fillRect(2, -4, 7, 1.6);
    if (kind === 'sniper') { ctx.fillRect(2, -4, 10, 1.4); ctx.fillRect(5, -6, 3, 1.6); }
    if (kind === 'mg') { ctx.fillRect(2, -4, 8, 3); ctx.fillRect(7, -1, 1, 3); }
    if (kind === 'medic') { ctx.fillStyle = dead ? col : '#f2ede2'; ctx.fillRect(-6, -4, 3, 6); ctx.fillStyle = dead ? col : '#c0392b'; ctx.fillRect(-5.6, -2.2, 2.2, 0.9); ctx.fillRect(-5, -3, 1, 2.6); }
    if (kind === 'mortar') { ctx.save(); ctx.translate(6, 6); ctx.rotate(-0.6); ctx.fillRect(-1.2, -9, 2.4, 9); ctx.restore(); ctx.fillRect(3, 6, 7, 1.5); }
  }
  if (dead) { ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-7, -8); ctx.lineTo(7, 8); ctx.moveTo(7, -8); ctx.lineTo(-7, 8); ctx.stroke(); }
  ctx.restore();
}
function gearIcon(x, y, r, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-r * 0.22, -r, r * 0.44, r * 0.5); }
  ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a1e18'; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function tagIcon(x, y, s, col) {
  ctx.save(); ctx.translate(x, y); rrect(-s * 0.6, -s * 0.4, s * 1.2, s * 0.8, s * 0.2, col);
  ctx.fillStyle = '#2a1e18'; ctx.beginPath(); ctx.arc(-s * 0.36, 0, s * 0.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(-s * 0.15, -s * 0.12, s * 0.6, s * 0.08); ctx.fillRect(-s * 0.15, s * 0.06, s * 0.45, s * 0.08); ctx.restore();
}
function partIcon(slot, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 24, s / 24); ctx.fillStyle = '#d8c6a4'; ctx.strokeStyle = '#d8c6a4'; ctx.lineWidth = 2;
  if (slot === 'cannon') { ctx.fillRect(-10, -3, 20, 6); ctx.fillRect(6, -5, 5, 10); ctx.fillRect(-12, -6, 6, 12); }
  if (slot === 'tracks') { rrect(-11, -6, 22, 12, 6, null, '#d8c6a4'); for (let i = -7; i <= 7.5; i += 4.6) { ctx.beginPath(); ctx.arc(i, 0, 2.2, 0, Math.PI * 2); ctx.fill(); } }
  if (slot === 'armor') { ctx.beginPath(); ctx.moveTo(-9, -9); ctx.lineTo(9, -9); ctx.lineTo(9, 2); ctx.lineTo(0, 10); ctx.lineTo(-9, 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#5b3a28'; ctx.fillRect(-1.5, -6, 3, 10); }
  if (slot === 'radio') { ctx.fillRect(-8, 0, 16, 9); ctx.fillRect(4, -11, 2, 11); for (const r of [4, 7]) { ctx.beginPath(); ctx.arc(5, -11, r, -2.4, -0.7); ctx.stroke(); } }
  if (slot === 'engine') { ctx.fillRect(-9, -6, 14, 12); ctx.fillRect(5, -3, 5, 6); ctx.fillRect(-7, -10, 3, 4); ctx.fillRect(-2, -10, 3, 4); ctx.fillStyle = '#5b3a28'; ctx.fillRect(-6, -3, 8, 2); ctx.fillRect(-6, 1, 8, 2); }
  if (slot === 'turret') { ctx.beginPath(); ctx.arc(0, 2, 8, Math.PI, 0); ctx.fill(); ctx.fillRect(-10, 2, 20, 5); ctx.fillRect(4, -3, 9, 3); }
  if (slot === 'stab') { ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, 9, 3.5, 0.5, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

// ---- Minimap -------------------------------------------------------------------------------------------
function minimapImage() {
  const N = world.N;
  if (!UI.map || UI.map.width !== N) { UI.map = document.createElement('canvas'); UI.map.width = UI.map.height = N; UI.mapGen = -1; }
  if (UI.mapGen !== world.gen || (world.mapDirty && state.t - UI.mapT > 1)) {
    UI.mapT = state.t; UI.mapGen = world.gen; world.mapDirty = false;
    const c = UI.map.getContext('2d'), img = c.createImageData(N, N), d = img.data;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
      const h = world.hmap[x + N * z], i = (x + N * z) * 4;
      let col;
      if (h < world.WL) col = 0x4d6f5a;
      else { const t = world.vox[vi(x, h - 1, z)]; col = VCOL[t] || 0x888888; }
      const k = h < world.WL ? 1 : 0.72 + Math.min(1, h / 22) * 0.45;
      d[i] = Math.min(255, ((col >> 16) & 255) * k); d[i + 1] = Math.min(255, ((col >> 8) & 255) * k); d[i + 2] = Math.min(255, (col & 255) * k); d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }
  return UI.map;
}
function drawMinimap(x0, y0, S) {
  const N = world.N, tk = state.tank;
  panel(x0 - 6, y0 - 6, S + 12, S + 12);
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
  ctx.fillStyle = '#2a1e18'; ctx.fillRect(x0, y0, S, S);
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = -fz, rz = fx; // camera forward and right on the ground
  const k = S / (N * 1.05);
  ctx.translate(x0 + S / 2, y0 + S / 2);
  ctx.transform(rx * k, -fx * k, rz * k, -fz * k, 0, 0);
  ctx.translate(-N / 2, -N / 2);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(minimapImage(), 0, 0);
  const sites = world.sites;
  const flagMark = (sx, sz, col, s2) => { ctx.fillStyle = '#1d1b1a'; ctx.fillRect(sx - s2 - 1, sz - s2 - 1, s2 * 2 + 2, s2 * 2 + 2); ctx.fillStyle = col; ctx.fillRect(sx - s2, sz - s2, s2 * 2, s2 * 2); };
  for (const o of [sites.start, ...sites.outposts]) { flagMark(o.x, o.z, '#7fc85a', 4); ctx.fillStyle = '#1d1b1a'; ctx.fillRect(o.x - 1, o.z - 2.5, 2, 5); ctx.fillRect(o.x - 2.5, o.z - 1, 5, 2); }
  for (const c of sites.camps) flagMark(c.x, c.z, c.cleared ? '#8a8378' : '#d0402e', 4);
  const f = sites.fortress; flagMark(f.x, f.z, '#d0402e', 7); ctx.fillStyle = '#1d1b1a'; for (let i = -6; i <= 4; i += 4) ctx.fillRect(f.x + i, f.z - 7, 2, 3);
  ctx.strokeStyle = 'rgba(79,227,224,0.85)'; ctx.lineWidth = 1.2 / k; ctx.setLineDash([3 / k, 2 / k]);
  ctx.beginPath(); ctx.arc(tk.x, tk.z, tankStats().radio, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  for (const e of state.ents) {
    if (!e.alive || e.kind === 'tank') continue;
    if (e.team === 1 && !(e.group && e.group.alert && dist2(e, tk) < 60 * 60)) continue;
    ctx.fillStyle = e.team ? '#ff5a40' : '#c8f07a';
    const s = e.veh ? 2.6 : 1.6; ctx.fillRect(e.x - s / 2, e.z - s / 2, s, s);
  }
  ctx.save(); ctx.translate(tk.x, tk.z); ctx.rotate(-tk.heading);
  ctx.fillStyle = HC.cyan; ctx.strokeStyle = '#0c1a1a'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(4, -4); ctx.lineTo(0, -2); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
}
function objective() {
  const tk = state.tank, s = world.sites;
  const camps = s.camps.filter(c => !c.cleared);
  let best = null, bd = 1e9;
  for (const c of camps) { const d = Math.hypot(c.x - tk.x, c.z - tk.z); if (d < bd) { bd = d; best = c; } }
  if (!best) { best = s.fortress; bd = Math.hypot(best.x - tk.x, best.z - tk.z); }
  return { site: best, d: bd, left: camps.length };
}

// ---- The play HUD ------------------------------------------------------------------------------------------
function drawHUD() {
  const tk = state.tank, S = tankStats(), cmd = state.mode === 'cmd' || state.tpause, tp = state.tpause;
  if (tp) { ctx.fillStyle = 'rgba(10,22,34,0.22)'; ctx.fillRect(0, 0, W, H); ctx.strokeStyle = 'rgba(255,210,122,0.55)'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, W - 4, H - 4); }
  // drawn paths: each selected squad's remaining stops (every squad's in the tactical pause)
  for (const sq of state.squads) {
    const ms = alive(sq), o = sq.order; if (!ms.length || !(sq.selected || tp)) continue;
    let cx = 0, cz = 0, cy = 0; for (const m of ms) { cx += m.x; cz += m.z; cy += m.y; } cx /= ms.length; cz /= ms.length; cy /= ms.length;
    let prev = toScreen(cx, cy + 0.6, cz);
    ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    if (o.t === 'move' && !o.done) {
      for (let i = o.i; i < o.pts.length; i++) {
        const p = o.pts[i], q = toScreen(p.x, hAt(p.x, p.z) + 0.6, p.z); if (!q.on || !prev.on) { prev = q; continue; }
        const col = p.how === 'cover' ? '#8fe36a' : '#4fe3e0';
        ctx.strokeStyle = col; ctx.globalAlpha = sq.selected ? 0.95 : 0.5;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(q.x, q.y - 7); ctx.lineTo(q.x + 7, q.y); ctx.lineTo(q.x, q.y + 7); ctx.lineTo(q.x - 7, q.y); ctx.closePath(); ctx.fill();
        text(String(i - o.i + 1), q.x, q.y - 15, 12, col); ctx.setLineDash([6, 5]);
        prev = q;
      }
    } else if (o.t === 'attack' && o.target && o.target.alive) {
      const q = toScreen(o.target.x, o.target.y + 1, o.target.z);
      if (q.on && prev.on) { ctx.strokeStyle = '#ff6a4a'; ctx.globalAlpha = sq.selected ? 0.95 : 0.5; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  // bars over units
  for (const e of state.ents) {
    if (!e.alive || e.kind === 'tank') continue;
    if (!(e.selected || e.hp < e.maxhp - 0.5 || (e.kind === 'boss' && e.group.alert))) continue;
    const p = toScreen(e.x, e.y + (e.veh ? 3.6 : 2.6), e.z); if (!p.on) continue;
    const w = e.kind === 'boss' ? 80 : e.veh ? 36 : 22;
    bar(p.x - w / 2, p.y, w, e.kind === 'boss' ? 7 : 4, e.hp / e.maxhp, e.team ? '#e0503a' : '#8fd86a');
  }
  if (cmd) for (const sq of state.squads) {
    const m = alive(sq)[0]; if (!m) continue;
    const p = toScreen(m.x, m.y + 3.4, m.z); if (!p.on) continue;
    const heard = inRadio(sq);
    rrect(p.x - 11, p.y - 11, 22, 22, 4, heard ? 'rgba(20,60,60,0.85)' : 'rgba(60,30,20,0.85)', heard ? HC.cyan : HC.warn);
    text(String(sq.id + 1), p.x, p.y + 1, 15, heard ? HC.cyan : HC.warn);
  }
  for (const f of state.floats) { const p = toScreen(f.x, f.y + f.t * 1.5, f.z); if (p.on) { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6); text(f.s, p.x, p.y, 16, f.col); ctx.globalAlpha = 1; } }
  const hurt = Math.max(0, 1 - (state.t - state.hurtT) * 2.5);
  if (hurt > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(160,20,10,0)'); g.addColorStop(1, `rgba(160,20,10,${0.45 * hurt})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  // tank panel
  panel(14, 14, 300, 128);
  text('CARRO COMANDO', 26, 32, 15, HC.dim, 'left');
  text('Integrità', 26, 54, 14, HC.text, 'left');
  bar(104, 47, 196, 14, tk.hp / tk.maxhp, tk.hp / tk.maxhp > 0.35 ? '#8fd86a' : '#e0503a');
  text(Math.ceil(tk.hp) + ' / ' + Math.round(tk.maxhp), 202, 54, 13, '#10140c');
  text('Cannone', 26, 76, 14, HC.text, 'left');
  bar(104, 69, 196, 14, 1 - tk.reload / S.reload, tk.reload > 0 ? '#c9a35a' : '#ffe08a');
  const st = tk.reload > 0 ? 'RICARICA' : cmd ? 'TORRETTA FERMA' : tk.aligned ? 'IN LINEA' : 'ALLINEAMENTO';
  text(st, 202, 76, 13, '#1a120c');
  const sp = tk.spread * 100;
  text('Dispersione ' + sp.toFixed(1) + '%', 26, 98, 14, tk.spread < tune.spread_min * 2.2 ? HC.ok : tk.spread < 0.05 ? HC.text : HC.warn, 'left');
  text('Radio ' + Math.round(S.radio) + ' m', 300, 98, 14, HC.cyan, 'right');
  gearIcon(34, 122, 8, HC.gold); text(String(state.scrap) + ' rottami', 48, 122, 15, HC.gold, 'left');
  tagIcon(196, 122, 14, '#c8c2b2'); text(String(meta.piastrine) + ' piastrine', 210, 122, 14, HC.dim, 'left');

  // mode badge
  if (tp) {
    rrect(W / 2 - 150, 12, 300, 42, 7, 'rgba(70,52,16,0.94)', '#ffd27a');
    text('PAUSA TATTICA', W / 2, 28, 18, '#ffd27a');
    text('Spazio per riprendere · WASD sposta la vista', W / 2, 46, 13, '#e8d8b0');
  } else {
    rrect(W / 2 - 120, 12, 240, 42, 7, cmd ? 'rgba(18,56,58,0.9)' : 'rgba(60,40,22,0.9)', cmd ? HC.cyan : '#d9a35a');
    text(cmd ? 'MODALITÀ COMANDO' : 'MODALITÀ CARRO', W / 2, 28, 18, cmd ? HC.cyan : '#ffd9a0');
    text('Tab per cambiare · Spazio pausa tattica', W / 2, 46, 13, HC.dim);
  }
  // order strip: the armed order is lit
  if (cmd) {
    const ords = [['V', 'Vai', 'move'], ['F', 'Attacca', 'attack'], ['C', 'Copertura', 'cover'], ['Shift', 'Tappa percorso', null], ['G', 'Seguimi', null], ['H', 'Fermi', null]];
    ctx.font = `bold 13px ${FONT}`;
    const ws = ords.map(o => ctx.measureText(o[0]).width + ctx.measureText(o[1]).width + 30);
    let ox = W / 2 - (ws.reduce((a, b) => a + b, 0) + 6 * (ords.length - 1)) / 2;
    ords.forEach((o, i) => {
      const on = o[2] && state.arm === o[2];
      rrect(ox, 62, ws[i], 26, 5, on ? 'rgba(86,105,58,0.95)' : 'rgba(20,14,10,0.78)', on ? '#d8f59a' : HC.edge);
      const kw = ctx.measureText(o[0]).width + 10;
      rrect(ox + 4, 66, kw, 18, 3, 'rgba(0,0,0,0.45)', null);
      text(o[0], ox + 4 + kw / 2, 75, 12, on ? '#ffffff' : '#ffd9a0');
      text(o[1], ox + kw + 10, 75, 13, on ? '#ffffff' : HC.text, 'left');
      ox += ws[i] + 6;
    });
  }

  // minimap and objective
  const MSZ = 180; drawMinimap(W - MSZ - 20, 20, MSZ);
  const ob = objective();
  panel(W - MSZ - 26, MSZ + 34, MSZ + 12, 48);
  text('Obiettivo: ' + ob.site.name, W - MSZ - 16, MSZ + 50, 14, HC.text, 'left');
  text(Math.round(ob.d) + ' m · campi rimasti ' + ob.left, W - MSZ - 16, MSZ + 69, 13, HC.dim, 'left');

  // squad cards
  let y = 154;
  state.squads.forEach((sq, i) => {
    const heard = inRadio(sq), ms = alive(sq), h = 58;
    rrect(14, y, 226, h, 6, sq.selected ? 'rgba(20,58,60,0.9)' : HC.panel, sq.selected ? HC.cyan : HC.edge);
    rrect(20, y + 6, 22, 22, 4, 'rgba(0,0,0,0.4)', heard ? HC.cyan : '#6a5a4a');
    text(String(i + 1), 31, y + 18, 15, heard ? HC.cyan : '#9a8a78');
    text(sq.name, 50, y + 17, 15, ms.length ? HC.text : '#8a7a68', 'left');
    sq.slots.forEach((k, j) => { const m = sq.members[j]; unitIcon(k, 30 + j * 22, y + 42, 18, m && m.alive ? '#a8d870' : '#5a3a32'); });
    const ord = !ms.length ? 'Persa' : sq.order.t === 'follow' ? 'Segue' : sq.order.t === 'attack' ? 'Attacca' : sq.order.t === 'move' ? (sq.order.done ? 'In posizione' : 'In marcia') : 'Ferma';
    text(heard ? ord : 'Fuori portata', 232, y + 42, 13, heard ? HC.dim : HC.warn, 'right');
    y += h + 6;
  });

  // radio log
  const msgs = state.msgs.filter(m => state.t - m.t < 12).slice(-5);
  if (msgs.length) {
    const bw = 720, bx0 = (W - bw) / 2, by = H - 24 - msgs.length * 22;
    rrect(bx0, by - 12, bw, msgs.length * 22 + 14, 6, 'rgba(20,14,10,0.78)', null);
    msgs.forEach((m, i) => {
      ctx.globalAlpha = Math.max(0.15, Math.min(1, (12 - (state.t - m.t)) / 2));
      ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = m.col;
      const yy = by + 3 + i * 22; ctx.fillText(m.who + ':', bx0 + 12, yy);
      const ww = ctx.measureText(m.who + ': ').width;
      const line = wrap(m.text, bw - 30 - ww, 14)[0];
      text(line + (line.length < m.text.length ? '...' : ''), bx0 + 12 + ww, yy, 14, HC.text, 'left');
      ctx.globalAlpha = 1;
    });
  }
  if (state.canShop) {
    rrect(W / 2 - 200, H - 200, 400, 34, 6, 'rgba(40,70,30,0.92)', '#b6d77a');
    text('[E] Officina e caserma - ' + state.canShop.name, W / 2, H - 183, 15, '#eaf7d0');
  }
  // controls
  const lines = cmd
    ? ['Click / trascina: seleziona   1-6: squadra', 'Click destro: muovi (al riparo) / attacca', 'V F C + click: vai / attacca / copertura', 'Shift + click destro: aggiungi tappa']
    : ['WASD: guida il carro', 'Mouse: punta   Click: fuoco', 'Spazio: pausa tattica   Tab: comando', 'Q/E: ruota camera   Rotella: zoom'];
  panel(W - 300, H - 108, 286, 94);
  lines.forEach((l, i) => text(l, W - 290, H - 91 + i * 20, 13, HC.dim, 'left'));

  // cursor
  if (cmd) {
    if (MS.drag) { ctx.strokeStyle = HC.cyan; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ctx.strokeRect(MS.drag.x, MS.drag.y, MS.x - MS.drag.x, MS.y - MS.drag.y); ctx.setLineDash([]); ctx.fillStyle = 'rgba(79,227,224,0.08)'; ctx.fillRect(MS.drag.x, MS.drag.y, MS.x - MS.drag.x, MS.y - MS.drag.y); }
    ctx.fillStyle = HC.cyan; ctx.strokeStyle = '#0c1a1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MS.x, MS.y); ctx.lineTo(MS.x + 13, MS.y + 5); ctx.lineTo(MS.x + 6, MS.y + 7); ctx.lineTo(MS.x + 4, MS.y + 14); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (state.arm) { const c = state.arm === 'attack' ? '#ff8a6a' : state.arm === 'cover' ? '#8fe36a' : HC.cyan; rrect(MS.x + 14, MS.y + 12, ctx.measureText(ARM[state.arm]).width + 18, 20, 4, 'rgba(10,14,12,0.85)', c); text(ARM[state.arm], MS.x + 23, MS.y + 22, 12, c, 'left'); }
  } else {
    ctx.strokeStyle = '#ffe6a0'; ctx.lineWidth = 2;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.beginPath(); ctx.moveTo(MS.x + dx * 5, MS.y + dy * 5); ctx.lineTo(MS.x + dx * 12, MS.y + dy * 12); ctx.stroke(); }
    ctx.fillStyle = '#ffe6a0'; ctx.fillRect(MS.x - 1, MS.y - 1, 2, 2);
  }
}

// ---- The outpost: workshop, barracks, repairs ----------------------------------------------------------
function drawShop() {
  UI.buttons = [];
  ctx.fillStyle = 'rgba(14,10,8,0.6)'; ctx.fillRect(0, 0, W, H);
  const x0 = 110, y0 = 40, w = W - 220, h = H - 80;
  panel(x0, y0, w, h);
  text(state.shopSite.name, x0 + 24, y0 + 30, 24, '#ffd9a0', 'left');
  gearIcon(x0 + w - 200, y0 + 30, 10, HC.gold); text(state.scrap + ' rottami', x0 + w - 184, y0 + 30, 18, HC.gold, 'left');
  ['Officina', 'Caserma', 'Riparazioni'].forEach((t, i) => button(x0 + 24 + i * 170, y0 + 56, 160, 34, (i + 1) + '  ' + t, () => { state.shopTab = i; state.shopMsg = ''; }, { active: state.shopTab === i }));
  const cy = y0 + 106;
  if (state.shopTab === 0) {
    SLOTS.forEach((slot, r) => {
      const yy = cy + r * 68, P = PARTS[slot];
      partIcon(slot, x0 + 44, yy + 30, 30);
      text(P.label, x0 + 66, yy + 30, 16, HC.text, 'left');
      P.opts.forEach((o, i) => {
        const bx0 = x0 + 196 + i * 212, eq = state.parts[slot] === i, afford = state.scrap >= o.cost;
        button(bx0, yy + 2, 204, 62, '', () => buyPart(slot, i), { active: eq, off: !eq && !afford });
        text(o.name, bx0 + 8, yy + 16, 14, eq ? '#eaf7d0' : afford ? HC.text : '#9a8a78', 'left');
        wrap(o.desc, 188, 13).slice(0, 2).forEach((l, k) => text(l, bx0 + 8, yy + 35 + k * 15, 13, HC.dim, 'left'));
        if (eq || o.cost) text(eq ? 'Montato' : String(o.cost), bx0 + 196, yy + 16, 13, eq ? '#b6d77a' : HC.gold, 'right');
      });
    });
  } else if (state.shopTab === 1) {
    text('Le tue squadre', x0 + 24, cy + 6, 17, '#ffd9a0', 'left');
    state.squads.forEach((sq, i) => {
      const yy = cy + 24 + i * 56, miss = missingIn(sq).length, c = reinforceCost(sq);
      rrect(x0 + 24, yy, 480, 50, 5, 'rgba(0,0,0,0.3)', '#5a4030');
      text((i + 1) + '. ' + sq.name, x0 + 36, yy + 15, 15, HC.text, 'left');
      sq.slots.forEach((k, j) => { const m = sq.members[j]; unitIcon(k, x0 + 44 + j * 24, yy + 36, 18, m && m.alive ? '#a8d870' : '#5a3a32'); });
      if (miss) button(x0 + 300, yy + 8, 194, 34, 'Rimpiazza ' + miss + ' (' + c + ')', () => reinforce(sq), { off: state.scrap < c, size: 14 });
      else text('Al completo', x0 + 494, yy + 25, 14, HC.ok, 'right');
    });
    if (!state.squads.length) text('Nessuna squadra.', x0 + 24, cy + 40, 15, HC.dim, 'left');
    const rx = x0 + 540;
    text('Nuova squadra su misura (max ' + tune.squad_max_size + ' soldati)', rx, cy + 6, 17, '#ffd9a0', 'left');
    INF_KINDS.forEach((k, i) => {
      const bx0 = rx + (i % 3) * 154, by0 = cy + 26 + Math.floor(i / 3) * 52;
      button(bx0, by0, 148, 46, '', () => { if (state.roster.length < tune.squad_max_size) state.roster.push(k); }, { off: state.roster.length >= tune.squad_max_size });
      unitIcon(k, bx0 + 20, by0 + 24, 24, '#a8d870');
      text('+ ' + UT[k].name, bx0 + 38, by0 + 16, 14, HC.text, 'left'); text(tune[UT[k].cost] + ' rottami', bx0 + 38, by0 + 33, 13, HC.gold, 'left');
    });
    const ry = cy + 142;
    rrect(rx, ry, 456, 60, 5, 'rgba(0,0,0,0.3)', '#5a4030');
    if (state.roster.length) { text(squadName(state.roster), rx + 12, ry + 16, 15, HC.text, 'left'); state.roster.forEach((k, j) => unitIcon(k, rx + 22 + j * 26, ry + 42, 20, '#a8d870')); }
    else { text('Scegli i soldati qui sopra: un cecchino solitario, un team', rx + 12, ry + 20, 13, HC.dim, 'left'); text('di mitraglieri, fucilieri con un medico...', rx + 12, ry + 40, 13, HC.dim, 'left'); }
    const rc = rosterCost(state.roster);
    button(rx, ry + 70, 150, 38, 'Svuota', () => { state.roster = []; });
    button(rx + 160, ry + 70, 296, 38, 'Arruola (' + rc + ' rottami)', recruitRoster, { off: !state.roster.length || state.scrap < rc || state.squads.length >= tune.max_squads });
    button(rx, ry + 124, 456, 46, '', buyCar, { off: state.scrap < tune.cost_car || state.squads.length >= tune.max_squads });
    unitIcon('car', rx + 26, ry + 147, 26, '#a8d870');
    text('Autoblindo di supporto: cannoncino, veloce', rx + 52, ry + 139, 14, HC.text, 'left'); text(tune.cost_car + ' rottami', rx + 52, ry + 157, 13, HC.gold, 'left');
    text('Squadre: ' + state.squads.length + ' / ' + tune.max_squads, rx, ry + 194, 14, HC.dim, 'left');
  } else {
    const tk = state.tank, miss = Math.ceil(tk.maxhp - tk.hp);
    text('Integrità del carro', x0 + 24, cy + 14, 17, HC.text, 'left');
    bar(x0 + 24, cy + 32, 520, 22, tk.hp / tk.maxhp, '#8fd86a');
    text(Math.ceil(tk.hp) + ' / ' + Math.round(tk.maxhp), x0 + 284, cy + 43, 14, '#10140c');
    button(x0 + 24, cy + 72, 250, 44, 'Ripara 50 (' + repairCost(Math.min(50, Math.max(0, miss))) + ')', () => repair(false), { off: miss <= 0 });
    button(x0 + 294, cy + 72, 250, 44, 'Ripara tutto (' + repairCost(Math.max(0, miss)) + ')', () => repair(true), { off: miss <= 0 });
    text('Il carro si ripara solo negli avamposti.', x0 + 24, cy + 140, 14, HC.dim, 'left');
  }
  if (state.shopMsg) text(state.shopMsg, x0 + w / 2, y0 + h - 26, 16, HC.gold);
  text('Esc o E: torna al campo', x0 + w - 24, y0 + h - 26, 14, HC.dim, 'right');
  ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.moveTo(MS.x, MS.y); ctx.lineTo(MS.x + 13, MS.y + 5); ctx.lineTo(MS.x + 6, MS.y + 7); ctx.lineTo(MS.x + 4, MS.y + 14); ctx.closePath(); ctx.fill();
}

// ---- Title and end screens ------------------------------------------------------------------------------
function drawPerks(x, y) {
  text('Deposito piastrine', x, y, 18, '#ffd9a0', 'left');
  tagIcon(x + 190, y, 16, '#c8c2b2'); text(String(meta.piastrine), x + 206, y, 18, HC.text, 'left');
  PERKS.forEach((p, i) => {
    const l = perk(p.id), full = l >= p.max, c = p.cost(l);
    const yy = y + 28 + i * 26;
    text((i + 1) + '  ' + p.name + ' (' + p.desc + ')', x, yy, 14, full ? HC.ok : HC.text, 'left');
    text(full ? 'max' : 'liv ' + l + '/' + p.max + ' · ' + c, x + 410, yy, 14, full ? HC.ok : meta.piastrine >= c ? HC.gold : '#9a8a78', 'right');
  });
  text(state.perkMsg || 'Tasti 1-4: compra un miglioramento permanente', x, y + 28 + PERKS.length * 26 + 4, 13, state.perkMsg ? HC.gold : HC.dim, 'left');
}
function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(30,16,10,0.2)'); g.addColorStop(1, 'rgba(30,16,10,0.88)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  rrect(W / 2 - 430, 70, 860, 120, 8, 'rgba(28,20,16,0.7)', null);
  text('RUSTLINE COMMANDER', W / 2, 115, 62, '#ffcf8a');
  text('Un carro, una radio, poche squadre di disperati. La terra bruciata cambia a ogni run.', W / 2, 162, 18, HC.text);
  panel(W / 2 - 470, 220, 450, 300);
  text('Comandi', W / 2 - 450, 246, 18, '#ffd9a0', 'left');
  CONTROLS.forEach((c, i) => text(c, W / 2 - 450, 276 + i * 24, 14, HC.text, 'left'));
  panel(W / 2 + 20, 220, 450, 190);
  drawPerks(W / 2 + 40, 246);
  rrect(W / 2 - 200, H - 100, 400, 50, 8, 'rgba(60,40,22,0.92)', '#d9a35a');
  text('Invio per iniziare', W / 2, H - 75, 26, '#fff2d8');
  text('Distruggi la Fortezza del Capo. Se il carro cade, il run finisce: restano solo le piastrine.', W / 2, H - 28, 15, HC.text);
}
function drawEnd(win) {
  ctx.fillStyle = 'rgba(14,10,8,0.7)'; ctx.fillRect(0, 0, W, H);
  panel(W / 2 - 360, 80, 720, 540);
  text(state.gained || (win ? 'Vittoria' : 'Game over'), W / 2, 130, 44, win ? '#b6f08a' : '#ff9a7a');
  const mins = Math.floor(state.t / 60), secs = Math.floor(state.t % 60);
  const rows = [['Campi ripuliti', state.camps + ' / ' + world.sites.camps.length], ['Predoni abbattuti', state.kills], ['Rottami in tasca', state.scrap], ['Durata', mins + ' min ' + secs + ' s'], ['Piastrine guadagnate', '+' + state.tagsWon]];
  rows.forEach((r, i) => { text(r[0], W / 2 - 300, 190 + i * 30, 18, HC.text, 'left'); text(String(r[1]), W / 2 + 300, 190 + i * 30, 18, i === 4 ? HC.gold : HC.text, 'right'); });
  drawPerks(W / 2 - 300, 370);
  text(win ? 'Invio: un nuovo run su una nuova mappa' : 'R o Invio: un nuovo run su una nuova mappa', W / 2, 590, 20, '#fff2d8');
}
function drawFiguresLabels(labels) {
  rrect(W / 2 - 220, 14, 440, 40, 6, 'rgba(28,20,16,0.82)', null);
  text('Le figure di Rustline Commander', W / 2, 34, 22, HC.text);
  for (const l of labels) { ctx.font = `14px ${FONT}`; const w = ctx.measureText(l.name).width + 14; rrect(l.x - w / 2, l.y - 12, w, 24, 5, 'rgba(28,20,16,0.85)', null); text(l.name, l.x, l.y, 14, HC.text); }
}
