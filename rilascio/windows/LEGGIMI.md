# AlgoDesign

**Progettare algoritmi con i flowchart, eseguirli passo passo e tradurli in pseudocodice, Python e C.**

Versione {{versione}} del {{data}}.

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

## Com'è fatto (versione ALPHA 4)

- La versione **Portabile** è l'unica per Windows nelle versioni ALPHA: si copia in una cartella, anche su una chiavetta, e si avvia senza installarla. Comodo nei laboratori di una scuola. È stata provata su una chiavetta formattata NTFS; le chiavette FAT32 ed exFAT, le più comuni, non sono ancora state provate.
- Interfaccia in **italiano** e **inglese**.

## Scaricare e avviare

Le versioni ALPHA si scaricano direttamente dalla pagina del progetto.

1. Scarica lo zip e, se vuoi, controllane l'impronta: il file `.sha256` accanto allo zip contiene il suo codice SHA-256, che in PowerShell si calcola con `Get-FileHash <nome dello zip>` (PowerShell lo scrive in maiuscolo, il file in minuscolo: le lettere maiuscole e minuscole non contano).
2. Estrai lo zip dove preferisci (il Desktop, una cartella dei documenti, una chiavetta): nasce la cartella `AlgoDesign-{{versione}}`.
3. Apri la cartella e fai doppio clic su `AlgoDesign.exe`.

**L'avviso di Windows al primo avvio.** AlgoDesign non è firmato digitalmente, e Windows avvisa quando si avvia un programma non firmato scaricato da internet. Se compare la finestra «Windows ha protetto il PC», scegli «Ulteriori informazioni» e poi «Esegui comunque». Per evitarla, prima di estrarre lo zip apri le sue Proprietà (tasto destro sullo zip), segna «Sblocca» in basso nella scheda «Generale» e conferma con «OK».

**Se Windows blocca AlgoDesign senza il pulsante «Esegui comunque».** Succede su un Windows 11 con il «Controllo intelligente delle app» (Smart App Control) attivo, che di solito c'è solo sui PC installati da poco: blocca i programmi non firmati digitalmente che Microsoft non conosce, e non permette un'eccezione per un programma solo. Per usare AlgoDesign su quel PC bisogna spegnere il controllo, in «Sicurezza di Windows», «Controllo app e browser». Spegnerlo toglie quella protezione a tutti i programmi, non solo ad AlgoDesign: su un Windows 11 aggiornato almeno ad aprile 2026 lo si riaccende quando si vuole, su uno più vecchio, una volta spento, non si riaccende senza reinstallare Windows. Se il PC non è tuo (per esempio in un laboratorio), chiedi a chi lo gestisce.

**La cartella `data`.** Accanto a `AlgoDesign.exe` c'è la cartella `data`: lì AlgoDesign tiene le preferenze, gli esempi e i dati della sua finestra, e non scrive nulla di suo nel profilo dell'utente né nel registro di Windows. Per portare AlgoDesign altrove si copia l'intera cartella. Se la cartella `data` non c'è, AlgoDesign usa le cartelle standard del profilo dell'utente.

Windows stesso, invece, annota nel registro dell'utente alcune cose anche per un programma portabile: le sue finestre per aprire e salvare un file, o per scegliere una cartella, ricordano gli ultimi file e cartelle usati; l'elenco dei programmi avviati ricorda il percorso di `AlgoDesign.exe`; il componente WebView2 ricorda quando è stato usato. Sono tracce di Windows, non di AlgoDesign.

## Requisiti

- **Windows 10 o Windows 11 a 64 bit.**
- **Microsoft Edge WebView2**, il componente di Windows che disegna la finestra: è già presente su Windows 11 e, quasi sempre, su Windows 10 aggiornato. Se manca, AlgoDesign non si apre: si installa dal sito di Microsoft («WebView2 Runtime», versione «Evergreen»). Si può installare anche senza diritti di amministratore: in quel caso, secondo Microsoft, vale per il solo utente che lo installa.
- **Nessuna installazione e nessun diritto di amministratore**: AlgoDesign funziona anche con un utente senza diritti, da una cartella qualunque o da una chiavetta.
- **Spazio su disco**: circa 20 MB (il programma è di 9 MB, i dati della finestra nella cartella `data` crescono fino a una decina di MB).
- Uno schermo di almeno 960 × 600 punti: la finestra non si stringe sotto quella misura.
- Non serve una connessione a internet.

## Come è stato sviluppato

AlgoDesign è un progetto in *vibe coding*: l'autore descrive che cosa serve, prende le decisioni didattiche e verifica ogni risultato, mentre gran parte del codice è scritta da un assistente di intelligenza artificiale. Il diario delle tappe principali è sul sito:
https://www.lancellotti.info/blog/tag/algodesign/

## Licenza

Il codice è rilasciato con licenza **MIT**: vedi il file `LICENSE`.
Copyright (c) 2026 Giuseppe Lancellotti.

La guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`), questo file, le note di rilascio e il registro delle modifiche (`CHANGELOG.md`) sono rilasciati con licenza **Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0)**: vedi il file `LICENSE-DOCS`.

AlgoDesign usa librerie di terze parti, ciascuna con la propria licenza: l'elenco e i testi delle licenze sono nel file `LICENZE-DI-TERZE-PARTI.txt`.

## Il nome

"AlgoDesign" è il nome di questo progetto, usato dal 4 ottobre 2026 da Giuseppe Lancellotti:
https://www.lancellotti.info/AlgoDesign/

La licenza MIT riguarda il **codice**, non il nome. Chi distribuisce una versione modificata deve darle un nome diverso, perché nessuno la scambi per quella originale. Può scrivere che è "basata su AlgoDesign", con un link alla pagina del progetto.

## Autore

Giuseppe Lancellotti, docente di Scienze e tecnologie informatiche: https://www.lancellotti.info
