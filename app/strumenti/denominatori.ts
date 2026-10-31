// I numeri scritti a mano nelle asserzioni delle prove che leggono il corpus: il rilevatore della prova-guardia
// (`strumenti/corpus.test.ts`) e del censimento (`bun ./strumenti/denominatori.ts`).
//
// Un denominatore del corpus (file, casi, alberi, blocchi, esiti: tutto ciò che cambia se il corpus cresce) non si
// scrive a mano: si confronta con `confermato(nome, ottenuto)` di `strumenti/corpus.ts`, che `bun run conferma-corpus`
// registra. Un numero che resta scritto è un VALORE PRECISO (un output, una coordinata, un codice, un conto di un albero
// costruito nella prova), dichiarato in `strumenti/valori-precisi.ts` col perché.
//
// Che cosa guarda: l'argomento dei confronti `toBe`, `toEqual`, `toStrictEqual`, `toHaveLength`, `toMatchObject`,
// `toBeLessThan(OrEqual)` (anche i tempi massimi) nei file di prova del censimento (`censimento()`), e in esso i numeri
// FUORI dalle stringhe, più un «totale N» dentro una stringa.
// Che cosa NON guarda:
// - i limiti inferiori (`toBeGreaterThan(OrEqual)`): un corpus che cresce non li rompe (sono le premesse «ce ne sono»
//   delle prove), e uno che cala li rompe a ragione;
// - lo zero (l'assenza attesa di difetti non cresce col corpus) e gli indici `x[0]`;
// - i numeri dentro le stringhe, salvo «totale N» (un output come "444" è un valore, non un conto);
// - i numeri fuori dall'argomento del confronto (`expect(x, "60 file")`, una variabile `const atteso = 60` usata dopo):
//   un denominatore scritto in una variabile sfugge, e lo trova solo il censimento letto a mano;
// - gli elenchi di NOMI scritti a mano (`conRisultato`, `fuoriDalleTappe`): li trova il censimento letto a mano;
// - i file che non leggono il corpus (non ne sono nel censimento).

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const confronti = ["toBe", "toEqual", "toStrictEqual", "toHaveLength", "toMatchObject", "toBeLessThan", "toBeLessThanOrEqual"] as const;

export interface NumeroInUnaAsserzione {
  /** La riga (da 1) dove comincia il confronto. */
  readonly riga: number;
  /** Il testo della riga, senza spazi in testa e in coda: la chiave delle eccezioni. */
  readonly testo: string;
  readonly confronto: string;
  /** I numeri trovati nell'argomento, nell'ordine. */
  readonly numeri: readonly string[];
}

/** Il codice dell'argomento con le stringhe svuotate (le virgolette restano), più i «totale N» trovati nelle stringhe;
 * `fine` è la posizione della parentesi che chiude. */
function argomento(t: string, inizio: number): { codice: string; totali: string[]; fine: number } {
  let codice = "";
  const totali: string[] = [];
  let profondita = 1;
  let i = inizio;
  // La pila dei contesti: "(" codice, "`" testo di un modello, "${" codice dentro un modello.
  const pila: string[] = ["("];
  const leggiStringa = (q: string): void => {
    let s = "";
    i++;
    while (i < t.length && t[i] !== q) {
      if (t[i] === "\\") {
        s += t[i]! + (t[i + 1] ?? "");
        i += 2;
        continue;
      }
      s += t[i];
      i++;
    }
    i++;
    codice += `${q}${q}`;
    for (const m of s.matchAll(/totale \d+/g)) totali.push(m[0]);
  };
  while (i < t.length) {
    const ch = t[i]!;
    const cima = pila.at(-1)!;
    if (cima === "`") {
      let s = "";
      while (i < t.length && t[i] !== "`" && !(t[i] === "$" && t[i + 1] === "{")) {
        if (t[i] === "\\") {
          s += t[i]! + (t[i + 1] ?? "");
          i += 2;
          continue;
        }
        s += t[i];
        i++;
      }
      for (const m of s.matchAll(/totale \d+/g)) totali.push(m[0]);
      if (t[i] === "`") {
        pila.pop();
        codice += "`";
        i++;
      } else {
        pila.push("${");
        codice += "${";
        i += 2;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      leggiStringa(ch);
      continue;
    }
    if (ch === "`") {
      pila.push("`");
      codice += "`";
      i++;
      continue;
    }
    if (ch === "/" && t[i + 1] === "/") {
      while (i < t.length && t[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && t[i + 1] === "*") {
      const f = t.indexOf("*/", i + 2);
      i = f < 0 ? t.length : f + 2;
      continue;
    }
    if (ch === "{" && (cima === "${" || cima === "{")) {
      pila.push("{");
    } else if (ch === "}" && (cima === "${" || cima === "{")) {
      pila.pop();
      codice += ch;
      i++;
      continue;
    } else if (ch === "(") {
      profondita++;
    } else if (ch === ")") {
      profondita--;
      if (profondita === 0 && pila.length === 1) return { codice, totali, fine: i };
    }
    codice += ch;
    i++;
  }
  return { codice, totali, fine: i };
}

/** I numeri scritti nell'argomento di ogni confronto del testo di un file di prova. */
export function numeriNelleAsserzioni(testo: string): NumeroInUnaAsserzione[] {
  const righe = testo.split("\n");
  const inizioDellaRiga: number[] = [];
  let p = 0;
  for (const r of righe) {
    inizioDellaRiga.push(p);
    p += r.length + 1;
  }
  const rigaDi = (pos: number): number => {
    let a = 0;
    let b = inizioDellaRiga.length - 1;
    while (a < b) {
      const m = (a + b + 1) >> 1;
      if (inizioDellaRiga[m]! <= pos) a = m;
      else b = m - 1;
    }
    return a + 1;
  };
  const trovati: NumeroInUnaAsserzione[] = [];
  const re = new RegExp(`\\.(${confronti.join("|")})\\(`, "g");
  for (const m of testo.matchAll(re)) {
    const riga = rigaDi(m.index);
    // Una riga di commento non è un'asserzione.
    if (righe[riga - 1]!.trimStart().startsWith("//")) continue;
    const { codice, totali } = argomento(testo, m.index + m[0].length);
    const numeri: string[] = [];
    for (const n of codice.matchAll(/(?<![\w$.])(\d+(?:\.\d+)?)(?![\w$])/g)) {
      const prima = codice.slice(0, n.index).trimEnd();
      // Un indice (`x[0]`, `a![3]`) non è un conto.
      if (prima.endsWith("[") && /[\w$\])!]$/.test(prima.slice(0, -1).trimEnd())) continue;
      if (Number(n[1]) === 0) continue;
      numeri.push(n[1]!);
    }
    numeri.push(...totali);
    if (numeri.length > 0) trovati.push({ riga, testo: righe[riga - 1]!.trim(), confronto: m[1]!, numeri });
  }
  return trovati;
}

if (import.meta.main) {
  const { censimento, radiceDellApp } = await import("./corpus");
  const c = censimento();
  const file = [...c.bun, ...c.playwright];
  const json = process.argv.includes("--json");
  const tutti: (NumeroInUnaAsserzione & { file: string })[] = [];
  for (const f of file) for (const n of numeriNelleAsserzioni(readFileSync(join(radiceDellApp, f), "utf8"))) tutti.push({ file: f, ...n });
  const totale = tutti.length;
  if (json) {
    console.log(JSON.stringify(tutti));
    process.exit(0);
  }
  for (const n of tutti) console.log(`${n.file}:${n.riga}: [${n.numeri.join(" ")}] ${n.testo.slice(0, 180)}`);
  console.log(`totale: ${totale} asserzioni con un numero scritto, in ${file.length} file (${c.bun.length} di bun, ${c.playwright.length} spec di Playwright)`);
}
