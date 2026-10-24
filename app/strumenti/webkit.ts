// Le prove dell'interfaccia in un progetto solo di Playwright, sulla macchina che le esegue:
// `bun ./strumenti/webkit.ts --progetto <nome> [--processi <n>]`. Serve alla CI per correre il WebKit di Playwright per
// Linux (e per macOS), una volta per release; qui, sul PC di sviluppo, corre il WebKit per Windows. Il collaudo di ogni
// giorno (`collaudo.ts`) resta com'è.
//
// 1. BUILD: `bun run build`, perché il bersaglio «anteprima» serve `dist/` (ciò che Tauri mette nel programma).
// 2. ELENCO: le prove del progetto (`--list`), con gli stessi argomenti della corsa.
// 3. CORSA: le prove del progetto, coi processi dati e senza secondi tentativi (`--retries 0`: un'intermittenza è un
//    rosso, non un verde al secondo giro), più una sonda scritta per la corsa in `e2e/` (`__sonda_webkit__.e2e.ts`, una
//    prova che fallisce) e tolta dopo. Dal resoconto JSON: nessun errore fuori dalle prove (uno spec che non si carica),
//    le prove vere eseguite uguali a quelle elencate nei due versi (file e titolo), tutte con l'esito atteso; controllo
//    positivo: la sonda è fallita, una volta. Accanto la prova col margine di tempo più stretto, e le otto più vicine al
//    loro limite nel log.
//
// Che cosa NON guarda:
// - gli altri progetti della configurazione;
// - quante prove ci devono essere: le conta il collaudo, spec per spec, con l'atteso scritto nel suo codice; qui le
//   elencate e le eseguite si confrontano fra loro, e il numero si stampa;
// - il motore degli utenti: il WebKit di Playwright non è WebKitGTK (lo vede la prova sul prodotto di Linux) né il
//   WKWebView del programma per macOS;
// - i margini di tempo: si stampano, non fermano (la regola è in `playwright.config.ts`).
//
// Gli exit code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.

import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { differenzeDallElenco } from "./elenco-del-pacchetto";

const argomenti = process.argv.slice(2);
const valore = (nome: string): string | undefined => {
  const i = argomenti.indexOf(nome);
  return i >= 0 ? argomenti[i + 1] : undefined;
};
const progetto = valore("--progetto");
const processi = valore("--processi") ?? "2";
const conValore = new Set(["--progetto", "--processi"]);
const altri = argomenti.filter((a, i) => !conValore.has(a) && !conValore.has(argomenti[i - 1] ?? ""));
if (progetto === undefined || progetto.startsWith("--") || !/^\d+$/.test(processi) || altri.length > 0) {
  console.error(`uso: webkit --progetto <nome del progetto di Playwright> [--processi <n>] (ricevuti: ${JSON.stringify(argomenti)})`);
  process.exit(2);
}

const radice = join(import.meta.dir, "..");
const cartellaLog = join(radice, ".collaudo");
mkdirSync(cartellaLog, { recursive: true });
const istante = new Date().toISOString().replace(/[:.]/g, "-");
const fileLog = join(cartellaLog, `webkit-${progetto}-${istante}.log`);
const fileSonda = "__sonda_webkit__.e2e.ts";
const percorsoSonda = join(radice, "e2e", fileSonda);
const titoloSonda = "sonda dello strumento: questa prova deve fallire";

function log(testo: string): void {
  appendFileSync(fileLog, testo.endsWith("\n") ? testo : `${testo}\n`);
}

function riga(testo: string): void {
  console.log(testo);
  log(testo);
}

class Rosso extends Error {}

function rosso(fase: string, motivo: string): never {
  throw new Rosso(`${fase}: ROSSO — ${motivo}`);
}

async function esegui(cmd: string[], ambiente: Record<string, string> = {}): Promise<number> {
  log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({ cmd, cwd: radice, env: { ...process.env, ...ambiente }, stdout: "pipe", stderr: "pipe" });
  const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  log(out.length > 50_000 ? `${out.slice(-50_000)}\n(ultimi 50 000 di ${out.length} caratteri)` : out);
  log(err.length > 20_000 ? `${err.slice(-20_000)}\n(ultimi 20 000 di ${err.length} caratteri)` : err);
  log(`(exit ${codice})`);
  return codice;
}

type Prova = { file: string; titolo: string; progetto: string; stato: string; durata: number; limite: number };
type Suite = {
  suites?: Suite[];
  specs?: { file: string; title: string; tests: { projectName: string; status: string; timeout: number; results: { duration: number }[] }[] }[];
};
type Resoconto = { suites?: Suite[]; errors?: { message?: string }[] };

function proveDi(suite: Suite): Prova[] {
  const proprie = (suite.specs ?? []).flatMap((s) =>
    s.tests.map((t) => ({ file: s.file, titolo: s.title, progetto: t.projectName, stato: t.status, durata: Math.max(0, ...t.results.map((r) => r.duration)), limite: t.timeout })),
  );
  return [...proprie, ...(suite.suites ?? []).flatMap(proveDi)];
}

const chiave = (p: Prova) => `${p.file} › ${p.titolo}`;
/** Gli errori fuori dalle prove del resoconto, in una riga. */
const erroriDi = (dati: Resoconto) => (dati.errors ?? []).map((errore) => errore.message ?? "?").join("; ");
const comando = [process.execPath, "--bun", "playwright", "test", "--project", progetto, "--workers", processi, "--retries", "0", "--reporter=json"];

async function resoconto(fase: string, extra: string[]): Promise<{ codice: number; dati: Resoconto }> {
  const file = join(cartellaLog, `webkit-${progetto}-${fase}-${istante}.json`);
  rmSync(file, { force: true });
  const codice = await esegui([...comando, ...extra], { PLAYWRIGHT_JSON_OUTPUT_FILE: file });
  if (!existsSync(file)) rosso(fase.toUpperCase(), `exit ${codice} senza il resoconto JSON (dettaglio nel log)`);
  return { codice, dati: JSON.parse(readFileSync(file, "utf8")) as Resoconto };
}

let esito = 0;
riga(`WEBKIT: progetto ${progetto}, ${processi} processi — inizio ${new Date().toISOString()} | ${process.platform} | log ${fileLog}`);
try {
  if (existsSync(percorsoSonda)) rosso("SONDA", `${fileSonda} c'è già (resto di una corsa interrotta?): si guarda e si toglie a mano`);
  const inizio = Date.now();
  if ((await esegui([process.execPath, "run", "build"])) !== 0 || !existsSync(join(radice, "dist", "index.html"))) rosso("BUILD", "bun run build non ha prodotto dist/index.html (dettaglio nel log)");
  riga(`BUILD: VERDE | dist/ in ${Math.round((Date.now() - inizio) / 1000)} s`);

  const elenco = await resoconto("elenco", ["--list"]);
  if ((elenco.dati.errors ?? []).length > 0) rosso("ELENCO", `errori: ${erroriDi(elenco.dati)}`);
  const elencate = (elenco.dati.suites ?? []).flatMap(proveDi);
  const altriProgetti = [...new Set(elencate.map((p) => p.progetto))].filter((p) => p !== progetto);
  if (elenco.codice !== 0 || elencate.length === 0 || altriProgetti.length > 0) rosso("ELENCO", `exit ${elenco.codice}, ${elencate.length} prove, progetti estranei ${JSON.stringify(altriProgetti)}`);
  riga(`ELENCO: VERDE | ${elencate.length} prove nel progetto ${progetto}, in ${new Set(elencate.map((p) => p.file)).size} spec`);

  writeFileSync(percorsoSonda, `import { expect, test } from "@playwright/test";\ntest(${JSON.stringify(titoloSonda)}, () => {\n  expect(1).toBe(2);\n});\n`);
  const partenza = Date.now();
  let corsa: { codice: number; dati: Resoconto };
  try {
    corsa = await resoconto("corsa", []);
  } finally {
    rmSync(percorsoSonda, { force: true });
  }
  const minuti = ((Date.now() - partenza) / 60_000).toFixed(1);
  if ((corsa.dati.errors ?? []).length > 0) rosso("CORSA", `errori fuori dalle prove: ${erroriDi(corsa.dati)}`);
  const eseguite = (corsa.dati.suites ?? []).flatMap(proveDi);
  const dellaSonda = eseguite.filter((p) => p.file.endsWith(fileSonda));
  const vere = eseguite.filter((p) => !p.file.endsWith(fileSonda));
  // Le eseguite e le elencate, per elementi nei due versi.
  const confronto = differenzeDallElenco(vere.map(chiave), elencate.map(chiave));
  // Controllo positivo del confronto: con una prova tolta e una in più le dice tutte e due.
  const tolta = chiave(elencate[0]!);
  const controlloDelConfronto = differenzeDallElenco([...vere.map(chiave).filter((k) => k !== tolta), "sonda › in più"], elencate.map(chiave));
  if (!controlloDelConfronto.includes(`manca ${tolta}`) || !controlloDelConfronto.includes("in più sonda › in più")) rosso("CORSA", `il confronto delle prove non si accende: ${JSON.stringify(controlloDelConfronto.slice(0, 4))}`);
  if (confronto.length > 0) rosso("CORSA", `eseguite diverse dalle elencate: ${confronto.slice(0, 10).join("; ")}`);
  const nonVerdi = vere.filter((p) => p.stato !== "expected");
  if (nonVerdi.length > 0) rosso("CORSA", `${nonVerdi.length} prove non verdi su ${vere.length}: ${nonVerdi.map((p) => `${chiave(p)} (${p.stato})`).join("; ")}`);
  if (corsa.codice === 0 || dellaSonda.length !== 1 || dellaSonda[0]!.stato !== "unexpected")
    rosso("CORSA", `controllo positivo SPENTO: exit ${corsa.codice}, la sonda ${dellaSonda.length === 0 ? "non eseguita" : `con esito «${dellaSonda[0]!.stato}»`}`);
  const strette = [...vere].sort((a, b) => b.durata / b.limite - a.durata / a.limite);
  for (const p of strette.slice(0, 8)) log(`margine: ${(p.durata / 1000).toFixed(1)} s su ${p.limite / 1000} s (${Math.round((100 * p.durata) / p.limite)}%) ${chiave(p)}`);
  const stretta = strette[0]!;
  riga(
    `CORSA: VERDE | ${vere.length} su ${elencate.length} elencate, tutte verdi, in ${minuti} min | controllo positivo acceso (la sonda è fallita) | margine più stretto ${Math.round((100 * stretta.durata) / stretta.limite)}% del limite (${(stretta.durata / 1000).toFixed(1)} s su ${stretta.limite / 1000} s, ${chiave(stretta)})`,
  );
  riga(`ESITO: VERDE | ${progetto}: ${vere.length} prove verdi`);
} catch (e) {
  riga(e instanceof Rosso ? e.message : `ERRORE: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  riga("ESITO: ROSSO");
  esito = 1;
}
process.exit(esito);
