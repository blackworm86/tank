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

After play: Aggiungi un menù contestuale con o comandi che posso dare alle truppe; cliccando destro compare che comandi si possono assegnare

After play: prima di fare push: * razionalizza i comandi, devono essere facili da gestire con la mano sinistra * il giocatore può ridefinire le squadre, e averne fino a 6 - un carro/autoblindo è sempre considerato squadra singola * ridisegna la mappa, voglio una mappa semplice per iniziare i test, quella attuale è troppo complicata * aggiungi alla minimappa * aggiungi la "nebbia di guerra", il gicoatore vede sia sulla mappa che sulla minimappa unità nemiche solo se è in grado di vederle dal proprio carro, o se ci sono unità amiche che "vedono" e sono in raggio d'azione della radio * la torretta dei carri si muove in modo strano rispetto allo scafo, dovrebbe allinearsi con lo scafo * la "linea" di tiro del proprio carro dovrebbe mostrare la linea di tiro effettiva; se passa attraverso ostacoli, la linea dall'ostacolo al cursore dovrebbe diventare rossa

After play: la modalità comando deve bloccare lo spostamento del carro armato, WASD diventa pan della mappa * il menu contestuale deve uscire anche per la modalità ordini "a percorso" * la gestione delle squadre è complicata, non si capisce quale soldato io stia selezionando (si vede la selezione su tutta la squadra) e vorrei poter fare "drag and drop" dei soldati da una squadra all'altra. * assegna un colore alle squadre, e la possibilità di dare un nome alle squadre, e una "posture" alle squadre (aggressivo, neutrale, rispondi al fuoco, stealth, non rispondere al fuoco) * voglio che le unità, se "nascoste" dietro a colline, alberi, edifici ecc, vengano visualizzate contornate di verde (se mie) o rosso (se nemiche) * ripulisci l'interfaccia, è super caotica e piena di informazioni * nella minimappa va visto il cono di visuale del giocatore * la nebbia di guerra deve essere visibile; dove non vedo, lo scenario deve essere più scuro.

After play: dammi anche dei comandi di sviluppo con i quali posso spawnare nemici, alleati, aggiungere crediti ecc.

After play: altra cosa, nella finestar di gioco non voglio si veda il cursore di sistema, mostra solo il cursore del gioco!

After play: ripensiamo al loop di gioco. vorrei che seguisse la falsariga di FTL, con una mappa iniziale in cui il giocatore inizia da solo e con un solo carro armato; deve poi scappare dalla mappa, raggiungendo l'uscita o completando una missione; uscito dalla mappa potrà selezionare la prossima mappa da varie opzioni - la mappa globale della campagna è a "albero" come quella di FTL: il giocatore non sa esattamente quale sarà la prossima mappa, ma la SITREP può dirgli se c'è molta presnza nemica, molti scrap, fazioni particolari eccetera

in ogni mappa saranno presenti NPC potenzialmente non nemici, che potrebbero affidare quest secondarie al giocatore, o piccole scelte multiple che possono dare benefici o danni.

l'obiettivo del giocatore è arrivare alla ottava mappa, nella quale si ricongiungerà con quello che rimane del suo esercito (il giocatore è un comandante di carri armati, non il re o cose del genere) per organizzare l'ultima difesa contro l'ultimo assalto dell'Orda nemica

After play (risposte): truppe da NPC, eventi e avamposti; pressione: solo timer in battaglia; finale: resisti alle ondate; le piastrine tra i run restano.

**Pitch:** Comandi un carro armato arrugginito attraverso una terra desolata in voxel generata a ogni run: guidi con i cingoli, punti un cannone che insegue lento il mouse e mandi via radio piccole squadre di disperati dietro muri che crollano sotto il fuoco.

**Genre:** action roguelite + real-time tactics (tank action con comando di squadre)

**Controls:** W/S avanti/indietro, A/D ruota lo scafo (il tuo "VSD" letto come WASD) *(inferred (strong))*; mouse brandeggia il cannone, click sinistro spara; **Spazio: pausa tattica** (il tempo si ferma, selezioni e ordini restano attivi, WASD sposta la vista) *(you said)*; Tab passa da modalità Carro a modalità Comando *(guessed)*; in Comando o in pausa: click/trascina seleziona squadre (1–6 selezione rapida), V vai, F attacca (su un nemico, o avanzata d'assalto sul terreno), C copertura, R imboscata armano l'ordine del prossimo click; **click destro e trascina: una freccia indica la direzione da tenere all'arrivo** (i mezzi indietreggiano tenendo il fronte verso quella direzione) *(you said)*; passando il mouse vicino a muri, case o al carro compaiono i posti di copertura (verde pesante, giallo leggera) *(you said)*; Shift + click destro aggiunge una tappa al percorso; avvicinati al capanno degli attrezzi di un avamposto per le modifiche *(you said)*; G seguimi, **Z fermi, R imboscata** (la squadra si apposta al riparo e tiene il fuoco finché il nemico non è vicino), B sali/scendi, Alt+1-6 forma squadra, tasto a sinistra di 1: tutte le squadre — tutto sotto la mano sinistra *(you said)*; **click destro: menu degli ordini per quel punto (entra nell'edificio, seguimi sul proprio carro, vai, riparo, attacco, imboscata, fermi…), click o lettera per scegliere, Esc chiude** *(you said)*; **X cannoncino/mitragliatrice sul carro leggero; frecce o click sceglie il mezzo nel titolo** *(you said)*; **F2: pannello sviluppo** (aggiungi/togli soldati, squadre, mezzi; K piazza un nemico al mouse) *(you said)*; rotella zoom, Q/E ruota la camera *(guessed)*. **In modalità Comando il carro sta fermo e WASD sposta la vista sulla mappa** *(you said)*; Shift + click destro apre il menu della tappa (vai, al riparo, avanza all'attacco) *(you said)*; nelle schede squadra: click sul soldato lo sceglie (Shift aggiunge), trascinarlo su un'altra scheda o su "+ nuova squadra" lo sposta, la matita rinomina (Invio conferma, Esc annulla), l'etichetta a destra cambia l'atteggiamento (anche Q nel menu) *(you said)*; F1 mostra i comandi; F2 sviluppo: K nemico, J alleato del tipo scelto, L sposta il carro al mouse, +500 rottami, +5 piastrine, nebbia on/off, uccidi i nemici vicini *(you said)*; si vede solo il cursore del gioco *(you said)*; **Invio all'uscita (o a missione compiuta) lascia il settore** *(you said)*; nella mappa della campagna click o 1-4 sceglie il prossimo settore *(you said)*; avvicinati col carro alla gente neutrale per parlarci, 1-3 sceglie *(you said)*; F2 + N passa subito al settore dopo (sviluppo).

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
- [x] Comandi per la mano sinistra: V vai, F attacca, C copertura, R imboscata (armano il prossimo click); G seguimi, Z fermi, B sali/scendi; 1-6 squadre (Shift aggiunge), Alt+1-6 forma una squadra, il tasto a sinistra di 1 seleziona tutte; Q/E camera, Tab modalità, Spazio pausa tattica, Esc menu e pausa
- [x] Squadre ridefinibili: click su un soldato o riquadro, poi Alt+1-6: i soldati scelti passano alla squadra di quel numero (o ne formano una nuova); al massimo 6 squadre e squad_size soldati per squadra; un carro o un'autoblindo resta sempre una squadra a sé; le squadre rimaste vuote spariscono e i numeri si ricompattano
- [x] Mappa semplice di prova (map_simple 1, predefinita): 128 di lato, terreno dolce, un fiume coi suoi ponti, niente montagne, mesa, canyon o laghi, 3 campi, poche rovine, rocce e boschi (map_simple 0 torna alla mappa grande)
- [x] Nebbia di guerra: i predoni si vedono (sulla mappa, nella minimappa, con barre e menu) solo se il carro o un'unità amica dentro il raggio radio li vede; uno sparo li rivela per un attimo
- [x] Minimappa: il numero di ogni squadra dove si trova (evidenziato se selezionata) e solo i nemici visti
- [x] Torretta sullo scafo: gira insieme allo scafo e poi brandeggia verso il mouse; in modalità Comando torna in asse con lo scafo; le torrette dei mezzi amici e nemici fanno lo stesso
- [x] Linea di tiro vera: segue la traiettoria del colpo dalla bocca del cannone (arco per il cannone, dritta per la mitragliatrice) e diventa rossa dal primo ostacolo fino al cursore
- [x] Menu degli ordini: con squadre selezionate il click destro apre un menu con gli ordini che valgono per quel punto (nemico: attacca; edificio: entra; proprio carro: seguimi, sali a bordo; terreno: vai, al riparo, avanza all'attacco, imboscata, aggiungi tappa, seguimi; sempre: fermi, esci dall'edificio, scendi); si sceglie col click o con la lettera, Esc chiude; trascinando col destro prima di lasciare la freccia di direzione resta valida; Shift + click destro e gli ordini armati (V F C I) agiscono subito; anche il tasto Menu della tastiera lo apre (config context_menu 0 torna agli ordini diretti)
- [x] Click destro sul proprio carro: le squadre (anche i mezzi amici) ti seguono; la fanteria sale a bordo se il mezzo ha posti
- [x] Mappa che si attraversa: strade senza gradini oltre 1 voxel, ponti su cui si guida come a terra, nessuna scogliera in mezzo alle strade, piazzole dei siti raccordate al terreno; partenza senza mura; avamposti e campi con 3 celle libere tra edifici e mura
- [x] Modalità Comando: il carro resta fermo, WASD sposta la vista sulla mappa (la camera non insegue più il carro)
- [x] Menu degli ordini anche per le tappe del percorso (Shift + click destro): Tappa N vai / al riparo / avanza all'attacco
- [x] Squadre con colore proprio (scheda, anelli, percorsi, numeri, minimappa), nome modificabile (matita) e atteggiamento: Aggressiva (va addosso ai nemici visti), Neutrale, Risponde al fuoco (spara solo se colpita), Furtiva (più lenta, i predoni la scoprono solo da vicino, spara solo da vicino o se colpita), Non sparare
- [x] Selezione chiara dei soldati: il soldato scelto ha l'anello bianco più grande e un segno sopra la testa, il resto della squadra un anello tenue del colore della squadra; trascinamento dei soldati tra le schede squadra o su "+ nuova squadra"
- [x] Unità nascoste dietro colline, edifici e muri disegnate in trasparenza: verdi le tue, rosse le nemiche viste
- [x] Nebbia di guerra visibile: dove nessuno vede il terreno è più scuro (sulla mappa e sulla minimappa), con bordo sfumato
- [x] Minimappa con il cono di visuale della camera
- [x] Interfaccia ripulita: pannello carro compatto, corazza solo per qualche secondo dopo un colpo, etichetta modalità piccola, niente striscia ordini, radio a 3 righe, comandi dietro F1
- [x] Comandi di sviluppo (F2): J alleato, K nemico, L carro al mouse, +500 rottami, +5 piastrine, nebbia on/off, uccidi i nemici vicini
- [x] Solo il cursore del gioco, mai quello di sistema
- [x] Loop alla FTL: 8 settori su una mappa della campagna ad albero; si parte da soli col carro, si esce dal settore dall'uscita (anello giallo, Invio) o finita la missione; poi si sceglie il settore dopo tra quelli collegati
- [x] SITREP sui settori raggiungibili: presenza nemica (bassa/media/alta), rottami (pochi/discreti/molti), segnali (coloni, mercanti, disertori, avamposto amico, segnale di soccorso); il tipo di missione resta una sorpresa
- [x] Missioni di settore: raggiungi l'uscita, distruggi il campo, libera i prigionieri (diventano una squadra), recupera il deposito (rottami e un pezzo o riparazioni)
- [x] Il carro, i pezzi, i rottami e i soldati entro il raggio radio (o a bordo) passano al settore dopo; chi è fuori radio resta indietro; i feriti guariscono in marcia
- [x] Gente neutrale lungo la strada (figure e "?"): 10 incontri con scelte (disertori, cecchino a pagamento, coloni affamati, capo villaggio, mercanti, contrabbandiere, ferito, deposito minato, radioamatore, cacciatori di taglie) che danno soldati, pezzi, rottami, riparazioni o danni, imboscate e incarichi secondari (distruggi un campo, abbatti N predoni)
- [x] Timer dell'Orda: dopo horde_time secondi in un settore arrivano ondate di cacciatori sempre più grandi che puntano il carro
- [x] Ottavo settore, l'ultima difesa: campo dell'esercito con mura e capanno, cinque squadre e mezzi dell'esercito ai tuoi ordini (fino a 10 squadre), final_waves ondate dal cancello dell'Orda, l'ultima col Carro del Capo; respinte tutte, vittoria
- [x] Piastrine anche per ogni settore attraversato
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
- M9b Avamposti: casupole 4x4 negli angoli dove non passano strade, a 6-9 celle dal centro (cortile largo 11), mura a 13 con cancelli larghi 9, piazzola 17; il primo muro predone sta oltre la piazzola di partenza.
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
- menu contestuale degli ordini col click destro · in the slice
- squadre ridefinibili (Alt+1-6, max 6, mezzi a sé) · in the slice
- nebbia di guerra (visibile, terreno scuro dove non vedi) · in the slice
- colore, nome e atteggiamento delle squadre · in the slice
- unità nascoste in trasparenza (verde/rosso) · in the slice
- mappa semplice di prova · in the slice
- formazioni dei mezzi (colonna, linea, cuneo destro/sinistro) · later *(you said: "in futuro")*
- ruoli dei soldati (cecchino in appostamento, copertura) · in the slice
- imboscate e soppressione · in the slice
- gradi ed esperienza dei soldati · in the slice
- campagna ad albero di 8 settori con SITREP · in the slice
- missioni di settore e uscita · in the slice
- gente neutrale, scelte e incarichi secondari · in the slice
- timer dell'Orda (cacciatori) · in the slice
- ultima difesa con l'esercito · in the slice
- valuta permanente tra un run e l'altro · thin stand-in *(guessed)*

## Keep
-

## Avoid
-

## Out of scope
- Un hub tra i run con personaggi e storia: grow it
- Molti biomi e boss: grow it
- Modificatori di difficoltà dopo una vittoria: change it after play
- Unità eroe con abilità: change it after play
- Una trama scritta per la campagna (personaggi, dialoghi ricorrenti): grow it
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
