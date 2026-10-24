// Le difese del lavoro non salvato, nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del
// build), col guscio simulato.
//
// - Con dei campi aperti (i campi di un blocco nel riquadro e nel pannello, la scheda di un dato, le celle di un
//   dato) e con la finestra delle Impostazioni, Ctrl+Z, Ctrl+Y e Ctrl+Maiusc+Z non cambiano il progetto, col
//   fuoco su ogni genere di controllo che hanno (campo di testo, pulsante, casella, scelta, radio) e, nei campi
//   di un blocco, sul corpo della pagina dopo un clic sulla casella (nel WebKit per Windows il clic non dà il
//   fuoco); i
//   campi restano aperti dopo ogni tasto. Ogni tasto parte da uno stato fresco: un passo da annullare (un
//   blocco, nei blocchi del flowchart) e uno da ripetere (il valore iniziale di un dato, solo nelle righe dei
//   dati, lette dai valori dei campi e dal testo); il progetto si legge dal documento, perché sotto una finestra
//   l'albero dell'accessibilità è nascosto. Gli stessi tasti non cambiano il progetto nemmeno senza campi aperti
//   col fuoco in un campo di testo o su una scelta delle celle, con l'elenco dei blocchi, con la domanda prima di
//   eliminare un dato e con la finestra degli errori: ogni condizione che ferma i tasti ha i suoi casi. Controllo
//   positivo, dentro la prova: chiusi i campi con Esc, e (nei campi dei blocchi e dei dati) riaperti e chiusi con
//   Invio, Ctrl+Z e Ctrl+Y cambiano il progetto. Premessa asserita: il fuoco sul corpo della pagina c'è in 6 casi
//   nel WebKit per Windows, in nessuno in Chromium e nel WebKit per Linux (dove il clic dà il fuoco al controllo).
// - Il fuoco che esce con Tab (dall'ultimo controllo) o Maiusc+Tab (dal primo) dai quattro modi dei campi li
//   conferma: il testo scritto è un passo (la riga di stato dice «modificato»), i campi si chiudono e Ctrl+Z
//   annulla il passo. Una pagina nuova per caso. Controllo positivo: Invio conferma, e il rilevatore lo vede.
//   Un clic dentro i campi (un pulsante, la casella) non li conferma, anche nel WebKit per Windows, dove il clic
//   lascia il fuoco sul corpo della pagina (premessa asserita per motore e piattaforma).
// - Con dei campi aperti e del testo scritto, i gesti da tastiera fuori dai campi (Maiusc+Tab su un «+» e poi
//   Canc, Ctrl+X, Ctrl+V, Invio con un blocco nuovo; Tab fino ad «Annulla» della barra e Invio, anche dopo un
//   clic su un pulsante dei campi, che nel WebKit per Windows non prende il fuoco, e «Annulla» raggiunto
//   asserito; Canc sulla
//   riga di un dato con la scheda aperta) trovano il testo già confermato: alla fine, con Ctrl+Z o Ctrl+Y dove
//   serve, il testo è nel progetto (Canc e Ctrl+X su un «+» non toccano il blocco dei campi). Uno spostamento da tastiera finisce quando il blocco preso sparisce.
// - Con del testo scritto e il fuoco nei campi ma non in un campo di testo, nei campi di un blocco (la casella),
//   nella scheda («Elimina il dato») e nelle celle (il «×» della riga), Ctrl+N, Ctrl+O e la chiusura (l'evento
//   che il guscio manda) chiedono delle modifiche, Ctrl+S e Ctrl+Maiusc+S salvano il testo, il guscio riceve
//   «modificato» e una ricarica fa chiedere al motore; coi campi di un blocco anche «Esempi» chiede. Coi campi
//   aperti ma nulla scritto la chiusura chiude senza chiedere. Controllo positivo: col progetto modificato
//   Ctrl+N chiede.
// - Il tasto destro su un campo di testo lascia il menu del sistema nei quattro modi dei campi (riquadro,
//   pannello, scheda, celle); nei dati a celle, su una scelta della riga, apre il menu del dato.
// - F5, Maiusc+F5, Ctrl+R, Ctrl+F5 e Ctrl+Maiusc+R arrivano alla pagina già fermati (`defaultPrevented`, letto da
//   un ascoltatore della finestra che viene dopo quelli dell'app), col fuoco su un blocco e in un campo di testo.
//   F5 e Maiusc+F5 sono anche i tasti dell'esecuzione: F5 la avvia (dopo aver confermato i campi aperti); dopo
//   ogni tasto il pulsante «Ferma» la chiude, e il tasto successivo parte dalla finestra modificabile;
//   il tasto destro ferma il menu del browser fuori dai campi di testo (un blocco, la barra, la riga di stato)
//   e lo lascia nei campi. Controllo positivo: il rilevatore vede il menu lasciato nel campo di testo.
// - Con modifiche non salvate, una ricarica che arriva comunque (chiesta dalla pagina) fa chiedere conferma al
//   motore (`beforeunload`) e, rinunciando, il progetto resta; senza modifiche la pagina si ricarica (controllo
//   positivo: il rilevatore vede la ricarica). La rete resta accesa dopo una chiusura che non avviene
//   («Annulla» della domanda, o il guscio che non chiude dopo «Non salvare»), e la X dopo chiede di nuovo (il
//   guscio simulato tiene «modificato» come il vero e simula la X); tace solo quando la finestra si chiude
//   davvero (controllo positivo).
// - Eliminare il dato che si sta scrivendo («Elimina il dato» e Canc dalla riga nella scheda, il «×» e un clic
//   sull'angolo della riga poi Canc nelle celle; un dato usato col valore iniziale scritto, lo stesso col nome
//   sostituito da uno che non è una parola sola, e uno nuovo non usato col nome scritto) prima conferma il testo:
//   il dato usato chiede e, rinunciando, il testo è nel progetto; quello non usato si elimina e Ctrl+Z lo riporta
//   col testo. Il dato col nome che non è una parola resta usato: le regole tengono il nome di prima, e la
//   domanda conta anche quello. Una pagina nuova per caso. Il dato appena aggiunto nella
//   scheda e lasciato vuoto sparisce senza domanda e senza passi. Controllo positivo: lo stesso rilevatore dice
//   «perso» per il testo rinunciato con Esc e «nel progetto» per quello confermato con Invio.
// - Nelle celle un clic sull'angolo di ognuna delle sei parti della riga (fuori dai campi) conferma il testo
//   scritto e lascia il fuoco sulla riga. Controllo positivo: Invio conferma, e il rilevatore lo vede.
// - «Salva con nome»: il nome che il sistema restituisce senza «.algo» lo riceve, «.ALGO» diventa «.algo»; se
//   così si arriva a un file
//   che c'è, l'app chiede «Sostituire?» e «Non sostituire» non scrive nulla, nemmeno quando il salvataggio
//   veniva dalla conferma delle modifiche (e il gesto dopo non continua: la sua finestra non compare in 2 s;
//   controllo positivo: con «Sostituisci» compare); quando il sistema ha già restituito
//   il nome col «.algo», nessuna domanda in più. Il guscio simulato prende la decisione con la stessa tabella
//   del guscio vero (`shell/src/salva-con-nome.json`, letta anche da `cargo test`).
// - Le finestre dell'app non si chiudono col clic fuori (sul velo): Proprietà, Nuovo, Impostazioni, Esempi, la
//   conferma prima di togliere un esempio, gli errori, la conferma delle modifiche, la conferma prima di
//   eliminare un dato, la conferma prima di sostituire un file.
//
// CHE COSA NON GUARDA:
// - un radio dentro dei campi aperti: i campi dei blocchi e dei dati non ne hanno (il radio provato è quello
//   della finestra delle Impostazioni);
// - nelle celle, che i campi restino aperti dopo un tasto: si vedono sempre, conta solo il progetto;
// - il fuoco fuori dai campi aperti in Chromium: lì il clic sulla casella le dà il fuoco, e il fuoco che esce
//   dai campi li conferma (per scelta); coi campi aperti il fuoco sta fuori solo nel WebKit per Windows, dopo
//   un clic (contato e asserito per motore e piattaforma);
// - le premesse del fuoco nel WebKit per Linux (il clic dà il fuoco al controllo: misurate una volta, a mano, nel
//   container) e nel WebKit di macOS (dedotte da Safari, mai misurate): nessuno strumento le esegue;
// - il ricaricamento vero della WebView2 (gli acceleratori del browser, il menu «Aggiorna»): qui si legge che
//   l'app ferma i tasti e il menu; che la WebView2 non ricarichi lo misura la prova sul prodotto (F5 a ogni
//   corsa; Ctrl+R, Ctrl+F5 e Ctrl+Maiusc+R misurati a mano, come dice l'intestazione della prova sul
//   prodotto);
// - le altre vie di ricarica o di navigazione (i tasti del browser di certe tastiere, Alt+Freccia, il pulsante
//   «indietro» del mouse, un file trascinato sulla finestra): nessuna prova;
// - il menu del tasto destro sulla riga delle costanti comuni (il riferimento non ne ha) e sulle righe dei dati
//   (lì apre il menu del dato, che ferma il menu del sistema da sé);
// - la finestra di conferma del motore per `beforeunload` nella WebView2 e in WebKitGTK;
// - la finestra del file nativa e la conferma di sostituzione del sistema (GTK, Windows): il guscio simulato
//   restituisce il percorso scritto dalla prova;
// - il clic fuori dai campi di un blocco o della scheda (li conferma, per scelta) e dagli elenchi (li chiude); nelle
//   celle si prova solo il clic sulla riga stessa;
// - la finestra che perde il fuoco (passando a un'altra applicazione): in Playwright il fuoco della pagina è
//   emulato. Per scelta i campi di un blocco e la scheda NON si confermano lì, le celle sì (il loro `onBlur`);
// - un controllo dei campi che sparisce col fuoco sopra (il «×» di un valore): misurato a parte, non qui;
// - i gesti da tastiera nei campi del pannello: lì si prova solo il fuoco che esce; nelle celle solo il fuoco che
//   esce e Canc sulla riga scelta col clic;
// - eliminare un dato dal suo menu (tasto destro) con del testo scritto: passa dalla stessa funzione del «×», non
//   provata a parte; il «×» delle celle raggiunto col Tab e premuto con Invio; il «×» di un'altra riga mentre se
//   ne scrive una; eliminare un dato coi campi di un blocco aperti (il gesto che arriva alla vista dei dati li
//   conferma prima); due dati che hanno portato lo stesso nome (la domanda può contare le regole dell'altro);
// - nella prova dell'eliminazione, nelle celle «il testo è nel progetto» si legge dai campi della riga, che
//   mostrano anche il testo di campi ancora aperti: lì decidono la domanda e le righe contate;
// - la X vera della finestra: qui la imita il guscio simulato; sul guscio vero c'è la prova sul prodotto (la
//   chiusura dopo un `destroy()` fallito non si raggiunge senza guastare il motore: `cargo test` prova l'ordine
//   della funzione che il comando chiama, non che il comando la chiami);
// - i comandi dei file, la chiusura e la ricarica col testo scritto nei campi del pannello (provati nel
//   riquadro, nella scheda e nelle celle); Ctrl+S e Ctrl+Maiusc+S nel progetto di prova aprono la stessa
//   finestra del file: quale tasto è quale comando lo prova la mappa dei tasti; i tasti dei file con una
//   finestra, l'elenco dei blocchi o la domanda aperti, o col fuoco in un campo di testo (lì restano del campo);
// - «Esempi» si raggiunge solo dalla barra, e il clic (o il Tab) ha già confermato i campi: quel caso non prova
//   la conferma del comando stesso, che provano Ctrl+N, Ctrl+O, Ctrl+S, Ctrl+Maiusc+S e la chiusura;
// - due nomi che differiscono per le maiuscole: il guscio simulato li confronta esatti (come Linux); che su
//   Windows siano lo stesso file lo prova solo `cargo test` su Windows;
// - la domanda «Sostituire?» rimpiazzata dalla chiusura: la sua risposta («no») non ha un effetto visibile;
// - il testo scritto nelle finestre Proprietà e Impostazioni quando si chiude l'app: per scelta non chiede e si
//   perde (chiudere l'app vale «Annulla» della finestra; il progetto non cambia);
// - un bersaglio dei campi che sparisce mentre sono aperti (un dato o un blocco tolti da altro): l'app chiude
//   quei campi, ma nessun gesto dell'utente ci arriva (ogni gesto che toglie conferma prima), quindi nessuna
//   prova lo costruisce;
// - nella prova dei comandi, Ctrl+N e Ctrl+O guardano la stessa domanda: quale comando apre che cosa lo prova
//   la mappa dei tasti (`ui/modifiche.test.ts`); «Esempi» con la scheda e le celle: lo raggiunge solo il clic
//   sulla barra, che conferma da sé.

import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { eventoDiChiusura } from "../ui/file";
import { RIFERIMENTO, stato } from "./albero";
import type { Finzione } from "./finzione-tauri";
import { apri, apriVuota, costruisciFinzione, voceDelMenu, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.use({ viewport: { width: 1920, height: 1080 } });
// Le prove di questo file sono indipendenti (ognuna apre le sue pagine): girano in parallelo.
test.describe.configure({ mode: "parallel" });

const flowchartDi = (page: Page, nome = RIFERIMENTO) => page.getByRole("group", { name: `${it.flowchart}: ${nome}`, exact: true });
const comando = (page: Page, nome: string) => page.getByRole("banner").getByRole("button", { name: nome, exact: true });
const nella = (page: Page, nome: string) => page.getByRole("group", { name: it.modifica, exact: true }).getByRole("button", { name: nome, exact: true });
const finzione = (page: Page) => page.evaluate(() => window.__finzione__);
const imposta = (page: Page, valori: Partial<Finzione>) => page.evaluate((v) => Object.assign(window.__finzione__, v), valori);
/** Due giri di disegno: ciò che un tasto ha cambiato è già nella pagina. */
const giro = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));

/** Il progetto come lo mostra la pagina: i blocchi del flowchart (identità e nome, in ordine) e le righe dei
 * dati, col testo e coi valori dei campi (nelle celle i dati stanno nei campi). Letti dal documento, non
 * dall'albero dell'accessibilità, che sotto una finestra è nascosto. Non la bozza: la riga dei dati che la
 * mostra (`bozza`, nelle celle) non si legge. */
async function progettoMostrato(page: Page, bozza: string | null = null): Promise<string> {
  const albero = await page.locator("[data-blocco]").evaluateAll((bs) => bs.map((b) => `${b.getAttribute("data-blocco")} ${b.getAttribute("aria-label")}`));
  const dati = await page
    .locator('tr[data-dato^="dati-"]')
    .evaluateAll(
      (righe, bozza) =>
        righe.map((r) =>
          r.getAttribute("data-dato") === bozza ? "(la bozza)" : [r.textContent, ...[...r.querySelectorAll("input, select")].map((c) => (c as HTMLInputElement).value)].join(" | "),
        ),
      bozza,
    );
  return JSON.stringify({ albero, dati });
}

/** Cambia l'autore dalla finestra Proprietà: un passo, il progetto è modificato. */
async function cambiaAutore(page: Page, autore: string): Promise<void> {
  await (await voceDelMenu(page, it.progetto)).click();
  const f = page.getByRole("dialog", { name: it.progettoTitolo, exact: true });
  await f.getByLabel(it.progettoAutore, { exact: true }).fill(autore);
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
}

// ------------------------------------------------------------------------------------------------ le bozze

const unaScrittura = (page: Page) => flowchartDi(page).getByRole("button", { name: new RegExp(`^${it.bloccoScrittura}: `) }).first();
const finestraImpostazioni = (page: Page) => page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });

/** Due blocchi inseriti (coi campi chiusi da Esc, il blocco resta), il valore iniziale di un dato cambiato, e un
 * Ctrl+Z: c'è un passo da annullare (un blocco: cambia l'albero del flowchart) e uno da ripetere (il dato:
 * cambia solo le righe dei dati). */
async function annullaERipetiPronti(page: Page, celle: boolean): Promise<void> {
  const flowchart = flowchartDi(page);
  for (let i = 0; i < 2; i++) {
    await flowchart.locator("[data-punto]").first().click();
    await page.getByRole("menuitem", { name: it.bloccoAssegnazione, exact: true }).click();
    await expect(page.locator("form")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("form")).toHaveCount(0);
  }
  // Il fuoco torna sul blocco al disegno dopo Esc: si aspetta che ci sia, o arriverebbe dopo il gesto seguente.
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest("[data-blocco]") !== null), { message: "premessa: il blocco inserito non ha il fuoco" }).toBe(true);
  // Il valore iniziale del quarto dato («contati», 0), confermato con Invio: un passo sui soli dati.
  if (celle) {
    const iniziale = page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiIniziale, n: "4" }), exact: true });
    await iniziale.fill("5");
    await iniziale.press("Enter");
  } else {
    await page.locator('tr[data-dato="dati-3"]').focus();
    await page.keyboard.press("Enter");
    const iniziale = page.locator("form").getByRole("textbox", { name: it.datiIniziale, exact: true });
    await iniziale.fill("5");
    await iniziale.press("Enter");
    await expect(page.locator("form")).toHaveCount(0);
  }
  await unaScrittura(page).focus();
  await page.keyboard.press("Control+z");
  expect(await pronti(page), "premessa: manca un passo da annullare o da ripetere").toBe(true);
}
/** «Annulla» e «Ripeti» accesi nella barra (anche sotto una finestra, che la nasconde ai lettori di schermo). */
async function pronti(page: Page): Promise<boolean> {
  const barra = page.getByRole("group", { name: it.modifica, exact: true, includeHidden: true });
  for (const nome of [it.annulla, it.ripeti])
    if ((await barra.getByRole("button", { name: nome, exact: true, includeHidden: true }).getAttribute("aria-disabled", { timeout: 2_000 })) !== "false") return false;
  return true;
}

type Bozza = {
  nome: string;
  salvate: Record<string, string>;
  /** Apre i campi (o la finestra) senza fare passi. */
  apri: (page: Page) => Promise<void>;
  /** Se sono ancora aperti. Nelle celle i campi si vedono sempre: lì conta solo il progetto. */
  aperti: (page: Page) => Promise<boolean>;
  /** Dove va il fuoco quando si preme il tasto: un controllo per genere (lancia se non c'è più). */
  bersagli: readonly (readonly [string, (page: Page) => Promise<void>])[];
  /** Chiude senza passi (Esc). */
  chiudi: (page: Page) => Promise<void>;
  /** Chiude con Invio, per il secondo controllo positivo (la finestra delle Impostazioni non ce l'ha). */
  invio?: (page: Page) => Promise<void>;
  /** La riga dei dati che mostra la bozza mentre i campi sono aperti (nelle celle). */
  rigaDellaBozza?: string;
};

const campiDelBlocco = (page: Page) => page.locator("form");
async function apriUnaScrittura(page: Page): Promise<void> {
  await unaScrittura(page).focus();
  await page.keyboard.press("Enter");
  await expect(campiDelBlocco(page)).toBeVisible();
}
const conTempo = { timeout: 2_000 };
const testoDelBlocco = (p: Page) => campiDelBlocco(p).getByRole("textbox").first();
const casella = (p: Page) => campiDelBlocco(p).getByRole("checkbox", { name: it.campoACapo, exact: true });
const bersagliDelBlocco = [
  ["campo di testo", (p: Page) => testoDelBlocco(p).focus(conTempo)],
  ["pulsante «Aggiungi un valore»", (p: Page) => campiDelBlocco(p).getByRole("button", { name: it.aggiungiValore, exact: true }).focus(conTempo)],
  ["casella «Va a capo»", (p: Page) => casella(p).focus(conTempo)],
  // In WebKit il clic su una casella non le dà il fuoco: resta sul corpo della pagina, coi campi aperti.
  ["il corpo della pagina dopo un clic sulla casella", (p: Page) => casella(p).click(conTempo)],
] as const;
const delBlocco = { aperti: async (p: Page) => (await campiDelBlocco(p).count()) === 1, bersagli: bersagliDelBlocco, apri: apriUnaScrittura };
const cella = (campo: string) => riempi(it.campoDellaRiga, { campo, n: "1" });
const nomeNellaScheda = (p: Page) => p.locator("form").getByRole("textbox", { name: it.datiNome, exact: true });
const nomeNelleCelle = (p: Page) => p.getByRole("textbox", { name: cella(it.datiNome), exact: true });
const conEsc = (campo: (p: Page) => Locator) => async (p: Page) => {
  await campo(p).focus();
  await p.keyboard.press("Escape");
};
const conInvio = (campo: (p: Page) => Locator) => async (p: Page) => {
  await campo(p).focus();
  await p.keyboard.press("Enter");
};

const bozze: readonly Bozza[] = [
  { nome: "campi di un blocco nel riquadro", salvate: { lingua: "it" }, ...delBlocco, chiudi: conEsc(testoDelBlocco), invio: conInvio(testoDelBlocco) },
  { nome: "campi di un blocco nel pannello", salvate: { lingua: "it", modoDeiBlocchi: "pannello" }, ...delBlocco, chiudi: conEsc(testoDelBlocco), invio: conInvio(testoDelBlocco) },
  {
    nome: "scheda di un dato",
    salvate: { lingua: "it" },
    apri: async (page) => {
      await page.locator('tr[data-dato="dati-0"]').focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("form")).toBeVisible();
    },
    aperti: async (p) => (await p.locator("form").count()) === 1,
    bersagli: [
      ["campo di testo", (p) => nomeNellaScheda(p).focus(conTempo)],
      ["scelta del tipo", (p) => p.locator("form").getByRole("combobox", { name: it.datiTipo, exact: true }).focus(conTempo)],
      ["pulsante «Elimina il dato»", (p) => p.locator("form").getByRole("button", { name: it.eliminaDato, exact: true }).focus(conTempo)],
    ],
    chiudi: conEsc(nomeNellaScheda),
    invio: conInvio(nomeNellaScheda),
  },
  {
    nome: "celle di un dato",
    salvate: { lingua: "it", modoDeiDati: "celle" },
    // Nelle celle i campi si aprono scrivendo: un carattere in fondo al nome.
    apri: async (page) => {
      await nomeNelleCelle(page).focus();
      await page.keyboard.press("End");
      await page.keyboard.type("x");
    },
    aperti: async () => true,
    bersagli: [
      ["campo di testo", (p) => nomeNelleCelle(p).focus(conTempo)],
      ["scelta del tipo", (p) => p.getByRole("combobox", { name: cella(it.datiTipo), exact: true }).focus(conTempo)],
      ["pulsante che elimina il dato", (p) => p.getByRole("button", { name: riempi(it.eliminaIlDato, { nome: "n" }), exact: true }).focus(conTempo)],
    ],
    chiudi: conEsc(nomeNelleCelle),
    invio: conInvio(nomeNelleCelle),
    rigaDellaBozza: "dati-0",
  },
  {
    nome: "finestra delle Impostazioni",
    salvate: { lingua: "it" },
    apri: async (page) => {
      await comando(page, it.impostazioni).click();
      await expect.poll(() => finestraImpostazioni(page).evaluate((el) => el.contains(document.activeElement)), { message: "la finestra non prende il fuoco" }).toBe(true);
    },
    aperti: (p) => finestraImpostazioni(p).isVisible(),
    bersagli: [["un radio", (p) => finestraImpostazioni(p).getByRole("radio").first().focus(conTempo)]],
    chiudi: async (p) => p.keyboard.press("Escape"),
  },
  // Senza campi aperti: nelle celle un campo di testo o una scelta dove non si è scritto nulla (lì il tasto resta
  // del campo), l'elenco dei blocchi, la domanda prima di eliminare un dato, la finestra degli errori.
  {
    nome: "celle di un dato, senza nulla scritto",
    salvate: { lingua: "it", modoDeiDati: "celle" },
    apri: async () => {},
    aperti: async () => true,
    bersagli: [
      ["campo di testo", (p) => nomeNelleCelle(p).focus(conTempo)],
      ["scelta del tipo", (p) => p.getByRole("combobox", { name: cella(it.datiTipo), exact: true }).focus(conTempo)],
    ],
    chiudi: async () => {},
  },
  {
    nome: "elenco dei blocchi",
    salvate: { lingua: "it" },
    apri: async (page) => {
      await flowchartDi(page).locator("[data-punto]").first().click();
      await expect(page.getByRole("menu")).toBeVisible();
    },
    aperti: (p) => p.getByRole("menu").isVisible(),
    bersagli: [["una voce dell'elenco", (p) => p.getByRole("menuitem", { name: it.bloccoAssegnazione, exact: true }).focus(conTempo)]],
    chiudi: async (p) => p.keyboard.press("Escape"),
  },
  {
    nome: "domanda prima di eliminare un dato",
    salvate: { lingua: "it" },
    // Canc sulla riga di «contati», usato dalle regole: la domanda.
    apri: async (page) => {
      await page.locator('tr[data-dato="dati-3"]').focus();
      await page.keyboard.press("Delete");
      await expect.poll(() => domandaDiEliminare(page).evaluate((el) => el.contains(document.activeElement)), { message: "la domanda non prende il fuoco" }).toBe(true);
    },
    aperti: (p) => domandaDiEliminare(p).isVisible(),
    bersagli: [["un pulsante della domanda", (p) => domandaDiEliminare(p).getByRole("button").first().focus(conTempo)]],
    chiudi: async (p) => p.keyboard.press("Escape"),
  },
  {
    nome: "finestra degli errori",
    salvate: { lingua: "it" },
    // «Apri» su un file rotto, dopo «Non salvare» (il progetto è modificato dai passi pronti).
    apri: async (page) => {
      await imposta(page, { daAprire: "C:\\rotto.algo", file: { "C:\\rotto.algo": "{" } });
      await (await voceDelMenu(page, it.apri)).click();
      await page.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: RIFERIMENTO }), exact: true }).getByRole("button", { name: it.modificheNonSalvare, exact: true }).click();
      await expect.poll(() => finestraErrori(page).evaluate((el) => el.contains(document.activeElement)), { message: "la finestra degli errori non prende il fuoco" }).toBe(true);
    },
    aperti: (p) => finestraErrori(p).isVisible(),
    bersagli: [["un pulsante della finestra", (p) => finestraErrori(p).getByRole("button").first().focus(conTempo)]],
    chiudi: async (p) => p.keyboard.press("Escape"),
  },
];
const finestraErrori = (page: Page) => page.getByRole("alertdialog", { name: riempi(it.apriErroreTitolo, { file: "rotto.algo" }), exact: true });
const TASTI_DELLA_CRONOLOGIA = ["Control+z", "Control+y", "Control+Shift+z"] as const;

/** Se il clic su un pulsante o su una casella lascia il fuoco sul corpo della pagina: sì nel WebKit di Playwright per
 * Windows (come in Safari su macOS), no in Chromium né nel WebKit per Linux, dove il clic dà il fuoco al controllo
 * (misurato). La piattaforma la dice `navigator.platform` («Win32», «Linux x86_64»): il profilo «Desktop Safari»
 * cambia solo l'user agent. Decide quale premessa le prove si aspettano. */
async function clicSenzaFuoco(browser: Browser, progetto: string): Promise<boolean> {
  if (!progetto.startsWith("webkit")) return false;
  const p = await browser.newPage();
  const linux = await p.evaluate(() => navigator.platform.startsWith("Linux"));
  await p.close();
  return !linux;
}

test("con dei campi aperti, o una finestra, Ctrl+Z, Ctrl+Y e Ctrl+Maiusc+Z non cambiano il progetto, col fuoco dovunque; chiusi, annullano di nuovo", async ({ browser }, info) => {
  test.setTimeout(480_000);
  const cambiati: string[] = [];
  const chiusi: string[] = [];
  const sulCorpo: string[] = [];
  let prove = 0;
  let accesi = 0;
  let positivi = 0;
  for (const b of bozze) {
    const nuova = async () => {
      const p = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await apri(p, b.salvate);
      await annullaERipetiPronti(p, b.salvate.modoDeiDati === "celle");
      return p;
    };
    let page = await nuova();
    for (const [bersaglio, metti] of b.bersagli) {
      await b.apri(page);
      for (const tasto of TASTI_DELLA_CRONOLOGIA) {
        const dove = `${b.nome} · fuoco su ${bersaglio} · ${tasto}`;
        // Ogni tasto da uno stato fresco: se il tasto di prima ha toccato la cronologia o chiuso i campi (solo su
        // un difetto), la pagina si rifà.
        if (!(await pronti(page)) || !(await b.aperti(page))) {
          await page.close();
          page = await nuova();
          await b.apri(page);
        }
        try {
          await metti(page);
        } catch {
          chiusi.push(`${dove}: il controllo non c'è più (i campi si sono chiusi)`);
          continue;
        }
        if (await page.evaluate(() => document.activeElement === document.body)) sulCorpo.push(dove);
        const prima = await progettoMostrato(page, b.rigaDellaBozza);
        await page.keyboard.press(tasto);
        await giro(page);
        prove++;
        if ((await progettoMostrato(page, b.rigaDellaBozza)) !== prima) cambiati.push(dove);
        if (!(await b.aperti(page))) chiusi.push(`${dove}: chiusi dal tasto`);
      }
      if (await b.aperti(page)) await b.chiudi(page);
      await giro(page);
    }
    // Controllo positivo: chiusi i campi (con Esc, poi riaperti e chiusi con Invio) i due tasti arrivano alla
    // cronologia, e il rilevatore lo vede.
    for (const chiusura of b.invio ? ["Esc", "Invio"] : ["Esc"]) {
      if (chiusura === "Invio") {
        await b.apri(page);
        await b.invio!(page);
        await giro(page);
      }
      await unaScrittura(page).focus();
      for (const tasto of ["Control+z", "Control+y"]) {
        positivi++;
        const prima = await progettoMostrato(page);
        await page.keyboard.press(tasto);
        await giro(page);
        if ((await progettoMostrato(page)) !== prima) accesi++;
      }
    }
    await page.close();
  }
  console.log(
    `[${info.project.name}] tasti della cronologia coi campi aperti: prove ${prove}, progetto cambiato ${cambiati.length}, campi chiusi ${chiusi.length}, fuoco sul corpo ${sulCorpo.length}; controllo positivo coi campi chiusi (Esc e Invio): ${accesi} su ${positivi}`,
  );
  expect(cambiati, "con dei campi aperti un tasto della cronologia ha cambiato il progetto").toEqual([]);
  expect(chiusi, "con dei campi aperti un tasto della cronologia li ha chiusi").toEqual([]);
  expect(prove).toBe(60);
  expect(positivi).toBe(26);
  // Premessa del caso «il corpo della pagina dopo un clic sulla casella»: il fuoco sul corpo c'è solo dove il clic non
  // dà il fuoco al controllo (il WebKit per Windows).
  expect(sulCorpo.length, "premessa: il fuoco sul corpo della pagina (6 nel WebKit per Windows, nessuno in Chromium e nel WebKit per Linux)").toBe(
    (await clicSenzaFuoco(browser, info.project.name)) ? 6 : 0,
  );
  expect(accesi, "controllo positivo spento: coi campi chiusi Ctrl+Z e Ctrl+Y non cambiano il progetto").toBe(positivi);
});

// -------------------------------------------------------------------------------------- il ricaricamento

/** Gli eventi come arrivano alla finestra dopo gli ascoltatori dell'app: fermati o no. */
type Evento = { tipo: string; dove: string; fermato: boolean };
async function registraEventi(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __eventi__: Evento[] };
    w.__eventi__ = [];
    const dove = (e: Event) => {
      const t = e.target as Element;
      return `${t.tagName}${t.getAttribute?.("aria-label") ? ` «${t.getAttribute("aria-label")}»` : ""}`;
    };
    addEventListener("keydown", (e: KeyboardEvent) => w.__eventi__.push({ tipo: `keydown ${e.ctrlKey ? "Ctrl+" : ""}${e.shiftKey ? "Maiusc+" : ""}${e.key}`, dove: dove(e), fermato: e.defaultPrevented }));
    addEventListener("contextmenu", (e) => w.__eventi__.push({ tipo: "contextmenu", dove: dove(e), fermato: e.defaultPrevented }));
  });
}
const eventi = (page: Page) => page.evaluate(() => (window as unknown as { __eventi__: Evento[] }).__eventi__.splice(0));

const TASTI_DEL_RICARICAMENTO = ["F5", "Shift+F5", "Control+r", "Control+F5", "Control+Shift+R"] as const;

// I tasti premuti da Playwright arrivano alla pagina, non agli acceleratori del motore: non ricaricherebbero
// nemmeno se l'app non li fermasse (misurato). Qui si legge solo che arrivano fermati.
test("F5, Maiusc+F5, Ctrl+R, Ctrl+F5 e Ctrl+Maiusc+R arrivano alla pagina già fermati; il menu del browser col tasto destro resta solo nei campi di testo", async ({ page }, info) => {
  await registraEventi(page);
  await apri(page, { lingua: "it" });
  const passati: string[] = [];
  const blocco = flowchartDi(page).getByRole("button", { name: new RegExp(`^${it.bloccoScrittura}: `) }).first();
  const campoDelDato = page.locator("form").getByRole("textbox", { name: it.datiNome, exact: true });
  /** Il campo del nome nella scheda del primo dato, aperta se serve (un clic altrove la chiude). */
  async function campoAperto(): Promise<Locator> {
    if ((await campoDelDato.count()) === 0) {
      await page.locator('tr[data-dato="dati-0"]').focus();
      await page.keyboard.press("Enter");
    }
    return campoDelDato;
  }
  for (const [dove, metti] of [
    ["un blocco", () => blocco.focus()],
    ["un campo di testo", async () => (await campoAperto()).focus()],
  ] as const) {
    for (const tasto of TASTI_DEL_RICARICAMENTO) {
      await metti();
      await page.keyboard.press(tasto);
      await page.waitForTimeout(300);
      const visti = await eventi(page);
      // F5 ha avviato l'esecuzione: «Ferma» la chiude (senza un'esecuzione il pulsante è spento).
      const ferma = page.getByRole("banner").getByRole("button", { name: it.ferma, exact: true });
      if ((await ferma.getAttribute("aria-disabled")) !== "true") await ferma.click();
      // Solo il tasto premuto (non i tasti dei modificatori, né l'Invio che ha aperto la scheda).
      const suo = visti.filter((e) => /^keydown (Ctrl\+)?(Maiusc\+)?(F5|r|R)$/.test(e.tipo));
      if (suo.length !== 1 || !suo[0]!.fermato) passati.push(`${tasto} su ${dove}: ${JSON.stringify(suo)}`);
    }
  }
  // Il menu del tasto destro: fermato fuori dai campi di testo (un blocco, la barra, la riga di stato), lasciato
  // nel campo di testo (gli altri modi dei campi: la prova del menu nei quattro modi).
  const menu: { dove: string; elemento: () => Promise<Locator>; fermato: boolean }[] = [
    { dove: "un blocco", elemento: async () => blocco, fermato: true },
    { dove: "la barra", elemento: async () => page.getByRole("banner").getByRole("group", { name: it.gruppoApplicazione, exact: true }), fermato: true },
    { dove: "la riga di stato", elemento: async () => page.getByRole("region", { name: it.rigaDiStato, exact: true }), fermato: true },
    { dove: "il campo di testo", elemento: campoAperto, fermato: false },
  ];
  const menuSbagliati: string[] = [];
  let visti = 0;
  for (const m of menu) {
    await (await m.elemento()).click({ button: "right" });
    await page.waitForTimeout(100);
    const suoi = (await eventi(page)).filter((e) => e.tipo === "contextmenu");
    visti += suoi.length;
    if (suoi.length !== 1 || suoi[0]!.fermato !== m.fermato) menuSbagliati.push(`${m.dove}: atteso ${m.fermato ? "fermato" : "lasciato"}, visti ${JSON.stringify(suoi)}`);
    await page.keyboard.press("Escape");
  }
  console.log(`[${info.project.name}] ricaricamento: tasti ${TASTI_DEL_RICARICAMENTO.length * 2}, passati ${passati.length}; tasto destro: ${menu.length} punti, eventi visti ${visti}, sbagliati ${menuSbagliati.length}`);
  expect(passati, "un tasto del ricaricamento arriva al motore senza essere fermato").toEqual([]);
  expect(menuSbagliati, "il menu del browser col tasto destro").toEqual([]);
  expect(visti, "premessa: un evento del tasto destro per punto").toBe(menu.length);
});

/** Una ricarica chiesta dalla pagina: quali domande del motore compaiono (rifiutate), e se la pagina si è
 * ricaricata (il segno lasciato prima sparisce). Misurato su una pagina minima col gestore scritto a mano, con
 * e senza un clic prima, nei due motori: `page.close({ runBeforeUnload })` non porta mai la domanda, una
 * ricarica sì. */
async function ricaricaChiesta(page: Page): Promise<{ domande: string[]; ricaricata: boolean }> {
  const domande: string[] = [];
  const rispondi = (d: import("@playwright/test").Dialog) => {
    domande.push(d.type());
    void d.dismiss();
  };
  page.on("dialog", rispondi);
  await page.evaluate(() => Object.assign(window, { __segno__: 1 }));
  await page.evaluate(() => location.reload());
  await page.waitForTimeout(1_500);
  await page.getByRole("banner").waitFor();
  const segno = await page.evaluate(() => (window as unknown as { __segno__?: number }).__segno__ ?? null);
  page.off("dialog", rispondi);
  return { domande, ricaricata: segno === null };
}

test("con modifiche non salvate una ricarica chiede conferma e, rinunciando, il progetto resta; senza modifiche la pagina si ricarica", async ({ browser }) => {
  const conModifiche = await browser.newPage();
  await apri(conModifiche, { lingua: "it" });
  await cambiaAutore(conModifiche, "Prova");
  const con = await ricaricaChiesta(conModifiche);
  expect(con, "con modifiche, la ricarica non chiede conferma (o la pagina si è ricaricata)").toEqual({ domande: ["beforeunload"], ricaricata: false });
  await expect(conModifiche.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoModificato);
  await conModifiche.close();

  // Controllo positivo nel verso opposto: senza modifiche (dopo un clic, perché il motore chiede solo dopo un
  // gesto dell'utente) la pagina si ricarica senza domande, e il rilevatore lo vede.
  const senza = await browser.newPage();
  await apri(senza, { lingua: "it" });
  await flowchartDi(senza).click({ position: { x: 5, y: 5 } });
  expect(await ricaricaChiesta(senza), "senza modifiche").toEqual({ domande: [], ricaricata: true });
  await senza.close();
});

// ----------------------------------------------------------------------------------- salva con nome

test("«Salva con nome»: il nome senza «.algo» lo riceve; se così si arriva a un file che c'è, l'app chiede prima di sostituirlo, e «Non sostituire» non scrive", async ({ page }) => {
  test.setTimeout(90_000);
  const VECCHIO = '{ "il file che c\'era": true }';
  await apriVuota(page, { lingua: "it" }, { file: { "C:\\miei\\media.algo": VECCHIO } });
  const sostituire = page.getByRole("alertdialog").filter({ hasText: "media.algo" });
  const scritti = async () => Object.keys((await finzione(page)).file).sort();

  // Il sistema restituisce «media» (l'estensione tolta a mano) e «media.algo» c'è: l'app chiede.
  await imposta(page, { daSalvare: "C:\\miei\\media" });
  await (await voceDelMenu(page, it.salvaConNome)).click();
  await expect(sostituire, "nessuna domanda prima di sostituire «media.algo» (il sistema aveva restituito «media»)").toBeVisible({ timeout: 5_000 });
  await expect(sostituire.getByRole("button", { name: it.sostituireRinuncia, exact: true })).toBeFocused();
  await sostituire.getByRole("button", { name: it.sostituireRinuncia, exact: true }).click();
  await expect(sostituire).toBeHidden();
  expect(await scritti(), "«Non sostituire» ha scritto un file").toEqual(["C:\\miei\\media.algo"]);
  expect((await finzione(page)).file["C:\\miei\\media.algo"], "«Non sostituire» ha sostituito il file").toBe(VECCHIO);
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText(it.statoNessunFile);

  // Di nuovo, e «Sostituisci»: il file è il progetto, e il progetto è legato a lui.
  await (await voceDelMenu(page, it.salvaConNome)).click();
  await sostituire.getByRole("button", { name: it.sostituireConferma, exact: true }).click();
  await expect(page.getByRole("region", { name: it.rigaDiStato, exact: true })).toContainText("media.algo");
  expect(JSON.parse((await finzione(page)).file["C:\\miei\\media.algo"]!).metadata.name).toBe(it.progettoSenzaNome);

  // Il sistema restituisce già «media.algo» (l'ha confermato lui): nessuna domanda in più.
  await cambiaAutore(page, "Seconda");
  await imposta(page, { daSalvare: "C:\\miei\\media.algo" });
  await (await voceDelMenu(page, it.salvaConNome)).click();
  await expect.poll(async () => JSON.parse((await finzione(page)).file["C:\\miei\\media.algo"]!).metadata.author ?? null).toBe("Seconda");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // Un nome con un punto riceve «.algo», «.ALGO» diventa «.algo»; nessun file c'era, nessuna domanda.
  for (const [dato, atteso] of [
    ["C:\\miei\\esercizio 2.1", "C:\\miei\\esercizio 2.1.algo"],
    ["C:\\miei\\GRANDE.ALGO", "C:\\miei\\GRANDE.algo"],
  ]) {
    await imposta(page, { daSalvare: dato });
    await (await voceDelMenu(page, it.salvaConNome)).click();
    await expect.poll(scritti, { message: `«${dato}» non è diventato «${atteso}»` }).toContain(atteso);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  }
  expect(await scritti()).toEqual(["C:\\miei\\GRANDE.algo", "C:\\miei\\esercizio 2.1.algo", "C:\\miei\\media.algo"]);

  // Dalla conferma delle modifiche (prima di «Nuovo», progetto non legato a un file perché quello di prima è
  // stato rifiutato): «Non sostituire» non scrive, e «Nuovo» non continua.
  const altra = await page.context().newPage();
  await apriVuota(altra, { lingua: "it" }, { file: { "C:\\miei\\media.algo": VECCHIO } });
  await cambiaAutore(altra, "Terza");
  await altra.evaluate(() => Object.assign(window.__finzione__, { daSalvare: "C:\\miei\\media" }));
  await (await voceDelMenu(altra, it.nuovo)).click();
  await altra.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: it.progettoSenzaNome }), exact: true }).getByRole("button", { name: it.modificheSalva, exact: true }).click();
  const sostituireAltra = altra.getByRole("alertdialog").filter({ hasText: "media.algo" });
  await expect(sostituireAltra, "dalla conferma delle modifiche, nessuna domanda prima di sostituire").toBeVisible({ timeout: 5_000 });
  await sostituireAltra.getByRole("button", { name: it.sostituireRinuncia, exact: true }).click();
  await expect(sostituireAltra).toBeHidden();
  expect((await altra.evaluate(() => window.__finzione__.file))["C:\\miei\\media.algo"]).toBe(VECCHIO);
  // «Nuovo» non continua: la sua finestra non compare nemmeno aspettandola.
  const nuovo = altra.getByRole("dialog", { name: it.progettoNuovoTitolo, exact: true });
  const comparsa = () => nuovo.waitFor({ timeout: 2_000 }).then(() => true, () => false);
  expect(await comparsa(), "«Nuovo» è continuato senza salvare").toBe(false);
  // Controllo positivo: di nuovo, con «Sostituisci»; il file è scritto e «Nuovo» continua (il rilevatore lo vede).
  await (await voceDelMenu(altra, it.nuovo)).click();
  await altra.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: it.progettoSenzaNome }), exact: true }).getByRole("button", { name: it.modificheSalva, exact: true }).click();
  await sostituireAltra.getByRole("button", { name: it.sostituireConferma, exact: true }).click();
  expect(await comparsa(), "controllo positivo spento: dopo «Sostituisci» «Nuovo» non continua").toBe(true);
  expect(JSON.parse((await altra.evaluate(() => window.__finzione__.file))["C:\\miei\\media.algo"]!).metadata.author).toBe("Terza");
  await altra.close();
});

// ------------------------------------------------------------------------------------- il clic fuori

test("le finestre dell'app non si chiudono col clic fuori: solo coi loro comandi o con Esc", async ({ page }, info) => {
  test.setTimeout(90_000);
  await apriVuota(page, { lingua: "it" }, { file: { "C:\\rotto.algo": "{", "C:\\miei\\media.algo": "{}" } });
  const finestra = (titolo: string) => page.getByRole("dialog", { name: titolo, exact: true });
  const allerta = (titolo: string) => page.getByRole("alertdialog", { name: titolo, exact: true });
  const chiuse: string[] = [];
  let fuori = 0;
  /** Il clic sul velo, in alto a sinistra: fuori dalla finestra (premessa contata). Si clicca quando la
   * finestra ha preso il fuoco e un istante dopo, perché il clic fuori conti già. */
  async function clicFuori(nome: string, f: Locator): Promise<void> {
    if (!(await f.waitFor({ timeout: 3_000 }).then(() => true, () => false))) {
      chiuse.push(`${nome} (non si è aperta)`);
      return;
    }
    await expect.poll(() => f.evaluate((el) => el.contains(document.activeElement)), { message: `la finestra ${nome} non prende il fuoco` }).toBe(true);
    await page.waitForTimeout(300);
    if (await f.evaluate((el) => !el.contains(document.elementFromPoint(8, 8)))) fuori++;
    await page.mouse.click(8, 8);
    await page.waitForTimeout(400);
    if (!(await f.isVisible())) chiuse.push(nome);
  }
  const giri: [string, () => Promise<void>, () => Locator][] = [
    ["Proprietà", async () => (await voceDelMenu(page, it.progetto)).click(), () => finestra(it.progettoTitolo)],
    ["Nuovo", async () => (await voceDelMenu(page, it.nuovo)).click(), () => finestra(it.progettoNuovoTitolo)],
    ["Impostazioni", () => comando(page, it.impostazioni).click(), () => finestra(it.impostazioniTitolo)],
    [
      "errori",
      async () => {
        await imposta(page, { daAprire: "C:\\rotto.algo" });
        await (await voceDelMenu(page, it.apri)).click();
      },
      () => allerta(riempi(it.apriErroreTitolo, { file: "rotto.algo" })),
    ],
    [
      "sostituire",
      async () => {
        await imposta(page, { daSalvare: "C:\\miei\\media" });
        await (await voceDelMenu(page, it.salvaConNome)).click();
      },
      () => page.getByRole("alertdialog").filter({ hasText: "media.algo" }),
    ],
    [
      "modifiche",
      async () => {
        await cambiaAutore(page, "Z");
        await (await voceDelMenu(page, it.nuovo)).click();
      },
      () => allerta(riempi(it.modificheTitolo, { nome: it.progettoSenzaNome })),
    ],
  ];
  for (const [nome, apriLa, la] of giri) {
    await apriLa();
    await clicFuori(nome, la());
    if (await la().isVisible()) {
      await page.keyboard.press("Escape");
      await expect(la()).toBeHidden();
    }
  }
  // Gli esempi e, sopra, la conferma prima di toglierne uno (Esc torna agli esempi).
  await (await voceDellAiuto(page, it.esempi)).click();
  const esempi = finestra(it.esempiTitolo);
  await clicFuori("Esempi", esempi);
  if (!(await esempi.isVisible())) await (await voceDellAiuto(page, it.esempi)).click();
  await esempi.getByRole("listitem").first().getByRole("button", { name: it.esempioTogli, exact: true }).click();
  const togliere = page.getByRole("alertdialog").filter({ hasText: ".algo" });
  await clicFuori("togliere un esempio", togliere);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(esempi).toBeHidden();
  // La conferma prima di eliminare un dato usato, dal menu della riga (nel riferimento il primo dato è usato).
  await apri(page, { lingua: "it" });
  await page.locator('tr[data-dato="dati-0"]').click({ button: "right" });
  await page.getByRole("menuitem", { name: it.menuElimina, exact: true }).click();
  const eliminare = page.getByRole("alertdialog").filter({ hasText: it.eliminaConferma });
  await clicFuori("eliminare un dato", eliminare);
  console.log(`[${info.project.name}] clic fuori: finestre 9, clic sul velo ${fuori}, chiuse ${chiuse.length} ${JSON.stringify(chiuse)}`);
  expect(chiuse, "finestre chiuse dal clic fuori").toEqual([]);
  expect(fuori, "premessa: il punto del clic sta fuori da ogni finestra").toBe(9);
});

// ------------------------------------------------------------------------- il fuoco che esce dai campi

const IL_TESTO = "XYZ";
const rigaDiStato = (page: Page) => page.getByRole("region", { name: it.rigaDiStato, exact: true });
/** Il progetto è diverso da quello aperto (la riga di stato lo dice): la bozza non conta, un passo sì. */
const modificato = async (page: Page) => ((await rigaDiStato(page).textContent()) ?? "").includes(it.statoModificato);

/** Dei campi aperti con «XYZ» scritto in fondo al primo campo di testo, e dove mettere il fuoco per uscirne
 * all'indietro (il primo controllo) e in avanti (l'ultimo). */
type Aperti = {
  nome: string;
  salvate: Record<string, string>;
  apri: (page: Page) => Promise<void>;
  primo: (page: Page) => Locator;
  ultimo: (page: Page) => Locator;
  /** Se i campi si vedono chiusi (le celle restano campi anche confermate). */
  siChiudono: boolean;
};
async function scriviInFondo(campo: Locator): Promise<void> {
  await campo.focus();
  await campo.press("End");
  await campo.pressSequentially(IL_TESTO);
}
const nelBlocco = (salvate: Record<string, string>, nome: string): Aperti => ({
  nome,
  salvate,
  apri: async (page) => {
    await apriUnaScrittura(page);
    await scriviInFondo(campiDelBlocco(page).getByRole("textbox").first());
  },
  primo: (p) => campiDelBlocco(p).getByRole("textbox").first(),
  ultimo: (p) => campiDelBlocco(p).getByRole("button", { name: it.rinuncia, exact: true }),
  siChiudono: true,
});
const aperti: readonly Aperti[] = [
  nelBlocco({ lingua: "it" }, "campi di un blocco nel riquadro"),
  nelBlocco({ lingua: "it", modoDeiBlocchi: "pannello" }, "campi di un blocco nel pannello"),
  {
    nome: "scheda di un dato",
    salvate: { lingua: "it" },
    apri: async (page) => {
      await page.locator('tr[data-dato="dati-0"]').focus();
      await page.keyboard.press("Enter");
      await scriviInFondo(nomeNellaScheda(page));
    },
    primo: nomeNellaScheda,
    ultimo: (p) => p.locator("form").getByRole("button", { name: it.rinuncia, exact: true }),
    siChiudono: true,
  },
  {
    nome: "celle di un dato",
    salvate: { lingua: "it", modoDeiDati: "celle" },
    apri: (page) => scriviInFondo(nomeNelleCelle(page)),
    primo: nomeNelleCelle,
    ultimo: (p) => p.locator('tr[data-dato="dati-0"]').getByRole("button"),
    siChiudono: false,
  },
];

test("il fuoco che esce dai campi aperti con Tab o Maiusc+Tab li conferma, come il clic fuori; poi Ctrl+Z annulla di nuovo", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const sbagliati: string[] = [];
  let casi = 0;
  for (const a of aperti)
    for (const [verso, tasto, da] of [
      ["Maiusc+Tab dal primo controllo", "Shift+Tab", a.primo],
      ["Tab dall'ultimo controllo", "Tab", a.ultimo],
    ] as const) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await apri(page, a.salvate);
      await a.apri(page);
      const prima = await modificato(page);
      await da(page).focus();
      await page.keyboard.press(tasto);
      await giro(page);
      casi++;
      const confermati = await modificato(page);
      const ancoraAperti = a.siChiudono ? await page.locator("form").count() : 0;
      // Ctrl+Z col fuoco su un blocco: il passo della conferma si annulla.
      await unaScrittura(page).focus();
      await page.keyboard.press("Control+z");
      await giro(page);
      const annullato = !(await modificato(page));
      if (prima || !confermati || ancoraAperti > 0 || !annullato)
        sbagliati.push(`${a.nome} · ${verso}: modificato prima ${prima}, testo nel progetto ${confermati}, campi ancora aperti ${ancoraAperti}, Ctrl+Z ha annullato ${annullato}`);
      await page.close();
    }
  // Controllo positivo: Invio conferma i campi, e il rilevatore lo vede.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(page, { lingua: "it" });
  await aperti[0]!.apri(page);
  const primaDiInvio = await modificato(page);
  await page.keyboard.press("Enter");
  await giro(page);
  const acceso = !primaDiInvio && (await modificato(page));
  await page.close();
  console.log(`[${info.project.name}] fuoco che esce dai campi: casi ${casi}, sbagliati ${sbagliati.length}; controllo positivo (Invio conferma, il rilevatore lo vede): ${acceso}`);
  expect(sbagliati, "il fuoco è uscito dai campi senza confermarli").toEqual([]);
  expect(casi, "i quattro modi dei campi, due versi ciascuno").toBe(8);
  expect(acceso, "controllo positivo spento: Invio ha confermato e il rilevatore non lo vede").toBe(true);
});

test("un clic dentro i campi su un pulsante o sulla casella non li conferma, anche in WebKit dove il clic non dà loro il fuoco", async ({ page }, info) => {
  await apri(page, { lingua: "it" });
  await aperti[0]!.apri(page);
  const fuochi: string[] = [];
  const sbagliati: string[] = [];
  for (const [nome, controllo] of [
    ["«Aggiungi un valore»", campiDelBlocco(page).getByRole("button", { name: it.aggiungiValore, exact: true })],
    ["la casella «Va a capo»", campiDelBlocco(page).getByRole("checkbox", { name: it.campoACapo, exact: true })],
  ] as const) {
    if ((await campiDelBlocco(page).count()) !== 1) {
      sbagliati.push(`${nome}: i campi non ci sono più`);
      continue;
    }
    await controllo.click();
    await giro(page);
    await page.waitForTimeout(100);
    // Dove sta il fuoco dopo il clic: in WebKit sul corpo della pagina (la premessa del caso).
    fuochi.push(`${nome} → ${await page.evaluate(() => document.activeElement?.tagName ?? "nessuno")}`);
    if ((await campiDelBlocco(page).count()) !== 1 || (await modificato(page))) sbagliati.push(`${nome}: i campi si sono chiusi o confermati`);
  }
  console.log(`[${info.project.name}] clic dentro i campi: ${fuochi.join(", ")}; sbagliati ${sbagliati.length}`);
  expect(sbagliati, "un clic dentro i campi li ha confermati").toEqual([]);
  // Premessa: nel WebKit per Windows il clic lascia il fuoco sul corpo della pagina, in Chromium e nel WebKit per Linux
  // lo dà al controllo.
  const sulCorpo = await clicSenzaFuoco(page.context().browser()!, info.project.name);
  expect(fuochi, "premessa: dove va il fuoco dopo il clic").toEqual([`«Aggiungi un valore» → ${sulCorpo ? "BODY" : "BUTTON"}`, `la casella «Va a capo» → ${sulCorpo ? "BODY" : "INPUT"}`]);
});

/** Un gesto da tastiera dopo aver scritto nei campi aperti; poi, dove serve, Ctrl+Z o Ctrl+Y; alla fine il
 * testo scritto deve stare nel progetto (i campi li ha confermati prima il fuoco che è uscito). */
type Gesto = { nome: string; prima?: (page: Page) => Promise<void>; apri: (page: Page) => Promise<void>; fai: (page: Page) => Promise<void> };
async function maiuscTab(page: Page): Promise<void> {
  await campiDelBlocco(page).getByRole("textbox").first().focus();
  await page.keyboard.press("Shift+Tab");
}
/** Tab fino ad «Annulla» della barra; se non lo raggiunge, il gesto non vale (Invio partirebbe dove capita). */
async function tabFinoAdAnnulla(page: Page): Promise<void> {
  const annulla = nella(page, it.annulla);
  for (let i = 0; i < 60 && !(await annulla.evaluate((b) => b === document.activeElement)); i++) await page.keyboard.press("Tab");
  if (!(await annulla.evaluate((b) => b === document.activeElement))) throw new Error("premessa: «Annulla» della barra non raggiunto col Tab");
}
/** Un blocco inserito e chiuso con Esc: un passo da annullare. Si aspetta che il fuoco torni sul blocco (al
 * disegno dopo): arrivato più tardi, uscirebbe dai campi aperti dal gesto seguente e li confermerebbe. */
async function unPassoPrima(page: Page): Promise<void> {
  await flowchartDi(page).locator("[data-punto]").first().click();
  await page.getByRole("menuitem", { name: it.bloccoAssegnazione, exact: true }).click();
  await expect(page.locator("form")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("form")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.closest("[data-blocco]") !== null), { message: "premessa: il blocco inserito non ha il fuoco" }).toBe(true);
}
const gesti: readonly Gesto[] = [
  // Canc e Ctrl+X col fuoco su un «+» non toccano il blocco scelto prima (quello dei campi): il testo confermato
  // dal fuoco uscito resta, senza bisogno di Ctrl+Z.
  {
    nome: "Maiusc+Tab su un «+», Canc",
    apri: aperti[0]!.apri,
    fai: async (page) => {
      await maiuscTab(page);
      await page.keyboard.press("Delete");
      await giro(page);
    },
  },
  {
    nome: "Maiusc+Tab su un «+», Ctrl+X",
    apri: aperti[0]!.apri,
    fai: async (page) => {
      await maiuscTab(page);
      await page.keyboard.press("Control+x");
      await giro(page);
    },
  },
  {
    nome: "Maiusc+Tab su un «+», Ctrl+V",
    // Negli appunti un blocco copiato col fuoco su di lui.
    prima: async (page) => {
      await unaScrittura(page).focus();
      await page.keyboard.press("Control+c");
    },
    apri: aperti[0]!.apri,
    fai: async (page) => {
      await maiuscTab(page);
      await page.keyboard.press("Control+v");
    },
  },
  {
    nome: "Maiusc+Tab su un «+», Invio, un blocco nuovo scelto con la tastiera, Esc",
    apri: aperti[0]!.apri,
    fai: async (page) => {
      await maiuscTab(page);
      await page.keyboard.press("Enter");
      await page.getByRole("menuitem", { name: it.bloccoAssegnazione, exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.locator("form")).toBeVisible();
      await page.keyboard.press("Escape");
    },
  },
  {
    nome: "Tab fino ad «Annulla» della barra, Invio, poi Ctrl+Y",
    prima: unPassoPrima,
    apri: aperti[0]!.apri,
    fai: async (page) => {
      await tabFinoAdAnnulla(page);
      await page.keyboard.press("Enter");
      await giro(page);
      await page.keyboard.press("Control+y");
    },
  },
  {
    // In WebKit il clic non dà il fuoco al pulsante: va al corpo, e il Tab seguente non esce dai campi.
    nome: "un clic su «Aggiungi un valore», poi Tab fino ad «Annulla» della barra, Invio, poi Ctrl+Y",
    prima: unPassoPrima,
    apri: aperti[0]!.apri,
    fai: async (page) => {
      await campiDelBlocco(page).getByRole("button", { name: it.aggiungiValore, exact: true }).click();
      await tabFinoAdAnnulla(page);
      await page.keyboard.press("Enter");
      await giro(page);
      await page.keyboard.press("Control+y");
    },
  },
  {
    nome: "scheda di un dato, Maiusc+Tab sulla riga, Canc, poi la cancellazione rifiutata o annullata",
    apri: aperti[2]!.apri,
    fai: async (page) => {
      await nomeNellaScheda(page).focus();
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Delete");
      await giro(page);
      const conferma = page.getByRole("alertdialog");
      if (await conferma.isVisible()) await page.keyboard.press("Escape");
      else await page.keyboard.press("Control+z");
    },
  },
];

test("con dei campi aperti, un gesto da tastiera fuori dai campi trova il testo già confermato: nulla si perde e Ctrl+Z e Ctrl+Y lo ritrovano", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const persi: string[] = [];
  for (const g of gesti) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    try {
      await apri(page, { lingua: "it" });
      await g.prima?.(page);
      await g.apri(page);
      await g.fai(page);
      await giro(page);
      const mostrato = await progettoMostrato(page);
      if (!mostrato.includes(IL_TESTO)) persi.push(`${g.nome}: il testo scritto non è nel progetto (campi aperti ${await page.locator("form").count()})`);
    } catch (e) {
      persi.push(`${g.nome}: interrotto, ${(e as Error).message.split("\n")[0]}`);
    } finally {
      await page.close();
    }
  }
  console.log(`[${info.project.name}] gesti da tastiera coi campi aperti: ${gesti.length}, testo perso ${persi.length}`);
  expect(persi, "un gesto da tastiera ha cambiato il progetto sotto i campi aperti, o ne ha perso il testo").toEqual([]);
  expect(gesti.length, "i gesti elencati").toBe(7);
});

test("uno spostamento da tastiera finisce quando il blocco preso sparisce: tornato con Ctrl+Y, Invio su un «+» apre l'elenco dei blocchi", async ({ page }) => {
  await apri(page, { lingua: "it" });
  await unPassoPrima(page);
  // Il blocco appena inserito ha il fuoco dopo Esc: Spazio lo prende, Ctrl+Z lo toglie, Ctrl+Y lo rimette.
  await page.keyboard.press(" ");
  await page.keyboard.press("Control+z");
  await giro(page);
  await page.keyboard.press("Control+y");
  await giro(page);
  const prima = await stato(flowchartDi(page));
  await flowchartDi(page).locator("[data-punto]").last().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu"), "Invio su un «+» non apre l'elenco dei blocchi (lo spostamento è ancora in corso)").toBeVisible({ timeout: 3_000 });
  expect(await stato(flowchartDi(page)), "il blocco si è spostato").toBe(prima);
});

// ------------------------------------------------------------- eliminare il dato che si sta scrivendo

/** Il valore iniziale scritto in un dato usato da una regola: un intero valido, che nessuna riga mostra già. */
const IL_VALORE = "707";
/** Il nome scritto al posto di quello di un dato usato: non è una parola sola, quindi le regole tengono il nome di
 * prima, e il dato resta usato. */
const NON_UNA_PAROLA = "conta ti";
const domandaDiEliminare = (page: Page) => page.getByRole("alertdialog").filter({ hasText: it.eliminaConferma });
/** La riga a celle del dato in quella posizione (contata da 1). */
const rigaACelle = (page: Page, n: number) => page.locator(`tr[data-dato="dati-${n - 1}"]`);
const partiDellaRiga = (page: Page, n: number) => rigaACelle(page, n).locator(":scope > th, :scope > td");
/** Un clic sull'angolo in alto a sinistra di una parte della riga a celle: fuori dai suoi campi. */
const clicSullAngolo = (page: Page, n: number, parte = 0) => partiDellaRiga(page, n).nth(parte).click({ position: { x: 1, y: 1 } });

/** Del testo scritto nei campi di un dato: quale, in quale riga (contata da 1), e se una regola usa il dato. */
type Scritto = { testo: string; riga: number; usato: boolean };
type DatoDaScrivere = { nome: string; scrivi: (page: Page) => Promise<Scritto> };
type GestoCheElimina = { nome: string; fai: (page: Page, s: Scritto) => Promise<void> };
/** «contati» (la quarta riga) è usato dalle regole del riferimento; il dato aggiunto in fondo (la nona) no. */
const nellaScheda: readonly DatoDaScrivere[] = [
  {
    nome: "un dato usato, valore iniziale scritto",
    scrivi: async (page) => {
      await page.locator('tr[data-dato="dati-3"]').focus();
      await page.keyboard.press("Enter");
      await page.locator("form").getByRole("textbox", { name: it.datiIniziale, exact: true }).fill(IL_VALORE);
      return { testo: IL_VALORE, riga: 4, usato: true };
    },
  },
  {
    nome: "un dato usato, al posto del nome uno che non è una parola",
    scrivi: async (page) => {
      await page.locator('tr[data-dato="dati-3"]').focus();
      await page.keyboard.press("Enter");
      await nomeNellaScheda(page).fill(NON_UNA_PAROLA);
      return { testo: NON_UNA_PAROLA, riga: 4, usato: true };
    },
  },
  {
    nome: "un dato nuovo, non usato, nome scritto",
    scrivi: async (page) => {
      await page.locator("[data-aggiungi]").click();
      await scriviInFondo(nomeNellaScheda(page));
      return { testo: IL_TESTO, riga: 9, usato: false };
    },
  },
];
const nelleCelle: readonly DatoDaScrivere[] = [
  {
    nome: "un dato usato, valore iniziale scritto",
    scrivi: async (page) => {
      await page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiIniziale, n: "4" }), exact: true }).fill(IL_VALORE);
      return { testo: IL_VALORE, riga: 4, usato: true };
    },
  },
  {
    nome: "un dato usato, al posto del nome uno che non è una parola",
    scrivi: async (page) => {
      await page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "4" }), exact: true }).fill(NON_UNA_PAROLA);
      return { testo: NON_UNA_PAROLA, riga: 4, usato: true };
    },
  },
  {
    nome: "un dato nuovo, non usato, nome scritto",
    scrivi: async (page) => {
      await page.locator("[data-aggiungi]").click();
      await scriviInFondo(page.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiNome, n: "9" }), exact: true }));
      return { testo: IL_TESTO, riga: 9, usato: false };
    },
  },
];
const eliminazioni: readonly { disposizione: string; salvate: Record<string, string>; dati: readonly DatoDaScrivere[]; gesti: readonly GestoCheElimina[] }[] = [
  {
    disposizione: "scheda",
    salvate: { lingua: "it" },
    dati: nellaScheda,
    gesti: [
      { nome: "«Elimina il dato»", fai: (p) => p.locator("form").getByRole("button", { name: it.eliminaDato, exact: true }).click() },
      {
        nome: "Maiusc+Tab sulla riga, Canc",
        fai: async (p) => {
          await nomeNellaScheda(p).focus();
          await p.keyboard.press("Shift+Tab");
          await p.keyboard.press("Delete");
        },
      },
    ],
  },
  {
    disposizione: "celle",
    salvate: { lingua: "it", modoDeiDati: "celle" },
    dati: nelleCelle,
    gesti: [
      { nome: "il «×» della riga", fai: (p, s) => rigaACelle(p, s.riga).getByRole("button").last().click() },
      {
        nome: "un clic sull'angolo della riga, Canc",
        fai: async (p, s) => {
          await clicSullAngolo(p, s.riga);
          await p.keyboard.press("Delete");
        },
      },
    ],
  },
];

const righeDeiDati = (page: Page) => page.locator('tr[data-dato^="dati-"]').count();
/** Dopo il gesto: la domanda (se c'è) rinunciata con Esc, oppure, se il dato è stato eliminato, Ctrl+Z col fuoco su
 * un blocco. Restituisce se la domanda è comparsa e quante righe dei dati c'erano prima di Ctrl+Z. */
async function dopoLEliminazione(page: Page, usato: boolean): Promise<{ domanda: boolean; righe: number }> {
  const domanda = usato
    ? await domandaDiEliminare(page).waitFor({ timeout: 3_000 }).then(() => true, () => false)
    : await giro(page).then(() => domandaDiEliminare(page).isVisible());
  if (domanda) {
    // Esc quando la domanda ha preso il fuoco: prima arriverebbe alla riga.
    await expect.poll(() => domandaDiEliminare(page).evaluate((el) => el.contains(document.activeElement)), { message: "la domanda non prende il fuoco" }).toBe(true);
    await page.keyboard.press("Escape");
    await expect(domandaDiEliminare(page)).toBeHidden();
  }
  const righe = await righeDeiDati(page);
  if (!domanda) {
    await unaScrittura(page).focus();
    await page.keyboard.press("Control+z");
  }
  await giro(page);
  return { domanda, righe };
}

test("eliminare il dato che si sta scrivendo prima conferma il testo: rinunciando alla domanda resta nel progetto, e Ctrl+Z riporta il dato eliminato col testo", async ({ browser }, info) => {
  test.setTimeout(180_000);
  const sbagliati: string[] = [];
  let casi = 0;
  for (const e of eliminazioni)
    for (const d of e.dati)
      for (const g of e.gesti) {
        const dove = `${e.disposizione} · ${d.nome} · ${g.nome}`;
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        try {
          await apri(page, e.salvate);
          const s = await d.scrivi(page);
          const prima = await righeDeiDati(page);
          await g.fai(page, s);
          const { domanda, righe } = await dopoLEliminazione(page, s.usato);
          casi++;
          const dentro = (await progettoMostrato(page)).includes(s.testo);
          // Un dato usato resta (si è rinunciato); uno non usato è eliminato, poi Ctrl+Z lo riporta.
          const righeAttese = s.usato ? prima : prima - 1;
          if (domanda !== s.usato || righe !== righeAttese || !dentro)
            sbagliati.push(
              `${dove}: domanda ${domanda} (attesa ${s.usato}), righe ${prima} → ${righe} (attese ${righeAttese}), il testo scritto nel progetto ${s.usato ? "dopo la rinuncia" : "dopo Ctrl+Z"} ${dentro}`,
            );
        } catch (errore) {
          sbagliati.push(`${dove}: interrotto, ${(errore as Error).message.split("\n")[0]}`);
        } finally {
          await page.close();
        }
      }

  // Il dato appena aggiunto nella scheda e lasciato vuoto, poi «Elimina il dato»: sparisce senza domanda e senza
  // lasciare passi, come confermandolo vuoto.
  const vuoto = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(vuoto, { lingua: "it" });
  const righe = () => righeDeiDati(vuoto);
  const prima = await righe();
  await vuoto.locator("[data-aggiungi]").click();
  await vuoto.locator("form").getByRole("button", { name: it.eliminaDato, exact: true }).click();
  await giro(vuoto);
  const esitoVuoto = { righe: await righe(), domanda: await domandaDiEliminare(vuoto).isVisible(), annullaSpento: (await nella(vuoto, it.annulla).getAttribute("aria-disabled")) === "true" };
  await vuoto.close();

  // Controllo positivo: lo stesso rilevatore dice «perso» quando il testo si rinuncia con Esc, e «nel progetto»
  // quando lo conferma Invio.
  const positivo = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(positivo, { lingua: "it", modoDeiDati: "celle" });
  const valore = positivo.getByRole("textbox", { name: riempi(it.campoDellaRiga, { campo: it.datiIniziale, n: "4" }), exact: true });
  await valore.fill(IL_VALORE);
  await valore.press("Escape");
  await giro(positivo);
  const persoConEsc = !(await progettoMostrato(positivo)).includes(IL_VALORE);
  await valore.fill(IL_VALORE);
  await valore.press("Enter");
  await giro(positivo);
  const dentroConInvio = (await progettoMostrato(positivo)).includes(IL_VALORE);
  await positivo.close();

  console.log(
    `[${info.project.name}] eliminare il dato in scrittura: casi ${casi}, sbagliati ${sbagliati.length}; dato aggiunto vuoto ${JSON.stringify(esitoVuoto)} (righe prima ${prima}); controllo positivo: perso con Esc ${persoConEsc}, nel progetto con Invio ${dentroConInvio}`,
  );
  expect(sbagliati, "eliminare il dato in scrittura ha perso il testo scritto, o ha chiesto quando non doveva").toEqual([]);
  expect(casi).toBe(12);
  expect(esitoVuoto, "il dato aggiunto e lasciato vuoto").toEqual({ righe: prima, domanda: false, annullaSpento: true });
  expect([persoConEsc, dentroConInvio], "controllo positivo spento: il rilevatore non distingue il testo rinunciato da quello confermato").toEqual([true, true]);
});

// ------------------------------------------------------------------------ il clic sulla riga a celle

test("nei dati a celle un clic su una parte della riga che non è un campo conferma il testo scritto, e la riga resta scelta", async ({ browser }, info) => {
  test.setTimeout(120_000);
  const celle = { lingua: "it", modoDeiDati: "celle" };
  const conta = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(conta, celle);
  const parti = await partiDellaRiga(conta, 1).count();
  await conta.close();
  const sbagliati: string[] = [];
  for (let parte = 0; parte < parti; parte++) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await apri(page, celle);
    await scriviInFondo(nomeNelleCelle(page));
    const prima = await modificato(page);
    await clicSullAngolo(page, 1, parte);
    await giro(page);
    const fuoco = await page.evaluate(() => document.activeElement?.getAttribute("data-dato") ?? document.activeElement?.tagName ?? "nessuno");
    const confermato = await modificato(page);
    const nome = await nomeNelleCelle(page).inputValue();
    if (prima || !confermato || fuoco !== "dati-0" || nome !== `n${IL_TESTO}`)
      sbagliati.push(`parte ${parte + 1}: modificato prima ${prima}, testo nel progetto ${confermato}, fuoco su ${fuoco}, nome «${nome}»`);
    await page.close();
  }
  // Controllo positivo: Invio conferma, e il rilevatore lo vede.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(page, celle);
  await scriviInFondo(nomeNelleCelle(page));
  const primaDiInvio = await modificato(page);
  await page.keyboard.press("Enter");
  await giro(page);
  const acceso = !primaDiInvio && (await modificato(page));
  await page.close();
  console.log(`[${info.project.name}] clic sulla riga a celle: parti ${parti}, sbagliati ${sbagliati.length}; controllo positivo (Invio conferma, il rilevatore lo vede): ${acceso}`);
  expect(sbagliati, "un clic sulla riga fuori dai campi non ha confermato il testo scritto").toEqual([]);
  expect(parti, "premessa: le parti della riga a celle").toBe(6);
  expect(acceso, "controllo positivo spento: Invio ha confermato e il rilevatore non lo vede").toBe(true);
});

// ---------------------------------------------------------------------------- il testo aperto e i comandi

/** I comandi dei file con del testo scritto nei campi aperti e il fuoco dentro i campi, ma non in un campo di testo
 * (lì i tasti dei file restano del campo): la casella «Va a capo» di un blocco, «Elimina il dato» della scheda, il
 * «×» della riga a celle. Prima confermano i campi. «Esempi» solo coi campi di un blocco (il clic sulla barra
 * conferma da sé, in ogni disposizione). */
const disposizioniDelTesto: readonly { aperti: Aperti; fuoco: (page: Page) => Locator; esempi: boolean }[] = [
  { aperti: aperti[0]!, fuoco: (p) => casella(p), esempi: true },
  { aperti: aperti[2]!, fuoco: (p) => p.locator("form").getByRole("button", { name: it.eliminaDato, exact: true }), esempi: false },
  { aperti: aperti[3]!, fuoco: (p) => p.locator('tr[data-dato="dati-0"]').getByRole("button"), esempi: false },
];

test("con del testo scritto nei campi e il fuoco fuori dal campo di testo, Nuovo, Apri, Esempi e la chiusura chiedono, Salva salva il testo, e il guscio sa delle modifiche", async ({ browser }, info) => {
  test.setTimeout(240_000);
  type Comando = { nome: string; fai: (page: Page) => Promise<void>; atteso: (page: Page) => Promise<boolean> };
  // La domanda delle modifiche, riconosciuta dal titolo col nome del progetto.
  const domanda = (page: Page) => page.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: RIFERIMENTO }), exact: true });
  const chiede = async (page: Page) => domanda(page).waitFor({ timeout: 3_000 }).then(() => true, () => false);
  const salvato = (percorso: string) => async (page: Page) =>
    expect.poll(async () => (await finzione(page)).file[percorso] ?? "", { timeout: 3_000 }).toContain(IL_TESTO).then(() => true, () => false);
  const comandi: readonly Comando[] = [
    { nome: "Ctrl+N", fai: (p) => p.keyboard.press("Control+n"), atteso: chiede },
    { nome: "Ctrl+O", fai: (p) => p.keyboard.press("Control+o"), atteso: chiede },
    {
      nome: "Ctrl+S",
      fai: async (p) => {
        await imposta(p, { daSalvare: "C:\\miei\\uno.algo" });
        await p.keyboard.press("Control+s");
      },
      atteso: salvato("C:\\miei\\uno.algo"),
    },
    {
      nome: "Ctrl+Maiusc+S",
      fai: async (p) => {
        await imposta(p, { daSalvare: "C:\\miei\\due.algo" });
        await p.keyboard.press("Control+Shift+s");
      },
      atteso: salvato("C:\\miei\\due.algo"),
    },
    {
      nome: "la chiusura della finestra",
      fai: async (p) => {
        await p.evaluate((nome) => window.dispatchEvent(new Event(nome)), eventoDiChiusura);
      },
      atteso: async (p) => (await chiede(p)) && !(await finzione(p)).chiusa,
    },
    {
      nome: "Esempi, poi «Apri» su un esempio",
      fai: async (p) => {
        await (await voceDellAiuto(p, it.esempi)).click();
        await p.getByRole("dialog", { name: it.esempiTitolo, exact: true }).getByRole("listitem").nth(1).getByRole("button", { name: it.esempioApri, exact: true }).click();
      },
      atteso: chiede,
    },
  ];
  const sbagliati: string[] = [];
  let casi = 0;
  for (const d of disposizioniDelTesto)
    for (const c of comandi.filter((x) => d.esempi || !x.nome.startsWith("Esempi"))) {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
      await apri(page, d.aperti.salvate);
      await d.aperti.apri(page);
      await d.fuoco(page).focus();
      await giro(page);
      const alGuscio = (await finzione(page)).modificato.at(-1);
      await c.fai(page);
      const fatto = await c.atteso(page);
      casi++;
      if (!fatto || alGuscio !== true) sbagliati.push(`${d.aperti.nome} · ${c.nome}: ha chiesto o salvato il testo scritto ${fatto}, al guscio è arrivato «modificato» = ${alGuscio}`);
      await page.close();
    }
  // Coi campi aperti ma nulla scritto, la chiusura conferma i campi e chiude senza chiedere.
  const intatti = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(intatti, { lingua: "it" });
  await apriUnaScrittura(intatti);
  await intatti.evaluate((nome) => window.dispatchEvent(new Event(nome)), eventoDiChiusura);
  await expect.poll(async () => (await finzione(intatti)).chiusa, { message: "coi campi aperti e nulla scritto la finestra non si chiude", timeout: 3_000 }).toBe(true);
  await intatti.close();
  // Controllo positivo: col progetto modificato e nessun campo aperto, Ctrl+N chiede, e il rilevatore lo vede.
  const positivo = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await apri(positivo, { lingua: "it" });
  await cambiaAutore(positivo, "Prova");
  await positivo.keyboard.press("Control+n");
  const acceso = await chiede(positivo);
  await positivo.close();
  console.log(`[${info.project.name}] testo aperto e comandi: casi ${casi}, sbagliati ${sbagliati.length}; controllo positivo (Ctrl+N col progetto modificato chiede): ${acceso}`);
  expect(sbagliati, "un comando ha perso il testo scritto nei campi aperti").toEqual([]);
  expect(casi, "sei comandi coi campi di un blocco, cinque con la scheda e con le celle").toBe(16);
  expect(acceso, "controllo positivo spento: la domanda delle modifiche non si vede").toBe(true);
});

test("con del testo scritto nei campi aperti una ricarica chiede conferma", async ({ browser }, info) => {
  test.setTimeout(90_000);
  const sbagliati: string[] = [];
  let casi = 0;
  for (const d of disposizioniDelTesto) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await apri(page, d.aperti.salvate);
    await d.aperti.apri(page);
    const esito = await ricaricaChiesta(page);
    casi++;
    if (esito.ricaricata || esito.domande.join() !== "beforeunload") sbagliati.push(`${d.aperti.nome}: domande ${JSON.stringify(esito.domande)}, ricaricata ${esito.ricaricata}`);
    await page.close();
  }
  console.log(`[${info.project.name}] ricarica coi campi aperti: casi ${casi}, sbagliati ${sbagliati.length}`);
  expect(sbagliati, "coi campi aperti, la ricarica non chiede conferma").toEqual([]);
  expect(casi, "i campi di un blocco, la scheda, le celle").toBe(3);
});

// ------------------------------------------------------------------------- la chiusura che non avviene

/** La X della finestra, come la tratta il guscio (simulato): con «modificato» chiede, senza chiude. */
const laX = (page: Page) => page.evaluate(() => window.__laX__());

test("una chiusura che non avviene lascia accesa la rete del motore e la domanda alla X dopo: dopo «Annulla» della domanda, e dopo «Non salvare» se il guscio non chiude", async ({ browser }) => {
  // Tre pagine, tre ricariche con le loro attese: il limite predefinito (30 s) è scaduto in WebKit sotto il carico
  // del collaudo intero; ripetuta da sola è verde.
  test.setTimeout(90_000);
  const domanda = (page: Page) => page.getByRole("alertdialog", { name: riempi(it.modificheTitolo, { nome: RIFERIMENTO }), exact: true });
  const esiti: Record<string, unknown> = {};
  for (const [caso, rifiutata, risposta] of [
    ["«Annulla»", false, it.annullaEsc],
    ["«Non salvare», il guscio non chiude", true, it.modificheNonSalvare],
    ["«Non salvare», il guscio chiude (controllo positivo: lì la rete tace)", false, it.modificheNonSalvare],
  ] as const) {
    const page = await browser.newPage();
    await apri(page, { lingua: "it" });
    await imposta(page, { chiusuraRifiutata: rifiutata });
    await cambiaAutore(page, "Prova");
    await giro(page);
    await laX(page);
    await domanda(page).getByRole("button", { name: risposta, exact: true }).click();
    await expect(domanda(page)).toBeHidden();
    await giro(page);
    const chiusa = (await finzione(page)).chiusa;
    // La X dopo una chiusura che non è avvenuta chiede ancora (e la domanda si lascia con «Annulla»).
    let secondaX: boolean | null = null;
    if (!chiusa) {
      await laX(page);
      secondaX = await domanda(page).waitFor({ timeout: 3_000 }).then(() => true, () => false);
      if (secondaX) await domanda(page).getByRole("button", { name: it.annullaEsc, exact: true }).click();
      await giro(page);
    }
    esiti[caso] = { chiusa: (await finzione(page)).chiusa, secondaX, ...(await ricaricaChiesta(page)) };
    await page.close();
  }
  expect(esiti).toEqual({
    "«Annulla»": { chiusa: false, secondaX: true, domande: ["beforeunload"], ricaricata: false },
    "«Non salvare», il guscio non chiude": { chiusa: false, secondaX: true, domande: ["beforeunload"], ricaricata: false },
    "«Non salvare», il guscio chiude (controllo positivo: lì la rete tace)": { chiusa: true, secondaX: null, domande: [], ricaricata: true },
  });
});

// ------------------------------------------------------------------- il menu nei quattro modi dei campi

test("il tasto destro su un campo di testo lascia il menu del sistema nei quattro modi dei campi; nei dati a celle, sul resto della riga, apre il menu del dato", async ({ browser }, info) => {
  type Punto = { dove: string; el: (p: Page) => Locator; sistema: boolean };
  const nelBloccoAperto = (modo: string, salvate: Record<string, string>) => ({
    modo,
    salvate,
    apri: apriUnaScrittura,
    punti: [{ dove: "il primo campo di testo", el: testoDelBlocco, sistema: true }] as Punto[],
  });
  const modi = [
    nelBloccoAperto("campi di un blocco nel riquadro", { lingua: "it" }),
    nelBloccoAperto("campi di un blocco nel pannello", { lingua: "it", modoDeiBlocchi: "pannello" }),
    {
      modo: "scheda di un dato",
      salvate: { lingua: "it" },
      apri: async (page: Page) => {
        await page.locator('tr[data-dato="dati-0"]').focus();
        await page.keyboard.press("Enter");
        await expect(page.locator("form")).toBeVisible();
      },
      punti: [{ dove: "il campo del nome", el: nomeNellaScheda, sistema: true }] as Punto[],
    },
    {
      modo: "celle di un dato",
      salvate: { lingua: "it", modoDeiDati: "celle" },
      apri: async () => {},
      punti: [
        { dove: "il campo del nome", el: nomeNelleCelle, sistema: true },
        { dove: "il campo del valore iniziale", el: (p: Page) => p.getByRole("textbox", { name: cella(it.datiIniziale), exact: true }), sistema: true },
        { dove: "la scelta del tipo", el: (p: Page) => p.getByRole("combobox", { name: cella(it.datiTipo), exact: true }), sistema: false },
      ] as Punto[],
    },
  ];
  const sbagliati: string[] = [];
  let punti = 0;
  for (const m of modi) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await registraEventi(page);
    await apri(page, m.salvate);
    await m.apri(page);
    for (const p of m.punti) {
      punti++;
      await p.el(page).click({ button: "right" });
      await page.waitForTimeout(100);
      const suoi = (await eventi(page)).filter((e) => e.tipo === "contextmenu");
      const menuDelDato = await page.getByRole("menu").isVisible();
      if (suoi.length !== 1 || suoi[0]!.fermato === p.sistema || menuDelDato === p.sistema)
        sbagliati.push(`${m.modo} · ${p.dove}: atteso ${p.sistema ? "il menu del sistema" : "il menu del dato"}, eventi ${JSON.stringify(suoi)}, menu del dato ${menuDelDato}`);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("menu")).toHaveCount(0);
    }
    await page.close();
  }
  console.log(`[${info.project.name}] menu nei quattro modi dei campi: punti ${punti}, sbagliati ${sbagliati.length}`);
  expect(sbagliati).toEqual([]);
  expect(punti).toBe(6);
});
