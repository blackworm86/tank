# Spike voxel veri — opzione A (Rust + Bevy + wgpu)

Data: 2026-11-27 · Stato: approvato il 2026-11-27, **RIMANDATO** · Cartella: `prototypes/rustline-voxel-spike-2026-11-27/`

## Quando si parte

Rimandato il 2026-11-27 per scelta: prima il gameplay e i sistemi. Lo spike parte solo quando:

1. il prototipo JS (`prototypes/rustline-commander`) ha il suo verdetto dopo 2-3 run completi, ed è PROCEED;
2. il loop di gioco e i sistemi sono «blindati»: regole stabili, scritte nel brief, che non cambiano più a ogni iterazione.

Fino ad allora il gioco JS resta il laboratorio del design; questo piano non si tocca. Prima di partire, ricontrollare hardware, budget e versioni (Bevy, wgpu, Rapier, Avian), che nel frattempo possono essere cambiati.

## La domanda

> Si riesce a far girare la mappa di test di Rustline Commander (256 × 256 × 64 m) come **voxel veri da 25 cm**,
> distruttibili voxel per voxel e con crolli fisici a blocchi rigidi, a **≥ 60 fps a 1080p su questo PC**,
> con 50 unità in campo e la camera RTS?

La risposta è un insieme di numeri misurati, non un giudizio a sensazione. Se è NO, si sa prima di scrivere gameplay.

Le regole spike dello studio fissano un tetto di ~4 ore per domanda. Questa è troppo grande per una sola sessione,
quindi è divisa in **sotto-spike S0–S6**, ognuno con la propria domanda, il proprio test e il proprio sì/no.
Se uno fallisce ci si ferma e si decide (correggere, cambiare approccio, rivalutare le altre opzioni).

## Hardware di riferimento (misurato oggi)

| | |
|---|---|
| GPU | NVIDIA GeForce GTX 1080 Ti (11 GB, Pascal: niente ray tracing hardware, compute shader sì) |
| CPU | AMD Ryzen 7 5800X, 8 core |
| RAM | 32 GB |
| Schermo | 1920 × 1080, 60 Hz |
| Toolchain | Rust **non installato**; Visual Studio Build Tools 2026 con il carico C++ presente; git 2.51 |

## Budget (i numeri che decidono il sì/no)

| Voce | Budget |
|---|---|
| Frame totale | ≤ 16,6 ms (60 fps), nel caso peggiore dello scenario di carico |
| Rendering voxel (GPU) | ≤ 10 ms |
| Una modifica (esplosione HE, foro AP) + upload su GPU | ≤ 2 ms per frame, anche con 20 esplosioni al secondo |
| Rilevamento pezzi staccati dopo un danno | ≤ 4 ms, spalmabile su più frame |
| Pezzi in caduta contemporanei | ≥ 200 senza scendere sotto i 60 fps |
| VRAM | ≤ 3 GB · RAM ≤ 4 GB |
| Avvio mappa | ≤ 5 s |

## I numeri del mondo

- 256 m / 0,25 m = **1024 × 1024 × 256 voxel = 268 milioni di celle**. Denso a 1 byte sarebbe 268 MB: si potrebbe,
  ma è quasi tutto aria o pieno uniforme, quindi va **sparso**.
- Per voxel: 1 byte materiale (fino a 256 materiali) + 1 byte integrità (come l'attuale `S.dmg` da 0 a 255),
  solo nei blocchi non uniformi.
- Ipotesi di partenza (da confermare in S1): **brickmap a due livelli**, griglia grossa di brick 8³
  (128 × 128 × 32 = 524 mila puntatori, ~2 MB) e brick pieni solo dove c'è superficie.
  Modificare = riscrivere pochi brick e caricare solo quelli.

## Le scelte tecniche (da fissare in S1, la sessione Fable)

1. **Memoria dei voxel:** brickmap contro 64-tree contro SVDAG. L'SVDAG comprime molto ma è lento da modificare,
   male per un gioco distruttibile. La brickmap è semplice e veloce da modificare.
2. **Rendering:**
   - (a) ray marching in compute shader attraverso i brick, scritto in una texture con profondità,
     più le unità a basso numero di poligoni rasterizzate e composte con quella profondità;
   - (b) piano di riserva: mesh greedy per chunk, rasterizzate.

   Va scelto quale fare per primo e come misurare l'altro.
3. **Pezzi dinamici (crolli):** alla Teardown, ogni pezzo staccato ha un proprio piccolo volume di voxel più una
   trasformazione (posizione e rotazione), disegnato con ray marching nel suo box orientato. Quando si ferma, si
   riscrive nel mondo oppure resta oggetto.
4. **Fisica:** corpi rigidi con libreria (Rapier o Avian, da verificare cosa offrono oggi per collider voxel)
   oppure contatti voxel-contro-mondo scritti a mano. Più il rilevamento dei pezzi staccati, con un flood fill
   per componenti connesse limitato alla zona colpita, e la statica di sostegno (l'idea di `staticsFail`
   di oggi: carichi, momenti, ribaltamento).
5. **Flusso dati e thread:** cosa gira in parallelo (sistemi ECS di Bevy, task pool), cosa va su GPU e quando.
6. **Versioni fissate:** Bevy, wgpu, libreria fisica, scritte nel `Cargo.toml` e motivate.

Uscita di S1: `DESIGN.md` nella cartella dello spike, con le scelte, le alternative scartate e i budget per sistema.

## Le fasi

| # | Domanda / lavoro | Modello · sforzo | Uscita e sì/no |
|---|---|---|---|
| **S0** | Impianto: installare rustup (stable, MSVC), `cargo new`, Bevy con versione fissata, finestra, contatore fps e frame time, profiler (Tracy o puffin), `spike.toml` per i parametri. | Opus 5.5 · medium | La finestra si apre e mostra i ms per frame. |
| **S1** | Progetto tecnico: le scelte sopra. | **Fable 5.2 · high**, sessione nuova | `DESIGN.md` approvato da te. |
| **S2** | Mondo statico: rilievo procedurale come la mappa di test (cresta con gola, mesa, scarpata, colline, fiume con guado) + una ventina di edifici a scatola. Renderer voxel. Camera RTS con pitch da 33° a 56° legato allo zoom. | Opus 5.5 · high | ≥ 60 fps con tutta la mappa e VRAM a budget. Altrimenti sessione Fable di debug. |
| **S3** | Distruzione: sfera HE con decadimento, tunnel AP per penetrazione, scheggiatura, integrità per voxel, upload solo dei brick toccati. Prova: 20 esplosioni al secondo per 30 s. | Opus 5.5 · high | Modifica + upload ≤ 2 ms per frame. |
| **S4** | Crolli: rilevamento dei pezzi staccati, pezzi come corpi rigidi voxel, caduta, urto, rottura in blocchi, assestamento. Prova: torre di 12 piani colpita alla base, casa di mattoni, torre dell'acqua in legno. | **Fable 5.2 · high** per il solutore, poi Opus 5.5 per il resto | ≥ 60 fps durante il crollo e ≥ 200 pezzi in caduta. |
| **S5** | Carico completo: 50 unità che si muovono, esplosioni continue, un crollo, camera in movimento. 2 minuti registrati. | Opus 5.5 · high | Caso peggiore ≤ 16,6 ms e il 99° percentile annotato. |
| **S6** | Verdetto: `SPIKE-NOTE.md` con domanda, risultati per budget, SÌ / NO / PARZIALE e cosa fare dopo. | Opus 5.5 · medium | Decidi tu: porting completo, correzioni o altra strada. |

Ogni fase è una o due sedute. Stima complessiva come detto: 2–3 settimane di sedute normali.

Fable si usa in **S1**, in **S4 (solutore)** e solo se serve in **una sessione di debug** (S2 o S3).
Sono 2–4 sessioni in tutto. Ogni sessione Fable si chiude con un documento scritto. Poi l'implementazione la fa Opus.

## Cosa NON è nello spike

Gameplay, IA, HUD, negozio, run, suoni, salvataggi, il porting del codice JavaScript. Il codice JS resta lì come
riferimento delle regole (danni, statica, fuoco). Lo spike **non** lo traduce: riscrive da zero solo quello che serve
alla misura.

## Prove e risultati

- Ogni fase lascia nella cartella `evidence/` almeno uno screenshot e una riga in `evidence/perf.tsv`
  (fase, scenario, fps medio, ms caso peggiore, 99° percentile, VRAM, RAM, note).
- I parametri stanno in `spike.toml`, mai scritti nel codice (regola dello studio).
- Le misure si fanno in build `--release`, con le stesse impostazioni ogni volta.
- `target/` (la cartella dei build di Rust, molto grande) va in `.gitignore`.

## Regole di lavoro (le stesse di Rustline)

- Risposte in italiano. Dopo ogni fase accettata: commit, poi `git push tank main`, **mai** su `origin`.
  Niente righe di attribuzione nei commit; `.claude/launch.json` resta fuori.
- Domanda di accettazione: "Accetti la fase SN come checkpoint?" con le scelte **Accetto e pusha** / **Annullala**.
- Commit in formato Conventional Commits, con nel corpo `Design: prototypes/rustline-voxel-spike-2026-11-27/PLAN.md`.

## Brief per la sessione Fable di S1 (da incollare)

> Leggi `prototypes/rustline-voxel-spike-2026-11-27/PLAN.md`. Sei nella fase S1: progetta il motore voxel dello spike
> e scrivi `DESIGN.md` nella stessa cartella. Fissa memoria dei voxel, renderer, pezzi dinamici, fisica, flusso dati e
> versioni, ognuno con le alternative scartate e il budget in ms/MB, rispetto all'hardware e ai budget del piano.
> Come riferimento delle regole di danno, statica e fuoco guarda `prototypes/rustline-commander/js/structs.js`,
> `js/damage.js` e `js/fire.js` (non vanno tradotti). Verifica sul web le versioni attuali di Bevy, wgpu, Rapier e
> Avian. Non scrivere codice. Mostrami il documento prima di salvarlo.
