// Prova sul prodotto, Linux, sulla macchina Ubuntu della CI: `bun ./strumenti/linux/prova-ci.ts --archivio <tar.gz>
// --uscita <cartella>`, sull'archivio della release costruito dalla CI (`archivio.ts`). Vuole Xvfb, `tauri-driver` col
// WebKitWebDriver della stessa versione di WebKitGTK che sta nell'AppImage (la macchina della build), `import` per la
// fotografia e le locali `it_IT.UTF-8` ed `en_US.UTF-8` generate. Fuori dalla CI la prova Linux è `prova.ts`, nel
// container.
//
// Tre giri di `giro.ts`, ognuno sull'archivio estratto di nuovo nella stessa cartella con spazi, come lo estrae chi lo
// usa (`tar xzf`):
// 1. base: lo stesso giro senza avviare l'app (Xvfb, tauri-driver, i due programmi di prova scritti accanto
//    all'AppImage). La linea di base: le voci nuove che non sono dell'app;
// 2. portabile (`LANG=it_IT.UTF-8`): LINGUA, ESECUZIONE, VETTORE, SUGGERIMENTO e MEMORIA dentro il giro (qui si pretende
//    la riga di ciascuna); TRACCE: le voci nuove meno quelle della base, divise da `tracce.ts` (fuori da `data/` solo voci
//    dell'elenco, nessuna con l'identificatore; dentro `data/` almeno una, o il rilevatore non ha visto l'app);
// 3. senza-data (`LANG=en_US.UTF-8`, controllo positivo delle tracce): la cartella dell'identificatore sotto la casa,
//    vista da ENTRAMBI i rilevatori; poi le due misure del motore, CANVAS e STAMPA (qui si pretende la riga di ciascuna).
// Le voci nuove di un giro sono quelle che `find -newer <segno>` trova sotto la casa dell'utente, in `/tmp` e nella
// cartella di prova, dopo un file-segno scritto subito prima del giro.
//
// Che cosa questa prova NON guarda:
// - le voci cancellate durante il giro, e quelle scritte con una data vecchia: `find -newer` vede solo ciò che il giro
//   ha creato o cambiato e che c'è ancora alla fine;
// - le cartelle del servizio delle Actions e del repository sotto la casa (`work`, `actions-runner`), saltate perché cambiano
//   da sole durante la corsa; l'app non ci scrive (la sua cartella di lavoro è quella di prova), ma la prova non lo
//   dimostra;
// - fuori dalla casa, da `/tmp` e dalla cartella di prova (`/var`, `/etc`, altre case): l'app gira come utente senza
//   diritti, che lì non può scrivere;
// - l'avvio con FUSE: qui l'AppImage parte estratta (`APPIMAGE_EXTRACT_AND_RUN=1`, come nel container); con FUSE la
//   prova `verifica.yml`, su macchine pulite;
// - un desktop vero (niente gestore di finestre, niente GPU, la macchina della CI coi pacchetti di sviluppo), e quanti
//   elementi del vettore il suggerimento mostra (la fotografia si guarda);
// - ciò che `prova.ts` non guarda per le clausole dentro il giro (scritto lì).
//
// Gli exit code si leggono dal processo avviato, mai attraverso una pipe.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { controlloPositivo, residuo, type Residuo, type Voce } from "./tracce";

const argomenti = process.argv.slice(2);
const valore = (nome: string): string | undefined => {
  const i = argomenti.indexOf(nome);
  return i >= 0 ? argomenti[i + 1] : undefined;
};
const archivio = valore("--archivio");
const uscitaData = valore("--uscita");
if (archivio === undefined || uscitaData === undefined || argomenti.length !== 4) {
  console.error(`uso: prova-ci --archivio <AlgoDesign-<versione>-linux-x64.tar.gz> --uscita <cartella> (ricevuti: ${JSON.stringify(argomenti)})`);
  process.exit(2);
}

const app = resolve(import.meta.dir, "..", "..");
const uscita = resolve(uscitaData);
mkdirSync(uscita, { recursive: true });
const fileLog = join(uscita, "prova-linux.log");
const casa = homedir();
const identificatore = JSON.parse(readFileSync(join(app, "shell", "tauri.conf.json"), "utf8")).identifier as string;
const dove = join(process.env.RUNNER_TEMP ?? tmpdir(), "prova con spazi");
const segno = join(process.env.RUNNER_TEMP ?? tmpdir(), "segno-del-giro");
// Le cartelle che cambiano da sole durante la corsa, saltate (vedi in testa): il repository e la cartella temporanea
// delle Actions (`work`), e il servizio delle Actions coi suoi registri (`actions-runner`, su `ubuntu-22.04`: misurato).
const saltate = [join(casa, "work"), join(casa, "actions-runner"), join(casa, "runners")];

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

async function esegui(cmd: string[], ambiente: Record<string, string> = {}): Promise<{ codice: number; out: string }> {
  log(`$ ${cmd.join(" ")}`);
  const proc = Bun.spawn({ cmd, cwd: app, env: { ...process.env, ...ambiente }, stdout: "pipe", stderr: "pipe" });
  const [out, err, codice] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  log(out.length > 20_000 ? `${out.slice(0, 20_000)}\n(… ${out.length} caratteri)` : out);
  log(err.length > 20_000 ? `${err.slice(-20_000)}\n(ultimi 20 000 di ${err.length} caratteri)` : err);
  log(`(exit ${codice})`);
  return { codice, out };
}

/** L'archivio estratto di nuovo nella cartella di prova: la cartella dell'AppImage. */
async function estrai(): Promise<string> {
  rmSync(dove, { recursive: true, force: true });
  mkdirSync(dove, { recursive: true });
  const x = await esegui(["tar", "-xzf", resolve(archivio!), "-C", dove]);
  const dentro = readdirSync(dove).sort();
  if (x.codice !== 0 || dentro.length !== 1) rosso("PROVA", `l'estrazione esce ${x.codice} con ${JSON.stringify(dentro)}`);
  return join(dove, dentro[0]!);
}

const righeDelGiro = new Map<string, string[]>();

async function giro(nome: "base" | "portabile" | "senza-data", lang: string): Promise<{ voci: Voce[]; dati: string }> {
  const cartella = await estrai();
  writeFileSync(segno, "");
  await Bun.sleep(1_100);
  log(`=== INIZIO GIRO ${nome} ${new Date().toISOString()} ===`);
  const g = await esegui([process.execPath, join(app, "strumenti", "linux", "giro.ts"), nome], {
    LANG: lang,
    ALGODESIGN_PROGETTO: app,
    ALGODESIGN_CARTELLA_PROVA: cartella,
    ALGODESIGN_USCITA: uscita,
  });
  const righe = g.out.trimEnd().split("\n");
  righeDelGiro.set(nome, righe);
  for (const r of righe) riga(r);
  if (g.codice !== 0) rosso(`GIRO ${nome}`, `exit ${g.codice}`);
  const radici = [casa, "/tmp", cartella];
  const f = await esegui(["find", ...radici, "(", ...saltate.flatMap((s, i) => [...(i > 0 ? ["-o"] : []), "-path", s]), ")", "-prune", "-o", "-newer", segno, "-print"]);
  // `find` esce 1 se una cartella non si legge (le cartelle di altri utenti in /tmp): le voci lette restano valide.
  if (f.codice !== 0 && f.out === "") rosso(`GIRO ${nome}`, `find esce ${f.codice} senza voci`);
  const voci = [...new Set(f.out.split("\n").filter((r) => r !== "" && r !== segno))].sort().map((percorso) => ({ tipo: "N", percorso }));
  return { voci, dati: join(cartella, "data") };
}

function descrivi(nome: string, r: Residuo): void {
  for (const [specie, voci] of Object.entries(r)) log(`  ${nome} · ${specie}: ${(voci as Voce[]).map((v) => v.percorso).join(" | ")}`);
  riga(
    `  residuo ${nome}: dentro data/ ${r.inData.length} · con l'identificatore ${r.conIdentificatore.length} ${JSON.stringify(r.conIdentificatore.map((v) => v.percorso))} · ammesse ${r.ammesse.length} · cartelle che le contengono ${r.cartelle.length} ${JSON.stringify(r.cartelle.map((v) => v.percorso))} · fuori dall'elenco ${r.fuori.length} ${JSON.stringify(r.fuori.map((v) => v.percorso))}`,
  );
}

log(`=== INIZIO PROVA LINUX SULLA MACCHINA DELLA CI ${new Date().toISOString()} · bun ${Bun.version} ===`);
let esito = 0;
try {
  if (process.platform !== "linux") rosso("PROVA", `gira su Linux, non su ${process.platform}`);
  if (!existsSync(resolve(archivio))) rosso("PROVA", `l'archivio ${archivio} non c'è`);
  riga(`PROVA LINUX (CI): ${archivio} | casa ${casa} | cartella di prova «${dove}» | identificatore ${identificatore}`);

  const base = await giro("base", "it_IT.UTF-8");
  riga(`  linea di base: ${base.voci.length} voci`);
  if (base.voci.length === 0) rosso("TRACCE (linea di base)", "vuota: find non ha dimostrato di vedere");

  const portabile = await giro("portabile", "it_IT.UTF-8");
  const clausole = ["LINGUA", "ESECUZIONE", "VETTORE", "SUGGERIMENTO", "MEMORIA"];
  const senzaRiga = clausole.filter((c) => !righeDelGiro.get("portabile")!.some((r) => r.startsWith(`${c}: VERDE`) || r.startsWith(`${c}: FOTOGRAFATO`)));
  if (senzaRiga.length > 0) rosso("GIRO portabile", `exit 0 ma senza la riga di ${senzaRiga.join(", ")}`);
  const r = residuo(portabile.voci, base.voci, portabile.dati, casa, identificatore);
  descrivi("portabile", r);
  if (r.conIdentificatore.length > 0) rosso("TRACCE", `voci con l'identificatore: ${r.conIdentificatore.map((v) => v.percorso).join("; ")}`);
  if (r.fuori.length > 0) rosso("TRACCE", `voci fuori da data/ e dall'elenco: ${r.fuori.map((v) => v.percorso).join("; ")}`);
  if (r.inData.length === 0) rosso("TRACCE", "nessuna voce dentro data/: il rilevatore non ha visto le scritture dell'app");
  riga(`TRACCE (portabile): VERDE | fuori da data/ solo voci dell'elenco (${r.ammesse.length} + ${r.cartelle.length} cartelle) | dentro data/ ${r.inData.length} voci`);

  const senzaData = await giro("senza-data", "en_US.UTF-8");
  const misure = ["CANVAS: MISURATO", "STAMPA: FOTOGRAFATO"].filter((m) => !righeDelGiro.get("senza-data")!.some((r) => r.startsWith(m)));
  if (misure.length > 0) rosso("GIRO senza-data", `exit 0 ma senza la riga di ${misure.join(", ")}`);
  const senza = residuo(senzaData.voci, base.voci, senzaData.dati, casa, identificatore);
  descrivi("senza-data", senza);
  const { viste, spente } = controlloPositivo(senza, casa, identificatore);
  if (spente.length > 0) rosso("TRACCE (controllo positivo)", `SPENTO: ${spente.join("; ")}`);
  riga(`TRACCE (controllo positivo): acceso | senza data/ entrambi i rilevatori vedono ${viste.join(" e ")}`);
  riga(`ESITO: VERDE (${clausole.join(", ")}, tracce, linea di base, controllo positivo delle tracce)`);
} catch (e) {
  riga(e instanceof ClausolaRossa ? e.message : `ERRORE DELLA PROVA: ${e instanceof Error ? e.stack : String(e)}`);
  riga("ESITO: ROSSO");
  esito = 1;
} finally {
  rmSync(dove, { recursive: true, force: true });
  log("=== FINE PROVA LINUX ===");
}
process.exit(esito);
