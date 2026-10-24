// Lo spostamento di un blocco su un «+»: quale «+» sta sotto il puntatore, e su quali il blocco non va.
// Funzioni pure, senza DOM. I «+» sono i punti dell'impaginazione (`Disegno.punti`), nel sistema del
// disegno: il puntatore ci si porta togliendo l'angolo del disegno sullo schermo (che contiene lo
// scorrimento) e dividendo per la scala corrente. Nessuna posizione di un «+» si misura sullo schermo, e un
// cambio di scala o di disegno vale dal movimento dopo.
//
// Su quali «+» il blocco non va: quelli del suo sottoalbero (il nucleo rifiuta lo spostamento) e i due
// accanto a lui (lo spostamento non cambia nulla); per un tratto di più blocchi vicini anche quelli fra loro. La regola
// resta del nucleo (`spostaTratto`): qui si sa solo quali spegnere mentre si trascina, e la prova di unità li confronta
// con l'esito del nucleo.

import type { Disegno, Punto, PuntoDiInserimento, Rettangolo } from "../../core/disegno/impaginazione";
import { sottoblocchi } from "../../core/modifica/identificatori";
import { blocchiDelTratto, trova, type Posto, type Tratto } from "../../core/modifica/operazioni";
import type { Blocco, Funzione, Progetto } from "../../core/progetto/modello";

/** Il lato dell'area che risponde al puntatore intorno a un «+», al 100%. */
export const AREA_DEL_PUNTO = 24;
/** Il lato minimo di quell'area in pixel dello schermo: rimpicciolendo, l'area non scende sotto. */
export const AREA_MINIMA_SULLO_SCHERMO = 12;

/** Il lato dell'area di un «+» nel sistema del disegno, alla scala data. */
export const latoDellArea = (scala: number): number => Math.max(AREA_DEL_PUNTO, AREA_MINIMA_SULLO_SCHERMO / scala);

export interface Coordinate {
  readonly x: number;
  readonly y: number;
}

/** Il punto dello schermo nel sistema del disegno: `origine` è l'angolo del disegno sullo schermo. */
export const nelDisegno = (schermo: Coordinate, origine: Coordinate, scala: number): Coordinate => ({
  x: (schermo.x - origine.x) / scala,
  y: (schermo.y - origine.y) / scala,
});

/** Gli `id` del blocco e di tutto ciò che contiene; vuoto se il blocco non c'è. */
export function sottoalbero(p: Progetto, id: string): ReadonlySet<string> {
  const dentro = new Set<string>();
  const b = trova(p, id);
  const visita = (x: NonNullable<typeof b>): void => {
    dentro.add(x.id);
    sottoblocchi(x).forEach(visita);
  };
  if (b !== undefined) visita(b);
  return dentro;
}

/** Gli `id` dei blocchi del tratto e di tutto ciò che contengono. */
export const sottoalberoDelTratto = (p: Progetto, t: Tratto): ReadonlySet<string> => new Set(blocchiDelTratto(p, t).flatMap((b) => [...sottoalbero(p, b.id)]));

/** Il giudizio su un posto per i blocchi del tratto: vero se lì non vanno (dentro uno di loro, o accanto o fra loro). */
export function escluso(p: Progetto, t: Tratto): (posto: Posto) => boolean {
  const dentro = sottoalberoDelTratto(p, t);
  return (posto) => dentro.has(posto.contenitore) || (t.contenitore === posto.contenitore && t.ramo === posto.ramo && posto.indice >= t.da && posto.indice <= t.a + 1);
}

export interface Bersaglio {
  readonly punto: PuntoDiInserimento;
  /** Falso se il blocco lì non va: il «+» è spento, e rilasciato lì il nucleo dice perché. */
  readonly ammesso: boolean;
}

/**
 * Il «+» sotto il puntatore (nel sistema del disegno): fra quelli la cui area lo contiene, il più vicino
 * fra gli ammessi; se nessuno è ammesso, il più vicino. `null` se il puntatore non è sull'area di nessuno.
 */
export function bersaglio(punti: readonly PuntoDiInserimento[], puntatore: Coordinate, scala: number, esclusoIl: (posto: Posto) => boolean): Bersaglio | null {
  const meta = latoDellArea(scala) / 2;
  let migliore: Bersaglio | null = null;
  let distanza = Infinity;
  for (const punto of punti) {
    const dx = Math.abs(puntatore.x - punto.x);
    const dy = Math.abs(puntatore.y - punto.y);
    if (dx > meta || dy > meta) continue;
    const ammesso = !esclusoIl(punto.posto);
    const d = dx * dx + dy * dy;
    // Un ammesso vince su un escluso a qualunque distanza; a parità di giudizio vince il più vicino.
    const meglio = migliore === null || (ammesso && !migliore.ammesso) || (ammesso === migliore.ammesso && d < distanza);
    if (meglio) {
      migliore = { punto, ammesso };
      distanza = d;
    }
  }
  return migliore;
}

/** La copia che segue il puntatore, e lo scarto che la porta sul blocco vero. */
export interface Copia {
  readonly disegno: Disegno;
  readonly dx: number;
  readonly dy: number;
}

const tocca = (p: Punto | undefined, r: Rettangolo) => p !== undefined && p.x >= r.x - 1 && p.x <= r.x + r.larghezza + 1 && p.y >= r.y - 1 && p.y <= r.y + r.altezza + 1;

/** La funzione da impaginare per la copia di un blocco: solo quel blocco, e i dati senza i valori iniziali (disegnati
 * sotto «Inizio», non si spostano col blocco). I dati restano perché il disegno li legge: il rombo di un `per ogni`
 * su un vettore ne scrive la lunghezza. Una Lettura con la domanda si impagina con la sua Scrittura (`b` sono i due). */
export const soloIlBlocco = (f: Funzione, b: Blocco | readonly Blocco[]): Funzione => ({ ...f, data: f.data.map(({ initial: _, ...d }) => d), body: Array.isArray(b) ? b : [b as Blocco] });

/** Lo spazio fra i blocchi scelti e il riquadro intorno a loro, nel sistema del disegno. */
export const MARGINE_DELLA_SCELTA = 8;

/** Il riquadro intorno ai blocchi della copia, portato sul disegno vero con lo scarto, col margine: le forme, le linee
 * (anche quelle di ritorno dei cicli), le etichette e i riquadri dei cicli. `null` se la copia non ha nulla. */
export function riquadroDellaCopia(c: Copia): Rettangolo | null {
  const d = c.disegno;
  const xs: number[] = [];
  const ys: number[] = [];
  const conta = (r: Rettangolo) => {
    xs.push(r.x, r.x + r.larghezza);
    ys.push(r.y, r.y + r.altezza);
  };
  d.elementi.forEach((e) => conta(e.riquadro));
  d.etichette.forEach((t) => conta(t.riquadro));
  d.riquadri.forEach((r) => conta(r.bordo));
  d.connettori.forEach((l) => l.punti.forEach((p) => conta({ x: p.x, y: p.y, larghezza: 0, altezza: 0 })));
  if (xs.length === 0) return null;
  const [x, y] = [Math.min(...xs) + c.dx - MARGINE_DELLA_SCELTA, Math.min(...ys) + c.dy - MARGINE_DELLA_SCELTA];
  return { x, y, larghezza: Math.max(...xs) + c.dx + MARGINE_DELLA_SCELTA - x, altezza: Math.max(...ys) + c.dy + MARGINE_DELLA_SCELTA - y };
}

/**
 * La copia del blocco `id` col suo contenuto: `solo` è il disegno di `soloIlBlocco`, una funzione che contiene solo quel
 * blocco (l'impaginazione di un sottoalbero non dipende da ciò che gli sta intorno); se ne tolgono l'inizio,
 * la fine e le due linee che li toccano. Lo scarto porta la forma del blocco su quella del disegno `vero`.
 */
export function copiaDelBlocco(solo: Disegno, id: string, vero: Disegno): Copia | null {
  const inizio = solo.elementi.find((e) => e.forma === "inizio");
  const fine = solo.elementi.find((e) => e.forma === "fine");
  const qui = solo.elementi.find((e) => e.id === id);
  const la = vero.elementi.find((e) => e.id === id);
  if (!inizio || !fine || !qui || !la) return null;
  return {
    disegno: {
      ...solo,
      elementi: solo.elementi.filter((e) => e !== inizio && e !== fine),
      connettori: solo.connettori.filter((c) => !tocca(c.punti[0], inizio.riquadro) && !tocca(c.punti.at(-1), fine.riquadro)),
      punti: [],
    },
    dx: la.riquadro.x - qui.riquadro.x,
    dy: la.riquadro.y - qui.riquadro.y,
  };
}
