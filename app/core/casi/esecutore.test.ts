// L'esecutore dei casi d'uso: le regole delle voci del caso e l'esito a due livelli (raggiunto se coincidono
// output, errore ed errore statico; gli avvisi diversi a parte), con l'output del caso tenuto fino all'atteso più un
// margine; una procedura o una funzione eseguita da sola (i parametri come voci, anche senza testo o per ogni elemento,
// l'a capo e i risultati in fondo). Ogni esito atteso è scritto a mano, in una riga, prima del codice e senza chiamare
// il nucleo. Il corpus
// intero lo esegue `bun run casi` (porta «casi» del collaudo); qui le regole, una per prova, e alcuni casi del corpus.
// L'ultima prova appaia le regole d'esecuzione del censimento del formato e i codici che il censimento
// dell'interprete assegna all'esecutore con le prove di questo file.
//
// CHE COSA NON GUARDA:
// - l'esecuzione passo passo di un caso (le pause, la console, i punti di interruzione) e l'uguaglianza fra la riga
//   di comando e l'esecuzione della finestra sul corpus: `esecuzione.test.ts`;
// - le righe che la riga di comando stampa per ogni esito: la porta «casi» del collaudo;
// - le operazioni che scrivono l'esito nell'atteso: `operazioni.test.ts`;
// - come la finestra mostra la prima differenza (qui solo la funzione che la trova, `primaDifferenza`).

import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apri, leggi } from "../progetto/formato";
import type { CasoDUso, Progetto } from "../progetto/modello";
import { senzaValore } from "../interprete/interprete";
import { tetti } from "../controllo/controllo";
import { Esecuzione } from "../esecuzione/esecuzione";
import { eseguiCaso, type EsitoDelCaso } from "./esecutore";
import { primaDifferenza } from "./esito";

/** Le etichette delle prove eseguite: una conta solo se il suo corpo arriva in fondo (un corpo che fallisce non la
 * dà al censimento), e un corpo senza asserzioni fa rossa la sua prova. */
const provati = new Set<string>();
function prova(etichetta: string, corpo: () => void): void {
  test(etichetta, () => {
    expect.hasAssertions();
    corpo();
    provati.add(etichetta);
  });
}

type Json = any;
function progetto(data: Json[], body: Json[], casi: Json[]): { p: Progetto; casi: readonly CasoDUso[] } {
  const esito = leggi({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "prova" },
    functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }],
    test_cases: casi,
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return { p: esito.progetto, casi: esito.progetto.test_cases! };
}
const caso = (name: string, inputs: [string, string][], expected: Json) => ({ name, inputs: inputs.map(([data, text]) => ({ data, text })), expected });

/** Un esito in una riga: «fuori tappa»; «raggiunto», o «non raggiunto: campo: atteso / ottenuto; …» (con
 * «(tagliato)» per un ottenuto tenuto fino al margine); poi, se gli avvisi sono diversi, «; avvisi: attesi /
 * ottenuti». */
function inUnaRiga(e: EsitoDelCaso): string {
  if (e.fuoriTappa) return "fuori tappa";
  const livello = e.raggiunto ? "raggiunto" : `non raggiunto: ${e.differenze.map((d) => `${d.campo}: ${d.atteso} / ${d.ottenuto}${d.tagliato ? " (tagliato)" : ""}`).join("; ")}`;
  return e.avvisi ? `${livello}; avvisi: ${e.avvisi.attesi} / ${e.avvisi.ottenuti}` : livello;
}

/** L'esito di ogni caso, in una riga. */
function esiti(data: Json[], body: Json[], ...casi: Json[]): string[] {
  const { p, casi: letti } = progetto(data, body, casi);
  return letti.map((c) => inUnaRiga(eseguiCaso(p, c, tetti)));
}

const a = { name: "a", type: "integer", role: "input" };
const b = { name: "b", type: "integer", role: "input" };
const leggiAB = [
  { id: "b1", kind: "read", target: "a" },
  { id: "b2", kind: "read", target: "b" },
  { id: "b3", kind: "write", values: ["a + b"], newline: false },
];

prova("input_mismatch", () => {
  // Le voci in ordine sbagliato non passano «per caso»: la prima lettura chiede `a` e trova `b`.
  expect(esiti([a, b], leggiAB, caso("scambiate", [["b", "1"], ["a", "2"]], { output: "", error: { code: "input_mismatch", block: "b1" } }))).toEqual(["raggiunto"]);
  // Sulla seconda lettura: il blocco è quello della lettura che trova la voce sbagliata.
  expect(esiti([a, b], leggiAB, caso("seconda", [["a", "1"], ["a", "2"]], { output: "", error: { code: "input_mismatch", block: "b2" } }))).toEqual(["raggiunto"]);
  expect(esiti([a, b], leggiAB, caso("seconda col blocco sbagliato", [["a", "1"], ["a", "2"]], { output: "", error: { code: "input_mismatch", block: "b1" } }))).toEqual([
    "non raggiunto: error: input_mismatch@b1 / input_mismatch@b2",
  ]);
  // Una voce destinata a un altro dato, in un caso che attende l'output: non raggiunto, con l'errore ottenuto.
  expect(esiti([a, b], leggiAB, caso("attende l'output", [["b", "1"], ["a", "2"]], { output: "3" }))).toEqual(["non raggiunto: output: 3 / ; error: nessuno / input_mismatch@b1"]);
  expect(esiti([a, b], leggiAB, caso("giuste", [["a", "1"], ["b", "2"]], { output: "3" }))).toEqual(["raggiunto"]);
  // Per un elemento di vettore la voce porta il nome del vettore.
  const v = { name: "v", type: "integer", size: 2, role: "input" };
  const leggiV = [{ id: "b1", kind: "read", target: "v[1]" }, { id: "b2", kind: "write", values: ["v[1]"], newline: false }];
  expect(esiti([v], leggiV, caso("vettore", [["v", "7"]], { output: "7" }))).toEqual(["raggiunto"]);
});

prova("unused_inputs", () => {
  expect(esiti([a, b], leggiAB, caso("avanzi", [["a", "1"], ["b", "2"], ["a", "3"]], { output: "3", error: { code: "unused_inputs", block: "fine" } }))).toEqual(["raggiunto"]);
  // Le voci avanzate in un caso che attende la fine normale: l'output c'è, l'errore no.
  expect(esiti([a, b], leggiAB, caso("avanzi non attesi", [["a", "1"], ["b", "2"], ["a", "3"]], { output: "3" }))).toEqual(["non raggiunto: error: nessuno / unused_inputs@fine"]);
  // Con un errore prima della fine le voci rimaste non contano: l'esito è l'errore, e non `unused_inputs`.
  expect(esiti([a, b], leggiAB, caso("errore", [["a", "x"], ["b", "2"]], { output: "", error: { code: "invalid_input", block: "b1" } }))).toEqual(["raggiunto"]);
  const divide = [{ id: "b1", kind: "read", target: "a" }, { id: "b2", kind: "write", values: ["10 / a"], newline: false }];
  expect(esiti([a], divide, caso("divisione", [["a", "0"], ["a", "5"]], { output: "", error: { code: "division_by_zero", block: "b2" } }))).toEqual(["raggiunto"]);
});

prova("F7.5", () => {
  // Voci finite prima delle letture: l'errore dell'interprete sulla lettura che non ha la sua voce.
  expect(esiti([a, b], leggiAB, caso("finite", [["a", "1"]], { output: "", error: { code: "input_exhausted", block: "b2" } }))).toEqual(["raggiunto"]);
  // Un input non valido è un esito, non una lettura richiesta: l'esecuzione si ferma lì, e la voce dopo non conta.
  expect(esiti([a, b], leggiAB, caso("non valido", [["a", "1"], ["b", "due"]], { output: "", error: { code: "invalid_input", block: "b2" } }))).toEqual(["raggiunto"]);
  expect(esiti([a, b], leggiAB, caso("non valido, poi la voce giusta", [["a", "1"], ["b", "due"], ["b", "2"]], { output: "3" }))).toEqual([
    "non raggiunto: output: 3 / ; error: nessuno / invalid_input@b2",
  ]);
});

prova("F8.6", () => {
  // `warnings` assente vale «nessun avviso atteso». Un avviso in più non toglie il raggiunto: si dice a parte.
  // La divisione intera confrontata con un reale, in una condizione: nessun dato, quindi nessun altro avviso (un dato
  // che riceve un valore e non si legge ne avrebbe uno suo).
  const senzaDati: Json[] = [];
  const corpo = [{ id: "b1", kind: "if", condition: "7 / 2 < 1.5", then: [], else: [] }];
  const avviso = { code: "integer_division_to_real", block: "b1" };
  expect(esiti(senzaDati, corpo, caso("taciuto", [], { output: "" }), caso("atteso", [], { output: "", warnings: [avviso] }))).toEqual([
    "raggiunto; avvisi: nessuno / integer_division_to_real@b1",
    "raggiunto",
  ]);
  // Lo stesso codice su un altro blocco è un altro avviso: si confrontano codice e blocco.
  expect(esiti(senzaDati, corpo, caso("altro blocco", [], { output: "", warnings: [{ code: "integer_division_to_real", block: "b9" }] }))).toEqual([
    "raggiunto; avvisi: integer_division_to_real@b9 / integer_division_to_real@b1",
  ]);
  // Un avviso atteso che il progetto non ha: anche questo a parte, e anche in un caso non raggiunto.
  expect(esiti(senzaDati, corpo, caso("in meno e output sbagliato", [], { output: "x", warnings: [avviso, { code: "real_equality", block: "b1" }] }))).toEqual([
    "non raggiunto: output: x / ; avvisi: integer_division_to_real@b1, real_equality@b1 / integer_division_to_real@b1",
  ]);
});

prova("F8.7", () => {
  // Output, errore ed errore statico decidono il raggiunto; gli avvisi stanno a parte.
  const x = { name: "x", type: "integer", initial: "0" };
  const corpo = [{ id: "b1", kind: "write", values: ["10 / x"], newline: false }];
  expect(
    esiti(
      [x],
      corpo,
      caso("giusto", [], { output: "", error: { code: "division_by_zero", block: "b1" } }),
      caso("output", [], { output: "1", error: { code: "division_by_zero", block: "b1" } }),
      caso("codice", [], { output: "", error: { code: "integer_overflow", block: "b1" } }),
      caso("blocco", [], { output: "", error: { code: "division_by_zero", block: "b2" } }),
      caso("statico", [], { output: "", static_error: { code: "unknown_name", block: "b1" } }),
      caso("avviso", [], { output: "", error: { code: "division_by_zero", block: "b1" }, warnings: [{ code: "real_equality", block: "b1" }] }),
    ),
  ).toEqual([
    "raggiunto",
    "non raggiunto: output: 1 / ",
    "non raggiunto: error: integer_overflow@b1 / division_by_zero@b1",
    "non raggiunto: error: division_by_zero@b2 / division_by_zero@b1",
    "non raggiunto: error: nessuno / division_by_zero@b1; static_error: unknown_name@b1 / nessuno",
    "raggiunto; avvisi: real_equality@b1 / nessuno",
  ]);
});

test("con errori statici si confronta il primo, e il progetto non parte", () => {
  const corpo = [
    { id: "b1", kind: "write", values: ["y"], newline: false },
    { id: "b2", kind: "write", values: ["z"], newline: false },
  ];
  expect(esiti([], corpo, caso("primo", [], { output: "", static_error: { code: "unknown_name", block: "b1" } }))).toEqual(["raggiunto"]);
  expect(esiti([], corpo, caso("secondo", [], { output: "", static_error: { code: "unknown_name", block: "b2" } }))).toEqual([
    "non raggiunto: static_error: unknown_name@b2 / unknown_name@b1",
  ]);
});

prova("F7.6", () => {
  // Un output più lungo dell'atteso non è raggiunto: l'ottenuto si tiene fino all'atteso più il margine, e il confronto
  // resta esatto. Il margine dichiarato: mille caratteri oltre l'atteso (i 1001 qui sotto).
  const due = [{ id: "b1", kind: "write", values: ['"ab"'], newline: false }];
  expect(esiti([], due, caso("uno in più", [], { output: "a" }), caso("giusto", [], { output: "ab" }), caso("uno in meno", [], { output: "abc" }))).toEqual([
    "non raggiunto: output: a / ab",
    "raggiunto",
    "non raggiunto: output: abc / ab",
  ]);
  // «x» scritto `volte` volte, senza a capo.
  const scrive = (volte: number) => [
    { id: "b1", kind: "while", condition: `n < ${volte}`, body: [{ id: "b2", kind: "write", values: ['"x"'], newline: false }, { id: "b3", kind: "assignment", target: "n", value: "n + 1" }] },
  ];
  const n = { name: "n", type: "integer", initial: "0" };
  // Atteso «x»: 1001 caratteri scritti stanno nel margine e si tengono interi; 1002 no, e se ne tengono 1001.
  expect(esiti([n], scrive(1001), caso("nel margine", [], { output: "x" }))).toEqual([`non raggiunto: output: x / ${"x".repeat(1001)}`]);
  expect(esiti([n], scrive(1002), caso("oltre il margine", [], { output: "x" }))).toEqual([`non raggiunto: output: x / ${"x".repeat(1001)} (tagliato)`]);
  // Un ottenuto molto più lungo dell'atteso: tagliato, mai uguale. L'atteso lungo quanto ciò che si tiene non basta.
  expect(esiti([n], scrive(5000), caso("lungo", [], { output: "x".repeat(4000) }))).toEqual([`non raggiunto: output: ${"x".repeat(4000)} / ${"x".repeat(5000)}`]);
  expect(esiti([n], scrive(5000), caso("tagliato", [], { output: "x".repeat(10) }))).toEqual([`non raggiunto: output: ${"x".repeat(10)} / ${"x".repeat(1010)} (tagliato)`]);
});

prova("F7.7", () => {
  // Senza la tabella di traccia (la riga di comando) l'esito è quello dell'esecuzione con la tabella (la finestra). Sul
  // corpus intero lo prova `esecuzione.test.ts`.
  const { p, casi } = progetto([a, b], leggiAB, [
    caso("giuste", [["a", "1"], ["b", "2"]], { output: "3" }),
    caso("finite", [["a", "1"]], { output: "", error: { code: "input_exhausted", block: "b2" } }),
    caso("sbagliato", [["a", "1"], ["b", "2"]], { output: "4" }),
  ]);
  const conTabella = (c: CasoDUso) => {
    const e = new Esecuzione(p, tetti, { caso: c });
    e.comanda("continua");
    while (e.stato.genere === "in corso") e.fetta(() => 0, Infinity);
    return inUnaRiga(e.esito!);
  };
  expect(casi.map(conTabella)).toEqual(casi.map((c) => inUnaRiga(eseguiCaso(p, c, tetti))));
  expect(casi.map(conTabella)).toEqual(["raggiunto", "raggiunto", "non raggiunto: output: 4 / 3"]);
});

test("un carattere fuori dal piano di base non si spezza dove l'output si taglia", () => {
  // L'atteso «a» e il margine finiscono a metà della faccina scritta dopo 1000 «x»: se ne tiene solo l'intero.
  const faccina = String.fromCodePoint(0x1f600);
  const corpo = [{ id: "b1", kind: "write", values: [`"a${"x".repeat(999)}${faccina}"`], newline: false }];
  expect(esiti([], corpo, caso("faccina", [], { output: "a" }))).toEqual([`non raggiunto: output: a / a${"x".repeat(999)} (tagliato)`]);
});

test("la ricorsione si esegue: il caso della tappa 4 arriva al suo arresto; con un controllo dato che la dice fuori tappa (quello di uno strato che non la sa mostrare) non parte", () => {
  const p = delCorpus("ricorsione-profonda", "tappa-4");
  expect(p.test_cases!.map((c) => inUnaRiga(eseguiCaso(p, c, tetti)))).toEqual(["raggiunto"]);
  const fuori = (c: CasoDUso) => {
    const e = new Esecuzione(p, tetti, { caso: c, controllo: { fuoriTappa: true, blocchi: ["b4"] } });
    return inUnaRiga(e.esito!);
  };
  expect(p.test_cases!.map(fuori)).toEqual(["fuori tappa"]);
});

test("i limiti sono quelli dati, non i predefiniti", () => {
  const v = { name: "v", type: "integer", size: 600, initial: { each: "4" } };
  const { p, casi } = progetto([v], [{ id: "b1", kind: "write", values: ["v[599]"], newline: false }], [caso("ultimo", [], { output: "4" })]);
  const conLimite = (n: number) => inUnaRiga(eseguiCaso(p, casi[0]!, { ...tetti, elementiDiUnVettore: n }));
  expect([conLimite(600), conLimite(599)]).toEqual(["raggiunto", "non raggiunto: output: 4 / ; static_error: nessuno / limit_exceeded@f1"]);
});

// ------------------------------------------------------ una procedura o una funzione eseguita da sola

/** Un progetto con un programma principale che non fa nulla e una procedura o una funzione `f2` coi suoi casi. */
function conFunzione(f: Json): Progetto {
  const esito = leggi({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "prova" },
    functions: [{ id: "f1", kind: "main", data: [], body: [], end: { id: "fine" } }, { id: "f2", ...f }],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
/** L'esito di ogni caso di `f2` eseguita da sola, in una riga. */
const esitiDiF2 = (f: Json): string[] => {
  const p = conFunzione(f);
  return p.functions[1]!.test_cases!.map((c) => inUnaRiga(eseguiCaso(p, c, tetti, "f2")));
};
const intero = (name: string, altro: Json = {}) => ({ name, type: "integer", ...altro });
const casoDi = (name: string, inputs: Json[], expected: Json) => ({ name, inputs, expected });

test("una funzione da sola: il parametro come lettura, poi «→ » e ciò che restituisce; l'atteso cambiato fa rosso", () => {
  const doppio = (casi: Json[]) => ({ kind: "function", name: "doppio", return_type: "integer", data: [intero("x", { parameter: "value" })], body: [], end: { id: "b9", return_value: "x * 2" }, test_cases: casi });
  expect(esitiDiF2(doppio([casoDi("giusto", [{ data: "x", text: "21" }], { output: "→ 42\n" }), casoDi("cambiato", [{ data: "x", text: "21" }], { output: "→ 41\n" })]))).toEqual([
    "raggiunto",
    "non raggiunto: output: → 41\n / → 42\n",
  ]);
  // Una riga non valida per il parametro, una voce senza testo per un parametro per valore, una voce per ogni elemento a
  // un dato semplice: «input non valido» sulla funzione, il suo «Inizio».
  const nonValido = { output: "", error: { code: "invalid_input", block: "f2" } };
  expect(esitiDiF2(doppio([casoDi("a", [{ data: "x", text: "uno" }], nonValido), casoDi("b", [{ data: "x" }], nonValido), casoDi("c", [{ data: "x", text: "3", each: true }], nonValido)]))).toEqual([
    "raggiunto",
    "raggiunto",
    "raggiunto",
  ]);
});

test("una procedura da sola: a fine corsa un a capo, poi «nome = valore» per ogni parametro per riferimento", () => {
  const raddoppia = { kind: "procedure", name: "raddoppia", data: [intero("x", { parameter: "reference" })], body: [{ id: "b1", kind: "assignment", target: "x", value: "x * 2" }], end: { id: "b9" } };
  expect(esitiDiF2({ ...raddoppia, test_cases: [casoDi("cinque", [{ data: "x", text: "5" }], { output: "\nx = 10\n" })] })).toEqual(["raggiunto"]);
  // Una procedura senza parametri per riferimento non aggiunge nulla; con una scrittura che non va a capo, l'a capo dei
  // risultati viene lo stesso.
  const scrive = { kind: "procedure", name: "scrive", data: [intero("x", { parameter: "value" })], body: [{ id: "b1", kind: "write", values: ["x"], newline: false }], end: { id: "b9" } };
  expect(esitiDiF2({ ...scrive, test_cases: [casoDi("tre", [{ data: "x", text: "3" }], { output: "3" })] })).toEqual(["raggiunto"]);
  const scriveERaddoppia = { ...raddoppia, body: [{ id: "b2", kind: "write", values: ['"x: "'], newline: false }, ...raddoppia.body] };
  expect(esitiDiF2({ ...scriveERaddoppia, test_cases: [casoDi("due", [{ data: "x", text: "2" }], { output: "x: \nx = 4\n" })] })).toEqual(["raggiunto"]);
});

test("un parametro per riferimento vuole il valore: la voce senza testo si ferma sulla funzione; uno per uscita non si chiede", () => {
  const chiedi = (modo: string, casi: Json[]) => ({ kind: "procedure", name: "chiedi", data: [intero("n", { parameter: modo })], body: [{ id: "b1", kind: "read", target: "n" }], end: { id: "b9" }, test_cases: casi });
  expect(
    esitiDiF2(
      chiedi("reference", [
        // Un caso scritto quando un riferimento poteva arrivare senza valore: si apre, e si ferma sul suo «Inizio».
        casoDi("senza valore", [{ data: "n" }, { data: "n", text: "4" }], { output: "", error: { code: "reference_without_value", block: "f2" } }),
        // La sola voce della lettura va al parametro: la lettura resta senza voce.
        casoDi("una voce sola", [{ data: "n", text: "4" }], { output: "", error: { code: "input_exhausted", block: "b1" } }),
        // Una voce senza testo per la lettura del blocco: non è una riga.
        casoDi("lettura senza testo", [{ data: "n", text: "3" }, { data: "n" }], { output: "", error: { code: "invalid_input", block: "b1" } }),
      ]),
    ),
  ).toEqual(["raggiunto", "raggiunto", "raggiunto"]);
  // Per uscita il parametro non ha voce: la sola voce va alla lettura.
  expect(esitiDiF2(chiedi("out", [casoDi("una voce sola", [{ data: "n", text: "4" }], { output: "\nn = 4\n" })]))).toEqual(["raggiunto"]);
  // Senza valore anche alla fine: scriverlo si ferma sulla fine, dopo l'a capo dei risultati (e il parametro che nessun
  // blocco nomina avvisa).
  const niente = { kind: "procedure", name: "niente", data: [intero("n", { parameter: "out" })], body: [], end: { id: "b9" } };
  const atteso = { output: "\n", error: { code: "uninitialized", block: "b9" }, warnings: [{ code: "unused_data", block: "f2" }] };
  expect(esitiDiF2({ ...niente, test_cases: [casoDi("vuoto", [], atteso)] })).toEqual(["raggiunto"]);
});

test("un parametro vettore: un elemento per voce, o tutti con una voce sola (`each`); per uscita nessuna voce", () => {
  const vettore = { name: "v", type: "integer", size: 3, parameter: "reference" };
  const azzera = { kind: "procedure", name: "azzera", data: [vettore], body: [{ id: "b1", kind: "assignment", target: "v[1]", value: "7" }], end: { id: "b9" } };
  const tre = [{ data: "v", text: "4" }, { data: "v", text: "5" }, { data: "v", text: "6" }];
  expect(
    esitiDiF2({
      ...azzera,
      test_cases: [
        casoDi("uno per uno", tre, { output: "\nv[0] = 4\nv[1] = 7\nv[2] = 6\n" }),
        casoDi("tutti", [{ data: "v", text: "0", each: true }], { output: "\nv[0] = 0\nv[1] = 7\nv[2] = 0\n" }),
        // `each` solo al primo elemento: al secondo non è una riga.
        casoDi("tardi", [{ data: "v", text: "4" }, { data: "v", text: "0", each: true }], { output: "", error: { code: "invalid_input", block: "f2" } }),
      ],
    }),
  ).toEqual(["raggiunto", "raggiunto", "raggiunto"]);
  const metti = (modo: string) => ({ kind: "procedure", name: "metti", data: [{ ...vettore, size: 2, parameter: modo }], body: [{ id: "b1", kind: "assignment", target: "v[0]", value: "1" }, { id: "b2", kind: "assignment", target: "v[1]", value: "2" }], end: { id: "b9" } });
  expect(esitiDiF2({ ...metti("out"), test_cases: [casoDi("per uscita", [], { output: "\nv[0] = 1\nv[1] = 2\n" })] })).toEqual(["raggiunto"]);
  // Per riferimento la voce per tutti senza testo si ferma, come una voce senza testo.
  const fermo = { output: "", error: { code: "reference_without_value", block: "f2" } };
  expect(esitiDiF2({ ...metti("reference"), test_cases: [casoDi("tutti senza valore", [{ data: "v", each: true }], fermo)] })).toEqual(["raggiunto"]);
});

test("un solo esecutore: il caso di una funzione passo passo dà l'esito della riga di comando, e le voci sono righe «letto»", () => {
  const p = delCorpus("riferimento-media-voti-funzioni", "tappa-3");
  const valido = p.functions.find((f) => f.name === "valido")!;
  for (const c of valido.test_cases!) {
    const e = new Esecuzione(p, tetti, { caso: c, funzione: valido.id });
    for (let k = 0; k < 100 && e.stato.genere !== "finita"; k++) {
      if (e.stato.genere === "pronta" || e.stato.genere === "pausa") e.comanda("sopra");
      e.fetta(() => 0, Infinity);
    }
    expect({ caso: c.name, esito: inUnaRiga(e.esito!), console: e.console }).toEqual({
      caso: c.name,
      esito: inUnaRiga(eseguiCaso(p, c, tetti, valido.id)),
      console: [{ genere: "letto", dato: "voto", testo: c.inputs[0]!.text! }, { genere: "scrive", testo: c.expected.output.slice(0, -1), aCapo: true }],
    });
  }
});

test("alla console, senza caso: la richiesta dice il parametro; nessun valore e una riga per ogni elemento solo dove si può", () => {
  const p = conFunzione({
    kind: "procedure",
    name: "p",
    data: [intero("x", { parameter: "value" }), { name: "v", type: "integer", size: 2, parameter: "reference" }],
    body: [],
    end: { id: "b9" },
  });
  const e = new Esecuzione(p, tetti, { funzione: "f2" });
  e.comanda("continua");
  e.fetta(() => 0, Infinity);
  expect(e.stato).toEqual({ genere: "chiede", dato: "x", nonValido: false, parametro: "valore" });
  expect(() => e.inserisci(senzaValore)).toThrow();
  expect(() => e.inserisci({ ognuno: "1" })).toThrow();
  e.inserisci("1");
  e.fetta(() => 0, Infinity);
  expect(e.stato).toEqual({ genere: "chiede", dato: "v", nonValido: false, parametro: "riferimento", elemento: 0 });
  e.inserisci({ ognuno: "8" });
  e.fetta(() => 0, Infinity);
  expect(e.stato).toEqual({ genere: "finita" });
  expect(e.console.map((r) => r.testo)).toEqual(["1", "8", "", "v[0] = 8", "v[1] = 8"]);
});

// ------------------------------------------------------------------------- casi del corpus

const delCorpus = (nome: string, tappa = "tappa-1"): Progetto => {
  const a = apri(readFileSync(join(import.meta.dir, "..", "..", "casi", tappa, `${nome}.algo`), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
/** L'esito del primo caso del file, con l'atteso cambiato da `cambia`. */
function delFile(nome: string, cambia: (atteso: Json) => Json = (x) => x): string {
  const p = delCorpus(nome);
  const c = p.test_cases![0]!;
  return inUnaRiga(eseguiCaso(p, { ...c, expected: cambia(structuredClone(c.expected)) }, tetti));
}

test("casi del corpus: l'esito di ciascuno scritto a mano, anche con l'atteso cambiato", () => {
  const visti = [
    delFile("divisione-intera-in-reale"),
    delFile("divisione-intera-in-reale", ({ warnings: _, ...senza }) => senza),
    delFile("senza-valore-intero", (x) => ({ ...x, output: "1\n" })),
    delFile("divisione-per-zero", (x) => ({ ...x, error: { code: "division_by_zero", block: "b2" } })),
    delFile("input-finito"),
    delFile("scrittura-intero", (x) => ({ ...x, output: "-42 2147483647" })),
  ];
  const attesi = [
    "raggiunto",
    "raggiunto; avvisi: nessuno / integer_division_to_real@b1",
    "non raggiunto: output: 1\n / ",
    "non raggiunto: error: division_by_zero@b2 / division_by_zero@b1",
    "raggiunto",
    "non raggiunto: output: -42 2147483647 / -42 2147483647\n",
  ];
  expect(visti).toEqual(attesi);
  // Controllo positivo: un campo dell'atteso scritto a mano cambiato fa rosso il confronto, in ciascuna delle tre
  // specie (il livello, un avviso, un errore).
  const alterazioni: [number, string][] = [
    [0, "non raggiunto: output: 3.00\n / 3.00\n"],
    [1, "raggiunto; avvisi: nessuno / integer_division_to_real@b2"],
    [3, "non raggiunto: error: division_by_zero@b2 / division_by_zero@b2"],
  ];
  for (const [k, riga] of alterazioni) expect(visti).not.toEqual(attesi.map((x, i) => (i === k ? riga : x)));
});

test("il secondo caso di un file del corpus: due casi, ciascuno col suo esito", () => {
  const p = delCorpus("lettura-intero");
  expect(p.test_cases!.map((c) => `${c.name}: ${inUnaRiga(eseguiCaso(p, c, tetti))}`)).toEqual(["lettura-intero: raggiunto", "negativo: raggiunto"]);
});

// Ultima prova del file: le regole e i codici che altri censimenti assegnano all'esecutore, appaiati con
// le prove di questo file.
test("censimento: le regole d'esecuzione del formato e i codici dell'esecutore hanno una prova qui", () => {
  const fileFormato = readFileSync(join(import.meta.dir, "..", "progetto", "formato.test.ts"), "utf8");
  const regole = [...fileFormato.matchAll(/^\s*\{ id: "(F[\d.]+)", regola: .*, dove: "esecuzione" \},$/gm)].map((m) => m[1]!);
  const fileInterprete = readFileSync(join(import.meta.dir, "..", "interprete", "interprete.test.ts"), "utf8");
  const codici = [...fileInterprete.matchAll(/^\s*(\w+): "esecutore dei casi",$/gm)].map((m) => m[1]!);
  const senzaProvaIn = (fatti: Set<string>) => [...regole, ...codici].filter((x) => !fatti.has(x));
  const senzaProva = senzaProvaIn(provati);
  // Controllo positivo: senza la prova di un codice, il censimento lo trova.
  const menoUno = new Set(provati);
  menoUno.delete("unused_inputs");
  expect(senzaProvaIn(menoUno)).toEqual(["unused_inputs"]);
  console.log(`censimento dell'esecutore: regole del formato ${regole.length} [${regole.join(", ")}], codici ${codici.length} [${codici.join(", ")}], senza prova ${senzaProva.length}`);
  expect(senzaProva).toEqual([]);
  // Controllo positivo della lettura dei due file: le voci attese ci sono tutte.
  expect([regole, codici]).toEqual([
    ["F7.5", "F7.6", "F7.7", "F8.6", "F8.7"],
    ["input_mismatch", "unused_inputs"],
  ]);
});

test("la prima differenza di due testi: dove cominciano a essere diversi, la fine del più corto, nessuna se uguali", () => {
  expect([primaDifferenza("abc", "abd"), primaDifferenza("ab", "abc"), primaDifferenza("abc", "ab"), primaDifferenza("", "x"), primaDifferenza("abc", "abc"), primaDifferenza("", "")]).toEqual([2, 2, 2, 0, -1, -1]);
  // Due caratteri fuori dal piano di base che hanno la prima unità uguale (U+1F600 e U+1F601): la differenza comincia col
  // carattere, non a metà (prima: 2, e i due riquadri mostravano mezzo carattere).
  const [a, b] = [String.fromCodePoint(0x1f600), String.fromCodePoint(0x1f601)];
  expect([primaDifferenza(`x${a}\n`, `x${b}\n`), primaDifferenza(`x${a}`, `x${a}y`), primaDifferenza(a, "")]).toEqual([1, 3, 0]);
});
