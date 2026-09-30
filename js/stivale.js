'use strict';
/* ============================================================
   STIVALE (titolo provvisorio) — corri e spara in stile cartone anni '30.
   Un pianeta a forma di Stivale, abitato da animali, invaso da "alieni" in tuta spaziale.
   4 eroi (Remo, Nina, Bruno, Alba), 8 missioni da Roma all'Etna, ognuna col suo boss;
   il professor Gufo fa il briefing, la Vespona è il veicolo. Un colpo e sei fuori,
   armi a lettere, granate, prigionieri da liberare. 1 o 2 giocatori sullo stesso PC.
   ============================================================ */
const GROUND = 648, GRAV = 2100, JUMP_V = 1040, RUN = 290, HERO_SC = 0.95;
let ARENA_X = 6700, LEVEL_LEN = ARENA_X + 1280;

/* ---------------- input ---------------- */
const KEYSETS = [
  { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], fire: ['KeyJ', 'KeyZ'], jump: ['KeyK', 'KeyX', 'Space'], bomb: ['KeyL', 'KeyC'], start: ['Enter'] },
  { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], fire: ['KeyF'], jump: ['KeyG'], bomb: ['KeyH'], start: ['KeyT'] },
];
const PADSET = { fire: [2, 3, 7], jump: [0], bomb: [1, 5], start: [9] };
const KEYS = new Set(), HITS = new Set();   // HITS: taps shorter than a frame are not lost
addEventListener('keydown', (e) => { if (window.WAITKEY) { const f = window.WAITKEY; window.WAITKEY = null; e.preventDefault(); f(e.code); return; } if (!e.repeat) HITS.add(e.code); KEYS.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); Audio.unlock(); });
addEventListener('keyup', (e) => KEYS.delete(e.code));
addEventListener('pointerdown', () => Audio.unlock());
function readDevice(dev) {
  if (window.BOT && window.BOT[dev]) return window.BOT[dev]();   // tests: a scripted player
  const o = { l: 0, r: 0, u: 0, d: 0, fire: 0, jump: 0, bomb: 0, start: 0 };
  if (dev.startsWith('kb')) {
    const K = KEYSETS[+dev.slice(2)];
    for (const k in o) o[k] = K[k].some((c) => KEYS.has(c)) ? 1 : 0;
  } else {
    const p = (navigator.getGamepads ? navigator.getGamepads() : [])[+dev.slice(3)];
    if (!p) return o;
    const b = (i) => (p.buttons[i] && p.buttons[i].pressed ? 1 : 0);
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    o.l = b(14) || ax < -0.45 ? 1 : 0; o.r = b(15) || ax > 0.45 ? 1 : 0; o.u = b(12) || ay < -0.5 ? 1 : 0; o.d = b(13) || ay > 0.5 ? 1 : 0;
    for (const k of ['fire', 'jump', 'bomb', 'start']) o[k] = PADSET[k].some((i) => b(i)) ? 1 : 0;
  }
  return o;
}
const DEVICES = ['kb0', 'kb1', 'pad0', 'pad1', 'pad2', 'pad3'];
const prevIn = {};
function inputOf(dev) {
  const c = readDevice(dev), p = prevIn[dev] || {};
  c.pressed = {}; for (const k of ['fire', 'jump', 'bomb', 'start', 'l', 'r', 'u', 'd']) c.pressed[k] = !!(c[k] && !p[k]);
  if (dev.startsWith('kb')) {
    const K = KEYSETS[+dev.slice(2)];
    for (const k in K) if (K[k].some((code) => HITS.has(code))) { c.pressed[k] = true; if (k !== 'l' && k !== 'r' && k !== 'u' && k !== 'd') c[k] = 1; K[k].forEach((code) => HITS.delete(code)); }
  }
  prevIn[dev] = { ...c };
  return c;
}

/* ---------------- weapons ---------------- */
const WEAPONS = {
  P: { name: 'PISTOLA', rate: 0.17, ammo: Infinity, auto: false, dmg: 1, spd: 1100 },
  H: { name: 'MITRAGLIATRICE', rate: 0.075, ammo: 200, auto: true, dmg: 1, spd: 1250 },
  S: { name: 'A ROSA', rate: 0.28, ammo: 40, auto: true, dmg: 1, spd: 1000 },
  F: { name: 'LANCIAFIAMME', rate: 0.09, ammo: 70, auto: true, dmg: 1.4, spd: 620 },
  R: { name: 'RAZZI', rate: 0.42, ammo: 24, auto: true, dmg: 6, spd: 700 },
};
const WCOL = { H: '#ffd35a', S: '#7bf0b1', F: '#ff7a3a', R: '#ff5b8a', P: '#e8eef4' };

/* ---------------- the level (js/livelli.js: one plan per city) ---------------- */
let PLATFORMS = [], WAVES = [], CRATES = [], PRISONERS = [], VEHICLE_X = 2900, DECO_X = [], LV = null;
const WTYPE = { f: 'fante', F: 'fante', b: 'bruto', d: 'drone', r: 'robo', u: 'uff' };
function loadLevel(mi) {
  LV = PIANTE[mi];
  ARENA_X = LV.arena; LEVEL_LEN = ARENA_X + W;
  // every boss arena has two platforms to dodge on (unless the level already has its own)
  if (!LV.plats.some((q) => q[0] + q[1] > LV.arena && q[0] < LV.arena + W)) LV.plats.push([LV.arena + 140, 250, 450], [LV.arena + W - 400, 250, 450]);
  PLATFORMS = LV.plats.map(([x, w, y, o]) => Object.assign([x, w, y], o || {}, { shake: 0, gone: false, goneT: 0 }));
  WAVES = LV.waves.map(([x, spec, lock]) => ({ x, lock: !!lock, spawn: [...spec].map((ch, i) => [WTYPE[ch], 60 + i * 110, ch === 'F' ? 400 : ch === 'd' ? rand(190, 280) : undefined]) }));
  CRATES = LV.crates; VEHICLE_X = LV.veh;
  PRISONERS = LV.pris.map(([x, w, p]) => { const P = p && PLATFORMS.find((q) => x > q[0] + 20 && x < q[0] + q[1] - 20); return [x, w, P ? P[2] : undefined]; });
  DECO_X = [];
  for (let x = 380; x < ARENA_X + W - 200; x += 1000 + (x % 3) * 90) if (!CRATES.some(([cx]) => Math.abs(cx - x) < 150) && !PRISONERS.some(([px]) => Math.abs(px - x) < 150) && !(LV.geysers || []).some((gx) => Math.abs(gx - x) < 150)) DECO_X.push(x);
}
/* Turin: the factory floor is one long conveyor belt that drags you back, with a few still stretches to rest */
function floorBelt(x) { return LV && LV.floorBelt && !S.boss && x > 500 && !LV.floorBelt.some(([a, b]) => x > a && x < b); }
function platAt(x, y) { return PLATFORMS.find((P) => !P.gone && x > P[0] && x < P[0] + P[1] && Math.abs(y - P[2]) < 3); }

/* ---------------- the heroes ----------------
   frame maps on the 4x4 sheets: i guardia · r corsa · j salto · s spara · u spara in alto
   c accovacciato · b bomba · h colpito · d a terra · w esulta */
const F_STD = { i: [0, 1], r: [2, 3, 4, 5, 6, 7], j: 8, s: 9, u: 10, c: 11, b: 12, h: 13, d: 14, w: 15 };
const ROSTER = [
  { id: 'remo', name: 'REMO', color: '#e8483a', desc: 'LUPO DI ROMA · TUTTOFARE', run: 1, jump: 1, dmg: 1, bombs: 10, F: F_STD },
  { id: 'nina', name: 'NINA', color: '#ff6fa0', desc: 'GATTA · VELOCE, SALTA PIU IN ALTO', run: 1.18, jump: 1.1, dmg: 0.9, bombs: 10, F: F_STD },
  { id: 'bruno', name: 'BRUNO', color: '#d8a060', desc: 'CINGHIALE · FORTISSIMO, 15 GRANATE', run: 0.88, jump: 0.97, dmg: 1.4, bombs: 15, F: { i: [0, 1], r: [2, 3, 4, 5, 6, 7], j: 4, s: 8, u: 9, c: 10, b: 11, h: 12, d: 14, w: 15 } },
  { id: 'alba', name: 'ALBA', color: '#8ad85a', desc: 'STAMBECCA · DOPPIO SALTO', run: 1.05, jump: 1, dmg: 1, bombs: 10, dbl: true, F: { i: [0, 1], r: [2, 3, 4, 5], j: 6, s: 7, u: 8, c: 9, b: 10, h: 11, d: 13, w: 15 } },
];

/* ---------------- the 8 missions ---------------- */
const MISSIONS = [
  { city: 'ROMA', place: 'LE ROVINE DEL FORO', bg: 'roma', tint: null, boss: 'glad', brief: [
    'Ragazzi, il cielo di Roma è pieno di dischi volanti di latta!',
    'Liberate i cittadini legati: vi lasceranno le armi che ho nascosto in giro.',
    'Nel Colosseo c\'è un gladiatore di ferro. Colpitelo quando vede le stelle!'] },
  { city: 'VENEZIA', place: 'I CANALI DI NOTTE', bg: 'venezia', tint: '#5070d0', boss: 'piov', brief: [
    'Hanno portato via le gondole... e pure i gondolieri!',
    'In laguna è spuntata una piovra di latta con una gondola incastrata in testa.',
    'Saltate le sue onde e state lontani dai goccioloni d\'olio.'] },
  { city: 'FIRENZE', place: 'IL PONTE VECCHIO', bg: 'firenze', tint: '#f0a860', boss: 'cupola', brief: [
    'Il Ponte Vecchio è pieno di soldati, e le botteghe sono chiuse.',
    'E sopra il Duomo vola una cupola che non è la nostra: è un disco volante travestito! Non restate sotto il suo raggio.',
    'Bruno, tu che sei di qui: fagli vedere come si carica un cinghiale!'] },
  { city: 'TORINO', place: 'LA FABBRICA', bg: 'torino', tint: '#8890a8', boss: 'catena', brief: [
    'La fabbrica lavora di notte: montano robot a molla, uno dopo l\'altro.',
    'Guardate questa vite... non è delle nostre. Ha la filettatura al contrario!',
    'La Catena di Montaggio lancia ingranaggi: sparateci sopra o schivateli.'] },
  { city: 'GENOVA', place: 'IL PORTO', bg: 'genova', tint: '#60a8d8', boss: 'sotto', brief: [
    'Al porto è emerso un sottomarino a razzo col periscopio a occhio.',
    'Siluri alti: abbassatevi. Siluri bassi: saltate. Semplice, no?',
    'Un soldato ha perso il casco sul molo... aveva le orecchie senza pelo!'] },
  { city: 'DOLOMITI', place: 'NEVE E FUNIVIE', bg: 'dolomiti', tint: '#c8e0ff', snow: true, boss: 'pupazzo', brief: [
    'Alba ci aspetta in cima: da qui si va solo a piedi.',
    'C\'è un pupazzo di neve grande come una baita, con dentro un robot.',
    'Le palle di neve rotolano: saltatele! Quando si ferma a riprendere fiato, colpite.'] },
  { city: 'LO STRETTO', place: 'LA FATA MORGANA', bg: 'stretto', tint: '#ffb0b8', boss: 'miraggio', brief: [
    'Sullo Stretto le città galleggiano capovolte nel cielo: è la Fata Morgana.',
    'La Nave Miraggio fa piovere cristalli: guardate le ombre per terra!',
    'E negli specchi... si vede un pianeta blu. Lontano lontano.'] },
  { city: 'ETNA', place: 'LA BASE NEL VULCANO', bg: 'etna', tint: '#e05028', boss: 'comand', brief: [
    'La base è dentro il vulcano. È l\'ultima, ragazzi.',
    'Il Comandante spara raggi alti e bassi: abbassatevi o saltate.',
    'Chiunque ci sia sotto quel casco a specchio... andiamo a scoprirlo.'] },
];

/* ---------------- the bosses ----------------
   sh/k: sheet and frame prefix · sc: scale · F: the poses (i fermo · w passo · a attacco · sp speciale · t stanco · d sconfitto)
   att: the attacks in turn, with the pose they use */
const CAPI = {
  glad: { name: 'IL GLADIATORE D\'ACCIAIO', tip: 'SALTA LO SCUDO · COLPISCI QUANDO VEDE LE STELLE', sh: 'arte', k: 'glad', sc: 1, hp: 320, ht: 300,
    F: { i: 0, w: [0, 1], a: 3, sp: 4, wind: 2, t: 5, d: 7, dd: 6 }, att: [['slam', 'a'], ['charge', 'a'], ['shield', 'sp']] },
  piov: { name: 'LA PIOVRA DI LATTA', tip: 'SALTA LE ONDE · STAI LONTANO DAI GOCCIOLONI', sh: 'capi', k: 'piov', sc: 1, hp: 340, ht: 300,
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 6, d: 7, dd: 5 }, att: [['slam', 'a'], ['spray', 'sp'], ['charge', 'a'], ['spray', 'sp']] },
  leggig: { name: 'IL CENTURIONE GIGANTE', tip: 'SALTA LE ONDE · SPARA AI SOLDATI CHE CHIAMA', sh: 'arte', k: 'leg', sc: 1.85, hp: 360, ht: 320, cw: 100,
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 7, d: 6, dd: 5 }, att: [['charge', 'a'], ['summon', 'sp'], ['slam', 'a']] },
  cupola: { name: 'LA CUPOLA VOLANTE', tip: 'SCAPPA DAL RAGGIO TRAENTE · QUANDO CADE, COLPISCI!', sh: 'capi', k: 'cupola', sc: 1, hp: 360, ht: 260, fly: true, cw: 110, proj: 'cball',
    F: { i: 0, w: [1, 2], a: 4, sp: 1, t: 6, d: 7, dd: 5 }, att: [['throw', 'a'], ['tractor', 'sp'], ['summon', 'sp'], ['throw', 'a'], ['tractor', 'sp']] },
  catena: { name: 'LA CATENA DI MONTAGGIO', tip: 'SPARA AGLI INGRANAGGI · SALTA LE ONDE', sh: 'capi', k: 'catena', sc: 1, hp: 380, ht: 300, proj: 'gear',
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 6, d: 7, dd: 5 }, att: [['throw', 'a'], ['summon', 'sp'], ['slam', 'a'], ['throw', 'a']] },
  sotto: { name: 'IL SOTTOMARINO SPAZIALE', tip: 'SILURO ALTO: GIU · SILURO BASSO: SALTA', sh: 'capi', k: 'sotto', sc: 1, hp: 400, ht: 280,
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 6, d: 7, dd: 5 }, att: [['torpedo', 'a'], ['charge', 'sp'], ['torpedo', 'a'], ['summon', 'sp']] },
  pupazzo: { name: 'IL PUPAZZO DI NEVE MECCANICO', tip: 'SALTA LE PALLE DI NEVE CHE ROTOLANO', sh: 'capi', k: 'pupazzo', sc: 1, hp: 420, ht: 310, proj: 'snow',
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 6, d: 7, dd: 5 }, att: [['roll', 'a'], ['throw', 'sp'], ['slam', 'a'], ['roll', 'a']] },
  miraggio: { name: 'LA NAVE MIRAGGIO', tip: 'GUARDA LE OMBRE: DA LI CADONO I CRISTALLI', sh: 'capi', k: 'miraggio', sc: 0.9, hp: 440, ht: 250, fly: true,
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 6, d: 7, dd: 5 }, att: [['rain', 'sp'], ['beam', 'a'], ['summon', 'sp'], ['rain', 'sp'], ['beam', 'a']] },
  comand: { name: 'IL COMANDANTE', tip: 'RAGGIO ALTO: GIU · RAGGIO BASSO: SALTA', sh: 'capi', k: 'comand', sc: 1.05, hp: 520, ht: 330,
    F: { i: 0, w: [1, 2], a: 3, sp: 4, t: 6, d: 6, dd: 5 }, att: [['beam', 'a'], ['rain', 'sp'], ['charge', 'a'], ['beam', 'a'], ['summon', 'sp'], ['slam', 'a']] },
};

/* ---------------- state ---------------- */
let S = null, mode = 'title', T = 0, sel = null, MI = 0, brief = null, rv = null;
const ids = { n: 1 }; const nid = () => ids.n++;
function newGame(players, mi = 0, keep = null) {
  MI = mi; loadLevel(mi);
  const M = MISSIONS[mi];
  S = {
    t: 0, cam: 0, lock: null, wave: 0, players: [], enemies: [], shots: [], foeShots: [], bombs: [], fx: [], pops: [],
    props: CRATES.map(([x, k]) => ({ id: nid(), x, y: GROUND, k, hp: k === 'barrel' ? 3 : 4 })),
    pris: PRISONERS.map(([x, w, y], i) => ({ id: nid(), x, y: y || GROUND, k: (i + mi) % 4, w, st: 'tied', t: 0 })),
    items: [], veh: { x: VEHICLE_X, y: GROUND, vy: 0, face: 1, hp: 10, rider: null, st: 'idle', t: 0, cd: 0, wreck: false, flash: 0 },
    boss: null, win: false, over: false, shake: 0, banner: { t: 3, a: `MISSIONE ${mi + 1}`, b: `${M.city} · ${M.place}` },
  };
  players.forEach((p, i) => {
    const q = newPlayer(p.dev, p.hero, i), k = keep && keep[i];
    if (k) { q.score = k.score; q.kills = k.kills; q.freed = k.freed; q.lives = k.out ? DK().lives : Math.max(1, k.lives); if (!k.out) { q.bombs = Math.max(k.bombs, 5); q.w = k.w; q.ammo = k.ammo; } }
    S.players.push(q);
  });
  Audio.playSong(0, MISSIONS[mi].bg);
}
function newPlayer(dev, hero, slot) {
  return { id: nid(), dev, hero, slot, x: 160 + slot * 90, y: GROUND - 300, vy: 0, face: 1, st: 'drop', t: 0, inv: 2, lives: DK().lives, hp: DK().hp, score: 0,
    w: 'P', ammo: Infinity, bombs: ROSTER[hero].bombs, cd: 0, aim: 'f', onGround: false, crouch: false, kills: 0, freed: 0, run: 0, knife: 0, dead: false, out: false };
}

/* ---------------- helpers ---------------- */
function groundUnder(x, y, vy, drop) {
  // returns the floor height the feet land on (one-way platforms)
  let best = GROUND;
  if (!drop) for (const P of PLATFORMS) { if (P.gone) continue; const [px, pw, py] = P; if (x > px && x < px + pw && y <= py + 2 && py < best) best = py; }
  return best;
}
function onPlatform(x, y) { return PLATFORMS.some((P) => !P.gone && x > P[0] && x < P[0] + P[1] && Math.abs(y - P[2]) < 3); }
function pop(x, y, s, c = '#ffffff', big = 0) { S.pops.push({ x, y, s, c, big, t: 0 }); }
function boom(x, y, r = 1) { S.fx.push({ k: 'boom', x, y, r, t: 0 }); S.shake = Math.max(S.shake, 8 * r); Audio.sfx('boom'); }
function spark(x, y, c = '#ffe08a', n = 6) { S.fx.push({ k: 'hit', x, y, t: 0 }); for (let i = 0; i < n; i++) S.fx.push({ k: 'sp', x, y, vx: rand(-260, 260), vy: rand(-320, 40), c, t: 0, life: rand(0.2, 0.45) }); }
function waterY() { return GROUND + 24 - (S.water ? S.water.h : 0) * 130; }
function inWater(p) { return LV && LV.hazard === 'acqua' && S.water && S.water.h > 0.3 && p.y > waterY() - 2; }
function alive() { return S.players.filter((p) => !p.out && !p.dead); }

/* ---------------- players ---------------- */
function stepPlayer(p, c, dt) {
  const R = ROSTER[p.hero];
  p.t += dt; p.cd -= dt; p.inv = Math.max(0, p.inv - dt); p.knife = Math.max(0, p.knife - dt);
  if (p.out) { if (c.pressed.start || c.pressed.fire) { p.out = false; p.lives = DK().lives; p.score = 0; p.w = 'P'; p.ammo = Infinity; p.bombs = R.bombs; respawn(p); } return; }
  p.land = Math.max(0, (p.land || 0) - dt); p.bombT = Math.max(0, (p.bombT || 0) - dt);
  if (p.dead) { p.vy += GRAV * dt; p.y = Math.min(GROUND, p.y + p.vy * dt); if (p.t > 1.6) { if (p.lives > 0) respawn(p); else { p.out = true; } } return; }
  if (p === S.veh.rider) { stepRider(p, c, dt); return; }
  // move
  const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0);
  p.crouch = !!c.d && p.onGround;
  if (dx) p.face = dx;
  const wet = inWater(p) && p.perk !== 'venezia', sp = RUN * R.run * (p.crouch ? 0.45 : 1) * (wet ? 0.55 : 1) * (p.perk === 'torino' ? 1.35 : 1) + (S.wind && p.onGround ? 0 : 0);
  if (p.perk === 'torino') p.vx = (p.vx || 0);
  if (LV.hazard === 'ghiaccio' && p.onGround && p.perk !== 'dolomiti') p.vx = (p.vx || 0) + (dx * sp - (p.vx || 0)) * Math.min(1, dt * 2.2);   // ice: you slide
  else p.vx = dx * sp;
  p.x += p.vx * dt;
  if (p.onGround) { const P = platAt(p.x, p.y); if (P && P.belt) p.x += P.belt * 120 * dt; else if (!P && floorBelt(p.x)) p.x -= (p.perk === 'torino' ? 70 : 125) * dt; }   // conveyor belts (Turin: the whole floor pulls you back)
  const lo = S.cam + 40, hi = (S.lock !== null ? S.lock + W : S.cam + W) - 40;
  p.x = clamp(p.x, lo, hi);
  p.run = dx && p.onGround ? p.run + dt * 9 * R.run : 0;
  // jump / drop through / Alba's double jump
  if (c.pressed.jump && p.onGround) {
    if (c.d && onPlatform(p.x, p.y)) { p.dropT = 0.25; p.onGround = false; p.y += 4; }
    else { p.vy = -JUMP_V * R.jump * (wet ? 0.85 : 1); p.onGround = false; p.dbl = false; Audio.sfx('jump'); }
  } else if (c.pressed.jump && R.dbl && !p.onGround && !p.dbl && !(p.dropT > 0)) {
    p.dbl = true; p.vy = -JUMP_V * 0.82; Audio.sfx('jump'); spark(p.x, p.y, '#e8f4ff', 6);
  }
  p.dropT = Math.max(0, (p.dropT || 0) - dt);
  p.vy += GRAV * dt; if (p.perk === 'firenze' && c.jump && p.vy > 160) p.vy = 160;   // the umbrella: glide
  p.y += p.vy * dt;
  const fl = groundUnder(p.x, p.y - p.vy * dt, p.vy, p.dropT > 0);
  if (p.vy >= 0 && p.y >= fl) { if (!p.onGround && p.vy > 400) p.land = 0.1; p.y = fl; p.vy = 0; p.onGround = true; p.dbl = false; } else if (p.y < fl) p.onGround = p.onGround && p.y >= fl - 1;
  if (p.onGround && p.vy === 0 && !onPlatform(p.x, p.y) && p.y < GROUND - 1) p.onGround = false;   // walked off a ledge
  // aim
  p.aim = c.u ? 'u' : c.d && !p.onGround ? 'd' : 'f';
  // fire
  const W0 = WEAPONS[p.w];
  if ((W0.auto ? c.fire : c.pressed.fire) && p.cd <= 0) fire(p);
  if (c.pressed.bomb && p.bombs > 0) throwBomb(p);
  // get on the Vespona: UP next to it, or simply jump onto it (like the tanks of the arcades)
  const V = S.veh;
  if (!V.rider && !V.wreck && Math.abs(p.x - V.x) < 95 && ((p.y > GROUND - 40 && c.pressed.u) || (p.vy > 0 && p.y > V.y - 175 && p.y < V.y - 40))) mount(p);
}
function respawn(p) {
  if (p.perk) pop(p.x, p.y - 150, 'BONUS PERSO', '#ff8a7a'); p.perk = null; p.shield = 0;
  p.hp = DK().hp; p.dead = false; p.st = 'drop'; p.t = 0; p.inv = 2.5; p.vy = 0; p.w = 'P'; p.ammo = Infinity; p.bombs = Math.max(p.bombs, 5);
  const others = alive().filter((q) => q !== p);
  p.x = others.length ? others[0].x - 40 : S.cam + 200; p.y = GROUND - 380;
}
function kill(p) {
  if (p.inv > 0 || p.dead || p.out) return;
  if (p === S.veh.rider) return;
  if ((p.hp ?? 1) > 1) { p.hp--; p.inv = 1.6; p.vy = -380; p.onGround = false; p.x -= p.face * 30; Audio.sfx('hurt'); spark(p.x, p.y - 80, '#ffffff', 10); pop(p.x, p.y - 170, 'AHIA!', '#ff8a7a'); return; }
  p.dead = true; p.t = 0; p.vy = -520; p.lives--; Audio.sfx('ko'); spark(p.x, p.y - 80, ROSTER[p.hero].color, 14);
  if (!S.players.some((q) => !q.dead && !q.out) && S.players.every((q) => q.lives <= 0)) S.overT = 3;
}
function muzzle(p) {
  const s = HERO_SC;
  if (p.aim === 'u') return [p.x + p.face * 30 * s, p.y - 165 * s];
  if (p.aim === 'd') return [p.x, p.y - 20];
  return [p.x + p.face * 78 * s, p.y - (p.crouch ? 70 : 92) * s];
}
function fire(p) {
  const W0 = WEAPONS[p.w], R = ROSTER[p.hero];
  // knife: an enemy right in front
  const near = S.enemies.find((e) => e.hp > 0 && !e.fly && Math.abs(e.x - p.x) < 70 && Math.abs(e.y - p.y) < 60 && (e.x - p.x) * p.face > -10);
  if (near && p.aim === 'f') { p.knife = 0.22; p.cd = 0.3; hurtEnemy(near, 3 * R.dmg, p); Audio.sfx('punch'); spark(near.x, near.y - 70, '#ffffff', 8); return; }
  p.cd = W0.rate;
  const [mx, my] = muzzle(p);
  const dir = p.aim === 'u' ? [0, -1] : p.aim === 'd' ? [0, 1] : [p.face, 0];
  const shot = (vx, vy, extra = {}) => S.shots.push({ id: nid(), x: mx, y: my, vx, vy, w: p.w, by: p, life: p.w === 'F' ? 0.38 : 1.6, dmg: W0.dmg * R.dmg, ...extra });
  if (p.w === 'S') for (const a of [-0.22, 0, 0.22]) { const ca = Math.cos(a), sa = Math.sin(a); shot((dir[0] * ca - dir[1] * sa) * W0.spd, (dir[0] * sa + dir[1] * ca) * W0.spd); }
  else if (p.w === 'H') shot(dir[0] * W0.spd + rand(-40, 40) * Math.abs(dir[1]), dir[1] * W0.spd + rand(-40, 40) * Math.abs(dir[0]));
  else shot(dir[0] * W0.spd, dir[1] * W0.spd);
  Audio.sfx(p.w === 'R' ? 'laser' : p.w === 'F' ? 'wind' : 'shot');
  if (p.ammo !== Infinity && --p.ammo <= 0) { p.w = 'P'; p.ammo = Infinity; pop(p.x, p.y - 170, 'PISTOLA', '#e8eef4'); }
}
function throwBomb(p) {
  p.bombs--; p.bombT = 0.25; p.cd = Math.max(p.cd, 0.15);
  S.bombs.push({ id: nid(), x: p.x + p.face * 20, y: p.y - 100 * HERO_SC, vx: p.face * 460 + (p.run ? p.face * 80 : 0), vy: -560, by: p, rot: 0, pow: ROSTER[p.hero].dmg });
  Audio.sfx('wind');
}

/* ---------------- the Vespona: the professor's scooter-tank ---------------- */
function mount(p) { const V = S.veh; V.rider = p; V.st = 'go'; V.t = 0; V.flash = 0.3; p.inv = 1; S.hintT = 5; pop(V.x, V.y - 230, `${(VK[V.kind] || VK.vespa).name}!`, '#ff5b4f', 1); Audio.sfx('siren'); }
function dismount(ejected) {
  const V = S.veh, p = V.rider; if (!p) return;
  V.rider = null; p.x = V.x; p.y = V.y - 120; p.vy = -700; p.onGround = false; p.inv = 1.5;
  if (ejected) { V.wreck = true; boom(V.x, V.y - 90, 2); pop(V.x, V.y - 230, 'VESPONA A PEZZI!', '#ffb0a0', 1); }
}
function stepRider(p, c, dt) {
  const V = S.veh;
  V.t += dt; V.cd -= dt; V.flash = Math.max(0, V.flash - dt);
  p.x = V.x; p.y = V.y;
  const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0);
  if (dx) V.face = dx;
  V.x = clamp(V.x + dx * 250 * dt, S.cam + 110, (S.lock !== null ? S.lock + W : S.cam + W) - 110);
  if (c.pressed.jump) { if (c.d) { dismount(false); return; } if (V.y >= GROUND) { V.vy = -760; Audio.sfx('jump'); } }
  V.vy += GRAV * dt; V.y = Math.min(GROUND, V.y + V.vy * dt); if (V.y >= GROUND) V.vy = 0;
  V.st = dx ? 'walk' : 'idle'; V.up = !!c.u;
  if (c.fire && V.cd <= 0) {
    V.cd = 0.3; V.shotT = 0.15;
    const up = !!c.u, dg = up && dx !== 0;   // UP: the cannon points up · UP + direction: diagonal
    const vx = up ? (dg ? V.face * 640 : 0) : V.face * 900, vy = up ? (dg ? -640 : -900) : 0;
    S.shots.push({ id: nid(), x: V.x + V.face * (up ? (dg ? 70 : 30) : 105), y: V.y - (up ? 160 : 105), vx, vy, w: 'L', by: p, life: 1.5, dmg: 4 });
    Audio.sfx('special');
  }
  if (c.pressed.bomb) {
    // the horn: a shockwave that hits everything close by
    if (!V.roarCd || V.roarCd <= 0) {
      V.roarCd = 5; S.fx.push({ k: 'ring', x: V.x, y: V.y - 80, t: 0 }); S.shake = 12; Audio.sfx('siren'); pop(V.x, V.y - 220, 'CLACSON!', '#ffd35a', 1);
      for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - V.x) < 420) hurtEnemy(e, 8, p);
      if (S.boss && Math.abs(S.boss.x - V.x) < 420) hurtBoss(6, p);
      for (const s of S.foeShots) if (s.shootable && Math.abs(s.x - V.x) < 420) s.life = 0;
    }
  }
  V.roarCd = (V.roarCd || 0) - dt;
  if (V.shotT > 0) V.shotT -= dt;
}
function hurtVehicle() { const V = S.veh; if (V.flash > 0) return; V.hp--; V.flash = 0.6; Audio.sfx('hurt'); spark(V.x, V.y - 120, '#ffb05a', 10); if (V.hp <= 0) dismount(true); }

/* ---------------- enemies ----------------
   fante: il soldato (inv) · robo: il robottino a molla · uff: l'ufficiale col megafono
   bruto: il legionario robot che carica · drone: il disco volante */
const EBOX = { fante: [36, 70, 75], robo: [28, 48, 50], uff: [36, 72, 78], bruto: [60, 88, 95] };
function spawnEnemy(type, x, y) {
  if (type === 'fante' && MI >= 1 && Math.random() < 0.35) type = 'robo';
  if (type === 'bruto' && MI >= 2 && Math.random() < 0.5) type = 'uff';
  const e = { id: nid(), type, x, y: y === undefined || y === 'g' ? GROUND : y, vy: 0, face: -1, hp: 1, t: 0, st: 'walk', cd: rand(0.6, 1.6) * (1 - MI * 0.04), flash: 0, walk: 0 };
  if (type !== 'drone' && y !== undefined && y !== 'g') {
    // "on a platform": the nearest slab ahead of the camera, otherwise the street
    const P = PLATFORMS.filter(([px, pw]) => px + pw > S.cam + W * 0.55 && px < S.cam + W + 500).sort((a, b) => Math.abs(a[2] - y) - Math.abs(b[2] - y))[0];
    if (P) { e.x = P[0] + P[1] * (0.3 + Math.random() * 0.4); e.y = P[2]; e.plat = P; } else e.y = GROUND;
  }
  if (type === 'robo') { e.hp = 1; }
  if (type === 'uff') { e.hp = 4; e.cd = 1.2; }
  if (type === 'bruto') { e.hp = 10; e.cd = 1.5; }
  if (LV && LV.hazard === 'miraggi' && type !== 'drone' && Math.random() < 0.3) { e.mirage = true; e.hp = 0.5; e.cd = 1e9; }
  if (type === 'drone') { e.hp = 3; e.fly = true; e.y = y || 220; e.base = e.y; e.over = Math.random() < 0.3; }
  S.enemies.push(e);
  return e;
}
function hurtEnemy(e, dmg, by) {
  if (e.hp <= 0) return;
  e.hp -= dmg; e.flash = 0.08;
  if (e.hp <= 0) {
    e.st = 'dead'; e.t = 0; e.vy = -300;
    if (e.mirage) { if (by && by.score !== undefined) by.score += 50; spark(e.x, e.y - 70, '#bff4ff', 12); pop(e.x, e.y - 130, 'ERA UN MIRAGGIO!', '#bff4ff'); Audio.sfx('boing'); return; }
    const pts = { bruto: 800, uff: 500, drone: 400, robo: 150 }[e.type] || 200;
    if (by && by.score !== undefined) { by.score += pts; by.kills++; }
    if (e.type === 'drone') boom(e.x, e.y - 20, 0.8); else if (e.type === 'robo') { spark(e.x, e.y - 50, '#c8d2dc', 12); } else spark(e.x, e.y - 80, '#ffcf8a', 10);
    if (e.type !== 'drone') S.fx.push({ k: 'smoke', x: e.x, y: e.y, t: 0 });
    Audio.sfx(e.type === 'fante' ? 'ko' : 'break');
    const chance = { bruto: 0.6, uff: 0.4 }[e.type] || 0.08;
    if (Math.random() < chance) S.items.push({ id: nid(), x: e.x, y: e.y, vy: -300, k: Math.random() < 0.5 ? 'bomb' : pick(['H', 'S', 'F', 'R']) });
  } else Audio.sfx('hit');
}
function nearestPlayer(e) {
  let best = null, bd = 1e9;
  for (const p of alive()) { const d = Math.abs(p.x - e.x) + Math.abs(p.y - e.y) * 0.5; if (d < bd) { bd = d; best = p; } }
  if (S.veh.rider && Math.abs(S.veh.x - e.x) < bd) best = { x: S.veh.x, y: S.veh.y, veh: true };
  return best;
}
function stepEnemy(e, dt) {
  e.t += dt; e.flash = Math.max(0, e.flash - dt);
  if (e.st === 'dead') { e.vy += GRAV * dt; e.y = Math.min(e.fly ? GROUND : e.y + e.vy * dt, GROUND); return; }
  const P = nearestPlayer(e); if (!P) return;
  const dx = P.x - e.x; e.face = Math.sign(dx) || e.face;
  e.cd -= dt * DK().foe;
  if (e.type === 'fante') {
    const want = Math.abs(dx) > 380 ? 1 : Math.abs(dx) < 160 ? -0.6 : 0;
    if (e.st === 'walk') {
      e.x += Math.sign(dx) * want * 120 * dt; e.walk += Math.abs(want) * dt * 8;
      if (e.cd <= 0 && Math.abs(dx) < 700) { e.st = 'wind'; e.t = 0; }
    } else if (e.st === 'wind' && e.t > 0.45) {
      e.st = 'atk'; e.t = 0;
      // a ray from the toy pistol: straight ahead (crouch under it) or up at a platform
      e.up = P.y < e.y - 80;
      const a = e.up ? Math.atan2(P.y - 90 - (e.y - 150), dx) : 0;
      const sp = 430;
      S.foeShots.push({ id: nid(), k: 'ray', x: e.x + e.face * 60, y: e.up ? e.y - 150 : e.y - 82, vx: e.up ? Math.cos(a) * sp : e.face * sp, vy: e.up ? Math.sin(a) * sp : 0, g: 0, life: 3 });
      Audio.sfx('laser');
    } else if (e.st === 'atk' && e.t > 0.4) { e.st = 'walk'; e.cd = rand(1.6, 2.8); }
  } else if (e.type === 'robo') {
    // the wind-up robot: runs at you and throws short sparks along the ground (jump them)
    if (e.st === 'walk') {
      const go = Math.abs(dx) > 150 ? 1 : 0;
      e.x += Math.sign(dx) * go * 150 * dt; e.walk += go * dt * 10;
      if (e.cd <= 0 && Math.abs(dx) < 330) { e.st = 'wind'; e.t = 0; }
    } else if (e.st === 'wind' && e.t > 0.3) {
      e.st = 'atk'; e.t = 0;
      S.foeShots.push({ id: nid(), k: 'spark', x: e.x + e.face * 40, y: e.y - 40, vx: e.face * 430, vy: 0, g: 0, life: 0.8, r: 8 });
      Audio.sfx('laser');
    } else if (e.st === 'atk' && e.t > 0.35) { e.st = 'walk'; e.cd = rand(1.2, 2); }
  } else if (e.type === 'uff') {
    // the officer: keeps his distance and shouts in the megaphone, high (crouch) or low (jump)
    const want = Math.abs(dx) > 560 ? 1 : Math.abs(dx) < 300 ? -0.7 : 0;
    if (e.st === 'walk') {
      e.x += Math.sign(dx) * want * 100 * dt; e.walk += Math.abs(want) * dt * 7;
      if (e.cd <= 0 && Math.abs(dx) < 820) { e.st = 'wind'; e.t = 0; }
    } else if (e.st === 'wind' && e.t > 0.55) {
      e.st = 'atk'; e.t = 0; e.n = (e.n || 0) + 1;
      const high = e.n % 2 === 0;
      S.foeShots.push({ id: nid(), k: 'shout', x: e.x + e.face * 60, y: e.y - (high ? 128 : 36), vx: e.face * 340, vy: 0, g: 0, life: 3.2, r: 22, dir: e.face, keep: true });
      Audio.sfx('siren');
    } else if (e.st === 'atk' && e.t > 0.5) { e.st = 'walk'; e.cd = rand(1.8, 2.8); }
  } else if (e.type === 'bruto') {
    if (e.st === 'walk') {
      e.x += Math.sign(dx) * 70 * dt; e.walk += dt * 5;
      if (e.cd <= 0 && Math.abs(dx) < 600) { e.st = 'wind'; e.t = 0; Audio.sfx('bosswind'); }
    } else if (e.st === 'wind' && e.t > 0.6) { e.st = 'charge'; e.t = 0; e.dir = Math.sign(dx) || -1; }
    else if (e.st === 'charge') {
      e.x += e.dir * 560 * dt;
      if (e.t > 0.9) { e.st = 'walk'; e.cd = rand(2, 3); }
    }
    if (!e.mirage) for (const p of alive()) if (Math.abs(p.x - e.x) < 70 && Math.abs(p.y - e.y) < 90) kill(p);
    if (S.veh.rider && Math.abs(S.veh.x - e.x) < 120) { hurtVehicle(); if (e.st === 'charge') { e.st = 'walk'; e.cd = 2; e.x -= e.dir * 60; } }
  } else if (e.type === 'drone') {
    e.ot = (e.ot === undefined ? rand(2, 4) : e.ot) - dt; if (e.ot <= 0) { e.over = !e.over; e.ot = e.over ? rand(2.5, 3.5) : rand(2, 4); }   // keeps its distance, then swoops overhead
    const off = e.over ? 0 : 200;
    e.x += clamp(dx - Math.sign(dx) * off, -150, 150) * dt; e.y = e.base + Math.sin(e.t * 2) * 30; e.walk += dt * 6;
    if (e.cd <= 0 && e.over && Math.abs(dx) < 110) {
      // right overhead: drops a little bomb
      e.cd = rand(1.2, 1.8); e.shotT = 0.3;
      S.foeShots.push({ id: nid(), k: 'dbomb', x: e.x, y: e.y + 30, vx: 0, vy: 60, g: 1100, life: 3, r: 12, shootable: true });
      Audio.sfx('wind');
    } else if (e.cd <= 0 && Math.abs(dx) < 650 && !(e.over && Math.abs(dx) < 300)) {
      e.cd = rand(1.5, 2.4); e.shotT = 0.2;
      const a = Math.atan2(P.y - 80 - e.y, dx);
      S.foeShots.push({ id: nid(), k: 'orb', x: e.x + Math.cos(a) * 40, y: e.y + Math.sin(a) * 40, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, g: 0, life: 4 });
      Audio.sfx('laser');
    }
    if (e.shotT > 0) e.shotT -= dt;
  }
  if (!e.fly) {
    if (e.plat) e.x = clamp(e.x, e.plat[0] + 20, e.plat[0] + e.plat[1] - 20);   // platform soldiers stay up there
    if (S.lock !== null) e.x = clamp(e.x, S.lock + 30, S.lock + W - 30); else e.x = clamp(e.x, S.cam - 200, S.cam + W + 300);
  }
}

/* ---------------- the bosses ---------------- */
function bossDef() { return CAPI[S.boss ? S.boss.id : MISSIONS[MI].boss]; }
function startBoss() {
  const n = S.players.length, id = MISSIONS[MI].boss, D = CAPI[id];
  S.boss = { id, x: ARENA_X + W - 220, y: D.fly ? 380 : GROUND, hp: Math.round((D.hp + n * 120) * DK().boss), max: Math.round((D.hp + n * 120) * DK().boss), face: -1, st: 'intro', t: 0, cd: 1.5, flash: 0, pat: 0, dead: false, did: 0, bn: 0 };
  S.banner = { t: 3, a: D.name, b: D.tip };
  Audio.playSong(0, 'boss');
}
function bossTired(B) { B.st = 'tired'; B.t = 0; B.did = 0; }
function lob(B, P, k, tx) {
  const D = bossDef(), x0 = B.x + B.face * 80, y0 = B.y - D.ht * 0.7, tt = rand(0.9, 1.2), gg = 1100;
  tx = tx !== undefined ? tx : P.x + rand(-60, 60);
  const ty = GROUND - 20;
  S.foeShots.push({ id: nid(), k, x: x0, y: y0, vx: (tx - x0) / tt, vy: (ty - y0 - 0.5 * gg * tt * tt) / tt, g: gg, life: 3, r: k === 'drop' ? 12 : 18, shootable: k !== 'drop', spin: 0 });
}
function stepBoss(dt) {
  const B = S.boss; if (!B) return;
  const D = CAPI[B.id];
  B.t += dt; B.flash = Math.max(0, B.flash - dt);
  if (D.fly && !B.dead) { const ty = B.st === 'tired' ? GROUND : 380 + Math.sin(S.t * 2) * 26; B.y += (ty - B.y) * Math.min(1, dt * (B.st === 'tired' ? 5 : 3)); }   // flying bosses fall down when tired
  if (B.dead) {
    if (D.fly) B.y = Math.min(GROUND, B.y + dt * 180);
    if (B.t > 3 && !S.win) { S.win = true; S.winT = 0; Audio.sfx('team'); }
    return;
  }
  const P = nearestPlayer(B); if (!P) return;
  const dx = P.x - B.x, face = () => { B.face = Math.sign(dx) || B.face; };
  const once = (at) => { if (B.t > at && !B['o' + at]) { B['o' + at] = true; return true; } return false; };
  const reset = () => { for (const k in B) if (k.startsWith('o')) delete B[k]; };
  switch (B.st) {
    case 'intro': if (B.t > 2) { B.st = 'walk'; B.t = 0; } break;
    case 'walk':
      face();
      if (D.fly) B.x += clamp(P.x - B.face * 280 - B.x, -160, 160) * dt;
      else B.x += B.face * 90 * dt;
      B.cd -= dt * DK().foe;
      if (B.cd <= 0) { const [a, pose] = D.att[B.pat++ % D.att.length]; B.st = a; B.pose = pose; B.t = 0; B.did = 0; reset(); Audio.sfx('bosswind'); }
      break;
    case 'slam':
      if (once(0.7)) { S.fx.push({ k: 'wave', x: B.x, y: GROUND, dir: -1, t: 0 }, { k: 'wave', x: B.x, y: GROUND, dir: 1, t: 0 }); S.shake = 16; Audio.sfx('boom'); }
      if (B.t > 1.4) bossTired(B);
      break;
    case 'charge':
      if (B.t < 0.6) { face(); break; }
      B.x += B.face * 620 * dt;
      if (B.t > 1.6 || B.x < ARENA_X + 80 || B.x > ARENA_X + W - 80) { B.x = clamp(B.x, ARENA_X + 80, ARENA_X + W - 80); bossTired(B); S.shake = 10; Audio.sfx('stomp'); }
      break;
    case 'shield':
      // throws the shield low along the ground: it comes back like a boomerang (jump it twice)
      face();
      if (once(0.5)) { S.foeShots.push({ id: nid(), k: 'shield', x: B.x + B.face * 60, y: GROUND - 48, vx: B.face * 700, vy: 0, g: 0, life: 3, back: B.face, spin: 0, r: 20, keep: true }); Audio.sfx('wind'); }
      if (B.t > 2.6) bossTired(B);
      break;
    case 'throw':
      // three lobbed gears / snowballs: they can be shot down
      face();
      for (const at of [0.5, 0.8, 1.1]) if (once(at)) { lob(B, P, D.proj || 'gear'); Audio.sfx('wind'); }
      if (B.t > 1.9) bossTired(B);
      break;
    case 'roll':
      // a huge snowball rolling along the street: jump it
      face();
      if (once(0.6)) { S.foeShots.push({ id: nid(), k: 'ball', x: B.x + B.face * 110, y: GROUND - 44, vx: B.face * 480, vy: 0, g: 0, life: 3.4, r: 40, keep: true, spin: 0 }); Audio.sfx('heavy'); }
      if (B.t > 2.2) bossTired(B);
      break;
    case 'torpedo':
      // torpedoes, high (crouch) and low (jump), one after the other
      face();
      [0.5, 1.1, 1.7].forEach((at, i) => { if (once(at)) { const hi = (i + B.pat) % 2 === 0; S.foeShots.push({ id: nid(), k: 'torp', x: B.x + B.face * 120, y: hi ? GROUND - 122 : GROUND - 40, vx: B.face * 470, vy: 0, g: 0, life: 4, r: 14, shootable: true, dir: B.face }); Audio.sfx('shot'); } });
      if (B.t > 2.4) bossTired(B);
      break;
    case 'spray':
      // oil blobs all over the arena
      face();
      for (const at of [0.5, 0.7, 0.9, 1.1, 1.3]) if (once(at)) lob(B, P, 'drop', at === 0.9 ? P.x : ARENA_X + rand(100, W - 100));
      if (B.t > 2) bossTired(B);
      break;
    case 'rain':
      // crystals from the sky: their shadows show where they land
      for (const at of [0.5, 1.4]) if (once(at)) {
        for (let i = 0; i < 4; i++) {
          const x = i === 0 ? P.x : ARENA_X + rand(80, W - 80);
          S.fx.push({ k: 'mark', x, t: 0 });
          S.foeShots.push({ id: nid(), k: 'crys', x, y: -160, vx: 0, vy: 860, g: 0, life: 3, r: 14 });
        }
        Audio.sfx('laser');
      }
      if (B.t > 2.8) bossTired(B);
      break;
    case 'beam':
      // a long ray, high or low: it flickers first, then it burns
      if (B.t < 0.2) face();
      if (once(0.3)) { const hi = B.bn++ % 2 === 0; S.foeShots.push({ id: nid(), k: 'beam', x: B.x + B.face * 90, y: hi ? GROUND - 130 : GROUND - 34, dir: B.face, len: 1400, t: 0, vx: 0, vy: 0, g: 0, life: 1.6 }); Audio.sfx('bosswind'); }
      if (B.t > 2.1) bossTired(B);
      break;
    case 'tractor':
      // a light beam from below the saucer that chases you along the street
      if (once(0.3)) { B.tr = { id: nid(), k: 'tract', x: B.x, y: B.y, t: 0, vx: 0, vy: 0, g: 0, life: 2.6 }; S.foeShots.push(B.tr); Audio.sfx('bosswind'); }
      if (B.tr && B.tr.life > 0) { B.tr.x += clamp(P.x - B.tr.x, -150, 150) * dt * 1.2; B.tr.y = B.y; B.x = B.tr.x; }
      if (B.t > 3) { B.tr = null; bossTired(B); }
      break;
    case 'summon':
      if (once(0.6)) {
        const n = S.enemies.filter((e) => e.hp > 0).length;
        for (let i = 0; i < 2 && n + i < 4; i++) {
          const x = ARENA_X + (i ? 60 : W - 60);
          if (D.fly) spawnEnemy('drone', x, rand(180, 260)); else { const e = spawnEnemy(MI >= 1 ? 'robo' : 'fante', x); e.x = x; }
        }
        Audio.sfx('siren');
      }
      if (B.t > 1.4) { B.st = 'walk'; B.t = 0; B.cd = 1; }
      break;
    case 'tired': if (B.t > 1.3) { B.st = 'walk'; B.t = 0; B.cd = rand(0.8, 1.6) * (B.hp < B.max / 2 ? 0.6 : 1); } break;
  }
  B.x = clamp(B.x, ARENA_X + 80, ARENA_X + W - 80);
  // contact
  const cw = D.cw || 90;
  // contact: the body, not the plume: a good jump clears it (or stand on the arena platforms)
  for (const p of alive()) if (Math.abs(p.x - B.x) < cw * 0.85 && p.y > B.y - D.ht * D.sc * 0.5 && p.y - 110 < B.y) kill(p);
  if (S.veh.rider && Math.abs(S.veh.x - B.x) < cw + 50 && !D.fly) hurtVehicle();
}
function hurtBoss(dmg, by) {
  const B = S.boss; if (!B || B.dead || B.st === 'intro') return;
  B.hp -= dmg * (B.st === 'tired' ? 1.6 : 1); B.flash = 0.04;
  if (by && by.score !== undefined) by.score += Math.round(dmg * 20);
  if (B.hp <= 0) {
    B.hp = 0; B.dead = true; B.t = 0; B.st = 'down';
    for (const e of S.enemies) if (e.hp > 0) hurtEnemy(e, 99, null);
    S.foeShots = [];
    for (let i = 0; i < 6; i++) setTimeout(() => S && S.boss === B && boom(B.x + rand(-80, 80), B.y - rand(40, 240), 1.2), i * 300);
    pop(B.x, B.y - 300, 'SCONFITTO!', '#ffd35a', 1);
  }
}
function bossBox() {
  const B = S.boss, D = CAPI[B.id];
  return { hw: (D.cw || 80), top: B.y - D.ht * D.sc, bot: B.y };
}

/* ---------------- projectiles, bombs, items ---------------- */
/* the city bonus: each one beats that city's trap */
function perkBlocks(p, s) {
  if (p.perk === 'roma' && (p.shield || 0) > 0 && s.k !== 'beam' && s.k !== 'tract') { p.shield--; pop(p.x, p.y - 170, p.shield ? 'SCUDO!' : 'SCUDO ROTTO!', '#ffd35a'); return true; }
  if (p.perk === 'firenze' && s.k === 'vaso') return true;
  if (p.perk === 'genova' && s.k === 'cassa') return true;
  if (p.perk === 'dolomiti' && s.k === 'ball') return true;
  if (p.perk === 'roma' && s.k === 'rocchio') return true;
  return false;
}
function hitsPlayer(s, p) {
  const top = p.y - (p.crouch ? 70 : 115);
  if (s.k === 'tract') return s.t > 0.6 && s.life > 0.1 && Math.abs(p.x - s.x) < 40;
  if (s.k === 'beam') { const d = (p.x - s.x) * s.dir; return s.t > 0.7 && s.life > 0.12 && d > -20 && d < s.len && s.y + 14 > top && s.y - 14 < p.y; }
  const r = s.r || 0;
  return Math.abs(s.x - p.x) < 22 + r && s.y + r > top && s.y - r < p.y;
}
function stepShots(dt) {
  for (const s of S.shots) {
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.w === 'F') { s.vx *= 0.94; s.vy *= 0.94; }
    if (s.y > GROUND + 10 || s.x < S.cam - 60 || s.x > S.cam + W + 60) s.life = 0;
    const r = s.w === 'F' ? 44 : s.w === 'L' ? 50 : s.w === 'R' ? 26 : 14;
    const hitAt = () => { if (s.w === 'R' || s.w === 'L') { boom(s.x, s.y, s.w === 'L' ? 1 : 0.7); for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - s.x) < 90 && Math.abs(e.y - 70 - s.y) < 110) hurtEnemy(e, s.dmg * 0.6, s.by); } };
    for (const e of S.enemies) {
      if (e.hp <= 0 || s.life <= 0) continue;
      const bx = EBOX[e.type] || EBOX.fante;
      const ey = e.fly ? e.y : e.y - bx[2], eh = e.fly ? 40 : bx[1], ew = e.fly ? 48 : bx[0];
      if (Math.abs(s.x - e.x) < ew + r && Math.abs(s.y - ey) < eh + r * 0.5) { hurtEnemy(e, s.dmg, s.by); spark(s.x, s.y, WCOL[s.w] || '#fff', 4); if (s.w !== 'F') { s.life = 0; hitAt(); } else s.dmg *= 0.6; }
    }
    const B = S.boss;
    if (B && !B.dead && s.life > 0) { const bb = bossBox(); if (Math.abs(s.x - B.x) < bb.hw + r && s.y > bb.top && s.y < bb.bot) { hurtBoss(s.dmg, s.by); spark(s.x, s.y, '#ffcf8a', 4); if (s.w !== 'F') { s.life = 0; hitAt(); } } }
    // shoot down gears, torpedoes, little bombs
    for (const f of S.foeShots) if (f.shootable && f.life > 0 && s.life > 0 && Math.abs(f.x - s.x) < (f.r || 10) + r && Math.abs(f.y - s.y) < (f.r || 10) + r) { f.life = 0; if (s.w !== 'F') s.life = 0; spark(f.x, f.y, '#ffe08a', 8); Audio.sfx('break'); if (s.by && s.by.score !== undefined) s.by.score += 50; }
    for (const o of S.props) if (o.hp > 0 && s.life > 0 && Math.abs(s.x - o.x) < 40 + r && s.y > o.y - (s.w === 'L' ? 170 : 90) && s.y < o.y) { hitProp(o, s.dmg, s.by); if (s.w !== 'F') s.life = 0; }
    for (const q of S.pris) if (q.st === 'tied' && s.life > 0 && Math.abs(s.x - q.x) < 40 && s.y > q.y - 110 && s.y < q.y) { freePris(q, s.by); s.life = 0; }
  }
  S.shots = S.shots.filter((s) => s.life > 0);
  for (const s of S.foeShots) {
    s.life -= dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.t !== undefined) s.t += dt;
    if (s.spin !== undefined) s.spin += dt * (s.k === 'ball' ? 8 : 14);
    if (s.k === 'shield') { s.vx -= s.back * 700 * dt; if (S.boss && s.life < 2.2 && Math.abs(s.x - S.boss.x) < 60) s.life = 0; }
    if (s.k !== 'shield' && s.k !== 'ball' && s.k !== 'beam' && s.k !== 'tract' && s.y > GROUND - (s.k === 'cassa' ? 34 : s.k === 'vaso' ? 16 : s.k === 'dbomb' || s.k === 'drop' ? 6 : 0)) {
      s.life = 0;
      if (s.k === 'dbomb') { boom(s.x, GROUND - 20, 0.6); for (const p of alive()) if (Math.abs(p.x - s.x) < 60 && p.y > GROUND - 60) kill(p); }
      else if (s.k === 'crys') spark(s.x, GROUND, '#bff4ff', 8);
      else if (s.k === 'cassa') { if (S.props.filter((o) => o.hp > 0).length < 14) S.props.push({ id: nid(), x: s.x, y: GROUND, k: 'crate', hp: 3 }); S.fx.push({ k: 'smoke', x: s.x, y: GROUND, t: 0 }); S.shake = Math.max(S.shake, 6); Audio.sfx('stomp'); }
      else if (s.k === 'vaso') { spark(s.x, GROUND - 10, '#d8804a', 10); Audio.sfx('break'); }
      else if (s.k === 'drop') { spark(s.x, GROUND, '#3a3040', 6); S.fx.push({ k: 'puddle', x: s.x, t: 0 }); }
      else if (s.k === 'snow' || s.k === 'gear') spark(s.x, GROUND, s.k === 'snow' ? '#ffffff' : '#c8d2dc', 8);
    }
    if (s.life <= 0) continue;
    for (const p of alive()) if (p !== S.veh.rider && s.life > 0 && hitsPlayer(s, p)) { if (perkBlocks(p, s)) { s.life = 0; spark(s.x, s.y, '#ffe08a', 8); Audio.sfx('boing'); continue; } kill(p); if (!s.keep && s.k !== 'beam' && s.k !== 'tract') s.life = 0; }
    if (S.veh.rider && s.life > 0) {
      const V = S.veh, vp = { x: V.x, y: V.y, crouch: false };
      if (s.k === 'beam' || s.k === 'tract' ? hitsPlayer(s, vp) : Math.abs(s.x - V.x) < 100 + (s.r || 0) && s.y > V.y - 170 && s.y < V.y) { hurtVehicle(); if (s.k !== 'beam' && s.k !== 'ball' && s.k !== 'tract') s.life = 0; }
    }
  }
  S.foeShots = S.foeShots.filter((s) => s.life > 0);
  for (const b of S.bombs) {
    b.vy += GRAV * 0.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 12;
    const fl = groundUnder(b.x, b.y - b.vy * dt, b.vy, false);
    const B = S.boss;
    const hitE = S.enemies.some((e) => e.hp > 0 && Math.abs(e.x - b.x) < 40 && Math.abs((e.fly ? e.y : e.y - 60) - b.y) < 60) || (B && !B.dead && Math.abs(B.x - b.x) < 80 && b.y > bossBox().top && b.y < B.y);
    if (b.y >= fl || hitE) {
      b.done = true; boom(b.x, b.y - 20, 1.1 * Math.sqrt(b.pow || 1));
      const pw = b.pow || 1;
      for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - b.x) < 110 * pw && Math.abs((e.fly ? e.y : e.y - 60) - b.y) < 130) hurtEnemy(e, 6 * pw, b.by);
      if (B && Math.abs(B.x - b.x) < 150 && b.y > bossBox().top - 60) hurtBoss(8 * pw, b.by);
      for (const o of S.props) if (o.hp > 0 && Math.abs(o.x - b.x) < 110) hitProp(o, 6, b.by);
      for (const q of S.pris) if (q.st === 'tied' && Math.abs(q.x - b.x) < 100) freePris(q, b.by);
    }
  }
  S.bombs = S.bombs.filter((b) => !b.done);
  for (const it of S.items) {
    it.vy += GRAV * dt; it.y = Math.min(groundUnder(it.x, it.y, it.vy, false), it.y + it.vy * dt); if (it.y >= groundUnder(it.x, it.y - 1, 0, false)) it.vy = 0;
    for (const p of alive()) if (!it.got && Math.abs(p.x - it.x) < 50 && Math.abs(p.y - it.y) < 80) {
      it.got = true; Audio.sfx('pickup');
      if (it.k === 'cibo') EX.eat(p, it);
      else if (it.k === 'perk') EX.takePerk(p, it);
      else if (it.k === 'bomb') { p.bombs += 5; pop(it.x, it.y - 90, 'GRANATE +5', '#ffd35a'); }
      else { p.w = it.k; p.ammo = WEAPONS[it.k].ammo; pop(it.x, it.y - 90, WEAPONS[it.k].name + '!', WCOL[it.k], 1); Audio.sfx('reload'); }
    }
  }
  S.items = S.items.filter((it) => !it.got);
}
function hitProp(o, dmg, by) {
  o.hp -= dmg; o.shake = 0.15; Audio.sfx('hit');
  if (o.hp <= 0) {
    if (o.k === 'barrel') { boom(o.x, o.y - 50, 1.4); for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - o.x) < 160) hurtEnemy(e, 8, by); for (const p of alive()) if (Math.abs(p.x - o.x) < 110) kill(p); }
    else { spark(o.x, o.y - 50, '#c8905a', 14); Audio.sfx('break'); S.items.push({ id: nid(), x: o.x, y: o.y - 40, vy: -380, k: Math.random() < 0.5 ? 'bomb' : pick(['H', 'S', 'F', 'R']) }); }
    if (by && by.score !== undefined) by.score += 100;
  }
}
function freePris(q, by) {
  q.st = 'free'; q.t = 0; Audio.sfx('confirm');
  if (by && by.score !== undefined) { by.score += 1000; by.freed++; }
  pop(q.x, q.y - 150, 'GRAZIE!', '#7bf0b1', 1);
  S.items.push({ id: nid(), x: q.x + 30, y: q.y - 60, vy: -360, k: q.w });
}

/* ---------------- the stage ---------------- */
function step(dt) {
  S.t += dt; S.shake = Math.max(0, S.shake - dt * 30); if (S.hintT > 0) S.hintT -= dt;
  if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
  for (const p of S.players) { const c = inputOf(p.dev); if (c.pressed.start && !p.out && !S.win) { mode = 'pausa'; menuS.pause = 0; Audio.sfx('select'); return; } stepPlayer(p, c, dt); }
  if (HITS.delete('Escape') || HITS.delete('KeyP')) { mode = 'pausa'; menuS.pause = 0; return; }
  // camera: follows the players, never goes back
  const xs = alive().map((p) => p.x);
  if (S.veh.rider) xs.push(S.veh.x);
  if (xs.length) {
    const lead = Math.max(...xs), tail = Math.min(...xs);
    let want = Math.min(lead - W * 0.45, tail - 60);
    want = clamp(want, S.cam, LEVEL_LEN - W);
    if (S.lock !== null) want = S.lock;
    S.cam += (want - S.cam) * Math.min(1, dt * 6);
  }
  // waves
  const Wv = WAVES[S.wave];
  if (Wv && S.cam >= Wv.x) {
    for (const [type, off, y] of Wv.spawn) spawnEnemy(type, S.cam + W + off, y);
    if (MI >= 4 && Wv.lock) spawnEnemy('drone', S.cam + W + 120, 230);   // later missions: one more saucer per arena
    if (Wv.lock) S.lock = S.cam;
    S.wave++;
  }
  if (S.lock !== null && !S.boss && S.enemies.every((e) => e.hp <= 0)) { S.lock = null; pop(S.cam + W - 160, 200, 'AVANTI! >>', '#ffd35a', 1); }
  if (!S.boss && S.cam >= ARENA_X - 4) { S.lock = ARENA_X; startBoss(); }
  for (const e of S.enemies) stepEnemy(e, dt);
  S.enemies = S.enemies.filter((e) => !(e.st === 'dead' && e.t > 1.2) && e.x > S.cam - 400);
  stepBoss(dt);
  stepHazard(dt);
  stepShots(dt);
  for (const q of S.pris) { q.t += dt; if (q.st === 'free') q.x += 170 * dt * (q.t > 0.8 ? 1 : 0); }
  for (const f of S.fx) { f.t += dt; if (f.k === 'sp') { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } if (f.k === 'wave') { f.x += f.dir * 520 * dt; for (const p of alive()) if (p.y >= GROUND - 2 && Math.abs(p.x - f.x) < 30) kill(p); } }
  S.fx = S.fx.filter((f) => f.t < ({ sp: f.life, wave: 1.6, ring: 0.6, mark: 0.95, puddle: 1.2, hit: 0.15, smoke: 0.7, ono: 0.75, casco: 2.2 }[f.k] || 0.6));
  for (const p of S.pops) p.t += dt;
  S.pops = S.pops.filter((p) => p.t < (p.big ? 1.4 : 0.8));
  for (const o of S.props) o.shake = Math.max(0, (o.shake || 0) - dt);
  if (S.win) { S.winT += dt; if (S.winT > 5.5) nextMission(); }
  if (S.overT !== undefined) { S.overT -= dt; if (S.overT <= 0 && S.players.every((p) => p.out)) { S.overT = undefined; finishRun('over'); } }
}
/* the city's own trouble: high water, falling pots, conveyor belts, cranes, ice, mirages, lava */
function stepHazard(dt) {
  const hz = LV.hazard;
  for (const P of PLATFORMS) if (P.fall) {   // Etna: walkways that crumble under your feet
    if (P.gone) { P.goneT += dt; if (P.goneT > 4.5) { P.gone = false; P.shake = 0; P.goneT = 0; } continue; }
    const on = alive().filter((p) => p.onGround && Math.abs(p.y - P[2]) < 3 && p.x > P[0] && p.x < P[0] + P[1]);
    if (on.length) { P.shake += dt; if (P.shake > 0.75) { P.gone = true; P.goneT = 0; Audio.sfx('break'); for (const p of on) p.onGround = false; } }
    else P.shake = Math.max(0, P.shake - dt * 0.5);
  }
  if (hz === 'acqua') {   // Venice: the water rises every so often; in the water you are slow
    const Wt = S.water || (S.water = { h: 0, t: 0 }); Wt.t += dt;
    const c = Wt.t % 17;
    if (c > 9 && c - dt <= 9) { pop(S.cam + W / 2, 200, 'ACQUA ALTA!', '#7ec8ff', 1); Audio.sfx('siren'); }
    Wt.h += ((c > 10.5 && c < 15 ? 1 : 0) - Wt.h) * Math.min(1, dt * 1.2);
    // deep water: hold your breath, then you swallow a mouthful (a heart). Get on a pier!
    for (const p of alive()) {
      const deep = Wt.h > 0.6 && p.y > waterY() + 40 && p.perk !== 'venezia' && p !== S.veh.rider;
      p.air = deep ? (p.air ?? 1.6) - dt : Math.min(1.6, (p.air ?? 1.6) + dt * 2);
      if (deep && Math.random() < dt * 6) S.fx.push({ k: 'sp', x: p.x + rand(-10, 10), y: p.y - 100, vx: 0, vy: -120, c: '#dff4ff', t: 0, life: 0.5 });
      if (p.air <= 0) { p.air = 1.6; const was = p.hp; kill(p); if (!p.dead) { p.vy = -900; p.onGround = false; } pop(p.x, p.y - 170, 'GLU GLU!', '#7ec8ff'); }
    }
  }
  if ((hz === 'vento' || LV.hazard2 === 'vento') && !S.boss && !S.win) {   // the Strait: gusts of wind push you back (watch the flags)
    S.wT = (S.wT ?? 7) - dt;
    if (S.wT <= 0 && !S.wind) { S.wind = 2.6; S.wT = rand(7, 10); pop(S.cam + W / 2, 200, 'VENTO DI SCIROCCO!', '#bff4ff', 1); Audio.sfx('wind'); }
    if (S.wind > 0) { S.wind -= dt; for (const p of alive()) if (p.perk !== 'stretto' && p !== S.veh.rider) p.x -= (p.onGround ? 150 : 210) * dt * (S.wind > 2.2 ? (2.6 - S.wind) / 0.4 : 1); for (let i = 0; i < 2; i++) S.fx.push({ k: 'sp', x: S.cam + W + 10, y: rand(100, 640), vx: -900, vy: 0, c: 'rgba(230,245,255,.8)', t: 0, life: 1.4 }); if (S.wind <= 0) S.wind = 0; }
  }
  if (S.win) return;
  if (hz === 'vasi' && !S.boss) {   // Florence: flower pots from the windows (watch the shadow)
    S.hzT = (S.hzT ?? 2.5) - dt;
    if (S.hzT <= 0) { S.hzT = rand(1.8, 3.2); const P = pick(alive()); if (P) { const x = P.x + rand(-140, 140); S.fx.push({ k: 'mark', x, t: 0 }); S.foeShots.push({ id: nid(), k: 'vaso', x, y: -120, vx: 0, vy: 820, g: 0, life: 3, r: 16, shootable: true }); } }
  }
  if (hz === 'gru') {   // Genoa: the cranes drop crates (they stay there: break them for goodies)
    S.hzT = (S.hzT ?? 3) - dt;
    if (S.hzT <= 0) { S.hzT = rand(3.5, 5.5); const P = pick(alive()); if (P) { const x = clamp(P.x + rand(-160, 160), S.cam + 80, S.cam + W - 80); S.fx.push({ k: 'mark', x, t: 0 }); S.foeShots.push({ id: nid(), k: 'cassa', x, y: -160, vx: 0, vy: 700, g: 0, life: 3, r: 34, keep: true }); Audio.sfx('wind'); } }
  }
  if (hz === 'colonne' && !S.boss) {   // Rome: pieces of old columns fall off the ruins (watch the shadow)
    S.hzT = (S.hzT ?? 4) - dt;
    if (S.hzT <= 0) { S.hzT = rand(3.5, 5.5); const P = pick(alive()); if (P) { const x = P.x + rand(-120, 160); S.fx.push({ k: 'mark', x, t: 0 }); S.foeShots.push({ id: nid(), k: 'rocchio', x, y: -140, vx: 0, vy: 760, g: 0, life: 3, r: 26, shootable: true, spin: 0 }); } }
  }
  if (hz === 'ghiaccio' && !S.boss) {   // the Dolomites: snowballs rolling down the slope (jump them)
    S.hzT = (S.hzT ?? 6) - dt;
    if (S.hzT <= 0 && S.lock === null) { S.hzT = rand(6, 9); S.foeShots.push({ id: nid(), k: 'ball', x: S.cam + W + 60, y: GROUND - 44, vx: -360, vy: 0, g: 0, life: 6, r: 40, keep: true, spin: 0 }); pop(S.cam + W - 200, 220, 'VALANGA!', '#ffffff', 1); Audio.sfx('heavy'); }
  }
  if (hz === 'lava') {   // Etna: lava jets from the floor, they bubble before they blow
    (LV.geysers || []).forEach((gx, i) => {
      if (gx < S.cam - 100 || gx > S.cam + W + 100) return;
      const c = (S.t + i * 1.3) % 4.5;
      if (c > 3.5) for (const p of alive()) if (Math.abs(p.x - gx) < 38 && p.y > GROUND - 330 && p.perk !== 'etna') kill(p);
      if (c > 3.5 && c - dt <= 3.5) { Audio.sfx('boom'); S.shake = Math.max(S.shake, 5); }
    });
  }
}
function drawHazardBack() {   // behind the characters: lava vents
  if (LV.hazard !== 'lava') return;
  (LV.geysers || []).forEach((gx, i) => {
    if (gx < S.cam - 200 || gx > S.cam + W + 200) return;
    const c = (S.t + i * 1.3) % 4.5;
    g.fillStyle = '#1a0a08'; g.beginPath(); g.ellipse(gx, GROUND + 2, 44, 10, 0, 0, 7); g.fill();
    g.fillStyle = `rgba(255,${c > 2.8 ? 120 : 70},30,${c > 2.8 ? 0.9 : 0.5})`; g.beginPath(); g.ellipse(gx, GROUND + 1, 30, 6, 0, 0, 7); g.fill();
    if (c > 2.8 && c <= 3.5) { fxs('he_3', gx + rand(-4, 4), GROUND - 22, 44 + Math.sin(T * 40) * 8, { rot: -Math.PI / 2 }); fxs('ef_4', gx, GROUND, 70, { alpha: 0.6 }); }
    if (c > 3.5) for (let k = 0; k < 4; k++) if (!fxs('he_3', gx + rand(-3, 3), GROUND - 50 - k * 72, 120 + Math.sin(T * 30 + k) * 10, { rot: -Math.PI / 2 })) { g.fillStyle = '#ff7a2a'; g.fillRect(gx - 30, GROUND - 330, 60, 330); break; }
  });
}
function drawHazardFront() {   // in front: the high water
  if (LV.hazard !== 'acqua' || !S.water || S.water.h < 0.02) return;
  const y = waterY();
  g.save(); g.globalAlpha = 0.5 * Math.min(1, S.water.h * 3); g.fillStyle = '#2d5fa8'; g.fillRect(S.cam, y, W, H - y);
  g.globalAlpha = 0.85 * Math.min(1, S.water.h * 3); g.strokeStyle = '#bfe4ff'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= W; x += 20) g.lineTo(S.cam + x, y + Math.sin((x + S.t * 80) / 40) * 4);
  g.stroke(); g.restore();
}
function drawFloorBelt() {
  if (S.boss) return;
  const y = GROUND - 6, off = ((S.t * 125) % 36);
  g.save();
  for (let x = Math.max(500, S.cam - 40); x < S.cam + W + 40; x += 36) {
    if (!floorBelt(x)) continue;
    g.fillStyle = 'rgba(30,28,34,.85)'; g.fillRect(x, y, 36, 18); g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x, y + 17, 36, 3);
    g.fillStyle = '#ffd35a'; const cx = x + 36 - off; g.beginPath(); g.moveTo(cx, y + 3); g.lineTo(cx - 9, y + 8); g.lineTo(cx, y + 13); g.fill();
  }
  for (const [a, b] of LV.floorBelt) if (b > S.cam && a < S.cam + W) { g.fillStyle = 'rgba(120,120,130,.5)'; g.fillRect(a, y, b - a, 16); }
  g.restore();
}
function drawBelt(x, pw, py, dir) {   // Turin: the conveyor strip on top of the walkway
  g.save(); g.beginPath(); g.rect(x + 10, py - 3, pw - 20, 10); g.clip();
  g.fillStyle = '#2a2a30'; g.fillRect(x + 10, py - 3, pw - 20, 10);
  const off = ((S.t * 120 * dir) % 24 + 24) % 24;
  g.fillStyle = '#ffd35a'; for (let k = -24; k < pw; k += 24) { const cx = x + k + off; g.beginPath(); g.moveTo(cx, py - 2); g.lineTo(cx + 8 * dir, py + 2); g.lineTo(cx, py + 6); g.fill(); }
  g.restore();
}
function nextMission() {
  SAVE.max = Math.max(SAVE.max, Math.min(7, MI + 1)); saveGame();
  if (MI < MISSIONS.length - 1) startBrief(MI + 1);
  else { mode = 'reveal'; rv = { i: 0, t: 0 }; Audio.playSong(0, 'finale'); }
}

/* ---------------- drawing ---------------- */
function tintCity(M) {
  g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = M.tint; g.fillRect(0, 0, W, H);
  if (M.snow) { g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(120,130,150,.5)'; g.fillRect(0, 0, W, H); }
  g.restore();
}
/* where the painted street starts in each background (y on the 720 px image) */
const FLOOR_Y = { roma: 526, venezia: 527, firenze: 526, torino: 528, genova: 535, dolomiti: 545, stretto: 539, etna: 525 };
function tileLayer(img, sy, sh, px) {
  const s = H / img.height, w = img.width * s, i0 = Math.floor(px / w);
  for (let i = i0; i * w - px < W; i++) {
    const x = i * w - px;
    if (i % 2) { g.save(); g.translate(x + w, 0); g.scale(-1, 1); g.drawImage(img, 0, sy, img.width, sh, 0, sy * s, w, sh * s); g.restore(); }
    else g.drawImage(img, 0, sy, img.width, sh, x, sy * s, w, sh * s);
  }
}
function drawBack() {
  const M = MISSIONS[MI], own = IMG[M.bg], img = own || IMG.roma;
  if (img) {
    // two layers: the far city scrolls slowly (parallax), the painted street moves WITH the camera,
    // so feet and platforms never slide on it. Copies side by side, every other one mirrored.
    const cut = FLOOR_Y[own ? M.bg : 'roma'] || 526;
    tileLayer(img, 0, cut, S.cam * 0.35);
    tileLayer(img, cut, img.height - cut, S.cam);
  }
  if (!own && M.tint) tintCity(M);   // no painting yet for this city: Rome, recoloured
  g.fillStyle = 'rgba(8,6,14,.18)'; g.fillRect(0, 0, W, H);
  // the street of the background is the ground: just a shade where the feet go
  const gr = g.createLinearGradient(0, GROUND - 30, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, GROUND - 30, W, H - GROUND + 30);
  for (const P of PLATFORMS) {
    const [px, pw, py] = P; let x = px - S.cam, dy = 0, a = 1;
    if (x > W || x + pw < 0) continue;
    if (P.gone) { if (P.goneT < 1) dy = P.goneT * P.goneT * 700; else if (P.goneT > 3.8) a = (P.goneT - 3.8) / 0.7; else continue; if (P.goneT < 1) a = 1 - P.goneT; }
    else if (P.shake > 0) x += rand(-3, 3) * Math.min(1, P.shake * 2);
    g.save(); g.globalAlpha = a; drawPlatform(x, pw, py + dy, PSTYLE[M.bg] || 'marmo', own ? M.bg : 'roma'); g.restore();
    if (P.belt && !P.gone) drawBelt(x, pw, py, P.belt);
  }
}
/* the platforms change with the city: marble, wooden pier, iron girder, snowy planks */
const PSTYLE = { roma: 'marmo', firenze: 'marmo', stretto: 'marmo', venezia: 'legno', genova: 'legno', torino: 'ferro', etna: 'ferro', dolomiti: 'neve' };
/* the painted platforms (tools/build_piatt.py): two poles down to the street, then the slab,
   whose ends keep their shape while the middle stretches to the width of the platform */
const SLAB_SY = 0.85, POLE_S = 0.8;
function drawPiatt(city, x, pw, py, noPole) {
  const A = window.ATLAS.piatt, img = IMG.piatt, slab = A[`${city}_${pw < 300 && A[`${city}_corta`] ? 'corta' : 'lunga'}`], pole = A[`${city}_palo`];
  if (pole && !noPole && GROUND - py > 4) {
    const [sx, sy, sw, sh] = pole, w = sw * POLE_S, need = GROUND - py;
    const pl = slab[6] ?? 0.08, pr = slab[7] ?? 0.92;   // under the slab's own end posts
    for (const cx of [x + Math.max(pl * slab[2] * SLAB_SY, w / 2), x + pw - Math.max((1 - pr) * slab[2] * SLAB_SY, w / 2)]) {
      // the foot of the pole stands on the street; if the pole is too short it is stretched, if too long its top is hidden
      const nat = sh * POLE_S;
      if (nat >= need) { const cut = need / POLE_S; g.drawImage(img, sx, sy + sh - cut, sw, cut, cx - w / 2, py, w, need); }
      else g.drawImage(img, sx, sy, sw, sh, cx - w / 2, py, w, need);
    }
  }
  const [sx, sy, sw, sh, , ay] = slab, cap = Math.round(sw * 0.16), y = py - ay * SLAB_SY, h = sh * SLAB_SY, cw = cap * SLAB_SY;
  g.drawImage(img, sx, sy, cap, sh, x, y, cw, h);
  g.drawImage(img, sx + cap, sy, sw - 2 * cap, sh, x + cw, y, pw - 2 * cw, h);
  g.drawImage(img, sx + sw - cap, sy, cap, sh, x + pw - cw, y, cw, h);
}
function drawPlatform(x, pw, py, st, city) {
  if (IMG.piatt && window.ATLAS.piatt && window.ATLAS.piatt[`${city}_lunga`]) { drawPiatt(city, x, pw, py); return; }
  const legs = [x + 20, x + pw - 50], lh = GROUND - py - 20;
  g.lineWidth = 4; g.strokeStyle = '#2a1a10';
  if (st === 'marmo') {
    for (const cx of legs) {
      const cg = g.createLinearGradient(cx, 0, cx + 30, 0); cg.addColorStop(0, '#6a5a4a'); cg.addColorStop(0.35, '#d8c4a0'); cg.addColorStop(1, '#4a3e34');
      g.fillStyle = cg; g.fillRect(cx, py + 20, 30, lh);
      g.fillStyle = 'rgba(0,0,0,.22)'; for (let k = 6; k < 30; k += 8) g.fillRect(cx + k, py + 20, 2, lh);
      g.fillStyle = '#b8a07e'; g.fillRect(cx - 6, py + 16, 42, 8); g.fillRect(cx - 6, GROUND - 10, 42, 10);
    }
    const sg = g.createLinearGradient(0, py, 0, py + 22); sg.addColorStop(0, '#f2e2c0'); sg.addColorStop(1, '#c8a878');
    g.fillStyle = sg; g.fillRect(x, py, pw, 22); g.strokeRect(x, py, pw, 22);
    g.fillStyle = 'rgba(40,24,16,.5)'; for (let k = 30; k < pw; k += 70) g.fillRect(x + k, py + 4, 2, 16);
  } else if (st === 'ferro') {
    // riveted steel girders with cross bracing and a hazard stripe
    for (const cx of legs) {
      g.fillStyle = '#4a4e58'; g.fillRect(cx, py + 20, 30, lh); g.strokeRect(cx, py + 20, 30, lh);
      g.fillStyle = '#6a707c'; g.fillRect(cx + 10, py + 20, 10, lh);
    }
    g.save(); g.beginPath(); g.rect(legs[0] + 30, py + 20, legs[1] - legs[0] - 30, lh); g.clip();
    g.strokeStyle = '#3a3e48'; g.lineWidth = 6;
    for (let yy = py + 20; yy < GROUND; yy += 90) { g.beginPath(); g.moveTo(legs[0] + 30, yy); g.lineTo(legs[1], yy + 90); g.moveTo(legs[1], yy); g.lineTo(legs[0] + 30, yy + 90); g.stroke(); }
    g.restore(); g.lineWidth = 4; g.strokeStyle = '#2a1a10';
    g.fillStyle = '#5a606c'; g.fillRect(x, py, pw, 22); g.strokeRect(x, py, pw, 22);
    g.save(); g.beginPath(); g.rect(x + 2, py + 14, pw - 4, 7); g.clip();
    for (let k = -10; k < pw; k += 24) { g.fillStyle = '#e8c030'; g.beginPath(); g.moveTo(x + k, py + 21); g.lineTo(x + k + 12, py + 14); g.lineTo(x + k + 24, py + 14); g.lineTo(x + k + 12, py + 21); g.fill(); }
    g.restore();
    g.fillStyle = '#c8ccd4'; for (let k = 12; k < pw; k += 28) { g.beginPath(); g.arc(x + k, py + 7, 2.5, 0, 7); g.fill(); }
  } else {
    // wooden pier on piles (Venice, Genoa) or snowy planks (Dolomites)
    for (const cx of legs) {
      g.fillStyle = '#6a4424'; g.fillRect(cx + 4, py + 20, 22, lh); g.strokeRect(cx + 4, py + 20, 22, lh);
      g.fillStyle = 'rgba(255,220,160,.18)'; g.fillRect(cx + 8, py + 20, 5, lh);
      if (st === 'legno') { g.strokeStyle = '#c8a060'; g.lineWidth = 5; for (const yy of [py + 50, GROUND - 60]) { g.beginPath(); g.moveTo(cx + 2, yy); g.lineTo(cx + 28, yy + 8); g.stroke(); } g.lineWidth = 4; g.strokeStyle = '#2a1a10'; }
    }
    const wg = g.createLinearGradient(0, py, 0, py + 22); wg.addColorStop(0, '#b07840'); wg.addColorStop(1, '#7a4a24');
    g.fillStyle = wg; g.fillRect(x, py, pw, 22); g.strokeRect(x, py, pw, 22);
    g.fillStyle = 'rgba(40,20,8,.55)'; for (let k = 40; k < pw; k += 40) g.fillRect(x + k, py + 2, 3, 18);
    g.fillStyle = 'rgba(40,20,8,.35)'; g.fillRect(x + 2, py + 10, pw - 4, 2);
    if (st === 'neve') {
      g.fillStyle = '#f4f8ff'; g.beginPath(); g.moveTo(x - 4, py + 4);
      for (let k = 0; k <= pw + 8; k += 26) g.quadraticCurveTo(x - 4 + k + 13, py - 14 - ((k / 26) % 2) * 4, x - 4 + k + 26, py + 2);
      g.lineTo(x + pw + 4, py + 6); g.lineTo(x - 4, py + 6); g.closePath(); g.fill(); g.lineWidth = 3; g.stroke();
      g.fillStyle = '#d8ecff'; for (let k = 18; k < pw - 10; k += 46) { g.beginPath(); g.moveTo(x + k, py + 22); g.lineTo(x + k + 10, py + 22); g.lineTo(x + k + 5, py + 36 + (k % 3) * 5); g.fill(); }
    }
  }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 6, py + 22, pw - 12, 6);
}
/* rubber hose: squash when landing, stretch when jumping, a breathing bounce when still */
function heroFrame(p) {
  const R = ROSTER[p.hero], F = R.F;
  let f = F.i[Math.floor(T * 2.5) % 2], sy = 1, sx = 1;
  const shooting = p.cd > WEAPONS[p.w].rate - 0.1;
  if (p.dead) f = p.t < 0.4 ? F.h : F.d;
  else if (p.bombT > 0) f = F.b;
  else if (!p.onGround) { f = shooting ? (p.aim === 'u' ? F.u : F.s) : F.j; sy = p.vy < 0 ? 1.08 : 0.97; sx = 2 - sy; if (p.dbl && p.vy < 0) sx *= 1 + Math.sin(p.t * 30) * 0.04; }
  else if (p.knife > 0) f = F.s;
  else if (p.crouch) { f = F.c; sy = 0.8; sx = 1.08; }
  else if (shooting) f = p.aim === 'u' ? F.u : F.s;
  else if (p.run) f = F.r[Math.floor(p.run * 0.9) % F.r.length];
  else sy = 1 + Math.sin(T * 5) * 0.02;
  if (p.land > 0 && !p.dead) { sy *= 0.84; sx *= 1.12; }
  if (S && S.win && !p.dead) f = F.w;
  return [`${R.id}_${f}`, sy, sx];
}
/* 1930s film: grain, flicker and vignette over everything */
const GRAIN = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const d = x.createImageData(256, 256); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } x.putImageData(d, 0, 0); return c; })();
function drawFilm() {
  g.save();
  const ox = Math.floor(Math.random() * 256), oy = Math.floor(Math.random() * 256);
  g.fillStyle = g.createPattern(GRAIN, 'repeat'); g.translate(-ox, -oy); g.fillRect(ox, oy, W, H); g.setTransform(1, 0, 0, 1, 0, 0);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(40,20,10,0)'); v.addColorStop(1, 'rgba(40,20,10,.45)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  if (Math.random() < 0.04) { g.fillStyle = 'rgba(255,240,210,.05)'; g.fillRect(0, 0, W, H); }
  if (Math.random() < 0.3) { g.fillStyle = 'rgba(30,20,10,.25)'; g.fillRect(Math.random() * W, 0, 1.5, H); }   // scratches on the film
  g.restore();
}
/* ---------------- the painted objects, shots, effects and HUD (tools/build_fx.py, atlas 'fx') ---------------- */
const FXF = (k) => IMG.fx && window.ATLAS.fx && window.ATLAS.fx[k];
function fxs(k, x, y, w, opt = {}) { const f = FXF(k); if (!f) return false; spr('fx', k, x, y, { ...opt, scale: w / f[2] }); return true; }
function fxBox(k, x, y, w, h, alpha = 1) { const f = FXF(k); if (!f) return false; g.save(); g.globalAlpha *= alpha; g.drawImage(IMG.fx, f[0], f[1], f[2], f[3], x, y, w, h); g.restore(); return true; }
/* a shot drawn along its flight: nat = where the drawing points (1 right, -1 left) */
function fxShot(k, s, w, nat = -1, opt = {}) {
  const vx = s.vx || 0, vy = s.vy || 0;
  if (Math.abs(vy) > Math.abs(vx) * 1.2) { const a = Math.atan2(vy, vx); return fxs(k, s.x, s.y, w, { ...opt, rot: nat > 0 ? a : a - Math.PI }); }
  return fxs(k, s.x, s.y, w, { ...opt, face: (vx >= 0 ? 1 : -1) * nat });
}
const ESPR = { ray: ['en_0', 58], orb: ['en_1', 58], spark: ['en_2', 50], shout: ['en_3', 52, 1], dbomb: ['en_4', 38, 0], gear: ['en_6', 50, 1], snow: ['en_7', 46], ball: ['en_8', 124, -1], torp: ['en_9', 92], drop: ['en_10', 42], crys: ['en_11', 56], cball: ['en_12', 42, 1], spear: ['en_0', 58] };
function drawFoeShotFx(s) {
  if (s.k === 'rocchio') { const f = window.ATLAS.piatt && window.ATLAS.piatt.roma_deco; if (f && IMG.piatt) { spr('piatt', 'roma_deco', s.x, s.y + 30, { scale: 70 / f[2], rot: s.spin * 0.3 }); return true; } return false; }
  if (s.k === 'vaso') { const f = window.ATLAS.piatt && window.ATLAS.piatt.firenze_deco; if (f && IMG.piatt) { spr('piatt', 'firenze_deco', s.x, s.y + 24, { scale: 64 / f[2], rot: Math.sin(S.t * 8) * 0.3 }); return true; } return false; }
  if (s.k === 'cassa') { g.strokeStyle = '#3a2410'; g.lineWidth = 3; g.beginPath(); g.moveTo(s.x, s.y - 500); g.lineTo(s.x, s.y - 30); g.stroke(); return fxs('obj_6', s.x, s.y + 34, 92); }
  if (s.k === 'shield') return fxs('en_5', s.x, s.y, 100, { sx: Math.cos(s.spin) * 0.5 + 0.6, rot: s.spin * 0.2 });
  if (s.k === 'beam') {
    if (s.t < 0.7) return false;   // the flickering warning line stays
    const k = Math.min(1, (s.t - 0.7) * 8) * Math.min(1, s.life * 6), x0 = Math.min(s.x, s.x + s.dir * s.len);
    return fxBox('ef_6', x0, s.y - 32 * k, s.len, 64 * k);
  }
  if (s.k === 'tract') {
    const on = s.t > 0.6, a = on ? Math.min(1, s.life * 4) : 0.35 + Math.sin(T * 30) * 0.15, top = s.y - 20;
    return fxBox('ef_7', s.x - 75, top, 150, GROUND - top + 10, a);
  }
  const m = ESPR[s.k]; if (!m) return false;
  if (m[2] === 0) return fxs(m[0], s.x, s.y, m[1]);
  return fxShot(m[0], s, m[1], m[2] || -1);
}
function drawFoeShot(s) {
  if (IMG.fx && drawFoeShotFx(s)) return;
  g.lineWidth = 3; g.strokeStyle = '#1a1010';
  switch (s.k) {
    case 'shield': { g.save(); g.translate(s.x, s.y); g.scale(Math.cos(s.spin) * 0.5 + 0.6, 1); g.lineWidth = 5; g.strokeStyle = '#2a1a10'; for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8d6b4' : '#b8402a'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 44, i * Math.PI / 4, (i + 1) * Math.PI / 4); g.fill(); } g.beginPath(); g.arc(0, 0, 44, 0, 7); g.stroke(); g.fillStyle = '#d8a020'; g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.stroke(); g.restore(); break; }
    case 'gear': { g.save(); g.translate(s.x, s.y); g.rotate(s.spin); g.fillStyle = '#9aa4ae'; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 14 : 20; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#3a3a44'; g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill(); g.restore(); break; }
    case 'cball': { g.fillStyle = '#23232b'; g.beginPath(); g.arc(s.x, s.y, 16, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(s.x - 5, s.y - 5, 5, 0, 7); g.fill(); break; }
    case 'tract': {
      const on = s.t > 0.6, k = on ? Math.min(1, s.life * 4) : 0.35 + Math.sin(T * 30) * 0.15, top = s.y - 20;
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,220,120,${0.55 * k})`; g.beginPath(); g.moveTo(s.x - 22, top); g.lineTo(s.x + 22, top); g.lineTo(s.x + 60, GROUND); g.lineTo(s.x - 60, GROUND); g.closePath(); g.fill();
      if (on) { g.fillStyle = `rgba(255,250,220,${0.5 * k})`; for (let i = 0; i < 4; i++) { const yy = GROUND - ((T * 260 + i * 110) % (GROUND - top)); g.fillRect(s.x - 30, yy, 60, 5); } }
      g.restore(); break;
    }
    case 'snow': { g.fillStyle = '#f4f8ff'; g.beginPath(); g.arc(s.x, s.y, 18, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#c8d8f0'; g.beginPath(); g.arc(s.x + 5, s.y + 5, 7, 0, 7); g.fill(); break; }
    case 'ball': { g.save(); g.translate(s.x, s.y); g.rotate(s.spin * Math.sign(s.vx || 1)); g.fillStyle = '#f4f8ff'; g.beginPath(); g.arc(0, 0, 44, 0, 7); g.fill(); g.lineWidth = 5; g.stroke(); g.strokeStyle = '#b8c8e0'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 14 + i * 10, i, i + 1.6); g.stroke(); } g.restore(); break; }
    case 'torp': { g.save(); g.translate(s.x, s.y); g.scale(s.dir || 1, 1); g.fillStyle = '#b8402a'; g.beginPath(); g.ellipse(0, 0, 34, 12, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e8d6b4'; g.fillRect(-40, -12, 8, 24); g.strokeRect(-40, -12, 8, 24); g.fillStyle = '#fff'; g.beginPath(); g.arc(18, -3, 5, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(20, -3, 2.5, 0, 7); g.fill(); g.beginPath(); g.arc(22, 5, 4, 0, Math.PI); g.stroke(); g.restore(); break; }
    case 'drop': { g.fillStyle = '#2a2230'; g.beginPath(); g.moveTo(s.x, s.y - 18); g.quadraticCurveTo(s.x + 13, s.y, s.x, s.y + 10); g.quadraticCurveTo(s.x - 13, s.y, s.x, s.y - 18); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(s.x - 4, s.y - 4, 3, 5); break; }
    case 'crys': { g.fillStyle = '#bff4ff'; g.beginPath(); g.moveTo(s.x, s.y - 26); g.lineTo(s.x + 12, s.y); g.lineTo(s.x, s.y + 16); g.lineTo(s.x - 12, s.y); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(s.x - 3, s.y - 14, 3, 10); break; }
    case 'beam': {
      const x0 = s.x, x1 = s.x + s.dir * s.len;
      if (s.t < 0.7) { if (Math.floor(T * 20) % 2) { g.strokeStyle = 'rgba(255,90,70,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, s.y); g.lineTo(x1, s.y); g.stroke(); } }
      else { const k = Math.min(1, (s.t - 0.7) * 8) * Math.min(1, s.life * 6); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,120,60,${0.5 * k})`; g.fillRect(Math.min(x0, x1), s.y - 22 * k, s.len, 44 * k); g.fillStyle = `rgba(255,250,210,${k})`; g.fillRect(Math.min(x0, x1), s.y - 9 * k, s.len, 18 * k); g.restore(); }
      break;
    }
    case 'dbomb': { g.fillStyle = '#1a1a22'; g.beginPath(); g.arc(s.x, s.y, 12, 0, 7); g.fill(); g.stroke(); g.fillStyle = Math.floor(T * 12) % 2 ? '#ffd35a' : '#ff5b4f'; g.beginPath(); g.arc(s.x + 5, s.y - 14, 4, 0, 7); g.fill(); break; }
    case 'spark': { g.save(); g.translate(s.x, s.y); g.rotate(T * 20); g.fillStyle = '#ffe08a'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 4 : 11; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); break; }
    case 'shout': { g.strokeStyle = '#ffd35a'; g.lineWidth = 5; for (let i = 0; i < 3; i++) { g.globalAlpha = 1 - i * 0.28; g.beginPath(); g.arc(s.x - s.dir * i * 14, s.y, 12 + i * 7, s.dir > 0 ? -1 : Math.PI - 1, s.dir > 0 ? 1 : Math.PI + 1); g.stroke(); } g.globalAlpha = 1; break; }
    case 'spear': { const a = Math.atan2(s.vy, s.vx); g.save(); g.translate(s.x, s.y); g.rotate(a); g.fillStyle = '#c8d2dc'; g.fillRect(-26, -2, 44, 4); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(18, -6); g.lineTo(30, 0); g.lineTo(18, 6); g.fill(); g.restore(); break; }
    default: { g.fillStyle = '#ffd35a'; g.beginPath(); g.ellipse(s.x, s.y, 13, 7, Math.atan2(s.vy, s.vx), 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, 3, 0, 7); g.fill(); }
  }
}
function drawEnemy(e) {
  const dead = e.st === 'dead', fl = e.flash > 0 ? 0.8 : 0;
  if (e.type === 'drone') {
    // disco 0-1 vola · 2 sgancia · 3 colpito · 4 precipita
    const f = dead ? 4 : e.flash > 0 ? 3 : e.shotT > 0 ? 2 : Math.floor(T * 6) % 2;
    spr('arte', `disco_${f}`, e.x, e.y + 50 + (dead ? e.t * 200 : 0), { scale: 0.95, face: e.face, rot: dead ? e.t * 3 : Math.sin(T * 3) * 0.08, flash: fl });
    return;
  }
  const bob = e.st === 'walk' ? Math.abs(Math.sin(e.walk * 1.6)) * 4 : 0;
  const walk = (a) => a[Math.floor(e.walk) % a.length];
  let key, sc = 0.9;
  if (e.type === 'robo') {
    // robo 0 fermo · 1-2 cammina · 3 scintille · 4 si scarica · 5 esplode
    key = `robo_${dead ? (e.t < 0.3 ? 4 : 5) : e.st === 'atk' || e.st === 'wind' ? 3 : e.walk ? walk([1, 0, 2, 0]) : 0}`; sc = 0.95;
  } else if (e.type === 'uff') {
    // uff 0 fermo · 1-2 cammina · 3 megafono · 4 indica · 5 colpito · 6 a terra
    key = `uff_${dead ? (e.t < 0.25 ? 5 : 6) : e.st === 'atk' ? 3 : e.st === 'wind' ? 4 : walk([1, 0, 2, 0])}`; sc = 0.95;
  } else if (e.type === 'bruto') {
    // leg 0 fermo · 1-2 cammina · 3 fendente · 4 urla · 5 colpito · 6 stordito
    key = `leg_${dead ? (e.t < 0.25 ? 5 : 6) : e.st === 'charge' ? 3 : e.st === 'wind' ? 4 : walk([1, 0, 2, 0])}`; sc = 1.0;
  } else {
    // inv 0-2 cammina · 3 spara · 4 spara in alto · 5 colpito · 6 a terra · 7 scappa
    key = `inv_${dead ? (e.t < 0.25 ? 5 : 6) : e.st === 'atk' ? (e.up ? 4 : 3) : e.st === 'wind' ? 3 : walk([0, 1, 2, 1])}`;
  }
  spr('arte', key, e.x, e.y - bob, { scale: sc, face: e.face, flash: fl });
}
function drawBoss() {
  const B = S.boss; if (!B) return;
  const D = CAPI[B.id], F = D.F;
  let f;
  if (B.dead) f = B.t < 1.2 ? F.dd : F.d;
  else if (B.st === 'intro') f = F.wind !== undefined ? F.wind : F.sp;
  else if (B.st === 'walk') f = F.w[Math.floor(B.t * 3) % 2];
  else if (B.st === 'tired') f = F.t;
  else if (B.t < 0.4 && F.wind !== undefined) f = F.wind;
  else f = F[B.pose || 'a'];
  if (D.fly) { g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(B.x, GROUND - 4, 110, 16, 0, 0, 7); g.fill(); }
  if (B.st === 'tired' && !B.dead) { const sy = B.y - D.ht * D.sc - 20; if (FXF('ui_6')) for (let i = 0; i < 3; i++) { const a = T * 4 + i * 2.1; fxs('ui_6', B.x + Math.cos(a) * 50, sy + Math.sin(a) * 12, 26, { rot: a }); } else { g.save(); g.globalAlpha = 0.5 + Math.sin(T * 10) * 0.3; ptxt('* * *', B.x, sy, 16, '#fff1a6', 'center'); g.restore(); } }
  const bob = B.st === 'walk' && !D.fly ? -Math.abs(Math.sin(B.t * 6)) * 6 : 0;
  const shake = B.dead && B.t < 1.2 ? rand(-4, 4) : 0;
  spr(D.sh, `${D.k}_${f}`, B.x + shake, B.y + bob, { scale: D.sc, face: B.face, flash: B.flash > 0 ? 0.3 : 0, sy: B.st === 'slam' && B.t > 0.7 && B.t < 0.85 ? 0.9 : 1 });
}
function draw() {
  g.save();
  if (S.shake) g.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
  drawBack();
  g.translate(-Math.round(S.cam), 0);
  // shadows of the falling crystals, oil puddles
  for (const f of S.fx) {
    if (f.k === 'mark' && fxs('en_15', f.x, GROUND + 2, 26 + f.t / 0.95 * 60, { alpha: 0.4 + f.t * 0.6 })) continue;
    if (f.k === 'puddle' && fxs('en_13', f.x, GROUND + 2, 90, { alpha: 1 - f.t / 1.2 })) continue;
    if (f.k === 'mark') { const k = f.t / 0.95; g.fillStyle = `rgba(0,0,0,${0.2 + k * 0.4})`; g.beginPath(); g.ellipse(f.x, GROUND - 2, 10 + k * 26, 5 + k * 6, 0, 0, 7); g.fill(); }
    else if (f.k === 'puddle') { g.fillStyle = `rgba(30,24,40,${0.7 * (1 - f.t / 1.2)})`; g.beginPath(); g.ellipse(f.x, GROUND - 2, 34, 7, 0, 0, 7); g.fill(); }
  }
  // the city's scenery objects (from its platform sheet), on the street behind everyone
  const city = IMG[MISSIONS[MI].bg] ? MISSIONS[MI].bg : 'roma';
  if (IMG.piatt && window.ATLAS.piatt && window.ATLAS.piatt[`${city}_deco`]) DECO_X.forEach((dx, i) => { if (dx > S.cam - 300 && dx < S.cam + W + 300) spr('piatt', `${city}_deco`, dx, GROUND + 6, { scale: 0.75, face: i % 2 ? -1 : 1 }); });
  drawHazardBack();
  EX.drawBgLife();
  if (LV.floorBelt) drawFloorBelt();
  // props
  for (const o of S.props) if (o.hp > 0) { const ox = o.x + (o.shake > 0 ? rand(-3, 3) : 0); if (!fxs(o.k === 'barrel' ? 'obj_7' : 'obj_6', ox, o.y, o.k === 'barrel' ? 76 : 96)) spr('items', o.k, ox, o.y, { scale: 1.6 }); }
  // prisoners: pris 0-3 legati · 4-7 liberi
  for (const q of S.pris) {
    EX.drawParaPris(q);
    if (q.st === 'tied') {
      spr('arte', `pris_${q.k}`, q.x, q.y, { scale: 1.0, sy: 1 + Math.sin(T * 4 + q.id) * 0.03 });
      if (Math.floor(T * 2) % 2) ptxt('AIUTO!', q.x, q.y - 150, 9, '#ffffff', 'center');
    } else if (q.t < 3) spr('arte', `pris_${q.k + 4}`, q.x, q.y - (q.t > 0.8 ? Math.abs(Math.sin(q.t * 9)) * 14 : 0), { scale: 1.0, alpha: q.t > 2.4 ? (3 - q.t) / 0.6 : 1 });
  }
  // items
  for (const it of S.items) {
    const b = Math.sin(T * 6) * 4;
    if (it.k === 'cibo') { EX.drawFood(it, b); continue; }
    if (it.k === 'perk') { EX.drawPerk(it, b); continue; }
    if (fxs(it.k === 'bomb' ? 'obj_4' : `obj_${'HSFR'.indexOf(it.k)}`, it.x, it.y + b, 78)) { if (it.k !== 'bomb') ptitle(it.k, it.x + 34, it.y - 50 + b, 16, '#ffffff', WCOL[it.k]); continue; }
    if (it.k === 'bomb') { g.fillStyle = '#3a4a2a'; g.beginPath(); g.arc(it.x, it.y - 22 + b, 16, 0, 7); g.fill(); ptxt('B', it.x, it.y - 16 + b, 12, '#ffd35a', 'center'); }
    else { g.fillStyle = '#10141c'; g.fillRect(it.x - 22, it.y - 48 + b, 44, 44); g.strokeStyle = WCOL[it.k]; g.lineWidth = 3; g.strokeRect(it.x - 22, it.y - 48 + b, 44, 44); ptitle(it.k, it.x, it.y - 14 + b, 24, '#ffffff', WCOL[it.k]); }
  }
  // the Vespona: vesp 0 ferma · 1-2 corre · 3 spara · 4 salta · 5 ammaccata
  const V = S.veh;
  const remoRide = V.rider && V.rider.hero === 0 && (!V.kind || V.kind === 'vespa') && FXF('rv_0');
  if (EX.drawVehicle(V)) {} else if (remoRide) {
    // Remo's own drawings on the scooter: rv 0 fermo · 1-2 corre · 3 spara · 4-5 salta · 6 bomba · 7 colpito
    const f = V.flash > 0.3 ? 7 : V.roarCd > 4.6 ? 6 : V.shotT > 0 ? 3 : V.y < GROUND - 2 ? 4 + Math.floor(T * 6) % 2 : V.st === 'walk' ? 1 + Math.floor(T * 8) % 2 : 0;
    fxs(`rv_${f}`, V.x, V.y + 4 - (V.st === 'walk' ? Math.abs(Math.sin(T * 16)) * 3 : 0), 250, { face: V.face, flash: V.flash > 0 && Math.floor(T * 20) % 2 ? 0.7 : 0 });
  } else if (!V.wreck) {
    const f = V.rider ? (V.shotT > 0 ? 3 : V.y < GROUND - 2 ? 4 : V.st === 'walk' ? 1 + Math.floor(T * 8) % 2 : 0) : 0;
    const vy = V.y - (V.rider && V.st === 'walk' ? Math.abs(Math.sin(T * 16)) * 3 : 0);
    spr('arte', `vesp_${f}`, V.x, vy, { scale: 1.0, face: V.face, flash: V.flash > 0 && Math.floor(T * 20) % 2 ? 0.7 : 0 });
    if (V.rider) {
      const R = ROSTER[V.rider.hero];
      spr('arte', `${R.id}_${V.up ? R.F.u : V.shotT > 0 ? R.F.s : R.F.i[0]}`, V.x - V.face * 22, vy - 92, { scale: 0.62, face: V.face });
    } else {
      // big bouncing sign, like the arcades: SALI!
      const by = V.y - 215 + Math.abs(Math.sin(T * 5)) * -18;
      if (fxs('ui_2', V.x, by - 4, 150)) { ptitle('SALI!', V.x, by - 14, 20, '#ffffff', '#ff5b4f'); if (alive().some((p) => Math.abs(p.x - V.x) < 220)) ptxt('SALTACI SOPRA O PREMI SU', V.x, by + 90, 9, '#ffe3a0', 'center'); } else {
      g.fillStyle = '#ffd35a'; g.fillRect(V.x - 58, by - 34, 116, 40); g.fillStyle = '#1a1020'; g.fillRect(V.x - 54, by - 30, 108, 32);
      ptitle('SALI!', V.x, by - 6, 20, '#ffffff', '#ff5b4f');
      g.fillStyle = '#ffd35a'; g.beginPath(); g.moveTo(V.x - 16, by + 10); g.lineTo(V.x + 16, by + 10); g.lineTo(V.x, by + 30); g.fill();
      if (alive().some((p) => Math.abs(p.x - V.x) < 220)) ptxt('SALTACI SOPRA O PREMI SU', V.x, by + 52, 9, '#ffe3a0', 'center'); }
    }
  } else spr('arte', 'vesp_5', V.x, V.y, { scale: 1.0, alpha: 0.7 });
  // enemies
  for (const e of S.enemies) {
    if (e.st === 'dead' && e.t > 0.9 && Math.floor(T * 16) % 2) continue;
    if (e.mirage) { const see = S.players.some((p) => p.perk === 'stretto'); g.save(); g.globalAlpha = see ? 0.18 : 0.42 + Math.sin(T * 6 + e.id) * 0.16; drawEnemy(e); g.restore(); } else drawEnemy(e);
  }
  drawBoss();
  // players
  for (const p of S.players) {
    if (p.out || p === V.rider) continue;
    if (p.inv > 0 && !p.dead && Math.floor(T * 16) % 2) continue;
    const [key, sy, sx] = heroFrame(p), R = ROSTER[p.hero];
    const twin = p.slot > 0 && S.players[0].hero === p.hero;   // same animal twice: the second one is bluish
    spr('arte', key, p.x, p.y, { scale: HERO_SC, sy, sx, face: p.face, img: twin ? tinted('arte', key, '#2a5aff', 'source-atop', 0.3) : undefined });
    if (!p.dead && p.cd > WEAPONS[p.w].rate - 0.06) { const [mx, my] = muzzle(p); if (!fxs('he_6', mx + (p.aim === 'f' ? p.face * 14 : 0), my, 40, p.aim === 'f' ? { face: p.face } : { rot: p.aim === 'u' ? -Math.PI / 2 : Math.PI / 2 }) && p.aim !== 'f') { g.fillStyle = '#fff1a6'; g.beginPath(); g.arc(mx, my, 9, 0, 7); g.fill(); } }
    ptxt(`${p.slot + 1}P`, p.x, p.y - 160, 9, R.color, 'center');
  }
  if (V.rider) ptxt(`${V.rider.slot + 1}P`, V.x, V.y - 200, 9, ROSTER[V.rider.hero].color, 'center');
  // shots
  const HSPR = { P: ['he_0', 46], H: ['he_1', 42], S: ['he_2', 28], R: ['he_4', 74], L: ['he_5', 68] };
  for (const s of S.shots) {
    if (IMG.fx && s.w === 'F') { const k = 1 - s.life / 0.38; if (fxShot('he_3', s, 50 + k * 70, 1, { alpha: 1 - k * 0.7 })) continue; }
    if (IMG.fx && HSPR[s.w] && fxShot(HSPR[s.w][0], s, HSPR[s.w][1], 1)) continue;
    if (s.w === 'F') { const k = 1 - s.life / 0.38; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,${160 - k * 100},40,${0.8 - k * 0.6})`; g.beginPath(); g.arc(s.x, s.y, 14 + k * 30, 0, 7); g.fill(); g.restore(); }
    else if (s.w === 'R' || s.w === 'L') { g.fillStyle = s.w === 'L' ? '#ffcf5a' : '#ff5b8a'; g.beginPath(); g.arc(s.x, s.y, s.w === 'L' ? 16 : 9, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,120,.5)'; g.fillRect(s.x - Math.sign(s.vx) * 30, s.y - 3, Math.sign(s.vx) * 24, 6); }
    else { g.fillStyle = WCOL[s.w]; if (s.vy && !s.vx) g.fillRect(s.x - 2, s.y - 9, 4, 18); else g.fillRect(s.x - 9, s.y - 2, 18, 4); }
  }
  for (const s of S.foeShots) drawFoeShot(s);
  drawHazardFront();
  for (const b of S.bombs) { if (fxs('obj_5', b.x, b.y, 32, { rot: b.rot })) continue; g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.fillStyle = '#3a4a2a'; g.fillRect(-8, -10, 16, 20); g.fillStyle = '#c8d2dc'; g.fillRect(-3, -14, 6, 5); g.restore(); }
  // effects
  for (const f of S.fx) {
    if (IMG.fx) {
      if (f.k === 'boom') { const k = f.t / 0.6; if (fxs(`ef_${Math.min(3, Math.floor(k * 4))}`, f.x, f.y, 150 * f.r * (0.8 + k * 0.5), { alpha: k > 0.75 ? (1 - k) * 4 : 1 })) continue; }
      if (f.k === 'ring') { const k = f.t / 0.6; if (fxs('ef_5', f.x, f.y, 120 + k * 800, { sy: 0.5, alpha: 1 - k })) continue; }
      if (f.k === 'wave') { if (fxs('en_14', f.x, GROUND + 4, 110, { face: f.dir })) continue; }
      if (f.k === 'hit') { const k = f.t / 0.15; if (fxs('he_7', f.x, f.y, 34 + k * 20, { alpha: 1 - k })) continue; }
      if (f.k === 'smoke') { const k = f.t / 0.7; if (fxs('ef_4', f.x, f.y - k * 30, 100 + k * 40, { alpha: 1 - k })) continue; }
    }
    if (f.k === 'boom') { const k = f.t / 0.6, r = (20 + k * 90) * f.r; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.fillStyle = '#ffdb7a'; g.beginPath(); g.arc(f.x, f.y, r * 0.6, 0, 7); g.fill(); g.fillStyle = '#ff7a2a'; g.beginPath(); g.arc(f.x, f.y, r, 0, 7); g.fill(); g.restore(); }
    else if (f.k === 'sp') { g.fillStyle = f.c; g.globalAlpha = 1 - f.t / f.life; g.fillRect(f.x - 3, f.y - 3, 6, 6); g.globalAlpha = 1; }
    else if (f.k === 'wave') { g.fillStyle = '#ff9a5a'; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(f.x, GROUND, 34, 40, 0, Math.PI, 0); g.fill(); g.globalAlpha = 1; }
    else if (f.k === 'ring') { const k = f.t / 0.6; g.strokeStyle = `rgba(255,210,90,${1 - k})`; g.lineWidth = 8; g.beginPath(); g.ellipse(f.x, f.y, 60 + k * 400, 20 + k * 120, 0, 0, 7); g.stroke(); }
  }
  EX.drawFxExtra();
  for (const p of S.pops) { const k = p.t / (p.big ? 1.4 : 0.8); g.globalAlpha = 1 - k * k; ptitle(p.s, p.x, p.y - k * 50, p.big ? 18 : 13, '#ffffff', p.c); g.globalAlpha = 1; }
  g.restore();
  drawHUD();
  drawFilm();
}
/* the HUD in the painted frames: brass and wood, dark ink on parchment */
function hudFx(p, i) {
  const x = i ? W - 310 : 10, col = ROSTER[p.hero].color, ink = '#3a2410';
  fxBox('ui_0', x, 4, 300, 104);
  const head = p.hero === 0 ? 'ui_3' : `testa_${p.hero - 1}`;
  const face = fxs(FXF(head) ? head : `rit_${p.hero}`, x + 26, 58, 60), o = face ? 26 : 0;
  ptxt(`${i + 1}P ${ROSTER[p.hero].name}`, x + 36 + o, 44, 11, col);
  ptxt(String(p.score).padStart(7, '0'), x + 266, 44, 11, ink, 'right', false);
  if (p.out) { if (Math.floor(T * 2) % 2) ptxt('FUOCO PER CONTINUARE', x + 36 + o, 74, 9, ink, 'left', false); return; }
  const w = S.veh.rider === p ? null : p.w;
  ptitle(w || 'V', x + 50 + o, 80, 20, '#ffffff', w ? WCOL[w] : '#ff5b4f');
  ptxt(w ? (p.ammo === Infinity ? 'INF.' : String(p.ammo)) : `${Math.max(0, S.veh.hp)}/${S.veh.max || 10}`, x + 70 + o, 76, 10, ink, 'left', false);
  fxs('ui_4', x + 150 + o, 70, 22); ptxt(String(p.bombs), x + 164 + o, 76, 10, ink, 'left', false);
  const n = p.hp ?? 1;
  for (let k = 0; k < n; k++) fxs('ui_7', x + 222 + k * 17, 70, 16);
  ptxt(`x${p.lives}`, x + 280, 96, 9, ink, 'right', false);
}
function drawHUD() {
  S.players.forEach((p, i) => {
    const x = i ? W - 300 : 20, col = ROSTER[p.hero].color;
    if (FXF('ui_0')) { hudFx(p, i); return; }
    panel(x, 12, 280, 70, col);
    ptxt(`${i + 1}P ${ROSTER[p.hero].name}`, x + 14, 36, 11, col);
    ptxt(String(p.score).padStart(7, '0'), x + 266, 36, 11, '#ffd27a', 'right');
    if (p.out) { if (Math.floor(T * 2) % 2) ptxt('FUOCO PER CONTINUARE', x + 14, 64, 9, '#ffe3a0'); return; }
    const w = S.veh.rider === p ? null : p.w;
    ptitle(w || 'V', x + 30, 72, 20, '#ffffff', w ? WCOL[w] : '#ff5b4f');
    ptxt(w ? (p.ammo === Infinity ? 'INFINITI' : String(p.ammo)) : `VESP ${Math.max(0, S.veh.hp)}/10`, x + 54, 68, 10, '#e8eef4');
    ptxt(`B ${p.bombs}`, x + 170, 68, 10, '#ffd35a');
    for (let k = 0; k < p.lives; k++) { g.fillStyle = col; g.fillRect(x + 230 + k * 14, 58, 10, 10); }
  });
  ptxt(`${MI + 1}/8 ${MISSIONS[MI].city}`, W / 2, 30, 9, '#f2e2c0', 'center');
  if (S.lock !== null && !S.boss) ptxt('SGOMBERA LA ZONA!', W / 2, 52, 10, '#ff8a7a', 'center');
  if (S.hintT > 0 && S.veh.rider) { panel(W / 2 - 300, 96, 600, 40, '#ff5b4f'); ptxt('FUOCO: CANNONE (SU: IN ALTO) · GRANATA: CLACSON · GIU + SALTO: SCENDI', W / 2, 122, 10, '#ffffff', 'center'); }
  if (S.t < 4) { const k = clamp(Math.min(S.t - 0.3, 4 - S.t) * 3, 0, 1); g.globalAlpha = k; ptitle('VIA!', W / 2, 420, 60, '#ffffff', '#ff5b4f'); g.globalAlpha = 1; }
  const B = S.boss;
  if (B && !B.dead && FXF('ui_1')) { bar(W / 2 - 200, H - 47, 400, 14, B.hp / B.max, '#ff6a4a', '#2a1a10'); fxBox('ui_1', W / 2 - 270, H - 70, 540, 60); ptxt(CAPI[B.id].name, W / 2, H - 76, 10, '#ffe0a0', 'center'); }
  else if (B && !B.dead) { panel(W / 2 - 260, H - 60, 520, 44, '#ffc052'); ptxt(CAPI[B.id].name, W / 2 - 244, H - 40, 9, '#ffe0a0'); bar(W / 2 - 244, H - 32, 488, 10, B.hp / B.max, '#ff6a4a'); }
  if (S.banner) { const k = clamp(Math.min(S.banner.t, 3 - S.banner.t) * 2, 0, 1); g.globalAlpha = k; const rib = fxBox('ui_5', W / 2 - 400, 206, 800, 170); ptitle(S.banner.a, W / 2, rib ? 290 : 300, rib ? 32 : 40, '#fff6d6', '#ff6a3a'); ptxt(S.banner.b, W / 2, rib ? 406 : 344, 12, '#e8eef4', 'center'); g.globalAlpha = 1; }
  if (S.win) { ptitle('MISSIONE COMPLETATA!', W / 2, 300, 44, '#fff6d6', '#7bf0b1'); S.players.forEach((p, i) => ptxt(`${ROSTER[p.hero].name}  ${p.score} PUNTI · ${p.kills} NEMICI · ${p.freed} PRIGIONIERI`, W / 2, 360 + i * 30, 11, ROSTER[p.hero].color, 'center')); }
  ptxt('PROVA 0.21', W - 16, H - 10, 7, '#56687a', 'right');
}

/* ---------------- save, difficulty, records ---------------- */
const GAME_NAME = ['MAMMA MIA,', 'I MARZIANI!'];
const DIFFIC = [{ name: 'FACILE', lives: 5, hp: 4, foe: 0.55, boss: 0.5 }, { name: 'NORMALE', lives: 4, hp: 2, foe: 0.8, boss: 0.8 }, { name: 'ARCADE', lives: 3, hp: 1, foe: 1.1, boss: 1.1 }];
const SAVE = (() => { try { return Object.assign({ max: 0, diff: 0, record: [] }, JSON.parse(localStorage.getItem('salvataggio') || '{}')); } catch (e) { return { max: 0, diff: 1, record: [] }; } })();
function saveGame() { try { localStorage.setItem('salvataggio', JSON.stringify(SAVE)); } catch (e) {} }
const DK = () => DIFFIC[SAVE.diff] || DIFFIC[1];
/* Bruno joins in Florence, Alba on the Dolomites: once met, they stay in the roster */
const UNLOCK = [0, 0, 2, 5];
const heroOpen = (h, mi) => UNLOCK[h] <= Math.max(SAVE.max, mi);
function nextHero(h, dir, mi) { for (let k = 1; k <= ROSTER.length; k++) { const n = (h + dir * k + ROSTER.length * 4) % ROSTER.length; if (heroOpen(n, mi)) return n; } return h; }
const teamScore = () => (S ? S.players.reduce((a, p) => a + p.score, 0) : 0);
let nm = null;
function finishRun(next) {
  const sc = teamScore(), rec = SAVE.record;
  if (sc > 0 && (rec.length < 8 || sc > rec[rec.length - 1].s)) { nm = { l: [0, 0, 0], i: 0, s: sc, next }; mode = 'nome'; Audio.sfx('fanfara'); }
  else mode = next;
}
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ.!';
function tickName() {
  for (const d of DEVICES) {
    const c = inputOf(d);
    if (c.pressed.u) { nm.l[nm.i] = (nm.l[nm.i] + 1) % ABC.length; Audio.sfx('select'); }
    if (c.pressed.d) { nm.l[nm.i] = (nm.l[nm.i] + ABC.length - 1) % ABC.length; Audio.sfx('select'); }
    if (c.pressed.l && nm.i > 0) nm.i--;
    if (c.pressed.r || c.pressed.fire || c.pressed.jump) {
      if (nm.i < 2) { nm.i++; Audio.sfx('select'); }
      else {
        SAVE.record.push({ n: nm.l.map((k) => ABC[k]).join(''), s: nm.s, m: MI + 1, d: SAVE.diff });
        SAVE.record.sort((a, b) => b.s - a.s); SAVE.record.length = Math.min(8, SAVE.record.length); saveGame();
        mode = nm.next; nm = null; Audio.sfx('confirm'); return;
      }
    }
  }
}
function drawName() {
  g.fillStyle = '#04070f'; g.fillRect(0, 0, W, H);
  fxBox('ui_5', W / 2 - 400, 90, 800, 170);
  ptitle('NUOVO RECORD!', W / 2, 180, 40, '#fff6d6', '#ff6a3a');
  ptxt(`${nm.s} PUNTI`, W / 2, 300, 16, '#ffd35a', 'center');
  nm.l.forEach((k, i) => {
    const x = W / 2 + (i - 1) * 110;
    ptitle(ABC[k], x, 440, 64, '#ffffff', i === nm.i ? '#ff5b4f' : '#56687a');
    if (i === nm.i && Math.floor(T * 3) % 2) { fxs('ui_6', x, 360, 30); fxs('ui_6', x, 500, 30); }
  });
  ptxt('SU/GIU: LETTERA · DESTRA O FUOCO: AVANTI · SINISTRA: INDIETRO', W / 2, 600, 10, '#9fb4c8', 'center');
}
function drawRecords(x, y, w) {
  drawBoard(x, y, w, 330, 'RECORD');
  const R = SAVE.record;
  if (!R.length) ptxt('ANCORA NESSUNO!', x + w / 2, y + 90, 10, '#ffe3a0', 'center');
  R.slice(0, 8).forEach((r, i) => {
    const yy = y + 60 + i * 34, col = i === 0 ? '#ffd35a' : '#fff0d0';
    ptxt(`${i + 1}. ${r.n}`, x + 34, yy, 11, col); ptxt(String(r.s), x + w - 34, yy, 11, col, 'right');
  });
}

/* ---------------- the professor's briefing ---------------- */
const SPEAK = { gufo: [4, 'PROF. GUFO'], remo: [0, 'REMO'], nina: [1, 'NINA'], bruno: [2, 'BRUNO'], alba: [3, 'ALBA'] };
const JOIN = {
  2: [['bruno', 'Ehi! Firenze è casa mia: da qui vengo anch\'io, e il mio trombone pure!'], ['gufo', 'Bruno si unisce alla squadra! (Sinistra e destra per cambiare eroe.)']],
  5: [['alba', 'Finalmente! Queste montagne le conosco come le mie corna. Vi faccio strada io.'], ['gufo', 'Alba si unisce alla squadra! (Sinistra e destra per cambiare eroe.)']],
};
function briefLines(mi) { return [...MISSIONS[mi].brief.map((t) => ['gufo', t]), ...(JOIN[mi] || [])]; }
function startBrief(mi, fresh = false) {
  const slots = S ? S.players.map((p) => ({ dev: p.dev, hero: p.hero })) : sel.slots.map((s) => ({ dev: s.dev, hero: s.hero }));
  brief = { mi, line: 0, t: 0, slots, keep: S && !fresh ? S.players : null, lines: briefLines(mi) };
  MI = mi; mode = 'brief'; Audio.playSong(0, 'gufo');
}
function tickBrief(dt) {
  brief.t += dt;
  const L = brief.lines, full = L[brief.line][1].length / 45 + 0.2;
  // each player can change hero here, among those already met
  for (const s of brief.slots) {
    const c = inputOf(s.dev);
    if (c.pressed.l || c.pressed.r) { const n = nextHero(s.hero, c.pressed.l ? -1 : 1, brief.mi); if (n !== s.hero) { s.hero = n; Audio.sfx('select'); } }
    if (c.pressed.fire || c.pressed.jump || c.pressed.start) {
      if (brief.t < full) brief.t = full;
      else if (brief.line < L.length - 1) { brief.line++; brief.t = 0; Audio.sfx('select'); if (L[brief.line][0] !== 'gufo') Audio.sfx('boing'); }
      else { newGame(brief.slots, brief.mi, brief.keep); mode = 'play'; Audio.sfx('confirm'); return; }
    }
  }
}
function drawCityBack(bg, tint, dim) {
  const img = IMG[bg] || IMG.roma;
  if (img) { const s = H / img.height; g.drawImage(img, -((T * 12) % Math.max(1, img.width * s - W)), 0, img.width * s, H); }
  if (!IMG[bg] && tint) tintCity({ tint, snow: bg === 'dolomiti' });
  g.fillStyle = `rgba(4,6,14,${dim})`; g.fillRect(0, 0, W, H);
}
function drawBrief() {
  const M = MISSIONS[brief.mi], L = brief.lines, [who] = L[brief.line];
  drawCityBack(M.bg, M.tint, 0.55);
  const rib = fxBox('ui_5', W / 2 - 330, 40, 660, 140);
  ptitle(`MISSIONE ${brief.mi + 1}`, W / 2, rib ? 112 : 110, 34, '#fff6d6', '#ff6a3a');
  ptxt(`${M.city} · ${M.place}`, W / 2, 200, 12, '#f2e2c0', 'center');
  const typing = brief.t < L[brief.line][1].length / 45;
  const [ri, rname] = SPEAK[who];
  // the one who speaks: the painted portrait, or the owl sprite
  if (!fxs(`rit_${ri}`, 230, 420 + Math.sin(T * 4) * 3, 300)) { const gf = typing ? [1, 3, 2][brief.line % 3] : 0; spr('arte', `gufo_${gf}`, 250, 600, { scale: 1.9 }); }
  panel(430, 230, 800, 330, '#ffc052');
  txt(rname, 460, 270, 20, who === 'gufo' ? '#ffd35a' : ROSTER[ri].color);
  let y = 320;
  const from = Math.max(0, brief.line - 2);
  L.forEach(([w, l], i) => {
    if (i > brief.line || i < from) return;
    const shown = i < brief.line ? l : l.slice(0, Math.floor(brief.t * 45));
    for (const row of wrapText(shown, 740, 22)) { txt(row, 460, y, 22, i === brief.line ? '#fff6e6' : '#b8c4d0', 'left', 700); y += 30; }
    y += 14;
  });
  if (!typing && Math.floor(T * 2) % 2) ptxt(brief.line < L.length - 1 ? 'FUOCO: AVANTI' : 'FUOCO: SI PARTE!', 1210, 540, 10, '#ffe3a0', 'right');
  // the heroes of this run (left/right to change)
  brief.slots.forEach((s, i) => {
    const R = ROSTER[s.hero], x = 560 + i * 240;
    spr('arte', `${R.id}_${R.F.i[Math.floor(T * 2.5) % 2]}`, x, 700, { scale: 0.8 });
    ptxt(`< ${R.name} >`, x, 590, 10, R.color, 'center');
  });
}

/* ---------------- the ending: who is under the helmet ---------------- */
const REVEAL = [
  [6, 'Il Comandante barcolla, sbuffa fumo... e il casco a specchio si apre con un clic.'],
  [7, 'Dentro non c\'è un marziano. C\'è un UOMO. Con i baffi.'],
  [7, '«Scusate... credevamo che questo pianeta fosse disabitato.»'],
  [7, '«Il nostro è diventato troppo piccolo. Siamo partiti a cercarne un altro.»'],
  [7, 'Remo lo guarda a lungo. Poi gli porge una sedia: «Siediti. Hai fame?»'],
];
function tickReveal(dt) {
  rv.t += dt;
  const full = REVEAL[rv.i][1].length / 40 + 0.3;
  if (briefPress()) {
    if (rv.t < full) rv.t = full;
    else if (rv.i < REVEAL.length - 1) { rv.i++; rv.t = 0; if (rv.i === 1) Audio.sfx('boing'); }
    else { Audio.sfx('team'); SAVE.max = 7; SAVE.won = true; saveGame(); finishRun('end'); }
  }
}
function briefPress() { for (const d of DEVICES) { const c = inputOf(d); if (c.pressed.fire || c.pressed.jump || c.pressed.start) return true; } return false; }
function drawReveal() {
  const scene = rv.i >= 1 && IMG.scena_rivelazione;
  if (scene) { g.drawImage(IMG.scena_rivelazione, 0, 0, W, H); g.fillStyle = 'rgba(4,6,14,.25)'; g.fillRect(0, 0, W, H); }
  else {
    drawCityBack('etna', MISSIONS[7].tint, 0.6);
    const [f] = REVEAL[rv.i];
    const sh = rv.i === 0 && rv.t < 1.5 ? rand(-3, 3) : 0;
    spr('capi', `comand_${f}`, W / 2 + sh, 470, { scale: 1.1, face: -1 });
  }
  const line = REVEAL[rv.i][1];
  panel(140, 520, 1000, 150, '#ffc052');
  const rows = wrapText(line.slice(0, Math.floor(rv.t * 40)), 940, 24);
  rows.forEach((r, i) => txt(r, 170, 570 + i * 34, 24, '#fff6e6', 'left', 700));
  if (rv.t > line.length / 40 && Math.floor(T * 2) % 2) ptxt('FUOCO', 1120, 656, 9, '#ffe3a0', 'right');
}

/* ---------------- title and character select ---------------- */
const tsel = { row: 0, mi: 0 };
function tickTitle() {
  if (mode === 'title') { titleMenuInput(); return; }
  for (const d of DEVICES) {
    const c = inputOf(d);
    if (mode === 'select') {
      let s = sel.slots.find((q) => q.dev === d);
      if (!s && sel.slots.length < 2 && (c.pressed.fire || c.pressed.jump)) { sel.slots.push({ dev: d, hero: 1, ready: false }); Audio.sfx('confirm'); continue; }
      if (!s) continue;
      if (!s.ready) {
        if (c.pressed.l) { s.hero = nextHero(s.hero, -1, tsel.mi); Audio.sfx('select'); }
        if (c.pressed.r) { s.hero = nextHero(s.hero, 1, tsel.mi); Audio.sfx('select'); }
        if (c.pressed.fire || c.pressed.jump) { s.ready = true; Audio.sfx('confirm'); }
      } else if (c.pressed.bomb) s.ready = false;
      if (!s.ready && c.pressed.bomb && sel.slots.length === 1) { mode = 'title'; return; }
      if (c.pressed.start && sel.slots.every((q) => q.ready)) { S = null; startBrief(tsel.mi); return; }
    }
  }
  if (mode === 'select') {   // the countdown: at zero everyone goes with what they have
    sel.timer = (sel.timer ?? 20) - 1 / 60;
    const t = Math.ceil(sel.timer); if (t !== sel.lastT && t <= 5 && t > 0) Audio.sfx('select'); sel.lastT = t;
    if (sel.timer <= 0) for (const q of sel.slots) if (!q.ready) { q.ready = true; Audio.sfx('confirm'); }
    for (const q of sel.slots) if (!q.ready) { q.dk = 0; q.boom = 0; }
  }
  if (mode === 'select' && sel.slots.length && sel.slots.every((q) => q.ready) && !sel.go) sel.go = T;
  if (mode === 'select' && sel.go && T - sel.go > 1.1) { S = null; startBrief(tsel.mi); }
  if (mode === 'select' && sel.go && !sel.slots.every((q) => q.ready)) sel.go = null;
}
function drawGameName(y, big) {
  if (IMG.logo) { const s = Math.min(520 / IMG.logo.width, 250 / IMG.logo.height) * big, lw = IMG.logo.width * s, lh = IMG.logo.height * s; g.drawImage(IMG.logo, W / 2 - lw / 2, y - lh / 2, lw, lh); return; }
  if (IMG.stemma) { const s = Math.min(560 / IMG.stemma.width, 300 / IMG.stemma.height) * big; g.drawImage(IMG.stemma, W / 2 - IMG.stemma.width * s / 2, y - IMG.stemma.height * s * 0.55, IMG.stemma.width * s, IMG.stemma.height * s); }
  ptitle(GAME_NAME[0], W / 2, y - 44 * big, 34 * big, '#fff6d6', '#e8483a');
  ptitle(GAME_NAME[1], W / 2, y + 30 * big, 66 * big, '#fff6d6', '#e8483a');
}
function drawTitle() {
  if (IMG.scena_arrivo) { g.drawImage(IMG.scena_arrivo, 0, 0, W, H); g.fillStyle = mode === 'title' ? 'rgba(4,6,14,.55)' : 'rgba(4,6,14,.7)'; g.fillRect(0, 0, W, H); } else drawCityBack('roma', null, 0.55);
  drawGameName(IMG.logo ? 135 : 150, 1);
  if (mode === 'title') {
    drawTitleMenu();
    return;
  }
  // select
  if (typeof drawSelectArcade === 'function') { drawSelectArcade(); return; }
  sel.slots.forEach((s, i) => {
    const x = i ? 900 : 380, h = ROSTER[s.hero];
    panel(x - 200, 300, 400, 390, h.color);
    const f = s.ready ? h.F.w : h.F.i[Math.floor(T * 2.5) % 2];
    if (!fxs(`rit_${s.hero}`, x, 470, 210)) spr('arte', `${h.id}_${f}`, x, 600, { scale: 1.35 });
    else spr('arte', `${h.id}_${f}`, x + 120, 620, { scale: 0.7 });
    ptitle(`< ${h.name} >`, x, 350, 24, '#ffffff', h.color);
    ptxt(h.desc, x, 636, 8, '#e8eef4', 'center');
    ptxt(s.ready ? 'PRONTO!' : 'FUOCO: CONFERMA', x, 670, 9, s.ready ? '#7bf0b1' : '#ffe3a0', 'center');
  });
  if (sel.slots.length < 2) ptxt('2P: PREMI FUOCO PER ENTRARE', 900, 500, 11, '#9fb4c8', 'center');
  const locked = ROSTER.filter((_, i) => !heroOpen(i, tsel.mi)).map((R) => R.name);
  if (locked.length) ptxt(`${locked.join(' E ')}: LI INCONTRI PIU AVANTI...`, W / 2, 285, 9, '#ffd35a', 'center');
}
function drawEnd(win) {
  if (win && IMG.scena_finale) { g.drawImage(IMG.scena_finale, 0, 0, W, H); g.fillStyle = 'rgba(4,6,14,.35)'; g.fillRect(0, 0, W, H); }
  else if (win) drawCityBack('roma', null, 0.72); else { g.fillStyle = '#04070f'; g.fillRect(0, 0, W, H); }
  if (win && IMG.scena_finale) { g.fillStyle = 'rgba(4,6,14,.55)'; g.fillRect(0, 0, W, 210); g.fillRect(0, 570, W, 150); }
  ptitle(win ? 'TUTTI A TAVOLA!' : 'GAME OVER', W / 2, 120, 44, '#fff6d6', win ? '#7bf0b1' : '#ff4a3a');
  txt(win ? 'Animali e umani, seduti allo stesso tavolo. Fine... per ora!' : `I marziani hanno vinto a ${MISSIONS[MI].city}... per stavolta.`, W / 2, 180, 22, '#c8d6e4', 'center', 700);
  if (win && !IMG.scena_finale) ROSTER.forEach((R, i) => spr('arte', `${R.id}_${R.F.w}`, 170 + i * 150, 560, { scale: 0.85, sy: 1 + Math.sin(T * 6 + i) * 0.04 }));
  if (S) S.players.forEach((p, i) => ptxt(`${ROSTER[p.hero].name}  ${p.score} PUNTI · ${p.kills} NEMICI · ${p.freed} PRIGIONIERI`, win ? W / 2 : 420, win ? 600 + i * 24 : 250 + i * 30, 10, ROSTER[p.hero].color, 'center'));
  if (!win) drawRecords(880, 300, 340);
  if (Math.floor(T * 2) % 2) ptxt(win ? 'PREMI FUOCO PER TORNARE AL TITOLO' : 'FUOCO: RIPROVA LA MISSIONE · START: TITOLO', W / 2, 660, 12, '#ffe3a0', 'center');
  for (const d of DEVICES) {
    const c = inputOf(d);
    if (!win && c.pressed.fire && S) { startBrief(MI, true); return; }
    if (c.pressed.start || (win && c.pressed.fire)) { mode = 'title'; S = null; tsel.mi = Math.min(tsel.mi, SAVE.max); return; }
  }
}

/* ---------------- main loop ---------------- */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  Audio.update && Audio.update();
  if (mode === 'play') {
    acc += dt;
    while (acc >= 1 / 60 && mode === 'play') { step(1 / 60); acc -= 1 / 60; }
    if (mode === 'play') draw();
  } else if (mode === 'title' || mode === 'select') { if (Audio.ctx) Audio.playSong(0, 'titolo'); tickTitle(); if (mode === 'title' || mode === 'select') drawTitle(); drawFilm(); }
  else if (mode === 'brief') { tickBrief(dt); if (mode === 'brief') drawBrief(); drawFilm(); }
  else if (mode === 'reveal') { tickReveal(dt); if (mode === 'reveal') drawReveal(); drawFilm(); }
  else if (MENUS[mode]) { MENUS[mode][0](); if (MENUS[mode]) MENUS[mode][1](); drawFilm(); }
  else if (mode === 'cartello') { /* the title card is drawn by EX.overlay */ }
  else if (mode === 'nome') { tickName(); if (mode === 'nome') drawName(); drawFilm(); }
  else { if (mode === 'end' && Audio.ctx) Audio.playSong(0, 'finale'); drawEnd(mode === 'end'); drawFilm(); }
  EX.overlay(dt);
  requestAnimationFrame(frame);
}
window.Stivale = window.Assalto = {
  get S() { return S; }, get mode() { return mode; }, get MI() { return MI; }, SAVE, finishRun, newGame, step, spawnEnemy, startBrief, startBoss,
  setMode: (m) => { mode = m; }, MISSIONS, CAPI, ROSTER,
  // tests: jump straight into mission mi with these players
  play: (mi, slots) => { newGame(slots, mi); mode = 'play'; },
};
(async function boot() {
  try { if (window.loadFonts) await window.loadFonts(); } catch (e) {}
  await loadImages([['arte', 'assets/sprites/arte.png'], ['capi', 'assets/sprites/capi.png'], ['items', 'assets/sprites/items.png'], ['piatt', 'assets/sprites/piatt.png'], ['fx', 'assets/sprites/fx.png'], ['roma', 'assets/bg/roma.jpg']]).catch((e) => console.error('immagine mancante', e));
  document.querySelector('#loading') && document.querySelector('#loading').remove();
  requestAnimationFrame(frame);
  // the other cities: painted backgrounds are optional (until they exist, Rome is recoloured)
  for (const M of MISSIONS) if (M.bg !== 'roma') loadImages([[M.bg, `assets/bg/${M.bg}.jpg`]]).catch(() => {});
  // optional painted pieces: the logo and the three scenes (they are used as soon as they exist)
  for (const k of ['logo', 'stemma']) loadImages([[k, `assets/ui/${k}.png`]]).catch(() => {});
  for (const k of ['scena_arrivo', 'scena_rivelazione', 'scena_finale']) loadImages([[k, `assets/scene/${k}.jpg`]]).catch(() => {});
})();
