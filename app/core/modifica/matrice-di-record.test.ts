// Una funzione che restituisce un record con la forma «matrice»: le colonne date restano, e il controllo dice l'errore che dà a un dato e a una funzione scritta in un file,
// invece di una tabella fatta in silenzio. Un file suo, senza il corpus: il progetto è scritto qui.
//
// Che cosa NON guarda: la finestra della funzione (manda le colonne quando la forma è «matrice»), le altre misure (`funzioni.test.ts`).

import { expect, test } from "bun:test";
import { controlla, tetti } from "../controllo/controllo";
import { leggi } from "../progetto/formato";
import type { Progetto } from "../progetto/modello";
import { proprietaDellaFunzione } from "./funzioni";
import { primoLibero } from "./identificatori";

function progetto(): Progetto {
  const e = leggi({
    format: "algodesign",
    schema_version: 2,
    metadata: { name: "prova" },
    records: [{ name: "alunno", fields: [{ name: "nome", type: "string" }, { name: "voto", type: "integer" }] }],
    functions: [
      { id: "f1", kind: "main", data: [], body: [], end: { id: "b1" } },
      { id: "f2", kind: "function", name: "migliore", return_type: "record", return_record: "alunno", data: [{ name: "a", type: "record", record: "alunno" }], body: [], end: { id: "b2", return_value: "a" } },
    ],
  });
  if (!e.ok) throw new Error(JSON.stringify(e.errori));
  return e.progetto;
}

const cause = (q: Progetto) => {
  const c = controlla(q, tetti);
  return c.fuoriTappa ? [] : c.fermate.filter((f) => f.block === "f2").map((f) => [f.code, f.fermata.causa]);
};

test("un record con le colonne date non diventa in silenzio una tabella: le colonne restano, e il controllo dice l'errore della matrice di record, come per un dato", () => {
  const p = progetto();
  const r = proprietaDellaFunzione("f2", { genere: "function", tipo: "record", record: "alunno", dimensione: 3, colonne: 4 })(p, primoLibero(p));
  expect(r.ok && r.progetto.functions[1]).toMatchObject({ return_type: "record", return_size: 3, return_columns: 4 });
  expect(r.ok && cause(r.progetto)).toContainEqual(["invalid_data_item", "matrice_di_record"]);
  // Il controllo positivo: senza le colonne, una tabella di 3 record, senza quell'errore.
  const tabella = proprietaDellaFunzione("f2", { genere: "function", tipo: "record", record: "alunno", dimensione: 3, colonne: null })(p, primoLibero(p));
  expect(tabella.ok && tabella.progetto.functions[1]!.return_columns).toBeUndefined();
  expect(tabella.ok && tabella.progetto.functions[1]!.return_size).toBe(3);
  expect(tabella.ok && cause(tabella.progetto).some(([, causa]) => causa === "matrice_di_record")).toBe(false);
});
