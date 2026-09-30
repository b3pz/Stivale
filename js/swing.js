'use strict';
/* ============================================================
   COLONNA SONORA ANNI '30 — musica sintetizzata dal gioco, come le
   orchestrine dei cartoni: swing con il ritmo "zoppo", tuba che fa
   oom-pah, pianoforte stride, clarinetto, tromba, fisarmonica, fischio,
   mandolino. Un tema per ogni città + titolo, briefing, boss e finale.
   Sostituisce i brani di music.js (stesso motore, strumenti nuovi).
   Notazione: 8 note per battuta (crome), "-" tieni, "." pausa, "|" separa.
   ============================================================ */
(function () {
  const SONGS = [
    { name: 'titolo', title: 'Mamma mia!', bpm: 176, swing: true, lead: 'tromba', bass: 'walk', comp: 'stride', drums: 'swing',
      chords: 'C A7 Dm G7 C A7 Dm G7 F Fm C A7 D7 G7 C C',
      lead: `G4 A4 C5 - E5 - D5 C5 | E5 - C#5 - A4 - - - | F5 - E5 D5 A4 - D5 - | G5 - F5 - D5 B4 G4 - |
             G4 A4 C5 - E5 - G5 - | A5 - G5 - E5 C#5 A4 - | D5 F5 A5 - G5 F5 D5 - | B4 - D5 - G5 - - . |
             A5 - A5 G5 F5 - C5 - | Ab5 - G5 F5 C5 - Ab4 - | G5 - E5 C5 G4 - E5 - | C#5 E5 G5 - A5 - G5 - |
             F#5 - A5 - C6 - A5 F#5 | G5 F5 D5 B4 G4 - B4 D5 | C5 - E5 G5 C6 - G5 E5 | C5 - - - . . G4 -` },
    { name: 'roma', title: 'Swing del Foro', bpm: 168, swing: true, lead: 'clarinetto', bass: 'walk', comp: 'stride', drums: 'swing',
      chords: 'G E7 Am D7 G E7 Am D7 C Cm G E7 A7 D7 G G',
      lead: `B4 - D5 - G5 - F#5 G5 | G#5 - E5 - B4 - D5 - | C5 - E5 - A5 - G5 E5 | F#5 - E5 D5 A4 - - - |
             B4 D5 G5 - B5 - A5 G5 | G#5 B5 - G#5 E5 - D5 - | C5 - A4 - C5 E5 A5 - | F#5 - D5 - A4 - . . |
             E5 - G5 - C6 - B5 A5 | G5 - Eb5 - C5 - Eb5 G5 | B5 - A5 G5 D5 - B4 - | E5 G#5 B5 - D6 - B5 - |
             C#6 - A5 - E5 - G5 - | F#5 - A5 - C6 - F#5 - | G5 - D5 - B4 - D5 - | G5 - - - . . D5 -` },
    { name: 'venezia', title: 'Barcarola di latta', bpm: 116, swing: true, lead: 'clarinetto', bass: 'tuba', comp: 'arp', drums: 'spazzole',
      chords: 'Dm A7 Dm D7 Gm Dm E7 A7 Dm A7 Dm D7 Gm A7 Dm Dm',
      lead: `A4 - D5 - F5 - E5 D5 | E5 - - - C#5 - A4 - | F5 - A5 - D6 - C6 A5 | C6 - - - A5 - F#5 - |
             G5 - Bb5 - D6 - Bb5 G5 | F5 - - - D5 - A4 - | G#4 - B4 - D5 - E5 - | C#5 - - - . . A4 - |
             D5 - F5 - A5 - D6 - | C#6 - A5 - E5 - G5 - | F5 - E5 - D5 - A4 - | F#4 - A4 - C5 - D5 - |
             Bb5 - A5 - G5 - D5 - | E5 - G5 - C#6 - E6 - | D6 - A5 - F5 - E5 - | D5 - - - - - . .` },
    { name: 'firenze', title: 'Rinascimento hot', bpm: 150, swing: true, lead: 'flauto', bass: 'walk', comp: 'stride', drums: 'swing',
      chords: 'F D7 Gm C7 F D7 Gm C7 Bb Bbm F D7 G7 C7 F F',
      lead: `C5 - F5 - A5 - G5 F5 | F#5 - A5 - C6 - A5 - | Bb5 - G5 - D5 - G5 - | E5 - G5 - Bb5 - - - |
             A5 - F5 - C5 - F5 A5 | C6 - A5 - F#5 - D5 - | D5 G5 Bb5 - A5 G5 F5 - | E5 - C5 - . . C5 - |
             D5 - F5 - Bb5 - A5 Bb5 | Db6 - Bb5 - F5 - Db5 - | C5 - F5 - A5 - C6 - | D6 - C6 - A5 - F#5 - |
             G5 - B5 - D6 - B5 - | C6 - Bb5 - G5 - E5 - | F5 - C5 - A4 - C5 - | F5 - - - . . C5 -` },
    { name: 'torino', title: 'Catena di montaggio', bpm: 186, swing: false, lead: 'tromba', bass: 'tuba', comp: 'banjo', drums: 'marcia',
      chords: 'Em B7 Em B7 Am Em B7 Em C G B7 Em Am Em B7 Em',
      lead: `E5 . E5 . G5 - B5 - | A5 - F#5 - D#5 - B4 - | E5 . E5 . G5 - E6 - | D#6 - B5 - F#5 - - - |
             C6 - B5 A5 E5 - A5 - | B5 - G5 E5 B4 - E5 - | F#5 - A5 - B5 - D#5 - | E5 - - - . E5 E5 . |
             G5 . G5 . E5 - C5 - | D5 . D5 . B4 - G4 - | B4 - D#5 - F#5 - A5 - | G5 - - - E5 - . . |
             A5 . A5 . C6 - A5 - | G5 - E5 - B4 - E5 - | F#5 - D#5 - B4 - D#5 - | E5 - - - E4 . . .` },
    { name: 'genova', title: 'Canzone del molo', bpm: 158, swing: false, lead: 'fisarmonica', bass: 'tuba', comp: 'fisa', drums: 'polka',
      chords: 'D A D G D A D D G D A D G D A D',
      lead: `A4 - D5 - F#5 - A5 - | G5 - F#5 - E5 - C#5 - | D5 - F#5 - A5 - D6 - | B5 - A5 - G5 - - - |
             F#5 - A5 - F#5 - D5 - | E5 - C#5 - A4 - E5 - | D5 - F#5 A5 - F#5 D5 - | D5 - - - . . A4 - |
             B4 - D5 - G5 - B5 - | A5 - F#5 - D5 - A4 - | C#5 - E5 - A5 - G5 - | F#5 - - - D5 - . . |
             G5 - B5 - D6 - B5 - | A5 - F#5 - D5 - F#5 - | E5 - A5 - C#6 - E6 - | D6 - - - . . A5 -` },
    { name: 'dolomiti', title: 'Polka della funivia', bpm: 150, swing: false, lead: 'fischio', bass: 'tuba', comp: 'fisa', drums: 'polka',
      chords: 'Bb F Bb Bb Eb Bb F Bb Bb F Bb Eb Bb F Bb Bb',
      lead: `D5 - F5 - Bb5 - F5 - | A5 - C6 - A5 - F5 - | Bb5 - D6 - F6 - D6 - | Bb5 - - - F5 - - - |
             G5 - Bb5 - Eb6 - Bb5 - | D6 - Bb5 - F5 - D5 - | C5 - F5 - A5 - C6 - | Bb5 - - - . . F5 - |
             F5 G5 F5 D5 Bb4 - D5 - | C5 D5 C5 A4 F4 - A4 - | Bb4 D5 F5 - Bb5 - A5 - | G5 - Eb5 - Bb4 - G5 - |
             F5 - D5 - Bb4 - F5 - | A5 - C6 - Eb6 - C6 - | D6 - Bb5 - F5 - D5 - | Bb5 - - - . . . .` },
    { name: 'stretto', title: 'Tarantella del miraggio', bpm: 176, swing: false, lead: 'mandolino', bass: 'tuba', comp: 'banjo', drums: 'tarantella',
      chords: 'Am E Am E Am Dm E Am Dm Am E Am Dm Am E Am',
      lead: `E5 E5 A5 - E5 E5 C5 - | B4 B4 E5 - B4 B4 G#4 - | A4 C5 E5 A5 G#5 A5 B5 - | B5 - G#5 - E5 - - - |
             E5 E5 A5 - E5 E5 C6 - | D6 - A5 - F5 - D5 - | E5 F5 E5 D5 C5 B4 G#4 - | A4 - - - . . E5 - |
             F5 F5 A5 - F5 F5 D5 - | E5 E5 A5 - E5 E5 C5 - | B4 - E5 - G#5 - B5 - | A5 - - - E5 - . . |
             D5 F5 A5 - D6 - A5 - | C6 - A5 - E5 - C5 - | B4 C5 D5 E5 F5 E5 D5 B4 | A4 - - - A5 . . .` },
    { name: 'etna', title: 'Marcia nel vulcano', bpm: 158, swing: false, lead: 'tromba', bass: 'walk', comp: 'stride', drums: 'marcia',
      chords: 'Cm G Cm G Ab Cm G G Fm Cm G Cm Ab G Cm Cm',
      lead: `C5 - Eb5 - G5 - - C5 | B4 - D5 - G5 - - - | C5 - Eb5 - G5 - C6 - | B5 - - - G5 - D5 - |
             C6 - Ab5 - Eb5 - C5 - | Eb5 - G5 - C6 - Bb5 - | B5 - A5 - G5 - F5 - | D5 - - - B4 - . . |
             F5 - Ab5 - C6 - Ab5 - | G5 - Eb5 - C5 - G5 - | D5 - G5 - B5 - D6 - | C6 - - - G5 - . . |
             Ab5 - C6 - Eb6 - C6 - | B5 - D6 - G6 - F6 - | Eb6 - C6 - G5 - Eb5 - | C5 - - - C4 . . .` },
    { name: 'boss', title: 'Hot jazz del boss', bpm: 200, swing: true, lead: 'tromba', bass: 'walk', comp: 'stride', drums: 'boss30',
      chords: 'Em Em Am B7 Em Em C B7 Am Em C B7 Am Em B7 Em',
      lead: `E5 G5 B5 - E6 - B5 G5 | A#5 B5 G5 - E5 - - - | A5 C6 E6 - C6 - A5 - | D#6 - B5 - F#5 - D#5 - |
             E5 G5 B5 - G5 E5 B4 - | C5 - B4 - A#4 - B4 - | C5 E5 G5 - C6 - G5 - | B5 - A5 - F#5 - D#5 - |
             E5 - A5 - C6 - E6 - | D#6 - E6 - B5 - G5 - | E5 - G5 - C6 - E6 - | D#6 - - - B5 - F#5 - |
             A5 - C6 - A5 - E5 - | G5 - B5 - G5 - E5 - | F#5 G5 A5 B5 C6 B5 A5 F#5 | E5 - - - B4 - E5 -` },
    { name: 'gufo', title: 'Il professore spiega', bpm: 128, swing: true, lead: 'flauto', bass: 'walk', comp: 'stride', drums: 'spazzole',
      chords: 'C Am F G C Am Dm G C C7 F Fm C G C C',
      lead: `E5 . G5 . C6 - G5 . | A5 . E5 . C5 - . . | F5 . A5 . C6 - A5 . | G5 - - - D5 - . . |
             E5 . G5 . C6 - E6 . | D6 . C6 . A5 - . . | F5 . A5 . D6 - C6 . | B5 - - - G5 - . . |
             C6 . G5 . E5 . C5 . | Bb5 - - - G5 - . . | A5 . F5 . C5 . A4 . | Ab5 - - - F5 - . . |
             G5 . E5 . C5 . E5 . | D5 . G5 . B5 . D6 . | C6 - - - G5 - E5 - | C5 - - - . . . .` },
    { name: 'finale', title: 'Tutti a tavola', bpm: 100, swing: true, lead: 'clarinetto', bass: 'tuba', comp: 'arp', drums: 'spazzole',
      chords: 'C G Am F C G F C Am Em F G C G F G',
      lead: `E5 - - - G5 - C6 - | B5 - - - D5 - G5 - | A5 - - - C6 - E5 - | F5 - - - A5 - - - |
             G5 - - - E5 - C5 - | D5 - - - B4 - G5 - | A5 - G5 - F5 - A5 - | G5 - - - - - . . |
             C6 - - - B5 - A5 - | G5 - - - E5 - - - | F5 - A5 - C6 - F6 - | D6 - - - B5 - G5 - |
             C6 - - - E6 - G6 - | D6 - - - B5 - G5 - | A5 - C6 - F6 - E6 - | D6 - - - B5 - - -` },
  ];
  // chords with a 7th (A7, D7…) and minors: root + 3 or 4 notes
  const chord7 = (name) => {
    const m = /^([A-G])([#b]?)(m?)(7?)/.exec(name);
    const root = NOTE_SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    const tri = [0, m[3] ? 3 : 4, 7];
    if (m[4]) tri.push(10);
    return { root, tri };
  };
  MUSIC.length = 0;
  for (const S of SONGS) { compile(S); S._c.chords = S.chords.split(/\s+/).map(chord7); MUSIC.push(S); }
  for (const k in MUSIC_INDEX) delete MUSIC_INDEX[k];
  MUSIC.forEach((S, i) => { MUSIC_INDEX[S.name] = i; });
  Audio.FILES = MUSIC.map((S) => S.name);
  try { if (!localStorage.getItem('primal-vol')) { Audio.musicVol = 0.4; } } catch (e) {}
  for (const S of MUSIC) Audio.fileOK[S.name] = false;   // no MP3 lookups: the orchestra is all here

  /* the drummer: which hits on each 16th [kind, …] */
  const KIT = {
    swing: (s) => [s % 4 === 0 || s % 4 === 2 && (s === 6 || s === 14) ? 'R' : '', s === 4 || s === 12 ? 'B' : '', s === 0 || s === 8 ? 'k' : ''],
    spazzole: (s) => [s === 0 || s === 8 ? 'W' : '', s === 4 || s === 12 ? 'b' : '', s === 6 || s === 14 ? 'r' : ''],
    boss30: (s, bar) => [s % 2 === 0 ? 'R' : '', s === 4 || s === 12 || (bar % 4 === 3 && s > 11) ? 'S' : '', s === 0 || s === 8 || s === 10 ? 'K' : ''],
    marcia: (s, bar) => [s === 0 || s === 8 ? 'K' : '', s === 4 || s === 12 || (bar % 4 === 3 && s >= 12) || s === 14 ? 'S' : '', s % 4 === 2 ? 'h' : ''],
    polka: (s) => [s === 0 || s === 8 ? 'K' : '', s === 4 || s === 12 ? 's' : '', s % 4 === 2 ? 'h' : ''],
    tarantella: (s) => [s === 0 || s === 6 || s === 8 || s === 14 ? 'K' : '', s % 2 === 0 ? 'T' : '', s === 4 || s === 12 ? 's' : ''],
  };
  Object.assign(Audio, {
    playSong(i, name) {
      name = name || this.FILES[i] || '';
      const idx = MUSIC_INDEX[name] ?? (i % MUSIC.length);
      if (this.musicOn && this.song === idx) return;
      this.song = idx; this.musicOn = true; this.step = 0; this.next = 0; this.trackName = name;
      if (this.track) { this.track.pause(); this.track = null; }
    },
    lead(kind, hz, d, when, s) {
      const v = (f, dd, type, vol, sl = 1, w = when) => this.mtone(f, dd, type, vol, sl, w);
      switch (kind) {
        case 'tromba': v(hz, d, 'triangle', 0.04); v(hz * 2, d * 0.8, 'sine', 0.008); v(hz * 1.003, d, 'square', 0.003); break;
        case 'flauto': v(hz, d, 'sine', 0.05); v(hz * 2, d * 0.7, 'sine', 0.005); break;
        case 'fischio': v(hz, d, 'sine', 0.045, 1.002); v(hz * 2, d * 0.6, 'sine', 0.006); break;
        case 'fisarmonica': v(hz, d, 'triangle', 0.035); v(hz * 1.006, d, 'triangle', 0.02); v(hz * 2, d, 'sine', 0.006); break;
        case 'mandolino': {   // tremolo: the note is picked again every 16th
          const n = Math.max(1, Math.round(d / this.sd));
          for (let k = 0; k < n; k++) { v(hz, this.sd * 0.8, 'triangle', 0.03, 1, when + k * this.sd); v(hz * 2, this.sd * 0.4, 'sine', 0.006, 1, when + k * this.sd); }
          break;
        }
        default: v(hz, d, 'triangle', 0.045); v(hz * 2, d * 0.8, 'sine', 0.006);   // clarinetto
      }
    },
    update() {
      if (!this.ctx || !this.musicOn || this.muted) return;
      const S = MUSIC[this.song % MUSIC.length], C = S._c;
      const sd = 60 / S.bpm / 4; this.sd = sd;
      const now = this.ctx.currentTime;
      if (this.next < now) this.next = now + 0.05;
      this.out = this.musicBus;
      while (this.next < now + 0.15) {
        const st = this.step % C.len, bar = Math.floor(st / 16), s = st % 16;
        const when = this.next - now + (S.swing && s % 4 === 2 ? sd * 0.66 : 0);   // swing: the second eighth arrives late
        const ch = C.chords[bar % C.chords.length];
        const bassSemi = 36 + ch.root + (ch.root > 6 ? -12 : 0);
        // melody
        for (const [at, hz, len] of C.lead) if (at === st && hz) this.lead(S.lead, hz, Math.min(len * sd * 0.92, 1.5), when, s);
        // bass: tuba oom-pah or walking bass
        if (S.bass === 'tuba' && (s === 0 || s === 8)) {
          const semi = bassSemi + (s === 8 ? 7 : 0) + 12;
          this.mtone(semiHz(semi), sd * 1.6, 'triangle', 0.09, 0.98, when); 
        } else if (S.bass === 'walk' && s % 4 === 0) {
          const walk = [0, ch.tri[1], 7, 9][s / 4];
          this.mtone(semiHz(bassSemi + 12 + walk), sd * 3, 'triangle', 0.085, 1, when); 
        }
        // comping: stride piano, banjo, accordion, soft arpeggio
        const notes = (oct) => ch.tri.map((t) => semiHz(60 + oct + ch.root + t));
        if (S.comp === 'stride' && (s === 4 || s === 12)) for (const f of notes(0)) this.mtone(f, sd * 1.4, 'triangle', 0.014, 1, when);
        else if (S.comp === 'banjo' && s % 2 === 0) for (const f of notes(0)) this.mtone(f, sd * 0.35, 'triangle', 0.008, 1, when);
        else if (S.comp === 'fisa' && (s === 4 || s === 12)) for (const f of notes(0)) this.mtone(f, sd * 2.5, 'triangle', 0.008, 1, when);
        else if (S.comp === 'arp' && s % 2 === 0) { const f = notes(0)[(s / 2) % ch.tri.length]; this.mtone(f, sd * 2, 'sine', 0.014, 1, when); }
        // drums
        const nz = (dd, v, hp, w) => this.mnoise(dd, v * 0.45, hp, w);
        for (const d of KIT[S.drums](s, bar)) {
          if (!d) continue;
          if (d === 'K') { this.mtone(110, 0.14, 'sine', 0.14, 0.4, when); nz(0.02, 0.02, 900, when); }
          else if (d === 'k') this.mtone(95, 0.12, 'sine', 0.09, 0.5, when);
          else if (d === 'S') { nz(0.1, 0.06, 1800, when); this.mtone(220, 0.05, 'triangle', 0.03, 0.7, when); }
          else if (d === 's') nz(0.06, 0.045, 2200, when);
          else if (d === 'B') nz(0.16, 0.028, 2600, when);
          else if (d === 'b') nz(0.08, 0.018, 3000, when);
          else if (d === 'W') nz(0.32, 0.012, 3500, when);
          else if (d === 'R') { nz(0.08, 0.016, 7000, when); this.mtone(5200, 0.05, 'triangle', 0.002, 1, when); }
          else if (d === 'r') nz(0.04, 0.01, 7000, when);
          else if (d === 'h') nz(0.03, 0.016, 7500, when);
          else if (d === 'T') nz(0.05, s % 4 === 0 ? 0.03 : 0.015, 5000, when);   // tambourine
        }
        
        this.step++;
        this.next += sd;
      }
      this.out = this.sfxBus;
    },
  });

  /* cartoon sound effects: boing, slide whistle, bonk, the Vespona's horn… */
  const baseSfx = Audio.sfx.bind(Audio);
  const CARTOON = {
    jump() { this.tone(240, 0.18, 'sine', 0.05, 2.6); this.tone(480, 0.12, 'triangle', 0.015, 2, 0.03); },
    ko() { this.tone(1500, 0.7, 'sine', 0.04, 0.25); this.tone(1510, 0.7, 'triangle', 0.01, 0.25); },   // slide whistle down
    hit() { this.tone(720, 0.07, 'sine', 0.05, 0.55); this.tone(360, 0.09, 'triangle', 0.04, 0.6, 0.03); },   // bonk
    shot() { this.tone(950, 0.05, 'square', 0.022, 0.45); this.noise(0.03, 0.025, 3000); },   // pop
    pickup() { [1046, 1318, 1568].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.05, 1, i * 0.06)); },   // xylophone
    confirm() { [784, 988, 1175].forEach((f, i) => this.tone(f, 0.1, 'triangle', 0.04, 1, i * 0.05)); },
    select() { this.tone(1300, 0.03, 'square', 0.02, 1); this.noise(0.02, 0.02, 4000); },   // woodblock
    siren() { this.tone(330, 0.22, 'sawtooth', 0.03, 1.5); this.tone(335, 0.22, 'square', 0.015, 1.5); this.tone(440, 0.34, 'sawtooth', 0.03, 0.7, 0.22); this.tone(445, 0.34, 'square', 0.015, 0.7, 0.22); },   // a-oo-ga
    boing() { this.tone(160, 0.4, 'sine', 0.06, 3); this.tone(180, 0.4, 'triangle', 0.02, 2.4, 0.05); },
    fanfara() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i === 3 ? 0.5 : 0.14, 'sawtooth', 0.025, 1, i * 0.12)); },
    team() { [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.2, 'sawtooth', 0.025, 1, i * 0.1)); },
  };
  Audio.sfx = function (name) { if (this.muted || !this.ctx) return; const c = CARTOON[name]; if (c) c.call(this); else baseSfx(name); };
})();
