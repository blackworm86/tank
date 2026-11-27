# Rustline Commander: piano per un gioco modulare

> Prototipo `prototypes/rustline-commander/` · scritto nell'iteration 19.
>
> Richiesta: "facciamo una lista dei sistemi attuali, e vediamo come separarli razionalmente. voglio
> sviluppare sistemi modulari, e che il gioco possa essere espanso a mio piacimento". Strada scelta:
> "Rifattorizza qui". Restano i tag `<script>` e non c'è una build.

## Le regole

1. **Il nucleo non conosce i contenuti.** Il ciclo, l'input, l'audio, le scene, il seme, il registro
   e gli eventi non nominano nessun nemico, modulo, missione o bioma.
2. **Un contenuto è una voce.** Un nemico, un modulo, una missione, un bioma, una geografia, un evento
   o una fazione si aggiungono come una voce completa: dati più i suoi comportamenti. Il contenuto
   si aggiunge alla voce, senza toccare il motore.
3. **I sistemi si parlano con gli eventi.** Un sistema non chiama le funzioni di un altro per un
   aggancio: emette un evento (`emit`), e chi è interessato si iscrive (`on`). Gli iscritti girano
   nell'ordine di caricamento dei file, così la stessa partita con lo stesso seme resta identica.
4. **Ogni passo lascia il gioco uguale.** Prima di ogni passo si registra un'impronta: una partita
   scritta, con il seme 1, ridotta a un hash. Dopo il passo l'impronta deve essere identica.

## Gli strati

| Strato | Cartella | Cosa c'è |
|---|---|---|
| Nucleo | `index.html`, `js/core.js` | ciclo a passo fisso, input, audio, scene, `rng()`, `register`/`registry`, `on`/`emit` |
| Mondo | `js/world.js`, `js/biomes.js`, `js/terrain.js` | voxel, generazione, rilievo, raggi, percorsi |
| Sistemi | `js/systems/` | unità, mezzo, squadre e ordini, nebbia, combattimento, economia, officina, suono, sviluppo |
| Contenuti | `js/content/<pacchetto>/` (oggi `base`) | nemici, missioni, terre, moduli, armi e sistemi: le voci, con i loro comportamenti |
| Presentazione | `js/view.js`, `js/hud.js` | modelli, disegno, HUD, schermate |

## Gli eventi di oggi

| Evento | Quando | Iscritti |
|---|---|---|
| `campaignStart` | una campagna nuova | le piste (missions.js) |
| `sectorSetup (M, n)` | una mappa è pronta | fazioni |
| `sectorSideSetup (M, n)` | dopo il `setup` della missione | la pista |
| `sectorStep (M, dt)` | ogni passo, dopo l'`update` della missione | la pista |
| `sectorLeave (M)` | si parte, dopo il `leave` della missione | la pista |
| `mapTags (tag)` | si disegnano le etichette sulla mappa | la pista |
| `minimapMarks (ring)` | si disegna la minimappa | la pista |
| `kill (e, src, kind)` | un'unità muore | i nemici speciali (la carica del kamikaze, il deposito che salta) |

## I passi

1. **Fatto, iteration 19: nucleo e divisione.** Nasce `js/core.js` (registro ed eventi). `sim.js`, 2.000
   righe, si divide in file per sistema in `js/systems/`, nello stesso ordine. Gli agganci della
   campagna e la morte diventano eventi.
2. **Fatto, iteration 20: nemici in un solo registro.** I predoni base escono da `UT` e da sim; ogni
   nemico ha statistiche, arma, `think` e modello. Spariscono i controlli `e.kind === 'boss'` sparsi.
   I pesi di comparsa non sono ancora fatti (vedi in fondo).
3. **Fatto, iteration 21: missioni in un solo registro.** Ogni missione è una voce con nome, testo
   del SITREP, probabilità e i suoi passi (`prepare`, `setup`, `update`, `exitShut`, `leave`, `line`,
   `tags`, `minimap`). `campaign.js` esegue la voce e non nomina più nessuna missione; `pickMission`
   tira una volta sulle probabilità delle voci.
4. **Fatto, iteration 22: l'officina come un solo sistema.** `js/systems/workshop.js` ha la cornice,
   i tasti 1-9, la domanda di conferma e il registro delle tab. Ogni tab sta nel file del suo sistema
   (moduli in `modules.js`, arma e sistemi in `loadout.js`, caserma e riparazioni in `barracks.js`);
   `hud.js` non le conosce più e `state.shopTab` è il nome della tab, non più un numero.
5. **Fatto, iteration 23: la generazione del mondo a passi registrati.** `genWorld` esegue dieci passi
   in ordine (cornice, acqua, rilievo, siti, strade, colonne, strutture, primo muro, sparsi, pattuglie).
   Biomi, impianti, geografie e forme sono registri in `js/biomes.js`, con i loro comportamenti nella
   voce: la terra intorno e il rilievo di una geografia, le pareti di una forma, gli edifici di un
   impianto, la capanna di un bioma. `world.js` e `campaign.js` non nominano più nessuno di loro.
6. **Fatto, iteration 24: i contenuti in pacchetti.** Il pacchetto `js/content/base/` ha i nemici
   (`raiders.js`, `enemies.js`), le missioni (`missions.js`), le terre (`lands.js`: biomi, impianti,
   geografie, forme), i moduli con il loro aspetto (`modules.js`) e le armi e i sistemi con il loro
   effetto (`arsenal.js`). I file dei sistemi tengono solo i registri; il registro dei nemici è in
   `js/systems/horde.js`. In `index.html` i pacchetti si caricano dopo tutti i sistemi.
7. **La config divisa per sistema.** Le chiavi restano piatte, perché `tune` e il pannello le leggono
   così, ma ogni sistema ha il suo file.

## Come aggiungere un nemico (dall'iteration 20)

Una chiamata in un file di contenuti (nel pacchetto base: `js/content/base/raiders.js` o `enemies.js`):

```js
EXTRA_W.lancia = () => ({ kind: 'bullet', range: 20, dmg: 6, rate: 0.8, acc: 0.5 }); // la sua arma
registerEnemy('r_lancia', {
  name: 'Lanciere', short: 'Lancia', w: 'lancia',
  hp: () => tune.raider_hp * 0.8, speed: () => tune.inf_speed * 1.1,  // o hpOf(e, k) per il valore intero
  model: () => makeSoldier('r_rifle'),                                // la sua figura
  think: enemyThink, spot: enemySpot,                                 // facoltativi: il suo modo di combattere
});
```

`registerEnemy` lo mette nel registro, nella tabella delle unità, nel pannello di sviluppo (K) e nella
scheda delle figure. I sistemi leggono solo i campi della voce: `eye`, `turret`, `alignTol`,
`hullTurnMove`, `muzzle`, `blastK`, `loot`, `tally`, `deathSay`, `bigBar`, `rocket`, `noFlank`,
`circleSmart`, `think`, `spot`, `onKill` (vedi il commento in testa a `js/systems/horde.js`).

Resta da fare: **dove** compaiono i nemici. Le composizioni di campi, pattuglie, ondate, fazioni e
missioni nominano ancora i tipi (`run.js`, `campaign.js`, `factions.js`, `missions.js`,
`enemies.js`); diventeranno tabelle di comparsa registrate. Anche gli alleati (`UT`, `weapon()`)
hanno ancora la loro tabella e il loro switch.

## Come aggiungere una missione (dall'iteration 21)

Una chiamata in un file di contenuti (nel pacchetto base: `js/content/base/missions.js`):

```js
registerMission('recon', {
  name: 'Ricognizione', brief: 'Raggiungi il punto e guarda cosa c\'è.', tag: 'RICOGNIZIONE',
  w: 0.08, minCol: 1, instead: 'exit',          // la sua probabilità; prima della colonna 1 è un'uscita
  sign: 'movimenti sospetti',                     // facoltativo: l'indizio sulla mappa della campagna
  setup(M, n) { const p = spotNear(world.sites.fortress.x, world.sites.fortress.z, 0); M.target = { x: p.x, z: p.z }; },
  update(M, dt) { if (Math.hypot(M.target.x - state.tank.x, M.target.z - state.tank.z) < 6) finishMission(M, 'Punto raggiunto.'); },
});
```

I passi, tutti facoltativi: `prepare(M, n)` subito dopo la mappa (prima delle persone), `setup(M, n)`
dopo le fazioni, `update(M, dt)` ogni passo finché non è compiuta, `exitShut(M)` (vero: l'uscita resta
chiusa), `leave(M)` alla partenza, `line(M)` (la riga sotto la minimappa), `tags(M, tag)` e
`minimap(M, ring)` (i segni sulla mappa). Altri campi: `startsDone`, `exitOnly` (solo l'uscita fa
partire), `fallback` (scelta quando le probabilità finiscono). Il commento in testa a `MISSIONS` in
`js/campaign.js` li elenca.

Attenzione alle probabilità: le voci si tirano nell'ordine di registrazione e oggi la loro somma è 1.
Una voce in più va bilanciata togliendo ad altre; altrimenti, registrata dopo, non uscirebbe mai.

## Come aggiungere una tab all'officina (dall'iteration 22)

Una chiamata nel file del sistema che la possiede:

```js
registerShopTab('intel', {
  name: 'Informazioni', order: 60,                 // il posto: dopo Riparazioni (50); il tasto è il 6
  draw(x0, y0, w, h, cy) {                         // il pannello e, in cy, l'inizio sotto i pulsanti
    text('Rottami: ' + state.scrap, x0 + 24, cy + 6, 17, '#ffd9a0', 'left');
    button(x0 + 24, cy + 30, 220, 40, 'Compra una mappa (50)', () => { state.scrap -= 50; }, { off: state.scrap < 50 });
  },
});
```

`order` mette le tab in fila (10 moduli, 20 arma, 30 sistemi, 40 caserma, 50 riparazioni) e i tasti
1-9 la seguono. `preview: true` fa girare il mezzo in 3D nella finestra centrale, come nella tab dei
moduli. Il pulsante `button()` e il testo `text()` sono quelli dell'HUD (`js/hud.js`).

## Come aggiungere al mondo (dall'iteration 23)

**Un passo di generazione**, tra due di quelli esistenti (10 cornice, 20 acqua, 30 rilievo, 40 siti,
50 strade, 60 colonne, 70 strutture, 80 primo muro, 90 sparsi, 100 pattuglie):

```js
registerWorldStep('craters', { order: 95, run(G) {          // dopo gli sparsi, prima delle pattuglie
  for (let k = 0; k < 6; k++) { const x = 10 + Math.floor(rng() * (G.N - 20)), z = 10 + Math.floor(rng() * (G.N - 20)); blastVoxels(x, hAt(x, z), z, 3); }
  recomputeAll(); updateGround(0, 0, G.N - 1, G.N - 1);
} });
```

`G` ha tutto quello che i passi prima hanno fatto: `P`, `S`, `N`, `WL`, `ns`, `real`, `canon`, `SC`, `EC`,
`GS`, `river`, `lakes`, `wallK`, `Hf`, `sites`, `placed`, `hi` (il commento in testa a `WORLD_STEPS` in
`js/world.js`).

**Una geografia, una forma, un impianto, un bioma**, in `js/biomes.js` o in un file di contenuti:

```js
registerGeo('craters', { name: 'crateri', brief: 'Una pianura butterata di crateri.', landRank: 1,
  land(P) { P.mesa = false; },
  shape(N, ns) { return { raise: (cx, cz) => -4 * smooth(0.6, 0.7, fbm(cx / 14, cz / 14, ns + 60, 2)) }; } });
registerShape('gorge', { name: 'gola stretta', wall: (cx, cz, N, ns, C) => smooth(N * 0.12, N * 0.12 + 5, Math.abs((cx - cz) * Math.SQRT1_2)) });
registerLayout('camps', { name: 'tendopoli', forestK: 0.5, ruins: 0.5, build(placed) { /* le tende */ } });
registerBiome('swamp', { name: 'Palude', /* cielo, luce, acqua, tinte, alberi, ciuffi come gli altri */ map: { mesa: false, lakes: true, forest: 0.8, mountains: 0.5 } });
```

La campagna sceglie tra tutte le voci registrate, nell'ordine di registrazione. Attenzione: una voce in
più cambia le campagne di tutti i semi (si tira su una lista più lunga), e un passo che chiama `rng()`
cambia tutte le mappe che vengono dopo di lui. Il gioco resta giusto, ma non uguale a prima.

## Come fare un'espansione (dall'iteration 24)

Un'espansione è una cartella e le sue righe in `index.html`:

1. Crea `js/content/<nome>/` con i file che servono, per esempio `js/content/deserto-rosso/nemici.js`,
   `missioni.js`, `terre.js`. Ogni file è fatto di chiamate: `registerEnemy`, `registerMission`,
   `registerModule`, `registerWeapon`, `registerSystem`, `registerBiome`, `registerLayout`, `registerGeo`,
   `registerShape`, `registerShopTab`, `registerWorldStep` (gli esempi sono nelle sezioni sopra).
2. In `index.html`, sotto il blocco `<!-- pack: base -->`, aggiungi `<!-- pack: <nome> -->` e una riga
   `<script src="js/content/<nome>/....js"></script>` per ogni file.
3. Un'espansione può anche cambiare una voce del pacchetto base: registrarla di nuovo con lo stesso id la
   sostituisce (la console lo segnala con `register: ... replaced`).

Le voci di un'espansione si aggiungono in fondo alle liste: le probabilità delle missioni e dei moduli, le
scelte della campagna e le mappe cambiano per tutti i semi (vedi le avvertenze sopra).

Restano nominati per id nei file dei sistemi, e quindi non ancora estendibili da un pacchetto: i sistemi
passivi (letti dove agiscono: `modOn('cage')`, `modOn('rack')`...), i tre tipi di colpo (`he`, `ap`,
`frag`), gli scafi, gli achievement, le fazioni e i loro dialoghi (`js/factions.js`) e gli alleati (`UT`).
