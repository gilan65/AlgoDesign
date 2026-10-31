// Lo pseudocodice di un progetto, nella lingua dell'interfaccia: le parole le dà chi chiama (il nucleo non
// conosce i dizionari), le espressioni si mostrano come nel disegno (gli operatori a parola tradotti per parola).
//
// La forma: i record, se ci sono, uno per sezione in testa («RECORD alunno», un campo per riga col tipo come lo dice la
// vista dei dati, «FINE RECORD»); le costanti comuni, se ci sono, in una sezione sopra il programma; poi il nome del programma, i dati
// (sempre la sezione, anche vuota) con il tipo come lo dice la vista dei dati, il valore iniziale nella
// dichiarazione e, in una colonna allineata, il ruolo o la parola «costante»; poi le regole, rientrate di
// quattro spazi per livello, e la fine. Il valore iniziale si scrive intero (un elenco con tutti gli elementi,
// il valore ripetuto come sta nel progetto): il codice dipende solo dal progetto e dalla lingua, mai dalle
// impostazioni che scelgono come mostrarlo nel disegno.
//
// Le procedure e le funzioni seguono il programma, nell'ordine del progetto, con la stessa forma: l'intestazione
// come nel disegno («PROCEDURA leggi_numero(rif numero: intero)», «FUNZIONE booleano ← valido(voto: intero)»), coi
// parametri e il loro tipo, *rif* davanti a quelli per riferimento e *out* davanti a quelli per uscita; le sezioni dei
// dati di lavoro e delle regole, sempre, anche vuote; la fine «FINE» per una procedura, «RESTITUISCE» col valore per una
// funzione. Il salto a una procedura è «CHIAMA nome(argomenti)», con la stessa parola davanti ai loro argomenti.
//
// La provenienza delle righe: una riga che porta il testo di un blocco ha quel blocco (la condizione di un `se`
// o di un `mentre` sta sulla riga d'apertura, quella di un `ripeti` sulla riga in fondo); le righe di struttura
// (`ALTRIMENTI`, le chiusure, `RIPETI`) non ne hanno; la dichiarazione di un dato ha il dato; la fine ha il
// blocco di fine (anche la riga «RESTITUISCE»). La riga d'apertura di un `per` o di un `per ogni` mostra tutte le fasi
// del ciclo, e così la riga della copia di un vettore col suo nome (`altri ← voti`), di una riga di una matrice e di una
// matrice (le fasi dei suoi due cicli); la copia di un record col suo nome
// (`b ← a`) è anche lei una riga, che vale per ogni campo copiato. Le intestazioni delle procedure e delle funzioni non hanno provenienza, come il nome del programma; la
// dichiarazione di un dato di una procedura o di una funzione ha anche la funzione.
//
// Lo pseudocodice non si esegue: non porta il commento sui comportamenti che il C non definisce, che è del
// Python e del C generati.

import type { Tetti } from "../controllo/controllo";
import { eUnaCopia, nomiDeiVettori, nomiDelleMatrici } from "../progetto/copia";
import type { Blocco, Dato, Funzione, Progetto, Ruolo } from "../progetto/modello";
import { genera, segnate, type Generato, type Riga } from "./forma";

/** Le parole dello pseudocodice in una lingua: le dà l'interfaccia. */
export interface ParoleDelloPseudocodice {
  /** La parola davanti al nome di un record, e quella che chiude la sua sezione. */
  readonly record: string;
  readonly fineRecord: string;
  readonly costantiComuni: string;
  readonly programma: string;
  readonly dati: string;
  readonly regole: string;
  readonly fine: string;
  readonly leggi: string;
  readonly scrivi: string;
  /** Il segno che chiude una scrittura che va a capo, con lo spazio davanti. */
  readonly aCapo: string;
  readonly se: string;
  readonly allora: string;
  readonly altrimenti: string;
  readonly fineSe: string;
  readonly mentre: string;
  readonly fineMentre: string;
  readonly ripeti: string;
  readonly per: string;
  readonly da: string;
  readonly a: string;
  readonly passo: string;
  readonly finePer: string;
  readonly perOgni: string;
  readonly in: string;
  readonly finePerOgni: string;
  readonly procedura: string;
  readonly funzione: string;
  readonly chiama: string;
  readonly restituisce: string;
  /** La parola davanti a un parametro, o a un argomento, per riferimento. */
  readonly rif: string;
  /** La parola davanti a un parametro, o a un argomento, per uscita. */
  readonly out: string;
  readonly costante: string;
  readonly ruoli: Readonly<Record<Ruolo, string>>;
  /** Il tipo di un dato come lo dice la vista dei dati (la forma di un vettore, la lunghezza di una stringa). */
  readonly tipo: (d: Dato) => string;
  /** Il valore ripetuto in ogni elemento di un vettore: un modello con `{valore}`. */
  readonly ogniElemento: string;
  /** Il testo di un'espressione come lo si mostra. */
  readonly espressione: (testo: string) => string;
}

const rientro = "    ";
const commento = "// ";

export function pseudocodice(p: Progetto, limiti: Tetti, parole: ParoleDelloPseudocodice): Generato {
  return genera(p, limiti, (q) => righeDelloPseudocodice(q, parole));
}

function righeDelloPseudocodice(p: Progetto, w: ParoleDelloPseudocodice): Riga[] {
  const e = w.espressione;
  const righe: Riga[] = [];
  const struttura = (testo: string) => righe.push({ testo });

  const valore = (d: Dato): string | undefined => {
    const v = d.initial;
    if (v === undefined) return undefined;
    if (typeof v === "string") return e(v);
    // Una matrice per righe: un elenco di elenchi.
    const elenco = (x: unknown): string => (Array.isArray(x) ? `{${x.map(elenco).join(", ")}}` : e(x as string));
    if (Array.isArray(v)) return elenco(v);
    // Il valore ripetuto: un letterale, o il record ripetuto in ogni record di una tabella (un letterale per campo).
    const ogni = (v as { readonly each: string | readonly string[] }).each;
    return w.ogniElemento.split("{valore}").join(typeof ogni === "string" ? e(ogni) : elenco(ogni));
  };

  const perNome = new Map(p.functions.flatMap((f) => (f.name === undefined ? [] : [[f.name, f] as const])));
  /** La parola davanti a un parametro, o al suo argomento, per riferimento o per uscita. */
  const parolaDelModo = (d: Dato) => (d.parameter === "reference" ? `${w.rif} ` : d.parameter === "out" ? `${w.out} ` : "");

  /** Le dichiarazioni di una sezione, con la colonna dei commenti allineata sulle righe che ne hanno uno; `funzione`,
   * la procedura o la funzione che possiede i dati. */
  const dichiara = (dati: readonly Dato[], conNota: boolean, funzione?: string) => {
    const voci = dati.map((d) => {
      const v = valore(d);
      const nota = !conNota ? "" : d.constant === true ? w.costante : d.role !== undefined ? w.ruoli[d.role] : "";
      return { d, testo: `${rientro}${d.name}: ${w.tipo(d)}${v === undefined ? "" : ` ← ${v}`}`, nota };
    });
    const larghezza = (t: string) => Array.from(t).length;
    const colonna = Math.max(0, ...voci.filter((x) => x.nota !== "").map((x) => larghezza(x.testo)));
    for (const { d, testo, nota } of voci)
      righe.push({ testo: nota === "" ? testo : `${testo}${" ".repeat(colonna - larghezza(testo))}  ${commento}${nota}`, dato: d.name, ...(funzione !== undefined ? { funzione } : {}) });
  };

  const sequenza = (bs: readonly Blocco[], livello: number) => {
    for (const b of bs) blocco(b, livello);
  };
  /** I vettori della funzione che si scrive: riconoscono la copia col nome. */
  let vettori: ReadonlySet<string> = new Set();
  let matrici: ReadonlySet<string> = new Set();
  const blocco = (b: Blocco, livello: number) => {
    const r = rientro.repeat(livello);
    const riga = (testo: string) => righe.push({ testo: r + testo, blocco: b.id });
    switch (b.kind) {
      case "assignment":
        // La copia di un vettore col suo nome resta una riga, che mostra tutte le fasi della copia.
        if (eUnaCopia(b, vettori, matrici)) righe.push({ testo: `${r}${e(b.target)} ← ${e(b.value)}`, blocco: b.id, fasi: ["inizio", "condizione", "elemento", "passo"] });
        else riga(`${e(b.target)} ← ${e(b.value)}`);
        return;
      case "read":
        riga(`${w.leggi} ${e(b.target)}`);
        return;
      case "write":
        riga(`${w.scrivi} ${b.values.map(e).join(", ")}${b.newline ? w.aCapo : ""}`);
        return;
      case "if":
        riga(`${w.se} ${e(b.condition)} ${w.allora}`);
        sequenza(b.then, livello + 1);
        if (b.else.length > 0) {
          struttura(r + w.altrimenti);
          sequenza(b.else, livello + 1);
        }
        struttura(r + w.fineSe);
        return;
      case "while":
        riga(`${w.mentre} ${e(b.condition)}`);
        sequenza(b.body, livello + 1);
        struttura(r + w.fineMentre);
        return;
      case "repeat":
        struttura(r + w.ripeti);
        sequenza(b.body, livello + 1);
        riga(`${w.mentre} ${e(b.condition)}`);
        return;
      case "for": {
        // Il passo 1 non si scrive.
        const passo = b.step === undefined || b.step === 1 ? "" : ` ${w.passo} ${b.step}`;
        const testo = `${r}${w.per} ${e(b.counter)} ${w.da} ${e(b.from)} ${w.a} ${e(b.to)}${passo}`;
        righe.push({ testo, blocco: b.id, fasi: ["inizio", "condizione", "passo"] });
        sequenza(b.body, livello + 1);
        struttura(r + w.finePer);
        return;
      }
      case "for_each":
        righe.push({ testo: `${r}${w.perOgni} ${e(b.item)} ${w.in} ${e(b.source)}`, blocco: b.id, fasi: ["inizio", "condizione", "elemento", "passo"] });
        sequenza(b.body, livello + 1);
        struttura(r + w.finePerOgni);
        return;
      case "call": {
        const parametri = perNome.get(b.callee)!.data.filter((d) => d.parameter !== undefined);
        const argomenti = b.arguments.map((a, k) => `${parolaDelModo(parametri[k]!)}${e(a)}`);
        riga(`${w.chiama} ${b.callee}(${argomenti.join(", ")})`);
        return;
      }
      case "comment":
        for (const t of b.text.split(/\r\n|\r|\n/)) riga(t === "" ? commento.trimEnd() : commento + t);
        return;
    }
  };

  for (const r of p.records ?? []) {
    struttura(`${w.record} ${r.name}`);
    for (const c of r.fields) struttura(`${rientro}${c.name}: ${w.tipo(c)}`);
    struttura(w.fineRecord);
    struttura("");
  }
  const comuni = p.shared_constants ?? [];
  if (comuni.length > 0) {
    struttura(w.costantiComuni);
    dichiara(comuni, false);
    struttura("");
  }
  const main = p.functions.find((f) => f.kind === "main")!;
  /** Le righe dalla `da` in poi sono della funzione: dall'intestazione alla fine. */
  const segna = (da: number, f: Funzione) => righe.splice(da, righe.length - da, ...segnate(righe.slice(da), f.id));
  const daMain = righe.length;
  // Un a capo nel nome (un file scritto a mano) non spezza la riga: ogni riga del codice è una riga del riquadro.
  struttura(`${w.programma} ${p.metadata.name.split(/\r\n|\r|\n/).join(" ")}`);
  sezioni(main);
  segna(daMain, main);
  for (const f of p.functions.filter((g) => g.kind !== "main")) {
    struttura("");
    const da = righe.length;
    const parametri = f.data.filter((d) => d.parameter !== undefined).map((d) => `${parolaDelModo(d)}${d.name}: ${w.tipo(d)}`);
    const firma = `${f.name}(${parametri.join(", ")})`;
    // Il risultato come un dato: con la dimensione di un vettore (e le colonne di una matrice), la lunghezza massima di una
    // stringa, il nome di un record.
    const risultato = (): Dato => ({
      name: f.name!,
      type: f.return_type!,
      ...(f.return_record !== undefined ? { record: f.return_record } : {}),
      ...(f.return_size !== undefined ? { size: f.return_size } : {}),
      ...(f.return_columns !== undefined ? { columns: f.return_columns } : {}),
      ...(f.return_max_length !== undefined ? { max_length: f.return_max_length } : {}),
    });
    struttura(f.kind === "function" ? `${w.funzione} ${w.tipo(risultato())} ← ${firma}` : `${w.procedura} ${firma}`);
    sezioni(f);
    segna(da, f);
  }
  return righe;

  /** I dati (di lavoro, per una procedura o una funzione), le regole e la fine. */
  function sezioni(f: Funzione) {
    struttura("");
    struttura(w.dati);
    dichiara(
      f.data.filter((d) => d.parameter === undefined),
      true,
      f.kind === "main" ? undefined : f.id,
    );
    struttura("");
    struttura(w.regole);
    vettori = nomiDeiVettori([...comuni, ...f.data]);
    matrici = nomiDelleMatrici([...comuni, ...f.data]);
    sequenza(f.body, 1);
    righe.push({ testo: f.kind === "function" ? `${w.restituisce} ${e(f.end.return_value!)}` : w.fine, blocco: f.end.id });
  }
}
