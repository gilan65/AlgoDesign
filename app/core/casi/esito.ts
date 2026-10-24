// L'esito di un caso d'uso: l'atteso confrontato con l'ottenuto, a due livelli. Un caso è
// RAGGIUNTO se coincidono l'output, l'errore e l'errore statico; gli avvisi diversi si dicono a parte, anche in un
// caso raggiunto. È la sola funzione che confronta un caso: la usano l'esecuzione della finestra e la riga di
// comando, attraverso l'esecuzione del nucleo (`esecuzione.ts`).
//
// - Le segnalazioni si confrontano come testo `codice@blocco` («nessuno» se mancano); gli avvisi tutti, in ordine,
//   e `warnings` assente vale «nessun avviso atteso».
// - L'output si confronta esatto. L'esecuzione tiene l'output di un caso fino alla lunghezza dell'atteso più
//   `margineDellOutput` caratteri: un ottenuto tagliato è più lungo dell'atteso, quindi diverso, e la differenza lo
//   mostra tagliato.
//
// Che cosa NON guarda: come si ottiene l'ottenuto (le regole delle voci del caso sono dell'esecuzione); un progetto
// fuori tappa, che non ha un ottenuto (l'esito lo dice senza confronto).

import type { Atteso, CodiceAvviso, Segnalazione } from "../progetto/modello";

/** Quanti caratteri (unità di testo) dell'output di un caso si tengono oltre la lunghezza dell'atteso: quattro righe
 * della console coi caratteri predefiniti, per vedere che cosa il programma scrive dopo la fine dell'atteso. */
export const margineDellOutput = 1000;

export type Campo = "output" | "error" | "static_error";

/** Un campo diverso; `tagliato`: l'output ottenuto è tenuto solo fino al margine. */
export interface Differenza {
  readonly campo: Campo;
  readonly atteso: string;
  readonly ottenuto: string;
  readonly tagliato?: true;
}

/** Gli avvisi attesi e quelli ottenuti, come testo, quando sono diversi. */
export interface AvvisiDiversi {
  readonly attesi: string;
  readonly ottenuti: string;
}

export type EsitoDelCaso =
  | { readonly fuoriTappa: true }
  | {
      readonly fuoriTappa: false;
      readonly raggiunto: boolean;
      /** I campi diversi fra output, errore ed errore statico: nessuno se il caso è raggiunto. */
      readonly differenze: readonly Differenza[];
      /** Presente solo se gli avvisi sono diversi. */
      readonly avvisi?: AvvisiDiversi;
      /** Ciò che si è ottenuto, nella forma dell'atteso (l'output fino al margine). */
      readonly ottenuto: Atteso;
    };

/** Una segnalazione come testo confrontabile: `codice@blocco`, o «nessuno». */
export const comeTesto = (s: Segnalazione<string> | undefined): string => (s === undefined ? "nessuno" : `${s.code}@${s.block}`);

/** Gli avvisi in ordine, come testo; «nessuno» se non ce ne sono. */
const avvisiComeTesto = (a: readonly Segnalazione<CodiceAvviso>[] | undefined): string => (a ?? []).map(comeTesto).sort().join(", ") || "nessuno";

/** Dove due testi cominciano a essere diversi (in unità di testo): la lunghezza del più corto se uno è l'inizio
 * dell'altro, `-1` se sono uguali. La finestra segna lì la prima differenza dell'output, quindi mai a metà di un
 * carattere fuori dal piano di base (due unità: i due testi possono condividere la prima). */
export function primaDifferenza(a: string, b: string): number {
  if (a === b) return -1;
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  const alta = (c: number) => c >= 0xd800 && c <= 0xdbff;
  return k > 0 && alta(a.charCodeAt(k - 1)) ? k - 1 : k;
}

/** L'atteso contro l'ottenuto; `tagliato`: l'output ottenuto è stato tenuto solo fino al margine. */
export function esitoDelCaso(atteso: Atteso, ottenuto: Atteso, tagliato: boolean): EsitoDelCaso {
  const differenze: Differenza[] = [];
  if (tagliato || atteso.output !== ottenuto.output) differenze.push({ campo: "output", atteso: atteso.output, ottenuto: ottenuto.output, ...(tagliato ? { tagliato: true as const } : {}) });
  for (const campo of ["error", "static_error"] as const) {
    const a = comeTesto(atteso[campo]);
    const o = comeTesto(ottenuto[campo]);
    if (a !== o) differenze.push({ campo, atteso: a, ottenuto: o });
  }
  const attesi = avvisiComeTesto(atteso.warnings);
  const ottenuti = avvisiComeTesto(ottenuto.warnings);
  return { fuoriTappa: false, raggiunto: differenze.length === 0, differenze, ...(attesi !== ottenuti ? { avvisi: { attesi, ottenuti } } : {}), ottenuto };
}
