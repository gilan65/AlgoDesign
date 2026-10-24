// I tetti della ricorsione: quante chiamate delle funzioni del giro possono essere in
// corso insieme, e quanto spazio possono occupare i loro dati. Li leggono l'interprete e i due generatori, così che i
// tre esecutori si fermino nello stesso punto.
//
// Lo spazio di una chiamata è ciò che il C generato tiene sulla pila per lei (misurato con gcc e clang): i dati della
// funzione nella loro misura del C (un intero 4 byte, un reale 8, un carattere 4, un booleano 1, una stringa 4 · la
// lunghezza massima + 1, un vettore gli elementi per la misura del tipo); un parametro per riferimento o per uscita è un
// indirizzo, 8 byte; un parametro stringa o vettore per valore è l'indirizzo ricevuto più la copia; poi il valore
// restituito, se è una stringa o un vettore; l'area di ogni concatenazione, 4 · la lunghezza massima del suo
// risultato + 1; e la struttura di ogni chiamata a una funzione che restituisce una stringa o un vettore (la sorgente di
// un «per ogni», una parte messa da parte, un argomento), che il C tiene nella cornice di chi chiama. Una struttura si
// conta per ogni chiamata scritta, anche se il C ne riusa una fra un blocco e l'altro: il conto può superare di poco
// ciò che il C tiene, mai restarne sotto. Il resto della cornice (l'indirizzo di ritorno, gli interi di passaggio) non si conta: sta nel margine
// fra lo spazio fisso e la pila più piccola misurata, 1 MB del clang.

import { analizza, type Espressione } from "../espressioni/analizzatore";
import type { Dato, Funzione, Progetto, Tipo } from "../progetto/modello";
import { figliDelBlocco, lunghezzaPredefinita, testiDelBlocco } from "./controllo";
import { lunghezzaMassima } from "./lunghezza";

/** Le chiamate in corso delle funzioni del giro: la successiva ferma l'esecuzione (`recursion_too_deep`). */
export const tettoDelleChiamate = 500;
/** Lo spazio dei dati delle chiamate in corso delle funzioni del giro, in byte: oltre, la chiamata ferma l'esecuzione
 * (`recursion_data_too_large`). Un quarto della pila del clang. */
export const spazioDellaPila = 262_144;

/** Un indirizzo. */
const indirizzo = 8;

/** I byte di un elemento del tipo dato. */
const byteDelTipo = (tipo: Tipo, lunghezza: number | undefined): number =>
  tipo === "string" ? 4 * (lunghezza ?? lunghezzaPredefinita) + 1 : { integer: 4, real: 8, character: 4, boolean: 1 }[tipo];

/** I byte di un dato intero: tutti i suoi elementi. */
const byteDelDato = (d: Pick<Dato, "type" | "size" | "max_length">): number => (d.size ?? 1) * byteDelTipo(d.type, d.max_length);

/** Lo spazio di una chiamata di `f`, in byte. */
export function spazioDiUnaChiamata(f: Funzione, p: Progetto): number {
  const dati = f.data.reduce((somma, d) => {
    if (d.parameter === "reference" || d.parameter === "out") return somma + indirizzo;
    if (d.parameter === "value" && (d.size !== undefined || d.type === "string")) return somma + indirizzo + byteDelDato(d);
    return somma + byteDelDato(d);
  }, 0);
  const restituito =
    f.kind === "function" && (f.return_size !== undefined || f.return_type === "string")
      ? byteDelDato({ type: f.return_type!, size: f.return_size, max_length: f.return_max_length })
      : 0;
  return dati + restituito + aree(f, p);
}

/** Le aree di `f` per i valori di passaggio, in ogni testo dei suoi blocchi e nel valore restituito: una per ogni `+` fra
 * stringhe, e una per ogni chiamata a una funzione che restituisce una stringa o un vettore (la sua struttura). */
function aree(f: Funzione, p: Progetto): number {
  const perNome = new Map([...(p.shared_constants ?? []), ...f.data].map((d) => [d.name, d]));
  const datoDi = (nome: string) => perNome.get(nome);
  const funzioneDi = (nome: string) => p.functions.find((g) => g.name === nome);
  /** Un'espressione che dà una stringa: è ciò che rende un `+` una concatenazione. */
  const stringa = (e: Espressione): boolean => {
    switch (e.genere) {
      case "stringa":
        return true;
      case "nome": {
        const d = datoDi(e.nome);
        return d?.type === "string" && d.size === undefined;
      }
      case "chiamata": {
        const g = funzioneDi(e.nome);
        return g?.return_type === "string" && g.return_size === undefined;
      }
      case "indice": {
        const b = e.base;
        if (b.genere === "nome") return datoDi(b.nome)?.type === "string" && datoDi(b.nome)?.size !== undefined;
        if (b.genere === "chiamata") return funzioneDi(b.nome)?.return_type === "string" && funzioneDi(b.nome)?.return_size !== undefined;
        return false;
      }
      case "unario":
        return e.operatore === "to_string";
      case "binario":
        return e.operatore === "+" && (stringa(e.sinistro) || stringa(e.destro));
      default:
        return false;
    }
  };
  let byte = 0;
  const visita = (e: Espressione) => {
    if (e.genere === "binario" && e.operatore === "+" && stringa(e)) byte += 4 * lunghezzaMassima(e, datoDi, funzioneDi) + 1;
    if (e.genere === "chiamata") {
      const g = funzioneDi(e.nome);
      if (g?.kind === "function" && (g.return_size !== undefined || g.return_type === "string")) byte += byteDelDato({ type: g.return_type!, size: g.return_size, max_length: g.return_max_length });
    }
    if (e.genere === "indice") [e.base, e.indice].forEach(visita);
    else if (e.genere === "unario") visita(e.operando);
    else if (e.genere === "binario") [e.sinistro, e.destro].forEach(visita);
    else if (e.genere === "chiamata") e.argomenti.forEach(visita);
  };
  const testo = (t: string) => {
    const a = analizza(t);
    if (a.ok) visita(a.espressione);
  };
  const blocco = (b: Funzione["body"][number]) => {
    testiDelBlocco(b).forEach(testo);
    figliDelBlocco(b).forEach(blocco);
  };
  f.body.forEach(blocco);
  if (f.end.return_value !== undefined) testo(f.end.return_value);
  return byte;
}
