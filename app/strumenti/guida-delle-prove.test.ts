// Il blocco dei conteggi e il suo confronto col log, su testi d'esempio: il documento vero non è nel repository, e queste prove
// non lo leggono. Che cosa NON guardano: la riscrittura del file e il confronto sul documento vero (la porta del differenziale
// e la riga di comando); che i numeri dell'esempio siano quelli del corpus.
import { describe, expect, test } from "bun:test";
import { bloccoDal, conIlBlocco, controlloPositivo, differenzeDallaGuida, elementiDaSpiegare, leggiFuoriDalLog, segnoDInizio, segnoDiFine, type FuoriDalLog } from "./guida-delle-prove";

const log = [
  "VERDE interprete a#a",
  "toolchain: Motore da PATH: gcc 15.3.0 (C:/x/gcc.exe), node 24.19.0 (C:\\Program Files\\nodejs\\node.exe)",
  "controllo dei tipi: typescript programmi 8, errori 0",
  "senza tipi: typescript programmi 8, senza annotazioni uguali 8, provenienza uguale 8, testo confrontato da node 24.19.0",
  "non ancora: typescript file 0, casi 0",
  "per tipo: con i record 1 casi nel confronto (verdi con ogni esecutore 1; con le tabelle 0, verdi con ogni esecutore 0), con le matrici 0 (verdi con ogni esecutore 0), senza 2",
  "avvisi della compilazione: compilazioni 4, con gli avvisi attesi 2 (c x -Wuninitialized), non attesi 0, attesi e mancanti 0",
  "differenziale: file 2, casi nel confronto 3 (di funzioni 1, con l'errore statico 0), esclusi 1, fuori tappa 0 in 0 file; per esecutore: interprete 3/3, gcc it 3/3, gcc en 3/3, js-node it 3/3, js-node en 3/3; rossi 0, problemi 0; compilazioni 4 in 1.0 s, esecuzioni 12 in 2.0 s, in tutto 3.0 s",
].join("\n");

const fuori: FuoriDalLog = { pagina: { casi: 6, arresti: 1, letture: 2, prove: 1, progetti: 2 }, daLeggere: { uno: { con: "il testo atteso", quanto: "2 file" }, due: { con: "il lettore", quanto: "2 file: 1 con il codice" } }, tsc: "7.0.2", playwright: "1.63.0", chromium: "153.0" };
const elementi = ["lingua-a", "lingua-b", "forma-b", "interprete", "gcc", "js-node", "tsc", "pagina di prova"];
const prosa = `# Il documento\n\n<!-- prove: ${elementi.slice(0, 4).join(", ")} -->\nUna sezione.\n\n<!-- prove: ${elementi.slice(4).join(", ")} -->\nUn'altra.\n\n`;
const guida = `${prosa}${bloccoDal(log, fuori)}\n\nIn fondo.\n`;

describe("il blocco viene dal log", () => {
  const blocco = bloccoDal(log, fuori);
  test("una riga per macchina, con la versione del suo motore e i casi nelle due lingue", () => {
    expect(blocco).toContain("| gcc | gcc 15.3.0 | 3/3 | 3/3 |");
    expect(blocco).toContain("| js-node | node 24.19.0 | 3/3 | 3/3 |");
    expect(blocco).toContain("| interprete | il nucleo | 3/3 | — |");
  });
  test("le versioni dei pacchetti e la pagina di prova, che dichiara la sua fonte", () => {
    expect(blocco).toContain("| tsc | 7.0.2, su typescript | 8 programmi, 0 errori |");
    expect(blocco).toContain("| pagina di prova | Chromium 153.0, Playwright 1.63.0 | 6 casi nelle due lingue (con un arresto 1, che leggono 2, programmi di prova 1), 2 progetti con la pagina | la conferma del corpus, non questa corsa |");
  });
  test("i linguaggi da leggere dichiarano che nessuna macchina li esegue", () => {
    expect(blocco).toContain("| uno | nessuna macchina: il testo atteso | 2 file | la conferma del corpus, non questa corsa |");
    expect(blocco).toContain("| due | nessuna macchina: il lettore | 2 file: 1 con il codice | la conferma del corpus, non questa corsa |");
  });
  test("una macchina di cui il log non dà la versione è un errore: «il nucleo» è solo dell'interprete", () => {
    // Un percorso con le parentesi, come «C:\Program Files (x86)»: la riga della toolchain non dà la versione di gcc.
    const conParentesi = log.replace("gcc 15.3.0 (C:/x/gcc.exe)", "gcc 15.3.0 (C:/x (y)/gcc.exe)");
    expect(() => bloccoDal(conParentesi, fuori)).toThrow("gcc");
  });
  test("nessuna durata, che cambierebbe il documento a ogni corsa", () => {
    expect(blocco).not.toMatch(/\d s\b/);
    expect(bloccoDal(log.replace("in 2.0 s", "in 9.9 s"), fuori)).toBe(blocco);
  });
  test("un log senza una riga finale non dà un blocco a metà", () => {
    expect(() => bloccoDal(log.replace(/^toolchain: .*$/m, ""), fuori)).toThrow("toolchain");
    expect(() => bloccoDal(log.replace(/^differenziale: .*$/m, "differenziale: altro"), fuori)).toThrow("forma attesa");
  });
});

describe("la riscrittura tocca solo fra i due segni", () => {
  test("la prosa resta com'è, e riscrivere due volte dà lo stesso testo", () => {
    const vecchio = `${prosa}${segnoDInizio}\nvecchio\n${segnoDiFine}\n\nIn fondo.\n`;
    const nuovo = conIlBlocco(vecchio, bloccoDal(log, fuori));
    expect(nuovo).toBe(guida);
    expect(conIlBlocco(nuovo, bloccoDal(log, fuori))).toBe(guida);
  });
  test("senza i segni, o coi segni ripetuti, non scrive", () => {
    expect(() => conIlBlocco("nessun segno", "x")).toThrow("non ci sono");
    expect(() => conIlBlocco(`${segnoDiFine} ${segnoDInizio}`, "x")).toThrow("non ci sono");
    expect(() => conIlBlocco(`${segnoDInizio}${segnoDInizio}${segnoDiFine}`, "x")).toThrow("ripetuti");
  });
});

describe("il confronto sta sugli elementi, nei due versi", () => {
  test("il documento appena scritto è uguale al log", () => {
    expect(differenzeDallaGuida(guida, log, fuori, elementi)).toEqual([]);
  });
  test("un conteggio alterato nel documento è la sua riga, con i due valori", () => {
    const d = differenzeDallaGuida(guida.replace("| gcc | gcc 15.3.0 | 3/3 |", "| gcc | gcc 15.3.0 | 4/3 |"), log, fuori, elementi);
    expect(d).toEqual([expect.stringContaining("riga diversa «gcc»")]);
    expect(d[0]).toContain("4/3");
  });
  test("una versione cambiata è una riga diversa", () => {
    const d = differenzeDallaGuida(guida, log.replace("gcc 15.3.0", "gcc 16.0.0"), fuori, elementi);
    expect(d).toEqual([expect.stringContaining("riga diversa «gcc»")]);
  });
  test("un denominatore della pagina diverso è la riga della pagina", () => {
    const d = differenzeDallaGuida(guida, log, { ...fuori, pagina: { ...fuori.pagina, casi: 7 } }, elementi);
    expect(d).toEqual([expect.stringContaining("riga diversa «pagina di prova»")]);
  });
  test("una famiglia in più nel log manca nel documento, una in meno è in più: il numero uguale non inganna", () => {
    const altra = log.replace("gcc it 3/3, gcc en 3/3", "clang it 3/3, clang en 3/3").replace("gcc 15.3.0 (C:/x/gcc.exe)", "clang 23.1.0 (C:/x/clang.exe)");
    expect(differenzeDallaGuida(guida, altra, fuori, elementi).sort()).toEqual(["riga che manca nel documento: «clang»", "riga in più nel documento: «gcc»"]);
  });
  test("una famiglia senza una sezione è rossa anche se la sua riga si scrive da sola", () => {
    const senza = guida.replace("interprete, gcc", "interprete").replace("gcc, js-node", "js-node");
    expect(differenzeDallaGuida(senza, log, fuori, elementi)).toEqual(["elemento senza una sezione nel documento: «gcc»"]);
  });
  test("una sezione senza oggetto è rossa", () => {
    expect(differenzeDallaGuida(`<!-- prove: bcc -->\n${guida}`, log, fuori, elementi)).toEqual(["sezione senza un elemento: «bcc»"]);
  });
  test("una riga scritta a mano nel blocco è in più", () => {
    const d = differenzeDallaGuida(guida.replace(segnoDiFine, `| motore a mano | 1 | 1 | 1 |\n${segnoDiFine}`), log, fuori, elementi);
    expect(d).toEqual(["riga in più nel documento: «motore a mano»"]);
  });
});

describe("gli elementi da spiegare vengono dal registro e dal log", () => {
  test("i linguaggi, le forme, le macchine senza il numero, tsc e la pagina", () => {
    const e = elementiDaSpiegare(log.replace("gcc en 3/3", "gcc-2 en 3/3"), [{ id: "uno" }, { id: "due", formaSenzaTipi: { id: "tre" } }]);
    expect(e).toEqual(["uno", "due", "tre", "interprete", "gcc", "js-node", "tsc", "pagina di prova"]);
  });
});

describe("le fonti fuori dal log", () => {
  test("i denominatori della pagina ci sono, e le versioni dei pacchetti", () => {
    const f = leggiFuoriDalLog();
    expect(Object.values(f.pagina).every((n) => n > 0)).toBe(true);
    expect(f.tsc).toMatch(/^\d/);
    expect(f.chromium).toMatch(/^\d/);
  });
  test("il controllo positivo della porta è acceso su un log vero nella forma", () => {
    expect(controlloPositivo(log).acceso).toBe(true);
  });
});
