// Collaudo unico: `bun run collaudo`. Esegue le porte in sequenza e si ferma al primo rosso.
//
// Due modi, che cambiano solo i motori della porta di Playwright:
// - predefinito, `bun run collaudo`: solo Chromium (server di sviluppo e anteprima del build);
// - completo, `bun run collaudo --completo`: Chromium e WebKit, i quattro progetti della configurazione. Si corre
//   alla chiusura di un blocco. Il WebKit è quello di Playwright per la macchina che lo esegue (qui Windows):
//   non è WebKitGTK di Linux né il WebKit di macOS.
// La porta confronta i progetti ESEGUITI (letti dalle prove del report, non dalla configurazione, che li elenca
// tutti e quattro anche quando se ne chiedono due: misurato) con quelli del modo, nei due versi, e dice nella
// sua riga quali motori ha provato e quali no. La prima porta è l'elenco delle prove del modo (pochi secondi, senza
// server), poi i selettori delle prove (un controllo del sorgente, meno di un secondo), poi i conteggi del corpus
// (`strumenti/corpus.ts`: un corpus cambiato dopo l'ultima `bun run conferma-corpus` è rosso prima della corsa lunga);
// con `--solo-elenco` il collaudo si ferma lì.
//
// Ogni porta ha il proprio CONTROLLO POSITIVO nello stesso giro: una sonda (file `__sonda__*`) scritta
// dentro la configurazione vera, che deve far fallire la porta con l'errore atteso e nessun altro; poi
// viene cancellata. Una porta il cui controllo positivo non si accende vale come rossa: uno zero senza
// la prova che il rilevatore sa accendersi non è un dato. Accanto a ogni esito si stampa il
// denominatore (file guardati, prove eseguite, file prodotti).
//
// Per `bun test` e `cargo test` la sonda gira in una corsa A PARTE, dopo la corsa vera senza sonda, che
// deve uscire 0: nella stessa corsa l'exit code sarebbe ≠ 0 per costruzione e il verdetto resterebbe al
// solo report, che non rappresenta tutto (un file di test che non si carica non compare nel junit; un
// binario di test che abortisce non stampa la riga dei test non ancora finiti). Anche il build ha la
// sonda in una corsa a parte (un altro ingresso, un'altra cartella), e il build vero deve uscire 0. Per
// `tsc` la sonda resta nella stessa corsa: gli errori si attribuiscono per file, e un errore senza
// posizione (di configurazione) spegne anche quello della sonda, quindi la porta è rossa. Per Playwright
// anche: uno spec che non si carica finisce negli errori del report (`errors[]`, misurato), che fanno
// rossa la porta.
//
// Che cosa questo collaudo NON guarda:
// - nel modo predefinito, WebKit: un difetto che si vede solo lì lo trova il modo completo, alla chiusura del blocco;
// - in nessun modo, il WebKit di Linux e quello di macOS: il completo su Windows usa il WebKit di Playwright per
//   Windows, che si comporta in modo diverso (il clic su un pulsante non gli dà il fuoco, come su macOS e non come
//   su Linux; il riquadro dei campi copre un «+» con tempi diversi). Sul WebKit di Linux corre solo l'AppImage
//   della prova Linux; le prove di Playwright in WebKit per Linux e macOS non le lancia nessuno strumento;
// - del guscio Tauri, tutto ciò che non è nei test Rust: la finestra, la WebView, il collegamento dei
//   comandi a Tauri (`generate_handler`, lo stato condiviso), il giro con `tauri dev`;
// - il prodotto: il build di release, la lingua ritrovata dopo il riavvio e le tracce nel profilo
//   utente li prova `bun run prova-portabile` (solo Windows), lanciata a parte perché costruisce il
//   release ogni volta (da 25 s a 2 minuti); su Linux li prova `bun run prova-linux` (AppImage in un
//   container Ubuntu 24.04, con Docker Desktop avviato; circa 45 s, la prima volta alcuni minuti);
// - la WebView vera (WebView2, WebKitGTK, WKWebView): Playwright usa i propri Chromium e WebKit, con il
//   guscio simulato (`mockIPC`), quindi il contratto dei comandi è provato dal lato dell'interfaccia sola
//   (WebView2 e WebKitGTK li vedono le due prove sul prodotto; WKWebView nessuno);
// - che le tre configurazioni di `tsc` guardino tutti i file che devono: la sonda di `tsc strumenti`
//   prova solo che `e2e/` è guardata, e il numero dei file guardati si stampa senza confrontarlo con un
//   atteso, quindi un `include` ristretto toglie file senza alcun rosso;
// - quanti test girano in `cargo test`: il numero si stampa e si pretende > 0, senza un atteso (in
//   Playwright invece gli spec e le prove di ciascuno si confrontano con un atteso scritto qui e con i
//   `*.e2e.ts` su disco, nei due versi; per `bun test` i file su disco si confrontano). Un file in `e2e/`
//   nominato fuori dal pattern `*.e2e.ts` non è né raccolto né confrontato;
// - che i rilevatori delle prove non eseguite si accendano ancora (`<skipped` nel junit di Bun,
//   `ignored` in cargo): la sonda prova solo la specie «fallita». Sono stati provati a mano, con un
//   `test.skip`, un `test.todo` e un `#[ignore = "…"]`; un cambio di formato del report li spegnerebbe
//   senza rosso;
// - la qualità delle traduzioni: `tsc` garantisce le stesse chiavi, non che il testo inglese sia giusto
//   né che non sia vuoto;
// - sotto happy-dom (`bun test`), ciò che dipende da stili calcolati e posizionamento: si vede solo in
//   Playwright;
// - che una seconda istanza dei server esca con errore: provato a mano quando i server sono nati;
// - i margini di tempo delle prove di Playwright: la prova più vicina al suo limite si stampa nella riga della
//   porta (e le otto più vicine nel log), senza una soglia che la faccia rossa; la regola dei margini è scritta in
//   `playwright.config.ts` e si rivede quando una prova le si avvicina;
// - lo stile del codice (nessun linter);
// - che le porte chiamino davvero i confronti dei progetti e degli spec: le sonde provano le funzioni del confronto,
//   non la chiamata, che una riga cancellata toglierebbe senza rosso;
// - con `--solo-elenco`, nulla oltre l'elenco e i selettori: la riga «ESITO: SOLO ELENCO» lo dice, ma l'uscita è 0 come quella del
//   collaudo verde, e chi legge solo l'uscita non li distingue.
//
// Gli exit code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, appendFileSync, cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { linguaggi } from "../core/genera/linguaggi";
import { compila, esecutori as delContratto, esecutoriRichiesti as richiestiDal, programmiConAvvisiAttesi as avvisiAttesiDal } from "./esecutori";
import { differenze, leggiIConteggi, misuraIlCorpus } from "./corpus";
import { chiamate, senzaExact } from "./selettori";

const argomenti = process.argv.slice(2);
const opzioni = ["--completo", "--solo-elenco"];
if (argomenti.some((a) => !opzioni.includes(a)) || new Set(argomenti).size !== argomenti.length) {
  console.error(`uso: collaudo [--completo] [--solo-elenco] (ricevuti: ${JSON.stringify(argomenti)})`);
  process.exit(2);
}
const completo = argomenti.includes("--completo");
// Solo le prime due porte (l'elenco delle prove del modo e i selettori, pochi secondi): per controllare un modo senza la
// corsa intera.
const soloElenco = argomenti.includes("--solo-elenco");

const radice = join(import.meta.dir, "..");
const cartellaLog = join(radice, ".collaudo");
mkdirSync(cartellaLog, { recursive: true });
const fileLog = join(cartellaLog, `collaudo-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);

function log(testo: string): void {
  appendFileSync(fileLog, testo.endsWith("\n") ? testo : `${testo}\n`);
}

function riga(testo: string): void {
  console.log(testo);
  log(testo);
}

class PortaRossa extends Error {}

function rosso(porta: string, motivo: string): never {
  throw new PortaRossa(`PORTA ${porta}: ROSSA — ${motivo}`);
}

type Esito = { codice: number; uscita: string };

async function esegui(cmd: string[], env: Record<string, string> = {}): Promise<Esito> {
  log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({ cmd, cwd: radice, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
  const [out, err, codice] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const uscita = out + err;
  log(uscita);
  log(`(exit ${codice})`);
  return { codice, uscita };
}

/** Scrive la sonda, esegue `corpo`, e cancella la sonda in ogni caso. */
async function conSonda<T>(percorso: string, contenuto: string, corpo: () => Promise<T>): Promise<T> {
  const pieno = join(radice, percorso);
  writeFileSync(pieno, contenuto);
  try {
    return await corpo();
  } finally {
    rmSync(pieno, { force: true });
  }
}

/** Sonde rimaste da un giro interrotto: si tolgono prima di cominciare, perché falserebbero gli esiti. */
function togliSondeRimaste(cartella: string): string[] {
  const tolte: string[] = [];
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    if (voce.name === "node_modules" || voce.name === "dist" || voce.name === "target") continue;
    const pieno = join(cartella, voce.name);
    if (voce.isDirectory()) tolte.push(...togliSondeRimaste(pieno));
    else if (voce.name.startsWith("__sonda__")) {
      rmSync(pieno);
      tolte.push(relative(radice, pieno));
    }
  }
  return tolte;
}

// ---------------------------------------------------------------------------------------------- tsc

const tsc = join(radice, "node_modules", ".bin", process.platform === "win32" ? "tsc.exe" : "tsc");
const erroreTsc = /^(.+?)\(\d+,\d+\): error (TS\d+):/gm;

type PortaTsc = { nome: string; config: string; sonda: string; contenuto: string; codiceAtteso: string[] };

const porteTsc: PortaTsc[] = [
  {
    nome: "tsc nucleo",
    config: "tsconfig.nucleo.json",
    sonda: "core/__sonda__.ts",
    // Il nucleo non ha il DOM: `document` non deve esistere.
    contenuto: "export const sonda = document.title;\n",
    codiceAtteso: ["TS2584", "TS2304"],
  },
  {
    nome: "tsc interfaccia",
    config: "tsconfig.json",
    sonda: "i18n/__sonda__.ts",
    // L'inglese con una chiave tolta: il dizionario deve smettere di essere un `Dizionario`. La chiave
    // è una vera e stabile; se sparisse dall'italiano l'errore cambierebbe codice, e la porta lo dice.
    contenuto:
      'import { en } from "./en";\nimport type { Dizionario } from "./it";\nconst { premessa: _, ...senzaUnaChiave } = en;\nexport const sonda: Dizionario = senzaUnaChiave;\n',
    codiceAtteso: ["TS2741"],
  },
  {
    nome: "tsc strumenti",
    config: "tsconfig.strumenti.json",
    // In e2e/: prova anche che le prove di Playwright sono guardate.
    sonda: "e2e/__sonda__.ts",
    contenuto: 'const sonda: number = "testo";\nexport default sonda;\n',
    codiceAtteso: ["TS2322"],
  },
];

async function portaTsc(p: PortaTsc): Promise<void> {
  // Denominatore: i file del progetto che questa configurazione guarda (senza la sonda).
  const elenco = await esegui([tsc, "-p", p.config, "--listFilesOnly"]);
  const guardati = elenco.uscita
    .split(/\r?\n/)
    .filter((r) => r.trim() !== "" && !r.includes("node_modules"));
  if (elenco.codice !== 0 || guardati.length === 0) rosso(p.nome, "--listFilesOnly non elenca alcun file del progetto");

  // Giro vero, con la sonda dentro: deve fallire SOLO per la sonda.
  const esito = await conSonda(p.sonda, p.contenuto, () => esegui([tsc, "-p", p.config, "--noEmit"]));
  const errori = [...esito.uscita.matchAll(erroreTsc)].map((m) => ({ file: m[1]!.replaceAll("\\", "/"), codice: m[2]! }));
  const dellaSonda = errori.filter((e) => e.file.endsWith(p.sonda));
  const altri = errori.filter((e) => !e.file.endsWith(p.sonda));
  if (altri.length > 0) rosso(p.nome, `errori di tipo veri: ${altri.map((e) => `${e.file} ${e.codice}`).join("; ")}`);
  if (esito.codice === 0 || dellaSonda.length === 0) rosso(p.nome, "controllo positivo SPENTO: la sonda non ha fatto fallire tsc");
  if (!dellaSonda.some((e) => p.codiceAtteso.includes(e.codice)))
    rosso(p.nome, `la sonda è fallita con ${dellaSonda.map((e) => e.codice).join(",")} invece di ${p.codiceAtteso.join("/")}`);

  riga(`PORTA ${p.nome}: VERDE | controllo positivo acceso (${dellaSonda[0]!.codice} sulla sonda, nessun altro errore) | file guardati: ${guardati.length}`);
}

// ----------------------------------------------------------------------------------------- bun test

const sondaTest = "core/__sonda__.test.ts";
const nomeProvaSonda = "sonda del collaudo: deve fallire";
// I file che `bun test` raccoglie (misurato con Bun 1.4.2): `.test` e `_test`, `.spec` e `_spec`, in ogni
// cartella tranne `node_modules` e quelle che cominciano con un punto.
const fileDiTest = /[._](test|spec)\.[cm]?[jt]sx?$/;

function fileDiTestSuDisco(cartella: string): string[] {
  return readdirSync(cartella, { withFileTypes: true }).flatMap((voce) => {
    const pieno = join(cartella, voce.name);
    if (voce.isDirectory()) return voce.name === "node_modules" || voce.name.startsWith(".") ? [] : fileDiTestSuDisco(pieno);
    return fileDiTest.test(voce.name) ? [relative(radice, pieno).replaceAll("\\", "/")] : [];
  });
}

const entita: Record<string, string> = { "&apos;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&amp;": "&" };
const decodifica = (testo: string) => testo.replace(/&(apos|quot|lt|gt|amp);/g, (e) => entita[e] ?? e);

/** Una corsa di `bun test` con il report junit: le prove e i file che il report contiene. */
async function corsaBun(argomenti: string[]): Promise<{ codice: number; prove: { nome: string; fallita: boolean; saltata: boolean }[]; file: string[] }> {
  const report = join(cartellaLog, "junit.xml");
  rmSync(report, { force: true });
  const { codice } = await esegui([process.execPath, "test", ...argomenti, "--reporter=junit", `--reporter-outfile=${report}`]);
  if (!existsSync(report)) rosso("bun test", `nessun report junit (exit ${codice}): la suite non è partita`);
  const xml = readFileSync(report, "utf8");
  const prove = [...xml.matchAll(/<testcase\b[^>]*\bname="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g)].map((m) => ({
    nome: decodifica(m[1]!),
    fallita: /<failure\b/.test(m[3] ?? ""),
    saltata: /<skipped\b/.test(m[3] ?? ""),
  }));
  const file = [...new Set([...xml.matchAll(/<testsuite\b[^>]*\bfile="([^"]*)"/g)].map((m) => decodifica(m[1]!).replaceAll("\\", "/")))];
  return { codice, prove, file };
}

async function portaTest(): Promise<void> {
  // Corsa vera, senza sonda: exit 0, nessuna prova fallita o saltata, e nel report gli stessi file che
  // stanno su disco, nei due versi (un file che non si carica non compare nel junit).
  const vera = await corsaBun([]);
  const suDisco = fileDiTestSuDisco(radice);
  const problemi = [
    ...vera.prove.filter((p) => p.fallita).map((p) => `prova fallita: ${p.nome}`),
    ...vera.prove.filter((p) => p.saltata).map((p) => `prova saltata (skip o todo), non eseguita: ${p.nome}`),
    ...suDisco.filter((f) => !vera.file.includes(f)).map((f) => `file di test assente dal report (non caricato?): ${f}`),
    ...vera.file.filter((f) => !suDisco.includes(f)).map((f) => `file nel report che l'elenco su disco non conosce: ${f}`),
    ...(vera.codice !== 0 ? [`exit ${vera.codice} (dettaglio nel log)`] : []),
    ...(vera.prove.length === 0 ? ["nessuna prova vera eseguita"] : []),
  ];
  if (problemi.length > 0) rosso("bun test", problemi.join("; "));

  // Controllo positivo, in una corsa a parte: la sola sonda deve far fallire `bun test` con la sua prova.
  const contenuto = `import { expect, test } from "bun:test";\ntest(${JSON.stringify(nomeProvaSonda)}, () => {\n  expect(1).toBe(2);\n});\n`;
  const sonda = await conSonda(sondaTest, contenuto, () => corsaBun([`./${sondaTest}`]));
  if (sonda.codice === 0 || sonda.prove.length !== 1 || sonda.prove[0]!.nome !== nomeProvaSonda || !sonda.prove[0]!.fallita)
    rosso("bun test", `controllo positivo SPENTO: la corsa della sonda (exit ${sonda.codice}) non ha la sola prova sonda fallita`);
  riga(
    `PORTA bun test: VERDE | exit 0, nessuna prova fallita o saltata | controllo positivo acceso (corsa a parte: exit ${sonda.codice}, 1 fallimento, la sonda) | prove eseguite: ${vera.prove.length} in ${vera.file.length} file, gli stessi ${suDisco.length} su disco`,
  );
}

// --------------------------------------------------------------------------------------------- casi

// `bun run casi` (lo script del package.json) sul corpus: exit 0, nessun rosso, nessun caso con gli avvisi diversi,
// nessun problema, una riga di conteggio per ognuna delle tappe che si eseguono (`tappeDeiCasi`), i casi eseguiti
// tanti quanti i casi dichiarati nei file di quelle tappe (del programma e delle funzioni), contati qui senza lo
// strumento, quelli delle funzioni tanti quanti contati qui e non zero, e i casi da eseguire tanti quanti quelli dei file
// delle tappe che il controllo statico conosce e l'esecuzione non ancora (`tappeDaEseguire`: oggi nessuna, quindi 0).
// Tre controlli positivi, ciascuno in una corsa a parte:
// - PER CAMPO, coi file dati: copie di casi veri del corpus, ciascuna alterata in un solo campo di `expected` (più
//   un campo sconosciuto, che il file non deve aprire); ognuna deve dare la sua riga su quel caso: rossa su quel
//   campo soltanto, o «avvisi diversi» per un avviso atteso in più (il caso resta raggiunto); fra queste un caso di
//   una funzione eseguita da sola (il riferimento della tappa 3, col solo caso di `valido`). L'errore statico non
//   ha un caso nel corpus: la sua copia nasce da `scrittura-intero` con un nome sconosciuto, e quella con l'atteso
//   giusto deve essere verde (altrimenti il rosso della copia alterata non proverebbe nulla). Fra le copie, un file
//   senza casi: un problema anche accanto a file con casi; e un programma che scrive oltre il margine, con la riga
//   dell'output che dice «(tagliato a 1000 caratteri)»;
// - SOLI AVVISI DIVERSI, coi file dati: la copia con l'avviso in più, da sola; la riga «avvisi diversi» ed exit 0;
// - ZERO CASI, coi file dati: il solo file senza casi; esce il problema «nessun caso eseguito»;
// - PER DIFETTO DEL CORPUS: una copia del corpus fuori dal repository con un difetto per ogni rilevatore
//   del modo corpus (file della tappa 1 senza casi, file di una tappa successiva che si esegue, voce ripetuta
//   nell'elenco, file fuori elenco, voce senza file, caso tolto da un file, caso aggiunto e non elencato, anche di una
//   funzione, avvisi diversi, file non `.algo`, file fuori dalle cartelle di tappa, file illeggibile); devono uscire
//   esattamente le righe attese, e nessun'altra.
// Il problema «di una tappa successiva ma il controllo statico la accetta» non ha più una sonda: l'esecuzione usa il
// controllo statico pieno, quindi un file fuori tappa per l'una lo è per l'altro, e la riga non può uscire. Da quando il
// controllo accetta la ricorsione nessun progetto è fuori tappa per lui: nemmeno «è della tappa N ma risulta fuori tappa»
// ha più una sonda (tornano a servire quando una tappa nuova si apre nel solo controllo).
// Che cosa la porta NON guarda: se i casi del corpus siano i casi GIUSTI (lo dicono la misura con gcc e
// le regole del linguaggio, non il collaudo); il verso «eseguito ma non dichiarato» dell'appaiamento dei casi, che
// oggi non può accadere (eseguiti e dichiarati vengono dallo stesso file) e non ha una sonda; la nota della finestra
// su un output tagliato.

/** Lo script `casi` del package.json (`bun <file.ts>`), con gli argomenti dati. */
function comandoCasi(...argomenti: string[]): string[] {
  const script: string = JSON.parse(readFileSync(join(radice, "package.json"), "utf8")).scripts.casi;
  const parti = script.trim().split(/\s+/);
  if (parti.length !== 2 || parti[0] !== "bun" || !parti[1]!.endsWith(".ts")) rosso("casi", `lo script casi non ha la forma attesa (bun <file.ts>): «${script}»`);
  return [process.execPath, parti[1]!, ...argomenti];
}

/** I casi d'uso dichiarati nei file di una tappa, contati senza lo strumento: quelli del programma, con quelli delle
 * procedure e delle funzioni («con»), o questi soli («sole»); il differenziale conta i soli casi del programma. */
function casiDellaTappa(cartella: string, tappa: number, funzioni: "con" | "senza" | "sole"): number {
  const dove = join(cartella, `tappa-${tappa}`);
  return readdirSync(dove)
    .filter((f) => f.endsWith(".algo"))
    .reduce((n, f) => {
      const p = JSON.parse(readFileSync(join(dove, f), "utf8"));
      const delleFunzioni = (p.functions as { test_cases?: unknown[] }[]).reduce((k, g) => k + (g.test_cases?.length ?? 0), 0);
      const delProgramma = p.test_cases?.length ?? 0;
      return n + (funzioni === "sole" ? delleFunzioni : funzioni === "con" ? delProgramma + delleFunzioni : delProgramma);
    }, 0);
}

/** Le tappe i cui casi `bun run casi` esegue; quelle che conta come da eseguire; quelle del differenziale. */
const tappeDeiCasi = [1, 2, 3, 4];
const tappeDaEseguire: number[] = [];
const tappeDelDifferenziale = [1, 2, 3, 4];
/** Le tappe che il differenziale tiene fuori (un costrutto che i generatori non sanno ancora scrivere): le conta soltanto.
 * Oggi nessuna. */
const tappeFuoriDalDifferenziale: number[] = [];
const casiDelleTappe = (cartella: string, tappe: readonly number[], funzioni: "con" | "senza" | "sole" = "senza") => tappe.reduce((n, t) => n + casiDellaTappa(cartella, t, funzioni), 0);

/** I casi dei tipi non semplici (la cartella `tipi/`, i record, le matrici e le tabelle): `bun run casi` li esegue tutti
 * (`tutti`), e tutti entrano nel differenziale come quelli delle tappe (quelli che attendono l'errore statico senza
 * programma, `conStatico`); `diFunzioni`, quelli delle funzioni eseguite da sole. */
function casiDeiTipi(cartella: string): { tutti: number; diFunzioni: number; conStatico: number } {
  const dove = join(cartella, "tipi");
  const conti = { tutti: 0, diFunzioni: 0, conStatico: 0 };
  if (!existsSync(dove)) return conti;
  for (const f of readdirSync(dove).filter((x) => x.endsWith(".algo"))) {
    const p = JSON.parse(readFileSync(join(dove, f), "utf8"));
    const funzioni = p.functions as { test_cases?: unknown[] }[];
    const casi = [...(p.test_cases ?? []), ...funzioni.flatMap((g) => g.test_cases ?? [])] as { expected: { static_error?: unknown } }[];
    const statici = casi.filter((c) => c.expected.static_error !== undefined).length;
    conti.tutti += casi.length;
    conti.diFunzioni += casi.length - (p.test_cases ?? []).length;
    conti.conStatico += statici;
  }
  return conti;
}

/** La copia del corpus con un difetto per rilevatore, e le righe che lo strumento deve stampare. */
function corpusDifettoso(copia: string): string[] {
  const casi = join(radice, "casi");
  cpSync(casi, copia, { recursive: true });
  const leggiJson = (rel: string) => JSON.parse(readFileSync(join(copia, rel), "utf8"));
  const scriviJson = (rel: string, v: unknown) => writeFileSync(join(copia, rel), JSON.stringify(v, null, 2));
  const elenco: Record<string, string[]> = leggiJson("elenco.json");
  // Le voci dell'elenco sono i casi, `file#caso`.
  const voceDue = elenco["tappa-2"]![0]!;
  const svuotato = leggiJson("tappa-1/scrittura-intero.algo");
  // Un progetto della tappa 3 in una tappa che non si esegue ancora, la 5, con la sua voce nell'elenco.
  const conFunzione = leggiJson("tappa-3/parametro-intero.algo");
  mkdirSync(join(copia, "tappa-5"));
  scriviJson("tappa-5/dopo.algo", { ...conFunzione, test_cases: [{ ...conFunzione.test_cases[0], name: "dopo" }] });
  svuotato.test_cases = [];
  scriviJson("tappa-1/scrittura-intero.algo", svuotato);
  // Un caso tolto da un file che ne ha due, un caso aggiunto e non elencato, un avviso atteso tolto.
  const dueCasi = leggiJson("tappa-1/lettura-intero.algo");
  const tolto = dueCasi.test_cases.pop().name;
  scriviJson("tappa-1/lettura-intero.algo", dueCasi);
  const conUnoInPiu = leggiJson("tappa-1/scrittura-reale.algo");
  conUnoInPiu.test_cases.push({ ...conUnoInPiu.test_cases[0], name: "non elencato" });
  scriviJson("tappa-1/scrittura-reale.algo", conUnoInPiu);
  // Un caso di una funzione aggiunto e non elencato.
  const conFunzioni = leggiJson("tappa-3/riferimento-media-voti-funzioni.algo");
  const valido = conFunzioni.functions.find((f: { name?: string }) => f.name === "valido");
  valido.test_cases.push({ ...valido.test_cases[0], name: "non elencato" });
  scriviJson("tappa-3/riferimento-media-voti-funzioni.algo", conFunzioni);
  const senzaAvviso = leggiJson("tappa-1/divisione-intera-in-reale.algo");
  delete senzaAvviso.test_cases[0].expected.warnings;
  scriviJson("tappa-1/divisione-intera-in-reale.algo", senzaAvviso);
  elenco["tappa-2"]!.push(voceDue);
  elenco["tappa-5"] = ["dopo#dopo"];
  elenco["tappa-1"] = [...elenco["tappa-1"]!.filter((v) => !v.startsWith("valore-assoluto#")), "inesistente#inesistente"];
  scriviJson("elenco.json", elenco);
  writeFileSync(join(copia, "tappa-2", "nota.txt"), "x\n");
  writeFileSync(join(copia, "leggimi.txt"), "x\n");
  mkdirSync(join(copia, "tappa-4", "cartella.algo"));
  return [
    "PROBLEMA tappa-1/scrittura-intero è della tappa 1 ma non ha casi d'uso",
    "PROBLEMA tappa-1/scrittura-intero#scrittura-intero è nell'elenco ma non nel file",
    "PROBLEMA tappa-5/dopo è di una tappa successiva ma si esegue",
    `PROBLEMA tappa-2/${voceDue} è ripetuto nell'elenco`,
    `PROBLEMA tappa-1/lettura-intero#${tolto} è nell'elenco ma non nel file`,
    "PROBLEMA tappa-1/scrittura-reale#non elencato è nel file ma non nell'elenco",
    "PROBLEMA tappa-3/riferimento-media-voti-funzioni#valido/non elencato è nel file ma non nell'elenco",
    "PROBLEMA tappa-1/divisione-intera-in-reale#divisione-intera-in-reale ha avvisi diversi da quelli attesi",
    "PROBLEMA tappa-1/valore-assoluto è su disco ma non nell'elenco",
    "PROBLEMA tappa-4/cartella è su disco ma non nell'elenco",
    "PROBLEMA tappa-1/inesistente è nell'elenco ma non su disco",
    "PROBLEMA tappa-2/nota.txt non è un file .algo",
    "PROBLEMA leggimi.txt non sta in una cartella di tappa",
    "ROSSO tappa-4/cartella file illeggibile",
  ];
}

/** Una copia di un caso vero del corpus (`da`, nella tappa 1 se non è detta un'altra), alterata. */
type SondaCasi = { nome: string; da: string; tappa?: string; altera: (p: any) => void; atteso: string };

const sondeCasi: SondaCasi[] = [
  { nome: "output", da: "scrittura-intero", altera: (p) => (p.test_cases[0].expected.output = "42\n"), atteso: "[output]" },
  { nome: "codice", da: "divisione-per-zero", altera: (p) => (p.test_cases[0].expected.error.code = "integer_overflow"), atteso: "[error]" },
  { nome: "blocco", da: "divisione-per-zero", altera: (p) => (p.test_cases[0].expected.error.block = "b2"), atteso: "[error]" },
  { nome: "statico-giusto", da: "scrittura-intero", altera: (p) => conErroreStatico(p, "unknown_name"), atteso: "VERDE" },
  { nome: "statico", da: "scrittura-intero", altera: (p) => conErroreStatico(p, "type_mismatch"), atteso: "[static_error]" },
  {
    nome: "avviso",
    da: "divisione-intera-in-reale",
    altera: (p) => p.test_cases[0].expected.warnings.push({ code: "real_equality", block: "b1" }),
    atteso: "AVVISI DIVERSI",
  },
  { nome: "campo", da: "scrittura-intero", altera: (p) => (p.test_cases[0].expected.colore = "rosso"), atteso: "file non valido" },
  { nome: "senza-casi", da: "scrittura-intero", altera: (p) => delete p.test_cases, atteso: "non ha casi d'uso" },
  { nome: "tagliato", da: "scrittura-intero", altera: scriveMilleCento, atteso: "[output]" },
  { nome: "funzione", da: "riferimento-media-voti-funzioni", tappa: "tappa-3", altera: soloIlCasoDiValido, atteso: "[output]" },
];

/** Il riferimento della tappa 3 col solo primo caso di `valido`, col risultato rovesciato: una riga sola, rossa
 * sull'output. */
function soloIlCasoDiValido(p: any): void {
  delete p.test_cases;
  for (const f of p.functions) if (f.name !== "valido") delete f.test_cases;
  const valido = p.functions.find((f: { name?: string }) => f.name === "valido");
  valido.test_cases = [{ ...valido.test_cases[0], expected: { output: "→ false\n" } }];
}

/** Il programma che scrive 1100 «x» senza a capo, col caso che non attende nulla: l'ottenuto si tiene fino al
 * margine, 1000 caratteri, e la riga di comando lo dice nella riga dell'output. */
function scriveMilleCento(p: any): void {
  p.functions[0].data = [{ name: "n", type: "integer", initial: "0" }];
  p.functions[0].body = [
    { id: "c1", kind: "while", condition: "n < 1100", body: [{ id: "c2", kind: "write", values: ['"x"'], newline: false }, { id: "c3", kind: "assignment", target: "n", value: "n + 1" }] },
  ];
  p.test_cases[0].expected = { output: "" };
}
const rigaDelTagliato = `  output: atteso "", ottenuto "${"x".repeat(1000)}" (tagliato a 1000 caratteri)`;

/** La riga di una sonda per campo che non ha casi: un problema, non una riga di caso. */
const senzaRigaDiCaso = (s: SondaCasi) => s.atteso === "non ha casi d'uso";

function conErroreStatico(p: any, codice: string): void {
  p.functions[0].body[0].values = ["y"];
  p.test_cases[0].expected = { output: "", static_error: { code: codice, block: "b1" } };
}

async function portaCasi(): Promise<void> {
  const vera = await esegui(comandoCasi());
  const riepilogo = vera.uscita.match(/^casi: file (\d+), casi eseguiti (\d+), verdi (\d+), con avvisi diversi (\d+), rossi (\d+), da eseguire (\d+), fuori tappa (\d+), problemi (\d+), casi di funzioni (\d+)$/m);
  const elenco = vera.uscita.match(/^elenco: (\d+) file e (\d+) casi, su disco (\d+) file e (\d+) casi$/m);
  // Una riga per tappa eseguita; dichiarati ed eseguiti si sommano.
  const perTappa = [...vera.uscita.matchAll(/^tappa (\d+): casi dichiarati (\d+), eseguiti (\d+)$/gm)];
  const tappe = perTappa.map((m) => Number(m[1]));
  const dichiarati = perTappa.reduce((n, m) => n + Number(m[2]), 0);
  const eseguiti = perTappa.reduce((n, m) => n + Number(m[3]), 0);
  if (
    vera.codice !== 0 ||
    !riepilogo ||
    !elenco ||
    JSON.stringify(tappe) !== JSON.stringify(tappeDeiCasi) ||
    riepilogo[4] !== "0" ||
    riepilogo[5] !== "0" ||
    riepilogo[8] !== "0" ||
    riepilogo[2] === "0" ||
    riepilogo[2] !== riepilogo[3]
  )
    rosso("casi", `exit ${vera.codice}; ${[...vera.uscita.matchAll(/^(ROSSO|AVVISI DIVERSI|PROBLEMA) .*$/gm)].map((m) => m[0]).join(" · ") || riepilogo?.[0] || "nessun riepilogo"}`);
  // Il numero dei casi: contato qui, confrontato con i dichiarati e con gli eseguiti dello strumento.
  const contati = casiDelleTappe(join(radice, "casi"), tappeDeiCasi, "con");
  const deiTipi = casiDeiTipi(join(radice, "casi")).tutti;
  if (contati !== dichiarati || contati !== eseguiti || String(contati + deiTipi) !== riepilogo[2])
    rosso("casi", `casi delle tappe ${tappeDeiCasi.join(", ")} contati ${contati}, dichiarati ${dichiarati}, eseguiti ${eseguiti}; dei tipi ${deiTipi}; nel riepilogo ${riepilogo[2]}`);
  // I casi delle funzioni eseguite da sole: contati qui, e non zero (il riferimento della tappa 3 ne ha).
  const diFunzioni = casiDelleTappe(join(radice, "casi"), tappeDeiCasi, "sole") + casiDeiTipi(join(radice, "casi")).diFunzioni;
  if (diFunzioni === 0 || String(diFunzioni) !== riepilogo[9])
    rosso("casi", `casi delle funzioni contati ${diFunzioni}, nel riepilogo ${riepilogo[9]}`);
  // I casi da eseguire: contati qui nei file delle loro tappe, e non zero se una tappa è da eseguire.
  const daEseguire = casiDelleTappe(join(radice, "casi"), tappeDaEseguire);
  if ((tappeDaEseguire.length > 0 && daEseguire === 0) || String(daEseguire) !== riepilogo[6])
    rosso("casi", `casi da eseguire delle tappe [${tappeDaEseguire.join(", ")}] contati ${daEseguire}, nel riepilogo ${riepilogo[6]}`);

  // Controllo positivo per difetto del corpus, su una copia fuori dal repository.
  const copia = mkdtempSync(join(tmpdir(), "collaudo-casi-"));
  let difettoso: Esito;
  let attese: string[];
  try {
    attese = corpusDifettoso(copia);
    difettoso = await esegui(comandoCasi("--corpus", copia));
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
  const segnalate = difettoso.uscita.split(/\r?\n/).filter((r) => /^(PROBLEMA|ROSSO) /.test(r));
  const sua = (attesa: string) => (r: string) => r === attesa || r.startsWith(`${attesa}:`);
  const mancanti = attese.filter((a) => segnalate.filter(sua(a)).length !== 1);
  const inPiu = segnalate.filter((r) => !attese.some((a) => sua(a)(r)));
  if (difettoso.codice !== 1 || mancanti.length > 0 || inPiu.length > 0)
    rosso("casi", `controllo positivo del corpus SPENTO o impreciso (exit ${difettoso.codice}): mancanti ${JSON.stringify(mancanti)}, in più ${JSON.stringify(inPiu)}`);

  // Controllo positivo per campo, in una corsa a parte con le sole copie.
  const percorsi = sondeCasi.map((s) => `.collaudo/__sonda__casi-${s.nome}.algo`);
  sondeCasi.forEach((s, i) => {
    const p = JSON.parse(readFileSync(join(radice, "casi", s.tappa ?? "tappa-1", `${s.da}.algo`), "utf8"));
    s.altera(p);
    writeFileSync(join(radice, percorsi[i]!), JSON.stringify(p, null, 2));
  });
  let sonda: Esito;
  try {
    sonda = await esegui(comandoCasi(...percorsi));
  } finally {
    for (const percorso of percorsi) rmSync(join(radice, percorso), { force: true });
  }
  const righe = sonda.uscita.split(/\r?\n/).filter((r) => /^(VERDE|AVVISI DIVERSI|ROSSO|FUORI TAPPA|PROBLEMA) /.test(r));
  const sbagliate = sondeCasi.flatMap((s, i) => {
    const sue = righe.filter((r) => r.includes(percorsi[i]!));
    const r = sue[0] ?? "";
    const giusta =
      sue.length === 1 &&
      (s.atteso === "VERDE"
        ? r.startsWith("VERDE ")
        : s.atteso === "AVVISI DIVERSI"
          ? r.startsWith("AVVISI DIVERSI ")
          : senzaRigaDiCaso(s)
            ? r === `PROBLEMA ${percorsi[i]} ${s.atteso}`
            : r.startsWith("ROSSO ") && (s.atteso === "file non valido" ? r.includes(" file non valido:") : r.endsWith(s.atteso)));
    return giusta ? [] : [`${s.nome}: ${sue.join(" | ") || "nessuna riga"}`];
  });
  // Ogni copia ha la sua riga, e nessun'altra riga esce (nemmeno «nessun caso eseguito»: le altre copie ne hanno).
  if (sonda.codice === 0 || sbagliate.length > 0 || righe.length !== sondeCasi.length)
    rosso("casi", `controllo positivo SPENTO o impreciso (exit ${sonda.codice}): ${sbagliate.join("; ") || `${righe.length} righe per ${sondeCasi.length} copie: ${righe.join(" | ")}`}`);
  // L'output tagliato: la riga dopo quella rossa della sua copia dice fin dove l'ottenuto è tenuto.
  const tutte = sonda.uscita.split(/\r?\n/);
  const delTagliato = tutte.findIndex((r) => r.startsWith("ROSSO ") && r.includes(percorsi[sondeCasi.findIndex((s) => s.nome === "tagliato")]!));
  if (tutte[delTagliato + 1] !== rigaDelTagliato)
    rosso("casi", `controllo positivo del tagliato SPENTO: dopo la riga rossa della copia c'è ${JSON.stringify((tutte[delTagliato + 1] ?? "nessuna riga").slice(0, 80))}`);

  // Un file coi soli avvisi diversi, da solo: la riga «avvisi diversi» ed exit 0 (fuori dal corpus non è un rosso).
  const sondaAvviso = sondeCasi.find((s) => s.nome === "avviso")!;
  const percorsoAvviso = ".collaudo/__sonda__casi-solo-avviso.algo";
  const progettoAvviso = JSON.parse(readFileSync(join(radice, "casi", "tappa-1", `${sondaAvviso.da}.algo`), "utf8"));
  sondaAvviso.altera(progettoAvviso);
  writeFileSync(join(radice, percorsoAvviso), JSON.stringify(progettoAvviso, null, 2));
  let soloAvviso: Esito;
  try {
    soloAvviso = await esegui(comandoCasi(percorsoAvviso));
  } finally {
    rmSync(join(radice, percorsoAvviso), { force: true });
  }
  const righeAvviso = soloAvviso.uscita.split(/\r?\n/).filter((r) => /^(VERDE|AVVISI DIVERSI|ROSSO|FUORI TAPPA|PROBLEMA) /.test(r));
  if (soloAvviso.codice !== 0 || righeAvviso.length !== 1 || !righeAvviso[0]!.startsWith(`AVVISI DIVERSI ${percorsoAvviso}#`))
    rosso("casi", `controllo positivo «soli avvisi diversi» SPENTO o impreciso (exit ${soloAvviso.codice}): ${righeAvviso.join(" | ") || "nessuna riga"}`);

  // Zero casi eseguiti fra i file dati: il solo file senza casi.
  const iSenzaCasi = sondeCasi.findIndex(senzaRigaDiCaso);
  const soloSenzaCasi = sondeCasi[iSenzaCasi]!;
  const percorsoSenzaCasi = percorsi[iSenzaCasi]!;
  const progettoSenzaCasi = JSON.parse(readFileSync(join(radice, "casi", "tappa-1", `${soloSenzaCasi.da}.algo`), "utf8"));
  soloSenzaCasi.altera(progettoSenzaCasi);
  writeFileSync(join(radice, percorsoSenzaCasi), JSON.stringify(progettoSenzaCasi, null, 2));
  let zero: Esito;
  try {
    zero = await esegui(comandoCasi(percorsoSenzaCasi));
  } finally {
    rmSync(join(radice, percorsoSenzaCasi), { force: true });
  }
  const problemiZero = zero.uscita.split(/\r?\n/).filter((r) => /^(VERDE|AVVISI DIVERSI|ROSSO|FUORI TAPPA|PROBLEMA) /.test(r));
  const attesiZero = [`PROBLEMA ${percorsoSenzaCasi} non ha casi d'uso`, "PROBLEMA nessun caso eseguito fra i file dati"];
  if (zero.codice !== 1 || JSON.stringify(problemiZero) !== JSON.stringify(attesiZero))
    rosso("casi", `controllo positivo «zero casi» SPENTO o impreciso (exit ${zero.codice}): ${problemiZero.join(" | ") || "nessuna riga"}`);

  riga(
    `PORTA casi: VERDE | exit 0, ${riepilogo[3]} casi verdi su ${riepilogo[2]} (contati nei file delle tappe ${tappeDeiCasi.join(", ")}: ${contati}; di funzioni ${riepilogo[9]}, contati: ${diFunzioni}), con avvisi diversi ${riepilogo[4]}, da eseguire ${riepilogo[6]} (contati nei file delle tappe [${tappeDaEseguire.join(", ")}]: ${daEseguire}), fuori tappa ${riepilogo[7]}, elenco ${elenco[1]} file e ${elenco[2]} casi, su disco ${elenco[3]} file e ${elenco[4]} casi | controllo positivo acceso (corsa a parte: exit ${sonda.codice}; ${sondeCasi.map((s) => `${s.nome} ${s.atteso}`).join(", ")}; la riga del tagliato) | controllo positivo «soli avvisi diversi» acceso (exit ${soloAvviso.codice}, una riga) | controllo positivo «zero casi» acceso (exit ${zero.codice}; ${attesiZero.length} righe attese) | controllo positivo del corpus acceso (exit ${difettoso.codice}; righe attese ${attese.length}, tutte presenti, nessuna in più)`,
  );
}

// ------------------------------------------------------------------------------------ differenziale

// `bun run differenziale` (lo script del package.json) sul corpus: exit 0, nessun rosso né problema; ogni esecutore
// verde su tutti i casi del confronto; i casi del confronto
// più gli esclusi tanti quanti i casi delle tappe del differenziale contati qui (del programma e delle funzioni), quelli
// delle funzioni tanti quanti contati qui; gli esclusi, PER NOME nei due versi, quelli delle decisioni dei blocchi
// (`esclusiDalDifferenziale`); i casi con l'errore statico tanti quanti i casi che lo attendono, contati qui; i fuori
// tappa tanti quanti i casi e i file delle tappe fuori (oggi nessuna), contati qui; gli esecutori eseguiti uguali,
// nei due versi, a quelli richiesti dal contratto (`strumenti/esecutori.ts`): l'interprete, e ogni famiglia della
// toolchain di ogni linguaggio da eseguire del registro nelle due lingue (oggi il Python, e il C con un gcc e con un
// clang: la toolchain che manca fa rossa la porta, non la salta). La durata nella riga.
// Controlli positivi, ciascuno in una corsa a parte:
// - PER CAMPO, coi file dati: copie di casi del corpus con l'atteso alterato (l'output con un carattere in meno, cioè
//   l'ottenuto con uno in più; l'errore atteso su un altro blocco; un carattere dell'output cambiato, anche in un caso
//   della tappa 2 con la fine cambiata nel corpo; l'errore statico atteso su un altro blocco) danno una riga ROSSO su
//   quel campo per OGNI esecutore; una voce col ritorno carrello finale fa del suo caso un problema, e l'altro caso
//   dello stesso file resta verde per ogni esecutore; il caso di una funzione con l'atteso alterato dà la riga ROSSO
//   per ogni esecutore (col programma di prova), e gli altri casi dello stesso file verdi;
// - SENZA TOOLCHAIN: le due variabili su un eseguibile che non c'è (vincono sull'impostazione e sul PATH) danno i
//   problemi della toolchain ed exit 1;
// - AVVISI DEL C: una copia di un caso del corpus con un dato mai usato fa avvisare ogni compilatore in ogni lingua
//   (`-Wunused-variable`), un PROBLEMA per ciascuno, e il caso resta verde per ogni esecutore;
// - gli esecutori richiesti: il confronto, senza UNO qualunque di loro, dice esattamente quello mancante; col registro
//   senza il C gli esecutori richiesti sono meno, e la corsa vera ha in più esattamente quelli che compilano.
// La riga `avvisi della compilazione` della corsa vera: nessun avviso non atteso né mancante, i programmi attesi tanti
// quanti ne dichiarano gli esecutori del contratto, e le compilazioni con gli avvisi attesi tante quante quei programmi
// per i compilatori e le lingue.
// Che cosa la porta NON guarda: i casi d'uso nel container Linux (alla chiusura del blocco); la console di Windows.

/** Gli esclusi dalle decisioni dei blocchi (il codice generato non controlla ciò che il C non definisce, né il tetto dei
 * passi), per nome del file; di ognuno un caso solo è escluso (della sequenza di Fibonacci «ventisei», del record per
 * riferimento senza valore «senza-valore»). */
const esclusiDalDifferenziale: readonly string[] = [
  "tappa-1/divisione-per-zero", "tappa-1/indice-fuori", "tappa-1/intero-minimo-diviso-meno-uno", "tappa-1/opposto-intero-minimo",
  "tappa-1/overflow-fattoriale", "tappa-1/reale-fuori-intervallo", "tappa-1/reale-non-finito", "tappa-1/senza-valore-booleano",
  "tappa-1/senza-valore-carattere", "tappa-1/senza-valore-intero", "tappa-1/senza-valore-reale", "tappa-1/senza-valore-stringa",
  "tappa-1/troppi-passi", "tappa-2/per-overflow-contatore", "tappa-3/reale-fuori-intervallo-parametro",
  "tappa-3/riferimento-senza-valore-in-esecuzione", "tappa-3/uscita-con-valore-prima", "tappa-3/uscita-letta-prima", "tappa-3/uscita-non-assegnata",
  "tappa-4/passi-fuori-dal-ciclo", "tappa-4/sequenza-di-fibonacci", "tipi/copia-con-un-campo-senza-valore",
  "tipi/indice-fuori-dalla-matrice", "tipi/riferimento-a-un-record-senza-valore",
];
/** Gli esecutori richiesti e i programmi che avvisano compilati, dal contratto: le voci da eseguire del registro dei
 * linguaggi e il loro esecutore (le famiglie della toolchain, gli avvisi attesi). */
const esecutoriRichiesti = richiestiDal(linguaggi, delContratto);
const programmiConAvvisiAttesi = avvisiAttesiDal(linguaggi, delContratto);

/** Gli esecutori richiesti che mancano fra quelli eseguiti, e quelli eseguiti che nessuno richiede (un compilatore
 * ripetuto si chiama `gcc-2`: conta come il primo). */
const confrontoDegliEsecutori = (richiesti: readonly string[], eseguiti: readonly string[]) => {
  const senzaNumero = (e: string) => e.replace(/-\d+ /, " ");
  return {
    mancanti: richiesti.filter((r) => !eseguiti.some((e) => senzaNumero(e) === r)),
    inPiu: eseguiti.filter((e) => !richiesti.includes(senzaNumero(e))),
  };
};

/** Lo script `differenziale` del package.json (`bun <file.ts>`), con gli argomenti dati. */
function comandoDifferenziale(...argomenti: string[]): string[] {
  const script: string = JSON.parse(readFileSync(join(radice, "package.json"), "utf8")).scripts.differenziale;
  const parti = script.trim().split(/\s+/);
  if (parti.length !== 2 || parti[0] !== "bun" || !parti[1]!.endsWith(".ts")) rosso("differenziale", `lo script differenziale non ha la forma attesa (bun <file.ts>): «${script}»`);
  return [process.execPath, parti[1]!, ...argomenti];
}

type SondaDifferenziale = { nome: string; da: string; tappa?: number; altera: (p: any) => void; righe: (percorso: string, esecutori: readonly string[]) => string[] };
const ogni = (esecutori: readonly string[], riga: (e: string) => string) => esecutori.map(riga);
const sondeDifferenziale: SondaDifferenziale[] = [
  {
    nome: "carattere-in-piu",
    da: "scrittura-stringa",
    altera: (p) => (p.test_cases[0].expected.output = p.test_cases[0].expected.output.slice(0, -1)),
    righe: (f, es) => ogni(es, (e) => `ROSSO ${e} ${f}#scrittura-stringa [output]`),
  },
  {
    nome: "blocco",
    da: "input-non-valido",
    altera: (p) => (p.test_cases[0].expected.error.block = "b2"),
    righe: (f, es) => ogni(es, (e) => `ROSSO ${e} ${f}#input-non-valido [error]`),
  },
  {
    nome: "output",
    da: "riferimento-media-voti",
    altera: (p) => {
      const o: string = p.test_cases[0].expected.output;
      p.test_cases[0].expected.output = `${o.slice(0, 3)}${o[3] === "x" ? "y" : "x"}${o.slice(4)}`;
    },
    righe: (f, es) => ogni(es, (e) => `ROSSO ${e} ${f}#riferimento-media-voti [output]`),
  },
  {
    // La fine cambiata nel corpo: il ciclo che la ricalcola a ogni giro.
    nome: "fine-cambiata",
    da: "per-fine-cambiata",
    tappa: 2,
    altera: (p) => (p.test_cases[0].expected.output = p.test_cases[0].expected.output.replace("123", "124")),
    righe: (f, es) => ogni(es, (e) => `ROSSO ${e} ${f}#per-fine-cambiata [output]`),
  },
  {
    nome: "errore-statico",
    da: "per-passo-zero",
    tappa: 2,
    altera: (p) => (p.test_cases[0].expected.static_error.block = "b2"),
    righe: (f, es) => [`ERRORE STATICO ${f}#per-passo-zero: invalid_step b1, nessun programma generato`, ...ogni(es, (e) => `ROSSO ${e} ${f}#per-passo-zero [static_error]`)],
  },
  {
    nome: "ritorno-carrello",
    da: "lettura-intero",
    altera: (p) => (p.test_cases[0].inputs[0].text += "\r"),
    righe: (f, es) => [...ogni(es, (e) => `VERDE ${e} ${f}#negativo`), `PROBLEMA ${f}#lettura-intero: la voce 1 ha un ritorno carrello, e una riga non la porta`],
  },
  {
    // Il caso di una funzione eseguita da sola: lo corre ogni esecutore, i generati col programma di prova.
    nome: "caso-di-una-funzione",
    da: "riferimento-media-voti-funzioni",
    tappa: 3,
    altera: (p) => (p.functions[2].test_cases[0].expected.output = "→ false\n"),
    righe: (f, es) => [
      ...ogni(es, (e) => `VERDE ${e} ${f}#riferimento-media-voti-funzioni`),
      ...ogni(es, (e) => `ROSSO ${e} ${f}#valido/voto valido [output]`),
      ...ogni(es, (e) => `VERDE ${e} ${f}#valido/voto troppo alto`),
      ...ogni(es, (e) => `VERDE ${e} ${f}#stelle/tre stelle`),
    ],
  },
  {
    nome: "dato-mai-usato",
    da: "scrittura-intero",
    // Il dato col valore che nessuno legge: anche l'avviso del controllo, scritto nell'atteso.
    altera: (p) => {
      p.functions[0].data.push({ name: "mai_usato", type: "integer", initial: "1" });
      p.test_cases[0].expected.warnings = [{ code: "unused_value", block: p.functions[0].id }];
    },
    righe: (f, es) => [
      ...ogni(es, (e) => `VERDE ${e} ${f}#scrittura-intero`),
      ...es.filter((e) => compila(e, linguaggi, delContratto)).map((e) => `PROBLEMA ${basename(f, ".algo")}: ${e} avvisa senza che l'avviso sia atteso: -Wunused-variable`),
    ],
  },
];

async function portaDifferenziale(): Promise<void> {
  const inizio = performance.now();
  const vera = await esegui(comandoDifferenziale());
  const secondi = (performance.now() - inizio) / 1000;
  const riepilogo = vera.uscita.match(
    /^differenziale: file (\d+), casi nel confronto (\d+) \(di funzioni (\d+), con l'errore statico (\d+)\), esclusi (\d+), fuori tappa (\d+) in (\d+) file; per esecutore: (.+); rossi (\d+), problemi (\d+); (.+)$/m,
  );
  const toolchain = vera.uscita.match(/^toolchain: .*$/m)?.[0] ?? "nessuna riga della toolchain";
  if (vera.codice !== 0 || !riepilogo || riepilogo[9] !== "0" || riepilogo[10] !== "0")
    rosso("differenziale", `exit ${vera.codice}; ${[...vera.uscita.matchAll(/^(ROSSO|PROBLEMA) .*$/gm)].map((m) => m[0]).slice(0, 12).join(" · ") || riepilogo?.[0] || "nessun riepilogo"} | ${toolchain}`);
  const n = Number(riepilogo[2]);
  const perEsecutore = riepilogo[8]!.split(", ").map((x) => x.match(/^(.+) (\d+)\/(\d+)$/));
  const esecutori = perEsecutore.map((m) => m?.[1] ?? "?");
  const nonTutti = perEsecutore.filter((m) => !m || m[2] !== String(n) || m[3] !== String(n));
  const { mancanti, inPiu: eseguitiInPiu } = confrontoDegliEsecutori(esecutoriRichiesti, esecutori);
  if (n === 0 || nonTutti.length > 0 || mancanti.length > 0 || eseguitiInPiu.length > 0)
    rosso("differenziale", `casi nel confronto ${n}; esecutori non verdi su tutti: ${JSON.stringify(nonTutti.map((m) => m?.[0]))}; richiesti ${esecutoriRichiesti.length} dal contratto, mancanti: ${JSON.stringify(mancanti)}, eseguiti in più: ${JSON.stringify(eseguitiInPiu)} | ${toolchain}`);
  const cartellaDeiCasi = join(radice, "casi");
  // I casi dei tipi non semplici entrano nel confronto come quelli delle tappe.
  const deiTipi = casiDeiTipi(cartellaDeiCasi);
  const contati = casiDelleTappe(cartellaDeiCasi, tappeDelDifferenziale, "con") + deiTipi.tutti;
  if (n + Number(riepilogo[5]) !== contati || Number(riepilogo[5]) !== esclusiDalDifferenziale.length)
    rosso("differenziale", `casi delle tappe ${tappeDelDifferenziale.join(", ")} e dei tipi che si eseguono contati ${contati}, nel confronto ${n}, esclusi ${riepilogo[5]} (attesi ${esclusiDalDifferenziale.length})`);
  const diFunzioni = casiDelleTappe(cartellaDeiCasi, tappeDelDifferenziale, "sole") + deiTipi.diFunzioni;
  if (Number(riepilogo[3]) !== diFunzioni) rosso("differenziale", `casi di funzioni nel confronto ${riepilogo[3]}, contati nei file ${diFunzioni}`);
  // Gli esclusi per nome, nei due versi: le righe ESCLUSO e l'elenco delle decisioni.
  const esclusiStampati = [...vera.uscita.matchAll(/^ESCLUSO (\S+)#/gm)].map((m) => m[1]!);
  const esclusiSenzaRiga = esclusiDalDifferenziale.filter((x) => !esclusiStampati.includes(x));
  const righeSenzaDecisione = esclusiStampati.filter((x) => !esclusiDalDifferenziale.includes(x));
  if (esclusiSenzaRiga.length > 0 || righeSenzaDecisione.length > 0 || esclusiStampati.length !== esclusiDalDifferenziale.length)
    rosso("differenziale", `esclusi per nome: righe ${esclusiStampati.length}, decisioni ${esclusiDalDifferenziale.length}; senza riga ${JSON.stringify(esclusiSenzaRiga)}, senza decisione ${JSON.stringify(righeSenzaDecisione)}`);
  // I casi con l'errore statico atteso e i fuori tappa, contati qui sui file.
  const conStatico = tappeDelDifferenziale.reduce(
    (k, t) =>
      k +
      readdirSync(join(cartellaDeiCasi, `tappa-${t}`))
        .filter((f) => f.endsWith(".algo"))
        .flatMap((f) => {
          const p = JSON.parse(readFileSync(join(cartellaDeiCasi, `tappa-${t}`, f), "utf8"));
          return [...(p.test_cases ?? []), ...(p.functions as { test_cases?: unknown[] }[]).flatMap((g) => g.test_cases ?? [])];
        })
        .filter((c: { expected: { static_error?: unknown } }) => c.expected.static_error !== undefined).length,
    deiTipi.conStatico,
  );
  const statiche = [...vera.uscita.matchAll(/^ERRORE STATICO /gm)].length;
  if (Number(riepilogo[4]) !== conStatico || statiche !== conStatico)
    rosso("differenziale", `casi con l'errore statico: nel riepilogo ${riepilogo[4]}, righe ${statiche}, attesi nei file ${conStatico}`);
  const fileDelle = (tappe: readonly number[]) => tappe.reduce((k, t) => k + readdirSync(join(cartellaDeiCasi, `tappa-${t}`)).filter((f) => f.endsWith(".algo")).length, 0);
  const fuoriContati = casiDelleTappe(cartellaDeiCasi, tappeFuoriDalDifferenziale, "con");
  const fileFuori = fileDelle(tappeFuoriDalDifferenziale);
  if (Number(riepilogo[6]) !== fuoriContati || Number(riepilogo[7]) !== fileFuori)
    rosso("differenziale", `fuori tappa ${riepilogo[6]} in ${riepilogo[7]} file; contati nelle tappe ${tappeFuoriDalDifferenziale.join(", ")}: ${fuoriContati} in ${fileFuori} file`);

  // Gli avvisi della compilazione nella corsa vera: nessuno non atteso né mancante, e gli attesi su ogni macchina che
  // compila e lingua.
  const avvisi = vera.uscita.match(/^avvisi della compilazione: compilazioni (\d+), con gli avvisi attesi (\d+) \((.*)\), non attesi (\d+), attesi e mancanti (\d+)$/m);
  const compilatoriELingue = esecutori.filter((e) => compila(e, linguaggi, delContratto)).length;
  const programmiAttesi = avvisi === null || avvisi[3] === "" ? 0 : avvisi[3]!.split(", ").length;
  if (!avvisi || avvisi[4] !== "0" || avvisi[5] !== "0" || Number(avvisi[2]) !== programmiAttesi * compilatoriELingue || programmiAttesi !== programmiConAvvisiAttesi)
    rosso("differenziale", `avvisi della compilazione: ${avvisi?.[0] ?? "nessuna riga"} (attesi dal contratto ${programmiConAvvisiAttesi} programmi per ${compilatoriELingue} compilatori e lingue)`);

  // Controlli positivi degli esecutori richiesti: senza UNO qualunque di loro, quello e solo quello mancante; e il
  // registro senza il C chiede meno esecutori di quelli eseguiti, e la corsa vera risulta con quelli in più.
  const membri = esecutoriRichiesti.map((x) => ({ x, mancanti: confrontoDegliEsecutori(esecutoriRichiesti, esecutoriRichiesti.filter((e) => e !== x)).mancanti }));
  const spenti = membri.filter(({ x, mancanti }) => JSON.stringify(mancanti) !== JSON.stringify([x]));
  const senzaIlC = richiestiDal(linguaggi.filter((v) => v.id !== "c"), delContratto);
  const inPiuSenzaIlC = confrontoDegliEsecutori(senzaIlC, esecutori).inPiu;
  const delC = esecutori.filter((e) => compila(e, linguaggi, delContratto));
  if (esecutoriRichiesti.length < 2 || spenti.length > 0 || senzaIlC.length >= esecutoriRichiesti.length || delC.length === 0 || JSON.stringify(inPiuSenzaIlC) !== JSON.stringify(delC))
    rosso("differenziale", `controllo positivo degli esecutori richiesti SPENTO: richiesti ${esecutoriRichiesti.length}, senza uno ${JSON.stringify(spenti)}; col registro senza il C richiesti ${senzaIlC.length}, in più ${JSON.stringify(inPiuSenzaIlC)} (attesi ${JSON.stringify(delC)})`);

  // Controllo positivo per campo, in una corsa a parte coi soli file sonda.
  const percorsi = sondeDifferenziale.map((s) => `.collaudo/__sonda__diff-${s.nome}.algo`);
  sondeDifferenziale.forEach((s, i) => {
    const p = JSON.parse(readFileSync(join(radice, "casi", `tappa-${s.tappa ?? 1}`, `${s.da}.algo`), "utf8"));
    s.altera(p);
    writeFileSync(join(radice, percorsi[i]!), JSON.stringify(p, null, 2));
  });
  let sonda: Esito;
  try {
    sonda = await esegui(comandoDifferenziale(...percorsi));
  } finally {
    for (const percorso of percorsi) rmSync(join(radice, percorso), { force: true });
  }
  const righe = sonda.uscita.split(/\r?\n/).filter((r) => /^(VERDE|ROSSO|PROBLEMA|ESCLUSO|ERRORE STATICO|FUORI TAPPA) /.test(r));
  const attese = sondeDifferenziale.flatMap((s, i) => s.righe(percorsi[i]!, esecutori));
  const mancantiSonda = attese.filter((a) => !righe.includes(a));
  const inPiu = righe.filter((r) => !attese.includes(r));
  if (sonda.codice !== 1 || mancantiSonda.length > 0 || inPiu.length > 0)
    rosso("differenziale", `controllo positivo SPENTO o impreciso (exit ${sonda.codice}): mancanti ${JSON.stringify(mancantiSonda.slice(0, 6))}, in più ${JSON.stringify(inPiu.slice(0, 6))}`);

  // Senza toolchain: le variabili su un eseguibile che non c'è, un file solo.
  const nessuno = join(radice, ".collaudo", "__sonda__non-esiste.exe");
  const senza = await esegui(comandoDifferenziale("casi/tappa-1/scrittura-intero.algo"), { ALGODESIGN_CC: nessuno, ALGODESIGN_PYTHON: nessuno });
  const problemiSenza = senza.uscita.split(/\r?\n/).filter((r) => r.startsWith("PROBLEMA toolchain:"));
  const soloInterprete = /; per esecutore: interprete 1\/1; /.test(senza.uscita);
  if (senza.codice !== 1 || problemiSenza.length < 2 || !soloInterprete)
    rosso("differenziale", `controllo positivo «senza toolchain» SPENTO (exit ${senza.codice}; problemi della toolchain ${problemiSenza.length}; solo l'interprete: ${soloInterprete})`);

  riga(
    `PORTA differenziale: VERDE | ${secondi.toFixed(1)} s | exit 0, ${n} casi nel confronto (di funzioni ${riepilogo[3]}, contati nei file: ${diFunzioni}; con l'errore statico ${riepilogo[4]}, contati nei file: ${conStatico}; con gli esclusi ${riepilogo[5]}, per nome, contati nei file: ${contati}, contati nei file delle tappe ${tappeDelDifferenziale.join(", ")}), fuori tappa ${riepilogo[6]} in ${riepilogo[7]} file (contati nelle tappe ${tappeFuoriDalDifferenziale.join(", ")}) | per esecutore: ${riepilogo[8]} | ${toolchain} | avvisi della compilazione: ${avvisi[1]} compilazioni, ${avvisi[2]} con gli avvisi attesi, nessun altro | controllo positivo acceso (corsa a parte: exit ${sonda.codice}; ${sondeDifferenziale.map((s) => s.nome).join(", ")}: ${attese.length} righe attese, tutte, nessuna in più) | controllo positivo «senza toolchain» acceso (exit ${senza.codice}, ${problemiSenza.length} problemi) | esecutori dal contratto: richiesti ${esecutoriRichiesti.length}, eseguiti ${esecutori.length}, mancanti 0, in più 0; programmi con gli avvisi attesi ${programmiConAvvisiAttesi} | controllo positivo degli esecutori richiesti acceso (senza uno: ${membri.length} su ${membri.length}; registro senza il C: richiesti ${senzaIlC.length} invece di ${esecutoriRichiesti.length}, ROSSO con ${inPiuSenzaIlC.length} in più)`,
  );
}

// -------------------------------------------------------------------------------------------- build

const sondaBuild = { html: ".collaudo/__sonda__.html", script: ".collaudo/__sonda__.ts" };
const segnoReactSviluppo = "Download the React DevTools";
const fileReactSviluppo = "node_modules/react-dom/cjs/react-dom-client.development.js";

/** Lo script `build` del package.json con un altro ingresso e un'altra cartella: gli stessi flag. */
function comandoBuild(ingresso: string, cartella: string): string[] {
  const script: string = JSON.parse(readFileSync(join(radice, "package.json"), "utf8")).scripts.build;
  const parti = script.trim().split(/\s+/);
  const iIngresso = parti.findIndex((p) => p.endsWith(".html"));
  const iCartella = parti.indexOf("--outdir") + 1;
  if (parti[0] !== "bun" || parti[1] !== "build" || iIngresso < 0 || iCartella === 0 || parti[iCartella] === undefined)
    rosso("build", `lo script build non ha la forma attesa (bun build <ingresso.html> --outdir <cartella> …): «${script}»`);
  parti[iIngresso] = ingresso;
  parti[iCartella] = cartella;
  return [process.execPath, ...parti.slice(1)];
}

async function portaBuild(): Promise<void> {
  // Controllo positivo: un ingresso con un import mancante, costruito con i flag dello script, deve fallire.
  writeFileSync(join(radice, sondaBuild.script), 'import "./modulo-che-non-esiste";\n');
  const sonda = await conSonda(
    sondaBuild.html,
    '<!doctype html><html><body><script type="module" src="./__sonda__.ts"></script></body></html>\n',
    () => esegui(comandoBuild(sondaBuild.html, ".collaudo/dist-sonda")),
  ).finally(() => rmSync(join(radice, sondaBuild.script), { force: true }));
  rmSync(join(radice, ".collaudo", "dist-sonda"), { recursive: true, force: true });
  if (sonda.codice === 0 || !sonda.uscita.includes("modulo-che-non-esiste"))
    rosso("build", "controllo positivo SPENTO: il build della sonda non è fallito sull'import mancante");

  // Build vero, con lo script del package.json.
  const dist = join(radice, "dist");
  rmSync(dist, { recursive: true, force: true });
  const esito = await esegui([process.execPath, "run", "build"]);
  if (esito.codice !== 0) rosso("build", `exit ${esito.codice}`);
  const prodotti = existsSync(dist) ? readdirSync(dist) : [];
  const perTipo = (est: string) => prodotti.filter((f) => f.endsWith(est) && statSync(join(dist, f)).size > 0);
  const [html, js, css] = [perTipo(".html"), perTipo(".js"), perTipo(".css")];
  if (html.length !== 1 || js.length === 0 || css.length === 0)
    rosso("build", `dist/ incompleto: ${prodotti.join(", ") || "vuoto"}`);

  // React deve essere quello di produzione. Il segno si prende dal corpus vero: se una versione nuova
  // di React lo cambia, il controllo positivo si spegne e la porta lo dice.
  if (!readFileSync(join(radice, fileReactSviluppo), "utf8").includes(segnoReactSviluppo))
    rosso("build", `controllo positivo SPENTO: il segno di React di sviluppo non è più in ${fileReactSviluppo}`);
  const conSviluppo = js.filter((f) => readFileSync(join(dist, f), "utf8").includes(segnoReactSviluppo));
  if (conSviluppo.length > 0) rosso("build", `React di sviluppo nel bundle: ${conSviluppo.join(", ")}`);

  riga(
    `PORTA build: VERDE | controllo positivo acceso (import mancante → exit ${sonda.codice}; segno di React di sviluppo trovato nel suo file) | dist: ${html.length} html, ${js.length} js, ${css.length} css`,
  );
}

// ---------------------------------------------------------------------------------------- cargo test

// I test Rust del guscio. Corsa vera senza sonda: exit 0 e ogni riga `test …` a `ok` (un binario che
// abortisce non stampa le righe dei test non finiti: lo dice l'exit code). Un test ignorato è rosso,
// anche col motivo (`test x ... ignored, <motivo>`, che esce con exit 0). Ogni riga che comincia con
// `test ` e non è il riepilogo deve essere riconosciuta: una forma che il riconoscitore non conosce è
// rossa, invece di sparire dal conto. Poi la sonda, un test d'integrazione (cargo raccoglie da sé
// `shell/tests/*.rs`) eseguito da solo con `--test`, che deve fallire. Dopo il build: il guscio
// incorpora dist/.
const cartellaTestCargo = "shell/tests";
const nomeTestSonda = "sonda_del_collaudo_deve_fallire";
const comandoCargo = ["cargo", "test", "--no-fail-fast", "--manifest-path", "shell/Cargo.toml"];

// Il nome può contenere spazi (`x - should panic`, i test della documentazione); l'esito è la prima
// parola dopo `...`, seguita al più da `, <motivo>`.
const rigaTest = /^test (.+?) \.\.\. (\S+?)(?:, .*)?\s*$/;

function righeTest(uscita: string): { nome: string; esito: string }[] {
  return uscita
    .split(/\r?\n/)
    .filter((r) => r.startsWith("test ") && !r.startsWith("test result:"))
    .map((r) => {
      const m = r.match(rigaTest);
      return m ? { nome: m[1]!, esito: m[2]! } : { nome: r.trim(), esito: "riga non riconosciuta" };
    });
}

async function portaCargo(): Promise<void> {
  const vera = await esegui(comandoCargo);
  const vere = righeTest(vera.uscita);
  const problemi = [
    ...vere.filter((p) => p.esito !== "ok").map((p) => `test non verde: ${p.nome} (${p.esito})`),
    ...(vera.codice !== 0 ? [`exit ${vera.codice}: ${[...vera.uscita.matchAll(/^error.*$/gm)].map((m) => m[0]).join(" · ") || "dettaglio nel log"}`] : []),
    ...(vere.length === 0 ? ["nessun test vero eseguito"] : []),
  ];
  if (problemi.length > 0) rosso("cargo test", problemi.join("; "));

  // Controllo positivo, in una corsa a parte.
  const cartella = join(radice, cartellaTestCargo);
  const creata = !existsSync(cartella);
  mkdirSync(cartella, { recursive: true });
  const contenuto = `#[test]\nfn ${nomeTestSonda}() {\n    assert_eq!(1, 2);\n}\n`;
  const sonda = await conSonda(`${cartellaTestCargo}/__sonda__.rs`, contenuto, () => esegui([...comandoCargo, "--test", "__sonda__"])).finally(() => {
    if (creata) rmSync(cartella, { recursive: true, force: true });
  });
  const dellaSonda = righeTest(sonda.uscita);
  if (sonda.codice === 0 || dellaSonda.length !== 1 || dellaSonda[0]!.nome !== nomeTestSonda || dellaSonda[0]!.esito !== "FAILED")
    rosso("cargo test", `controllo positivo SPENTO: la corsa della sonda (exit ${sonda.codice}) non ha il solo test sonda fallito`);
  riga(`PORTA cargo test: VERDE | exit 0, ogni test ok | controllo positivo acceso (corsa a parte: exit ${sonda.codice}, 1 fallimento, la sonda) | test eseguiti: ${vere.length}`);
}

// --------------------------------------------------------------------------------------- playwright

// Dopo il build: l'anteprima serve dist/. Il controllo positivo è uno spec sonda che fallisce in ogni
// progetto eseguito (2 bersagli per motore), quindi esattamente un fallimento per progetto del modo, tutti suoi.
// I nomi dei progetti sono scritti qui e non letti dalla configurazione, che altrimenti si confronterebbe con
// sé stessa.
const fileSondaPlaywright = "__sonda__.e2e.ts";
const sondaPlaywright = `e2e/${fileSondaPlaywright}`;
const nomiProgettiAttesi = ["chromium-sviluppo", "chromium-anteprima", "webkit-sviluppo", "webkit-anteprima"];
// I progetti che ogni modo esegue.
const progettiDelModo = { predefinito: ["chromium-sviluppo", "chromium-anteprima"], completo: nomiProgettiAttesi } as const;
const modo = completo ? "completo" : "predefinito";
const progettiEseguitiAttesi: readonly string[] = progettiDelModo[modo];

/** I progetti eseguiti contro quelli del modo, nei due versi: un motore che corre dove non deve, o che manca. */
function problemiDeiProgetti(eseguiti: readonly string[], attesi: readonly string[]): string[] {
  const inPiu = eseguiti.filter((n) => !attesi.includes(n));
  const mancanti = attesi.filter((n) => !eseguiti.includes(n));
  return [
    ...(inPiu.length > 0 ? [`eseguiti e non del modo: ${JSON.stringify(inPiu)}`] : []),
    ...(mancanti.length > 0 ? [`del modo e non eseguiti: ${JSON.stringify(mancanti)}`] : []),
  ];
}

const motoriIn = (progetti: readonly string[]) => [...new Set(progetti.map((p) => p.split("-")[0]!))];

type ProvaPlaywright = { file: string; titolo: string; progetto: string; stato: string; durata: number; limite: number };
type SuitePlaywright = {
  suites?: SuitePlaywright[];
  specs?: { file: string; title: string; tests: { projectName: string; status: string; timeout: number; results: { duration: number }[] }[] }[];
};

function proveDi(suite: SuitePlaywright): ProvaPlaywright[] {
  const proprie = (suite.specs ?? []).flatMap((s) =>
    s.tests.map((t) => ({
      file: s.file,
      titolo: s.title,
      progetto: t.projectName,
      stato: t.status,
      durata: Math.max(0, ...t.results.map((r) => r.duration)),
      limite: t.timeout,
    })),
  );
  return [...proprie, ...(suite.suites ?? []).flatMap(proveDi)];
}

/** Lo stesso comando per l'elenco e per la corsa vera: i progetti li sceglie il modo. */
const comandoPlaywright = [process.execPath, "--bun", "playwright", "test", ...progettiEseguitiAttesi.flatMap((p) => ["--project", p])];

/** La prima porta, in pochi secondi e senza server: l'elenco delle prove (`--list`) col comando della corsa vera.
 * Dice subito se il modo sceglie i progetti giusti e se gli spec e le loro prove sono quelli dichiarati in
 * `proveAttesePerSpec`: uno spec nuovo non dichiarato fa rosso qui, non dopo la corsa intera. Controllo positivo dei
 * progetti a ogni corsa: i progetti dell'altro modo accendono il messaggio del loro ramo. */
async function portaElenco(): Promise<void> {
  const report = join(cartellaLog, "playwright-elenco.json");
  rmSync(report, { force: true });
  const esito = await esegui([...comandoPlaywright, "--list", "--reporter=json"], { PLAYWRIGHT_JSON_OUTPUT_FILE: report });
  if (esito.codice !== 0 || !existsSync(report)) rosso("elenco", `exit ${esito.codice}, report json ${existsSync(report) ? "presente" : "assente"} (dettaglio nel log)`);
  const dati = JSON.parse(readFileSync(report, "utf8")) as { suites: SuitePlaywright[]; errors: { message?: string }[] };
  if (dati.errors.length > 0) rosso("elenco", `errori dell'elenco: ${dati.errors.map((errore) => errore.message ?? "?").join("; ")}`);
  const prove = dati.suites.flatMap(proveDi);
  const progetti = [...new Set(prove.map((p) => p.progetto))];
  const deiProgetti = problemiDeiProgetti(progetti, progettiEseguitiAttesi);
  if (deiProgetti.length > 0) rosso("elenco", `progetti elencati diversi dal modo ${modo}: ${deiProgetti.join("; ")}`);
  const sondeDelModo = [
    { ramo: "WebKit nel modo predefinito", attesa: "eseguiti e non del modo", problemi: problemiDeiProgetti(progettiDelModo.completo, progettiDelModo.predefinito) },
    { ramo: "WebKit assente nel modo completo", attesa: "del modo e non eseguiti", problemi: problemiDeiProgetti(progettiDelModo.predefinito, progettiDelModo.completo) },
  ];
  for (const s of sondeDelModo)
    if (!s.problemi.some((p) => p.startsWith(s.attesa)))
      rosso("elenco", `controllo positivo dei progetti SPENTO sul ramo «${s.ramo}»: nessun «${s.attesa}» fra ${JSON.stringify(s.problemi)}`);
  const elencate = new Map<string, number>();
  for (const p of prove) elencate.set(`${p.file} ${p.progetto}`, (elencate.get(`${p.file} ${p.progetto}`) ?? 0) + 1);
  const suDisco = readdirSync(join(radice, "e2e")).filter((f) => f.endsWith(".e2e.ts") && f !== fileSondaPlaywright).sort();
  const problemi = problemiDegliSpec(elencate, progetti, suDisco);
  if (problemi.length > 0) rosso("elenco", `spec o prove diversi dall'atteso: ${problemi.join("; ")}`);
  const sonde = sondeDegliSpec("elenco", elencate, progetti, suDisco);
  // Le prove fuori da un bersaglio, per titolo; il controllo positivo dichiara fuori un'altra prova dello stesso spec.
  const escluse = problemiDelleEscluse(prove);
  if (escluse.length > 0) rosso("elenco", `prove fuori da un bersaglio diverse da quelle dichiarate: ${escluse.join("; ")}`);
  const [specFuori, fuori] = Object.entries(proveFuoriDalBersaglio)[0]!;
  const altraProva = prove.find((p) => p.file === specFuori && !fuori.titoli.some((t) => p.titolo.startsWith(t)))!.titolo;
  const sondaEscluse = problemiDelleEscluse(prove, { [specFuori]: { ...fuori, titoli: [altraProva] } });
  if (!sondaEscluse.some((p) => p.includes("non dichiarate")) || !sondaEscluse.some((p) => p.includes("dichiarate fuori")))
    rosso("elenco", `controllo positivo delle prove fuori da un bersaglio SPENTO: ${JSON.stringify(sondaEscluse)}`);
  riga(
    `PORTA elenco: VERDE | modo ${modo}: progetti ${progetti.join(", ")} | ${prove.length} prove elencate (${progetti.map((p) => `${p} ${prove.filter((x) => x.progetto === p).length}`).join(", ")}), spec come l'atteso, le prove fuori da un bersaglio per titolo (${Object.values(proveFuoriDalBersaglio).flatMap((x) => x.titoli).length}; controllo positivo acceso: ${sondaEscluse.length} problemi con un'altra prova dichiarata) | controllo positivo dei progetti acceso sui due rami (${sondeDelModo.map((s) => s.ramo).join("; ")}) | controllo positivo degli spec acceso sui tre rami (${sonde})`,
  );
}

/** Il controllo positivo del confronto degli spec, una sonda per ciascuno dei tre rami, e ognuna deve accendere il SUO
 * messaggio: prove in meno, un file su disco mancante o in più, uno spec eseguito e non atteso (per esempio in una
 * sottocartella, che il confronto col disco non vede). Restituisce i conteggi per la riga della porta. */
function sondeDegliSpec(porta: string, osservate: ReadonlyMap<string, number>, progetti: readonly string[], suDisco: readonly string[]): string {
  const primoSpec = Object.keys(proveAttesePerSpec)[0]!;
  const sonde = [
    { ramo: "prove in meno", attesa: "prove invece di", problemi: problemiDegliSpec(new Map([...osservate].filter(([k]) => !k.startsWith(`${primoSpec} `))), progetti, suDisco) },
    { ramo: "file su disco", attesa: "su disco:", problemi: problemiDegliSpec(osservate, progetti, [...suDisco.filter((f) => f !== primoSpec), "__sonda_in_piu__.e2e.ts"]) },
    { ramo: "spec non atteso", attesa: "spec eseguiti e non attesi", problemi: problemiDegliSpec(new Map([...osservate, [`sotto/__sonda__.e2e.ts ${progetti[0]}`, 1]]), progetti, suDisco) },
  ];
  for (const s of sonde)
    if (!s.problemi.some((p) => p.includes(s.attesa)))
      rosso(porta, `controllo positivo degli spec SPENTO sul ramo «${s.ramo}»: nessun «${s.attesa}» fra ${JSON.stringify(s.problemi)}`);
  return sonde.map((s) => `${s.ramo}: ${s.problemi.length}`).join(", ");
}

async function portaPlaywright(): Promise<void> {
  const report = join(cartellaLog, "playwright.json");
  rmSync(report, { force: true });
  const contenuto = `import { expect, test } from "@playwright/test";\ntest(${JSON.stringify(nomeProvaSonda)}, () => {\n  expect(1).toBe(2);\n});\n`;
  const esito = await conSonda(sondaPlaywright, contenuto, () =>
    esegui([...comandoPlaywright, "--reporter=json"], { PLAYWRIGHT_JSON_OUTPUT_FILE: report }),
  );
  if (!existsSync(report)) rosso("playwright", "nessun report json: la suite non è partita");
  const dati = JSON.parse(readFileSync(report, "utf8")) as {
    config: { projects: { name: string }[] };
    suites: SuitePlaywright[];
    errors: { message?: string }[];
  };
  // Errori fuori dalle prove (un server che non parte, un file che non si carica).
  if (dati.errors.length > 0) rosso("playwright", `errori del giro: ${dati.errors.map((errore) => errore.message ?? "?").join("; ")}`);

  // I progetti della configurazione per elementi, nei due versi, più il numero (un nome ripetuto).
  const configurati = dati.config.projects.map((p) => p.name);
  const mancanti = nomiProgettiAttesi.filter((n) => !configurati.includes(n));
  const inattesi = configurati.filter((n) => !nomiProgettiAttesi.includes(n));
  if (mancanti.length > 0 || inattesi.length > 0 || configurati.length !== nomiProgettiAttesi.length)
    rosso("playwright", `progetti configurati diversi dai ${nomiProgettiAttesi.length} attesi: mancanti ${JSON.stringify(mancanti)}, inattesi ${JSON.stringify(inattesi)}, in tutto ${configurati.length}`);

  const prove = dati.suites.flatMap(proveDi);
  // I progetti ESEGUITI (dalle prove, sonda compresa) contro quelli del modo (il controllo positivo è nella porta
  // dell'elenco).
  const progetti = [...new Set(prove.map((p) => p.progetto))];
  const deiProgetti = problemiDeiProgetti(progetti, progettiEseguitiAttesi);
  if (deiProgetti.length > 0) rosso("playwright", `progetti eseguiti diversi dal modo ${modo}: ${deiProgetti.join("; ")}`);
  const dellaSonda = prove.filter((p) => p.file.endsWith(fileSondaPlaywright));
  const vere = prove.filter((p) => !p.file.endsWith(fileSondaPlaywright));
  const vereNonVerdi = vere.filter((p) => p.stato !== "expected");
  if (vereNonVerdi.length > 0)
    rosso("playwright", `prove non verdi: ${vereNonVerdi.map((p) => `[${p.progetto}] ${p.titolo} (${p.stato})`).join("; ")}`);

  const sondaFallita = new Set(dellaSonda.filter((p) => p.stato === "unexpected").map((p) => p.progetto));
  if (esito.codice === 0 || dellaSonda.length !== progettiEseguitiAttesi.length || sondaFallita.size !== progettiEseguitiAttesi.length)
    rosso("playwright", `controllo positivo SPENTO: la sonda è fallita in ${sondaFallita.size} progetti su ${progettiEseguitiAttesi.length}`);

  // Denominatore: in ogni progetto le prove vere attese (le stesse, meno quelle fuori dal suo bersaglio).
  const perProgetto = progetti.map((nome) => vere.filter((p) => p.progetto === nome).length);
  if (perProgetto[0] === 0 || perProgetto.some((n, i) => n !== proveAtteseNel(progetti[i]!)))
    rosso("playwright", `prove vere per progetto diverse dall'atteso o assenti: ${progetti.map((n, i) => `${n}=${perProgetto[i]} (attese ${proveAtteseNel(n)})`).join(", ")}`);

  // Gli spec per elementi, nei due versi, contro l'atteso e contro i file su disco; e le prove di ogni spec
  // in ogni progetto. Il controllo positivo ha una sonda per ciascuno dei tre rami del confronto, e ognuna
  // deve accendere il SUO messaggio: prove osservate in meno, un file su disco mancante o in più, uno spec
  // eseguito e non atteso (per esempio in una sottocartella, che il confronto col disco non vede).
  const osservate = new Map<string, number>();
  for (const p of vere) osservate.set(`${p.file} ${p.progetto}`, (osservate.get(`${p.file} ${p.progetto}`) ?? 0) + 1);
  const suDisco = readdirSync(join(radice, "e2e")).filter((f) => f.endsWith(".e2e.ts") && f !== fileSondaPlaywright).sort();
  const problemi = problemiDegliSpec(osservate, progetti, suDisco);
  if (problemi.length > 0) rosso("playwright", `spec o prove diversi dall'atteso: ${problemi.join("; ")}`);
  const sonde = sondeDegliSpec("playwright", osservate, progetti, suDisco);

  // I margini di tempo (la regola di `playwright.config.ts`: il limite è almeno quattro volte la durata): le prove
  // più vicine al loro limite vanno nel log, la più vicina nella riga della porta. Si stampano, non fermano.
  const strette = [...vere].sort((a, b) => b.durata / b.limite - a.durata / a.limite);
  for (const p of strette.slice(0, 8)) log(`margine: ${(p.durata / 1000).toFixed(1)} s su ${p.limite / 1000} s (${Math.round((100 * p.durata) / p.limite)}%) [${p.progetto}] ${p.file} › ${p.titolo}`);
  const stretta = strette[0]!;
  const provati = motoriIn(progetti);
  const nonProvati = motoriIn(nomiProgettiAttesi).filter((m) => !provati.includes(m));
  riga(
    `PORTA playwright: VERDE | modo ${modo}: motori provati ${provati.join(", ")}${nonProvati.length > 0 ? `, NON provati ${nonProvati.join(", ")}` : ""} | ` +
      `controllo positivo acceso (${dellaSonda.length} fallimenti, la sonda, uno per progetto) | prove vere: ${progetti.map((n, i) => `${n} ${perProgetto[i]}`).join(", ")} = ${vere.length} verdi (fuori da un bersaglio: ${Object.entries(proveFuoriDalBersaglio).map(([f, x]) => `${f} ${x.prove} su ${x.bersaglio}`).join(", ") || "nessuna"}) | ` +
      `margine più stretto ${Math.round((100 * stretta.durata) / stretta.limite)}% del limite (${(stretta.durata / 1000).toFixed(1)} s su ${stretta.limite / 1000} s, [${stretta.progetto}] ${stretta.file}) | ` +
      `spec ${Object.keys(proveAttesePerSpec).length} come l'atteso e su disco (${Object.entries(proveAttesePerSpec).map(([f, n]) => `${f} ${n}`).join(", ")}) | controllo positivo degli spec acceso sui tre rami (${sonde})`,
  );
}

// Gli spec attesi e le prove di ciascuno, in ogni progetto: scritti qui, non letti dal report, che
// altrimenti si confronterebbe con sé stesso. Uno spec tolto, rinominato fuori dal pattern o con una prova
// in meno fa rosso.
const proveAttesePerSpec: Record<string, number> = {
  "barra.e2e.ts": 14,
  "casi.e2e.ts": 7,
  "chiamate.e2e.ts": 7,
  "codice.e2e.ts": 11,
  "colonne.e2e.ts": 4,
  "colori.e2e.ts": 3,
  "costruzione.e2e.ts": 8,
  "dati.e2e.ts": 2,
  "disegno.e2e.ts": 9,
  "domanda.e2e.ts": 3,
  "editor-dei-cicli.e2e.ts": 7,
  "editor.e2e.ts": 5,
  "esecuzione.e2e.ts": 12,
  "esporta.e2e.ts": 5,
  "espressioni.e2e.ts": 6,
  "finestra.e2e.ts": 9,
  "fluida.e2e.ts": 1,
  "flowchart-in-svg.e2e.ts": 2,
  "funzioni.e2e.ts": 4,
  "guida.e2e.ts": 5,
  "impostazioni.e2e.ts": 13,
  "lavoro-al-sicuro.e2e.ts": 15,
  "libreria.e2e.ts": 2,
  "lingua.e2e.ts": 5,
  "mac.e2e.ts": 3,
  "modifica-dati.e2e.ts": 10,
  "modifica.e2e.ts": 7,
  "parametri.e2e.ts": 3,
  "pila-lunga.e2e.ts": 2,
  "programmi-pesanti.e2e.ts": 20,
  "scelta.e2e.ts": 3,
  "scorrimento.e2e.ts": 1,
  "stampa.e2e.ts": 8,
  "progetto-file.e2e.ts": 12,
  "tabella.e2e.ts": 9,
  "trascina.e2e.ts": 4,
  "valori-iniziali.e2e.ts": 4,
  "watch.e2e.ts": 7,
};

/** Le prove che un bersaglio (`sviluppo`, `anteprima`: la fine del nome del progetto) non corre, per spec: quelle con
 * l'etichetta che `playwright.config.ts` esclude da quel bersaglio, per un difetto noto che lì le fa fallire a
 * intermittenza. Non sono prove saltate: per quel bersaglio non ci sono, e l'atteso le toglie, nei suoi progetti soli. */
const proveFuoriDalBersaglio: Readonly<Record<string, { bersaglio: string; prove: number; titoli: readonly string[]; ragione: string }>> = {
  "progetto-file.e2e.ts": {
    bersaglio: "anteprima",
    prove: 1,
    titoli: ["ogni finestra (Proprietà, Impostazioni, Esempi, errori, Nuovo progetto,"],
    ragione: "«ogni finestra trattiene il fuoco»: nella corsa intera, sul build di produzione, il menu che si chiude riprende il fuoco per un istante mentre la finestra aperta da lui lo prende",
  },
};

/** Le prove che mancano davvero da un bersaglio, per titolo: per ogni progetto di quel bersaglio, quelle che lo stesso
 * motore ha sull'altro e lui no, confrontate con l'inizio dei titoli dichiarati. Il conto per spec non basta: l'etichetta
 * spostata su un'altra prova dello stesso spec lascia il numero uguale. */
function problemiDelleEscluse(prove: readonly ProvaPlaywright[], fuoriDalBersaglio = proveFuoriDalBersaglio): string[] {
  const problemi: string[] = [];
  const titoliDi = (f: string, progetto: string) => new Set(prove.filter((p) => p.file === f && p.progetto === progetto).map((p) => p.titolo));
  for (const [f, fuori] of Object.entries(fuoriDalBersaglio))
    for (const progetto of new Set(prove.map((p) => p.progetto))) {
      if (!progetto.endsWith(`-${fuori.bersaglio}`)) continue;
      const altri = [...new Set(prove.map((p) => p.progetto))].filter((x) => x !== progetto && x.startsWith(progetto.slice(0, -fuori.bersaglio.length)));
      for (const altro of altri) {
        const qui = titoliDi(f, progetto);
        const mancanti = [...titoliDi(f, altro)].filter((t) => !qui.has(t));
        const attese = (t: string) => fuori.titoli.some((inizio) => t.startsWith(inizio));
        const fuoriPosto = mancanti.filter((t) => !attese(t));
        const assenti = fuori.titoli.filter((inizio) => !mancanti.some((t) => t.startsWith(inizio)));
        if (fuoriPosto.length > 0 || assenti.length > 0)
          problemi.push(`${f} su ${progetto} rispetto a ${altro}: mancano ${JSON.stringify(fuoriPosto)} non dichiarate, ci sono ${JSON.stringify(assenti)} dichiarate fuori`);
      }
    }
  return problemi;
}

/** Le prove attese di uno spec in un progetto. */
function proveAttese(f: string, progetto: string): number {
  const fuori = Object.hasOwn(proveFuoriDalBersaglio, f) ? proveFuoriDalBersaglio[f]! : undefined;
  return proveAttesePerSpec[f]! - (fuori !== undefined && progetto.endsWith(`-${fuori.bersaglio}`) ? fuori.prove : 0);
}

/** Le prove attese in un progetto, sommate sugli spec. */
const proveAtteseNel = (progetto: string) => Object.keys(proveAttesePerSpec).reduce((n, f) => n + proveAttese(f, progetto), 0);

function problemiDegliSpec(osservate: ReadonlyMap<string, number>, progetti: readonly string[], suDisco: readonly string[]): string[] {
  const attesi = Object.keys(proveAttesePerSpec).sort();
  const problemi: string[] = [];
  const nonSuDisco = attesi.filter((f) => !suDisco.includes(f));
  const nonAttesi = suDisco.filter((f) => !attesi.includes(f));
  if (nonSuDisco.length > 0 || nonAttesi.length > 0) problemi.push(`su disco: mancanti ${JSON.stringify(nonSuDisco)}, inattesi ${JSON.stringify(nonAttesi)}`);
  const fuoriSenzaSpec = Object.keys(proveFuoriDalBersaglio).filter((f) => !attesi.includes(f));
  if (fuoriSenzaSpec.length > 0) problemi.push(`prove fuori da un bersaglio di spec non attesi: ${JSON.stringify(fuoriSenzaSpec)}`);
  for (const progetto of progetti) {
    for (const f of attesi) {
      const n = osservate.get(`${f} ${progetto}`) ?? 0;
      if (n !== proveAttese(f, progetto)) problemi.push(`[${progetto}] ${f}: ${n} prove invece di ${proveAttese(f, progetto)}`);
    }
  }
  const eseguiti = [...new Set([...osservate.keys()].map((k) => k.slice(0, k.lastIndexOf(" "))))];
  const inattesi = eseguiti.filter((f) => !attesi.includes(f));
  if (inattesi.length > 0) problemi.push(`spec eseguiti e non attesi: ${JSON.stringify(inattesi)}`);
  return problemi;
}

// ---------------------------------------------------------------------------------------- selettori

// I selettori delle prove che cercano un testo per sottostringa (`selettori.ts`: un nome di `getByRole` o un testo di
// `getByText` e simili senza `exact`), in `e2e/` e in `strumenti/` (le prove sul prodotto cercano anche loro
// l'interfaccia): devono essere zero. Controllo positivo nello stesso giro: una sonda in `e2e/` (fuori dal pattern
// degli spec) con un selettore per specie, che il giro deve trovare tutti e due nel file della sonda e solo lì.
const sondaSelettori = join("e2e", "__sonda__selettori.ts");

function fileDeiSelettori(cartella: string): string[] {
  const fuori: string[] = [];
  for (const voce of readdirSync(cartella, { withFileTypes: true })) {
    const pieno = join(cartella, voce.name);
    if (voce.isDirectory()) fuori.push(...fileDeiSelettori(pieno));
    else if (voce.name.endsWith(".ts")) fuori.push(relative(radice, pieno));
  }
  return fuori.sort();
}

function selettoriPerSottostringa(): { file: number; chiamate: number; trovate: ReturnType<typeof senzaExact> } {
  const file = [...fileDeiSelettori(join(radice, "e2e")), ...fileDeiSelettori(join(radice, "strumenti"))];
  const tutte = file.flatMap((f) => chiamate(readFileSync(join(radice, f), "utf8"), f));
  return { file: file.length, chiamate: tutte.length, trovate: senzaExact(tutte) };
}

async function portaSelettori(): Promise<void> {
  const vero = selettoriPerSottostringa();
  if (vero.trovate.length > 0)
    rosso("selettori", `${vero.trovate.length} cercano per sottostringa (manca \`exact\`): ${vero.trovate.map((c) => `${c.file}:${c.riga} ${c.metodo}(${c.argomenti.replace(/\s+/g, " ").slice(0, 80)})`).join("; ")}`);
  const sonda = `// sonda del collaudo\npage.getByRole("button", { name: it.salva });\npage.getByText(it.premessa);\n`;
  const conLaSonda = await conSonda(sondaSelettori, sonda, async () => selettoriPerSottostringa());
  const viste = conLaSonda.trovate.map((c) => `${c.file}:${c.riga} ${c.metodo}`);
  const attese = [`${sondaSelettori}:2 getByRole`, `${sondaSelettori}:3 getByText`];
  if (JSON.stringify(viste) !== JSON.stringify(attese)) rosso("selettori", `controllo positivo SPENTO: con la sonda trovate ${JSON.stringify(viste)} invece di ${JSON.stringify(attese)}`);
  if (vero.file === 0 || vero.chiamate === 0) rosso("selettori", `denominatore a zero: ${vero.file} file, ${vero.chiamate} chiamate`);
  riga(`PORTA selettori: VERDE | nessun selettore per sottostringa | controllo positivo acceso (la sonda: ${viste.length} su ${attese.length}, nel suo file) | file guardati: ${vero.file}, chiamate dei metodi di ricerca: ${vero.chiamate}`);
}

/** I conteggi del corpus dichiarati uguali a quelli del disco (`strumenti/corpus.ts`): un corpus cambiato dopo l'ultima
 * conferma sposta gli attesi delle prove che lo percorrono, anche in Playwright, che corre per ultima. Prima della corsa
 * lunga, in pochi secondi. Controllo positivo: i fatti dichiarati con l'impronta cambiata danno una differenza. */
function portaCorpus(): void {
  const misurati = misuraIlCorpus();
  const d = differenze(leggiIConteggi().fatti, misurati);
  if (d.length > 0)
    rosso(
      "corpus",
      `il corpus è cambiato dopo l'ultima conferma dei suoi conteggi (${d.join("; ")}): prima della corsa lunga \`bun run conferma-corpus\`, che esegue le prove che lo leggono e, se verdi, riscrive i conteggi`,
    );
  const altra = `${misurati.impronta.startsWith("0") ? "1" : "0"}${misurati.impronta.slice(1)}`;
  const sonda = differenze({ ...misurati, impronta: altra }, misurati);
  if (sonda.length !== 1) rosso("corpus", `controllo positivo SPENTO: l'impronta cambiata dà ${sonda.length} differenze invece di una`);
  if (misurati.file.totale === 0) rosso("corpus", "denominatore a zero: nessun file nel corpus");
  riga(`PORTA corpus: VERDE | i conteggi confermati sono quelli del disco: ${JSON.stringify(misurati.file)}, tipi ${JSON.stringify(misurati.tipi)} | controllo positivo acceso (l'impronta cambiata: 1 differenza)`);
}

// -------------------------------------------------------------------------------------------- giro

log(`=== INIZIO COLLAUDO ${new Date().toISOString()} · bun ${Bun.version} · modo ${modo} ===`);
console.log(`collaudo: log in ${relative(radice, fileLog)}`);
const rimaste = togliSondeRimaste(radice);
if (rimaste.length > 0) riga(`sonde rimaste da un giro interrotto, tolte: ${rimaste.join(", ")}`);

try {
  await portaElenco();
  await portaSelettori();
  portaCorpus();
  if (soloElenco) {
    // Un esito suo, non quello del collaudo: chi legge «ESITO: VERDE» crede che le prove siano passate.
    riga(`ESITO: SOLO ELENCO, VERDE — controllato l'elenco delle prove del modo ${modo} (progetti e spec), i selettori e i conteggi del corpus, non il collaudo: nessuna prova eseguita`);
    log("=== FINE COLLAUDO ===");
    process.exit(0);
  }
  for (const p of porteTsc) await portaTsc(p);
  await portaTest();
  await portaCasi();
  await portaDifferenziale();
  await portaBuild();
  await portaCargo();
  await portaPlaywright();
  riga(`ESITO: VERDE (porte: elenco, selettori, corpus, 3 tsc, bun test, casi, differenziale, build, cargo test, playwright nel modo ${modo}: ${progettiEseguitiAttesi.join(", ")})`);
  log("=== FINE COLLAUDO ===");
} catch (e) {
  riga(e instanceof PortaRossa ? e.message : `ERRORE DEL COLLAUDO: ${e instanceof Error ? e.stack : String(e)}`);
  riga("ESITO: ROSSO");
  log("=== FINE COLLAUDO ===");
  process.exit(1);
}
