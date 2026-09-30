'use strict';
/* ============================================================
   MENU: titolo, come si gioca, record, opzioni, tasti, pausa.
   Tutti i riquadri sono "insegne da luna park": legno scuro, cornice
   d'ottone e lampadine che si accendono a turno.
   ============================================================ */
const ACTIONS = [['l', 'SINISTRA'], ['r', 'DESTRA'], ['u', 'SU / MIRA IN ALTO'], ['d', 'GIU / ACCOVACCIATI'], ['fire', 'FUOCO'], ['jump', 'SALTO'], ['bomb', 'GRANATA'], ['start', 'PAUSA / START']];
const PAD_ACTIONS = [['fire', 'FUOCO'], ['jump', 'SALTO'], ['bomb', 'GRANATA'], ['start', 'PAUSA / START']];
const DEF_KEYS = JSON.stringify({ kb: KEYSETS, pad: PADSET });
(function loadKeys() {
  try {
    const v = JSON.parse(localStorage.getItem('tasti') || 'null'); if (!v) return;
    v.kb.forEach((K, i) => Object.assign(KEYSETS[i], K)); Object.assign(PADSET, v.pad);
  } catch (e) {}
})();
function saveKeys() { try { localStorage.setItem('tasti', JSON.stringify({ kb: KEYSETS, pad: PADSET })); } catch (e) {} }
function resetKeys() { const v = JSON.parse(DEF_KEYS); v.kb.forEach((K, i) => Object.assign(KEYSETS[i], K)); Object.assign(PADSET, v.pad); saveKeys(); }
const PADNAMES = ['A / CROCE', 'B / CERCHIO', 'X / QUADRATO', 'Y / TRIANGOLO', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2', 'SELECT', 'START', 'L3', 'R3'];
const padLabel = (i) => PADNAMES[i] || `TASTO ${i}`;
const ARROWS = { ArrowLeft: 'FRECCIA SX', ArrowRight: 'FRECCIA DX', ArrowUp: 'FRECCIA SU', ArrowDown: 'FRECCIA GIU', Backspace: 'CANC', Enter: 'INVIO' };
const keyName = (c) => ARROWS[c] || String(codeLabel(c)).replace(/[^A-Z0-9 .,+<\-\\]/gi, '?');
const keysLabel = (list) => list.slice(0, 2).map(keyName).join(' / ') || '-';

/* ---------- the board: dark wood, brass frame, running light bulbs ---------- */
function drawBoard(x, y, w, h, title) {
  g.save();
  g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.roundRect(x + 8, y + 10, w, h, 22); g.fill();
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#4a1c14'); gr.addColorStop(1, '#2a0e0a');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 22); g.fill();
  g.lineWidth = 8; g.strokeStyle = '#1a0806'; g.stroke();
  g.lineWidth = 5; g.strokeStyle = '#e0a848'; g.beginPath(); g.roundRect(x + 7, y + 7, w - 14, h - 14, 16); g.stroke();
  g.lineWidth = 2; g.strokeStyle = '#8a5a20'; g.beginPath(); g.roundRect(x + 16, y + 16, w - 32, h - 32, 12); g.stroke();
  // bulbs around
  const pts = [], step = 34;
  for (let k = x + 24; k <= x + w - 24; k += step) { pts.push([k, y + 7]); }
  for (let k = y + 24; k <= y + h - 24; k += step) pts.push([x + w - 7, k]);
  for (let k = x + w - 24; k >= x + 24; k -= step) pts.push([k, y + h - 7]);
  for (let k = y + h - 24; k >= y + 24; k -= step) pts.push([x + 7, k]);
  pts.forEach(([bx, by], i) => {
    const on = (i + Math.floor(T * 8)) % 3 === 0;
    g.fillStyle = on ? '#fff6c0' : '#c88a30'; g.beginPath(); g.arc(bx, by, 5, 0, 7); g.fill();
    if (on) { g.fillStyle = 'rgba(255,230,140,.35)'; g.beginPath(); g.arc(bx, by, 10, 0, 7); g.fill(); }
  });
  g.restore();
  if (title) { const rw = Math.min(500, w + 100); fxBox('ui_5', x + w / 2 - rw / 2, y - 70, rw, 106); ptitle(title, x + w / 2, y - 10, rw < 450 ? 20 : 26, '#fff6d6', '#e8483a'); }
}
function menuItem(text, x, y, on, size = 22) {
  const b = on ? Math.sin(T * 8) * 3 : 0;
  const off = text.length * (on ? size + 4 : size) * 0.5 + 34;
  if (on) { fxs('ui_6', x - off, y - 10 + b, 30, { rot: T * 3 }); fxs('ui_6', x + off, y - 10 + b, 30, { rot: -T * 3 }); }
  ptitle(text, x, y + b, on ? size + 4 : size, on ? '#ffffff' : '#f2e2c0', on ? '#e8483a' : '#6a3a20');
}
function menuNav(sel, n) {   // shared navigation for every menu: returns {sel, dx, ok, back}
  const r = { sel, dx: 0, ok: false, back: HITS.delete('Escape') };
  for (const d of DEVICES) {
    const c = inputOf(d);
    if (c.pressed.u) { r.sel = (r.sel + n - 1) % n; Audio.sfx('select'); }
    if (c.pressed.d) { r.sel = (r.sel + 1) % n; Audio.sfx('select'); }
    if (c.pressed.l) r.dx = -1; if (c.pressed.r) r.dx = 1;
    if (c.pressed.fire || c.pressed.jump || c.pressed.start) { r.ok = true; r.dev = d; }
    if (c.pressed.bomb) r.back = true;
  }
  return r;
}

/* ---------- title menu ---------- */
function titleRows() { return [['gioca', 'GIOCA'], ...(SAVE.max > 0 ? [['missione', '']] : []), ...(SAVE.won ? [['extra', 'EXTRA']] : []), ['online', 'COOP ONLINE'], ['come', 'COME SI GIOCA'], ['record', 'RECORD'], ['trofei', 'TROFEI'], ['opzioni', 'OPZIONI']]; }
function titleMenuInput() {
  const rows = titleRows(); tsel.row = Math.min(tsel.row, rows.length - 1);
  const n = menuNav(tsel.row, rows.length); tsel.row = n.sel;
  const what = rows[tsel.row][0];
  if (n.dx && what === 'missione') { tsel.mi = clamp(tsel.mi + n.dx, 0, SAVE.max); Audio.sfx('select'); }
  if (!n.ok) return;
  Audio.sfx('confirm');
  if (what === 'gioca' || what === 'missione') { mode = 'select'; sel = { slots: [{ dev: n.dev, hero: 0, ready: false }] }; }
  else if (what === 'come') { mode = 'come'; menuS.page = 0; }
  else if (what === 'record') mode = 'record';
  else if (what === 'trofei') mode = 'trofei';
  else if (what === 'extra') mode = 'extra';
  else if (what === 'online') { mode = 'online'; onl.sel = 0; }
  else { mode = 'opzioni'; menuS.opt = 0; menuS.back = 'title'; }
}
function drawTitleMenu() {
  const rows = titleRows();
  const gr = g.createLinearGradient(0, 270, 0, 330 + rows.length * 56); gr.addColorStop(0, 'rgba(4,6,14,0)'); gr.addColorStop(0.3, 'rgba(4,6,14,.55)'); gr.addColorStop(1, 'rgba(4,6,14,.55)');
  g.fillStyle = gr; g.fillRect(W / 2 - 380, 260, 760, rows.length * 50 + 50);
  rows.forEach(([k, label], i) => {
    const text = k === 'missione' ? `< MISSIONE ${tsel.mi + 1}: ${MISSIONS[tsel.mi].city} >` : label;
    menuItem(text, W / 2, 300 + i * 46, tsel.row === i, 19);
  });
  ptxt('FRECCE O LEVETTA: SCEGLI · FUOCO: CONFERMA · GRANATA: INDIETRO', W / 2, 690, 9, '#e8d8b8', 'center');
}

/* ---------- how to play ---------- */
const menuS = { page: 0, opt: 0, back: 'title', set: 0, row: 0, wait: false, pause: 0 };
function tickCome() {
  const n = menuNav(0, 1);
  if (n.dx) { menuS.page = (menuS.page + n.dx + 3) % 3; Audio.sfx('select'); }
  if (n.ok) { if (menuS.page < 2) { menuS.page++; Audio.sfx('select'); } else { mode = 'title'; Audio.sfx('confirm'); } }
  if (n.back) { mode = 'title'; Audio.sfx('select'); }
}
function drawCome() {
  drawMenuBack();
  drawBoard(90, 110, W - 180, 540, 'COME SI GIOCA');
  const P = menuS.page, L = 150, ink = '#fff0d0', dim = '#e0b870';
  ptxt(['1 · I COMANDI', '2 · LE REGOLE', '3 · NEMICI E TRAPPOLE'][P], W / 2, 175, 12, '#ffd35a', 'center');
  if (P === 0) {
    const cols = [[520, '1P TASTIERA'], [760, '2P TASTIERA'], [1000, 'JOYPAD']];
    cols.forEach(([x, t]) => ptxt(t, x, 220, 10, '#ffd35a', 'center'));
    const padDir = { l: 'LEVETTA / CROCE', r: 'LEVETTA / CROCE', u: 'LEVETTA / CROCE', d: 'LEVETTA / CROCE' };
    ACTIONS.forEach(([k, name], i) => {
      const y = 262 + i * 36;
      txt(name, L, y, 18, ink, 'left', 700);
      ptxt(keysLabel(KEYSETS[0][k]), 520, y, 10, '#ffffff', 'center');
      ptxt(keysLabel(KEYSETS[1][k]), 760, y, 10, '#ffffff', 'center');
      ptxt(padDir[k] || PADSET[k].map(padLabel).slice(0, 2).join(' / '), 1000, y, 9, '#ffffff', 'center');
    });
    txt('SU + FUOCO spara in alto · in aria GIU + FUOCO spara in basso · GIU + SALTO su una piattaforma: scendi.', W / 2, 580, 17, dim, 'center', 700);
    txt('I tasti si cambiano da OPZIONI.', W / 2, 606, 17, dim, 'center', 700);
  } else if (P === 1) {
    const R = [
      [() => fxs('obj_1', L + 40, 262, 70), 'Le casse con le armi: H mitragliatrice, S a rosa, F lanciafiamme, R razzi. Le lasciano i prigionieri liberati.'],
      [() => spr('arte', 'pris_0', L + 40, 340, { scale: 0.55 }), 'I prigionieri legati: sparagli per liberarli (vale 1000 punti).'],
      [() => fxs('obj_5', L + 40, 390, 40), 'Granate: poche ma fortissime. Contro i boss sono la cosa migliore.'],
      [() => spr('arte', 'vesp_0', L + 40, 470, { scale: 0.42 }), 'La Vespona: saltaci sopra. FUOCO cannone (SU per sparare in alto), GRANATA clacson, GIU + SALTO per scendere.'],
      [() => { fxs('ui_7', L + 25, 520, 22); fxs('ui_7', L + 55, 520, 22); }, `Ogni vita ha dei cuori (in ${DK().name}: ${DK().hp}). Il cibo italiano ridà un cuore. Finiti i cuori perdi una vita.`],
      [() => fxs('ui_6', L + 40, 572, 34), 'I boss hanno delle mosse fisse: quando hanno le stelline in testa sono stanchi e prendono più danni.'],
    ];
    R.forEach(([ic, t], i) => { ic(); for (const [j, row] of wrapText(t, 820, 17).entries()) txt(row, L + 110, 262 + i * 62 + j * 22 - (wrapText(t, 820, 17).length > 1 ? 10 : 0), 17, ink, 'left', 700); });
  } else {
    const R = [
      [() => spr('arte', 'robo_0', L + 40, 285, { scale: 0.6 }), 'Robottino: tira scintille basse. SALTA.'],
      [() => spr('arte', 'uff_3', L + 40, 345, { scale: 0.5 }), 'Ufficiale: urla col megafono. Urlo ALTO: abbassati · urlo BASSO: salta.'],
      [() => spr('arte', 'disco_0', L + 40, 400, { scale: 0.5 }), 'Disco volante: ti gira intorno e poi sgancia bombe. Spara in alto!'],
      [() => spr('arte', 'leg_0', L + 40, 465, { scale: 0.42 }), 'Legionario: carica a testa bassa. Salta o lanciagli una granata.'],
    ];
    R.forEach(([ic, t], i) => { ic(); txt(t, L + 110, 262 + i * 62, 17, ink, 'left', 700); });
    txt('Trappole: Roma colonne che cadono · Venezia acqua alta (sali sui pontili o affoghi!) · Firenze vasi', W / 2, 520, 16, dim, 'center', 700);
    txt('Torino nastri · Genova casse dalle gru · Dolomiti ghiaccio e valanghe · Stretto miraggi e vento · Etna lava', W / 2, 546, 16, dim, 'center', 700);
    txt('In ogni città c\'è un BONUS dorato su una piattaforma: ti protegge dalla trappola di quella città.', W / 2, 580, 16, '#ffd35a', 'center', 700);
  }
  ptxt(`< ${P + 1} / 3 >   SINISTRA/DESTRA: PAGINA · GRANATA: INDIETRO`, W / 2, 628, 9, '#ffe3a0', 'center');
}

/* ---------- records ---------- */
function tickRecord() { const n = menuNav(0, 1); if (n.ok || n.back) { mode = 'title'; Audio.sfx('select'); } }
function drawRecordScreen() {
  drawMenuBack();
  drawBoard(340, 150, 600, 500, 'RECORD');
  const R = SAVE.record;
  if (!R.length) ptxt('ANCORA NESSUNO... TOCCA A TE!', W / 2, 380, 12, '#ffe3a0', 'center');
  R.slice(0, 8).forEach((r, i) => {
    const y = 230 + i * 48, col = i === 0 ? '#ffd35a' : i < 3 ? '#fff0d0' : '#e0b870';
    ptitle(`${i + 1}`, 420, y, 20, '#ffffff', i === 0 ? '#e8483a' : '#6a3a20');
    ptxt(r.n, 480, y, 16, col); ptxt(String(r.s).padStart(7, '0'), 860, y, 16, col, 'right');
    if (r.m) ptxt(`MIS. ${r.m}`, 700, y, 9, '#c89860', 'center');
  });
  ptxt('FUOCO: INDIETRO', W / 2, 680, 9, '#ffe3a0', 'center');
}

/* ---------- options ---------- */
function optRows() { return [['diff', 'DIFFICOLTA'], ['mus', 'MUSICA'], ['sfx', 'EFFETTI'], ['k0', 'TASTI GIOCATORE 1'], ['k1', 'TASTI GIOCATORE 2'], ['pad', 'TASTI JOYPAD'], ['reset', 'RIPRISTINA I TASTI'], ['back', 'INDIETRO']]; }
function tickOpzioni() {
  const rows = optRows(), n = menuNav(menuS.opt, rows.length); menuS.opt = n.sel;
  const k = rows[menuS.opt][0];
  if (n.dx) {
    if (k === 'diff') { SAVE.diff = clamp(SAVE.diff + n.dx, 0, 2); saveGame(); Audio.sfx('select'); }
    if (k === 'mus') { Audio.setVolumes(clamp(Math.round(Audio.musicVol * 10) + n.dx, 0, 10) / 10, Audio.sfxVol); }
    if (k === 'sfx') { Audio.setVolumes(Audio.musicVol, clamp(Math.round(Audio.sfxVol * 10) + n.dx, 0, 10) / 10); Audio.sfx('pickup'); }
  }
  if (n.ok) {
    Audio.sfx('confirm');
    if (k === 'k0' || k === 'k1' || k === 'pad') { mode = 'tasti'; menuS.set = k === 'pad' ? 'pad' : +k[1]; menuS.row = 0; menuS.wait = false; }
    if (k === 'reset') { resetKeys(); menuS.flash = 1.5; }
    if (k === 'back') mode = menuS.back;
  }
  if (n.back) mode = menuS.back;
  menuS.flash = Math.max(0, (menuS.flash || 0) - 1 / 60);
}
function volBar(v, x, y) { for (let i = 0; i < 10; i++) { g.fillStyle = i < Math.round(v * 10) ? '#ffd35a' : 'rgba(255,255,255,.15)'; g.fillRect(x + i * 22, y - 18, 16, 22); } }
function drawOpzioni() {
  if (menuS.back === 'pausa' && S) { draw(); g.fillStyle = 'rgba(4,6,14,.6)'; g.fillRect(0, 0, W, H); } else drawMenuBack();
  drawBoard(240, 130, 800, 530, 'OPZIONI');
  optRows().forEach(([k, label], i) => {
    const y = 210 + i * 54, on = menuS.opt === i;
    if (on) { g.fillStyle = 'rgba(255,210,90,.14)'; g.fillRect(270, y - 34, 740, 48); }
    ptxt(label, 300, y, 13, on ? '#ffffff' : '#e0b870');
    if (k === 'diff') ptxt(`< ${DK().name} >   ${DK().lives} VITE · ${DK().hp} CUORI`, 980, y, 11, '#ffd35a', 'right');
    if (k === 'mus') volBar(Audio.musicVol, 760, y);
    if (k === 'sfx') volBar(Audio.sfxVol, 760, y);
    if (k === 'reset' && menuS.flash > 0) ptxt('FATTO!', 980, y, 11, '#7bf0b1', 'right');
  });
  ptxt('SU/GIU: SCEGLI · SINISTRA/DESTRA: CAMBIA · FUOCO: APRI · GRANATA: INDIETRO', W / 2, 690, 9, '#ffe3a0', 'center');
}

/* ---------- key mapping ---------- */
let PADPREV = null;
function tickTasti() {
  const pad = menuS.set === 'pad', rows = (pad ? PAD_ACTIONS : ACTIONS).length + 1;
  if (menuS.wait) {
    if (HITS.has('Escape')) { HITS.delete('Escape'); menuS.wait = false; return; }
    if (pad) {   // the first button pressed on any joypad
      const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
      const now = pads.map((p) => p.buttons.map((b) => b.pressed));
      if (PADPREV) now.forEach((bs, pi) => bs.forEach((on, bi) => {
        if (on && !(PADPREV[pi] && PADPREV[pi][bi]) && menuS.wait && bi < 12 && ![12, 13, 14, 15].includes(bi)) {
          const k = PAD_ACTIONS[menuS.row][0];
          for (const a in PADSET) PADSET[a] = PADSET[a].filter((x) => x !== bi);   // one button, one action
          PADSET[k] = [bi]; saveKeys(); menuS.wait = false; Audio.sfx('confirm'); menuS.cool = 0.4;
        }
      }));
      PADPREV = now;
    }
    return;
  }
  if ((menuS.cool = Math.max(0, (menuS.cool || 0) - 1 / 60)) > 0) { DEVICES.forEach(inputOf); return; }
  const n = menuNav(menuS.row, rows); menuS.row = n.sel;
  if (n.back) { mode = 'opzioni'; return; }
  if (n.ok) {
    if (menuS.row === rows - 1) { mode = 'opzioni'; Audio.sfx('select'); return; }
    menuS.wait = true; PADPREV = null; Audio.sfx('select');
    if (!pad) window.WAITKEY = (code) => {
      if (code === 'Escape') { menuS.wait = false; return; }
      const K = KEYSETS[menuS.set], k = ACTIONS[menuS.row][0];
      for (const a in K) K[a] = K[a].filter((x) => x !== code);
      K[k] = [code]; saveKeys(); menuS.wait = false; menuS.cool = 0.3; HITS.clear(); Audio.sfx('confirm');
    };
  }
}
function drawTasti() {
  drawMenuBack();
  const pad = menuS.set === 'pad', list = pad ? PAD_ACTIONS : ACTIONS;
  drawBoard(240, 130, 800, 530, pad ? 'TASTI JOYPAD' : `TASTI GIOCATORE ${menuS.set + 1}`);
  [...list, ['back', 'INDIETRO']].forEach(([k, label], i) => {
    const y = 205 + i * 48, on = menuS.row === i;
    if (on) { g.fillStyle = 'rgba(255,210,90,.14)'; g.fillRect(270, y - 32, 740, 44); }
    ptxt(label, 300, y, 12, on ? '#ffffff' : '#e0b870');
    if (k === 'back') return;
    const val = on && menuS.wait ? (Math.floor(T * 3) % 2 ? (pad ? 'PREMI UN TASTO DEL JOYPAD' : 'PREMI UN TASTO') : '') : pad ? PADSET[k].map(padLabel).join(' / ') : keysLabel(KEYSETS[menuS.set][k]);
    ptxt(val, 980, y, 11, on && menuS.wait ? '#7bf0b1' : '#ffd35a', 'right');
  });
  if (pad) ptxt('LE DIREZIONI SONO SEMPRE LEVETTA E CROCE', W / 2, 650, 9, '#e0b870', 'center');
  ptxt(menuS.wait ? 'ESC: ANNULLA' : 'FUOCO: CAMBIA IL TASTO · GRANATA: INDIETRO', W / 2, 690, 9, '#ffe3a0', 'center');
}

/* ---------- pause ---------- */
const PAUSE_ROWS = ['CONTINUA', 'OPZIONI', 'RICOMINCIA LA MISSIONE', 'TORNA AL TITOLO'];
function tickPausa() {
  const n = menuNav(menuS.pause, PAUSE_ROWS.length); menuS.pause = n.sel;
  if (n.back) { mode = 'play'; return; }
  if (!n.ok) return;
  Audio.sfx('confirm');
  if (menuS.pause === 0) mode = 'play';
  if (menuS.pause === 1) { mode = 'opzioni'; menuS.opt = 0; menuS.back = 'pausa'; }
  if (menuS.pause === 2) startBrief(MI, true);
  if (menuS.pause === 3) { mode = 'title'; S = null; }
}
function drawPausa() {
  draw(); g.fillStyle = 'rgba(4,6,14,.6)'; g.fillRect(0, 0, W, H);
  drawBoard(390, 210, 500, 340, 'PAUSA');
  PAUSE_ROWS.forEach((t, i) => menuItem(t, W / 2, 300 + i * 62, menuS.pause === i, 18));
}
function drawMenuBack() {
  if (IMG.scena_arrivo) { g.drawImage(IMG.scena_arrivo, 0, 0, W, H); g.fillStyle = 'rgba(4,6,14,.7)'; g.fillRect(0, 0, W, H); } else drawCityBack('roma', null, 0.7);
}
const MENUS = { come: [tickCome, drawCome], record: [tickRecord, drawRecordScreen], opzioni: [tickOpzioni, drawOpzioni], tasti: [tickTasti, drawTasti], pausa: [tickPausa, drawPausa] };
