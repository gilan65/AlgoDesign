// La provenienza delle righe coi cicli `per` e `per ogni`, per le prove dei generatori sul corpus della tappa 2:
// ogni blocco ha le sue righe nell'ordine dell'albero, le righe di un ciclo (e solo quelle) hanno le fasi, e ogni fase
// degli eventi di un ciclo ha almeno una riga che la mostra (quelle che il ciclo non ha, nessuna). Le prove dicono i
// difetti; qui non si asserisce nulla.
import { righeDi, type Generato, type Riga } from "../../core/genera/forma";
import type { FaseDelCiclo } from "../../core/interprete/interprete";
import type { Blocco, Progetto } from "../../core/progetto/modello";

/** Da dove viene una riga: `""` nessuna provenienza, `=nome` un dato, `b<N>` un blocco, e dopo la barra le fasi. */
export const provenienzaConLeFasi = (x: Riga): string =>
  x.blocco === undefined ? (x.dato === undefined ? "" : `=${x.dato}`) : x.fasi === undefined ? x.blocco : `${x.blocco}/${x.fasi.join("+")}`;

/** Le fasi degli eventi di ciascun ciclo: le azioni del ciclo prima delle quali l'interprete si ferma. */
const fasiDegliEventi: Readonly<Record<"for" | "for_each", readonly FaseDelCiclo[]>> = {
  for: ["inizio", "condizione", "passo"],
  for_each: ["inizio", "condizione", "elemento", "passo"],
};
const tutteLeFasi: readonly FaseDelCiclo[] = ["inizio", "condizione", "passo", "elemento"];

/** I file della tappa 2 che non si generano: hanno solo l'errore statico atteso. */
export const rifiutatiDellaTappa2: readonly string[] = [
  "per-contatore-annidato.algo: errori-statici",
  "per-contatore-assegnato.algo: errori-statici",
  "per-passo-zero.algo: errori-statici",
];

export interface EsitoDelCorpus {
  readonly difetti: string[];
  /** I file generati, e quelli che il generatore rifiuta col perché. */
  readonly generati: number;
  readonly rifiutati: string[];
  readonly blocchi: number;
  readonly cicli: number;
}

export function provaIlCorpusDeiCicli(corpus: readonly { f: string; p: Progetto }[], genera: (p: Progetto) => Generato): EsitoDelCorpus {
  const difetti: string[] = [];
  const rifiutati: string[] = [];
  let generati = 0;
  let blocchi = 0;
  let cicli = 0;
  for (const { f, p } of corpus) {
    const g = genera(p);
    if (!g.generato) {
      rifiutati.push(`${f}: ${g.perche}`);
      continue;
    }
    generati++;
    const r: readonly Riga[] = g.righe;
    const main = p.functions.find((x) => x.kind === "main")!;
    const ordine: string[] = [];
    const generi = new Map<string, Blocco["kind"]>();
    const visita = (bs: readonly Blocco[]) => {
      for (const b of bs) {
        generi.set(b.id, b.kind);
        // la riga di un `ripeti` è quella della condizione, in fondo al corpo
        if (b.kind !== "repeat") ordine.push(b.id);
        if (b.kind === "if") visita([...b.then, ...b.else]);
        if (b.kind === "while" || b.kind === "repeat" || b.kind === "for" || b.kind === "for_each") visita(b.body);
        if (b.kind === "repeat") ordine.push(b.id);
      }
    };
    visita(main.body);
    const visti = [...new Set(r.filter((x) => x.blocco !== undefined && x.blocco !== main.end.id).map((x) => x.blocco!))];
    if (JSON.stringify(visti) !== JSON.stringify(ordine)) difetti.push(`${f}: i blocchi delle righe ${JSON.stringify(visti)}, quelli dell'albero ${JSON.stringify(ordine)}`);
    for (const x of r) {
      const genere = x.blocco === undefined ? undefined : generi.get(x.blocco);
      const delCiclo = genere === "for" || genere === "for_each";
      if (x.blocco !== undefined && x.dato !== undefined) difetti.push(`${f}: «${x.testo}» ha blocco e dato`);
      if (delCiclo !== (x.fasi !== undefined)) difetti.push(`${f}: «${x.testo}» (${provenienzaConLeFasi(x)}) ${delCiclo ? "è di un ciclo e non ha le fasi" : "ha le fasi e non è di un ciclo"}`);
      if (delCiclo && x.fasi!.some((k) => !fasiDegliEventi[genere as "for" | "for_each"].includes(k))) difetti.push(`${f}: «${x.testo}» ha una fase che il suo ciclo non ha: ${x.fasi!.join("+")}`);
    }
    for (const [id, genere] of generi) {
      if (genere !== "for" && genere !== "for_each") continue;
      cicli++;
      for (const fase of tutteLeFasi) {
        const n = righeDi(r, { blocco: id, fase }).length;
        const attesa = fasiDegliEventi[genere].includes(fase);
        if (attesa ? n === 0 : n > 0) difetti.push(`${f}: il ciclo ${id} ha ${n} righe per la fase ${fase}`);
      }
    }
    blocchi += ordine.length;
  }
  return { difetti, generati, rifiutati, blocchi, cicli };
}
