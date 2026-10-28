// La lunghezza massima che un'espressione stringa può avere, contata in caratteri: la usano i generatori per decidere
// dove una stringa calcolata va controllata (una destinazione più corta) e quanto grande è l'area di una
// concatenazione nel C. Il controllo statico giudica solo i testi scritti fra virgolette, e l'interprete guarda la
// lunghezza vera: a loro non serve.
//
// Un testo fra virgolette ha la sua lunghezza; un dato stringa, un elemento di un vettore di stringhe e una funzione
// che restituisce una stringa (o l'elemento di un vettore di stringhe restituito) la loro lunghezza massima; un campo
// stringa di un record la sua (se chi chiama sa dire i campi, `campoDi`); un carattere, anche preso da una stringa, 1;
// una concatenazione la somma dei due lati.

import type { Espressione } from "../espressioni/analizzatore";
import type { Campo, Dato, Funzione } from "../progetto/modello";
import { lunghezzaPredefinita } from "./controllo";

/** Il tipo e la lunghezza massima dell'elemento che un indice prende da un vettore o da una matrice (un dato o il
 * risultato di una funzione): `v[i]`, `m[i][j]`, `f(x)[i]`, `g(x)[i][j]`. Nessuno per il carattere di una stringa
 * (`s[i]`, `v[i][j]` su un vettore di stringhe) e per la riga di una matrice (`m[i]`, che non è un elemento). */
export function elementoDi(
  e: Extract<Espressione, { genere: "indice" }>,
  datoDi: (nome: string) => Dato | undefined,
  funzioneDi: (nome: string) => Funzione | undefined,
): Pick<Dato, "type" | "max_length"> | undefined {
  /** Le misure del vettore (`righe` false) o della matrice (`righe` true) che `b` nomina. */
  const di = (b: Espressione, righe: boolean): Pick<Dato, "type" | "max_length"> | undefined => {
    if (b.genere === "nome") {
      const d = datoDi(b.nome);
      return d?.size !== undefined && (d.columns !== undefined) === righe ? d : undefined;
    }
    if (b.genere === "chiamata") {
      const f = funzioneDi(b.nome);
      return f?.return_size !== undefined && (f.return_columns !== undefined) === righe && f.return_type !== "record"
        ? { type: f.return_type!, ...(f.return_max_length === undefined ? {} : { max_length: f.return_max_length }) }
        : undefined;
    }
    return undefined;
  };
  return e.base.genere === "indice" ? di(e.base.base, true) : di(e.base, false);
}

/** `datoDi` e `funzioneDi` danno il dato e la funzione di un nome, se ci sono; `campoDi` il campo di un record. */
export function lunghezzaMassima(
  e: Espressione,
  datoDi: (nome: string) => Dato | undefined,
  funzioneDi: (nome: string) => Funzione | undefined,
  campoDi?: (e: Extract<Espressione, { genere: "campo" }>) => Campo | undefined,
): number {
  switch (e.genere) {
    case "stringa":
      return e.codici.length;
    case "nome": {
      const d = datoDi(e.nome);
      return d?.type === "string" && d.size === undefined ? (d.max_length ?? lunghezzaPredefinita) : 1;
    }
    case "chiamata": {
      const f = funzioneDi(e.nome);
      return f?.return_type === "string" && f.return_size === undefined ? (f.return_max_length ?? lunghezzaPredefinita) : 1;
    }
    case "indice": {
      // L'elemento di un vettore o di una matrice di stringhe è una stringa; ogni altro indice prende un carattere, o un
      // elemento che non è una stringa.
      const d = elementoDi(e, datoDi, funzioneDi);
      return d?.type === "string" ? (d.max_length ?? lunghezzaPredefinita) : 1;
    }
    case "campo": {
      const c = campoDi?.(e);
      return c?.type === "string" ? (c.max_length ?? lunghezzaPredefinita) : 1;
    }
    case "binario":
      return lunghezzaMassima(e.sinistro, datoDi, funzioneDi, campoDi) + lunghezzaMassima(e.destro, datoDi, funzioneDi, campoDi);
    default:
      return 1;
  }
}
