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
| Contenuti | oggi sparsi (`enemies.js`, `missions.js`, `modules.js`...) | i cataloghi e i comportamenti |
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
4. **L'officina come un solo sistema.** Le tab (moduli, arma, sistemi, caserma, riparazioni) si
   registrano, ognuna con il suo disegno; `hud.js` non le conosce più.
5. **La generazione del mondo a passi registrati:** forma, geografia, acqua, impianto, siti.
6. **I contenuti in pacchetti** (`js/content/<pacchetto>/`): un'espansione è una cartella e una riga
   nell'elenco dei file.
7. **La config divisa per sistema.** Le chiavi restano piatte, perché `tune` e il pannello le leggono
   così, ma ogni sistema ha il suo file.

## Come aggiungere un nemico (dall'iteration 20)

Una chiamata in un file di contenuti (oggi `js/content/horde.js` o `js/enemies.js`):

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
`circleSmart`, `think`, `spot`, `onKill` (vedi il commento in testa a `js/content/horde.js`).

Resta da fare: **dove** compaiono i nemici. Le composizioni di campi, pattuglie, ondate, fazioni e
missioni nominano ancora i tipi (`run.js`, `campaign.js`, `factions.js`, `missions.js`,
`enemies.js`); diventeranno tabelle di comparsa registrate. Anche gli alleati (`UT`, `weapon()`)
hanno ancora la loro tabella e il loro switch.

## Come aggiungere una missione (dall'iteration 21)

Una chiamata in un file di contenuti (oggi `js/missions.js`):

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
