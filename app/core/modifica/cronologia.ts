// La cronologia di «Annulla» e «Ripeti»: un valore immutabile coi progetti di prima, quello di adesso e
// quelli annullati. Un passo per modifica confermata (ogni operazione applicata); un'operazione rifiutata,
// o che lascia il progetto com'è, non è un passo. Una modifica nuova dopo un «Annulla» toglie i passi da
// ripetere. «Nuovo» e «Apri» cominciano una cronologia nuova.
//
// `prossimo` è il primo numero libero per un identificatore nuovo, e non torna mai indietro: un blocco
// annullato non restituisce il suo numero (identificatori.ts).
//
// I passi da annullare sono al più `passiDaAnnullare`: ogni progetto è una copia intera (il lettore
// ricostruisce ogni oggetto), e una sessione lunga su un programma grande crescerebbe senza fine. Oltre il
// tetto si dimentica il passo più vecchio.

import type { Progetto } from "../progetto/modello";
import { primoLibero } from "./identificatori";
import type { Operazione, Rifiuto } from "./operazioni";

export const passiDaAnnullare = 200;

export interface Cronologia {
  readonly passato: readonly Progetto[];
  readonly presente: Progetto;
  readonly futuro: readonly Progetto[];
  readonly prossimo: number;
}

/** Una cronologia nuova sul progetto, senza passi. */
export function inizia(p: Progetto): Cronologia {
  return { passato: [], presente: p, futuro: [], prossimo: primoLibero(p) };
}

export type EsitoDelPasso = { readonly ok: true; readonly cronologia: Cronologia } | { readonly ok: false; readonly rifiuto: Rifiuto };

/** Applica l'operazione al progetto di adesso: se cambia qualcosa, è un passo. */
export function applica(c: Cronologia, operazione: Operazione): EsitoDelPasso {
  const r = operazione(c.presente, c.prossimo);
  if (!r.ok) return r;
  const prossimo = Math.max(c.prossimo, r.prossimo);
  if (r.progetto === c.presente) return { ok: true, cronologia: { ...c, prossimo } };
  const passato = [...c.passato, c.presente].slice(-passiDaAnnullare);
  return { ok: true, cronologia: { passato, presente: r.progetto, futuro: [], prossimo } };
}

export const siAnnulla = (c: Cronologia) => c.passato.length > 0;
export const siRipete = (c: Cronologia) => c.futuro.length > 0;

/** I nomi dei dati della funzione `id` (il programma principale, senza); nessuno, se la funzione non c'è. */
const nomiDeiDati = (p: Progetto, id?: string) => (p.functions.find((f) => (id === undefined ? f.kind === "main" : f.id === id))?.data ?? []).map((d) => d.name);
/** La prima posizione in cui le due liste di nomi differiscono (o la fine della più corta). */
function primaDifferenza(corta: readonly string[], lunga: readonly string[]): number {
  let k = 0;
  while (k < corta.length && corta[k] === lunga[k]) k++;
  return k;
}

/**
 * I nomi che il dato in quella posizione aveva nei passi di prima, dal più recente: si risale la cronologia
 * finché si sa quale dato era (un passo aggiunge un dato, in fondo o sotto quello duplicato, ne toglie uno o ne
 * scambia due vicini, e la posizione si sposta di conseguenza); ci si ferma al passo in cui il dato è nato o a uno
 * che cambia più dati insieme. Serve alla
 * domanda prima di eliminarlo: un nome nuovo che non è una parola sola non entra nelle regole, che restano
 * scritte col nome di prima. Con due dati dello stesso nome accanto, la posizione può sbagliare di uno. I dati sono
 * quelli della funzione `funzione` (il programma principale, senza): un passo in cui la funzione non c'era la fa nascere.
 */
export function nomiDiPrima(c: Cronologia, indice: number, funzione?: string): string[] {
  const nomi: string[] = [];
  let i = indice;
  let dopo = nomiDeiDati(c.presente, funzione);
  if (i < 0 || i >= dopo.length) return nomi;
  const adesso = dopo[i]!;
  for (let k = c.passato.length - 1; k >= 0; k--) {
    const passato = c.passato[k]!;
    if (funzione !== undefined && !passato.functions.some((f) => f.id === funzione)) break;
    const prima = nomiDeiDati(passato, funzione);
    if (prima.length === dopo.length - 1) {
      const nuovo = primaDifferenza(prima, dopo);
      if (nuovo === i) break;
      if (nuovo < i) i--;
    } else if (prima.length === dopo.length + 1) {
      if (primaDifferenza(dopo, prima) <= i) i++;
    } else if (prima.length !== dopo.length) break;
    else {
      // Due dati vicini scambiati (uno spostamento su o giù): il dato stava nell'altra posizione.
      const diversi = prima.flatMap((n, k) => (n === dopo[k] ? [] : [k]));
      const [a, b] = diversi;
      if (diversi.length === 2 && b === a! + 1 && prima[a!] === dopo[b] && prima[b] === dopo[a!] && (i === a || i === b)) i = i === a ? b : a!;
    }
    const nome = prima[i]!;
    if (nome !== adesso && !nomi.includes(nome)) nomi.push(nome);
    dopo = prima;
  }
  return nomi;
}

/** Il progetto del passo prima; senza passi, la cronologia com'è. */
export function annulla(c: Cronologia): Cronologia {
  if (!siAnnulla(c)) return c;
  return { ...c, passato: c.passato.slice(0, -1), presente: c.passato.at(-1)!, futuro: [c.presente, ...c.futuro] };
}

/** Il passo annullato per ultimo; senza passi da ripetere, la cronologia com'è. */
export function ripeti(c: Cronologia): Cronologia {
  if (!siRipete(c)) return c;
  return { ...c, passato: [...c.passato, c.presente], presente: c.futuro[0]!, futuro: c.futuro.slice(1) };
}
