// Le operazioni sulle procedure e sulle funzioni, e quelle sui dati di una funzione che non è il programma principale.
// Gli attesi sono scritti a mano sul programma di riferimento della tappa 3 (`casi/tappa-3/riferimento-media-voti-
// funzioni.algo`: il programma principale `f1`, la procedura `leggi_numero` `f2`, la funzione `valido` `f3`, la procedura
// `stelle` `f4`, blocchi da `b1` a `b27`) e su piccoli progetti scritti qui.
//
// Che cosa NON guarda: le regole di validità che il controllo segnala dopo un'operazione (un nome doppio, un parametro per
// riferimento in una funzione): sono del controllo, e le provano le sue prove.

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eseguiCaso } from "../casi/esecutore";
import { tetti } from "../controllo/controllo";
import { apri, leggi, salva } from "../progetto/formato";
import type { Blocco, Funzione, Progetto } from "../progetto/modello";
import { annulla, applica as applicaPasso, inizia, nomiDiPrima } from "./cronologia";
import {
  chiamaNelTesto,
  chiamataDa,
  chiamateDi,
  conGliArgomenti,
  duplicaFunzione,
  eliminaFunzione,
  eliminaParametro,
  perUscita,
  idDellaFunzioneNuova,
  motivoDelNome,
  nuovaFunzione,
  proprietaDellaFunzione,
  restituisce,
  rinominaFunzione,
  rinominaLaChiamata,
  sostituisciLaChiamata,
  spostaParametro,
} from "./funzioni";
import { primoLibero } from "./identificatori";
import {
  aggiungiDato,
  cambiaComune,
  cambiaDato,
  duplicaComune,
  duplicaDato,
  eliminaComune,
  eliminaDato,
  funzioniCheUsano,
  regoleCheUsano,
  regoleCheUsanoLaComune,
  rendiComune,
  rendiDellaFunzione,
  rinominaDato,
  spostaComune,
  spostaDato,
  trova,
  type Operazione,
} from "./operazioni";

const delCorpus = (nome: string): Progetto => {
  const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", nome), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
const riferimento = delCorpus("tappa-3/riferimento-media-voti-funzioni.algo");

/** Il progetto dopo l'operazione, che deve applicarsi e restare uguale salvato e riaperto. */
function dopo(op: Operazione, p: Progetto = riferimento): Progetto {
  const r = op(p, primoLibero(p));
  if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
  const riletto = apri(salva(r.progetto));
  expect(riletto.ok && riletto.progetto).toEqual(r.progetto);
  return r.progetto;
}
const funzione = (p: Progetto, id: string): Funzione => p.functions.find((f) => f.id === id)!;
const blocco = (p: Progetto, id: string): Blocco => trova(p, id)!;

/** Un progetto piccolo: il programma principale con le regole date, e una funzione `doppio` (intero) che restituisce
 * `n * 2` o ciò che si dà. */
function conDoppio(corpo: readonly Blocco[], restituisce = "n * 2", altre: readonly Funzione[] = []): Progetto {
  const esito = leggi({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "prova" },
    functions: [
      { id: "f1", kind: "main", data: [{ name: "x", type: "integer" }], body: corpo, end: { id: "b90" } },
      { id: "f2", kind: "function", name: "doppio", return_type: "integer", data: [{ name: "n", type: "integer", parameter: "value" }], body: [], end: { id: "b91", return_value: restituisce } },
      ...altre,
    ],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}

test("modello leggibile: ogni operazione su ogni procedura e funzione del corpus della tappa 3", () => {
  const cartella = join(import.meta.dir, "..", "..", "casi", "tappa-3");
  const progetti = readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((f) => {
      const a = apri(readFileSync(join(cartella, f), "utf8"));
      if (!a.ok) throw new Error(f);
      return a.progetto;
    });
  const conte = new Map<string, number>();
  let difetti = 0;
  for (const p of progetti)
    for (const f of p.functions.filter((x) => x.kind !== "main")) {
      const ops: [string, Operazione][] = [
        ["rinomina", rinominaFunzione(f.id, `${f.name}_nuovo`)],
        ["procedura", proprietaDellaFunzione(f.id, { genere: "procedure" })],
        ["funzione", proprietaDellaFunzione(f.id, { genere: "function", tipo: "real", predefinito: "1.5" })],
        ["duplica", duplicaFunzione(f.id)],
        ["elimina e restano", eliminaFunzione(f.id, { come: "restano" })],
        ["elimina coi salti", eliminaFunzione(f.id, { come: "salti" })],
        ["elimina col predefinito", eliminaFunzione(f.id, { come: "predefinito" })],
        ["elimina le assegnazioni", eliminaFunzione(f.id, { come: "assegnazioni" })],
        ["dato nuovo", aggiungiDato({ name: "nuovo", type: "integer" }, f.id)],
      ];
      for (const [genere, op] of ops) {
        const r = op(p, primoLibero(p));
        const riletto = r.ok ? apri(salva(r.progetto)) : undefined;
        if (!r.ok || !riletto?.ok || JSON.stringify(riletto.progetto) !== JSON.stringify(r.progetto) || salva(r.progetto).includes("undefined")) difetti++;
        conte.set(genere, (conte.get(genere) ?? 0) + 1);
      }
    }
  const sottoprogrammi = progetti.reduce((n, p) => n + p.functions.length - 1, 0);
  console.log(`modello leggibile, tappa 3: progetti ${progetti.length}, procedure e funzioni ${sottoprogrammi}; difetti ${difetti}; ${[...conte].map(([g, n]) => `${g} ${n}`).join(", ")}`);
  // Le premesse: il corpus della tappa 3 ha procedure e funzioni, e ogni operazione è stata applicata a ciascuna.
  expect(progetti.length).toBeGreaterThanOrEqual(25);
  expect(sottoprogrammi).toBeGreaterThanOrEqual(30);
  expect([...conte.values()].every((n) => n === sottoprogrammi)).toBe(true);
  expect(difetti).toBe(0);
});

describe("le chiamate nel testo, per parole", () => {
  test("una chiamata è il nome seguito da «(», non dentro un letterale né senza parentesi", () => {
    expect(chiamaNelTesto("valido(voto)", "valido")).toBe(true);
    expect(chiamaNelTesto("not valido (3)", "valido")).toBe(true);
    expect(chiamaNelTesto('"valido(voto)"', "valido")).toBe(false);
    expect(chiamaNelTesto("valido + 1", "valido")).toBe(false);
    expect(chiamaNelTesto("validoo(1)", "valido")).toBe(false);
    // Un testo che l'analizzatore non legge: la chiamata c'è lo stesso.
    expect(chiamaNelTesto("x = valido(3)", "valido")).toBe(true);
    expect(chiamaNelTesto('valido(1) and "aperto', "valido")).toBe(true);
  });

  test("rinominare cambia solo le chiamate, anche nei testi che non si leggono", () => {
    expect(rinominaLaChiamata("valido(voto) and not valido (3)", "valido", "ok")).toBe("ok(voto) and not ok (3)");
    expect(rinominaLaChiamata('"valido(" + valido', "valido", "ok")).toBe('"valido(" + valido');
    expect(rinominaLaChiamata("x = valido(3) % 2", "valido", "ok")).toBe("x = ok(3) % 2");
    expect(rinominaLaChiamata("è valido(3)", "valido", "ok")).toBe("è ok(3)");
  });

  test("sostituire toglie la chiamata con i suoi argomenti", () => {
    expect(sostituisciLaChiamata("valido(f(1), 2) and x", "valido", "false")).toBe("false and x");
    expect(sostituisciLaChiamata("2 raised_to doppio(3)", "doppio", "-1")).toBe("2 raised_to (-1)");
    expect(sostituisciLaChiamata("doppio(doppio(1)) + doppio(2)", "doppio", "0")).toBe("0 + 0");
    expect(sostituisciLaChiamata("doppio(1", "doppio", "0")).toBe("0");
    expect(sostituisciLaChiamata('"doppio(1)" + doppio', "doppio", "0")).toBe('"doppio(1)" + doppio');
  });
});

describe("dove è chiamata", () => {
  test("nel riferimento, blocco per blocco", () => {
    expect(chiamateDi(riferimento, "leggi_numero")).toEqual([{ funzione: "f1", blocco: "b1", salto: true, rombo: false, assegnazione: false }]);
    expect(chiamateDi(riferimento, "valido")).toEqual([{ funzione: "f1", blocco: "b4", salto: false, rombo: true, assegnazione: false }]);
    expect(chiamateDi(riferimento, "stelle")).toEqual([{ funzione: "f1", blocco: "b13", salto: true, rombo: false, assegnazione: false }]);
    expect(chiamataDa(riferimento, "valido")).toEqual(["f1"]);
  });

  test("anche in ciò che una funzione restituisce, e in un'assegnazione", () => {
    const tripla: Funzione = { id: "f3", kind: "function", name: "tripla", return_type: "integer", data: [], body: [], end: { id: "b92", return_value: "doppio(1) + 1" } };
    const p = conDoppio([{ id: "b1", kind: "assignment", target: "x", value: "doppio(2)" }], "n * 2", [tripla]);
    expect(chiamateDi(p, "doppio")).toEqual([
      { funzione: "f1", blocco: "b1", salto: false, rombo: false, assegnazione: true },
      { funzione: "f3", blocco: "b92", salto: false, rombo: false, assegnazione: false },
    ]);
    expect(chiamataDa(p, "doppio")).toEqual(["f1", "f3"]);
  });
});

describe("creare", () => {
  test("una funzione nuova in fondo, col primo id libero e la fine col primo blocco libero", () => {
    expect(idDellaFunzioneNuova(riferimento)).toBe("f5");
    const r = nuovaFunzione("media_pesata", { genere: "function", tipo: "real" })(riferimento, primoLibero(riferimento));
    expect(r.ok && r.prossimo).toBe(29);
    const p = dopo(nuovaFunzione("media_pesata", { genere: "function", tipo: "real" }));
    expect(p.functions.map((f) => f.id)).toEqual(["f1", "f2", "f3", "f4", "f5"]);
    expect(funzione(p, "f5")).toEqual({ id: "f5", kind: "function", name: "media_pesata", return_type: "real", data: [], body: [], end: { id: "b28", return_value: "" } });
  });

  test("il valore predefinito si scrive solo se non è quello del tipo; una procedura non restituisce", () => {
    expect(funzione(dopo(nuovaFunzione("pari", { genere: "function", tipo: "boolean", predefinito: "true" })), "f5").default_result).toBe("true");
    expect(funzione(dopo(nuovaFunzione("pari", { genere: "function", tipo: "boolean", predefinito: "false" })), "f5").default_result).toBeUndefined();
    expect(funzione(dopo(nuovaFunzione("saluta", { genere: "procedure" })), "f5")).toEqual({ id: "f5", kind: "procedure", name: "saluta", data: [], body: [], end: { id: "b28" } });
  });

  test("il nome si chiede prima, con le regole del controllo", () => {
    expect(motivoDelNome(riferimento, "media_pesata")).toBeUndefined();
    expect(motivoDelNome(riferimento, "stelle")).toBe("in_uso");
    // Il nome di un dato di una funzione qualunque, anche di un parametro.
    expect(motivoDelNome(riferimento, "quante")).toBe("in_uso");
    expect(motivoDelNome(riferimento, "2pari")).toBe("non_valido");
    expect(motivoDelNome(riferimento, "printf")).toBe("non_valido");
    // Rinominando, il suo nome di adesso è libero.
    expect(motivoDelNome(riferimento, "stelle", "f4")).toBeUndefined();
  });
});

describe("rinominare", () => {
  test("le chiamate seguono: i salti e i nomi nelle espressioni", () => {
    const p = dopo(rinominaFunzione("f3", "corretto"));
    expect(funzione(p, "f3").name).toBe("corretto");
    expect(blocco(p, "b4")).toMatchObject({ condition: "corretto(voto)" });
    const q = dopo(rinominaFunzione("f2", "chiedi_numero"));
    expect(blocco(q, "b1")).toMatchObject({ callee: "chiedi_numero", arguments: ["n"] });
  });

  test("anche in ciò che un'altra funzione restituisce", () => {
    const tripla: Funzione = { id: "f3", kind: "function", name: "tripla", return_type: "integer", data: [], body: [], end: { id: "b92", return_value: "doppio(1) + 1" } };
    const p = dopo(rinominaFunzione("f2", "per_due"), conDoppio([], "n * 2", [tripla]));
    expect(funzione(p, "f3").end.return_value).toBe("per_due(1) + 1");
  });

  test("le chiamate restano se il nome nuovo è già di un'altra funzione, o non è un nome solo", () => {
    const p = dopo(rinominaFunzione("f3", "stelle"));
    expect(funzione(p, "f3").name).toBe("stelle");
    expect(blocco(p, "b4")).toMatchObject({ condition: "valido(voto)" });
    expect(blocco(p, "b13")).toMatchObject({ callee: "stelle" });
    const q = dopo(rinominaFunzione("f3", "voto valido"));
    expect(blocco(q, "b4")).toMatchObject({ condition: "valido(voto)" });
  });

  test("il programma principale e una funzione che non c'è non si rinominano", () => {
    expect(rinominaFunzione("f1", "x")(riferimento, 28)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
    expect(rinominaFunzione("f9", "x")(riferimento, 28)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
  });
});

describe("le proprietà e il genere", () => {
  test("una funzione che diventa procedura perde ciò che restituisce", () => {
    const f = funzione(dopo(proprietaDellaFunzione("f3", { genere: "procedure" })), "f3");
    expect(f.kind).toBe("procedure");
    expect(f.return_type).toBeUndefined();
    expect(f.end).toEqual({ id: "b22" });
    expect(f.test_cases?.length).toBe(2);
  });

  test("una funzione che diventa procedura: dall'output atteso dei suoi casi escono le righe di ciò che restituiva", () => {
    const p = dopo(proprietaDellaFunzione("f3", { genere: "procedure" }));
    const f = funzione(p, "f3");
    expect(funzione(riferimento, "f3").test_cases!.map((c) => c.expected.output)).toEqual(["→ true\n", "→ false\n"]);
    expect(f.test_cases!.map((c) => c.expected.output)).toEqual(["", ""]);
    // L'output atteso è quello ottenuto (il progetto non parte per un'altra ragione: il programma usa la procedura in
    // un'espressione, e il controllo lo dice).
    expect(f.test_cases!.map((c) => { const e = eseguiCaso(p, c, tetti, "f3"); return e.fuoriTappa ? "fuori" : `${e.ottenuto.output === c.expected.output} ${e.ottenuto.static_error?.code}`; })).toEqual(["true procedure_in_expression", "true procedure_in_expression"]);
    // Una funzione che restituisce un vettore: una riga per elemento, tutte fuori.
    const vettore = delCorpus("tappa-3/risultato-vettore-assegnato.algo");
    const doppi = vettore.functions.find((x) => x.name === "doppi")!;
    const daProcedura = funzione(dopo(proprietaDellaFunzione(doppi.id, { genere: "procedure" }), vettore), doppi.id);
    expect({ prima: doppi.test_cases!.map((c) => c.expected.output.split("\n").length - 1), dopo: daProcedura.test_cases!.map((c) => c.expected.output) }).toEqual({
      prima: doppi.test_cases!.map(() => doppi.return_size!),
      dopo: doppi.test_cases!.map(() => ""),
    });
    // Una stringa restituita che va a capo: anche la riga dopo il suo a capo è del risultato, ed esce.
    const stringa = delCorpus("tappa-3/risultato-stringa.algo");
    const saluto = stringa.functions.find((x) => x.name === "saluto")!;
    const conACapo = { ...stringa, functions: stringa.functions.map((x) => (x.id !== saluto.id ? x : { ...x, test_cases: [{ name: "a capo", inputs: [], expected: { output: "→ a\nb\n" } }] })) };
    expect(funzione(dopo(proprietaDellaFunzione(saluto.id, { genere: "procedure" }), conACapo), saluto.id).test_cases!.map((c) => c.expected.output)).toEqual([""]);
    // Nell'altro verso i casi restano com'erano: ciò che la funzione restituirà non si sa ancora.
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "boolean" }), p), "f3").test_cases).toStrictEqual(f.test_cases);
  });

  test("una procedura che diventa funzione restituisce un'espressione vuota", () => {
    const f = funzione(dopo(proprietaDellaFunzione("f2", { genere: "function", tipo: "integer" })), "f2");
    expect(f).toMatchObject({ kind: "function", return_type: "integer", end: { id: "b21", return_value: "" } });
    expect(f.body.length).toBe(2);
  });

  test("il tipo e il valore predefinito; le stesse proprietà non cambiano il progetto", () => {
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "boolean", predefinito: "true" })), "f3").default_result).toBe("true");
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "integer" })), "f3")).toMatchObject({ return_type: "integer", end: { return_value: "voto >= 1 and voto <= 10" } });
    const r = proprietaDellaFunzione("f3", { genere: "function", tipo: "boolean", predefinito: "false" })(riferimento, 28);
    expect(r.ok && r.progetto).toBe(riferimento);
  });

  test("la dimensione di un vettore restituito e la lunghezza massima di una stringa: date, tolte, o lasciate come sono", () => {
    const vettore = funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "integer", dimensione: 3, predefinito: "7" })), "f3");
    // Un vettore non ha valore predefinito: quello scritto non entra.
    expect(vettore).toMatchObject({ return_type: "integer", return_size: 3 });
    expect(vettore.default_result).toBeUndefined();
    const conVettore = dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "integer", dimensione: 3 }));
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "real" }), conVettore), "f3")).toMatchObject({ return_type: "real", return_size: 3 });
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "integer", dimensione: null }), conVettore), "f3").return_size).toBeUndefined();
    const stringa = dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "string", lunghezza: 20 }));
    expect(funzione(stringa, "f3")).toMatchObject({ return_type: "string", return_max_length: 20 });
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "string", lunghezza: null }), stringa), "f3").return_max_length).toBeUndefined();
    // La lunghezza massima solo per una stringa; le stesse misure non cambiano il progetto.
    expect(funzione(dopo(proprietaDellaFunzione("f3", { genere: "function", tipo: "integer" }), stringa), "f3").return_max_length).toBeUndefined();
    const r = proprietaDellaFunzione("f3", { genere: "function", tipo: "integer", dimensione: 3 })(conVettore, 28);
    expect(r.ok && r.progetto).toBe(conVettore);
  });
});

describe("ciò che restituisce", () => {
  test("l'espressione della fine di una funzione, com'è scritta; non di una procedura né del programma principale", () => {
    const p = dopo(restituisce("f3", "voto >= 1 and voto <= MASSIMO"));
    expect(funzione(p, "f3").end).toEqual({ id: "b22", return_value: "voto >= 1 and voto <= MASSIMO" });
    // Il resto non cambia.
    expect(p.functions.filter((f) => f.id !== "f3")).toStrictEqual(riferimento.functions.filter((f) => f.id !== "f3"));
    // Anche vuota: l'errore lo dice il controllo.
    expect(funzione(dopo(restituisce("f3", "")), "f3").end.return_value).toBe("");
    for (const id of ["f2", "f1", "f9"]) expect(restituisce(id, "1")(riferimento, 30)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
  });
});

describe("duplicare", () => {
  test("la copia subito dopo, col nome libero e identificatori nuovi", () => {
    const r = duplicaFunzione("f4")(riferimento, 28);
    expect(r.ok && r.prossimo).toBe(33);
    const p = dopo(duplicaFunzione("f4"));
    expect(p.functions.map((f) => [f.id, f.name])).toEqual([
      ["f1", undefined],
      ["f2", "leggi_numero"],
      ["f3", "valido"],
      ["f4", "stelle"],
      ["f5", "stelle_2"],
    ]);
    const copia = funzione(p, "f5");
    expect(copia.body.map((b) => b.id)).toEqual(["b28", "b31"]);
    expect(copia.body[0]!.kind === "while" && copia.body[0]!.body.map((b) => b.id)).toEqual(["b29", "b30"]);
    expect(copia.end).toEqual({ id: "b32" });
    expect(copia.data).toEqual(funzione(riferimento, "f4").data);
    expect(copia.test_cases).toEqual(funzione(riferimento, "f4").test_cases);
    // Le chiamate restano all'originale.
    expect(blocco(p, "b13")).toMatchObject({ callee: "stelle" });
  });

  test("un errore o un avviso atteso dai casi della copia è sul blocco della copia", () => {
    const f4 = funzione(riferimento, "f4");
    const dentro = f4.body[0]!.kind === "while" ? f4.body[0]!.body[1]!.id : "";
    const atteso = { output: "", error: { code: "too_many_steps" as const, block: dentro }, warnings: [{ code: "unused_data" as const, block: f4.end.id }] };
    const con = { ...riferimento, functions: riferimento.functions.map((f) => (f.id === "f4" ? { ...f, test_cases: [{ name: "x", inputs: [], expected: atteso }] } : f)) };
    const copia = funzione(dopo(duplicaFunzione("f4"), con), "f5");
    expect(dentro).not.toBe("");
    expect(copia.test_cases![0]!.expected).toEqual({ output: "", error: { code: "too_many_steps", block: "b30" }, warnings: [{ code: "unused_data", block: "b32" }] });
  });
});

describe("eliminare", () => {
  const corpo: Blocco[] = [
    { id: "b1", kind: "assignment", target: "x", value: "doppio(2)" },
    { id: "b2", kind: "write", values: ["doppio(x) + 1"], newline: true },
    { id: "b3", kind: "if", condition: "doppio(x) > 3", then: [{ id: "b4", kind: "assignment", target: "x", value: "1" }], else: [] },
    { id: "b5", kind: "while", condition: "doppio(x) < 0", body: [] },
  ];
  const p = conDoppio(corpo);

  test("le chiamate restano: diventano errori", () => {
    const q = dopo(eliminaFunzione("f2", { come: "restano" }), p);
    expect(q.functions.map((f) => f.id)).toEqual(["f1"]);
    expect(funzione(q, "f1").body).toEqual(funzione(p, "f1").body);
  });

  test("una procedura con i suoi salti", () => {
    const q = dopo(eliminaFunzione("f2", { come: "salti" }));
    expect(q.functions.map((f) => f.id)).toEqual(["f1", "f3", "f4"]);
    expect(trova(q, "b1")).toBeUndefined();
    expect(trova(q, "b13")).toBeDefined();
    const r = dopo(eliminaFunzione("f4", { come: "salti" }));
    expect(trova(r, "b13")).toBeUndefined();
    expect(funzione(r, "f1").body.length).toBe(funzione(riferimento, "f1").body.length);
  });

  test("una funzione sostituita dal valore predefinito, rombi compresi", () => {
    const q = dopo(eliminaFunzione("f2", { come: "predefinito" }), p);
    expect(funzione(q, "f1").body.map((b) => ("value" in b ? b.value : "values" in b ? b.values[0] : "condition" in b ? b.condition : ""))).toEqual(["0", "0 + 1", "0 > 3", "0 < 0"]);
    const r = dopo(eliminaFunzione("f3", { come: "predefinito" }));
    expect(blocco(r, "b4")).toMatchObject({ condition: "false" });
    // Una funzione reale col valore predefinito scritto da intero: al suo posto un reale (lo zero senza segno).
    for (const [scritto, atteso] of [["2", "2.0"], ["-3", "(-3.0)"], ["-0", "0.0"], ["2.5", "2.5"]] as const) {
      const reale = { ...p, functions: p.functions.map((f) => (f.id === "f2" ? { ...f, return_type: "real" as const, default_result: scritto, end: { ...f.end, return_value: "1.0" } } : f)) };
      expect([scritto, blocco(dopo(eliminaFunzione("f2", { come: "predefinito" }), reale), "b2")]).toMatchObject([scritto, { values: [`${atteso} + 1`] }]);
    }
  });

  test("i rombi non confermati tengono la chiamata", () => {
    const q = dopo(eliminaFunzione("f2", { come: "predefinito", rombiTenuti: ["b5"] }), p);
    expect(blocco(q, "b3")).toMatchObject({ condition: "0 > 3" });
    expect(blocco(q, "b5")).toMatchObject({ condition: "doppio(x) < 0" });
  });

  test("le assegnazioni che la contengono si tolgono, altrove la sostituzione", () => {
    const q = dopo(eliminaFunzione("f2", { come: "assegnazioni" }), p);
    expect(funzione(q, "f1").body.map((b) => b.id)).toEqual(["b2", "b3", "b5"]);
    expect(blocco(q, "b2")).toMatchObject({ values: ["0 + 1"] });
    // L'assegnazione dentro il rombo non chiama la funzione: resta.
    expect(blocco(q, "b4")).toBeDefined();
  });

  test("una funzione che restituisce un vettore: si tolgono le assegnazioni che la contengono, e altrove resta", () => {
    const vettori: Blocco[] = [
      { id: "b1", kind: "assignment", target: "w", value: "doppi(w)" },
      { id: "b2", kind: "write", values: ["doppi(w)[0] + 1"], newline: true },
      { id: "b3", kind: "for_each", item: "x", source: "doppi(w)", body: [] },
      { id: "b4", kind: "if", condition: "doppi(w)[1] > 3", then: [], else: [] },
    ];
    const doppi = conDoppio(vettori);
    const conVettore: Progetto = {
      ...doppi,
      functions: doppi.functions.map((f) =>
        f.id === "f1" ? { ...f, data: [...f.data, { name: "w", type: "integer", size: 3 }] } : { ...f, name: "doppi", return_size: 3, data: [{ name: "n", type: "integer", size: 3, parameter: "value" }], end: { ...f.end, return_value: "n" } },
      ),
    };
    for (const come of ["predefinito", "assegnazioni"] as const) {
      const q = dopo(eliminaFunzione("f2", { come }), conVettore);
      expect({ come, corpo: funzione(q, "f1").body }).toEqual({ come, corpo: vettori.slice(1) });
    }
  });

  test("Annulla riporta tutto, in un passo", () => {
    const c = applicaPasso(inizia(p), eliminaFunzione("f2", { come: "assegnazioni" }));
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.cronologia.passato.length).toBe(1);
    expect(annulla(c.cronologia).presente).toBe(p);
  });

  test("il programma principale non si elimina", () => {
    expect(eliminaFunzione("f1", { come: "restano" })(riferimento, 28)).toEqual({ ok: false, rifiuto: { motivo: "funzione_inesistente" } });
  });
});

describe("i dati di una funzione", () => {
  test("aggiungere, duplicare, spostare ed eliminare toccano solo quella funzione", () => {
    const p = dopo(aggiungiDato({ name: "t", type: "integer" }, "f4"));
    expect(funzione(p, "f4").data.map((d) => d.name)).toEqual(["quante", "k", "t"]);
    expect(funzione(p, "f1").data).toEqual(funzione(riferimento, "f1").data);
    expect(funzione(dopo(duplicaDato(1, "f4")), "f4").data.map((d) => d.name)).toEqual(["quante", "k", "k_2"]);
    expect(funzione(dopo(eliminaDato(1, "f4")), "f4").data.map((d) => d.name)).toEqual(["quante"]);
    expect(funzione(dopo(spostaDato(1, 1, "f4"), p), "f4").data.map((d) => d.name)).toEqual(["quante", "t", "k"]);
    expect(spostaDato(1, -1, "f4")(riferimento, 28)).toEqual({ ok: false, rifiuto: { motivo: "al_bordo" } });
    expect(eliminaDato(0, "f9")(riferimento, 28)).toEqual({ ok: false, rifiuto: { motivo: "dato_inesistente" } });
  });

  test("rinominare un dato di una funzione cambia le sue regole, ciò che restituisce e i suoi casi", () => {
    const p = dopo(rinominaDato(1, "kk", "f4"));
    expect(blocco(p, "b23")).toMatchObject({ condition: "kk < quante" });
    expect(blocco(p, "b25")).toMatchObject({ target: "kk", value: "kk + 1" });
    const q = dopo(rinominaDato(0, "v", "f3"));
    expect(funzione(q, "f3").end.return_value).toBe("v >= 1 and v <= 10");
    expect(funzione(q, "f3").test_cases?.map((c) => c.inputs[0]!.data)).toEqual(["v", "v"]);
    // Il dato del programma principale con lo stesso nome non cambia, né le sue regole né i casi del progetto.
    expect(funzione(q, "f1").data[1]!.name).toBe("voto");
    expect(blocco(q, "b4")).toMatchObject({ condition: "valido(voto)" });
    expect(q.test_cases).toEqual(riferimento.test_cases);
  });

  test("le regole che usano un dato si contano nella sua funzione, con ciò che restituisce", () => {
    expect(regoleCheUsano(riferimento, "voto")).toBe(5);
    expect(regoleCheUsano(riferimento, "voto", "f3")).toBe(1);
    expect(regoleCheUsano(riferimento, "k", "f4")).toBe(2);
  });

  test("i nomi di prima di un dato si cercano nella sua funzione", () => {
    let c = inizia(riferimento);
    for (const op of [rinominaDato(1, "kk", "f4"), rinominaDato(1, "kkk", "f4")]) {
      const r = applicaPasso(c, op);
      if (!r.ok) throw new Error("passo");
      c = r.cronologia;
    }
    expect(nomiDiPrima(c, 1, "f4")).toEqual(["kk", "k"]);
    expect(nomiDiPrima(c, 1)).toEqual([]);
  });
});

/** Una procedura `p(rif a, b)` (con un dato di lavoro fra i due parametri) chiamata con due salti e una funzione
 * `somma(a, b)` chiamata nelle espressioni, anche dentro l'argomento di un salto, coi dati del programma principale `x` e
 * `y`. */
function conDueParametri(): Progetto {
  const esito = leggi({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "prova" },
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "x", type: "integer" },
          { name: "y", type: "integer" },
        ],
        body: [
          { id: "b1", kind: "call", callee: "p", arguments: ["x", "y + 1"] },
          { id: "b2", kind: "assignment", target: "x", value: "somma(x,  somma(1, 2)) + somma(y)" },
          { id: "b3", kind: "call", callee: "p", arguments: ["x", "somma(x, y)"] },
        ],
        end: { id: "b90" },
      },
      {
        id: "f2",
        kind: "procedure",
        name: "p",
        data: [
          { name: "a", type: "integer", parameter: "reference" },
          { name: "t", type: "integer" },
          { name: "b", type: "integer", parameter: "value" },
        ],
        body: [],
        end: { id: "b91" },
      },
      {
        id: "f3",
        kind: "function",
        name: "somma",
        return_type: "integer",
        data: [
          { name: "a", type: "integer", parameter: "value" },
          { name: "b", type: "integer", parameter: "value" },
        ],
        body: [],
        end: { id: "b92", return_value: "a + b" },
      },
    ],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}

describe("gli argomenti nel testo", () => {
  test("ogni chiamata cambia i suoi argomenti, anche quelle dentro gli argomenti; gli spazi restano", () => {
    const scambia = (a: readonly string[]) => (a.length === 2 ? [a[1]!, a[0]!] : a);
    expect(conGliArgomenti("somma(x,  somma(1, 2)) + somma(y)", "somma", scambia)).toBe("somma(somma(2, 1),  x) + somma(y)");
    expect(conGliArgomenti("somma(v[1, 2], f(a, b))", "somma", scambia)).toBe("somma(f(a, b), v[1, 2])");
    expect(conGliArgomenti('somma("a,b", 2)', "somma", scambia)).toBe('somma(2, "a,b")');
    // Senza la parentesi che la chiude, la chiamata resta com'è.
    expect(conGliArgomenti("somma(1, 2", "somma", scambia)).toBe("somma(1, 2");
    // Un numero diverso di argomenti si scrive separato da virgola e spazio.
    expect(conGliArgomenti("somma(1 ,2 , 3) * 2", "somma", (a) => a.slice(1))).toBe("somma(2, 3) * 2");
    expect(conGliArgomenti("somma(1)", "somma", () => [])).toBe("somma()");
  });
});

describe("i parametri", () => {
  test("spostare un parametro cambia la firma e gli argomenti di ogni chiamata, salti ed espressioni", () => {
    const p = dopo(spostaParametro(2, -1, "f2"), conDueParametri());
    // Il dato di lavoro `t` resta al suo posto nel file: si scambiano i due parametri.
    expect(funzione(p, "f2").data.map((d) => d.name)).toEqual(["b", "t", "a"]);
    expect(blocco(p, "b1")).toMatchObject({ arguments: ["y + 1", "x"] });
    expect(blocco(p, "b3")).toMatchObject({ arguments: ["somma(x, y)", "x"] });
    // Le chiamate di un'altra funzione non cambiano.
    expect(blocco(p, "b2")).toMatchObject({ value: "somma(x,  somma(1, 2)) + somma(y)" });
    const q = dopo(spostaParametro(0, 1, "f3"), conDueParametri());
    expect(funzione(q, "f3").data.map((d) => d.name)).toEqual(["b", "a"]);
    expect(blocco(q, "b2")).toMatchObject({ value: "somma(somma(2, 1),  x) + somma(y)" });
    expect(blocco(q, "b3")).toMatchObject({ arguments: ["x", "somma(y, x)"] });
  });

  test("spostare un parametro: al bordo, un dato che non è un parametro, il programma principale", () => {
    const p = conDueParametri();
    expect([spostaParametro(0, -1, "f2")(p, 99), spostaParametro(2, 1, "f2")(p, 99), spostaParametro(1, 1, "f2")(p, 99), spostaParametro(0, 1, "f1")(p, 99)]).toEqual([
      { ok: false, rifiuto: { motivo: "al_bordo" } },
      { ok: false, rifiuto: { motivo: "al_bordo" } },
      { ok: false, rifiuto: { motivo: "dato_inesistente" } },
      { ok: false, rifiuto: { motivo: "funzione_inesistente" } },
    ]);
  });

  test("spostare un dato di lavoro salta i parametri", () => {
    const p = dopo(aggiungiDato({ name: "u", type: "integer" }, "f2"), conDueParametri());
    expect(funzione(dopo(spostaDato(3, -1, "f2"), p), "f2").data.map((d) => d.name)).toEqual(["a", "u", "b", "t"]);
    expect(spostaDato(1, -1, "f2")(p, 99)).toEqual({ ok: false, rifiuto: { motivo: "al_bordo" } });
  });

  test("eliminare un parametro, con o senza il suo argomento nelle chiamate", () => {
    const tolto = dopo(eliminaParametro(0, "f2", true), conDueParametri());
    expect(funzione(tolto, "f2").data.map((d) => d.name)).toEqual(["t", "b"]);
    expect(blocco(tolto, "b1")).toMatchObject({ arguments: ["y + 1"] });
    expect(blocco(tolto, "b3")).toMatchObject({ arguments: ["somma(x, y)"] });
    const restano = dopo(eliminaParametro(0, "f2", false), conDueParametri());
    expect(blocco(restano, "b1")).toMatchObject({ arguments: ["x", "y + 1"] });
    const q = dopo(eliminaParametro(1, "f3", true), conDueParametri());
    // Una chiamata con meno argomenti del parametro tolto resta com'è.
    expect(blocco(q, "b2")).toMatchObject({ value: "somma(x) + somma(y)" });
    expect(funzione(q, "f3").end.return_value).toBe("a + b");
    expect(eliminaParametro(1, "f2", true)(conDueParametri(), 99)).toEqual({ ok: false, rifiuto: { motivo: "dato_inesistente" } });
  });

  test("il parametro nuovo è in fondo alla firma; cambiare la natura lo lascia al suo posto nei dati", () => {
    const p = dopo(aggiungiDato({ name: "c", type: "real", parameter: "value" }, "f2"), conDueParametri());
    expect(funzione(p, "f2").data.filter((d) => d.parameter !== undefined).map((d) => d.name)).toEqual(["a", "b", "c"]);
    const q = dopo(cambiaDato(1, { name: "t", type: "integer", parameter: "reference" }, "f2"), conDueParametri());
    expect(funzione(q, "f2").data.filter((d) => d.parameter !== undefined).map((d) => d.name)).toEqual(["a", "t", "b"]);
  });

  test("spostare o eliminare un parametro porta con sé le sue voci nei casi della funzione; un caso che non comincia coi parametri resta", () => {
    const esito = leggi({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "prova" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "w", type: "integer", size: 2 }], body: [{ id: "b1", kind: "call", callee: "q", arguments: ["w", "1"] }], end: { id: "b2" } },
        {
          id: "f2",
          kind: "procedure",
          name: "q",
          data: [
            { name: "v", type: "integer", size: 2, parameter: "reference" },
            { name: "k", type: "integer", parameter: "value" },
          ],
          body: [{ id: "b3", kind: "read", target: "k" }],
          end: { id: "b4" },
          test_cases: [
            { name: "a", inputs: [{ data: "v", text: "1" }, { data: "v", text: "2" }, { data: "k", text: "5" }, { data: "k", text: "7" }], expected: { output: "" } },
            { name: "b", inputs: [{ data: "v", text: "0", each: true }, { data: "k", text: "3" }, { data: "k", text: "4" }], expected: { output: "" } },
            { name: "c", inputs: [{ data: "k", text: "3" }], expected: { output: "" } },
          ],
        },
      ],
    });
    if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
    const voci = (p: Progetto) => funzione(p, "f2").test_cases!.map((c) => c.inputs.map((v) => `${v.data}${v.each === true ? "*" : ""}=${v.text ?? ""}`).join(" "));
    expect(voci(dopo(spostaParametro(1, -1, "f2"), esito.progetto))).toEqual(["k=5 v=1 v=2 k=7", "k=3 v*=0 k=4", "k=3"]);
    expect(voci(dopo(eliminaParametro(0, "f2", true), esito.progetto))).toEqual(["k=5 k=7", "k=3 k=4", "k=3"]);
    expect(voci(dopo(eliminaParametro(1, "f2", false), esito.progetto))).toEqual(["v=1 v=2 k=7", "v*=0 k=4", "k=3"]);
  });

  test("il riferimento che passa per uscita esce dalle voci dei casi della procedura, in un passo; un altro dato no", () => {
    const esito = leggi({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "prova" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "call", callee: "q", arguments: ["1", "r"] }], end: { id: "b2" } },
        {
          id: "f2",
          kind: "procedure",
          name: "q",
          data: [
            { name: "a", type: "integer", parameter: "value" },
            { name: "u", type: "integer", parameter: "reference" },
            { name: "x", type: "integer" },
          ],
          body: [
            { id: "b3", kind: "read", target: "x" },
            { id: "b5", kind: "assignment", target: "u", value: "a + x" },
          ],
          end: { id: "b4" },
          test_cases: [{ name: "a", inputs: [{ data: "a", text: "5" }, { data: "u", text: "9" }, { data: "x", text: "2" }], expected: { output: "u = 7\n" } }],
        },
      ],
    });
    if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
    const voci = (p: Progetto) => funzione(p, "f2").test_cases!.map((c) => c.inputs.map((v) => `${v.data}=${v.text ?? ""}`).join(" "));
    const dopoLaCorrezione = dopo(perUscita(1, "f2"), esito.progetto);
    // Prima il programma passa a u un dato senza valore (l'errore che offre la correzione); dopo il caso arriva alla fine
    // senza voci in più (con la voce di u resterebbe una voce non usata).
    const ottenuto = (p: Progetto) => {
      const e = eseguiCaso(p, funzione(p, "f2").test_cases![0]!, tetti, "f2");
      return e.fuoriTappa ? "fuori" : `${JSON.stringify(e.ottenuto.output)} ${e.ottenuto.static_error?.code ?? ""}${e.ottenuto.error?.code ?? ""}`;
    };
    expect({
      parametro: funzione(dopoLaCorrezione, "f2").data[1]!.parameter,
      voci: voci(dopoLaCorrezione),
      prima: ottenuto(esito.progetto),
      dopo: ottenuto(dopoLaCorrezione),
      valore: perUscita(0, "f2")(esito.progetto, 100).ok,
      lavoro: perUscita(2, "f2")(esito.progetto, 100).ok,
    }).toEqual({ parametro: "out", voci: ["a=5 x=2"], prima: '"" reference_without_value', dopo: '"\\nu = 7\\n" ', valore: false, lavoro: false });
  });

  test("un parametro di uscita non ha voci nei casi: spostare o eliminare gli altri porta lo stesso le loro", () => {
    const esito = leggi({
      format: "algodesign",
      schema_version: 1,
      metadata: { name: "prova" },
      functions: [
        { id: "f1", kind: "main", data: [{ name: "r", type: "integer" }], body: [{ id: "b1", kind: "call", callee: "q", arguments: ["1", "2", "r"] }], end: { id: "b2" } },
        {
          id: "f2",
          kind: "procedure",
          name: "q",
          data: [
            { name: "a", type: "integer", parameter: "value" },
            { name: "b", type: "integer", parameter: "value" },
            { name: "u", type: "integer", parameter: "out" },
          ],
          body: [{ id: "b3", kind: "assignment", target: "u", value: "a - b" }],
          end: { id: "b4" },
          test_cases: [{ name: "a", inputs: [{ data: "a", text: "5" }, { data: "b", text: "2" }], expected: { output: "u = 3\n" } }],
        },
      ],
    });
    if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
    const voci = (p: Progetto) => funzione(p, "f2").test_cases!.map((c) => c.inputs.map((v) => `${v.data}=${v.text ?? ""}`).join(" "));
    expect({
      spostato: voci(dopo(spostaParametro(1, -1, "f2"), esito.progetto)),
      eliminato: voci(dopo(eliminaParametro(0, "f2", true), esito.progetto)),
      uscitaSpostata: voci(dopo(spostaParametro(2, -1, "f2"), esito.progetto)),
      uscitaEliminata: voci(dopo(eliminaParametro(2, "f2", true), esito.progetto)),
    }).toEqual({ spostato: ["b=2 a=5"], eliminato: ["b=2"], uscitaSpostata: ["a=5 b=2"], uscitaEliminata: ["a=5 b=2"] });
  });

  test("Annulla riporta il parametro spostato e le chiamate, in un passo", () => {
    const c = applicaPasso(inizia(conDueParametri()), spostaParametro(2, -1, "f2"));
    if (!c.ok) throw new Error("passo");
    expect(salva(annulla(c.cronologia).presente)).toBe(salva(conDueParametri()));
  });
});

/** Una costante comune `MAX` usata dal programma principale e da `doppio`, una costante `K` del programma, e una procedura
 * `q` con un dato suo che si chiama `MAX` (un errore: le sue regole restano sue). */
function conComuni(): Progetto {
  const esito = leggi({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "prova" },
    shared_constants: [{ name: "MAX", type: "integer", constant: true, initial: "10" }],
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [
          { name: "x", type: "integer" },
          { name: "K", type: "integer", constant: true, initial: "2" },
        ],
        body: [{ id: "b1", kind: "assignment", target: "x", value: "MAX + K" }],
        end: { id: "b90" },
      },
      { id: "f2", kind: "function", name: "doppio", return_type: "integer", data: [{ name: "n", type: "integer", parameter: "value" }], body: [], end: { id: "b91", return_value: "n * MAX" } },
      { id: "f3", kind: "procedure", name: "q", data: [{ name: "MAX", type: "integer" }], body: [{ id: "b2", kind: "assignment", target: "MAX", value: "1" }], end: { id: "b92" } },
    ],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}

describe("le costanti comuni", () => {
  test("una costante della funzione diventa comune, in fondo; e torna fra i dati della funzione mostrata", () => {
    const p = dopo(rendiComune(1, "f1"), conComuni());
    expect(p.shared_constants?.map((d) => d.name)).toEqual(["MAX", "K"]);
    expect(funzione(p, "f1").data.map((d) => d.name)).toEqual(["x"]);
    expect(blocco(p, "b1")).toMatchObject({ value: "MAX + K" });
    const q = dopo(rendiDellaFunzione(0, "f2"), conComuni());
    expect(q.shared_constants).toBeUndefined();
    expect(funzione(q, "f2").data).toEqual([
      { name: "n", type: "integer", parameter: "value" },
      { name: "MAX", type: "integer", constant: true, initial: "10" },
    ]);
    // Senza funzione, il programma principale.
    expect(funzione(dopo(rendiDellaFunzione(0), conComuni()), "f1").data.map((d) => d.name)).toEqual(["x", "K", "MAX"]);
  });

  test("rinominare una costante comune cambia le regole di ogni funzione che non ha un dato suo con quel nome", () => {
    const p = dopo(cambiaComune(0, { name: "LIMITE", type: "integer", constant: true, initial: "20" }), conComuni());
    expect(p.shared_constants).toEqual([{ name: "LIMITE", type: "integer", constant: true, initial: "20" }]);
    expect(blocco(p, "b1")).toMatchObject({ value: "LIMITE + K" });
    expect(funzione(p, "f2").end.return_value).toBe("n * LIMITE");
    expect(blocco(p, "b2")).toMatchObject({ target: "MAX" });
  });

  test("eliminare, duplicare e spostare", () => {
    const p = dopo(eliminaComune(0), conComuni());
    expect(p.shared_constants).toBeUndefined();
    expect(blocco(p, "b1")).toMatchObject({ value: "MAX + K" });
    // La copia ha il primo nome libero fra le costanti comuni e i dati di ogni funzione.
    const q = dopo(duplicaComune(0), dopo(rendiComune(1, "f1"), conComuni()));
    expect(q.shared_constants?.map((d) => d.name)).toEqual(["MAX", "MAX_2", "K"]);
    expect(dopo(spostaComune(2, -1), q).shared_constants?.map((d) => d.name)).toEqual(["MAX", "K", "MAX_2"]);
    expect([spostaComune(0, -1)(q, 99), eliminaComune(3)(q, 99), rendiComune(5, "f1")(q, 99)]).toEqual([
      { ok: false, rifiuto: { motivo: "al_bordo" } },
      { ok: false, rifiuto: { motivo: "dato_inesistente" } },
      { ok: false, rifiuto: { motivo: "dato_inesistente" } },
    ]);
  });

  test("dove si usa: le regole e le funzioni, tranne quelle che hanno un dato loro con quel nome", () => {
    expect(regoleCheUsanoLaComune(conComuni(), "MAX")).toBe(2);
    expect(funzioniCheUsano(conComuni(), "MAX")).toEqual(["f1", "f2"]);
    // Un dato della funzione stessa non è la costante comune: la funzione non la usa.
    expect(funzioniCheUsano(conComuni(), "K")).toEqual([]);
    expect(funzioniCheUsano(dopo(rendiComune(1, "f1"), conComuni()), "K")).toEqual(["f1"]);
  });
});
