// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Content pack "base": the looks of the standard systems' levels and of some advanced systems
// (iteration 61: the numbers live in js/modules.js and config.js, std_*).
'use strict';

registerModule('f_plates', { name: 'Lamiere frontali',
  build(g, D, c) { const P = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) P.push([D.fw / 3 - 0.06, 0.42, 0.14, (i - 1) * D.fw / 3, D.fy + j * 0.42, D.fz + j * -0.12, -0.35]); plateParts(g.hull, P, PC.drab, c, 1); for (let i = 0; i < 3; i++) if (plateStage(c) > 1) bx(g.hull, 0.1, 0.1, 0.06, PC.metal, (i - 1) * D.fw / 3, D.fy + 0.2, D.fz + 0.1); }
});
registerModule('f_blade', { name: 'Lama apripista',
  build(g, D, c) {
    const P = []; for (let i = 0; i < 5; i++) P.push([D.fw / 5 + 0.2, 0.85, 0.16, (i - 2) * (D.fw + 1) / 5, D.fy - 0.3, D.fz + 0.55 - Math.abs(i - 2) * 0.14, -0.2, (i - 2) * -0.18]);
    plateParts(g.hull, P, 0x8a7a3a, c, 2);
    if (plateStage(c) >= 2) for (let i = 0; i < 4; i++) bx(g.hull, 0.36, 0.14, 0.17, i % 2 ? PC.black : PC.yel, (i - 1.5) * 0.5, D.fy - 0.05, D.fz + 0.63, -0.2);
    for (const s of [-1, 1]) bx(g.hull, 0.14, 0.14, 0.8, PC.metal, s * D.fw * 0.3, D.fy - 0.25, D.fz + 0.2);
  }
});
registerModule('f_comp', { name: 'Corazza composita frontale',
  build(g, D, c) { const P = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) P.push([D.fw / 4 - 0.04, 0.46, 0.3, (i - 1.5) * D.fw / 4, D.fy + j * 0.44, D.fz + 0.06 - j * 0.16, -0.45]); plateParts(g.hull, P, 0x6a6e5a, c, 3); if (plateStage(c) >= 3) bx(g.hull, D.fw + 0.05, 0.08, 0.32, PC.stripe, 0, D.fy + 0.66, D.fz - 0.1, -0.45); }
});
registerModule('s_plates', { name: 'Lamiere laterali',
  build(g, D, c) { for (const s of [-1, 1]) { const P = []; for (let i = 0; i < 4; i++) P.push([0.14, D.sy, D.len / 4 - 0.08, s * D.sx, D.sy * 0.9 + 0.2, (i - 1.5) * D.len / 4]); plateParts(g.hull, P, PC.drab, c, s + 5); } }
});
registerModule('s_skirts', { name: 'Gonne a rete',
  build(g, D, c) {
    for (const s of [-1, 1]) {
      const P = []; for (let i = 0; i < 9; i++) P.push([0.08, D.sy * 1.05, 0.08, s * (D.sx + 0.12), D.sy * 0.85 + 0.25, -D.len / 2 + i * D.len / 8]);
      for (let j = 0; j < 3; j++) P.push([0.06, 0.06, D.len, s * (D.sx + 0.12), 0.45 + j * D.sy * 0.45, 0]);
      plateParts(g.hull, P, 0x5a5a50, c, s + 8);
    }
  }
});
registerModule('s_comp', { name: 'Corazza a strati',
  build(g, D, c) {
    for (const s of [-1, 1]) { const P = []; for (let i = 0; i < 5; i++) { P.push([0.24, D.sy * 1.1, D.len / 5 - 0.06, s * D.sx, D.sy * 0.85 + 0.25, (i - 2) * D.len / 5]); P.push([0.1, 0.3, D.len / 5 - 0.1, s * (D.sx + 0.16), D.sy * 1.4 + 0.2, (i - 2) * D.len / 5]); } plateParts(g.hull, P, 0x6a6e5a, c, s + 12); }
    const R = []; for (let i = 0; i < 3; i++) R.push([D.fw / 3 - 0.06, 0.6, 0.2, (i - 1) * D.fw / 3, D.ry, D.rz - 0.12]); plateParts(g.hull, R, 0x6a6e5a, c, 15);
  }
});
registerModule('d_diesel', { name: 'Diesel rifatto',
  build(g, D) { bx(g.hull, 1.3, 0.35, 0.9, PC.olive2, 0, D.ry + 0.15, D.rz + 0.55); for (const s of [-1, 1]) { bx(g.hull, 0.14, 0.9, 0.14, PC.black, s * 0.75, D.ry + 0.55, D.rz + 0.25); bx(g.hull, 0.2, 0.08, 0.2, PC.rust, s * 0.75, D.ry + 1.0, D.rz + 0.25); } }
});
registerModule('d_wide', { name: 'Cingoli larghi',
  build(g, D) { for (const s of [-1, 1]) { bx(g.hull, 0.35, 0.3, D.trackL, PC.track, s * (D.trackX + D.trackW / 2 + 0.15), 0.18, 0); for (let i = 0; i < 9; i++) bx(g.hull, 0.4, 0.08, 0.2, 0x45403a, s * (D.trackX + D.trackW / 2 + 0.15), 0.34, -D.trackL / 2 + 0.3 + i * (D.trackL - 0.6) / 8); } }
});
registerModule('d_race', { name: 'Cingoli da corsa',
  build(g, D) { for (const s of [-1, 1]) { for (let i = -2; i <= 2; i++) bx(g.hull, 0.1, 0.32, 0.32, 0xc8502a, s * (D.trackX + D.trackW / 2 + 0.04), 0.36, i * D.trackL / 5.2); bx(g.hull, 0.1, 0.08, D.trackL * 0.9, PC.yel, s * (D.trackX + D.trackW / 2 + 0.05), 0.72, 0); } }
});
registerModule('d_turbo', { name: 'Turbina da camion',
  build(g, D) { bx(g.hull, 1.5, 0.5, 1.0, PC.metal, 0, D.ry + 0.2, D.rz + 0.6); bx(g.hull, 0.6, 0.6, 0.6, PC.grey, 0.4, D.ry + 0.65, D.rz + 0.55); for (const s of [-1, 1]) bx(g.hull, 0.16, 1.2, 0.16, PC.black, s * 0.8, D.ry + 0.8, D.rz + 0.15); bx(g.hull, 0.7, 0.08, 0.7, PC.rust, -0.3, D.ry + 0.46, D.rz + 0.6); }
});
registerModule('d_v12', { name: 'V12 di recupero',
  build(g, D) { bx(g.hull, 1.9, 0.6, 1.3, 0x6a3518, 0, D.ry + 0.25, D.rz + 0.7); for (let i = 0; i < 6; i++) bx(g.hull, 0.12, 0.7 + (i % 2) * 0.2, 0.12, PC.metal, (i % 2 ? 1 : -1) * 0.95, D.ry + 0.6, D.rz + 0.3 + Math.floor(i / 2) * 0.4, 0, 0, (i % 2 ? -1 : 1) * 0.3); bx(g.hull, 1.0, 0.25, 0.3, PC.yel, 0, D.ry + 0.6, D.rz + 1.2); }
});
registerModule('t_ring', { name: 'Anello oliato',
  build(g, D) { bx(g.tur, D.tw + 0.25, 0.1, D.td + 0.25, PC.brass, 0, 0.03, 0); }
});
registerModule('t_gyro', { name: 'Giroscopio',
  build(g, D) { bx(g.tur, 0.42, 0.42, 0.42, PC.metal, D.tw / 2 + 0.2, D.th * 0.5, -D.td * 0.15); bx(g.tur, 0.5, 0.06, 0.5, PC.cyan, D.tw / 2 + 0.2, D.th * 0.5 + 0.24, -D.td * 0.15); }
});
registerModule('t_servo', { name: 'Servomotore elettrico',
  build(g, D) { bx(g.tur, D.tw * 0.6, D.th * 0.6, 0.5, PC.metal, 0, D.th * 0.4, -D.td / 2 - 0.25); bx(g.tur, 0.08, 0.08, 0.8, PC.yel, D.tw * 0.25, D.th * 0.2, -D.td / 2 - 0.2); }
});
registerModule('t_stab', { name: 'Stabilizzatore attivo',
  build(g, D) { bx(g.tur, 0.5, 0.36, 0.7, PC.black, -D.tw / 2 - 0.2, D.th * 0.55, D.td * 0.1); bx(g.tur, 0.3, 0.2, 0.08, PC.cyan, -D.tw / 2 - 0.2, D.th * 0.6, D.td * 0.1 + 0.37); bx(g.tur, D.tw + 0.25, 0.1, D.td + 0.25, PC.brass, 0, 0.03, 0); }
});
registerModule('c_heavy', { name: 'Canna pesante',
  build(g, D) { bx(g.tur, 0.18, 0.18, 1.3, PC.black, D.tw * 0.3, D.th * 0.55, D.td / 2 + 0.55); }
});
registerModule('c_water', { name: 'Coassiale ad acqua',
  build(g, D) { bx(g.tur, 0.3, 0.3, 1.0, 0x6b6a45, D.tw * 0.3, D.th * 0.55, D.td / 2 + 0.45); bx(g.tur, 0.12, 0.12, 0.5, PC.black, D.tw * 0.3, D.th * 0.55, D.td / 2 + 1.15); }
});
registerModule('c_twin', { name: 'Binata a nastro',
  build(g, D) { for (const s of [0.22, 0.42]) bx(g.tur, 0.14, 0.14, 1.3, PC.black, D.tw * s, D.th * 0.55, D.td / 2 + 0.55); bx(g.tur, 0.5, 0.36, 0.4, 0x4a4a30, D.tw * 0.32, D.th * 0.55, D.td / 2 - 0.1); bx(g.tur, 0.5, 0.06, 0.06, PC.brass, D.tw * 0.32, D.th * 0.3, D.td / 2 + 0.05); }
});
registerModule('g_brake', { name: 'Freno di bocca',
  build(g, D, c, L) { bx(g.gun, 0.6, 0.36, 0.5, PC.black, 0, 0, L + 0.1); bx(g.gun, 0.64, 0.1, 0.12, PC.metal, 0, 0, L + 0.25); }
});
registerModule('g_long', { name: 'Canna lunga',
  build(g, D, c, L) { bx(g.gun, 0.38, 0.38, 0.5, PC.olive2, 0, 0, L * 0.45); bx(g.gun, 0.34, 0.34, 0.4, PC.black, 0, 0, L); }
});
registerModule('r_radio', { name: 'Radio militare',
  build(g, D, c, L, R) { bx(R.p, 0.09, 2.6, 0.09, PC.black, R.x, R.y + 1.3, R.z); bx(R.p, 0.5, 0.35, 0.4, 0x4f5a34, R.x, R.y + 0.18, R.z + 0.3); bx(R.p, 0.2, 0.2, 0.2, PC.cyan, R.x, R.y + 2.6, R.z); }
});
registerModule('r_mast', { name: 'Ripetitore a traliccio',
  build(g, D, c, L, R) { const H = 3.4; for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [0, 0.18]]) bx(R.p, 0.06, H, 0.06, PC.metal, R.x + dx, R.y + H / 2, R.z + dz); for (let i = 1; i < 5; i++) bx(R.p, 0.44, 0.05, 0.44, PC.metal, R.x, R.y + i * H / 5, R.z, 0, i * 0.5, 0); bx(R.p, 0.9, 0.06, 0.06, PC.black, R.x, R.y + H, R.z); bx(R.p, 0.22, 0.22, 0.22, PC.red, R.x, R.y + H + 0.12, R.z); }
});
registerModule('r_radar', { name: 'Radar di scoperta',
  build(g, D, c, L, R) { bx(R.p, 0.12, 0.8, 0.12, PC.metal, R.x, R.y + 0.4, R.z); const d = new THREE.Group(); d.position.set(R.x, R.y + 0.85, R.z); R.p.add(d); bx(d, 1.3, 0.5, 0.08, PC.grey, 0, 0, 0, 0.3); bx(d, 0.1, 0.1, 0.3, PC.black, 0, 0, 0.15); g.root.userData.radar = d; }
});
registerModule('r_long', { name: 'Radio a lungo raggio',
  build(g, D, c, L, R) { const H = 4.2; bx(R.p, 0.1, H, 0.1, PC.black, R.x, R.y + H / 2, R.z); for (const h of [0.5, 0.7, 0.85]) bx(R.p, 1.2 - h, 0.05, 0.05, PC.black, R.x, R.y + H * h, R.z); bx(R.p, 0.7, 0.5, 0.5, 0x4f5a34, R.x, R.y + 0.25, R.z + 0.35); bx(R.p, 0.2, 0.2, 0.2, PC.cyan, R.x, R.y + H, R.z); }
});
registerModule('b_handles', { name: 'Maniglie esterne',
  build(g, D) { for (const s of [-1, 1]) { bx(g.hull, 0.06, 0.06, D.len * 0.8, PC.brass, s * (D.sx - 0.55), D.top + 0.18, -0.3); for (let i = 0; i < 4; i++) bx(g.hull, 0.06, 0.2, 0.06, PC.brass, s * (D.sx - 0.55), D.top + 0.08, -0.3 - D.len * 0.35 + i * D.len * 0.23); } }
});
registerModule('b_bay', { name: 'Vano ampliato',
  build(g, D) { bx(g.hull, 2.1, 0.55, 2.0, PC.olive2, 0, D.top + 0.27, -1.3); bx(g.hull, 2.12, 0.08, 0.3, PC.stripe, 0, D.top + 0.4, -0.4); for (const s of [-1, 1]) bx(g.hull, 0.04, 0.16, 0.4, PC.black, s * 1.06, D.top + 0.3, -1.4); }
});
