# MAMMA MIA, I MARZIANI! — prova 0.16
Corri e spara in stile arcade con la grafica di un cartone animato degli anni '30.
Un pianeta a forma di Stivale abitato da animali viene invaso da "alieni" in tuta spaziale… che alla fine si scoprono umani.
Il soggetto è in `SOGGETTO.md`, i prompt delle immagini in `PROMPT_IMMAGINI.md`.

## Cosa c'è
- **4 eroi**: Remo (tuttofare), Nina (veloce, salta più in alto), Bruno (lento ma fortissimo, 15 granate), Alba (doppio salto).
- **8 missioni**, ognuna con la sua pianta e la sua trappola:
  Roma (per imparare) · Venezia (l'acqua alta: in acqua si corre piano) · Firenze (vasi di fiori dalle finestre) ·
  Torino (nastri trasportatori) · Genova (le gru fanno cadere casse) · Dolomiti (per terra si scivola sul ghiaccio) ·
  lo Stretto (alcuni nemici sono miraggi) · Etna (passerelle che crollano e getti di lava).
  Prima di ognuna il professor Gufo fa il briefing.
- **Bruno si unisce a Firenze, Alba sulle Dolomiti**: nel briefing sinistra/destra cambia eroe.
- **Salvataggio**: il gioco ricorda fin dove sei arrivato; dal titolo puoi ripartire da una missione già raggiunta.
- **Difficoltà**: facile (5 vite da 3 cuori) · normale (4 vite da 2 cuori) · arcade (3 vite, un colpo e sei fuori).
- **Menu**: gioca, come si gioca, record, opzioni (difficoltà, volume musica ed effetti, tasti di tastiera e joypad). In partita INVIO/START, ESC o P: pausa.
- **Record**: la classifica dei migliori 8 punteggi, con le iniziali.
- **Musica anni '30** fatta dal gioco: swing, tuba, clarinetto, fisarmonica, tarantella, un tema per città. Suoni da cartone (boing, fischio, clacson).
- **Nemici**: il soldato, il robottino a molla (scintille basse: salta), l'ufficiale col megafono (urlo alto: abbassati; urlo basso: salta),
  il legionario robot che carica, il disco volante (tiene le distanze, poi ti passa sopra e sgancia bombe).
- **La Vespona**: saltaci sopra (o premi su). Fuoco = cannone, granata = clacson (onda d'urto), giù + salto per scendere.
- **I prigionieri**: nonna papera, il riccio fornaio, la capra postino, il coniglietto. Liberali sparandogli: ti lasciano un'arma (H, S, F, R).
- **8 boss**, ognuno con i suoi attacchi:
  1. Il Gladiatore d'Acciaio: onde a terra, carica, scudo boomerang.
  2. La Piovra di Latta: onde, goccioloni d'olio, carica.
  3. La Cupola Volante (vola): cannonate dalle tegole, raggio traente che ti insegue, dischi volanti. Quando è stanca cade a terra: colpiscila!
  4. La Catena di Montaggio: ingranaggi lanciati (si possono abbattere), robottini, onde.
  5. Il Sottomarino Spaziale: siluri alti (giù) e bassi (salta), carica.
  6. Il Pupazzo di Neve Meccanico: palle di neve che rotolano, palle lanciate, onde.
  7. La Nave Miraggio (vola): pioggia di cristalli (guarda le ombre), raggio alto/basso, dischi volanti.
  8. Il Comandante: tutto quanto… e poi il casco si apre.
- Ogni città ha il suo fondale, le sue piattaforme disegnate e i suoi oggetti di scena (capitello, gondola, vaso, auto, bitta, pupazzo di neve, palma, tubo).
- Casse delle armi, granate, barili, colpi, esplosioni, cornici del punteggio e barra del boss: tutto disegnato (blocco 8).
- Dopo l'Etna: la scena della rivelazione e il finale.
- Game over: fuoco = riprova la missione, start = titolo.

## Si gioca
Online: https://b3pz.github.io/Stivale/ (il repository si chiama ancora Stivale) · oppure apri `index.html` con Chrome, Edge o Firefox. 1 o 2 giocatori sullo stesso computer.

| | 1P tastiera | 2P tastiera | Pad |
|---|---|---|---|
| Muovi / mira | Frecce | W A S D | Levetta o croce |
| Fuoco | J | F | X |
| Salto | K | G | A |
| Granata | L | H | B |

- Su + fuoco: spara in alto · in aria giù + fuoco: spara in basso · giù: accovacciati (i raggi alti passano sopra).
- Giù + salto su una lastra: scendi.
- I cuori dipendono dalla difficoltà. I boss si colpiscono meglio quando sono stanchi (le stelline sopra la testa).

## Grafica
Tutta disegnata: logo, scene d'apertura, rivelazione e finale, ritratti, teste nel punteggio.

Il vecchio prototipo con i personaggi di Primal Sentinels è in `assalto/`.
