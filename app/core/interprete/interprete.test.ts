// L'interprete delle tappe dalla 1 alla 4: il corpus eseguito coi suoi casi d'uso, le prove sui comportamenti che il
// corpus non esercita, le procedure e le funzioni evento per evento (sequenze scritte a mano), il censimento dei codici
// d'errore dell'interprete e le mutazioni. I casi delle funzioni eseguite da sole li prova `core/casi/esecutore.test.ts`.
//
// Qui un caso d'uso consegna i suoi input in ordine e confronta `output`, `error.code` ed `error.block`.
// Il destinatario di ogni voce (`input_mismatch`), le voci avanzate (`unused_inputs`) e `warnings` sono
// dell'esecutore dei casi, non di queste prove. La fotografia dei dati e l'esito delle condizioni si
// provano qui su un progetto piccolo; sul riferimento e sul corpus, attraverso la tabella di traccia,
// in `core/esecuzione/esecuzione.test.ts`. I limiti delle impostazioni li provano quelle stesse prove.

import { describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apri, leggi } from "../progetto/formato";
import { tetti } from "../controllo/controllo";
import { codiciErrore, type Progetto } from "../progetto/modello";
import { esegui, stampaReale, testoDelValore, type Passo, type Restituito } from "./interprete";

// Censimento dei 20 codici d'errore dell'interprete, con dove si provano: «qui» (dal corpus o da una
// prova registrata col codice), gli altri dichiarati col loro posto. Quelli
// dell'esecutore dei casi li prova, e li appaia leggendo questo elenco, `core/casi/esecutore.test.ts`.
const postoDi: Record<string, string> = {
  uninitialized: "qui",
  index_out_of_range: "qui",
  string_too_long: "qui",
  null_character_in_string: "qui",
  invalid_character_code: "qui",
  string_longer_than_array: "qui",
  same_reference: "qui",
  reference_without_value: "qui",
  integer_overflow: "qui",
  division_by_zero: "qui",
  real_to_integer_out_of_range: "qui",
  non_finite_real: "qui",
  invalid_input: "qui",
  input_exhausted: "qui",
  input_mismatch: "esecutore dei casi",
  unused_inputs: "esecutore dei casi",
  too_many_steps: "qui",
  recursion_too_deep: "qui",
  recursion_data_too_large: "qui",
  out_of_memory: "esecuzione passo passo (core/esecuzione/esecuzione.test.ts: il motore che non prosegue)",
};

const provati = new Set<string>();
function prova(codice: string, corpo: () => void): void {
  provati.add(codice);
  test(codice, corpo);
}

// ------------------------------------------------------------------------------ eseguire un caso

type Esegui = typeof esegui;
type Esecuzione = { parte: boolean; output: string; error?: { code: string; block: string } };

/** Esegue il programma principale con le righe date in ordine; una riga non valida chiude il caso. */
function esecuzione(es: Esegui, p: Progetto, righe: readonly string[]): Esecuzione {
  const g = es(p, tetti);
  let output = "";
  let k = 0;
  let r = g.next();
  while (!r.done) {
    const x: Passo = r.value;
    if ("scrive" in x) output += x.scrive;
    if ("nonValido" in x) return { parte: true, output, error: { code: "invalid_input", block: x.nonValido } };
    r = g.next("chiedi" in x ? righe[k++] : undefined);
  }
  if (!r.value.parte) return { parte: false, output };
  return r.value.errore ? { parte: true, output, error: r.value.errore } : { parte: true, output };
}

// --------------------------------------------------------------------------------------- il corpus

const cartella = join(import.meta.dir, "..", "..", "casi");
const elenco: Record<string, string[]> = JSON.parse(readFileSync(join(cartella, "elenco.json"), "utf8"));
/** I file di una tappa nell'elenco, le cui voci sono i casi `file#caso`. */
const fileDellElenco = (tappa: string) => [...new Set(elenco[tappa]!.map((c) => c.split("#")[0]!))];

/** I file `.algo` di una cartella del corpus, per tappa, già aperti. */
function carica(radice: string): Map<string, Progetto> {
  const nomi = readdirSync(radice, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(radice, d.name))
        .filter((f) => f.endsWith(".algo"))
        .map((f) => `${d.name}/${f.slice(0, -".algo".length)}`),
    );
  return new Map(
    nomi.map((c) => {
      const a = apri(readFileSync(join(radice, `${c}.algo`), "utf8"));
      if (!a.ok) throw new Error(c);
      return [c, a.progetto] as const;
    }),
  );
}
const progetti = carica(cartella);
const suDisco = [...progetti.keys()];

/** Il corpus intero ha un caso della ricorsione che arriva al milione di passi: misurato da 2 a 10 s, oltre i 5 s
 * predefiniti di una prova. */
const tempoDelCorpus = 60_000;

/** Le tappe i cui casi si eseguono: i file delle altre non devono partire. */
const tappeEseguite = ["tappa-1", "tappa-2", "tappa-3", "tappa-4"];
const eseguita = (nome: string) => tappeEseguite.some((t) => nome.startsWith(`${t}/`));

/**
 * Il corpus con un interprete: i casi delle tappe dalla 1 alla 4 confrontati (un caso con l'errore statico atteso non deve
 * partire), gli altri file che non devono partire. Un file di quelle tappe senza casi d'uso è un difetto del corpus
 * (`senzaCasi`): non esegue nulla.
 */
function corpus(es: Esegui, insieme: Map<string, Progetto> = progetti) {
  const sbagliati: { caso: string; atteso: unknown; ottenuto: unknown }[] = [];
  const codici = new Set<string>();
  const senzaCasi: string[] = [];
  let casi = 0;
  let file = 0;
  let nonPartiti = 0;
  let statici = 0;
  for (const [nome, p] of insieme) {
    if (!eseguita(nome)) {
      if (esecuzione(es, p, []).parte) sbagliati.push({ caso: nome, atteso: "non parte", ottenuto: "parte" });
      else nonPartiti++;
      continue;
    }
    file++;
    if ((p.test_cases ?? []).length === 0) senzaCasi.push(nome);
    for (const t of p.test_cases ?? []) {
      casi++;
      // Un'eccezione è un caso rosso come un esito sbagliato: una mutazione può far lanciare invece di sbagliare.
      let eseguito: Esecuzione;
      try {
        eseguito = esecuzione(es, p, t.inputs.map((i) => i.text));
      } catch (x) {
        sbagliati.push({ caso: `${nome}#${t.name}`, atteso: t.expected, ottenuto: `eccezione: ${x}` });
        continue;
      }
      const { parte, ...ottenuto } = eseguito;
      if (t.expected.static_error !== undefined) {
        if (parte) sbagliati.push({ caso: `${nome}#${t.name}`, atteso: "non parte", ottenuto: "parte" });
        else statici++;
        continue;
      }
      const atteso = t.expected.error ? { output: t.expected.output, error: t.expected.error } : { output: t.expected.output };
      if (parte && JSON.stringify(ottenuto) === JSON.stringify(atteso)) {
        if (atteso.error) codici.add(atteso.error.code);
      } else sbagliati.push({ caso: `${nome}#${t.name}`, atteso, ottenuto });
    }
  }
  return { sbagliati, codici, senzaCasi, casi, file, nonPartiti, statici };
}

test("il corpus: i casi delle tappe dalla 1 alla 4 danno output, codice e blocco attesi; gli altri file non partono", () => {
  const nellElenco = Object.keys(elenco).flatMap((tappa) => fileDellElenco(tappa).map((n) => `${tappa}/${n}`));
  expect({ soloSuDisco: suDisco.filter((c) => !nellElenco.includes(c)), soloNellElenco: nellElenco.filter((c) => !suDisco.includes(c)) }).toEqual({
    soloSuDisco: [],
    soloNellElenco: [],
  });
  const esito = corpus(esegui);
  esito.codici.forEach((c) => provati.add(c));
  console.log(
    `interprete sul corpus: tappe dalla 1 alla 4 ${esito.file} file (elenco ${tappeEseguite.map((t) => fileDellElenco(t).length).join(" + ")}, senza casi ${esito.senzaCasi.length}), ${esito.casi} casi, verdi ${esito.casi - esito.sbagliati.length} (con l'errore statico atteso ${esito.statici}); ` +
      `codici d'errore attesi e ottenuti ${esito.codici.size}; non partiti ${esito.nonPartiti} su ${suDisco.length - esito.file}`,
  );
  expect(esito.sbagliati).toEqual([]);
  expect(esito.senzaCasi).toEqual([]);
  expect(esito.file).toBe(tappeEseguite.reduce((n, t) => n + fileDellElenco(t).length, 0));
  expect(esito.nonPartiti + esito.file).toBe(suDisco.length);
  expect(esito.statici).toBe(10);
}, tempoDelCorpus);

test("il corpus: un file della tappa 1 senza casi d'uso lo fa rosso (controllo positivo su una copia)", () => {
  const copia = mkdtempSync(join(tmpdir(), "corpus-"));
  try {
    cpSync(cartella, copia, { recursive: true });
    const vittima = "tappa-1/arrotonda-meta";
    const file = join(copia, `${vittima}.algo`);
    writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), test_cases: [] }, null, 2));
    const esito = corpus(esegui, carica(copia));
    expect({ senzaCasi: esito.senzaCasi, sbagliati: esito.sbagliati }).toEqual({ senzaCasi: [vittima], sbagliati: [] });
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
}, tempoDelCorpus);

// --------------------------------------------------------------------- prove fuori dal corpus

type Json = any;
function progetto(data: Json[], body: Json[], options?: Json): Progetto {
  const esito = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    ...(options ? { options } : {}),
    functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
const dato = (name: string, type: string, altro: Json = {}) => ({ name, type, ...altro });
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });
const leggiIn = (id: string, target: string) => ({ id, kind: "read", target });
const scrivi = (id: string, ...values: string[]) => ({ id, kind: "write", values, newline: false });
const esegue = (data: Json[], body: Json[], righe: string[] = [], options?: Json) => esecuzione(esegui, progetto(data, body, options), righe);

prova("null_character_in_string", () => {
  const z = dato("z", "integer", { initial: "0" });
  const s = dato("s", "string");
  expect(esegue([z, s], [assegna("b1", "s", '"a" + to_character z')])).toEqual({ parte: true, output: "", error: { code: "null_character_in_string", block: "b1" } });
  const v = dato("v", "character", { size: 2, initial: { each: "'a'" } });
  expect(esegue([z, s, v], [assegna("b1", "v[1]", "to_character z"), assegna("b2", "s", "to_string v")])).toEqual({
    parte: true,
    output: "",
    error: { code: "null_character_in_string", block: "b2" },
  });
  // Controllo positivo: il carattere di codice 0 in un dato carattere è ammesso.
  expect(esegue([z, dato("c", "character")], [assegna("b1", "c", "to_character z"), scrivi("b2", "to_integer c")])).toEqual({ parte: true, output: "0" });
});

describe("comportamenti della tappa 1", () => {
  test("stampa dei reali come %.Nf: metà esatte alla cifra pari, zero negativo, valori estremi", () => {
    const casi: [number, number, string][] = [
      [0.125, 2, "0.12"],
      [0.375, 2, "0.38"],
      [2.5, 0, "2"],
      [3.5, 0, "4"],
      [-2.5, 0, "-2"],
      [1.005, 2, "1.00"],
      [-0, 2, "-0.00"],
      [-0.001, 2, "-0.00"],
      [0, 0, "0"],
      [1e21, 2, "1000000000000000000000.00"],
      [5e-324, 3, "0.000"],
      [2 / 3, 15, "0.666666666666667"],
    ];
    for (const [x, n, atteso] of casi) expect({ x, n, s: stampaReale(x, n) }).toEqual({ x, n, s: atteso });
  });

  test("real_decimals del progetto", () => {
    expect(esegue([], [scrivi("b1", "2.0 / 3.0")], [], { real_decimals: 4 }).output).toBe("0.6667");
  });

  test("lo zero negativo di un intero è zero", () => {
    const n = dato("n", "integer", { initial: "0" });
    expect(esegue([n], [scrivi("b1", "to_real (-n)", '" "', "to_real (-4 mod 2)")]).output).toBe("0.00 0.00");
  });

  test("interi: i limiti e mod col divisore -1", () => {
    const m = dato("m", "integer");
    expect(esegue([m], [assegna("b1", "m", "-2147483647 - 1"), scrivi("b2", "m mod 3")])).toEqual({ parte: true, output: "-2" });
    expect(esegue([m], [assegna("b1", "m", "-2147483647 - 1"), scrivi("b2", "m mod -1")]).error).toEqual({ code: "integer_overflow", block: "b2" });
    expect(esegue([m], [assegna("b1", "m", "-2147483647 - 1"), scrivi("b2", "absolute_value m")]).error).toEqual({ code: "integer_overflow", block: "b2" });
    expect(esegue([m], [assegna("b1", "m", "2147483647"), scrivi("b2", "m + 1")]).error).toEqual({ code: "integer_overflow", block: "b2" });
    expect(esegue([], [scrivi("b1", "to_integer 2147483647.9", '" "', "to_integer (-2147483648.9)")]).output).toBe("2147483647 -2147483648");
  });

  test("and e or non valutano il secondo operando se non serve", () => {
    const p = dato("p", "boolean");
    expect(esegue([p], [scrivi("b1", "false and p", '" "', "true or p")]).output).toBe("false true");
    expect(esegue([p], [scrivi("b1", "true and p")]).error).toEqual({ code: "uninitialized", block: "b1" });
  });

  test("la scrittura di una stringa lunghissima: nessun tetto di argomenti del motore", () => {
    // Oltre il limite di Bun (fra 500 000 e 1 000 000 argomenti) e di V8 (fra 120 000 e 125 000).
    const lunga = "x".repeat(1_100_000);
    const esito = esegue([], [scrivi("b1", `"${lunga}"`)]);
    expect({ parte: esito.parte, lunghezza: esito.output.length, errore: esito.error }).toEqual({ parte: true, lunghezza: lunga.length, errore: undefined });
  });

  test("la scrittura scrive i valori uno dopo l'altro: un errore a metà lascia quelli prima", () => {
    expect(esegue([dato("x", "integer")], [scrivi("b1", '"a"', "x")])).toEqual({ parte: true, output: "a", error: { code: "uninitialized", block: "b1" } });
  });

  test("la lettura: righe accettate e non valide per tipo", () => {
    const una = (tipo: string, riga: string, altro: Json = {}) => {
      const r = esegue([dato("d", tipo, altro)], [leggiIn("b1", "d"), scrivi("b2", "d")], [riga]);
      return r.error ? r.error.code : r.output;
    };
    const casi: [string, string, string][] = [
      ["integer", " +7 ", "7"],
      ["integer", "-0", "0"],
      ["integer", "007", "7"],
      ["integer", "1e3", "invalid_input"],
      ["integer", "2147483648", "invalid_input"],
      ["integer", "\t7", "invalid_input"],
      ["real", " -2 ", "-2.00"],
      ["real", "1.5e-3", "0.00"],
      ["real", ".5", "invalid_input"],
      ["real", "5.", "invalid_input"],
      ["real", "1e5", "invalid_input"],
      ["real", "inf", "invalid_input"],
      ["real", "1.0e999", "invalid_input"],
      ["character", " ", " "],
      ["character", "😀", "😀"],
      ["character", "", "invalid_input"],
      ["character", "ab", "invalid_input"],
      ["boolean", "false", "false"],
      ["boolean", "True", "invalid_input"],
      ["string", "", ""],
    ];
    for (const [tipo, riga, atteso] of casi) expect({ tipo, riga, esito: una(tipo, riga) }).toEqual({ tipo, riga, esito: atteso });
    expect(una("string", "abc", { max_length: 2 })).toBe("invalid_input");
    expect(una("string", "a😀", { max_length: 2 })).toBe("a😀");
    expect(una("string", `a${String.fromCodePoint(0)}`)).toBe("invalid_input");
    // Un surrogato isolato non è un carattere: la riga non è valida, da sola o dentro una stringa.
    const surrogati = [String.fromCharCode(0xd800), String.fromCharCode(0xdfff)];
    for (const s of surrogati) {
      expect({ s: s.charCodeAt(0), esito: una("character", s) }).toEqual({ s: s.charCodeAt(0), esito: "invalid_input" });
      expect({ s: s.charCodeAt(0), esito: una("string", `a${s}b`) }).toEqual({ s: s.charCodeAt(0), esito: "invalid_input" });
    }
    // Controllo positivo: la coppia di surrogati è un carattere solo; i codici validi ai due lati
    // dell'intervallo escluso si leggono (un intervallo allargato li rifiuterebbe).
    expect(una("character", String.fromCharCode(0xd83d, 0xde00))).toBe("😀");
    for (const n of [0xd7ff, 0xe000, 0xffff, 0x10ffff]) expect({ n, esito: una("character", String.fromCodePoint(n)) }).toEqual({ n, esito: String.fromCodePoint(n) });
  });

  test("un input non valido non scrive il dato e si può ripetere la stessa lettura", () => {
    const g = esegui(progetto([dato("n", "integer", { initial: "1" })], [leggiIn("b1", "n"), scrivi("b2", "n")]), tetti);
    const uno = { nomi: ["n"], valori: [[{ tipo: "integer" as const, v: 1 }]] };
    const cinque = { nomi: ["n"], valori: [[{ tipo: "integer" as const, v: 5 }]] };
    expect(g.next().value).toEqual({ evento: "", dato: "n", profondita: 0, dati: { nomi: ["n"], valori: [[undefined]] } });
    expect(g.next().value).toEqual({ evento: "b1", profondita: 0, dati: uno });
    expect(g.next().value).toEqual({ chiedi: "n" });
    expect(g.next("x").value).toEqual({ nonValido: "b1" });
    expect(g.next().value).toEqual({ chiedi: "n" });
    expect(g.next("5").value).toEqual({ evento: "b2", profondita: 0, dati: cinque });
    expect(g.next().value).toEqual({ scrive: "5" });
    expect(g.next().value).toEqual({ evento: "fine", profondita: 0, dati: cinque });
    expect(g.next()).toEqual({ done: true, value: { parte: true, dati: cinque } });
  });

  test("gli eventi: uno per azione, il valore iniziale di un dato per primo, la condizione di un ciclo a ogni verifica, la fine", () => {
    const i = dato("i", "integer", { initial: "0" });
    const corpo = [assegna("b2", "i", "i + 1")];
    const eventi = (body: Json[]) => [...esegui(progetto([i], body), tetti)].flatMap((x) => ("evento" in x ? [x.dato !== undefined ? `valore iniziale di ${x.dato}` : x.evento] : []));
    expect(eventi([{ id: "b1", kind: "while", condition: "i < 2", body: corpo }])).toEqual(["valore iniziale di i", "b1", "b2", "b1", "b2", "b1", "fine"]);
    expect(eventi([{ id: "b1", kind: "repeat", condition: "i < 2", body: corpo }])).toEqual(["valore iniziale di i", "b2", "b1", "b2", "b1", "fine"]);
    expect(eventi([{ id: "b1", kind: "if", condition: "i == 0", then: corpo, else: [] }, { id: "c", kind: "comment", text: "x" }])).toEqual(["valore iniziale di i", "b1", "b2", "fine"]);
  });

  test("i valori iniziali: un'azione per dato, le costanti comuni per prime, un vettore in una; l'evento col nome del dato e l'id vuoto", () => {
    const esito = leggi({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "prova" },
      shared_constants: [{ name: "K", type: "integer", constant: true, initial: "3" }],
      functions: [
        {
          id: "f1",
          kind: "main",
          data: [dato("n", "integer"), dato("MAX", "integer", { constant: true, initial: "5" }), dato("v", "integer", { size: 3, initial: ["1", "2", "3"] }), dato("w", "real", { size: 2, initial: { each: "0" } })],
          body: [scrivi("b1", "K + MAX + v[2]")],
          end: { id: "fine" },
        },
      ],
    });
    if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
    const passi = [...esegui(esito.progetto, tetti)];
    const eventi = passi.flatMap((x) => ("evento" in x ? [x] : []));
    const intero = (v: number) => ({ tipo: "integer" as const, v });
    const zero = { tipo: "real" as const, v: 0 };
    expect(eventi.map(({ evento, dato: d, profondita }) => ({ evento, dato: d, profondita }))).toEqual([
      { evento: "", dato: "K", profondita: 0 },
      { evento: "", dato: "MAX", profondita: 0 },
      { evento: "", dato: "v", profondita: 0 },
      { evento: "", dato: "w", profondita: 0 },
      { evento: "b1", dato: undefined, profondita: 0 },
      { evento: "fine", dato: undefined, profondita: 0 },
    ]);
    // La fotografia di ogni evento ha i valori di prima dell'azione: la prima, tutto non inizializzato.
    expect(eventi.map((x) => x.dati.valori)).toEqual([
      [[undefined], [undefined], [undefined], [undefined, undefined, undefined], [undefined, undefined]],
      [[intero(3)], [undefined], [undefined], [undefined, undefined, undefined], [undefined, undefined]],
      [[intero(3)], [undefined], [intero(5)], [undefined, undefined, undefined], [undefined, undefined]],
      [[intero(3)], [undefined], [intero(5)], [intero(1), intero(2), intero(3)], [undefined, undefined]],
      [[intero(3)], [undefined], [intero(5)], [intero(1), intero(2), intero(3)], [zero, zero]],
      [[intero(3)], [undefined], [intero(5)], [intero(1), intero(2), intero(3)], [zero, zero]],
    ]);
    expect(eventi[0]!.dati.nomi).toEqual(["K", "n", "MAX", "v", "w"]);
    expect(passi.filter((x) => "scrive" in x)).toEqual([{ scrive: "11" }]);
  });

  test("la fotografia dei dati: a ogni evento i valori prima dell'azione, alla fine quelli dopo l'ultima, mai cambiati dopo", () => {
    const n = dato("n", "integer");
    const v = dato("v", "character", { size: 2, initial: { each: "'a'" } });
    const s = dato("s", "string", { initial: '"x"' });
    const g = esegui(progetto([n, v, s], [leggiIn("b1", "n"), assegna("b2", "v[1]", "'b'"), { id: "b3", kind: "if", condition: "n > 3", then: [], else: [] }, assegna("b4", "s", '"yz"')]), tetti);
    const fotografie: unknown[] = [];
    const condizioni: boolean[] = [];
    let r = g.next();
    while (!r.done) {
      const x = r.value;
      if ("evento" in x) fotografie.push(x.dati);
      if ("condizione" in x) condizioni.push(x.condizione);
      r = g.next("chiedi" in x ? "5" : undefined);
    }
    if (!r.value.parte) throw new Error("non parte");
    fotografie.push(r.value.dati);
    const a = { tipo: "character", v: 97 };
    const b = { tipo: "character", v: 98 };
    const prima = [[undefined], [a, a], [{ tipo: "string", v: [120] }]];
    const cinque = [{ tipo: "integer", v: 5 }];
    expect(fotografie).toEqual([
      // i due valori iniziali, poi la prima regola
      { nomi: ["n", "v", "s"], valori: [[undefined], [undefined, undefined], [undefined]] },
      { nomi: ["n", "v", "s"], valori: [[undefined], [a, a], [undefined]] },
      { nomi: ["n", "v", "s"], valori: prima },
      { nomi: ["n", "v", "s"], valori: [cinque, [a, a], prima[2]] },
      { nomi: ["n", "v", "s"], valori: [cinque, [a, b], prima[2]] },
      { nomi: ["n", "v", "s"], valori: [cinque, [a, b], prima[2]] },
      { nomi: ["n", "v", "s"], valori: [cinque, [a, b], [{ tipo: "string", v: [121, 122] }]] },
      { nomi: ["n", "v", "s"], valori: [cinque, [a, b], [{ tipo: "string", v: [121, 122] }]] },
    ]);
    expect(condizioni).toEqual([true]);
  });

  test("troppi passi: sul ciclo più interno attivo", () => {
    const i = dato("i", "integer", { initial: "0" });
    const interno = { id: "b2", kind: "while", condition: "true", body: [assegna("b3", "i", "1 - i")] };
    expect(esegue([i], [{ id: "b1", kind: "while", condition: "i == 0", body: [interno] }]).error).toEqual({ code: "too_many_steps", block: "b2" });
  });

  test("troppi passi in un ciclo per dentro un mentre: sul per, il ciclo più interno attivo", () => {
    const i = dato("i", "integer", { initial: "0" });
    const per = { id: "b2", kind: "for", counter: "j", from: "1", to: "3000000", body: [] };
    expect(esegue([i, dato("j", "integer")], [{ id: "b1", kind: "while", condition: "i == 0", body: [per] }]).error).toEqual({ code: "too_many_steps", block: "b2" });
  });

  test("elevato_a: una potenza inesatta è il valore esatto arrotondato una volta", () => {
    expect(potenzeSbagliate(esegui)).toEqual([]);
  });

  test("un progetto con errori statici o fuori tappa non parte", () => {
    expect(esegue([], [scrivi("b1", "y")]).parte).toBe(false);
    expect(esegue([], [{ id: "b1", kind: "call", callee: "p", arguments: [] }]).parte).toBe(false);
  });
});

// I cicli della tappa 2 passo per passo: ogni evento col blocco, la fase e i valori di prima dell'azione, l'esito di
// ogni controllo, ciò che si scrive. L'atteso è scritto a mano dalle regole del passo.
describe("i cicli per e per ogni, evento per evento", () => {
  /** Il valore di un dato in una fotografia, come testo: `–` per uno senza valore. */
  const comeTesto = (v: unknown) => {
    if (v === undefined) return "–";
    const x = v as { tipo: string; v: unknown };
    return x.tipo === "character" ? String.fromCodePoint(x.v as number) : x.tipo === "string" ? String.fromCodePoint(...(x.v as number[])) : String(x.v);
  };
  /** Le righe di un'esecuzione: `blocco fase dato=valore…`, `vero`/`falso`, `scrive …`, e l'esito in fondo. */
  const passo = (data: Json[], body: Json[]): string[] => {
    const g = esegui(progetto(data, body), tetti);
    const righe: string[] = [];
    let r = g.next();
    while (!r.done) {
      const x = r.value;
      if ("evento" in x) {
        const valori = x.dati.nomi.map((n, k) => `${n}=${x.dati.valori[k]!.map(comeTesto).join(",")}`).join(" ");
        righe.push(`${x.dato !== undefined ? `valore iniziale di ${x.dato}` : x.evento}${x.fase ? ` ${x.fase}` : ""} ${valori}`);
      } else if ("condizione" in x) righe.push(x.condizione ? "vero" : "falso");
      else if ("scrive" in x) righe.push(`scrive ${x.scrive}`);
      r = g.next();
    }
    righe.push(r.value.parte ? (r.value.errore ? `errore ${r.value.errore.code} su ${r.value.errore.block}` : "fine normale") : "non parte");
    return righe;
  };

  test("per col passo 1: inizio, un controllo per giro e quello finale, l'aumento dopo il corpo; il contatore dopo il ciclo", () => {
    expect(passo([dato("i", "integer")], [{ id: "b1", kind: "for", counter: "i", from: "1", to: "2", body: [scrivi("b2", "i")] }])).toEqual([
      "b1 inizio i=–",
      "b1 condizione i=1",
      "vero",
      "b2 i=1",
      "scrive 1",
      "b1 passo i=1",
      "b1 condizione i=2",
      "vero",
      "b2 i=2",
      "scrive 2",
      "b1 passo i=2",
      "b1 condizione i=3",
      "falso",
      "fine i=3",
      "fine normale",
    ]);
  });

  test("per col passo -1 e il corpo vuoto: il controllo è >=", () => {
    expect(passo([dato("i", "integer")], [{ id: "b1", kind: "for", counter: "i", from: "2", to: "1", step: -1, body: [] }])).toEqual([
      "b1 inizio i=–",
      "b1 condizione i=2",
      "vero",
      "b1 passo i=2",
      "b1 condizione i=1",
      "vero",
      "b1 passo i=1",
      "b1 condizione i=0",
      "falso",
      "fine i=0",
      "fine normale",
    ]);
  });

  test("per ogni su una stringa: le parti del mentre equivalente (partenza, controllo, elemento, aumento), l'ultimo controllo falso; l'elemento dopo il ciclo è l'ultimo preso", () => {
    const s = dato("s", "string", { initial: '"ab"' });
    expect(passo([s, dato("c", "character")], [{ id: "b1", kind: "for_each", item: "c", source: "s", body: [scrivi("b2", "c")] }])).toEqual([
      "valore iniziale di s s=– c=–",
      "b1 inizio s=ab c=–",
      "b1 condizione s=ab c=–",
      "vero",
      "b1 elemento s=ab c=–",
      "b2 s=ab c=a",
      "scrive a",
      "b1 passo s=ab c=a",
      "b1 condizione s=ab c=a",
      "vero",
      "b1 elemento s=ab c=a",
      "b2 s=ab c=b",
      "scrive b",
      "b1 passo s=ab c=b",
      "b1 condizione s=ab c=b",
      "falso",
      "fine s=ab c=b",
      "fine normale",
    ]);
  });

  test("per ogni su una stringa senza valore: si ferma sul controllo, sul blocco del ciclo", () => {
    expect(passo([dato("s", "string"), dato("c", "character")], [{ id: "b1", kind: "for_each", item: "c", source: "s", body: [scrivi("b2", "c")] }])).toEqual([
      "b1 inizio s=– c=–",
      "b1 condizione s=– c=–",
      "errore uninitialized su b1",
    ]);
  });

  test("per ogni su un vettore con un elemento senza valore: si ferma quando lo prende, sul blocco del ciclo", () => {
    const v = dato("v", "integer", { size: 2, initial: ["7", "8"] });
    const w = dato("w", "integer", { size: 2 });
    expect(passo([v, w, dato("x", "integer")], [assegna("b1", "w[0]", "v[1]"), { id: "b2", kind: "for_each", item: "x", source: "w", body: [scrivi("b3", "x")] }])).toEqual([
      "valore iniziale di v v=–,– w=–,– x=–",
      "b1 v=7,8 w=–,– x=–",
      "b2 inizio v=7,8 w=8,– x=–",
      "b2 condizione v=7,8 w=8,– x=–",
      "vero",
      "b2 elemento v=7,8 w=8,– x=–",
      "b3 v=7,8 w=8,– x=8",
      "scrive 8",
      "b2 passo v=7,8 w=8,– x=8",
      "b2 condizione v=7,8 w=8,– x=8",
      "vero",
      "b2 elemento v=7,8 w=8,– x=8",
      "errore uninitialized su b2",
    ]);
  });
});

// Potenze fuori dal corpus. Il corpus ha solo potenze a risultato esatto, che nessuna libreria sbaglia
// (misurato: `Math.pow` di Bun non ne sbaglia nessuna), quindi un `elevato_a` sbagliato si vede solo su
// una potenza inesatta. L'atteso è il valore esatto arrotondato una volta: `Number` di un bigint lo è per
// specifica del linguaggio. Il C di glibc qui darebbe altre cifre (`9 elevato_a 17`, `10 elevato_a 23`).
const potenzeInesatte: [string, bigint][] = [
  ["30 raised_to 18", 30n ** 18n],
  ["-30 raised_to 19", (-30n) ** 19n],
  ["9 raised_to 17", 9n ** 17n],
  ["17 raised_to 13", 17n ** 13n],
];
function potenzeSbagliate(es: Esegui): string[] {
  return potenzeInesatte.flatMap(([testo, esatto]) => {
    const atteso = stampaReale(Number(esatto), 0);
    const r = esecuzione(es, progetto([], [scrivi("b1", testo)], { real_decimals: 0 }), []);
    return r.output === atteso && r.error === undefined ? [] : [`${testo}: ${r.output} invece di ${atteso}`];
  });
}

// ------------------------------------------------------------------------- procedure e funzioni

// Le procedure e le funzioni passo per passo: ogni evento col blocco (o il valore iniziale del dato), la profondità e la
// funzione se non è il programma principale; le richieste, le scritture e l'esito. Scritte a mano dalle regole del
// passo, delle chiamate e dei casi d'uso, prima del codice; le usano anche le mutazioni.
const json = (p: Json): Progetto => {
  const esito = leggi(p);
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
};
/** Il programma principale coi dati e le regole dati, e una procedura `mostra(rif y)` che scrive `y`. */
const conMostra = (data: Json[], body: Json[]): Progetto =>
  json({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    functions: [
      { id: "f1", kind: "main", data, body, end: { id: "fine" } },
      { id: "f2", kind: "procedure", name: "mostra", data: [dato("y", "integer", { parameter: "reference" })], body: [{ id: "b9", kind: "write", values: ["y"], newline: true }], end: { id: "b10" } },
    ],
  });
const sequenzeAttese: { nome: string; progetto: Progetto; radice?: string; righe?: string[]; atteso: string[] }[] = [
  {
    nome: "tre livelli: il salto, una funzione dentro una scrittura che ne chiama un'altra, i ritorni",
    progetto: progetti.get("tappa-3/tre-livelli")!,
    atteso: ["valore iniziale di n·0", "b1·0", "b3·1 f2", 'scrive "risultato: "', "b5·2 f3", "b6·3 f4", 'scrive "17"', 'scrive "\\n"', "b4·1 f2", "b2·0", "fine normale"],
  },
  {
    nome: "il parametro per riferimento è il dato di chi chiama: il suo valore iniziale non si ripete nel salto",
    progetto: conMostra([dato("x", "integer", { initial: "1" })], [assegna("b1", "x", "5"), { id: "b2", kind: "call", callee: "mostra", arguments: ["x"] }]),
    atteso: ["valore iniziale di x·0", "b1·0", "b2·0", "b9·1 f2", 'scrive "5"', 'scrive "\\n"', "b10·1 f2", "fine·0", "fine normale"],
  },
  {
    nome: "una funzione eseguita da sola: il parametro chiesto, il ritorno alla profondità 0, «→ » e ciò che restituisce",
    progetto: progetti.get("tappa-3/riferimento-media-voti-funzioni")!,
    radice: "f3",
    righe: ["7"],
    atteso: ["chiedi voto (valore)", "b22·0 f3", 'scrive "→ true\\n"', "fine normale"],
  },
  {
    nome: "una funzione che chiama sé stessa eseguita da sola: la costante comune riceve il valore una volta, nella prima chiamata",
    progetto: json({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "conta" },
      shared_constants: [dato("K", "integer", { constant: true, initial: "3" })],
      functions: [
        { id: "f1", kind: "main", data: [dato("r", "integer")], body: [assegna("b1", "r", "conta(2)")], end: { id: "b3" } },
        {
          id: "f2",
          kind: "function",
          name: "conta",
          return_type: "integer",
          data: [dato("n", "integer", { parameter: "value" }), dato("s", "integer")],
          body: [{ id: "b4", kind: "if", condition: "n == 0", then: [assegna("b5", "s", "K")], else: [assegna("b6", "s", "conta(n - 1) + 1")] }],
          end: { id: "b7", return_value: "s" },
        },
      ],
    }),
    radice: "f2",
    righe: ["2"],
    atteso: ["chiedi n (valore)", "valore iniziale di K·0 f2", "b4·0 f2", "b6·0 f2", "b4·1 f2", "b6·1 f2", "b4·2 f2", "b5·2 f2", "b7·2 f2", "b7·1 f2", "b7·0 f2", 'scrive "→ 5\\n"', "fine normale"],
  },
  {
    nome: "la copia di un vettore col suo nome: le azioni del ciclo, elemento per elemento, sullo stesso blocco",
    progetto: conMostra([dato("voti", "integer", { size: 2, initial: ["7", "4"] }), dato("altri", "integer", { size: 2 })], [assegna("b1", "altri", "voti"), scrivi("b2", "altri[1]")]),
    atteso: [
      "valore iniziale di voti·0",
      "b1·0:inizio",
      "b1·0:condizione",
      "b1·0:elemento",
      "b1·0:passo",
      "b1·0:condizione",
      "b1·0:elemento",
      "b1·0:passo",
      "b1·0:condizione",
      "b2·0",
      'scrive "4"',
      "fine·0",
      "fine normale",
    ],
  },
  {
    nome: "il «per ogni» su una funzione che restituisce un vettore: la funzione una volta sola, nell'azione della partenza",
    progetto: progetti.get("tappa-3/risultato-vettore-per-ogni")!,
    atteso: [
      "valore iniziale di voti·0",
      "b1·0:inizio",
      "valore iniziale di r·1 f2",
      "b6·1 f2:inizio",
      ...["b6·1 f2:condizione", "b7·1 f2", "b6·1 f2:passo"],
      ...["b6·1 f2:condizione", "b7·1 f2", "b6·1 f2:passo"],
      ...["b6·1 f2:condizione", "b7·1 f2", "b6·1 f2:passo"],
      "b6·1 f2:condizione",
      "b8·1 f2",
      ...["b1·0:condizione", "b1·0:elemento", "b2·0", "b3·0", 'scrive "14"', 'scrive "\\n"', "b1·0:passo"],
      ...["b1·0:condizione", "b1·0:elemento", "b2·0", "b3·0", 'scrive "8"', 'scrive "\\n"', "b1·0:passo"],
      ...["b1·0:condizione", "b1·0:elemento", "b2·0", "b3·0", 'scrive "18"', 'scrive "\\n"', "b1·0:passo"],
      "b1·0:condizione",
      "b4·0",
      'scrive "0"',
      'scrive "\\n"',
      "b5·0",
      "fine normale",
    ],
  },
];

/** Le righe di un'esecuzione nella forma delle sequenze attese. */
function passiDi(es: Esegui, p: Progetto, radice?: string, righe: readonly string[] = []): string[] {
  const g = es(p, tetti, radice);
  const fatti: string[] = [];
  let k = 0;
  let r = g.next();
  while (!r.done) {
    const x = r.value;
    if ("evento" in x)
      fatti.push(`${x.dato !== undefined ? `valore iniziale di ${x.dato}` : x.evento}·${x.profondita}${x.funzione !== undefined ? ` ${x.funzione}` : ""}${x.fase !== undefined ? `:${x.fase}` : ""}`);
    else if ("scrive" in x) fatti.push(`scrive ${JSON.stringify(x.scrive)}`);
    else if ("chiedi" in x) fatti.push(`chiedi ${x.chiedi}${x.parametro !== undefined ? ` (${x.parametro})` : ""}`);
    r = g.next("chiedi" in x ? righe[k++] : undefined);
  }
  fatti.push(r.value.parte ? (r.value.errore ? `errore ${r.value.errore.code} su ${r.value.errore.block}` : "fine normale") : "non parte");
  return fatti;
}

// Ciò che l'interprete registra per l'interfaccia, che lo mostra senza ricalcolarlo: la posizione nascosta della copia
// di un vettore col suo nome nella fotografia, e il valore restituito nella ripresa. Attesi scritti a mano: la posizione
// riceve 0 nell'azione della partenza e aumenta in quella dell'aumento (la fotografia dell'evento seguente la vede), al
// livello dopo i «per ogni» che la contengono; dopo la copia resta quella che ha trovato gli elementi finiti.
const posizioniDi = (es: Esegui, p: Progetto) =>
  [...es(p, tetti)].flatMap((x) => ("evento" in x ? [`${x.dato ?? x.evento}${x.fase ? `:${x.fase}` : ""} ${JSON.stringify(x.dati.posizioni ?? null)}`] : []));
const testoRestituito = (v: Restituito["valore"]) => ("elementi" in v ? v.elementi.map((e) => (e === undefined ? "–" : testoDelValore(e, 2))).join(" ") : testoDelValore(v, 2));
const ripreseDi = (es: Esegui, p: Progetto) => [...es(p, tetti)].flatMap((x) => ("ripresa" in x ? [`${x.restituito.funzione} → ${testoRestituito(x.restituito.valore)}`] : []));
const votiDue = dato("voti", "integer", { size: 2, initial: ["7", "4"] });
const altriDue = dato("altri", "integer", { size: 2 });
/** Un giro del «per ogni» (livello 1) con la copia dentro (livello 2): `p` la posizione del ciclo, `q` quella della copia prima. */
const giroConLaCopia = (p: number, q: number | null) => [
  `b1:elemento [${p},${q}]`,
  `b2:inizio [${p},${q}]`,
  ...[0, 1].flatMap((i) => [`b2:condizione [${p},${i}]`, `b2:elemento [${p},${i}]`, `b2:passo [${p},${i}]`]),
  `b2:condizione [${p},2]`,
  `b1:passo [${p},2]`,
];
const fotografieAttese: { nome: string; ottieni: (es: Esegui) => string[]; atteso: string[] }[] = [
  {
    nome: "la posizione nascosta della copia di un vettore col suo nome nella fotografia",
    ottieni: (es) => posizioniDi(es, conMostra([votiDue, altriDue], [assegna("b1", "altri", "voti"), scrivi("b2", "altri[1]")])),
    atteso: ["voti [null]", "b1:inizio [null]", ...[0, 1].flatMap((i) => [`b1:condizione [${i}]`, `b1:elemento [${i}]`, `b1:passo [${i}]`]), "b1:condizione [2]", "b2 [2]", "fine [2]"],
  },
  {
    nome: "la posizione della copia dentro un «per ogni»: il livello dopo il suo",
    ottieni: (es) => posizioniDi(es, conMostra([votiDue, altriDue, dato("x", "integer")], [{ id: "b1", kind: "for_each", item: "x", source: "voti", body: [assegna("b2", "altri", "voti")] }])),
    atteso: ["voti [null,null]", "b1:inizio [null,null]", "b1:condizione [0,null]", ...giroConLaCopia(0, null), "b1:condizione [1,2]", ...giroConLaCopia(1, 2), "b1:condizione [2,2]", "fine [2,2]"],
  },
  {
    // «scrive B»: il valore di saluto("Bo") su cui agisce [5] è «Ciao Bo».
    nome: "la ripresa dopo una funzione chiamata in un'espressione porta il valore restituito: una stringa",
    ottieni: (es) => ripreseDi(es, progetti.get("tappa-3/risultato-stringa")!),
    atteso: ["f2 → Ciao Anna", "f2 → Ciao Bo"],
  },
  {
    // Ogni chiamata ha la sua copia del vettore, raddoppiata all'elemento del suo livello prima di chiamare la seguente:
    // nell'evento del caso che finisce (i = 5) la pila ha le sei chiamate, ognuna coi suoi valori.
    nome: "la fotografia con la ricorsione: ogni chiamata attiva, una per livello, coi suoi dati",
    ottieni: (es) =>
      [...es(progetti.get("tappa-4/vettore-copiato")!, tetti)].flatMap((x) =>
        "evento" in x && x.evento === "b7" ? x.dati.chiamate!.map((c) => `${c.funzione} i=${testoRestituito(c.valori[1]![0]!)} v=${c.valori[0]!.map((v) => testoRestituito(v!)).join(",")}`) : [],
      ),
    atteso: ["f2 i=0 v=2,2,3,4,5", "f2 i=1 v=2,4,3,4,5", "f2 i=2 v=2,4,6,4,5", "f2 i=3 v=2,4,6,8,5", "f2 i=4 v=2,4,6,8,10", "f2 i=5 v=2,4,6,8,10"],
  },
  {
    nome: "la ripresa porta il valore restituito: un vettore, gli elementi",
    ottieni: (es) => ripreseDi(es, progetti.get("tappa-3/risultato-vettore-per-ogni")!),
    atteso: ["f2 → 14 8 18"],
  },
];
/** Le fotografie attese che un interprete non dà. */
const fotografieSbagliate = (es: Esegui): string[] => fotografieAttese.flatMap((a) => (JSON.stringify(a.ottieni(es)) === JSON.stringify(a.atteso) ? [] : [a.nome]));

/** Le sequenze attese che un interprete non dà. */
const sequenzeSbagliate = (es: Esegui): string[] => sequenzeAttese.flatMap((s) => (JSON.stringify(passiDi(es, s.progetto, s.radice, s.righe)) === JSON.stringify(s.atteso) ? [] : [s.nome]));

describe("procedure e funzioni, evento per evento", () => {
  for (const s of sequenzeAttese)
    test(s.nome, () => {
      expect(passiDi(esegui, s.progetto, s.radice, s.righe)).toEqual(s.atteso);
    });

  test("la fotografia di una chiamata attiva: i dati della funzione, il dato di chi chiama per un riferimento coll'indice calcolato", () => {
    // `metti(i, v[i])` con `i` = 0: al primo evento dentro `metti` i suoi parametri valgono 0 e 1, e sono `i` e `v[0]`.
    const eventi = [...esegui(progetti.get("tappa-3/indice-del-riferimento")!, tetti)].flatMap((x) => ("evento" in x && x.evento === "b4" ? [x.dati] : []));
    const intero = (v: number) => ({ tipo: "integer" as const, v });
    expect(eventi).toEqual([
      {
        nomi: ["i", "v"],
        valori: [[intero(0)], [intero(1), intero(2), intero(3)]],
        chiamate: [{ funzione: "f2", numero: 1, valori: [[intero(0)], [intero(1)]], riferimenti: ["i", "v[0]"], origini: [{ nome: "i", livello: 0 }, { nome: "v[0]", livello: 0 }] }],
      },
    ]);
  });

  test("le origini: il dato che riceve davvero una lettura attraverso due riferimenti è quello del programma principale", () => {
    // `chiedi(out numero)` passa `numero` a `leggi(out valore)`, che legge: per tutte e due le chiamate è `n`, livello 0.
    const p = progetti.get("tappa-3/lettura-attraverso-riferimento")!;
    const dentro = [...esegui(p, tetti)].find((x) => "evento" in x && x.funzione === "f3");
    const origini = dentro !== undefined && "dati" in dentro ? dentro.dati.chiamate!.map((c) => [c.funzione, c.origini]) : [];
    expect(origini).toEqual([
      ["f2", [{ nome: "n", livello: 0 }]],
      ["f3", [{ nome: "n", livello: 0 }]],
    ]);
  });

  for (const a of fotografieAttese)
    test(a.nome, () => {
      expect(a.ottieni(esegui)).toEqual(a.atteso);
    });

  test("controllo positivo: una profondità dell'atteso cambiata è rossa", () => {
    const s = sequenzeAttese[0]!;
    expect(passiDi(esegui, s.progetto)).not.toEqual(s.atteso.map((x) => (x === "b6·3 f4" ? "b6·2 f4" : x)));
  });
});

// ------------------------------------------------------------------------------------ le mutazioni

// Ogni mutazione sostituisce nel sorgente la funzione giusta con la primitiva di JavaScript che la
// specifica vieta, o una regola dei cicli o delle chiamate con quella sbagliata che le somiglia: almeno un caso del
// corpus, una delle potenze inesatte o una delle sequenze attese delle chiamate deve diventare rosso. Il
// sorgente si copia in una cartella temporanea, con gli import resi assoluti; la copia senza mutazioni è
// il controllo positivo.
const sorgente = readFileSync(join(import.meta.dir, "interprete.ts"), "utf8");
const mutazioni: Record<string, [string, string]> = {
  "nessuna (controllo positivo)": ["", ""],
  "length di JavaScript": ["return intero((o as Testo).v.length);", "return intero(String.fromCodePoint(...(o as Testo).v).length);"],
  "< sulle stringhe di JavaScript": [
    "return confrontoVero(op, confronta(l.v as readonly number[], r.v as readonly number[]));",
    "const [x, y] = [String.fromCodePoint(...(l.v as number[])), String.fromCodePoint(...(r.v as number[]))]; return confrontoVero(op, x < y ? -1 : x > y ? 1 : 0);",
  ],
  "Math.round": ["return reale(arrotonda(n));", "return reale(Math.round(n));"],
  toFixed: ["return stampaReale(v.v, decimali);", "return v.v.toFixed(decimali);"],
  "Math.pow": ["return reale(potenza(a, b));", "return reale(Math.pow(a, b));"],
  "|0": [
    'const intero = (n: number): Numero => (n < intMin || n > intMax ? ferma("integer_overflow") : { tipo: "integer", v: n + 0 });',
    'const intero = (n: number): Numero => ({ tipo: "integer", v: n | 0 });',
  ],
  // La fine di un `per` calcolata una volta prima del ciclo, come il `range` di Python: la fine cambiata nel corpo.
  "fine del per valutata una volta": [
    '        for (;;) {\n          yield evento(b.id, "condizione");\n          const i = (leggiDa(contatore, 0) as Numero).v;\n          const fine = ((yield* calcolaTesto(b.to)) as Numero).v;',
    '        const fineFissa = ((yield* calcolaTesto(b.to)) as Numero).v;\n        for (;;) {\n          yield evento(b.id, "condizione");\n          const i = (leggiDa(contatore, 0) as Numero).v;\n          const fine = fineFissa;',
  ],
  // Il salto che non aumenta la profondità: le sequenze attese.
  "profondità sbagliata": ["    profondita++;\n", ""],
  // Senza la copia: un argomento scritto per nome arriva come il dato di chi chiama (vettore e stringa compresi).
  "copia tolta": [
    "      } else if (d.size !== undefined) dati.push({ copia: yield* elementiDi(a) });",
    '      } else if (a.genere === "nome") dati.push({ cella: cella(a.nome), scritto: a.nome });\n      else if (d.size !== undefined) dati.push({ copia: yield* elementiDi(a) });',
  ],
  // Il nome di un vettore assegnato a un vettore che diventa un alias, come `altri = voti` nel Python: cambiare la copia
  // cambia la sorgente.
  "copia di un vettore come alias": [
    "        if (intero && e.genere === \"nome\") return yield* copia(b.id, cella(t.nome), cella(e.nome));",
    "        if (intero && e.genere === \"nome\") {\n          yield evento(b.id);\n          qui.celle.set(t.nome, cella(e.nome));\n          return;\n        }",
  ],
  // La posizione della copia col nome che resta una variabile della copia: la fotografia non la vede.
  "posizione della copia mai scritta": ['    yield evento(blocco, "inizio");\n    posizione(0);', '    yield evento(blocco, "inizio");'],
  // La posizione della copia allo stesso livello del «per ogni» che la contiene: la copia scrive su quella del ciclo.
  "copia al livello del per ogni che la contiene": ["    const posizione = posizioneDi(qui, qui.perOgniAttivi);", "    const posizione = posizioneDi(qui, Math.max(0, qui.perOgniAttivi - 1));"],
  // La fotografia con una chiamata per funzione, la più esterna, come prima della ricorsione: ogni livello mostra la prima.
  "una cornice per funzione": ["  const fotoDi = (c: Cornice): FotografiaDiUnaChiamata => {\n    const prima = c.foto;", "  const fotoDi = (c: Cornice): FotografiaDiUnaChiamata => {\n    c = pila.find((x) => x.funzione === c.funzione)!;\n    const prima = c.foto;"],
  // Il tetto delle chiamate a 501: la cinquecentunesima passa.
  "tetto 501": ["    if (chiamateDelGiro + 1 > tettoDelleChiamate(p)) ferma(\"recursion_too_deep\");", "    if (chiamateDelGiro > tettoDelleChiamate(p)) ferma(\"recursion_too_deep\");"],
  // Il tetto del progetto ignorato: ogni progetto si ferma al predefinito, anche quello col tetto 10.
  "tetto del progetto ignorato": ["    if (chiamateDelGiro + 1 > tettoDelleChiamate(p)) ferma(\"recursion_too_deep\");", "    if (chiamateDelGiro + 1 > tettoDelleChiamate({})) ferma(\"recursion_too_deep\");"],
  // Lo spazio dei dati che non si conta: un vettore grande copiato a ogni livello arriva alle 500 chiamate.
  "spazio non contato": ["      spazioInUso += spazioDi.get(f)!;\n    }\n    return {", "    }\n    return {"],
  // La chiamata sulla pila del motore, come prima: i generatori annidati si rompono coi 49 «se» e coi 63 livelli.
  "la chiamata sulla pila del motore": ["    yield { salto: corpo(f) };\n    const restituito = ritornato;", "    const restituito = yield* corpo(f);"],
  // Il tetto dei passi sempre su un ciclo, o sull'inizio senza cicli: fuori da ogni ciclo non cade sull'azione in corso.
  "tetto dei passi sempre sul ciclo": [
    '    return ciclo === undefined ? new Arresto("too_many_steps", blocco) : new Arresto("too_many_steps", ciclo.blocco, ciclo.livello);',
    '    return ciclo === undefined ? new Arresto("too_many_steps", principale.id) : new Arresto("too_many_steps", ciclo.blocco, ciclo.livello);',
  ],
  // Il valore restituito registrato con la funzione di chi chiama, non con quella chiamata.
  "valore restituito della funzione sbagliata": ["restituito: { funzione: f.id, valore: restituito }", "restituito: { funzione: qui.funzione.id, valore: restituito }"],
  // L'indice dopo una funzione che restituisce un vettore letto come il carattere di una stringa.
  "elemento di un vettore restituito come carattere": ["        if (restituisceUnVettore(e.base)) {", "        if (restituisceUnVettore(e.base) && false) {"],
  // La funzione del «per ogni» chiamata a ogni controllo, come la sorgente riletta di un nome.
  "funzione del per ogni richiamata a ogni controllo": [
    '        posizione(0);\n        for (let indice = 0; ; ) {\n          yield evento(b.id, "condizione");',
    '        posizione(0);\n        for (let indice = 0; ; ) {\n          yield evento(b.id, "condizione");\n          if (s.genere !== "nome") Object.assign(sorgente, risultatoInUnaCella(perNome.get((s as { nome: string }).nome)!, yield* chiamaDentro(s)));',
  ],
  // Una stringa restituita più lunga della lunghezza massima del risultato che non si ferma sulla fine.
  "stringa restituita oltre la lunghezza massima": ['    if (v.tipo === "string" && v.v.length > (f.return_max_length ?? lunghezzaPredefinita)) ferma("string_too_long");', ""],
  // Un elemento di un vettore di stringhe restituito più lungo della lunghezza massima del risultato che passa la fine.
  "elemento restituito oltre la lunghezza massima": ['      for (const v of elementi) if (v?.tipo === "string" && v.v.length > (f.return_max_length ?? lunghezzaPredefinita)) ferma("string_too_long");', ""],
  // L'indice di un elemento passato per riferimento calcolato quando la procedura lo usa, come nel Python che
  // assegna i bersagli uno dopo l'altro: `metti(i, v[i])` cambia `v[2]`.
  "indice del bersaglio calcolato dopo": [
    "          cella: vettore ? new ElementoDi(c, i) : c,",
    '          cella: vettore ? ((): Cella => { const quando = qui; const x = new ElementoDi(c, i); Object.defineProperty(x, "i", { get: () => { const ora = qui; qui = quando; try { return dentro((valuta((a as { indice: Espressione }).indice) as Numero).v, c.dato.size!); } finally { qui = ora; } } }); return x; })() : c,',
  ],
  // L'operazione che controlla il suo operando sinistro prima di calcolare il destro: il carattere 0 a sinistra si
  // ferma prima del codice non valido a destra.
  "arresto del destro dopo l'operazione": [
    "        const l = yield* calcola(e.sinistro);\n        return binario(op, l, yield* calcola(e.destro));",
    '        const l = yield* calcola(e.sinistro);\n        if (op === "+" && l.tipo === "character") codiciDi(l);\n        return binario(op, l, yield* calcola(e.destro));',
  ],
  // I valori iniziali anche dei parametri: quello del dato di chi chiama si ripete nel salto.
  "valori iniziali dei parametri": ["    const propri = qui.inOrdine.filter((_, k) => f.data[k]!.parameter === undefined);", "    const propri = qui.inOrdine;"],
  // Un riferimento che accetta un dato senza valore: la procedura lo legge e si ferma lei, non la chiamata.
  "riferimento senza valore accettato": ['      if (d.parameter === "reference" && c.valori.every((v) => v === undefined)) ferma("reference_without_value");', ""],
  // Un parametro per uscita che porta il valore di chi chiama: la procedura lo legge invece di fermarsi.
  "uscita che porta il valore di chi chiama": ['      if (c !== undefined && d.parameter === "out") c.valori = c.valori.map(() => undefined);', ""],
  // L'aumento calcolato prima del suo evento: l'overflow cade sull'ultimo blocco del corpo, non sul ciclo.
  "aumento del contatore prima del suo evento": [
    '          yield evento(b.id, "passo");\n          scriviIn(contatore, 0, intero((leggiDa(contatore, 0) as Numero).v + passo));',
    '          scriviIn(contatore, 0, intero((leggiDa(contatore, 0) as Numero).v + passo));\n          yield evento(b.id, "passo");',
  ],
};

describe("mutazioni: le primitive di JavaScript e le regole sbagliate fanno rosso il corpus o le sequenze", () => {
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  for (const [nome, [da, a]] of Object.entries(mutazioni)) {
    test(
      nome,
      async () => {
        const occorrenze = da === "" ? 1 : sorgente.split(da).length - 1;
        expect({ nome, occorrenze }).toEqual({ nome, occorrenze: 1 });
        const cartellaTemporanea = mkdtempSync(join(tmpdir(), "interprete-"));
        try {
          const file = join(cartellaTemporanea, "mutante.ts");
          const mutato = da === "" ? sorgente : sorgente.replace(da, a);
          writeFileSync(file, mutato.replaceAll('from "../', `from "${nucleo}/`).replaceAll('from "./', `from "${nucleo}/interprete/`));
          const mutante: { esegui: Esegui } = await import(file);
          const rossi = [...corpus(mutante.esegui).sbagliati.map((s) => s.caso), ...potenzeSbagliate(mutante.esegui), ...sequenzeSbagliate(mutante.esegui), ...fotografieSbagliate(mutante.esegui)];
          console.log(`mutazione ${nome}: rossi ${rossi.length} [${rossi.join(", ")}]`);
          if (da === "") expect(rossi).toEqual([]);
          else expect(rossi.length).toBeGreaterThan(0);
        } finally {
          rmSync(cartellaTemporanea, { recursive: true, force: true });
        }
      },
      // Il corpus intero a ogni mutazione, con la ricorsione al milione di passi (misurato: 6–19 s, sulla pila del motore).
      120_000,
    );
  }
});

// Ultima prova del file: il censimento nei due versi, col controllo positivo.
test("censimento: i codici d'errore dell'interprete, appaiati coi test", () => {
  const senzaVoce = codiciErrore.filter((c) => !(c in postoDi));
  const vociSenzaCodice = Object.keys(postoDi).filter((c) => !(codiciErrore as readonly string[]).includes(c));
  const daProvare = Object.keys(postoDi).filter((c) => postoDi[c] === "qui");
  const senzaTest = (fatti: Set<string>) => daProvare.filter((c) => !fatti.has(c));
  const provatiFuori = [...provati].filter((c) => postoDi[c] !== "qui");
  const altrove = Object.entries(postoDi).filter(([, posto]) => posto !== "qui");
  console.log(
    `censimento dell'interprete: ${codiciErrore.length} codici; qui ${daProvare.length}, provati ${daProvare.length - senzaTest(provati).length}; ` +
      `altrove ${altrove.length}: ${altrove.map(([c, posto]) => `${c} (${posto})`).join(", ")}`,
  );
  expect({ senzaVoce, vociSenzaCodice, senzaTest: senzaTest(provati), provatiFuori }).toEqual({ senzaVoce: [], vociSenzaCodice: [], senzaTest: [], provatiFuori: [] });
  // Controllo positivo: senza la prova di un codice, il censimento lo trova.
  const menoUno = new Set(provati);
  menoUno.delete("division_by_zero");
  expect(senzaTest(menoUno)).toEqual(["division_by_zero"]);
  expect(codiciErrore.length).toBe(20);
});
