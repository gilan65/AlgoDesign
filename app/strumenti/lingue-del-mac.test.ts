// Le lingue dichiarate a macOS: `shell/Info.plist` uguale alle lingue dell'interfaccia nei due versi, la lettura
// dell'uscita di `PlistBuddy`, e il confronto della clausola BUILD del Mac (`archivio.ts`) che si accende sull'app della
// 1.0.0, che non le dichiarava.
import { expect, test } from "bun:test";
import { dizionari } from "../i18n/lingue";
import { difettoDelleLingue, infoPlistDaFondere, lingueDichiarate, lingueDiPlistBuddy } from "./lingue-del-mac";

test("shell/Info.plist dichiara a macOS le lingue dell'interfaccia, né una di più né una di meno", () => {
  const dichiarate = lingueDichiarate(infoPlistDaFondere());
  expect(dichiarate).not.toBeNull();
  const interfaccia = Object.keys(dizionari);
  expect(interfaccia.filter((l) => !dichiarate!.includes(l))).toEqual([]);
  expect(dichiarate!.filter((l) => !interfaccia.includes(l))).toEqual([]);
});

test("la lettura di PlistBuddy e la clausola: rossa sull'app senza la chiave e su una lingua mancante, muta sulla dichiarazione", () => {
  const dichiarate = lingueDichiarate(infoPlistDaFondere());
  expect(lingueDiPlistBuddy("Array {\n    en\n    it\n}\n")).toEqual(["en", "it"]);
  // L'app della 1.0.0: PlistBuddy non trova la chiave e non stampa nulla.
  expect(difettoDelleLingue(lingueDiPlistBuddy(""), dichiarate)).toContain("(nessuna)");
  expect(difettoDelleLingue(["en"], dichiarate)).toContain("«en»");
  expect(difettoDelleLingue(dichiarate!, dichiarate)).toBeNull();
  expect(difettoDelleLingue(["en", "it"], lingueDichiarate("<plist><dict></dict></plist>"))).toContain("non dichiara");
});
