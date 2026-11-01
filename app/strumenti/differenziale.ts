// Il test differenziale: ogni caso d'uso delle tappe che il controllo statico non dice fuori tappa (oggi 1, 2, 3 e 4,
// anche i casi che si fermano ai tetti della ricorsione, uguali nei tre esecutori, e i tipi non semplici della cartella
// `tipi/`: i record, le matrici e le tabelle),
// quelli del programma e quelli di ogni
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
//   bun run differenziale                      il corpus di `casi/` (le cartelle `tappa-<n>` e `tipi`)
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
// La forma senza tipi di una voce del registro (il JavaScript del TypeScript) non è un linguaggio in più: le stesse macchine
// la eseguono su ogni caso, con la forma davanti al nome (`js-node it`), e ogni suo programma, anche di prova, si confronta
// con quello coi tipi: stesse righe e stessa provenienza (`differenzaDellaProvenienza`), e uguale, a meno degli spazi lasciati
// dalle annotazioni, al testo senza annotazioni che dà la macchina dell'esecutore (`togliITipi`, `differenzaDalTypeScript`).
// Una differenza è un PROBLEMA; la riga `senza tipi: …` li conta. Senza quella macchina il confronto non si fa, e lo dice la
// stessa riga (la toolchain che manca è già un problema).
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
// Un generatore che cresce un gruppo di costrutti per volta (oggi il TypeScript) dice di un progetto il primo costrutto
// che non sa ancora scrivere: la riga `NON ANCORA <linguaggio> <file>: <costrutto>`, e gli esecutori di quel linguaggio
// non corrono i casi di quel file (né i programmi di prova delle sue funzioni); la riga `non ancora: …` li conta per
// linguaggio, e il conto dei casi corsi da ogni esecutore li toglie.
//
// Il controllo dei tipi di un linguaggio che l'ha (il TypeScript: `tsc`), una volta su tutti i suoi programmi scritti
// (anche i programmi di prova), dopo la loro scrittura: ogni errore è un PROBLEMA, e la riga `controllo dei tipi: …` dice
// per ogni linguaggio i programmi e gli errori.
//
// Righe: per ogni caso ed esecutore quelle di `righe-dei-casi.ts` precedute dall'esecutore (`VERDE gcc it
// tappa-1/x#x`), o `ROSSO … senza esito: …`; `ESCLUSO <caso>: <ragione>`; `ERRORE STATICO <caso>: <codice> <blocco>,
// nessun programma generato`; `FUORI TAPPA <file> (casi: <n>)`; `NON ANCORA …`; `PROBLEMA …`;
// in fondo la riga `toolchain: …`, quella del controllo dei tipi, quella della forma senza tipi, quella dei «non ancora», quella dei casi per tipo (`per tipo: …`, i casi nel confronto che usano i record, fra
// loro quelli che usano le tabelle, quelli che usano le matrici e gli altri) e quella del riepilogo `differenziale: …`. Un caso con gli avvisi diversi è rosso:
// qui ogni differenza lo è. Esce con 1 se c'è un rosso o un problema.
//
// Una corsa senza argomenti sul corpus, verde e con tutte le famiglie, riscrive dalle righe finali il blocco dei conteggi della
// guida delle prove, che è un documento locale (`strumenti/guida-delle-prove.ts`), e lo dice nella riga `guida delle prove: …`:
// anche quando non scrive, perché non c'è l'impostazione o la corsa non è verde. Un documento che l'impostazione nomina e che
// non c'è è un PROBLEMA.
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
import { esitoDelCaso } from "../core/casi/esito";
import { controlla, tetti } from "../core/controllo/controllo";
import { tettoDelleChiamate } from "../core/controllo/spazio";
import { testoDelCodice, type Generato, type Riga } from "../core/genera/forma";
import { linguaggi, type Linguaggio, type VoceDelLinguaggio } from "../core/genera/linguaggi";
import type { LinguaDelCodice } from "../core/genera/nomi";
import { apri } from "../core/progetto/formato";
import { usaIRecord, usaLeMatrici, usaLeTabelle, type Atteso, type CasoDiUnaFunzione, type Funzione, type Progetto } from "../core/progetto/modello";
import { paroleDelloPseudocodice } from "../ui/genera/parole";
import { casiDelProgetto, esclusi, ottenutoDaiTesti, type ControlloCheParte } from "./casi-del-confronto";
import { ambienteDi, appaia, esecutoreDel, esecutori as tuttiGliEsecutori, lingueDelCodice as lingue, nomeDellaMacchina, trovaToolchain, type Esecutore, type Macchina } from "./esecutori";
import { scriviDopoIlDifferenziale } from "./guida-delle-prove";
import { righeDellEsito } from "./righe-dei-casi";
import { differenzaDalTypeScript, differenzaDellaProvenienza } from "./senza-tipi";

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
/** Che cosa si scrive per una voce da eseguire: il linguaggio, e la sua forma senza tipi se ne ha una (`forma` è il suo nome,
 * `chiave` la distingue fra i programmi scritti). */
type Scritta = { chiave: string; forma: string | undefined; voce: DaEseguire["voce"]; estensione: string; genera: VoceDelLinguaggio["genera"] };
const scritteDi = (voce: DaEseguire["voce"]): Scritta[] => {
  const senza = voce.genere === "da-eseguire" ? voce.formaSenzaTipi : undefined;
  return [
    { chiave: voce.id, forma: undefined, voce, estensione: voce.estensione, genera: voce.genera },
    ...(senza === undefined ? [] : [{ chiave: `${voce.id}-${senza.id}`, forma: senza.id, voce, estensione: senza.estensione, genera: senza.genera }]),
  ];
};
const tutteLeScritte = daEseguire.flatMap(({ voce }) => scritteDi(voce));

// ------------------------------------------------------------------------------------------------ i processi

type Fine = { uscita: number | null; out: Uint8Array; err: Uint8Array; scaduto: boolean };

/** `cmd` con la cartella di `nelPath` in testa al PATH: un programma compilato vuole quella del suo compilatore. */
async function lancia(cmd: string[], stdin: Uint8Array, secondi: number, nelPath = cmd[0]!, ambiente: Readonly<Record<string, string>> = {}, cwd?: string): Promise<Fine> {
  const proc = Bun.spawn({ cmd, env: { ...ambienteDi(nelPath), ...ambiente }, stdin, stdout: "pipe", stderr: "pipe", ...(cwd !== undefined ? { cwd } : {}) });
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

/** L'ottenuto di un programma lanciato qui: i flussi in byte, poi il testo a `ottenutoDaiTesti`. */
function ottenuto(f: Fine, voce: VoceDelLinguaggio, righe: readonly Riga[], lingua: LinguaDelCodice, atteso: Atteso, controllo: ControlloCheParte, pila: number): { atteso: Atteso; tagliato: boolean } | { senzaEsito: string } {
  if (f.scaduto) return { senzaEsito: `non finito in ${secondiDiUnProgramma} s` };
  let tutto: string;
  let err: string;
  try {
    tutto = utf8.decode(f.out);
    err = utf8.decode(f.err);
  } catch {
    return { senzaEsito: `lo stdout o lo stderr non è testo UTF-8: ${JSON.stringify(testoDelCompilatore.decode(f.out).slice(0, 200))}` };
  }
  return ottenutoDaiTesti({ uscita: f.uscita, tutto, err }, voce, righe, lingua, atteso, controllo, pila);
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
/** Un esecutore di un programma generato: una macchina della toolchain di un linguaggio, in una lingua del codice, sul
 * linguaggio o sulla sua forma senza tipi. */
type DiUnGenerato = { nome: string; voce: DaEseguire["voce"]; scritta: Scritta; esecutore: Esecutore; macchina: Macchina; lingua: LinguaDelCodice };
const generatiDa: DiUnGenerato[] = toolchain.flatMap(({ voce, esecutore, macchine }) =>
  scritteDi(voce).flatMap((scritta) => macchine.flatMap((macchina) => lingue.map((lingua) => ({ nome: `${nomeDellaMacchina(macchina.nome, scritta.forma)} ${lingua}`, voce, scritta, esecutore, macchina, lingua })))),
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
  const base = basename(nome).replace(/\.algo$/, "");
  const casi = casiDelProgetto(nome, base, p);
  const controllo = controlla(p, tetti);
  if (controllo.fuoriTappa) {
    fuoriTappa += casi.length;
    fileFuoriTappa++;
    righeDiPrima.push(`FUORI TAPPA ${nome} (casi: ${casi.length})`);
    return;
  }
  nomiTrovati.add(base);
  // Ogni programma della tappa si genera e si compila, anche quelli dei casi esclusi: gli avvisi si contano su tutti.
  daGenerare.set(k, { progetto: p, base, statico: controllo.errori.length > 0 });
  if (casi.length === 0) problemi.push(`${nome}: nessun caso d'uso`);
  for (const c of casi) {
    nomiTrovati.add(c.delCaso);
    if ("escluso" in c) {
      quantiEsclusi++;
      righeDiPrima.push(`ESCLUSO ${c.id}: ${c.escluso}`);
      continue;
    }
    if ("problema" in c) {
      problemi.push(c.problema);
      continue;
    }
    const { id, caso, funzione, input } = c;
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
type Codice = { righe: readonly Riga[]; sorgente: string; file: number; linguaggio: Linguaggio; forma: string | undefined; lingua: LinguaDelCodice } | { statico: true } | { nonAncora: string };
const generati = new Map<string, Codice>();
const chiave = (k: number, linguaggio: string, l: LinguaDelCodice) => `${k} ${linguaggio} ${l}`;
/** I file che un linguaggio non sa ancora scrivere, per linguaggio: l'indice del file e il costrutto. */
const nonAncora = new Map<string, Map<number, string>>(daEseguire.map(({ voce }) => [voce.id, new Map()]));
for (const [k, { progetto: p, statico }] of daGenerare) {
  for (const l of lingue)
    for (const { chiave: scritta, forma, voce, estensione, genera } of tutteLeScritte) {
      const g: Generato = genera(p, tetti, l, paroleDelloPseudocodice(l));
      if (!g.generato && g.perche === "non-ancora") {
        const prima = nonAncora.get(voce.id)!.get(k);
        if (prima !== undefined && prima !== g.costrutto) throw new Error(`${file[k]!.nome}: il generatore ${voce.id} dice due costrutti diversi nelle due lingue`);
        nonAncora.get(voce.id)!.set(k, g.costrutto);
        generati.set(chiave(k, scritta, l), { nonAncora: g.costrutto });
        continue;
      }
      if (!g.generato) {
        if (g.perche !== "errori-statici" || !statico) throw new Error(`${file[k]!.nome}: il generatore ${voce.id} lo dice ${g.perche} e il controllo no`);
        generati.set(chiave(k, scritta, l), { statico: true });
        continue;
      }
      if (statico) throw new Error(`${file[k]!.nome}: il controllo vi trova errori statici e il generatore lo traduce`);
      const sorgente = join(tmp, `${k}-${l}${estensione}`);
      writeFileSync(sorgente, testoDelCodice(g.righe));
      generati.set(chiave(k, scritta, l), { righe: g.righe, sorgente, file: k, linguaggio: voce.id, forma, lingua: l });
    }
}
// I programmi di prova dei casi delle funzioni, uno per caso, linguaggio e lingua: si compilano anche loro.
const prove = new Map<string, Codice>();
daConfrontare.forEach((d, n) => {
  if (d.funzione === undefined || d.controllo.errori.length > 0) return;
  for (const l of lingue)
    for (const { chiave: scritta, forma, voce, estensione, genera } of tutteLeScritte) {
      // Il programma di prova di un file che il linguaggio non sa ancora scrivere non si genera.
      const delFile = nonAncora.get(voce.id)!.get(d.file);
      if (delFile !== undefined) {
        prove.set(`${d.id} ${scritta} ${l}`, { nonAncora: delFile });
        continue;
      }
      const g = genera(d.progetto, tetti, l, paroleDelloPseudocodice(l), { funzione: d.funzione.id, caso: d.caso });
      if (!g.generato) throw new Error(`${d.id}: il programma di prova non si genera (${g.perche})`);
      const sorgente = join(tmp, `${d.file}-prova-${n}-${l}${estensione}`);
      writeFileSync(sorgente, testoDelCodice(g.righe));
      prove.set(`${d.id} ${scritta} ${l}`, { righe: g.righe, sorgente, file: d.file, linguaggio: voce.id, forma, lingua: l });
    }
});

// Il controllo dei tipi di ogni linguaggio che l'ha, una volta su tutti i suoi programmi scritti, dalla cartella dei
// sorgenti (la configurazione li elenca per nome: la riga di comando non li terrebbe tutti).
const tipiPer: string[] = [];
for (const { voce, esecutore } of daEseguire) {
  const c = esecutore.controllaITipi;
  if (c === undefined) continue;
  const sorgenti = [...generati.values(), ...prove.values()].flatMap((x) => ("righe" in x && x.linguaggio === voce.id && x.forma === undefined ? [basename(x.sorgente)] : []));
  let errori = 0;
  if (sorgenti.length > 0) {
    const configurazione = `tipi-${voce.id}.json`;
    writeFileSync(join(tmp, configurazione), JSON.stringify(c.configurazione(sorgenti), null, 2));
    const f = await lancia(c.comando(configurazione), new Uint8Array(), 300, undefined, {}, tmp);
    const testo = testoDelCompilatore.decode(f.out) + testoDelCompilatore.decode(f.err);
    const trovati = c.errori(testo);
    errori = trovati.length;
    for (const e of trovati) problemi.push(`tipi ${voce.id}: ${e.riga}`);
    if (f.uscita !== 0 && trovati.length === 0) {
      errori = 1;
      problemi.push(`tipi ${voce.id}: il controllo esce con ${f.scaduto ? "il tempo scaduto" : f.uscita} senza un errore riconosciuto: ${JSON.stringify(testo.slice(0, 500))}`);
    }
    if (f.uscita === 0 && trovati.length > 0) problemi.push(`tipi ${voce.id}: il controllo esce con 0 e ha ${trovati.length} errori`);
  }
  tipiPer.push(`${voce.id} programmi ${sorgenti.length}, errori ${errori}`);
}

// La forma senza tipi di ogni voce che ne ha una: ogni suo programma contro quello coi tipi (quelli di ogni file e quelli di
// prova di ogni caso di una funzione), nelle righe e nella provenienza e nel testo senza le annotazioni.
const senzaTipiPer: string[] = [];
for (const { voce, esecutore, macchine } of toolchain) {
  const senza = scritteDi(voce).find((s) => s.forma !== undefined);
  if (senza === undefined) continue;
  type Scritto = Extract<Codice, { righe: readonly Riga[] }>;
  const coppie = lingue.flatMap((l) => [
    ...[...daGenerare.keys()].map((k) => ({ chi: `${file[k]!.nome} ${l}`, ts: generati.get(chiave(k, voce.id, l)), js: generati.get(chiave(k, senza.chiave, l)) })),
    ...daConfrontare.filter((d) => d.funzione !== undefined).map((d) => ({ chi: `${d.id} ${l}`, ts: prove.get(`${d.id} ${voce.id} ${l}`), js: prove.get(`${d.id} ${senza.chiave} ${l}`) })),
  ]).flatMap(({ chi, ts, js }) => (ts !== undefined && js !== undefined && "righe" in ts && "righe" in js ? [{ chi, ts: ts as Scritto, js: js as Scritto }] : []));
  let provenienzaUguale = 0;
  for (const { chi, ts, js } of coppie) {
    const d = differenzaDellaProvenienza(ts.righe, js.righe);
    if (d === undefined) provenienzaUguale++;
    else problemi.push(`senza tipi ${chi}: la provenienza è diversa, ${d}`);
  }
  const togli = esecutore.togliITipi;
  const macchina = macchine.find((m) => m.famiglia === togli?.famiglia);
  let uguali = 0;
  let confronto = `senza ${togli?.famiglia ?? "chi toglie i tipi"}: testo non confrontato`;
  if (togli !== undefined && macchina !== undefined && coppie.length > 0) {
    const elenco = join(tmp, `tolti-${voce.id}.json`);
    writeFileSync(elenco, JSON.stringify(coppie.map((c) => c.ts.sorgente)));
    const f = await lancia(togli.comando(macchina, elenco), new Uint8Array(), 300, macchina.percorso, esecutore.ambiente?.(macchina));
    if (f.uscita !== 0) problemi.push(`senza tipi ${voce.id}: le annotazioni non si tolgono, uscita ${f.scaduto ? "per il tempo scaduto" : f.uscita}: ${JSON.stringify(testoDelCompilatore.decode(f.err).slice(0, 500))}`);
    else
      for (const { chi, ts, js } of coppie) {
        const d = differenzaDalTypeScript(testoDelCodice(ts.righe), readFileSync(`${ts.sorgente}.tolto`, "utf8"), testoDelCodice(js.righe));
        if (d === undefined) uguali++;
        else problemi.push(`senza tipi ${chi}: non è il TypeScript senza le annotazioni, ${d}`);
      }
    confronto = `testo confrontato da ${macchina.nome} ${macchina.versione}`;
  }
  senzaTipiPer.push(`${voce.id} programmi ${coppie.length}, senza annotazioni uguali ${uguali}, provenienza uguale ${provenienzaUguale}, ${confronto}`);
}

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
  for (const { nome, voce, scritta, esecutore, macchina, lingua: l } of generatiDa) {
    const chi = `${nome} ${d.id}`;
    const delFile = generati.get(chiave(d.file, scritta.chiave, l))!;
    // Un file che il linguaggio non sa ancora scrivere: i suoi esecutori non corrono il caso.
    if ("nonAncora" in delFile) continue;
    if ("statico" in delFile) {
      risultati.set(chi, confronta(d.caso.expected, { output: "", static_error: d.controllo.errori[0]!, warnings: d.controllo.avvisi }, false, chi));
      continue;
    }
    const chiaveDelCodice = d.funzione === undefined ? chiave(d.file, scritta.chiave, l) : `${d.id} ${scritta.chiave} ${l}`;
    const scritto = d.funzione === undefined ? delFile : prove.get(chiaveDelCodice)!;
    if ("nonAncora" in scritto) continue;
    const codice = scritto as Extract<Codice, { righe: readonly Riga[] }>;
    const daLanciare = esecutore.compila === undefined ? codice.sorgente : eseguibili.get(`${chiaveDelCodice} ${macchina.nome}`);
    if (daLanciare === undefined) {
      risultati.set(chi, { genere: "rosso", righe: [`ROSSO ${chi} senza esito: il programma non è stato compilato`] });
      continue;
    }
    esecuzioni.push(async () => {
      const f = await lancia(esecutore.esegui(macchina, daLanciare), input, secondiDiUnProgramma, macchina.percorso, esecutore.ambiente?.(macchina));
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
for (const [linguaggio, perFile] of nonAncora) for (const [k, costrutto] of perFile) console.log(`NON ANCORA ${linguaggio} ${file[k]!.nome}: ${costrutto}`);
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
// I casi per tipo: quelli dei progetti che usano i record (fra loro quelli che usano le tabelle) e quelli che usano le
// matrici, contati a parte perché si vedano.
const verdiConOgni = (casi: readonly { id: string }[]) => casi.filter((d) => esecutori.every((e) => risultati.get(`${e} ${d.id}`)?.genere === "verde")).length;
const coiRecord = daConfrontare.filter((d) => usaIRecord(d.progetto));
const conLeTabelle = daConfrontare.filter((d) => usaLeTabelle(d.progetto));
const conLeMatrici = daConfrontare.filter((d) => usaLeMatrici(d.progetto));
for (const p of problemi) console.log(`PROBLEMA ${p}`);
/** Le righe finali: si stampano, e da loro nasce il blocco dei conteggi della guida delle prove. */
const righeFinali: string[] = [];
const finale = (r: string) => {
  righeFinali.push(r);
  console.log(r);
};
finale(
  `toolchain: ${toolchain.map(({ esecutore, da, macchine, mancanti }) => `${esecutore.nome} da ${da}: ${macchine.map((k) => `${k.nome} ${k.versione} (${k.percorso})`).join(", ") || "nessuno"}${mancanti.length > 0 ? ` (manca: ${mancanti.join(", ")})` : ""}`).join("; ")}`,
);
finale(`controllo dei tipi: ${tipiPer.join("; ") || "nessun linguaggio lo ha"}`);
finale(`senza tipi: ${senzaTipiPer.join("; ") || "nessun linguaggio ha la forma"}`);
// I casi che gli esecutori di un linguaggio non corrono, perché il linguaggio non sa ancora scrivere il loro file.
finale(
  `non ancora: ${[...nonAncora].map(([linguaggio, perFile]) => `${linguaggio} file ${perFile.size}, casi ${daConfrontare.filter((d) => perFile.has(d.file)).length}`).join("; ")}`,
);
const avvisiAttesi = daEseguire.flatMap(({ voce, esecutore }) => Object.entries(esecutore.avvisiAttesi).map(([f, o]) => `${voce.id} ${f} ${o}`));
finale(
  `per tipo: con i record ${coiRecord.length} casi nel confronto (verdi con ogni esecutore ${verdiConOgni(coiRecord)}; con le tabelle ${conLeTabelle.length}, verdi con ogni esecutore ${verdiConOgni(conLeTabelle)}), con le matrici ${conLeMatrici.length} (verdi con ogni esecutore ${verdiConOgni(conLeMatrici)}), senza ${daConfrontare.filter((d) => !coiRecord.includes(d) && !conLeMatrici.includes(d)).length}`,
);
finale(
  `avvisi della compilazione: compilazioni ${compilazioni.length}, con gli avvisi attesi ${compilazioniConAvvisiAttesi} (${avvisiAttesi.join(", ")}), non attesi ${avvisiNonAttesi}, attesi e mancanti ${avvisiMancanti}`,
);
finale(
  `differenziale: file ${file.length}, casi nel confronto ${n} (di funzioni ${diFunzioni}, con l'errore statico ${conErroreStatico}), esclusi ${quantiEsclusi}, fuori tappa ${fuoriTappa} in ${fileFuoriTappa} file; per esecutore: ${esecutori.map((e) => `${e} ${verdiPer.get(e)}/${corsiPer.get(e)}`).join(", ")}; rossi ${rossi}, problemi ${problemi.length}; compilazioni ${compilazioni.length} in ${secondiDelleCompilazioni.toFixed(1)} s, esecuzioni ${esecuzioni.length} in ${secondiDelleEsecuzioni.toFixed(1)} s, in tutto ${((performance.now() - inizio) / 1000).toFixed(1)} s`,
);
// La guida delle prove: il blocco dei conteggi si riscrive solo dopo una corsa verde sul corpus, con tutte le famiglie.
if (argomenti.length === 0) {
  const verde = rossi === 0 && problemi.length === 0 && toolchain.every((t) => t.mancanti.length === 0);
  const guida: { riga: string; problema?: string } = verde ? scriviDopoIlDifferenziale(righeFinali.join("\n")) : { riga: "guida delle prove: non scritta, la corsa non è verde con tutte le famiglie" };
  console.log(guida.riga);
  if (guida.problema !== undefined) {
    console.log(`PROBLEMA guida delle prove: ${guida.problema}`);
    process.exit(1);
  }
}
process.exit(rossi > 0 || problemi.length > 0 ? 1 : 0);
