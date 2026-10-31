// L'importazione di procedure e funzioni da un altro progetto. Gli attesi sono scritti a mano su una piccola libreria
// (`libreria`: `saluta`, `doppio` che usa la costante comune `K`, `quadruplo` che chiama due volte `doppio`, `stampa` che
// chiama `saluta`) e su piccoli programmi scritti qui; in fondo, il file del corpus nato da un'importazione.
//
// Che cosa NON guarda: le regole di validità che il controllo segnala dopo l'importazione (le provano le sue prove).

import { describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apri, leggi, salva } from "../progetto/formato";
import { opzioniPredefinite, type Progetto } from "../progetto/modello";
import { annulla, applica, inizia } from "./cronologia";
import { primoLibero } from "./identificatori";
import * as rinomina from "./rinomina";
import { importa, omonimeDopoLaPrima, opzioniDiverse, riepilogoDellImportazione, type Scelta } from "./importa";

type Json = any;

function progetto(v: Json): Progetto {
  const e = leggi(v);
  if (!e.ok) throw new Error(JSON.stringify(e.errori));
  return e.progetto;
}

const conN: Json = { name: "n", type: "integer", parameter: "value" };

const libreria = progetto({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "libreria", library: true },
  shared_constants: [{ name: "K", type: "integer", constant: true, initial: "2" }],
  functions: [
    { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
    { id: "f2", kind: "procedure", name: "saluta", data: [], body: [{ id: "b2", kind: "write", values: ['"ciao"'], newline: true }], end: { id: "b3" } },
    {
      id: "f3",
      kind: "function",
      name: "doppio",
      return_type: "integer",
      data: [conN],
      body: [],
      end: { id: "b4", return_value: "n * K" },
      test_cases: [{ name: "tre", inputs: [{ data: "n", text: "3" }], expected: { output: "6\n" } }],
    },
    {
      id: "f4",
      kind: "function",
      name: "quadruplo",
      return_type: "integer",
      data: [conN],
      body: [],
      end: { id: "b5", return_value: "doppio(doppio(n))" },
      test_cases: [
        { name: "grande", inputs: [{ data: "n", text: "2000000000" }], expected: { output: "", error: { code: "integer_overflow", block: "b4" } } },
        { name: "due", inputs: [{ data: "n", text: "2" }], expected: { output: "8\n", warnings: [{ code: "unused_value", block: "b5" }] } },
      ],
    },
    {
      id: "f5",
      kind: "procedure",
      name: "stampa",
      data: [{ name: "x", type: "integer", parameter: "value" }],
      body: [
        { id: "b6", kind: "call", callee: "saluta", arguments: [] },
        { id: "b7", kind: "write", values: ["x"], newline: true, breakpoint: true },
      ],
      end: { id: "b8" },
    },
  ],
});

/** Il programma: il principale con il dato `x` e l'assegnazione `x ← valore`, più ciò che si aggiunge. */
const programma = (o: { valore?: string; dati?: Json[]; funzioni?: Json[]; costanti?: Json[] } = {}): Progetto =>
  progetto({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "programma" },
    ...(o.costanti && { shared_constants: o.costanti }),
    functions: [
      { id: "f1", kind: "main", data: [{ name: "x", type: "integer" }, ...(o.dati ?? [])], body: [{ id: "b1", kind: "assignment", target: "x", value: o.valore ?? "3" }], end: { id: "b2" } },
      ...(o.funzioni ?? []),
    ],
  });

const K = (valore: string): Json => ({ name: "K", type: "integer", constant: true, initial: valore });
/** `doppio` com'è nella libreria, con altri identificatori e senza i casi. */
const doppioUguale: Json = { id: "f7", kind: "function", name: "doppio", return_type: "integer", data: [conN], body: [], end: { id: "b9", return_value: "n * K" } };
/** Un'altra `doppio`, col suo caso d'uso. */
const doppioDiverso = (tipo = "integer"): Json => ({
  id: "f2",
  kind: "function",
  name: "doppio",
  return_type: "integer",
  data: [{ name: "n", type: tipo, parameter: "value" }],
  body: [],
  end: { id: "b3", return_value: "n + n" },
  test_cases: [{ name: "uno", inputs: [{ data: "n", text: "1" }], expected: { output: "2\n" } }],
});

/** Il progetto dopo l'importazione, che deve applicarsi, restare uguale salvato e riaperto, e dare `prossimo`. */
function dopo(p: Progetto, spuntate: readonly string[], conCasi: boolean, scelte: ReadonlyMap<string, Scelta> = new Map(), prossimo?: number): Progetto {
  const r = importa(libreria, spuntate, { conCasi, scelte })(p, primoLibero(p));
  if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
  const riletto = apri(salva(r.progetto));
  expect(riletto.ok && riletto.progetto).toEqual(r.progetto);
  if (prossimo !== undefined) expect(r.prossimo).toBe(prossimo);
  return r.progetto;
}

const casiDiQuadruplo = (grande: string, due: string): Json[] => [
  { name: "grande", inputs: [{ data: "n", text: "2000000000" }], expected: { output: "", error: { code: "integer_overflow", block: grande } } },
  { name: "due", inputs: [{ data: "n", text: "2" }], expected: { output: "8\n", warnings: [{ code: "unused_value", block: due } ] } },
];
const casoDiDoppio: Json[] = [{ name: "tre", inputs: [{ data: "n", text: "3" }], expected: { output: "6\n" } }];

describe("che cosa entra", () => {
  test("la scelta, ciò che chiama e la costante comune che usa, in fondo e nell'ordine della libreria", () => {
    const p = programma();
    expect(riepilogoDellImportazione(p, libreria, ["f4"])).toEqual({
      voci: [
        { chiave: "f:f3", genere: "function", nome: "doppio", perche: { come: "chiamata", da: "quadruplo" }, stato: "nuova", casi: 1 },
        { chiave: "f:f4", genere: "function", nome: "quadruplo", perche: { come: "scelta" }, stato: "nuova", casi: 2 },
        { chiave: "c:K", genere: "constant", nome: "K", perche: { come: "usata", da: "doppio" }, stato: "nuova" },
      ],
      datiCheUrtano: [],
    });
    const q = dopo(p, ["f4"], true, new Map(), 5);
    expect(q.shared_constants).toEqual([K("2")]);
    expect(q.functions.slice(1)).toEqual([
      { id: "f2", kind: "function", name: "doppio", return_type: "integer", data: [conN], body: [], end: { id: "b3", return_value: "n * K" }, test_cases: casoDiDoppio },
      // L'errore atteso sulla fine di `doppio` segue `doppio`; l'avviso sulla sua fine, `quadruplo`.
      { id: "f3", kind: "function", name: "quadruplo", return_type: "integer", data: [conN], body: [], end: { id: "b4", return_value: "doppio(doppio(n))" }, test_cases: casiDiQuadruplo("b3", "b4") },
    ]);
    // Il programma non cambia.
    expect(q.functions[0]).toEqual(p.functions[0]!);
  });

  test("gli avvisi attesi della sorgente su ciò che non entra non entrano; senza niente da importare il progetto è lo stesso", () => {
    // Il caso «due» di `quadruplo` attende anche un avviso sul programma principale della libreria, che non entra.
    const conAvvisoFuori: Progetto = {
      ...libreria,
      functions: libreria.functions.map((f) =>
        f.id !== "f4" ? f : { ...f, test_cases: [{ name: "due", inputs: [{ data: "n", text: "2" }], expected: { output: "8\n", warnings: [{ code: "unused_data", block: "f1" }, { code: "unused_value", block: "b5" }] } }] },
      ),
    };
    const p = programma();
    const r = importa(conAvvisoFuori, ["f4"], { conCasi: true })(p, primoLibero(p));
    if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
    const quadruplo = r.progetto.functions.find((f) => f.name === "quadruplo")!;
    // Solo l'avviso sulla fine di `quadruplo`, che entra; con un solo avviso fuori, l'atteso non ne ha.
    const soloFuori: Progetto = { ...libreria, functions: libreria.functions.map((f) => (f.id !== "f4" ? f : { ...f, test_cases: [{ name: "due", inputs: [], expected: { output: "", warnings: [{ code: "unused_data", block: "f1" }] } }] })) };
    const s = importa(soloFuori, ["f4"], { conCasi: true })(p, primoLibero(p));
    if (!s.ok) throw new Error(JSON.stringify(s.rifiuto));
    // Niente da importare: `saluta` c'è già identica nel programma che la riceve dalla libreria stessa.
    const conSaluta = dopo(p, ["f2"], true);
    const niente = importa(libreria, ["f2"], { conCasi: true })(conSaluta, primoLibero(conSaluta));
    expect({
      avvisi: quadruplo.test_cases![0]!.expected.warnings,
      soloFuori: "warnings" in s.progetto.functions.find((f) => f.name === "quadruplo")!.test_cases![0]!.expected,
      niente: niente.ok && niente.progetto === conSaluta,
    }).toEqual({ avvisi: [{ code: "unused_value", block: quadruplo.end.id }], soloFuori: false, niente: true });
  });

  test("senza i casi d'uso; mai il programma principale della libreria", () => {
    const q = dopo(programma(), ["f4"], false);
    expect(q.functions.map((f) => [f.id, f.name, f.test_cases])).toEqual([
      ["f1", undefined, undefined],
      ["f2", "doppio", undefined],
      ["f3", "quadruplo", undefined],
    ]);
    expect(q.test_cases).toBeUndefined();
  });

  test("una procedura chiamata da un salto; i punti d'interruzione non entrano", () => {
    expect(riepilogoDellImportazione(programma(), libreria, ["f5"]).voci.map((v) => [v.nome, v.perche])).toEqual([
      ["saluta", { come: "chiamata", da: "stampa" }],
      ["stampa", { come: "scelta" }],
    ]);
    const q = dopo(programma(), ["f5"], true, new Map(), 8);
    expect(q.functions.slice(1)).toEqual([
      { id: "f2", kind: "procedure", name: "saluta", data: [], body: [{ id: "b3", kind: "write", values: ['"ciao"'], newline: true }], end: { id: "b4" } },
      {
        id: "f3",
        kind: "procedure",
        name: "stampa",
        data: [{ name: "x", type: "integer", parameter: "value" }],
        body: [
          { id: "b5", kind: "call", callee: "saluta", arguments: [] },
          { id: "b6", kind: "write", values: ["x"], newline: true },
        ],
        end: { id: "b7" },
      },
    ]);
    expect(q.shared_constants).toBeUndefined();
  });

  test("una procedura o funzione che non c'è, o il programma principale, non si importa", () => {
    expect(importa(libreria, ["f9"], { conCasi: true })(programma(), 3)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
    expect(importa(libreria, ["f1"], { conCasi: true })(programma(), 3)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
  });
});

describe("identiche", () => {
  test("ciò che c'è già uguale (i casi d'uso a parte) non entra, e gli attesi che la nominano vanno a quella del programma", () => {
    const p = programma({ costanti: [K("2")], funzioni: [doppioUguale] });
    expect(riepilogoDellImportazione(p, libreria, ["f4"]).voci).toEqual([
      { chiave: "f:f3", genere: "function", nome: "doppio", perche: { come: "chiamata", da: "quadruplo" }, stato: "identica", casi: 1 },
      { chiave: "f:f4", genere: "function", nome: "quadruplo", perche: { come: "scelta" }, stato: "nuova", casi: 2 },
    ]);
    const q = dopo(p, ["f4"], true, new Map(), 11);
    expect(q.shared_constants).toEqual([K("2")]);
    expect(q.functions.slice(1)).toEqual([
      doppioUguale,
      { id: "f8", kind: "function", name: "quadruplo", return_type: "integer", data: [conN], body: [], end: { id: "b10", return_value: "doppio(doppio(n))" }, test_cases: casiDiQuadruplo("b9", "b10") },
    ]);
  });

  test("uguale lei ma con una costante diversa: è un conflitto, e la rinomina segue nei nomi dentro ciò che entra", () => {
    const p = programma({ costanti: [K("3")], funzioni: [doppioUguale] });
    expect(riepilogoDellImportazione(p, libreria, ["f4"]).voci).toEqual([
      {
        chiave: "f:f3",
        genere: "function",
        nome: "doppio",
        perche: { come: "chiamata", da: "quadruplo" },
        stato: "conflitto",
        casi: 1,
        specie: "stessa",
        proposto: "doppio_2",
        scelta: { come: "rinomina", nome: "doppio_2" },
        firmaDiversa: false,
        casiEliminati: 0,
      },
      { chiave: "f:f4", genere: "function", nome: "quadruplo", perche: { come: "scelta" }, stato: "nuova", casi: 2 },
      { chiave: "c:K", genere: "constant", nome: "K", perche: { come: "usata", da: "doppio" }, stato: "conflitto", specie: "stessa", proposto: "K_2", scelta: { come: "rinomina", nome: "K_2" } },
    ]);
    const q = dopo(p, ["f4"], true, new Map(), 12);
    expect(q.shared_constants).toEqual([K("3"), { ...K("2"), name: "K_2" }]);
    expect(q.functions.slice(1)).toEqual([
      doppioUguale,
      { id: "f8", kind: "function", name: "doppio_2", return_type: "integer", data: [conN], body: [], end: { id: "b10", return_value: "n * K_2" }, test_cases: casoDiDoppio },
      { id: "f9", kind: "function", name: "quadruplo", return_type: "integer", data: [conN], body: [], end: { id: "b11", return_value: "doppio_2(doppio_2(n))" }, test_cases: casiDiQuadruplo("b10", "b11") },
    ]);
  });

  test("il nome rinominato è modificabile", () => {
    const p = programma({ costanti: [K("3")], funzioni: [doppioUguale] });
    const scelte = new Map<string, Scelta>([
      ["f:f3", { come: "rinomina", nome: "per_due" }],
      ["c:K", { come: "rinomina", nome: "DUE" }],
    ]);
    const q = dopo(p, ["f4"], false, scelte);
    expect(q.shared_constants!.map((c) => c.name)).toEqual(["K", "DUE"]);
    expect(q.functions.map((f) => [f.name, f.end.return_value])).toEqual([
      [undefined, undefined],
      ["doppio", "n * K"],
      ["per_due", "n * DUE"],
      ["quadruplo", "per_due(per_due(n))"],
    ]);
  });
});

describe("conflitti", () => {
  test("sostituisci quella del programma: al suo posto, i suoi casi sono eliminati, le sue chiamate vanno alla nuova", () => {
    const p = programma({ valore: "doppio(3)", funzioni: [doppioDiverso()] });
    const scelte = new Map<string, Scelta>([["f:f3", { come: "sostituisci" }]]);
    expect(riepilogoDellImportazione(p, libreria, ["f4"], scelte).voci[0]).toEqual({
      chiave: "f:f3",
      genere: "function",
      nome: "doppio",
      perche: { come: "chiamata", da: "quadruplo" },
      stato: "conflitto",
      casi: 1,
      specie: "stessa",
      proposto: "doppio_2",
      scelta: { come: "sostituisci" },
      firmaDiversa: false,
      casiEliminati: 1,
    });
    const q = dopo(p, ["f4"], true, scelte, 6);
    expect(q.functions).toEqual([
      p.functions[0]!,
      { id: "f3", kind: "function", name: "doppio", return_type: "integer", data: [conN], body: [], end: { id: "b4", return_value: "n * K" }, test_cases: casoDiDoppio },
      { id: "f4", kind: "function", name: "quadruplo", return_type: "integer", data: [conN], body: [], end: { id: "b5", return_value: "doppio(doppio(n))" }, test_cases: casiDiQuadruplo("b4", "b5") },
    ]);
    expect(q.shared_constants).toEqual([K("2")]);
    // Senza i casi d'uso: quelli del programma sono eliminati lo stesso.
    expect(dopo(p, ["f4"], false, scelte).functions.map((f) => f.test_cases)).toEqual([undefined, undefined, undefined]);
  });

  test("il riepilogo dice se la firma è diversa", () => {
    const p = programma({ funzioni: [doppioDiverso("real")] });
    expect(riepilogoDellImportazione(p, libreria, ["f3"]).voci[0]).toMatchObject({ nome: "doppio", stato: "conflitto", firmaDiversa: true });
  });

  test("non importarla: si usa quella del programma, e ciò che solo lei usava non entra", () => {
    const p = programma({ funzioni: [doppioDiverso()] });
    const scelte = new Map<string, Scelta>([["f:f3", { come: "salta" }]]);
    expect(riepilogoDellImportazione(p, libreria, ["f4"], scelte).voci.map((v) => [v.nome, v.stato, v.scelta])).toEqual([
      ["doppio", "conflitto", { come: "salta" }],
      ["quadruplo", "nuova", undefined],
    ]);
    // L'errore atteso sulla `doppio` che non entra va su un blocco che non c'è (mai su uno nuovo).
    const q = dopo(p, ["f4"], true, scelte, 6);
    expect(q.functions.slice(1)).toEqual([
      doppioDiverso(),
      { id: "f3", kind: "function", name: "quadruplo", return_type: "integer", data: [conN], body: [], end: { id: "b4", return_value: "doppio(doppio(n))" }, test_cases: casiDiQuadruplo("b5", "b4") },
    ]);
    expect(q.shared_constants).toBeUndefined();
  });

  test("una costante: sostituisci prende il valore della libreria, non importarla lascia quello del programma", () => {
    const p = programma({ costanti: [K("3"), { name: "Z", type: "integer", constant: true, initial: "0" }] });
    const sostituisci = dopo(p, ["f3"], false, new Map([["c:K", { come: "sostituisci" }]]));
    expect(sostituisci.shared_constants).toEqual([K("2"), { name: "Z", type: "integer", constant: true, initial: "0" }]);
    expect(sostituisci.functions[1]!.end.return_value).toBe("n * K");
    const salta = dopo(p, ["f3"], false, new Map([["c:K", { come: "salta" }]]));
    expect(salta.shared_constants).toEqual(p.shared_constants!);
    expect(salta.functions[1]!.end.return_value).toBe("n * K");
  });

  test("un nome di un'altra specie nel programma: solo la rinomina", () => {
    const p = programma({ dati: [{ name: "doppio", type: "integer" }, { name: "K", type: "real" }] });
    const voci = riepilogoDellImportazione(p, libreria, ["f4"]).voci;
    expect(voci.map((v) => [v.nome, v.stato, v.specie, v.proposto])).toEqual([
      ["doppio", "conflitto", "altra", "doppio_2"],
      ["quadruplo", "nuova", undefined, undefined],
      ["K", "conflitto", "altra", "K_2"],
    ]);
    // Né la firma né i casi di una funzione che nel programma non c'è.
    expect(voci[0]!.firmaDiversa).toBeUndefined();
    expect(voci[0]!.casiEliminati).toBeUndefined();
    const q = dopo(p, ["f4"], false);
    expect(q.functions.map((f) => [f.name, f.end.return_value])).toEqual([
      [undefined, undefined],
      ["doppio_2", "n * K_2"],
      ["quadruplo", "doppio_2(doppio_2(n))"],
    ]);
    for (const [chiave, come] of [
      ["f:f3", "sostituisci"],
      ["c:K", "salta"],
    ] as const)
      expect(importa(libreria, ["f4"], { conCasi: false, scelte: new Map([[chiave, { come }]]) })(p, 3)).toEqual({ ok: false, rifiuto: { motivo: "scelta_non_ammessa", chiave } });
  });

  test("un dato interno che urta una costante o una funzione del programma entra com'è, e il riepilogo lo dice", () => {
    const p = programma({
      costanti: [{ name: "x", type: "integer", constant: true, initial: "1" }],
      funzioni: [{ id: "f2", kind: "procedure", name: "n", data: [], body: [], end: { id: "b3" } }],
      dati: [],
    });
    expect(riepilogoDellImportazione(p, libreria, ["f3", "f5"]).datiCheUrtano).toEqual([
      { funzione: "doppio", dato: "n", con: "funzione" },
      { funzione: "stampa", dato: "x", con: "costante" },
    ]);
  });

  test("un nome scelto non valido, già usato o scelto due volte è rifiutato", () => {
    const p = programma({ costanti: [K("3")], funzioni: [doppioUguale] });
    const prova = (f: string, k: string) => importa(libreria, ["f4"], { conCasi: false, scelte: new Map([["f:f3", { come: "rinomina", nome: f }], ["c:K", { come: "rinomina", nome: k }]]) })(p, 10);
    expect(prova("2doppio", "K_2")).toEqual({ ok: false, rifiuto: { motivo: "nome_non_valido", nome: "2doppio" } });
    expect(prova("x", "K_2")).toEqual({ ok: false, rifiuto: { motivo: "nome_in_uso", nome: "x" } });
    expect(prova("doppio", "K_2")).toEqual({ ok: false, rifiuto: { motivo: "nome_in_uso", nome: "doppio" } });
    expect(prova("quadruplo", "K_2")).toEqual({ ok: false, rifiuto: { motivo: "nome_in_uso", nome: "quadruplo" } });
    expect(prova("nuovo", "nuovo")).toEqual({ ok: false, rifiuto: { motivo: "nome_in_uso", nome: "nuovo" } });
    expect(prova("nuovo", "ALTRO").ok).toBe(true);
  });
});

test("un passo solo: Annulla toglie tutta l'importazione", () => {
  const p = programma({ costanti: [K("3")], funzioni: [doppioUguale] });
  const c = applica(inizia(p), importa(libreria, ["f4", "f5"], { conCasi: true }));
  expect(c.ok && c.cronologia.passato.length).toBe(1);
  // Il principale, la `doppio` del programma, e saluta, doppio_2, quadruplo e stampa.
  expect(c.ok && c.cronologia.presente.functions.length).toBe(6);
  expect(c.ok && c.cronologia.presente.shared_constants?.length).toBe(2);
  expect(c.ok && annulla(c.cronologia).presente).toBe(p);
});

describe("il file del corpus nato da un'importazione", () => {
  const casi = join(import.meta.dir, "..", "..", "casi", "tappa-3");
  const aperto = (nome: string): { testo: string; progetto: Progetto } => {
    const testo = readFileSync(join(casi, nome), "utf8");
    const e = apri(testo);
    if (!e.ok) throw new Error(nome);
    return { testo, progetto: e.progetto };
  };

  test("è l'importazione rifatta, byte per byte", () => {
    const programma = aperto("riferimento-media-voti-funzioni.algo").progetto;
    const libreria = aperto("libreria-dei-voti.algo").progetto;
    const { testo: atteso, progetto: importato } = aperto("importazione-dalla-libreria.algo");
    expect(libreria.metadata.library).toBe(true);
    const spuntate = libreria.functions.filter((f) => ["leggi_numero", "valido", "media", "giudizio"].includes(f.name!)).map((f) => f.id);
    expect(spuntate.length).toBe(4);
    // Il nome e la descrizione sono quelli del file: l'importazione non li tocca.
    const r = importa(libreria, spuntate, { conCasi: true })({ ...programma, metadata: importato.metadata }, primoLibero(programma));
    expect(r.ok && salva(r.progetto)).toBe(atteso);
    // Le premesse: c'è un'identica, un conflitto con lo stesso genere e uno con un dato, una costante, due chiamate, e un
    // errore atteso dentro una funzione chiamata.
    const voci = riepilogoDellImportazione(programma, libreria, spuntate).voci;
    expect(voci.map((v) => [v.nome, v.stato, v.specie ?? "", v.perche.come])).toEqual([
      ["leggi_numero", "identica", "", "scelta"],
      ["valido", "conflitto", "stessa", "scelta"],
      ["somma_di", "nuova", "", "chiamata"],
      ["media", "conflitto", "altra", "scelta"],
      ["stelle_di", "nuova", "", "chiamata"],
      ["giudizio", "nuova", "", "scelta"],
      ["MAX_VOTI", "nuova", "", "usata"],
    ]);
    // Il giudizio chiama la funzione del voto valido, che entra rinominata: la chiamata la segue.
    const giudizio = (r.ok ? r.progetto.functions : []).find((f) => f.name === "giudizio")!;
    expect(giudizio.body[0]).toMatchObject({ kind: "if", condition: "valido_2(voto)" });
    const stelle = libreria.functions.find((f) => f.name === "stelle_di")!;
    const daLibreria = libreria.functions.find((f) => f.name === "giudizio")!.test_cases![1]!.expected.error!.block;
    const importate = r.ok ? r.progetto.functions : [];
    expect(daLibreria).toBe(stelle.body[0]!.kind === "for" ? stelle.body[0]!.body[0]!.id : "");
    const dentro = importate.find((f) => f.name === "stelle_di")!.body[0]!;
    expect(importate.find((f) => f.name === "giudizio")!.test_cases![1]!.expected.error!.block).toBe(dentro.kind === "for" ? dentro.body[0]!.id : "");
  });
});

describe("le omonime e le opzioni della sorgente", () => {
  /** Una sorgente scritta a mano con due funzioni `doppio`: si segue la prima, come il controllo. */
  const conOmonime = progetto({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "omonime" },
    functions: [
      { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
      { id: "f2", kind: "function", name: "doppio", return_type: "integer", data: [conN], body: [], end: { id: "b2", return_value: "n * 2" } },
      { id: "f3", kind: "function", name: "doppio", return_type: "integer", data: [conN], body: [], end: { id: "b3", return_value: "n + n" } },
      { id: "f4", kind: "function", name: "triplo", return_type: "integer", data: [conN], body: [], end: { id: "b4", return_value: "n * 3" } },
    ],
  });

  test("la seconda di due omonime non si spunta: il riepilogo la ignora e l'importazione la rifiuta", () => {
    expect([...omonimeDopoLaPrima(conOmonime)]).toEqual(["f3"]);
    expect([...omonimeDopoLaPrima(libreria)]).toEqual([]);
    // Spuntate tutte e due (come permetteva la finestra): entra la prima sola, e l'importazione con la seconda è rifiutata.
    expect(riepilogoDellImportazione(programma(), conOmonime, ["f2", "f3"]).voci.map((v) => v.chiave)).toEqual(["f:f2"]);
    expect(riepilogoDellImportazione(programma(), conOmonime, ["f3"]).voci).toEqual([]);
    expect(importa(conOmonime, ["f2", "f3"], { conCasi: true })(programma(), 3)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
    expect(importa(conOmonime, ["f3"], { conCasi: true })(programma(), 3)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
    // La prima entra, e una sola `doppio` nel programma.
    const r = importa(conOmonime, ["f2", "f4"], { conCasi: true })(programma(), 3);
    expect(r.ok && r.progetto.functions.map((f) => [f.name ?? "", f.end.return_value ?? ""])).toEqual([
      ["", ""],
      ["doppio", "n * 2"],
      ["triplo", "n * 3"],
    ]);
  });

  test("le opzioni diverse fra il programma e la sorgente, coi predefiniti", () => {
    const con = (p: Progetto, options: Json): Progetto => progetto({ ...JSON.parse(salva(p)), options });
    expect(opzioniDiverse(programma(), libreria)).toEqual([]);
    // Un predefinito scritto è uguale a uno sottinteso.
    expect(opzioniDiverse(con(programma(), { real_decimals: 2, fill_character: " ", call_stack_limit: 500 }), libreria)).toEqual([]);
    expect(opzioniDiverse(programma(), con(libreria, { call_stack_limit: 10 }))).toEqual([{ opzione: "call_stack_limit", programma: 500, sorgente: 10 }]);
    expect(opzioniDiverse(programma(), con(libreria, { real_decimals: 3 }))).toEqual([{ opzione: "real_decimals", programma: 2, sorgente: 3 }]);
    expect(opzioniDiverse(con(programma(), { fill_character: "*" }), con(libreria, { real_decimals: 0 }))).toEqual([
      { opzione: "real_decimals", programma: 2, sorgente: 0 },
      { opzione: "fill_character", programma: "*", sorgente: " " },
    ]);
    // Le opzioni non entrano: restano quelle del programma.
    const r = importa(con(libreria, { real_decimals: 3 }), ["f3"], { conCasi: true })(programma(), 3);
    expect(r.ok && r.progetto.options).toBeUndefined();
  });

  test("ogni opzione del progetto ha la sua riga: una diversa da sola dà quella e nessun'altra", () => {
    // Le opzioni sono le chiavi dei predefiniti: un'opzione nuova senza un valore qui, o senza la sua riga nel riepilogo,
    // fa rosso (l'elenco nel riepilogo è scritto a mano, opzione per opzione).
    const con = (p: Progetto, options: Json): Progetto => progetto({ ...JSON.parse(salva(p)), options });
    const diversi: Record<string, unknown> = { real_decimals: 5, fill_character: "*", call_stack_limit: 10 };
    const chiavi = Object.keys(opzioniPredefinite);
    expect(chiavi.filter((k) => !(k in diversi))).toEqual([]);
    for (const k of chiavi) expect(opzioniDiverse(programma(), con(libreria, { [k]: diversi[k] })).map((o): string => o.opzione)).toEqual([k]);
  });
});

describe("il costo del riepilogo", () => {
  // La finestra rifà il riepilogo a ogni tasto: ogni testo della sorgente si legge una volta sola, non una volta per ogni
  // nome cercato (con cento funzioni costava due secondi a disegno). Si contano le letture, non il tempo.
  test("ogni testo delle funzioni scelte si legge al più una volta, con trenta funzioni che si chiamano e tre costanti", () => {
    const funzioni = Array.from({ length: 30 }, (_, k) => ({
      id: `f${k + 2}`,
      kind: "procedure",
      name: `p${k}`,
      data: [{ name: "x", type: "integer", initial: "0" }],
      body: [
        ...Array.from({ length: 5 }, (_, i) => ({ id: `b${k}-${i}`, kind: "assignment", target: "x", value: `x + K${i % 3}` })),
        ...(k > 0 ? [{ id: `c${k}`, kind: "call", callee: `p${k - 1}`, arguments: [] }] : []),
      ],
      end: { id: `e${k}` },
    }));
    const sorgente = leggi({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "libreria" },
      shared_constants: [0, 1, 2].map((i) => ({ name: `K${i}`, type: "integer", constant: true, initial: String(i) })),
      functions: [{ id: "f1", kind: "main", data: [], body: [], end: { id: "b0" } }, ...funzioni],
    } as never);
    if (!sorgente.ok) throw new Error(JSON.stringify(sorgente.errori));
    const testi = funzioni.length * 5 * 2;
    const spia = spyOn(rinomina, "nomiDelTesto");
    try {
      const r = riepilogoDellImportazione(programma(), sorgente.progetto, funzioni.map((f) => f.id));
      // Premessa: tutte entrano, con le tre costanti.
      expect(r.voci.length).toBeGreaterThanOrEqual(30);
      console.log(`riepilogo con 30 funzioni: letture dei testi ${spia.mock.calls.length}, testi ${testi}`);
      expect(spia.mock.calls.length).toBeGreaterThan(0);
      expect(spia.mock.calls.length).toBeLessThanOrEqual(testi);
    } finally {
      spia.mockRestore();
    }
  });
});

// I record che ciò che entra usa: entrano con lui, senza scelte, come la dimensione di un vettore (attesi scritti a mano).
describe("i record di ciò che entra", () => {
  const alunno: Json = { name: "alunno", fields: [{ name: "nome", type: "string", max_length: 20 }, { name: "voto", type: "integer" }] };
  const conA = (record = "alunno"): Json => ({ name: "a", type: "record", record, parameter: "value" });
  const votoDi = (record = "alunno"): Json => ({ id: "f2", kind: "function", name: "voto_di", return_type: "integer", data: [conA(record)], body: [], end: { id: "b2", return_value: "a.voto" } });
  const conRecord = progetto({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "con-record", library: true },
    records: [alunno, { name: "classe", fields: [{ name: "sezione", type: "character" }] }],
    shared_constants: [{ name: "PRIMO", type: "record", record: "alunno", constant: true, initial: ['"Anna"', "7"] }],
    functions: [
      { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
      votoDi(),
      { id: "f3", kind: "function", name: "voto_del_primo", return_type: "integer", data: [], body: [], end: { id: "b3", return_value: "PRIMO.voto" } },
      { id: "f4", kind: "procedure", name: "saluta", data: [], body: [], end: { id: "b4" } },
    ],
  });
  const conIRecord = (records: Json[], o: { dati?: Json[]; funzioni?: Json[] } = {}): Progetto => {
    const p = programma(o);
    return progetto({ ...JSON.parse(salva(p)), records });
  };
  const importato = (p: Progetto, spuntate: readonly string[]) => {
    const r = importa(conRecord, spuntate, { conCasi: false })(p, primoLibero(p));
    if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
    const riletto = apri(salva(r.progetto));
    expect(riletto.ok && riletto.progetto).toEqual(r.progetto);
    return r.progetto;
  };
  const voceDelRecord = (p: Progetto, spuntate: readonly string[]) => riepilogoDellImportazione(p, conRecord, spuntate).voci.filter((v) => v.genere === "record");

  test("nuovo: entra in fondo ai record, col suo nome; solo quello usato", () => {
    const p = programma();
    expect(voceDelRecord(p, ["f2"])).toEqual([{ chiave: "r:alunno", genere: "record", nome: "alunno", perche: { come: "usata", da: "voto_di" }, stato: "nuova" }]);
    const fuori = importato(p, ["f2"]);
    expect(fuori.records).toEqual([alunno]);
    expect(fuori.functions.find((f) => f.name === "voto_di")!.data).toEqual([conA()]);
    // Una procedura che non usa record non ne porta.
    expect(importato(p, ["f4"]).records).toBeUndefined();
  });

  test("identico: non entra, e la funzione usa quello del programma", () => {
    const p = conIRecord([alunno]);
    expect(voceDelRecord(p, ["f2"]).map((v) => v.stato)).toEqual(["identica"]);
    const fuori = importato(p, ["f2"]);
    expect(fuori.records).toEqual([alunno]);
    expect(fuori.functions.find((f) => f.name === "voto_di")!.data).toEqual([conA()]);
  });

  test("diverso con lo stesso nome: entra da solo col primo nome libero, il dato lo segue, il programma non cambia", () => {
    const suo: Json = { name: "alunno", fields: [{ name: "nome", type: "string", max_length: 20 }, { name: "classe", type: "string", max_length: 3 }] };
    const p = conIRecord([suo]);
    expect(voceDelRecord(p, ["f2"])).toEqual([{ chiave: "r:alunno", genere: "record", nome: "alunno", perche: { come: "usata", da: "voto_di" }, stato: "rinominato", proposto: "alunno_2" }]);
    const fuori = importato(p, ["f2"]);
    expect(fuori.records).toEqual([suo, { ...alunno, name: "alunno_2" }]);
    expect(fuori.functions.find((f) => f.name === "voto_di")!.data).toEqual([conA("alunno_2")]);
  });

  test("il nome usato da un'altra cosa del programma (un dato): entra rinominato", () => {
    const p = programma({ dati: [{ name: "alunno", type: "integer" }] });
    expect(voceDelRecord(p, ["f2"]).map((v) => [v.stato, v.proposto])).toEqual([["rinominato", "alunno_2"]]);
    expect(importato(p, ["f2"]).records).toEqual([{ ...alunno, name: "alunno_2" }]);
  });

  test("una costante comune di tipo record: entra col suo record, e segue il nome nuovo", () => {
    const suo: Json = { name: "alunno", fields: [{ name: "voto", type: "real" }] };
    const fuori = importato(conIRecord([suo]), ["f3"]);
    expect(fuori.records!.map((r) => r.name)).toEqual(["alunno", "alunno_2"]);
    expect(fuori.shared_constants).toEqual([{ name: "PRIMO", type: "record", record: "alunno_2", constant: true, initial: ['"Anna"', "7"] }]);
    // Il riepilogo: il record lo usa la costante.
    expect(voceDelRecord(conIRecord([suo]), ["f3"]).map((v) => v.perche)).toEqual([{ come: "usata", da: "PRIMO" }]);
  });

  test("una funzione identica per contenuto ma col record diverso non è identica: è un conflitto", () => {
    const suo: Json = { name: "alunno", fields: [{ name: "voto", type: "integer" }] };
    const p = conIRecord([suo], { funzioni: [{ ...votoDi(), id: "f9", end: { id: "b9", return_value: "a.voto" } }] });
    const voci = riepilogoDellImportazione(p, conRecord, ["f2"]).voci;
    expect(voci.find((v) => v.chiave === "f:f2")?.stato).toBe("conflitto");
    // Controllo positivo: col record identico è identica, e non entra niente.
    const q = conIRecord([alunno], { funzioni: [{ ...votoDi(), id: "f9", end: { id: "b9", return_value: "a.voto" } }] });
    expect(riepilogoDellImportazione(q, conRecord, ["f2"]).voci.map((v) => [v.chiave, v.stato])).toEqual([
      ["f:f2", "identica"],
    ]);
  });

  test("la firma conta il record di un parametro: lo stesso nome con altri campi è una firma diversa", () => {
    const suo: Json = { name: "alunno", fields: [{ name: "voto", type: "integer" }] };
    const conIlSuo = conIRecord([suo], { funzioni: [{ ...votoDi(), id: "f9", end: { id: "b9", return_value: "a.voto" } }] });
    expect(riepilogoDellImportazione(conIlSuo, conRecord, ["f2"]).voci.find((v) => v.chiave === "f:f2")).toMatchObject({ stato: "conflitto", firmaDiversa: true });
    // Controllo positivo: col record identico e un altro corpo è un conflitto con la stessa firma.
    const conLoStesso = conIRecord([alunno], { funzioni: [{ ...votoDi(), id: "f9", end: { id: "b9", return_value: "a.voto + 1" } }] });
    expect(riepilogoDellImportazione(conLoStesso, conRecord, ["f2"]).voci.find((v) => v.chiave === "f:f2")).toMatchObject({ stato: "conflitto", firmaDiversa: false });
  });

  test("il campo di un record non è l'uso della costante comune omonima", () => {
    const conVoto = progetto({ ...JSON.parse(salva(conRecord)), shared_constants: [{ name: "voto", type: "integer", constant: true, initial: "5" }] });
    expect(riepilogoDellImportazione(programma(), conVoto, ["f2"]).voci.map((v) => v.chiave)).toEqual(["f:f2", "r:alunno"]);
    // Controllo positivo: la stessa funzione che usa la costante la porta con sé.
    const usaVoto = progetto({ ...JSON.parse(salva(conVoto)), functions: JSON.parse(salva(conVoto)).functions.map((f: Json) => (f.id === "f2" ? { ...f, end: { id: "b2", return_value: "a.voto + voto" } } : f)) });
    expect(riepilogoDellImportazione(programma(), usaVoto, ["f2"]).voci.map((v) => v.chiave)).toEqual(["f:f2", "c:voto", "r:alunno"]);
  });

  test("una costante comune di tipo record che sostituisce quella del programma segue il record rinominato", () => {
    const suo: Json = { name: "alunno", fields: [{ name: "voto", type: "integer" }] };
    const p = progetto({ ...JSON.parse(salva(conIRecord([suo]))), shared_constants: [{ name: "PRIMO", type: "record", record: "alunno", constant: true, initial: ["8"] }] });
    const r = importa(conRecord, ["f3"], { conCasi: false, scelte: new Map([["c:PRIMO", { come: "sostituisci" }]]) })(p, primoLibero(p));
    if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
    expect(r.progetto.records!.map((x) => x.name)).toEqual(["alunno", "alunno_2"]);
    expect(r.progetto.shared_constants).toEqual([{ name: "PRIMO", type: "record", record: "alunno_2", constant: true, initial: ['"Anna"', "7"] }]);
  });
});

test("la firma conta le colonne di una matrice: un parametro o un risultato con le colonne diverse è una firma diversa", () => {
  /** Un programma con la funzione `prima` che riceve una matrice di 2 righe e `colonne` colonne e restituisce un suo
   * elemento o, con `restituite`, la matrice (2 righe e `restituite` colonne); `corpo`, le sue regole. */
  const conLaMatrice = (colonne: number, restituite?: number, elemento = "x[0][0]", corpo: Json[] = []): Json => ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "m" },
    functions: [
      { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
      {
        id: "f2",
        kind: "function",
        name: "prima",
        return_type: "integer",
        ...(restituite === undefined ? {} : { return_size: 2, return_columns: restituite }),
        data: [{ name: "x", type: "integer", size: 2, columns: colonne, parameter: "value" }],
        body: corpo,
        end: { id: "b2", return_value: restituite === undefined ? elemento : "x" },
      },
    ],
  });
  const lib = progetto({ ...(conLaMatrice(2) as object), metadata: { name: "lib", library: true } });
  const diversa = (p: Json) => riepilogoDellImportazione(progetto(p), lib, ["f2"]).voci[0]!.firmaDiversa;
  expect(diversa(conLaMatrice(3))).toBe(true);
  // Controllo positivo: le stesse colonne e un'altra regola, un conflitto con la stessa firma.
  expect(riepilogoDellImportazione(progetto(conLaMatrice(2, undefined, "x[1][1]")), lib, ["f2"]).voci[0]).toMatchObject({ stato: "conflitto", firmaDiversa: false });
  const libR = progetto({ ...(conLaMatrice(2, 2) as object), metadata: { name: "lib", library: true } });
  expect(riepilogoDellImportazione(progetto(conLaMatrice(2, 3)), libR, ["f2"]).voci[0]!.firmaDiversa).toBe(true);
  const conUnaRegola = conLaMatrice(2, 2, undefined, [{ id: "b3", kind: "assignment", target: "x[0][0]", value: "1" }]);
  expect(riepilogoDellImportazione(progetto(conUnaRegola), libR, ["f2"]).voci[0]).toMatchObject({ stato: "conflitto", firmaDiversa: false });
});
