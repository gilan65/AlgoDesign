// I testi di ciò che manca a un progetto perché si scriva in un linguaggio con meno costrutti del flowchart (oggi
// «Accademico»), in italiano e in inglese: per ogni specie la frase breve, che sta nell'elenco al posto del codice, e il
// suggerimento, che la riga di stato mostra col clic sulla voce. Il tipo vuole ogni specie in ogni lingua, e nessun'altra:
// una chiave mancante o in più è un errore di `tsc`. `{operatore}` è il nome dell'operatore nella lingua del testo.
import type { SpecieDellaMancanza } from "../core/genera/forma";
import type { Lingua } from "./lingue";

export type TestoDellaMancanza = { readonly breve: string; readonly suggerimento: string };

export const testiDelleMancanze: Record<Lingua, Record<SpecieDellaMancanza, TestoDellaMancanza>> = {
  it: {
    reale: {
      breve: "Il tipo reale non è supportato in Accademico: ci sono solo gli interi.",
      suggerimento: "Usa un intero: per esempio un prezzo in euro diventa un numero di centesimi.",
    },
    carattere: {
      breve: "Il tipo carattere non è supportato in Accademico.",
      suggerimento: "Usa un intero al suo posto: per esempio 1 per «sì» e 0 per «no» invece di 's' e 'n'.",
    },
    stringa: {
      breve: "Il tipo stringa non è supportato in Accademico.",
      suggerimento: "Un testo si può solo scrivere: metti la frase fra virgolette direttamente nella Scrittura.",
    },
    record: {
      breve: "Il tipo record non è supportato in Accademico.",
      suggerimento: "Usa un dato intero per ogni campo: per esempio voto_anna al posto di anna.voto.",
    },
    matrice: {
      breve: "La matrice non è supportata in Accademico.",
      suggerimento: "Usa un vettore per ogni riga: per esempio riga0[j] al posto di m[0][j].",
    },
    tabella: {
      breve: "La tabella non è supportata in Accademico.",
      suggerimento: "Usa un vettore per ogni campo: per esempio voti[i] al posto di t[i].voto.",
    },
    lettura: {
      breve: "La Lettura non è supportata in Accademico.",
      suggerimento: "Togli la Lettura e dai il valore con un'Assegnazione, o passalo come parametro a una procedura.",
    },
    rif: {
      breve: "Il parametro per riferimento (rif) non è supportato in Accademico.",
      suggerimento: "Fai restituire il valore da una funzione, o passa il parametro per valore se non va cambiato.",
    },
    out: {
      breve: "Il parametro di uscita (out) non è supportato in Accademico.",
      suggerimento: "Fai restituire il valore da una funzione invece di metterlo nel parametro.",
    },
    "letterale-reale": {
      breve: "Un numero con la virgola non è supportato in Accademico.",
      suggerimento: "Scrivi un intero: per esempio conta in decimi e scrivi 25 invece di 2,5.",
    },
    "letterale-carattere": {
      breve: "Un carattere fra apici, come 'a', non è supportato in Accademico.",
      suggerimento: "Usa un intero al suo posto: per esempio 1 per «sì» e 0 per «no».",
    },
    "letterale-stringa": {
      breve: "Un testo fra virgolette è supportato solo in una Scrittura.",
      suggerimento: "Sposta il testo nella Scrittura che lo mostra: per esempio scrivi \"Totale: \" e poi il dato.",
    },
    potenza: {
      breve: "L'operatore {operatore} non è presente in Accademico.",
      suggerimento: "Calcola la potenza con le moltiplicazioni: per esempio x × x × x per il cubo, o con un ciclo.",
    },
    radice: {
      breve: "L'operatore {operatore} non è presente in Accademico.",
      suggerimento: "Cerca la radice con un ciclo: il numero r più grande con r × r ≤ n.",
    },
    "valore-assoluto": {
      breve: "L'operatore {operatore} non è presente in Accademico.",
      suggerimento: "Usa un Se: quando x è minore di 0, assegna a x il valore 0 - x.",
    },
    arrotondamento: {
      breve: "L'operatore {operatore} non è presente in Accademico.",
      suggerimento: "Togli l'operatore e lavora con gli interi: la divisione fra interi dà già la parte intera.",
    },
    conversione: {
      breve: "L'operatore {operatore} non è presente in Accademico.",
      suggerimento: "Togli la conversione e lavora solo con interi e vettori di interi.",
    },
    lunghezza: {
      breve: "L'operatore {operatore} non è presente in Accademico.",
      suggerimento: "Passa la lunghezza come parametro intero: per esempio n accanto al vettore v.",
    },
    pi: {
      breve: "Il valore pi_greco non è presente in Accademico.",
      suggerimento: "Usa un intero al suo posto: per esempio 314 se fai i conti in centesimi.",
    },
    "parola-del-linguaggio": {
      breve: "Il nome è una parola di Accademico.",
      suggerimento: "Cambia il nome: per esempio «massimo» invece di «max», «fine» invece di «end».",
    },
    "condizione-come-valore": {
      breve: "Una condizione qui non si può scrivere: va solo dopo Se, Mentre o Ripeti.",
      suggerimento: "Metti la condizione in un Se che assegna 1 o 0 a un dato intero, e usa il dato.",
    },
  },
  en: {
    reale: {
      breve: "The real type is not supported in Academic: there are only integers.",
      suggerimento: "Use an integer: for example a price in euros becomes a number of cents.",
    },
    carattere: {
      breve: "The character type is not supported in Academic.",
      suggerimento: "Use an integer instead: for example 1 for “yes” and 0 for “no” instead of 'y' and 'n'.",
    },
    stringa: {
      breve: "The string type is not supported in Academic.",
      suggerimento: "A text can only be written: put the sentence in quotes directly in the Write block.",
    },
    record: {
      breve: "The record type is not supported in Academic.",
      suggerimento: "Use an integer data item for each field: for example anna_mark instead of anna.mark.",
    },
    matrice: {
      breve: "The matrix is not supported in Academic.",
      suggerimento: "Use an array for each row: for example row0[j] instead of m[0][j].",
    },
    tabella: {
      breve: "The table is not supported in Academic.",
      suggerimento: "Use an array for each field: for example marks[i] instead of t[i].mark.",
    },
    lettura: {
      breve: "The Read block is not supported in Academic.",
      suggerimento: "Remove the Read block and assign the value, or pass it as a parameter to a procedure.",
    },
    rif: {
      breve: "The parameter by reference (ref) is not supported in Academic.",
      suggerimento: "Have a function return the value, or pass the parameter by value if it must not change.",
    },
    out: {
      breve: "The output parameter (out) is not supported in Academic.",
      suggerimento: "Have a function return the value instead of putting it in the parameter.",
    },
    "letterale-reale": {
      breve: "A number with a decimal point is not supported in Academic.",
      suggerimento: "Write an integer: for example count in tenths and write 25 instead of 2.5.",
    },
    "letterale-carattere": {
      breve: "A character in single quotes, like 'a', is not supported in Academic.",
      suggerimento: "Use an integer instead: for example 1 for “yes” and 0 for “no”.",
    },
    "letterale-stringa": {
      breve: "A text in quotes is supported only in a Write block.",
      suggerimento: "Move the text to the Write block that shows it: for example \"Total: \" and then the data item.",
    },
    potenza: {
      breve: "The operator {operatore} is not present in Academic.",
      suggerimento: "Compute the power with multiplications: for example x × x × x for the cube, or with a loop.",
    },
    radice: {
      breve: "The operator {operatore} is not present in Academic.",
      suggerimento: "Find the root with a loop: the largest number r with r × r ≤ n.",
    },
    "valore-assoluto": {
      breve: "The operator {operatore} is not present in Academic.",
      suggerimento: "Use an If: when x is less than 0, assign x the value 0 - x.",
    },
    arrotondamento: {
      breve: "The operator {operatore} is not present in Academic.",
      suggerimento: "Remove the operator and work with integers: dividing integers already gives the integer part.",
    },
    conversione: {
      breve: "The operator {operatore} is not present in Academic.",
      suggerimento: "Remove the conversion and work only with integers and arrays of integers.",
    },
    lunghezza: {
      breve: "The operator {operatore} is not present in Academic.",
      suggerimento: "Pass the length as an integer parameter: for example n next to the array v.",
    },
    pi: {
      breve: "The value pi is not present in Academic.",
      suggerimento: "Use an integer instead: for example 314 if you compute in hundredths.",
    },
    "parola-del-linguaggio": {
      breve: "The name is a word of Academic.",
      suggerimento: "Change the name: for example “maximum” instead of “max”, “finish” instead of “end”.",
    },
    "condizione-come-valore": {
      breve: "A condition cannot be written here: it goes only after If, While or Repeat.",
      suggerimento: "Put the condition in an If that assigns 1 or 0 to an integer data item, and use the data item.",
    },
  },
};
