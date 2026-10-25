// La posizione della prima differenza fra due testi, che il confronto per byte della prova sul prodotto dà nel suo rosso.
import { expect, test } from "bun:test";
import { primaDifferenza } from "./costruzione";

test("la prima differenza dice il byte, la riga, la colonna e i pezzi che seguono, coi caratteri invisibili in chiaro", () => {
  expect(primaDifferenza("uguale", "uguale")).toBe("");
  expect(primaDifferenza('{\n  "a": 1\n}\n', '{\n  "a": 2\n}\n')).toBe('dal byte 9 (riga 2, colonna 8): "1\\n}\\n" invece di "2\\n}\\n"');
  // Il byte conta l'UTF-8: «è» vale due byte.
  expect(primaDifferenza("è x", "è y")).toBe('dal byte 3 (riga 1, colonna 3): "x" invece di "y"');
  // Un a capo di Windows al posto di uno di Linux, e un BOM in testa: si vedono.
  expect(primaDifferenza("a\r\nb", "a\nb")).toBe('dal byte 1 (riga 1, colonna 2): "\\r\\nb" invece di "\\nb"');
  const bom = String.fromCharCode(0xfeff);
  const fuga = `${String.fromCharCode(92)}ufeff`;
  expect(primaDifferenza(`${bom}{}`, "{}")).toBe(`dal byte 0 (riga 1, colonna 1): "${fuga}{}" invece di "{}"`);
  // Un testo più corto dell'altro: la differenza è dove finisce.
  expect(primaDifferenza("abc", "abcd")).toBe('dal byte 3 (riga 1, colonna 4): "" invece di "d"');
});
