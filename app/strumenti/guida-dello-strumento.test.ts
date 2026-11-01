// La guida dello strumento dice le opzioni che lo strumento ha: quelle dell'aiuto vero di ogni comando contro quelle della
// sua tabella nella guida, per elementi e nei due versi, e i linguaggi del registro contro quelli che la guida elenca.
//
// Che cosa NON guarda: che cosa dicono le parole accanto alle opzioni; i blocchi d'esempio, provati una volta dai log.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { linguaggi } from "../core/genera/linguaggi";

const radice = join(import.meta.dir, "..", "..");
const guida = readFileSync(join(radice, "docs", "GUIDA-AD-ALGODESIGN-TOOLS.md"), "utf8").replaceAll("\r\n", "\n");

/** Le opzioni dell'aiuto di un comando: le righe che cominciano con un'opzione, dopo il rientro. */
export function opzioniDellAiuto(aiuto: string): string[] {
  return [...aiuto.matchAll(/^ {2}(--?[a-z]+)\b/gm)].map((m) => m[1]!).sort();
}

/** Le opzioni della tabella che segue un titolo: la prima cella di ogni riga, fra apici inversi. */
export function opzioniDellaGuida(testo: string, titolo: string): string[] {
  const dopo = testo.slice(testo.indexOf(`\n${titolo}\n`));
  const tabella = /\n\| Opzione \|[^\n]*\n\|---[^\n]*\n((?:\|[^\n]*\n)+)/.exec(dopo)?.[1] ?? "";
  return [...tabella.matchAll(/^\| `(--?[a-z]+)` \|/gm)].map((m) => m[1]!).sort();
}

const aiuto = (comando: string): string => {
  const p = Bun.spawnSync([process.execPath, join(import.meta.dir, "algodesign-tools.ts"), comando, "-h"]);
  expect(p.exitCode).toBe(0);
  return p.stdout.toString();
};

for (const [comando, titolo] of [
  ["accademico", "## 2. Il comando `accademico`"],
  ["stampa", "### Le opzioni"],
] as const) {
  test(`le opzioni di ${comando}: quelle dell'aiuto sono quelle della guida`, () => {
    const vere = opzioniDellAiuto(aiuto(comando));
    const scritte = opzioniDellaGuida(guida, titolo);
    console.log(`${comando}: ${vere.length} opzioni nell'aiuto, ${scritte.length} nella guida`);
    expect(vere.length).toBeGreaterThan(2);
    expect({ senzaVoce: vere.filter((o) => !scritte.includes(o)), senzaOpzione: scritte.filter((o) => !vere.includes(o)) }).toEqual({ senzaVoce: [], senzaOpzione: [] });
  });
}

test("i linguaggi a scelta della guida sono quelli del registro", () => {
  const riga = guida.split("\n").find((r) => r.startsWith("I linguaggi si chiamano "))!;
  const scritti = [...riga.slice(0, riga.indexOf(", anche")).matchAll(/`([a-z]+)`/g)].map((m) => m[1]!);
  expect(scritti).toEqual(linguaggi.map((v) => v.id));
});

test("il confronto vede un'opzione tolta dalla guida e una in più", () => {
  const titolo = "### Le opzioni";
  const vere = opzioniDellaGuida(guida, titolo);
  expect(vere.length).toBeGreaterThan(2);
  expect(opzioniDellaGuida(guida.replace("| `--lingua` |", "| niente |"), titolo)).toEqual(vere.filter((o) => o !== "--lingua"));
  expect(opzioniDellaGuida(guida.replace("| `--lingua` |", "| `--altra` | prova |\n| `--lingua` |"), titolo)).toEqual([...vere, "--altra"].sort());
  // La sonda dell'aiuto: un'opzione con la sua spiegazione si conta, una parola dopo il rientro no.
  expect(opzioniDellAiuto("  -o cartella   dove\n  --lingua it|en  la lingua\n  bun run tools\n")).toEqual(["--lingua", "-o"]);
});
