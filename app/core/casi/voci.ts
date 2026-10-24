// I dati che le voci di un caso d'uso possono nominare fuori dalla funzione che il caso esegue (la radice). Una lettura in
// un dato di lavoro di una procedura nomina quel dato, e una lettura in un parametro per riferimento o per uscita il dato
// di chi chiama, risalendo: così un caso del programma, o di una procedura, può dare una riga a un
// dato di lavoro di una procedura che la radice chiama. Una funzione non legge (lo dice il controllo statico, E042), quindi
// le letture altrove sono solo nelle procedure che la radice raggiunge coi salti.
//
// Per ogni procedura raggiunta, nell'ordine del progetto, i suoi dati di lavoro (e i parametri per valore) che ricevono una lettura: con un blocco di
// lettura, o come argomento di un parametro per riferimento o per uscita di una procedura che lo legge. L'editor dei casi
// li offre a gruppi, e rinominarne uno aggiorna le voci dei casi che lo nominano, se il nome non è anche di un altro dato
// che una lettura riceve dalla stessa radice (anche della radice stessa: `datiLettiNellaRadice`).

import { parole } from "../espressioni/analizzatore";
import type { Blocco, Funzione, Progetto } from "../progetto/modello";

export interface DatiLettiAltrove {
  /** L'`id` della procedura. */
  readonly funzione: string;
  readonly nome: string;
  /** I suoi dati di lavoro che una lettura riceve, nell'ordine dei dati. */
  readonly dati: readonly string[];
}

/** Il nome del dato di una destinazione o di un argomento (`v` in `v[i]`), se il testo comincia con un nome. */
const datoDi = (testo: string): string | undefined => {
  const p = parole(testo)?.[0];
  return p?.genere === "nome" ? p.testo : undefined;
};

function ogni(blocchi: readonly Blocco[], fa: (b: Blocco) => void): void {
  for (const b of blocchi) {
    fa(b);
    if (b.kind === "if") ogni([...b.then, ...b.else], fa);
    else if ("body" in b) ogni(b.body, fa);
  }
}

/** I nomi che ricevono una lettura nel corpo di `f`: con un blocco di lettura, o come argomento di un parametro per
 * riferimento o per uscita di una procedura che lo legge (`letti`, per nome della procedura). */
function lettiNelCorpo(f: Funzione, procedure: ReadonlyMap<string, Funzione>, letti: ReadonlyMap<string, ReadonlySet<string>>): string[] {
  const fuori: string[] = [];
  ogni(f.body, (b) => {
    if (b.kind === "read") {
      const d = datoDi(b.target);
      if (d !== undefined) fuori.push(d);
    } else if (b.kind === "call") {
      const g = procedure.get(b.callee);
      if (g === undefined) return;
      const parametri = g.data.filter((d) => d.parameter !== undefined);
      b.arguments.forEach((a, i) => {
        const par = parametri[i];
        const d = datoDi(a);
        if (par !== undefined && par.parameter !== "value" && letti.get(b.callee)!.has(par.name) && d !== undefined) fuori.push(d);
      });
    }
  });
  return fuori;
}

/** Per ogni procedura i nomi dei suoi dati che ricevono una lettura, direttamente o attraverso un salto (punto fisso: le
 * chiamate possono essere ricorsive). */
function lettiIn(procedure: ReadonlyMap<string, Funzione>): Map<string, Set<string>> {
  const letti = new Map([...procedure.keys()].map((n) => [n, new Set<string>()]));
  for (let cambiato = true; cambiato; ) {
    cambiato = false;
    for (const [n, f] of procedure) {
      const suoi = letti.get(n)!;
      for (const d of lettiNelCorpo(f, procedure, letti))
        if (!suoi.has(d)) {
          suoi.add(d);
          cambiato = true;
        }
    }
  }
  return letti;
}

/** Un dato a cui una voce può andare: di lavoro o un parametro per valore (la lettura lo chiede col suo nome; quella in un
 * parametro per riferimento o per uscita va al dato di chi chiama), non una costante. */
const daVoce = (d: { readonly parameter?: string; readonly constant?: boolean }) => (d.parameter === undefined || d.parameter === "value") && d.constant !== true;

/** I dati della radice stessa (l'`id` di una funzione) che una lettura riceve, nell'ordine dei dati: le voci dei suoi casi
 * con quei nomi possono essere sue. */
export function datiLettiNellaRadice(p: Progetto, radice: string): string[] {
  const partenza = p.functions.find((f) => f.id === radice);
  if (partenza === undefined) return [];
  const procedure = new Map(p.functions.filter((f) => f.kind === "procedure").map((f) => [f.name!, f]));
  const letti = new Set(lettiNelCorpo(partenza, procedure, lettiIn(procedure)));
  return partenza.data.filter((d) => daVoce(d) && letti.has(d.name)).map((d) => d.name);
}

/** I dati di lavoro delle procedure che la radice (l'`id` di una funzione) raggiunge coi salti e che una lettura riceve. */
export function datiLettiAltrove(p: Progetto, radice: string): DatiLettiAltrove[] {
  const procedure = new Map(p.functions.filter((f) => f.kind === "procedure").map((f) => [f.name!, f]));
  const partenza = p.functions.find((f) => f.id === radice);
  if (partenza === undefined) return [];
  const raggiunte = new Set<string>();
  const visita = (f: Funzione) =>
    ogni(f.body, (b) => {
      if (b.kind !== "call" || raggiunte.has(b.callee)) return;
      const g = procedure.get(b.callee);
      if (g === undefined) return;
      raggiunte.add(b.callee);
      visita(g);
    });
  visita(partenza);
  const letti = lettiIn(procedure);
  return p.functions.flatMap((f) => {
    if (f.kind !== "procedure" || f.id === radice || !raggiunte.has(f.name!)) return [];
    const dati = f.data.filter((d) => daVoce(d) && letti.get(f.name!)!.has(d.name)).map((d) => d.name);
    return dati.length === 0 ? [] : [{ funzione: f.id, nome: f.name!, dati }];
  });
}
