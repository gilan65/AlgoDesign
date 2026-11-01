// La conferma delle mutazioni dell'interprete: l'impronta che le fa rifare quando la cartella cambia, e la lettura del
// report. Che cosa queste prove NON guardano: che le mutazioni siano rosse (lo prova `bun run mutazioni`, ognuna contro il
// corpus), e che la porta del collaudo chiami questi confronti.

import { describe, expect, test } from "bun:test";
import { fileDellInterprete, improntaDi, leggiLaConferma, proveDelReport, variabileDelleMutazioni } from "./mutazioni";

describe("l'impronta dell'interprete", () => {
  const due = [
    { nome: "a.ts", testo: "uno\ntwo\n" },
    { nome: "b.ts", testo: "tre\n" },
  ];
  test("cambia con un byte di un file, col nome di un file e con un file in più", () => {
    const base = improntaDi(due);
    expect(improntaDi([{ nome: "a.ts", testo: "uno\ntwo!\n" }, due[1]!])).not.toBe(base);
    expect(improntaDi([{ nome: "c.ts", testo: "uno\ntwo\n" }, due[1]!])).not.toBe(base);
    expect(improntaDi([...due, { nome: "d.ts", testo: "" }])).not.toBe(base);
  });
  test("non dipende dall'ordine dei file né dalle fini riga", () => {
    const base = improntaDi(due);
    expect(improntaDi([...due].reverse())).toBe(base);
    expect(improntaDi([{ nome: "a.ts", testo: "uno\r\ntwo\r\n" }, due[1]!])).toBe(base);
  });
  test("guarda il sorgente e le prove dell'interprete", () => {
    const nomi = fileDellInterprete().map((f) => f.nome);
    expect(nomi).toContain("core/interprete/interprete.ts");
    expect(nomi).toContain("core/interprete/interprete.test.ts");
  });
});

test("una corsa normale non definisce le mutazioni: la variabile è fuori dall'ambiente delle prove", () => {
  expect(process.env[variabileDelleMutazioni]).toBeUndefined();
});

test("la conferma registrata ha un'impronta e almeno una mutazione", () => {
  const c = leggiLaConferma();
  expect(c?.impronta).toMatch(/^[0-9a-f]{64}$/);
  expect(c?.mutazioni).toBeGreaterThan(0);
});

test("il report: le prove lasciate fuori dal filtro non contano, le fallite sì", () => {
  const xml = `<testsuite><testcase name="a &amp; b" /><testcase name="fuori"><skipped /></testcase><testcase name="rossa"><failure type="x"/></testcase></testsuite>`;
  expect(proveDelReport(xml)).toEqual({ eseguite: ["a & b", "rossa"], fallite: ["rossa"] });
});
