// Il pacchetto della release, solo Windows: `bun run pacchetto --testi <cartella> [--prova [--senza-build]]`. Compone
// due archivi dallo stesso albero: quello di AlgoDesign (1–6) e quello aggiuntivo dello strumento a riga di comando (7–10).
//
// 1. ALBERO: il commit da cui nasce il pacchetto. Con file modificati o nuovi rispetto al commit, o con un commit che non
//    ha l'etichetta `v<versione>`, è rosso, se non con `--prova`: il pacchetto si dice allora di prova, non è una
//    release, e va in `dist/prova/` (mai sopra una release).
//    Lo stato si rilegge dopo il build e le licenze (un comando può riscrivere un file tracciato, come `Cargo.lock`):
//    diverso da quello di prima, è rosso.
// 2. BUILD: cancella l'uscita del build dell'interfaccia (`dist/` dell'app, che Tauri incorpora tutta) e l'eseguibile
//    di prima (così Cargo lo ricollega anche quando non c'è nulla da ricompilare), e costruisce l'eseguibile di release
//    (`bun tauri build --no-bundle`) coi percorsi della macchina rimappati (`--remap-path-prefix` per la cartella di
//    Cargo, il profilo dell'utente e il repository); con `--senza-build`, ammesso solo con `--prova`, prende quello che
//    c'è. Le proprietà dell'eseguibile: la versione (ProductVersion) è quella di `package.json`, la società
//    (CompanyName) e il copyright (LegalCopyright) quelli di `tauri.conf.json`.
// 3. PERCORSI: nei byte dell'eseguibile non c'è il profilo dell'utente, né la cartella di Cargo, né il repository, né,
//    sulle macchine delle GitHub Actions, le loro cartelle temporanea e degli strumenti (`RUNNER_TEMP`,
//    `RUNNER_TOOL_CACHE`), in ASCII e in UTF-16. Controllo positivo: lo stesso rilevatore trova la cartella di Cargo nel
//    file delle dipendenze di `tokio` che il build lascia in `target/release/deps` (un file prodotto, che porta i
//    percorsi veri).
// 4. LICENZE: compone `LICENZE-DI-TERZE-PARTI.txt` per Windows con `licenze.ts` (che cosa contiene e da dove viene è
//    scritto lì).
// 5. CARTELLA: `dist/<versione>/` alla radice del repository (`dist/prova/<versione>/` con `--prova`), con le voci di `elencoDelPacchetto`; i testi per l'utente
//    dalla cartella di `--testi`, tracciati dal repository (una cartella fuori, come le note di una versione di prima
//    rimaste fra i documenti di lavoro, è rossa), con `{{versione}}` e `{{data}}` sostituiti (un segnaposto rimasto, un nome
//    fra due graffe doppie, è rosso; il valore di una matrice come `{{1, 2}, {3, 4}}` no, con le sue sonde); le guide per lo
//    studente, la guida ad «Accademico» e quella dello strumento da `docs/` del repository, così come sono (valgono per la versione del prodotto; un segnaposto è rosso); `README.md` e
//    `LEGGIMI.md` dalla radice, così come sono, rossi se non dicono la cartella della versione (`AlgoDesign-<versione>`);
//    `CHANGELOG.md`
//    dalla radice del repository, così com'è: senza la voce della versione («## <versione>, »), o con un
//    `SEGNAPOSTO` rimasto, è rosso. Le voci
//    composte si confrontano con l'elenco nei due versi. Controllo positivo: lo stesso confronto, con una voce tolta e
//    una in più, le dice tutte e due.
// 6. ZIP: `dist/AlgoDesign-<versione>-windows-x64.zip`, con dentro la cartella `AlgoDesign-<versione>`, fatto col `tar`
//    di Windows. Estratto in una cartella temporanea due volte, col `tar` e con la libreria degli zip di .NET (un
//    lettore diverso da quello che lo ha scritto), ha le voci dell'elenco e ogni file ha l'impronta di quello della
//    cartella. Accanto, `<zip>.sha256` con l'impronta dello zip.
// 7. STRUMENTO: l'eseguibile a sé dello strumento a riga di comando (`bun build --compile ./strumenti/algodesign-tools.ts`), in
//    una cartella temporanea nuova, con la lettura di `.env` e di `bunfig.toml` della cartella di avvio spenta (Bun la fa
//    per predefinito) e le proprietà: il nome «AlgoDesign Tools», la versione coi tre numeri e uno zero (Bun non
//    accetta il suffisso: esce 1 e lascia lo stesso un eseguibile con le proprietà sue, quindi conta l'exit code), la
//    versione intera nella descrizione, la società e il copyright di `tauri.conf.json`. L'icona di AlgoDesign
//    (`shell/icons/icon.ico`, `--windows-icon`): ogni immagine dell'`.ico` dentro l'eseguibile, byte per byte; controllo
//    positivo, Bun non ne ha nessuna e l'eseguibile dell'app, se c'è, le ha tutte. I moduli del metafile del build
//    tutti del repository, fuori da `node_modules` (una libreria di altri vorrebbe la sua licenza); nei byte nessuno dei
//    percorsi della macchina di 3, con lo stesso rilevatore e lo stesso controllo positivo.
// 8. CARTELLA DELLO STRUMENTO: `dist/<versione>-tools/` (`dist/prova/…` con `--prova`) con le voci di
//    `elencoDelloStrumento`: i due testi brevi da `--testi` (tracciati, coi segnaposto sostituiti), la guida ad
//    «Accademico» e quella dello strumento da `docs/` (rosse se non dicono il nome dello zip dello strumento), le due licenze dalla radice e le
//    licenze di terze parti di `licenzeDelloStrumento` (`licenze.ts`). Il confronto nei due versi col controllo positivo.
// 9. ZIP DELLO STRUMENTO: `dist/AlgoDesign-Tools-<versione>-windows.zip`, con dentro la cartella
//    `AlgoDesign-Tools-<versione>`, con le prove di 6 e l'impronta accanto.
// 10. PROVA DELLO STRUMENTO: lo zip estratto in una cartella con uno spazio nel nome, l'eseguibile avviato da lì con un
//    PATH senza Bun: `-h` mostra il modo d'uso col nome dell'eseguibile; un'opzione sbagliata esce 2; un testo con un
//    errore esce 1 col messaggio e la riga, senza scrivere; i testi in «Accademico» dei cinque esempi forniti che ci
//    stanno (scritti a mano in `ui/genera/attesi-di-accademico.ts`), letti uno dopo l'altro in una sola libreria (`-o`,
//    poi `-l` e `-r`), danno le stesse righe e la stessa libreria, byte per byte, di `bun ./strumenti/algodesign-tools.ts accademico`;
//    `stampa` su un progetto del corpus, senza e con `--linguaggi`, scrive le stesse pagine, byte per byte, della stessa riga con Bun.
//    Le tracce: i nomi nuovi al primo livello di %APPDATA%, %LOCALAPPDATA%, %TEMP% (e %TMP%, se è un'altra cartella)
//    intorno ai soli avvii dell'eseguibile; controllo positivo, l'eseguibile che scrive la sua uscita in %TEMP%.
//
// Una cartella o uno zip della stessa versione si sostituiscono, ma la cartella solo se contiene le voci dell'elenco e
// `data` è vuota (chi ha avviato il programma da lì ci trova le sue preferenze: si cancellano a mano).
//
// Che cosa NON guarda:
// - che l'eseguibile di AlgoDesign parta e funzioni: lo prova `bun run prova-portabile`; dello strumento, solo ciò che
//   dice 10 (il lettore lo provano le sue prove);
// - delle tracce dello strumento, le scritture dentro cartelle che c'erano già nelle tre radici, e il registro;
// - che i testi per l'utente dicano il vero: si leggono;
// - ciò che le licenze non guardano (scritto in `licenze.ts`);
// - i file ignorati da git che entrano nel build (`node_modules`, la cache di Cargo): vengono dai lockfile tracciati,
//   che `bun install` e Cargo seguono, ma lo strumento non lo verifica;
// - nei byte dell'eseguibile, altri dati della macchina oltre ai percorsi nominati (un nome di computer, una data).
//
// Gli exit code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.

import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { delCorpus } from "../ui/genera/attesi-di-accademico";
import { dataMostrata } from "../ui/prodotto";
import {
  differenzeDallElenco,
  documentiDellaRadice,
  documentiDelPacchetto,
  elencoDelloStrumento,
  elencoDelPacchetto,
  fileDelleLicenze,
  guidaAdAccademico,
  guidaDelloStrumento,
  nomiDelloStrumento,
  nomiDelPacchetto,
  testiDelloStrumento,
  testiDelPacchetto,
} from "./elenco-del-pacchetto";
import { licenzeDelloStrumento, licenzeDiTerzeParti } from "./licenze";

const argomenti = process.argv.slice(2);
const posTesti = argomenti.indexOf("--testi");
const cartellaTesti = posTesti >= 0 ? argomenti[posTesti + 1] : undefined;
const altri = argomenti.filter((_, i) => i !== posTesti && i !== posTesti + 1);
const senzaBuild = altri.includes("--senza-build");
const prova = altri.includes("--prova");
// Senza build l'eseguibile non è legato al commit: solo per provare lo strumento.
if (cartellaTesti === undefined || cartellaTesti.startsWith("--") || altri.some((a) => a !== "--senza-build" && a !== "--prova") || new Set(altri).size !== altri.length || (senzaBuild && !prova)) {
  console.error(`uso: pacchetto --testi <cartella con ${[...testiDelPacchetto, ...Object.keys(testiDelloStrumento)].join(", ")}> [--prova [--senza-build]] (ricevuti: ${JSON.stringify(argomenti)})`);
  process.exit(2);
}

const radice = join(import.meta.dir, "..");
const repository = join(radice, "..");
const cartellaLog = join(radice, ".collaudo");
mkdirSync(cartellaLog, { recursive: true });
const fileLog = join(cartellaLog, `pacchetto-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);
const tar = "C:\\Windows\\System32\\tar.exe";

function log(testo: string): void {
  appendFileSync(fileLog, testo.endsWith("\n") ? testo : `${testo}\n`);
}

function riga(testo: string): void {
  console.log(testo);
  log(testo);
}

class Rosso extends Error {}

function rosso(clausola: string, motivo: string): never {
  throw new Rosso(`${clausola}: ROSSO — ${motivo}`);
}

async function esegui(cmd: string[], cwd = radice, ambiente: Record<string, string> = {}): Promise<{ codice: number; out: string; err: string }> {
  log(`$ ${cmd.join(" ")}${Object.keys(ambiente).length > 0 ? ` (con ${Object.keys(ambiente).join(", ")})` : ""}`);
  const proc = Bun.spawn({ cmd, cwd, env: { ...process.env, ...ambiente }, stdout: "pipe", stderr: "pipe" });
  const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  log(out.length > 20_000 ? `${out.slice(0, 20_000)}\n(… ${out.length} caratteri)` : out);
  log(err);
  log(`(exit ${codice})`);
  return { codice, out, err };
}

const impronta = (percorso: string) => createHash("sha256").update(readFileSync(percorso)).digest("hex");

const testoDelPackageJson = readFileSync(join(radice, "package.json"), "utf8");
const nomi = nomiDelPacchetto(testoDelPackageJson);
const dataDiRilascio: string = JSON.parse(testoDelPackageJson).dataDiRilascio;
// Un pacchetto di prova non va mai al posto di una release della stessa versione.
const dist = prova ? join(repository, "dist", "prova") : join(repository, "dist");
const cartella = join(dist, nomi.cartella);
const zip = join(dist, nomi.zip);
const configurazione = JSON.parse(readFileSync(join(radice, "shell", "tauri.conf.json"), "utf8")) as { bundle: { publisher?: string; copyright?: string } };
const nomiS = nomiDelloStrumento(testoDelPackageJson);
const cartellaDelloStrumento = join(dist, nomiS.cartella);
const zipDelloStrumento = join(dist, nomiS.zip);
const eseguibileS = "algodesign-tools.exe";
const data = dataMostrata(dataDiRilascio, "it");

/** Lo stato dell'albero: il commit e le righe di `git status`. */
async function statoDellAlbero(): Promise<{ commit: string; modificati: string[] }> {
  const commit = await esegui(["git", "-C", repository, "rev-parse", "HEAD"]);
  const stato = await esegui(["git", "-C", repository, "status", "--porcelain", "--untracked-files=all"]);
  if (commit.codice !== 0 || stato.codice !== 0) rosso("ALBERO", `git esce ${commit.codice} e ${stato.codice} (dettaglio nel log)`);
  return { commit: commit.out.trim(), modificati: stato.out.split("\n").filter((r) => r.trim() !== "") };
}

/** 1. Il commit e lo stato dell'albero; senza `--prova` il commit è quello dell'etichetta della versione (`v<versione>`
 * di `package.json`): un commit venuto dopo l'etichetta darebbe a Windows un albero diverso da quello che Mac e Linux
 * costruiscono dall'etichetta. */
async function albero(): Promise<{ descritto: string; prima: string }> {
  const { commit, modificati } = await statoDellAlbero();
  const etichetta = `v${JSON.parse(testoDelPackageJson).version}`;
  const etichette = await esegui(["git", "-C", repository, "tag", "--points-at", "HEAD"]);
  if (etichette.codice !== 0) rosso("ALBERO", `git tag esce ${etichette.codice} (dettaglio nel log)`);
  const etichettato = etichette.out.split("\n").map((r) => r.trim()).includes(etichetta);
  const descritto = `commit ${commit}${etichettato ? ` (${etichetta})` : ""}, ${modificati.length} file modificati o nuovi`;
  if (modificati.length > 0 && !prova) rosso("ALBERO", `${descritto} (${modificati.slice(0, 5).join("; ")}…): una release nasce da un commit; per provare lo strumento, --prova`);
  if (!etichettato && !prova) rosso("ALBERO", `${descritto}: HEAD non ha l'etichetta ${etichetta}, e una release nasce dal commit etichettato; per provare lo strumento, --prova`);
  riga(`ALBERO: ${modificati.length > 0 || !etichettato ? "DI PROVA" : "VERDE"} | ${descritto}`);
  return { descritto, prima: JSON.stringify({ commit, modificati }) };
}

/** Lo stato dell'albero dopo i comandi che possono scrivere nei file tracciati: lo stesso di prima. */
async function alberoUguale(prima: string, dopo: string): Promise<void> {
  const ora = await statoDellAlbero();
  if (JSON.stringify(ora) !== prima) rosso("ALBERO", `dopo ${dopo} lo stato è cambiato: prima ${prima}, ora ${JSON.stringify(ora)}`);
  riga(`ALBERO: invariato dopo ${dopo}`);
}

/** I percorsi della macchina da togliere dall'eseguibile: la cartella di Cargo, il profilo dell'utente, il repository e,
 * sulle macchine delle GitHub Actions, le loro cartelle temporanea e degli strumenti. */
const percorsiDellaMacchina = (() => {
  const casa = homedir();
  const cargo = process.env.CARGO_HOME ?? join(casa, ".cargo");
  const delleActions = [
    { nome: "la cartella temporanea delle Actions", percorso: process.env.RUNNER_TEMP, al: "/temp" },
    { nome: "la cartella degli strumenti delle Actions", percorso: process.env.RUNNER_TOOL_CACHE, al: "/strumenti" },
  ].filter((p): p is { nome: string; percorso: string; al: string } => p.percorso !== undefined && p.percorso !== "");
  // Fra due prefissi che coincidono vince l'ultimo: la cartella di Cargo, che sta nel profilo, va dopo.
  return [
    { nome: "il profilo dell'utente", percorso: casa, al: "/profilo" },
    { nome: "il repository", percorso: repository, al: "/algodesign" },
    ...delleActions,
    { nome: "la cartella di Cargo", percorso: cargo, al: "/cargo" },
  ];
})();
const cartellaDiCargo = percorsiDellaMacchina.find((p) => p.al === "/cargo")!;

/** Le proprietà date di un eseguibile di Windows (`VersionInfo`), nell'ordine; `null` se PowerShell non esce 0. */
async function proprieta(file: string, nomiDelleProprieta: readonly string[]): Promise<string[] | null> {
  const p = await esegui(["powershell", "-NoProfile", "-Command", `[Console]::OutputEncoding = [Text.Encoding]::UTF8; $v = (Get-Item -LiteralPath $env:ESEGUIBILE_DA_LEGGERE).VersionInfo; ${nomiDelleProprieta.map((x) => `$v.${x}`).join("; ")}`], radice, { ESEGUIBILE_DA_LEGGERE: file });
  return p.codice === 0 ? p.out.replace(/\r/g, "").split("\n").slice(0, nomiDelleProprieta.length) : null;
}

/** L'icona di AlgoDesign, la stessa dell'app (`tauri.conf.json`, `bundle.icon`). */
const icona = join(radice, "shell", "icons", "icon.ico");

/** Le immagini dell'`.ico` (la directory in testa, poi un blocco per misura) e, per ogni eseguibile, quante ne contiene
 * byte per byte: un'icona incorporata è fatta degli stessi blocchi. (I pixel dell'icona che Windows estrae da un
 * eseguibile non coincidono con quelli dell'`.ico` riletto da `System.Drawing`, anche con l'icona giusta: misurato.) */
function immaginiDellIcona(eseguibili: readonly string[]): { readonly misure: string[]; readonly dentro: number[] } {
  const ico = readFileSync(icona);
  const blocchi = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
    const e = 6 + 16 * i;
    const da = ico.readUInt32LE(e + 12);
    return { misura: `${ico[e] || 256}x${ico[e + 1] || 256}`, byte: ico.subarray(da, da + ico.readUInt32LE(e + 8)) };
  });
  const dentro = eseguibili.map((f) => {
    const b = readFileSync(f);
    return blocchi.filter((x) => b.indexOf(x.byte) >= 0).length;
  });
  return { misure: blocchi.map((b) => b.misura), dentro };
}

/** 2. L'eseguibile e le sue proprietà. */
async function eseguibile(): Promise<string> {
  const rilascio = join(radice, "shell", "target", "release", "algodesign.exe");
  if (senzaBuild) {
    if (!existsSync(rilascio)) rosso("BUILD", `--senza-build ma ${relative(radice, rilascio)} non esiste`);
  } else {
    // Tauri incorpora tutta la cartella del build dell'interfaccia: un file rimasto da un build vecchio ci finirebbe.
    rmSync(join(radice, "dist"), { recursive: true, force: true });
    // Senza l'eseguibile Cargo lo ricollega anche quando nessun sorgente è cambiato: la data che segue dice il build.
    rmSync(rilascio, { force: true });
    const inizio = Date.now();
    // I percorsi della macchina rimappati: senza, l'eseguibile porta quelli dei sorgenti delle librerie (i messaggi di
    // panico). Gli argomenti separati dal carattere 0x1f, come vuole Cargo, perché un percorso può avere spazi.
    const flags = percorsiDellaMacchina.map((p) => `--remap-path-prefix=${p.percorso}=${p.al}`).join(String.fromCharCode(0x1f));
    const b = await esegui([process.execPath, "tauri", "build", "--no-bundle"], radice, { CARGO_ENCODED_RUSTFLAGS: flags });
    if (b.codice !== 0) rosso("BUILD", `exit ${b.codice} (dettaglio nel log)`);
    if (!existsSync(rilascio) || statSync(rilascio).mtime.getTime() < inizio) rosso("BUILD", `exit 0 ma ${relative(radice, rilascio)} non è stato riscritto`);
  }
  const lette = await proprieta(rilascio, ["ProductVersion", "CompanyName", "LegalCopyright"]);
  const [versioneDellEseguibile, societa, copyright] = lette ?? [];
  const attese = [nomi.versione, configurazione.bundle.publisher, configurazione.bundle.copyright];
  if (lette === null || attese.some((a, i) => a === undefined || a !== lette[i]))
    rosso("BUILD", `le proprietà dell'eseguibile ${JSON.stringify(lette)} invece di ${JSON.stringify(attese)} (package.json e tauri.conf.json)`);
  const { size, mtime } = statSync(rilascio);
  riga(`BUILD: ${senzaBuild ? "SALTATO (--senza-build)" : "VERDE"} | ${relative(radice, rilascio)} ${size} byte del ${mtime.toISOString()}, versione ${versioneDellEseguibile}, società «${societa}», copyright «${copyright}», sha256 ${impronta(rilascio)}`);
  return rilascio;
}

/** Quante volte un percorso compare nei byte, in UTF-8 e in UTF-16, senza badare alle maiuscole, con le barre
 * rovesciate o in avanti. */
function occorrenze(byte: Buffer, percorso: string): number {
  let n = 0;
  // Ogni byte un carattere: un ago in UTF-8 si cerca coi suoi byte; in UTF-16 il testo si legge a coppie.
  const testi = [byte.toString("latin1").toLowerCase(), byte.toString("utf16le").toLowerCase(), byte.subarray(1).toString("utf16le").toLowerCase()];
  const barra = String.fromCharCode(92);
  for (const forma of [percorso, percorso.replaceAll(barra, "/")]) {
    const agoUtf8 = Buffer.from(forma.toLowerCase(), "utf8").toString("latin1");
    const agoUtf16 = forma.toLowerCase();
    for (const [testo, ago] of [[testi[0]!, agoUtf8], [testi[1]!, agoUtf16], [testi[2]!, agoUtf16]] as const)
      for (let i = testo.indexOf(ago); i >= 0; i = testo.indexOf(ago, i + 1)) n++;
  }
  return n;
}

/** 3. I percorsi della macchina nei byte di un eseguibile (`clausola` e `quale` lo dicono nelle righe). */
function percorsi(eseguibileDaLeggere: string, clausola = "PERCORSI", quale = "nell'eseguibile"): void {
  const nellEseguibile = readFileSync(eseguibileDaLeggere);
  const trovati = percorsiDellaMacchina.map((p) => ({ ...p, n: occorrenze(nellEseguibile, p.percorso) })).filter((p) => p.n > 0);
  // Controllo positivo: il file delle dipendenze di `tokio`, il più recente, porta i percorsi veri della cartella di Cargo.
  const deps = join(radice, "shell", "target", "release", "deps");
  const sonde = existsSync(deps) ? readdirSync(deps).filter((f) => /^tokio-[0-9a-f]+\.d$/.test(f)).map((f) => join(deps, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs) : [];
  const sonda = sonde[0];
  const acceso = sonda === undefined ? 0 : occorrenze(readFileSync(sonda), cartellaDiCargo.percorso);
  if (acceso === 0) rosso(clausola, `controllo positivo SPENTO: nessuna occorrenza della cartella di Cargo in ${sonda ?? "(nessun file delle dipendenze di tokio)"}`);
  if (trovati.length > 0) rosso(clausola, `${quale} ci sono ${trovati.map((p) => `${p.nome} ${p.n} volte`).join(", ")}`);
  riga(`${clausola}: VERDE | ${quale} nessuno di ${percorsiDellaMacchina.map((p) => p.nome).join(", ")} | controllo positivo acceso (${acceso} occorrenze della cartella di Cargo in ${relative(radice, sonda!)})`);
}

/** Le voci al primo livello di una cartella, con la barra in coda per le cartelle. */
const voci = (dir: string) => readdirSync(dir, { withFileTypes: true }).map((v) => (v.isDirectory() ? `${v.name}/` : v.name)).sort();

/** Un segnaposto: un nome fra due graffe doppie (`{{versione}}`). Il valore iniziale di una matrice o di una tabella
 * scritto in una guida (`{{1, 2}, {3, 4}}`, `{{"Anna", 7}}`) non lo è. */
const segnaposto = /\{\{\s*[A-Za-z_]\w*\s*\}\}/;
/** Il rilevatore dei segnaposto nei due versi: rosso se non vede un segnaposto o se vede il valore di una matrice. */
function sondaDeiSegnaposto(clausola: string): void {
  const visti = ["{{versione}}", "{{ data }}", "{{1, 2}, {3, 4}}", '{{"Anna", 7}, {"Bruno", 8}}'].map((t) => segnaposto.test(t));
  if (JSON.stringify(visti) !== JSON.stringify([true, true, false, false])) rosso(clausola, `il rilevatore dei segnaposto sbaglia sulle sue sonde: ${JSON.stringify(visti)}`);
}

/** Un testo per l'utente dalla cartella di `--testi`, con `{{versione}}` e `{{data}}` sostituiti: un segnaposto rimasto
 * è rosso. */
function testoConISegnaposto(clausola: string, t: string): string {
  const sorgente = join(cartellaTesti!, t);
  if (!existsSync(sorgente)) rosso(clausola, `manca il testo ${sorgente}`);
  const testo = readFileSync(sorgente, "utf8").replaceAll("{{versione}}", nomi.versione).replaceAll("{{data}}", data);
  sondaDeiSegnaposto(clausola);
  const rimasto = segnaposto.exec(testo);
  if (rimasto) rosso(clausola, `${t}: «${rimasto[0]}» non sostituito (si sostituiscono solo {{versione}} e {{data}})`);
  return testo;
}

/** Un documento di `docs/` così com'è: un segnaposto è rosso. */
function documento(clausola: string, d: string): string {
  const sorgente = join(repository, "docs", d);
  if (!existsSync(sorgente)) rosso(clausola, `manca il documento ${sorgente}`);
  const testo = readFileSync(sorgente, "utf8");
  sondaDeiSegnaposto(clausola);
  const rimasto = segnaposto.exec(testo);
  if (rimasto) rosso(clausola, `${relative(repository, sorgente)}: «${rimasto[0]}», un segnaposto nel documento, che si copia così com'è`);
  return testo;
}

/** Una cartella del pacchetto che c'è già si cancella solo se ha le sole voci dell'elenco e `data` vuota. */
function sgombra(clausola: string, dir: string, elenco: readonly string[]): void {
  if (!existsSync(dir)) return;
  const estranee = differenzeDallElenco(voci(dir), elenco).filter((d) => d.startsWith("in più"));
  const datiPieni = existsSync(join(dir, "data")) && readdirSync(join(dir, "data")).length > 0;
  if (estranee.length > 0 || datiPieni) rosso(clausola, `${dir} c'è già e contiene altro (${[...estranee, ...(datiPieni ? ["data non vuota"] : [])].join(", ")}): non la cancello`);
  rmSync(dir, { recursive: true });
}

/** Le voci composte confrontate con l'elenco nei due versi, col controllo positivo (una voce tolta e una in più). */
function confrontoConLElenco(clausola: string, trovate: readonly string[], elenco: readonly string[]): string {
  const differenze = differenzeDallElenco(trovate, elenco);
  const sonda = differenzeDallElenco([...trovate.filter((v) => v !== "LICENSE-DOCS"), "sonda.txt"], elenco);
  if (sonda.join("|") !== "manca LICENSE-DOCS|in più sonda.txt") rosso(clausola, `il confronto con l'elenco non si accende: con una voce tolta e una in più dice ${JSON.stringify(sonda)}`);
  if (differenze.length > 0) rosso(clausola, `le voci non sono quelle dell'elenco: ${differenze.join(", ")}`);
  return sonda.join(", ");
}

/** 4. La cartella del pacchetto. */
async function componi(rilascio: string): Promise<void> {
  if (!lstatSync(cartellaTesti!, { throwIfNoEntry: false })?.isDirectory()) rosso("CARTELLA", `--testi ${cartellaTesti}: non è una cartella`);
  // I testi tracciati dal repository: con l'albero pulito sono quelli del commit, e non una copia rimasta fuori (le note
  // di una versione di prima nelle cartelle di lavoro hanno gli stessi segnaposto e passerebbero).
  const sorgenti = [...testiDelPacchetto, ...Object.keys(testiDelloStrumento)].map((t) => resolve(cartellaTesti!, t));
  const tracciati = await esegui(["git", "-C", repository, "ls-files", "--full-name", "--", ...sorgenti]);
  const elencati = new Set(tracciati.out.split("\n").map((r) => r.trim()).filter((r) => r !== "").map((r) => resolve(repository, r).toLowerCase()));
  const nonTracciati = sorgenti.filter((s) => !elencati.has(s.toLowerCase()));
  if (tracciati.codice !== 0 || nonTracciati.length > 0)
    rosso("CARTELLA", `--testi ${cartellaTesti}: ${nonTracciati.map((s) => relative(repository, s)).join(", ")} non tracciati dal repository, e i testi del pacchetto vengono dal commit`);
  sgombra("CARTELLA", cartella, elencoDelPacchetto);
  mkdirSync(join(cartella, "data"), { recursive: true });
  cpSync(rilascio, join(cartella, "AlgoDesign.exe"));
  cpSync(join(repository, "LICENSE"), join(cartella, "LICENSE"));
  cpSync(join(repository, "LICENSE-DOCS"), join(cartella, "LICENSE-DOCS"));
  const registro = readFileSync(join(repository, "CHANGELOG.md"), "utf8");
  if (!registro.includes(`\n## ${nomi.versione}, `)) rosso("CARTELLA", `CHANGELOG.md non ha la voce «## ${nomi.versione}, »`);
  if (registro.includes("SEGNAPOSTO")) rosso("CARTELLA", "CHANGELOG.md ha un SEGNAPOSTO rimasto");
  writeFileSync(join(cartella, "CHANGELOG.md"), registro);
  for (const t of testiDelPacchetto) writeFileSync(join(cartella, t), testoConISegnaposto("CARTELLA", t));
  for (const d of [...documentiDelPacchetto, guidaAdAccademico, guidaDelloStrumento]) writeFileSync(join(cartella, d), documento("CARTELLA", d));
  for (const d of documentiDellaRadice) {
    const testo = readFileSync(join(repository, d), "utf8");
    const rimasto = segnaposto.exec(testo);
    if (rimasto) rosso("CARTELLA", `${d}: «${rimasto[0]}», un segnaposto nel documento, che si copia così com'è`);
    if (!testo.includes(`AlgoDesign-${nomi.versione}`)) rosso("CARTELLA", `${d} non dice la cartella della versione, «AlgoDesign-${nomi.versione}»`);
    writeFileSync(join(cartella, d), testo);
  }
  const l = await licenzeDiTerzeParti(["x86_64-pc-windows-msvc"], nomi.versione, esegui, rosso);
  writeFileSync(join(cartella, fileDelleLicenze), l.testo);

  const trovate = voci(cartella);
  const sonda = confrontoConLElenco("CARTELLA", trovate, elencoDelPacchetto);
  if (readdirSync(join(cartella, "data")).length > 0) rosso("CARTELLA", "data non è vuota");
  riga(
    `CARTELLA: VERDE | ${relative(repository, cartella)} con le ${trovate.length} voci dell'elenco (${trovate.join(", ")}) | testi del ${data} | licenze di terze parti: ${l.js} librerie JavaScript, ${l.rust} Rust, ${l.testi} testi, ${Buffer.byteLength(l.testo)} byte | controllo positivo acceso (${sonda})`,
  );
}

/** Che cosa comprimere: la cartella composta, lo zip, la cartella che deve nascere estraendolo, l'elenco delle voci. */
type DaComprimere = { clausola: string; cartella: string; zip: string; nomeDelloZip: string; cartellaNelloZip: string; elenco: readonly string[] };

/** 5 e 9. Lo zip, la prova dell'estrazione e l'impronta. */
async function comprimi({ clausola, cartella, zip, nomeDelloZip, cartellaNelloZip, elenco }: DaComprimere): Promise<string> {
  const conDati = elenco.includes("data/");
  for (const f of [zip, `${zip}.sha256`]) rmSync(f, { force: true });
  // Il `tar` di Windows non rinomina i percorsi (`-s` non c'è): lo zip si fa da una copia col nome che deve avere dentro.
  const copia = mkdtempSync(join(tmpdir(), "algodesign-copia-"));
  try {
    cpSync(cartella, join(copia, cartellaNelloZip), { recursive: true });
    const z = await esegui([tar, "-a", "-c", "-f", zip, cartellaNelloZip], copia);
    if (z.codice !== 0 || !existsSync(zip)) rosso(clausola, `tar esce ${z.codice} (dettaglio nel log)`);
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
  const estratta = mkdtempSync(join(tmpdir(), "algodesign-zip-"));
  try {
    const x = await esegui([tar, "-x", "-f", zip, "-C", estratta]);
    if (x.codice !== 0) rosso(clausola, `l'estrazione esce ${x.codice} (dettaglio nel log)`);
    const radici = voci(estratta);
    if (radici.join("|") !== `${cartellaNelloZip}/`) rosso(clausola, `estratto, lo zip dà ${JSON.stringify(radici)} invece della sola cartella ${cartellaNelloZip}`);
    const dentro = join(estratta, cartellaNelloZip);
    const differenze = differenzeDallElenco(voci(dentro), elenco);
    if (differenze.length > 0) rosso(clausola, `le voci estratte non sono quelle dell'elenco: ${differenze.join(", ")}`);
    const diverse = elenco.filter((v) => !v.endsWith("/") && impronta(join(dentro, v)) !== impronta(join(cartella, v)));
    if (diverse.length > 0) rosso(clausola, `file estratti diversi da quelli della cartella: ${diverse.join(", ")}`);
    if (conDati && readdirSync(join(dentro, "data")).length > 0) rosso(clausola, "data estratta non è vuota");
  } finally {
    rmSync(estratta, { recursive: true, force: true });
  }
  // La seconda lettura, con la libreria degli zip di .NET: le voci con l'impronta del contenuto, una per riga.
  const lettura = [
    "Add-Type -AssemblyName System.IO.Compression.FileSystem",
    "$z = [System.IO.Compression.ZipFile]::OpenRead($env:ZIP_DA_LEGGERE)",
    "$sha = [System.Security.Cryptography.SHA256]::Create()",
    "foreach ($v in $z.Entries) { $s = $v.Open(); $h = $sha.ComputeHash($s); $s.Close(); $v.FullName + [char]9 + [BitConverter]::ToString($h).Replace('-', '').ToLower() }",
    "$z.Dispose()",
  ].join("; ");
  const n = await esegui(["powershell", "-NoProfile", "-Command", lettura], radice, { ZIP_DA_LEGGERE: zip });
  if (n.codice !== 0) rosso(clausola, `la lettura con .NET esce ${n.codice} (dettaglio nel log)`);
  const lette = new Map(n.out.replace(/\r/g, "").split("\n").filter((r) => r !== "").map((r) => r.split("\t") as [string, string]));
  const radiceNelloZip = `${cartellaNelloZip}/`;
  const attese = new Map(elenco.filter((v) => !v.endsWith("/")).map((v) => [`${radiceNelloZip}${v}`, impronta(join(cartella, v))]));
  const cartelleAmmesse = [radiceNelloZip, ...elenco.filter((v) => v.endsWith("/")).map((v) => `${radiceNelloZip}${v}`)];
  const fuori = [...lette.keys()].filter((v) => !attese.has(v) && !cartelleAmmesse.includes(v));
  const mancanti = [...attese.keys()].filter((v) => !lette.has(v));
  const diverseConNet = [...attese].filter(([v, h]) => lette.has(v) && lette.get(v) !== h).map(([v]) => v);
  const datiLetti = !conDati || lette.has(`${radiceNelloZip}data/`);
  if (fuori.length > 0 || mancanti.length > 0 || diverseConNet.length > 0 || !datiLetti)
    rosso(clausola, `letto con .NET: in più ${JSON.stringify(fuori)}, mancano ${JSON.stringify(mancanti)}, diversi ${JSON.stringify(diverseConNet)}${conDati ? `, data/ ${datiLetti ? "c'è" : "manca"}` : ""}`);
  const sha = impronta(zip);
  writeFileSync(`${zip}.sha256`, `${sha}  ${nomeDelloZip}\n`);
  riga(`${clausola}: VERDE | ${relative(repository, zip)} ${statSync(zip).size} byte, estratto col tar dà ${cartellaNelloZip}/ con le voci dell'elenco e gli stessi file; letto con .NET, ${lette.size} voci, gli stessi ${attese.size} file${conDati ? " e data/" : ""} | sha256 ${sha} in ${nomeDelloZip}.sha256`);
  return sha;
}

/** 7. L'eseguibile a sé dello strumento, in una cartella temporanea nuova: il build, le proprietà, i moduli, i percorsi. */
async function eseguibileDelloStrumento(): Promise<{ exe: string; moduli: string[]; build: string }> {
  const build = mkdtempSync(join(tmpdir(), "algodesign-strumento-"));
  const exe = join(build, eseguibileS);
  const metafile = join(build, "metafile.json");
  const { publisher, copyright } = configurazione.bundle;
  if (publisher === undefined || copyright === undefined) rosso("STRUMENTO", "tauri.conf.json non ha bundle.publisher e bundle.copyright");
  const descrizione = `Gli strumenti di AlgoDesign ${nomiS.versione}`;
  const b = await esegui([
    process.execPath,
    "build",
    "--compile",
    "./strumenti/algodesign-tools.ts",
    "--outfile",
    exe,
    `--metafile=${metafile}`,
    "--no-compile-autoload-dotenv",
    "--no-compile-autoload-bunfig",
    "--windows-title=AlgoDesign Tools",
    `--windows-publisher=${publisher}`,
    `--windows-version=${nomiS.versioneDellEseguibile}`,
    `--windows-description=${descrizione}`,
    `--windows-copyright=${copyright}`,
    `--windows-icon=${icona}`,
  ]);
  // Senza le proprietà Bun esce 1 e l'eseguibile c'è lo stesso, con le sue: decide l'exit code, non il file.
  if (b.codice !== 0 || !existsSync(exe)) rosso("STRUMENTO", `bun build --compile esce ${b.codice}${existsSync(exe) ? " (l'eseguibile c'è, ma non vale)" : ""} (dettaglio nel log)`);
  const nomiDelleProprieta = ["ProductName", "ProductVersion", "CompanyName", "LegalCopyright", "FileDescription"];
  const lette = await proprieta(exe, nomiDelleProprieta);
  const attese = ["AlgoDesign Tools", nomiS.versioneDellEseguibile, publisher, copyright, descrizione];
  if (lette === null || attese.some((a, i) => a !== lette[i])) rosso("STRUMENTO", `le proprietà dell'eseguibile ${JSON.stringify(lette)} invece di ${JSON.stringify(attese)}`);
  // L'icona: quella di AlgoDesign, non quella di Bun. Controllo positivo: lo stesso confronto su Bun dà un'icona diversa
  // (il rilevatore sa dire «diversa»), e sull'eseguibile dell'app, se c'è, la stessa (sa dire «uguale»).
  const dellApp = join(radice, "shell", "target", "release", "algodesign.exe");
  const daLeggere = [exe, process.execPath, ...(existsSync(dellApp) ? [dellApp] : [])];
  const { misure, dentro } = immaginiDellIcona(daLeggere);
  const [delloStrumento, diBun, diAlgoDesign] = dentro;
  const tutte = misure.length;
  if (tutte === 0) rosso("STRUMENTO: ICONA", `${relative(radice, icona)} non ha immagini: il rilevatore non ha nulla da cercare`);
  if (diBun !== 0) rosso("STRUMENTO: ICONA", `Bun contiene ${diBun} immagini su ${tutte} dell'icona di AlgoDesign: il rilevatore non distingue, controllo positivo spento`);
  if (diAlgoDesign !== undefined && diAlgoDesign !== tutte) rosso("STRUMENTO: ICONA", `l'eseguibile dell'app contiene ${diAlgoDesign} immagini su ${tutte} della sua icona: il rilevatore non sa dire «uguale»`);
  if (delloStrumento !== tutte) rosso("STRUMENTO: ICONA", `${eseguibileS} contiene ${delloStrumento} immagini su ${tutte} dell'icona di AlgoDesign`);
  riga(`STRUMENTO: ICONA: VERDE | ${eseguibileS} contiene tutte le ${tutte} immagini di ${relative(radice, icona)} (${misure.join(", ")}) | controllo positivo: Bun 0 su ${tutte}${diAlgoDesign === undefined ? "" : `, l'app ${diAlgoDesign} su ${tutte}`}`);
  // I moduli dentro l'eseguibile: tutti del repository, nessuno da `node_modules`.
  const ingressi = Object.keys((JSON.parse(readFileSync(metafile, "utf8")) as { inputs: Record<string, unknown> }).inputs);
  const altrui = ingressi.filter((m) => {
    const assoluto = resolve(radice, m);
    return m.includes("node_modules") || isAbsolute(relative(radice, assoluto)) || relative(radice, assoluto).startsWith("..");
  });
  if (ingressi.length === 0) rosso("STRUMENTO", "il metafile del build non ha moduli: il controllo dei moduli non ha visto nulla");
  if (altrui.length > 0) rosso("STRUMENTO", `nell'eseguibile moduli che non sono del repository (vorrebbero la loro licenza): ${altrui.join(", ")}`);
  const { size } = statSync(exe);
  riga(`STRUMENTO: VERDE | ${eseguibileS} ${size} byte, Bun ${Bun.version}, ${ingressi.length} moduli tutti del repository (${ingressi.filter((m) => m.startsWith("core/")).length} del nucleo), proprietà ${JSON.stringify(Object.fromEntries(nomiDelleProprieta.map((n, i) => [n, lette![i]])))}, sha256 ${impronta(exe)}`);
  percorsi(exe, "STRUMENTO: PERCORSI", `in ${eseguibileS}`);
  return { exe, moduli: ingressi, build };
}

/** 8. La cartella del pacchetto dello strumento. */
function componiLoStrumento(exe: string, moduli: readonly string[]): void {
  sgombra("CARTELLA DELLO STRUMENTO", cartellaDelloStrumento, elencoDelloStrumento);
  mkdirSync(cartellaDelloStrumento, { recursive: true });
  cpSync(exe, join(cartellaDelloStrumento, eseguibileS));
  cpSync(join(repository, "LICENSE"), join(cartellaDelloStrumento, "LICENSE"));
  cpSync(join(repository, "LICENSE-DOCS"), join(cartellaDelloStrumento, "LICENSE-DOCS"));
  for (const [sorgente, destinazione] of Object.entries(testiDelloStrumento))
    writeFileSync(join(cartellaDelloStrumento, destinazione), testoConISegnaposto("CARTELLA DELLO STRUMENTO", sorgente));
  for (const g of [guidaAdAccademico, guidaDelloStrumento]) {
    const guida = documento("CARTELLA DELLO STRUMENTO", g);
    if (!guida.includes(nomiS.zip)) rosso("CARTELLA DELLO STRUMENTO", `${g} non dice il nome del pacchetto dello strumento, «${nomiS.zip}»`);
    writeFileSync(join(cartellaDelloStrumento, g), guida);
  }
  const l = licenzeDelloStrumento(nomiS.versione, moduli, rosso);
  writeFileSync(join(cartellaDelloStrumento, fileDelleLicenze), l.testo);
  const trovate = voci(cartellaDelloStrumento);
  const sonda = confrontoConLElenco("CARTELLA DELLO STRUMENTO", trovate, elencoDelloStrumento);
  riga(
    `CARTELLA DELLO STRUMENTO: VERDE | ${relative(repository, cartellaDelloStrumento)} con le ${trovate.length} voci dell'elenco (${trovate.join(", ")}) | licenze di terze parti: Bun ${l.bun}, ${l.testi} testi, ${Buffer.byteLength(l.testo)} byte | controllo positivo acceso (${sonda})`,
  );
}

/** Le cartelle da cui un avvio può lasciare tracce: i nomi al primo livello. */
const radiciDelleTracce = (() => {
  const r: Record<string, string> = { APPDATA: process.env.APPDATA ?? "", LOCALAPPDATA: process.env.LOCALAPPDATA ?? "", TEMP: process.env.TEMP ?? "" };
  if (process.env.TMP !== undefined && resolve(process.env.TMP).toLowerCase() !== resolve(r.TEMP!).toLowerCase()) r.TMP = process.env.TMP;
  return r;
})();
const fotografia = () => Object.fromEntries(Object.entries(radiciDelleTracce).map(([n, c]) => [n, new Set(readdirSync(c))]));
const nomiNuovi = (prima: Record<string, Set<string>>) => Object.entries(radiciDelleTracce).flatMap(([n, c]) => readdirSync(c).filter((x) => !prima[n]!.has(x)).map((x) => `${n}\\${x}`));

/** 10. Lo strumento estratto dallo zip in una cartella con spazi e avviato senza Bun sul percorso. */
async function provaLoStrumento(): Promise<void> {
  const C = "PROVA DELLO STRUMENTO";
  if (Object.values(radiciDelleTracce).some((c) => c === "" || !existsSync(c))) rosso(C, `manca una delle cartelle delle tracce: ${JSON.stringify(radiciDelleTracce)}`);
  const base = mkdtempSync(join(tmpdir(), "algodesign-prova-"));
  try {
    const cartellaDiProva = join(base, "prova dello strumento");
    mkdirSync(cartellaDiProva);
    const x = await esegui([tar, "-x", "-f", zipDelloStrumento, "-C", cartellaDiProva]);
    if (x.codice !== 0) rosso(C, `l'estrazione esce ${x.codice} (dettaglio nel log)`);
    const dentro = join(cartellaDiProva, nomiS.cartellaNelloZip);
    const exe = join(dentro, eseguibileS);
    const lavoro = join(cartellaDiProva, "i testi");
    mkdirSync(lavoro);
    // Il PATH senza le cartelle che hanno bun.exe: lo strumento non deve averne bisogno.
    const percorso = (process.env.PATH ?? process.env.Path ?? "").split(";").filter((d) => d !== "" && !existsSync(join(d, "bun.exe")));
    const conBun = (process.env.PATH ?? process.env.Path ?? "").split(";").filter((d) => d !== "" && existsSync(join(d, "bun.exe")));
    const ambiente: Record<string, string | undefined> = { ...process.env, PATH: percorso.join(";"), Path: undefined };
    const lancia = async (cmd: string[]) => {
      log(`$ ${cmd.join(" ")} (cwd ${lavoro})`);
      const p = Bun.spawn({ cmd, cwd: lavoro, env: ambiente, stdout: "pipe", stderr: "pipe" });
      const [out, err, codice] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
      const uscita = `${out}${err}`.replace(/\r/g, "").trim();
      log(`${uscita}\n(exit ${codice})`);
      return { codice, uscita };
    };
    // I testi dei cinque esempi forniti che ci stanno, coi nomi dei file dati, e il testo con un errore alla riga 4.
    const esempi = ["tappa-1/overflow-fattoriale", "tappa-1/condizione-intero", "tappa-1/condizione-booleano", "tappa-3/tre-livelli", "tappa-4/ricorsione-senza-uscita"];
    const testi = esempi.map((e) => {
      const atteso = delCorpus[e];
      if (atteso === undefined) rosso(C, `manca il testo atteso di ${e} in ui/genera/attesi-di-accademico.ts`);
      const file = join(lavoro, `${e.split("/")[1]!.replaceAll("-", "_")}.txt`);
      writeFileSync(file, atteso.it);
      return file;
    });
    const rotto = join(lavoro, "testo con un errore.txt");
    writeFileSync(rotto, "variable x: integer\nx ← 1\nwhile x < 3 do\n    x = x + 1\nend while\n");

    // Le stesse letture con Bun dal repository: le righe e la libreria di confronto, fuori dalla finestra delle tracce. Le
    // due librerie hanno lo stesso nome in due cartelle: il nome del file d'uscita è il nome della libreria.
    const righeDiBun: string[] = [];
    mkdirSync(join(lavoro, "con bun"));
    mkdirSync(join(lavoro, "con lo strumento"));
    const libreriaDiBun = join(lavoro, "con bun", "esercizi.algo");
    for (const [i, t] of testi.entries()) {
      const r = await esegui([process.execPath, "./strumenti/algodesign-tools.ts", "accademico", t, ...(i === 0 ? ["-o", libreriaDiBun] : ["-l", libreriaDiBun]), "-r"]);
      if (r.codice !== 0) rosso(C, `bun ./strumenti/algodesign-tools.ts accademico su ${t} esce ${r.codice} (dettaglio nel log)`);
      righeDiBun.push(`${r.out}${r.err}`.replace(/\r/g, "").trim().replaceAll(libreriaDiBun, "<libreria>"));
    }

    const prima = fotografia();
    const aiuto = await lancia([exe, "accademico", "-h"]);
    const sbagliata = await lancia([exe, "accademico", "-x"]);
    const errore = await lancia([exe, "accademico", rotto]);
    const senzaComando = await lancia([exe]);
    const stampaSbagliata = await lancia([exe, "stampa", join(lavoro, "non c'e.algo")]);
    const libreria = join(lavoro, "con lo strumento", "esercizi.algo");
    const righe: string[] = [];
    for (const [i, t] of testi.entries()) {
      const r = await lancia([exe, "accademico", t, ...(i === 0 ? ["-o", libreria] : ["-l", libreria]), "-r"]);
      if (r.codice !== 0) rosso(C, `lo strumento su ${t} esce ${r.codice}: ${r.uscita}`);
      righe.push(r.uscita.replaceAll(libreria, "<libreria>"));
    }
    // `stampa`: le stesse pagine di Bun, byte per byte, senza `--linguaggi` (le colonne e la pagina di prova) e con, con un
    // progetto che ha uno spazio nel nome.
    const progetto = join(lavoro, "il progetto.algo");
    cpSync(join(radice, "casi", "tappa-3", "tre-livelli.algo"), progetto);
    const paginaDiBun = join(lavoro, "con bun");
    const pagineDelloStrumento = join(lavoro, "con lo strumento");
    const scelte: readonly (readonly string[])[] = [[], ["--linguaggi", "pseudocodice", "c"]];
    for (const scelta of scelte) {
      const r = await lancia([exe, "stampa", progetto, ...scelta, "-o", pagineDelloStrumento]);
      const attese = scelta.length === 0 ? 2 : 1;
      const scritte = r.uscita.split("\n").filter((x) => x.startsWith("SCRITTO "));
      if (r.codice !== 0 || scritte.length !== attese) rosso(C, `stampa ${scelta.join(" ")} esce ${r.codice}, con ${scritte.length} pagine scritte invece di ${attese}: «${r.uscita}»`);
    }
    const tracce = nomiNuovi(prima);
    for (const scelta of scelte) {
      const r = await esegui([process.execPath, "./strumenti/algodesign-tools.ts", "stampa", progetto, ...scelta, "-o", paginaDiBun]);
      if (r.codice !== 0) rosso(C, `bun ./strumenti/algodesign-tools.ts stampa ${scelta.join(" ")} esce ${r.codice} (dettaglio nel log)`);
    }
    const pagine = readdirSync(pagineDelloStrumento).filter((f) => f.endsWith(".html")).sort();
    const pagineDiBun = readdirSync(paginaDiBun).filter((f) => f.endsWith(".html")).sort();
    if (!pagine.includes("il progetto (prova).html") || pagine.length !== scelte.length + 1 || pagine.join() !== pagineDiBun.join()) rosso(C, `le pagine sono ${pagine.join(", ")} invece di ${pagineDiBun.join(", ")}, con la pagina di prova`);
    for (const f of pagine) if (impronta(join(pagineDelloStrumento, f)) !== impronta(join(paginaDiBun, f))) rosso(C, `la pagina «${f}» dello strumento non è quella di bun, byte per byte`);
    // Controllo positivo, nella stessa finestra: l'uscita scritta in %TEMP% si deve vedere.
    const marcatore = `algodesign-tools-prova-${process.pid}.algo`;
    await lancia([exe, "accademico", testi[0]!, "-o", join(radiciDelleTracce.TEMP!, marcatore)]);
    const acceso = nomiNuovi(prima).includes(`TEMP\\${marcatore}`);
    rmSync(join(radiciDelleTracce.TEMP!, marcatore), { force: true });

    if (conBun.length === 0) rosso(C, "nel PATH di questo processo nessuna cartella ha bun.exe: la prova «senza Bun» non toglierebbe nulla");
    if (aiuto.codice !== 0 || !aiuto.uscita.includes("algodesign-tools accademico <testo.txt> [-l libreria.algo]")) rosso(C, `-h esce ${aiuto.codice} senza il modo d'uso col nome dell'eseguibile: «${aiuto.uscita.slice(0, 200)}»`);
    if (sbagliata.codice !== 2 || !sbagliata.uscita.includes("algodesign-tools accademico <testo.txt>")) rosso(C, `un'opzione sbagliata esce ${sbagliata.codice} senza il modo d'uso`);
    if (errore.codice !== 1 || !errore.uscita.includes("riga 4") || existsSync(join(lavoro, "testo con un errore.algo"))) rosso(C, `il testo con un errore esce ${errore.codice}: «${errore.uscita}»`);
    if (senzaComando.codice !== 2) rosso(C, `senza un comando esce ${senzaComando.codice}: «${senzaComando.uscita.slice(0, 200)}»`);
    if (stampaSbagliata.codice !== 1 || !stampaSbagliata.uscita.startsWith("ERRORE")) rosso(C, `stampa di un file che non c'è esce ${stampaSbagliata.codice}: «${stampaSbagliata.uscita.slice(0, 200)}»`);
    const diverse = righe.map((r, i) => (r === righeDiBun[i] ? null : `${testi[i]}: «${r}» invece di «${righeDiBun[i]}»`)).filter((d) => d !== null);
    if (diverse.length > 0) rosso(C, `righe diverse da quelle di bun: ${diverse.join("; ")}`);
    if (!existsSync(libreria) || impronta(libreria) !== impronta(libreriaDiBun)) {
      const a = readFileSync(libreria, "utf8").split("\n");
      const b = readFileSync(libreriaDiBun, "utf8").split("\n");
      const i = a.findIndex((r, k) => r !== b[k]);
      rosso(C, `la libreria dello strumento non è quella di bun, byte per byte: prima differenza alla riga ${i + 1}, «${a[i]}» invece di «${b[i]}»`);
    }
    if (!acceso) rosso(C, "controllo positivo delle tracce SPENTO: l'uscita scritta in %TEMP% non si vede");
    if (tracce.length > 0) rosso(C, `lo strumento lascia tracce: ${tracce.join(", ")}`);
    riga(
      `${C}: VERDE | estratto in «${relative(base, dentro)}», PATH senza le ${conBun.length} cartelle con bun.exe | -h esce 0 col modo d'uso; -x esce 2; il testo con un errore esce 1 («${errore.uscita}») | ${testi.length} testi in una libreria: righe e libreria (${statSync(libreria).size} byte, sha256 ${impronta(libreria)}) uguali a quelle di bun | stampa: ${pagine.length} pagine uguali a quelle di bun (${pagine.join(", ")}) | tracce fuori dalla cartella 0 in ${Object.keys(radiciDelleTracce).join(", ")}, controllo positivo acceso`,
    );
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

riga(`PACCHETTO di AlgoDesign ${nomi.versione}${prova ? " (di prova)" : ""} — inizio ${new Date().toISOString()} | log ${fileLog}`);
try {
  if (process.platform !== "win32") rosso("SISTEMA", `il pacchetto per Windows si compone su Windows, non su ${process.platform}`);
  const { descritto, prima } = await albero();
  const rilascio = await eseguibile();
  await alberoUguale(prima, "il build");
  percorsi(rilascio);
  await componi(rilascio);
  await alberoUguale(prima, "le licenze e la cartella");
  const sha = await comprimi({ clausola: "ZIP", cartella, zip, nomeDelloZip: nomi.zip, cartellaNelloZip: nomi.cartellaNelloZip, elenco: elencoDelPacchetto });
  const s = await eseguibileDelloStrumento();
  try {
    componiLoStrumento(s.exe, s.moduli);
  } finally {
    rmSync(s.build, { recursive: true, force: true });
  }
  await alberoUguale(prima, "lo strumento");
  const shaS = await comprimi({ clausola: "ZIP DELLO STRUMENTO", cartella: cartellaDelloStrumento, zip: zipDelloStrumento, nomeDelloZip: nomiS.zip, cartellaNelloZip: nomiS.cartellaNelloZip, elenco: elencoDelloStrumento });
  await provaLoStrumento();
  riga(
    `ESITO: ${prova ? `VERDE, DI PROVA${senzaBuild ? ", SENZA BUILD" : ""}` : "VERDE"} | ${relative(repository, cartella)} con AlgoDesign.exe sha256 ${impronta(join(cartella, "AlgoDesign.exe"))} | ${nomi.zip} sha256 ${sha} | ${nomiS.zip} sha256 ${shaS} | da ${descritto}`,
  );
} catch (e) {
  riga(e instanceof Rosso ? e.message : `ERRORE: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  riga("ESITO: ROSSO");
  process.exit(1);
}
