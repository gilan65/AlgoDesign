// I segni dell'esecuzione accanto a un blocco del disegno: il pallino del punto di interruzione, la punta
// arancione del blocco corrente e il «↩» della ripresa. Le posizioni si ricavano dal riquadro della forma; una prova
// (`segni.test.ts`) controlla su ogni albero delle prove del disegno che non tocchino etichette, forme, linee, unioni
// né punti di inserimento.
import type { Elemento } from "../../core/disegno/impaginazione";

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

/** Il segno «↩» della ripresa: in basso a destra, fuori dal blocco. `base` è il
 * punto dove il testo comincia, sulla linea di base; `riquadro` lo spazio che il glifo può occupare. */
export function ripresa(e: Elemento): { readonly base: { readonly x: number; readonly y: number }; readonly riquadro: { readonly x: number; readonly y: number; readonly larghezza: number; readonly altezza: number } } {
  const { x, y, larghezza, altezza } = e.riquadro;
  const base = { x: x + larghezza + 4, y: y + altezza + 4 };
  return { base, riquadro: { x: base.x, y: base.y - (CORPO_DELLA_RIPRESA * 4) / 5, larghezza: CORPO_DELLA_RIPRESA, altezza: CORPO_DELLA_RIPRESA } };
}
