# AlgoDesign

**Italiano** · [English](README.md)

**Progettare algoritmi con i flowchart, eseguirli passo passo e tradurli in pseudocodice, Python e C.**

Versione 0.5.0-beta.1 del 25 ottobre 2026, per Windows 10 e 11 a 64 bit.

AlgoDesign è un ambiente didattico per chi impara a programmare: prima si progetta e si prova l'algoritmo come flowchart, poi si guarda come lo stesso ragionamento diventa codice. È un'applicazione **locale e leggera**: funziona senza internet, senza installarla e senza diritti di amministratore.

Pagina del progetto: https://www.lancellotti.info/AlgoDesign/

## Perché AlgoDesign

Chi inizia a programmare deve imparare due cose nello stesso momento: a ragionare per algoritmi e a scrivere la soluzione in un linguaggio di programmazione, con la sua sintassi, la sua punteggiatura e i suoi messaggi d'errore. Spesso il secondo compito copre il primo, e lo studente si ferma su una parentesi mancante prima ancora di aver capito che cosa voleva far fare al computer.

AlgoDesign separa i due compiti: prima si **progetta** l'algoritmo come flowchart, lo si **prova** e lo si corregge; solo dopo si guarda come diventa codice.

## Che cosa fa

- **Vista dei dati** accanto al disegno: costanti e variabili, ciascuna con il suo tipo (intero, reale, carattere, stringa, booleano, anche come vettore), il suo valore iniziale e il suo ruolo.
- **Editor di flowchart** con i blocchi che si usano in aula: inizio e fine, assegnazione, lettura, scrittura, selezione («se»), cicli con il controllo in testa («mentre») e in coda («ripeti»), i cicli che contano («per») e che percorrono un vettore o una stringa («per ogni»), la chiamata di una procedura, commento. Si lavora con il mouse o da tastiera, anche su più blocchi insieme; gli errori sono segnalati sul blocco e nella riga di stato, con la causa precisa e un suggerimento.
- **Procedure e funzioni**: un algoritmo si divide in pezzi con un nome, ognuno nella sua scheda, coi suoi dati e i suoi parametri, per valore, per riferimento o di uscita; una procedura compie un lavoro, una funzione calcola un risultato, anche una stringa o un vettore. Possono chiamare sé stesse (la ricorsione), e si importano da un altro progetto o da una cartella di librerie.
- **Esecuzione passo passo**: tutto insieme, un'azione alla volta o in modo animato, dentro e fuori dalle procedure e dalle funzioni, con i punti di interruzione; si segue il blocco attivo, si scrivono i valori nella console e si guardano i dati cambiare valore nella tabella di traccia, che si esporta per un foglio di calcolo. Il valore di un dato si legge col puntatore del mouse sul suo nome, o da tastiera.
- **Casi d'uso**: un algoritmo, o una sua procedura o funzione da sola, si prova su valori di ingresso e risultati attesi, come un piccolo collaudo, anche prima di scrivere le regole; un'esecuzione finita si salva come caso d'uso.
- **Traduzione** del flowchart in pseudocodice (in italiano o in inglese), Python e C, accanto al disegno, con la riga corrente evidenziata durante l'esecuzione; il codice si copia o si salva in un file.
- **Esempi** pronti da aprire e da modificare, in gruppi.
- Interfaccia in **italiano** e **inglese**.

Tipi e regole sono quelli del linguaggio C, con in più un tipo stringa, perché il passaggio dal flowchart al codice sia naturale. Il codice generato, però, è fatto per essere letto e non controlla i calcoli che escono dalle regole (un intero fuori dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore e pochi altri, elencati nelle note di rilascio): AlgoDesign li ferma sempre, il Python e il C generati no, e su quei calcoli possono dare risultati diversi fra loro.

Come si usa AlgoDesign è nella **guida per lo studente**, `GUIDA-PER-LO-STUDENTE.md` (in inglese `STUDENT-GUIDE.md`): nel pacchetto sta accanto al programma, nel repository nella cartella `docs`. Le novità di ogni versione sono nel registro delle modifiche, `CHANGELOG.md`.

## Scaricare e avviare

Le versioni di prova si scaricano dalla pagina del progetto.

1. Scarica lo zip e, se vuoi, controllane l'impronta: il file `.sha256` accanto allo zip contiene il suo codice SHA-256, che in PowerShell si calcola con `Get-FileHash <nome dello zip>` (PowerShell lo scrive in maiuscolo, il file in minuscolo: le lettere maiuscole e minuscole non contano).
2. Estrai lo zip dove preferisci (il Desktop, una cartella dei documenti, una chiavetta): nasce la cartella `AlgoDesign-0.5.0-beta.1`.
3. Apri la cartella e fai doppio clic su `AlgoDesign.exe`.

**L'avviso di Windows al primo avvio.** AlgoDesign non è firmato digitalmente, e Windows avvisa quando si avvia un programma non firmato scaricato da internet. Se compare la finestra «Windows ha protetto il PC», scegli «Ulteriori informazioni» e poi «Esegui comunque». Per evitarla, prima di estrarre lo zip apri le sue Proprietà (tasto destro sullo zip), segna «Sblocca» in basso nella scheda «Generale» e conferma con «OK».

**Se Windows blocca AlgoDesign senza il pulsante «Esegui comunque».** Succede su un Windows 11 con il «Controllo intelligente delle app» (Smart App Control) attivo, che di solito c'è solo sui PC installati da poco: blocca i programmi non firmati digitalmente che Microsoft non conosce, e non permette un'eccezione per un programma solo. Per usare AlgoDesign su quel PC bisogna spegnere il controllo, in «Sicurezza di Windows», «Controllo app e browser». Spegnerlo toglie quella protezione a tutti i programmi, non solo ad AlgoDesign: su un Windows 11 aggiornato almeno ad aprile 2026 lo si riaccende quando si vuole, su uno più vecchio, una volta spento, non si riaccende senza reinstallare Windows. Se il PC non è tuo (per esempio in un laboratorio), chiedi a chi lo gestisce.

**La cartella `data`.** Accanto a `AlgoDesign.exe` c'è la cartella `data`: lì AlgoDesign tiene le preferenze, gli esempi e i dati della sua finestra, e non scrive nulla di suo nel profilo dell'utente né nel registro di Windows. Per portare AlgoDesign altrove si copia l'intera cartella, anche su una chiavetta (provato su chiavette NTFS, exFAT e FAT32; su exFAT e FAT32 un file salvato sopra uno con l'estensione scritta con altre maiuscole, per esempio `media.ALGO`, tiene il nome di prima). Se la cartella `data` non c'è, AlgoDesign usa le cartelle standard del profilo dell'utente.

**Le finestre per aprire e salvare un file** sono quelle di Windows, non di AlgoDesign: hanno l'aspetto e la lingua del sistema, anche quando AlgoDesign è in un'altra lingua. Prima di salvare un progetto con un nome che non può essere il nome di un file, AlgoDesign propone un altro nome, che si può cambiare.

Windows stesso, invece, annota nel registro dell'utente alcune cose anche per un programma portabile: le sue finestre per aprire e salvare un file, o per scegliere una cartella, ricordano gli ultimi file e cartelle usati; l'elenco dei programmi avviati ricorda il percorso di `AlgoDesign.exe`; il componente WebView2 ricorda quando è stato usato. Sono tracce di Windows, non di AlgoDesign.

## Requisiti

- **Windows 10 o Windows 11 a 64 bit.**
- **Microsoft Edge WebView2**, il componente di Windows che disegna la finestra di AlgoDesign: senza, AlgoDesign non si apre. È già presente su Windows 11 e, quasi sempre, su Windows 10 aggiornato. Per controllare se c'è: nelle Impostazioni di Windows, «App», poi «App installate» (su Windows 10 «App e funzionalità»), cerca «WebView2»: la voce è «Microsoft Edge WebView2 Runtime». Se manca, si scarica gratis dal sito di Microsoft, https://developer.microsoft.com/microsoft-edge/webview2/, nella parte «Evergreen». Si può installare anche senza diritti di amministratore: in quel caso, secondo Microsoft, vale per il solo utente che lo installa.
- **Nessuna installazione e nessun diritto di amministratore**: AlgoDesign funziona anche con un utente senza diritti, da una cartella qualunque o da una chiavetta.
- **Spazio su disco**: circa 20 MB (il programma è di 9 MB, i dati della finestra nella cartella `data` crescono fino a una decina di MB).
- Uno schermo di almeno 960 × 600 punti: la finestra non si stringe sotto quella misura.
- Non serve una connessione a internet.

## La tabella di traccia in un foglio di calcolo

«Esporta la tabella…» scrive la tabella di traccia in un file CSV, che si apre con un foglio di calcolo. Il separatore delle celle e quello dei decimali si scelgono nelle Impostazioni, scheda «Tabella di traccia»; di partenza seguono la lingua dell'interfaccia: in italiano il punto e virgola e la virgola, che Excel in italiano apre con un doppio clic.

Una cella che comincia con `=`, `+`, `-` o `@` e non è un numero (per esempio un testo scritto dal programma, come `=1+2` o `-a`) si scrive nel file preceduta da un apostrofo, perché il foglio di calcolo non la prenda per una formula da calcolare. Microsoft Excel e LibreOffice Calc la aprono come testo e mostrano l'apostrofo davanti: `'=1+2`.

## Da sapere

- Questa versione è solo per Windows.
- Non sono provati lo spegnimento o il riavvio di Windows con modifiche non salvate (prima conviene salvare) e un file trascinato sulla finestra (per aprirlo si usa «Apri»). I tasti del browser che ricaricherebbero la finestra o tornerebbero indietro (F5, Ctrl+R, «Aggiorna» e «Indietro» di certe tastiere, Alt+freccia) AlgoDesign li ferma: F5 esegue il programma.
- Il codice generato non ha il limite delle azioni: un ciclo che non finisce, che AlgoDesign ferma dopo un milione di azioni, nel Python e nel C generati va fermato a mano.

## Come è stato sviluppato

AlgoDesign è un progetto in *vibe coding*: l'autore descrive che cosa serve, prende le decisioni didattiche e verifica ogni risultato, mentre gran parte del codice è scritta da un assistente di intelligenza artificiale. Il diario dello sviluppo è sul sito:
https://www.lancellotti.info/blog/tag/algodesign/

## Per chi sviluppa

### Prerequisiti

- [Bun](https://bun.sh) 1.4.2 e [Rust](https://rustup.rs) stabile (1.99.0).
- Windows 10 o 11 con WebView2.
- Per il collaudo, il confronto del codice generato: un gcc e un clang (C11) e Python 3, dati con le variabili `ALGODESIGN_CC` (gli eseguibili dei compilatori, separati come nel `PATH`) e `ALGODESIGN_PYTHON`, oppure nel file `app/.collaudo/toolchain.json` (`{ "c": [ … ], "python": "…" }`, non versionato), oppure trovati nel `PATH`.
- Solo per la prova nel container Linux: Docker Desktop.

### Comandi

Tutti i comandi si danno nella cartella `app/`, dopo `bun install`.

| Che cosa | Comando |
|---|---|
| L'app in sviluppo, in una finestra | `bun tauri dev` |
| Browser per i test dell'interfaccia (solo la prima volta) | `bun --bun playwright install chromium webkit` |
| Casi d'uso del corpus di esempi (`casi/`), oppure di un progetto dato | `bun run casi`, `bun run casi <progetto.algo>` |
| Collaudo (tipi, test di unità, casi d'uso, confronto del codice generato, build, test del guscio in Rust, test dell'interfaccia in Chromium) | `bun run collaudo` |
| Collaudo completo, coi test dell'interfaccia anche in WebKit | `bun run collaudo --completo` |
| Confronto del codice generato con l'esecuzione sui casi d'uso | `bun run differenziale` |
| Eseguibile di release per Windows | `bun tauri build --no-bundle` → `shell/target/release/algodesign.exe` |
| Pacchetto della release per Windows (cartella, zip e impronta in `dist/` alla radice; porta questo file, `README.md`, la guida per lo studente da `docs/` e le note di rilascio, che si danno allo strumento) | `bun run pacchetto --testi ../rilascio/windows` (con `--prova` da un albero con modifiche, in `dist/prova/`) |
| Lo JSON Schema del formato, dopo un cambio del lettore dei file | `bun ./strumenti/schema-del-formato.ts` |

### Le prove sul prodotto

- `bun run prova-portabile`: costruisce l'eseguibile, lo avvia con e senza `data` e controlla lingua, preferenze, apertura e salvataggio di un file dato all'avvio, la costruzione di un programma intero dall'interfaccia col suo caso d'uso, eseguito dalla sua riga prima e dopo le regole, e di uno con due procedure e una funzione, gli esempi forniti nei loro gruppi, l'esecuzione di un programma coi valori scritti nella console e l'esportazione della sua tabella di traccia, senza violazioni della politica di sicurezza dei contenuti, la finestra che risponde entro un secondo mentre esegue un vettore di 1000 elementi, nelle due forme della tabella, la chiusura della finestra con e senza modifiche, il tasto F5 che esegue e non ricarica la finestra, e le tracce, nel profilo e accanto all'eseguibile. Le tracce si cercano nelle cartelle dei dati delle applicazioni e dei file temporanei (`%APPDATA%`, `%LOCALAPPDATA%`, `%TEMP%`): nessuna cartella dell'app e nessuna voce nuova al loro primo livello; non guarda dentro le cartelle che esistono già, né il registro. `--senza-build` usa l'eseguibile già costruito, `--radice <cartella>` crea la cartella di prova altrove (per esempio sulla chiavetta), `--pacchetto <cartella>` prova la cartella composta dallo strumento del pacchetto, copiata intera.
- `bun run prova-linux` (Docker Desktop avviato): costruisce l'app in un container Ubuntu 24.04 e controlla la lingua, l'esecuzione di un programma coi valori scritti nella console, la finestra che risponde entro un secondo con un vettore di 1000 elementi, e le tracce, con e senza `data`.

### Scelte tecniche, in breve

- Guscio desktop **Tauri 2**; interfaccia React + TypeScript + Ark UI, con **Bun** per pacchetti, server di sviluppo, build e test.
- Il flowchart è un **albero sintattico**; il nucleo (modello, controllo dei tipi, interprete, generatori di codice) è TypeScript puro, separato da interfaccia e guscio.
- Tipi e semantica del **C11**, più un tipo `stringa`.
- Un progetto è un solo file `.algo`, in JSON: il formato è spiegato campo per campo in `docs/FORMATO-FILE-ALGO.md`, e scritto come JSON Schema in `docs/algo.schema.json`.

## Licenza

© 2026 Giuseppe Lancellotti. Due licenze, a seconda del tipo di contenuto:

| Contenuto | Licenza | Testo |
|---|---|---|
| **Codice**: sorgenti, script, configurazioni di build e di test | [MIT](https://opensource.org/license/mit) | [`LICENSE`](LICENSE) |
| **Documentazione**: i file Markdown (`*.md`) del repository, inclusi manuali e guide in `docs/` | [Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/deed.it) | [`LICENSE-DOCS`](LICENSE-DOCS) |

AlgoDesign usa librerie di terze parti, ciascuna con la propria licenza: nel pacchetto, l'elenco e i testi delle licenze sono nel file `LICENZE-DI-TERZE-PARTI.txt`.

## Il nome

"AlgoDesign" è il nome di questo progetto, usato dal 4 ottobre 2026 da Giuseppe Lancellotti:
https://www.lancellotti.info/AlgoDesign/

La licenza MIT riguarda il **codice**, non il nome. Chi distribuisce una versione modificata deve darle un nome diverso, perché nessuno la scambi per quella originale. Può scrivere che è "basata su AlgoDesign", con un link alla pagina del progetto.

## Autore

Giuseppe Lancellotti, docente di Scienze e tecnologie informatiche: https://www.lancellotti.info
