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

After play: Non sono soddisfatto del terreno voxel, vorrei un terreno più "granulare", con maggior dettaglio/definizione, e senza vedere i bordi dei voxel, un terreno più realistico. Fammi vedere come potrebbe essere - il terreno deve mostrare prati secchi, fango, acqua, pietre, strade in asfalto, boschi e foreste.

After play: il carro (e penso in generale i veicoli) si blocca spesso nel terreno. l'officina è difficile da navigare, entrare è uscire è difficile; cambiala con un capanno degli attrezzi, a cui basta avvicinarsi per aprire il menu di modifica. ATTENZIONE - comprando un upgrade e poi tornando alla versione precedente, non è più possibile ripristinare l'upgrade comprato e si perdono i crediti. Fai in modo che il gicoatore possa tornare all'upgrade precedente (downgrade) recuperando il 70% dei crediti spesi ("sei sicuro?"

After play: no, è ingiocabile, il carro si blocca continuamente nelle strutture e nelle asperità del terreno. ridisegna la mappa, serviranno regole precise per la generazione delle mappe proedurali. i vari soldati devono avere comportamenti diversi, al momento il cecchino si avvicina ai nemici come se fosse un'unità di fanteria normale, dovrebbe invece appostarsi in una posizione sopraelevata e dare copertura da lunga distanza. lo stesso dovrebbero fare le altre unità (cercare copertura, sparare da dietro la copertura, preparare imboscate ecc.) i soldati devono poter migliorare col tempo, se sopravvivono (più veloci, mira migliore ecc.)

After play: il carro si muove meglio. * ridisegna la mappa di test, non riesco a completarla, non c'è modo di attraversare il fiume * gli edifici impedisocno il movimento, soprattutto quello iniziale * dando comandi ai carri amici, cliccando sul proprio carro significa "seguimi". in futuro potremo dare comandi di formazione (colonna, riga, wedge destro/sinistro ecc) * i soldati devono poter entrare negli edifici

**Pitch:** Comandi un carro armato arrugginito attraverso una terra desolata in voxel generata a ogni run: guidi con i cingoli, punti un cannone che insegue lento il mouse e mandi via radio piccole squadre di disperati dietro muri che crollano sotto il fuoco.

**Genre:** action roguelite + real-time tactics (tank action con comando di squadre)

**Controls:** W/S avanti/indietro, A/D ruota lo scafo (il tuo "VSD" letto come WASD) *(inferred (strong))*; mouse brandeggia il cannone, click sinistro spara; **Spazio: pausa tattica** (il tempo si ferma, selezioni e ordini restano attivi, WASD sposta la vista) *(you said)*; Tab passa da modalità Carro a modalità Comando *(guessed)*; in Comando o in pausa: click/trascina seleziona squadre (1–6 selezione rapida), click destro muove (vicino a una copertura = al riparo) o attacca il nemico sotto il mouse; V vai, F attacca (su un nemico, o avanzata d'assalto sul terreno), C copertura armano l'ordine del prossimo click; **click destro e trascina: una freccia indica la direzione da tenere all'arrivo** (i mezzi indietreggiano tenendo il fronte verso quella direzione) *(you said)*; passando il mouse vicino a muri, case o al carro compaiono i posti di copertura (verde pesante, giallo leggera) *(you said)*; Shift + click destro aggiunge una tappa al percorso; avvicinati al capanno degli attrezzi di un avamposto per le modifiche *(you said)*; G seguimi, H fermi, **I imboscata** (la squadra si apposta al riparo e tiene il fuoco finché il nemico non è vicino) *(you said)*; **click destro su un edificio: la fanteria entra; sul proprio carro: seguimi** *(you said)*; **B sali a bordo, U scendi; X cannoncino/mitragliatrice sul carro leggero; frecce o click sceglie il mezzo nel titolo** *(you said)*; **F2: pannello sviluppo** (aggiungi/togli soldati, squadre, mezzi; K piazza un nemico al mouse) *(you said)*; rotella zoom, Q/E ruota la camera *(guessed)*. Il carro si guida con WASD in entrambe le modalità.

**Question:** guidare il carro, anticipare la torretta lenta e dirigere squadre fragili entro il raggio radio su un terreno che si sbriciola è divertente per un run da 15–20 minuti? *(guessed)*

**Hooks:** la torretta che insegue il mouse con ritardo e un cerchio di dispersione che si stringe da fermi e si allarga in movimento; il raggio radio che limita chi puoi comandare; tutto il mondo in voxel distruttibile, coperture comprese.

**Intent:** payoff builds (the build grows through the run) *(provisional)*

## Look and references
- Look: 3D isometrico; il terreno è una superficie liscia e dettagliata senza bordi di voxel (prati secchi, fango, roccia, strade in asfalto, terra, ciuffi d'erba, pietre, boschi e foreste, acqua increspata) *(you said)*; edifici, coperture e figure restano in voxel; prima era un deserto di ruggine: sabbia ocra e terra bruciata (terreno), canyon di roccia rossastra, acqua verde-torbida (laghi e fiumi), metallo arrugginito e lamiere (edifici, veicoli), cielo polveroso color pesca, fiamme e traccianti arancioni; i tuoi mezzi con strisce di vernice verde militare, i predoni rosso sangue e giallo. Dettaglio distintivo: ogni colpo stacca voxel che volano via come detriti cubici e si posano a terra; il cerchio radio è un anello tratteggiato ciano attorno al carro. Ogni figura disegnata in voxel (soldati, carri, edifici): niente emoji, niente cerchi semplici. *(provisional)*
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
- [x] Terreno realistico disegnato liscio sopra i voxel: prati secchi, fango vicino all'acqua e nelle conche, roccia sui pendii ripidi, strade in asfalto crepato, terra e pietre, acqua con riflessi; i crateri anneriscono il terreno e bruciano l'erba (config terrain_look 0 torna ai blocchi)
- [x] Boschi e foreste: alberi (conifere, latifoglie secche, alberi morti) che il carro abbatte passando, i colpi spezzano e la fanteria usa come copertura
- [x] Mondo voxel generato a ogni run (colline, montagne, canyon, laghi, fiumi) con muri, edifici e rocce distruttibili dai colpi
- [x] Terreno percorribile: colline in pendii e rampe che il carro sale, strade larghe con sponde in rampa; scogliere, creste ripide e acqua profonda restano invalicabili
- [x] Pausa tattica con Spazio: ordini a tempo fermo (vai, attacca, copertura, percorso a tappe disegnato)
- [x] Corazza direzionale sui mezzi: fronte forte, fianchi medi, retro e tetto deboli; i mezzi fermi girano il fronte verso il nemico, quindi aggirarli paga
- [x] Freccia di direzione negli ordini (fanteria, mitraglieri, anticarro, mortai, mezzi) e archi di tiro per mitragliatrici e cannoni anticarro
- [x] Anteprima delle coperture sotto il mouse, anche dietro il carro e i mezzi alleati; copertura leggera e pesante
- [x] Nuove unità: cannone anticarro e carro di supporto (anche in caserma)
- [x] Scelta del mezzo a inizio run: carro da battaglia (cannone, 0 posti), carro leggero (cannoncino o mitragliatrice, tasto X, 2 posti), trasporto truppe (mitragliatrice pesante, 6 posti)
- [x] Fanteria a bordo: B fa salire le squadre selezionate se c'è posto, U le fa scendere; il pezzo Posti del capanno aumenta la capienza
- [x] Pannello sviluppo (F2) per comporre e testare squadre e nemici
- [x] Modalità Comando: selezione squadre e ordini movimento / attacco / copertura, solo per le squadre dentro il raggio radio
- [x] Squadre minuscole e personalizzabili: fucilieri, cecchini, mitraglieri, medici, mortaio, autoblindo; soldati assoldati per rimpiazzare i singoli caduti
- [x] Predoni con pattuglie, campi e fortezza finale: 4 tipi di nemici, ognuno attacca diversamente (fuciliere, mitragliere, razziere, veicolo/carro)
- [x] Avamposti con capanno degli attrezzi fuori dalle mura: basta avvicinarsi col carro e il menu di modifica si apre da solo (E lo riapre); pezzi per cannone, cingoli, corazza, radio, motore che cambiano i numeri del carro
- [x] Smontare un pezzo (downgrade o cambio) rende il 70% di quanto speso, dopo un "Sei sicuro?"
- [x] I mezzi salgono i gradini del terreno naturale fino a 2 voxel (i muri restano muri) e il carro, se resta incastrato, scivola da solo nella posizione libera più vicina
- [x] Mappa ridisegnata con regole fisse (vedi Map rules): il carro guida sul rilievo levigato, niente pilastri, archi o spuntoni, strade larghe e sgombre, ogni sito raggiungibile
- [x] Ruoli dei soldati: il cecchino cerca un posto sopraelevato con linea di tiro, lontano dal nemico, e cambia posizione se si avvicinano; fucilieri, mitraglieri e anticarro in combattimento corrono al riparo e sparano da dietro la copertura; medici e mortai restano indietro
- [x] Imboscata (I): la squadra si nasconde, i predoni non la vedono oltre pochi metri, il fuoco parte quando il nemico entra a tiro corto (o se qualcuno viene colpito) con mira migliore per qualche secondo; il cannone anticarro aspetta il colpo sicuro
- [x] Soppressione: le mitragliatrici inchiodano la fanteria (più lenta, mira dimezzata per qualche secondo)
- [x] Gradi: i soldati che sopravvivono guadagnano esperienza (colpi, uccisioni, campi ripuliti) e salgono Recluta → Esperto → Veterano → Élite: più veloci, mira migliore, più salute, ricarica più rapida; galloni sopra la testa e nella scheda squadra
- [x] Edifici abitabili: click destro su un edificio (casupole degli avamposti, case in rovina, bunker, baracche della fortezza) e la fanteria entra dalla porta; dentro è al coperto da ogni lato e spara dalle finestre; un'insegna sul tetto mostra quanti sono dentro; se i muri crollano escono feriti; un nuovo ordine li fa uscire
- [x] Click destro sul proprio carro: le squadre (anche i mezzi amici) ti seguono; la fanteria sale a bordo se il mezzo ha posti
- [x] Mappa che si attraversa: strade senza gradini oltre 1 voxel, ponti su cui si guida come a terra, nessuna scogliera in mezzo alle strade, piazzole dei siti raccordate al terreno; partenza senza mura; avamposti e campi con 3 celle libere tra edifici e mura
- [x] Piastrine tra i run per miglioramenti permanenti (thin stand-in)

## Map rules
- M1 Rilievo: il terreno è sfumato (media 5x5) e il carro guida su quella superficie; blocca solo una pendenza più ripida di tank_slope_span sotto l'impronta del carro. Un gradino di map_cliff o più è una scogliera e non viene sfumato.
- M2 Scogliere: le pareti di roccia restano invalicabili, ma ogni sito deve restare raggiungibile.
- M3 Rocce: solo affioramenti arrotondati lontani dalle strade; niente pilastri né archi.
- M4 Strade: larghe 7 (road_half_width 3), 2 celle sgombre per lato; niente costruito o alberi su di esse (ponti e primo muro predone esclusi).
- M4b Lungo le strade nessun gradino supera 1: dove due strade si incrociano o corrono vicine a quote diverse si raccordano con rampe; i 3 bordi per lato salgono di 1 a cella; le piazzole dei siti non si tagliano, la strada sale a incontrarle.
- M5 Niente spuntoni: nessuna colonna naturale più di 3 sopra tutte le vicine.
- M6 Alberi fuori dalle strade.
- M7 I percorsi dei mezzi stanno a 1 cella da muri, acqua profonda e bordi di scogliera; le costruzioni morbide (rottami, sacchi, alberi) si schiacciano.
- M9 Siti e ponti: il ponte è terreno per il carro; ogni sito ha una piazzola piana (avamposti 15, campi 9, fortezza 17) raccordata al terreno con un bordo che sale o scende di 1 a cella; la partenza non ha mura; negli avamposti le casupole sono 4x4 con 3 celle libere dalle mura e un cortile largo 8, cancelli larghi 9 e capanno sulla piazzola; nei campi torre e stendardo stanno a 3 celle dal bunker.
- M10 Edifici: ogni edificio ha una porta e il pavimento libero (alberi e rottami tolti); i soldati entrano dalla porta fino alla capienza (garrison_cap).
- M8 Controllo: mapReport() verifica che ogni campo, avamposto e il cancello della fortezza siano raggiungibili dalla partenza (5 mappe di prova: nessuno irraggiungibile, nessuno spuntone, niente costruito sulle strade). Un carro guidato da un programma raggiunge tutti gli 8 obiettivi su 5 mappe su 5, compresa la mappa di test.

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
- terreno realistico liscio (erba secca, fango, roccia, asfalto, acqua) · in the slice
- boschi e foreste abbattibili · in the slice
- pezzi da comprare per moddare il carro · in the slice
- assoldare soldati e creare team personalizzati · in the slice
- regole della mappa procedurale · in the slice
- edifici in cui entrare con la fanteria · in the slice
- formazioni dei mezzi (colonna, linea, cuneo destro/sinistro) · later *(you said: "in futuro")*
- ruoli dei soldati (cecchino in appostamento, copertura) · in the slice
- imboscate e soppressione · in the slice
- gradi ed esperienza dei soldati · in the slice
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
- Ordini di formazione per i mezzi (colonna, riga, cuneo destro/sinistro): change it after play *(you said: in futuro)*

## Build order
1. La fetta: un run su una mappa generata con un avamposto di partenza, 1–2 avamposti in giro, 4–5 campi predoni e la fortezza; vinci abbattendo il carro del capo, perdi se il tuo carro viene distrutto.
2. Carro, torretta e dispersione per primi, su terreno voxel distruttibile.
3. Squadre, ordini e raggio radio.
4. Nemici e campi, poi officina, reclutamento e piastrine.

---
**Kill condition:** se la torretta lenta risulta frustrante invece che tattica anche dopo due giri di taratura. *(guessed)*

**Who it's for / what they feel:** chi ama il tank action e gli RTS tattici, e vuole sentirsi un comandante che vince con la posizione e il tempismo, non solo con la potenza. *(guessed)*

**Games you love / don't:** *(guessed)* —
