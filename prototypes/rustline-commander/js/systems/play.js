// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The play step: what runs each fixed step in a sector, in order. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The play step ----------------------------------------------------------------------------------
/** One fixed step of play. */
function stepPlay(dt) {
  if (pressed('Space') && state.tank.alive) setTacticalPause(!state.tpause);
  if (state.tpause) { // frozen: only orders and the camera move
    if (R3.ready) state.mouse3 = pickWorld(MS.x, MS.y);
    handleInput();
    if (!state.rename && !state.menu) panCamera(dt); // the menu open: no letter moves the view
    MS.lp = MS.rp = MS.lr = MS.rr = false; MS.wheel = 0;
    return;
  }
  state.t += dt; state.stepN++; state.snd = 0;
  if (R3.ready) state.mouse3 = pickWorld(MS.x, MS.y);
  handleInput();
  updateTank(dt);
  for (const sq of state.squads) { squadUpkeep(sq, dt); for (const m of sq.members) if (m) m.selected = sq.selected && m.alive; }
  pruneFallen(); // the fallen leave their cards, an empty squad goes (squads.js)
  updateUnits(dt);
  updateProjectiles(dt);
  updateEffects(dt);
  updateRun(dt);
  emit('playStep', dt); // core.js events: anything that runs each step of play (the test map's targets)
  const tk = state.tank, aim = state.mode === 'tank' && state.mouse3 ? state.mouse3 : null;
  let lx = 0, lz = 0;
  if (aim) { lx = (aim.x - tk.x) * 0.22; lz = (aim.z - tk.z) * 0.22; const L = Math.hypot(lx, lz); if (L > 12) { lx *= 12 / L; lz *= 12 / L; } }
  const k = Math.min(1, dt * 4);
  if (state.mode === 'cmd') { if (!state.rename && !state.menu) panCamera(dt); } // command mode: the view is the player's to move
  else { cam.x += (tk.x + lx - cam.x) * k; cam.z += (tk.z + lz - cam.z) * k; cam.y += (tk.vy - cam.y) * k; }
  cam.shake *= 0.9;
  MS.lp = MS.rp = MS.lr = MS.rr = false; MS.wheel = 0;
}
function handleInput() {
  const tk = state.tank;
  if (!MS.l) state.menuBlock = false;
  if (state.rename) { MS.lp = MS.rp = false; return; } // typing a squad's name: keys go to the name
  if (pressed('F1')) state.help = !state.help;
  if (cardInput()) return;
  if (state.menu) { // the order menu takes the mouse and the order keys till it closes
    if (MS.rp || !tk.alive) state.menu = null; // a new right-click: a new order (and a new menu)
    else { menuInput(); return; }
  }
  if (pressed('KeyQ')) cam.yawT -= Math.PI / 2;
  if (pressed('KeyE') && !state.canShop) cam.yawT += Math.PI / 2;
  if (MS.wheel) cam.dist = Math.max(tune.cam_dist_min, Math.min(tune.cam_dist_max, cam.dist * (MS.wheel > 0 ? 1.1 : 0.9)));
  // the left hand: 1-6 pick a squad (Shift adds), Alt+1-6 puts the chosen soldiers in that squad, the key left of 1 picks them all
  const alt = down.has('AltLeft') || down.has('AltRight');
  if (state.tpause) { // squads are picked and ordered only in the tactical pause
    for (let i = 0; i < 6; i++) if (pressed('Digit' + (i + 1))) { if (alt) regroupTo(i); else { selectSquad(state.squads[i], down.has('ShiftLeft') || down.has('ShiftRight')); state.picked = null; } }
    if (pressed('Backquote') || pressed('IntlBackslash')) { for (const s of state.squads) s.selected = alive(s).length > 0; state.picked = null; }
    // iteration 69: H halt, B board or unload, U out; I L O cycle the rules, the gait and the formation of the chosen squads
    const each = f => { for (const sq of selectedSquads()) { if (inRadio(sq)) f(sq); else say(sq.name, 'Fuori portata radio.', '#e0a070'); } };
    if (pressed('KeyH')) each(orderHold);
    if (pressed('KeyB')) boardOrUnload();
    if (pressed('KeyU')) each(quickOut);
    const sel = selectedSquads();
    if (sel.length && pressed('KeyI')) { const n = nextOf(ROES, roeOf(sel[0]).k).k; for (const sq of sel) setRoe(sq, n); }
    if (sel.length && pressed('KeyL')) { const n = nextOf(GAITS, gaitOf(sel[0]).k).k; for (const sq of sel) setGait(sq, n); }
    if (sel.length && pressed('KeyO')) { const n = nextOf(FORMS, formOf(sel[0]).k).k; for (const sq of sel) setForm(sq, n); }
  }
  // the quick orders, in both modes (iteration 69): Z form on me, X the formation while following the tank, C hold fire
  if (tk.alive && pressed('KeyZ')) quickFollow();
  if (pressed('KeyX')) cycleTankForm();
  if (tk.alive && pressed('KeyC')) quickHoldFire();
  if (pressed('F2')) { state.dev = !state.dev; say('Radio', state.dev ? 'Pannello sviluppo aperto (F2). K: nemico sotto il mouse.' : 'Pannello sviluppo chiuso.', '#c8a0ff'); }
  if (state.dev) devInput();
  if (!tk.alive) return;
  if (pressed('CapsLock')) { toggleTankPace(); say('Pilota', tankFast() ? 'Massima velocità.' : 'Passo della fanteria.', '#ffd9a0'); } // tank.js
  const cmd = state.mode === 'cmd' || state.tpause, shift = down.has('ShiftLeft') || down.has('ShiftRight');
  if (cmd) {
    if (pressed('KeyV')) state.arm = state.arm === 'move' ? null : 'move';
    if (pressed('KeyF')) state.arm = state.arm === 'attack' ? null : 'attack';
    if (pressed('KeyR')) state.arm = state.arm === 'cover' ? null : 'cover'; // iteration 69: R al riparo, T agguato
    if (pressed('KeyT')) state.arm = state.arm === 'ambush' ? null : 'ambush';
    // the keyboard's Menu key opens the order menu at the mouse, like a right-click
    if (pressed('ContextMenu') && state.mouse3 && selectedSquads().length) openMenu({ p: { x: state.mouse3.x, y: state.mouse3.y, z: state.mouse3.z }, face: null, tgt: enemyUnderMouse(), kind: null });
  } else state.arm = null;
  // the order gesture: press on the ground (right button, or left with an armed order), drag the
  // arrow for the bearing to hold, let go to send it
  if (cmd && state.mouse3 && (MS.rp || (state.arm && MS.lp))) {
    state.gest = { btn: MS.rp ? 'r' : 'l', sx: MS.x, sy: MS.y, p: { x: state.mouse3.x, y: state.mouse3.y, z: state.mouse3.z }, tgt: enemyUnderMouse(),
      kind: state.arm || (down.has('KeyF') ? 'attack' : null), face: null };
    { const f = friendlyUnderMouse(); state.gest.fr = f && !(f.squad && f.squad.selected) ? f : null; } // a unit of ours: the menu offers to escort it (iteration 70)
    if (state.gest.btn === 'l') { MS.lp = false; MS.drag = null; }
  }
  if (state.gest) {
    const g = state.gest;
    g.face = Math.hypot(MS.x - g.sx, MS.y - g.sy) > 14 && state.mouse3 ? Math.atan2(state.mouse3.x - g.p.x, state.mouse3.z - g.p.z) : null;
    if (g.btn === 'r' ? (MS.rr || !MS.r) : (MS.lr || !MS.l)) {
      // a plain right-click with squads selected opens the menu of orders; Shift or an armed order sends at once
      if (g.btn === 'r' && !g.kind && tune.context_menu && selectedSquads().length) openMenu(g, shift); // Shift: the menu of a path stop
      else if (issueOrder(g.kind, shift, g.p, g.face, g.face == null || g.kind === 'attack' ? g.tgt : null) && state.arm && !shift) state.arm = null;
      state.gest = null; if (g.btn === 'l') MS.lr = false;
    }
  }
  if (cmd) {
    if (MS.lp) MS.drag = { x: MS.x, y: MS.y };
    if (MS.lr && MS.drag) {
      const d = MS.drag; MS.drag = null;
      const add = down.has('ShiftLeft') || down.has('ShiftRight');
      if (Math.abs(MS.x - d.x) < 6 && Math.abs(MS.y - d.y) < 6) {
        const f = friendlyUnderMouse(); selectSquad(f ? f.squad : null, add);
        // the soldier clicked is picked too (for Alt+1-6); Shift adds to the picked
        if (!f) state.picked = null; else { if (!add || !state.picked) state.picked = new Set(); state.picked.add(f); }
      }
      else {
        if (!add) for (const s of state.squads) s.selected = false;
        const x0 = Math.min(d.x, MS.x), x1 = Math.max(d.x, MS.x), y0 = Math.min(d.y, MS.y), y1 = Math.max(d.y, MS.y);
        if (!add || !state.picked) state.picked = new Set();
        for (const sq of state.squads) for (const m of alive(sq)) { const p = toScreen(m.x, m.y + 1, m.z); if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1) { selectSquad(sq, true); state.picked.add(m); } }
      }
    }
  } else MS.drag = null;
}
