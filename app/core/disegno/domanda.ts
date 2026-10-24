// La Lettura con la domanda: una VISTA, il file non cambia mai. Con l'opzione dell'app attiva, una
// Scrittura subito prima di una Lettura nella stessa sequenza si mostra come la domanda di quella Lettura, ma solo se
// mostrandola così la console resta identica: con l'a capo («Va a capo» spuntato), oppure senza a capo e con uno spazio
// in fondo, un valore `" "` a sé o lo spazio finale dell'ultimo testo (lo spazio non si mostra: senza «Va a capo» fra la
// domanda e il valore c'è sempre uno spazio). Le altre Scritture restano blocchi a sé.
//
// Qui solo funzioni pure: dalle sequenze le coppie, mai un progetto cambiato; e la Scrittura che una domanda scritta nei
// campi vuole, che rimostrata dà la stessa domanda. Chi modifica il progetto (i campi, gli spostamenti) usa le
// operazioni del nucleo sui due blocchi veri, con gli indici della sequenza vera.
import { parole } from "../espressioni/analizzatore";
import type { Blocco } from "../progetto/modello";

/** Come lo spazio sta nella Scrittura senza a capo: un valore `" "` a sé, o in fondo all'ultimo testo. */
export type FormaDelloSpazio = "a sé" | "finale";

/** La domanda di una Lettura come la mostrano il disegno e i campi: i valori della Scrittura senza lo spazio, e se va a
 * capo. Senza a capo, `spazio` dice dove stava lo spazio, per riscrivere la Scrittura com'era. */
export interface Domanda {
  readonly values: readonly string[];
  readonly newline: boolean;
  readonly spazio?: FormaDelloSpazio;
}

/** Una coppia della vista: la Scrittura che si mostra come la domanda della Lettura. */
export interface Coppia {
  readonly scrittura: string;
  readonly lettura: string;
  readonly domanda: Domanda;
}

/** Il testo di un letterale stringa che finisce con uno spazio, se il valore è solo quello. */
function testoConLoSpazio(valore: string): string | undefined {
  const ps = parole(valore);
  if (ps?.length !== 1 || ps[0]!.genere !== "stringa") return undefined;
  const t = ps[0]!.testo;
  return t.length >= 3 && t.endsWith(' "') ? t : undefined;
}

/** Il valore che è solo uno spazio fra virgolette. */
const eLoSpazio = (valore: string): boolean => testoConLoSpazio(valore) === '" "';

/** La domanda che una Scrittura mostra davanti a una Lettura, o `undefined` se mostrarla così cambierebbe la console. */
export function domandaDellaScrittura(w: Extract<Blocco, { kind: "write" }>): Domanda | undefined {
  if (w.newline) return { values: [...w.values], newline: true };
  const n = w.values.length;
  const ultimo = w.values[n - 1];
  if (ultimo === undefined) return undefined;
  // Lo spazio da solo: senza un altro valore la domanda sarebbe vuota, e una Lettura senza domanda non scrive niente.
  if (eLoSpazio(ultimo)) return n > 1 ? { values: w.values.slice(0, -1), newline: false, spazio: "a sé" } : undefined;
  const testo = testoConLoSpazio(ultimo);
  if (testo === undefined) return undefined;
  return { values: [...w.values.slice(0, -1), `${testo.slice(0, -2)}"`], newline: false, spazio: "finale" };
}

/** I valori e l'a capo della Scrittura che mostra quella domanda: con l'a capo i valori stessi; senza, lo spazio nella
 * forma della domanda, o (una domanda nuova) in fondo all'ultimo valore se è un testo fra virgolette, altrimenti a sé.
 * `undefined` per una domanda senza valori: la Lettura resta senza Scrittura. */
export function scritturaDellaDomanda(d: Domanda): { readonly values: readonly string[]; readonly newline: boolean } | undefined {
  const n = d.values.length;
  if (n === 0) return undefined;
  if (d.newline) return { values: [...d.values], newline: true };
  const ultimo = d.values[n - 1]!;
  const ps = parole(ultimo);
  const testo = ps?.length === 1 && ps[0]!.genere === "stringa" ? ps[0]!.testo : undefined;
  if (d.spazio !== "a sé" && testo !== undefined) return { values: [...d.values.slice(0, -1), `${testo.slice(0, -1)} "`], newline: false };
  return { values: [...d.values, '" "'], newline: false };
}

const ramiDi = (b: Blocco): readonly (readonly Blocco[])[] => (b.kind === "if" ? [b.then, b.else] : "body" in b ? [b.body] : []);

/** Le coppie di una sequenza e delle sequenze che contiene, per `id` della Lettura. Una Scrittura entra al più in una
 * coppia: quella della Lettura che la segue. */
export function coppie(blocchi: readonly Blocco[]): ReadonlyMap<string, Coppia> {
  const fuori = new Map<string, Coppia>();
  const visita = (s: readonly Blocco[]): void => {
    s.forEach((b, i) => {
      const dopo = s[i + 1];
      if (b.kind === "write" && dopo?.kind === "read") {
        const domanda = domandaDellaScrittura(b);
        if (domanda !== undefined) fuori.set(dopo.id, { scrittura: b.id, lettura: dopo.id, domanda });
      }
      ramiDi(b).forEach(visita);
    });
  };
  visita(blocchi);
  return fuori;
}

/** Le stesse coppie per `id` della Scrittura. */
export const perScrittura = (c: ReadonlyMap<string, Coppia>): ReadonlyMap<string, Coppia> => new Map([...c.values()].map((x) => [x.scrittura, x]));

/** Se due domande si mostrano uguali (la forma dello spazio non si vede). */
export const stessaDomanda = (a: Domanda, b: Domanda): boolean =>
  a.newline === b.newline && a.values.length === b.values.length && a.values.every((v, i) => v === b.values[i]);
