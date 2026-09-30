# STIVALE (titolo provvisorio) — prova 0.4
Corri e spara in stile arcade con la grafica di un cartone animato degli anni '30.
Un pianeta a forma di Stivale abitato da animali viene invaso da "alieni" in tuta spaziale… che alla fine si scoprono umani.
Il soggetto è in `SOGGETTO.md`, i prompt delle immagini in `PROMPT_IMMAGINI.md`.

## Cosa c'è
- **4 eroi**: Remo (tuttofare), Nina (veloce, salta più in alto), Bruno (lento ma fortissimo, 15 granate), Alba (doppio salto).
- **8 missioni** di fila: Roma, Venezia, Firenze, Torino, Genova, Dolomiti, lo Stretto, l'Etna. Prima di ognuna il professor Gufo fa il briefing.
- **Nemici**: il soldato, il robottino a molla (scintille basse: salta), l'ufficiale col megafono (urlo alto: abbassati; urlo basso: salta),
  il legionario robot che carica, il disco volante (tiene le distanze, poi ti passa sopra e sgancia bombe).
- **La Vespona**: saltaci sopra (o premi su). Fuoco = cannone, granata = clacson (onda d'urto), giù + salto per scendere.
- **I prigionieri**: nonna papera, il riccio fornaio, la capra postino, il coniglietto. Liberali sparandogli: ti lasciano un'arma (H, S, F, R).
- **8 boss**, ognuno con i suoi attacchi:
  1. Il Gladiatore d'Acciaio: onde a terra, carica, scudo boomerang.
  2. La Piovra di Latta: onde, goccioloni d'olio, carica.
  3. Il Centurione Gigante (segnaposto finché non arriva la Cupola Volante): carica, chiama i soldati, onde.
  4. La Catena di Montaggio: ingranaggi lanciati (si possono abbattere), robottini, onde.
  5. Il Sottomarino Spaziale: siluri alti (giù) e bassi (salta), carica.
  6. Il Pupazzo di Neve Meccanico: palle di neve che rotolano, palle lanciate, onde.
  7. La Nave Miraggio (vola): pioggia di cristalli (guarda le ombre), raggio alto/basso, dischi volanti.
  8. Il Comandante: tutto quanto… e poi il casco si apre.
- Dopo l'Etna: la scena della rivelazione e il finale.
- Game over: fuoco = riprova la missione, start = titolo.

## Si gioca
Online: https://b3pz.github.io/Stivale/ · oppure apri `index.html` con Chrome, Edge o Firefox. 1 o 2 giocatori sullo stesso computer.

| | 1P tastiera | 2P tastiera | Pad |
|---|---|---|---|
| Muovi / mira | Frecce | W A S D | Levetta o croce |
| Fuoco | J | F | X |
| Salto | K | G | A |
| Granata | L | H | B |

- Su + fuoco: spara in alto · in aria giù + fuoco: spara in basso · giù: accovacciati (i raggi alti passano sopra).
- Giù + salto su una lastra: scendi.
- Un colpo e sei fuori, 3 vite. I boss si colpiscono meglio quando sono stanchi (le stelline sopra la testa).

## Grafica che manca ancora
- Gli **sfondi delle città** (Venezia, Firenze, Torino, Genova, Dolomiti, Stretto, Etna): finché non ci sono, si vede Roma ricolorata.
  Basta mettere `assets/bg/venezia.jpg`, `firenze.jpg`, `torino.jpg`, `genova.jpg`, `dolomiti.jpg`, `stretto.jpg`, `etna.jpg` e il gioco li usa da solo.
- Il boss di Firenze, **la Cupola Volante**.
- **Ritratti e scene** (blocco 6).

Il vecchio prototipo con i personaggi di Primal Sentinels è in `assalto/`.
