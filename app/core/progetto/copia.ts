// La copia di un vettore col suo nome (`altri ← voti`): un'assegnazione che si esegue elemento per elemento, con le
// azioni del `mentre` equivalente e una posizione nascosta, come il `per ogni`. L'interprete, la tabella di traccia, il
// disegno e i generatori la riconoscono allo stesso modo, sull'albero dell'espressione (le parentesi attorno a un nome
// non cambiano niente: `altri ← (voti)` è una copia per tutti); la posizione ha il livello che avrebbe un `per ogni` al
// suo posto, il numero dopo quello dei `per ogni` che la contengono (`_indice`, `_indice2`), come nel codice generato.

import { analizza } from "../espressioni/analizzatore";
import type { Blocco, Dato } from "./modello";

/** Il nome, se il testo è un nome solo (anche fra parentesi): lo stesso albero che leggono l'interprete e i generatori. */
const soloUnNome = (testo: string): string | undefined => {
  const a = analizza(testo);
  return a.ok && a.espressione.genere === "nome" ? a.espressione.nome : undefined;
};

/** I nomi dei vettori che le regole di una funzione vedono: i suoi e, nel programma principale, le costanti comuni. */
export const nomiDeiVettori = (dati: readonly Dato[]): ReadonlySet<string> => new Set(dati.filter((d) => d.size !== undefined).map((d) => d.name));

/** L'assegnazione di un vettore intero dal nome di un vettore: la copia elemento per elemento (il controllo statico ha
 * garantito lo stesso tipo e la stessa dimensione). Da una funzione che restituisce un vettore è un'azione sola. */
export function eUnaCopia(b: Blocco, vettori: ReadonlySet<string>): boolean {
  if (b.kind !== "assignment") return false;
  const verso = soloUnNome(b.target);
  return verso !== undefined && vettori.has(verso) && soloUnNome(b.value) !== undefined;
}

/** I nomi dei record (non dei vettori di record) che le regole di una funzione vedono. */
export const nomiDeiRecord = (dati: readonly Dato[]): ReadonlySet<string> => new Set(dati.filter((d) => d.type === "record" && d.size === undefined).map((d) => d.name));

/** L'assegnazione di un record intero dal nome di un record (`b ← a`): la copia campo per campo, un'azione per campo, senza
 * una posizione nascosta (i campi hanno un nome). Un riconoscimento suo, mai `eUnaCopia`: il record non ha la posizione
 * del vettore. */
export function eUnaCopiaDiUnRecord(b: Blocco, record: ReadonlySet<string>): boolean {
  if (b.kind !== "assignment") return false;
  const verso = soloUnNome(b.target);
  return verso !== undefined && record.has(verso) && soloUnNome(b.value) !== undefined;
}

/** Il livello di ogni `per ogni` e di ogni copia col nome di un albero, per `id`: 1 se nessun `per ogni` li contiene,
 * poi 2, 3… È il numero della loro posizione nascosta nella fotografia dell'esecuzione, nella tabella di traccia e nel
 * codice. */
export function livelliDellePosizioni(blocchi: readonly Blocco[], vettori: ReadonlySet<string>): ReadonlyMap<string, number> {
  const livelli = new Map<string, number>();
  const visita = (bs: readonly Blocco[], fuori: number): void => {
    for (const b of bs) {
      if (b.kind === "if") visita([...b.then, ...b.else], fuori);
      else if (b.kind === "for_each") {
        livelli.set(b.id, fuori + 1);
        visita(b.body, fuori + 1);
      } else if (b.kind === "while" || b.kind === "repeat" || b.kind === "for") visita(b.body, fuori);
      else if (eUnaCopia(b, vettori)) livelli.set(b.id, fuori + 1);
    }
  };
  visita(blocchi, 0);
  return livelli;
}
