// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Content pack "base": the main weapons and the advanced systems (the registries: js/loadout.js).
'use strict';

// ---- Main weapons ------------------------------------------------------------------------------------------
registerWeapon('ac25', { name: 'Cannoncino 25mm', cost: 0, desc: 'Raffiche rapide: ottimo sui mezzi leggeri, quasi inutile sui carri.' });
registerWeapon('hmg', { name: 'Mitragliatrice pesante', cost: 90, desc: 'Colpi infiniti, solo contro fanteria e tecniche.' });
registerWeapon('gl', { name: 'Lanciagranate a tamburo', cost: 180, desc: 'Granate rapide ad arco: fanteria e coperture.' });
registerWeapon('c75', { name: 'Cannone 75mm', cost: 280, desc: 'Un vero cannone: buca anche i carri. Pesa sullo scafo.' });
registerWeapon('c105', { name: 'Cannone 105mm', cost: 460, desc: 'Il colpo più duro. Lento a ricaricare, pesante.' });
registerWeapon('rl', { name: 'Lanciarazzi a carica cava', cost: 380, desc: 'Razzi HEAT: bucano qualsiasi corazza a ogni distanza, poco scoppio.' });

// ---- Advanced systems (passive ones are read where they act, by id: modOn('cage')...) ---------------------
registerSystem('cage', { name: 'Gabbia antirazzo', short: 'Gabbia', desc: 'Passivo: -45% danni da razzi.' });
registerSystem('skirts', { name: 'Minigonne', short: 'Gonne', desc: 'Passivo: -30% danni su fianchi e retro.' });
registerSystem('era', { name: 'Corazza reattiva a cariche', short: 'ERA', desc: 'Passivo: annulla i primi 3 colpi pesanti di ogni settore.' });
registerSystem('thermal', { name: 'Visore termico', short: 'Termico', desc: 'Passivo: il mezzo vede il 40% più lontano.' });
registerSystem('autorep', { name: 'Kit autoriparante', short: 'Autorip', desc: 'Passivo: lontano dal fuoco lo scafo si ripara.' });
registerSystem('rack', { name: 'Rastrelliera extra', short: 'Rastrel', desc: 'Passivo: +50% colpi trasportati.' });
registerSystem('blade', { name: 'Lama apripista', short: 'Lama', look: 'f_blade', desc: 'Passivo: -25% danni frontali, sale +0.5 m.' });
registerSystem('radar', { name: 'Radar di scoperta', short: 'Radar', look: 'r_radar', desc: 'Passivo: rivela la mappa fino a 95, blip dei nemici entro 85 ogni 5 s.' });
registerSystem('medbay', { name: 'Infermeria da campo', short: 'Infermer', desc: 'Passivo: i soldati entro 8 m dal mezzo guariscono.' });
registerSystem('smoke', { name: 'Lanciafumogeni', short: 'Fumo', active: true, cd: 30, desc: 'Attivo: cortina di fumo, i nemici non vedono attraverso per 9 s.',
  use(tk) {
    state.smokes.push({ x: tk.x, z: tk.z, r: tune.smoke_radius, until: state.t + 9 });
    for (let i = 0; i < 26; i++) { const a = rng() * 6.28, r = rng() * tune.smoke_radius; state.fx.push({ kind: 'smoke', x: tk.x + Math.cos(a) * r, y: hAt(tk.x, tk.z) + 1, z: tk.z + Math.sin(a) * r, t: -rng() * 0.6, life: 9, s: 2.6, rise: 0.4, col: 0xcfc8bd }); }
    sfx('rpg', tk.x, tk.z);
  }
});
registerSystem('turbo', { name: 'Iniezione d\'azoto', short: 'Azoto', active: true, cd: 25, desc: 'Attivo: +60% velocità per 5 s.',
  use(tk) { state.turboUntil = state.t + 5; state.stats = null; sfx('cannon', tk.x, tk.z); }
});
registerSystem('repair', { name: 'Saldatrice automatica', short: 'Saldat', active: true, cd: 60, desc: 'Attivo: ripara il 35% dello scafo in 4 s.',
  use(tk) { state.repairUntil = state.t + 4; }
});
registerSystem('ping', { name: 'Impulso radar', short: 'Impulso', active: true, cd: 40, desc: 'Attivo: mostra tutti i nemici entro 140 per 6 s.',
  use(tk) { for (const e of state.ents) if (e.alive && e.team === 1 && dist2(e, tk) < 140 * 140) e.pingT = state.t + 6; sfx('radio'); }
});
registerSystem('salvo', { name: 'Lanciarazzi a salve', short: 'Salva', active: true, cd: 20, desc: 'Attivo: 4 razzi anticarro dove miri.',
  use(tk) { state.salvo = { n: 4, next: state.t }; }
});
