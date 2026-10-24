// Lo spazio di una chiamata, termine per termine, contro l'atteso scritto a mano dalla misura del C (spazio.ts, in testa):
// i tre esecutori leggono la stessa funzione, quindi un termine sbagliato sposta il tetto uguale dappertutto e il
// differenziale non lo vede. Le mutazioni cambiano un termine alla volta della funzione condivisa: ognuna deve rendere
// rosso almeno un atteso. In più il numero delle chiamate scritto nei messaggi è quello del tetto.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { motivi } from "../genera/motivi";
import { testiDeiCodici } from "../../i18n/codici";
import { leggi } from "../progetto/formato";
import type { Progetto } from "../progetto/modello";
import * as spazio from "./spazio";
import { spazioDiUnaChiamata, tettoDelleChiamate } from "./spazio";

type Json = any;
const intero = (name: string, altro: Json = {}) => ({ name, type: "integer", ...altro });
const stringa = (name: string, max_length: number, altro: Json = {}) => ({ name, type: "string", max_length, ...altro });
const procedura = (id: string, name: string, data: Json[], body: Json[] = []) => ({ id, kind: "procedure", name, data, body, end: { id: `${id}-fine` } });
const funzione = (id: string, name: string, risultato: Json, data: Json[], return_value: string, body: Json[] = []) => ({
  id,
  kind: "function",
  name,
  ...risultato,
  data,
  body,
  end: { id: `${id}-fine`, return_value },
});
const assegna = (id: string, target: string, value: string) => ({ id, kind: "assignment", target, value });

// Una procedura o una funzione per termine; gli attesi a mano accanto.
const p: Progetto = (() => {
  const r = leggi({
    format: "algodesign",
    schema_version: 1,
    metadata: { name: "spazio" },
    functions: [
      { id: "f0", kind: "main", data: [], body: [], end: { id: "f0-fine" } },
      procedura("f1", "dati_semplici", [intero("i"), { name: "x", type: "real" }, { name: "c", type: "character" }, { name: "b", type: "boolean" }]),
      procedura("f2", "stringhe", [stringa("s", 10), { name: "t", type: "string" }]),
      procedura("f3", "vettore", [intero("v", { size: 3 })]),
      procedura("f4", "per_valore", [intero("n", { parameter: "value" }), stringa("s", 10, { parameter: "value" }), intero("v", { size: 5, parameter: "value" })]),
      procedura("f5", "per_riferimento", [intero("a", { parameter: "reference" }), intero("w", { size: 50, parameter: "reference" }), intero("u", { parameter: "out" }), intero("z", { size: 50, parameter: "out" })]),
      funzione("f6", "restituisce_stringa", { return_type: "string", return_max_length: 10 }, [], '"x"'),
      funzione("f7", "restituisce_vettore", { return_type: "integer", return_size: 4 }, [intero("r", { size: 4, initial: { each: "0" } })], "r"),
      funzione("f8", "restituisce_intero", { return_type: "integer" }, [], "1"),
      procedura("f9", "concatena", [stringa("a", 5), stringa("b", 5), stringa("c", 5), stringa("d", 15)], [assegna("b1", "d", "(a + b) + c")]),
      funzione("f10", "corte", { return_type: "string", return_size: 3, return_max_length: 2 }, [stringa("k", 2, { size: 3, initial: { each: '"x"' } })], "k"),
      procedura("f11", "chiama_corte", [stringa("e", 2), intero("q")], [
        assegna("b2", "e", "corte()[0]"),
        { id: "b3", kind: "for_each", item: "e", source: "corte()", body: [assegna("b4", "q", "restituisce_intero()")] },
      ]),
    ],
  });
  if (!r.ok) throw new Error(JSON.stringify(r.errori));
  return r.progetto;
})();

// Gli attesi, scritti a mano: intero 4, reale 8, carattere 4, booleano 1; una stringa 4 · la lunghezza massima + 1 (255
// se non c'è); un vettore gli elementi per la misura; per valore una stringa o un vettore hanno l'indirizzo ricevuto (8)
// più la copia, uno scalare solo sé stesso; per riferimento o di uscita l'indirizzo; il valore restituito stringa o
// vettore; un'area per ogni `+` fra stringhe (4 · la lunghezza massima del suo risultato + 1); una struttura per ogni
// chiamata a una funzione che restituisce una stringa o un vettore.
const attesi: Record<string, number> = {
  dati_semplici: 4 + 8 + 4 + 1,
  stringhe: 41 + 1021,
  vettore: 12,
  per_valore: 4 + (8 + 41) + (8 + 20),
  per_riferimento: 8 + 8 + 8 + 8,
  restituisce_stringa: 41,
  restituisce_vettore: 16 + 16,
  restituisce_intero: 0,
  // a, b, c 21 ciascuna, d 61; (a + b) è lunga al più 10 (41), (a + b) + c al più 15 (61).
  concatena: 21 * 3 + 61 + 41 + 61,
  // il risultato, 3 stringhe lunghe al più 2 (3 · 9 = 27), e il dato k uguale.
  corte: 27 + 27,
  // e 9, q 4; due chiamate di «corte» (27 ciascuna); quella di «restituisce_intero» nulla.
  chiama_corte: 9 + 4 + 27 + 27,
};

const misurati = (s: typeof spazio) => Object.fromEntries(p.functions.flatMap((f) => (f.kind === "main" ? [] : [[f.name!, s.spazioDiUnaChiamata(f, p)]])));

describe("lo spazio di una chiamata, termine per termine", () => {
  test("ogni termine uguale all'atteso scritto a mano", () => {
    expect(misurati(spazio)).toEqual(attesi);
  });

  test("il numero delle chiamate nei messaggi è quello del tetto, nell'interfaccia e nel codice generato", () => {
    const testi = [motivi.it.recursion_too_deep, motivi.en.recursion_too_deep, testiDeiCodici.it.recursion_too_deep.breve, testiDeiCodici.en.recursion_too_deep.breve];
    for (const t of testi) expect(t.match(/\d+/g)).toEqual([String(tettoDelleChiamate)]);
    expect(spazioDiUnaChiamata(p.functions[1]!, p)).toBeGreaterThan(0);
  });

  // Ogni mutazione cambia un termine della funzione condivisa: un atteso deve diventare rosso. Controllo positivo: la
  // copia senza mutazioni dà gli attesi.
  const sorgente = readFileSync(join(import.meta.dir, "spazio.ts"), "utf8");
  const nucleo = join(import.meta.dir, "..").replaceAll("\\", "/");
  for (const [nome, vecchio, nuovo] of [
    ["nessuna (controllo positivo)", "", ""],
    ["un intero di 2 byte", "integer: 4,", "integer: 2,"],
    ["un reale di 4 byte", "real: 8,", "real: 4,"],
    ["un carattere di 1 byte", "character: 4,", "character: 1,"],
    ["un booleano di 4 byte", "boolean: 1 }", "boolean: 4 }"],
    ["la stringa senza il terminatore", "4 * (lunghezza ?? lunghezzaPredefinita) + 1", "4 * (lunghezza ?? lunghezzaPredefinita)"],
    ["un indirizzo di 4 byte", "const indirizzo = 8;", "const indirizzo = 4;"],
    ["il riferimento senza l'indirizzo", "return somma + indirizzo;", "return somma;"],
    ["la copia senza l'indirizzo ricevuto", "return somma + indirizzo + byteDelDato(d);", "return somma + byteDelDato(d);"],
    ["il valore restituito non contato", "return dati + restituito + aree(f, p);", "return dati + aree(f, p);"],
    ["le aree non contate", "return dati + restituito + aree(f, p);", "return dati + restituito;"],
    ["la concatenazione senza il terminatore", "byte += 4 * lunghezzaMassima(e, datoDi, funzioneDi) + 1;", "byte += 4 * lunghezzaMassima(e, datoDi, funzioneDi);"],
    ["la struttura restituita non contata", 'if (e.genere === "chiamata") {', "if (false) {"],
  ] as const)
    test(`mutazione dello spazio: ${nome}`, async () => {
      if (vecchio !== "") expect(sorgente.split(vecchio).length - 1).toBe(1);
      const cartella = mkdtempSync(join(tmpdir(), "spazio-"));
      try {
        const file = join(cartella, "mutante.ts");
        writeFileSync(file, sorgente.replace(vecchio, nuovo).replaceAll('from "../', `from "${nucleo}/`).replaceAll('from "./', `from "${nucleo}/controllo/`));
        const mutante: typeof spazio = await import(file);
        const m = misurati(mutante);
        const diversi = Object.keys(attesi).filter((k) => m[k] !== attesi[k]);
        console.log(`mutazione dello spazio «${nome}»: attesi diversi ${diversi.length} (${diversi.join(", ")})`);
        if (vecchio === "") expect(diversi).toEqual([]);
        else expect(diversi.length).toBeGreaterThan(0);
      } finally {
        rmSync(cartella, { recursive: true, force: true });
      }
    });
});
