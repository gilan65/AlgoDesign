// La composizione di una registrazione, da un'esecuzione del nucleo in qualunque stato: non finita (prima della prima azione,
// in pausa, in attesa di una riga, fra due fette), finita, o che non parte. Prende solo ciò che l'esecuzione dice in
// pubblico; dei valori fuori dal file del progetto copia i cinque, uno per uno, mai l'oggetto che li porta.
//
// A differenza di un caso composto (`casi/dall-esecuzione.ts`) una console che ha perso righe resta registrabile, e il file dice
// quante ne ha perse: una registrazione è ciò che è successo, non un atteso.
//
// Una fotografia si fa quando serve, e non tiene l'esecuzione: la modalità che registra più esecuzioni tiene le fotografie.
//
// Che cosa NON guarda: gli errori dell'app, che dà chi chiama; il contenuto del progetto, che è ciò che lo studente ha scritto e la
// finestra gli mostra prima di salvare.

import type { Tetti } from "../controllo/controllo";
import type { Esecuzione, RigaData, RigheLunghe, Stato, VoceDellaConsole } from "../esecuzione/esecuzione";
import type { CasoDiUnaFunzione } from "../progetto/modello";
import type { ErroreDellApp, EsecuzioneRegistrata, EsitoDelFile, EsitoRegistrato, FaseDelFile, LimitiDelFile, Registrazione, RigaDellaConsole, RigaLetta, RigheLungheDelFile, Sistema } from "./formato";
import { formatoDellaRegistrazione } from "./formato";
import type { Lingua } from "../../i18n/lingue";

const limitiDelFile = (t: Tetti): LimitiDelFile => ({ vector_elements: t.elementiDiUnVettore, string_length: t.lunghezzaDiUnaStringa, string_vector_characters: t.caratteriDiUnVettoreDiStringhe });

const righeLungheDelFile = (r: RigheLunghe): RigheLungheDelFile => ({ characters: r.caratteri, mode: r.modo === "a-capo" ? "wrap" : "tail" });

const fasiDelFile = { inizio: "start", condizione: "condition", passo: "step", elemento: "item" } as const satisfies Record<string, FaseDelFile>;

const rigaLetta = (v: RigaData): RigaLetta => ({ data: v.data, ...(v.text !== undefined ? { text: v.text } : {}), ...(v.each === true ? { each: true as const } : {}), ...(v.rifiutata ? { rejected: true as const } : {}) });

function rigaDellaConsole(v: VoceDellaConsole): RigaDellaConsole {
  const taglio = "tagliata" in v && v.tagliata === true ? { cut: true as const } : {};
  switch (v.genere) {
    case "scrive":
      return { kind: "write", text: v.testo, newline: v.aCapo, ...taglio };
    case "letto":
      return { kind: "read", data: v.dato, text: v.testo, ...taglio };
    case "senzaValore":
      return { kind: "no_value", data: v.dato };
    case "nonValido":
      return { kind: "invalid", data: v.dato, text: v.testo, ...taglio };
  }
}

function esitoDelFile(s: Stato): EsitoDelFile {
  switch (s.genere) {
    case "pronta":
      return { kind: "ready" };
    case "in corso":
      return { kind: "running" };
    case "pausa":
      return {
        kind: "paused",
        block: s.blocco,
        ...(s.dato !== undefined ? { data: s.dato } : {}),
        ...(s.fase !== undefined ? { phase: fasiDelFile[s.fase] } : {}),
        ...(s.campo !== undefined ? { field: s.campo } : {}),
        ...(s.interno ? { inner: true as const } : {}),
        ...(s.funzione !== undefined ? { function: s.funzione } : {}),
        depth: s.profondita,
        ...(s.ripresa !== undefined ? { resumed_from: s.ripresa.funzione } : {}),
      };
    case "chiede":
      return {
        kind: "asking",
        data: s.dato,
        invalid: s.nonValido,
        ...(s.parametro !== undefined ? { parameter: s.parametro === "valore" ? ("value" as const) : ("reference" as const) } : {}),
        ...(s.elemento !== undefined ? { element: s.elemento } : {}),
        ...(s.campo !== undefined ? { field: s.campo } : {}),
      };
    case "finita":
      return { kind: "finished", ...(s.errore ? { error: s.errore } : {}) };
    case "non parte":
      return s.controllo.fuoriTappa ? { kind: "not_started", errors: [], out_of_scope: s.controllo.blocchi } : { kind: "not_started", errors: s.controllo.errori };
  }
}

/** Ciò che il programma ha fatto fin qui, nella forma del file: la riproduzione compone la propria e le confronta. */
export const esitoRegistrato = (es: Esecuzione<CasoDiUnaFunzione>): EsitoRegistrato => ({
  console: es.console.map(rigaDellaConsole),
  console_removed: es.consoleTolte,
  advances: es.avanzamenti,
  outcome: esitoDelFile(es.stato),
});

export const righeLette = (es: Esecuzione<CasoDiUnaFunzione>): readonly RigaLetta[] => es.righeDate.map(rigaLetta);

/** Un'esecuzione com'è adesso, con i suoi valori. */
export interface Fotografia {
  readonly limits: LimitiDelFile;
  readonly long_lines: RigheLungheDelFile;
  readonly esecuzione: EsecuzioneRegistrata;
}

export function fotografa(es: Esecuzione<CasoDiUnaFunzione>): Fotografia {
  return {
    limits: limitiDelFile(es.limiti),
    long_lines: righeLungheDelFile(es.righeLunghe),
    esecuzione: {
      project: es.progetto,
      ...(es.funzione !== undefined ? { function: es.funzione } : {}),
      ...(es.caso !== undefined ? { test_case: es.caso } : { reads: righeLette(es) }),
      ...esitoRegistrato(es),
    },
  };
}

/** Ciò che l'esecuzione non sa, e dà chi compone: una volta sola nel file. */
export interface ContestoDellaRegistrazione {
  readonly versione: string;
  readonly lingua: Lingua;
  readonly sistema: Sistema;
  readonly erroriDellApp: readonly ErroreDellApp[];
  readonly erroriPersi: number;
}

/** La registrazione di una o più esecuzioni. I cinque valori si scrivono una volta sola: se sono cambiati fra due esecuzioni non
 * c'è un file che li dica, e chi registra deve fare due file. */
export function componi(contesto: ContestoDellaRegistrazione, fotografie: readonly Fotografia[]): Registrazione {
  const prima = fotografie[0];
  if (prima === undefined) throw new Error("una registrazione senza esecuzioni");
  const valori = (f: Fotografia) => JSON.stringify([f.limits, f.long_lines]);
  if (fotografie.some((f) => valori(f) !== valori(prima))) throw new Error("i limiti o le righe lunghe sono cambiati fra due esecuzioni della stessa registrazione");
  return {
    format: formatoDellaRegistrazione,
    schema_version: 1,
    product_version: contesto.versione,
    language: contesto.lingua,
    system: contesto.sistema,
    limits: prima.limits,
    long_lines: prima.long_lines,
    app_errors: contesto.erroriDellApp,
    app_errors_lost: contesto.erroriPersi,
    executions: fotografie.map((f) => f.esecuzione),
  };
}
