import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { attesiDellUscita, casiDellUscita, controllaGliEsiti } from "./esiti-dell-uscita";

/** Le righe verdi, come le scrive `prova-uscita.sh`: l'esito uguale all'atteso dell'elenco. */
const verde = () => casiDellUscita.map((c) => `${c}: ${attesiDellUscita[c]} (attes${c === "campi" ? "o" : "a"}: ${attesiDellUscita[c]})`);

test("tutti i casi col loro atteso: verde", () => {
  expect(controllaGliEsiti(verde().join("\n"))).toEqual({ rossi: [], visti: casiDellUscita.length });
});

test("un esito alterato è rosso, e si nomina", () => {
  const righe = verde().map((r) => (r.startsWith("cmdq: ") ? "cmdq: morta (attesa: viva)" : r));
  expect(controllaGliEsiti(righe.join("\n")).rossi).toEqual(["cmdq: morta invece di viva"]);
});

test("un atteso cambiato nello script, con l'esito che gli dà ragione, è rosso", () => {
  const righe = verde().map((r) => (r.startsWith("senza-modifiche: ") ? "senza-modifiche: viva (attesa: viva)" : r));
  expect(controllaGliEsiti(righe.join("\n")).rossi).toEqual(["senza-modifiche: lo script si aspetta «viva» invece di «morta»"]);
});

test("un caso che non è partito è rosso due volte: la riga senza atteso e il caso che manca", () => {
  const righe = verde().map((r) => (r.startsWith("menu: ") ? "menu: NON PARTITA" : r));
  expect(controllaGliEsiti(righe.join("\n")).rossi).toEqual(["riga senza atteso: «menu: NON PARTITA»", "manca il caso «menu»"]);
});

test("un caso sparito, uno ripetuto, uno sconosciuto: rossi", () => {
  const tolto = verde().filter((r) => !r.startsWith("campi: "));
  expect(controllaGliEsiti(tolto.join("\n")).rossi).toEqual(["manca il caso «campi»"]);
  expect(controllaGliEsiti([...verde(), verde()[0]!].join("\n")).rossi).toEqual(["caso ripetuto: «senza-modifiche»"]);
  expect(controllaGliEsiti([...verde(), "altro: viva (attesa: viva)"].join("\n")).rossi).toEqual(["caso che l'elenco non conosce: «altro»"]);
});

test("un testo vuoto non è verde", () => {
  expect(controllaGliEsiti("").rossi.length).toBe(casiDellUscita.length);
});

/** Le coppie caso e atteso scritte nello script: `esito <caso> <atteso>`, `non_salvare <caso>` (morta),
 * `barra <caso> "<atteso>"` e la riga dei campi. */
export function attesiDelloScript(testo: string): Record<string, string> {
  const coppie: [string, string][] = [];
  for (const riga of testo.split("\n").map((r) => r.trim())) {
    let m: RegExpExecArray | null;
    if ((m = /^esito ([a-z-]+) (\S+)$/.exec(riga))) coppie.push([m[1]!, m[2]!]);
    else if ((m = /^non_salvare ([a-z-]+)$/.exec(riga))) coppie.push([`${m[1]}-non-salvare`, "morta"]);
    else if ((m = /^barra ([a-z-]+) "([^"]*)"$/.exec(riga))) coppie.push([m[1]!, m[2]!]);
    else if ((m = /^echo "(campi): .*\(atteso: (.*)\)" \|/.exec(riga))) coppie.push([m[1]!, m[2]!]);
  }
  return Object.fromEntries(coppie.sort(([a], [b]) => (a < b ? -1 : 1)));
}

test("gli attesi scritti in prova-uscita.sh sono quelli dell'elenco, caso per caso, nei due versi", () => {
  const script = readFileSync(join(import.meta.dir, "prova-uscita.sh"), "utf8");
  const ordinati = Object.fromEntries(Object.entries(attesiDellUscita).sort(([a], [b]) => (a < b ? -1 : 1)));
  expect(attesiDelloScript(script)).toEqual(ordinati);
  // Controllo positivo: un atteso cambiato nello script si vede.
  expect(attesiDelloScript(script.replace("esito cmdw viva", "esito cmdw morta")).cmdw).toBe("morta");
});
