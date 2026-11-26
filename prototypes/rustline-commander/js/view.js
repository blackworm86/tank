// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-25
// The 3D view (three.js): voxel chunks, voxel-built figures, effects, rings and the isometric camera.
'use strict';

const R3 = { ready: false };
/** Figure palette: the player's olive drab, the raiders' blood red and yellow. */
const PC = {
  olive: 0x5b6c3b, olive2: 0x6f7f47, drab: 0x4a5931, stripe: 0x93b24a, track: 0x2f2a26, wheel: 0x4a4440,
  metal: 0x3a3a38, skin: 0xc99a72, khaki: 0x8b7b55, helmet: 0x3f4b2c, rust: 0x8e4b27, rustD: 0x6a3518,
  red: 0xa62f28, yel: 0xdab33d, leather: 0x4e3a2c, rshirt: 0x7a3b2a, grey: 0x7d7a74, white: 0xe8e2d0,
  cyan: 0x4fe3e0, black: 0x1d1b1a, glass: 0x2a3a40, brass: 0xc9a23a, ghillie: 0x6f7a45, ghillie2: 0x8a8a55,
};
const cam = { x: 0, y: 0, z: 0, yaw: Math.PI / 4, yawT: Math.PI / 4, dist: 70, shake: 0 };

// ---- Setup ----------------------------------------------------------------------------------------
function initView() {
  const gl = document.createElement('canvas'); gl.id = 'gl';
  document.body.insertBefore(gl, document.getElementById('game'));
  const r = new THREE.WebGLRenderer({ canvas: gl, antialias: !CHEAP, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  r.setPixelRatio(CHEAP ? 0.5 : Math.min(devicePixelRatio || 1, 1.5));
  r.shadowMap.enabled = !CHEAP; r.shadowMap.type = THREE.PCFSoftShadowMap;
  R3.renderer = r; R3.gl = gl;
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0xd9c9a8);
  sc.fog = new THREE.Fog(0xd9c9a8, 120, 320);
  R3.scene = sc;
  R3.camera = new THREE.PerspectiveCamera(tune.cam_fov, W / H, 1, 1500);
  sc.add(new THREE.HemisphereLight(0xffeedd, 0x5e5238, 1.35));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.5);
  sun.castShadow = !CHEAP;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -80, right: 80, top: 80, bottom: -80, near: 1, far: 320 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  sc.add(sun); sc.add(sun.target); R3.sun = sun;

  // every voxel face gets a thin darker rim: the voxel look stays readable from far away
  const tc = document.createElement('canvas'); tc.width = tc.height = 16;
  const x = tc.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = 'rgb(205,200,195)'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1); x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
  x.fillStyle = 'rgb(238,236,232)'; for (let i = 0; i < 9; i++) x.fillRect(2 + (i * 5) % 12, 2 + (i * 7) % 12, 1, 1);
  const tex = new THREE.CanvasTexture(tc);
  tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestMipmapLinearFilter; tex.colorSpace = THREE.SRGBColorSpace;
  R3.atlas = makeVoxAtlas(); // biomes.js: a patterned tile per voxel kind (bricks, tiles, panes, planks...)
  R3.voxMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: R3.atlas.tex });
  R3.vlin = VCOL.map(h => new THREE.Color(h || 0));
  R3.chunks = new Map(); R3.chunkGroup = new THREE.Group(); sc.add(R3.chunkGroup);

  initTerrain(); // terrain.js: ground textures, ground material, trees, tufts, stones
  R3.water = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshPhongMaterial({ color: 0x3d5a50, specular: 0x9fb0a6, shininess: 90, transparent: true, opacity: 0.84, depthWrite: false, normalMap: R3.terTex.wn, normalScale: new THREE.Vector2(0.55, 0.55) }));
  R3.water.rotation.x = -Math.PI / 2; R3.water.receiveShadow = !CHEAP; sc.add(R3.water);
  R3.outer = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshBasicMaterial({ color: 0x000000, fog: false })); // the void past the map's edge
  R3.outer.rotation.x = -Math.PI / 2; sc.add(R3.outer);

  R3.units = new THREE.Group(); sc.add(R3.units);
  R3.box = new THREE.BoxGeometry(1, 1, 1);
  R3.mats = new Map();
  // debris cubes
  R3.debris = new THREE.InstancedMesh(R3.box, new THREE.MeshLambertMaterial({ color: 0xffffff }), 2000);
  R3.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  R3.debris.setColorAt(0, new THREE.Color(1, 1, 1)); R3.debris.count = 0; R3.debris.castShadow = !CHEAP;
  R3.debris.frustumCulled = false;
  sc.add(R3.debris);
  // tracers
  R3.tracerGeo = new THREE.BufferGeometry();
  R3.tracerPos = new Float32Array(600 * 6); R3.tracerCol = new Float32Array(600 * 6);
  R3.tracerGeo.setAttribute('position', new THREE.BufferAttribute(R3.tracerPos, 3).setUsage(THREE.DynamicDrawUsage));
  R3.tracerGeo.setAttribute('color', new THREE.BufferAttribute(R3.tracerCol, 3).setUsage(THREE.DynamicDrawUsage));
  R3.tracers = new THREE.LineSegments(R3.tracerGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, fog: false }));
  R3.tracers.frustumCulled = false; sc.add(R3.tracers);
  // pools for flashes, smoke, shells, order marks, scrap pickups
  R3.pools = {};
  makePool('flash', () => new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, fog: false })));
  makePool('smoke', () => new THREE.Mesh(R3.box, new THREE.MeshLambertMaterial({ color: 0x6f6259, transparent: true })));
  makePool('shell', () => new THREE.Mesh(R3.box, new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })));
  makePool('mark', () => { const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 24), new THREE.MeshBasicMaterial({ color: 0x4fe3e0, transparent: true, side: THREE.DoubleSide, fog: false })); m.rotation.x = -Math.PI / 2; return m; });
  makePool('pick', () => makePickupModel());
  makePool('ammo', () => makeCrateModel(0x5a6a30, PC.yel));
  makePool('loot', () => makeCrateModel(0x2f6f8f, 0x8fe0ff));
  // rings: radio (dashed cyan), dispersion circle, gun line, mouse mark
  R3.radio = makeLoop(128, new THREE.LineDashedMaterial({ color: 0x4fe3e0, dashSize: 1.4, gapSize: 0.9, transparent: true, opacity: 0.9, fog: false }));
  R3.aim = makeLoop(56, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, fog: false }));
  R3.aim2 = makeLoop(56, new THREE.LineBasicMaterial({ color: 0x1d1b1a, transparent: true, opacity: 0.5, fog: false }));
  R3.gunLine = makeLine(33, new THREE.LineBasicMaterial({ color: 0xffd080, transparent: true, opacity: 0.7, fog: false }));
  R3.gunRed = makeLine(33, new THREE.LineBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.9, fog: false, depthTest: false }));
  R3.mouseMark = makeLoop(4, new THREE.LineBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.85, fog: false }));
  R3.ready = true;
  fitGL();
}
function makePool(name, make) { R3.pools[name] = { make, items: [], used: 0 }; }
function poolGet(name) {
  const p = R3.pools[name];
  if (p.used >= p.items.length) { const m = p.make(); p.items.push(m); R3.scene.add(m); }
  const m = p.items[p.used++]; m.visible = true; return m;
}
function poolsBegin() { for (const k in R3.pools) R3.pools[k].used = 0; }
function poolsEnd() { for (const k in R3.pools) { const p = R3.pools[k]; for (let i = p.used; i < p.items.length; i++) p.items[i].visible = false; } }
function makeLoop(n, m) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const l = new THREE.LineLoop(g, m); l.frustumCulled = false; R3.scene.add(l); return l;
}
function makeLine(n, m) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const l = new THREE.Line(g, m); l.frustumCulled = false; R3.scene.add(l); return l;
}
/** Sizes the GL canvas to match the HUD canvas. */
function fitGL() {
  if (!R3.ready) return;
  const c = document.getElementById('game');
  const w = parseInt(c.style.width) || W, h = parseInt(c.style.height) || H;
  R3.renderer.setSize(w, h, false);
  Object.assign(R3.gl.style, { width: w + 'px', height: h + 'px', left: c.style.left, top: c.style.top });
}

// ---- Voxel chunks ---------------------------------------------------------------------------------
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
const UVS = [[0, 0], [0, 1], [1, 1], [1, 0]];
/** Terrain whose 1-voxel steps are drawn as ramps (buildings and walls keep hard edges). */
function rampTop(x, z) { if (!inMap(x, z)) return -1; const h = world.hmap[x + world.N * z]; return h > 0 && NATURAL.has(world.vox[VH * (x + world.N * z) + h - 1]) ? h : -1; }
/** How far a column's top corner (cx,cz in 0..1) rises: 1 when a terrain column touching that corner is exactly one voxel taller. */
function cornerRise(x, z, h, cx, cz) {
  for (let dz = cz - 1; dz <= cz; dz++) for (let dx = cx - 1; dx <= cx; dx++) if ((dx || dz) && rampTop(x + dx, z + dz) === h + 1) return 1;
  return 0;
}
const NATURAL = new Set([V.SAND, V.DIRT, V.ROCK, V.RED, V.ROAD]);
function buildChunkGeo(cx, cz) {
  const N = world.N, x0 = cx * 16, z0 = cz * 16;
  const pos = [], nor = [], col = [], uv = [], idx = [];
  let vcount = 0;
  const sm = smoothLook(), snowy = !!BIOME().snow;
  // smooth look: a neighbour that is ground below the drawn surface, or a tree, counts as open
  const solidN = (x, y, z) => { const t = getV(x, y, z); if (!t || t === V.TREE) return false; if (!sm || !GROUNDV.has(t) || !inMap(x, z)) return true; return y >= TER.ground[x + N * z]; };
  for (let z = z0; z < z0 + 16; z++) for (let x = x0; x < x0 + 16; x++) {
    if (!inMap(x, z)) continue;
    const top = world.hmap[x + N * z], base = VH * (x + N * z), gtop = sm ? TER.ground[x + N * z] : 0;
    // a building's walls reach down past the drawn ground so no gap shows under them
    let skirt = 0;
    if (sm && top > gtop) { let lo = gtop; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (inMap(x + dx, z + dz)) lo = Math.min(lo, TER.gs[x + dx + N * (z + dz)]); skirt = gtop - lo + 0.6; }
    for (let y = sm ? gtop : 0; y < top; y++) {
      const t = world.vox[base + y]; if (!t || t === V.TREE) continue;
      const bc = R3.vlin[t], snowTop = snowy && y === top - 1 && !GROUNDV.has(t); // snow on the roofs in the ice lands
      const v = 0.9 + hash2(x * 7 + y * 3, z * 13 - y, 77) * 0.16;
      // the surface voxel of natural ground bends its top corners up toward a 1-voxel step: a ramp
      const ramp = !sm && y === top - 1 && NATURAL.has(t);
      const rise = ramp ? [cornerRise(x, z, top, 0, 0), cornerRise(x, z, top, 1, 0), cornerRise(x, z, top, 0, 1), cornerRise(x, z, top, 1, 1)] : null;
      for (let f = 0; f < 6; f++) {
        const F = FACES[f];
        if (f === 3 && (y === 0 || (sm && y === gtop))) continue;
        if (solidN(x + F.n[0], y + F.n[1], z + F.n[2])) continue;
        let k = v;
        if (f === 2 && NATURAL.has(t)) k *= 0.92 + vnoise(x / 6, z / 6, 5) * 0.16;
        if (f !== 2 && f !== 3) k *= 0.8 + 0.2 * Math.min(1, y / 14);
        for (let i = 0; i < 4; i++) {
          const c = F.c[i];
          pos.push(x + c[0], y + c[1] + (rise && c[1] ? rise[c[0] + 2 * c[2]] : 0) - (skirt && y === gtop && !c[1] && f !== 2 ? skirt : 0), z + c[2]); nor.push(F.n[0], F.n[1], F.n[2]);
          const uu = F.n[0] ? c[2] : c[0], vv = F.n[1] ? c[2] : c[1], au = atlasUV(t, F.n[0] < 0 || F.n[2] > 0 ? 1 - uu : uu, vv);
          if (snowTop && f === 2) col.push(0.62 + bc.r * k * 0.3, 0.64 + bc.g * k * 0.3, 0.68 + bc.b * k * 0.3); else col.push(bc.r * k, bc.g * k, bc.b * k);
          uv.push(au[0], au[1]);
        }
        idx.push(vcount, vcount + 1, vcount + 2, vcount, vcount + 2, vcount + 3);
        vcount += 4;
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(vcount > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
function setChunk(key) {
  const cx = key % 64, cz = Math.floor(key / 64);
  if (cx * 16 >= world.N || cz * 16 >= world.N) return;
  let m = R3.chunks.get(key);
  if (smoothLook()) terrainCells(cx * 16 - 2, cz * 16 - 2, cx * 16 + 17, cz * 16 + 17);
  const g = buildChunkGeo(cx, cz);
  if (m) { m.geometry.dispose(); m.geometry = g; }
  else { m = new THREE.Mesh(g, R3.voxMat); m.castShadow = !CHEAP; m.receiveShadow = !CHEAP; R3.chunks.set(key, m); R3.chunkGroup.add(m); }
  setTerrainChunk(key);
  TER.decorDirty = true;
}
/** Throws away every chunk and builds the new world's. */
function rebuildWorldView() {
  if (!R3.ready) return;
  for (const m of R3.chunks.values()) { m.geometry.dispose(); R3.chunkGroup.remove(m); }
  R3.chunks.clear(); clearTerrainChunks();
  R3.look = smoothLook(); terrainReset();
  const n = world.N / 16;
  for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) setChunk(cx + cz * 64);
  world.dirty.clear();
  applyBiomeView(); rebuildDecor(); buildPropsView();
  const WS = world.N;
  R3.terTex.wn.repeat.set(WS / 9, WS / 9);
  R3.water.scale.set(WS, WS, 1); R3.water.position.set(world.N / 2, world.WL - 0.2, world.N / 2);
  R3.outer.position.set(world.N / 2, -0.5, world.N / 2);
  for (const c of R3.units.children.slice()) R3.units.remove(c);
  R3.worldGen = world.gen;
}
function rebuildDirty(max) {
  let n = 0;
  for (const k of world.dirty) { setChunk(k); world.dirty.delete(k); if (++n >= max) break; }
}

// ---- Figures, every one built from voxels ---------------------------------------------------------
function mat(hex) { let m = R3.mats.get(hex); if (!m) { m = new THREE.MeshLambertMaterial({ color: hex }); R3.mats.set(hex, m); } return m; }
function bx(p, sx, sy, sz, hex, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(R3.box, mat(hex)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = !CHEAP; p.add(m); return m;
}
function selRing(g, r) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r * 0.78, r, 24), new THREE.MeshBasicMaterial({ color: 0x4fe3e0, side: THREE.DoubleSide, fog: false, transparent: true, opacity: 0.95 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.08; m.visible = false; g.add(m); g.userData.ring = m;
}
/** The command tank. Barrel length, antenna height and armour skirts follow the fitted parts. */
function makeTankModel(look) {
  const g = new THREE.Group(), hull = new THREE.Group(); g.add(hull);
  for (const s of [-1, 1]) {
    bx(hull, 0.9, 1.0, 5.4, PC.track, s * 1.45, 0.5, 0);
    for (let i = -2; i <= 2; i++) bx(hull, 0.96, 0.5, 0.5, PC.wheel, s * 1.45, 0.38, i * 1.05);
    bx(hull, 0.96, 0.2, 5.0, 0x3a3430, s * 1.45, 1.02, 0);
  }
  bx(hull, 2.2, 0.8, 5.0, PC.olive, 0, 0.75, 0);
  bx(hull, 3.1, 0.35, 4.6, PC.olive2, 0, 1.3, -0.1);
  bx(hull, 2.8, 0.45, 0.7, PC.olive, 0, 1.0, 2.55, -0.5);
  bx(hull, 3.14, 0.1, 0.55, PC.stripe, 0, 1.5, 1.4);
  bx(hull, 0.7, 0.06, 0.9, PC.rust, 0.8, 1.49, -1.3); bx(hull, 0.5, 0.06, 0.6, PC.rust, -1.0, 1.49, 0.6);
  bx(hull, 0.3, 0.3, 0.7, PC.metal, -1.0, 1.6, -2.3); bx(hull, 0.3, 0.3, 0.7, PC.metal, 1.0, 1.6, -2.3);
  bx(hull, 0.5, 0.6, 0.28, 0x6b7a3a, -0.6, 1.55, -2.5); bx(hull, 0.5, 0.6, 0.28, 0x6b7a3a, 0.0, 1.55, -2.5);
  if (look.armor >= 1) for (const s of [-1, 1]) bx(hull, 0.16, 0.75, 4.6, PC.drab, s * 2.0, 0.95, 0);
  if (look.armor >= 2) for (const s of [-1, 1]) for (let i = -2; i <= 2; i++) bx(hull, 0.22, 0.4, 0.75, PC.olive2, s * 2.1, 1.15, i * 0.9);
  const tur = new THREE.Group(); tur.position.set(0, 1.47, -0.25); g.add(tur);
  bx(tur, 2.2, 0.8, 2.5, PC.olive, 0, 0.4, 0);
  bx(tur, 1.8, 0.28, 2.0, PC.olive2, 0, 0.92, -0.1);
  bx(tur, 2.24, 0.12, 0.5, PC.stripe, 0, 0.6, 0.5);
  bx(tur, 0.95, 0.65, 0.45, PC.olive2, 0, 0.42, 1.35);
  const L = look.barrel;
  const gun = new THREE.Group(); gun.position.set(0, 0.45, 1.4); tur.add(gun);
  bx(gun, 0.3, 0.3, L, PC.metal, 0, 0, L / 2);
  bx(gun, 0.46, 0.46, 0.42, PC.black, 0, 0, L);
  bx(tur, 0.75, 0.2, 0.75, PC.black, 0.45, 1.1, -0.5);
  bx(tur, 0.46, 0.46, 0.4, 0x6b6a45, 0.45, 1.38, -0.5);
  bx(tur, 0.3, 0.3, 0.3, PC.skin, 0.45, 1.75, -0.5);
  bx(tur, 0.36, 0.12, 0.36, PC.helmet, 0.45, 1.95, -0.5);
  const A = look.antenna;
  bx(tur, 0.08, A, 0.08, PC.black, -0.75, 0.9 + A / 2, -0.95);
  bx(tur, 0.2, 0.2, 0.2, PC.cyan, -0.75, 0.9 + A, -0.95);
  if (look.radio >= 2) bx(tur, 0.6, 0.08, 0.08, PC.black, -0.75, 0.9 + A * 0.8, -0.95);
  g.userData = { turret: tur, gun, hull, gunZ: 1.4 };
  selRing(g, 3.6);
  return g;
}
function legs(g, pants) { const a = bx(g, 0.22, 0.6, 0.26, pants, -0.13, 0.3, 0), b = bx(g, 0.22, 0.6, 0.26, pants, 0.13, 0.3, 0); return [a, b]; }
function makeSoldier(kind) {
  const g = new THREE.Group(), s = new THREE.Group(); g.add(s); s.scale.setScalar(1.45);
  const raider = kind.startsWith('r_');
  const pants = raider ? PC.leather : PC.khaki, shirt = raider ? PC.rshirt : PC.olive;
  const lg = legs(s, pants);
  const wide = kind === 'mg' || kind === 'r_mg';
  bx(s, wide ? 0.66 : 0.55, 0.6, 0.34, shirt, 0, 0.9, 0);
  bx(s, 0.16, 0.5, 0.18, shirt, wide ? -0.42 : -0.36, 0.95, 0.06); bx(s, 0.16, 0.5, 0.18, shirt, wide ? 0.42 : 0.36, 0.95, 0.06);
  bx(s, 0.3, 0.3, 0.3, PC.skin, 0, 1.37, 0);
  if (kind === 'rifle') { bx(s, 0.4, 0.16, 0.4, PC.helmet, 0, 1.56, 0); bx(s, 0.08, 0.1, 0.95, 0x3a2e24, 0.22, 0.98, 0.42); bx(s, 0.3, 0.3, 0.2, 0x4f5a34, 0, 0.95, -0.24); }
  if (kind === 'sniper') {
    bx(s, 0.74, 0.55, 0.48, PC.ghillie, 0, 1.0, -0.04); bx(s, 0.46, 0.38, 0.46, PC.ghillie2, 0, 1.44, -0.02);
    for (let i = 0; i < 5; i++) bx(s, 0.16, 0.22, 0.16, i % 2 ? PC.ghillie : PC.ghillie2, -0.3 + i * 0.15, 0.62, -0.18 + (i % 3) * 0.12);
    bx(s, 0.07, 0.09, 1.5, 0x2e2a20, 0.24, 1.08, 0.55); bx(s, 0.11, 0.12, 0.32, PC.black, 0.24, 1.18, 0.4);
  }
  if (kind === 'mg') {
    bx(s, 0.42, 0.16, 0.42, PC.helmet, 0, 1.56, 0);
    bx(s, 0.1, 0.62, 0.1, PC.brass, 0, 0.95, 0.19, 0, 0, 0.7);
    bx(s, 0.16, 0.18, 1.05, PC.metal, 0.25, 0.98, 0.5); bx(s, 0.3, 0.22, 0.3, PC.metal, 0.25, 0.85, 0.2);
    bx(s, 0.45, 0.42, 0.26, 0x4a4a30, 0, 0.95, -0.3);
  }
  if (kind === 'medic') {
    bx(s, 0.42, 0.16, 0.42, PC.white, 0, 1.56, 0); bx(s, 0.3, 0.04, 0.08, PC.red, 0, 1.65, 0); bx(s, 0.08, 0.04, 0.3, PC.red, 0, 1.65, 0);
    bx(s, 0.48, 0.52, 0.28, PC.white, 0, 0.98, -0.3); bx(s, 0.3, 0.08, 0.04, PC.red, 0, 1.02, -0.45); bx(s, 0.08, 0.3, 0.04, PC.red, 0, 1.02, -0.45);
    bx(s, 0.18, 0.06, 0.2, PC.red, -0.36, 1.08, 0.06);
  }
  if (kind === 'eng') {
    bx(s, 0.42, 0.16, 0.42, PC.yel, 0, 1.56, 0);
    bx(s, 0.46, 0.46, 0.26, 0x6a5a30, 0, 0.98, -0.3); bx(s, 0.08, 0.08, 0.9, PC.metal, -0.18, 1.1, -0.4, 0.9);
    bx(s, 0.3, 0.12, 0.3, PC.metal, -0.18, 0.62, -0.75); bx(s, 0.08, 0.1, 0.8, 0x3a2e24, 0.22, 0.98, 0.38);
  }
  if (kind === 'radio') {
    bx(s, 0.4, 0.16, 0.4, PC.helmet, 0, 1.56, 0);
    bx(s, 0.5, 0.6, 0.3, 0x4f5a34, 0, 1.0, -0.32); bx(s, 0.04, 1.3, 0.04, PC.black, -0.16, 1.9, -0.36); bx(s, 0.12, 0.06, 0.12, PC.red, -0.16, 2.55, -0.36);
    bx(s, 0.08, 0.1, 0.8, 0x3a2e24, 0.22, 0.98, 0.38);
  }
  if (kind === 'scout') {
    bx(s, 0.38, 0.12, 0.38, 0x8a7a48, 0, 1.55, 0); bx(s, 0.44, 0.04, 0.5, 0x8a7a48, 0, 1.5, 0.04);
    bx(s, 0.22, 0.1, 0.1, PC.black, 0, 1.38, 0.18); bx(s, 0.08, 0.1, 0.7, 0x3a2e24, 0.22, 0.98, 0.36);
    bx(s, 0.5, 0.2, 0.2, 0x8a7a48, 0, 0.75, -0.2);
  }
  if (kind === 'mortar') {
    bx(s, 0.4, 0.16, 0.4, PC.helmet, 0, 1.56, 0);
    bx(s, 0.7, 0.08, 0.7, PC.metal, 0.62, 0.04, 0.45); bx(s, 0.2, 1.2, 0.2, 0x3a3a35, 0.62, 0.6, 0.6, -0.5);
    bx(s, 0.07, 0.5, 0.07, PC.metal, 0.62, 0.3, 0.95, 0.4);
    bx(s, 0.42, 0.28, 0.3, 0x6a5a30, -0.6, 0.14, 0.3); bx(s, 0.06, 0.29, 0.31, PC.yel, -0.6, 0.15, 0.3);
  }
  if (raider) {
    bx(s, 0.34, 0.14, 0.33, PC.red, 0, 1.3, 0.02);
    if (kind === 'r_rifle') {
      bx(s, 0.08, 0.22, 0.34, PC.yel, 0, 1.62, 0); bx(s, 0.08, 0.14, 0.2, PC.yel, 0, 1.78, -0.04);
      bx(s, 0.28, 0.16, 0.32, PC.leather, 0.36, 1.24, 0); bx(s, 0.06, 0.24, 0.06, 0xcfc8bd, 0.42, 1.4, 0);
      bx(s, 0.08, 0.1, 0.85, 0x3a2e24, 0.22, 0.98, 0.4);
    }
    if (kind === 'r_mg') {
      bx(s, 0.36, 0.36, 0.36, PC.grey, 0, 1.39, 0); bx(s, 0.3, 0.06, 0.04, PC.black, 0, 1.42, 0.19);
      bx(s, 0.62, 0.42, 0.1, PC.yel, 0, 0.95, 0.19); bx(s, 0.06, 0.42, 0.11, PC.black, -0.12, 0.95, 0.2); bx(s, 0.06, 0.42, 0.11, PC.black, 0.12, 0.95, 0.2);
      bx(s, 0.18, 0.2, 1.1, PC.metal, 0.28, 0.98, 0.5); bx(s, 0.12, 0.3, 0.12, PC.brass, 0.28, 0.8, 0.35);
    }
    if (kind === 'r_rpg') {
      bx(s, 0.36, 0.2, 0.38, PC.leather, 0, 1.52, -0.02);
      bx(s, 0.1, 0.08, 0.06, PC.yel, -0.07, 1.4, 0.16); bx(s, 0.1, 0.08, 0.06, PC.yel, 0.07, 1.4, 0.16);
      bx(s, 0.2, 0.2, 1.5, 0x5a5a3a, 0.3, 1.36, 0.1); bx(s, 0.27, 0.27, 0.34, PC.red, 0.3, 1.36, 0.95); bx(s, 0.14, 0.14, 0.2, PC.yel, 0.3, 1.36, 1.18);
    }
  }
  g.userData = { body: s, legs: lg };
  selRing(g, 0.95);
  return g;
}
function makeCarModel() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  bx(b, 2.2, 0.9, 3.6, PC.olive, 0, 1.0, 0); bx(b, 2.0, 0.5, 0.7, PC.olive2, 0, 1.15, 2.0, -0.45);
  for (const sx of [-1, 1]) for (const sz of [-1.2, 1.2]) bx(b, 0.4, 0.9, 0.9, PC.track, sx * 1.15, 0.45, sz);
  bx(b, 2.22, 0.1, 0.4, PC.stripe, 0, 1.46, 0.6);
  bx(b, 0.8, 0.12, 0.3, PC.glass, 0, 1.3, 1.75);
  const tur = new THREE.Group(); tur.position.set(0, 1.5, -0.3); g.add(tur);
  bx(tur, 1.2, 0.5, 1.2, PC.olive2, 0, 0.25, 0);
  const gun = new THREE.Group(); gun.position.set(0, 0.25, 0.6); tur.add(gun);
  bx(gun, 0.16, 0.16, 1.6, PC.metal, 0, 0, 0.8);
  bx(tur, 0.06, 1.3, 0.06, PC.black, -0.45, 1.0, -0.4); bx(tur, 0.12, 0.12, 0.12, PC.cyan, -0.45, 1.65, -0.4);
  g.userData = { turret: tur, gun, hull: b, gunZ: 0.6 };
  selRing(g, 2.6);
  return g;
}
function makeTechnicalModel() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  bx(b, 2.0, 0.5, 4.0, PC.rustD, 0, 0.75, 0);
  bx(b, 1.9, 0.9, 1.4, PC.rust, 0, 1.45, 0.9); bx(b, 1.7, 0.4, 0.05, PC.glass, 0, 1.62, 1.62);
  bx(b, 1.9, 0.12, 1.0, PC.yel, 0, 1.06, 1.6); bx(b, 0.12, 0.45, 2.0, PC.rust, -0.94, 1.2, -0.9); bx(b, 0.12, 0.45, 2.0, PC.rust, 0.94, 1.2, -0.9);
  for (const sx of [-1, 1]) for (const sz of [-1.3, 1.3]) bx(b, 0.4, 0.8, 0.8, PC.track, sx * 1.05, 0.4, sz);
  bx(b, 2.1, 0.3, 0.2, PC.grey, 0, 0.7, 2.05); for (const s of [-0.7, 0, 0.7]) bx(b, 0.08, 0.08, 0.4, 0xcfc8bd, s, 0.7, 2.3);
  const tur = new THREE.Group(); tur.position.set(0, 1.0, -0.9); g.add(tur);
  bx(tur, 0.14, 0.9, 0.14, PC.metal, 0, 0.45, 0);
  const gun = new THREE.Group(); gun.position.set(0, 0.95, 0.1); tur.add(gun);
  bx(gun, 0.18, 0.2, 1.2, PC.metal, 0, 0, 0.5); bx(gun, 0.5, 0.4, 0.06, PC.grey, 0, 0.1, 0.05);
  bx(tur, 0.45, 0.5, 0.3, PC.rshirt, 0, 0.9, -0.45); bx(tur, 0.26, 0.26, 0.26, PC.skin, 0, 1.3, -0.45); bx(tur, 0.28, 0.1, 0.28, PC.red, 0, 1.25, -0.43);
  g.userData = { turret: tur, gun, hull: b, gunZ: 0.1 };
  selRing(g, 2.6);
  return g;
}
function makeBossModel() {
  const g = new THREE.Group(), hull = new THREE.Group(); g.add(hull);
  for (const s of [-1, 1]) {
    bx(hull, 1.1, 1.2, 6.6, PC.track, s * 1.95, 0.6, 0);
    for (let i = -3; i <= 3; i++) bx(hull, 1.16, 0.6, 0.6, PC.wheel, s * 1.95, 0.45, i * 0.95);
  }
  bx(hull, 2.8, 1.0, 6.2, 0x7d2a1f, 0, 0.95, 0);
  bx(hull, 4.2, 0.45, 5.6, PC.rustD, 0, 1.6, -0.2);
  bx(hull, 4.6, 1.1, 0.35, PC.grey, 0, 0.8, 3.45);
  for (let i = 0; i < 6; i++) bx(hull, 0.72, 0.36, 0.37, i % 2 ? PC.yel : PC.black, -1.85 + i * 0.74, 1.1, 3.47);
  for (const s of [-1.6, -0.5, 0.5, 1.6]) bx(hull, 0.14, 0.14, 0.6, 0xcfc8bd, s, 0.7, 3.8);
  for (const s of [-1, 1]) { bx(hull, 0.3, 1.5, 0.3, PC.metal, s * 1.4, 2.4, -2.6); bx(hull, 0.4, 0.2, 0.4, PC.black, s * 1.4, 3.2, -2.6); }
  const tur = new THREE.Group(); tur.position.set(0, 1.85, -0.5); g.add(tur);
  bx(tur, 2.9, 1.1, 3.1, 0x7d2a1f, 0, 0.55, 0);
  bx(tur, 2.4, 0.3, 2.5, PC.rust, 0, 1.25, -0.1);
  bx(tur, 0.5, 0.4, 0.06, PC.white, -0.6, 0.65, 1.56); bx(tur, 0.5, 0.4, 0.06, PC.white, 0.6, 0.65, 1.56); bx(tur, 1.6, 0.2, 0.06, PC.white, 0, 0.3, 1.56);
  bx(tur, 0.2, 0.25, 0.07, PC.black, -0.6, 0.65, 1.58); bx(tur, 0.2, 0.25, 0.07, PC.black, 0.6, 0.65, 1.58);
  const gun = new THREE.Group(); gun.position.set(0, 0.55, 1.6); tur.add(gun);
  bx(gun, 0.42, 0.42, 4.2, PC.metal, 0, 0, 2.1); bx(gun, 0.62, 0.62, 0.5, PC.black, 0, 0, 4.2);
  bx(tur, 0.08, 2.6, 0.08, PC.black, 1.1, 2.4, -1.2); bx(tur, 0.7, 0.45, 0.04, PC.red, 1.45, 3.4, -1.2); bx(tur, 0.3, 0.2, 0.05, PC.yel, 1.45, 3.4, -1.2);
  g.userData = { turret: tur, gun, hull, gunZ: 1.6 };
  selRing(g, 4.2);
  return g;
}
/** The anti-tank gun: a low gun behind a shield on two wheels, with a crew of two. */
function makeATGunModel() {
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  for (const sx of [-1, 1]) bx(b, 0.25, 0.9, 0.9, PC.track, sx * 0.8, 0.45, 0.1);
  bx(b, 1.5, 0.25, 0.5, PC.olive2, 0, 0.55, 0.1);
  bx(b, 1.9, 1.0, 0.12, PC.olive, 0, 1.0, 0.45); bx(b, 1.92, 0.1, 0.14, PC.stripe, 0, 1.38, 0.45);
  bx(b, 0.2, 0.2, 2.4, PC.metal, 0, 0.85, 1.4); bx(b, 0.32, 0.32, 0.3, PC.black, 0, 0.85, 2.6);
  for (const sx of [-0.35, 0.35]) bx(b, 0.12, 0.12, 1.8, PC.olive2, sx, 0.3, -0.9, 0.12, sx * 0.4, 0);
  for (const [sx, sz] of [[-0.55, -0.4], [0.6, -0.9]]) {
    const c = new THREE.Group(); c.position.set(sx, 0, sz); b.add(c);
    bx(c, 0.22, 0.5, 0.26, PC.khaki, -0.1, 0.25, 0); bx(c, 0.22, 0.5, 0.26, PC.khaki, 0.1, 0.25, 0);
    bx(c, 0.5, 0.5, 0.32, PC.olive, 0, 0.75, 0); bx(c, 0.28, 0.28, 0.28, PC.skin, 0, 1.15, 0); bx(c, 0.36, 0.14, 0.36, PC.helmet, 0, 1.32, 0);
  }
  b.scale.setScalar(1.15);
  g.userData = { hull: b };
  selRing(g, 1.7);
  return g;
}
/** The support tank: a smaller tank in the player's paint, short gun, no commander. */
function makeLightTankModel() {
  const g = new THREE.Group(), hull = new THREE.Group(); g.add(hull);
  for (const s of [-1, 1]) {
    bx(hull, 0.75, 0.85, 4.2, PC.track, s * 1.2, 0.43, 0);
    for (let i = -1.5; i <= 1.5; i++) bx(hull, 0.8, 0.42, 0.42, PC.wheel, s * 1.2, 0.33, i * 1.0);
  }
  bx(hull, 1.8, 0.7, 3.9, PC.drab, 0, 0.65, 0);
  bx(hull, 2.5, 0.3, 3.6, PC.olive, 0, 1.12, -0.1);
  bx(hull, 2.3, 0.4, 0.55, PC.drab, 0, 0.85, 2.0, -0.5);
  bx(hull, 2.52, 0.08, 0.45, PC.stripe, 0, 1.3, 1.1);
  bx(hull, 0.4, 0.4, 0.5, PC.metal, -0.7, 1.4, -1.6);
  const tur = new THREE.Group(); tur.position.set(0, 1.27, -0.2); g.add(tur);
  bx(tur, 1.7, 0.65, 1.9, PC.olive, 0, 0.33, 0); bx(tur, 1.4, 0.2, 1.5, PC.drab, 0, 0.75, -0.1);
  bx(tur, 0.7, 0.5, 0.35, PC.drab, 0, 0.33, 1.05);
  const gun = new THREE.Group(); gun.position.set(0, 0.35, 1.1); tur.add(gun);
  bx(gun, 0.24, 0.24, 2.0, PC.metal, 0, 0, 1.0); bx(gun, 0.34, 0.34, 0.3, PC.black, 0, 0, 2.0);
  bx(tur, 0.06, 1.1, 0.06, PC.black, -0.55, 1.1, -0.6); bx(tur, 0.12, 0.12, 0.12, PC.cyan, -0.55, 1.66, -0.6);
  g.userData = { turret: tur, gun, hull, gunZ: 1.1 };
  selRing(g, 3.0);
  return g;
}
/** The troop carrier: a long boxy hull on tracks, a small machine-gun turret, a rear door. */
function makeAPCModel() {
  const g = new THREE.Group(), hull = new THREE.Group(); g.add(hull);
  for (const s of [-1, 1]) {
    bx(hull, 0.8, 0.9, 5.2, PC.track, s * 1.45, 0.45, 0);
    for (let i = -2; i <= 2; i++) bx(hull, 0.86, 0.46, 0.46, PC.wheel, s * 1.45, 0.35, i * 1.0);
  }
  bx(hull, 2.3, 1.5, 4.9, PC.olive, 0, 1.05, -0.1);
  bx(hull, 2.3, 0.7, 1.2, PC.olive2, 0, 1.15, 2.55, -0.75);
  bx(hull, 2.32, 0.1, 0.5, PC.stripe, 0, 1.82, 0.9);
  bx(hull, 1.3, 1.2, 0.12, PC.drab, 0, 1.0, -2.6); bx(hull, 0.12, 0.12, 0.12, PC.metal, 0.45, 1.0, -2.68);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) bx(hull, 0.06, 0.18, 0.45, PC.black, s * 1.16, 1.5, -1.4 + i * 1.0);
  bx(hull, 0.6, 0.06, 0.8, PC.rust, -0.6, 1.81, -1.4);
  const tur = new THREE.Group(); tur.position.set(0.3, 1.82, 0.4); g.add(tur);
  bx(tur, 1.0, 0.45, 1.0, PC.olive2, 0, 0.22, 0); bx(tur, 0.7, 0.4, 0.1, PC.drab, 0, 0.55, 0.45);
  const gun = new THREE.Group(); gun.position.set(0, 0.32, 0.5); tur.add(gun);
  bx(gun, 0.12, 0.12, 1.4, PC.metal, 0, 0, 0.7); bx(gun, 0.2, 0.2, 0.3, PC.black, 0, 0, 0.1);
  bx(tur, 0.42, 0.44, 0.3, 0x6b6a45, -0.25, 0.55, -0.35); bx(tur, 0.28, 0.28, 0.28, PC.skin, -0.25, 0.9, -0.35); bx(tur, 0.34, 0.12, 0.34, PC.helmet, -0.25, 1.08, -0.35);
  bx(tur, 0.06, 1.6, 0.06, PC.black, 0.4, 1.0, -0.4); bx(tur, 0.14, 0.14, 0.14, PC.cyan, 0.4, 1.8, -0.4);
  g.userData = { turret: tur, gun, hull, gunZ: 0.5 };
  selRing(g, 3.4);
  return g;
}
function makePickupModel() {
  const g = new THREE.Group(), s = new THREE.Group(); g.add(s);
  bx(s, 0.9, 0.6, 0.9, PC.rust, 0, 0.3, 0); bx(s, 0.92, 0.12, 0.2, PC.yel, 0, 0.62, 0);
  bx(s, 0.5, 0.5, 0.5, PC.grey, 0.25, 0.85, 0.1, 0.4, 0.3, 0); bx(s, 0.16, 0.6, 0.16, PC.metal, -0.3, 0.8, -0.2, 0, 0, 0.6);
  g.userData = { spin: s };
  return g;
}
/** A crate on the battlefield: rounds (olive, yellow band) or a hull module (blue). */
function makeCrateModel(body, band) {
  const g = new THREE.Group(), s = new THREE.Group(); g.add(s);
  bx(s, 1.0, 0.7, 0.7, body, 0, 0.35, 0); bx(s, 1.02, 0.14, 0.72, band, 0, 0.5, 0); bx(s, 0.2, 0.72, 0.74, band, 0, 0.36, 0);
  g.userData = { spin: s };
  return g;
}
function modelFor(e) {
  if (e.kind === 'tank') { const L = tankLook(); return L.hull === 'apc' ? makeAPCModel() : L.hull === 'light' ? makeLightTankModel() : makeTankModel(L); }
  if (e.kind === 'apc') return makeAPCModel();
  if (e.kind === 'car') return makeCarModel();
  if (e.kind === 'ltank') return makeLightTankModel();
  if (e.kind === 'at') return makeATGunModel();
  if (e.kind === 'technical') return makeTechnicalModel();
  if (e.kind === 'boss') return makeBossModel();
  return makeSoldier(e.kind);
}

// ---- Per-frame drawing of the world -----------------------------------------------------------------
function updateCamera() {
  const p = tune.cam_pitch * Math.PI / 180;
  let dy = cam.yawT - cam.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
  cam.yaw += dy * 0.15;
  const c = R3.camera;
  c.fov = tune.cam_fov; c.aspect = W / H; c.updateProjectionMatrix();
  const f = Math.floor((state.t || 0) * 60);
  const sx = (hash2(f, 1, 3) - 0.5) * cam.shake, sz = (hash2(f, 2, 3) - 0.5) * cam.shake;
  c.position.set(cam.x + Math.sin(cam.yaw) * Math.cos(p) * cam.dist + sx, cam.y + Math.sin(p) * cam.dist, cam.z + Math.cos(cam.yaw) * Math.cos(p) * cam.dist + sz);
  c.lookAt(cam.x + sx, cam.y, cam.z + sz);
  c.updateMatrixWorld();
  R3.scene.fog.near = cam.dist * 1.3; R3.scene.fog.far = cam.dist * 3.4 + 60;
  const s = R3.sun;
  s.position.set(cam.x - 45, cam.y + 95, cam.z - 30); s.target.position.set(cam.x, cam.y, cam.z);
  const ext = Math.min(110, cam.dist * 1.05);
  Object.assign(s.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext }); s.shadow.camera.updateProjectionMatrix();
}
/** World point to logical screen coordinates. */
const _v3 = { v: null };
function toScreen(x, y, z) {
  const v = (_v3.v || (_v3.v = new THREE.Vector3())).set(x, y, z).project(R3.camera);
  return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, on: v.z < 1 && v.z > -1 };
}
/** The ray under a logical screen point: {o, d}. */
function screenRay(mx, my) {
  const c = R3.camera, v = new THREE.Vector3(mx / W * 2 - 1, 1 - my / H * 2, 0.5).unproject(c);
  const d = v.sub(c.position).normalize();
  return { o: c.position.clone(), d };
}
/** The world point under the mouse: the first voxel face, or the water. */
function pickWorld(mx, my) {
  if (!R3.ready) return null;
  const { o, d } = screenRay(mx, my);
  const hit = rayVoxel(o.x, o.y, o.z, d.x, d.y, d.z, 1200);
  const tw = d.y < 0 ? (world.WL - 0.2 - o.y) / d.y : 1e9;
  if (hit && hit.t < tw) return { x: o.x + d.x * hit.t, y: o.y + d.y * hit.t, z: o.z + d.z * hit.t };
  if (tw < 1e9) return { x: o.x + d.x * tw, y: world.WL - 0.2, z: o.z + d.z * tw };
  return null;
}
function ringPoints(line, cx, cz, r, lift, dashed) {
  const a = line.geometry.attributes.position, n = a.count;
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, x = cx + Math.cos(t) * r, z = cz + Math.sin(t) * r;
    const h = hAt(x, z);
    a.setXYZ(i, x, (h < 99 ? Math.max(h, world.WL - 0.2) : world.WL) + lift, z);
  }
  a.needsUpdate = true;
  if (dashed) line.computeLineDistances();
}
/**
 * Adds a see-through twin to every part of a figure: drawn only where something stands in front of it
 * (a hill, a tree, a wall), green for the player's units and red for raiders, so hidden units still show.
 */
function addXray(model, hex) {
  if (!R3.xray) R3.xray = {};
  let m = R3.xray[hex];
  // drawn after the ground and before the figures (renderOrder 1 < 2): where the figure itself shows,
  // it covers its twin; only the parts behind a hill, tree or wall stay coloured
  if (!m) m = R3.xray[hex] = new THREE.MeshBasicMaterial({ color: hex, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -60 }); // a little slack: a hull dipping into a slope is not hidden
  const parts = []; model.traverse(o => { if (o.isMesh && o !== model.userData.ring) parts.push(o); });
  for (const o of parts) { const x = new THREE.Mesh(o.geometry, m); x.userData.xray = true; x.renderOrder = 1; o.renderOrder = 2; o.add(x); }
}
function syncModel(e) {
  if (!e.model) {
    e.model = modelFor(e); addXray(e.model, e.team ? 0xff4030 : 0x58ff5a); R3.units.add(e.model);
    const ud = e.model.userData; if (ud.turret && ud.hull && ud.turret.parent !== ud.hull) ud.hull.attach(ud.turret); // the turret sits on the hull: it pitches and rolls with it
  }
  const m = e.model, u = m.userData;
  m.position.set(e.x, e.vy + (e.kind === 'tank' ? 0 : surfaceY(e.x, e.z) - hAt(e.x, e.z)), e.z);
  m.rotation.set(0, e.heading, 0);
  if (u.hull) { u.hull.rotation.x = e.pitch || 0; u.hull.rotation.z = e.roll || 0; }
  if (u.turret) u.turret.rotation.y = (e.turretYaw ?? e.heading) - e.heading;
  if (u.gun) u.gun.position.z = u.gunZ - (e.recoil || 0) * 0.7;
  if (u.ring) { // the squad's colour; a picked soldier in white, the rest of his squad faint
    const on = !!e.selected && e.alive; u.ring.visible = on;
    if (on) {
      const pk = state.picked && state.picked.size ? state.picked.has(e) : null;
      u.ring.material.color.set(pk ? '#ffffff' : e.squad && e.kind !== 'tank' ? sqColor(e.squad) : '#4fe3e0');
      u.ring.material.opacity = pk === false ? 0.3 : 0.95; u.ring.scale.setScalar(pk ? 1.3 : 1);
    }
  }
  if (!e.alive && !u.xrayOff) { u.xrayOff = true; m.traverse(o => { if (o.userData.xray) o.visible = false; }); }
  if (u.legs && e.alive) { const sw = e.moving ? Math.sin(state.t * 11 + e.id) * 0.6 : 0; u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw; }
  if (u.body) u.body.scale.y = 1.45 * (e.alive && e.inCover && !e.moving ? 0.72 : 1);
  if (!e.alive) {
    if (e.veh) { if (!u.burnt) { m.traverse(o => { if (o.isMesh && o !== u.ring && !o.userData.xray) o.material = mat(0x2b2522); }); u.burnt = true; } }
    else { const k = Math.min(1, (state.t - e.deathT) * 3); m.rotation.z = k * Math.PI / 2 * (e.id % 2 ? 1 : -1); m.position.y = e.vy + 0.2 - Math.max(0, state.t - e.deathT - 4) * 0.4; }
  }
}
/**
 * The fog of war on the map: a dark see-through sheet laid over the tops of the voxels (ground, trees,
 * roofs), one vertex per 2x2 cell corner, its alpha growing where nobody sees (world.vis). The vertex
 * blend gives the fog a soft edge.
 */
function updateFogMesh() {
  const G = world.visG, V = world.vis, N = world.N;
  if (!G || !V || !tune.fog) { if (R3.fog) R3.fog.visible = false; return; }
  const n = G + 1;
  if (!R3.fog || R3.fogG !== G) {
    if (R3.fog) R3.scene.remove(R3.fog);
    const g = new THREE.BufferGeometry(), idx = [];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * n * 3), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * n * 4), 4));
    for (let z = 0; z < G; z++) for (let x = 0; x < G; x++) { const a = x + n * z, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
    g.setIndex(idx);
    R3.fog = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    R3.fog.renderOrder = 20; R3.fog.frustumCulled = false; R3.scene.add(R3.fog); R3.fogG = G; R3.fogN = -1;
  }
  R3.fog.visible = true;
  if (R3.fogN === world.visN) return; R3.fogN = world.visN;
  const P = R3.fog.geometry.attributes.position, C = R3.fog.geometry.attributes.color, dark = tune.fog_dark, H = world.hmap;
  const vis = (x, z) => V[Math.max(0, Math.min(G - 1, x)) + G * Math.max(0, Math.min(G - 1, z))];
  const X = world.exp && world.exp.length === G * G ? world.exp : null, ex = (x, z) => X[Math.max(0, Math.min(G - 1, x)) + G * Math.max(0, Math.min(G - 1, z))];
  const top = (x, z) => { x = Math.max(0, Math.min(N - 1, x)); z = Math.max(0, Math.min(N - 1, z)); return Math.max(world.gsm[x + N * z], H[x + N * z]); };
  for (let z = 0; z <= G; z++) for (let x = 0; x <= G; x++) {
    const i = x + n * z, wx = x * 2, wz = z * 2;
    const v = (vis(x - 1, z - 1) + vis(x, z - 1) + vis(x - 1, z) + vis(x, z)) / 4;
    const e = X ? (ex(x - 1, z - 1) + ex(x, z - 1) + ex(x - 1, z) + ex(x, z)) / 4 : 0;
    const h = Math.max(world.WL, top(wx - 1, wz - 1), top(wx, wz - 1), top(wx - 1, wz), top(wx, wz));
    P.setXYZ(i, wx, h + 0.15 + (1 - e) * tune.fog_lid, wz); // unexplored land is covered by a lid above trees and roofs
    C.setXYZW(i, 0.01, 0.02, 0.04, (1 - e) * tune.fog_unknown + e * (1 - v) * dark); // unexplored: near black; explored but unseen: dim
  }
  P.needsUpdate = true; C.needsUpdate = true;
}
/** Draws the play world: chunks, figures, effects, rings, camera. */
function renderWorld() {
  if (!R3.ready || !state.ents) return;
  if (R3.worldGen !== world.gen || R3.look !== smoothLook()) rebuildWorldView();
  rebuildDirty(10);
  if (TER.decorDirty && performance.now() - TER.decorAt > 400) rebuildDecor();
  R3.terTex.wn.offset.set((state.t || 0) * 0.011, (state.t || 0) * 0.006);
  updateCamera();
  for (const e of state.ents) {
    if (e.gone) { if (e.model) { R3.units.remove(e.model); e.model = null; } continue; }
    if (e.inside) { if (e.model) e.model.visible = false; continue; }
    if (e.kind === 'tank' && e.lookKey !== state.lookKey) { if (e.model) R3.units.remove(e.model); e.model = null; e.lookKey = state.lookKey; }
    syncModel(e);
    if (e.model) e.model.visible = !hiddenFoe(e); // the fog of war: a raider nobody sees is not drawn
  }
  for (const p of state.npcs || []) {
    if (!explored(p.x, p.z)) { if (p.models) for (const m of p.models) m.visible = false; continue; } // in unexplored land nobody is drawn // neutral people by the road: plain figures turned to the tank
    if (!p.models || p.models[0].parent !== R3.units) { p.models = []; for (let i = 0; i < p.n; i++) { const m = makeSoldier(p.kind); R3.units.add(m); p.models.push(m); } }
    p.models.forEach((m, i) => { const x = p.x + (i - (p.n - 1) / 2) * 1.5, z = p.z + (i % 2) * 0.9; m.position.set(x, surfaceY(x, z), z); m.rotation.set(0, Math.atan2(state.tank.x - x, state.tank.z - z), 0); m.visible = !p.done; });
  }
  updateFogMesh();
  updatePropsView();
  poolsBegin();
  // debris
  const D = R3.debris;
  if (!R3.tmp) R3.tmp = { m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), s: new THREE.Vector3(), p: new THREE.Vector3() };
  const T = R3.tmp;
  let n = 0;
  for (const d of state.debris) {
    if (n >= 2000) break;
    const k = Math.min(1, d.life / 1.2) * d.s;
    T.e.set(d.rx, d.ry, 0); T.q.setFromEuler(T.e); T.s.set(k, k, k); T.p.set(d.x, d.y, d.z);
    T.m.compose(T.p, T.q, T.s); D.setMatrixAt(n, T.m); D.setColorAt(n, R3.vlin[d.t] || R3.vlin[V.ROCK]); n++;
  }
  D.count = n; D.instanceMatrix.needsUpdate = true; if (D.instanceColor) D.instanceColor.needsUpdate = true;
  // flashes and smoke
  for (const f of state.fx) {
    const k = f.t / f.life;
    if (f.kind === 'flash') { const m = poolGet('flash'); m.position.set(f.x, f.y, f.z); m.scale.setScalar(f.s * (0.5 + k)); m.material.opacity = 1 - k; m.rotation.set(f.x, f.z, k); }
    else { const m = poolGet('smoke'); m.position.set(f.x, f.y + k * f.rise, f.z); m.scale.setScalar(f.s * (0.6 + k * 0.9)); m.material.opacity = 0.75 * (1 - k); m.material.color.setHex(f.col || 0x6f6259); m.rotation.set(k, f.x, 0); }
  }
  for (const p of state.proj) { const m = poolGet('shell'); m.position.set(p.x, p.y, p.z); m.scale.set(0.3, 0.3, 0.9); m.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz); }
  for (const o of state.marks) { const m = poolGet('mark'); const k = o.t / o.life; m.position.set(o.x, o.y + 0.15, o.z); m.scale.setScalar(1.6 - k); m.material.opacity = 1 - k; m.material.color.setHex(o.col); }
  for (const p of state.pickups) { if (p.taken) continue; const m = poolGet(p.loot ? 'loot' : p.ammo ? 'ammo' : 'pick'); m.position.set(p.x, hAt(p.x, p.z) + 0.6 + Math.sin(state.t * 3 + p.x) * 0.2, p.z); m.userData.spin.rotation.y = state.t * 1.5; }
  poolsEnd();
  // tracers
  let tn = 0; const tp = R3.tracerPos, tcl = R3.tracerCol;
  for (const t of state.tracers) {
    if (tn >= 600) break;
    const k = 1 - t.t / t.life, c = t.col, i = tn * 6, h = Math.min(1, t.t / t.life * 2.2);
    const hx = t.ax + (t.bx - t.ax) * h, hy = t.ay + (t.by - t.ay) * h, hz = t.az + (t.bz - t.az) * h;
    tp[i] = hx - (t.bx - t.ax) * 0.18; tp[i + 1] = hy - (t.by - t.ay) * 0.18; tp[i + 2] = hz - (t.bz - t.az) * 0.18;
    tp[i + 3] = hx; tp[i + 4] = hy; tp[i + 5] = hz;
    for (let j = 0; j < 6; j += 3) { tcl[i + j] = c[0] * k + 0.1; tcl[i + j + 1] = c[1] * k + 0.05; tcl[i + j + 2] = c[2] * k; }
    tn++;
  }
  R3.tracerGeo.setDrawRange(0, tn * 2);
  R3.tracerGeo.attributes.position.needsUpdate = true; R3.tracerGeo.attributes.color.needsUpdate = true;
  // rings: radio, dispersion circle, gun line
  const tk = state.tank;
  const show = !!tk && tk.alive && scene !== 'title';
  R3.radio.visible = show;
  R3.aim.visible = R3.aim2.visible = R3.gunLine.visible = show && state.mode === 'tank' && !!state.aimP;
  R3.gunRed.visible = R3.gunLine.visible && !!state.fireLine && state.fireLine.block >= 0;
  R3.mouseMark.visible = R3.aim.visible && !!state.mouse3;
  if (show) {
    ringPoints(R3.radio, tk.x, tk.z, tankStats().radio, 0.35, true);
    R3.radio.material.opacity = state.mode === 'cmd' ? 1 : 0.6;
    if (R3.aim.visible) {
      const a = state.aimP, r = Math.max(0.4, tk.spread * a.dist);
      ringPoints(R3.aim, a.x, a.z, r, 0.2, false); ringPoints(R3.aim2, a.x, a.z, r + 0.14, 0.18, false);
      R3.aim.material.color.setHex(tk.reload > 0 ? 0x9a9a9a : tk.aligned ? 0xffffff : 0xffa040);
      // the line of fire: the round's real path, red from the first thing in the way to the mouse
      const fl = state.fireLine, gp = R3.gunLine.geometry.attributes.position, rp = R3.gunRed.geometry.attributes.position;
      if (fl) {
        const end = fl.block >= 0 ? fl.block : 32;
        for (let k = 0; k <= end; k++) gp.setXYZ(k, fl.pts[k].x, fl.pts[k].y + 0.05, fl.pts[k].z);
        R3.gunLine.geometry.setDrawRange(0, end + 1); gp.needsUpdate = true;
        if (fl.block >= 0) { for (let k = fl.block; k <= 32; k++) rp.setXYZ(k - fl.block, fl.pts[k].x, fl.pts[k].y + 0.05, fl.pts[k].z); R3.gunRed.geometry.setDrawRange(0, 33 - fl.block); rp.needsUpdate = true; }
      }
      if (state.mouse3) {
        const m = state.mouse3, mp = R3.mouseMark.geometry.attributes.position;
        mp.setXYZ(0, m.x + 0.9, m.y + 0.2, m.z); mp.setXYZ(1, m.x, m.y + 0.2, m.z + 0.9); mp.setXYZ(2, m.x - 0.9, m.y + 0.2, m.z); mp.setXYZ(3, m.x, m.y + 0.2, m.z - 0.9); mp.needsUpdate = true;
      }
    }
  }
  R3.renderer.render(R3.scene, R3.camera);
}

// ---- The figures sheet (?scene=figures) ----------------------------------------------------------
const FIGS = [
  ['tank', 'Carro comando'], ['rifle', 'Fuciliere'], ['sniper', 'Cecchino'], ['mg', 'Mitragliere'], ['medic', 'Medico'], ['mortar', 'Mortaio'], ['at', 'Cannone anticarro'], ['car', 'Autoblindo'], ['ltank', 'Carro di supporto'], ['apc', 'Trasporto truppe'],
  ['r_rifle', 'Predone'], ['r_mg', 'Mitragliere predone'], ['r_rpg', 'Razziere'], ['technical', 'Tecnica'], ['boss', 'Carro del Capo'],
];
function renderFigures() {
  if (!R3.ready) return [];
  if (!R3.figScene) {
    const s = new THREE.Scene(); s.background = new THREE.Color(0xe9b58c);
    s.add(new THREE.HemisphereLight(0xffe6c8, 0x6b4a36, 1.4));
    const d = new THREE.DirectionalLight(0xfff0d8, 2.2); d.position.set(-20, 40, 30); s.add(d);
    const gnd = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0xd8a560 })); gnd.rotation.x = -Math.PI / 2; s.add(gnd);
    R3.figPos = [];
    FIGS.forEach(([k], i) => {
      const row = Math.floor(i / 5), col = i % 5; // three rows of five
      const x = (col - 2) * 8.5, z = -10 + row * 9;
      const m = modelFor({ kind: k }); m.position.set(x, 0, z); m.rotation.y = 0.6; s.add(m);
      R3.figPos.push({ x, z, k });
    });
    const c = new THREE.PerspectiveCamera(30, W / H, 1, 500);
    c.position.set(0, 44, 50); c.lookAt(0, 0, 0.5); c.updateMatrixWorld();
    R3.figScene = s; R3.figCam = c;
  }
  R3.renderer.render(R3.figScene, R3.figCam);
  return R3.figPos.map((p, i) => {
    const v = new THREE.Vector3(p.x, 0, p.z + 3.2).project(R3.figCam);
    return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, name: FIGS[i][1] };
  });
}
