// Il comando `flowgorithm` dello strumento a riga di comando come processo, in una cartella temporanea: le tre forme
// dell'ingresso (un file, un elenco con le virgole, una cartella) e i due posti dell'uscita (accanto al file, `-o`); un
// file che non si converte non ferma gli altri; gli esiti del comando; `-r` sui casi del corpus che la chiedono; `-s`; due
// uscite uguali; un nome con una virgola; le righe che mostra, coi testi del lettore e la frase dell'app.
//
// Le prove leggono il corpus, quindi nessun conto scritto a mano: i conti vengono dall'elenco, i file costruiti qui si
// confrontano per elementi, e gli esiti del comando hanno il loro nome (`esito`).
//
// Che cosa NON guarda: gli esiti del lettore file per file (`core/lettore/casi-flowgorithm.test.ts`; qui il corpus serve
// a provare il comando, coi file e i conteggi presi dall'elenco); l'eseguibile a sé (la prova del pacchetto).
import { afterAll, beforeAll, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { controlla, tetti } from "../core/controllo/controllo";
import { apri } from "../core/progetto/formato";

/** Gli esiti del comando, dalla sua testata (`flowgorithm.ts`). */
const esito = { tuttiConvertiti: 0, nonTuttiConvertiti: 1, opzioneSbagliata: 2 } as const;

const app = join(import.meta.dir, "..");
const corpus = join(app, "casi-flowgorithm");
interface Voce {
  file: string;
  esito: "converte" | "si ferma";
  messaggio?: { codice: string };
  rinomina?: { esito: "converte" | "si ferma"; rinominati?: [string, string][] };
}
const elenco = (JSON.parse(readFileSync(join(corpus, "elenco.json"), "utf8")) as { file: Voce[] }).file;
const convertitoCon = (v: Voce, r: boolean) => (r && v.rinomina !== undefined ? v.rinomina.esito : v.esito) === "converte";
const esc = (s: string) => s.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
const algoDi = (f: string) => f.replace(/\.fprg$/i, ".algo");

let cartella = "";
let n = 0;
beforeAll(() => {
  cartella = mkdtempSync(join(tmpdir(), "flowgorithm-"));
});
afterAll(() => rmSync(cartella, { recursive: true, force: true }));

/** Una cartella nuova con i file del corpus dati (o con altri nomi: `[nome, dal corpus]`). */
function nuova(...file: (string | [string, string])[]): string {
  const c = join(cartella, `prova-${++n}`);
  mkdirSync(c);
  for (const f of file) {
    const [nome, da] = typeof f === "string" ? [f, f] : f;
    cpSync(join(corpus, da), join(c, nome));
  }
  return c;
}
function lancia(...argomenti: string[]): { esito: number; righe: string[] } {
  const r = Bun.spawnSync(["bun", "./strumenti/algodesign-tools.ts", "flowgorithm", ...argomenti], { cwd: app, stdout: "pipe", stderr: "pipe" });
  return { esito: r.exitCode ?? -1, righe: `${r.stdout}${r.stderr}`.trim().split(/\r?\n/) };
}
const conInizio = (righe: string[], inizio: string) => righe.filter((x) => x.startsWith(inizio)).map((x) => x.slice(inizio.length));
/** Il `.algo` scritto: si apre, passa il controllo statico senza errori, ha i soli LF e niente dati della macchina. */
function valido(percorso: string): void {
  const byte = readFileSync(percorso);
  expect(byte.includes(Buffer.from("\r"))).toBe(false);
  const testo = byte.toString("utf8");
  for (const chiave of ["created", "edited", "saved"]) expect(testo).not.toContain(`"${chiave}"`);
  const a = apri(testo);
  if (!a.ok) throw new Error(`${percorso} non si apre`);
  const c = controlla(a.progetto, tetti);
  expect(c.fuoriTappa ? ["fuori tappa"] : c.errori).toEqual([]);
}

test("tutto il corpus, cartella e -o: un file che non si converte non ferma gli altri; con -r di più; i conti dall'elenco", () => {
  for (const r of [false, true]) {
    const uscita = nuova();
    const res = lancia(corpus, "-o", uscita, ...(r ? ["-r"] : []));
    const attesi = elenco.filter((v) => convertitoCon(v, r)).map((v) => algoDi(v.file)).sort();
    const fermi = elenco.filter((v) => !convertitoCon(v, r)).map((v) => v.file).sort();
    const scritti = readdirSync(uscita).sort();
    const righeDiErrore = res.righe.filter((x) => x.startsWith("ERRORE "));
    console.log(`${r ? "con" : "senza"} -r: ${scritti.length} .algo scritti su ${elenco.length} file, ${righeDiErrore.length} righe ERRORE (attesi ${attesi.length} e ${fermi.length})`);
    // Il controllo positivo: l'esito dice che non tutti si convertono E i file che si convertono ci sono tutti.
    expect(fermi.length).toBeGreaterThan(0);
    expect(res.esito).toBe(esito.nonTuttiConvertiti);
    expect(scritti).toEqual(attesi);
    expect(righeDiErrore.map((x) => /^ERRORE .*[\\/]([^\\/]+\.fprg)(, riga \d+)?: /.exec(x)?.[1]).sort()).toEqual(fermi);
    expect(res.righe.at(-1)).toBe(`CONVERTITI ${attesi.length} file su ${elenco.length}`);
    for (const f of scritti) valido(join(uscita, f));
    expect(res.righe.filter((x) => x.includes("undefined"))).toEqual([]);
    // Con -r il corpus esercita tutte le trasformazioni del lettore: ognuna col suo testo, almeno una volta.
    if (r) {
      const trasformazioni = res.righe.filter((x) => x.startsWith("TRASFORMAZIONE "));
      const testi = ["diventa un «mentre» equivalente", "è dichiarato dentro un blocco", "è dichiarato di nuovo", "è riservato in AlgoDesign", "diventa un parametro per uscita"];
      console.log(`righe TRASFORMAZIONE: ${trasformazioni.length}; per testo: ${testi.map((t) => trasformazioni.filter((x) => x.includes(t)).length).join(", ")}`);
      expect(testi.filter((t) => !trasformazioni.some((x) => x.includes(t)))).toEqual([]);
    }
  }
});

test("-r: i file del corpus che la chiedono non si convertono senza, si convertono con, e la riga dice il nome nuovo", () => {
  const casi = elenco.filter((v) => v.rinomina !== undefined);
  console.log(`casi della rinomina nell'elenco: ${casi.length} (${casi.map((v) => v.file).join(", ")})`);
  expect(casi.length).toBeGreaterThan(0);
  for (const v of casi) {
    const c = nuova(v.file);
    const f = join(c, v.file);
    const senza = lancia(f);
    expect(senza.esito).toBe(esito.nonTuttiConvertiti);
    expect(senza.righe).toEqual([expect.stringMatching(new RegExp(`^ERRORE ${esc(f)}, riga \\d+: `))]);
    expect(existsSync(algoDi(f))).toBe(false);
    const con = lancia(f, "-r");
    if (v.rinomina!.esito === "si ferma") {
      expect(con).toEqual(senza);
      continue;
    }
    expect(con.esito).toBe(esito.tuttiConvertiti);
    for (const [nome, nuovo] of v.rinomina!.rinominati ?? []) expect(con.righe.some((x) => x.startsWith(`TRASFORMAZIONE ${f}, riga `) && x.includes(` ${nome} `) && x.endsWith(` ${nuovo}`))).toBe(true);
    expect(con.righe.at(-1)).toBe(`SCRITTO ${algoDi(f)}`);
  }
});

test("un elenco con le virgole e più argomenti: ogni .algo accanto al suo file; un file nominato due volte si converte una volta", () => {
  const c = nuova("t-per.fprg", "t-procedura-riempie.fprg", "n-sin.fprg", "t-strutture.fprg");
  const p = (x: string) => join(c, `${x}.fprg`);
  const [a, b, sin, d] = [p("t-per"), p("t-procedura-riempie"), p("n-sin"), p("t-strutture")];
  const r = lancia(`${a}, ${b},${sin}`, d, a);
  expect(r.esito).toBe(esito.nonTuttiConvertiti);
  expect(conInizio(r.righe, "SCRITTO ")).toEqual([a, b, d].map(algoDi));
  expect(conInizio(r.righe, "ERRORE ")).toEqual([expect.stringMatching(new RegExp(`^${esc(sin)}, riga \\d+: La funzione «Sin» `))]);
  const rigaDelParametro = readFileSync(b, "utf8").split("\n").findIndex((x) => x.includes('<parameter name="v"')) + 1;
  expect(rigaDelParametro).toBeGreaterThan(0);
  expect(r.righe).toContain(`TRASFORMAZIONE ${b}, riga ${rigaDelParametro}: la procedura scrive il vettore v senza leggerlo: diventa un parametro per uscita`);
  expect(r.righe.at(-1)).toBe(`CONVERTITI ${[a, b, d].length} file su ${[a, b, sin, d].length}`);
  // Tutti convertiti: l'esito cambia.
  const tutti = lancia(`${a},${d}`, "-s");
  expect(tutti.esito).toBe(esito.tuttiConvertiti);
  expect(conInizio(tutti.righe, "SOSTITUITO ")).toEqual([a, d].map(algoDi));
});

test("una cartella: anche .FPRG maiuscolo, non le sottocartelle; una vuota; un file nominato che non è .fprg", () => {
  const c = nuova(["GRANDE.FPRG", "t-per.fprg"], "t-strutture.fprg");
  mkdirSync(join(c, "dentro"));
  cpSync(join(corpus, "t-tipi.fprg"), join(c, "dentro", "t-tipi.fprg"));
  writeFileSync(join(c, "note.txt"), "non è un file di Flowgorithm\n");
  const r = lancia(c);
  expect(r.esito).toBe(esito.tuttiConvertiti);
  expect(conInizio(r.righe, "SCRITTO ")).toEqual([join(c, "GRANDE.algo"), join(c, "t-strutture.algo")]);
  expect(existsSync(join(c, "dentro", "t-tipi.algo"))).toBe(false);
  const vuota = join(c, "dentro", "vuota");
  mkdirSync(vuota);
  expect(lancia(vuota)).toEqual({ esito: esito.nonTuttiConvertiti, righe: [`ERRORE ${vuota} non contiene file .fprg`] });
  expect(lancia(join(c, "note.txt"))).toEqual({ esito: esito.nonTuttiConvertiti, righe: [`ERRORE ${join(c, "note.txt")} non è un file .fprg`] });
});

test("un nome con una virgola si prende intero, se esiste", () => {
  const c = nuova(["a,b.fprg", "t-per.fprg"]);
  expect(lancia(join(c, "a,b.fprg"))).toEqual({ esito: esito.tuttiConvertiti, righe: [`SCRITTO ${join(c, "a,b.algo")}`] });
});

test("con -o due file con lo stesso nome: il secondo non si converte, il primo sì; la cartella di -o che manca non converte nulla", () => {
  const uno = nuova("t-per.fprg");
  const due = nuova("t-per.fprg");
  const uscita = nuova();
  const scritto = join(uscita, "t-per.algo");
  expect(lancia(uno, due, "-o", uscita)).toEqual({
    esito: esito.nonTuttiConvertiti,
    righe: [
      `SCRITTO ${scritto}`,
      `ERRORE ${join(due, "t-per.fprg")} non si converte: ${scritto} è già l'uscita di ${join(uno, "t-per.fprg")}; convertilo a parte, con un'altra cartella -o`,
      `CONVERTITI ${[uno].length} file su ${[uno, due].length}`,
    ],
  });
  const manca = join(uscita, "manca");
  expect(lancia(uno, "-o", manca)).toEqual({ esito: esito.nonTuttiConvertiti, righe: [`ERRORE la cartella ${manca} non c'è`] });
  expect(existsSync(join(uno, "t-per.algo"))).toBe(false);
});

test("con -o una cartella raggiunta da un collegamento, il secondo file con lo stesso nome è ancora «già l'uscita» del primo", () => {
  // Sul Mac la cartella temporanea `/var/…` è un collegamento a `/private/var/…`: prima della scrittura il file d'uscita
  // non c'è e il suo percorso vero non si legge, dopo sì, e le due chiavi non coincidevano (il secondo file riceveva
  // «c'è già», e con -s avrebbe sostituito il primo). Qui lo stesso con un collegamento fatto apposta.
  const uno = nuova("t-per.fprg");
  const due = nuova("t-per.fprg");
  const vera = nuova();
  const collegamento = join(nuova(), "uscita");
  symlinkSync(vera, collegamento, "junction");
  const scritto = join(collegamento, "t-per.algo");
  expect(lancia(uno, due, "-o", collegamento)).toEqual({
    esito: esito.nonTuttiConvertiti,
    righe: [
      `SCRITTO ${scritto}`,
      `ERRORE ${join(due, "t-per.fprg")} non si converte: ${scritto} è già l'uscita di ${join(uno, "t-per.fprg")}; convertilo a parte, con un'altra cartella -o`,
      `CONVERTITI ${[uno].length} file su ${[uno, due].length}`,
    ],
  });
  expect(readdirSync(vera)).toEqual(["t-per.algo"]);
});

test("un .algo che c'è già: senza -s il file non si converte e il .algo resta com'era; con -s si sostituisce", () => {
  const c = nuova("t-per.fprg");
  const f = join(c, "t-per.fprg");
  const algo = join(c, "t-per.algo");
  writeFileSync(algo, "c'era già\n");
  expect(lancia(f)).toEqual({ esito: esito.nonTuttiConvertiti, righe: [`ERRORE ${f} non si converte: ${algo} c'è già; per sostituirlo usa -s, o scegli un'altra cartella con -o`] });
  expect(readFileSync(algo, "utf8")).toBe("c'era già\n");
  expect(lancia(f, "-s")).toEqual({ esito: esito.tuttiConvertiti, righe: [`SOSTITUITO ${algo}`] });
  valido(algo);
});

test("un programma che AlgoDesign segnala: la frase dell'app, senza la riga e mai col codice", () => {
  const c = nuova();
  const f = join(c, "effetto.fprg");
  writeFileSync(
    f,
    `<?xml version="1.0"?>\n<flowgorithm fileversion="4.2">\n<attributes><attribute name="name" value="effetto"/></attributes>\n` +
      `<function name="Main" type="None" variable=""><parameters></parameters><body><output expression="F(1)" newline="True"/></body></function>\n` +
      `<function name="F" type="Integer" variable="r"><parameters><parameter name="x" type="Integer" array="False"/></parameters><body><declare name="r" type="Integer" array="False" size=""/><call expression="P()"/><assign variable="r" expression="x"/></body></function>\n` +
      `<function name="P" type="None" variable=""><parameters></parameters><body></body></function>\n</flowgorithm>\n`,
  );
  const r = lancia(f);
  expect(r).toEqual({
    esito: esito.nonTuttiConvertiti,
    righe: [expect.stringMatching(new RegExp(`^ERRORE ${esc(f)}: Il programma convertito ha un errore che AlgoDesign segnala: «[A-ZÈ].+» \\(blocco b\\d+\\)\\.$`))],
  });
  expect(r.righe.join("\n")).not.toContain("function_with_effect");
});

test("le opzioni sbagliate: l'esito e il modo d'uso; l'aiuto", () => {
  for (const a of [["-x"], [], ["-o"]]) {
    const r = lancia(...a);
    expect(r.esito).toBe(esito.opzioneSbagliata);
    expect(r.righe.some((x) => x.includes("flowgorithm <ingresso>"))).toBe(true);
  }
  const aiuto = lancia("-h");
  expect(aiuto.esito).toBe(esito.tuttiConvertiti);
  expect(aiuto.righe[0]).toBe("Converte i file di Flowgorithm (.fprg) in progetti di AlgoDesign (.algo).");
});
