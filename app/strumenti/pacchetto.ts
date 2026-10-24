// Il pacchetto della release, solo Windows: `bun run pacchetto --testi <cartella> [--prova [--senza-build]]`.
//
// 1. ALBERO: il commit da cui nasce il pacchetto. Con file modificati o nuovi rispetto al commit, o con un commit che non
//    ha l'etichetta `v<versione>`, è rosso, se non con `--prova`: il pacchetto si dice allora di prova, non è una
//    release, e va in `dist/prova/` (mai sopra una release).
//    Lo stato si rilegge dopo il build e le licenze (un comando può riscrivere un file tracciato, come `Cargo.lock`):
//    diverso da quello di prima, è rosso.
// 2. BUILD: cancella l'uscita del build dell'interfaccia (`dist/` dell'app, che Tauri incorpora tutta) e costruisce
//    l'eseguibile di release (`bun tauri build --no-bundle`) coi percorsi della macchina rimappati
//    (`--remap-path-prefix` per la cartella di Cargo, il profilo dell'utente e il repository); con `--senza-build`,
//    ammesso solo con `--prova`, prende quello che c'è. Le proprietà dell'eseguibile: la versione (ProductVersion) è
//    quella di `package.json`, la società (CompanyName) e il copyright (LegalCopyright) quelli di `tauri.conf.json`.
// 3. PERCORSI: nei byte dell'eseguibile non c'è il profilo dell'utente, né la cartella di Cargo, né il repository (in
//    ASCII e in UTF-16). Controllo positivo: lo stesso rilevatore li trova nel file delle dipendenze di `tokio` che il
//    build lascia in `target/release/deps` (un file prodotto, che porta i percorsi veri).
// 4. LICENZE: compone `LICENZE-DI-TERZE-PARTI` dalle librerie che entrano nel prodotto: quelle JavaScript che il build
//    dell'interfaccia impacchetta (lette dal suo metafile), i crate Rust dell'eseguibile per Windows (`cargo metadata`,
//    le sole dipendenze normali, anche quelle che servono solo a compilare), la libreria standard di Rust (coi testi
//    della toolchain e l'elenco del codice di terzi che porta, `COPYRIGHT-library.html`) e le librerie che un crate
//    collega senza esserne l'autore (la libreria di Microsoft che carica WebView2). Ogni testo di licenza compare una
//    volta, coi numeri che lo richiamano dall'elenco. Una libreria senza file di licenza prende il testo da
//    `licenze-aggiunte/` (con la fonte); se non c'è nemmeno lì, è rosso.
// 5. CARTELLA: `dist/<versione>/` alla radice del repository (`dist/prova/<versione>/` con `--prova`), con le voci di `elencoDelPacchetto`; i testi per l'utente
//    dalla cartella di `--testi`, con `{{versione}}` e `{{data}}` sostituiti (un `{{` rimasto è rosso); la guida per lo
//    studente da `docs/` del repository, così com'è (vale per la versione del prodotto; un `{{` è rosso); `CHANGELOG.md`
//    dalla radice del repository, così com'è: senza la voce della versione («## <versione>, »), o con un
//    `SEGNAPOSTO` rimasto, è rosso. Le voci
//    composte si confrontano con l'elenco nei due versi. Controllo positivo: lo stesso confronto, con una voce tolta e
//    una in più, le dice tutte e due.
// 6. ZIP: `dist/AlgoDesign-<versione>-windows-x64.zip`, con dentro la cartella `AlgoDesign-<versione>`, fatto col `tar`
//    di Windows. Estratto in una cartella temporanea, ha le voci dell'elenco e ogni file ha l'impronta di quello della
//    cartella. Accanto, `<zip>.sha256` con l'impronta dello zip.
//
// Una cartella o uno zip della stessa versione si sostituiscono, ma la cartella solo se contiene le voci dell'elenco e
// `data` è vuota (chi ha avviato il programma da lì ci trova le sue preferenze: si cancellano a mano).
//
// Che cosa NON guarda:
// - che l'eseguibile parta e funzioni: lo prova `bun run prova-portabile`;
// - che i testi per l'utente dicano il vero: si leggono;
// - che la licenza dichiarata da una libreria sia quella giusta: si riporta ciò che la libreria dichiara, coi file di
//   licenza che porta o quelli di `licenze-aggiunte/`;
// - le librerie del sistema che l'eseguibile usa senza portarle con sé (WebView2, le librerie di Windows);
// - i file ignorati da git che entrano nel build (`node_modules`, la cache di Cargo): vengono dai lockfile tracciati,
//   che `bun install` e Cargo seguono, ma lo strumento non lo verifica;
// - nei byte dell'eseguibile, altri dati della macchina oltre ai tre percorsi (un nome di computer, una data).
//
// Gli exit code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.

import { appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { dataMostrata } from "../ui/prodotto";
import { differenzeDallElenco, documentiDelPacchetto, elencoDelPacchetto, nomiDelPacchetto, testiDelPacchetto } from "./elenco-del-pacchetto";
import { collegate, testiAggiunti } from "./licenze-aggiunte";

const argomenti = process.argv.slice(2);
const posTesti = argomenti.indexOf("--testi");
const cartellaTesti = posTesti >= 0 ? argomenti[posTesti + 1] : undefined;
const altri = argomenti.filter((_, i) => i !== posTesti && i !== posTesti + 1);
const senzaBuild = altri.includes("--senza-build");
const prova = altri.includes("--prova");
// Senza build l'eseguibile non è legato al commit: solo per provare lo strumento.
if (cartellaTesti === undefined || cartellaTesti.startsWith("--") || altri.some((a) => a !== "--senza-build" && a !== "--prova") || new Set(altri).size !== altri.length || (senzaBuild && !prova)) {
  console.error(`uso: pacchetto --testi <cartella con ${testiDelPacchetto.join(", ")}> [--prova [--senza-build]] (ricevuti: ${JSON.stringify(argomenti)})`);
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

/** I percorsi della macchina da togliere dall'eseguibile: la cartella di Cargo, il profilo dell'utente, il repository. */
const percorsiDellaMacchina = (() => {
  const casa = homedir();
  const cargo = process.env.CARGO_HOME ?? join(casa, ".cargo");
  // Fra due prefissi che coincidono vince l'ultimo: la cartella di Cargo, che sta nel profilo, va dopo.
  return [
    { nome: "il profilo dell'utente", percorso: casa, al: "/profilo" },
    { nome: "il repository", percorso: repository, al: "/algodesign" },
    { nome: "la cartella di Cargo", percorso: cargo, al: "/cargo" },
  ];
})();
const cartellaDiCargo = percorsiDellaMacchina.find((p) => p.al === "/cargo")!;

/** 2. L'eseguibile e le sue proprietà. */
async function eseguibile(): Promise<string> {
  const rilascio = join(radice, "shell", "target", "release", "algodesign.exe");
  if (senzaBuild) {
    if (!existsSync(rilascio)) rosso("BUILD", `--senza-build ma ${relative(radice, rilascio)} non esiste`);
  } else {
    // Tauri incorpora tutta la cartella del build dell'interfaccia: un file rimasto da un build vecchio ci finirebbe.
    rmSync(join(radice, "dist"), { recursive: true, force: true });
    const inizio = Date.now();
    // I percorsi della macchina rimappati: senza, l'eseguibile porta quelli dei sorgenti delle librerie (i messaggi di
    // panico). Gli argomenti separati dal carattere 0x1f, come vuole Cargo, perché un percorso può avere spazi.
    const flags = percorsiDellaMacchina.map((p) => `--remap-path-prefix=${p.percorso}=${p.al}`).join(String.fromCharCode(0x1f));
    const b = await esegui([process.execPath, "tauri", "build", "--no-bundle"], radice, { CARGO_ENCODED_RUSTFLAGS: flags });
    if (b.codice !== 0) rosso("BUILD", `exit ${b.codice} (dettaglio nel log)`);
    if (!existsSync(rilascio) || statSync(rilascio).mtime.getTime() < inizio) rosso("BUILD", `exit 0 ma ${relative(radice, rilascio)} non è stato riscritto`);
  }
  const proprieta = ["ProductVersion", "CompanyName", "LegalCopyright"] as const;
  const p = await esegui(["powershell", "-NoProfile", "-Command", `[Console]::OutputEncoding = [Text.Encoding]::UTF8; $v = (Get-Item -LiteralPath '${rilascio}').VersionInfo; ${proprieta.map((x) => `$v.${x}`).join("; ")}`]);
  const [versioneDellEseguibile, societa, copyright] = p.out.replace(/\r/g, "").split("\n");
  const attese = [nomi.versione, configurazione.bundle.publisher, configurazione.bundle.copyright];
  const lette = [versioneDellEseguibile, societa, copyright];
  if (p.codice !== 0 || attese.some((a, i) => a === undefined || a !== lette[i]))
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

/** 3. I percorsi della macchina nei byte dell'eseguibile. */
function percorsi(rilascio: string): void {
  const nellEseguibile = readFileSync(rilascio);
  const trovati = percorsiDellaMacchina.map((p) => ({ ...p, n: occorrenze(nellEseguibile, p.percorso) })).filter((p) => p.n > 0);
  // Controllo positivo: il file delle dipendenze di `tokio`, il più recente, porta i percorsi veri della cartella di Cargo.
  const deps = join(radice, "shell", "target", "release", "deps");
  const sonde = existsSync(deps) ? readdirSync(deps).filter((f) => /^tokio-[0-9a-f]+\.d$/.test(f)).map((f) => join(deps, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs) : [];
  const sonda = sonde[0];
  const acceso = sonda === undefined ? 0 : occorrenze(readFileSync(sonda), cartellaDiCargo.percorso);
  if (acceso === 0) rosso("PERCORSI", `controllo positivo SPENTO: nessuna occorrenza della cartella di Cargo in ${sonda ?? "(nessun file delle dipendenze di tokio)"}`);
  if (trovati.length > 0) rosso("PERCORSI", `l'eseguibile contiene ${trovati.map((p) => `${p.nome} ${p.n} volte`).join(", ")}`);
  riga(`PERCORSI: VERDE | nell'eseguibile nessuno di ${percorsiDellaMacchina.map((p) => p.nome).join(", ")} | controllo positivo acceso (${acceso} occorrenze della cartella di Cargo in ${relative(radice, sonda!)})`);
}

type Libreria = { nome: string; versione: string; licenza: string; repository: string | null; testi: number[]; fonte?: string };

/** Il testo di una pagina HTML: senza i marcatori, con un a capo per paragrafo, titolo e voce, le entità sciolte. */
function testoDaHtml(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(br|\/p|\/h[1-6]|\/li|\/pre|\/div|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((r) => r.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** I file di licenza di una cartella di pacchetto, coi testi normalizzati. */
function fileDiLicenza(cartellaDelPacchetto: string): { file: string; testo: string }[] {
  return readdirSync(cartellaDelPacchetto)
    .filter((f) => /^(licen[cs]e|copying|notice|copyright)/i.test(f) && lstatSync(join(cartellaDelPacchetto, f)).isFile())
    .sort()
    .map((f) => ({ file: f, testo: readFileSync(join(cartellaDelPacchetto, f), "utf8").replace(/\r\n/g, "\n").trim() }));
}

/** 3. Il file delle licenze di terze parti. */
async function licenze(): Promise<{ testo: string; js: number; rust: number; testi: number }> {
  const testi: string[] = [];
  const usatoDa: string[][] = [];
  const numero = (testo: string, chi: string): number => {
    let i = testi.indexOf(testo);
    if (i < 0) {
      i = testi.push(testo) - 1;
      usatoDa.push([]);
    }
    usatoDa[i]!.push(chi);
    return i + 1;
  };
  const aggiunte = join(import.meta.dir, "licenze-aggiunte");
  const leggiAggiunto = (f: string) => readFileSync(join(aggiunte, f), "utf8").replace(/\r\n/g, "\n").trim();
  const senzaTesto: string[] = [];
  /** I testi di una libreria: i suoi file di licenza o, se non ne ha, quelli di `licenze-aggiunte/`. */
  const testiDi = (nome: string, chi: string, cartellaDellaLibreria: string): { testi: number[]; fonte?: string } => {
    const propri = fileDiLicenza(cartellaDellaLibreria);
    if (propri.length > 0) return { testi: propri.map((f) => numero(f.testo, `${f.file} di ${chi}`)) };
    const a = Object.hasOwn(testiAggiunti, nome) ? testiAggiunti[nome] : undefined;
    if (a === undefined) {
      senzaTesto.push(chi);
      return { testi: [] };
    }
    return { testi: a.file.map((f) => numero(leggiAggiunto(f), `${f} di ${chi}`)), fonte: a.fonte };
  };

  // Le librerie JavaScript: quelle da cui il build dell'interfaccia prende almeno un modulo.
  const temporanea = mkdtempSync(join(tmpdir(), "algodesign-metafile-"));
  const meta = join(temporanea, "meta.json");
  let js: Libreria[] = [];
  try {
    const b = await esegui([process.execPath, "build", "./index.html", "--outdir", join(temporanea, "dist"), "--production", `--metafile=${meta}`]);
    if (b.codice !== 0 || !existsSync(meta)) rosso("LICENZE", `il build dell'interfaccia col metafile esce ${b.codice} (dettaglio nel log)`);
    const ingressi = Object.keys(JSON.parse(readFileSync(meta, "utf8")).inputs as Record<string, unknown>);
    const pacchetti = new Set<string>();
    for (const i of ingressi) {
      const parti = i.replaceAll("\\", "/").split("node_modules/");
      if (parti.length < 2) continue;
      const [primo, secondo] = parti[parti.length - 1]!.split("/");
      pacchetti.add(primo!.startsWith("@") ? `${primo}/${secondo}` : primo!);
    }
    if (pacchetti.size === 0) rosso("LICENZE", `nessuna libreria JavaScript fra i ${ingressi.length} moduli del build: il metafile non dice ciò che ci si aspetta`);
    js = [...pacchetti].sort().map((nome) => {
      const dir = join(radice, "node_modules", nome);
      const pj = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      const repo = typeof pj.repository === "string" ? pj.repository : (pj.repository?.url ?? null);
      return {
        nome,
        versione: pj.version,
        licenza: typeof pj.license === "string" ? pj.license : JSON.stringify(pj.license ?? null),
        repository: repo,
        ...testiDi(nome, nome, dir),
      };
    });
  } finally {
    rmSync(temporanea, { recursive: true, force: true });
  }

  // I crate Rust dell'eseguibile per Windows: le dipendenze normali, a partire dal guscio.
  const c = await esegui(["cargo", "metadata", "--format-version", "1", "--filter-platform", "x86_64-pc-windows-msvc", "--manifest-path", join(radice, "shell", "Cargo.toml")]);
  if (c.codice !== 0) rosso("LICENZE", `cargo metadata esce ${c.codice} (dettaglio nel log)`);
  const md = JSON.parse(c.out) as {
    packages: { id: string; name: string; version: string; license: string | null; license_file: string | null; repository: string | null; manifest_path: string }[];
    resolve: { root: string; nodes: { id: string; deps: { pkg: string; dep_kinds: { kind: string | null }[] }[] }[] };
  };
  const nodi = new Map(md.resolve.nodes.map((n) => [n.id, n]));
  const pacchettiRust = new Map(md.packages.map((p) => [p.id, p]));
  const visti = new Set<string>();
  const coda = [md.resolve.root];
  while (coda.length > 0) {
    const id = coda.pop()!;
    if (visti.has(id)) continue;
    visti.add(id);
    for (const d of nodi.get(id)?.deps ?? []) if (d.dep_kinds.some((k) => k.kind === null)) coda.push(d.pkg);
  }
  visti.delete(md.resolve.root);
  if (visti.size === 0) rosso("LICENZE", "nessun crate Rust fra le dipendenze del guscio");
  const rust: Libreria[] = [...visti]
    .map((id) => pacchettiRust.get(id)!)
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
    .map((p) => ({
      nome: p.name,
      versione: p.version,
      licenza: p.license ?? `nel file ${p.license_file}`,
      repository: p.repository,
      ...testiDi(p.name, `${p.name} ${p.version}`, dirname(p.manifest_path)),
    }));

  // Le librerie che un crate collega dentro l'eseguibile senza esserne l'autore.
  for (const k of collegate) {
    if (!rust.some((l) => l.nome === k.dentro)) continue;
    rust.push({ nome: k.nome, versione: k.versione, licenza: k.licenza, repository: k.repository, testi: k.file.map((f) => numero(leggiAggiunto(f), `${f} di ${k.nome}, collegata da ${k.dentro}`)) });
  }

  // La libreria standard di Rust, che entra in ogni eseguibile: i testi dalla cartella dei documenti della toolchain, e
  // gli avvisi del codice di terzi che porta (`COPYRIGHT-library.html`), in testo.
  const rustc = await esegui(["rustc", "--version"]);
  const sysroot = await esegui(["rustc", "--print", "sysroot"]);
  const documenti = join(sysroot.out.trim(), "share", "doc", "rust");
  const standard = ["MIT.txt", "Apache-2.0.txt"].map((f) => join(documenti, "licenses", f));
  const avvisiDellaStandard = join(documenti, "COPYRIGHT-library.html");
  if (rustc.codice !== 0 || [...standard, avvisiDellaStandard].some((f) => !existsSync(f))) rosso("LICENZE", `mancano i testi delle licenze della libreria standard di Rust in ${documenti}`);
  const versioneDiRust = /^rustc (\S+)/.exec(rustc.out.trim())?.[1] ?? rustc.out.trim();
  rust.push({
    nome: "libreria standard di Rust (std)",
    versione: versioneDiRust,
    licenza: "MIT OR Apache-2.0, e le licenze del codice di terzi che porta",
    repository: "https://github.com/rust-lang/rust",
    testi: [
      ...standard.map((f) => numero(readFileSync(f, "utf8").replace(/\r\n/g, "\n").trim(), `la libreria standard di Rust`)),
      numero(testoDaHtml(readFileSync(avvisiDellaStandard, "utf8")), `COPYRIGHT-library.html della libreria standard di Rust ${versioneDiRust}`),
    ],
  });
  if (senzaTesto.length > 0) rosso("LICENZE", `librerie senza file di licenza e senza una voce in licenze-aggiunte.ts: ${senzaTesto.join(", ")}`);

  const voce = (l: Libreria) =>
    `${l.nome} ${l.versione}, licenza ${l.licenza}${l.repository ? `, ${l.repository}` : ""}: testo ${l.testi.map((n) => `[${n}]`).join(" ")}${l.fonte ? ` (la libreria non porta il testo: preso da ${l.fonte})` : ""}`;
  const titolo = `AlgoDesign ${nomi.versione}: licenze di terze parti`;
  const parti = [
    titolo,
    "=".repeat(titolo.length),
    "",
    "AlgoDesign usa librerie scritte da altri, ognuna con la sua licenza. Per ogni libreria ci sono il nome, la versione,",
    "la licenza che dichiara, il suo repository e i numeri dei testi della licenza, che seguono l'elenco. Un testo uguale",
    "per più librerie compare una volta sola.",
    "",
    `L'interfaccia (JavaScript): ${js.length} librerie`,
    "",
    ...js.map(voce),
    "",
    `Il programma (Rust): ${rust.length} librerie`,
    "",
    ...rust.map(voce),
    "",
    "Testi delle licenze",
    "===================",
    ...testi.flatMap((t, i) => {
      const da = usatoDa[i]!;
      const intestazione = `[${i + 1}] ${da[0]}${da.length > 1 ? ` e altre ${da.length - 1} librerie` : ""}`;
      return ["", intestazione, "-".repeat(intestazione.length), "", t];
    }),
    "",
  ];
  return { testo: parti.join("\n"), js: js.length, rust: rust.length, testi: testi.length };
}

/** Le voci al primo livello di una cartella, con la barra in coda per le cartelle. */
const voci = (dir: string) => readdirSync(dir, { withFileTypes: true }).map((v) => (v.isDirectory() ? `${v.name}/` : v.name)).sort();

/** 4. La cartella del pacchetto. */
async function componi(rilascio: string): Promise<void> {
  if (!lstatSync(cartellaTesti!, { throwIfNoEntry: false })?.isDirectory()) rosso("CARTELLA", `--testi ${cartellaTesti}: non è una cartella`);
  if (existsSync(cartella)) {
    const estranee = differenzeDallElenco(voci(cartella)).filter((d) => d.startsWith("in più"));
    const datiPieni = existsSync(join(cartella, "data")) && readdirSync(join(cartella, "data")).length > 0;
    if (estranee.length > 0 || datiPieni) rosso("CARTELLA", `${cartella} c'è già e contiene altro (${[...estranee, ...(datiPieni ? ["data non vuota"] : [])].join(", ")}): non la cancello`);
    rmSync(cartella, { recursive: true });
  }
  mkdirSync(join(cartella, "data"), { recursive: true });
  cpSync(rilascio, join(cartella, "AlgoDesign.exe"));
  cpSync(join(repository, "LICENSE"), join(cartella, "LICENSE"));
  cpSync(join(repository, "LICENSE-DOCS"), join(cartella, "LICENSE-DOCS"));
  const registro = readFileSync(join(repository, "CHANGELOG.md"), "utf8");
  if (!registro.includes(`\n## ${nomi.versione}, `)) rosso("CARTELLA", `CHANGELOG.md non ha la voce «## ${nomi.versione}, »`);
  if (registro.includes("SEGNAPOSTO")) rosso("CARTELLA", "CHANGELOG.md ha un SEGNAPOSTO rimasto");
  writeFileSync(join(cartella, "CHANGELOG.md"), registro);
  const data = dataMostrata(dataDiRilascio, "it");
  for (const t of testiDelPacchetto) {
    const sorgente = join(cartellaTesti!, t);
    if (!existsSync(sorgente)) rosso("CARTELLA", `manca il testo ${sorgente}`);
    const testo = readFileSync(sorgente, "utf8").replaceAll("{{versione}}", nomi.versione).replaceAll("{{data}}", data);
    const rimasto = /\{\{[^}]*\}\}?/.exec(testo);
    if (rimasto) rosso("CARTELLA", `${t}: «${rimasto[0]}» non sostituito (si sostituiscono solo {{versione}} e {{data}})`);
    writeFileSync(join(cartella, t), testo);
  }
  for (const d of documentiDelPacchetto) {
    const sorgente = join(repository, "docs", d);
    if (!existsSync(sorgente)) rosso("CARTELLA", `manca il documento ${sorgente}`);
    const testo = readFileSync(sorgente, "utf8");
    if (testo.includes("{{")) rosso("CARTELLA", `${relative(repository, sorgente)}: un «{{» nel documento, che si copia così com'è`);
    writeFileSync(join(cartella, d), testo);
  }
  const l = await licenze();
  writeFileSync(join(cartella, "LICENZE-DI-TERZE-PARTI"), l.testo);

  const trovate = voci(cartella);
  const differenze = differenzeDallElenco(trovate);
  // Controllo positivo: lo stesso confronto sa dire una voce che manca e una in più.
  const sonda = differenzeDallElenco([...trovate.filter((v) => v !== "LICENSE-DOCS"), "sonda.txt"]);
  if (sonda.join("|") !== "manca LICENSE-DOCS|in più sonda.txt") rosso("CARTELLA", `il confronto con l'elenco non si accende: con una voce tolta e una in più dice ${JSON.stringify(sonda)}`);
  if (differenze.length > 0) rosso("CARTELLA", `le voci non sono quelle dell'elenco: ${differenze.join(", ")}`);
  if (readdirSync(join(cartella, "data")).length > 0) rosso("CARTELLA", "data non è vuota");
  riga(
    `CARTELLA: VERDE | ${relative(repository, cartella)} con le ${trovate.length} voci dell'elenco (${trovate.join(", ")}) | testi del ${data} | licenze di terze parti: ${l.js} librerie JavaScript, ${l.rust} Rust, ${l.testi} testi, ${Buffer.byteLength(l.testo)} byte | controllo positivo acceso (${sonda.join(", ")})`,
  );
}

/** 5. Lo zip, la prova dell'estrazione e l'impronta. */
async function comprimi(): Promise<string> {
  for (const f of [zip, `${zip}.sha256`]) rmSync(f, { force: true });
  // Il `tar` di Windows non rinomina i percorsi (`-s` non c'è): lo zip si fa da una copia col nome che deve avere dentro.
  const copia = mkdtempSync(join(tmpdir(), "algodesign-copia-"));
  try {
    cpSync(cartella, join(copia, nomi.cartellaNelloZip), { recursive: true });
    const z = await esegui([tar, "-a", "-c", "-f", zip, nomi.cartellaNelloZip], copia);
    if (z.codice !== 0 || !existsSync(zip)) rosso("ZIP", `tar esce ${z.codice} (dettaglio nel log)`);
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
  const estratta = mkdtempSync(join(tmpdir(), "algodesign-zip-"));
  try {
    const x = await esegui([tar, "-x", "-f", zip, "-C", estratta]);
    if (x.codice !== 0) rosso("ZIP", `l'estrazione esce ${x.codice} (dettaglio nel log)`);
    const radici = voci(estratta);
    if (radici.join("|") !== `${nomi.cartellaNelloZip}/`) rosso("ZIP", `estratto, lo zip dà ${JSON.stringify(radici)} invece della sola cartella ${nomi.cartellaNelloZip}`);
    const dentro = join(estratta, nomi.cartellaNelloZip);
    const differenze = differenzeDallElenco(voci(dentro));
    if (differenze.length > 0) rosso("ZIP", `le voci estratte non sono quelle dell'elenco: ${differenze.join(", ")}`);
    const diverse = elencoDelPacchetto.filter((v) => !v.endsWith("/") && impronta(join(dentro, v)) !== impronta(join(cartella, v)));
    if (diverse.length > 0) rosso("ZIP", `file estratti diversi da quelli della cartella: ${diverse.join(", ")}`);
    if (readdirSync(join(dentro, "data")).length > 0) rosso("ZIP", "data estratta non è vuota");
  } finally {
    rmSync(estratta, { recursive: true, force: true });
  }
  const sha = impronta(zip);
  writeFileSync(`${zip}.sha256`, `${sha}  ${nomi.zip}\n`);
  riga(`ZIP: VERDE | ${relative(repository, zip)} ${statSync(zip).size} byte, estratto dà ${nomi.cartellaNelloZip}/ con le voci dell'elenco e gli stessi file | sha256 ${sha} in ${nomi.zip}.sha256`);
  return sha;
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
  const sha = await comprimi();
  riga(
    `ESITO: ${prova ? `VERDE, DI PROVA${senzaBuild ? ", SENZA BUILD" : ""}` : "VERDE"} | ${relative(repository, cartella)} con AlgoDesign.exe sha256 ${impronta(join(cartella, "AlgoDesign.exe"))} | ${nomi.zip} sha256 ${sha} | da ${descritto}`,
  );
} catch (e) {
  riga(e instanceof Rosso ? e.message : `ERRORE: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  riga("ESITO: ROSSO");
  process.exit(1);
}
