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
// I linguaggi da eseguire sono quelli del registro (`core/genera/linguaggi.ts`), ognuno col suo esecutore
// (`strumenti/esecutori.ts`: toolchain, compilazione, esecuzione, avvisi attesi); una voce da eseguire senza esecutore,
// o un esecutore senza voce, è un PROBLEMA. Gli esecutori di ogni caso: `interprete` (l'esecuzione del nucleo nel modo
// caso, la stessa di `bun run casi`), poi per ogni linguaggio da eseguire, nell'ordine del registro, ogni macchina della
// sua toolchain in ogni lingua del codice (`python it`, `python en`, `gcc it`, `gcc en`, `clang it`, `clang en`). Un
// linguaggio che si compila si compila una volta per programma, lingua e macchina.
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
// La toolchain di ogni esecutore (variabile d'ambiente, impostazione locale, PATH) è descritta in `esecutori.ts`. Un
// eseguibile indicato che non risponde a `--version` è un PROBLEMA, come una toolchain senza nessun eseguibile; una
// famiglia che manca (il C senza clang) la dice la riga della toolchain, e il caso corre con le macchine che ci sono
// (il collaudo le richiede tutte). I processi partono con la cartella del loro eseguibile in testa al PATH.
//
// Righe: per ogni caso ed esecutore quelle di `righe-dei-casi.ts` precedute dall'esecutore (`VERDE gcc it
// tappa-1/x#x`), o `ROSSO … senza esito: …`; `ESCLUSO <caso>: <ragione>`; `ERRORE STATICO <caso>: <codice> <blocco>,
// nessun programma generato`; `FUORI TAPPA <file> (casi: <n>)`; `PROBLEMA …`;
// in fondo la riga `toolchain: …` e quella del riepilogo `differenziale: …`. Un caso con gli avvisi diversi è rosso:
// qui ogni differenza lo è. Esce con 1 se c'è un rosso o un problema.
//
// Gli avvisi della compilazione: ogni programma della tappa (anche quelli dei casi esclusi) e ogni programma di prova si
// generano e si compilano nelle due lingue con ogni macchina; un programma fra gli avvisi attesi del suo esecutore deve
// avvisare con la sua opzione e solo con quella, ogni altro non deve avvisare. Un avviso non atteso, o uno atteso che
// manca, è un PROBLEMA; la riga `avvisi della compilazione: …` li conta. Il testo degli avvisi va sullo standard error.
//
// Che cosa NON guarda: la console di Windows (stdin e stdout qui sono tubi); che i casi siano quelli giusti (lo dice la
// specifica); l'elenco del corpus (lo appaia `bun run casi`; un file che non si apre qui è un PROBLEMA); i casi delle
// tappe successive, se non per contarli; le voci di un caso destinate a un dato diverso da quello che legge, e quelle
// avanzate (un programma generato legge righe senza nome: oggi nessun caso del corpus le ha); gli avvisi di un
// programma che non è nel corpus (un dato mai usato avvisa: lo dice l'intestazione di `core/genera/c.ts`).

import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { basename, join } from "node:path";
import { eseguiCaso } from "../core/casi/esecutore";
import { esitoDelCaso, margineDellOutput } from "../core/casi/esito";
import { controlla, tetti, type EsitoDelControllo } from "../core/controllo/controllo";
import { tettoDelleChiamate } from "../core/controllo/spazio";
import { parametriDelCaso, testoDelCodice, type Generato, type Riga } from "../core/genera/forma";
import { linguaggi, type Linguaggio, type VoceDelLinguaggio } from "../core/genera/linguaggi";
import { codiceDelMotivo } from "../core/genera/motivi";
import type { LinguaDelCodice } from "../core/genera/nomi";
import { apri } from "../core/progetto/formato";
import type { Atteso, CasoDiUnaFunzione, Funzione, Progetto } from "../core/progetto/modello";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import { ambienteDi, appaia, esecutoreDel, esecutori as tuttiGliEsecutori, lingueDelCodice as lingue, trovaToolchain, type Esecutore, type Macchina } from "./esecutori";
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

const radice = join(import.meta.dir, "..");
const secondiDiUnProgramma = 10;
const problemi: string[] = [];

// ------------------------------------------------------------------------------------------------ il contratto

/** Le voci da eseguire del registro, ognuna col suo esecutore (quelle senza restano fuori, con un PROBLEMA). */
type DaEseguire = { voce: VoceDelLinguaggio & { readonly id: Linguaggio }; esecutore: Esecutore };
const { vociSenzaEsecutore, esecutoriSenzaVoce } = appaia(linguaggi, tuttiGliEsecutori);
for (const id of vociSenzaEsecutore) problemi.push(`contratto: il linguaggio da eseguire ${id} non ha un esecutore`);
for (const id of esecutoriSenzaVoce) problemi.push(`contratto: l'esecutore ${id} non ha un linguaggio da eseguire nel registro`);
const daEseguire: DaEseguire[] = linguaggi.flatMap((voce) => {
  const esecutore = voce.genere === "da-eseguire" ? esecutoreDel(voce.id) : undefined;
  return esecutore === undefined ? [] : [{ voce, esecutore }];
});

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
 * l'output è stato tenuto solo fino all'atteso più il margine. `pila` è il tetto delle chiamate del progetto, che il motivo
 * del tetto dice. */
function ottenuto(f: Fine, voce: VoceDelLinguaggio, righe: readonly Riga[], lingua: LinguaDelCodice, atteso: Atteso, controllo: ControlloCheParte, pila: number): { atteso: Atteso; tagliato: boolean } | { senzaEsito: string } {
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
  const code = codiceDelMotivo(lingua, m[2]!, voce.motivi(pila));
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

// La toolchain di ogni linguaggio da eseguire, e gli esecutori: l'interprete, poi ogni macchina in ogni lingua.
const toolchain = daEseguire.map((d) => ({ ...d, ...trovaToolchain(d.esecutore, problemi) }));
/** Un esecutore di un programma generato: una macchina della toolchain di un linguaggio, in una lingua del codice. */
type DiUnGenerato = { nome: string; voce: DaEseguire["voce"]; esecutore: Esecutore; macchina: Macchina; lingua: LinguaDelCodice };
const generatiDa: DiUnGenerato[] = toolchain.flatMap(({ voce, esecutore, macchine }) =>
  macchine.flatMap((macchina) => lingue.map((lingua) => ({ nome: `${macchina.nome} ${lingua}`, voce, esecutore, macchina, lingua }))),
);
const esecutori = ["interprete", ...generatiDa.map((g) => g.nome)];

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
type Codice = { righe: readonly Riga[]; sorgente: string; file: number; linguaggio: Linguaggio; lingua: LinguaDelCodice } | { statico: true };
const generati = new Map<string, Codice>();
const chiave = (k: number, linguaggio: string, l: LinguaDelCodice) => `${k} ${linguaggio} ${l}`;
for (const [k, { progetto: p, statico }] of daGenerare) {
  for (const l of lingue)
    for (const { voce } of daEseguire) {
      const g: Generato = voce.genera(p, tetti, l, paroleDelloPseudocodice(l));
      if (!g.generato) {
        if (g.perche !== "errori-statici" || !statico) throw new Error(`${file[k]!.nome}: il generatore ${voce.id} lo dice ${g.perche} e il controllo no`);
        generati.set(chiave(k, voce.id, l), { statico: true });
        continue;
      }
      if (statico) throw new Error(`${file[k]!.nome}: il controllo vi trova errori statici e il generatore lo traduce`);
      const sorgente = join(tmp, `${k}-${l}${voce.estensione}`);
      writeFileSync(sorgente, testoDelCodice(g.righe));
      generati.set(chiave(k, voce.id, l), { righe: g.righe, sorgente, file: k, linguaggio: voce.id, lingua: l });
    }
}
// I programmi di prova dei casi delle funzioni, uno per caso, linguaggio e lingua: si compilano anche loro.
const prove = new Map<string, Codice>();
daConfrontare.forEach((d, n) => {
  if (d.funzione === undefined || d.controllo.errori.length > 0) return;
  for (const l of lingue)
    for (const { voce } of daEseguire) {
      const g = voce.genera(d.progetto, tetti, l, paroleDelloPseudocodice(l), { funzione: d.funzione.id, caso: d.caso });
      if (!g.generato) throw new Error(`${d.id}: il programma di prova non si genera (${g.perche})`);
      const sorgente = join(tmp, `${d.file}-prova-${n}-${l}${voce.estensione}`);
      writeFileSync(sorgente, testoDelCodice(g.righe));
      prove.set(`${d.id} ${voce.id} ${l}`, { righe: g.righe, sorgente, file: d.file, linguaggio: voce.id, lingua: l });
    }
});

// Le compilazioni, una per programma, lingua e macchina di un linguaggio che si compila. Gli avvisi di ognuna si
// contano: un programma fra gli avvisi attesi del suo esecutore avvisa con la sua opzione e solo con quella, ogni altro
// non avvisa.
const quanti = Math.max(2, availableParallelism());
const eseguibili = new Map<string, string>();
const compilazioni: (() => Promise<void>)[] = [];
let compilazioniConAvvisiAttesi = 0;
let avvisiNonAttesi = 0;
let avvisiMancanti = 0;
for (const [chiaveDelCodice, codice] of [...generati, ...prove]) {
  if (!("righe" in codice)) continue;
  const { esecutore, macchine } = toolchain.find((t) => t.voce.id === codice.linguaggio)!;
  const { compila, avvisi: avvisiDelTesto } = esecutore;
  if (compila === undefined) continue;
  const { base } = daGenerare.get(codice.file)!;
  const attesa = Object.hasOwn(esecutore.avvisiAttesi, base) ? esecutore.avvisiAttesi[base] : undefined;
  for (const k of macchine)
    compilazioni.push(async () => {
      const { comando, eseguibile } = compila(k, codice.sorgente);
      const f = await lancia(comando, new Uint8Array(), 120);
      const testo = testoDelCompilatore.decode(f.err);
      if (f.uscita !== 0) problemi.push(`${k.nome}: non compila ${codice.sorgente}: ${f.scaduto ? "tempo scaduto" : JSON.stringify(testo.slice(0, 500))}`);
      else eseguibili.set(`${chiaveDelCodice} ${k.nome}`, eseguibile);
      if (testo.trim() !== "") console.error(`[compilazione ${k.nome} ${basename(codice.sorgente)}]\n${testo}`);
      const { quanti: avvisi, opzioni } = avvisiDelTesto?.(testo) ?? { quanti: 0, opzioni: [] };
      const chi = `${base}: ${k.nome} ${codice.lingua}`;
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
  {
    const chi = `interprete ${d.id}`;
    const esito = eseguiCaso(d.progetto, d.caso, tetti, d.funzione?.id);
    risultati.set(chi, esito.fuoriTappa ? { genere: "rosso", righe: [`ROSSO ${chi} fuori tappa per l'esecuzione`] } : righeDellEsito(chi, esito));
  }
  for (const { nome, voce, esecutore, macchina, lingua: l } of generatiDa) {
    const chi = `${nome} ${d.id}`;
    const delFile = generati.get(chiave(d.file, voce.id, l))!;
    if ("statico" in delFile) {
      risultati.set(chi, confronta(d.caso.expected, { output: "", static_error: d.controllo.errori[0]!, warnings: d.controllo.avvisi }, false, chi));
      continue;
    }
    const chiaveDelCodice = d.funzione === undefined ? chiave(d.file, voce.id, l) : `${d.id} ${voce.id} ${l}`;
    const codice = (d.funzione === undefined ? delFile : prove.get(chiaveDelCodice)!) as Extract<Codice, { righe: readonly Riga[] }>;
    const daLanciare = esecutore.compila === undefined ? codice.sorgente : eseguibili.get(`${chiaveDelCodice} ${macchina.nome}`);
    if (daLanciare === undefined) {
      risultati.set(chi, { genere: "rosso", righe: [`ROSSO ${chi} senza esito: il programma non è stato compilato`] });
      continue;
    }
    esecuzioni.push(async () => {
      const f = await lancia(esecutore.esegui(macchina, daLanciare), input, secondiDiUnProgramma, macchina.percorso);
      const o = ottenuto(f, voce, codice.righe, l, d.caso.expected, d.controllo, tettoDelleChiamate(d.progetto));
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
  `toolchain: ${toolchain.map(({ esecutore, da, macchine, mancanti }) => `${esecutore.nome} da ${da}: ${macchine.map((k) => `${k.nome} ${k.versione} (${k.percorso})`).join(", ") || "nessuno"}${mancanti.length > 0 ? ` (manca: ${mancanti.join(", ")})` : ""}`).join("; ")}`,
);
const avvisiAttesi = daEseguire.flatMap(({ voce, esecutore }) => Object.entries(esecutore.avvisiAttesi).map(([f, o]) => `${voce.id} ${f} ${o}`));
console.log(
  `avvisi della compilazione: compilazioni ${compilazioni.length}, con gli avvisi attesi ${compilazioniConAvvisiAttesi} (${avvisiAttesi.join(", ")}), non attesi ${avvisiNonAttesi}, attesi e mancanti ${avvisiMancanti}`,
);
console.log(
  `differenziale: file ${file.length}, casi nel confronto ${n} (di funzioni ${diFunzioni}, con l'errore statico ${conErroreStatico}), esclusi ${quantiEsclusi}, fuori tappa ${fuoriTappa} in ${fileFuoriTappa} file; per esecutore: ${esecutori.map((e) => `${e} ${verdiPer.get(e)}/${corsiPer.get(e)}`).join(", ")}; rossi ${rossi}, problemi ${problemi.length}; compilazioni ${compilazioni.length} in ${secondiDelleCompilazioni.toFixed(1)} s, esecuzioni ${esecuzioni.length} in ${secondiDelleEsecuzioni.toFixed(1)} s, in tutto ${((performance.now() - inizio) / 1000).toFixed(1)} s`,
);
process.exit(rossi > 0 || problemi.length > 0 ? 1 : 0);
