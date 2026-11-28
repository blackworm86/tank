// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-28
// Formations (iteration 68, design/game-brief.md "Formazioni"). Two levels: each squad's own formation, which its
// soldiers and vehicles keep while they move and take where they arrive; and the tank's, which places the squads
// that follow it (Seguimi). The leader (the first soldier alive, or the tank) is at the head; the others take
// slots behind or beside him in his frame. Free is the old behaviour. Small effects: a column marches faster, a
// line aims better ahead and is hit harder on its flanks, a wedge or an echelon aims a little better.
'use strict';

/** The formations, in the order the key and the menu cycle them. */
const FORMS = [
  { k: 'free', name: 'Libera', short: 'LIB', col: '#d8ccb4', desc: 'Nessuna formazione: all\'arrivo cercano copertura, come sempre.' },
  { k: 'column', name: 'Colonna', short: 'COL', col: '#9fd8ff', desc: 'Uno dietro l\'altro: più veloci in marcia, ottima per strade e gole.' },
  { k: 'line', name: 'Riga', short: 'RIG', col: '#ffb070', desc: 'Affiancati: più fuoco in avanti, ma più esposti sui fianchi.' },
  { k: 'wedge', name: 'Cuneo', short: 'CUN', col: '#b9f59a', desc: 'A V dietro al capo: equilibrata, mira un po\' migliore.' },
  { k: 'echR', name: 'Scaglione dx', short: 'SC-D', col: '#ffd36a', desc: 'In diagonale indietro a destra: copre il fianco destro, mira un po\' migliore.' },
  { k: 'echL', name: 'Scaglione sx', short: 'SC-S', col: '#ffd36a', desc: 'In diagonale indietro a sinistra: copre il fianco sinistro, mira un po\' migliore.' },
];
/** The formation entry of key k (free for an unknown key). */
function formEntry(k) { return FORMS.find(f => f.k === k) || FORMS[0]; }
/** A squad's formation entry. */
function formOf(sq) { return formEntry(sq && sq.form); }
/** The formation of the squads that follow the tank. */
function tankForm() { return formEntry(state.tankForm); }

/**
 * Slot i (0 = the leader) of formation k, in the leader's frame: {r, f} metres to his right and ahead, gap apart.
 * Column: straight behind. Line: abreast, alternating right and left. Wedge: a V opening backwards.
 * Echelons: one diagonal back to the right or to the left.
 */
function formOffset(k, i, gap) {
  if (!i) return { r: 0, f: 0 };
  const c = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
  switch (k) {
    case 'column': return { r: 0, f: -i * gap };
    case 'line': return { r: side * c * gap, f: 0 };
    case 'wedge': return { r: side * c * gap, f: -c * gap };
    case 'echR': return { r: i * gap * 0.8, f: -i * gap * 0.8 };
    case 'echL': return { r: -i * gap * 0.8, f: -i * gap * 0.8 };
  }
  return { r: 0, f: 0 };
}
/** Slot i of formation k around (x,z) facing heading h (0 = +z), in world metres. */
function formPoint(k, i, gap, x, z, h) {
  const o = formOffset(k, i, gap), s = Math.sin(h), c = Math.cos(h);
  return { x: x + s * o.f + c * o.r, z: z + c * o.f - s * o.r };
}

/** Sets squad sq's formation. */
function setForm(sq, k) { sq.form = k; const f = formOf(sq); say(sq.name, 'Formazione: ' + f.name.toLowerCase() + '.', f.col); }
/** The squad's next formation. */
function cycleForm(sq) { setForm(sq, nextOf(FORMS, formOf(sq).k).k); }
/** Sets the formation of the squads that follow the tank. */
function setTankForm(k) { state.tankForm = k; const f = tankForm(); say('Radio', 'Formazione attorno al carro: ' + f.name.toLowerCase() + '.', f.col); }
/** The tank's next formation. */
function cycleTankForm() { setTankForm(nextOf(FORMS, tankForm().k).k); }

/**
 * Where squad sq puts its units arriving at (x,z), facing h, in its formation: soldiers form_gap apart and vehicles
 * form_veh_gap apart, each group led from (x,z). Each point is then cleared by claimSpot. Returns Map unit -> point.
 */
function formArrival(sq, ms, x, z, h) {
  const k = formOf(sq).k, out = new Map();
  const inf = ms.filter(m => !m.veh), veh = ms.filter(m => m.veh);
  inf.forEach((m, i) => out.set(m, formPoint(k, i, tune.form_gap, x, z, h)));
  // the vehicles keep the same shape, set back behind the soldiers
  const back = inf.length ? tune.form_veh_gap : 0;
  veh.forEach((v, i) => out.set(v, formPoint(k, i, tune.form_veh_gap, x - Math.sin(h) * back, z - Math.cos(h) * back, h)));
  return out;
}
/** The way the squad heads to (x,z): from its soldiers' middle. */
function headingTo(ms, x, z) {
  const c = ms.reduce((a, m) => ({ x: a.x + m.x / ms.length, z: a.z + m.z / ms.length }), { x: 0, z: 0 });
  return Math.atan2(x - c.x, z - c.z);
}

/**
 * On the march (a move order under way, not bounding): the leader walks his own path a little slower
 * (form_lead_speed); the others keep their slots in his frame, facing where he walks; within form_join of his
 * end the formation breaks and each goes to the place goTo gave him (m.fDest).
 */
function formMarch(sq, ms) {
  const f = formOf(sq); if (f.k === 'free') { for (const m of ms) m.formLead = false; return; }
  const inf = ms.filter(m => !m.veh && !m.inside && !m.rideOn && !m.garrison); if (inf.length < 2) return;
  const L = inf[0]; L.formLead = true; for (let i = 1; i < inf.length; i++) inf[i].formLead = false;
  const end = L.fDest || L.dest; if (!end) return;
  if (Math.hypot(end.x - L.x, end.z - L.z) < tune.form_join) { // there: everyone to his own place
    for (const m of inf) if (m.fDest && !m.formDone) { m.formDone = true; setDest(m, m.fDest.x, m.fDest.z); }
    L.formLead = false; return;
  }
  const nx = L.path && L.pi < L.path.length ? L.path[Math.min(L.pi + 1, L.path.length - 1)] : end;
  const h = Math.atan2(nx.x - L.x, nx.z - L.z);
  let lag = 0;
  for (let i = 1; i < inf.length; i++) {
    const m = inf[i], p = formPoint(f.k, i, tune.form_gap, L.x + Math.sin(h) * tune.form_lead, L.z + Math.cos(h) * tune.form_lead, h); // a step ahead of him: they walk into their slots, not behind them
    const cx = Math.floor(p.x), cz = Math.floor(p.z);
    if (!inMap(cx, cz) || !walkable(cx, cz) || deepWater(p.x, p.z)) continue; // no ground for the slot: he keeps walking
    m.formDone = false; lag = Math.max(lag, Math.hypot(p.x - m.x, p.z - m.z) - tune.form_lead);
    if (Math.hypot(p.x - m.x, p.z - m.z) > 0.8) { const fd = m.fDest; setDest(m, p.x, p.z); m.fDest = fd; }
  }
  L.formLeadK = lag > tune.form_wait_lag ? tune.form_wait_speed : tune.form_lead_speed; // a man far off his slot: the leader all but waits
  sq.tick = Math.min(sq.tick, 0.5); // the slots move with him: look again soon
}

/**
 * Seguimi with a tank formation: the following squads take slots 1, 2, 3... of the tank's formation (form_sq_gap
 * apart, the tank in slot 0), and inside its slot each squad keeps its own formation facing the tank's heading.
 * Returns true when it placed the squad (false: free, the old ring behind the tank).
 */
function followInForm(sq, ms) {
  const tf = tankForm(); if (tf.k === 'free') return false;
  const tk = state.tank, fl = state.squads.filter(s => s.order.t === 'follow' && alive(s).length), j = fl.indexOf(sq);
  if (j < 0) return false;
  // the spacing shrinks so the farthest slot stays well inside the radio's reach (form_radio_k of it)
  const far = formOffset(tf.k, fl.length, 1), gap = tune.form_sq_gap * Math.min(1, tankStats().radio * tune.form_radio_k / (Math.hypot(far.r, far.f) * tune.form_sq_gap || 1));
  const h = tk.heading, a = formPoint(tf.k, j + 1, Math.max(tune.form_gap * 3, gap), tk.x, tk.z, h);
  if (tf.k === 'line') { a.x -= Math.sin(h) * 3; a.z -= Math.cos(h) * 3; } // abreast, a little back from the hull
  const k = formOf(sq).k === 'free' ? 'wedge' : formOf(sq).k, inf = ms.filter(m => !m.veh), veh = ms.filter(m => m.veh);
  const put = (m, p) => {
    if (m.kind === 'sniper' && !m.veh) return; // its own post (roleUpkeep)
    if (state.t - (m.combatT || -99) < 6 && !m.veh) return; // fighting: stays in its cover till it is over
    const d2 = (m.x - p.x) ** 2 + (m.z - p.z) ** 2; m.formCatch = d2 > tune.form_catch_d ** 2; // far off its slot: it hurries
    if (d2 > 4 && (!m.path || m.pi >= m.path.length || state.t - m.pathT > 2)) setDest(m, p.x, p.z);
  };
  inf.forEach((m, i) => put(m, formPoint(k, i, tune.form_gap, a.x, a.z, h)));
  const vb = inf.length ? tune.form_veh_gap : 0; // behind its soldiers, or in the squad's slot itself
  veh.forEach((v, i) => put(v, formPoint(k, i, tune.form_veh_gap, a.x - Math.sin(h) * vb, a.z - Math.cos(h) * vb, h)));
  return true;
}

// ---- The small effects ------------------------------------------------------------------------------------------
/** Speed factor for unit e of the player's: a column on the march, a leader holding back for his men. */
function formSpeedK(e) {
  const sq = e.squad; if (!sq || e.team) return 1;
  let k = 1;
  if (formOf(sq).k === 'column' && sq.order.t === 'move' && !sq.order.done) k *= tune.form_col_speed;
  if (e.formLead) k *= e.formLeadK || tune.form_lead_speed;
  if (e.formCatch && sq.order.t === 'follow') k *= tune.form_catch_speed;
  return k;
}
/** The squad's front: the way it last faced or marched (radians), or null. */
function formFront(sq) { return sq && sq.formFace != null ? sq.formFace : null; }
/** Aim factor for e firing at t: a line ahead of it, a wedge or an echelon a little everywhere. */
function formAccK(e, t) {
  const sq = e.squad; if (!sq || e.team) return 1;
  const k = formOf(sq).k, fr = formFront(sq);
  if (k === 'line') return fr != null && Math.abs(angDiff(fr, Math.atan2(t.x - e.x, t.z - e.z))) < Math.PI / 3 ? tune.form_line_acc : 1;
  if (k === 'wedge' || k === 'echR' || k === 'echL') return tune.form_wedge_acc;
  return 1;
}
/** Damage factor for e of a squad in line hit from its flank or back (more than 60 degrees off its front). */
function formTakenK(e, src) {
  const sq = e.squad; if (!sq || e.team || e.veh || !src || src.x == null || formOf(sq).k !== 'line') return 1;
  const fr = formFront(sq); if (fr == null) return 1;
  return Math.abs(angDiff(fr, Math.atan2(src.x - e.x, src.z - e.z))) > Math.PI / 3 ? tune.form_line_flank : 1;
}
