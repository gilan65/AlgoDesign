// Il flowchart come lo legge chi non lo guarda: una sequenza di voci nell'ordine del flusso, costruita
// dall'albero della funzione (mai dal disegno). Ogni sequenza di blocchi è un gruppo col suo nome (il
// programma principale, il ramo Vero o Falso di un `se`, il corpo di un ciclo); dentro, i punti di
// inserimento e i blocchi alternati, e dopo un blocco che ne contiene altri i suoi rami. Il corpo di un
// `ripeti` viene prima del suo rombo, come nel flusso. Un ciclo `per` o `per ogni` è una voce col suo corpo,
// come un `mentre`, in ogni forma del disegno: i blocchi che il riquadro aggiunge non sono voci.
//
// Il nome di un blocco dice il genere e il contenuto, con gli operatori a parola nella lingua
// dell'interfaccia; quello di un punto dice la sequenza e il posto, contato da 1. Due blocchi uguali hanno
// lo stesso nome: il posto nella struttura li distingue.
//
// Con la Lettura con la domanda (un'opzione dell'app), una Scrittura che il disegno mostra come la domanda della Lettura
// che la segue non è una voce: la Lettura dice anche la domanda, e fra le due non c'è un punto.
//
// Inizio e fine non sono blocchi: non si selezionano e non si cancellano. La fine di una funzione è però una voce sua,
// in fondo alla sequenza: dice ciò che restituisce, e si apre per scriverlo.
//
// I valori iniziali dei dati, se il flowchart li mostra, sono voci della sequenza principale prima del suo primo
// punto, nell'ordine del disegno (le costanti comuni prima): si scelgono, ma non sono blocchi dell'albero. Li
// identifica la riga del loro dato nella vista dei dati (`chiaveDellaRiga`), mai un `id` (un file scritto a mano può
// dare a un blocco qualunque `id`); il nome per gli ausili è quello del blocco, col testo dal nucleo.

import type { Coppia } from "../../core/disegno/domanda";
import { funzioneChiamata, partiDellaFase, testoDelValoreIniziale, type FormeDeiCicli, type TestiDelDisegno, type ValoreRipetuto } from "../../core/disegno/impaginazione";
import type { FaseDelCiclo } from "../../core/interprete/interprete";
import type { GenereDellaTappa, Posto, Ramo } from "../../core/modifica/operazioni";
import { livelliDeiPerOgni, type Blocco, type Dato, type Funzione } from "../../core/progetto/modello";
import type { Dizionario } from "../../i18n/it";
import { riempi } from "../../i18n/lingue";
import { chiaveDellaRiga } from "../dati/VistaDati";

export type Voce =
  | { readonly genere: "punto"; readonly posto: Posto; readonly nome: string }
  | { readonly genere: "blocco"; readonly id: string; readonly nome: string }
  /** Il valore iniziale di un dato: la chiave della riga del dato e il suo nome. */
  | { readonly genere: "valore"; readonly chiave: string; readonly dato: string; readonly nome: string }
  /** La fine di una funzione, che dice ciò che restituisce (l'`id` del blocco di fine): si apre per scriverlo. */
  | { readonly genere: "restituisce"; readonly id: string; readonly nome: string }
  | { readonly genere: "sequenza"; readonly nome: string; readonly voci: readonly Voce[] };

/** La chiave di un posto: la stessa per il punto disegnato e per la sua voce. */
export const chiaveDelPosto = (p: Posto): string => `${p.contenitore}/${p.ramo}/${p.indice}`;

/** Il posto del punto con quella chiave, cercato nella struttura. */
export function trovaPosto(voce: Voce, chiave: string): Posto | undefined {
  if (voce.genere === "punto") return chiaveDelPosto(voce.posto) === chiave ? voce.posto : undefined;
  if (voce.genere !== "sequenza") return undefined;
  for (const v of voce.voci) {
    const trovato = trovaPosto(v, chiave);
    if (trovato) return trovato;
  }
  return undefined;
}

/** Il contenuto di un blocco come lo si legge, senza la parola che il disegno gli mette davanti. Un salto dice *rif* davanti
 * agli argomenti che la procedura chiamata (fra le `funzioni` del progetto) riceve per riferimento, come il disegno. */
function contenuto(b: Blocco, testi: Dizionario, espressione: (t: string) => string, funzioni: readonly Funzione[]): string {
  switch (b.kind) {
    case "assignment":
      return b.target === "" && b.value === "" ? "" : `${espressione(b.target)} ← ${espressione(b.value)}`;
    case "read":
      return espressione(b.target);
    case "write":
      return b.values.filter((v) => v !== "").map(espressione).join(", ");
    case "if":
    case "while":
    case "repeat":
      return espressione(b.condition);
    case "comment":
      return b.text;
    case "for": {
      if (b.counter === "" && b.from === "" && b.to === "") return "";
      const conPasso = b.step !== undefined && b.step !== 1;
      const valori = { contatore: espressione(b.counter), da: espressione(b.from), a: espressione(b.to), passo: String(b.step) };
      return riempi(conPasso ? testi.contenutoPerConPasso : testi.contenutoPer, valori);
    }
    case "for_each":
      return b.item === "" && b.source === "" ? "" : riempi(testi.contenutoPerOgni, { elemento: espressione(b.item), sorgente: espressione(b.source) });
    case "call": {
      if (b.callee === "" && b.arguments.length === 0) return "";
      const parametri = funzioneChiamata(funzioni, b.callee)?.data.filter((d) => d.parameter !== undefined) ?? [];
      const parola = (i: number) => (parametri[i]?.parameter === "reference" ? `${testi.disegnoRif} ` : parametri[i]?.parameter === "out" ? `${testi.disegnoOut} ` : "");
      const argomenti = b.arguments.map((a, i) => `${parola(i)}${espressione(a)}`);
      return `${b.callee}(${argomenti.join(", ")})`;
    }
  }
}

/** La voce del dizionario col nome di ogni genere che l'editor inserisce, nell'elenco del «+»: quelli della tappa 1, i due
 * cicli e il salto, che lì si chiama come ciò che chiama. */
export const nomiDeiGeneri: Readonly<Record<GenereDellaTappa, keyof Dizionario>> = {
  assignment: "bloccoAssegnazione",
  read: "bloccoLettura",
  write: "bloccoScrittura",
  if: "bloccoSe",
  while: "bloccoMentre",
  repeat: "bloccoRipeti",
  for: "bloccoPer",
  for_each: "bloccoPerOgni",
  call: "bloccoProcedura",
  comment: "bloccoCommento",
};

const genereDelBlocco = (b: Blocco, testi: Dizionario): string => testi[nomiDeiGeneri[b.kind]];

/** Il nome di un blocco: il genere e il contenuto. `funzioni`: quelle del progetto, perché un salto dica *rif*. */
export function nomeDelBlocco(b: Blocco, testi: Dizionario, espressione: (t: string) => string, funzioni: readonly Funzione[] = []): string {
  const testo = contenuto(b, testi, espressione, funzioni).trim();
  return riempi(testi.nomeDelBlocco, { genere: genereDelBlocco(b, testi), testo: testo === "" ? testi.bloccoSenzaTesto : testo });
}

/** Il nome di una Lettura con la domanda: il genere, il dato e la domanda, coi valori come nella Scrittura. */
export function nomeDellaLetturaConDomanda(b: Blocco, coppia: Coppia, testi: Dizionario, espressione: (t: string) => string): string {
  const dato = contenuto(b, testi, espressione, []).trim();
  return riempi(testi.nomeDellaLetturaConDomanda, {
    genere: genereDelBlocco(b, testi),
    testo: dato === "" ? testi.bloccoSenzaTesto : dato,
    domanda: coppia.domanda.values.filter((v) => v !== "").map(espressione).join(", "),
  });
}

/** Il nome di una parte di un ciclo `per` o `per ogni` (una fase dell'evento), nella pausa: il genere del ciclo e il testo
 * del blocco che il riquadro aperto mostra per quella fase, dal nucleo; nessuno se il ciclo è chiuso (vale il nome del
 * ciclo). */
export function nomeDellaFase(
  b: Blocco,
  fase: FaseDelCiclo,
  forme: FormeDeiCicli,
  testi: Dizionario,
  disegno: TestiDelDisegno,
  funzione: Funzione,
  /** Le costanti comuni, nel programma principale. */
  comuni: readonly Dato[],
): string | undefined {
  if (b.kind !== "for" && b.kind !== "for_each") return undefined;
  const parti = partiDellaFase(b, fase, forme, disegno, livelliDeiPerOgni(funzione.body).get(b.id) ?? 1, [...funzione.data, ...comuni]);
  return parti && riempi(testi.nomeDelBlocco, { genere: genereDelBlocco(b, testi), testo: parti.map((q) => q.testo).join("") });
}

/** Il nome del blocco del valore iniziale di un dato, un'assegnazione: il testo è quello del blocco, dal nucleo. */
export function nomeDelValoreIniziale(d: Dato, testi: Dizionario, disegno: TestiDelDisegno, ripetuto: ValoreRipetuto): string {
  return riempi(testi.nomeDelBlocco, { genere: testi.bloccoAssegnazione, testo: testoDelValoreIniziale(d, disegno, ripetuto) ?? testi.bloccoSenzaTesto });
}

/** I valori iniziali che il flowchart mostra: le costanti comuni (nel programma principale), i testi del disegno e il
 * modo del valore ripetuto, gli stessi dell'impaginazione. */
export interface ValoriMostrati {
  readonly comuni: readonly Dato[];
  readonly disegno: TestiDelDisegno;
  readonly ripetuto: ValoreRipetuto;
}

/** Le voci dei valori iniziali, nell'ordine del disegno: costanti comuni, poi i dati della funzione. */
export function vociDeiValori(funzione: Funzione, testi: Dizionario, valori: ValoriMostrati): Voce[] {
  const di = (dati: readonly Dato[], comune: boolean): Voce[] =>
    dati.flatMap((d, indice) =>
      d.initial === undefined ? [] : [{ genere: "valore" as const, chiave: chiaveDellaRiga(comune, indice), dato: d.name, nome: nomeDelValoreIniziale(d, testi, valori.disegno, valori.ripetuto) }],
    );
  return [...di(valori.comuni, true), ...di(funzione.data, false)];
}

/** La struttura del flowchart di una funzione: la sequenza principale con tutto ciò che contiene, e prima del suo primo
 * punto i valori iniziali, se il flowchart li mostra (`valori`). */
export function strutturaAccessibile(
  funzione: Funzione,
  testi: Dizionario,
  espressione: (t: string) => string = (t) => t,
  valori?: ValoriMostrati,
  funzioni: readonly Funzione[] = [],
  /** Le Letture che mostrano la domanda (per `id` della Lettura): la Scrittura non è una voce, e fra le due non c'è un
   * punto; i punti si contano come il disegno li mostra, col posto della sequenza vera. */
  domande: ReadonlyMap<string, Coppia> = new Map(),
): Voce {
  function sequenza(tutti: readonly Blocco[], contenitore: string, ramo: Ramo, nome: string): Voce {
    // I blocchi mostrati col loro indice vero: la Scrittura di una coppia sparisce nella Lettura che la segue.
    const mostrati = tutti.flatMap((b, indice) => (domande.get(tutti[indice + 1]?.id ?? "")?.scrittura === b.id ? [] : [{ b, indice }]));
    const totale = mostrati.length + 1;
    const punto = (k: number, indice: number): Voce => ({
      genere: "punto",
      posto: { contenitore, ramo, indice },
      nome: riempi(testi.nomeDelPunto, { sequenza: nome, n: String(k + 1), totale: String(totale) }),
    });
    const voci: Voce[] = [];
    mostrati.forEach(({ b, indice }, k) => {
      const coppia = domande.get(b.id);
      voci.push(punto(k, coppia === undefined ? indice : indice - 1));
      const proprio = coppia === undefined ? nomeDelBlocco(b, testi, espressione, funzioni) : nomeDellaLetturaConDomanda(b, coppia, testi, espressione);
      const voce: Voce = { genere: "blocco", id: b.id, nome: proprio };
      const di = (modello: string) => riempi(modello, { blocco: proprio });
      if (b.kind === "if") voci.push(voce, sequenza(b.then, b.id, "then", di(testi.sequenzaVero)), sequenza(b.else, b.id, "else", di(testi.sequenzaFalso)));
      else if (b.kind === "while" || b.kind === "for" || b.kind === "for_each") voci.push(voce, sequenza(b.body, b.id, "body", di(testi.sequenzaCorpo)));
      else if (b.kind === "repeat") voci.push(sequenza(b.body, b.id, "body", di(testi.sequenzaCorpo)), voce);
      else voci.push(voce);
    });
    voci.push(punto(mostrati.length, tutti.length));
    return { genere: "sequenza", nome, voci };
  }
  // La sequenza di una procedura o di una funzione porta il suo nome; quella di una funzione finisce con la sua fine, che
  // dice ciò che restituisce.
  const corpo = sequenza(funzione.body, funzione.id, "body", funzione.kind === "main" ? testi.sequenzaPrincipale : (funzione.name ?? ""));
  if (corpo.genere !== "sequenza") return corpo;
  const valore = funzione.end.return_value;
  const fine: Voce[] =
    funzione.kind === "function"
      ? [{ genere: "restituisce", id: funzione.end.id, nome: riempi(testi.nomeDelBlocco, { genere: testi.bloccoRestituisce, testo: valore?.trim() ? espressione(valore) : testi.bloccoSenzaTesto }) }]
      : [];
  const principale: Voce = { ...corpo, voci: [...corpo.voci, ...fine] };
  if (valori === undefined) return principale;
  return { ...principale, voci: [...vociDeiValori(funzione, testi, valori), ...principale.voci] };
}
