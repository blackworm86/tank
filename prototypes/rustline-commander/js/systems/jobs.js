// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-28
// Soldiers' Jobs (iteration 62, the redesign in design/game-brief.md): everyone starts a Recruit; a
// Recruit with enough XP picks one of four Jobs, a Job at spec_level picks its specialisation; each new
// Job starts again from level 0 and leaves the old one's skills behind. XP for a kill grows with the
// enemy's strength and shrinks to nothing when the soldier is far above it. The player chooses at
// once, on the squad's card: the gold arrow over a soldier opens his choices.
'use strict';

/** The Job tree. stage: 0 Recruit, 1 Job, 2 specialisation; next: what this Job can become. */
const JOBS = {
  recruit: { stage: 0, next: ['rifle', 'scout', 'medic', 'eng'] },
  rifle: { stage: 1, next: ['mg'] }, scout: { stage: 1, next: ['sniper'] }, medic: { stage: 1, next: ['radio'] }, eng: { stage: 1, next: ['at'] },
  mg: { stage: 2, next: [] }, sniper: { stage: 2, next: [] }, radio: { stage: 2, next: [] }, at: { stage: 2, next: [] },
};
/** The level names inside each Job (rank 0-3). */
const JOB_LEVELS = ['Base', 'Esperto', 'Veterano', 'Élite'];

/** The Jobs soldier m may take now: a Recruit at level 1, a Job at spec_level; else none. */
function jobOptions(m) {
  const J = m && m.alive && !m.veh && JOBS[m.kind]; if (!J || !J.next.length) return [];
  return (m.rank || 0) >= (J.stage === 0 ? 1 : Math.round(tune.spec_level)) ? J.next : [];
}
/** Soldier m takes Job k: the new Job's weapon, look and level 0; the share of health he had stays. */
function setJob(m, k) {
  if (!jobOptions(m).includes(k)) return false;
  const f = m.hp / Math.max(1, m.maxhp), sq = m.squad;
  m.kind = k; m.rank = 0; m.xp = 0; m.maxhp = unitHp(m); m.hp = Math.max(1, m.maxhp * f);
  if (m.model) { R3.units.remove(m.model); m.model = null; } // view.js makes the new figure
  if (sq) { const i = sq.members.indexOf(m); if (i >= 0) sq.slots[i] = k; if (!sq.named) sq.name = squadName(sq.slots); }
  floatText(m.x, m.y + 2.6, m.z, UT[k].name + '!', '#ffd36a');
  if (sq) say(sq.name, 'Nuovo incarico: ' + UT[k].name + '.', '#ffd36a');
  sfx('coin');
  return true;
}
/** A soldier's place on the ladder: 0-3 as a Recruit, 3-6 in a Job, 6-9 specialised (the stage, then the level). */
function soldierLevel(m) { return (JOBS[m.kind] ? JOBS[m.kind].stage * 3 : 0) + (m.rank || 0); }
/** An enemy's strength: the square root of its health (vehicles twice) over xp_ref_hp (a raider 1, a truck about 4). */
function foePower(e) { return Math.max(0.3, Math.sqrt((e.maxhp || 1) * (e.veh ? 2 : 1) / tune.xp_ref_hp)); }
/** The same on the soldiers' ladder, 0-9. */
function foeLevel(e) { return Math.min(9, Math.round(Math.log2(1 + foePower(e)) * 3)); }
/** How much of the XP a soldier gets from enemy e: all of it up to its level, xp_falloff less each level above. */
function xpFactor(m, e) { return Math.max(0, 1 - Math.max(0, soldierLevel(m) - foeLevel(e)) * tune.xp_falloff); }
/** XP for killing e. */
function killXp(m, e) { return tune.xp_kill * foePower(e) * xpFactor(m, e); }

// ---- The choice on the squad card (hud.js draws the cards, squads.js cardInput takes their clicks) -----------------
/** Opens soldier m's choice beside his icon at (x,y) on the card. */
function openJobPick(m, x, y) { state.jobPick = { m, x, y }; }
/** Draws the open choice: one row per Job it offers, with what it does. */
function drawJobPick() {
  const P = state.jobPick; UI.jobOpts = [];
  if (!P) return;
  const opts = jobOptions(P.m); if (!opts.length) { state.jobPick = null; return; }
  const w = 330, rh = 40, h = 30 + opts.length * rh, x = 252, y = Math.max(8, Math.min(H - h - 8, P.y - 20));
  rrect(x, y, w, h, 6, 'rgba(24,18,14,0.96)', '#ffd36a');
  text(UT[P.m.kind].name + ' ' + JOB_LEVELS[P.m.rank || 0] + ': scegli il nuovo incarico', x + 12, y + 15, 12, '#ffd9a0', 'left');
  opts.forEach((k, i) => {
    const r = { k, x: x + 6, y: y + 26 + i * rh, w: w - 12, h: rh - 4 }, on = inRect(r, MS.x, MS.y);
    rrect(r.x, r.y, r.w, r.h, 4, on ? 'rgba(255,211,106,0.18)' : 'rgba(0,0,0,0.3)', on ? '#ffd36a' : '#5a4030');
    unitIcon(k, r.x + 18, r.y + r.h / 2, 20, '#a8d870');
    text(UT[k].name, r.x + 36, r.y + 11, 13, HC.text, 'left');
    text(wrap(ROLE_DESC[k] || '', r.w - 44, 11)[0], r.x + 36, r.y + 26, 11, HC.dim, 'left');
    UI.jobOpts.push(r);
  });
}
/** The choice's click: a row takes that Job, anywhere else closes it. True when it took the click. */
function jobPickInput() {
  if (!state.jobPick) return false;
  if (pressed('Escape')) { state.jobPick = null; return true; }
  if (!MS.lp) return false;
  MS.lp = false; MS.drag = null; state.menuBlock = true;
  const r = (UI.jobOpts || []).find(o => inRect(o, MS.x, MS.y));
  if (r) setJob(state.jobPick.m, r.k);
  state.jobPick = null;
  return true;
}
