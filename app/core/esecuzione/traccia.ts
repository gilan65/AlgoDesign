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
// campo, con la regola del campo (`b.nome ← a.nome`). Una matrice nella sua forma, scelta a parte (una colonna per riga,
// coi valori in fila e gli elementi cambiati segnati: le prime dieci righe e una colonna per le altre; un elemento per
// colonna, `m[0][1]`, col tetto dei vettori se i vettori lo hanno; in fila in una colonna sola, le righe separate da
// « ‖ »). Una tabella (un vettore di record) nella sua forma, scelta a parte (una colonna per record coi campi in fila:
// i primi dieci record e una colonna per gli altri; una colonna per campo di ogni record, `t[0].nome`, col tetto dei vettori
// se i vettori lo hanno; una colonna per campo, `t[…].nome`, coi record in fila); la sua copia col nome ha, nel ciclo dei
// record, una riga per campo con la regola del campo (`u[_indice].nome ← t[_indice].nome`), e la copia di un suo record
// (`r ← t[i]`, `t[i] ← r`) è quella di un record. Con i `per ogni` e le copie col nome
// disegnati con la posizione, dopo i dati una colonna per livello con la posizione dell'elemento (`_indice`, `_indice2`),
// come la dà l'interprete (la copia di una matrice ne ha due: la riga e, al livello dopo, la colonna). Un evento di un
// ciclo aperto ha per regola il testo del blocco della sua fase (la partenza, il controllo, l'elemento preso, l'aumento:
// la stessa funzione del disegno; nella copia di una matrice quelle del ciclo delle colonne con `_indice2`); di un ciclo
// chiuso, l'intestazione. Il CSV
// ha le stesse celle, o una colonna per elemento, col tipo accanto al nome; la regola è il testo del blocco come
// nel disegno (per un valore iniziale, quello del suo blocco sotto «Inizio», col valore ripetuto mostrato nel modo
// scelto; i valori delle celle non ne dipendono); nella riga del valore iniziale di un vettore la colonna degli
// altri ha i loro valori in un elenco tagliato come nel blocco; un reale coi decimali del progetto e il separatore dei decimali scelto, ogni altro valore come lo
// scrive il programma; le celle con il separatore, le virgolette o un a capo fra virgolette (RFC 4180); un a capo
// scritto dal programma col segno del disegno. UTF-8 col BOM (senza, Excel non legge le lettere accentate), righe
// chiuse da CR LF.
//
// Un valore scritto a mano sta nella riga corrente, cioè l'ultima chiusa (la riga 0 prima della prima azione finita): la riga prende la fotografia nuova, e la riga
// dopo non segna un cambio falso; le righe prima restano come sono. Il segno (`modificata`) va alla cella che mostra quel valore, riconosciuto per identità: così un
// parametro per riferimento e il dato di chi chiama si segnano insieme, in ogni forma, e solo su quella riga. Il CSV ha allora in fondo la colonna dei valori
// modificati, una voce per valore con quello di prima e quello nuovo: le celle restano numeri che un foglio di calcolo somma.

import {
  campiDellaCopia,
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
  type ParteDelTesto,
  type TestiDelDisegno,
  type ValoreRipetuto,
} from "../disegno/impaginazione";
import { funzioniDelGiro } from "../controllo/controllo";
import { funzioniChiamabili, testoDelValore, type BersaglioDiUnValore, type FaseDelCiclo, type Fotografia, type FotografiaDiUnaChiamata, type Origine, type Restituito, type Valore } from "../interprete/interprete";
import { livelliDellePosizioni, nomiDeiVettori, nomiDelleMatrici, quantePosizioni } from "../progetto/copia";
import { opzioniPredefinite, type Blocco, type Dato, type Funzione, type Progetto, type Tipo } from "../progetto/modello";

/** Un valore scritto a mano in una riga: dov'è, quello che c'era e quello nuovo. */
export interface ModificaDellaRiga extends BersaglioDiUnValore {
  readonly prima: Valore | undefined;
  readonly valore: Valore;
}

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
  /** Nella copia di una matrice col suo nome, la fase è del ciclo delle colonne. */
  readonly interno?: true;
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
  /** I valori scritti a mano mentre questa era la riga corrente, nell'ordine. */
  readonly modifiche?: readonly ModificaDellaRiga[];
}

/** Ciò che una riga ha dall'evento che la apre: una ripresa lo copia dall'azione che riprende. */
type Azione = { numero: number; blocco: string; dato?: string; fase?: FaseDelCiclo; campo?: number; interno?: true; livello: number; funzione?: string };
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
  #modificheIniziali: readonly ModificaDellaRiga[] = [];
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

  /** I valori scritti a mano sulla riga 0. */
  get modificheIniziali(): readonly ModificaDellaRiga[] {
    return this.#modificheIniziali;
  }

  /** Un valore scritto a mano: la riga corrente prende la fotografia nuova, e la riga dopo si confronta con questa. */
  modifica(dati: Fotografia, m: ModificaDellaRiga): void {
    this.#ultimi = dati;
    const n = this.#tenute.length - 1;
    const r = this.#tenute[n];
    if (r === undefined) {
      this.#iniziali = dati;
      this.#modificheIniziali = [...this.#modificheIniziali, m];
    } else this.#tenute[n] = { ...r, dati, modifiche: [...(r.modifiche ?? []), m] };
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
   * principale; la posizione del campo, nella copia di un record; `interno`, nel ciclo delle colonne della copia di una
   * matrice). */
  evento(blocco: string, dati: Fotografia, dato?: string, fase?: FaseDelCiclo, livello = 0, funzione?: string, campo?: number, interno?: true): void {
    if (this.#iniziali === undefined) this.#iniziali = this.#ultimi = dati;
    else this.#chiudi(dati);
    const azione: Azione = {
      numero: ++this.#azioni,
      blocco,
      ...(dato !== undefined ? { dato } : {}),
      ...(fase !== undefined ? { fase } : {}),
      ...(campo !== undefined ? { campo } : {}),
      ...(interno ? { interno } : {}),
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
    /** Una matrice una colonna per riga, fino al tetto delle righe. */
    readonly perRiga: (nome: string, righe: number, colonne: number) => string;
    /** Una matrice una colonna per riga oltre il tetto: `colonna` è il nome di quella delle altre righe. */
    readonly primeEAltre: (nome: string, righe: number, colonne: number, prime: number, colonna: string) => string;
    /** Una matrice in fila. */
    readonly matriceInFila: (nome: string, righe: number, colonne: number) => string;
    /** Una tabella una colonna per record, fino al tetto dei record. */
    readonly perRecord: (nome: string, record: number) => string;
    /** Una tabella una colonna per record oltre il tetto: `colonna` è il nome di quella degli altri record. */
    readonly primiRecordEAltri: (nome: string, record: number, primi: number, colonna: string) => string;
    /** Una tabella una colonna per campo, coi record in fila. */
    readonly perCampo: (nome: string, record: number) => string;
    /** Una tabella una colonna per campo di ogni record oltre il tetto: `valori` i campi di tutti i record, `colonna` il
     * nome di quella degli altri. */
    readonly tabellaPrimiEAltri: (nome: string, record: number, valori: number, primi: number, colonna: string) => string;
    readonly csvUguale: string;
    readonly csvPerElemento: string;
  };
  /** L'intestazione della colonna del CSV coi valori scritti a mano. */
  readonly valoriModificati: string;
  /** Accanto a un valore scritto a mano, quello di prima: un modello con `{valore}`. */
  readonly era: string;
  /** Lo stesso in una cella con più valori: un modello con `{nome}` e `{valore}`. */
  readonly eraDi: string;
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

/**
 * Come si mostra una matrice (la stessa forma per tutte le matrici del progetto):
 * - `per-riga`: una colonna per riga, i valori in fila e gli elementi cambiati segnati; oltre `tettoDelleColonne` righe,
 *   le prime e una colonna per le altre, che dice quali elementi cambiano;
 * - `per-elemento`: una colonna per elemento (`m[0][1]`), coi primi `tettoDelleColonne` e una colonna per gli altri se
 *   i vettori sono nella forma coi primi elementi o in fila, tutti con una colonna per elemento;
 * - `in-fila`: una colonna sola, le righe separate da « ‖ ».
 */
export type FormaDelleMatrici = "per-riga" | "per-elemento" | "in-fila";

/**
 * Come si mostra una tabella, un vettore di record (la stessa forma per tutte le tabelle del progetto):
 * - `per-record`: una colonna per record (`t[2]`), i campi in fila e quelli cambiati segnati; oltre `tettoDelleColonne`
 *   record, i primi e una colonna per gli altri, che dice quali campi cambiano;
 * - `per-elemento`: una colonna per campo di ogni record (`t[0].nome`), coi primi `tettoDelleColonne` e una colonna per
 *   gli altri se i vettori sono nella forma coi primi elementi o in fila, tutti con una colonna per elemento;
 * - `per-campo`: una colonna per campo (`t[…].nome`), i record in fila.
 */
export type FormaDelleTabelle = "per-record" | "per-elemento" | "per-campo";

/** Il CSV: le stesse celle della tabella mostrata, o una colonna per elemento. */
export type FormaDelCsv = "uguale" | "per-elemento";

/** Fra due elementi in fila, e fra due elementi cambiati nella colonna degli altri. */
const fraGliElementi = " · ";
/** Fra due righe di una matrice in fila. */
const fraLeRighe = " ‖ ";
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
  /** Mostra un valore scritto a mano su questa riga. */
  readonly modificata?: true;
  /** Le parole accanto al valore scritto a mano, col valore di prima: stanno fuori da `testo`, e quindi dal CSV. */
  readonly era?: string;
  /** Nella colonna di un vettore in fila: il testo a pezzi (uniti, sono `testo`), coi pezzi degli elementi cambiati
   * segnati, e quelli degli elementi scritti a mano. */
  readonly pezzi?: readonly { readonly testo: string; readonly cambiato: boolean; readonly modificato?: true }[];
}

/** Un valore che una cella della riga corrente mostra, per scriverlo a mano: dov'è, il suo nome, il testo da proporre (come lo accetta una lettura) e se è una costante. */
export interface ElementoDellaCella extends BersaglioDiUnValore {
  readonly nome: string;
  readonly testo: string;
  readonly costante: boolean;
}

/** Che cosa offre una cella della riga corrente: i suoi valori; una colonna della posizione, che non è un dato; nulla (la condizione, lo scritto, una funzione non attiva). */
export type BersagliDiUnaCella = { readonly genere: "valori"; readonly elementi: readonly ElementoDellaCella[] } | { readonly genere: "posizione"; readonly nome: string } | { readonly genere: "nessuno" };

/** Il testo di un valore come lo accetta una lettura, per riscriverlo: il reale col punto e tutte le cifre, mai quello della cella; nessun valore, campo vuoto. */
const testoNelCampo = (v: Valore | undefined): string => {
  if (v === undefined) return "";
  if (v.tipo !== "real") return testoDelValore(v, 0);
  if (!Number.isFinite(v.v)) return "";
  if (Object.is(v.v, -0)) return "-0";
  const testo = String(v.v);
  // Una lettura vuole i decimali davanti all'esponente: «1e+21» non è valida, «1.0e+21» sì.
  return testo.includes("e") && !testo.includes(".") ? testo.replace("e", ".0e") : testo;
};

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
  /** Una matrice: le sue colonne (gli elementi sono riga dopo riga). */
  readonly colonne?: number;
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
  /** Una matrice restituita: le sue colonne. */
  readonly colonne?: number;
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
  /** I valori scritti a mano su questa riga, come li dice il CSV: vuoto se nessuno. */
  readonly modificati: string;
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
  /** Gli elementi, se è un vettore; le righe, se è una matrice. */
  readonly elementi?: number;
  /** Le colonne, se è una matrice. */
  readonly colonne?: number;
  /** I campi col loro tipo, se è un record. */
  readonly campi?: readonly { readonly nome: string; readonly tipo: string }[];
  readonly costante: boolean;
}

/** Una colonna per scriverci un valore: di quale dato (`chiamata`: la funzione che si può chiamare, nessuna per la radice; `d`: il dato fra i suoi) e quali elementi mostra; o una
 * colonna della posizione. */
type CellaDelDato = { readonly genere: "valori"; readonly chiamata?: number; readonly d: number; readonly elementi: readonly number[] } | { readonly genere: "posizione" };

/**
 * La tabella di traccia di un progetto come la vede l'utente, nella sua lingua, col separatore dei decimali e la
 * forma dei vettori scelti: la finestra la mostra, il CSV la esporta, con gli stessi testi. Le costanti comuni
 * per prime. Le righe delle azioni si calcolano una volta: ogni comando ne aggiunge alcune, e quelle già viste
 * restano le stesse.
 */
const nessunSegno: ReadonlyMap<Valore, { readonly nome: string; readonly prima: Valore | undefined }> = new Map();

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
  /** I valori scritti a mano sulla riga che si sta componendo, ognuno col suo nome e il valore di prima: ogni cella che ne mostra uno ha il segno. */
  #segnati = nessunSegno;
  /** Mentre si compongono le celle di un dato, il nome di ogni suo elemento scritto a mano: un parametro per riferimento è lo stesso valore della cella di chi chiama, e lì
   * il nome è quello di chi chiama, non della modifica. */
  #nomiNelDato: ReadonlyMap<Valore, string> | undefined;
  /** Per ogni colonna, che cosa mostra. */
  readonly #celleDelleColonne: readonly CellaDelDato[];

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
    readonly formaDelleMatrici: FormaDelleMatrici = "per-riga",
    readonly formaDelleTabelle: FormaDelleTabelle = "per-record",
  ) {
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
    /** I livelli delle posizioni nascoste di ogni funzione (i `per ogni` e le copie col nome, anche di una riga di una
     * matrice), una volta per funzione. */
    const livelli = new Map(p.functions.map((f) => [f.id, livelliDellePosizioni(f.body, nomiDeiVettori(datiDi(f)), nomiDelleMatrici(datiDi(f)))]));
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
      // Un campo della copia di un record (anche di un record di una tabella, da una parte o dall'altra): l'assegnazione di
      // quel campo.
      if (r.campo !== undefined && r.fase === undefined && b.kind === "assignment") {
        const campo = campiDellaCopia(b, datiDi(f), p.records ?? [])![r.campo]!.name;
        return partiDelCampoDellaCopia(b, campo, testi)
          .map((q) => q.testo)
          .join("");
      }
      if (b.kind === "call") return partiDellaChiamata(b, funzioneChiamata(p.functions, b.callee), testi).map((q) => q.testo).join("");
      // Una fase di un'assegnazione è della copia di un vettore col suo nome; con il campo, della copia di una tabella (il
      // campo copiato nel record della posizione).
      const ciclo = b.kind === "for" || b.kind === "for_each" || b.kind === "assignment";
      const campoDellaTabella = r.campo !== undefined && b.kind === "assignment" ? campiDelRecord(datiDi(f).find((d) => d.name === b.target.trim())!, p)?.[r.campo]?.name : undefined;
      const fase =
        r.fase !== undefined && ciclo ? partiDellaFase(b, r.fase, cicli, testi, livelli.get(f.id)!.get(b.id) ?? 1, datiDi(f), r.interno === true, campoDellaTabella) : undefined;
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
    // la posizione, le copie espanse (la copia di una matrice col livello dopo il suo, la colonna).
    const mostrata = (b: Blocco) => (b.kind === "for_each" ? cicli.perOgni === "posizione" : cicli.copia === "espansa");
    const posizioniDi = (f: Funzione) => quantePosizioni(f.body, nomiDeiVettori(datiDi(f)), nomiDelleMatrici(datiDi(f)), mostrata);
    this.#posizioni = posizioniDi(principale);
    this.#valore = (v) => {
      if (v === undefined) return testi.nonInizializzata;
      const testo = testoDelValore(v, decimali);
      return v.tipo === "real" ? testo.replace(".", separatoreDeiDecimali) : testo;
    };
    const mostrato = (d: Dato): DatoMostrato => {
      const campi = campiDelRecord(d, p);
      // Un record, o una tabella (un vettore di record: i suoi record).
      const costante = d.constant === true;
      if (campi !== undefined) return { nome: d.name, tipo: d.record!, costante, campi: campi.map((c) => ({ nome: c.name, tipo: testi.tipi[c.type] })), ...(d.size !== undefined ? { elementi: d.size } : {}) };
      return { nome: d.name, tipo: testi.tipi[d.type as Tipo], costante, ...(d.size !== undefined ? { elementi: d.size } : {}), ...(d.columns !== undefined ? { colonne: d.columns } : {}) };
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
      if (d.campi !== undefined && n !== undefined) {
        const campi = d.campi;
        if (formaDelleTabelle === "per-campo") return campi.map((c) => colonna(`${d.nome}[…].${c.nome}`, c.tipo));
        if (formaDelleTabelle === "per-record") {
          const record = (i: number) => colonna(`${d.nome}[${i}]`);
          return n <= tettoDelleColonne ? Array.from({ length: n }, (_, i) => record(i)) : [...Array.from({ length: tettoDelleColonne }, (_, i) => record(i)), colonna(nomeDegliAltri(d.nome, n))];
        }
        const valore = (k: number) => colonna(nomeDelValore(d, k), campi[k % campi.length]!.tipo);
        if (forma === "per-elemento" || n * campi.length <= tettoDelleColonne) return Array.from({ length: n * campi.length }, (_, k) => valore(k));
        return [...Array.from({ length: tettoDelleColonne }, (_, k) => valore(k)), colonna(nomeDegliAltriDellaTabella(d))];
      }
      if (d.campi !== undefined) return d.campi.map((c) => colonna(`${d.nome}.${c.nome}`, c.tipo));
      if (n !== undefined && d.colonne !== undefined) {
        const c = d.colonne;
        if (formaDelleMatrici === "in-fila") return [colonna(d.nome)];
        if (formaDelleMatrici === "per-riga") {
          const riga = (i: number) => colonna(`${d.nome}[${i}]`);
          return n <= tettoDelleColonne ? Array.from({ length: n }, (_, i) => riga(i)) : [...Array.from({ length: tettoDelleColonne }, (_, i) => riga(i)), colonna(nomeDegliAltri(d.nome, n))];
        }
        const elemento = (k: number) => colonna(nomeDiUnElemento(d.nome, k, c));
        if (forma === "per-elemento" || n * c <= tettoDelleColonne) return Array.from({ length: n * c }, (_, k) => elemento(k));
        return [...Array.from({ length: tettoDelleColonne }, (_, k) => elemento(k)), colonna(nomeDegliAltriDellaMatrice(d.nome, n, c))];
      }
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
    const celleDi = (dati: readonly DatoMostrato[], n: number, chiamata?: number): CellaDelDato[] => [
      ...dati.flatMap((d, k) => this.#elementiDelleCelle(d).map((elementi): CellaDelDato => ({ genere: "valori", ...(chiamata !== undefined ? { chiamata } : {}), d: k, elementi }))),
      ...Array.from({ length: n }, (): CellaDelDato => ({ genere: "posizione" })),
    ];
    this.#celleDelleColonne = [...celleDi(this.#dati, this.#posizioni), ...this.#chiamate.flatMap((dati, k) => celleDi(dati, this.#posizioniDelleChiamate[k]!, k))];
  }

  /** Per ogni colonna di un dato nella forma della tabella, gli elementi che mostra: le stesse forme di `#valoriDeiDati`, e una prova le appaia per elementi. */
  #elementiDelleCelle(d: DatoMostrato): readonly (readonly number[])[] {
    const da = (i: number, a: number) => Array.from({ length: a - i }, (_, k) => i + k);
    /** Una colonna per gruppo di `passo` elementi, fino al tetto; gli altri in una colonna sola. */
    const aGruppi = (gruppi: number, passo: number) => [
      ...Array.from({ length: Math.min(gruppi, tettoDelleColonne) }, (_, i) => da(i * passo, (i + 1) * passo)),
      ...(gruppi > tettoDelleColonne ? [da(tettoDelleColonne * passo, gruppi * passo)] : []),
    ];
    /** Una colonna per elemento; con il tetto, i primi e una colonna per gli altri. */
    const aUnoAUno = (tutti: number) => (this.forma === "per-elemento" ? Array.from({ length: tutti }, (_, i) => [i]) : aGruppi(tutti, 1));
    const n = d.elementi;
    if (d.campi !== undefined && n !== undefined) {
      const campi = d.campi.length;
      if (this.formaDelleTabelle === "per-campo") return Array.from({ length: campi }, (_, j) => Array.from({ length: n }, (_, i) => i * campi + j));
      return this.formaDelleTabelle === "per-record" ? aGruppi(n, campi) : aUnoAUno(n * campi);
    }
    if (d.campi !== undefined) return d.campi.map((_, i) => [i]);
    if (n !== undefined && d.colonne !== undefined) {
      if (this.formaDelleMatrici === "in-fila") return [da(0, n * d.colonne)];
      return this.formaDelleMatrici === "per-riga" ? aGruppi(n, d.colonne) : aUnoAUno(n * d.colonne);
    }
    if (n === undefined) return [[0]];
    return this.forma === "in-fila" ? [da(0, n)] : aUnoAUno(n);
  }

  /** Che cosa mostra la cella `cella` della riga corrente, cioè dove va un valore scritto a mano: la chiamata più profonda di una funzione, quella che il suo gruppo mostra. */
  bersagli(t: Traccia, cella: number): BersagliDiUnaCella {
    const f = t.righe.at(-1)?.dati ?? t.valoriIniziali;
    const c = this.#celleDelleColonne[cella];
    if (f === undefined || c === undefined) return { genere: "nessuno" };
    if (c.genere === "posizione") return { genere: "posizione", nome: this.colonne[cella]!.nome };
    const { chiamata: k, d } = c;
    const dato = (k === undefined ? this.#dati : this.#chiamate[k]!)[d]!;
    let valori: readonly (Valore | undefined)[];
    if (k === undefined) {
      const jr = this.#livelloDellaRadice(f);
      valori = jr >= 0 && d >= this.#comuni ? f.chiamate![jr]!.valori[d - this.#comuni]! : f.valori[d]!;
    } else {
      const j = this.#livelloDi(f, k);
      if (j < 0) return { genere: "nessuno" };
      valori = f.chiamate![j]!.valori[d]!;
    }
    const costante = dato.costante || (k === undefined && d < this.#comuni);
    const funzione = k === undefined ? {} : { funzione: this.#idDelleChiamate[k]! };
    return { genere: "valori", elementi: c.elementi.map((elemento) => ({ ...funzione, dato: dato.nome, elemento, nome: nomeDelValore(dato, elemento), testo: testoNelCampo(valori[elemento]), costante })) };
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

  /** Il valore che una funzione ha restituito, come lo scrive la riga della ripresa: gli elementi di un vettore in fila,
   * quelli di una matrice con le righe separate, come i record di una tabella. */
  valoreRestituito(r: Restituito): string {
    const v = r.valore;
    if (!("elementi" in v)) return this.#valore(v);
    const f = this.#progetto.functions.find((g) => g.id === r.funzione);
    const campi = f?.return_size !== undefined && f.return_type !== undefined ? campiDelRecord({ type: f.return_type, ...(f.return_record !== undefined ? { record: f.return_record } : {}) }, this.#progetto)?.length : undefined;
    const colonne = f?.return_columns ?? campi;
    return v.elementi.map((x, i) => `${i === 0 ? "" : colonne !== undefined && i % colonne === 0 ? fraLeRighe : fraGliElementi}${this.#valore(x)}`).join("");
  }

  /** La stessa tabella in un'altra forma (il CSV con una colonna per elemento: anche per le matrici e le tabelle). */
  conForma(forma: FormaDeiVettori, formaDelleMatrici: FormaDelleMatrici = this.formaDelleMatrici, formaDelleTabelle: FormaDelleTabelle = this.formaDelleTabelle): TabellaMostrata {
    return forma === this.forma && formaDelleMatrici === this.formaDelleMatrici && formaDelleTabelle === this.formaDelleTabelle
      ? this
      : new TabellaMostrata(this.#progetto, this.#testi, this.#decimali, forma, this.ripetuto, this.cicli, this.radice, this.restituitoNellaRipresa, formaDelleMatrici, formaDelleTabelle);
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
      if (n !== undefined && d.campi !== undefined) {
        if (this.formaDelleTabelle === "per-campo") return [s.perCampo(d.nome, n)];
        if (this.formaDelleTabelle === "per-record") return [n > tettoDelleColonne ? s.primiRecordEAltri(d.nome, n, tettoDelleColonne, nomeDegliAltri(d.nome, n)) : s.perRecord(d.nome, n)];
        const valori = n * d.campi.length;
        return this.forma === "per-elemento" || valori <= tettoDelleColonne ? [] : [s.tabellaPrimiEAltri(d.nome, n, valori, tettoDelleColonne, nomeDegliAltriDellaTabella(d))];
      }
      if (n !== undefined && d.colonne !== undefined) {
        const c = d.colonne;
        if (this.formaDelleMatrici === "in-fila") return [s.matriceInFila(d.nome, n, c)];
        if (this.formaDelleMatrici === "per-riga") return [n > tettoDelleColonne ? s.primeEAltre(d.nome, n, c, tettoDelleColonne, nomeDegliAltri(d.nome, n)) : s.perRiga(d.nome, n, c)];
        return this.forma === "per-elemento" || n * c <= tettoDelleColonne ? [] : [s.primiEAltri(d.nome, n * c, tettoDelleColonne, nomeDegliAltriDellaMatrice(d.nome, n, c))];
      }
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
    return this.#conISegni(ultima === undefined ? t.modificheIniziali : ultima.modifiche, () => this.#watch(t, dato, funzione, livello));
  }

  #watch(t: Traccia, dato: string, funzione?: string, livello?: number): DatoNelWatch | undefined {
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
    const colonne = f.return_columns;
    const campi = campiDelRecord({ type: f.return_type!, ...(f.return_record !== undefined ? { record: f.return_record } : {}) }, this.#progetto);
    const chiamate = righe
      .filter((r) => di(r) && r.numero === ultima?.numero)
      .map((r) => {
        const v = r.restituito!.valore;
        const elementi = "elementi" in v ? v.elementi : [v];
        const nomeDi = (i: number) =>
          colonne !== undefined
            ? nomeDiUnElemento("", i, colonne)
            : vettore && campi !== undefined
              ? `[${Math.floor(i / campi.length)}].${campi[i % campi.length]!.name}`
              : vettore
                ? `[${i}]`
                : campi !== undefined
                  ? `.${campi[i]!.name}`
                  : nome;
        return elementi.map((x, i) => ({ nome: nomeDi(i), cella: this.#cella(x, false) }));
      });
    return {
      nome,
      tipo: campi !== undefined ? f.return_record! : this.#testi.tipi[f.return_type as Tipo],
      vettore,
      ...(campi !== undefined ? { record: true as const } : {}),
      ...(colonne !== undefined ? { colonne } : {}),
      chiamate,
    };
  }

  #nelWatch(d: DatoMostrato, valori: readonly (Valore | undefined)[], cambiati: readonly boolean[] | undefined): DatoNelWatch {
    return {
      nome: d.nome,
      tipo: d.tipo,
      vettore: d.elementi !== undefined,
      ...(d.campi !== undefined ? { record: true as const } : {}),
      ...(d.colonne !== undefined ? { colonne: d.colonne } : {}),
      elementi: valori.map((v, i) => ({ nome: nomeDelValore(d, i), cella: this.#cella(v, cambiati?.[i] === true) })),
    };
  }

  #cella(v: Valore | undefined, cambiata: boolean): CellaDiUnValore {
    const segno = v === undefined ? undefined : this.#segnati.get(v);
    return { testo: this.#valore(v), nonInizializzata: v === undefined, cambiata, ...(segno !== undefined ? { modificata: true as const, era: this.#testi.era.replace("{valore}", () => this.#valore(segno.prima)) } : {}) };
  }

  #segnato(v: Valore | undefined): boolean {
    return v !== undefined && this.#segnati.has(v);
  }

  /** Il segno di una cella con più valori: le parole coi nomi degli elementi scritti a mano. */
  #segnoDi(elementi: readonly (Valore | undefined)[]): { modificata?: true; era?: string } {
    const voci = elementi.flatMap((v) => {
      const s = v === undefined ? undefined : this.#segnati.get(v);
      return s === undefined ? [] : [this.#testi.eraDi.replace("{nome}", () => (v !== undefined && this.#nomiNelDato?.get(v)) || s.nome).replace("{valore}", () => this.#valore(s.prima))];
    });
    return voci.length === 0 ? {} : { modificata: true, era: voci.join(fraGliElementi) };
  }

  /** Compone una riga coi segni dei valori scritti a mano su di lei. Un valore scritto due volte: quello di prima è il primo (fra le due il programma non ha fatto nulla). */
  #conISegni<T>(modifiche: readonly ModificaDellaRiga[] | undefined, componi: () => T): T {
    if (modifiche === undefined || modifiche.length === 0) this.#segnati = nessunSegno;
    else {
      const primi = new Map<string, Valore | undefined>();
      const segnati = new Map<Valore, { readonly nome: string; readonly prima: Valore | undefined }>();
      for (const m of modifiche) {
        const chiave = JSON.stringify([m.funzione ?? null, m.dato, m.elemento]);
        if (!primi.has(chiave)) primi.set(chiave, m.prima);
        segnati.set(m.valore, { nome: this.#nomeDiUnaModifica(m), prima: primi.get(chiave) });
      }
      this.#segnati = segnati;
    }
    try {
      return componi();
    } finally {
      this.#segnati = nessunSegno;
    }
  }

  /** I valori scritti a mano come li dice il CSV: una voce per valore, dal primo all'ultimo se è stato scritto più volte (fra le due il programma non ha fatto nulla). */
  #vociDelleModifiche(modifiche: readonly ModificaDellaRiga[] | undefined): string {
    const voci = new Map<string, { readonly m: ModificaDellaRiga; readonly prima: Valore | undefined }>();
    for (const m of modifiche ?? []) {
      const chiave = JSON.stringify([m.funzione ?? null, m.dato, m.elemento]);
      voci.set(chiave, { m, prima: voci.has(chiave) ? voci.get(chiave)!.prima : m.prima });
    }
    return [...voci.values()].map(({ m, prima }) => `${this.#nomeDiUnaModifica(m)}: ${this.#valore(prima)} → ${this.#valore(m.valore)}`).join(fraGliElementi);
  }

  /** Il nome di un valore scritto a mano, col nome della funzione davanti se non è della radice. */
  #nomeDiUnaModifica(m: ModificaDellaRiga): string {
    const k = m.funzione === undefined || m.funzione === this.radice ? -1 : this.#idDelleChiamate.indexOf(m.funzione);
    const dato = (k < 0 ? this.#dati : this.#chiamate[k]!).find((d) => d.nome === m.dato)!;
    const nome = nomeDelValore(dato, m.elemento);
    return k < 0 ? nome : `${this.gruppi.find((g) => g.funzione === m.funzione)!.nome!} › ${nome}`;
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
        ...this.#valoriDeiDati(dati, c.valori, r.chiamateCambiate?.[j], r.funzione === this.#idDelleChiamate[k] ? r.dato : undefined, c.riferimenti, this.#idDelleChiamate[k]),
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
    const n = d.elementi;
    if (d.campi !== undefined && n !== undefined) {
      if (this.formaDelleTabelle === "per-campo") return d.campi.length;
      if (this.formaDelleTabelle === "per-record") return n <= tettoDelleColonne ? n : tettoDelleColonne + 1;
      const tutti = n * d.campi.length;
      return this.forma === "per-elemento" || tutti <= tettoDelleColonne ? tutti : tettoDelleColonne + 1;
    }
    if (d.campi !== undefined) return d.campi.length;
    if (n !== undefined && d.colonne !== undefined) {
      if (this.formaDelleMatrici === "in-fila") return 1;
      if (this.formaDelleMatrici === "per-riga") return n <= tettoDelleColonne ? n : tettoDelleColonne + 1;
      const tutti = n * d.colonne;
      return this.forma === "per-elemento" || tutti <= tettoDelleColonne ? tutti : tettoDelleColonne + 1;
    }
    if (n === undefined || this.forma === "in-fila") return 1;
    return this.forma === "per-elemento" || n <= tettoDelleColonne ? n : tettoDelleColonne + 1;
  }

  /** Le celle dei dati di una funzione; un parametro per riferimento (`riferimenti`) dice fra parentesi il dato di chi
   * chiama: «5 (a)», per un elemento di un vettore «5 (v[2])», per un campo di un record «7 (a.voto)», di un record di una
   * tabella «7 (t[2].voto)». */
  #valoriDeiDati(
    dati: readonly DatoMostrato[],
    valori: Fotografia["valori"],
    cambiati?: readonly (readonly boolean[])[],
    iniziale?: string,
    riferimenti?: readonly (string | undefined)[],
    funzione?: string,
  ): CellaDiUnValore[] {
    const davanti = funzione === undefined ? "" : `${this.gruppi.find((g) => g.funzione === funzione)!.nome!} › `;
    return valori.flatMap((elementi, d) => {
      const dato = dati[d]!;
      if (this.#segnati.size === 0) return this.#celleDelDato(dato, elementi, cambiati?.[d], iniziale, riferimenti?.[d]);
      this.#nomiNelDato = new Map(elementi.flatMap((v, i) => (v !== undefined && this.#segnati.has(v) ? [[v, davanti + nomeDelValore(dato, i)] as const] : [])));
      try {
        return this.#celleDelDato(dato, elementi, cambiati?.[d], iniziale, riferimenti?.[d]);
      } finally {
        this.#nomiNelDato = undefined;
      }
    });
  }

  /** Le celle di un dato: `c` i suoi elementi cambiati, `iniziale` il dato della riga del valore iniziale, `rif` il dato di chi chiama se è un parametro per riferimento. */
  #celleDelDato(dato: DatoMostrato, elementi: Fotografia["valori"][number], c: readonly boolean[] | undefined, iniziale: string | undefined, rif: string | undefined): CellaDiUnValore[] {
    const n = dato.elementi;
    const di = (cella: CellaDiUnValore, i?: number): CellaDiUnValore => (rif === undefined ? cella : { ...cella, testo: `${cella.testo} (${i === undefined ? rif : nomeDelValore({ ...dato, nome: rif }, i)})` });
    if (dato.campi !== undefined && n !== undefined) return this.#valoriDellaTabella(dato, n, dato.campi.length, elementi, c, dato.nome === iniziale, rif);
    if (dato.campi !== undefined) return elementi.map((v, i) => di(this.#cella(v, c?.[i] === true), i));
    if (n !== undefined && dato.colonne !== undefined) return this.#valoriDellaMatrice(dato, n, dato.colonne, elementi, c, dato.nome === iniziale, rif);
    if (n !== undefined && this.forma === "in-fila") return [di(this.#inFila(elementi, c))];
    const tutti = n === undefined || this.forma === "per-elemento" || n <= tettoDelleColonne;
    const primi = (tutti ? elementi : elementi.slice(0, tettoDelleColonne)).map((v, i) => di(this.#cella(v, c?.[i] === true), n === undefined ? undefined : i));
    if (tutti) return primi;
    const altri = elementi.slice(tettoDelleColonne);
    return [...primi, dato.nome === iniziale ? this.#altriIniziali(nomeDegliAltri(dato.nome, n), this.#elenco(altri), altri) : this.#altri(elementi, c, tettoDelleColonne, (i) => `${dato.nome}[${i}]`)];
  }

  /** Le celle di una matrice di `righe` × `colonne` nella sua forma: una per riga coi valori in fila (oltre il tetto, le
   * prime righe e la colonna delle altre), una per elemento (col tetto dei vettori), o una sola in fila; `iniziale`, se
   * la riga è il suo valore iniziale; `rif`, il dato di chi chiama per un parametro per riferimento. */
  #valoriDellaMatrice(
    dato: DatoMostrato,
    righe: number,
    colonne: number,
    elementi: readonly (Valore | undefined)[],
    c: readonly boolean[] | undefined,
    iniziale: boolean,
    rif: string | undefined,
  ): CellaDiUnValore[] {
    const di = (cella: CellaDiUnValore, nome: (rif: string) => string): CellaDiUnValore => (rif === undefined ? cella : { ...cella, testo: `${cella.testo} (${nome(rif)})` });
    const elemento = (i: number) => (r: string) => nomeDiUnElemento(r, i, colonne);
    if (this.formaDelleMatrici === "in-fila") return [di(this.#inFila(elementi, c, colonne), (r) => r)];
    if (this.formaDelleMatrici === "per-riga") {
      const prime = Array.from({ length: Math.min(righe, tettoDelleColonne) }, (_, i) =>
        di(this.#inFila(elementi.slice(i * colonne, (i + 1) * colonne), c?.slice(i * colonne, (i + 1) * colonne)), (r) => `${r}[${i}]`),
      );
      if (righe <= tettoDelleColonne) return prime;
      // Le altre righe: nel valore iniziale l'elenco delle righe, ognuna un elenco, tagliato come nel blocco.
      const altre = Array.from({ length: Math.min(righe - tettoDelleColonne, ELEMENTI_SCRITTI) }, (_, k) => {
        const da = (tettoDelleColonne + k) * colonne;
        return this.#elenco(elementi.slice(da, da + colonne));
      });
      const altra = iniziale
        ? this.#altriIniziali(nomeDegliAltri(dato.nome, righe), partiDellElenco(altre, righe - tettoDelleColonne, this.#testi), elementi.slice(tettoDelleColonne * colonne))
        : this.#altri(elementi, c, tettoDelleColonne * colonne, (i) => nomeDiUnElemento(dato.nome, i, colonne));
      return [...prime, altra];
    }
    const tutti = this.forma === "per-elemento" || righe * colonne <= tettoDelleColonne;
    const primi = (tutti ? elementi : elementi.slice(0, tettoDelleColonne)).map((v, i) => di(this.#cella(v, c?.[i] === true), elemento(i)));
    if (tutti) return primi;
    const altri = elementi.slice(tettoDelleColonne);
    return [
      ...primi,
      iniziale
        ? this.#altriIniziali(nomeDegliAltriDellaMatrice(dato.nome, righe, colonne), this.#elenco(altri), altri)
        : this.#altri(elementi, c, tettoDelleColonne, (i) => nomeDiUnElemento(dato.nome, i, colonne)),
    ];
  }

  /** Le celle di una tabella di `record` record da `campi` campi nella sua forma: una per record coi campi in fila (oltre il
   * tetto, i primi record e la colonna degli altri), una per campo di ogni record (col tetto dei vettori), o una per campo
   * coi record in fila; `iniziale`, se la riga è il suo valore iniziale; `rif`, il dato di chi chiama per un parametro per
   * riferimento. */
  #valoriDellaTabella(
    dato: DatoMostrato,
    record: number,
    campi: number,
    elementi: readonly (Valore | undefined)[],
    c: readonly boolean[] | undefined,
    iniziale: boolean,
    rif: string | undefined,
  ): CellaDiUnValore[] {
    const di = (cella: CellaDiUnValore, nome: (rif: string) => string): CellaDiUnValore => (rif === undefined ? cella : { ...cella, testo: `${cella.testo} (${nome(rif)})` });
    if (this.formaDelleTabelle === "per-campo")
      return dato.campi!.map((campo, j) => {
        const del = <T>(x: readonly T[]) => Array.from({ length: record }, (_, i) => x[i * campi + j]!);
        return di(this.#inFila(del(elementi), c === undefined ? undefined : del(c)), (r) => `${r}[…].${campo.nome}`);
      });
    if (this.formaDelleTabelle === "per-record") {
      const primi = Array.from({ length: Math.min(record, tettoDelleColonne) }, (_, i) =>
        di(this.#inFila(elementi.slice(i * campi, (i + 1) * campi), c?.slice(i * campi, (i + 1) * campi)), (r) => `${r}[${i}]`),
      );
      if (record <= tettoDelleColonne) return primi;
      // Gli altri record: nel valore iniziale l'elenco dei record, ognuno un elenco, tagliato come nel blocco.
      const altri = Array.from({ length: Math.min(record - tettoDelleColonne, ELEMENTI_SCRITTI) }, (_, k) => {
        const da = (tettoDelleColonne + k) * campi;
        return this.#elenco(elementi.slice(da, da + campi));
      });
      const altro = iniziale
        ? this.#altriIniziali(nomeDegliAltri(dato.nome, record), partiDellElenco(altri, record - tettoDelleColonne, this.#testi), elementi.slice(tettoDelleColonne * campi))
        : this.#altri(elementi, c, tettoDelleColonne * campi, (i) => nomeDelValore(dato, i));
      return [...primi, altro];
    }
    const tutti = this.forma === "per-elemento" || record * campi <= tettoDelleColonne;
    const primi = (tutti ? elementi : elementi.slice(0, tettoDelleColonne)).map((v, i) => di(this.#cella(v, c?.[i] === true), (r) => nomeDelValore({ ...dato, nome: r }, i)));
    if (tutti) return primi;
    const altri = elementi.slice(tettoDelleColonne);
    return [...primi, iniziale ? this.#altriIniziali(nomeDegliAltriDellaTabella(dato), this.#elenco(altri), altri) : this.#altri(elementi, c, tettoDelleColonne, (i) => nomeDelValore(dato, i))];
  }

  /** I primi valori (al più `ELEMENTI_SCRITTI`) di un elenco come li scrive la tabella, fra graffe con quanti ne restano: la
   * stessa funzione del blocco del valore iniziale. */
  #elenco(valori: readonly (Valore | undefined)[]): ParteDelTesto[] {
    return partiDellElenco(
      valori.slice(0, ELEMENTI_SCRITTI).map((v) => ({ testo: this.#valore(v), espressione: false })),
      valori.length,
      this.#testi,
    );
  }

  /** La colonna degli altri (`colonna` il suo nome) nella riga del valore iniziale: tutti cambiati, nell'elenco tagliato
   * come nel blocco; non uno per uno, che in un vettore di mille elementi sarebbero 990. `elementi`: quegli altri, per il segno di uno scritto a mano. */
  #altriIniziali(colonna: string, elenco: readonly ParteDelTesto[], elementi: readonly (Valore | undefined)[]): CellaDiUnValore {
    return { testo: `${colonna} ← ${elenco.map((p) => p.testo).join("")}`, nonInizializzata: false, cambiata: true, ...this.#segnoDi(elementi) };
  }

  /** La colonna degli altri: gli elementi da `da` cambiati con l'azione, col nome (`nomeDi`) e il nuovo valore. */
  #altri(elementi: readonly (Valore | undefined)[], cambiati: readonly boolean[] | undefined, da: number, nomeDi: (i: number) => string): CellaDiUnValore {
    const voci: string[] = [];
    let cambiata = false;
    for (let i = da; i < elementi.length; i++) {
      const cambiato = cambiati?.[i] === true;
      if (cambiato || this.#segnato(elementi[i])) voci.push(`${nomeDi(i)} ${this.#valore(elementi[i])}`);
      cambiata ||= cambiato;
    }
    return { testo: voci.join(fraGliElementi), nonInizializzata: false, cambiata, ...this.#segnoDi(elementi.slice(da)) };
  }

  /** Il vettore in fila (con `colonne`, la matrice, le righe separate): gli elementi fermi fra due cambiati (o scritti a
   * mano) stanno in un pezzo solo, così ogni pezzo è segnato o no. */
  #inFila(elementi: readonly (Valore | undefined)[], cambiati?: readonly boolean[], colonne?: number): CellaDiUnValore {
    const pezzi: { testo: string; cambiato: boolean; modificato?: true }[] = [];
    let fermo = "";
    elementi.forEach((v, i) => {
      if (i > 0) fermo += colonne !== undefined && i % colonne === 0 ? fraLeRighe : fraGliElementi;
      const testo = v === undefined ? senzaValore : this.#valore(v);
      const cambiato = cambiati?.[i] === true;
      const segnato = this.#segnato(v);
      if (!cambiato && !segnato) fermo += testo;
      else {
        if (fermo !== "") pezzi.push({ testo: fermo, cambiato: false });
        pezzi.push({ testo, cambiato, ...(segnato ? { modificato: true as const } : {}) });
        fermo = "";
      }
    });
    if (fermo !== "" || pezzi.length === 0) pezzi.push({ testo: fermo, cambiato: false });
    return {
      testo: pezzi.map((p) => p.testo).join(""),
      nonInizializzata: elementi.every((v) => v === undefined),
      cambiata: pezzi.some((p) => p.cambiato),
      ...this.#segnoDi(elementi),
      pezzi,
    };
  }

  /** La riga 0, «Inizio», coi valori prima della prima azione; nessuna prima della prima azione. */
  iniziale(t: Traccia): RigaMostrata | undefined {
    const f = t.valoriIniziali;
    if (f === undefined) return undefined;
    const modifiche = t.modificheIniziali;
    return { numero: 0, chiave: 0, ripresa: false, livello: 0, regola: this.#testi.inizio, valori: this.#conISegni(modifiche, () => this.#celle({ dati: f })), attive: this.#attive(f), condizione: "", scrive: "", modificati: this.#vociDelleModifiche(modifiche) };
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
        valori: this.#conISegni(r.modifiche, () => this.#celle(r)),
        attive: this.#attive(r.dati),
        condizione: r.condizione === undefined ? "" : r.condizione ? testi.vero : testi.falso,
        scrive: r.letto !== undefined ? testi.letto + r.letto : (r.scrive ?? "").replaceAll("\n", testi.aCapo),
        modificati: this.#vociDelleModifiche(r.modifiche),
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

/** Il nome di un valore di un dato: l'elemento di un vettore (`v[2]`) o di una matrice (`m[1][0]`), il campo di un record
 * (`a.nome`) o di un record di una tabella (`t[1].nome`), il dato. */
const nomeDelValore = (d: DatoMostrato, i: number): string =>
  d.campi !== undefined && d.elementi !== undefined
    ? `${d.nome}[${Math.floor(i / d.campi.length)}].${d.campi[i % d.campi.length]!.nome}`
    : d.campi !== undefined ? `${d.nome}.${d.campi[i]!.nome}` : d.colonne !== undefined ? nomeDiUnElemento(d.nome, i, d.colonne) : d.elementi !== undefined ? `${d.nome}[${i}]` : d.nome;

/** Il nome dell'elemento `k` (riga dopo riga) di una matrice di `colonne` colonne: `m[1][0]`. */
const nomeDiUnElemento = (nome: string, k: number, colonne: number) => `${nome}[${Math.floor(k / colonne)}][${k % colonne}]`;

/** Il nome della colonna degli elementi di una matrice oltre il tetto: `m[2][2…3]` nella stessa riga, `m[1][2]…m[4][3]`
 * fra righe diverse, `m[2][3]` se è uno solo. */
const nomeDegliAltriDellaMatrice = (nome: string, righe: number, colonne: number): string => {
  const primo = tettoDelleColonne;
  const ultimo = righe * colonne - 1;
  if (primo === ultimo) return nomeDiUnElemento(nome, primo, colonne);
  const [r1, r2] = [Math.floor(primo / colonne), Math.floor(ultimo / colonne)];
  return r1 === r2 ? `${nome}[${r1}][${primo % colonne}…${ultimo % colonne}]` : `${nomeDiUnElemento(nome, primo, colonne)}…${nomeDiUnElemento(nome, ultimo, colonne)}`;
};

/** Il nome della colonna dei valori di una tabella oltre il tetto, nella forma con una colonna per campo di ogni record: il
 * primo e l'ultimo (`t[3].classe…t[4].voto`), o quello solo se è uno. */
const nomeDegliAltriDellaTabella = (d: DatoMostrato): string => {
  const ultimo = d.elementi! * d.campi!.length - 1;
  return ultimo === tettoDelleColonne ? nomeDelValore(d, ultimo) : `${nomeDelValore(d, tettoDelleColonne)}…${nomeDelValore(d, ultimo)}`;
};

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
 * il README); senza l'apostrofo la calcolerebbero come formula. Con valori scritti a mano, in fondo la colonna che li dice.
 */
export function csv(t: Traccia, tabella: TabellaMostrata, forma: FormaDelCsv, campo: string, ordine?: readonly number[]): string {
  const fonte = forma === "uguale" ? tabella : tabella.conForma("per-elemento", "per-elemento", "per-elemento");
  const testi = fonte.testi;
  const disposte = (celle: readonly string[]) => (forma === "uguale" && ordine ? ordine.map((i) => celle[i]!) : celle);
  const cella = (testo: string) => {
    const scritto = /^[=+\-@\t\r]/.test(testo) && !numeroNegativo.test(testo) ? `'${testo}` : testo;
    return scritto.includes(campo) || /["\r\n]/.test(scritto) ? `"${scritto.replaceAll('"', '""')}"` : scritto;
  };
  const livello = (x: string) => (fonte.conChiamate ? [x] : []);
  const nome = (c: ColonnaDiUnValore) => (c.funzione === undefined ? c.nome : `${c.funzione} › ${c.nome}`);
  const mostrate = fonte.righe(t);
  const modificati = (x: string) => (mostrate.some((r) => r.modificati !== "") ? [x] : []);
  const intestazione = [testi.numero, ...livello(testi.livello), testi.regola, ...disposte([...fonte.colonne.map((c) => `${nome(c)} (${c.tipo})`), testi.condizione, testi.scrive]), ...modificati(testi.valoriModificati)];
  const righe = [intestazione, ...mostrate.map((r) => [String(r.numero), ...livello(String(r.livello)), r.regola, ...disposte([...r.valori.map((v) => v.testo), r.condizione, r.scrive]), ...modificati(r.modificati)])];
  return `\u{feff}${righe.map((r) => r.map(cella).join(campo)).join("\r\n")}\r\n`;
}
