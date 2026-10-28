// I linguaggi del registro non scrivono ancora i record: ogni generatore rifiuta un progetto giusto che li usa come un
// costrutto fuori tappa (la guardia di `genera`), mai con un'eccezione; un progetto coi record e un errore statico resta
// con gli errori. Il corpus è la cartella dei record, intera.

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { controlla, tetti } from "../../core/controllo/controllo";
import { linguaggi } from "../../core/genera/linguaggi";
import { apri, leggi } from "../../core/progetto/formato";
import { paroleDelloPseudocodice } from "./parole";

const cartella = join(import.meta.dir, "..", "..", "casi", "tipi");
const progetto = (nome: string) => {
  const a = apri(readFileSync(join(cartella, nome), "utf8"));
  if (!a.ok) throw new Error(nome);
  return a.progetto;
};

test("ogni linguaggio rifiuta i record: fuori tappa il progetto giusto, con gli errori quello sbagliato, su ogni file della cartella", () => {
  const file = readdirSync(cartella).filter((f) => f.endsWith(".algo"));
  const esiti = file.map((nome) => {
    const p = progetto(nome);
    const atteso = controlla(p, tetti).fuoriTappa === false && (controlla(p, tetti) as { errori: readonly unknown[] }).errori.length > 0 ? "errori-statici" : "fuori-tappa";
    const ottenuti = linguaggi.map((v) => {
      const g = v.genera(p, tetti, "it", paroleDelloPseudocodice("it"), undefined);
      return g.generato ? "generato" : g.perche;
    });
    return { nome, giusto: ottenuti.every((x) => x === atteso), atteso };
  });
  expect(esiti.filter((e) => !e.giusto)).toEqual([]);
  // Controllo positivo dei denominatori: sei file giusti e cinque sbagliati, ognuno per ogni linguaggio.
  expect([esiti.filter((e) => e.atteso === "fuori-tappa").length, esiti.filter((e) => e.atteso === "errori-statici").length, linguaggi.length]).toEqual([6, 5, 4]);
  // Controllo positivo del rilevatore: un progetto senza record si genera in ogni linguaggio.
  const senza = leggi({ format: "algodesign", schema_version: 2, metadata: { name: "x" }, functions: [{ id: "f1", kind: "main", data: [{ name: "n", type: "integer", initial: "1" }], body: [{ id: "b1", kind: "write", values: ["n"], newline: true }], end: { id: "fine" } }] });
  if (!senza.ok) throw new Error("senza record");
  expect(linguaggi.map((v) => v.genera(senza.progetto, tetti, "it", paroleDelloPseudocodice("it"), undefined).generato)).toEqual(linguaggi.map(() => true));
});
