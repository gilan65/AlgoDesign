// Il caso d'uso che riproduce un'esecuzione finita: le voci sono le righe date alle letture, intere e nell'ordine, col
// nome del dato che le ha chieste (o i parametri della funzione eseguita da sola, con «a ogni elemento» com'è stato dato);
// l'atteso è l'output scritto, l'errore dell'esito e gli avvisi del controllo, così il caso rieseguito è raggiunto senza
// avvisi diversi. Il caso è della radice dell'esecuzione (il programma, o la funzione eseguita da sola), non della scheda
// che l'interfaccia mostra alla fine: chi lo aggiunge lo prende da `Esecuzione.funzione`.
//
// Non si compone (e il motivo lo dice):
// - un'esecuzione non finita (prima della prima azione, in pausa, in corso, in attesa di una riga): «Ferma» la toglie;
// - l'esecuzione di un caso d'uso, che il caso ce l'ha già;
// - una console che ha perso righe, o ne ha tenuta una dalla fine: senza caso l'output si tiene solo lì, e il caso non
//   sarebbe quello dell'esecuzione;
// - un'esecuzione con valori modificati a mano: rieseguendo il caso nessuno riotterrebbe il suo atteso.
// Un'esecuzione che parte non ha errori statici: l'atteso non ne ha mai uno.
//
// Che cosa NON guarda: se il programma è cambiato dopo la fine (lo dice `stessoProgramma`, a chi tiene il progetto di
// adesso), né se i limiti sono cambiati.

import type { Esecuzione } from "../esecuzione/esecuzione";
import type { Atteso, CasoDiUnaFunzione, Progetto, VoceDiUnaFunzione } from "../progetto/modello";
import { comeTesto } from "./esito";

export type SenzaCaso = "non finita" | "caso" | "output perso" | "valori modificati";

/** Le voci e l'atteso del caso che riproduce `es`, o perché non si compone. */
export type DallEsecuzione = { readonly ok: true; readonly inputs: readonly VoceDiUnaFunzione[]; readonly expected: Atteso } | { readonly ok: false; readonly motivo: SenzaCaso };

export function casoDallEsecuzione(es: Esecuzione<CasoDiUnaFunzione>): DallEsecuzione {
  const s = es.stato;
  if (s.genere !== "finita") return { ok: false, motivo: "non finita" };
  if (es.caso !== undefined) return { ok: false, motivo: "caso" };
  if (es.modifiche.length > 0) return { ok: false, motivo: "valori modificati" };
  const righe = es.console;
  // L'output è fatto delle sole righe scritte: una riga letta o non valida tenuta dalla fine non gli toglie nulla.
  if (es.consoleTolte > 0 || righe.some((v) => v.genere === "scrive" && "tagliata" in v && v.tagliata === true)) return { ok: false, motivo: "output perso" };
  const output = righe.map((v) => (v.genere === "scrive" ? (v.aCapo ? `${v.testo}\n` : v.testo) : "")).join("");
  // Un'esecuzione partita ha un controllo dentro la tappa.
  const avvisi = es.controllo.fuoriTappa ? [] : es.controllo.avvisi;
  return { ok: true, inputs: es.lette, expected: { output, ...(s.errore ? { error: s.errore } : {}), ...(avvisi.length > 0 ? { warnings: avvisi } : {}) } };
}

/** Il progetto come programma: senza i casi d'uso (del programma e delle funzioni) e senza i metadati. */
const comeProgramma = (p: Progetto) => JSON.stringify({ ...p, metadata: undefined, test_cases: undefined, functions: p.functions.map((f) => ({ ...f, test_cases: undefined })) });

/** Lo stesso programma: cambiare un caso d'uso o i metadati non lo cambia. */
export const stessoProgramma = (a: Progetto, b: Progetto): boolean => a === b || comeProgramma(a) === comeProgramma(b);

/** Le voci e l'atteso come testo confrontabile; gli avvisi in ordine, come li confronta l'esito. */
const impronta = (c: { readonly inputs: readonly VoceDiUnaFunzione[]; readonly expected: Atteso }) =>
  JSON.stringify([
    c.inputs.map((v) => [v.data, v.text ?? null, v.each === true]),
    c.expected.output,
    comeTesto(c.expected.error),
    comeTesto(c.expected.static_error),
    (c.expected.warnings ?? []).map(comeTesto).sort(),
  ]);

/** La posizione del caso con le stesse voci e lo stesso atteso (il nome e la descrizione non contano), o -1. */
export function casoUguale(casi: readonly CasoDiUnaFunzione[], caso: { readonly inputs: readonly VoceDiUnaFunzione[]; readonly expected: Atteso }): number {
  const cercata = impronta(caso);
  return casi.findIndex((c) => impronta(c) === cercata);
}
