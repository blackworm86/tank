// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Content pack "base": the 31 vehicle modules, each with its numbers and its look on the hull
// (the registry and the hardpoints: js/modules.js).
'use strict';

registerModule('f_plates', { name: 'Lamiere frontali', type: 'front', r: 0, cost: 60, w: 2, desc: 'Piastre imbullonate sul muso: -35% danni frontali.', plate: { side: 'front', k: 0.35, dur: 160 }, mod: {},
  build(g, D, c) { const P = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) P.push([D.fw / 3 - 0.06, 0.42, 0.14, (i - 1) * D.fw / 3, D.fy + j * 0.42, D.fz + j * -0.12, -0.35]); plateParts(g.hull, P, PC.drab, c, 1); for (let i = 0; i < 3; i++) if (plateStage(c) > 1) bx(g.hull, 0.1, 0.1, 0.06, PC.metal, (i - 1) * D.fw / 3, D.fy + 0.2, D.fz + 0.1); }
});
registerModule('f_blade', { name: 'Lama apripista', type: 'front', r: 1, cost: 100, w: 2, desc: 'Lama d\'acciaio: -25% danni frontali, sfonda i gradini.', plate: { side: 'front', k: 0.25, dur: 220 }, mod: { climb: 0.5 },
  build(g, D, c) {
    const P = []; for (let i = 0; i < 5; i++) P.push([D.fw / 5 + 0.2, 0.85, 0.16, (i - 2) * (D.fw + 1) / 5, D.fy - 0.3, D.fz + 0.55 - Math.abs(i - 2) * 0.14, -0.2, (i - 2) * -0.18]);
    plateParts(g.hull, P, 0x8a7a3a, c, 2);
    if (plateStage(c) >= 2) for (let i = 0; i < 4; i++) bx(g.hull, 0.36, 0.14, 0.17, i % 2 ? PC.black : PC.yel, (i - 1.5) * 0.5, D.fy - 0.05, D.fz + 0.63, -0.2);
    for (const s of [-1, 1]) bx(g.hull, 0.14, 0.14, 0.8, PC.metal, s * D.fw * 0.3, D.fy - 0.25, D.fz + 0.2);
  }
});
registerModule('f_comp', { name: 'Corazza composita frontale', type: 'front', r: 2, cost: 170, w: 3, desc: 'Strati di acciaio e ceramica: -55% danni frontali.', bad: '-10% rotazione.', plate: { side: 'front', k: 0.55, dur: 280 }, mod: { turn: 0.9 },
  build(g, D, c) { const P = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P.push([D.fw / 4 - 0.04, 0.46, 0.3, (i - 1.5) * D.fw / 4, D.fy + j * 0.44, D.fz + 0.06 - j * 0.16, -0.45]); plateParts(g.hull, P, 0x6a6e5a, c, 3); if (plateStage(c) >= 3) bx(g.hull, D.fw + 0.05, 0.08, 0.32, PC.stripe, 0, D.fy + 0.66, D.fz - 0.1, -0.45); }
});
registerModule('s_plates', { name: 'Lamiere laterali', type: 'side', r: 0, cost: 60, w: 2, desc: 'Lastre sui fianchi: -30% danni laterali.', plate: { side: 'side', k: 0.3, dur: 160 }, mod: {},
  build(g, D, c) { for (const s of [-1, 1]) { const P = []; for (let i = 0; i < 4; i++) P.push([0.14, D.sy, D.len / 4 - 0.08, s * D.sx, D.sy * 0.9 + 0.2, (i - 1.5) * D.len / 4]); plateParts(g.hull, P, PC.drab, c, s + 5); } }
});
registerModule('s_skirts', { name: 'Gonne a rete', type: 'side', r: 1, cost: 90, w: 1, desc: 'Reti d\'acciaio: -20% danni laterali, -45% dai razzi.', plate: { side: 'side', k: 0.2, rocket: 0.45, dur: 140 }, mod: {},
  build(g, D, c) {
    for (const s of [-1, 1]) {
      const P = []; for (let i = 0; i < 9; i++) P.push([0.08, D.sy * 1.05, 0.08, s * (D.sx + 0.12), D.sy * 0.85 + 0.25, -D.len / 2 + i * D.len / 8]);
      for (let j = 0; j < 3; j++) P.push([0.06, 0.06, D.len, s * (D.sx + 0.12), 0.45 + j * D.sy * 0.45, 0]);
      plateParts(g.hull, P, 0x5a5a50, c, s + 8);
    }
  }
});
registerModule('s_comp', { name: 'Corazza a strati', type: 'side', r: 2, cost: 180, w: 3, desc: 'Doppio strato sui fianchi e sul retro: -45%.', bad: '-0.5 velocità.', plate: { side: 'side', rear: true, k: 0.45, dur: 260 }, mod: { speedAdd: -0.5 },
  build(g, D, c) {
    for (const s of [-1, 1]) { const P = []; for (let i = 0; i < 5; i++) { P.push([0.24, D.sy * 1.1, D.len / 5 - 0.06, s * D.sx, D.sy * 0.85 + 0.25, (i - 2) * D.len / 5]); P.push([0.1, 0.3, D.len / 5 - 0.1, s * (D.sx + 0.16), D.sy * 1.4 + 0.2, (i - 2) * D.len / 5]); } plateParts(g.hull, P, 0x6a6e5a, c, s + 12); }
    const R = []; for (let i = 0; i < 3; i++) R.push([D.fw / 3 - 0.06, 0.6, 0.2, (i - 1) * D.fw / 3, D.ry, D.rz - 0.12]); plateParts(g.hull, R, 0x6a6e5a, c, 15);
  }
});
registerModule('d_diesel', { name: 'Diesel rifatto', type: 'drive', r: 0, cost: 70, w: 0, desc: '+15% velocità, accelera il doppio.', bad: 'Vibra: +10% dispersione.', mod: { speed: 1.15, accel: 2, spread: 1.1 },
  build(g, D) { bx(g.hull, 1.3, 0.35, 0.9, PC.olive2, 0, D.ry + 0.15, D.rz + 0.55); for (const s of [-1, 1]) { bx(g.hull, 0.14, 0.9, 0.14, PC.black, s * 0.75, D.ry + 0.55, D.rz + 0.25); bx(g.hull, 0.2, 0.08, 0.2, PC.rust, s * 0.75, D.ry + 1.0, D.rz + 0.25); } }
});
registerModule('d_wide', { name: 'Cingoli larghi', type: 'drive', r: 0, cost: 65, w: 1, desc: '+25% rotazione, sale gradini più alti.', bad: '-8% velocità.', mod: { turn: 1.25, climb: 0.5, speed: 0.92 },
  build(g, D) { for (const s of [-1, 1]) { bx(g.hull, 0.35, 0.3, D.trackL, PC.track, s * (D.trackX + D.trackW / 2 + 0.15), 0.18, 0); for (let i = 0; i < 9; i++) bx(g.hull, 0.4, 0.08, 0.2, 0x45403a, s * (D.trackX + D.trackW / 2 + 0.15), 0.34, -D.trackL / 2 + 0.3 + i * (D.trackL - 0.6) / 8); } }
});
registerModule('d_race', { name: 'Cingoli da corsa', type: 'drive', r: 1, cost: 120, w: 0, desc: '+40% velocità, +15% rotazione.', bad: 'Sale meno, -30 integrità.', mod: { speed: 1.4, turn: 1.15, climb: -0.4, hp: -30 },
  build(g, D) { for (const s of [-1, 1]) { for (let i = -2; i <= 2; i++) bx(g.hull, 0.1, 0.32, 0.32, 0xc8502a, s * (D.trackX + D.trackW / 2 + 0.04), 0.36, i * D.trackL / 5.2); bx(g.hull, 0.1, 0.08, D.trackL * 0.9, PC.yel, s * (D.trackX + D.trackW / 2 + 0.05), 0.72, 0); } }
});
registerModule('d_turbo', { name: 'Turbina da camion', type: 'drive', r: 1, cost: 150, w: 1, desc: '+30% velocità, accelera x2.5, retro veloce.', bad: '+25% dispersione, -40 integrità.', mod: { speed: 1.3, accel: 2.5, reverse: 1.6, spread: 1.25, hp: -40 },
  build(g, D) { bx(g.hull, 1.5, 0.5, 1.0, PC.metal, 0, D.ry + 0.2, D.rz + 0.6); bx(g.hull, 0.6, 0.6, 0.6, PC.grey, 0.4, D.ry + 0.65, D.rz + 0.55); for (const s of [-1, 1]) bx(g.hull, 0.16, 1.2, 0.16, PC.black, s * 0.8, D.ry + 0.8, D.rz + 0.15); bx(g.hull, 0.7, 0.08, 0.7, PC.rust, -0.3, D.ry + 0.46, D.rz + 0.6); }
});
registerModule('d_v12', { name: 'V12 di recupero', type: 'drive', r: 2, cost: 240, w: 2, desc: '+35% velocità, accelera x2.5, sale meglio.', mod: { speed: 1.35, accel: 2.5, climb: 0.3 },
  build(g, D) { bx(g.hull, 1.9, 0.6, 1.3, 0x6a3518, 0, D.ry + 0.25, D.rz + 0.7); for (let i = 0; i < 6; i++) bx(g.hull, 0.12, 0.7 + (i % 2) * 0.2, 0.12, PC.metal, (i % 2 ? 1 : -1) * 0.95, D.ry + 0.6, D.rz + 0.3 + Math.floor(i / 2) * 0.4, 0, 0, (i % 2 ? -1 : 1) * 0.3); bx(g.hull, 1.0, 0.25, 0.3, PC.yel, 0, D.ry + 0.6, D.rz + 1.2); }
});
registerModule('t_ring', { name: 'Anello oliato', type: 'turret', r: 0, cost: 55, w: 0, desc: 'Torretta x1.5 più rapida.', mod: { turret: 1.5 },
  build(g, D) { bx(g.tur, D.tw + 0.25, 0.1, D.td + 0.25, PC.brass, 0, 0.03, 0); }
});
registerModule('t_gyro', { name: 'Giroscopio', type: 'turret', r: 0, cost: 75, w: 0, desc: '-40% dispersione in movimento.', bad: 'Torretta -10%.', mod: { moveSpread: 0.6, turret: 0.9 },
  build(g, D) { bx(g.tur, 0.42, 0.42, 0.42, PC.metal, D.tw / 2 + 0.2, D.th * 0.5, -D.td * 0.15); bx(g.tur, 0.5, 0.06, 0.5, PC.cyan, D.tw / 2 + 0.2, D.th * 0.5 + 0.24, -D.td * 0.15); }
});
registerModule('t_servo', { name: 'Servomotore elettrico', type: 'turret', r: 1, cost: 130, w: 1, desc: 'Torretta x2.2 più rapida.', bad: 'Assorbe corrente: -15% radio.', mod: { turret: 2.2, radio: 0.85 },
  build(g, D) { bx(g.tur, D.tw * 0.6, D.th * 0.6, 0.5, PC.metal, 0, D.th * 0.4, -D.td / 2 - 0.25); bx(g.tur, 0.08, 0.08, 0.8, PC.yel, D.tw * 0.25, D.th * 0.2, -D.td / 2 - 0.2); }
});
registerModule('t_stab', { name: 'Stabilizzatore attivo', type: 'turret', r: 2, cost: 190, w: 1, desc: '-70% dispersione in movimento, mira più rapida, torretta x1.3.', mod: { moveSpread: 0.3, aim: 0.7, turret: 1.3 },
  build(g, D) { bx(g.tur, 0.5, 0.36, 0.7, PC.black, -D.tw / 2 - 0.2, D.th * 0.55, D.td * 0.1); bx(g.tur, 0.3, 0.2, 0.08, PC.cyan, -D.tw / 2 - 0.2, D.th * 0.6, D.td * 0.1 + 0.37); bx(g.tur, D.tw + 0.25, 0.1, D.td + 0.25, PC.brass, 0, 0.03, 0); }
});
registerModule('c_heavy', { name: 'Canna pesante', type: 'coax', r: 0, cost: 55, w: 0, desc: 'La coassiale regge il calore x1.7.', mod: { mgHeat: 1.7 },
  build(g, D) { bx(g.tur, 0.18, 0.18, 1.3, PC.black, D.tw * 0.3, D.th * 0.55, D.td / 2 + 0.55); }
});
registerModule('c_water', { name: 'Coassiale ad acqua', type: 'coax', r: 1, cost: 120, w: 1, desc: 'Calore x2.6, si raffredda x1.8.', mod: { mgHeat: 2.6, mgCool: 1.8 },
  build(g, D) { bx(g.tur, 0.3, 0.3, 1.0, 0x6b6a45, D.tw * 0.3, D.th * 0.55, D.td / 2 + 0.45); bx(g.tur, 0.12, 0.12, 0.5, PC.black, D.tw * 0.3, D.th * 0.55, D.td / 2 + 1.15); }
});
registerModule('c_twin', { name: 'Binata a nastro', type: 'coax', r: 2, cost: 210, w: 1, desc: 'Due mitragliatrici: calore x4, cadenza +30%.', bad: '+10% dispersione.', mod: { mgHeat: 4, mgCool: 2, mgRate: 0.77, spread: 1.1 },
  build(g, D) { for (const s of [0.22, 0.42]) bx(g.tur, 0.14, 0.14, 1.3, PC.black, D.tw * s, D.th * 0.55, D.td / 2 + 0.55); bx(g.tur, 0.5, 0.36, 0.4, 0x4a4a30, D.tw * 0.32, D.th * 0.55, D.td / 2 - 0.1); bx(g.tur, 0.5, 0.06, 0.06, PC.brass, D.tw * 0.32, D.th * 0.3, D.td / 2 + 0.05); }
});
registerModule('g_brake', { name: 'Freno di bocca', type: 'gun', r: 0, cost: 70, w: 0, desc: 'Meno rinculo: -15% dispersione, ricarica -10%.', mod: { gunSpread: 0.85, gunReload: 0.9 },
  build(g, D, c, L) { bx(g.gun, 0.6, 0.36, 0.5, PC.black, 0, 0, L + 0.1); bx(g.gun, 0.64, 0.1, 0.12, PC.metal, 0, 0, L + 0.25); }
});
registerModule('g_long', { name: 'Canna lunga', type: 'gun', r: 1, cost: 140, w: 1, desc: '+15% danno, -20% dispersione.', bad: 'Torretta -10%.', mod: { gunDmg: 1.15, gunSpread: 0.8, gunBarrel: 1.3, turret: 0.9 },
  build(g, D, c, L) { bx(g.gun, 0.38, 0.38, 0.5, PC.olive2, 0, 0, L * 0.45); bx(g.gun, 0.34, 0.34, 0.4, PC.black, 0, 0, L); }
});
registerModule('g_twin', { name: 'Cannone binato', type: 'gun', r: 2, cost: 300, w: 3, desc: 'Due canne che sparano a turno: ricarica -40%.', bad: '+15% dispersione, -0.4 velocità.', mod: { gunReload: 0.6, gunSpread: 1.15, speedAdd: -0.4 },
  build(g, D, c, L) { const o = D.tw * 0.24; bx(g.gun, 0.28, 0.28, L, PC.metal, o, 0, L / 2); bx(g.gun, 0.4, 0.4, 0.4, PC.black, o, 0, L); bx(g.gun, o + 0.4, 0.4, 0.5, PC.olive2, o / 2, 0, 0.2); }
});
registerModule('h_turret', { name: 'Torretta pesante', type: 'heavy', r: 2, cost: 280, w: 4, desc: 'Guance corazzate e cesta: +120 integrità, +8% protezione, +15% danno.', bad: 'Torretta -20%.', mod: { hp: 120, armor: 0.08, gunDmg: 1.15, turret: 0.8 },
  build(g, D) { for (const s of [-1, 1]) { bx(g.tur, 0.36, D.th * 1.05, D.td * 0.7, PC.drab, s * (D.tw / 2 + 0.16), D.th * 0.5, D.td * 0.1, 0, s * 0.12, 0); bx(g.tur, 0.4, 0.1, D.td * 0.7, PC.stripe, s * (D.tw / 2 + 0.18), D.th * 1.02, D.td * 0.1, 0, s * 0.12, 0); } bx(g.tur, D.tw * 0.9, D.th * 0.75, 0.9, PC.olive2, 0, D.th * 0.45, -D.td / 2 - 0.4); for (let i = 0; i < 3; i++) bx(g.tur, 0.5, 0.3, 0.3, 0x6b7a3a, (i - 1) * 0.6, D.th * 0.95, -D.td / 2 - 0.5); }
});
registerModule('r_radio', { name: 'Radio militare', type: 'roof', r: 0, cost: 65, w: 0, desc: 'Raggio radio x1.45.', mod: { radio: 1.45 },
  build(g, D, c, L, R) { bx(R.p, 0.09, 2.6, 0.09, PC.black, R.x, R.y + 1.3, R.z); bx(R.p, 0.5, 0.35, 0.4, 0x4f5a34, R.x, R.y + 0.18, R.z + 0.3); bx(R.p, 0.2, 0.2, 0.2, PC.cyan, R.x, R.y + 2.6, R.z); }
});
registerModule('r_seis', { name: 'Sensori sismici', type: 'roof', r: 0, cost: 75, w: 1, desc: 'Rivela la mappa fino a 70 attorno al mezzo.', mod: { sensor: 70 },
  build(g, D, c, L, R) { for (const s of [-1, 1]) { bx(g.hull, 0.3, 0.3, 0.3, PC.yel, s * (D.sx - 0.3), D.top + 0.1, D.rz + 0.5); bx(g.hull, 0.08, 0.9, 0.08, PC.metal, s * (D.sx - 0.3), D.top - 0.2, D.rz + 0.5); } bx(R.p, 0.4, 0.2, 0.4, PC.metal, R.x, R.y + 0.1, R.z); }
});
registerModule('r_mast', { name: 'Ripetitore a traliccio', type: 'roof', r: 1, cost: 130, w: 1, desc: 'Raggio radio x2.', bad: 'Antenna ingombrante: torretta -10%.', mod: { radio: 2.0, turret: 0.9 },
  build(g, D, c, L, R) { const H = 3.4; for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [0, 0.18]]) bx(R.p, 0.06, H, 0.06, PC.metal, R.x + dx, R.y + H / 2, R.z + dz); for (let i = 1; i < 5; i++) bx(R.p, 0.44, 0.05, 0.44, PC.metal, R.x, R.y + i * H / 5, R.z, 0, i * 0.5, 0); bx(R.p, 0.9, 0.06, 0.06, PC.black, R.x, R.y + H, R.z); bx(R.p, 0.22, 0.22, 0.22, PC.red, R.x, R.y + H + 0.12, R.z); }
});
registerModule('r_radar', { name: 'Radar di scoperta', type: 'roof', r: 1, cost: 150, w: 1, desc: 'Mappa fino a 95, blip dei nemici entro 85 ogni 5 s.', bad: 'Disturba la radio: -10%.', mod: { sensor: 95, radar: 85, radarT: 5, radio: 0.9 },
  build(g, D, c, L, R) { bx(R.p, 0.12, 0.8, 0.12, PC.metal, R.x, R.y + 0.4, R.z); const d = new THREE.Group(); d.position.set(R.x, R.y + 0.85, R.z); R.p.add(d); bx(d, 1.3, 0.5, 0.08, PC.grey, 0, 0, 0, 0.3); bx(d, 0.1, 0.1, 0.3, PC.black, 0, 0, 0.15); g.root.userData.radar = d; }
});
registerModule('r_long', { name: 'Radio a lungo raggio', type: 'roof', r: 2, cost: 230, w: 1, desc: 'Raggio radio x2.7.', bad: 'Torretta -15%.', mod: { radio: 2.7, turret: 0.85 },
  build(g, D, c, L, R) { const H = 4.2; bx(R.p, 0.1, H, 0.1, PC.black, R.x, R.y + H / 2, R.z); for (const h of [0.5, 0.7, 0.85]) bx(R.p, 1.2 - h, 0.05, 0.05, PC.black, R.x, R.y + H * h, R.z); bx(R.p, 0.7, 0.5, 0.5, 0x4f5a34, R.x, R.y + 0.25, R.z + 0.35); bx(R.p, 0.2, 0.2, 0.2, PC.cyan, R.x, R.y + H, R.z); }
});
registerModule('r_tac', { name: 'Radar tattico', type: 'roof', r: 2, cost: 250, w: 2, desc: 'Mappa fino a 125, blip entro 115 ogni 2.5 s.', bad: '-15% radio.', mod: { sensor: 125, radar: 115, radarT: 2.5, radio: 0.85 },
  build(g, D, c, L, R) { bx(R.p, 0.14, 1.0, 0.14, PC.metal, R.x, R.y + 0.5, R.z); const d = new THREE.Group(); d.position.set(R.x, R.y + 1.1, R.z); R.p.add(d); bx(d, 1.6, 0.7, 0.1, 0x3a4a52, 0, 0, 0, 0.2); for (let i = 0; i < 4; i++) bx(d, 0.3, 0.5, 0.04, PC.cyan, (i - 1.5) * 0.36, 0, 0.06, 0.2); g.root.userData.radar = d; }
});
registerModule('b_handles', { name: 'Maniglie esterne', type: 'bay', r: 0, cost: 45, w: 0, desc: '+2 posti: fanti aggrappati allo scafo.', mod: { seats: 2 },
  build(g, D) { for (const s of [-1, 1]) { bx(g.hull, 0.06, 0.06, D.len * 0.8, PC.brass, s * (D.sx - 0.55), D.top + 0.18, -0.3); for (let i = 0; i < 4; i++) bx(g.hull, 0.06, 0.2, 0.06, PC.brass, s * (D.sx - 0.55), D.top + 0.08, -0.3 - D.len * 0.35 + i * D.len * 0.23); } }
});
registerModule('b_bay', { name: 'Vano ampliato', type: 'bay', r: 1, cost: 110, w: 1, desc: '+4 posti.', bad: '-0.3 velocità.', mod: { seats: 4, speedAdd: -0.3 },
  build(g, D) { bx(g.hull, 2.1, 0.55, 2.0, PC.olive2, 0, D.top + 0.27, -1.3); bx(g.hull, 2.12, 0.08, 0.3, PC.stripe, 0, D.top + 0.4, -0.4); for (const s of [-1, 1]) bx(g.hull, 0.04, 0.16, 0.4, PC.black, s * 1.06, D.top + 0.3, -1.4); }
});
registerModule('b_frame', { name: 'Telaio rinforzato', type: 'bay', r: 1, cost: 140, w: 1, desc: '+1 slot sistemi avanzati.', bad: '-0.4 velocità.', mod: { slots: 1, speedAdd: -0.4 },
  build(g, D) { for (const s of [-1, 1]) for (const z of [-2.2, -0.4]) bx(g.hull, 0.1, 0.6, 0.1, PC.metal, s * 1.0, D.top + 0.3, z); for (const s of [-1, 1]) bx(g.hull, 0.1, 0.1, 1.9, PC.metal, s * 1.0, D.top + 0.6, -1.3); bx(g.hull, 0.8, 0.5, 0.6, 0x6b7a3a, 0.4, D.top + 0.25, -1.9); }
});
registerModule('b_rack', { name: 'Telaio modulare', type: 'bay', r: 2, cost: 240, w: 2, desc: '+2 slot sistemi avanzati.', bad: '-0.8 velocità, -30 integrità.', mod: { slots: 2, speedAdd: -0.8, hp: -30 },
  build(g, D) { for (const s of [-1, 1]) for (const z of [-2.4, -1.3, -0.2]) bx(g.hull, 0.1, 0.8, 0.1, PC.metal, s * 1.05, D.top + 0.4, z); for (const s of [-1, 1]) bx(g.hull, 0.1, 0.1, 2.3, PC.metal, s * 1.05, D.top + 0.8, -1.3); for (let i = 0; i < 3; i++) bx(g.hull, 0.6, 0.45, 0.6, i % 2 ? 0x8a6a3c : 0x6b7a3a, -0.6 + i * 0.6, D.top + 0.23, -1.3 - (i % 2) * 0.6); }
});
