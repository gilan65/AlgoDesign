// La versione minima di macOS: dichiarata in tauri.conf.json uguale alla misura, e il confronto della clausola BUILD del Mac
// (`archivio.ts`) che si accende sul valore predefinito di Tauri, quello che portavano le app fino alla 1.0.0.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { configurazioneDiTauri, difettoDelMinimo, MINIMO_MISURATO, minimoDichiarato } from "./minimo-del-mac";

test("tauri.conf.json dichiara il minimo misurato", () => {
  expect(minimoDichiarato(configurazioneDiTauri())).toBe(MINIMO_MISURATO);
});

test("i testi che dicono il minimo di macOS dicono il minimo misurato, ognuno almeno una volta", () => {
  // «13.3 o successivo», «13.3 Ventura or later», «da macOS 13.3 in poi»: la versione prima delle parole del minimo.
  const minimi = (t: string) => [...t.matchAll(/macOS\** (\d+\.\d+)(?: [A-Z][a-z]+)?\**? (?:o successivo|or later|in poi)/g)].map((m) => m[1]!);
  const radice = join(import.meta.dir, "..", "..");
  const testi = ["README.md", "LEGGIMI.md", ...["ALGODESIGN-PER-MAC.md", "NOTE-DI-RILASCIO.md", "LEGGIMI-DI-ALGODESIGN-TOOLS.md", "README-OF-ALGODESIGN-TOOLS.md"].map((f) => join("rilascio", "macos", f))];
  const trovati = testi.map((f) => [f, [...new Set(minimi(readFileSync(join(radice, f), "utf8")))]]);
  expect(trovati).toEqual(testi.map((f) => [f, [MINIMO_MISURATO]]));
  // Controllo positivo: un altro numero si vede, nelle tre forme.
  expect(minimi("per macOS 14.0 o successivo; macOS 12.6 Monterey or later; da macOS 15.1 in poi; **per macOS** 11.2 o successivo; Python 3.11 or later")).toEqual(["14.0", "12.6", "15.1", "11.2"]);
});

test("la clausola si accende sul minimo predefinito di Tauri e su una dichiarazione assente, tace sul minimo dichiarato", () => {
  const dichiarato = minimoDichiarato(configurazioneDiTauri());
  expect(difettoDelMinimo("10.13", dichiarato)).toContain("«10.13»");
  expect(difettoDelMinimo("10.13", minimoDichiarato({ bundle: {} }))).toContain("non dichiara");
  expect(difettoDelMinimo(MINIMO_MISURATO, dichiarato)).toBeNull();
});
