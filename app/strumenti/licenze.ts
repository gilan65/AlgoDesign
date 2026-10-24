// Il file delle licenze di terze parti del pacchetto, per le piattaforme date: le librerie JavaScript che il build
// dell'interfaccia impacchetta (lette dal suo metafile), i crate Rust dell'eseguibile per quelle piattaforme (`cargo
// metadata --filter-platform`, le sole dipendenze normali, anche quelle che servono solo a compilare), la libreria
// standard di Rust (coi testi della toolchain e l'elenco del codice di terzi che porta, `COPYRIGHT-library.html`) e le
// librerie che un crate collega senza esserne l'autore (la libreria di Microsoft che carica WebView2). Ogni testo di
// licenza compare una volta, coi numeri che lo richiamano dall'elenco. Una libreria senza file di licenza prende il
// testo da `licenze-aggiunte/` (con la fonte); se non c'è nemmeno lì, è rosso.
//
// Lo usa `pacchetto.ts` per Windows; da riga di comando compone il file per altre piattaforme:
//   bun ./strumenti/licenze.ts --piattaforme <triple>[,<triple>] --uscita <file>
// per esempio `aarch64-apple-darwin,x86_64-apple-darwin` per l'app universale del Mac, `x86_64-unknown-linux-gnu` per
// Linux. Da riga di comando non costruisce l'eseguibile: le licenze vengono dai lockfile, non dal build.
//
// Che cosa NON guarda:
// - che la licenza dichiarata da una libreria sia quella giusta: si riporta ciò che la libreria dichiara, coi file di
//   licenza che porta o quelli di `licenze-aggiunte/`;
// - le librerie del sistema che l'eseguibile usa senza portarle con sé (WebView2 e le librerie di Windows, WebKitGTK e
//   le altre di Linux, i framework di macOS);
// - i file ignorati da git che entrano nel build (`node_modules`, la cache di Cargo).
//
// Gli exit code si leggono dal processo avviato (`await proc.exited`), mai attraverso una pipe.

import { existsSync, lstatSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { nomiDelPacchetto } from "./elenco-del-pacchetto";
import { collegate, testiAggiunti } from "./licenze-aggiunte";

export type Esegui = (cmd: string[], cwd?: string) => Promise<{ codice: number; out: string; err: string }>;
export type Rosso = (clausola: string, motivo: string) => never;

type Libreria = { nome: string; versione: string; licenza: string; repository: string | null; testi: number[]; fonte?: string };

const radice = join(import.meta.dir, "..");

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

/** Il file delle licenze di terze parti per le piattaforme date (triple di Rust), col titolo della versione. */
export async function licenzeDiTerzeParti(
  piattaforme: readonly string[],
  versione: string,
  esegui: Esegui,
  rosso: Rosso,
): Promise<{ testo: string; js: number; rust: number; testi: number }> {
  if (piattaforme.length === 0) rosso("LICENZE", "nessuna piattaforma");
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
    const b = await esegui([process.execPath, "build", "./index.html", "--outdir", join(temporanea, "dist"), "--production", `--metafile=${meta}`], radice);
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

  // I crate Rust dell'eseguibile per le piattaforme date: le dipendenze normali, a partire dal guscio.
  const c = await esegui(["cargo", "metadata", "--format-version", "1", ...piattaforme.flatMap((p) => ["--filter-platform", p]), "--manifest-path", join(radice, "shell", "Cargo.toml")], radice);
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
  const rustc = await esegui(["rustc", "--version"], radice);
  const sysroot = await esegui(["rustc", "--print", "sysroot"], radice);
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
  const titolo = `AlgoDesign ${versione}: licenze di terze parti`;
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

if (import.meta.main) {
  const argomenti = process.argv.slice(2);
  const valore = (nome: string) => {
    const i = argomenti.indexOf(nome);
    return i >= 0 && argomenti[i + 1] !== undefined && !argomenti[i + 1]!.startsWith("--") ? argomenti[i + 1] : undefined;
  };
  const piattaforme = (valore("--piattaforme") ?? "").split(",").filter((p) => p !== "");
  const uscita = valore("--uscita");
  if (piattaforme.length === 0 || uscita === undefined || argomenti.length !== 4) {
    console.error(`uso: licenze --piattaforme <triple>[,<triple>] --uscita <file> (ricevuti: ${JSON.stringify(argomenti)})`);
    process.exit(2);
  }
  const esegui: Esegui = async (cmd, cwd = radice) => {
    const proc = Bun.spawn({ cmd, cwd, stdout: "pipe", stderr: "pipe" });
    const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
    if (codice !== 0) console.error(`$ ${cmd.join(" ")} (exit ${codice})\n${err}`);
    return { codice, out, err };
  };
  try {
    const { versione } = nomiDelPacchetto(readFileSync(join(radice, "package.json"), "utf8"));
    const l = await licenzeDiTerzeParti(piattaforme, versione, esegui, (clausola, motivo) => {
      throw new Error(`${clausola}: ROSSO — ${motivo}`);
    });
    writeFileSync(uscita, l.testo);
    console.log(`LICENZE: VERDE | ${piattaforme.join(" + ")}: ${l.js} librerie JavaScript, ${l.rust} Rust, ${l.testi} testi, ${Buffer.byteLength(l.testo)} byte in ${uscita}`);
  } catch (e) {
    // Il motivo del rosso, o l'errore inatteso così com'è.
    console.error((e as Error).message ?? e);
    console.log("ESITO: ROSSO");
    process.exit(1);
  }
}
