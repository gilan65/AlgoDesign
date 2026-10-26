// Il registro dei linguaggi del codice generato: per ognuno l'identificatore, l'estensione del file, il genere (da
// eseguire, col test differenziale, o da leggere) e il generatore, con la stessa firma per tutti. L'ordine del registro
// è quello delle linguette nella colonna del codice. Chi elenca i linguaggi (la finestra del codice, «Salva…») legge
// qui, non un elenco suo.
//
// I generatori stanno dietro un adattatore: lo pseudocodice non usa la lingua né il programma di prova; Python e C
// ricevono le parole dello pseudocodice come note dei dati (la parola «costante» e i ruoli ci sono anche lì). Il nome
// di un linguaggio e il filtro della finestra del file sono parole dei dizionari, che il nucleo non conosce: li
// nomina l'interfaccia, per identificatore.

import type { Tetti } from "../controllo/controllo";
import type { Progetto } from "../progetto/modello";
import { c } from "./c";
import type { Generato } from "./forma";
import type { LinguaDelCodice } from "./nomi";
import { pseudocodice, type ParoleDelloPseudocodice } from "./pseudocodice";
import { python, type Prova } from "./python";

/** Un linguaggio da eseguire ha l'esecutore del test differenziale; uno da leggere si prova sul testo atteso. */
export type GenereDelLinguaggio = "da-eseguire" | "da-leggere";

export interface VoceDelLinguaggio {
  readonly id: string;
  /** L'estensione del file del codice, col punto. Due linguaggi possono averla uguale. */
  readonly estensione: string;
  readonly genere: GenereDelLinguaggio;
  /** Il codice del progetto, se il controllo statico lo lascia eseguire; con `prova`, il programma di prova di un caso
   * di una funzione (solo per un linguaggio da eseguire). */
  readonly genera: (p: Progetto, limiti: Tetti, lingua: LinguaDelCodice, parole: ParoleDelloPseudocodice, prova?: Prova) => Generato;
}

export const linguaggi = [
  { id: "pseudocodice", estensione: ".txt", genere: "da-leggere", genera: (p, limiti, _lingua, parole) => pseudocodice(p, limiti, parole) },
  { id: "python", estensione: ".py", genere: "da-eseguire", genera: (p, limiti, lingua, parole, prova) => python(p, limiti, lingua, parole, prova) },
  { id: "c", estensione: ".c", genere: "da-eseguire", genera: (p, limiti, lingua, parole, prova) => c(p, limiti, lingua, parole, prova) },] as const satisfies readonly VoceDelLinguaggio[];

export type Linguaggio = (typeof linguaggi)[number]["id"];
/** Le estensioni del registro: quelle che il guscio accetta per il codice (`CODICE` in `shell/src/progetto.rs`). */
export type EstensioneDelCodice = (typeof linguaggi)[number]["estensione"];

export function voceDel(id: Linguaggio): VoceDelLinguaggio & { readonly id: Linguaggio; readonly estensione: EstensioneDelCodice } {
  return linguaggi.find((v) => v.id === id)!;
}
