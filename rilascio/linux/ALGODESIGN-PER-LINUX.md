# AlgoDesign per Linux

**Progettare algoritmi con i flowchart, eseguirli passo passo e tradurli in pseudocodice, Python, C e TypeScript.**

Versione {{versione}} {{delData}}, **per Linux** a 64 bit.

È la stessa AlgoDesign della versione per Windows: questo file dice come si avvia su Linux, che cosa le serve e che cosa su Linux è diverso. La scrittura del primo algoritmo, passo per passo, è nella guida «per cominciare», `PER-COMINCIARE.md`; come si usa l'applicazione è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md`, con gli stessi tasti di Windows; i difetti già conosciuti sono nelle note di rilascio, `NOTE-DI-RILASCIO.md`, nella parte «Difetti noti».

AlgoDesign è un ambiente didattico per chi impara a programmare: prima si progetta e si prova l'algoritmo come flowchart, poi si guarda come lo stesso ragionamento diventa codice.

Pagina del progetto: https://www.lancellotti.info/AlgoDesign/

## Perché AlgoDesign

Chi inizia a programmare deve imparare due cose nello stesso momento: a ragionare per algoritmi e a scrivere la soluzione in un linguaggio di programmazione, con la sua sintassi, la sua punteggiatura e i suoi messaggi d'errore. Spesso il secondo compito copre il primo, e lo studente si ferma su una parentesi mancante prima ancora di aver capito che cosa voleva far fare al computer.

AlgoDesign separa i due compiti: prima si **progetta** l'algoritmo come flowchart, lo si **prova** e lo si corregge; solo dopo si guarda come diventa codice.

## Com'è fatto

- **Un solo file, `AlgoDesign.AppImage`**: un'AppImage contiene il programma e le librerie che gli servono, e si avvia senza installarla e senza diritti di amministratore.
- **Portabile**, come la versione per Windows: accanto all'AppImage c'è la cartella `data`, dove AlgoDesign tiene le preferenze, gli esempi e i dati della sua finestra. Per portarlo altrove si copia l'intera cartella. Se la cartella `data` non c'è, AlgoDesign usa le cartelle standard dell'utente, `~/.config/io.github.gilan65.algodesign` e `~/.local/share/io.github.gilan65.algodesign`.
- Interfaccia in **italiano** e **inglese**.

## Scaricare e avviare

1. Scarica l'archivio `AlgoDesign-{{versione}}-linux-x64.tar.gz` dalla pagina delle release, https://github.com/gilan65/AlgoDesign/releases, e, se vuoi, controllane l'impronta: il file `.sha256` accanto all'archivio contiene il suo codice SHA-256, che nel terminale si calcola con `sha256sum <nome dell'archivio>`.
2. Estrai l'archivio dove preferisci: con il gestore dei file, tasto destro → «Estrai», nasce la cartella `AlgoDesign-{{versione}}-linux-x64` con dentro la cartella `AlgoDesign-{{versione}}`; dal terminale, con `tar xzf <nome dell'archivio>`, nasce solo la seconda.
3. Apri la cartella `AlgoDesign-{{versione}}` e fai doppio clic su `AlgoDesign.AppImage`, oppure, dal terminale, dentro la cartella: `./AlgoDesign.AppImage`.

**Il primo clic.** Avviata dal gestore dei file, la tastiera resta al gestore dei file finché non fai clic nella finestra di AlgoDesign: le scorciatoie, come Ctrl+O o F5, funzionano dopo quel clic.

**L'icona.** Nella barra del desktop AlgoDesign ha un'icona generica e il nome «algodesign»: un'AppImage non si installa e non aggiunge una voce al menu delle applicazioni.

**Se il doppio clic non lo avvia** (si apre un editor di testo, o non succede nulla), il file ha perso il permesso di esecuzione, per esempio perché è stato copiato da una chiavetta: tasto destro → Proprietà → Permessi → «Consenti l'esecuzione del file come programma», oppure, dal terminale, `chmod +x AlgoDesign.AppImage`.

**Se non parte e dal terminale si legge un messaggio su FUSE** (per esempio «dlopen(): error loading libfuse.so.2» o «AppImages require FUSE to run»), al sistema manca la libreria che le AppImage usano per avviarsi. Su un Ubuntu 26.04 con il desktop GNOME, provato, c'è già e non serve nulla. Altrimenti, due strade:

- installarla (serve la password di amministratore): su Ubuntu 22.04 e Linux Mint 21 `sudo apt install libfuse2`, su Ubuntu 24.04 `sudo apt install libfuse2t64`;
- oppure, senza installare nulla, avviare AlgoDesign dal terminale con `./AlgoDesign.AppImage --appimage-extract-and-run` (si avvia un po' più lentamente). Avviato così, il file `.algo` da aprire va scritto col percorso intero, anche se sta nella cartella in cui sei: `./AlgoDesign.AppImage --appimage-extract-and-run "$PWD/media voti.algo"`.

**Se dal terminale si legge «libEGL.so.1: cannot open shared object file»**, manca la libreria grafica di base, che un desktop ha sempre ma un sistema ridotto all'osso no: `sudo apt install libegl1`.

**Se la finestra si apre bianca o vuota**, succede con alcune schede grafiche (soprattutto NVIDIA): avvialo dal terminale con `WEBKIT_DISABLE_DMABUF_RENDERER=1 ./AlgoDesign.AppImage`.

**Lo strumento a riga di comando** è in un archivio a parte, `AlgoDesign-Tools-{{versione}}-linux-x64.tar.gz`: come si usa lo dicono il suo `LEGGIMI.md` e la guida ad `algodesign-tools`, `GUIDA-AD-ALGODESIGN-TOOLS.md`.

## Requisiti

- **Linux a 64 bit su processore Intel o AMD** (x86_64). Non funziona sui processori ARM (per esempio Raspberry Pi).
- **Una distribuzione uscita dal 2022 in poi**: AlgoDesign chiede la libreria di sistema glibc **2.34** o più recente, cioè per esempio Ubuntu 22.04 o successivo, Linux Mint 21 o successivo, Debian 12 o successivo, Fedora 35 o successivo. Sulle distribuzioni più vecchie non parte.
- Un desktop grafico (GNOME, KDE, Cinnamon, XFCE…), con la sua grafica di base (`libEGL`, sempre presente in un desktop).
- **Nessuna installazione e nessun diritto di amministratore** (salvo la libreria FUSE, se manca: vedi sopra).
- **Spazio su disco**: circa 100 MB (l'AppImage è di 82 MB, i dati della finestra nella cartella `data` crescono fino a una decina di MB).
- Uno schermo di almeno 960 × 600 punti: la finestra non si stringe sotto quella misura.
- Non serve una connessione a internet.

## Su Linux, rispetto a Windows

### Che cosa è stato provato

- **Su un desktop vero**: Ubuntu 26.04 con GNOME (Wayland), in una macchina virtuale con uno schermo di 1280 × 800: l'estrazione col gestore dei file, il doppio clic sull'AppImage, le finestre per aprire e salvare un file, l'esecuzione di un vettore di 1000 elementi con la tabella di traccia «in fila», la stampa su file, l'esportazione del flowchart in PNG, lo strumento a riga di comando nel terminale.
- **Su Ubuntu 22.04 e 24.04 appena installati**, senza WebKit nel sistema: l'archivio scaricato, l'impronta controllata, l'estrazione con `tar`, l'avvio con FUSE come fa un doppio clic, la finestra disegnata.
- **Su Ubuntu 22.04, con prove automatiche sull'AppImage**: l'esecuzione di un programma, un vettore di 1000 elementi, la finestra per aprire un file, nulla scritto fuori dalla cartella `data`.
- **Su Ubuntu 24.04, le prove automatiche dell'interfaccia**, che usano l'applicazione come farebbe una persona, e il codice generato in Python e in C confrontato con l'esecuzione in AlgoDesign.

### Che cosa è diverso

- **La stampa**: un verso solo per tutti i fogli e niente intestazione né piè di pagina (le note di rilascio, «Difetti noti»). Per avere un PDF, nella finestra di stampa del sistema si sceglie «Stampa su file»: il nome proposto è `output.pdf`, non quello del progetto.
- **Le finestre per aprire e salvare un file** sono quelle del desktop (GTK), col titolo nella lingua di AlgoDesign.
- **Le Impostazioni e la finestra «Stampa»** su uno schermo basso, come 1280 × 800, sono più alte dello schermo: «Conferma» e «Stampa…» si raggiungono scorrendo. Esc chiude le Impostazioni senza applicare le scelte.
- **Entra ed Esci da tastiera** (F11, Maiusc+F11): se il desktop li tiene per sé, usa i pulsanti **Entra** ed **Esci** della barra.
- **Una pagina HTML dello strumento a riga di comando**, aperta con un doppio clic, può aprirsi nell'editor di testo invece che nel browser: tasto destro → «Apri con» → il browser.

### Non provato

- **I desktop diversi da GNOME** (KDE, Cinnamon, XFCE…) e il sistema grafico X11.
- **Le schede grafiche vere**: la macchina virtuale disegna col processore (vedi sopra la finestra bianca).
- **Gli schermi ad alta risoluzione** con il ridimensionamento attivo.
- **I programmi lunghi o pesanti** su un computer vero (vettori grandi, cicli con molte azioni, tabelle di traccia lunghe).
- **L'avvio da una chiavetta**: alcune distribuzioni montano le chiavette senza il permesso di eseguire programmi; in quel caso si copia la cartella sul disco.

### Che cosa resta sul sistema

Con la cartella `data`, AlgoDesign non scrive nulla di suo fuori da lì. Il sistema, invece, annota da sé alcune cose: le finestre per aprire e salvare ricordano gli ultimi file usati, col nome scritto nella finestra (in `~/.local/share/recently-used.xbel`), e le loro impostazioni (in `~/.config/dconf/user`); il gestore dei file tiene le sue informazioni sui file in `~/.local/share/gvfs-metadata`; le librerie dei caratteri e della grafica tengono le loro cache in `~/.cache`. Sono tracce del sistema, non di AlgoDesign.

### Se qualcosa non va

Guarda prima la parte «Difetti noti» delle note di rilascio: se il difetto è lì, è già conosciuto. Altrimenti la guida per segnalare un malfunzionamento, `GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md`, dice come farlo sapere. Se AlgoDesign non parte, avvialo dal terminale e copia nella segnalazione i messaggi che scrive.

## Come è stato sviluppato

AlgoDesign è un progetto in *vibe coding*: l'autore descrive che cosa serve, prende le decisioni didattiche e verifica ogni risultato, mentre gran parte del codice è scritta da un assistente di intelligenza artificiale. Il diario dello sviluppo è sul sito:
https://www.lancellotti.info/blog/tag/algodesign/

## Licenza

Il codice è rilasciato con licenza **MIT**: vedi il file `LICENSE`.
Copyright (c) 2026 Giuseppe Lancellotti.

Le guide, questo file, le note di rilascio e il registro delle modifiche (`CHANGELOG.md`) sono rilasciati con licenza **Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)**: vedi il file `LICENSE-DOCS`.

AlgoDesign usa librerie di terze parti, ciascuna con la propria licenza: l'elenco e i testi delle licenze sono nel file `LICENZE-DI-TERZE-PARTI.txt`. L'AppImage contiene anche alcune librerie di Ubuntu (fra cui WebKitGTK e GTK, che disegnano la finestra): il loro elenco, le versioni e i file di copyright sono nella cartella `LICENZE-DELLE-LIBRERIE-DI-SISTEMA`.

## Il nome

"AlgoDesign" è il nome di questo progetto, usato dal 4 ottobre 2026 da Giuseppe Lancellotti:
https://www.lancellotti.info/AlgoDesign/

La licenza MIT riguarda il **codice**, non il nome. Chi distribuisce una versione modificata deve darle un nome diverso, perché nessuno la scambi per quella originale. Può scrivere che è "basata su AlgoDesign", con un link alla pagina del progetto.

## Autore

Giuseppe Lancellotti, docente di Scienze e tecnologie informatiche: https://www.lancellotti.info
