# PROGETTO "STIVALE" (titolo provvisorio) — prompt delle immagini

Corri e spara in stile arcade anni '90 + boss a fasi, disegnato come un cartone animato degli anni '30.
Un pianeta gemello della Terra a forma di Stivale, abitato da animali, viene invaso da "alieni"
in tuta spaziale. Nell'ultimo livello si scopre che gli alieni sono umani della Terra.

## Regole per tutte le tavole
1. Genera **prima la prova di stile (blocco 0)**. Dalle tavole successive allega sempre la tavola di
   **Remo** come riferimento, così tutto il gioco ha lo stesso tratto.
2. In fondo a ogni prompt resta sempre: *nessun testo, nessuna scritta, nessun numero*.
3. Personaggi e nemici: **sfondo trasparente**, rivolti a **DESTRA**, figure che **non si toccano**.
4. Non nominare mai altri videogiochi o studi di animazione nel prompt: basta lo stile descritto qui.

### Base di stile (va all'inizio di ogni prompt di personaggi, nemici e boss)
```
Stile cartone animato americano degli anni '30 ("rubber hose"): contorno d'inchiostro nero spesso
e morbido, arti a tubo di gomma senza gomiti, guanti bianchi a quattro dita, occhi grandi con la
pupilla a spicchio di torta, sorriso largo, colori ad acquerello caldi e leggermente sbiaditi,
lieve grana della pellicola. Personaggi originali, espressivi, pose esagerate piene di energia.
```

---
## BLOCCO 0 — la prova di stile (4 immagini)

### 0.1 Remo, il lupo (eroe 1) → `remo.png`
```
[BASE DI STILE] Sprite sheet su sfondo trasparente, griglia 4x4, stessa scala, figure staccate
tra loro, tutte rivolte a DESTRA. Soggetto: REMO, giovane lupo grigio antropomorfo, coraggioso e
un po' spaccone, sciarpa rossa al collo, giubbotto da aviatore marrone, pantaloni corti, scarponi,
pistola a raggi giocattolo di latta rossa. Pose: 1-2) in guardia che respira; 3-8) corsa (sei
fotogrammi del ciclo completo); 9) salto a braccia aperte; 10) spara in avanti; 11) spara verso
l'alto; 12) accovacciato che spara; 13) lancia una bomba; 14) colpito, con le stelline intorno;
15) sconfitto, disteso a terra; 16) esulta con il pugno alzato. Nessun testo, nessuna scritta.
```

### 0.2 Il soldato invasore → `invasore.png`
```
[BASE DI STILE] Sprite sheet su sfondo trasparente, griglia 2x4, stessa scala, rivolto a DESTRA.
Soggetto: un soldato "alieno" in tuta spaziale bianca degli anni '50 un po' goffa, grosso casco
tondo a specchio (non si vede il volto), zaino a razzo, pistola a raggi, stivaloni. Pose: 1-3)
cammina (tre fotogrammi); 4) spara; 5) spara verso l'alto; 6) colpito, salta per lo spavento;
7) sconfitto, stelline e casco storto; 8) scappa agitando le braccia. Nessun testo.
```

### 0.3 Lo sfondo di Roma → `bg_roma.png`
```
[BASE DI STILE] Fondale orizzontale molto largo per un videogioco a scorrimento, dipinto come un
cartone animato degli anni '30: Roma abitata da animali, rovine del Foro con colonne che
sorridono, il Colosseo in fondo, pini marittimi, dischi volanti di latta nel cielo al tramonto.
La strada in basso (ultimo terzo dell'immagine) è libera e ripetibile in orizzontale. Nessun
personaggio in primo piano, nessun testo.
```

### 0.4 Il primo boss: il Gladiatore d'Acciaio → `boss_gladiatore.png`
```
[BASE DI STILE] Sprite sheet su sfondo trasparente, griglia 2x4, stessa scala, rivolto a SINISTRA.
Soggetto: un enorme robot da gladiatore costruito dagli invasori, fatto di latta e bulloni, elmo
con cresta, scudo tondo, tridente, occhi a lampadina, pilotato da un piccolo alieno col casco a
specchio seduto nella testa. Pose: 1) fermo minaccioso; 2) passo; 3) carica il colpo; 4) colpo
di tridente; 5) lancia lo scudo; 6) colpito, bulloni che saltano; 7) semidistrutto, fuma;
8) crolla a pezzi. Nessun testo.
```

---
## BLOCCO 1 — gli altri eroi (allega `remo.png`)
Stesso prompt di Remo, cambia solo il soggetto:
- **NINA → `nina.png`**: gatta veneziana bianca e nera, agile e furba, basco rosso, mantellina da
  carnevale, fionda-blaster d'ottone.
- **BRUNO → `bruno.png`**: cinghiale toscano grosso e buono, grembiule da contadino, bretelle,
  cappello di paglia, un enorme blaster a trombone.
- **ALBA → `alba.png`**: stambecca delle Dolomiti, sciarpa verde, zaino da alpinista, corna ricurve,
  balestra a raggi.

## BLOCCO 2 — il veicolo e gli amici (allega `remo.png`)
- **La Vespona → `vespona.png`**: sprite sheet 1x6, rivolta a DESTRA: uno scooter italiano d'epoca
  trasformato in carro armato di latta con cannoncino sul manubrio e ruote cingolate, con gli occhi
  sui fanali. Pose: ferma; corre (due fotogrammi); spara; salta; ammaccata che fuma.
- **Il professor Gufo → `gufo.png`**: griglia 1x4: un vecchio gufo inventore, occhiali enormi,
  camice pieno di toppe, in piedi; indica; ride; si aggiusta gli occhiali.
- **I prigionieri → `prigionieri.png`**: griglia 2x4: quattro animali di paese (una nonna papera,
  un riccio fornaio, una capra postino, un ragazzino coniglio). Riga 1: legati con una corda e
  imbronciati; riga 2: liberi che salutano e ringraziano.

## BLOCCO 3 — gli altri invasori (allega `invasore.png`)
- **Il robottino → `robottino.png`**, griglia 1x6: robot di latta a molla con la chiave sulla
  schiena, cammina (tre fotogrammi), spara scintille, si scarica, esplode in molle e bulloni.
- **Il disco volante → `disco.png`**, griglia 1x5: piccolo disco di latta con una cupola di vetro e
  un alieno col casco dentro; vola (due fotogrammi), sgancia una bomba, colpito, precipita.
- **L'ufficiale → `ufficiale.png`**, griglia 2x4: come il soldato ma con la tuta dorata, il
  mantello e un megafono; pose come il soldato.

## BLOCCO 4 — i fondali degli 8 livelli
Stesso prompt di Roma (0.3), cambia solo il luogo:
1. **Roma** (già fatto nella prova).
2. **Venezia** → `bg_venezia.png`: canali, gondole, ponti a schiena d'asino che sorridono, palazzi
   gotici, la laguna di notte con i riflessi.
3. **Firenze** → `bg_firenze.png`: la cupola del Duomo, il Ponte Vecchio con le botteghe, l'Arno,
   cipressi sulle colline, tetti rossi.
4. **Torino** → `bg_torino.png`: una grande fabbrica di automobili d'epoca, catene di montaggio,
   la Mole sullo sfondo, fumo dei camini.
5. **Genova** → `bg_genova.png`: il porto, la Lanterna, gru, navi a vapore, vicoli che scendono al mare.
6. **Le Dolomiti** → `bg_dolomiti.png`: montagne rosa al tramonto, neve, funivie, baite, abeti.
7. **Lo Stretto (Reggio)** → `bg_stretto.png`: lungomare con le palme, sull'acqua le città
   capovolte nel cielo (la Fata Morgana).
8. **L'Etna** → `bg_etna.png`: il vulcano che fuma e, dentro, la base degli invasori di latta con
   tubi, luci e razzi.

## BLOCCO 5 — i boss (rivolti a SINISTRA, griglia 2x4, stesse 8 pose del Gladiatore)
1. **Roma — Il Gladiatore d'Acciaio** (già fatto nella prova).
2. **Venezia — La Piovra di Latta** → `boss_piovra.png`: una piovra meccanica che esce dalla laguna,
   tentacoli a molla, occhio-oblò con un alieno dentro, una gondola incastrata in testa.
3. **Firenze — La Cupola Volante** → `boss_cupola.png`: un disco volante enorme travestito da
   cupola di chiesa, finestrelle, raggi traenti, cannoni che escono dalle tegole.
4. **Torino — La Catena di Montaggio** → `boss_catena.png`: un robot fatto di bracci meccanici,
   chiavi inglesi e ruote dentate, monta pezzi mentre combatte.
5. **Genova — Il Sottomarino Spaziale** → `boss_sottomarino.png`: sottomarino a razzo con periscopio
   a occhio, siluri con la faccia, emerge e si immerge.
6. **Dolomiti — Il Pupazzo di Neve Meccanico** → `boss_pupazzo.png`: un gigante di neve con dentro
   un robot, naso a carota-trapano, lancia palle di neve enormi.
7. **Stretto — La Nave Miraggio** → `boss_miraggio.png`: una nave capovolta nel cielo, fatta di
   specchi, che crea copie di sé stessa.
8. **Etna — Il Comandante** → `boss_comandante.png`: un robot gigante dorato a forma di astronauta
   con il casco a specchio enorme. **Posa 8**: il casco si apre e dentro c'è un **uomo** con i
   baffi, sorpreso (il colpo di scena).

## BLOCCO 6 — scene e ritratti (per ultimi)
- **Ritratti** → `ritratti.png`, griglia 2x4, mezzo busto, sfondo trasparente: Remo, Nina, Bruno,
  Alba, il professor Gufo, un soldato invasore, l'ufficiale, il Comandante (casco chiuso).
- **Scene** (orizzontali, larghe, come sfondi):
  - `scena_arrivo.png`: i dischi volanti che scendono su Roma, gli animali che scappano;
  - `scena_rivelazione.png`: il Comandante sconfitto che si toglie il casco: è un uomo, gli
    animali lo guardano a bocca aperta;
  - `scena_finale.png`: animali e umani seduti allo stesso tavolo in una piazza, al tramonto.
