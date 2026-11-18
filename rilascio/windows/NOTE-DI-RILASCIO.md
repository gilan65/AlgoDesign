# AlgoDesign {{versione}}: note di rilascio

Versione {{delData}}, per Windows 10 e 11 a 64 bit, nella forma portabile: si estrae lo zip e si avvia `AlgoDesign.exe`, senza installarlo. Dalla stessa pagina si scaricano anche le versioni per Linux e, da questa versione, per macOS. Come si avvia l'applicazione, i suoi requisiti e l'avviso di Windows al primo avvio sono nel file `LEGGIMI.md` (in inglese `README.md`); la scrittura del primo algoritmo, passo per passo, è nella guida «per cominciare», `PER-COMINCIARE.md` (in inglese `GETTING-STARTED.md`); come si usa l'applicazione è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md` (in inglese `STUDENT-GUIDE.md`).

## Che cosa c'è di nuovo

Rispetto alla versione 1.0.0:

- **La versione per macOS**, dalla stessa pagina: un'app universale, per i Mac con chip Apple e per quelli con processore Intel, da macOS 13.3 in poi. I progetti sono gli stessi: uno fatto su Windows si apre sul Mac senza cambiamenti, e il contrario.
- **Lo strumento a riga di comando converte i file di Flowgorithm.** Il comando nuovo `flowgorithm` legge i file di Flowgorithm (`.fprg`) e ne fa progetti di AlgoDesign, che si aprono e si eseguono passo passo: un file, più file o una cartella intera. Che cosa si converte e che cosa no lo dice la guida ai file di Flowgorithm, `GUIDA-AI-FILE-DI-FLOWGORITHM.md`.
- **Aprire un progetto all'avvio**: la guida per lo studente dice come dare il file ad AlgoDesign su ogni sistema; su Windows anche trascinando il file sopra `AlgoDesign.exe`, o col tasto destro e «Apri con».

## Che cosa c'è

- **Il progetto**: un solo file `.algo` con i dati, le regole (il flowchart del programma principale e di ogni procedura o funzione), i casi d'uso, il nome, l'autore, la descrizione e le note. Si crea, si apre, si salva; prima di perdere modifiche non salvate AlgoDesign chiede.
- **La vista dei dati**, a sinistra: costanti e variabili con nome, tipo (intero, reale, carattere, stringa, booleano o un record), forma (semplice, vettore o matrice), valore iniziale e ruolo (input, output, tutti e due o di lavoro); per una procedura o una funzione, sopra, i suoi parametri.
- **Il flowchart**, a destra: i blocchi assegnazione, lettura, scrittura, «se», «mentre», «ripeti», «per», «per ogni», procedura e commento, che si inseriscono dai «+», si scrivono nei loro campi, si spostano trascinandoli, si copiano e si cancellano; Annulla e Ripeti; tutto anche da tastiera. Gli errori e gli avvisi si vedono sul blocco e nella riga di stato in basso, ognuno con una spiegazione e un suggerimento.
- **Procedure e funzioni**, con i parametri per valore, per riferimento e di uscita, un risultato anche stringa o vettore, la ricorsione e le librerie da cui importarle.
- **L'esecuzione**: tutto insieme (F5), un'azione alla volta (F10), dentro e fuori dalle chiamate (F11, Maiusc+F11) o animata a tre velocità, con i punti di interruzione (F9). Il blocco corrente è evidenziato, i valori si scrivono nella console, e la tabella di traccia mostra a ogni azione il valore di ogni dato; la tabella si esporta in un file CSV per un foglio di calcolo. Col puntatore del mouse sul nome di un dato, o con Maiusc+F9, se ne vedono tipo e valore.
- **I casi d'uso**: gli input e l'output atteso di una prova, scritti in una scheda accanto ai dati anche prima delle regole, o salvati da un'esecuzione, per il programma e per ogni procedura o funzione; si eseguono uno alla volta o tutti insieme, e l'esito dice «raggiunto» o «non raggiunto», con le differenze.
- **Il codice generato**: con «Genera», accanto al flowchart, lo stesso algoritmo in pseudocodice (in italiano o in inglese, come l'interfaccia), in Python e in C, e, se attivati, in TypeScript e in «Accademico», con la riga corrente evidenziata durante l'esecuzione; «Copia» e «Salva…». Sui casi d'uso con cui AlgoDesign stesso è stato provato, il Python, il C, il TypeScript e il JavaScript generati danno lo stesso risultato dell'esecuzione in AlgoDesign, tranne quelli che provano i calcoli che il codice generato non controlla e il limite delle azioni (si veda «Da sapere»).
- **La stampa e le immagini**: il progetto su carta o in un PDF, e il flowchart come immagine PNG o SVG.
- **Il menu «Aiuto»**: la guida per lo studente, i dodici esempi forniti, in gruppi (si aprono, se ne aggiungono, se ne eliminano), i comandi per segnalare un malfunzionamento e le informazioni su AlgoDesign, con la versione e le licenze.
- **Le Impostazioni**: lingua (italiano o inglese, anche dalla riga di stato), la ricerca e la finestra della guida, colori del flowchart e colori dei blocchi, disegno dei cicli, modo di scrivere blocchi e dati, casi d'uso dalle esecuzioni, limiti e pila delle chiamate dei progetti nuovi, cartelle delle librerie e degli esempi, aspetto della barra, tabella di traccia, console e linguaggi del codice generato. Le scelte restano dopo il riavvio, nella cartella `data` accanto al programma.

## Che cosa manca

- Compilare ed eseguire il codice generato dentro AlgoDesign: il codice si copia o si salva e si prova a parte, con un compilatore C, con Python o con Node.js.

## Cose da fare

Ciò che è previsto per le prossime versioni e che oggi non c'è. Non sono difetti.

- **In «Accademico» e nello strumento a riga di comando**: le matrici, i tipi `float` e `char`, `SQRT` e `-Infinity`.
- **Il limite di un milione di azioni e quello dei 1000 elementi di un vettore**: la guida ad «Accademico» spiega come rispondere lo stesso a un esercizio che li supera.

## Da sapere

- **I progetti delle versioni precedenti**, anche quelli fatti su Linux e sul Mac, si aprono con questa senza cambiamenti. **Non vale il contrario**: un progetto salvato con questa versione non si apre con le versioni precedenti alla 0.7.0-beta.3.
- **Il codice generato è semplice, da leggere**: non controlla i calcoli che il C lascia senza una regola (un intero che esce dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto prima di avere un valore), né un reale che diventa infinito o non è un numero. Un commento in testa al programma Python, C e TypeScript lo dice; AlgoDesign, invece, ferma l'esecuzione su ognuno di questi errori e indica il blocco. Su questi calcoli il Python, il C e il TypeScript generati possono dare risultati diversi fra loro.
- **Un ciclo che non finisce**: AlgoDesign ferma l'esecuzione dopo un milione di azioni; il Python, il C e il TypeScript generati non hanno questo limite e il programma va fermato a mano.
- **Il Python generato** vuole Python 3.11 o successivo; il C generato si compila con un compilatore C11; il TypeScript generato si esegue con Node.js 24.
- **La pagina di prova** è provata in Chrome, in Edge e in Firefox. In Safari non è provata: per la riga dell'errore la pagina potrebbe mostrare «?», col motivo giusto.
- **Lo strumento a riga di comando** scrive solo i file che il comando produce e i suoi messaggi sono in italiano.
- **L'avviso di Windows al primo avvio**: AlgoDesign e lo strumento a riga di comando non sono firmati digitalmente; come procedere è nel `LEGGIMI.md`.
- **WebView2**: senza il componente di Windows che disegna la finestra, AlgoDesign non si apre; come controllare se c'è e dove scaricarlo è nel `LEGGIMI.md`.
- **Il file CSV della tabella di traccia**: una cella che comincia come una formula (`=`, `+`, `-`, `@`) si scrive preceduta da un apostrofo, che Excel e LibreOffice Calc mostrano (il `LEGGIMI.md` lo spiega).
- **La versione portabile non scrive nulla di suo nel profilo dell'utente né nel registro di Windows**: preferenze ed esempi stanno nella cartella `data` accanto al programma, e i file che salvi stanno dove li metti tu. Windows, invece, annota da sé nel registro dell'utente gli ultimi file e cartelle delle sue finestre per aprire e salvare, il percorso del programma avviato, l'ultimo uso del componente WebView2 e, con la stampa, una firma delle sue impostazioni (il `LEGGIMI.md` lo spiega).

## Difetti noti

I difetti già conosciuti e non ancora corretti in questa versione. Se ne trovi un altro, la guida per segnalare un malfunzionamento, `GUIDA-PER-SEGNALARE-UN-MALFUNZIONAMENTO.md`, dice come farlo sapere.

- **Un dato letto, rinominato in pausa.** «Riesegui» lo considera un altro dato: le sue letture si scrivono di nuovo nella console, e con «Tieni i valori modificati» un valore scritto a mano in quel dato non si riapplica.
- **Una Lettura tolta e poi rimessa.** Se in pausa togli una Lettura, riesegui, poi la rimetti con Annulla e riesegui di nuovo, il valore che quella Lettura aveva letto non c'è più: AlgoDesign lo chiede di nuovo nella console, e l'avviso lo dice.
- **L'esecuzione animata dietro una finestra.** Mentre una finestra è aperta, per esempio «Stampa», l'esecuzione animata va avanti: la stampa mostra il blocco evidenziato e i valori del momento del clic su «Stampa…», non di quando la finestra si è aperta. Per stampare un punto preciso dell'esecuzione, mettila prima in pausa.
- **Un campo rinominato negli attesi.** Se rinomini il campo di un record che una funzione restituisce, nei casi d'uso le righe attese «→ .campo = …» restano col nome vecchio, e il caso risulta «non raggiunto»: il nome va corretto a mano nel caso.
- **Il valore iniziale di una tabella.** Se il record ripetuto è scritto senza graffe, per esempio `"-", "0X", 0`, e poi passi a «elenco per record», i valori diventano un elenco piatto, senza le graffe di ogni record: l'errore sul valore lo mostra, e basta scrivere ogni record fra graffe.
- **Node.js all'uscita.** Raramente, dopo aver eseguito il TypeScript generato, Node.js scrive una riga d'errore in più dopo il risultato, che è giusto (visto due volte in alcune centinaia di esecuzioni).
- **La selezione nella pagina di prova.** Nella pagina di prova dello strumento a riga di comando, una selezione col mouse che parte nel riquadro del codice e finisce fuori prende anche i titoli della colonna accanto; dentro il riquadro la selezione è giusta.
