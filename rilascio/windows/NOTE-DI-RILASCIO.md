# AlgoDesign {{versione}}: note di rilascio

Versione del {{data}}. È la **terza versione beta** di AlgoDesign, per Windows 10 e 11 a 64 bit, nella forma portabile: si estrae lo zip e si avvia `AlgoDesign.exe`, senza installarlo. Come si avvia, i requisiti e l'avviso di Windows al primo avvio sono nel file `LEGGIMI.md` (in inglese `README.md`); come si usa è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md` (in inglese `STUDENT-GUIDE.md`).

Una versione beta serve a provare il programma a fondo in aula e a raccogliere osservazioni: qualche dettaglio può ancora cambiare.

## Che cosa c'è di nuovo

- **I record.** Un record raccoglie sotto un nome valori di tipo diverso: `alunno` ha un nome, una classe e un voto; `a.voto` è un campo del dato `a`. Si definisce una volta per tutto il progetto, con «Aggiungi un record» del menu «Progetto». Il record intero si copia, si passa a una procedura o a una funzione e può essere il risultato di una funzione. La guida lo spiega nel §5.
- **Le matrici.** La forma «matrice» di un dato dispone i valori in righe e colonne: `m[1][2]` è un elemento, `m[1]` è una riga, che va dovunque va un vettore.
- **Le tabelle.** Un vettore di record è una tabella: `classe[1].voto` è il voto del secondo alunno. Con i record e le matrici si eseguono passo passo, si stampano e si generano in ogni linguaggio tranne «Accademico». Nelle Impostazioni, scheda «Tabella di traccia», si sceglie come si mostrano.
- **TypeScript.** Fra i linguaggi che si accendono nelle Impostazioni c'è il TypeScript, con tutto ciò che il flowchart sa fare; **Salva…** scrive un file `.ts`, che si esegue con Node.js 24, da scaricare a parte. La guida lo spiega nel §8.
- **JavaScript e la pagina di prova.** Il JavaScript è lo stesso programma senza i tipi. Lo strumento a riga di comando lo affianca al TypeScript in una pagina da stampare e lo esegue nel browser in una pagina di prova, con l'input e l'output nella pagina, senza nulla da scaricare.
- **Lo strumento cambia nome e impara un comando.** Lo strumento di «Accademico» delle versioni precedenti, `algodesign-accademico.exe`, ora è `algodesign-tools.exe`, in un pacchetto a parte, `AlgoDesign-Tools-{{versione}}-windows.zip`, con l'icona di AlgoDesign. Ciò che faceva prima si scrive con `accademico` dopo il nome nuovo; il comando nuovo, `stampa`, scrive da un progetto due testi di codice affiancati, anche due linguaggi a scelta con le righe allineate blocco per blocco. Come si usa è in `GUIDA-AD-ALGODESIGN-TOOLS.md`.

## Che cosa c'è

- **Il progetto**: un solo file `.algo` con i dati, le regole (il flowchart del programma principale e di ogni procedura o funzione), i casi d'uso, il nome, l'autore, la descrizione e le note. Si crea, si apre, si salva; prima di perdere modifiche non salvate AlgoDesign chiede.
- **La vista dei dati**, a sinistra: costanti e variabili con nome, tipo (intero, reale, carattere, stringa, booleano o un record), forma (semplice, vettore o matrice), valore iniziale e ruolo (input, output, tutti e due o di lavoro); per una procedura o una funzione, sopra, i suoi parametri.
- **Il flowchart**, a destra: i blocchi assegnazione, lettura, scrittura, «se», «mentre», «ripeti», «per», «per ogni», procedura e commento, che si inseriscono dai «+», si scrivono nei loro campi, si spostano trascinandoli, si copiano e si cancellano; Annulla e Ripeti; tutto anche da tastiera. Gli errori e gli avvisi si vedono sul blocco e nella riga di stato in basso, ognuno con una spiegazione e un suggerimento.
- **Procedure e funzioni**, con i parametri per valore, per riferimento e di uscita, un risultato anche stringa o vettore, la ricorsione e le librerie da cui importarle.
- **L'esecuzione**: tutto insieme (F5), un'azione alla volta (F10), dentro e fuori dalle chiamate (F11, Maiusc+F11) o animata a tre velocità, con i punti di interruzione (F9). Il blocco corrente è evidenziato, i valori si scrivono nella console, e la tabella di traccia mostra a ogni azione il valore di ogni dato; la tabella si esporta in un file CSV per un foglio di calcolo. Col puntatore del mouse sul nome di un dato, o con Maiusc+F9, se ne vedono tipo e valore.
- **I casi d'uso**: gli input e l'output atteso di una prova, scritti in una scheda accanto ai dati anche prima delle regole, o salvati da un'esecuzione, per il programma e per ogni procedura o funzione; si eseguono uno alla volta o tutti insieme, e l'esito dice «raggiunto» o «non raggiunto», con le differenze.
- **Il codice generato**: con «Genera», accanto al flowchart, lo stesso algoritmo in pseudocodice (in italiano o in inglese, come l'interfaccia), in Python e in C, e, se li si accende, in TypeScript e in «Accademico», con la riga corrente evidenziata durante l'esecuzione; «Copia» e «Salva…». Sui casi d'uso con cui AlgoDesign stesso è stato provato, il Python, il C, il TypeScript e il JavaScript generati danno lo stesso risultato dell'esecuzione in AlgoDesign, tranne quelli che provano i calcoli che il codice generato non controlla e il limite delle azioni (si veda «Da sapere»).
- **La stampa e le immagini**: il progetto su carta o in un PDF, e il flowchart come immagine PNG o SVG.
- **Il menu «Aiuto»**: la guida per lo studente, i dodici esempi forniti, in gruppi (si aprono, se ne aggiungono, se ne eliminano), e le informazioni su AlgoDesign, con la versione e le licenze.
- **Le Impostazioni**: lingua (italiano o inglese, anche dalla riga di stato), la ricerca e la finestra della guida, colori del flowchart e colori dei blocchi, disegno dei cicli, modo di scrivere blocchi e dati, casi d'uso dalle esecuzioni, limiti e pila delle chiamate dei progetti nuovi, cartelle delle librerie e degli esempi, aspetto della barra, tabella di traccia, console e linguaggi del codice generato. Le scelte restano dopo il riavvio, nella cartella `data` accanto al programma.

## Che cosa manca

- Le versioni per Linux e per macOS.
- Compilare ed eseguire il codice generato dentro AlgoDesign: il codice si copia o si salva e si prova a parte, con un compilatore C, con Python o con Node.js.

## Da sapere

- **I progetti delle versioni precedenti** si aprono con questa senza cambiamenti. **Non vale il contrario**: ogni progetto salvato con questa versione, anche senza record né matrici, non si apre più con le versioni precedenti.
- **Il codice generato è semplice, da leggere**: non controlla i calcoli che il C lascia senza una regola (un intero che esce dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto prima di avere un valore), né un reale che diventa infinito o non è un numero. Un commento in testa al programma Python, C e TypeScript lo dice; AlgoDesign, invece, ferma l'esecuzione su ognuno di questi errori e indica il blocco. Su questi calcoli il Python, il C e il TypeScript generati possono dare risultati diversi fra loro.
- **Un ciclo che non finisce**: AlgoDesign ferma l'esecuzione dopo un milione di azioni; il Python, il C e il TypeScript generati non hanno questo limite, e il programma va fermato a mano.
- **Il Python generato** vuole Python 3.11 o successivo; il C generato si compila con un compilatore C11; il TypeScript generato si esegue con Node.js 24.
- **La pagina di prova** è provata in Chromium, il motore di Chrome e di Edge. In Firefox e in Safari non è provata: la riga di un errore può uscire «?», col motivo giusto.
- **Lo strumento a riga di comando** scrive solo i file che gli si dicono, e i suoi messaggi sono in italiano.
- **L'avviso di Windows al primo avvio**: AlgoDesign e lo strumento a riga di comando non sono firmati digitalmente; come procedere è nel `LEGGIMI.md`.
- **WebView2**: senza il componente di Windows che disegna la finestra, AlgoDesign non si apre; come controllare se c'è e dove scaricarlo è nel `LEGGIMI.md`.
- **Il file CSV della tabella di traccia**: una cella che comincia come una formula (`=`, `+`, `-`, `@`) si scrive preceduta da un apostrofo, che Excel e LibreOffice Calc mostrano (il `LEGGIMI.md` lo spiega).
- **La versione portabile non scrive nulla di suo nel profilo dell'utente né nel registro di Windows**: preferenze ed esempi stanno nella cartella `data` accanto al programma, e i file che salvi stanno dove li metti tu. Windows, invece, annota da sé nel registro dell'utente gli ultimi file e cartelle delle sue finestre per aprire e salvare, il percorso del programma avviato, l'ultimo uso del componente WebView2 e, con la stampa, una firma delle sue impostazioni (il `LEGGIMI.md` lo spiega).
