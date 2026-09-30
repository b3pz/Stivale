'use strict';
/* ============================================================
   I LIVELLI — una pianta diversa per ogni città.
   plats: [x, larghezza, y (altezza del piano), {belt: ±1 nastro, fall: crolla}]
   waves: [x della telecamera, nemici, arena?]  f soldato · F soldato su una piattaforma ·
          b legionario · d disco volante · r robottino · u ufficiale
   pris:  [x, arma che lasciano, 'p' = sopra una piattaforma]
   hazard: acqua (Venezia) · vasi (Firenze) · nastri (Torino) · gru (Genova) ·
           ghiaccio (Dolomiti) · miraggi (Stretto) · lava (Etna)
   ============================================================ */
const PIANTE = [
  { // ROMA: il livello per imparare, niente trappole
    arena: 6700, veh: 2900, hazard: null,
    plats: [[1450, 260, 470], [1800, 300, 420], [2200, 240, 470], [2480, 220, 340], [4000, 300, 470], [4420, 260, 390], [5200, 280, 470], [5560, 260, 380], [5900, 240, 470]],
    waves: [[150, 'fff'], [700, 'ffb', 1], [1250, 'dff'], [1800, 'Ffdf', 1], [2500, 'ddf'], [3300, 'bffb', 1], [4100, 'Ffdf'], [4700, 'bddff', 1], [5400, 'FFfd'], [6000, 'dddb', 1]],
    crates: [[600, 'crate'], [1150, 'barrel'], [2050, 'crate'], [3050, 'barrel'], [3150, 'barrel'], [4300, 'crate'], [5050, 'barrel'], [6150, 'crate']],
    pris: [[980, 'H'], [2560, 'S', 'p'], [3900, 'F'], [5620, 'R', 'p'], [6300, 'H']],
  },
  { // VENEZIA: pontili bassi e l'acqua alta che sale (in acqua si corre piano)
    arena: 7000, veh: 3500, hazard: 'acqua',
    plats: [[700, 300, 520], [1150, 260, 480], [1500, 360, 450], [1950, 280, 520], [2300, 300, 400], [2700, 260, 500], [3150, 420, 470], [3950, 260, 520], [4300, 300, 430], [4700, 280, 520], [5100, 360, 470], [5600, 260, 500], [5950, 320, 420], [6400, 300, 510], [7150, 240, 500], [7760, 240, 500]],
    waves: [[150, 'ff'], [700, 'ffb', 1], [1250, 'dFf'], [1850, 'fFdf', 1], [2500, 'ddr'], [3300, 'bffu', 1], [4100, 'Ffdf'], [4700, 'bddff', 1], [5400, 'FFfd'], [6000, 'dddb', 1], [6500, 'ff']],
    crates: [[560, 'crate'], [1400, 'barrel'], [2150, 'crate'], [3000, 'barrel'], [4150, 'crate'], [5000, 'barrel'], [5850, 'crate'], [6700, 'barrel']],
    pris: [[1000, 'H'], [2400, 'S', 'p'], [3300, 'F', 'p'], [5200, 'R', 'p'], [6500, 'H', 'p']],
  },
  { // FIRENZE: i corridoi del Ponte Vecchio su due piani; dall'alto piovono vasi di fiori
    arena: 6800, veh: 4300, hazard: 'vasi',
    plats: [[600, 280, 480], [1000, 700, 440], [1250, 300, 260], [1900, 260, 470], [2250, 650, 430], [2500, 280, 250], [3150, 300, 480], [3600, 700, 440], [3850, 320, 260], [4700, 300, 470], [5100, 650, 430], [5350, 280, 250], [6000, 300, 470]],
    waves: [[150, 'fff'], [800, 'FFb', 1], [1400, 'Ffd'], [2100, 'FFfu', 1], [2800, 'ddf'], [3500, 'FbFf', 1], [4200, 'dfr'], [4900, 'FFbu', 1], [5600, 'ddFf'], [6100, 'bFFd', 1]],
    crates: [[500, 'barrel'], [1800, 'crate'], [2100, 'barrel'], [3050, 'crate'], [3500, 'barrel'], [4600, 'crate'], [5900, 'barrel'], [6300, 'crate']],
    pris: [[1350, 'S', 'p'], [2000, 'H'], [2600, 'F', 'p'], [3950, 'R', 'p'], [5450, 'H', 'p']],
  },
  { // TORINO: la fabbrica, piattaforme che sono nastri trasportatori
    arena: 7200, veh: 2600, hazard: 'nastri',
    plats: [[700, 360, 470, { belt: 1 }], [1200, 300, 380], [1600, 420, 470, { belt: -1 }], [2100, 300, 360, { belt: 1 }], [2500, 360, 480], [3100, 420, 440, { belt: -1 }], [3600, 300, 300, { belt: 1 }], [4100, 420, 470, { belt: 1 }], [4600, 300, 360], [5000, 420, 470, { belt: -1 }], [5500, 300, 330, { belt: 1 }], [5900, 420, 460, { belt: -1 }], [6400, 360, 420, { belt: 1 }]],
    waves: [[150, 'rrf'], [700, 'rrb', 1], [1300, 'Frd'], [1900, 'rFdr', 1], [2600, 'ddr'], [3300, 'brrb', 1], [4100, 'Frdr'], [4800, 'bdduf', 1], [5500, 'FFrd'], [6100, 'rrdb', 1], [6600, 'rr']],
    crates: [[550, 'barrel'], [1450, 'crate'], [2350, 'barrel'], [3000, 'crate'], [3900, 'barrel'], [4800, 'crate'], [5750, 'barrel'], [6800, 'crate']],
    pris: [[1300, 'H', 'p'], [2200, 'S', 'p'], [3700, 'R', 'p'], [4700, 'F', 'p'], [6500, 'H', 'p']],
  },
  { // GENOVA: il porto, le gru lasciano cadere casse (guarda l'ombra!)
    arena: 7000, veh: 3300, hazard: 'gru',
    plats: [[800, 420, 500], [1500, 300, 460], [1900, 500, 500], [2600, 300, 420], [3100, 420, 500], [3700, 300, 380], [4100, 500, 480], [4800, 300, 420], [5200, 420, 500], [5900, 300, 440], [6300, 420, 500]],
    waves: [[150, 'fuf'], [700, 'ffu', 1], [1300, 'dFf'], [1900, 'Ffdu', 1], [2600, 'ddf'], [3300, 'buFb', 1], [4100, 'Ffdr'], [4800, 'uddff', 1], [5500, 'FFfd'], [6100, 'ddub', 1], [6500, 'uf']],
    crates: [[600, 'crate'], [1300, 'crate'], [2450, 'barrel'], [3000, 'crate'], [3950, 'barrel'], [4700, 'crate'], [5700, 'barrel'], [6800, 'crate']],
    pris: [[1000, 'H', 'p'], [2100, 'S', 'p'], [3800, 'F', 'p'], [5400, 'R', 'p'], [6500, 'H', 'p']],
  },
  { // DOLOMITI: si sale e si scende a scalini; per terra si scivola sul ghiaccio
    arena: 6800, veh: 3600, hazard: 'ghiaccio',
    plats: [[700, 260, 540], [1000, 260, 450], [1300, 300, 370], [1700, 280, 460], [2150, 260, 540], [2450, 260, 450], [2750, 300, 370], [3100, 260, 290], [3450, 300, 380], [3850, 260, 470], [4300, 280, 540], [4600, 260, 450], [4900, 300, 370], [5300, 280, 460], [5750, 300, 540], [6100, 300, 450], [6400, 260, 370]],
    waves: [[150, 'ffd'], [700, 'Ffb', 1], [1300, 'dFF'], [1900, 'FfdF', 1], [2600, 'ddd'], [3300, 'bFFb', 1], [4100, 'Ffdu'], [4800, 'bddFF', 1], [5500, 'FFfd'], [6000, 'dddb', 1]],
    crates: [[500, 'crate'], [1550, 'barrel'], [2350, 'crate'], [3300, 'barrel'], [4150, 'crate'], [5150, 'barrel'], [5650, 'crate'], [6650, 'barrel']],
    pris: [[1400, 'H', 'p'], [2850, 'S', 'p'], [3200, 'F', 'p'], [5000, 'R', 'p'], [6500, 'H', 'p']],
  },
  { // LO STRETTO: poche balaustre, tanti nemici… e alcuni sono miraggi
    arena: 7000, veh: 2500, hazard: 'miraggi',
    plats: [[900, 400, 480], [1600, 360, 440], [2400, 400, 480], [2950, 300, 400], [3700, 400, 470], [4400, 360, 420], [5100, 400, 480], [5600, 300, 400], [6300, 400, 470]],
    waves: [[150, 'ffff'], [700, 'ffbu', 1], [1300, 'dFfr'], [1900, 'fFdfu', 1], [2600, 'dddf'], [3300, 'bfffb', 1], [4100, 'Ffdfr'], [4800, 'bddffu', 1], [5500, 'FFfdd'], [6100, 'dddbu', 1], [6500, 'fff']],
    crates: [[650, 'crate'], [1400, 'barrel'], [2200, 'crate'], [2900, 'barrel'], [3600, 'crate'], [4300, 'barrel'], [5000, 'crate'], [6200, 'barrel']],
    pris: [[1100, 'H', 'p'], [2000, 'S'], [3050, 'F', 'p'], [4550, 'R', 'p'], [5750, 'H', 'p']],
  },
  { // ETNA: passerelle che crollano e getti di lava dal pavimento
    arena: 7400, veh: 2000, hazard: 'lava',
    plats: [[700, 300, 480], [1100, 260, 420, { fall: 1 }], [1450, 260, 380, { fall: 1 }], [1800, 300, 470], [2300, 260, 430, { fall: 1 }], [2650, 300, 360, { fall: 1 }], [3050, 300, 470], [3500, 260, 420, { fall: 1 }], [3850, 260, 350, { fall: 1 }], [4250, 300, 460], [4700, 260, 400, { fall: 1 }], [5050, 300, 470], [5500, 260, 420, { fall: 1 }], [5850, 260, 360, { fall: 1 }], [6300, 300, 470], [6750, 260, 430, { fall: 1 }]],
    geysers: [1620, 2150, 3300, 4550, 5300, 6150, 7000],
    waves: [[150, 'uff'], [700, 'fub', 1], [1300, 'dFr'], [1900, 'uFdr', 1], [2600, 'ddu'], [3300, 'bufb', 1], [4100, 'Frdu'], [4800, 'bdduf', 1], [5500, 'FFud'], [6100, 'dddb', 1], [6700, 'uur', 1]],
    crates: [[550, 'barrel'], [1300, 'crate'], [2500, 'barrel'], [3200, 'crate'], [4100, 'barrel'], [4900, 'crate'], [5700, 'barrel'], [6600, 'crate']],
    pris: [[800, 'H', 'p'], [1900, 'S', 'p'], [3100, 'F', 'p'], [4300, 'R', 'p'], [6350, 'H', 'p']],
  },
];
