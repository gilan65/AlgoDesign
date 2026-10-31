// Il registro dei linguaggi del codice generato: per ognuno l'identificatore, l'estensione del file, il genere (da
// eseguire, col test differenziale, o da leggere), il generatore con la stessa firma per tutti, e i nomi che nessun dato
// può avere perché il codice di quel linguaggio li usa (le parole del linguaggio, i nomi che il generato usa per sé). Un
// linguaggio da eseguire dice anche come il suo programma si ferma: i motivi con il codice d'errore di ognuno, e la riga
// che li scrive. L'ordine del registro è quello delle linguette nella colonna del codice. Chi elenca i linguaggi (la
// finestra del codice, «Salva…», il controllo statico) legge qui, non un elenco suo.
//
// I generatori stanno dietro un adattatore: lo pseudocodice non usa la lingua né il programma di prova; Python e C
// ricevono le parole dello pseudocodice come note dei dati (la parola «costante» e i ruoli ci sono anche lì). Il nome
// di un linguaggio e il filtro della finestra del file sono parole dei dizionari, che il nucleo non conosce: li
// nomina l'interfaccia, per identificatore.
//
// Il controllo statico riserva i nomi di TUTTI i linguaggi del registro, anche di quelli che l'utente non mostra: lo
// stesso progetto resta valido ovunque.

import type { Tetti } from "../controllo/controllo";
import type { Progetto } from "../progetto/modello";
import { accademico } from "./accademico";
import { c } from "./c";
import type { Generato } from "./forma";
import { motiviCol, type TabellaDeiMotivi } from "./motivi";
import { nomiDelleIntestazioni, riservatiDelC, riservatiDelPython, riservatiDelTypeScript, type LinguaDelCodice } from "./nomi";
import { pseudocodice, type ParoleDelloPseudocodice } from "./pseudocodice";
import { python, type Prova } from "./python";
import { typescript } from "./typescript";

/** Un linguaggio da eseguire ha l'esecutore del test differenziale; uno da leggere si prova sul testo atteso. */
export type GenereDelLinguaggio = "da-eseguire" | "da-leggere";

interface VoceComune {
  readonly id: string;
  /** L'estensione del file del codice, col punto. Due linguaggi possono averla uguale. */
  readonly estensione: string;
  /** Il codice del progetto, se il controllo statico lo lascia eseguire; con `prova`, il programma di prova di un caso
   * di una funzione (solo per un linguaggio da eseguire). */
  readonly genera: (p: Progetto, limiti: Tetti, lingua: LinguaDelCodice, parole: ParoleDelloPseudocodice, prova?: Prova) => Generato;
  /** I nomi che nessun dato può avere, in ogni lingua del codice. */
  readonly riservati: readonly string[];
  /** I nomi vietati solo a ciò che sta a livello di file (una procedura, una funzione, una costante comune): un dato
   * dentro una funzione può averli. */
  readonly riservatiNelFile: readonly string[];
  /** Acceso nel menu dei linguaggi per chi non l'ha ancora scelto (le preferenze senza il campo): i linguaggi di
   * partenza sì; uno aggiunto da una versione dopo no, e nasce spento in fondo al menu. */
  readonly diPartenza: boolean;
}

export type VoceDelLinguaggio =
  | (VoceComune & { readonly genere: "da-leggere" })
  | (VoceComune & {
      readonly genere: "da-eseguire";
      /** Il motivo di ogni codice d'errore con cui il programma si ferma, nelle lingue del codice, col tetto delle
       * chiamate del progetto (che i motivi dei tetti della ricorsione dicono). */
      readonly motivi: (tetto: number) => TabellaDeiMotivi;
      /** La riga che il programma scrive sullo standard error quando si ferma: il numero della riga e il motivo. */
      readonly rigaDErrore: RegExp;
    });

/** La riga d'errore del Python, del C e del TypeScript generati: «Errore alla riga N: motivo», o «Error at line N: …». */
const rigaDErrore = /^(?:Errore alla riga|Error at line) (\d+): (.+)\n$/;

export const linguaggi = [
  {
    id: "pseudocodice",
    estensione: ".txt",
    genere: "da-leggere",
    genera: (p, limiti, _lingua, parole) => pseudocodice(p, limiti, parole),
    riservati: [],
    riservatiNelFile: [],
    diPartenza: true,
  },
  {
    id: "python",
    estensione: ".py",
    genere: "da-eseguire",
    genera: (p, limiti, lingua, parole, prova) => python(p, limiti, lingua, parole, prova),
    riservati: riservatiDelPython,
    riservatiNelFile: [],
    diPartenza: true,
    motivi: motiviCol,
    rigaDErrore,
  },
  {
    id: "c",
    estensione: ".c",
    genere: "da-eseguire",
    genera: (p, limiti, lingua, parole, prova) => c(p, limiti, lingua, parole, prova),
    riservati: riservatiDelC,
    riservatiNelFile: nomiDelleIntestazioni,
    diPartenza: true,
    motivi: motiviCol,
    rigaDErrore,
  },
  {
    // Le parole di «Accademico» non si riservano: un nome uguale è una cosa che manca, e il progetto resta valido.
    id: "accademico",
    estensione: ".txt",
    genere: "da-leggere",
    genera: (p, limiti, lingua) => accademico(p, limiti, lingua),
    riservati: [],
    riservatiNelFile: [],
    diPartenza: false,
  },
  {
    // Aggiunto dopo i linguaggi di partenza: nasce spento, in fondo al menu.
    id: "typescript",
    estensione: ".ts",
    genere: "da-eseguire",
    genera: (p, limiti, lingua, parole, prova) => typescript(p, limiti, lingua, parole, prova),
    riservati: riservatiDelTypeScript,
    riservatiNelFile: [],
    diPartenza: false,
    motivi: motiviCol,
    rigaDErrore,
  },
] as const satisfies readonly VoceDelLinguaggio[];

export type Linguaggio = (typeof linguaggi)[number]["id"];
/** Le estensioni del registro: quelle che il guscio accetta per il codice (`CODICE` in `shell/src/progetto.rs`). */
export type EstensioneDelCodice = (typeof linguaggi)[number]["estensione"];

export function voceDel(id: Linguaggio): VoceDelLinguaggio & { readonly id: Linguaggio; readonly estensione: EstensioneDelCodice } {
  return linguaggi.find((v) => v.id === id)!;
}

/** I nomi riservati di tutti i linguaggi del registro. */
export function nomiRiservati(): ReadonlySet<string> {
  return new Set(linguaggi.flatMap((v) => v.riservati));
}

/** I nomi riservati a livello di file da tutti i linguaggi del registro. */
export function nomiRiservatiNelFile(): ReadonlySet<string> {
  return new Set(linguaggi.flatMap((v) => v.riservatiNelFile));
}
