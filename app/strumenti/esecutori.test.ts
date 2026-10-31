// L'appaiamento fra il registro dei linguaggi (nel nucleo) e gli esecutori del differenziale (negli strumenti), nei due
// versi, e ciò che il collaudo ne ricava per esecutore: gli esecutori richiesti, i programmi e le compilazioni con gli
// avvisi attesi, gli esecutori di un linguaggio, le variabili della toolchain; il riconoscimento di Node e di Bun; il
// controllo dei tipi del TypeScript con `tsc`, su un programma generato e sullo stesso con un tipo sbagliato apposta.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tetti } from "../core/controllo/controllo";
import { testoDelCodice } from "../core/genera/forma";
import { linguaggi, voceDel } from "../core/genera/linguaggi";
import { formeDelloScheletro } from "../ui/genera/attesi-del-typescript";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import {
  appaia,
  compila,
  compilazioniConAvvisiAttese,
  esecutoreDel,
  esecutori,
  esecutoriRichiesti,
  eseguitiDel,
  programmiConAvvisiAttesi,
  type Esecutore,
  type Macchina,
} from "./esecutori";

const senzaIlC = linguaggi.filter((v) => v.id !== "c");

describe("il registro e gli esecutori", () => {
  test("ogni linguaggio da eseguire ha il suo esecutore, e ogni esecutore la sua voce", () => {
    expect(appaia(linguaggi, esecutori)).toEqual({ vociSenzaEsecutore: [], esecutoriSenzaVoce: [] });
    expect(esecutori.map((e) => e.linguaggio)).toEqual(linguaggi.filter((v) => v.genere === "da-eseguire").map((v) => v.id));
  });

  test("un esecutore senza la sua voce nel registro si vede", () => {
    expect(appaia(senzaIlC, esecutori)).toEqual({ vociSenzaEsecutore: [], esecutoriSenzaVoce: ["c"] });
  });

  test("una voce da eseguire senza il suo esecutore si vede", () => {
    expect(appaia(linguaggi, esecutori.filter((e) => e.linguaggio !== "c"))).toEqual({ vociSenzaEsecutore: ["c"], esecutoriSenzaVoce: [] });
    const conUnoFinto = [...linguaggi, { id: "linguaggio-finto-senza-esecutore", genere: "da-eseguire" as const }];
    expect(appaia(conUnoFinto, esecutori).vociSenzaEsecutore).toEqual(["linguaggio-finto-senza-esecutore"]);
  });

  test("un esecutore che compila legge gli avvisi del compilatore: senza, ogni avviso varrebbe zero", () => {
    const compilaSenzaAvvisi = (es: readonly Esecutore[]) => es.filter((e) => e.compila !== undefined && e.avvisi === undefined).map((e) => e.linguaggio);
    expect(esecutori.filter((e) => e.compila !== undefined).length).toBeGreaterThan(0);
    expect(compilaSenzaAvvisi(esecutori)).toEqual([]);
    // Controllo positivo: un esecutore che compila e non legge gli avvisi si vede.
    const { avvisi: _, ...senzaAvvisi } = esecutori.find((e) => e.compila !== undefined)!;
    expect(compilaSenzaAvvisi([senzaAvvisi])).toEqual(["c"]);
  });

  test("una voce da leggere non chiede un esecutore", () => {
    const pseudocodice = linguaggi.filter((v) => v.genere === "da-leggere");
    expect(pseudocodice.length).toBeGreaterThan(0);
    expect(appaia(pseudocodice, []).vociSenzaEsecutore).toEqual([]);
  });
});

describe("gli esecutori richiesti dal contratto", () => {
  const tutti = ["interprete", "python it", "python en", "gcc it", "gcc en", "clang it", "clang en", "node it", "node en", "bun it", "bun en"];

  test("l'interprete, il Python, il C con un gcc e con un clang, il TypeScript con Node e con Bun, nelle due lingue", () => {
    expect(esecutoriRichiesti(linguaggi, esecutori)).toEqual(tutti);
  });

  test("col registro senza il C restano l'interprete, il Python e il TypeScript", () => {
    expect(esecutoriRichiesti(senzaIlC, esecutori)).toEqual(["interprete", "python it", "python en", "node it", "node en", "bun it", "bun en"]);
  });

  test("gli esecutori di ogni linguaggio da eseguire, e nessuno per l'interprete", () => {
    expect(eseguitiDel("python", tutti, linguaggi, esecutori)).toEqual(["python it", "python en"]);
    expect(eseguitiDel("c", [...tutti, "gcc-2 it"], linguaggi, esecutori)).toEqual(["gcc it", "gcc en", "clang it", "clang en", "gcc-2 it"]);
    expect(eseguitiDel("typescript", tutti, linguaggi, esecutori)).toEqual(["node it", "node en", "bun it", "bun en"]);
    // Ogni esecutore eseguito tranne l'interprete è di un linguaggio, e di uno solo.
    const di = linguaggi.filter((v) => v.genere === "da-eseguire").flatMap((v) => eseguitiDel(v.id, tutti, linguaggi, esecutori));
    expect(di.sort()).toEqual(tutti.filter((x) => x !== "interprete").sort());
  });

  test("i programmi con gli avvisi attesi sono quelli dell'esecutore del C", () => {
    expect(programmiConAvvisiAttesi(linguaggi, esecutori)).toBe(8);
    expect(programmiConAvvisiAttesi(senzaIlC, esecutori)).toBe(0);
  });

  test("compilano le macchine del C, anche una ripetuta, e non l'interprete né il Python né il TypeScript", () => {
    expect(["interprete", "python it", "gcc it", "clang en", "gcc-2 en", "node it", "bun en"].map((e) => compila(e, linguaggi, esecutori))).toEqual([false, false, true, true, true, false, false]);
    expect(compila("gcc it", senzaIlC, esecutori)).toBe(false);
  });

  test("le compilazioni che avvisano sono la somma per esecutore che compila; con un secondo linguaggio che si compila, la formula di prima sbaglia", () => {
    expect(compilazioniConAvvisiAttese(tutti, linguaggi, esecutori)).toBe(8 * 4);
    // Un secondo linguaggio che si compila, finto, con due programmi che avvisano e una sola macchina.
    const c = esecutoreDel("c")!;
    // Un linguaggio che il registro non ha: il tipo lo vieta, la prova lo forza.
    const finto: Esecutore = { ...c, linguaggio: "finto" as unknown as Esecutore["linguaggio"], nome: "Finto", famiglie: ["finto"], avvisiAttesi: { uno: "-Wuno", due: "-Wdue" } };
    const registro = [...linguaggi, { id: "finto", genere: "da-eseguire" as const }];
    const conFinto = [...tutti, "finto it", "finto en"];
    const giusto = compilazioniConAvvisiAttese(conFinto, registro, [...esecutori, finto]);
    expect(giusto).toBe(8 * 4 + 2 * 2);
    // La formula di prima, i programmi attesi per le macchine che compilano, dà un altro numero: il controllo positivo.
    const diPrima = programmiConAvvisiAttesi(registro, [...esecutori, finto]) * conFinto.filter((x) => compila(x, registro, [...esecutori, finto])).length;
    expect(diPrima).toBe(10 * 6);
    expect(diPrima).not.toBe(giusto);
  });

  test("la corsa senza toolchain mette su un eseguibile che non c'è la variabile di ogni esecutore", () => {
    expect(esecutori.map((e) => e.variabile)).toEqual(["ALGODESIGN_PYTHON", "ALGODESIGN_CC", "ALGODESIGN_TS"]);
    expect(new Set(esecutori.map((e) => e.variabile)).size).toBe(esecutori.length);
  });
});

describe("il TypeScript: Node e Bun, e il controllo dei tipi", () => {
  const ts = esecutoreDel("typescript")!;
  const macchina = (famiglia: string): Macchina => ({ nome: famiglia, famiglia, versione: "1", percorso: famiglia });

  test("Node stampa la versione con la «v», Bun il solo numero; nient'altro è dei due", () => {
    expect(["v24.19.0", "1.4.2", "Python 3.14.7", "deno 2.9.8 (stable)", "v24", ""].map((r) => ts.riconosci(r))).toEqual([
      { famiglia: "node", versione: "24.19.0" },
      { famiglia: "bun", versione: "1.4.2" },
      undefined,
      undefined,
      undefined,
      undefined,
    ]);
  });

  test("Bun senza la cache nel profilo dell'utente, Node con l'ambiente di sempre", () => {
    expect(ts.ambiente?.(macchina("bun"))).toEqual({ BUN_RUNTIME_TRANSPILER_CACHE_PATH: "0" });
    expect(ts.ambiente?.(macchina("node"))).toEqual({});
  });

  test("tsc: nessun errore sul programma generato, un errore sullo stesso con un tipo sbagliato apposta", () => {
    const g = voceDel("typescript").genera(formeDelloScheletro, tetti, "it", paroleDelloPseudocodice("it"));
    if (!g.generato) throw new Error("forme dello scheletro non generato");
    const giusto = testoDelCodice(g.righe);
    const sbagliato = giusto.replace("let b!: number;", "let b!: string;");
    // Controllo positivo della sonda: la sostituzione c'è.
    expect(sbagliato).not.toBe(giusto);
    const cartella = mkdtempSync(join(tmpdir(), "tipi-"));
    try {
      writeFileSync(join(cartella, "giusto.ts"), giusto);
      writeFileSync(join(cartella, "sbagliato.ts"), sbagliato);
      const c = ts.controllaITipi!;
      const errori = (files: string[]) => {
        writeFileSync(join(cartella, "tipi.json"), JSON.stringify(c.configurazione(files)));
        const r = Bun.spawnSync(c.comando("tipi.json"), { cwd: cartella, stdout: "pipe", stderr: "pipe" });
        return { uscita: r.exitCode, errori: c.errori(r.stdout.toString() + r.stderr.toString()).map((e) => e.sorgente) };
      };
      expect(errori(["giusto.ts"])).toEqual({ uscita: 0, errori: [] });
      const r = errori(["giusto.ts", "sbagliato.ts"]);
      expect(r.uscita).not.toBe(0);
      expect(r.errori.length).toBeGreaterThan(0);
      expect(new Set(r.errori)).toEqual(new Set(["sbagliato.ts"]));
    } finally {
      rmSync(cartella, { recursive: true, force: true });
    }
  }, 60_000);
});
