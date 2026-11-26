// PROTOTYPE - NOT FOR PRODUCTION
// Question: guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15-20 minuti?
// Date: 2026-11-26
// Sound: the synthesised effects. (split from sim.js: docs/architecture/rustline-modular-plan.md)
'use strict';

// ---- Sound ---------------------------------------------------------------------------------------------
let NOISE = null;
function noiseBuf() {
  if (!NOISE && audio) {
    const ac = audio.ac, n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = hash2(i, 7, 9) * 2 - 1;
    NOISE = b;
  }
  return NOISE;
}
function boom(vol, dur, freq) {
  if (!audio || muted || vol <= 0.01) return;
  const ac = audio.ac, t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noiseBuf();
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(50, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(audio.out); src.start(t, (state.stepN % 50) / 100); src.stop(t + dur);
}
function sfx(kind, x, z) {
  if (!audio || muted || !state) return;
  if (state.snd > 8) return; state.snd = (state.snd || 0) + 1;
  const v = x === undefined ? 1 : Math.max(0, 1 - Math.hypot(x - cam.x, z - cam.z) / 110);
  if (v <= 0.02) return;
  switch (kind) {
    case 'cannon': boom(1.0 * v, 1.0, 1600); tone(48, 0.45, 'sine', 0.45 * v); break;
    case 'boom': boom(0.9 * v, 1.3, 900); tone(40, 0.6, 'sine', 0.35 * v); break;
    case 'boomS': boom(0.6 * v, 0.8, 1400); break;
    case 'small': boom(0.22 * v, 0.1, 4200); break;
    case 'sniper': boom(0.4 * v, 0.25, 3000); break;
    case 'mg': boom(0.16 * v, 0.06, 5200); break;
    case 'rpg': boom(0.35 * v, 0.5, 2600); break;
    case 'mortar': boom(0.3 * v, 0.35, 700); tone(220, 0.2, 'sine', 0.2 * v); break;
    case 'crunch': boom(0.35 * v, 0.25, 1200); break;
    case 'radio': tone(1250, 0.05, 'square', 0.08); tone(1650, 0.08, 'square', 0.06); break;
    case 'coin': tone(880, 0.08, 'triangle', 0.18); tone(1320, 0.14, 'triangle', 0.14); break;
  }
}
