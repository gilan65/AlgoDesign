// Lo JSON Schema pubblicato (`docs/algo.schema.json`) e il lettore del formato dicono la stessa cosa:
// - il file pubblicato è, byte per byte, lo schema che il lettore compone (`testoDelloSchema`): un campo tolto o
//   cambiato nel file, o nel lettore senza riscrivere il file, è rosso;
// - un validatore indipendente, scritto da altri secondo lo standard (Ajv, draft 2020-12), legge il file pubblicato:
//   ogni file del corpus è valido per lui e per il lettore;
// - file sbagliati apposta, uno per regola di forma, sono rifiutati da tutti e due (con il controllo positivo: il
//   progetto di partenza è accettato da tutti e due);
// - le regole che lo schema non sa dire (l'`id` unico, il nome di un caso unico, i livelli dei blocchi annidati, il
//   surrogato isolato nel carattere di riempimento) le rifiuta il lettore e lo schema no: l'elenco è quello della
//   spiegazione del formato, e se lo schema imparasse a dirne una la prova lo segnala.
//
// Che cosa NON guarda: che le regole del controllo statico (nomi, valori iniziali, tipi delle espressioni) siano nello
// schema: non ci sono, per scelta, perché un file con un errore statico si apre.

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { apri, leggi, livelliMassimi, testoDelloSchema } from "./formato";

const radice = join(import.meta.dir, "..", "..");
const testoPubblicato = readFileSync(join(radice, "..", "docs", "algo.schema.json"), "utf8");
const valida = new Ajv2020({ strict: true, allErrors: true }).compile(JSON.parse(testoPubblicato));

test("lo schema pubblicato è quello che il lettore compone", () => {
  expect(testoPubblicato).toBe(testoDelloSchema());
});

/** I file `.algo` sotto una cartella, cercati sul disco in ogni sottocartella, in ordine di nome. */
function fileAlgo(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : 1))
    .flatMap((d) => (d.isDirectory() ? fileAlgo(join(cartella, d.name)) : d.name.endsWith(".algo") ? [join(cartella, d.name)] : []));
}

test("ogni file del corpus è valido per il lettore e per lo schema", () => {
  const corpus = [...fileAlgo(join(radice, "casi")), ...fileAlgo(join(radice, "e2e"))];
  const rifiutati = corpus.filter((f) => {
    const testo = readFileSync(f, "utf8");
    return !apri(testo).ok || !valida(JSON.parse(testo));
  });
  console.log(`corpus: ${corpus.length} file, rifiutati ${rifiutati.length}`);
  expect(corpus.length).toBeGreaterThan(100);
  expect(rifiutati).toEqual([]);
});

/** Un progetto valido con un blocco annidato, un dato, una funzione coi suoi casi e un caso del programma. */
const partenza = () => ({
  format: "algodesign",
  schema_version: 1,
  metadata: { name: "Prova", library: true },
  options: { real_decimals: 3, call_stack_limit: 10 },
  shared_constants: [{ name: "MASSIMO", type: "integer", constant: true, initial: "10" }],
  functions: [
    {
      id: "f0",
      kind: "main",
      data: [
        { name: "n", type: "integer", initial: "1", role: "input" },
        { name: "v", type: "real", size: 3, initial: { each: "0.0" } },
      ],
      body: [{ id: "b1", kind: "if", condition: "n > 0", then: [{ id: "b2", kind: "write", values: ["n"], newline: true }], else: [] }],
      end: { id: "b3" },
    },
    {
      id: "f1",
      kind: "function",
      name: "doppio",
      return_type: "integer",
      data: [{ name: "x", type: "integer", parameter: "value" }],
      body: [{ id: "b4", kind: "for", counter: "x", from: "1", to: "2", step: 1, body: [] }],
      end: { id: "b5", return_value: "x * 2" },
      test_cases: [{ name: "uno", inputs: [{ data: "x", text: "1" }], expected: { output: "" } }],
    },
  ],
  test_cases: [{ name: "caso", inputs: [{ data: "n", text: "1" }], expected: { output: "1\n", warnings: [{ code: "missing_role", block: "" }] } }],
});

type Progetto = ReturnType<typeof partenza> & Record<string, unknown>;
type Sonda = readonly [string, (p: Progetto) => void];

const main = (p: Progetto) => p.functions[0] as Record<string, unknown> & { body: Record<string, unknown>[]; end: Record<string, unknown>; data: Record<string, unknown>[] };
const funz = (p: Progetto) => p.functions[1] as Record<string, unknown> & { end: Record<string, unknown>; test_cases: { inputs: Record<string, unknown>[] }[] };
const atteso = (p: Progetto) => p.test_cases[0]!.expected as Record<string, unknown>;

/** Una sonda per regola di forma: il lettore la rifiuta, e lo schema deve rifiutarla anche lui. */
const sondeDellaForma: readonly Sonda[] = [
  ["un campo sconosciuto nella radice", (p) => (p.colore = "rosso")],
  ["un campo sconosciuto in un blocco annidato", (p) => ((main(p).body[0]!.then as Record<string, unknown>[])[0]!.colore = 1)],
  ["la radice senza metadata", (p) => delete (p as Record<string, unknown>).metadata],
  ["il nome del progetto vuoto", (p) => (p.metadata.name = "")],
  ["un formato diverso", (p) => (p.format = "altro")],
  ["la versione dello schema 2", (p) => (p.schema_version = 2)],
  ["nessuna funzione principale", (p) => p.functions.splice(0, 1)],
  ["due funzioni principali", (p) => p.functions.push({ ...main(p), id: "f9", body: [], end: { id: "b9" } } as never)],
  ["il programma principale col nome", (p) => (main(p).name = "principale")],
  ["il programma principale coi casi d'uso", (p) => (main(p).test_cases = [])],
  ["la fine del programma principale con un valore restituito", (p) => (main(p).end.return_value = "1")],
  ["una funzione senza il tipo restituito", (p) => delete funz(p).return_type],
  ["una funzione senza il nome", (p) => delete funz(p).name],
  ["un genere di funzione sconosciuto", (p) => (funz(p).kind = "metodo")],
  ["un genere di blocco sconosciuto", (p) => (main(p).body[0]!.kind = "switch")],
  ["un blocco senza id", (p) => delete main(p).body[0]!.id],
  ["un blocco con l'id vuoto", (p) => (main(p).body[0]!.id = "")],
  ["una condizione che non è testo", (p) => (main(p).body[0]!.condition = 1)],
  ["una scrittura senza valori", (p) => ((main(p).body[0]!.then as Record<string, unknown>[])[0]!.values = [])],
  ["un passo non intero", (p) => ((funz(p).body as Record<string, unknown>[])[0]!.step = 1.5)],
  ["un tipo di dato sconosciuto", (p) => (main(p).data[0]!.type = "float")],
  ["un modo di passaggio sconosciuto", (p) => ((funz(p).data as Record<string, unknown>[])[0]!.parameter = "copia")],
  ["un ruolo sconosciuto", (p) => (main(p).data[0]!.role = "lavoro")],
  ["un valore iniziale numero", (p) => (main(p).data[0]!.initial = 3)],
  ["un valore per ogni elemento che non è testo", (p) => (main(p).data[1]!.initial = { each: 0 })],
  ["un valore per ogni elemento con un campo in più", (p) => (main(p).data[1]!.initial = { each: "0", altro: "1" })],
  ["la libreria che non è un booleano", (p) => ((p.metadata as Record<string, unknown>).library = "sì")],
  ["i decimali oltre 15", (p) => (p.options.real_decimals = 16)],
  ["il tetto delle chiamate sotto 5", (p) => ((p.options as Record<string, unknown>).call_stack_limit = 4)],
  ["il tetto delle chiamate oltre 500", (p) => ((p.options as Record<string, unknown>).call_stack_limit = 501)],
  ["il tetto delle chiamate non intero", (p) => ((p.options as Record<string, unknown>).call_stack_limit = 10.5)],
  ["il carattere di riempimento di due caratteri", (p) => ((p.options as Record<string, unknown>).fill_character = "ab")],
  ["il carattere di riempimento di codice 0", (p) => ((p.options as Record<string, unknown>).fill_character = String.fromCodePoint(0))],
  ["un caso del programma con una voce senza testo", (p) => delete (p.test_cases[0]!.inputs[0] as Record<string, unknown>).text],
  ["una voce di una funzione con «each» non booleano", (p) => (funz(p).test_cases[0]!.inputs[0]!.each = "sì")],
  ["un atteso senza output", (p) => delete atteso(p).output],
  ["un atteso con errore ed errore statico", (p) => Object.assign(atteso(p), { error: { code: "division_by_zero", block: "b2" }, static_error: { code: "syntax_error", block: "b2" }, output: "" })],
  ["un errore statico atteso con un output", (p) => Object.assign(atteso(p), { static_error: { code: "syntax_error", block: "b2" } })],
  ["un codice d'errore sconosciuto", (p) => (atteso(p).error = { code: "boh", block: "b2" })],
  ["un avviso col codice di un errore", (p) => (atteso(p).warnings = [{ code: "division_by_zero", block: "b2" }])],
];

/** Le regole che solo il lettore controlla: la spiegazione del formato le dice a parole. */
const sondeSoloDelLettore: readonly Sonda[] = [
  ["due blocchi con lo stesso id", (p) => (main(p).end.id = "b1")],
  ["due casi del programma con lo stesso nome", (p) => p.test_cases.push(structuredClone(p.test_cases[0]!))],
  [
    `blocchi annidati oltre ${livelliMassimi} livelli`,
    (p) => {
      let corpo: Record<string, unknown>[] = main(p).body;
      for (let i = 0; i <= livelliMassimi; i++) {
        const dentro: Record<string, unknown>[] = [{ id: `w${i}`, kind: "comment", text: "" }];
        corpo.push({ id: `c${i}`, kind: "while", condition: "falso", body: dentro });
        corpo = dentro;
      }
    },
  ],
  ["il carattere di riempimento surrogato isolato", (p) => ((p.options as Record<string, unknown>).fill_character = String.fromCharCode(0xd800))],
];

const esito = (s: Sonda) => {
  const p = partenza() as Progetto;
  s[1](p);
  return { sonda: s[0], lettore: leggi(p).ok, schema: valida(p) as boolean };
};

test("il progetto di partenza è accettato dal lettore e dallo schema", () => {
  expect(leggi(partenza()).ok).toBe(true);
  expect(valida(partenza())).toBe(true);
});

test("ogni file sbagliato nella forma è rifiutato dal lettore e dallo schema", () => {
  const esiti = sondeDellaForma.map(esito);
  console.log(`sonde della forma: ${esiti.length}; rifiutate dal lettore ${esiti.filter((e) => !e.lettore).length}, dallo schema ${esiti.filter((e) => !e.schema).length}`);
  expect(esiti.filter((e) => e.lettore || e.schema)).toEqual([]);
});

test("le regole che lo schema non sa dire le rifiuta solo il lettore", () => {
  const esiti = sondeSoloDelLettore.map(esito);
  expect(esiti.filter((e) => e.lettore || !e.schema)).toEqual([]);
});
