# AlgoDesign: guida per lo studente

Questa guida spiega come si usa AlgoDesign per progettare un algoritmo, provarlo e vederlo tradotto in codice. Come si scarica e si avvia il programma è nel file `LEGGIMI.md`.

## 1. L'idea: prima i dati, poi le regole

In AlgoDesign un algoritmo si progetta in due tempi, in due viste affiancate:

- nella **vista dei dati**, a sinistra, si dice **che cosa** serve: i dati, ognuno con un nome, un tipo e un ruolo (un dato di input, uno di output, uno di lavoro);
- nel **flowchart**, a destra, si dice **come** si risolve il problema: le regole, cioè i blocchi che leggono, calcolano e scrivono.

Le parole che la guida usa sono queste: un **dato** è una costante o una variabile; una **regola** è un blocco del flowchart; un'**azione** è un passo dell'esecuzione (una regola eseguita, o un valore iniziale assegnato).

## 2. La finestra

- **La barra**, in alto, con i comandi in gruppi, in ordine di lavoro: **Progetto** (un menu con Nuovo, Apri, Salva, Salva con nome, Salva come libreria…, Proprietà, Aggiungi un record (§5), Nuova procedura o funzione…, Procedure e funzioni…, Importa procedure e funzioni…, Esporta il flowchart…, Esporta la tabella…, Stampa… (§13), Chiudi, che chiude il progetto e riporta a uno nuovo senza nome, ed Esci, che chiude AlgoDesign; fuori dal menu ci sono anche i pulsanti Funzione e Salva), **Modifica** (Annulla, Ripeti e i comandi del blocco scelto), **Esecuzione** (Esegui, Passo, Entra ed Esci quando il progetto ha procedure o funzioni, Animata, Ferma, Interruzione, Togli i punti), **Viste** (Dati, Tabella, Genera), e a destra **Impostazioni** e **Aiuto**. Col puntatore del mouse su un pulsante se ne leggono il nome e il tasto.
- **La vista dei dati**, a sinistra, con due schede: «Dati» e «Casi d'uso». Il pulsante «Dati» la chiude e la riapre; il suo bordo destro si trascina per allargarla.
- **Il flowchart**, a destra, con lo zoom nella riga in fondo (meno, la percentuale che con un clic torna al 100%, più, «Adatta alla finestra»). Quando il progetto ha procedure o funzioni, sopra il flowchart c'è una scheda per ciascuna (§9).
- **La riga di stato**, in fondo: il nome del file, «modificato» se ci sono modifiche non salvate, gli errori e gli avvisi del progetto (un clic su «Mostra l'elenco» li elenca, e un clic su una voce porta al blocco o al dato), lo stato dell'esecuzione e, all'estrema destra, la lingua dell'interfaccia: «ITA» o «ENG», e un clic apre il menu con le due lingue (la stessa scelta delle Impostazioni).
- **La guida per lo studente**: dal menu **Aiuto**, in una finestra a destra che resta aperta mentre si lavora (§12).

Ogni comando si dà anche da tastiera: Tab porta da un elemento all'altro, Invio apre e conferma, Esc rinuncia.

## 3. Il primo progetto, passo per passo

Come esempio, un programma che legge un numero intero e scrive se è pari o dispari.

### Il progetto

Dal menu **Progetto** scegli **Nuovo** (Ctrl+N). Scrivi il nome del progetto, che è obbligatorio, e, se vuoi, l'autore, una descrizione e delle note; conferma con **Crea**. Le stesse informazioni si cambiano dopo con **Proprietà**, che ha anche tre opzioni che cambiano il risultato: quante cifre decimali ha un numero reale scritto (2 se non si dice altro), il carattere che riempie un vettore di caratteri e i posti della pila delle chiamate (§10).

Salva il progetto con **Salva con nome** (Ctrl+Maiusc+S): il file ha l'estensione `.algo`. Da lì in poi **Salva** (Ctrl+S) scrive lo stesso file. Il file prende il nome del progetto; se quel nome ha caratteri che un file non può avere, o è un nome che Windows riserva (come `CON` o `NUL`), prima della finestra di Windows AlgoDesign lo dice e propone un altro nome, che si può cambiare: **Quali nomi si possono usare?** dice le regole.

### I dati

Nella scheda «Dati» premi **Aggiungi un dato** e compila i campi:

- **Nome**: lettere senza accento, cifre e trattino basso, cominciando con una lettera (`numero`, `eta`, non `età`), al massimo 63 caratteri; gli spazi prima e dopo il nome si tolgono da soli, uno spazio dentro il nome è un errore; non può essere una parola riservata di un linguaggio del codice generato (`if`, `while`, `int`, `return`, `new`…) né il nome di un operatore scritto a parole (`mod`, `lunghezza`…): così il nome passa identico nel codice generato;
- **Tipo**: intero, reale, carattere, stringa o booleano, oppure un record del progetto (§5);
- **Forma**: semplice, vettore con il numero degli elementi (al più 1000), oppure matrice con le righe e le colonne (§5);
- **Natura**: variabile o costante (una costante ha sempre un valore);
- **Valore iniziale**: facoltativo per una variabile; per un vettore, l'elenco dei valori fra graffe, `{7, 8, 6}` (scritto senza graffe va bene lo stesso);
- **Ruolo**: input, output, input e output, oppure di lavoro, la scelta di partenza. Una costante non ha un ruolo.

Per l'esempio basta un dato: `numero`, intero, di input. Un dato si riapre con il doppio clic o con Invio sulla sua riga; il menu della riga lo duplica, lo sposta su o giù e lo elimina. Il **«?»** accanto a «Conferma» dice che cosa scrivere nei campi.

Un dato che nessun blocco usa, o che riceve un valore che nessun blocco legge, ha un avviso: di solito è un dato dimenticato, o un calcolo che non serve.

Che cosa vuol dire ciascun tipo:

| Tipo | Che cosa contiene | Esempi di valori |
|---|---|---|
| intero | un numero intero da −2 147 483 648 a 2 147 483 647 | `0`, `-15`, `2026` |
| reale | un numero con la virgola, scritta col punto | `3.14`, `-0.5`, `2.0` |
| carattere | un carattere solo, anche una lettera accentata | `'a'`, `'è'`, `' '` |
| stringa | un testo, al più 255 caratteri se non si dice altro | `"ciao"`, `"perché"` |
| booleano | vero o falso | `true`, `false` |

### Le regole

Nel flowchart, fra «Inizio» e «Fine», c'è un **«+»**: col puntatore del mouse sul flowchart compare in ogni punto dove si può inserire un blocco. Un clic sul «+» apre l'elenco dei blocchi:

| Blocco | Che cosa fa | Nel campo si scrive |
|---|---|---|
| Assegnazione | calcola un valore e lo dà a un dato | la destinazione (`somma`) e il valore (`somma + voto`) |
| Lettura | aspetta un valore scritto nella console e lo dà a un dato | il dato da leggere |
| Scrittura | scrive nella console uno o più valori | i valori, uno per campo, e «Va a capo» se dopo si va a capo |
| Se | sceglie fra due strade | la condizione |
| Mentre | ripete il suo corpo finché la condizione è vera, controllandola prima di ogni giro | la condizione |
| Ripeti | ripete il suo corpo finché la condizione è vera, controllandola dopo ogni giro (quindi almeno una volta) | la condizione |
| Per | ripete il suo corpo contando: un dato intero, il contatore, va dal primo valore all'ultimo, un passo alla volta | il contatore (`i`), il primo e l'ultimo valore (`1` e `n`), e il passo se non è 1 |
| Per ogni | ripete il suo corpo una volta per ogni elemento di un vettore, o per ogni carattere di una stringa | il dato che riceve l'elemento (`voto`) e il vettore o la stringa (`voti`) |
| Procedura | chiama una procedura del progetto: la procedura compie il suo lavoro, poi si torna qui | la procedura, scelta dall'elenco, e un argomento per ogni suo parametro |
| Commento | una nota per chi legge; non si esegue | il testo |

Una Scrittura con più valori ha un campo per valore (**Aggiungi un valore** ne apre un altro): per scrivere `Risultato = 42`, con `num` che vale 42, il primo campo è `"Risultato = "` e il secondo `num`. I valori si scrivono uno dopo l'altro così come sono, senza spazi in più: lo spazio prima di 42 c'è perché sta dentro le virgolette. Nel flowchart il blocco si legge `scrivi "Risultato = ", num ↵`, dove `↵` vuol dire che dopo si va a capo.

Spesso una Scrittura subito prima di una Lettura è la sua domanda: `scrivi "Voto: "`, poi `leggi voto`. Nelle Impostazioni, scheda «Aspetto», la casella **Mostra la domanda nel blocco di Lettura** (spenta di partenza) disegna le due come un blocco solo, su due righe: sopra la domanda (`"Voto:"`; più valori separati da una virgola, e `↵` se va a capo), sotto `leggi voto`. Succede solo quando la console resta la stessa, cioè quando la Scrittura va a capo oppure finisce con uno spazio (in fondo all'ultimo testo, `"Voto: "`, o come valore a sé, `" "`). Le altre Scritture restano blocchi a sé. Nei campi della Lettura, sopra la Destinazione, ci sono allora un campo per ogni valore della domanda (**Domanda 1**, **Domanda 2**…, ognuno con la sua ×), **Aggiungi una domanda** e **Va a capo**. Senza «Va a capo» il valore si scrive sulla stessa riga, dopo uno spazio che AlgoDesign mette da sé. Il blocco si sposta, si copia, si elimina e si annulla tutto insieme, e fra la domanda e la lettura non c'è un «+»: per inserire un blocco fra le due si spegne la casella. Passo passo l'esecuzione si ferma prima sulla domanda e poi sulla lettura, sullo stesso blocco, con la riga corrente cerchiata. Il file e il codice generato non cambiano: è solo un altro modo di disegnare gli stessi due blocchi.

Nel blocco «se» il ramo **Vero** è a destra e il **Falso** a sinistra. Nei cicli, Vero vuol dire «un altro giro». I cicli «per» e «per ogni» hanno il loro capitolo, il §4; le procedure e le funzioni il §9.

Per l'esempio:

1. inserisci una **Lettura** del dato `numero`;
2. sotto, un **Se** con la condizione `numero mod 2 == 0`;
3. nel ramo Vero una **Scrittura** con il valore `"pari"` e «Va a capo»; nel ramo Falso una **Scrittura** con `"dispari"` e «Va a capo».

Un blocco si apre con il doppio clic o con Invio; **Invio** conferma, **Esc** annulla. Il **«?»** accanto a «Conferma» dice che cosa scrivere nei campi di quel blocco. Se ciò che scrivi ha un errore, sotto i campi compare l'errore in una frase, mentre scrivi: la frase dice la causa precisa quando AlgoDesign la riconosce, come «Una parentesi tonda è aperta e non è chiusa.» o «Nel nome c'è uno spazio.», e vale per le espressioni, i nomi, i dati, gli argomenti e i cicli; la stessa frase è nella riga di stato. **Spiegazione** apre il suggerimento per quella causa e, quando la causa non si sa, le cause possibili. In un blocco appena inserito, invece, l'errore compare quando confermi: i campi restano aperti per correggerlo, e una seconda conferma tiene il blocco così com'è, segnato nel flowchart. Un blocco si sposta trascinandolo su un altro «+» (o da tastiera con Spazio), si copia, si taglia e si incolla su un «+», si cancella con Canc. Il tasto destro su un blocco (o, da tastiera, il tasto Menu o Maiusc+F10) apre il suo menu: Taglia, Copia, Elimina. **Annulla** (Ctrl+Z) e **Ripeti** (Ctrl+Y) tornano indietro e avanti di una modifica.

**Più blocchi insieme.** Maiusc+clic su un altro blocco sceglie anche i blocchi che stanno fra i due; da tastiera, Maiusc+↑ e Maiusc+↓ allargano la scelta di un blocco alla volta. Si scelgono blocchi vicini, nella stessa sequenza: un blocco dentro un ciclo o un «se» porta la scelta al ciclo o al «se» che lo contiene, con tutto il suo contenuto. Ogni blocco scelto ha il bordo, e un comando vale per tutti in un passo solo: si trascinano su un «+» (da tastiera Spazio, poi Tab fino a un «+» e Invio), si tagliano, si copiano, si eliminano con Canc, e Annulla li riporta tutti. Il tasto destro apre il menu dei blocchi scelti. Nelle Impostazioni (§14) la casella «Con un riquadro intorno» li racchiude anche in un riquadro tratteggiato.

### Come si scrivono le espressioni

- I numeri si scrivono col punto: `3.5`; i caratteri fra apici, `'a'`; le stringhe fra virgolette, `"ciao"`.
- Le operazioni: `+`, `-`, `*`, `/`, e `mod` per il resto della divisione fra interi. Fra due interi `/` è la divisione intera (`7 / 2` vale `3`), come in C; per avere `3.5` uno dei due deve essere reale (`converti_a_reale 7 / 2`).
- `+` fra due stringhe, o fra una stringa e un carattere, le unisce: letterali, dati ed elementi, come `"Ciao, " + nome` o `nome + " " + cognome`. Due caratteri invece non si uniscono (in C sono due numeri): per farne una stringa si parte da una stringa, `"" + c1 + c2`. Un numero non si unisce a una stringa: per scriverlo accanto a un testo si mettono due valori nella stessa Scrittura (`"Media: "` e `media`). Se il risultato supera la lunghezza massima del dato che lo riceve, il programma si ferma.
- I confronti: `==` (uguale), `!=` (diverso), `<`, `<=`, `>`, `>=`. Un solo `=` è un errore: per dare un valore a un dato c'è l'assegnazione.
- Le condizioni si combinano con `and`, `or`, `not`, scritti così anche in italiano.
- Le operazioni a parola: `converti_a_intero`, `converti_a_reale`, `converti_a_carattere`, `converti_a_stringa`, `converti_a_vettore`, `lunghezza`, `valore_assoluto`, `radice_quadrata`, `x elevato_a y`, `arrotonda`, `per_difetto`, `per_eccesso`, `parte_intera`, e la costante `pi_greco`. Nell'interfaccia in inglese si scrivono in inglese (`to_integer`, `length`, …).
- Un elemento di un vettore si scrive col suo indice fra parentesi quadre, a partire da 0: `voti[0]`, `voti[i]`.
- Mentre scrivi, una parentesi tonda o quadra, una virgoletta o un apice si chiudono da sé, col cursore in mezzo: succede in fondo al testo, prima di uno spazio, di una chiusura o di una virgola, non davanti a una parola. Scrivendo la chiusura la si scavalca, ⌫ subito dopo l'apertura toglie tutte e due, e un testo selezionato viene racchiuso. Nell'elenco di un vettore si chiude da sé anche la graffa. Nelle Impostazioni, scheda «Modifica», la casella «Si chiudono da sé mentre scrivi» lo spegne.

## 4. I cicli «per» e «per ogni»

Molti cicli contano: «per i che va da 1 a n», «per ogni voto della classe». Con il «mentre» un ciclo così chiede tre blocchi intorno al corpo: il valore di partenza del contatore, la condizione, l'aumento alla fine del giro. I cicli **«per»** e **«per ogni»** lo scrivono in un blocco solo, e nel flowchart mostrano dentro di sé il «mentre» che fa la stessa cosa: non sono un modo nuovo di ripetere, ma un modo breve di scrivere un ciclo che si sa già fare.

### Il ciclo «per»

Nei campi del blocco:

- **Contatore**: un dato intero, variabile (`i`);
- **Da**: il primo valore (`1`, o un'espressione come `lunghezza parola - 1`);
- **A**: l'ultimo valore (`n`);
- **Passo**: di quanto cambia il contatore a ogni giro, un numero intero diverso da 0; vuoto vuol dire 1, e `-1` conta all'indietro.

Nel flowchart il «per» è un **riquadro tratteggiato** con l'intestazione sul bordo («per i da 1 a n», «per i da 3 a 1 passo -1»: il passo 1 non si scrive) e dentro, una sotto l'altra, le parti del «mentre» equivalente:

1. la partenza, `i ← 1`;
2. il rombo del controllo, `i <= n` (con un passo negativo `i >= 1`): Vero vuol dire un altro giro;
3. il corpo, coi blocchi del ciclo;
4. l'aumento, `i ← i + 1`, e si torna al rombo.

Tre regole, le stesse del «mentre» che il riquadro mostra:

- **il controllo si rifà a ogni giro**, con i valori di quel momento: se il corpo cambia `n`, il giro dopo vede il valore nuovo;
- **il contatore non si cambia nel corpo**: un'assegnazione o una lettura del contatore, o un altro «per» con lo stesso contatore, sono un errore, perché il conto lo tiene il ciclo;
- **dopo il ciclo il contatore vale il primo valore che rende falso il controllo**: dopo «per i da 1 a 5», `i` vale 6 (se quel valore va oltre gli interi, l'esecuzione si ferma con un errore sul «per»).

I campi del ciclo si aprono dall'intestazione, con il doppio clic o con Invio, e anche con un doppio clic sulla partenza, sul rombo o sull'aumento. I blocchi del corpo si inseriscono dai «+» dentro il riquadro.

### Il ciclo «per ogni»

Nei campi del blocco:

- **Elemento**: il dato che a ogni giro riceve un elemento, dello stesso tipo degli elementi (`voto` per un vettore di interi, un carattere `c` per una stringa);
- **Vettore o stringa**: il dato da percorrere (`voti`, `parola`).

Anche il «per ogni» è un riquadro tratteggiato, con l'intestazione «per ogni c in parola», e dentro il «mentre» che fa lo stesso. Il ciclo tiene da sé la **posizione** dell'elemento, che si chiama `_indice` (dentro un altro «per ogni», `_indice2`): non è un dato del progetto, e nel codice generato ha lo stesso nome. Le parti sono:

1. la partenza, `_indice ← 0`;
2. il rombo, `_indice < 5` per un vettore di 5 elementi, `_indice < lunghezza parola` per una stringa;
3. l'elemento preso, `c ← parola[_indice]`;
4. il corpo;
5. l'aumento, `_indice ← _indice + 1`.

Come nel «per», il controllo si rifà a ogni giro (se il corpo accorcia la stringa, il ciclo finisce prima) e l'elemento non si cambia nel corpo. I campi si aprono dall'intestazione.

### La copia di un vettore col suo nome

Un vettore si copia in un altro col suo nome, con un'assegnazione: `altri ← voti`, se i due hanno lo stesso tipo e lo stesso numero di elementi. La copia però non avviene tutta in una volta: passa un elemento alla volta, come un «per ogni». Per questo nel flowchart l'assegnazione sta in un riquadro tratteggiato come quello dei cicli, con la scritta «copia elemento per elemento» sul bordo. Nella forma **compatta**, la scelta iniziale, il riquadro contiene solo l'assegnazione. Nella forma **espansa** contiene il «mentre» che fa la copia, con l'intestazione «altri ← voti: copia elemento per elemento»:

1. la partenza, `_indice ← 0`;
2. il rombo, `_indice < 3` per un vettore di 3 elementi;
3. la copia di un elemento, `altri[_indice] ← voti[_indice]`;
4. l'aumento, `_indice ← _indice + 1`.

In tutte e due le forme ogni parte è un'azione, passo passo, e il punto di interruzione ferma «Esegui» a ogni controllo, come in un ciclo. Nella tabella di traccia la colonna `_indice` c'è solo con la forma espansa, dove il disegno la mostra. Anche il vettore restituito da una funzione si assegna col nome (`doppi_voti ← doppi(voti)`, §9), ma lì il risultato arriva già pronto: è un'azione sola, senza riquadro.

### Aperti o chiusi

Nelle Impostazioni, scheda «Aspetto», i cicli si possono disegnare in altri modi; il programma resta lo stesso, cambia solo il disegno:

- **Cicli «per»**: aperti, come sopra (è la scelta iniziale), oppure **chiusi**, con la sola intestazione sopra il corpo e la linea che torna in cima;
- **Cicli «per ogni»**: aperti con la posizione dell'elemento, come sopra; aperti **a parole** («c'è un altro elemento in parola», «c ← elemento successivo di parola»); oppure chiusi;
- **Copia di un vettore o di un record col suo nome**: compatta, con la sola assegnazione nel riquadro (è la scelta iniziale), oppure espansa, col «mentre» che copia un elemento alla volta o, per un record, un'assegnazione per campo;
- **Riquadro dei cicli**: col fondo colorato, oltre al bordo tratteggiato.

### Passo passo e tabella di traccia

Con Passo (F10) l'esecuzione si ferma su ogni parte del ciclo: la partenza, ogni controllo, l'elemento preso, l'aumento; la parte corrente è evidenziata come un blocco (con il ciclo chiuso, e per le parti che il disegno a parole non mostra, si evidenzia l'intestazione). Il punto di interruzione di un ciclo sta sull'intestazione e ferma «Esegui» a ogni controllo: a ogni giro, e un'ultima volta quando il controllo è falso e il ciclo finisce. Nella tabella di traccia ogni parte eseguita ha la sua riga; con il «per ogni» disegnato con la posizione, c'è anche la colonna `_indice`.

### Due esempi

Fra gli esempi forniti (§12), nel gruppo «Cicli per e per ogni», due usano questi cicli:

- **Parola al contrario** legge una parola, la scrive al contrario con un «per» che conta all'indietro (`per i da lunghezza parola - 1 a 0 passo -1`) e ne conta le vocali con un «per ogni» sui caratteri: con `ciao` scrive `oaic` e `Vocali: 3`;
- **Media dei voti coi cicli per** è l'esempio «Media dei voti» con i due cicli che contano scritti come «per»: aprendo tutti e due gli esempi si confronta lo stesso algoritmo scritto nei due modi.

## 5. Record, matrici e tabelle

Finora un dato era un valore solo, o un vettore di valori dello stesso tipo. Tre forme tengono insieme valori che vanno insieme: il **record** raccoglie sotto un nome valori di tipo diverso (un alunno ha un nome, una classe e un voto); la **matrice** dispone valori dello stesso tipo in righe e colonne (i voti di quattro alunni in tre materie); la **tabella** è un vettore di record (la classe intera, un alunno per elemento). Si usano come i vettori: un pezzo alla volta, col suo nome.

### Il record

Un record è un tipo nuovo, che si definisce una volta per tutto il progetto. Dal menu **Progetto** scegli **Aggiungi un record**: in cima alla vista dei dati compare la tabella «Record», con una riga per record; sotto la riga si apre la sua scheda. Lì si scrivono il **nome del record** (`alunno`) e i **campi**, uno per riga, ognuno col nome, il tipo e, per una stringa, la lunghezza massima. **Aggiungi un campo** ne aggiunge uno; ↑ e ↓ lo spostano, × lo elimina. Un campo ha uno dei cinque tipi del §3: non può essere un vettore né un altro record. **Elimina il record** lo toglie dal progetto. La riga di un record si riapre col doppio clic o con Invio; il suo menu lo duplica, lo sposta e lo elimina come quello di un dato. Nelle Impostazioni, scheda «Modifica», la casella del gruppo «Record» (spenta di partenza) mette **Aggiungi un record** anche nella vista dei dati di un progetto che non ne ha ancora.

Definito il record, il suo nome è fra i tipi di un dato: un dato `a` di tipo `alunno` ha i tre campi; un campo si scrive col nome del dato, un punto e il nome del campo: `a.nome`, `a.voto`. Un campo va dovunque va un dato del suo tipo: in un'assegnazione (`a.voto ← a.voto + 1`), in una Lettura (`leggi a.nome`), in una Scrittura, in una condizione. Il valore iniziale di un record è l'elenco dei campi fra graffe, nel loro ordine: `{"Anna", "3A", 7}`.

Il record intero si scrive col suo nome solo dove passa tutto insieme: in una copia (`b ← a`), come argomento di una procedura o di una funzione (per valore, *rif* o *out*) e come risultato di una funzione, che nella sua finestra può restituire un record. Un record non si legge né si scrive tutto insieme; due record non si confrontano con `==`: si legge, si scrive e si confronta un campo alla volta.

La copia `b ← a` passa un campo alla volta, come la copia di un vettore passa un elemento alla volta (§4): nel flowchart l'assegnazione sta in un riquadro tratteggiato con la scritta «copia campo per campo». Nella forma espansa il riquadro contiene un'assegnazione per campo, `b.nome ← a.nome`, `b.classe ← a.classe`, `b.voto ← a.voto`; passo passo ognuna è un'azione. Un campo senza valore ferma la copia su quel campo.

### La matrice

Nei campi di un dato la **Forma** «matrice» chiede le **Righe** e le **Colonne**: `m`, matrice di 2 × 3 interi, ha 2 righe di 3 elementi. Un elemento si scrive con due indici, prima la riga e poi la colonna, tutti e due da 0: `m[1][2]` è l'ultimo. Il limite degli elementi vale sul totale: 40 righe per 26 colonne sono 1040 elementi, troppi.

Il valore iniziale si scrive **per righe**, ogni riga fra graffe: `{{7, 8, 6}, {5, 9, 4}}` (con almeno due righe le graffe esterne si possono omettere); oppure è un valore solo, ripetuto in ogni elemento.

Una riga, `m[1]`, è un vettore: va dovunque va un vettore della sua lunghezza. Si copia in un vettore (`v ← m[1]`) e il contrario (`m[0] ← v`), si passa a una procedura, si percorre con un «per ogni». Il «per ogni» percorre una riga, non la matrice intera: per tutti gli elementi servono due cicli, uno per le righe e dentro uno per le colonne. La matrice intera si copia col suo nome in un'altra delle stesse righe e delle stesse colonne, si passa come parametro (per valore, *rif* o *out*) e può essere il risultato di una funzione. Nella forma espansa la copia `b ← a` ha due cicli, uno dentro l'altro: quello delle righe con `_indice` e, dentro, quello delle colonne con `_indice2`, che copia `b[_indice][_indice2] ← a[_indice][_indice2]`.

In una matrice di stringhe `m[1][0]` è una stringa; in un vettore di stringhe `v[1][0]` è il primo carattere della stringa `v[1]`.

### La tabella

Una tabella è un vettore di record: la **Forma** «vettore» con un record come tipo. `classe`, vettore di 3 `alunno`, tiene tre alunni: `classe[1]` è il secondo, un record; `classe[1].voto` è il suo voto (prima l'indice, poi il campo). Il limite vale sul totale dei valori, i record per i campi: 400 record di 3 campi sono 1200 valori, troppi.

Il valore iniziale si scrive **per record**, ogni record fra graffe: `{{"Anna", "3A", 7}, {"Bruno", "3B", 5}, {"Carla", "3A", 8}}`; oppure è un record solo ripetuto in ogni elemento, `{"-", "0X", 0}`.

Un record della tabella va dovunque va un record: si copia (`r ← classe[1]`, `classe[0] ← r`, `classe[0] ← classe[2]`, ognuna una copia campo per campo), si passa e si restituisce. La tabella intera si copia col suo nome in un'altra dello stesso record e della stessa misura, si passa come parametro (per valore, *rif* o *out*) e può essere il risultato di una funzione. Nella forma espansa la copia `u ← t` è il ciclo dei record con dentro un'assegnazione per campo: `u[_indice].nome ← t[_indice].nome`, poi la classe e il voto. Il «per ogni» su una tabella dà a ogni giro un record, preso in un'azione sola: `per ogni a in classe` copia il record in `a` prima del corpo; cambiare `a` non cambia la tabella.

Un esempio: l'ordinamento di una classe per voto con l'algoritmo a bolle confronta `t[j].voto > t[j + 1].voto` e scambia i due record con un record di appoggio, `r ← t[j]`, `t[j] ← t[j + 1]`, `t[j + 1] ← r`.

### Eseguire

Nella **tabella di traccia** un record ha una colonna per campo, `a.nome`, `a.classe`, `a.voto`, raccolte sotto il nome del dato. Come si mostrano una matrice e una tabella si sceglie nelle Impostazioni, scheda «Tabella di traccia»:

- **Come si mostra una matrice nella tabella**: una colonna per riga, coi valori in fila e l'elemento cambiato evidenziato (è la scelta iniziale); una colonna per elemento, come un vettore; oppure tutta la matrice in una colonna sola, con le righe separate da «‖»;
- **Come si mostra una tabella nella tabella di traccia**: una colonna per record, coi campi in fila (è la scelta iniziale); una colonna per campo di ogni record, come un vettore; oppure una colonna per campo, coi record in fila.

Col puntatore del mouse sul nome di una matrice o di una tabella, il riquadro del valore mostra una griglia: per una matrice una riga della griglia per riga e una colonna per colonna («matrice di 2 × 3 elementi»); per una tabella un record per riga, coi nomi dei campi in cima («alunno · tabella di 3 record»). Per un record, un campo per riga.

Una procedura o una funzione eseguita da sola (§9) chiede un parametro record, matrice o tabella un pezzo alla volta, ognuno col suo nome: `a.nome`, `m[0][1]`, `t[0].nome`; per un record e per una tabella «A ogni elemento» non c'è. Il risultato si scrive allo stesso modo, una riga per pezzo: `→ .nome = Bruno` per un record, `→ [0][1] = 4` per una matrice, `→ [0].nome = Anna` per una tabella e `t[0].nome = Anna` per un parametro per riferimento o di uscita. Sono anche le righe dell'output atteso dei casi d'uso; un caso nuovo ha una voce per ogni pezzo che si chiede.

### Il codice generato

Nello pseudocodice i record si definiscono in testa, `RECORD alunno` … `FINE RECORD`, un campo per riga col suo tipo; i tipi dei dati si scrivono come nella vista dei dati: `classe: vettore di 3 alunno`, `m: matrice di 2 × 3 interi`. In Python un record è una classe di dati (`@dataclass`), coi campi senza valore a `None`; una matrice è una lista di liste, una tabella una lista di oggetti di quella classe. In C un record è una `struct` col nome del record (`typedef struct { … } alunno;`), una matrice ha due indici (`int m[2][3]`), una tabella è un vettore di `alunno`. In TypeScript un record è una classe coi suoi campi (`class alunno`, `voto!: number`), una matrice è un vettore di vettori (`number[][]`), una tabella un vettore di oggetti di quella classe (`alunno[]`). Le copie sono scritte per intero, come nel flowchart espanso: una riga per campo, due cicli per una matrice. «Accademico» non ha record, matrici e tabelle: per un progetto che li usa dice che cosa manca e dove.

## 6. Eseguire

Quando il progetto non ha errori lo si esegue:

- **Esegui** (F5) va fino alla fine, o fino al prossimo punto di interruzione;
- **Passo** (F10) fa un'azione sola: ogni pressione, un'azione;
- **Animata** avanza da sola, a una delle tre velocità scelte nel menu accanto, ed entra anche nelle procedure e nelle funzioni chiamate, come Entra (§9); un clic la mette in pausa;
- **Ferma** (Maiusc+F5) torna alla modifica;
- **Interruzione** (F9) mette o toglie un punto di interruzione sul blocco scelto: un pallino rosso a sinistra del blocco. «Esegui» si ferma lì prima di eseguirlo. «Togli i punti» li toglie tutti.

Con le procedure e le funzioni ci sono anche **Entra** (F11) ed **Esci** (Maiusc+F11), per entrare in una chiamata e uscirne: il §9.

**Correggere in pausa.** Fermi in pausa, il flowchart, i dati e i casi d'uso si modificano. Se la modifica cambia il programma, «Continua» diventa **Riesegui** (F5) e sopra la tabella compare «Valori di prima della modifica»: Riesegui, dopo aver chiesto se salvare, riesegue il programma modificato con le stesse letture, senza riscriverle, e si ferma allo stesso passaggio dello stesso blocco, con i valori ricalcolati. Se non ci arriva, l'avviso dice perché. Annulla, fino al programma di prima, riporta «Continua».

All'avvio, a destra del flowchart si apre una colonna con la **tabella di traccia** sopra e la **console** sotto, e il blocco corrente è evidenziato in giallo con il bordo arancione. Quando il programma legge un dato, in fondo alla console c'è la riga dove scrivere il valore: scrivilo e premi **Invio**. Un valore che non va bene (lettere al posto di un numero) lo dice, e la stessa lettura si ripete.

La **tabella di traccia** ha una riga per azione: il numero, la regola, il valore di ogni dato dopo l'azione (il valore cambiato è evidenziato, «non inizializzata» dove non c'è ancora un valore), l'esito della condizione e ciò che si scrive o si legge. La prima riga è «Inizio»; poi ogni valore iniziale ha la sua riga. «Esporta la tabella…» (menu Progetto) la scrive in un file CSV che si apre con un foglio di calcolo.

Le colonne della tabella si allargano e si stringono trascinando il bordo destro della loro intestazione, e si spostano trascinando l'intestazione (tranne «#» e «Regola»); le colonne di un vettore si spostano insieme. Da tastiera: Tab fino all'intestazione «Regola», le frecce da una colonna all'altra, e Invio (o il tasto Menu, o Maiusc+F10) apre il menu della colonna, con Sposta a sinistra, Sposta a destra, Allarga e Stringi; col mouse lo stesso menu si apre col tasto destro. Ordine e larghezze restano fino alla chiusura di AlgoDesign, e il CSV «uguale alla tabella» segue l'ordine che si vede.

Col puntatore del mouse sul nome di un dato in un blocco, un riquadro ne dice tipo e valore; un clic sul nome lo ferma, e con un vettore lungo lo si scorre fino all'ultimo elemento. Da tastiera, **Maiusc+F9** sul blocco che ha il fuoco apre il riquadro del primo dato del blocco, col fuoco dentro; un altro Maiusc+F9 passa al dato dopo, ed **Esc** chiude il riquadro e torna al blocco. Il riquadro c'è durante l'esecuzione e, finita l'esecuzione, finché il progetto non cambia.

Se il programma fa qualcosa che non si può fare (un intero che esce dal suo intervallo, una divisione per zero, un indice fuori dal vettore, un dato letto prima di avere un valore), l'esecuzione si ferma sul blocco, e la console dice in una frase che cosa è successo; **Spiegazione**, accanto, apre il resto con un **suggerimento** per correggerlo. Durante l'esecuzione flowchart e dati si possono solo guardare: per modificarli si preme Ferma, oppure si aspetta la fine.

## 7. I casi d'uso: provare un algoritmo

Un **caso d'uso** è una prova: i valori che l'utente scriverebbe nella console, in ordine, e l'**output atteso**, cioè il testo esatto che il programma deve scrivere. Si può scrivere prima delle regole, appena ci sono i dati: così si decide che cosa deve fare il programma prima di decidere come.

Nella scheda «Casi d'uso» premi **Aggiungi un caso** e compila:

- il **nome** e, se vuoi, una descrizione;
- i **valori scritti nella console**, in ordine, ognuno col dato a cui va (**Aggiungi un valore**);
- l'**output atteso**: il testo esatto, con un a capo dove il programma va a capo.

Per l'esempio pari o dispari: un caso con il valore `7` per `numero` e l'output atteso `dispari` seguito da un a capo; un altro con `10` e `pari`.

Sulla riga di un caso, **Esegui** lo esegue come F5, con la tabella e la console e i valori del caso al posto di quelli da scrivere; l'altro pulsante lo esegue **un'azione alla volta**, come F10. **Esegui tutti** ed **Esegui i selezionati** li eseguono uno dopo l'altro. Accanto a ogni caso un pallino dice l'ultimo esito: **verde** raggiunto, **rosso** non raggiunto, **giallo** se il progetto è cambiato dopo un rosso. Sotto il caso scelto si leggono le differenze fra atteso e ottenuto, con la prima segnata. Un caso può anche attendere un errore: dopo un'esecuzione fermata da un errore, **Attendi questo errore** lo scrive nell'atteso.

**Un caso d'uso da un'esecuzione.** Finita un'esecuzione con F5 o F10 senza un caso d'uso, in fondo alla console c'è **Salva l'esecuzione come caso d'uso**: un clic porta alla scheda «Casi d'uso» con un caso nuovo già pronto, coi valori scritti nella console, ognuno col suo dato, e come output atteso ciò che il programma ha scritto, con l'errore se l'esecuzione si è fermata su un errore, e con gli avvisi del progetto. I campi del caso sono aperti, col nome proposto («caso 3») già selezionato, da cambiare. Lo stesso fa **Nuovo caso dall'ultima esecuzione** nella scheda «Casi d'uso». Il caso va al programma, o alla procedura o alla funzione eseguita da sola. In pausa, dopo «Ferma», dopo un caso d'uso eseguito, o quando la console ha perso una parte dell'output, il comando nella console non c'è e quello della scheda è spento, e il suggerimento dice perché; se il programma o i limiti cambiano dopo la fine, va eseguito di nuovo. Se c'è già un caso con gli stessi valori e lo stesso risultato, AlgoDesign sceglie quello e lo dice. Nelle Impostazioni, scheda «Modifica», la casella **Offri di salvare un'esecuzione come caso d'uso**, accesa di partenza, toglie i due comandi.

Il menu della riga di un caso, come quello di un dato, lo duplica, lo sposta e lo elimina. Annulla riporta anche la spunta di un caso eliminato o rinominato, com'era prima della modifica; gli altri casi tengono la spunta che hanno.

Anche una procedura o una funzione ha i suoi casi d'uso, che la provano da sola: il §9.

## 8. Il codice generato

Il pulsante **Genera**, nel gruppo delle viste, apre a destra del flowchart la colonna del **codice generato**, con le linguette dei linguaggi: di partenza **Pseudocodice** (nella lingua dell'interfaccia), **Python** e **C**, ma quali linguaggi hanno una linguetta, e in che ordine, si sceglie nelle Impostazioni (§14); all'avvio si vede la prima. Il codice segue ogni modifica del flowchart; con un progetto che ha errori, al posto del codice c'è l'invito a correggerli. «Genera» e «Tabella» si alternano nella stessa colonna. Fra i linguaggi che si attivano nelle Impostazioni c'è anche **Accademico**, lo pseudocodice delle Selezioni scolastiche delle Olimpiadi di Informatica: come si usa per allenarsi lo spiega la guida ad «Accademico», il file `GUIDA-AD-ACCADEMICO.md`, che nel pacchetto sta accanto al programma (e anche nel pacchetto dello strumento `algodesign-tools`), nel repository nella cartella `docs`. Si attiva allo stesso modo il **TypeScript**, che si esegue con Node.js (più sotto).

Durante l'esecuzione con Passo o con l'Animata il codice evidenzia la riga (o le righe) del blocco corrente; con Esegui, la riga dove l'esecuzione si ferma su un punto di interruzione o su un errore. Così si vede, azione per azione, a che cosa corrisponde ogni blocco.

I cicli «per» e «per ogni» diventano, nello pseudocodice, `PER i DA 1 A n` … `FINE PER` e `PER OGNI c IN parola` … `FINE PER OGNI`; in Python e in TypeScript un `while`, col contatore aumentato in fondo al corpo; in C un `for`. Il «per ogni» percorre il vettore o la stringa con la sua posizione, `_indice`, come nel flowchart aperto. Durante l'esecuzione è evidenziata la riga della parte corrente del ciclo: la partenza, il controllo, l'elemento preso o l'aumento. Come diventano codice le procedure e le funzioni lo dice il §9.

**Copia** mette il codice negli appunti; **Salva…** lo scrive in un file (`.txt`, `.py`, `.c` o `.ts`). Il codice Python si esegue con Python 3.11 o successivo; il C si compila con un compilatore C11 (per esempio `gcc -std=c11 programma.c -lm`); il TypeScript si esegue con Node.js 24.

Il codice generato è fatto per essere letto: non controlla i calcoli che il C lascia senza una regola (un intero che esce dal suo intervallo, una divisione intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in intero, un dato letto prima di avere un valore), né un reale che diventa infinito o non è un numero. Un commento in testa al programma Python, C e TypeScript lo dice. AlgoDesign invece li ferma sempre, e ferma anche un ciclo che non finisce, dopo un milione di azioni: per questo conviene provare l'algoritmo prima in AlgoDesign, con i suoi casi d'uso.

### Il TypeScript con Node.js

Il TypeScript di partenza non è attivo: si attiva nelle Impostazioni (§14) e ha la sua linguetta; **Salva…** propone un file `.ts`, per esempio `media.ts`. Lo esegue **Node.js 24**, che AlgoDesign non porta con sé e si scarica dal sito `https://nodejs.org`: c'è anche uno zip che non chiede di installare nulla né diritti di amministratore e funziona anche da una chiavetta. In **PowerShell**, nella cartella del file, si scrive `node media.ts`.

Con lo zip, al posto di `node` si scrive il percorso di `node.exe` fra virgolette, con `&` davanti: `& "D:\node\node.exe" media.ts`. Un nome con gli spazi va fra virgolette: `node "media voti.ts"`. Il programma legge dalla console una riga per ogni lettura. Per dargli i valori da un file si passa da `cmd`, perché in PowerShell il `<` non c'è: `cmd /c "node media.ts < ingresso.txt"`. Un errore ferma il programma con la riga «Errore alla riga N: motivo»: N è la riga del file.

Node esegue il file senza controllarne i tipi. Chi vuole il controllo lo chiede a `tsc`. Una volta sola nella cartella, per i due pacchetti che servono, si scrive `npm.cmd install --no-save typescript @types/node`; poi, per ogni controllo, `npx.cmd tsc --strict --noEmit --module preserve --moduleDetection force --erasableSyntaxOnly --types node media.ts`. Senza errori `tsc` non scrive nulla e non produce nessun file: il programma resta quello da eseguire con `node`.

In PowerShell si scrive `npm.cmd` e `npx.cmd`, non `npm` e `npx`: su un Windows appena installato questi ultimi si fermano con un errore sull'esecuzione di script. Con lo zip, `npx.cmd` deve trovare Node: prima si scrive `$env:PATH = "D:\node;$env:PATH"`, che vale finché la finestra di PowerShell resta aperta; poi i comandi sono gli stessi. Se in una cartella più in alto c'è un file `package.json`, i pacchetti finiscono lì e Node scrive anche un avviso (`MODULE_TYPELESS_PACKAGE_JSON`): il programma funziona lo stesso.

### Il JavaScript e lo strumento `algodesign-tools`

Il **JavaScript** è lo stesso programma del TypeScript senza i tipi, riga per riga: non è un linguaggio in più e non ha una linguetta. Lo mostra `algodesign-tools`, lo strumento a riga di comando di AlgoDesign, in un pacchetto a parte, spiegato nella sua guida, `GUIDA-AD-ALGODESIGN-TOOLS.md`. Dalla cartella dello strumento, `.\algodesign-tools stampa media.algo` scrive due pagine HTML, che si aprono con un doppio clic:

- `media (TypeScript e JavaScript).html`: i due testi in due colonne, da stampare con Ctrl+P su carta o in un PDF;
- `media (prova).html`: la **pagina di prova**, che esegue il JavaScript nel browser. Nella casella **Input** si scrivono i valori prima di **Esegui**, una riga per ogni lettura del programma; ciò che il programma scrive compare in **Output**. **Ferma** interrompe un programma che non finisce.

La pagina è provata in Chromium, il motore di Chrome e di Edge. In Firefox e in Safari non è provata: la riga di un errore può uscire «?», col motivo giusto.

Per eseguire il JavaScript con Node, seleziona col mouse il riquadro del codice della pagina di prova (i numeri di riga non entrano nella selezione), incollalo in un file `media.js` e scrivi `node media.js`.

Lo stesso comando, con `--linguaggi pseudocodice c`, affianca due linguaggi a scelta con le righe allineate blocco per blocco. L'altro comando dello strumento, `accademico`, porta in AlgoDesign un testo scritto in «Accademico».

## 9. Procedure e funzioni

Un algoritmo lungo si legge meglio diviso in pezzi, ognuno con un nome che dice che cosa fa: «leggi il numero dei voti», «il voto è valido?», «scrivi le stelle». In AlgoDesign i pezzi sono di due specie, e la differenza sta nel problema, non nel linguaggio di programmazione:

- una **procedura compie un lavoro**: legge, scrive, cambia i dati che riceve. Non ha un risultato, e si chiama con un blocco del flowchart, il blocco «Procedura»;
- una **funzione calcola un risultato** dai dati che riceve, e non fa altro: non legge, non scrive, non cambia i dati di chi la chiama. Il suo risultato (un intero, un reale, un carattere, un booleano, una stringa, un vettore, oppure un record, una matrice o una tabella, §5) si usa dentro un'espressione, come `valido(voto)` nella condizione di un «se».

Una funzione che legge o scrive è un errore, col suggerimento di farla diventare una procedura. Una procedura può chiamare altre procedure e funzioni; una funzione solo altre funzioni. Una procedura o una funzione che chiama sé stessa, direttamente o passando per altre (A chiama B e B chiama A), usa la **ricorsione**: il §10 la racconta.

Il programma che si è scritto finora è il **programma principale**: è quello che si esegue per primo, e chiama le procedure e le funzioni.

### Un esempio: la media dei voti con le funzioni

Fra gli esempi forniti (§12), nel gruppo «Funzioni e procedure», **Media dei voti con le funzioni** è la «Media dei voti» divisa in tre pezzi:

- la procedura **leggi_numero**(*out* numero) chiede quanti voti leggere, finché il numero non è fra 1 e 30, e lo dà a chi la chiama;
- la funzione **valido**(voto) restituisce un booleano: `voto >= 1 and voto <= 10`;
- la procedura **stelle**(quante) scrive tante stelle quante ne dice `quante`.

Il programma principale chiama `leggi_numero(out n)` con un blocco «Procedura», usa `valido(voto)` nella condizione del «se» dentro il ciclo, e alla fine chiama `stelle(somma / contati)`. Con i voti 7, 11, 5 e 8 scrive lo stesso risultato della «Media dei voti», più una riga di sei stelle.

### Creare una procedura o una funzione

- Il pulsante **Funzione**, accanto a «Salva», crea una funzione: si scrivono il nome, che cosa restituisce (il tipo, anche un record, e la forma: semplice, vettore col numero degli elementi o matrice con le righe e le colonne; per una stringa la lunghezza massima sta nelle «Opzioni avanzate») e il **valore predefinito**, che prende il posto della funzione nelle espressioni se un giorno la elimini (per una funzione nuova 0, 0.0, `' '`, `""` o false; una funzione che restituisce un vettore, una matrice o un record non ne ha).
- Nel flowchart, il **«+»** ha il blocco **Procedura**, prima di «Commento»: nei suoi campi si sceglie la procedura dall'elenco, e in fondo all'elenco **Nuova procedura…** la crea; il blocco la chiama, e si passa alla sua scheda.
- Il menu **Progetto** ha **Nuova procedura o funzione…**, che chiede che cosa fa: «Compie un lavoro sui dati che riceve (procedura)» oppure «Calcola un risultato dai dati che riceve (funzione)».

Una funzione si chiama scrivendo in un'espressione il suo nome, con gli argomenti fra parentesi: `valido(voto)`. Un nome che non è di una funzione del progetto è un errore: AlgoDesign non crea una funzione da un nome scritto, perché basterebbe una parola sbagliata.

Nel flowchart una procedura comincia con «Procedura **leggi_numero**(*out* numero)» e finisce con «Fine»; una funzione comincia con «Funzione *booleano* ← **valido**(voto)» e finisce con «Restituisce voto >= 1 and voto <= 10». Ciò che la funzione restituisce si scrive aprendo «Restituisce», con il doppio clic o con Invio. Il blocco che chiama una procedura ha due righe ai lati e una freccia: «↪ **leggi_numero**(*out* n)». I nomi delle procedure e delle funzioni sono in grassetto, anche dentro le espressioni.

### I parametri: per valore, *rif* e *out*

Una procedura o una funzione ha **i suoi dati**: quelli del programma principale lì non si vedono. Ciò che le serve lo riceve attraverso i **parametri**, che nella sua vista dei dati stanno nella tabella «Parametri», sopra i dati di lavoro, nell'ordine in cui si passano; per una funzione, sotto c'è «Restituisce un …» (o «una stringa»). Un parametro nasce con **Aggiungi un parametro**, oppure scegliendo per un dato la natura «parametro per valore», «parametro per riferimento» o «parametro di uscita».

- **Per valore** (senza parola) il parametro riceve **una copia**: la procedura la può cambiare, ma il dato di chi chiama resta com'era. Vale per ogni tipo, anche per un vettore e per una stringa (l'esempio «Una procedura riceve copie» lo mostra). L'argomento può essere un'espressione: `stelle(somma / contati)`.
- **Per riferimento** (*rif*) il dato **entra ed esce**: la procedura usa il valore che ha, e ciò che fa al parametro lo fa al dato di chi chiama. Per questo il dato deve avere già un valore quando la procedura è chiamata: se non ce l'ha è un errore, che si vede prima di eseguire quando nessuna strada del flowchart gliene dà uno, altrimenti durante l'esecuzione, sulla chiamata.
- **Di uscita** (*out*) il dato **solo esce**: il parametro parte senza valore (leggerlo prima di dargliene uno è un errore), e ciò che la procedura gli dà va al dato di chi chiama. È il modo giusto per una procedura che legge un valore e lo consegna, come `leggi_numero`.

Per *rif* e per *out* l'argomento dev'essere un dato che si può cambiare, cioè una variabile o una sua parte: un elemento di un vettore, una riga o un elemento di una matrice, un record di una tabella o un campo (`n`, `v[i]`, `m[i]`, `m[i][j]`, `t[i]`, `a.voto`), e nel disegno del blocco l'argomento ha davanti *rif* o *out* (nel campo non si scrive). Solo le procedure hanno parametri per riferimento o di uscita.

Quando un dato senza valore va a un *rif* e la procedura non usa quel valore, perché gliene dà uno nuovo prima di leggerlo su ogni strada, sotto l'errore nella riga di stato c'è la correzione **Sostituisci rif con out per …**: un clic, o Invio, cambia il parametro in *out* e toglie la sua voce dai casi d'uso della procedura, e Annulla riporta tutto. Se la procedura gli dà un valore solo su qualche strada, o se il parametro è un vettore, la correzione non c'è: con *out* il valore che arriva si perderebbe; si dà un valore al dato prima della chiamata. Sulla scheda della procedura la correzione nomina il parametro («per numero»), altrove l'argomento come lo scrive la chiamata («per n»). È la correzione tipica di un progetto scritto con una versione precedente di AlgoDesign, che questa regola non la controllava.

Nei campi del blocco «Procedura» c'è un campo per parametro, col suo nome e il modo in cui lo riceve («numero, di uscita»). Gli argomenti devono essere tanti quanti i parametri, nello stesso ordine e del tipo giusto; un parametro reale per valore accetta anche un intero, con un avviso, perché il tipo cambia senza che sia scritto. Spostare un parametro su o giù scambia gli argomenti di ogni chiamata; eliminarlo chiede se togliere anche il suo argomento da ogni chiamata.

Una costante può essere **globale** (la casella accanto alla natura): allora si usa in ogni procedura e funzione, e compare in ogni scheda.

### Il risultato: anche una stringa o un vettore

Una funzione può restituire anche una **stringa**, con la sua lunghezza massima (255 caratteri se non si dice altro), o un **vettore**, del tipo e col numero di elementi scritti nella finestra della funzione. Nel flowchart l'inizio dice «Funzione vettore di 3 interi ← **doppi**(w)» o «Funzione stringa ← **saluto**(nome)»; la lunghezza della stringa la dice la vista dei dati, «Restituisce una stringa, al più 20 caratteri». Per un vettore, «Restituisce» ha il nome di un vettore della funzione dello stesso tipo e della stessa dimensione: `Restituisce r`. Una funzione può restituire anche un record, una matrice o una tabella: il §5 dice come.

Il risultato va dovunque va una stringa o il nome di un vettore: in un'assegnazione (`doppi_voti ← doppi(voti)`), come argomento (`mostra(doppi(voti))`), come vettore di un «per ogni» (`per ogni x in doppi(voti)`: la funzione si chiama una volta sola, alla partenza), e con l'indice, `doppi(voti)[1]` o `saluto("Bo")[5]`, prima la chiamata e poi l'elemento. Chi riceve un vettore riceve sempre una copia: cambiarla non cambia niente dentro la funzione. Una stringa più lunga della lunghezza massima del risultato ferma l'esecuzione sulla fine della funzione, prima che chi la chiama la riceva.

### Le schede e l'elenco

Quando nasce la prima procedura o funzione, sopra il flowchart compare una fila di **schede**: la prima a sinistra è sempre «Programma principale», poi una per ogni procedura o funzione aperta. La × chiude la scheda (la procedura o la funzione resta nel progetto); il «+» dopo l'ultima scheda ne crea una nuova. La vista dei dati e i casi d'uso seguono la scheda: per una funzione, i suoi dati e i suoi casi.

In fondo alla fila, a destra, **Procedure e funzioni (n) ▾** apre l'elenco di tutte, in ordine alfabetico, le procedure separate dalle funzioni, ognuna con chi la chiama, e una ricerca in cima: un clic apre la sua scheda.

### Rinominare, cambiare, duplicare, eliminare

Il tasto destro su una voce dell'elenco o su una scheda apre il menu con **Apri**, **Rinomina…**, **Proprietà…**, **Duplica** ed **Elimina…** (su una scheda anche «Chiudi la scheda»). Gli stessi comandi ci sono nella finestra **Procedure e funzioni…** del menu Progetto: una tabella col nome, il genere, i parametri, ciò che restituisce, chi la chiama e i casi d'uso, e un «⋯» in fondo a ogni riga.

- **Rinomina** cambia il nome anche in tutte le chiamate.
- **Proprietà** cambia che cosa restituisce, il valore predefinito e anche che cosa fa: una procedura può diventare una funzione, e il contrario; ciò che non va più bene diventa un errore da correggere. Quando una funzione diventa una procedura, le righe «→ …» di ciò che restituiva escono dall'output atteso dei suoi casi d'uso (una procedura non restituisce niente); nell'altro verso i casi restano com'erano, perché ciò che la funzione restituirà ancora non si sa.
- **Elimina** chiede, elenca dove è chiamata e avvisa che le chiamate che restano saranno errori. Per una procedura c'è la spunta **Elimina anche tutte le chiamate**; per una funzione **Toglila dalle espressioni**, sostituendola col suo valore predefinito oppure eliminando le assegnazioni che la contengono; per una funzione che restituisce un vettore, che non ha un valore predefinito, si eliminano le assegnazioni, e altrove la chiamata resta, da correggere. Una seconda conferma dice che cosa si toglie; nelle condizioni la sostituzione si conferma una per una.

Dopo ognuno di questi comandi **Annulla** (Ctrl+Z) riporta tutto com'era, e mostra la scheda che è cambiata.

### Eseguire

**Esegui** (F5) sulla scheda del programma principale esegue il programma, che entra ed esce dalle procedure e dalle funzioni che chiama; sulla scheda di una procedura o di una funzione la esegue **da sola** (più avanti). A esecuzione ferma o finita, F5 ricomincia la stessa esecuzione, anche da un'altra scheda; in pausa la continua.

Passo passo, su un blocco che chiama una procedura o una funzione:

- **Passo** (F10) la esegue tutta, e si ferma sull'azione dopo (con una funzione dentro un'espressione, prima ancora sulla ripresa del blocco: più sotto);
- **Entra** (F11) si ferma sulla sua prima azione;
- **Esci** (Maiusc+F11) va avanti fino al ritorno a chi l'ha chiamata.

I pulsanti «Entra» ed «Esci» stanno nella barra accanto a «Passo» quando il progetto ha procedure o funzioni; i tasti valgono sempre (da fermo, F11 comincia come F10). Il flowchart **segue l'azione**: quando l'esecuzione entra in una procedura si apre la sua scheda, e al ritorno si torna a chi chiama. I punti di interruzione funzionano anche dentro le procedure e le funzioni.

Quando una funzione è chiamata dentro un'espressione, il blocco che la chiama si esegue in due tempi: prima la chiamata, poi il resto del blocco, col valore che la funzione ha restituito. Per questo, dopo il ritorno, l'esecuzione si ferma anche **a metà del blocco**: Passo su quel blocco si ferma due volte, prima sulla ripresa e poi sull'azione dopo; Esci da dentro la funzione e l'Animata si fermano sulla ripresa. Nel flowchart il blocco è evidenziato senza la punta della freccia che entra, col segno «↩» in basso a destra, come la riga «↩» della tabella; sopra il flowchart un avviso lo dice, per esempio «La funzione «fatt» ha restituito 1: in pausa a metà di «Assegnazione: f ← n * fatt(n - 1)» (azione 11).». Con due chiamate nella stessa espressione, come `doppio(1) + triplo(2)`, ci si ferma dopo ognuna, e dalla prima ripresa Passo esegue tutta la seconda chiamata, mentre Entra ci entra. Esegui e i punti di interruzione non si fermano sulla ripresa.

In cima alla colonna dell'esecuzione, **Dove sei** dice le chiamate in corso, per esempio «Programma principale › leggi_numero»: un clic su un nome mostra quella scheda, sul blocco della chiamata.

Col puntatore del mouse sul nome di un dato se ne leggono tipo e valore anche dentro una procedura o una funzione in corso; per un parametro per riferimento o di uscita una riga in più dice di quale dato si tratta: «Di uscita: è «n» di «Programma principale»» (per un *rif*, «Per riferimento: …»). Una lettura dentro una procedura chiede il valore col nome scritto nel blocco («Valore di «numero»») e, accanto, dice quale dato di chi chiama lo riceve.

Lo stesso vale per il nome di una **funzione chiamata** in un blocco: durante l'esecuzione, col puntatore del mouse sul suo nome un riquadro dice «saluto(…)», il tipo del risultato e il valore che ha restituito nell'ultima esecuzione di quel blocco; prima che la chiamata finisca lì, «Non ha ancora restituito un valore qui». Se il blocco la chiama più volte, i valori sono tutti, nell'ordine in cui le chiamate finiscono («Chiamata 1», «Chiamata 2»). Così si vede il valore su cui il blocco lavora: in `scrivi saluto("Bo")[5]` il riquadro mostra «Ciao Bo», da cui il blocco prende il carattere `B`.

### La tabella di traccia con le procedure e le funzioni

La tabella resta una sola, con una riga per azione anche dentro le chiamate:

- le colonne sono **a gruppi**: quelle del programma principale, poi «Condizione» e «Scrive», poi un gruppo per ogni procedura o funzione, col suo nome in cima; le celle di un gruppo sono vuote quando quella procedura non è in corso;
- un clic sul nome di un gruppo lo chiude in una colonna stretta, con «⋯» dove la procedura è in corso, colorata dove un suo dato cambia; un altro clic lo riapre, e un gruppo chiuso resta chiuso anche nelle esecuzioni dopo;
- le righe di ogni **livello** di chiamata hanno uno sfondo diverso (azzurro, verde acqua, lilla, rosa, poi di nuovo azzurro); le righe del programma principale non ne hanno;
- la chiamata è una riga, «↪ leggi_numero(out n)», e la fine di una funzione è la riga «Restituisce …»; quando una funzione è chiamata dentro un'espressione, dopo il ritorno una riga «↩ …» riprende il blocco di chi chiama, con l'esito della condizione, ciò che si scrive o il dato cambiato, e in fondo il valore che la funzione ha restituito: «↩ scrivi s, " ", saluto("Bo")[5] ↵  (saluto → Ciao Bo)», per un vettore gli elementi in fila, «(doppi → 14 · 8 · 18)». Il valore c'è anche nel CSV.

Il CSV esportato ha tutte le colonne, anche quelle di un gruppo chiuso. Nel codice generato, durante una chiamata, sono segnate anche le righe delle chiamate in corso ai livelli di sopra, ognuna con lo sfondo del suo livello e una barretta a sinistra.

### Una procedura o una funzione da sola, e i suoi casi d'uso

Una procedura o una funzione si può provare **da sola**, prima di usarla nel programma: F5 sulla sua scheda. I parametri si chiedono nella console uno alla volta, come letture; accanto al primo elemento di un vettore il pulsante «A ogni elemento» dà lo stesso valore a tutti. Un parametro di uscita non si chiede: parte comunque senza valore. Alla fine la console scrive il risultato: «→ true» per ciò che una funzione restituisce, e per un vettore una riga per elemento, «→ [0] = 4»; per una procedura, «numero = 4» per ogni parametro per riferimento o di uscita. Prima di queste righe la console va sempre a capo: i risultati cominciano su una riga nuova, e se la procedura era già a capo, o non ha scritto nulla, si vede una riga vuota. Queste righe sono uguali in ogni lingua.

I **casi d'uso di una procedura o di una funzione** stanno nella scheda «Casi d'uso» quando è mostrata la sua scheda, e sono come quelli del programma: un caso nuovo ha già una voce per ogni parametro che si chiede, nell'ordine, a cui seguono le letture; l'output atteso è ciò che scrive, poi «→ valore» o «nome = valore». Per `valido`: il valore `7` e l'atteso `→ true`, oppure `11` e `→ false`. Si eseguono come gli altri, uno alla volta o tutti insieme, col loro pallino. Un caso scritto con una versione precedente, che dava a un parametro per riferimento la voce «senza valore», ora si ferma sull'errore del *rif* senza valore; nei campi del caso la casella «senza valore» c'è ancora su quella voce, per poterla togliere.

Quando un programma (o una procedura) chiama una procedura che legge in un suo dato di lavoro, o in un suo parametro per valore, i valori di quelle letture vanno anche lì: nei campi di un caso la scelta del dato di una voce ha, dopo i dati della scheda, un gruppo **Dati di lavoro di leggi** per ogni procedura chiamata. Se quel dato cambia nome, le voci dei casi lo seguono, tranne quando anche un altro dato con lo stesso nome, in un'altra procedura chiamata, riceve una lettura: allora le voci restano com'erano, e un avviso lo dice e suggerisce di scegliere il nome nuovo nel caso d'uso, dove il valore era del dato rinominato.

Il nome di un caso del programma può contenere «/» («voti 6/7»), ma non può essere il nome di una procedura o funzione seguito da «/» e dal nome di un suo caso (`valido/sette`): si confonderebbe con quel caso, e il campo lo dice. Un file che ha già un nome così si apre lo stesso.

### Il codice generato

Nel codice le procedure e le funzioni vengono dopo il programma principale. Nello pseudocodice sono `PROCEDURA leggi_numero(out numero: intero)` e `FUNZIONE booleano ← valido(voto: intero)`, che finisce con `RESTITUISCE …`, e la chiamata di una procedura è `CHIAMA leggi_numero(out n)`; un risultato stringa o vettore si scrive con le parole della vista dei dati, `FUNZIONE vettore di 3 interi ← doppi(…)`. Il Python non ha parametri per riferimento: una procedura restituisce i valori dei suoi parametri per riferimento e di uscita, e chi la chiama li riassegna; un parametro di uscita non si passa nemmeno (`n = leggi_numero()`). Il TypeScript fa allo stesso modo; con più valori la chiamata è `[v, n] = conta(v);`. In C un parametro per riferimento o di uscita è un puntatore (`void leggi_numero(int *numero)`, chiamata con `leggi_numero(&n)`). Un vettore passato per valore si copia all'inizio della procedura chiamata, in Python, in C e in TypeScript, perché la copia sia davvero una copia; una stringa solo in C, perché in Python e in TypeScript una stringa non si può modificare. Per la stessa ragione una funzione che restituisce un vettore dà in Python una lista nuova (`return list(r)`) e in TypeScript un vettore nuovo (`return Array.from(r);`); in C, che non sa restituire un vettore, la funzione restituisce una struttura che lo contiene, e chi la chiama ne prende il vettore (`doppi(voti).v`; una stringa allo stesso modo, `.s`). La copia `altri ← voti` è un ciclo vero, una riga per ogni sua parte, come nel flowchart espanso.

## 10. La ricorsione

Una procedura o una funzione può chiamare sé stessa. Il fattoriale di n è n per il fattoriale di n − 1, e il fattoriale di 1 è 1: la funzione «fatt» lo scrive proprio così, `n * fatt(n - 1)`, e quando `n <= 1` restituisce 1 senza chiamarsi più. Ogni ricorsione ha queste due parti: il caso in cui la funzione non chiama più sé stessa, e la chiamata con un dato più vicino a quel caso. Ogni chiamata in corso ha i suoi dati: mentre `fatt(3)` lavora, la `n` di `fatt(4)` vale ancora 4 e aspetta il risultato. La ricorsione può anche passare per altre procedure o funzioni: «pari» chiama «dispari», che chiama di nuovo «pari».

### Due esempi

Fra gli esempi forniti (§12), nel gruppo «Funzioni e procedure»:

- **Fattoriale con la ricorsione**: il programma principale legge `n`, calcola `r ← fatt(n)` e scrive `r`; la funzione «fatt» ha un «se» con la condizione `n <= 1`, e nel ramo Vero `f ← 1`, nel Falso `f ← n * fatt(n - 1)`; poi restituisce `f`. Con 10 scrive 3628800;
- **Sequenza di Fibonacci con la ricorsione** legge `n` e scrive i primi n numeri di Fibonacci, uno per riga: la funzione «fibonacci» chiama sé stessa due volte, `fibonacci(n - 1) + fibonacci(n - 2)`, fino a 0 e 1. Il suo caso d'uso «ventisei» si ferma: il lavoro cresce molto in fretta a ogni numero, e dopo 24 numeri supera il milione di azioni.

AlgoDesign riconosce la ricorsione da sé e la dice, nella riga di stato e nell'elenco «Procedure e funzioni», sotto «chiamata da»: «La funzione «fatt» chiama sé stessa», oppure «La funzione «pari» chiama «dispari», che chiama di nuovo «pari»». È un'informazione, non un errore. Se il progetto ha più ricorsioni, la riga di stato dice la prima e quante altre ce ne sono («, e altre 2 ricorsioni»); **Mostra le ricorsioni** apre l'elenco di tutte, sopra la riga, e **Nascondi le ricorsioni** lo chiude.

### Eseguire passo passo

Ogni chiamata in corso è un **livello**. Entra (F11) su `fatt(n - 1)` scende di un livello; Esci (Maiusc+F11) risale di uno, fermandosi a metà di `f ← n * fatt(n - 1)`, sulla ripresa (§9).

- **Dove sei** dice tutte le chiamate in corso fino a sette livelli; con più livelli mostra i primi due, «… 496 chiamate …» e gli ultimi tre. Un clic su «…» apre l'elenco «Le altre chiamate», una voce per livello («Livello 37: fatt»), e una voce mostra quella chiamata.
- Nella **tabella di traccia** il gruppo di «fatt» mostra i dati della chiamata dell'azione in corso, la più profonda.
- Col puntatore del mouse sul nome di un dato si legge il valore della chiamata dell'azione in corso. Scegliendo un livello in «Dove sei», si legge quello di quel livello, con la riga «Chiamata al livello 37 di 500», finché l'esecuzione non fa un'altra azione. Per un parametro per riferimento la riga dice anche il livello: «Per riferimento: è «x» di «scendi» al livello 3».

### Quando la ricorsione non finisce

Se manca il caso che ferma la ricorsione, o se la chiamata non gli si avvicina, le chiamate non finiscono mai. Ogni chiamata in corso occupa un posto nella **pila delle chiamate**, che ha 500 posti se le Proprietà del progetto non ne dicono un altro numero, da 5 a 500: AlgoDesign ferma l'esecuzione sulla chiamata che non ci sta più, con «La procedura o la funzione è stata richiamata 500 volte, e nessuna è finita.», col numero del progetto. Con pochi posti la fine si vede subito anche con **Passo**: l'esempio «Ricorsione senza uscita» ne ha 10. Il codice generato usa lo stesso numero. La pila tiene anche i dati di ogni chiamata in corso, e per quelli ha 256 KB: quando ogni chiamata riceve copie di vettori o stringhe grandi, o ne ottiene dalle funzioni che chiama, ci si ferma prima, con «I dati delle chiamate in corso non stanno più nella pila.». Una procedura che non cambia il vettore che riceve può prenderlo per riferimento (*rif*), e allora le chiamate non ne fanno una copia ciascuna. Contano solo le chiamate delle procedure e delle funzioni che richiamano sé stesse, direttamente o passando per altre: un programma senza ricorsione non ha questi limiti. Un lavoro troppo lungo, come la sequenza di Fibonacci con un numero grande, si ferma invece dopo un milione di azioni, come un ciclo che non finisce.

### Il codice generato

Nello pseudocodice, in Python e in TypeScript la chiamata resta `fatt(n - 1)`; in C ha un primo argomento in più, la riga della chiamata: `fatt(__LINE__, n - 1)`. A differenza degli altri errori del §8, questi due limiti il codice generato li controlla: il Python, il C e il TypeScript contano le chiamate in corso come AlgoDesign e si fermano nello stesso punto, con la stessa frase e la riga della chiamata.

## 11. Le librerie: importare procedure e funzioni

Una procedura o una funzione scritta bene serve in più programmi: `leggi_numero`, `valido`, un ordinamento. Invece di riscriverla, la si **importa**: AlgoDesign ne copia una parte da un altro progetto in quello aperto. Dopo, la copia è del progetto: se l'altro cambia, il progetto no.

### Una libreria

Una **libreria** è un progetto come gli altri, un file `.algo`, che raccoglie procedure e funzioni da usare altrove (il suo programma principale può essere vuoto, o provarle). Lo distingue un segno, che si mette con la casella **È una libreria** nella finestra «Proprietà», sotto le note, oppure col comando **Salva come libreria…** del menu Progetto, che spunta la casella e salva con nome (partendo dalla cartella delle librerie, se c'è). «Salva» e «Salva con nome» lasciano il segno com'è; lo si toglie dalla casella. Il segno dice solo dove la libreria si trova: procedure e funzioni si importano da qualunque progetto, segnato o no.

### Importare

Dal menu Progetto, **Importa procedure e funzioni…** apre la finestra dell'importazione (lo stesso fa **Importa…** nella finestra «Procedure e funzioni…»). In alto si sceglie da dove:

- dalla **cartella delle librerie**, divisa in gruppi come quella degli esempi (§12), con la ricerca in cima: **Scegli** accanto a una libreria;
- oppure con **Da un altro file…** da qualunque progetto sul disco.

Sotto, **Che cosa importare** elenca le procedure e le funzioni del progetto scelto, ognuna con la sua spunta (**Cambia** torna alla scelta del progetto). Se due hanno lo stesso nome, la seconda resta nell'elenco spenta, con sotto «Un'altra più sopra ha lo stesso nome: si importa solo quella.». Spuntandone una, **Che cosa entra nel progetto** dice che cosa entra e perché: con lei entrano anche le procedure e le funzioni che chiama, pure passando per altre («Entra: la chiama …»), e le costanti comuni che usano («Entra: la usa …»). Ciò che c'è già nel programma, identico, non entra di nuovo. Il programma principale del progetto scelto e i suoi casi d'uso non entrano mai.

Se nel programma c'è già una procedura, una funzione o una costante comune con lo stesso nome ma diversa, il riepilogo lo dice e chiede che cosa fare:

- **Rinomina quella che viene importata** (la scelta di partenza): entra con un nome nuovo, proposto con `_2` in fondo e modificabile; dentro ciò che viene importato, il nome nuovo prende il posto del vecchio;
- **Sostituisci quella del programma**: entra al posto di quella che c'era, e le chiamate del programma vanno a lei. Il riepilogo avvisa se ha un'altra intestazione (allora le chiamate saranno da correggere), e dice che i casi d'uso di quella del programma sono eliminati, e che i risultati del programma possono cambiare (anche per una costante);
- **Non importarla: si usa quella del programma**: se ha un'altra intestazione, il riepilogo avvisa che le chiamate di ciò che viene importato saranno da correggere.

Se dopo l'importazione il programma avesse errori che prima non aveva (per esempio una chiamata con gli argomenti sbagliati), il riepilogo lo dice sotto: i casi d'uso non si eseguono finché non li correggi. «Importa» resta attivo: si può importare e correggere dopo.

Quando entrano dei casi d'uso e il progetto scelto ha nelle Proprietà un'opzione diversa da quella del programma (le cifre decimali dei reali, il carattere di riempimento o i posti della pila delle chiamate), il riepilogo ha una riga per ognuna, coi due valori: un caso importato può non essere raggiunto, e si corregge il suo output atteso, oppure l'opzione nelle Proprietà. Le opzioni del programma restano le sue.

Se il nome è già di un dato o di un'altra specie (una funzione importata che si chiama come un dato del programma), si può solo rinominare. La casella **con i loro casi d'uso**, spuntata di partenza, porta anche i casi d'uso di ciò che entra.

**Importa** fa tutto in un passo solo: **Annulla** (Ctrl+Z) toglie tutto ciò che è entrato. Quando non entra niente, perché è già tutto nel programma, il riepilogo lo dice e «Importa» resta spento. Ciò che entra va in fondo all'elenco delle procedure e delle funzioni; i punti di interruzione non entrano.

### La cartella delle librerie

La cartella delle librerie si sceglie nelle Impostazioni, scheda «Percorsi» (§14): per esempio una cartella condivisa con la classe. Di partenza sta accanto a quella degli esempi, e non c'è finché non ci entra la prima libreria; AlgoDesign non ne fornisce. Un progetto segnato come libreria ci entra con **Aggiungi il progetto aperto**, in fondo alla finestra dell'importazione, nel gruppo scelto lì accanto («Le mie librerie», un altro gruppo che c'è, o uno nuovo con «Nuovo gruppo…»); se il nome del file è già usato, il file nuovo diventa «Nome (2).algo». Con un progetto non segnato il comando è spento, e la riga accanto dice di spuntare «È una libreria» nelle Proprietà. Le librerie non si eliminano dalla finestra: si eliminano dalla cartella, col sistema.

## 12. Gli esempi

Dal menu **Aiuto**, **Esempi…** apre la finestra degli esempi: i progetti di una cartella, divisi in **gruppi**, uno per ogni sua sottocartella. Al primo avvio la cartella riceve dodici esempi forniti con AlgoDesign, in tre gruppi:

- **Primi passi**: «Media dei voti», «Pari o dispari», «Primo quadrato oltre 20», «Fattoriale di 13»;
- **Cicli per e per ogni**: «Media dei voti coi cicli per», «Parola al contrario»;
- **Funzioni e procedure**: «Media dei voti con le funzioni», «Una procedura riceve copie», «Una funzione che ne chiama un'altra», «Fattoriale con la ricorsione», «Sequenza di Fibonacci con la ricorsione», «Ricorsione senza uscita».

Un gruppo si apre e si chiude con un clic sul suo nome; la **ricerca** in cima trova un esempio dal nome o dalla descrizione. **Apri** ne apre una copia, che non è legata al file: per conservarla si usa «Salva con nome». **Aggiungi il progetto aperto** lo mette fra gli esempi, nel gruppo scelto lì accanto («I miei esempi», oppure uno nuovo con «Nuovo gruppo…»). **Elimina** cancella un esempio, ed **Elimina il gruppo** cancella un gruppo creato da te, coi suoi esempi (i gruppi degli esempi forniti no): tutti e due chiedono prima. **Ripristina gli esempi forniti** rimette quelli originali, ognuno nel suo gruppo.

In una cartella usata da una versione precedente, gli esempi forniti si spostano da soli nei loro gruppi, i tuoi file restano dove sono, e gli esempi nuovi arrivano con «Ripristina gli esempi forniti». La cartella si sceglie nelle Impostazioni, scheda «Percorsi» (§14), accanto a quella delle librerie: per esempio una cartella condivisa con la classe.

Dallo stesso menu, **Guida per lo studente** apre questa guida in una finestra a destra, nella lingua dell'interfaccia: a sinistra i capitoli (un clic porta al capitolo), a destra il testo, con sopra la ricerca (una parola, poi Invio per andare alla successiva). La finestra resta aperta mentre si lavora: l'app e i suoi tasti funzionano, e se la lingua cambia la guida cambia con lei, restando sullo stesso capitolo. Nelle Impostazioni, scheda «Aspetto», la si può anche spostare, trascinandone il titolo, e ridimensionare dall'angolo in basso. Si chiude con «Chiudi» o con Esc. Infine **Informazioni su AlgoDesign** dice la versione, la sua data e le licenze.

## 13. Stampare ed esportare

Il progetto si stampa su carta o in un PDF, e il flowchart si esporta come immagine, da mettere in una relazione o in una presentazione. I due comandi sono nel menu **Progetto**; durante l'esecuzione ci sono in pausa, non mentre il programma avanza (né durante «Esegui tutti»).

### Stampare

**Stampa…** (Ctrl+P) apre la finestra «Stampa». In cima si sceglie **Di quali procedure e funzioni**: **Tutte**, oppure **Solo quella mostrata**, cioè quella della scheda aperta. Con «Tutte», la casella **Ogni procedura e funzione in un foglio nuovo** fa cominciare ognuna da un foglio suo. Sotto ci sono le parti da stampare, nell'ordine in cui escono, ognuna con la sua casella:

- **Progetto**: il nome, l'autore, la descrizione e le note;
- **Dati**: le tabelle della vista dei dati, con in cima una tabella per ogni record del progetto, coi suoi campi e il loro tipo;
- **Flowchart**: con **Adatta al foglio** ogni flowchart sta in un foglio solo, anche se il testo diventa piccolo; altrimenti il **Testo minimo del flowchart (punti)**, da 6 a 12 (8 di partenza), decide quando un flowchart va su più fogli. Un flowchart più largo del foglio si stampa più piccolo, e la finestra lo dice. In pausa, **Con i segni dell'esecuzione** stampa anche il blocco corrente e i punti di interruzione;
- **Codice in**, col menu accanto dei linguaggi accesi nelle Impostazioni (§14): il codice generato, su fogli verticali o orizzontali;
- **Flowchart e codice affiancati**: al posto del flowchart e del codice, su fogli orizzontali, il flowchart a sinistra e il codice a destra, nel linguaggio scelto accanto a «Codice in». Si sceglie solo insieme al flowchart e al codice. Il Python, il C e il TypeScript finiscono con le **Funzioni di supporto**, in fondo, col solo codice;
- **Casi d'uso**: per ogni caso il nome, la descrizione, i valori scritti nella console e l'output atteso.

Di partenza sono scelti il flowchart e il codice affiancati, nel linguaggio della linguetta mostrata. Se il programma non si scrive nel linguaggio scelto, o se il progetto ha errori, al posto del codice si stampa l'elenco di ciò che va cambiato. Più sotto si scelgono i colori (a colori, a toni di grigio, in bianco e nero) e che cosa va nel piè di pagina (il numero di pagina, la data e l'ora). Ogni foglio ha in alto il nome del progetto e quello della parte. Le scelte restano fino alla chiusura di AlgoDesign.

### Un PDF

**Stampa…**, in fondo alla finestra, apre la finestra di stampa di Edge, il componente di Windows che disegna la finestra di AlgoDesign: lì si sceglie la stampante e si vedono i fogli come usciranno. Per avere un PDF scegli la destinazione **Salva come PDF**, poi **Salva**, e scrivi il nome del file nella finestra di Windows. Sui fogli ci sono solo l'intestazione e il piè di pagina di AlgoDesign, non la data, il titolo e l'indirizzo che Edge aggiunge alle pagine web.

### Esportare il flowchart

**Esporta il flowchart…** esporta il flowchart della scheda mostrata. La finestra dice di quale flowchart si tratta e fa scegliere il **Formato**, **PNG (immagine)** o **SVG (disegno)**, i **Colori** (a colori, a toni di grigio, in bianco e nero) e lo **Sfondo trasparente**; senza la casella lo sfondo è bianco. **Esporta…** apre la finestra di Windows per salvare, col nome del progetto e, per una procedura o una funzione, il suo nome fra parentesi: per esempio «media (leggi_numero).png». Il PNG è disegnato al doppio della misura, perché resti nitido; l'SVG si ingrandisce quanto si vuole senza perdere nitidezza. In pausa l'immagine ha i segni dell'esecuzione: il blocco corrente e i punti di interruzione. Le scelte restano fino alla chiusura di AlgoDesign.

## 14. Le Impostazioni

Il pulsante **Impostazioni** apre una finestra a sei schede; le scelte valgono dopo **Conferma** e restano dopo il riavvio:

- **Aspetto**: la lingua (italiano o inglese; si cambia anche dalla riga di stato, §2), i colori del flowchart (Tenui, Contrasto forte, Bianco e nero) e i colori dei blocchi (più sotto), le condizioni lunghe su una o due righe, i valori iniziali mostrati nel flowchart sotto «Inizio» o nascosti, e il valore iniziale di un vettore in un elenco o con un valore solo, come si disegnano i cicli «per» e «per ogni» e il loro riquadro (§4), il riquadro intorno ai blocchi selezionati (§3), la copia di un vettore o di un record col suo nome, compatta o espansa (§4), la domanda nel blocco di Lettura (§3), l'aspetto dei pulsanti della barra, i comandi dell'esecuzione in una barretta sopra il flowchart, la ricerca nella guida e la sua finestra fissa o da spostare (§12);
- **Modifica**: dove si scrivono i campi di un blocco (in un riquadro accanto al blocco o in un pannello a destra) e quelli di un dato (in una scheda sotto la riga o in ogni cella), se «Aggiungi un record» sta nella vista dei dati anche senza record (§5), quando chiedere conferma prima di eliminare un dato, se parentesi e virgolette si chiudono da sé mentre scrivi (§3), se offrire di salvare un'esecuzione come caso d'uso (§7);
- **Limiti**: gli elementi di un vettore, i caratteri di una stringa e i caratteri di un vettore di stringhe (elementi × lunghezza massima), che si possono solo abbassare; e i posti della pila delle chiamate con cui nasce un progetto nuovo, da 5 a 500, che ogni progetto cambia poi nelle sue Proprietà (§10);
- **Percorsi**: la cartella delle librerie (§11) e quella degli esempi (§12);
- **Tabella di traccia**: come si mostrano un vettore, una matrice e una tabella (§5), che cosa ha il file CSV, le colonne che restano ferme, i separatori;
- **Console**: che cosa fa una riga troppo lunga, e i **linguaggi del codice generato** (§8): una riga per linguaggio, con la casella che gli dà la linguetta e i pulsanti ▲ e ▼ che lo spostano su e giù nell'elenco, che è l'ordine delle linguette; almeno un linguaggio resta attivo.

**I colori dei blocchi.** Nella scheda «Aspetto», sotto «Colori del flowchart», il riquadro **Colori dei blocchi** ha una riga per genere: Inizio e fine, Assegnazione, Procedura, Lettura, Scrittura, Se, Cicli (il rombo di ogni ciclo), Commento e Riquadro dei cicli. Ogni riga ha un blocco d'esempio, disegnato col colore che avrà, e le tinte da scegliere: la prima, **Come l'insieme**, lascia il colore dell'insieme scelto sopra; poi diciassette tinte per i blocchi (nove tenui e otto intense) e otto per la linea del riquadro dei cicli. Una tinta scelta vale con ogni insieme: cambiando insieme resta, e gli altri generi prendono i colori del nuovo. **Tutti come l'insieme** riporta ogni genere al colore dell'insieme. Di partenza, nei «Tenui», inizio e fine sono grigi, l'assegnazione malva, la procedura sabbia, la lettura verde, la scrittura azzurra, il «se» arancione, i cicli arancione intenso e il commento bianco; nel «Contrasto forte» gli stessi colori sono più carichi. Il giallo non c'è: è il colore del blocco corrente durante l'esecuzione.

## 15. Licenza di questa guida

Questa guida è di Giuseppe Lancellotti ed è rilasciata con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): si può copiare, distribuire e modificare, anche per scopi commerciali, citando l'autore e la licenza. Il testo completo della licenza è nel file `LICENSE-DOCS`.
