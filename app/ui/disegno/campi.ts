// I campi di un blocco come li scrive l'utente: un campo per parte (destinazione e valore; un valore per
// riga di una scrittura, più «va a capo»; la condizione; il testo del commento; contatore, inizio, fine e passo di
// un `per`; elemento e sorgente di un `per ogni`; la procedura di un salto e un argomento per parametro), con gli operatori a parola
// nella lingua dell'interfaccia. Nel file gli operatori sono inglesi: mostrando i campi si
// traducono, confermando si riportano alla forma del file, sempre e solo le PAROLE che l'analizzatore
// riconosce (un letterale e un nome che contiene un operatore restano come sono).
//
// Qui non si controlla nulla: il controllo è quello del nucleo, sul progetto candidato (`controlla`).
import type { Domanda } from "../../core/disegno/domanda";
import { traduciEspressione, type NomiDegliOperatori } from "../../core/disegno/lingua";
import { parole } from "../../core/espressioni/analizzatore";
import type { CampiDiUnBlocco } from "../../core/modifica/operazioni";
import type { Blocco } from "../../core/progetto/modello";

/** I campi come stanno scritti nell'editor: il passo di un `per` è il testo del suo campo. Con la Lettura con la domanda,
 * i campi di una Lettura hanno anche la domanda (un campo per valore, vuota senza domanda) e il suo «Va a capo»: non sono
 * campi della Lettura, ma della Scrittura che la precede. */
export type BozzaDelBlocco = Omit<CampiDiUnBlocco, "step"> & { readonly step?: string; readonly domanda?: readonly string[]; readonly domandaACapo?: boolean };

/** I campi di un blocco nella lingua dell'interfaccia; `undefined` per un genere che l'editor non modifica. `domanda`: per
 * una Lettura con l'opzione della domanda, quella che il disegno le mostra (`null`, nessuna); senza, l'opzione è spenta. */
export function bozzaDi(b: Blocco, nomi: NomiDegliOperatori, domanda?: Domanda | null): BozzaDelBlocco | undefined {
  const t = (testo: string) => traduciEspressione(testo, nomi);
  switch (b.kind) {
    case "assignment":
      return { target: t(b.target), value: t(b.value) };
    case "read":
      return domanda === undefined ? { target: t(b.target) } : { target: t(b.target), domanda: (domanda?.values ?? []).map(t), domandaACapo: domanda?.newline ?? false };
    case "write":
      return { values: b.values.map(t), newline: b.newline };
    case "if":
    case "while":
    case "repeat":
      return { condition: t(b.condition) };
    case "for":
      return { counter: t(b.counter), from: t(b.from), to: t(b.to), step: b.step === undefined ? "" : String(b.step) };
    case "for_each":
      return { item: t(b.item), source: t(b.source) };
    case "comment":
      return { text: b.text };
    // La procedura è un nome, non un'espressione: si mostra com'è.
    case "call":
      return { callee: b.callee, arguments: b.arguments.map(t) };
  }
}

/** Il testo di un'espressione con gli operatori a parola della lingua riportati alla forma del file. */
export function nellaFormaDelFile(testo: string, nomi: NomiDegliOperatori): string {
  const ps = parole(testo);
  if (ps === undefined) return testo;
  const inglese = new Map(Object.entries(nomi).map(([operatore, nome]) => [nome, operatore]));
  const c = Array.from(testo);
  let fuori = "";
  let fatto = 0;
  for (const p of ps) {
    // Il nome italiano di un operatore, per l'analizzatore, è un nome qualunque; quello inglese è una parola.
    const operatore = p.genere === "nome" || p.genere === "parola" ? inglese.get(p.testo) : undefined;
    if (operatore === undefined) continue;
    fuori += c.slice(fatto, p.da).join("") + operatore;
    fatto = p.a;
  }
  return fuori + c.slice(fatto).join("");
}

/** Il passo scritto nel suo campo: vuoto è il passo 1 (`null`: non si scrive nel file), un intero col suo segno è quel
 * numero (zero o fuori dagli interi del C lo dice il controllo statico); altro non si può scrivere nel file:
 * `undefined`. Come ogni letterale intero, niente zeri davanti (`01`: nel C sarebbe ottale). */
export function passoDelCampo(testo: string): number | null | undefined {
  const t = testo.trim();
  if (t === "") return null;
  const n = Number(t);
  return /^-?(0|[1-9]\d*)$/.test(t) && Number.isSafeInteger(n) ? n : undefined;
}

/** I campi da confermare, nella forma del file (il commento è testo e resta com'è); `undefined` se il passo scritto non
 * si può scrivere nel file. */
export function campiDaBozza(bozza: BozzaDelBlocco, nomi: NomiDegliOperatori): CampiDiUnBlocco | undefined {
  const f = (testo: string) => nellaFormaDelFile(testo, nomi);
  const passo = bozza.step === undefined ? undefined : passoDelCampo(bozza.step);
  if (bozza.step !== undefined && passo === undefined) return undefined;
  const { step: _, domanda: _d, domandaACapo: _a, ...senzaPasso } = bozza;
  return {
    ...senzaPasso,
    ...(bozza.target === undefined ? {} : { target: f(bozza.target) }),
    ...(bozza.value === undefined ? {} : { value: f(bozza.value) }),
    ...(bozza.values === undefined ? {} : { values: bozza.values.map(f) }),
    ...(bozza.condition === undefined ? {} : { condition: f(bozza.condition) }),
    ...(bozza.counter === undefined ? {} : { counter: f(bozza.counter) }),
    ...(bozza.from === undefined ? {} : { from: f(bozza.from) }),
    ...(bozza.to === undefined ? {} : { to: f(bozza.to) }),
    ...(bozza.step === undefined ? {} : { step: passo }),
    ...(bozza.item === undefined ? {} : { item: f(bozza.item) }),
    ...(bozza.source === undefined ? {} : { source: f(bozza.source) }),
    ...(bozza.arguments === undefined ? {} : { arguments: bozza.arguments.map(f) }),
  };
}

/** La domanda scritta nei campi di una Lettura, nella forma del file: senza valori non va a capo (la casella è spenta).
 * `undefined` se i campi non hanno la domanda (l'opzione è spenta, o non è una Lettura). */
export function domandaDaBozza(bozza: BozzaDelBlocco, nomi: NomiDegliOperatori): Domanda | undefined {
  if (bozza.domanda === undefined) return undefined;
  const values = bozza.domanda.map((v) => nellaFormaDelFile(v, nomi));
  return { values, newline: values.length > 0 && bozza.domandaACapo === true };
}

/** Se i campi sono quelli che il blocco ha già: confermarli non è un passo. Il passo 1, scritto o no, è lo stesso. */
export function stessiCampi(b: Blocco, campi: CampiDiUnBlocco): boolean {
  const proprio = b as unknown as Record<string, unknown>;
  const valore = (k: string, v: unknown) => (k === "step" ? (v ?? 1) : v);
  return Object.entries(campi).every(([k, v]) => JSON.stringify(valore(k, proprio[k])) === JSON.stringify(valore(k, v)));
}
