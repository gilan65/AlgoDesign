// La Lettura con la domanda: la regola che unisce una Scrittura alla Lettura che la segue solo se la console resta
// identica, la Scrittura che una domanda vuole, le coppie nelle sequenze annidate, il disegno su due righe coi punti della
// sequenza vera, e sul corpus intero il file e la console identici con la domanda rimostrata e riscritta.
//
// CHE COSA NON GUARDA: l'interfaccia (i campi, il passo, il punto e le modifiche nella finestra: prove dell'interfaccia e
// nei motori); le operazioni sui due blocchi (`core/modifica/domanda.test.ts`).
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../controllo/controllo";
import { eseguiCaso } from "../casi/esecutore";
import { cicliIt, funzioniIt } from "../esecuzione/testi-di-prova";
import { campi } from "../modifica/operazioni";
import { apri, salva } from "../progetto/formato";
import type { Blocco, Funzione, Progetto } from "../progetto/modello";
import { coppie, domandaDellaScrittura, scritturaDellaDomanda, type Domanda } from "./domanda";
import { impagina, opzioniPredefinite, type MisuraDelTesto, type TestiDelDisegno } from "./impaginazione";
import { geometriaPredefinita } from "./tema";

const scrittura = (values: string[], newline = false): Extract<Blocco, { kind: "write" }> => ({ id: "w", kind: "write", values, newline });

describe("la regola: la domanda solo se la console resta identica", () => {
  test("con l'a capo, i valori come sono (anche con lo spazio in fondo)", () => {
    expect(domandaDellaScrittura(scrittura(['"Voto?"'], true))).toEqual({ values: ['"Voto?"'], newline: true });
    expect(domandaDellaScrittura(scrittura(['"Voto: "', "n"], true))).toEqual({ values: ['"Voto: "', "n"], newline: true });
  });
  test("senza a capo, lo spazio in fondo all'ultimo testo o in un valore a sé non si mostra", () => {
    expect(domandaDellaScrittura(scrittura(['"Come ti chiami? "']))).toEqual({ values: ['"Come ti chiami?"'], newline: false, spazio: "finale" });
    expect(domandaDellaScrittura(scrittura(['"Voto di "', "nome", '" "']))).toEqual({ values: ['"Voto di "', "nome"], newline: false, spazio: "a sé" });
    // Il testo con le virgolette dentro: lo spazio è l'ultimo carattere del letterale.
    expect(domandaDellaScrittura(scrittura(['"Di \\"sì\\" "']))).toEqual({ values: ['"Di \\"sì\\""'], newline: false, spazio: "finale" });
  });
  test("senza a capo e senza uno spazio in fondo: nessuna domanda", () => {
    for (const values of [['"Anno:"'], ["n"], ['" "'], ['x + " "'], ['"a" + " "'], ["' '"], ['"a" ']])
      expect({ values, domanda: domandaDellaScrittura(scrittura(values)) }).toEqual({ values, domanda: undefined });
  });
});

describe("la Scrittura che una domanda vuole", () => {
  test("rimostrata dà la stessa domanda, anche nuova (lo spazio dove va)", () => {
    const domande: Domanda[] = [
      { values: ['"Voto?"'], newline: true },
      { values: ['"Voto?"'], newline: false },
      { values: ['"Voto di "', "nome"], newline: false },
      { values: ["n"], newline: false },
      { values: ['"Voto?"'], newline: false, spazio: "a sé" },
    ];
    for (const d of domande) {
      const w = scritturaDellaDomanda(d)!;
      const di = domandaDellaScrittura({ id: "w", kind: "write", ...w })!;
      expect({ d, di: { values: di.values, newline: di.newline } }).toEqual({ d, di: { values: d.values, newline: d.newline } });
    }
    expect(scritturaDellaDomanda({ values: ['"Voto?"'], newline: false })).toEqual({ values: ['"Voto? "'], newline: false });
    expect(scritturaDellaDomanda({ values: ["n"], newline: false })).toEqual({ values: ["n", '" "'], newline: false });
  });
  test("una domanda senza valori non vuole una Scrittura", () => {
    expect(scritturaDellaDomanda({ values: [], newline: false })).toBeUndefined();
    expect(scritturaDellaDomanda({ values: [], newline: true })).toBeUndefined();
  });
});

describe("le coppie nelle sequenze", () => {
  const w = (id: string, values: string[], newline = false): Blocco => ({ id, kind: "write", values, newline });
  const r = (id: string): Blocco => ({ id, kind: "read", target: "x" });
  test("solo la Scrittura subito prima; una Lettura dopo un'altra Lettura no; dentro i rami e i corpi", () => {
    const blocchi: Blocco[] = [
      w("b1", ['"A "']),
      r("b2"),
      r("b3"),
      w("b4", ['"B"']),
      w("b5", ['"C"'], true),
      r("b6"),
      { id: "b7", kind: "if", condition: "true", then: [w("b8", ['"D "']), r("b9")], else: [{ id: "b10", kind: "while", condition: "false", body: [w("b11", ['"E"'], true), r("b12")] }] },
      w("b13", ['"F "']),
      { id: "b14", kind: "comment", text: "" },
      r("b15"),
    ];
    expect([...coppie(blocchi).values()].map((c) => `${c.scrittura}→${c.lettura}`)).toEqual(["b1→b2", "b5→b6", "b8→b9", "b11→b12"]);
  });
});

// ---------------------------------------------------------------------------------------- il disegno

const testi: TestiDelDisegno = {
  inizio: "Inizio",
  fine: "Fine",
  leggi: "leggi",
  scrivi: "scrivi",
  vero: "Vero",
  falso: "Falso",
  aCapo: " ↵",
  ogniElemento: "{valore} in ogni elemento",
  altri: "… altri {n}",
  cicli: cicliIt,
  funzioni: funzioniIt,
};
const misura: MisuraDelTesto = (t) => [...t].length * 0.62 * geometriaPredefinita.carattere;
const conLaDomanda = { ...opzioniPredefinite, domanda: "nella-lettura" } as const;

/** I progetti del corpus, col loro nome. */
function corpus(): { nome: string; progetto: Progetto }[] {
  const radice = join(import.meta.dir, "..", "..", "casi");
  const fuori: { nome: string; progetto: Progetto }[] = [];
  const visita = (d: string) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) visita(p);
      else if (n.endsWith(".algo")) {
        const a = apri(readFileSync(p, "utf8"));
        if (a.ok) fuori.push({ nome: p.slice(radice.length + 1).replaceAll("\\", "/"), progetto: a.progetto });
      }
    }
  };
  visita(radice);
  return fuori;
}
const progetti = corpus();
const ilFile = progetti.find((x) => x.nome === "tappa-1/domanda-prima-della-lettura.algo")!.progetto;
const principale = (p: Progetto): Funzione => p.functions.find((f) => f.kind === "main")!;

describe("il disegno con la domanda", () => {
  test("la Lettura su due righe, la domanda sopra; la Scrittura senza un elemento suo; fra le due nessun punto", () => {
    const d = impagina(principale(ilFile), geometriaPredefinita, misura, testi, conLaDomanda);
    const unite = d.elementi.filter((e) => e.scrittura !== undefined).map((e) => ({ id: e.id, scrittura: e.scrittura, righe: e.righe }));
    expect(unite).toEqual([
      { id: "b4", scrittura: "b3", righe: ['"Come ti chiami?"', "leggi nome"] },
      { id: "b6", scrittura: "b5", righe: ['"Voto di ", nome', "leggi voto"] },
      { id: "b10", scrittura: "b9", righe: ['"Quanti debiti?" ↵', "leggi debiti"] },
    ]);
    // La Scrittura senza lo spazio resta un blocco a sé, e le Scritture unite non hanno un elemento.
    expect(d.elementi.some((e) => e.id === "b1" && e.forma === "scrittura")).toBe(true);
    expect(d.elementi.filter((e) => ["b3", "b5", "b9"].includes(e.id))).toEqual([]);
    // I punti: gli indici della sequenza vera, senza quello fra la Scrittura e la sua Lettura.
    const posti = (contenitore: string) => d.punti.filter((p) => p.posto.contenitore === contenitore).map((p) => p.posto.indice).sort((a, b) => a - b);
    expect(posti("f1")).toEqual([0, 1, 2, 4, 6, 7, 8]);
    expect(posti("b7").length).toBe(2 + 3);
    expect(d.punti.filter((p) => p.posto.ramo === "else").map((p) => p.posto.indice).sort()).toEqual([0, 2, 3]);
  });
  test("senza l'opzione il disegno è quello di sempre", () => {
    const d = impagina(principale(ilFile), geometriaPredefinita, misura, testi);
    expect(d.elementi.some((e) => e.scrittura !== undefined)).toBe(false);
    expect(d).toEqual(impagina(principale(ilFile), geometriaPredefinita, misura, testi, { ...opzioniPredefinite, domanda: "nella-scrittura" }));
  });
});

// ------------------------------------------------------------------------------ il corpus intero

describe("sul corpus: il file e la console identici", () => {
  // Ogni coppia della vista, con la sua Scrittura riscritta dalla domanda che mostra (ciò che fanno i campi confermati
  // senza cambiare la domanda): il file salvato è identico byte per byte, e ogni caso d'uso dà la stessa console.
  const conLeCoppie = progetti.map((x) => ({ ...x, coppie: x.progetto.functions.flatMap((f) => [...coppie(f.body).values()]) })).filter((x) => x.coppie.length > 0);
  test("il corpus ha coppie da provare (il controllo positivo: il file con le domande ne ha tre)", () => {
    const nel = conLeCoppie.find((x) => x.nome === "tappa-1/domanda-prima-della-lettura.algo");
    console.log(`coppie nel corpus: file ${progetti.length}, con coppie ${conLeCoppie.length}, coppie ${conLeCoppie.reduce((n, x) => n + x.coppie.length, 0)}`);
    expect(nel?.coppie.map((c) => c.scrittura)).toEqual(["b3", "b5", "b9"]);
  });
  for (const { nome, progetto, coppie: cs } of conLeCoppie) {
    test(`${nome}: la domanda riscritta lascia il file e la console come sono`, () => {
      let riscritto = progetto;
      for (const c of cs) {
        const w = scritturaDellaDomanda(c.domanda)!;
        const r = campi(c.scrittura, w)(riscritto, 1000);
        if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
        riscritto = r.progetto;
      }
      expect(salva(riscritto)).toBe(salva(progetto));
      const consoleDi = (p: Progetto) => (p.test_cases ?? []).map((caso) => {
        const e = eseguiCaso(p, caso, tetti);
        return e.fuoriTappa ? "fuori tappa" : e.ottenuto.output;
      });
      const prima = consoleDi(progetto);
      expect(prima.length).toBeGreaterThan(0);
      expect(consoleDi(riscritto)).toEqual(prima);
    });
  }
});
