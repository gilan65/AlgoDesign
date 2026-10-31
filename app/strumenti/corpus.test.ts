// I conteggi del corpus dichiarati (`strumenti/conteggi-del-corpus.json`, scritti da `bun run conferma-corpus`) uguali a
// quelli del disco, e il censimento delle prove che leggono il corpus. Rossa la prima: il corpus è cambiato dopo
// l'ultima conferma, e le prove che lo contano non l'hanno ancora visto.
//
// Che cosa NON guarda: gli attesi scritti a mano nelle prove del censimento (li esegue la conferma).

import { expect, test } from "bun:test";
import { censimento, differenze, leggeIlCorpus, leggiIConteggi, misuraIlCorpus } from "./corpus";

test("i conteggi dichiarati del corpus sono quelli del disco (se no: bun run conferma-corpus)", () => {
  const misurati = misuraIlCorpus();
  console.log(`corpus: ${JSON.stringify(misurati.file)}, tipi ${JSON.stringify(misurati.tipi)}`);
  // Le premesse: il rilevatore ha visto ogni specie, e le cartelle fanno il totale.
  expect(Object.values(misurati.tipi).every((n) => n > 0)).toBe(true);
  expect(Object.entries(misurati.file).reduce((s, [k, n]) => (k === "totale" ? s : s + n), 0)).toBe(misurati.file.totale!);
  expect(differenze(leggiIConteggi().fatti, misurati)).toEqual([]);
  // Controllo positivo: un file in più e una matrice in meno, dichiarati, sono due differenze.
  const altri = { ...misurati, file: { ...misurati.file, tipi: misurati.file.tipi! + 1 }, tipi: { ...misurati.tipi, matrici: misurati.tipi.matrici - 1 } };
  expect(differenze(altri, misurati)).toHaveLength(2);
});

test("il censimento trova le prove che leggono il corpus, anche gli spec di Playwright", () => {
  const c = censimento();
  console.log(`censimento: ${c.guardati} file guardati, ${c.bun.length} di bun test e ${c.playwright.length} spec di Playwright leggono il corpus`);
  // Occorrenze vere e stabili: lo spec dell'apertura e del salvataggio, la prova di «Accademico» su tutto il corpus; e
  // una prova che chiama `readdirSync` sui sorgenti del nucleo, non sul corpus.
  expect(c.playwright).toContain("e2e/progetto-file.e2e.ts");
  expect(c.bun).toContain("ui/genera/accademico.test.ts");
  expect(c.bun).not.toContain("i18n/codici.test.ts");
  // Il rilevatore: la chiamata con una cartella del corpus sì; la chiamata senza, o la cartella senza la chiamata, no.
  const chiama = "readdir" + "Sync(";
  expect([leggeIlCorpus(`${chiama}join(radice, "casi", "tipi"))`), leggeIlCorpus(`${chiama}cartella)`), leggeIlCorpus('join("casi", "tipi")')]).toEqual([true, false, false]);
});
