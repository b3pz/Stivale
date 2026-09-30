'use strict';
/* ============================================================
   EXTRA: tutto quello che rende il gioco più "cartone" e più rigiocabile.
   - transizioni a iride, cartello da film muto, intro animata
   - onomatopee, fermo-immagine sui colpi forti, caschi che volano
   - cibo che ridà un cuore, voto a fine missione, trofei
   - mini-boss a metà livello, nemici delle città, veicoli delle città
   - minigioco bonus "Acchiappa i dischi", battute in dialetto
   - modalità extra (boss di fila a tempo, arcade a un credito)
   - comandi touch per telefono e tablet
   Le parti disegnate arrivano dalle tavole (atlante fx): finché mancano,
   il gioco usa segnaposto fatti in codice o sprite che ci sono già.
   ============================================================ */
const EX = {};
const CITY = () => MISSIONS[MI].bg;

/* ---------------- iris ---------------- */
let IRIS = null;
function irisTo(then, x = W / 2, y = H / 2) { if (IRIS && IRIS.ph === 'hold') { then && then(); return; } if (IRIS) return; IRIS = { ph: 'close', t: 0, x, y, then }; Audio.sfx('wind'); }
function irisOpen(x = W / 2, y = H / 2) { IRIS = { ph: 'open', t: 0, x, y }; }
function heroScreen() { const p = S && alive()[0]; return p ? [clamp(p.x - S.cam, 60, W - 60), clamp(p.y - 90, 60, H - 60)] : [W / 2, H / 2]; }
function drawIris(dt) {
  if (!IRIS) return;
  IRIS.t += dt;
  const D = 0.55, k = clamp(IRIS.t / D, 0, 1), maxR = Math.hypot(W, H);
  const r = IRIS.ph === 'close' ? maxR * (1 - k) * (1 - k) : maxR * k * k;
  g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, W, H); g.arc(IRIS.x, IRIS.y, Math.max(0, r), 0, Math.PI * 2, true); g.fill('evenodd');
  g.lineWidth = 6; g.strokeStyle = '#1a0a04'; g.beginPath(); g.arc(IRIS.x, IRIS.y, Math.max(0, r), 0, 7); g.stroke(); g.restore();
  if (k >= 1) {
    if (IRIS.ph === 'close') { const fn = IRIS.then; IRIS = { ph: 'hold', t: 0, x: IRIS.x, y: IRIS.y }; fn && fn(); if (IRIS && IRIS.ph === 'hold') IRIS = { ph: 'open', t: 0, x: W / 2, y: H / 2 }; }
    else if (IRIS.ph === 'open') IRIS = null;
  }
}

/* ---------------- run modes: boss rush, arcade ---------------- */
const RMODE = { rush: false, arcade: false, t: 0, bi: 0, prevDiff: null };
function endRunModes() { if (RMODE.prevDiff !== null) { SAVE.diff = RMODE.prevDiff; saveGame(); } RMODE.rush = RMODE.arcade = false; RMODE.prevDiff = null; }

/* ---------------- trophies ---------------- */
const TROFEI = [
  ['VOTO S', 'Prendi il voto S in una missione'], ['SENZA UN GRAFFIO', 'Finisci una missione senza perdere cuori'],
  ['IL LUPO', 'Finisci una missione con Remo'], ['LA GATTA', 'Finisci una missione con Nina'],
  ['IL CINGHIALE', 'Finisci una missione con Bruno'], ['LA STAMBECCA', 'Finisci una missione con Alba'],
  ['CACCIATORE DI DISCHI', 'Abbatti 50 dischi volanti'], ['BUONA FORCHETTA', 'Mangia 20 cibi'],
  ['VESPISTA', 'Sconfiggi 30 nemici su un veicolo'], ['LIBERATORE', 'Libera tutti i prigionieri di una missione'],
  ['TUTTI A TAVOLA', 'Finisci il gioco'], ['GRAN GELATO', 'Fai 100.000 punti in una partita'],
];
SAVE.trofei = SAVE.trofei || []; SAVE.stat = Object.assign({ dischi: 0, cibi: 0, veicolo: 0 }, SAVE.stat || {}); SAVE.voti = SAVE.voti || [];
let TPOP = null;
function award(i) { if (SAVE.trofei[i]) return; SAVE.trofei[i] = 1; saveGame(); TPOP = { i, t: 0 }; Audio.sfx('fanfara'); }
function drawMedal(i, x, y, w, got) {
  if (fxs(`tro_${i}`, x, y, w, { alpha: got ? 1 : 0.25 })) return;
  g.save(); g.globalAlpha = got ? 1 : 0.3;
  g.fillStyle = '#b83a2a'; g.beginPath(); g.moveTo(x - w * 0.2, y - w * 0.55); g.lineTo(x + w * 0.2, y - w * 0.55); g.lineTo(x + w * 0.1, y - w * 0.1); g.lineTo(x - w * 0.1, y - w * 0.1); g.fill();
  g.fillStyle = got ? '#e0a848' : '#8a8a8a'; g.beginPath(); g.arc(x, y + w * 0.1, w * 0.32, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = '#3a2410'; g.stroke();
  fxs('ui_6', x, y + w * 0.1, w * 0.32); g.restore();
}
function tickTrofei() { const n = menuNav(0, 1); if (n.ok || n.back) { mode = 'title'; Audio.sfx('select'); } }
function drawTrofei() {
  drawMenuBack(); drawBoard(110, 120, W - 220, 540, 'TROFEI');
  TROFEI.forEach(([name, desc], i) => {
    const cx = 250 + (i % 4) * 260, cy = 210 + Math.floor(i / 4) * 150, got = !!SAVE.trofei[i];
    drawMedal(i, cx, cy, 70, got);
    ptxt(name, cx, cy + 62, 9, got ? '#ffd35a' : '#9a7a5a', 'center');
    for (const [j, row] of wrapText(desc, 220, 13).entries()) txt(row, cx, cy + 82 + j * 15, 13, got ? '#fff0d0' : '#8a6a4a', 'center', 700);
  });
  ptxt(`${SAVE.trofei.filter(Boolean).length} / ${TROFEI.length}   ·   FUOCO: INDIETRO`, W / 2, 690, 9, '#ffe3a0', 'center');
}

/* ---------------- extra modes menu ---------------- */
const EXTRA_ROWS = ['BOSS DI FILA A TEMPO', 'ARCADE: UN SOLO CREDITO', 'INDIETRO'];
let exSel = 0;
function tickExtra() {
  const n = menuNav(exSel, EXTRA_ROWS.length); exSel = n.sel;
  if (n.back) { mode = 'title'; return; }
  if (!n.ok) return;
  Audio.sfx('confirm');
  if (exSel === 2) { mode = 'title'; return; }
  if (exSel === 0) RMODE.rush = true; else { RMODE.arcade = true; RMODE.prevDiff = SAVE.diff; SAVE.diff = 2; }
  tsel.mi = 0; mode = 'select'; sel = { slots: [{ dev: n.dev, hero: 0, ready: false }] };
}
function drawExtra() {
  drawMenuBack(); drawBoard(290, 200, 700, 400, 'EXTRA');
  EXTRA_ROWS.forEach((t, i) => menuItem(t, W / 2, 300 + i * 70, exSel === i, 16));
  const best = SAVE.rushBest ? `MIGLIOR TEMPO BOSS: ${fmtTime(SAVE.rushBest)}` : 'I BOSS UNO DOPO L\'ALTRO, SENZA LIVELLI: CONTA IL TEMPO';
  ptxt(exSel === 1 ? 'TUTTO IL GIOCO IN DIFFICOLTA ARCADE, SENZA CONTINUE' : best, W / 2, 540, 9, '#e0b870', 'center');
}
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ---------------- dialect ---------------- */
const DIALETTO = {
  roma: ['AO, GRAZIE!', 'DAJE!', 'MANNAGGIA AI MARZIANI!', 'SEI UN MITO, A\' LUPO!'],
  venezia: ['OSTREGA, GRAZIE!', 'XE FINIA!', 'GRAZIE, VECIO!', 'CHE BEL!'],
  firenze: ['O BELLO, GRAZIE!', 'BONA LI!', 'MI SON SALVATO!', 'O ICCHE TU FAI? GRAZIE!'],
  torino: ['GRAZIE, NE!', 'BOGIA NEN!', 'CHE BRAV!', 'ADESSO SI RAGIONA!'],
  genova: ['ANEMMU!', 'SCIU GRAZIE!', 'MAIA CHE PAURA!', 'CHE ROBA!'],
  dolomiti: ['DANKE! GRAZIE!', 'BRRR, GRAZIE!', 'SERVUS!', 'EVVIVA LA MONTAGNA!'],
  stretto: ['MIZZICA!', 'GRAZIE ASSAI!', 'CHE BEDDU!', 'SIGNURI, GRAZIE!'],
  etna: ['SUGNU LIBBIRU!', 'MIZZICA CHE CAUDU!', 'GRAZIE, PICCIOTTI!', 'CHE CUNTENTIZZA!'],
};

/* ---------------- food ---------------- */
const CIBI = ['PIZZA', 'CANNOLO', 'ARANCINO', 'GELATO', 'SPAGHETTI', 'CAFFE', 'PANETTONE', 'ANGURIA'];
const CIBO_COL = [['#f2c24a', '#d8402a'], ['#e8c070', '#fff2d8'], ['#e8902a', '#b8601a'], ['#f8b8c8', '#8ad8a8'], ['#f2d070', '#d8402a'], ['#6a3a20', '#ffffff'], ['#e8b050', '#8a4a20'], ['#48a048', '#e84848']];
function dropFood(x, y) { S.items.push({ id: nid(), x, y, vy: -320, k: 'cibo', c: Math.floor(Math.random() * 8) }); }
EX.drawFood = (it, b) => {
  if (fxs(`cibo_${it.c}`, it.x, it.y + b, 58)) return;
  const [a, c] = CIBO_COL[it.c];
  g.save(); g.translate(it.x, it.y - 24 + b);
  g.scale(1.4, 1.4); g.lineWidth = 3; g.strokeStyle = '#1a1010'; g.fillStyle = a; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill(); g.stroke();
  g.fillStyle = c; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(Math.cos(i * 1.3) * 10, Math.sin(i * 1.3) * 10, 4, 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-6, -4, 4, 0, 7); g.arc(6, -4, 4, 0, 7); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(-5, -4, 2, 0, 7); g.arc(7, -4, 2, 0, 7); g.fill();
  g.restore();
};
EX.eat = (p, it) => {
  const max = DK().hp;
  if ((p.hp ?? 1) < max) { p.hp++; pop(it.x, it.y - 90, `${CIBI[it.c]}! +1 CUORE`, '#ff8aa0', 1); } else { p.score += 500; pop(it.x, it.y - 90, `${CIBI[it.c]}! GNAM!`, '#ffd35a'); }
  Audio.sfx('pickup'); SAVE.stat.cibi++; if (SAVE.stat.cibi >= 20) award(7);
};

/* ---------------- onomatopoeia, freeze, flying helmets ---------------- */
const ONO = ['BANG!', 'BOOM!', 'BONK!', 'ZAP!', 'CRASH!', 'SBAM!', 'POP!', 'KA-BOOM!'];
let onoCd = 0;
function ono(x, y, i, big = 1) { if (onoCd > 0) return; onoCd = 0.3; S.fx.push({ k: 'ono', x, y, i, big, t: 0, rot: rand(-0.25, 0.25) }); }
function freeze(t) { S.freeze = Math.max(S.freeze || 0, t); }
function drawOno(f) {
  const k = f.t / 0.7, s = (k < 0.15 ? k / 0.15 * 1.2 : 1.2 - Math.min(0.2, (k - 0.15))) * f.big, a = k > 0.75 ? (1 - k) * 4 : 1;
  if (fxs(`ono_${f.i}`, f.x, f.y, 120 * s, { rot: f.rot, alpha: a })) return;
  g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.scale(s, s); g.globalAlpha = a;
  g.fillStyle = ['#ffd35a', '#ff8a3a', '#ff5b8a', '#7ec8ff'][f.i % 4]; g.strokeStyle = '#1a1010'; g.lineWidth = 4; g.beginPath();
  for (let i = 0; i < 20; i++) { const r = i % 2 ? 36 : 62, an = i * Math.PI / 10; g.lineTo(Math.cos(an) * r * 1.3, Math.sin(an) * r * 0.8); }
  g.closePath(); g.fill(); g.stroke();
  ptitle(ONO[f.i], 0, 8, 16, '#ffffff', '#e8483a'); g.restore();
}
function drawHelmet(f) {
  g.save(); g.translate(f.x, f.y); g.rotate(f.rot);
  g.fillStyle = '#f2ece0'; g.strokeStyle = '#1a1010'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 17, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#3a3440'; g.beginPath(); g.ellipse(4, 1, 10, 11, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(7, -4, 3, 0, 7); g.fill(); g.restore();
}

/* ---------------- mini-bosses and city enemies ---------------- */
const MINI_NAMES = ['IL CARRO FORMAGGIO', 'LA MOKA MECCANICA', 'LA LUPA DI LATTA', 'LA BETONIERA'];
const CITTA_IDX = { venezia: 0, torino: 1, genova: 2, dolomiti: 3 };
const CITTA_TINT = ['#3a6ad8', '#d8a020', '#8a5a30', '#bfe4ff'];
Object.assign(EBOX, { mini: [95, 120, 130], citta: [36, 70, 78] });
const _spawnEnemy = spawnEnemy;
spawnEnemy = function (type, x, y) {
  if (type === 'mini' || type === 'citta') {
    const e = _spawnEnemy('fante', x, type === 'citta' ? y : undefined);
    e.type = type;
    if (type === 'mini') { e.hp = e.max = Math.round((70 + 40 * S.players.length) * DK().boss); e.cd = 2; e.mi = MI % 4; e.plat = null; e.y = GROUND; S.mini = e; pop(S.cam + W / 2, 220, MINI_NAMES[e.mi], '#ff8a3a', 1); Audio.sfx('siren'); }
    else { e.hp = 3; e.ci = CITTA_IDX[CITY()] ?? 0; e.cd = rand(1, 2); }
    return e;
  }
  return _spawnEnemy(type, x, y);
};
const _stepEnemy = stepEnemy;
stepEnemy = function (e, dt) {
  if ((e.type !== 'mini' && e.type !== 'citta') || e.st === 'dead') return _stepEnemy(e, dt);
  e.t += dt; e.flash = Math.max(0, e.flash - dt);
  const P = nearestPlayer(e); if (!P) return;
  const dx = P.x - e.x; e.cd -= dt * DK().foe;
  if (e.type === 'mini') {
    if (e.st !== 'charge') e.face = Math.sign(dx) || e.face;
    if (e.st === 'walk') {
      e.x += Math.sign(dx) * 60 * dt; e.walk += dt * 4;
      if (e.cd <= 0) { e.st = ['charge', 'lob', 'stomp'][e.n = ((e.n || 0) + 1) % 3]; e.t = 0; Audio.sfx('bosswind'); }
    } else if (e.st === 'charge') {
      if (e.t > 0.6) e.x += e.face * 520 * dt;
      if (e.t > 1.8) { e.st = 'walk'; e.cd = 2.2; S.shake = 8; Audio.sfx('stomp'); }
    } else if (e.st === 'lob') {
      for (const at of [0.4, 0.7, 1.0]) if (e.t > at && !e['o' + at]) { e['o' + at] = 1; const tt = 1.1, x0 = e.x + e.face * 80, y0 = e.y - 150, tx = P.x + rand(-80, 80); S.foeShots.push({ id: nid(), k: 'cball', x: x0, y: y0, vx: (tx - x0) / tt, vy: (GROUND - 20 - y0 - 0.5 * 1100 * tt * tt) / tt, g: 1100, life: 3, r: 18, shootable: true }); Audio.sfx('shot'); }
      if (e.t > 1.6) { e.st = 'walk'; e.cd = 2.4; for (const k in e) if (k.startsWith('o0') || k.startsWith('o1')) delete e[k]; }
    } else if (e.st === 'stomp') {
      if (e.t > 0.6 && !e.did) { e.did = 1; S.fx.push({ k: 'wave', x: e.x, y: GROUND, dir: -1, t: 0 }, { k: 'wave', x: e.x, y: GROUND, dir: 1, t: 0 }); S.shake = 14; Audio.sfx('boom'); ono(e.x, e.y - 160, 5); }
      if (e.t > 1.3) { e.st = 'walk'; e.cd = 2; e.did = 0; }
    }
    for (const p of alive()) if (Math.abs(p.x - e.x) < 85 && p.y > e.y - 160) kill(p);
    if (S.veh.rider && Math.abs(S.veh.x - e.x) < 140) hurtVehicle();
  } else {
    e.face = Math.sign(dx) || e.face;
    const near = Math.abs(dx) < (e.ci === 0 ? 120 : 380);
    if (e.st === 'walk') {
      if (!near) { e.x += Math.sign(dx) * 110 * dt; e.walk += dt * 7; }
      if (e.cd <= 0 && Math.abs(dx) < 620) { e.st = 'atk'; e.t = 0; }
    } else if (e.st === 'atk' && e.t > 0.45 && !e.did) {
      e.did = 1;
      if (e.ci === 0) { for (const p of alive()) if (Math.abs(p.x - e.x) < 135 && (p.x - e.x) * e.face > -20 && p.y > e.y - 120) kill(p); ono(e.x + e.face * 70, e.y - 90, 2, 0.7); Audio.sfx('punch'); }   // gondolier: oar swing
      else if (e.ci === 1) { const tt = 1, x0 = e.x + e.face * 30, y0 = e.y - 110; S.foeShots.push({ id: nid(), k: 'gear', x: x0, y: y0, vx: (P.x - x0) / tt, vy: (GROUND - 30 - y0 - 0.5 * 1100 * tt * tt) / tt, g: 1100, life: 3, r: 18, shootable: true, spin: 0 }); Audio.sfx('wind'); }   // worker: wrench
      else if (e.ci === 2) { S.foeShots.push({ id: nid(), k: 'barile', x: e.x + e.face * 50, y: GROUND - 28, vx: e.face * 320, vy: 0, g: 0, life: 4, r: 24, keep: true, shootable: true, spin: 0 }); Audio.sfx('heavy'); }   // docker: rolling barrel
      else { S.fx.push({ k: 'wave', x: e.x + e.face * 40, y: GROUND, dir: e.face, t: 0 }); Audio.sfx('wind'); }   // snowplough: snow wave
    } else if (e.st === 'atk' && e.t > 0.9) { e.st = 'walk'; e.cd = rand(1.8, 2.8); e.did = 0; }
  }
  if (S.lock !== null) e.x = clamp(e.x, S.lock + 30, S.lock + W - 30); else e.x = clamp(e.x, S.cam - 200, S.cam + W + 300);
};
ESPR.barile = ['obj_7', 50, 0];
const _drawEnemy = drawEnemy;
drawEnemy = function (e) {
  const dead = e.st === 'dead', fl = e.flash > 0 ? 0.8 : 0;
  if (e.para && !dead) {   // a patched striped parachute
    const x = e.x, y = e.y - 190;
    g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x - 12, y + 90); g.moveTo(x + 50, y); g.lineTo(x + 12, y + 90); g.stroke();
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f2ece0' : '#d8402a'; g.beginPath(); g.moveTo(x, y + 6); g.arc(x, y + 6, 58, Math.PI + i * Math.PI / 4, Math.PI + (i + 1) * Math.PI / 4); g.fill(); }
    g.lineWidth = 3; g.beginPath(); g.arc(x, y + 6, 58, Math.PI, 0); g.stroke();
  }
  if (e.type === 'mini') {
    const bob = e.st === 'walk' ? -Math.abs(Math.sin(e.walk * 2)) * 5 : 0, sh = e.st === 'charge' && e.t < 0.6 ? rand(-3, 3) : 0;
    if (fxs(`mb_${e.mi + (dead ? 4 : 0)}`, e.x + sh, e.y + bob, 300, { face: -e.face, flash: fl })) return;
    const key = `leg_${dead ? 6 : e.st === 'charge' ? 3 : e.st === 'stomp' ? 4 : [1, 0, 2, 0][Math.floor(e.walk) % 4]}`;
    spr('arte', key, e.x + sh, e.y + bob, { scale: 1.7, face: e.face, flash: fl, img: fl ? undefined : tinted('arte', key, ['#e8b030', '#6a4a30', '#8a8a9a', '#a0a0a0'][e.mi], 'source-atop', 0.35) });
    return;
  }
  if (e.type === 'citta') {
    const bob = e.st === 'walk' ? Math.abs(Math.sin(e.walk * 1.6)) * 4 : 0;
    if (fxs(`nc_${e.ci + (dead ? 4 : 0)}`, e.x, e.y - bob, 150, { face: e.face, flash: fl })) return;
    const key = `robo_${dead ? 5 : e.st === 'atk' ? 3 : [1, 0, 2, 0][Math.floor(e.walk) % 4]}`;
    spr('arte', key, e.x, e.y - bob, { scale: 1.25, face: e.face, flash: fl, img: fl ? undefined : tinted('arte', key, CITTA_TINT[e.ci], 'source-atop', 0.45) });
    return;
  }
  _drawEnemy(e);
};

/* ---------------- city vehicles ---------------- */
const VK = {
  vespa: { name: 'VESPONA', spd: 250, jump: 760, hp: 10 },
  gondola: { name: 'GONDOLA-CANNONE', spd: 300, jump: 620, hp: 10, i: 0 },
  funivia: { name: 'FUNIVIA', spd: 240, fly: true, hp: 10, i: 1 },
  gru: { name: 'CARRELLO-GRU', spd: 220, jump: 0, hp: 12, crate: true, i: 2 },
  traghetto: { name: 'TRAGHETTO', spd: 190, jump: 480, hp: 16, i: 3 },
};
const CITY_VEH = { venezia: 'gondola', dolomiti: 'funivia', genova: 'gru', stretto: 'traghetto' };
const _stepRider = stepRider;
stepRider = function (p, c, dt) {
  const V = S.veh, K = VK[V.kind] || VK.vespa;
  if (V.kind === 'vespa') return _stepRider(p, c, dt);
  V.t += dt; V.cd -= dt; V.flash = Math.max(0, V.flash - dt);
  p.x = V.x; p.y = V.y;
  const dx = (c.r ? 1 : 0) - (c.l ? 1 : 0);
  if (dx) V.face = dx;
  V.x = clamp(V.x + dx * K.spd * dt, S.cam + 110, (S.lock !== null ? S.lock + W : S.cam + W) - 110);
  if (c.pressed.jump && c.d) { dismount(false); return; }
  if (K.fly) { V.y += ((GROUND - 380) - V.y) * Math.min(1, dt * 2.5); V.vy = 0; }
  else {
    if (c.pressed.jump && K.jump && V.y >= GROUND) { V.vy = -K.jump; Audio.sfx('jump'); }
    V.vy += GRAV * dt; V.y = Math.min(GROUND, V.y + V.vy * dt); if (V.y >= GROUND) V.vy = 0;
  }
  V.st = dx ? 'walk' : 'idle'; V.up = !!c.u;
  if (c.fire && V.cd <= 0) {
    V.cd = 0.3; V.shotT = 0.15;
    let vx = V.face * 900, vy = 0;
    if (c.u) { vx = dx ? V.face * 640 : 0; vy = dx ? -640 : -900; }
    else if (K.fly || c.d) { vx = V.face * 600; vy = 600; }   // the cable car shoots down at an angle
    S.shots.push({ id: nid(), x: V.x + V.face * 90, y: V.y - (K.fly ? 40 : 105), vx, vy, w: 'L', by: p, life: 1.5, dmg: V.kind === 'traghetto' ? 5 : 4 });
    Audio.sfx('special');
  }
  if (c.pressed.bomb && (!V.roarCd || V.roarCd <= 0)) {
    V.roarCd = K.crate ? 1.6 : 5;
    if (K.crate) { S.bombs.push({ id: nid(), x: V.x + V.face * 150, y: V.y - 260, vx: V.face * 60, vy: 0, by: p, rot: 0, pow: 2 }); pop(V.x + V.face * 150, V.y - 280, 'CASSA!', '#ffd35a'); Audio.sfx('wind'); }
    else {
      S.fx.push({ k: 'ring', x: V.x, y: V.y - 80, t: 0 }); S.shake = 12; Audio.sfx('siren'); pop(V.x, V.y - 220, V.kind === 'gondola' ? 'SPLASH!' : 'TUUU!', '#ffd35a', 1);
      for (const e of S.enemies) if (e.hp > 0 && Math.abs(e.x - V.x) < 420) hurtEnemy(e, 8, p);
      if (S.boss && Math.abs(S.boss.x - V.x) < 420) hurtBoss(6, p);
      for (const s of S.foeShots) if (s.shootable && Math.abs(s.x - V.x) < 420) s.life = 0;
    }
  }
  V.roarCd = (V.roarCd || 0) - dt;
  if (V.shotT > 0) V.shotT -= dt;
};
EX.drawVehicle = (V) => {
  if (V.kind === 'vespa' || !V.kind) return false;
  const K = VK[V.kind], bob = V.rider && V.st === 'walk' ? Math.abs(Math.sin(T * 12)) * 3 : 0;
  if (K.fly && V.rider) { g.strokeStyle = '#2a1a10'; g.lineWidth = 4; g.beginPath(); g.moveTo(S.cam - 50, GROUND - 470); g.lineTo(S.cam + W + 50, GROUND - 470); g.stroke(); g.beginPath(); g.moveTo(V.x, GROUND - 470); g.lineTo(V.x, V.y - 150); g.stroke(); }
  const vy = V.y - bob, fl = V.flash > 0 && Math.floor(T * 20) % 2 ? 0.7 : 0;
  if (!fxs(`ve_${K.i + (V.wreck ? 4 : 0)}`, V.x, vy, 240, { face: V.face, flash: fl, alpha: V.wreck ? 0.7 : 1 })) {
    const key = V.wreck ? 'vesp_5' : `vesp_${V.rider ? (V.shotT > 0 ? 3 : V.st === 'walk' ? 1 + Math.floor(T * 8) % 2 : 0) : 0}`;
    spr('arte', key, V.x, vy, { scale: 1, face: V.face, flash: fl, img: fl ? undefined : tinted('arte', key, ['#2a3a8a', '#d8402a', '#8a6a30', '#f2ece0'][K.i], 'source-atop', 0.45) });
  }
  if (V.wreck) return true;
  if (V.rider) {
    const R = ROSTER[V.rider.hero];
    spr('arte', `${R.id}_${V.up ? R.F.u : V.shotT > 0 ? R.F.s : R.F.i[0]}`, V.x - V.face * 22, vy - 92, { scale: 0.62, face: V.face });
  } else {
    const by = V.y - 215 + Math.abs(Math.sin(T * 5)) * -18;
    if (fxs('ui_2', V.x, by - 4, 150)) ptitle('SALI!', V.x, by - 14, 20, '#ffffff', '#ff5b4f');
    if (alive().some((p) => Math.abs(p.x - V.x) < 220)) ptxt(`${K.name}: SALTACI SOPRA`, V.x, by + 90, 9, '#ffe3a0', 'center');
  }
  return true;
};

/* vehicles: ram the crates open, and Turin's floor drags them too */
const _stepRider2 = stepRider;
stepRider = function (p, c, dt) {
  _stepRider2(p, c, dt);
  const V = S.veh; if (!V.rider) return;
  if (floorBelt(V.x) && V.y >= GROUND - 1 && !(VK[V.kind] || {}).fly) V.x -= 90 * dt;
  for (const o of S.props) if (o.hp > 0 && Math.abs(o.x - V.x) < 110 && o.y > V.y - 40) { hitProp(o, 99, p); ono(o.x, o.y - 80, o.k === 'barrel' ? 7 : 4, 0.8); }
  for (const q of S.pris) if (q.st === 'tied' && Math.abs(q.x - V.x) < 90 && Math.abs(q.y - V.y) < 60) freePris(q, p);
};

/* ---------------- chaos, like the cartoons: the screen is never quiet ----------------
   - between the waves enemies keep coming (from the right, parachuting from saucers, jumping out of manholes)
   - bosses get angry at half energy: faster, and they call help
   - in the background the citizens run away and saucers fly by with their tractor beams */
const CHAOS = [{ max: 5, every: 2.6 }, { max: 7, every: 2.0 }, { max: 9, every: 1.5 }];
function chaosStep(dt) {
  if (RMODE.rush || S.win) return;
  const C = CHAOS[SAVE.diff] || CHAOS[0];
  // the enemy trickle: never with a locked arena (those are the planned fights) and never at the boss
  if (!S.boss && S.lock === null && S.t > 5) {
    S.chT = (S.chT ?? 3) - dt;
    const n = S.enemies.filter((e) => e.hp > 0).length;
    if (S.chT <= 0 && n < C.max) {
      S.chT = C.every * rand(0.8, 1.3);
      const r = Math.random(), P = pick(alive()); if (!P) return;
      if (r < 0.35) for (let k = 0; k < 1 + (Math.random() < 0.5 ? 1 : 0); k++) { const e = spawnEnemy(pick(['fante', 'fante', 'robo', CITTA_IDX[CITY()] !== undefined ? 'citta' : 'robo']), S.cam + W + 60 + k * 90); e.x = S.cam + W + 60 + k * 90; }
      else if (r < 0.6) {   // parachute from a passing saucer
        const x = clamp(P.x + rand(-300, 400), S.cam + 100, S.cam + W - 100), e = spawnEnemy('fante', x); e.y = -80; e.para = 1; e.x = x;
        S.bg.push({ k: 'ufo', x: x - 300, y: 90, vx: 380, t: 0 });
      }
      else if (r < 0.8) { const e = spawnEnemy('drone', S.cam + (Math.random() < 0.5 ? -60 : W + 60), rand(170, 280)); e.over = true; }
      else { const x = clamp(P.x + rand(250, 450), S.cam + 100, S.cam + W - 60), e = spawnEnemy(MI >= 1 ? 'robo' : 'fante', x); e.x = x; e.y = GROUND + 90; e.pop = 1; S.fx.push({ k: 'smoke', x, y: GROUND, t: 0 }); ono(x, GROUND - 90, 6, 0.6); }
    }
  }
  for (const e of S.enemies) {
    if (e.para && e.hp > 0) { e.y = Math.min(GROUND, e.y + 170 * dt); e.t = 0; if (e.y >= GROUND) e.para = 0; }
    if (e.pop && e.hp > 0) { e.y = Math.max(GROUND, e.y - 400 * dt); if (e.y <= GROUND) e.pop = 0; }
  }
  // angry bosses
  const B = S.boss;
  if (B && !B.dead && B.st !== 'intro') {
    if (!B.angry && B.hp < B.max * 0.5) { B.angry = 1; pop(B.x, B.y - 320, 'SI E ARRABBIATO!', '#ff5b4f', 1); ono(B.x, B.y - 240, 5, 1.4); S.shake = 18; Audio.sfx('roar'); }
    if (B.angry) {
      if (B.st === 'walk') B.cd -= dt * 0.7 * DK().foe;   // shorter pauses between attacks
      B.helpT = (B.helpT ?? 6) - dt;
      if (B.helpT <= 0 && S.enemies.filter((e) => e.hp > 0).length < 2 + SAVE.diff) { B.helpT = 9 - SAVE.diff * 1.5; const x = ARENA_X + (Math.random() < 0.5 ? 80 : W - 80); if (Math.random() < 0.5) { const e = spawnEnemy('drone', x, 200); e.over = true; } else { const e = spawnEnemy('fante', x); e.x = x; e.y = -80; e.para = 1; } }
    }
  }
  // background life
  S.bgT = (S.bgT ?? 1) - dt;
  if (S.bgT <= 0) {
    S.bgT = rand(1.5, 3.5);
    if (Math.random() < 0.55) S.bg.push({ k: 'run', x: S.cam + W + 40, vx: -rand(260, 380), c: Math.floor(Math.random() * 4) + 4, t: 0, y: GROUND + 34 });
    else S.bg.push({ k: 'ufo', x: S.cam - 200, y: rand(70, 150), vx: rand(220, 360), t: 0, beam: Math.random() < 0.5 });
  }
  for (const o of S.bg) { o.t += dt; o.x += o.vx * dt; }
  S.bg = S.bg.filter((o) => o.x > S.cam - 400 && o.x < S.cam + W + 400 && o.t < 12);
}
EX.drawBgLife = () => {
  for (const o of S.bg || []) {
    if (o.k === 'ufo') {
      if (o.beam) { g.save(); g.globalAlpha = 0.25; g.fillStyle = '#fff2b0'; g.beginPath(); g.moveTo(o.x - 12, o.y + 10); g.lineTo(o.x + 12, o.y + 10); g.lineTo(o.x + 60, GROUND - 60); g.lineTo(o.x - 60, GROUND - 60); g.fill(); g.restore(); }
      spr('arte', `disco_${Math.floor(T * 6) % 2}`, o.x, o.y + 40, { scale: 0.45, face: Math.sign(o.vx), alpha: 0.75 });
    } else {   // a citizen running away, arms up, in front of the street
      const b = Math.abs(Math.sin(o.t * 14)) * 10;
      spr('arte', `pris_${o.c}`, o.x, o.y - b, { scale: 0.75, face: -1 });
      if (Math.floor(o.t * 3) % 3 === 0) ptxt(pick(['AIUTO!', 'MAMMA MIA!', 'SCAPPATE!']), o.x, o.y - 120, 8, '#ffffff', 'center');
    }
  }
};

/* ---------------- mission grade ---------------- */
function grade() {
  const tot = S.pris.length || 1, freed = S.pris.filter((q) => q.st !== 'tied').length;
  let pts = (freed / tot) * 40 + Math.max(0, 35 - (S.hurts || 0) * 7) + (S.t < 150 ? 25 : S.t < 210 ? 15 : S.t < 300 ? 8 : 0);
  return { v: pts >= 88 ? 'S' : pts >= 70 ? 'A' : pts >= 50 ? 'B' : 'C', freed, tot, hurts: S.hurts || 0, time: S.t };
}
const VOTO_BONUS = { S: 10000, A: 5000, B: 2000, C: 500 };
function onWin() {
  S.grade = grade();
  const G = S.grade, bonus = VOTO_BONUS[G.v];
  for (const p of S.players) if (!p.out) p.score += Math.round(bonus / S.players.length);
  if (!RMODE.rush) { SAVE.voti[MI] = SAVE.voti[MI] && 'SABC'.indexOf(SAVE.voti[MI]) <= 'SABC'.indexOf(G.v) ? SAVE.voti[MI] : G.v; saveGame(); }
  if (G.v === 'S') award(0);
  if (G.hurts === 0) award(1);
  if (G.freed === G.tot && !RMODE.rush) award(9);
  for (const p of S.players) award(2 + p.hero);
  if (teamScore() >= 100000) award(11);
}
function drawGrade() {
  const G = S.grade; if (!G) return;
  const k = clamp((S.winT - 1.4) / 0.4, 0, 1); if (k <= 0) return;
  panel(W / 2 - 250, 420, 500, 150, '#ffc052');
  ptxt(`PRIGIONIERI ${G.freed}/${G.tot} · CUORI PERSI ${G.hurts} · TEMPO ${fmtTime(G.time)}`, W / 2, 452, 9, '#fff0d0', 'center');
  ptxt(`BONUS VOTO +${VOTO_BONUS[G.v]}`, W / 2, 552, 10, '#ffd35a', 'center');
  const s = 1 + (1 - k) * 2;
  g.save(); g.translate(W / 2, 510); g.rotate(-0.12); g.scale(s, s); g.globalAlpha = k;
  g.strokeStyle = G.v === 'S' ? '#ffd35a' : '#e8483a'; g.lineWidth = 6; g.beginPath(); g.arc(0, -12, 44, 0, 7); g.stroke();
  ptitle(G.v, 0, 8, 52, '#ffffff', G.v === 'S' ? '#e8a020' : '#e8483a'); g.restore();
  if (k === 1 && !S.stamped) { S.stamped = 1; Audio.sfx('stomp'); }
}

/* ---------------- bonus mini-game: catch the saucers ---------------- */
let BON = null;
function startBonus(then) {
  BON = { t: 32, then, d: [], cur: S.players.filter((p) => !p.out).map((p, i) => ({ p, x: W / 2 + (i ? 140 : -140), y: H / 2, cd: 0, pts: 0 })), spawn: 0, intro: 2.5, end: 0 };
  mode = 'bonus'; Audio.playSong(0, 'titolo');
}
function tickBonus() {
  const dt = 1 / 60, B = BON;
  if (B.intro > 0) { B.intro -= dt; DEVICES.forEach(inputOf); return; }
  if (B.end > 0) {
    B.end += dt;
    if (B.end > 1.5 && briefPress()) {
      const tot = B.cur.reduce((a, c) => a + c.pts, 0);
      for (const c of B.cur) { c.p.score += c.pts; if (tot >= 3000) c.p.lives++; }
      mode = 'play'; BON = null; B.then(); return;
    }
    return;
  }
  B.t -= dt; if (B.t <= 0) { B.end = 0.01; Audio.sfx('team'); return; }
  B.spawn -= dt;
  if (B.spawn <= 0) {
    B.spawn = rand(0.35, 0.8); const L = Math.random() < 0.5, r = Math.random();
    B.d.push({ x: L ? -80 : W + 80, y: rand(120, 520), vx: (L ? 1 : -1) * rand(180, 360), ph: rand(0, 6), k: r < 0.1 ? 'oro' : r < 0.22 ? 'nonna' : 'disco', hit: 0 });
  }
  for (const d of B.d) { d.x += d.vx * dt; d.ph += dt * 3; d.y += Math.sin(d.ph) * 40 * dt; if (d.hit) d.hit += dt; }
  B.d = B.d.filter((d) => d.x > -150 && d.x < W + 150 && d.hit < 0.8);
  for (const c of B.cur) {
    const i = inputOf(c.p.dev), sp = 620;
    c.x = clamp(c.x + ((i.r ? 1 : 0) - (i.l ? 1 : 0)) * sp * dt, 20, W - 20); c.y = clamp(c.y + ((i.d ? 1 : 0) - (i.u ? 1 : 0)) * sp * dt, 60, H - 60);
    c.cd -= dt;
    if ((i.fire || i.jump) && c.cd <= 0) {
      c.cd = 0.18; Audio.sfx('shot');
      for (const d of B.d) if (!d.hit && Math.hypot(d.x - c.x, d.y - c.y) < 60) {
        d.hit = 0.01; const v = d.k === 'oro' ? 1000 : d.k === 'nonna' ? -500 : 200; c.pts = Math.max(0, c.pts + v);
        B.pop = { x: d.x, y: d.y, s: d.k === 'nonna' ? 'NO, LA NONNA!' : `+${v}`, t: 0 };
        Audio.sfx(d.k === 'nonna' ? 'hurt' : d.k === 'oro' ? 'fanfara' : 'boing');
        if (d.k === 'disco') { SAVE.stat.dischi++; if (SAVE.stat.dischi >= 50) award(6); }
        break;
      }
    }
  }
  if (B.pop) B.pop.t += dt;
}
function drawBonus() {
  const B = BON; drawCityBack(CITY(), null, 0.35);
  for (const d of B.d) {
    const a = d.hit ? 1 - d.hit / 0.8 : 1, y = d.y + (d.hit ? d.hit * d.hit * 400 : 0);
    if (d.k === 'nonna') {
      g.save(); g.globalAlpha = a; g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(d.x, y - 60); g.lineTo(d.x, y - 10); g.stroke();
      g.fillStyle = '#ff6a7a'; g.beginPath(); g.ellipse(d.x, y - 95, 34, 42, 0, 0, 7); g.fill(); g.lineWidth = 3; g.stroke(); g.restore();
      spr('arte', 'pris_4', d.x, y + 70, { scale: 0.6, alpha: a });
    } else spr('arte', `disco_${d.hit ? 4 : Math.floor(T * 6) % 2}`, d.x, y + 50, { scale: 0.9, face: Math.sign(d.vx), alpha: a, rot: d.hit * 6, img: d.k === 'oro' && !d.hit ? tinted('arte', `disco_${Math.floor(T * 6) % 2}`, '#ffd35a', 'source-atop', 0.55) : undefined });
  }
  B.cur.forEach((c, i) => {
    const col = ROSTER[c.p.hero].color;
    g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(c.x, c.y, 28, 0, 7); g.moveTo(c.x - 40, c.y); g.lineTo(c.x - 14, c.y); g.moveTo(c.x + 14, c.y); g.lineTo(c.x + 40, c.y); g.moveTo(c.x, c.y - 40); g.lineTo(c.x, c.y - 14); g.moveTo(c.x, c.y + 14); g.lineTo(c.x, c.y + 40); g.stroke();
    ptxt(`${i + 1}P ${c.pts}`, i ? W - 30 : 30, 40, 12, col, i ? 'right' : 'left');
  });
  if (B.pop && B.pop.t < 0.8) ptitle(B.pop.s, B.pop.x, B.pop.y - B.pop.t * 60, 16, '#ffffff', B.pop.s.startsWith('NO') ? '#e8483a' : '#e8a020');
  ptitle(String(Math.max(0, Math.ceil(B.t))), W / 2, 60, 34, '#ffffff', '#e8483a');
  if (B.intro > 0) { drawBoard(290, 200, 700, 330, 'ACCHIAPPA I DISCHI!'); txt('Muovi il mirino e spara ai dischi volanti.', W / 2, 300, 22, '#fff0d0', 'center', 700); txt('Quelli d\'oro valgono 1000 · la nonna in mongolfiera NO!', W / 2, 340, 22, '#fff0d0', 'center', 700); txt('3000 punti in squadra: una vita in più a testa.', W / 2, 380, 22, '#ffd35a', 'center', 700); }
  if (B.end > 0) {
    const tot = B.cur.reduce((a, c) => a + c.pts, 0);
    drawBoard(340, 220, 600, 280, 'TEMPO!');
    ptitle(`${tot} PUNTI`, W / 2, 330, 30, '#ffffff', '#e8a020');
    txt(tot >= 3000 ? 'Bravissimi! Una vita in più a testa!' : 'Niente vita in più... sarà per la prossima!', W / 2, 390, 22, '#fff0d0', 'center', 700);
    if (B.end > 1.5 && Math.floor(T * 2) % 2) ptxt('FUOCO: AVANTI', W / 2, 460, 10, '#ffe3a0', 'center');
  }
}

/* ---------------- animated intro (newsreel) ---------------- */
const INTRO = ['CINEGIORNALE DELLO STIVALE · EDIZIONE STRAORDINARIA', 'Una tranquilla notte d\'estate a Roma. Il gelataio chiude, il tram fa l\'ultima corsa...', '...quando il cielo si riempie di DISCHI VOLANTI DI LATTA!', 'Gli abitanti scappano. Ma un giovane lupo con la sciarpa rossa non ha paura. Si chiama REMO.'];
let INT = null;
function startIntro(then) { INT = { t: 0, i: 0, then }; mode = 'intro'; Audio.playSong(0, 'titolo'); }
function tickIntro() {
  INT.t += 1 / 60;
  const full = INTRO[INT.i].length / 35 + 1.4;
  if (briefPress()) { if (INT.t < INTRO[INT.i].length / 35) INT.t = INTRO[INT.i].length / 35; else INT.t = full; }
  if (INT.t >= full) { INT.i++; INT.t = 0; if (INT.i >= INTRO.length) { const f = INT.then; INT = null; SAVE.introSeen = 1; saveGame(); irisTo(f); INT = { t: 99, i: INTRO.length - 1, done: 1 }; } }
}
function drawIntro() {
  const img = IMG.scena_arrivo, tt = (INT.i + INT.t / 5) / INTRO.length;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (img) { const z = 1.25 - tt * 0.25, w = W * z, h = H * z; g.drawImage(img, (W - w) * (0.2 + tt * 0.6), (H - h) * (1 - tt), w, h); }
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, 70); g.fillRect(0, H - 130, W, 130);
  const line = INTRO[Math.min(INT.i, INTRO.length - 1)], shown = INT.done ? line : line.slice(0, Math.floor(INT.t * 35));
  if (INT.i === 0 && !INT.done) ptitle(shown, W / 2, H - 58, 16, '#fff6d6', '#8a5a20');
  else wrapText(shown, 1100, 24).forEach((r, i) => txt(r, W / 2, H - 80 + i * 32, 24, '#fff6e6', 'center', 700));
  ptxt('FUOCO: AVANTI', W - 20, 42, 8, '#8a7a6a', 'right');
}

/* ---------------- silent-film title card ---------------- */
const CARD_SUB = {
  roma: 'in cui i nostri eroi scoprono che le colonne del Foro sanno ridere',
  venezia: 'in cui l\'acqua alta non aspetta nessuno',
  firenze: 'in cui dalle finestre piovono vasi di gerani',
  torino: 'in cui la fabbrica lavora anche di notte',
  genova: 'in cui le gru del porto hanno le mani bucate',
  dolomiti: 'in cui si scivola parecchio',
  stretto: 'in cui non tutto quello che si vede è vero',
  etna: 'in cui fa un caldo da vulcano',
};
let CARD = null;
function drawCard() {
  CARD.t += 1 / 60;
  const M = MISSIONS[MI];
  g.fillStyle = '#0a0806'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#e8dcc0'; g.lineWidth = 4; g.strokeRect(120, 90, W - 240, H - 180); g.lineWidth = 2; g.strokeRect(136, 106, W - 272, H - 212);
  for (const [x, y] of [[136, 106], [W - 136, 106], [136, H - 106], [W - 136, H - 106]]) { g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill(); }
  txt(RMODE.rush ? `BOSS ${RMODE.bi + 1} DI 8` : `~ MISSIONE ${MI + 1} ~`, W / 2, 250, 30, '#e8dcc0', 'center', 800);
  txt(M.city, W / 2, 350, 72, '#f6eedc', 'center', 800);
  txt(M.place, W / 2, 410, 26, '#c8bca0', 'center', 700);
  txt(`...${CARD_SUB[M.bg]}.`, W / 2, 490, 22, '#a89c80', 'center', 600);
  if (typeof RENDERING !== 'undefined' && RENDERING) return;
  if ((CARD.t > 2.6 || (CARD.t > 0.5 && briefPress())) && !IRIS) { CARD = null; mode = 'play'; irisOpen(...heroScreen()); }
}

/* ---------------- touch controls ---------------- */
const TOUCH = { tap: new Set(), on: false, st: { l: 0, r: 0, u: 0, d: 0, fire: 0, jump: 0, bomb: 0, start: 0 }, stick: null, btn: {} };
const TBTN = [['fire', 1110, 590, 62, 'FUOCO', '#e8483a'], ['jump', 1200, 470, 54, 'SALTO', '#4a8ad8'], ['bomb', 1010, 470, 46, 'BOMBA', '#8ad848'], ['start', 1210, 60, 34, 'II', '#8a7a6a']];
function touchXY(t) { const r = canvas.getBoundingClientRect(); return [(t.clientX - r.left) / r.width * W, (t.clientY - r.top) / r.height * H]; }
function touchUpdate(e) {
  e.preventDefault(); TOUCH.on = true; Audio.unlock();
  const st = TOUCH.st; for (const k in st) st[k] = 0;
  let stick = null;
  for (const t of e.touches) {
    const [x, y] = touchXY(t);
    if (x < W * 0.45 && y > H * 0.3) { if (!TOUCH.stick || !TOUCH.stickId || TOUCH.stickId !== t.identifier) { if (!TOUCH.stick || TOUCH.stickId !== t.identifier) TOUCH.stick = { x0: x, y0: y }; TOUCH.stickId = t.identifier; } stick = { x, y }; continue; }
    for (const [k, bx, by, r] of TBTN) if (Math.hypot(x - bx, y - by) < r * 1.35) { st[k] = 1; if (e.type === 'touchstart') TOUCH.tap.add(k); }
  }
  if (stick && TOUCH.stick) {
    const dx = stick.x - TOUCH.stick.x0, dy = stick.y - TOUCH.stick.y0;
    if (dx < -25) st.l = 1; if (dx > 25) st.r = 1; if (dy < -30) st.u = 1; if (dy > 30) st.d = 1;
    TOUCH.stick.x = stick.x; TOUCH.stick.y = stick.y;
  } else { TOUCH.stick = null; TOUCH.stickId = null; }
}
for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) canvas.addEventListener(ev, touchUpdate, { passive: false });
DEVICES.push('touch');
const _readDevice = readDevice;
readDevice = function (dev) {
  if (dev !== 'touch') return _readDevice(dev);
  const o = { ...TOUCH.st }; for (const k of TOUCH.tap) o[k] = 1;   // a quick tap is never lost
  if (TOUCH.tapHeld) TOUCH.tap.clear(); TOUCH.tapHeld = TOUCH.tap.size > 0; return o;
};
function drawTouch() {
  if (!TOUCH.on) return;
  g.save(); g.globalAlpha = 0.45;
  const s = TOUCH.stick || { x0: 200, y0: 560, x: 200, y: 560 };
  g.fillStyle = '#000'; g.beginPath(); g.arc(s.x0, s.y0, 80, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(s.x0 + clamp((s.x ?? s.x0) - s.x0, -60, 60), s.y0 + clamp((s.y ?? s.y0) - s.y0, -60, 60), 34, 0, 7); g.fill();
  for (const [k, x, y, r, label, col] of TBTN) { g.fillStyle = TOUCH.st[k] ? '#fff' : col; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); g.globalAlpha = 0.9; ptxt(label, x, y + 5, r > 40 ? 9 : 10, '#fff', 'center'); g.globalAlpha = 0.45; }
  g.restore();
}

/* ---------------- the city bonus (one per level, beats that city's trap) ---------------- */
const PERKS = {
  roma: ['SCUDO DEL LEGIONARIO', 'PARA 3 COLPI E I PEZZI DI COLONNA', 'tro_10'],
  venezia: ['PINNE DA GONDOLIERE', 'NON AFFOGHI E CORRI NELL\'ACQUA', 'tro_1'],
  firenze: ['OMBRELLO FIORENTINO', 'I VASI RIMBALZANO · TIENI SALTO PER PLANARE', 'tro_0'],
  torino: ['SCARPE TURBO', 'CORRI PIU VELOCE', 'tro_9'],
  genova: ['ELMETTO DA PORTUALE', 'LE CASSE DELLE GRU NON TI FANNO NIENTE', 'tro_9'],
  dolomiti: ['SCARPONI CHIODATI', 'NON SCIVOLI E LE PALLE DI NEVE RIMBALZANO', 'tro_5'],
  stretto: ['OCCHIALI DEL GUFO', 'VEDI I MIRAGGI E IL VENTO NON TI SPOSTA', 'tro_6'],
  etna: ['TUTA IGNIFUGA', 'LA LAVA NON TI BRUCIA', 'tro_2'],
};
function placePerk() {
  const P = PLATFORMS.filter((q) => !q.fall && q[0] > ARENA_X * 0.3 && q[0] < ARENA_X * 0.7).sort((a, b) => a[2] - b[2])[0] || PLATFORMS[Math.floor(PLATFORMS.length / 2)];
  if (P) S.items.push({ id: nid(), x: P[0] + P[1] / 2, y: P[2] - 30, vy: 0, k: 'perk', fixed: true });
}
EX.drawPerk = (it, b) => {
  const [, , ic] = PERKS[CITY()] || PERKS.roma, y = it.y - 50 + b * 2, r = 40 + Math.sin(T * 5) * 3;
  g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,220,120,.35)'; g.beginPath(); g.arc(it.x, y, r + 16, 0, 7); g.fill(); g.restore();
  if (!fxs(ic, it.x, y + 34, 76)) { g.fillStyle = '#e0a848'; g.beginPath(); g.arc(it.x, y, r, 0, 7); g.fill(); }
  ptxt('BONUS', it.x, y - 54, 9, '#ffd35a', 'center');
};
EX.takePerk = (p, it) => {
  const [name, desc] = PERKS[CITY()] || PERKS.roma;
  p.perk = CITY(); if (p.perk === 'roma') p.shield = 3;
  pop(it.x, it.y - 120, name + '!', '#ffd35a', 1); pop(it.x, it.y - 80, desc, '#fff0d0'); Audio.sfx('fanfara');
};

/* ---------------- hooks into the game ---------------- */
const _newGame = newGame;
newGame = function (players, mi = 0, keep = null) {
  _newGame(players, mi, keep);
  S.banner = null; S.hurts = 0; S.freeze = 0; S.bg = [];
  const kind = RMODE.rush ? 'vespa' : CITY_VEH[CITY()] || 'vespa';
  Object.assign(S.veh, { kind, hp: VK[kind].hp, max: VK[kind].hp });
  placePerk();
  // food: two plates on the platforms
  const P = PLATFORMS; if (P.length > 3) for (const q of [P[2], P[P.length - 3]]) S.items.push({ id: nid(), x: q[0] + q[1] / 2, y: q[2] - 40, vy: 0, k: 'cibo', c: Math.floor(Math.random() * 8) });
  // the mini-boss joins the arena closest to the middle of the level
  if (!RMODE.rush) {
    let best = null; for (const w of WAVES) if (w.lock && (!best || Math.abs(w.x - ARENA_X / 2) < Math.abs(best.x - ARENA_X / 2))) best = w;
    if (best) best.spawn.push(['mini', 360]);
    // the city's own robots
    if (CITTA_IDX[CITY()] !== undefined) for (const w of WAVES) for (const s of w.spawn) if (s[0] === 'fante' && Math.random() < 0.4) s[0] = 'citta';
  }
};
const _boom = boom;
boom = function (x, y, r = 1) { _boom(x, y, r); if (r >= 1.1 && Math.random() < 0.7) ono(x, y - 60, [1, 7, 4][Math.floor(Math.random() * 3)], Math.min(1.4, r)); if (r >= 1.3) freeze(0.05); };
const _hurtEnemy = hurtEnemy;
hurtEnemy = function (e, dmg, by) {
  const was = e.hp > 0; _hurtEnemy(e, dmg, by);
  if (!was || e.hp > 0 || e.mirage) return;
  if (e.type === 'mini') { if (by && by.score !== undefined) by.score += 3000; S.mini = null; boom(e.x, e.y - 120, 1.8); freeze(0.25); pop(e.x, e.y - 260, 'MINI-BOSS SCONFITTO!', '#ffd35a', 1); dropFood(e.x, e.y - 80); }
  if (e.type === 'fante' || e.type === 'uff' || e.type === 'citta') S.fx.push({ k: 'casco', x: e.x, y: e.y - 110, vx: rand(-160, 160), vy: -520, rot: 0, t: 0 });
  if (e.type === 'bruto') { ono(e.x, e.y - 150, 5); freeze(0.06); }
  else if (Math.random() < 0.18) ono(e.x, e.y - 120, [2, 6, 3][Math.floor(Math.random() * 3)], 0.7);
  if (e.type === 'drone') { SAVE.stat.dischi++; if (SAVE.stat.dischi >= 50) award(6); }
  if (by && S.veh.rider === by) { SAVE.stat.veicolo++; if (SAVE.stat.veicolo >= 30) award(8); }
};
const _hurtBoss = hurtBoss;
hurtBoss = function (dmg, by) { const B = S.boss, was = B && !B.dead; _hurtBoss(dmg, by); if (was && B.dead) { freeze(0.4); ono(B.x, B.y - 200, 7, 1.6); } else if (was && dmg >= 6) { freeze(0.04); ono(B.x, B.y - 180, 3); } };
const _kill = kill;
kill = function (p) { const b = [p.hp, p.dead]; _kill(p); if (p.hp !== b[0] || p.dead !== b[1]) { S.hurts = (S.hurts || 0) + 1; freeze(0.08); } };
const _freePris = freePris;
freePris = function (q, by) { _freePris(q, by); const P = S.pops[S.pops.length - 1]; if (P && P.s === 'GRAZIE!') P.s = pick(DIALETTO[CITY()] || ['GRAZIE!']); if (!RMODE.rush && S.pris.every((x) => x.st !== 'tied')) pop(q.x, q.y - 200, 'TUTTI LIBERI!', '#7bf0b1', 1); };
const _hitProp = hitProp;
hitProp = function (o, dmg, by) { const was = o.hp > 0; _hitProp(o, dmg, by); if (was && o.hp <= 0 && o.k === 'crate' && Math.random() < 0.35) { const it = S.items[S.items.length - 1]; if (it && it.k !== 'cibo') { it.k = 'cibo'; it.c = Math.floor(Math.random() * 8); } } };
const _stepPlayer = stepPlayer;
stepPlayer = function (p, c, dt) { if (p.out && RMODE.arcade) return; _stepPlayer(p, c, dt); };
const _step = step;
step = function (dt) {
  onoCd -= dt;
  if (S.freeze > 0) { S.freeze -= dt; return; }
  if (IRIS && IRIS.ph === 'close') return;
  RMODE.t += RMODE.rush && !S.win ? dt : 0;
  const w = S.win; _step(dt);
  if (!S) return;
  if (mode === 'play') chaosStep(dt);
  if (EX.stepParaPris) EX.stepParaPris(dt);
  if (!w && S.win) onWin();
  for (const f of S.fx) if (f.k === 'casco') { f.vy += 1500 * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vx * dt * 0.05; if (f.y > GROUND - 17) { f.y = GROUND - 17; f.vy *= -0.4; f.vx *= 0.7; } }
  S.fx = S.fx.filter((f) => f.k !== 'casco' || f.t < 2.2);
  for (const f of S.fx) if (f.k === 'ono' && f.t > 0.7) f.dead = 1;
  S.fx = S.fx.filter((f) => !f.dead);
};
/* the fx lifetimes of the base game drop unknown kinds after 0.6s: keep ours alive */
const _nextMission = nextMission;
nextMission = function () {
  if (S && S.leaving) return; if (S) S.leaving = true;
  const go = () => {
    if (RMODE.rush) {
      if (RMODE.bi < 7) { RMODE.bi++; const keep = S.players; launchRush(keep.map((p) => ({ dev: p.dev, hero: p.hero })), keep); return; }
      if (!SAVE.rushBest || RMODE.t < SAVE.rushBest) SAVE.rushBest = RMODE.t; saveGame(); endRunModes(); finishRun('end'); return;
    }
    if (MI === 7) award(10);
    if ([1, 5].includes(MI) && S) { startBonus(() => _nextMission()); return; }
    _nextMission();
  };
  irisTo(go, ...heroScreen());
};
const _tickBrief = tickBrief;
tickBrief = function (dt) { _tickBrief(dt); if (mode === 'play') { mode = 'cartello'; CARD = { t: 0 }; } };
const _startBrief = startBrief;
startBrief = function (mi, fresh = false) {
  if (RMODE.rush) { const slots = S ? S.players.map((p) => ({ dev: p.dev, hero: p.hero })) : sel.slots.map((s) => ({ dev: s.dev, hero: s.hero })); RMODE.bi = 0; RMODE.t = 0; launchRush(slots, null); return; }
  if (mi === 0 && !S && !SAVE.introSeen) { startIntro(() => _startBrief(mi, fresh)); return; }
  _startBrief(mi, fresh);
};
function launchRush(slots, keep) {
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  _newGame(slots, order[RMODE.bi], keep);
  S.banner = null; S.hurts = 0; S.freeze = 0; Object.assign(S.veh, { kind: 'vespa', wreck: true });
  S.cam = ARENA_X; S.lock = ARENA_X; S.wave = 999; S.enemies = []; S.props = []; S.pris = []; S.items = [];
  S.players.forEach((p, i) => { p.x = ARENA_X + 200 + i * 90; });
  startBoss(); S.banner = null;
  mode = 'cartello'; CARD = { t: 0 };
}
const _drawHUD = drawHUD;
drawHUD = function () {
  _drawHUD();
  if (S.mini && S.mini.hp > 0 && !S.boss) { panel(W / 2 - 220, H - 56, 440, 40, '#ff8a3a'); ptxt(MINI_NAMES[S.mini.mi], W / 2 - 204, H - 38, 9, '#ffe0a0'); bar(W / 2 - 204, H - 30, 408, 8, S.mini.hp / S.mini.max, '#ff8a3a'); }
  if (RMODE.rush) ptxt(`TEMPO ${fmtTime(RMODE.t)}`, W / 2, 80, 12, '#ffd35a', 'center');
  S.players.forEach((p, i) => { if (p.perk && !p.out) ptxt(PERKS[p.perk][0] + (p.perk === 'roma' ? ` ${p.shield || 0}` : ''), i ? W - 160 : 160, 120, 8, '#ffd35a', 'center'); });
  if (S.water && S.water.h > 0.6) S.players.forEach((p) => { if (p.air < 1.55 && !p.dead) { const x = p.x - S.cam; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x - 30, p.y - 200, 60, 8); g.fillStyle = '#7ec8ff'; g.fillRect(x - 30, p.y - 200, 60 * p.air / 1.6, 8); } });
  if (S.win) drawGrade();
  if (EX.drawBossWarn) EX.drawBossWarn();
  if (S.boss && !S.boss.dead && S.boss.st !== 'intro') ptxt(S.boss.angry ? 'FASE 2 - ARRABBIATO!' : 'FASE 1', W / 2, H - 98, 9, S.boss.angry ? '#ff8a7a' : '#ffe0a0', 'center');
};
const _draw = draw;
draw = function () {
  // world extras are drawn by the base draw through the fx list (see drawFxExtra)
  _draw();
};
EX.drawFxExtra = () => { for (const f of S.fx) { if (f.k === 'ono') drawOno(f); else if (f.k === 'casco') drawHelmet(f); } };
EX.overlay = (dt) => {
  if (mode === 'cartello') { if (!CARD) CARD = { t: 0 }; drawCard(); }
  if (mode !== 'netclient') drawIris(dt);
  if (TPOP) { TPOP.t += dt; const a = clamp(Math.min(TPOP.t * 4, (4 - TPOP.t) * 2), 0, 1); g.save(); g.globalAlpha = a; drawBoard(W / 2 - 260, 150, 520, 100); drawMedal(TPOP.i, W / 2 - 200, 190, 50, true); ptxt('TROFEO!', W / 2 - 150, 186, 10, '#ffd35a'); ptxt(TROFEI[TPOP.i][0], W / 2 - 150, 216, 12, '#ffffff'); g.restore(); if (TPOP.t > 4) TPOP = null; }
  drawTouch();
  if (mode === 'title' && (RMODE.rush || RMODE.arcade)) endRunModes();
};
Object.assign(MENUS, { trofei: [tickTrofei, drawTrofei], extra: [tickExtra, drawExtra], bonus: [tickBonus, drawBonus], intro: [tickIntro, drawIntro] });
Object.assign(window.Stivale, { EX, RMODE, startBonus, irisTo, award });
Object.defineProperty(window.Stivale, 'BON', { get: () => BON });
