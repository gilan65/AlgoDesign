// La copia di un vettore col suo nome (`altri ← voti`): un'assegnazione che si esegue elemento per elemento, con le
// azioni del `mentre` equivalente e una posizione nascosta, come il `per ogni`. L'interprete, la tabella di traccia, il
// disegno e i generatori la riconoscono allo stesso modo, sull'albero dell'espressione (le parentesi attorno a un nome
// non cambiano niente: `altri ← (voti)` è una copia per tutti); la posizione ha il livello che avrebbe un `per ogni` al
// suo posto, il numero dopo quello dei `per ogni` che la contengono (`_indice`, `_indice2`), come nel codice generato.
//
// La riga di una matrice (`m[i]`) è un vettore: `m[i] ← v` e `v ← m[i]` sono copie con una posizione, come quella di un
// vettore. La copia di una matrice col suo nome (`b ← a`) ha due posizioni, come due `per ogni` uno dentro l'altro: la
// riga al livello della copia, la colonna al successivo.
//
// Il record di una tabella (`t[i]`) è un record: `r ← t[i]`, `t[i] ← r` e `t[i] ← t[j]` sono copie campo per campo, come
// `b ← a` fra due record (chi lo sa già: l'interprete e i generatori, che passano le tabelle).

import { analizza, type Espressione } from "../espressioni/analizzatore";
import type { Blocco, Dato } from "./modello";

/** L'albero di un testo, se si lascia leggere. */
const alberoDi = (testo: string): Espressione | undefined => {
  const a = analizza(testo);
  return a.ok ? a.espressione : undefined;
};

/** Il nome, se il testo è un nome solo (anche fra parentesi): lo stesso albero che leggono l'interprete e i generatori. */
const soloUnNome = (testo: string): string | undefined => {
  const e = alberoDi(testo);
  return e?.genere === "nome" ? e.nome : undefined;
};

/** Se il testo è la riga di una delle matrici scritta col nome e un indice (`m[i]`). */
const unaRiga = (testo: string, matrici: ReadonlySet<string>): boolean => {
  const e = alberoDi(testo);
  return e?.genere === "indice" && e.base.genere === "nome" && matrici.has(e.base.nome);
};

/** I nomi dei vettori che le regole di una funzione vedono: i suoi e, nel programma principale, le costanti comuni. Le
 * matrici comprese: una matrice è un vettore di righe. */
export const nomiDeiVettori = (dati: readonly Dato[]): ReadonlySet<string> => new Set(dati.filter((d) => d.size !== undefined).map((d) => d.name));

/** I nomi delle matrici che le regole di una funzione vedono. */
export const nomiDelleMatrici = (dati: readonly Dato[]): ReadonlySet<string> => new Set(dati.filter((d) => d.columns !== undefined).map((d) => d.name));

/** L'assegnazione di un vettore intero dal nome di un vettore: la copia elemento per elemento (il controllo statico ha
 * garantito lo stesso tipo e la stessa dimensione). Da una funzione che restituisce un vettore è un'azione sola. Con le
 * `matrici`, anche la riga di una matrice da una parte o dall'altra, e una matrice dal nome di una matrice. */
export function eUnaCopia(b: Blocco, vettori: ReadonlySet<string>, matrici: ReadonlySet<string> = new Set()): boolean {
  if (b.kind !== "assignment") return false;
  const verso = soloUnNome(b.target);
  const versoUnVettore = (verso !== undefined && vettori.has(verso)) || unaRiga(b.target, matrici);
  return versoUnVettore && (soloUnNome(b.value) !== undefined || unaRiga(b.value, matrici));
}

/** Quante posizioni nascoste ha un blocco che è una copia col nome: due per una matrice, una per un vettore o una riga,
 * nessuna se non è una copia. */
export function posizioniDellaCopia(b: Blocco, vettori: ReadonlySet<string>, matrici: ReadonlySet<string> = new Set()): number {
  if (!eUnaCopia(b, vettori, matrici)) return 0;
  const verso = soloUnNome((b as { target: string }).target);
  return verso !== undefined && matrici.has(verso) ? 2 : 1;
}

/** I nomi dei record (non dei vettori di record) che le regole di una funzione vedono. */
export const nomiDeiRecord = (dati: readonly Dato[]): ReadonlySet<string> => new Set(dati.filter((d) => d.type === "record" && d.size === undefined).map((d) => d.name));

/** I nomi delle tabelle (i vettori di record) che le regole di una funzione vedono. */
export const nomiDelleTabelle = (dati: readonly Dato[]): ReadonlySet<string> => new Set(dati.filter((d) => d.type === "record" && d.size !== undefined).map((d) => d.name));

/** L'assegnazione di un record intero dal nome di un record (`b ← a`): la copia campo per campo, un'azione per campo, senza
 * una posizione nascosta (i campi hanno un nome). Un riconoscimento suo, mai `eUnaCopia`: il record non ha la posizione
 * del vettore. Con le `tabelle`, anche un record di una tabella scritto col nome e un indice (`t[i]`) da una parte o
 * dall'altra, come fa l'interprete. */
export function eUnaCopiaDiUnRecord(b: Blocco, record: ReadonlySet<string>, tabelle: ReadonlySet<string> = new Set()): boolean {
  if (b.kind !== "assignment") return false;
  const verso = soloUnNome(b.target);
  const versoUnRecord = (verso !== undefined && record.has(verso)) || unaRiga(b.target, tabelle);
  return versoUnRecord && (soloUnNome(b.value) !== undefined || unaRiga(b.value, tabelle));
}

/** Il livello di ogni `per ogni` e di ogni copia col nome di un albero, per `id`: 1 se nessun `per ogni` li contiene,
 * poi 2, 3… È il numero della loro posizione nascosta nella fotografia dell'esecuzione, nella tabella di traccia e nel
 * codice; la copia di una matrice ha anche la posizione del livello dopo (la colonna). */
export function livelliDellePosizioni(blocchi: readonly Blocco[], vettori: ReadonlySet<string>, matrici: ReadonlySet<string> = new Set()): ReadonlyMap<string, number> {
  const livelli = new Map<string, number>();
  const visita = (bs: readonly Blocco[], fuori: number): void => {
    for (const b of bs) {
      if (b.kind === "if") visita([...b.then, ...b.else], fuori);
      else if (b.kind === "for_each") {
        livelli.set(b.id, fuori + 1);
        visita(b.body, fuori + 1);
      } else if (b.kind === "while" || b.kind === "repeat" || b.kind === "for") visita(b.body, fuori);
      else if (eUnaCopia(b, vettori, matrici)) livelli.set(b.id, fuori + 1);
    }
  };
  visita(blocchi, 0);
  return livelli;
}

/** Quante posizioni nascoste tiene una funzione: il livello più alto dei suoi `per ogni` e delle sue copie col nome,
 * contando la colonna della copia di una matrice. Con `contato`, solo fra i blocchi che lo soddisfano (la tabella di
 * traccia mostra le posizioni dei soli blocchi disegnati con la posizione). */
export function quantePosizioni(blocchi: readonly Blocco[], vettori: ReadonlySet<string>, matrici: ReadonlySet<string> = new Set(), contato: (b: Blocco) => boolean = () => true): number {
  const livelli = livelliDellePosizioni(blocchi, vettori, matrici);
  const perId = new Map<string, Blocco>();
  const visita = (bs: readonly Blocco[]): void => {
    for (const b of bs) {
      perId.set(b.id, b);
      if (b.kind === "if") visita([...b.then, ...b.else]);
      else if (b.kind === "for_each" || b.kind === "while" || b.kind === "repeat" || b.kind === "for") visita(b.body);
    }
  };
  visita(blocchi);
  return Math.max(0, ...[...livelli].flatMap(([id, l]) => (contato(perId.get(id)!) ? [l + Math.max(0, posizioniDellaCopia(perId.get(id)!, vettori, matrici) - 1)] : [])));
}
