'use strict';
/* ============================================================
   COOP ONLINE — due giocatori su due computer (o telefoni), con un codice stanza.
   WebRTC peer-to-peer tramite PeerJS (vendor/peerjs.min.js), come in Primal Sentinels:
   l'host fa girare il gioco e manda "fotografie" dello stato 30 volte al secondo,
   l'ospite manda solo i suoi tasti. Nessun server di gioco.
   ============================================================ */
const NET_PREFIX = 'mamma-mia-marziani-', NET_VERSION = 1;
const NKEYS = ['l', 'r', 'u', 'd', 'fire', 'jump', 'bomb', 'start'];
const Net = {
  role: null, peer: null, conn: null, code: '', status: '', error: '', guest: false,
  remote: { bits: 0, edge: 0, s: 0 }, snap: null, prev: null, snapAt: 0, prevAt: 0, lastSend: 0, sfxQ: [], song: '', rtt: 0,
  iceServers() {
    const ice = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
    const user = `${Math.floor(Date.now() / 1000) + 12 * 3600}:mammamia`, h = 'staticauth.openrelay.metered.ca';
    ice.push({ urls: [`turn:${h}:80`, `turn:${h}:80?transport=tcp`, `turn:${h}:443`, `turns:${h}:443?transport=tcp`], username: user, credential: hmacSha1B64('openrelayprojectsecret', user) });
    return ice;
  },
  options() { return { debug: 1, config: { iceServers: this.iceServers() }, host: '0.peerjs.com', port: 443, path: '/', secure: true }; },
  available() { return typeof Peer !== 'undefined'; },
  makeCode() { const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; },
  openFast(conn, onMsg) {
    const pc = conn.peerConnection; if (!pc || conn._fast) return;
    try {
      const ch = pc.createDataChannel('fast', { negotiated: true, id: 3, ordered: false, maxRetransmits: 0 });
      ch.onmessage = (e) => { try { onMsg(JSON.parse(e.data)); } catch (x) {} };
      conn._fast = ch;
    } catch (e) {}
  },
  send(m, fast, dropIfBusy) {
    const c = this.conn; if (!c) return;
    const ch = c._fast;
    if (fast && ch && ch.readyState === 'open') { if (dropIfBusy && ch.bufferedAmount > 64000) return; try { ch.send(JSON.stringify(m)); } catch (e) {} return; }
    if (!c.open) return;
    try { c.send(m); } catch (e) {}
  },
  host() {
    this.reset(); this.role = 'host'; this.code = this.makeCode(); this.status = 'CREO LA STANZA...';
    this.peer = new Peer(NET_PREFIX + this.code, this.options());
    this.peer.on('open', () => { this.status = 'STANZA PRONTA: DAI IL CODICE AL TUO AMICO'; });
    this.peer.on('error', (e) => { if (e.type === 'unavailable-id') { this.host(); return; } if (e.type === 'peer-unavailable' || e.type === 'webrtc') return; this.error = netErrorText(e); });
    this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) {} });
    this.peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (this.conn && this.conn.open) { conn.send({ k: 'full', why: 'LA STANZA E GIA PIENA.' }); setTimeout(() => conn.close(), 300); return; }
        this.conn = conn; conn._seen = performance.now();
        conn.on('data', (m) => this.onHost(m));
        conn.on('close', () => { if (this.conn === conn) this.guestLeft(); });
        this.openFast(conn, (m) => this.onHost(m));
      });
    });
  },
  onHost(m) {
    if (this.conn) this.conn._seen = performance.now();
    if (m.k === 'hello') {
      if (m.ver !== NET_VERSION) { this.send({ k: 'full', why: 'VERSIONI DIVERSE DEL GIOCO: AGGIORNATE TUTTI E DUE.' }); return; }
      this.guest = true; this.status = 'IL TUO AMICO E ENTRATO!'; this.send({ k: 'welcome' }); Audio.sfx('fanfara');
    } else if (m.k === 'in') {
      this.remote.bits = m.b;
      if (m.e && m.s > this.remote.s) { this.remote.edge |= m.e; this.remote.s = m.s; }
    } else if (m.k === 'ping') this.send({ k: 'pong', t: m.t }, true);
  },
  guestLeft() {
    this.guest = false; this.conn = null; this.status = 'IL TUO AMICO SE N\'E ANDATO';
    if (S) for (const p of S.players) if (p.dev === 'net2') { p.out = true; p.lives = 0; pop(p.x, p.y - 150, 'DISCONNESSO', '#ff8a7a', 1); }
  },
  join(code) {
    this.reset(); this.role = 'client'; this.code = code; this.status = 'MI COLLEGO ALLA STANZA ' + code + '...';
    this.peer = new Peer(undefined, this.options());
    const timeout = setTimeout(() => { if (!this.guest && !this.error) this.error = 'NESSUNA RISPOSTA: CONTROLLA IL CODICE E RIPROVA.'; }, 30000);
    this.peer.on('open', () => {
      const conn = this.peer.connect(NET_PREFIX + code, { reliable: true, serialization: 'json' });
      this.conn = conn;
      conn.on('open', () => { this.openFast(conn, (m) => this.onClient(m)); conn.send({ k: 'hello', ver: NET_VERSION }); this.status = 'COLLEGATO! ASPETTA CHE L\'HOST INIZI'; });
      conn.on('data', (m) => this.onClient(m));
      conn.on('close', () => { clearTimeout(timeout); if (this.role === 'client') this.lost('L\'HOST HA CHIUSO LA PARTITA.'); });
    });
    this.peer.on('error', (e) => { clearTimeout(timeout); this.error = netErrorText(e); });
  },
  onClient(m) {
    if (m.k === 'welcome') { this.guest = true; Audio.sfx('confirm'); }
    else if (m.k === 'full') this.error = m.why;
    else if (m.k === 'pong') { const r = performance.now() - m.t; this.rtt = this.rtt ? this.rtt * 0.7 + r * 0.3 : r; }
    else if (m.k === 'v') {
      if (m.n <= (this.lastN || 0)) return; this.lastN = m.n;
      this.prev = this.snap; this.prevAt = this.snapAt; this.snap = m.v; this.snapAt = performance.now();
      if (m.v.sfx) for (const s of m.v.sfx) if (s[0] > (this.sfxSeen || 0)) { this.sfxSeen = s[0]; Audio.sfx(s[1]); }
      if (mode !== 'netclient' && this.guest) mode = 'netclient';
    }
  },
  lost(why) { this.reset(); NETMSG = why; mode = 'online'; onl.sel = 0; },
  reset() {
    try { if (this.peer) this.peer.destroy(); } catch (e) {}
    Object.assign(this, { role: null, peer: null, conn: null, code: '', status: '', error: '', guest: false, snap: null, prev: null, lastN: 0, sfxSeen: 0, rtt: 0, remote: { bits: 0, edge: 0, s: 0 } });
  },
};
let NETMSG = '';

/* ---------------- host: the remote player is the device "net2" ---------------- */
DEVICES.push('net2');
const _readDev2 = readDevice;
readDevice = function (dev) {
  if (dev !== 'net2') return _readDev2(dev);
  const o = {}; const R = Net.remote;
  NKEYS.forEach((k, i) => { o[k] = (R.bits >> i) & 1 || (R.edge >> i) & 1 ? 1 : 0; });
  R.edge = 0;
  return Net.role === 'host' && Net.guest ? o : { l: 0, r: 0, u: 0, d: 0, fire: 0, jump: 0, bomb: 0, start: 0 };
};
const _sfx = Audio.sfx;
Audio.sfx = function (name) { if (Net.role === 'host' && Net.guest) { Net.sfxN = (Net.sfxN || 0) + 1; Net.sfxQ.push([Net.sfxN, name]); if (Net.sfxQ.length > 24) Net.sfxQ.shift(); } return _sfx.call(this, name); };

const R1 = (k, v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);
function snapState() {
  const out = { m: mode, MI, song: Audio.trackName, sfx: Net.sfxQ.slice(-12), pause: menuS.pause, tsel, sel };
  if (S) {
    const fx = S.fx.filter((f) => f.k !== 'sp').concat(S.fx.filter((f) => f.k === 'sp').slice(0, 24));
    out.S = { ...S, fx, mini: S.mini ? S.mini.id : 0, veh: { ...S.veh, rider: S.veh.rider ? S.veh.rider.id : 0 }, boss: S.boss ? { ...S.boss, tr: null } : null,
      shots: S.shots.map((s) => ({ ...s, by: s.by ? s.by.id : 0 })), bombs: S.bombs.map((b) => ({ ...b, by: b.by ? b.by.id : 0 })) };
    out.plat = PLATFORMS.map((P) => [P.gone ? 1 : 0, P.goneT, P.shake]);
  }
  if (brief) out.brief = { mi: brief.mi, line: brief.line, t: brief.t, slots: brief.slots, lines: brief.lines };
  if (typeof CARD !== 'undefined' && CARD) out.CARD = CARD;
  if (rv) out.rv = rv; if (nm) out.nm = nm;
  if (BON) out.BON = { ...BON, then: null, cur: BON.cur.map((c) => ({ ...c, p: { hero: c.p.hero, dev: c.p.dev } })) };
  if (IRIS) out.IRIS = { ph: IRIS.ph, t: IRIS.t, x: IRIS.x, y: IRIS.y };
  return JSON.parse(JSON.stringify(out, R1));
}
function netHostTick() {
  if (Net.role !== 'host' || !Net.guest || !Net.conn) return;
  const now = performance.now();
  if (now - Net.lastSend < 33) return;
  Net.lastSend = now; Net.seq = (Net.seq || 0) + 1;
  Net.send({ k: 'v', n: Net.seq, v: snapState() }, true, true);
  if (Net.conn._seen && now - Net.conn._seen > 9000) Net.guestLeft();
}

/* ---------------- client: send my keys, draw the host's picture ---------------- */
const EMPTY_IN = { l: 0, r: 0, u: 0, d: 0, fire: 0, jump: 0, bomb: 0, start: 0, pressed: {} };
let RENDERING = false;
const _inputOf2 = inputOf;
inputOf = function (dev) { return RENDERING ? EMPTY_IN : _inputOf2(dev); };
const cprev = {};
function netClientInput(dt) {
  const o = {}; for (const k of NKEYS) o[k] = 0;
  for (const d of ['kb0', 'kb1', 'pad0', 'pad1', 'touch']) { const c = _readDev2(d); for (const k of NKEYS) o[k] |= c[k] || 0; }
  for (const k of NKEYS) for (const code of KEYSETS[0][k]) if (HITS.has(code)) { o[k] = 1; HITS.delete(code); }
  let bits = 0, edge = 0;
  NKEYS.forEach((k, i) => { if (o[k]) bits |= 1 << i; if (o[k] && !cprev[k]) edge |= 1 << i; cprev[k] = o[k]; });
  if (edge) { Net.inS = (Net.inS || 0) + 1; Net.inE = edge; Net.inRep = 4; }
  Net.inT = (Net.inT || 0) - dt;
  if (Net.inRep > 0 || bits !== Net.lastBits || Net.inT <= 0) {
    const m = { k: 'in', b: bits, e: 0 };
    if (Net.inRep > 0) { m.e = Net.inE; m.s = Net.inS; Net.inRep--; }
    Net.send(m, true); Net.lastBits = bits; Net.inT = 0.05;
  }
  Net.pingT = (Net.pingT || 0) - dt;
  if (Net.pingT <= 0) { Net.pingT = 1; Net.send({ k: 'ping', t: performance.now() }, true); }
}
function applySnap() {
  const v = Net.snap; if (!v) return null;
  MI = v.MI;
  if (v.S) {
    if (LV !== PIANTE[MI]) loadLevel(MI);
    const s = JSON.parse(JSON.stringify(v.S));
    for (const p of s.players) if (p.ammo == null) p.ammo = Infinity;
    const byId = new Map(s.players.map((p) => [p.id, p]));
    s.veh.rider = byId.get(s.veh.rider) || null;
    for (const x of s.shots) x.by = byId.get(x.by) || null;
    for (const x of s.bombs) x.by = byId.get(x.by) || null;
    s.mini = s.enemies.find((e) => e.id === s.mini) || null;
    // smooth motion between the last two pictures
    const P = Net.prev && Net.prev.S, k = clamp((performance.now() - Net.snapAt) / Math.max(20, Net.snapAt - Net.prevAt), 0, 1);
    if (P) {
      const lerpList = (a, b) => { const m = new Map(a.map((o) => [o.id, o])); for (const o of b) { const q = m.get(o.id); if (q && Math.abs(q.x - o.x) < 300) { o.x = lerp(q.x, o.x, k); o.y = lerp(q.y, o.y, k); } } };
      lerpList(P.players, s.players); lerpList(P.enemies, s.enemies); lerpList(P.shots, s.shots); lerpList(P.foeShots, s.foeShots);
      if (P.boss && s.boss) { s.boss.x = lerp(P.boss.x, s.boss.x, k); s.boss.y = lerp(P.boss.y, s.boss.y, k); }
      if (Math.abs(P.veh.x - s.veh.x) < 300) s.veh.x = lerp(P.veh.x, s.veh.x, k);
      if (Math.abs(P.cam - s.cam) < 400) s.cam = lerp(P.cam, s.cam, k);
    }
    S = s;
    if (v.plat) v.plat.forEach(([gone, gt, sh], i) => { if (PLATFORMS[i]) Object.assign(PLATFORMS[i], { gone: !!gone, goneT: gt, shake: sh }); });
  }
  brief = v.brief || null; rv = v.rv || null; nm = v.nm || null; CARD = v.CARD || null; IRIS = v.IRIS || null;
  if (v.BON) BON = v.BON; else BON = null;
  if (v.tsel) Object.assign(tsel, v.tsel); if (v.sel) sel = v.sel;
  menuS.pause = v.pause || 0;
  if (v.song && v.song !== Net.song) { Net.song = v.song; Audio.playSong(0, v.song); }
  return v.m;
}
function netClientFrame(dt) {
  netClientInput(dt);
  if (HITS.delete('Escape') && confirmLeave()) return;
  const m = applySnap();
  RENDERING = true;
  try {
    if (!m) waitScreen('IN ATTESA DELL\'HOST...');
    else if (m === 'play' || m === 'cartello') { if (S) draw(); if (m === 'cartello' && CARD) drawCard(); }
    else if (m === 'brief' && brief) drawBrief();
    else if (m === 'bonus' && BON) drawBonus();
    else if (m === 'reveal' && rv) drawReveal();
    else if (m === 'nome' && nm) drawName();
    else if (m === 'pausa' && S) drawPausa();
    else if ((m === 'end' || m === 'over') && S) drawEnd(m === 'end');
    else if ((m === 'title' || m === 'select') && sel) { const md = mode; mode = m; drawTitle(); mode = md; }
    else waitScreen('L\'HOST E NEI MENU...');
    drawFilm();
    if (IRIS) drawIrisStatic();
  } finally { RENDERING = false; }
  ptxt(`ONLINE · OSPITE${Net.rtt ? ` · PING ${Math.round(Net.rtt)} MS` : ''} · ESC: ESCI`, W / 2, H - 6, 7, '#9fb4c8', 'center');
  if (Net.snapAt && performance.now() - Net.snapAt > 9000) Net.lost('NESSUN SEGNALE DALL\'HOST.');
}
function confirmLeave() { Net.leaveT = (Net.leaveT || 0); if (performance.now() - Net.leaveT < 1500) { Net.lost('SEI USCITO DALLA PARTITA.'); return true; } Net.leaveT = performance.now(); return false; }
function drawIrisStatic() {
  const D = 0.55, k = clamp(IRIS.t / D, 0, 1), maxR = Math.hypot(W, H);
  const r = IRIS.ph === 'close' ? maxR * (1 - k) * (1 - k) : IRIS.ph === 'hold' ? 0 : maxR * k * k;
  g.save(); g.fillStyle = '#000'; g.beginPath(); g.rect(0, 0, W, H); g.arc(IRIS.x, IRIS.y, Math.max(0, r), 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
}
function waitScreen(t) {
  drawMenuBack(); drawBoard(290, 250, 700, 220, 'ONLINE');
  ptxt(t, W / 2, 360, 12, '#ffe3a0', 'center');
  if (Math.floor(T * 2) % 2) ptxt('...', W / 2, 400, 12, '#ffe3a0', 'center');
}

/* ---------------- menus: online, code entry, lobby ---------------- */
const onl = { sel: 0, code: '' };
const ONL_ROWS = ['CREA UNA STANZA', 'ENTRA CON UN CODICE', 'INDIETRO'];
function tickOnline() {
  const n = menuNav(onl.sel, ONL_ROWS.length); onl.sel = n.sel;
  if (n.back) { mode = 'title'; return; }
  if (!n.ok) return;
  Audio.sfx('confirm'); NETMSG = '';
  if (!Net.available()) { NETMSG = 'MANCA IL FILE vendor/peerjs.min.js'; return; }
  if (onl.sel === 0) { Net.host(); mode = 'netlobby'; }
  else if (onl.sel === 1) { onl.code = ''; mode = 'netcode'; }
  else mode = 'title';
}
function drawOnline() {
  drawMenuBack(); drawBoard(290, 190, 700, 420, 'COOP ONLINE');
  ONL_ROWS.forEach((t, i) => menuItem(t, W / 2, 290 + i * 70, onl.sel === i, 16));
  txt('Uno crea la stanza e legge il codice all\'amico, l\'altro entra con il codice.', W / 2, 520, 17, '#e0b870', 'center', 700);
  txt('Serve Internet su tutti e due. Funziona anche da telefono.', W / 2, 546, 17, '#e0b870', 'center', 700);
  if (NETMSG) ptxt(NETMSG, W / 2, 585, 9, '#ff8a7a', 'center');
}
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
addEventListener('keydown', (e) => {
  if (mode !== 'netcode') return;
  const ch = e.key.length === 1 ? e.key.toUpperCase() : '';
  if (CODE_ABC.includes(ch) && onl.code.length < 5) { onl.code += ch; Audio.sfx('select'); }
  if (e.key === 'Backspace') onl.code = onl.code.slice(0, -1);
});
canvas.addEventListener('touchend', () => { if (mode === 'netcode') { const c = prompt('Codice della stanza (5 caratteri):'); if (c) onl.code = c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5); } });
function tickNetcode() {
  const n = menuNav(0, 1);
  if (n.back || HITS.delete('Escape')) { mode = 'online'; return; }
  // with a joypad: up/down change the last letter, right adds one
  for (const d of DEVICES) { const c = inputOf(d); if (d.startsWith('pad')) { if (c.pressed.r && onl.code.length < 5) onl.code += 'A'; const L = onl.code.length; if (L && (c.pressed.u || c.pressed.d)) { const i = CODE_ABC.indexOf(onl.code[L - 1]); onl.code = onl.code.slice(0, -1) + CODE_ABC[(i + (c.pressed.u ? 1 : CODE_ABC.length - 1)) % CODE_ABC.length]; } } }
  const go = (n.ok && n.dev !== 'kb0' && n.dev !== 'kb1') || HITS.delete('Enter') || HITS.delete('NumpadEnter');
  if (go && onl.code.length === 5) { Net.join(onl.code); mode = 'netlobby'; Audio.sfx('confirm'); }
}
function drawNetcode() {
  drawMenuBack(); drawBoard(290, 200, 700, 380, 'ENTRA NELLA STANZA');
  txt('Scrivi il codice che ti ha dato l\'host', W / 2, 300, 20, '#fff0d0', 'center', 700);
  for (let i = 0; i < 5; i++) { const x = W / 2 - 200 + i * 100; g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 36, 340, 72, 90); ptitle(onl.code[i] || (i === onl.code.length && Math.floor(T * 3) % 2 ? '_' : ''), x, 408, 44, '#ffffff', '#e8483a'); }
  ptxt(onl.code.length === 5 ? 'INVIO / FUOCO: ENTRA' : 'TASTIERA: SCRIVI · JOYPAD: DESTRA E SU/GIU · TELEFONO: TOCCA', W / 2, 500, 9, '#ffe3a0', 'center');
  ptxt('ESC / GRANATA: INDIETRO', W / 2, 540, 9, '#9fb4c8', 'center');
}
function tickNetlobby() {
  const n = menuNav(0, 1);
  if (n.back) { Net.reset(); mode = 'online'; return; }
  if (Net.role === 'host' && Net.guest && n.ok && n.dev !== 'net2') {
    Audio.sfx('confirm'); tsel.mi = 0;
    mode = 'select'; sel = { slots: [{ dev: n.dev, hero: 0, ready: false }, { dev: 'net2', hero: 1, ready: false }] };
  }
}
function drawNetlobby() {
  drawMenuBack(); drawBoard(290, 170, 700, 440, Net.role === 'host' ? 'LA TUA STANZA' : 'STANZA');
  if (Net.role === 'host') {
    txt('Codice della stanza:', W / 2, 260, 20, '#fff0d0', 'center', 700);
    ptitle(Net.code || '.....', W / 2, 340, 56, '#ffffff', '#e8483a');
  } else ptitle(Net.code, W / 2, 320, 40, '#ffffff', '#e8483a');
  ptxt(Net.error || Net.status, W / 2, 420, 10, Net.error ? '#ff8a7a' : '#ffe3a0', 'center');
  if (Net.role === 'host') ptxt(Net.guest ? 'FUOCO: SCEGLIETE GLI EROI E SI PARTE!' : 'ASPETTO IL TUO AMICO...', W / 2, 480, 12, Net.guest ? '#7bf0b1' : '#9fb4c8', 'center');
  ptxt('GRANATA / ESC: ESCI', W / 2, 560, 9, '#9fb4c8', 'center');
}
Object.assign(MENUS, { online: [tickOnline, drawOnline], netcode: [tickNetcode, drawNetcode], netlobby: [tickNetlobby, drawNetlobby] });
MENUS.netclient = [() => {}, () => netClientFrame(1 / 60)];

/* the host sends a picture of the game ~30 times a second */
setInterval(() => { try { netHostTick(); } catch (e) {} }, 16);

/* ---------- helpers from Primal Sentinels ---------- */
function hmacSha1B64(key, msg) {
  const enc = (s) => Array.from(unescape(encodeURIComponent(s)), (c) => c.charCodeAt(0));
  const sha1 = (bytes) => {
    const l = bytes.length, w = [], m = bytes.slice();
    m.push(0x80); while (m.length % 64 !== 56) m.push(0);
    const bl = l * 8; for (let i = 7; i >= 0; i--) m.push(i > 3 ? 0 : (bl >>> (i * 8)) & 255);
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    for (let o = 0; o < m.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (m[o + i * 4] << 24) | (m[o + i * 4 + 1] << 16) | (m[o + i * 4 + 2] << 8) | m[o + i * 4 + 3];
      for (let i = 16; i < 80; i++) { const x = w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]; w[i] = (x << 1) | (x >>> 31); }
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let i = 0; i < 80; i++) {
        const f = i < 20 ? (b & c) | (~b & d) : i < 40 ? b ^ c ^ d : i < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d;
        const k = i < 20 ? 0x5a827999 : i < 40 ? 0x6ed9eba1 : i < 60 ? 0x8f1bbcdc : 0xca62c1d6;
        const t = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
        e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    const out = []; for (const h of [h0, h1, h2, h3, h4]) out.push((h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, h & 255);
    return out;
  };
  let k = enc(key); if (k.length > 64) k = sha1(k);
  while (k.length < 64) k.push(0);
  const inner = sha1(k.map((b) => b ^ 0x36).concat(enc(msg)));
  const mac = sha1(k.map((b) => b ^ 0x5c).concat(inner));
  return btoa(String.fromCharCode(...mac));
}
function netErrorText(e) {
  const t = e && e.type;
  if (t === 'peer-unavailable') return 'STANZA NON TROVATA: CONTROLLA IL CODICE.';
  if (t === 'network' || t === 'server-error' || t === 'socket-error' || t === 'socket-closed') return 'SERVE UNA CONNESSIONE A INTERNET.';
  if (t === 'browser-incompatible') return 'QUESTO BROWSER NON SUPPORTA IL GIOCO ONLINE.';
  return 'ERRORE DI RETE: ' + String(t || e).toUpperCase();
}
window.Stivale.Net = Net; window.Stivale.snapState = snapState;
