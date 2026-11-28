// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// The workshop: the screen between the sectors (or at an outpost), its frame, its keys and the downgrade
// question. Its tabs are registered by the systems that own them (modules.js, loadout.js, barracks.js);
// a new tab is one registerShopTab() call. (docs/architecture/rustline-modular-plan.md)
'use strict';

/**
 * The workshop's tabs. An entry:
 *   name (the button), order (its place, low first; the keys 1-9 follow it), draw(x0, y0, w, h, cy)
 *   (the tab's content: the panel's corner and size, cy the top of the content under the buttons);
 * optional: preview (the 3D view shows the vehicle turning in the tab's window).
 */
const SHOP_TABS = adopt('shopTab', {});
/** Adds a workshop tab. */
function registerShopTab(id, D) { return register('shopTab', id, D); }
/** The tabs' ids in their order. */
function shopTabs() { return Object.keys(SHOP_TABS).sort((a, b) => (SHOP_TABS[a].order || 0) - (SHOP_TABS[b].order || 0)); }
/** The tab on screen (the first one when the state names none that exists). */
function shopTab() { return SHOP_TABS[state.shopTab] || SHOP_TABS[shopTabs()[0]]; }

/** The workshop screen: the frame, the tab buttons, the tab on screen, the message and the question. */
function drawShop() {
  UI.buttons = [];
  ctx.fillStyle = 'rgba(14,10,8,0.6)'; ctx.fillRect(0, 0, W, H);
  const x0 = 110, y0 = 40, w = W - 220, h = H - 80;
  panel(x0, y0, w, h);
  text(state.sandbox ? 'Officina di prova · tutto gratis' : state.shopSite.field ? 'Officina da campo - prima di partire' : 'Officina - ' + state.shopSite.name, x0 + 24, y0 + 30, 24, '#ffd9a0', 'left');
  gearIcon(x0 + w - 200, y0 + 30, 10, HC.gold); text(state.sandbox ? 'rottami illimitati' : state.scrap + ' rottami', x0 + w - 184, y0 + 30, 18, HC.gold, 'left');
  const tabs = shopTabs(), tw = Math.min(176, Math.floor((w - 48) / Math.max(1, tabs.length)));
  tabs.forEach((id, i) => button(x0 + 24 + i * tw, y0 + 56, tw - 8, 34, (i + 1) + '  ' + SHOP_TABS[id].name, () => { state.shopTab = id; state.shopMsg = ''; }, { active: state.shopTab === id }));
  const cy = y0 + 106, T = shopTab();
  if (T) T.draw(x0, y0, w, h, cy);
  if (state.shopMsg) text(state.shopMsg, x0 + w / 2, y0 + h - 26, 16, HC.gold);
  if (state.leaving) { text('Invio o Esc: parti per la mappa della campagna   Backspace: resta nel settore', x0 + w - 24, y0 + h - 26, 14, HC.dim, 'right'); }
  else text(state.sandbox ? 'K o Esc: torna alla mappa di test' : 'Esc: torna al campo', x0 + w - 24, y0 + h - 26, 14, HC.dim, 'right');
  if (state.confirm) { // the downgrade question: only its two buttons answer
    UI.buttons = [];
    ctx.fillStyle = 'rgba(10,8,6,0.6)'; ctx.fillRect(0, 0, W, H);
    const cw = 560, ch = 190, cx = (W - cw) / 2, cy2 = (H - ch) / 2;
    panel(cx, cy2, cw, ch);
    text(state.confirm.title, W / 2, cy2 + 34, 24, '#ffd9a0');
    wrap(state.confirm.text, cw - 60, 15).slice(0, 3).forEach((l, k) => text(l, W / 2, cy2 + 70 + k * 20, 15, HC.text));
    button(cx + 60, cy2 + ch - 56, 200, 40, 'Sì, smonta', () => { const f = state.confirm.yes; state.confirm = null; f(); });
    button(cx + cw - 260, cy2 + ch - 56, 200, 40, 'Annulla', () => { state.confirm = null; state.shopMsg = ''; });
  }
  ctx.fillStyle = '#ffe6a0'; ctx.beginPath(); ctx.moveTo(MS.x, MS.y); ctx.lineTo(MS.x + 13, MS.y + 5); ctx.lineTo(MS.x + 6, MS.y + 7); ctx.lineTo(MS.x + 4, MS.y + 14); ctx.closePath(); ctx.fill();
}

/** The workshop's keys: 1-9 pick a tab, the question's answers, leaving or staying. */
function workshopInput() {
  const tabs = shopTabs();
  for (let i = 0; i < tabs.length && i < 9; i++) if (pressed('Digit' + (i + 1))) state.shopTab = tabs[i];
  clickButtons();
  if (state.confirm) { if (pressed('Escape')) state.confirm = null; else if (pressed('Enter')) { const f = state.confirm.yes; state.confirm = null; f(); } }
  else if (state.leaving && pressed('Backspace')) { state.leaving = false; scene = 'play'; }
  else if (state.leaving && (pressed('Escape') || pressed('Enter'))) { departSector(); follow(); }
  else if (pressed('Escape') || (state.sandbox && pressed('KeyK'))) scene = 'play';
  MS.lp = MS.rp = MS.lr = MS.rr = false;
}
