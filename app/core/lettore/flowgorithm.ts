// Il lettore dei file di Flowgorithm (`.fprg`): dal testo del file il progetto di AlgoDesign che calcola lo stesso output,
// o il messaggio che dice perché il file si ferma. Ogni scelta di traduzione viene da un comportamento misurato su
// Flowgorithm 4.5 con programmi di prova scritti da noi (il corpus `casi-flowgorithm/` ne è la parte che resta):
// - il file si legge col lettore XML del nucleo (`xml.ts`); la radice è `<flowgorithm>`, con `<attributes>` e le
//   `<function>`; un elemento che non è di Flowgorithm ferma il file (Flowgorithm lo ignorerebbe in silenzio: misurato);
// - le espressioni si leggono con le precedenze di Flowgorithm (dall'alta: il meno, `!`, `not` e `¬`; `^` da sinistra;
//   `* / % mod × ÷`; `+ -`; `&`; i confronti, tutti su un livello; `and`; `or`) e si scrivono con quelle di AlgoDesign,
//   con le tonde che l'albero chiede (mai copiate dal testo): `-2^2` (4 in Flowgorithm) diventa `(-2) raised_to 2`;
// - i tipi di ogni espressione decidono le conversioni: `/` fra due interi è reale (`to_real a / b`); un reale dato a un
//   intero tronca verso lo zero (`to_integer (…)`); `&` fra testi è `+`, in una scrittura separa i valori, con un numero
//   altrove ferma il file; `Char(s, i)` è un carattere (`s[i]`): confrontato con un testo di un carattere lo confronta
//   con quel carattere, dato a una stringa diventa `"" + s[i]`;
// - le dichiarazioni (misurato: un dato vive dal suo «Dichiara» alla fine del blocco) vanno nei dati della funzione:
//   lo stesso nome con lo stesso tipo e la stessa dimensione è un dato solo; un tipo o una dimensione diversi fermano il
//   file, salvo la rinomina, che dà il primo nome libero `_2`; un nome già visibile dichiarato di nuovo ferma sempre;
// - i nomi non distinguono le maiuscole (misurato): ogni uso prende la forma della dichiarazione;
// - il «per» con un passo scritto e il contatore che il corpo non assegna è un «per»; altrimenti il «mentre»
//   equivalente (Flowgorithm ammette l'uno e l'altro: misurato);
// - un vettore passato a una procedura è per riferimento (misurato), per uscita se la procedura lo scrive e non lo legge
//   (il riferimento vorrebbe un valore); a una funzione per valore, e una funzione che lo cambia, legge o scrive ferma il
//   file (in AlgoDesign lo fa solo una procedura); la dimensione di un vettore ricevuto è quella degli argomenti;
// - `created`, `edited` e `saved` non passano (contengono utente e computer: misurato); `name`, `authors`, `about` sì.
// Il progetto che esce passa il controllo statico, o il file si ferma col primo errore (`progetto_con_errori`).
//
// Che cosa NON guarda: la lettura (`input`: le forme che Flowgorithm accetta non sono misurate); la profondità della
// ricorsione; un passo variabile cambiato nel corpo del «per» (il «mentre» lo rilegge a ogni giro); gli interi oltre
// 2 147 483 647 calcolati (Flowgorithm ha 64 bit, AlgoDesign si ferma: una differenza che resta, nella guida).

import { causaDelNome, controlla, tetti } from "../controllo/controllo";
import { analizza, type Espressione, type OperatoreBinario, type OperatoreUnario } from "../espressioni/analizzatore";
import type { Blocco, Dato, Funzione, Modalita, Progetto, Tipo } from "../progetto/modello";
import { leggiXml, type ElementoXml } from "./xml";

// ---------------------------------------------------------------------------------------- ciò che esce

export const codiciDelMessaggio = [
  "file_non_leggibile", "funzione_senza_equivalente", "blocco_senza_equivalente", "unione_con_un_numero", "resto_fra_reali",
  "dimensione_calcolata", "funzione_con_effetto", "intero_troppo_grande", "dichiarazioni_diverse", "dichiarazione_doppia",
  "nome_riservato", "nome_non_valido", "dimensioni_diverse_negli_argomenti", "progetto_con_errori",
] as const;
export type CodiceDelMessaggio = (typeof codiciDelMessaggio)[number];

/** Perché un file si ferma: il codice, i parametri del testo, la riga del file. */
export interface Messaggio {
  readonly codice: CodiceDelMessaggio;
  readonly parametri: Readonly<Record<string, string>>;
  readonly riga: number;
}

export type SpecieDellaTrasformazione = "per-come-mentre" | "dichiarazione-nel-blocco" | "rinomina-dichiarazione" | "rinomina-riservato" | "vettore-per-uscita";
export interface Trasformazione {
  readonly specie: SpecieDellaTrasformazione;
  readonly riga: number;
  readonly nome?: string;
  readonly nuovo?: string;
}

export interface OpzioniDellaConversione {
  /** Una dichiarazione con un altro tipo o un'altra dimensione, o un nome riservato in AlgoDesign, prende il primo nome
   * libero `_2` invece di fermare il file. */
  readonly rinomina?: boolean;
}

export type Conversione =
  | { readonly ok: true; readonly progetto: Progetto; readonly trasformazioni: readonly Trasformazione[] }
  | { readonly ok: false; readonly messaggio: Messaggio };

/** I blocchi di file e della tartaruga, coi nomi degli elementi misurati (Flowgorithm li riconosce), e il nome che il
 * messaggio dà al blocco. */
export const blocchiSenzaEquivalente: Readonly<Record<string, string>> = {
  open: "Apri file", close: "Chiudi file", read: "Leggi dal file", write: "Scrivi nel file",
  forward: "Avanti", turn: "Ruota", clear: "Pulisci", pen: "Penna",
};

/** Le funzioni predefinite di Flowgorithm che AlgoDesign non ha, nella forma della documentazione. */
const funzioniSenzaEquivalente = [
  "Sin", "Cos", "Tan", "Arcsin", "Arccos", "Arctan", "Ln", "Log", "Log10", "Sgn", "Random", "ToString", "ToInteger", "ToReal", "ToFixed", "EOF",
];

/** Il testo di un messaggio, in italiano (la guida ai file di Flowgorithm è in italiano). Per `progetto_con_errori` la frase dell'errore la dà chi chiama, dal catalogo dei messaggi
 * dell'app (`testoDellaSegnalazione` di `i18n/codici.ts`, coi parametri `errore`, `sulRisultato`, `causa`, `segno`): il
 * nucleo non importa i testi dell'interfaccia; senza, resta il codice. */
export function testoDelMessaggio(m: Messaggio, fraseDellErrore?: string): string {
  const p = m.parametri;
  switch (m.codice) {
    case "file_non_leggibile":
      return `Il file non è un file di Flowgorithm che AlgoDesign sa leggere: ${p.dettaglio}.`;
    case "funzione_senza_equivalente":
      return `La funzione «${p.nome}» di Flowgorithm non ha un equivalente in questa versione di AlgoDesign.`;
    case "blocco_senza_equivalente":
      return `Il blocco «${blocchiSenzaEquivalente[p.elemento!] ?? p.elemento}» di Flowgorithm non ha un equivalente in questa versione di AlgoDesign.`;
    case "unione_con_un_numero":
      return "In AlgoDesign un numero non si unisce a un testo fuori da un'operazione di scrittura: scrivi le parti nel blocco Scrivi.";
    case "resto_fra_reali":
      return "In AlgoDesign il resto si calcola solo fra interi.";
    case "dimensione_calcolata":
      return `In AlgoDesign la dimensione di un vettore è un numero scritto, non un calcolo: il vettore «${p.nome}» ha «${p.dimensione}».`;
    case "funzione_con_effetto":
      return `La funzione «${p.nome}» chiede un valore, scrive un testo o cambia un vettore ricevuto: in AlgoDesign lo fa solo una procedura.`;
    case "intero_troppo_grande":
      return `Il numero ${p.numero} è troppo grande per un intero di AlgoDesign.`;
    case "dichiarazioni_diverse":
      return `Il dato «${p.nome}» è dichiarato due volte con un tipo o una dimensione diversi: cambiando il nome il secondo diventa «${p.nuovo}».`;
    case "dichiarazione_doppia":
      return `Il dato «${p.nome}» è dichiarato di nuovo dove il primo è ancora in uso.`;
    case "nome_riservato":
      return `Il nome «${p.nome}» è riservato in AlgoDesign: cambiando il nome diventa «${p.nuovo}».`;
    case "nome_non_valido":
      return `Il nome «${p.nome}» non si può usare in AlgoDesign: un nome ha solo lettere senza accento, cifre e trattino basso e non può iniziare con una cifra o con il trattino basso.`;
    case "dimensioni_diverse_negli_argomenti":
      return `In AlgoDesign un vettore ricevuto ha una dimensione sola: la procedura o funzione «${p.nome}» lo riceve con dimensioni diverse, o non è mai chiamata.`;
    case "progetto_con_errori":
      return `Il programma convertito ha un errore che AlgoDesign segnala: «${fraseDellErrore ?? p.errore}» (blocco ${p.blocco}).`;
  }
}

class Fermo {
  constructor(readonly messaggio: Messaggio) {}
}
const ferma = (codice: CodiceDelMessaggio, riga: number, parametri: Record<string, string> = {}): never => {
  throw new Fermo({ codice, parametri, riga });
};

export function leggiFlowgorithm(testo: string, opzioni: OpzioniDellaConversione = {}): Conversione {
  try {
    return converti(testo, opzioni);
  } catch (e) {
    if (e instanceof Fermo) return { ok: false, messaggio: e.messaggio };
    throw e;
  }
}

// ---------------------------------------------------------------------------------------- le espressioni di Flowgorithm

type Nodo =
  | { readonly g: "intero"; readonly testo: string }
  | { readonly g: "reale"; readonly testo: string }
  | { readonly g: "stringa"; readonly testo: string }
  | { readonly g: "booleano"; readonly v: boolean }
  | { readonly g: "pi" }
  | { readonly g: "nome"; readonly nome: string }
  | { readonly g: "indice"; readonly base: Nodo; readonly indice: Nodo }
  | { readonly g: "chiamata"; readonly nome: string; readonly argomenti: readonly Nodo[] }
  | { readonly g: "unario"; readonly op: "-" | "not"; readonly x: Nodo }
  | { readonly g: "binario"; readonly op: string; readonly a: Nodo; readonly b: Nodo };

/** I segni di Flowgorithm (documentazione, «Operators») nella forma unica che usa il lettore. */
const segni: readonly (readonly [string, string])[] = [
  ["==", "="], ["<>", "!="], ["!=", "!="], ["<=", "<="], [">=", ">="], ["&&", "and"], ["||", "or"],
  ["≠", "!="], ["≤", "<="], ["≥", ">="], ["∧", "and"], ["∨", "or"], ["¬", "not"], ["×", "*"], ["÷", "/"], ["↑", "^"],
  ["=", "="], ["<", "<"], [">", ">"], ["!", "not"], ["+", "+"], ["-", "-"], ["*", "*"], ["/", "/"], ["%", "mod"], ["^", "^"],
  ["&", "&"], ["(", "("], [")", ")"], ["[", "["], ["]", "]"], [",", ","],
];
const paroleDiFlowgorithm: Readonly<Record<string, string>> = { and: "and", or: "or", not: "not", mod: "mod" };

type Simbolo = { readonly g: "intero" | "reale" | "stringa" | "nome" | "segno"; readonly v: string } | { readonly g: "fine" };

function simboli(testo: string): Simbolo[] {
  const c = Array.from(testo);
  const fuori: Simbolo[] = [];
  let i = 0;
  while (i < c.length) {
    const x = c[i]!;
    if (/\s/.test(x)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(x)) {
      let j = i;
      while (j < c.length && /[0-9]/.test(c[j]!)) j++;
      let g: "intero" | "reale" = "intero";
      if (c[j] === "." && /[0-9]/.test(c[j + 1] ?? "")) {
        g = "reale";
        j++;
        while (j < c.length && /[0-9]/.test(c[j]!)) j++;
      }
      if (/[A-Za-z_]/.test(c[j] ?? "")) throw new Error(`numero scritto male: ${c.slice(i, j + 1).join("")}`);
      fuori.push({ g, v: c.slice(i, j).join("") });
      i = j;
      continue;
    }
    if (x === '"') {
      const j = c.indexOf('"', i + 1);
      if (j < 0) throw new Error("virgolette non chiuse");
      fuori.push({ g: "stringa", v: c.slice(i + 1, j).join("") });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(x) || x === "π") {
      if (x === "π") {
        fuori.push({ g: "nome", v: "pi" });
        i++;
        continue;
      }
      let j = i;
      while (j < c.length && /\w/.test(c[j]!)) j++;
      const parola = c.slice(i, j).join("");
      const segno = paroleDiFlowgorithm[parola.toLowerCase()];
      fuori.push(segno !== undefined ? { g: "segno", v: segno } : { g: "nome", v: parola });
      i = j;
      continue;
    }
    const s = segni.find(([k]) => c.slice(i, i + Array.from(k).length).join("") === k);
    if (s === undefined) throw new Error(`simbolo sconosciuto: ${x}`);
    fuori.push({ g: "segno", v: s[1] });
    i += Array.from(s[0]).length;
  }
  fuori.push({ g: "fine" });
  return fuori;
}

/** L'albero di un'espressione di Flowgorithm, o un errore (il chiamante lo dice col testo e la riga). */
function leggiEspressione(testo: string): Nodo {
  const s = simboli(testo);
  let i = 0;
  const segno = (v: string) => {
    const t = s[i]!;
    return t.g === "segno" && t.v === v;
  };
  const prendi = (v: string) => (segno(v) ? (i++, true) : false);
  const aspetta = (v: string) => {
    if (!prendi(v)) throw new Error(`atteso «${v}»`);
  };
  const livelli: readonly (readonly string[])[] = [["or"], ["and"], ["=", "!=", "<", "<=", ">", ">="], ["&"], ["+", "-"], ["*", "/", "mod"], ["^"]];
  const binario = (l: number): Nodo => {
    if (l === livelli.length) return unario();
    let a = binario(l + 1);
    for (;;) {
      const op = livelli[l]!.find(segno);
      if (op === undefined) return a;
      i++;
      a = { g: "binario", op, a, b: binario(l + 1) };
    }
  };
  const unario = (): Nodo => {
    if (prendi("-")) return { g: "unario", op: "-", x: unario() };
    if (prendi("not")) return { g: "unario", op: "not", x: unario() };
    return primario();
  };
  const primario = (): Nodo => {
    const t = s[i++]!;
    let n: Nodo;
    if (t.g === "intero") n = { g: "intero", testo: t.v };
    else if (t.g === "reale") n = { g: "reale", testo: t.v };
    else if (t.g === "stringa") n = { g: "stringa", testo: t.v };
    else if (t.g === "nome") {
      const minuscolo = t.v.toLowerCase();
      if (minuscolo === "true" || minuscolo === "false") n = { g: "booleano", v: minuscolo === "true" };
      else if (minuscolo === "pi") n = { g: "pi" };
      else if (prendi("(")) {
        const argomenti: Nodo[] = [];
        if (!prendi(")")) {
          do argomenti.push(binario(0));
          while (prendi(","));
          aspetta(")");
        }
        n = { g: "chiamata", nome: t.v, argomenti };
      } else n = { g: "nome", nome: t.v };
    } else if (t.g === "segno" && t.v === "(") {
      n = binario(0);
      aspetta(")");
    } else throw new Error("manca un operando");
    while (prendi("[")) {
      n = { g: "indice", base: n, indice: binario(0) };
      aspetta("]");
    }
    return n;
  };
  const e = binario(0);
  if (s[i]!.g !== "fine") throw new Error("un simbolo di troppo");
  return e;
}

// ---------------------------------------------------------------------------------------- il testo di AlgoDesign

const livello = (e: Espressione): number => {
  if (e.genere === "unario") return 7;
  if (e.genere !== "binario") return 9;
  const op = e.operatore;
  if (op === "raised_to") return 8;
  return op === "or" ? 1 : op === "and" ? 2 : op === "==" || op === "!=" ? 3 : op === "<" || op === "<=" || op === ">" || op === ">=" ? 4 : op === "+" || op === "-" ? 5 : 6;
};
const fra = (t: string, serve: boolean) => (serve ? `(${t})` : t);
const escapeDi = (k: number, apice: string): string =>
  k === 10 ? "\\n" : k === 9 ? "\\t" : k === 92 ? "\\\\" : String.fromCodePoint(k) === apice ? `\\${apice}` : String.fromCodePoint(k);
const testoDelReale = (v: number): string => (Number.isInteger(v) ? v.toFixed(1) : String(v));

/** Il testo di un'espressione nella sintassi di AlgoDesign, con le tonde delle sue precedenze. */
export function scritta(e: Espressione): string {
  switch (e.genere) {
    case "intero":
      return String(e.valore);
    case "reale":
      return testoDelReale(e.valore);
    case "booleano":
      return String(e.valore);
    case "pi":
      return "pi";
    case "stringa":
      return `"${e.codici.map((k) => escapeDi(k, '"')).join("")}"`;
    case "carattere":
      return `'${escapeDi(e.codice, "'")}'`;
    case "nome":
      return e.nome;
    case "indice":
      return `${fra(scritta(e.base), livello(e.base) < 9)}[${scritta(e.indice)}]`;
    case "campo":
      return `${fra(scritta(e.base), livello(e.base) < 9)}.${e.campo}`;
    case "chiamata":
      return `${e.nome}(${e.argomenti.map(scritta).join(", ")})`;
    case "unario": {
      const x = fra(scritta(e.operando), livello(e.operando) < 7);
      return e.operatore === "-" ? (x.startsWith("-") ? `- ${x}` : `-${x}`) : `${e.operatore} ${x}`;
    }
    case "binario": {
      const l = livello(e);
      if (e.operatore === "raised_to") return `${fra(scritta(e.sinistro), livello(e.sinistro) < 9)} raised_to ${fra(scritta(e.destro), livello(e.destro) < 9)}`;
      // I confronti non vanno in fila: uno dentro l'altro allo stesso livello vuole le tonde anche a sinistra.
      const confronto = l === 3 || l === 4;
      return `${fra(scritta(e.sinistro), confronto ? livello(e.sinistro) <= l : livello(e.sinistro) < l)} ${e.operatore} ${fra(scritta(e.destro), livello(e.destro) <= l)}`;
    }
  }
}

function canonico(x: unknown): string {
  return JSON.stringify(x, (_k, v: unknown) =>
    v !== null && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1))) : v,
  );
}

/** Il testo, riletto dall'analizzatore unico: lo stesso albero, o è un difetto di questo lettore. */
function testoVerificato(e: Espressione): string {
  const t = scritta(e);
  const a = analizza(t);
  if (!a.ok || canonico(a.espressione) !== canonico(e)) throw new Error(`il testo «${t}» non ridà lo stesso albero`);
  return t;
}

// ---------------------------------------------------------------------------------------- i tipi e la traduzione

/** I tipi delle espressioni: quelli di Flowgorithm, più il carattere che `Char` e `ToChar` danno in AlgoDesign. */
type TipoF = "intero" | "reale" | "stringa" | "booleano" | "carattere";
interface Tradotta {
  readonly e: Espressione;
  readonly t: TipoF;
}
const tipoDelDato: Readonly<Record<TipoF, Tipo>> = { intero: "integer", reale: "real", stringa: "string", booleano: "boolean", carattere: "character" };
const tipiDiFlowgorithm: Readonly<Record<string, TipoF>> = { integer: "intero", real: "reale", string: "stringa", boolean: "booleano" };

const unario = (operatore: OperatoreUnario, operando: Espressione): Espressione => ({ genere: "unario", operatore, operando });
const binario = (operatore: OperatoreBinario, sinistro: Espressione, destro: Espressione): Espressione => ({ genere: "binario", operatore, sinistro, destro });
const vuota: Espressione = { genere: "stringa", codici: [] };
const numero = (t: TipoF) => t === "intero" || t === "reale";

/** Un valore dove si attende un tipo: il reale per un intero tronca, il carattere per una stringa si unisce al vuoto. */
function adatta(x: Tradotta, atteso: TipoF): Espressione {
  if (atteso === "intero" && x.t === "reale") return unario("to_integer", x.e);
  if (atteso === "stringa" && x.t === "carattere") return binario("+", vuota, x.e);
  return x.e;
}

/** Un dato di una funzione, come lo conosce il lettore. */
interface DatoLetto {
  nome: string;
  tipo: TipoF;
  dimensione?: number;
  parametro?: Modalita;
  riga: number;
}

interface FirmaLetta {
  readonly nome: string;
  readonly tipo: TipoF | undefined;
  readonly parametri: readonly { readonly nome: string; readonly tipo: TipoF; readonly vettore: boolean; readonly riga: number }[];
  readonly elemento: ElementoXml;
  /** `undefined` per il programma principale. */
  readonly principale: boolean;
}

const attributo = (e: ElementoXml, nome: string): string | undefined => e.attributi.get(nome);
const necessario = (e: ElementoXml, nome: string): string => {
  const v = e.attributi.get(nome);
  if (v === undefined) ferma("file_non_leggibile", e.riga, { dettaglio: `all'elemento «<${e.nome}>» della riga ${e.riga} manca l'attributo «${nome}»` });
  return v!;
};
const figlio = (e: ElementoXml, nome: string): ElementoXml | undefined => e.figli.find((f) => f.nome === nome);
/** I figli che Flowgorithm scrive dentro un elemento, ciascuno una volta: un altro, o lo stesso due volte, ferma il file
 * (senza, il lettore lo salterebbe in silenzio). */
const soloFigli = (e: ElementoXml, ammessi: readonly string[]) => {
  const visti = new Set<string>();
  for (const f of e.figli) {
    if (!ammessi.includes(f.nome) || visti.has(f.nome))
      ferma("file_non_leggibile", f.riga, { dettaglio: `l'elemento «<${f.nome}>» della riga ${f.riga} non è di Flowgorithm in quel punto` });
    visti.add(f.nome);
  }
};
/** Un attributo con due valori (in qualunque maiuscola): vero per `si`, falso per `no`, il predefinito se manca; un altro
 * valore ferma il file. */
const sceltaFra = (e: ElementoXml, nome: string, si: string, no: string, predefinito: boolean): boolean => {
  const v = e.attributi.get(nome);
  if (v === undefined) return predefinito;
  if (v.toLowerCase() === si) return true;
  if (v.toLowerCase() === no) return false;
  return ferma("file_non_leggibile", e.riga, { dettaglio: `l'attributo «${nome}» dell'elemento «<${e.nome}>» della riga ${e.riga} vale «${v}»` });
};

function tipoDiFlowgorithm(testo: string, e: ElementoXml): TipoF {
  const t = tipiDiFlowgorithm[testo.toLowerCase()];
  if (t === undefined) ferma("file_non_leggibile", e.riga, { dettaglio: `il tipo «${testo}» alla riga ${e.riga} non è di Flowgorithm` });
  return t!;
}

function liberoDa(nome: string, usati: ReadonlySet<string>): string {
  for (let k = 2; ; k++) if (!usati.has(`${nome}_${k}`.toLowerCase())) return `${nome}_${k}`;
}

/** Il carattere che la decodifica UTF-8 mette al posto dei byte che non lo sono (un file salvato in un'altra codifica). */
const sostitutivo = String.fromCharCode(0xfffd);

function converti(testo: string, opzioni: OpzioniDellaConversione): Conversione {
  const dove = testo.indexOf(sostitutivo);
  if (dove >= 0) {
    const riga = testo.slice(0, dove).split("\n").length;
    ferma("file_non_leggibile", riga, { dettaglio: `il testo non è scritto in UTF-8 (riga ${riga})` });
  }
  const x = leggiXml(testo);
  if (!x.ok) return ferma("file_non_leggibile", x.riga, { dettaglio: `${x.motivo} (riga ${x.riga})` });
  const radice = x.radice;
  if (radice.nome !== "flowgorithm") ferma("file_non_leggibile", radice.riga, { dettaglio: `la radice è «<${radice.nome}>», non «<flowgorithm>»` });
  const trasformazioni: Trasformazione[] = [];
  const rinomina = opzioni.rinomina === true;

  // Gli attributi del programma: name, authors e about passano; created, edited e saved no (utente e computer).
  const valoriDegliAttributi = new Map<string, string>();
  const firme: FirmaLetta[] = [];
  for (const f of radice.figli) {
    if (f.nome === "attributes") {
      for (const a of f.figli) {
        if (a.nome !== "attribute") ferma("file_non_leggibile", a.riga, { dettaglio: `l'elemento «<${a.nome}>» della riga ${a.riga} non è di Flowgorithm` });
        valoriDegliAttributi.set(necessario(a, "name"), attributo(a, "value") ?? "");
      }
      continue;
    }
    if (f.nome !== "function") ferma("file_non_leggibile", f.riga, { dettaglio: `l'elemento «<${f.nome}>» della riga ${f.riga} non è di Flowgorithm` });
    const nome = necessario(f, "name");
    const tipo = necessario(f, "type");
    soloFigli(f, ["parameters", "body"]);
    const parametri = (figlio(f, "parameters")?.figli ?? []).map((p) => {
      if (p.nome !== "parameter") ferma("file_non_leggibile", p.riga, { dettaglio: `l'elemento «<${p.nome}>» della riga ${p.riga} non è di Flowgorithm` });
      return { nome: necessario(p, "name"), tipo: tipoDiFlowgorithm(necessario(p, "type"), p), vettore: sceltaFra(p, "array", "true", "false", false), riga: p.riga };
    });
    firme.push({ nome, tipo: tipo.toLowerCase() === "none" ? undefined : tipoDiFlowgorithm(tipo, f), parametri, elemento: f, principale: nome.toLowerCase() === "main" });
  }
  const principale = firme.find((f) => f.principale);
  if (principale === undefined) ferma("file_non_leggibile", radice.riga, { dettaglio: "il file non ha il programma principale («Main»)" });
  const secondo = firme.filter((f) => f.principale)[1];
  if (secondo !== undefined) ferma("file_non_leggibile", secondo.elemento.riga, { dettaglio: `il file ha un secondo programma principale («Main») alla riga ${secondo.elemento.riga}` });

  // I nomi delle procedure e funzioni, senza le maiuscole; un nome riservato si rinomina a richiesta.
  const usatiDovunque = new Set<string>(firme.map((f) => f.nome.toLowerCase()));
  const nomeDiFunzione = new Map<string, string>();
  for (const f of firme) {
    if (f.principale) continue;
    nomeDiFunzione.set(f.nome.toLowerCase(), nomeValido(f.nome, true, f.elemento.riga, usatiDovunque));
  }
  const firmaDi = (n: string) => firme.find((f) => !f.principale && f.nome.toLowerCase() === n.toLowerCase());

  function nomeValido(n: string, nelFile: boolean, riga: number, usati: Set<string>): string {
    const causa = causaDelNome(n, nelFile);
    if (causa === undefined) return n;
    if (causa.causa !== "nome_riservato" && causa.causa !== "nome_della_libreria") return ferma("nome_non_valido", riga, { nome: n });
    const nuovo = liberoDa(n, usati);
    if (!rinomina) ferma("nome_riservato", riga, { nome: n, nuovo });
    usati.add(nuovo.toLowerCase());
    trasformazioni.push({ specie: "rinomina-riservato", riga, nome: n, nuovo });
    return nuovo;
  }

  // Le dimensioni dei vettori ricevuti: quelle degli argomenti, fino al punto fisso (un vettore ricevuto passato a sua
  // volta prende la dimensione quando la sua è nota).
  const dimensioniDeiParametri = dimensioniDegliArgomenti(firme, firmaDi);

  // Le funzioni, nell'ordine del file: il programma principale per primo.
  let prossimoBlocco = 1;
  const nuovoId = () => `b${prossimoBlocco++}`;
  const funzioni: Funzione[] = [];
  let prossimaFunzione = 1;
  for (const f of [principale!, ...firme.filter((x) => !x.principale)]) funzioni.push(traduciFunzione(f));

  function traduciFunzione(f: FirmaLetta): Funzione {
    const dati: DatoLetto[] = [];
    /** I dati nati dalle dichiarazioni, per il nome di Flowgorithm senza maiuscole. */
    const dichiaratiPerNome = new Map<string, DatoLetto[]>();
    const usati = new Set<string>([...usatiDovunque]);
    const corpo = figlio(f.elemento, "body");
    if (corpo === undefined) ferma("file_non_leggibile", f.elemento.riga, { dettaglio: `la funzione «${f.nome}» della riga ${f.elemento.riga} non ha il corpo` });
    // Gli ambiti: i nomi visibili, dal più esterno; ognuno dal nome minuscolo al dato.
    const ambiti: Map<string, DatoLetto>[] = [new Map()];
    const procedura = !f.principale && f.tipo === undefined;
    const funzioneConValore = !f.principale && f.tipo !== undefined;
    f.parametri.forEach((p, k) => {
      const n = nomeValido(p.nome, false, p.riga, usati);
      usati.add(n.toLowerCase());
      // Per uscita solo se lo riempie tutto: scritto in una parte, il vettore di chi chiama perderebbe gli altri valori.
      const scrittoENonLetto = p.vettore && procedura && !leggeIlParametro(corpo!, p.nome) && loRiempieTutto(corpo!, p.nome);
      const d: DatoLetto = { nome: n, tipo: p.tipo, parametro: p.vettore && procedura ? (scrittoENonLetto ? "out" : "reference") : "value", riga: p.riga };
      if (p.vettore) d.dimensione = dimensioniDeiParametri.get(`${f.nome.toLowerCase()}#${k}`) ?? ferma("dimensioni_diverse_negli_argomenti", f.elemento.riga, { nome: f.nome });
      if (scrittoENonLetto) trasformazioni.push({ specie: "vettore-per-uscita", riga: p.riga, nome: n });
      dati.push(d);
      ambiti[0]!.set(p.nome.toLowerCase(), d);
    });
    if (funzioneConValore && haEffetti(corpo!, f.parametri.filter((p) => p.vettore).map((p) => p.nome.toLowerCase()))) ferma("funzione_con_effetto", f.elemento.riga, { nome: f.nome });

    const cerca = (n: string): DatoLetto | undefined => {
      const k = n.toLowerCase();
      for (let a = ambiti.length - 1; a >= 0; a--) {
        const d = ambiti[a]!.get(k);
        if (d !== undefined) return d;
      }
      return dati.find((d) => d.nome.toLowerCase() === k);
    };

    // --- le espressioni
    const espressione = (testoDellEspressione: string, riga: number): Nodo => {
      try {
        return leggiEspressione(testoDellEspressione);
      } catch (e) {
        return ferma("file_non_leggibile", riga, { dettaglio: `l'espressione «${testoDellEspressione}» della riga ${riga} non si legge (${(e as Error).message})` });
      }
    };
    const traduci = (n: Nodo, riga: number): Tradotta => {
      switch (n.g) {
        case "intero": {
          const v = Number(n.testo);
          if (v > 2147483647) ferma("intero_troppo_grande", riga, { numero: n.testo });
          return { e: { genere: "intero", valore: v }, t: "intero" };
        }
        case "reale":
          return { e: { genere: "reale", valore: Number(n.testo) }, t: "reale" };
        case "stringa":
          return { e: { genere: "stringa", codici: Array.from(n.testo).map((c) => c.codePointAt(0)!) }, t: "stringa" };
        case "booleano":
          return { e: { genere: "booleano", valore: n.v }, t: "booleano" };
        case "pi":
          return { e: { genere: "pi" }, t: "reale" };
        case "nome": {
          const d = cerca(n.nome);
          return { e: { genere: "nome", nome: d?.nome ?? n.nome }, t: d?.tipo ?? "intero" };
        }
        case "indice": {
          const b = traduci(n.base, riga);
          return { e: { genere: "indice", base: b.e, indice: adatta(traduci(n.indice, riga), "intero") }, t: b.t };
        }
        case "unario": {
          const x = traduci(n.x, riga);
          return n.op === "-" ? { e: unario("-", x.e), t: x.t } : { e: unario("not", x.e), t: "booleano" };
        }
        case "chiamata":
          return chiamata(n, riga);
        case "binario":
          return binarioTradotto(n, riga);
      }
    };
    const chiamata = (n: Extract<Nodo, { g: "chiamata" }>, riga: number): Tradotta => {
      const k = n.nome.toLowerCase();
      const senza = funzioniSenzaEquivalente.find((x) => x.toLowerCase() === k);
      if (senza !== undefined) ferma("funzione_senza_equivalente", riga, { nome: senza });
      const uno = (): Tradotta => {
        if (n.argomenti.length !== 1) ferma("file_non_leggibile", riga, { dettaglio: `«${n.nome}» alla riga ${riga} vuole un argomento` });
        return traduci(n.argomenti[0]!, riga);
      };
      switch (k) {
        case "abs": {
          const x = uno();
          return { e: unario("absolute_value", x.e), t: x.t };
        }
        case "sqrt":
          return { e: unario("square_root", uno().e), t: "reale" };
        case "int":
          return { e: unario("to_integer", uno().e), t: "intero" };
        case "len": {
          const x = uno();
          return { e: unario("length", adatta(x, "stringa")), t: "intero" };
        }
        case "tochar":
          return { e: unario("to_character", adatta(uno(), "intero")), t: "carattere" };
        case "tocode": {
          const x = uno();
          if (x.t === "carattere") return { e: unario("to_integer", x.e), t: "intero" };
          if (x.e.genere === "stringa" && x.e.codici.length === 1) return { e: unario("to_integer", { genere: "carattere", codice: x.e.codici[0]! }), t: "intero" };
          // Flowgorithm vuole un testo di un carattere (`ToCode("ab")` è un errore: misurato): il suo primo.
          return { e: unario("to_integer", { genere: "indice", base: x.e, indice: { genere: "intero", valore: 0 } }), t: "intero" };
        }
        case "char": {
          if (n.argomenti.length !== 2) ferma("file_non_leggibile", riga, { dettaglio: `«${n.nome}» alla riga ${riga} vuole due argomenti` });
          const s = traduci(n.argomenti[0]!, riga);
          return { e: { genere: "indice", base: adatta(s, "stringa"), indice: adatta(traduci(n.argomenti[1]!, riga), "intero") }, t: "carattere" };
        }
        case "size": {
          const a = n.argomenti[0];
          const d = n.argomenti.length === 1 && a?.g === "nome" ? cerca(a.nome) : undefined;
          if (d?.dimensione === undefined) return ferma("file_non_leggibile", riga, { dettaglio: `«${n.nome}» alla riga ${riga} vuole il nome di un vettore` });
          return { e: { genere: "intero", valore: d.dimensione }, t: "intero" };
        }
      }
      const g = firmaDi(n.nome);
      if (g === undefined) return { e: { genere: "chiamata", nome: n.nome, argomenti: n.argomenti.map((a) => traduci(a, riga).e) }, t: "intero" };
      return { e: { genere: "chiamata", nome: nomeDiFunzione.get(k)!, argomenti: argomenti(g, n.argomenti, riga) }, t: g.tipo ?? "intero" };
    };
    const argomenti = (g: FirmaLetta, args: readonly Nodo[], riga: number): Espressione[] =>
      args.map((a, i) => {
        const p = g.parametri[i];
        const x = traduci(a, riga);
        return p === undefined || p.vettore ? x.e : adatta(x, p.tipo);
      });
    const binarioTradotto = (n: Extract<Nodo, { g: "binario" }>, riga: number): Tradotta => {
      if (n.op === "&") {
        const parti = partiDellUnione(n).map((p) => traduci(p, riga));
        if (parti.some((p) => p.t !== "stringa" && p.t !== "carattere")) ferma("unione_con_un_numero", riga);
        let e = parti[0]!.t === "carattere" ? binario("+", vuota, parti[0]!.e) : parti[0]!.e;
        for (const p of parti.slice(1)) e = binario("+", e, p.e);
        return { e, t: "stringa" };
      }
      const a = traduci(n.a, riga);
      const b = traduci(n.b, riga);
      switch (n.op) {
        case "+":
        case "-":
        case "*":
          return { e: binario(n.op, a.e, b.e), t: a.t === "intero" && b.t === "intero" ? "intero" : "reale" };
        case "/":
          // Sempre reale in Flowgorithm (misurato: 7/2 = 3.5).
          return { e: a.t === "intero" && b.t === "intero" ? binario("/", unario("to_real", a.e), b.e) : binario("/", a.e, b.e), t: "reale" };
        case "mod":
          if (a.t === "reale" || b.t === "reale") ferma("resto_fra_reali", riga);
          return { e: binario("mod", a.e, b.e), t: "intero" };
        case "^":
          // Da sinistra, col meno unario più forte (misurato): le tonde le scrive `scritta` dall'albero.
          return { e: binario("raised_to", a.e, b.e), t: "reale" };
        case "and":
        case "or":
          return { e: binario(n.op, a.e, b.e), t: "booleano" };
        default: {
          const op: OperatoreBinario = n.op === "=" ? "==" : (n.op as OperatoreBinario);
          return { e: binario(op, ...confrontabili(a, b)), t: "booleano" };
        }
      }
    };

    // --- i blocchi
    const sequenza = (els: readonly ElementoXml[]): Blocco[] => {
      ambiti.push(new Map());
      const fuori = els.flatMap(blocco);
      ambiti.pop();
      return fuori;
    };
    const blocco = (b: ElementoXml): Blocco[] => {
      const riga = b.riga;
      if (b.nome in blocchiSenzaEquivalente) ferma("blocco_senza_equivalente", riga, { elemento: b.nome });
      switch (b.nome) {
        case "declare":
          dichiara(b);
          return [];
        case "assign": {
          const destinazione = traduci(espressione(necessario(b, "variable"), riga), riga);
          const valore = traduci(espressione(necessario(b, "expression"), riga), riga);
          return [{ id: nuovoId(), kind: "assignment", target: testoVerificato(destinazione.e), value: testoVerificato(adatta(valore, destinazione.t)) }];
        }
        case "input":
          return [{ id: nuovoId(), kind: "read", target: testoVerificato(traduci(espressione(necessario(b, "variable"), riga), riga).e) }];
        case "output": {
          const n = espressione(necessario(b, "expression"), riga);
          // `&` in una scrittura: ogni parte è un valore della scrittura (Flowgorithm unisce anche i numeri).
          const parti = n.g === "binario" && n.op === "&" ? partiDellUnione(n) : [n];
          const a = sceltaFra(b, "newline", "true", "false", true);
          return [{ id: nuovoId(), kind: "write", values: parti.map((p) => testoVerificato(traduci(p, riga).e)), newline: a }];
        }
        case "if":
          soloFigli(b, ["then", "else"]);
          return [{
            id: nuovoId(), kind: "if", condition: condizione(b),
            then: sequenza(figlio(b, "then")?.figli ?? []), else: sequenza(figlio(b, "else")?.figli ?? []),
          }];
        case "while":
          return [{ id: nuovoId(), kind: "while", condition: condizione(b), body: sequenza(b.figli) }];
        case "do": {
          const body = sequenza(b.figli);
          return [{ id: nuovoId(), kind: "repeat", body, condition: condizione(b) }];
        }
        case "for":
          return per(b);
        case "call": {
          const n = espressione(necessario(b, "expression"), riga);
          if (n.g !== "chiamata") return ferma("file_non_leggibile", riga, { dettaglio: `il salto della riga ${riga} non chiama una procedura` });
          const g = firmaDi(n.nome);
          if (g === undefined) {
            if (funzioniSenzaEquivalente.some((x) => x.toLowerCase() === n.nome.toLowerCase())) ferma("funzione_senza_equivalente", riga, { nome: n.nome });
            return [{ id: nuovoId(), kind: "call", callee: n.nome, arguments: n.argomenti.map((a) => testoVerificato(traduci(a, riga).e)) }];
          }
          return [{ id: nuovoId(), kind: "call", callee: nomeDiFunzione.get(g.nome.toLowerCase())!, arguments: argomenti(g, n.argomenti, riga).map(testoVerificato) }];
        }
        case "comment":
          return [{ id: nuovoId(), kind: "comment", text: attributo(b, "text") ?? "" }];
        default:
          return ferma("file_non_leggibile", riga, { dettaglio: `l'elemento «<${b.nome}>» della riga ${riga} non è di Flowgorithm` });
      }
    };
    const condizione = (b: ElementoXml) => testoVerificato(traduci(espressione(necessario(b, "expression"), b.riga), b.riga).e);
    const dichiara = (b: ElementoXml) => {
      const riga = b.riga;
      // `name` dalla versione 2; `variables` nei file 1.x (misurato: la 4.5 li riscrive così).
      const nomi = (attributo(b, "name") ?? attributo(b, "variables") ?? necessario(b, "name")).split(",").map((s) => s.trim()).filter((s) => s !== "");
      const tipo = tipoDiFlowgorithm(necessario(b, "type"), b);
      const vettore = sceltaFra(b, "array", "true", "false", false);
      let dimensione: number | undefined;
      if (vettore) {
        const scritta = (attributo(b, "size") ?? "").trim();
        if (!/^[0-9]+$/.test(scritta)) ferma("dimensione_calcolata", riga, { nome: nomi[0] ?? "", dimensione: scritta });
        dimensione = Number(scritta);
      }
      const qui = ambiti[ambiti.length - 1]!;
      for (const n of nomi) {
        const k = n.toLowerCase();
        // Un nome ancora visibile dichiarato di nuovo: Flowgorithm si ferma («già stato dichiarato», misurato).
        if (ambiti.some((a) => a.has(k))) ferma("dichiarazione_doppia", riga, { nome: n });
        if (ambiti.length > 2) trasformazioni.push({ specie: "dichiarazione-nel-blocco", riga, nome: n });
        // Le dichiarazioni dello stesso nome in altri blocchi: lo stesso tipo e la stessa dimensione sono lo stesso dato.
        const fratelli = dichiaratiPerNome.get(k) ?? [];
        const uguale = fratelli.find((d) => d.tipo === tipo && d.dimensione === dimensione);
        if (uguale !== undefined) {
          qui.set(k, uguale);
          continue;
        }
        let nome: string;
        const primo = fratelli[0];
        if (primo !== undefined) {
          nome = liberoDa(primo.nome, usati);
          if (!rinomina) ferma("dichiarazioni_diverse", riga, { nome: primo.nome, nuovo: nome });
          trasformazioni.push({ specie: "rinomina-dichiarazione", riga, nome: primo.nome, nuovo: nome });
        } else if (usati.has(k)) {
          // Il nome di una procedura o funzione: in AlgoDesign un dato non può averlo.
          nome = liberoDa(n, usati);
          if (!rinomina) ferma("nome_riservato", riga, { nome: n, nuovo: nome });
          trasformazioni.push({ specie: "rinomina-riservato", riga, nome: n, nuovo: nome });
        } else nome = nomeValido(n, false, riga, usati);
        usati.add(nome.toLowerCase());
        const d: DatoLetto = { nome, tipo, riga, ...(dimensione !== undefined ? { dimensione } : {}) };
        dati.push(d);
        dichiaratiPerNome.set(k, [...fratelli, d]);
        qui.set(k, d);
      }
    };
    const per = (b: ElementoXml): Blocco[] => {
      const riga = b.riga;
      const contatore = traduci(espressione(necessario(b, "variable"), riga), riga);
      const da = adatta(traduci(espressione(necessario(b, "start"), riga), riga), "intero");
      const fine = traduci(espressione(necessario(b, "end"), riga), riga);
      const a = adatta(fine, "intero");
      // Una fine reale: Flowgorithm confronta il contatore col reale (misurato: da 5 a 5 / 2 all'indietro dà 5, 4, 3; da 0 a
      // 0 - 1 / 2 nessun giro), e troncarla per un «per» darebbe un giro in più o in meno: il «mentre» col confronto vero.
      const fineReale = fine.t === "reale";
      const passo = (attributo(b, "step") ?? "1").trim();
      // Senza `direction`, come nei file 1.x, il verso è `inc` (misurato: la 4.5 lo riscrive così).
      const indietro = sceltaFra(b, "direction", "dec", "inc", false);
      const nomeDelContatore = contatore.e.genere === "nome" ? contatore.e.nome : undefined;
      if (!fineReale && /^[0-9]+$/.test(passo) && Number(passo) > 0 && nomeDelContatore !== undefined && !assegnaIlContatore(b.figli, (necessario(b, "variable")).toLowerCase())) {
        const p = (indietro ? -1 : 1) * Number(passo);
        return [{ id: nuovoId(), kind: "for", counter: nomeDelContatore, from: testoVerificato(da), to: testoVerificato(a), ...(p !== 1 ? { step: p } : {}), body: sequenza(b.figli) }];
      }
      // Il «mentre» equivalente: Flowgorithm ammette il contatore assegnato nel corpo e il passo da un calcolo (misurato).
      trasformazioni.push({ specie: "per-come-mentre", riga, ...(nomeDelContatore !== undefined ? { nome: nomeDelContatore } : {}) });
      const c = testoVerificato(contatore.e);
      const passoTradotto = adatta(traduci(espressione(passo, riga), riga), "intero");
      const corpo = sequenza(b.figli);
      return [
        { id: nuovoId(), kind: "assignment", target: c, value: testoVerificato(da) },
        {
          id: nuovoId(), kind: "while", condition: testoVerificato(binario(indietro ? ">=" : "<=", contatore.e, fineReale ? fine.e : a)),
          body: [...corpo, { id: nuovoId(), kind: "assignment", target: c, value: testoVerificato(binario(indietro ? "-" : "+", contatore.e, passoTradotto)) }],
        },
      ];
    };

    const body = sequenza(corpo!.figli);
    let ritorno: string | undefined;
    if (funzioneConValore) {
      const v = necessario(f.elemento, "variable");
      const d = cerca(v);
      ritorno = testoVerificato(adatta({ e: { genere: "nome", nome: d?.nome ?? v }, t: d?.tipo ?? f.tipo! }, f.tipo!));
    }
    const data: Dato[] = dati.map((d) => ({
      name: d.nome,
      type: tipoDelDato[d.tipo],
      ...(d.dimensione !== undefined ? { size: d.dimensione } : {}),
      ...(d.parametro !== undefined ? { parameter: d.parametro } : {}),
    }));
    // I parametri in testa, nel loro ordine (sono già i primi).
    const id = `f${prossimaFunzione++}`;
    const fine = { id: nuovoId(), ...(ritorno !== undefined ? { return_value: ritorno } : {}) };
    if (f.principale) return { id, kind: "main", data, body, end: fine };
    const nome = nomeDiFunzione.get(f.nome.toLowerCase())!;
    if (procedura) return { id, kind: "procedure", name: nome, data, body, end: fine };
    return { id, kind: "function", name: nome, return_type: tipoDelDato[f.tipo!], data, body, end: fine };
  }

  const nome = valoriDegliAttributi.get("name")?.trim();
  const autore = valoriDegliAttributi.get("authors")?.trim();
  const descrizione = valoriDegliAttributi.get("about")?.trim();
  const progetto: Progetto = {
    format: "algodesign",
    schema_version: 2,
    metadata: {
      name: nome !== undefined && nome !== "" ? nome : "flowgorithm",
      ...(autore !== undefined && autore !== "" ? { author: autore } : {}),
      ...(descrizione !== undefined && descrizione !== "" ? { description: descrizione } : {}),
    },
    functions: funzioni,
  };
  const c = controlla(progetto, tetti);
  if (c.fuoriTappa) throw new Error("il progetto convertito è fuori tappa");
  if (c.errori.length > 0) {
    // I dati della frase dell'app (`testoDellaSegnalazione`): la causa precisa e se l'errore è sul risultato, come nell'app.
    const e = c.errori[0]!;
    const delDato = c.dati.find((d) => d.genere === "errore" && d.code === e.code && d.funzione === e.block);
    const fermata = c.fermate.find((f) => f.code === e.code && f.block === e.block)?.fermata ?? delDato?.fermata;
    const sulRisultato = delDato === undefined && funzioni.some((f) => f.kind === "function" && (f.id === e.block || f.end.id === e.block));
    ferma("progetto_con_errori", 0, {
      errore: e.code, blocco: e.block, sulRisultato: String(sulRisultato),
      ...(fermata !== undefined ? { causa: fermata.causa, ...(fermata.segno !== undefined ? { segno: fermata.segno } : {}) } : {}),
    });
  }
  return { ok: true, progetto, trasformazioni: trasformazioni.sort((a, b) => a.riga - b.riga) };
}

/** Le parti di una catena di `&`, da sinistra. */
function partiDellUnione(n: Nodo): Nodo[] {
  return n.g === "binario" && n.op === "&" ? [...partiDellUnione(n.a), ...partiDellUnione(n.b)] : [n];
}

/** I due lati di un confronto: un carattere con un testo di un carattere scritto è un confronto fra caratteri; con
 * un'altra stringa, il carattere si unisce al vuoto. */
function confrontabili(a: Tradotta, b: Tradotta): [Espressione, Espressione] {
  const comeCarattere = (x: Tradotta): Espressione | undefined =>
    x.e.genere === "stringa" && x.e.codici.length === 1 ? { genere: "carattere", codice: x.e.codici[0]! } : undefined;
  if (a.t === "carattere" && b.t === "stringa") {
    const c = comeCarattere(b);
    return c !== undefined ? [a.e, c] : [adatta(a, "stringa"), b.e];
  }
  if (b.t === "carattere" && a.t === "stringa") {
    const c = comeCarattere(a);
    return c !== undefined ? [c, b.e] : [a.e, adatta(b, "stringa")];
  }
  return [a.e, b.e];
}

// ---------------------------------------------------------------------------------------- le analisi del corpo

/** I nomi usati da un'espressione di Flowgorithm, e quelli che sono solo l'argomento di `Size` (non leggono i valori). */
function nomiLetti(n: Nodo): string[] {
  switch (n.g) {
    case "nome":
      return [n.nome.toLowerCase()];
    case "indice":
      return [...nomiLetti(n.base), ...nomiLetti(n.indice)];
    case "chiamata":
      return n.nome.toLowerCase() === "size" ? [] : n.argomenti.flatMap(nomiLetti);
    case "unario":
      return nomiLetti(n.x);
    case "binario":
      return [...nomiLetti(n.a), ...nomiLetti(n.b)];
    default:
      return [];
  }
}
const leggiSicuro = (t: string | undefined): Nodo | undefined => {
  if (t === undefined) return undefined;
  try {
    return leggiEspressione(t);
  } catch {
    return undefined;
  }
};
const tuttiGliElementi = (e: ElementoXml): ElementoXml[] => [e, ...e.figli.flatMap(tuttiGliElementi)];

/** Se il corpo legge i valori del vettore `nome`: in un'espressione, in un indice d'una destinazione, passato a un salto. */
function leggeIlParametro(corpo: ElementoXml, nome: string): boolean {
  const k = nome.toLowerCase();
  for (const b of tuttiGliElementi(corpo)) {
    for (const a of ["expression", "start", "end", "step"]) if (nomiLetti(leggiSicuro(b.attributi.get(a)) ?? { g: "pi" }).includes(k)) return true;
    for (const a of ["variable"]) {
      const d = leggiSicuro(b.attributi.get(a));
      // La base d'una destinazione si scrive, non si legge; l'indice si legge.
      if (d?.g === "indice" && nomiLetti(d.indice).includes(k)) return true;
    }
  }
  return false;
}

/** Se il corpo riempie tutto il vettore ricevuto: un «per» fra i suoi blocchi (non dentro un «se» o un altro ciclo), da 0 a
 * `Size(v) - 1` in avanti col passo 1, con l'assegnazione `v[i]` fra i blocchi del suo corpo. */
function loRiempieTutto(corpo: ElementoXml, nome: string): boolean {
  const k = nome.toLowerCase();
  const pulito = (s: string | undefined) => (s ?? "").replace(/\s+/g, "").toLowerCase();
  return corpo.figli.some((b) => {
    if (b.nome !== "for") return false;
    const i = pulito(b.attributi.get("variable"));
    return (
      pulito(b.attributi.get("start")) === "0" &&
      pulito(b.attributi.get("end")) === `size(${k})-1` &&
      pulito(b.attributi.get("step") ?? "1") === "1" &&
      pulito(b.attributi.get("direction") ?? "inc") === "inc" &&
      b.figli.some((a) => a.nome === "assign" && pulito(a.attributi.get("variable")) === `${k}[${i}]`)
    );
  });
}

/** Se una funzione ha effetti che in AlgoDesign solo una procedura ha: legge, scrive, o cambia un vettore ricevuto. */
function haEffetti(corpo: ElementoXml, vettori: readonly string[]): boolean {
  for (const b of tuttiGliElementi(corpo)) {
    if (b.nome === "input" || b.nome === "output") return true;
    if (b.nome === "assign") {
      const d = leggiSicuro(b.attributi.get("variable"));
      let base = d;
      while (base?.g === "indice") base = base.base;
      if (base?.g === "nome" && vettori.includes(base.nome.toLowerCase())) return true;
    }
  }
  return false;
}

/** Se un blocco del corpo assegna il contatore (o lo legge dalla tastiera). */
function assegnaIlContatore(corpo: readonly ElementoXml[], contatore: string): boolean {
  return corpo.flatMap(tuttiGliElementi).some((b) => (b.nome === "assign" || b.nome === "input") && (b.attributi.get("variable") ?? "").trim().toLowerCase() === contatore);
}

/** La dimensione di ogni vettore ricevuto (`funzione#posizione`), dagli argomenti dei salti e delle chiamate: quelle di
 * un vettore dichiarato, o di un vettore ricevuto la cui dimensione è già nota, fino al punto fisso. Dimensioni diverse
 * per lo stesso parametro, o nessuna, lasciano la chiave senza valore (il file si ferma lì). */
function dimensioniDegliArgomenti(firme: readonly FirmaLetta[], firmaDi: (n: string) => FirmaLetta | undefined): Map<string, number> {
  const note = new Map<string, number>();
  const diverse = new Set<string>();
  const dichiarati = (f: FirmaLetta) => {
    const m = new Map<string, number>();
    for (const b of tuttiGliElementi(figlio(f.elemento, "body") ?? f.elemento))
      if (b.nome === "declare" && (b.attributi.get("array") ?? "").toLowerCase() === "true" && /^\s*[0-9]+\s*$/.test(b.attributi.get("size") ?? ""))
        for (const n of (b.attributi.get("name") ?? b.attributi.get("variables") ?? "").split(",")) if (!m.has(n.trim().toLowerCase())) m.set(n.trim().toLowerCase(), Number(b.attributi.get("size")));
    return m;
  };
  const chiamateIn = (n: Nodo): Extract<Nodo, { g: "chiamata" }>[] =>
    n.g === "chiamata" ? [n, ...n.argomenti.flatMap(chiamateIn)] : n.g === "indice" ? [...chiamateIn(n.base), ...chiamateIn(n.indice)] : n.g === "unario" ? chiamateIn(n.x) : n.g === "binario" ? [...chiamateIn(n.a), ...chiamateIn(n.b)] : [];
  for (let cambiato = true; cambiato; ) {
    cambiato = false;
    for (const f of firme) {
      const locali = dichiarati(f);
      const dimensioneDi = (n: string): number | undefined => {
        const k = n.toLowerCase();
        if (locali.has(k)) return locali.get(k);
        const i = f.parametri.findIndex((p) => p.vettore && p.nome.toLowerCase() === k);
        return i < 0 ? undefined : note.get(`${f.nome.toLowerCase()}#${i}`);
      };
      for (const b of tuttiGliElementi(f.elemento))
        for (const a of ["expression", "variable", "start", "end"]) {
          const n = leggiSicuro(b.attributi.get(a));
          if (n === undefined) continue;
          for (const c of chiamateIn(n)) {
            const g = firmaDi(c.nome);
            if (g === undefined) continue;
            g.parametri.forEach((p, i) => {
              const arg = c.argomenti[i];
              if (!p.vettore || arg?.g !== "nome") return;
              const d = dimensioneDi(arg.nome);
              const chiave = `${g.nome.toLowerCase()}#${i}`;
              if (d === undefined || diverse.has(chiave)) return;
              const prima = note.get(chiave);
              if (prima === undefined) {
                note.set(chiave, d);
                cambiato = true;
              } else if (prima !== d) {
                note.delete(chiave);
                diverse.add(chiave);
                cambiato = true;
              }
            });
          }
        }
    }
  }
  return note;
}
