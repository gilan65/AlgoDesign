// Un giro della prova Linux, DENTRO il container (lo lancia `prova.ts`, una volta per giro, ognuno in un
// container suo): `bun /progetto/strumenti/linux/giro.ts <base|portabile|senza-data>`.
//
// Tutti i giri fanno la stessa preparazione: Xvfb, tauri-driver, l'AppImage copiata dal volume in una
// cartella con spazi del container (`/prova portabile/`), e `data/` accanto a lei (tranne `senza-data`).
// - base: nient'altro. È la linea di base che `prova.ts` sottrae al `docker diff` degli altri giri;
// - portabile: LINGUA — l'app parte nella lingua del sistema (`LANG` del container), passa all'altra (nelle
//   Impostazioni, con «Conferma»), si chiude, si riapre e la ritrova; `data/preferenze.json` contiene la
//   lingua. Controllo positivo: tolto il file, si riapre nella lingua iniziale. Poi ESECUZIONE: il programma di
//   riferimento dato come argomento, eseguito con F5 coi valori del suo caso scritti nella console, ha l'output
//   atteso dal caso (in WebKitGTK, il motore degli utenti Linux). Poi VETTORE: il vettore di 1000 elementi riempito
//   da un ciclo (`e2e/vettore-riempito.ts`, lo stesso programma della prova nei motori e della prova di Windows), dato
//   come argomento, eseguito con F5 nella forma predefinita della tabella e, scelta nelle Impostazioni, in fila: in
//   ciascuna corsa la risposta della pagina due secondi dopo F5 e alla fine, il fotogramma più lungo dal tasto alla
//   fine e «Ferma» entro un secondo. Qui la risposta passa da WebDriver (il giro HTTP verso tauri-driver ci entra) e
//   i fotogrammi sono quelli di Xvfb, senza GPU: non sono quelli di un desktop vero;
// - senza-data: lo stesso eseguibile, con un cambio di lingua, deve scrivere la preferenza sotto la home.
//   Le tracce le guarda chi lancia il giro, da fuori: `prova.ts` con `docker diff`, `prova-ci.ts` con `find -newer`.
// In portabile e senza-data si stampano `navigator.language` contro `LANG` e il valore di `APPIMAGE`
// letto dall'ambiente del processo dell'app.
//
// Sulla macchina della CI (`prova-ci.ts`) le cartelle vengono dall'ambiente: `ALGODESIGN_PROGETTO` (la cartella `app`
// del repository, al posto di `/progetto`), `ALGODESIGN_CARTELLA_PROVA` (la cartella dell'archivio estratto, con
// l'AppImage e `data/` vuota: il giro senza `data` la toglie) e `ALGODESIGN_USCITA` (dove vanno la fotografia del
// suggerimento e le misure della memoria). Lì il giro portabile fa in più due misure:
// - SUGGERIMENTO: alla fine della corsa del vettore in fila, il puntatore del mouse sulla cella del vettore e, dopo tre
//   secondi, la fotografia dello schermo virtuale con il suggerimento di WebKitGTK; quanti elementi vi si leggono lo
//   dice chi guarda la fotografia;
// - MEMORIA: il ciclo che scrive seimila caratteri a giro, eseguito per 120 s; la memoria privata dei processi dell'app
//   e di WebKitGTK ogni 2 s. La soglia, scritta prima della misura (`SOGLIA_FONDO_MB`): il fondo, cioè il valore più
//   basso degli ultimi 60 s, sale al più di 100 MB sopra il valore a 10 s. Il picco si scrive e non ferma: in WebKit
//   la memoria si libera a dente di sega.
//
// Il pilota è un client WebDriver W3C minimo (fetch) verso tauri-driver, che passa a WebKitWebDriver.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, readlinkSync, rmdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
// La soglia della finestra che risponde: la stessa della prova nei motori.
import { SOGLIA_MS } from "../../e2e/risposta";
import { vettoreRiempito } from "../../e2e/vettore-riempito";
import { dizionari, linguaDelSistema, nomiLingue, riempi, type Lingua } from "../../i18n/lingue";

const giro = process.argv[2];
if (giro !== "base" && giro !== "portabile" && giro !== "senza-data") {
  console.error("uso: giro.ts <base|portabile|senza-data>");
  process.exit(2);
}

const progetto = process.env.ALGODESIGN_PROGETTO ?? "/progetto";
// Sulla macchina della CI la cartella di prova è l'archivio estratto, già pronto; nel container la prepara il giro.
const estratta = process.env.ALGODESIGN_CARTELLA_PROVA;
const uscita = process.env.ALGODESIGN_USCITA;
const identificatore = JSON.parse(readFileSync(join(progetto, "shell", "tauri.conf.json"), "utf8")).identifier as string;
const cartellaBundle = "/lavoro/target/release/bundle/appimage";
const cartellaProva = estratta ?? "/prova portabile";
const appimage = join(cartellaProva, "AlgoDesign.AppImage");
const dati = join(cartellaProva, "data");
const driver = "http://127.0.0.1:4444";
// Il programma della clausola ESECUZIONE, letto dai sorgenti montati in sola lettura (fuori dal `docker diff`).
const riferimento = join(progetto, "casi", "tappa-1", "riferimento-media-voti.algo");
// Il programma della clausola VETTORE, scritto nella cartella di prova da ogni giro (la base compresa: `prova.ts` lo
// sottrae con la linea di base).
const vettore = join(cartellaProva, "vettore di prova.algo");
// Il programma della misura della memoria, scritto come il vettore: un ciclo senza fine che scrive seimila caratteri a giro.
const pesante = join(cartellaProva, "memoria di prova.algo");
const programmaPesante = JSON.stringify({
  format: "algodesign",
  schema_version: 2,
  metadata: { name: "memoria" },
  functions: [
    {
      id: "f1",
      kind: "main",
      data: [{ name: "s", type: "string", max_length: 1000, initial: `"${"x".repeat(1000)}"` }],
      body: [{ id: "b1", kind: "while", condition: "true", body: [{ id: "b2", kind: "write", values: ["s", "s", "s", "s", "s", "s"], newline: true }] }],
      end: { id: "bz" },
    },
  ],
});
// Nel container FUSE manca e l'AppImage non parte («fuse: device not found», misurato): il suo runtime si
// estrae in /tmp e si avvia da lì. tauri-driver passa l'ambiente a WebKitWebDriver, che lo passa all'app.
const ambiente = { ...process.env, DISPLAY: ":99", APPIMAGE_EXTRACT_AND_RUN: "1" };

class ClausolaRossa extends Error {}

function rosso(clausola: string, motivo: string): never {
  throw new ClausolaRossa(`${clausola}: ROSSA — ${motivo}`);
}

async function attendi<T>(cosa: string, prova: () => T | undefined | Promise<T | undefined>, decimi = 300): Promise<T> {
  for (let i = 0; i < decimi; i++) {
    try {
      const valore = await prova();
      if (valore !== undefined) return valore;
    } catch {
      // Non ancora pronto.
    }
    await Bun.sleep(100);
  }
  rosso("PROVA", `scaduta l'attesa: ${cosa}`);
}

// --------------------------------------------------------------------------------------------- WebDriver

async function wd(metodo: string, percorso: string, corpo?: unknown): Promise<any> {
  const risposta = await fetch(driver + percorso, {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const json = (await risposta.json()) as { value: any };
  if (!risposta.ok) throw new Error(`WebDriver ${metodo} ${percorso}: ${risposta.status} ${JSON.stringify(json.value)}`);
  return json.value;
}

const script = (sessione: string, testo: string): Promise<any> => wd("POST", `/session/${sessione}/execute/sync`, { script: testo, args: [] });

// ------------------------------------------------------------------------------------------------- app

/** I processi dell'app nel container (che contiene solo i processi della prova), con il loro `APPIMAGE`. */
function processiApp(): { pid: number; appimage: string | undefined }[] {
  const nul = String.fromCharCode(0);
  return readdirSync("/proc")
    .filter((voce) => /^\d+$/.test(voce))
    .flatMap((pid) => {
      try {
        if (basename(readlinkSync(`/proc/${pid}/exe`)) !== "algodesign") return [];
        const variabile = readFileSync(`/proc/${pid}/environ`, "latin1").split(nul).find((v) => v.startsWith("APPIMAGE="));
        return [{ pid: Number(pid), appimage: variabile?.slice("APPIMAGE=".length) }];
      } catch {
        return [];
      }
    });
}

type Mostrata = { etichetta: string; lang: string };

/** Il testo del comando delle Impostazioni (il pulsante del comando, nel gruppo di destra della barra) e la
 *  lingua del documento. */
async function mostrata(sessione: string): Promise<Mostrata> {
  return script(sessione, `return { etichetta: document.querySelector('header [data-comando="impostazioni"]')?.textContent ?? "", lang: document.documentElement.lang };`);
}

/** Un clic sul primo elemento trovato con un'espressione XPath. */
async function clicSu(sessione: string, xpath: string): Promise<void> {
  const elemento = await attendi(`l'elemento ${xpath}`, async () => Object.values(await wd("POST", `/session/${sessione}/element`, { using: "xpath", value: xpath }))[0] as string);
  await wd("POST", `/session/${sessione}/element/${elemento}/click`, {});
}

async function avvia(argomenti: string[] = []): Promise<string> {
  if (processiApp().length > 0) rosso("PROVA", "un'istanza dell'app è già in esecuzione prima dell'avvio");
  const sessione = (await wd("POST", "/session", { capabilities: { alwaysMatch: { "tauri:options": { application: appimage, args: argomenti } } } })).sessionId as string;
  // Appena collegati la pagina può non essere ancora caricata: si aspetta il comando delle Impostazioni.
  await attendi("il comando delle Impostazioni", async () => ((await mostrata(sessione)).etichetta !== "" ? true : undefined));
  return sessione;
}

/** Tutti i processi del container: PID, padre, riga di comando. */
function tabellaProcessi(): string {
  const nul = String.fromCharCode(0);
  return readdirSync("/proc")
    .filter((voce) => /^\d+$/.test(voce))
    .map((pid) => {
      try {
        const padre = readFileSync(`/proc/${pid}/stat`, "latin1").split(") ")[1]!.split(" ")[1];
        return `${pid} ${padre} ${readFileSync(`/proc/${pid}/cmdline`, "latin1").split(nul).join(" ")}`;
      } catch {
        return `${pid} ? (uscito)`;
      }
    })
    .join("\n");
}

/** Chiusura per PID: chiusa la sessione, WebKitWebDriver termina il proprio figlio, che è il runtime
 *  dell'AppImage, e l'app resta orfana (misurato). Quindi SIGTERM ai PID dell'app, poi l'attesa. */
async function chiudi(sessione: string): Promise<void> {
  await wd("DELETE", `/session/${sessione}`);
  for (const { pid } of processiApp()) process.kill(pid, "SIGTERM");
  for (let i = 0; i < 100 && processiApp().length > 0; i++) await Bun.sleep(100);
  if (processiApp().length > 0) rosso("PROVA", `dopo la chiusura della sessione l'app è ancora in esecuzione:\n${tabellaProcessi()}`);
}

async function attendiLingua(sessione: string, lingua: Lingua, clausola: string): Promise<void> {
  let ultima: Mostrata = { etichetta: "", lang: "" };
  for (let i = 0; i < 100; i++) {
    ultima = await mostrata(sessione);
    if (ultima.etichetta === dizionari[lingua].impostazioni && ultima.lang === lingua) return;
    await Bun.sleep(100);
  }
  rosso(clausola, `attesa «${lingua}», mostrata etichetta «${ultima.etichetta}» con <html lang> «${ultima.lang}»`);
}

async function attendiFile(percorso: string, lingua: Lingua, clausola: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    try {
      if (JSON.parse(readFileSync(percorso, "utf8")).lingua === lingua) return;
    } catch {
      // Non ancora scritto.
    }
    await Bun.sleep(250);
  }
  rosso(clausola, `${percorso} non contiene la lingua «${lingua}»`);
}

/** Primo avvio senza preferenza: lingua del sistema (misurata contro `LANG`); poi il passaggio all'altra. */
async function primoAvvioECambio(clausola: string): Promise<{ iniziale: Lingua; opposta: Lingua; sessione: string }> {
  const sessione = await avvia();
  const sistema = (await script(sessione, "return navigator.language;")) as string;
  const lang = process.env.LANG ?? "";
  const iniziale = linguaDelSistema(sistema);
  const attesa = linguaDelSistema(lang.split(".")[0]!.replace("_", "-"));
  const processi = processiApp();
  console.log(`  LANG «${lang}» · navigator.language «${sistema}» → lingua iniziale «${iniziale}» · APPIMAGE dei processi dell'app ${JSON.stringify(processi)}`);
  if (iniziale !== attesa) rosso("LINGUA DEL SISTEMA", `navigator.language «${sistema}» non segue LANG «${lang}» (atteso «${attesa}»)`);
  if (!processi.some((p) => p.appimage === appimage)) rosso("PROVA", `nessun processo dell'app ha APPIMAGE=${appimage}`);
  const opposta: Lingua = iniziale === "it" ? "en" : "it";
  await attendiLingua(sessione, iniziale, clausola);
  // Nelle Impostazioni: la voce della lingua (l'etichetta del pulsante di opzione), poi «Conferma».
  const testi = dizionari[iniziale];
  await clicSu(sessione, `//header//button[normalize-space()="${testi.impostazioni}"]`);
  await clicSu(sessione, `//*[@role="dialog"]//label[normalize-space()="${nomiLingue[opposta]}"]`);
  await clicSu(sessione, `//*[@role="dialog"]//button[normalize-space()="${testi.progettoConferma}"]`);
  await attendiLingua(sessione, opposta, clausola);
  return { iniziale, opposta, sessione };
}

function contaFile(cartella: string): number {
  return readdirSync(cartella, { recursive: true, withFileTypes: true }).filter((v) => v.isFile()).length;
}

// ------------------------------------------------------------------------------------------------ giri

async function giroPortabile(): Promise<void> {
  const preferenze = join(dati, "preferenze.json");
  const { iniziale, opposta, sessione } = await primoAvvioECambio("LINGUA");
  await attendiFile(preferenze, opposta, "LINGUA");
  await chiudi(sessione);

  const seconda = await avvia();
  await attendiLingua(seconda, opposta, "LINGUA");
  await chiudi(seconda);

  // Controllo positivo: senza il file la lingua salvata non può tornare.
  rmSync(preferenze);
  const terza = await avvia();
  await attendiLingua(terza, iniziale, "LINGUA (controllo positivo)");
  await chiudi(terza);
  await giroDellEsecuzione(iniziale);
  await giroDelVettore(iniziale);
  if (uscita !== undefined) await giroDellaMemoria(iniziale);
  const profilo = join(dati, "webview");
  console.log(
    `LINGUA: VERDE | «${iniziale}» → «${opposta}», ritrovata dopo la chiusura; data/preferenze.json con «${opposta}» | controllo positivo acceso (senza il file torna «${iniziale}») | data/webview: ${existsSync(profilo) ? contaFile(profilo) : 0} file`,
  );
}

/** ESECUZIONE: il programma di riferimento dato come argomento (dai sorgenti montati, fuori dal filesystem del
 *  container), F5 come tasto di WebDriver, i valori del suo caso scritti nella console con Invio; alla fine l'output
 *  della console è l'atteso del caso. Controllo positivo: prima di F5 l'output è diverso dall'atteso. */
async function giroDellEsecuzione(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const testo = readFileSync(riferimento, "utf8");
  const caso = (JSON.parse(testo) as { test_cases: { inputs: { data: string; text: string }[]; expected: { output: string } }[] }).test_cases[0]!;
  const sessione = await avvia([riferimento]);
  const flowchart = `${testi.flowchart}: ${JSON.parse(testo).metadata.name}`;
  await attendi(`il flowchart «${flowchart}»`, async () => ((await script(sessione, `return document.querySelector(${JSON.stringify(`[role="group"][aria-label="${flowchart}"]`)}) !== null;`)) ? true : undefined), 150);
  const output = (): Promise<string> => script(sessione, `return [...document.querySelectorAll('[role="log"] [data-scrive]')].map((e) => e.textContent).join("");`);
  const stato = (): Promise<string> => script(sessione, `return document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";`);
  const voci = (): Promise<number> => script(sessione, `return document.querySelector('[role="log"]')?.childElementCount ?? 0;`);
  const prima = await output();
  if (prima === caso.expected.output) rosso("ESECUZIONE (controllo positivo)", "l'output prima dell'esecuzione è già quello atteso");

  const inizio = Date.now();
  const f5 = String.fromCharCode(0xe035); // il tasto F5 di WebDriver
  await wd("POST", `/session/${sessione}/actions`, { actions: [{ type: "key", id: "tastiera", actions: [{ type: "keyDown", value: f5 }, { type: "keyUp", value: f5 }] }] });
  for (const [i, { data, text }] of caso.inputs.entries()) {
    const chiede = riempi(testi.statoChiede, { dato: data });
    let visto = "";
    for (let d = 0; d < 100 && visto !== chiede; d++) {
      visto = await stato();
      if (visto !== chiede) await Bun.sleep(100);
    }
    if (visto !== chiede) rosso("ESECUZIONE", `al valore ${i + 1} di ${caso.inputs.length} lo stato è «${visto}» invece di «${chiede}»; output finora ${JSON.stringify(await output())}`);
    const righe = await voci();
    const campo = Object.values(await wd("POST", `/session/${sessione}/element`, { using: "xpath", value: `//label[span[normalize-space()="${riempi(testi.consoleValore, { dato: data })}"]]//input` }))[0] as string;
    await wd("POST", `/session/${sessione}/element/${campo}/value`, { text: `${text}${String.fromCharCode(0xe007)}` });
    // Il valore è entrato quando la console ha una riga in più (il valore letto).
    await attendi(`la riga del valore ${i + 1} nella console`, async () => ((await voci()) > righe ? true : undefined), 100);
  }
  let finale = "";
  for (let d = 0; d < 100 && finale !== testi.statoFinita; d++) {
    finale = await stato();
    if (finale !== testi.statoFinita) await Bun.sleep(100);
  }
  const visto = await output();
  const secondi = ((Date.now() - inizio) / 1000).toFixed(1);
  await chiudi(sessione);
  if (finale !== testi.statoFinita) rosso("ESECUZIONE", `dopo i ${caso.inputs.length} valori lo stato è «${finale}» invece di «${testi.statoFinita}»`);
  if (visto !== caso.expected.output) rosso("ESECUZIONE", `output della console diverso dall'atteso del caso: ${JSON.stringify(visto)} invece di ${JSON.stringify(caso.expected.output)}`);
  console.log(
    `ESECUZIONE: VERDE | in «${lingua}», F5 sul riferimento dato come argomento, ${caso.inputs.length} valori del caso scritti nella console, «${finale}» in ${secondi} s: output uguale all'atteso del caso (${Buffer.byteLength(visto)} byte) | controllo positivo: prima di F5 l'output era diverso (${JSON.stringify(prima)})`,
  );
}

/** I tasti dati, premuti insieme e lasciati in ordine inverso (Maiusc+F5: Maiusc e F5). */
async function tasti(sessione: string, ...codici: string[]): Promise<void> {
  const azioni = [...codici.map((value) => ({ type: "keyDown", value })), ...codici.toReversed().map((value) => ({ type: "keyUp", value }))];
  await wd("POST", `/session/${sessione}/actions`, { actions: [{ type: "key", id: "tastiera", actions: azioni }] });
}

/** Una corsa del vettore di 1000 elementi, misurata come nella prova nei motori: la risposta della pagina (un giro di
 *  andata e ritorno, qui attraverso WebDriver) due secondi dopo F5 e alla fine, il fotogramma più lungo dal tasto alla
 *  fine (un campionatore nella pagina, acceso prima di F5, che conta anche i fotogrammi), «Ferma» dal tasto alla
 *  colonna chiusa; la riga sopra la tabella e le colonne dell'intestazione dicono la forma che si vedeva. */
async function corsaDelVettore(sessione: string, testi: (typeof dizionari)[Lingua], forma: string, primaDiFermare?: () => Promise<void>) {
  const f5 = String.fromCharCode(0xe035);
  const maiusc = String.fromCharCode(0xe008);
  const risposta = async () => {
    const t0 = Date.now();
    await script(sessione, "return 1;");
    return Date.now() - t0;
  };
  const stato = (): Promise<string> => script(sessione, `return document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";`).catch(() => "");
  const attendiStato = async (atteso: string, ms: number) => {
    let visto = "";
    for (const fine = Date.now() + ms; Date.now() < fine && visto !== atteso; ) {
      visto = await stato();
      if (visto !== atteso) await Bun.sleep(100);
    }
    return visto;
  };
  await script(
    sessione,
    "window.__peggiore = 0; window.__fotogrammi = 0; let prima = performance.now(); const giro = (t) => { window.__peggiore = Math.max(window.__peggiore, t - prima); window.__fotogrammi++; prima = t; requestAnimationFrame(giro); }; requestAnimationFrame(giro); return true;",
  );
  const partenza = Date.now();
  await tasti(sessione, f5);
  await Bun.sleep(2_000);
  const misure: { cosa: string; ms: number }[] = [{ cosa: "risposta 2 s dopo F5", ms: await risposta() }];
  const finale = await attendiStato(testi.statoFinita, 120_000);
  const corsa = Date.now() - partenza;
  if (finale !== testi.statoFinita) rosso("VETTORE", `${forma}: dopo ${corsa} ms lo stato è «${finale}» invece di «${testi.statoFinita}»; misure finora ${JSON.stringify(misure)}`);
  const campionatore = (await script(sessione, "return { peggiore: Math.round(window.__peggiore), fotogrammi: window.__fotogrammi };")) as { peggiore: number; fotogrammi: number };
  misure.push({ cosa: `fotogramma più lungo dal tasto alla fine (${campionatore.fotogrammi} fotogrammi in ${corsa} ms)`, ms: campionatore.peggiore });
  misure.push({ cosa: "risposta alla fine", ms: await risposta() });
  const vista = (await script(
    sessione,
    `const spiega = document.querySelector("[data-spiega]"); return { spiegazione: spiega?.textContent ?? null, colonne: spiega?.parentElement?.querySelector("thead tr")?.children.length ?? 0, righe: document.querySelectorAll("table[data-traccia] tbody tr[data-riga]").length };`,
  )) as { spiegazione: string | null; colonne: number; righe: number };
  if (primaDiFermare !== undefined) await primaDiFermare();
  const t = Date.now();
  await tasti(sessione, maiusc, f5);
  const fermata = await attendiStato(testi.statoPronto, 120_000);
  misure.push({ cosa: "«Ferma»", ms: Date.now() - t });
  if (fermata !== testi.statoPronto) rosso("VETTORE", `${forma}: dopo «Ferma» lo stato è «${fermata}» invece di «${testi.statoPronto}»`);
  const descritte = `${forma}: ${misure.map((m) => `${m.cosa} ${m.ms} ms`).join(", ")}`;
  const peggiore = Math.max(...misure.map((m) => m.ms));
  if (peggiore > SOGLIA_MS) rosso("VETTORE", `la finestra non risponde entro ${SOGLIA_MS} ms: ${descritte}`);
  // Controllo positivo del campionatore: una corsa di più di due secondi ha disegnato dei fotogrammi.
  if (campionatore.fotogrammi < 10) rosso("VETTORE", `il campionatore dei fotogrammi non si è acceso (${campionatore.fotogrammi} fotogrammi): ${descritte}`);
  return { descritte, peggiore, ...vista };
}

/** VETTORE: il vettore di 1000 elementi riempito da un ciclo (lo stesso programma della prova nei motori, scritto
 *  nella cartella di prova da ogni giro, quindi anche nella linea di base), eseguito con F5 nella forma predefinita
 *  della tabella e, scelta nelle Impostazioni nella stessa sessione, in quella in fila: in ciascuna la finestra
 *  risponde entro la soglia. */
async function giroDelVettore(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const sessione = await avvia([vettore]);
  const flowchart = `${testi.flowchart}: ${JSON.parse(vettoreRiempito).metadata.name}`;
  await attendi(`il flowchart «${flowchart}»`, async () => ((await script(sessione, `return document.querySelector(${JSON.stringify(`[role="group"][aria-label="${flowchart}"]`)}) !== null;`)) ? true : undefined), 150);
  const predefinita = await corsaDelVettore(sessione, testi, "colonne dei primi dieci (predefinita)");
  await clicSu(sessione, `//header//button[normalize-space()="${testi.impostazioni}"]`);
  await clicSu(sessione, `//*[@role="dialog"]//*[@role="tab"][normalize-space()="${testi.impostazioniTabella}"]`);
  await clicSu(sessione, `//*[@role="dialog"]//label[normalize-space()="${testi.formaInFila}"]`);
  await clicSu(sessione, `//*[@role="dialog"]//button[normalize-space()="${testi.progettoConferma}"]`);
  await attendi("la finestra delle Impostazioni chiusa", async () => ((await script(sessione, `return document.querySelector('[role="dialog"]') === null;`)) ? true : undefined), 100);
  const inFila = await corsaDelVettore(sessione, testi, "in fila (scelta nelle Impostazioni)", uscita === undefined ? undefined : () => suggerimento(sessione));
  await chiudi(sessione);
  if (predefinita.spiegazione === null || inFila.spiegazione === null || predefinita.spiegazione === inFila.spiegazione || inFila.colonne >= predefinita.colonne)
    rosso("VETTORE", `le due corse non hanno mostrato le due forme: riga sopra la tabella ${JSON.stringify(predefinita.spiegazione)} e ${JSON.stringify(inFila.spiegazione)}, colonne ${predefinita.colonne} e ${inFila.colonne}; ${predefinita.descritte}; ${inFila.descritte}`);
  // In ciascuna la tabella ha le sue righe alla fine (la seconda esecuzione la lasciava vuota: trovato qui).
  if (predefinita.righe === 0 || inFila.righe === 0) rosso("VETTORE", `a esecuzione finita la tabella senza righe: ${predefinita.righe} nella forma predefinita, ${inFila.righe} in fila`);
  const peggiore = Math.max(predefinita.peggiore, inFila.peggiore);
  console.log(
    `VETTORE: VERDE | in «${lingua}», F5 sul vettore di 1000 elementi riempito da un ciclo, dato come argomento; ${predefinita.descritte} (${predefinita.colonne} colonne); ${inFila.descritte} (${inFila.colonne} colonne); righe disegnate alla fine ${predefinita.righe} e ${inFila.righe}; il più lungo ${peggiore} ms, margine ${Math.round((100 * (SOGLIA_MS - peggiore)) / SOGLIA_MS)}% (soglia ${SOGLIA_MS} ms) | controllo positivo: le due forme diverse (la riga sopra la tabella e le colonne), il campionatore acceso`,
  );
}

/** SUGGERIMENTO: il puntatore del mouse su una cella del vettore in fila della tabella, poi, dopo tre secondi, la
 *  fotografia dello schermo virtuale. */
async function suggerimento(sessione: string): Promise<void> {
  // La cella del vettore in fila: quella col suggerimento più lungo fra le celle disegnate coi pezzi del valore.
  const trova = `const celle = [...document.querySelectorAll("tbody td[title]")].filter((td) => td.querySelector("div") !== null && td.title.includes(" · ")); const c = celle.sort((a, b) => b.title.length - a.title.length)[0];`;
  // A corsa finita la tabella disegna le righe in vista al fotogramma dopo: si aspetta la cella fino a 5 s.
  let cella: Record<string, string> | null = null;
  for (let d = 0; d < 50 && cella === null; d++) {
    cella = (await script(sessione, `${trova} if (c === undefined) return null; c.scrollIntoView({ block: "center", inline: "nearest" }); return c;`)) as Record<string, string> | null;
    if (cella === null) await Bun.sleep(100);
  }
  if (cella === null) {
    const scatto = Bun.spawn(["import", "-display", ":99", "-window", "root", join(uscita!, "suggerimento-tabella-senza-celle.png")], { stdout: "ignore", stderr: "ignore" });
    await scatto.exited;
    const visto = await script(
      sessione,
      `const t = [...document.querySelectorAll("td[title]")]; const b = [...document.querySelectorAll("tbody td[title]")]; const d = b.filter((td) => td.querySelector("div") !== null); const corpo = document.querySelector("tbody"); const scorre = corpo?.closest("table")?.parentElement; return { celleColTitolo: t.length, nelCorpo: b.length, coiPezzi: d.length, coiPunti: d.filter((td) => td.title.includes(" · ")).length, righe: [...document.querySelectorAll("tbody tr")].map((tr) => \`\${tr.getAttribute("data-riga") ?? "-"}:\${Math.round(tr.getBoundingClientRect().height)}\`), contenitore: scorre ? { alto: scorre.clientHeight, scorrimento: scorre.scrollTop, totale: scorre.scrollHeight } : null, finestra: [innerWidth, innerHeight], spiegazione: document.querySelector("[data-spiega]")?.textContent ?? null };`,
    );
    rosso("SUGGERIMENTO", `nessuna cella del vettore in fila disegnata nella tabella: ${JSON.stringify(visto)}`);
  }
  const testo = (await script(sessione, `${trova} return c.title;`)) as string;
  const muovi = (x: number) => ({ type: "pointerMove", duration: 100, origin: cella, x, y: 0 });
  await wd("POST", `/session/${sessione}/actions`, { actions: [{ type: "pointer", id: "mouse", parameters: { pointerType: "mouse" }, actions: [muovi(0), { type: "pause", duration: 200 }, muovi(2)] }] });
  await Bun.sleep(3_000);
  const foto = join(uscita!, "suggerimento-webkitgtk.png");
  const scatto = Bun.spawn(["import", "-display", ":99", "-window", "root", foto], { stdout: "ignore", stderr: "pipe" });
  const [errore, codice] = await Promise.all([new Response(scatto.stderr).text(), scatto.exited]);
  if (codice !== 0 || !existsSync(foto)) rosso("SUGGERIMENTO", `la fotografia non è riuscita (exit ${codice}): ${errore.trim()}`);
  console.log(`SUGGERIMENTO: FOTOGRAFATO | ${foto}: il puntatore del mouse su una cella del vettore in fila (il testo intero ha ${testo.split(" · ").length} elementi, ${testo.length} caratteri); quanti se ne leggono lo dice la fotografia`);
}

/** La soglia della misura della memoria, scritta prima della misura: il fondo degli ultimi 60 s sopra il valore a 10 s. */
const SOGLIA_FONDO_MB = 100;

/** La memoria privata dei processi dell'app e di WebKitGTK (`algodesign`, `WebKit*Process`), in MB, da `smaps_rollup`. */
function memoriaDellApp(): { mb: number; processi: number } {
  let kb = 0;
  let processi = 0;
  for (const pid of readdirSync("/proc").filter((v) => /^\d+$/.test(v))) {
    try {
      const nome = basename(readlinkSync(`/proc/${pid}/exe`));
      if (nome !== "algodesign" && !(nome.startsWith("WebKit") && nome.endsWith("Process"))) continue;
      const righe = readFileSync(`/proc/${pid}/smaps_rollup`, "latin1");
      for (const m of righe.matchAll(/^Private_(Clean|Dirty):\s+(\d+) kB$/gm)) kb += Number(m[2]);
      processi++;
    } catch {
      // Uscito nel frattempo, o non nostro.
    }
  }
  return { mb: Math.round(kb / 1024), processi };
}

/** MEMORIA: il ciclo dei seimila caratteri per 120 s, la memoria ogni 2 s, poi «Ferma». */
async function giroDellaMemoria(lingua: Lingua): Promise<void> {
  const testi = dizionari[lingua];
  const sessione = await avvia([pesante]);
  const flowchart = `${testi.flowchart}: memoria`;
  await attendi(`il flowchart «${flowchart}»`, async () => ((await script(sessione, `return document.querySelector(${JSON.stringify(`[role="group"][aria-label="${flowchart}"]`)}) !== null;`)) ? true : undefined), 150);
  const stato = (): Promise<string> => script(sessione, `return document.querySelector("[data-stato-esecuzione]")?.textContent ?? "";`).catch(() => "");
  const prima = memoriaDellApp();
  const f5 = String.fromCharCode(0xe035);
  await tasti(sessione, f5);
  const partenza = Date.now();
  const campioni: { s: number; mb: number; processi: number }[] = [];
  while (Date.now() - partenza < 120_000) {
    await Bun.sleep(2_000);
    campioni.push({ s: Math.round((Date.now() - partenza) / 1000), ...memoriaDellApp() });
  }
  const durante = await stato();
  const righe = (await script(sessione, `return document.querySelector('[role="log"]')?.childElementCount ?? 0;`)) as number;
  await tasti(sessione, String.fromCharCode(0xe008), f5);
  let fermata = "";
  for (let d = 0; d < 300 && fermata !== testi.statoPronto; d++) {
    fermata = await stato();
    if (fermata !== testi.statoPronto) await Bun.sleep(100);
  }
  await Bun.sleep(5_000);
  const dopo = memoriaDellApp();
  await chiudi(sessione);
  writeFileSync(join(uscita!, "memoria-webkitgtk.txt"), `prima ${prima.mb} MB (${prima.processi} processi)\n${campioni.map((c) => `${c.s} s ${c.mb} MB (${c.processi} processi)`).join("\n")}\ndopo «Ferma» e 5 s ${dopo.mb} MB\n`);
  if (righe === 0 || durante === testi.statoPronto || fermata !== testi.statoPronto) rosso("MEMORIA", `il programma non ha girato come atteso: ${righe} righe nella console, stato a 120 s «${durante}», dopo «Ferma» «${fermata}»`);
  const a10 = campioni.find((c) => c.s >= 10);
  const coda = campioni.filter((c) => c.s >= 60);
  if (a10 === undefined || coda.length === 0 || campioni.some((c) => c.processi === 0)) rosso("MEMORIA", `campioni insufficienti o senza processi: ${JSON.stringify(campioni.slice(0, 5))}`);
  const fondo = Math.min(...coda.map((c) => c.mb));
  const picco = campioni.reduce((a, c) => (c.mb > a.mb ? c : a));
  const descritte = `prima ${prima.mb} MB, a 10 s ${a10.mb} MB, picco ${picco.mb} MB a ${picco.s} s, fondo degli ultimi 60 s ${fondo} MB (${fondo - a10.mb >= 0 ? "+" : ""}${fondo - a10.mb} MB), dopo «Ferma» ${dopo.mb} MB; ${campioni.length} campioni, ${righe} righe nella console`;
  if (fondo - a10.mb > SOGLIA_FONDO_MB) rosso("MEMORIA", `il fondo sale oltre la soglia di ${SOGLIA_FONDO_MB} MB: ${descritte}`);
  console.log(`MEMORIA: VERDE | il ciclo dei seimila caratteri per 120 s in WebKitGTK: ${descritte} | soglia sul fondo +${SOGLIA_FONDO_MB} MB, scritta prima`);
}

async function giroSenzaDati(): Promise<void> {
  const { opposta, sessione } = await primoAvvioECambio("TRACCE (controllo positivo)");
  const configurazione = join(homedir(), ".config", identificatore);
  await attendiFile(join(configurazione, "preferenze.json"), opposta, "TRACCE (controllo positivo)");
  await chiudi(sessione);
  console.log(`SENZA DATA: preferenza «${opposta}» scritta in ${configurazione}`);
}

// ------------------------------------------------------------------------------------------- preparazione

const xvfb = Bun.spawn(["Xvfb", ":99", "-screen", "0", "1280x800x24"], { stdout: "ignore", stderr: "ignore" });
const tauriDriver = Bun.spawn(["tauri-driver"], { env: ambiente, stdout: "inherit", stderr: "inherit" });

let esito = 0;
try {
  let origine: string;
  if (estratta === undefined) {
    const prodotte = readdirSync(cartellaBundle).filter((voce) => voce.endsWith(".AppImage")).sort();
    if (prodotte.length !== 1) rosso("PROVA", `in ${cartellaBundle} servono una sola AppImage, trovate ${JSON.stringify(prodotte)}`);
    mkdirSync(cartellaProva);
    cpSync(join(cartellaBundle, prodotte[0]!), appimage);
    if (giro !== "senza-data") mkdirSync(dati);
    origine = prodotte[0]!;
  } else {
    // L'archivio estratto: l'AppImage e `data/` vuota ci sono già; il giro senza `data` la toglie.
    if (!existsSync(appimage) || !existsSync(dati) || readdirSync(dati).length > 0) rosso("PROVA", `in «${cartellaProva}» servono AlgoDesign.AppImage e data/ vuota`);
    if (giro === "senza-data") rmdirSync(dati);
    origine = "dall'archivio";
  }
  writeFileSync(vettore, vettoreRiempito);
  writeFileSync(pesante, programmaPesante);
  await attendi("lo schermo virtuale :99", () => (existsSync("/tmp/.X11-unix/X99") ? true : undefined));
  await attendi("tauri-driver sulla 4444", async () => ((await wd("GET", "/status")).ready === true ? true : undefined));
  console.log(`GIRO ${giro}: AppImage ${origine} (${statSync(appimage).size} byte) in «${cartellaProva}», data/ ${existsSync(dati) ? "presente" : "assente"}`);

  if (giro === "portabile") await giroPortabile();
  if (giro === "senza-data") await giroSenzaDati();
  console.log(`GIRO ${giro}: VERDE`);
} catch (e) {
  console.log(e instanceof ClausolaRossa ? e.message : `ERRORE DEL GIRO: ${String(e)}${e instanceof Error ? `\n${e.stack}` : ""}`);
  console.log(`GIRO ${giro}: ROSSO`);
  esito = 1;
} finally {
  tauriDriver.kill();
  xvfb.kill();
  await Promise.all([tauriDriver.exited, xvfb.exited]);
}
process.exit(esito);
