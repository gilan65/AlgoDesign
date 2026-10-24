# AlgoDesign {{versione}}: note di rilascio

Versione del {{data}}. È la **quarta versione di prova** (ALPHA 4) di AlgoDesign, per Windows 10 e 11 a 64 bit, nella forma portabile: si estrae lo zip e si avvia `AlgoDesign.exe`, senza installarlo. Come si avvia, i requisiti e l'avviso di Windows al primo avvio sono nel file `LEGGIMI.md`; come si usa è nella guida per lo studente, `GUIDA-PER-LO-STUDENTE.md`.

Una versione di prova serve a provare il programma in aula e a raccogliere osservazioni: alcune funzioni mancano ancora, e altre possono cambiare nelle prossime versioni.

## Che cosa c'è di nuovo

- **La ricorsione.** Una procedura o una funzione può chiamare sé stessa, direttamente o passando per altre. Passo passo ogni chiamata in corso è un livello: «Dove sei» regge anche centinaia di chiamate (i primi livelli, gli ultimi e l'elenco degli altri), la tabella di traccia mostra i dati della chiamata più profonda, e col puntatore del mouse si legge il valore di un dato al livello scelto in «Dove sei». La riga di stato e l'elenco delle procedure e funzioni dicono quali richiamano sé stesse. Una ricorsione che non finisce si ferma alla cinquecentunesima chiamata in corso, o quando i dati delle chiamate non stanno più nella pila delle chiamate (256 KB); il Python e il C generati si fermano nello stesso punto. La guida per lo studente ha un capitolo nuovo, il §9.
- **La pausa a metà di un blocco.** Dopo il ritorno da una funzione chiamata dentro un'espressione, l'esecuzione si ferma sulla ripresa del blocco, col segno «↩» e un avviso col valore restituito: Passo su quel blocco si ferma due volte. L'Animata entra nelle chiamate, come Entra.
- **Due esempi nuovi**, nel gruppo «Funzioni e procedure»: «Fattoriale con la ricorsione» e «Sequenza di Fibonacci con la ricorsione». Gli esempi forniti sono undici.
- **Le librerie.** Le procedure e le funzioni si importano da un altro progetto, con «Importa procedure e funzioni…» del menu Progetto: entrano con quelle che chiamano e con le costanti comuni che usano; un nome che c'è già si rinomina, si sostituisce o si lascia; Annulla toglie tutto. Un progetto segnato «È una libreria» entra nella cartella delle librerie, che si sceglie nelle Impostazioni, scheda «Percorsi». La guida ha un capitolo nuovo, il §10.
- **I parametri di uscita** (*out*): il dato solo esce, come in una procedura che legge un valore e lo consegna. Quando un *rif* riceve un dato senza valore che la procedura non usa, la riga di stato propone «Sostituisci rif con out».
- **Una funzione restituisce anche una stringa o un vettore**, che si usa dovunque va una stringa o il nome di un vettore, anche con l'indice (`doppi(voti)[1]`). Col puntatore del mouse sul nome di una funzione chiamata si legge il valore che ha restituito.
- **La copia di un vettore col suo nome** (`altri ← voti`) si disegna in un riquadro «copia elemento per elemento» e si esegue un elemento alla volta; nelle Impostazioni anche espansa, col «mentre» che copia.
- **La domanda nel blocco di Lettura**: una casella delle Impostazioni disegna la Scrittura che fa la domanda e la Lettura come un blocco solo.
- **Più blocchi insieme**: Maiusc+clic e Maiusc+↑ o Maiusc+↓ scelgono blocchi vicini, che si spostano, si copiano, si tagliano e si eliminano in un passo solo.
- **Parentesi e virgolette che si chiudono da sé** mentre scrivi (si spegne nelle Impostazioni); l'elenco dei valori di un vettore fra graffe.
- **La causa precisa di un errore**: la frase sotto i campi e nella riga di stato dice che cosa c'è di sbagliato, come «Una parentesi tonda è aperta e non è chiusa.», e «Spiegazione» il suggerimento per quella causa.
- **I colori dei blocchi**: nelle Impostazioni, scheda «Aspetto», ogni genere di blocco ha il colore che scegli. Anche i colori di partenza dei «Tenui» e del «Contrasto forte» sono nuovi: il flowchart cambia aspetto anche senza toccare le Impostazioni.
- **I casi d'uso**: Annulla riporta la spunta di un caso eliminato o rinominato; i valori delle letture che una procedura chiamata fa nei suoi dati di lavoro; quando una funzione diventa una procedura, le righe «→ …» escono dall'output atteso.
- **Correzioni**: un'espressione con molte somme annidate non rallenta più la finestra; eseguita da sola, una funzione in un progetto con una costante comune evidenzia «Inizio» alla prima azione.

## Che cosa c'è

- **Il progetto**: un solo file `.algo` con i dati, le regole (il flowchart del programma principale e di ogni procedura o funzione), i casi d'uso, il nome, l'autore, la descrizione e le note. Si crea, si apre, si salva; prima di perdere modifiche non salvate AlgoDesign chiede.
- **La vista dei dati**, a sinistra: costanti e variabili con nome, tipo (intero, reale, carattere, stringa, booleano), forma (semplice o vettore), valore iniziale e ruolo (input, output, tutti e due o di lavoro); per una procedura o una funzione, sopra, i suoi parametri.
- **Il flowchart**, a destra: i blocchi assegnazione, lettura, scrittura, «se», «mentre», «ripeti», «per», «per ogni», procedura e commento, che si inseriscono dai «+», si scrivono nei loro campi, si spostano trascinandoli, si copiano e si cancellano; Annulla e Ripeti; tutto anche da tastiera. Gli errori e gli avvisi si vedono sul blocco e nella riga di stato in basso, ognuno con una spiegazione e un suggerimento.
- **L'esecuzione**: tutto insieme (F5), un'azione alla volta (F10), dentro e fuori dalle chiamate (F11, Maiusc+F11) o animata a tre velocità, con i punti di interruzione (F9). Il blocco corrente è evidenziato, i valori si scrivono nella console, e la tabella di traccia mostra a ogni azione il valore di ogni dato; la tabella si esporta in un file CSV per un foglio di calcolo. Col puntatore del mouse sul nome di un dato se ne vedono tipo e valore.
- **I casi d'uso**: gli input e l'output atteso di una prova, scritti in una scheda accanto ai dati anche prima delle regole, per il programma e per ogni procedura o funzione; si eseguono uno alla volta o tutti insieme, e l'esito dice «raggiunto» o «non raggiunto», con le differenze.
- **Il codice generato**: con «Genera», accanto al flowchart, lo stesso algoritmo in pseudocodice (in italiano o in inglese, come l'interfaccia), in Python e in C, con la riga corrente evidenziata durante l'esecuzione; «Copia» e «Salva…». Sui casi d'uso con cui AlgoDesign stesso è stato provato, il Python e il C generati danno lo stesso risultato dell'esecuzione in AlgoDesign, tranne quelli che provano i calcoli che il codice generato non controlla e il limite delle azioni (si veda «Da sapere»).
- **Il menu «Aiuto»**: gli undici esempi forniti, in gruppi (si aprono, se ne aggiungono, se ne eliminano), e le informazioni su AlgoDesign, con la versione e le licenze.
- **Le Impostazioni**: lingua (italiano o inglese), colori del flowchart e colori dei blocchi, disegno dei cicli, modo di scrivere blocchi e dati, limiti, cartelle delle librerie e degli esempi, aspetto della barra, tabella di traccia e console. Le scelte restano dopo il riavvio, nella cartella `data` accanto al programma.

## Che cosa manca

- Le versioni per Linux e per macOS.
- Compilare ed eseguire il codice generato dentro AlgoDesign: il codice si copia o si salva, e si prova con un compilatore C o con Python a parte.

## Da sapere

- **I progetti delle versioni precedenti** si aprono con questa senza cambiamenti, tranne quelli con blocchi annidati oltre 50 livelli (più sotto). Un progetto che usa ciò che questa versione aggiunge (la ricorsione, i parametri di uscita, una funzione che restituisce una stringa o un vettore) può non aprirsi con le versioni precedenti.
- **Gli esempi in una cartella che c'era già**: se la cartella degli esempi è quella di una versione precedente (per esempio una cartella condivisa scelta nelle Impostazioni), gli esempi forniti si spostano da soli nei loro gruppi e i tuoi file restano dove sono; i due esempi nuovi ci arrivano con «Ripristina gli esempi forniti» (menu «Aiuto», «Esempi…»), che aggiunge i forniti che mancano e non tocca gli altri file.
- **I blocchi annidati** uno dentro l'altro arrivano al più a 50 livelli (prima 100), perché il Python generato li possa sempre eseguire.
- **Il codice generato è semplice, da leggere**: non controlla i calcoli che il C lascia senza una regola (un intero che esce dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto prima di avere un valore), né un reale che diventa infinito o non è un numero. Un commento in testa al programma Python e C lo dice; AlgoDesign, invece, ferma l'esecuzione su ognuno di questi errori e indica il blocco. Su questi calcoli il Python e il C generati possono dare risultati diversi fra loro.
- **Un ciclo che non finisce**: AlgoDesign ferma l'esecuzione dopo un milione di azioni; il Python e il C generati non hanno questo limite, e il programma va fermato a mano.
- **Il Python generato** vuole Python 3.9 o successivo; il C generato si compila con un compilatore C11.
- **L'avviso di Windows al primo avvio**: AlgoDesign non è firmato digitalmente; come procedere è nel `LEGGIMI.md`.
- **La versione portabile non scrive nulla di suo nel profilo dell'utente né nel registro di Windows**: preferenze ed esempi stanno nella cartella `data` accanto al programma, e i file che salvi stanno dove li metti tu. Windows, invece, annota da sé nel registro dell'utente gli ultimi file e cartelle delle sue finestre per aprire e salvare, il percorso del programma avviato e l'ultimo uso del componente WebView2 (il `LEGGIMI.md` lo spiega).
