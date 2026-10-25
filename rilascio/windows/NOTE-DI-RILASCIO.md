# AlgoDesign {{versione}}: note di rilascio

Versione del {{data}}. È la **prima versione beta** di AlgoDesign, per Windows 10 e 11 a 64 bit, nella forma portabile: si estrae lo zip e si avvia `AlgoDesign.exe`, senza installarlo. Come si avvia, i requisiti e l'avviso di Windows al primo avvio sono nel file `LEGGIMI.md` (in inglese `README.md`); come si usa è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md` (in inglese `STUDENT-GUIDE.md`).

Una versione beta serve a provare il programma a fondo in aula e a raccogliere osservazioni: qualche dettaglio può ancora cambiare.

## Che cosa c'è di nuovo

- **Un caso d'uso da un'esecuzione.** Finita un'esecuzione con F5 o F10, «Salva l'esecuzione come caso d'uso» in fondo alla console prepara un caso nuovo coi valori scritti nella console e, come output atteso, ciò che il programma ha scritto (con l'errore, se si è fermato su un errore); lo stesso fa «Nuovo caso dall'ultima esecuzione» nella scheda «Casi d'uso». Nelle Impostazioni, scheda «Modifica», la casella «Offri di salvare un'esecuzione come caso d'uso» lo spegne. La guida lo spiega nel §6.
- **Il valore di un dato dalla tastiera.** Durante l'esecuzione, Maiusc+F9 sul blocco che ha il fuoco apre il riquadro col valore del suo primo dato, col fuoco dentro; un altro Maiusc+F9 passa al dato dopo, ed Esc torna al blocco.
- **Le ricorsioni nella riga di stato**: la prima, e quante altre ce ne sono; «Mostra le ricorsioni» apre l'elenco di tutte.
- **Il disegno**: coi cicli chiusi il punto di interruzione non tocca più il bordo del riquadro; il segno di un errore su un ciclo non cade più sulla linea che entra né sulla scritta «Vero»; il segno «↩» della ripresa sta sotto il blocco, a sinistra della linea che esce.
- **Il nome del file.** Se il nome del progetto non può essere il nome di un file (ha caratteri che un file non può avere, o è un nome che Windows riserva, come `CON`), prima della finestra di Windows AlgoDesign propone un altro nome, che si può cambiare, con le regole dei nomi. Le stesse regole valgono per gli esempi e i loro gruppi.
- **La guida per lo studente dentro AlgoDesign**: «Guida per lo studente», nel menu «Aiuto», la apre in una finestra a destra, nella lingua dell'interfaccia, che resta aperta mentre si lavora; la ricerca si toglie e la finestra si può spostare, nelle Impostazioni.
- **La lingua nella riga di stato**: «ITA» o «ENG» all'estrema destra, e un clic apre il menu delle due lingue.
- **La guida per lo studente anche in inglese**, `STUDENT-GUIDE.md`, e il README in due lingue, `LEGGIMI.md` e `README.md`.
- **Correzioni**: eseguire, fermare ed eseguire di nuovo lo stesso programma lasciava vuota la tabella di traccia; un blocco trascinato e lasciato fuori dal flowchart restava attaccato al puntatore del mouse; la tabella di traccia con centinaia di chiamate in corso si riempie in meno della metà del tempo; «Elimina il gruppo» elimina tutto il gruppo o niente, e se un suo esempio è aperto in un'altra applicazione lo dice.

## Che cosa c'è

- **Il progetto**: un solo file `.algo` con i dati, le regole (il flowchart del programma principale e di ogni procedura o funzione), i casi d'uso, il nome, l'autore, la descrizione e le note. Si crea, si apre, si salva; prima di perdere modifiche non salvate AlgoDesign chiede.
- **La vista dei dati**, a sinistra: costanti e variabili con nome, tipo (intero, reale, carattere, stringa, booleano), forma (semplice o vettore), valore iniziale e ruolo (input, output, tutti e due o di lavoro); per una procedura o una funzione, sopra, i suoi parametri.
- **Il flowchart**, a destra: i blocchi assegnazione, lettura, scrittura, «se», «mentre», «ripeti», «per», «per ogni», procedura e commento, che si inseriscono dai «+», si scrivono nei loro campi, si spostano trascinandoli, si copiano e si cancellano; Annulla e Ripeti; tutto anche da tastiera. Gli errori e gli avvisi si vedono sul blocco e nella riga di stato in basso, ognuno con una spiegazione e un suggerimento.
- **Procedure e funzioni**, con i parametri per valore, per riferimento e di uscita, un risultato anche stringa o vettore, la ricorsione e le librerie da cui importarle.
- **L'esecuzione**: tutto insieme (F5), un'azione alla volta (F10), dentro e fuori dalle chiamate (F11, Maiusc+F11) o animata a tre velocità, con i punti di interruzione (F9). Il blocco corrente è evidenziato, i valori si scrivono nella console, e la tabella di traccia mostra a ogni azione il valore di ogni dato; la tabella si esporta in un file CSV per un foglio di calcolo. Col puntatore del mouse sul nome di un dato, o con Maiusc+F9, se ne vedono tipo e valore.
- **I casi d'uso**: gli input e l'output atteso di una prova, scritti in una scheda accanto ai dati anche prima delle regole, o salvati da un'esecuzione, per il programma e per ogni procedura o funzione; si eseguono uno alla volta o tutti insieme, e l'esito dice «raggiunto» o «non raggiunto», con le differenze.
- **Il codice generato**: con «Genera», accanto al flowchart, lo stesso algoritmo in pseudocodice (in italiano o in inglese, come l'interfaccia), in Python e in C, con la riga corrente evidenziata durante l'esecuzione; «Copia» e «Salva…». Sui casi d'uso con cui AlgoDesign stesso è stato provato, il Python e il C generati danno lo stesso risultato dell'esecuzione in AlgoDesign, tranne quelli che provano i calcoli che il codice generato non controlla e il limite delle azioni (si veda «Da sapere»).
- **Il menu «Aiuto»**: la guida per lo studente, gli undici esempi forniti, in gruppi (si aprono, se ne aggiungono, se ne eliminano), e le informazioni su AlgoDesign, con la versione e le licenze.
- **Le Impostazioni**: lingua (italiano o inglese, anche dalla riga di stato), la ricerca e la finestra della guida, colori del flowchart e colori dei blocchi, disegno dei cicli, modo di scrivere blocchi e dati, casi d'uso dalle esecuzioni, limiti, cartelle delle librerie e degli esempi, aspetto della barra, tabella di traccia e console. Le scelte restano dopo il riavvio, nella cartella `data` accanto al programma.

## Che cosa manca

- Le versioni per Linux e per macOS.
- Compilare ed eseguire il codice generato dentro AlgoDesign: il codice si copia o si salva, e si prova con un compilatore C o con Python a parte.

## Da sapere

- **I progetti delle versioni precedenti** si aprono con questa senza cambiamenti. Il formato dei file è lo stesso.
- **Il codice generato è semplice, da leggere**: non controlla i calcoli che il C lascia senza una regola (un intero che esce dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto prima di avere un valore), né un reale che diventa infinito o non è un numero. Un commento in testa al programma Python e C lo dice; AlgoDesign, invece, ferma l'esecuzione su ognuno di questi errori e indica il blocco. Su questi calcoli il Python e il C generati possono dare risultati diversi fra loro.
- **Un ciclo che non finisce**: AlgoDesign ferma l'esecuzione dopo un milione di azioni; il Python e il C generati non hanno questo limite, e il programma va fermato a mano.
- **Il Python generato** vuole Python 3.9 o successivo; il C generato si compila con un compilatore C11.
- **L'avviso di Windows al primo avvio**: AlgoDesign non è firmato digitalmente; come procedere è nel `LEGGIMI.md`.
- **WebView2**: senza il componente di Windows che disegna la finestra, AlgoDesign non si apre; come controllare se c'è e dove scaricarlo è nel `LEGGIMI.md`.
- **Il file CSV della tabella di traccia**: una cella che comincia come una formula (`=`, `+`, `-`, `@`) si scrive preceduta da un apostrofo, che Excel e LibreOffice Calc mostrano (il `LEGGIMI.md` lo spiega).
- **La versione portabile non scrive nulla di suo nel profilo dell'utente né nel registro di Windows**: preferenze ed esempi stanno nella cartella `data` accanto al programma, e i file che salvi stanno dove li metti tu. Windows, invece, annota da sé nel registro dell'utente gli ultimi file e cartelle delle sue finestre per aprire e salvare, il percorso del programma avviato e l'ultimo uso del componente WebView2 (il `LEGGIMI.md` lo spiega).
