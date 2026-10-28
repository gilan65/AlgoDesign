// L'impaginazione del flowchart: una funzione pura dall'albero di una funzione ai riquadri, come numeri
// (la disposizione si calcola sempre dall'albero). Nessun DOM: la larghezza del testo la dà chi
// chiama (`MisuraDelTesto`), cioè nell'app il carattere vero del tema, nelle prove una misura fissa.
//
// I simboli: ovale per inizio e fine; rettangolo per
// l'assegnazione con la freccia; parallelogramma per lettura e scrittura, con la parola davanti; rombo per
// ogni condizione, col Vero a destra e il Falso a sinistra; `mentre` e `ripeti` con Vero = un altro giro;
// il commento è una nota a lato della linea del flusso. Testo su una riga, la forma si allarga; una
// condizione lunga, nella forma «Su due righe» (predefinita, opzione dell'app), va a capo prima di `and`
// od `or`, tagliata sulle parole e mai dentro un letterale.
//
// Leggibilità: ogni linea va da un tocco al successivo (un blocco o
// un punto di unione) e ha una sola punta, alla fine, anche quando entra in un'unione; dopo un'unione o
// una piega che scende al blocco successivo c'è una discesa lunga; il punto di unione è un cerchio vuoto,
// e le linee si fermano sul suo bordo.
//
// Ogni pezzo si costruisce intorno al proprio asse verticale (x = 0), con l'ingresso in (0, 0) e l'uscita
// in (0, altezza); `sinistra` e `destra` sono gli ingombri dall'asse. I rami e i corpi si spostano di
// quanto basta a non toccarsi, e le linee di ritorno passano fuori da ogni ingombro.
//
// I punti di inserimento nascono qui, dove si costruiscono le sequenze, e si spostano col loro pezzo: uno
// prima, uno fra e uno dopo i blocchi di ogni sequenza (anche vuota), ognuno col suo posto. Chi disegna i
// «+» e chi sceglie il bersaglio di un trascinamento li legge dal disegno, mai dal DOM: il posto che riceve
// un blocco è quello che l'impaginazione ha messo lì.

//
// I valori iniziali dei dati: sotto «Inizio», un blocco di assegnazione per
// ogni dato che ne ha uno, nell'ordine dei dati (le costanti comuni prima), disegnato dal dato: il valore iniziale
// resta un attributo del dato, e il blocco non è nell'albero. Niente punti di inserimento prima o fra di loro: il
// primo del programma sta sotto l'ultimo. Un'opzione dell'app li nasconde, e allora il disegno è quello di prima.
//
// I cicli `per` e `per ogni`: un riquadro tratteggiato con l'intestazione sul bordo
// in alto («per i da 1 a n», il passo solo se non è 1), a sinistra della linea che entra (il riquadro si allarga se
// serve). Dentro, secondo le opzioni dell'app: aperto, il `mentre` equivalente (la partenza, il rombo, l'elemento preso,
// il corpo, l'aumento), coi blocchi che il riquadro aggiunge disegnati come assegnazioni con l'`id` del ciclo e la
// loro fase; chiuso, il corpo con la linea che torna in cima. I blocchi aggiunti non sono nell'albero: i punti di
// inserimento stanno solo prima, fra e dopo i blocchi veri del corpo, e quelli prima e dopo il ciclo fuori dal
// riquadro (la linea del riquadro li separa come la nota di un commento).
//
// La copia di un vettore col suo nome (`altri ← voti`) sta in un riquadro come quello dei cicli, con
// la scritta «copia elemento per elemento»: compatta, l'assegnazione dentro e la scritta sul bordo (non è un blocco: il
// blocco è l'assegnazione); espansa, il `mentre` equivalente con la posizione, coi blocchi aggiunti con l'`id`
// dell'assegnazione e la loro fase, e sul bordo l'intestazione con l'assegnazione e la scritta (il blocco). Dentro, nessun
// punto di inserimento. La copia di un record col suo nome (`b ← a`) sta nello stesso riquadro con la scritta «copia
// campo per campo»: compatta come quella del vettore; espansa, senza il `mentre` (i campi hanno un nome), un'assegnazione
// per campo una sotto l'altra (`b.nome ← a.nome`), con l'`id` dell'assegnazione, la fase «elemento» e la posizione del
// campo.
//
// Procedure e funzioni: l'inizio di una procedura o di una funzione è la sua
// intestazione («Procedura leggi_numero(rif numero)», «Funzione booleano ← valido(voto)»), col nome in grassetto e
// *rif* e il tipo in corsivo; la fine di una funzione dice ciò che restituisce («Restituisce …»), quella di una procedura
// e del programma «Fine». Il blocco della chiamata è un rettangolo con due righe ai lati e la freccia ↪ davanti al nome
// in grassetto, con *rif* in corsivo davanti agli argomenti che la funzione chiamata riceve per riferimento. Un testo
// con uno stile si misura a pezzi, ognuno col suo stile: la misura del testo lo riceve.
//
// La Lettura con la domanda (un'opzione dell'app): una Scrittura che `domanda.ts` unisce alla Lettura
// che la segue non ha un pezzo suo; la Lettura è un parallelogramma su due righe, sopra la domanda (i valori separati da
// virgola, col segno dell'a capo) e sotto «leggi voto», con l'`id` della Lettura e quello della Scrittura. Fra le due non
// c'è un punto di inserimento, e i punti portano gli indici della sequenza vera.

import { analizza, parole } from "../espressioni/analizzatore";
import type { FaseDelCiclo } from "../interprete/interprete";
import type { Posto, Ramo } from "../modifica/operazioni";
import { eUnaCopia, eUnaCopiaDiUnRecord, nomiDeiRecord, nomiDeiVettori } from "../progetto/copia";
import type { Blocco, Campo, Dato, DefinizioneDelRecord, Funzione } from "../progetto/modello";
import { coppie, type Coppia, type Domanda } from "./domanda";
import type { GeometriaDelTema } from "./tema";

export type Forma = "inizio" | "fine" | "assegnazione" | "lettura" | "scrittura" | "condizione" | "commento" | "intestazione" | "chiamata";

export interface Punto {
  readonly x: number;
  readonly y: number;
}

export interface Rettangolo {
  readonly x: number;
  readonly y: number;
  readonly larghezza: number;
  readonly altezza: number;
}

export interface Elemento {
  /** L'`id` del blocco; per l'inizio, quello della funzione; per la fine, quello del blocco di fine; per il valore
   * iniziale di un dato, vuoto: l'unico `id` che nessun blocco può avere (un file con un `id` vuoto non si apre). */
  readonly id: string;
  /** Solo per il blocco del valore iniziale di un dato: il nome del dato, che lo identifica nella sua funzione. */
  readonly dato?: string;
  readonly forma: Forma;
  /** Il rettangolo che contiene la forma. */
  readonly riquadro: Rettangolo;
  /** Il contorno: rettangolo, rombo o parallelogramma; per inizio e fine il rettangolo dei lati dritti
   * (le estremità sono due semicerchi di diametro pari all'altezza). */
  readonly vertici: readonly Punto[];
  readonly testo: string;
  /** Il testo come si scrive nella forma, una riga per elemento (più di una solo per una condizione). */
  readonly righe: readonly string[];
  /** Solo per un testo con uno stile (l'intestazione di una procedura o di una funzione, il blocco della chiamata): le
   * righe a pezzi, ognuno col suo stile; uniti, sono le `righe`. */
  readonly pezzi?: readonly (readonly ParteDelTesto[])[];
  /** Solo per il blocco della chiamata: le due righe ai lati, dall'alto in basso. */
  readonly lati?: readonly (readonly [Punto, Punto])[];
  /** Il riquadro di tutte le righe insieme. */
  readonly riquadroTesto: Rettangolo;
  /** Solo in un ciclo `per` o `per ogni` aperto: la parte del `mentre` equivalente che l'elemento mostra (la partenza, la
   * condizione, l'elemento preso, l'aumento), coi nomi delle fasi dell'evento; l'`id` è quello del ciclo. Senza fase,
   * l'elemento di un ciclo è la sua intestazione. */
  readonly fase?: FaseDelCiclo;
  /** Solo nella copia espansa di un record col suo nome: la posizione del campo che l'assegnazione copia (la fase è
   * «elemento», l'`id` quello dell'assegnazione). */
  readonly campo?: number;
  /** Solo per il rombo di un ciclo (`mentre`, `ripeti`, il `per` e il `per ogni` aperti, la copia espansa): ha il colore
   * dei cicli, non quello del «se». */
  readonly ciclo?: true;
  /** Solo per una Lettura con la domanda: l'`id` della Scrittura che la domanda mostra (non ha un elemento suo). Le righe
   * sono due, la domanda e la Lettura. */
  readonly scrittura?: string;
}

/** Il riquadro tratteggiato di un ciclo `per` o `per ogni`, o della copia di un vettore col suo nome: il blocco e la linea
 * del riquadro. */
export interface RiquadroDelCiclo {
  readonly blocco: string;
  readonly bordo: Rettangolo;
  /** Solo per la copia compatta: la scritta sul bordo al posto dell'intestazione, che non è un blocco (il blocco è
   * l'assegnazione dentro il riquadro) e quindi non è fra gli elementi del disegno. */
  readonly didascalia?: Elemento;
}

export interface Connettore {
  /** Una spezzata a tratti orizzontali e verticali, da un tocco al successivo. */
  readonly punti: readonly Punto[];
  /** `flusso` porta da una regola alla successiva e ha la punta alla fine; `nota` lega un commento alla
   * linea del flusso, senza punta. */
  readonly genere: "flusso" | "nota";
}

/** Le due forme di una condizione lunga: un'opzione dell'app, non del progetto (non cambia il risultato). */
export type CondizioniLunghe = "su-due-righe" | "su-una-riga";

/** I valori iniziali dei dati sotto «Inizio», o nascosti: un'opzione dell'app (l'esecuzione non ne dipende). */
export type ValoriIniziali = "mostrati" | "nascosti";
/** Come si mostra il valore ripetuto in ogni elemento di un vettore: in un elenco, un valore per elemento, o il valore
 * solo. Un'opzione dell'app: il file dice soltanto che il valore è ripetuto. */
export type ValoreRipetuto = "elenco" | "un-valore";

/** Come si disegna un ciclo `per`: aperto (il `mentre` equivalente nel riquadro) o chiuso (l'intestazione e il corpo). */
export type FormaDelPer = "aperto" | "chiuso";
/** Come si disegna un ciclo `per ogni`: aperto con la posizione dell'elemento, aperto a parole, o chiuso. */
export type FormaDelPerOgni = "posizione" | "parole" | "chiuso";
/** Come si disegna la copia di un vettore col suo nome (`altri ← voti`), sempre in un riquadro con la scritta «copia
 * elemento per elemento»: compatta, l'assegnazione; espansa, il `mentre` equivalente con la posizione. Le azioni sono
 * le stesse nelle due forme. */
export type FormaDellaCopia = "compatta" | "espansa";
/** Dove si mostra la domanda di una Lettura: nella Scrittura che la precede, un blocco a sé (il predefinito), o nella
 * Lettura (`domanda.ts`), quando la console resta identica. Il file è lo stesso. */
export type DomandaDellaLettura = "nella-scrittura" | "nella-lettura";

export interface OpzioniDelDisegno {
  readonly condizioniLunghe: CondizioniLunghe;
  readonly valoriIniziali: ValoriIniziali;
  readonly valoreRipetuto: ValoreRipetuto;
  readonly per: FormaDelPer;
  readonly perOgni: FormaDelPerOgni;
  readonly copia: FormaDellaCopia;
  readonly domanda: DomandaDellaLettura;
}

export const opzioniPredefinite: OpzioniDelDisegno = {
  condizioniLunghe: "su-due-righe",
  valoriIniziali: "mostrati",
  valoreRipetuto: "elenco",
  per: "aperto",
  perOgni: "posizione",
  copia: "compatta",
  domanda: "nella-scrittura",
};

/** Quanti elementi di un elenco si scrivono: oltre, si dice quanti ne restano. */
export const ELEMENTI_SCRITTI = 10;

/** Le righe di una condizione nella forma «Su due righe»: un taglio solo, prima di un `and` o di un `or`
 * fuori dalle parentesi, il più vicino al centro; senza un taglio così, o con un testo che non si lascia
 * leggere, una riga. Il taglio cade sulle parole, quindi mai dentro un letterale. */
export function righeDellaCondizione(testo: string): string[] {
  const ps = parole(testo);
  if (ps === undefined) return [testo];
  let profondita = 0;
  const tagli: number[] = [];
  for (const p of ps) {
    if (p.genere === "segno" && (p.testo === "(" || p.testo === "[")) profondita++;
    else if (p.genere === "segno" && (p.testo === ")" || p.testo === "]")) profondita--;
    else if (p.genere === "parola" && (p.testo === "and" || p.testo === "or") && profondita === 0 && p.da > 0) tagli.push(p.da);
  }
  if (tagli.length === 0) return [testo];
  const c = Array.from(testo);
  const meta = c.length / 2;
  const taglio = tagli.reduce((m, t) => (Math.abs(t - meta) < Math.abs(m - meta) ? t : m));
  return [c.slice(0, taglio).join("").trimEnd(), c.slice(taglio).join("")];
}

export interface Etichetta {
  readonly blocco: string;
  readonly valore: "vero" | "falso";
  readonly testo: string;
  readonly riquadro: Rettangolo;
}

export interface Ricongiungimento {
  readonly centro: Punto;
  readonly raggio: number;
}

/** Un posto in cui si può inserire un blocco, dove lo si disegna: su una linea del flusso, al centro della
 * parte libera del passo che lo separa dal blocco vicino (il passo senza la punta della freccia). Il posto è
 * quello che consumano le modifiche del nucleo. */
export interface PuntoDiInserimento extends Punto {
  readonly posto: Posto;
}

export interface Disegno {
  readonly larghezza: number;
  readonly altezza: number;
  readonly elementi: readonly Elemento[];
  readonly connettori: readonly Connettore[];
  readonly etichette: readonly Etichetta[];
  readonly ricongiungimenti: readonly Ricongiungimento[];
  readonly punti: readonly PuntoDiInserimento[];
  readonly riquadri: readonly RiquadroDelCiclo[];
}

/** Lo stile di una parte del testo: il nome di una procedura o di una funzione in grassetto, *rif* e il tipo in corsivo. */
export type StileDelTesto = "grassetto" | "corsivo";

/** La larghezza in pixel di un testo su una riga, col carattere del tema nello stile dato (senza, il normale). */
export type MisuraDelTesto = (testo: string, stile?: StileDelTesto) => number;

/** Le parole che il disegno mostra: le dà l'interfaccia nella sua lingua. */
export interface TestiDelDisegno {
  readonly inizio: string;
  readonly fine: string;
  readonly leggi: string;
  readonly scrivi: string;
  readonly vero: string;
  readonly falso: string;
  /** Il segno che chiude una scrittura che va a capo. */
  readonly aCapo: string;
  /** Il valore ripetuto di un vettore mostrato da solo: un modello con `{valore}`. */
  readonly ogniElemento: string;
  /** In coda a un elenco tagliato, quanti elementi restano: un modello con `{n}`. */
  readonly altri: string;
  /** Il testo di un'espressione come lo si mostra (gli operatori a parola nella lingua dell'interfaccia). */
  readonly espressione?: (testo: string) => string;
  readonly cicli: ParoleDeiCicli;
  readonly funzioni: ParoleDelleFunzioni;
}

/** Le parole di procedure e funzioni nel disegno: modelli coi segnaposto fra graffe. */
export interface ParoleDelleFunzioni {
  /** L'intestazione di una procedura: `{nome}`, `{parametri}`. */
  readonly procedura: string;
  /** L'intestazione di una funzione: anche `{tipo}`, ciò che restituisce. */
  readonly funzione: string;
  /** La fine di una funzione: `{valore}`. */
  readonly restituisce: string;
  /** Il blocco della chiamata: `{nome}`, `{argomenti}`. */
  readonly chiamata: string;
  /** Davanti a un parametro, o a un argomento, per riferimento. */
  readonly rif: string;
  /** Davanti a un parametro, o a un argomento, per uscita. */
  readonly out: string;
  /** Il tipo di ciò che una funzione restituisce nell'intestazione (la dimensione di un vettore; la lunghezza massima di
   * una stringa la dice chi dà le parole). */
  readonly tipo: (d: Dato) => string;
}

/** Le parole dei cicli `per` e `per ogni` nel disegno: modelli coi segnaposto fra graffe. */
export interface ParoleDeiCicli {
  /** L'intestazione di un `per` col passo 1, che non si scrive: `{contatore}`, `{da}`, `{a}`. */
  readonly per: string;
  /** L'intestazione di un `per` con un altro passo: anche `{passo}`. */
  readonly perConPasso: string;
  /** L'intestazione di un `per ogni`: `{elemento}`, `{sorgente}`. */
  readonly perOgni: string;
  /** Il nome della posizione dell'elemento, nel `per ogni` aperto con la posizione: quello del codice generato (dentro
   * un altro `per ogni`, col numero del livello, come nel codice). */
  readonly indice: string;
  /** La condizione e l'elemento preso del `per ogni` aperto a parole: `{sorgente}`. */
  readonly altroElemento: string;
  readonly elementoSuccessivo: string;
  /** La scritta del riquadro della copia di un vettore col suo nome. */
  readonly copia: string;
  /** L'intestazione della copia espansa: `{assegnazione}` e `{copia}`, la scritta. */
  readonly copiaEspansa: string;
  /** La scritta del riquadro della copia di un record col suo nome. */
  readonly copiaCampi: string;
}

interface Pezzo {
  readonly sinistra: number;
  readonly destra: number;
  readonly altezza: number;
  readonly elementi: readonly Elemento[];
  readonly connettori: readonly Connettore[];
  readonly etichette: readonly Etichetta[];
  readonly ricongiungimenti: readonly Ricongiungimento[];
  readonly punti: readonly PuntoDiInserimento[];
  readonly riquadri: readonly RiquadroDelCiclo[];
}

const vuoto: Pezzo = { sinistra: 0, destra: 0, altezza: 0, elementi: [], connettori: [], etichette: [], ricongiungimenti: [], punti: [], riquadri: [] };

const punto = (x: number, y: number): Punto => ({ x, y });
const rettangolo = (x: number, y: number, larghezza: number, altezza: number): Rettangolo => ({ x, y, larghezza, altezza });
const flusso = (...punti: Punto[]): Connettore => ({ punti, genere: "flusso" });

function sposta(p: Pezzo, dx: number, dy: number): Pezzo {
  const pt = (q: Punto) => punto(q.x + dx, q.y + dy);
  const ret = (r: Rettangolo) => rettangolo(r.x + dx, r.y + dy, r.larghezza, r.altezza);
  return {
    sinistra: p.sinistra - dx,
    destra: p.destra + dx,
    altezza: p.altezza,
    elementi: p.elementi.map((e) => spostato(e, dx, dy)),
    connettori: p.connettori.map((c) => ({ ...c, punti: c.punti.map(pt) })),
    etichette: p.etichette.map((t) => ({ ...t, riquadro: ret(t.riquadro) })),
    ricongiungimenti: p.ricongiungimenti.map((r) => ({ ...r, centro: pt(r.centro) })),
    punti: p.punti.map((q) => ({ ...pt(q), posto: q.posto })),
    riquadri: p.riquadri.map((r) => ({ ...r, bordo: ret(r.bordo), ...(r.didascalia ? { didascalia: spostato(r.didascalia, dx, dy) } : {}) })),
  };
}

function spostato(e: Elemento, dx: number, dy: number): Elemento {
  const pt = (q: Punto) => punto(q.x + dx, q.y + dy);
  const ret = (r: Rettangolo) => rettangolo(r.x + dx, r.y + dy, r.larghezza, r.altezza);
  return {
    ...e,
    riquadro: ret(e.riquadro),
    vertici: e.vertici.map(pt),
    riquadroTesto: ret(e.riquadroTesto),
    ...(e.lati ? { lati: e.lati.map(([a, b]) => [pt(a), pt(b)] as const) } : {}),
  };
}

/** Più pezzi già posti nello stesso sistema di coordinate, con gli ingombri dati. */
function unisci(sinistra: number, destra: number, altezza: number, pezzi: readonly Pezzo[], extra: Partial<Pezzo> = {}): Pezzo {
  return {
    sinistra,
    destra,
    altezza,
    elementi: [...pezzi.flatMap((p) => p.elementi), ...(extra.elementi ?? [])],
    connettori: [...pezzi.flatMap((p) => p.connettori), ...(extra.connettori ?? [])],
    etichette: [...pezzi.flatMap((p) => p.etichette), ...(extra.etichette ?? [])],
    ricongiungimenti: [...pezzi.flatMap((p) => p.ricongiungimenti), ...(extra.ricongiungimenti ?? [])],
    punti: [...pezzi.flatMap((p) => p.punti), ...(extra.punti ?? [])],
    riquadri: [...pezzi.flatMap((p) => p.riquadri), ...(extra.riquadri ?? [])],
  };
}

/** Una parte del testo di un blocco: un'espressione (come la si mostra) o il resto (la parola davanti, la freccia,
 * le virgole, il segno dell'a capo, il testo di un commento). */
export interface ParteDelTesto {
  readonly testo: string;
  readonly espressione: boolean;
  /** Solo nell'intestazione di una procedura o di una funzione e nel blocco della chiamata; senza, il normale. */
  readonly stile?: StileDelTesto;
}

/** Il testo di un blocco a parti: unite, sono `testoDelBlocco`. Il watch cerca i nomi dei dati nelle sole
 * espressioni, una per una. */
export function partiDelBlocco(b: Blocco, testi: TestiDelDisegno): ParteDelTesto[] {
  const mostrata = testi.espressione ?? ((t: string) => t);
  const e = (t: string): ParteDelTesto => ({ testo: mostrata(t), espressione: true });
  const resto = (testo: string): ParteDelTesto => ({ testo, espressione: false });
  switch (b.kind) {
    case "assignment":
      return [e(b.target), resto(" ← "), e(b.value)];
    case "read":
      return [resto(`${testi.leggi} `), e(b.target)];
    case "write":
      return [resto(`${testi.scrivi} `), ...b.values.flatMap((v, i) => (i === 0 ? [e(v)] : [resto(", "), e(v)])), ...(b.newline ? [resto(testi.aCapo)] : [])];
    case "if":
    case "while":
    case "repeat":
      return [e(b.condition)];
    case "comment":
      return [resto(b.text)];
    case "for": {
      const conPasso = b.step !== undefined && b.step !== 1;
      return staccate(partiDelModello(conPasso ? testi.cicli.perConPasso : testi.cicli.per, { contatore: e(b.counter), da: e(b.from), a: e(b.to), ...(conPasso ? { passo: e(String(b.step)) } : {}) }));
    }
    case "for_each":
      return staccate(partiDelModello(testi.cicli.perOgni, { elemento: e(b.item), sorgente: e(b.source) }));
    case "call":
      // Il salto come lo scrive il file, senza la freccia né *rif*: il disegno e la tabella di traccia usano
      // `partiDellaChiamata`, che conosce la procedura chiamata; qui servono solo le espressioni degli argomenti.
      return [resto(`${b.callee}(`), ...b.arguments.flatMap((a, i) => (i === 0 ? [e(a)] : [resto(", "), e(a)])), resto(")")];
  }
}

/** La domanda di una Lettura a parti, la riga sopra nel blocco unito: i valori separati da virgola, col segno dell'a capo
 * se va a capo (come nella Scrittura, senza la parola davanti). */
export function partiDellaDomanda(d: Domanda, testi: TestiDelDisegno): ParteDelTesto[] {
  const mostrata = testi.espressione ?? ((t: string) => t);
  const e = (t: string): ParteDelTesto => ({ testo: mostrata(t), espressione: true });
  const resto = (testo: string): ParteDelTesto => ({ testo, espressione: false });
  return [...d.values.flatMap((v, i) => (i === 0 ? [e(v)] : [resto(", "), e(v)])), ...(d.newline ? [resto(testi.aCapo)] : [])];
}

/** Lo spazio largo (U+2002, mezzo quadratone: circa il doppio di uno spazio): un disegno SVG riduce due spazi a uno. */
export const SPAZIO_LARGO = String.fromCodePoint(0x2002);

/** Le parole fra due valori dell'intestazione di un ciclo («da», «a», «passo», «in») staccate dai valori con lo spazio
 * largo: con uno spazio solo si leggevano attaccate al valore («1 a n»). */
const staccate = (parti: readonly ParteDelTesto[]): ParteDelTesto[] =>
  parti.map((p, i) => (!p.espressione && i > 0 && i < parti.length - 1 ? { ...p, testo: p.testo.replaceAll(" ", SPAZIO_LARGO) } : p));

/** Un modello coi segnaposto fra graffe, a parti: il testo fra un segnaposto e l'altro, e la parte (o le parti) di ogni
 * segnaposto. */
function partiDelModello(modello: string, segnaposto: Readonly<Record<string, ParteDelTesto | readonly ParteDelTesto[]>>): ParteDelTesto[] {
  return modello.split(/\{(\w+)\}/).flatMap((pezzo, i): ParteDelTesto[] => {
    if (i % 2 === 1) return [segnaposto[pezzo] ?? { testo: `{${pezzo}}`, espressione: false }].flat();
    return pezzo === "" ? [] : [{ testo: pezzo, espressione: false }];
  });
}

/** Un elenco separato da virgole: i parametri dell'intestazione, gli argomenti di una chiamata; *rif* in corsivo davanti a
 * ognuno di quelli per riferimento, *out* davanti a quelli per uscita. */
function elencoConRif(voci: readonly { readonly parte: ParteDelTesto; readonly modo: Dato["parameter"] }[], testi: TestiDelDisegno): ParteDelTesto[] {
  return voci.flatMap((v, i) => {
    const parola = v.modo === "reference" ? testi.funzioni.rif : v.modo === "out" ? testi.funzioni.out : undefined;
    return [
      ...(i === 0 ? [] : [{ testo: ", ", espressione: false }]),
      ...(parola !== undefined ? [{ testo: parola, espressione: false, stile: "corsivo" as const }, { testo: " ", espressione: false }] : []),
      v.parte,
    ];
  });
}

/** Ciò che una funzione restituisce come un dato: il tipo, la dimensione di un vettore e la lunghezza massima di una
 * stringa. */
export const risultatoDi = (f: Funzione): Dato => ({
  name: f.name ?? "",
  type: f.return_type ?? "integer",
  ...(f.return_size !== undefined ? { size: f.return_size } : {}),
  ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}),
});

const parametriDi = (f: Funzione) => f.data.filter((d) => d.parameter !== undefined);

/** L'intestazione di una procedura o di una funzione, nel blocco d'inizio, a parti con lo stile: il nome in grassetto,
 * *rif*, *out* e il tipo restituito in corsivo (con la dimensione di un vettore). Il programma principale ha
 * la parola dell'inizio. */
export function partiDellIntestazione(f: Funzione, testi: TestiDelDisegno): ParteDelTesto[] {
  if (f.kind === "main") return [{ testo: testi.inizio, espressione: false }];
  const parametri = elencoConRif(
    parametriDi(f).map((d) => ({ parte: { testo: d.name, espressione: false }, modo: d.parameter })),
    testi,
  );
  const nome: ParteDelTesto = { testo: f.name ?? "", espressione: false, stile: "grassetto" };
  if (f.kind === "procedure") return partiDelModello(testi.funzioni.procedura, { nome, parametri });
  const tipo: ParteDelTesto = { testo: f.return_type === undefined ? "" : testi.funzioni.tipo(risultatoDi(f)), espressione: false, stile: "corsivo" };
  return partiDelModello(testi.funzioni.funzione, { tipo, nome, parametri });
}

/** La fine di una funzione: ciò che restituisce, un'espressione; di una procedura e del programma, la parola della fine. */
export function partiDellaFine(f: Funzione, testi: TestiDelDisegno): ParteDelTesto[] {
  if (f.kind !== "function") return [{ testo: testi.fine, espressione: false }];
  const mostrata = testi.espressione ?? ((t: string) => t);
  return partiDelModello(testi.funzioni.restituisce, { valore: { testo: mostrata(f.end.return_value ?? ""), espressione: true } });
}

/** Il blocco della chiamata a parti con lo stile: la freccia e il nome in grassetto, gli argomenti, *rif* in corsivo davanti
 * a quelli che la funzione chiamata riceve per riferimento e *out* a quelli per uscita (`chiamata`: la procedura o la
 * funzione con quel nome, se c'è; senza, nessuna parola: l'errore lo dice il controllo statico). */
export function partiDellaChiamata(b: Extract<Blocco, { kind: "call" }>, chiamata: Funzione | undefined, testi: TestiDelDisegno): ParteDelTesto[] {
  const mostrata = testi.espressione ?? ((t: string) => t);
  const parametri = chiamata === undefined ? [] : parametriDi(chiamata);
  const argomenti = elencoConRif(
    b.arguments.map((a, i) => ({ parte: { testo: mostrata(a), espressione: true }, modo: parametri[i]?.parameter })),
    testi,
  );
  return partiDelModello(testi.funzioni.chiamata, { nome: { testo: b.callee, espressione: false, stile: "grassetto" }, argomenti });
}

/** La procedura o la funzione chiamata da un salto: per nome, fra quelle del progetto (mai il programma principale). */
export const funzioneChiamata = (funzioni: readonly Funzione[], nome: string): Funzione | undefined =>
  funzioni.find((f) => f.kind !== "main" && f.name === nome);

/** La larghezza di una riga a parti, ognuna misurata col suo stile. */
export const misuraDelleParti = (parti: readonly ParteDelTesto[], misura: MisuraDelTesto): number => parti.reduce((s, p) => s + misura(p.testo, p.stile), 0);

/**
 * Le parti di un testo coi nomi delle procedure e delle funzioni del progetto in grassetto anche dentro le espressioni:
 * un nome seguito dalla parentesi. Le funzioni predefinite sono operatori a parola, senza
 * parentesi, e un operatore tradotto non è mai il nome di una funzione (le parole degli operatori sono riservate in ogni
 * lingua). Un'espressione che non si lascia leggere resta com'è; il testo unito non cambia.
 */
export function grassettoAlleFunzioni(parti: readonly ParteDelTesto[], nomi: ReadonlySet<string>): ParteDelTesto[] {
  if (nomi.size === 0) return [...parti];
  return parti.flatMap((p): ParteDelTesto[] => {
    const ps = !p.espressione || p.stile !== undefined ? undefined : parole(p.testo);
    if (ps === undefined) return [p];
    const c = Array.from(p.testo);
    const fuori: ParteDelTesto[] = [];
    let k = 0;
    ps.forEach((w, i) => {
      const dopo = ps[i + 1];
      if (w.genere !== "nome" || !nomi.has(w.testo) || dopo?.genere !== "segno" || dopo.testo !== "(") return;
      if (w.da > k) fuori.push({ testo: c.slice(k, w.da).join(""), espressione: true });
      fuori.push({ testo: c.slice(w.da, w.a).join(""), espressione: true, stile: "grassetto" });
      k = w.a;
    });
    if (k < c.length) fuori.push({ testo: c.slice(k).join(""), espressione: true });
    return fuori;
  });
}

/** Le parti di un testo divise nelle sue righe (una, o le due di una condizione lunga: la prima è la testa del testo senza
 * gli spazi in fondo, la seconda la coda), contando i codici. */
function pezziDelleRighe(parti: readonly ParteDelTesto[], righe: readonly string[], testo: string): ParteDelTesto[][] {
  const n = Array.from(testo).length;
  return righe.map((riga, i) => {
    const da = i === 0 ? 0 : n - Array.from(riga).length;
    const a = da + Array.from(riga).length;
    const fuori: ParteDelTesto[] = [];
    let k = 0;
    for (const p of parti) {
      const c = Array.from(p.testo);
      const [x, y] = [Math.max(da, k), Math.min(a, k + c.length)];
      if (x < y) fuori.push({ ...p, testo: c.slice(x - k, y - k).join("") });
      k += c.length;
    }
    return fuori;
  });
}

/**
 * Il testo di un blocco come lo mostra il disegno, nella lingua dei `testi`: la tabella di traccia lo
 * riusa come regola, così una riga dice esattamente ciò che il blocco mostra. Una condizione è la sua
 * espressione; un blocco fuori tappa non ha testo.
 */
export function testoDelBlocco(b: Blocco, testi: TestiDelDisegno): string {
  return partiDelBlocco(b, testi)
    .map((p) => p.testo)
    .join("");
}

/** Le parti di un testo, unite. */
const unite = (parti: readonly ParteDelTesto[]): string => parti.map((p) => p.testo).join("");

/** Le forme dei due cicli (le opzioni dell'app): il disegno, la tabella di traccia e il watch le leggono uguali. */
export type FormeDeiCicli = Pick<OpzioniDelDisegno, "per" | "perOgni" | "copia">;

/** Il nome della posizione dell'elemento di un `per ogni` al suo livello (1 se nessun altro lo contiene): quello del
 * codice generato, `_indice`, poi `_indice2`. */
export const nomeDellaPosizione = (testi: TestiDelDisegno, livello: number): string => (livello === 1 ? testi.cicli.indice : `${testi.cicli.indice}${livello}`);

/**
 * Le parti del blocco che il riquadro di un ciclo aperto mostra per una fase dell'evento (unite, il suo testo): un
 * `per` la partenza, il controllo e l'aumento; un `per ogni` con la posizione anche l'elemento preso, a parole il solo
 * controllo e l'elemento; la copia espansa di un vettore col suo nome (un'assegnazione) le parti del `per ogni` con la
 * posizione, con l'elemento copiato. Nessuna se il ciclo è chiuso, la copia compatta o la forma non ha quel blocco.
 * `livello`: quello del `per ogni` o della copia (il nome della posizione); `dati`: dove sta il vettore, di cui il
 * controllo dice la dimensione.
 */
export function partiDellaFase(
  b: Extract<Blocco, { kind: "for" | "for_each" | "assignment" }>,
  fase: FaseDelCiclo,
  forme: FormeDeiCicli,
  testi: TestiDelDisegno,
  livello: number,
  /** I dati che il ciclo vede: della funzione e, nel programma principale, le costanti comuni. */
  dati: readonly Dato[],
): ParteDelTesto[] | undefined {
  const mostrata = testi.espressione ?? ((t: string) => t);
  const e = (t: string): ParteDelTesto => ({ testo: mostrata(t), espressione: true });
  const resto = (testo: string): ParteDelTesto => ({ testo, espressione: false });
  if (b.kind === "assignment") {
    if (forme.copia === "compatta") return undefined;
    const i = nomeDellaPosizione(testi, livello);
    const verso = b.target.trim();
    if (fase === "inizio") return [resto(`${i} ← 0`)];
    if (fase === "condizione") return [resto(`${i} < ${dati.find((d) => d.name === verso)?.size ?? "?"}`)];
    if (fase === "elemento") return [e(verso), resto(`[${i}] ← `), e(b.value.trim()), resto(`[${i}]`)];
    return [resto(`${i} ← ${i} + 1`)];
  }
  if (b.kind === "for") {
    if (forme.per === "chiuso") return undefined;
    const passo = b.step ?? 1;
    if (fase === "inizio") return [e(b.counter), resto(" ← "), e(b.from)];
    if (fase === "condizione") return [e(b.counter), resto(passo > 0 ? " <= " : " >= "), e(b.to)];
    if (fase === "passo") return [e(b.counter), resto(" ← "), e(b.counter), resto(` ${passo > 0 ? "+" : "-"} ${Math.abs(passo)}`)];
    return undefined;
  }
  if (forme.perOgni === "parole") {
    if (fase === "condizione") return partiDelModello(testi.cicli.altroElemento, { sorgente: e(b.source) });
    if (fase === "elemento") return [e(b.item), resto(" ← "), ...partiDelModello(testi.cicli.elementoSuccessivo, { sorgente: e(b.source) })];
    return undefined;
  }
  if (forme.perOgni === "chiuso") return undefined;
  const indice = nomeDellaPosizione(testi, livello);
  if (fase === "inizio") return [resto(`${indice} ← 0`)];
  if (fase === "passo") return [resto(`${indice} ← ${indice} + 1`)];
  if (fase === "elemento") return [e(b.item), resto(" ← "), e(b.source), resto(`[${indice}]`)];
  // La fine: la dimensione di un vettore (della funzione o una costante comune), o la lunghezza ricalcolata di una
  // stringa.
  const dimensione = dati.find((d) => d.name === b.source)?.size;
  return [resto(`${indice} < `), dimensione !== undefined ? resto(String(dimensione)) : e(`length ${b.source}`)];
}

/** L'intestazione della copia espansa di un vettore col suo nome: l'assegnazione e la scritta del riquadro. */
export const partiDellIntestazioneDellaCopia = (b: Extract<Blocco, { kind: "assignment" }>, testi: TestiDelDisegno, scritta = testi.cicli.copia): ParteDelTesto[] =>
  partiDelModello(testi.cicli.copiaEspansa, { assegnazione: partiDelBlocco(b, testi), copia: { testo: scritta, espressione: false } });

/** L'assegnazione di un campo nella copia di un record col suo nome (`b.nome ← a.nome`): il blocco della copia espansa, la
 * regola della sua riga nella tabella di traccia e il messaggio della pausa, nelle due forme. */
export const partiDelCampoDellaCopia = (b: Extract<Blocco, { kind: "assignment" }>, campo: string, testi: TestiDelDisegno): ParteDelTesto[] =>
  partiDelBlocco({ ...b, target: `${b.target.trim()}.${campo}`, value: `${b.value.trim()}.${campo}` }, testi);

/** I campi del record di cui `b` è la copia col suo nome (`b ← a` fra due record), o nessuno se non lo è. */
export function campiDellaCopia(b: Blocco, dati: readonly Dato[], records: readonly DefinizioneDelRecord[]): readonly Campo[] | undefined {
  if (!eUnaCopiaDiUnRecord(b, nomiDeiRecord(dati)) || b.kind !== "assignment") return undefined;
  const verso = analizza(b.target);
  const nome = verso.ok && verso.espressione.genere === "nome" ? verso.espressione.nome : undefined;
  const d = dati.find((x) => x.name === nome);
  return records.find((r) => r.name === d?.record)?.fields;
}

/** Un modello dei testi col suo segnaposto: le parti prima e dopo. */
function attorno(modello: string, segnaposto: string): [string, string] {
  const i = modello.indexOf(segnaposto);
  return i < 0 ? [modello, ""] : [modello.slice(0, i), modello.slice(i + segnaposto.length)];
}

/** Un elenco fra graffe di `quanti` elementi, di cui si danno i primi (al più `ELEMENTI_SCRITTI`), poi quanti ne
 * restano: lo stesso nel blocco del valore iniziale e, coi valori, nella tabella di traccia. */
export function partiDellElenco(primi: readonly ParteDelTesto[], quanti: number, testi: TestiDelDisegno): ParteDelTesto[] {
  const resto = (testo: string): ParteDelTesto => ({ testo, espressione: false });
  const [prima, dopo] = attorno(testi.altri, "{n}");
  const altri = quanti - primi.length;
  return [resto("{"), ...primi.flatMap((x, i) => (i === 0 ? [x] : [resto(", "), x])), ...(altri > 0 ? [resto(`, ${prima}${altri}${dopo}`)] : []), resto("}")];
}

/**
 * Il valore iniziale di un dato a parti, come lo mostrano il blocco sotto «Inizio» e la riga della vista dei dati:
 * un letterale com'è; un elenco fra graffe, i primi `ELEMENTI_SCRITTI` e quanti ne restano; il valore ripetuto in
 * ogni elemento di un vettore come l'elenco che riempie o da solo, secondo `ripetuto` (da solo anche senza una
 * dimensione valida). Un valore sbagliato si mostra com'è scritto: l'errore lo dice il controllo statico.
 * Senza valore iniziale, `undefined`.
 */
export function partiDelValoreIniziale(d: Dato, testi: TestiDelDisegno, ripetuto: ValoreRipetuto): ParteDelTesto[] | undefined {
  const v = d.initial;
  if (v === undefined) return undefined;
  const mostrata = testi.espressione ?? ((t: string) => t);
  const e = (t: string): ParteDelTesto => ({ testo: mostrata(t), espressione: true });
  const resto = (testo: string): ParteDelTesto => ({ testo, espressione: false });
  /** Un elenco di `quanti` elementi, di cui si conoscono i primi (al più `ELEMENTI_SCRITTI`). */
  const elenco = (primi: readonly string[], quanti: number): ParteDelTesto[] => partiDellElenco(primi.map(e), quanti, testi);
  if (typeof v === "string") return [e(v)];
  if (Array.isArray(v)) return elenco((v as readonly string[]).slice(0, ELEMENTI_SCRITTI), v.length);
  const ogni = (v as { readonly each: string }).each;
  const n = d.size;
  if (ripetuto === "elenco" && n !== undefined && Number.isInteger(n) && n >= 1) return elenco(Array<string>(Math.min(n, ELEMENTI_SCRITTI)).fill(ogni), n);
  const [prima, dopo] = attorno(testi.ogniElemento, "{valore}");
  return [...(prima === "" ? [] : [resto(prima)]), e(ogni), ...(dopo === "" ? [] : [resto(dopo)])];
}

/** Il valore iniziale di un dato come lo mostra la riga della vista dei dati (`partiDelValoreIniziale`, unite). */
export function valoreIniziale(d: Dato, testi: TestiDelDisegno, ripetuto: ValoreRipetuto): string | undefined {
  return partiDelValoreIniziale(d, testi, ripetuto)
    ?.map((p) => p.testo)
    .join("");
}

/** Il testo del blocco del valore iniziale di un dato: un'assegnazione, `nome ← valore`, anche per una costante. Lo
 * stesso per il disegno, la regola della tabella di traccia (e del CSV) e il messaggio della pausa. */
export function testoDelValoreIniziale(d: Dato, testi: TestiDelDisegno, ripetuto: ValoreRipetuto): string | undefined {
  const valore = valoreIniziale(d, testi, ripetuto);
  return valore === undefined ? undefined : `${d.name} ← ${valore}`;
}

export function impagina(
  funzione: Funzione,
  tema: GeometriaDelTema,
  misura: MisuraDelTesto,
  testi: TestiDelDisegno,
  opzioni: OpzioniDelDisegno = opzioniPredefinite,
  /** Le costanti comuni del progetto, i cui valori iniziali si disegnano per primi (nel programma principale). */
  costantiComuni: readonly Dato[] = [],
  /** Le funzioni del progetto: un salto dice *rif* davanti agli argomenti che la funzione chiamata riceve per
   * riferimento. */
  funzioni: readonly Funzione[] = [],
  /** I record del progetto: la copia di un record col suo nome ne mostra i campi. */
  records: readonly DefinizioneDelRecord[] = [],
): Disegno {
  const hTesto = tema.altezzaRiga;
  /** Le Letture che mostrano la domanda, con l'opzione: le coppie della funzione, per `id` della Lettura. */
  const domande: ReadonlyMap<string, Coppia> = opzioni.domanda === "nella-lettura" ? coppie(funzione.body) : new Map();
  /** I nomi delle procedure e delle funzioni del progetto: in grassetto anche dentro le espressioni. */
  const nomiDelleFunzioni = new Set(funzioni.flatMap((f) => (f.kind !== "main" && f.name !== undefined ? [f.name] : [])));

  /** Una forma col suo testo, centrata sull'asse, col bordo superiore in y = 0. Un testo con uno stile (anche solo il nome
   * di una funzione del progetto in un'espressione) si misura a pezzi, ognuno col suo stile, riga per riga. */
  function forma(
    id: string,
    genere: Forma,
    contenuto: string | readonly ParteDelTesto[],
    /** Le righe date a parti (la Lettura con la domanda): unite, sono `contenuto`, che allora è quelle parti di seguito. */
    righeDate?: readonly (readonly ParteDelTesto[])[],
  ): { elemento: Elemento; larghezza: number; altezza: number } {
    const parti = typeof contenuto === "string" ? [{ testo: contenuto, espressione: false }] : grassettoAlleFunzioni(contenuto, nomiDelleFunzioni);
    const testo = unite(parti);
    const conStile = parti.some((p) => p.stile !== undefined);
    const lunga = (conStile ? misuraDelleParti(parti, misura) : misura(testo)) > tema.sogliaACapo;
    const righe =
      righeDate !== undefined ? righeDate.map(unite)
      : genere === "condizione" && opzioni.condizioniLunghe === "su-due-righe" && lunga ? righeDellaCondizione(testo)
      : [testo];
    const pezzi = conStile ? pezziDelleRighe(parti, righe, testo) : undefined;
    const wTesto = pezzi ? Math.max(...pezzi.map((r) => misuraDelleParti(r, misura))) : Math.max(...righe.map((r) => misura(r)));
    const hRighe = hTesto * righe.length;
    const mx = tema.margineTestoX;
    const my = tema.margineTestoY;
    let larghezza: number;
    let altezza = hRighe + 2 * my;
    let vertici: (w: number, h: number) => Punto[] = (w, h) => [punto(0, 0), punto(w, 0), punto(w, h), punto(0, h)];
    let lati: ((w: number, h: number) => [Punto, Punto][]) | undefined;
    switch (genere) {
      case "assegnazione":
      case "commento":
        larghezza = wTesto + 2 * mx;
        break;
      case "chiamata": {
        // Il testo fra le due righe ai lati, col margine verso ciascuna.
        const s = tema.latiDellaChiamata;
        larghezza = wTesto + 2 * mx + 2 * s;
        lati = (w, h) => [
          [punto(s, 0), punto(s, h)],
          [punto(w - s, 0), punto(w - s, h)],
        ];
        break;
      }
      case "lettura":
      case "scrittura": {
        const s = tema.scartoParallelogramma;
        larghezza = wTesto + 2 * mx + 2 * s;
        vertici = (w, h) => [punto(s, 0), punto(w, 0), punto(w - s, h), punto(0, h)];
        break;
      }
      case "inizio":
      case "fine":
        // Lati dritti lunghi quanto il testo con il margine; le estremità sono semicerchi.
        larghezza = wTesto + 2 * mx + altezza;
        break;
      case "condizione": {
        // Il riquadro del testo sta dentro il rombo se |x|/a + |y|/b <= 1 nei suoi vertici: con
        // b = k * (mezza altezza del testo e del margine), a = (mezza larghezza) * k / (k - 1).
        const k = tema.rapportoRombo;
        const b = k * (hRighe / 2 + my);
        const a = ((wTesto / 2 + mx) * k) / (k - 1);
        larghezza = 2 * a;
        altezza = 2 * b;
        vertici = (w, h) => [punto(w / 2, 0), punto(w, h / 2), punto(w / 2, h), punto(0, h / 2)];
        break;
      }
      case "intestazione":
        // Il fondo che interrompe la linea del riquadro: la luce intorno al testo, la metà in verticale.
        larghezza = wTesto + 2 * tema.luceIntestazione;
        altezza = hRighe + tema.luceIntestazione;
        break;
    }
    const x = -larghezza / 2;
    const elemento: Elemento = {
      id,
      forma: genere,
      riquadro: rettangolo(x, 0, larghezza, altezza),
      vertici: vertici(larghezza, altezza).map((v) => punto(v.x + x, v.y)),
      testo,
      righe,
      ...(pezzi ? { pezzi } : {}),
      ...(lati ? { lati: lati(larghezza, altezza).map(([a, b]) => [punto(a.x + x, a.y), punto(b.x + x, b.y)] as const) } : {}),
      riquadroTesto: rettangolo(-wTesto / 2, altezza / 2 - hRighe / 2, wTesto, hRighe),
    };
    return { elemento, larghezza, altezza };
  }

  function semplice(id: string, genere: Forma, testo: string | readonly ParteDelTesto[], righe?: readonly (readonly ParteDelTesto[])[]): Pezzo {
    const f = forma(id, genere, testo, righe);
    return { ...vuoto, sinistra: f.larghezza / 2, destra: f.larghezza / 2, altezza: f.altezza, elementi: [f.elemento] };
  }

  /** I pezzi uno sotto l'altro, con gli assi allineati e un tratto di flusso fra l'uno e l'altro. */
  function colonna(pezzi: readonly Pezzo[]): Pezzo {
    if (pezzi.length === 0) return { ...vuoto, altezza: tema.passoVerticale, connettori: [flusso(punto(0, 0), punto(0, tema.passoVerticale))] };
    const posti: Pezzo[] = [];
    const tratti: Connettore[] = [];
    let y = 0;
    pezzi.forEach((p, indice) => {
      if (indice > 0) {
        tratti.push(flusso(punto(0, y), punto(0, y + tema.passoVerticale)));
        y += tema.passoVerticale;
      }
      posti.push(sposta(p, 0, y));
      y += p.altezza;
    });
    const sinistra = Math.max(...pezzi.map((p) => p.sinistra));
    const destra = Math.max(...pezzi.map((p) => p.destra));
    return unisci(sinistra, destra, y, posti, { connettori: tratti });
  }

  function etichette(id: string, condizione: { larghezza: number; altezza: number }, yCima: number) {
    const yMedio = yCima + condizione.altezza / 2;
    const y = yMedio - hTesto - tema.scostamentoEtichetta / 2;
    const wVero = misura(testi.vero);
    const wFalso = misura(testi.falso);
    const xVero = condizione.larghezza / 2 + tema.scostamentoEtichetta;
    const xFalso = -condizione.larghezza / 2 - tema.scostamentoEtichetta - wFalso;
    return {
      yMedio,
      destraVero: xVero + wVero,
      sinistraFalso: -xFalso,
      etichette: [
        { blocco: id, valore: "vero" as const, testo: testi.vero, riquadro: rettangolo(xVero, y, wVero, hTesto) },
        { blocco: id, valore: "falso" as const, testo: testi.falso, riquadro: rettangolo(xFalso, y, wFalso, hTesto) },
      ],
    };
  }

  function se(b: Extract<Blocco, { kind: "if" }>): Pezzo {
    const c = forma(b.id, "condizione", partiDelBlocco(b, testi));
    const et = etichette(b.id, c, 0);
    const vero = sequenza(b.then, b.id, "then");
    const falso = sequenza(b.else, b.id, "else");
    const xVero = Math.max(c.larghezza / 2 + tema.uscitaRombo, vero.sinistra + tema.distanzaRami / 2);
    const xFalso = -Math.max(c.larghezza / 2 + tema.uscitaRombo, falso.destra + tema.distanzaRami / 2);
    const y0 = c.altezza + tema.passoVerticale;
    const yUnione = y0 + Math.max(vero.altezza, falso.altezza) + tema.passoVerticale;
    const ym = et.yMedio;
    return unisci(
      Math.max(c.larghezza / 2, et.sinistraFalso, -xFalso + falso.sinistra),
      Math.max(c.larghezza / 2, et.destraVero, xVero + vero.destra),
      yUnione + tema.discesa,
      [sposta(vero, xVero, y0), sposta(falso, xFalso, y0)],
      {
        elementi: [c.elemento],
        etichette: et.etichette,
        connettori: [
          flusso(punto(c.larghezza / 2, ym), punto(xVero, ym), punto(xVero, y0)),
          flusso(punto(-c.larghezza / 2, ym), punto(xFalso, ym), punto(xFalso, y0)),
          flusso(punto(xVero, y0 + vero.altezza), punto(xVero, yUnione), punto(0, yUnione)),
          flusso(punto(xFalso, y0 + falso.altezza), punto(xFalso, yUnione), punto(0, yUnione)),
          flusso(punto(0, yUnione), punto(0, yUnione + tema.discesa)),
        ],
        ricongiungimenti: [{ centro: punto(0, yUnione), raggio: tema.raggioRicongiungimento }],
      },
    );
  }

  function mentre(b: Extract<Blocco, { kind: "while" }>): Pezzo {
    return cicloInTesta(b.id, partiDelBlocco(b, testi), sequenza(b.body, b.id, "body"));
  }

  /** Un ciclo con la condizione in testa: il rombo, il corpo a destra (Vero), l'uscita Falso a sinistra, e il giro che
   * torna al punto di unione sopra il rombo. Il corpo è già costruito coi suoi punti: per un `mentre` la sua sequenza,
   * per un `per` o un `per ogni` aperti anche i blocchi che il riquadro aggiunge; `fase` segna il rombo di questi. */
  function cicloInTesta(id: string, condizione: readonly ParteDelTesto[], corpo: Pezzo, fase?: FaseDelCiclo): Pezzo {
    const passo = tema.passoVerticale;
    // Il punto di unione sta in alto: la linea che arriva dal blocco precedente e quella che scende al
    // rombo hanno entrambe un tratto lungo oltre la punta.
    const yRitorno = passo / 4;
    const yCondizione = passo / 2 + tema.discesa;
    const rombo = forma(id, "condizione", condizione);
    const c = { ...rombo, elemento: { ...rombo.elemento, ...(fase === undefined ? {} : { fase }), ciclo: true as const } };
    const et = etichette(id, c, yCondizione);
    const ym = et.yMedio;
    const xCorpo = Math.max(c.larghezza / 2 + tema.uscitaRombo, corpo.sinistra + tema.distanzaRami / 2);
    const y0 = yCondizione + c.altezza + passo;
    const ySotto = y0 + corpo.altezza + passo;
    const xRitorno = Math.max(xCorpo + corpo.destra, et.destraVero) + tema.distanzaRami / 2;
    const xFalso = -(c.larghezza / 2 + tema.uscitaRombo);
    const yUscita = ySotto + passo;
    return unisci(Math.max(c.larghezza / 2, et.sinistraFalso, -xFalso), xRitorno, yUscita + tema.discesa, [sposta(corpo, xCorpo, y0)], {
      elementi: [sposta({ ...vuoto, elementi: [c.elemento] }, 0, yCondizione).elementi[0]!],
      etichette: et.etichette,
      connettori: [
        flusso(punto(0, 0), punto(0, yRitorno)),
        flusso(punto(0, yRitorno), punto(0, yCondizione)),
        flusso(punto(c.larghezza / 2, ym), punto(xCorpo, ym), punto(xCorpo, y0)),
        flusso(punto(xCorpo, y0 + corpo.altezza), punto(xCorpo, ySotto), punto(xRitorno, ySotto), punto(xRitorno, yRitorno), punto(0, yRitorno)),
        flusso(punto(-c.larghezza / 2, ym), punto(xFalso, ym), punto(xFalso, yUscita), punto(0, yUscita), punto(0, yUscita + tema.discesa)),
      ],
      ricongiungimenti: [{ centro: punto(0, yRitorno), raggio: tema.raggioRicongiungimento }],
    });
  }

  function ripeti(b: Extract<Blocco, { kind: "repeat" }>): Pezzo {
    const passo = tema.passoVerticale;
    const yRitorno = passo / 4;
    const yCorpo = passo / 2 + tema.discesa;
    const corpo = sequenza(b.body, b.id, "body");
    const yCondizione = yCorpo + corpo.altezza + passo;
    const rombo = forma(b.id, "condizione", partiDelBlocco(b, testi));
    const c = { ...rombo, elemento: { ...rombo.elemento, ciclo: true as const } };
    const et = etichette(b.id, c, yCondizione);
    const ym = et.yMedio;
    const xRitorno = Math.max(corpo.destra, et.destraVero, c.larghezza / 2 + tema.uscitaRombo) + tema.distanzaRami / 2;
    const xFalso = -(c.larghezza / 2 + tema.uscitaRombo);
    const yUscita = yCondizione + c.altezza + passo;
    return unisci(Math.max(corpo.sinistra, c.larghezza / 2, et.sinistraFalso, -xFalso), xRitorno, yUscita + tema.discesa, [sposta(corpo, 0, yCorpo)], {
      elementi: [sposta({ ...vuoto, elementi: [c.elemento] }, 0, yCondizione).elementi[0]!],
      etichette: et.etichette,
      connettori: [
        flusso(punto(0, 0), punto(0, yRitorno)),
        flusso(punto(0, yRitorno), punto(0, yCorpo)),
        flusso(punto(0, yCorpo + corpo.altezza), punto(0, yCondizione)),
        flusso(punto(c.larghezza / 2, ym), punto(xRitorno, ym), punto(xRitorno, yRitorno), punto(0, yRitorno)),
        flusso(punto(-c.larghezza / 2, ym), punto(xFalso, ym), punto(xFalso, yUscita), punto(0, yUscita), punto(0, yUscita + tema.discesa)),
      ],
      ricongiungimenti: [{ centro: punto(0, yRitorno), raggio: tema.raggioRicongiungimento }],
    });
  }

  function commento(b: Extract<Blocco, { kind: "comment" }>): Pezzo {
    const f = forma(b.id, "commento", partiDelBlocco(b, testi));
    const nota = sposta({ ...vuoto, elementi: [f.elemento] }, tema.distanzaNota + f.larghezza / 2, 0);
    return unisci(0, tema.distanzaNota + f.larghezza, f.altezza, [nota], {
      connettori: [
        flusso(punto(0, 0), punto(0, f.altezza)),
        { genere: "nota", punti: [punto(0, f.altezza / 2), punto(tema.distanzaNota, f.altezza / 2)] },
      ],
    });
  }

  /** Un blocco che il riquadro di un ciclo aggiunge: un'assegnazione con l'`id` del ciclo e la sua fase. */
  function aggiunto(id: string, fase: FaseDelCiclo, testo: readonly ParteDelTesto[]): Pezzo {
    const p = semplice(id, "assegnazione", testo);
    return { ...p, elementi: p.elementi.map((e) => ({ ...e, fase })) };
  }

  /** Il corpo di un ciclo aperto: i blocchi che il riquadro aggiunge in testa (`prima`) e in coda (`dopo`) attorno ai
   * blocchi veri, in colonna; i punti solo prima, fra e dopo i blocchi veri, contati da loro. */
  function corpoNelRiquadro(prima: readonly Pezzo[], blocchi: readonly Blocco[], dopo: readonly Pezzo[], contenitore: string): Pezzo {
    const veri = pezziDi(blocchi);
    const pezzi = [...prima, ...veri.pezzi, ...dopo];
    const c = colonna(pezzi);
    const traIVeri = punti(pezzi, contenitore, "body", 0).slice(prima.length, prima.length + veri.pezzi.length + 1);
    return { ...c, punti: [...c.punti, ...traIVeri.map((q, k) => ({ ...q, posto: { ...q.posto, indice: veri.indici[k]! } }))] };
  }

  /** Quanti `per ogni` contengono il blocco che si sta impaginando: la posizione dell'elemento di uno dentro un altro ha
   * il numero del suo livello, come nel codice generato. */
  let perOgniAperti = 0;
  /** I vettori che le regole vedono: riconoscono la copia col nome. */
  const vettori = nomiDeiVettori([...funzione.data, ...costantiComuni]);

  /** Un ciclo `per` o `per ogni` nella forma delle opzioni, nel suo riquadro. */
  function cicloPer(b: Extract<Blocco, { kind: "for" | "for_each" }>): Pezzo {
    const come = b.kind === "for" ? opzioni.per : opzioni.perOgni;
    if (come === "chiuso") return riquadro(b.id, partiDelBlocco(b, testi), chiuso(b), false, tema.margineRiquadroChiuso);
    if (b.kind === "for_each") perOgniAperti++;
    // Il testo di ogni blocco aggiunto dalla stessa funzione della tabella di traccia e del watch.
    const testo = (fase: FaseDelCiclo) => partiDellaFase(b, fase, opzioni, testi, perOgniAperti, [...funzione.data, ...costantiComuni])!;
    let interno: Pezzo;
    if (b.kind === "for") {
      const corpo = corpoNelRiquadro([], b.body, [aggiunto(b.id, "passo", testo("passo"))], b.id);
      interno = colonna([aggiunto(b.id, "inizio", testo("inizio")), cicloInTesta(b.id, testo("condizione"), corpo, "condizione")]);
    } else if (come === "parole") {
      const corpo = corpoNelRiquadro([aggiunto(b.id, "elemento", testo("elemento"))], b.body, [], b.id);
      interno = cicloInTesta(b.id, testo("condizione"), corpo, "condizione");
    } else {
      const corpo = corpoNelRiquadro([aggiunto(b.id, "elemento", testo("elemento"))], b.body, [aggiunto(b.id, "passo", testo("passo"))], b.id);
      interno = colonna([aggiunto(b.id, "inizio", testo("inizio")), cicloInTesta(b.id, testo("condizione"), corpo, "condizione")]);
    }
    if (b.kind === "for_each") perOgniAperti--;
    return riquadro(b.id, partiDelBlocco(b, testi), interno);
  }

  /** Un ciclo chiuso: il corpo sull'asse, e dal suo fondo la linea che torna a destra fino al punto di unione in cima;
   * l'uscita continua in basso. */
  function chiuso(b: Extract<Blocco, { kind: "for" | "for_each" }>): Pezzo {
    const passo = tema.passoVerticale;
    if (b.kind === "for_each") perOgniAperti++;
    const corpo = sequenza(b.body, b.id, "body");
    if (b.kind === "for_each") perOgniAperti--;
    const yRitorno = passo / 4;
    const yCorpo = passo / 2 + tema.discesa;
    const ySotto = yCorpo + corpo.altezza + passo;
    // Il giro passa fuori dal corpo, e mai più vicino all'asse di quello del `ripeti` (la linea si vede oltre la punta).
    const xRitorno = Math.max(corpo.destra, tema.uscitaRombo) + tema.distanzaRami / 2;
    return unisci(corpo.sinistra, xRitorno, ySotto + passo, [sposta(corpo, 0, yCorpo)], {
      connettori: [
        flusso(punto(0, 0), punto(0, yRitorno)),
        flusso(punto(0, yRitorno), punto(0, yCorpo)),
        flusso(punto(0, yCorpo + corpo.altezza), punto(0, ySotto), punto(xRitorno, ySotto), punto(xRitorno, yRitorno), punto(0, yRitorno)),
        flusso(punto(0, ySotto), punto(0, ySotto + passo)),
      ],
      ricongiungimenti: [{ centro: punto(0, yRitorno), raggio: tema.raggioRicongiungimento }],
    });
  }

  /** La copia di un vettore col suo nome nel riquadro con la sua scritta: compatta, l'assegnazione (la scritta sul bordo
   * non è un blocco); espansa, il `mentre` equivalente con la posizione (la partenza, il rombo, l'elemento copiato,
   * l'aumento), blocchi aggiunti con l'`id` dell'assegnazione e la loro fase, sotto un'intestazione che è il blocco.
   * Nessun punto di inserimento dentro: l'assegnazione non ha un corpo. */
  function copiaNelRiquadro(b: Extract<Blocco, { kind: "assignment" }>): Pezzo {
    if (opzioni.copia === "compatta") {
      // Sotto l'assegnazione la linea che esce, come l'uscita di un ciclo: il fondo del riquadro la attraversa.
      const a = semplice(b.id, "assegnazione", partiDelBlocco(b, testi));
      const conLUscita = { ...a, altezza: a.altezza + tema.discesa, connettori: [flusso(punto(0, a.altezza), punto(0, a.altezza + tema.discesa))] };
      return riquadro(b.id, [{ testo: testi.cicli.copia, espressione: false }], conLUscita, true);
    }
    const testo = (fase: FaseDelCiclo) => partiDellaFase(b, fase, opzioni, testi, perOgniAperti + 1, [...funzione.data, ...costantiComuni])!;
    const corpo = colonna([aggiunto(b.id, "elemento", testo("elemento")), aggiunto(b.id, "passo", testo("passo"))]);
    const interno = colonna([aggiunto(b.id, "inizio", testo("inizio")), cicloInTesta(b.id, testo("condizione"), corpo, "condizione")]);
    return riquadro(b.id, partiDellIntestazioneDellaCopia(b, testi), interno);
  }

  /** La copia di un record col suo nome nel riquadro con la scritta «copia campo per campo»: compatta come quella del
   * vettore; espansa, un'assegnazione per campo una sotto l'altra (blocchi aggiunti con l'`id` dell'assegnazione, la fase
   * «elemento» e il campo), sotto l'intestazione che è il blocco. Nessun punto di inserimento dentro. */
  function copiaDelRecordNelRiquadro(b: Extract<Blocco, { kind: "assignment" }>, campi: readonly Campo[]): Pezzo {
    const scritta = testi.cicli.copiaCampi;
    if (opzioni.copia === "compatta") {
      const a = semplice(b.id, "assegnazione", partiDelBlocco(b, testi));
      const conLUscita = { ...a, altezza: a.altezza + tema.discesa, connettori: [flusso(punto(0, a.altezza), punto(0, a.altezza + tema.discesa))] };
      return riquadro(b.id, [{ testo: scritta, espressione: false }], conLUscita, true);
    }
    const perCampo = campi.map((c, k) => {
      const p = aggiunto(b.id, "elemento", partiDelCampoDellaCopia(b, c.name, testi));
      return { ...p, elementi: p.elementi.map((e) => ({ ...e, campo: k })) };
    });
    const corpo = colonna(perCampo);
    // Sotto l'ultimo campo la linea che esce, come nella compatta.
    const interno = { ...corpo, altezza: corpo.altezza + tema.discesa, connettori: [...corpo.connettori, flusso(punto(0, corpo.altezza), punto(0, corpo.altezza + tema.discesa))] };
    return riquadro(b.id, partiDellIntestazioneDellaCopia(b, testi, scritta), interno);
  }

  /** Il riquadro tratteggiato attorno al contenuto di un ciclo, con l'intestazione sul bordo in alto: a sinistra della
   * linea che entra (se il contenuto è stretto, il riquadro si allarga a sinistra), su un fondo che interrompe la
   * linea. La linea che entra scende dall'alto fino al contenuto. Con `didascalia` l'intestazione non è il blocco (la
   * copia compatta): sta nel riquadro, non fra gli elementi. */
  function riquadro(id: string, parti: readonly ParteDelTesto[], interno: Pezzo, didascalia = false, m = tema.margineRiquadro): Pezzo {
    const f = forma(id, "intestazione", parti);
    const yBordo = hTesto / 2 + tema.scostamentoEtichetta;
    const yInterno = yBordo + hTesto / 2 + m;
    // L'intestazione finisce a sinistra della linea che entra, con la sua luce in mezzo.
    const x0 = -Math.max(interno.sinistra + m, tema.rientroIntestazione + f.larghezza + tema.luceIntestazione);
    const x1 = interno.destra + m;
    const y1 = yInterno + interno.altezza - tema.discesa / 2;
    const intestazione = sposta({ ...vuoto, elementi: [f.elemento] }, x0 + tema.rientroIntestazione + f.larghezza / 2, yBordo - f.altezza / 2).elementi[0]!;
    const bordo = rettangolo(x0, yBordo, x1 - x0, y1 - yBordo);
    return unisci(-x0, x1, yInterno + interno.altezza, [sposta(interno, 0, yInterno)], {
      elementi: didascalia ? [] : [intestazione],
      connettori: [flusso(punto(0, 0), punto(0, yInterno))],
      riquadri: [didascalia ? { blocco: id, bordo, didascalia: intestazione } : { blocco: id, bordo }],
    });
  }

  function blocco(b: Blocco): Pezzo {
    switch (b.kind) {
      case "assignment": {
        if (eUnaCopia(b, vettori)) return copiaNelRiquadro(b);
        const campi = campiDellaCopia(b, [...funzione.data, ...costantiComuni], records);
        return campi !== undefined ? copiaDelRecordNelRiquadro(b, campi) : semplice(b.id, "assegnazione", partiDelBlocco(b, testi));
      }
      case "read":
        return semplice(b.id, "lettura", partiDelBlocco(b, testi));
      case "write":
        return semplice(b.id, "scrittura", partiDelBlocco(b, testi));
      case "if":
        return se(b);
      case "while":
        return mentre(b);
      case "repeat":
        return ripeti(b);
      case "comment":
        return commento(b);
      case "for":
      case "for_each":
        return cicloPer(b);
      case "call":
        return semplice(b.id, "chiamata", partiDellaChiamata(b, funzioneChiamata(funzioni, b.callee), testi));
    }
  }

  /** I punti di una sequenza di pezzi già messi in colonna, col primo pezzo che comincia in `y0`: uno sopra
   * ogni pezzo e uno sotto l'ultimo, al centro della parte libera di un passo di linea, cioè del passo senza
   * la punta della freccia (la stessa luce verso il tocco di sopra e verso la punta). Chi contiene la
   * sequenza ci arriva e ne esce con un tratto verticale lungo almeno un passo, quindi i due estremi stanno
   * sulla sua linea. */
  function punti(pezzi: readonly Pezzo[], contenitore: string, ramo: Ramo, y0: number, indici?: readonly number[]): PuntoDiInserimento[] {
    let y = y0 - (tema.passoVerticale + tema.punta) / 2;
    return Array.from({ length: pezzi.length + 1 }, (_, k) => {
      const q = { x: 0, y, posto: { contenitore, ramo, indice: indici?.[k] ?? k } };
      if (k < pezzi.length) y += pezzi[k]!.altezza + tema.passoVerticale;
      return q;
    });
  }

  /** I pezzi dei blocchi di una sequenza: uno per blocco, e uno solo per una Scrittura e la Lettura che la mostra come
   * domanda. `indici`: per ogni punto (prima di ogni pezzo e dopo l'ultimo) l'indice nella sequenza VERA, quello che
   * consumano le modifiche: fra la Scrittura e la sua Lettura non c'è un punto. */
  function pezziDi(blocchi: readonly Blocco[]): { pezzi: Pezzo[]; indici: number[] } {
    const pezzi: Pezzo[] = [];
    const indici: number[] = [];
    for (let i = 0; i < blocchi.length; i++) {
      const b = blocchi[i]!;
      const dopo = blocchi[i + 1];
      const coppia = dopo === undefined ? undefined : domande.get(dopo.id);
      indici.push(i);
      if (b.kind === "write" && dopo?.kind === "read" && coppia?.scrittura === b.id) {
        pezzi.push(letturaConDomanda(dopo, coppia));
        i++;
      } else pezzi.push(blocco(b));
    }
    indici.push(blocchi.length);
    return { pezzi, indici };
  }

  /** Una sequenza di blocchi coi suoi punti; vuota, è un passo di linea col punto a metà. */
  function sequenza(blocchi: readonly Blocco[], contenitore: string, ramo: Ramo): Pezzo {
    const { pezzi, indici } = pezziDi(blocchi);
    const c = colonna(pezzi);
    return { ...c, punti: [...c.punti, ...punti(pezzi, contenitore, ramo, pezzi.length === 0 ? tema.passoVerticale : 0, indici)] };
  }

  /** La Lettura con la sua domanda: un parallelogramma su due righe, sopra la domanda e sotto la Lettura, con l'`id`
   * della Lettura e quello della Scrittura che la domanda mostra. */
  function letturaConDomanda(b: Extract<Blocco, { kind: "read" }>, coppia: Coppia): Pezzo {
    const righe = [partiDellaDomanda(coppia.domanda, testi), partiDelBlocco(b, testi)];
    const p = semplice(b.id, "lettura", righe.flat(), righe);
    return { ...p, elementi: p.elementi.map((e) => ({ ...e, scrittura: coppia.scrittura })) };
  }

  /** Il blocco del valore iniziale di un dato: un'assegnazione col testo del dato, identificata dal suo nome. */
  function valore(d: Dato, testo: string): Pezzo {
    const p = semplice("", "assegnazione", testo);
    return { ...p, elementi: p.elementi.map((e) => ({ ...e, dato: d.name })) };
  }

  const inizio = semplice(funzione.id, "inizio", partiDellIntestazione(funzione, testi));
  const conValore = [...costantiComuni, ...funzione.data].flatMap((d) => {
    const testo = testoDelValoreIniziale(d, testi, opzioni.valoreRipetuto);
    return testo === undefined ? [] : [valore(d, testo)];
  });
  const testa = opzioni.valoriIniziali === "nascosti" ? [inizio] : [inizio, ...conValore];
  const { pezzi: corpo, indici } = pezziDi(funzione.body);
  const colonnaPrincipale = colonna([...testa, ...corpo, semplice(funzione.end.id, "fine", partiDellaFine(funzione, testi))]);
  // Il primo punto del programma sotto l'ultimo pezzo della testa: «Inizio» o l'ultimo valore iniziale.
  const sottoLaTesta = testa.reduce((y, p) => y + p.altezza + tema.passoVerticale, 0);
  const tutto = { ...colonnaPrincipale, punti: [...colonnaPrincipale.punti, ...punti(corpo, funzione.id, "body", sottoLaTesta, indici)] };
  const m = tema.margineEsterno;
  const disegno = sposta(tutto, m + tutto.sinistra, m);
  const connettori = linee(disegno.connettori, disegno.ricongiungimenti);
  return {
    larghezza: tutto.sinistra + tutto.destra + 2 * m,
    altezza: tutto.altezza + m + tema.margineInBasso,
    elementi: disegno.elementi,
    connettori,
    etichette: disegno.etichette,
    ricongiungimenti: disegno.ricongiungimenti,
    punti: disegno.punti.map((q) => centrato(q, connettori, tema.punta, disegno.riquadri)),
    riquadri: disegno.riquadri,
  };
}

/** Il punto al centro della parte libera del tratto verticale che lo contiene: dal tocco di sopra (un
 * blocco, una piega, il bordo di un punto di unione) a quello di sotto, senza la punta della freccia se la
 * linea finisce lì; il tratto si spezza dove ne parte la nota di un commento e dove attraversa la linea del riquadro
 * di un ciclo (anche quelli sono tocchi: il punto prima o dopo un ciclo sta fuori dal riquadro). Dove la linea è più
 * lunga di un passo, il punto non resta a ridosso di un capo. */
function centrato(q: PuntoDiInserimento, connettori: readonly Connettore[], punta: number, riquadri: readonly RiquadroDelCiclo[]): PuntoDiInserimento {
  const vicino = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  for (const c of connettori) {
    if (c.genere !== "flusso") continue;
    for (let i = 1; i < c.punti.length; i++) {
      const [a, b] = [c.punti[i - 1]!, c.punti[i]!];
      if (!vicino(a.x, q.x) || !vicino(b.x, q.x) || b.y <= a.y || q.y < a.y || q.y > b.y) continue;
      const fine = i === c.punti.length - 1 ? b.y - punta : b.y;
      const bordi = riquadri.filter((r) => r.bordo.x < q.x && q.x < r.bordo.x + r.bordo.larghezza).flatMap((r) => [r.bordo.y, r.bordo.y + r.bordo.altezza]);
      const note = connettori.filter((n) => n.genere === "nota" && vicino(n.punti[0]!.x, q.x)).map((n) => n.punti[0]!.y);
      const tagli = [...note, ...bordi].filter((y) => y > a.y && y < fine);
      const sopra = Math.max(a.y, ...tagli.filter((y) => y < q.y));
      const sotto = Math.min(fine, ...tagli.filter((y) => y > q.y));
      return { ...q, y: (sopra + sotto) / 2 };
    }
  }
  return q;
}

/** Il punto a distanza `r` da `fine`, verso `da` (o `da`, se il tratto è più corto). */
function arretra(da: Punto, fine: Punto, r: number): Punto {
  const lunghezza = Math.hypot(fine.x - da.x, fine.y - da.y);
  return lunghezza <= r ? da : punto(fine.x + ((da.x - fine.x) * r) / lunghezza, fine.y + ((da.y - fine.y) * r) / lunghezza);
}

/** La chiave di un punto, per trovare in un indice i punti che coincidono. */
const chiave = (p: Punto) => `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;

/** I tratti di flusso diventano linee intere: due tratti si uniscono dove uno finisce e l'altro comincia,
 * se in quel punto non finisce né comincia nient'altro e non c'è un punto di unione. Poi ogni linea che
 * arriva a un punto di unione, o ne parte, si ferma sul bordo del cerchio. In tempo lineare: chi si unisce a
 * chi dipende solo dai tratti di partenza (unire due tratti non cambia quanti ne arrivano o ne partono
 * negli altri punti), quindi si decide una volta, poi si segue ogni catena dal suo primo tratto. */
function linee(connettori: readonly Connettore[], unioni: readonly Ricongiungimento[]): Connettore[] {
  const centri = new Map(unioni.map((u) => [chiave(u.centro), u]));
  const unione = (p: Punto) => centri.get(chiave(p));
  const tratti = connettori.map((c) => ({ genere: c.genere, punti: [...c.punti] }));
  const flussi = tratti.filter((t) => t.genere === "flusso");
  const partenze = new Map<string, (typeof tratti)[number][]>();
  const arrivi = new Map<string, number>();
  for (const t of flussi) {
    const [inizio, fine] = [chiave(t.punti[0]!), chiave(t.punti[t.punti.length - 1]!)];
    partenze.set(inizio, [...(partenze.get(inizio) ?? []), t]);
    arrivi.set(fine, (arrivi.get(fine) ?? 0) + 1);
  }
  const seguente = new Map<(typeof tratti)[number], (typeof tratti)[number]>();
  for (const a of flussi) {
    const fine = a.punti[a.punti.length - 1]!;
    const dopo = partenze.get(chiave(fine));
    if (unione(fine) || dopo?.length !== 1 || dopo[0] === a || arrivi.get(chiave(fine)) !== 1) continue;
    seguente.set(a, dopo[0]!);
  }
  const assorbiti = new Set(seguente.values());
  const intere = tratti.filter((t) => !assorbiti.has(t));
  for (const a of intere) {
    for (let b = seguente.get(a); b !== undefined; b = seguente.get(b)) a.punti.push(...b.punti.slice(1));
  }
  return intere.map((t) => {
    if (t.genere !== "flusso") return t;
    // Un punto in mezzo a due tratti sulla stessa retta non è una piega: si toglie.
    const p = t.punti.filter((q, i, tutti) => {
      const [a, b] = [tutti[i - 1], tutti[i + 1]];
      return a === undefined || b === undefined || !((a.x === q.x && q.x === b.x) || (a.y === q.y && q.y === b.y));
    });
    const ultimo = p.length - 1;
    const arrivo = unione(p[ultimo]!);
    if (arrivo) p[ultimo] = arretra(p[ultimo - 1]!, p[ultimo]!, arrivo.raggio);
    const partenza = unione(p[0]!);
    if (partenza) p[0] = arretra(p[1]!, p[0]!, partenza.raggio);
    return { genere: t.genere, punti: p };
  });
}
