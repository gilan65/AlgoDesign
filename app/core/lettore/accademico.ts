// Il lettore dei testi in «Accademico»: da un testo il flowchart che lo genera. Il verso opposto del generatore
// (`genera/accademico.ts`), di cui riconosce le forme perché la rigenerazione dia lo stesso testo:
// - il ripeti: `_x ← 1`, `while _x == 1 do`, il corpo, `if C then _x ← 1 else _x ← 0 end if`, `end while`;
// - il `per ogni`: `for _i in [0 ... N) do` con la prima riga `x ← S[_i]` (S un vettore, o `_s` calcolato da una
//   chiamata subito prima del ciclo);
// - il `per` equivalente: `for i in [a ... b) do` col contatore non dichiarato, un dato della funzione, con la fine
//   `b - 1` scritta come la scrive il generatore all'incontrario (`x + 1` è `x`, un letterale il suo precedente);
// - i valori iniziali: il prefisso delle assegnazioni di letterali (o di un elenco di letterali) che seguono le
//   dichiarazioni, nell'ordine dei dati; le costanti comuni sono le dichiarazioni prima della prima funzione;
// - l'intero 0/1: «Accademico» ha un solo tipo, e il lettore legge ogni dato come intero.
// Un nome col trattino basso fuori da queste forme non è un dato: è un errore con la riga.
//
// Quando il testo usa ciò che il flowchart non ha, il lettore costruisce il flowchart equivalente e lo dice, con la riga
// (le trasformazioni): il `return` a metà (il resto della sequenza va nell'altro ramo, il valore in un dato
// `risultato`, e dentro un ciclo un intero 0/1 `finito` che lo ferma e salta ciò che segue), lo scambio `(a, b) ← (b, a)`
// (tre assegnazioni con un dato d'appoggio), un elenco che non è un valore iniziale (un'assegnazione per elemento), la
// dichiarazione fuori dalla testa della funzione (va fra i dati), il nome
// che il flowchart riserva (rinominato col primo seguito `_2` libero, solo se chiesto). Le note dicono ciò che non cambia
// il programma: `int` letto come `integer`, i nomi mai dichiarati del codice esterno diventati parametri, la dimensione
// data a un vettore senza lunghezza, la procedura che porta il codice esterno.
//
// Il codice al livello più esterno è il programma principale, oppure, con `procedura`, una procedura con quel nome (i
// nomi che usa e non dichiara ne sono i parametri, vettori se indicizzati, nell'ordine del primo uso). Un vettore senza
// lunghezza la prende dal suo elenco, da un altro vettore che riceve o gli dà il valore, dal risultato di una funzione,
// dal `per ogni` che lo scorre, dagli argomenti; altrimenti `dimensione`.
//
// Le espressioni si leggono in un albero del nucleo (`espressioni/analizzatore.ts`) e si scrivono nel testo del flowchart
// con le parentesi delle sue precedenze; il testo scritto si rilegge con l'analizzatore unico, e deve dare lo stesso
// albero. La scrittura `output(…)` è una scrittura con l'a capo (la sintassi non lo esprime).
//
// Che cosa NON guarda: la validità del flowchart che esce, che è del controllo statico (chi legge lo controlla e riporta
// gli errori alla riga con `rigaDelBlocco`); `min` e `max`, che il flowchart non ha (un errore con la riga); un `for`
// che cambia la fine o il contatore nel corpo (un errore: il flowchart ricalcola la fine a ogni giro); un programma senza
// funzioni con dichiarazioni in testa che erano costanti comuni (si leggono come dati del programma principale).

import { causaDelNome } from "../controllo/controllo";
import { analizza, paroleChiave as paroleDelFlowchart, type Espressione, type OperatoreBinario } from "../espressioni/analizzatore";
import type { LinguaDelCodice } from "../genera/nomi";
import { primoLibero } from "../modifica/identificatori";
import { importa, riepilogoDellImportazione } from "../modifica/importa";
import type { Blocco, Dato, Funzione, Progetto } from "../progetto/modello";

export type SpecieDellaTrasformazione = "return" | "dichiarazione" | "scambio" | "elenco" | "nome-riservato" | "nome-in-uso";
export interface Trasformazione {
  readonly specie: SpecieDellaTrasformazione;
  readonly riga: number;
  /** Per una rinomina: il nome di prima e quello nuovo. */
  readonly nome?: string;
  readonly nuovo?: string;
  /** Per `nome-in-uso`: è un dato col nome di una funzione (altrimenti una funzione col nome di una della libreria). */
  readonly dato?: true;
}

export type SpecieDellaNota = "int" | "parametro" | "dimensione" | "procedura";
export interface Nota {
  readonly specie: SpecieDellaNota;
  readonly riga: number;
  readonly nome?: string;
  /** Per la dimensione: quella data. */
  readonly valore?: number;
}

export interface OpzioniDellaLettura {
  /** Il nome della procedura che porta il codice esterno; senza, il codice esterno è il programma principale. */
  readonly procedura?: string;
  /** La lunghezza di un vettore che il testo non dice (predefinita 10). */
  readonly dimensione?: number;
  /** La lingua dei nomi che il lettore aggiunge (`risultato`, `finito`, `appoggio`). */
  readonly lingua?: LinguaDelCodice;
  /** Un nome che il flowchart riserva si rinomina; senza, ferma la lettura. */
  readonly rinomina?: boolean;
  /** Il nome del progetto che esce. */
  readonly nome?: string;
}

export type Lettura =
  | {
      readonly ok: true;
      readonly progetto: Progetto;
      readonly trasformazioni: readonly Trasformazione[];
      readonly note: readonly Nota[];
      /** La riga del testo di ogni blocco e di ogni fine, per `id`. */
      readonly rigaDelBlocco: ReadonlyMap<string, number>;
      /** La riga dell'intestazione di ogni procedura o funzione, per nome (quella del codice esterno: la prima riga). */
      readonly rigaDellaFunzione: ReadonlyMap<string, number>;
    }
  | { readonly ok: false; readonly riga: number; readonly motivo: string };

export const dimensionePredefinita = 10;

const nomiAggiunti: Readonly<Record<LinguaDelCodice, { readonly risultato: string; readonly finito: string; readonly appoggio: string }>> = {
  it: { risultato: "risultato", finito: "finito", appoggio: "appoggio" },
  en: { risultato: "result", finito: "done", appoggio: "temp" },
};

const paroleChiave = new Set(["function", "return", "if", "then", "else", "for", "in", "while", "do", "end", "variable", "and", "or", "not", "mod"]);

class Fermo {
  constructor(
    readonly riga: number,
    readonly motivo: string,
  ) {}
}

// ---------------------------------------------------------------------------------------- le parole

type Simbolo = { readonly g: "nome"; readonly v: string } | { readonly g: "intero"; readonly v: number } | { readonly g: "stringa"; readonly codici: readonly number[] } | { readonly g: "segno"; readonly v: string };

/** I segni di «Accademico», col segno del flowchart che il lettore usa per sé (`−` è il meno, `…` i tre punti). */
const segni: readonly (readonly [string, string])[] = [
  ["...", "..."], ["…", "..."], ["==", "=="], ["←", "←"], ["→", "→"], ["≠", "!="], ["≤", "<="], ["≥", ">="], ["<", "<"], [">", ">"],
  ["×", "*"], ["/", "/"], ["+", "+"], ["-", "-"], ["−", "-"], ["(", "("], [")", ")"], ["[", "["], ["]", "]"], [",", ","], [":", ":"],
];

/** Il primo carattere di un nome (una lettera ASCII o il trattino basso), quelli che lo seguono, le cifre. */
const inizioDiNome = /^[_a-z]$/i;
const seguitoDiNome = /^\w$/;
const cifra = /^\d$/;

function simboli(testo: string, riga: number): Simbolo[] {
  const fuori: Simbolo[] = [];
  const c = Array.from(testo);
  /** Dove finisce, da `da`, la fila di caratteri che `vale` accetta. */
  const finoA = (da: number, vale: RegExp) => {
    let j = da;
    while (j < c.length && vale.test(c[j]!)) j++;
    return j;
  };
  let i = 0;
  while (i < c.length) {
    const x = c[i]!;
    if (/\s/u.test(x)) i++;
    else if (inizioDiNome.test(x)) {
      const j = finoA(i, seguitoDiNome);
      fuori.push({ g: "nome", v: c.slice(i, j).join("") });
      i = j;
    } else if (cifra.test(x)) {
      const j = finoA(i, cifra);
      fuori.push({ g: "intero", v: Number(c.slice(i, j).join("")) });
      i = j;
    } else i = simbolo(c, i, riga, fuori);
  }
  return fuori;
}

/** Una stringa o un segno da `i`: lo aggiunge a `fuori` e dice dove riprendere. */
function simbolo(c: readonly string[], i: number, riga: number, fuori: Simbolo[]): number {
  const x = c[i]!;
  if (x === '"') {
    const codici: number[] = [];
    let j = i + 1;
    for (;;) {
      const y = c[j];
      if (y === undefined) throw new Fermo(riga, "le virgolette di una stringa non si chiudono");
      if (y === '"') break;
      if (y === "\\") {
        const z = c[j + 1];
        const codice = z === "n" ? 10 : z === "t" ? 9 : z === "\\" ? 92 : z === '"' ? 34 : undefined;
        if (codice === undefined) throw new Fermo(riga, "una barra rovesciata nella stringa che non si legge");
        codici.push(codice);
        j += 2;
      } else {
        codici.push(y.codePointAt(0)!);
        j++;
      }
    }
    fuori.push({ g: "stringa", codici });
    return j + 1;
  }
  const resto = c.slice(i).join("");
  const s = segni.find(([da]) => resto.startsWith(da));
  if (s === undefined) throw new Fermo(riga, x === "=" ? "l'uguale si scrive «==» (e l'assegnazione «←»)" : `il segno «${x}» non si legge`);
  fuori.push({ g: "segno", v: s[1] });
  return i + Array.from(s[0]).length;
}

// ---------------------------------------------------------------------------------------- le espressioni

const confronti = new Set(["==", "!=", "<", "<=", ">", ">="]);

/** Le parole di una riga, lette da sinistra: le espressioni e i pezzi delle istruzioni. */
class Parole {
  i = 0;
  constructor(
    readonly s: readonly Simbolo[],
    readonly riga: number,
  ) {}
  guarda(k = 0): Simbolo | undefined {
    return this.s[this.i + k];
  }
  e(v: string, k = 0): boolean {
    const x = this.guarda(k);
    return x !== undefined && (x.g === "segno" || x.g === "nome") && x.v === v;
  }
  prendi(v: string): boolean {
    if (!this.e(v)) return false;
    this.i++;
    return true;
  }
  vuole(v: string, che: string): void {
    if (!this.prendi(v)) throw new Fermo(this.riga, `manca ${che}`);
  }
  finita(): boolean {
    return this.i >= this.s.length;
  }
  fine(): void {
    if (!this.finita()) throw new Fermo(this.riga, `la riga continua dopo la fine dell'istruzione («${scritto(this.guarda()!)}»)`);
  }
  nome(che: string): string {
    const x = this.guarda();
    if (x === undefined || x.g !== "nome" || paroleChiave.has(x.v)) throw new Fermo(this.riga, `manca ${che}`);
    this.i++;
    return x.v;
  }

  espressione(): Espressione {
    return this.binari(["or"], () => this.binari(["and"], () => this.confronto()));
  }
  private binari(ops: readonly string[], sotto: () => Espressione): Espressione {
    let s = sotto();
    for (;;) {
      const op = ops.find((o) => this.e(o));
      if (op === undefined) return s;
      this.i++;
      s = { genere: "binario", operatore: op as OperatoreBinario, sinistro: s, destro: sotto() };
    }
  }
  private confronto(): Espressione {
    const s = this.additivo();
    const x = this.guarda();
    if (x === undefined || x.g !== "segno" || !confronti.has(x.v)) return s;
    this.i++;
    const d = this.additivo();
    const y = this.guarda();
    if (y !== undefined && y.g === "segno" && confronti.has(y.v)) throw new Fermo(this.riga, "due confronti in fila");
    return { genere: "binario", operatore: x.v as OperatoreBinario, sinistro: s, destro: d };
  }
  private additivo(): Espressione {
    return this.binari(["+", "-"], () => this.binari(["*", "/", "mod"], () => this.unario()));
  }
  private unario(): Espressione {
    if (this.prendi("-")) return { genere: "unario", operatore: "-", operando: this.unario() };
    if (this.prendi("not")) return { genere: "unario", operatore: "not", operando: this.unario() };
    let e = this.primo();
    while (this.prendi("[")) {
      const indice = this.espressione();
      this.vuole("]", "la quadra che chiude l'indice");
      e = { genere: "indice", base: e, indice };
    }
    return e;
  }
  private primo(): Espressione {
    const x = this.guarda();
    if (x === undefined) throw new Fermo(this.riga, "manca un valore alla fine della riga");
    if (x.g === "intero") {
      this.i++;
      return { genere: "intero", valore: x.v };
    }
    if (x.g === "stringa") {
      this.i++;
      return { genere: "stringa", codici: x.codici };
    }
    if (x.g === "nome") {
      if (paroleChiave.has(x.v)) throw new Fermo(this.riga, `«${x.v}» è una parola di «Accademico», non un valore`);
      this.i++;
      if (!this.prendi("(")) return { genere: "nome", nome: x.v };
      const argomenti: Espressione[] = [];
      if (!this.prendi(")")) {
        do argomenti.push(this.espressione());
        while (this.prendi(","));
        this.vuole(")", "la tonda che chiude gli argomenti");
      }
      return { genere: "chiamata", nome: x.v, argomenti };
    }
    if (this.prendi("(")) {
      const e = this.espressione();
      this.vuole(")", "una tonda che chiude");
      return e;
    }
    throw new Fermo(this.riga, `«${scritto(x)}» non è un valore`);
  }
}

const scritto = (x: Simbolo): string => (x.g === "intero" ? String(x.v) : x.g === "stringa" ? "una stringa" : x.v);

// ---------------------------------------------------------------------------------------- le istruzioni

type Istruzione =
  | { readonly k: "variabile"; readonly riga: number; readonly nome: string; readonly vettore: boolean }
  | { readonly k: "assegna"; readonly riga: number; readonly bersaglio: Espressione; readonly valore: Espressione; readonly elenco?: readonly Espressione[] }
  | { readonly k: "scambia"; readonly riga: number; readonly a: Espressione; readonly b: Espressione }
  | { readonly k: "chiama"; readonly riga: number; readonly nome: string; readonly argomenti: readonly Espressione[] }
  | { readonly k: "se"; readonly riga: number; readonly condizione: Espressione; readonly allora: readonly Istruzione[]; readonly altrimenti: readonly Istruzione[] }
  | { readonly k: "mentre"; readonly riga: number; readonly condizione: Espressione; readonly corpo: readonly Istruzione[] }
  | { readonly k: "per"; readonly riga: number; readonly indice: string; readonly da: Espressione; readonly fino: Espressione; readonly corpo: readonly Istruzione[] }
  | { readonly k: "restituisci"; readonly riga: number; readonly valore?: Espressione };

interface Parametro {
  readonly nome: string;
  readonly vettore: boolean;
  readonly riga: number;
}

interface FunzioneLetta {
  readonly riga: number;
  readonly fine: number;
  readonly nome: string;
  readonly parametri: readonly Parametro[];
  /** `undefined` per una procedura. */
  readonly risultato?: { readonly vettore: boolean };
  readonly corpo: readonly Istruzione[];
}

interface TestoLetto {
  readonly comuni: readonly Istruzione[];
  readonly funzioni: readonly FunzioneLetta[];
  readonly esterno: readonly Istruzione[];
  readonly note: Nota[];
}

/** Una riga che comincia con una tonda chiusa da `) ←` e con una virgola fuori dalle quadre: lo scambio. */
function eUnoScambio(w: Parole): boolean {
  let profondita = 0;
  let virgola = false;
  for (let k = 0; w.guarda(k) !== undefined; k++) {
    if (w.e("(", k) || w.e("[", k)) profondita++;
    else if (w.e(")", k) || w.e("]", k)) {
      profondita--;
      if (profondita === 0) return virgola && w.e("←", k + 1);
    } else if (w.e(",", k) && profondita === 1) virgola = true;
  }
  return false;
}

/** Il tipo dopo i due punti: `integer`, `integer[]`, o `int` (una nota). */
function tipo(w: Parole, note: Nota[]): boolean {
  const t = w.guarda();
  if (t === undefined || t.g !== "nome" || (t.v !== "integer" && t.v !== "int")) throw new Fermo(w.riga, "il tipo è «integer» o «integer[]»");
  w.i++;
  if (t.v === "int") note.push({ specie: "int", riga: w.riga });
  if (!w.prendi("[")) return false;
  w.vuole("]", "la quadra che chiude il tipo del vettore");
  return true;
}

/** Il testo in istruzioni: le funzioni, le dichiarazioni e assegnazioni prima della prima funzione, il codice esterno. */
function leggiIlTesto(testo: string): TestoLetto {
  const note: Nota[] = [];
  const righe = testo.split(/\r?\n/);
  type Aperto =
    | { genere: "function"; f: Omit<FunzioneLetta, "corpo" | "fine">; corpo: Istruzione[] }
    | { genere: "if"; riga: number; condizione: Espressione; allora: Istruzione[]; altrimenti: Istruzione[]; nellAltro: boolean }
    | { genere: "while"; riga: number; condizione: Espressione; corpo: Istruzione[] }
    | { genere: "for"; riga: number; indice: string; da: Espressione; fino: Espressione; corpo: Istruzione[] };
  const aperti: Aperto[] = [];
  const comuni: Istruzione[] = [];
  const funzioni: FunzioneLetta[] = [];
  const esterno: Istruzione[] = [];
  /** Il codice prima della prima funzione: le costanti comuni se poi viene una funzione, altrimenti il codice esterno. */
  const primaDelleFunzioni: Istruzione[] = [];

  const dove = (): Istruzione[] => {
    const a = aperti.at(-1);
    if (a === undefined) return funzioni.length > 0 ? esterno : primaDelleFunzioni;
    if (a.genere === "if") return a.nellAltro ? a.altrimenti : a.allora;
    return a.corpo;
  };
  const chiudi = (genere: Aperto["genere"], riga: number): Aperto => {
    const a = aperti.pop();
    if (a === undefined || a.genere !== genere) throw new Fermo(riga, `«end ${genere}» senza il suo «${genere}»${a !== undefined ? ` (è aperto un «${a.genere}»)` : ""}`);
    return a;
  };

  righe.forEach((r, k) => {
    const riga = k + 1;
    const w = new Parole(simboli(r, riga), riga);
    if (w.finita()) return;
    const prima = w.guarda()!;
    const parola = prima.g === "nome" ? prima.v : undefined;
    const fineCon = parola !== undefined && /^end(function|if|while|for)$/.test(parola) ? parola.slice(3) : parola === "end" ? (w.guarda(1) as { v?: string } | undefined)?.v : undefined;
    if (parola === "end" || fineCon !== undefined) {
      w.i += parola === "end" ? 2 : 1;
      w.fine();
      if (fineCon !== "function" && fineCon !== "if" && fineCon !== "while" && fineCon !== "for") throw new Fermo(riga, "dopo «end» viene «function», «if», «while» o «for»");
      const a = chiudi(fineCon, riga);
      if (a.genere === "function") funzioni.push({ ...a.f, fine: riga, corpo: a.corpo });
      else if (a.genere === "if") dove().push({ k: "se", riga: a.riga, condizione: a.condizione, allora: a.allora, altrimenti: a.altrimenti });
      else if (a.genere === "while") dove().push({ k: "mentre", riga: a.riga, condizione: a.condizione, corpo: a.corpo });
      else dove().push({ k: "per", riga: a.riga, indice: a.indice, da: a.da, fino: a.fino, corpo: a.corpo });
      return;
    }
    switch (parola) {
      case "function": {
        w.i++;
        if (aperti.length > 0) throw new Fermo(riga, "una funzione dentro un'altra struttura");
        const nome = w.nome("il nome della funzione");
        w.vuole("(", "la tonda dei parametri");
        const parametri: Parametro[] = [];
        if (!w.prendi(")")) {
          do {
            const p = w.nome("il nome di un parametro");
            w.vuole(":", "i due punti prima del tipo");
            parametri.push({ nome: p, vettore: tipo(w, note), riga });
          } while (w.prendi(","));
          w.vuole(")", "la tonda che chiude i parametri");
        }
        const risultato = w.prendi("→") ? { vettore: tipo(w, note) } : undefined;
        w.fine();
        aperti.push({ genere: "function", f: { riga, nome, parametri, ...(risultato !== undefined ? { risultato } : {}) }, corpo: [] });
        return;
      }
      case "if": {
        w.i++;
        const condizione = w.espressione();
        w.vuole("then", "«then» alla fine della riga");
        w.fine();
        aperti.push({ genere: "if", riga, condizione, allora: [], altrimenti: [], nellAltro: false });
        return;
      }
      case "else": {
        w.i++;
        w.fine();
        const a = aperti.at(-1);
        if (a === undefined || a.genere !== "if" || a.nellAltro) throw new Fermo(riga, "«else» senza il suo «if»");
        a.nellAltro = true;
        return;
      }
      case "while": {
        w.i++;
        const condizione = w.espressione();
        w.vuole("do", "«do» alla fine della riga");
        w.fine();
        aperti.push({ genere: "while", riga, condizione, corpo: [] });
        return;
      }
      case "for": {
        w.i++;
        const indice = w.nome("il nome dell'indice");
        w.vuole("in", "«in» prima dell'intervallo");
        w.vuole("[", "la quadra che apre l'intervallo");
        const da = w.espressione();
        w.vuole("...", "i tre punti dell'intervallo");
        const fino = w.espressione();
        w.vuole(")", "la tonda che chiude l'intervallo (l'ultimo è escluso)");
        w.vuole("do", "«do» alla fine della riga");
        w.fine();
        aperti.push({ genere: "for", riga, indice, da, fino, corpo: [] });
        return;
      }
      case "variable": {
        w.i++;
        const nome = w.nome("il nome della variabile");
        w.vuole(":", "i due punti prima del tipo");
        const vettore = tipo(w, note);
        w.fine();
        dove().push({ k: "variabile", riga, nome, vettore });
        return;
      }
      case "return": {
        w.i++;
        const valore = w.finita() ? undefined : w.espressione();
        w.fine();
        if (!aperti.some((a) => a.genere === "function")) throw new Fermo(riga, "«return» fuori da una funzione");
        dove().push({ k: "restituisci", riga, ...(valore !== undefined ? { valore } : {}) });
        return;
      }
    }
    if (w.e("(") && eUnoScambio(w)) {
      w.i++;
      const a = w.espressione();
      w.vuole(",", "la virgola dello scambio");
      const b = w.espressione();
      w.vuole(")", "la tonda dello scambio");
      w.vuole("←", "la freccia dello scambio");
      w.vuole("(", "la tonda dello scambio");
      const b2 = w.espressione();
      w.vuole(",", "la virgola dello scambio");
      const a2 = w.espressione();
      w.vuole(")", "la tonda dello scambio");
      w.fine();
      if (canonico(a) !== canonico(a2) || canonico(b) !== canonico(b2)) throw new Fermo(riga, "lo scambio vuole a destra le stesse variabili, in ordine inverso");
      dove().push({ k: "scambia", riga, a, b });
      return;
    }
    const e = w.espressione();
    if (w.prendi("←")) {
      if (e.genere !== "nome" && e.genere !== "indice") throw new Fermo(riga, "a sinistra della freccia va una variabile o un elemento");
      if (w.prendi("[")) {
        const elenco: Espressione[] = [];
        if (!w.prendi("]")) {
          do elenco.push(w.espressione());
          while (w.prendi(","));
          w.vuole("]", "la quadra che chiude l'elenco");
        }
        w.fine();
        if (elenco.length === 0) throw new Fermo(riga, "un vettore vuoto: il flowchart non ne ha");
        dove().push({ k: "assegna", riga, bersaglio: e, valore: { genere: "intero", valore: 0 }, elenco });
        return;
      }
      const valore = w.espressione();
      w.fine();
      dove().push({ k: "assegna", riga, bersaglio: e, valore });
      return;
    }
    w.fine();
    if (e.genere !== "chiamata") throw new Fermo(riga, "un'istruzione è un'assegnazione con «←», una chiamata o una struttura");
    dove().push({ k: "chiama", riga, nome: e.nome, argomenti: e.argomenti });
  });
  if (aperti.length > 0) {
    const a = aperti.at(-1)!;
    throw new Fermo(righe.length, `manca «end ${a.genere}»`);
  }
  if (funzioni.length > 0) {
    for (const x of primaDelleFunzioni)
      if (x.k !== "variabile" && x.k !== "assegna") throw new Fermo(x.riga, "prima delle funzioni stanno solo le costanti comuni: il codice del programma va dopo");
    comuni.push(...primaDelleFunzioni);
  } else esterno.push(...primaDelleFunzioni);
  return { comuni, funzioni, esterno, note };
}

// ---------------------------------------------------------------------------------------- il testo del flowchart

const livelloNelFlowchart = (e: Espressione): number => {
  if (e.genere === "unario") return 7;
  if (e.genere !== "binario") return 8;
  const op = e.operatore;
  return op === "or" ? 1 : op === "and" ? 2 : op === "==" || op === "!=" ? 3 : op === "<" || op === "<=" || op === ">" || op === ">=" ? 4 : op === "+" || op === "-" ? 5 : 6;
};
const fra = (t: string, serve: boolean) => (serve ? `(${t})` : t);

const letteraleStringa = (codici: readonly number[]) =>
  `"${codici.map((k) => (k === 10 ? "\\n" : k === 9 ? "\\t" : k === 92 ? "\\\\" : k === 34 ? '\\"' : String.fromCodePoint(k))).join("")}"`;

/** Il testo di un'espressione nel flowchart, con le parentesi delle sue precedenze. */
function nelFlowchart(e: Espressione): string {
  switch (e.genere) {
    case "intero":
      return String(e.valore);
    case "stringa":
      return letteraleStringa(e.codici);
    case "nome":
      return e.nome;
    case "indice":
      return `${fra(nelFlowchart(e.base), livelloNelFlowchart(e.base) < 8)}[${nelFlowchart(e.indice)}]`;
    case "chiamata":
      return `${e.nome}(${e.argomenti.map(nelFlowchart).join(", ")})`;
    case "unario": {
      const x = fra(nelFlowchart(e.operando), livelloNelFlowchart(e.operando) <= 7);
      return e.operatore === "-" ? `-${x}` : `${e.operatore} ${x}`;
    }
    case "binario": {
      const l = livelloNelFlowchart(e);
      return `${fra(nelFlowchart(e.sinistro), livelloNelFlowchart(e.sinistro) < l)} ${e.operatore} ${fra(nelFlowchart(e.destro), livelloNelFlowchart(e.destro) <= l)}`;
    }
    default:
      throw new Error(`un'espressione che il lettore non produce: ${e.genere}`);
  }
}

/** L'albero come testo confrontabile, con le chiavi in ordine. */
function canonico(x: unknown): string {
  return JSON.stringify(x, (_k, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1))) : v,
  );
}

/** Il testo nel flowchart, riletto dall'analizzatore unico: lo stesso albero, o la riga non si scrive. */
function testo(e: Espressione, riga: number): string {
  const t = nelFlowchart(e);
  const a = analizza(t);
  if (!a.ok) throw new Fermo(riga, `«${t}» non si scrive nel flowchart (${a.codice})`);
  if (canonico(a.espressione) !== canonico(e)) throw new Error(`il testo «${t}» non ridà lo stesso albero`);
  return t;
}

// ---------------------------------------------------------------------------------------- i nomi

const sotto = (e: Espressione): readonly Espressione[] =>
  e.genere === "indice" ? [e.base, e.indice] : e.genere === "unario" ? [e.operando] : e.genere === "binario" ? [e.sinistro, e.destro] : e.genere === "chiamata" ? e.argomenti : [];
const nomiIn = (e: Espressione): string[] => (e.genere === "nome" ? [e.nome] : sotto(e).flatMap(nomiIn));
const chiamateIn = (e: Espressione): string[] => [...(e.genere === "chiamata" ? [e.nome] : []), ...sotto(e).flatMap(chiamateIn)];
const indicizzatiIn = (e: Espressione): string[] => [...(e.genere === "indice" && e.base.genere === "nome" ? [e.base.nome] : []), ...sotto(e).flatMap(indicizzatiIn)];

/** Le espressioni di un'istruzione (non quelle delle istruzioni dentro). */
const espressioniDi = (x: Istruzione): readonly Espressione[] =>
  x.k === "assegna" ? [x.bersaglio, ...(x.elenco ?? [x.valore])] : x.k === "scambia" ? [x.a, x.b] : x.k === "chiama" ? x.argomenti : x.k === "se" || x.k === "mentre" ? [x.condizione] : x.k === "per" ? [x.da, x.fino] : x.k === "restituisci" && x.valore !== undefined ? [x.valore] : [];
const dentroDi = (x: Istruzione): readonly Istruzione[] => (x.k === "se" ? [...x.allora, ...x.altrimenti] : x.k === "mentre" || x.k === "per" ? x.corpo : []);
const tutte = (xs: readonly Istruzione[]): Istruzione[] => xs.flatMap((x) => [x, ...tutte(dentroDi(x))]);

/** I nomi che un elenco di istruzioni assegna (le destinazioni e gli indici dei `for`). */
const assegnatiIn = (xs: readonly Istruzione[]): Set<string> =>
  new Set(tutte(xs).flatMap((x) => (x.k === "assegna" ? nomiIn(x.bersaglio).slice(0, 1) : x.k === "scambia" ? [...nomiIn(x.a).slice(0, 1), ...nomiIn(x.b).slice(0, 1)] : x.k === "per" ? [x.indice] : [])));

/** Le istruzioni coi nomi cambiati: i dati con `dati`, le chiamate con `funzioni`. */
function rinominate(xs: readonly Istruzione[], dati: ReadonlyMap<string, string>, funzioni: ReadonlyMap<string, string>): Istruzione[] {
  const n = (s: string) => dati.get(s) ?? s;
  const e = (x: Espressione): Espressione => {
    switch (x.genere) {
      case "nome":
        return { genere: "nome", nome: n(x.nome) };
      case "indice":
        return { genere: "indice", base: e(x.base), indice: e(x.indice) };
      case "chiamata":
        return { genere: "chiamata", nome: funzioni.get(x.nome) ?? x.nome, argomenti: x.argomenti.map(e) };
      case "unario":
        return { genere: "unario", operatore: x.operatore, operando: e(x.operando) };
      case "binario":
        return { genere: "binario", operatore: x.operatore, sinistro: e(x.sinistro), destro: e(x.destro) };
      default:
        return x;
    }
  };
  const i = (x: Istruzione): Istruzione => {
    switch (x.k) {
      case "variabile":
        return { ...x, nome: n(x.nome) };
      case "assegna":
        return { ...x, bersaglio: e(x.bersaglio), valore: e(x.valore), ...(x.elenco !== undefined ? { elenco: x.elenco.map(e) } : {}) };
      case "scambia":
        return { ...x, a: e(x.a), b: e(x.b) };
      case "chiama":
        return { ...x, nome: funzioni.get(x.nome) ?? x.nome, argomenti: x.argomenti.map(e) };
      case "se":
        return { ...x, condizione: e(x.condizione), allora: x.allora.map(i), altrimenti: x.altrimenti.map(i) };
      case "mentre":
        return { ...x, condizione: e(x.condizione), corpo: x.corpo.map(i) };
      case "per":
        return { ...x, indice: n(x.indice), da: e(x.da), fino: e(x.fino), corpo: x.corpo.map(i) };
      case "restituisci":
        return x.valore !== undefined ? { ...x, valore: e(x.valore) } : x;
    }
  };
  return xs.map(i);
}

/** Il primo nome `<nome>_2`, `<nome>_3`… che non è in `usati`. */
function liberoDa(nome: string, usati: ReadonlySet<string>): string {
  for (let k = 2; ; k++) if (!usati.has(`${nome}_${k}`)) return `${nome}_${k}`;
}

/** Un `for` del testo è un «per» solo se il corpo non cambia il suo indice né i nomi della sua fine. */
function controllaIlPer(x: Extract<Istruzione, { k: "per" }>): void {
  const corpo = assegnatiIn(x.corpo);
  if (corpo.has(x.indice)) throw new Fermo(x.riga, `il ciclo cambia il suo indice ${x.indice}: il flowchart non lo ammette`);
  const cambiati = nomiIn(x.fino).filter((n) => corpo.has(n));
  if (cambiati.length > 0) throw new Fermo(x.riga, `il ciclo cambia ${cambiati[0]}, che dà la fine dell'intervallo: scrivilo con «while»`);
}

// ---------------------------------------------------------------------------------------- il return a metà

const haReturn = (xs: readonly Istruzione[]): boolean => tutte(xs).some((x) => x.k === "restituisci");
const esceSempre = (xs: readonly Istruzione[]): boolean => xs.some((x) => x.k === "restituisci" || (x.k === "se" && esceSempre(x.allora) && esceSempre(x.altrimenti)));

const nome = (n: string): Espressione => ({ genere: "nome", nome: n });
const intero = (v: number): Espressione => ({ genere: "intero", valore: v });
const uguale = (s: Espressione, d: Espressione): Espressione => ({ genere: "binario", operatore: "==", sinistro: s, destro: d });

/** Il corpo senza i `return` a metà: il valore va in `risultato`, e dentro un ciclo l'intero 0/1 `finito` lo ferma. */
function senzaReturn(corpo: readonly Istruzione[], risultato: string, finito: string): { corpo: Istruzione[]; usaFinito: boolean } {
  let usaFinito = false;
  const esci = (x: Extract<Istruzione, { k: "restituisci" }>, segna: boolean): Istruzione[] => {
    if (segna) usaFinito = true;
    return [
      ...(x.valore !== undefined ? [{ k: "assegna", riga: x.riga, bersaglio: nome(risultato), valore: x.valore } as const] : []),
      ...(segna ? [{ k: "assegna", riga: x.riga, bersaglio: nome(finito), valore: intero(1) } as const] : []),
    ];
  };
  const seNonFinito = (riga: number, xs: Istruzione[]): Istruzione[] =>
    xs.length === 0 ? [] : [{ k: "se", riga, condizione: uguale(nome(finito), intero(0)), allora: xs, altrimenti: [] }];
  // `finito` per primo: dopo il return la condizione del testo non si valuta più (potrebbe fermarsi, come un indice
  // fuori dal vettore), e l'«and» del flowchart non valuta il secondo termine se il primo è falso.
  const conFinito = (c: Espressione): Espressione => ({ genere: "binario", operatore: "and", sinistro: uguale(nome(finito), intero(0)), destro: c });

  const t = (xs: readonly Istruzione[], segna: boolean): Istruzione[] => {
    const fuori: Istruzione[] = [];
    for (let k = 0; k < xs.length; k++) {
      const x = xs[k]!;
      const resto = xs.slice(k + 1);
      if (x.k === "restituisci") return [...fuori, ...esci(x, segna)];
      if (x.k === "se" && (haReturn(x.allora) || haReturn(x.altrimenti))) {
        const sa = esceSempre(x.allora);
        const sb = esceSempre(x.altrimenti);
        if (resto.length === 0 || (sa && sb)) return [...fuori, { ...x, allora: t(x.allora, segna), altrimenti: t(x.altrimenti, segna) }];
        if (sa) return [...fuori, { ...x, allora: t(x.allora, segna), altrimenti: t([...x.altrimenti, ...resto], segna) }];
        if (sb) return [...fuori, { ...x, allora: t([...x.allora, ...resto], segna), altrimenti: t(x.altrimenti, segna) }];
        usaFinito = true;
        return [...fuori, { ...x, allora: t(x.allora, true), altrimenti: t(x.altrimenti, true) }, ...seNonFinito(resto[0]!.riga, t(resto, segna))];
      }
      if ((x.k === "mentre" || x.k === "per") && haReturn(x.corpo)) {
        // Il `per` diventa un `mentre`, che rivaluta la fine a ogni giro: prima, gli stessi controlli del `per`.
        if (x.k === "per" && !x.indice.startsWith("_")) controllaIlPer(x);
        usaFinito = true;
        const corpo = t(x.corpo, true);
        const ciclo: Istruzione[] =
          x.k === "mentre"
            ? [{ ...x, condizione: conFinito(x.condizione), corpo }]
            : [
                { k: "assegna", riga: x.riga, bersaglio: nome(x.indice), valore: x.da },
                {
                  k: "mentre",
                  riga: x.riga,
                  condizione: conFinito({ genere: "binario", operatore: "<", sinistro: nome(x.indice), destro: x.fino }),
                  corpo: [...corpo, { k: "assegna", riga: x.riga, bersaglio: nome(x.indice), valore: { genere: "binario", operatore: "+", sinistro: nome(x.indice), destro: intero(1) } }],
                },
              ];
        return [...fuori, ...ciclo, ...(resto.length > 0 ? seNonFinito(resto[0]!.riga, t(resto, segna)) : [])];
      }
      fuori.push(x);
    }
    return fuori;
  };
  return { corpo: t(corpo, false), usaFinito };
}

// ---------------------------------------------------------------------------------------- la lettura

/** Un vettore di cui cercare la lunghezza: `d:<parte>:<nome>` per un dato, `r:<nome>` per un risultato. */
class Lunghezze {
  private readonly padre = new Map<string, string>();
  private readonly valore = new Map<string, number>();
  private radice(k: string): string {
    const p = this.padre.get(k);
    if (p === undefined || p === k) return k;
    const r = this.radice(p);
    this.padre.set(k, r);
    return r;
  }
  uguali(a: string, b: string): void {
    const ra = this.radice(a);
    const rb = this.radice(b);
    if (ra === rb) return;
    this.padre.set(ra, rb);
    const va = this.valore.get(ra);
    if (va !== undefined && !this.valore.has(rb)) this.valore.set(rb, va);
  }
  dai(k: string, n: number): void {
    const r = this.radice(k);
    if (!this.valore.has(r)) this.valore.set(r, n);
  }
  di(k: string): number | undefined {
    return this.valore.get(this.radice(k));
  }
}

/** Una parte in costruzione: una funzione del testo, o il codice esterno. */
interface Parte {
  readonly chiave: string;
  readonly testa?: FunzioneLetta;
  readonly riga: number;
  corpo: readonly Istruzione[];
  readonly dati: { nome: string; vettore: boolean; riga: number; parametro: boolean; iniziale?: string | readonly string[] }[];
  readonly valore?: Espressione;
  readonly rigaDelValore?: number;
  /** Il dato d'appoggio degli scambi. */
  readonly appoggio?: string;
}

/** Da un testo in «Accademico» il flowchart che lo genera (vedi in testa). `libreria`: le procedure e funzioni che il
 * testo può chiamare senza averle (la libreria a cui si aggiunge). */
export function leggiAccademico(testoDaLeggere: string, opzioni: OpzioniDellaLettura = {}, libreria?: Progetto): Lettura {
  try {
    return leggi(testoDaLeggere, opzioni, libreria);
  } catch (e) {
    if (e instanceof Fermo) return { ok: false, riga: e.riga, motivo: e.motivo };
    throw e;
  }
}

function leggi(testoDaLeggere: string, opzioni: OpzioniDellaLettura, libreria: Progetto | undefined): Lettura {
  const lingua = opzioni.lingua ?? "it";
  const dimensione = opzioni.dimensione ?? dimensionePredefinita;
  const letto = leggiIlTesto(testoDaLeggere);
  const note = letto.note;
  const trasformazioni: Trasformazione[] = [];

  // I nomi delle funzioni: quelli del testo, e quelli della libreria che il testo può chiamare.
  const nomiDelTesto = new Set(letto.funzioni.map((f) => f.nome));
  const viste = new Set<string>();
  for (const f of letto.funzioni) {
    if (viste.has(f.nome)) throw new Fermo(f.riga, `la funzione ${f.nome} c'è già`);
    viste.add(f.nome);
  }
  const dellaLibreria = new Map((libreria?.functions ?? []).flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  for (const n of [...nomiDelTesto]) if (n === "min" || n === "max" || n === "output") throw new Fermo(letto.funzioni.find((f) => f.nome === n)!.riga, `«${n}» è una funzione di «Accademico»: un'altra non può chiamarsi così`);

  // Le rinomine dei nomi che il flowchart riserva: le funzioni e le costanti a livello di file, i dati nella loro parte.
  const usatiDovunque = new Set<string>([...nomiDelTesto, ...dellaLibreria.keys()]);
  for (const x of tutte([...letto.comuni, ...letto.esterno, ...letto.funzioni.flatMap((f) => f.corpo)])) for (const e of espressioniDi(x)) nomiIn(e).forEach((n) => usatiDovunque.add(n));
  const riservato = (n: string, nelFile: boolean, riga: number): string | undefined => {
    const causa = causaDelNome(n, nelFile);
    if (causa === undefined) return undefined;
    if (causa.causa !== "nome_riservato" && causa.causa !== "nome_della_libreria") throw new Fermo(riga, `il nome ${n} non si può usare nel flowchart`);
    if (opzioni.rinomina !== true) throw new Fermo(riga, `il nome ${n} è riservato nel flowchart (con la rinomina diventa ${liberoDa(n, usatiDovunque)})`);
    const nuovo = liberoDa(n, usatiDovunque);
    usatiDovunque.add(nuovo);
    trasformazioni.push({ specie: "nome-riservato", riga, nome: n, nuovo });
    return nuovo;
  };
  const funzioniRinominate = new Map<string, string>();
  for (const f of letto.funzioni) {
    const nuovo = riservato(f.nome, true, f.riga);
    if (nuovo !== undefined) funzioniRinominate.set(f.nome, nuovo);
  }
  // La procedura del codice fuori dalle funzioni c'è solo se quel codice c'è: allora il suo nome non si rinomina (lo
  // sceglie chi legge), e un nome già usato ferma la lettura (riga 0: il nome non viene dal testo).
  const procedura = letto.esterno.length > 0 ? opzioni.procedura : undefined;
  if (procedura !== undefined && (nomiDelTesto.has(procedura) || dellaLibreria.has(procedura)))
    throw new Fermo(0, `la procedura del codice fuori dalle funzioni, ${procedura}, ha il nome di una procedura o funzione ${nomiDelTesto.has(procedura) ? "del testo" : "della libreria"}`);
  // Una costante comune non si rinomina (la usano più funzioni): il nome da cambiare è quello della procedura.
  const comuneDelTesto = letto.comuni.some((x) => x.k === "variabile" && x.nome === procedura);
  if (procedura !== undefined && (comuneDelTesto || (libreria?.shared_constants ?? []).some((c) => c.name === procedura)))
    throw new Fermo(0, `la procedura del codice fuori dalle funzioni, ${procedura}, ha il nome di una costante comune ${comuneDelTesto ? "del testo" : "della libreria"}`);
  if (procedura !== undefined) usatiDovunque.add(procedura);
  const funzioni = new Set([...nomiDelTesto].map((n) => funzioniRinominate.get(n) ?? n));
  const eFunzione = (n: string) => funzioni.has(n) || dellaLibreria.has(n);
  /** Il nome che un dato del codice fuori dalle funzioni ha uguale alla sua procedura: rinominato a richiesta. */
  const nomeDellaProcedura = (n: string, riga: number): string => {
    const proposto = liberoDa(n, usatiDovunque);
    if (opzioni.rinomina !== true) throw new Fermo(riga, `il dato ${n} ha il nome della procedura del codice fuori dalle funzioni (con la rinomina diventa ${proposto})`);
    usatiDovunque.add(proposto);
    trasformazioni.push({ specie: "nome-in-uso", riga, nome: n, nuovo: proposto, dato: true });
    return proposto;
  };
  /** Il nome di un dato: rinominato se il flowchart lo riserva o se è quello di una funzione (anche della libreria, dove
   * un dato non può avere il nome di una procedura o funzione) o della procedura del codice fuori dalle funzioni. */
  const nomeDelDato = (n: string, riga: number): string | undefined => {
    const nuovo = riservato(n, false, riga);
    if (nuovo !== undefined) return nuovo;
    if (n === procedura) return nomeDellaProcedura(n, riga);
    if (!eFunzione(n)) return undefined;
    const proposto = liberoDa(n, usatiDovunque);
    if (opzioni.rinomina !== true) throw new Fermo(riga, `il dato ${n} ha il nome di una funzione${dellaLibreria.has(n) && !funzioni.has(n) ? " della libreria" : ""} (con la rinomina diventa ${proposto})`);
    usatiDovunque.add(proposto);
    trasformazioni.push({ specie: "nome-in-uso", riga, nome: n, nuovo: proposto, dato: true });
    return proposto;
  };

  // Le parti: le costanti comuni, le funzioni, il codice esterno.
  const comuniDichiarate = letto.comuni.filter((x): x is Extract<Istruzione, { k: "variabile" }> => x.k === "variabile");
  const nomiComuni = new Map<string, string>();
  for (const d of comuniDichiarate) {
    const nuovo = riservato(d.nome, true, d.riga);
    nomiComuni.set(d.nome, nuovo ?? d.nome);
  }
  const lunghezze = new Lunghezze();
  const righeDelBlocco = new Map<string, number>();
  const rigaDellaFunzione = new Map<string, number>();
  let prossimo = 1;
  const id = (riga: number): string => {
    const x = `b${prossimo++}`;
    righeDelBlocco.set(x, riga);
    return x;
  };

  // Le costanti comuni: ognuna col suo valore, subito dopo le dichiarazioni.
  const comuni: Dato[] = [];
  {
    const assegnate = letto.comuni.filter((x): x is Extract<Istruzione, { k: "assegna" }> => x.k === "assegna");
    for (const d of comuniDichiarate) {
      const a = assegnate.find((x) => x.bersaglio.genere === "nome" && x.bersaglio.nome === d.nome);
      const v = a !== undefined ? letterale(a) : undefined;
      if (a === undefined || v === undefined) throw new Fermo(d.riga, `${d.nome}, prima delle funzioni, è una costante comune: vuole un numero (o un elenco di numeri) subito dopo`);
      const n = nomiComuni.get(d.nome)!;
      if (d.vettore) lunghezze.dai(`c:${n}`, (v as readonly string[]).length);
      comuni.push({ name: n, type: "integer", ...(d.vettore ? { size: 0 } : {}), constant: true, initial: d.vettore ? v : (v as string) });
    }
    for (const a of assegnate) if (a.bersaglio.genere !== "nome" || !comuniDichiarate.some((d) => d.nome === (a.bersaglio as { nome: string }).nome)) throw new Fermo(a.riga, "prima delle funzioni si assegnano solo le costanti comuni dichiarate");
    if (assegnate.length !== comuniDichiarate.length) throw new Fermo(assegnate.at(-1)?.riga ?? 1, "una costante comune si assegna una volta sola");
  }
  const nomiDelleComuni = new Set(comuni.map((c) => c.name));

  const funzioniDelProgetto: Funzione[] = [];
  const parti: Parte[] = [];
  const nomiDelleParti = new Map<string, string>();

  /** Prepara una parte: i dati (parametri, dichiarazioni, contatori), le rinomine, i return. */
  const prepara = (chiave: string, f: FunzioneLetta | undefined, corpoDelTesto: readonly Istruzione[], rigaDellaParte: number): Parte => {
    let corpo = rinominate(corpoDelTesto, nomiComuni, funzioniRinominate);
    const dati: Parte["dati"] = [];
    const usati = new Set<string>([...usatiDovunque]);
    const dati_ = new Map<string, string>();
    for (const p of f?.parametri ?? []) {
      const nuovo = nomeDelDato(p.nome, p.riga);
      if (nuovo !== undefined) dati_.set(p.nome, nuovo);
      dati.push({ nome: nuovo ?? p.nome, vettore: p.vettore, riga: p.riga, parametro: true });
    }
    // Le dichiarazioni: nella testa (le prime istruzioni del corpo) o fuori, che è una trasformazione.
    const inTesta = new Set<Istruzione>();
    for (const x of corpoDelTesto) {
      if (x.k !== "variabile") break;
      inTesta.add(x);
    }
    const dichiarazioni = tutte(corpoDelTesto).filter((x): x is Extract<Istruzione, { k: "variabile" }> => x.k === "variabile");
    for (const d of dichiarazioni) {
      if (d.nome.startsWith("_")) continue;
      if (dati.some((x) => x.nome === (dati_.get(d.nome) ?? d.nome))) throw new Fermo(d.riga, `${d.nome} è dichiarata due volte`);
      const nuovo = nomeDelDato(d.nome, d.riga);
      if (nuovo !== undefined) dati_.set(d.nome, nuovo);
      dati.push({ nome: nuovo ?? d.nome, vettore: d.vettore, riga: d.riga, parametro: false });
      if (!inTesta.has(d)) trasformazioni.push({ specie: "dichiarazione", riga: d.riga });
    }
    corpo = rinominate(corpo, dati_, new Map());
    // I contatori dei `for`, dati della funzione se non dichiarati.
    for (const x of tutte(corpo))
      if (x.k === "per" && !x.indice.startsWith("_") && !dati.some((d) => d.nome === x.indice)) {
        const nuovo = nomeDelDato(x.indice, x.riga);
        if (nuovo !== undefined) corpo = rinominate(corpo, new Map([[x.indice, nuovo]]), new Map());
        dati.push({ nome: nuovo ?? x.indice, vettore: false, riga: x.riga, parametro: false });
      }
    dati.forEach((d) => usati.add(d.nome));
    // I nomi mai dichiarati: parametri della procedura del codice esterno, altrimenti un errore.
    const dichiarati = new Set([...dati.map((d) => d.nome), ...nomiDelleComuni]);
    const nuovi: Parametro[] = [];
    // Un nome mai dichiarato uguale alla procedura stessa: il parametro prende un altro nome, a richiesta.
    const deiNuovi = new Map<string, string>();
    for (const x of tutte(corpo))
      for (const e of espressioniDi(x)) {
        const indicizzati = new Set(indicizzatiIn(e));
        for (const n of nomiIn(e)) {
          if (dichiarati.has(n) || n.startsWith("_") || nuovi.some((p) => p.nome === (deiNuovi.get(n) ?? n))) continue;
          if (eFunzione(n)) throw new Fermo(x.riga, `${n} è una funzione, e si chiama con le tonde`);
          if (f !== undefined || procedura === undefined) throw new Fermo(x.riga, `${n} non è dichiarata`);
          if (n === procedura) deiNuovi.set(n, nomeDellaProcedura(n, x.riga));
          nuovi.push({ nome: deiNuovi.get(n) ?? n, vettore: indicizzati.has(n), riga: x.riga });
        }
      }
    if (deiNuovi.size > 0) corpo = rinominate(corpo, deiNuovi, new Map());
    // I parametri nuovi nell'ordine del primo uso, davanti agli altri dati.
    for (const p of nuovi) {
      if (causaDelNome(p.nome, false) !== undefined) throw new Fermo(p.riga, `il nome ${p.nome} è riservato nel flowchart: va dichiarato`);
      note.push({ specie: "parametro", riga: p.riga, nome: p.nome });
    }
    dati.unshift(...nuovi.map((p) => ({ nome: p.nome, vettore: p.vettore, riga: p.riga, parametro: true })));
    // Il return a metà.
    let valore: Espressione | undefined;
    let rigaDelValore: number | undefined;
    const ultimo = corpo.at(-1);
    const finale = ultimo?.k === "restituisci" ? ultimo : undefined;
    const prima = finale !== undefined ? corpo.slice(0, -1) : corpo;
    if (f?.risultato === undefined && tutte(corpo).some((x) => x.k === "restituisci" && x.valore !== undefined)) {
      const r = tutte(corpo).find((x) => x.k === "restituisci" && x.valore !== undefined)!;
      throw new Fermo(r.riga, f === undefined ? "«return» col valore fuori da una funzione" : `${f.nome} non dichiara il tipo del risultato («→ integer»)`);
    }
    if (f?.risultato !== undefined && finale !== undefined && finale.valore === undefined) throw new Fermo(finale.riga, "il «return» di una funzione vuole il valore");
    if (!haReturn(prima)) {
      corpo = prima;
      if (finale?.valore !== undefined) {
        valore = finale.valore;
        rigaDelValore = finale.riga;
      }
    } else {
      for (const x of tutte(corpo)) if (x.k === "restituisci" && x !== finale) trasformazioni.push({ specie: "return", riga: x.riga });
      const r = f?.risultato !== undefined ? liberoNome(nomiAggiunti[lingua].risultato, usati) : "";
      const fin = liberoNome(nomiAggiunti[lingua].finito, usati);
      const s = senzaReturn(corpo, r, fin);
      corpo = s.corpo;
      if (f?.risultato !== undefined) {
        dati.push({ nome: r, vettore: f.risultato.vettore, riga: f.riga, parametro: false });
        valore = nome(r);
        rigaDelValore = f.fine;
      }
      if (s.usaFinito) dati.push({ nome: fin, vettore: false, riga: f?.riga ?? rigaDellaParte, parametro: false, iniziale: "0" });
    }
    if (f?.risultato !== undefined && valore === undefined) throw new Fermo(f.fine, `${f.nome} non restituisce nulla`);
    // Lo scambio: un dato d'appoggio.
    let appoggio: string | undefined;
    for (const x of tutte(corpo))
      if (x.k === "scambia") {
        trasformazioni.push({ specie: "scambio", riga: x.riga });
        if (appoggio === undefined) {
          appoggio = liberoNome(nomiAggiunti[lingua].appoggio, usati);
          dati.push({ nome: appoggio, vettore: false, riga: x.riga, parametro: false });
        }
      }
    // I valori iniziali: il prefisso delle assegnazioni di letterali, nell'ordine dei dati.
    let ultimoDato = -1;
    let k = 0;
    while (k < corpo.length) {
      const x = corpo[k]!;
      if (x.k === "variabile") {
        k++;
        continue;
      }
      if (x.k !== "assegna" || x.bersaglio.genere !== "nome") break;
      const n = x.bersaglio.nome;
      const posto = dati.findIndex((d) => d.nome === n && !d.parametro);
      const v = letterale(x);
      if (posto <= ultimoDato || v === undefined || dati[posto]!.iniziale !== undefined || Array.isArray(v) !== dati[posto]!.vettore) break;
      dati[posto]!.iniziale = v;
      ultimoDato = posto;
      corpo = [...corpo.slice(0, k), ...corpo.slice(k + 1)];
    }
    // Un elenco che non è un valore iniziale: un'assegnazione per elemento.
    for (const x of tutte(corpo)) if (x.k === "assegna" && x.elenco !== undefined) trasformazioni.push({ specie: "elenco", riga: x.riga });
    return {
      chiave,
      ...(f !== undefined ? { testa: f } : {}),
      riga: rigaDellaParte,
      corpo,
      dati,
      ...(valore !== undefined ? { valore, rigaDelValore: rigaDelValore! } : {}),
      ...(appoggio !== undefined ? { appoggio } : {}),
    };
  };

  for (const f of letto.funzioni) {
    const n = funzioniRinominate.get(f.nome) ?? f.nome;
    parti.push(prepara(`f:${n}`, f, f.corpo, f.riga));
    nomiDelleParti.set(`f:${n}`, n);
    rigaDellaFunzione.set(n, f.riga);
  }
  const esterno = letto.esterno.length > 0 ? prepara("esterno", undefined, letto.esterno, letto.esterno[0]!.riga) : undefined;
  if (esterno !== undefined && procedura !== undefined) {
    note.push({ specie: "procedura", riga: esterno.riga, nome: procedura });
    rigaDellaFunzione.set(procedura, esterno.riga);
  }

  // Le lunghezze dei vettori: i dati, i risultati, gli elenchi, poi i legami (vedi in testa).
  const datoDellaParte = (parte: Parte, n: string) => parte.dati.find((d) => d.nome === n);
  const vettore = (parte: Parte, e: Espressione): string | undefined => {
    if (e.genere === "nome") {
      const d = datoDellaParte(parte, e.nome);
      if (d !== undefined) return d.vettore ? `d:${parte.chiave}:${e.nome}` : undefined;
      const c = comuni.find((x) => x.name === e.nome);
      return c?.size !== undefined ? `c:${e.nome}` : undefined;
    }
    if (e.genere === "chiamata") {
      if (funzioni.has(e.nome)) {
        const g = parti.find((x) => x.testa !== undefined && (funzioniRinominate.get(x.testa.nome) ?? x.testa.nome) === e.nome);
        return g?.testa?.risultato?.vettore === true ? `r:${e.nome}` : undefined;
      }
      const g = dellaLibreria.get(e.nome);
      if (g?.return_size !== undefined) {
        lunghezze.dai(`r:${e.nome}`, g.return_size);
        return `r:${e.nome}`;
      }
    }
    return undefined;
  };
  const parametriDi = (n: string): { chiave: string; vettore: boolean }[] | undefined => {
    const g = parti.find((x) => x.testa !== undefined && (funzioniRinominate.get(x.testa.nome) ?? x.testa.nome) === n);
    if (g !== undefined) return g.dati.filter((d) => d.parametro).map((d) => ({ chiave: `d:${g.chiave}:${d.nome}`, vettore: d.vettore }));
    const h = dellaLibreria.get(n);
    if (h === undefined) return undefined;
    return h.data
      .filter((d) => d.parameter !== undefined)
      .map((d) => {
        const chiave = `l:${n}:${d.name}`;
        if (d.size !== undefined) lunghezze.dai(chiave, d.size);
        return { chiave, vettore: d.size !== undefined };
      });
  };
  for (const parte of [...parti, ...(esterno !== undefined ? [esterno] : [])]) {
    for (const d of parte.dati) if (d.vettore && Array.isArray(d.iniziale)) lunghezze.dai(`d:${parte.chiave}:${d.nome}`, d.iniziale.length);
    for (const x of tutte(parte.corpo))
      if (x.k === "assegna" && x.elenco !== undefined) {
        const v = vettore(parte, x.bersaglio);
        if (v !== undefined) lunghezze.dai(v, x.elenco.length);
      }
    if (parte.testa?.risultato?.vettore === true && parte.valore !== undefined) {
      const v = vettore(parte, parte.valore);
      if (v !== undefined) lunghezze.uguali(`r:${nomiDelleParti.get(parte.chiave)}`, v);
    }
    for (const x of tutte(parte.corpo)) {
      const chiamate = espressioniDi(x).flatMap(function tutteLeChiamate(e: Espressione): Extract<Espressione, { genere: "chiamata" }>[] {
        return [...(e.genere === "chiamata" ? [e] : []), ...sotto(e).flatMap(tutteLeChiamate)];
      });
      if (x.k === "chiama") chiamate.push({ genere: "chiamata", nome: x.nome, argomenti: x.argomenti });
      for (const c of chiamate) {
        const parametri = parametriDi(c.nome);
        if (parametri === undefined) continue;
        c.argomenti.forEach((a, i) => {
          const p = parametri[i];
          const v = vettore(parte, a);
          if (p?.vettore === true && v !== undefined) lunghezze.uguali(p.chiave, v);
        });
      }
      if (x.k === "assegna" && x.elenco === undefined && x.bersaglio.genere === "nome") {
        const a = vettore(parte, x.bersaglio);
        const b = vettore(parte, x.valore);
        if (a !== undefined && b !== undefined) lunghezze.uguali(a, b);
      }
      // Il `per ogni` del generatore: la sorgente lunga quanto l'intervallo.
      if (x.k === "per" && x.indice.startsWith("_") && x.fino.genere === "intero") {
        const primo = x.corpo[0];
        if (primo?.k === "assegna" && primo.valore.genere === "indice" && primo.valore.base.genere === "nome") {
          const s = primo.valore.base.nome;
          const v = s.startsWith("_") ? sorgenteDi(parte.corpo, s) : nome(s);
          const chiave = v !== undefined ? vettore(parte, v) : undefined;
          if (chiave !== undefined) lunghezze.dai(chiave, x.fino.valore);
        }
      }
    }
  }
  const lunghezzaDi = (chiave: string, n: string, riga: number): number => {
    const l = lunghezze.di(chiave);
    if (l !== undefined) return l;
    lunghezze.dai(chiave, dimensione);
    note.push({ specie: "dimensione", riga, nome: n, valore: dimensione });
    return dimensione;
  };
  for (const c of comuni) if (c.size !== undefined) (c as { size?: number }).size = lunghezzaDi(`c:${c.name}`, c.name, 1);

  // Le funzioni del progetto.
  const costruisci = (parte: Parte, genere: Funzione["kind"], nomeDellaParte: string | undefined, idDellaFunzione: string): Funzione => {
    const traduttore = new Traduttore(parte, id);
    const blocchi = traduttore.sequenza(parte.corpo);
    const data: Dato[] = parte.dati.map((d) => ({
      name: d.nome,
      type: "integer",
      ...(d.vettore ? { size: lunghezzaDi(`d:${parte.chiave}:${d.nome}`, d.nome, d.riga) } : {}),
      ...(d.iniziale !== undefined ? { initial: d.iniziale } : {}),
      ...(d.parametro ? { parameter: "value" as const } : {}),
    }));
    const risultato = parte.testa?.risultato;
    const fine = { id: id(parte.testa?.fine ?? parte.rigaDelValore ?? parte.riga), ...(parte.valore !== undefined ? { return_value: traduttore.testo(parte.valore, parte.rigaDelValore!) } : {}) };
    if (parte.rigaDelValore !== undefined) righeDelBlocco.set(fine.id, parte.rigaDelValore);
    return {
      id: idDellaFunzione,
      kind: genere,
      ...(nomeDellaParte !== undefined ? { name: nomeDellaParte } : {}),
      ...(genere === "function" ? { return_type: "integer" as const } : {}),
      ...(risultato?.vettore === true ? { return_size: lunghezzaDi(`r:${nomeDellaParte}`, nomeDellaParte!, parte.riga) } : {}),
      data,
      body: blocchi,
      end: fine,
    };
  };
  const principale: Funzione =
    esterno !== undefined && procedura === undefined ? costruisci(esterno, "main", undefined, "f1") : { id: "f1", kind: "main", data: [], body: [], end: { id: id(1) } };
  let k = 2;
  for (const parte of parti) funzioniDelProgetto.push(costruisci(parte, parte.testa!.risultato !== undefined ? "function" : "procedure", nomiDelleParti.get(parte.chiave)!, `f${k++}`));
  if (esterno !== undefined && procedura !== undefined) funzioniDelProgetto.push(costruisci(esterno, "procedure", procedura, `f${k++}`));

  const progetto: Progetto = {
    format: "algodesign",
    schema_version: 1,
    metadata: { name: opzioni.nome ?? opzioni.procedura ?? "letto" },
    ...(comuni.length > 0 ? { shared_constants: comuni } : {}),
    functions: [principale, ...funzioniDelProgetto],
  };
  return {
    ok: true,
    progetto,
    trasformazioni: trasformazioni.sort((a, b) => a.riga - b.riga),
    note: note.sort((a, b) => a.riga - b.riga),
    rigaDelBlocco: righeDelBlocco,
    rigaDellaFunzione,
  };
}

/** Il primo fra `nome`, `nome_2`, `nome_3`… che non è in `usati`, e lo segna. */
function liberoNome(n: string, usati: Set<string>): string {
  const scelto = usati.has(n) ? liberoDa(n, usati) : n;
  usati.add(scelto);
  return scelto;
}

/** Il valore di un'assegnazione come valore iniziale: un numero (col meno), o un elenco di numeri. */
function letterale(x: Extract<Istruzione, { k: "assegna" }>): string | readonly string[] | undefined {
  const numero = (e: Espressione): string | undefined =>
    e.genere === "intero" ? String(e.valore) : e.genere === "unario" && e.operatore === "-" && e.operando.genere === "intero" ? `-${e.operando.valore}` : undefined;
  if (x.elenco === undefined) return numero(x.valore);
  const elementi = x.elenco.map(numero);
  return elementi.every((v) => v !== undefined) ? (elementi as string[]) : undefined;
}

/** La chiamata assegnata a `_s` in una sequenza (la sorgente di un `per ogni` del generatore). */
function sorgenteDi(xs: readonly Istruzione[], s: string): Espressione | undefined {
  for (const x of tutte(xs)) if (x.k === "assegna" && x.bersaglio.genere === "nome" && x.bersaglio.nome === s && x.valore.genere === "chiamata") return x.valore;
  return undefined;
}

/** Le istruzioni in blocchi, con le forme del generatore. */
class Traduttore {
  constructor(
    readonly parte: Parte,
    readonly id: (riga: number) => string,
  ) {}

  private conTrattino(e: Espressione, riga: number): void {
    const n = nomiIn(e).find((x) => x.startsWith("_"));
    if (n !== undefined) throw new Fermo(riga, `${n}: un nome col trattino basso non può essere un dato del flowchart`);
  }
  /** Un'espressione nel flowchart, coi controlli di ciò che il flowchart non ha (anche per il valore che una funzione
   * restituisce in fondo). */
  testo(e: Espressione, riga: number): string {
    this.conTrattino(e, riga);
    const c = chiamateIn(e).find((n) => n === "min" || n === "max" || n === "output");
    if (c !== undefined) throw new Fermo(riga, c === "output" ? "«output» è un'istruzione, non un valore" : `«${c}» non c'è nel flowchart: scrivila come una funzione`);
    // Un'operazione a parola del flowchart (`length`, `round`…) chiamata come una funzione: il testo non la definisce
    // (una funzione del testo con quel nome è già stata rinominata, o ha fermato la lettura).
    const parola = chiamateIn(e).find((n) => paroleDelFlowchart.has(n));
    if (parola !== undefined) throw new Fermo(riga, `«${parola}» non c'è in «Accademico»: scrivila come una funzione, con un altro nome`);
    if (e.genere === "stringa" || sotto(e).some((x) => x.genere === "stringa")) throw new Fermo(riga, "una stringa si scrive solo con «output»");
    return testo(e, riga);
  }

  sequenza(xs: readonly Istruzione[]): Blocco[] {
    const fuori: Blocco[] = [];
    for (let k = 0; k < xs.length; k++) {
      const x = xs[k]!;
      const dopo = xs[k + 1];
      // Il ripeti del generatore.
      if (x.k === "assegna" && x.bersaglio.genere === "nome" && x.bersaglio.nome.startsWith("_") && dopo?.k === "mentre") {
        const r = this.ripeti(x.bersaglio.nome, x, dopo);
        if (r !== undefined) {
          fuori.push(r);
          k++;
          continue;
        }
      }
      // La sorgente di un `per ogni` del generatore.
      if (x.k === "assegna" && x.bersaglio.genere === "nome" && x.bersaglio.nome.startsWith("_") && x.valore.genere === "chiamata" && dopo?.k === "per" && dopo.indice.startsWith("_")) {
        const b = this.perOgni(dopo, { nome: x.bersaglio.nome, chiamata: x.valore, riga: x.riga });
        fuori.push(b);
        k++;
        continue;
      }
      if (x.k === "variabile") continue;
      fuori.push(...this.istruzione(x));
    }
    return fuori;
  }

  private ripeti(ancora: string, inizio: Extract<Istruzione, { k: "assegna" }>, ciclo: Extract<Istruzione, { k: "mentre" }>): Blocco | undefined {
    const c = ciclo.condizione;
    const ultimo = ciclo.corpo.at(-1);
    const eAncora = (e: Espressione, v: number) => canonico(e) === canonico(uguale(nome(ancora), intero(v)));
    const assegnaAncora = (xs: readonly Istruzione[], v: number) =>
      xs.length === 1 && xs[0]!.k === "assegna" && canonico(xs[0]!.bersaglio) === canonico(nome(ancora)) && canonico((xs[0] as { valore: Espressione }).valore) === canonico(intero(v));
    if (canonico(inizio.valore) !== canonico(intero(1)) || !eAncora(c, 1) || ultimo?.k !== "se" || !assegnaAncora(ultimo.allora, 1) || !assegnaAncora(ultimo.altrimenti, 0)) return undefined;
    const corpo = ciclo.corpo.slice(0, -1);
    if (tutte(corpo).some((x) => espressioniDi(x).some((e) => nomiIn(e).includes(ancora)))) return undefined;
    const id = this.id(inizio.riga);
    return { id, kind: "repeat", body: this.sequenza(corpo), condition: this.testo(ultimo.condizione, ultimo.riga) };
  }

  private perOgni(x: Extract<Istruzione, { k: "per" }>, sorgente?: { nome: string; chiamata: Espressione; riga: number }): Blocco {
    const primo = x.corpo[0];
    const forma =
      x.da.genere === "intero" &&
      x.da.valore === 0 &&
      x.fino.genere === "intero" &&
      primo?.k === "assegna" &&
      primo.bersaglio.genere === "nome" &&
      !primo.bersaglio.nome.startsWith("_") &&
      primo.valore.genere === "indice" &&
      primo.valore.base.genere === "nome" &&
      canonico(primo.valore.indice) === canonico(nome(x.indice)) &&
      (sorgente === undefined ? !primo.valore.base.nome.startsWith("_") : primo.valore.base.nome === sorgente.nome);
    if (!forma) throw new Fermo(x.riga, `${x.indice}: un nome col trattino basso non può essere un dato del flowchart`);
    const p = primo as Extract<Istruzione, { k: "assegna" }>;
    const resto = x.corpo.slice(1);
    const nascosti = [x.indice, ...(sorgente !== undefined ? [sorgente.nome] : [])];
    for (const y of tutte(resto)) if (espressioniDi(y).some((e) => nomiIn(e).some((n) => nascosti.includes(n)))) throw new Fermo(y.riga, `${x.indice} è l'indice nascosto di un «per ogni»: non si usa nel corpo`);
    const fonte = sorgente !== undefined ? sorgente.chiamata : (p.valore as { base: Espressione }).base;
    const id = this.id(x.riga);
    return { id, kind: "for_each", item: this.testo(p.bersaglio, p.riga), source: this.testo(fonte, sorgente?.riga ?? x.riga), body: this.sequenza(resto) };
  }

  private istruzione(x: Istruzione): Blocco[] {
    switch (x.k) {
      case "variabile":
        return [];
      case "assegna":
        if (x.elenco !== undefined) {
          if (x.bersaglio.genere !== "nome") throw new Fermo(x.riga, "un elenco si assegna a un vettore intero");
          const v = this.testo(x.bersaglio, x.riga);
          // Il testo valuta l'elenco intero prima di assegnarlo; un'assegnazione per elemento no.
          const ricevente = x.bersaglio.nome;
          if (x.elenco.some((e) => nomiIn(e).includes(ricevente))) throw new Fermo(x.riga, `l'elenco legge ${v}, il vettore che lo riceve: metti prima i valori in un vettore d'appoggio`);
          return x.elenco.map((e, k) => ({ id: this.id(x.riga), kind: "assignment", target: `${v}[${k}]`, value: this.testo(e, x.riga) }));
        }
        return [{ id: this.id(x.riga), kind: "assignment", target: this.testo(x.bersaglio, x.riga), value: this.testo(x.valore, x.riga) }];
      case "scambia": {
        const appoggio = this.parte.appoggio!;
        const a = this.testo(x.a, x.riga);
        const b = this.testo(x.b, x.riga);
        return [
          { id: this.id(x.riga), kind: "assignment", target: appoggio, value: a },
          { id: this.id(x.riga), kind: "assignment", target: a, value: b },
          { id: this.id(x.riga), kind: "assignment", target: b, value: appoggio },
        ];
      }
      case "chiama":
        if (x.nome === "output") {
          if (x.argomenti.length !== 1) throw new Fermo(x.riga, "«output» scrive un valore alla volta");
          const v = x.argomenti[0]!;
          return [{ id: this.id(x.riga), kind: "write", values: [v.genere === "stringa" ? testo(v, x.riga) : this.testo(v, x.riga)], newline: true }];
        }
        if (x.nome === "min" || x.nome === "max") throw new Fermo(x.riga, `«${x.nome}» non c'è nel flowchart: scrivila come una funzione`);
        if (paroleDelFlowchart.has(x.nome)) throw new Fermo(x.riga, `«${x.nome}» non c'è in «Accademico»: scrivila come una funzione, con un altro nome`);
        return [{ id: this.id(x.riga), kind: "call", callee: x.nome, arguments: x.argomenti.map((a) => this.testo(a, x.riga)) }];
      case "se": {
        const id = this.id(x.riga);
        return [{ id, kind: "if", condition: this.testo(x.condizione, x.riga), then: this.sequenza(x.allora), else: this.sequenza(x.altrimenti) }];
      }
      case "mentre": {
        const id = this.id(x.riga);
        return [{ id, kind: "while", condition: this.testo(x.condizione, x.riga), body: this.sequenza(x.corpo) }];
      }
      case "per": {
        if (x.indice.startsWith("_")) return [this.perOgni(x)];
        controllaIlPer(x);
        const id = this.id(x.riga);
        return [{ id, kind: "for", counter: x.indice, from: this.testo(x.da, x.riga), to: this.testo(fineInclusa(x.fino), x.riga), body: this.sequenza(x.corpo) }];
      }
      case "restituisci":
        throw new Error("un return rimasto dopo la trasformazione");
    }
  }
}

// ---------------------------------------------------------------------------------------- l'aggiunta a una libreria

export type Aggiunta =
  | {
      readonly ok: true;
      readonly progetto: Progetto;
      /** Le procedure e funzioni entrate, e quelle che c'erano già identiche (non entrano). */
      readonly aggiunte: readonly string[];
      readonly identiche: readonly string[];
      /** I nomi già nella libreria, rinominati: `nome-in-uso`, con la riga dell'intestazione. */
      readonly rinominate: readonly Trasformazione[];
    }
  | { readonly ok: false; readonly conflitti: readonly { readonly nome: string; readonly riga: number; readonly proposto: string }[] };

/** Le procedure e funzioni lette (e le costanti comuni che usano) aggiunte a una libreria con l'importazione del nucleo:
 * ciò che c'è già identico non entra, e la libreria non cambia altrove; un nome già usato ferma l'aggiunta, o con
 * `rinomina` prende il primo seguito `_2` libero (anche nelle chiamate di ciò che entra). */
export function aggiungiAllaLibreria(libreria: Progetto, letto: Extract<Lettura, { ok: true }>, rinomina: boolean): Aggiunta {
  const ids = letto.progetto.functions.filter((f) => f.kind !== "main").map((f) => f.id);
  const { voci } = riepilogoDellImportazione(libreria, letto.progetto, ids);
  const riga = (n: string) => letto.rigaDellaFunzione.get(n) ?? 1;
  const conflitti = voci.filter((v) => v.stato === "conflitto");
  if (conflitti.length > 0 && !rinomina) return { ok: false, conflitti: conflitti.map((v) => ({ nome: v.nome, riga: riga(v.nome), proposto: v.proposto! })) };
  const esito = importa(letto.progetto, ids, { conCasi: true })(libreria, primoLibero(libreria));
  if (!esito.ok) throw new Error(`l'importazione rifiuta: ${JSON.stringify(esito.rifiuto)}`);
  return {
    ok: true,
    progetto: esito.progetto,
    aggiunte: voci.filter((v) => v.stato !== "identica").map((v) => (v.stato === "conflitto" ? v.proposto! : v.nome)),
    identiche: voci.filter((v) => v.stato === "identica").map((v) => v.nome),
    rinominate: conflitti.map((v) => ({ specie: "nome-in-uso", riga: riga(v.nome), nome: v.nome, nuovo: v.proposto! })),
  };
}

/** L'ultimo valore dell'intervallo `[a ... b)`, scritto come il generatore lo rilegge: un letterale il suo precedente,
 * `x + 1` come `x`, `x - k` come `x - (k + 1)`, altrimenti `b - 1`. */
function fineInclusa(b: Espressione): Espressione {
  if (b.genere === "intero") return b.valore >= 1 ? intero(b.valore - 1) : { genere: "unario", operatore: "-", operando: intero(1 - b.valore) };
  if (b.genere === "binario" && b.operatore === "+" && b.destro.genere === "intero" && b.destro.valore === 1) return b.sinistro;
  if (b.genere === "binario" && b.operatore === "-" && b.destro.genere === "intero") return { ...b, destro: intero(b.destro.valore + 1) };
  return { genere: "binario", operatore: "-", sinistro: b, destro: intero(1) };
}
