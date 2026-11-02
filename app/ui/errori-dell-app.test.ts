// Il punto unico degli errori dell'app, sotto happy-dom: ogni via scrive nell'elenco col percorso già tolto, una sola volta, e le chiamate
// alla console fuori dalle prove passano tutte di qui.
//
// Che cosa NON guarda: gli errori veri di una pagina (`e2e/errori-dell-app.e2e.ts`, dove gli ascoltatori sono provati con un fotogramma e
// una promessa, e tolti danno rosso).

import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { annota, annotaErrore, ascoltaGliErrori, erroriDellApp } from "./errori-dell-app";

/** Le voci di un errore con questa sonda nel testo. */
const conSonda = (sonda: string) => erroriDellApp().voci.filter((v) => v.text.includes(sonda));

function zittaLaConsole<T>(f: () => T): { esito: T; scritte: unknown[][] } {
  const vera = console.error;
  const scritte: unknown[][] = [];
  console.error = (...a: unknown[]) => void scritte.push(a);
  try {
    return { esito: f(), scritte };
  } finally {
    console.error = vera;
  }
}

test("`annotaErrore` scrive nell'elenco col percorso tolto e nella console con il contesto", () => {
  const errore = new Error(String.raw`sonda uno in C:\Users\Mario Rossi\x.algo: negato`);
  const { scritte } = zittaLaConsole(() => annotaErrore("esempi non letti", errore));
  expect(scritte).toEqual([["esempi non letti:", errore]]);
  const [voce] = conSonda("sonda uno");
  expect(voce?.origin).toBe("handled");
  expect(voce?.text.startsWith("esempi non letti: Error: sonda uno in <path>: negato")).toBe(true);
  expect(voce?.text).not.toContain("Rossi");
});

test("`annota` non scrive nella console, e un valore che non si sa leggere non lancia", () => {
  const ostile = {
    toJSON() {
      throw new Error("non si legge");
    },
  };
  const { scritte } = zittaLaConsole(() => {
    annota("rejected", "sonda due", ostile);
  });
  expect(scritte).toEqual([]);
  expect(conSonda("sonda due").map((v) => [v.origin, v.text])).toEqual([["rejected", "sonda due: (unreadable)"]]);
});

test("gli ascoltatori prendono un errore e una promessa rifiutata; chiamati due volte non annotano due volte", () => {
  ascoltaGliErrori();
  ascoltaGliErrori();
  window.dispatchEvent(new ErrorEvent("error", { error: new Error("sonda tre"), message: "Uncaught Error: sonda tre" }));
  window.dispatchEvent(new ErrorEvent("error", { message: "sonda quattro, senza l'errore" }));
  const rifiutata = new Event("unhandledrejection") as Event & { reason?: unknown };
  rifiutata.reason = { genere: "sistema", dettaglio: "sonda cinque" };
  window.dispatchEvent(rifiutata);
  expect(conSonda("sonda tre").map((v) => [v.origin, v.times])).toEqual([["uncaught", 1]]);
  expect(conSonda("sonda quattro").map((v) => [v.origin, v.text, v.times])).toEqual([["uncaught", "sonda quattro, senza l'errore", 1]]);
  expect(conSonda("sonda cinque").map((v) => [v.origin, v.times])).toEqual([["rejected", 1]]);
});

test("nessuna chiamata a `console.error` fuori dal punto unico e dal riparo, in tutta l'interfaccia", () => {
  const radice = join(import.meta.dir);
  const file = readdirSync(radice, { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
  const colpi = file.flatMap((f) => (readFileSync(join(radice, f), "utf8").includes("console.error") ? [f.replaceAll("\\", "/")] : [])).sort();
  console.log(`console.error: file guardati ${file.length}, con la chiamata ${colpi.length}: ${JSON.stringify(colpi)}`);
  // Il riparo la tiene per lo stack dei componenti, che annota anche nell'elenco.
  expect(colpi).toEqual(["ErroreInatteso.tsx", "errori-dell-app.ts"]);
  expect(file.length).toBeGreaterThan(50);
});
