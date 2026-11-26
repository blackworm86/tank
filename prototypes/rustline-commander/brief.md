# Game Brief: Rustline Commander

## In your words
un gioco roguelite o roguelike nel quale il giocatore è un comandante di APC o carro armato. Il carro armato può essere moddato, migliorato, modificato con pezzi che si possono comprare durante il loop di gioco. Il loop di gioco è ancora da stabilire. L'ambientazione direi post-apocalittica. Il giocatore, dicevo, è un comandante di un APC che controlla con comandi tank. Il punto è 3D, il punto di vista è isometrico con grafica 3D, isometrico alla real time strategy. I comandi principali sono i controlli del carro armato. Con VSD si ruota il carro e lo si fa avanzare o arretrare. Con il mouse si brandeggia l'arma principale del carro armato, che dovrebbe essere un cannone. La particolarità è che il mouse va alla velocità che decide il giocatore, ma la torretta e il cannone ci mette un po' di tempo a mettersi in linea e ad apportare una soluzione di tiro. Chiaramente il carro di base definisce la precisione del tiro se sta fermo e si riduce se si muove. Il campo di battaglia vorrei fosse distruttibile, con muri, edifici, formazioni rocciose, eccetera. Non sarebbe male se il mondo di gioco fosse in voxel, con canyon, laghi, fiumi, montagne e colline. E l'altra particolarità è che il giocatore potrà anche controllare sempre con il mouse, usando delle hotkeys per cambiare che cosa sta cercando di fare, truppe. È una specie di gioco strategico-tattico d'azione. Le truppe possono essere fanteria, cecchini, altri veicoli di supporto ai quali si può dare opzioni ordini di movimento, di prendere posizione dietro a coperture ovviamente distruttibili. La particolarità è che il commander che sta sul carro armato ha un raggio radio per dare i comandi limitato, che può migliorare migliorando la propria radio. Prova così.

1. Run: B voglio una mappa generata proceduralmente
2. Truppe: A ma le squadre sono veramnete strriminzite, il giocatore assolderà soldati che andranno a sostituire singoli sooldati caduti, potrà creare team personalizzati (squadra di fucilieri, team di cecchini, cecchino solitario, pezzo di artiglieria, medici, autoblindo, mitraglieri ecc.)
3. Nemico e vittoria: A
4. Tra i run: A
5. Feel: una via di mezzo; dipende dal loadout del giocatore, dai suoi gregari, da come vuole giocare il gioco
6. Look: A
7. Difficoltà: A
8. Fetta: A

After play: i voxel impediscono al carro di muoversi liberamente, serve un terreno con pendii, rampe... anche terreno impassabile chiaramente, ma nella demo praticamente il carro è immobilizzato da subito. deve essere anche possibile mettere in pausa tattica il gioco, in modo da poter dare comandi alle altre unità (vai, attacca, take cover, traccia percorso ecc.), con barra spaziatrice

After play: Dovresti rivedere la logica dei movimenti e il pathfinding dei soldati, diciamo. Per esempio, il cecchino del test è bloccato su questa specie di muro che c'è all'inizio del primo settore. Vorrei anche che durante la fase di comando, diciamo i comandi alle varie unità, ai vari soldati e ai vari altri mezzi quando ci saranno, anzi segnati che voglio anche un comando di debug o comunque di sviluppo nel quale posso cambiare e testare liberamente le squadre, aggiungere soldati, togliere soldati, aggiungere carri di supporto, unità di artiglieria, unità di mitragliatrici. Vorrei che le squadre di fanteria, i soldati, cercassero riparo quando avvicini il mouse a muri, case, anche allo stesso carro armato che la fanteria dovrebbe coprircisi dietro per ripararsi dai colpi. Un po' come succede in Company of Heroes quando Iron Harvest, quando con il mouse ti avvicini a uno spazio che la fanteria può utilizzare come copertura. Altra cosa, i mezzi devono avere diversi livelli di protezione di armatura tra il fronte, retro, lati e soffitto, diciamo, in modo che il giocatore debba manovrare il carro armato o manovrare i piccoli carri di supporto in modo da mostrare il lato più protetto al nemico e cercare di aggirare il nemico in modo da colpirlo da dietro. Ricordati che dando nella modalità di comando, non nella modalità azione, dovresti dare al giocatore la possibilità di indicare in quale direzione tenere mentre si muove o quale direzione tenere alle unità a cui sta dando comandi, quale direzione tenere mentre si muove, quale direzione tenere quando arriva in posizione di attacco, cliccando e trascinando una specie di freccia. Questo dovrebbe essere utilizzabile anche con la fanteria, con i mitraglieri, con l'artiglieria anticarro, con l'artiglieria campale e via così.

After play: Prima aggiungi la possibilità di far salire un certo numero di soldati all'interno del carro armato se il carro armato ha posto. Il carro può essere un main battle tank, un APC, può essere modificato, può essere aumentata la portata dei soldati che può portare, eccetera. E a inizio partita nel test fammi selezionare o il main battle tank o il carro leggero con la possibilità di passare da cannoncino a mitragliatrice e un APC.

**Pitch:** Comandi un carro armato arrugginito attraverso una terra desolata in voxel generata a ogni run: guidi con i cingoli, punti un cannone che insegue lento il mouse e mandi via radio piccole squadre di disperati dietro muri che crollano sotto il fuoco.

**Genre:** action roguelite + real-time tactics (tank action con comando di squadre)

**Controls:** W/S avanti/indietro, A/D ruota lo scafo (il tuo "VSD" letto come WASD) *(inferred (strong))*; mouse brandeggia il cannone, click sinistro spara; **Spazio: pausa tattica** (il tempo si ferma, selezioni e ordini restano attivi, WASD sposta la vista) *(you said)*; Tab passa da modalità Carro a modalità Comando *(guessed)*; in Comando o in pausa: click/trascina seleziona squadre (1–6 selezione rapida), click destro muove (vicino a una copertura = al riparo) o attacca il nemico sotto il mouse; V vai, F attacca (su un nemico, o avanzata d'assalto sul terreno), C copertura armano l'ordine del prossimo click; **click destro e trascina: una freccia indica la direzione da tenere all'arrivo** (i mezzi indietreggiano tenendo il fronte verso quella direzione) *(you said)*; passando il mouse vicino a muri, case o al carro compaiono i posti di copertura (verde pesante, giallo leggera) *(you said)*; Shift + click destro aggiunge una tappa al percorso; G seguimi, H fermi; **B sali a bordo, U scendi; X cannoncino/mitragliatrice sul carro leggero; frecce o click sceglie il mezzo nel titolo** *(you said)*; **F2: pannello sviluppo** (aggiungi/togli soldati, squadre, mezzi; K piazza un nemico al mouse) *(you said)*; rotella zoom, Q/E ruota la camera *(guessed)*. Il carro si guida con WASD in entrambe le modalità.

**Question:** guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15–20 minuti? *(guessed)*

**Hooks:** la torretta che insegue il mouse con ritardo e un cerchio di dispersione che si stringe da fermi e si allarga in movimento; il raggio radio che limita chi puoi comandare; tutto il mondo in voxel distruttibile, coperture comprese.

**Intent:** payoff builds (the build grows through the run) *(provisional)*

## Look and references
- Look: voxel 3D isometrico, deserto di ruggine: sabbia ocra e terra bruciata (terreno), canyon di roccia rossastra, acqua verde-torbida (laghi e fiumi), metallo arrugginito e lamiere (edifici, veicoli), cielo polveroso color pesca, fiamme e traccianti arancioni; i tuoi mezzi con strisce di vernice verde militare, i predoni rosso sangue e giallo. Dettaglio distintivo: ogni colpo stacca voxel che volano via come detriti cubici e si posano a terra; il cerchio radio è un anello tratteggiato ciano attorno al carro. Ogni figura disegnata in voxel (soldati, carri, edifici): niente emoji, niente cerchi semplici. *(provisional)*
- References: un RTS isometrico classico (la camera e le selezioni), un gioco a voxel distruttibile alla Teardown (i muri che cedono), un action roguelite alla Hades (il run e la valuta che resta) *(guessed)*.
- View: 3D · Camera: isometrica angolata (circa 55°) che segue il carro, con zoom e rotazione a scatti di 90° *(inferred (strong))*.

## First minute
Il carro parte in un avamposto ai margini di una valle di canyon; un messaggio radio dice "Muovi il carro: W/S, A/D". Esci dal cancello, muovi il mouse e vedi la torretta girare lenta verso il cursore, il reticolo largo mentre ti muovi. Un vecchio muro di predoni blocca la strada: lo prendi a cannonate e lo vedi esplodere in voxel. "Tab: comando" — selezioni la tua squadra di 3 fucilieri e il cecchino e li mandi dietro una roccia. Una pattuglia di 3 predoni a piedi spunta dalla collina: ti fermi, il cerchio si stringe, il colpo ne spazza via due insieme alla roccia dietro cui stavano; il cecchino finisce il terzo. Raccogli i rottami. *(guessed)*

## Challenge
I primi 2–3 minuti sono pattuglie leggere; il primo campo fortificato (bunker, un mitragliere dietro sacchi di sabbia, un tecnico con razzi) arriva verso il minuto 3–5 e lì serve usare truppe e terreno, non solo il cannone. Più ti allontani dall'avamposto di partenza, più i campi sono grossi e con veicoli; la fortezza del capo predone ha mura e un carro pesante. Se il carro viene distrutto il run finisce: tieni solo le piastrine permanenti e ricominci su una mappa nuova. *(provisional)*

## Core loop
- Esplori la mappa generata, combatti pattuglie e assalti campi predoni con carro e squadre.
- Raccogli rottami da relitti e campi ripuliti.
- Agli avamposti compri pezzi per il carro (cannone, cingoli, corazza, radio, motore), assoldi soldati per rimpiazzare i caduti e crei team su misura.
- Trovi e abbatti la fortezza del capo per vincere; se muori guadagni piastrine, compri un miglioramento permanente e riparti su una mappa nuova.
- Leads: l'azione del carro guida input e feel; il tactics/RTS guida ordini, selezione e camera; il roguelite guida il run, la morte e ciò che resta; l'economia a rottami è guidata dalle tue parole (comprare pezzi e soldati). *(inferred (strong))*

## Goal & fail state
- Vinci distruggendo la fortezza del capo predone e il suo carro pesante.
- Perdi quando il carro arriva a zero integrità: il run finisce.

## Features
- [x] Carro con controlli tank e torretta a rotazione limitata che insegue il mouse; precisione da fermi che peggiora in movimento (cerchio di dispersione visibile)
- [x] Mondo voxel generato a ogni run (colline, montagne, canyon, laghi, fiumi) con muri, edifici e rocce distruttibili dai colpi
- [x] Terreno percorribile: colline in pendii e rampe che il carro sale, strade larghe con sponde in rampa; scogliere, creste ripide e acqua profonda restano invalicabili
- [x] Pausa tattica con Spazio: ordini a tempo fermo (vai, attacca, copertura, percorso a tappe disegnato)
- [x] Corazza direzionale sui mezzi: fronte forte, fianchi medi, retro e tetto deboli; i mezzi fermi girano il fronte verso il nemico, quindi aggirarli paga
- [x] Freccia di direzione negli ordini (fanteria, mitraglieri, anticarro, mortai, mezzi) e archi di tiro per mitragliatrici e cannoni anticarro
- [x] Anteprima delle coperture sotto il mouse, anche dietro il carro e i mezzi alleati; copertura leggera e pesante
- [x] Nuove unità: cannone anticarro e carro di supporto (anche in caserma)
- [x] Scelta del mezzo a inizio run: carro da battaglia (cannone, 0 posti), carro leggero (cannoncino o mitragliatrice, tasto X, 2 posti), trasporto truppe (mitragliatrice pesante, 6 posti)
- [x] Fanteria a bordo: B fa salire le squadre selezionate se c'è posto, U le fa scendere; il pezzo officina Posti aumenta la capienza
- [x] Pannello sviluppo (F2) per comporre e testare squadre e nemici
- [x] Modalità Comando: selezione squadre e ordini movimento / attacco / copertura, solo per le squadre dentro il raggio radio
- [x] Squadre minuscole e personalizzabili: fucilieri, cecchini, mitraglieri, medici, mortaio, autoblindo; soldati assoldati per rimpiazzare i singoli caduti
- [x] Predoni con pattuglie, campi e fortezza finale: 4 tipi di nemici, ognuno attacca diversamente (fuciliere, mitragliere, razziere, veicolo/carro)
- [x] Avamposti con officina: pezzi per cannone, cingoli, corazza, radio, motore che cambiano i numeri del carro
- [x] Piastrine tra i run per miglioramenti permanenti (thin stand-in)

## Your systems
- carro con controlli tank e torretta che si allinea con ritardo · in the slice
- precisione da fermo e in movimento · in the slice
- campo di battaglia distruttibile in voxel · in the slice
- mappa generata proceduralmente · in the slice
- truppe con ordini (movimento, copertura) via hotkey e mouse · in the slice
- raggio radio limitato e migliorabile · in the slice
- pausa tattica e percorsi a tappe · in the slice
- corazza direzionale (fronte, lati, retro, tetto) · in the slice
- direzione da tenere negli ordini (freccia) · in the slice
- coperture con anteprima, anche dietro i mezzi · in the slice
- pannello di sviluppo per testare squadre · in the slice
- tipi di scafo (MBT, leggero, APC) scelti a inizio run · in the slice
- fanteria trasportata a bordo, capienza migliorabile · in the slice
- terreno a pendii e rampe percorribile dal carro · in the slice
- pezzi da comprare per moddare il carro · in the slice
- assoldare soldati e creare team personalizzati · in the slice
- valuta permanente tra un run e l'altro · thin stand-in *(guessed)*

## Keep
-

## Avoid
-

## Out of scope
- Un hub tra i run con personaggi e storia: grow it
- Molti biomi e boss: grow it
- Modificatori di difficoltà dopo una vittoria: change it after play
- Nebbia di guerra ed esplorazione: change it after play
- Unità eroe con abilità: change it after play
- Una campagna di missioni con trama: grow it
- Suono di battaglia che cambia con distanza e luogo: change it after play

## Build order
1. La fetta: un run su una mappa generata con un avamposto di partenza, 1–2 avamposti in giro, 4–5 campi predoni e la fortezza; vinci abbattendo il carro del capo, perdi se il tuo carro viene distrutto.
2. Carro, torretta e dispersione per primi, su terreno voxel distruttibile.
3. Squadre, ordini e raggio radio.
4. Nemici e campi, poi officina, reclutamento e piastrine.

---
**Kill condition:** se la torretta lenta risulta frustrante invece che tattica anche dopo due giri di taratura. *(guessed)*

**Who it's for / what they feel:** chi ama il tank action e gli RTS tattici, e vuole sentirsi un comandante che vince con la posizione e il tempismo, non solo con la potenza. *(guessed)*

**Games you love / don't:** *(guessed)* —
