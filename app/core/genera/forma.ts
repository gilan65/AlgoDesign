// La forma comune dei generatori: dal progetto un elenco di righe, ognuna col suo testo e con ciò da cui viene
// (un blocco dell'albero, o un dato per la riga che lo dichiara col suo valore iniziale). Testo e provenienza
// nascono insieme dallo stesso albero: chi cerca il blocco di una riga del codice generato (l'errore di un
// programma generato, la riga corrente nella finestra) la legge qui, non la ricalcola.
//
// Un progetto si genera solo se il controllo statico lo lascia eseguire: con un errore statico, o con un
// costrutto delle tappe successive, il risultato dice perché e non c'è un testo a metà. Gli avvisi non
// fermano la generazione, come non fermano l'esecuzione.
//
// Una riga di un ciclo `per` o `per ogni` porta anche le fasi del ciclo che mostra (quelle degli eventi del nucleo):
// la riga d'apertura di un `for` del C le mostra tutte, il Python ha una riga per fase, e le righe dell'indice
// nascosto, dove il passo non si ferma, nessuna.
//
// Il programma di prova di un caso di una procedura o di una funzione eseguita da sola legge i
// parametri come letture, nell'ordine: `parametriDelCaso` dice come, dalle voci del caso, uguale per ogni generatore.

import { controlla, type Tetti } from "../controllo/controllo";
import type { OperatoreUnario } from "../espressioni/analizzatore";
import type { FaseDelCiclo } from "../interprete/interprete";
import type { CasoDiUnaFunzione, Dato, Funzione, Progetto } from "../progetto/modello";

/** Una riga del codice generato. Al più una provenienza: il blocco, o il dato di una dichiarazione (con la
 * funzione che lo possiede, se non è il programma principale: due funzioni possono avere un dato con lo stesso nome);
 * nessuna per le righe di struttura (l'intestazione, la chiusura di un ramo o di un ciclo, le righe vuote). Le righe di
 * un ciclo `per` o `per ogni`, e solo quelle, hanno le fasi. `nellaFunzione` è la funzione del cui pezzo il generatore
 * fa la riga, con ogni riga di struttura: manca sulla testa del file, sulle righe fra due funzioni e su ciò che viene
 * dopo l'ultima (le dà `partiDelCodice`, in `stampato.ts`). */
export interface Riga {
  readonly testo: string;
  readonly blocco?: string;
  readonly dato?: string;
  readonly funzione?: string;
  readonly fasi?: readonly FaseDelCiclo[];
  readonly nellaFunzione?: string;
}

/** Le righe di una funzione, segnate come sue. */
export const segnate = (righe: readonly Riga[], funzione: string): Riga[] => righe.map((r) => ({ ...r, nellaFunzione: funzione }));

/** Le specie di ciò che un linguaggio con meno costrutti del flowchart non sa scrivere (oggi «Accademico»): i tipi, la
 * lettura, i modi dei parametri, i letterali, gli operatori, un nome che è una parola del linguaggio, una condizione
 * usata come valore. I testi per chi legge sono dell'interfaccia. */
export const specieDelleMancanze = [
  "reale", "carattere", "stringa", "lettura", "rif", "out", "letterale-reale", "letterale-carattere", "letterale-stringa",
  "potenza", "radice", "valore-assoluto", "arrotondamento", "conversione", "lunghezza", "pi", "parola-del-linguaggio",
  "condizione-come-valore",
] as const;
export type SpecieDellaMancanza = (typeof specieDelleMancanze)[number];

/** Una cosa che manca, col suo posto come quello di una riga: il blocco, o il dato con la funzione che lo possiede (né
 * l'uno né l'altra per un dato del programma principale o una costante comune), o la sola funzione (il nome, il
 * risultato). Le specie che sono un operatore dicono anche quale. */
export interface Mancanza {
  readonly specie: SpecieDellaMancanza;
  readonly operatore?: OperatoreUnario | "raised_to";
  readonly blocco?: string;
  readonly dato?: string;
  readonly funzione?: string;
}

export type Generato =
  | { readonly generato: true; readonly righe: readonly Riga[] }
  | { readonly generato: false; readonly perche: "fuori-tappa" | "errori-statici" }
  | { readonly generato: false; readonly perche: "non-ci-sta"; readonly mancanze: readonly Mancanza[] };

/** Il codice di un progetto, se il controllo statico lo lascia eseguire. `limiti` sono i tetti delle impostazioni,
 * come per il controllo. Un linguaggio con meno costrutti dà con `manca` ciò che non sa scrivere: dopo gli errori
 * statici, e tutto insieme. */
export function genera(p: Progetto, limiti: Tetti, scrivi: (p: Progetto) => readonly Riga[], manca?: (p: Progetto) => readonly Mancanza[]): Generato {
  const c = controlla(p, limiti);
  if (c.fuoriTappa) return { generato: false, perche: "fuori-tappa" };
  if (c.errori.length > 0) return { generato: false, perche: "errori-statici" };
  const mancanze = manca?.(p) ?? [];
  if (mancanze.length > 0) return { generato: false, perche: "non-ci-sta", mancanze };
  return { generato: true, righe: scrivi(p) };
}

/** I numeri (da 0) delle righe che vengono da quel blocco, o dalla dichiarazione di quel dato (della funzione data, o
 * del programma principale): la stessa provenienza che legge chi va dalla riga al blocco, letta nell'altro verso. Un
 * blocco può averne più d'una (l'indice calcolato prima del valore, una scrittura del C, un ciclo), o nessuna (la fine,
 * nel Python). Con la fase di un evento di un ciclo, solo le righe che la mostrano. */
export function righeDi(
  righe: readonly Riga[],
  da: { readonly blocco: string; readonly fase?: FaseDelCiclo } | { readonly dato: string; readonly funzione?: string },
): number[] {
  const fase = "blocco" in da ? da.fase : undefined;
  return righe.flatMap((r, i) =>
    ("blocco" in da ? r.blocco === da.blocco && (fase === undefined || r.fasi?.includes(fase) === true) : r.dato === da.dato && r.funzione === da.funzione) ? [i] : [],
  );
}

/** Il testo intero: le righe, ognuna chiusa dall'a capo. */
export function testoDelCodice(righe: readonly Riga[]): string {
  return righe.map((r) => `${r.testo}\n`).join("");
}

/** Un parametro come lo legge il programma di prova: una lettura per elemento (`riga`) o nessun valore (`nessuno`),
 * oppure, con `ognuno`, una sola per tutti gli elementi di un vettore. */
export interface ParametroDiProva {
  readonly dato: Dato;
  readonly elementi: readonly ("riga" | "nessuno")[];
  readonly ognuno: boolean;
}

/** Come il programma di prova di un caso di `f` legge i parametri, e le righe dell'input (le voci col testo, in ordine);
 * oppure perché non può: una voce che l'esecuzione non accetta (senza testo, per un parametro o per una lettura: un
 * parametro per riferimento vuole il valore; con `each` fuori dal primo elemento di un vettore, col nome di un altro
 * dato) si ferma lì con un errore, che un programma che legge righe non sa dare. Un parametro per uscita non si legge e
 * non ha voci: parte senza valore (`nessuno` per ogni elemento). Le voci che mancano si leggono lo stesso: l'input
 * finito ferma il programma come l'esecuzione. */
export function parametriDelCaso(f: Funzione, caso: CasoDiUnaFunzione): { parametri: ParametroDiProva[]; righe: string[] } | { problema: string } {
  const parametri: ParametroDiProva[] = [];
  let k = 0;
  for (const d of f.data.filter((x) => x.parameter !== undefined)) {
    if (d.parameter === "out") {
      parametri.push({ dato: d, elementi: Array.from({ length: d.size ?? 1 }, () => "nessuno" as const), ognuno: false });
      continue;
    }
    const elementi: ("riga" | "nessuno")[] = [];
    let ognuno = false;
    for (let i = 0; i < (d.size ?? 1); i++) {
      const voce = caso.inputs[k];
      if (voce === undefined) {
        elementi.push("riga");
        continue;
      }
      k++;
      if (voce.data !== d.name) return { problema: `la voce ${k} nomina ${voce.data}, e il parametro è ${d.name}` };
      if (voce.text === undefined) return { problema: `la voce ${k} non ha un testo, e ${d.name} lo vuole` };
      if (voce.each === true) {
        if (d.size === undefined || i > 0) return { problema: `la voce ${k} è per ogni elemento, e non è la prima di un vettore` };
        ognuno = true;
        elementi.push("riga");
        break;
      }
      elementi.push("riga");
    }
    parametri.push({ dato: d, elementi, ognuno });
  }
  const dopo = caso.inputs.slice(k).findIndex((v) => v.text === undefined || v.each === true);
  if (dopo >= 0) return { problema: `la voce ${k + dopo + 1} va a una lettura, e non è una riga` };
  return { parametri, righe: caso.inputs.flatMap((v) => (v.text === undefined ? [] : [v.text])) };
}
