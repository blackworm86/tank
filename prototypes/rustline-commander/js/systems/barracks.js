// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The barracks and repairs: replacements, new squads, support vehicles, hull repair. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The workshop and the barracks ------------------------------------------------------------------
/** What the squad lost: the fallen still on its card, and those who already left it (sq.fallen: pruneFallen). */
function missingIn(sq) { return sq.slots.map((k, i) => (!sq.members[i] || !sq.members[i].alive) ? k : null).filter(Boolean).concat(sq.fallen || []); }
function reinforceCost(sq) { return missingIn(sq).reduce((a, k) => a + tune[UT[k].cost], 0); }
function reinforce(sq) {
  const miss = missingIn(sq); if (!miss.length) { state.shopMsg = 'Squadra al completo.'; return; }
  const c = reinforceCost(sq); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c;
  const s = state.shopSite;
  sq.slots.forEach((k, i) => {
    if (sq.members[i] && sq.members[i].alive) return;
    const p = spotNear(s.x + 0.5, s.z + 0.5, i); const m = spawn(k, p.x, p.z); m.squad = sq; sq.members[i] = m;
  });
  for (const k of sq.fallen || []) { // those who left the card come back as new slots
    const i = sq.slots.length, p = spotNear(s.x + 0.5, s.z + 0.5, i), m = spawn(k, p.x, p.z);
    m.squad = sq; sq.slots.push(k); sq.members.push(m);
  }
  sq.fallen = []; if (!sq.named) sq.name = squadName(sq.slots);
  sq.order = { t: 'follow' };
  state.shopMsg = sq.name + ': rimpiazzi arruolati (' + miss.length + ').'; sfx('coin');
}
function rosterCost(r) { return r.reduce((a, k) => a + tune[UT[k].cost], 0); }
function recruitRoster() {
  const r = state.roster; if (!r.length) { state.shopMsg = 'Aggiungi soldati alla nuova squadra.'; return; }
  if (state.squads.length >= maxSquads()) { state.shopMsg = 'Massimo ' + maxSquads() + ' squadre.'; return; }
  const c = rosterCost(r); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c;
  const s = state.shopSite, sq = addSquad(r, s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = sq.name + ' arruolata.'; state.roster = []; sfx('coin');
}
/** Buys a support vehicle (car or ltank) as a squad of its own. */
function buyVehicle(kind) {
  const cost = tune[UT[kind].cost];
  if (state.squads.length >= maxSquads()) { state.shopMsg = 'Massimo ' + maxSquads() + ' squadre.'; return; }
  if (state.scrap < cost) { state.shopMsg = 'Servono ' + cost + ' rottami.'; return; }
  state.scrap -= cost;
  const s = state.shopSite, sq = addSquad([kind], s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = UT[kind].name + ' pronto.'; sfx('coin');
}
function buyCar() { buyVehicle('car'); }
function repairCost(n) { return Math.ceil(n * tune.repair_cost); }
function repair(all) {
  const tk = state.tank, miss = Math.ceil(tk.maxhp - tk.hp); if (miss <= 0) { state.shopMsg = 'Il carro è integro.'; return; }
  let n = all ? miss : Math.min(miss, 50);
  if (state.scrap < repairCost(n)) n = Math.floor(state.scrap / Math.max(0.01, tune.repair_cost));
  if (n <= 0) { state.shopMsg = 'Non bastano i rottami.'; return; }
  state.scrap -= repairCost(n); tk.hp = Math.min(tk.maxhp, tk.hp + n);
  state.shopMsg = 'Riparati ' + n + ' punti.'; sfx('coin');
}

// ---- The workshop tabs (js/systems/workshop.js) ------------------------------------------------------------
registerShopTab('barracks', {
  name: 'Caserma', order: 40,
  draw(x0, y0, w, h, cy) {
    text('Le tue squadre', x0 + 24, cy + 6, 17, '#ffd9a0', 'left');
    state.squads.forEach((sq, i) => {
      const yy = cy + 24 + i * 56, miss = missingIn(sq).length, c = reinforceCost(sq);
      rrect(x0 + 24, yy, 480, 50, 5, 'rgba(0,0,0,0.3)', '#5a4030');
      text((i + 1) + '. ' + sq.name, x0 + 36, yy + 15, 15, HC.text, 'left');
      sq.slots.concat(sq.fallen || []).forEach((k, j) => { const m = sq.members[j]; unitIcon(k, x0 + 44 + j * 24, yy + 36, 18, m && m.alive ? '#a8d870' : '#5a3a32'); }); // the fallen after the living
      squadMod(sq); text((sq.traits || []).map(t => t.name).join(' · '), x0 + 150, yy + 37, 11, '#b6d77a', 'left');
      if (miss) button(x0 + 300, yy + 8, 194, 34, 'Rimpiazza ' + miss + ' (' + c + ')', () => reinforce(sq), { off: state.scrap < c, size: 14 });
      else text('Al completo', x0 + 494, yy + 25, 14, HC.ok, 'right');
    });
    if (!state.squads.length) text('Nessuna squadra.', x0 + 24, cy + 40, 15, HC.dim, 'left');
    const rx = x0 + 540;
    text('Nuova squadra su misura (max ' + tune.squad_max_size + ' soldati)', rx, cy + 6, 17, '#ffd9a0', 'left');
    let hov = null;
    INF_KINDS.forEach((k, i) => {
      const bx0 = rx + (i % 3) * 154, by0 = cy + 26 + Math.floor(i / 3) * 52;
      if (MS.x >= bx0 && MS.x <= bx0 + 148 && MS.y >= by0 && MS.y <= by0 + 46) hov = k;
      button(bx0, by0, 148, 46, '', () => { if (state.roster.length < tune.squad_max_size) state.roster.push(k); }, { off: state.roster.length >= tune.squad_max_size });
      unitIcon(k, bx0 + 20, by0 + 24, 24, '#a8d870');
      text('+ ' + UT[k].name, bx0 + 38, by0 + 16, 14, HC.text, 'left'); text(tune[UT[k].cost] + ' rottami', bx0 + 38, by0 + 33, 13, HC.gold, 'left');
    });
    const ry = cy + 190;
    rrect(rx, ry, 456, 60, 5, 'rgba(0,0,0,0.3)', '#5a4030');
    const rtr = traitsOf(state.roster);
    if (state.roster.length) {
      text(squadName(state.roster), rx + 12, ry + 16, 15, HC.text, 'left'); state.roster.forEach((k, j) => unitIcon(k, rx + 22 + j * 26, ry + 42, 20, '#a8d870'));
      text(rtr.map(t => t.name).join(' · '), rx + 140, ry + 42, 12, '#b6d77a', 'left');
    }
    else { text('Scegli i soldati qui sopra: un cecchino solitario, un team', rx + 12, ry + 20, 13, HC.dim, 'left'); text('di mitraglieri, fucilieri con un medico...', rx + 12, ry + 40, 13, HC.dim, 'left'); }
    const rc = rosterCost(state.roster);
    button(rx, ry + 70, 150, 38, 'Svuota', () => { state.roster = []; });
    button(rx + 160, ry + 70, 296, 38, 'Arruola (' + rc + ' rottami)', recruitRoster, { off: !state.roster.length || state.scrap < rc || state.squads.length >= maxSquads() });
    [['jeep', 'Jeep'], ['car', 'Autoblindo'], ['ltank', 'Carro supporto']].forEach(([k, d], i) => {
      const c = tune[UT[k].cost], bx0 = rx + i * 154;
      button(bx0, ry + 124, 148, 46, '', () => buyVehicle(k), { off: state.scrap < c || state.squads.length >= maxSquads() });
      unitIcon(k, bx0 + 20, ry + 147, 22, '#a8d870');
      text(d, bx0 + 40, ry + 139, 13, HC.text, 'left'); text(c + ' rottami', bx0 + 40, ry + 157, 12, HC.gold, 'left');
    });
    text('Squadre: ' + state.squads.length + ' / ' + maxSquads(), rx, ry + 190, 14, HC.dim, 'left');
    // the role under the mouse, or what the new squad's make-up gives it
    if (hov) { text(UT[hov].name, rx, ry + 214, 14, '#ffd9a0', 'left'); wrap(ROLE_DESC[hov], 456, 13).slice(0, 2).forEach((l, k) => text(l, rx, ry + 232 + k * 16, 13, HC.text, 'left')); }
    else if (rtr.length) rtr.slice(0, 4).forEach((t, k) => text(t.name + ': ' + t.desc, rx, ry + 214 + k * 17, 13, t.bad ? '#e0a070' : '#b6d77a', 'left'));
    else text('Passa sopra un ruolo per leggere cosa fa. La composizione dà bonus e malus.', rx, ry + 214, 12, HC.dim, 'left');
  },
});
registerShopTab('repair', {
  name: 'Riparazioni', order: 50,
  draw(x0, y0, w, h, cy) {
    const tk = state.tank, miss = Math.ceil(tk.maxhp - tk.hp);
    text('Integrità del carro', x0 + 24, cy + 14, 17, HC.text, 'left');
    bar(x0 + 24, cy + 32, 520, 22, tk.hp / tk.maxhp, '#8fd86a');
    text(Math.ceil(tk.hp) + ' / ' + Math.round(tk.maxhp), x0 + 284, cy + 43, 14, '#10140c');
    button(x0 + 24, cy + 72, 250, 44, 'Ripara 50 (' + repairCost(Math.min(50, Math.max(0, miss))) + ')', () => repair(false), { off: miss <= 0 });
    button(x0 + 294, cy + 72, 250, 44, 'Ripara tutto (' + repairCost(Math.max(0, miss)) + ')', () => repair(true), { off: miss <= 0 });
    text('Il carro si ripara qui, tra un settore e l\'altro (e dai genieri sul campo). Ogni rottame conta.', x0 + 24, cy + 140, 14, HC.dim, 'left');
    // the plates: they stop less and less as they wear, nothing at 0, until they are made whole here
    text('Placche di corazza', x0 + 24, cy + 186, 17, HC.text, 'left');
    const pl = hardpoints().map(p => ({ p, f: state.fit[p.id] })).filter(o => o.f && MODULES[o.f.id].plate);
    if (!pl.length) text('Nessuna placca montata: si comprano come moduli (fronte, fianchi).', x0 + 24, cy + 212, 13, HC.dim, 'left');
    pl.forEach(({ p, f }, i) => {
      const yy = cy + 200 + i * 50, M = MODULES[f.id], c = plateRepairCost(f);
      rrect(x0 + 24, yy, 700, 44, 5, 'rgba(0,0,0,0.3)', '#5a4030');
      text(p.name + ': ' + M.name, x0 + 36, yy + 14, 14, RARITY[M.r].col, 'left');
      bar(x0 + 36, yy + 26, 300, 9, f.cond, f.cond > 0.5 ? '#8fd86a' : f.cond > 0 ? '#e0a050' : '#5a3a32');
      text(f.cond > 0 ? Math.round(f.cond * 100) + '%: ferma il ' + Math.round(M.plate.k * f.cond * 100) + '% invece del ' + Math.round(M.plate.k * 100) + '%' : 'Distrutta: non ferma più niente', x0 + 346, yy + 31, 12, f.cond > 0 ? HC.dim : '#e0503a', 'left');
      button(x0 + 560, yy + 6, 156, 32, c ? 'Ripara (' + c + ')' : 'Integra', () => repairPlate(p.id), { off: !c || state.scrap < c, size: 13 });
    });
    const wp = wornPlates(), wc = wp.reduce((a, o) => a + plateRepairCost(o.f), 0);
    if (wp.length > 1) button(x0 + 740, cy + 200, 220, 44, 'Ripara tutte (' + wc + ')', repairAllPlates, { off: state.scrap < wc, size: 14 });
  },
});
