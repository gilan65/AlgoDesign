// I conteggi del corpus `casi/` e le prove che lo leggono: `bun run conferma-corpus`.
//
// Un file aggiunto, tolto o cambiato nel corpus sposta gli attesi delle prove che percorrono le sue cartelle, anche in
// Playwright, che il collaudo esegue per ultima. Qui stanno, una volta sola:
// - i FATTI del corpus misurati dal disco (i file per cartella; nei tipi i record, le matrici, le tabelle, i progetti con
//   l'errore statico, quelli che si eseguono senza letture) e l'IMPRONTA del contenuto (ogni `.algo` e `elenco.json`);
// - il CENSIMENTO delle prove che leggono il corpus: i file di prova (`*.test.ts`, `*.test.tsx`) e gli spec di
//   Playwright (`e2e/*.e2e.ts`) che chiamano `readdirSync` e nominano una cartella del corpus.
// I fatti dichiarati stanno in `strumenti/conteggi-del-corpus.json`, che SOLO `--conferma` scrive, e solo dopo che le
// prove del censimento sono uscite verdi sul corpus di adesso (`bun test` su quei file, Playwright su quegli spec nel
// progetto `chromium-sviluppo`). La porta «corpus» del collaudo (anche con `--solo-elenco`, in pochi secondi) e la
// prova `strumenti/corpus.test.ts` confrontano il file col disco: un corpus cambiato e non confermato è rosso prima
// della corsa lunga.
//
// Uso, da `app/`:
//   bun ./strumenti/corpus.ts              il confronto dei conteggi dichiarati col disco (exit 0 uguali, 1 diversi)
//   bun ./strumenti/corpus.ts --conferma   le prove del censimento, poi, se verdi, i conteggi riscritti
//
// Che cosa NON guarda:
// - gli attesi che le prove scrivono a mano (li esegue la conferma, non li legge);
// - una prova che legge il corpus senza `readdirSync` (un file per nome): non conta le cartelle, e un file nuovo non
//   la sposta;
// - gli strumenti (`casi.ts`, `differenziale.ts`, il collaudo), che contano dal disco e confrontano con `elenco.json`.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { apri } from "../core/progetto/formato";
import { usaIRecord, usaLeMatrici, usaLeTabelle, type Progetto } from "../core/progetto/modello";

export const radiceDellApp = fileURLToPath(new URL("..", import.meta.url));
const cartellaDeiCasi = join(radiceDellApp, "casi");
export const fileDeiConteggi = join(radiceDellApp, "strumenti", "conteggi-del-corpus.json");

export interface FattiDelCorpus {
  readonly impronta: string;
  /** I file `.algo` per cartella, e il totale. */
  readonly file: Readonly<Record<string, number>>;
  /** Nella cartella dei tipi. */
  readonly tipi: {
    readonly record: number;
    readonly matrici: number;
    readonly tabelle: number;
    readonly conErroreStatico: number;
    readonly senzaLetture: number;
    readonly tabelleSenzaLetture: number;
  };
}

export interface ConteggiDichiarati {
  readonly fatti: FattiDelCorpus;
  /** Le prove eseguite verdi dalla conferma, nel censimento di allora. */
  readonly confermati: { readonly bun: readonly string[]; readonly playwright: readonly string[] };
}

/** Il primo caso del programma si esegue fino alla fine senza letture e senza un errore statico atteso: le prove
 * dell'apertura e del salvataggio lo eseguono. */
export const siEsegueSenzaLetture = (p: Progetto): boolean => {
  const c = p.test_cases?.[0];
  return c !== undefined && c.inputs.length === 0 && c.expected.static_error === undefined;
};

/** Le cartelle del corpus e i loro `.algo`, in ordine. */
function cartelle(): { readonly nome: string; readonly file: readonly string[] }[] {
  return readdirSync(cartellaDeiCasi, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .map((nome) => ({ nome, file: readdirSync(join(cartellaDeiCasi, nome)).filter((f) => f.endsWith(".algo")).sort() }));
}

/** I fatti del corpus misurati dal disco. */
export function misuraIlCorpus(): FattiDelCorpus {
  const h = createHash("sha256");
  const file: Record<string, number> = {};
  let totale = 0;
  const tipi = { record: 0, matrici: 0, tabelle: 0, conErroreStatico: 0, senzaLetture: 0, tabelleSenzaLetture: 0 };
  for (const c of cartelle()) {
    file[c.nome] = c.file.length;
    totale += c.file.length;
    for (const f of c.file) {
      const byte = readFileSync(join(cartellaDeiCasi, c.nome, f));
      h.update(`${c.nome}/${f}\n`).update(byte).update("\n");
      if (c.nome !== "tipi") continue;
      const a = apri(byte.toString("utf8"));
      if (!a.ok) throw new Error(`casi/tipi/${f} non si apre: ${JSON.stringify(a)}`);
      const p = a.progetto;
      if (usaIRecord(p)) tipi.record++;
      if (usaLeMatrici(p)) tipi.matrici++;
      if (usaLeTabelle(p)) tipi.tabelle++;
      if ((p.test_cases ?? []).some((k) => k.expected.static_error !== undefined)) tipi.conErroreStatico++;
      if (siEsegueSenzaLetture(p)) {
        tipi.senzaLetture++;
        if (usaLeTabelle(p)) tipi.tabelleSenzaLetture++;
      }
    }
  }
  h.update(readFileSync(join(cartellaDeiCasi, "elenco.json")));
  return { impronta: h.digest("hex"), file: { ...file, totale }, tipi };
}

/** Vero se il testo di un file di prova percorre una cartella del corpus: chiama `readdirSync` e nomina `casi`, `tipi`
 * o una tappa. */
export const leggeIlCorpus = (testo: string): boolean => testo.includes("readdirSync(") && /["/]casi["/]|"tipi"|tappa-\d/.test(testo);

/** Le prove che leggono il corpus, coi file guardati: percorsi relativi ad `app/`, con le barre. */
export function censimento(): { readonly bun: string[]; readonly playwright: string[]; readonly guardati: number } {
  const bun: string[] = [];
  const playwright: string[] = [];
  let guardati = 0;
  const visita = (cartella: string): void => {
    for (const v of readdirSync(cartella, { withFileTypes: true })) {
      const percorso = join(cartella, v.name);
      if (v.isDirectory()) {
        if (v.name !== "node_modules" && v.name !== "dist" && !v.name.startsWith(".")) visita(percorso);
        continue;
      }
      const nome = relative(radiceDellApp, percorso).replaceAll("\\", "/");
      const diProva = /\.test\.tsx?$/.test(v.name);
      const spec = nome.startsWith("e2e/") && v.name.endsWith(".e2e.ts");
      if (!diProva && !spec) continue;
      guardati++;
      if (leggeIlCorpus(readFileSync(percorso, "utf8"))) (spec ? playwright : bun).push(nome);
    }
  };
  visita(radiceDellApp);
  return { bun: bun.sort(), playwright: playwright.sort(), guardati };
}

export const leggiIConteggi = (): ConteggiDichiarati => JSON.parse(readFileSync(fileDeiConteggi, "utf8")) as ConteggiDichiarati;

/** Le differenze fra i fatti dichiarati e quelli misurati, una per voce. */
export function differenze(dichiarati: FattiDelCorpus, misurati: FattiDelCorpus): string[] {
  const fuori: string[] = [];
  if (dichiarati.impronta !== misurati.impronta) fuori.push(`impronta ${dichiarati.impronta.slice(0, 12)} dichiarata, ${misurati.impronta.slice(0, 12)} sul disco`);
  for (const k of new Set([...Object.keys(dichiarati.file), ...Object.keys(misurati.file)]))
    if (dichiarati.file[k] !== misurati.file[k]) fuori.push(`file in ${k}: ${dichiarati.file[k] ?? "nessuno"} dichiarati, ${misurati.file[k] ?? "nessuno"} sul disco`);
  for (const k of Object.keys(misurati.tipi) as (keyof FattiDelCorpus["tipi"])[])
    if (dichiarati.tipi[k] !== misurati.tipi[k]) fuori.push(`tipi, ${k}: ${dichiarati.tipi[k]} dichiarati, ${misurati.tipi[k]} sul disco`);
  return fuori;
}

async function esegui(cmd: string[]): Promise<number> {
  console.log(`$ ${cmd.join(" ")}`);
  const p = Bun.spawn({ cmd, cwd: radiceDellApp, stdout: "inherit", stderr: "inherit" });
  return await p.exited;
}

if (import.meta.main) {
  const argomenti = process.argv.slice(2);
  if (argomenti.some((a) => a !== "--conferma")) {
    console.error(`uso: corpus [--conferma] (ricevuti: ${JSON.stringify(argomenti)})`);
    process.exit(2);
  }
  const prima = misuraIlCorpus();
  if (!argomenti.includes("--conferma")) {
    const d = differenze(leggiIConteggi().fatti, prima);
    console.log(d.length === 0 ? "CONTEGGI DEL CORPUS: uguali al disco" : `CONTEGGI DEL CORPUS: diversi dal disco — ${d.join("; ")}`);
    process.exit(d.length === 0 ? 0 : 1);
  }
  const c = censimento();
  console.log(`CONFERMA: INIZIO | ${prima.file.totale} file del corpus | censimento: ${c.guardati} file di prova guardati, ${c.bun.length} di bun test e ${c.playwright.length} spec di Playwright leggono il corpus`);
  if (c.bun.length === 0 || c.playwright.length === 0) {
    console.log("CONFERMA: ROSSA — il censimento non trova prove del corpus: il rilevatore non ha visto nulla");
    process.exit(1);
  }
  const delBun = await esegui([process.execPath, "test", ...c.bun.map((f) => `./${f}`)]);
  const diPlaywright = delBun === 0 ? await esegui([process.execPath, "--bun", "playwright", "test", ...c.playwright, "--project", "chromium-sviluppo"]) : -1;
  const dopo = misuraIlCorpus();
  if (delBun !== 0 || diPlaywright !== 0 || dopo.impronta !== prima.impronta) {
    console.log(`CONFERMA: ROSSA — bun test exit ${delBun}, Playwright ${diPlaywright === -1 ? "non eseguito" : `exit ${diPlaywright}`}${dopo.impronta !== prima.impronta ? ", il corpus è cambiato durante la conferma" : ""}: conteggi NON riscritti`);
    process.exit(1);
  }
  const conteggi: ConteggiDichiarati = { fatti: prima, confermati: { bun: c.bun, playwright: c.playwright } };
  writeFileSync(fileDeiConteggi, `${JSON.stringify(conteggi, null, 2)}\n`);
  console.log(`CONFERMA: VERDE | ${relative(radiceDellApp, fileDeiConteggi).replaceAll("\\", "/")} riscritto: ${JSON.stringify(prima.file)}, tipi ${JSON.stringify(prima.tipi)}`);
}
