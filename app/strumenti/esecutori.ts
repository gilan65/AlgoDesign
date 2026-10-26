// Gli esecutori del test differenziale: uno per ogni linguaggio «da eseguire» del registro (`core/genera/linguaggi.ts`),
// con lo stesso identificatore. È la metà del contratto dei linguaggi che sta negli strumenti: come si trova la
// toolchain, come si compila (se serve) e si esegue il programma generato, quali avvisi del compilatore sono attesi e per
// quali programmi. Lo leggono il differenziale (che fa girare i programmi) e il collaudo (che ne ricava gli esecutori
// richiesti e i programmi con gli avvisi attesi): nessuno dei due elenca i linguaggi a mano.
//
// Un esecutore ha una o più FAMIGLIE della sua toolchain (il C: gcc e clang), tutte richieste: il collaudo è rosso se ne
// manca una, il differenziale lo dice nella riga della toolchain e corre con quelle che trova. Ogni eseguibile trovato
// è una macchina, chiamata come la sua famiglia (`gcc`; un secondo gcc `gcc-2`); un esecutore del differenziale è una
// macchina in una lingua del codice (`gcc it`).
//
// La toolchain di un esecutore, nell'ordine:
// 1. la sua variabile d'ambiente (`ALGODESIGN_CC`: gli eseguibili dei compilatori, separati come nel PATH;
//    `ALGODESIGN_PYTHON`: l'eseguibile di Python);
// 2. l'impostazione locale `.collaudo/toolchain.json` (non versionata), alla chiave del linguaggio:
//    `{ "c": [ … ], "python": "…" }`, coi percorsi assoluti o relativi alla cartella dell'app;
// 3. il PATH, coi nomi dell'esecutore.
// Un eseguibile si riconosce da ciò che stampa con `--version`, mai dal nome del file (un `gcc.exe` può essere clang).
//
// Questo modulo non esegue nulla quando lo si carica.

import { existsSync, readFileSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import type { GenereDelLinguaggio, Linguaggio } from "../core/genera/linguaggi";
import type { LinguaDelCodice } from "../core/genera/nomi";

/** Le lingue del codice in cui ogni programma generato si prova. */
export const lingueDelCodice: readonly LinguaDelCodice[] = ["it", "en"];

/** Un eseguibile della toolchain: `nome` è la famiglia, con `-2`, `-3` per una famiglia ripetuta. */
export type Macchina = { nome: string; famiglia: string; versione: string; percorso: string };

export interface Esecutore {
  readonly linguaggio: Linguaggio;
  /** Il nome nella riga della toolchain del differenziale. */
  readonly nome: string;
  /** Chi è un eseguibile di questa toolchain, nei problemi («il compilatore C …»). */
  readonly chi: string;
  /** Il problema quando non se ne trova nessuno. */
  readonly nessuno: string;
  readonly variabile: string;
  /** I nomi da cercare nel PATH. */
  readonly nelPath: () => readonly string[];
  /** Tutti gli eseguibili indicati, o solo il primo. */
  readonly molti: boolean;
  /** Le famiglie della toolchain, tutte richieste dal collaudo. */
  readonly famiglie: readonly string[];
  /** La famiglia e la versione dalla prima riga di `--version`, o niente se non è di questa toolchain. */
  readonly riconosci: (riga: string) => { famiglia: string; versione: string } | undefined;
  /** Il comando che compila il sorgente, e l'eseguibile che produce; manca per un linguaggio che non si compila. */
  readonly compila?: (m: Macchina, sorgente: string) => { comando: string[]; eseguibile: string };
  /** Il comando che esegue il programma: `file` è l'eseguibile compilato o, senza compilazione, il sorgente. */
  readonly esegui: (m: Macchina, file: string) => string[];
  /** Gli avvisi nel testo del compilatore: quanti, e l'opzione di ognuno che ne ha una. */
  readonly avvisi?: (testo: string) => { quanti: number; opzioni: string[] };
  /** I programmi del corpus che avvisano compilati, per nome del file, con l'opzione dell'avviso. Ogni altro programma
   * della tappa compila senza avvisi. */
  readonly avvisiAttesi: Readonly<Record<string, string>>;
}

const suWindows = process.platform === "win32";

export const esecutori: readonly Esecutore[] = [
  {
    linguaggio: "python",
    nome: "Python",
    chi: "il Python",
    nessuno: "nessun Python",
    variabile: "ALGODESIGN_PYTHON",
    nelPath: () => (suWindows ? ["python"] : ["python3", "python"]),
    molti: false,
    famiglie: ["python"],
    riconosci: (riga) => {
      const m = riga.match(/^Python (\d\S*)/);
      return m === null ? undefined : { famiglia: "python", versione: m[1]! };
    },
    esegui: (m, file) => [m.percorso, "-I", file],
    avvisiAttesi: {},
  },
  {
    linguaggio: "c",
    nome: "C",
    chi: "il compilatore C",
    nessuno: "nessun compilatore C",
    variabile: "ALGODESIGN_CC",
    nelPath: () => ["gcc", "clang"],
    molti: true,
    famiglie: ["gcc", "clang"],
    riconosci: (riga) => {
      const famiglia = /\bclang version\b/.test(riga) ? "clang" : /\bgcc\b|\bGCC\b/.test(riga) ? "gcc" : undefined;
      return famiglia === undefined ? undefined : { famiglia, versione: riga.match(/\d+\.\d+(\.\d+)?/)?.[0] ?? "?" };
    },
    compila: (m, sorgente) => {
      const eseguibile = sorgente.replace(/\.c$/, `-${m.nome}${suWindows ? ".exe" : ""}`);
      return { comando: [m.percorso, "-std=c11", "-Wall", "-Wextra", "-o", eseguibile, sorgente, ...(suWindows ? [] : ["-lm"])], eseguibile };
    },
    esegui: (_m, file) => [file],
    // Le opzioni degli avvisi, una per avviso: «warning: … [-Wopzione]».
    avvisi: (testo) => ({ quanti: [...testo.matchAll(/\bwarning:/g)].length, opzioni: [...testo.matchAll(/\bwarning:.*\[(-W[\w=-]+)\]/g)].map((m) => m[1]!) }),
    // Il dato letto senza valore, e la funzione che richiama sé stessa per ogni via (si ferma solo al tetto della
    // ricorsione: l'avviso è vero, con gcc e con clang).
    avvisiAttesi: {
      "senza-valore-booleano": "-Wuninitialized",
      "senza-valore-carattere": "-Wuninitialized",
      "senza-valore-intero": "-Wuninitialized",
      "senza-valore-reale": "-Wuninitialized",
      "ricorsione-profonda": "-Winfinite-recursion",
      "ricorsione-allo-spazio": "-Winfinite-recursion",
      "spazio-al-byte": "-Winfinite-recursion",
      "ricorsione-senza-uscita": "-Winfinite-recursion",
    },
  },
];

// ------------------------------------------------------------------------------------ il contratto, nei due versi

/** Del registro basta l'identificatore e il genere: una prova può passarne uno con una voce in più o in meno. */
export type VoceDelRegistro = { readonly id: string; readonly genere: GenereDelLinguaggio };

const daEseguire = (registro: readonly VoceDelRegistro[]) => registro.filter((v) => v.genere === "da-eseguire");

/** L'esecutore di un linguaggio da eseguire, se c'è. */
export function esecutoreDel(id: string, tutti: readonly Esecutore[] = esecutori): Esecutore | undefined {
  return tutti.find((e) => e.linguaggio === id);
}

/** Le voci da eseguire del registro senza un esecutore, e gli esecutori senza una voce da eseguire. */
export function appaia(registro: readonly VoceDelRegistro[], tutti: readonly Esecutore[]): { vociSenzaEsecutore: string[]; esecutoriSenzaVoce: string[] } {
  return {
    vociSenzaEsecutore: daEseguire(registro).filter((v) => esecutoreDel(v.id, tutti) === undefined).map((v) => v.id),
    esecutoriSenzaVoce: tutti.filter((e) => !daEseguire(registro).some((v) => v.id === e.linguaggio)).map((e) => e.linguaggio),
  };
}

/** Gli esecutori che il differenziale deve far correre: l'interprete, e ogni famiglia di ogni linguaggio da eseguire in
 * ogni lingua del codice. */
export function esecutoriRichiesti(registro: readonly VoceDelRegistro[], tutti: readonly Esecutore[]): string[] {
  return [
    "interprete",
    ...daEseguire(registro).flatMap((v) => (esecutoreDel(v.id, tutti)?.famiglie ?? []).flatMap((f) => lingueDelCodice.map((l) => `${f} ${l}`))),
  ];
}

/** Quanti programmi avvisano compilati, sommati sugli esecutori dei linguaggi da eseguire. */
export function programmiConAvvisiAttesi(registro: readonly VoceDelRegistro[], tutti: readonly Esecutore[]): number {
  return daEseguire(registro).reduce((n, v) => n + Object.keys(esecutoreDel(v.id, tutti)?.avvisiAttesi ?? {}).length, 0);
}

/** Se un esecutore del differenziale (`gcc it`, `gcc-2 en`) è di una toolchain che compila. */
export function compila(eseguito: string, registro: readonly VoceDelRegistro[], tutti: readonly Esecutore[]): boolean {
  const famiglia = eseguito.replace(/(-\d+)? \S+$/, "");
  return daEseguire(registro).some((v) => {
    const e = esecutoreDel(v.id, tutti);
    return e?.compila !== undefined && e.famiglie.includes(famiglia);
  });
}

// ------------------------------------------------------------------------------------------------ la toolchain

const radice = join(import.meta.dir, "..");
const chiaveDelPath = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";

/** L'ambiente di un processo: la cartella dell'eseguibile in testa al PATH (il gcc di MSYS e i suoi programmi vogliono
 * la sua libreria). Su Windows la variabile si chiama «Path»: aggiungerne una «PATH» ne farebbe una seconda, che il
 * figlio non legge. */
export const ambienteDi = (eseguibile: string): Record<string, string | undefined> => ({
  ...process.env,
  [chiaveDelPath]: `${dirname(eseguibile)}${delimiter}${process.env[chiaveDelPath] ?? ""}`,
});

const fileDellImpostazione = join(radice, ".collaudo", "toolchain.json");
const assoluto = (p: string) => (isAbsolute(p) ? p : resolve(radice, p));

/** Gli eseguibili indicati per un esecutore, e da dove vengono. */
function indicati(e: Esecutore): { percorsi: string[]; da: string } {
  const v = process.env[e.variabile];
  if (v !== undefined && v.trim() !== "") return { percorsi: v.split(delimiter).filter((x) => x.trim() !== ""), da: `variabile ${e.variabile}` };
  if (existsSync(fileDellImpostazione)) {
    const valore = (JSON.parse(readFileSync(fileDellImpostazione, "utf8")) as Record<string, string | string[] | undefined>)[e.linguaggio];
    const daI = valore === undefined ? [] : Array.isArray(valore) ? valore : [valore];
    if (daI.length > 0) return { percorsi: daI.map(assoluto), da: "impostazione .collaudo/toolchain.json" };
  }
  return { percorsi: e.nelPath().map((n) => Bun.which(n)).filter((x): x is string => x !== null), da: "PATH" };
}

/** La prima riga di `--version`, o il motivo per cui non c'è. */
function versione(percorso: string): { riga: string } | { errore: string } {
  try {
    const r = Bun.spawnSync([percorso, "--version"], { env: ambienteDi(percorso), stdout: "pipe", stderr: "pipe", timeout: 30_000 });
    const testo = `${r.stdout.toString()}${r.stderr.toString()}`.trim();
    if (r.exitCode !== 0) return { errore: `uscita ${r.exitCode}: ${JSON.stringify(testo.slice(0, 200))}` };
    return { riga: testo.split(/\r?\n/)[0] ?? "" };
  } catch (e) {
    return { errore: (e as Error).message };
  }
}

/** Le macchine di un esecutore, da dove vengono e le famiglie che mancano; i problemi si aggiungono a `problemi`. */
export function trovaToolchain(e: Esecutore, problemi: string[]): { macchine: Macchina[]; da: string; mancanti: string[] } {
  const { percorsi, da } = indicati(e);
  const macchine: Macchina[] = [];
  for (const percorso of e.molti ? percorsi : percorsi.slice(0, 1)) {
    const v = versione(percorso);
    if ("errore" in v) {
      problemi.push(`toolchain: ${e.chi} ${percorso} (da ${da}) non risponde a --version: ${v.errore}`);
      continue;
    }
    const r = e.riconosci(v.riga);
    if (r === undefined) {
      problemi.push(`toolchain: ${percorso} (da ${da}) non è ${e.famiglie.length > 1 ? "né " : ""}${e.famiglie.join(" né ")}: ${JSON.stringify(v.riga)}`);
      continue;
    }
    const stessa = macchine.filter((m) => m.famiglia === r.famiglia).length;
    macchine.push({ nome: stessa === 0 ? r.famiglia : `${r.famiglia}-${stessa + 1}`, famiglia: r.famiglia, versione: r.versione, percorso });
  }
  if (macchine.length === 0) problemi.push(`toolchain: ${e.nessuno} (cercato in ${da})`);
  return { macchine, da, mancanti: e.famiglie.filter((f) => !macchine.some((m) => m.famiglia === f)) };
}
