// Il test differenziale: ogni caso d'uso delle tappe che il controllo statico non dice fuori tappa (oggi 1, 2, 3 e 4,
// anche i casi che si fermano ai tetti della ricorsione, uguali nei tre esecutori), quelli del programma e quelli di ogni
// procedura o funzione eseguita da sola (`file#funzione/
// caso`, come in `bun run casi`), eseguito dall'interprete, dal Python generato e dal C generato
// (con ogni compilatore trovato), nelle due lingue del codice, contro l'atteso DEL CASO e con la sola funzione che
// confronta un caso (`esitoDelCaso`, `core/casi/esito.ts`). Lo strumento costruisce l'ottenuto di ogni programma
// generato nella forma dell'atteso e lo passa a quella funzione: qui non c'è un altro confronto.
//
// Il caso di una funzione eseguita da
// sola corre col programma di prova di ogni generatore (legge i parametri, chiama, scrive il risultato), con l'input delle
// sue voci che hanno un testo (`parametriDelCaso`, `core/genera/forma.ts`); un caso che quel programma non può portare
// (una voce che l'esecuzione rifiuta) è un PROBLEMA.
//
//   bun run differenziale                      il corpus di `casi/` (le cartelle `tappa-<n>`)
//   bun run differenziale --corpus <cartella>  un'altra cartella con la forma del corpus
//   bun run differenziale <file.algo> …        solo i file dati (i controlli positivi del collaudo)
//
// Gli esecutori di ogni caso: `interprete` (l'esecuzione del nucleo nel modo caso, la stessa di `bun run casi`);
// `python it` e `python en`; `<compilatore> it` e `<compilatore> en` per ogni compilatore C, chiamato `gcc` o `clang`
// da ciò che stampa con `--version` (non dal nome del file: un `gcc.exe` può essere clang). Il C si compila con
// `-std=c11 -Wall -Wextra` (e `-lm` fuori da Windows), una volta per programma, lingua e compilatore.
//
// L'ottenuto di un programma generato:
// - lo stdout e lo stderr si leggono in byte: un `\r` e un BOM restano nel testo, un byte che non è UTF-8 lascia il
//   programma senza esito;
// - uscita 0 e stderr vuoto: l'output;
// - uscita 1 e stderr che è UNA riga «Errore alla riga N: motivo» (o «Error at line N: reason»): l'output e l'errore,
//   col codice dal motivo e il blocco dalla riga N (la provenienza delle righe del generatore: nessuno la ricalcola);
//   la forma della riga e la tabella dei motivi sono della voce del linguaggio nel registro (`core/genera/linguaggi.ts`);
// - l'output si tiene fino all'atteso più il margine dell'esito, come nell'esecuzione: oltre, è tagliato;
// - gli avvisi sono quelli del controllo statico da cui il generatore parte (il programma generato non ne ha di suoi);
//   un progetto con errori statici non si genera (il generatore lo rifiuta, e lo strumento lo controlla), e l'ottenuto
//   è il primo errore statico, come nell'esecuzione: per quel caso nessun programma corre, e il riepilogo lo conta.
// Ogni altra fine (un'altra uscita, uno stderr diverso, un motivo che la tabella non conosce, una riga senza blocco, un
// programma che non finisce in 10 secondi) è una riga `ROSSO <esecutore> <caso> senza esito: …`.
//
// L'input di un caso si dà come righe UTF-8 chiuse da `\n`, una per voce. Una voce che una riga non può portare (un
// a capo, un ritorno carrello: per il programma generato è una fine riga, per l'interprete un carattere; un surrogato
// isolato, che l'encoder scriverebbe come U+FFFD) fa del caso un PROBLEMA, e il caso non si esegue.
//
// Esclusi per nome (`esclusi`, con la ragione): i casi che il codice generato non controlla per scelta, perché il C
// non li definisce, e quelli del tetto dei passi dell'interprete (il programma generato non finisce, o non ha il tetto).
// Il nome è quello del file (tutti i suoi casi) o `file#caso` (un caso del programma, quando gli altri dello stesso file
// restano nel confronto). Sul corpus un nome escluso che non c'è fra i file o i casi delle tappe del confronto è un
// PROBLEMA.
//
// La toolchain, per i compilatori C e per Python separatamente, nell'ordine:
// 1. la variabile d'ambiente `ALGODESIGN_CC` (gli eseguibili dei compilatori, separati come nel PATH) o
//    `ALGODESIGN_PYTHON` (l'eseguibile di Python);
// 2. l'impostazione locale `.collaudo/toolchain.json` (non versionata): `{ "c": [ … ], "python": "…" }`, coi percorsi
//    assoluti o relativi alla cartella dell'app;
// 3. il PATH: `gcc` e `clang`; `python` (fuori da Windows prima `python3`).
// Un eseguibile indicato che non risponde a `--version` è un PROBLEMA, come nessun compilatore C o nessun Python. I
// processi partono con la cartella del loro eseguibile in testa al PATH (il gcc di MSYS e i suoi programmi vogliono la
// sua libreria).
//
// Righe: per ogni caso ed esecutore quelle di `righe-dei-casi.ts` precedute dall'esecutore (`VERDE gcc it
// tappa-1/x#x`), o `ROSSO … senza esito: …`; `ESCLUSO <caso>: <ragione>`; `ERRORE STATICO <caso>: <codice> <blocco>,
// nessun programma generato`; `FUORI TAPPA <file> (casi: <n>)`; `PROBLEMA …`;
// in fondo la riga `toolchain: …` e quella del riepilogo `differenziale: …`. Un caso con gli avvisi diversi è rosso:
// qui ogni differenza lo è. Esce con 1 se c'è un rosso o un problema.
//
// Gli avvisi dei compilatori: ogni programma della tappa (anche quelli dei casi esclusi) e ogni programma di prova si
// generano e si compilano nelle due lingue con ogni compilatore; un programma fra `avvisiDelCAttesi` deve avvisare con la sua opzione e solo con
// quella, ogni altro non deve avvisare. Un avviso non atteso, o uno atteso che manca, è un PROBLEMA; la riga
// `avvisi del C: …` li conta. Il testo degli avvisi va sullo standard error.
//
// Che cosa NON guarda: la console di Windows (stdin e stdout qui sono tubi); che i casi siano quelli giusti (lo dice la
// specifica); l'elenco del corpus (lo appaia `bun run casi`; un file che non si apre qui è un PROBLEMA); i casi delle
// tappe successive, se non per contarli; le voci di un caso destinate a un dato diverso da quello che legge, e quelle
// avanzate (un programma generato legge righe senza nome: oggi nessun caso del corpus le ha); gli avvisi di un
// programma che non è nel corpus (un dato mai usato avvisa: lo dice l'intestazione di `core/genera/c.ts`).

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { eseguiCaso } from "../core/casi/esecutore";
import { esitoDelCaso, margineDellOutput } from "../core/casi/esito";
import { controlla, tetti, type EsitoDelControllo } from "../core/controllo/controllo";
import { c } from "../core/genera/c";
import { parametriDelCaso, testoDelCodice, type Generato, type Riga } from "../core/genera/forma";
import { voceDel, type VoceDelLinguaggio } from "../core/genera/linguaggi";
import { codiceDelMotivo } from "../core/genera/motivi";
import type { LinguaDelCodice } from "../core/genera/nomi";
import { python } from "../core/genera/python";
import { apri } from "../core/progetto/formato";
import type { Atteso, CasoDiUnaFunzione, Funzione, Progetto } from "../core/progetto/modello";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import { righeDellEsito } from "./righe-dei-casi";

/** Il controllo statico di un progetto della tappa: ha gli errori e gli avvisi. */
type ControlloCheParte = Extract<EsitoDelControllo, { fuoriTappa: false }>;

/** I casi fuori dal differenziale, per nome del file (o `file#caso`), con la ragione. */
export const esclusi: Readonly<Record<string, string>> = {
  "intero-minimo-diviso-meno-uno": "overflow di un intero, che il C non definisce",
  "opposto-intero-minimo": "overflow di un intero, che il C non definisce",
  "overflow-fattoriale": "overflow di un intero, che il C non definisce",
  "divisione-per-zero": "divisione intera per zero, che il C non definisce",
  "indice-fuori": "indice fuori da un vettore, che il C non definisce",
  "reale-fuori-intervallo": "reale fuori intervallo convertito in intero, che il C non definisce",
  "reale-fuori-intervallo-parametro": "reale fuori intervallo convertito in intero, che il C non definisce",
  "reale-non-finito": "reale non finito, che l'interprete ferma per regola sua",
  "senza-valore-booleano": "dato letto senza valore, che il C non definisce",
  "senza-valore-carattere": "dato letto senza valore, che il C non definisce",
  "senza-valore-intero": "dato letto senza valore, che il C non definisce",
  "senza-valore-reale": "dato letto senza valore, che il C non definisce",
  "senza-valore-stringa": "dato letto senza valore, che il C non definisce",
  "troppi-passi": "tetto dei passi dell'interprete: il programma generato non finisce",
  "passi-fuori-dal-ciclo": "tetto dei passi dell'interprete in una ricorsione: il programma generato non lo ha",
  "sequenza-di-fibonacci#ventisei": "tetto dei passi dell'interprete in una ricorsione dentro un ciclo: il programma generato non lo ha",
  "riferimento-senza-valore-in-esecuzione": "dato senza valore passato per riferimento e letto, che il C non definisce",
  "uscita-letta-prima": "parametro per uscita letto senza valore, che il C non definisce",
  "uscita-con-valore-prima": "parametro per uscita letto prima di avere un valore: l'interprete lo fa partire senza valore e si ferma, il Python si ferma con UnboundLocalError, il C riceve il valore di chi chiama e lo scrive (divergenza voluta, con l'avviso del dato forse senza valore)",
  "uscita-non-assegnata": "parametro per uscita mai assegnato e letto dopo: l'interprete si ferma sul dato senza valore, il Python con UnboundLocalError, il C scrive il valore che il dato aveva prima (divergenza voluta, con l'avviso del dato forse senza valore)",
  "per-overflow-contatore": "overflow del contatore di un per, che il C non definisce",
};

/** I programmi della tappa che avvisano compilati con `-Wall -Wextra`, per nome del file, con l'opzione dell'avviso: il
 * dato letto senza valore, e la funzione che richiama sé stessa per ogni via (si ferma solo al tetto della ricorsione:
 * l'avviso è vero, con gcc e con clang). Ogni altro programma della tappa compila senza avvisi. */
export const avvisiDelCAttesi: Readonly<Record<string, string>> = {
  "senza-valore-booleano": "-Wuninitialized",
  "senza-valore-carattere": "-Wuninitialized",
  "senza-valore-intero": "-Wuninitialized",
  "senza-valore-reale": "-Wuninitialized",
  "ricorsione-profonda": "-Winfinite-recursion",
  "ricorsione-allo-spazio": "-Winfinite-recursion",
  "spazio-al-byte": "-Winfinite-recursion",
};

const radice = join(import.meta.dir, "..");
const lingue = ["it", "en"] as const;
const secondiDiUnProgramma = 10;

// ------------------------------------------------------------------------------------------------ la toolchain

const chiaveDelPath = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
/** L'ambiente di un processo: la cartella dell'eseguibile in testa al PATH. Su Windows la variabile si chiama «Path»:
 * aggiungerne una «PATH» ne farebbe una seconda, che il figlio non legge. */
const ambienteDi = (eseguibile: string): Record<string, string | undefined> => ({
  ...process.env,
  [chiaveDelPath]: `${dirname(eseguibile)}${delimiter}${process.env[chiaveDelPath] ?? ""}`,
});

type Impostazione = { c?: string[]; python?: string };
const fileDellImpostazione = join(radice, ".collaudo", "toolchain.json");
function impostazione(): Impostazione | undefined {
  if (!existsSync(fileDellImpostazione)) return undefined;
  return JSON.parse(readFileSync(fileDellImpostazione, "utf8")) as Impostazione;
}
const assoluto = (p: string) => (isAbsolute(p) ? p : resolve(radice, p));

/** Gli eseguibili indicati, e da dove vengono. */
function indicati(variabile: string, dallImpostazione: (i: Impostazione) => string[] | undefined, nomi: string[]): { percorsi: string[]; da: string } {
  const v = process.env[variabile];
  if (v !== undefined && v.trim() !== "") return { percorsi: v.split(delimiter).filter((x) => x.trim() !== ""), da: `variabile ${variabile}` };
  const i = impostazione();
  const daI = i === undefined ? undefined : dallImpostazione(i);
  if (daI !== undefined && daI.length > 0) return { percorsi: daI.map(assoluto), da: "impostazione .collaudo/toolchain.json" };
  return { percorsi: nomi.map((n) => Bun.which(n)).filter((x): x is string => x !== null), da: "PATH" };
}

type Compilatore = { nome: string; famiglia: "gcc" | "clang"; versione: string; percorso: string };
type Python = { versione: string; percorso: string };
const problemi: string[] = [];

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

function trovaCompilatori(): { compilatori: Compilatore[]; da: string } {
  const { percorsi, da } = indicati("ALGODESIGN_CC", (i) => i.c, ["gcc", "clang"]);
  const compilatori: Compilatore[] = [];
  for (const percorso of percorsi) {
    const v = versione(percorso);
    if ("errore" in v) {
      problemi.push(`toolchain: il compilatore C ${percorso} (da ${da}) non risponde a --version: ${v.errore}`);
      continue;
    }
    const famiglia = /\bclang version\b/.test(v.riga) ? "clang" : /\bgcc\b|\bGCC\b/.test(v.riga) ? "gcc" : undefined;
    if (famiglia === undefined) {
      problemi.push(`toolchain: ${percorso} (da ${da}) non è né gcc né clang: ${JSON.stringify(v.riga)}`);
      continue;
    }
    const stessa = compilatori.filter((x) => x.famiglia === famiglia).length;
    compilatori.push({ nome: stessa === 0 ? famiglia : `${famiglia}-${stessa + 1}`, famiglia, versione: v.riga.match(/\d+\.\d+(\.\d+)?/)?.[0] ?? "?", percorso });
  }
  if (compilatori.length === 0) problemi.push(`toolchain: nessun compilatore C (cercato in ${da})`);
  return { compilatori, da };
}

function trovaPython(): { python: Python | undefined; da: string } {
  const { percorsi, da } = indicati("ALGODESIGN_PYTHON", (i) => (i.python === undefined ? undefined : [i.python]), process.platform === "win32" ? ["python"] : ["python3", "python"]);
  const percorso = percorsi[0];
  if (percorso === undefined) {
    problemi.push(`toolchain: nessun Python (cercato in ${da})`);
    return { python: undefined, da };
  }
  const v = versione(percorso);
  if ("errore" in v || !/^Python \d/.test(v.riga)) {
    problemi.push(`toolchain: il Python ${percorso} (da ${da}) non risponde a --version: ${"errore" in v ? v.errore : JSON.stringify(v.riga)}`);
    return { python: undefined, da };
  }
  return { python: { versione: v.riga.slice("Python ".length), percorso }, da };
}

// ------------------------------------------------------------------------------------------------ i processi

type Fine = { uscita: number | null; out: Uint8Array; err: Uint8Array; scaduto: boolean };

/** `cmd` con la cartella di `nelPath` in testa al PATH: un programma compilato vuole quella del suo compilatore. */
async function lancia(cmd: string[], stdin: Uint8Array, secondi: number, nelPath = cmd[0]!): Promise<Fine> {
  const proc = Bun.spawn({ cmd, env: ambienteDi(nelPath), stdin, stdout: "pipe", stderr: "pipe" });
  let scaduto = false;
  const orologio = setTimeout(() => {
    scaduto = true;
    proc.kill();
  }, secondi * 1000);
  const [out, err, uscita] = await Promise.all([new Response(proc.stdout).arrayBuffer(), new Response(proc.stderr).arrayBuffer(), proc.exited]);
  clearTimeout(orologio);
  return { uscita, out: new Uint8Array(out), err: new Uint8Array(err), scaduto };
}

/** I lavori, al più `quanti` alla volta, coi risultati nell'ordine dei lavori. */
async function inParallelo<T>(lavori: (() => Promise<T>)[], quanti: number): Promise<T[]> {
  const risultati: T[] = new Array(lavori.length);
  let prossimo = 0;
  const operaio = async () => {
    while (prossimo < lavori.length) {
      const k = prossimo++;
      risultati[k] = await lavori[k]!();
    }
  };
  const operai = [...Array(Math.min(quanti, lavori.length)).keys()];
  await Promise.all(operai.map(operaio));
  return risultati;
}

// ------------------------------------------------------------------------------------------------ l'ottenuto

// Lo stdout e lo stderr di un programma: un BOM in testa resta un carattere, e un byte che non è UTF-8 non diventa
// U+FFFD (che un caso potrebbe attendere) ma lascia il programma senza esito.
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
/** I messaggi dei compilatori, solo da leggere. */
const testoDelCompilatore = new TextDecoder("utf-8", { fatal: false });

/** L'ottenuto di un programma generato nella forma dell'atteso, o il motivo per cui non ha un esito. Con `tagliato`:
 * l'output è stato tenuto solo fino all'atteso più il margine. */
function ottenuto(f: Fine, voce: VoceDelLinguaggio, righe: readonly Riga[], lingua: LinguaDelCodice, atteso: Atteso, controllo: ControlloCheParte): { atteso: Atteso; tagliato: boolean } | { senzaEsito: string } {
  if (voce.genere !== "da-eseguire") throw new Error(`${voce.id} non è un linguaggio da eseguire`);
  if (f.scaduto) return { senzaEsito: `non finito in ${secondiDiUnProgramma} s` };
  let tutto: string;
  let err: string;
  try {
    tutto = utf8.decode(f.out);
    err = utf8.decode(f.err);
  } catch {
    return { senzaEsito: `lo stdout o lo stderr non è testo UTF-8: ${JSON.stringify(testoDelCompilatore.decode(f.out).slice(0, 200))}` };
  }
  const tetto = atteso.output.length + margineDellOutput;
  const tagliato = tutto.length > tetto;
  // Il taglio non spezza un carattere fuori dal piano di base, come l'esecuzione.
  const fine = tagliato && /[\ud800-\udbff]/.test(tutto[tetto - 1] ?? "") ? tetto - 1 : tetto;
  const output = tagliato ? tutto.slice(0, fine) : tutto;
  const avvisi = { warnings: controllo.avvisi };
  if (f.uscita === 0 && err === "") return { atteso: { output, ...avvisi }, tagliato };
  const m = voce.rigaDErrore.exec(err);
  if (m === null || f.uscita !== 1) return { senzaEsito: `uscita ${f.uscita}, stderr ${JSON.stringify(err.slice(-300))}` };
  const code = codiceDelMotivo(lingua, m[2]!, voce.motivi);
  if (code === undefined) return { senzaEsito: `motivo che la tabella dei motivi non conosce: ${JSON.stringify(m[2])}` };
  const block = righe[Number(m[1]) - 1]?.blocco;
  if (block === undefined) return { senzaEsito: `la riga ${m[1]} non viene da un blocco: ${JSON.stringify(righe[Number(m[1]) - 1]?.testo ?? "(oltre la fine)")}` };
  return { atteso: { output, error: { code, block }, ...avvisi }, tagliato };
}

/** Perché una voce non sta in una riga, o niente. */
function vocePerUnaRiga(testo: string): string | undefined {
  if (testo.includes("\n")) return "ha un a capo";
  if (testo.includes("\r")) return "ha un ritorno carrello";
  if (/[\ud800-\udfff]/.test(testo.replace(/[\ud800-\udbff][\udc00-\udfff]/g, ""))) return "ha un surrogato isolato";
  return undefined;
}

// ------------------------------------------------------------------------------------------------ il giro

const inizio = performance.now();
const argomenti = process.argv.slice(2);
const conCartella = argomenti[0] === "--corpus";
const corpus = argomenti.length === 0 || conCartella;
const cartella = conCartella ? argomenti[1]! : join(radice, "casi");

const file: { nome: string; percorso: string }[] = [];
if (corpus) {
  for (const tappa of readdirSync(cartella, { withFileTypes: true }).filter((v) => v.isDirectory()).map((v) => v.name).sort())
    for (const f of readdirSync(join(cartella, tappa)).filter((f) => f.endsWith(".algo")).sort())
      file.push({ nome: `${tappa}/${f.slice(0, -".algo".length)}`, percorso: join(cartella, tappa, f) });
} else file.push(...argomenti.map((a) => ({ nome: a, percorso: a })));

const { compilatori, da: daC } = trovaCompilatori();
const { python: py, da: daPython } = trovaPython();
const esecutori = [
  "interprete",
  ...(py === undefined ? [] : lingue.map((l) => `python ${l}`)),
  ...compilatori.flatMap((k) => lingue.map((l) => `${k.nome} ${l}`)),
];

/** Un caso da confrontare: il progetto, il caso (del programma, o di una procedura o funzione eseguita da sola, con
 * la sua `funzione`), le righe del suo input e il controllo statico del progetto. */
type DaConfrontare = { id: string; file: number; progetto: Progetto; caso: CasoDiUnaFunzione; funzione?: Funzione; input: string[]; controllo: ControlloCheParte };
const daConfrontare: DaConfrontare[] = [];
const righeDiPrima: string[] = [];
let fuoriTappa = 0;
let fileFuoriTappa = 0;
let quantiEsclusi = 0;
let conErroreStatico = 0;
let diFunzioni = 0;
const nomiTrovati = new Set<string>();
/** I file della tappa, per indice: si generano tutti (quelli con un errore statico il generatore li rifiuta). */
const daGenerare = new Map<number, { progetto: Progetto; base: string; statico: boolean }>();

file.forEach(({ nome, percorso }, k) => {
  let testo: string;
  try {
    testo = readFileSync(percorso, "utf8");
  } catch (e) {
    problemi.push(`${nome}: file illeggibile: ${(e as Error).message}`);
    return;
  }
  const aperto = apri(testo);
  if (!aperto.ok) {
    problemi.push(`${nome}: file non valido`);
    return;
  }
  const p = aperto.progetto;
  // I casi del programma, poi quelli di ogni procedura o funzione eseguita da sola, col loro nome.
  const casi: { id: string; caso: CasoDiUnaFunzione; funzione?: Funzione }[] = [
    ...(p.test_cases ?? []).map((caso) => ({ id: `${nome}#${caso.name}`, caso })),
    ...p.functions.flatMap((f) => (f.test_cases ?? []).map((caso) => ({ id: `${nome}#${f.name}/${caso.name}`, caso, funzione: f }))),
  ];
  const controllo = controlla(p, tetti);
  if (controllo.fuoriTappa) {
    fuoriTappa += casi.length;
    fileFuoriTappa++;
    righeDiPrima.push(`FUORI TAPPA ${nome} (casi: ${casi.length})`);
    return;
  }
  const base = basename(nome).replace(/\.algo$/, "");
  nomiTrovati.add(base);
  // Ogni programma della tappa si genera e si compila, anche quelli dei casi esclusi: gli avvisi si contano su tutti.
  daGenerare.set(k, { progetto: p, base, statico: controllo.errori.length > 0 });
  if (casi.length === 0) problemi.push(`${nome}: nessun caso d'uso`);
  for (const { id, caso, funzione } of casi) {
    // Escluso il file intero, o il solo caso (`file#caso`, un caso del programma).
    const delCaso = `${base}#${caso.name}`;
    nomiTrovati.add(delCaso);
    const escluso = Object.hasOwn(esclusi, base) ? base : funzione === undefined && Object.hasOwn(esclusi, delCaso) ? delCaso : undefined;
    if (escluso !== undefined) {
      quantiEsclusi++;
      righeDiPrima.push(`ESCLUSO ${id}: ${esclusi[escluso]}`);
      continue;
    }
    let input: string[];
    if (funzione === undefined) input = caso.inputs.map((v) => v.text!);
    else {
      const letti = parametriDelCaso(funzione, caso);
      if ("problema" in letti) {
        problemi.push(`${id}: ${letti.problema}, e il programma di prova non la porta`);
        continue;
      }
      input = letti.righe;
    }
    const senzaRiga = input.map((t, i) => [i, vocePerUnaRiga(t)] as const).filter(([, m]) => m !== undefined);
    if (senzaRiga.length > 0) {
      problemi.push(`${id}: ${senzaRiga.map(([i, m]) => `la voce ${i + 1} ${m}`).join("; ")}, e una riga non la porta`);
      continue;
    }
    if (controllo.errori.length > 0) {
      conErroreStatico++;
      righeDiPrima.push(`ERRORE STATICO ${id}: ${controllo.errori[0]!.code} ${controllo.errori[0]!.block}, nessun programma generato`);
    }
    if (funzione !== undefined) diFunzioni++;
    daConfrontare.push({ id, file: k, progetto: p, caso, ...(funzione !== undefined ? { funzione } : {}), input, controllo });
  }
});
if (corpus) for (const n of Object.keys(esclusi).filter((n) => !nomiTrovati.has(n))) problemi.push(`${n} è fra gli esclusi ma non fra i file delle tappe del confronto`);

// Il codice generato di ogni file della tappa, scritto in una cartella temporanea.
const tmp = mkdtempSync(join(tmpdir(), "differenziale-"));
type Codice = { righe: readonly Riga[]; sorgente: string; file: number } | { statico: true };
const generati = new Map<string, Codice>();
const chiave = (k: number, linguaggio: string, l: LinguaDelCodice) => `${k} ${linguaggio} ${l}`;
for (const [k, { progetto: p, statico }] of daGenerare) {
  for (const l of lingue)
    for (const [linguaggio, genera, estensione] of [["python", python, "py"], ["c", c, "c"]] as const) {
      const g: Generato = genera(p, tetti, l, paroleDelloPseudocodice(l));
      if (!g.generato) {
        if (g.perche !== "errori-statici" || !statico) throw new Error(`${file[k]!.nome}: il generatore ${linguaggio} lo dice ${g.perche} e il controllo no`);
        generati.set(chiave(k, linguaggio, l), { statico: true });
        continue;
      }
      if (statico) throw new Error(`${file[k]!.nome}: il controllo vi trova errori statici e il generatore lo traduce`);
      const sorgente = join(tmp, `${k}-${l}.${estensione}`);
      writeFileSync(sorgente, testoDelCodice(g.righe));
      generati.set(chiave(k, linguaggio, l), { righe: g.righe, sorgente, file: k });
    }
}
// I programmi di prova dei casi delle funzioni, uno per caso, linguaggio e lingua: si compilano anche loro.
const prove = new Map<string, Codice>();
daConfrontare.forEach((d, n) => {
  if (d.funzione === undefined || d.controllo.errori.length > 0) return;
  for (const l of lingue)
    for (const [linguaggio, genera, estensione] of [["python", python, "py"], ["c", c, "c"]] as const) {
      const g = genera(d.progetto, tetti, l, paroleDelloPseudocodice(l), { funzione: d.funzione.id, caso: d.caso });
      if (!g.generato) throw new Error(`${d.id}: il programma di prova non si genera (${g.perche})`);
      const sorgente = join(tmp, `${d.file}-prova-${n}-${l}.${estensione}`);
      writeFileSync(sorgente, testoDelCodice(g.righe));
      prove.set(`${d.id} ${linguaggio} ${l}`, { righe: g.righe, sorgente, file: d.file });
    }
});

// Le compilazioni, una per programma, lingua e compilatore. Gli avvisi di ognuna si contano: un programma fra gli
// attesi (`avvisiDelCAttesi`) avvisa con la sua opzione e solo con quella, ogni altro non avvisa.
const quanti = Math.max(2, availableParallelism());
const eseguibili = new Map<string, string>();
const compilazioni: (() => Promise<void>)[] = [];
let compilazioniConAvvisiAttesi = 0;
let avvisiNonAttesi = 0;
let avvisiMancanti = 0;
for (const [chiaveDelCodice, codice] of [...generati, ...prove]) {
  if (!chiaveDelCodice.includes(" c ") || !("righe" in codice)) continue;
  const { base } = daGenerare.get(codice.file)!;
  const lingua = chiaveDelCodice.slice(-2);
  const attesa = Object.hasOwn(avvisiDelCAttesi, base) ? avvisiDelCAttesi[base] : undefined;
  for (const k of compilatori)
    compilazioni.push(async () => {
      const exe = codice.sorgente.replace(/\.c$/, `-${k.nome}${process.platform === "win32" ? ".exe" : ""}`);
      const f = await lancia([k.percorso, "-std=c11", "-Wall", "-Wextra", "-o", exe, codice.sorgente, ...(process.platform === "win32" ? [] : ["-lm"])], new Uint8Array(), 120);
      const testo = testoDelCompilatore.decode(f.err);
      if (f.uscita !== 0) problemi.push(`${k.nome}: non compila ${codice.sorgente}: ${f.scaduto ? "tempo scaduto" : JSON.stringify(testo.slice(0, 500))}`);
      else eseguibili.set(`${chiaveDelCodice} ${k.nome}`, exe);
      if (testo.trim() !== "") console.error(`[compilazione ${k.nome} ${basename(codice.sorgente)}]\n${testo}`);
      // Le opzioni degli avvisi, una per avviso: «warning: … [-Wopzione]».
      const opzioni = [...testo.matchAll(/\bwarning:.*\[(-W[\w=-]+)\]/g)].map((m) => m[1]!);
      const avvisi = [...testo.matchAll(/\bwarning:/g)].length;
      const chi = `${daGenerare.get(codice.file)!.base}: ${k.nome} ${lingua}`;
      if (attesa !== undefined && avvisi > 0 && opzioni.length === avvisi && opzioni.every((o) => o === attesa)) compilazioniConAvvisiAttesi++;
      else if (attesa !== undefined) {
        avvisiMancanti++;
        problemi.push(`${chi} non avvisa come atteso: atteso ${attesa}, avvisi ${avvisi} ${JSON.stringify(opzioni)}`);
      } else if (avvisi > 0) {
        avvisiNonAttesi++;
        problemi.push(`${chi} avvisa senza che l'avviso sia atteso: ${[...new Set(opzioni)].join(", ") || "un avviso senza opzione"}`);
      }
    });
}
const inizioCompilazioni = performance.now();
await inParallelo(compilazioni, quanti);
const secondiDelleCompilazioni = (performance.now() - inizioCompilazioni) / 1000;

// Le esecuzioni: ogni caso con ogni esecutore che lo può correre.
type Risultato = { genere: "verde" | "avvisi diversi" | "rosso"; righe: string[] };
const risultati = new Map<string, Risultato>();
const confronta = (atteso: Atteso, o: Atteso, tagliato: boolean, chi: string): Risultato => {
  const esito = esitoDelCaso(atteso, o, tagliato);
  if (esito.fuoriTappa) throw new Error("l'esito di un confronto non è mai fuori tappa");
  return righeDellEsito(chi, esito);
};
const esecuzioni: (() => Promise<void>)[] = [];
for (const d of daConfrontare) {
  const input = new TextEncoder().encode(d.input.map((t) => `${t}\n`).join(""));
  for (const esecutore of esecutori) {
    const chi = `${esecutore} ${d.id}`;
    if (esecutore === "interprete") {
      const esito = eseguiCaso(d.progetto, d.caso, tetti, d.funzione?.id);
      risultati.set(chi, esito.fuoriTappa ? { genere: "rosso", righe: [`ROSSO ${chi} fuori tappa per l'esecuzione`] } : righeDellEsito(chi, esito));
      continue;
    }
    const [linguaggio, l] = esecutore.startsWith("python ") ? (["python", esecutore.slice(-2)] as const) : (["c", esecutore.slice(-2)] as const);
    const delFile = generati.get(chiave(d.file, linguaggio, l as LinguaDelCodice))!;
    if ("statico" in delFile) {
      risultati.set(chi, confronta(d.caso.expected, { output: "", static_error: d.controllo.errori[0]!, warnings: d.controllo.avvisi }, false, chi));
      continue;
    }
    const chiaveDelCodice = d.funzione === undefined ? chiave(d.file, linguaggio, l as LinguaDelCodice) : `${d.id} ${linguaggio} ${l}`;
    const codice = (d.funzione === undefined ? delFile : prove.get(chiaveDelCodice)!) as Extract<Codice, { righe: readonly Riga[] }>;
    const compilatore = compilatori.find((k) => k.nome === esecutore.slice(0, -3));
    const cmd = linguaggio === "python" ? [py!.percorso, "-I", codice.sorgente] : [eseguibili.get(`${chiaveDelCodice} ${compilatore!.nome}`)];
    if (cmd[0] === undefined) {
      risultati.set(chi, { genere: "rosso", righe: [`ROSSO ${chi} senza esito: il programma non è stato compilato`] });
      continue;
    }
    esecuzioni.push(async () => {
      const f = await lancia(cmd as string[], input, secondiDiUnProgramma, linguaggio === "python" ? py!.percorso : compilatore!.percorso);
      const o = ottenuto(f, voceDel(linguaggio), codice.righe, l as LinguaDelCodice, d.caso.expected, d.controllo);
      risultati.set(chi, "senzaEsito" in o ? { genere: "rosso", righe: [`ROSSO ${chi} senza esito: ${o.senzaEsito}`] } : confronta(d.caso.expected, o.atteso, o.tagliato, chi));
    });
  }
}
const inizioEsecuzioni = performance.now();
await inParallelo(esecuzioni, quanti);
const secondiDelleEsecuzioni = (performance.now() - inizioEsecuzioni) / 1000;
rmSync(tmp, { recursive: true, force: true });

// Le righe, nell'ordine dei casi e degli esecutori; per esecutore i verdi sui casi che ha corso.
for (const r of righeDiPrima) console.log(r);
const verdiPer = new Map(esecutori.map((e) => [e, 0]));
const corsiPer = new Map(esecutori.map((e) => [e, 0]));
let rossi = 0;
for (const d of daConfrontare)
  for (const esecutore of esecutori) {
    const r = risultati.get(`${esecutore} ${d.id}`);
    if (r === undefined) continue;
    corsiPer.set(esecutore, corsiPer.get(esecutore)! + 1);
    r.righe.forEach((x) => console.log(x));
    if (r.genere === "verde") verdiPer.set(esecutore, verdiPer.get(esecutore)! + 1);
    else rossi++;
  }
const n = daConfrontare.length;
if (n === 0) problemi.push("nessun caso nel confronto");
for (const p of problemi) console.log(`PROBLEMA ${p}`);
console.log(
  `toolchain: C da ${daC}: ${compilatori.map((k) => `${k.nome} ${k.versione} (${k.percorso})`).join(", ") || "nessuno"}; Python da ${daPython}: ${py === undefined ? "nessuno" : `${py.versione} (${py.percorso})`}`,
);
console.log(
  `avvisi del C: compilazioni ${compilazioni.length}, con gli avvisi attesi ${compilazioniConAvvisiAttesi} (${Object.entries(avvisiDelCAttesi).map(([f, o]) => `${f} ${o}`).join(", ")}), non attesi ${avvisiNonAttesi}, attesi e mancanti ${avvisiMancanti}`,
);
console.log(
  `differenziale: file ${file.length}, casi nel confronto ${n} (di funzioni ${diFunzioni}, con l'errore statico ${conErroreStatico}), esclusi ${quantiEsclusi}, fuori tappa ${fuoriTappa} in ${fileFuoriTappa} file; per esecutore: ${esecutori.map((e) => `${e} ${verdiPer.get(e)}/${corsiPer.get(e)}`).join(", ")}; rossi ${rossi}, problemi ${problemi.length}; compilazioni ${compilazioni.length} in ${secondiDelleCompilazioni.toFixed(1)} s, esecuzioni ${esecuzioni.length} in ${secondiDelleEsecuzioni.toFixed(1)} s, in tutto ${((performance.now() - inizio) / 1000).toFixed(1)} s`,
);
process.exit(rossi > 0 || problemi.length > 0 ? 1 : 0);
