'use strict';
/* ============================================================
   STIVALE (titolo provvisorio) — corri e spara in stile cartone anni '30.
   Base: il prototipo Assalto. Qui la prova di stile: Remo, gli invasori, Roma.
   Un livello di prova in stile "corri e spara": piattaforme e salti,
   sparo in 4 direzioni, un colpo e sei fuori, armi a lettere,
   granate, prigionieri da liberare, il Leone Alato come veicolo,
   il Centurione di ferro come boss. 1 o 2 giocatori sullo stesso PC.
   ============================================================ */
const GROUND = 648, GRAV = 2100, JUMP_V = 1040, RUN = 290, HERO_SC = 0.95;
const ARENA_X = 6700, LEVEL_LEN = ARENA_X + 1280;

/* ---------------- input ---------------- */
const KEYSETS = [
  { l: ['ArrowLeft'], r: ['ArrowRight'], u: ['ArrowUp'], d: ['ArrowDown'], fire: ['KeyJ', 'KeyZ'], jump: ['KeyK', 'KeyX', 'Space'], bomb: ['KeyL', 'KeyC'], start: ['Enter'] },
  { l: ['KeyA'], r: ['KeyD'], u: ['KeyW'], d: ['KeyS'], fire: ['KeyF'], jump: ['KeyG'], bomb: ['KeyH'], start: ['KeyT'] },
];
const KEYS = new Set(), HITS = new Set();   // HITS: taps shorter than a frame are not lost
addEventListener('keydown', (e) => { if (!e.repeat) HITS.add(e.code); KEYS.add(e.code); if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); Audio.unlock(); });
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
    o.jump = b(0); o.fire = b(2) || b(3) || b(7) ? 1 : 0; o.bomb = b(1) || b(5) ? 1 : 0; o.start = b(9);
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

/* ---------------- the level ---------------- */
const PLATFORMS = [
  [1450, 260, 470], [1800, 300, 420], [2200, 240, 470], [2480, 220, 340],
  [4000, 300, 470], [4420, 260, 390], [5200, 280, 470], [5560, 260, 380], [5900, 240, 470],
];
/* waves: when the camera reaches x, spawn these ([type, x offset from camera right, y or 'g']) ; lock = arena */
const WAVES = [
  { x: 150, spawn: [['fante', 60], ['fante', 160], ['fante', 260]] },
  { x: 700, spawn: [['fante', 40], ['fante', 120], ['bruto', 260]], lock: true },
  { x: 1250, spawn: [['drone', 80, 250], ['fante', 60], ['fante', 150]] },
  { x: 1800, spawn: [['fante', 40, 400], ['fante', 140], ['drone', 200, 220], ['fante', 260]], lock: true },
  { x: 2500, spawn: [['drone', 60, 200], ['drone', 220, 260], ['fante', 120]] },
  { x: 3300, spawn: [['bruto', 60], ['fante', 160], ['fante', 240], ['bruto', 360]], lock: true },
  { x: 4100, spawn: [['fante', 60, 470], ['fante', 120], ['drone', 240, 240], ['fante', 300]] },
  { x: 4700, spawn: [['bruto', 60], ['drone', 160, 220], ['drone', 300, 280], ['fante', 120], ['fante', 220]], lock: true },
  { x: 5400, spawn: [['fante', 40, 470], ['fante', 140, 380], ['fante', 260], ['drone', 200, 200]] },
  { x: 6000, spawn: [['drone', 60, 200], ['drone', 160, 260], ['drone', 260, 220], ['bruto', 140]], lock: true },
];
const PRISONERS = [[980, 'lady', 'H'], [2560, 'elder', 'S', 340], [3900, 'fisher', 'F'], [5620, 'girl', 'R', 380], [6300, 'kid', 'H']];
const CRATES = [[600, 'crate'], [1150, 'barrel'], [2050, 'crate'], [3050, 'barrel'], [3150, 'barrel'], [4300, 'crate'], [5050, 'barrel'], [6150, 'crate']];
const VEHICLE_X = 2900;

/* ---------------- state ---------------- */
let S = null, mode = 'title', T = 0, sel = null;
const ids = { n: 1 }; const nid = () => ids.n++;
function newGame(players) {
  S = {
    t: 0, cam: 0, lock: null, wave: 0, players: [], enemies: [], shots: [], foeShots: [], bombs: [], fx: [], pops: [],
    props: CRATES.map(([x, k]) => ({ id: nid(), x, y: GROUND, k, hp: k === 'barrel' ? 3 : 4 })),
    pris: PRISONERS.map(([x, k, w, y]) => ({ id: nid(), x, y: y || GROUND, k, w, st: 'tied', t: 0 })),
    items: [], veh: { x: VEHICLE_X, y: GROUND, vy: 0, face: 1, hp: 10, rider: null, st: 'idle', t: 0, cd: 0, wreck: false, flash: 0 },
    boss: null, win: false, over: false, shake: 0, banner: { t: 3, a: 'MISSIONE 1', b: 'ROMA · LE ROVINE DEL FORO' },
  };
  players.forEach((p, i) => S.players.push(newPlayer(p.dev, p.hero, i)));
  Audio.playSong(1);
}
function newPlayer(dev, hero, slot) {
  return { id: nid(), dev, hero, slot, x: 160 + slot * 90, y: GROUND - 300, vy: 0, face: 1, st: 'drop', t: 0, inv: 2, lives: 3, score: 0,
    w: 'P', ammo: Infinity, bombs: 10, cd: 0, aim: 'f', onGround: false, crouch: false, kills: 0, freed: 0, run: 0, knife: 0, dead: false, out: false };
}

/* ---------------- helpers ---------------- */
function groundUnder(x, y, vy, drop) {
  // returns the floor height the feet land on (one-way platforms)
  let best = GROUND;
  if (!drop) for (const [px, pw, py] of PLATFORMS) if (x > px && x < px + pw && y <= py + 2 && py < best) best = py;
  return best;
}
function onPlatform(x, y) { return PLATFORMS.some(([px, pw, py]) => x > px && x < px + pw && Math.abs(y - py) < 3); }
function pop(x, y, s, c = '#ffffff', big = 0) { S.pops.push({ x, y, s, c, big, t: 0 }); }
function boom(x, y, r = 1) { S.fx.push({ k: 'boom', x, y, r, t: 0 }); S.shake = Math.max(S.shake, 8 * r); Audio.sfx('boom'); }
function spark(x, y, c = '#ffe08a', n = 6) { for (let i = 0; i < n; i++) S.fx.push({ k: 'sp', x, y, vx: rand(-260, 260), vy: rand(-320, 40), c, t: 0, life: rand(0.2, 0.45) }); }
function alive() { return S.players.filter((p) => !p.out && !p.dead); }
function heroId(p) { return ROSTER[p.hero].id; }
/* the playable animals (only Remo is drawn so far: the second player is a blue-tinted Remo) */
const ROSTER = [{ id: 'remo', name: 'REMO', color: '#e8483a' }, { id: 'remo', name: 'REMO BLU', color: '#4f8bff', tint: '#2a5aff' }];

/* ---------------- players ---------------- */
function stepPlayer(p, c, dt) {
  p.t += dt; p.cd -= dt; p.inv = Math.max(0, p.inv - dt); p.knife = Math.max(0, p.knife - dt);
  if (p.out) { if (c.pressed.start || c.pressed.fire) { p.out = false; p.lives = 3; p.score = 0; p.w = 'P'; p.ammo = Infinity; p.bombs = 10; respawn(p); } return; }
  p.land = Math.max(0, (p.land || 0) - dt); p.bombT = Math.max(0, (p.bombT || 0) - dt);
  if (p.dead) { p.vy += GRAV * dt; p.y = Math.min(GROUND, p.y + p.vy * dt); if (p.t > 1.6) { if (p.lives > 0) respawn(p); else { p.out = true; } } return; }
  if (p === S.veh.rider) { stepRider(p, c, dt); return; }
  // move
  const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0);
  p.crouch = !!c.d && p.onGround;
  if (dx) p.face = dx;
  const sp = RUN * (p.crouch ? 0.45 : 1);
  p.x += dx * sp * dt;
  const lo = S.cam + 40, hi = (S.lock !== null ? S.lock + W : S.cam + W) - 40;
  p.x = clamp(p.x, lo, hi);
  p.run = dx && p.onGround ? p.run + dt * 9 : 0;
  // jump / drop through
  if (c.pressed.jump && p.onGround) {
    if (c.d && onPlatform(p.x, p.y)) { p.dropT = 0.25; p.onGround = false; p.y += 4; }
    else { p.vy = -JUMP_V; p.onGround = false; Audio.sfx('jump'); }
  }
  p.dropT = Math.max(0, (p.dropT || 0) - dt);
  p.vy += GRAV * dt; p.y += p.vy * dt;
  const fl = groundUnder(p.x, p.y - p.vy * dt, p.vy, p.dropT > 0);
  if (p.vy >= 0 && p.y >= fl) { if (!p.onGround && p.vy > 400) p.land = 0.1; p.y = fl; p.vy = 0; p.onGround = true; } else if (p.y < fl) p.onGround = p.onGround && p.y >= fl - 1;
  if (p.onGround && p.vy === 0 && !onPlatform(p.x, p.y) && p.y < GROUND - 1) p.onGround = false;   // walked off a ledge
  // aim
  p.aim = c.u ? 'u' : c.d && !p.onGround ? 'd' : 'f';
  // fire
  const W0 = WEAPONS[p.w];
  if ((W0.auto ? c.fire : c.pressed.fire) && p.cd <= 0) fire(p);
  if (c.pressed.bomb && p.bombs > 0) throwBomb(p);
  // enter the lion
  const V = S.veh;
  // get in: ▲ next to it, or simply jump onto it (like the tanks of the arcades)
  if (!V.rider && !V.wreck && Math.abs(p.x - V.x) < 95 && ((p.y > GROUND - 40 && c.pressed.u) || (p.vy > 0 && p.y > V.y - 190 && p.y < V.y - 40))) mount(p);
}
function respawn(p) {
  p.dead = false; p.st = 'drop'; p.t = 0; p.inv = 2.5; p.vy = 0; p.w = 'P'; p.ammo = Infinity; p.bombs = Math.max(p.bombs, 5);
  const others = alive().filter((q) => q !== p);
  p.x = others.length ? others[0].x - 40 : S.cam + 200; p.y = GROUND - 380;
}
function kill(p) {
  if (p.inv > 0 || p.dead || p.out) return;
  if (p === S.veh.rider) return;
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
  const W0 = WEAPONS[p.w];
  // knife: an enemy right in front
  const near = S.enemies.find((e) => e.hp > 0 && !e.fly && Math.abs(e.x - p.x) < 70 && Math.abs(e.y - p.y) < 60 && (e.x - p.x) * p.face > -10);
  if (near && p.aim === 'f') { p.knife = 0.22; p.cd = 0.3; hurtEnemy(near, 3, p); Audio.sfx('punch'); spark(near.x, near.y - 70, '#ffffff', 8); return; }
  p.cd = W0.rate;
  const [mx, my] = muzzle(p);
  const dir = p.aim === 'u' ? [0, -1] : p.aim === 'd' ? [0, 1] : [p.face, 0];
  const shot = (vx, vy, extra = {}) => S.shots.push({ id: nid(), x: mx, y: my, vx, vy, w: p.w, by: p, life: p.w === 'F' ? 0.38 : 1.6, dmg: W0.dmg, ...extra });
  if (p.w === 'S') for (const a of [-0.22, 0, 0.22]) { const ca = Math.cos(a), sa = Math.sin(a); shot((dir[0] * ca - dir[1] * sa) * W0.spd, (dir[0] * sa + dir[1] * ca) * W0.spd); }
  else if (p.w === 'H') shot(dir[0] * W0.spd + rand(-40, 40) * Math.abs(dir[1]), dir[1] * W0.spd + rand(-40, 40) * Math.abs(dir[0]));
  else shot(dir[0] * W0.spd, dir[1] * W0.spd);
  Audio.sfx(p.w === 'R' ? 'laser' : p.w === 'F' ? 'wind' : 'shot');
  if (p.ammo !== Infinity && --p.ammo <= 0) { p.w = 'P'; p.ammo = Infinity; pop(p.x, p.y - 170, 'PISTOLA', '#e8eef4'); }
}
function throwBomb(p) {
  p.bombs--; p.bombT = 0.25; p.cd = Math.max(p.cd, 0.15);
  S.bombs.push({ id: nid(), x: p.x + p.face * 20, y: p.y - 100 * HERO_SC, vx: p.face * 460 + (p.run ? p.face * 80 : 0), vy: -560, by: p, rot: 0 });
  Audio.sfx('wind');
}

/* ---------------- the Leone Alato as a vehicle ---------------- */
function mount(p) { const V = S.veh; V.rider = p; V.st = 'roar'; V.t = 0; V.flash = 0.3; p.inv = 1; S.hintT = 5; pop(V.x, V.y - 250, 'LEONE ALATO!', '#ff5b4f', 1); Audio.sfx('roar'); }
function dismount(ejected) {
  const V = S.veh, p = V.rider; if (!p) return;
  V.rider = null; p.x = V.x; p.y = V.y - 120; p.vy = -700; p.onGround = false; p.inv = 1.5;
  if (ejected) { V.wreck = true; boom(V.x, V.y - 100, 2); pop(V.x, V.y - 240, 'IL LEONE È STANCO!', '#ffb0a0', 1); }
}
function stepRider(p, c, dt) {
  const V = S.veh;
  V.t += dt; V.cd -= dt; V.flash = Math.max(0, V.flash - dt);
  p.x = V.x; p.y = V.y;
  const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0);
  if (dx) V.face = dx;
  V.x = clamp(V.x + dx * 230 * dt, S.cam + 110, (S.lock !== null ? S.lock + W : S.cam + W) - 110);
  if (c.pressed.jump) { if (c.d) { dismount(false); return; } if (V.y >= GROUND) { V.vy = -700; Audio.sfx('jump'); } }
  V.vy += GRAV * dt; V.y = Math.min(GROUND, V.y + V.vy * dt); if (V.y >= GROUND) V.vy = 0;
  V.st = dx ? 'walk' : 'idle';
  if (c.fire && V.cd <= 0) {
    V.cd = 0.3; V.shotT = 0.15;
    S.shots.push({ id: nid(), x: V.x + V.face * 110, y: V.y - 120, vx: V.face * 900, vy: 0, w: 'L', by: p, life: 1.5, dmg: 4 });
    Audio.sfx('special');
  }
  if (c.pressed.bomb) {
    // roar: a shockwave that hits everything on screen close by
    if (!V.roarCd || V.roarCd <= 0) {
      V.roarCd = 5; S.fx.push({ k: 'ring', x: V.x, y: V.y - 90, t: 0 }); S.shake = 12; Audio.sfx('roar');
      for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - V.x) < 420) hurtEnemy(e, 8, p);
    }
  }
  V.roarCd = (V.roarCd || 0) - dt;
  if (V.shotT > 0) V.shotT -= dt;
}
function hurtVehicle() { const V = S.veh; if (V.flash > 0) return; V.hp--; V.flash = 0.6; Audio.sfx('hurt'); spark(V.x, V.y - 140, '#ffb05a', 10); if (V.hp <= 0) dismount(true); }

/* ---------------- enemies ---------------- */
function spawnEnemy(type, x, y) {
  const e = { id: nid(), type, x, y: y === undefined || y === 'g' ? GROUND : y, vy: 0, face: -1, hp: 1, t: 0, st: 'walk', cd: rand(0.6, 1.6), flash: 0, walk: 0 };
  if (type !== 'drone' && y !== undefined && y !== 'g') {
    // "on a platform": the nearest slab ahead of the camera, otherwise the street
    const P = PLATFORMS.filter(([px, pw]) => px + pw > S.cam + W * 0.55 && px < S.cam + W + 500).sort((a, b) => Math.abs(a[2] - y) - Math.abs(b[2] - y))[0];
    if (P) { e.x = P[0] + P[1] * (0.3 + Math.random() * 0.4); e.y = P[2]; e.plat = P; } else e.y = GROUND;
  }
  if (type === 'fante') { e.hp = 1; }
  if (type === 'bruto') { e.hp = 10; e.cd = 1.5; }
  if (type === 'drone') { e.hp = 3; e.fly = true; e.y = y || 220; e.base = e.y; }
  S.enemies.push(e);
  return e;
}
function hurtEnemy(e, dmg, by) {
  if (e.hp <= 0) return;
  e.hp -= dmg; e.flash = 0.08;
  if (e.hp <= 0) {
    e.st = 'dead'; e.t = 0; e.vy = -300;
    const pts = e.type === 'bruto' ? 800 : e.type === 'drone' ? 400 : 200;
    if (by && by.score !== undefined) { by.score += pts; by.kills++; }
    if (e.type === 'drone') boom(e.x, e.y - 40, 0.8); else spark(e.x, e.y - 80, '#ffcf8a', 10);
    Audio.sfx(e.type === 'fante' ? 'ko' : 'break');
    if (Math.random() < (e.type === 'bruto' ? 0.6 : 0.08)) S.items.push({ id: nid(), x: e.x, y: e.y, vy: -300, k: Math.random() < 0.5 ? 'bomb' : pick(['H', 'S', 'F', 'R']) });
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
  e.cd -= dt;
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
  } else if (e.type === 'bruto') {
    if (e.st === 'walk') {
      e.x += Math.sign(dx) * 70 * dt; e.walk += dt * 5;
      if (e.cd <= 0 && Math.abs(dx) < 600) { e.st = 'wind'; e.t = 0; Audio.sfx('bosswind'); }
    } else if (e.st === 'wind' && e.t > 0.6) { e.st = 'charge'; e.t = 0; e.dir = Math.sign(dx) || -1; }
    else if (e.st === 'charge') {
      e.x += e.dir * 560 * dt;
      if (e.t > 0.9) { e.st = 'walk'; e.cd = rand(2, 3); }
    }
    for (const p of alive()) if (Math.abs(p.x - e.x) < 70 && Math.abs(p.y - e.y) < 90) kill(p);
    if (S.veh.rider && Math.abs(S.veh.x - e.x) < 120) { hurtVehicle(); if (e.st === 'charge') { e.st = 'walk'; e.cd = 2; e.x -= e.dir * 60; } }
  } else if (e.type === 'drone') {
    e.x += clamp(dx - Math.sign(dx) * 200, -150, 150) * dt; e.y = e.base + Math.sin(e.t * 2) * 30; e.walk += dt * 6;
    if (e.cd <= 0 && Math.abs(dx) < 650) {
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

/* ---------------- the boss: the Centurione di ferro ---------------- */
function startBoss() {
  const n = S.players.length;
  S.boss = { x: ARENA_X + W - 220, y: GROUND, hp: 320 + n * 120, max: 320 + n * 120, face: -1, st: 'intro', t: 0, cd: 1.5, flash: 0, pat: 0, dead: false };
  S.banner = { t: 3, a: 'IL GLADIATORE D\'ACCIAIO', b: 'SALTA LO SCUDO · COLPISCI QUANDO VEDE LE STELLE' };
  Audio.playSong(4);
}
function stepBoss(dt) {
  const B = S.boss; if (!B) return;
  B.t += dt; B.flash = Math.max(0, B.flash - dt);
  if (B.dead) { if (B.t > 3 && !S.win) { S.win = true; S.winT = 0; Audio.sfx('team'); } return; }
  const P = nearestPlayer(B); if (!P) return;
  const dx = P.x - B.x;
  switch (B.st) {
    case 'intro': if (B.t > 2) { B.st = 'walk'; B.t = 0; } break;
    case 'walk':
      B.face = Math.sign(dx) || B.face; B.x += B.face * 90 * dt; B.cd -= dt;
      if (B.cd <= 0) { B.st = ['slam', 'charge', 'shield'][B.pat++ % 3]; B.t = 0; Audio.sfx('bosswind'); }
      break;
    case 'slam':
      if (B.t > 0.7 && !B.did) { B.did = true; S.fx.push({ k: 'wave', x: B.x, y: GROUND, dir: -1, t: 0 }, { k: 'wave', x: B.x, y: GROUND, dir: 1, t: 0 }); S.shake = 16; Audio.sfx('boom'); }
      if (B.t > 1.4) { B.st = 'tired'; B.t = 0; B.did = false; }
      break;
    case 'charge':
      if (B.t < 0.6) break;
      B.x += B.face * 620 * dt;
      if (B.t > 1.6 || B.x < ARENA_X + 80 || B.x > ARENA_X + W - 80) { B.x = clamp(B.x, ARENA_X + 80, ARENA_X + W - 80); B.st = 'tired'; B.t = 0; S.shake = 10; Audio.sfx('stomp'); }
      break;
    case 'shield':
      // throws the shield low along the ground: it comes back like a boomerang (jump it twice)
      B.face = Math.sign(dx) || B.face;
      if (B.t > 0.5 && !B.did) { B.did = true; S.foeShots.push({ id: nid(), k: 'shield', x: B.x + B.face * 60, y: GROUND - 48, vx: B.face * 700, vy: 0, g: 0, life: 3, back: B.face, spin: 0 }); Audio.sfx('wind'); }
      if (B.t > 2.6) { B.st = 'tired'; B.t = 0; B.did = false; }
      break;
    case 'tired': if (B.t > 1.3) { B.st = 'walk'; B.t = 0; B.cd = rand(0.8, 1.6) * (B.hp < B.max / 2 ? 0.6 : 1); } break;
  }
  // contact
  for (const p of alive()) if (Math.abs(p.x - B.x) < 90 && p.y > GROUND - 200) kill(p);
  if (S.veh.rider && Math.abs(S.veh.x - B.x) < 140) hurtVehicle();
}
function hurtBoss(dmg, by) {
  const B = S.boss; if (!B || B.dead || B.st === 'intro') return;
  B.hp -= dmg * (B.st === 'tired' ? 1.6 : 1); B.flash = 0.04;
  if (by && by.score !== undefined) by.score += Math.round(dmg * 20);
  if (B.hp <= 0) { B.hp = 0; B.dead = true; B.t = 0; B.st = 'down'; for (let i = 0; i < 6; i++) setTimeout(() => S && boom(B.x + rand(-80, 80), B.y - rand(40, 240), 1.2), i * 300); pop(B.x, B.y - 300, 'GLADIATORE SCONFITTO!', '#ffd35a', 1); }
}

/* ---------------- projectiles, bombs, items ---------------- */
function stepShots(dt) {
  for (const s of S.shots) {
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.w === 'F') { s.vx *= 0.94; s.vy *= 0.94; }
    if (s.y > GROUND + 10 || s.x < S.cam - 60 || s.x > S.cam + W + 60) s.life = 0;
    const r = s.w === 'F' ? 44 : s.w === 'L' ? 50 : s.w === 'R' ? 26 : 14;
    const hitAt = () => { if (s.w === 'R' || s.w === 'L') { boom(s.x, s.y, s.w === 'L' ? 1 : 0.7); for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - s.x) < 90 && Math.abs(e.y - 70 - s.y) < 110) hurtEnemy(e, s.dmg * 0.6, s.by); } };
    for (const e of S.enemies) {
      if (e.hp <= 0 || s.life <= 0) continue;
      const ey = e.fly ? e.y : e.y - (e.type === 'bruto' ? 110 : 75), eh = e.fly ? 40 : e.type === 'bruto' ? 110 : 70, ew = e.type === 'bruto' ? 60 : 36;
      if (Math.abs(s.x - e.x) < ew + r && Math.abs(s.y - ey) < eh + r * 0.5) { hurtEnemy(e, s.dmg, s.by); spark(s.x, s.y, WCOL[s.w] || '#fff', 4); if (s.w !== 'F') { s.life = 0; hitAt(); } else s.dmg *= 0.6; }
    }
    const B = S.boss;
    if (B && !B.dead && s.life > 0 && Math.abs(s.x - B.x) < 70 + r && s.y > B.y - 280 && s.y < B.y) { hurtBoss(s.dmg, s.by); spark(s.x, s.y, '#ffcf8a', 4); if (s.w !== 'F') { s.life = 0; hitAt(); } }
    for (const o of S.props) if (o.hp > 0 && s.life > 0 && Math.abs(s.x - o.x) < 40 + r && s.y > o.y - 90 && s.y < o.y) { hitProp(o, s.dmg, s.by); if (s.w !== 'F') s.life = 0; }
    for (const q of S.pris) if (q.st === 'tied' && s.life > 0 && Math.abs(s.x - q.x) < 40 && s.y > q.y - 110 && s.y < q.y) { freePris(q, s.by); s.life = 0; }
  }
  S.shots = S.shots.filter((s) => s.life > 0);
  for (const s of S.foeShots) {
    s.life -= dt; s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.k === 'shield') { s.spin += dt * 14; s.vx -= s.back * 700 * dt; if (S.boss && s.life < 2.2 && Math.abs(s.x - S.boss.x) < 60) s.life = 0; }
    if (s.y > GROUND && s.k !== 'shield') { s.life = 0; if (s.k === 'spear') spark(s.x, GROUND, '#c8d2dc', 4); }
    for (const p of alive()) if (p !== S.veh.rider && Math.abs(s.x - p.x) < 22 && s.y > p.y - (p.crouch ? 70 : 115) && s.y < p.y) { kill(p); s.life = 0; }
    if (S.veh.rider && s.life > 0 && Math.abs(s.x - S.veh.x) < 100 && s.y > S.veh.y - 210 && s.y < S.veh.y) { hurtVehicle(); s.life = 0; }
  }
  S.foeShots = S.foeShots.filter((s) => s.life > 0);
  for (const b of S.bombs) {
    b.vy += GRAV * 0.8 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += dt * 12;
    const fl = groundUnder(b.x, b.y - b.vy * dt, b.vy, false);
    const hitE = S.enemies.some((e) => e.hp > 0 && Math.abs(e.x - b.x) < 40 && Math.abs((e.fly ? e.y : e.y - 60) - b.y) < 60) || (S.boss && !S.boss.dead && Math.abs(S.boss.x - b.x) < 80 && b.y > S.boss.y - 260);
    if (b.y >= fl || hitE) {
      b.done = true; boom(b.x, b.y - 20, 1.1);
      for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - b.x) < 110 && Math.abs((e.fly ? e.y : e.y - 60) - b.y) < 130) hurtEnemy(e, 6, b.by);
      if (S.boss && Math.abs(S.boss.x - b.x) < 150) hurtBoss(8, b.by);
      for (const o of S.props) if (o.hp > 0 && Math.abs(o.x - b.x) < 110) hitProp(o, 6, b.by);
      for (const q of S.pris) if (q.st === 'tied' && Math.abs(q.x - b.x) < 100) freePris(q, b.by);
    }
  }
  S.bombs = S.bombs.filter((b) => !b.done);
  for (const it of S.items) {
    it.vy += GRAV * dt; it.y = Math.min(groundUnder(it.x, it.y, it.vy, false), it.y + it.vy * dt); if (it.y >= groundUnder(it.x, it.y - 1, 0, false)) it.vy = 0;
    for (const p of alive()) if (!it.got && Math.abs(p.x - it.x) < 50 && Math.abs(p.y - it.y) < 80) {
      it.got = true; Audio.sfx('pickup');
      if (it.k === 'bomb') { p.bombs += 5; pop(it.x, it.y - 90, 'GRANATE +5', '#ffd35a'); }
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
  for (const p of S.players) stepPlayer(p, inputOf(p.dev), dt);
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
    if (Wv.lock) S.lock = S.cam;
    S.wave++;
  }
  if (S.lock !== null && !S.boss && S.enemies.every((e) => e.hp <= 0)) { S.lock = null; pop(S.cam + W - 160, 200, 'AVANTI! >>', '#ffd35a', 1); }
  if (!S.boss && S.cam >= ARENA_X - 4) { S.lock = ARENA_X; startBoss(); }
  for (const e of S.enemies) stepEnemy(e, dt);
  S.enemies = S.enemies.filter((e) => !(e.st === 'dead' && e.t > 1.2) && e.x > S.cam - 400);
  stepBoss(dt);
  stepShots(dt);
  for (const q of S.pris) { q.t += dt; if (q.st === 'free') q.x += 170 * dt * (q.t > 0.8 ? 1 : 0); }
  for (const f of S.fx) { f.t += dt; if (f.k === 'sp') { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; } if (f.k === 'wave') { f.x += f.dir * 520 * dt; for (const p of alive()) if (p.y >= GROUND - 2 && Math.abs(p.x - f.x) < 30) kill(p); } }
  S.fx = S.fx.filter((f) => f.t < (f.k === 'sp' ? f.life : f.k === 'wave' ? 1.6 : f.k === 'ring' ? 0.6 : 0.6));
  for (const p of S.pops) p.t += dt;
  S.pops = S.pops.filter((p) => p.t < (p.big ? 1.4 : 0.8));
  for (const o of S.props) o.shake = Math.max(0, (o.shake || 0) - dt);
  if (S.win) { S.winT += dt; if (S.winT > 6) mode = 'end'; }
  if (S.overT !== undefined) { S.overT -= dt; if (S.overT <= 0 && S.players.every((p) => p.out)) mode = 'over'; }
}

/* ---------------- drawing ---------------- */
function drawBack() {
  const img = IMG.roma;
  if (img) {
    const s = H / img.height, w = img.width * s, off = (S.cam * 0.35) % w;
    for (let x = -off; x < W; x += w) g.drawImage(img, x, 0, w, H);
  }
  g.fillStyle = 'rgba(8,6,14,.18)'; g.fillRect(0, 0, W, H);
  // the street of the background is the ground: just a shade where the feet go
  const gr = g.createLinearGradient(0, GROUND - 30, 0, H); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = gr; g.fillRect(0, GROUND - 30, W, H - GROUND + 30);
  // platforms: broken marble slabs on columns
  for (const [px, pw, py] of PLATFORMS) {
    const x = px - S.cam; if (x > W || x + pw < 0) continue;
    // two broken columns (fluted, lit from the torches) holding a slab of old marble
    for (const cx of [x + 20, x + pw - 50]) {
      const cg = g.createLinearGradient(cx, 0, cx + 30, 0); cg.addColorStop(0, '#6a5a4a'); cg.addColorStop(0.35, '#d8c4a0'); cg.addColorStop(1, '#4a3e34');
      g.fillStyle = cg; g.fillRect(cx, py + 20, 30, GROUND - py - 20);
      g.fillStyle = 'rgba(0,0,0,.22)'; for (let k = 6; k < 30; k += 8) g.fillRect(cx + k, py + 20, 2, GROUND - py - 20);
      g.fillStyle = '#b8a07e'; g.fillRect(cx - 6, py + 16, 42, 8); g.fillRect(cx - 6, GROUND - 10, 42, 10);
    }
    const sg = g.createLinearGradient(0, py, 0, py + 22); sg.addColorStop(0, '#f2e2c0'); sg.addColorStop(1, '#c8a878');
    g.fillStyle = sg; g.fillRect(x, py, pw, 22); g.lineWidth = 4; g.strokeStyle = '#2a1a10'; g.strokeRect(x, py, pw, 22);
    g.fillStyle = 'rgba(40,24,16,.5)'; for (let k = 30; k < pw; k += 70) g.fillRect(x + k, py + 4, 2, 16);   // cracks between the blocks
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 6, py + 22, pw - 12, 6);
  }
}
/* remo 0-1 guardia · 2-7 corsa · 8 salto · 9 spara · 10 spara in alto · 11 accovacciato · 12 bomba · 13 colpito · 14 a terra · 15 esulta
   rubber hose: squash when landing, stretch when jumping, a breathing bounce when still */
function heroFrame(p) {
  let f = Math.floor(T * 2.5) % 2, sy = 1, sx = 1;
  const shooting = p.cd > WEAPONS[p.w].rate - 0.1;
  if (p.dead) f = p.t < 0.4 ? 13 : 14;
  else if (p.bombT > 0) f = 12;
  else if (!p.onGround) { f = shooting ? (p.aim === 'u' ? 10 : 9) : 8; sy = p.vy < 0 ? 1.08 : 0.97; sx = 2 - sy; }
  else if (p.knife > 0) f = 9;
  else if (p.crouch) { f = 11; sy = 0.8; sx = 1.08; }
  else if (shooting) f = p.aim === 'u' ? 10 : 9;
  else if (p.run) f = 2 + Math.floor(p.run * 0.9) % 6;
  else sy = 1 + Math.sin(T * 5) * 0.02;
  if (p.land > 0 && !p.dead) { sy *= 0.84; sx *= 1.12; }
  if (S && S.win && !p.dead) f = 15;
  return [`remo_${f}`, sy, sx];
}
/* a little tin flying saucer, drawn in code in the style of the background */
function drawSaucer(x, y, flash, rot, firing) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineWidth = 4; g.strokeStyle = '#1a1010';
  g.fillStyle = flash ? '#ffffff' : '#bfe6f0'; g.beginPath(); g.ellipse(0, -14, 24, 22, 0, Math.PI, 0); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-8, -22, 6, 8, -0.4, 0, 7); g.fill();
  g.fillStyle = flash ? '#ffffff' : '#e8dcc0'; g.beginPath(); g.ellipse(0, -8, 62, 18, 0, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#c84a2a'; g.beginPath(); g.ellipse(0, -3, 44, 7, 0, 0, Math.PI); g.fill();
  for (let i = -2; i <= 2; i++) { g.fillStyle = Math.floor(T * 6 + i) % 2 ? '#ffd35a' : '#8a5a2a'; g.beginPath(); g.arc(i * 20, -8, 5, 0, 7); g.fill(); g.lineWidth = 2; g.stroke(); }
  if (firing) { g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(0, 14, 10, 0, 7); g.fill(); }
  g.restore();
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
function draw() {
  g.save();
  if (S.shake) g.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
  drawBack();
  g.translate(-Math.round(S.cam), 0);
  // props
  for (const o of S.props) if (o.hp > 0) { spr('items', o.k, o.x + (o.shake > 0 ? rand(-3, 3) : 0), o.y, { scale: 1.6 }); }
  // prisoners
  for (const q of S.pris) {
    if (q.st === 'tied') {
      spr('people', `${q.k}_idle${Math.floor(T * 2) % 2}`, q.x, q.y, { scale: 0.95 });
      g.strokeStyle = '#8a6a3a'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(q.x - 26, q.y - 60 - i * 18); g.lineTo(q.x + 26, q.y - 52 - i * 18); g.stroke(); }
      if (Math.floor(T * 2) % 2) ptxt('AIUTO!', q.x, q.y - 150, 9, '#ffffff', 'center');
    } else if (q.t < 3) spr('people', q.t < 0.8 ? `${q.k}_thank` : `${q.k}_run${Math.floor(q.t * 10) % 6}`, q.x, q.y, { scale: 0.95, alpha: q.t > 2.4 ? (3 - q.t) / 0.6 : 1 });
  }
  // items
  for (const it of S.items) {
    const b = Math.sin(T * 6) * 4;
    if (it.k === 'bomb') { g.fillStyle = '#3a4a2a'; g.beginPath(); g.arc(it.x, it.y - 22 + b, 16, 0, 7); g.fill(); ptxt('B', it.x, it.y - 16 + b, 12, '#ffd35a', 'center'); }
    else { g.fillStyle = '#10141c'; g.fillRect(it.x - 22, it.y - 48 + b, 44, 44); g.strokeStyle = WCOL[it.k]; g.lineWidth = 3; g.strokeRect(it.x - 22, it.y - 48 + b, 44, 44); ptitle(it.k, it.x, it.y - 14 + b, 24, '#ffffff', WCOL[it.k]); }
  }
  // the lion
  const V = S.veh;
  if (!V.wreck) {
    const f = V.rider ? (V.shotT > 0 ? 2 : V.st === 'walk' ? [0, 1][Math.floor(T * 4) % 2] : 0) : 7;
    if (!V.rider) {
      spr('titani', 'leone_7', V.x, V.y, { scale: 0.42, face: 1 });
      // big bouncing sign, like the arcades: SALI!
      const by = V.y - 230 + Math.abs(Math.sin(T * 5)) * -18;
      g.fillStyle = '#ffd35a'; g.fillRect(V.x - 58, by - 34, 116, 40); g.fillStyle = '#1a1020'; g.fillRect(V.x - 54, by - 30, 108, 32);
      ptitle('SALI!', V.x, by - 6, 20, '#ffffff', '#ff5b4f');
      g.fillStyle = '#ffd35a'; g.beginPath(); g.moveTo(V.x - 16, by + 10); g.lineTo(V.x + 16, by + 10); g.lineTo(V.x, by + 30); g.fill();
      if (alive().some((p) => Math.abs(p.x - V.x) < 220)) ptxt('SALTACI SOPRA O PREMI SU', V.x, by + 52, 9, '#ffe3a0', 'center');
    }
    else spr('titani', `leone_${f}`, V.x, V.y, { scale: 0.42, face: V.face, flash: V.flash > 0 && Math.floor(T * 20) % 2 ? 0.7 : 0 });
  } else spr('titani', 'leone_7', V.x, V.y, { scale: 0.42, alpha: 0.5 });
  // enemies
  for (const e of S.enemies) {
    const dead = e.st === 'dead';
    if (dead && e.t > 0.9 && Math.floor(T * 16) % 2) continue;
    if (e.type === 'drone') drawSaucer(e.x, e.y + (dead ? e.t * 200 : 0), e.flash > 0, dead ? e.t * 6 : Math.sin(T * 3) * 0.1, e.shotT > 0);
    else {
      // inv 0-2 cammina · 3 spara · 4 spara in alto · 5 colpito · 6 a terra · 7 scappa
      const big = e.type === 'bruto';
      const f = dead ? (e.t < 0.25 ? 5 : 6) : e.st === 'charge' ? 7 : e.st === 'atk' ? (e.up ? 4 : 3) : e.st === 'wind' ? 3 : [0, 1, 2, 1][Math.floor(e.walk) % 4];
      const key = `inv_${f}`, bob = e.st === 'walk' ? Math.abs(Math.sin(e.walk * 1.6)) * 4 : 0;
      spr('arte', key, e.x, e.y - bob, { scale: big ? 1.35 : 0.9, face: e.face, flash: e.flash > 0 ? 0.8 : 0, img: big && e.flash <= 0 ? tinted('arte', key, '#d8a020', 'source-atop', 0.38) : undefined });
    }
  }
  // boss
  const B = S.boss;
  if (B) {
    // glad 0 fermo · 1 passo · 2 carica · 3 tridente · 4 lancia lo scudo · 5 colpito · 6 semidistrutto · 7 crolla
    const hurt = B.hp < B.max * 0.35;
    const f = B.dead ? (B.t < 1.2 ? 6 : 7) : B.st === 'intro' ? 2 : B.st === 'walk' ? (hurt ? [6, 1] : [0, 1])[Math.floor(B.t * 3) % 2] : B.st === 'tired' ? 5 : B.t < 0.5 ? 2 : B.st === 'shield' ? 4 : 3;
    if (B.st === 'tired' && !B.dead) { g.save(); g.globalAlpha = 0.5 + Math.sin(T * 10) * 0.3; ptxt('* * *', B.x, B.y - 310, 16, '#fff1a6', 'center'); g.restore(); }
    spr('arte', `glad_${f}`, B.x, B.y + (B.st === 'walk' ? -Math.abs(Math.sin(B.t * 6)) * 6 : 0), { scale: 1.0, face: B.face, flash: B.flash > 0 ? 0.3 : 0, sy: B.st === 'slam' && B.t > 0.7 && B.t < 0.85 ? 0.9 : 1 });
  }
  // players
  for (const p of S.players) {
    if (p.out || p === V.rider) continue;
    if (p.inv > 0 && !p.dead && Math.floor(T * 16) % 2) continue;
    const [key, sy] = heroFrame(p);
    const sx = heroFrame(p)[2], R = ROSTER[p.hero];
    spr('arte', key, p.x, p.y, { scale: HERO_SC, sy, sx, face: p.face, img: R.tint ? tinted('arte', key, R.tint, 'source-atop', 0.3) : undefined });
    // aim marker: gun flash up / down
    if (!p.dead && p.cd > WEAPONS[p.w].rate - 0.06 && p.aim !== 'f') { const [mx, my] = muzzle(p); g.fillStyle = '#fff1a6'; g.beginPath(); g.arc(mx, my, 9, 0, 7); g.fill(); }
    ptxt(`${p.slot + 1}P`, p.x, p.y - 150, 9, ROSTER[p.hero].color, 'center');
  }
  if (V.rider) ptxt(`${V.rider.slot + 1}P`, V.x, V.y - 220, 9, ROSTER[V.rider.hero].color, 'center');
  // shots
  for (const s of S.shots) {
    if (s.w === 'F') { const k = 1 - s.life / 0.38; g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = `rgba(255,${160 - k * 100},40,${0.8 - k * 0.6})`; g.beginPath(); g.arc(s.x, s.y, 14 + k * 30, 0, 7); g.fill(); g.restore(); }
    else if (s.w === 'R' || s.w === 'L') { g.fillStyle = s.w === 'L' ? '#ffcf5a' : '#ff5b8a'; g.beginPath(); g.arc(s.x, s.y, s.w === 'L' ? 16 : 9, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,120,.5)'; g.fillRect(s.x - Math.sign(s.vx) * 30, s.y - 3, Math.sign(s.vx) * 24, 6); }
    else { g.fillStyle = WCOL[s.w]; if (s.vy && !s.vx) g.fillRect(s.x - 2, s.y - 9, 4, 18); else g.fillRect(s.x - 9, s.y - 2, 18, 4); }
  }
  for (const s of S.foeShots) {
    if (s.k === 'shield') { g.save(); g.translate(s.x, s.y); g.scale(Math.cos(s.spin) * 0.5 + 0.6, 1); g.lineWidth = 5; g.strokeStyle = '#2a1a10'; for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#e8d6b4' : '#b8402a'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 44, i * Math.PI / 4, (i + 1) * Math.PI / 4); g.fill(); } g.beginPath(); g.arc(0, 0, 44, 0, 7); g.stroke(); g.fillStyle = '#d8a020'; g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fill(); g.stroke(); g.restore(); }
    else if (s.k === 'spear') { const a = Math.atan2(s.vy, s.vx); g.save(); g.translate(s.x, s.y); g.rotate(a); g.fillStyle = '#c8d2dc'; g.fillRect(-26, -2, 44, 4); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(18, -6); g.lineTo(30, 0); g.lineTo(18, 6); g.fill(); g.restore(); }
    else { g.lineWidth = 3; g.strokeStyle = '#1a1010'; g.fillStyle = '#ffd35a'; g.beginPath(); g.ellipse(s.x, s.y, 13, 7, Math.atan2(s.vy, s.vx), 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x, s.y, 3, 0, 7); g.fill(); }
  }
  for (const b of S.bombs) { g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.fillStyle = '#3a4a2a'; g.fillRect(-8, -10, 16, 20); g.fillStyle = '#c8d2dc'; g.fillRect(-3, -14, 6, 5); g.restore(); }
  // effects
  for (const f of S.fx) {
    if (f.k === 'boom') { const k = f.t / 0.6, r = (20 + k * 90) * f.r; g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1 - k; g.fillStyle = '#ffdb7a'; g.beginPath(); g.arc(f.x, f.y, r * 0.6, 0, 7); g.fill(); g.fillStyle = '#ff7a2a'; g.beginPath(); g.arc(f.x, f.y, r, 0, 7); g.fill(); g.restore(); }
    else if (f.k === 'sp') { g.fillStyle = f.c; g.globalAlpha = 1 - f.t / f.life; g.fillRect(f.x - 3, f.y - 3, 6, 6); g.globalAlpha = 1; }
    else if (f.k === 'wave') { g.fillStyle = '#ff9a5a'; g.globalAlpha = 0.8; g.beginPath(); g.ellipse(f.x, GROUND, 34, 40, 0, Math.PI, 0); g.fill(); g.globalAlpha = 1; }
    else if (f.k === 'ring') { const k = f.t / 0.6; g.strokeStyle = `rgba(255,120,90,${1 - k})`; g.lineWidth = 8; g.beginPath(); g.ellipse(f.x, f.y, 60 + k * 400, 20 + k * 120, 0, 0, 7); g.stroke(); }
  }
  for (const p of S.pops) { const k = p.t / (p.big ? 1.4 : 0.8); g.globalAlpha = 1 - k * k; ptitle(p.s, p.x, p.y - k * 50, p.big ? 18 : 13, '#ffffff', p.c); g.globalAlpha = 1; }
  g.restore();
  drawHUD();
  drawFilm();
}
function drawHUD() {
  S.players.forEach((p, i) => {
    const x = i ? W - 300 : 20, col = ROSTER[p.hero].color;
    panel(x, 12, 280, 70, col);
    ptxt(`${i + 1}P ${ROSTER[p.hero].name}`, x + 14, 36, 11, col);
    ptxt(String(p.score).padStart(7, '0'), x + 266, 36, 11, '#ffd27a', 'right');
    if (p.out) { if (Math.floor(T * 2) % 2) ptxt('FUOCO PER CONTINUARE', x + 14, 64, 9, '#ffe3a0'); return; }
    const w = S.veh.rider === p ? null : p.w;
    ptitle(w || 'L', x + 30, 72, 20, '#ffffff', w ? WCOL[w] : '#ff5b4f');
    ptxt(w ? (p.ammo === Infinity ? 'INFINITI' : String(p.ammo)) : `LEONE ${Math.max(0, S.veh.hp)}/10`, x + 54, 68, 10, '#e8eef4');
    ptxt(`B ${p.bombs}`, x + 170, 68, 10, '#ffd35a');
    for (let k = 0; k < p.lives; k++) { g.fillStyle = col; g.fillRect(x + 230 + k * 14, 58, 10, 10); }
  });
  if (S.lock !== null && !S.boss) ptxt('SGOMBERA LA ZONA!', W / 2, 30, 10, '#ff8a7a', 'center');
  if (S.hintT > 0 && S.veh.rider) { panel(W / 2 - 300, 96, 600, 40, '#ff5b4f'); ptxt('FUOCO: CANNONE · GRANATA: RUGGITO · GIÙ + SALTO: SCENDI', W / 2, 122, 10, '#ffffff', 'center'); }
  if (S.t < 4) { const k = clamp(Math.min(S.t - 0.3, 4 - S.t) * 3, 0, 1); g.globalAlpha = k; ptitle('VIA!', W / 2, 420, 60, '#ffffff', '#ff5b4f'); g.globalAlpha = 1; }
  const B = S.boss;
  if (B && !B.dead) { panel(W / 2 - 260, H - 60, 520, 44, '#ffc052'); ptxt('IL GLADIATORE D\'ACCIAIO', W / 2 - 244, H - 40, 9, '#ffe0a0'); bar(W / 2 - 244, H - 32, 488, 10, B.hp / B.max, '#ff6a4a'); }
  if (S.banner) { const k = clamp(Math.min(S.banner.t, 3 - S.banner.t) * 2, 0, 1); g.globalAlpha = k; ptitle(S.banner.a, W / 2, 300, 40, '#fff6d6', '#ff6a3a'); ptxt(S.banner.b, W / 2, 344, 12, '#e8eef4', 'center'); g.globalAlpha = 1; }
  if (S.win) { ptitle('MISSIONE COMPLETATA!', W / 2, 300, 44, '#fff6d6', '#7bf0b1'); S.players.forEach((p, i) => ptxt(`${ROSTER[p.hero].name}  ${p.score} PUNTI · ${p.kills} NEMICI · ${p.freed} PRIGIONIERI`, W / 2, 360 + i * 30, 11, ROSTER[p.hero].color, 'center')); }
  ptxt('PROVA DI STILE', W - 16, H - 10, 7, '#56687a', 'right');
}

/* ---------------- title and character select ---------------- */
function tickTitle() {
  for (const d of DEVICES) {
    const c = inputOf(d);
    if (mode === 'title' && (c.pressed.fire || c.pressed.start || c.pressed.jump)) { mode = 'select'; sel = { slots: [{ dev: d, hero: 0, ready: false }] }; Audio.sfx('confirm'); return; }
    if (mode === 'select') {
      let s = sel.slots.find((q) => q.dev === d);
      if (!s && sel.slots.length < 2 && (c.pressed.fire || c.pressed.jump)) { sel.slots.push({ dev: d, hero: 1, ready: false }); Audio.sfx('confirm'); continue; }
      if (!s) continue;
      if (!s.ready) {
        if (c.pressed.l) { s.hero = (s.hero + 1) % ROSTER.length; Audio.sfx('select'); }
        if (c.pressed.r) { s.hero = (s.hero + 1) % ROSTER.length; Audio.sfx('select'); }
        if (c.pressed.fire || c.pressed.jump) { s.ready = true; Audio.sfx('confirm'); }
      } else if (c.pressed.bomb) s.ready = false;
      if ((c.pressed.start) && sel.slots.every((q) => q.ready)) { newGame(sel.slots); mode = 'play'; return; }
    }
  }
  if (mode === 'select' && sel.slots.length && sel.slots.every((q) => q.ready) && !sel.go) sel.go = T;
  if (mode === 'select' && sel.go && T - sel.go > 1.2) { newGame(sel.slots); mode = 'play'; }
  if (mode === 'select' && sel.go && !sel.slots.every((q) => q.ready)) sel.go = null;
}
function drawTitle() {
  const img = IMG.roma;
  if (img) { const s = H / img.height; g.drawImage(img, -((T * 20) % (img.width * s - W)), 0, img.width * s, H); }
  g.fillStyle = 'rgba(4,6,14,.55)'; g.fillRect(0, 0, W, H);
  ptitle('STIVALE', W / 2, 250, 84, '#fff6d6', '#e8483a');
  ptxt('TITOLO PROVVISORIO · PROVA DI STILE · 1-2 GIOCATORI', W / 2, 300, 11, '#f2e2c0', 'center');
  spr('arte', `remo_${mode === 'title' ? 15 : 0}`, W / 2, 470, { scale: 1.2, sy: 1 + Math.sin(T * 5) * 0.03 });
  if (mode === 'title') {
    if (Math.floor(T * 2) % 2) ptxt('PREMI FUOCO PER INIZIARE', W / 2, 500, 14, '#ffe3a0', 'center');
    ptxt('1P: FRECCE · J FUOCO · K SALTO · L GRANATA    2P: WASD · F FUOCO · G SALTO · H GRANATA    PAD: X FUOCO · A SALTO · B GRANATA', W / 2, 660, 8, '#9fb4c8', 'center');
    ptxt('SU + FUOCO: SPARA IN ALTO · IN ARIA GIÙ + FUOCO: SPARA IN BASSO · GIÙ: ACCOVACCIATI · SALTA SUL LEONE PER SALIRCI', W / 2, 684, 8, '#9fb4c8', 'center');
    return;
  }
  // select
  sel.slots.forEach((s, i) => {
    const x = i ? 900 : 380, h = ROSTER[s.hero];
    panel(x - 170, 440, 340, 250, h.color);
    spr('arte', `remo_${s.ready ? 15 : Math.floor(T * 2.5) % 2}`, x, 660, { scale: 1.2, img: h.tint ? tinted('arte', `remo_${s.ready ? 15 : Math.floor(T * 2.5) % 2}`, h.tint, 'source-atop', 0.3) : undefined });
    ptitle(`◀ ${h.name} ▶`, x, 480, 22, '#ffffff', h.color);
    ptxt(s.ready ? 'PRONTO!' : 'FUOCO: CONFERMA', x, 684, 9, s.ready ? '#7bf0b1' : '#ffe3a0', 'center');
  });
  if (sel.slots.length < 2) ptxt('2P: PREMI FUOCO PER ENTRARE', 900, 560, 11, '#9fb4c8', 'center');
}
function drawEnd(win) {
  g.fillStyle = '#04070f'; g.fillRect(0, 0, W, H);
  ptitle(win ? 'FINE DELLA PROVA' : 'GAME OVER', W / 2, 260, 44, '#fff6d6', win ? '#7bf0b1' : '#ff4a3a');
  ptxt(win ? 'IL LIVELLO DI PROVA È FINITO. RACCONTAMI COM\'È ANDATA!' : 'I SOLDATI DI FERREA HANNO VINTO... PER STAVOLTA', W / 2, 320, 12, '#c8d6e4', 'center');
  if (S) S.players.forEach((p, i) => ptxt(`${ROSTER[p.hero].name}  ${p.score} PUNTI · ${p.kills} NEMICI · ${p.freed} PRIGIONIERI`, W / 2, 390 + i * 30, 11, ROSTER[p.hero].color, 'center'));
  if (Math.floor(T * 2) % 2) ptxt('PREMI FUOCO PER RICOMINCIARE', W / 2, 520, 12, '#ffe3a0', 'center');
  for (const d of DEVICES) { const c = inputOf(d); if (c.pressed.fire || c.pressed.start) { mode = 'title'; S = null; } }
}

/* ---------------- main loop ---------------- */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; T += dt;
  Audio.update && Audio.update();
  if (mode === 'play') {
    acc += dt;
    while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60; }
    draw();
  } else if (mode === 'title' || mode === 'select') { tickTitle(); drawTitle(); drawFilm(); }
  else { drawEnd(mode === 'end'); drawFilm(); }
  requestAnimationFrame(frame);
}
window.Stivale = window.Assalto = { get S() { return S; }, get mode() { return mode; }, newGame, step, spawnEnemy, setMode: (m) => { mode = m; } };
(async function boot() {
  try { if (window.loadFonts) await window.loadFonts(); } catch (e) {}
  await loadImages([['arte', 'assets/sprites/arte.png'], ['items', 'assets/sprites/items.png'], ['people', 'assets/sprites/people.png'], ['titani', 'assets/sprites/titani.webp'], ['roma', 'assets/bg/roma.jpg']]).catch((e) => console.error('immagine mancante', e));
  document.querySelector('#loading') && document.querySelector('#loading').remove();
  requestAnimationFrame(frame);
})();
