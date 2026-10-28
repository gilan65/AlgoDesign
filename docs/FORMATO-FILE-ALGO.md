# Il formato del file `.algo`

Un progetto di AlgoDesign è **un solo file**, con l'estensione `.algo`: un testo JSON in UTF-8 che contiene i metadati, le opzioni, le costanti comuni, il programma principale con le sue procedure e funzioni (ciascuna coi suoi dati e i suoi blocchi) e i casi d'uso. Questo documento spiega il file campo per campo. La stessa forma è scritta come **JSON Schema** (draft 2020-12) nel file [`algo.schema.json`](algo.schema.json), accanto a questo.

## 1. A che cosa serve lo schema

Lo schema serve a chi apre o scrive un file `.algo` fuori da AlgoDesign. Un editor che conosce gli JSON Schema (per esempio Visual Studio Code) completa i nomi dei campi e segnala un campo sconosciuto, un tipo sbagliato o un valore fuori elenco. In Visual Studio Code basta dire che i file `.algo` sono JSON e associarli allo schema, nelle impostazioni del progetto:

- `"files.associations": { "*.algo": "json" }`
- `"json.schemas": [ { "fileMatch": ["*.algo"], "url": "./docs/algo.schema.json" } ]`

Lo schema è ricavato dal lettore dei file di AlgoDesign: dice gli stessi campi, gli stessi tipi, gli stessi elenchi di valori e gli stessi campi obbligatori.

## 2. Che cosa controlla l'apertura, e che cosa no

Quando AlgoDesign apre un file, **rifiuta** solo ciò che non saprebbe rappresentare: un testo che non è JSON, un campo sconosciuto (un refuso non passa in silenzio), un campo obbligatorio che manca, un tipo sbagliato, un valore fuori dal suo elenco, un campo che quel genere di funzione o di blocco non ammette. In più rifiuta cinque cose che **lo schema non sa dire**:

- due funzioni o due blocchi con lo stesso `id`: ogni `id` è unico in tutto il progetto, le funzioni, i blocchi e le loro fini insieme;
- due casi d'uso con lo stesso nome fra i casi del programma, o fra quelli di una stessa procedura o funzione;
- una **chiave ripetuta** nello stesso oggetto JSON (`"name"` scritto due volte): un lettore JSON qualunque terrebbe l'ultima in silenzio;
- più di **50 livelli** di blocchi uno dentro l'altro: i blocchi del programma sono il primo livello, quelli nel corpo di un ciclo o in un ramo il secondo, e così via;
- un carattere di riempimento che è metà di una coppia di caratteri UTF-16 (un surrogato isolato).

Un **BOM** UTF-8 in testa al file si accetta (lo scrivono alcuni editor di Windows); AlgoDesign non lo scrive mai.

Tutto il resto **non** impedisce di aprire il file: le regole dei nomi, i valori iniziali, le costanti senza valore, le espressioni scritte male, un passo zero in un ciclo «per», un blocco atteso che non esiste. AlgoDesign apre il file e mostra gli errori nella riga di stato e sui blocchi: il programma non parte finché non si correggono. Così un refuso non rende illeggibile un progetto.

## 3. Le regole generali

- **Il file non dipende dalla lingua.** Chiavi, valori degli elenchi e operatori a parola nelle espressioni sono in inglese: AlgoDesign li mostra tradotti nella lingua dell'interfaccia, e lo stesso file si apre identico in italiano e in inglese.
- **Espressioni come testo.** Le condizioni, i valori, le destinazioni, gli argomenti e i valori iniziali sono stringhe, scritte come nei campi dei blocchi, con gli operatori a parola in inglese (`and`, `or`, `not`, `mod`, …) e i letterali come in un'espressione: `"5"`, `"2.0"`, `"'è'"`, `"\"ciao\""`, `"true"`.
- **I dati non stanno nei blocchi.** I dati di una funzione sono nell'elenco `data`, nell'ordine della vista dei dati; nessun blocco crea un dato.
- **Ciò che cambia il risultato sta nel file.** Le opzioni che cambiano il risultato (il carattere di riempimento, i decimali dei reali, i posti nella pila delle chiamate) sono nel progetto; i limiti delle Impostazioni no, perché proteggono il computer e non cambiano l'output.
- **Il salvataggio** scrive i campi nell'ordine delle tabelle qui sotto, con un rientro di 2 spazi e un a capo finale, e omette un'opzione uguale al suo valore predefinito.
- **La versione dello schema** dice la forma che il file usa, ed è `2`: AlgoDesign la scrive in ogni file che salva. Un file della versione `1` (scritto da AlgoDesign 0.6 o da una versione precedente) si apre, e salvato diventa `2` senza altre differenze; una versione che AlgoDesign non conosce non si apre: è un file scritto da una versione più recente dell'applicazione.

## 4. Il progetto

### Il progetto intero — `progetto`

L'oggetto più esterno del file.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `format` | `string` | sì | sempre `algodesign`: riconosce il file |
| `schema_version` | `integer` | sì | `1` o `2`: salvando, AlgoDesign scrive la più recente |
| `metadata` | `object` | sì | il nome e la descrizione del progetto |
| `options` | `object` | no | assente: tutte le opzioni al valore predefinito |
| `records` | `array` | no | i record del progetto: i tipi coi campi, visibili da ogni procedura e funzione |
| `shared_constants` | `array` | no | le costanti comuni a tutto il progetto, con la forma di un dato |
| `functions` | `array` | sì | il programma principale, le procedure e le funzioni; esattamente una ha `kind` uguale a `main` |
| `test_cases` | `array` | no | i casi d'uso del programma principale |

### I metadati — `metadata`

Testo libero, mai tradotto.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `name` | `string` | sì | il nome del progetto, non vuoto |
| `author` | `string` | no | |
| `description` | `string` | no | |
| `notes` | `string` | no | |
| `library` | `boolean` | no | `true`: il progetto è una libreria, cioè sta nella cartella delle librerie; un `false` si legge come assente, e salvando non si scrive |

### Le opzioni — `options`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `fill_character` | `string` | no | un solo carattere, mai quello di codice 0; il predefinito è lo spazio. Riempie gli elementi in più quando una stringa diventa un vettore di caratteri |
| `real_decimals` | `integer` | no | da 0 a 15, il predefinito è 2: le cifre decimali con cui si scrive un reale |
| `call_stack_limit` | `integer` | no | da 5 a 500, il predefinito è 500: le chiamate in corso delle procedure e delle funzioni che richiamano sé stesse, direttamente o passando per altre, che la pila delle chiamate tiene. La chiamata successiva ferma l'esecuzione (`recursion_too_deep`), nell'app e nel codice generato |

## 5. I dati

### Un record — `records[]`

Un record è un tipo coi campi, definito una volta nel progetto e visibile da ogni procedura e funzione: un dato di tipo
`record` ne nomina uno. Le regole dei nomi, i nomi unici e almeno un campo le controlla il controllo statico: un record
senza campi si apre, e il progetto non parte.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `name` | `string` | sì | il nome del record, con le regole dei nomi dell'app; mai quello di un altro record, di un dato, di una procedura o di una funzione, né il nome di un tipo |
| `fields` | `array` | sì | i campi, nell'ordine in cui il valore iniziale li elenca; almeno uno, coi nomi tutti diversi |

### Un campo di un record — `records[].fields[]`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `name` | `string` | sì | il nome del campo, con le regole dei nomi dell'app |
| `type` | `string` | sì | `integer` (intero), `real` (reale), `character` (carattere), `string` (stringa), `boolean` (booleano) |
| `max_length` | `integer` | no | solo per una stringa: la lunghezza massima, da 1 al limite delle Impostazioni; assente vale 255 |

### Un dato — `shared_constants[]`

La stessa forma vale per una costante comune (`shared_constants`) e per un dato di una funzione (`data`). Ogni dato è una riga della vista dei dati, e l'ordine dell'elenco è quello della vista.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `name` | `string` | sì | il nome, con le regole dei nomi dell'app |
| `type` | `string` | sì | `integer` (intero), `real` (reale), `character` (carattere), `string` (stringa), `boolean` (booleano), `record` (un record del progetto, col suo nome nel campo che segue) |
| `record` | `string` | no | col tipo `record`, e solo con lui, obbligatorio: il nome di un record del progetto |
| `size` | `integer` | no | presente: il dato è un vettore di tanti elementi, da 1 al limite delle Impostazioni (con `columns`, le righe di una matrice); assente: un dato semplice |
| `columns` | `integer` | no | solo con `size`: il dato è una matrice di `size` righe e di tante colonne, da 1 in su; ogni riga è un vettore delle colonne, e il limite delle Impostazioni vale sul totale, righe per colonne. Un record non fa una matrice |
| `constant` | `boolean` | no | `true`: una costante, che vuole un valore iniziale; assente: una variabile. Una costante comune ha sempre `true` |
| `initial` | `string`, `array` o `object` | no | il valore iniziale: un letterale, e per un intero o un reale anche col meno davanti (`"-7"`); per un vettore l'elenco completo dei letterali, uno per elemento, oppure `{ "each": … }` con un letterale per tutti; per una matrice l'elenco delle righe, ognuna l'elenco dei suoi letterali (`[["1", "2"], ["3", "4"]]`), oppure `{ "each": … }`; per un record l'elenco dei letterali, uno per campo nell'ordine dei campi |
| `role` | `string` | no | `input` (di input), `output` (di output), `input_output` (di input e output); assente: un dato di lavoro. Mai su una costante né su un parametro |
| `max_length` | `integer` | no | solo per una stringa: la lunghezza massima, da 1 al limite delle Impostazioni; assente vale 255 |
| `parameter` | `string` | no | presente: il dato è un parametro della procedura o della funzione, e la sua posizione è quella nell'elenco; `value` (per valore: arriva una copia), `reference` (*rif*: il dato entra ed esce), `out` (*out*: il dato solo esce). Un parametro non ha valore iniziale, ruolo né il segno di costante; una funzione ha solo parametri per valore |

### Lo stesso valore per tutti gli elementi — `shared_constants[].initial{each}`

La forma `{ "each": … }` del valore iniziale di un vettore: tutti gli elementi partono dallo stesso valore.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `each` | `string` | sì | il letterale di ogni elemento |

## 6. Il programma, le procedure e le funzioni

Ogni elemento di `functions` ha un genere, nel campo `kind`, che decide quali altri campi ammette. Un campo che il genere non ammette (per esempio il nome del programma principale) rende il file illeggibile.

### Il programma principale — `functions[]{main}`

Non ha nome nel file: l'app lo chiama «Programma principale». I suoi casi d'uso stanno nel campo `test_cases` del progetto.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `main` |
| `data` | `array` | sì | i dati del programma, anche nessuno; non ha parametri |
| `body` | `array` | sì | la sequenza dei blocchi, anche vuota |
| `end` | `object` | sì | il blocco di fine |

### Un blocco — `blocco{assignment}`

Ogni blocco ha `id`, `kind` e, facoltativo, `breakpoint`; gli altri campi dipendono dal genere. L'`id` è unico nel progetto e non cambia quando si modifica il blocco: lo usano i punti di interruzione e gli errori attesi dei casi d'uso. `breakpoint` uguale a `true` è un punto di interruzione attivo.

L'assegnazione: la destinazione riceve il valore dell'espressione.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `assignment` |
| `breakpoint` | `boolean` | no | |
| `target` | `string` | sì | la destinazione: un nome, o un elemento come `v[i]` |
| `value` | `string` | sì | l'espressione |

### La lettura — `blocco{read}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `read` |
| `breakpoint` | `boolean` | no | |
| `target` | `string` | sì | la destinazione del valore letto |

### La scrittura — `blocco{write}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `write` |
| `breakpoint` | `boolean` | no | |
| `values` | `array` | sì | le espressioni da scrivere, una dopo l'altra, almeno una |
| `newline` | `boolean` | sì | `true`: dopo l'ultimo valore si va a capo |

### La selezione — `blocco{if}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `if` |
| `breakpoint` | `boolean` | no | |
| `condition` | `string` | sì | la condizione |
| `then` | `array` | sì | i blocchi del ramo Vero, anche nessuno |
| `else` | `array` | sì | i blocchi del ramo Falso, anche nessuno |

### Il ciclo con il controllo in testa — `blocco{while}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `while` |
| `breakpoint` | `boolean` | no | |
| `condition` | `string` | sì | Vero: un altro giro |
| `body` | `array` | sì | i blocchi del corpo |

### Il ciclo con il controllo in coda — `blocco{repeat}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `repeat` |
| `breakpoint` | `boolean` | no | |
| `body` | `array` | sì | i blocchi del corpo, eseguiti almeno una volta |
| `condition` | `string` | sì | Vero: un altro giro |

### Il ciclo «per» — `blocco{for}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `for` |
| `breakpoint` | `boolean` | no | |
| `counter` | `string` | sì | il nome del contatore |
| `from` | `string` | sì | l'espressione del primo valore |
| `to` | `string` | sì | l'espressione dell'ultimo valore |
| `step` | `integer` | no | il passo, un numero intero diverso da zero; assente vale 1; AlgoDesign non lo scrive quando vale 1, ma un `1` scritto a mano resta |
| `body` | `array` | sì | i blocchi del corpo |

### Il ciclo «per ogni» — `blocco{for_each}`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `for_each` |
| `breakpoint` | `boolean` | no | |
| `item` | `string` | sì | il nome del dato che riceve un elemento a ogni giro |
| `source` | `string` | sì | il vettore o la stringa da percorrere (un nome, o la chiamata di una funzione che restituisce un vettore) |
| `body` | `array` | sì | i blocchi del corpo |

### La chiamata di una procedura — `blocco{call}`

Una funzione non si chiama con un blocco: si usa dentro un'espressione.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `call` |
| `breakpoint` | `boolean` | no | |
| `callee` | `string` | sì | il nome della procedura |
| `arguments` | `array` | sì | le espressioni degli argomenti, nell'ordine dei parametri; per un parametro *rif* o *out* il nome di un dato |

### Il commento — `blocco{comment}`

Non fa nulla durante l'esecuzione.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `comment` |
| `breakpoint` | `boolean` | no | |
| `text` | `string` | sì | il testo del commento |

### La fine del programma principale — `functions[]{main}.end`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto, come quello di un blocco |
| `breakpoint` | `boolean` | no | |

### Una procedura — `functions[]{procedure}`

Compie un lavoro: legge, scrive, cambia i dati che riceve per riferimento. Si chiama con un blocco `call`.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `procedure` |
| `name` | `string` | sì | il nome della procedura |
| `data` | `array` | sì | i parametri (i dati con `parameter`) e i dati di lavoro |
| `body` | `array` | sì | la sequenza dei blocchi |
| `end` | `object` | sì | il blocco di fine |
| `test_cases` | `array` | no | i casi d'uso della procedura eseguita da sola |

### La fine di una procedura — `functions[]{procedure}.end`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `breakpoint` | `boolean` | no | |

### Un caso d'uso di una procedura o di una funzione — `functions[]{procedure}.test_cases[]`

La procedura o la funzione si esegue **da sola**: i parametri si chiedono come letture, uno per parametro nell'ordine (un parametro *out* non si chiede), e le voci li nominano col nome del parametro. Alla fine l'output ha una riga «→ » seguita da ciò che una funzione restituisce (per un vettore, una riga per elemento: `→ [0] = 4`), poi una riga «nome = valore» per ogni parametro *rif* o *out*. Una procedura con parametri *rif* o *out* va sempre a capo prima di quelle righe.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `name` | `string` | sì | unico fra i casi della stessa procedura o funzione |
| `description` | `string` | no | |
| `inputs` | `array` | sì | le voci, in ordine, anche nessuna |
| `expected` | `object` | sì | l'atteso |

### Una voce di un caso d'uso di una procedura o di una funzione — `functions[]{procedure}.test_cases[].inputs[]`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `data` | `string` | sì | il nome del parametro o del dato che riceve la riga; per un elemento di un vettore, il nome del vettore |
| `text` | `string` | no | la riga, come la si scriverebbe nella console |
| `each` | `boolean` | no | `true`: la stessa riga va a tutti gli elementi di un parametro vettore, al posto della voce del primo |

### L'atteso di un caso d'uso — `functions[]{procedure}.test_cases[].expected`

La stessa forma vale per i casi del programma (`test_cases[].expected`). L'output atteso è il **testo esatto** che il programma scrive, carattere per carattere, con gli a capo (il carattere di codice 10); le righe date alle letture non ne fanno parte. Un reale si scrive coi decimali di `real_decimals` e il punto come separatore, un booleano come `true` o `false`, in ogni lingua.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `output` | `string` | sì | il testo atteso; con un errore, il testo scritto prima dell'errore; con un errore statico, vuoto |
| `error` | `object` | no | il caso deve finire con questo errore durante l'esecuzione, su questo blocco |
| `static_error` | `object` | no | il progetto non deve partire, per questo errore del controllo; non insieme a `error` |
| `warnings` | `array` | no | tutti gli avvisi attesi del progetto; assente vale nessuno |

### Un errore atteso durante l'esecuzione — `functions[]{procedure}.test_cases[].expected.error`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `code` | `string` | sì | uno di `uninitialized`, `index_out_of_range`, `string_too_long`, `null_character_in_string`, `invalid_character_code`, `string_longer_than_array`, `same_reference`, `reference_without_value`, `integer_overflow`, `division_by_zero`, `real_to_integer_out_of_range`, `non_finite_real`, `invalid_input`, `input_exhausted`, `input_mismatch`, `unused_inputs`, `too_many_steps`, `recursion_too_deep`, `recursion_data_too_large`, `out_of_memory` |
| `block` | `string` | sì | l'`id` del blocco dove l'esecuzione si ferma; l'`id` della funzione per un errore all'inizio di una procedura o di una funzione eseguita da sola |

### Un errore statico atteso — `functions[]{procedure}.test_cases[].expected.static_error`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `code` | `string` | sì | uno di `unknown_name`, `invalid_name`, `invalid_data_item`, `assign_to_constant`, `assign_to_read_only`, `array_assignment`, `literal_out_of_range`, `literal_leading_zero`, `string_literal_too_long`, `multi_code_character`, `type_mismatch`, `condition_not_boolean`, `chained_comparison`, `chained_power`, `division_by_literal_zero`, `invalid_step`, `unknown_callee`, `argument_mismatch`, `reference_not_assignable`, `same_reference`, `function_as_statement`, `procedure_in_expression`, `limit_exceeded`, `syntax_error`, `function_with_effect`, `invalid_default_value`, `function_name_in_use`, `reference_without_value`, `unknown_record`, `unknown_record_field`, `record_name_in_use`, `invalid_record` |
| `block` | `string` | sì | l'`id` del blocco; per un dato, l'`id` della funzione che lo possiede; per una costante comune, vuoto (il progetto) |

### Un avviso atteso — `functions[]{procedure}.test_cases[].expected.warnings[]`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `code` | `string` | sì | uno di `integer_division_to_real`, `real_equality`, `useless_conversion`, `constant_loop_condition`, `input_never_read`, `output_never_written`, `missing_role`, `maybe_uninitialized`, `unused_data`, `unused_value`, `implicit_conversion` |
| `block` | `string` | sì | come per un errore statico |

### Una funzione — `functions[]{function}`

Calcola un risultato dai dati che riceve, senza leggere né scrivere, e si usa in un'espressione.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `kind` | `string` | sì | `function` |
| `name` | `string` | sì | il nome della funzione |
| `return_type` | `string` | sì | il tipo del risultato: `integer`, `real`, `character`, `string`, `boolean`, `record`; per un vettore restituito, il tipo degli elementi |
| `return_record` | `string` | no | col tipo `record`, e solo con lui, obbligatorio: il nome del record restituito |
| `return_size` | `integer` | no | presente: la funzione restituisce un vettore di tanti elementi (con `return_columns`, le righe di una matrice) |
| `return_columns` | `integer` | no | solo con `return_size`: la funzione restituisce una matrice di tante colonne |
| `return_max_length` | `integer` | no | solo per una stringa: la lunghezza massima del risultato (di ogni elemento, per un vettore); assente vale 255 |
| `default_result` | `string` | no | il valore predefinito, un letterale del tipo del risultato, che prende il posto della funzione tolta da un'espressione; assente vale `0`, `0.0`, `' '`, `""` o `false`. Un vettore non ne ha |
| `data` | `array` | sì | i parametri e i dati di lavoro |
| `body` | `array` | sì | la sequenza dei blocchi |
| `end` | `object` | sì | il blocco di fine, con ciò che la funzione restituisce |
| `test_cases` | `array` | no | i casi d'uso della funzione eseguita da sola, nella forma dei casi di una procedura |

### La fine di una funzione — `functions[]{function}.end`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `id` | `string` | sì | non vuoto, unico nel progetto |
| `return_value` | `string` | sì | l'espressione del risultato: nel disegno, «Restituisce …» |
| `breakpoint` | `boolean` | no | |

## 7. I casi d'uso del programma

### Un caso d'uso del programma — `test_cases[]`

Il caso esegue il programma principale e a ogni lettura consegna la voce successiva. Se la lettura chiede un dato diverso da quello della voce, il caso finisce con l'errore `input_mismatch`; se le voci finiscono prima delle letture, con `input_exhausted`; se ne avanzano alla fine, con `unused_inputs` sulla fine del programma.

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `name` | `string` | sì | unico fra i casi del programma; AlgoDesign non dà a un caso il nome di una procedura o funzione seguito da «/» e dal nome di un suo caso (un file che lo ha si apre) |
| `description` | `string` | no | |
| `inputs` | `array` | sì | le voci, in ordine, anche nessuna |
| `expected` | `object` | sì | l'atteso, nella forma dell'atteso dei casi di una procedura |

### Una voce di un caso d'uso del programma — `test_cases[].inputs[]`

| Campo | Tipo | Obbligatorio | Valori e regole |
|---|---|---|---|
| `data` | `string` | sì | il nome del dato che riceve la riga (del vettore, per un elemento); attraverso un parametro *rif* o *out*, il dato che riceve davvero il valore |
| `text` | `string` | sì | la riga, come la si scriverebbe nella console; anche una riga non valida, per provare l'errore |

## 8. Un esempio

Un programma che legge `n` e scrive la somma dei numeri da 1 a `n`, con un caso d'uso:

```json
{
  "format": "algodesign",
  "schema_version": 2,
  "metadata": {
    "name": "Somma dei primi numeri",
    "description": "Legge n e scrive la somma dei numeri da 1 a n."
  },
  "functions": [
    {
      "id": "f1",
      "kind": "main",
      "data": [
        { "name": "n", "type": "integer", "role": "input" },
        { "name": "i", "type": "integer", "initial": "1" },
        { "name": "somma", "type": "integer", "initial": "0", "role": "output" }
      ],
      "body": [
        { "id": "b1", "kind": "read", "target": "n" },
        { "id": "b2", "kind": "while", "condition": "i <= n", "body": [
          { "id": "b3", "kind": "assignment", "target": "somma", "value": "somma + i" },
          { "id": "b4", "kind": "assignment", "target": "i", "value": "i + 1" }
        ] },
        { "id": "b5", "kind": "write", "values": ["\"Somma: \"", "somma"], "newline": true }
      ],
      "end": { "id": "b6" }
    }
  ],
  "test_cases": [
    {
      "name": "n uguale a quattro",
      "inputs": [ { "data": "n", "text": "4" } ],
      "expected": { "output": "Somma: 10\n" }
    }
  ]
}
```

## 9. Licenza di questo documento

Questo documento è rilasciato con licenza Creative Commons Attribuzione 4.0 Internazionale (CC BY 4.0): vedi il file `LICENSE-DOCS`.
