import { describe, expect, test } from "bun:test";
import { apri, leggi, livelliMassimi, motivi, salva, type ErroreDiApertura } from "./formato";
import { codiciAvviso, codiciErrore, codiciErroreStatico } from "./modello";

// Censimento delle regole del formato del file di progetto (radice, metadati e opzioni, dati, funzioni, blocchi,
// casi d'uso e atteso), enumerate in quest'ordine. `dove` dice chi le fa rispettare: la lettura (`lettura`) e il
// salvataggio (`salvataggio`) hanno un test qui; quelle del controllo statico (`statico`: la validità dei dati e i
// codici degli errori statici) e dell'esecuzione dei casi d'uso (`esecuzione`) sono dichiarate col loro posto.
// L'ultimo test appaia il censimento con i test nei due versi e stampa i conteggi.
type Dove = "lettura" | "salvataggio" | "statico" | "esecuzione";
const regole: readonly { id: string; regola: string; dove: Dove }[] = [
  { id: "F2.1", regola: "format obbligatorio, sempre \"algodesign\"", dove: "lettura" },
  { id: "F2.2", regola: "schema_version obbligatorio, intero, 1 o 2; la 1 si apre come la 2, e salvando si scrive 2", dove: "lettura" },
  { id: "F2.13", regola: "records facoltativo, elenco di record", dove: "lettura" },
  { id: "F2.3", regola: "metadata obbligatorio, oggetto", dove: "lettura" },
  { id: "F2.4", regola: "options facoltativo, oggetto", dove: "lettura" },
  { id: "F2.5", regola: "shared_constants facoltativo, elenco di dati", dove: "lettura" },
  { id: "F2.6", regola: "shared_constants: solo costanti", dove: "statico" },
  { id: "F2.7", regola: "functions obbligatorio, elenco di funzioni", dove: "lettura" },
  { id: "F2.8", regola: "esattamente una funzione main (ripetuta nelle regole della funzione)", dove: "lettura" },
  { id: "F2.9", regola: "test_cases facoltativo, elenco di casi d'uso", dove: "lettura" },
  { id: "F2.10", regola: "un campo sconosciuto è un errore di apertura", dove: "lettura" },
  { id: "F2.11", regola: "una chiave ripetuta nello stesso oggetto è un errore di apertura", dove: "lettura" },
  { id: "F2.12", regola: "un BOM UTF-8 in testa si accetta, e il salvataggio non lo scrive", dove: "lettura" },
  { id: "F3.1", regola: "metadata.name obbligatorio, stringa non vuota", dove: "lettura" },
  { id: "F3.2", regola: "author, description, notes: stringhe facoltative", dove: "lettura" },
  { id: "F3.3", regola: "fill_character: un carattere, codice 0 e surrogati esclusi", dove: "lettura" },
  { id: "F3.4", regola: "real_decimals: intero da 0 a 15", dove: "lettura" },
  { id: "F3.5", regola: "un'opzione uguale al predefinito si omette salvando", dove: "salvataggio" },
  { id: "F3.6", regola: "library: booleano facoltativo; false si legge come assente e salvando si omette", dove: "lettura" },
  { id: "F3.7", regola: "call_stack_limit: intero da 5 a 500", dove: "lettura" },
  { id: "F4.1", regola: "dato: name obbligatorio, stringa", dove: "lettura" },
  { id: "F4.2", regola: "dato: name secondo le regole dei nomi, non riservato", dove: "statico" },
  { id: "F4.3", regola: "dato: type obbligatorio, uno dei cinque", dove: "lettura" },
  { id: "F4.4", regola: "dato: size facoltativo, intero", dove: "lettura" },
  { id: "F4.5", regola: "dato: size da 1 al tetto", dove: "statico" },
  { id: "F4.6", regola: "dato: constant facoltativo, booleano", dove: "lettura" },
  { id: "F4.7", regola: "dato: initial stringa, elenco di stringhe o { each }", dove: "lettura" },
  { id: "F4.8", regola: "dato: initial obbligatorio per le costanti", dove: "statico" },
  { id: "F4.9", regola: "dato: initial letterale del tipo (meno su intero e reale), vettore completo", dove: "statico" },
  { id: "F4.10", regola: "dato: role facoltativo, uno dei tre", dove: "lettura" },
  { id: "F4.11", regola: "dato: role mai su costanti e parametri", dove: "statico" },
  { id: "F4.12", regola: "dato: max_length facoltativo, intero", dove: "lettura" },
  { id: "F4.13", regola: "dato: max_length da 1 al tetto, solo stringhe", dove: "statico" },
  { id: "F4.14", regola: "dato: parameter facoltativo, value, reference o out", dove: "lettura" },
  { id: "F4.15", regola: "parametro: solo in procedure e function, senza initial, role né constant; mai per riferimento né per uscita in una function", dove: "statico" },
  { id: "F4.16", regola: "costante comune: constant true, senza role né parameter", dove: "statico" },
  { id: "F4.17", regola: "dato: type anche record, e allora record obbligatorio (stringa); con un altro tipo record non c'è", dove: "lettura" },
  { id: "F4.18", regola: "dato: record di un record del progetto, mai un vettore di record; il valore iniziale un letterale per campo", dove: "statico" },
  { id: "F5.1", regola: "funzione: id obbligatorio, stringa non vuota, unico nel progetto", dove: "lettura" },
  { id: "F5.2", regola: "funzione: kind obbligatorio, uno dei tre", dove: "lettura" },
  { id: "F5.3", regola: "funzione: name per procedure e function, assente nel main", dove: "lettura" },
  { id: "F5.4", regola: "funzione: name secondo le regole dei nomi", dove: "statico" },
  { id: "F5.5", regola: "funzione: return_type solo per function e lì obbligatorio, uno dei cinque", dove: "lettura" },
  { id: "F5.6", regola: "funzione: data obbligatorio, elenco di dati", dove: "lettura" },
  { id: "F5.7", regola: "funzione: body obbligatorio, elenco di blocchi", dove: "lettura" },
  { id: "F5.8", regola: "funzione: end obbligatorio, con id non vuoto e unico nel progetto; return_value solo per function e lì obbligatorio; breakpoint", dove: "lettura" },
  { id: "F5.9", regola: "funzione: default_result solo per function, facoltativo, stringa", dove: "lettura" },
  { id: "F5.10", regola: "funzione: default_result letterale del tipo restituito", dove: "statico" },
  { id: "F5.11", regola: "funzione: test_cases solo per procedure e function, elenco di casi d'uso coi nomi unici fra quelli della funzione", dove: "lettura" },
  { id: "F5.12", regola: "funzione: return_size e return_max_length solo per function, facoltativi, interi", dove: "lettura" },
  { id: "F5.14", regola: "funzione: return_type anche record, e allora return_record obbligatorio (stringa), solo per function", dove: "lettura" },
  { id: "F5.13", regola: "funzione: return_size da 1 al tetto, return_max_length da 1 al tetto e solo per una stringa; un vettore senza default_result", dove: "statico" },
  { id: "F6.1", regola: "blocco: id obbligatorio, stringa non vuota, unico nel progetto", dove: "lettura" },
  { id: "F6.2", regola: "blocco: kind obbligatorio, uno dei dieci", dove: "lettura" },
  { id: "F6.3", regola: "blocco: breakpoint facoltativo, booleano", dove: "lettura" },
  { id: "F6.4", regola: "assignment: target, value", dove: "lettura" },
  { id: "F6.5", regola: "read: target", dove: "lettura" },
  { id: "F6.6", regola: "write: values (almeno una), newline obbligatorio", dove: "lettura" },
  { id: "F6.7", regola: "if: condition, then, else, i due rami sempre presenti", dove: "lettura" },
  { id: "F6.8", regola: "while: condition, body", dove: "lettura" },
  { id: "F6.9", regola: "repeat: body, condition", dove: "lettura" },
  { id: "F6.10", regola: "for: counter, from, to, step intero facoltativo, body", dove: "lettura" },
  { id: "F6.11", regola: "for: step diverso da zero", dove: "statico" },
  { id: "F6.12", regola: "for_each: item, source, body", dove: "lettura" },
  { id: "F6.13", regola: "call: callee, arguments", dove: "lettura" },
  { id: "F6.14", regola: "comment: text", dove: "lettura" },
  { id: "F6.15", regola: "destinazioni (un nome o v[i]) ed espressioni nella sintassi del linguaggio", dove: "statico" },
  { id: "F6.16", regola: "al più livelliMassimi (50) livelli di blocchi annidati, oltre: too_deep", dove: "lettura" },
  { id: "F9.1", regola: "record: name obbligatorio, stringa; fields obbligatorio, elenco di campi { name, type uno dei cinque, max_length intero facoltativo }", dove: "lettura" },
  { id: "F9.2", regola: "record: nome secondo le regole dei nomi, unico fra i record, mai di un tipo, di un dato o di una funzione; almeno un campo, coi nomi validi e unici", dove: "statico" },
  { id: "F7.1", regola: "caso d'uso: name obbligatorio, stringa, unico fra i casi", dove: "lettura" },
  { id: "F7.2", regola: "caso d'uso: description facoltativo, stringa", dove: "lettura" },
  { id: "F7.3", regola: "caso d'uso: inputs obbligatorio, elenco di { data, text }", dove: "lettura" },
  { id: "F7.4", regola: "caso d'uso: expected obbligatorio", dove: "lettura" },
  { id: "F7.8", regola: "caso d'uso del programma: il nome non è quello di un caso di una procedura o funzione preceduto dal suo nome e da «/»", dove: "lettura" },
  { id: "F7.5", regola: "regole di esecuzione: input_mismatch, input_exhausted, unused_inputs", dove: "esecuzione" },
  { id: "F7.6", regola: "modo caso: l'output si tiene fino all'atteso più un margine di 1000 caratteri; oltre è tagliato, e diverso", dove: "esecuzione" },
  { id: "F7.7", regola: "modo caso: senza la tabella di traccia (la riga di comando) l'esito è lo stesso", dove: "esecuzione" },
  { id: "F8.1", regola: "expected: output obbligatorio, stringa", dove: "lettura" },
  { id: "F8.2", regola: "expected: error { code dell'interprete, block }", dove: "lettura" },
  { id: "F8.3", regola: "expected: static_error { code statico, block }, con output vuoto", dove: "lettura" },
  { id: "F8.4", regola: "expected: warnings elenco di { code d'avviso, block }", dove: "lettura" },
  { id: "F8.5", regola: "expected: error e static_error si escludono", dove: "lettura" },
  { id: "F8.6", regola: "expected: warnings assente vale nessun avviso atteso", dove: "esecuzione" },
  { id: "F8.7", regola: "esito a due livelli: raggiunto se coincidono output, error e static_error; gli avvisi diversi a parte", dove: "esecuzione" },
];

const provate = new Set<string>();
function regola(id: string, corpo: () => void): void {
  provate.add(id);
  test(`${id} ${regole.find((r) => r.id === id)?.regola ?? "(regola non censita)"}`, corpo);
}

// Un progetto valido con ogni genere di funzione e di blocco, ogni campo facoltativo e un'opzione diversa
// dal predefinito. Ogni prova ne altera una copia.
// Il JSON delle prove si altera liberamente, senza tipi.
type Json = any;
const base = (): Json => ({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "Prova", author: "a", description: "d", notes: "n" },
  options: { fill_character: "*", real_decimals: 3 },
  shared_constants: [{ name: "K", type: "integer", constant: true, initial: "3" }],
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [
        { name: "n", type: "integer", role: "input" },
        { name: "v", type: "real", size: 2, initial: ["1.0", "-2.5"] },
        { name: "w", type: "integer", size: 3, initial: { each: "0" } },
        { name: "s", type: "string", max_length: 10, role: "output" },
        { name: "c", type: "character", constant: true, initial: "'x'" },
      ],
      body: [
        { id: "b1", kind: "read", target: "n", breakpoint: true },
        { id: "b2", kind: "assignment", target: "s", value: "\"a\"" },
        { id: "b3", kind: "write", values: ["s", "n"], newline: true },
        { id: "b4", kind: "if", condition: "n > 0", then: [{ id: "b5", kind: "comment", text: "sì" }], else: [] },
        { id: "b6", kind: "while", condition: "false", body: [] },
        { id: "b7", kind: "repeat", body: [], condition: "true" },
        { id: "b8", kind: "for", counter: "n", from: "0", to: "2", step: -1, body: [] },
        { id: "b9", kind: "for_each", item: "n", source: "w", body: [] },
        { id: "b10", kind: "call", callee: "p", arguments: ["n"] },
      ],
      end: { id: "b11", breakpoint: false },
    },
    {
      id: "f2",
      kind: "procedure",
      name: "p",
      data: [{ name: "x", type: "integer", parameter: "value" }],
      body: [],
      end: { id: "b12" },
    },
    {
      id: "f3",
      kind: "function",
      name: "q",
      return_type: "boolean",
      data: [{ name: "a", type: "integer", size: 2, parameter: "reference" }],
      body: [],
      end: { id: "b13", return_value: "true" },
    },
  ],
  test_cases: [
    { name: "uno", description: "d", inputs: [{ data: "n", text: "4" }], expected: { output: "a4\n" } },
    {
      name: "due",
      inputs: [],
      expected: { output: "", error: { code: "input_exhausted", block: "b1" }, warnings: [{ code: "missing_role", block: "b3" }] },
    },
  ],
});

/** I motivi che i rami provati in questo file hanno dato: la prova in fondo li appaia con `motivi`. */
const motiviVisti = new Set<string>();

/** La base con una modifica: il file deve essere rifiutato con esattamente questi errori. */
function rifiuta(modifica: (p: Json) => void, ...attesi: ErroreDiApertura[]): void {
  const p = base();
  modifica(p);
  const esito = leggi(p);
  expect(esito.ok ? [] : esito.errori).toEqual(attesi);
  for (const a of attesi) motiviVisti.add(a.motivo);
}

/** La base con una modifica: il file si apre. */
function accetta(modifica: (p: Json) => void): void {
  const p = base();
  modifica(p);
  const esito = leggi(p);
  expect(esito.ok ? [] : esito.errori).toEqual([]);
}

const e = (percorso: string, motivo: ErroreDiApertura["motivo"]): ErroreDiApertura => ({ percorso, motivo });
const main = (p: Json) => p.functions[0];
const blocco = (p: Json, i: number) => main(p).body[i];

test("la base si apre, e un JSON non valido no", () => {
  expect(leggi(base()).ok).toBe(true);
  expect(apri("{ \"format\": ")).toEqual({ ok: false, errori: [e("", "invalid_json")] });
  expect(apri("[]")).toEqual({ ok: false, errori: [e("", "wrong_type")] });
  motiviVisti.add("invalid_json");
});

test("un intero -0 si legge 0: il testo salvato lo scrive 0, e la riapertura dà lo stesso modello", () => {
  const p = base();
  main(p).data.push({ name: "w", type: "integer", size: -0 });
  const letto = leggi(p);
  if (!letto.ok) throw new Error(JSON.stringify(letto.errori));
  const w = letto.progetto.functions[0]!.data.at(-1)!;
  expect(Object.is(w.size, 0)).toBe(true);
  const riaperto = apri(salva(letto.progetto));
  expect(riaperto.ok && riaperto.progetto).toStrictEqual(letto.progetto);
  // Controllo positivo: il confronto distingue -0 da 0.
  expect({ size: -0 }).not.toStrictEqual({ size: 0 });
});

describe("radice", () => {
  regola("F2.1", () => {
    rifiuta((p) => delete p.format, e("format", "missing_field"));
    rifiuta((p) => (p.format = "flowchart"), e("format", "invalid_value"));
  });
  regola("F2.2", () => {
    // La versione 1 si apre e diventa 2: salvando, il file la dice.
    const uno = base();
    uno.schema_version = 1;
    const letto = leggi(uno);
    expect(letto.ok && [letto.progetto.schema_version, salva(letto.progetto).startsWith('{\n  "format": "algodesign",\n  "schema_version": 2,\n')]).toEqual([2, true]);
    rifiuta((p) => (p.schema_version = 3), e("schema_version", "unknown_schema_version"));
    rifiuta((p) => (p.schema_version = 0), e("schema_version", "unknown_schema_version"));
    rifiuta((p) => (p.schema_version = "1"), e("schema_version", "wrong_type"));
    rifiuta((p) => delete p.schema_version, e("schema_version", "missing_field"));
  });
  regola("F2.3", () => {
    rifiuta((p) => delete p.metadata, e("metadata", "missing_field"));
    rifiuta((p) => (p.metadata = "Prova"), e("metadata", "wrong_type"));
  });
  regola("F2.4", () => {
    accetta((p) => delete p.options);
    rifiuta((p) => (p.options = []), e("options", "wrong_type"));
  });
  regola("F2.5", () => {
    accetta((p) => delete p.shared_constants);
    rifiuta((p) => (p.shared_constants = {}), e("shared_constants", "wrong_type"));
    rifiuta((p) => (p.shared_constants[0].type = "long"), e("shared_constants[0].type", "invalid_value"));
  });
  regola("F2.7", () => {
    rifiuta((p) => delete p.functions, e("functions", "missing_field"));
    rifiuta((p) => (p.functions = {}), e("functions", "wrong_type"));
  });
  regola("F2.8", () => {
    rifiuta((p) => (p.functions = p.functions.slice(1)), e("functions", "main_count"));
    rifiuta((p) => p.functions.push({ id: "f9", kind: "main", data: [], body: [], end: { id: "b99" } }), e("functions", "main_count"));
  });
  regola("F2.9", () => {
    accetta((p) => delete p.test_cases);
    accetta((p) => (p.test_cases = []));
    rifiuta((p) => (p.test_cases = {}), e("test_cases", "wrong_type"));
  });
  regola("F2.10", () => {
    // Un campo sconosciuto in ogni oggetto dello schema.
    rifiuta((p) => (p.theme = "scuro"), e("theme", "unknown_field"));
    rifiuta((p) => (p.metadata.title = "x"), e("metadata.title", "unknown_field"));
    rifiuta((p) => (p.options.decimals = 2), e("options.decimals", "unknown_field"));
    rifiuta((p) => (main(p).data[0].kind = "x"), e("functions[0].data[0].kind", "unknown_field"));
    rifiuta((p) => (main(p).nome = "x"), e("functions[0].nome", "unknown_field"));
    rifiuta((p) => (blocco(p, 0).value = "1"), e("functions[0].body[0].value", "unknown_field"));
    rifiuta((p) => (main(p).end.value = "1"), e("functions[0].end.value", "unknown_field"));
    rifiuta((p) => (p.test_cases[0].output = ""), e("test_cases[0].output", "unknown_field"));
    rifiuta((p) => (p.test_cases[0].inputs[0].value = "4"), e("test_cases[0].inputs[0].value", "unknown_field"));
    rifiuta((p) => (p.test_cases[0].expected.errors = []), e("test_cases[0].expected.errors", "unknown_field"));
    rifiuta((p) => (p.test_cases[1].expected.error.line = 3), e("test_cases[1].expected.error.line", "unknown_field"));
    rifiuta((p) => (main(p).data[1].initial = { each: "0", times: 2 }), e("functions[0].data[1].initial.times", "unknown_field"));
    // Anche coi nomi che ogni oggetto JavaScript eredita: non sono campi dello schema.
    rifiuta((p) => (p.constructor = 1), e("constructor", "unknown_field"));
    rifiuta((p) => (p.metadata.toString = "x"), e("metadata.toString", "unknown_field"));
    rifiuta((p) => (blocco(p, 0).hasOwnProperty = true), e("functions[0].body[0].hasOwnProperty", "unknown_field"));
    // `__proto__` scritto in un file è una chiave propria (`JSON.parse`), non il prototipo.
    const conProto = apri(JSON.stringify(base()).replace(/^\{/, '{"__proto__":{},'));
    expect(conProto.ok ? [] : conProto.errori).toEqual([e("__proto__", "unknown_field")]);
  });
  regola("F2.11", () => {
    const testo = JSON.stringify(base(), null, 2);
    /** Il testo con `riga` scritta subito dopo la prima riga che contiene `dopo`. */
    const conRiga = (dopo: string, riga: string) => testo.replace(dopo, `${dopo}\n${riga}`);
    const rifiutaTesto = (t: string, ...attesi: ErroreDiApertura[]) => {
      expect(apri(t)).toEqual({ ok: false, errori: attesi });
      for (const a of attesi) motiviVisti.add(a.motivo);
    };
    // Alla radice, in un oggetto annidato, in un oggetto dentro un elenco: il percorso è della ripetizione.
    rifiutaTesto(conRiga('"format": "algodesign",', '  "format": "algodesign",'), e("format", "duplicate_key"));
    rifiutaTesto(conRiga('"name": "Prova",', '    "name": "Altro",'), e("metadata.name", "duplicate_key"));
    rifiutaTesto(conRiga('"kind": "read",', '          "kind": "write",'), e("functions[0].body[0].kind", "duplicate_key"));
    // La stessa chiave scritta con una sequenza di escape è la stessa chiave (come per `JSON.parse`).
    rifiutaTesto(conRiga('"name": "Prova",', '    "n\\u0061me": "Altro",'), e("metadata.name", "duplicate_key"));
    // Tre volte: due ripetizioni.
    const tre = conRiga('"name": "Prova",', '    "name": "B",\n    "name": "C",');
    rifiutaTesto(tre, e("metadata.name", "duplicate_key"), e("metadata.name", "duplicate_key"));
    // Graffe, virgole, due punti e virgolette dentro una stringa non sono struttura; chiavi uguali in
    // oggetti diversi non sono ripetute.
    const p = base();
    p.metadata.notes = 'una "nota", con {graffe} e [quadre]: "name": "x", \\';
    expect(apri(JSON.stringify(p, null, 2)).ok).toBe(true);
    // Un JSON molto annidato (ma valido) non esaurisce lo stack: la lettura lo rifiuta per il tipo.
    const annidato = `${"[".repeat(100_000)}${"]".repeat(100_000)}`;
    expect(apri(annidato)).toEqual({ ok: false, errori: [e("", "wrong_type")] });
    expect(apri(`{"a":${annidato},"a":1}`)).toEqual({ ok: false, errori: [e("a", "duplicate_key")] });
  });
  regola("F2.12", () => {
    const letto = leggi(base());
    if (!letto.ok) throw new Error("la base non si legge");
    const testo = salva(letto.progetto);
    const conBom = String.fromCharCode(0xfeff) + testo;
    const aperto = apri(conBom);
    expect(aperto.ok).toBe(true);
    if (aperto.ok) expect(salva(aperto.progetto)).toBe(testo);
    // Un BOM non in testa resta un errore: fuori da una stringa non è uno spazio del JSON.
    expect(apri(`${testo.slice(0, 1)}${String.fromCharCode(0xfeff)}${testo.slice(1)}`)).toEqual({ ok: false, errori: [e("", "invalid_json")] });
    // Controllo positivo: senza saltarlo, `JSON.parse` lo rifiuta.
    expect(() => JSON.parse(conBom)).toThrow();
  });
});

describe("record", () => {
  const conRecord = (p: Json) => {
    p.records = [{ name: "alunno", fields: [{ name: "nome", type: "string", max_length: 20 }, { name: "voto", type: "integer" }] }];
    main(p).data.push({ name: "a", type: "record", record: "alunno" });
  };
  const a = (p: Json) => main(p).data.at(-1);
  // La posizione del dato aggiunto e quella della funzione della base.
  const ia = main(base()).data.length;
  const iF = base().functions.findIndex((x: Json) => x.kind === "function");
  const iP = base().functions.findIndex((x: Json) => x.kind === "procedure");
  regola("F2.13", () => {
    accetta(conRecord);
    accetta((p) => (p.records = []));
    rifiuta((p) => (p.records = {}), e("records", "wrong_type"));
  });
  regola("F9.1", () => {
    rifiuta((p) => (conRecord(p), delete p.records[0].fields), e("records[0].fields", "missing_field"));
    rifiuta((p) => (conRecord(p), delete p.records[0].name), e("records[0].name", "missing_field"));
    rifiuta((p) => (conRecord(p), (p.records[0].fields[1].type = "record")), e("records[0].fields[1].type", "invalid_value"));
    rifiuta((p) => (conRecord(p), (p.records[0].fields[0].max_length = "20")), e("records[0].fields[0].max_length", "wrong_type"));
    rifiuta((p) => (conRecord(p), (p.records[0].fields[0].size = 3)), e("records[0].fields[0].size", "unknown_field"));
    // Un record senza campi si apre: lo dice il controllo statico.
    accetta((p) => (conRecord(p), (p.records[0].fields = [])));
  });
  regola("F4.17", () => {
    rifiuta((p) => (conRecord(p), delete a(p).record), e(`functions[0].data[${ia}].record`, "missing_field"));
    rifiuta((p) => (conRecord(p), (a(p).type = "integer")), e(`functions[0].data[${ia}].record`, "field_not_allowed"));
    rifiuta((p) => (conRecord(p), (a(p).record = 1)), e(`functions[0].data[${ia}].record`, "wrong_type"));
    // Il record che non c'è si apre: lo dice il controllo statico.
    accetta((p) => (conRecord(p), (a(p).record = "studente")));
  });
  regola("F5.14", () => {
    const f = (p: Json) => p.functions.find((x: Json) => x.kind === "function");
    accetta((p) => (conRecord(p), (f(p).return_type = "record"), (f(p).return_record = "alunno")));
    rifiuta((p) => (conRecord(p), (f(p).return_type = "record")), e(`functions[${iF}].return_record`, "missing_field"));
    rifiuta((p) => (conRecord(p), (f(p).return_record = "alunno")), e(`functions[${iF}].return_record`, "field_not_allowed"));
    rifiuta((p) => (p.functions[iP].return_record = "alunno"), e(`functions[${iP}].return_record`, "field_not_allowed"));
  });
});

describe("metadati e opzioni", () => {
  regola("F3.1", () => {
    rifiuta((p) => delete p.metadata.name, e("metadata.name", "missing_field"));
    rifiuta((p) => (p.metadata.name = ""), e("metadata.name", "invalid_value"));
    rifiuta((p) => (p.metadata.name = 3), e("metadata.name", "wrong_type"));
  });
  regola("F3.2", () => {
    accetta((p) => (p.metadata = { name: "x" }));
    rifiuta((p) => (p.metadata.author = null), e("metadata.author", "wrong_type"));
    rifiuta((p) => (p.metadata.description = 1), e("metadata.description", "wrong_type"));
    rifiuta((p) => (p.metadata.notes = []), e("metadata.notes", "wrong_type"));
  });
  regola("F3.6", () => {
    const conSegno = (v: unknown) => {
      const p = base();
      p.metadata.library = v;
      return leggi(p);
    };
    const vero = conSegno(true);
    expect(vero.ok && vero.progetto.metadata).toEqual({ name: "Prova", author: "a", description: "d", notes: "n", library: true });
    // Dopo le note, e scritto.
    expect(vero.ok && salva(vero.progetto)).toContain('"notes": "n",\n    "library": true\n  },');
    const falso = conSegno(false);
    expect(falso.ok && falso.progetto.metadata).toEqual({ name: "Prova", author: "a", description: "d", notes: "n" });
    expect(falso.ok && salva(falso.progetto)).not.toContain("library");
    rifiuta((p) => (p.metadata.library = "true"), e("metadata.library", "wrong_type"));
    rifiuta((p) => (p.metadata.library = 1), e("metadata.library", "wrong_type"));
  });
  regola("F3.3", () => {
    accetta((p) => (p.options.fill_character = "😀"));
    // I codici validi ai due lati dei surrogati: un intervallo allargato li rifiuterebbe.
    for (const n of [0xd7ff, 0xe000, 0xffff, 0x10ffff]) accetta((p) => (p.options.fill_character = String.fromCodePoint(n)));
    rifiuta((p) => (p.options.fill_character = "ab"), e("options.fill_character", "invalid_value"));
    rifiuta((p) => (p.options.fill_character = ""), e("options.fill_character", "invalid_value"));
    rifiuta((p) => (p.options.fill_character = String.fromCodePoint(0)), e("options.fill_character", "invalid_value"));
    rifiuta((p) => (p.options.fill_character = String.fromCharCode(0xd800)), e("options.fill_character", "invalid_value"));
    rifiuta((p) => (p.options.fill_character = String.fromCharCode(0xdfff)), e("options.fill_character", "invalid_value"));
    rifiuta((p) => (p.options.fill_character = 32), e("options.fill_character", "wrong_type"));
  });
  regola("F3.4", () => {
    accetta((p) => (p.options.real_decimals = 0));
    accetta((p) => (p.options.real_decimals = 15));
    rifiuta((p) => (p.options.real_decimals = 16), e("options.real_decimals", "invalid_value"));
    rifiuta((p) => (p.options.real_decimals = -1), e("options.real_decimals", "invalid_value"));
    rifiuta((p) => (p.options.real_decimals = 2.5), e("options.real_decimals", "wrong_type"));
  });
  regola("F3.7", () => {
    accetta((p) => (p.options.call_stack_limit = 5));
    accetta((p) => (p.options.call_stack_limit = 500));
    rifiuta((p) => (p.options.call_stack_limit = 4), e("options.call_stack_limit", "invalid_value"));
    rifiuta((p) => (p.options.call_stack_limit = 501), e("options.call_stack_limit", "invalid_value"));
    rifiuta((p) => (p.options.call_stack_limit = 10.5), e("options.call_stack_limit", "wrong_type"));
    rifiuta((p) => (p.options.call_stack_limit = "10"), e("options.call_stack_limit", "wrong_type"));
  });
  regola("F3.5", () => {
    const p = base();
    p.options = { fill_character: " ", real_decimals: 3 };
    expect(JSON.parse(salva(p)).options).toEqual({ real_decimals: 3 });
    p.options = { fill_character: " ", real_decimals: 3, call_stack_limit: 10 };
    expect(JSON.parse(salva(p)).options).toEqual({ real_decimals: 3, call_stack_limit: 10 });
    p.options = { fill_character: " ", real_decimals: 2, call_stack_limit: 500 };
    expect("options" in JSON.parse(salva(p))).toBe(false);
    const aperto = leggi(p);
    expect(aperto.ok && "options" in aperto.progetto).toBe(false);
  });
});

describe("dati", () => {
  const dato = (p: Json, i = 0) => main(p).data[i];
  regola("F4.1", () => {
    rifiuta((p) => delete dato(p).name, e("functions[0].data[0].name", "missing_field"));
    rifiuta((p) => (dato(p).name = 1), e("functions[0].data[0].name", "wrong_type"));
  });
  regola("F4.3", () => {
    rifiuta((p) => delete dato(p).type, e("functions[0].data[0].type", "missing_field"));
    rifiuta((p) => (dato(p).type = "intero"), e("functions[0].data[0].type", "invalid_value"));
  });
  regola("F4.4", () => {
    rifiuta((p) => (dato(p, 1).size = "2"), e("functions[0].data[1].size", "wrong_type"));
    rifiuta((p) => (dato(p, 1).size = 1.5), e("functions[0].data[1].size", "wrong_type"));
  });
  regola("F4.6", () => {
    rifiuta((p) => (dato(p, 4).constant = "true"), e("functions[0].data[4].constant", "wrong_type"));
  });
  regola("F4.7", () => {
    // Il valore iniziale si apre come testo: lo controlla il controllo statico (si apre, e non parte).
    accetta((p) => (dato(p).initial = "-7"));
    accetta((p) => (dato(p).initial = "-2147483648"));
    accetta((p) => (dato(p, 4).initial = "-'x'"));
    rifiuta((p) => (dato(p).initial = 7), e("functions[0].data[0].initial", "wrong_type"));
    rifiuta((p) => (dato(p, 1).initial = ["1.0", 2]), e("functions[0].data[1].initial[1]", "wrong_type"));
    rifiuta((p) => (dato(p, 2).initial = {}), e("functions[0].data[2].initial.each", "missing_field"));
    rifiuta((p) => (dato(p, 2).initial = { each: 0 }), e("functions[0].data[2].initial.each", "wrong_type"));
  });
  regola("F4.10", () => {
    accetta((p) => (dato(p).role = "input_output"));
    rifiuta((p) => (dato(p).role = "in"), e("functions[0].data[0].role", "invalid_value"));
  });
  regola("F4.12", () => {
    rifiuta((p) => (dato(p, 3).max_length = "10"), e("functions[0].data[3].max_length", "wrong_type"));
  });
  regola("F4.14", () => {
    accetta((p) => (p.functions[1].data[0].parameter = "reference"));
    accetta((p) => (p.functions[1].data[0].parameter = "out"));
    rifiuta((p) => (p.functions[1].data[0].parameter = "copy"), e("functions[1].data[0].parameter", "invalid_value"));
  });
});

describe("funzioni", () => {
  regola("F5.1", () => {
    rifiuta((p) => delete p.functions[1].id, e("functions[1].id", "missing_field"));
    rifiuta((p) => (p.functions[1].id = 2), e("functions[1].id", "wrong_type"));
    rifiuta((p) => (p.functions[1].id = ""), e("functions[1].id", "invalid_value"));
    rifiuta((p) => (p.functions[1].end.id = ""), e("functions[1].end.id", "invalid_value"));
    rifiuta((p) => (p.functions[1].id = "f1"), e("functions[1].id", "duplicate_id"));
    // Unico nel progetto: anche rispetto ai blocchi.
    rifiuta((p) => (p.functions[1].id = "b1"), e("functions[1].id", "duplicate_id"));
  });
  regola("F5.2", () => {
    rifiuta((p) => delete p.functions[1].kind, e("functions[1].kind", "missing_field"));
    rifiuta((p) => (p.functions[1].kind = "subroutine"), e("functions[1].kind", "invalid_value"));
  });
  regola("F5.3", () => {
    rifiuta((p) => (main(p).name = "principale"), e("functions[0].name", "field_not_allowed"));
    rifiuta((p) => delete p.functions[1].name, e("functions[1].name", "missing_field"));
    rifiuta((p) => delete p.functions[2].name, e("functions[2].name", "missing_field"));
  });
  regola("F5.5", () => {
    rifiuta((p) => delete p.functions[2].return_type, e("functions[2].return_type", "missing_field"));
    rifiuta((p) => (p.functions[2].return_type = "text"), e("functions[2].return_type", "invalid_value"));
    // La stringa è uno dei cinque tipi: si apre.
    accetta((p) => (p.functions[2].return_type = "string"));
    rifiuta((p) => (p.functions[1].return_type = "integer"), e("functions[1].return_type", "field_not_allowed"));
    rifiuta((p) => (main(p).return_type = "integer"), e("functions[0].return_type", "field_not_allowed"));
  });
  regola("F5.6", () => {
    rifiuta((p) => delete p.functions[1].data, e("functions[1].data", "missing_field"));
    rifiuta((p) => (p.functions[1].data = {}), e("functions[1].data", "wrong_type"));
  });
  regola("F5.7", () => {
    rifiuta((p) => delete p.functions[1].body, e("functions[1].body", "missing_field"));
    rifiuta((p) => (p.functions[1].body = "b"), e("functions[1].body", "wrong_type"));
  });
  regola("F5.8", () => {
    rifiuta((p) => delete p.functions[1].end, e("functions[1].end", "missing_field"));
    rifiuta((p) => delete p.functions[1].end.id, e("functions[1].end.id", "missing_field"));
    rifiuta((p) => (p.functions[1].end.id = "b1"), e("functions[1].end.id", "duplicate_id"));
    rifiuta((p) => delete p.functions[2].end.return_value, e("functions[2].end.return_value", "missing_field"));
    rifiuta((p) => (p.functions[1].end.return_value = "1"), e("functions[1].end.return_value", "field_not_allowed"));
    rifiuta((p) => (main(p).end.breakpoint = 1), e("functions[0].end.breakpoint", "wrong_type"));
  });
  regola("F5.9", () => {
    accetta((p) => (p.functions[2].default_result = "0"));
    // Il tipo del letterale è del controllo statico: il file si apre.
    accetta((p) => (p.functions[2].default_result = "'a'"));
    rifiuta((p) => (p.functions[2].default_result = 0), e("functions[2].default_result", "wrong_type"));
    rifiuta((p) => (p.functions[1].default_result = "0"), e("functions[1].default_result", "field_not_allowed"));
    rifiuta((p) => (main(p).default_result = "0"), e("functions[0].default_result", "field_not_allowed"));
  });
  regola("F5.11", () => {
    const caso = (name: string) => ({ name, inputs: [{ data: "x", text: "1" }], expected: { output: "x\n" } });
    accetta((p) => (p.functions[1].test_cases = [caso("uno"), caso("due")]));
    accetta((p) => (p.functions[2].test_cases = []));
    // Lo stesso nome in due funzioni, o nel programma e in una funzione: elenchi diversi.
    accetta((p) => {
      p.functions[1].test_cases = [caso("uno")];
      p.functions[2].test_cases = [caso("uno")];
    });
    rifiuta((p) => (p.functions[1].test_cases = [caso("uno"), caso("uno")]), e("functions[1].test_cases[1].name", "duplicate_test_case_name"));
    rifiuta((p) => (p.functions[1].test_cases = [{ ...caso("uno"), colore: 1 }]), e("functions[1].test_cases[0].colore", "unknown_field"));
    rifiuta((p) => (p.functions[1].test_cases = {}), e("functions[1].test_cases", "wrong_type"));
    rifiuta((p) => (main(p).test_cases = []), e("functions[0].test_cases", "field_not_allowed"));
  });
  regola("F5.12", () => {
    // Un vettore restituito e la lunghezza massima della stringa restituita: interi, solo in una funzione; i valori fuori
    // dai limiti (zero, una lunghezza su un intero) aprono il file e sono errori del controllo statico.
    accetta((p) => (p.functions[2].return_size = 3));
    accetta((p) => (p.functions[2].return_max_length = 0));
    rifiuta((p) => (p.functions[2].return_size = "3"), e("functions[2].return_size", "wrong_type"));
    rifiuta((p) => (p.functions[2].return_max_length = 2.5), e("functions[2].return_max_length", "wrong_type"));
    rifiuta((p) => (p.functions[1].return_size = 3), e("functions[1].return_size", "field_not_allowed"));
    rifiuta((p) => (main(p).return_max_length = 3), e("functions[0].return_max_length", "field_not_allowed"));
    // Il salvataggio li scrive dopo il tipo restituito, nell'ordine della tabella.
    const p = base();
    Object.assign(p.functions[2], { return_max_length: 10, return_size: 2 });
    const esito = leggi(p);
    expect(esito.ok && Object.keys(esito.progetto.functions[2]!).slice(0, 6)).toEqual(["id", "kind", "name", "return_type", "return_size", "return_max_length"]);
  });
});

describe("blocchi", () => {
  regola("F6.1", () => {
    rifiuta((p) => delete blocco(p, 0).id, e("functions[0].body[0].id", "missing_field"));
    rifiuta((p) => (blocco(p, 0).id = 1), e("functions[0].body[0].id", "wrong_type"));
    rifiuta((p) => (blocco(p, 0).id = ""), e("functions[0].body[0].id", "invalid_value"));
    // Unico nel progetto: anche dentro un ramo e in un'altra funzione.
    rifiuta((p) => (blocco(p, 3).then[0].id = "b1"), e("functions[0].body[3].then[0].id", "duplicate_id"));
    rifiuta((p) => p.functions[1].body.push({ id: "b2", kind: "comment", text: "" }), e("functions[1].body[0].id", "duplicate_id"));
  });
  regola("F6.2", () => {
    rifiuta((p) => delete blocco(p, 0).kind, e("functions[0].body[0].kind", "missing_field"));
    rifiuta((p) => (blocco(p, 0).kind = "input"), e("functions[0].body[0].kind", "invalid_value"));
  });
  regola("F6.3", () => {
    rifiuta((p) => (blocco(p, 0).breakpoint = "sì"), e("functions[0].body[0].breakpoint", "wrong_type"));
  });
  regola("F6.4", () => {
    rifiuta((p) => delete blocco(p, 1).target, e("functions[0].body[1].target", "missing_field"));
    rifiuta((p) => delete blocco(p, 1).value, e("functions[0].body[1].value", "missing_field"));
    rifiuta((p) => (blocco(p, 1).value = 1), e("functions[0].body[1].value", "wrong_type"));
  });
  regola("F6.5", () => {
    rifiuta((p) => delete blocco(p, 0).target, e("functions[0].body[0].target", "missing_field"));
  });
  regola("F6.6", () => {
    rifiuta((p) => (blocco(p, 2).values = []), e("functions[0].body[2].values", "invalid_value"));
    rifiuta((p) => (blocco(p, 2).values = "s"), e("functions[0].body[2].values", "wrong_type"));
    rifiuta((p) => delete blocco(p, 2).newline, e("functions[0].body[2].newline", "missing_field"));
    rifiuta((p) => (blocco(p, 2).newline = "true"), e("functions[0].body[2].newline", "wrong_type"));
  });
  regola("F6.7", () => {
    rifiuta((p) => delete blocco(p, 3).condition, e("functions[0].body[3].condition", "missing_field"));
    rifiuta((p) => delete blocco(p, 3).then, e("functions[0].body[3].then", "missing_field"));
    rifiuta((p) => delete blocco(p, 3).else, e("functions[0].body[3].else", "missing_field"));
  });
  regola("F6.8", () => {
    rifiuta((p) => delete blocco(p, 4).condition, e("functions[0].body[4].condition", "missing_field"));
    rifiuta((p) => delete blocco(p, 4).body, e("functions[0].body[4].body", "missing_field"));
  });
  regola("F6.9", () => {
    rifiuta((p) => delete blocco(p, 5).body, e("functions[0].body[5].body", "missing_field"));
    rifiuta((p) => delete blocco(p, 5).condition, e("functions[0].body[5].condition", "missing_field"));
  });
  regola("F6.10", () => {
    accetta((p) => delete blocco(p, 6).step);
    // Il passo zero si apre: è `invalid_step`, del controllo statico.
    accetta((p) => (blocco(p, 6).step = 0));
    rifiuta((p) => (blocco(p, 6).step = "1"), e("functions[0].body[6].step", "wrong_type"));
    rifiuta((p) => (blocco(p, 6).step = 0.5), e("functions[0].body[6].step", "wrong_type"));
    for (const c of ["counter", "from", "to", "body"])
      rifiuta((p) => delete blocco(p, 6)[c], e(`functions[0].body[6].${c}`, "missing_field"));
  });
  regola("F6.12", () => {
    for (const c of ["item", "source", "body"]) rifiuta((p) => delete blocco(p, 7)[c], e(`functions[0].body[7].${c}`, "missing_field"));
  });
  regola("F6.13", () => {
    accetta((p) => (blocco(p, 8).arguments = []));
    rifiuta((p) => delete blocco(p, 8).callee, e("functions[0].body[8].callee", "missing_field"));
    rifiuta((p) => (blocco(p, 8).arguments = [1]), e("functions[0].body[8].arguments[0]", "wrong_type"));
  });
  regola("F6.14", () => {
    rifiuta((p) => delete blocco(p, 3).then[0].text, e("functions[0].body[3].then[0].text", "missing_field"));
  });
  regola("F6.16", () => {
    // `livelli` cicli uno dentro l'altro nel programma principale: il più interno sta al livello `livelli`.
    const annida = (p: Json, livelli: number) => {
      let corpo: Json[] = [];
      for (let i = livelli; i >= 1; i--) corpo = [{ id: `w${i}`, kind: "while", condition: "false", body: corpo }];
      main(p).body = corpo;
    };
    const sequenza = (livello: number) => `functions[0].body${"[0].body".repeat(livello - 1)}`;
    accetta((p) => annida(p, livelliMassimi));
    // Il livello in più si segnala una volta, sulla sequenza che lo porta; più in giù non si scende.
    rifiuta((p) => annida(p, livelliMassimi + 1), e(sequenza(livelliMassimi + 1), "too_deep"));
    rifiuta((p) => annida(p, 3 * livelliMassimi), e(sequenza(livelliMassimi + 1), "too_deep"));
    // Anche un ramo di una condizione è un livello.
    rifiuta((p) => {
      annida(p, livelliMassimi);
      let b = main(p).body[0];
      while (b.body.length > 0) b = b.body[0];
      b.kind = "if";
      delete b.body;
      Object.assign(b, { then: [], else: [{ id: "x", kind: "comment", text: "" }] });
    }, e(`${sequenza(livelliMassimi)}[0].else`, "too_deep"));
    // Un testo annidatissimo (20 000 livelli, oltre la pila di ogni motore misurato) si rifiuta senza esaurirla:
    // scritto per concatenazione, perché `JSON.stringify` di Bun la esaurirebbe già lui.
    const n = 20_000;
    const testo = `{"format":"algodesign","schema_version":1,"metadata":{"name":"p"},"functions":[{"id":"f1","kind":"main","data":[],"body":${Array.from({ length: n }, (_, i) => `[{"id":"w${i}","kind":"while","condition":"false","body":`).join("")}[]${"}]".repeat(n)},"end":{"id":"e"}}]}`;
    const esito = apri(testo);
    expect(esito.ok ? [] : esito.errori.map((x) => x.motivo)).toEqual(["too_deep"]);
  });
});

describe("casi d'uso e atteso", () => {
  const caso = (p: Json, i = 0) => p.test_cases[i];
  regola("F7.1", () => {
    rifiuta((p) => delete caso(p).name, e("test_cases[0].name", "missing_field"));
    rifiuta((p) => (caso(p, 1).name = "uno"), e("test_cases[1].name", "duplicate_test_case_name"));
  });
  regola("F7.8", () => {
    const delP = (name: string) => ({ name, inputs: [{ data: "x", text: "1" }], expected: { output: "" } });
    // «p/uno» col caso «uno» di `p`: lo stesso nome nella riga di comando (`file#p/uno`), ma il file si apre (com'era nella
    // versione di prima); il nome lo rifiutano le modifiche dei casi (prove delle operazioni).
    accetta((p) => {
      p.functions[1].test_cases = [delP("uno")];
      caso(p, 1).name = "p/uno";
    });
    // Una «/» che non si confonde: un'altra procedura, un caso che non c'è, la «/» nel caso della procedura.
    accetta((p) => {
      p.functions[1].test_cases = [delP("uno"), delP("a/b")];
      caso(p, 1).name = "q/uno";
      caso(p).name = "p/due";
    });
    accetta((p) => (caso(p, 1).name = "p/uno"));
  });
  regola("F7.2", () => {
    rifiuta((p) => (caso(p).description = 1), e("test_cases[0].description", "wrong_type"));
  });
  regola("F7.3", () => {
    rifiuta((p) => delete caso(p).inputs, e("test_cases[0].inputs", "missing_field"));
    rifiuta((p) => delete caso(p).inputs[0].data, e("test_cases[0].inputs[0].data", "missing_field"));
    rifiuta((p) => (caso(p).inputs[0].text = 4), e("test_cases[0].inputs[0].text", "wrong_type"));
  });
  regola("F7.4", () => {
    rifiuta((p) => delete caso(p).expected, e("test_cases[0].expected", "missing_field"));
  });
  regola("F8.1", () => {
    rifiuta((p) => delete caso(p).expected.output, e("test_cases[0].expected.output", "missing_field"));
    rifiuta((p) => (caso(p).expected.output = ["a"]), e("test_cases[0].expected.output", "wrong_type"));
  });
  regola("F8.2", () => {
    rifiuta((p) => (caso(p, 1).expected.error.code = "missing_role"), e("test_cases[1].expected.error.code", "invalid_value"));
    rifiuta((p) => delete caso(p, 1).expected.error.block, e("test_cases[1].expected.error.block", "missing_field"));
  });
  regola("F8.3", () => {
    const statico = (p: Json) => {
      delete caso(p, 1).expected.error;
      caso(p, 1).expected.static_error = { code: "type_mismatch", block: "b2" };
    };
    accetta(statico);
    rifiuta((p) => (statico(p), (caso(p, 1).expected.static_error.code = "uninitialized")), e("test_cases[1].expected.static_error.code", "invalid_value"));
    rifiuta((p) => (statico(p), (caso(p, 1).expected.output = "a")), e("test_cases[1].expected.output", "output_with_static_error"));
  });
  regola("F8.4", () => {
    accetta((p) => (caso(p, 1).expected.warnings = []));
    rifiuta((p) => (caso(p, 1).expected.warnings[0].code = "uninitialized"), e("test_cases[1].expected.warnings[0].code", "invalid_value"));
    rifiuta((p) => (caso(p, 1).expected.warnings = {}), e("test_cases[1].expected.warnings", "wrong_type"));
  });
  regola("F8.5", () => {
    rifiuta((p) => (caso(p, 1).expected.static_error = { code: "type_mismatch", block: "b2" }), e("test_cases[1].expected", "error_and_static_error"));
  });
});

// I codici degli errori e degli avvisi del formato, scritti a mano nell'ordine in cui il formato li elenca.
const codiciDelDocumento = {
  interprete: [
    "uninitialized", "index_out_of_range", "string_too_long", "null_character_in_string", "invalid_character_code",
    "string_longer_than_array", "same_reference", "reference_without_value", "integer_overflow", "division_by_zero", "real_to_integer_out_of_range",
    "non_finite_real", "invalid_input", "input_exhausted", "input_mismatch", "unused_inputs", "too_many_steps", "recursion_too_deep",
    "recursion_data_too_large", "out_of_memory",
  ],
  statici: [
    "unknown_name", "invalid_name", "invalid_data_item", "assign_to_constant", "assign_to_read_only", "array_assignment",
    "literal_out_of_range", "literal_leading_zero", "string_literal_too_long", "multi_code_character", "type_mismatch",
    "condition_not_boolean", "chained_comparison", "chained_power", "division_by_literal_zero", "invalid_step", "unknown_callee",
    "argument_mismatch", "reference_not_assignable", "same_reference", "function_as_statement", "procedure_in_expression",
    "limit_exceeded", "syntax_error", "function_with_effect", "invalid_default_value", "function_name_in_use", "reference_without_value",
    "unknown_record", "unknown_record_field", "record_name_in_use", "invalid_record",
  ],
  avvisi: [
    "integer_division_to_real", "real_equality", "useless_conversion", "constant_loop_condition", "input_never_read", "output_never_written",
    "missing_role", "maybe_uninitialized", "unused_data", "unused_value", "implicit_conversion",
  ],
};

/** Due elenchi appaiati per elementi, nei due versi, coi conteggi accanto. */
const appaia = (documento: readonly string[], modello: readonly string[]) => ({
  conteggi: [documento.length, modello.length],
  soloNelDocumento: documento.filter((c) => !modello.includes(c)),
  soloNelModello: modello.filter((c) => !documento.includes(c)),
});
const appaiato = (n: number) => ({ conteggi: [n, n], soloNelDocumento: [], soloNelModello: [] });

test("i codici dell'atteso sono quelli del formato, nome per nome: 20 + 32 + 11, 61 distinti", () => {
  expect(appaia(codiciDelDocumento.interprete, codiciErrore)).toEqual(appaiato(20));
  expect(appaia(codiciDelDocumento.statici, codiciErroreStatico)).toEqual(appaiato(32));
  expect(appaia(codiciDelDocumento.avvisi, codiciAvviso)).toEqual(appaiato(11));
  expect(new Set([...codiciErrore, ...codiciErroreStatico, ...codiciAvviso]).size).toBe(61);
  // Controllo positivo: un nome battuto male con lo stesso conteggio si vede nei due versi.
  const battutoMale = codiciErrore.map((c) => (c === "too_many_steps" ? "too_many_step" : c));
  expect(appaia(codiciDelDocumento.interprete, battutoMale)).toEqual({ conteggi: [20, 20], soloNelDocumento: ["too_many_steps"], soloNelModello: ["too_many_step"] });
});

// Dopo tutti i rami (Bun esegue le prove nell'ordine in cui sono scritte): ogni motivo d'apertura è dato da almeno un ramo
// provato qui col suo percorso, e nessun ramo dà un motivo che non c'è; così ogni testo di `i18n/motivi.ts` ha una causa
// vera, e una causa nuova non resta sotto il testo di un'altra.
test("ogni motivo d'apertura è dato da almeno un ramo provato, nei due versi", () => {
  const senzaRamo = motivi.filter((m) => !motiviVisti.has(m));
  const senzaMotivo = [...motiviVisti].filter((m) => !(motivi as readonly string[]).includes(m));
  console.log(`motivi d'apertura: ${motivi.length}; dati dai rami provati: ${motiviVisti.size}; senza ramo: ${JSON.stringify(senzaRamo)}`);
  expect({ senzaRamo, senzaMotivo }).toEqual({ senzaRamo: [], senzaMotivo: [] });
  // Controllo positivo: un motivo tolto dai visti si vede.
  const menoUno = new Set(motiviVisti);
  menoUno.delete("too_deep");
  expect(motivi.filter((m) => !menoUno.has(m))).toEqual(["too_deep"]);
});

// Ultima prova del file (Bun le esegue nell'ordine in cui sono scritte): il censimento nei due versi. Ogni
// regola di lettura o di salvataggio ha il suo test, e ogni test nomina una regola censita con quel posto;
// gli identificativi sono unici.
test("censimento: le regole del formato appaiate coi test nei due versi", () => {
  const conTest = regole.filter((r) => r.dove === "lettura" || r.dove === "salvataggio").map((r) => r.id);
  const senzaTestIn = (fatte: Set<string>) => conTest.filter((id) => !fatte.has(id));
  const senzaTest = senzaTestIn(provate);
  // Controllo positivo: senza il test di una regola, il censimento la trova.
  const menoUna = new Set(provate);
  menoUna.delete("F3.3");
  expect(senzaTestIn(menoUna)).toEqual(["F3.3"]);
  const fuoriCensimento = [...provate].filter((id) => !conTest.includes(id));
  const doppie = regole.length - new Set(regole.map((r) => r.id)).size;
  const perPosto = (d: Dove) => regole.filter((r) => r.dove === d).length;
  console.log(
    `censimento delle regole del formato: ${regole.length} regole (lettura ${perPosto("lettura")} · salvataggio ${perPosto("salvataggio")} · statico ${perPosto("statico")} · esecuzione ${perPosto("esecuzione")}); con test: ${conTest.length}, provate: ${provate.size}; senza test: ${JSON.stringify(senzaTest)}; test fuori censimento: ${JSON.stringify(fuoriCensimento)}; identificativi doppi: ${doppie}`,
  );
  expect({ senzaTest, fuoriCensimento, doppie }).toEqual({ senzaTest: [], fuoriCensimento: [], doppie: 0 });
  expect(provate.size).toBe(conTest.length);
});
