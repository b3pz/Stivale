'use strict';
/* ============================================================
   TAPPE SPECIALI — tre livelli diversi da tutti gli altri, tra una missione e l'altra:
   - dopo Torino:  LA MOLE ANTONELLIANA — salita in verticale, la Catena di Montaggio risale dal basso
   - dopo Genova:  SOTT'ACQUA NEL GOLFO — si nuota, mine e pesci di latta, il Sottomarino degli Abissi
   - dopo lo Stretto: IN VOLO VERSO L'ETNA — Vespa volante vista da dietro, dischi, scogli e la Nave Madre
   Le parti disegnate si possono sostituire con tavole vere (vedi il kit): finché mancano, le disegna il gioco.
   ============================================================ */
let SP = null;
const SPECIAL_AFTER = { 3: 'salita', 4: 'mare', 6: 'volo' };
const SP_TITLE = { salita: ['LA MOLE ANTONELLIANA', 'SALI PIU IN FRETTA CHE PUOI: LA CATENA TI INSEGUE!'], mare: ['SOTT\'ACQUA NEL GOLFO', 'SU/GIU/SINISTRA/DESTRA: NUOTA · SALTO: SCATTO · GRANATA: SILURO'], volo: ['IN VOLO VERSO L\'ETNA', 'MUOVI LA VESPA · SPARA AI DISCHI · EVITA GLI SCOGLI'] };
const spRand = (() => { let s = 1; return { seed(v) { s = v; }, n() { s = (s * 16807) % 2147483647; return s / 2147483647; } }; })();
const srand = (a, b) => a + spRand.n() * (b - a);

/* ---------- shared: players, damage, heroes ---------- */
const SPF = (k) => (IMG.sp && window.ATLAS.sp && window.ATLAS.sp[k]) || null;
function spx(k, x, y, w, opt = {}) { const f = SPF(k); if (!f) return false; spr('sp', k, x, y, { ...opt, scale: w / f[2] * (opt.k || 1) }); return true; }
function spPlayers() { return S.players.filter((p) => !p.out); }
function spHurt(q) {
  const p = q.p;
  if (q.inv > 0 || p.out || SP.won) return;
  S.hurts = (S.hurts || 0) + 1; freeze(0.06); q.hurtT = 0.8;
  if ((p.hp ?? 1) > 1) { p.hp--; q.inv = 1.6; Audio.sfx('hurt'); pop(q.x + (SP.cam || 0), q.y - 150 + (SP.kind === 'salita' ? SP.cy : 0), 'AHIA!', '#ff8a7a'); return; }
  p.lives--; Audio.sfx('ko'); spark(q.x + (SP.cam || 0), q.y - 60 + (SP.kind === 'salita' ? SP.cy : 0), ROSTER[p.hero].color, 14);
  if (p.lives <= 0) { p.out = true; q.dead = true; if (S.players.every((x) => x.out)) { SP.over = 2; } return; }
  p.hp = DK().hp; q.inv = 2.5; q.respawn = true;
}
function spHero(q, x, y, f, opt = {}) {
  const R = ROSTER[q.p.hero];
  if (q.inv > 0 && Math.floor(T * 16) % 2) return;
  spr('arte', `${R.id}_${f}`, x, y, { scale: HERO_SC, face: q.face, ...opt });
}
function spFrame(q) {
  const F = ROSTER[q.p.hero].F;
  if (!q.ground) return q.cd > 0.1 ? (q.aimUp ? F.u : F.s) : F.j;
  if (q.cd > 0.1) return q.aimUp ? F.u : F.s;
  if (Math.abs(q.vx) > 10) return F.r[Math.floor(T * 10) % F.r.length];
  return F.i[Math.floor(T * 2.5) % 2];
}
function spEnd(win) {
  if (win) { SP.won = true; SP.wonT = 0; Audio.sfx('team'); for (const p of S.players) if (!p.out) p.score += 5000; }
}
function spHUD() {
  S.players.forEach((p, i) => { if (FXF('ui_0')) hudFx(p, i); });
  ptxt(SP_TITLE[SP.kind][0], W / 2, 30, 9, '#f2e2c0', 'center');
  if (SP.t < 3.5) { const k = clamp(Math.min(SP.t, 3.5 - SP.t) * 2, 0, 1); g.globalAlpha = k; fxBox('ui_5', W / 2 - 420, 210, 840, 150); ptitle(SP_TITLE[SP.kind][0], W / 2, 290, 28, '#fff6d6', '#ff6a3a'); ptxt(SP_TITLE[SP.kind][1], W / 2, 390, 11, '#ffffff', 'center'); g.globalAlpha = 1; }
  if (SP.won) ptitle('BEN FATTO!', W / 2, 330, 50, '#fff6d6', '#7bf0b1');
  if (SP.boss && !SP.boss.dead) { fxBox('ui_1', W / 2 - 270, H - 70, 540, 60); bar(W / 2 - 200, H - 47, 400, 14, SP.boss.hp / SP.boss.max, '#ff6a4a', '#2a1a10'); ptxt(SP.boss.name, W / 2, H - 76, 10, '#ffe0a0', 'center'); }
}
function startSpecial(kind, then) {
  spRand.seed(1234 + MI * 77);
  SP = { kind, t: 0, then, pl: spPlayers().map((p, i) => ({ p, x: 300 + i * 120, y: 0, vx: 0, vy: 0, face: 1, cd: 0, inv: 2, ground: false, dbl: false })), foes: [], shots: [], fshots: [], items: [], fx: [], won: false, over: 0 };
  S.fx = []; S.pops = [];
  ({ salita: initSalita, mare: initMare, volo: initVolo })[kind]();
  mode = 'speciale'; Audio.playSong(0, kind === 'volo' ? 'boss' : kind === 'mare' ? 'venezia' : 'torino');
}
let spLast = 0, spAcc = 0;
function tickSpecial() {
  const now = performance.now(); spAcc += Math.min(0.05, spLast ? (now - spLast) / 1000 : 1 / 60); spLast = now;
  while (spAcc >= 1 / 60 && SP && mode === 'speciale') { stepSpecial(1 / 60); spAcc -= 1 / 60; }
  if (spAcc > 1 / 60) spAcc = 0;
}
function stepSpecial(dt) {
  if (S.freeze > 0) { S.freeze -= dt; return; }
  SP.t += dt; onoCd -= dt;
  if (SP.endT > 0 && (SP.endT -= dt) <= 0) spEnd(true);
  for (const q of SP.pl) { q.inv = Math.max(0, q.inv - dt); q.cd = Math.max(0, q.cd - dt); q.hurtT = Math.max(0, (q.hurtT || 0) - dt); }
  ({ salita: stepSalita, mare: stepMare, volo: stepVolo })[SP.kind](dt);
  for (const f of S.fx) f.t += dt;
  S.fx = S.fx.filter((f) => f.t < ({ sp: f.life, hit: 0.15, smoke: 0.7, ono: 0.75, boom: 0.6 }[f.k] || 0.6));
  for (const f of S.fx) if (f.k === 'sp') { f.vy += 900 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
  for (const p of S.pops) p.t += dt;
  S.pops = S.pops.filter((p) => p.t < (p.big ? 1.4 : 0.8));
  S.shake = Math.max(0, (S.shake || 0) - dt * 30);
  if (SP.won) { SP.wonT += dt; if (SP.wonT > 3 && !IRIS) { const f = SP.then; irisTo(() => { SP = null; mode = 'play'; f(); }); } }
  if (SP.over) { SP.over -= dt; if (SP.over <= 0) { SP = null; finishRun('over'); } }
}
function drawSpecial() {
  g.save(); if (S.shake) g.translate(rand(-1, 1) * S.shake, rand(-1, 1) * S.shake);
  ({ salita: drawSalita, mare: drawMare, volo: drawVolo })[SP.kind]();
  g.restore();
  spHUD();
}
function spFx(ox, oy) {   // effects and pops in world space shifted by (ox, oy)
  g.save(); g.translate(-ox, -oy);
  for (const f of S.fx) {
    if (f.k === 'boom') { const k = f.t / 0.6; if (!fxs(`ef_${Math.min(3, Math.floor(k * 4))}`, f.x, f.y, 150 * f.r * (0.8 + k * 0.5), { alpha: k > 0.75 ? (1 - k) * 4 : 1 })) { g.fillStyle = '#ff9a3a'; g.beginPath(); g.arc(f.x, f.y, 40 * f.r, 0, 7); g.fill(); } }
    else if (f.k === 'sp') { g.fillStyle = f.c; g.globalAlpha = 1 - f.t / f.life; g.fillRect(f.x - 3, f.y - 3, 6, 6); g.globalAlpha = 1; }
    else if (f.k === 'hit') fxs('he_7', f.x, f.y, 40);
    else if (f.k === 'ono') drawOno(f);
    else if (f.k === 'smoke') fxs('ef_4', f.x, f.y, 100, { alpha: 1 - f.t / 0.7 });
  }
  for (const p of S.pops) { const k = p.t / (p.big ? 1.4 : 0.8); g.globalAlpha = 1 - k * k; ptitle(p.s, p.x, p.y - k * 50, p.big ? 18 : 13, '#ffffff', p.c); g.globalAlpha = 1; }
  g.restore();
}
function spShoot(q, x, y, vx, vy) {
  const W0 = WEAPONS[q.p.w] || WEAPONS.P, R = ROSTER[q.p.hero];
  q.cd = Math.max(0.12, W0.rate);
  const make = (a) => SP.shots.push({ x, y, vx: vx * Math.cos(a) - vy * Math.sin(a), vy: vx * Math.sin(a) + vy * Math.cos(a), life: 1.2, dmg: W0.dmg * R.dmg, w: q.p.w, by: q.p });
  if (q.p.w === 'S') [-0.2, 0, 0.2].forEach(make); else make(0);
  if (q.p.ammo !== Infinity && --q.p.ammo <= 0) { q.p.w = 'P'; q.p.ammo = Infinity; }
  Audio.sfx('shot');
}
function spDrawShots(list) {
  for (const s of list) {
    const k = s.w === 'L' ? 'he_5' : s.w === 'R' ? 'he_4' : s.w === 'H' ? 'he_1' : s.w === 'S' ? 'he_2' : s.w === 'F' ? 'he_3' : 'he_0';
    if (!fxShot(k, s, s.w === 'R' ? 70 : 44, 1)) { g.fillStyle = '#ffd35a'; g.fillRect(s.x - 8, s.y - 3, 16, 6); }
  }
}
function spKillFoe(e, by, pts) { e.dead = true; if (by) by.score += pts; boom(e.x, e.y, e.big ? 1.6 : 0.8); if (Math.random() < 0.18) SP.items.push({ x: e.x, y: e.y, k: Math.random() < 0.5 ? 'cibo' : pick(['H', 'S', 'F', 'R']), c: Math.floor(Math.random() * 8), vy: -200 }); }
function spItems(dt, grav, floorOf) {
  for (const it of SP.items) {
    it.vy = (it.vy || 0) + grav * dt; it.y += it.vy * dt;
    const fl = floorOf(it); if (it.y > fl) { it.y = fl; it.vy = 0; }
    for (const q of SP.pl) if (!q.dead && !it.got && Math.abs(q.x - it.x) < 50 && Math.abs(q.y - it.y) < 90) {
      it.got = true;
      if (it.k === 'cibo') EX.eat(q.p, it); else { q.p.w = it.k; q.p.ammo = WEAPONS[it.k].ammo; pop(it.x, it.y - 90, WEAPONS[it.k].name + '!', WCOL[it.k], 1); Audio.sfx('reload'); }
    }
  }
  SP.items = SP.items.filter((it) => !it.got);
}
function spDrawItems() {
  for (const it of SP.items) {
    const b = Math.sin(T * 6) * 4;
    if (it.k === 'cibo') EX.drawFood(it, b);
    else if (!fxs(`obj_${'HSFR'.indexOf(it.k)}`, it.x, it.y + b, 70)) ptitle(it.k, it.x, it.y - 20, 24, '#ffffff', WCOL[it.k]);
  }
}

/* =====================================================================
   1) LA MOLE — vertical climb. World y grows downwards; the ground is y=0, the top is -TOP.
   ===================================================================== */
const TOP = 8400, STEP = 185;
function initSalita() {
  SP.cy = -H + 60; SP.plats = [[0, 0, W]];   // [y, x, width]
  let prev = [[W / 2 - 150, 300]];
  for (let y = -STEP; y > -TOP + 60; y -= STEP) {
    const row = [], n = spRand.n() < 0.45 ? 2 : 1;
    const anchor = prev[Math.floor(spRand.n() * prev.length)];
    const c = clamp(anchor[0] + anchor[1] / 2 + srand(-260, 260), 180, W - 180), w = srand(200, 300);
    row.push([c - w / 2, w]);
    if (n === 2) { const c2 = c < W / 2 ? clamp(c + srand(380, 560), 180, W - 180) : clamp(c - srand(380, 560), 180, W - 180), w2 = srand(180, 260); row.push([c2 - w2 / 2, w2]); }
    for (const [x, w0] of row) SP.plats.push([y, x, w0]);
    if (spRand.n() < 0.22) { const [x, w0] = row[0]; SP.items.push({ x: x + w0 / 2, y, k: spRand.n() < 0.6 ? 'cibo' : pick(['H', 'S', 'F']), c: Math.floor(spRand.n() * 8), vy: 0 }); }
    prev = row;
  }
  SP.plats.push([-TOP, 200, W - 400]);
  SP.pl.forEach((q, i) => { q.x = W / 2 - 60 + i * 120; q.y = 0; });
  SP.gy = 300; SP.gv = 50; SP.spawn = 3;
}
function spPlatUnder(x, yPrev, y, drop) {
  let best = null;
  for (const [py, px, pw] of SP.plats) if (x > px && x < px + pw && yPrev <= py + 2 && y >= py && (!drop || py === 0 || py === -TOP)) if (best === null || py < best) best = py;
  return best;
}
function stepSalita(dt) {
  const top = Math.min(...SP.pl.filter((q) => !q.dead).map((q) => q.y).concat([0]));
  // camera: follows the highest player, and after the start it creeps up on its own
  const want = Math.min(SP.cy - (SP.t > 3 && !SP.won ? 28 + SP.t * 0.4 : 0) * dt, top - 380);
  SP.cy += (Math.max(want, -TOP - 200) - SP.cy) * Math.min(1, dt * 4);
  // the Catena rises from below, faster and faster, never too far behind the screen
  if (!SP.won && SP.t > 2.5) { SP.gv = Math.min(95 + SAVE.diff * 15, 40 + SP.t * 0.8); SP.gy = Math.min(SP.gy - SP.gv * dt, SP.cy + H - 50); }
  for (const q of SP.pl) {
    if (q.dead) continue;
    const c = inputOf(q.p.dev), R = ROSTER[q.p.hero];
    if (q.respawn) {   // back on the highest platform on screen
      q.respawn = false;
      const P = SP.plats.filter((P) => P[0] > SP.cy + 120 && P[0] < SP.cy + H - 160).sort((a, b) => a[0] - b[0])[0] || SP.plats[0];
      q.x = P[1] + P[2] / 2; q.y = P[0] - 200; q.vy = 0;
    }
    const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0); if (dx) q.face = dx;
    q.vx = dx * RUN * R.run * (q.p.perk === 'torino' ? 1.3 : 1);
    q.x = clamp(q.x + q.vx * dt, 30, W - 30);
    if (c.pressed.jump) {
      if (q.ground && c.d) { q.drop = 0.25; q.ground = false; q.y += 4; }
      else if (q.ground) { q.vy = -JUMP_V * R.jump; q.ground = false; q.dbl = false; Audio.sfx('jump'); }
      else if (R.dbl && !q.dbl) { q.dbl = true; q.vy = -JUMP_V * 0.82; Audio.sfx('jump'); }
    }
    q.drop = Math.max(0, (q.drop || 0) - dt);
    const yPrev = q.y; q.vy += GRAV * dt; q.y += q.vy * dt;
    q.ground = false;
    if (q.vy >= 0) { const fl = spPlatUnder(q.x, yPrev, q.y, q.drop > 0); if (fl !== null) { q.y = fl; q.vy = 0; q.ground = true; q.dbl = false; } }
    q.aimUp = !!c.u;
    if (c.fire && q.cd <= 0) q.aimUp ? spShoot(q, q.x, q.y - 150, 0, -1100) : spShoot(q, q.x + q.face * 70, q.y - 88, q.face * 1100, 0);
    if (q.y > SP.gy - 30 || q.y > SP.cy + H + 80) { spHurt(q); if (!q.dead) q.respawn = true; }
    if (q.y <= -TOP + 2 && q.ground && !SP.won) { spEnd(true); pop(q.x, q.y - 200, 'IN CIMA ALLA MOLE!', '#ffd35a', 1); }
  }
  // enemies: saucers from the sides, wind-up robots on the platforms above
  SP.spawn -= dt;
  if (SP.spawn <= 0 && !SP.won && SP.foes.length < 3 + SAVE.diff) {
    SP.spawn = 2.4 - SAVE.diff * 0.4;
    if (Math.random() < 0.5) { const L = Math.random() < 0.5; SP.foes.push({ k: 'disco', x: L ? -60 : W + 60, y: SP.cy + rand(140, 360), vx: L ? 150 : -150, hp: 3, cd: rand(1, 2) }); }
    else { const P = pick(SP.plats.filter((P) => P[0] < SP.cy + 180 && P[0] > SP.cy - 200 && P[2] > 150)); if (P) SP.foes.push({ k: 'robo', x: P[1] + P[2] / 2, y: P[0], plat: P, vx: 60, hp: 2, cd: rand(1, 2), face: 1 }); }
  }
  const tgt = (e) => SP.pl.filter((q) => !q.dead).sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y))[0];
  for (const e of SP.foes) {
    const P = tgt(e); e.cd -= dt;
    if (e.k === 'disco') { e.x += e.vx * dt; if (e.x < 60 || e.x > W - 60) e.vx *= -1; e.y += Math.sin(SP.t * 2 + e.x) * 20 * dt; if (P && e.cd <= 0) { e.cd = rand(1.6, 2.6); const a = Math.atan2(P.y - 80 - e.y, P.x - e.x); SP.fshots.push({ k: 'orb', x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 4 }); } }
    else { e.x += e.vx * dt; e.face = Math.sign(e.vx); if (e.x < e.plat[1] + 20 || e.x > e.plat[1] + e.plat[2] - 20) e.vx *= -1; if (P && e.cd <= 0 && Math.abs(P.y - e.y) < 60) { e.cd = rand(1.5, 2.5); SP.fshots.push({ k: 'spark', x: e.x, y: e.y - 40, vx: Math.sign(P.x - e.x) * 380, vy: 0, life: 1 }); } }
    for (const q of SP.pl) if (!q.dead && Math.abs(q.x - e.x) < 45 && q.y > e.y - 60 && q.y - 130 < e.y) spHurt(q);
  }
  // the Catena throws gears up at you
  SP.gt = (SP.gt ?? 4) - dt;
  if (SP.gt <= 0 && !SP.won && SP.t > 4) { SP.gt = rand(2.5, 4); const P = tgt({ x: W / 2, y: SP.gy }); if (P) SP.fshots.push({ k: 'gear', x: P.x + rand(-120, 120), y: SP.gy - 60, vx: rand(-60, 60), vy: -900, g: 900, life: 3, spin: 0, shootable: true }); }
  stepSPShots(dt, (s) => s.y < SP.cy - 100 || s.y > SP.cy + H + 100);
  spItems(dt, 0, (it) => it.y);
  SP.foes = SP.foes.filter((e) => !e.dead && e.y < SP.cy + H + 200);
}
function stepSPShots(dt, gone) {
  for (const s of SP.shots) {
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (gone(s)) s.life = 0;
    for (const e of SP.foes) if (!e.dead && s.life > 0 && Math.abs(s.x - e.x) < (e.big ? 90 : 46) && Math.abs(s.y - (e.k === 'robo' ? e.y - 50 : e.y)) < (e.big ? 90 : 50)) { e.hp -= s.dmg; s.life = 0; spark(s.x, s.y, '#ffe08a', 4); if (e.hp <= 0) spKillFoe(e, s.by, e.pts || 200); }
    for (const f of SP.fshots) if (f.shootable && s.life > 0 && Math.abs(f.x - s.x) < 30 && Math.abs(f.y - s.y) < 30) { f.life = 0; s.life = 0; spark(f.x, f.y, '#ffe08a', 8); }
    const B = SP.boss; if (B && !B.dead && s.life > 0 && Math.abs(s.x - B.x) < B.w && Math.abs(s.y - B.y) < B.h) { B.hp -= s.dmg; B.flash = 0.05; s.life = 0; spark(s.x, s.y, '#ffcf8a', 4); if (s.by) s.by.score += Math.round(s.dmg * 20); if (B.hp <= 0) spBossDown(); }
  }
  SP.shots = SP.shots.filter((s) => s.life > 0);
  for (const f of SP.fshots) {
    f.life -= dt; f.vy += (f.g || 0) * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.spin !== undefined) f.spin += dt * 10;
    for (const q of SP.pl) if (!q.dead && f.life > 0 && Math.abs(q.x - f.x) < 28 + (f.r || 0) && f.y > q.y - 120 && f.y < q.y + 10) { spHurt(q); f.life = 0; }
  }
  SP.fshots = SP.fshots.filter((f) => f.life > 0);
}
function drawSalita() {
  const cy = SP.cy;
  // sky → inside of the tower
  const k = clamp(-cy / TOP, 0, 1), gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, `rgb(${40 + k * 120},${40 + k * 80},${70 + k * 90})`); gr.addColorStop(1, '#1a1410'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const BGI = IMG.mole || IMG.torino;
  if (BGI) { g.save(); g.globalAlpha = IMG.mole ? 1 : 0.35; const s = W / BGI.width, h = BGI.height * s, off = ((-cy * 0.25) % h + h) % h; for (let yy = off - h; yy < H; yy += h) g.drawImage(BGI, 0, yy, W, h); g.restore(); }
  if (IMG.mole) { g.fillStyle = 'rgba(20,12,8,.28)'; g.fillRect(0, 0, W, H); }
  // the tower walls (they scroll with you)
  for (const x0 of [0, W - 60]) {
    g.fillStyle = '#5a3a28'; g.fillRect(x0, 0, 60, H);
    g.fillStyle = 'rgba(0,0,0,.35)'; for (let yy = ((-cy) % 40 + 40) % 40 - 40; yy < H; yy += 40) { g.fillRect(x0, yy, 60, 3); g.fillRect(x0 + ((yy / 40) % 2 ? 30 : 0), yy, 3, 40); }
  }
  g.save(); g.translate(0, -cy);
  for (const [py, px, pw] of SP.plats) { if (py < cy - 60 || py > cy + H + 60) continue; if (py === 0) { g.fillStyle = '#3a2a20'; g.fillRect(0, 0, W, 200); } else if (IMG.piatt && window.ATLAS.piatt && ATLAS.piatt.torino_lunga) drawPiatt('torino', px, pw, py, true); else drawPlatform(px, pw, py, 'ferro', 'x'); }
  if (-TOP > cy - 80) { ptitle('LA CIMA!', W / 2, -TOP - 80, 30, '#ffffff', '#e8a020'); }
  spDrawItems();
  for (const e of SP.foes) { if (e.k === 'disco') spr('arte', `disco_${Math.floor(T * 6) % 2}`, e.x, e.y + 50, { scale: 0.9, face: Math.sign(e.vx) }); else spr('arte', `robo_${e.cd < 0.3 ? 3 : [1, 0, 2, 0][Math.floor(T * 8) % 4]}`, e.x, e.y, { scale: 0.95, face: e.face }); }
  for (const q of SP.pl) if (!q.dead) spHero(q, q.x, q.y, spFrame(q));
  spDrawShots(SP.shots); for (const f of SP.fshots) drawFoeShot(f);
  // the Catena, huge, climbing after you
  const P = SP.pl.find((q) => !q.dead);
  SP.gx = SP.gx ?? W / 2; if (P) SP.gx += clamp(P.x - SP.gx, -90, 90) * 0.016;
  const dg = g.createLinearGradient(0, SP.gy - 40, 0, SP.gy + 220); dg.addColorStop(0, 'rgba(255,90,40,0)'); dg.addColorStop(1, 'rgba(255,70,20,.45)');
  g.fillStyle = dg; g.fillRect(0, SP.gy - 40, W, 900);
  if (frameOf('capi', 'catena_3')) spr('capi', `catena_${SP.t % 1.2 < 0.6 ? 4 : 3}`, SP.gx, SP.gy + 500, { scale: 2.0, face: -1 }); else { g.fillStyle = '#6a5040'; g.fillRect(0, SP.gy, W, 900); }
  g.restore();
  spFx(0, cy);
  const h = clamp(Math.round(-Math.min(...SP.pl.filter((q) => !q.dead).map((q) => q.y).concat([0])) / TOP * 100), 0, 100);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(W - 40, 120, 16, 400); g.fillStyle = '#ffd35a'; g.fillRect(W - 40, 520 - h * 4, 16, h * 4); ptxt(`${h}%`, W - 32, 545, 8, '#ffd35a', 'center');
}

/* =====================================================================
   2) SOTT'ACQUA — side scrolling, swimming
   ===================================================================== */
const SEA_LEN = 5600, SURF = 90, BED = 640;
function initMare() {
  SP.cam = 0;
  SP.pl.forEach((q, i) => { q.x = 200 + i * 90; q.y = 300 + i * 60; });
  // mines, fish schools, caged prisoners, seaweed
  SP.mines = []; SP.cages = []; SP.weed = [];
  for (let x = 900; x < SEA_LEN - 300; x += srand(260, 520)) SP.mines.push({ x, y: srand(200, 560), ph: srand(0, 6) });
  for (let x = 1200; x < SEA_LEN - 400; x += 1100) SP.cages.push({ x, y: BED, k: Math.floor(spRand.n() * 4), w: pick(['H', 'S', 'F', 'R']), open: false });
  for (let x = 0; x < SEA_LEN + W; x += srand(80, 180)) SP.weed.push({ x, h: srand(60, 160) });
  SP.spawn = 2;
}
function stepMare(dt) {
  const live = SP.pl.filter((q) => !q.dead);
  if (live.length) {
    const lead = Math.max(...live.map((q) => q.x)), tail = Math.min(...live.map((q) => q.x));
    const want = clamp(Math.min(lead - W * 0.45, tail - 80), SP.cam, SEA_LEN);
    SP.cam += (want - SP.cam) * Math.min(1, dt * 4);
  }
  if (!SP.boss && SP.cam >= SEA_LEN - 2) startSeaBoss();
  for (const q of SP.pl) {
    if (q.dead) continue;
    const c = inputOf(q.p.dev), R = ROSTER[q.p.hero];
    if (q.respawn) { q.respawn = false; q.x = SP.cam + 200; q.y = 250; }
    const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0), dy = (c.d ? 1 : 0) - (c.u ? 1 : 0);
    if (dx) q.face = dx;
    const sp = 240 * R.run * (q.p.perk === 'venezia' ? 1.4 : 1);
    q.vx += (dx * sp - q.vx) * Math.min(1, dt * 5); q.vy += (dy * sp * 0.85 + 40 - q.vy) * Math.min(1, dt * 4);
    if (c.pressed.jump) { q.vx += q.face * 380; Audio.sfx('wind'); for (let i = 0; i < 4; i++) S.fx.push({ k: 'sp', x: q.x - q.face * 40, y: q.y - 70, vx: -q.face * rand(60, 160), vy: rand(-120, -40), c: '#dff4ff', t: 0, life: 0.6 }); }
    q.x = clamp(q.x + q.vx * dt, SP.cam + 40, SP.cam + W - 40); q.y = clamp(q.y + q.vy * dt, SURF + 100, BED);
    q.ground = false;
    if (c.fire && q.cd <= 0) spShoot(q, q.x + q.face * 60, q.y - 70, q.face * 900, 0);
    if (c.pressed.bomb && q.p.bombs > 0) { q.p.bombs--; SP.shots.push({ x: q.x + q.face * 50, y: q.y - 60, vx: q.face * 650, vy: 0, life: 2, dmg: 10 * R.dmg, w: 'R', by: q.p }); Audio.sfx('laser'); }
    if (Math.random() < dt * 2) S.fx.push({ k: 'sp', x: q.x + q.face * 20, y: q.y - 130, vx: 0, vy: -90, c: 'rgba(220,240,255,.8)', t: 0, life: 1 });
  }
  // mines: bob, explode on touch or shot
  for (const m of SP.mines) {
    if (m.gone) continue; m.ph += dt; const my = m.y + Math.sin(m.ph * 1.5) * 16;
    if (m.fresh > 0) { m.fresh -= dt; continue; }
    for (const q of SP.pl) if (!q.dead && Math.hypot(q.x - m.x, q.y - 70 - my) < 60) { m.gone = true; boom(m.x, my, 1.2); spHurt(q); }
    for (const s of SP.shots) if (!m.gone && Math.hypot(s.x - m.x, s.y - my) < 40) { m.gone = true; s.life = 0; boom(m.x, my, 1.2); if (s.by) s.by.score += 100; ono(m.x, my - 40, 1, 0.8); }
  }
  // caged prisoners on the sea bed
  for (const cg of SP.cages) if (!cg.open) for (const s of SP.shots) if (Math.abs(s.x - cg.x) < 50 && s.y > cg.y - 130 && s.y < cg.y) { cg.open = true; s.life = 0; if (s.by) { s.by.score += 1000; s.by.freed++; } pop(cg.x, cg.y - 170, pick(DIALETTO.genova), '#7bf0b1', 1); SP.items.push({ x: cg.x + 40, y: cg.y - 100, k: cg.w, vy: 0 }, { x: cg.x - 40, y: cg.y - 100, k: 'cibo', c: Math.floor(Math.random() * 8), vy: 0 }); Audio.sfx('confirm'); }
  // tin fish and diving saucers
  SP.spawn -= dt;
  if (SP.spawn <= 0 && !SP.boss && SP.foes.length < 4 + SAVE.diff * 2) {
    SP.spawn = 1.8 - SAVE.diff * 0.35;
    const y = rand(SURF + 120, BED - 40);
    if (Math.random() < 0.7) for (let i = 0; i < 3; i++) SP.foes.push({ k: 'pesce', x: SP.cam + W + 60 + i * 70, y: y + i * 26, vx: -rand(170, 240), ph: rand(0, 6), hp: 1, pts: 150 });
    else SP.foes.push({ k: 'disco', x: SP.cam + W + 60, y, vx: -90, hp: 3, cd: 1.5, pts: 400 });
  }
  const tgt = (e) => SP.pl.filter((q) => !q.dead).sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
  for (const e of SP.foes) {
    e.ph = (e.ph || 0) + dt * 3; e.x += e.vx * dt; e.y += Math.sin(e.ph) * 40 * dt;
    if (e.k === 'disco') { e.cd -= dt; const P = tgt(e); if (P) e.y += clamp(P.y - 70 - e.y, -60, 60) * dt; if (P && e.cd <= 0) { e.cd = rand(1.8, 2.6); SP.fshots.push({ k: 'torp', x: e.x - 50, y: e.y, vx: -380, vy: 0, life: 4, dir: -1, r: 10, shootable: true }); } }
    for (const q of SP.pl) if (!q.dead && Math.abs(q.x - e.x) < 45 && Math.abs(q.y - 70 - e.y) < 50) spHurt(q);
  }
  SP.foes = SP.foes.filter((e) => !e.dead && e.x > SP.cam - 200);
  if (SP.boss) stepSeaBoss(dt);
  stepSPShots(dt, (s) => s.x < SP.cam - 60 || s.x > SP.cam + W + 60);
  spItems(dt, 60, (it) => BED);
}
function startSeaBoss() {
  const n = S.players.length, hp = Math.round((420 + n * 160) * DK().boss);
  SP.boss = { name: 'IL SOTTOMARINO DEGLI ABISSI', x: SP.cam + W - 220, y: 380, hp, max: hp, w: 150, h: 110, t: 0, st: 'intro', cd: 2, n: 0, flash: 0 };
  pop(SP.cam + W / 2, 200, 'IL SOTTOMARINO DEGLI ABISSI!', '#ff8a3a', 1); Audio.playSong(0, 'boss'); Audio.sfx('siren');
}
function stepSeaBoss(dt) {
  const B = SP.boss; if (B.dead) return;
  B.t += dt; B.flash = Math.max(0, B.flash - dt); B.cd -= dt * DK().foe;
  const P = SP.pl.find((q) => !q.dead);
  if (B.st === 'intro') { if (B.t > 1.8) B.st = 'idle'; return; }
  if (B.st === 'idle') { if (P) B.y += clamp(P.y - 70 - B.y, -120, 120) * dt; B.x += (SP.cam + W - 220 - B.x) * dt * 2; if (B.cd <= 0) { B.st = ['torp', 'mine', 'charge'][B.n++ % 3]; B.t = 0; B.warn = { torp: ['SILURI', 'SPARACI O SCHIVA!'], mine: ['MINE', 'NON TOCCARLE!'], charge: ['CARICA', 'SPOSTATI SU O GIU!'] }[B.st]; B.warnT = 1.2; } }
  else if (B.st === 'torp') { for (const at of [0.8, 1.1, 1.4]) if (B.t > at && !B['o' + at]) { B['o' + at] = 1; SP.fshots.push({ k: 'torp', x: B.x - 120, y: B.y + (at - 1.1) * 200, vx: -420, vy: 0, life: 4, dir: -1, r: 12, shootable: true }); Audio.sfx('shot'); } if (B.t > 2) spBossIdle(B); }
  else if (B.st === 'mine') { if (B.t > 0.8 && !B.o1) { B.o1 = 1; for (let i = 0; i < 4; i++) { let x, y, k = 0; do { x = SP.cam + rand(420, W - 320); y = rand(200, 560); } while (k++ < 12 && SP.pl.some((q) => !q.dead && Math.hypot(q.x - x, q.y - 70 - y) < 220)); SP.mines.push({ x, y, ph: rand(0, 6), fresh: 0.8 }); } } if (B.t > 1.6) spBossIdle(B); }
  else if (B.st === 'charge') { if (B.t > 0.9) B.x -= 700 * dt; if (B.x < SP.cam + 160 || B.t > 2.6) spBossIdle(B); }
  if (B.warnT > 0) B.warnT -= dt;
  for (const q of SP.pl) if (!q.dead && Math.abs(q.x - B.x) < B.w && Math.abs(q.y - 70 - B.y) < B.h * 0.8) spHurt(q);
}
function spBossIdle(B) { B.st = 'idle'; B.t = 0; B.cd = rand(1.4, 2.2) * (B.hp < B.max / 2 ? 0.7 : 1); for (const k in B) if (k.startsWith('o')) delete B[k]; }
function spBossDown() { const B = SP.boss; B.dead = true; B.hp = 0; for (let i = 0; i < 6; i++) setTimeout(() => SP && boom(B.x + rand(-90, 90), B.y + rand(-60, 60), 1.3), i * 250); ono(B.x, B.y - 100, 7, 1.6); freeze(0.4); for (const p of S.players) if (!p.out) p.score += 8000; SP.endT = 1.8; }
function drawMare() {
  const cam = SP.cam;
  if (IMG.mare) { const s = H / IMG.mare.height, w = IMG.mare.width * s, px = cam * 0.4, i0 = Math.floor(px / w); for (let i = i0; i * w - px < W; i++) { const x = i * w - px; if (i % 2) { g.save(); g.translate(x + w, 0); g.scale(-1, 1); g.drawImage(IMG.mare, 0, 0, w, H); g.restore(); } else g.drawImage(IMG.mare, x, 0, w, H); } }
  else {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a9ac8'); gr.addColorStop(0.35, '#1e6a98'); gr.addColorStop(1, '#0a2a44'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const x = ((i * 260 - cam * 0.2) % (W + 300) + W + 300) % (W + 300) - 150; g.fillStyle = 'rgba(180,230,255,.06)'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 80, 0); g.lineTo(x + 260, H); g.lineTo(x + 120, H); g.fill(); } g.restore();
    g.fillStyle = 'rgba(10,40,60,.6)'; for (let i = 0; i < 9; i++) { const x = ((i * 190 - cam * 0.35) % (W + 380) + W + 380) % (W + 380) - 190; g.beginPath(); g.moveTo(x, BED + 20); g.quadraticCurveTo(x + 90, BED - 150 - (i % 3) * 40, x + 190, BED + 20); g.fill(); }
  }
  if (!IMG.mare) { g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = -((cam) % 40); x < W; x += 40) { g.beginPath(); g.arc(x, SURF, 22, 0, Math.PI); g.fill(); } }
  g.save(); g.translate(-cam, 0);
  // sea bed
  if (!IMG.mare) { g.fillStyle = '#c8b078'; g.fillRect(cam, BED, W, H - BED); g.fillStyle = 'rgba(0,0,0,.2)'; for (let x = Math.floor(cam / 60) * 60; x < cam + W; x += 60) g.fillRect(x, BED + 10 + (x % 120 ? 6 : 0), 30, 4); }
  for (const w of SP.weed) if (w.x > cam - 50 && w.x < cam + W + 50) { if (spx('pe_7', w.x, BED - w.h / 2, w.h * 0.45, { rot: Math.sin(T * 2 + w.x) * 0.08 })) continue; g.strokeStyle = '#2a8a4a'; g.lineWidth = 8; g.beginPath(); g.moveTo(w.x, BED); for (let k = 1; k <= 4; k++) g.lineTo(w.x + Math.sin(T * 2 + w.x + k) * 10, BED - w.h * k / 4); g.stroke(); }
  for (const cg of SP.cages) { spr('arte', `pris_${cg.open ? cg.k + 4 : cg.k}`, cg.x, cg.y, { scale: 0.9 }); if (spx(cg.open ? 'pe_5' : 'pe_4', cg.x, cg.y - 88, 110)) continue; if (!cg.open) { g.strokeStyle = '#6a6a74'; g.lineWidth = 4; g.strokeRect(cg.x - 55, cg.y - 140, 110, 140); for (let k = -40; k <= 40; k += 20) { g.beginPath(); g.moveTo(cg.x + k, cg.y - 140); g.lineTo(cg.x + k, cg.y); g.stroke(); } } }
  for (const m of SP.mines) if (!m.gone) { const my = m.y + Math.sin(m.ph * 1.5) * 16; if (m.fresh > 0) g.globalAlpha = 0.5; g.strokeStyle = '#2a2a30'; g.lineWidth = 2; g.beginPath(); g.moveTo(m.x, my + 30); g.lineTo(m.x, BED); g.stroke(); if (spx('pe_3', m.x, my, 70)) { g.globalAlpha = 1; continue; } g.strokeStyle = '#2a2a30'; g.lineWidth = 2; g.beginPath(); g.moveTo(m.x, my); g.lineTo(m.x, BED); g.stroke(); g.fillStyle = '#3a3a44'; g.beginPath(); g.arc(m.x, my, 26, 0, 7); g.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.fillRect(m.x + Math.cos(a) * 26 - 4, my + Math.sin(a) * 26 - 4, 8, 8); } g.fillStyle = Math.floor(T * 4) % 2 ? '#ff5b4f' : '#8a2a20'; g.beginPath(); g.arc(m.x, my, 7, 0, 7); g.fill(); g.globalAlpha = 1; }
  spDrawItems();
  for (const e of SP.foes) {
    if (e.k === 'disco' && spx('pe_6', e.x, e.y, 130, { face: -1 })) continue;
    if (e.k !== 'disco') { const f2 = Math.floor(e.ph * 1.5) % 2; if (spx(`pe_${f2}`, e.x, e.y, 95, { face: (e.vx < 0 ? 1 : -1) * (f2 ? -1 : 1) })) continue; }
    if (e.k === 'disco') { spr('arte', `disco_${Math.floor(T * 6) % 2}`, e.x, e.y + 50, { scale: 0.9, face: -1, img: tinted('arte', `disco_${Math.floor(T * 6) % 2}`, '#3a8ad8', 'source-atop', 0.35) }); continue; }
    g.save(); g.translate(e.x, e.y); g.scale(Math.sign(e.vx) || -1, 1);
    g.fillStyle = '#9aa4ae'; g.strokeStyle = '#1a1010'; g.lineWidth = 3; g.beginPath(); g.ellipse(0, 0, 30, 16, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#c84a2a'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(-44, -14 + Math.sin(e.ph * 4) * 4); g.lineTo(-44, 14 - Math.sin(e.ph * 4) * 4); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(14, -4, 7, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(16, -4, 3.5, 0, 7); g.fill();
    g.strokeStyle = '#d8a020'; g.lineWidth = 4; g.beginPath(); g.moveTo(-6, -16); g.lineTo(-6, -26); g.moveTo(-14, -26); g.lineTo(2, -26); g.stroke(); g.restore();
  }
  const B = SP.boss;
  if (B) {
    const sh = B.dead ? rand(-4, 4) : 0, f = B.dead ? 7 : B.st === 'torp' ? 3 : B.st === 'charge' ? 4 : B.flash > 0 ? 5 : [1, 2][Math.floor(T * 3) % 2];
    const key = `sotto_${f}`, sf = B.dead ? 7 : B.st === 'torp' ? 2 : B.st === 'mine' ? 3 : B.st === 'charge' ? 4 : B.flash > 0 ? 5 : B.hp < B.max / 2 ? 6 : Math.floor(T * 3) % 2;
    if (spx(`sm_${sf}`, B.x + sh, B.y + (B.dead ? B.t * 30 : 0), 380, { face: sf === 4 ? 1 : -1, flash: B.flash > 0 ? 0.4 : 0 })) {} else
    spr('capi', key, B.x + sh, B.y + 130 + (B.dead ? B.t * 30 : 0), { scale: 1, face: -1, flash: B.flash > 0 ? 0.4 : 0, img: B.flash > 0 ? undefined : tinted('capi', key, '#2a6a4a', 'source-atop', 0.3) });
    if (B.warnT > 0 && B.warn) { const x = B.x, y = B.y - 170; g.fillStyle = '#fff6d6'; g.strokeStyle = '#1a1010'; g.lineWidth = 4; g.beginPath(); g.roundRect(x - 170, y - 40, 340, 70, 14); g.fill(); g.stroke(); ptxt(B.warn[0], x, y - 8, 12, '#6a2a10', 'center', false); ptxt(B.warn[1], x, y + 18, 10, '#e8483a', 'center', false); }
  }
  for (const q of SP.pl) if (!q.dead) spHero(q, q.x, q.y, q.cd > 0.1 ? ROSTER[q.p.hero].F.s : ROSTER[q.p.hero].F.j, { rot: Math.sin(T * 3 + q.x) * 0.06 });
  spDrawShots(SP.shots); for (const f of SP.fshots) drawFoeShot(f);
  g.restore();
  spFx(cam, 0);
  g.fillStyle = 'rgba(0,30,60,.18)'; g.fillRect(0, 0, W, H);
}

/* =====================================================================
   3) IN VOLO — the flying Vespa seen from behind, things come at you from the horizon
   ===================================================================== */
const HOR = 250, NEAR = 1, FAR = 18;
function initVolo() {
  SP.pl.forEach((q, i) => { q.x = SP.pl.length > 1 ? (i ? 0.35 : -0.35) : 0; q.y = 0.2; });
  SP.objs = []; SP.spawn = 1.5; SP.dist = 0; SP.len = 65;
}
const proj = (x, y, z) => { const s = 1 / z; return { x: W / 2 + x * 520 * s, y: HOR + (440 + y * 180 - HOR) * s, s }; };
function stepVolo(dt) {
  SP.dist += dt;
  for (const q of SP.pl) {
    if (q.dead) continue;
    const c = inputOf(q.p.dev);
    if (q.respawn) { q.respawn = false; q.x = 0; q.y = 0; }
    const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0), dy = (c.d ? 1 : 0) - (c.u ? 1 : 0);
    q.vx += (dx * 1.6 - q.vx) * Math.min(1, dt * 6); q.vy += (dy * 1.3 - q.vy) * Math.min(1, dt * 6);
    q.x = clamp(q.x + q.vx * dt, -1.1, 1.1); q.y = clamp(q.y + q.vy * dt, -1, 1); q.tilt = q.vx * 0.25;
    if (c.fire && q.cd <= 0) { q.cd = 0.14; SP.shots.push({ x: q.x, y: q.y - 0.15, z: NEAR + 0.2, by: q.p, dmg: WEAPONS[q.p.w].dmg * ROSTER[q.p.hero].dmg * (q.p.w === 'R' ? 0.6 : 1), life: 1 }); Audio.sfx('shot'); }
    if (c.pressed.bomb && q.p.bombs > 0) { q.p.bombs--; SP.shots.push({ x: q.x, y: q.y - 0.1, z: NEAR + 0.2, by: q.p, dmg: 12, big: true, life: 1.4 }); Audio.sfx('laser'); }
  }
  // what comes from the horizon
  SP.spawn -= dt;
  if (SP.spawn <= 0 && !SP.boss) {
    SP.spawn = rand(0.45, 0.9) - SAVE.diff * 0.1;
    const r = Math.random();
    if (r < 0.45) SP.objs.push({ k: 'disco', x: rand(-1.1, 1.1), y: rand(-0.9, 0.6), z: FAR, hp: 2, cd: rand(1, 2), vx: rand(-0.3, 0.3) });
    else if (r < 0.66) SP.objs.push({ k: 'scoglio', x: rand(-1.2, 1.2), y: 0.75, z: FAR, hp: 999 });
    else if (r < 0.8) SP.objs.push({ k: 'faro', x: pick([-1, 1]) * rand(0.3, 1.0), y: 0, z: FAR, hp: 999 });
    else if (r < 0.92) SP.objs.push({ k: 'anello', x: rand(-0.9, 0.9), y: rand(-0.7, 0.5), z: FAR, hp: 999 });
    else SP.objs.push({ k: 'cibo', x: rand(-0.9, 0.9), y: rand(-0.6, 0.5), z: FAR, hp: 999, c: Math.floor(Math.random() * 8) });
  }
  if (!SP.boss && SP.dist > SP.len) { SP.boss = { name: 'LA NAVE MADRE', x: 0, y: -0.4, z: 7, hp: Math.round((300 + S.players.length * 120) * DK().boss), max: 1, t: 0, cd: 2, n: 0, flash: 0 }; SP.boss.max = SP.boss.hp; pop(W / 2, 200, 'LA NAVE MADRE!', '#ff8a3a', 1); Audio.sfx('siren'); }
  const speed = 9;
  for (const o of SP.objs) {
    o.z -= speed * dt * (o.k === 'orb' ? 1.8 : 1);
    if (o.k === 'disco') { o.x += o.vx * dt; o.cd -= dt; if (o.cd <= 0 && o.z > 4) { o.cd = rand(1.4, 2.4); SP.objs.push({ k: 'orb', x: o.x, y: o.y, z: o.z, hp: 999, tx: pick(SP.pl.filter((q) => !q.dead) || [{ x: 0 }]) }); } }
    if (o.k === 'orb' && o.tx) { o.x += (o.tx.x - o.x) * dt * 0.8; o.y += (o.tx.y - o.y) * dt * 0.8; }
    if (o.z < NEAR + 0.25 && o.z > NEAR - 0.3 && !o.hitDone) for (const q of SP.pl) {
      if (q.dead) continue;
      const close = o.k === 'faro' ? Math.abs(o.x - q.x) < 0.2 : Math.abs(o.x - q.x) < (o.k === 'scoglio' ? 0.28 : 0.2) && Math.abs(o.y - q.y) < (o.k === 'scoglio' ? 0.5 : 0.22);
      if (!close) continue;
      o.hitDone = true;
      if (o.k === 'anello') { q.p.score += 500; pop(W / 2, 300, '+500', '#ffd35a'); Audio.sfx('pickup'); o.gone = true; }
      else if (o.k === 'cibo') { EX.eat(q.p, { x: W / 2, y: 400, c: o.c }); o.gone = true; }
      else spHurt(q);
    }
  }
  SP.objs = SP.objs.filter((o) => o.z > 0.3 && !o.gone && o.hp > 0);
  for (const s of SP.shots) {
    s.z += 26 * dt; s.life -= dt;
    for (const o of SP.objs) if (o.k === 'disco' && Math.abs(o.z - s.z) < 0.9 && Math.abs(o.x - s.x) < 0.22 && Math.abs(o.y - s.y) < 0.25) { o.hp -= s.dmg; s.life = 0; const P = proj(o.x, o.y, o.z); spark(P.x, P.y, '#ffe08a', 6); if (o.hp <= 0) { o.gone = true; boom(P.x, P.y, 1); if (s.by) s.by.score += 400; SAVE.stat.dischi++; } }
    for (const o of SP.objs) if (o.k === 'orb' && Math.abs(o.z - s.z) < 0.8 && Math.abs(o.x - s.x) < 0.15 && Math.abs(o.y - s.y) < 0.15) { o.gone = true; s.life = 0; }
    const B = SP.boss;
    if (B && !B.dead && s.life > 0 && Math.abs(B.z - s.z) < 1.2 && Math.abs(B.x - s.x) < 0.7 && Math.abs(B.y - s.y) < 0.4) { B.hp -= s.dmg * (s.big ? 1 : 1); B.flash = 0.05; s.life = 0; if (s.by) s.by.score += 20; const P = proj(s.x, s.y, B.z); spark(P.x, P.y, '#ffcf8a', 4); if (B.hp <= 0) spVoloBossDown(); }
  }
  SP.shots = SP.shots.filter((s) => s.life > 0 && s.z < FAR);
  const B = SP.boss;
  if (B && !B.dead) {
    B.t += dt; B.x = Math.sin(B.t * 0.7) * 0.7; B.y = -0.4 + Math.sin(B.t * 1.3) * 0.15; B.flash = Math.max(0, B.flash - dt);
    B.cd -= dt * DK().foe;
    if (B.cd <= 0) {
      B.cd = B.hp < B.max / 2 ? 1.4 : 2;
      const n = B.n++ % 3;
      if (n === 2) for (let i = 0; i < 4; i++) SP.objs.push({ k: 'disco', x: B.x + rand(-0.6, 0.6), y: B.y + rand(0, 0.5), z: B.z, hp: 2, cd: 1.2, vx: rand(-0.4, 0.4) });
      else for (let i = -2; i <= 2; i++) SP.objs.push({ k: 'orb', x: B.x + i * 0.18, y: B.y + 0.1, z: B.z, hp: 999, tx: { x: B.x + i * 0.45, y: n ? 0.6 : -0.4 } });
      Audio.sfx('laser');
    }
  }
}
function spVoloBossDown() { const B = SP.boss; B.dead = true; const P = proj(B.x, B.y, B.z); for (let i = 0; i < 6; i++) setTimeout(() => SP && boom(P.x + rand(-160, 160), P.y + rand(-60, 60), 1.6), i * 250); ono(P.x, P.y - 80, 7, 1.8); freeze(0.4); for (const p of S.players) if (!p.out) p.score += 8000; SP.endT = 1.8; }
function drawVolo() {
  // sky and sea, the Etna growing on the horizon
  const e = clamp(SP.dist / SP.len, 0, 1);
  {
    const gr = g.createLinearGradient(0, 0, 0, HOR); gr.addColorStop(0, '#6a2a2a'); gr.addColorStop(1, '#f2a060'); g.fillStyle = gr; g.fillRect(0, 0, W, HOR);
    const src = IMG.cielo || IMG.etna || IMG.stretto;
    if (src) { const sh = src.height * (IMG.cielo ? 1 : 0.68), z = 0.8 + e * 0.5, w = W * z, h = sh * w / src.width; g.drawImage(src, 0, 0, src.width, sh, (W - w) / 2, HOR - h, w, h); }
    const hz = g.createLinearGradient(0, HOR - 90, 0, HOR); hz.addColorStop(0, 'rgba(255,200,150,0)'); hz.addColorStop(1, 'rgba(255,200,150,.55)'); g.fillStyle = hz; g.fillRect(0, HOR - 90, W, 90);
    const sg = g.createLinearGradient(0, HOR, 0, H); sg.addColorStop(0, '#8ab8d0'); sg.addColorStop(0.25, '#3a7aa8'); sg.addColorStop(1, '#123a60'); g.fillStyle = sg; g.fillRect(0, HOR, W, H - HOR);
    // wave crests rushing at you
    g.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 26; i++) {
      const z = FAR - ((SP.t * 9 + i * (FAR / 26) * 1.0) % FAR); if (z < 0.5) continue;
      for (let j = -5; j <= 5; j++) { const P = proj(j * 0.9 + ((i * 7) % 5) * 0.17, 1.15, z); g.beginPath(); g.ellipse(P.x, P.y, 60 * P.s, 5 * P.s + 0.5, 0, 0, Math.PI); g.fill(); }
    }
  }
  // far to near
  const list = [...SP.objs].sort((a, b) => b.z - a.z);
  const B = SP.boss;
  if (B && !B.dead) { const P = proj(B.x, B.y, B.z); if (!spx('vo_11', P.x, P.y, 900 * P.s, { flash: B.flash > 0 ? 0.5 : 0 })) spr('arte', `disco_${Math.floor(T * 6) % 2}`, P.x, P.y + 130 * P.s * 3, { scale: 6 * P.s * 2, flash: B.flash > 0 ? 0.5 : 0, img: B.flash > 0 ? undefined : tinted('arte', `disco_${Math.floor(T * 6) % 2}`, '#e8b030', 'source-atop', 0.45) }); }
  for (const o of list) {
    const P = proj(o.x, o.y, o.z);
    if (o.k === 'disco') spr('arte', `disco_${Math.floor(T * 6) % 2}`, P.x, P.y + 50 * P.s * 1.6, { scale: 1.6 * P.s });
    else if ((o.k === 'scoglio' || o.k === 'faro') && spx(o.k === 'faro' ? 'vo_9' : 'vo_8', P.x, P.y, (o.k === 'faro' ? 420 : 300) * P.s)) {}
    else if (o.k === 'faro') { const w = 170 * P.s, h = 900 * P.s; g.fillStyle = '#5a4034'; g.strokeStyle = '#2a1a10'; g.lineWidth = Math.max(1, 4 * P.s); g.beginPath(); g.moveTo(P.x - w / 2, P.y + h * 0.5); g.lineTo(P.x - w * 0.35, P.y - h * 0.5); g.lineTo(P.x + w * 0.3, P.y - h * 0.46); g.lineTo(P.x + w / 2, P.y + h * 0.5); g.closePath(); g.fill(); g.stroke(); }
    else if (o.k === 'scoglio') { const w = 260 * P.s, h = 420 * P.s; g.fillStyle = '#6a5040'; g.strokeStyle = '#2a1a10'; g.lineWidth = Math.max(1, 4 * P.s); g.beginPath(); g.moveTo(P.x - w / 2, P.y + h * 0.4); g.lineTo(P.x - w * 0.3, P.y - h * 0.5); g.lineTo(P.x + w * 0.1, P.y - h * 0.6); g.lineTo(P.x + w / 2, P.y + h * 0.4); g.closePath(); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(P.x - w / 2, P.y + h * 0.38, w, 6 * P.s); }
    else if (o.k === 'anello' && spx('vo_10', P.x, P.y, 200 * P.s)) {}
    else if (o.k === 'anello') { g.strokeStyle = '#ffd35a'; g.lineWidth = Math.max(2, 14 * P.s); g.beginPath(); g.ellipse(P.x, P.y, 90 * P.s, 110 * P.s, 0, 0, 7); g.stroke(); }
    else if (o.k === 'cibo') { const f = FXF(`cibo_${o.c}`); if (f) spr('fx', `cibo_${o.c}`, P.x, P.y + 50 * P.s, { scale: 100 * P.s / f[2] }); }
    else if (o.k === 'orb') { g.fillStyle = '#c86aff'; g.beginPath(); g.arc(P.x, P.y, Math.max(3, 26 * P.s), 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(P.x, P.y, Math.max(1, 9 * P.s), 0, 7); g.fill(); }
  }
  for (const s of SP.shots) { const P = proj(s.x, s.y, s.z); g.fillStyle = s.big ? '#ff5b8a' : '#ffe08a'; g.beginPath(); g.arc(P.x, P.y, Math.max(2, (s.big ? 30 : 16) * P.s), 0, 7); g.fill(); }
  // the flying Vespas, seen from behind
  for (const q of SP.pl) {
    if (q.dead || (q.inv > 0 && Math.floor(T * 16) % 2)) continue;
    const P = proj(q.x, q.y, NEAR), R = ROSTER[q.p.hero];
    if (spx(`vo_${q.hurtT > 0 ? 3 : q.tilt > 0.12 ? 1 : q.tilt < -0.12 ? 2 : 0}`, P.x, P.y, 330)) { spx(`vo_${4 + q.p.hero}`, P.x + q.tilt * 20, P.y - 48, 88, { rot: q.tilt * 0.5 }); if (SP.pl.length > 1) ptxt(`${q.p.slot + 1}P`, P.x, P.y - 160, 9, R.color, 'center'); continue; }
    g.save(); g.translate(P.x, P.y); g.rotate(q.tilt);
    g.lineWidth = 4; g.strokeStyle = '#1a1010';
    const prop = Math.abs(Math.sin(T * 40));
    for (const sx of [-1, 1]) { g.fillStyle = '#c8a060'; g.beginPath(); g.ellipse(sx * 110, 0, 60, 12, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(sx * 170, 0, 8, 40 * prop, 0, 0, 7); g.fill(); }
    g.fillStyle = '#d8402a'; g.beginPath(); g.ellipse(0, 20, 70, 50, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#ffd35a'; g.beginPath(); g.arc(0, 60, 12, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#6a4424'; g.beginPath(); g.ellipse(0, -35, 40, 42, 0, 0, 7); g.fill(); g.stroke();
    const fur = ['#9a9aa4', '#2a2a30', '#6a4a30', '#c8a880'][q.p.hero];
    g.fillStyle = fur; g.beginPath(); g.arc(0, -86, 30, 0, 7); g.fill(); g.stroke();
    for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 14, -110); g.lineTo(sx * 26, -140); g.lineTo(sx * 30, -104); g.fill(); g.stroke(); }
    g.fillStyle = R.color; g.fillRect(-34, -64, 68, 12);
    g.restore();
    if (SP.pl.length > 1) ptxt(`${q.p.slot + 1}P`, P.x, P.y - 150, 9, R.color, 'center');
  }
  spFx(0, 0);
  if (!SP.boss) { const k = clamp(SP.dist / SP.len, 0, 1); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(W / 2 - 200, 60, 400, 12); g.fillStyle = '#ffd35a'; g.fillRect(W / 2 - 200, 60, 400 * k, 12); ptxt('ETNA', W / 2 + 214, 72, 8, '#ffd35a'); }
}

/* ---------------- hook into the flow ---------------- */
Object.assign(MENUS, { speciale: [tickSpecial, drawSpecial] });
const _nextMission3 = nextMission;
nextMission = function () {
  const kind = SPECIAL_AFTER[MI];
  if (kind && !RMODE.rush && S && !S.spDone) {
    if (S.leaving) return;
    S.spDone = true; S.leaving = true;
    irisTo(() => { startSpecial(kind, () => { S.leaving = false; _nextMission3(); }); });
    return;
  }
  _nextMission3();
};
(function () {
  for (const k of ['mare', 'cielo', 'mole']) loadImages([[k, `assets/bg/${k}.jpg`]]).catch(() => {});
  if (window.ATLAS.sp && Object.keys(window.ATLAS.sp).length) loadImages([['sp', 'assets/sprites/sp.png']]).catch(() => {});
})();
Object.defineProperty(window.Stivale, 'SP', { get: () => SP });
Object.assign(window.Stivale, { startSpecial, stepSpecial });
