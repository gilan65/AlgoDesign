// Le tabelle (i vettori di record) nei linguaggi del registro: ogni generatore scrive ogni progetto giusto della cartella
// dei tipi (e il programma di prova di ogni caso di una funzione), e un progetto con un errore statico resta con gli
// errori; «Accademico» dice ciò che manca. Il codice di due file del corpus contro gli attesi scritti a mano
// (`attesi-delle-tabelle.ts`), con la provenienza delle copie: il ciclo dei record con una riga per campo, e la copia di un
// record della tabella una riga per campo.
//
// Che cosa queste prove NON guardano: che il codice generato dia l'output dell'interprete, e che nessuna copia sia un
// alias (lo prova il differenziale, che esegue i programmi); le mancanze di «Accademico» una per una, che hanno la loro
// prova (`accademico.test.ts`).

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
import { usaLeTabelle, type Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import {
  comeParametroC,
  comeParametroPython,
  copiaC,
  copiaPseudocodice,
  copiaPython,
  provaDiAlzataC,
  provaDiAlzataPython,
  provenienzeDelleCopie,
} from "./attesi-delle-tabelle";
import { paroleDelloPseudocodice } from "./parole";

const cartella = join(import.meta.dir, "..", "..", "casi", "tipi");
const progetto = (nome: string): Progetto => {
  const a = apri(readFileSync(join(cartella, nome), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
const file = readdirSync(cartella).filter((f) => f.endsWith(".algo") && usaLeTabelle(progetto(f)));

test("ogni linguaggio scrive le tabelle: generato il progetto giusto, con gli errori quello sbagliato, ciò che manca in «Accademico», su ogni file della cartella", () => {
  const esiti = file.map((nome) => {
    const p = progetto(nome);
    const k = controlla(p, tetti);
    const atteso = !k.fuoriTappa && k.errori.length > 0 ? "errori-statici" : "generato";
    const ottenuti = linguaggi.map((v) => {
      const g = v.genera(p, tetti, "it", paroleDelloPseudocodice("it"), undefined);
      return g.generato ? "generato" : g.perche;
    });
    // «Accademico» non ha le tabelle: per lui il progetto giusto non ci sta.
    // Il TypeScript non li sa ancora scrivere: per lui il progetto giusto è «non ancora».
    const giusto = linguaggi.every((v, i) => ottenuti[i] === (atteso === "generato" && v.id === "accademico" ? "non-ci-sta" : atteso === "generato" && v.id === "typescript" ? "non-ancora" : atteso));
    return { nome, giusto, atteso, ottenuti };
  });
  expect(esiti.filter((e) => !e.giusto)).toEqual([]);
  // Controllo positivo dei denominatori: cinque file giusti e uno sbagliato (il tetto superato), ognuno per ogni linguaggio.
  const giustiESbagliati = [esiti.filter((e) => e.atteso === "generato").length, esiti.filter((e) => e.atteso === "errori-statici").length];
  expect(giustiESbagliati).toEqual(confermato("tabelle - file giusti e sbagliati", giustiESbagliati));
  expect(linguaggi.length).toBe(5);
});

test("il programma di prova di ogni caso di una funzione con le tabelle si genera in ogni linguaggio da eseguire", () => {
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
  // Controllo positivo: i casi delle funzioni della cartella sono tre (crea, migliore, alzata), ognuno per due linguaggi.
  expect(casi.length).toBe(confermato("tabelle - casi delle funzioni della cartella", casi.length));
  expect(daEseguire.length).toBe(3);
});

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
/** Le provenienze delle righe del blocco, una voce per riga: le fasi e, dopo la barra, il campo. */
const provenienzeDi = (r: readonly Riga[], blocco: string) =>
  r.flatMap((x) => (x.blocco !== blocco ? [] : [`${(x.fasi ?? []).join(" ")}${x.campo === undefined ? "" : `/${x.campo}`}`]));

describe("il codice delle tabelle uguale all'atteso scritto a mano", () => {
  const copia = progetto("copia-di-una-tabella.algo");
  for (const l of ["it", "en"] as const satisfies readonly Lingua[]) {
    const parole = paroleDelloPseudocodice(l);
    test(`copia-di-una-tabella, pseudocodice (${l})`, () => uguale(testoDi(pseudocodice(copia, tetti, parole), "pseudocodice"), copiaPseudocodice[l], `pseudocodice (${l})`));
    test(`copia-di-una-tabella, Python (${l})`, () => uguale(testoDi(python(copia, tetti, l, parole), "python"), copiaPython[l], `python (${l})`));
    test(`copia-di-una-tabella, C (${l})`, () => uguale(testoDi(c(copia, tetti, l, parole), "c"), copiaC[l], `c (${l})`));
  }
  const parole = paroleDelloPseudocodice("it");
  test("tabella-come-parametro, Python e C, col programma di prova della funzione che restituisce una tabella", () => {
    const p = progetto("tabella-come-parametro.algo");
    uguale(testoDi(python(p, tetti, "it", parole), "python"), comeParametroPython, "python");
    uguale(testoDi(c(p, tetti, "it", parole), "c"), comeParametroC, "c");
    const f = p.functions.find((x) => x.name === "alzata")!;
    const prova = { funzione: f.id, caso: f.test_cases![0]! };
    uguale(testoDi(python(p, tetti, "it", parole, prova), "prova python"), provaDiAlzataPython, "prova python");
    uguale(testoDi(c(p, tetti, "it", parole, prova), "prova c"), provaDiAlzataC, "prova c");
  });
  for (const l of ["it", "en"] as const satisfies readonly Lingua[])
    test(`il record ripetuto in ogni record di una tabella, nello pseudocodice (${l}): l'elenco dei campi fra graffe`, () => {
      const w = paroleDelloPseudocodice(l);
      const ripetuto: Progetto = {
        ...copia,
        functions: copia.functions.map((f) => ({ ...f, data: f.data.map((d) => (d.name === "t" ? { ...d, initial: { each: ['"x"', '"3A"', "0"] } } : d)) })),
      };
      const dichiarazione = righe(pseudocodice(ripetuto, tetti, w), "pseudocodice").find((r) => r.testo.trim().startsWith("t:"))!.testo.trim();
      expect(dichiarazione.endsWith(`← ${w.ogniElemento.split("{valore}").join('{"x", "3A", 0}')}`)).toBe(true);
      // Controllo positivo: il valore iniziale per record, lo stesso elenco di elenchi.
      const perRecord = righe(pseudocodice(copia, tetti, w), "pseudocodice").find((r) => r.testo.trim().startsWith("t:"))!.testo.trim();
      expect(perRecord.endsWith('← {{"Anna", "3A", 7}, {"Bruno", "3B", 5}}')).toBe(true);
    });

  test("le copie: il ciclo dei record con una riga per campo, un record della tabella una riga per campo; la riga corrente di ogni pausa", () => {
    const delPython = righe(python(copia, tetti, "it", parole), "python");
    const delC = righe(c(copia, tetti, "it", parole), "c");
    const delloPseudocodice = righe(pseudocodice(copia, tetti, parole), "pseudocodice");
    const di = (r: readonly Riga[]) => ({ b1: provenienzeDi(r, "b1"), b4: provenienzeDi(r, "b4") });
    expect({ pseudocodice: di(delloPseudocodice), python: di(delPython), c: di(delC) }).toEqual({
      pseudocodice: { b1: [...provenienzeDelleCopie.pseudocodice.b1], b4: [...provenienzeDelleCopie.pseudocodice.b4] },
      python: { b1: [...provenienzeDelleCopie.python.b1], b4: [...provenienzeDelleCopie.python.b4] },
      c: { b1: [...provenienzeDelleCopie.c.b1], b4: [...provenienzeDelleCopie.c.b4] },
    });
    const accese = (r: readonly Riga[], blocco: string, fase?: "inizio" | "condizione" | "elemento" | "passo", campo?: number) =>
      righeDi(r, { blocco, ...(fase !== undefined ? { fase } : {}), ...(campo !== undefined ? { campo } : {}) }).map((i) => r[i]!.testo.trim());
    // La pausa sul campo 1 di un record accende la sola riga di quel campo; il controllo la sua.
    expect(accese(delPython, "b1", "elemento", 1)).toEqual(["u[_indice].classe = t[_indice].classe"]);
    expect(accese(delC, "b1", "elemento", 2)).toEqual(["u[_indice].voto = t[_indice].voto;"]);
    expect(accese(delC, "b1", "condizione")).toEqual(["for (_indice = 0; _indice < 2; _indice++) {"]);
    expect(accese(delPython, "b4", undefined, 2)).toEqual(["r.voto = t[1].voto"]);
    // Lo pseudocodice la sua riga unica, a ogni pausa.
    expect(accese(delloPseudocodice, "b1", "elemento", 0)).toEqual(["u ← t"]);
    // Controllo positivo: senza la fase e il campo, il blocco della copia ha tutte le sue righe.
    expect(righeDi(delPython, { blocco: "b1" })).toHaveLength(6);
  });
});
