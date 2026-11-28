// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The barracks and repairs: replacements, new squads, support vehicles, hull repair. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The workshop and the barracks ------------------------------------------------------------------
/** What the squad lost: the fallen still on its card, and those who already left it (sq.fallen: pruneFallen). */
function missingIn(sq) { return sq.slots.map((k, i) => (!sq.members[i] || !sq.members[i].alive) ? k : null).filter(Boolean).concat(sq.fallen || []); }
/** Replacements are Recruits (iteration 62); a vehicle comes back as itself. */
function replacement(k) { return UT[k].veh ? k : 'recruit'; }
function reinforceCost(sq) { return missingIn(sq).reduce((a, k) => a + tune[UT[replacement(k)].cost], 0); }
function reinforce(sq) {
  const miss = missingIn(sq); if (!miss.length) { state.shopMsg = 'Squadra al completo.'; return; }
  const c = reinforceCost(sq); if (state.scrap < c) { state.shopMsg = 'Servono ' + c + ' rottami.'; return; }
  state.scrap -= c;
  const s = state.shopSite;
  sq.slots.forEach((k, i) => {
    if (sq.members[i] && sq.members[i].alive) return;
    const p = spotNear(s.x + 0.5, s.z + 0.5, i); k = sq.slots[i] = replacement(k); const m = spawn(k, p.x, p.z); m.squad = sq; sq.members[i] = m;
  });
  for (const k0 of sq.fallen || []) { // those who left the card come back as new slots, Recruits
    const k = replacement(k0), i = sq.slots.length, p = spotNear(s.x + 0.5, s.z + 0.5, i), m = spawn(k, p.x, p.z);
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
/** Buys a support vehicle (jeep or support tank) as a squad of its own. */
function buyVehicle(kind) {
  const cost = tune[UT[kind].cost];
  if (state.squads.length >= maxSquads()) { state.shopMsg = 'Massimo ' + maxSquads() + ' squadre.'; return; }
  if (state.scrap < cost) { state.shopMsg = 'Servono ' + cost + ' rottami.'; return; }
  state.scrap -= cost;
  const s = state.shopSite, sq = addSquad([kind], s.x + 0.5, s.z + 0.5); sq.order = { t: 'follow' };
  state.shopMsg = UT[kind].name + ' pronto.'; sfx('coin');
}
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
      squadMod(sq); text((sq.traits || []).map(t => t.name).join(' · '), x0 + 40 + (sq.slots.length + (sq.fallen || []).length) * 24, yy + 37, 11, '#b6d77a', 'left'); // past the icons
      if (miss) button(x0 + 300, yy + 8, 194, 34, 'Rimpiazza ' + miss + ' (' + c + ')', () => reinforce(sq), { off: state.scrap < c, size: 14 });
      else text('Al completo', x0 + 494, yy + 25, 14, HC.ok, 'right');
    });
    if (!state.squads.length) text('Nessuna squadra.', x0 + 24, cy + 40, 15, HC.dim, 'left');
    const rx = x0 + 540, n = Math.max(1, Math.min(tune.squad_max_size, state.recruitN || tune.squad_max_size)), rc = n * tune.cost_recruit;
    text('Nuova squadra di reclute', rx, cy + 6, 17, '#ffd9a0', 'left');
    wrap('Tutti partono da Recluta: con l\'esperienza ognuno sceglie il suo incarico dalla scheda della squadra (Fuciliere, Esploratore, Medico, Geniere, poi le specializzazioni).', 456, 13).slice(0, 3).forEach((l, k) => text(l, rx, cy + 30 + k * 17, 13, HC.dim, 'left'));
    button(rx, cy + 86, 44, 40, '-', () => { state.recruitN = Math.max(1, n - 1); }, { off: n <= 1 });
    rrect(rx + 50, cy + 86, 150, 40, 5, 'rgba(0,0,0,0.3)', '#5a4030');
    for (let j2 = 0; j2 < n; j2++) unitIcon('recruit', rx + 64 + j2 * 22, cy + 106, 18, '#a8d870');
    button(rx + 206, cy + 86, 44, 40, '+', () => { state.recruitN = Math.min(tune.squad_max_size, n + 1); }, { off: n >= tune.squad_max_size });
    button(rx + 260, cy + 86, 196, 40, 'Arruola ' + n + ' (' + rc + ')', () => { state.roster = Array(n).fill('recruit'); recruitRoster(); }, { off: state.scrap < rc || state.squads.length >= maxSquads() });
    const ry = cy + 140;
    text('Mezzi di supporto (una squadra ciascuno)', rx, ry, 15, '#ffd9a0', 'left');
    [['jeep', 'Jeep'], ['ltank', 'Carro supporto']].forEach(([k, d], i) => {
      const c = tune[UT[k].cost], bx0 = rx + i * 154;
      button(bx0, ry + 14, 148, 46, '', () => buyVehicle(k), { off: state.scrap < c || state.squads.length >= maxSquads() });
      unitIcon(k, bx0 + 20, ry + 37, 22, '#a8d870');
      text(d, bx0 + 40, ry + 29, 13, HC.text, 'left'); text(c + ' rottami', bx0 + 40, ry + 47, 12, HC.gold, 'left');
    });
    text('Squadre: ' + state.squads.length + ' / ' + maxSquads() + '   ·   al massimo ' + tune.squad_max_size + ' soldati per squadra', rx, ry + 80, 14, HC.dim, 'left');
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
  },
});
