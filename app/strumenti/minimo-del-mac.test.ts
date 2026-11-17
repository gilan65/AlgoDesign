// La versione minima di macOS: dichiarata in tauri.conf.json uguale alla misura, e il confronto della clausola BUILD del Mac
// (`archivio.ts`) che si accende sul valore predefinito di Tauri, quello che portavano le app fino alla 1.0.0.
import { expect, test } from "bun:test";
import { configurazioneDiTauri, difettoDelMinimo, MINIMO_MISURATO, minimoDichiarato } from "./minimo-del-mac";

test("tauri.conf.json dichiara il minimo misurato", () => {
  expect(minimoDichiarato(configurazioneDiTauri())).toBe(MINIMO_MISURATO);
});

test("la clausola si accende sul minimo predefinito di Tauri e su una dichiarazione assente, tace sul minimo dichiarato", () => {
  const dichiarato = minimoDichiarato(configurazioneDiTauri());
  expect(difettoDelMinimo("10.13", dichiarato)).toContain("«10.13»");
  expect(difettoDelMinimo("10.13", minimoDichiarato({ bundle: {} }))).toContain("non dichiara");
  expect(difettoDelMinimo(MINIMO_MISURATO, dichiarato)).toBeNull();
});
