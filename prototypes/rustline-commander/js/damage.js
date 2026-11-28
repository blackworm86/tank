// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Damage types and armour: every hit has a type (bullet, frag, he, ap, heat, fire) and a penetration in mm; every
// vehicle an armour class with a thickness on each face. The type sets how much of the damage counts on soldiers and
// on vehicles (dk_*), the penetration against the face's thickness how much gets through (ricochet, partial, full).
// And the damage numbers over the units hit, coloured by what happened. (dmgTo in js/systems/combat.js reads these.)
'use strict';

/** The damage types: name for the HUD, and the config key of their penetration when a hit does not carry its own. */
const DTYPES = {
  bullet: { name: 'proiettile', pen: 'pen_bullet' }, frag: { name: 'schegge', pen: 'pen_frag' }, he: { name: 'esplosivo', pen: 'pen_he' },
  ap: { name: 'perforante', pen: 'pen_ap' }, heat: { name: 'carica cava', pen: 'pen_heat' }, fire: { name: 'fuoco', pen: null },
};
/** The damage type of a projectile kind fired without one of its own. */
const DTYPE_OF_KIND = { shell: 'he', mortar: 'he', howitzer: 'he', rpg: 'heat', ap: 'ap', molotov: 'fire', bomb: 'he' };

/**
 * What a hit is, from dmgTo's kind and hit: { dtype, pen, splash } (dtype null: raw damage, no armour, no type:
 * crushing, drowning, a falling ruin). bullet and heavy are rifle and heavy machine-gun rounds.
 */
function dmgProfile(kind, hit) {
  if (kind === 'crush' || kind === 'drown' || kind === 'collapse') return { dtype: null, pen: 0, splash: false };
  if (kind === 'bullet') return { dtype: 'bullet', pen: tune.pen_bullet, splash: false };
  if (kind === 'heavy') return { dtype: 'bullet', pen: tune.pen_heavy, splash: false };
  const splash = kind === 'blast';
  const dtype = (hit && hit.dtype) || (kind === 'rocket' ? 'heat' : kind === 'fire' ? 'fire' : 'he');
  let pen = hit && hit.pen != null ? hit.pen : DTYPES[dtype].pen ? tune[DTYPES[dtype].pen] : 0;
  if (dtype === 'ap' && hit && hit.range != null) pen *= Math.max(0.4, 1 - hit.range / Math.max(1, tune.ap_falloff)); // a piercing round loses bite with distance; heat does not
  return { dtype, pen, splash };
}
/** The armour class of a vehicle: 'heavy' (tanks), 'medium' (support tank, armoured lorry, guns), 'light' (the rest). */
function armourClass(e) {
  const D = typeof ENEMY !== 'undefined' && ENEMY[e.kind];
  if ((D && D.heavy) || e.kind === 'tank') return 'heavy';
  if (e.kind === 'ltank' || e.kind === 'td' || e.kind === 'htrack' || e.kind === 'truck' || e.kind === 'r_spg' || e.kind === 'depot') return 'medium';
  return 'light';
}
/** The thickness in mm of a vehicle's face (front, side, rear, top). */
function armourMM(e, side) {
  const base = tune['armor_mm_' + armourClass(e)];
  return base * (side === 'front' ? 1 : tune['armor_mm_' + side]);
}
/**
 * A hit on a vehicle's face: how much of the damage gets through ({ k, res }). res 'full' (penetrated), 'partial'
 * (a dent, the armour took most), 'ricochet' (a piercing round that glanced off). Piercing and shaped charges get
 * through or not; blast, splinters and bullets only scratch armour thicker than their bite.
 */
function armourHit(e, D, side) {
  if (D.dtype === 'fire') return { k: tune.dk_fire_veh, res: 'partial' };
  const r = D.pen / Math.max(1, armourMM(e, side));
  if (r >= 1) return { k: 1, res: 'full' };
  if (D.dtype === 'ap' || D.dtype === 'heat') return r >= tune.ricochet_r ? { k: r * r * 0.6, res: 'partial' } : { k: tune.ricochet_k, res: 'ricochet' };
  if (D.dtype === 'he') return { k: 0.2 + 0.5 * r, res: 'partial' };
  return { k: Math.max(0, r - 0.25) * 0.5, res: r < 0.25 ? 'ricochet' : 'partial' };
}
/** How much of a damage type counts on a soldier (veh false) or a vehicle (veh true). */
function dtypeK(dtype, veh) { return dtype ? tune['dk_' + dtype + '_' + (veh ? 'veh' : 'inf')] : 1; }

/**
 * A damage number over unit e: hits close together on the same unit add up into one number (dmg_merge seconds).
 * Shown for damage the player's side deals and for damage it takes (red); res and side colour it.
 */
function dmgNumber(e, amt, D, res, side, src) {
  if (!tune.dmg_numbers || amt <= 0 && res !== 'ricochet') return;
  const mine = e.team === 0, byMe = src && src.team === 0;
  if (!mine && !byMe) return;
  let col = '#ffffff', label = null;
  if (mine) col = '#ff6a5a';
  else if (res === 'ricochet') { col = '#bdbdbd'; label = 'RIMBALZO'; }
  else if (D && D.dtype === 'fire') col = '#ff8a2a';
  else if (res === 'partial') col = '#a9a9a9';
  else if (e.veh && (side === 'side' || side === 'rear' || side === 'top')) col = '#ffd36a';
  else if (D && D.splash) col = '#ffbf80';
  const N = e._dn, now = state.t;
  if (N && now - N.t0 < tune.dmg_merge && state.floats.includes(N.f) && !label && !N.label) {
    N.amt += amt; N.f.s = String(Math.max(1, Math.round(N.amt))); N.f.t = Math.min(N.f.t, 0.3); N.f.size = dmgSize(N.amt); if (col !== '#ffffff') N.f.col = col; return;
  }
  const j = state.floats.length + Math.floor(now * 60), f = { x: e.x + (hash2(j, 1, 61) - 0.5) * 0.8, y: e.y + (e.veh ? 3 : 2.3), z: e.z + (hash2(j, 2, 61) - 0.5) * 0.8, s: label || String(Math.max(1, Math.round(amt))), col, t: 0, size: label ? 14 : dmgSize(amt) };
  state.floats.push(f);
  e._dn = { f, amt, t0: now, label };
}
/** The size of a damage number: bigger for bigger hits. */
function dmgSize(a) { return Math.round(Math.min(30, 13 + Math.sqrt(Math.max(0, a)) * 1.3)); }
