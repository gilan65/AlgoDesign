// Il disegno di una funzione del progetto, come lo mostra l'app: una fonte sola per la finestra, la stampa, l'esportazione
// e il punto d'ingresso del nucleo (`entrypoint/index.ts`, la funzione `disegna`). Senza DOM: lo prova la configurazione
// del nucleo, che lo include.
//
// La regola che sta qui e non altrove: le parole del disegno nella lingua dell'interfaccia (`testiDelDisegno`), la
// geometria del tema, le costanti comuni solo sotto l'«Inizio» del programma principale, e dal progetto le funzioni (un
// salto dice *rif* davanti agli argomenti per riferimento) e i record (la copia di un record ne mostra i campi).
import {
  impagina,
  type CondizioniLunghe,
  type Disegno,
  type FormaDellaCopia,
  type FormaDelPer,
  type FormaDelPerOgni,
  type MisuraDelTesto,
  type OpzioniDelDisegno,
  type ValoreRipetuto,
  type ValoriIniziali,
} from "../../core/disegno/impaginazione";
import { geometriaPredefinita } from "../../core/disegno/tema";
import type { Dato, DefinizioneDelRecord, Funzione, Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import { testiDelDisegno } from "./testi";

/** Le scelte delle Impostazioni che cambiano il disegno, coi loro nomi nelle preferenze (`ui/preferenze.ts`). */
export interface ScelteDelDisegno {
  readonly condizioni: CondizioniLunghe;
  readonly valoriIniziali: ValoriIniziali;
  readonly valoreRipetuto: ValoreRipetuto;
  readonly cicliPer: FormaDelPer;
  readonly cicliPerOgni: FormaDelPerOgni;
  readonly copiaDeiVettori: FormaDellaCopia;
  readonly domandaNellaLettura: boolean;
}

/** Le opzioni del disegno dalle scelte delle Impostazioni. */
export const opzioniDelDisegnoDa = (s: ScelteDelDisegno): OpzioniDelDisegno => ({
  condizioniLunghe: s.condizioni,
  valoriIniziali: s.valoriIniziali,
  valoreRipetuto: s.valoreRipetuto,
  per: s.cicliPer,
  perOgni: s.cicliPerOgni,
  copia: s.copiaDeiVettori,
  domanda: s.domandaNellaLettura ? "nella-lettura" : "nella-scrittura",
});

/** Una funzione impaginata nella lingua data, con la geometria del tema: anche ciò che non è una funzione del progetto
 * (la copia di un tratto che si trascina, il disegno di una libreria). */
export function impaginaNellaLingua(
  funzione: Funzione,
  misura: MisuraDelTesto,
  lingua: Lingua,
  opzioni: OpzioniDelDisegno,
  comuni?: readonly Dato[],
  funzioni?: readonly Funzione[],
  records?: readonly DefinizioneDelRecord[],
): Disegno {
  return impagina(funzione, geometriaPredefinita, misura, testiDelDisegno(lingua), opzioni, comuni, funzioni, records);
}

/** Il disegno di una funzione del progetto: le costanti comuni solo nel programma principale. */
export function disegnoDellaFunzione(progetto: Pick<Progetto, "shared_constants" | "functions" | "records">, funzione: Funzione, misura: MisuraDelTesto, lingua: Lingua, opzioni: OpzioniDelDisegno): Disegno {
  return impaginaNellaLingua(funzione, misura, lingua, opzioni, funzione.kind === "main" ? progetto.shared_constants : undefined, progetto.functions, progetto.records);
}
