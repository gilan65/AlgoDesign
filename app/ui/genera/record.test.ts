// I record nei linguaggi del registro: ogni generatore scrive ogni progetto giusto della cartella dei record (e il
// programma di prova di ogni caso di una funzione), mai con un'eccezione, e un progetto coi record e un errore statico
// resta con gli errori; «Accademico» dice ciò che manca, coi record fra le specie. Il codice di tre file del corpus
// contro gli attesi scritti a mano (`attesi-dei-record.ts`), con la provenienza della copia una riga per campo.
//
// Che cosa queste prove NON guardano: che il codice generato dia l'output dell'interprete (lo prova il differenziale,
// che esegue i programmi); le matrici e le tabelle, che hanno la loro prova (`matrici.test.ts`, `tabelle.test.ts`).

import { describe, expect, test } from "bun:test";
import { confermato } from "../../strumenti/corpus";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../../core/controllo/controllo";
import { c } from "../../core/genera/c";
import { righeDi, testoDelCodice, type Generato, type Riga } from "../../core/genera/forma";
import { linguaggi } from "../../core/genera/linguaggi";
import { pseudocodice } from "../../core/genera/pseudocodice";
import { python } from "../../core/genera/python";
import { apri } from "../../core/progetto/formato";
import { usaIRecord, usaLeMatrici, usaLeTabelle, type Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import {
  copiaC,
  copiaPseudocodice,
  copiaPython,
  funzioneC,
  funzionePython,
  perRiferimentoC,
  perRiferimentoPython,
  provaDellaFunzioneC,
  provaDellaFunzionePython,
  provenienzeDellaCopia,
} from "./attesi-dei-record";
import { paroleDelloPseudocodice } from "./parole";

const cartella = join(import.meta.dir, "..", "..", "casi", "tipi");
const progetto = (nome: string): Progetto => {
  const a = apri(readFileSync(join(cartella, nome), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
// I file dei record: quelli delle matrici e delle tabelle, nella stessa cartella, li provano `matrici.test.ts` e
// `tabelle.test.ts`.
const file = readdirSync(cartella).filter((f) => f.endsWith(".algo") && usaIRecord(progetto(f)) && !usaLeMatrici(progetto(f)) && !usaLeTabelle(progetto(f)));

/** Il confronto col messaggio che nomina la prima riga diversa, con le due forme. */
function uguale(generato: string, atteso: string, chi: string) {
  if (generato === atteso) return;
  const g = generato.split("\n");
  const a = atteso.split("\n");
  const n = g.findIndex((x, i) => x !== a[i]);
  const k = n < 0 ? g.length : n;
  throw new Error(`${chi}, riga ${k + 1}: atteso «${a[k] ?? "(nessuna)"}», generato «${g[k] ?? "(nessuna)"}»`);
}
const righe = (g: Generato, chi: string): readonly Riga[] => {
  if (!g.generato) throw new Error(`${chi} non generato: ${g.perche}`);
  return g.righe;
};
const testoDi = (g: Generato, chi: string) => testoDelCodice(righe(g, chi));
/** La provenienza delle righe che vengono da un blocco: il blocco e, per una riga di una copia di un record, il campo. */
const provenienze = (r: readonly Riga[]) => r.flatMap((x) => (x.blocco === undefined ? [] : [`${x.blocco}${x.campo === undefined ? "" : `/${x.campo}`}`]));

test("ogni linguaggio scrive i record: generato il progetto giusto, con gli errori quello sbagliato, ciò che manca in «Accademico», su ogni file della cartella", () => {
  const esiti = file.map((nome) => {
    const p = progetto(nome);
    const k = controlla(p, tetti);
    const atteso = !k.fuoriTappa && k.errori.length > 0 ? "errori-statici" : "generato";
    const ottenuti = linguaggi.map((v) => {
      const g = v.genera(p, tetti, "it", paroleDelloPseudocodice("it"), undefined);
      return g.generato ? "generato" : g.perche;
    });
    // «Accademico» non ha i record: per lui il progetto giusto non ci sta.
    // Il TypeScript non li sa ancora scrivere: per lui il progetto giusto è «non ancora».
    const giusto = linguaggi.every((v, i) => ottenuti[i] === (atteso === "generato" && v.id === "accademico" ? "non-ci-sta" : atteso === "generato" && v.id === "typescript" ? "non-ancora" : atteso));
    return { nome, giusto, atteso, ottenuti };
  });
  expect(esiti.filter((e) => !e.giusto)).toEqual([]);
  // Controllo positivo dei denominatori: sette file giusti e quattro sbagliati, ognuno per ogni linguaggio.
  const giustiESbagliati = [esiti.filter((e) => e.atteso === "generato").length, esiti.filter((e) => e.atteso === "errori-statici").length];
  expect(giustiESbagliati).toEqual(confermato("record - file giusti e sbagliati", giustiESbagliati));
  expect(linguaggi.length).toBe(5);
});

test("il programma di prova di ogni caso di una funzione coi record si genera in ogni linguaggio da eseguire", () => {
  const casi = file.flatMap((nome) => {
    const p = progetto(nome);
    const k = controlla(p, tetti);
    if (k.fuoriTappa || k.errori.length > 0) return [];
    return p.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ nome: `${nome}#${f.name}/${caso.name}`, p, f, caso })));
  });
  const daEseguire = linguaggi.filter((v) => v.genere === "da-eseguire");
  const rifiutati = casi.flatMap(({ nome, p, f, caso }) => daEseguire.flatMap((v) => (v.genera(p, tetti, "it", paroleDelloPseudocodice("it"), { funzione: f.id, caso }).generato ? [] : [`${nome} ${v.id}`])));
  // Il TypeScript li rifiuta tutti: non sa ancora scrivere il programma di prova.
  expect(rifiutati).toEqual(casi.map(({ nome }) => `${nome} typescript`));
  // Controllo positivo: i casi delle funzioni della cartella sono tre (migliore, promuovi, crea), ognuno per due linguaggi.
  expect(casi.length).toBe(confermato("record - casi delle funzioni della cartella", casi.length));
  expect(daEseguire.length).toBe(3);
});

describe("il codice dei record uguale all'atteso scritto a mano", () => {
  const copia = progetto("copia-di-un-record.algo");
  for (const l of ["it", "en"] as const satisfies readonly Lingua[]) {
    const parole = paroleDelloPseudocodice(l);
    test(`copia-di-un-record, pseudocodice (${l})`, () => uguale(testoDi(pseudocodice(copia, tetti, parole), "pseudocodice"), copiaPseudocodice[l], `pseudocodice (${l})`));
    test(`copia-di-un-record, Python (${l})`, () => uguale(testoDi(python(copia, tetti, l, parole), "python"), copiaPython[l], `python (${l})`));
    test(`copia-di-un-record, C (${l})`, () => uguale(testoDi(c(copia, tetti, l, parole), "c"), copiaC[l], `c (${l})`));
  }
  const parole = paroleDelloPseudocodice("it");
  test("record-per-riferimento, Python e C", () => {
    const p = progetto("record-per-riferimento.algo");
    uguale(testoDi(python(p, tetti, "it", parole), "python"), perRiferimentoPython, "python");
    uguale(testoDi(c(p, tetti, "it", parole), "c"), perRiferimentoC, "c");
  });
  test("funzione-con-un-record, Python e C, col programma di prova della funzione", () => {
    const p = progetto("funzione-con-un-record.algo");
    uguale(testoDi(python(p, tetti, "it", parole), "python"), funzionePython, "python");
    uguale(testoDi(c(p, tetti, "it", parole), "c"), funzioneC, "c");
    const f = p.functions.find((x) => x.name === "migliore")!;
    const prova = { funzione: f.id, caso: f.test_cases![0]! };
    uguale(testoDi(python(p, tetti, "it", parole, prova), "prova python"), provaDellaFunzionePython, "prova python");
    uguale(testoDi(c(p, tetti, "it", parole, prova), "prova c"), provaDellaFunzioneC, "prova c");
  });
  test("la copia col nome: una riga per campo nel Python e nel C, una sola nello pseudocodice; la riga corrente del campo", () => {
    const delPython = righe(python(copia, tetti, "it", parole), "python");
    const delC = righe(c(copia, tetti, "it", parole), "c");
    const delloPseudocodice = righe(pseudocodice(copia, tetti, parole), "pseudocodice");
    expect({ pseudocodice: provenienze(delloPseudocodice), python: provenienze(delPython), c: provenienze(delC) }).toEqual({
      pseudocodice: [...provenienzeDellaCopia.pseudocodice],
      python: [...provenienzeDellaCopia.python],
      c: [...provenienzeDellaCopia.c],
    });
    // La pausa sul campo 1 accende la sola riga di quel campo; lo pseudocodice la sua riga unica, a ogni campo.
    expect(righeDi(delPython, { blocco: "b1", campo: 1 }).map((i) => delPython[i]!.testo.trim())).toEqual(["b.classe = a.classe"]);
    expect(righeDi(delC, { blocco: "b1", campo: 2 }).map((i) => delC[i]!.testo.trim())).toEqual(["b.voto = a.voto;"]);
    expect(righeDi(delloPseudocodice, { blocco: "b1", campo: 2 }).map((i) => delloPseudocodice[i]!.testo.trim())).toEqual(["b ← a"]);
    // Controllo positivo: senza il campo, il blocco della copia ha le sue tre righe.
    expect(righeDi(delPython, { blocco: "b1" })).toHaveLength(3);
  });
});
