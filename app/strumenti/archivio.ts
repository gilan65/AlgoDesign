// L'archivio della release per Linux: `bun ./strumenti/archivio.ts --piattaforma linux --testi <cartella> [--prova]`, su
// Linux (la macchina Ubuntu delle GitHub Actions). Il pacchetto per Windows lo compone `pacchetto.ts`, con gli stessi
// controlli dove hanno senso anche qui.
//
// 1. ALBERO: il commit da cui nasce l'archivio. Con file modificati o nuovi rispetto al commit, o con un commit che non
//    ha l'etichetta `v<versione>`, è rosso, se non con `--prova`: l'archivio si dice allora di prova e va in
//    `dist/prova/`. Lo stato si rilegge dopo il build e dopo le licenze: diverso da quello di prima, è rosso.
// 2. BUILD: cancella l'uscita del build dell'interfaccia (`dist/` dell'app) e la cartella delle AppImage, e costruisce
//    l'AppImage (`bun tauri build --bundles appimage`) coi percorsi della macchina rimappati (`--remap-path-prefix` per
//    il profilo dell'utente, il repository, le cartelle temporanea e degli strumenti delle Actions e la cartella di
//    Cargo). Rosso se non ne nasce una sola, o se il suo nome non porta la versione di `package.json`.
// 3. PERCORSI: l'AppImage estratta (`--appimage-extract`, che non chiede FUSE); nei byte del programma
//    (`usr/bin/algodesign`) nessuno dei percorsi rimappati, in ASCII e in UTF-16. Controllo positivo: lo stesso
//    rilevatore trova la cartella di Cargo nel file delle dipendenze di `tokio` che il build lascia in
//    `target/release/deps`.
// 4. GLIBC: la versione più alta di glibc che il programma chiede (`objdump -T`), cioè la minima che il sistema deve
//    avere; rossa se supera quella che il `LEGGIMI` di Linux promette (`glibcPromessa`).
// 5. LIBRERIE DI SISTEMA: ogni libreria dentro l'AppImage (fuori da `usr/bin`: `*.so*`, `*.xml`, `*.compiled`,
//    `*.cache`) col pacchetto di Ubuntu da cui viene (`dpkg -S`, anche coi moduli che l'AppImage tiene in
//    `usr/lib/<modulo>` e che Ubuntu tiene in `/usr/lib/x86_64-linux-gnu/<modulo>`), la versione del pacchetto e il suo
//    file di copyright; i testi delle licenze comuni di Ubuntu a cui i copyright rimandano. Rosso se un pacchetto non ha
//    il copyright, se le licenze comuni mancano, se una libreria non ha un pacchetto e non è una cache dei moduli.
// 6. CARTELLA: `dist/<versione>-linux/` alla radice del repository (`dist/prova/…` con `--prova`), con le voci di
//    `elencoDiLinux`; i testi per l'utente dalla cartella di `--testi` coi segnaposto sostituiti (un `{{` rimasto è
//    rosso); la guida da `docs/`, il registro delle modifiche dalla radice, così come sono (come per Windows); le licenze
//    di terze parti per `x86_64-unknown-linux-gnu` con `licenze.ts`. Le voci, al primo livello e nella cartella delle
//    librerie di sistema, si confrontano con l'atteso nei due versi; controllo positivo: lo stesso confronto, con una
//    voce tolta e una in più, le dice tutte e due. L'AppImage ha i permessi 0755, gli altri file 0644, `data/` è vuota.
// 7. ARCHIVIO: `dist/AlgoDesign-<versione>-linux-x64.tar.gz`, con dentro la cartella `AlgoDesign-<versione>`, fatto col
//    `tar` del sistema (proprietario 0, nomi in ordine). Riletto due volte, col `tar` (estratto in una cartella
//    temporanea) e con il modulo `tarfile` di Python (un lettore diverso da quello che lo ha scritto): le voci sono quelle
//    della cartella, ogni file ha la sua impronta, l'AppImage è 0755, `data/` c'è ed è vuota. Accanto, `<archivio>.sha256`.
//
// Che cosa NON guarda:
// - che l'AppImage parta e funzioni: lo provano l'avvio di prova e la prova sul prodotto del workflow, e su macchine
//   pulite `verifica.yml`;
// - che i testi per l'utente dicano il vero: si leggono;
// - che i file di copyright di Ubuntu dicano tutte le licenze di una libreria: si riportano come Ubuntu li distribuisce;
// - le librerie che l'AppImage chiede al sistema senza portarle (la grafica di base, FUSE): le misura `verifica.yml`;
// - i file ignorati da git che entrano nel build (`node_modules`, la cache di Cargo), come per Windows;
// - nei byte del programma, altri dati della macchina oltre ai percorsi nominati; nelle librerie di Ubuntu, nulla.
//
// Gli exit code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.

import { appendFileSync, chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { dataMostrata } from "../ui/prodotto";
import { cartellaDelleLibrerieDiSistema, differenzeDallElenco, documentiDelPacchetto, elencoDiLinux, fileDelleLicenze, nomiDiLinux, testiDiLinux } from "./elenco-del-pacchetto";
import { licenzeDiTerzeParti } from "./licenze";

/** La glibc più vecchia su cui l'AppImage deve partire: quella che il `LEGGIMI` di Linux promette. */
const glibcPromessa = "2.34";

const argomenti = process.argv.slice(2);
const valore = (nome: string): string | undefined => {
  const i = argomenti.indexOf(nome);
  return i >= 0 ? argomenti[i + 1] : undefined;
};
const piattaforma = valore("--piattaforma");
const cartellaTesti = valore("--testi");
const conValore = new Set(["--piattaforma", "--testi"]);
const altri = argomenti.filter((a, i) => !conValore.has(a) && !conValore.has(argomenti[i - 1] ?? ""));
const prova = altri.includes("--prova");
if (piattaforma !== "linux" || cartellaTesti === undefined || cartellaTesti.startsWith("--") || altri.some((a) => a !== "--prova") || new Set(altri).size !== altri.length) {
  console.error(`uso: archivio --piattaforma linux --testi <cartella con ${Object.keys(testiDiLinux).join(", ")}> [--prova] (ricevuti: ${JSON.stringify(argomenti)})`);
  process.exit(2);
}

const radice = join(import.meta.dir, "..");
const repository = join(radice, "..");
const cartellaLog = join(radice, ".collaudo");
mkdirSync(cartellaLog, { recursive: true });
const fileLog = join(cartellaLog, `archivio-${piattaforma}-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);

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
  log(err.length > 20_000 ? `${err.slice(0, 20_000)}\n(… ${err.length} caratteri)` : err);
  log(`(exit ${codice})`);
  return { codice, out, err };
}

const impronta = (percorso: string) => createHash("sha256").update(readFileSync(percorso)).digest("hex");

const testoDelPackageJson = readFileSync(join(radice, "package.json"), "utf8");
const nomi = nomiDiLinux(testoDelPackageJson);
const dataDiRilascio: string = JSON.parse(testoDelPackageJson).dataDiRilascio;
const dist = prova ? join(repository, "dist", "prova") : join(repository, "dist");
const cartella = join(dist, nomi.cartella);
const archivio = join(dist, nomi.archivio);
const cartellaDelleAppImage = join(radice, "shell", "target", "release", "bundle", "appimage");

/** Lo stato dell'albero: il commit e le righe di `git status`. */
async function statoDellAlbero(): Promise<{ commit: string; modificati: string[] }> {
  const commit = await esegui(["git", "-C", repository, "rev-parse", "HEAD"]);
  const stato = await esegui(["git", "-C", repository, "status", "--porcelain", "--untracked-files=all"]);
  if (commit.codice !== 0 || stato.codice !== 0) rosso("ALBERO", `git esce ${commit.codice} e ${stato.codice} (dettaglio nel log)`);
  return { commit: commit.out.trim(), modificati: stato.out.split("\n").filter((r) => r.trim() !== "") };
}

/** 1. Il commit e lo stato dell'albero; senza `--prova` il commit è quello dell'etichetta della versione. */
async function albero(): Promise<{ descritto: string; prima: string }> {
  const { commit, modificati } = await statoDellAlbero();
  const etichetta = `v${nomi.versione}`;
  const etichette = await esegui(["git", "-C", repository, "tag", "--points-at", "HEAD"]);
  if (etichette.codice !== 0) rosso("ALBERO", `git tag esce ${etichette.codice} (dettaglio nel log)`);
  const etichettato = etichette.out.split("\n").map((r) => r.trim()).includes(etichetta);
  const descritto = `commit ${commit}${etichettato ? ` (${etichetta})` : ""}, ${modificati.length} file modificati o nuovi`;
  if (modificati.length > 0 && !prova) rosso("ALBERO", `${descritto} (${modificati.slice(0, 5).join("; ")}…): una release nasce da un commit; per provare lo strumento, --prova`);
  if (!etichettato && !prova) rosso("ALBERO", `${descritto}: HEAD non ha l'etichetta ${etichetta}, e una release nasce dal commit etichettato; per provare lo strumento, --prova`);
  riga(`ALBERO: ${modificati.length > 0 || !etichettato ? "DI PROVA" : "VERDE"} | ${descritto}`);
  return { descritto, prima: JSON.stringify({ commit, modificati }) };
}

async function alberoUguale(prima: string, dopo: string): Promise<void> {
  const ora = await statoDellAlbero();
  if (JSON.stringify(ora) !== prima) rosso("ALBERO", `dopo ${dopo} lo stato è cambiato: prima ${prima}, ora ${JSON.stringify(ora)}`);
  riga(`ALBERO: invariato dopo ${dopo}`);
}

/** I percorsi della macchina da togliere dal programma, come per Windows. Fra due prefissi che coincidono vince
 * l'ultimo: il repository e la cartella di Cargo, che stanno nel profilo, vanno dopo. */
const percorsiDellaMacchina = (() => {
  const casa = homedir();
  const delleActions = [
    { nome: "la cartella temporanea delle Actions", percorso: process.env.RUNNER_TEMP, al: "/temp" },
    { nome: "la cartella degli strumenti delle Actions", percorso: process.env.RUNNER_TOOL_CACHE, al: "/strumenti" },
  ].filter((p): p is { nome: string; percorso: string; al: string } => p.percorso !== undefined && p.percorso !== "");
  return [
    { nome: "il profilo dell'utente", percorso: casa, al: "/profilo" },
    { nome: "il repository", percorso: repository, al: "/algodesign" },
    ...delleActions,
    { nome: "la cartella di Cargo", percorso: process.env.CARGO_HOME ?? join(casa, ".cargo"), al: "/cargo" },
  ];
})();
const cartellaDiCargo = percorsiDellaMacchina.find((p) => p.al === "/cargo")!;

/** 2. L'AppImage. */
async function costruisci(): Promise<string> {
  rmSync(join(radice, "dist"), { recursive: true, force: true });
  rmSync(cartellaDelleAppImage, { recursive: true, force: true });
  const inizio = Date.now();
  const flags = percorsiDellaMacchina.map((p) => `--remap-path-prefix=${p.percorso}=${p.al}`).join(String.fromCharCode(0x1f));
  const b = await esegui([process.execPath, "tauri", "build", "--bundles", "appimage"], radice, { CARGO_ENCODED_RUSTFLAGS: flags });
  if (b.codice !== 0) rosso("BUILD", `exit ${b.codice} dopo ${Math.round((Date.now() - inizio) / 1000)} s (dettaglio nel log)`);
  const prodotte = existsSync(cartellaDelleAppImage) ? readdirSync(cartellaDelleAppImage).filter((f) => f.endsWith(".AppImage")).sort() : [];
  if (prodotte.length !== 1) rosso("BUILD", `exit 0 ma nella cartella delle AppImage, svuotata prima, ${JSON.stringify(prodotte)} invece di una sola`);
  if (!prodotte[0]!.includes(`_${nomi.versione}_`)) rosso("BUILD", `${prodotte[0]}: il nome non porta la versione ${nomi.versione}`);
  const appimage = join(cartellaDelleAppImage, prodotte[0]!);
  riga(`BUILD: VERDE | ${prodotte[0]} ${statSync(appimage).size} byte in ${Math.round((Date.now() - inizio) / 1000)} s, sha256 ${impronta(appimage)}`);
  return appimage;
}

/** Quante volte un percorso compare nei byte, in UTF-8 e in UTF-16, senza badare alle maiuscole. */
function occorrenze(byte: Buffer, percorso: string): number {
  let n = 0;
  const testi = [byte.toString("latin1").toLowerCase(), byte.toString("utf16le").toLowerCase(), byte.subarray(1).toString("utf16le").toLowerCase()];
  const agoUtf8 = Buffer.from(percorso.toLowerCase(), "utf8").toString("latin1");
  const agoUtf16 = percorso.toLowerCase();
  for (const [testo, ago] of [[testi[0]!, agoUtf8], [testi[1]!, agoUtf16], [testi[2]!, agoUtf16]] as const)
    for (let i = testo.indexOf(ago); i >= 0; i = testo.indexOf(ago, i + 1)) n++;
  return n;
}

/** L'AppImage estratta in una cartella temporanea: la radice del suo contenuto (`squashfs-root`). */
async function estrai(appimage: string): Promise<string> {
  const dove = mkdtempSync(join(tmpdir(), "algodesign-appimage-"));
  const x = await esegui([appimage, "--appimage-extract"], dove);
  const contenuto = join(dove, "squashfs-root");
  if (x.codice !== 0 || !existsSync(join(contenuto, "usr", "bin", "algodesign"))) rosso("PERCORSI", `l'estrazione dell'AppImage esce ${x.codice} senza usr/bin/algodesign (dettaglio nel log)`);
  return contenuto;
}

/** 3. I percorsi della macchina nei byte del programma. */
function percorsi(contenuto: string): void {
  const programma = readFileSync(join(contenuto, "usr", "bin", "algodesign"));
  const trovati = percorsiDellaMacchina.map((p) => ({ ...p, n: occorrenze(programma, p.percorso) })).filter((p) => p.n > 0);
  const deps = join(radice, "shell", "target", "release", "deps");
  const sonde = existsSync(deps) ? readdirSync(deps).filter((f) => /^tokio-[0-9a-f]+\.d$/.test(f)).map((f) => join(deps, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs) : [];
  const sonda = sonde[0];
  const acceso = sonda === undefined ? 0 : occorrenze(readFileSync(sonda), cartellaDiCargo.percorso);
  if (acceso === 0) rosso("PERCORSI", `controllo positivo SPENTO: nessuna occorrenza della cartella di Cargo in ${sonda ?? "(nessun file delle dipendenze di tokio)"}`);
  if (trovati.length > 0) rosso("PERCORSI", `il programma contiene ${trovati.map((p) => `${p.nome} (${p.percorso}) ${p.n} volte`).join(", ")}`);
  riga(`PERCORSI: VERDE | nel programma (${programma.length} byte) nessuno di ${percorsiDellaMacchina.map((p) => `${p.nome} (${p.percorso})`).join(", ")} | controllo positivo acceso (${acceso} occorrenze della cartella di Cargo in ${relative(radice, sonda!)})`);
}

/** Confronto di due versioni a numeri separati da punti. */
function confrontaVersioni(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** 4. La glibc che il programma chiede. */
async function glibc(contenuto: string): Promise<string> {
  const o = await esegui(["objdump", "-T", join(contenuto, "usr", "bin", "algodesign")]);
  const versioni = [...new Set(o.out.match(/GLIBC_[0-9.]+/g) ?? [])].map((v) => v.slice("GLIBC_".length)).sort(confrontaVersioni);
  if (o.codice !== 0 || versioni.length === 0) rosso("GLIBC", `objdump esce ${o.codice} con ${versioni.length} versioni di glibc (dettaglio nel log)`);
  const minima = versioni.at(-1)!;
  if (confrontaVersioni(minima, glibcPromessa) > 0) rosso("GLIBC", `il programma chiede glibc ${minima}, il LEGGIMI promette ${glibcPromessa}`);
  riga(`GLIBC: VERDE | il programma chiede glibc ${minima} (${versioni.length} versioni di simboli), il LEGGIMI promette ${glibcPromessa}`);
  return minima;
}

type LibrerieDiSistema = { pacchetti: string; versioni: string; copyright: Map<string, string>; comuni: string; librerie: number; sconosciute: number };

/** Il pacchetto di Ubuntu di ogni percorso dato, con `dpkg -S` (una chiamata sola: i percorsi senza pacchetto vanno
 * nell'errore, e l'uscita è 1, che qui non è un rosso). La riga è «pacchetto[:architettura][, altro]: percorso». */
async function pacchettiDi(percorsi: readonly string[]): Promise<Map<string, string>> {
  const trovati = new Map<string, string>();
  if (percorsi.length === 0) return trovati;
  const d = await esegui(["dpkg", "-S", ...percorsi]);
  for (const r of d.out.split("\n")) {
    const i = r.indexOf(": ");
    if (i < 0) continue;
    const percorso = r.slice(i + 2).trim();
    if (!trovati.has(percorso)) trovati.set(percorso, r.slice(0, i).split(", ")[0]!.split(":")[0]!);
  }
  return trovati;
}

/** 5. Le librerie di Ubuntu dentro l'AppImage, coi loro pacchetti, versioni e copyright. */
async function librerieDiSistema(contenuto: string): Promise<LibrerieDiSistema> {
  const nelContenuto = (readdirSync(contenuto, { recursive: true, withFileTypes: true }) as import("node:fs").Dirent[])
    .filter((v) => v.isFile())
    .map((v) => `/${relative(contenuto, join(v.parentPath, v.name)).split("\\").join("/")}`)
    .filter((p) => !p.startsWith("/usr/bin/") && /(\.so(\.|$)|\.xml$|\.compiled$|\.cache$)/.test(basename(p)))
    .sort();
  // Tre tentativi, come i moduli che l'AppImage tiene altrove: il percorso com'è, `/usr/lib/<modulo>` →
  // `/usr/lib/x86_64-linux-gnu/<modulo>`, il solo nome nelle due cartelle delle librerie.
  const pacchetto = new Map<string, string>();
  const prima = await pacchettiDi(nelContenuto);
  for (const p of nelContenuto) if (prima.has(p)) pacchetto.set(p, prima.get(p)!);
  const seconde = nelContenuto.filter((p) => !pacchetto.has(p) && p.startsWith("/usr/lib/")).map((p) => [p, `/usr/lib/x86_64-linux-gnu${p.slice("/usr/lib".length)}`] as const);
  const dopo = await pacchettiDi(seconde.map(([, q]) => q));
  for (const [p, q] of seconde) if (dopo.has(q)) pacchetto.set(p, dopo.get(q)!);
  const terze = nelContenuto.filter((p) => !pacchetto.has(p)).flatMap((p) => [`/usr/lib/x86_64-linux-gnu/${basename(p)}`, `/lib/x86_64-linux-gnu/${basename(p)}`].map((q) => [p, q] as const));
  const ultime = await pacchettiDi(terze.map(([, q]) => q));
  for (const [p, q] of terze) if (!pacchetto.has(p) && ultime.has(q)) pacchetto.set(p, ultime.get(q)!);

  const righe = nelContenuto.map((p) => `${p} ${pacchetto.get(p) ?? "SCONOSCIUTO"}`);
  const ignote = nelContenuto.filter((p) => !pacchetto.has(p));
  const ignoteVere = ignote.filter((p) => !p.endsWith(".cache") && !p.endsWith(".compiled"));
  if (ignoteVere.length > 0) rosso("LIBRERIE DI SISTEMA", `librerie senza pacchetto: ${ignoteVere.slice(0, 5).join(", ")}`);
  const nomiDeiPacchetti = [...new Set(pacchetto.values())].sort();
  if (nomiDeiPacchetti.length === 0) rosso("LIBRERIE DI SISTEMA", `nessun pacchetto per ${nelContenuto.length} librerie`);
  const versioni: string[] = [];
  const copyright = new Map<string, string>();
  for (const p of nomiDeiPacchetti) {
    const v = await esegui(["dpkg-query", "-W", "-f=${Version}", p]);
    if (v.codice !== 0 || v.out.trim() === "") rosso("LIBRERIE DI SISTEMA", `la versione di ${p}: dpkg-query esce ${v.codice}`);
    versioni.push(`${p} ${v.out.trim()}`);
    const c = `/usr/share/doc/${p}/copyright`;
    if (!existsSync(c)) rosso("LIBRERIE DI SISTEMA", `manca il copyright di ${p} (${c})`);
    copyright.set(p, c);
  }
  const comuni = "/usr/share/common-licenses";
  if (!existsSync(comuni) || readdirSync(comuni).length === 0) rosso("LIBRERIE DI SISTEMA", `${comuni} vuota o assente`);
  riga(`LIBRERIE DI SISTEMA: VERDE | ${nelContenuto.length} librerie, ${nomiDeiPacchetti.length} pacchetti, ognuno col copyright; senza pacchetto ${ignote.length}, tutte cache dei moduli`);
  return { pacchetti: `${righe.join("\n")}\n`, versioni: `${versioni.join("\n")}\n`, copyright, comuni, librerie: nelContenuto.length, sconosciute: ignote.length };
}

/** Le voci al primo livello di una cartella, con la barra in coda per le cartelle. */
const voci = (dir: string) => readdirSync(dir, { withFileTypes: true }).map((v) => (v.isDirectory() ? `${v.name}/` : v.name)).sort();

/** Tutti i file di una cartella, coi percorsi relativi in avanti, in ordine. */
const fileDi = (dir: string) =>
  (readdirSync(dir, { recursive: true, withFileTypes: true }) as import("node:fs").Dirent[])
    .filter((v) => v.isFile())
    .map((v) => relative(dir, join(v.parentPath, v.name)).split("\\").join("/"))
    .sort();

/** Il controllo del confronto: con una voce tolta e una in più dice tutte e due. */
function confrontoAcceso(trovate: readonly string[], attese: readonly string[], dove: string): string {
  const tolta = attese[0]!;
  const sonda = differenzeDallElenco([...trovate.filter((v) => v !== tolta), "sonda.txt"], attese);
  if (sonda.join("|") !== `manca ${tolta}|in più sonda.txt`) rosso("CARTELLA", `${dove}: il confronto non si accende: con una voce tolta e una in più dice ${JSON.stringify(sonda)}`);
  return sonda.join(", ");
}

/** 6. La cartella dell'archivio. */
async function componi(appimage: string, sistema: LibrerieDiSistema): Promise<void> {
  if (!existsSync(cartellaTesti!) || !statSync(cartellaTesti!).isDirectory()) rosso("CARTELLA", `--testi ${cartellaTesti}: non è una cartella`);
  if (existsSync(cartella)) {
    const estranee = differenzeDallElenco(voci(cartella), elencoDiLinux).filter((d) => d.startsWith("in più"));
    const datiPieni = existsSync(join(cartella, "data")) && readdirSync(join(cartella, "data")).length > 0;
    if (estranee.length > 0 || datiPieni) rosso("CARTELLA", `${cartella} c'è già e contiene altro (${[...estranee, ...(datiPieni ? ["data non vuota"] : [])].join(", ")}): non la cancello`);
    rmSync(cartella, { recursive: true });
  }
  const librerie = join(cartella, cartellaDelleLibrerieDiSistema);
  mkdirSync(join(cartella, "data"), { recursive: true });
  mkdirSync(librerie, { recursive: true });
  cpSync(appimage, join(cartella, "AlgoDesign.AppImage"));
  for (const f of ["LICENSE", "LICENSE-DOCS"]) cpSync(join(repository, f), join(cartella, f));
  const registro = readFileSync(join(repository, "CHANGELOG.md"), "utf8");
  if (!registro.includes(`\n## ${nomi.versione}, `)) rosso("CARTELLA", `CHANGELOG.md non ha la voce «## ${nomi.versione}, »`);
  if (registro.includes("SEGNAPOSTO")) rosso("CARTELLA", "CHANGELOG.md ha un SEGNAPOSTO rimasto");
  writeFileSync(join(cartella, "CHANGELOG.md"), registro);
  const data = dataMostrata(dataDiRilascio, "it");
  for (const [sorgente, destinazione] of Object.entries(testiDiLinux)) {
    const da = join(cartellaTesti!, sorgente);
    if (!existsSync(da)) rosso("CARTELLA", `manca il testo ${da}`);
    const testo = readFileSync(da, "utf8").replaceAll("{{versione}}", nomi.versione).replaceAll("{{data}}", data);
    const rimasto = /\{\{[^}]*\}\}?/.exec(testo);
    if (rimasto) rosso("CARTELLA", `${sorgente}: «${rimasto[0]}» non sostituito (si sostituiscono solo {{versione}} e {{data}})`);
    writeFileSync(join(cartella, destinazione), testo);
  }
  for (const d of documentiDelPacchetto) {
    const sorgente = join(repository, "docs", d);
    if (!existsSync(sorgente)) rosso("CARTELLA", `manca il documento ${sorgente}`);
    const testo = readFileSync(sorgente, "utf8");
    if (testo.includes("{{")) rosso("CARTELLA", `${relative(repository, sorgente)}: un «{{» nel documento, che si copia così com'è`);
    writeFileSync(join(cartella, d), testo);
  }
  const l = await licenzeDiTerzeParti(["x86_64-unknown-linux-gnu"], nomi.versione, esegui, rosso);
  writeFileSync(join(cartella, fileDelleLicenze), l.testo);
  writeFileSync(join(librerie, "pacchetti-di-sistema.txt"), sistema.pacchetti);
  writeFileSync(join(librerie, "versioni-dei-pacchetti.txt"), sistema.versioni);
  for (const [p, c] of sistema.copyright) cpSync(c, join(librerie, `${p}.copyright`), { dereference: true });
  cpSync(sistema.comuni, join(librerie, "licenze-comuni"), { recursive: true, dereference: true });
  for (const f of fileDi(cartella)) chmodSync(join(cartella, f), f === "AlgoDesign.AppImage" ? 0o755 : 0o644);

  const trovate = voci(cartella);
  const controllo = confrontoAcceso(trovate, elencoDiLinux, "primo livello");
  const differenze = differenzeDallElenco(trovate, elencoDiLinux);
  if (differenze.length > 0) rosso("CARTELLA", `le voci non sono quelle dell'elenco: ${differenze.join(", ")}`);
  const nelleLibrerie = voci(librerie);
  const atteseNelleLibrerie = ["LEGGIMI.md", "licenze-comuni/", "pacchetti-di-sistema.txt", "versioni-dei-pacchetti.txt", ...[...sistema.copyright.keys()].map((p) => `${p}.copyright`)].sort();
  confrontoAcceso(nelleLibrerie, atteseNelleLibrerie, cartellaDelleLibrerieDiSistema);
  const diverseNelleLibrerie = differenzeDallElenco(nelleLibrerie, atteseNelleLibrerie);
  if (diverseNelleLibrerie.length > 0) rosso("CARTELLA", `${cartellaDelleLibrerieDiSistema}: ${diverseNelleLibrerie.slice(0, 10).join(", ")}`);
  if (readdirSync(join(cartella, "data")).length > 0) rosso("CARTELLA", "data non è vuota");
  if ((statSync(join(cartella, "AlgoDesign.AppImage")).mode & 0o777) !== 0o755) rosso("CARTELLA", "l'AppImage non ha i permessi 0755");
  riga(
    `CARTELLA: VERDE | ${relative(repository, cartella)} con le ${trovate.length} voci dell'elenco (${trovate.join(", ")}) | ${cartellaDelleLibrerieDiSistema}/ con ${nelleLibrerie.length} voci (${sistema.copyright.size} copyright, ${fileDi(join(librerie, "licenze-comuni")).length} licenze comuni) | testi del ${data} | licenze di terze parti: ${l.js} librerie JavaScript, ${l.rust} Rust, ${l.testi} testi, ${Buffer.byteLength(l.testo)} byte | controllo positivo acceso (${controllo})`,
  );
}

/** 7. L'archivio, le due letture e l'impronta. */
async function comprimi(): Promise<string> {
  for (const f of [archivio, `${archivio}.sha256`]) rmSync(f, { force: true });
  const copia = mkdtempSync(join(tmpdir(), "algodesign-copia-"));
  try {
    cpSync(cartella, join(copia, nomi.cartellaNellArchivio), { recursive: true });
    const t = await esegui(["tar", "--sort=name", "--owner=0", "--group=0", "--numeric-owner", "-czf", archivio, nomi.cartellaNellArchivio], copia);
    if (t.codice !== 0 || !existsSync(archivio)) rosso("ARCHIVIO", `tar esce ${t.codice} (dettaglio nel log)`);
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
  const attesi = new Map(fileDi(cartella).map((f) => [`${nomi.cartellaNellArchivio}/${f}`, impronta(join(cartella, f))]));
  const estratta = mkdtempSync(join(tmpdir(), "algodesign-tar-"));
  try {
    const x = await esegui(["tar", "-xzf", archivio, "-C", estratta]);
    if (x.codice !== 0) rosso("ARCHIVIO", `l'estrazione esce ${x.codice} (dettaglio nel log)`);
    if (voci(estratta).join("|") !== `${nomi.cartellaNellArchivio}/`) rosso("ARCHIVIO", `estratto, dà ${JSON.stringify(voci(estratta))} invece della sola cartella ${nomi.cartellaNellArchivio}`);
    const dentro = join(estratta, nomi.cartellaNellArchivio);
    const letti = new Map(fileDi(dentro).map((f) => [`${nomi.cartellaNellArchivio}/${f}`, impronta(join(dentro, f))]));
    const diversi = differenzeDallElenco([...letti.keys()], [...attesi.keys()]);
    const altreImpronte = [...attesi].filter(([f, h]) => letti.has(f) && letti.get(f) !== h).map(([f]) => f);
    if (diversi.length > 0 || altreImpronte.length > 0) rosso("ARCHIVIO", `estratto col tar: ${[...diversi, ...altreImpronte.map((f) => `diverso ${f}`)].slice(0, 10).join(", ")}`);
    if ((statSync(join(dentro, "AlgoDesign.AppImage")).mode & 0o777) !== 0o755) rosso("ARCHIVIO", "estratta col tar, l'AppImage non è 0755");
    if (!existsSync(join(dentro, "data")) || readdirSync(join(dentro, "data")).length > 0) rosso("ARCHIVIO", "estratto col tar, data/ manca o non è vuota");
  } finally {
    rmSync(estratta, { recursive: true, force: true });
  }
  // La seconda lettura, con Python: ogni voce col tipo, i permessi e l'impronta del contenuto, una per riga.
  const lettore = [
    "import hashlib, sys, tarfile",
    "with tarfile.open(sys.argv[1]) as t:",
    "    for m in t.getmembers():",
    "        h = hashlib.sha256(t.extractfile(m).read()).hexdigest() if m.isfile() else '-'",
    "        print(m.name, 'd' if m.isdir() else 'f' if m.isfile() else 'altro', oct(m.mode & 0o777), h, sep='\\t')",
  ].join("\n");
  const p = await esegui(["python3", "-c", lettore, archivio]);
  if (p.codice !== 0) rosso("ARCHIVIO", `la lettura con Python esce ${p.codice} (dettaglio nel log)`);
  const lette = p.out.split("\n").filter((r) => r !== "").map((r) => r.split("\t") as [string, string, string, string]);
  const fileLetti = new Map(lette.filter((r) => r[1] === "f").map((r) => [r[0], r[3]]));
  const altro = lette.filter((r) => r[1] === "altro").map((r) => r[0]);
  const cartelleLette = lette.filter((r) => r[1] === "d").map((r) => r[0]);
  const diversiConPython = differenzeDallElenco([...fileLetti.keys()], [...attesi.keys()]);
  const impronteDiverse = [...attesi].filter(([f, h]) => fileLetti.has(f) && fileLetti.get(f) !== h).map(([f]) => f);
  const modo = lette.find((r) => r[0] === `${nomi.cartellaNellArchivio}/AlgoDesign.AppImage`)?.[2];
  if (diversiConPython.length > 0 || impronteDiverse.length > 0 || altro.length > 0 || modo !== "0o755" || !cartelleLette.includes(`${nomi.cartellaNellArchivio}/data`))
    rosso("ARCHIVIO", `letto con Python: ${JSON.stringify({ diversi: diversiConPython.slice(0, 10), impronteDiverse, altro, modoDellAppImage: modo, data: cartelleLette.includes(`${nomi.cartellaNellArchivio}/data`) })}`);
  const sha = impronta(archivio);
  writeFileSync(`${archivio}.sha256`, `${sha}  ${nomi.archivio}\n`);
  riga(`ARCHIVIO: VERDE | ${relative(repository, archivio)} ${statSync(archivio).size} byte; estratto col tar e letto con Python: la cartella ${nomi.cartellaNellArchivio}/, gli stessi ${attesi.size} file con le stesse impronte, l'AppImage 0755, data/ vuota (${lette.length} voci lette) | sha256 ${sha} in ${nomi.archivio}.sha256`);
  return sha;
}

riga(`ARCHIVIO di AlgoDesign ${nomi.versione} per ${piattaforma}${prova ? " (di prova)" : ""} — inizio ${new Date().toISOString()} | log ${fileLog}`);
try {
  if (process.platform !== "linux") rosso("SISTEMA", `l'archivio per Linux si compone su Linux, non su ${process.platform}`);
  const { descritto, prima } = await albero();
  const appimage = await costruisci();
  await alberoUguale(prima, "il build");
  const contenuto = await estrai(appimage);
  let sistema: LibrerieDiSistema;
  try {
    percorsi(contenuto);
    await glibc(contenuto);
    sistema = await librerieDiSistema(contenuto);
  } finally {
    rmSync(join(contenuto, ".."), { recursive: true, force: true });
  }
  await componi(appimage, sistema);
  await alberoUguale(prima, "le licenze e la cartella");
  const sha = await comprimi();
  riga(`ESITO: ${prova ? "VERDE, DI PROVA" : "VERDE"} | ${relative(repository, cartella)} con AlgoDesign.AppImage sha256 ${impronta(join(cartella, "AlgoDesign.AppImage"))} | ${nomi.archivio} sha256 ${sha} | da ${descritto}`);
} catch (e) {
  riga(e instanceof Rosso ? e.message : `ERRORE: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  riga("ESITO: ROSSO");
  process.exit(1);
}
