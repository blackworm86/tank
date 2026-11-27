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
  } else if (kind === 'ltank') {
    ctx.fillRect(-10, -1, 20, 6); ctx.fillRect(-5, -6, 9, 5); ctx.fillRect(4, -5, 8, 2);
    ctx.fillStyle = '#1d1b1a'; ctx.fillRect(-10, 5, 20, 3);
  } else if (kind === 'at') {
    ctx.fillRect(-7, -6, 3, 11); ctx.fillRect(-4, -2, 15, 2); ctx.fillRect(-9, 4, 12, 2);
    ctx.fillStyle = '#1d1b1a'; ctx.beginPath(); ctx.arc(-3, 6, 3, 0, 6.3); ctx.fill();
  } else {
    ctx.fillRect(-2, -9, 4, 4); // head
    ctx.fillRect(-3, -5, 6, 7); // body
    ctx.fillRect(-3, 2, 2, 6); ctx.fillRect(1, 2, 2, 6); // legs
    ctx.fillStyle = dead ? col : '#2a2220';
    if (kind === 'rifle') ctx.fillRect(2, -4, 7, 1.6);
    if (kind === 'sniper') { ctx.fillRect(2, -4, 10, 1.4); ctx.fillRect(5, -6, 3, 1.6); }
    if (kind === 'mg') { ctx.fillRect(2, -4, 8, 3); ctx.fillRect(7, -1, 1, 3); }
    if (kind === 'medic') { ctx.fillStyle = dead ? col : '#f2ede2'; ctx.fillRect(-6, -4, 3, 6); ctx.fillStyle = dead ? col : '#c0392b'; ctx.fillRect(-5.6, -2.2, 2.2, 0.9); ctx.fillRect(-5, -3, 1, 2.6); }
    if (kind === 'eng') { ctx.fillStyle = dead ? col : '#e0b040'; ctx.fillRect(-6, -4, 3, 6); ctx.fillStyle = dead ? col : '#2a2220'; ctx.fillRect(2, -5, 2, 9); ctx.fillRect(1, -6, 4, 2); }
    if (kind === 'radio') { ctx.fillStyle = dead ? col : '#5a6a40'; ctx.fillRect(-7, -5, 4, 7); ctx.fillStyle = dead ? col : '#2a2220'; ctx.fillRect(-6, -13, 1, 8); ctx.fillRect(2, -4, 6, 1.6); }
    if (kind === 'scout') { ctx.fillRect(2, -4, 6, 1.4); ctx.fillStyle = dead ? col : '#c8b070'; ctx.fillRect(-3, -10, 6, 2); }
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
  if (slot === 'seats') { for (const sx of [-7, 0, 7]) { ctx.fillRect(sx - 2, -9, 4, 4); ctx.fillRect(sx - 3, -4, 6, 7); } ctx.fillRect(-11, 4, 22, 4); }
  if (slot === 'sensor') { ctx.beginPath(); ctx.arc(0, 4, 3, 0, Math.PI * 2); ctx.fill(); for (const r of [6, 10]) { ctx.beginPath(); ctx.arc(0, 4, r, -2.5, -0.6); ctx.stroke(); } ctx.fillRect(-1, 4, 2, 7); }
  if (slot === 'frame') { ctx.strokeRect(-10, -7, 20, 14); ctx.fillRect(-10, -1, 20, 2); ctx.fillRect(-1, -7, 2, 14); for (const [a, b] of [[-10, -7], [10, -7], [-10, 7], [10, 7]]) { ctx.beginPath(); ctx.arc(a, b, 2.2, 0, 6.3); ctx.fill(); } }
  if (slot === 'coax') { ctx.fillRect(-11, -2, 18, 4); ctx.fillRect(-11, -5, 6, 10); for (let i = -3; i <= 5; i += 3) ctx.fillRect(i, -4, 1.5, 8); ctx.fillRect(7, -1, 5, 2); }
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
  // the fog of war: what nobody sees now is dark
  if (tune.fog && world.vis) {
    const G = world.visG;
    if (!UI.fogC || UI.fogC.width !== G) { UI.fogC = document.createElement('canvas'); UI.fogC.width = UI.fogC.height = G; UI.fogN = -1; }
    if (UI.fogN !== world.visN) {
      UI.fogN = world.visN; const c2 = UI.fogC.getContext('2d'), im = c2.createImageData(G, G);
      const X = world.exp && world.exp.length === G * G ? world.exp : null;
      for (let i = 0; i < G * G; i++) { const e = X ? X[i] : 0; im.data[i * 4] = 14; im.data[i * 4 + 1] = 10; im.data[i * 4 + 2] = 8; im.data[i * 4 + 3] = Math.round((1 - e) * 250 + e * (1 - world.vis[i]) * 175); }
      c2.putImageData(im, 0, 0);
    }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(UI.fogC, 0, 0, G * 2, G * 2); ctx.imageSmoothingEnabled = false;
  }
  const sites = world.sites;
  const flagMark = (sx, sz, col, s2) => { ctx.fillStyle = '#1d1b1a'; ctx.fillRect(sx - s2 - 1, sz - s2 - 1, s2 * 2 + 2, s2 * 2 + 2); ctx.fillStyle = col; ctx.fillRect(sx - s2, sz - s2, s2 * 2, s2 * 2); };
  for (const o of [sites.start, ...sites.outposts]) { flagMark(o.x, o.z, '#7fc85a', 4); ctx.fillStyle = '#1d1b1a'; ctx.fillRect(o.x - 1, o.z - 2.5, 2, 5); ctx.fillRect(o.x - 2.5, o.z - 1, 5, 2); }
  for (const c of sites.camps) if (explored(c.x, c.z) || state.campsKnown) flagMark(c.x, c.z, c.cleared ? '#8a8378' : '#d0402e', 4); // camps show once found
  const f = sites.fortress;
  if (f.kind === 'exit') { ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2.4 / k; ctx.strokeRect(f.x - 7, f.z - 7, 14, 14); ctx.fillStyle = '#ffd36a'; ctx.fillRect(f.x - 3, f.z - 3, 6, 6); }
  else { flagMark(f.x, f.z, '#d0402e', 7); ctx.fillStyle = '#1d1b1a'; for (let i = -6; i <= 4; i += 4) ctx.fillRect(f.x + i, f.z - 7, 2, 3); }
  if (typeof minimapMarks === 'function') minimapMarks(k);
  minimapBlips(k);
  ctx.strokeStyle = 'rgba(79,227,224,0.85)'; ctx.lineWidth = 1.2 / k; ctx.setLineDash([3 / k, 2 / k]);
  ctx.beginPath(); ctx.arc(tk.x, tk.z, tankStats().radio, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  // the player's view: the screen's corners carried down to the ground
  if (R3.ready && R3.camera) {
    const pts = [[0, 0], [W, 0], [W, H], [0, H]].map(([sx, sy]) => { const { o, d } = screenRay(sx, sy); const t = d.y < -0.02 ? Math.min(600, (cam.y - o.y) / d.y) : 600; return { x: o.x + d.x * t, z: o.z + d.z * t }; });
    ctx.fillStyle = 'rgba(255,240,200,0.10)'; ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 1.3 / k;
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.z) : ctx.moveTo(p.x, p.z)); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const e of state.ents) {
    if (!e.alive || e.kind === 'tank') continue;
    if (e.team === 1 && hiddenFoe(e)) continue; // the fog of war
    ctx.fillStyle = e.team ? '#ff5a40' : e.squad ? sqColor(e.squad) : '#c8f07a';
    const s = e.veh ? 2.6 : 1.6; ctx.fillRect(e.x - s / 2, e.z - s / 2, s, s);
  }
  ctx.save(); ctx.translate(tk.x, tk.z); ctx.rotate(-tk.heading);
  ctx.fillStyle = HC.cyan; ctx.strokeStyle = '#0c1a1a'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(4, -4); ctx.lineTo(0, -2); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.restore();
  // each squad's number where it stands (upright, outside the map's rotation)
  const toMini = (x, z) => { const X = x - N / 2, Z = z - N / 2; return { x: x0 + S / 2 + rx * k * X + rz * k * Z, y: y0 + S / 2 - fx * k * X - fz * k * Z }; };
  state.squads.forEach((sq, i) => {
    const ms = alive(sq).filter(m => !m.inside); if (!ms.length) return;
    let ax = 0, az = 0; for (const m of ms) { ax += m.x; az += m.z; } const p = toMini(ax / ms.length, az / ms.length);
    if (p.x < x0 || p.y < y0 || p.x > x0 + S || p.y > y0 + S) return;
    const col = sqColor(sq);
    rrect(p.x - 7, p.y - 16, 14, 13, 3, sq.selected ? col : 'rgba(20,24,20,0.85)', col);
    text(String(i + 1), p.x, p.y - 9, 10, sq.selected ? '#101010' : col);
  });
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
/** Rank chevrons (1 to 3) centred at (x,y). */
function chevrons(x, y, n, s = 1) {
  ctx.save(); ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 1.6 * s; ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) { const yy = y - k * 3.4 * s; ctx.beginPath(); ctx.moveTo(x - 4 * s, yy); ctx.lineTo(x, yy - 2.6 * s); ctx.lineTo(x + 4 * s, yy); ctx.stroke(); }
  ctx.restore();
}
function drawHUD() {
  const tk = state.tank, S = tankStats(), cmd = state.mode === 'cmd' || state.tpause, tp = state.tpause;
  // promoted soldiers wear their chevrons over their heads
  for (const e of state.ents) {
    if (!e.alive || e.team !== 0 || e.veh || e.inside || !e.rank) continue;
    const p = toScreen(e.x, surfaceY(e.x, e.z) + 2.3, e.z); if (p.on) chevrons(p.x, p.y, e.rank, 1);
  }
  // buildings held by soldiers: a badge over the roof with how many are inside
  for (const b of world.buildings) {
    if (!b.occ.length) continue;
    const mine = b.occ[0].team === 0, p = toScreen(b.x0 + b.w / 2, b.g + b.h + 1.5, b.z0 + b.d / 2); if (!p.on) continue;
    const lab = b.occ.length + '/' + b.cap;
    rrect(p.x - 22, p.y - 11, 44, 22, 5, 'rgba(10,14,12,0.85)', mine ? '#7fe35a' : '#e05a4a');
    for (let k = 0; k < 3; k++) { ctx.fillStyle = mine ? '#b9f59a' : '#f0a090'; ctx.fillRect(p.x - 16 + k * 4, p.y - 4 - k * 2, 3, 8 + k * 2); }
    text(lab, p.x + 8, p.y + 1, 12, mine ? '#b9f59a' : '#f0a090');
  }
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
        const col = sqColor(sq);
        ctx.strokeStyle = col; ctx.globalAlpha = sq.selected ? 0.95 : 0.5;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(q.x, q.y - 7); ctx.lineTo(q.x + 7, q.y); ctx.lineTo(q.x, q.y + 7); ctx.lineTo(q.x - 7, q.y); ctx.closePath(); ctx.fill();
        text(String(i - o.i + 1), q.x, q.y - 15, 12, col);
        if (p.face != null) groundArrow(p.x, p.z, p.face, 4.5, p.assault ? '#ff6a4a' : col, 2.5);
        ctx.setLineDash([6, 5]);
        prev = q;
      }
    } else if (o.t === 'attack' && o.target && o.target.alive) {
      const q = toScreen(o.target.x, o.target.y + 1, o.target.z);
      if (q.on && prev.on) { ctx.strokeStyle = '#ff6a4a'; ctx.globalAlpha = sq.selected ? 0.95 : 0.5; ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }
  if ((cmd || state.gest) && !state.menu) drawOrderAids();
  // bars over units
  for (const e of state.ents) {
    if (!e.alive || e.kind === 'tank' || e.inside || hiddenFoe(e)) continue;
    if (!(e.selected || e.hp < e.maxhp - 0.5 || (ENEMY[e.kind] && ENEMY[e.kind].bigBar && e.group.alert))) continue;
    const p = toScreen(e.x, e.y + (e.veh ? 3.6 : 2.6), e.z); if (!p.on) continue;
    const big = ENEMY[e.kind] && ENEMY[e.kind].bigBar, w = big ? 80 : e.veh ? 36 : 22;
    bar(p.x - w / 2, p.y, w, big ? 7 : 4, e.hp / e.maxhp, e.team ? '#e0503a' : '#8fd86a');
  }
  if (cmd) for (const sq of state.squads) {
    const m = alive(sq)[0]; if (!m) continue;
    const p = toScreen(m.x, m.y + 3.4, m.z); if (!p.on) continue;
    const heard = inRadio(sq), col = heard ? sqColor(sq) : '#8a7a68';
    rrect(p.x - 9, p.y - 9, 18, 18, 4, sq.selected ? col : 'rgba(16,14,12,0.8)', col);
    text(String(sq.id + 1), p.x, p.y + 1, 12, sq.selected ? '#101010' : col);
  }
  // picked soldiers: a white mark over the head
  if (state.picked) for (const m of state.picked) {
    if (!m.alive || m.inside) continue; const p = toScreen(m.x, m.y + 2.9, m.z); if (!p.on) continue;
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#101010'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x - 5, p.y - 1); ctx.lineTo(p.x + 5, p.y - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  drawBlips3D();
  for (const f of state.floats) { const p = toScreen(f.x, f.y + f.t * 1.5, f.z); if (p.on) { ctx.globalAlpha = Math.max(0, 1 - f.t / 1.6); text(f.s, p.x, p.y, 16, f.col); ctx.globalAlpha = 1; } }
  const hurt = Math.max(0, 1 - (state.t - state.hurtT) * 2.5);
  if (hurt > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(160,20,10,0)'); g.addColorStop(1, `rgba(160,20,10,${0.45 * hurt})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  // tank panel: integrity, the gun, the scrap (the armour shows for a few seconds after a hit)
  if (tk.lastHit && state.t - tk.lastHit.t < 4) drawArmor(252, 14, tk);
  const nsys = state.systems.length;
  panel(14, 14, 230, nsys ? 110 : 88);
  text(HULLS[state.hull || 'apc'].short.toUpperCase(), 24, 29, 12, HC.dim, 'left');
  plateStatus().forEach((p, i) => { rrect(86 + i * 18, 24, 14, 10, 2, p.cond > 0.5 ? '#8fd86a' : p.cond > 0 ? '#e0a050' : 'rgba(0,0,0,0.3)', p.cond > 0 ? null : '#e0503a'); }); // modules.js: one pip a plate
  gearIcon(184, 29, 6, HC.gold); text(String(state.scrap), 194, 29, 13, HC.gold, 'left');
  bar(24, 40, 210, 13, tk.hp / tk.maxhp, tk.hp / tk.maxhp > 0.35 ? '#8fd86a' : '#e0503a');
  text(Math.ceil(tk.hp) + ' / ' + Math.round(tk.maxhp), 129, 47, 11, '#10140c');
  bar(24, 58, 210, 13, 1 - tk.reload / S.reload, tk.reload > 0 ? '#c9a35a' : '#ffe08a');
  const st = tk.reload > 0 && S.wkind !== 'bullet' ? 'RICARICA' : cmd ? S.wname : S.wname + (tk.aligned ? ' · IN LINEA' : ' · ALLINEA');
  text(st, 129, 65, 11, '#1a120c');
  // the rounds by type (X changes the loaded one), the coax on the right button
  if (countedGun()) {
    let tx = 24; ctx.font = 'bold 12px ' + FONT;
    for (const k of SHELL_IDS) {
      const s = SHELLS[k].short + ' ' + state.ammo[k], on = state.shell === k, tw = ctx.measureText(s).width;
      if (on) rrect(tx - 3, 78, tw + 6, 16, 3, 'rgba(255,224,138,0.18)', '#ffe08a');
      text(s, tx, 86, 12, on ? '#ffe08a' : state.ammo[k] ? HC.text : '#7a6a58', 'left'); tx += tw + 10;
    }
    text('X', tx + 2, 86, 11, HC.dim, 'left');
  } else text('Colpi non contati', 24, 86, 12, '#ffe08a', 'left');
  const ht = tk.heat || 0; // the coax's heat: it locks when full
  text(tk.jammed ? 'COASS. CALDA' : 'Dx coass.', 234, 82, 10, tk.jammed ? '#ff7a5a' : '#8fe0ff', 'right');
  ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(184, 89, 50, 4);
  ctx.fillStyle = tk.jammed ? '#ff5a3a' : ht > 0.7 ? '#ffb040' : '#8fe0ff'; ctx.fillRect(184, 89, 50 * ht, 4);
  // the advanced systems: key, name, recharge
  state.systems.forEach((id, i) => {
    const S2 = SYSTEMS[id], bx = 24 + i * 42, wait = S2.active ? sysWait(id) : 0;
    rrect(bx, 96, 39, 16, 3, S2.active ? (wait ? 'rgba(60,40,30,0.9)' : 'rgba(30,70,80,0.9)') : 'rgba(40,40,36,0.8)', S2.active ? '#8fe0ff' : '#6a6458');
    if (wait) { ctx.fillStyle = 'rgba(143,224,255,0.35)'; ctx.fillRect(bx, 96, 39 * (1 - wait / S2.cd), 16); }
    text((S2.active ? (i + 1) + ' ' : '') + S2.short.slice(0, S2.active ? 4 : 6), bx + 19.5, 104, 9, S2.active ? '#eaf7ff' : '#b8b0a0');
  });
  // mode tag
  if (tp) {
    rrect(W / 2 - 170, 10, 340, 26, 6, 'rgba(70,52,16,0.94)', '#ffd27a');
    text('PAUSA TATTICA · ordini · WASD vista · Spazio/Tab riprende', W / 2, 23, 13, '#ffd27a');
  } else {
    rrect(W / 2 - 95, 10, 190, 26, 6, cmd ? 'rgba(18,56,58,0.88)' : 'rgba(60,40,22,0.88)', cmd ? HC.cyan : '#d9a35a');
    text('CARRO · Spazio/Tab: pausa tattica e ordini', W / 2, 23, 13, '#ffd9a0');
  }

  // minimap and objective
  const MSZ = 180; drawMinimap(W - MSZ - 20, 20, MSZ);
  const ob = objective();
  text(state.mission ? missionLine() : ob.site.name + ' · ' + Math.round(ob.d) + ' m', W - MSZ / 2 - 20, MSZ + 40, 12, HC.dim);

  // squad cards
  let y = nsys ? 134 : 112; UI.cards = [];
  const dragging = state.dragSoldier && state.dragSoldier.moved ? state.dragSoldier : null;
  state.squads.forEach((sq, i) => {
    squadMod(sq);
    const heard = inRadio(sq), ms = alive(sq), h = (sq.traits && sq.traits.length) ? 64 : 52, col = sqColor(sq), ps = postureOf(sq), card = { sq, x: 14, y, w: 230, h, icons: [] };
    const over = dragging && cardAt(MS.x, MS.y) && cardAt(MS.x, MS.y).sq === sq && sq !== dragging.m.squad;
    rrect(14, y, 230, h, 6, over ? 'rgba(60,70,50,0.95)' : sq.selected ? 'rgba(32,36,32,0.92)' : 'rgba(24,18,14,0.72)', sq.selected || over ? col : 'rgba(142,75,39,0.55)');
    ctx.fillStyle = col; ctx.fillRect(15, y + 4, 4, h - 8);
    text(String(i + 1), 29, y + 14, 13, heard ? col : '#8a7a68');
    const renaming = state.rename && state.rename.sq === sq;
    const nm = renaming ? state.rename.text + (Math.floor(performance.now() / 400) % 2 ? '|' : ' ') : sq.name;
    ctx.font = `bold 13px ${FONT}`; const nw = Math.min(120, ctx.measureText(nm).width);
    if (renaming) rrect(39, y + 4, Math.max(90, nw + 12), 19, 3, 'rgba(0,0,0,0.55)', col);
    text(nm, 44, y + 14, 13, ms.length ? HC.text : '#8a7a68', 'left');
    card.edit = { x: 46 + nw, y: y + 4, w: 18, h: 19 }; if (!renaming) text('✎', 55 + nw, y + 14, 12, HC.dim);
    ctx.font = `bold 10px ${FONT}`; const pw = ctx.measureText(ps.short).width + 12;
    card.post = { x: 238 - pw, y: y + 5, w: pw, h: 17 };
    rrect(card.post.x, card.post.y, pw, 17, 4, 'rgba(0,0,0,0.45)', ps.col); text(ps.short, card.post.x + pw / 2, y + 14, 10, ps.col);
    sq.slots.forEach((k, j) => {
      const m = sq.members[j], ix = 30 + j * 21, iy = y + 37, pk = !!(m && state.picked && state.picked.has(m));
      if (pk) rrect(ix - 10, iy - 11, 20, 22, 3, 'rgba(255,255,255,0.22)', '#ffffff');
      const lifted = dragging && m && (dragging.m === m || (pk && state.picked.has(dragging.m)));
      unitIcon(k, ix, iy, 17, lifted ? 'rgba(168,216,112,0.25)' : m && m.alive ? '#a8d870' : '#5a3a32');
      if (m && m.alive && m.rank) chevrons(ix, iy - 11, m.rank, 0.7);
      card.icons.push({ m, x: ix, y: iy });
    });
    UI.cards.push(card);
    const riding = ms.length && ms.every(m => m.inside || m.veh || m.kind === 'at') && ms.some(m => m.inside);
    const ord = !ms.length ? 'Persa' : riding ? 'A bordo' : sq.order.t === 'board' ? 'Sale a bordo' : sq.order.t === 'garrison' ? 'Entra' : sq.order.t === 'garrisoned' ? 'Nell\'edificio' : sq.order.t === 'follow' ? 'Segue' : sq.order.t === 'attack' ? 'Attacca' : sq.order.t === 'move' ? (sq.order.ambush ? (sq.order.sprung ? 'Imboscata!' : sq.order.done ? 'In agguato' : 'Si apposta') : sq.order.done ? 'In posizione' : sq.order.pts && sq.order.pts[sq.order.i] && sq.order.pts[sq.order.i].assault ? "All'attacco" : 'In marcia') : 'Ferma';
    text(heard ? ord : 'Fuori portata', 238, y + 39, 11, heard ? HC.dim : HC.warn, 'right');
    if (h > 52) { let tx = 24; ctx.font = 'bold 10px ' + FONT; for (const t of sq.traits) { const tw = ctx.measureText(t.name).width; if (tx + tw > 238) break; text(t.name, tx, y + 55, 10, t.bad ? '#e0a070' : '#b6d77a', 'left'); tx += tw + 8; } }
    y += h + 5;
  });
  // dragging a soldier: an empty slot for a new squad, and the soldier under the mouse
  UI.newCard = null;
  if (dragging) {
    if (state.squads.length < maxSquads()) {
      UI.newCard = { x: 14, y, w: 230, h: 34 }; const on = inRect(UI.newCard, MS.x, MS.y);
      rrect(14, y, 230, 34, 6, on ? 'rgba(79,227,224,0.25)' : 'rgba(79,227,224,0.08)', HC.cyan); text('+ nuova squadra', 129, y + 17, 13, HC.cyan);
    }
    const n = state.picked && state.picked.has(dragging.m) ? state.picked.size : 1;
    unitIcon(dragging.m.kind, MS.x + 6, MS.y + 6, 20, '#ffffff'); if (n > 1) text('×' + n, MS.x + 20, MS.y - 6, 12, '#ffffff', 'left');
  }

  // radio log
  const msgs = state.msgs.filter(m => state.t - m.t < 8).slice(-3);
  if (msgs.length) {
    // with the development panel open the log moves left of it
    const bw = state.dev ? Math.min(560, W - 352) : 560, bx0 = state.dev ? Math.max(14, W - 324 - bw) : (W - bw) / 2, by = H - 24 - msgs.length * 22;
    rrect(bx0, by - 12, bw, msgs.length * 22 + 14, 6, 'rgba(20,14,10,0.78)', null);
    msgs.forEach((m, i) => {
      ctx.globalAlpha = Math.max(0.15, Math.min(1, (8 - (state.t - m.t)) / 2));
      ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = m.col;
      const yy = by + 3 + i * 22; ctx.fillText(m.who + ':', bx0 + 12, yy);
      const ww = ctx.measureText(m.who + ': ').width;
      const line = wrap(m.text, bw - 30 - ww, 14)[0];
      text(line + (line.length < m.text.length ? '...' : ''), bx0 + 12 + ww, yy, 14, HC.text, 'left');
      ctx.globalAlpha = 1;
    });
  }
  if (state.canShop) {
    const py = (state.mode === 'cmd' || state.tpause) ? H - 226 : H - 200;
    rrect(W / 2 - 200, py, 400, 34, 6, 'rgba(40,70,30,0.92)', '#b6d77a');
    text('Garage - ' + state.canShop.name + '   [E] apri', W / 2, py + 17, 15, '#eaf7d0');
  }
  // controls
  const lines = cmd
    ? ['WASD vista   1-6 squadra   \\ tutte   Alt+1-6 forma', 'Click dx: ordini   Shift+click dx: tappa', 'V F C R + click   G segui   Z fermi   B bordo', 'Trascina un soldato su un\'altra squadra']
    : ['WASD: guida il carro', 'Mouse: punta   Click: fuoco', 'Spazio o Tab: pausa tattica (ordini)', 'Q/E: ruota camera   Rotella: zoom'];
  if (state.dev) drawDevPanel();
  else if (!state.help) text('F1 comandi · F2 sviluppo', W - 16, H - 14, 11, 'rgba(201,183,154,0.75)', 'right');
  else {
    panel(W - 300, H - 108, 286, 94);
    lines.forEach((l, i) => text(l, W - 290, H - 91 + i * 20, 13, HC.dim, 'left'));
  }

}
/**
 * The game's own cursor, drawn last so nothing covers it (the order menu opens right under it): the command
 * arrow in command mode or over the menu, the gun's cross while driving.
 */
function drawCursor() {
  const cmd = state.mode === 'cmd' || state.tpause || !!state.menu;
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

// The workshop screen and its tabs: js/systems/workshop.js (the frame), modules.js, loadout.js, barracks.js (the tabs)

// ---- Title and end screens ------------------------------------------------------------------------------
/** The achievements: done ones ticked, with the hull each unlocks. */
function drawAchievements(x, y) {
  text('Achievement  (' + ACHIEVEMENTS.filter(a => meta.ach[a.id]).length + ' / ' + ACHIEVEMENTS.length + ')', x, y, 18, '#ffd9a0', 'left');
  ACHIEVEMENTS.forEach((a, i) => {
    const yy = y + 26 + i * 22, done = !!meta.ach[a.id];
    text((done ? '✔ ' : '· ') + a.name, x, yy, 14, done ? HC.ok : HC.text, 'left');
    text(a.desc + (a.unlock ? '  → ' + HULLS[a.unlock].short : ''), x + 170, yy, 12, done ? '#8fa87a' : HC.dim, 'left');
  });
}
function drawTitle() {
  UI.buttons = [];
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(30,16,10,0.2)'); g.addColorStop(1, 'rgba(30,16,10,0.88)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  rrect(W / 2 - 430, 70, 860, 120, 8, 'rgba(28,20,16,0.7)', null);
  text('RUSTLINE COMMANDER', W / 2, 115, 62, '#ffcf8a');
  text('Un carro, una radio, poche squadre di disperati. La terra bruciata cambia a ogni run.', W / 2, 162, 18, HC.text);
  panel(W / 2 - 470, 220, 450, 300);
  text('Comandi', W / 2 - 450, 246, 18, '#ffd9a0', 'left');
  CONTROLS.forEach((c, i) => text(c, W / 2 - 450, 276 + i * 24, 14, HC.text, 'left'));
  panel(W / 2 + 20, 220, 450, 190);
  drawAchievements(W / 2 + 40, 246);
  drawHullPicker(W / 2 + 20, 420);
  rrect(W / 2 - 200, H - 100, 400, 50, 8, 'rgba(60,40,22,0.92)', '#d9a35a');
  text('Invio per iniziare', W / 2, H - 75, 26, '#fff2d8');
  button(W / 2 + 220, H - 96, 200, 42, 'Mappa di test  (T)', goTest, { size: 15 }); // no enemies: driving, orders, cover
  text(state.titleMsg || 'Fuggi per 8 settori fino all\'esercito e resisti all\'ultimo assalto dell\'Orda. Nuovi mezzi solo con gli achievement.', W / 2, H - 28, 15, state.titleMsg ? HC.gold : HC.text);
  // development only: wipes achievements and unlocked hulls
  button(W - 170, 16, 150, 32, 'RESET dati', resetMeta, { size: 13 });
}
function drawEnd(win) {
  UI.buttons = [];
  ctx.fillStyle = 'rgba(14,10,8,0.7)'; ctx.fillRect(0, 0, W, H);
  panel(W / 2 - 360, 80, 720, 540);
  text(state.gained || (win ? 'Vittoria' : 'Game over'), W / 2, 130, 44, win ? '#b6f08a' : '#ff9a7a');
  const mins = Math.floor(state.t / 60), secs = Math.floor(state.t % 60);
  const T = (state.carryT || 0) + state.t, mm = Math.floor(T / 60), ss = Math.floor(T % 60);
  const rows = [['Settori attraversati', (state.camp ? state.camp.sector : 1) + ' / 8'], ['Campi ripuliti', state.camps], ['Predoni abbattuti', state.kills], ['Rottami in tasca', state.scrap], ['Durata', mm + ' min ' + ss + ' s'], ['Nuovi achievement', (state.newAch || []).length ? state.newAch.join(', ') : 'nessuno']];
  rows.forEach((r, i) => { text(r[0], W / 2 - 300, 186 + i * 28, 18, HC.text, 'left'); text(String(r[1]), W / 2 + 300, 186 + i * 28, i === 5 ? 14 : 18, i === 5 ? HC.gold : HC.text, 'right'); });
  drawAchievements(W / 2 - 300, 370);
  button(W / 2 - 330, 556, 320, 46, 'Nuova run · ' + HULLS[HULL_PICK.id].name + '  (R / Invio)', restartRun, { size: 15 });
  button(W / 2 + 10, 556, 320, 46, 'Menu principale  (Esc)', goTitle, { size: 15 });
}
function drawFiguresLabels(labels) {
  rrect(W / 2 - 220, 14, 440, 40, 6, 'rgba(28,20,16,0.82)', null);
  text('Le figure di Rustline Commander', W / 2, 34, 22, HC.text);
  for (const l of labels) { ctx.font = `14px ${FONT}`; const w = ctx.measureText(l.name).width + 14; rrect(l.x - w / 2, l.y - 12, w, 24, 5, 'rgba(28,20,16,0.85)', null); text(l.name, l.x, l.y, 14, HC.text); }
}

// ---- Order aids: where infantry would take cover, the facing arrow ----------------------------------
/** An arrow lying on the ground from (x,z) along bearing a, len units long. */
function groundArrow(x, z, a, len, col, w) {
  const y = hAt(x, z) + 0.4, ex = x + Math.sin(a) * len, ez = z + Math.cos(a) * len;
  const p0 = toScreen(x, y, z), p1 = toScreen(ex, hAt(ex, ez) + 0.4, ez); if (!p0.on || !p1.on) return;
  const dx = p1.x - p0.x, dy = p1.y - p0.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hs = Math.min(16, L * 0.45);
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x - ux * hs * 0.6, p1.y - uy * hs * 0.6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x - ux * hs - uy * hs * 0.55, p1.y - uy * hs + ux * hs * 0.55); ctx.lineTo(p1.x - ux * hs + uy * hs * 0.55, p1.y - uy * hs - ux * hs * 0.55); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** A small shield on the ground: green for heavy cover, yellow for light. */
function coverPip(x, z, q, alpha) {
  const p = toScreen(x, hAt(x, z) + 0.3, z); if (!p.on) return;
  const col = q === 2 ? '#7fe35a' : '#f2d04a';
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10,14,8,0.75)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 10, 5, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = col; ctx.strokeStyle = '#10140c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p.x - 6, p.y - 11); ctx.lineTo(p.x + 6, p.y - 11); ctx.lineTo(p.x + 6, p.y - 5); ctx.quadraticCurveTo(p.x + 5, p.y + 1, p.x, p.y + 3); ctx.quadraticCurveTo(p.x - 5, p.y + 1, p.x - 6, p.y - 5); ctx.closePath(); ctx.fill(); ctx.stroke();
  if (q === 2) { ctx.fillStyle = '#10140c'; ctx.fillRect(p.x - 1, p.y - 9, 2, 9); ctx.fillRect(p.x - 4, p.y - 6, 8, 2); }
  ctx.restore();
}
/** The cover the selected infantry would take where the mouse is (or where the order arrow starts), and the arrow itself. */
function drawOrderAids() {
  const g = state.gest, at = g ? g.p : state.mouse3;
  const sel = selectedSquads().filter(sq => inRadio(sq));
  const bIn = at && !g && sel.length && (!state.arm || state.arm === 'cover') && !enemyUnderMouse() && sel.some(sq => alive(sq).some(m => !m.veh && m.kind !== 'at')) ? buildingAt(at.x, at.z) : null;
  if (bIn) { // a building under the mouse: the order is to go in
    if (!bIn.ruined && buildingWalls(bIn) < bIn.walls0 * tune.garrison_ruin) bIn.ruined = true;
    const lab = bIn.ruined ? 'Edificio crollato' : 'Entra nell\'edificio  ' + bIn.occ.length + '/' + bIn.cap;
    if (!bIn.ruined) coverPip(bIn.door.x, bIn.door.z, 2, 0.95);
    ctx.font = `bold 12px ${FONT}`; const w = ctx.measureText(lab).width + 16;
    rrect(MS.x + 16, MS.y - 30, w, 20, 4, 'rgba(10,14,12,0.85)', bIn.ruined ? '#e05a4a' : '#7fe35a');
    text(lab, MS.x + 24, MS.y - 20, 12, bIn.ruined ? '#f0a090' : '#b9f59a', 'left');
  } else if (at && sel.length && !(g ? g.tgt && g.face == null : enemyUnderMouse())) {
    const nInf = sel.reduce((a, sq) => a + alive(sq).filter(m => !m.veh).length, 0);
    const face = g ? g.face : null, kind = g ? g.kind : state.arm;
    if (nInf && kind !== 'move' && kind !== 'attack') {
      const key = Math.floor(at.x) + ',' + Math.floor(at.z) + ',' + (face == null ? '-' : face.toFixed(2)) + ',' + nInf + ',' + state.stepN;
      if (UI.coverKey !== key) {
        UI.coverKey = key;
        let threat = face != null ? { x: Math.sin(face), z: Math.cos(face) } : null;
        if (!threat) { const en = nearestEnemyTo(at.x, at.z, 0, 45); if (en) { const dx = en.x - at.x, dz = en.z - at.z, L = Math.hypot(dx, dz) || 1; threat = { x: dx / L, z: dz / L }; } }
        UI.coverSpots = coverSpotsAt(at.x, at.z, nInf, threat);
      }
      const sp = UI.coverSpots || [];
      for (const c of sp) coverPip(c.x, c.z, c.q, 0.95);
      if (sp.length && !g) {
        const heavy = sp.some(c => c.q === 2), veh = sp.some(c => c.veh);
        const lab = veh ? 'Al riparo del mezzo' : heavy ? 'Copertura pesante' : 'Copertura leggera';
        ctx.font = `bold 12px ${FONT}`; const w = ctx.measureText(lab).width + 16;
        rrect(MS.x + 16, MS.y - 30, w, 20, 4, 'rgba(10,14,12,0.85)', heavy ? '#7fe35a' : '#f2d04a');
        text(lab, MS.x + 24, MS.y - 20, 12, heavy ? '#b9f59a' : '#f7e39a', 'left');
      }
    }
  }
  if (g && g.face != null) {
    const col = g.kind === 'attack' ? '#ff6a4a' : g.kind === 'cover' ? '#8fe36a' : HC.cyan;
    groundArrow(g.p.x, g.p.z, g.face, Math.max(3, Math.min(14, Math.hypot(state.mouse3 ? state.mouse3.x - g.p.x : 0, state.mouse3 ? state.mouse3.z - g.p.z : 0))), col, 4);
    const p0 = toScreen(g.p.x, g.p.y + 0.4, g.p.z);
    if (p0.on) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p0.x, p0.y, 5, 0, 6.3); ctx.fill(); }
    text('direzione da tenere', MS.x + 18, MS.y + 18, 12, col, 'left');
  }
}

/** The order menu: the squads' name, then one row per order with its letter; the clicked point is marked on the ground. */
function drawMenu() {
  const m = state.menu; if (!m) return;
  const p0 = toScreen(m.p.x, m.p.y + 0.3, m.p.z);
  if (p0.on) { ctx.strokeStyle = HC.cyan; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p0.x, p0.y, 9, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(m.x, m.y + 12); ctx.stroke(); }
  if (m.face != null) groundArrow(m.p.x, m.p.z, m.face, 5, HC.cyan, 3);
  rrect(m.x, m.y, MENU.w, m.h, 7, 'rgba(18,14,11,0.94)', HC.edge);
  text(m.title, m.x + 12, m.y + 14, 13, HC.gold, 'left');
  text('Tab · Invio · Esc', m.x + MENU.w - 10, m.y + 14, 11, HC.dim, 'right');
  const hv = m.sel;
  m.items.forEach((it, k) => {
    const y = m.y + MENU.head + k * MENU.row;
    if (k === hv && !it.off) rrect(m.x + 4, y + 1, MENU.w - 8, MENU.row - 2, 4, 'rgba(79,227,224,0.18)', null);
    rrect(m.x + 10, y + 4, 20, 18, 3, it.off ? 'rgba(60,50,40,0.8)' : 'rgba(60,44,30,0.95)', it.off ? '#5a4a3a' : HC.edge);
    text(it.key, m.x + 20, y + 13, 12, it.off ? '#7a6a5a' : HC.gold);
    text(it.label, m.x + 40, y + 13, 13, it.off ? '#7a6a5a' : (it.col || HC.text), 'left');
  });
}

// ---- The tank's armour, seen from above: which face is thick, which face was just hit ----------------
function drawArmor(x, y, tk) {
  panel(x, y, 82, 128);
  text('CORAZZA', x + 41, y + 14, 11, HC.dim);
  const cx = x + 41, cy = y + 60, hw = 14, hh = 22;
  const flash = tk.lastHit && state.t - tk.lastHit.t < 0.9 ? tk.lastHit.side : null;
  const col = side => {
    if (flash === side && Math.floor(state.t * 10) % 2 === 0) return '#ff4a2a';
    const m = tune['armor_' + side]; return m <= 0.7 ? '#8fd86a' : m <= 1.1 ? '#f2d04a' : '#e07a3a';
  };
  ctx.fillStyle = '#2a2420'; ctx.fillRect(cx - hw, cy - hh, hw * 2, hh * 2);
  ctx.fillStyle = col('top'); ctx.globalAlpha = 0.35; ctx.fillRect(cx - hw + 4, cy - hh + 6, hw * 2 - 8, hh * 2 - 12); ctx.globalAlpha = 1;
  ctx.fillStyle = col('front'); ctx.fillRect(cx - hw, cy - hh - 5, hw * 2, 6);
  ctx.fillStyle = col('rear'); ctx.fillRect(cx - hw, cy + hh - 1, hw * 2, 6);
  ctx.fillStyle = col('side'); ctx.fillRect(cx - hw - 5, cy - hh, 6, hh * 2); ctx.fillRect(cx + hw - 1, cy - hh, 6, hh * 2);
  // the turret, turned as it is on the hull
  const a = angDiff(tk.heading, tk.turretYaw);
  ctx.save(); ctx.translate(cx, cy + 2); ctx.rotate(-a);
  ctx.fillStyle = '#6f7f47'; ctx.fillRect(-7, -7, 14, 14); ctx.fillStyle = '#c8c2b2'; ctx.fillRect(-1.5, -24, 3, 18);
  ctx.restore();
  text('x' + tune.armor_front.toFixed(1), cx, cy - hh - 14, 11, '#b9f59a');
  text('x' + tune.armor_rear.toFixed(1), cx, cy + hh + 14, 11, '#f0a070');
  const S = tankStats();
  if (S.seats) { const n = passengers().length; text('Posti ' + n + '/' + S.seats, cx, y + 118, 11, n ? '#9fe3a0' : HC.dim); }
}

// ---- The development panel (F2) --------------------------------------------------------------------------
function drawDevPanel() {
  UI.buttons = [];
  const x0 = W - 314, y0 = 270, w = 300, h = H - y0 - 14;
  UI.devRect = { x: x0, y: y0, w, h };
  rrect(x0, y0, w, h, 6, 'rgba(26,18,34,0.94)', '#b48cff');
  text('SVILUPPO', x0 + 12, y0 + 14, 14, '#d8c0ff', 'left'); text('F2 · K nemico · J alleato · L carro · N settore', x0 + w - 10, y0 + 14, 11, '#a890c8', 'right');
  let y = y0 + 30;
  if (!state.squads.length) { text('Nessuna squadra: scegli un tipo e "Nuova".', x0 + 12, y + 8, 12, '#a890c8', 'left'); y += 22; }
  state.squads.forEach((sq, i) => {
    const on = state.devSq === i;
    button(x0 + 8, y, w - 16, 20, '', () => { state.devSq = i; }, { active: on });
    text((i + 1) + '. ' + sq.name, x0 + 14, y + 10, 12, on ? '#eaf7d0' : HC.text, 'left');
    sq.slots.forEach((k, j) => { const m = sq.members[j]; unitIcon(k, x0 + 186 + j * 13, y + 10, 11, m && m.alive ? '#a8d870' : '#5a3a32'); });
    y += 22;
  });
  y += 4;
  text('Tipo', x0 + 12, y + 6, 11, '#a890c8', 'left'); y += 14;
  DEV_KINDS.forEach((k, i) => {
    const bx0 = x0 + 8 + (i % 4) * 71, by0 = y + Math.floor(i / 4) * 24;
    button(bx0, by0, 68, 22, '', () => { state.devKind = k; }, { active: state.devKind === k });
    unitIcon(k, bx0 + 11, by0 + 11, 14, '#a8d870');
    text(UT[k].name.split(' ')[0].slice(0, 9), bx0 + 21, by0 + 11, 11, HC.text, 'left');
  });
  y += 52;
  const sq = devSquad(), B = (i, row, label, fn, o) => button(x0 + 8 + i * 71, y + row * 26, 68, 23, label, fn, Object.assign({ size: 11 }, o || {}));
  B(0, 0, '+ Aggiungi', () => devAddMember(sq, state.devKind), { off: !sq });
  B(1, 0, '− Togli', () => devRemoveMember(sq), { off: !sq });
  B(2, 0, 'Nuova', () => devAddSquad(state.devKind));
  B(3, 0, 'Elimina', () => devDeleteSquad(sq), { off: !sq });
  B(0, 1, 'Rimpiazza', () => devRefill(sq), { off: !sq });
  B(1, 1, 'Cura carro', () => { state.tank.hp = state.tank.maxhp; });
  B(2, 1, '+500', () => { state.scrap += 500; });
  B(3, 1, state.god ? 'Dio: ON' : 'Dio: off', () => { state.god = !state.god; }, { active: !!state.god });
  B(0, 2, 'Sblocca mezzi', () => { meta.unlocked = HULL_IDS.slice(); saveMeta(); });
  B(1, 2, tune.fog ? 'Nebbia ON' : 'Nebbia off', () => { CONFIG.fog.value = tune.fog ? 0 : 1; state.fogT = 0; }, { active: !!tune.fog });
  B(2, 2, 'Uccidi vicini', () => devKillNear(45));
  B(3, 2, 'Alleato', () => devSpawnAlly(state.devKind || 'rifle', state.tank.x + 5, state.tank.z + 5));
  y += 84;
  text('Nemico da piazzare (K)', x0 + 12, y + 6, 11, '#a890c8', 'left'); y += 14;
  DEV_ENEMIES.forEach((k, i) => {
    const bx0 = x0 + 8 + (i % 5) * 57, by0 = y + Math.floor(i / 5) * 25;
    button(bx0, by0, 54, 22, '', () => { state.devEnemy = k; }, { active: state.devEnemy === k });
    text((ENEMY[k] && ENEMY[k].short) || k, bx0 + 27, by0 + 11, 11, HC.text);
  });
}

// ---- The hull picker on the title screen ------------------------------------------------------------------
function drawHullPicker(x, y) {
  panel(x, y, 450, 184);
  text('Mezzo di comando  (click o frecce)', x + 20, y + 18, 16, '#ffd9a0', 'left');
  HULL_IDS.forEach((id, i) => {
    const H0 = HULLS[id], bx0 = x + 14 + i * 144, on = HULL_PICK.id === id, open = meta.unlocked.includes(id);
    button(bx0, y + 34, 138, 140, '', () => { if (open) HULL_PICK.id = id; }, { active: on, off: !open });
    hullIcon(id, bx0 + 69, y + 66, !open ? '#4a4038' : on ? '#b6d77a' : '#8a9a6a');
    text(H0.name, bx0 + 69, y + 98, 14, on ? '#eaf7d0' : open ? HC.text : '#7a6a58');
    if (open) H0.desc.forEach((l, k) => text(l, bx0 + 69, y + 120 + k * 15, 11, HC.dim));
    else { // locked: which achievements open it
      text('BLOCCATO', bx0 + 69, y + 120, 12, '#e08a6a');
      ACHIEVEMENTS.filter(a => a.unlock === id).forEach((a, k) => text(a.name, bx0 + 69, y + 137 + k * 14, 10, HC.dim));
    }
  });
}
/** A side view of a hull, drawn small. */
function hullIcon(id, x, y, col) {
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
  if (id === 'mbt') { ctx.fillRect(-30, -2, 60, 12); ctx.fillRect(-14, -12, 28, 10); ctx.fillRect(14, -9, 30, 4); }
  if (id === 'light') { ctx.fillRect(-24, 0, 48, 10); ctx.fillRect(-10, -9, 20, 9); ctx.fillRect(10, -6, 20, 3); }
  if (id === 'apc') { ctx.fillRect(-30, -8, 60, 18); ctx.fillRect(-4, -14, 12, 6); ctx.fillRect(8, -12, 14, 2); ctx.fillStyle = '#1d1b1a'; ctx.fillRect(-26, -4, 6, 6); ctx.fillRect(-16, -4, 6, 6); }
  ctx.fillStyle = '#1d1b1a'; ctx.fillRect(id === 'light' ? -24 : -30, 10, id === 'light' ? 48 : 60, 5);
  ctx.restore();
}
