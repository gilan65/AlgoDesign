# AlgoDesign: guida ad «Accademico»

Questa guida è per chi si allena alle **Selezioni scolastiche delle Olimpiadi di Informatica** con AlgoDesign. Spiega come AlgoDesign scrive un flowchart nello pseudocodice degli esercizi delle Selezioni, che in AlgoDesign si chiama **«Accademico»**, che cosa cambia nel passaggio e come si porta in AlgoDesign un testo scritto in quella sintassi, per eseguirlo passo passo. Come si usa AlgoDesign è nella guida per lo studente (`GUIDA-PER-LO-STUDENTE.md`).

## 1. Che cos'è «Accademico»

Gli esercizi delle Selezioni scolastiche mostrano i programmi in uno pseudocodice con poche parole, tutte inglesi (`variable`, `if … then … else … end if`, `while … do … end while`, `for … in [a ... b) do … end for`, `function … end function`, `return`, `output`), e con pochi tipi: in pratica gli interi e i vettori di interi. «Accademico» è quella sintassi come linguaggio del codice generato di AlgoDesign, accanto agli altri.

È un linguaggio **da leggere**: AlgoDesign non lo esegue e non ha bisogno di un compilatore. Il programma si esegue nel flowchart, e il testo serve a vedere come lo stesso algoritmo si scrive nella forma degli esercizi. Il testo generato è sempre nella sintassi pura, senza parole in più: se un programma usa qualcosa che la sintassi non ha, al posto del testo AlgoDesign dice che cosa manca e dove (§3).

## 2. Come si accende

«Accademico» parte **spento**. Nelle **Impostazioni**, scheda **Console**, il riquadro **Linguaggi del codice generato** ha una riga per linguaggio: «Accademico» è l'ultima, senza la spunta. Spuntala e conferma: nella colonna del codice (pulsante **Genera**) compare la linguetta **Accademico**; i pulsanti ▲ e ▼ la spostano fra le altre.

Le parole di «Accademico» sono in inglese in qualunque lingua dell'interfaccia; cambiano con la lingua solo i nomi che il testo aggiunge da sé (§4.8). Come per gli altri linguaggi, **Copia** mette il testo negli appunti e **Salva…** lo scrive in un file: il nome proposto è `nome (Accademico).txt` (con l'interfaccia in inglese `nome (Academic).txt`), così non si confonde con lo pseudocodice, che propone `nome.txt` nella stessa cartella. Con un progetto che ha errori, al posto del testo c'è l'invito a correggerli, come per gli altri linguaggi.

## 3. Quali programmi ci stanno

Un programma si scrive in «Accademico» se usa solo ciò che la sintassi ha:

- **i dati**: interi e vettori di interi; i booleani, che diventano interi 0 e 1 (§4.2); le costanti (§4.3) e le costanti comuni;
- **i blocchi**: assegnazione (anche la copia di un vettore), scrittura, «se», «mentre», «ripeti», «per», «per ogni», la chiamata di una procedura, il commento (che non si scrive, §4.7);
- **le procedure e le funzioni**, coi parametri per valore e il risultato intero, booleano o vettore di interi, anche ricorsive;
- **le operazioni** `+`, `-`, `*`, `/`, `mod`, i confronti, `and`, `or`, `not`.

Non ci stanno: i tipi reale, carattere e stringa (un testo fra virgolette va bene solo in una Scrittura), la **Lettura**, i parametri *rif* e *out*, le operazioni a parola (`elevato_a`, `radice_quadrata`, `valore_assoluto`, `arrotonda` e le sue sorelle, le conversioni, `lunghezza`) e `pi_greco`. Un dato, una procedura o una funzione non può avere il nome di una parola di «Accademico»: `function`, `return`, `if`, `then`, `else`, `for`, `in`, `while`, `do`, `end`, `variable`, `and`, `or`, `not`, `mod`, `output`, `min`, `max`, `integer`. E una condizione può essere tutto il valore di un'assegnazione a un booleano, di una scrittura o di ciò che una funzione booleana restituisce (diventa un `if`, §4.2), ma non un pezzo di un'altra espressione, come l'argomento di una chiamata.

### L'elenco di ciò che manca

Quando un programma non ci sta, la linguetta «Accademico» mostra, al posto del testo, una frase col numero delle cose da cambiare e l'**elenco di tutte**, una voce per cosa, con sotto il posto: il blocco, il dato, la procedura o la funzione. **Copia** e **Salva…** sono spenti. Un clic su una voce la mostra nel programma: un blocco si sceglie nella scheda della sua procedura o funzione, un dato si apre nella vista dei dati, e la riga di stato dice che cosa fare. Per esempio, un programma che legge due interi e ne calcola la media reale dà quattro voci:

```text
Il tipo reale non è supportato in Accademico: ci sono solo gli interi.
    Il dato «media», programma principale
La Lettura non è supportata in Accademico.
    «Lettura: a», programma principale
La Lettura non è supportata in Accademico.
    «Lettura: b», programma principale
Un numero con la virgola non è supportato in Accademico.
    «Assegnazione: media ← (a + b) / 2.0», programma principale
```

Le cose che possono mancare, e che cosa fare (lo stesso suggerimento della riga di stato):

| Che cosa manca | Che cosa fare |
|---|---|
| il tipo reale | Usa un intero: per esempio un prezzo in euro diventa un numero di centesimi. |
| il tipo carattere | Usa un intero al suo posto: per esempio 1 per «sì» e 0 per «no» invece di 's' e 'n'. |
| il tipo stringa | Un testo si può solo scrivere: metti la frase fra virgolette direttamente nella Scrittura. |
| la Lettura | Togli la Lettura e dai il valore con un'Assegnazione, o passalo come parametro a una procedura. |
| il parametro per riferimento (*rif*) | Fai restituire il valore da una funzione, o passa il parametro per valore se non va cambiato. |
| il parametro per uscita (*out*) | Fai restituire il valore da una funzione invece di metterlo nel parametro. |
| un numero con la virgola | Scrivi un intero: per esempio conta in decimi e scrivi 25 invece di 2,5. |
| un carattere fra apici | Usa un intero al suo posto: per esempio 1 per «sì» e 0 per «no». |
| un testo fra virgolette fuori da una Scrittura | Sposta il testo nella Scrittura che lo mostra: per esempio scrivi "Totale: " e poi il dato. |
| `elevato_a` | Calcola la potenza con le moltiplicazioni: per esempio x × x × x per il cubo, o con un ciclo. |
| `radice_quadrata` | Cerca la radice con un ciclo: il numero r più grande con r × r ≤ n. |
| `valore_assoluto` | Usa un Se: quando x è minore di 0, assegna a x il valore 0 - x. |
| `arrotonda`, `per_difetto`, `per_eccesso`, `parte_intera` | Togli l'operatore e lavora con gli interi: la divisione fra interi dà già la parte intera. |
| le conversioni (`converti_a_intero` e le altre) | Togli la conversione e lavora solo con interi e vettori di interi. |
| `lunghezza` | Passa la lunghezza come parametro intero: per esempio n accanto al vettore v. |
| `pi_greco` | Usa un intero al suo posto: per esempio 314 se fai i conti in centesimi. |
| un nome che è una parola di «Accademico» | Cambia il nome: per esempio «massimo» invece di «max», «fine» invece di «end». |
| una condizione usata come valore | Metti la condizione in un Se che assegna 1 o 0 a un dato intero, e usa il dato. |

## 4. Come il flowchart diventa testo

Ogni esempio di questa sezione è uscito da AlgoDesign: prima il programma come lo scrive lo **pseudocodice** di AlgoDesign (il flowchart in righe, con le parole italiane), poi lo stesso programma in «Accademico». Il rientro è di quattro spazi per livello. I simboli sono quelli della sintassi: `←` per l'assegnazione, `×` per la moltiplicazione, `≠`, `≤`, `≥` per i confronti, `→` per il tipo del risultato; il meno è il trattino. Le parentesi si mettono dove servono, e sempre fra `and` e `or` mescolati e attorno a `mod` accanto a `×` o `/`.

### 4.1 I dati

Ogni dato si dichiara in testa (`variable nome: integer`, e `integer[]` per un vettore), senza valore: in «Accademico» una variabile dichiarata non ha valore. I valori iniziali diventano assegnazioni subito dopo le dichiarazioni, un vettore con l'elenco fra quadre. Il programma principale non ha intestazione né fine: le sue righe stanno al livello più esterno, dopo le procedure e le funzioni.

```text
PROGRAMMA massimo-e-pari

DATI
    v: vettore di 5 interi ← {4, 8, 15, 16, 23}
    x: intero
    massimo: intero ← 0
    i: intero
```

```text
variable v: integer[]
variable x: integer
variable massimo: integer
variable i: integer
v ← [4, 8, 15, 16, 23]
massimo ← 0
```

### 4.2 Il booleano

«Accademico» non ha il tipo booleano: un booleano diventa un **intero**, con 1 per vero e 0 per falso. In una condizione, un booleano `primo` diventa `primo == 1`, e `not primo` diventa `primo == 0`. Le condizioni si scrivono solo dopo `if` e `while`: un booleano calcolato da una condizione (`primo ← n > 1`) diventa un `if` che assegna 1 o 0. Lo stesso vale per una condizione scritta con una Scrittura, o restituita da una funzione booleana.

```text
    primo ← n > 1
```

```text
if n > 1 then
    primo ← 1
else
    primo ← 0
end if
```

Più avanti, nello stesso programma, `SE primo ALLORA` diventa `if primo == 1 then`, e `primo ← false` diventa `primo ← 0`.

### 4.3 La costante

Una costante è una variabile che si assegna una volta sola, con le altre: `BASE: intero ← 10  // costante` diventa `variable BASE: integer` e `BASE ← 10`. Le costanti comuni stanno in testa al testo, prima delle procedure e delle funzioni che le usano.

### 4.4 Il «per»

Il ciclo «per» di AlgoDesign comprende la fine (`PER d DA 2 A n - 1` arriva a `n - 1`); il `for` di «Accademico» va su un intervallo che **esclude** la fine, `[a ... b)`. Il «per» diventa un `for` quando è proprio lo stesso ciclo: il passo è 1, il corpo non cambia la fine, e il contatore non si usa fuori dai cicli che lo contano e non ha un valore iniziale. Allora il contatore non si dichiara, come vuole la sintassi, e la fine diventa `b + 1` (o il numero dopo, se è un numero; `n - 1` diventa semplicemente `n`):

```text
    PER j DA 1 A esponente
        p ← p * base
    FINE PER
```

```text
    for j in [1 ... esponente + 1) do
        p ← p × base
    end for
```

Altrimenti diventa il `while` equivalente, col contatore dichiarato: per esempio con un passo diverso da 1.

```text
    PER i DA 0 A 4 PASSO 2
        SCRIVI v[i], " "
    FINE PER
```

```text
i ← 0
while i ≤ 4 do
    output(v[i])
    output(" ")
    i ← i + 2
end while
```

### 4.5 Il «per ogni»

«Accademico» non ha un ciclo sugli elementi: il «per ogni» diventa un `for` sulle **posizioni** del vettore, e la prima riga del corpo prende l'elemento. La posizione ha un nome aggiunto, `_indice` (§4.8).

```text
    PER OGNI x IN v
        SE x > massimo ALLORA
            massimo ← x
        FINE SE
    FINE PER OGNI
```

```text
for _indice in [0 ... 5) do
    x ← v[_indice]
    if x > massimo then
        massimo ← x
    end if
end for
```

Se il vettore percorso è il risultato di una funzione, la funzione si chiama una volta sola, prima del ciclo, e il risultato va in un vettore aggiunto, `_sorgente`.

### 4.6 Il «ripeti»

Il «ripeti» esegue il corpo e poi controlla la condizione; il `while` di «Accademico» la controlla prima. Il «ripeti» diventa allora un `while` governato da un intero aggiunto, `_ancora` («ancora un giro»): vale 1 prima del primo giro, e in fondo a ogni giro un `if` lo rimette a 1 o a 0 secondo la condizione del «ripeti».

```text
    RIPETI
        somma ← somma + n mod BASE
        n ← n / BASE
    MENTRE n > 0
```

```text
_ancora ← 1
while _ancora == 1 do
    somma ← somma + n mod BASE
    n ← n / BASE
    if n > 0 then
        _ancora ← 1
    else
        _ancora ← 0
    end if
end while
```

### 4.7 La scrittura e il commento

`output(…)` scrive **un valore**: una Scrittura con più valori diventa un `output` per valore. L'a capo in fondo a una Scrittura (↵) non si scrive, perché la sintassi non lo esprime (§5.3).

```text
    SCRIVI "somma delle cifre: ", somma ↵
```

```text
output("somma delle cifre: ")
output(somma)
```

Il **commento** non si scrive: la sintassi non ne ha. Un commento come `// cerco un divisore fra 2 e n - 1` non compare nel testo.

### 4.8 I nomi aggiunti

I nomi che il testo aggiunge da sé cominciano col **trattino basso**, che nessun dato di AlgoDesign può avere: così non si scontrano mai coi dati del programma. Sono `_indice` (la posizione di un «per ogni»), `_sorgente` (il vettore che una funzione dà a un «per ogni») e `_ancora` (il giro di un «ripeti»); dentro un altro dello stesso genere si numerano, `_indice2`, `_ancora2`. Seguono la lingua dell'interfaccia: in inglese sono `_index`, `_source` e `_again`.

### 4.9 Procedure e funzioni

Le procedure e le funzioni vengono **prima** del programma principale, nell'ordine del progetto. Una funzione ha il tipo del risultato dopo `→` e finisce con `return`; una procedura non ha la freccia; i dati di lavoro si dichiarano in testa, con un rientro.

```text
PROGRAMMA potenze

DATI
    k: intero

REGOLE
    PER k DA 0 A 5
        SCRIVI potenza(2, k), " "
    FINE PER
FINE

FUNZIONE intero ← potenza(base: intero, esponente: intero)

DATI
    p: intero ← 1
    j: intero

REGOLE
    PER j DA 1 A esponente
        p ← p * base
    FINE PER
RESTITUISCE p
```

```text
function potenza(base: integer, esponente: integer) → integer
    variable p: integer
    p ← 1
    for j in [1 ... esponente + 1) do
        p ← p × base
    end for
    return p
end function

for k in [0 ... 6) do
    output(potenza(2, k))
    output(" ")
end for
```

La chiamata di una procedura è una riga col suo nome e gli argomenti, senza parole davanti: `mostra(n)`.

## 5. Le differenze da sapere

Il testo in «Accademico» e il flowchart fanno lo stesso calcolo, con queste differenze.

### 5.1 Gli interi

Gli interi delle Olimpiadi **non hanno limite**. Quelli di AlgoDesign vanno da −2 147 483 648 a 2 147 483 647, come in C: un calcolo che esce da lì si ferma con «Il risultato non sta in un intero.». Il fattoriale di 13 (6 227 020 800) in un esercizio delle Selezioni si calcola; in AlgoDesign il programma si ferma sulla moltiplicazione che lo supera. Se un esercizio lavora con numeri così grandi, AlgoDesign ti mostra il procedimento fino a quel punto, ma non il risultato.

### 5.2 `min` e `max`

Gli esercizi possono usare `min` e `max`, che il flowchart non ha. Lo strumento del §6 si ferma con la riga:

```text
ERRORE il-minimo.txt, riga 5: «min» non c'è nel flowchart: scrivila come una funzione
```

Scrivi nel testo una funzione `minimo` (o `massimo`) e usa quella. Nel verso opposto, un dato, una procedura o una funzione del flowchart non può chiamarsi `min` o `max` se il programma deve scriversi in «Accademico» (§3).

### 5.3 L'a capo

`output(…)` non dice se dopo il valore si va a capo. Dal flowchart al testo l'a capo si perde (§4.7); dal testo al flowchart (§6) ogni `output` diventa una Scrittura **con** l'a capo, cioè un valore per riga. Un programma letto da un testo scrive quindi gli stessi valori nello stesso ordine, ma uno per riga: per esempio `output(x)` e `output(y)` diventano `SCRIVI x ↵` e `SCRIVI y ↵`.

### 5.4 I booleani scritti

Nel flowchart una Scrittura di un booleano scrive `true` o `false`; in «Accademico» il booleano è un intero, e si scrive 1 o 0. Dal testo al flowchart ogni dato diventa un intero.

## 6. Dal testo al flowchart: lo strumento `algodesign-accademico`

Lo strumento fa il passaggio inverso: legge un testo in «Accademico» e ne fa una **libreria** di AlgoDesign (§10 della guida per lo studente), dove ogni `function` del testo diventa una procedura o una funzione. Così un esercizio delle Selezioni si apre in AlgoDesign e si esegue passo passo, con la tabella di traccia.

Per Windows lo strumento è un programma a sé, `algodesign-accademico.exe`, in un pacchetto a parte, `AlgoDesign-Accademico-0.6.0-beta.2-windows.zip`, accanto a quello di AlgoDesign: si estrae dove si preferisce, nasce la cartella `AlgoDesign-Accademico-0.6.0-beta.2`, e non chiede di installare nulla. Nella cartella ci sono anche un `LEGGIMI.md` breve (in inglese `README.md`) e questa guida. Si usa dal **Terminale** di Windows: in Esplora file, col tasto destro nella cartella dello strumento, si apre il Terminale lì, e si scrive `.\algodesign-accademico` al posto di `algodesign-accademico` negli esempi che seguono (il Terminale non avvia un programma della cartella senza `.\`); i testi si danno col loro percorso, o si copiano nella stessa cartella. Chi ha il codice di AlgoDesign e Bun scrive `bun run accademico` al posto di `algodesign-accademico`, dalla cartella `app`; le opzioni sono le stesse.

```sh
algodesign-accademico <testo.txt> [-l libreria.algo] [-o uscita.algo] [-n nome] [-d dimensione] [-r] [-s]
```

| Opzione | Che cosa fa |
|---|---|
| `<testo.txt>` | il testo da leggere, in UTF-8 |
| `-l libreria.algo` | aggiunge a questa libreria; senza, ne nasce una nuova |
| `-o uscita.algo` | dove scrivere; senza, nella libreria di `-l`, oppure accanto al testo, col suo nome e `.algo` |
| `-n nome` | il nome della procedura che porta il codice fuori dalle funzioni; senza, il nome del file (`conta-pari.txt` dà `conta_pari`) |
| `-d dimensione` | la lunghezza di un vettore che il testo non dice; senza, 10 |
| `-r` | rinomina le procedure, le funzioni e i dati del testo che hanno un nome già usato o riservato dal flowchart, invece di fermarsi |
| `-s` | sostituisce il file d'uscita, se c'è già; senza, lo strumento si ferma |
| `-h` | mostra l'aiuto |

Il **codice fuori dalle funzioni** diventa una procedura, coi nomi che usa senza dichiararli come parametri: così si prova da sola con F5 sulla sua scheda, dando i valori dei parametri nella console. Una `function` del testo che c'è già, identica, nella libreria non entra di nuovo. Lo strumento accetta anche `−` per il meno, `…` per i tre punti e `int` per `integer`.

### Che cosa stampa

Una riga per ogni **trasformazione** (il testo usa qualcosa che il flowchart non ha, e lo strumento costruisce il flowchart equivalente), una per ogni **nota** (ciò che lo strumento ha deciso senza cambiare il programma), una per ogni procedura o funzione aggiunta o già presente, e infine il file scritto. Le trasformazioni sono:

- un `return` **prima della fine** di una funzione: ciò che segue va nell'altro ramo del «se», il valore in un dato `risultato`; dentro un ciclo, un intero `finito` ferma il ciclo e salta ciò che resta;
- lo **scambio** `(a, b) ← (b, a)`: tre assegnazioni con un dato `appoggio`;
- un **elenco** fuori dai valori iniziali (`v ← [1, 2, 3]` a metà del programma): un'assegnazione per elemento;
- una **dichiarazione** che non sta in testa: va fra i dati della funzione;
- con `-r`, un nome già usato o riservato dal flowchart: diventa lo stesso nome con `_2` (o il primo numero libero).

Le note dicono che un nome mai dichiarato è diventato un parametro, la lunghezza data a un vettore che non la dice, `int` letto come `integer`, e il nome della procedura del codice fuori dalle funzioni.

Un esempio. Il testo `conta-pari.txt` ha due funzioni, `conta_pari` e `primo_negativo` (che ha un `return` dentro un ciclo), e quattro righe fuori dalle funzioni che le provano. Il nome del file darebbe alla procedura il nome `conta_pari`, che è già della prima funzione: lo strumento si ferma, e con `-n` le si dà un altro nome.

```sh
algodesign-accademico conta-pari.txt -o esercizi.algo -n prova_conta
```

```text
TRASFORMAZIONE riga 15 (return): un «return» prima della fine: ciò che segue va nell'altro ramo, il valore nel dato del risultato
NOTA riga 21 (procedura): il codice fuori dalle funzioni diventa la procedura prova_conta
AGGIUNTA conta_pari
AGGIUNTA primo_negativo
AGGIUNTA prova_conta
SCRITTO esercizi.algo
```

Un secondo testo, `ordina-due.txt`, scambia due numeri che non dichiara; con `-l` entra nella stessa libreria:

```sh
algodesign-accademico ordina-due.txt -l esercizi.algo
```

```text
TRASFORMAZIONE riga 2 (scambio): lo scambio diventa tre assegnazioni con un dato d'appoggio
NOTA riga 1 (parametro): x non è dichiarata: diventa un parametro
NOTA riga 1 (parametro): y non è dichiarata: diventa un parametro
NOTA riga 1 (procedura): il codice fuori dalle funzioni diventa la procedura ordina_due
AGGIUNTA ordina_due
SCRITTO esercizi.algo
```

Nella libreria, `primo_negativo` è diventata così (lo pseudocodice di AlgoDesign):

```text
FUNZIONE intero ← primo_negativo(v: vettore di 6 interi)

DATI
    i: intero ← 0
    risultato: intero
    finito: intero ← 0

REGOLE
    MENTRE finito == 0 and i < 6
        SE v[i] < 0 ALLORA
            risultato ← i
            finito ← 1
        FINE SE
        i ← i + 1
    FINE MENTRE
    SE finito == 0 ALLORA
        risultato ← -1
    FINE SE
RESTITUISCE risultato
```

### Quando si ferma

Lo strumento non scrive nulla e si ferma, con la riga del testo, se il testo non si legge (una parola sbagliata, `min` o `max`, un'operazione del flowchart come `length` chiamata come una funzione, un `for` che cambia la sua fine o il suo contatore nel corpo, un elenco che legge il vettore che lo riceve), se un nome è già nella libreria e manca `-r`, se la libreria che ne uscirebbe ha errori, o se il file d'uscita c'è già e non è la libreria di `-l` e manca `-s` (e sempre se `-o` è il testo stesso). Il nome della procedura del codice fuori dalle funzioni non si rinomina con `-r`: se c'è già, scegline un altro con `-n`; un dato che ha quel nome, con `-r`, sì.

## 7. Come allenarsi alle Selezioni scolastiche

Gli esercizi sullo pseudocodice chiedono di solito che cosa scrive un programma, o che valore restituisce una funzione con certi argomenti. Un modo di lavorare con AlgoDesign:

1. **Prima a mano.** Leggi il testo e prevedi la risposta su carta, con una tabella delle variabili riga per riga. È quello che farai alla prova.
2. **Porta il testo in AlgoDesign.** Copia il testo in un file `.txt` (in UTF-8) e passalo allo strumento (§6). Leggi le trasformazioni: ognuna ti dice dove il programma usa qualcosa che va guardato con attenzione, come un `return` a metà di un ciclo.
3. **Eseguilo passo passo.** Apri la libreria in AlgoDesign e scegli la scheda della procedura del codice fuori dalle funzioni, o della funzione che l'esercizio chiede: F5 la prova da sola (i parametri si chiedono nella console), Passo la segue azione per azione, e la **tabella di traccia** mostra i valori come la tua tabella su carta. Dove le due tabelle si separano c'è il passo che avevi sbagliato.
4. **Fissa la risposta con un caso d'uso.** Un caso d'uso con gli argomenti dell'esercizio e la risposta come output atteso (§6 e §8 della guida per lo studente) ti dice subito se una modifica cambia il risultato.
5. **Al contrario.** Progetta tu un algoritmo col flowchart, accendi «Accademico» e guarda il testo che ne esce: è la forma in cui lo troverai alle Selezioni. Prova a prevedere il testo prima di aprire la linguetta.

Ricorda le differenze del §5: con numeri molto grandi AlgoDesign si ferma dove l'esercizio continua, e un programma letto da un testo scrive un valore per riga.

## 8. Riepilogo

| Nel flowchart | In «Accademico» | Vedi |
|---|---|---|
| un dato intero, o un vettore di interi | `variable x: integer`, `variable v: integer[]`, il valore iniziale assegnato dopo | §4.1 |
| un dato booleano | un intero 0/1; la condizione assegnata diventa un `if` | §4.2 |
| una costante | una variabile assegnata una volta | §4.3 |
| assegnazione `x ← e` | `x ← e`, coi simboli `×` `≠` `≤` `≥` | §4 |
| Scrittura | un `output(…)` per valore, senza a capo | §4.7 |
| «se», «mentre» | `if … then … else … end if`, `while … do … end while` | §4 |
| «ripeti» | `while` con `_ancora` | §4.6 |
| «per» | `for … in [a ... b + 1) do`, oppure il `while` equivalente | §4.4 |
| «per ogni» | `for _indice in [0 ... n) do` con l'elemento nella prima riga | §4.5 |
| commento | non si scrive | §4.7 |
| procedura, funzione | `function nome(…)`, `function nome(…) → integer`, `return`, `end function` | §4.9 |
| Lettura, reale, carattere, stringa, *rif*, *out*, operazioni a parola | non ci stanno: l'elenco di ciò che manca | §3 |

## 9. Licenza di questa guida

Questa guida è di Giuseppe Lancellotti ed è rilasciata con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): si può copiare, distribuire e modificare, anche per scopi commerciali, citando l'autore e la licenza. Il testo completo della licenza è nel file `LICENSE-DOCS`.
