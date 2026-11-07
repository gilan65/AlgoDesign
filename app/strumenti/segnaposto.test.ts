// Il rilevatore dei segnaposto, comune ai due strumenti dei pacchetti, sui documenti veri che i pacchetti copiano così come
// sono: nessuno ha un segnaposto, e almeno uno ha il valore di una matrice (il caso che aveva fatto divergere i due
// rilevatori). Che cosa NON guarda: i testi di `rilascio/`, che hanno i segnaposto per costruzione (li sostituisce lo
// strumento, che rifiuta quelli rimasti).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { documentiDellaRadice, documentiDelPacchetto, guidaAdAccademico, guidaDelloStrumento, guidePerSegnalare } from "./elenco-del-pacchetto";
import { segnapostoRimasto, sondaDeiSegnaposto, sostituisci } from "./segnaposto";

const repository = join(import.meta.dir, "..", "..");
const copiati = [...[...documentiDelPacchetto, guidaAdAccademico, guidaDelloStrumento, ...guidePerSegnalare].map((d) => join("docs", d)), ...documentiDellaRadice];

test("il rilevatore vede i segnaposto e non i valori delle matrici", () => {
  expect(sondaDeiSegnaposto()).toBeNull();
  expect(segnapostoRimasto("Versione {{versione}} {{delData}}")).toBe("{{versione}}");
  expect(segnapostoRimasto("m ← {{1, 2}, {3, 4}}")).toBeNull();
  expect(sostituisci("{{versione}} {{delData}} {{date}}", { versione: "1.0.0", delData: "del 7 novembre 2026", date: "7 November 2026" })).toBe("1.0.0 del 7 novembre 2026 7 November 2026");
});

test("i documenti che i pacchetti copiano così come sono non hanno segnaposti, e uno ha il valore di una matrice", () => {
  const testi = copiati.map((f) => [f, readFileSync(join(repository, f), "utf8")] as const);
  expect(testi.map(([f, t]) => [f, segnapostoRimasto(t)])).toEqual(testi.map(([f]) => [f, null]));
  // Controllo della premessa: il caso che il vecchio controllo di Linux (ogni «{{») rifiutava c'è davvero nel corpus.
  expect(testi.filter(([, t]) => t.includes("{{")).length).toBeGreaterThan(0);
});
