// Le matrici nei linguaggi del registro: ogni generatore scrive ogni progetto giusto della cartella dei tipi (e il
// programma di prova di ogni caso di una funzione), e un progetto con un errore statico resta con gli errori. Il codice di
// due file del corpus contro gli attesi scritti a mano (`attesi-delle-matrici.ts`), con la provenienza della copia di
// una matrice: due cicli, le righe di quello delle colonne `interno`, e la riga corrente di ogni pausa.
//
// Che cosa queste prove NON guardano: che il codice generato dia l'output dell'interprete, e che nessuna copia sia un
// alias (lo prova il differenziale, che esegue i programmi); «Accademico», che ha la sua prova (`accademico.test.ts`).

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
import { typescript } from "../../core/genera/typescript";
import { apri } from "../../core/progetto/formato";
import { usaLeMatrici, usaLeTabelle, type Progetto } from "../../core/progetto/modello";
import type { Lingua } from "../../i18n/lingue";
import {
  comeParametroC,
  comeParametroPython,
  copiaC,
  copiaPseudocodice,
  copiaPython,
  provaDellaTraspostaC,
  provaDellaTraspostaPython,
  provenienzeDellaCopia,
} from "./attesi-delle-matrici";
import { paroleDelloPseudocodice } from "./parole";

const cartella = join(import.meta.dir, "..", "..", "casi", "tipi");
const progetto = (nome: string): Progetto => {
  const a = apri(readFileSync(join(cartella, nome), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
const file = readdirSync(cartella).filter((f) => f.endsWith(".algo") && usaLeMatrici(progetto(f)));

test("ogni linguaggio scrive le matrici: generato il progetto giusto, con gli errori quello sbagliato, ciò che manca in «Accademico», su ogni file della cartella", () => {
  const esiti = file.map((nome) => {
    const p = progetto(nome);
    const k = controlla(p, tetti);
    const atteso = !k.fuoriTappa && k.errori.length > 0 ? "errori-statici" : "generato";
    const ottenuti = linguaggi.map((v) => {
      const g = v.genera(p, tetti, "it", paroleDelloPseudocodice("it"), undefined);
      return g.generato ? "generato" : g.perche;
    });
    // «Accademico» non ha le matrici: per lui il progetto giusto non ci sta.
    // Il TypeScript scrive le matrici, non ancora le tabelle: per lui il progetto giusto che ne ha una è «non ancora».
    const giusto = linguaggi.every((v, i) => ottenuti[i] === (atteso === "generato" && v.id === "accademico" ? "non-ci-sta" : atteso === "generato" && v.id === "typescript" && usaLeTabelle(p) ? "non-ancora" : atteso));
    return { nome, giusto, atteso, ottenuti };
  });
  expect(esiti.filter((e) => !e.giusto)).toEqual([]);
  // Controllo positivo dei denominatori: nove file giusti e quattro sbagliati, ognuno per ogni linguaggio.
  const giustiESbagliati = [esiti.filter((e) => e.atteso === "generato").length, esiti.filter((e) => e.atteso === "errori-statici").length];
  expect(giustiESbagliati).toEqual(confermato("matrici - file giusti e sbagliati", giustiESbagliati));
  expect(linguaggi.length).toBe(5);
});

test("il programma di prova di ogni caso di una funzione con le matrici si genera in ogni linguaggio da eseguire", () => {
  const casi = file.flatMap((nome) => {
    const p = progetto(nome);
    const k = controlla(p, tetti);
    if (k.fuoriTappa || k.errori.length > 0) return [];
    return p.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ nome: `${nome}#${f.name}/${caso.name}`, p, f, caso })));
  });
  const daEseguire = linguaggi.filter((v) => v.genere === "da-eseguire");
  const rifiutati = casi.flatMap(({ nome, p, f, caso }) => daEseguire.flatMap((v) => (v.genera(p, tetti, "it", paroleDelloPseudocodice("it"), { funzione: f.id, caso }).generato ? [] : [`${nome} ${v.id}`])));
  // Il TypeScript rifiuta solo quelli di un progetto con una tabella: le matrici le sa scrivere, le tabelle non ancora.
  expect(rifiutati).toEqual(casi.filter(({ p }) => usaLeTabelle(p)).map(({ nome }) => `${nome} typescript`));
  // Controllo positivo: i casi delle funzioni della cartella sono cinque (totale, azzera_riga, trasposta, raddoppia,
  // riempi), ognuno per due linguaggi.
  expect(casi.length).toBe(confermato("matrici - casi delle funzioni della cartella", casi.length));
  expect(daEseguire.length).toBe(3);
});

test("nel C, una stringa copiata dallo stesso dato con indici diversi nel testo va con `memmove`: a runtime può essere la stessa cella", () => {
  // La diagonale di `m[i][j] ← m[j][i]` (b3) e la riga `m[i] ← m[j]` con i uguale a j (b7): `strcpy` di una stringa su sé
  // stessa non ha regola (AddressSanitizer: `strcpy-param-overlap`), `memmove` sì.
  const delBlocco = (nome: string, blocco: string) => righe(c(progetto(nome), tetti, "it", paroleDelloPseudocodice("it")), nome).filter((x) => x.blocco === blocco && /\b(strcpy|memmove)\(/.test(x.testo)).map((x) => x.testo.trim());
  for (const blocco of ["b3", "b7"]) {
    const copie = delBlocco("diagonale-di-stringhe.algo", blocco);
    expect({ blocco, copie: copie.length > 0, tutteMemmove: copie.every((x) => x.startsWith("memmove(")) }).toEqual({ blocco, copie: true, tutteMemmove: true });
  }
  // Controllo positivo: fra due matrici diverse resta `strcpy` (la copia di `s` in `t`, coi controlli della lunghezza).
  expect(delBlocco("righe-calcolate.algo", "b10")).toEqual(["strcpy(t[_indice][_indice2], al_piu(s[_indice][_indice2], 3));"]);
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
/** Le fasi delle righe del blocco, una voce per riga: `+` per quelle del ciclo delle colonne. */
const fasiDi = (r: readonly Riga[], blocco: string) => r.flatMap((x) => (x.blocco !== blocco ? [] : [(x.fasi ?? []).map((f) => `${f}${x.interno === true ? "+" : ""}`).join(" ")]));

describe("il codice delle matrici uguale all'atteso scritto a mano", () => {
  const copia = progetto("copia-di-una-matrice.algo");
  for (const l of ["it", "en"] as const satisfies readonly Lingua[]) {
    const parole = paroleDelloPseudocodice(l);
    test(`copia-di-una-matrice, pseudocodice (${l})`, () => uguale(testoDi(pseudocodice(copia, tetti, parole), "pseudocodice"), copiaPseudocodice[l], `pseudocodice (${l})`));
    test(`copia-di-una-matrice, Python (${l})`, () => uguale(testoDi(python(copia, tetti, l, parole), "python"), copiaPython[l], `python (${l})`));
    test(`copia-di-una-matrice, C (${l})`, () => uguale(testoDi(c(copia, tetti, l, parole), "c"), copiaC[l], `c (${l})`));
  }
  const parole = paroleDelloPseudocodice("it");
  test("matrice-come-parametro, Python e C, col programma di prova della funzione che restituisce una matrice", () => {
    const p = progetto("matrice-come-parametro.algo");
    uguale(testoDi(python(p, tetti, "it", parole), "python"), comeParametroPython, "python");
    uguale(testoDi(c(p, tetti, "it", parole), "c"), comeParametroC, "c");
    const f = p.functions.find((x) => x.name === "trasposta")!;
    const prova = { funzione: f.id, caso: f.test_cases![0]! };
    uguale(testoDi(python(p, tetti, "it", parole, prova), "prova python"), provaDellaTraspostaPython, "prova python");
    uguale(testoDi(c(p, tetti, "it", parole, prova), "prova c"), provaDellaTraspostaC, "prova c");
  });
  test("la copia col nome: due cicli nel Python, nel C e nel TypeScript, una riga nello pseudocodice; la riga corrente di ogni pausa", () => {
    const delPython = righe(python(copia, tetti, "it", parole), "python");
    const delC = righe(c(copia, tetti, "it", parole), "c");
    const delTypeScript = righe(typescript(copia, tetti, "it", parole), "typescript");
    const delloPseudocodice = righe(pseudocodice(copia, tetti, parole), "pseudocodice");
    expect({ pseudocodice: fasiDi(delloPseudocodice, "b1"), python: fasiDi(delPython, "b1"), c: fasiDi(delC, "b1"), typescript: fasiDi(delTypeScript, "b1") }).toEqual({
      pseudocodice: [...provenienzeDellaCopia.pseudocodice],
      python: [...provenienzeDellaCopia.python],
      c: [...provenienzeDellaCopia.c],
      typescript: [...provenienzeDellaCopia.typescript],
    });
    const accese = (r: readonly Riga[], fase: "inizio" | "condizione" | "elemento" | "passo", interno?: true) =>
      righeDi(r, { blocco: "b1", fase, ...(interno ? { interno } : {}) }).map((i) => r[i]!.testo.trim());
    // La pausa sul controllo delle righe e su quello delle colonne accendono righe diverse; l'elemento la sua.
    expect(accese(delPython, "condizione")).toEqual(["while _indice < 2:"]);
    expect(accese(delPython, "condizione", true)).toEqual(["while _indice2 < 2:"]);
    expect(accese(delC, "elemento", true)).toEqual(["b[_indice][_indice2] = a[_indice][_indice2];"]);
    expect(accese(delTypeScript, "condizione", true)).toEqual(["while (_indice2 < 2) {"]);
    expect(accese(delTypeScript, "elemento", true)).toEqual(["b[_indice][_indice2] = a[_indice][_indice2];"]);
    expect(accese(delC, "passo")).toEqual(["for (_indice = 0; _indice < 2; _indice++)"]);
    // Lo pseudocodice la sua riga unica, a ogni pausa.
    expect(accese(delloPseudocodice, "passo", true)).toEqual(["b ← a"]);
    // Controllo positivo: senza la fase, il blocco della copia ha tutte le sue righe.
    expect(righeDi(delPython, { blocco: "b1" })).toHaveLength(7);
  });
});
