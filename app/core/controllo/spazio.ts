// I tetti della ricorsione: quante chiamate delle funzioni del giro possono essere in
// corso insieme, e quanto spazio possono occupare i loro dati. Li leggono l'interprete e i due generatori, così che i
// tre esecutori si fermino nello stesso punto.
//
// Lo spazio di una chiamata è ciò che il C generato tiene sulla pila per lei (misurato con gcc e clang): i dati della
// funzione nella loro misura del C (un intero 4 byte, un reale 8, un carattere 4, un booleano 1, una stringa 4 · la
// lunghezza massima + 1, un vettore gli elementi per la misura del tipo, un record la somma dei suoi campi, ognuno
// arrotondato a 8 byte, l'allineamento più largo, così il conto non resta mai sotto la `struct` del C con i suoi
// riempimenti); un parametro per riferimento o per uscita è un indirizzo, 8 byte; un parametro stringa, vettore o record
// per valore è l'indirizzo ricevuto più la copia; poi il valore restituito, se è una stringa, un vettore o un record;
// l'area di ogni concatenazione, 4 · la lunghezza massima del suo risultato + 1 (anche di un campo stringa); e la
// struttura di ogni chiamata a una funzione che restituisce una stringa, un vettore o un record (la sorgente di
// un «per ogni», una parte messa da parte, un argomento), che il C tiene nella cornice di chi chiama. Una struttura si
// conta per ogni chiamata scritta, anche se il C ne riusa una fra un blocco e l'altro: il conto può superare di poco
// ciò che il C tiene, mai restarne sotto. Il resto della cornice (l'indirizzo di ritorno, gli interi di passaggio) non si conta: sta nel margine
// fra lo spazio fisso e la pila più piccola misurata, 1 MB del clang.

import { analizza, type Espressione } from "../espressioni/analizzatore";
import { opzioniPredefinite, type Campo, type Dato, type Funzione, type Progetto, type Tipo } from "../progetto/modello";
import { figliDelBlocco, lunghezzaPredefinita, testiDelBlocco } from "./controllo";
import { lunghezzaMassima } from "./lunghezza";

/** Le chiamate in corso delle funzioni del giro: la successiva ferma l'esecuzione (`recursion_too_deep`). È un'opzione
 * del progetto (`call_stack_limit`, da 5 a 500); un progetto senza l'opzione ha il predefinito, 500. */
export const tettoDelleChiamate = (p: Pick<Progetto, "options">): number => p.options?.call_stack_limit ?? opzioniPredefinite.call_stack_limit;
/** Lo spazio dei dati delle chiamate in corso delle funzioni del giro, in byte: oltre, la chiamata ferma l'esecuzione
 * (`recursion_data_too_large`). Un quarto della pila del clang. */
export const spazioDellaPila = 262_144;

/** Un indirizzo. */
const indirizzo = 8;

/** I byte di un elemento del tipo dato. */
const byteDelTipo = (tipo: Tipo, lunghezza: number | undefined): number =>
  tipo === "string" ? 4 * (lunghezza ?? lunghezzaPredefinita) + 1 : { integer: 4, real: 8, character: 4, boolean: 1 }[tipo];

/** I byte di un record: i suoi campi, ognuno arrotondato a 8. */
const byteDelRecord = (campi: readonly Campo[]): number => campi.reduce((somma, c) => somma + 8 * Math.ceil(byteDelTipo(c.type, c.max_length) / 8), 0);

/** I campi di un dato (o di un risultato) record del progetto; nessuno per un altro tipo. */
const campiDi = (d: Pick<Dato, "type" | "record">, p: Progetto): readonly Campo[] | undefined =>
  d.type === "record" ? (p.records ?? []).find((r) => r.name === d.record)?.fields : undefined;

/** I byte di un dato intero: tutti i suoi elementi, o tutti i suoi campi. */
const byteDelDato = (d: Pick<Dato, "type" | "record" | "size" | "max_length">, p: Progetto): number => {
  const campi = campiDi(d, p);
  return (d.size ?? 1) * (campi !== undefined ? byteDelRecord(campi) : byteDelTipo(d.type as Tipo, d.max_length));
};

/** Lo spazio di una chiamata di `f`, in byte. */
export function spazioDiUnaChiamata(f: Funzione, p: Progetto): number {
  const dati = f.data.reduce((somma, d) => {
    if (d.parameter === "reference" || d.parameter === "out") return somma + indirizzo;
    if (d.parameter === "value" && (d.size !== undefined || d.type === "string" || d.type === "record")) return somma + indirizzo + byteDelDato(d, p);
    return somma + byteDelDato(d, p);
  }, 0);
  return dati + byteDelRestituito(f, p) + aree(f, p);
}

/** Lo spazio del valore che una funzione restituisce, se è una stringa, un vettore o un record; zero altrimenti. */
const byteDelRestituito = (g: Funzione, p: Progetto): number =>
  g.kind === "function" && (g.return_size !== undefined || g.return_type === "string" || g.return_type === "record")
    ? byteDelDato({ type: g.return_type!, record: g.return_record, size: g.return_size, max_length: g.return_max_length }, p)
    : 0;

/** Le aree di `f` per i valori di passaggio, in ogni testo dei suoi blocchi e nel valore restituito: una per ogni `+` fra
 * stringhe, e una per ogni chiamata a una funzione che restituisce una stringa, un vettore o un record (la sua
 * struttura). */
function aree(f: Funzione, p: Progetto): number {
  const perNome = new Map([...(p.shared_constants ?? []), ...f.data].map((d) => [d.name, d]));
  const datoDi = (nome: string) => perNome.get(nome);
  const funzioneDi = (nome: string) => p.functions.find((g) => g.name === nome);
  /** Il campo di un dato record o del record restituito da una funzione. */
  const campoDi = (e: Extract<Espressione, { genere: "campo" }>): Campo | undefined => {
    const b = e.base;
    const di = b.genere === "nome" ? datoDi(b.nome) : b.genere === "chiamata" ? funzioneDi(b.nome) : undefined;
    const record = di === undefined ? undefined : "data" in di ? { type: di.return_type!, record: di.return_record } : di;
    return record === undefined ? undefined : campiDi(record, p)?.find((c) => c.name === e.campo);
  };
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
      case "campo":
        return campoDi(e)?.type === "string";
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
    if (e.genere === "binario" && e.operatore === "+" && stringa(e)) byte += 4 * lunghezzaMassima(e, datoDi, funzioneDi, campoDi) + 1;
    if (e.genere === "chiamata") {
      const g = funzioneDi(e.nome);
      if (g !== undefined) byte += byteDelRestituito(g, p);
    }
    if (e.genere === "indice") [e.base, e.indice].forEach(visita);
    else if (e.genere === "campo") visita(e.base);
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
