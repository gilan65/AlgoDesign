# AlgoDesign per macOS

**Progettare algoritmi con i flowchart, eseguirli passo passo e tradurli in pseudocodice, Python, C e TypeScript.**

Versione {{versione}} {{delData}}, **per macOS** 13.3 o successivo, sui Mac con chip Apple e su quelli con processore Intel.

È la stessa AlgoDesign delle versioni per Windows e per Linux: questo file dice come si avvia sul Mac, che cosa le serve e che cosa sul Mac è diverso. La scrittura del primo algoritmo, passo per passo, è nella guida «per cominciare», `PER-COMINCIARE.md`; come si usa l'applicazione è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md`, che nel capitolo «Sul Mac» dice i tasti del Mac; i difetti già conosciuti sono nelle note di rilascio, `NOTE-DI-RILASCIO.md`, nella parte «Difetti noti».

AlgoDesign è un ambiente didattico per chi impara a programmare: prima si progetta e si prova l'algoritmo come flowchart, poi si guarda come lo stesso ragionamento diventa codice.

Pagina del progetto: https://www.lancellotti.info/AlgoDesign/

## Perché AlgoDesign

Chi inizia a programmare deve imparare due cose nello stesso momento: a ragionare per algoritmi e a scrivere la soluzione in un linguaggio di programmazione, con la sua sintassi, la sua punteggiatura e i suoi messaggi d'errore. Spesso il secondo compito copre il primo, e lo studente si ferma su una parentesi mancante prima ancora di aver capito che cosa voleva far fare al computer.

AlgoDesign separa i due compiti: prima si **progetta** l'algoritmo come flowchart, lo si **prova** e lo si corregge; solo dopo si guarda come diventa codice.

## Com'è fatto

- **Un'app sola, `AlgoDesign`**, per i Mac con chip Apple e per quelli con processore Intel. Non si installa: funziona dalla cartella in cui la estrai, e si può spostare dove si vuole, anche in Applicazioni.
- **Le preferenze, gli esempi e i dati della finestra** stanno nella cartella Libreria dell'utente, come per le altre app del Mac: sul Mac non c'è la cartella `data` delle versioni per Windows e per Linux. Dove stanno, e come toglierli, lo dice più sotto «Che cosa resta sul Mac».
- Interfaccia in **italiano** e **inglese**; il menu in cima allo schermo e le finestre di macOS sono nella lingua del sistema.

## Scaricare e avviare

1. Scarica lo zip `AlgoDesign-{{versione}}-macos-universal.zip` dalla pagina delle release, https://github.com/gilan65/AlgoDesign/releases, e, se vuoi, controllane l'impronta: il file `.sha256` accanto allo zip contiene il suo codice SHA-256, che nel Terminale si calcola con `shasum -a 256 <nome dello zip>`.
2. Safari estrae lo zip da solo, nella cartella Download: nasce la cartella `AlgoDesign-{{versione}}`. Con un altro browser, fai doppio clic sullo zip nel Finder.
3. Apri la cartella `AlgoDesign-{{versione}}` e fai doppio clic su `AlgoDesign`.

**Al primo avvio macOS blocca AlgoDesign.** AlgoDesign non è firmata da Apple (la firma di Apple vuole un abbonamento a pagamento), e macOS non apre da sé un'app scaricata da internet senza quella firma. Si apre una volta sola dalle Impostazioni di Sistema; dopo, il doppio clic basta. La finestra cambia con la versione di macOS:

- **Da macOS 15 in poi** la finestra dice «AlgoDesign non è stata aperta», con due pulsanti: **«Sposta nel Cestino»**, in blu, e **«Fine»**. ⚠️ **Scegli «Fine»**: «Sposta nel Cestino» butta via l'app. Poi apri le Impostazioni di Sistema, «Privacy e sicurezza», e scendi fino alla sezione «Sicurezza»: accanto a «Il Mac ha bloccato AlgoDesign per garantire la sicurezza.» fai clic su **«Apri comunque»**. Nella finestra «Vuoi aprire AlgoDesign?» scegli di nuovo **«Apri comunque»** (non «Sposta nel Cestino»), poi scrivi il nome e la password dell'utente del Mac.
- **Su macOS 13 e 14** la finestra dice «Impossibile aprire "AlgoDesign" perché Apple non può verificare la presenza di malware.», con «Mostra nel Finder» e **«OK»**: scegli «OK». Poi apri le Impostazioni di Sistema, «Privacy e sicurezza», e scendi fino in fondo: accanto a «L'utilizzo di "AlgoDesign" è stato bloccato perché non proviene da uno sviluppatore identificato.» fai clic su **«Apri comunque»** e scrivi la password. Nella finestra che torna, scegli **«Apri»**.
**Aprire un progetto all'avvio.** Il doppio clic su un file `.algo` non basta: AlgoDesign non si installa, e il Mac non sa che quel file è suo. Dal Terminale, nella cartella del file, si scrive il percorso del programma che sta dentro l'app, seguito dal file fra virgolette se ha degli spazi; per esempio, con l'app rimasta in Download:

```sh
~/Downloads/AlgoDesign-{{versione}}/AlgoDesign.app/Contents/MacOS/algodesign "media voti.algo"
```

Il comando `open -a`, invece, apre AlgoDesign senza il file. La prima volta che il Terminale legge un file nella cartella Documenti, o in Download, macOS chiede il permesso («"Terminale" vorrebbe accedere ai file nella cartella Documenti»): scegli «Consenti», o «OK».

**Lo strumento a riga di comando** è in uno zip a parte, `AlgoDesign-Tools-{{versione}}-macos-universal.zip`: come si usa lo dicono il suo `LEGGIMI.md` e la guida ad `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`.

## Requisiti

- **macOS 13.3 Ventura o successivo.** Su un macOS più vecchio, macOS stesso non apre l'app e lo dice: «Non puoi utilizzare questa versione dell'applicazione "AlgoDesign" con questa versione di macOS».
- **Un Mac con chip Apple** (M1 e successivi) **o con processore Intel**: la stessa app funziona su tutti e due i tipi di Mac, senza scegliere una versione diversa.
- **Nessuna installazione**: serve solo la password dell'utente del Mac, una volta, per sbloccarla al primo avvio.
- **Spazio su disco**: circa 40 MB (l'app è di 25 MB, i dati della finestra nella Libreria crescono fino a una decina di MB).
- Uno schermo di almeno 960 × 600 punti: la finestra non si stringe sotto quella misura.
- Non serve una connessione a internet.

## Sul Mac, rispetto a Windows

### Che cosa è stato provato

- **Come lo usa uno studente**, su macOS 13.3 e su macOS 27, in italiano, e su macOS 27 in inglese, in Mac virtuali su un MacBook Air con chip Apple: lo zip scaricato con Safari, lo sblocco al primo avvio, l'uscita con ⌘Q con modifiche non salvate, un file aperto dal Terminale, le finestre per aprire e salvare un file, la stampa in PDF, l'esportazione del flowchart in PNG, il Tab nelle finestre, lo strumento a riga di comando nel Terminale.
- **Su macOS 13.2.1**, la versione appena più vecchia: il rifiuto di macOS.
- **Su macOS 15 con chip Apple, con prove automatiche**: l'avvio, anche nella parte per i processori Intel (con Rosetta), l'uscita e i menu coi tasti veri, e le prove dell'interfaccia, che usano l'applicazione come farebbe una persona.

### Che cosa è diverso

- **I tasti**: ⌘ al posto di Ctrl, e i tasti funzione con **fn**; la guida per lo studente li elenca nel capitolo «Sul Mac».
- **Il menu in cima allo schermo** ha tre voci: AlgoDesign (Informazioni, Impostazioni ed Esci), Modifica e Finestra. Gli altri comandi stanno nella barra dentro la finestra.
- **La stampa**: «Stampa…» apre la finestra di stampa di macOS. Per avere un PDF fai clic su «PDF»: il nome proposto è «AlgoDesign», da cambiare. I fogli si stampano tutti nel verso scelto in quella finestra, senza l'intestazione e senza il piè di pagina (le note di rilascio, «Difetti noti»). Da macOS 15 in poi, alla prima stampa, macOS chiede «Vuoi consentire a AlgoDesign di trovare i dispositivi sulle reti locali?»: «Consenti» serve per una stampante di rete; per un PDF basta «Non consentire».
- **Il Tab** passa solo fra i campi, e salta i pulsanti, finché nelle Impostazioni di Sistema, «Tastiera», non si accende «Navigazione da tastiera»: è una scelta di macOS, che vale per tutte le app.
- **Le finestre per aprire e salvare un file** sono quelle di macOS, nella lingua del sistema.

### Non provato

- **Un Mac con processore Intel vero**: la parte per Intel è provata con Rosetta su un Mac con chip Apple.
- **Un Mac vero**: le prove da studente sono fatte in Mac virtuali.
- **macOS 14, 15 e 26 a mano**: lì è provato solo che l'interfaccia parte; le prove automatiche corrono su macOS 15.
- **I programmi lunghi o pesanti** su un Mac vero (vettori grandi, cicli con molte azioni, tabelle di traccia lunghe).

### Che cosa resta sul Mac

AlgoDesign tiene i suoi dati nella Libreria dell'utente, in quattro posti col suo nome, `io.github.gilan65.algodesign`:

- `~/Library/Application Support/io.github.gilan65.algodesign`: le preferenze e gli esempi;
- `~/Library/Caches/io.github.gilan65.algodesign` e `~/Library/WebKit/io.github.gilan65.algodesign`: i dati della finestra;
- `~/Library/Preferences/io.github.gilan65.algodesign.plist`: le impostazioni che macOS tiene per ogni app.

I file che salvi stanno dove li metti tu. **Per togliere AlgoDesign** dal Mac: sposta nel Cestino la cartella `AlgoDesign-{{versione}}`; poi nel Finder scegli «Vai», «Vai alla cartella…», scrivi `~/Library` e sposta nel Cestino quei quattro elementi. Le risposte date al Terminale per le cartelle Documenti e Download restano nelle Impostazioni di Sistema, «Privacy e sicurezza», «File e cartelle».

### Se qualcosa non va

Guarda prima la parte «Difetti noti» delle note di rilascio: se il difetto è lì, è già conosciuto. Altrimenti la guida per segnalare un malfunzionamento, `GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md`, dice come farlo sapere. Se AlgoDesign non parte, avvialo dal Terminale col percorso del programma (sopra, «Aprire un progetto all'avvio», senza il file) e copia nella segnalazione i messaggi che scrive.

## Come è stato sviluppato

AlgoDesign è un progetto in *vibe coding*: l'autore descrive che cosa serve, prende le decisioni didattiche e verifica ogni risultato, mentre gran parte del codice è scritta da un assistente di intelligenza artificiale. Il diario dello sviluppo è sul sito:
https://www.lancellotti.info/blog/tag/algodesign/

## Licenza

Il codice è rilasciato con licenza **MIT**: vedi il file `LICENSE`.
Copyright (c) 2026 Giuseppe Lancellotti.

Le guide, questo file, le note di rilascio e il registro delle modifiche (`CHANGELOG.md`) sono rilasciati con licenza **Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)**: vedi il file `LICENSE-DOCS`.

AlgoDesign usa librerie di terze parti, ciascuna con la propria licenza: l'elenco e i testi delle licenze sono nel file `LICENZE-DI-TERZE-PARTI.txt`.

## Il nome

"AlgoDesign" è il nome di questo progetto, usato dal 4 ottobre 2026 da Giuseppe Lancellotti:
https://www.lancellotti.info/AlgoDesign/

La licenza MIT riguarda il **codice**, non il nome. Chi distribuisce una versione modificata deve darle un nome diverso, perché nessuno la scambi per quella originale. Può scrivere che è "basata su AlgoDesign", con un link alla pagina del progetto.

## Autore

Giuseppe Lancellotti, docente di Scienze e tecnologie informatiche: https://www.lancellotti.info
