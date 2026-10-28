// La tabella di traccia e la sua esportazione in CSV, nel nucleo: l'interfaccia
// la mostra, non la ricalcola.
//
// Una riga per azione, numerata dalla prima (1); i valori di ogni dato sono quelli DOPO l'azione, presi
// dalla fotografia che l'interprete dà all'evento seguente (o alla fine), mai ricalcolati; con l'esito
// della condizione, ciò che l'azione scrive e la riga letta. La riga 0 è «Inizio», coi valori prima della prima
// azione: ogni dato non inizializzato (le prime azioni sono i valori iniziali). Oltre `massimo` righe se ne
// tengono le ultime, con la numerazione vera, e si contano le tolte.
//
// Con procedure e funzioni la tabella è una sola: ogni riga ha il livello della sua azione (le chiamate attive),
// il salto e il ritorno sono righe (il blocco della chiamata, la fine della funzione chiamata), e dopo i dati della
// radice (il programma principale, o la funzione eseguita da sola) ogni funzione che si può chiamare ha il suo gruppo di
// colonne (i suoi dati, poi le posizioni dei suoi `per ogni`), vuote quando non è attiva; un parametro per riferimento
// mostra anche il dato di chi chiama, «5 (a)». Dopo il ritorno da una funzione chiamata dentro un'espressione l'azione di
// chi chiama riprende in una riga sua, col numero dell'azione e il segno della ripresa davanti alla regola: l'esito della
// condizione, lo scritto e i dati cambiati dopo il ritorno stanno lì, non sulla fine della funzione chiamata. Il CSV ha
// allora il livello dopo il numero, e il nome della funzione davanti a ogni colonna del suo gruppo.
//
// La tabella mostrata: una colonna per dato; un vettore nella forma scelta (le colonne dei primi dieci elementi
// e una per gli altri, che dice quali cambiano; in fila in una colonna sola; una colonna per elemento); un record una
// colonna per campo (`a.nome`), in ogni forma, nel gruppo del dato; la copia di un record col suo nome ha una riga per
// campo, con la regola del campo (`b.nome ← a.nome`); con i `per ogni`
// disegnati con la posizione, dopo i dati una colonna per livello con la posizione dell'elemento (`_indice`, `_indice2`),
// come la dà l'interprete. Un evento di un ciclo aperto ha per regola il testo del blocco della sua fase (la partenza, il
// controllo, l'elemento preso, l'aumento: la stessa funzione del disegno); di un ciclo chiuso, l'intestazione. Il CSV
// ha le stesse celle, o una colonna per elemento, col tipo accanto al nome; la regola è il testo del blocco come
// nel disegno (per un valore iniziale, quello del suo blocco sotto «Inizio», col valore ripetuto mostrato nel modo
// scelto; i valori delle celle non ne dipendono); nella riga del valore iniziale di un vettore la colonna degli
// altri ha i loro valori in un elenco tagliato come nel blocco; un reale coi decimali del progetto e il separatore dei decimali scelto, ogni altro valore come lo
// scrive il programma; le celle con il separatore, le virgolette o un a capo fra virgolette (RFC 4180); un a capo
// scritto dal programma col segno del disegno. UTF-8 col BOM (senza, Excel non legge le lettere accentate), righe
// chiuse da CR LF.

import {
  ELEMENTI_SCRITTI,
  funzioneChiamata,
  nomeDellaPosizione,
  partiDellaChiamata,
  partiDellElenco,
  partiDelCampoDellaCopia,
  partiDellaFase,
  testoDelBlocco,
  testoDelValoreIniziale,
  type FormeDeiCicli,
  type TestiDelDisegno,
  type ValoreRipetuto,
} from "../disegno/impaginazione";
import { funzioniDelGiro } from "../controllo/controllo";
import { funzioniChiamabili, testoDelValore, type FaseDelCiclo, type Fotografia, type FotografiaDiUnaChiamata, type Origine, type Restituito, type Valore } from "../interprete/interprete";
import { livelliDellePosizioni, nomiDeiVettori } from "../progetto/copia";
import { opzioniPredefinite, usaLeMatrici, type Blocco, type Dato, type Funzione, type Progetto, type Tipo } from "../progetto/modello";

export interface Riga {
  /** L'azione: per una ripresa, quella che riprende. */
  readonly numero: number;
  /** Il posto della riga fra tutte, dalla prima (1): unico anche quando una ripresa ripete il numero dell'azione. */
  readonly indice: number;
  /** L'azione di chi chiama riprende dopo il ritorno da una funzione chiamata nella sua espressione. */
  readonly ripresa?: true;
  /** Il blocco dell'azione; vuoto per il valore iniziale di un dato. */
  readonly blocco: string;
  /** Il dato, se l'azione è il suo valore iniziale. */
  readonly dato?: string;
  /** La parte del ciclo, in un ciclo `per` o `per ogni`. */
  readonly fase?: FaseDelCiclo;
  /** Nella copia di un record col suo nome, la posizione del campo copiato. */
  readonly campo?: number;
  /** Le chiamate attive durante l'azione: 0 nella radice. */
  readonly livello: number;
  /** La funzione dell'azione, se non è il programma principale. */
  readonly funzione?: string;
  /** I valori dopo l'azione. */
  readonly dati: Fotografia;
  /** Per ogni dato, elemento per elemento, se il valore è diverso da prima dell'azione. */
  readonly cambiati: readonly (readonly boolean[])[];
  /** Con i `per ogni`: per ogni livello, se la posizione è diversa da prima dell'azione. */
  readonly posizioniCambiate?: readonly boolean[];
  /** Con le funzioni che si possono chiamare: per ogni chiamata attiva, nell'ordine di `Fotografia.chiamate`, come
   * `cambiati` (appena saltati, ogni elemento con un valore). */
  readonly chiamateCambiate?: readonly (readonly (readonly boolean[])[])[];
  /** Con le funzioni che si possono chiamare, per ogni chiamata attiva nello stesso ordine: coi `per ogni`, per livello,
   * se la posizione è diversa da prima dell'azione (appena saltati, se ce n'è una). */
  readonly posizioniDelleChiamate?: readonly (readonly boolean[] | undefined)[];
  readonly condizione?: boolean;
  readonly scrive?: string;
  readonly letto?: string;
  /** Solo in una ripresa: il valore che la funzione chiamata ha appena restituito. */
  readonly restituito?: Restituito;
}

/** Ciò che una riga ha dall'evento che la apre: una ripresa lo copia dall'azione che riprende. */
type Azione = { numero: number; blocco: string; dato?: string; fase?: FaseDelCiclo; campo?: number; livello: number; funzione?: string };
type Aperta = Azione & { ripresa?: true; condizione?: boolean; scrive?: string; letto?: string; restituito?: Restituito };

const uguali = (a: Valore | undefined, b: Valore | undefined): boolean => {
  if (a === b) return true;
  if (a === undefined || b === undefined || a.tipo !== b.tipo) return false;
  if (a.tipo === "string") {
    const w = b.v as readonly number[];
    return a.v.length === w.length && a.v.every((c, i) => c === w[i]);
  }
  // `Object.is`: 0 e -0 sono due valori (il reale «-0.00» si scrive col segno), NaN uno solo.
  return Object.is(a.v, b.v);
};

const nessunCambio = new Map<number, readonly boolean[]>();
const fermi = (n: number): readonly boolean[] => {
  let f = nessunCambio.get(n);
  if (f === undefined) nessunCambio.set(n, (f = Object.freeze(Array<boolean>(n).fill(false))));
  return f;
};

/** Per la fotografia di una chiamata, l'elenco di «nessun cambio» di ogni suo dato: uno solo, condiviso dalle righe in cui
 * la chiamata resta la stessa. */
const nessunCambioDi = new WeakMap<FotografiaDiUnaChiamata, readonly (readonly boolean[])[]>();

/** Gli elementi cambiati di una chiamata attiva: rispetto a prima se era la stessa chiamata, altrimenti (appena
 * saltati) ogni elemento con un valore. La fotografia rimasta la stessa (l'interprete la rifà solo se una sua cella è
 * cambiata) non ha cambi: con molte chiamate in corso quasi tutte sono così, e a ogni riga non si rifà nulla per loro. */
const cambiatiInUnaChiamata = (c: FotografiaDiUnaChiamata, prima: FotografiaDiUnaChiamata | undefined): readonly (readonly boolean[])[] => {
  if (c === prima) {
    let f = nessunCambioDi.get(c);
    if (f === undefined) nessunCambioDi.set(c, (f = Object.freeze(c.valori.map((elementi) => fermi(elementi.length)))));
    return f;
  }
  return c.valori.map((elementi, d) => {
    if (prima === undefined || prima.numero !== c.numero) return elementi.map((v) => v !== undefined);
    return elementi === prima.valori[d] ? fermi(elementi.length) : elementi.map((v, i) => !uguali(v, prima.valori[d]![i]));
  });
};

/** Le posizioni cambiate di una chiamata attiva coi `per ogni`: rispetto a prima se era la stessa chiamata, altrimenti
 * (appena saltati) quelle che ci sono. */
const posizioniInUnaChiamata = (c: FotografiaDiUnaChiamata, prima: FotografiaDiUnaChiamata | undefined): readonly boolean[] | undefined =>
  c.posizioni?.map((q, l) => (prima === undefined || prima.numero !== c.numero ? q !== undefined : q !== prima.posizioni?.[l]));

/** Quante righe tengono la tabella di traccia e la console, se chi esegue non dice altro: le ultime. */
export const righeTenute = 1000;

export class Traccia {
  #iniziali: Fotografia | undefined;
  #ultimi: Fotografia | undefined;
  #tenute: Riga[] = [];
  /** Le righe chiuse, e le azioni cominciate: una ripresa è una riga ma non un'azione. */
  #chiuse = 0;
  #azioni = 0;
  #aperta: Aperta | undefined;
  /** Per ogni livello attivo, l'ultima azione cominciata lì: quella che una ripresa a quel livello riprende. */
  #perLivello: Azione[] = [];

  constructor(readonly massimo = righeTenute) {}

  /** I valori prima della prima azione (la riga 0, «Inizio»). */
  get valoriIniziali(): Fotografia | undefined {
    return this.#iniziali;
  }

  /** Le righe delle azioni già fatte, le ultime `massimo`. */
  get righe(): readonly Riga[] {
    return this.#tenute.length > this.massimo ? this.#tenute.slice(-this.massimo) : this.#tenute;
  }

  /** La riga aperta se è una ripresa (la pausa sulla ripresa, dopo un ritorno): il valore appena restituito c'è già, anche
   * se la riga entra nella tabella solo quando si chiude. */
  get ripresaAperta(): Pick<Riga, "numero" | "blocco" | "ripresa" | "restituito"> | undefined {
    const a = this.#aperta;
    return a?.ripresa ? { numero: a.numero, blocco: a.blocco, ripresa: true, ...(a.restituito !== undefined ? { restituito: a.restituito } : {}) } : undefined;
  }

  /** Quante righe delle prime azioni non sono più tenute. */
  get tolte(): number {
    return this.#chiuse - Math.min(this.#tenute.length, this.massimo);
  }

  /** Un evento: chiude la riga dell'azione precedente coi valori di adesso e apre quella di questa azione (il
   * valore iniziale di `dato`, se c'è; la parte del ciclo, in un ciclo; il livello; la funzione, se non è il programma
   * principale; la posizione del campo, nella copia di un record). */
  evento(blocco: string, dati: Fotografia, dato?: string, fase?: FaseDelCiclo, livello = 0, funzione?: string, campo?: number): void {
    if (this.#iniziali === undefined) this.#iniziali = this.#ultimi = dati;
    else this.#chiudi(dati);
    const azione: Azione = {
      numero: ++this.#azioni,
      blocco,
      ...(dato !== undefined ? { dato } : {}),
      ...(fase !== undefined ? { fase } : {}),
      ...(campo !== undefined ? { campo } : {}),
      livello,
      ...(funzione !== undefined ? { funzione } : {}),
    };
    this.#perLivello.length = livello;
    this.#perLivello.push(azione);
    this.#aperta = { ...azione };
  }

  /** Il ritorno da una funzione chiamata in un'espressione: chiude la riga coi valori di adesso e apre quella della
   * ripresa dell'azione di chi chiama, al suo livello, col suo numero e col valore restituito. */
  ripresa(dati: Fotografia, livello: number, restituito?: Restituito): void {
    const azione = this.#perLivello[livello];
    if (azione === undefined) return;
    this.#chiudi(dati);
    this.#perLivello.length = livello + 1;
    this.#aperta = { ...azione, ripresa: true, ...(restituito !== undefined ? { restituito } : {}) };
  }

  condizione(vero: boolean): void {
    if (this.#aperta) this.#aperta.condizione = vero;
  }

  scrive(testo: string): void {
    if (this.#aperta) this.#aperta.scrive = (this.#aperta.scrive ?? "") + testo;
  }

  letto(riga: string): void {
    if (this.#aperta) this.#aperta.letto = riga;
  }

  /** La fine dell'esecuzione, con o senza errore: chiude l'ultima riga coi valori finali. */
  fine(dati: Fotografia): void {
    this.#chiudi(dati);
  }

  /** L'esecuzione interrotta senza i valori finali: l'ultima riga si chiude coi valori dell'evento che l'ha aperta. */
  interrotta(): void {
    if (this.#ultimi) this.#chiudi(this.#ultimi);
  }

  #chiudi(dati: Fotografia): void {
    const a = this.#aperta;
    if (a === undefined) return;
    const prima = this.#ultimi!.valori;
    // Un dato che la fotografia non ha toccato è lo stesso oggetto di prima: nessun confronto, e un elenco di
    // «no» condiviso (un vettore lungo in un ciclo lungo non costa un elenco per riga).
    const cambiati = dati.valori.map((elementi, d) => (elementi === prima[d] ? fermi(elementi.length) : elementi.map((v, i) => !uguali(v, prima[d]![i]))));
    const posizioni = this.#ultimi!.posizioni;
    const posizioniCambiate = dati.posizioni?.map((q, l) => q !== posizioni?.[l]);
    const chiamate = this.#ultimi!.chiamate;
    // Ogni chiamata col suo stato di prima: la stessa chiamata, cioè lo stesso numero, che di solito sta allo stesso
    // livello (cercarla in tutta la pila a ogni evento costa il quadrato delle chiamate in corso).
    const primaDi = (c: FotografiaDiUnaChiamata, k: number) => (chiamate?.[k]?.numero === c.numero ? chiamate[k] : chiamate?.find((x) => x.numero === c.numero));
    const chiamateCambiate = dati.chiamate?.map((c, k) => cambiatiInUnaChiamata(c, primaDi(c, k)));
    const posizioniDelleChiamate = dati.chiamate?.some((c) => c.posizioni !== undefined) ? dati.chiamate.map((c, k) => posizioniInUnaChiamata(c, primaDi(c, k))) : undefined;
    this.#tenute.push({
      ...a,
      indice: ++this.#chiuse,
      dati,
      cambiati,
      ...(posizioniCambiate ? { posizioniCambiate } : {}),
      ...(chiamateCambiate ? { chiamateCambiate } : {}),
      ...(posizioniDelleChiamate ? { posizioniDelleChiamate } : {}),
    });
    this.#aperta = undefined;
    this.#ultimi = dati;
    // Si taglia ogni `massimo` righe in più, non a ogni riga: un taglio costa quanto le righe tenute.
    if (this.#tenute.length >= 2 * this.massimo) this.#tenute = this.#tenute.slice(-this.massimo);
  }
}

// ---------------------------------------------------------------------------------------- il CSV

export interface Separatori {
  /** Fra una cella e l'altra. */
  readonly campo: string;
  /** Fra la parte intera e i decimali di un reale. */
  readonly decimali: string;
}

/** I separatori predefiniti di ogni lingua dell'interfaccia: in italiano il CSV si apre col doppio clic in Excel. */
export const separatoriPredefiniti = {
  it: { campo: ";", decimali: "," },
  en: { campo: ",", decimali: "." },
} as const satisfies Record<string, Separatori>;

/** Le parole della tabella, nella lingua dell'interfaccia; quelle del disegno servono alla regola. */
export interface TestiDellaTraccia extends TestiDelDisegno {
  readonly numero: string;
  /** La colonna del livello, nel CSV di un progetto con funzioni che si possono chiamare. */
  readonly livello: string;
  readonly regola: string;
  /** Davanti al valore restituito, nella regola della fine di una funzione. */
  readonly restituisce: string;
  /** Davanti alla regola della ripresa di un'azione, dopo il ritorno da una funzione chiamata nella sua espressione. */
  readonly ripresa: string;
  /** Dopo la regola della ripresa, se la tabella lo mostra, il valore restituito: un modello con `{funzione}` e
   * `{valore}`. */
  readonly restituito: string;
  readonly condizione: string;
  readonly scrive: string;
  readonly nonInizializzata: string;
  /** Il segno davanti alla riga letta. */
  readonly letto: string;
  readonly tipi: Readonly<Record<Tipo, string>>;
  /** Le frasi della riga sopra la tabella, quando un vettore non ha una colonna per elemento. */
  readonly spiegazione: {
    /** Un vettore oltre il tetto con le colonne dei primi elementi: `colonna` è il nome di quella degli altri. */
    readonly primiEAltri: (nome: string, elementi: number, primi: number, colonna: string) => string;
    readonly inFila: (nome: string, elementi: number) => string;
    readonly csvUguale: string;
    readonly csvPerElemento: string;
  };
}

// ------------------------------------------------------------------- la tabella come si mostra

/** Quante colonne ha al più un vettore nella forma coi primi elementi: gli altri stanno in una colonna sola. */
export const tettoDelleColonne = 10;

/**
 * Come si mostra un vettore (la stessa forma per tutti i vettori del progetto):
 * - `primi-e-altri`: una colonna per ciascuno dei primi `tettoDelleColonne` elementi, poi una colonna sola per gli
 *   altri, che nella riga in cui uno o più di loro cambiano dice quali e il nuovo valore; un vettore di al più
 *   `tettoDelleColonne` elementi ha una colonna per elemento;
 * - `in-fila`: una colonna sola, gli elementi in fila;
 * - `per-elemento`: una colonna per elemento (quella del CSV con tutti gli elementi).
 */
export type FormaDeiVettori = "primi-e-altri" | "in-fila" | "per-elemento";

/** Il CSV: le stesse celle della tabella mostrata, o una colonna per elemento. */
export type FormaDelCsv = "uguale" | "per-elemento";

/** Fra due elementi in fila, e fra due elementi cambiati nella colonna degli altri. */
const fraGliElementi = " · ";
/** Un elemento senza valore, in fila: la parola intera ripetuta non si leggerebbe. */
const senzaValore = "–";

/** La colonna di un valore: il nome del dato (`v[2]` per un elemento di un vettore, `v[10…59]` per gli altri, `v[10]`
 * se l'altro è uno solo, `v` per il vettore in fila) e il suo tipo; `gruppo`, il dato a cui appartiene (le colonne di un
 * vettore hanno lo stesso), o il nome della colonna della posizione. */
export interface ColonnaDiUnValore {
  readonly nome: string;
  readonly tipo: string;
  readonly gruppo: string;
  /** Il nome della funzione, per una colonna del gruppo di una funzione che si può chiamare. */
  readonly funzione?: string;
}

/** Un valore in una riga: il testo come nel CSV, e se è «non inizializzata» o è cambiato con l'azione. */
export interface CellaDiUnValore {
  readonly testo: string;
  readonly nonInizializzata: boolean;
  readonly cambiata: boolean;
  /** Nella colonna di un vettore in fila: il testo a pezzi (uniti, sono `testo`), coi pezzi degli elementi cambiati
   * segnati. */
  readonly pezzi?: readonly { readonly testo: string; readonly cambiato: boolean }[];
}

/** Ciò che il watch mostra di un dato: il nome, il tipo della vista dei dati e i valori della riga corrente della
 * tabella, uno per elemento (uno solo se il dato non è un vettore), col nome della colonna; per un parametro per
 * riferimento o per uscita, il dato che lo riceve davvero, col suo livello (`origine`, dalla fotografia); per un dato di
 * una funzione con più chiamate in corso, il livello della chiamata mostrata e quanti sono i livelli. */
export interface DatoNelWatch {
  readonly nome: string;
  readonly tipo: string;
  readonly vettore: boolean;
  /** Un record: i valori sono i suoi campi, uno per riga. */
  readonly record?: true;
  readonly elementi: readonly { readonly nome: string; readonly cella: CellaDiUnValore }[];
  readonly origine?: Origine;
  readonly livello?: { readonly di: number; readonly su: number };
}

/** Ciò che il watch mostra del nome di una funzione chiamata in un blocco: il nome, il tipo del risultato e i valori che
 * ha restituito nell'ultima azione di quel blocco che l'ha chiamata, una voce per chiamata nell'ordine in cui sono
 * finite, ognuna coi suoi elementi (uno solo se il risultato non è un vettore). Letti dalle righe della ripresa. */
export interface ChiamataNelWatch {
  readonly nome: string;
  readonly tipo: string;
  readonly vettore: boolean;
  /** Un record restituito: i valori sono i suoi campi. */
  readonly record?: true;
  readonly chiamate: readonly (readonly { readonly nome: string; readonly cella: CellaDiUnValore }[])[];
}

/** Una riga come si mostra e come si esporta: ogni cella col suo testo, mai ricalcolato altrove. */
export interface RigaMostrata {
  /** L'azione (0 per «Inizio»); una ripresa ha il numero dell'azione che riprende. */
  readonly numero: number;
  /** Unica fra le righe: il posto della riga (0 per «Inizio»). */
  readonly chiave: number;
  readonly ripresa: boolean;
  /** Le chiamate attive durante l'azione: 0 nella radice (e nella riga 0). */
  readonly livello: number;
  readonly regola: string;
  readonly valori: readonly CellaDiUnValore[];
  /** Per ogni gruppo di una funzione che si può chiamare (`TabellaMostrata.gruppi`, dopo la radice), se è attiva. */
  readonly attive: readonly boolean[];
  readonly condizione: string;
  readonly scrive: string;
}

/** Le colonne della radice (i suoi dati, poi le posizioni dei suoi `per ogni`) o di una funzione che si può chiamare (il suo
 * `id` e il suo nome; per la radice, solo se è una funzione eseguita da sola), contigue nell'ordine del nucleo: dalla
 * colonna `da`, `colonne` colonne. */
export interface GruppoDiColonne {
  readonly funzione?: string;
  readonly nome?: string;
  readonly da: number;
  readonly colonne: number;
}

interface DatoMostrato {
  readonly nome: string;
  /** Il tipo della vista dei dati; per un record, il suo nome. */
  readonly tipo: string;
  /** Gli elementi, se è un vettore. */
  readonly elementi?: number;
  /** I campi col loro tipo, se è un record. */
  readonly campi?: readonly { readonly nome: string; readonly tipo: string }[];
}

/**
 * La tabella di traccia di un progetto come la vede l'utente, nella sua lingua, col separatore dei decimali e la
 * forma dei vettori scelti: la finestra la mostra, il CSV la esporta, con gli stessi testi. Le costanti comuni
 * per prime. Le righe delle azioni si calcolano una volta: ogni comando ne aggiunge alcune, e quelle già viste
 * restano le stesse.
 */
export class TabellaMostrata {
  readonly colonne: readonly ColonnaDiUnValore[];
  /** La radice, poi una funzione che si può chiamare dopo l'altra: tutte le colonne, ognuna in un gruppo. */
  readonly gruppi: readonly GruppoDiColonne[];
  readonly #progetto: Progetto;
  readonly #dati: readonly DatoMostrato[];
  /** I dati di ogni funzione che si può chiamare, nell'ordine di `Fotografia.chiamate`. */
  readonly #chiamate: readonly (readonly DatoMostrato[])[];
  /** Gli `id` di quelle funzioni, nello stesso ordine. */
  readonly #idDelleChiamate: readonly string[];
  readonly #regola: (r: Riga) => string;
  readonly #valore: (v: Valore | undefined) => string;
  readonly #testi: TestiDellaTraccia;
  readonly #decimali: string;
  readonly #fatte = new WeakMap<Riga, RigaMostrata>();
  /** Quante colonne della posizione: i livelli dei `per ogni` della radice, se sono disegnati con la posizione. */
  readonly #posizioni: number;
  /** Lo stesso per ogni funzione che si può chiamare, nell'ordine di `#chiamate`. */
  readonly #posizioniDelleChiamate: readonly number[];
  /** Quante costanti comuni: le prime dei dati della radice. */
  readonly #comuni: number;
  /** La radice è una funzione eseguita da sola che richiama sé stessa: le sue chiamate oltre la prima sono fra quelle
   * della fotografia, e il suo gruppo mostra la più profonda, come quello di una funzione chiamata. */
  readonly #radiceDelGiro: boolean;

  /** `ripetuto`: come la regola del valore iniziale di un vettore mostra il valore ripetuto, come il suo blocco; `cicli`:
   * le forme dei cicli nel disegno, che danno la regola di un evento di un ciclo e le colonne della posizione (modi
   * dell'interfaccia: i valori delle celle non ne dipendono); `radice`: l'`id` della procedura o della funzione eseguita
   * da sola, o nessuno per il programma principale. */
  constructor(
    p: Progetto,
    testi: TestiDellaTraccia,
    separatoreDeiDecimali: string,
    readonly forma: FormaDeiVettori,
    readonly ripetuto: ValoreRipetuto,
    readonly cicli: FormeDeiCicli,
    readonly radice?: string,
    /** La riga della ripresa dice il valore restituito dalla funzione chiamata. */
    readonly restituitoNellaRipresa = false,
  ) {
    // Le forme della matrice nella tabella non ci sono ancora: un progetto con le matrici non arriva qui (l'apertura
    // nell'interfaccia lo rifiuta), e chi ce lo porta lo sa subito.
    if (usaLeMatrici(p)) throw new Error("la tabella di traccia non mostra ancora le matrici");
    const main = p.functions.find((f) => f.kind === "main")!;
    const principale = radice === undefined ? main : p.functions.find((f) => f.id === radice)!;
    const comuni = p.shared_constants ?? [];
    const decimali = p.options?.real_decimals ?? opzioniPredefinite.real_decimals;
    // Ogni blocco e ogni fine con la sua funzione: gli `id` sono unici nel progetto.
    const blocchi = new Map<string, { blocco: Blocco; funzione: Funzione }>();
    const fini = new Map(p.functions.map((f) => [f.end.id, f]));
    for (const f of p.functions) {
      const visita = (b: Blocco) => {
        blocchi.set(b.id, { blocco: b, funzione: f });
        if (b.kind === "if") [...b.then, ...b.else].forEach(visita);
        if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") b.body.forEach(visita);
      };
      f.body.forEach(visita);
    }
    const perId = new Map(p.functions.map((f) => [f.id, f]));
    /** I dati che le regole di una funzione vedono: le costanti comuni e i suoi. */
    const datiDi = (f: Funzione): readonly Dato[] => [...comuni, ...f.data];
    /** I livelli delle posizioni nascoste di ogni funzione (i `per ogni` e le copie col nome), una volta per funzione. */
    const livelli = new Map(p.functions.map((f) => [f.id, livelliDellePosizioni(f.body, nomiDeiVettori(datiDi(f)))]));
    this.#progetto = p;
    this.#testi = testi;
    this.#decimali = separatoreDeiDecimali;
    // La regola di un valore iniziale è il testo del suo blocco, e quella di un evento di un ciclo aperto il testo del
    // blocco della sua fase, dalle stesse funzioni del disegno; la fine di una funzione dice il valore restituito; il salto
    // si scrive come nel disegno, con la freccia e *rif*; una ripresa ha davanti il suo segno.
    const regola = (r: Riga): string => {
      if (r.dato !== undefined) return testoDelValoreIniziale(datiDi(r.funzione !== undefined ? perId.get(r.funzione)! : main).find((d) => d.name === r.dato)!, testi, ripetuto)!;
      const fine = fini.get(r.blocco);
      if (fine !== undefined) return fine.kind === "function" ? `${testi.restituisce} ${(testi.espressione ?? ((t: string) => t))(fine.end.return_value!)}` : testi.fine;
      const { blocco: b, funzione: f } = blocchi.get(r.blocco)!;
      // Un campo della copia di un record: l'assegnazione di quel campo.
      if (r.campo !== undefined && b.kind === "assignment") {
        const campo = campiDelRecord(datiDi(f).find((d) => d.name === b.target.trim())!, p)![r.campo]!.name;
        return partiDelCampoDellaCopia(b, campo, testi)
          .map((q) => q.testo)
          .join("");
      }
      if (b.kind === "call") return partiDellaChiamata(b, funzioneChiamata(p.functions, b.callee), testi).map((q) => q.testo).join("");
      // Una fase di un'assegnazione è della copia di un vettore col suo nome.
      const ciclo = b.kind === "for" || b.kind === "for_each" || b.kind === "assignment";
      const fase = r.fase !== undefined && ciclo ? partiDellaFase(b, r.fase, cicli, testi, livelli.get(f.id)!.get(b.id) ?? 1, datiDi(f)) : undefined;
      return fase === undefined ? testoDelBlocco(b, testi) : fase.map((q) => q.testo).join("");
    };
    // La ripresa dice anche il valore che la funzione ha restituito, se la tabella lo mostra: gli elementi di un vettore
    // in fila.
    const restituito = (r: Riga): string => {
      if (!restituitoNellaRipresa || r.restituito === undefined) return "";
      const valore = this.valoreRestituito(r.restituito);
      // Con una funzione come sostituto: un `$` nel valore resta com'è (una stringa lo leggerebbe come un modello).
      return testi.restituito.replace("{funzione}", () => perId.get(r.restituito!.funzione)!.name!).replace("{valore}", () => valore);
    };
    this.#regola = (r) => (r.ripresa ? `${testi.ripresa}${regola(r)}${restituito(r)}` : regola(r));
    // Le colonne della posizione fino al livello più alto fra quelli disegnati con la posizione: i `per ogni` aperti con
    // la posizione, le copie espanse.
    const mostrata = (id: string) => (blocchi.get(id)!.blocco.kind === "for_each" ? cicli.perOgni === "posizione" : cicli.copia === "espansa");
    const posizioniDi = (f: Funzione) => Math.max(0, ...[...livelli.get(f.id)!].flatMap(([id, l]) => (mostrata(id) ? [l] : [])));
    this.#posizioni = posizioniDi(principale);
    this.#valore = (v) => {
      if (v === undefined) return testi.nonInizializzata;
      const testo = testoDelValore(v, decimali);
      return v.tipo === "real" ? testo.replace(".", separatoreDeiDecimali) : testo;
    };
    const mostrato = (d: Dato): DatoMostrato => {
      const campi = campiDelRecord(d, p);
      if (campi !== undefined) return { nome: d.name, tipo: d.record!, campi: campi.map((c) => ({ nome: c.name, tipo: testi.tipi[c.type] })) };
      return { nome: d.name, tipo: testi.tipi[d.type as Tipo], ...(d.size !== undefined ? { elementi: d.size } : {}) };
    };
    this.#dati = datiDi(principale).map(mostrato);
    this.#comuni = comuni.length;
    this.#radiceDelGiro = radice !== undefined && funzioniDelGiro(p).has(principale);
    const chiamabili = funzioniChiamabili(p, radice);
    this.#chiamate = chiamabili.map((f) => f.data.map(mostrato));
    this.#idDelleChiamate = chiamabili.map((f) => f.id);
    this.#posizioniDelleChiamate = chiamabili.map(posizioniDi);
    const colonneDi = (d: DatoMostrato, funzione?: string): ColonnaDiUnValore[] => {
      const n = d.elementi;
      const gruppo = funzione === undefined ? d.nome : `${funzione} › ${d.nome}`;
      const colonna = (nome: string, tipo = d.tipo) => ({ nome, tipo, gruppo, ...(funzione !== undefined ? { funzione } : {}) });
      if (d.campi !== undefined) return d.campi.map((c) => colonna(`${d.nome}.${c.nome}`, c.tipo));
      if (n === undefined || forma === "in-fila") return [colonna(d.nome)];
      const elemento = (i: number) => colonna(`${d.nome}[${i}]`);
      if (forma === "per-elemento" || n <= tettoDelleColonne) return Array.from({ length: n }, (_, i) => elemento(i));
      return [...Array.from({ length: tettoDelleColonne }, (_, i) => elemento(i)), colonna(nomeDegliAltri(d.nome, n))];
    };
    const posizioni = (n: number, funzione?: string): ColonnaDiUnValore[] =>
      Array.from({ length: n }, (_, l) => {
        const nome = nomeDellaPosizione(testi, l + 1);
        return { nome, tipo: testi.tipi.integer, gruppo: funzione === undefined ? nome : `${funzione} › ${nome}`, ...(funzione !== undefined ? { funzione } : {}) };
      });
    const radiceDi = [...this.#dati.flatMap((d) => colonneDi(d)), ...posizioni(this.#posizioni)];
    const delleChiamate = this.#chiamate.map((dati, k) => [...dati.flatMap((d) => colonneDi(d, chiamabili[k]!.name!)), ...posizioni(this.#posizioniDelleChiamate[k]!, chiamabili[k]!.name!)]);
    this.colonne = [...radiceDi, ...delleChiamate.flat()];
    let da = radiceDi.length;
    this.gruppi = [
      { ...(radice !== undefined ? { funzione: radice, nome: principale.name! } : {}), da: 0, colonne: radiceDi.length },
      ...delleChiamate.map((c, k) => {
        const g = { funzione: chiamabili[k]!.id, nome: chiamabili[k]!.name!, da, colonne: c.length };
        da += c.length;
        return g;
      }),
    ];
  }

  /** Il progetto ha funzioni che si possono chiamare, o la radice richiama sé stessa: le righe hanno un livello, e la
   * tabella i gruppi delle funzioni. */
  get conChiamate(): boolean {
    return this.#chiamate.length > 0 || this.#radiceDelGiro;
  }

  /** Le parole della tabella (l'intestazione del CSV). */
  get testi(): TestiDellaTraccia {
    return this.#testi;
  }

  /** Il valore che una funzione ha restituito, come lo scrive la riga della ripresa: gli elementi di un vettore in fila. */
  valoreRestituito(r: Restituito): string {
    const v = r.valore;
    return "elementi" in v ? v.elementi.map((x) => this.#valore(x)).join(fraGliElementi) : this.#valore(v);
  }

  /** La stessa tabella in un'altra forma (il CSV con una colonna per elemento). */
  conForma(forma: FormaDeiVettori): TabellaMostrata {
    return forma === this.forma ? this : new TabellaMostrata(this.#progetto, this.#testi, this.#decimali, forma, this.ripetuto, this.cicli, this.radice, this.restituitoNellaRipresa);
  }

  /**
   * La riga sopra la tabella: che cosa si vede di ogni vettore che non ha una colonna per elemento (coi primi
   * elementi, quelli oltre il tetto; in fila, tutti) e che cosa ha il CSV. Nessuna se ogni elemento ha la sua
   * colonna.
   */
  spiegazione(csv: FormaDelCsv): string | undefined {
    const s = this.#testi.spiegazione;
    const frasi = this.#dati.flatMap((d) => {
      const n = d.elementi;
      if (n === undefined || this.forma === "per-elemento") return [];
      if (this.forma === "in-fila") return [s.inFila(d.nome, n)];
      return n > tettoDelleColonne ? [s.primiEAltri(d.nome, n, tettoDelleColonne, nomeDegliAltri(d.nome, n))] : [];
    });
    return frasi.length === 0 ? undefined : [...frasi, csv === "uguale" ? s.csvUguale : s.csvPerElemento].join(" ");
  }

  /** Il watch di un dato della radice o, con `funzione`, di una procedura o di una funzione chiamata (una costante comune
   * vale ovunque): tutti i suoi elementi, coi valori della riga corrente, cioè l'ultima della tabella (la riga 0 prima
   * della prima azione finita), in ogni forma; per un parametro per riferimento o per uscita anche il dato che lo riceve
   * davvero. Di una funzione con più chiamate in corso, quella al `livello` dato (1 la prima chiamata dopo la radice) se è
   * sua, altrimenti la più profonda, come il suo gruppo nella tabella. Nessuno per un nome che non è un dato di quella
   * funzione, per una funzione che non è attiva o prima della prima azione. */
  watch(t: Traccia, dato: string, funzione?: string, livello?: number): DatoNelWatch | undefined {
    const ultima = t.righe.at(-1);
    const f = ultima?.dati ?? t.valoriIniziali;
    if (f === undefined) return undefined;
    if ((funzione === undefined || funzione === this.radice) && this.#radiceDelGiro) return this.#watchDellaRadice(f, ultima, dato, livello);
    const k = funzione === undefined || funzione === this.radice ? -1 : this.#idDelleChiamate.indexOf(funzione);
    const scelta = livello === undefined ? -1 : livello - 1;
    const j = k < 0 ? -1 : f.chiamate?.[scelta]?.funzione === funzione ? scelta : this.#livelloDi(f, k);
    const chiamata = j < 0 ? undefined : f.chiamate![j];
    const suo = chiamata === undefined ? -1 : this.#chiamate[k]!.findIndex((d) => d.nome === dato);
    if (chiamata !== undefined && suo >= 0) {
      const d = this.#chiamate[k]![suo]!;
      const cambiati = ultima?.chiamateCambiate?.[j]?.[suo];
      const origine = chiamata.origini[suo];
      const sue = f.chiamate!.reduce((n, c) => (c.funzione === funzione ? n + 1 : n), 0);
      return {
        ...this.#nelWatch(d, chiamata.valori[suo]!, cambiati),
        ...(origine !== undefined ? { origine } : {}),
        ...(sue > 1 ? { livello: { di: j + 1, su: f.chiamate!.length } } : {}),
      };
    }
    // Nella radice ogni suo dato; in una chiamata attiva (che non ce l'ha fra i suoi) solo una costante comune.
    const nellaRadice = funzione === undefined || funzione === this.radice;
    if (!nellaRadice && (k < 0 || chiamata === undefined)) return undefined;
    const indice = this.#dati.findIndex((d, i) => d.nome === dato && (nellaRadice || i < this.#comuni));
    if (indice < 0) return undefined;
    return this.#nelWatch(this.#dati[indice]!, f.valori[indice]!, ultima?.cambiati[indice]);
  }

  /** Il watch di un dato della radice che richiama sé stessa: la chiamata al `livello` dato (0 la prima) se è sua,
   * altrimenti la più profonda; una costante comune vale ovunque. */
  #watchDellaRadice(f: Fotografia, ultima: Riga | undefined, dato: string, livello?: number): DatoNelWatch | undefined {
    const indice = this.#dati.findIndex((d) => d.nome === dato);
    if (indice < 0) return undefined;
    if (indice < this.#comuni) return this.#nelWatch(this.#dati[indice]!, f.valori[indice]!, ultima?.cambiati[indice]);
    const sua = (j: number) => f.chiamate?.[j]?.funzione === this.radice;
    const j = livello === 0 ? -1 : livello !== undefined && sua(livello - 1) ? livello - 1 : this.#livelloDellaRadice(f);
    const sue = 1 + (f.chiamate?.filter((c) => c.funzione === this.radice).length ?? 0);
    const conIlLivello = sue > 1 ? { livello: { di: j + 1, su: f.chiamate!.length } } : {};
    if (j < 0) return { ...this.#nelWatch(this.#dati[indice]!, f.valori[indice]!, ultima?.cambiati[indice]), ...conIlLivello };
    const d = indice - this.#comuni;
    const chiamata = f.chiamate![j]!;
    const origine = chiamata.origini[d];
    return { ...this.#nelWatch(this.#dati[indice]!, chiamata.valori[d]!, ultima?.chiamateCambiate?.[j]?.[d]), ...(origine !== undefined ? { origine } : {}), ...conIlLivello };
  }

  /** Il watch del nome di una funzione (`nome`) nel blocco `blocco`: i valori che ha restituito nell'ultima azione di
   * quel blocco che l'ha chiamata (una ripresa per chiamata, nell'ordine), fra le righe tenute e la ripresa aperta (la
   * pausa sulla ripresa); nessun valore prima della prima chiamata finita lì. Nessuno per un nome che non è una funzione
   * che restituisce un valore. */
  chiamata(t: Traccia, nome: string, blocco: string): ChiamataNelWatch | undefined {
    const f = this.#progetto.functions.find((g) => g.kind === "function" && g.name === nome);
    if (f === undefined) return undefined;
    const aperta = t.ripresaAperta;
    const righe: readonly Pick<Riga, "numero" | "blocco" | "ripresa" | "restituito">[] = aperta === undefined ? t.righe : [...t.righe, aperta];
    const di = (r: Pick<Riga, "blocco" | "ripresa" | "restituito">) => r.ripresa === true && r.blocco === blocco && r.restituito?.funzione === f.id;
    const ultima = righe.findLast(di);
    const vettore = f.return_size !== undefined;
    const campi = campiDelRecord({ type: f.return_type!, ...(f.return_record !== undefined ? { record: f.return_record } : {}) }, this.#progetto);
    const chiamate = righe
      .filter((r) => di(r) && r.numero === ultima?.numero)
      .map((r) => {
        const v = r.restituito!.valore;
        const elementi = "elementi" in v ? v.elementi : [v];
        return elementi.map((x, i) => ({ nome: vettore ? `[${i}]` : campi !== undefined ? `.${campi[i]!.name}` : nome, cella: this.#cella(x, false) }));
      });
    return { nome, tipo: campi !== undefined ? f.return_record! : this.#testi.tipi[f.return_type as Tipo], vettore, ...(campi !== undefined ? { record: true as const } : {}), chiamate };
  }

  #nelWatch(d: DatoMostrato, valori: readonly (Valore | undefined)[], cambiati: readonly boolean[] | undefined): DatoNelWatch {
    return {
      nome: d.nome,
      tipo: d.tipo,
      vettore: d.elementi !== undefined,
      ...(d.campi !== undefined ? { record: true as const } : {}),
      elementi: valori.map((v, i) => ({ nome: nomeDelValore(d, i), cella: this.#cella(v, cambiati?.[i] === true) })),
    };
  }

  #cella(v: Valore | undefined, cambiata: boolean): CellaDiUnValore {
    return { testo: this.#valore(v), nonInizializzata: v === undefined, cambiata };
  }

  /** Le celle di una riga, nella forma della tabella, poi quelle della posizione, poi i gruppi delle funzioni che si
   * possono chiamare (vuoti se non sono attive); `iniziale`, il dato della radice di cui la riga è il valore iniziale
   * (nella riga del valore iniziale di un dato di una funzione chiamata `funzione` ne è l'`id`). */
  #celle(r: Pick<Riga, "dati" | "dato" | "funzione" | "posizioniCambiate" | "chiamateCambiate" | "posizioniDelleChiamate"> & { readonly cambiati?: Riga["cambiati"] }): CellaDiUnValore[] {
    const f = r.dati;
    const posizioni = (n: number, valori: readonly (number | undefined)[] | undefined, cambiate: readonly boolean[] | undefined) =>
      Array.from({ length: n }, (_, l) => {
        const q = valori?.[l];
        return this.#cella(q === undefined ? undefined : { tipo: "integer", v: q }, cambiate?.[l] === true);
      });
    const dellaRadice = r.funzione === undefined || r.funzione === this.radice;
    const vuota = (): CellaDiUnValore => ({ testo: "", nonInizializzata: false, cambiata: false });
    const chiamate = this.#chiamate.flatMap((dati, k) => {
      const j = this.#livelloDi(f, k);
      const c = j < 0 ? undefined : f.chiamate![j]!;
      const n = this.#posizioniDelleChiamate[k]!;
      if (c === undefined) return [...dati.flatMap((d) => Array.from({ length: this.#colonneDi(d) }, vuota)), ...Array.from({ length: n }, vuota)];
      return [
        ...this.#valoriDeiDati(dati, c.valori, r.chiamateCambiate?.[j], r.funzione === this.#idDelleChiamate[k] ? r.dato : undefined, c.riferimenti),
        ...posizioni(n, c.posizioni, r.posizioniDelleChiamate?.[j]),
      ];
    });
    // La radice che richiama sé stessa mostra la sua chiamata più profonda: le costanti comuni dai valori della radice,
    // i dati dalla chiamata.
    const jr = this.#livelloDellaRadice(f);
    const cr = jr < 0 ? undefined : f.chiamate![jr]!;
    const iniziale = dellaRadice ? r.dato : undefined;
    if (cr === undefined)
      return [...this.#valoriDeiDati(this.#dati, f.valori, r.cambiati, iniziale), ...posizioni(this.#posizioni, f.posizioni, r.posizioniCambiate), ...chiamate];
    const comuni = this.#comuni;
    const cambiati = r.cambiati === undefined && r.chiamateCambiate?.[jr] === undefined ? undefined : [...(r.cambiati?.slice(0, comuni) ?? Array<boolean[]>(comuni).fill([])), ...(r.chiamateCambiate?.[jr] ?? [])];
    return [
      ...this.#valoriDeiDati(this.#dati, [...f.valori.slice(0, comuni), ...cr.valori], cambiati, iniziale, [...Array<undefined>(comuni).fill(undefined), ...cr.riferimenti]),
      ...posizioni(this.#posizioni, cr.posizioni, r.posizioniDelleChiamate?.[jr]),
      ...chiamate,
    ];
  }

  /** Dove sta, fra le chiamate attive della fotografia, la più profonda della radice che richiama sé stessa; -1 se c'è
   * solo la prima chiamata (o la radice non richiama sé stessa). */
  #livelloDellaRadice(f: Fotografia): number {
    return this.#radiceDelGiro ? (f.chiamate?.findLastIndex((c) => c.funzione === this.radice) ?? -1) : -1;
  }

  /** Per ogni funzione che si può chiamare, se è attiva. */
  #attive(f: Fotografia): boolean[] {
    return this.#chiamate.map((_, k) => this.#livelloDi(f, k) >= 0);
  }

  /** Dove sta, fra le chiamate attive della fotografia, la più profonda della funzione `k` (quella che il suo gruppo
   * mostra: con la ricorsione, l'ultima chiamata cominciata); -1 se la funzione non è attiva. */
  #livelloDi(f: Fotografia, k: number): number {
    return f.chiamate?.findLastIndex((c) => c.funzione === this.#idDelleChiamate[k]) ?? -1;
  }

  /** Quante colonne ha un dato nella forma della tabella. */
  #colonneDi(d: DatoMostrato): number {
    if (d.campi !== undefined) return d.campi.length;
    const n = d.elementi;
    if (n === undefined || this.forma === "in-fila") return 1;
    return this.forma === "per-elemento" || n <= tettoDelleColonne ? n : tettoDelleColonne + 1;
  }

  /** Le celle dei dati di una funzione; un parametro per riferimento (`riferimenti`) dice fra parentesi il dato di chi
   * chiama: «5 (a)», per un elemento di un vettore «5 (v[2])», per un campo di un record «7 (a.voto)». */
  #valoriDeiDati(
    dati: readonly DatoMostrato[],
    valori: Fotografia["valori"],
    cambiati?: readonly (readonly boolean[])[],
    iniziale?: string,
    riferimenti?: readonly (string | undefined)[],
  ): CellaDiUnValore[] {
    return valori.flatMap((elementi, d) => {
      const c = cambiati?.[d];
      const dato = dati[d]!;
      const n = dato.elementi;
      const rif = riferimenti?.[d];
      const di = (cella: CellaDiUnValore, i?: number): CellaDiUnValore => (rif === undefined ? cella : { ...cella, testo: `${cella.testo} (${i === undefined ? rif : nomeDelValore({ ...dato, nome: rif }, i)})` });
      if (dato.campi !== undefined) return elementi.map((v, i) => di(this.#cella(v, c?.[i] === true), i));
      if (n !== undefined && this.forma === "in-fila") return [di(this.#inFila(elementi, c))];
      const tutti = n === undefined || this.forma === "per-elemento" || n <= tettoDelleColonne;
      const primi = (tutti ? elementi : elementi.slice(0, tettoDelleColonne)).map((v, i) => di(this.#cella(v, c?.[i] === true), n === undefined ? undefined : i));
      if (tutti) return primi;
      return [...primi, dato.nome === iniziale ? this.#altriIniziali(dato.nome, elementi) : this.#altri(dato.nome, elementi, c)];
    });
  }

  /** La colonna degli altri nella riga del valore iniziale del vettore: tutti cambiati, in un elenco tagliato come nel
   * blocco (la stessa funzione), coi valori come li scrive la tabella; non uno per uno, che in un vettore di mille
   * elementi sarebbero 990. */
  #altriIniziali(nome: string, elementi: readonly (Valore | undefined)[]): CellaDiUnValore {
    const primi = elementi.slice(tettoDelleColonne, tettoDelleColonne + ELEMENTI_SCRITTI).map((v) => ({ testo: this.#valore(v), espressione: false }));
    const elenco = partiDellElenco(primi, elementi.length - tettoDelleColonne, this.#testi)
      .map((p) => p.testo)
      .join("");
    return { testo: `${nomeDegliAltri(nome, elementi.length)} ← ${elenco}`, nonInizializzata: false, cambiata: true };
  }

  /** La colonna degli altri: gli elementi oltre il tetto cambiati con l'azione, col nome e il nuovo valore. */
  #altri(nome: string, elementi: readonly (Valore | undefined)[], cambiati?: readonly boolean[]): CellaDiUnValore {
    const voci: string[] = [];
    if (cambiati) for (let i = tettoDelleColonne; i < elementi.length; i++) if (cambiati[i]) voci.push(`${nome}[${i}] ${this.#valore(elementi[i])}`);
    return { testo: voci.join(fraGliElementi), nonInizializzata: false, cambiata: voci.length > 0 };
  }

  /** Il vettore in fila: gli elementi fermi fra due cambiati stanno in un pezzo solo, così ogni pezzo è segnato o no. */
  #inFila(elementi: readonly (Valore | undefined)[], cambiati?: readonly boolean[]): CellaDiUnValore {
    const pezzi: { testo: string; cambiato: boolean }[] = [];
    let fermo = "";
    elementi.forEach((v, i) => {
      if (i > 0) fermo += fraGliElementi;
      const testo = v === undefined ? senzaValore : this.#valore(v);
      if (cambiati?.[i] !== true) fermo += testo;
      else {
        if (fermo !== "") pezzi.push({ testo: fermo, cambiato: false });
        pezzi.push({ testo, cambiato: true });
        fermo = "";
      }
    });
    if (fermo !== "" || pezzi.length === 0) pezzi.push({ testo: fermo, cambiato: false });
    return {
      testo: pezzi.map((p) => p.testo).join(""),
      nonInizializzata: elementi.every((v) => v === undefined),
      cambiata: pezzi.some((p) => p.cambiato),
      pezzi,
    };
  }

  /** La riga 0, «Inizio», coi valori prima della prima azione; nessuna prima della prima azione. */
  iniziale(t: Traccia): RigaMostrata | undefined {
    const f = t.valoriIniziali;
    return f === undefined ? undefined : { numero: 0, chiave: 0, ripresa: false, livello: 0, regola: this.#testi.inizio, valori: this.#celle({ dati: f }), attive: this.#attive(f), condizione: "", scrive: "" };
  }

  riga(r: Riga): RigaMostrata {
    let m = this.#fatte.get(r);
    if (m === undefined) {
      const testi = this.#testi;
      m = {
        numero: r.numero,
        chiave: r.indice,
        ripresa: r.ripresa === true,
        livello: r.livello,
        regola: this.#regola(r),
        valori: this.#celle(r),
        attive: this.#attive(r.dati),
        condizione: r.condizione === undefined ? "" : r.condizione ? testi.vero : testi.falso,
        scrive: r.letto !== undefined ? testi.letto + r.letto : (r.scrive ?? "").replaceAll("\n", testi.aCapo),
      };
      this.#fatte.set(r, m);
    }
    return m;
  }

  /** La riga 0 e le righe tenute, in ordine; l'ultima ha i valori di adesso. */
  righe(t: Traccia): RigaMostrata[] {
    const zero = this.iniziale(t);
    return [...(zero ? [zero] : []), ...t.righe.map((r) => this.riga(r))];
  }
}

/** Il nome di un valore di un dato: l'elemento di un vettore (`v[2]`), il campo di un record (`a.nome`), il dato. */
const nomeDelValore = (d: DatoMostrato, i: number): string => (d.campi !== undefined ? `${d.nome}.${d.campi[i]!.nome}` : d.elementi !== undefined ? `${d.nome}[${i}]` : d.nome);

/** I campi di un dato (o di un risultato) record del progetto; nessuno per un altro tipo. */
const campiDelRecord = (d: Pick<Dato, "type" | "record">, p: Progetto): readonly { readonly name: string; readonly type: Tipo }[] | undefined =>
  d.type === "record" ? p.records?.find((r) => r.name === d.record)?.fields : undefined;

/** Il nome della colonna degli elementi oltre il tetto. */
const nomeDegliAltri = (nome: string, elementi: number) => (elementi - 1 === tettoDelleColonne ? `${nome}[${tettoDelleColonne}]` : `${nome}[${tettoDelleColonne}…${elementi - 1}]`);

/** Un numero come lo scrive la tabella: comincia col meno ma non è una formula. */
const numeroNegativo = /^-\d+(?:[.,]\d+)?$/;

/**
 * Il CSV della tabella: «uguale», le stesse celle della tabella mostrata (dalle sue stesse righe), con le colonne
 * nell'ordine in cui si mostrano (`ordine`: dopo il numero e la regola, le posizioni delle celle nella riga del nucleo,
 * i valori poi la condizione e lo scritto; senza, quello del nucleo); «per elemento», la stessa tabella con una colonna
 * per elemento, nell'ordine del nucleo. L'intestazione col tipo accanto al nome, e col nome della funzione davanti per
 * il gruppo di una funzione che si può chiamare; in un progetto con funzioni che si possono chiamare, il livello dopo il
 * numero. Una cella che un foglio
 * di calcolo leggerebbe come una formula (comincia con `=`, `+`, `-`, `@`, una tabulazione o un ritorno a capo, e
 * non è un numero) comincia con un apostrofo, che la fa leggere come testo; come le virgolette, è la forma del file, non
 * il contenuto della cella. Excel e LibreOffice Calc aprono la cella come testo e mostrano l'apostrofo davanti (lo dice
 * il README); senza l'apostrofo la calcolerebbero come formula.
 */
export function csv(t: Traccia, tabella: TabellaMostrata, forma: FormaDelCsv, campo: string, ordine?: readonly number[]): string {
  const fonte = forma === "uguale" ? tabella : tabella.conForma("per-elemento");
  const testi = fonte.testi;
  const disposte = (celle: readonly string[]) => (forma === "uguale" && ordine ? ordine.map((i) => celle[i]!) : celle);
  const cella = (testo: string) => {
    const scritto = /^[=+\-@\t\r]/.test(testo) && !numeroNegativo.test(testo) ? `'${testo}` : testo;
    return scritto.includes(campo) || /["\r\n]/.test(scritto) ? `"${scritto.replaceAll('"', '""')}"` : scritto;
  };
  const livello = (x: string) => (fonte.conChiamate ? [x] : []);
  const nome = (c: ColonnaDiUnValore) => (c.funzione === undefined ? c.nome : `${c.funzione} › ${c.nome}`);
  const intestazione = [testi.numero, ...livello(testi.livello), testi.regola, ...disposte([...fonte.colonne.map((c) => `${nome(c)} (${c.tipo})`), testi.condizione, testi.scrive])];
  const righe = [intestazione, ...fonte.righe(t).map((r) => [String(r.numero), ...livello(String(r.livello)), r.regola, ...disposte([...r.valori.map((v) => v.testo), r.condizione, r.scrive])])];
  return `\u{feff}${righe.map((r) => r.map(cella).join(campo)).join("\r\n")}\r\n`;
}
