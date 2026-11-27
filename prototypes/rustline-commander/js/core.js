// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// The core every system and content pack builds on: a registry of content by kind, and the events
// systems use to talk to each other. It names no enemy, module, mission or biome.
// (docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- The registry: content by kind -----------------------------------------------------------------------
const REG = {};
/**
 * Adds a content entry (an enemy, a module, a mission...) under its kind. The table for a kind can be
 * handed in once (adopt) so existing catalogues and the registry are the same object.
 */
function register(kind, id, def) {
  const t = REG[kind] || (REG[kind] = {});
  if (id in t) console.warn('register: ' + kind + ' ' + id + ' replaced');
  t[id] = def; return def;
}
/**
 * Adds a tuning value for a content pack ({ value, min, max, step }), read like the others through
 * tune.<key>. config.js keeps the game's own values and wins: a key it already has is left as it is.
 */
function registerTune(key, def) {
  if (key in window.CONFIG) { console.warn('registerTune: ' + key + ' is in config.js, kept'); return window.CONFIG[key]; }
  window.CONFIG[key] = def; return def;
}
/** All entries of a kind ({} when none). */
function registry(kind) { return REG[kind] || (REG[kind] = {}); }
/** Makes an existing catalogue the registry's table for a kind (its entries stay where they are). */
function adopt(kind, table) { REG[kind] = table; return table; }

// ---- Events: how systems talk ------------------------------------------------------------------------------
const BUS = {};
/**
 * Subscribes fn to an event. Subscribers run in the order they subscribed, which is the order the
 * files load: the same seed plays the same game.
 */
function on(ev, fn) { (BUS[ev] || (BUS[ev] = [])).push(fn); return fn; }
/** Calls every subscriber of ev with the arguments. */
function emit(ev, ...args) { const L = BUS[ev]; if (L) for (const fn of L) fn(...args); }
