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
// I DENOMINATORI delle prove (i conti che cambiano se il corpus cresce: file, casi, alberi, blocchi, esiti) non si
// scrivono a mano: `expect(x).toEqual(confermato("nome", x))`. Fuori dalla conferma `confermato` restituisce il valore
// registrato nel file dei conteggi (`denominatori`); durante la conferma restituisce l'ottenuto e lo registra, un file
// per nome sotto `.collaudo/denominatori/` (Playwright ha più processi). La conferma, solo se le prove sono verdi,
// scrive i registrati nel file e stampa i nomi aggiunti, tolti e cambiati. I numeri che restano scritti nelle prove
// del censimento sono valori precisi, dichiarati in `strumenti/valori-precisi.ts` e tenuti dalla prova-guardia
// (`strumenti/corpus.test.ts`, col rilevatore di `strumenti/denominatori.ts`).
//
// Uso, da `app/`:
//   bun ./strumenti/corpus.ts              il confronto dei conteggi dichiarati col disco (exit 0 uguali, 1 diversi)
//   bun ./strumenti/corpus.ts --conferma   le prove del censimento, poi, se verdi, i conteggi e i denominatori riscritti
//
// Che cosa NON guarda:
// - un denominatore registrato sbagliato perché la prova legge male il corpus: la conferma registra ciò che la prova
//   ottiene (il file riscritto si rilegge nel diff, e i fatti misurati qui dal disco restano un secondo rilevatore);
// - una prova che legge il corpus senza `readdirSync` (un file per nome): non conta le cartelle, e un file nuovo non
//   la sposta;
// - gli strumenti (`casi.ts`, `differenziale.ts`, il collaudo), che contano dal disco e confrontano con `elenco.json`.

import { createHash } from "node:crypto";
import { existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { apri } from "../core/progetto/formato";
import { usaIRecord, usaLeMatrici, usaLeTabelle, type Progetto } from "../core/progetto/modello";
import { numeriNelleAsserzioni } from "./denominatori";
import { valoriPrecisi } from "./valori-precisi";

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
  /** I denominatori delle prove, per nome, come la conferma li ha registrati. */
  readonly denominatori?: Readonly<Record<string, unknown>>;
}

/** La variabile d'ambiente che la conferma mette ai processi delle prove: la cartella dove `confermato` registra. */
export const variabileDellaConferma = "ALGODESIGN_CONFERMA_DENOMINATORI";

/** Il nome di un denominatore è anche il nome del suo file: minuscole, cifre, spazi, `,.()+-`, e niente spazio o punto
 * in fondo (Windows li toglie). */
export const nomeDiUnDenominatore = /^[a-z0-9][a-z0-9 ,.()+-]{0,118}[a-z0-9)]$/;

let denominatoriDichiarati: Readonly<Record<string, unknown>> | undefined;

/** Il denominatore `nome`: fuori dalla conferma il valore registrato, durante la conferma l'ottenuto, registrato.
 * Uso: `expect(x).toEqual(confermato("nome", x))`. */
export function confermato<T>(nome: string, ottenuto: T): T {
  if (!nomeDiUnDenominatore.test(nome)) throw new Error(`il nome del denominatore «${nome}» non è un nome di file sicuro (${nomeDiUnDenominatore})`);
  const cartella = process.env[variabileDellaConferma];
  if (cartella !== undefined && cartella !== "") {
    registra(cartella, nome, ottenuto);
    return ottenuto;
  }
  denominatoriDichiarati ??= leggiIConteggi().denominatori ?? {};
  if (!Object.hasOwn(denominatoriDichiarati, nome)) throw new Error(`il denominatore «${nome}» non è confermato: bun run conferma-corpus`);
  return denominatoriDichiarati[nome] as T;
}

/** Un file per nome, creato in un colpo solo (`linkSync` di un file già scritto): un secondo processo che registra lo
 * stesso nome trova il file intero, e un valore diverso è rosso. */
function registra(cartella: string, nome: string, ottenuto: unknown): void {
  const testo = JSON.stringify(ottenuto);
  if (testo === undefined || !isDeepStrictEqual(JSON.parse(testo), ottenuto)) throw new Error(`il denominatore «${nome}» non si scrive in JSON senza perdite: ${String(ottenuto)}`);
  mkdirSync(cartella, { recursive: true });
  const finale = join(cartella, `${nome}.json`);
  const provvisorio = join(cartella, `${nome}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync(provvisorio, testo);
  try {
    linkSync(provvisorio, finale);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    const prima = readFileSync(finale, "utf8");
    if (prima !== testo) throw new Error(`il denominatore «${nome}» ha due valori nella stessa conferma: ${prima} e ${testo}`);
  } finally {
    unlinkSync(provvisorio);
  }
}

/** I denominatori registrati in una cartella della conferma. */
export function registrati(cartella: string): Record<string, unknown> {
  const fuori: Record<string, unknown> = {};
  if (!existsSync(cartella)) return fuori;
  for (const f of readdirSync(cartella).sort())
    if (f.endsWith(".json")) fuori[f.slice(0, -".json".length)] = JSON.parse(readFileSync(join(cartella, f), "utf8"));
  return fuori;
}

/** I nomi dei denominatori scritti nelle prove (il primo argomento di `confermato`, una stringa fra virgolette doppie),
 * e le chiamate il cui primo argomento non lo è. */
export function nomiNelleProve(testo: string): { readonly nomi: string[]; readonly senzaNome: number } {
  const nomi: string[] = [];
  let senzaNome = 0;
  for (const m of testo.matchAll(/\bconfermato\(\s*("([^"\\\n]*)")?/g)) {
    if (m[2] === undefined) senzaNome++;
    else nomi.push(m[2]);
  }
  return { nomi, senzaNome };
}

/** Le differenze fra i denominatori di prima e quelli registrati, per la stampa della conferma. */
export function cambiDeiDenominatori(prima: Readonly<Record<string, unknown>>, dopo: Readonly<Record<string, unknown>>): string[] {
  const righe: string[] = [];
  for (const k of Object.keys(dopo).sort())
    if (!Object.hasOwn(prima, k)) righe.push(`aggiunto  «${k}»: ${JSON.stringify(dopo[k])}`);
    else if (!isDeepStrictEqual(prima[k], dopo[k])) righe.push(`cambiato  «${k}»: ${JSON.stringify(prima[k])} → ${JSON.stringify(dopo[k])}`);
  for (const k of Object.keys(prima).sort()) if (!Object.hasOwn(dopo, k)) righe.push(`tolto     «${k}»: era ${JSON.stringify(prima[k])}`);
  return righe;
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

/** I file di prova (`*.test.ts`, `*.test.tsx`) e gli spec di Playwright (`e2e/*.e2e.ts`): percorsi relativi ad `app/`,
 * con le barre, in ordine. */
export function fileDiProva(): { readonly nome: string; readonly spec: boolean }[] {
  const fuori: { nome: string; spec: boolean }[] = [];
  const visita = (cartella: string): void => {
    for (const v of readdirSync(cartella, { withFileTypes: true })) {
      const percorso = join(cartella, v.name);
      if (v.isDirectory()) {
        if (v.name !== "node_modules" && v.name !== "dist" && !v.name.startsWith(".")) visita(percorso);
        continue;
      }
      const nome = relative(radiceDellApp, percorso).replaceAll("\\", "/");
      const spec = nome.startsWith("e2e/") && v.name.endsWith(".e2e.ts");
      if (/\.test\.tsx?$/.test(v.name) || spec) fuori.push({ nome, spec });
    }
  };
  visita(radiceDellApp);
  return fuori.sort((a, b) => (a.nome < b.nome ? -1 : 1));
}

/** Le prove che leggono il corpus, coi file guardati: percorsi relativi ad `app/`, con le barre. */
export function censimento(): { readonly bun: string[]; readonly playwright: string[]; readonly guardati: number } {
  const bun: string[] = [];
  const playwright: string[] = [];
  const tutti = fileDiProva();
  for (const { nome, spec } of tutti) if (leggeIlCorpus(readFileSync(join(radiceDellApp, nome), "utf8"))) (spec ? playwright : bun).push(nome);
  return { bun, playwright, guardati: tutti.length };
}

/** Il separatore delle chiavi: un carattere che il testo di una riga non ha. */
const SEP = String.fromCharCode(0);

/** I numeri scritti nei testi dati che non sono valori precisi dichiarati, e le voci dichiarate che non trovano più la
 * loro asserzione. */
export function numeriNonDichiarati(testi: ReadonlyMap<string, string>): { readonly trovati: number; readonly nonDichiarati: string[]; readonly senzaAsserzione: string[] } {
  const voci = new Map<string, number>();
  for (const v of valoriPrecisi) for (const [n, t] of v.righe) voci.set(`${v.file}${SEP}${n}${SEP}${t}`, 0);
  const nonDichiarati: string[] = [];
  let trovati = 0;
  for (const [file, testo] of testi)
    for (const a of numeriNelleAsserzioni(testo)) {
      trovati++;
      const k = `${file}${SEP}${a.numeri.join(" ")}${SEP}${a.testo}`;
      const visti = voci.get(k);
      if (visti === undefined) nonDichiarati.push(`${file}:${a.riga}: [${a.numeri.join(" ")}] ${a.testo}`);
      else voci.set(k, visti + 1);
    }
  const senzaAsserzione = [...voci].filter(([k, n]) => n === 0 && testi.has(k.split(SEP)[0]!)).map(([k]) => k.replaceAll(SEP, " | "));
  return { trovati, nonDichiarati, senzaAsserzione };
}

export const testiDelCensimento = (): Map<string, string> => {
  const c = censimento();
  return new Map([...c.bun, ...c.playwright].map((f) => [f, readFileSync(join(radiceDellApp, f), "utf8")]));
};

/** I denominatori scritti nelle prove e quelli dichiarati nel file dei conteggi, nei due versi; e le prove fuori dal
 * censimento che chiamano `confermato` (la conferma non le esegue). */
export function denominatoriDaConfermare(): { readonly scritti: number; readonly nonDichiarati: string[]; readonly dichiaratiSenzaProva: string[]; readonly fuoriDalCensimento: string[]; readonly senzaNome: string[]; readonly nomiNonValidi: string[] } {
  const c = censimento();
  const delCensimento = new Set([...c.bun, ...c.playwright]);
  const scritti = new Set<string>();
  const fuoriDalCensimento: string[] = [];
  const senzaNome: string[] = [];
  for (const { nome } of fileDiProva()) {
    const n = nomiNelleProve(readFileSync(join(radiceDellApp, nome), "utf8"));
    if (n.nomi.length + n.senzaNome === 0) continue;
    if (!delCensimento.has(nome)) fuoriDalCensimento.push(nome);
    if (n.senzaNome > 0) senzaNome.push(nome);
    for (const x of n.nomi) scritti.add(x);
  }
  const dichiarati = leggiIConteggi().denominatori ?? {};
  return {
    scritti: scritti.size,
    nonDichiarati: [...scritti].filter((n) => !Object.hasOwn(dichiarati, n)).sort(),
    dichiaratiSenzaProva: Object.keys(dichiarati).filter((n) => !scritti.has(n)),
    fuoriDalCensimento,
    senzaNome,
    nomiNonValidi: [...scritti].filter((n) => !nomeDiUnDenominatore.test(n)),
  };
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

async function esegui(cmd: string[], env: Record<string, string | undefined>): Promise<number> {
  console.log(`$ ${cmd.join(" ")}`);
  const p = Bun.spawn({ cmd, cwd: radiceDellApp, stdout: "inherit", stderr: "inherit", env });
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
  // I nomi dei denominatori scritti nelle prove del censimento: ognuno deve essere registrato dalla corsa.
  const scritti = new Set<string>();
  for (const f of [...c.bun, ...c.playwright]) {
    const n = nomiNelleProve(readFileSync(join(radiceDellApp, f), "utf8"));
    if (n.senzaNome > 0) {
      console.log(`CONFERMA: ROSSA — ${f}: ${n.senzaNome} chiamate di confermato senza un nome fra virgolette doppie`);
      process.exit(1);
    }
    for (const x of n.nomi) scritti.add(x);
  }
  const cartella = join(radiceDellApp, ".collaudo", "denominatori");
  rmSync(cartella, { recursive: true, force: true });
  mkdirSync(cartella, { recursive: true });
  const env = { ...process.env, [variabileDellaConferma]: cartella };
  const delBun = await esegui([process.execPath, "test", ...c.bun.map((f) => `./${f}`)], env);
  const diPlaywright = delBun === 0 ? await esegui([process.execPath, "--bun", "playwright", "test", ...c.playwright, "--project", "chromium-sviluppo"], env) : -1;
  const dopo = misuraIlCorpus();
  if (delBun !== 0 || diPlaywright !== 0 || dopo.impronta !== prima.impronta) {
    console.log(`CONFERMA: ROSSA — bun test exit ${delBun}, Playwright ${diPlaywright === -1 ? "non eseguito" : `exit ${diPlaywright}`}${dopo.impronta !== prima.impronta ? ", il corpus è cambiato durante la conferma" : ""}: conteggi NON riscritti`);
    process.exit(1);
  }
  const nuovi = registrati(cartella);
  const nonRegistrati = [...scritti].filter((n) => !Object.hasOwn(nuovi, n)).sort();
  const senzaProva = Object.keys(nuovi).filter((n) => !scritti.has(n));
  console.log(`CONFERMA: denominatori scritti nelle prove ${scritti.size}, registrati ${Object.keys(nuovi).length}`);
  if (nonRegistrati.length > 0 || senzaProva.length > 0 || scritti.size === 0) {
    console.log(
      `CONFERMA: ROSSA — ${scritti.size === 0 ? "nessun denominatore nelle prove: il rilevatore non ha visto nulla; " : ""}` +
        `${nonRegistrati.length > 0 ? `scritti e non registrati (la prova che li chiama non è corsa): ${nonRegistrati.join(" | ")}; ` : ""}` +
        `${senzaProva.length > 0 ? `registrati e non scritti in una prova del censimento: ${senzaProva.join(" | ")}; ` : ""}conteggi NON riscritti`,
    );
    process.exit(1);
  }
  const vecchi = leggiIConteggi().denominatori ?? {};
  const cambi = cambiDeiDenominatori(vecchi, nuovi);
  for (const r of cambi) console.log(`  ${r}`);
  const conteggi: ConteggiDichiarati = { fatti: prima, confermati: { bun: c.bun, playwright: c.playwright }, denominatori: nuovi };
  writeFileSync(fileDeiConteggi, `${JSON.stringify(conteggi, null, 2)}\n`);
  console.log(
    `CONFERMA: VERDE | ${relative(radiceDellApp, fileDeiConteggi).replaceAll("\\", "/")} riscritto: ${JSON.stringify(prima.file)}, tipi ${JSON.stringify(prima.tipi)}; ` +
      `denominatori ${Object.keys(nuovi).length} (${cambi.length === 0 ? "nessuno cambiato" : `${cambi.length} aggiunti, tolti o cambiati`})`,
  );
}
