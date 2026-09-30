'use strict';
/* ============================================================
   BOSS PIÙ CHIARI
   - prima di ogni attacco compare un cartello che dice cosa arriva e cosa fare
   - la barra del boss mostra la fase (1 · 2 arrabbiato)
   - durante lo scontro ogni tanto arriva un prigioniero col paracadute: liberalo per le armi
   - il Comandante non fa più l'onda a terra (il disegno colpisce in alto: ingannava)
   ============================================================ */
CAPI.comand.att = [['beam', 'a'], ['rain', 'sp'], ['charge', 'a'], ['beam', 'a'], ['summon', 'sp'], ['rain', 'sp']];
const WARN = {
  slam: ['ONDA A TERRA', 'SALTA!'], charge: ['CARICA', 'SALTA O SALI SU UNA PIATTAFORMA!'], shield: ['SCUDO BOOMERANG', 'SALTALO DUE VOLTE!'],
  throw: ['LANCIO', 'SPARA AI PROIETTILI!'], roll: ['PALLA GIGANTE', 'SALTA!'], torpedo: ['SILURI', 'ALTO: GIU · BASSO: SALTA'],
  spray: ['GOCCIOLONI', 'SPOSTATI!'], rain: ['PIOGGIA DAL CIELO', 'GUARDA LE OMBRE!'], summon: ['RINFORZI', 'PRIMA I PICCOLI!'],
  tractor: ['RAGGIO TRAENTE', 'SCAPPA DALLA LUCE!'],
};
function warnFor(B, st) {
  if (st === 'beam') return (B.bn % 2 === 0) ? ['RAGGIO ALTO', 'ABBASSATI!'] : ['RAGGIO BASSO', 'SALTA!'];
  return WARN[st];
}
const _stepBoss3 = stepBoss;
stepBoss = function (dt) {
  const B = S.boss, before = B && B.st;
  _stepBoss3(dt);
  if (!B || B.dead) return;
  if (B.st !== before && WARN[B.st] !== undefined || (B.st !== before && B.st === 'beam')) { B.warn = warnFor(B, B.st); B.warnT = 1.3; Audio.sfx('select'); }
  if (B.warnT > 0) B.warnT -= dt;
  // a prisoner parachutes in every so often: a weapon, some food
  if (B.st !== 'intro' && !RMODE.rush) {
    S.bpT = (S.bpT ?? 8) - dt;
    if (S.bpT <= 0 && !S.pris.some((q) => q.st === 'tied' && q.x > ARENA_X - 200)) {
      S.bpT = 16 - SAVE.diff * 3;
      const x = ARENA_X + (B.x > ARENA_X + W / 2 ? rand(120, 420) : rand(W - 420, W - 120));
      S.pris.push({ id: nid(), x, y: -60, k: Math.floor(Math.random() * 4), w: pick(['H', 'S', 'F', 'R']), st: 'tied', t: 0, para: true });
      pop(x, 180, 'UN PRIGIONIERO!', '#7bf0b1', 1);
    }
  }
};
EX.stepParaPris = (dt) => {
  for (const q of S.pris) if (q.para) {
    const fl = groundUnder(q.x, q.y, 1, false);
    q.y = Math.min(fl, q.y + 190 * dt);
    if (q.y >= fl) q.para = false;
  }
};
EX.drawParaPris = (q) => {
  if (!q.para) return;
  const x = q.x, y = q.y - 230;
  g.strokeStyle = '#2a1a10'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x - 14, y + 110); g.moveTo(x + 50, y); g.lineTo(x + 14, y + 110); g.stroke();
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fff6d6' : '#3aa060'; g.beginPath(); g.moveTo(x, y + 6); g.arc(x, y + 6, 58, Math.PI + i * Math.PI / 4, Math.PI + (i + 1) * Math.PI / 4); g.fill(); }
  g.lineWidth = 3; g.beginPath(); g.arc(x, y + 6, 58, Math.PI, 0); g.stroke();
};
EX.drawBossWarn = () => {
  const B = S.boss; if (!B || B.dead || !(B.warnT > 0) || !B.warn) return;
  const D = CAPI[B.id], x = clamp(B.x - S.cam, 220, W - 220), y = Math.max(150, B.y - D.ht * D.sc - 60);
  const k = Math.min(1, (1.3 - B.warnT) * 6), a = Math.min(1, B.warnT * 3);
  g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(k, k);
  g.fillStyle = '#fff6d6'; g.strokeStyle = '#1a1010'; g.lineWidth = 5; g.beginPath(); g.roundRect(-190, -46, 380, 78, 16); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-14, 32); g.lineTo(0, 56); g.lineTo(14, 32); g.fill(); g.stroke();
  for (const sx of [-160, 160]) { g.fillStyle = '#e8483a'; g.beginPath(); g.arc(sx, -7, 20, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(sx - 3, -20, 6, 16); g.fillRect(sx - 3, 1, 6, 6); }
  ptxt(B.warn[0], 0, -12, 12, '#6a2a10', 'center', false);
  ptxt(B.warn[1], 0, 16, 11, '#e8483a', 'center', false);
  g.restore();
};
