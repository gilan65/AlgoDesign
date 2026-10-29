// L'interprete delle tappe da 1 a 4: strutture di base, i cicli `per` e `per ogni`, espressioni,
// lettura e scrittura, procedure e funzioni coi loro parametri, la ricorsione. Parte solo se il controllo statico non
// trova errori.
//
// È un generatore. Emette un evento prima di ogni azione, col blocco, la profondità (le chiamate attive) e la
// fotografia dei dati (i valori in quell'istante, cioè dopo l'azione precedente); dopo una condizione ne dà l'esito;
// l'evento di un ciclo `per` o `per ogni` dice anche la sua fase (`FaseDelCiclo`), letta da chi lo mostra;
// le prime azioni di una funzione sono i valori iniziali dei suoi dati, uno per dato nell'ordine della vista dei dati
// (nel programma principale le costanti comuni per prime), un vettore in una: il loro evento ha il nome del dato e
// l'`id` vuoto, quello del loro blocco nel disegno, che nessun blocco dell'albero può avere; la prima fotografia ha ogni
// dato non inizializzato; chiede una riga per ogni lettura col nome del dato (`next(riga)`, oppure `next(undefined)` se
// l'input è finito); scrive l'output come testo. Una riga non valida non scrive il dato: l'interprete lo dice e
// chiede di nuovo la stessa lettura. L'esito finale è l'errore, con il suo blocco, o la fine, coi valori dopo
// l'ultima azione.
//
// Il salto e il ritorno: un salto è l'evento del suo blocco, poi gli argomenti da sinistra a destra (l'indice
// di un elemento passato per riferimento compreso), poi la funzione chiamata coi propri dati, un livello più in
// profondità; il suo ritorno è l'evento della sua fine, dopo il quale si calcola il valore restituito. Una funzione
// dentro un'espressione fa lo stesso, a metà dell'espressione: i suoi eventi vengono fra quello del blocco che la
// contiene e il resto del calcolo. Senza *rif* il parametro riceve una copia (per ogni tipo); con *rif* e con *out* è un
// alias del dato di chi chiama, e una lettura in un alias chiede il dato vero (la voce di un caso lo nomina). Lo stesso
// dato due volte nella stessa chiamata ferma il salto (`same_reference`); un *rif* vuole il valore (un vettore intero
// almeno in un elemento), o ferma il salto (`reference_without_value`); un *out* parte senza valore, anche se il dato di
// chi chiama ne ha uno: al salto la sua cella si svuota.
//
// La ricorsione: ogni chiamata attiva ha i suoi dati, anche più chiamate della stessa funzione. Le chiamate non
// stanno sulla pila del motore JavaScript, che cambia da un motore all'altro e da un istante all'altro (misurato:
// Chromium si fermava fra 340 e 582 chiamate, a 20 con la chiamata dentro 98 «se»): ognuna è un generatore in un elenco,
// e un ciclo li guida. La chiamata chiede il salto col generatore della funzione chiamata (`Salto`); il ciclo lo mette in
// cima, e al suo ritorno riprende chi aspettava col valore restituito, anche a metà di un'espressione. Dentro una
// funzione la pila del motore resta, limitata dai tetti del formato (50 livelli di blocchi, 63 di espressione). Le
// chiamate in corso delle funzioni del giro (`funzioniDelGiro`) e il loro spazio (`spazioDiUnaChiamata`) hanno un tetto:
// al salto, dopo gli argomenti e i controlli dei riferimenti, la chiamata che lo supererebbe ferma l'esecuzione sul suo
// blocco (`recursion_too_deep` prima, `recursion_data_too_large` poi), prima di svuotare la cella di un *out*.
//
// Una funzione può restituire una stringa, che si ferma sulla fine se supera la sua lunghezza massima, o un vettore,
// che chi lo riceve ha come COPIA (gli elementi, mai la cella della funzione). Un vettore intero va dove va il nome di un
// vettore: assegnato a un vettore (un'azione sola), come argomento per valore, con l'indice (prima la chiamata, poi
// l'indice), come sorgente di un «per ogni» (la funzione si chiama una volta, nell'azione della partenza, e il ciclo
// percorre quel risultato). Il nome di un vettore assegnato a un vettore è la copia elemento per elemento, con le
// azioni del «mentre» equivalente (la partenza, il controllo, la copia di un elemento, l'aumento), come il «per ogni».
//
// Un record si tiene come un vettore: la sua cella ha un valore per campo, nell'ordine dei campi, e un campo senza valore
// resta vuoto come un elemento. Il campo si legge e si scrive col suo nome (`a.nome`); il nome di un record assegnato a un
// record è la copia campo per campo, un'azione per campo (l'evento ne dice la posizione, `campo`), mentre da una funzione è
// un'azione sola; per valore il parametro riceve una copia dei campi, per riferimento la cella di chi chiama, e un campo
// passato per riferimento è come l'elemento di un vettore. Il campo del risultato di una funzione (`f(x).voto`): prima la
// chiamata, poi il campo.
//
// Una matrice si tiene come un vettore delle sue righe una dopo l'altra: la sua cella ha righe per colonne valori.
// L'elemento `m[i][j]` calcola e controlla prima la riga, poi la colonna. La riga `m[i]` è un vettore dovunque ne va uno
// (una destinazione o una sorgente intera, un argomento, la sorgente di un «per ogni»): per valore una copia, per
// riferimento una cella che legge e scrive in quella della matrice (`RigaDi`). Il nome di una matrice assegnato a una
// matrice è la copia elemento per elemento coi due «mentre» uno dentro l'altro (le righe, poi le colonne); l'uscita della
// funzione eseguita da sola che restituisce una matrice scrive «→ [0][1] = 4», un parametro per riferimento «m[0][1] = 4».
//
// Una procedura o una funzione si può eseguire da sola (la `radice`): i parametri si chiedono come letture, uno per
// parametro nell'ordine (un vettore elemento per elemento, o tutti con la stessa riga data al primo, `ognuno`; un record
// campo per campo), tranne
// quelli per uscita, che partono senza valore; poi la funzione; alla fine una funzione scrive «→ » e ciò che
// restituisce (un vettore una riga per elemento, «→ [0] = 4», un record una per campo, «→ .nome = Anna»), una procedura
// con parametri per riferimento o per uscita va a capo e scrive «nome = valore» per ognuno («v[0] = 1» per ogni elemento
// di un vettore, «r.nome = Anna» per ogni campo di un record), sempre, anche dopo un a capo: così il risultato non dipende da come la
// procedura ha finito di scrivere. La riga `senzaValore` data a un parametro per riferimento (un caso
// scritto quando un riferimento poteva arrivare senza valore) ferma l'esecuzione sulla funzione.
//
// I limiti delle impostazioni li dà sempre il chiamante: l'interfaccia i suoi, la riga di
// comando dei casi i predefiniti. Nessun valore predefinito qui, perché un chiamante che li dimentica
// non passi inosservato; chi ha già fatto il controllo coi suoi limiti lo passa, e non se ne fa un altro.
//
// Le celle dei dati non si modificano: una scrittura mette nella cella un elenco nuovo. Così una
// fotografia è un elenco di riferimenti alle celle di quell'istante, senza copie, e resta vera dopo.
//
// La semantica è quella del C11, mai quella delle primitive di JavaScript: interi a 32 bit controllati,
// reali che fermano l'esecuzione se non sono finiti, caratteri come codici Unicode, stringhe come
// elenchi di codici (lunghezza, indice e confronto per codice, non per unità UTF-16), stampa dei reali
// sul valore esatto del `double`.

import { analizza, type Espressione } from "../espressioni/analizzatore";
import { controlla, funzioniDelGiro, lunghezzaPredefinita, type EsitoDelControllo, type Tetti } from "../controllo/controllo";
import { spazioDellaPila, spazioDiUnaChiamata, tettoDelleChiamate } from "../controllo/spazio";
import { nomiDeiVettori, nomiDelleMatrici, quantePosizioni } from "../progetto/copia";
import { opzioniPredefinite, type Blocco, type Campo, type CodiceErrore, type Dato, type Funzione, type Progetto, type Segnalazione } from "../progetto/modello";
import { potenza } from "./potenza";

/** Il tetto dei passi (un passo è un evento), uguale in ogni modalità. */
export const tettoDeiPassi = 1_000_000;

/** La riga data a un parametro per riferimento di una funzione eseguita da sola che non ha un valore prima: ferma
 * l'esecuzione (un riferimento vuole il valore). */
export const senzaValore: unique symbol = Symbol("senza valore");
/** Ciò che si dà all'interprete a ogni richiesta: una riga, `undefined` se l'input è finito, `senzaValore`; al primo
 * elemento di un parametro vettore della funzione eseguita da sola anche `ognuno`, la stessa riga (o nessun valore) per
 * tutti gli elementi. */
export type Riga = string | undefined | typeof senzaValore | { readonly ognuno: string | typeof senzaValore };

/** Un valore nel tipo del suo dato: un carattere col suo codice, una stringa come elenco di codici. */
export type Valore =
  | { readonly tipo: "integer" | "real" | "character"; readonly v: number }
  | { readonly tipo: "string"; readonly v: readonly number[] }
  | { readonly tipo: "boolean"; readonly v: boolean };

/**
 * I valori dei dati in un istante: le costanti comuni, poi i dati della radice (il programma principale, o la funzione
 * eseguita da sola), nell'ordine della vista dei dati; per ognuno i suoi elementi (uno per un dato semplice, uno per
 * campo per un record), `undefined`
 * per un elemento non inizializzato. Letti dalle celle dell'interprete, mai ricalcolati; non cambiano più.
 */
export interface Fotografia {
  readonly nomi: readonly string[];
  readonly valori: readonly (readonly (Valore | undefined)[])[];
  /** Solo in un programma coi `per ogni` o con la copia di un vettore col suo nome: la posizione dell'elemento (l'indice
   * nascosto del `mentre` equivalente, `_indice` nel codice) per livello, dal più esterno (`livelliDellePosizioni`);
   * `undefined` prima che un `per ogni` o una copia di quel livello cominci. Dopo resta quella che ha trovato gli
   * elementi finiti. */
  readonly posizioni?: readonly (number | undefined)[];
  /** Solo in un progetto con funzioni che si possono chiamare (`funzioniChiamabili`), o con una radice che richiama sé
   * stessa: le chiamate attive dopo la radice, una per livello nell'ordine della pila (la prima è al livello 1), anche più
   * d'una della stessa funzione, e anche della radice. */
  readonly chiamate?: readonly FotografiaDiUnaChiamata[];
}

/** I dati di una chiamata attiva, nell'ordine della vista dei dati della funzione. */
export interface FotografiaDiUnaChiamata {
  /** L'`id` della funzione chiamata. */
  readonly funzione: string;
  /** Quale chiamata: cambia a ogni salto. */
  readonly numero: number;
  readonly valori: readonly (readonly (Valore | undefined)[])[];
  /** Per un parametro per riferimento il dato di chi chiama, come lo scrive la chiamata con l'indice calcolato (`a`,
   * `v[2]`); per gli altri dati, `undefined`. */
  readonly riferimenti: readonly (string | undefined)[];
  /** Per un parametro per riferimento o per uscita il dato che lo riceve davvero, risalendo lungo i riferimenti fino al
   * dato che non è un parametro per riferimento (o a un parametro della radice): il nome con l'indice calcolato e il
   * livello della chiamata che lo possiede (0 la radice). Per gli altri dati, `undefined`. */
  readonly origini: readonly (Origine | undefined)[];
  /** Solo in una funzione coi `per ogni` o con una copia col nome, come `Fotografia.posizioni`. */
  readonly posizioni?: readonly (number | undefined)[];
}

/** Il dato che riceve davvero ciò che arriva attraverso un riferimento: il nome (`n`, `v[2]`) e il livello. */
export interface Origine {
  readonly nome: string;
  readonly livello: number;
}

/** Le funzioni che una chiamata può rendere attive, nell'ordine del progetto: tutte tranne il programma principale e la
 * radice (la funzione eseguita da sola). */
export const funzioniChiamabili = (p: Progetto, radice?: string): readonly Funzione[] => p.functions.filter((f) => f.kind !== "main" && f.id !== radice);

/**
 * La parte del ciclo di un evento, come nel `mentre` equivalente. Un `per`: `inizio` (il contatore riceve
 * l'inizio), `condizione` a ogni controllo (anche l'ultimo, falso), `passo` a ogni aumento, emesso PRIMA del calcolo
 * (un overflow cade sul ciclo). Un `per ogni` le stesse parti del suo `mentre` equivalente con la posizione: `inizio`
 * (la posizione riceve 0), `condizione` a ogni controllo, `elemento` (l'elemento preso) a ogni giro, `passo` a ogni
 * aumento della posizione.
 */
export type FaseDelCiclo = "inizio" | "condizione" | "passo" | "elemento";

export type Passo =
  /** Prima di un'azione: il blocco, o il valore iniziale del dato `dato` (col blocco vuoto); la fase, in un ciclo; nella
   * copia di un record col suo nome, la posizione del campo copiato (da 0); nella copia di una matrice col suo nome,
   * `interno` per le fasi del ciclo delle colonne; la funzione dell'azione, se non è il programma principale. */
  | {
      readonly evento: string;
      readonly dato?: string;
      readonly fase?: FaseDelCiclo;
      readonly interno?: true;
      readonly campo?: number;
      readonly funzione?: string;
      readonly profondita: number;
      readonly dati: Fotografia;
    }
  | { readonly condizione: boolean }
  /** Il ritorno da una funzione chiamata dentro un'espressione: l'azione di chi chiama, al livello `ripresa`, riprende
   * (non è un'azione: nessun passo), con il valore che la funzione ha restituito. */
  | { readonly ripresa: number; readonly dati: Fotografia; readonly restituito: Restituito }
  /** Una lettura; `parametro`, per il parametro di una funzione eseguita da sola (`riferimento` se può non avere un
   * valore: la riga `senzaValore`), con `elemento` per un vettore (al primo si può dare `ognuno`) e `campo` (il nome) per
   * un record. */
  | { readonly chiedi: string; readonly parametro?: "valore" | "riferimento"; readonly elemento?: number; readonly campo?: string }
  | { readonly nonValido: string }
  | { readonly scrive: string };

/** Il valore che una funzione chiamata dentro un'espressione ha restituito (l'`id` della funzione): un valore, o gli
 * elementi di un vettore o i campi di un record (`undefined` per uno senza valore). Letto dall'interprete, mai
 * ricalcolato. */
export interface Restituito {
  readonly funzione: string;
  readonly valore: Valore | { readonly elementi: readonly (Valore | undefined)[] };
}

export type Esito =
  | { readonly parte: false; readonly controllo: EsitoDelControllo }
  /** Con un errore, `livello` è quello della chiamata in cui cade il suo blocco (0 la radice). */
  | { readonly parte: true; readonly dati: Fotografia; readonly errore?: Segnalazione<CodiceErrore>; readonly livello?: number };

type Numero = Extract<Valore, { v: number }>;
type Testo = Extract<Valore, { tipo: "string" }>;

/** Gli elementi di un vettore intero, o i campi di un record, `undefined` per uno senza valore. Un elenco non si modifica
 * mai: chi lo riceve ne ha una copia anche quando è lo stesso elenco della cella da cui viene. */
type Elementi = readonly (Valore | undefined)[];
/** Il vettore, o il record, restituito da una funzione. */
type VettoreRestituito = { readonly elementi: Elementi };

/** Un dato semplice è una cella di un elemento; un vettore, di `size`; un record, di un elemento per campo. L'elenco si
 * sostituisce, mai si modifica. Un parametro per riferimento è la cella stessa del dato di chi chiama, o un `ElementoDi`
 * per un elemento di un vettore o un campo di un record. */
type Cella = { readonly dato: Dato; valori: readonly (Valore | undefined)[] };

/** Un elemento di un vettore, o un campo di un record, passato per riferimento: una cella di un elemento che legge e scrive
 * in quella del vettore o del record. Il suo dato (`dato`) ha il nome del vettore o del record (la voce di un caso lo
 * nomina), senza dimensione, e per un campo il tipo del campo. */
class ElementoDi implements Cella {
  constructor(
    readonly vettore: Cella,
    readonly i: number,
    readonly dato: Dato,
  ) {}
  get valori(): readonly (Valore | undefined)[] {
    return [this.vettore.valori[this.i]];
  }
  set valori(nuovi: readonly (Valore | undefined)[]) {
    const tutti = [...this.vettore.valori];
    tutti[this.i] = nuovi[0];
    this.vettore.valori = tutti;
  }
}

/** La riga `r` di una matrice: una cella di un vettore delle sue colonne che legge e scrive in quella della matrice (il
 * valore in cui la riga comincia è `r` per le colonne). Serve dove va un vettore: un riferimento, la copia col nome, la
 * sorgente di un «per ogni», una destinazione intera. Il suo dato ha il nome della matrice e le colonne come dimensione.
 * Il record `r` di una tabella è una cella così, dei suoi `campi`, e il suo dato è un record col nome della tabella: va
 * dove va un record. */
class RigaDi implements Cella {
  readonly dato: Dato;
  /** Quanti valori ha: le colonne della matrice, i campi del record della tabella. */
  readonly larghezza: number;
  constructor(
    readonly matrice: Cella,
    readonly r: number,
    campi?: number,
  ) {
    const { columns, size: _, initial: __, ...resto } = matrice.dato;
    this.larghezza = columns ?? campi!;
    this.dato = columns !== undefined ? { ...resto, size: columns } : resto;
  }
  get primo(): number {
    return this.r * this.larghezza;
  }
  get valori(): readonly (Valore | undefined)[] {
    return this.matrice.valori.slice(this.primo, this.primo + this.larghezza);
  }
  set valori(nuovi: readonly (Valore | undefined)[]) {
    const tutti = [...this.matrice.valori];
    tutti.splice(this.primo, nuovi.length, ...nuovi);
    this.matrice.valori = tutti;
  }
}

/** Una chiamata attiva: la funzione, le celle per nome (le costanti comuni comprese), quelle della funzione in ordine,
 * le posizioni dei suoi `per ogni`; lo spazio che conta per il tetto (zero fuori dal giro). */
interface Cornice {
  readonly funzione: Funzione;
  readonly numero: number;
  readonly celle: Map<string, Cella>;
  readonly inOrdine: Cella[];
  readonly riferimenti: (string | undefined)[];
  readonly origini: (Origine | undefined)[];
  readonly livelli: number;
  readonly delGiro: boolean;
  posizioni: readonly (number | undefined)[];
  perOgniAttivi: number;
  /** L'ultima foto di questa chiamata, che la fotografia riusa finché le celle non cambiano. */
  foto?: FotografiaDiUnaChiamata;
}

/** Ciò che restituisce una chiamata: un valore, un vettore, niente per una procedura. */
type Restituibile = Valore | VettoreRestituito | undefined;

/** La richiesta di un salto, ceduta al ciclo che guida le chiamate: il generatore della funzione chiamata. */
interface Salto {
  readonly salto: Generator<Pausa, Restituibile, Riga>;
}

/** Ciò che i generatori dell'interprete cedono: un passo, che il ciclo passa fuori, o un salto, che tiene per sé. */
type Pausa = Passo | Salto;

const intMin = -2147483648;
const intMax = 2147483647;

class Arresto {
  constructor(
    readonly codice: CodiceErrore,
    readonly blocco?: string,
    /** Il livello della chiamata del blocco, se non è quella corrente (il ciclo di chi chiama). */
    readonly livello?: number,
  ) {}
}

const ferma = (codice: CodiceErrore): never => {
  throw new Arresto(codice);
};

/** Un intero a 32 bit, o l'overflow. Lo zero negativo di un calcolo è zero. */
const intero = (n: number): Numero => (n < intMin || n > intMax ? ferma("integer_overflow") : { tipo: "integer", v: n + 0 });

/** Un reale finito, o l'arresto. */
const reale = (x: number): Numero => (Number.isFinite(x) ? { tipo: "real", v: x } : ferma("non_finite_real"));

/** `arrotonda`: la metà lontano dallo zero, come `round` del C. `x - t` è esatto. */
const arrotonda = (x: number): number => {
  const t = Math.trunc(x);
  return Math.abs(x - t) >= 0.5 ? t + Math.sign(x) : t;
};

/** Il confronto di due stringhe per codice Unicode, carattere per carattere. */
const confronta = (a: readonly number[], b: readonly number[]): number => {
  for (let i = 0; i < a.length && i < b.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
};

const codiceValido = (n: number) => n >= 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff);

/** Le parti di un'espressione. */
const sotto = (e: Espressione): readonly Espressione[] =>
  e.genere === "indice" ? [e.base, e.indice] : e.genere === "campo" ? [e.base] : e.genere === "unario" ? [e.operando] : e.genere === "binario" ? [e.sinistro, e.destro] : e.genere === "chiamata" ? e.argomenti : [];

/**
 * Un reale a `decimali` cifre fisse come `%.Nf` di glibc: sul valore esatto del `double`,
 * con la metà esatta alla cifra pari, e col segno anche sullo zero negativo.
 */
export function stampaReale(x: number, decimali: number): string {
  const bit = new DataView(new ArrayBuffer(8));
  bit.setFloat64(0, x);
  const alto = bit.getUint32(0);
  const esponente = (alto >>> 20) & 0x7ff;
  // |x| = mantissa · 2^e, coi subnormali (esponente 0) senza il bit implicito.
  const mantissa = (BigInt(alto & 0xfffff) << 32n) | BigInt(bit.getUint32(4)) | (esponente > 0 ? 1n << 52n : 0n);
  const e = Math.max(esponente, 1) - 1075;
  const scala = 10n ** BigInt(decimali);
  let q: bigint;
  if (e >= 0) q = (mantissa << BigInt(e)) * scala;
  else {
    const numeratore = mantissa * scala;
    const denominatore = 1n << BigInt(-e);
    q = numeratore / denominatore;
    const resto = 2n * (numeratore % denominatore);
    if (resto > denominatore || (resto === denominatore && q % 2n === 1n)) q += 1n;
  }
  const cifre = q.toString().padStart(decimali + 1, "0");
  const segno = alto >>> 31 === 1 ? "-" : "";
  return decimali === 0 ? segno + cifre : `${segno}${cifre.slice(0, -decimali)}.${cifre.slice(-decimali)}`;
}

/** Un valore come lo scrive il programma, coi `decimali` del progetto per un reale. */
export function testoDelValore(v: Valore, decimali: number): string {
  switch (v.tipo) {
    case "integer":
      return String(v.v);
    case "real":
      return stampaReale(v.v, decimali);
    case "character":
      return String.fromCodePoint(v.v);
    case "string": {
      // A pezzi: un argomento per codice, e V8 si ferma fra 120 000 e 125 000 argomenti (misurato),
      // una lunghezza che una concatenazione dentro una scrittura può raggiungere.
      let testo = "";
      for (let i = 0; i < v.v.length; i += 8192) testo += String.fromCodePoint(...v.v.slice(i, i + 8192));
      return testo;
    }
    case "boolean":
      return v.v ? "true" : "false";
  }
}

/** Una riga letta nel tipo del dato, o `undefined` se non è valida. */
function convertiRiga(riga: string, d: Dato): Valore | undefined {
  switch (d.type) {
    case "integer": {
      if (!/^ *[+-]?\d+ *$/.test(riga)) return undefined;
      const n = Number(riga);
      return n >= intMin && n <= intMax ? { tipo: "integer", v: n + 0 } : undefined;
    }
    case "real": {
      if (!/^ *[+-]?\d+(\.\d+([eE][+-]?\d+)?)? *$/.test(riga)) return undefined;
      const x = Number(riga);
      return Number.isFinite(x) ? { tipo: "real", v: x } : undefined;
    }
    case "character": {
      // Un surrogato isolato non è un carattere: la riga non è valida.
      const c = Array.from(riga, (x) => x.codePointAt(0)!);
      return c.length === 1 && codiceValido(c[0]!) ? { tipo: "character", v: c[0]! } : undefined;
    }
    case "string": {
      // Un carattere di codice 0 non entra in una stringa, un surrogato isolato non è un carattere:
      // la riga non è valida.
      const codici = Array.from(riga, (c) => c.codePointAt(0)!);
      return codici.length <= (d.max_length ?? lunghezzaPredefinita) && codici.every((c) => c !== 0 && codiceValido(c)) ? { tipo: "string", v: codici } : undefined;
    }
    case "boolean":
      return riga === "true" || riga === "false" ? { tipo: "boolean", v: riga === "true" } : undefined;
  }
}

/** Il progetto controllato coi limiti dati, poi eseguito se il controllo lo permette; `radice`, l'`id` di una procedura
 * o di una funzione da eseguire da sola. */
export function esegui(p: Progetto, limiti: Tetti, radice?: string): Generator<Passo, Esito, Riga> {
  return eseguiDopoIlControllo(p, controlla(p, limiti), radice);
}

/** Per chi ha già controllato il progetto coi suoi limiti: l'esito di quel controllo decide se si parte. */
export function* eseguiDopoIlControllo(p: Progetto, controllo: EsitoDelControllo, radice?: string): Generator<Passo, Esito, Riga> {
  if (controllo.fuoriTappa || controllo.errori.length > 0) return { parte: false, controllo };

  const trovata = radice === undefined ? p.functions.find((f) => f.kind === "main")! : p.functions.find((f) => f.id === radice && f.kind !== "main");
  if (trovata === undefined) throw new Error(`nessuna procedura o funzione da eseguire da sola: ${radice}`);
  const principale: Funzione = trovata;
  const decimali = p.options?.real_decimals ?? opzioniPredefinite.real_decimals;
  const riempimento = (p.options?.fill_character ?? opzioniPredefinite.fill_character).codePointAt(0)!;
  const perNome = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  const chiamabili = funzioniChiamabili(p, radice);

  // Il controllo statico ha già garantito sintassi e tipi: qui l'albero si chiede una volta per testo. Le parti che
  // contengono una chiamata si segnano: si calcolano con `calcola`, che dà gli eventi della funzione chiamata.
  const alberi = new Map<string, Espressione>();
  const conChiamate = new WeakSet<Espressione>();
  const segna = (e: Espressione): boolean => {
    let chiama = e.genere === "chiamata";
    for (const s of sotto(e)) if (segna(s)) chiama = true;
    if (chiama) conChiamate.add(e);
    return chiama;
  };
  const albero = (testo: string): Espressione => {
    let e = alberi.get(testo);
    if (e === undefined) {
      const a = analizza(testo);
      if (!a.ok) throw new Error(`espressione non analizzabile dopo il controllo: ${testo}`);
      alberi.set(testo, (e = a.espressione));
      segna(e);
    }
    return e;
  };

  // ---------------------------------------------------------------------------------------- i dati

  const records = new Map((p.records ?? []).map((r) => [r.name, r.fields]));
  /** I campi di un dato record (o di un risultato record), nessuno per un altro dato. */
  const campiDi = (d: Pick<Dato, "type" | "record">): readonly Campo[] | undefined => (d.type === "record" ? records.get(d.record!)! : undefined);
  /** Quanti valori tiene la cella di un dato: gli elementi di un vettore (righe per colonne in una matrice, una riga dopo
   * l'altra), i campi di un record (record per campi in una tabella, un record dopo l'altro), uno per un dato semplice. */
  const pezzi = (d: Dato): number => (d.size !== undefined ? d.size * (d.columns ?? campiDi(d)?.length ?? 1) : (campiDi(d)?.length ?? 1));
  /** Il dato che riceve il valore `i` di una cella: il campo per un record o per un record di una tabella (col nome del
   * dato, che la voce di un caso nomina), il dato stesso altrimenti. */
  const datoDelPezzo = (d: Dato, i: number): Dato => {
    const campi = campiDi(d);
    const c = campi?.[i % campi.length];
    return c === undefined ? d : { name: d.name, type: c.type, ...(c.max_length !== undefined ? { max_length: c.max_length } : {}) };
  };
  /** La posizione di un campo nel suo record. */
  const campoIn = (d: Pick<Dato, "type" | "record">, nome: string): number => campiDi(d)!.findIndex((c) => c.name === nome);
  /** La posizione nella cella di una tabella del campo `nome` del record `r` (già controllato). */
  const campoDellaTabella = (t: Cella, r: number, nome: string): number => r * campiDi(t.dato)!.length + campoIn(t.dato, nome);
  /** Il record `r` di una tabella, o la riga `r` di una matrice: una cella dentro la sua. */
  const rigaIn = (c: Cella, r: number): RigaDi => new RigaDi(c, r, campiDi(c.dato)?.length);
  /** Come un valore si nomina nell'output: `v[2]` un elemento, `m[1][2]` un elemento di una matrice, `r.nome` un campo,
   * `t[1].nome` un campo di un record di una tabella, il nome un dato semplice. */
  const nomeDelPezzo = (d: Dato, i: number): string => {
    const campi = campiDi(d);
    return d.columns !== undefined
      ? `${d.name}[${Math.floor(i / d.columns)}][${i % d.columns}]`
      : d.size !== undefined && campi !== undefined
        ? `${d.name}[${Math.floor(i / campi.length)}].${campi[i % campi.length]!.name}`
        : d.size !== undefined
          ? `${d.name}[${i}]`
          : campi !== undefined
            ? `${d.name}.${campi[i]!.name}`
            : d.name;
  };

  const comuni = (p.shared_constants ?? []).map((d): Cella => ({ dato: d, valori: Array<Valore | undefined>(pezzi(d)).fill(undefined) }));
  let chiamate = 0;
  /** Le chiamate attive: la radice per prima. */
  const pila: Cornice[] = [];
  /** La cornice della funzione corrente. */
  let qui!: Cornice;

  // I tetti della ricorsione: le chiamate in corso delle funzioni del giro e il loro spazio, calcolato una volta per
  // funzione.
  const delGiro = funzioniDelGiro(p);
  const spazioDi = new Map([...delGiro].map((f) => [f, spazioDiUnaChiamata(f, p)]));
  let chiamateDelGiro = 0;
  let spazioInUso = 0;
  /** La fotografia ha le chiamate in corso se una chiamata è possibile: di un'altra funzione, o della radice che richiama
   * sé stessa (le sue chiamate oltre la prima). */
  const fotografaLeChiamate = chiamabili.length > 0 || delGiro.has(principale);

  /** Una cornice nuova per `f`: le costanti comuni e i dati della funzione, senza valore; `riceve` dà la cella di un
   * parametro per riferimento. Conta per i tetti se `f` è del giro. */
  const cornice = (f: Funzione, riceve: (k: number) => Cella | undefined, riferimenti: (string | undefined)[], origini: (Origine | undefined)[]): Cornice => {
    const celle = new Map(comuni.map((c) => [c.dato.name, c]));
    const inOrdine = f.data.map((d, k) => riceve(k) ?? { dato: d, valori: Array<Valore | undefined>(pezzi(d)).fill(undefined) });
    f.data.forEach((d, k) => celle.set(d.name, inOrdine[k]!));
    const livelli = livelliDi.get(f)!;
    const giro = delGiro.has(f);
    if (giro) {
      chiamateDelGiro++;
      spazioInUso += spazioDi.get(f)!;
    }
    return { funzione: f, numero: chiamate++, celle, inOrdine, riferimenti, origini, livelli, delGiro: giro, posizioni: Array<undefined>(livelli).fill(undefined), perOgniAttivi: 0 };
  };
  /** Quante posizioni nascoste ha ogni funzione (i livelli dei suoi `per ogni` e delle sue copie col nome): una volta per
   * funzione, non a ogni chiamata (riconoscere una copia legge i testi delle assegnazioni). */
  const livelliDi = new Map(
    p.functions.map((f) => {
      const visti = [...(p.shared_constants ?? []), ...f.data];
      return [f, quantePosizioni(f.body, nomiDeiVettori(visti), nomiDelleMatrici(visti))];
    }),
  );

  const nomi = [...comuni.map((c) => c.dato.name), ...principale.data.map((d) => d.name)];
  const fotografia = (): Fotografia => {
    const radiceAttiva = pila[0]!;
    const valori = [...comuni, ...radiceAttiva.inOrdine].map((c) => c.valori);
    if (!fotografaLeChiamate) return radiceAttiva.livelli === 0 ? { nomi, valori } : { nomi, valori, posizioni: radiceAttiva.posizioni };
    // Con molte chiamate in corso quasi tutte restano ferme da un evento all'altro: la foto di ognuna si rifà solo se una
    // sua cella o una sua posizione è cambiata, e l'elenco dal primo livello cambiato.
    const n = pila.length - 1;
    let k = 1;
    if (ultimeChiamate.length === n) while (k <= n && fotoDi(pila[k]!) === ultimeChiamate[k - 1]) k++;
    if (k <= n || ultimeChiamate.length !== n) {
      const attive = ultimeChiamate.slice(0, k - 1);
      for (; k <= n; k++) attive.push(fotoDi(pila[k]!));
      ultimeChiamate = attive;
    }
    return radiceAttiva.livelli === 0 ? { nomi, valori, chiamate: ultimeChiamate } : { nomi, valori, posizioni: radiceAttiva.posizioni, chiamate: ultimeChiamate };
  };
  /** Le chiamate dell'ultima fotografia. */
  let ultimeChiamate: readonly FotografiaDiUnaChiamata[] = [];
  /** La foto di una chiamata attiva: quella di prima se celle e posizioni sono le stesse (un ciclo semplice: è il
   * costo di ogni evento per ogni chiamata in corso, misurato). */
  const fotoDi = (c: Cornice): FotografiaDiUnaChiamata => {
    const prima = c.foto;
    const posizioni = c.livelli === 0 ? undefined : c.posizioni;
    if (prima !== undefined && prima.posizioni === posizioni) {
      let uguali = true;
      for (let i = 0; i < c.inOrdine.length; i++)
        if (c.inOrdine[i]!.valori !== prima.valori[i]) {
          uguali = false;
          break;
        }
      if (uguali) return prima;
    }
    const fatta = { funzione: c.funzione.id, numero: c.numero, valori: c.inOrdine.map((x) => x.valori), riferimenti: c.riferimenti, origini: c.origini };
    c.foto = posizioni === undefined ? fatta : { ...fatta, posizioni };
    return c.foto;
  };

  /** Scrive un valore in un elemento o in un campo: l'intero diventa reale, la stringa resta nella sua lunghezza. */
  const scriviIn = (c: Cella, i: number, v: Valore) => {
    const d = datoDelPezzo(c.dato, i);
    if (d.type === "real" && v.tipo === "integer") v = { tipo: "real", v: v.v };
    if (v.tipo === "string" && v.v.length > (d.max_length ?? lunghezzaPredefinita)) ferma("string_too_long");
    const nuovi = [...c.valori];
    nuovi[i] = v;
    c.valori = nuovi;
  };

  /** Il valore di un elemento, mai inventato. */
  const leggiDa = (c: Cella, i: number): Valore => c.valori[i] ?? ferma("uninitialized");

  /** Un indice dentro `[0, n)`. */
  const dentro = (i: number, n: number): number => (i >= 0 && i < n ? i : ferma("index_out_of_range"));

  const cella = (nome: string): Cella => qui.celle.get(nome)!;

  // ------------------------------------------------------------------------------- le espressioni

  /** Un'espressione senza chiamate. */
  function valuta(e: Espressione): Valore {
    switch (e.genere) {
      case "intero":
        return { tipo: "integer", v: e.valore };
      case "reale":
        return { tipo: "real", v: e.valore };
      case "pi":
        return { tipo: "real", v: Math.PI };
      case "carattere":
        return { tipo: "character", v: e.codice };
      case "stringa":
        return { tipo: "string", v: e.codici };
      case "booleano":
        return { tipo: "boolean", v: e.valore };
      case "nome":
        return leggiDa(cella(e.nome), 0);
      case "campo": {
        // Il campo di un dato record, o di un record di una tabella (`t[i].nome`, l'indice prima del campo): senza
        // chiamate, la base è il nome del dato.
        if (e.base.genere === "indice") {
          const t = cella((e.base.base as { nome: string }).nome);
          return leggiDa(t, campoDellaTabella(t, dentro((valuta(e.base.indice) as Numero).v, t.dato.size!), e.campo));
        }
        const c = cella((e.base as { nome: string }).nome);
        return leggiDa(c, campoIn(c.dato, e.campo));
      }
      case "indice": {
        // L'elemento di un vettore o di una matrice (prima l'indice della riga, poi quello della colonna), o il carattere di
        // una stringa (in sola lettura).
        const c = vettoreDi(e);
        if (c !== undefined) return leggiDa(c, dentro((valuta(e.indice) as Numero).v, c.dato.size!));
        const m = matriceDellElemento(e);
        if (m !== undefined) {
          const r = dentro((valuta((e.base as Extract<Espressione, { genere: "indice" }>).indice) as Numero).v, m.dato.size!);
          return leggiDa(m, inMatrice(m, r, (valuta(e.indice) as Numero).v));
        }
        const s = valuta(e.base) as Testo;
        return carattereDi(s, (valuta(e.indice) as Numero).v);
      }
      case "chiamata":
        throw new Error("chiamata fuori da calcola");
      case "unario":
        return e.operatore === "to_string" ? daVettore(vettoreSenzaChiamate(e.operando)) : unario(e.operatore, valuta(e.operando));
      case "binario": {
        const op = e.operatore;
        // `and` e `or`: il secondo operando solo se serve.
        if (op === "and" || op === "or") return logico(op, valuta(e.sinistro).v === true, () => valuta(e.destro).v === true);
        const l = valuta(e.sinistro);
        return binario(op, l, valuta(e.destro));
      }
    }
  }

  /** Un'espressione con le chiamate: le stesse regole di `valuta`, con gli eventi di ogni funzione chiamata nel mezzo. */
  function* calcola(e: Espressione): Generator<Pausa, Valore, Riga> {
    if (!conChiamate.has(e)) return valuta(e);
    switch (e.genere) {
      case "chiamata":
        return (yield* chiamaDentro(e)) as Valore;
      case "campo": {
        if (e.base.genere === "indice") {
          const x = e.base;
          if (x.base.genere === "chiamata") {
            // Il campo di un record della tabella restituita da una funzione: prima la chiamata, poi l'indice, poi il campo.
            const f = perNome.get(x.base.nome)!;
            const { elementi } = (yield* chiamaDentro(x.base)) as VettoreRestituito;
            const r = dentro(((yield* calcola(x.indice)) as Numero).v, f.return_size!);
            const delRecord = { type: "record" as const, record: f.return_record! };
            return elementi[r * campiDi(delRecord)!.length + campoIn(delRecord, e.campo)] ?? ferma("uninitialized");
          }
          // Il campo di un record di una tabella con una chiamata nell'indice.
          const t = cella((x.base as { nome: string }).nome);
          return leggiDa(t, campoDellaTabella(t, dentro(((yield* calcola(x.indice)) as Numero).v, t.dato.size!), e.campo));
        }
        // Il campo del record restituito da una funzione: prima la chiamata, poi il campo.
        const f = perNome.get((e.base as { nome: string }).nome)!;
        const { elementi } = (yield* chiamaDentro(e.base)) as VettoreRestituito;
        return elementi[campoIn({ type: "record", record: f.return_record! }, e.campo)] ?? ferma("uninitialized");
      }
      case "indice": {
        const c = vettoreDi(e);
        if (c !== undefined) return leggiDa(c, dentro(((yield* calcola(e.indice)) as Numero).v, c.dato.size!));
        const m = matriceDellElemento(e);
        if (m !== undefined) {
          const r = dentro(((yield* calcola((e.base as Extract<Espressione, { genere: "indice" }>).indice)) as Numero).v, m.dato.size!);
          return leggiDa(m, inMatrice(m, r, ((yield* calcola(e.indice)) as Numero).v));
        }
        // L'elemento di un vettore restituito: prima la chiamata, poi l'indice.
        if (restituisceUnVettore(e.base)) {
          const { elementi } = (yield* chiamaDentro(e.base)) as VettoreRestituito;
          return elementi[dentro(((yield* calcola(e.indice)) as Numero).v, elementi.length)] ?? ferma("uninitialized");
        }
        // L'elemento di una matrice restituita: prima la chiamata, poi la riga, poi la colonna.
        if (e.base.genere === "indice" && restituisceUnVettore(e.base.base)) {
          const colonne = perNome.get((e.base.base as { nome: string }).nome)!.return_columns!;
          const { elementi } = (yield* chiamaDentro(e.base.base)) as VettoreRestituito;
          const r = dentro(((yield* calcola(e.base.indice)) as Numero).v, elementi.length / colonne);
          return elementi[r * colonne + dentro(((yield* calcola(e.indice)) as Numero).v, colonne)] ?? ferma("uninitialized");
        }
        const s = (yield* calcola(e.base)) as Testo;
        return carattereDi(s, ((yield* calcola(e.indice)) as Numero).v);
      }
      case "unario":
        return e.operatore === "to_string" ? daVettore(yield* elementiDi(e.operando)) : unario(e.operatore, yield* calcola(e.operando));
      case "binario": {
        const op = e.operatore;
        if (op === "and" || op === "or") {
          const l = (yield* calcola(e.sinistro)).v === true;
          if (op === "and" ? !l : l) return { tipo: "boolean", v: l };
          return { tipo: "boolean", v: (yield* calcola(e.destro)).v === true };
        }
        const l = yield* calcola(e.sinistro);
        return binario(op, l, yield* calcola(e.destro));
      }
      default:
        throw new Error(`parte senza chiamate segnata: ${e.genere}`);
    }
  }

  /** L'espressione di un testo: senza chiamate subito, con le chiamate con i loro eventi. */
  function* calcolaTesto(testo: string): Generator<Pausa, Valore, Riga> {
    const e = albero(testo);
    return conChiamate.has(e) ? yield* calcola(e) : valuta(e);
  }

  /** Una funzione chiamata dentro un'espressione: il salto, il ritorno e la ripresa di chi chiama. */
  function* chiamaDentro(e: Espressione): Generator<Pausa, Valore | VettoreRestituito, Riga> {
    const x = e as Extract<Espressione, { genere: "chiamata" }>;
    const f = perNome.get(x.nome)!;
    const restituito = (yield* chiama(f, x.argomenti, corrente))!;
    yield { ripresa: profondita, dati: fotografia(), restituito: { funzione: f.id, valore: restituito } };
    return restituito;
  }

  /** Una chiamata la cui funzione dà come risultato un vettore. */
  const restituisceUnVettore = (e: Espressione): boolean => e.genere === "chiamata" && perNome.get(e.nome)!.return_size !== undefined;

  /** Gli elementi di un vettore intero, una copia: il nome di un vettore o di una matrice (gli elementi di quell'istante,
   * una riga dopo l'altra), la riga di una matrice, o una funzione che lo restituisce. */
  function* elementiDi(e: Espressione): Generator<Pausa, Elementi, Riga> {
    if (e.genere === "nome") return cella(e.nome).valori;
    if (e.genere === "indice") return (yield* rigaDi(e)).valori;
    return ((yield* chiamaDentro(e)) as VettoreRestituito).elementi;
  }

  /** Gli elementi del nome di un vettore o della riga di una matrice, senza chiamate. */
  const vettoreSenzaChiamate = (e: Espressione): Elementi => {
    if (e.genere === "nome") return cella(e.nome).valori;
    const x = e as Extract<Espressione, { genere: "indice" }>;
    const m = cella((x.base as { nome: string }).nome);
    return rigaIn(m, dentro((valuta(x.indice) as Numero).v, m.dato.size!)).valori;
  };

  /** La riga `m[i]` di una matrice, o il record `t[i]` di una tabella, col suo nome, con l'indice calcolato ora. */
  function* rigaDi(e: Extract<Espressione, { genere: "indice" }>): Generator<Pausa, RigaDi, Riga> {
    const m = cella((e.base as { nome: string }).nome);
    const r = conChiamate.has(e.indice) ? yield* calcola(e.indice) : valuta(e.indice);
    return rigaIn(m, dentro((r as Numero).v, m.dato.size!));
  }

  /** La cella del vettore di cui `e` prende un elemento semplice, o nessuna se prende il carattere di una stringa,
   * l'elemento di una matrice o un record di una tabella. */
  const vettoreDi = (e: Extract<Espressione, { genere: "indice" }>): Cella | undefined => {
    const c = e.base.genere === "nome" ? cella(e.base.nome) : undefined;
    return c !== undefined && c.dato.size !== undefined && c.dato.columns === undefined && c.dato.type !== "record" ? c : undefined;
  };

  /** La cella della matrice di cui `e` prende un elemento (`m[i][j]`, col nome della matrice), o nessuna. Un indice su un
   * indice di un vettore di stringhe (`v[i][j]`) prende un carattere della stringa `v[i]`: nessuna. */
  const matriceDellElemento = (e: Extract<Espressione, { genere: "indice" }>): Cella | undefined => {
    if (e.base.genere !== "indice" || e.base.base.genere !== "nome") return undefined;
    const c = cella(e.base.base.nome);
    return c.dato.columns !== undefined ? c : undefined;
  };

  /** La posizione nella cella di una matrice dell'elemento di riga `r` (già controllata: l'indice della riga si controlla
   * prima di calcolare quello della colonna) e colonna `j`, dentro le colonne. */
  const inMatrice = (m: Cella, r: number, j: number): number => r * m.dato.columns! + dentro(j, m.dato.columns!);

  const carattereDi = (s: Testo, i: number): Valore => ({ tipo: "character", v: s.v[dentro(i, s.v.length)]! });

  const logico = (op: "and" | "or", l: boolean, destro: () => boolean): Valore => ({ tipo: "boolean", v: op === "and" ? l && destro() : l || destro() });

  function unario(op: string, o: Valore): Valore {
    const n = (o as Numero).v;
    switch (op) {
      case "-":
        return o.tipo === "integer" ? intero(-n) : reale(-n);
      case "not":
        return { tipo: "boolean", v: !o.v };
      case "to_integer":
        if (o.tipo === "character") return { tipo: "integer", v: n };
        return Math.trunc(n) < intMin || Math.trunc(n) > intMax ? ferma("real_to_integer_out_of_range") : intero(Math.trunc(n));
      case "to_real":
        return reale(n);
      case "to_character":
        return o.tipo === "character" ? o : codiceValido(n) ? { tipo: "character", v: n } : ferma("invalid_character_code");
      case "length":
        return intero((o as Testo).v.length);
      case "absolute_value":
        return o.tipo === "integer" ? intero(Math.abs(n)) : reale(Math.abs(n));
      case "square_root":
        return reale(Math.sqrt(n));
      case "round":
        return reale(arrotonda(n));
      case "round_down":
        return reale(Math.floor(n));
      case "round_up":
        return reale(Math.ceil(n));
      case "integer_part":
        return reale(Math.trunc(n));
      default:
        throw new Error(`operatore fuori dal controllo: ${op}`);
    }
  }

  /** Un'operazione su due operandi già calcolati: si applica dopo, quindi un arresto di un operando viene prima. */
  function binario(op: string, l: Valore, r: Valore): Valore {
    if (l.tipo === "string" || r.tipo === "string") {
      if (op === "+") return { tipo: "string", v: [...codiciDi(l), ...codiciDi(r)] };
      return confrontoVero(op, confronta(l.v as readonly number[], r.v as readonly number[]));
    }
    if (l.tipo === "boolean") return { tipo: "boolean", v: (l.v === r.v) === (op === "==") };
    const a = (l as Numero).v;
    const b = (r as Numero).v;
    const interi = l.tipo === "integer" && r.tipo === "integer";
    switch (op) {
      case "+":
        return interi ? intero(a + b) : reale(a + b);
      case "-":
        return interi ? intero(a - b) : reale(a - b);
      case "*":
        // Il prodotto di due interi a 32 bit è inesatto in un double solo oltre 2^53: fuori comunque.
        return interi ? intero(a * b) : reale(a * b);
      case "/":
        if (!interi) return reale(a / b);
        // Troncato verso lo zero; `INT_MIN / -1` esce dall'intervallo e diventa overflow.
        return b === 0 ? ferma("division_by_zero") : intero(Math.trunc(a / b));
      case "mod":
        // Il resto di JavaScript ha il segno del dividendo, come il C; `INT_MIN mod -1` si ferma (6.5.5 p6).
        if (b === 0) return ferma("division_by_zero");
        return a === intMin && b === -1 ? ferma("integer_overflow") : intero(a % b);
      case "raised_to":
        // Non `Math.pow`, che cambia da un motore all'altro: lo stesso risultato ovunque (potenza.ts).
        return reale(potenza(a, b));
      default:
        // Numeri fra loro (intero e reale si mescolano), caratteri fra loro, per codice.
        return confrontoVero(op, a < b ? -1 : a > b ? 1 : 0);
    }
  }

  const confrontoVero = (op: string, c: number): Valore => ({
    tipo: "boolean",
    v: op === "==" ? c === 0 : op === "!=" ? c !== 0 : op === "<" ? c < 0 : op === "<=" ? c <= 0 : op === ">" ? c > 0 : c >= 0,
  });

  /** Una stringa o un carattere come elenco di codici; un carattere di codice 0 non entra. */
  const codiciDi = (v: Valore): readonly number[] => (v.tipo === "string" ? v.v : v.v === 0 ? ferma("null_character_in_string") : [v.v as number]);

  /** `to_string v`: tutti gli elementi, in ordine, mai uno inventato. */
  const daVettore = (elementi: Elementi): Valore => ({ tipo: "string", v: elementi.map((x) => codiciDi(x ?? ferma("uninitialized"))[0]!) });

  /** Un vettore restituito che entra in un vettore dello stesso tipo e della stessa dimensione, o un record in un record
   * dello stesso tipo: gli elementi, ognuno nella lunghezza massima del suo dato o del suo campo. */
  const tuttiIn = (c: Cella, elementi: Elementi) => {
    elementi.forEach((v, i) => {
      if (v?.tipo === "string" && v.v.length > (datoDelPezzo(c.dato, i).max_length ?? lunghezzaPredefinita)) ferma("string_too_long");
    });
    c.valori = elementi;
  };

  /** `to_array s`: i caratteri in ordine, poi il carattere di riempimento del progetto. */
  const inVettore = (c: Cella, s: readonly number[]) => {
    if (s.length > c.valori.length) ferma("string_longer_than_array");
    c.valori = c.valori.map((_, i) => ({ tipo: "character", v: s[i] ?? riempimento }));
  };

  /** Una destinazione: la cella e l'elemento, o il campo; per la riga di una matrice la sua cella (`RigaDi`, e l'elemento
   * 0). `pezzo` è come la chiamata scrive l'elemento, il campo o la riga, con gli indici calcolati (`[2]`, `[1][2]`,
   * `.nome`); nessuno per il dato intero. Gli indici si calcolano prima del valore (da sinistra), la riga prima della
   * colonna. */
  function* destinazione(e: Espressione): Generator<Pausa, { cella: Cella; i: number; pezzo?: string }, Riga> {
    const indice = function* (y: Espressione): Generator<Pausa, number, Riga> {
      return ((conChiamate.has(y) ? yield* calcola(y) : valuta(y)) as Numero).v;
    };
    if (e.genere === "nome") return { cella: cella(e.nome), i: 0 };
    if (e.genere === "campo") {
      // Il campo di un record di una tabella: il record, poi il campo.
      if (e.base.genere === "indice") {
        const t = cella((e.base.base as { nome: string }).nome);
        const r = dentro(yield* indice(e.base.indice), t.dato.size!);
        return { cella: t, i: campoDellaTabella(t, r, e.campo), pezzo: `[${r}].${e.campo}` };
      }
      const c = cella((e.base as { nome: string }).nome);
      return { cella: c, i: campoIn(c.dato, e.campo), pezzo: `.${e.campo}` };
    }
    const x = e as Extract<Espressione, { genere: "indice" }>;
    if (x.base.genere === "indice") {
      // L'elemento di una matrice: la riga, poi la colonna.
      const m = cella((x.base.base as { nome: string }).nome);
      const r = dentro(yield* indice(x.base.indice), m.dato.size!);
      const i = inMatrice(m, r, yield* indice(x.indice));
      return { cella: m, i, pezzo: `[${r}][${i % m.dato.columns!}]` };
    }
    const c = cella((x.base as { nome: string }).nome);
    const i = dentro(yield* indice(x.indice), c.dato.size!);
    // La riga di una matrice e il record di una tabella: la loro cella dentro quella del dato.
    if (c.dato.columns !== undefined || c.dato.type === "record") return { cella: rigaIn(c, i), i: 0, pezzo: `[${i}]` };
    return { cella: c, i, pezzo: `[${i}]` };
  }

  /** L'esito di una condizione, che si dà subito dopo averla valutata. */
  function* condizione(testo: string): Generator<Pausa, boolean, Riga> {
    const vero = (yield* calcolaTesto(testo)).v === true;
    yield { condizione: vero };
    return vero;
  }

  const stampa = (v: Valore): string => testoDelValore(v, decimali);

  /** Il nome del contatore, dell'elemento o della sorgente di un ciclo: il controllo ha garantito che è un nome. */
  const nomeDi = (testo: string): string => (albero(testo) as { nome: string }).nome;

  // ------------------------------------------------------------------------------------ i blocchi

  let passi = 0;
  let corrente = principale.id;
  let profondita = 0;
  /** I cicli aperti, col livello della chiamata che li esegue: il tetto dei passi cade sul più interno, al suo livello. */
  const cicli: { readonly blocco: string; readonly livello: number }[] = [];
  const oltreIPassi = (blocco: string): Arresto => {
    const ciclo = cicli.at(-1);
    return ciclo === undefined ? new Arresto("too_many_steps", blocco) : new Arresto("too_many_steps", ciclo.blocco, ciclo.livello);
  };

  /** L'evento prima di un'azione: un passo. Oltre il tetto, l'errore va sul ciclo più interno attivo. */
  const evento = (blocco: string, fase?: FaseDelCiclo, campo?: number, interno?: true): Passo => {
    if (++passi > tettoDeiPassi) throw oltreIPassi(blocco);
    corrente = blocco;
    const f = qui.funzione;
    return {
      evento: blocco,
      ...(fase !== undefined ? { fase } : {}),
      ...(interno ? { interno } : {}),
      ...(campo !== undefined ? { campo } : {}),
      ...(f.kind !== "main" ? { funzione: f.id } : {}),
      profondita,
      dati: fotografia(),
    };
  };

  function* sequenza(blocchi: readonly Blocco[]): Generator<Pausa, void, Riga> {
    for (const b of blocchi) yield* blocco(b);
  }

  /** Una riga per l'elemento `i` della cella (il campo, in un record), finché non è valida. */
  function* leggiRiga(c: Cella, i: number, blocco: string): Generator<Pausa, Valore, Riga> {
    for (;;) {
      const riga = yield { chiedi: c.dato.name };
      if (riga === undefined) return ferma("input_exhausted");
      if (typeof riga !== "string") throw new Error("riga di un parametro a una lettura");
      const v = convertiRiga(riga, datoDelPezzo(c.dato, i));
      if (v !== undefined) return v;
      yield { nonValido: blocco };
    }
  }

  /** L'elemento (o il campo) `i` di un parametro della funzione eseguita da sola, finché la riga non è valida: il valore, o
   * nessuno (`senzaValore`, solo per un riferimento); `ognuno` vale per tutti gli elementi (solo al primo di un vettore).
   * Una riga non valida cade sulla funzione, il suo «Inizio». */
  function* leggiParametro(d: Dato, i: number): Generator<Pausa, { readonly valore: Valore | undefined; readonly ognuno: boolean }, Riga> {
    const parametro = d.parameter === "reference" ? "riferimento" : "valore";
    // In una tabella il record `elemento` e il suo campo.
    const campi = campiDi(d);
    const campo = campi?.[i % campi.length]?.name;
    const elemento = d.size === undefined ? undefined : campi !== undefined ? Math.floor(i / campi.length) : i;
    for (;;) {
      const riga = yield { chiedi: d.name, parametro, ...(elemento !== undefined ? { elemento } : {}), ...(campo !== undefined ? { campo } : {}) };
      if (riga === undefined) return ferma("input_exhausted");
      const ognuno = typeof riga === "object";
      // Una riga per ogni elemento solo per un vettore: i campi di una tabella hanno tipi diversi.
      if (ognuno && (d.size === undefined || i > 0 || campi !== undefined)) throw new Error(`una riga per ogni elemento a ${d.name}, elemento ${i}`);
      const testo = ognuno ? riga.ognuno : riga;
      if (testo === senzaValore) {
        if (parametro !== "riferimento") throw new Error(`nessun valore per ${d.name}, che lo vuole`);
        // Un riferimento vuole il valore anche qui (un caso scritto quando non lo voleva): si ferma sulla funzione.
        return ferma("reference_without_value");
      }
      const v = convertiRiga(testo, datoDelPezzo(d, i));
      if (v !== undefined) return { valore: v, ognuno };
      yield { nonValido: pila[0]!.funzione.id };
    }
  }

  function* blocco(b: Blocco): Generator<Pausa, void, Riga> {
    switch (b.kind) {
      case "assignment": {
        const t = albero(b.target);
        const e = albero(b.value);
        // Un vettore intero (una riga di una matrice compresa), una matrice o una tabella: dal nome di un vettore, o da una
        // riga, la copia elemento per elemento (record per record), da una funzione un'azione sola. Un record intero (un
        // record di una tabella compreso): dal nome di un record, o da un record di una tabella, la copia campo per campo,
        // da una funzione un'azione sola.
        const intero = (t.genere === "nome" && cella(t.nome).dato.size !== undefined) || eUnaRiga(t);
        const record = (t.genere === "nome" && cella(t.nome).dato.type === "record") || eUnRecord(t);
        if (intero && (e.genere === "nome" || eUnaRiga(e))) return yield* copia(b.id, t, e);
        if (record && (e.genere === "nome" || eUnRecord(e))) return yield* copiaDelRecord(b.id, t, e);
        yield evento(b.id);
        const { cella: c, i } = yield* destinazione(t);
        if (e.genere === "unario" && e.operatore === "to_array") inVettore(c, ((conChiamate.has(e.operando) ? yield* calcola(e.operando) : valuta(e.operando)) as Testo).v);
        else if (intero || record) tuttiIn(c, yield* elementiDi(e));
        else scriviIn(c, i, conChiamate.has(e) ? yield* calcola(e) : valuta(e));
        return;
      }
      case "read": {
        yield evento(b.id);
        const { cella: c, i } = yield* destinazione(albero(b.target));
        scriviIn(c, i, yield* leggiRiga(c, i, b.id));
        return;
      }
      case "write":
        yield evento(b.id);
        for (const t of b.values) yield { scrive: stampa(yield* calcolaTesto(t)) };
        if (b.newline) yield { scrive: "\n" };
        return;
      case "if":
        yield evento(b.id);
        return yield* sequenza((yield* condizione(b.condition)) ? b.then : b.else);
      case "while":
        cicli.push({ blocco: b.id, livello: profondita });
        for (;;) {
          yield evento(b.id);
          if (!(yield* condizione(b.condition))) break;
          yield* sequenza(b.body);
        }
        cicli.pop();
        return;
      case "repeat":
        cicli.push({ blocco: b.id, livello: profondita });
        do {
          yield* sequenza(b.body);
          yield evento(b.id);
        } while (yield* condizione(b.condition));
        cicli.pop();
        return;
      case "for": {
        // Il `mentre` equivalente: il contatore riceve l'inizio; a ogni controllo la fine si ricalcola; dopo il
        // corpo il contatore aumenta del passo. Il controllo vale col passo positivo `<=`, col negativo `>=`.
        const contatore = cella(nomeDi(b.counter));
        const passo = b.step ?? 1;
        cicli.push({ blocco: b.id, livello: profondita });
        yield evento(b.id, "inizio");
        scriviIn(contatore, 0, yield* calcolaTesto(b.from));
        for (;;) {
          yield evento(b.id, "condizione");
          const i = (leggiDa(contatore, 0) as Numero).v;
          const fine = ((yield* calcolaTesto(b.to)) as Numero).v;
          const vero = passo > 0 ? i <= fine : i >= fine;
          yield { condizione: vero };
          if (!vero) break;
          yield* sequenza(b.body);
          yield evento(b.id, "passo");
          scriviIn(contatore, 0, intero((leggiDa(contatore, 0) as Numero).v + passo));
        }
        cicli.pop();
        return;
      }
      case "for_each": {
        // Il `mentre` equivalente con un indice nascosto, la posizione: parte da 0; a ogni controllo la dimensione
        // del vettore, o la lunghezza della stringa ricalcolata; l'elemento è una copia, presa dopo il controllo; dopo il
        // corpo la posizione aumenta di 1. Ogni parte è un'azione, come nel `per`; la posizione cambia nella sua azione,
        // quindi la fotografia dell'evento seguente la vede.
        const elemento = cella(nomeDi(b.item));
        const s = albero(b.source);
        const c = qui;
        const posizione = posizioneDi(c, c.perOgniAttivi++);
        cicli.push({ blocco: b.id, livello: profondita });
        yield evento(b.id, "inizio");
        // Una funzione si chiama una volta, qui: il ciclo percorre il suo risultato, tenuto in una cella nascosta. La riga
        // di una matrice si sceglie qui (l'indice si calcola una volta), e il ciclo legge la matrice com'è a ogni giro,
        // come il nome di un vettore.
        const sorgente =
          s.genere === "nome"
            ? cella(s.nome)
            : eUnaRiga(s)
              ? yield* rigaDi(s)
              : risultatoInUnaCella(perNome.get((s as { nome: string }).nome)!, yield* chiamaDentro(s));
        posizione(0);
        for (let indice = 0; ; ) {
          yield evento(b.id, "condizione");
          const n = sorgente.dato.size ?? (sorgente.valori[0] as Testo | undefined)?.v.length;
          // Una stringa senza valore ferma il controllo.
          if (n === undefined) return ferma("uninitialized");
          const altro = indice < n;
          yield { condizione: altro };
          if (!altro) break;
          yield evento(b.id, "elemento");
          if (sorgente.dato.type === "record") {
            // Il record di una tabella, preso in un'azione: un campo senza valore lo ferma, come la copia del record.
            const preso = rigaIn(sorgente, indice).valori;
            elemento.valori = preso.map((v) => v ?? ferma("uninitialized"));
          } else {
            const preso: Valore = sorgente.dato.size !== undefined ? leggiDa(sorgente, indice) : { tipo: "character", v: (sorgente.valori[0] as Testo).v[indice]! };
            scriviIn(elemento, 0, preso);
          }
          yield* sequenza(b.body);
          yield evento(b.id, "passo");
          posizione(++indice);
        }
        cicli.pop();
        c.perOgniAttivi--;
        return;
      }
      case "call":
        yield evento(b.id);
        yield* chiama(perNome.get(b.callee)!, b.arguments.map(albero), b.id);
        return;
      case "comment":
        return;
    }
  }

  /** Il risultato di una funzione in una cella senza nome, che nessuna fotografia mostra. */
  const risultatoInUnaCella = (f: Funzione, r: Valore | VettoreRestituito): Cella =>
    "elementi" in r
      ? {
          dato: { name: "", type: f.return_type!, ...(f.return_record !== undefined ? { record: f.return_record, size: f.return_size! } : { size: r.elementi.length }) },
          valori: r.elementi,
        }
      : { dato: { name: "", type: f.return_type! }, valori: [r] };

  /** Chi scrive la posizione di un `per ogni` o di una copia al suo livello (da 0) nella cornice: un elenco nuovo, che la
   * fotografia dell'evento seguente vede. */
  const posizioneDi = (c: Cornice, livello: number) => (q: number) => (c.posizioni = c.posizioni.map((x, l) => (l === livello ? q : x)));

  /** La riga di una matrice scritta col nome e un indice (`m[i]`): un vettore. */
  const eUnaRiga = (e: Espressione): e is Extract<Espressione, { genere: "indice" }> =>
    e.genere === "indice" && e.base.genere === "nome" && cella(e.base.nome).dato.columns !== undefined;

  /** Il record di una tabella scritto col nome e un indice (`t[i]`): un record. */
  const eUnRecord = (e: Espressione): e is Extract<Espressione, { genere: "indice" }> => {
    if (e.genere !== "indice" || e.base.genere !== "nome") return false;
    const d = cella(e.base.nome).dato;
    return d.type === "record" && d.size !== undefined;
  };

  /** La cella di un vettore intero o di un record per la copia: il nome, o la riga di una matrice (il record di una
   * tabella) con l'indice calcolato ora. */
  function* cellaIntera(e: Espressione): Generator<Pausa, Cella, Riga> {
    return e.genere === "nome" ? cella(e.nome) : yield* rigaDi(e as Extract<Espressione, { genere: "indice" }>);
  }

  /** La copia di un vettore col suo nome (o di una riga di una matrice, da una parte o dall'altra), elemento per elemento:
   * le azioni del «mentre» equivalente con una posizione nascosta, come il «per ogni» (la partenza, il controllo, la copia
   * di un elemento, l'aumento), al livello dopo quello dei «per ogni» attivi. L'indice di una riga si calcola nella
   * partenza, prima di ogni elemento. La copia di una matrice col suo nome ha due «mentre», uno dentro l'altro: la riga
   * al livello della copia, la colonna al successivo, e gli eventi del ciclo delle colonne sono `interno`. Un elemento
   * senza valore ferma la copia, come la sua lettura; uno più lungo del dato che lo riceve, come la sua assegnazione. */
  function* copia(blocco: string, t: Espressione, e: Espressione): Generator<Pausa, void, Riga> {
    const livello = qui.perOgniAttivi;
    const posizione = posizioneDi(qui, livello);
    yield evento(blocco, "inizio");
    const verso = yield* cellaIntera(t);
    const da = yield* cellaIntera(e);
    posizione(0);
    const colonne = verso.dato.columns;
    const campi = campiDi(verso.dato)?.length;
    for (let i = 0; ; ) {
      yield evento(blocco, "condizione");
      const altro = i < verso.dato.size!;
      yield { condizione: altro };
      if (!altro) return;
      if (campi !== undefined) {
        // Il record di una tabella, campo per campo: un'azione per campo, con la sua posizione.
        for (let k = 0; k < campi; k++) {
          yield evento(blocco, "elemento", k);
          scriviIn(verso, i * campi + k, leggiDa(da, i * campi + k));
        }
      } else if (colonne === undefined) {
        yield evento(blocco, "elemento");
        scriviIn(verso, i, leggiDa(da, i));
      } else {
        const colonna = posizioneDi(qui, livello + 1);
        yield evento(blocco, "inizio", undefined, true);
        colonna(0);
        for (let j = 0; ; ) {
          yield evento(blocco, "condizione", undefined, true);
          const ancora = j < colonne;
          yield { condizione: ancora };
          if (!ancora) break;
          yield evento(blocco, "elemento", undefined, true);
          scriviIn(verso, i * colonne + j, leggiDa(da, i * colonne + j));
          yield evento(blocco, "passo", undefined, true);
          colonna(++j);
        }
      }
      yield evento(blocco, "passo");
      posizione(++i);
    }
  }

  /** La copia di un record col suo nome (o di un record di una tabella, da una parte o dall'altra), campo per campo:
   * un'azione per campo, nell'ordine dei campi, con la sua posizione nell'evento. Gli indici si calcolano nella prima,
   * prima del primo campo. Un campo senza valore ferma la copia, come la sua lettura. */
  function* copiaDelRecord(blocco: string, t: Espressione, e: Espressione): Generator<Pausa, void, Riga> {
    yield evento(blocco, undefined, 0);
    const verso = yield* cellaIntera(t);
    const da = yield* cellaIntera(e);
    for (let k = 0; k < verso.valori.length; k++) {
      if (k > 0) yield evento(blocco, undefined, k);
      scriviIn(verso, k, leggiDa(da, k));
    }
  }

  /** Dove arriva un argomento per riferimento: la cella del dato vero (scendendo dalle righe e dagli elementi) e i valori
   * che tocca, da `da` ad `a` escluso: un elemento o un campo uno, una riga le sue colonne, un dato intero tutti. */
  const doveArriva = (c: Cella): { vettore: Cella; da: number; a: number } => {
    if (c instanceof ElementoDi) {
      const sotto = doveArriva(c.vettore);
      return { vettore: sotto.vettore, da: sotto.da + c.i, a: sotto.da + c.i + 1 };
    }
    if (c instanceof RigaDi) {
      const sotto = doveArriva(c.matrice);
      return { vettore: sotto.vettore, da: sotto.da + c.primo, a: sotto.da + c.primo + c.larghezza };
    }
    return { vettore: c, da: 0, a: c.valori.length };
  };

  /**
   * Il salto da `blocco` a `f` con gli argomenti, il ritorno e il valore restituito (`undefined` per una procedura). Gli
   * argomenti da sinistra a destra (un argomento per riferimento: la sua cella e l'indice calcolato ora; una stringa per
   * valore più lunga del parametro si ferma al suo posto, come un'assegnazione, prima degli argomenti alla sua destra:
   * così fanno il Python e il C generati); lo stesso dato due volte per riferimento si ferma sul salto; poi la cornice
   * nuova coi parametri (una copia, o la cella di chi chiama), i valori iniziali, il corpo, la fine (il ritorno) e il
   * valore restituito.
   */
  function* chiama(f: Funzione, argomenti: readonly Espressione[], blocco: string): Generator<Pausa, Valore | VettoreRestituito | undefined, Riga> {
    const parametri = f.data.filter((d) => d.parameter !== undefined);
    const dati: { valore?: Valore; copia?: readonly (Valore | undefined)[]; cella?: Cella; scritto?: string; origine?: Origine }[] = [];
    for (const [k, a] of argomenti.entries()) {
      const d = parametri[k]!;
      if (d.parameter !== "value") {
        const { cella: c, i, pezzo } = yield* destinazione(a);
        // Un elemento di un vettore o di una matrice, o un campo di un record: una cella di un elemento dentro quella di chi
        // chiama; una riga di una matrice: la sua cella, un vettore dentro quella della matrice.
        const radice = (x: Espressione): string => (x.genere === "nome" ? x.nome : radice((x as { base: Espressione }).base));
        const nome = radice(a);
        // Il dato vero: quello di chi chiama, o quello che riceve il suo parametro per riferimento, risalendo.
        const suo = qui.origini[qui.funzione.data.findIndex((x) => x.name === nome)] ?? { nome, livello: profondita };
        if (pezzo === undefined) dati.push({ cella: c, scritto: nome, origine: suo });
        else {
          const { size: _, columns: __, ...semplice } = datoDelPezzo(c.dato, i);
          const ricevuta = c instanceof RigaDi ? c : new ElementoDi(c, i, semplice);
          dati.push({ cella: ricevuta, scritto: `${nome}${pezzo}`, origine: { nome: `${suo.nome}${pezzo}`, livello: suo.livello } });
        }
      } else if (d.size !== undefined || d.type === "record") dati.push({ copia: yield* elementiDi(a) });
      else {
        const valore = conChiamate.has(a) ? yield* calcola(a) : valuta(a);
        if (valore.tipo === "string" && valore.v.length > (d.max_length ?? lunghezzaPredefinita)) ferma("string_too_long");
        dati.push({ valore });
      }
    }
    corrente = blocco;
    const alias = dati.flatMap((x) => (x.cella === undefined ? [] : [doveArriva(x.cella)]));
    for (const [k, x] of alias.entries()) if (alias.slice(0, k).some((y) => y.vettore === x.vettore && y.da < x.a && x.da < y.a)) ferma("same_reference");
    // Un riferimento vuole il valore (un vettore intero almeno in un elemento); un parametro per uscita parte senza, anche
    // se il dato di chi chiama ne ha uno: la sua cella si svuota.
    parametri.forEach((d, k) => {
      const c = dati[k]!.cella;
      if (c === undefined) return;
      if (d.parameter === "reference" && c.valori.every((v) => v === undefined)) ferma("reference_without_value");
    });
    // I tetti della ricorsione: le chiamate del giro, poi il loro spazio; prima che la cella di un *out* si svuoti.
    if (delGiro.has(f)) entraNelGiro(f);
    parametri.forEach((d, k) => {
      const c = dati[k]!.cella;
      if (c !== undefined && d.parameter === "out") c.valori = c.valori.map(() => undefined);
    });

    const chi = qui;
    const posizioneDi = new Map(parametri.map((d, k) => [d, k]));
    const riferimenti = f.data.map((d) => dati[posizioneDi.get(d) ?? -1]?.scritto);
    const origini = f.data.map((d) => dati[posizioneDi.get(d) ?? -1]?.origine);
    const nuova = cornice(f, (k) => dati[posizioneDi.get(f.data[k]!) ?? -1]?.cella, riferimenti, origini);
    parametri.forEach((d, k) => {
      const x = dati[k]!;
      const c = nuova.celle.get(d.name)!;
      if (x.copia !== undefined) c.valori = x.copia;
      else if (x.valore !== undefined) scriviIn(c, 0, x.valore);
    });
    pila.push(nuova);
    qui = nuova;
    profondita++;
    // Il salto: il ciclo che guida le chiamate mette in cima il corpo della funzione, e al ritorno riprende da qui col
    // valore restituito (`ritornato`).
    yield { salto: corpo(f) };
    const restituito = ritornato;
    if (nuova.delGiro) {
      chiamateDelGiro--;
      spazioInUso -= spazioDi.get(f)!;
    }
    profondita--;
    pila.pop();
    qui = chi;
    corrente = blocco;
    return restituito;
  }

  /** Ferma la chiamata di `f`, del giro, che porterebbe oltre un tetto della ricorsione: le chiamate in corso, poi lo
   * spazio dei loro dati. */
  function entraNelGiro(f: Funzione): void {
    if (chiamateDelGiro + 1 > tettoDelleChiamate(p)) ferma("recursion_too_deep");
    if (spazioInUso + spazioDi.get(f)! > spazioDellaPila) ferma("recursion_data_too_large");
  }

  /** I valori iniziali, le regole, la fine (il ritorno) e il valore restituito della funzione corrente. I valori iniziali
   * sono quelli dei suoi dati, mai dei parametri: la cella di un parametro per riferimento è quella di chi chiama, col
   * dato di chi chiama, e il suo valore iniziale c'è già stato. */
  function* corpo(f: Funzione): Generator<Pausa, Valore | VettoreRestituito | undefined, Riga> {
    const propri = qui.inOrdine.filter((_, k) => f.data[k]!.parameter === undefined);
    // Le costanti comuni ricevono il valore nella prima chiamata sola, anche quando la radice richiama sé stessa.
    for (const c of qui === pila[0] ? [...comuni, ...propri] : propri) yield* valoreIniziale(c, f);
    yield* sequenza(f.body);
    yield evento(f.end.id);
    if (f.kind !== "function") return undefined;
    // Un vettore torna come copia dei suoi elementi, un record dei suoi campi; una stringa più lunga della lunghezza
    // massima si ferma sulla fine, anche se è un elemento del vettore (i campi hanno già la lunghezza del record).
    if (f.return_size !== undefined || f.return_type === "record") {
      const elementi = yield* elementiDi(albero(f.end.return_value!));
      if (f.return_size !== undefined) {
        for (const v of elementi) if (v?.tipo === "string" && v.v.length > (f.return_max_length ?? lunghezzaPredefinita)) ferma("string_too_long");
      }
      return { elementi };
    }
    const v = yield* calcolaTesto(f.end.return_value!);
    if (v.tipo === "string" && v.v.length > (f.return_max_length ?? lunghezzaPredefinita)) ferma("string_too_long");
    return f.return_type === "real" && v.tipo === "integer" ? { tipo: "real", v: v.v } : v;
  }

  /** Il valore iniziale di un dato, un'azione: l'evento col nome del dato e il blocco vuoto. Un errore lì cade su
   * «Inizio» (il blocco corrente resta la funzione). I valori iniziali sono letterali già controllati: non fermano. */
  function* valoreIniziale(c: Cella, f: Funzione): Generator<Pausa, void, Riga> {
    const iniziale = c.dato.initial;
    if (iniziale === undefined) return;
    if (++passi > tettoDeiPassi) throw oltreIPassi(f.id);
    yield { evento: "", dato: c.dato.name, ...(f.kind !== "main" ? { funzione: f.id } : {}), profondita, dati: fotografia() };
    // Le righe di una matrice (i record di una tabella) una dopo l'altra, come nella cella; il record ripetuto un campo
    // dopo l'altro in ogni record.
    const ognuno = Array.isArray(iniziale) || typeof iniziale === "string" ? undefined : (iniziale as { each: string | readonly string[] }).each;
    const letterali =
      typeof iniziale === "string"
        ? [iniziale]
        : Array.isArray(iniziale)
          ? (iniziale as readonly (string | readonly string[])[]).flat()
          : c.valori.map((_, i) => (typeof ognuno === "string" ? ognuno : ognuno![i % ognuno!.length]!));
    letterali.forEach((t, i) => scriviIn(c, i, valuta(albero(t))));
  }

  // ------------------------------------------------------------------------------- l'esecuzione

  /** Ciò che ha restituito l'ultima chiamata tornata: il ciclo che guida le chiamate lo mette qui, e chi aspettava lo
   * legge appena riprende. */
  let ritornato: Restituibile;

  /** Il ciclo che guida le chiamate: esegue il generatore in cima all'elenco, ne passa fuori i passi con le righe che
   * tornano, mette in cima quello di una funzione chiamata e, quando una funzione torna, riprende chi aspettava. Così la
   * pila del motore porta una chiamata sola alla volta, qualunque sia il numero di quelle in corso. */
  function* guida<R>(primo: Generator<Pausa, R, Riga>): Generator<Passo, R, Riga> {
    const inCorso: Generator<Pausa, Restituibile, Riga>[] = [];
    let risposta: Riga = undefined;
    for (;;) {
      const g = inCorso.at(-1) ?? primo;
      const r: IteratorResult<Pausa, R | Restituibile> = g.next(risposta);
      risposta = undefined;
      if (r.done) {
        if (inCorso.length === 0) return r.value as R;
        inCorso.pop();
        ritornato = r.value as Restituibile;
      } else if ("salto" in r.value) inCorso.push(r.value.salto);
      else risposta = yield r.value;
    }
  }

  qui = cornice(principale, () => undefined, principale.data.map(() => undefined), principale.data.map(() => undefined));
  pila.push(qui);
  /** Il programma, o la funzione eseguita da sola, coi parametri chiesti come letture e i risultati scritti alla fine. */
  function* programma(): Generator<Pausa, void, Riga> {
    // Da sola, i parametri come letture, nell'ordine; un vettore elemento per elemento, o tutti con una riga. Un parametro
    // per uscita non si chiede: parte comunque senza valore.
    for (const [k, d] of principale.data.entries()) {
      if (d.parameter === undefined || d.parameter === "out") continue;
      const c = qui.inOrdine[k]!;
      for (let i = 0; i < pezzi(d); i++) {
        const { valore, ognuno } = yield* leggiParametro(d, i);
        if (ognuno) {
          if (valore !== undefined) c.valori.forEach((_, j) => scriviIn(c, j, valore));
          break;
        }
        if (valore !== undefined) scriviIn(c, i, valore);
      }
    }
    // Una funzione del giro eseguita da sola è la prima chiamata: il suo spazio si conta dopo i parametri, come nel
    // programma di prova del C, dove la funzione si chiama dopo averli letti.
    if (qui.delGiro && spazioInUso > spazioDellaPila) ferma("recursion_data_too_large");
    const restituito = yield* corpo(principale);
    if (restituito !== undefined && "elementi" in restituito) {
      // Il nome di un elemento, o di un campo, senza quello del dato: `[0]`, `.nome`.
      const risultato: Dato = {
        name: "",
        type: principale.return_type!,
        ...(principale.return_record !== undefined ? { record: principale.return_record } : {}),
        ...(principale.return_size !== undefined ? { size: principale.return_size } : {}),
        ...(principale.return_columns !== undefined ? { columns: principale.return_columns } : {}),
      };
      for (const [i, v] of restituito.elementi.entries()) yield { scrive: `→ ${nomeDelPezzo(risultato, i)} = ${stampa(v ?? ferma("uninitialized"))}\n` };
    } else if (restituito !== undefined) yield { scrive: `→ ${stampa(restituito)}\n` };
    const riferimenti = principale.data.flatMap((d, k) => (d.parameter === "reference" || d.parameter === "out" ? [{ d, c: qui.inOrdine[k]! }] : []));
    if (riferimenti.length > 0) yield { scrive: "\n" };
    for (const { d, c } of riferimenti) for (const [i] of c.valori.entries()) yield { scrive: `${nomeDelPezzo(d, i)} = ${stampa(leggiDa(c, i))}\n` };
  }

  try {
    yield* guida(programma());
  } catch (e) {
    if (e instanceof Arresto) return { parte: true, dati: fotografia(), errore: { code: e.codice, block: e.blocco ?? corrente }, livello: e.livello ?? profondita };
    throw e;
  }
  return { parte: true, dati: fotografia() };
}
