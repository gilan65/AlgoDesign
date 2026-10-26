// Il registro dei linguaggi e l'elenco delle estensioni del guscio (`CODICE` in `shell/src/progetto.rs`, che rifiuta di
// salvare il codice con un'estensione che non c'è) descrivono la stessa cosa in due lingue: questa prova li appaia come
// insiemi, nei due versi (due linguaggi possono avere la stessa estensione). E il registro stesso: gli identificatori
// unici, l'ordine delle linguette, il genere di ognuno.
//
// CHE COSA NON GUARDA: un'estensione del guscio scritta fuori da `pub const CODICE` (il rilevatore legge solo quella
// dichiarazione, e se non la trova la prova è rossa); che il guscio usi davvero `CODICE` quando salva.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { linguaggi, voceDel } from "./linguaggi";

/** Le estensioni che stanno da una parte sola. */
function appaia(registro: readonly string[], guscio: readonly string[]): { soloNelRegistro: string[]; soloNelGuscio: string[] } {
  return {
    soloNelRegistro: [...new Set(registro)].filter((e) => !guscio.includes(e)).sort(),
    soloNelGuscio: [...new Set(guscio)].filter((e) => !registro.includes(e)).sort(),
  };
}

/** Le estensioni di `pub const CODICE: [&str; N] = [...]`, e la N dichiarata. */
function codiceDelGuscio(testo: string): { dichiarate: number; estensioni: string[] } | null {
  const m = /pub const CODICE: \[&str; (\d+)\] = \[([^\]]*)\];/.exec(testo);
  if (m === null) return null;
  return { dichiarate: Number(m[1]), estensioni: [...m[2]!.matchAll(/"([^"]*)"/g)].map((x) => x[1]!) };
}

const guscio = codiceDelGuscio(readFileSync(new URL("../../shell/src/progetto.rs", import.meta.url), "utf8"));
const delRegistro = linguaggi.map((v) => v.estensione);

test("le estensioni del registro sono quelle che il guscio accetta per il codice, nei due versi", () => {
  // Controllo positivo nel numero: il rilevatore trova la costante, con tanti elementi quanti ne dichiara.
  expect(guscio).not.toBeNull();
  expect(guscio!.estensioni.length).toBeGreaterThan(0);
  expect(guscio!.estensioni).toHaveLength(guscio!.dichiarate);
  expect(appaia(delRegistro, guscio!.estensioni)).toEqual({ soloNelRegistro: [], soloNelGuscio: [] });
});

test("l'appaiamento vede un'estensione in più da ognuna delle due parti, e non una ripetuta", () => {
  // Un'estensione che nessun linguaggio avrà: con una vera (`.ts`) la prova cambierebbe senso quando quel linguaggio arriva.
  // Le due parti uguali per costruzione: la prova guarda l'appaiamento, non il guscio di oggi.
  const finta = ".estensione-finta";
  const g = [...delRegistro];
  expect(appaia([...delRegistro, finta], g)).toEqual({ soloNelRegistro: [finta], soloNelGuscio: [] });
  expect(appaia(delRegistro, [...g, finta])).toEqual({ soloNelRegistro: [], soloNelGuscio: [finta] });
  expect(appaia([...delRegistro, delRegistro[0]!], g)).toEqual({ soloNelRegistro: [], soloNelGuscio: [] });
  expect(codiceDelGuscio('pub const CODICE: [&str; 2] = [".txt", ".py"];')).toEqual({ dichiarate: 2, estensioni: [".txt", ".py"] });
});

test("il registro ha i tre linguaggi di oggi, nell'ordine delle linguette, ognuno col suo genere", () => {
  expect(linguaggi.map((v) => [v.id, v.estensione, v.genere])).toEqual([
    ["pseudocodice", ".txt", "da-leggere"],
    ["python", ".py", "da-eseguire"],
    ["c", ".c", "da-eseguire"],
  ]);
  expect(new Set(linguaggi.map((v) => v.id)).size).toBe(linguaggi.length);
  for (const v of linguaggi) expect(voceDel(v.id)).toBe(v);
});
