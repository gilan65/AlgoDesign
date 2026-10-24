// Le colonne della tabella di traccia come le dispone l'utente: l'ordine in cui si mostrano e le larghezze scelte. Il
// nucleo dà le colonne nel suo ordine (`TabellaMostrata.colonne`) e le celle di ogni riga nello stesso; qui si decide
// solo dove si mostrano e quanto sono larghe: i dati del progetto non si spostano. Si spostano a gruppi: le colonne di
// un vettore insieme (spostate una per una, la colonna degli altri si staccherebbe dai primi elementi), la posizione di un
// `per ogni`, la condizione e lo scritto ciascuna per sé. Il numero e la regola restano le prime. Con procedure e
// funzioni ogni colonna sta nella sua regione e si sposta solo lì: la radice con la condizione e lo scritto (subito dopo i
// suoi dati), poi il gruppo di ogni funzione, nell'ordine del nucleo. Funzioni pure, senza DOM: il bersaglio di un
// trascinamento viene dai numeri misurati alla presa.
import type { ColonnaDiUnValore } from "../../core/esecuzione/traccia";

/** I gruppi e le chiavi delle colonne che non sono di un dato: nessun dato ha un nome che comincia con `#`. */
export const CONDIZIONE = "#condizione";
export const SCRIVE = "#scrive";
export const REGOLA = "#regola";

/** La chiave del gruppo della radice fra quelli che si chiudono: le altre sono i nomi delle funzioni. */
export const RADICE = "#radice";

/** Come l'utente ha disposto le colonne: l'ordine dei gruppi (anche di gruppi che la tabella di adesso non ha, per
 * un'esecuzione dopo), le larghezze scelte, per chiave della colonna, e i gruppi della radice e delle funzioni chiusi
 * (`RADICE`, o il nome della funzione). */
export interface Disposizione {
  readonly ordine: readonly string[];
  readonly larghezze: Readonly<Record<string, number>>;
  readonly chiusi: readonly string[];
}

export const disposizioneIniziale: Disposizione = { ordine: [], larghezze: {}, chiusi: [] };

/** Una colonna dopo la regola, nell'ordine in cui si mostra: la chiave della sua larghezza (il nome della colonna, col
 * nome della funzione davanti in un suo gruppo, o quello della condizione e dello scritto), il suo gruppo, la sua cella
 * nella riga del nucleo (i valori, poi la condizione e lo scritto) e la funzione del gruppo in cui sta (nessuna per la
 * radice, la condizione e lo scritto). */
export interface ColonnaMostrata {
  readonly chiave: string;
  readonly gruppo: string;
  readonly cella: number;
  readonly funzione?: string;
}

/** Le colonne dopo la regola nell'ordine in cui nascono: i valori della radice, la condizione, lo scritto, poi i gruppi
 * delle funzioni. */
function delNucleo(colonne: readonly ColonnaDiUnValore[]): ColonnaMostrata[] {
  const mostrata = (c: ColonnaDiUnValore, cella: number): ColonnaMostrata =>
    c.funzione === undefined ? { chiave: c.nome, gruppo: c.gruppo, cella } : { chiave: `${c.funzione} › ${c.nome}`, gruppo: c.gruppo, cella, funzione: c.funzione };
  const tutte = colonne.map(mostrata);
  return [
    ...tutte.filter((c) => c.funzione === undefined),
    { chiave: CONDIZIONE, gruppo: CONDIZIONE, cella: colonne.length },
    { chiave: SCRIVE, gruppo: SCRIVE, cella: colonne.length + 1 },
    ...tutte.filter((c) => c.funzione !== undefined),
  ];
}

/** I gruppi, ciascuno una volta, nell'ordine in cui compaiono. */
const gruppiDi = (colonne: readonly ColonnaMostrata[]): string[] => [...new Set(colonne.map((c) => c.gruppo))];

/** Le regioni, nell'ordine: la radice (`undefined`), poi le funzioni. */
const regioniDi = (colonne: readonly ColonnaMostrata[]): (string | undefined)[] => [...new Set(colonne.map((c) => c.funzione))];

/**
 * L'ordine dei gruppi di questa tabella: quello scelto, per i gruppi che ci sono; un gruppo mai spostato (una colonna
 * nuova) sta subito dopo il gruppo che lo precede nell'ordine del nucleo, o in testa.
 */
export function ordineDeiGruppi(nucleo: readonly string[], scelto: readonly string[]): string[] {
  const ci = new Set(nucleo);
  const ordine = scelto.filter((g) => ci.has(g));
  nucleo.forEach((g, i) => {
    if (ordine.includes(g)) return;
    const prima = nucleo.slice(0, i).findLast((p) => ordine.includes(p));
    ordine.splice(prima === undefined ? 0 : ordine.indexOf(prima) + 1, 0, g);
  });
  return ordine;
}

/** Le colonne dopo la regola nell'ordine scelto, regione per regione; dentro un gruppo, nell'ordine del nucleo. */
export function colonneMostrate(colonne: readonly ColonnaDiUnValore[], scelto: readonly string[]): ColonnaMostrata[] {
  const tutte = delNucleo(colonne);
  return regioniDi(tutte).flatMap((r) => {
    const qui = tutte.filter((c) => c.funzione === r);
    return ordineDeiGruppi(gruppiDi(qui), scelto).flatMap((g) => qui.filter((c) => c.gruppo === g));
  });
}

/** I gruppi mostrati della regione di `gruppo`, nell'ordine: fra loro soltanto si sposta. */
export function gruppiDellaRegione(mostrate: readonly ColonnaMostrata[], gruppo: string): string[] {
  const regione = mostrate.find((c) => c.gruppo === gruppo)?.funzione;
  return gruppiDi(mostrate.filter((c) => c.funzione === regione));
}

/** L'ordine di tutti i gruppi mostrati, con quelli della regione di `gruppo` nell'ordine `ordine`. */
export function conLaRegione(mostrate: readonly ColonnaMostrata[], gruppo: string, ordine: readonly string[]): readonly string[] {
  const regione = mostrate.find((c) => c.gruppo === gruppo)?.funzione;
  return regioniDi(mostrate).flatMap((r) => (r === regione ? [...ordine] : gruppiDi(mostrate.filter((c) => c.funzione === r))));
}

/** L'ordine dei gruppi mostrati, col gruppo spostato di un posto (a sinistra -1, a destra 1); fermo agli estremi. */
export function spostato(ordine: readonly string[], gruppo: string, verso: -1 | 1): readonly string[] {
  const i = ordine.indexOf(gruppo);
  const j = i + verso;
  if (i < 0 || j < 0 || j >= ordine.length) return ordine;
  const nuovo = [...ordine];
  [nuovo[i], nuovo[j]] = [nuovo[j]!, nuovo[i]!];
  return nuovo;
}

/** L'ordine col gruppo messo in quel posto fra gli ALTRI gruppi (0: primo). */
export function conIlGruppoIn(ordine: readonly string[], gruppo: string, posto: number): readonly string[] {
  const altri = ordine.filter((g) => g !== gruppo);
  return [...altri.slice(0, posto), gruppo, ...altri.slice(posto)];
}

/** Il posto del gruppo trascinato, fra gli altri gruppi: quanti hanno il centro a sinistra del puntatore. I centri sono
 * quelli degli altri gruppi, misurati alla presa, nello stesso sistema del puntatore. */
export const postoDelPuntatore = (centri: readonly number[], x: number): number => centri.filter((c) => c < x).length;

/** I limiti della larghezza di una colonna, in px, e di quanto la cambiano Allarga e Stringi. */
export const LARGHEZZA_MINIMA = 24;
export const LARGHEZZA_MASSIMA = 640;
export const PASSO_DELLA_LARGHEZZA = 16;

export const limitata = (w: number): number => Math.round(Math.min(Math.max(w, LARGHEZZA_MINIMA), LARGHEZZA_MASSIMA));

export const stessoOrdine = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((g, i) => g === b[i]);
