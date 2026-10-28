// I segni accanto a un blocco del disegno: il pallino del punto di interruzione, la punta arancione del blocco corrente,
// il «↩» della ripresa e il bollino di un errore o di un avviso. Le posizioni si ricavano dal riquadro della forma; una
// prova (`ui/disegno/segni.test.ts`) controlla su ogni albero delle prove del disegno che non tocchino etichette, forme,
// linee, unioni né punti di inserimento.
//
// Qui anche le regole che dicono QUALI elementi hanno i segni dell'esecuzione (`segniDelDisegno`): le leggono la tela
// della finestra e il disegno in SVG (`svg.ts`), così le due non possono dire due cose diverse.
import type { FaseDelCiclo } from "../interprete/interprete";
import type { Elemento } from "./impaginazione";

/** L'esecuzione in pausa, come la dà chi esegue: il blocco (o la fine, o «Inizio») prima del quale è in pausa, la parte
 * di un ciclo `per` o `per ogni`, la ripresa dell'azione dopo il ritorno da una funzione chiamata nella sua espressione,
 * il dato prima del cui valore iniziale è in pausa, i blocchi coi punti di interruzione. */
export interface SegniDellEsecuzione {
  readonly corrente?: string | null;
  readonly faseCorrente?: FaseDelCiclo | null;
  /** Nella copia di un record col suo nome, la posizione del campo copiato. */
  readonly campoCorrente?: number | null;
  readonly ripresa?: boolean;
  readonly correnteValore?: string | null;
  readonly interruzioni?: ReadonlySet<string>;
}

/** I segni di un elemento: blocco corrente, punto di interruzione, e di una Lettura con la domanda corrente la riga del
 * passo (la domanda 0, la Lettura 1). */
export interface SegniDellElemento {
  readonly corrente: boolean;
  readonly punto: boolean;
  readonly riga: number | undefined;
}

/** Le regole dei segni per gli elementi di un disegno; senza esecuzione, nessun segno. Il blocco corrente: per `id`, o il
 * valore iniziale per il nome del dato (il suo `id` è vuoto, come quello di ogni altro valore iniziale); di un ciclo la
 * parte della fase se il disegno la ha (il ciclo aperto), l'intestazione se no; della copia di un record col suo nome
 * l'assegnazione del campo se il disegno la ha (la copia espansa), l'assegnazione se no. Una Lettura con la domanda è corrente anche
 * sulla sua Scrittura (la domanda), e ha il punto se ce l'ha una delle due. Il punto c'è solo sui blocchi dell'albero
 * (non sui valori iniziali, non sulle parti che il riquadro aggiunge). */
export function segniDelDisegno(elementi: readonly Elemento[], esecuzione: SegniDellEsecuzione | undefined): (e: Elemento) => SegniDellElemento {
  const corrente = esecuzione?.corrente;
  const correnteValore = esecuzione?.correnteValore;
  const fase = esecuzione?.faseCorrente;
  const interruzioni = esecuzione?.interruzioni;
  const faseDisegnata = fase != null && elementi.some((e) => e.dato === undefined && e.id === corrente && e.fase === fase) ? fase : undefined;
  // Il campo della copia di un record: la sua assegnazione nella copia espansa (fase «elemento»), l'assegnazione intera
  // nella compatta.
  const campo = esecuzione?.campoCorrente;
  const campoDisegnato = campo != null && elementi.some((e) => e.dato === undefined && e.id === corrente && e.campo === campo) ? campo : undefined;
  const faseDelCorrente = campoDisegnato !== undefined ? "elemento" : faseDisegnata;
  const eCorrente = (e: Elemento) =>
    e.dato !== undefined
      ? correnteValore != null && e.dato === correnteValore
      : e.fase === faseDelCorrente && e.campo === campoDisegnato && (e.id === corrente || (e.scrittura !== undefined && e.scrittura === corrente));
  const conPunto = (e: Elemento) =>
    esecuzione !== undefined && e.dato === undefined && e.fase === undefined && (interruzioni?.has(e.id) === true || (e.scrittura !== undefined && interruzioni?.has(e.scrittura) === true));
  return (e) => {
    const c = eCorrente(e);
    return { corrente: c, punto: conPunto(e), riga: e.scrittura === undefined || !c ? undefined : e.scrittura === corrente ? 0 : 1 };
  };
}

export const RAGGIO_DEL_PALLINO = 6;
/** Quanto il pallino del rombo resta staccato dal lato e dalla linea che entra. */
const STACCO = 10;

/** Il centro del pallino. Per un rombo: in alto a destra della punta della linea che entra, fra la linea e il lato,
 * staccato da tutti e due (a sinistra del rombo c'è l'etichetta «Falso», e il pallino ci finiva sopra). Per il
 * parallelogramma: a sinistra in alto, già lontano dal lato inclinato; per le altre forme un po' più in là,
 * perché sia staccato quanto dal parallelogramma. */
export function pallino(e: Elemento): { readonly x: number; readonly y: number } {
  const { x, y, larghezza, altezza } = e.riquadro;
  if (e.forma === "lettura" || e.forma === "scrittura") return { x: x - 9, y: y + 9 };
  if (e.forma !== "condizione") return { x: x - 13, y: y + 9 };
  // La bisettrice fra la linea che sale dal vertice e il lato che scende a destra: lì il pallino sta alla
  // stessa distanza dalle due.
  const lato = Math.hypot(larghezza / 2, altezza / 2);
  const bx = larghezza / 2 / lato;
  const by = altezza / 2 / lato - 1;
  const b = Math.hypot(bx, by);
  const d = (RAGGIO_DEL_PALLINO + STACCO) / (bx / b);
  return { x: x + larghezza / 2 + (d * bx) / b, y: y + (d * by) / b };
}

/** I tre vertici della punta del blocco corrente: al posto della punta della linea che entra (al centro, in alto),
 * più grande. */
export function punta(e: Elemento): readonly { readonly x: number; readonly y: number }[] {
  const { x, y, larghezza } = e.riquadro;
  const c = x + larghezza / 2;
  return [
    { x: c - 8, y: y - 14 },
    { x: c + 8, y: y - 14 },
    { x: c, y },
  ];
}

/** Il corpo del segno «↩» della ripresa (`.segnoDellaRipresa`, 1,25 rem): il riquadro che il glifo può occupare, largo
 * quanto il corpo, e la linea di base 4/5 del corpo sotto il suo lato alto. */
export const CORPO_DELLA_RIPRESA = 20;

/** Il segno «↩» della ripresa: sotto il blocco, a sinistra della linea che esce, a 4 px da tutti e due (a destra del
 * blocco ci sono i bordi dei riquadri e del disegno; sotto la fine di una funzione, in fondo, il margine in basso del
 * disegno è alto quanto basta). `base` è il punto dove il testo comincia, sulla linea di base; `riquadro` lo spazio che
 * il glifo può occupare. */
export function ripresa(e: Elemento): { readonly base: { readonly x: number; readonly y: number }; readonly riquadro: { readonly x: number; readonly y: number; readonly larghezza: number; readonly altezza: number } } {
  const { x, y, larghezza, altezza } = e.riquadro;
  const base = { x: x + larghezza / 2 - 4 - CORPO_DELLA_RIPRESA, y: y + altezza + 4 + (CORPO_DELLA_RIPRESA * 4) / 5 };
  return { base, riquadro: { x: base.x, y: base.y - (CORPO_DELLA_RIPRESA * 4) / 5, larghezza: CORPO_DELLA_RIPRESA, altezza: CORPO_DELLA_RIPRESA } };
}

/** Il bollino di un blocco con un errore o un avviso. */
export const RAGGIO_DEL_BOLLINO = 10;

/** Il centro del bollino: nell'angolo in alto a destra della forma. Per l'intestazione del riquadro di un ciclo in quello
 * in basso a sinistra (a destra c'è la linea che entra, a sinistra in alto il pallino); per il rombo 3 px più in alto
 * (l'etichetta «Vero» comincia accanto al vertice di destra). */
export function bollino(e: Pick<Elemento, "forma" | "vertici">): { readonly x: number; readonly y: number } {
  const xs = e.vertici.map((v) => v.x);
  const ys = e.vertici.map((v) => v.y);
  if (e.forma === "intestazione") return { x: Math.min(...xs), y: Math.max(...ys) };
  return { x: Math.max(...xs), y: Math.min(...ys) - (e.forma === "condizione" ? 3 : 0) };
}
