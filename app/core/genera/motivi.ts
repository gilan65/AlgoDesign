// I motivi con cui un programma generato si ferma («Errore alla riga N: motivo» sullo standard error), nelle lingue
// del codice, e il codice d'errore del nucleo che ognuno vuol dire: una tabella sola, letta dal generatore che li
// scrive e da chi confronta l'esito del programma generato con quello dell'interprete.
//
// Ci sono solo gli errori che le funzioni di supporto fermano: le regole del linguaggio sui dati, sull'input e sullo
// stesso elemento di un vettore passato due volte per riferimento nella stessa chiamata, e i due tetti della ricorsione
// (le chiamate in corso, lo spazio dei loro dati), coi testi brevi dei messaggi dell'interfaccia (`i18n/codici.ts`), che
// dicono il tetto delle chiamate del progetto (`{tetto}`, riempito da `motiviCol`). I
// comportamenti che il C non definisce (overflow, divisione per zero, indice fuori da un vettore, dato senza valore,
// reale non finito) il codice generato non li controlla, e qui non hanno un motivo.

import { opzioniPredefinite, type CodiceErrore } from "../progetto/modello";
import type { LinguaDelCodice } from "./nomi";

// Su una riga sola: il censimento dei codici nel nucleo salta le dichiarazioni di tipo dalla loro prima riga.
export type CodiceDiUnMotivo = Extract<CodiceErrore, "invalid_input" | "input_exhausted" | "invalid_character_code" | "string_too_long" | "string_longer_than_array" | "null_character_in_string" | "index_out_of_range" | "same_reference" | "recursion_too_deep" | "recursion_data_too_large">;

/** La tabella dei motivi: per ogni lingua del codice, il motivo di ogni codice. */
export type TabellaDeiMotivi = Readonly<Record<LinguaDelCodice, Readonly<Record<CodiceDiUnMotivo, string>>>>;

/** I motivi, col tetto delle chiamate del progetto al posto di `{tetto}`. */
const modelli: TabellaDeiMotivi = {
  it: {
    invalid_input: "input non valido",
    input_exhausted: "input finito",
    invalid_character_code: "codice di carattere non valido",
    string_too_long: "stringa troppo lunga",
    string_longer_than_array: "stringa più lunga del vettore",
    null_character_in_string: "carattere di codice 0 in una stringa",
    index_out_of_range: "indice fuori dalla stringa",
    same_reference: "lo stesso elemento passato due volte per riferimento",
    recursion_too_deep: "La procedura o la funzione è stata richiamata {tetto} volte, e nessuna è finita.",
    recursion_data_too_large: "I dati delle chiamate in corso non stanno più nella pila.",
  },
  en: {
    invalid_input: "invalid input",
    input_exhausted: "input exhausted",
    invalid_character_code: "invalid character code",
    string_too_long: "string too long",
    string_longer_than_array: "string longer than the array",
    null_character_in_string: "character with code 0 in a string",
    index_out_of_range: "index outside the string",
    same_reference: "the same element passed twice by reference",
    recursion_too_deep: "The procedure or function has been called {tetto} times without any call ending.",
    recursion_data_too_large: "The data of the calls in progress no longer fit on the stack.",
  },
};

/** I motivi di un progetto col suo tetto delle chiamate (`tettoDelleChiamate` di `core/controllo/spazio.ts`). */
export function motiviCol(tetto: number): TabellaDeiMotivi {
  const r = (s: string) => s.split("{tetto}").join(String(tetto));
  const lingua = (l: LinguaDelCodice) => Object.fromEntries(Object.entries(modelli[l]).map(([c, s]) => [c, r(s)])) as Record<CodiceDiUnMotivo, string>;
  return { it: lingua("it"), en: lingua("en") };
}

/** I motivi di un progetto col tetto predefinito: quelli di ogni progetto senza l'opzione. */
export const motivi: TabellaDeiMotivi = motiviCol(opzioniPredefinite.call_stack_limit);

/** Il codice d'errore di un motivo scritto dal programma generato in quella lingua; `undefined` se non è un motivo. La
 * tabella è quella del linguaggio (nel registro dei linguaggi, col tetto del progetto), oggi la stessa per il Python e
 * per il C. */
export function codiceDelMotivo(lingua: LinguaDelCodice, motivo: string, tabella: TabellaDeiMotivi = motivi): CodiceDiUnMotivo | undefined {
  const voce = Object.entries(tabella[lingua]).find(([, testo]) => testo === motivo);
  return voce?.[0] as CodiceDiUnMotivo | undefined;
}
