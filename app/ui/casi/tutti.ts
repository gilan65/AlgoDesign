// «Esegui tutti» (o i selezionati): i casi d'uso dati uno dopo l'altro, ciascuno con l'esecuzione del nucleo nel modo caso (la
// stessa della riga di comando, `core/casi/esecutore.ts`), a fette: una fetta non dura più del tempo dato, e fra due
// fette la finestra risponde. Senza la tabella di traccia, che qui nessuno mostra (con la tabella un caso lungo
// impiega il doppio, misurato sulla riga di comando). L'esito di ogni caso è quello dell'esecuzione: qui nessun
// confronto. I casi sono quelli del programma principale o, con `funzione`, quelli di una procedura o di una funzione,
// eseguita da sola. Il controllo statico si fa una volta per tutti i casi, e ogni esecuzione lo riceve.

import type { EsitoDelCaso } from "../../core/casi/esito";
import { controlla, type EsitoDelControllo, type Tetti } from "../../core/controllo/controllo";
import { Esecuzione } from "../../core/esecuzione/esecuzione";
import type { CasoDiUnaFunzione, Progetto } from "../../core/progetto/modello";

/** I casi del programma principale (senza `funzione`, o col suo `id`) o della procedura o funzione con quell'`id`. */
export function casiDella(p: Progetto, funzione?: string): readonly CasoDiUnaFunzione[] {
  const f = funzione === undefined ? undefined : p.functions.find((x) => x.id === funzione);
  return f === undefined || f.kind === "main" ? (p.test_cases ?? []) : (f.test_cases ?? []);
}

/** La chiave di un caso negli esiti e nella selezione: l'`id` della funzione (che non ha «/») e il nome (unico fra i
 * casi di una funzione). */
export const chiaveDelCaso = (funzione: string, nome: string) => `${funzione}/${nome}`;

/** Le chiavi di tutti i casi del progetto. */
export const chiaviDeiCasi = (p: Progetto): Set<string> => new Set(p.functions.flatMap((f) => casiDella(p, f.id).map((c) => chiaveDelCaso(f.id, c.name))));

/** I casi selezionati dopo Annulla o Ripeti, dal progetto `prima` a `dopo`: un caso che c'è in tutti e due tiene la
 * spunta di adesso (mettere o togliere una spunta non è un passo); uno che torna (eliminato, o col nome di prima di una
 * rinomina) ha quella che aveva l'ultima volta che `dopo` era il progetto di adesso (`ricordata`). */
export function selezioneDopoIlPasso(prima: Progetto, dopo: Progetto, adesso: ReadonlySet<string>, ricordata: ReadonlySet<string> | undefined): Set<string> {
  const cerano = chiaviDeiCasi(prima);
  return new Set([...chiaviDeiCasi(dopo)].filter((k) => (cerano.has(k) ? adesso.has(k) : ricordata?.has(k) === true)));
}

export class TuttiICasi {
  readonly progetto: Progetto;
  readonly limiti: Tetti;
  /** La procedura o la funzione eseguita da sola, o nessuna (i casi del programma principale). */
  readonly funzione: string | undefined;
  /** L'esito di ogni caso, per posizione; nessuno per i casi non eseguiti o non ancora finiti. */
  readonly esiti: (EsitoDelCaso | undefined)[];
  /** Le posizioni dei casi da eseguire, nell'ordine. */
  readonly #da: readonly number[];
  readonly #casi: readonly CasoDiUnaFunzione[];
  readonly #controllo: EsitoDelControllo;
  /** Quanti dei casi da eseguire sono finiti. */
  #fatti = 0;
  #corrente: Esecuzione<CasoDiUnaFunzione> | null = null;

  /** `indici`: le posizioni dei casi da eseguire (i selezionati); senza, tutti. */
  constructor(p: Progetto, limiti: Tetti, indici?: readonly number[], funzione?: string) {
    this.progetto = p;
    this.limiti = limiti;
    this.#controllo = controlla(p, limiti);
    const f = funzione === undefined ? undefined : p.functions.find((x) => x.id === funzione);
    this.funzione = f === undefined || f.kind === "main" ? undefined : f.id;
    this.#casi = casiDella(p, funzione);
    this.esiti = this.#casi.map(() => undefined);
    this.#da = (indici ?? this.#casi.map((_, i) => i)).filter((i) => this.#casi[i] !== undefined);
  }

  /** Quanti casi si eseguono. */
  get totale(): number {
    return this.#da.length;
  }

  /** I casi finiti. */
  get eseguiti(): number {
    return this.#fatti;
  }

  get finita(): boolean {
    return this.#fatti >= this.totale;
  }

  /** I casi eseguiti, nell'ordine del progetto (i loro esiti stanno in `esiti`, per posizione). */
  get casi(): readonly CasoDiUnaFunzione[] {
    return this.#casi;
  }

  /** Avanza i casi finché, secondo `orologio` (in millisecondi), non passa `durata`: almeno un'azione per fetta. Più
   * casi brevi possono finire nella stessa fetta. */
  fetta(orologio: () => number, durata: number): void {
    const inizio = orologio();
    do {
      const indice = this.#da[this.#fatti]!;
      const caso = this.#casi[indice]!;
      const es = (this.#corrente ??= new Esecuzione<CasoDiUnaFunzione>(this.progetto, this.limiti, { caso, tabella: false, controllo: this.#controllo, ...(this.funzione ? { funzione: this.funzione } : {}) }));
      // Nessun punto di interruzione: una pausa non arriva, ma se arrivasse il caso proseguirebbe.
      if (es.stato.genere === "pronta" || es.stato.genere === "pausa") es.comanda("continua");
      es.fetta(orologio, durata - (orologio() - inizio));
      const esito = es.esito;
      if (esito !== undefined) {
        this.esiti[indice] = esito;
        this.#fatti++;
        this.#corrente = null;
      }
    } while (!this.finita && orologio() - inizio < durata);
  }
}
