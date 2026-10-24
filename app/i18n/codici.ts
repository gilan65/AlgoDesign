// I testi degli errori e degli avvisi, in italiano e in inglese: per ogni codice che
// cosa è successo e un suggerimento. Il tipo vuole ogni codice in ogni lingua, e
// nessun altro: una chiave mancante o in più è un errore di `tsc`. `same_reference` e `reference_without_value` sono
// un codice solo ciascuno, statico o dell'interprete secondo il caso, e hanno un testo solo.
//
// I nomi degli operatori a parola e dei blocchi sono quelli della lingua del testo.

import type { CodiceAvviso, CodiceErrore, CodiceErroreStatico } from "../core/progetto/modello";
import type { Causa, Fermata } from "../core/espressioni/analizzatore";
import { riempi, type Lingua } from "./lingue";

export type Codice = CodiceErrore | CodiceErroreStatico | CodiceAvviso;

/** `breve`: una frase, ciò che si mostra subito; `accaduto` e `suggerimento`: la spiegazione, che si apre a richiesta. */
export type TestoDelCodice = { readonly breve: string; readonly accaduto: string; readonly suggerimento: string };

/** Il numero di ogni codice, per riferirsi a un messaggio: E per gli errori, A per gli avvisi, tre cifre. Un codice nuovo
 * prende il numero dopo l'ultimo del suo genere; quelli dati non si rinumerano mai. */
export const numeroDelCodice: Record<Codice, string> = {
  uninitialized: "E001",
  index_out_of_range: "E002",
  string_too_long: "E003",
  null_character_in_string: "E004",
  invalid_character_code: "E005",
  string_longer_than_array: "E006",
  same_reference: "E007",
  integer_overflow: "E008",
  division_by_zero: "E009",
  real_to_integer_out_of_range: "E010",
  non_finite_real: "E011",
  invalid_input: "E012",
  input_exhausted: "E013",
  input_mismatch: "E014",
  unused_inputs: "E015",
  too_many_steps: "E016",
  recursion_too_deep: "E017",
  out_of_memory: "E018",
  unknown_name: "E019",
  invalid_name: "E020",
  invalid_data_item: "E021",
  assign_to_constant: "E022",
  assign_to_read_only: "E023",
  array_assignment: "E024",
  literal_out_of_range: "E025",
  literal_leading_zero: "E026",
  string_literal_too_long: "E027",
  multi_code_character: "E028",
  type_mismatch: "E029",
  condition_not_boolean: "E030",
  chained_comparison: "E031",
  chained_power: "E032",
  division_by_literal_zero: "E033",
  invalid_step: "E034",
  unknown_callee: "E035",
  argument_mismatch: "E036",
  reference_not_assignable: "E037",
  function_as_statement: "E038",
  procedure_in_expression: "E039",
  limit_exceeded: "E040",
  syntax_error: "E041",
  function_with_effect: "E042",
  invalid_default_value: "E043",
  function_name_in_use: "E044",
  reference_without_value: "E045",
  recursion_data_too_large: "E046",
  integer_division_to_real: "A001",
  real_equality: "A002",
  useless_conversion: "A003",
  constant_loop_condition: "A004",
  input_never_read: "A005",
  output_never_written: "A006",
  missing_role: "A007",
  maybe_uninitialized: "A008",
  unused_data: "A009",
  unused_value: "A010",
  implicit_conversion: "A011",
};

export const testiDeiCodici: Record<Lingua, Record<Codice, TestoDelCodice>> = {
  it: {
    // Errori dell'interprete
    uninitialized: {
      breve: "Il dato non ha ancora un valore.",
      accaduto: "Per eseguire questo blocco serve il valore di un dato che non ne ha ancora uno (nella tabella di traccia: «non inizializzata»): nessuna delle azioni fatte finora gli ha dato un valore.",
      suggerimento: "Ripercorri all'indietro le strade del flowchart che arrivano qui: su almeno una il dato non riceve mai un valore. Dagliene uno iniziale nella vista dei dati, oppure aggiungi su quella strada un'assegnazione o una lettura.",
    },
    index_out_of_range: {
      breve: "L'indice è fuori dal vettore o dalla stringa.",
      accaduto: "L'indice è fuori dal vettore o dalla stringa: va da 0 alla dimensione (o alla lunghezza) meno uno.",
      suggerimento: "Controlla il valore dell'indice e la condizione del ciclo che lo fa crescere.",
    },
    string_too_long: {
      breve: "La stringa è più lunga della lunghezza massima del dato.",
      accaduto: "La stringa ha più caratteri della lunghezza massima del dato.",
      suggerimento: "Accorcia il testo, oppure aumenta la lunghezza massima del dato nella vista dei dati.",
    },
    null_character_in_string: {
      breve: "Il carattere di codice 0 non può stare in una stringa.",
      accaduto: "Il carattere di codice 0 non può far parte di una stringa.",
      suggerimento: "Controlla il codice del carattere che entra nella stringa.",
    },
    invalid_character_code: {
      breve: "Il numero non è il codice di un carattere.",
      accaduto: "Il numero non è il codice di un carattere: i codici vanno da 0 a 1114111, tranne quelli da 55296 a 57343.",
      suggerimento: "Controlla il valore che converti in carattere.",
    },
    string_longer_than_array: {
      breve: "La stringa ha più caratteri degli elementi del vettore.",
      accaduto: "La stringa ha più caratteri degli elementi del vettore.",
      suggerimento: "Usa un vettore con più elementi, oppure una stringa più corta.",
    },
    same_reference: {
      breve: "Lo stesso dato va a due parametri per riferimento o di uscita.",
      accaduto: "Nella stessa chiamata lo stesso dato va a due parametri per riferimento o di uscita, anche come vettore e come suo elemento, o come lo stesso elemento due volte: non si può.",
      suggerimento: "Passa dati diversi, oppure copia il valore in un altro dato prima della chiamata.",
    },
    integer_overflow: {
      breve: "Il risultato non sta in un intero.",
      accaduto: "Il risultato non sta in un intero, che va da -2147483648 a 2147483647.",
      suggerimento: "Usa dati reali, oppure valori più piccoli.",
    },
    division_by_zero: {
      breve: "Il divisore vale zero.",
      accaduto: "Il divisore di una divisione fra interi o di mod vale zero.",
      suggerimento: "Risali al blocco che dà il valore al divisore: se lì può arrivare uno zero, per esempio da una lettura, quel valore va trattato su una strada a parte del flowchart, prima della divisione.",
    },
    real_to_integer_out_of_range: {
      breve: "Il reale non sta in un intero.",
      accaduto: "Il reale da convertire in intero è fuori dall'intervallo degli interi.",
      suggerimento: "Controlla il valore prima di convertirlo.",
    },
    non_finite_real: {
      breve: "Il calcolo non dà un numero reale finito.",
      accaduto: "Il calcolo non dà un numero reale finito: per esempio una divisione per zero o la radice quadrata di un negativo.",
      suggerimento: "Controlla gli operandi prima del calcolo.",
    },
    invalid_input: {
      breve: "Il valore inserito non è adatto al dato.",
      accaduto: "Il valore inserito non è adatto al dato: non è del suo tipo, è fuori dal suo intervallo, oppure è un testo più lungo della sua lunghezza massima.",
      suggerimento: "Alla console inserisci un nuovo valore: la lettura riparte da qui, e nulla di quanto fatto finora va perso. In un caso d'uso, invece, il caso si ferma: correggi l'input nel caso d'uso.",
    },
    input_exhausted: {
      breve: "Gli input sono finiti.",
      accaduto: "Il programma chiede un input, ma gli input sono finiti: per esempio quelli di un caso d'uso.",
      suggerimento: "Aggiungi l'input che manca al caso d'uso, oppure controlla quante letture fa il programma.",
    },
    input_mismatch: {
      breve: "L'input del caso d'uso va a un altro dato.",
      accaduto: "L'input del caso d'uso è destinato a un dato diverso da quello che il programma legge.",
      suggerimento: "Controlla l'ordine degli input del caso d'uso.",
    },
    unused_inputs: {
      breve: "Alcuni input del caso d'uso non sono stati letti.",
      accaduto: "Il programma è finito, ma alcuni input del caso d'uso non sono stati letti.",
      suggerimento: "Togli gli input in più, oppure controlla le letture del programma.",
    },
    too_many_steps: {
      breve: "L'esecuzione è stata fermata dopo un milione di azioni.",
      accaduto: "L'esecuzione è stata interrotta dopo un milione di azioni: sul ciclo che stava ancora girando o, se nessun ciclo girava, sull'azione in corso, per esempio dentro una funzione che richiama sé stessa più volte.",
      suggerimento: "Se è evidenziato un ciclo, eseguilo un passo alla volta e guarda, nella tabella di traccia, i dati della sua condizione: se da un giro all'altro non si avvicinano mai al valore che la cambia, il ciclo non finirà da solo. Se è dentro una funzione che richiama sé stessa due volte a ogni chiamata, come Fibonacci, il lavoro raddoppia a ogni livello: prova con un numero più piccolo.",
    },
    recursion_too_deep: {
      breve: "La procedura o la funzione è stata richiamata 500 volte, e nessuna è finita.",
      accaduto: "La procedura o la funzione è stata richiamata 500 volte, direttamente o passando per altre, e nessuna di quelle chiamate è ancora finita. Ogni chiamata in corso occupa un posto nella pila delle chiamate, e la pila ha un limite: l'esecuzione si ferma sulla chiamata che sarebbe la cinquecentunesima.",
      suggerimento: "Controlla il caso in cui la procedura o la funzione non richiama più sé stessa, come «n <= 1» nel fattoriale. Esegui un passo alla volta, scegli i livelli in «Dove sei» e guarda se, da un livello all'altro, il dato che lo decide si avvicina a quel valore.",
    },
    recursion_data_too_large: {
      breve: "I dati delle chiamate in corso non stanno più nella pila.",
      accaduto: "Ogni chiamata in corso di una procedura o funzione che richiama sé stessa tiene nella pila delle chiamate i propri dati: le copie dei vettori e delle stringhe ricevuti senza rif, i vettori e le stringhe restituiti dalle funzioni che chiama, e i testi uniti con +. La pila ha 256 KB, e con questa chiamata i dati non ci starebbero più. Succede prima delle 500 chiamate quando ogni chiamata ha dati grandi.",
      suggerimento: "Riduci la dimensione dei vettori o la lunghezza massima delle stringhe che la procedura o la funzione riceve, usa o ottiene dalle funzioni che chiama. Se è una procedura e non cambia il vettore o la stringa che riceve, passali con rif: così le chiamate non ne fanno una copia ciascuna.",
    },
    out_of_memory: {
      breve: "Il programma ha chiesto troppa memoria.",
      accaduto: "L'esecuzione è stata fermata qui: il programma ha chiesto più memoria di quanta l'app possa dargli.",
      suggerimento: "Succede di solito con un ciclo che non finisce e a ogni giro scrive molto testo: guarda la sua condizione nella tabella di traccia.",
    },
    // Errori statici
    unknown_name: {
      breve: "Non c'è un dato con questo nome.",
      accaduto: "Questo nome non è un dato della funzione né una costante comune.",
      suggerimento: "Le maiuscole contano: Totale e totale sono due dati diversi. Se il dato non c'è ancora, crealo nella vista dei dati.",
    },
    invalid_name: {
      breve: "Il nome non è valido.",
      accaduto: "Il nome non è valido: è vuoto, comincia con una cifra o con un trattino basso, contiene una lettera accentata o un simbolo, supera i 63 caratteri, oppure è una parola riservata; per una procedura, una funzione o una costante comune, anche il nome di una funzione della libreria del C, come log o remove. O è già il nome di un altro dato.",
      suggerimento: "Per la forma: per prima una lettera, poi solo lettere senza accento, cifre o il trattino basso _ (eta_media, non età media). Se è una parola riservata, come while o class, o il nome di un altro dato, aggiungi una parte che lo distingua: classe_scelta, totale_vendite.",
    },
    invalid_data_item: {
      breve: "Un attributo del dato non va bene.",
      accaduto: "Un attributo del dato non va bene: la dimensione, la lunghezza, il valore iniziale, la costante o il ruolo; oppure il dato è un parametro del programma principale, che non ne ha.",
      suggerimento: "Controlla gli attributi del dato nella vista dei dati.",
    },
    assign_to_constant: {
      breve: "La costante non si può modificare.",
      accaduto: "Una costante non si può modificare.",
      suggerimento: "Usa una variabile, oppure togli l'assegnazione.",
    },
    assign_to_read_only: {
      breve: "Il dato qui si può solo leggere.",
      accaduto: "Questo dato qui si può solo leggere: il carattere di una stringa, il contatore di un ciclo «per» o l'elemento di un ciclo «per ogni» dentro il proprio ciclo.",
      suggerimento: "Per cambiare un carattere costruisci una stringa nuova, oppure lavora su un vettore di caratteri; il contatore e l'elemento li cambia solo il loro ciclo: per un altro conto usa un altro dato, anche in un ciclo dentro l'altro.",
    },
    array_assignment: {
      breve: "Il vettore si assegna solo da un vettore dello stesso tipo e dimensione.",
      accaduto:
        "Un vettore riceve un valore tutto insieme solo da un altro vettore dello stesso tipo e della stessa dimensione (il suo nome, o una funzione che lo restituisce), oppure da converti_a_vettore su una stringa; mai da un valore solo né da una lettura.",
      suggerimento: "Assegna un elemento alla volta, come voti[0] ← 7, oppure copia un vettore dello stesso tipo e della stessa dimensione, come altri ← voti.",
    },
    literal_out_of_range: {
      breve: "Il numero scritto è fuori dall'intervallo del suo tipo.",
      accaduto: "Il numero scritto è fuori dall'intervallo del suo tipo.",
      suggerimento: "Un intero arriva al massimo a 2147483647, e il più piccolo si ottiene in un blocco con -2147483647 - 1 (un valore iniziale non può essere un calcolo); un reale arriva a poco meno di 1.8e308.",
    },
    literal_leading_zero: {
      breve: "Il numero intero comincia con uno zero.",
      accaduto: "Un numero intero non può cominciare con uno zero, come in 042.",
      suggerimento: "Togli gli zeri all'inizio.",
    },
    string_literal_too_long: {
      breve: "Il testo fra virgolette è troppo lungo per il dato.",
      accaduto: "Il testo fra virgolette è più lungo della lunghezza massima del dato.",
      suggerimento: "Accorcia il testo, oppure aumenta la lunghezza massima del dato.",
    },
    multi_code_character: {
      breve: "Fra gli apici c'è più di un carattere.",
      accaduto: "Fra gli apici c'è più di un codice: più caratteri, oppure un carattere che si vede come uno solo ma è fatto di due codici, come una lettera con l'accento scritto a parte.",
      suggerimento: "Scrivi un carattere solo, con l'accento già unito alla lettera; per un testo usa le virgolette.",
    },
    type_mismatch: {
      breve: "Il valore non è del tipo che qui serve.",
      accaduto: "Un valore non è del tipo che qui serve: per esempio un testo dove serve un numero, un reale in un dato intero, un vettore intero dove serve un suo elemento, oppure, nell'intestazione di un ciclo, qualcosa che non è il nome di un dato (il contatore, l'elemento) né il vettore o la stringa da percorrere (il suo nome, o una funzione che lo restituisce).",
      suggerimento: "Guarda nella vista dei dati il tipo di ogni dato coinvolto. Un valore iniziale si scrive già nel tipo del dato (per esempio 7, 2.5, 'a' o \"ciao\"); in un blocco, per cambiare il tipo di un valore usa una conversione, come converti_a_intero o converti_a_reale. Nell'intestazione di un ciclo scrivi il nome di un dato; ciò che un «per ogni» percorre può essere anche una funzione che restituisce un vettore o una stringa, come ordina(voti).",
    },
    condition_not_boolean: {
      breve: "La condizione non è né vera né falsa.",
      accaduto: "La condizione non è né vera né falsa.",
      suggerimento: "Una condizione deve dire vero o falso: metti a confronto il valore con qualcos'altro (totale != 0 al posto di totale), oppure usa un dato booleano.",
    },
    chained_comparison: {
      breve: "Due confronti di seguito non sono ammessi.",
      accaduto: "Due confronti di seguito, come a < b < c, non sono ammessi.",
      suggerimento: "Scrivi a < b and b < c.",
    },
    chained_power: {
      breve: "Due elevato_a di seguito hanno bisogno delle parentesi.",
      accaduto: "Due elevato_a di seguito hanno bisogno delle parentesi.",
      suggerimento: "Aggiungi le parentesi per dire quale potenza si calcola per prima.",
    },
    division_by_literal_zero: {
      breve: "Il divisore scritto è zero.",
      accaduto: "Il divisore è il numero zero scritto nell'espressione.",
      suggerimento: "Correggi il divisore.",
    },
    invalid_step: {
      breve: "Il passo del ciclo «per» non è valido.",
      accaduto: "Il passo di un ciclo «per» deve essere un numero intero scritto così com'è (un letterale, come 2 o -1), diverso da zero e fra -2147483648 e 2147483647: il verso del ciclo si deve sapere prima di eseguirlo.",
      suggerimento: "Scrivi un passo come 1, 2 o -1; per un passo che cambia durante il ciclo usa un «mentre».",
    },
    unknown_callee: {
      breve: "Non c'è una procedura o una funzione con questo nome.",
      accaduto: "Non c'è una funzione o una procedura con questo nome.",
      suggerimento: "Il nome nella chiamata deve coincidere, maiuscole comprese, con quello di una funzione o di una procedura del progetto: Media e media sono due nomi diversi. Se la funzione non c'è ancora, aggiungila al progetto.",
    },
    argument_mismatch: {
      breve: "Gli argomenti non corrispondono ai parametri.",
      accaduto: "Gli argomenti della chiamata non corrispondono ai parametri: sono più o meno dei parametri, oppure uno non è del tipo giusto. Per valore un parametro reale accetta anche un intero; per riferimento o di uscita il dato deve essere dello stesso tipo. Con o senza riferimento un vettore vuole la stessa dimensione, e un dato stringa la stessa lunghezza massima.",
      suggerimento: "Scrivi un argomento per ogni parametro, nell'ordine in cui la procedura o la funzione li elenca, ciascuno del tipo del suo parametro.",
    },
    reference_not_assignable: {
      breve: "Il parametro per riferimento o di uscita non riceve un dato che si può cambiare.",
      accaduto: "Un parametro per riferimento o di uscita riceve un dato che la procedura può cambiare: una variabile o un elemento di un vettore. Non vanno un calcolo, un valore scritto, una costante, un carattere di una stringa, un dato fra parentesi, né il contatore o l'elemento di un ciclo dentro il suo ciclo.",
      suggerimento: "Passa una variabile o un elemento di vettore, scritti senza parentesi; per passare il risultato di un calcolo, mettilo prima in un dato.",
    },
    function_as_statement: {
      breve: "Il valore restituito dalla funzione andrebbe perso.",
      accaduto: "Una funzione restituisce un valore, che così andrebbe perso.",
      suggerimento: "Usa la chiamata dentro un'espressione, per esempio in un'assegnazione.",
    },
    procedure_in_expression: {
      breve: "La procedura non può stare in un'espressione.",
      accaduto: "Una procedura non restituisce un valore, quindi non può stare in un'espressione.",
      suggerimento: "Chiamala con un blocco «Procedura».",
    },
    limit_exceeded: {
      breve: "Il dato supera un limite delle impostazioni.",
      accaduto: "Il dato supera uno dei tre limiti delle impostazioni: gli elementi di un vettore, la lunghezza massima di una stringa, oppure i caratteri di un vettore di stringhe (elementi per lunghezza massima).",
      suggerimento: "Riduci la dimensione o la lunghezza massima, oppure alza il limite nelle impostazioni.",
    },
    syntax_error: {
      breve: "Il testo non si lascia leggere.",
      accaduto: "Il testo non si lascia leggere. Le cause possibili: un simbolo che il linguaggio non conosce (= al posto di ==, oppure una lettera accentata come in età); un operando che manca; una parentesi, tonda o quadra, aperta e mai chiusa; qualcosa in più dopo la fine; un numero scritto male, come 3. o 2x; un apice o una virgoletta senza chiusura; due apici vuoti; una barra rovesciata seguita da un segno che non ha significato; il carattere di codice 0 o un surrogato fra apici o virgolette; una destinazione che non è un dato né un elemento di vettore; un'espressione annidata oltre 63 livelli (parentesi, indici od operatori uno dentro l'altro).",
      suggerimento: "Rileggi il testo un simbolo alla volta. Lo sbaglio più comune è un = solo dentro una condizione: per confrontare si scrive ==.",
    },
    function_with_effect: {
      breve: "La funzione fa altro oltre a calcolare il suo risultato.",
      accaduto: "Una funzione calcola il suo risultato dai dati che riceve e non fa altro: non legge dalla console, non scrive, non chiama una procedura e non ha parametri per riferimento né di uscita.",
      suggerimento: "Se deve leggere, scrivere o cambiare i dati di chi la chiama, falla diventare una procedura; altrimenti sposta la lettura o la scrittura in chi la chiama e passale il valore.",
    },
    invalid_default_value: {
      breve: "Il valore predefinito non va bene per la funzione.",
      accaduto: "Il valore predefinito della funzione deve essere un valore scritto del tipo che la funzione restituisce: per esempio 0 per un intero, 0.0 per un reale, ' ' per un carattere, \"\" per una stringa, false per un booleano. Una funzione che restituisce un vettore non ne ha.",
      suggerimento: "Correggilo nelle proprietà della funzione: è il valore che prende il suo posto quando la funzione si toglie da un'espressione. Per una funzione che restituisce un vettore, confermane le proprietà: lo tolgono.",
    },
    function_name_in_use: {
      breve: "Il nome è già usato nel progetto.",
      accaduto: "Il nome della procedura o della funzione è già usato nel progetto: da un'altra procedura o funzione, da un dato o da una costante comune.",
      suggerimento: "Cambia il nome della procedura o della funzione, oppure quello del dato; un nome che dice che cosa fa aiuta: leggi_numero, media_dei_voti.",
    },
    reference_without_value: {
      breve: "Il dato passato per riferimento non ha ancora un valore.",
      accaduto: "Un parametro per riferimento (rif) fa entrare il dato nella procedura e poi lo fa uscire: entrando porta il suo valore, che la procedura può leggere, quindi il valore deve esserci già al momento della chiamata. Qui il dato arriva senza valore. Le versioni precedenti dell'app non controllavano questa regola: un progetto scritto con quelle può dare questo errore.",
      suggerimento: "Se la procedura non ha bisogno del valore che il dato ha prima della chiamata, perché gliene dà uno nuovo (per esempio leggendolo dalla console), cambia il parametro da rif a out, che fa solo uscire il dato. Se invece la procedura usa quel valore, assegnalo al dato prima della chiamata.",
    },
    // Avvisi
    integer_division_to_real: {
      breve: "La divisione fra interi perde la parte decimale.",
      accaduto: "Una divisione fra interi dà un intero, senza la parte decimale, che poi diventa reale.",
      suggerimento: "Se vuoi il risultato con i decimali, converti un operando: converti_a_reale a / b.",
    },
    real_equality: {
      breve: "Il confronto fra due reali può sbagliare per un arrotondamento.",
      accaduto: "Due reali confrontati con == o != possono differire per un arrotondamento.",
      suggerimento: "Confronta la differenza fra i due con una piccola tolleranza.",
    },
    useless_conversion: {
      breve: "La conversione non ha effetto.",
      accaduto: "La conversione porta il valore nel tipo che ha già: non ha effetto.",
      suggerimento: "Togli l'operatore di conversione.",
    },
    constant_loop_condition: {
      breve: "La condizione del ciclo è sempre la stessa.",
      accaduto: "La condizione del ciclo è sempre la stessa: con true il ciclo non si ferma mai; con false un «mentre» non comincia e un «ripeti» fa un giro solo.",
      suggerimento: "Scrivi una condizione che dipenda dai dati.",
    },
    input_never_read: {
      breve: "Il dato di input non viene mai letto.",
      accaduto: "Il dato ha il ruolo di input, ma non viene mai letto.",
      suggerimento: "Aggiungi un blocco di lettura, oppure cambia il ruolo del dato.",
    },
    output_never_written: {
      breve: "Il dato di output non viene mai scritto.",
      accaduto: "Il dato ha il ruolo di output, ma non viene mai scritto.",
      suggerimento: "Aggiungi un blocco di scrittura, oppure cambia il ruolo del dato.",
    },
    missing_role: {
      breve: "Il dato è letto o mostrato, ma il suo ruolo è «di lavoro».",
      accaduto: "Il dato è letto o mostrato, ma il suo ruolo è «di lavoro»: non è forse di input o di output?",
      suggerimento: "Se il dato è di input, di output o di entrambi, scegli quel ruolo.",
    },
    maybe_uninitialized: {
      breve: "Il dato potrebbe non avere ancora un valore.",
      accaduto: "Questo blocco usa il valore di un dato che, su almeno una strada del flowchart, non ne ha ancora uno: lì l'esecuzione si fermerebbe.",
      suggerimento: "Dai al dato un valore iniziale, oppure fagli ricevere un valore (con un'assegnazione o una lettura) su ogni strada che arriva qui.",
    },
    unused_data: {
      breve: "Il dato non è mai usato.",
      accaduto: "Il dato non è mai usato: non ha un valore iniziale e nessun blocco lo nomina.",
      suggerimento: "Toglilo dalla vista dei dati, oppure usalo nei blocchi che ne hanno bisogno.",
    },
    unused_value: {
      breve: "Il valore del dato non viene mai letto.",
      accaduto: "Il dato riceve un valore (iniziale, da un'assegnazione, da una lettura, da un ciclo «per ogni» o, se è un parametro, dalla chiamata) che nessun blocco legge mai.",
      suggerimento: "Usa il dato dove serve il suo valore, oppure eliminalo insieme ai blocchi che glielo danno.",
    },
    implicit_conversion: {
      breve: "Il valore intero diventa reale senza che sia scritto.",
      accaduto: "Il valore intero diventa reale passando da qui: in un parametro reale, o nel risultato di una funzione reale. Non si perde nulla, ma il tipo cambia senza che sia scritto.",
      suggerimento: "Se è voluto, scrivilo: converti_a_reale, oppure un valore come 3.0 al posto di 3.",
    },
  },
  en: {
    // Interpreter errors
    uninitialized: {
      breve: "The data item has no value yet.",
      accaduto: "Running this block needs the value of a data item that has none yet (in the trace table: “uninitialized”): none of the actions so far has given it a value.",
      suggerimento: "Trace back the paths of the flowchart that lead here: on at least one of them the data item never receives a value. Give it an initial value in the data view, or add an assignment or a read on that path.",
    },
    index_out_of_range: {
      breve: "The index is outside the array or the string.",
      accaduto: "The index is outside the array or the string: it goes from 0 to the size (or the length) minus one.",
      suggerimento: "Check the value of the index and the condition of the loop that increases it.",
    },
    string_too_long: {
      breve: "The string is longer than the maximum length of the data item.",
      accaduto: "The string has more characters than the maximum length of the data item.",
      suggerimento: "Shorten the text, or raise the maximum length of the data item in the data view.",
    },
    null_character_in_string: {
      breve: "The character with code 0 cannot be in a string.",
      accaduto: "The character with code 0 cannot be part of a string.",
      suggerimento: "Check the code of the character that goes into the string.",
    },
    invalid_character_code: {
      breve: "The number is not a character code.",
      accaduto: "The number is not a character code: codes go from 0 to 1114111, except those from 55296 to 57343.",
      suggerimento: "Check the value you convert into a character.",
    },
    string_longer_than_array: {
      breve: "The string has more characters than the array has elements.",
      accaduto: "The string has more characters than the array has elements.",
      suggerimento: "Use an array with more elements, or a shorter string.",
    },
    same_reference: {
      breve: "The same data item goes to two parameters by reference or output.",
      accaduto: "In the same call the same data item goes to two parameters by reference or output, also as an array and as one of its elements, or as the same element twice: this is not allowed.",
      suggerimento: "Pass different data items, or copy the value into another data item before the call.",
    },
    integer_overflow: {
      breve: "The result does not fit in an integer.",
      accaduto: "The result does not fit in an integer, which goes from -2147483648 to 2147483647.",
      suggerimento: "Use real data items, or smaller values.",
    },
    division_by_zero: {
      breve: "The divisor is zero.",
      accaduto: "The divisor of an integer division or of mod is zero.",
      suggerimento: "Go back to the block that gives the divisor its value: if a zero can arrive there, for example from a read, that value must be handled on a separate path of the flowchart, before the division.",
    },
    real_to_integer_out_of_range: {
      breve: "The real does not fit in an integer.",
      accaduto: "The real to convert into an integer is outside the integer range.",
      suggerimento: "Check the value before converting it.",
    },
    non_finite_real: {
      breve: "The calculation does not give a finite real number.",
      accaduto: "The calculation does not give a finite real number: for example a division by zero or the square root of a negative number.",
      suggerimento: "Check the operands before the calculation.",
    },
    invalid_input: {
      breve: "The value entered does not suit the data item.",
      accaduto: "The value entered does not suit the data item: it is not of its type, it is outside its range, or it is a text longer than its maximum length.",
      suggerimento: "At the console, enter a new value: reading starts again from here, and nothing done so far is lost. In a test case, instead, the case stops: correct the input in the test case.",
    },
    input_exhausted: {
      breve: "There are no more inputs.",
      accaduto: "The program asks for an input, but the inputs are over: for example those of a test case.",
      suggerimento: "Add the missing input to the test case, or check how many reads the program makes.",
    },
    input_mismatch: {
      breve: "The input of the test case is meant for another data item.",
      accaduto: "The input of the test case is meant for a data item other than the one the program reads.",
      suggerimento: "Check the order of the inputs of the test case.",
    },
    unused_inputs: {
      breve: "Some inputs of the test case were never read.",
      accaduto: "The program has ended, but some inputs of the test case were never read.",
      suggerimento: "Remove the extra inputs, or check the reads of the program.",
    },
    too_many_steps: {
      breve: "The run was stopped after one million actions.",
      accaduto: "The run was stopped after one million actions: on the loop that was still going round or, if no loop was going round, on the action in progress, for example inside a function that calls itself more than once.",
      suggerimento: "If a loop is highlighted, run it one step at a time and watch, in the trace table, the data of its condition: if from one round to the next they never get closer to the value that changes it, the loop will not end by itself. If it is inside a function that calls itself twice at each call, like Fibonacci, the work doubles at every level: try a smaller number.",
    },
    recursion_too_deep: {
      breve: "The procedure or function has been called 500 times without any call ending.",
      accaduto: "The procedure or function has been called 500 times, directly or through others, and none of those calls has ended yet. Each call in progress takes a place on the call stack, and the stack has a limit: the run stops on the call that would be the five hundred and first.",
      suggerimento: "Check the case in which the procedure or function no longer calls itself, such as \"n <= 1\" in the factorial. Run one step at a time, choose the levels in “Where you are” and watch whether, from one level to the next, the data that decides it gets closer to that value.",
    },
    recursion_data_too_large: {
      breve: "The data of the calls in progress no longer fit on the stack.",
      accaduto: "Each call in progress of a procedure or function that calls itself keeps its own data on the call stack: the copies of the arrays and strings received without ref, the arrays and strings returned by the functions it calls, and the texts joined with +. The stack holds 256 KB, and with this call the data would no longer fit. It happens before 500 calls when each call has large data.",
      suggerimento: "Reduce the size of the arrays or the maximum length of the strings that the procedure or function receives, uses or gets from the functions it calls. If it is a procedure and does not change the array or string it receives, pass them with ref: then the calls do not each make a copy.",
    },
    out_of_memory: {
      breve: "The program asked for too much memory.",
      accaduto: "The run was stopped here: the program asked for more memory than the app can give it.",
      suggerimento: "It usually happens with a loop that does not end and on each round writes a lot of text: look at its condition in the trace table.",
    },
    // Static errors
    unknown_name: {
      breve: "There is no data item with this name.",
      accaduto: "This name is neither a data item of the function nor a shared constant.",
      suggerimento: "Capital letters count: Total and total are two different data items. If the data item does not exist yet, create it in the data view.",
    },
    invalid_name: {
      breve: "The name is not valid.",
      accaduto: "The name is not valid: it is empty, starts with a digit or an underscore, contains an accented letter or a symbol, is longer than 63 characters, or is a reserved word; for a procedure, a function or a shared constant, also the name of a function of the C library, such as log or remove. Or it is already the name of another data item.",
      suggerimento: "As for its form: a letter first, then only letters without accents, digits or the underscore _ (cafe_count, not café count). If it is a reserved word, such as while or class, or the name of another data item, add a part that tells it apart: chosen_class, total_sales.",
    },
    invalid_data_item: {
      breve: "An attribute of the data item is wrong.",
      accaduto: "An attribute of the data item is wrong: the size, the length, the initial value, the constant or the role; or the data item is a parameter of the main program, which has none.",
      suggerimento: "Check the attributes of the data item in the data view.",
    },
    assign_to_constant: {
      breve: "The constant cannot be changed.",
      accaduto: "A constant cannot be changed.",
      suggerimento: "Use a variable, or remove the assignment.",
    },
    assign_to_read_only: {
      breve: "The data item can only be read here.",
      accaduto: "This data item can only be read here: the character of a string, the counter of a For loop or the element of a For each loop inside its own loop.",
      suggerimento: "To change a character build a new string, or work on an array of characters; the counter and the element are changed only by their loop: for another count use another data item, also in a loop inside the other.",
    },
    array_assignment: {
      breve: "An array is assigned only from an array of the same type and size.",
      accaduto:
        "An array receives a value all at once only from another array of the same type and the same size (its name, or a function that returns it), or from to_array on a string; never from a single value or from a read.",
      suggerimento: "Assign one element at a time, as in marks[0] ← 7, or copy an array of the same type and the same size, as in others ← marks.",
    },
    literal_out_of_range: {
      breve: "The number written is outside the range of its type.",
      accaduto: "The number written is outside the range of its type.",
      suggerimento: "An integer reaches 2147483647 at most, and the smallest one is written in a block as -2147483647 - 1 (an initial value cannot be a calculation); a real reaches just under 1.8e308.",
    },
    literal_leading_zero: {
      breve: "The integer starts with a zero.",
      accaduto: "An integer cannot start with a zero, as in 042.",
      suggerimento: "Remove the leading zeros.",
    },
    string_literal_too_long: {
      breve: "The text between double quotes is too long for the data item.",
      accaduto: "The text between double quotes is longer than the maximum length of the data item.",
      suggerimento: "Shorten the text, or raise the maximum length of the data item.",
    },
    multi_code_character: {
      breve: "There is more than one character between the single quotes.",
      accaduto: "There is more than one code between the single quotes: several characters, or a character that looks like one but is made of two codes, like a letter with its accent written separately.",
      suggerimento: "Write a single character, with the accent already joined to the letter; for a text use double quotes.",
    },
    type_mismatch: {
      breve: "The value is not of the type needed here.",
      accaduto: "A value is not of the type needed here: for example a text where a number is needed, a real in an integer data item, a whole array where one of its elements is needed, or, in the heading of a loop, something that is not the name of a data item (the counter, the element) nor the array or the string to go through (its name, or a function that returns it).",
      suggerimento: "Look up in the data view the type of each data item involved. An initial value is already written in the type of the data item (for example 7, 2.5, 'a' or \"hello\"); in a block, to change the type of a value use a conversion, such as to_integer or to_real. In the heading of a loop write the name of a data item; what a For each loop goes through can also be a function that returns an array or a string, such as sort(marks).",
    },
    condition_not_boolean: {
      breve: "The condition is neither true nor false.",
      accaduto: "The condition is neither true nor false.",
      suggerimento: "A condition must say true or false: compare the value with something else (total != 0 instead of total), or use a boolean data item.",
    },
    chained_comparison: {
      breve: "Two comparisons in a row are not allowed.",
      accaduto: "Two comparisons in a row, like a < b < c, are not allowed.",
      suggerimento: "Write a < b and b < c.",
    },
    chained_power: {
      breve: "Two raised_to in a row need parentheses.",
      accaduto: "Two raised_to in a row need parentheses.",
      suggerimento: "Add parentheses to say which power is calculated first.",
    },
    division_by_literal_zero: {
      breve: "The divisor written is zero.",
      accaduto: "The divisor is the number zero written in the expression.",
      suggerimento: "Correct the divisor.",
    },
    invalid_step: {
      breve: "The step of the For loop is not valid.",
      accaduto: "The step of a For loop must be an integer written as it is (a literal, such as 2 or -1), other than zero and between -2147483648 and 2147483647: the direction of the loop must be known before running it.",
      suggerimento: "Write a step such as 1, 2 or -1; for a step that changes during the loop use a While.",
    },
    unknown_callee: {
      breve: "There is no procedure or function with this name.",
      accaduto: "There is no function or procedure with this name.",
      suggerimento: "The name in the call must match, capital letters included, the name of a function or procedure of the project: Average and average are two different names. If the function does not exist yet, add it to the project.",
    },
    argument_mismatch: {
      breve: "The arguments do not match the parameters.",
      accaduto: "The arguments of the call do not match the parameters: there are more or fewer than the parameters, or one is not of the right type. By value a real parameter also accepts an integer; by reference or output the data item must be of the same type. With or without reference an array needs the same size, and a string data item the same maximum length.",
      suggerimento: "Write one argument for each parameter, in the order in which the procedure or function lists them, each of the type of its parameter.",
    },
    reference_not_assignable: {
      breve: "The parameter by reference or output does not get a data item that can change.",
      accaduto: "A parameter by reference or output receives a data item the procedure can change: a variable or an element of an array. A calculation, a written value, a constant, a character of a string, a data item in parentheses, or the counter or element of a loop inside its own loop will not do.",
      suggerimento: "Pass a variable or an array element, written without parentheses; to pass the result of a calculation, put it in a data item first.",
    },
    function_as_statement: {
      breve: "The value returned by the function would be lost.",
      accaduto: "A function returns a value, which would be lost this way.",
      suggerimento: "Use the call inside an expression, for example in an assignment.",
    },
    procedure_in_expression: {
      breve: "The procedure cannot be part of an expression.",
      accaduto: "A procedure does not return a value, so it cannot be part of an expression.",
      suggerimento: "Call it with a “Procedure” block.",
    },
    limit_exceeded: {
      breve: "The data item exceeds a limit of the settings.",
      accaduto: "The data item exceeds one of the three limits of the settings: the elements of an array, the maximum length of a string, or the characters of an array of strings (elements times maximum length).",
      suggerimento: "Reduce the size or the maximum length, or raise the limit in the settings.",
    },
    syntax_error: {
      breve: "The text cannot be read.",
      accaduto: "The text cannot be read. The possible causes: a symbol the language does not know (= instead of ==, or an accented letter as in café); a missing operand; a bracket, round or square, opened and never closed; something extra after the end; a badly written number, such as 3. or 2x; a single or double quote with no closing one; two empty single quotes; a backslash followed by a sign that has no meaning; the character with code 0 or a surrogate between quotes; a target that is neither a data item nor an array element; an expression nested beyond 63 levels (parentheses, indexes or operators one inside the other).",
      suggerimento: "Read the text again one symbol at a time. The most common slip is a single = inside a condition: to compare, write ==.",
    },
    function_with_effect: {
      breve: "The function does more than work out its result.",
      accaduto: "A function works out its result from the data it receives and does nothing else: it does not read from the console, does not write, does not call a procedure and has no parameters by reference or output parameters.",
      suggerimento: "If it has to read, write or change the data of its caller, make it a procedure; otherwise move the reading or the writing into the caller and pass it the value.",
    },
    invalid_default_value: {
      breve: "The default value does not suit the function.",
      accaduto: "The default value of the function must be a written value of the type the function returns: for example 0 for an integer, 0.0 for a real, ' ' for a character, \"\" for a string, false for a boolean. A function that returns an array has none.",
      suggerimento: "Fix it in the properties of the function: it is the value that takes its place when the function is removed from an expression. For a function that returns an array, confirm its properties: they remove it.",
    },
    function_name_in_use: {
      breve: "The name is already used in the project.",
      accaduto: "The name of the procedure or function is already used in the project: by another procedure or function, by a data item or by a shared constant.",
      suggerimento: "Change the name of the procedure or function, or that of the data item; a name that says what it does helps: read_number, average_of_marks.",
    },
    reference_without_value: {
      breve: "The data item passed by reference has no value yet.",
      accaduto: "A parameter by reference (ref) takes the data item into the procedure and then back out: going in, it carries its value, which the procedure may read, so the value must already be there when the call happens. Here the data item arrives with no value. Earlier versions of the app did not check this rule: a project written with them can give this error.",
      suggerimento: "If the procedure does not need the value the data item has before the call, because it gives it a new one (for example by reading it from the console), change the parameter from ref to out, which only takes the data item out. If instead the procedure uses that value, assign it to the data item before the call.",
    },
    // Warnings
    integer_division_to_real: {
      breve: "The division between integers loses the decimal part.",
      accaduto: "A division between integers gives an integer, without the decimal part, which then becomes a real.",
      suggerimento: "If you want the result with decimals, convert one operand: to_real a / b.",
    },
    real_equality: {
      breve: "The comparison of two reals may be off by a rounding.",
      accaduto: "Two reals compared with == or != may differ by a rounding.",
      suggerimento: "Compare the difference between the two with a small tolerance.",
    },
    useless_conversion: {
      breve: "The conversion has no effect.",
      accaduto: "The conversion takes the value to the type it already has: it has no effect.",
      suggerimento: "Remove the conversion operator.",
    },
    constant_loop_condition: {
      breve: "The condition of the loop is always the same.",
      accaduto: "The condition of the loop is always the same: with true the loop never stops; with false a While loop never starts and a Repeat loop goes round only once.",
      suggerimento: "Write a condition that depends on the data.",
    },
    input_never_read: {
      breve: "The input data item is never read.",
      accaduto: "The data item has the input role, but it is never read.",
      suggerimento: "Add a read block, or change the role of the data item.",
    },
    output_never_written: {
      breve: "The output data item is never written.",
      accaduto: "The data item has the output role, but it is never written.",
      suggerimento: "Add a write block, or change the role of the data item.",
    },
    missing_role: {
      breve: "The data item is read or shown, but its role is “working”.",
      accaduto: "The data item is read or shown, but its role is “working”: could it be an input or an output?",
      suggerimento: "If the data item is an input, an output or both, choose that role.",
    },
    maybe_uninitialized: {
      breve: "The data item may have no value yet.",
      accaduto: "This block uses the value of a data item that, on at least one path of the flowchart, has none yet: there the run would stop.",
      suggerimento: "Give the data item an initial value, or make it receive a value (with an assignment or a read) on every path that leads here.",
    },
    unused_data: {
      breve: "The data item is never used.",
      accaduto: "The data item is never used: it has no initial value and no block names it.",
      suggerimento: "Remove it from the data view, or use it in the blocks that need it.",
    },
    unused_value: {
      breve: "The value of the data item is never read.",
      accaduto: "The data item receives a value (initial, from an assignment, a read, a For each loop or, for a parameter, from the call) that no block ever reads.",
      suggerimento: "Use the data item where its value is needed, or delete it together with the blocks that give it one.",
    },
    implicit_conversion: {
      breve: "The integer value becomes real without it being written.",
      accaduto: "The integer value becomes real here: in a real parameter, or in the result of a real function. Nothing is lost, but the type changes without being written.",
      suggerimento: "If it is intended, write it: to_real, or a value such as 3.0 instead of 3.",
    },
  },
};

/** I codici che hanno un testo suo quando l'errore è sul risultato di una funzione e non su un dato: la stringa restituita
 * troppo lunga (anche un elemento di un vettore di stringhe), il testo fra virgolette di «Restituisce», le misure del
 * risultato (gli elementi di un vettore, la lunghezza massima di una stringa) che non vanno bene o superano un limite, e
 * «Restituisce» di una funzione vettore con un valore che non è un vettore intero. */
export const codiciSulRisultato = ["string_too_long", "string_literal_too_long", "invalid_data_item", "limit_exceeded", "array_assignment"] as const;
export type CodiceSulRisultato = (typeof codiciSulRisultato)[number];

export const testiSulRisultato: Record<Lingua, Record<CodiceSulRisultato, TestoDelCodice>> = {
  it: {
    string_too_long: {
      breve: "La stringa restituita è più lunga della lunghezza massima del suo risultato.",
      accaduto: "La stringa che la funzione restituisce, o un elemento del vettore di stringhe che restituisce, ha più caratteri della lunghezza massima del suo risultato.",
      suggerimento: "Accorcia il testo, oppure aumenta la lunghezza massima del risultato nelle proprietà della funzione.",
    },
    string_literal_too_long: {
      breve: "Il testo fra virgolette è troppo lungo per il risultato della funzione.",
      accaduto: "Il testo fra virgolette che la funzione restituisce è più lungo della lunghezza massima del suo risultato.",
      suggerimento: "Accorcia il testo, oppure aumenta la lunghezza massima del risultato nelle proprietà della funzione.",
    },
    invalid_data_item: {
      breve: "Una misura del risultato della funzione non va bene.",
      accaduto: "Gli elementi del vettore che la funzione restituisce, o la lunghezza massima della stringa che restituisce, devono essere un numero intero da 1 in su.",
      suggerimento: "Correggili nelle proprietà della funzione.",
    },
    limit_exceeded: {
      breve: "Il risultato della funzione supera un limite delle impostazioni.",
      accaduto: "Il risultato della funzione supera uno dei tre limiti delle impostazioni: gli elementi di un vettore, la lunghezza massima di una stringa, oppure i caratteri di un vettore di stringhe (elementi per lunghezza massima).",
      suggerimento: "Riduci gli elementi o la lunghezza massima nelle proprietà della funzione, oppure alza il limite nelle impostazioni.",
    },
    array_assignment: {
      breve: "Restituisce vuole un vettore intero.",
      accaduto:
        "Una funzione che restituisce un vettore lo restituisce tutto insieme: dopo Restituisce va il nome di un vettore dello stesso tipo e della stessa dimensione, o una funzione che lo restituisce; non un valore solo né converti_a_vettore.",
      suggerimento: 'Metti prima il valore in un vettore della funzione, come parole ← converti_a_vettore("abc"), e scrivi Restituisce parole.',
    },
  },
  en: {
    string_too_long: {
      breve: "The returned string is longer than the maximum length of its result.",
      accaduto: "The string the function returns, or an element of the array of strings it returns, has more characters than the maximum length of its result.",
      suggerimento: "Shorten the text, or raise the maximum length of the result in the properties of the function.",
    },
    string_literal_too_long: {
      breve: "The text between double quotes is too long for the result of the function.",
      accaduto: "The text between double quotes that the function returns is longer than the maximum length of its result.",
      suggerimento: "Shorten the text, or raise the maximum length of the result in the properties of the function.",
    },
    invalid_data_item: {
      breve: "A size of the function's result is not valid.",
      accaduto: "The elements of the array the function returns, or the maximum length of the string it returns, must be a whole number of 1 or more.",
      suggerimento: "Fix them in the properties of the function.",
    },
    limit_exceeded: {
      breve: "The result of the function exceeds a limit of the settings.",
      accaduto: "The result of the function exceeds one of the three limits of the settings: the elements of an array, the maximum length of a string, or the characters of an array of strings (elements times maximum length).",
      suggerimento: "Reduce the elements or the maximum length in the properties of the function, or raise the limit in the settings.",
    },
    array_assignment: {
      breve: "Returns needs a whole array.",
      accaduto:
        "A function that returns an array returns it all at once: after Returns goes the name of an array of the same type and the same size, or a function that returns one; not a single value nor to_array.",
      suggerimento: 'First put the value in an array of the function, as in words ← to_array("abc"), and write Returns words.',
    },
  },
};

/** Il testo di un codice: quello del risultato di una funzione, se l'errore è lì e il codice ne ha uno. */
export function testoDelMessaggio(lingua: Lingua, codice: Codice, sulRisultato: boolean): TestoDelCodice {
  return sulRisultato && (codiciSulRisultato as readonly string[]).includes(codice) ? testiSulRisultato[lingua][codice as CodiceSulRisultato] : testiDeiCodici[lingua][codice];
}

/** Il testo di una causa precisa: la frase breve, che può citare il pezzo di testo (`{segno}`), e il suggerimento. */
export type TestoDellaCausa = { readonly breve: string; readonly suggerimento: string };

export const testiDelleCause: Record<Lingua, Record<Causa, TestoDellaCausa>> = {
  it: {
    vuoto: { breve: "Il campo è vuoto.", suggerimento: "Scrivi un'espressione: un dato, un numero o un calcolo, come totale + 1." },
    virgolette_aperte: { breve: "Le virgolette aperte non sono chiuse.", suggerimento: 'Chiudi il testo con un\'altra virgoletta: "ciao".' },
    apice_aperto: { breve: "L'apice aperto non è chiuso.", suggerimento: "Chiudi il carattere con un altro apice: 'a'." },
    barra_rovesciata: {
      breve: "La barra rovesciata di «{segno}» non ha significato.",
      suggerimento: "Dopo la barra rovesciata vanno n (a capo), t (tabulazione), un'altra barra rovesciata, un apice o una virgoletta: \"riga\\n\".",
    },
    codice_vietato: { breve: "Fra apici o virgolette c'è il carattere di codice 0 o un surrogato.", suggerimento: "Togli quel carattere: arriva solo da un file scritto fuori dall'app." },
    numero_scritto_male: {
      breve: "Il numero «{segno}» è scritto male.",
      suggerimento: "Un numero reale ha le cifre dopo il punto (3.0, non 3.); fra un numero e un nome va un operatore (2 * x, non 2x).",
    },
    apici_vuoti: { breve: "Fra i due apici non c'è un carattere.", suggerimento: "Scrivi un carattere fra gli apici, come 'a'; un testo vuoto si scrive con le virgolette: \"\"." },
    uguale_solo: {
      breve: "Un = solo non fa parte del linguaggio.",
      suggerimento: "Per confrontare due valori si scrive ==, come in voto == 10; per dare un valore a un dato si usa un blocco di assegnazione.",
    },
    lettera_accentata: {
      breve: "La lettera «{segno}» non può far parte di un nome: va fra virgolette, o fra apici se è sola.",
      suggerimento: "In un nome scrivi la lettera senza accento (eta, non età) o con le lettere dell'alfabeto inglese (pi, non π); in un testo mettila fra virgolette, \"età\", e un carattere solo fra apici, 'è'.",
    },
    simbolo_sconosciuto: { breve: "Il simbolo «{segno}» non fa parte del linguaggio.", suggerimento: "Toglilo, oppure mettilo fra virgolette se fa parte di un testo." },
    tonda_aperta: { breve: "Una parentesi tonda è aperta e non è chiusa.", suggerimento: "Aggiungi la ) dove finisce ciò che sta fra parentesi." },
    quadra_aperta: { breve: "Una parentesi quadra è aperta e non è chiusa.", suggerimento: "Aggiungi la ] dopo l'indice, come in voti[i]." },
    operando_mancante: { breve: "Prima di «{segno}» manca un operando.", suggerimento: "Scrivi il valore che manca, oppure togli il simbolo in più: a + b, non a + * b." },
    operando_alla_fine: {
      breve: "Il testo finisce dove manca ancora un operando.",
      suggerimento: "Completa il calcolo dopo l'ultimo operatore, oppure togli l'operatore: a + b, non a +.",
    },
    simbolo_slegato: {
      breve: "«{segno}» non si lega a ciò che viene prima.",
      suggerimento: "Fra due valori va un operatore (a + b), fra due argomenti una virgola (somma(a, b)); una parentesi chiusa in più si toglie.",
    },
    troppo_annidata: { breve: "L'espressione è annidata oltre 63 livelli.", suggerimento: "Spezza il calcolo in più blocchi, con dati di appoggio." },
    destinazione: {
      breve: "La destinazione non è un dato né un elemento di vettore.",
      suggerimento: "Scrivi il nome di un dato, come totale, o un elemento di un vettore, come voti[i].",
    },
    piu_caratteri: { breve: "Fra gli apici c'è più di un carattere: «{segno}».", suggerimento: "Fra gli apici va un carattere solo, come 'a'; per un testo usa le virgolette: \"ab\"." },
    accento_a_parte: {
      breve: "Il carattere fra gli apici ha l'accento scritto a parte: sono due codici.",
      suggerimento: "Scrivi la lettera con l'accento già unito, dalla tastiera, come 'è'.",
    },
    oltre_elementi: {
      breve: "Gli elementi sono più di {segno}, il limite delle impostazioni.",
      suggerimento: "Riduci la dimensione, oppure alza il limite «Elementi di un vettore» nelle impostazioni.",
    },
    oltre_lunghezza: {
      breve: "La lunghezza massima supera {segno}, il limite delle impostazioni.",
      suggerimento: "Riduci la lunghezza massima, oppure alza il limite «Lunghezza massima di una stringa» nelle impostazioni.",
    },
    oltre_caratteri: {
      breve: "Elementi per lunghezza massima fanno più di {segno} caratteri, il limite delle impostazioni.",
      suggerimento: "Riduci la dimensione o la lunghezza massima (100 elementi da 50 caratteri ne fanno 5000), oppure alza il limite «Caratteri di un vettore di stringhe».",
    },
    nome_vuoto: { breve: "Il nome è vuoto.", suggerimento: "Scrivi un nome che cominci con una lettera, come totale." },
    nome_cifra: { breve: "Il nome comincia con una cifra.", suggerimento: "Metti per prima una lettera: voto1, non 1voto." },
    nome_trattino: { breve: "Il nome comincia con il trattino basso.", suggerimento: "Metti per prima una lettera: totale, non _totale." },
    nome_accentato: { breve: "Nel nome c'è la lettera accentata «{segno}».", suggerimento: "Scrivi la lettera senza accento: eta, non età." },
    nome_spazio: { breve: "Nel nome c'è uno spazio.", suggerimento: "Unisci le parole col trattino basso: eta_media, non eta media." },
    nome_simbolo: {
      breve: "Nel nome c'è il simbolo «{segno}».",
      suggerimento: "Usa solo lettere senza accento, cifre e il trattino basso: voto_finale, non voto-finale.",
    },
    nome_lungo: { breve: "Il nome supera i 63 caratteri.", suggerimento: "Accorcia il nome: bastano poche parole, come media_dei_voti." },
    nome_riservato: {
      breve: "«{segno}» è una parola riservata.",
      suggerimento: "Aggiungi una parte che lo distingua, come classe_scelta al posto di class.",
    },
    nome_della_libreria: {
      breve: "«{segno}» è un nome della libreria del C.",
      suggerimento: "Per una procedura, una funzione o una costante comune scegli un altro nome, come log_dei_voti al posto di log.",
    },
    nome_doppio: {
      breve: "C'è già un altro dato, o una costante comune, che si chiama «{segno}».",
      suggerimento: "Dai a ogni dato un nome suo: totale_vendite e totale_spese, non due totale.",
    },
    dimensione_non_valida: { breve: "La dimensione non è un numero intero da 1 in su.", suggerimento: "Scrivi quanti elementi ha il vettore, come 10." },
    lunghezza_non_valida: {
      breve: "La lunghezza massima non è un numero intero da 1 in su.",
      suggerimento: "Scrivi quanti caratteri al più tiene la stringa, come 30, oppure lascia il campo vuoto per averne 255.",
    },
    lunghezza_non_stringa: {
      breve: "La lunghezza massima vale solo per una stringa.",
      suggerimento: "Togli la lunghezza massima, oppure fai del dato una stringa: arriva solo da un file scritto fuori dall'app.",
    },
    costante_senza_valore: { breve: "La costante non ha un valore iniziale.", suggerimento: "Scrivi il suo valore, come 3.14, oppure fanne una variabile." },
    costante_con_ruolo: {
      breve: "La costante ha un ruolo di input o di output.",
      suggerimento: "Scegli il ruolo «di lavoro», oppure fanne una variabile se il programma la legge o la scrive.",
    },
    elenco_di_altra_lunghezza: {
      breve: "L'elenco ha {segno} valori, non uno per ogni elemento.",
      suggerimento: "Scrivi un valore per elemento, come {1, 2, 3} per un vettore di 3, oppure cambia la dimensione.",
    },
    valore_non_scritto: {
      breve: "«{segno}» non è un valore scritto: è un nome o un calcolo.",
      suggerimento: 'Il valore iniziale si scrive come un valore, come 10 o "ciao"; un calcolo va in un blocco di assegnazione.',
    },
    parametro_fuori_posto: {
      breve: "Il dato è un parametro, ma il programma principale e le costanti comuni non ne hanno.",
      suggerimento: "Fanne una variabile, oppure spostalo fra i dati di una procedura: arriva solo da un file scritto fuori dall'app.",
    },
    parametro_con_attributi: {
      breve: "Il parametro ha un valore iniziale, un ruolo o la natura di costante.",
      suggerimento: "Un parametro riceve il valore dalla chiamata: togli quegli attributi. Arriva solo da un file scritto fuori dall'app.",
    },
    comune_non_costante: {
      breve: "La costante comune non è una costante.",
      suggerimento: "Fanne una costante, oppure spostala fra i dati del programma: arriva solo da un file scritto fuori dall'app.",
    },
    forma_del_valore: {
      breve: "Il valore iniziale ha la forma sbagliata: un elenco per un dato semplice, o il contrario.",
      suggerimento: "Un dato semplice ha un valore, come 5; un vettore un elenco, come {1, 2, 3}. Arriva solo da un file scritto fuori dall'app.",
    },
    sempre_vera: { breve: "La condizione è sempre true: il ciclo non si ferma mai.", suggerimento: "Scrivi una condizione che dipenda dai dati, come i <= n." },
    mentre_falsa: { breve: "La condizione è sempre false: il ciclo «mentre» non comincia.", suggerimento: "Scrivi una condizione che dipenda dai dati, come i <= n." },
    ripeti_falsa: { breve: "La condizione è sempre false: il ciclo «ripeti» fa un giro solo.", suggerimento: "Scrivi una condizione che dipenda dai dati, come i <= n." },
    carattere_della_stringa: {
      breve: "I caratteri della stringa «{segno}» si possono solo leggere.",
      suggerimento: 'Costruisci una stringa nuova, come s ← "c" + s, oppure lavora su un vettore di caratteri.',
    },
    contatore_del_ciclo: {
      breve: "«{segno}» è il contatore del ciclo «per» che lo contiene: qui si può solo leggere.",
      suggerimento: "Lo cambia solo il suo ciclo: per un altro conto usa un altro dato, anche in un ciclo dentro l'altro.",
    },
    elemento_del_ciclo: {
      breve: "«{segno}» è l'elemento del ciclo «per ogni» che lo contiene: qui si può solo leggere.",
      suggerimento: "Lo cambia solo il suo ciclo: per cambiare il vettore usa un ciclo «per» con l'indice, come v[i] ← 0.",
    },
    funzione_legge: {
      breve: "La funzione legge dalla console: una funzione calcola e basta.",
      suggerimento: "Leggi il valore in chi la chiama e passalo come argomento, oppure fanne una procedura.",
    },
    funzione_scrive: {
      breve: "La funzione scrive sulla console: una funzione calcola e basta.",
      suggerimento: "Scrivi il risultato in chi la chiama, oppure fanne una procedura.",
    },
    funzione_salta: {
      breve: "La funzione chiama una procedura: una funzione calcola e basta.",
      suggerimento: "Sposta la chiamata in chi chiama la funzione, oppure fanne una procedura.",
    },
    parametro_non_copia: {
      breve: "Il parametro «{segno}» è per riferimento o di uscita: una funzione riceve solo copie.",
      suggerimento: "Passalo per valore, oppure fai della funzione una procedura.",
    },
    argomenti_in_piu: {
      breve: "La chiamata di «{segno}» ha più argomenti dei suoi parametri.",
      suggerimento: "Togli gli argomenti in più: uno per parametro, nell'ordine in cui li elenca.",
    },
    argomenti_in_meno: {
      breve: "La chiamata di «{segno}» ha meno argomenti dei suoi parametri.",
      suggerimento: "Aggiungi gli argomenti che mancano: uno per parametro, nell'ordine in cui li elenca.",
    },
    tipo_diverso: {
      breve: "L'argomento per «{segno}» non è del suo tipo.",
      suggerimento: "Passa un valore del tipo del parametro (un intero va anche in un reale); per cambiare tipo usa una conversione, come converti_a_intero(x).",
    },
    tipo_per_riferimento: {
      breve: "Il dato per «{segno}» non è dello stesso tipo del parametro.",
      suggerimento: "Per riferimento e di uscita il tipo è proprio lo stesso, anche fra intero e reale: passa un dato di quel tipo.",
    },
    lunghezza_diversa: {
      breve: "La stringa per «{segno}» non ha la sua lunghezza massima.",
      suggerimento: "Dai al dato la stessa lunghezza massima del parametro, oppure cambia quella del parametro.",
    },
    vettore_per_semplice: { breve: "«{segno}» riceve un valore solo, non un vettore.", suggerimento: "Passa un elemento, come v[i], oppure fai del parametro un vettore." },
    semplice_per_vettore: { breve: "«{segno}» è un vettore e riceve un valore solo.", suggerimento: "Passa il nome di un vettore intero, come voti, senza l'indice." },
    vettore_diverso: {
      breve: "Il vettore per «{segno}» non ha il suo tipo o la sua dimensione.",
      suggerimento: "Passa un vettore dello stesso tipo e con lo stesso numero di elementi del parametro.",
    },
    lunghezza_diversa_nel_vettore: {
      breve: "Le stringhe del vettore per «{segno}» non hanno la sua lunghezza massima.",
      suggerimento: "Dai alle stringhe del vettore la stessa lunghezza massima del parametro, oppure cambia quella del parametro.",
    },
    non_un_dato: {
      breve: "L'argomento per «{segno}» non è un dato: è un calcolo o un valore scritto.",
      suggerimento: "Per riferimento o di uscita passa una variabile o un elemento, come totale o v[i]; un calcolo mettilo prima in un dato.",
    },
    fra_parentesi: { breve: "L'argomento per «{segno}» è fra parentesi.", suggerimento: "Togli le parentesi: totale, non (totale)." },
    costante_passata: {
      breve: "«{segno}» è una costante: la procedura non la può cambiare.",
      suggerimento: "Passa una variabile; se serve il valore della costante, copialo prima in una variabile.",
    },
    contatore_passato: {
      breve: "«{segno}» è il contatore del ciclo «per»: dentro il ciclo non si può cambiare.",
      suggerimento: "Passa un altro dato, col valore del contatore copiato prima.",
    },
    elemento_passato: {
      breve: "«{segno}» è l'elemento del ciclo «per ogni»: dentro il ciclo non si può cambiare.",
      suggerimento: "Passa un altro dato; per cambiare il vettore usa un ciclo «per» e passa v[i].",
    },
    carattere_passato: {
      breve: "I caratteri della stringa «{segno}» non si possono cambiare.",
      suggerimento: "Passa la stringa intera, oppure lavora su un vettore di caratteri.",
    },
    solo_iniziale: { breve: "Il dato ha un valore iniziale che nessun blocco legge.", suggerimento: "Usa il dato dove serve il suo valore, oppure eliminalo." },
    solo_assegnazione: {
      breve: "Il dato riceve un valore da un'assegnazione, e nessun blocco lo legge.",
      suggerimento: "Usa il dato dove serve il suo valore, oppure elimina il dato e l'assegnazione.",
    },
    solo_lettura: {
      breve: "Il dato riceve un valore da una lettura, e nessun blocco lo usa.",
      suggerimento: "Usa il valore letto, in un calcolo o in una scrittura, oppure elimina il dato e la lettura.",
    },
    solo_per_ogni: {
      breve: "Il dato è l'elemento di un ciclo «per ogni», e nessun blocco lo usa.",
      suggerimento: "Usa l'elemento nel corpo del ciclo, come in somma ← somma + x.",
    },
    solo_parametro: {
      breve: "Il parametro riceve un valore dalla chiamata, e nessun blocco lo usa.",
      suggerimento: "Usa il parametro nella procedura o nella funzione, oppure eliminalo insieme al suo argomento in ogni chiamata.",
    },
  },
  en: {
    vuoto: { breve: "The field is empty.", suggerimento: "Write an expression: a data item, a number or a calculation, such as total + 1." },
    virgolette_aperte: { breve: "The opening double quote is never closed.", suggerimento: 'Close the text with another double quote: "hello".' },
    apice_aperto: { breve: "The opening single quote is never closed.", suggerimento: "Close the character with another single quote: 'a'." },
    barra_rovesciata: {
      breve: "The backslash in “{segno}” has no meaning.",
      suggerimento: "After a backslash goes n (new line), t (tab), another backslash, a single or a double quote: \"line\\n\".",
    },
    codice_vietato: { breve: "Between quotes there is the character with code 0 or a surrogate.", suggerimento: "Remove that character: it only comes from a file written outside the app." },
    numero_scritto_male: {
      breve: "The number “{segno}” is badly written.",
      suggerimento: "A real number has digits after the point (3.0, not 3.); between a number and a name goes an operator (2 * x, not 2x).",
    },
    apici_vuoti: { breve: "There is no character between the two single quotes.", suggerimento: "Write one character between them, such as 'a'; an empty text is written with double quotes: \"\"." },
    uguale_solo: {
      breve: "A single = is not part of the language.",
      suggerimento: "To compare two values write ==, as in mark == 10; to give a value to a data item use an assignment block.",
    },
    lettera_accentata: {
      breve: "The letter “{segno}” cannot be in a name: put it in double quotes, or in single quotes if alone.",
      suggerimento: "In a name write the letter without the accent (cafe, not café) or with the letters of the English alphabet (pi, not π); in a text put it between double quotes, \"café\", and a single character between single quotes, 'é'.",
    },
    simbolo_sconosciuto: { breve: "The symbol “{segno}” is not part of the language.", suggerimento: "Remove it, or put it between double quotes if it is part of a text." },
    tonda_aperta: { breve: "A parenthesis is opened and never closed.", suggerimento: "Add the ) where what is between the parentheses ends." },
    quadra_aperta: { breve: "A square bracket is opened and never closed.", suggerimento: "Add the ] after the index, as in marks[i]." },
    operando_mancante: { breve: "An operand is missing before “{segno}”.", suggerimento: "Write the missing value, or remove the extra symbol: a + b, not a + * b." },
    operando_alla_fine: {
      breve: "The text ends where an operand is still missing.",
      suggerimento: "Complete the calculation after the last operator, or remove the operator: a + b, not a +.",
    },
    simbolo_slegato: {
      breve: "“{segno}” does not connect to what comes before it.",
      suggerimento: "Between two values goes an operator (a + b), between two arguments a comma (sum(a, b)); an extra closing parenthesis is removed.",
    },
    troppo_annidata: { breve: "The expression is nested beyond 63 levels.", suggerimento: "Split the calculation into several blocks, with helper data items." },
    destinazione: {
      breve: "The target is neither a data item nor an array element.",
      suggerimento: "Write the name of a data item, such as total, or an array element, such as marks[i].",
    },
    piu_caratteri: { breve: "There is more than one character between the single quotes: “{segno}”.", suggerimento: "Between single quotes goes one character, such as 'a'; for a text use double quotes: \"ab\"." },
    accento_a_parte: {
      breve: "The character between the single quotes has its accent written separately: it is two codes.",
      suggerimento: "Write the letter with the accent already joined, from the keyboard, such as 'é'.",
    },
    oltre_elementi: {
      breve: "There are more elements than {segno}, the limit of the settings.",
      suggerimento: "Reduce the size, or raise the limit “Elements of an array” in the settings.",
    },
    oltre_lunghezza: {
      breve: "The maximum length is over {segno}, the limit of the settings.",
      suggerimento: "Reduce the maximum length, or raise the limit “Maximum length of a string” in the settings.",
    },
    oltre_caratteri: {
      breve: "Elements times maximum length make more than {segno} characters, the limit of the settings.",
      suggerimento: "Reduce the size or the maximum length (100 elements of 50 characters make 5000), or raise the limit “Characters of an array of strings”.",
    },
    nome_vuoto: { breve: "The name is empty.", suggerimento: "Write a name that starts with a letter, such as total." },
    nome_cifra: { breve: "The name starts with a digit.", suggerimento: "Put a letter first: mark1, not 1mark." },
    nome_trattino: { breve: "The name starts with an underscore.", suggerimento: "Put a letter first: total, not _total." },
    nome_accentato: { breve: "The name has the accented letter “{segno}”.", suggerimento: "Write the letter without the accent: cafe, not café." },
    nome_spazio: { breve: "The name has a space.", suggerimento: "Join the words with an underscore: average_age, not average age." },
    nome_simbolo: {
      breve: "The name has the symbol “{segno}”.",
      suggerimento: "Use only letters without accents, digits and the underscore: final_mark, not final-mark.",
    },
    nome_lungo: { breve: "The name is longer than 63 characters.", suggerimento: "Shorten the name: a few words are enough, such as average_mark." },
    nome_riservato: {
      breve: "“{segno}” is a reserved word.",
      suggerimento: "Add a part that tells it apart, such as chosen_class instead of class.",
    },
    nome_della_libreria: {
      breve: "“{segno}” is a name of the C library.",
      suggerimento: "For a procedure, a function or a shared constant choose another name, such as log_of_marks instead of log.",
    },
    nome_doppio: {
      breve: "There is already another data item, or a shared constant, called “{segno}”.",
      suggerimento: "Give each data item a name of its own: total_sales and total_costs, not two total.",
    },
    dimensione_non_valida: { breve: "The size is not a whole number of 1 or more.", suggerimento: "Write how many elements the array has, such as 10." },
    lunghezza_non_valida: {
      breve: "The maximum length is not a whole number of 1 or more.",
      suggerimento: "Write how many characters the string holds at most, such as 30, or leave the field empty to get 255.",
    },
    lunghezza_non_stringa: {
      breve: "A maximum length only applies to a string.",
      suggerimento: "Remove the maximum length, or make the data item a string: it only comes from a file written outside the app.",
    },
    costante_senza_valore: { breve: "The constant has no initial value.", suggerimento: "Write its value, such as 3.14, or make it a variable." },
    costante_con_ruolo: {
      breve: "The constant has an input or output role.",
      suggerimento: "Choose the “working” role, or make it a variable if the program reads or writes it.",
    },
    elenco_di_altra_lunghezza: {
      breve: "The list has {segno} values, not one for each element.",
      suggerimento: "Write one value per element, such as {1, 2, 3} for an array of 3, or change the size.",
    },
    valore_non_scritto: {
      breve: "“{segno}” is not a written value: it is a name or a calculation.",
      suggerimento: 'An initial value is written as a value, such as 10 or "hello"; a calculation goes in an assignment block.',
    },
    parametro_fuori_posto: {
      breve: "The data item is a parameter, but the main program and the shared constants have none.",
      suggerimento: "Make it a variable, or move it among the data of a procedure: it only comes from a file written outside the app.",
    },
    parametro_con_attributi: {
      breve: "The parameter has an initial value, a role or the nature of a constant.",
      suggerimento: "A parameter gets its value from the call: remove those attributes. It only comes from a file written outside the app.",
    },
    comune_non_costante: {
      breve: "The shared constant is not a constant.",
      suggerimento: "Make it a constant, or move it among the data of the program: it only comes from a file written outside the app.",
    },
    forma_del_valore: {
      breve: "The initial value has the wrong form: a list for a simple data item, or the other way round.",
      suggerimento: "A simple data item has one value, such as 5; an array a list, such as {1, 2, 3}. It only comes from a file written outside the app.",
    },
    sempre_vera: { breve: "The condition is always true: the loop never stops.", suggerimento: "Write a condition that depends on the data, such as i <= n." },
    mentre_falsa: { breve: "The condition is always false: the While loop never starts.", suggerimento: "Write a condition that depends on the data, such as i <= n." },
    ripeti_falsa: { breve: "The condition is always false: the Repeat loop goes round only once.", suggerimento: "Write a condition that depends on the data, such as i <= n." },
    carattere_della_stringa: {
      breve: "The characters of the string “{segno}” can only be read.",
      suggerimento: 'Build a new string, such as s ← "c" + s, or work on an array of characters.',
    },
    contatore_del_ciclo: {
      breve: "“{segno}” is the counter of the For loop around it: here it can only be read.",
      suggerimento: "Only its loop changes it: for another count use another data item, also in a loop inside the other.",
    },
    elemento_del_ciclo: {
      breve: "“{segno}” is the element of the For each loop around it: here it can only be read.",
      suggerimento: "Only its loop changes it: to change the array use a For loop with the index, such as v[i] ← 0.",
    },
    funzione_legge: {
      breve: "The function reads from the console: a function only works out its result.",
      suggerimento: "Read the value in its caller and pass it as an argument, or make it a procedure.",
    },
    funzione_scrive: {
      breve: "The function writes to the console: a function only works out its result.",
      suggerimento: "Write the result in its caller, or make it a procedure.",
    },
    funzione_salta: {
      breve: "The function calls a procedure: a function only works out its result.",
      suggerimento: "Move the call into the caller of the function, or make it a procedure.",
    },
    parametro_non_copia: {
      breve: "The parameter “{segno}” is by reference or output: a function only gets copies.",
      suggerimento: "Pass it by value, or make the function a procedure.",
    },
    argomenti_in_piu: {
      breve: "The call of “{segno}” has more arguments than its parameters.",
      suggerimento: "Remove the extra arguments: one per parameter, in the order in which it lists them.",
    },
    argomenti_in_meno: {
      breve: "The call of “{segno}” has fewer arguments than its parameters.",
      suggerimento: "Add the missing arguments: one per parameter, in the order in which it lists them.",
    },
    tipo_diverso: {
      breve: "The argument for “{segno}” is not of its type.",
      suggerimento: "Pass a value of the type of the parameter (an integer also goes into a real); to change type use a conversion, such as to_integer(x).",
    },
    tipo_per_riferimento: {
      breve: "The data item for “{segno}” is not of the same type as the parameter.",
      suggerimento: "By reference and output the type is exactly the same, even between integer and real: pass a data item of that type.",
    },
    lunghezza_diversa: {
      breve: "The string for “{segno}” does not have its maximum length.",
      suggerimento: "Give the data item the same maximum length as the parameter, or change the one of the parameter.",
    },
    vettore_per_semplice: { breve: "“{segno}” gets a single value, not an array.", suggerimento: "Pass an element, such as v[i], or make the parameter an array." },
    semplice_per_vettore: { breve: "“{segno}” is an array and gets a single value.", suggerimento: "Pass the name of a whole array, such as marks, without the index." },
    vettore_diverso: {
      breve: "The array for “{segno}” does not have its type or its size.",
      suggerimento: "Pass an array of the same type and with the same number of elements as the parameter.",
    },
    lunghezza_diversa_nel_vettore: {
      breve: "The strings of the array for “{segno}” do not have its maximum length.",
      suggerimento: "Give the strings of the array the same maximum length as the parameter, or change the one of the parameter.",
    },
    non_un_dato: {
      breve: "The argument for “{segno}” is not a data item: it is a calculation or a written value.",
      suggerimento: "By reference or output pass a variable or an element, such as total or v[i]; put a calculation in a data item first.",
    },
    fra_parentesi: { breve: "The argument for “{segno}” is in parentheses.", suggerimento: "Remove the parentheses: total, not (total)." },
    costante_passata: {
      breve: "“{segno}” is a constant: the procedure cannot change it.",
      suggerimento: "Pass a variable; if you need the value of the constant, copy it into a variable first.",
    },
    contatore_passato: {
      breve: "“{segno}” is the counter of the For loop: inside the loop it cannot change.",
      suggerimento: "Pass another data item, with the value of the counter copied first.",
    },
    elemento_passato: {
      breve: "“{segno}” is the element of the For each loop: inside the loop it cannot change.",
      suggerimento: "Pass another data item; to change the array use a For loop and pass v[i].",
    },
    carattere_passato: {
      breve: "The characters of the string “{segno}” cannot change.",
      suggerimento: "Pass the whole string, or work on an array of characters.",
    },
    solo_iniziale: { breve: "The data item has an initial value that no block reads.", suggerimento: "Use the data item where its value is needed, or delete it." },
    solo_assegnazione: {
      breve: "The data item gets a value from an assignment, and no block reads it.",
      suggerimento: "Use the data item where its value is needed, or delete the data item and the assignment.",
    },
    solo_lettura: {
      breve: "The data item gets a value from a read, and no block uses it.",
      suggerimento: "Use the value read, in a calculation or in a write, or delete the data item and the read.",
    },
    solo_per_ogni: {
      breve: "The data item is the element of a For each loop, and no block uses it.",
      suggerimento: "Use the element in the body of the loop, as in sum ← sum + x.",
    },
    solo_parametro: {
      breve: "The parameter gets a value from the call, and no block uses it.",
      suggerimento: "Use the parameter in the procedure or the function, or delete it together with its argument in every call.",
    },
  },
};

/** Il testo di una segnalazione: con la causa precisa, quella sola (la frase breve, anche al posto del breve del codice);
 * senza, il testo del codice, che elenca tutte le cause. */
export function testoDellaSegnalazione(lingua: Lingua, codice: Codice, sulRisultato: boolean, fermata?: Fermata): TestoDelCodice {
  if (fermata === undefined) return testoDelMessaggio(lingua, codice, sulRisultato);
  const t = testiDelleCause[lingua][fermata.causa];
  const breve = riempi(t.breve, { segno: fermata.segno ?? "" });
  return { breve, accaduto: breve, suggerimento: t.suggerimento };
}
