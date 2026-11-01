// Il registro dei linguaggi e l'elenco delle estensioni del guscio (`CODICE` in `shell/src/progetto.rs`, che rifiuta di
// salvare il codice con un'estensione che non c'è) descrivono la stessa cosa in due lingue: questa prova li appaia come
// insiemi, nei due versi (due linguaggi possono avere la stessa estensione). E il registro stesso: gli identificatori
// unici, l'ordine delle linguette, il genere di ognuno; i nomi riservati di ogni linguaggio, che il controllo statico
// rifiuta tutti; i motivi e la riga d'errore di ogni linguaggio da eseguire.
//
// CHE COSA NON GUARDA: un'estensione del guscio scritta fuori da `pub const CODICE` (il rilevatore legge solo quella
// dichiarazione, e se non la trova la prova è rossa); che il guscio usi davvero `CODICE` quando salva; che i nomi
// dichiarati siano TUTTI quelli che il codice generato usa (lo guardano le prove del Python e del C sul generato).
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { causaDelNome, causaDelNomeDiUnCampo, causaDelNomeDiUnRecord } from "../controllo/controllo";
import { linguaggi, nomiRiservati, nomiRiservatiAUnCampo, nomiRiservatiAUnRecord, nomiRiservatiNelFile, voceDel } from "./linguaggi";
import { motivi, type CodiceDiUnMotivo } from "./motivi";
import { opzioniPredefinite } from "../progetto/modello";

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

test("il registro ha i cinque linguaggi di oggi, nell'ordine delle linguette, ognuno col suo genere; «Accademico» e TypeScript non sono di partenza", () => {
  expect(linguaggi.map((v) => [v.id, v.estensione, v.genere, v.diPartenza])).toEqual([
    ["pseudocodice", ".txt", "da-leggere", true],
    ["python", ".py", "da-eseguire", true],
    ["c", ".c", "da-eseguire", true],
    ["accademico", ".txt", "da-leggere", false],
    ["typescript", ".ts", "da-eseguire", false],
  ]);
  // Le parole di «Accademico» non sono nomi riservati: un nome uguale è una cosa che manca, e il progetto resta valido.
  expect([voceDel("accademico").riservati, voceDel("accademico").riservatiNelFile]).toEqual([[], []]);
  expect(new Set(linguaggi.map((v) => v.id)).size).toBe(linguaggi.length);
  for (const v of linguaggi) expect(voceDel(v.id)).toBe(v);
});

test("il controllo statico rifiuta ogni nome riservato di ogni linguaggio, e quelli del file solo a livello di file", () => {
  // Controllo positivo nel numero: il Python, il C e il TypeScript dichiarano nomi, e il C quelli delle intestazioni.
  expect(voceDel("python").riservati.length).toBeGreaterThan(50);
  expect(voceDel("c").riservati.length).toBeGreaterThan(200);
  expect(voceDel("c").riservatiNelFile.length).toBeGreaterThan(500);
  expect(voceDel("typescript").riservati.length).toBeGreaterThan(70);
  for (const n of nomiRiservati()) expect({ n, causa: causaDelNome(n, false)?.causa }).toEqual({ n, causa: "nome_riservato" });
  const soloNelFile = [...nomiRiservatiNelFile()].filter((n) => !nomiRiservati().has(n));
  expect(soloNelFile.length).toBeGreaterThan(0);
  for (const n of soloNelFile) expect({ n, fuori: causaDelNome(n, false), dentro: causaDelNome(n, true)?.causa }).toEqual({ n, fuori: undefined, dentro: "nome_della_libreria" });
  // Un nome che nessun linguaggio riserva resta valido.
  expect(causaDelNome("voto", true)).toBeUndefined();
});

test("il controllo rifiuta come record e come campo i nomi che un linguaggio vieta a un record e a un campo, e li lascia a un dato", () => {
  // Controllo positivo nel numero: il TypeScript vieta le parole di tipo a un record e `constructor` a un campo.
  expect(voceDel("typescript").riservatiAUnRecord).toContain("number");
  expect(voceDel("typescript").riservatiAUnCampo).toEqual(["constructor"]);
  expect(nomiRiservatiAUnRecord().size).toBeGreaterThan(10);
  for (const n of nomiRiservatiAUnRecord()) expect({ n, record: causaDelNomeDiUnRecord(n)?.causa, dato: causaDelNome(n, true) }).toEqual({ n, record: "nome_riservato", dato: undefined });
  for (const n of nomiRiservatiAUnCampo()) expect({ n, campo: causaDelNomeDiUnCampo(n)?.causa, dato: causaDelNome(n, false) }).toEqual({ n, campo: "nome_riservato", dato: undefined });
  // Un nome che nessun linguaggio riserva resta valido come record e come campo; un riservato a ogni dato lo è anche lì.
  expect([causaDelNomeDiUnRecord("alunno"), causaDelNomeDiUnCampo("voto")]).toEqual([undefined, undefined]);
  expect([causaDelNomeDiUnRecord("while")?.causa, causaDelNomeDiUnCampo("while")?.causa]).toEqual(["nome_riservato", "nome_riservato"]);
});

test("nessun nome riservato ha la forma della copia di un dato (finisce con _<numero>) o comincia col trattino basso", () => {
  const tutti = [...nomiRiservati(), ...nomiRiservatiNelFile(), ...nomiRiservatiAUnRecord(), ...nomiRiservatiAUnCampo()];
  expect(tutti.filter((n) => /_\d+$/.test(n))).toEqual([]);
  expect(tutti.filter((n) => n.startsWith("_"))).toEqual([]);
  expect(["voto_2", "_indice"].filter((n) => /_\d+$/.test(n) || n.startsWith("_"))).toEqual(["voto_2", "_indice"]);
});

test("ogni linguaggio da eseguire ha i motivi di tutti i codici, diversi fra loro, e la riga d'errore delle due lingue", () => {
  const codici: CodiceDiUnMotivo[] = ["invalid_input", "input_exhausted", "invalid_character_code", "string_too_long", "string_longer_than_array", "null_character_in_string", "index_out_of_range", "same_reference", "recursion_too_deep", "recursion_data_too_large"];
  const daEseguire = linguaggi.filter((v) => v.genere === "da-eseguire");
  expect(daEseguire.map((v) => v.id)).toEqual(["python", "c", "typescript"]);
  for (const v of daEseguire)
    for (const lingua of ["it", "en"] as const) {
      expect(Object.keys(v.motivi(10)[lingua]).sort()).toEqual([...codici].sort());
      expect(new Set(Object.values(v.motivi(10)[lingua])).size).toBe(codici.length);
      const scritto = `${lingua === "it" ? "Errore alla riga" : "Error at line"} 12: ${v.motivi(10)[lingua].input_exhausted}\n`;
      expect([...(v.rigaDErrore.exec(scritto) ?? [])].slice(1)).toEqual(["12", v.motivi(10)[lingua].input_exhausted]);
      // Il motivo del tetto delle chiamate dice il numero del progetto; senza l'opzione, quello di sempre.
      expect(v.motivi(10)[lingua].recursion_too_deep).toContain(" 10 ");
      expect(v.motivi(opzioniPredefinite.call_stack_limit)[lingua]).toEqual(motivi[lingua]);
      expect(motivi[lingua].recursion_too_deep).toContain(" 500 ");
      // Due righe, o la riga senza l'a capo, non sono la riga d'errore.
      expect(v.rigaDErrore.exec(`${scritto}${scritto}`)).toBeNull();
      expect(v.rigaDErrore.exec(scritto.trimEnd())).toBeNull();
    }
});
