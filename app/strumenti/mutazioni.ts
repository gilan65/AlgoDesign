// Le mutazioni dell'interprete fuori da `bun test`: `bun run mutazioni` le esegue (ognuna rifà il corpus intero) e, solo se
// sono verdi, registra in `mutazioni-confermate.json` l'impronta di `core/interprete/` e quante sono. La porta «mutazioni»
// del collaudo (anche con `--solo-elenco`, in un secondo) è rossa se la cartella è cambiata dopo l'ultima conferma: così si
// rifanno quando si tocca l'interprete, e solo allora.
//
// Che cosa questa porta NON guarda: il corpus e il resto del nucleo. Un caso d'uso tolto o cambiato può spegnere una
// mutazione senza che l'impronta se ne accorga, e così un cambiamento nel controllo statico o nelle espressioni che
// l'interprete usa: per quello si lancia a mano `bun run mutazioni`. L'impronta guarda i testi, non il significato: un
// commento cambiato chiede di rifarle.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

/** Con questa variabile a "1", `core/interprete/interprete.test.ts` definisce le mutazioni. */
export const variabileDelleMutazioni = "ALGODESIGN_MUTAZIONI";
/** Il nome del loro gruppo, che le sceglie fra le prove del file. */
const gruppo = "mutazioni:";

const radice = join(import.meta.dir, "..");
const cartella = join(radice, "core", "interprete");
const fileDellaConferma = join(radice, "strumenti", "mutazioni-confermate.json");

export type Conferma = { readonly impronta: string; readonly mutazioni: number };

/** L'impronta di un insieme di file: i nomi e i testi, in ordine di nome, con le fini riga uguali (lo stesso file è lo stesso
 * anche se un'estrazione lo lascia CRLF). */
export function improntaDi(testi: readonly { readonly nome: string; readonly testo: string }[]): string {
  const h = createHash("sha256");
  for (const { nome, testo } of [...testi].sort((a, b) => (a.nome < b.nome ? -1 : 1))) h.update(`${nome}\n${testo.replaceAll("\r\n", "\n")}\n`);
  return h.digest("hex");
}

/** I file di cui le mutazioni dipendono: ogni file di `core/interprete/`, prove comprese (l'elenco delle mutazioni e le
 * sequenze attese stanno lì). */
export function fileDellInterprete(): { nome: string; testo: string }[] {
  return readdirSync(cartella, { withFileTypes: true })
    .filter((v) => v.isFile())
    .map((v) => ({ nome: relative(radice, join(cartella, v.name)).replaceAll("\\", "/"), testo: readFileSync(join(cartella, v.name), "utf8") }));
}

export const leggiLaConferma = (): Conferma | undefined => (existsSync(fileDellaConferma) ? (JSON.parse(readFileSync(fileDellaConferma, "utf8")) as Conferma) : undefined);

const decodifica = (t: string) => t.replace(/&(apos|quot|lt|gt|amp);/g, (_e, n: string) => ({ apos: "'", quot: '"', lt: "<", gt: ">", amp: "&" })[n]!);

/** Le prove di un report junit: quelle eseguite (uno `skipped` è una prova che il filtro ha lasciato fuori) e le fallite. */
export function proveDelReport(xml: string): { eseguite: string[]; fallite: string[] } {
  const prove = [...xml.matchAll(/<testcase\b[^>]*\bname="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g)].map((m) => ({
    nome: decodifica(m[1]!),
    fallita: /<failure\b/.test(m[3] ?? ""),
    saltata: /<skipped\b/.test(m[3] ?? ""),
  }));
  const eseguite = prove.filter((p) => !p.saltata);
  return { eseguite: eseguite.map((p) => p.nome), fallite: eseguite.filter((p) => p.fallita).map((p) => p.nome) };
}

if (import.meta.main) {
  const prima = improntaDi(fileDellInterprete());
  const cartellaDelReport = join(radice, ".collaudo");
  mkdirSync(cartellaDelReport, { recursive: true });
  const report = join(cartellaDelReport, "junit-mutazioni.xml");
  rmSync(report, { force: true });
  console.log(`MUTAZIONI: INIZIO | impronta ${prima}`);
  const proc = Bun.spawn([process.execPath, "test", "./core/interprete/interprete.test.ts", "-t", gruppo, "--reporter=junit", `--reporter-outfile=${report}`], {
    cwd: radice,
    env: { ...process.env, [variabileDelleMutazioni]: "1" },
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  });
  const codice = await proc.exited;
  const { eseguite, fallite } = existsSync(report) ? proveDelReport(readFileSync(report, "utf8")) : { eseguite: [], fallite: [] };
  const problemi = [
    ...(codice !== 0 ? [`bun test exit ${codice}`] : []),
    ...(eseguite.length === 0 ? ["nessuna mutazione eseguita"] : []),
    ...fallite.map((n) => `rossa: ${n}`),
    // Un sorgente toccato mentre giravano: la conferma non varrebbe per quello che c'è ora.
    ...(improntaDi(fileDellInterprete()) !== prima ? ["core/interprete/ è cambiata durante la corsa"] : []),
  ];
  if (problemi.length > 0) {
    console.log(`MUTAZIONI: ROSSE — ${problemi.join("; ")}: conferma NON riscritta`);
    process.exit(1);
  }
  const conferma: Conferma = { impronta: prima, mutazioni: eseguite.length };
  writeFileSync(fileDellaConferma, `${JSON.stringify(conferma, null, 2)}\n`);
  console.log(`MUTAZIONI: VERDI | ${eseguite.length} eseguite, conferma riscritta (${relative(radice, fileDellaConferma).replaceAll("\\", "/")})`);
}
