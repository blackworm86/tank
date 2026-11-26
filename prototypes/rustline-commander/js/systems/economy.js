// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The run's economy and end: pickups, camps, the shop's reach, winning and losing. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The run: pickups, camps, the shop's reach, the end ----------------------------------------------
function updateRun(dt) {
  const tk = state.tank;
  state.achT = (state.achT || 0) - dt; if (state.achT <= 0) { state.achT = 1; checkAch(); }
  if (tk.alive) {
    for (const p of state.pickups) {
      if (p.taken || Math.hypot(p.x - tk.x, p.z - tk.z) > 3.6) continue;
      if (p.ammo || p.loot) { if (takeCrate(p)) p.taken = true; continue; }
      p.taken = true; state.scrap += p.value; floatText(p.x, hAt(p.x, p.z) + 2, p.z, '+' + p.value + ' rottami', '#ffd36a'); sfx('coin');
      if (p.wreck) say('Radio', 'Relitto smontato: ' + p.value + ' rottami.', '#ffd36a');
    }
  }
  for (const g of state.groups) {
    if (g.cleared || g.kind !== 'camp') continue;
    if (g.members.every(m => !m.alive)) {
      g.cleared = true; g.site.cleared = true; state.camps++;
      for (const sq of state.squads) for (const m of alive(sq)) giveXp(m, tune.xp_camp);
      const bonus = Math.round(tune.scrap_camp * g.site.tier);
      dropLoot(g.home.x + 2, g.home.z + 1, tune.loot_camp); dropAmmo(g.home.x - 2, g.home.z - 1, 6, tune.ammo_drop_camp);
      state.scrap += bonus; sfx('coin');
      say('Radio', g.site.name + ' ripulito! +' + bonus + ' rottami. Spendili all\'officina, all\'uscita dal settore.', '#9fe3a0');
      floatText(g.home.x, g.site.g + 4, g.home.z, '+' + bonus + ' rottami', '#ffd36a');
    }
  }
  state.canShop = null; // no garages on the map: the field workshop opens at the exit (campaign.js leaveSector)
  if (state.tut >= 1 && !state.campHint) {
    const c = world.sites.camps.find(c => !c.cleared && Math.hypot(c.x - tk.x, c.z - tk.z) < 48);
    if (c) { state.campHint = true; say('Radio', c.name + ' avvistato: bunker e torretta di legno. Il cannone li apre, le squadre ripuliscono.', '#9fe3a0'); }
  }
  if (typeof campaignUpdate === 'function') campaignUpdate(dt);
  if (state.result && state.t >= state.endT) endRun();
}
/** Checks the achievements one last time and moves to the end screen. */
function endRun() {
  const win = state.result === 'win';
  const sector = state.camp ? state.camp.sector : 1;
  checkAch();
  state.gained = win ? 'L\'Orda è respinta!' : 'Il carro comando è perso · settore ' + sector + '/8';
  state.goScene = win ? 'results' : 'over';
  state.result = null;
}
