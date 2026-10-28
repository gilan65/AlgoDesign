import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { nomiDegliOperatori } from "../../i18n/operatori";
import { causeDeiCodici, paroleChiave } from "../espressioni/analizzatore";
import { apri, leggi } from "../progetto/formato";
import { codiciAvviso, codiciErroreStatico } from "../progetto/modello";
import { controlla, funzioniDelGiro, giriDellaRicorsione, tetti } from "./controllo";

// Censimento dei codici d'errore statico e d'avviso del formato (27 + 11), nell'ordine del formato, con la
// tappa che li introduce. Quelli delle tappe che il controllo conosce (1, 2 e 3) hanno un test qui, registrato col
// codice; un codice di una tappa dopo sarebbe dichiarato con la sua tappa. L'ultima prova appaia il censimento con
// l'elenco del modello e coi test, nei due versi, e stampa i conteggi.
const tappaDi: Record<string, 1 | 2 | 3 | 5> = {
  unknown_name: 1,
  invalid_name: 1,
  invalid_data_item: 1,
  assign_to_constant: 1,
  // `s[i]` dalla tappa 1, contatore di `for` e dato di `for_each` dalla 2 (la stringa per valore è una copia)
  assign_to_read_only: 1,
  array_assignment: 1,
  literal_out_of_range: 1,
  literal_leading_zero: 1,
  string_literal_too_long: 1,
  multi_code_character: 1,
  type_mismatch: 1,
  condition_not_boolean: 1,
  chained_comparison: 1,
  chained_power: 1,
  division_by_literal_zero: 1,
  invalid_step: 2,
  unknown_callee: 3,
  argument_mismatch: 3,
  reference_not_assignable: 3,
  same_reference: 3,
  function_as_statement: 3,
  procedure_in_expression: 3,
  limit_exceeded: 1,
  syntax_error: 1,
  function_with_effect: 3,
  invalid_default_value: 3,
  function_name_in_use: 3,
  reference_without_value: 3,
  // I record (la cartella `casi/tipi` del corpus).
  unknown_record: 5,
  unknown_record_field: 5,
  record_name_in_use: 5,
  invalid_record: 5,
  integer_division_to_real: 1,
  real_equality: 1,
  useless_conversion: 1,
  constant_loop_condition: 1,
  input_never_read: 1,
  output_never_written: 1,
  missing_role: 1,
  maybe_uninitialized: 1,
  unused_data: 2,
  unused_value: 2,
  implicit_conversion: 3,
};
/** Le tappe i cui codici si provano qui. */
const tappeProvate = [1, 2, 3, 5];

// Le regole che il censimento del formato (`progetto/formato.test.ts`) assegna al controllo statico: dove
// sono provate qui (un codice o un'etichetta registrata) o in quale tappa.
const regoleDelFormato: Record<string, string> = {
  "F2.6": "invalid_data_item",
  "F4.2": "invalid_name",
  "F4.5": "limit_exceeded",
  "F4.8": "invalid_data_item",
  "F4.9": "valori iniziali",
  "F4.11": "invalid_data_item",
  "F4.13": "limit_exceeded",
  "F4.15": "invalid_data_item",
  "F4.16": "invalid_data_item",
  "F5.4": "invalid_name",
  "F5.10": "invalid_default_value",
  "F5.13": "invalid_data_item",
  "F6.11": "invalid_step",
  "F4.18": "unknown_record",
  "F9.2": "record_name_in_use",
  "F6.15": "syntax_error",
};

const provati = new Set<string>();
/** Una prova registrata col codice: il codice è provato quando il corpo arriva in fondo. */
function prova(etichetta: string, corpo: () => void): void {
  test(etichetta, () => {
    corpo();
    provati.add(etichetta);
  });
}

// Un progetto col solo programma principale, letto col lettore vero.
type Json = any;
function progetto(data: Json[], body: Json[], comuni?: Json[]) {
  const esito = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    ...(comuni ? { shared_constants: comuni } : {}),
    functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
function esito(data: Json[], body: Json[], comuni?: Json[]) {
  const e = controlla(progetto(data, body, comuni), tetti);
  if (e.fuoriTappa) throw new Error(`fuori tappa: ${e.blocchi}`);
  return e;
}
// Come elenchi di stringhe: `toEqual` di Bun è tipato, e i codici attesi qui sono scritti come testo.
type Segnalate = readonly { code: string; block: string }[];
const errori = (data: Json[], body: Json[], comuni?: Json[]): Segnalate => esito(data, body, comuni).errori;
// Gli avvisi del dato inutile hanno le prove loro (`unused_data`, `unused_value`): le prove degli altri codici
// dichiarano più dati di quanti ne usano, e qui non li contano. `tuttiGliAvvisi` li conta.
const inutili = new Set(["unused_data", "unused_value"]);
const senzaInutili = (a: Segnalate): Segnalate => a.filter((x) => !inutili.has(x.code));
const avvisi = (data: Json[], body: Json[]): Segnalate => senzaInutili(esito(data, body).avvisi);
const tuttiGliAvvisi = (data: Json[], body: Json[], comuni?: Json[]): Segnalate => esito(data, body, comuni).avvisi;
const entrambi = (data: Json[], body: Json[]): { errori: Segnalate; avvisi: Segnalate } => {
  const r = esito(data, body);
  return { errori: r.errori, avvisi: senzaInutili(r.avvisi) };
};

const dato = (name: string, type: string, altro: Json = {}) => ({ name, type, ...altro });
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });
const leggiIn = (id: string, target: string) => ({ id, kind: "read", target });
const scrivi = (id: string, ...values: string[]) => ({ id, kind: "write", values, newline: true });
const per = (id: string, counter: string, body: Json[], altro: Json = {}) => ({ id, kind: "for", counter, from: "1", to: "3", body, ...altro });
const perOgni = (id: string, item: string, source: string, body: Json[]) => ({ id, kind: "for_each", item, source, body });
const e = (code: string, block: string) => ({ code, block });

// Un progetto con le procedure e le funzioni date dopo il programma principale, letto col lettore vero.
function conFunzioni(data: Json[], body: Json[], ...altre: Json[]) {
  const esito = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }, ...altre],
  });
  if (!esito.ok) throw new Error(JSON.stringify(esito.errori));
  return esito.progetto;
}
const procedura = (id: string, name: string, data: Json[], body: Json[]) => ({ id, kind: "procedure", name, data, body, end: { id: `fine-${id}` } });
const funzione = (id: string, name: string, return_type: string, data: Json[], body: Json[], return_value: string, altro: Json = {}) => ({
  id,
  kind: "function",
  name,
  return_type,
  ...altro,
  data,
  body,
  end: { id: `fine-${id}`, return_value },
});
const par = (name: string, type: string, parameter = "value", altro: Json = {}) => ({ name, type, parameter, ...altro });
const salta = (id: string, callee: string, ...args: string[]) => ({ id, kind: "call", callee, arguments: args });
function esitoDi(p: ReturnType<typeof conFunzioni>) {
  const r = controlla(p, tetti);
  if (r.fuoriTappa) throw new Error(`fuori tappa: ${r.blocchi}`);
  return r;
}
const erroriDi = (data: Json[], body: Json[], ...altre: Json[]): Segnalate => esitoDi(conFunzioni(data, body, ...altre)).errori;
/** Gli avvisi di un progetto SENZA errori statici: con un errore gli avvisi che seguono i percorsi e quelli dei ruoli non
 * si calcolano, e un elenco vuoto non direbbe nulla (un riferimento senza valore è un errore). */
const avvisiDi = (data: Json[], body: Json[], ...altre: Json[]): Segnalate => {
  const r = esitoDi(conFunzioni(data, body, ...altre));
  if (r.errori.length > 0) throw new Error(`avvisi di un progetto con errori: ${JSON.stringify(r.errori)}`);
  return senzaInutili(r.avvisi);
};

// Con un valore iniziale: le prove degli altri codici leggono questi dati senza l'avviso del dato letto prima
// di avere un valore, che ha le prove sue.
const n = dato("n", "integer", { initial: "0" });
const x = dato("x", "real", { initial: "0.0" });
const c = dato("c", "character", { initial: "'a'" });
const s = dato("s", "string", { initial: '""' });
const b = dato("b", "boolean", { initial: "false" });
const v = dato("v", "integer", { size: 3, initial: { each: "0" } });
const tutti = [n, x, c, s, b, v];

/** Un'espressione scritta in una scrittura, coi sei dati di prova: i suoi errori. */
const inScrittura = (testo: string) => errori(tutti, [scrivi("b1", testo)]);

describe("errori statici delle tappe 1 e 2", () => {
  prova("unknown_name", () => {
    expect(inScrittura("y + 1")).toEqual([e("unknown_name", "b1")]);
    expect(errori(tutti, [leggiIn("b2", "y")])).toEqual([e("unknown_name", "b2")]);
    expect(errori(tutti, [assegna("b3", "y[0]", "1")])).toEqual([e("unknown_name", "b3")]);
    // I nomi italiani degli operatori non esistono nel file.
    expect(inScrittura("lunghezza")).toEqual([e("unknown_name", "b1")]);
  });

  prova("invalid_name", () => {
    for (const nome of ["1a", "_a", "a-b", "è", "int", "class", "lambda", "length", "lunghezza", "pi_greco", "a".repeat(64)])
      expect(errori([dato(nome, "integer")], [])).toEqual([e("invalid_name", "f1")]);
    expect(errori([dato("a".repeat(63), "integer")], [])).toEqual([]);
    // Doppio nella funzione, o uguale a una costante comune (che ha il blocco vuoto: il progetto).
    expect(errori([n, dato("n", "real")], [])).toEqual([e("invalid_name", "f1")]);
    const k = dato("K", "integer", { constant: true, initial: "1" });
    expect(errori([dato("K", "real")], [], [k])).toEqual([e("invalid_name", "f1")]);
    expect(errori([], [], [dato("int", "integer", { constant: true, initial: "1" })])).toEqual([e("invalid_name", "")]);
    // Un nome delle intestazioni del C: no per una costante comune e per una procedura, a livello di file nel C; sì per
    // un dato di una funzione, che lo copre.
    for (const nome of ["log", "gamma", "remove", "FILE", "isnan"]) {
      expect(errori([], [], [dato(nome, "integer", { constant: true, initial: "1" })]), nome).toEqual([e("invalid_name", "")]);
      expect(erroriDi([], [], procedura("f2", nome, [], [])), nome).toEqual([e("invalid_name", "f2")]);
      expect(errori([dato(nome, "integer", { initial: "1" })], [scrivi("b1", nome)]), nome).toEqual([]);
    }
    // Ogni nome di un operatore, in ogni lingua dell'interfaccia, è riservato: l'elenco dei riservati è scritto
    // a mano, la tabella dei nomi è tipata altrove, e un operatore nuovo non deve diventare un nome di dato.
    const nomiOperatori = Object.values(nomiDegliOperatori).flatMap((nomi) => Object.values(nomi));
    console.log(`nomi degli operatori nelle lingue: ${nomiOperatori.length} (${Object.keys(nomiDegliOperatori).length} lingue)`);
    expect(nomiOperatori.length).toBe(28);
    for (const nome of nomiOperatori) expect({ nome, errori: errori([dato(nome, "integer")], []) }).toEqual({ nome, errori: [e("invalid_name", "f1")] });
    // Lo stesso per le parole chiave dell'analizzatore (anche quelle che non si traducono: and, or, not, mod,
    // true, false), con le sei scritte qui come premessa indipendente.
    console.log(`parole chiave dell'analizzatore: ${paroleChiave.size}`);
    for (const parola of ["and", "or", "not", "mod", "true", "false"]) expect(paroleChiave.has(parola)).toBe(true);
    for (const nome of paroleChiave) expect({ nome, errori: errori([dato(nome, "integer")], []) }).toEqual({ nome, errori: [e("invalid_name", "f1")] });
    // Controllo positivo: un nome della stessa forma che non è un operatore è valido.
    expect(errori([dato("converti_a_booleano", "integer")], [])).toEqual([]);
  });

  prova("invalid_data_item", () => {
    const casi: Json[] = [
      dato("a", "integer", { size: 0 }),
      dato("a", "integer", { max_length: 10 }),
      dato("a", "string", { max_length: 0 }),
      dato("a", "integer", { parameter: "value" }),
      dato("a", "integer", { constant: true }),
      dato("a", "integer", { constant: true, initial: "1", role: "output" }),
      dato("a", "integer", { initial: "1 + 2" }),
      dato("a", "integer", { initial: "n" }),
      dato("a", "real", { initial: "pi" }),
      dato("a", "integer", { initial: ["1", "2"] }),
      dato("a", "integer", { size: 3, initial: ["1", "2"] }),
      dato("a", "integer", { size: 3, initial: "1" }),
      dato("a", "integer", { initial: { each: "0" } }),
    ];
    for (const d of casi) expect({ d, errori: errori([d], []) }).toEqual({ d, errori: [e("invalid_data_item", "f1")] });
    // Costante comune: solo costanti, senza ruolo né parametro.
    expect(errori([], [], [dato("K", "integer", { initial: "1" })])).toEqual([e("invalid_data_item", "")]);
    expect(errori([], [], [dato("K", "integer", { constant: true, initial: "1", role: "input" })])).toEqual([e("invalid_data_item", "")]);
    expect(errori([], [], [dato("K", "integer", { constant: true, initial: "1", parameter: "value" })])).toEqual([e("invalid_data_item", "")]);
    // Le misure del risultato di una funzione, come quelle di un dato: una dimensione di zero elementi, una lunghezza
    // massima su un intero o di zero caratteri.
    // (Un vettore che restituisce un valore solo ha anche l'errore della sua fine: qui si guarda la funzione.)
    for (const [tipo, misure] of [["integer", { return_size: 0 }], ["integer", { return_max_length: 10 }], ["string", { return_max_length: 0 }]] as const) {
      const sullaFunzione = erroriDi([], [], funzione("f2", "g", tipo, [], [], tipo === "string" ? '"a"' : "1", misure)).filter((x) => x.block === "f2");
      expect({ misure, errori: sullaFunzione }).toEqual({ misure, errori: [e("invalid_data_item", "f2")] });
    }
  });

  prova("assign_to_constant", () => {
    const k = dato("k", "integer", { constant: true, initial: "1" });
    expect(errori([k], [assegna("b1", "k", "2")])).toEqual([e("assign_to_constant", "b1")]);
    expect(errori([k], [leggiIn("b2", "k")])).toEqual([e("assign_to_constant", "b2")]);
    const kv = dato("kv", "integer", { size: 2, constant: true, initial: { each: "0" } });
    expect(errori([kv], [assegna("b3", "kv[0]", "1")])).toEqual([e("assign_to_constant", "b3")]);
    // Una costante comune non si assegna nemmeno dal programma principale.
    expect(errori([], [assegna("b4", "K", "2")], [dato("K", "integer", { constant: true, initial: "1" })])).toEqual([e("assign_to_constant", "b4")]);
  });

  prova("assign_to_read_only", () => {
    expect(errori(tutti, [assegna("b1", "s[0]", "'a'")])).toEqual([e("assign_to_read_only", "b1")]);
    expect(errori(tutti, [leggiIn("b2", "s[0]")])).toEqual([e("assign_to_read_only", "b2")]);
    // Il contatore di un `per` e l'elemento di un `per ogni` nel loro corpo: assegnati, letti dalla console, presi
    // da un ciclo interno; anche più giù, dentro un `se` o un `mentre` del corpo.
    expect(errori(tutti, [per("b1", "n", [assegna("b2", "n", "1")])])).toEqual([e("assign_to_read_only", "b2")]);
    expect(errori(tutti, [per("b1", "n", [{ id: "b2", kind: "if", condition: "b", then: [leggiIn("b3", "n")], else: [] }])])).toEqual([e("assign_to_read_only", "b3")]);
    expect(errori(tutti, [per("b1", "n", [per("b2", "n", [])])])).toEqual([e("assign_to_read_only", "b2")]);
    expect(errori(tutti, [perOgni("b1", "c", "s", [assegna("b2", "c", "'x'")])])).toEqual([e("assign_to_read_only", "b2")]);
    expect(errori(tutti, [perOgni("b1", "c", "s", [{ id: "b2", kind: "while", condition: "b", body: [perOgni("b3", "c", "s", [])] }])])).toEqual([e("assign_to_read_only", "b3")]);
    expect(errori(tutti, [perOgni("b1", "n", "v", [per("b2", "n", [])])])).toEqual([e("assign_to_read_only", "b2")]);
    // Il ciclo interno sullo stesso contatore non lo libera per il resto del corpo esterno.
    expect(errori(tutti, [per("b1", "n", [per("b2", "n", []), assegna("b3", "n", "1")])])).toEqual([e("assign_to_read_only", "b2"), e("assign_to_read_only", "b3")]);
    // Controllo positivo: dopo il ciclo, e in un ciclo che segue, il dato si assegna; la sorgente si assegna nel corpo.
    expect(errori(tutti, [per("b1", "n", []), assegna("b2", "n", "1"), per("b3", "n", []), perOgni("b4", "c", "s", [assegna("b5", "s", '"x"')])])).toEqual([]);
  });

  prova("array_assignment", () => {
    // Un vettore riceve un valore tutto insieme solo da un vettore dello stesso tipo e della stessa dimensione: mai un
    // valore solo, un calcolo, un vettore d'altra dimensione o d'altro tipo, una lettura.
    const w = dato("w", "integer", { size: 3, initial: { each: "1" } });
    const lungo = dato("lungo", "integer", { size: 4, initial: { each: "1" } });
    const reali = dato("reali", "real", { size: 3, initial: { each: "1.0" } });
    for (const valore of ["5", "n", "w[0]", "w + 1", "(w)[0]", "lungo", "reali"])
      expect({ valore, errori: errori([v, w, n, lungo, reali], [assegna("b1", "v", valore)]) }).toEqual({ valore, errori: [e("array_assignment", "b1")] });
    expect(errori([v], [leggiIn("b2", "v")])).toEqual([e("array_assignment", "b2")]);
    // Il vettore restituito da una funzione: di un'altra dimensione o di un altro tipo, nell'assegnazione e nel
    // «Restituisce»; e lì nemmeno un valore solo.
    const doppi = (dimensione: number, tipo = "integer", restituisce = "r") =>
      funzione("f2", "doppi", tipo, [par("a", "integer", "value", { size: 3 }), dato("r", tipo, { size: dimensione, initial: { each: tipo === "real" ? "0.0" : "0" } })], [], restituisce, { return_size: dimensione });
    expect(erroriDi([v, w], [assegna("b3", "v", "doppi(w)")], doppi(4))).toEqual([e("array_assignment", "b3")]);
    expect(erroriDi([v, w], [assegna("b3", "v", "doppi(w)")], doppi(3, "real"))).toEqual([e("array_assignment", "b3")]);
    expect(erroriDi([v, w], [assegna("b3", "v", "doppi(w)")], doppi(3, "integer", "a[0]"))).toEqual([e("array_assignment", "fine-f2")]);
    expect(erroriDi([v, w], [assegna("b3", "v", "doppi(w)")], doppi(3, "integer", "5"))).toEqual([e("array_assignment", "fine-f2")]);
    // Controllo positivo: l'elemento si assegna e si legge; il nome di un vettore uguale si copia; il vettore restituito
    // uguale si assegna, e «Restituisce» il nome di un vettore uguale o un parametro uguale.
    expect(errori([v], [assegna("b3", "v[0]", "1"), leggiIn("b4", "v[1]")])).toEqual([]);
    expect(errori([v, w], [assegna("b5", "v", "w")])).toEqual([]);
    expect(erroriDi([v, w], [assegna("b3", "v", "doppi(w)")], doppi(3))).toEqual([]);
    expect(erroriDi([v, w], [assegna("b3", "v", "doppi(w)")], doppi(3, "integer", "a"))).toEqual([]);
  });

  prova("literal_out_of_range", () => {
    expect(inScrittura("2147483648")).toEqual([e("literal_out_of_range", "b1")]);
    expect(inScrittura("1.0e400")).toEqual([e("literal_out_of_range", "b1")]);
    expect(inScrittura("-2147483647 - 1")).toEqual([]);
  });

  prova("literal_leading_zero", () => {
    expect(inScrittura("n + 007")).toEqual([e("literal_leading_zero", "b1")]);
  });

  prova("string_literal_too_long", () => {
    const corta = dato("t", "string", { max_length: 3 });
    expect(errori([corta], [assegna("b1", "t", '"abcd"')])).toEqual([e("string_literal_too_long", "b1")]);
    // Si conta in codici: tre caratteri, uno fuori dal piano di base.
    expect(errori([corta], [assegna("b2", "t", `"a${String.fromCodePoint(0x1f600)}b"`)])).toEqual([]);
    expect(errori([dato("t", "string", { max_length: 2, initial: '"abc"' })], [])).toEqual([e("string_literal_too_long", "f1")]);
    expect(errori([dato("t", "string", { initial: `"${"a".repeat(256)}"` })], [])).toEqual([e("string_literal_too_long", "f1")]);
    // Il risultato di una funzione che restituisce una stringa, contro la sua lunghezza massima (255 se non scritta).
    const saluto = (testo: string, altro: Json = {}) => funzione("f2", "saluto", "string", [], [], testo, altro);
    expect(erroriDi([], [], saluto('"abcd"', { return_max_length: 3 }))).toEqual([e("string_literal_too_long", "fine-f2")]);
    expect(erroriDi([], [], saluto(`"${"a".repeat(256)}"`))).toEqual([e("string_literal_too_long", "fine-f2")]);
    // Controllo positivo: la lunghezza giusta passa.
    expect(erroriDi([], [], saluto('"abc"', { return_max_length: 3 }))).toEqual([]);
    expect(erroriDi([], [], saluto(`"${"a".repeat(255)}"`))).toEqual([]);
  });

  prova("multi_code_character", () => {
    expect(errori(tutti, [assegna("b1", "c", "'ab'")])).toEqual([e("multi_code_character", "b1")]);
  });

  prova("type_mismatch", () => {
    for (const testo of [
      "c + 1",
      "c + c",
      "n + true",
      "b * 2",
      "- s",
      "not n",
      "n mod 2.0",
      "x mod 2",
      "c < 1",
      "s < c",
      "b < b",
      "n and b",
      "to_integer b",
      "to_real c",
      "to_character x",
      "length c",
      "absolute_value c",
      "square_root s",
      "s raised_to 2",
      "v + 1",
      "v",
      "n[0]",
      "s[1.0]",
      "v[c]",
      "to_string v",
      "to_array s",
    ])
      expect({ testo, errori: inScrittura(testo) }).toEqual({ testo, errori: [e("type_mismatch", "b1")] });
    // Assegnazioni: nessuna conversione implicita che perde informazione, nessun tipo diverso.
    for (const [target, value] of [
      ["n", "2.5"],
      ["n", "x"],
      ["c", "65"],
      ["s", "c"],
      ["b", "1"],
      ["n", "v"],
      ["v", "to_array s"],
      ["n", "to_string v"],
    ])
      expect({ target, value, errori: errori(tutti, [assegna("b2", target!, value!)]) }).toEqual({ target, value, errori: [e("type_mismatch", "b2")] });
    // E i permessi: l'intero va nel reale, il carattere si concatena a una stringa.
    expect(errori(tutti, [assegna("b3", "x", "n"), assegna("b4", "s", "s + c"), assegna("b5", "s", "c + s")])).toEqual([]);
    // I cicli: un contatore che non è un dato semplice intero; inizio o fine non interi; una sorgente che non è il
    // nome di un vettore o di una stringa; un elemento di tipo diverso da quello degli elementi.
    const w = dato("w", "real", { size: 2, initial: { each: "0.5" } });
    for (const b of [
      per("b6", "x", []),
      per("b6", "v", []),
      per("b6", "v[0]", []),
      per("b6", "n", [], { from: "1.5" }),
      per("b6", "n", [], { to: "c" }),
      per("b6", "n", [], { to: "v" }),
      perOgni("b6", "c", "n", []),
      perOgni("b6", "c", "s + s", []),
      perOgni("b6", "n", "s", []),
      perOgni("b6", "s", "s", []),
      perOgni("b6", "n", "w", []),
      perOgni("b6", "v", "v", []),
    ])
      expect({ b, errori: errori([...tutti, w], [b]) }).toEqual({ b, errori: [e("type_mismatch", "b6")] });
    // Controllo positivo: le forme giuste, anche un elemento reale da un vettore di reali.
    expect(errori([...tutti, w], [per("b7", "n", [], { from: "-2", to: "length s", step: -1 }), perOgni("b8", "c", "s", []), perOgni("b9", "n", "v", []), perOgni("b10", "x", "w", [])])).toEqual([]);
    // Una funzione che restituisce un vettore è un vettore intero: non si scrive, non va in un dato semplice, e col suo
    // indice dà un elemento; una che restituisce una stringa dà, col suo indice, un carattere. Nel «per ogni» il suo
    // risultato si percorre come un vettore o una stringa; uno che non lo è no.
    const doppi = funzione("f2", "doppi", "integer", [par("a", "integer", "value", { size: 3 })], [], "a", { return_size: 3 });
    const saluto = funzione("f3", "saluto", "string", [], [], '"ciao"');
    const uno = funzione("f4", "uno", "integer", [], [], "1");
    const lettere = funzione("f5", "lettere", "character", [dato("t", "character", { size: 2, initial: { each: "'x'" } })], [], "t", { return_size: 2 });
    const funzioni = [doppi, saluto, uno, lettere];
    for (const corpo of [
      scrivi("b11", "doppi(v)"),
      assegna("b11", "n", "doppi(v)"),
      assegna("b11", "c", "doppi(v)[0]"),
      assegna("b11", "n", "saluto()[0]"),
      assegna("b11", "s", "to_string doppi(v)"),
      perOgni("b11", "c", "doppi(v)", []),
      perOgni("b11", "n", "saluto()", []),
      perOgni("b11", "n", "uno()", []),
    ])
      expect({ corpo, errori: erroriDi(tutti, [corpo], ...funzioni) }).toEqual({ corpo, errori: [e("type_mismatch", "b11")] });
    expect(
      erroriDi(tutti, [assegna("b12", "n", "doppi(v)[1] + 1"), assegna("b13", "c", "saluto()[0]"), perOgni("b14", "n", "doppi(v)", []), perOgni("b15", "c", "saluto()", []), assegna("b16", "s", "to_string lettere()")], ...funzioni),
    ).toEqual([]);
  });

  prova("invalid_step", () => {
    for (const step of [0, 2147483648, -2147483649])
      expect({ step, errori: errori(tutti, [per("b1", "n", [], { step })]) }).toEqual({ step, errori: [e("invalid_step", "b1")] });
    // Controllo positivo: i due estremi di `int` e il passo che manca (vale 1).
    expect(errori(tutti, [per("b1", "n", [], { step: 2147483647 }), per("b2", "n", [], { step: -2147483648 }), per("b3", "n", [])])).toEqual([]);
  });

  prova("condition_not_boolean", () => {
    const se = { id: "b1", kind: "if", condition: "n", then: [], else: [] };
    const mentre = { id: "b2", kind: "while", condition: "x + 1", body: [] };
    const ripeti = { id: "b3", kind: "repeat", body: [], condition: "s" };
    expect(errori(tutti, [se, mentre, ripeti])).toEqual([e("condition_not_boolean", "b1"), e("condition_not_boolean", "b2"), e("condition_not_boolean", "b3")]);
  });

  prova("chained_comparison", () => {
    expect(inScrittura("1 < n < 3")).toEqual([e("chained_comparison", "b1")]);
  });

  prova("chained_power", () => {
    expect(inScrittura("2 raised_to 3 raised_to 2")).toEqual([e("chained_power", "b1")]);
    expect(inScrittura("2 raised_to (3 raised_to 2)")).toEqual([]);
  });

  prova("division_by_literal_zero", () => {
    expect(inScrittura("n / 0")).toEqual([e("division_by_literal_zero", "b1")]);
    expect(inScrittura("n mod 0")).toEqual([e("division_by_literal_zero", "b1")]);
    // Fra reali la divisione per zero è un reale non finito, dell'interprete.
    expect(inScrittura("x / 0")).toEqual([]);
  });

  prova("limit_exceeded", () => {
    const dimensione = tetti.elementiDiUnVettore + 1;
    expect(errori([dato("a", "integer", { size: dimensione })], [])).toEqual([e("limit_exceeded", "f1")]);
    expect(errori([dato("a", "string", { max_length: tetti.lunghezzaDiUnaStringa + 1 })], [])).toEqual([e("limit_exceeded", "f1")]);
    // I caratteri di un vettore di stringhe, elementi per lunghezza massima, al più 10 000: senza
    // lunghezza (255) 39 stringhe ci stanno e 40 no; 10 da 1000 e 100 da 100 sì, 11 da 1000 no.
    expect(errori([dato("a", "string", { size: 39 })], [])).toEqual([]);
    expect(errori([dato("a", "string", { size: 40 })], [])).toEqual([e("limit_exceeded", "f1")]);
    expect(errori([dato("a", "string", { size: 10, max_length: 1000 }), dato("b", "string", { size: 100, max_length: 100 })], [])).toEqual([]);
    expect(errori([dato("a", "string", { size: 11, max_length: 1000 })], [])).toEqual([e("limit_exceeded", "f1")]);
    // I tetti sono un parametro: alzati, lo stesso dato passa; abbassati, un dato piccolo non passa più.
    const alti = { elementiDiUnVettore: 2000, lunghezzaDiUnaStringa: 2000, caratteriDiUnVettoreDiStringhe: 100_000 };
    const conTetti = (d: Json, t: typeof tetti): Segnalate | string => {
      const r = controlla(progetto([d], []), t);
      return r.fuoriTappa ? "fuori tappa" : r.errori;
    };
    expect(conTetti(dato("a", "integer", { size: 1001 }), alti)).toEqual([]);
    expect(conTetti(dato("a", "string", { max_length: 1001 }), alti)).toEqual([]);
    expect(conTetti(dato("a", "string", { size: 257 }), alti)).toEqual([]);
    expect(conTetti(dato("a", "string", { size: 10, max_length: 10 }), { ...tetti, caratteriDiUnVettoreDiStringhe: 99 })).toEqual([e("limit_exceeded", "f1")]);
    expect(conTetti(dato("a", "integer", { size: 10 }), { ...tetti, elementiDiUnVettore: 9 })).toEqual([e("limit_exceeded", "f1")]);
    // Le misure del risultato di una funzione, coi tetti di un dato: sulla funzione.
    // (Un vettore che restituisce un valore solo ha anche l'errore della sua fine: qui si guarda la funzione.)
    for (const [tipo, misure] of [["integer", { return_size: dimensione }], ["string", { return_max_length: tetti.lunghezzaDiUnaStringa + 1 }], ["string", { return_size: 40 }]] as const) {
      const sullaFunzione = erroriDi([], [], funzione("f2", "g", tipo, [], [], tipo === "string" ? '"a"' : "1", misure)).filter((x) => x.block === "f2");
      expect({ misure, errori: sullaFunzione }).toEqual({ misure, errori: [e("limit_exceeded", "f2")] });
    }
  });

  prova("syntax_error", () => {
    expect(inScrittura("n +")).toEqual([e("syntax_error", "b1")]);
    // Una destinazione è un nome o l'elemento di un nome.
    expect(errori(tutti, [assegna("b2", "n + 1", "1")])).toEqual([e("syntax_error", "b2")]);
    expect(errori(tutti, [leggiIn("b3", "v[0] * 2")])).toEqual([e("syntax_error", "b3")]);
    // Le parentesi non lasciano traccia: `(n)[0]` è `n[0]`, l'indice su un intero.
    expect(errori(tutti, [leggiIn("b4", "(n)[0]")])).toEqual([e("type_mismatch", "b4")]);
    expect(errori([dato("a", "character", { initial: "'a" })], [])).toEqual([e("syntax_error", "f1")]);
  });
});

// La causa precisa viaggia accanto agli errori, che restano nella forma dell'atteso di un caso (codice e blocco).
test("la causa precisa: dell'espressione di un blocco, della destinazione, del valore iniziale di un dato", () => {
  const r = esito(tutti, [scrivi("b1", "(n + 1"), assegna("b2", "n + 1", "1"), scrivi("b3", "'ab'"), scrivi("b4", "n / 0")]);
  expect(r.errori as Segnalate).toEqual([e("syntax_error", "b1"), e("syntax_error", "b2"), e("multi_code_character", "b3"), e("division_by_literal_zero", "b4")]);
  expect(r.fermate as readonly unknown[]).toEqual([
    { code: "syntax_error", block: "b1", fermata: { causa: "tonda_aperta" } },
    { code: "syntax_error", block: "b2", fermata: { causa: "destinazione" } },
    { code: "multi_code_character", block: "b3", fermata: { causa: "piu_caratteri", segno: "'ab'" } },
  ]);
  // Il valore iniziale: il primo letterale che non si lascia leggere, anche in un elenco, anche in un valore ripetuto.
  const delDato = (d: Json) => esito([d], []).dati.map(({ code, fermata }) => ({ code, fermata }));
  expect(delDato(dato("a", "string", { initial: '"ciao' }))).toEqual([{ code: "syntax_error", fermata: { causa: "virgolette_aperte" } }]);
  expect(delDato(dato("v", "integer", { size: 3, initial: ["1", "2x", "("] }))).toEqual([{ code: "syntax_error", fermata: { causa: "numero_scritto_male", segno: "2x" } }]);
  expect(delDato(dato("v", "character", { size: 2, initial: { each: "'ab'" } }))).toEqual([{ code: "multi_code_character", fermata: { causa: "piu_caratteri", segno: "'ab'" } }]);
  // Un codice con una causa sola non porta una causa.
  expect(delDato(dato("a", "integer", { initial: "'a'" }))).toEqual([{ code: "type_mismatch", fermata: undefined }]);
});

// La causa precisa dei codici del controllo che ne hanno più d'una: per ogni causa un progetto dove SOLO la sua guardia la
// distingue, e il posto dove la si legge (il blocco, o la riga del dato: la funzione e la posizione). Le righe si appaiano
// con l'elenco delle cause del nucleo nei due versi: una causa nuova senza progetto, o un progetto con una causa che il
// nucleo non conosce, fanno rosso.
describe("la causa precisa dei codici del controllo", () => {
  type Dove = { readonly blocco: string } | { readonly funzione: string; readonly indice: number };
  type Riga = readonly [codice: string, causa: string, segno: string | undefined, progetto: () => ReturnType<typeof conFunzioni>, dove: Dove];
  const nelProgramma = (data: Json[], body: Json[] = [], ...altre: Json[]) => () => conFunzioni(data, body, ...altre);
  const conComuni = (comuni: Json[], body: Json[] = [], ...altre: Json[]) => () => {
    const r = leggi({ format: "algodesign", schema_version: 2, metadata: { name: "prova" }, shared_constants: comuni, functions: [{ id: "f1", kind: "main", data: [], body, end: { id: "fine" } }, ...altre] });
    if (!r.ok) throw new Error(JSON.stringify(r.errori));
    return r.progetto;
  };
  const primo = { funzione: "f1", indice: 0 } as const;
  const comune = { funzione: "", indice: 0 } as const;
  const b1 = { blocco: "b1" } as const;
  const conRif = (tipo: string, altro: Json = {}) => procedura("f2", "p", [par("r", tipo, "reference", altro)], []);
  const conValore = (tipo: string, altro: Json = {}) => procedura("f2", "p", [par("r", tipo, "value", altro)], []);
  const vettore = (nome: string, tipo = "integer", size = 3) => dato(nome, tipo, { size, initial: { each: tipo === "real" ? "0.0" : "0" } });
  const g = (data: Json[], body: Json[], valore = "1", altro: Json = {}) => funzione("f2", "g", "integer", data, body, valore, altro);
  const accentoAParte = String.fromCharCode(0x301);
  /** Un progetto coi record dati e il programma principale. */
  const conRecord = (records: Json[], data: Json[] = [], body: Json[] = [], ...altre: Json[]) => () => {
    const r = leggi({ format: "algodesign", schema_version: 2, metadata: { name: "prova" }, records, functions: [{ id: "f1", kind: "main", data, body, end: { id: "fine" } }, ...altre] });
    if (!r.ok) throw new Error(JSON.stringify(r.errori));
    return r.progetto;
  };
  const rec = (name: string, ...campi: string[]) => ({ name, fields: campi.map((c) => ({ name: c, type: "integer" })) });
  const delRecord = (name: string, record = "r", altro: Json = {}) => dato(name, "record", { record, ...altro });
  const progetto = { blocco: "" } as const;
  const righe: readonly Riga[] = [
    ["unknown_record_field", "campo_assente", "vto", conRecord([rec("r", "voto")], [delRecord("a")], [assegna("b1", "a.vto", "1")]), b1],
    ["unknown_record_field", "non_un_record", "voto", nelProgramma([n], [assegna("b1", "n.voto", "1")]), b1],
    ["record_name_in_use", "record_doppio", "r", conRecord([rec("r", "x"), rec("r", "y")]), progetto],
    ["record_name_in_use", "nome_di_un_dato", "r", conRecord([rec("r", "x")], [dato("r", "integer")]), progetto],
    ["record_name_in_use", "nome_di_una_funzione", "r", conRecord([rec("r", "x")], [], [], procedura("f2", "r", [], [])), progetto],
    // «reale», «real», «booleano» e «boolean» sono già riservati (`invalid_name`); gli altri nomi dei tipi no.
    ["record_name_in_use", "nome_di_un_tipo", "intero", conRecord([rec("intero", "x")]), progetto],
    ["record_name_in_use", "nome_di_un_tipo", "record", conRecord([rec("record", "x")]), progetto],
    ["invalid_record", "senza_campi", "r", conRecord([rec("r")]), progetto],
    ["invalid_record", "campo_doppio", "x", conRecord([rec("r", "x", "x")]), progetto],
    ["invalid_data_item", "vettore_di_record", undefined, conRecord([rec("r", "x")], [delRecord("t", "r", { size: 2 })]), primo],
    ["limit_exceeded", "oltre_elementi", "1000", nelProgramma([dato("v", "integer", { size: 1001 })]), primo],
    ["limit_exceeded", "oltre_lunghezza", "1000", nelProgramma([dato("s", "string", { max_length: 1001 })]), primo],
    ["limit_exceeded", "oltre_caratteri", "10000", nelProgramma([dato("v", "string", { size: 100, max_length: 101 })]), primo],
    ["limit_exceeded", "oltre_elementi", "1000", nelProgramma([], [], g([vettore("w")], [], "w", { return_size: 1001 })), { blocco: "f2" }],
    ["invalid_name", "nome_vuoto", undefined, nelProgramma([dato("", "integer")]), primo],
    ["invalid_name", "nome_cifra", undefined, nelProgramma([dato("1a", "integer")]), primo],
    ["invalid_name", "nome_trattino", undefined, nelProgramma([dato("_a", "integer")]), primo],
    ["invalid_name", "nome_accentato", "à", nelProgramma([dato("città", "integer")]), primo],
    // L'accento scritto a parte (un segno diacritico dopo la lettera) si cita con la sua lettera.
    ["invalid_name", "nome_accentato", `e${accentoAParte}`, nelProgramma([dato(`e${accentoAParte}ta`, "integer")]), primo],
    ["invalid_name", "nome_spazio", undefined, nelProgramma([dato("eta media", "integer")]), primo],
    ["invalid_name", "nome_simbolo", "-", nelProgramma([dato("a-b", "integer")]), primo],
    ["invalid_name", "nome_lungo", undefined, nelProgramma([dato("a".repeat(64), "integer")]), primo],
    ["invalid_name", "nome_riservato", "while", nelProgramma([dato("while", "integer")]), primo],
    ["invalid_name", "nome_riservato", "class", nelProgramma([dato("class", "integer")]), primo],
    ["invalid_name", "nome_riservato", "lunghezza", nelProgramma([dato("lunghezza", "integer")]), primo],
    ["invalid_name", "nome_della_libreria", "log", conComuni([dato("log", "integer", { constant: true, initial: "1" })]), comune],
    ["invalid_name", "nome_doppio", "a", nelProgramma([dato("a", "integer"), dato("a", "integer")]), { funzione: "f1", indice: 1 }],
    ["invalid_name", "nome_doppio", "k", () => {
      const r = leggi({ format: "algodesign", schema_version: 2, metadata: { name: "prova" }, shared_constants: [dato("k", "integer", { constant: true, initial: "1" })], functions: [{ id: "f1", kind: "main", data: [dato("k", "integer")], body: [], end: { id: "fine" } }] });
      if (!r.ok) throw new Error(JSON.stringify(r.errori));
      return r.progetto;
    }, primo],
    ["invalid_name", "nome_cifra", undefined, nelProgramma([], [], procedura("f2", "1p", [], [])), { blocco: "f2" }],
    ["invalid_name", "nome_della_libreria", "log", nelProgramma([], [], procedura("f2", "log", [], [])), { blocco: "f2" }],
    ["invalid_data_item", "dimensione_non_valida", undefined, nelProgramma([dato("v", "integer", { size: 0 })]), primo],
    ["invalid_data_item", "lunghezza_non_valida", undefined, nelProgramma([dato("s", "string", { max_length: 0 })]), primo],
    ["invalid_data_item", "lunghezza_non_stringa", undefined, nelProgramma([dato("n", "integer", { max_length: 5 })]), primo],
    ["invalid_data_item", "parametro_fuori_posto", undefined, nelProgramma([par("p", "integer")]), primo],
    ["invalid_data_item", "parametro_con_attributi", undefined, nelProgramma([], [], procedura("f2", "p", [par("r", "integer", "value", { initial: "1" })], [])), { funzione: "f2", indice: 0 }],
    ["invalid_data_item", "parametro_con_attributi", undefined, nelProgramma([], [], procedura("f2", "p", [par("r", "integer", "value", { role: "input" })], [])), { funzione: "f2", indice: 0 }],
    ["invalid_data_item", "comune_non_costante", undefined, conComuni([dato("k", "integer", { initial: "1" })]), comune],
    ["invalid_data_item", "costante_senza_valore", undefined, nelProgramma([dato("k", "integer", { constant: true })]), primo],
    ["invalid_data_item", "costante_con_ruolo", undefined, nelProgramma([dato("k", "integer", { constant: true, initial: "1", role: "input" })]), primo],
    ["invalid_data_item", "forma_del_valore", undefined, nelProgramma([dato("n", "integer", { initial: ["1", "2"] })]), primo],
    ["invalid_data_item", "forma_del_valore", undefined, nelProgramma([dato("v", "integer", { size: 3, initial: "1" })]), primo],
    ["invalid_data_item", "elenco_di_altra_lunghezza", "2", nelProgramma([dato("v", "integer", { size: 3, initial: ["1", "2"] })]), primo],
    ["invalid_data_item", "valore_non_scritto", "x", nelProgramma([dato("n", "integer", { initial: "x" })]), primo],
    ["invalid_data_item", "valore_non_scritto", "1 + 2", nelProgramma([dato("n", "integer", { initial: "1 + 2" })]), primo],
    ["invalid_data_item", "valore_non_scritto", "-x", nelProgramma([dato("n", "integer", { initial: "-x" })]), primo],
    ["invalid_data_item", "valore_non_scritto", "x", nelProgramma([dato("v", "integer", { size: 2, initial: ["1", "x"] })]), primo],
    ["invalid_data_item", "dimensione_non_valida", undefined, nelProgramma([], [], g([vettore("w")], [], "w", { return_size: 0 })), { blocco: "f2" }],
    ["constant_loop_condition", "sempre_vera", undefined, nelProgramma([], [{ id: "b1", kind: "while", condition: "true", body: [] }]), b1],
    ["constant_loop_condition", "sempre_vera", undefined, nelProgramma([], [{ id: "b1", kind: "repeat", condition: "true", body: [] }]), b1],
    ["constant_loop_condition", "mentre_falsa", undefined, nelProgramma([], [{ id: "b1", kind: "while", condition: "false", body: [] }]), b1],
    ["constant_loop_condition", "ripeti_falsa", undefined, nelProgramma([], [{ id: "b1", kind: "repeat", condition: "false", body: [] }]), b1],
    ["assign_to_read_only", "carattere_della_stringa", "s", nelProgramma([s], [assegna("b1", "s[0]", "'x'")]), b1],
    ["assign_to_read_only", "contatore_del_ciclo", "n", nelProgramma([n], [per("c1", "n", [assegna("b1", "n", "1")])]), b1],
    ["assign_to_read_only", "contatore_del_ciclo", "n", nelProgramma([n], [per("c1", "n", [leggiIn("b1", "n")])]), b1],
    ["assign_to_read_only", "contatore_del_ciclo", "n", nelProgramma([n], [per("c1", "n", [per("b1", "n", [])])]), b1],
    ["assign_to_read_only", "elemento_del_ciclo", "n", nelProgramma([v, n], [perOgni("c1", "n", "v", [assegna("b1", "n", "1")])]), b1],
    ["function_with_effect", "funzione_legge", undefined, nelProgramma([], [], g([n], [leggiIn("b1", "n")], "n")), b1],
    ["function_with_effect", "funzione_scrive", undefined, nelProgramma([], [], g([], [scrivi("b1", "1")])), b1],
    ["function_with_effect", "funzione_salta", undefined, nelProgramma([], [], procedura("f3", "p", [], []), g([], [salta("b1", "p")])), b1],
    ["function_with_effect", "parametro_non_copia", "r", nelProgramma([], [], g([par("r", "integer", "reference")], [], "r")), { funzione: "f2", indice: 0 }],
    ["function_with_effect", "parametro_non_copia", "r", nelProgramma([], [], g([par("r", "integer", "out")], [])), { funzione: "f2", indice: 0 }],
    ["argument_mismatch", "argomenti_in_piu", "p", nelProgramma([], [salta("b1", "p", "1", "2")], conValore("integer")), b1],
    ["argument_mismatch", "argomenti_in_meno", "p", nelProgramma([], [salta("b1", "p")], conValore("integer")), b1],
    ["argument_mismatch", "argomenti_in_piu", "g", nelProgramma([n], [assegna("b1", "n", "g(1)"), scrivi("b2", "n")], g([], [])), b1],
    ["argument_mismatch", "tipo_diverso", "r", nelProgramma([], [salta("b1", "p", "true")], conValore("integer")), b1],
    ["argument_mismatch", "tipo_diverso", "r", nelProgramma([], [salta("b1", "p", "1.5")], conValore("integer")), b1],
    ["argument_mismatch", "lunghezza_diversa", "r", nelProgramma([dato("t", "string", { max_length: 10, initial: '"a"' })], [salta("b1", "p", "t")], conValore("string")), b1],
    ["argument_mismatch", "vettore_per_semplice", "r", nelProgramma([v], [salta("b1", "p", "v")], conValore("integer")), b1],
    ["argument_mismatch", "semplice_per_vettore", "r", nelProgramma([n], [salta("b1", "p", "n")], conValore("integer", { size: 3 })), b1],
    ["argument_mismatch", "vettore_diverso", "r", nelProgramma([vettore("w", "integer", 4)], [salta("b1", "p", "w")], conValore("integer", { size: 3 })), b1],
    ["argument_mismatch", "vettore_diverso", "r", nelProgramma([vettore("w", "real")], [salta("b1", "p", "w")], conValore("integer", { size: 3 })), b1],
    // Stesso tipo e stessa dimensione, la lunghezza massima delle stringhe diversa.
    ["argument_mismatch", "lunghezza_diversa_nel_vettore", "r", nelProgramma([dato("w", "string", { size: 3, max_length: 20, initial: { each: '"a"' } })], [salta("b1", "p", "w")], conValore("string", { size: 3, max_length: 10 })), b1],
    ["argument_mismatch", "tipo_per_riferimento", "r", nelProgramma([b], [salta("b1", "p", "b")], conRif("integer")), b1],
    ["argument_mismatch", "tipo_per_riferimento", "r", nelProgramma([n], [salta("b1", "p", "n")], conRif("real")), b1],
    ["argument_mismatch", "lunghezza_diversa", "r", nelProgramma([dato("t", "string", { max_length: 10, initial: '"a"' })], [salta("b1", "p", "t")], conRif("string")), b1],
    ["argument_mismatch", "vettore_per_semplice", "r", nelProgramma([v], [salta("b1", "p", "v")], conRif("integer")), b1],
    ["argument_mismatch", "semplice_per_vettore", "r", nelProgramma([v], [salta("b1", "p", "v[0]")], conRif("integer", { size: 3 })), b1],
    ["argument_mismatch", "vettore_diverso", "r", nelProgramma([vettore("w", "integer", 4)], [salta("b1", "p", "w")], conRif("integer", { size: 3 })), b1],
    ["argument_mismatch", "lunghezza_diversa_nel_vettore", "r", nelProgramma([dato("w", "string", { size: 3, max_length: 20, initial: { each: '"a"' } })], [salta("b1", "p", "w")], conRif("string", { size: 3, max_length: 10 })), b1],
    ["reference_not_assignable", "non_un_dato", "r", nelProgramma([n], [salta("b1", "p", "n + 1")], conRif("integer")), b1],
    ["reference_not_assignable", "non_un_dato", "r", nelProgramma([], [salta("b1", "p", "3")], conRif("integer")), b1],
    ["reference_not_assignable", "non_un_dato", "r", nelProgramma([], [salta("b1", "p", "g()")], conRif("integer"), funzione("f3", "g", "integer", [], [], "1")), b1],
    ["reference_not_assignable", "fra_parentesi", "r", nelProgramma([n], [salta("b1", "p", "(n)")], conRif("integer")), b1],
    ["reference_not_assignable", "costante_passata", "k", nelProgramma([dato("k", "integer", { constant: true, initial: "1" })], [salta("b1", "p", "k")], conRif("integer")), b1],
    ["reference_not_assignable", "costante_passata", "k", conComuni([dato("k", "integer", { constant: true, initial: "1" })], [salta("b1", "p", "k")], conRif("integer")), b1],
    ["reference_not_assignable", "contatore_passato", "n", nelProgramma([n], [per("c1", "n", [salta("b1", "p", "n")])], conRif("integer")), b1],
    ["reference_not_assignable", "elemento_passato", "n", nelProgramma([v, n], [perOgni("c1", "n", "v", [salta("b1", "p", "n")])], conRif("integer")), b1],
    ["reference_not_assignable", "carattere_passato", "s", nelProgramma([s], [salta("b1", "p", "s[0]")], conRif("character")), b1],
    ["unused_value", "solo_iniziale", undefined, nelProgramma([dato("a", "integer", { initial: "1" })]), primo],
    ["unused_value", "solo_assegnazione", undefined, nelProgramma([dato("a", "integer")], [assegna("b1", "a", "1")]), primo],
    ["unused_value", "solo_assegnazione", undefined, nelProgramma([dato("w", "integer", { size: 3 })], [assegna("b1", "w[0]", "1")]), primo],
    ["unused_value", "solo_lettura", undefined, nelProgramma([dato("a", "integer")], [leggiIn("b1", "a")]), primo],
    ["unused_value", "solo_per_ogni", undefined, nelProgramma([dato("a", "integer"), v], [perOgni("c1", "a", "v", [])]), primo],
    ["unused_value", "solo_parametro", undefined, nelProgramma([], [salta("b1", "p", "1")], conValore("integer")), { funzione: "f2", indice: 0 }],
  ];

  /** La causa letta nel posto della riga: la fermata del blocco, o quella della riga del dato. */
  function causaDi(r: Riga): { codice: string | undefined; fermata: unknown } {
    const [codice, , , progetto, dove] = r;
    const esito = esitoDi(progetto());
    if ("blocco" in dove) {
      const sulBlocco = [...esito.errori, ...esito.avvisi].find((x) => x.code === codice && x.block === dove.blocco);
      return { codice: sulBlocco?.code, fermata: esito.fermate.find((f) => f.code === codice && f.block === dove.blocco)?.fermata };
    }
    const delDato = esito.dati.find((d) => d.code === codice && d.funzione === dove.funzione && d.indice === dove.indice);
    return { codice: delDato?.code, fermata: delDato?.fermata };
  }

  for (const r of righe) {
    const [codice, causa, segno] = r;
    test(`${codice} → ${causa}${segno === undefined ? "" : ` «${segno}»`}`, () => {
      expect(causaDi(r)).toEqual({ codice, fermata: segno === undefined ? { causa } : { causa, segno } });
    });
  }

  test("ogni causa dei dodici codici ha una riga, e ogni riga una causa del nucleo", () => {
    const nove = ["limit_exceeded", "invalid_name", "invalid_data_item", "constant_loop_condition", "assign_to_read_only", "function_with_effect", "argument_mismatch", "reference_not_assignable", "unused_value", "unknown_record_field", "record_name_in_use", "invalid_record"];
    const delNucleo = nove.flatMap((c) => ((causeDeiCodici as Record<string, readonly string[]>)[c] ?? []).map((x) => `${c} ${x}`));
    const nelleRighe = [...new Set(righe.map(([c, x]) => `${c} ${x}`))];
    console.log(`cause dei dodici codici: nel nucleo ${delNucleo.length}, nelle righe ${nelleRighe.length}, righe ${righe.length}`);
    expect({ senzaRiga: delNucleo.filter((x) => !nelleRighe.includes(x)), senzaCausa: nelleRighe.filter((x) => !delNucleo.includes(x)), quante: delNucleo.length }).toEqual({ senzaRiga: [], senzaCausa: [], quante: 63 });
  });

  test("il valore mai letto con più provenienze: nessuna causa, resta l'elenco", () => {
    for (const p of [
      nelProgramma([dato("a", "integer", { initial: "1" })], [assegna("b1", "a", "2")]),
      nelProgramma([dato("a", "integer")], [assegna("b1", "a", "1"), leggiIn("b2", "a")]),
    ]) {
      const d = esitoDi(p()).dati.find((x) => x.code === "unused_value");
      expect(d && { code: d.code, fermata: d.fermata }).toEqual({ code: "unused_value", fermata: undefined });
    }
  });
});

prova("valori iniziali", () => {
  // Il meno davanti a un letterale intero o reale, anche negli elementi di un vettore.
  for (const d of [
    dato("a", "integer", { initial: "-7" }),
    dato("a", "real", { initial: "-2.5" }),
    dato("a", "real", { initial: "-3" }),
    dato("a", "real", { size: 2, initial: ["-1.5", "2"] }),
    dato("a", "integer", { size: 2, initial: { each: "-1" } }),
    dato("a", "character", { initial: "'è'" }),
    dato("a", "string", { initial: '"perché"' }),
    dato("a", "boolean", { initial: "false" }),
  ])
    expect({ d, errori: errori([d], []) }).toEqual({ d, errori: [] });
  expect(errori([dato("a", "integer", { initial: "-2147483648" })], [])).toEqual([e("literal_out_of_range", "f1")]);
  for (const d of [
    dato("a", "character", { initial: "-'x'" }),
    dato("a", "string", { initial: '-"x"' }),
    dato("a", "boolean", { initial: "-true" }),
    dato("a", "integer", { initial: "2.0" }),
    dato("a", "integer", { initial: "'a'" }),
    // Fra carattere e intero la conversione è sempre esplicita, anche nel valore iniziale.
    dato("a", "character", { initial: "65" }),
    dato("a", "boolean", { initial: "1" }),
    dato("a", "integer", { size: 2, initial: ["1", "2.5"] }),
  ])
    expect({ d, errori: errori([d], []) }).toEqual({ d, errori: [e("type_mismatch", "f1")] });
});

// Le procedure e le funzioni di prova: ogni progetto ne prende quelle che servono, coi blocchi da b10 in su.
const scambia = procedura("f2", "scambia", [par("a", "integer", "reference"), par("bb", "integer", "reference"), dato("t", "integer")], [assegna("b10", "t", "a"), assegna("b11", "a", "bb"), assegna("b12", "bb", "t")]);
const doppio = funzione("f3", "doppio", "integer", [par("k", "integer")], [], "k * 2");
const mostra = procedura("f4", "mostra", [par("q", "integer")], [scrivi("b13", "q")]);
const media = funzione("f5", "media", "real", [par("p", "real"), par("q", "real")], [], "(p + q) / 2");
const conta = procedura("f6", "conta", [par("w", "integer", "value", { size: 3 })], [scrivi("b14", "w[0]")]);
const azzera = procedura("f7", "azzera", [par("w", "integer", "reference", { size: 3 })], [assegna("b15", "w[0]", "0")]);
const saluta = procedura("f8", "saluta", [par("t", "string", "value", { max_length: 10 })], [scrivi("b16", "t")]);
const allunga = procedura("f9", "allunga", [par("t", "string", "reference")], [assegna("b17", "t", 't + "!"')]);
const piu = procedura("f10", "piu", [par("r", "real", "reference")], [assegna("b18", "r", "r + 1.0")]);
const incr = procedura("f11", "incr", [par("i", "integer", "reference")], [assegna("b19", "i", "i + 1")]);
const prendi = procedura("f12", "prendi", [par("ch", "character", "reference")], [assegna("b20", "ch", "'z'")]);
const tocca = procedura("f13", "tocca", [par("w", "integer", "reference", { size: 3 }), par("i", "integer", "reference")], [assegna("b21", "i", "w[0]")]);
const copiaECambia = procedura("f14", "copia_e_cambia", [par("a", "integer"), par("bb", "integer", "reference")], [assegna("b22", "bb", "a")]);
const leggiNumero = procedura("f15", "leggi_numero", [par("numero", "integer", "out")], [leggiIn("b23", "numero")]);

describe("errori statici della tappa 3: procedure, funzioni, chiamate", () => {
  prova("unknown_callee", () => {
    expect(erroriDi(tutti, [salta("b1", "nessuna")])).toEqual([e("unknown_callee", "b1")]);
    expect(erroriDi(tutti, [assegna("b2", "n", "nessuna(1)")])).toEqual([e("unknown_callee", "b2")]);
    // Un dato non si chiama, e le maiuscole contano.
    expect(erroriDi(tutti, [assegna("b3", "n", "n(1)")], doppio)).toEqual([e("unknown_callee", "b3")]);
    expect(erroriDi(tutti, [assegna("b4", "n", "Doppio(1)")], doppio)).toEqual([e("unknown_callee", "b4")]);
    // Controllo positivo: la funzione e la procedura che ci sono.
    expect(erroriDi(tutti, [assegna("b5", "n", "doppio(n)"), salta("b6", "mostra", "n")], doppio, mostra)).toEqual([]);
  });

  prova("function_as_statement", () => {
    expect(erroriDi(tutti, [salta("b1", "doppio", "1")], doppio)).toEqual([e("function_as_statement", "b1")]);
    // Anche dentro una funzione: lì è il caso più preciso, prima della regola della funzione senza effetti.
    const g = funzione("f20", "g", "integer", [], [salta("b30", "doppio", "1")], "0");
    expect(erroriDi(tutti, [], doppio, g)).toEqual([e("function_as_statement", "b30")]);
  });

  prova("procedure_in_expression", () => {
    expect(erroriDi(tutti, [assegna("b1", "n", "mostra(1)"), scrivi("b2", "mostra(1) + 1")], mostra)).toEqual([e("procedure_in_expression", "b1"), e("procedure_in_expression", "b2")]);
  });

  prova("argument_mismatch", () => {
    const w4 = dato("w4", "integer", { size: 4, initial: { each: "0" } });
    const corta = dato("corta", "string", { max_length: 10, initial: '""' });
    const nomi = dato("nomi", "string", { size: 2, initial: { each: '""' } });
    const dati = [...tutti, w4, corta, nomi];
    const tutte = [doppio, mostra, media, conta, azzera, saluta, allunga, piu];
    for (const corpo of [
      // Il numero.
      salta("b1", "mostra"),
      salta("b1", "mostra", "1", "2"),
      scrivi("b1", "doppio()"),
      scrivi("b1", "media(1)"),
      // Il tipo per valore: un intero non riceve una stringa né un reale, un reale non riceve un carattere.
      salta("b1", "mostra", "s"),
      salta("b1", "mostra", "x"),
      salta("b1", "mostra", "b"),
      scrivi("b1", "media(c, 1)"),
      salta("b1", "mostra", "v"),
      // La misura, con e senza riferimento: la dimensione di un vettore, la lunghezza massima di un dato stringa.
      salta("b1", "conta", "n"),
      salta("b1", "conta", "w4"),
      salta("b1", "azzera", "w4"),
      salta("b1", "saluta", "s"),
      salta("b1", "saluta", "nomi[0]"),
      salta("b1", "allunga", "corta"),
      // Per riferimento lo stesso tipo, senza conversioni; un elemento dove serve il vettore.
      salta("b1", "piu", "n"),
      salta("b1", "azzera", "v[0]"),
    ])
      expect({ corpo, errori: erroriDi(dati, [corpo], ...tutte) }).toEqual({ corpo, errori: [e("argument_mismatch", "b1")] });
    // Controllo positivo: un'espressione per valore, un intero in un reale, i vettori e le stringhe della misura giusta,
    // un testo scritto e una concatenazione in una stringa per valore, un elemento di un vettore di stringhe per
    // riferimento.
    const giuste = [
      salta("b1", "mostra", "n + 1"),
      scrivi("b2", "media(n, 2.5)"),
      salta("b3", "conta", "v"),
      salta("b4", "azzera", "v"),
      salta("b5", "saluta", "corta"),
      salta("b6", "saluta", '"Anna"'),
      salta("b7", "saluta", 's + "x"'),
      salta("b8", "allunga", "s"),
      salta("b9", "allunga", "nomi[1]"),
      salta("b24", "piu", "x"),
    ];
    expect(erroriDi(dati, giuste, ...tutte)).toEqual([]);
    // Un testo scritto più lungo della lunghezza massima del parametro: come in un'assegnazione.
    expect(erroriDi(dati, [salta("b1", "saluta", '"un nome lunghissimo"')], saluta)).toEqual([e("string_literal_too_long", "b1")]);
    // Il vettore restituito da una funzione per valore: la dimensione e il tipo del parametro, non un suo elemento; per
    // riferimento mai (`reference_not_assignable`).
    const vettoreDi = (id: string, nome: string, tipo: string, dimensione: number) =>
      funzione(id, nome, tipo, [dato("q", tipo, { size: dimensione, initial: { each: tipo === "real" ? "0.0" : "0" } })], [], "q", { return_size: dimensione });
    const restituiti = [vettoreDi("f20", "tre", "integer", 3), vettoreDi("f21", "quattro", "integer", 4), vettoreDi("f22", "reali", "real", 3)];
    for (const argomento of ["quattro()", "reali()", "tre()[0]"])
      expect({ argomento, errori: erroriDi(dati, [salta("b1", "conta", argomento)], conta, ...restituiti) }).toEqual({ argomento, errori: [e("argument_mismatch", "b1")] });
    expect(erroriDi(dati, [salta("b1", "conta", "tre()")], conta, ...restituiti)).toEqual([]);
    expect(erroriDi(dati, [salta("b1", "azzera", "tre()")], azzera, ...restituiti)).toEqual([e("reference_not_assignable", "b1")]);
  });

  prova("reference_not_assignable", () => {
    const kk = dato("K", "integer", { constant: true, initial: "1" });
    const dati = [...tutti, kk];
    // Un valore scritto, un calcolo, un dato fra parentesi (le parentesi non lasciano traccia nell'albero), una
    // chiamata, una costante, un carattere di una stringa.
    for (const corpo of [
      salta("b1", "incr", "1"),
      salta("b1", "incr", "n + 1"),
      salta("b1", "incr", "(n)"),
      salta("b1", "incr", " ( n ) "),
      salta("b1", "azzera", "(v)"),
      salta("b1", "incr", "(v)[0]"),
      salta("b1", "incr", "doppio(n)"),
      salta("b1", "incr", "K"),
      salta("b1", "prendi", "s[0]"),
    ])
      expect({ corpo, errori: erroriDi(dati, [corpo], incr, azzera, prendi, doppio) }).toEqual({ corpo, errori: [e("reference_not_assignable", "b1")] });
    // Il contatore e l'elemento di un ciclo dentro il loro ciclo.
    expect(erroriDi(dati, [per("b1", "n", [salta("b2", "incr", "n")])], incr)).toEqual([e("reference_not_assignable", "b2")]);
    expect(erroriDi(dati, [perOgni("b1", "c", "s", [salta("b2", "prendi", "c")])], prendi)).toEqual([e("reference_not_assignable", "b2")]);
    // Una costante comune, nemmeno lei.
    const p = leggi({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "prova" },
      shared_constants: [dato("Z", "integer", { constant: true, initial: "2" })],
      functions: [{ id: "f1", kind: "main", data: [], body: [salta("b1", "incr", "Z")], end: { id: "fine" } }, incr],
    });
    if (!p.ok) throw new Error("premessa");
    expect(esitoDi(p.progetto).errori as Segnalate).toEqual([e("reference_not_assignable", "b1")]);
    // Controllo positivo: un dato, un elemento con un indice calcolato (anche fra parentesi dentro l'indice), un vettore
    // intero, il contatore dopo il suo ciclo.
    expect(erroriDi(dati, [salta("b1", "incr", "n"), salta("b2", "incr", "v[0]"), salta("b3", "incr", "v[(n)]"), salta("b4", "azzera", "v"), per("b5", "n", []), salta("b6", "incr", "n")], incr, azzera)).toEqual([]);
  });

  prova("same_reference", () => {
    for (const corpo of [salta("b1", "scambia", "n", "n"), salta("b1", "scambia", "v[1]", "v[1]"), salta("b1", "tocca", "v", "v[0]")])
      expect({ corpo, errori: erroriDi(tutti, [corpo], scambia, tocca) }).toEqual({ corpo, errori: [e("same_reference", "b1")] });
    // Controllo positivo: due elementi diversi, due indici calcolati (li confronta l'interprete), due dati, e lo stesso
    // dato per valore e per riferimento (per valore arriva una copia).
    expect(erroriDi(tutti, [salta("b1", "scambia", "v[0]", "v[1]"), salta("b2", "scambia", "v[n]", "v[0]"), salta("b3", "scambia", "n", "v[0]"), salta("b4", "copia_e_cambia", "n", "n")], scambia, copiaECambia)).toEqual([]);
    // Un riferimento e un'uscita sono alias tutti e due: lo stesso dato ai due è lo stesso errore.
    const dueModi = procedura("f20", "due_modi", [par("a", "integer", "reference"), par("bb", "integer", "out")], [assegna("b30", "bb", "a")]);
    expect(erroriDi(tutti, [salta("b1", "due_modi", "n", "n")], dueModi)).toEqual([e("same_reference", "b1")]);
  });

  prova("reference_without_value", () => {
    const k = dato("k", "integer");
    const w = dato("w", "integer", { size: 3 });
    const nulla = procedura("f20", "nulla", [par("m", "integer", "out")], []);
    const metti = procedura("f21", "metti", [par("m", "integer", "out")], [assegna("b30", "m", "1")]);
    const se = (id: string, ramo: Json[]) => ({ id, kind: "if", condition: "n > 0", then: ramo, else: [] });
    const mentre = (id: string, corpo: Json[]) => ({ id, kind: "while", condition: "n > 0", body: corpo });
    // Sonde vere, dove è certo: un dato che non riceve mai un valore; un vettore di cui nessun elemento lo riceve; un dato
    // passato per uscita a una procedura che non gli dà mai un valore; un parametro per uscita passato a un riferimento
    // prima di avergli dato un valore; un salto che viene prima dell'unica assegnazione, fuori da un ciclo.
    const sonde: [string, Json[], Json[], Json[]][] = [
      ["mai", [k], [salta("b1", "incr", "k")], [incr]],
      ["vettore", [w], [salta("b1", "incr", "w[0]")], [incr]],
      ["uscita vuota", [k], [salta("b2", "nulla", "k"), salta("b1", "incr", "k")], [incr, nulla]],
      ["prima dell'assegnazione", [k], [salta("b1", "incr", "k"), assegna("b2", "k", "1")], [incr]],
    ];
    for (const [nome, dati, corpo, altre] of sonde) expect({ nome, errori: erroriDi(dati, corpo, ...altre) }).toEqual({ nome, errori: [e("reference_without_value", "b1")] });
    const passaPrima = procedura("f22", "passa_prima", [par("m", "integer", "out")], [salta("b31", "incr", "m"), assegna("b32", "m", "1")]);
    expect(erroriDi([], [], passaPrima, incr)).toEqual([e("reference_without_value", "b31")]);
    // Sonde false, dove non è certo o non è vero (nessun falso positivo): il valore su un ramo solo, da un giro prima del
    // ciclo, da un'uscita assegnata, da un elemento solo del vettore, dal valore iniziale, da un parametro per riferimento.
    const false_: [string, Json[], Json[], Json[]][] = [
      ["un ramo", [n, k], [se("b2", [assegna("b3", "k", "1")]), salta("b1", "incr", "k")], [incr]],
      ["il giro prima", [n, k], [mentre("b2", [salta("b1", "incr", "k"), assegna("b3", "k", "1")])], [incr]],
      ["l'uscita assegnata", [k], [salta("b2", "metti", "k"), salta("b1", "incr", "k")], [incr, metti]],
      ["un elemento", [w], [assegna("b2", "w[1]", "1"), salta("b1", "incr", "w[0]")], [incr]],
      ["il valore iniziale", [n], [salta("b1", "incr", "n")], [incr]],
    ];
    for (const [nome, dati, corpo, altre] of false_) expect({ nome, errori: erroriDi(dati, corpo, ...altre) }).toEqual({ nome, errori: [] });
    expect(erroriDi([], [], procedura("f22", "passa", [par("m", "integer", "reference")], [salta("b31", "incr", "m")]), incr)).toEqual([]);
    // Con un altro errore statico non si calcola (segue i percorsi, come il dato letto prima di avere un valore).
    expect(erroriDi([k], [salta("b1", "incr", "k"), scrivi("b2", "y")], incr)).toEqual([e("unknown_name", "b2")]);
  });

  test("un file scritto quando un riferimento poteva arrivare senza valore si apre, e dà l'errore con la correzione", () => {
    // Il riferimento della tappa 3 com'era scritto prima: `leggi_numero` col parametro per riferimento, `n` senza valore.
    const testo = readFileSync(fileURLToPath(new URL("../../casi/tappa-3/riferimento-media-voti-funzioni.algo", import.meta.url)), "utf8");
    const comPrima = testo.replace('"parameter": "out"', '"parameter": "reference"');
    expect(comPrima).not.toBe(testo);
    const aperto = apri(comPrima);
    if (!aperto.ok) throw new Error(`non si apre: ${JSON.stringify(aperto.errori)}`);
    const r = esitoDi(aperto.progetto);
    const leggiNumero = aperto.progetto.functions.find((f) => f.name === "leggi_numero")!;
    expect({ errori: r.errori as Segnalate, versoOut: r.versoOut, alSalto: r.senzaValoreAlSalto }).toEqual({
      errori: [e("reference_without_value", "b1")],
      versoOut: [{ funzione: leggiNumero.id, indice: 0 }],
      alSalto: [{ block: "b1", funzione: leggiNumero.id, indice: 0 }],
    });
  });

  test("il parametro che riceve il dato senza valore, salto per salto: quello giusto fra due, i due di un salto, nessuno senza l'errore", () => {
    const alSalto = (data: Json[], body: Json[], ...altre: Json[]) => esitoDi(conFunzioni(data, body, ...altre)).senzaValoreAlSalto.map((x) => `${x.block} ${x.funzione} ${x.indice}`);
    const due = procedura("f20", "p", [par("y", "integer"), dato("w", "integer"), par("a", "integer", "reference"), par("b", "integer", "reference")], [assegna("b30", "w", "1"), assegna("b31", "a", "y"), assegna("b32", "b", "y")]);
    const k = dato("k", "integer");
    const j = dato("j", "integer");
    // Sonde vere: il secondo dei due riferimenti (il primo ha un valore); tutti e due; due salti.
    expect(alSalto([k, dato("i", "integer", { initial: "1" })], [salta("b1", "p", "1", "i", "k")], due)).toEqual(["b1 f20 3"]);
    expect(alSalto([k, j], [salta("b1", "p", "1", "j", "k")], due)).toEqual(["b1 f20 2", "b1 f20 3"]);
    expect(alSalto([k, j, dato("i", "integer", { initial: "1" })], [salta("b1", "p", "1", "k", "i"), salta("b2", "p", "1", "i", "j")], due)).toEqual(["b1 f20 2", "b2 f20 3"]);
    // Sonde false: il dato ha un valore su una strada (l'errore lo dà l'interprete); nessun riferimento senza valore.
    const forse = [dato("c", "boolean", { initial: "true" })];
    expect(alSalto([k, j, ...forse], [{ id: "b5", kind: "if", condition: "c", then: [assegna("b6", "k", "1"), assegna("b7", "j", "1")], else: [] }, salta("b1", "p", "1", "j", "k")], due)).toEqual([]);
    expect(alSalto([dato("i", "integer", { initial: "1" }), dato("h", "integer", { initial: "2" })], [salta("b1", "p", "1", "i", "h")], due)).toEqual([]);
  });

  test("la correzione verso il passaggio per uscita non si offre a un riferimento che la procedura scrive su una strada sola, né a un vettore", () => {
    const versoOut = (...altre: Json[]) => esitoDi(conFunzioni(tutti, [], ...altre)).versoOut.map((x) => `${x.funzione} ${x.indice}`);
    const inUnRamo = [{ id: "b30", kind: "if", condition: "true", then: [assegna("b31", "m", "1")], else: [] }];
    const neiDueRami = [{ id: "b30", kind: "if", condition: "true", then: [assegna("b31", "m", "1")], else: [assegna("b32", "m", "2")] }];
    expect({
      inUnRamo: versoOut(procedura("f20", "p", [par("m", "integer", "reference")], inUnRamo)),
      neiDueRami: versoOut(procedura("f20", "p", [par("m", "integer", "reference")], neiDueRami)),
      unElemento: versoOut(procedura("f20", "p", [par("m", "integer", "reference", { size: 3 })], [assegna("b30", "m[0]", "1")])),
    }).toEqual({ inUnRamo: [], neiDueRami: ["f20 0"], unElemento: [] });
  });

  test("la correzione verso il passaggio per uscita si offre solo per un riferimento che la procedura non legge prima di dargli un valore", () => {
    const versoOut = (...altre: Json[]) => esitoDi(conFunzioni(tutti, [], ...altre)).versoOut.map((x) => `${x.funzione} ${x.indice}`);
    // Sonde vere: la procedura dà il valore senza leggerlo (anche leggendolo dalla console); il secondo di due parametri.
    expect(versoOut(procedura("f20", "p", [par("m", "integer", "reference")], [assegna("b30", "m", "1")]))).toEqual(["f20 0"]);
    expect(versoOut(procedura("f20", "p", [par("m", "integer", "reference")], [leggiIn("b30", "m"), scrivi("b31", "m")]))).toEqual(["f20 0"]);
    expect(versoOut(procedura("f20", "p", [par("y", "integer"), par("m", "integer", "reference")], [assegna("b30", "m", "y")]))).toEqual(["f20 1"]);
    // Sonde false: letto prima su una strada; passato a un altro riferimento prima; già per uscita; un parametro per
    // valore; una funzione.
    expect(versoOut(procedura("f20", "p", [par("m", "integer", "reference")], [{ id: "b30", kind: "if", condition: "true", then: [scrivi("b31", "m")], else: [] }, assegna("b32", "m", "1")]))).toEqual([]);
    expect(versoOut(procedura("f20", "p", [par("m", "integer", "reference")], [salta("b30", "incr", "m")]), incr)).toEqual([]);
    expect(versoOut(procedura("f20", "p", [par("m", "integer", "out")], [assegna("b30", "m", "1")]))).toEqual([]);
    expect(versoOut(procedura("f20", "p", [par("m", "integer")], [assegna("b30", "m", "1")]))).toEqual([]);
    // Con altri errori statici l'elenco è vuoto (la procedura non si percorre).
    const r = esitoDi(conFunzioni(tutti, [scrivi("b1", "y")], procedura("f20", "p", [par("m", "integer", "reference")], [assegna("b30", "m", "1")])));
    expect({ errori: r.errori as Segnalate, versoOut: r.versoOut }).toEqual({ errori: [e("unknown_name", "b1")], versoOut: [] });
  });

  prova("function_with_effect", () => {
    // Una funzione che legge, scrive o salta a una procedura: l'errore sul blocco.
    const legge = funzione("f20", "legge", "integer", [dato("y", "integer")], [leggiIn("b30", "y")], "y");
    const scrive = funzione("f20", "scrive", "integer", [par("y", "integer")], [scrivi("b30", "y")], "y");
    const saltaA = funzione("f20", "salta_a", "integer", [par("y", "integer")], [salta("b30", "mostra", "y")], "y");
    for (const g of [legge, scrive, saltaA]) expect({ g: g.name, errori: erroriDi(tutti, [], g, mostra) }).toEqual({ g: g.name, errori: [e("function_with_effect", "b30")] });
    // Anche dentro un ramo o un ciclo della funzione.
    const nelRamo = funzione("f20", "nel_ramo", "integer", [par("y", "integer")], [{ id: "b30", kind: "if", condition: "y > 0", then: [scrivi("b31", "y")], else: [] }], "y");
    expect(erroriDi(tutti, [], nelRamo)).toEqual([e("function_with_effect", "b31")]);
    // Un parametro per riferimento: un errore della vista dei dati, sulla funzione e sul dato.
    const cambia = funzione("f20", "cambia", "integer", [par("y", "integer", "reference")], [], "y");
    const r = esitoDi(conFunzioni(tutti, [], cambia));
    expect({ errori: r.errori as Segnalate, dati: r.dati.map((d) => `${d.genere} ${d.code} ${d.funzione} ${d.indice}`) }).toEqual({ errori: [e("function_with_effect", "f20")], dati: ["errore function_with_effect f20 0"] });
    // Così un parametro per uscita.
    expect(erroriDi(tutti, [], funzione("f20", "esce", "integer", [par("y", "integer", "out")], [], "1"))).toEqual([e("function_with_effect", "f20")]);
    // Controllo positivo: una funzione che chiama un'altra funzione, coi suoi dati di lavoro, assegnazioni e cicli; e
    // le procedure che leggono, scrivono e cambiano i dati ricevuti.
    const quadruplo = funzione("f20", "quadruplo", "integer", [par("y", "integer"), dato("z", "integer")], [assegna("b30", "z", "doppio(y)"), { id: "b31", kind: "while", condition: "z < 0", body: [assegna("b32", "z", "z + 1")] }], "doppio(z)");
    expect(erroriDi(tutti, [assegna("b1", "n", "quadruplo(n)"), salta("b2", "leggi_numero", "n"), salta("b3", "mostra", "n"), salta("b4", "incr", "n")], quadruplo, doppio, leggiNumero, mostra, incr)).toEqual([]);
  });

  prova("invalid_default_value", () => {
    const restituito: Record<string, string> = { integer: "0", real: "0.0", boolean: "false", character: "'a'" };
    for (const [valore, tipo] of [
      ["'a'", "integer"],
      ["1 + 1", "integer"],
      ["k", "integer"],
      ["2.5", "integer"],
      ["", "integer"],
      ["(", "integer"],
      ["true", "real"],
      ["0", "boolean"],
      ['"0"', "character"],
    ] as const) {
      const g = funzione("f2", "g", tipo, [], [], restituito[tipo]!, { default_result: valore });
      expect({ valore, tipo, errori: erroriDi([], [], g) }).toEqual({ valore, tipo, errori: [e("invalid_default_value", "f2")] });
    }
    // Controllo positivo: il meno davanti a un numero, un intero per un reale, e uno per tipo.
    for (const [valore, tipo] of [["-1", "integer"], ["2", "real"], ["-0.5", "real"], ["' '", "character"], ["false", "boolean"]] as const)
      expect({ valore, errori: erroriDi([], [], funzione("f2", "g", tipo, [], [], restituito[tipo]!, { default_result: valore })) }).toEqual({ valore, errori: [] });
    // Una stringa: un testo fra virgolette, non più lungo della lunghezza massima del risultato; un vettore: nessuno.
    const stringa = (valore: string, altro: Json = {}) => funzione("f2", "g", "string", [], [], '"a"', { default_result: valore, ...altro });
    expect(erroriDi([], [], stringa("5"))).toEqual([e("invalid_default_value", "f2")]);
    expect(erroriDi([], [], stringa('"abcd"', { return_max_length: 3 }))).toEqual([e("invalid_default_value", "f2")]);
    const k = dato("k", "integer", { size: 2, initial: { each: "0" } });
    expect(erroriDi([], [], funzione("f2", "g", "integer", [k], [], "k", { return_size: 2, default_result: "0" }))).toEqual([e("invalid_default_value", "f2")]);
    expect(erroriDi([], [], stringa('"ciao"'), funzione("f3", "h", "integer", [k], [], "k", { return_size: 2 }))).toEqual([]);
  });

  prova("function_name_in_use", () => {
    // Un'altra procedura o funzione col nome (la seconda), un dato del programma o di un'altra procedura, una costante
    // comune.
    expect(erroriDi([], [], procedura("f2", "p", [], []), funzione("f3", "p", "integer", [], [], "0"))).toEqual([e("function_name_in_use", "f3")]);
    expect(erroriDi([n], [scrivi("b1", "n")], procedura("f2", "n", [], []))).toEqual([e("function_name_in_use", "f2")]);
    expect(erroriDi([], [], procedura("f2", "p", [dato("q", "integer", { initial: "1" })], [scrivi("b10", "q")]), procedura("f3", "q", [], []))).toEqual([e("function_name_in_use", "f3")]);
    const conComune = leggi({
      format: "algodesign",
      schema_version: 2,
      metadata: { name: "prova" },
      shared_constants: [dato("Z", "integer", { constant: true, initial: "2" })],
      functions: [{ id: "f1", kind: "main", data: [], body: [scrivi("b1", "Z")], end: { id: "fine" } }, procedura("f2", "Z", [], [])],
    });
    if (!conComune.ok) throw new Error("premessa");
    expect(esitoDi(conComune.progetto).errori as Segnalate).toEqual([e("function_name_in_use", "f2")]);
    // Un parametro conta come un dato: il suo, e quello di un'altra procedura.
    expect(erroriDi([], [], procedura("f2", "k", [par("k", "integer")], []))).toEqual([e("function_name_in_use", "f2")]);
    expect(erroriDi([], [], procedura("f2", "p", [par("q", "integer")], []), procedura("f3", "q", [], []))).toEqual([e("function_name_in_use", "f3")]);
    // Controllo positivo: lo stesso nome di un dato in due funzioni è ammesso (ogni funzione ha i suoi dati).
    expect(erroriDi([dato("q", "integer", { initial: "1" })], [scrivi("b1", "q")], procedura("f2", "p", [dato("q", "integer", { initial: "1" })], [scrivi("b10", "q")]))).toEqual([]);
  });

  test("il nome di una procedura o di una funzione segue le regole dei nomi dei dati (invalid_name)", () => {
    for (const nome of ["1p", "_p", "while", "class", "lunghezza", "leggi_intero"])
      expect({ nome, errori: erroriDi([], [], procedura("f2", nome, [], [])) }).toEqual({ nome, errori: [e("invalid_name", "f2")] });
  });

  test("i parametri: solo in una procedura o in una funzione, senza valore iniziale, ruolo né natura di costante", () => {
    for (const d of [par("y", "integer", "value", { initial: "1" }), par("y", "integer", "reference", { role: "input" }), par("y", "integer", "value", { constant: true, initial: "1" })]) {
      const r = esitoDi(conFunzioni([], [], procedura("f2", "p", [d], [scrivi("b10", "y")])));
      expect({ d, errori: r.errori as Segnalate, dati: r.dati.map((x) => `${x.code} ${x.funzione} ${x.indice}`) }).toEqual({ d, errori: [e("invalid_data_item", "f2")], dati: ["invalid_data_item f2 0"] });
    }
    // Ogni funzione vede i suoi dati e le costanti comuni, non quelli di chi la chiama.
    expect(erroriDi([n], [scrivi("b1", "n")], procedura("f2", "p", [], [scrivi("b10", "n")]))).toEqual([e("unknown_name", "b10")]);
  });

  test("senza rif arriva una copia, che si cambia: la stringa e il vettore per valore non sono in sola lettura", () => {
    const p = procedura("f2", "p", [par("t", "string"), par("w", "integer", "value", { size: 3 })], [assegna("b10", "t", 't + "!"'), assegna("b11", "w[0]", "1"), leggiIn("b12", "t"), scrivi("b13", "t", "w[0]")]);
    expect(erroriDi(tutti, [salta("b1", "p", "s", "v")], p)).toEqual([]);
  });

  prova("implicit_conversion", () => {
    expect(avvisiDi(tutti, [scrivi("b1", "media(3, 4)")], media)).toEqual([e("implicit_conversion", "b1")]);
    expect(avvisiDi(tutti, [scrivi("b1", "media(n, x)")], media)).toEqual([e("implicit_conversion", "b1")]);
    // Il risultato intero di una funzione reale.
    const realeDi = funzione("f2", "reale_di", "real", [par("y", "integer")], [], "y");
    expect(avvisiDi(tutti, [scrivi("b1", "reale_di(n)")], realeDi)).toEqual([e("implicit_conversion", "fine-f2")]);
    // Un intero che viene da una divisione intera ha l'avviso suo, non tutti e due.
    expect(avvisiDi(tutti, [scrivi("b1", "media(7 / 2, 1.0)")], media)).toEqual([e("integer_division_to_real", "b1")]);
    // Controllo positivo: la conversione scritta, un reale; e fuori dalle chiamate un intero in un reale non avvisa.
    expect(avvisiDi(tutti, [scrivi("b1", "media(3.0, to_real n)"), assegna("b2", "x", "n")], media)).toEqual([]);
  });
});

describe("i dati di ogni funzione e gli avvisi attraverso le chiamate", () => {
  /** Gli avvisi del dato letto prima di avere un valore, come `blocco funzione nome`. */
  const senzaValoreDi = (data: Json[], body: Json[], ...altre: Json[]) => {
    const p = conFunzioni(data, body, ...altre);
    const r = esitoDi(p);
    if (r.errori.length > 0) throw new Error(`il dato senza valore di un progetto con errori: ${JSON.stringify(r.errori)}`);
    const coiDati = r.primaDelValore.map((x) => `${x.block} ${x.funzione} ${p.functions.find((f) => f.id === x.funzione)!.data[x.indice]!.name}`);
    expect([...new Set(coiDati.map((d) => d.split(" ")[0]))]).toEqual(r.avvisi.filter((a) => a.code === "maybe_uninitialized").map((a) => a.block));
    return coiDati;
  };
  const k = dato("k", "integer");

  test("il dato letto prima di avere un valore, in una funzione e attraverso un parametro per riferimento o per uscita", () => {
    const usaPrima = procedura("f3", "usa_prima", [par("m", "integer", "reference")], [assegna("b30", "m", "m + 1")]);
    const forse = procedura("f4", "forse", [par("m", "integer", "out"), par("dai", "boolean")], [{ id: "b31", kind: "if", condition: "dai", then: [assegna("b32", "m", "1")], else: [] }]);
    const forseDa = (id: string) => ({ id, kind: "if", condition: "true", then: [assegna(`${id}0`, "k", "1")], else: [] });
    // Sonde vere: il riferimento si legge al salto (il dato ha un valore su una strada sola); il parametro per uscita a cui
    // la procedura dà un valore su una strada sola (anche quando il dato di chi chiama ne aveva uno: lo perde); quello
    // che la procedura legge prima di dargli un valore; un dato di lavoro senza valore; il valore restituito.
    expect(senzaValoreDi([k], [forseDa("b5"), salta("b1", "usa_prima", "k")], usaPrima)).toEqual(["b1 f1 k"]);
    expect(senzaValoreDi([k], [salta("b1", "forse", "k", "true"), scrivi("b2", "k")], forse)).toEqual(["b2 f1 k"]);
    expect(senzaValoreDi([dato("k", "integer", { initial: "1" })], [salta("b1", "forse", "k", "true"), scrivi("b2", "k")], forse)).toEqual(["b2 f1 k"]);
    expect(senzaValoreDi([k], [salta("b1", "scrive_prima", "k")], procedura("f7", "scrive_prima", [par("m", "integer", "out")], [scrivi("b34", "m"), assegna("b35", "m", "1")]))).toEqual(["b34 f7 m"]);
    expect(senzaValoreDi([], [], procedura("f5", "p", [dato("z", "integer")], [scrivi("b33", "z")]))).toEqual(["b33 f5 z"]);
    expect(senzaValoreDi([], [], funzione("f6", "g", "integer", [dato("z", "integer")], [], "z"))).toEqual(["fine-f6 f6 z"]);
    // Sonde false: la procedura che legge il dato dalla console gliene dà uno; il riferimento ha un valore dopo il salto;
    // un parametro per valore o per riferimento ha il valore della chiamata; un elemento passato per uscita non toglie il
    // valore al vettore.
    expect(senzaValoreDi([k], [salta("b1", "leggi_numero", "k"), scrivi("b2", "k")], leggiNumero)).toEqual([]);
    expect(senzaValoreDi([k], [assegna("b5", "k", "1"), salta("b1", "usa_prima", "k"), scrivi("b2", "k")], usaPrima)).toEqual([]);
    expect(senzaValoreDi([], [], procedura("f5", "p", [par("y", "integer"), par("m", "integer", "reference")], [scrivi("b33", "y", "m")]))).toEqual([]);
    expect(senzaValoreDi([v], [salta("b1", "forse", "v[0]", "false"), scrivi("b2", "v[1]")], forse)).toEqual([]);
  });

  test("i ruoli attraverso le chiamate: letto da una procedura per riferimento, mostrato da una procedura", () => {
    const nIn = dato("n", "integer", { role: "input" });
    const chiedi = procedura("f16", "chiedi", [par("a", "integer", "out")], [salta("b40", "leggi_numero", "a")]);
    expect(avvisiDi([nIn], [salta("b1", "leggi_numero", "n")], leggiNumero)).toEqual([]);
    expect(avvisiDi([nIn], [salta("b1", "chiedi", "n")], chiedi, leggiNumero)).toEqual([]);
    const oOut = dato("o", "integer", { role: "output", initial: "1" });
    expect(avvisiDi([oOut], [salta("b1", "mostra", "o + 1")], mostra)).toEqual([]);
    // Controllo positivo: una procedura che dà un valore senza leggerlo, e una che non mostra il parametro.
    const metti = procedura("f17", "metti", [par("i", "integer", "out")], [assegna("b41", "i", "1")]);
    expect(avvisiDi([nIn], [salta("b1", "metti", "n")], metti)).toEqual([e("input_never_read", "f1")]);
    // (e il vettore che la procedura mostra è mostrato da chi la chiama: senza ruolo, mentre il progetto ne usa)
    expect(avvisiDi([oOut, v], [salta("b1", "conta", "v"), assegna("b2", "o", "o + 1")], conta)).toEqual([e("output_never_written", "f1"), e("missing_role", "f1")]);
    // Un parametro non ha ruolo: nessun avviso del ruolo mancante, anche in una procedura che usa i ruoli.
    const conRuoli = procedura("f2", "p", [par("numero", "integer", "out"), dato("w", "integer", { role: "output", initial: "1" })], [leggiIn("b10", "numero"), scrivi("b11", "w")]);
    expect(avvisiDi([n], [salta("b1", "p", "n")], conRuoli)).toEqual([]);
  });

  test("il dato inutile: un parametro per valore mai letto, uno per riferimento mai nominato", () => {
    const inutiliDi = (...altre: Json[]) =>
      esitoDi(conFunzioni([], [], ...altre))
        .dati.filter((d) => inutili.has(d.code))
        .map((d) => `${d.code} ${d.funzione} ${d.indice}`);
    expect(inutiliDi(procedura("f2", "p", [par("y", "integer")], [scrivi("b10", '"x"')]))).toEqual(["unused_value f2 0"]);
    expect(inutiliDi(procedura("f2", "p", [par("y", "integer", "reference")], []))).toEqual(["unused_data f2 0"]);
    // Sonde false: un parametro per riferimento che riceve solo un valore lo dà a chi chiama; uno letto.
    expect(inutiliDi(procedura("f2", "p", [par("y", "integer", "reference")], [assegna("b10", "y", "1")]))).toEqual([]);
    expect(inutiliDi(procedura("f2", "p", [par("y", "integer")], [scrivi("b10", "y")]))).toEqual([]);
  });
});

describe("avvisi delle tappe 1 e 2", () => {
  prova("integer_division_to_real", () => {
    expect(avvisi(tutti, [assegna("b1", "x", "7 / 2")])).toEqual([e("integer_division_to_real", "b1")]);
    expect(avvisi(tutti, [assegna("b2", "x", "n / 2 + 0.5")])).toEqual([e("integer_division_to_real", "b2")]);
    expect(avvisi(tutti, [assegna("b3", "x", "(n / 2) * 3")])).toEqual([e("integer_division_to_real", "b3")]);
    expect(avvisi(tutti, [scrivi("b4", "square_root (n / 2)")])).toEqual([e("integer_division_to_real", "b4")]);
    expect(avvisi(tutti, [scrivi("b5", "n / 2 < 1.5")])).toEqual([e("integer_division_to_real", "b5")]);
    // Senza avviso: il quoziente resta intero, o la conversione è scritta, o la divisione è fra reali.
    expect(avvisi(tutti, [assegna("b6", "n", "7 / 2"), assegna("b7", "x", "to_real (7 / 2)"), assegna("b8", "x", "to_real 7 / 2")])).toEqual([]);
    // Un confronto fra interi non converte nulla in reale, anche con una divisione intera.
    expect(avvisi(tutti, [scrivi("b9", "n < 7 / 2"), scrivi("b10", "n / 2 == 3")])).toEqual([]);
  });

  prova("real_equality", () => {
    expect(avvisi(tutti, [scrivi("b1", "x == 0.3")])).toEqual([e("real_equality", "b1")]);
    expect(avvisi(tutti, [scrivi("b2", "n != x")])).toEqual([e("real_equality", "b2")]);
    expect(avvisi(tutti, [scrivi("b3", "x < 0.3", "n == 3")])).toEqual([]);
  });

  prova("useless_conversion", () => {
    expect(avvisi(tutti, [scrivi("b1", "to_integer n", "to_real x", "to_character c")])).toEqual([e("useless_conversion", "b1")]);
    expect(avvisi(tutti, [scrivi("b2", "to_integer x", "to_real n", "to_character n", "to_integer c")])).toEqual([]);
  });

  prova("constant_loop_condition", () => {
    const mentre = { id: "b1", kind: "while", condition: "true", body: [] };
    const ripeti = { id: "b2", kind: "repeat", body: [], condition: "false" };
    expect(avvisi(tutti, [mentre, ripeti])).toEqual([e("constant_loop_condition", "b1"), e("constant_loop_condition", "b2")]);
    // Un `se` costante non è un ciclo; una condizione calcolata non è un letterale.
    expect(avvisi(tutti, [{ id: "b3", kind: "if", condition: "true", then: [], else: [] }, { id: "b4", kind: "while", condition: "not b", body: [] }])).toEqual([]);
  });

  prova("input_never_read", () => {
    const a = dato("a", "integer", { role: "input" });
    expect(avvisi([a], [scrivi("b1", "1")])).toEqual([e("input_never_read", "f1")]);
    expect(avvisi([a], [leggiIn("b1", "a")])).toEqual([]);
    const w = dato("w", "integer", { size: 2, role: "input_output" });
    expect(avvisi([w], [leggiIn("b1", "w[0]"), scrivi("b2", "w[1]")])).toEqual([]);
  });

  prova("output_never_written", () => {
    const a = dato("a", "integer", { role: "output", initial: "1" });
    expect(avvisi([a], [])).toEqual([e("output_never_written", "f1")]);
    expect(avvisi([a], [scrivi("b1", "a + 1")])).toEqual([]);
    expect(avvisi([dato("a", "integer", { role: "input_output" })], [leggiIn("b1", "a")])).toEqual([e("output_never_written", "f1")]);
  });

  prova("missing_role", () => {
    const a = dato("a", "integer", { role: "input" });
    expect(avvisi([a, n], [leggiIn("b1", "a"), leggiIn("b2", "n")])).toEqual([e("missing_role", "f1")]);
    expect(avvisi([a, n], [leggiIn("b1", "a"), scrivi("b2", "n")])).toEqual([e("missing_role", "f1")]);
    // Solo se il progetto usa i ruoli; una costante non ha ruolo; un dato di lavoro solo assegnato no.
    expect(avvisi([n], [leggiIn("b1", "n"), scrivi("b2", "n")])).toEqual([]);
    const k = dato("k", "integer", { constant: true, initial: "1" });
    expect(avvisi([a, k, n], [leggiIn("b1", "a"), assegna("b2", "n", "a"), scrivi("b3", "k")])).toEqual([]);
    // Un dato usato solo dentro l'indice di una scrittura dice quale elemento mostrare, non è mostrato: nessun ruolo
    // gli manca. Controllo positivo: lo stesso dato scritto anche fuori dall'indice.
    const w = dato("w", "integer", { size: 2, role: "output", initial: { each: "0" } });
    expect(avvisi([w, n], [scrivi("b1", "w[n]", "w[n + 1] * 2", "-w[n]", "to_real(w[n])")])).toEqual([]);
    expect(avvisi([w, n], [scrivi("b1", "w[n] + n")])).toEqual([e("missing_role", "f1")]);
    expect(avvisi([w, n], [scrivi("b1", "w[0]", "-n")])).toEqual([e("missing_role", "f1")]);
  });

  // Il dato inutile: sonde vere e false, nei dati del programma e nelle costanti comuni; contano tutti gli avvisi.
  prova("unused_data", () => {
    const solo = (data: Json[], body: Json[], comuni?: Json[]) => tuttiGliAvvisi(data, body, comuni).filter((a) => inutili.has(a.code));
    expect(solo([dato("k", "integer")], [])).toEqual([e("unused_data", "f1")]);
    expect(solo([dato("k", "integer"), dato("j", "integer", { size: 2 })], [scrivi("b1", "1")])).toEqual([e("unused_data", "f1")]);
    // Sonde false: un dato che riceve un valore o che si legge non è «mai usato».
    expect(solo([dato("k", "integer")], [leggiIn("b1", "k"), scrivi("b2", "k")])).toEqual([]);
    expect(solo([dato("k", "integer", { initial: "1" })], [scrivi("b1", "k")])).toEqual([]);
  });

  prova("unused_value", () => {
    const solo = (data: Json[], body: Json[], comuni?: Json[]) => esito(data, body, comuni).dati.filter((d) => inutili.has(d.code)).map((d) => `${d.code} ${d.comune ? "comune" : "dato"} ${d.indice}`);
    // Il valore iniziale, un'assegnazione, una lettura, l'elemento di un vettore, l'elemento di un `per ogni` mai letto.
    const k = dato("k", "integer");
    expect(solo([dato("k", "integer", { initial: "1" })], [])).toEqual(["unused_value dato 0"]);
    expect(solo([k], [assegna("b1", "k", "1")])).toEqual(["unused_value dato 0"]);
    expect(solo([k], [leggiIn("b1", "k")])).toEqual(["unused_value dato 0"]);
    expect(solo([dato("w", "integer", { size: 2 })], [assegna("b1", "w[0]", "1")])).toEqual(["unused_value dato 0"]);
    expect(solo([s, c], [perOgni("b1", "c", "s", [scrivi("b2", "1")])])).toEqual(["unused_value dato 1"]);
    // Una costante comune: mai letta, il suo valore iniziale è un valore che nessuno legge.
    expect(solo([], [], [dato("K", "integer", { constant: true, initial: "1" })])).toEqual(["unused_value comune 0"]);
    expect(tuttiGliAvvisi([], [], [dato("K", "integer", { constant: true, initial: "1" })])).toEqual([e("unused_value", "")]);
    // Sonde false: letto in una scrittura, in una condizione, in un indice, come inizio, fine o sorgente di un ciclo;
    // il contatore di un `per`, che il ciclo legge da sé anche se il corpo non lo nomina.
    expect(solo([n], [scrivi("b1", "n")])).toEqual([]);
    expect(solo([n], [{ id: "b1", kind: "if", condition: "n > 0", then: [], else: [] }])).toEqual([]);
    expect(solo([n, v], [assegna("b1", "v[n]", "1"), scrivi("b2", "v[0]")])).toEqual([]);
    expect(solo([n, dato("i", "integer")], [per("b1", "i", [scrivi("b2", '"*"')], { to: "n" })])).toEqual([]);
    expect(solo([s, c], [perOgni("b1", "c", "s", [scrivi("b2", "c")])])).toEqual([]);
    // Con un errore statico non si calcolano, come gli avvisi dei ruoli.
    expect(esito([k], [scrivi("b1", "y")]).dati).toEqual([]);
  });

  test("con un errore statico gli avvisi dei ruoli non si calcolano; quelli del blocco restano", () => {
    const o = dato("o", "integer", { role: "output" });
    // `y` ferma la scrittura prima di `o`: senza la regola, `o` risulterebbe mai scritto.
    expect(entrambi([o], [scrivi("b1", "y", "o")])).toEqual({ errori: [e("unknown_name", "b1")], avvisi: [] });
    const w = dato("w", "integer", { role: "input", size: 2 });
    expect(entrambi([w], [leggiIn("b1", "w[c]")])).toEqual({ errori: [e("unknown_name", "b1")], avvisi: [] });
    // Un avviso del suo blocco resta, anche con un errore altrove.
    expect(entrambi([o, x], [scrivi("b1", "y"), scrivi("b2", "x == 0.5", "o")])).toEqual({
      errori: [e("unknown_name", "b1")],
      avvisi: [e("real_equality", "b2")],
    });
    // Controllo positivo: senza l'errore, l'avviso del ruolo c'è.
    expect(entrambi([o], [scrivi("b1", "1")])).toEqual({ errori: [], avvisi: [e("output_never_written", "f1")] });
  });

  test("un errore della vista dei dati e un dato di input mai letto: nessun avviso dei ruoli", () => {
    const a = dato("a", "integer", { role: "input" });
    expect(entrambi([a, dato("1x", "integer")], [scrivi("b1", "1")])).toEqual({ errori: [e("invalid_name", "f1")], avvisi: [] });
    // Controllo positivo: senza il dato sbagliato l'avviso c'è.
    expect(entrambi([a], [scrivi("b1", "1")])).toEqual({ errori: [], avvisi: [e("input_never_read", "f1")] });
  });

  test("nel blocco con l'errore resta l'avviso incontrato prima del punto dell'errore, non quello dopo", () => {
    // Prima `x == 0.5` (real_equality), poi `y` (sconosciuto: il blocco si abbandona), poi `to_integer n`.
    expect(entrambi(tutti, [scrivi("b1", "x == 0.5", "y", "to_integer n")])).toEqual({ errori: [e("unknown_name", "b1")], avvisi: [e("real_equality", "b1")] });
    // Controllo positivo: senza l'errore ci sono tutti e due.
    expect(entrambi(tutti, [scrivi("b1", "x == 0.5", "to_integer n")])).toEqual({ errori: [], avvisi: [e("real_equality", "b1"), e("useless_conversion", "b1")] });
  });

  // Il dato letto prima di avere un valore: basta UN percorso dall'inizio alla lettura su cui nessuna azione gli dà
  // un valore. L'avviso è del blocco che legge; a parte (`primaDelValore`) il dato, per la sua posizione.
  const k = dato("k", "integer");
  const w = dato("w", "integer", { size: 3 });
  const cond = dato("cond", "boolean", { initial: "true" });
  const se = (id: string, allora: Json[], altrimenti: Json[]) => ({ id, kind: "if", condition: "cond", then: allora, else: altrimenti });
  const mentre = (id: string, condition: string, body: Json[]) => ({ id, kind: "while", condition, body });
  const ripeti = (id: string, body: Json[], condition: string) => ({ id, kind: "repeat", body, condition });
  /** Gli avvisi del dato letto prima di avere un valore, col nome del dato: `blocco nome`. */
  const senzaValore = (data: Json[], body: Json[]) => {
    const r = esito(data, body);
    const delCodice = r.avvisi.filter((a) => a.code === "maybe_uninitialized").map((a) => a.block);
    const coiDati = r.primaDelValore.map((p) => `${p.block} ${data[p.indice].name}`);
    // Ogni blocco dell'avviso ha almeno un dato, e ogni dato è di un blocco dell'avviso.
    expect([...new Set(coiDati.map((d) => d.split(" ")[0]))]).toEqual(delCodice);
    return coiDati;
  };

  prova("maybe_uninitialized", () => {
    // Sonde vere: la lettura senza nessun valore, un ramo solo che assegna, il ciclo che assegna solo dentro (può non
    // fare nemmeno un giro), un vettore mai scritto, la condizione di un «mentre».
    expect(senzaValore([k], [scrivi("b1", "k + 1")])).toEqual(["b1 k"]);
    expect(senzaValore([k, cond], [se("b1", [assegna("b2", "k", "1")], []), scrivi("b3", "k")])).toEqual(["b3 k"]);
    expect(senzaValore([k, cond], [se("b1", [], [assegna("b2", "k", "1")]), scrivi("b3", "k")])).toEqual(["b3 k"]);
    expect(senzaValore([k, cond], [mentre("b1", "cond", [assegna("b2", "k", "1")]), scrivi("b3", "k")])).toEqual(["b3 k"]);
    expect(senzaValore([w], [scrivi("b1", "w[0]")])).toEqual(["b1 w"]);
    expect(senzaValore([k], [mentre("b1", "k < 3", [])])).toEqual(["b1 k"]);
    // L'indice della destinazione si legge; un dato che si assegna a sé stesso si legge prima.
    expect(senzaValore([k, w], [assegna("b1", "w[k]", "1")])).toEqual(["b1 k"]);
    expect(senzaValore([k], [assegna("b1", "k", "k + 1")])).toEqual(["b1 k"]);
    // Due dati nello stesso blocco: un avviso del blocco, due dati nell'ordine della lettura.
    expect(senzaValore([k, n, dato("j", "integer")], [scrivi("b1", "j + k")])).toEqual(["b1 j", "b1 k"]);
    // Lo stesso dato letto due volte nello stesso blocco: una volta.
    expect(senzaValore([k], [scrivi("b1", "k", "k * 2")])).toEqual(["b1 k"]);

    // Sonde false: la lettura dopo l'assegnazione o dopo una lettura dalla console; i due rami del «se» che assegnano;
    // il ciclo dopo l'assegnazione; il «ripeti», che fa almeno un giro e legge la condizione dopo il corpo; l'elemento
    // scritto, che conta come valore del vettore; il valore iniziale; una costante; una costante comune.
    expect(senzaValore([k], [assegna("b1", "k", "1"), scrivi("b2", "k")])).toEqual([]);
    expect(senzaValore([k], [leggiIn("b1", "k"), scrivi("b2", "k")])).toEqual([]);
    expect(senzaValore([k, cond], [se("b1", [assegna("b2", "k", "1")], [assegna("b3", "k", "2")]), scrivi("b4", "k")])).toEqual([]);
    expect(senzaValore([k], [assegna("b1", "k", "0"), mentre("b2", "k < 3", [assegna("b3", "k", "k + 1")]), scrivi("b4", "k")])).toEqual([]);
    expect(senzaValore([k], [ripeti("b1", [assegna("b2", "k", "1")], "k > 0"), scrivi("b3", "k")])).toEqual([]);
    expect(senzaValore([w], [assegna("b1", "w[0]", "1"), scrivi("b2", "w[1]")])).toEqual([]);
    expect(senzaValore([w], [leggiIn("b1", "w[0]"), scrivi("b2", "w[1]")])).toEqual([]);
    expect(senzaValore([dato("k", "integer", { initial: "1" })], [scrivi("b1", "k")])).toEqual([]);
    expect(senzaValore([dato("K", "integer", { constant: true, initial: "1" })], [scrivi("b1", "K")])).toEqual([]);
    const conComune = esito([], [scrivi("b1", "Z")], [dato("Z", "integer", { constant: true, initial: "2" })]);
    expect({ avvisi: conComune.avvisi, primaDelValore: conComune.primaDelValore }).toEqual({ avvisi: [], primaDelValore: [] });
    // Un ramo che assegna dentro un ciclo che assegna prima: nessun percorso senza valore.
    expect(senzaValore([k, cond], [assegna("b1", "k", "0"), mentre("b2", "cond", [se("b3", [], [assegna("b4", "k", "1")])]), scrivi("b5", "k")])).toEqual([]);

    // I cicli della tappa 2. Sonde vere: l'inizio si legge prima che il contatore abbia un valore; l'elemento di un
    // «per ogni», che non ha giri, dopo il ciclo; un dato assegnato solo nel corpo di un «per», dopo; la sorgente.
    const t = dato("t", "string");
    const ch = dato("ch", "character");
    expect(senzaValore([k], [per("b1", "k", [], { from: "k + 1" })])).toEqual(["b1 k"]);
    expect(senzaValore([s, ch], [perOgni("b1", "ch", "s", []), scrivi("b2", "ch")])).toEqual(["b2 ch"]);
    expect(senzaValore([n, k], [per("b1", "n", [assegna("b2", "k", "1")]), scrivi("b3", "k")])).toEqual(["b3 k"]);
    expect(senzaValore([t, ch], [perOgni("b1", "ch", "t", [])])).toEqual(["b1 t"]);
    // Sonde false: la fine si legge dopo che il contatore ha il suo valore; il contatore dopo il ciclo; l'elemento nel
    // corpo.
    expect(senzaValore([k], [per("b1", "k", [], { to: "k + 1" }), scrivi("b2", "k")])).toEqual([]);
    expect(senzaValore([s, ch], [perOgni("b1", "ch", "s", [scrivi("b2", "ch")])])).toEqual([]);
  });

  test("il dato letto prima di avere un valore: con un errore statico non si calcola, come gli avvisi dei ruoli", () => {
    const r = esito([k], [scrivi("b1", "y"), scrivi("b2", "k")]);
    expect({ errori: r.errori as Segnalate, avvisi: r.avvisi as Segnalate, primaDelValore: r.primaDelValore }).toEqual({ errori: [e("unknown_name", "b1")], avvisi: [], primaDelValore: [] });
    // Controllo positivo: senza l'errore l'avviso c'è.
    expect(senzaValore([k], [scrivi("b1", "1"), scrivi("b2", "k")])).toEqual(["b2 k"]);
  });
});

test("il dato letto prima di avere un valore, sul corpus: i 5 casi scritti per l'errore dell'interprete, i 2 elementi letti dopo un per ogni, i 4 dei parametri per riferimento e per uscita e il record per riferimento, nessun altro", () => {
  const cartella = fileURLToPath(new URL("../../casi", import.meta.url));
  const trovati: string[] = [];
  let [file, controllati] = [0, 0];
  // In ordine di nome: `readdirSync` dà l'ordine del file system, alfabetico su NTFS e no su ext4.
  for (const tappa of readdirSync(cartella, { withFileTypes: true }).filter((d) => d.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1)))
    for (const nome of readdirSync(join(cartella, tappa.name)).filter((f) => f.endsWith(".algo")).sort()) {
      file++;
      const aperto = apri(readFileSync(join(cartella, tappa.name, nome), "utf8"));
      if (!aperto.ok) throw new Error(`${nome} non si apre`);
      const r = controlla(aperto.progetto, tetti);
      if (r.fuoriTappa) continue;
      controllati++;
      for (const p of r.primaDelValore) trovati.push(`${tappa.name}/${nome} ${p.block} ${aperto.progetto.functions.find((f) => f.id === p.funzione)!.data[p.indice]!.name}`);
    }
  console.log(`dato letto prima di avere un valore, sul corpus: ${trovati.length} su ${file} file (${controllati} controllati)`);
  // L'atteso scritto a mano prima del codice: il dato e il blocco che lo legge.
  expect(trovati).toEqual([
    "tappa-1/senza-valore-booleano.algo b1 p",
    "tappa-1/senza-valore-carattere.algo b1 c",
    "tappa-1/senza-valore-intero.algo b1 x",
    "tappa-1/senza-valore-reale.algo b1 x",
    "tappa-1/senza-valore-stringa.algo b1 s",
    "tappa-2/per-ogni-elemento-cambiato.algo b4 x",
    "tappa-2/per-ogni-stringa-cambiata.algo b4 c",
    "tappa-3/riferimento-senza-valore-in-esecuzione.algo b4 n",
    "tappa-3/uscita-con-valore-prima.algo b4 x",
    "tappa-3/uscita-letta-prima.algo b4 x",
    "tappa-3/uscita-non-assegnata.algo b2 n",
    "tipi/riferimento-a-un-record-senza-valore.algo b4 c",
  ]);
  // Col corpus dei record: nessuno è fuori tappa; quello del riferimento senza valore ha l'avviso, i cinque sbagliati no.
  expect([file, controllati]).toEqual([158, 158]);
});

test("i limiti sono un parametro senza predefinito: chi chiama il controllo li passa sempre", () => {
  // Un parametro con un predefinito non si conta nella lunghezza della funzione.
  expect(controlla.length).toBe(2);
});

test("la ricorsione, diretta o attraverso altre funzioni: il controllo la accetta; le funzioni del giro e i giri da dire all'utente", () => {
  // Una funzione che chiama sé stessa nel valore restituito; due procedure che si chiamano a vicenda, e una terza che
  // ne chiama una senza far parte del giro.
  const giu = funzione("f2", "giu", "integer", [par("k", "integer")], [], "giu(k)");
  const diretta = conFunzioni([dato("r", "integer")], [assegna("b1", "r", "giu(1)"), scrivi("b9", "r")], giu);
  expect(controlla(diretta, tetti)).toMatchObject({ fuoriTappa: false, errori: [] });
  const ids = (giri: readonly (readonly { id: string }[])[]) => giri.map((g) => g.map((f) => f.id));
  expect([ids(giriDellaRicorsione(diretta)), [...funzioniDelGiro(diretta)].map((f) => f.id)]).toEqual([[["f2"]], ["f2"]]);
  const a = procedura("f2", "a", [], [salta("b2", "b")]);
  const bb = procedura("f3", "bb", [], []);
  const b2 = procedura("f4", "b", [], [salta("b3", "a")]);
  const fuori = procedura("f5", "fuori", [], [salta("b4", "a"), salta("b5", "bb")]);
  const indiretta = conFunzioni([], [salta("b1", "fuori")], a, bb, b2, fuori);
  expect(controlla(indiretta, tetti)).toMatchObject({ fuoriTappa: false, errori: [] });
  expect([ids(giriDellaRicorsione(indiretta)), [...funzioniDelGiro(indiretta)].map((f) => f.id)]).toEqual([[["f2", "f4"]], ["f2", "f4"]]);
  // Controllo positivo: le stesse chiamate senza il ritorno da b ad a non sono un giro.
  const b2senza = procedura("f4", "b", [], []);
  const senza = conFunzioni([], [salta("b1", "fuori")], a, bb, b2senza, fuori);
  expect([giriDellaRicorsione(senza), funzioniDelGiro(senza).size]).toEqual([[], 0]);
  // Anche fra procedure che il programma non chiama.
  expect(ids(giriDellaRicorsione(conFunzioni([], [], a, b2)))).toEqual([["f2", "f4"]]);
  // Tre procedure in giro, e la seconda che chiama anche sé stessa: il giro più corto dalla prima le nomina tutte.
  const p = procedura("f2", "p", [], [salta("b2", "q")]);
  const q = procedura("f3", "q", [], [salta("b3", "r"), salta("b4", "q")]);
  const r = procedura("f4", "r", [], [salta("b5", "p")]);
  expect(ids(giriDellaRicorsione(conFunzioni([], [salta("b1", "p")], p, q, r)))).toEqual([["f2", "f3", "f4"]]);
  // Due giri separati, ognuno col suo.
  expect(ids(giriDellaRicorsione(conFunzioni([], [], a, b2, procedura("f6", "solo", [], [salta("b6", "solo")]))))).toEqual([["f2", "f4"], ["f6"]]);
});

test("ciò che una procedura ricorsiva fa ai suoi parametri: si rifà fino a non cambiare più, senza girare all'infinito", () => {
  // `dai(out x, n)`: se n = 0 dà un valore a x, altrimenti richiama sé stessa con x. Su ogni strada che finisce x riceve
  // un valore: dopo la chiamata il dato di chi chiama lo ha, e leggerlo non avvisa.
  const dai = procedura("f2", "dai", [{ name: "x", type: "integer", parameter: "out" }, par("n", "integer")], [
    { id: "b3", kind: "if", condition: "n == 0", then: [assegna("b4", "x", "1")], else: [{ id: "b5", kind: "call", callee: "dai", arguments: ["x", "n - 1"] }] },
  ]);
  const r = controlla(conFunzioni([dato("y", "integer")], [{ id: "b1", kind: "call", callee: "dai", arguments: ["y", "3"] }, scrivi("b2", "y")], dai), tetti);
  expect(r).toMatchObject({ fuoriTappa: false, errori: [] });
  expect(r.fuoriTappa ? [] : r.avvisi.filter((x) => x.code === "maybe_uninitialized")).toEqual([]);
  // Controllo positivo: se il ramo che finisce non dà il valore, leggere y avvisa.
  const nonDa = procedura("f2", "dai", [{ name: "x", type: "integer", parameter: "out" }, par("n", "integer")], [
    { id: "b3", kind: "if", condition: "n == 0", then: [], else: [{ id: "b5", kind: "call", callee: "dai", arguments: ["x", "n - 1"] }] },
  ]);
  const s = controlla(conFunzioni([dato("y", "integer")], [{ id: "b1", kind: "call", callee: "dai", arguments: ["y", "3"] }, scrivi("b2", "y")], nonDa), tetti);
  expect(s.fuoriTappa ? [] : s.avvisi.filter((x) => x.code === "maybe_uninitialized").map((x) => x.block)).toEqual(["b2"]);
});

test("dato per dato: la posizione di ogni errore della vista dei dati e di ogni avviso di ruolo, uguali a quelli della funzione", () => {
  const perDato = (data: Json[], body: Json[], comuni?: Json[]) => esito(data, body, comuni).dati.map((s) => `${s.genere} ${s.code} ${s.comune ? "comune" : "dato"} ${s.indice}`);
  // Un nome doppio è un errore del SECONDO dato con quel nome, non del primo; una costante comune ha la sua tabella.
  const k = dato("K", "integer", { constant: true, initial: "1" });
  expect(perDato([n, dato("1x", "integer"), dato("n", "real"), dato("K", "integer")], [], [k, dato("Z", "integer")])).toEqual([
    "errore invalid_data_item comune 1",
    "errore invalid_name dato 1",
    "errore invalid_name dato 2",
    "errore invalid_name dato 3",
  ]);
  // Due dati di input mai letti: la funzione ha un avviso, la vista ne ha uno per dato.
  const a = dato("a", "integer", { role: "input" });
  const a2 = dato("a2", "integer", { role: "input" });
  const o = dato("o", "integer", { role: "output" });
  // Coi dati inutili: il dato senza valore mai nominato, e `n`, letto dalla console e mai usato.
  expect(perDato([a, n, a2, o], [leggiIn("b1", "n")])).toEqual([
    "avviso input_never_read dato 0",
    "avviso unused_data dato 0",
    "avviso missing_role dato 1",
    "avviso unused_value dato 1",
    "avviso input_never_read dato 2",
    "avviso unused_data dato 2",
    "avviso output_never_written dato 3",
    "avviso unused_data dato 3",
  ]);
  expect(tuttiGliAvvisi([a, n, a2, o], [leggiIn("b1", "n")])).toEqual([
    e("input_never_read", "f1"),
    e("unused_data", "f1"),
    e("missing_role", "f1"),
    e("unused_value", "f1"),
    e("output_never_written", "f1"),
  ]);
  // Una costante comune inutile: la sua tabella, e l'avviso del progetto (il blocco vuoto).
  expect(perDato([n], [scrivi("b1", "n")], [dato("K", "integer", { constant: true, initial: "1" })])).toEqual(["avviso unused_value comune 0"]);
});

test("dato per dato, sul corpus: gli errori dei dati sono quelli della funzione nello stesso ordine, e i codici degli avvisi gli stessi", () => {
  let [progetti, conDati] = [0, 0];
  const cartella = fileURLToPath(new URL("../../casi/tappa-1", import.meta.url));
  const corpus = readdirSync(cartella)
    .filter((f) => f.endsWith(".algo"))
    .map((file) => {
      const aperto = apri(readFileSync(join(cartella, file), "utf8"));
      if (!aperto.ok) throw new Error(`${file} non si apre`);
      return aperto.progetto;
    });
  // Il corpus non ha errori dei dati né avvisi dei ruoli, e un solo dato inutile: tre progetti che li hanno.
  const a = dato("a", "integer", { role: "input" });
  const conSegnalazioni = [
    progetto([n, dato("1x", "integer"), dato("n", "real")], [], [dato("Z", "integer")]),
    progetto([a, n, dato("a2", "integer", { role: "input" }), dato("o", "integer", { role: "output" })], [leggiIn("b1", "n")]),
    progetto([a, dato("v", "integer", { size: 2, initial: ["1"] })], [scrivi("b1", "y")]),
  ];
  for (const p of [...corpus, ...conSegnalazioni]) {
    const r = controlla(p, tetti);
    if (r.fuoriTappa) continue;
    progetti++;
    const funzione = new Set(["", "f1"]);
    const erroriDeiDati = r.errori.filter((x) => funzione.has(x.block)).map((x) => x.code);
    expect(r.dati.filter((d) => d.genere === "errore").map((d) => d.code)).toEqual(erroriDeiDati);
    const avvisiDeiDati = [...new Set<string>(r.avvisi.filter((x) => funzione.has(x.block)).map((x) => x.code))].sort();
    expect([...new Set<string>(r.dati.filter((d) => d.genere === "avviso").map((d) => d.code))].sort()).toEqual(avvisiDeiDati);
    if (r.dati.length > 0) conDati++;
  }
  console.log(`dato per dato: progetti ${progetti} (corpus ${corpus.length}), con segnalazioni dei dati ${conDati}`);
  expect(corpus.length).toBe(56);
  // Nel corpus della tappa 1 un solo programma ne ha: il vettore che riceve una stringa e non si legge più.
  expect(conDati).toBe(conSegnalazioni.length + 1);
});

// La mutazione «il controllo non scende nel corpo dei cicli»: il compilatore non la segnala (la discesa è una catena
// di `if` sul genere del blocco). Il sorgente si copia in una cartella temporanea con gli import resi assoluti; la
// copia senza mutazioni è il controllo positivo. Deve trovare l'errore e il contatore assegnato nel corpo.
describe("mutazioni del controllo statico", () => {
  const sorgente = readFileSync(join(import.meta.dir, "controllo.ts"), "utf8");
  const discesa = '    if (b.kind === "for" || b.kind === "for_each") nelCiclo(b.kind === "for" ? b.counter : b.item, b.body, b.kind);\n';
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  for (const [nome, mutato] of [
    ["nessuna (controllo positivo)", sorgente],
    ["il controllo non scende nel corpo dei cicli", sorgente.replace(discesa, "")],
  ] as const)
    test(nome, async () => {
      expect(sorgente.split(discesa).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "controllo-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, mutato.replaceAll('from "../', `from "${nucleo}/`));
        const mutante: { controlla: typeof controlla } = await import(file);
        const trovati = (body: Json[]) => {
          const r = mutante.controlla(progetto(tutti, body), tetti);
          return r.fuoriTappa ? "fuori tappa" : r.errori;
        };
        const esiti: unknown[] = [trovati([per("b1", "n", [scrivi("b2", "y")])]), trovati([perOgni("b1", "c", "s", [assegna("b2", "c", "'x'")])])];
        const attesi = [[e("unknown_name", "b2")], [e("assign_to_read_only", "b2")]];
        console.log(`mutazione del controllo «${nome}»: ${JSON.stringify(esiti)}`);
        if (mutato === sorgente) expect(esiti).toEqual(attesi);
        else expect(esiti).not.toEqual(attesi);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});

// Le mutazioni delle regole della tappa 3, con la stessa copia del sorgente: ognuna cambia una riga sola (contata) e
// deve cambiare l'esito della sua sonda; la copia senza mutazioni dà gli attesi.
describe("mutazioni del controllo delle procedure e delle funzioni", () => {
  const sorgente = readFileSync(join(import.meta.dir, "controllo.ts"), "utf8");
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  const scrive = funzione("f20", "scrive", "integer", [par("y", "integer")], [scrivi("b30", "y")], "y");
  const giu = funzione("f2", "giu", "integer", [par("y", "integer")], [], "giu(y)");
  const sonde = () => [
    conFunzioni([], [], scrive),
    conFunzioni([dato("r", "integer")], [assegna("b1", "r", "giu(1)"), scrivi("b2", "r")], giu),
    conFunzioni([n], [salta("b1", "incr", "(n)"), scrivi("b2", "n")], incr),
  ];
  const attesi = [[e("function_with_effect", "b30")], { errori: [], giri: [["f2"]] }, [e("reference_not_assignable", "b1")]];
  const mutazioni = [
    ["nessuna (controllo positivo)", "", ""],
    ["una funzione che scrive passa il controllo", '      case "write":\n        soloFuoriDaUnaFunzione("funzione_scrive");\n', '      case "write":\n'],
    ["il giro della ricorsione non è riconosciuto", "  const delGiro = p.functions.filter((f) => chiamati(f).some((g) => arriva(g, f)));\n", "  const delGiro = p.functions.filter(() => false);\n"],
    ["un dato fra parentesi si passa per riferimento", 'if (testo !== undefined && parole(testo)?.[0]?.genere !== "nome") errore', "if (false) errore"],
  ] as const;
  for (const [nome, vecchio, nuovo] of mutazioni)
    test(nome, async () => {
      if (vecchio !== "") expect(sorgente.split(vecchio).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "controllo-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, sorgente.replace(vecchio, nuovo).replaceAll('from "../', `from "${nucleo}/`));
        const mutante: { controlla: typeof controlla; giriDellaRicorsione: typeof giriDellaRicorsione } = await import(file);
        // La ricorsione la accetta il controllo, e i suoi giri si dicono all'utente: la sonda sono i giri.
        const esiti: unknown[] = sonde().map((p) => {
          const r = mutante.controlla(p, tetti);
          const giri = mutante.giriDellaRicorsione(p).map((g) => g.map((f) => f.id));
          return r.fuoriTappa ? "fuori tappa" : giri.length > 0 ? { errori: r.errori, giri } : r.errori;
        });
        console.log(`mutazione del controllo «${nome}»: ${JSON.stringify(esiti)}`);
        if (vecchio === "") expect(esiti).toEqual(attesi);
        else expect(esiti).not.toEqual(attesi);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});

// Le mutazioni del riferimento che vuole il valore: il riferimento senza valore che passa il controllo (rossa sul caso
// del corpus che lo attende), e la correzione verso il passaggio per uscita offerta anche a un parametro che la procedura
// legge prima di dargli un valore. La copia senza mutazioni dà gli attesi.
describe("mutazioni del controllo del riferimento che vuole il valore", () => {
  const sorgente = readFileSync(join(import.meta.dir, "controllo.ts"), "utf8");
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  const corpus = apri(readFileSync(fileURLToPath(new URL("../../casi/tappa-3/riferimento-senza-valore.algo", import.meta.url)), "utf8"));
  if (!corpus.ok) throw new Error("riferimento-senza-valore non si apre");
  // Tre procedure a cui la correzione verso l'uscita NON si offre: legge prima, scrive in un ramo solo, un vettore.
  const sonde = {
    leggePrima: conFunzioni(tutti, [], procedura("f20", "p", [par("m", "integer", "reference")], [scrivi("b30", "m"), assegna("b31", "m", "1")])),
    inUnRamo: conFunzioni(tutti, [], procedura("f20", "p", [par("m", "integer", "reference")], [{ id: "b30", kind: "if", condition: "true", then: [assegna("b31", "m", "1")], else: [] }])),
    unElemento: conFunzioni(tutti, [], procedura("f20", "p", [par("m", "integer", "reference", { size: 3 })], [assegna("b30", "m[0]", "1")])),
  };
  const attesi = { errori: [e("reference_without_value", "b1")], versoOut: { leggePrima: [], inUnRamo: [], unElemento: [] } };
  const condizione = 'd.parameter === "reference" && d.size === undefined && d.type !== "record" && !lettiPrima.has(d.name) && daranno.has(d.name) ?';
  const mutazioni = [
    ["nessuna (controllo positivo)", "", ""],
    ["un riferimento senza valore passa il controllo", 'trovati.push({ code: "reference_without_value", block: b.id });', "void b;"],
    ["la correzione offerta su un parametro letto prima", condizione, condizione.replace(" && !lettiPrima.has(d.name)", "")],
    ["la correzione offerta su un parametro scritto in un ramo solo", condizione, condizione.replace(" && daranno.has(d.name)", "")],
    ["la correzione offerta su un vettore", condizione, condizione.replace(" && d.size === undefined", "")],
  ] as const;
  for (const [nome, vecchio, nuovo] of mutazioni)
    test(nome, async () => {
      if (vecchio !== "") expect(sorgente.split(vecchio).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "controllo-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, sorgente.replace(vecchio, nuovo).replaceAll('from "../', `from "${nucleo}/`));
        const mutante: { controlla: typeof controlla } = await import(file);
        const delCorpus = mutante.controlla(corpus.progetto, tetti);
        const verso = (q: typeof corpus.progetto) => {
          const c = mutante.controlla(q, tetti);
          return c.fuoriTappa ? "fuori tappa" : c.versoOut;
        };
        const esiti: unknown = {
          errori: delCorpus.fuoriTappa ? "fuori tappa" : delCorpus.errori,
          versoOut: { leggePrima: verso(sonde.leggePrima), inUnRamo: verso(sonde.inUnRamo), unElemento: verso(sonde.unElemento) },
        };
        console.log(`mutazione del controllo «${nome}»: ${JSON.stringify(esiti)}`);
        if (vecchio === "") expect(esiti).toEqual(attesi);
        else expect(esiti).not.toEqual(attesi);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});

// Il censimento nei due versi, come funzione degli elenchi: la prova lo applica a quelli veri e, per il controllo
// positivo di ogni rilevatore, a una copia con un difetto solo.
type Censimento = {
  codici: readonly string[];
  tappaDi: Record<string, number>;
  provati: ReadonlySet<string>;
  statiche: readonly string[];
  regoleDelFormato: Record<string, string>;
};
function censimento({ codici, tappaDi, provati, statiche, regoleDelFormato }: Censimento) {
  const daProvare = Object.keys(tappaDi).filter((c) => tappeProvate.includes(tappaDi[c]!));
  return {
    senzaVoce: codici.filter((c) => !(c in tappaDi)),
    vociSenzaCodice: Object.keys(tappaDi).filter((c) => !codici.includes(c)),
    senzaTest: daProvare.filter((c) => !provati.has(c)),
    provatiFuori: [...provati].filter((p) => p in tappaDi && !tappeProvate.includes(tappaDi[p]!)),
    senzaPosto: statiche.filter((id) => !(id in regoleDelFormato)),
    postoSenzaRegola: Object.keys(regoleDelFormato).filter((id) => !statiche.includes(id)),
    postoNonProvato: Object.entries(regoleDelFormato)
      .filter(([, dove]) => !dove.startsWith("tappa") && !provati.has(dove))
      .map(([id]) => id),
  };
}

// Ultima prova del file: il censimento nei due versi. Un codice è «provato» solo se la sua prova è arrivata in fondo
// (`prova` lo registra dopo il corpo), non quando la prova è dichiarata.
// I record: il progetto di partenza e gli errori attesi sono quelli scritti a mano prima del codice. Un progetto giusto coi
// record è dentro la tappa (gli strati che non li conoscono lo rifiutano da sé); uno sbagliato ha i suoi errori statici.
describe("i record", () => {
  const pagella = (): Json => ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "pagella" },
    records: [
      {
        name: "alunno",
        fields: [
          { name: "nome", type: "string", max_length: 20 },
          { name: "classe", type: "string", max_length: 3 },
          { name: "voto", type: "integer" },
        ],
      },
    ],
    shared_constants: [{ name: "primo", type: "record", record: "alunno", constant: true, initial: ['"Anna"', '"3A"', "7"] }],
    functions: [
      {
        id: "f1",
        kind: "main",
        data: [{ name: "a", type: "record", record: "alunno" }],
        body: [assegna("b1", "a", "primo"), assegna("b2", "a.voto", "a.voto + 1"), scrivi("b3", "a.nome", '" "', "a.voto")],
        end: { id: "b4" },
      },
      {
        id: "f2",
        kind: "function",
        name: "promosso",
        return_type: "record",
        return_record: "alunno",
        data: [{ name: "x", type: "record", record: "alunno", parameter: "value" }],
        body: [assegna("b5", "x.voto", "x.voto + 1")],
        end: { id: "b6", return_value: "x" },
      },
    ],
  });
  const controllato = (modifica: (p: Json) => void = () => {}) => {
    const p = pagella();
    modifica(p);
    const letto = leggi(p);
    if (!letto.ok) throw new Error(JSON.stringify(letto.errori));
    return controlla(letto.progetto, tetti);
  };
  /** Gli errori (`codice@blocco`) e le cause, in ordine. */
  const errori = (modifica: (p: Json) => void) => {
    const r = controllato(modifica);
    if (r.fuoriTappa) return "fuori tappa";
    return { errori: r.errori.map((x) => `${x.code}@${x.block}`), cause: r.fermate.filter((f) => f.code !== "unused_value").map((f) => `${f.code}@${f.block} ${f.fermata.causa}${f.fermata.segno === undefined ? "" : ` «${f.fermata.segno}»`}`) };
  };
  const main = (p: Json) => p.functions[0];
  const blocco = (p: Json, id: string) => main(p).body.find((b: Json) => b.id === id);
  /** Il record col nome dato, e ogni dato e risultato che lo nomina. */
  const rinominato = (nome: string) => (p: Json) => {
    p.records[0].name = nome;
    for (const d of [...p.shared_constants, ...p.functions.flatMap((f: Json) => f.data)]) d.record = nome;
    p.functions[1].return_record = nome;
  };

  test("il progetto giusto coi record è dentro la tappa, senza errori né avvisi", () => {
    const giusto = (modifica?: (p: Json) => void) => {
      const r = controllato(modifica);
      return r.fuoriTappa ? "fuori tappa" : { errori: r.errori.length, avvisi: r.avvisi.map((a) => `${a.code}@${a.block}`) };
    };
    expect(giusto()).toEqual({ errori: 0, avvisi: [] });
    // Senza la costante comune (e col blocco che la usava che scrive un campo: il record ha un valore da un campo).
    expect(giusto((p) => (delete p.shared_constants, Object.assign(blocco(p, "b1"), { target: "a.voto", value: "7" })))).toEqual({ errori: 0, avvisi: [] });
    // Controllo positivo: senza il blocco che dà un valore, il campo letto è un dato letto prima del valore.
    expect(giusto((p) => (delete p.shared_constants, (main(p).body = main(p).body.slice(1))))).toEqual({ errori: 0, avvisi: ["maybe_uninitialized@b2"] });
  });

  test("le analisi dopo gli errori conoscono il campo: il valore, il riferimento, l'uscita, il passaggio verso «out»", () => {
    const conProcedure = (corpo: Json[], ...procedure: Json[]) => (p: Json) => {
      delete p.shared_constants;
      main(p).body = corpo;
      p.functions.push(...procedure);
    };
    const r = (modifica: (p: Json) => void) => {
      const c = controllato(modifica);
      if (c.fuoriTappa) throw new Error("fuori tappa");
      return { errori: c.errori.map((x) => `${x.code}@${x.block}`), prima: c.primaDelValore.map((x) => x.block), versoOut: c.versoOut.map((x) => `${x.funzione}:${x.indice}`) };
    };
    const dai = { id: "f3", kind: "procedure", name: "dai", data: [par("r", "record", "reference", { record: "alunno" })], body: [assegna("b20", "r.voto", "1")], end: { id: "b21" } };
    const daiUscita = { ...dai, name: "esce", id: "f4", data: [par("r", "record", "out", { record: "alunno" })], end: { id: "b22" } };
    const daiIntero = { id: "f5", kind: "procedure", name: "uno", data: [par("n", "integer", "out")], body: [assegna("b23", "n", "1")], end: { id: "b24" } };
    // Un campo scritto dà il valore al record: il riferimento e la lettura dopo non avvisano.
    expect(r(conProcedure([assegna("b1", "a.nome", '"x"'), salta("b2", "dai", "a"), scrivi("b3", "a.voto")], dai))).toEqual({ errori: [], prima: [], versoOut: [] });
    // Un campo passato per uscita a chi gli dà un valore: il record ha un valore dopo il salto.
    expect(r(conProcedure([salta("b1", "uno", "a.voto"), scrivi("b2", "a.voto")], daiIntero))).toEqual({ errori: [], prima: [], versoOut: [] });
    // Sonde vere: il record senza valore al riferimento, e il record intero passato per uscita a chi non dà un valore lo
    // perde, mentre un suo campo no.
    expect(r(conProcedure([salta("b1", "dai", "a")], dai))).toEqual({ errori: ["reference_without_value@b1"], prima: [], versoOut: [] });
    const vuota = { ...daiUscita, body: [] };
    expect(r(conProcedure([assegna("b1", "a.nome", '"x"'), salta("b2", "esce", "a"), scrivi("b3", "a.voto")], vuota)).prima).toEqual(["b3"]);
    const nonDa = { ...daiIntero, body: [] };
    expect(r(conProcedure([assegna("b1", "a.nome", '"x"'), salta("b2", "uno", "a.voto"), scrivi("b3", "a.nome")], nonDa)).prima).toEqual([]);
    // Il riferimento a un record che la procedura scrive senza leggerlo non propone «out» (come il vettore: un campo solo
    // conta come valore); a un intero sì (controllo positivo).
    const scriveSoltanto = { ...daiIntero, id: "f6", name: "rif", data: [par("n", "integer", "reference")], end: { id: "b25" } };
    expect(r(conProcedure([assegna("b1", "a.voto", "2"), salta("b2", "dai", "a"), salta("b3", "rif", "a.voto")], dai, scriveSoltanto)).versoOut).toEqual(["f6:0"]);
  });

  prova("unknown_record", () => {
    expect(errori((p) => (main(p).data[0].record = "studente"))).toEqual({ errori: ["unknown_record@f1", "unknown_record@b1", "unknown_record@b2", "unknown_record@b3"], cause: [] });
    expect(errori((p) => (p.functions[1].return_record = "studente"))).toEqual({ errori: ["unknown_record@f2", "unknown_record@b6"], cause: [] });
  });

  prova("unknown_record_field", () => {
    expect(errori((p) => (blocco(p, "b2").target = "a.vto"))).toEqual({ errori: ["unknown_record_field@b2"], cause: ["unknown_record_field@b2 campo_assente «vto»"] });
    expect(errori((p) => (blocco(p, "b3").values = ["a.nome.x"]))).toEqual({ errori: ["unknown_record_field@b3"], cause: ["unknown_record_field@b3 non_un_record «x»"] });
    expect(errori((p) => (main(p).data.push(dato("n", "integer")), (blocco(p, "b2").target = "n.voto")))).toEqual({ errori: ["unknown_record_field@b2"], cause: ["unknown_record_field@b2 non_un_record «voto»"] });
    expect(errori((p) => (main(p).data.push(dato("v", "integer", { size: 3 })), (blocco(p, "b2").target = "v[1].voto")))).toEqual({ errori: ["unknown_record_field@b2"], cause: ["unknown_record_field@b2 non_un_record «voto»"] });
  });

  prova("record_name_in_use", () => {
    expect(errori((p) => p.records.push({ name: "alunno", fields: [{ name: "x", type: "integer" }] }))).toEqual({ errori: ["record_name_in_use@"], cause: ["record_name_in_use@ record_doppio «alunno»"] });
    expect(errori((p) => main(p).data.push(dato("alunno", "integer")))).toEqual({ errori: ["record_name_in_use@"], cause: ["record_name_in_use@ nome_di_un_dato «alunno»"] });
    expect(errori((p) => (p.functions[1].name = "alunno"))).toEqual({ errori: ["record_name_in_use@"], cause: ["record_name_in_use@ nome_di_una_funzione «alunno»"] });
    expect(errori(rinominato("intero"))).toEqual({ errori: ["record_name_in_use@"], cause: ["record_name_in_use@ nome_di_un_tipo «intero»"] });
  });

  prova("invalid_record", () => {
    expect(errori((p) => p.records.push({ name: "vuoto", fields: [] }))).toEqual({ errori: ["invalid_record@"], cause: ["invalid_record@ senza_campi «vuoto»"] });
    expect(errori((p) => p.records[0].fields.push({ name: "voto", type: "real" }))).toEqual({ errori: ["invalid_record@", "invalid_data_item@"], cause: ["invalid_record@ campo_doppio «voto»"] });
  });

  test("i codici di prima sulle forme nuove", () => {
    const r = (p: Json) => p.records[0];
    const k = (p: Json) => p.shared_constants[0];
    // Un vettore di record è un errore del dato, e i blocchi lo usano come un record.
    expect(errori((p) => (main(p).data[0].size = 3))).toEqual({ errori: ["invalid_data_item@f1"], cause: [] });
    expect(errori((p) => (r(p).fields[2].name = "1voto"))).toEqual({ errori: ["invalid_name@", "unknown_record_field@b2", "unknown_record_field@b3", "unknown_record_field@b5"], cause: ["invalid_name@ nome_cifra", "unknown_record_field@b2 campo_assente «voto»", "unknown_record_field@b3 campo_assente «voto»", "unknown_record_field@b5 campo_assente «voto»"] });
    expect(errori(rinominato("and"))).toEqual({ errori: ["invalid_name@"], cause: ["invalid_name@ nome_riservato «and»"] });
    expect(errori((p) => (r(p).fields[2].max_length = 5))).toEqual({ errori: ["invalid_data_item@"], cause: ["invalid_data_item@ lunghezza_non_stringa"] });
    expect(errori((p) => (k(p).initial = ['"Anna"', '"3A"']))).toEqual({ errori: ["invalid_data_item@"], cause: [] });
    expect(errori((p) => (k(p).initial = ['"Anna"', "7", "7"]))).toEqual({ errori: ["type_mismatch@"], cause: [] });
    expect(errori((p) => (k(p).initial = { each: "7" }))).toEqual({ errori: ["invalid_data_item@"], cause: [] });
    expect(errori((p) => (blocco(p, "b3").values = ["a"]))).toEqual({ errori: ["type_mismatch@b3"], cause: [] });
    expect(errori((p) => main(p).body.push(leggiIn("b9", "a")))).toEqual({ errori: ["array_assignment@b9"], cause: [] });
    expect(errori((p) => (blocco(p, "b1").value = "3"))).toEqual({ errori: ["array_assignment@b1"], cause: [] });
    expect(errori((p) => (blocco(p, "b1").target = "a.voto"))).toEqual({ errori: ["type_mismatch@b1"], cause: [] });
    expect(errori((p) => main(p).body.push({ id: "b9", kind: "if", condition: "a == primo", then: [], else: [] }))).toEqual({ errori: ["type_mismatch@b9"], cause: [] });
  });

  test("le cause dei codici di prima sulle forme nuove: dove sta la causa", () => {
    const dati = (modifica: (p: Json) => void) => {
      const r = controllato(modifica);
      return r.fuoriTappa ? "fuori tappa" : r.dati.map((d) => `${d.code}@${d.funzione}:${d.indice} ${d.fermata?.causa ?? ""}${d.fermata?.segno === undefined ? "" : ` «${d.fermata.segno}»`}`);
    };
    expect(dati((p) => (main(p).data[0].size = 3))).toEqual(["invalid_data_item@f1:0 vettore_di_record"]);
    expect(dati((p) => (p.shared_constants[0].initial = ['"Anna"', '"3A"']))).toEqual(["invalid_data_item@:0 elenco_di_altra_lunghezza «2»"]);
    expect(dati((p) => (p.shared_constants[0].initial = { each: "7" }))).toEqual(["invalid_data_item@:0 forma_del_valore"]);
  });

  test("le forme giuste: il campo letto e scritto, per valore e per riferimento, la copia e il risultato", () => {
    const procedura = { id: "f3", kind: "procedure", name: "alza", data: [par("v", "integer", "reference"), par("y", "record", "value", { record: "alunno" })], body: [], end: { id: "b8" } };
    const giusto = (modifica: (p: Json) => void) => {
      const r = controllato((p) => (p.functions.push(procedura), modifica(p)));
      return !r.fuoriTappa && r.errori.length === 0;
    };
    expect(giusto((p) => main(p).body.push(salta("b9", "alza", "a.voto", "a")))).toBe(true);
    expect(giusto((p) => main(p).body.push(leggiIn("b9", "a.nome")))).toBe(true);
    expect(giusto((p) => main(p).body.push(assegna("b9", "a", "promosso(primo)")))).toBe(true);
    expect(giusto((p) => main(p).body.push(scrivi("b9", "a.nome[0]", "length a.classe")))).toBe(true);
    // Controllo positivo: due campi diversi per riferimento vanno, lo stesso campo due volte no.
    expect(giusto((p) => ((procedura.data[1] = par("w", "integer", "reference")), main(p).body.push(salta("b9", "alza", "a.voto", "a.voto"))))).toBe(false);
    // Due campi diversi dello stesso record per riferimento sono due dati.
    expect(giusto((p) => ((procedura.data[1] = par("w", "string", "reference", { max_length: 20 })), main(p).body.push(salta("b9", "alza", "a.voto", "a.nome"))))).toBe(true);
    procedura.data[1] = par("y", "record", "value", { record: "alunno" });
    expect(errori((p) => (p.functions.push(procedura), main(p).body.push(salta("b9", "alza", "a.voto", "3"))))).toEqual({ errori: ["argument_mismatch@b9"], cause: ["argument_mismatch@b9 tipo_diverso «y»"] });
    // Un record di un altro tipo non passa per valore.
    const conPunto = (p: Json) => {
      p.records.push({ name: "punto", fields: [{ name: "x", type: "integer" }] });
      main(p).data.push(dato("q", "record", { record: "punto" }));
      p.functions.push(procedura);
      main(p).body.push(assegna("b7", "q.x", "1"), salta("b9", "alza", "a.voto", "q"));
    };
    expect(errori(conPunto)).toEqual({ errori: ["argument_mismatch@b9"], cause: ["argument_mismatch@b9 tipo_diverso «y»"] });
    expect(errori((p) => (p.functions.push(procedura), main(p).body.push(assegna("b9", "a.nome[0]", "'x'"))))).toEqual({ errori: ["assign_to_read_only@b9"], cause: ["assign_to_read_only@b9 carattere_della_stringa «a»"] });
  });
});

test("censimento: i codici d'errore statico e d'avviso e le regole statiche del formato, appaiati coi test", () => {
  const codici = [...codiciErroreStatico, ...codiciAvviso];
  // Le regole «statico» del censimento del formato, lette dal suo file (una voce per riga).
  const fileFormato = readFileSync(join(import.meta.dir, "..", "progetto", "formato.test.ts"), "utf8");
  const voci = [...fileFormato.matchAll(/^\s*\{ id: "(F[\d.]+)", regola: .*, dove: "(\w+)" \},$/gm)].map((m) => ({ id: m[1]!, dove: m[2]! }));
  const statiche = voci.filter((r) => r.dove === "statico").map((r) => r.id);
  const veri: Censimento = { codici, tappaDi, provati, statiche, regoleDelFormato };
  const esito = censimento(veri);

  const daProvare = Object.keys(tappaDi).filter((c) => tappeProvate.includes(tappaDi[c]!));
  const perTappa = (t: number) => Object.values(tappaDi).filter((x) => x === t).length;
  console.log(
    `censimento dei codici: ${codici.length} (statici ${codiciErroreStatico.length} · avvisi ${codiciAvviso.length}); tappa 1 ${perTappa(1)} · tappa 2 ${perTappa(2)} · tappa 3 ${perTappa(3)}; provati ${daProvare.length - esito.senzaTest.length} su ${daProvare.length}` +
      ` | regole del formato lette: ${voci.length}, statiche ${statiche.length}, con un posto ${Object.keys(regoleDelFormato).length}`,
  );
  expect(esito).toEqual({ senzaVoce: [], vociSenzaCodice: [], senzaTest: [], provatiFuori: [], senzaPosto: [], postoSenzaRegola: [], postoNonProvato: [] });
  // Controllo positivo della lettura del file del formato: il denominatore è il censimento intero.
  expect(voci.length).toBe(85);
  expect([codici.length, daProvare.length]).toEqual([43, 43]);

  // Controlli positivi, uno per rilevatore, ognuno su una copia degli elenchi veri con un difetto solo.
  const senza = <T,>(r: Record<string, T>, k: string) => Object.fromEntries(Object.entries(r).filter(([x]) => x !== k));
  const menoUno = new Set(provati);
  menoUno.delete("invalid_step");
  const conFuori = new Set([...provati, "codice_di_una_tappa_dopo"]);
  const senzaUnTest = new Set(provati);
  senzaUnTest.delete("invalid_data_item");
  const difetti = [
    censimento({ ...veri, tappaDi: senza(tappaDi, "unused_value") }).senzaVoce,
    censimento({ ...veri, tappaDi: { ...tappaDi, codice_inventato: 1 } }).vociSenzaCodice,
    censimento({ ...veri, provati: menoUno }).senzaTest,
    censimento({ ...veri, tappaDi: { ...tappaDi, codice_di_una_tappa_dopo: 4 }, provati: conFuori }).provatiFuori,
    censimento({ ...veri, regoleDelFormato: senza(regoleDelFormato, "F6.11") }).senzaPosto,
    censimento({ ...veri, regoleDelFormato: { ...regoleDelFormato, "F99.1": "tappa 3" } }).postoSenzaRegola,
    censimento({ ...veri, provati: senzaUnTest }).postoNonProvato,
  ];
  expect(difetti).toEqual([["unused_value"], ["codice_inventato"], ["invalid_step"], ["codice_di_una_tappa_dopo"], ["F6.11"], ["F99.1"], ["F2.6", "F4.8", "F4.11", "F4.15", "F4.16", "F5.13"]]);
});
