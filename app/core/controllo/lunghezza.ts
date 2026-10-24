// La lunghezza massima che un'espressione stringa può avere, contata in caratteri: la usano i generatori per decidere
// dove una stringa calcolata va controllata (una destinazione più corta) e quanto grande è l'area di una
// concatenazione nel C. Il controllo statico giudica solo i testi scritti fra virgolette, e l'interprete guarda la
// lunghezza vera: a loro non serve.
//
// Un testo fra virgolette ha la sua lunghezza; un dato stringa, un elemento di un vettore di stringhe e una funzione
// che restituisce una stringa (o l'elemento di un vettore di stringhe restituito) la loro lunghezza massima; un
// carattere, anche preso da una stringa, 1; una concatenazione la somma dei due lati.

import type { Espressione } from "../espressioni/analizzatore";
import type { Dato, Funzione } from "../progetto/modello";
import { lunghezzaPredefinita } from "./controllo";

/** `datoDi` e `funzioneDi` danno il dato e la funzione di un nome, se ci sono. */
export function lunghezzaMassima(e: Espressione, datoDi: (nome: string) => Dato | undefined, funzioneDi: (nome: string) => Funzione | undefined): number {
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
      // L'elemento di un vettore di stringhe è una stringa; ogni altro indice prende un carattere, o un elemento che non
      // è una stringa.
      const b = e.base;
      if (b.genere === "nome") {
        const d = datoDi(b.nome);
        return d?.type === "string" && d.size !== undefined ? (d.max_length ?? lunghezzaPredefinita) : 1;
      }
      if (b.genere === "chiamata") {
        const f = funzioneDi(b.nome);
        return f?.return_type === "string" && f.return_size !== undefined ? (f.return_max_length ?? lunghezzaPredefinita) : 1;
      }
      return 1;
    }
    case "binario":
      return lunghezzaMassima(e.sinistro, datoDi, funzioneDi) + lunghezzaMassima(e.destro, datoDi, funzioneDi);
    default:
      return 1;
  }
}
