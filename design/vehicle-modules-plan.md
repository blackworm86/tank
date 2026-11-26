# Piano: mezzi modulari visibili

> Rustline Commander · scritto nell'iteration 16 · costruito nell'iteration 18 (vedi "Deciso e costruito" in fondo).
> Richiesta: "voglio che una modifica si veda sul mezzo (una torretta nuova, un doppio cannone,
> placche di corazzatura, cingoli più ampi ecc.)".

## Cosa c'è oggi

- Tre modelli scritti a mano: `makeAPCModel`, `makeLightTankModel` e `makeTankModel`, in `js/view.js`.
- Solo il carro da battaglia mostra qualcosa dei pezzi montati: le gonne della corazza, la lunghezza
  della canna e l'antenna. Sull'APC e sul carro leggero un pezzo comprato non cambia niente a vista.
- I pezzi (`PARTS` in `js/sim.js`) sono numeri: velocità, integrità, dispersione. Non sanno dove
  stanno sul mezzo.

## L'idea: uno scafo con dei punti di attacco

Ogni scafo diventa un telaio con dei **punti di attacco** (hardpoint). Ogni pezzo è un **modulo**
che occupa un punto e porta sia i suoi numeri sia il suo modello in voxel. Il mezzo si costruisce
montando i moduli sui punti, così ogni acquisto si vede.

| Punto | Moduli (esempi) | Cosa si vede |
|---|---|---|
| **Torretta** | anello piccolo (APC), torretta media, torretta pesante, torretta aperta da tecnica | forma e dimensione della torretta |
| **Arma principale** | 25mm, 75mm, 105mm, **doppio cannone**, lanciarazzi, HMG | canne (una o due), lunghezza, freno di bocca, contenitore dei razzi |
| **Coassiale / tetto** | MG di serie, canna pesante, raffreddata ad acqua (manicotto), **binata** | una o due canne accanto al cannone, manicotto verde, nastro |
| **Fianchi** | lamiere saldate, **placche** composite, gonne, gabbia anti-razzo | placche sui fianchi (più strati = più pezzi), griglia della gabbia |
| **Fronte** | lama da ruspa, placche frontali, sacchi di sabbia | lama davanti, placche inclinate |
| **Cingoli** | di serie, **larghi**, da corsa | larghezza del cingolo e numero di ruote |
| **Retro** | motore rifatto, turbina, serbatoi extra | grate, scarichi che fumano, taniche |
| **Tetto / antenna** | radio, traliccio, radar, sensori | antenna, traliccio, parabola che gira |
| **Vano truppe** | maniglie, vano ampliato | maniglie sui fianchi, scafo allungato |

## Regole

1. **Un modulo è un pezzo solo.** Ha un nome, un punto di attacco, il costo, gli effetti di oggi
   (velocità, integrità, eccetera), un peso e una funzione `build(group, hull)` che aggiunge i
   suoi voxel. I `PARTS` di oggi diventano moduli: nessun effetto si perde.
2. **Ogni scafo dichiara i suoi punti:** posizione, rotazione e quali tipi di modulo accetta.
   - L'APC modulare ha più punti (fianchi, fronte, tetto e vano), ma una torretta piccola.
   - Il carro leggero accetta torrette fino a media.
   - Il carro da battaglia accetta la torretta pesante e il doppio cannone.
3. **Il peso conta.** La somma dei pesi abbassa la velocità e la rotazione. Un mezzo carico di
   placche si vede pesante e va piano. È già il "malus" di oggi, ma ora ha una forma.
4. **La torretta comanda l'arma.** Una torretta ha una classe (piccola, media o pesante) e
   un'arma si monta solo su una torretta abbastanza grande. Il doppio cannone ha bisogno della
   torretta pesante: due canne, più danno per colpo, ricarica alternata, rotazione più lenta.
5. **Il danno si vede.** Quando l'integrità scende, alcune placche si staccano (voxel che cadono).
   I moduli colpiti da un razzo restano anneriti fino all'officina. Prima solo estetico, poi
   (opzionale) una placca persa toglie la sua protezione fino alla riparazione.
6. **L'officina mostra il mezzo.** Nella scheda dei sistemi base, un'anteprima 3D del mezzo
   ruota al centro. Quando passi il mouse su un modulo, l'anteprima lo monta per prova, così vedi
   il cambiamento prima di comprare.

## Come costruirlo (iteration 17)

1. `js/modules.js` (nuovo, dopo `loadout.js`):
   - `HARDPOINTS` per scafo;
   - `MODULES` per punto di attacco, con i numeri di `PARTS` e una `build()` ciascuno;
   - `vehicleSpec()`, che legge `state.parts` e restituisce i moduli montati.
2. `js/view.js`: un solo `buildVehicleModel(spec)` sostituisce i tre modelli. Costruisce lo scafo,
   poi chiama `build()` di ogni modulo nel suo punto. La torretta e la canna restano i gruppi che
   `turretYaw` e il rinculo già muovono.
3. `tankStats()` legge gli effetti dai moduli, invece che da `PARTS`. Gli effetti sono gli stessi,
   quindi l'equilibrio di oggi resta valido.
4. Nell'officina, l'anteprima 3D: una seconda scena piccola renderizzata nel pannello.
5. I nuovi moduli visibili, in quest'ordine:
   - doppio cannone e torretta pesante;
   - placche sui fianchi a strati;
   - cingoli larghi;
   - lama frontale;
   - gabbia anti-razzo, poi la parabola del radar.
6. Le placche che si staccano col danno.

## Da decidere con te

- **Quanti punti per scafo.** Proposta: 6-7 per l'APC, 5 per gli altri. Meno punti vuol dire più
  scelte difficili.
- **Il doppio cannone.** Un modulo da trovare (raro, nei campi dei predoni) o da comprare in officina?
- **Le placche perse.** Solo estetica, o anche meno protezione fino alla riparazione (più survival)?

## Deciso e costruito (iteration 18)

Risposte: "i punti di attacco variano a seconda dello scafo", schema **B: 6 / 4 / 5**; "l'officina a
fine mappa propone da 0 a 3 moduli nuovi da comprare, generati casualmente", **tutto casuale**; "le
placche danneggiate riducono la loro efficacia fino a 0 finché non vengono riparate; e esteticamente
degradano".

- **Punti di attacco** (`HARDPOINTS` in `js/modules.js`), con un carico massimo:

  | Scafo | Punti | Carico |
  |---|---|---|
  | APC | fronte, fianchi, trazione, torretta (meccanica o coassiale), tetto, vano | 9 |
  | Carro leggero | corazza (fronte o fianchi), trazione, torretta (meccanica, coassiale o cannone), tetto | 5 |
  | Carro da battaglia | fronte, fianchi, trazione, torretta (anche cannone e torretta pesante), tetto | 10 |

  Un punto prende un modulo solo; un punto vuoto vale la dotazione di serie.
- **Moduli:** 31, in tre rarità, con peso, prezzo, bonus e malus. `PARTS` non esiste più: motore,
  cingoli, corazza, radio, sensori, vano e telaio sono moduli come gli altri.
- **Officina:** a ogni visita 0-3 offerte a caso (`ws_none`, `ws_offers_max`); i rari e gli
  eccezionali crescono con la colonna della campagna. Un click su un punto sceglie dove montare. I
  moduli tolti vanno in un magazzino, da cui si rimontano o si vendono (`module_refund`). Il mezzo
  gira in un'anteprima al centro della tab Moduli (la camera di gioco, ravvicinata).
- **Modelli:** i tre modelli scritti a mano restano come scafo base. `dressTank()` ci aggiunge la
  `MODEL_BUILD` di ogni modulo montato, sullo scafo, sulla torretta o sulla canna.
- **Placche:** fronte e fianchi (la corazza a strati copre anche il retro). Ogni colpo sul lato
  coperto ferma `k × integrità` del danno e consuma la placca (`plate_wear`, i proiettili molto meno).
  A 4 gradini di integrità il modello si rifà: ruggine, pezzi piegati e mancanti, bruciature; a 0
  restano monconi neri e la protezione è nulla. Si riparano in officina (`plate_repair_k`).

Non fatto: la gabbia anti-razzo resta un sistema avanzato; una scena separata per l'anteprima non
serviva.
