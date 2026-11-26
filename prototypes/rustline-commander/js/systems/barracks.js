// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The barracks and repairs: replacements, new squads, support vehicles, hull repair. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The workshop and the barracks ------------------------------------------------------------------
function missingIn(sq) { return sq.slots.map((k, i) => (!sq.members[i] || !sq.members[i].alive) ? k : null).filter(Boolean); }
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
