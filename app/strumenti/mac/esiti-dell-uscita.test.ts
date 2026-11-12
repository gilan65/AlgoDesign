import { expect, test } from "bun:test";
import { casiDellUscita, controllaGliEsiti } from "./esiti-dell-uscita";

/** Una riga col suo atteso, come la scrive `prova-uscita.sh`: i casi con «morta» dove l'app deve uscire. */
const attesa = (caso: string) => (caso.includes("barra") ? "x, y" : caso === "campi" ? "«abcabc»" : caso.endsWith("non-salvare") || caso === "senza-modifiche" ? "morta" : "viva");
const verde = () => casiDellUscita.map((c) => `${c}: ${attesa(c)} (attes${c === "campi" ? "o" : "a"}: ${attesa(c)})`);

test("tutti i casi col loro atteso: verde", () => {
  expect(casiDellUscita.length).toBe(16);
  expect(controllaGliEsiti(verde().join("\n"))).toEqual({ rossi: [], visti: 16 });
});

test("un esito alterato è rosso, e si nomina", () => {
  const righe = verde().map((r) => (r.startsWith("cmdq: ") ? "cmdq: morta (attesa: viva)" : r));
  expect(controllaGliEsiti(righe.join("\n")).rossi).toEqual(["cmdq: morta invece di viva"]);
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
  expect(controllaGliEsiti("").rossi.length).toBe(16);
});
