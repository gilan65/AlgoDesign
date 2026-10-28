// I dati che le voci di un caso possono nominare fuori dalla radice (`datiLettiAltrove`): sul corpus e su una lettura in
// un dato di lavoro di una procedura chiamata, che il corpus non ha (lo misura la prima prova).
//
// - La sonda nasce da `lettura-attraverso-riferimento` del corpus: la procedura `leggi` legge in un suo dato di lavoro
//   (`riga`) e lo copia nel parametro di uscita; la voce del caso del programma nomina `riga`, e il caso è raggiunto
//   (la regola del formato), anche nei casi della procedura di mezzo (`chiedi`).
// - Sul corpus delle tappe 1, 2 e 3 nessuna radice ha dati letti altrove (le procedure che leggono lo fanno in un parametro di uscita, che
//   nomina il dato di chi chiama); controllo positivo: le stesse letture contate coi parametri ci sono, quattro radici.
//
// Che cosa NON guarda: l'editor dei casi (lo guarda `ui/casi/casi.test.tsx`); la rinomina (`modifica/operazioni.test.ts`).

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tetti } from "../controllo/controllo";
import { apri } from "../progetto/formato";
import type { Progetto } from "../progetto/modello";
import { conUnaLetturaNelDatoDiLavoro as dalCorpus } from "./casi-di-prova";
import { eseguiCaso } from "./esecutore";
import { datiLettiAltrove } from "./voci";

const cartella = join(import.meta.dir, "..", "..", "casi");
const daFile = (nome: string): Progetto => {
  const a = apri(readFileSync(join(cartella, nome), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};
const conUnaLetturaNelDatoDiLavoro = () => dalCorpus(daFile("tappa-3/lettura-attraverso-riferimento.algo"));

test("una lettura nel dato di lavoro di una procedura chiamata: la voce lo nomina, e i casi del programma e della procedura di mezzo sono raggiunti", () => {
  const p = conUnaLetturaNelDatoDiLavoro();
  const chiedi = p.functions.find((f) => f.name === "chiedi")!;
  const esiti = [eseguiCaso(p, p.test_cases![0]!, tetti), eseguiCaso(p, chiedi.test_cases![0]!, tetti, chiedi.id)];
  expect(esiti.map((e) => !e.fuoriTappa && e.raggiunto)).toEqual([true, true]);
  // La regola che si regge: con la voce di un altro nome il caso si ferma sulla lettura.
  const altro = eseguiCaso(p, { ...p.test_cases![0]!, inputs: [{ data: "n", text: "21" }] }, tetti);
  expect(!altro.fuoriTappa && altro.ottenuto.error?.code).toBe("input_mismatch");
});

test("una lettura nel parametro per valore di una procedura chiamata: il parametro è fra i dati letti altrove, e la rinomina segue le voci", async () => {
  const { leggi } = await import("../progetto/formato");
  const { rinominaDato } = await import("../modifica/operazioni");
  const a = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    functions: [
      { id: "f1", kind: "main", data: [], body: [{ id: "b1", kind: "call", callee: "chiedi", arguments: ["1"] }], end: { id: "b2" } },
      { id: "f2", kind: "procedure", name: "chiedi", data: [{ name: "n", type: "integer", parameter: "value" }], body: [{ id: "b3", kind: "read", target: "n" }, { id: "b4", kind: "write", values: ["n"], newline: true }], end: { id: "b5" } },
    ],
    test_cases: [{ name: "sette", inputs: [{ data: "n", text: "7" }], expected: { output: "7\n" } }],
  });
  if (!a.ok) throw new Error(JSON.stringify(a.errori));
  const p = a.progetto;
  const r = rinominaDato(0, "m", "f2")(p, 100);
  if (!r.ok) throw new Error(JSON.stringify(r.rifiuto));
  const esito = eseguiCaso(p, p.test_cases![0]!, tetti);
  expect({ altrove: datiLettiAltrove(p, "f1"), raggiunto: !esito.fuoriTappa && esito.raggiunto, voci: r.progetto.test_cases![0]!.inputs.map((v) => v.data) }).toEqual({
    altrove: [{ funzione: "f2", nome: "chiedi", dati: ["n"] }],
    raggiunto: true,
    voci: ["m"],
  });
});

test("i dati letti altrove: dal programma e dalla procedura di mezzo il dato di lavoro di `leggi`; da `leggi` nessuno", () => {
  const p = conUnaLetturaNelDatoDiLavoro();
  const id = (nome?: string) => p.functions.find((f) => f.name === nome)!.id;
  expect([undefined, "chiedi", "leggi"].map((n) => datiLettiAltrove(p, id(n)))).toEqual([
    [{ funzione: id("leggi"), nome: "leggi", dati: ["riga"] }],
    [{ funzione: id("leggi"), nome: "leggi", dati: ["riga"] }],
    [],
  ]);
  // Un dato di lavoro che nessuna lettura riceve non c'è; una procedura che la radice non raggiunge nemmeno.
  const conAltri = {
    ...p,
    functions: [
      ...p.functions.map((f) => (f.name === "leggi" ? { ...f, data: [...f.data, { name: "inutile", type: "integer" as const }] } : f)),
      { id: "f9", kind: "procedure" as const, name: "isolata", data: [{ name: "x", type: "integer" as const }], body: [{ id: "b20", kind: "read" as const, target: "x" }], end: { id: "b21" } },
    ],
  };
  expect(datiLettiAltrove(conAltri, id())).toEqual([{ funzione: id("leggi"), nome: "leggi", dati: ["riga"] }]);
  // Attraverso un parametro di uscita: un dato di lavoro di `chiedi` passato a `leggi` è letto anche lui.
  const diMezzo = {
    ...p,
    functions: p.functions.map((f) =>
      f.name === "chiedi"
        ? { ...f, data: [...f.data, { name: "tmp", type: "integer" as const }], body: [{ id: "b4", kind: "call" as const, callee: "leggi", arguments: ["tmp"] }, { id: "b9", kind: "assignment" as const, target: "numero", value: "tmp" }] }
        : f.name === "leggi"
          ? daFile("tappa-3/lettura-attraverso-riferimento.algo").functions[2]!
          : f,
    ),
  };
  expect(datiLettiAltrove(diMezzo, id())).toEqual([{ funzione: id("chiedi"), nome: "chiedi", dati: ["tmp"] }]);
});

test("sul corpus nessuna radice ha dati letti altrove; controllo positivo: le letture nei parametri ci sono", () => {
  const radici: string[] = [];
  const conDati: string[] = [];
  let letture = 0;
  for (const tappa of ["tappa-1", "tappa-2", "tappa-3", "tappa-4"])
    for (const f of readdirSync(join(cartella, tappa)).filter((x) => x.endsWith(".algo"))) {
      const p = daFile(`${tappa}/${f}`);
      for (const x of p.functions) {
        radici.push(`${tappa}/${f}#${x.name ?? "programma"}`);
        if (datiLettiAltrove(p, x.id).length > 0) conDati.push(radici.at(-1)!);
        // Le stesse procedure raggiunte, con le letture nei parametri: il rilevatore sa accendersi sul corpus.
        if (x.kind !== "procedure" && x.kind !== "main") continue;
        const coiParametri = { ...p, functions: p.functions.map((g) => ({ ...g, data: g.data.map(({ parameter: _, ...d }) => d) })) };
        if (datiLettiAltrove(coiParametri, x.id).length > 0) letture++;
      }
    }
  console.log(`dati letti altrove sul corpus: radici ${radici.length}, con dati ${conDati.length}; coi parametri come dati di lavoro ${letture}`);
  expect(conDati).toEqual([]);
  expect(letture).toBe(4);
  expect(radici.length).toBe(254);
});
