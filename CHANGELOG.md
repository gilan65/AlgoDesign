# AlgoDesign: registro delle modifiche

Le novità e le correzioni di ogni versione, dalla più recente. Il dettaglio di una versione è nelle sue note di rilascio (`NOTE-DI-RILASCIO.md`); come si usa AlgoDesign è nella guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`).

## 0.4.0-alpha.4, 25 ottobre 2026

Quarta versione di prova.

### Novità

- **La ricorsione**: una procedura o una funzione chiama sé stessa, direttamente o passando per altre. «Dove sei», la tabella di traccia e il valore dei dati seguono ogni livello; una ricorsione che non finisce si ferma alla cinquecentunesima chiamata in corso, o quando i dati delle chiamate non stanno più nella pila, anche nel Python e nel C generati.
- **La pausa a metà di un blocco**, dopo il ritorno da una funzione chiamata in un'espressione; l'Animata entra nelle chiamate.
- **Le librerie**: le procedure e le funzioni si importano da un altro progetto, con quelle che chiamano e le costanti comuni che usano; la cartella delle librerie si sceglie nelle Impostazioni.
- **I parametri di uscita** (*out*), e la correzione «Sostituisci rif con out».
- **Una funzione restituisce anche una stringa o un vettore.**
- **La copia di un vettore col suo nome**, elemento per elemento.
- **La domanda nel blocco di Lettura.**
- **Più blocchi insieme**, con Maiusc+clic e Maiusc+↑ o Maiusc+↓.
- **Parentesi e virgolette che si chiudono da sé**, e l'elenco dei valori di un vettore fra graffe.
- **La causa precisa di un errore**, sotto i campi e nella riga di stato.
- **I colori dei blocchi** nelle Impostazioni, e colori di partenza nuovi per il flowchart.
- **Due esempi nuovi**: «Fattoriale con la ricorsione» e «Sequenza di Fibonacci con la ricorsione»; gli esempi forniti sono undici.
- **I casi d'uso**: i valori delle letture che una procedura chiamata fa nei suoi dati di lavoro; quando una funzione diventa una procedura, le righe «→ …» escono dall'output atteso.

### Correzioni

- Un'espressione con molte somme annidate non rallenta più la finestra.
- Eseguita da sola, una funzione in un progetto con una costante comune evidenzia «Inizio» alla prima azione.
- Annulla riporta la spunta di un caso d'uso eliminato o rinominato.
- I blocchi annidati arrivano al più a 50 livelli (prima 100), perché il Python generato li possa sempre eseguire.

## 0.3.0-alpha.3, 24 ottobre 2026

Terza versione di prova, per Windows, macOS e Linux.

### Novità

- **Le procedure e le funzioni**, con i parametri per valore e per riferimento. Ognuna ha la sua scheda, coi suoi dati e i suoi casi d'uso; si creano, si rinominano, si duplicano e si eliminano, e Annulla riporta tutto com'era.
- **L'esecuzione entra ed esce dalle chiamate**: **Entra** (F11) ed **Esci** (Maiusc+F11), «Dove sei» con le chiamate in corso, e la tabella di traccia con le colonne di ogni procedura o funzione in un gruppo.
- **Una procedura o una funzione si prova da sola**, coi suoi parametri e coi suoi casi d'uso.
- **Il codice generato** traduce le procedure e le funzioni in pseudocodice, Python e C.
- **Le costanti globali**, che si usano in ogni procedura e funzione.
- **Un avviso nuovo**: il valore intero che diventa reale passando a un parametro reale, o nel risultato di una funzione reale.
- **Gli esempi a gruppi**, con la ricerca; gli esempi forniti sono nove, tre dei quali con le procedure e le funzioni.

### Correzioni

- Tutte quelle della 0.2.1, anche per macOS e Linux: i messaggi in una frase con «Spiegazione», il ruolo «di lavoro».
- Rinominare un dato col nome di un altro dato non mescola più i due nelle regole, e la rinomina cambia il nome anche nei blocchi che hanno un errore di scrittura.
- Svuotando la lunghezza massima di una stringa, le opzioni avanzate del dato restano aperte.
- Nell'interfaccia in inglese due pulsanti della barra hanno un nome più corto, «Code» e «Clear points», perché la barra stia su una riga.

## 0.2.1-alpha.2, 20 ottobre 2026

Versione di correzione della seconda, solo per Windows.

### Correzioni

- **I messaggi in una frase.** Ogni errore e ogni avviso si legge in una frase breve; accanto, «Spiegazione» apre le cause possibili e il suggerimento, e un secondo clic le richiude.
- **Il ruolo «di lavoro»** si sceglie col suo nome, al posto di «nessuno», ed è la scelta di partenza di un dato nuovo; una costante non ha la scelta del ruolo.
- **L'avviso del dato letto o mostrato col ruolo «di lavoro»** chiede se il suo ruolo non sia un altro, invece di dire che il dato non ha un ruolo.

## 0.2.0-alpha.2, 18 ottobre 2026

Seconda versione di prova, per Windows, macOS e Linux.

### Novità

- **I cicli «per» e «per ogni»**, disegnati come un riquadro tratteggiato col «mentre» che fa la stessa cosa (nelle Impostazioni anche chiusi), eseguiti passo passo su ogni loro parte e tradotti nei tre linguaggi.
- **Due esempi nuovi**: «Parola al contrario» e «Media dei voti coi cicli per».
- **Due avvisi nuovi sui dati**: il dato che nessun blocco usa, e il dato che riceve un valore che nessun blocco legge.
- **Il menu di un blocco** col tasto destro (o il tasto Menu, o Maiusc+F10): Taglia, Copia ed Elimina.
- **Le colonne della tabella di traccia** si allargano, si stringono e si spostano; il CSV «uguale alla tabella» segue l'ordine che si vede.
- **Gli errori di un blocco o di un dato appena aggiunto** compaiono quando lo si conferma; il pulsante **«?»** accanto a «Conferma» dice che cosa scrivere nei campi.

### Correzioni

- Un dato usato solo come indice in una scrittura (la `i` di `parola[i]`) non conta più come un dato mostrato, nell'avviso sul ruolo dei dati.
- Il riquadro col valore di un dato, fermato con un clic, resta dentro la finestra quando questa cambia misura.
- Altre correzioni minori nella scheda dei casi d'uso.

## 0.1.0-alpha.1, 13 ottobre 2026

Prima versione di prova, per Windows, macOS e Linux.

### Novità

- **Il progetto** in un solo file `.algo`, coi dati, le regole (il flowchart), i casi d'uso e le informazioni sul progetto.
- **La vista dei dati** e **il flowchart**, con i blocchi assegnazione, lettura, scrittura, «se», «mentre», «ripeti» e commento; gli errori e gli avvisi si vedono mentre si scrive.
- **L'esecuzione** tutta insieme, un'azione alla volta o animata, con i punti di interruzione, la console e la tabella di traccia, che si esporta in CSV.
- **I casi d'uso**, che si eseguono uno alla volta o tutti insieme, con l'esito e le differenze.
- **Il codice generato** in pseudocodice, Python e C.
- **Gli esempi forniti**, le informazioni su AlgoDesign con le licenze, e le Impostazioni.
