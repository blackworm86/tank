// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-27
// Content pack "base": the biomes, the zone layouts, the geographies and the map shapes (the registries and
// the building helpers they use: js/biomes.js; the map steps: js/world.js).
'use strict';

// ---- Biomes ------------------------------------------------------------------------------------------------
registerBiome('desert', { name: 'Deserto', hut: adobeHut, sky: 0xdcc6a0, hemi: [0xffeedd, 0x5e5238, 1.35], sun: [0xfff0d8, 2.5], water: [0x4a6a5a, 0.84],
    tint: { g: [0xd8b47a, 0.78], m: [0x8a6a4a, 0.45], r: [0xb27a58, 0.3], a: [0xb8a080, 0.12], d: [0xcfa26a, 0.55] },
    trees: [0.04, 0.42], conifer: [0x4a5232, 0x55593a], leaf: [0x7d7440, 0x8a7a44, 0x6c7140], dead: [0x7a6a58, 0x8a7864, 0x6a5a4a],
    tuft: [0xc8b070, 0xb7a467, 0xd4bc80, 0xa89458], tufts: 0.45, mud: 0.3, map: { mesa: true, lakes: false, forest: 0.12, mountains: 1 } });
registerBiome('forest', { name: 'Foresta', sky: 0xb4c0a6, hemi: [0xeef6e0, 0x3a4630, 1.3], sun: [0xfff2dc, 2.3], water: [0x2e4c42, 0.86],
    tint: { g: [0x5a7e36, 0.62], m: [0x4a3a28, 0.3], r: [0x7a806a, 0.25], a: [0x5a5a56, 0.05], d: [0x6e5a3e, 0.35] },
    trees: [0.5, 0.95], conifer: [0x2c4628, 0x34502c, 0x3c5a30, 0x284024], leaf: [0x4c7630, 0x5a8434, 0x66883a, 0x46682c], dead: [0x5d5148, 0x6a5a4a],
    tuft: [0x6f8a3c, 0x7e9446, 0x5f7a34, 0x8c9a50], tufts: 1.3, mud: 1, map: { mesa: false, lakes: true, forest: 1, mountains: 0.8 } });
registerBiome('ice', { name: 'Ghiaccio', sky: 0xd2dbe4, hemi: [0xeaf2ff, 0x6a7482, 1.4], sun: [0xf2f6ff, 2.2], water: [0x9cb8c8, 0.95],
    tint: { g: [0xf0f4f8, 0.9], m: [0x8a96a2, 0.85], r: [0x8a929c, 0.45], a: [0xc8ccd2, 0.3], d: [0xdfe5ec, 0.8] },
    trees: [0.78, 0.84], conifer: [0x5e746a, 0x6c8278, 0x536860, 0x7a8e86], leaf: [0x7a8274, 0x6c7466], dead: [0x5a5450, 0x6a625c],
    tuft: [0xc8ccc4, 0xb4b8ae, 0xd8dcd4], tufts: 0.25, mud: 0.25, snow: true, map: { mesa: false, lakes: true, forest: 0.45, mountains: 1.3 } });
registerBiome('ash', { name: 'Terre bruciate', sky: 0x9e968e, hemi: [0xdcd2c8, 0x3e3834, 1.25], sun: [0xffd6ae, 1.9], water: [0x3a3a32, 0.88],
    tint: { g: [0x6a625a, 0.76], m: [0x2a2826, 0.5], r: [0x5a5450, 0.4], a: [0x4a4846, 0.1], d: [0x5c544c, 0.62] },
    trees: [0.08, 0.2], conifer: [0x2e3028, 0x3a3a30], leaf: [0x4e4a38, 0x5a5440], dead: [0x3a3430, 0x2e2a28, 0x4a423c],
    tuft: [0x6a645a, 0x5a564e, 0x7a7266], tufts: 0.55, mud: 0.7, map: { mesa: true, lakes: false, forest: 0.35, mountains: 1 } });

// ---- Zone layouts -------------------------------------------------------------------------------------------
registerLayout('wild', { name: 'lande aperte', forestK: 1, ruins: 1,
    after(placed) { for (let k = 0; k < 4; k++) { const A = findArea(6, 6, { sites: placed }); onArea(A, 6, 6, (x, z, g) => (BIOME().hut || shack)(x, z, g, [rng() - 0.5, rng() - 0.5])); } } });
registerLayout('rural', { name: 'campagna', forestK: 0.7, ruins: 0.3,
    build(placed) { for (let k = 0; k < 6; k++) farmstead(placed); } });
registerLayout('villages', { name: 'villaggi', forestK: 0.8, ruins: 0.3,
    build(placed) { for (let k = 0; k < 3; k++) village(placed); for (let k = 0; k < 2; k++) farmstead(placed); } });
registerLayout('city', { name: 'città distrutta', forestK: 0.2, ruins: 0, rocksK: 0.4,
    build(placed, ns) { cityGrid(placed, ns); } });

// ---- Geographies --------------------------------------------------------------------------------------------
/** Flat land round the geography, so its ridges and plateaus read as walls. */
function flatLand(P) { P.mountains *= 0.2; P.mesa = false; P.relief = Math.min(P.relief, 6); }
registerGeo('ridges', { name: 'creste e passi', brief: 'Creste di roccia tagliano il settore: si passa solo dai passi.', landRank: 2, land: flatLand,
    // ridges across the whole map, so the passes (and the roads through them) are the only ways on
    shape(N, ns, SC, EC) {
      const S2 = Math.SQRT1_2, u0 = (SC[0] + SC[1]) * S2, u1 = (EC[0] + EC[1]) * S2, ridges = [];
      const ts = N >= 176 ? [0.26, 0.78] : [0.28];
      ts.forEach((t, r) => {
        const passes = [(rng() - 0.5) * N * 0.6]; if (rng() < 0.55) passes.push(passes[0] + (rng() < 0.5 ? 1 : -1) * (30 + rng() * 30));
        ridges.push({ u: u0 + (u1 - u0) * t, passes, s: ns + 40 + r * 7, h: tune.ridge_height * (0.85 + rng() * 0.3) });
      });
      return {
        ridges,
        raise(cx, cz) {
          let h = 0;
          const u = (cx + cz) * S2, v = (cx - cz) * S2;
          for (const Rr of ridges) {
            const uc = Rr.u + (vnoise(v / 28, 0.5, Rr.s) - 0.5) * 22, hw = 3 + vnoise(v / 12, 1.5, Rr.s) * 3, d = Math.abs(u - uc);
            if (d > hw + 3) continue;
            let gap = 1; for (const pv of Rr.passes) gap = Math.min(gap, smooth(4, 8, Math.abs(v - pv)));
            h = Math.max(h, Rr.h * smooth(hw + 2.5, hw, d) * gap);
          }
          return h;
        },
        block(cx, cz) { const u = (cx + cz) * S2; return ridges.some(Rr => Math.abs(u - Rr.u) < 22); },
      };
    } });
registerGeo('river', { name: 'fiume largo', brief: 'Un fiume largo e profondo: ponti e un guado, nient\'altro.', wideRiver: true, landRank: 1,
    land(P) { P.mountains *= 0.5; P.mesa = false; } });
registerGeo('plateau', { name: 'altipiani', brief: 'Altipiani a strapiombo: chi sta sopra vede e spara per primo.', landRank: 2, land: flatLand,
    shape(N, ns) { return { raise: (cx, cz) => tune.plateau_height * smooth(0.5, 0.535, fbm(cx / 42, cz / 42, ns + 30, 3)) }; } });
registerGeo('hills', { name: 'colline', brief: 'Colline alte e valli strette.', pairsOnly: ['river'], landRank: 3,
    land(P) { P.mountains = Math.max(1, P.mountains) * tune.hills_k; P.relief += 4; } });

// ---- Map shapes ---------------------------------------------------------------------------------------------
registerShape('open', { name: 'aperta' });
registerShape('valley', { name: 'valle tra pareti di roccia',
    wall(cx, cz, N, ns, C) {
      const vAx = ((cx - C) - (cz - C)) * Math.SQRT1_2, uAx = ((cx - C) + (cz - C)) * Math.SQRT1_2;
      const hw = N * tune.valley_width + (vnoise(uAx / 30, 3.5, ns + 50) - 0.5) * 16; return smooth(hw, hw + 6, Math.abs(vAx));
    } });
registerShape('basin', { name: 'conca tra le montagne',
    wall(cx, cz, N, ns, C) { const a = Math.atan2(cz - C, cx - C), R = N * 0.47 * (1 + (vnoise(a * 2 + 9, 0.5, ns + 51) - 0.5) * 0.16); return smooth(R, R + 7, Math.hypot(cx - C, cz - C)); } });
