# AlgoDesign {{versione}}: note di rilascio

Versione del {{data}}. È la **seconda versione beta** di AlgoDesign, per Windows 10 e 11 a 64 bit, nella forma portabile: si estrae lo zip e si avvia `AlgoDesign.exe`, senza installarlo. Come si avvia, i requisiti e l'avviso di Windows al primo avvio sono nel file `LEGGIMI.md` (in inglese `README.md`); come si usa è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md` (in inglese `STUDENT-GUIDE.md`).

Una versione beta serve a provare il programma a fondo in aula e a raccogliere osservazioni: qualche dettaglio può ancora cambiare.

## Che cosa c'è di nuovo

- **La stampa.** «Stampa…» (Ctrl+P), nel menu «Progetto», apre la finestra «Stampa»: si scelgono le parti (progetto, dati, flowchart, codice, flowchart e codice affiancati, casi d'uso), di quali procedure e funzioni, i colori (a colori, a toni di grigio, in bianco e nero) e il piè di pagina; poi la finestra di stampa di Edge stampa su carta o salva in un PDF. Di partenza si stampano il flowchart e il codice affiancati, su fogli orizzontali. La guida lo spiega nel §12.
- **Il flowchart come immagine.** «Esporta il flowchart…», nel menu «Progetto», salva il flowchart della scheda mostrata come immagine PNG o come disegno SVG, a colori, a toni di grigio o in bianco e nero, con lo sfondo bianco o trasparente; in pausa con i segni dell'esecuzione.
- **I linguaggi del codice generato.** Nelle Impostazioni, scheda «Console», si sceglie quali linguaggi hanno una linguetta accanto al flowchart, e in che ordine, coi pulsanti ▲ e ▼; almeno un linguaggio resta acceso. La guida lo spiega nel §13.
- **«Accademico».** Fra i linguaggi che si accendono c'è lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica. Se un programma usa qualcosa che «Accademico» non ha, al posto del codice c'è l'elenco di ciò che manca, e un clic su una voce porta al blocco o al dato. Come si usa per allenarsi lo spiega `GUIDA-AD-ACCADEMICO.md`, accanto al programma.
- **Dal testo al flowchart: lo strumento di «Accademico».** In un pacchetto a parte, `AlgoDesign-Accademico-{{versione}}-windows.zip`, c'è `algodesign-accademico.exe`, che si usa dal Terminale di Windows: legge un testo scritto in «Accademico» e ne fa una libreria di AlgoDesign, che si apre e si esegue passo passo. Come si usa è nel §6 della guida ad «Accademico».
- **La pila delle chiamate nel progetto.** Quante chiamate di procedure e funzioni che richiamano sé stesse possono essere in corso insieme si sceglie per ogni progetto, nelle Proprietà, da 5 a 500 (500 di partenza), e vale anche per il Python e il C generati; nelle Impostazioni, scheda «Limiti», il numero con cui nasce un progetto nuovo.
- **Un esempio nuovo**: «Ricorsione senza uscita», nel gruppo «Funzioni e procedure», con la pila delle chiamate a 10 posti; gli esempi forniti sono dodici.

## Che cosa c'è

- **Il progetto**: un solo file `.algo` con i dati, le regole (il flowchart del programma principale e di ogni procedura o funzione), i casi d'uso, il nome, l'autore, la descrizione e le note. Si crea, si apre, si salva; prima di perdere modifiche non salvate AlgoDesign chiede.
- **La vista dei dati**, a sinistra: costanti e variabili con nome, tipo (intero, reale, carattere, stringa, booleano), forma (semplice o vettore), valore iniziale e ruolo (input, output, tutti e due o di lavoro); per una procedura o una funzione, sopra, i suoi parametri.
- **Il flowchart**, a destra: i blocchi assegnazione, lettura, scrittura, «se», «mentre», «ripeti», «per», «per ogni», procedura e commento, che si inseriscono dai «+», si scrivono nei loro campi, si spostano trascinandoli, si copiano e si cancellano; Annulla e Ripeti; tutto anche da tastiera. Gli errori e gli avvisi si vedono sul blocco e nella riga di stato in basso, ognuno con una spiegazione e un suggerimento.
- **Procedure e funzioni**, con i parametri per valore, per riferimento e di uscita, un risultato anche stringa o vettore, la ricorsione e le librerie da cui importarle.
- **L'esecuzione**: tutto insieme (F5), un'azione alla volta (F10), dentro e fuori dalle chiamate (F11, Maiusc+F11) o animata a tre velocità, con i punti di interruzione (F9). Il blocco corrente è evidenziato, i valori si scrivono nella console, e la tabella di traccia mostra a ogni azione il valore di ogni dato; la tabella si esporta in un file CSV per un foglio di calcolo. Col puntatore del mouse sul nome di un dato, o con Maiusc+F9, se ne vedono tipo e valore.
- **I casi d'uso**: gli input e l'output atteso di una prova, scritti in una scheda accanto ai dati anche prima delle regole, o salvati da un'esecuzione, per il programma e per ogni procedura o funzione; si eseguono uno alla volta o tutti insieme, e l'esito dice «raggiunto» o «non raggiunto», con le differenze.
- **Il codice generato**: con «Genera», accanto al flowchart, lo stesso algoritmo in pseudocodice (in italiano o in inglese, come l'interfaccia), in Python e in C, e, se lo si accende, in «Accademico», con la riga corrente evidenziata durante l'esecuzione; «Copia» e «Salva…». Sui casi d'uso con cui AlgoDesign stesso è stato provato, il Python e il C generati danno lo stesso risultato dell'esecuzione in AlgoDesign, tranne quelli che provano i calcoli che il codice generato non controlla e il limite delle azioni (si veda «Da sapere»).
- **La stampa e le immagini**: il progetto su carta o in un PDF, e il flowchart come immagine PNG o SVG.
- **Il menu «Aiuto»**: la guida per lo studente, i dodici esempi forniti, in gruppi (si aprono, se ne aggiungono, se ne eliminano), e le informazioni su AlgoDesign, con la versione e le licenze.
- **Le Impostazioni**: lingua (italiano o inglese, anche dalla riga di stato), la ricerca e la finestra della guida, colori del flowchart e colori dei blocchi, disegno dei cicli, modo di scrivere blocchi e dati, casi d'uso dalle esecuzioni, limiti e pila delle chiamate dei progetti nuovi, cartelle delle librerie e degli esempi, aspetto della barra, tabella di traccia, console e linguaggi del codice generato. Le scelte restano dopo il riavvio, nella cartella `data` accanto al programma.

## Che cosa manca

- Le versioni per Linux e per macOS.
- Compilare ed eseguire il codice generato dentro AlgoDesign: il codice si copia o si salva, e si prova con un compilatore C o con Python a parte.

## Da sapere

- **I progetti delle versioni precedenti** si aprono con questa senza cambiamenti. **Non vale il contrario**: un progetto creato con questa versione, o di cui si sono confermate le Proprietà, porta nel file la pila delle chiamate, e le versioni precedenti non lo aprono.
- **Il codice generato è semplice, da leggere**: non controlla i calcoli che il C lascia senza una regola (un intero che esce dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto prima di avere un valore), né un reale che diventa infinito o non è un numero. Un commento in testa al programma Python e C lo dice; AlgoDesign, invece, ferma l'esecuzione su ognuno di questi errori e indica il blocco. Su questi calcoli il Python e il C generati possono dare risultati diversi fra loro.
- **Un ciclo che non finisce**: AlgoDesign ferma l'esecuzione dopo un milione di azioni; il Python e il C generati non hanno questo limite, e il programma va fermato a mano.
- **Il Python generato** vuole Python 3.9 o successivo; il C generato si compila con un compilatore C11.
- **Lo strumento di «Accademico»** scrive solo i file che gli si dicono, e i suoi messaggi sono in italiano.
- **L'avviso di Windows al primo avvio**: AlgoDesign e lo strumento di «Accademico» non sono firmati digitalmente; come procedere è nel `LEGGIMI.md`.
- **WebView2**: senza il componente di Windows che disegna la finestra, AlgoDesign non si apre; come controllare se c'è e dove scaricarlo è nel `LEGGIMI.md`.
- **Il file CSV della tabella di traccia**: una cella che comincia come una formula (`=`, `+`, `-`, `@`) si scrive preceduta da un apostrofo, che Excel e LibreOffice Calc mostrano (il `LEGGIMI.md` lo spiega).
- **La versione portabile non scrive nulla di suo nel profilo dell'utente né nel registro di Windows**: preferenze ed esempi stanno nella cartella `data` accanto al programma, e i file che salvi stanno dove li metti tu. Windows, invece, annota da sé nel registro dell'utente gli ultimi file e cartelle delle sue finestre per aprire e salvare, il percorso del programma avviato, l'ultimo uso del componente WebView2 e, con la stampa, una firma delle sue impostazioni (il `LEGGIMI.md` lo spiega).
