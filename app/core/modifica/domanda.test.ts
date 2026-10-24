// Le modifiche della Lettura con la domanda: la coppia si inserisce (una domanda scritta su una Lettura che non l'aveva),
// si sposta, si copia, si elimina e si annulla INSIEME, in un passo solo, con gli indici della sequenza vera; la domanda
// cambiata riscrive la Scrittura con lo spazio nella forma che aveva, quella tolta la elimina.
//
// CHE COSA NON GUARDA: la regola delle coppie e il disegno (`core/disegno/domanda.test.ts`); i campi e i gesti
// nell'interfaccia (prove dell'interfaccia e nei motori).
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coppie, type Coppia } from "../disegno/domanda";
import { apri, salva } from "../progetto/formato";
import type { Blocco, Progetto } from "../progetto/modello";
import { annulla, applica, inizia } from "./cronologia";
import { campiConLaDomanda, conLeCoppie, incollaDiSeguito, trattoDellaVista } from "./domanda";
import { eliminaTratto, spostaTratto, trova, type Operazione, type Posto, type Tratto } from "./operazioni";

const aperto = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", "tappa-1", "domanda-prima-della-lettura.algo"), "utf8"));
if (!aperto.ok) throw new Error("domanda-prima-della-lettura.algo");
const p0: Progetto = aperto.progetto;
const corpo = (p: Progetto): readonly Blocco[] => p.functions[0]!.body;
const ids = (bs: readonly Blocco[]) => bs.map((b) => b.id);
const coppia = (p: Progetto, lettura: string): Coppia => coppie(corpo(p)).get(lettura)!;

/** L'operazione in un passo: il progetto nuovo, e Annulla che riporta il file di prima byte per byte. */
function unPasso(op: Operazione, p = p0): Progetto {
  const c = inizia(p);
  const e = applica(c, op);
  if (!e.ok) throw new Error(JSON.stringify(e.rifiuto));
  expect(e.cronologia.passato.length).toBe(1);
  expect(salva(annulla(e.cronologia).presente)).toBe(salva(p));
  return e.cronologia.presente;
}

describe("la coppia insieme", () => {
  const vista = coppie(corpo(p0));
  /** Il tratto della coppia della Lettura `lettura`, come lo dà la vista. */
  const dellaCoppia = (lettura: string): Tratto => trattoDellaVista(p0, lettura, lettura, vista)!;
  const sposta = (t: Tratto, indice: number, contenitore = "f1", ramo: Posto["ramo"] = "body") => spostaTratto(t, { contenitore, ramo, indice });
  test("il tratto di una Lettura con la domanda prende la Scrittura prima; finito su una Scrittura, la Lettura dopo", () => {
    expect(coppia(p0, "b4").scrittura).toBe("b3");
    expect(dellaCoppia("b4")).toEqual({ contenitore: "f1", ramo: "body", da: 2, a: 3 });
    // Dalla prima assegnazione alla Scrittura «b5»: la sua Lettura entra con lei.
    expect(conLeCoppie(p0, { contenitore: "f1", ramo: "body", da: 0, a: 4 }, vista)).toEqual({ contenitore: "f1", ramo: "body", da: 0, a: 5 });
    // Senza coppie (la casella spenta) il tratto resta com'è.
    expect(conLeCoppie(p0, { contenitore: "f1", ramo: "body", da: 3, a: 4 }, new Map())).toEqual({ contenitore: "f1", ramo: "body", da: 3, a: 4 });
  });
  test("elimina la Scrittura e la Lettura in un passo", () => {
    const q = unPasso(eliminaTratto(dellaCoppia("b4")));
    expect(ids(corpo(q))).toEqual(["b1", "b2", "b5", "b6", "b7", "b12"]);
  });
  test("sposta: la Scrittura e subito dopo la Lettura, col posto contato sul progetto di prima, in giù, in su e in un ramo", () => {
    const t = dellaCoppia("b4");
    expect(ids(corpo(unPasso(sposta(t, 6))))).toEqual(["b1", "b2", "b5", "b6", "b3", "b4", "b7", "b12"]);
    expect(ids(corpo(unPasso(sposta(t, 0))))).toEqual(["b3", "b4", "b1", "b2", "b5", "b6", "b7", "b12"]);
    const nelRamo = unPasso(sposta(t, 1, "b7", "then"));
    const se = corpo(nelRamo).find((b) => b.id === "b7") as Extract<Blocco, { kind: "if" }>;
    expect(ids(se.then)).toEqual(["b8", "b3", "b4"]);
  });
  test("sposta subito prima o subito dopo sé stessa: il progetto non cambia (nessun passo)", () => {
    const t = dellaCoppia("b4");
    for (const indice of [2, 3, 4]) {
      const r = sposta(t, indice)(p0, 100);
      expect(r.ok && r.progetto === p0).toBe(true);
    }
  });
  test("incolla una copia della coppia, di seguito, con identificatori nuovi", () => {
    const c = coppia(p0, "b6");
    const blocchi = [trova(p0, c.scrittura)!, trova(p0, c.lettura)!];
    const q = unPasso(incollaDiSeguito(blocchi, { contenitore: "f1", ramo: "body", indice: 7 }));
    const nuovi = corpo(q).slice(7, 9);
    expect(nuovi.map((b) => b.kind)).toEqual(["write", "read"]);
    expect(nuovi.map((b) => ({ ...b, id: "" }))).toEqual(blocchi.map((b) => ({ ...b, id: "" })));
    expect(nuovi.some((b) => ["b5", "b6"].includes(b.id))).toBe(false);
    // La copia è una coppia anche lei.
    expect(coppie(corpo(q)).get(nuovi[1]!.id)?.scrittura).toBe(nuovi[0]!.id);
  });
});

describe("i campi della domanda", () => {
  const leggiNome = { target: "nome" };
  test("la domanda di prima non tocca la Scrittura: la Lettura sola", () => {
    const q = unPasso(campiConLaDomanda("b4", { target: "cognome" }, { values: ['"Come ti chiami?"'], newline: false }, coppia(p0, "b4")));
    expect(trova(q, "b3")).toEqual(trova(p0, "b3"));
    expect(trova(q, "b4")).toEqual({ id: "b4", kind: "read", target: "cognome" });
  });
  test("cambiata, la Scrittura si riscrive con lo spazio dove stava (in fondo al testo, o a sé)", () => {
    const q = unPasso(campiConLaDomanda("b4", leggiNome, { values: ['"Nome?"'], newline: false }, coppia(p0, "b4")));
    expect(trova(q, "b3")).toEqual({ id: "b3", kind: "write", values: ['"Nome? "'], newline: false });
    const r = unPasso(campiConLaDomanda("b6", { target: "voto" }, { values: ['"Il voto di "', "nome"], newline: false }, coppia(p0, "b6")));
    expect(trova(r, "b5")).toEqual({ id: "b5", kind: "write", values: ['"Il voto di "', "nome", '" "'], newline: false });
    const s = unPasso(campiConLaDomanda("b4", leggiNome, { values: ['"Nome?"'], newline: true }, coppia(p0, "b4")));
    expect(trova(s, "b3")).toEqual({ id: "b3", kind: "write", values: ['"Nome?"'], newline: true });
  });
  test("tolta (nessun valore), la Scrittura si elimina", () => {
    const q = unPasso(campiConLaDomanda("b4", leggiNome, { values: [], newline: false }, coppia(p0, "b4")));
    expect(ids(corpo(q))).toEqual(["b1", "b2", "b4", "b5", "b6", "b7", "b12"]);
  });
  test("scritta su una Lettura senza domanda: una Scrittura nuova subito prima, che la vista unisce (la coppia inserita)", () => {
    // b2 legge dopo una Scrittura senza lo spazio, che resta un blocco a sé: la domanda nuova le sta in mezzo.
    expect(coppie(corpo(p0)).has("b2")).toBe(false);
    const q = unPasso(campiConLaDomanda("b2", { target: "anno" }, { values: ['"In che anno?"'], newline: false }, undefined));
    const s = corpo(q);
    expect(s.map((b) => b.kind).slice(0, 3)).toEqual(["write", "write", "read"]);
    expect(s[1]).toMatchObject({ kind: "write", values: ['"In che anno? "'], newline: false });
    expect(coppie(s).get("b2")?.scrittura).toBe(s[1]!.id);
  });
  test("una domanda vuota su una Lettura senza domanda: la Lettura sola", () => {
    const q = unPasso(campiConLaDomanda("b2", { target: "n" }, { values: [], newline: false }, undefined));
    expect(ids(corpo(q))).toEqual(ids(corpo(p0)));
  });
});
