// L'appaiamento fra il registro dei linguaggi (nel nucleo) e gli esecutori del differenziale (negli strumenti), nei due
// versi, e ciò che il collaudo ne ricava: gli esecutori richiesti e i programmi con gli avvisi attesi.

import { describe, expect, test } from "bun:test";
import { linguaggi } from "../core/genera/linguaggi";
import { appaia, compila, esecutori, esecutoriRichiesti, programmiConAvvisiAttesi } from "./esecutori";

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

  test("una voce da leggere non chiede un esecutore", () => {
    const pseudocodice = linguaggi.filter((v) => v.genere === "da-leggere");
    expect(pseudocodice.length).toBeGreaterThan(0);
    expect(appaia(pseudocodice, []).vociSenzaEsecutore).toEqual([]);
  });
});

describe("gli esecutori richiesti dal contratto", () => {
  test("l'interprete, il Python e il C con un gcc e con un clang, nelle due lingue", () => {
    expect(esecutoriRichiesti(linguaggi, esecutori)).toEqual(["interprete", "python it", "python en", "gcc it", "gcc en", "clang it", "clang en"]);
  });

  test("col registro senza il C restano l'interprete e il Python", () => {
    expect(esecutoriRichiesti(senzaIlC, esecutori)).toEqual(["interprete", "python it", "python en"]);
  });

  test("i programmi con gli avvisi attesi sono quelli dell'esecutore del C", () => {
    expect(programmiConAvvisiAttesi(linguaggi, esecutori)).toBe(7);
    expect(programmiConAvvisiAttesi(senzaIlC, esecutori)).toBe(0);
  });

  test("compilano le macchine del C, anche una ripetuta, e non l'interprete né il Python", () => {
    expect(["interprete", "python it", "gcc it", "clang en", "gcc-2 en"].map((e) => compila(e, linguaggi, esecutori))).toEqual([false, false, true, true, true]);
    expect(compila("gcc it", senzaIlC, esecutori)).toBe(false);
  });
});
