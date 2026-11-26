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
| `sectorSetup (M, n)` | una mappa è pronta | fazioni, missione, pista |
| `sectorStep (dt)` | ogni passo in un settore | missione, pista |
| `sectorLeave (mission)` | si parte dal settore | missione, pista |
| `kill (e, src, kind)` | un'unità muore | i nemici speciali (la carica del kamikaze, il deposito che salta) |

## I passi

1. **Iteration 19: nucleo e divisione.** Nasce `js/core.js` (registro ed eventi). `sim.js`, 2.000
   righe, si divide in file per sistema in `js/systems/`, nello stesso ordine. Gli agganci della
   campagna e la morte diventano eventi.
2. **Nemici in un solo registro.** I predoni base escono da `UT` e da sim; ogni nemico ha statistiche,
   arma, `think`, modello e pesi di comparsa. Spariscono i controlli `e.kind === 'boss'` sparsi.
3. **Missioni in un solo registro**, con un ciclo di vita: `setup`, `update`, `done`, `sitrep`,
   `minimap`, `leave`.
4. **L'officina come un solo sistema.** Le tab (moduli, arma, sistemi, caserma, riparazioni) si
   registrano, ognuna con il suo disegno; `hud.js` non le conosce più.
5. **La generazione del mondo a passi registrati:** forma, geografia, acqua, impianto, siti.
6. **I contenuti in pacchetti** (`js/content/<pacchetto>/`): un'espansione è una cartella e una riga
   nell'elenco dei file.
7. **La config divisa per sistema.** Le chiavi restano piatte, perché `tune` e il pannello le leggono
   così, ma ogni sistema ha il suo file.
