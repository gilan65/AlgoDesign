// Le prove sotto happy-dom non danno a `expect` un elemento del documento da confrontare con `toBeNull()` o `toBe(…)`:
// quando l'asserzione fallisce, `bun test` stampa il valore ricevuto, e con la finestra intera montata quella stampa va
// fuori memoria (`RangeError: Out of memory`, misurato): il fallimento si perde e l'asserzione PASSA. Un elemento che deve
// mancare si guarda come testo (`elemento?.outerHTML ?? null`), due elementi si confrontano coi loro attributi.
//
// Il rilevatore guarda, riga per riga, ogni `expect(…)` dei file `*.test.ts(x)` di `ui/` seguito da `.toBeNull()` o
// `.toBe(…)`, col valore ricevuto fatto da una ricerca di elementi (querySelector, le ricerche di testing-library,
// activeElement, closest, i vicini di un elemento) e non ridotto a un valore semplice (l'HTML, un attributo, il testo,
// una lunghezza, un confronto, `contains`). Questo file no: le sue righe di prova sono testo.
//
// Che cosa NON guarda:
// - le funzioni della prova che restituiscono un elemento sotto un altro nome (`menu()`, `blocco("b1")`): il loro uso si
//   vede solo leggendo la prova, e si cerca a mano a ogni chiusura (alla prima, sette righe con `toEqual`,
//   `toBeUndefined` e `toHaveProperty`, corrette); anche `toBeUndefined()` e `toEqual` stampano ciò che ricevono;
// - `toEqual` con un elemento dentro un oggetto, e un'asserzione spezzata su più righe;
// - `.not.toBeNull()` e `toBeTruthy()`: falliscono ricevendo `null`, che si stampa sempre;
// - le prove nei motori: Playwright confronta Locator, non elementi.
import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ricerca = /querySelector|queryBy|getBy|findBy|activeElement|closest\(|firstElementChild|lastElementChild|parentElement|getElementById/;
const semplice = /outerHTML|getAttribute|textContent|\.length|===|!==|\.value\b|\.checked|\.id\b|\.tagName|\.hidden|\.dataset|\.className|\.contains\(/;
const asserzione = /expect\((.*)\)\.(toBeNull\(\)|toBe\()/;

/** La riga dà a `expect` un elemento da confrontare con `toBeNull()` o `toBe(…)`. */
export function conUnElemento(riga: string): boolean {
  const m = asserzione.exec(riga);
  if (!m || /\.not\.toBeNull/.test(riga)) return false;
  return ricerca.test(m[1]!) && !semplice.test(m[1]!);
}

test("controllo positivo: le righe vere di prima della correzione si riconoscono, quelle corrette no", () => {
  // Alla lettera da `git show HEAD:app/ui/…` prima della correzione (ErroreInatteso.test.tsx:42, Applicazione.test.tsx:151).
  expect(conUnElemento(`  expect(document.querySelector("[data-errore-inatteso]")).toBeNull();`)).toBe(true);
  expect(conUnElemento(`  expect(screen.queryByRole("separator")).toBeNull();`)).toBe(true);
  expect(conUnElemento(`  expect(document.activeElement).toBe(campo);`)).toBe(true);
  expect(conUnElemento(`  expect(document.querySelector("[data-errore-inatteso]")?.outerHTML ?? null).toBeNull();`)).toBe(false);
  expect(conUnElemento(`  expect(document.activeElement?.getAttribute("data-blocco")).toBe("b1");`)).toBe(false);
  expect(conUnElemento(`  expect(screen.queryByRole("separator")).not.toBeNull();`)).toBe(false);
  expect(conUnElemento(`  expect(riga.contains(document.activeElement)).toBe(true);`)).toBe(false);
});

test("nessuna prova sotto happy-dom confronta un elemento con toBeNull() o toBe(…)", () => {
  const radice = import.meta.dir;
  const file = (readdirSync(radice, { recursive: true }) as string[]).filter((f) => /\.test\.tsx?$/.test(f) && f !== "asserzioni.test.ts");
  let asserzioni = 0;
  const trovate: string[] = [];
  for (const f of file) {
    readFileSync(join(radice, f), "utf8")
      .split("\n")
      .forEach((riga, i) => {
        if (asserzione.test(riga)) asserzioni++;
        if (conUnElemento(riga)) trovate.push(`${f}:${i + 1}: ${riga.trim()}`);
      });
  }
  console.log(`file di prova ${file.length}, asserzioni con toBeNull() o toBe(…) ${asserzioni}, con un elemento ${trovate.length}`);
  for (const t of trovate) console.log(t);
  // Premesse: i file e le asserzioni ci sono (un rilevatore che non legge nulla darebbe zero; misurati:
  // 32 file oltre questo, 342 asserzioni).
  expect(file.length).toBeGreaterThan(30);
  expect(asserzioni).toBeGreaterThan(300);
  expect(trovate).toEqual([]);
});
