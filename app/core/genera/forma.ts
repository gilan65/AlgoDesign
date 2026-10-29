// La forma comune dei generatori: dal progetto un elenco di righe, ognuna col suo testo e con ciò da cui viene
// (un blocco dell'albero, o un dato per la riga che lo dichiara col suo valore iniziale). Testo e provenienza
// nascono insieme dallo stesso albero: chi cerca il blocco di una riga del codice generato (l'errore di un
// programma generato, la riga corrente nella finestra) la legge qui, non la ricalcola.
//
// Un progetto si genera solo se il controllo statico lo lascia eseguire: con un errore statico, o con un
// costrutto delle tappe successive, il risultato dice perché e non c'è un testo a metà. Gli avvisi non
// fermano la generazione, come non fermano l'esecuzione. Le tabelle (i vettori di record) si eseguono ma non si traducono
// ancora: un progetto che le usa, senza errori statici, è fuori tappa qui.
//
// Una riga di un ciclo `per` o `per ogni` porta anche le fasi del ciclo che mostra (quelle degli eventi del nucleo):
// la riga d'apertura di un `for` del C le mostra tutte, il Python ha una riga per fase, e le righe dell'indice
// nascosto, dove il passo non si ferma, nessuna. Una riga della copia di un record col suo nome, scritta campo per campo,
// porta il campo che copia (la sua posizione, da 0), come l'evento del nucleo: la pausa su quel campo accende lei. Le righe
// della copia di una matrice col suo nome, due cicli, dicono se sono del ciclo delle colonne (`interno`), come gli eventi.
//
// Il programma di prova di un caso di una procedura o di una funzione eseguita da sola legge i
// parametri come letture, nell'ordine: `parametriDelCaso` dice come, dalle voci del caso, uguale per ogni generatore.

import { controlla, type Tetti } from "../controllo/controllo";
import type { OperatoreUnario } from "../espressioni/analizzatore";
import type { FaseDelCiclo } from "../interprete/interprete";
import { usaLeTabelle, type CasoDiUnaFunzione, type Dato, type DefinizioneDelRecord, type Funzione, type Progetto } from "../progetto/modello";

/** Una riga del codice generato. Al più una provenienza: il blocco, o il dato di una dichiarazione (con la
 * funzione che lo possiede, se non è il programma principale: due funzioni possono avere un dato con lo stesso nome);
 * nessuna per le righe di struttura (l'intestazione, la chiusura di un ramo o di un ciclo, le righe vuote). Le righe di
 * un ciclo `per` o `per ogni`, e solo quelle, hanno le fasi. `nellaFunzione` è la funzione del cui pezzo il generatore
 * fa la riga, con ogni riga di struttura: manca sulla testa del file, sulle righe fra due funzioni e su ciò che viene
 * dopo l'ultima (le dà `partiDelCodice`, in `stampato.ts`). `campo` è il campo che copia una riga della copia di un
 * record scritta campo per campo. `interno` dice, sulle righe della copia di una matrice scritta coi due cicli, se la
 * riga è del ciclo delle colonne (vero) o di quello delle righe (falso); una riga senza vale per gli uni e per gli altri. */
export interface Riga {
  readonly testo: string;
  readonly blocco?: string;
  readonly dato?: string;
  readonly funzione?: string;
  readonly fasi?: readonly FaseDelCiclo[];
  readonly campo?: number;
  readonly interno?: boolean;
  readonly nellaFunzione?: string;
}

/** Le righe di una funzione, segnate come sue. */
export const segnate = (righe: readonly Riga[], funzione: string): Riga[] => righe.map((r) => ({ ...r, nellaFunzione: funzione }));

/** Le specie di ciò che un linguaggio con meno costrutti del flowchart non sa scrivere (oggi «Accademico»): i tipi (il
 * record e la matrice compresi), la lettura, i modi dei parametri, i letterali, gli operatori, un nome che è una parola del linguaggio, una condizione
 * usata come valore. I testi per chi legge sono dell'interfaccia. */
export const specieDelleMancanze = [
  "reale", "carattere", "stringa", "record", "matrice", "lettura", "rif", "out", "letterale-reale", "letterale-carattere", "letterale-stringa",
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
  if (usaLeTabelle(p)) return { generato: false, perche: "fuori-tappa" };
  const mancanze = manca?.(p) ?? [];
  if (mancanze.length > 0) return { generato: false, perche: "non-ci-sta", mancanze };
  return { generato: true, righe: scrivi(p) };
}

/** I numeri (da 0) delle righe che vengono da quel blocco, o dalla dichiarazione di quel dato (della funzione data, o
 * del programma principale): la stessa provenienza che legge chi va dalla riga al blocco, letta nell'altro verso. Un
 * blocco può averne più d'una (l'indice calcolato prima del valore, una scrittura del C, un ciclo), o nessuna (la fine,
 * nel Python). Con la fase di un evento di un ciclo, solo le righe che la mostrano, e del suo ciclo (`interno`, quello delle
 * colonne della copia di una matrice); col campo di un evento della copia di un record, la riga di quel campo (una riga
 * che li copia tutti, senza campo, vale per ognuno). */
export function righeDi(
  righe: readonly Riga[],
  da: { readonly blocco: string; readonly fase?: FaseDelCiclo; readonly campo?: number; readonly interno?: true } | { readonly dato: string; readonly funzione?: string },
): number[] {
  const fase = "blocco" in da ? da.fase : undefined;
  const campo = "blocco" in da ? da.campo : undefined;
  const interno = "blocco" in da && da.interno === true;
  return righe.flatMap((r, i) =>
    ("blocco" in da
      ? r.blocco === da.blocco && (fase === undefined || (r.fasi?.includes(fase) === true && (r.interno === undefined || r.interno === interno))) && (campo === undefined || r.campo === undefined || r.campo === campo)
      : r.dato === da.dato && r.funzione === da.funzione)
      ? [i]
      : [],
  );
}

/** I controlli `elementi_diversi` di un salto per gli argomenti per riferimento che sono elementi o righe dello stesso dato,
 * con almeno un indice calcolato: gli indici di ognuno, già come li usa la chiamata (numeri o nomi). Gli elementi di un
 * vettore in un controllo solo; in una matrice gli elementi col loro posto riga dopo riga (`i * colonne + j`), le righe fra
 * loro, e ogni riga con la riga di ogni elemento (una riga contiene i suoi elementi). Un controllo fra soli numeri non
 * serve: lo stesso numero è un errore statico. */
export function controlliDegliElementi(indici: readonly (readonly string[])[], dato: Pick<Dato, "columns">): string[][] {
  const numero = (x: string) => /^\d+$/.test(x);
  const servono = (gruppo: readonly string[][]) => gruppo.filter((c) => c.length > 1 && !c.every(numero));
  if (dato.columns === undefined) return servono([indici.map((x) => x[0]!)]);
  const colonne = dato.columns;
  const elementi = indici.filter((x) => x.length === 2);
  const righe = indici.filter((x) => x.length === 1).map((x) => x[0]!);
  const posto = ([i, j]: readonly string[]) => (numero(i!) && numero(j!) ? String(Number(i) * colonne + Number(j)) : `${i} * ${colonne} + ${j}`);
  return servono([elementi.map(posto), righe, ...righe.flatMap((r) => elementi.map((e) => [r, e[0]!]))]);
}

/** Le posizioni degli elementi di un vettore (`[0]`, `[1]`) o di una matrice, riga dopo riga (`[0][0]`, `[0][1]`), come le
 * scrive l'esecuzione. */
export const posizioni = (size: number, columns: number | undefined): string[] =>
  [...Array(size).keys()].flatMap((i) => (columns === undefined ? [`[${i}]`] : [...Array(columns).keys()].map((j) => `[${i}][${j}]`)));

/** Il testo intero: le righe, ognuna chiusa dall'a capo. */
export function testoDelCodice(righe: readonly Riga[]): string {
  return righe.map((r) => `${r.testo}\n`).join("");
}

/** Un parametro come lo legge il programma di prova: una lettura per elemento, o per campo di un record (`riga`), o
 * nessun valore (`nessuno`), oppure, con `ognuno`, una sola per tutti gli elementi di un vettore. */
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
 * finito ferma il programma come l'esecuzione. Un record ha una voce per campo, nell'ordine dei campi (`records`, quelli
 * del progetto), mai `each`; una matrice una per elemento, riga dopo riga, o `each` sulla prima. */
export function parametriDelCaso(
  f: Funzione,
  caso: CasoDiUnaFunzione,
  records: readonly DefinizioneDelRecord[] = [],
): { parametri: ParametroDiProva[]; righe: string[] } | { problema: string } {
  const parametri: ParametroDiProva[] = [];
  let k = 0;
  const pezzi = (d: Dato) => (d.type === "record" ? (records.find((r) => r.name === d.record)?.fields.length ?? 0) : (d.size ?? 1) * (d.columns ?? 1));
  for (const d of f.data.filter((x) => x.parameter !== undefined)) {
    if (d.parameter === "out") {
      parametri.push({ dato: d, elementi: Array.from({ length: pezzi(d) }, () => "nessuno" as const), ognuno: false });
      continue;
    }
    const elementi: ("riga" | "nessuno")[] = [];
    let ognuno = false;
    for (let i = 0; i < pezzi(d); i++) {
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
