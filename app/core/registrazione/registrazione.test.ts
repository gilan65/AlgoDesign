// La registrazione di un'esecuzione, sul piccolo: le regole del formato, della composizione e della riproduzione, una per
// prova. Una lettura, un esito, una riga della console e uno dei valori del file alterati danno «diverso»; una riga rifiutata e
// una console tagliata si riproducono; il lettore rifiuta col motivo, e lo schema con lui (un validatore indipendente lo legge).
//
// Che cosa NON guarda: il corpus (`corpus.test.ts`) e un altro computer (`strumenti/registrazioni-del-corpus.ts`, che scrive su uno e
// riproduce sull'altro).

import { expect, test } from "bun:test";
import { userInfo } from "node:os";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import { alterata, contestoDiProva, percorsiEProfilo, registrazioneDi, tuttoIlPercorso } from "../../strumenti/registrazioni-del-corpus";
import { fileDa, scelteIniziali } from "../../ui/preferenze";
import { tetti } from "../controllo/controllo";
import { Esecuzione, righeLunghePredefinite } from "../esecuzione/esecuzione";
import type { Progetto } from "../progetto/modello";
import { componi, fotografa } from "./composizione";
import { apriRegistrazione, leggiRegistrazione, schemaDellaRegistrazione, testoDellaRegistrazione, type Registrazione } from "./formato";
import { riproduci } from "./riproduzione";

const senzaOrologio = () => 0;

/** Un programma piccolo: una lettura, una scrittura che può dividere per zero. */
const programma = (): Progetto =>
  ({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Prova" },
    functions: [
      {
        id: "f0",
        kind: "main",
        data: [{ name: "n", type: "integer", role: "input" }],
        body: [
          { id: "b1", kind: "read", target: "n" },
          { id: "b2", kind: "write", values: ["10 / n"], newline: true },
        ],
        end: { id: "b3" },
      },
    ],
  }) as unknown as Progetto;

/** Il programma fino alla fine con le righe date, rifiutate comprese. */
function eseguita(p: Progetto, ...righe: string[]): Esecuzione {
  const es = new Esecuzione(p, tetti, { tabella: false });
  es.comanda("continua");
  for (let k = 0; ; ) {
    es.fetta(senzaOrologio, Infinity);
    if (es.stato.genere !== "chiede" || k >= righe.length) return es;
    es.inserisci(righe[k++]!);
  }
}

test("una lettura alterata nel file dà «diverso», sul campo delle letture", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  expect(riproduci(r).uguale).toBe(true);
  const esito = riproduci(alterata(r, (x) => (x.reads = [{ data: "n", text: "2" }])));
  expect(esito.uguale).toBe(false);
  expect(esito.differenze.map((d) => d.campo)).toContain("console");
  expect(esito.differenze.every((d) => d.esecuzione === 0)).toBe(true);
});

test("un esito alterato nel file dà «diverso», sul campo dell'esito", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const esito = riproduci(alterata(r, (x) => (x.outcome = { kind: "finished", error: { code: "division_by_zero", block: "b2" } })));
  expect(esito.uguale).toBe(false);
  expect(esito.differenze.map((d) => d.campo)).toEqual(["outcome"]);
  expect(esito.differenze[0]!.dellaMacchina).toBeUndefined();
});

test("una riga della console, gli avanzamenti e un valore del file alterati danno «diverso», ognuno sul suo campo", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  expect(riproduci(alterata(r, (x) => (x.console = []))).differenze.map((d) => d.campo)).toEqual(["console"]);
  expect(riproduci(alterata(r, (x) => (x.advances = 1))).differenze.map((d) => d.campo)).toContain("advances");
  expect(riproduci(alterata(r, (x) => (x.console_removed = 3))).differenze.map((d) => d.campo)).toEqual(["console_removed"]);
  // Una riga di un carattere nel file: la console si divide, e il file aveva la riga intera.
  const conUnTesto = registrazioneDi(eseguita(programma(), "1"));
  const piccola = riproduci(alterata(conUnTesto, (_x, t) => (t.long_lines = { characters: 1, mode: "wrap" })));
  expect(piccola.differenze.map((d) => d.campo)).toEqual(["console"]);
  // Un limite del file che il progetto supera: il progetto non parte.
  const lungo = { ...programma(), functions: [{ ...programma().functions[0]!, data: [{ name: "n", type: "integer", role: "input", size: 5 }] }] } as unknown as Progetto;
  const col = registrazioneDi(new Esecuzione(lungo, tetti, { tabella: false }));
  const fermo = riproduci(alterata(col, (_x, t) => (t.limits = { vector_elements: 2, string_length: 1000, string_vector_characters: 10_000 })));
  expect(fermo.uguale).toBe(false);
});

test("una differenza dice l'esecuzione: in un file con due, solo quella alterata", () => {
  const una = fotografa(eseguita(programma(), "5"));
  const due = fotografa(eseguita(programma(), "2"));
  const r = componi(contestoDiProva, [una, due]);
  expect(riproduci(r)).toEqual({ uguale: true, esecuzioni: 2, differenze: [] });
  const copia = structuredClone(r) as unknown as { executions: { console: unknown[] }[] };
  copia.executions[1]!.console = [];
  const esito = riproduci(copia as unknown as Registrazione);
  expect(esito.differenze.map((d) => [d.esecuzione, d.campo])).toEqual([[1, "console"]]);
});

test("una riga rifiutata da una lettura è nel file e si riproduce: la console è uguale, senza stare fra le lette", () => {
  const es = eseguita(programma(), "non è un numero", "5");
  expect(es.lette).toEqual([{ data: "n", text: "5" }]);
  const r = registrazioneDi(es);
  const x = r.executions[0]!;
  expect("reads" in x && x.reads).toEqual([{ data: "n", text: "non è un numero", rejected: true }, { data: "n", text: "5" }]);
  expect(x.console.map((v) => v.kind)).toEqual(["invalid", "read", "write"]);
  expect(riproduci(r).uguale).toBe(true);
});

test("un'esecuzione ferma a una lettura, con una riga rifiutata, si riproduce fino a quel punto e lì si ferma", () => {
  const es = eseguita(programma(), "non è un numero");
  expect(es.stato).toMatchObject({ genere: "chiede", dato: "n", nonValido: true });
  const r = registrazioneDi(es);
  expect(r.executions[0]!.outcome).toEqual({ kind: "asking", data: "n", invalid: true });
  expect(tuttoIlPercorso(r).uguale).toBe(true);
});

test("una console tagliata resta registrabile: il file dice quante righe ha perso", () => {
  const scrive = {
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "Tante righe" },
    functions: [
      {
        id: "f0",
        kind: "main",
        data: [{ name: "i", type: "integer" }],
        body: [{ id: "b1", kind: "for", counter: "i", from: "1", to: "1100", step: 1, body: [{ id: "b2", kind: "write", values: ["i"], newline: true }] }],
        end: { id: "b3" },
      },
    ],
  } as unknown as Progetto;
  const es = new Esecuzione(scrive, tetti, { tabella: false });
  es.comanda("continua");
  es.fetta(senzaOrologio, Infinity);
  expect(es.stato.genere).toBe("finita");
  const r = registrazioneDi(es);
  expect(r.executions[0]!.console_removed).toBe(es.consoleTolte);
  expect(es.consoleTolte).toBeGreaterThan(0);
  expect(riproduci(r).uguale).toBe(true);
});

test("«out_of_memory» è legato alla macchina: il confronto lo dice, senza chiamarlo una differenza del programma", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const esito = riproduci(alterata(r, (x) => (x.outcome = { kind: "finished", error: { code: "out_of_memory", block: "b2" } })));
  expect(esito.uguale).toBe(false);
  expect(esito.differenze.map((d) => [d.campo, d.dellaMacchina])).toEqual([["outcome", true]]);
});

test("un programma senza righe per una lettura non resta appeso: si ferma, e l'esito lo dice", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const esito = riproduci(alterata(r, (x) => (x.reads = [])));
  expect(esito.uguale).toBe(false);
  expect(esito.differenze.find((d) => d.campo === "outcome")?.riprodotto).toBe(JSON.stringify({ kind: "asking", data: "n", invalid: false }));
});

test("una riga in più nel file, o per un altro dato, la dicono le letture, con la posizione", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const inPiu = riproduci(alterata(r, (x) => (x.reads = [{ data: "n", text: "5" }, { data: "n", text: "6" }])));
  expect(inPiu.differenze.map((d) => [d.campo, d.posizione])).toEqual([["reads", 1]]);
  const altroDato = riproduci(alterata(r, (x) => (x.reads = [{ data: "m", text: "5" }])));
  expect(altroDato.differenze.find((d) => d.campo === "reads")?.posizione).toBe(0);
});

test("una riga che la lettura non ammette, in un file scritto a mano, non esce come un'eccezione", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const esito = riproduci(alterata(r, (x) => (x.reads = [{ data: "n" }])));
  expect(esito.uguale).toBe(false);
  expect(esito.differenze.map((d) => d.campo)).not.toContain("exception");
});

test("un'esecuzione mai cominciata, e una fra due fette dopo una riga data, si riproducono", () => {
  const pronta = new Esecuzione(programma(), tetti, { tabella: false });
  const r = registrazioneDi(pronta);
  expect(r.executions[0]!.outcome).toEqual({ kind: "ready" });
  expect(tuttoIlPercorso(r).uguale).toBe(true);
  const data = new Esecuzione(programma(), tetti, { tabella: false });
  data.comanda("continua");
  data.fetta(senzaOrologio, Infinity);
  data.inserisci("5");
  const f = registrazioneDi(data);
  expect(f.executions[0]!.outcome).toEqual({ kind: "running" });
  expect(tuttoIlPercorso(f).uguale).toBe(true);
});

test("un'eccezione dell'esecuzione è una differenza, non esce dalla riproduzione: è il difetto che si cerca", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const rotta = alterata(r, (_x, t) => (t.long_lines = { characters: 0, mode: "wrap" }));
  const esito = riproduci(rotta);
  expect(esito.uguale).toBe(false);
  expect(esito.differenze.map((d) => d.campo)).toEqual(["exception"]);
});

// --------------------------------------------------------------------------------- i campi e i percorsi

test("il controllo positivo: il rilevatore si accende sulle preferenze con le due cartelle e sul nome del profilo", () => {
  const cartella = join(process.cwd(), "esempi");
  const preferenze = JSON.stringify(fileDa("it", { ...scelteIniziali, cartellaEsempi: cartella, cartellaLibrerie: cartella }), null, 2);
  expect(percorsiEProfilo(preferenze).length).toBeGreaterThan(1);
  expect(percorsiEProfilo(JSON.stringify({ author: userInfo().username })).length).toBe(1);
  expect(percorsiEProfilo(JSON.stringify({ text: String.raw`\\server\cartella` })).length).toBe(1);
  // Testi come quelli del file, senza percorsi, anche con un a capo dopo i due punti: tace.
  expect(percorsiEProfilo(JSON.stringify({ text: "a: 1 / 2, b:3\nvoto:\n", block: "b1" }))).toEqual([]);
});

test("solo i 5 valori, mai un campo in più di chi li passa", () => {
  const conUnaCartella = { ...tetti, cartellaEsempi: "C:/qualcosa" };
  const lunghe = { ...righeLunghePredefinite, cartellaLibrerie: "C:/altro" };
  const es = new Esecuzione(programma(), conUnaCartella, { tabella: false, righeLunghe: lunghe });
  const testo = testoDellaRegistrazione(componi(contestoDiProva, [fotografa(es)]));
  expect(testo).not.toContain("qualcosa");
  expect(testo).not.toContain("altro");
});

test("i valori che cambiano fra due esecuzioni non si scrivono una volta sola: la composizione rifiuta", () => {
  const una = fotografa(eseguita(programma(), "5"));
  const altra = fotografa(new Esecuzione(programma(), { ...tetti, elementiDiUnVettore: 9 }, { tabella: false }));
  expect(() => componi(contestoDiProva, [una, altra])).toThrow();
});

// --------------------------------------------------------------------------- il lettore, lo schema, il testo

const valida = new Ajv2020({ strict: true, allErrors: true }).compile(schemaDellaRegistrazione());

const partenza = () => JSON.parse(testoDellaRegistrazione(registrazioneDi(eseguita(programma(), "5")))) as Record<string, unknown> & { executions: Record<string, unknown>[] };

/** Una sonda per regola di forma: il motivo e il percorso che il lettore deve dire. */
const sonde: readonly (readonly [string, (r: ReturnType<typeof partenza>) => void, string, string])[] = [
  ["un campo sconosciuto nella radice", (r) => (r.percorso = "C:/x"), "percorso", "unknown_field"],
  ["un campo sconosciuto in un'esecuzione", (r) => (r.executions[0]!.colore = 1), "executions[0].colore", "unknown_field"],
  ["un campo sconosciuto nei limiti", (r) => ((r.limits as Record<string, unknown>).cartellaEsempi = "x"), "limits.cartellaEsempi", "unknown_field"],
  ["un campo sconosciuto in un esito", (r) => ((r.executions[0]!.outcome as Record<string, unknown>).colore = 1), "executions[0].outcome.colore", "unknown_field"],
  ["un campo sconosciuto in una riga della console", (r) => (((r.executions[0]!.console as Record<string, unknown>[])[0]!).colore = 1), "executions[0].console[0].colore", "unknown_field"],
  ["un formato diverso", (r) => (r.format = "algodesign"), "format", "invalid_value"],
  ["una versione sconosciuta", (r) => (r.schema_version = 2), "schema_version", "unknown_schema_version"],
  ["una versione che non è un intero", (r) => (r.schema_version = "1"), "schema_version", "wrong_type"],
  ["senza la versione del prodotto", (r) => delete r.product_version, "product_version", "missing_field"],
  ["una lingua sconosciuta", (r) => (r.language = "fr"), "language", "invalid_value"],
  ["un sistema sconosciuto", (r) => (r.system = "Windows 11 di Mario"), "system", "invalid_value"],
  ["un limite a zero", (r) => ((r.limits as Record<string, unknown>).vector_elements = 0), "limits.vector_elements", "invalid_value"],
  ["i caratteri di una riga a zero", (r) => ((r.long_lines as Record<string, unknown>).characters = 0), "long_lines.characters", "invalid_value"],
  ["un modo sconosciuto delle righe lunghe", (r) => ((r.long_lines as Record<string, unknown>).mode = "a-capo"), "long_lines.mode", "invalid_value"],
  ["senza esecuzioni", (r) => (r.executions = []), "executions", "invalid_value"],
  ["un progetto invalido", (r) => delete (r.executions[0]!.project as Record<string, unknown>).metadata, "executions[0].project.metadata", "missing_field"],
  ["un campo sconosciuto nel progetto", (r) => ((r.executions[0]!.project as Record<string, unknown>).colore = 1), "executions[0].project.colore", "unknown_field"],
  ["senza le letture", (r) => delete r.executions[0]!.reads, "executions[0].reads", "missing_field"],
  ["le letture insieme al caso", (r) => (r.executions[0]!.test_case = { name: "x", inputs: [], expected: { output: "" } }), "executions[0].reads", "field_not_allowed"],
  ["un esito di genere sconosciuto", (r) => ((r.executions[0]!.outcome as Record<string, unknown>).kind = "boh"), "executions[0].outcome.kind", "invalid_value"],
  ["un errore sconosciuto", (r) => (r.executions[0]!.outcome = { kind: "finished", error: { code: "boh", block: "b1" } }), "executions[0].outcome.error.code", "invalid_value"],
  ["una pausa senza il blocco", (r) => (r.executions[0]!.outcome = { kind: "paused", depth: 0 }), "executions[0].outcome.block", "missing_field"],
  ["avanzamenti negativi", (r) => (r.executions[0]!.advances = -1), "executions[0].advances", "invalid_value"],
];

test("il testo si riapre uguale, a due spazi con un a capo finale, senza BOM; e un BOM in testa si accetta", () => {
  const r = registrazioneDi(eseguita(programma(), "5"));
  const testo = testoDellaRegistrazione(r);
  expect(testo.endsWith("}\n")).toBe(true);
  expect(testo.charCodeAt(0)).not.toBe(0xfeff);
  const aperta = apriRegistrazione(testo);
  expect(aperta.ok && testoDellaRegistrazione(aperta.registrazione)).toBe(testo);
  expect(apriRegistrazione(String.fromCharCode(0xfeff) + testo).ok).toBe(true);
});

test("il lettore e lo schema accettano la partenza: il controllo positivo delle sonde", () => {
  expect(leggiRegistrazione(partenza()).ok).toBe(true);
  expect(valida(partenza())).toBe(true);
});

test("ogni file sbagliato nella forma è rifiutato col motivo, e dallo schema", () => {
  const diversi: string[] = [];
  for (const [nome, f, percorso, motivo] of sonde) {
    const r = partenza();
    f(r);
    const letto = leggiRegistrazione(r);
    const detto = letto.ok ? [] : letto.errori;
    if (!detto.some((e) => e.percorso === percorso && e.motivo === motivo)) diversi.push(`${nome}: ${JSON.stringify(detto)}`);
    if (valida(r)) diversi.push(`${nome}: lo schema l'accetta`);
  }
  expect(diversi).toEqual([]);
});

test("le regole che lo schema non sa dire le rifiuta solo il lettore: la funzione che non c'è, la chiave ripetuta", () => {
  const r = partenza();
  r.executions[0]!.function = "non c'è";
  const letto = leggiRegistrazione(r);
  expect(letto.ok ? [] : letto.errori).toEqual([{ percorso: "executions[0].function", motivo: "invalid_value" }]);
  expect(valida(r)).toBe(true);
  const testo = testoDellaRegistrazione(registrazioneDi(eseguita(programma(), "5"))).replace('"language": "it",', '"language": "it",\n  "language": "it",');
  const aperta = apriRegistrazione(testo);
  expect(aperta.ok ? [] : aperta.errori).toEqual([{ percorso: "language", motivo: "duplicate_key" }]);
  expect(apriRegistrazione("non è json")).toEqual({ ok: false, errori: [{ percorso: "", motivo: "invalid_json" }] });
});
