# AlgoDesign per Linux

**Progettare algoritmi con i flowchart, eseguirli passo passo e tradurli in pseudocodice, Python e C.**

Versione {{versione}} del {{data}}, **per Linux**.

> **Una versione di prova riservata.** Questa copia per Linux è data ad alcuni studenti prima che la versione per Linux sia stata provata del tutto: è la stessa AlgoDesign della versione per Windows, ma su Linux è stata provata solo in parte e mai su un desktop vero. Può avere difetti che su Windows non ci sono. Leggi la sezione **«Limiti della versione per Linux»** prima di usarla, e salva spesso. Non diffonderla: le versioni pubbliche si scaricano dalla pagina del progetto.

AlgoDesign è un ambiente didattico per chi impara a programmare: prima si progetta e si prova l'algoritmo come flowchart, poi si guarda come lo stesso ragionamento diventa codice.

Pagina del progetto: https://www.lancellotti.info/AlgoDesign/

## Perché AlgoDesign

Chi inizia a programmare deve imparare due cose nello stesso momento: a ragionare per algoritmi e a scrivere la soluzione in un linguaggio di programmazione, con la sua sintassi, la sua punteggiatura e i suoi messaggi d'errore. Spesso il secondo compito copre il primo, e lo studente si ferma su una parentesi mancante prima ancora di aver capito che cosa voleva far fare al computer.

AlgoDesign separa i due compiti: prima si **progetta** l'algoritmo come flowchart, lo si **prova** e lo si corregge; solo dopo si guarda come diventa codice.

## Che cosa fa questa versione

- **Vista dei dati** accanto al disegno: costanti e variabili, ciascuna con il suo tipo (intero, reale, carattere, stringa, booleano, anche come vettore), il suo valore iniziale e il suo ruolo.
- **Editor di flowchart** con i blocchi che si usano in aula: inizio e fine, assegnazione, lettura, scrittura, selezione («se»), cicli con il controllo in testa («mentre») e in coda («ripeti»), i cicli che contano («per») e che percorrono un vettore o una stringa («per ogni»), la chiamata di una procedura, commento. Si lavora con il mouse o da tastiera, anche su più blocchi insieme, e gli errori sono segnalati sul blocco e nella riga di stato.
- **Procedure e funzioni**: un algoritmo si divide in pezzi con un nome, ognuno nella sua scheda, coi suoi dati e i suoi parametri, per valore, per riferimento o di uscita; una procedura compie un lavoro, una funzione calcola un risultato, anche una stringa o un vettore. Possono chiamare sé stesse (la ricorsione), e si importano da un altro progetto o da una cartella di librerie.
- **Esecuzione passo passo**: tutto insieme, un'azione alla volta o in modo animato, dentro e fuori dalle procedure e dalle funzioni, con i punti di interruzione; si segue il blocco attivo, si scrivono i valori nella console e si guardano le variabili cambiare valore nella tabella di traccia, che si esporta per un foglio di calcolo.
- **Casi d'uso**: un algoritmo, o una sua procedura o funzione da sola, si prova su dati di ingresso e risultati attesi, come un piccolo collaudo, anche prima di scrivere le regole.
- **Traduzione** del flowchart in pseudocodice (in italiano o in inglese), Python e C, accanto al disegno, con la riga corrente evidenziata durante l'esecuzione; il codice si copia o si salva in un file.
- **Esempi** pronti da aprire e da modificare, in gruppi.

Tipi e regole sono quelli del linguaggio C, con in più un tipo stringa, perché il passaggio dal flowchart al codice sia naturale. Il codice generato, però, è fatto per essere letto e non controlla i calcoli che escono dalle regole (un intero fuori dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore e pochi altri, elencati nelle note di rilascio): AlgoDesign li ferma sempre, il Python e il C generati no, e su quei calcoli possono dare risultati diversi fra loro.

## Com'è fatto (versione ALPHA 4 per Linux)

- **Un solo file, `AlgoDesign.AppImage`**: un'AppImage contiene il programma e le librerie che gli servono, e si avvia senza installarla e senza diritti di amministratore.
- **Portabile**, come la versione per Windows: accanto all'AppImage c'è la cartella `data`, dove AlgoDesign tiene le preferenze, gli esempi e i dati della sua finestra. Per portarlo altrove si copia l'intera cartella. Se la cartella `data` non c'è, AlgoDesign usa le cartelle standard dell'utente (`~/.config/io.github.gilan65.algodesign` e simili).
- Interfaccia in **italiano** e **inglese**.

## Scaricare e avviare

1. Se vuoi, controlla l'impronta dell'archivio: il file `.sha256` accanto all'archivio contiene il suo codice SHA-256, che nel terminale si calcola con `sha256sum <nome dell'archivio>`.
2. Estrai l'archivio `.tar.gz` dove preferisci (con il gestore dei file, tasto destro → «Estrai qui», oppure con `tar xzf <nome dell'archivio>`): nasce la cartella `AlgoDesign-{{versione}}`.
3. Apri la cartella e fai doppio clic su `AlgoDesign.AppImage`, oppure, dal terminale, dentro la cartella: `./AlgoDesign.AppImage`.

**Se il doppio clic non lo avvia** (si apre un editor di testo, o non succede nulla), il file ha perso il permesso di esecuzione, per esempio perché è stato copiato da una chiavetta: tasto destro → Proprietà → Permessi → «Consenti l'esecuzione del file come programma», oppure, dal terminale, `chmod +x AlgoDesign.AppImage`.

**Se non parte e dal terminale si legge un messaggio su FUSE** (per esempio «dlopen(): error loading libfuse.so.2» o «AppImages require FUSE to run»), al sistema manca la libreria che le AppImage usano per avviarsi. Due strade:

- installarla (serve la password di amministratore): su Ubuntu 22.04 e Linux Mint 21 `sudo apt install libfuse2`, su Ubuntu 24.04 e successivi `sudo apt install libfuse2t64`;
- oppure, senza installare nulla, avviare AlgoDesign dal terminale con `./AlgoDesign.AppImage --appimage-extract-and-run` (si avvia un po' più lentamente).

**Se dal terminale si legge «libEGL.so.1: cannot open shared object file»**, manca la libreria grafica di base, che un desktop ha sempre ma un sistema ridotto all'osso no: `sudo apt install libegl1`.

**Se la finestra si apre bianca o vuota**, succede con alcune schede grafiche (soprattutto NVIDIA): avvialo dal terminale con `WEBKIT_DISABLE_DMABUF_RENDERER=1 ./AlgoDesign.AppImage`.

## Requisiti

- **Linux a 64 bit su processore Intel o AMD** (x86_64). Non funziona sui processori ARM (per esempio Raspberry Pi).
- **Una distribuzione uscita dal 2022 in poi**: AlgoDesign chiede la libreria di sistema glibc **2.34** o più recente, cioè per esempio Ubuntu 22.04 o successivo, Linux Mint 21 o successivo, Debian 12 o successivo, Fedora 35 o successivo. Sulle distribuzioni più vecchie non parte.
- Un desktop grafico (GNOME, KDE, Cinnamon, XFCE…), con la sua grafica di base (`libEGL`, sempre presente in un desktop).
- **Nessuna installazione e nessun diritto di amministratore** (salvo la libreria FUSE, se manca: vedi sopra).
- **Spazio su disco**: circa 100 MB (l'AppImage è di 82 MB, i dati della finestra nella cartella `data` crescono fino a una decina di MB).
- Uno schermo di almeno 960 × 600 punti: la finestra non si stringe sotto quella misura.
- Non serve una connessione a internet.

## Limiti della versione per Linux

Leggili prima di usarla: sono le differenze rispetto alla versione per Windows, che è quella provata.

### Che cosa è stato provato

Durante lo sviluppo AlgoDesign è stato provato su **Ubuntu 24.04, in un ambiente di prova senza desktop** (uno schermo virtuale, senza scheda grafica): si apre, parte nella lingua del sistema (italiano o inglese), esegue un programma con un vettore di 1000 elementi, e con la cartella `data` non scrive nulla di suo fuori da lì. Questa AppImage, costruita su Ubuntu 22.04 perché parta anche sulle distribuzioni meno recenti, è stata poi **verificata così come la ricevi**: scaricato l'archivio, controllata l'impronta, estratto con `tar`, avviata con FUSE come fa un doppio clic, su un **Ubuntu 22.04** e un **Ubuntu 24.04** appena installati, senza WebKit nel sistema. In tutti e due si è aperta, ha disegnato la finestra e ha scritto solo nella cartella `data`; al sistema ha chiesto soltanto la libreria grafica di base (`libEGL`), che ogni desktop ha. Nessuno l'ha ancora **usata** su un desktop Linux vero.

### Noto che non funzioni come su Windows

- **La prima esecuzione nella tabella di traccia «in fila»** può fermare la finestra per circa un secondo, nell'ambiente di prova senza scheda grafica; le esecuzioni successive sono rapide. Su un desktop vero dovrebbe andare meglio, ma non è stato provato.

### Non provato

- **Le novità di questa versione** (la ricorsione, la scelta di più blocchi, le parentesi che si chiudono da sé, i colori dei blocchi) sono state provate solo su Windows.
- **Il doppio clic dal gestore dei file** di un desktop vero (l'avvio con FUSE è provato, dal terminale).
- **Le finestre per aprire, salvare e scegliere una cartella** (quelle del desktop, GTK).
- **Copia, taglia e incolla** dei blocchi e del testo nei campi.
- **L'aspetto**: caratteri (dipendono da quelli installati nella distribuzione), misure, barre di scorrimento, il trascinamento dei blocchi, lo zoom e «Adatta alla finestra»; gli schermi ad alta risoluzione con il ridimensionamento attivo.
- **I desktop e i sistemi grafici diversi** (Wayland e X11, GNOME, KDE…) e le schede grafiche (vedi sopra la finestra bianca).
- **I programmi lunghi o pesanti** su un desktop vero (vettori grandi, cicli con molte azioni, tabelle di traccia lunghe).
- **L'esportazione della tabella di traccia** in CSV e il salvataggio del codice generato.
- **Entra ed Esci da tastiera** (F11, Maiusc+F11): se il desktop li tiene per sé, usa i pulsanti **Entra** ed **Esci** della barra.
- **L'avvio da una chiavetta**: alcune distribuzioni montano le chiavette senza il permesso di eseguire programmi; in quel caso si copia la cartella sul disco.

### Che cosa resta sul sistema

Con la cartella `data`, AlgoDesign non scrive nulla di suo fuori da lì. Il sistema, invece, può annotare da sé alcune cose: le finestre per aprire e salvare ricordano gli ultimi file usati (in `~/.local/share/recently-used.xbel`), e le librerie dei caratteri e della grafica tengono le loro cache in `~/.cache`. Sono tracce del sistema, non di AlgoDesign.

### Se qualcosa non va

Annota che cosa stavi facendo, salva il progetto se puoi, fai una foto dello schermo (di solito con il tasto Stamp) e manda tutto al tuo docente; se AlgoDesign non parte, avvialo dal terminale e copia anche i messaggi che scrive. Con questi elementi un difetto si riproduce e si corregge.

## Come è stato sviluppato

AlgoDesign è un progetto in *vibe coding*: l'autore descrive che cosa serve, prende le decisioni didattiche e verifica ogni risultato, mentre gran parte del codice è scritta da un assistente di intelligenza artificiale. Il diario delle tappe principali è sul sito:
https://www.lancellotti.info/blog/tag/algodesign/

## Licenza

Il codice è rilasciato con licenza **MIT**: vedi il file `LICENSE`.
Copyright (c) 2026 Giuseppe Lancellotti.

La guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`), questo file, le note di rilascio e il registro delle modifiche (`CHANGELOG.md`) sono rilasciati con licenza **Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)**: vedi il file `LICENSE-DOCS`.

AlgoDesign usa librerie di terze parti, ciascuna con la propria licenza: l'elenco e i testi delle licenze sono nel file `LICENZE-DI-TERZE-PARTI.txt`. L'AppImage contiene anche alcune librerie di Ubuntu (fra cui WebKitGTK e GTK, che disegnano la finestra): il loro elenco, le versioni e i file di copyright sono nella cartella `LICENZE-DELLE-LIBRERIE-DI-SISTEMA`.

## Il nome

"AlgoDesign" è il nome di questo progetto, usato dal 4 ottobre 2026 da Giuseppe Lancellotti:
https://www.lancellotti.info/AlgoDesign/

La licenza MIT riguarda il **codice**, non il nome. Chi distribuisce una versione modificata deve darle un nome diverso, perché nessuno la scambi per quella originale. Può scrivere che è "basata su AlgoDesign", con un link alla pagina del progetto.

## Autore

Giuseppe Lancellotti, docente di Scienze e tecnologie informatiche: https://www.lancellotti.info
