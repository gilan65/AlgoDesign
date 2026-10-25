// Prova sul prodotto, Linux: `bun run prova-linux`, lanciata da Windows con Docker Desktop avviato.
// Costruisce l'immagine (`strumenti/linux/Dockerfile`, Ubuntu 24.04), compila l'AppImage in un container,
// poi lancia tre giri di `giro.ts`, ognuno in un container suo, e confronta i loro `docker diff`:
//
// 1. base: la linea di base, cioè lo stesso giro senza avviare l'app (Xvfb, tauri-driver, l'AppImage
//    copiata accanto a `data/`). Deve NON essere vuota, o `docker diff` non ha dimostrato di vedere;
// 2. portabile (`LANG=it_IT.UTF-8`): LINGUA, ESECUZIONE e VETTORE dentro il giro (qui si pretende la riga verde di
//    ciascuna, oltre all'exit 0); qui TRACCE — il suo `docker diff` meno quello
//    della base: ogni voce fuori da `data/` sta nell'elenco `ammesse` di `tracce.ts`, e nessuna contiene
//    l'identificatore. Le voci dentro `data/` devono esserci (il diff vede le scritture dell'app);
// 3. senza-data (`LANG=en_US.UTF-8`, controllo positivo delle tracce): lo stesso residuo deve contenere
//    la cartella dell'identificatore sotto la home, vista da ENTRAMBI i rilevatori (identificatore; voce
//    fuori dall'elenco). Le due lingue del sistema diverse fanno anche da controllo positivo a
//    «`navigator.language` segue `LANG`», che `giro.ts` verifica in ciascuno dei due giri.
//
// Che cosa questa prova NON guarda:
// - le scritture nei volumi e nei montaggi (`/lavoro`, `/progetto`): `docker diff` guarda solo il
//   filesystem del container. L'estrazione dell'AppImage in /tmp sta fuori dai volumi, quindi si vede;
// - l'avvio con FUSE, cioè quello di un desktop normale: nel container FUSE manca e l'AppImage parte
//   con `APPIMAGE_EXTRACT_AND_RUN=1` (vedi `giro.ts`). Che `APPIMAGE` valga anche lì lo dice la
//   documentazione di AppImage, non questa prova;
// - una voce creata e cancellata durante il giro: `docker diff` confronta lo stato finale con l'immagine;
// - un desktop vero: niente sessione D-Bus, niente gestore di finestre, niente GPU; root come utente;
// - l'aspetto della finestra e i font;
// - nel VETTORE, il tempo su un desktop vero (qui Xvfb senza GPU, e la risposta della pagina passa da WebDriver) e gli
//   altri programmi pesanti della prova nei motori (il ciclo che non finisce, l'avvio con un vettore inizializzato,
//   le stringhe al limite). Il rilevatore del tempo è stato visto rosso una volta, su sorgenti mutati che mostrano una
//   colonna per elemento e disegnano tutte le righe (risposta dopo 15 720 ms, un fotogramma di 17 519 ms); i rossi
//   delle forme e del campionatore spento, mai, e mai la sola correzione delle righe in vista. Il programma finisce
//   prima dei due secondi: le due risposte misurano la pagina a corsa finita, la corsa la osserva il campionatore;
// - altre distribuzioni (solo Ubuntu 24.04) e macOS;
// - l'AppImage su un'altra macchina: la glibc del bersaglio la decide la CI al rilascio;
// - ciò che la prova di Windows guarda oltre a lingua e tracce: le preferenze diverse dalla lingua, il file
//   dato come argomento salvato, «Salva» e la scrittura atomica, la cartella degli esempi, la costruzione del
//   programma di riferimento, l'esportazione della tabella; e la finestra del file GTK (aprire, salvare, scegliere una cartella), che
//   nessuna prova comanda e le cui tracce (l'elenco dei file recenti) non sono misurate.
//
// L'esito del build si legge dall'artefatto (la cartella delle AppImage si svuota prima del build), non
// dal solo exit code. Gli exit code si leggono dal processo avviato, mai attraverso una pipe.

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { controlloPositivo, residuo as residuoDelGiro, type Residuo, type Voce } from "./tracce";

// L'elenco delle voci ammesse fuori da `data/` e la divisione per specie sono in `tracce.ts`, comuni con la prova sulla
// macchina della CI; qui la casa è quella di root nel container.
const casa = "/root";

const radice = join(import.meta.dir, "..", "..");
const identificatore = JSON.parse(readFileSync(join(radice, "shell", "tauri.conf.json"), "utf8")).identifier as string;
const immagine = "algodesign-linux";
const volume = "algodesign-linux";
const prefissoContainer = "algodesign-linux-";
const dati = "/prova portabile/data";
const cartellaLog = join(radice, ".collaudo");
mkdirSync(cartellaLog, { recursive: true });
const fileLog = join(cartellaLog, `prova-linux-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);

function log(testo: string): void {
  appendFileSync(fileLog, testo.endsWith("\n") ? testo : `${testo}\n`);
}

function riga(testo: string): void {
  console.log(testo);
  log(testo);
}

class ClausolaRossa extends Error {}

function rosso(clausola: string, motivo: string): never {
  throw new ClausolaRossa(`${clausola}: ROSSA — ${motivo}`);
}

async function esegui(cmd: string[]): Promise<{ codice: number; uscita: string }> {
  log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({ cmd, cwd: radice, stdout: "pipe", stderr: "pipe" });
  const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  log(out + err);
  log(`(exit ${codice})`);
  return { codice, uscita: out };
}

const montaggi = ["-v", `${radice}:/progetto:ro`];

// ----------------------------------------------------------------------------------------------- build

async function costruisci(): Promise<void> {
  const inizio = Date.now();
  const immagineCostruita = await esegui(["docker", "build", "-t", immagine, join(radice, "strumenti", "linux")]);
  if (immagineCostruita.codice !== 0) rosso("BUILD", `immagine: exit ${immagineCostruita.codice} (dettaglio nel log)`);

  // Sorgenti copiati nel volume senza ciò che Windows ha generato (`node_modules` ha binari di Windows).
  const comandi = [
    "set -e",
    "rm -rf /lavoro/app /lavoro/target/release/bundle/appimage",
    "mkdir -p /lavoro/app",
    "tar -C /progetto --exclude=./node_modules --exclude=./dist --exclude=./.collaudo --exclude=./shell/target --exclude=./shell/gen -cf - . | tar -C /lavoro/app -xf -",
    "cd /lavoro/app",
    "bun install --frozen-lockfile",
    "bun tauri build --bundles appimage",
  ];
  const ambiente = ["CARGO_HOME=/lavoro/cargo", "CARGO_TARGET_DIR=/lavoro/target", "XDG_CACHE_HOME=/lavoro/cache", "BUN_INSTALL_CACHE_DIR=/lavoro/bun"];
  const build = await esegui([
    "docker", "run", "--rm", "--name", `${prefissoContainer}build`, ...montaggi, "-v", `${volume}:/lavoro`,
    ...ambiente.flatMap((v) => ["-e", v]), immagine, "bash", "-c", comandi.join(" && "),
  ]);
  const secondi = Math.round((Date.now() - inizio) / 1000);
  if (build.codice !== 0) rosso("BUILD", `exit ${build.codice} dopo ${secondi} s (dettaglio nel log)`);
  const prodotte = await esegui(["docker", "run", "--rm", "-v", `${volume}:/lavoro:ro`, immagine, "bash", "-c", "stat -c '%n %s' /lavoro/target/release/bundle/appimage/*.AppImage"]);
  if (prodotte.codice !== 0) rosso("BUILD", `exit 0 ma nessuna AppImage nella cartella svuotata prima del build`);
  riga(`BUILD: VERDE | ${secondi} s | ${prodotte.uscita.trim()} byte`);
}

// ------------------------------------------------------------------------------------------------ giri

/** Le righe stampate da ogni giro: le clausole dentro il giro si pretendono verdi per riga, non solo per exit code. */
const righeDelGiro = new Map<string, string[]>();

async function giro(nome: "base" | "portabile" | "senza-data", lang: string): Promise<Voce[]> {
  const container = `${prefissoContainer}${nome}`;
  log(`=== INIZIO GIRO ${nome} ${new Date().toISOString()} ===`);
  const proc = Bun.spawn({
    cmd: ["docker", "run", "--name", container, ...montaggi, "-v", `${volume}:/lavoro:ro`, "-e", `LANG=${lang}`, immagine, "bun", "/progetto/strumenti/linux/giro.ts", nome],
    cwd: radice,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  log(err);
  righeDelGiro.set(nome, out.trimEnd().split("\n"));
  for (const r of out.trimEnd().split("\n")) riga(r);
  try {
    if (codice !== 0) rosso(`GIRO ${nome}`, `exit ${codice}`);
    const diff = await esegui(["docker", "diff", container]);
    if (diff.codice !== 0) rosso(`GIRO ${nome}`, `docker diff: exit ${diff.codice}`);
    return diff.uscita
      .split("\n")
      .filter((r) => r.trim() !== "")
      .map((r) => ({ tipo: r.slice(0, 1), percorso: r.slice(2) }));
  } finally {
    await esegui(["docker", "rm", "-f", container]);
  }
}

/** Il diff di un giro meno quello della base, diviso per specie (`tracce.ts`). */
const residuo = (diff: Voce[], base: Voce[]): Residuo => residuoDelGiro(diff, base, dati, casa, identificatore);

function descrivi(nome: string, r: Residuo): void {
  for (const [specie, voci] of Object.entries(r)) log(`  ${nome} · ${specie}: ${(voci as Voce[]).map((v) => `${v.tipo} ${v.percorso}`).join(" | ")}`);
  riga(
    `  residuo ${nome}: dentro data/ ${r.inData.length} · con l'identificatore ${r.conIdentificatore.length} ${JSON.stringify(r.conIdentificatore.map((v) => v.percorso))} · ammesse ${r.ammesse.length} · cartelle che le contengono ${r.cartelle.length} ${JSON.stringify(r.cartelle.map((v) => v.percorso))} · fuori dall'elenco ${r.fuori.length} ${JSON.stringify(r.fuori.map((v) => `${v.tipo} ${v.percorso}`))}`,
  );
}

// ------------------------------------------------------------------------------------------------ prova

log(`=== INIZIO PROVA LINUX ${new Date().toISOString()} · bun ${Bun.version} ===`);
console.log(`prova-linux: log in ${relative(radice, fileLog)}`);

let esito = 0;
try {
  const residui = await esegui(["docker", "ps", "-a", "--filter", `name=${prefissoContainer}`, "--format", "{{.Names}}"]);
  if (residui.codice !== 0) rosso("PROVA", `docker non risponde (exit ${residui.codice}): Docker Desktop è avviato?`);
  if (residui.uscita.trim() !== "") rosso("PROVA", `container di una prova precedente ancora presenti (guardarli e toglierli a mano): ${residui.uscita.trim()}`);
  await costruisci();

  const base = await giro("base", "it_IT.UTF-8");
  riga(`  linea di base: ${base.length} voci`);
  if (base.length === 0) rosso("TRACCE (linea di base)", "vuota: docker diff non ha dimostrato di vedere");

  const portabile = residuo(await giro("portabile", "it_IT.UTF-8"), base);
  const senzaRiga = ["LINGUA", "ESECUZIONE", "VETTORE"].filter((c) => !righeDelGiro.get("portabile")!.some((r) => r.startsWith(`${c}: VERDE`)));
  if (senzaRiga.length > 0) rosso("GIRO portabile", `exit 0 ma senza la riga verde di ${senzaRiga.join(", ")}`);
  descrivi("portabile", portabile);
  if (portabile.conIdentificatore.length > 0) rosso("TRACCE", `voci con l'identificatore: ${portabile.conIdentificatore.map((v) => v.percorso).join("; ")}`);
  if (portabile.fuori.length > 0) rosso("TRACCE", `voci fuori da data/ e dall'elenco: ${portabile.fuori.map((v) => `${v.tipo} ${v.percorso}`).join("; ")}`);
  if (portabile.inData.length === 0) rosso("TRACCE", "nessuna voce dentro data/: il diff non ha visto le scritture dell'app");
  riga(`TRACCE (portabile): VERDE | fuori da data/ solo voci dell'elenco (${portabile.ammesse.length} + ${portabile.cartelle.length} cartelle) | dentro data/ ${portabile.inData.length} voci`);

  const senza = residuo(await giro("senza-data", "en_US.UTF-8"), base);
  descrivi("senza-data", senza);
  // Le cartelle col nome dell'identificatore sotto la home: ciascuna deve accendere ENTRAMBI i rilevatori.
  const { viste, spente } = controlloPositivo(senza, casa, identificatore);
  if (spente.length > 0) rosso("TRACCE (controllo positivo)", `SPENTO: ${spente.join("; ")}`);
  riga(`TRACCE (controllo positivo): acceso | senza data/ entrambi i rilevatori vedono ${viste.join(" e ")}`);
  riga("ESITO: VERDE (build, lingua, lingua del sistema, esecuzione, vettore di 1000 elementi, tracce, linea di base, controllo positivo delle tracce)");
} catch (e) {
  riga(e instanceof ClausolaRossa ? e.message : `ERRORE DELLA PROVA: ${e instanceof Error ? e.stack : String(e)}`);
  riga("ESITO: ROSSO");
  esito = 1;
} finally {
  log("=== FINE PROVA LINUX ===");
}
process.exit(esito);
