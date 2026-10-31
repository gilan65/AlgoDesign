// Il TypeScript di un progetto: un programma che sui casi d'uso dà lo stesso output dell'interprete, eseguito da Node.js
// (o da Bun) così com'è, nella lingua dell'interfaccia (i nomi delle funzioni di supporto, i commenti, i motivi d'errore).
// La semantica resta quella del C, come nel Python: gli interi sono `number` e la divisione fra interi passa da `dividi`,
// che tronca verso lo zero; il resto è `%`, che in JavaScript ha già il segno del dividendo come nel C. I comportamenti
// che il C non definisce non si controllano, e il commento in testa lo dice. Solo sintassi che si cancella togliendo i
// tipi (niente `enum` né `namespace`): il programma resta JavaScript a meno delle annotazioni.
//
// Il generatore cresce un gruppo di costrutti per volta. Oggi sa scrivere il programma principale della tappa 1: i dati
// e le costanti dei cinque tipi semplici e i vettori, l'assegnazione (anche a un elemento), la lettura, la scrittura, il
// commento, `se`, `mentre`, `ripeti` e ogni espressione della tappa 1; per ogni altro costrutto il progetto non si genera,
// e `nonAncora` dice il primo che trova («le procedure e le funzioni», «il per», «la copia di un vettore»…), dopo gli
// errori statici come un generatore che si ferma.
//
// La forma: il nome del progetto e la testa, l'import da `node:fs` delle sole funzioni che leggono e scrivono (isolate
// in `leggi_riga`, `scrivi` e `fermati`, che una pagina nel browser può sostituire), le costanti comuni, `main` coi dati
// annotati dalla vista dei dati (`let`, o `const` per una costante; un dato senza valore iniziale `let x!: number;`,
// perché `tsc` non lo dica usato prima di avere un valore in un programma valido; il ruolo o «costante» in una colonna
// allineata di commenti), le regole, poi le sole funzioni di supporto che il programma usa (con quelle che chiamano), in
// un ordine fisso, e la chiamata di `main`. Il vettore è un `Array` del tipo dell'elemento: con l'elenco dei valori, col
// valore ripetuto (`new Array<number>(26).fill(0)`) o senza valore (`new Array<string>(6)`: la lunghezza c'è, gli
// elementi no). Il carattere è una stringa di un carattere, come nel Python; la posizione, la lunghezza e il confronto
// d'ordine di carattere e stringa passano dalle funzioni di supporto, che contano i codici (`length` e `<` di JavaScript
// contano le unità UTF-16). Il `ripeti` è `do { … } while (condizione);`, che rivaluta la condizione dopo il corpo.
//
// Una scrittura è un testo composto (`` scrivi(`${q} ${r}\n`) ``): un intero, un carattere e una stringa come sono, un
// reale da `reale` (i decimali del progetto sul valore esatto, la metà alla cifra pari, come `printf` del C), un booleano
// da `booleano`, un letterale stringa o carattere dentro il testo coi caratteri che il testo composto protegge. Un valore
// che può fermare il programma comincia una scrittura nuova: quelli prima restano scritti, come nell'interprete.
//
// Lo zero intero: in JavaScript un calcolo fra interi può dare lo zero negativo (`Math.trunc(-1 / 2)`, `-4 % 2`), che da
// intero non si vede e da reale si scriverebbe `-0.00`. L'intero che entra in un reale (un dato reale, una conversione, un
// calcolo misto, una radice, un arrotondamento, la potenza) passa da `converti_a_reale`, che toglie il segno allo zero; un
// letterale intero lì si scrive reale (`5.0`, e `-0` è `0.0`).
//
// Le espressioni si riscrivono dall'albero, non dal testo, con le precedenze di JavaScript (un confronto dentro un
// confronto sta fra parentesi da tutti e due i lati, come nel Python, anche dove JavaScript non le vorrebbe; un meno
// davanti a un meno sta fra parentesi, perché `--` è un altro operatore). Un `===` o `!==` fra due letterali, o fra un
// dato booleano e un letterale o un altro booleano, allarga il tipo del lato sinistro (`(p as boolean) === false`):
// `tsc` rifiuta l'uguaglianza fra due tipi letterali diversi, e un booleano assegnato con un letterale ne ha uno.
// L'ordine degli arresti è quello del Python: un carattere che entra in una stringa si controlla dopo il lato destro
// della concatenazione, e se quel lato si può fermare la concatenazione passa da `concatena`. In `v[i] = valore`
// JavaScript calcola l'indice prima del valore, come il flowchart.
//
// Un arresto scrive «Errore alla riga N: motivo» sullo standard error ed esce con 1: `fermati` trova la riga nella pila
// delle chiamate (`new Error().stack`), alla prima chiamata dentro `main`, come il Python che risale le cornici.
//
// La provenienza delle righe è quella del Python: la riga di un blocco ha quel blocco (la condizione del `ripeti` sulla
// riga del `while` in fondo), la dichiarazione di un dato ha il dato, le righe di struttura (`function main(): void {`,
// `} else {`, `do {`, le graffe, la testa) e le funzioni di supporto nessuna; le righe di `main` sono segnate come sue.
//
// Che cosa NON fa: controllare un intero oltre i 32 bit, la divisione per zero, l'indice di un vettore, il reale fuori
// dall'intervallo degli interi convertito in intero, il dato senza valore, il reale non finito; le ultime cifre di
// `elevato_a` con un esponente non intero o oltre 1100 sono quelle di `Math.pow`, non quelle dell'interprete.

import { lunghezzaPredefinita, type Tetti } from "../controllo/controllo";
import { lunghezzaMassima as lunghezzaMassimaNelNucleo } from "../controllo/lunghezza";
import { tettoDelleChiamate } from "../controllo/spazio";
import { analizza, type Espressione } from "../espressioni/analizzatore";
import { opzioniPredefinite, tipoSemplice, type Blocco, type Dato, type Progetto, type Tipo, type TipoDelDato } from "../progetto/modello";
import { genera, segnate, type Generato, type Riga } from "./forma";
import { motiviCol } from "./motivi";
import { nomiDelSupporto, nomiDelSupportoDelTypeScript, type LinguaDelCodice } from "./nomi";
import type { NoteDeiDati, Prova } from "./python";

export function typescript(p: Progetto, limiti: Tetti, lingua: LinguaDelCodice, note: NoteDeiDati, prova?: Prova): Generato {
  return genera(p, limiti, (q) => righeDelTypeScript(q, lingua, note), undefined, (q) => nonAncora(q, prova));
}

const rientro = "  ";

const testi = {
  it: {
    generato: "Programma principale generato da AlgoDesign dal flowchart e dalla vista dei dati.",
    nonControllati: [
      "Come il C, non controlla i calcoli che il C lascia senza regola (un intero oltre i 32 bit, la divisione",
      "intera per zero, un indice fuori dal vettore, un reale fuori dall'intervallo degli interi convertito in",
      "intero, un dato letto prima di avere un valore) né un reale che diventa infinito o non è un numero: li",
      "ferma l'esecuzione in AlgoDesign.",
    ],
    costantiComuni: "Costanti comuni",
    supporto: "Funzioni di supporto: fanno ciò che fa il C.",
  },
  en: {
    generato: "Main program generated by AlgoDesign from the flowchart and the data view.",
    nonControllati: [
      "Like C, it does not check the calculations that C leaves without a rule (an integer beyond 32 bits, an",
      "integer division by zero, an index outside the array, a real outside the integer range converted to an",
      "integer, a data item read before it has a value) nor a real that becomes infinite or not a number:",
      "AlgoDesign stops them when it runs the flowchart.",
    ],
    costantiComuni: "Shared constants",
    supporto: "Support functions: they do what C does.",
  },
} as const;

/** Le funzioni di supporto del TypeScript, nell'ordine in cui il programma le scrive. */
const supportoInOrdine = [
  "fermati", "leggiRiga", "leggiIntero", "leggiReale", "leggiCarattere", "leggiStringa", "leggiBooleano", "dividi",
  "convertiAReale", "elevatoA", "arrotonda", "convertiACarattere", "convertiAVettore", "convertiAStringa", "carattereDi",
  "lunghezza", "confronta", "nellaStringa", "concatenazione", "alPiu", "reale", "booleano", "scrivi",
] as const;
type Supporto = (typeof supportoInOrdine)[number];

/** I nomi delle funzioni di supporto in una lingua: quelli comuni agli altri linguaggi, e quelli del solo TypeScript. */
const nomiIn = (lingua: LinguaDelCodice): Readonly<Record<Supporto, string>> =>
  Object.fromEntries(
    supportoInOrdine.map((f) => [f, f in nomiDelSupportoDelTypeScript[lingua] ? nomiDelSupportoDelTypeScript[lingua][f as keyof (typeof nomiDelSupportoDelTypeScript)["it"]] : nomiDelSupporto[lingua][f as Exclude<Supporto, keyof (typeof nomiDelSupportoDelTypeScript)["it"]>]]),
  ) as Record<Supporto, string>;

/** Le funzioni di supporto che ognuna chiama: il programma scrive anche quelle. */
const chiama: Partial<Record<Supporto, readonly Supporto[]>> = {
  leggiRiga: ["fermati"],
  leggiIntero: ["leggiRiga", "fermati"],
  leggiReale: ["leggiRiga", "fermati"],
  leggiCarattere: ["leggiRiga", "lunghezza", "fermati"],
  leggiStringa: ["leggiRiga", "lunghezza", "fermati"],
  leggiBooleano: ["leggiRiga", "fermati"],
  convertiACarattere: ["fermati"],
  convertiAVettore: ["fermati"],
  convertiAStringa: ["fermati"],
  carattereDi: ["fermati"],
  nellaStringa: ["fermati"],
  concatenazione: ["fermati"],
  alPiu: ["lunghezza", "fermati"],
};

/** Gli a capo di una riga di testo: quelli di una fine riga, e i due separatori di Unicode che in JavaScript chiudono un
 * commento `//`. */
const aCapo = new RegExp(`\\r\\n|[\\r\\n${String.fromCharCode(0x2028, 0x2029)}]`);

const albero = (testo: string): Espressione => {
  const a = analizza(testo);
  // Il controllo statico ha già provato sintassi e tipi: qui non ci sono errori.
  if (!a.ok) throw new Error(`espressione non analizzabile dopo il controllo: ${testo}`);
  return a.espressione;
};

/** I blocchi di una sequenza, quelli dentro compresi. */
const tuttiIBlocchi = (bs: readonly Blocco[]): Blocco[] =>
  bs.flatMap((b) => [
    b,
    ...tuttiIBlocchi(b.kind === "if" ? [...b.then, ...b.else] : b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each" ? b.body : []),
  ]);

// ------------------------------------------------------------------------------------------------ i letterali

/** Un codice di un letterale fra `apice`: le sequenze di JavaScript, i caratteri di controllo in esadecimale, i due
 * separatori di Unicode con la loro sequenza (scritti, sarebbero un a capo per chi legge il file). */
function nelLetterale(codice: number, apice: string): string {
  const c = String.fromCodePoint(codice);
  if (c === "\\" || c === apice) return `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (codice < 0x20 || codice === 0x7f) return `\\x${codice.toString(16).padStart(2, "0")}`;
  if (codice === 0x2028 || codice === 0x2029) return `\\u${codice.toString(16)}`;
  return c;
}
const letteraleCarattere = (codice: number) => `'${nelLetterale(codice, "'")}'`;
const letteraleStringa = (codici: readonly number[]) => `"${codici.map((c) => nelLetterale(c, '"')).join("")}"`;

/** Un reale dal suo valore: le cifre più corte che lo rileggono uguale, con il punto se mancano. */
function letteraleReale(x: number): string {
  const t = String(x);
  return /[.e]/.test(t) ? t : `${t}.0`;
}

/** Un codice in un testo composto: i caratteri che il testo composto legge a modo suo, quelli di controllo e i due
 * separatori di Unicode. */
function nelTesto(codice: number): string {
  const c = String.fromCodePoint(codice);
  if (c === "`" || c === "\\" || c === "$") return `\\${c}`;
  if (c === "\n") return "\\n";
  if (c === "\t") return "\\t";
  if (c === "\r") return "\\r";
  if (codice < 0x20 || codice === 0x7f) return `\\x${codice.toString(16).padStart(2, "0")}`;
  if (codice === 0x2028 || codice === 0x2029) return `\\u${codice.toString(16)}`;
  return c;
}

// ------------------------------------------------------------------------------------- la guardia

/** Il primo costrutto di un'espressione che il generatore non sa ancora scrivere. */
function nonAncoraNellEspressione(e: Espressione): string | undefined {
  switch (e.genere) {
    case "campo":
      return "il campo di un record";
    case "chiamata":
      return "la chiamata di una funzione";
    case "indice":
      return nonAncoraNellEspressione(e.base) ?? nonAncoraNellEspressione(e.indice);
    case "unario":
      return nonAncoraNellEspressione(e.operando);
    case "binario":
      return nonAncoraNellEspressione(e.sinistro) ?? nonAncoraNellEspressione(e.destro);
    default:
      return undefined;
  }
}

const nomeDelBlocco: Readonly<Record<Blocco["kind"], string | undefined>> = {
  assignment: undefined,
  write: undefined,
  comment: undefined,
  read: undefined,
  if: undefined,
  while: undefined,
  repeat: undefined,
  for: "il per",
  for_each: "il per ogni",
  call: "la chiamata di una procedura",
};

/** Il primo costrutto del progetto che il generatore non sa ancora scrivere, o niente. */
function nonAncora(p: Progetto, prova: Prova | undefined): string | undefined {
  if (prova !== undefined) return "il programma di prova di una procedura o di una funzione";
  if (p.functions.length > 1) return "le procedure e le funzioni";
  if ((p.records ?? []).length > 0) return "il record";
  const main = p.functions[0]!;
  const dati = [...(p.shared_constants ?? []), ...main.data];
  for (const d of dati) {
    if (d.type === "record") return d.size === undefined ? "il record" : "la tabella";
    if (d.columns !== undefined) return "la matrice";
    const valori = d.initial === undefined ? [] : typeof d.initial === "string" ? [d.initial] : Array.isArray(d.initial) ? (d.initial as readonly string[]) : [(d.initial as { readonly each: string }).each];
    for (const v of valori) {
      const nelValore = nonAncoraNellEspressione(albero(v));
      if (nelValore !== undefined) return nelValore;
    }
  }
  const vettori = new Set(dati.filter((d) => d.size !== undefined).map((d) => d.name));
  for (const b of tuttiIBlocchi(main.body)) {
    const blocco = nomeDelBlocco[b.kind];
    if (blocco !== undefined) return blocco;
    const espressioni =
      b.kind === "assignment" ? [b.target, b.value]
      : b.kind === "read" ? [b.target]
      : b.kind === "write" ? b.values
      : b.kind === "if" || b.kind === "while" || b.kind === "repeat" ? [b.condition]
      : [];
    for (const x of espressioni) {
      const nellEspressione = nonAncoraNellEspressione(albero(x));
      if (nellEspressione !== undefined) return nellEspressione;
    }
    if (b.kind === "assignment") {
      const t = albero(b.target);
      const v = albero(b.value);
      if (t.genere === "nome" && vettori.has(t.nome) && !(v.genere === "unario" && v.operatore === "to_array")) return "la copia di un vettore";
    }
  }
  return undefined;
}

// ------------------------------------------------------------------------------------------- il programma

function righeDelTypeScript(p: Progetto, lingua: LinguaDelCodice, note: NoteDeiDati): Riga[] {
  const w = testi[lingua];
  const nomi = nomiIn(lingua);
  const main = p.functions.find((f) => f.kind === "main")!;
  const comuni = p.shared_constants ?? [];
  const dati = new Map<string, Dato>([...comuni, ...main.data].map((d) => [d.name, d]));
  const decimali = p.options?.real_decimals ?? opzioniPredefinite.real_decimals;
  const riempimento = (p.options?.fill_character ?? opzioniPredefinite.fill_character).codePointAt(0)!;
  const tetto = tettoDelleChiamate(p);

  const usate = new Set<Supporto>();
  const usa = (f: Supporto): string => {
    usate.add(f);
    return nomi[f];
  };

  // ------------------------------------------------------------------------------------------- i tipi

  /** Un vettore intero: il nome di un vettore. */
  const vettore = (e: Espressione): boolean => e.genere === "nome" && dati.get(e.nome)!.size !== undefined;

  function tipo(e: Espressione): TipoDelDato {
    switch (e.genere) {
      case "intero":
        return "integer";
      case "reale":
      case "pi":
        return "real";
      case "carattere":
        return "character";
      case "stringa":
        return "string";
      case "booleano":
        return "boolean";
      case "nome":
        return dati.get(e.nome)!.type;
      case "indice":
        return vettore(e.base) ? tipo(e.base) : "character";
      case "unario":
        switch (e.operatore) {
          case "-":
          case "absolute_value":
          case "not":
            return tipo(e.operando);
          case "to_integer":
          case "length":
            return "integer";
          case "to_character":
            return "character";
          case "to_string":
            return "string";
          default:
            return "real";
        }
      case "binario": {
        const op = e.operatore;
        if (op !== "+" && op !== "-" && op !== "*" && op !== "/") return op === "mod" ? "integer" : op === "raised_to" ? "real" : "boolean";
        const [s, d] = [tipo(e.sinistro), tipo(e.destro)];
        if (op === "+" && (s === "string" || d === "string")) return "string";
        return s === "integer" && d === "integer" ? "integer" : "real";
      }
      default:
        throw new Error(`espressione fuori dalla tappa 1: ${e.genere}`);
    }
  }

  /** La lunghezza massima che una stringa può avere. */
  const lunghezzaMassima = (e: Espressione): number => lunghezzaMassimaNelNucleo(e, (n) => dati.get(n), () => undefined);

  /** Un carattere che può essere quello di codice 0: un dato, un elemento di un vettore, una conversione da intero. Un
   * letterale non lo è (sarebbe un errore statico), e nemmeno un carattere preso da una stringa. */
  function puoEssereZero(e: Espressione): boolean {
    if (e.genere === "nome") return true;
    if (e.genere === "indice") return vettore(e.base);
    if (e.genere === "unario" && e.operatore === "to_character") return tipo(e.operando) === "integer" || puoEssereZero(e.operando);
    return false;
  }

  // ------------------------------------------------------------------------------------- le espressioni

  /** Il testo di TypeScript e la forza con cui tiene il suo operatore (più alta, più stretta), come le precedenze di
   * JavaScript: 20 un operando, una chiamata o un elemento; 15 il meno e `!`; 12 `*`, `/` e `%`; 11 `+` e `-`; 10 i
   * confronti d'ordine; 9 `===` e `!==`; 5 `&&`; 4 `||`. */
  type Testo = { readonly t: string; readonly forza: number };
  const operando = (t: string): Testo => ({ t, forza: 20 });
  const chiamata = (f: string, ...argomenti: string[]): Testo => operando(`${f}(${argomenti.join(", ")})`);
  const fra = (x: Testo, forza: number) => (x.forza < forza ? `(${x.t})` : x.t);
  /** Dice se il calcolo può fermare il programma per una regola del linguaggio (una funzione di supporto che si ferma). */
  let ferma = false;
  const conArresto = (f: Supporto, ...argomenti: string[]): Testo => {
    ferma = true;
    return chiamata(usa(f), ...argomenti);
  };

  /** Un lato che `tsc` può vedere col tipo letterale: un letterale (col meno davanti) o un dato booleano (un numero e una
   * stringa non si restringono mai). */
  const letteraleOBooleano = (e: Espressione): boolean =>
    e.genere === "intero" || e.genere === "reale" || e.genere === "carattere" || e.genere === "stringa" || e.genere === "booleano" ||
    (e.genere === "unario" && e.operatore === "-" && (e.operando.genere === "intero" || e.operando.genere === "reale")) ||
    (e.genere === "nome" && tipo(e) === "boolean");
  const tipoDiTypeScript = (t: TipoDelDato) => (t === "boolean" ? "boolean" : t === "integer" || t === "real" ? "number" : "string");

  function espressione(e: Espressione): Testo {
    switch (e.genere) {
      case "intero":
        return operando(String(e.valore));
      case "reale":
        return operando(letteraleReale(e.valore));
      case "carattere":
        return operando(letteraleCarattere(e.codice));
      case "stringa":
        return operando(letteraleStringa(e.codici));
      case "booleano":
        return operando(e.valore ? "true" : "false");
      case "pi":
        return operando("Math.PI");
      case "nome":
        return operando(e.nome);
      case "indice":
        // L'elemento di un vettore (non controllato, come nel C); il carattere di una stringa, controllato.
        if (vettore(e.base)) return operando(`${espressione(e.base).t}[${espressione(e.indice).t}]`);
        return conArresto("carattereDi", espressione(e.base).t, espressione(e.indice).t);
      case "unario":
        return unario(e.operatore, e.operando);
      case "binario":
        return binario(e);
      default:
        throw new Error(`espressione fuori dalla tappa 1: ${e.genere}`);
    }
  }

  /** Un valore che entra in un reale: un intero passa da `converti_a_reale` (lo zero intero non ha segno), un letterale
   * intero si scrive reale (`-0` è `0.0`). */
  function nelReale(e: Espressione): Testo {
    if (tipo(e) !== "integer") return espressione(e);
    if (e.genere === "intero") return operando(`${e.valore}.0`);
    if (e.genere === "unario" && e.operatore === "-" && e.operando.genere === "intero") return e.operando.valore === 0 ? operando("0.0") : { t: `-${e.operando.valore}.0`, forza: 15 };
    return chiamata(usa("convertiAReale"), espressione(e).t);
  }

  function unario(op: string, o: Espressione): Testo {
    const t = tipo(o);
    switch (op) {
      case "-": {
        const x = espressione(o);
        // Un meno davanti a un meno: `--` sarebbe il decremento.
        return { t: x.t.startsWith("-") ? `-(${x.t})` : `-${fra(x, 15)}`, forza: 15 };
      }
      case "not":
        return { t: `!${fra(espressione(o), 15)}`, forza: 15 };
      case "to_integer": {
        const x = espressione(o);
        return t === "integer" ? x : t === "character" ? operando(`${fra(x, 20)}.codePointAt(0)!`) : chiamata("Math.trunc", x.t);
      }
      case "to_real":
        return nelReale(o);
      case "to_character": {
        const x = espressione(o);
        return t === "character" ? x : conArresto("convertiACarattere", x.t);
      }
      case "length":
        return chiamata(usa("lunghezza"), espressione(o).t);
      case "absolute_value":
        return chiamata("Math.abs", espressione(o).t);
      case "square_root":
        return chiamata("Math.sqrt", nelReale(o).t);
      case "round":
        return chiamata(usa("arrotonda"), nelReale(o).t);
      case "round_down":
        return chiamata("Math.floor", nelReale(o).t);
      case "round_up":
        return chiamata("Math.ceil", nelReale(o).t);
      case "integer_part":
        return chiamata("Math.trunc", nelReale(o).t);
      default:
        // `to_array` e `to_string` sono solo il lato destro intero di un'assegnazione.
        throw new Error(`operatore fuori dal controllo: ${op}`);
    }
  }

  const ordine: Readonly<Record<string, string>> = { "<": "<", "<=": "<=", ">": ">", ">=": ">=" };

  function binario(e: Extract<Espressione, { genere: "binario" }>): Testo {
    const op = e.operatore;
    const [ts, td] = [tipo(e.sinistro), tipo(e.destro)];
    if (op === "/" && ts === "integer" && td === "integer") return chiamata(usa("dividi"), espressione(e.sinistro).t, espressione(e.destro).t);
    if (op === "mod") return { t: `${fra(espressione(e.sinistro), 12)} % ${fra(espressione(e.destro), 13)}`, forza: 12 };
    if (op === "raised_to") return chiamata(usa("elevatoA"), nelReale(e.sinistro).t, nelReale(e.destro).t);
    if (op === "+" && tipo(e) === "string") {
      const zero = (x: Espressione) => tipo(x) === "character" && puoEssereZero(x);
      if (zero(e.sinistro)) {
        // Il carattere a sinistra si controlla dopo il lato destro: se quel lato si può fermare, prima lui.
        const l = espressione(e.sinistro);
        const prima = ferma;
        ferma = false;
        const r = espressione(e.destro);
        const destraFerma = ferma;
        ferma = prima || destraFerma;
        if (destraFerma) return conArresto("concatenazione", l.t, r.t);
        return { t: `${conArresto("nellaStringa", l.t).t} + ${fra(zero(e.destro) ? conArresto("nellaStringa", r.t) : r, 12)}`, forza: 11 };
      }
      const lato = (x: Espressione): Testo => (zero(x) ? conArresto("nellaStringa", espressione(x).t) : espressione(x));
      const l = lato(e.sinistro);
      const r = lato(e.destro);
      return { t: `${fra(l, 11)} + ${fra(r, 12)}`, forza: 11 };
    }
    if (op === "+" || op === "-" || op === "*" || op === "/") {
      // Un calcolo fra reali: l'intero di un lato entra in un reale.
      const reali = tipo(e) === "real";
      const l = reali ? nelReale(e.sinistro) : espressione(e.sinistro);
      const r = reali ? nelReale(e.destro) : espressione(e.destro);
      const forza = op === "*" || op === "/" ? 12 : 11;
      return { t: `${fra(l, forza)} ${op} ${fra(r, forza + 1)}`, forza };
    }
    if (op === "and" || op === "or") {
      const forza = op === "and" ? 5 : 4;
      return { t: `${fra(espressione(e.sinistro), forza)} ${op === "and" ? "&&" : "||"} ${fra(espressione(e.destro), forza + 1)}`, forza };
    }
    // Un confronto. Un confronto dentro un confronto va fra parentesi da tutti e due i lati.
    const l = espressione(e.sinistro);
    const r = espressione(e.destro);
    const testuale = ts === "character" || ts === "string";
    if (Object.hasOwn(ordine, op)) {
      // Fra caratteri e stringhe l'ordine è quello dei codici: `<` di JavaScript confronta le unità UTF-16.
      if (testuale) return { t: `${usa("confronta")}(${l.t}, ${r.t}) ${ordine[op]} 0`, forza: 10 };
      return { t: `${fra(l, 11)} ${ordine[op]} ${fra(r, 11)}`, forza: 10 };
    }
    // `tsc` rifiuta l'uguaglianza fra due tipi letterali diversi (TS2367): due letterali, o un booleano che un letterale
    // assegnato prima restringe a `true` o `false`. Il lato sinistro allarga il suo tipo con `as`.
    const sinistro = letteraleOBooleano(e.sinistro) && letteraleOBooleano(e.destro) ? operando(`(${l.t} as ${tipoDiTypeScript(ts)})`) : l;
    return { t: `${fra(sinistro, 11)} ${op === "==" ? "===" : "!=="} ${fra(r, 11)}`, forza: 9 };
  }

  /** Un valore che va in un dato del tipo `verso`: un intero in un reale diventa reale; una stringa che può superare la
   * lunghezza massima del dato passa dal controllo. */
  function nelDato(e: Espressione, verso: Pick<Dato, "type" | "size" | "max_length">): string {
    if (verso.type === "real") return nelReale(e).t;
    const x = espressione(e).t;
    const massima = verso.max_length ?? lunghezzaPredefinita;
    if (verso.type === "string" && !(verso.size !== undefined && vettore(e)) && lunghezzaMassima(e) > massima) return conArresto("alPiu", x, String(massima)).t;
    return x;
  }

  // ---------------------------------------------------------------------------------------- le dichiarazioni

  const annotazioneDelTipo = (t: Tipo) => ({ integer: "number", real: "number", character: "string", string: "string", boolean: "boolean" })[t];
  const annotazione = (d: Dato) => `${annotazioneDelTipo(tipoSemplice(d.type))}${d.size === undefined ? "" : "[]"}`;
  const valoreIniziale = (d: Dato): string | undefined => {
    const v = d.initial;
    const elemento = annotazioneDelTipo(tipoSemplice(d.type));
    if (v === undefined) return d.size === undefined ? undefined : `new Array<${elemento}>(${d.size})`;
    if (typeof v === "string") return nelDato(albero(v), d);
    if (Array.isArray(v)) return `[${(v as readonly string[]).map((x) => nelDato(albero(x), d)).join(", ")}]`;
    return `new Array<${elemento}>(${d.size}).fill(${nelDato(albero((v as { readonly each: string }).each), d)})`;
  };

  /** Le dichiarazioni, con la colonna dei commenti allineata sulle righe che ne hanno uno. */
  const dichiara = (elenco: readonly Dato[], prima: string, conNota: boolean): Riga[] => {
    const voci = elenco.map((d) => {
      const v = valoreIniziale(d);
      const parola = d.constant === true || prima === "" ? "const" : "let";
      const nota = !conNota ? "" : d.constant === true ? note.costante : d.role !== undefined ? note.ruoli[d.role] : "";
      return { d, testo: `${prima}${parola} ${d.name}${v === undefined ? "!" : ""}: ${annotazione(d)}${v === undefined ? "" : ` = ${v}`};`, nota };
    });
    const larghezza = (t: string) => Array.from(t).length;
    const colonna = Math.max(0, ...voci.filter((x) => x.nota !== "").map((x) => larghezza(x.testo)));
    return voci.map(({ d, testo, nota }) => ({ testo: nota === "" ? testo : `${testo}${" ".repeat(colonna - larghezza(testo))}  // ${nota}`, dato: d.name }));
  };

  // --------------------------------------------------------------------------------------------- le regole

  const corpo: Riga[] = [];
  const struttura = (testo: string) => corpo.push({ testo });

  /** Una destinazione e il valore che riceve: un dato, o l'elemento di un vettore (JavaScript calcola l'indice prima del
   * valore, come il flowchart). */
  function assegna(r: string, id: string, bersaglio: string, valore: (d: Dato) => string) {
    const e = albero(bersaglio);
    if (e.genere === "nome") {
      corpo.push({ testo: `${r}${e.nome} = ${valore(dati.get(e.nome)!)};`, blocco: id });
      return;
    }
    const x = e as Extract<Espressione, { genere: "indice" }>;
    const nome = (x.base as { nome: string }).nome;
    const posto = `${nome}[${espressione(x.indice).t}]`;
    corpo.push({ testo: `${r}${posto} = ${valore(dati.get(nome)!)};`, blocco: id });
  }

  const leggi = (d: Dato): string => {
    switch (tipoSemplice(d.type)) {
      case "integer":
        return `${usa("leggiIntero")}()`;
      case "real":
        return `${usa("leggiReale")}()`;
      case "character":
        return `${usa("leggiCarattere")}()`;
      case "string":
        return `${usa("leggiStringa")}(${d.max_length ?? lunghezzaPredefinita})`;
      case "boolean":
        return `${usa("leggiBooleano")}()`;
    }
  };

  /** Un valore di una scrittura dentro il testo composto: un letterale stringa o carattere coi suoi caratteri, un reale da
   * `reale`, un booleano da `booleano`, ogni altro valore com'è. */
  function nellaScrittura(v: string): string {
    const e = albero(v);
    if (e.genere === "stringa") return e.codici.map(nelTesto).join("");
    if (e.genere === "carattere") return nelTesto(e.codice);
    const x = espressione(e).t;
    const t = tipo(e);
    return t === "real" ? `\${${usa("reale")}(${x})}` : t === "boolean" ? `\${${usa("booleano")}(${x})}` : `\${${x}}`;
  }

  function blocco(b: Blocco, livello: number) {
    const r = rientro.repeat(livello);
    const riga = (testo: string) => corpo.push({ testo: r + testo, blocco: b.id });
    switch (b.kind) {
      case "assignment": {
        const v = albero(b.value);
        if (v.genere === "unario" && v.operatore === "to_array")
          return assegna(r, b.id, b.target, (d) => conArresto("convertiAVettore", espressione(v.operando).t, String(d.size)).t);
        if (v.genere === "unario" && v.operatore === "to_string")
          return assegna(r, b.id, b.target, (d) => {
            const s = conArresto("convertiAStringa", espressione(v.operando).t).t;
            const massima = d.max_length ?? lunghezzaPredefinita;
            return dati.get((v.operando as { nome: string }).nome)!.size! > massima ? conArresto("alPiu", s, String(massima)).t : s;
          });
        return assegna(r, b.id, b.target, (d) => nelDato(v, d));
      }
      case "read":
        return assegna(r, b.id, b.target, leggi);
      case "write": {
        // Un valore che può fermare il programma comincia una scrittura nuova: quelli prima restano scritti, come
        // nell'interprete, che scrive un valore alla volta (il testo composto calcola tutti i valori prima di scrivere).
        const gruppi: string[][] = [[]];
        for (const v of b.values) {
          ferma = false;
          const x = nellaScrittura(v);
          if (ferma && gruppi.at(-1)!.length > 0) gruppi.push([]);
          gruppi.at(-1)!.push(x);
        }
        gruppi.forEach((valori, k) => riga(`${usa("scrivi")}(\`${valori.join("")}${b.newline && k === gruppi.length - 1 ? "\\n" : ""}\`);`));
        return;
      }
      case "if":
        riga(`if (${espressione(albero(b.condition)).t}) {`);
        b.then.forEach((x) => blocco(x, livello + 1));
        if (b.else.length > 0) {
          struttura(`${r}} else {`);
          b.else.forEach((x) => blocco(x, livello + 1));
        }
        struttura(`${r}}`);
        return;
      case "while":
        riga(`while (${espressione(albero(b.condition)).t}) {`);
        b.body.forEach((x) => blocco(x, livello + 1));
        struttura(`${r}}`);
        return;
      case "repeat":
        struttura(`${r}do {`);
        b.body.forEach((x) => blocco(x, livello + 1));
        riga(`} while (${espressione(albero(b.condition)).t});`);
        return;
      case "comment":
        for (const t of b.text.split(aCapo)) riga(t === "" ? "//" : `// ${t}`);
        return;
      default:
        throw new Error(`blocco fuori dalla tappa 1: ${b.kind}`);
    }
  }

  const dichiarazioni = dichiara(main.data, rientro, true);
  for (const b of main.body) blocco(b, 1);
  const principale = segnate([{ testo: "function main(): void {" }, ...dichiarazioni, ...corpo, { testo: "}" }], main.id);
  const costanti = dichiara(comuni, "", false);

  // --------------------------------------------------------------------------------------- l'insieme

  // Le funzioni usate, con quelle che chiamano.
  for (let cresce = true; cresce; ) {
    cresce = false;
    for (const f of [...usate])
      for (const g of chiama[f] ?? [])
        if (!usate.has(g)) {
          usate.add(g);
          cresce = true;
        }
  }
  const letti = [...(usate.has("leggiRiga") ? ["readSync"] : []), ...(usate.has("scrivi") || usate.has("fermati") ? ["writeSync"] : [])];
  const nome = p.metadata.name.split(aCapo).join(" ");
  const righe: Riga[] = [
    { testo: `// ${nome}` },
    { testo: `// ${w.generato}` },
    ...w.nonControllati.map((t) => ({ testo: `// ${t}` })),
    ...(letti.length > 0 ? [{ testo: `import { ${letti.join(", ")} } from "node:fs";` }] : []),
  ];
  if (costanti.length > 0) righe.push({ testo: "" }, { testo: `// ${w.costantiComuni}` }, ...costanti);
  righe.push({ testo: "" }, { testo: "" }, ...principale);
  const funzioni = supportoInOrdine.filter((f) => usate.has(f));
  if (funzioni.length > 0) {
    righe.push({ testo: "" }, { testo: "" }, { testo: `// ${w.supporto}` });
    for (const f of funzioni) righe.push({ testo: "" }, { testo: "" }, ...funzione(f, lingua, nomi, decimali, riempimento, tetto).map((testo) => ({ testo })));
  }
  righe.push({ testo: "" }, { testo: "" }, { testo: "main();" });
  return righe;
}

// -------------------------------------------------------------------------------- le funzioni di supporto

/** Le spiegazioni delle funzioni di supporto (il commento `/** … *\/` di ognuna), per lingua. */
const spiegazioni: Readonly<Record<LinguaDelCodice, Readonly<Record<Exclude<Supporto, "reale" | "convertiAVettore">, string>>>> = {
  it: {
    fermati: "Scrive il motivo e la riga del programma che lo ha incontrato, poi si ferma.",
    leggiRiga: "Una riga dell'input, senza il suo a capo; si ferma se l'input è finito o non è testo UTF-8.",
    leggiIntero: "Una riga con un intero a 32 bit: spazi, segno, cifre e spazi, come la lettura del flowchart.",
    leggiReale: "Una riga con un reale finito, scritto come nel flowchart (2.5, -3, 1.5e3), con spazi intorno.",
    leggiCarattere: "Una riga con esattamente un carattere.",
    leggiStringa: "Una riga con al più n caratteri, senza il carattere di codice 0.",
    leggiBooleano: "Una riga con true o false.",
    dividi: "La divisione fra interi del C: il quoziente troncato verso lo zero.",
    convertiAReale: "Un intero che diventa reale: lo zero intero non ha segno, come nel C.",
    elevatoA: "La potenza: con un esponente intero fino a 1100 è esatta, arrotondata una volta.",
    arrotonda: "La metà lontano dallo zero, come round del C (Math.round la porta verso più infinito).",
    convertiACarattere: "Il carattere con quel codice Unicode; si ferma se il codice non è valido.",
    convertiAStringa: "Tutti gli elementi del vettore, in ordine; un carattere di codice 0 non entra in una stringa.",
    carattereDi: "Il carattere in posizione i della stringa, da 0; si ferma se la posizione è fuori.",
    lunghezza: "Quanti caratteri ha la stringa (length di JavaScript conta le unità UTF-16).",
    confronta: "Due testi confrontati per codici dei caratteri, come nel C: negativo, zero o positivo (il < di JavaScript confronta le unità UTF-16).",
    nellaStringa: "Un carattere che entra in una stringa: quello di codice 0 non può.",
    concatenazione: "Due testi già calcolati, uno dopo l'altro: un carattere di codice 0 non entra in una stringa.",
    alPiu: "La stringa, se non ha più di n caratteri; altrimenti si ferma.",
    booleano: "Un booleano come lo scrive il flowchart: true o false.",
    scrivi: "Scrive il testo sullo standard output.",
  },
  en: {
    fermati: "Writes the reason and the line of the program that met it, then stops.",
    leggiRiga: "A line of the input, without its line break; stops if the input is exhausted or is not UTF-8 text.",
    leggiIntero: "A line with a 32-bit integer: spaces, sign, digits and spaces, as the flowchart reads it.",
    leggiReale: "A line with a finite real, written as in the flowchart (2.5, -3, 1.5e3), with spaces around.",
    leggiCarattere: "A line with exactly one character.",
    leggiStringa: "A line with at most n characters, without the character with code 0.",
    leggiBooleano: "A line with true or false.",
    dividi: "Integer division as in C: the quotient truncated towards zero.",
    convertiAReale: "An integer that becomes a real: the integer zero has no sign, as in C.",
    elevatoA: "The power: with an integer exponent up to 1100 it is exact, rounded once.",
    arrotonda: "Halves away from zero, like round in C (Math.round takes them towards plus infinity).",
    convertiACarattere: "The character with that Unicode code; stops if the code is not valid.",
    convertiAStringa: "All the elements of the array, in order; the character with code 0 cannot enter a string.",
    carattereDi: "The character at position i of the string, from 0; stops if the position is outside.",
    lunghezza: "How many characters the string has (the length of JavaScript counts UTF-16 units).",
    confronta: "Two texts compared by the codes of their characters, as in C: negative, zero or positive (the < of JavaScript compares UTF-16 units).",
    nellaStringa: "A character entering a string: the one with code 0 cannot.",
    concatenazione: "Two texts already calculated, one after the other: the character with code 0 cannot enter a string.",
    alPiu: "The string, if it has at most n characters; otherwise stops.",
    booleano: "A boolean as the flowchart writes it: true or false.",
    scrivi: "Writes the text to the standard output.",
  },
};

/** I nomi interni delle funzioni di supporto e i loro commenti, per lingua. */
const interni = {
  it: {
    motivo: "motivo", riga: "riga", chiamata: "chiamata", trovata: "trovata", errore: "Errore alla riga", letti: "letti",
    cifre: "cifre", testo: "testo", bit: "bit", alto: "alto", esponente: "esponente", numeratore: "numeratore",
    denominatore: "denominatore", resto: "resto", bitDi: "bit_di", dueAlla: "due_alla", arrotondato: "arrotondato",
    ultimo: "ultimo", meta: "meta",
    nonBloccante: "Un input non bloccante senza dati si riprova; la fine di un tubo di Windows è la fine dell'input.",
    quantiBit: "Quanti bit ha l'intero.",
    dueAllaE: "2^e, per e fra -1074 e 1023, costruito dai bit.",
    piuVicino: "Il reale più vicino a num / den · 2^p, la metà alla pari; Infinity oltre il massimo.",
    ilValore: "Il valore è (q0 + resto) · 2^(p - s); l'ultimo bit tenuto: 53 di mantissa, mai sotto 2^-1074.",
    esatta: "|x| = m · 2^e con m intero dispari, dai bit del numero: la potenza m^k · 2^(e·k) è esatta.",
    daiBit: "|x| = mantissa · 2^e, dai bit del numero.",
  },
  en: {
    motivo: "reason", riga: "line", chiamata: "call", trovata: "found", errore: "Error at line", letti: "bytes",
    cifre: "digits", testo: "text", bit: "bits", alto: "high", esponente: "exponent", numeratore: "numerator",
    denominatore: "denominator", resto: "rest", bitDi: "bit_count", dueAlla: "two_to", arrotondato: "rounded",
    ultimo: "last", meta: "half",
    nonBloccante: "A non-blocking input without data is retried; the end of a Windows pipe is the end of the input.",
    quantiBit: "How many bits the integer has.",
    dueAllaE: "2^e, for e between -1074 and 1023, built from the bits.",
    piuVicino: "The real nearest to num / den · 2^p, halves to even; Infinity beyond the maximum.",
    ilValore: "The value is (q0 + rest) · 2^(p - s); the last bit kept: 53 of mantissa, never below 2^-1074.",
    esatta: "|x| = m · 2^e with m an odd integer, from the bits of the number: the power m^k · 2^(e·k) is exact.",
    daiBit: "|x| = mantissa · 2^e, from the bits of the number.",
  },
} as const;

/** Il testo di una funzione di supporto: la spiegazione, la firma, il corpo. */
function funzione(f: Supporto, lingua: LinguaDelCodice, n: Readonly<Record<Supporto, string>>, decimali: number, riempimento: number, tetto: number): string[] {
  const k = interni[lingua];
  const m = motiviCol(tetto)[lingua];
  const ferma = (motivo: string) => `${n.fermati}("${motivo}")`;
  const s = (x: Exclude<Supporto, "reale" | "convertiAVettore">) => `/** ${spiegazioni[lingua][x]} */`;
  /** Una lettura: la riga, la condizione che la rifiuta, il valore. */
  const lettura = (x: "leggiIntero" | "leggiReale" | "leggiCarattere" | "leggiStringa" | "leggiBooleano", firma: string, rifiuta: string, valore: string) => [
    s(x),
    `function ${n[x]}(${firma} {`,
    `  const ${k.riga} = ${n.leggiRiga}();`,
    `  if (${rifiuta}) ${ferma(m.invalid_input)};`,
    `  return ${valore};`,
    "}",
  ];
  switch (f) {
    case "fermati":
      return [
        s(f),
        `function ${n.fermati}(${k.motivo}: string): never {`,
        `  let ${k.riga} = "?";`,
        `  for (const ${k.chiamata} of (new Error().stack ?? "").split("\\n")) {`,
        `    const ${k.trovata} = /^\\s*at main \\(.*:(\\d+):\\d+\\)$/.exec(${k.chiamata});`,
        `    if (${k.trovata} !== null) {`,
        `      ${k.riga} = ${k.trovata}[1];`,
        "      break;",
        "    }",
        "  }",
        `  writeSync(2, \`${k.errore} \${${k.riga}}: \${${k.motivo}}\\n\`);`,
        "  process.exit(1);",
        "}",
      ];
    case "leggiRiga":
      return [
        s(f),
        `function ${n.leggiRiga}(): string {`,
        "  const byte = new Uint8Array(1);",
        `  const ${k.letti}: number[] = [];`,
        "  for (;;) {",
        "    let n = 0;",
        "    try {",
        "      n = readSync(0, byte, 0, 1, null);",
        "    } catch (e) {",
        `      // ${k.nonBloccante}`,
        '      if ((e as { code?: string }).code === "EAGAIN") continue;',
        '      if ((e as { code?: string }).code !== "EOF") throw e;',
        "    }",
        "    if (n === 0) break;",
        `    ${k.letti}.push(byte[0]);`,
        "    if (byte[0] === 10) break;",
        "  }",
        `  if (${k.letti}.length === 0) ${ferma(m.input_exhausted)};`,
        `  if (${k.letti}.at(-1) === 10) {`,
        `    ${k.letti}.pop();`,
        `    if (${k.letti}.at(-1) === 13) ${k.letti}.pop();`,
        "  }",
        "  try {",
        `    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(new Uint8Array(${k.letti}));`,
        "  } catch {",
        `    ${ferma(m.invalid_input)};`,
        "  }",
        "}",
      ];
    case "leggiIntero": {
      const c = k.cifre;
      const valore = `Number(${c}[1] + ${c}[2])`;
      return [
        s(f),
        `function ${n.leggiIntero}(): number {`,
        `  const ${k.riga} = ${n.leggiRiga}();`,
        `  const ${c} = /^ *([+-]?)0*([0-9]{1,10}) *$/.exec(${k.riga});`,
        `  if (${c} === null || !(-2147483648 <= ${valore} && ${valore} <= 2147483647)) ${ferma(m.invalid_input)};`,
        `  return ${valore};`,
        "}",
      ];
    }
    case "leggiReale":
      return lettura(f, "): number", `!/^ *[+-]?[0-9]{1,}(\\.[0-9]+([eE][+-]?[0-9]+)?)? *$/.test(${k.riga}) || !Number.isFinite(Number(${k.riga}))`, `Number(${k.riga})`);
    case "leggiCarattere":
      return lettura(f, "): string", `${n.lunghezza}(${k.riga}) !== 1`, k.riga);
    case "leggiStringa":
      return lettura(f, "n: number): string", `${n.lunghezza}(${k.riga}) > n || ${k.riga}.includes("\\0")`, k.riga);
    case "leggiBooleano":
      return lettura(f, "): boolean", `${k.riga} !== "true" && ${k.riga} !== "false"`, `${k.riga} === "true"`);
    case "dividi":
      return [s(f), `function ${n.dividi}(a: number, b: number): number {`, "  return Math.trunc(a / b);", "}"];
    case "convertiAReale":
      return [s(f), `function ${n.convertiAReale}(n: number): number {`, "  return n + 0;", "}"];
    case "elevatoA":
      return [
        s(f),
        `function ${n.elevatoA}(x: number, y: number): number {`,
        `  /** ${k.quantiBit} */`,
        `  function ${k.bitDi}(b: bigint): number {`,
        "    return b.toString(2).length;",
        "  }",
        "",
        `  /** ${k.dueAllaE} */`,
        `  function ${k.dueAlla}(e: number): number {`,
        "    const b = new DataView(new ArrayBuffer(8));",
        "    if (e >= -1022) b.setInt32(0, (e + 1023) << 20);",
        "    else if (e + 1074 >= 32) b.setInt32(0, 1 << (e + 1042));",
        "    else b.setUint32(4, (1 << (e + 1074)) >>> 0);",
        "    return b.getFloat64(0);",
        "  }",
        "",
        `  /** ${k.piuVicino} */`,
        `  function ${k.arrotondato}(num: bigint, den: bigint, p: number): number {`,
        `    const s = 55 - (${k.bitDi}(num) - ${k.bitDi}(den));`,
        "    const n = s >= 0 ? num << BigInt(s) : num;",
        "    const d = s >= 0 ? den : den << BigInt(-s);",
        "    const q0 = n / d;",
        `    // ${k.ilValore}`,
        `    let ${k.ultimo} = Math.max(p - s + ${k.bitDi}(q0) - 53, -1074);`,
        `    const t = BigInt(${k.ultimo} - (p - s));`,
        "    let q = q0 >> t;",
        `    const ${k.resto} = q0 & ((1n << t) - 1n);`,
        `    const ${k.meta} = 1n << (t - 1n);`,
        `    if (${k.resto} > ${k.meta} || (${k.resto} === ${k.meta} && (n % d !== 0n || (q & 1n) === 1n))) q += 1n;`,
        "    if (q === 0n) return 0;",
        `    if (${k.bitDi}(q) > 53) {`,
        "      q >>= 1n;",
        `      ${k.ultimo}++;`,
        "    }",
        `    if (${k.ultimo} + ${k.bitDi}(q) - 1 > 1023) return Infinity;`,
        `    return Number(q) * ${k.dueAlla}(${k.ultimo});`,
        "  }",
        "",
        "  if (!(Number.isFinite(x) && x !== 0 && Number.isInteger(y) && Math.abs(y) <= 1100)) return Math.pow(x, y);",
        `  // ${k.esatta}`,
        `  const ${k.bit} = new DataView(new ArrayBuffer(8));`,
        `  ${k.bit}.setFloat64(0, Math.abs(x));`,
        `  const ${k.alto} = ${k.bit}.getUint32(0);`,
        `  let m = (BigInt(${k.alto} & 0xfffff) << 32n) | BigInt(${k.bit}.getUint32(4)) | (${k.alto} >>> 20 > 0 ? 1n << 52n : 0n);`,
        `  let e = Math.max(${k.alto} >>> 20, 1) - 1075;`,
        "  while ((m & 1n) === 0n) {",
        "    m >>= 1n;",
        "    e++;",
        "  }",
        "  const k = Math.abs(y);",
        "  const mk = m ** BigInt(k);",
        `  const v = y >= 0 ? ${k.arrotondato}(mk, 1n, e * k) : ${k.arrotondato}(1n, mk, -e * k);`,
        "  return x < 0 && k % 2 === 1 ? -v : v;",
        "}",
      ];
    case "arrotonda":
      return [s(f), `function ${n.arrotonda}(x: number): number {`, "  const t = Math.trunc(x);", "  return Math.abs(x - t) >= 0.5 ? t + (x < 0 ? -1 : 1) : t;", "}"];
    case "convertiACarattere":
      return [
        s(f),
        `function ${n.convertiACarattere}(n: number): string {`,
        `  if (!(0 <= n && n <= 0x10FFFF) || (0xD800 <= n && n <= 0xDFFF)) ${ferma(m.invalid_character_code)};`,
        "  return String.fromCodePoint(n);",
        "}",
      ];
    case "convertiAVettore": {
      const spazio = riempimento === 0x20;
      const spiegazione = {
        it: `I caratteri della stringa, poi ${spazio ? "lo spazio" : "il carattere"} di riempimento fino a n elementi.`,
        en: `The characters of the string, then the padding ${spazio ? "space" : "character"} up to n elements.`,
      }[lingua];
      return [
        `/** ${spiegazione} */`,
        `function ${n.convertiAVettore}(s: string, n: number): string[] {`,
        "  const c = Array.from(s);",
        `  if (c.length > n) ${ferma(m.string_longer_than_array)};`,
        `  return c.concat(new Array<string>(n - c.length).fill(${letteraleStringa([riempimento])}));`,
        "}",
      ];
    }
    case "convertiAStringa":
      return [s(f), `function ${n.convertiAStringa}(v: string[]): string {`, `  if (v.includes("\\0")) ${ferma(m.null_character_in_string)};`, '  return v.join("");', "}"];
    case "carattereDi":
      return [
        s(f),
        `function ${n.carattereDi}(s: string, i: number): string {`,
        "  const c = Array.from(s);",
        `  if (!(0 <= i && i < c.length)) ${ferma(m.index_out_of_range)};`,
        "  return c[i];",
        "}",
      ];
    case "lunghezza":
      return [s(f), `function ${n.lunghezza}(s: string): number {`, "  return Array.from(s).length;", "}"];
    case "confronta":
      return [
        s(f),
        `function ${n.confronta}(a: string, b: string): number {`,
        "  const x = Array.from(a);",
        "  const y = Array.from(b);",
        "  for (let i = 0; i < x.length && i < y.length; i++) {",
        "    if (x[i] !== y[i]) return x[i].codePointAt(0)! - y[i].codePointAt(0)!;",
        "  }",
        "  return x.length - y.length;",
        "}",
      ];
    case "nellaStringa":
      return [s(f), `function ${n.nellaStringa}(c: string): string {`, `  if (c === "\\0") ${ferma(m.null_character_in_string)};`, "  return c;", "}"];
    case "concatenazione":
      return [s(f), `function ${n.concatenazione}(a: string, b: string): string {`, `  if (a === "\\0" || b === "\\0") ${ferma(m.null_character_in_string)};`, "  return a + b;", "}"];
    case "alPiu":
      return [s(f), `function ${n.alPiu}(s: string, n: number): string {`, `  if (${n.lunghezza}(s) > n) ${ferma(m.string_too_long)};`, "  return s;", "}"];
    case "reale": {
      const scala = `1${"0".repeat(decimali)}n`;
      const cifre = k.cifre;
      const segno = `\${${k.alto} >>> 31 === 1 ? "-" : ""}`;
      return [
        `/** ${{ it: `Un reale con ${decimali} decimali, come nel C: sul valore esatto del numero, la metà alla cifra pari.`, en: `A real with ${decimali} decimals, as in C: on the exact value of the number, halves to the even digit.` }[lingua]} */`,
        `function ${n.reale}(x: number): string {`,
        `  // ${k.daiBit}`,
        `  const ${k.bit} = new DataView(new ArrayBuffer(8));`,
        `  ${k.bit}.setFloat64(0, x);`,
        `  const ${k.alto} = ${k.bit}.getUint32(0);`,
        `  const ${k.esponente} = (${k.alto} >>> 20) & 0x7ff;`,
        `  const mantissa = (BigInt(${k.alto} & 0xfffff) << 32n) | BigInt(${k.bit}.getUint32(4)) | (${k.esponente} > 0 ? 1n << 52n : 0n);`,
        `  const e = Math.max(${k.esponente}, 1) - 1075;`,
        "  let q: bigint;",
        "  if (e >= 0) {",
        `    q = (mantissa << BigInt(e)) * ${scala};`,
        "  } else {",
        `    const ${k.numeratore} = mantissa * ${scala};`,
        `    const ${k.denominatore} = 1n << BigInt(-e);`,
        `    q = ${k.numeratore} / ${k.denominatore};`,
        `    const ${k.resto} = 2n * (${k.numeratore} % ${k.denominatore});`,
        `    if (${k.resto} > ${k.denominatore} || (${k.resto} === ${k.denominatore} && q % 2n === 1n)) q += 1n;`,
        "  }",
        `  const ${cifre} = q.toString().padStart(${decimali + 1}, "0");`,
        decimali === 0 ? `  return \`${segno}\${${cifre}}\`;` : `  return \`${segno}\${${cifre}.slice(0, -${decimali})}.\${${cifre}.slice(-${decimali})}\`;`,
        "}",
      ];
    }
    case "booleano":
      return [s(f), `function ${n.booleano}(b: boolean): string {`, '  return b ? "true" : "false";', "}"];
    case "scrivi":
      return [s(f), `function ${n.scrivi}(${k.testo}: string): void {`, `  writeSync(1, ${k.testo});`, "}"];
  }
}
