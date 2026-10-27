// La barra dei comandi nei motori veri (Chromium e WebKit, server di sviluppo e anteprima del build).
//
// - Disposizione: i cinque gruppi in ordine di lavoro (Progetto, Modifica, Esecuzione, Viste, Applicazione);
//   Impostazioni e il menu «Aiuto» nella prima riga, al margine destro, a 1920 × 1080, 1366 × 768 e 1280 × 800, nelle due
//   lingue e nelle tre presentazioni. Controllo positivo: col gruppo di destra rimesso nel flusso degli altri,
//   a 1280 con icona e testo, scende.
// - Altezza: a 1920 × 1080 con la presentazione predefinita la barra sta in una riga. Controllo positivo: a 1280
//   × 800 con icona e testo lo stesso rilevatore conta più righe.
// - Il menu «Progetto»: si apre col clic, con Invio, Spazio e la freccia; Esc lo chiude e il fuoco torna al suo
//   pulsante; una voce chiude il menu e fa il suo comando, col clic e con Invio, anche quando non apre una finestra
//   («Salva»: una finestra della pagina chiuderebbe il menu da sé, e la mutazione «la voce non chiude» uscirebbe
//   verde); una voce non disponibile si raggiunge e non fa nulla.
// - Il menu «Aiuto»: l'ultimo della barra, alla destra di «Impostazioni» (il pulsante «Esempi» non c'è più), con
//   «Esempi…» e «Informazioni su AlgoDesign»; le informazioni dicono la versione e la data lette da `package.json`
//   (dal disco, non dal programma), ed Esc rimette il fuoco sul pulsante del menu.
// - La riga di stato: una sola percentuale in tutta la finestra (controllo positivo: una seconda, messa nella
//   barra, si conta); un clic sulla percentuale torna al 100%; meno, più, «Adatta», che poi cambia nome e torna
//   alla scala di prima; lo stato dell'esecuzione.
// - Le preferenze: la presentazione e la barretta lette all'avvio (i due valori di prima così come sono
//   scritti), scelte nelle Impostazioni e scritte; un errore di scrittura arriva all'utente.
// - La barretta flottante: spenta non c'è; accesa compare all'avvio dell'esecuzione coi comandi del gruppo e lo
//   stato, i comandi funzionano da lì, resta a esecuzione finita (la colonna è aperta) e sparisce con «Ferma»;
//   nella barra restano Esegui, Passo, l'animata con la sua velocità, Interruzione e «Togli i punti», nascosti
//   mentre c'è la barretta. Dalla tastiera il fuoco passa dal comando della barra allo stesso nella barretta, e
//   torna a «Esegui» quando sparisce; col fuoco altrove non si muove (il controllo positivo). Trascinata oltre un
//   bordo, o con la finestra che si stringe, resta tutta dentro la finestra (controllo positivo: si sposta davvero).
//   Sta sotto le finestre: dove copre le Impostazioni, sopra ci sono le Impostazioni (chi è disegnato sopra, chiesto
//   alla pagina).
//
// CHE COSA NON GUARDA:
// - l'appaiamento dei comandi col catalogo (`ui/comandi.test.tsx`), né i tasti (lì e nelle prove dei comandi);
// - «Adatta» col carattere di almeno 6 px (`finestra.e2e.ts`, che misura la barra nella stessa finestra);
// - la posizione della barretta dopo un riavvio (non si ricorda) e la barretta mai spostata con la finestra che si
//   stringe (si ricentra sul flowchart: lo dice la lettura);
// - il primo istante del menu: le prove aspettano il fuoco dentro prima dei tasti (Ark ce lo mette un fotogramma
//   dopo l'apertura); un tasto premuto prima va al pulsante;
// - i fattori di scala dello schermo diversi da quelli dei due profili, e le finestre sotto 1280 × 800;
// - le preferenze dopo un riavvio dell'app vera (la prova portabile) e il file col BOM (la prova del guscio, in
//   Rust: la finzione del guscio passa oggetti, non byte).
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { apri as apriProgetto } from "../core/progetto/formato";
import type { Funzione } from "../core/progetto/modello";
import { en } from "../i18n/en";
import { it } from "../i18n/it";
import { riempi } from "../i18n/lingue";
import { fileDa, scelteIniziali } from "../ui/preferenze";
import { dataMostrata } from "../ui/prodotto";
import { aggiungiStile, apri, apriVuota, costruisciFinzione, voceDellAiuto } from "./pagina";

test.beforeAll(costruisciFinzione);
test.describe.configure({ mode: "parallel" });

const FINESTRE = [
  { larghezza: 1920, altezza: 1080 },
  { larghezza: 1366, altezza: 768 },
  { larghezza: 1280, altezza: 800 },
] as const;
const PRESENTAZIONI = ["icone-e-testo", "icone", "testo-sotto"] as const;
const GRUPPI = ["progetto", "modifica", "esecuzione", "viste", "applicazione"];
type Righe = Record<"it" | "en", Record<(typeof PRESENTAZIONI)[number], readonly number[]>>;
/** Le righe della barra per lingua, presentazione e finestra (1920, 1366, 1280), misurate in Chromium e in
 * WebKit su Windows, uguali nei due motori: la barra che cambia di una riga (un pulsante nuovo, un testo più lungo) è un
 * rosso. Le righe dipendono dal carattere del sistema (`system-ui`): su Linux valgono quelle di `RIGHE_ATTESE_SU_LINUX`. */
const RIGHE_ATTESE: Righe = {
  it: { "icone-e-testo": [2, 2, 3], icone: [1, 1, 1], "testo-sotto": [1, 1, 1] },
  // Col pulsante «Function» (accanto a «Save») e le voci più corte «Clear points» e «Code» (erano «Remove breakpoints» e
  // «Generate»), la barra inglese con icona e testo sta in una riga a 1920 e in due a 1366 e a 1280 (misurato sulle
  // diciotto combinazioni).
  en: { "icone-e-testo": [1, 2, 2], icone: [1, 1, 1], "testo-sotto": [1, 1, 1] },
};
/** Su Linux, col carattere DejaVu Sans (il `system-ui` della macchina della CI e di molte distribuzioni, più largo di
 * quello di Windows), misurate nel WebKit per Linux sulle diciotto combinazioni: quattro cambiano di una riga, e il gruppo
 * di destra resta in prima riga. Si scelgono per sistema, quindi anche per Chromium su Linux, che non è stato misurato; un
 * desktop con un altro carattere può dare altre righe: la prova non lo guarda. */
const RIGHE_ATTESE_SU_LINUX: Righe = {
  it: { "icone-e-testo": [2, 3, 3], icone: [1, 1, 1], "testo-sotto": [1, 1, 2] },
  en: { "icone-e-testo": [2, 2, 3], icone: [1, 1, 1], "testo-sotto": [1, 1, 1] },
};

/** Un programma senza letture: l'esecuzione arriva alla fine da sola. */
const senzaLetture: Funzione = (() => {
  const esito = apriProgetto(readFileSync(fileURLToPath(new URL("../casi/tappa-1/assegnazione-intero.algo", import.meta.url)), "utf8"));
  if (!esito.ok) throw new Error("l'esempio non si apre");
  return esito.progetto.functions[0]!;
})();

const fotogrammi = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(undefined)))));

interface Disposizione {
  gruppi: string[];
  righe: number;
  altezza: number;
  /** I pulsanti di Impostazioni e del menu «Aiuto» stanno nella prima riga della barra. */
  inPrimaRiga: boolean;
  /** La distanza fra il bordo destro dell'ultimo pulsante di Applicazione e quello della barra. */
  daDestra: number;
}

/** Ordine dei gruppi, righe occupate dai pulsanti (fasce verticali che non si sovrappongono), e il gruppo di
 * destra. */
function disposizione(page: Page): Promise<Disposizione> {
  return page.evaluate(() => {
    const barra = document.querySelector("header")!;
    const b = barra.getBoundingClientRect();
    const fasce: { alto: number; basso: number }[] = [];
    const rett = [...barra.querySelectorAll("button")].map((x) => x.getBoundingClientRect()).filter((r) => r.height > 0);
    for (const r of [...rett].sort((x, y) => x.top - y.top)) {
      const centro = (r.top + r.bottom) / 2;
      if (!fasce.some((f) => centro >= f.alto && centro <= f.basso)) fasce.push({ alto: r.top, basso: r.bottom });
    }
    const app = [...barra.querySelectorAll('[data-gruppo="applicazione"] button')].map((x) => x.getBoundingClientRect());
    const prima = fasce[0]!;
    return {
      gruppi: [...barra.querySelectorAll<HTMLElement>("[data-gruppo]")].map((g) => g.dataset.gruppo!),
      righe: fasce.length,
      altezza: b.height,
      inPrimaRiga: app.length === 2 && app.every((r) => (r.top + r.bottom) / 2 >= prima.alto && (r.top + r.bottom) / 2 <= prima.basso),
      daDestra: b.right - Math.max(...app.map((r) => r.right)),
    };
  });
}

const descrivi = (d: Disposizione) => `barra ${d.altezza.toFixed(0)} px, ${d.righe} righe, destra in prima riga ${d.inPrimaRiga ? "sì" : "no"} a ${d.daDestra.toFixed(1)} px dal bordo`;

// ------------------------------------------------------------------------------------------- la disposizione

test("i cinque gruppi in ordine; Impostazioni e il menu «Aiuto» nella prima riga a destra, in tre finestre, due lingue e tre presentazioni", async ({ context }, info) => {
  test.setTimeout(120_000);
  let misure = 0;
  for (const [lingua, testi] of [["it", it], ["en", en]] as const)
    for (const barra of PRESENTAZIONI) {
      const page = await context.newPage();
      await page.setViewportSize({ width: 1920, height: 1080 });
      await apri(page, { lingua, barra });
      await expect(page.getByRole("banner").getByRole("button", { name: testi.impostazioni, exact: true })).toBeVisible();
      for (const [k, f] of FINESTRE.entries()) {
        await page.setViewportSize({ width: f.larghezza, height: f.altezza });
        await fotogrammi(page);
        const d = await disposizione(page);
        console.log(`[${info.project.name}] ${f.larghezza} × ${f.altezza} ${lingua} ${barra}: ${descrivi(d)}`);
        expect(d.gruppi, `${f.larghezza} ${lingua} ${barra}`).toEqual(GRUPPI);
        const attese = (await page.evaluate(() => navigator.platform.startsWith("Linux"))) ? RIGHE_ATTESE_SU_LINUX : RIGHE_ATTESE;
        expect(d.righe, `${f.larghezza} ${lingua} ${barra}: ${descrivi(d)}`).toBe(attese[lingua][barra][k]);
        expect(d.inPrimaRiga, `${f.larghezza} ${lingua} ${barra}: ${descrivi(d)}`).toBe(true);
        expect(d.daDestra, `${f.larghezza} ${lingua} ${barra}`).toBeLessThanOrEqual(1);
        misure++;
      }
      await page.close();
    }
  expect(misure).toBe(18);
});

test("a 1920 × 1080 con la presentazione predefinita la barra sta in una riga; con icona e testo a 1280 × 800 in più righe", async ({ page }, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await apri(page, { lingua: "it" });
  await expect(page.locator("header")).toHaveAttribute("data-presentazione", "testo-sotto");
  const una = await disposizione(page);
  console.log(`[${info.project.name}] 1920 × 1080 predefinita: ${descrivi(una)}`);
  expect(una.righe).toBe(1);

  // Controllo positivo: lo stesso rilevatore conta più righe quando ci sono (tre, da quando c'è «Genera»; misurate nei
  // due motori).
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator("header").evaluate((h) => h.setAttribute("data-presentazione", "icone-e-testo"));
  await fotogrammi(page);
  const due = await disposizione(page);
  console.log(`[${info.project.name}] 1280 × 800 icona e testo: ${descrivi(due)}`);
  expect(due.righe).toBe(3);
  expect(due.inPrimaRiga).toBe(true);

  // Controllo positivo della disposizione: il gruppo di destra nel flusso degli altri scende.
  await aggiungiStile(page, "header[data-presentazione] { flex-flow: row wrap !important; display: flex !important } header [data-gruppi] { display: contents !important }");
  await fotogrammi(page);
  const nelFlusso = await disposizione(page);
  console.log(`[${info.project.name}] 1280 × 800 icona e testo, gruppo di destra nel flusso: ${descrivi(nelFlusso)}`);
  expect(nelFlusso.inPrimaRiga).toBe(false);
});

// --------------------------------------------------------------------------------------------- il menu

const pulsanteDelMenu = (page: Page) => page.getByRole("banner").getByRole("button", { name: it.menuProgetto, exact: true });
const menu = (page: Page) => page.getByRole("menu", { name: it.menuProgetto, exact: true });
const evidenziata = (page: Page) => menu(page).locator("[data-highlighted]");
/** Il fuoco entra nel menu un fotogramma dopo l'apertura (Ark): un tasto premuto prima va al pulsante, e un Esc
 * non chiude o lascia il fuoco al corpo della pagina (misurato in WebKit, 3 volte su 6). Come per le finestre,
 * prima dei tasti si aspetta il fuoco dentro. */
const fuocoNelMenu = (page: Page) => page.waitForFunction(() => document.activeElement?.closest('[role="menu"]') != null, undefined, { polling: "raf" });

test("il menu «Progetto» si apre col clic e dalla tastiera, Esc lo chiude e il fuoco torna al suo pulsante; una voce fa il suo comando e chiude il menu", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const pulsante = pulsanteDelMenu(page);
  await pulsante.click();
  await expect(menu(page)).toBeVisible();
  await fuocoNelMenu(page);
  // Le voci, in ordine, coi tasti scritti accanto e detti agli ausili.
  const voci = await menu(page)
    .getByRole("menuitem")
    .evaluateAll((v) => v.map((x) => `${x.querySelector("[data-testo]")?.textContent} ${x.getAttribute("aria-keyshortcuts") ?? "-"} ${x.querySelector("[data-tasto]")?.textContent ?? "-"}`));
  expect(voci).toEqual(["Nuovo Control+N Ctrl+N", "Apri Control+O Ctrl+O", "Salva Control+S Ctrl+S", "Salva con nome Control+Shift+S Ctrl+Maiusc+S", `${it.salvaComeLibreria} - -`, "Proprietà - -", `${it.nuovaProceduraOFunzione} - -`, `${it.gestisciFunzioni} - -`, `${it.importaFunzioni} - -`, `${it.esportaFlowchart} - -`, `${it.esportaTabella} - -`]);
  // Senza un'esecuzione non c'è una tabella da esportare; il flowchart sì.
  await expect(menu(page).getByRole("menuitem", { name: it.esportaTabella, exact: true })).toHaveAttribute("aria-disabled", "true");
  await expect(menu(page).getByRole("menuitem", { name: it.esportaFlowchart, exact: true })).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await expect(menu(page)).toHaveCount(0);
  await expect(pulsante).toBeFocused();

  // Dalla tastiera: Invio apre sulla prima voce, la freccia scende; Spazio e la freccia in giù aprono.
  await page.keyboard.press("Enter");
  await fuocoNelMenu(page);
  await expect(evidenziata(page)).toHaveAttribute("data-comando", "nuovo");
  await page.keyboard.press("ArrowDown");
  await expect(evidenziata(page)).toHaveAttribute("data-comando", "apri");
  await page.keyboard.press("Escape");
  await expect(menu(page)).toHaveCount(0);
  await expect(pulsante).toBeFocused();
  for (const tasto of ["Space", "ArrowDown"]) {
    await page.keyboard.press(tasto);
    await expect(menu(page), tasto).toBeVisible();
    await fuocoNelMenu(page);
    await page.keyboard.press("Escape");
    await expect(menu(page)).toHaveCount(0);
  }

  // Una voce che non apre nulla nella pagina («Salva» senza file: la finestra del sistema, qui finta, e l'utente
  // rinuncia): il menu si chiude lo stesso, col clic e con Invio. Una finestra della pagina lo chiuderebbe da sé,
  // prendendo il fuoco: con «Proprietà» la voce che non chiude il menu non si vedrebbe.
  for (const gesto of ["clic", "Invio"]) {
    const salvaPrima = await page.evaluate(() => window.__finzione__.finestre.salva);
    if (gesto === "clic") await pulsante.click();
    else {
      await pulsante.focus();
      await page.keyboard.press("Enter");
    }
    await fuocoNelMenu(page);
    if (gesto === "clic") await menu(page).getByRole("menuitem", { name: it.salva, exact: true }).click();
    else {
      // Ogni freccia dopo che la voce di prima è evidenziata (Invio apre sulla prima).
      for (const voce of ["nuovo", "apri"]) {
        await expect(evidenziata(page)).toHaveAttribute("data-comando", voce);
        await page.keyboard.press("ArrowDown");
      }
      await expect(evidenziata(page)).toHaveAttribute("data-comando", "salva");
      await page.keyboard.press("Enter");
    }
    await expect.poll(() => page.evaluate(() => window.__finzione__.finestre.salva), { message: `«Salva» col ${gesto}: il comando non è partito` }).toBe(salvaPrima + 1);
    await expect(menu(page), `«Salva» col ${gesto}: il menu resta aperto`).toHaveCount(0);
    await expect(pulsante).toBeFocused();
  }

  // Una voce che apre una finestra: il menu si chiude e il comando si fa (la finestra Proprietà); chiusa la
  // finestra, il fuoco torna al pulsante del menu.
  await pulsante.click();
  await menu(page).getByRole("menuitem", { name: it.progetto, exact: true }).click();
  await expect(menu(page)).toHaveCount(0);
  const proprieta = page.getByRole("dialog", { name: it.progettoTitolo, exact: true });
  await expect(proprieta).toBeVisible();
  await expect.poll(() => proprieta.evaluate((d) => d.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(proprieta).toBeHidden();
  await expect(pulsante).toBeFocused();
  // E dalla tastiera: Invio sulla prima voce, «Nuovo».
  await page.keyboard.press("Enter");
  await fuocoNelMenu(page);
  await expect(evidenziata(page)).toHaveAttribute("data-comando", "nuovo");
  await page.keyboard.press("Enter");
  await expect(menu(page)).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: it.progettoNuovoTitolo, exact: true })).toBeVisible();
});

test("una voce non disponibile si raggiunge dalla tastiera e non fa nulla, né col tasto né col clic", async ({ page }) => {
  await apri(page, { lingua: "it" });
  // Durante l'esecuzione le proprietà non si modificano.
  await page.keyboard.press("F10");
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await pulsanteDelMenu(page).focus();
  await page.keyboard.press("Enter");
  await fuocoNelMenu(page);
  const voce = menu(page).getByRole("menuitem", { name: it.progetto, exact: true });
  await expect(voce).toHaveAttribute("aria-disabled", "true");
  // Controllo positivo: le altre voci sono disponibili.
  await expect(menu(page).getByRole("menuitem", { name: it.salva, exact: true })).not.toHaveAttribute("aria-disabled", "true");
  // In pausa la tabella e il flowchart si esportano: le ultime due voci sono disponibili, quelle prima no.
  await expect(menu(page).getByRole("menuitem", { name: it.esportaTabella, exact: true })).not.toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("End");
  await expect(evidenziata(page)).toHaveAttribute("data-comando", "esportaTabella");
  await page.keyboard.press("ArrowUp");
  await expect(evidenziata(page)).toHaveAttribute("data-comando", "esportaFlowchart");
  await expect(evidenziata(page)).not.toHaveAttribute("aria-disabled", "true");
  // Durante l'esecuzione non si creano, non si gestiscono e non si importano procedure e funzioni: le tre voci prima
  // sono spente anche loro.
  for (const comando of ["importa", "funzioni", "nuovaFunzione", "proprieta"]) {
    await page.keyboard.press("ArrowUp");
    await expect(evidenziata(page)).toHaveAttribute("data-comando", comando);
    await expect(evidenziata(page)).toHaveAttribute("aria-disabled", "true");
  }
  await page.keyboard.press("Enter");
  await fotogrammi(page);
  await expect(menu(page)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await voce.click({ force: true });
  await fotogrammi(page);
  await expect(menu(page)).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+F5");
});

// ----------------------------------------------------------------------------------------- il menu «Aiuto»

/** Versione e data come le dice il file, letto qui dal disco (non dal programma che le mostra). */
const pacchetto = JSON.parse(readFileSync(fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")) as { version: string; dataDiRilascio: string };

test("il menu «Aiuto» è l'ultimo della barra, alla destra di «Impostazioni», con la guida, «Esempi…» e «Informazioni su AlgoDesign»; le informazioni dicono la versione dei file, ed Esc rimette il fuoco sul pulsante del menu", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  const barra = page.getByRole("banner");
  const aiuto = barra.getByRole("button", { name: it.menuAiuto, exact: true });
  await expect(aiuto).toBeVisible();
  // Il posto: dopo «Impostazioni», nella stessa riga, e il più a destra di tutta la barra. «Esempi» non è più un pulsante.
  const posto = await barra.locator("button").evaluateAll((bs) =>
    bs.map((b) => {
      const r = b.getBoundingClientRect();
      return { nome: b.querySelector("[data-testo]")?.textContent ?? "", sinistra: r.left, destra: r.right, centro: (r.top + r.bottom) / 2 };
    }),
  );
  const [penultimo, ultimo] = posto.slice(-2);
  expect([penultimo!.nome, ultimo!.nome]).toEqual([it.impostazioni, it.menuAiuto]);
  expect(ultimo!.sinistra).toBeGreaterThanOrEqual(penultimo!.destra);
  expect(Math.abs(ultimo!.centro - penultimo!.centro)).toBeLessThan(1);
  expect(Math.max(...posto.map((p) => p.destra))).toBe(ultimo!.destra);
  expect(posto.map((p) => p.nome)).not.toContain(it.esempi);
  await expect(barra.locator('[data-comando="esempi"]')).toHaveCount(0);

  // Le voci, in ordine.
  await aiuto.click();
  const menuAiuto = page.getByRole("menu", { name: it.menuAiuto, exact: true });
  await expect(menuAiuto).toBeVisible();
  await fuocoNelMenu(page);
  const voci = await menuAiuto.getByRole("menuitem").evaluateAll((v) => v.map((x) => `${x.getAttribute("data-comando")}: ${x.querySelector("[data-testo]")?.textContent}`));
  expect(voci).toEqual([`guida: ${it.guida}`, `esempi: ${it.esempi}`, `informazioni: ${it.informazioni}`]);

  // Dalla tastiera: Fine sull'ultima voce, Invio apre le informazioni; Esc le chiude e il fuoco torna al pulsante.
  await page.keyboard.press("End");
  await expect(menuAiuto.locator("[data-highlighted]")).toHaveAttribute("data-comando", "informazioni");
  await page.keyboard.press("Enter");
  const informazioni = page.getByRole("dialog", { name: it.informazioniTitolo, exact: true });
  await expect(informazioni).toBeVisible();
  await expect(informazioni.locator("[data-versione]")).toHaveText(riempi(it.informazioniVersione, { versione: pacchetto.version, data: dataMostrata(pacchetto.dataDiRilascio, "it") }));
  await expect(informazioni).toContainText(it.informazioniLicenza);
  await expect.poll(() => informazioni.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(informazioni).toBeHidden();
  await expect(aiuto).toBeFocused();

  // «Esempi…» col clic apre la finestra degli esempi.
  await (await voceDellAiuto(page, it.esempi)).click();
  await expect(page.getByRole("dialog", { name: it.esempiTitolo, exact: true })).toBeVisible();
});

// ---------------------------------------------------------------------------------------- la riga di stato

/** Le percentuali scritte nella finestra: elementi visibili il cui testo proprio (i nodi di testo figli, uniti:
 * React scrive «100» e «%» in due nodi) è solo un numero e «%», con chi li porta. */
const percentuali = (page: Page) =>
  page.evaluate(() => {
    const trovate: string[] = [];
    for (const e of document.body.querySelectorAll("*")) {
      const proprio = [...e.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
      if (/^\d+\s*%$/.test(proprio) && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden")
        trovate.push(`${proprio} in ${e.closest("header") ? "barra" : e.closest("section")?.getAttribute("aria-label") ?? e.tagName}`);
    }
    return trovate;
  });

test("una sola percentuale nella finestra, nella riga di stato: un clic torna al 100%; meno, più, «Adatta»; lo stato dell'esecuzione accanto", async ({ page }) => {
  await apri(page, { lingua: "it" });
  const riga = page.getByRole("region", { name: it.rigaDiStato, exact: true });
  const zoom = riga.getByRole("group", { name: it.zoom, exact: true });
  const livello = zoom.locator('[data-comando="cento"]');
  expect(await percentuali(page)).toEqual([`100% in ${it.rigaDiStato}`]);
  await zoom.locator('[data-comando="riduci"]').click();
  await expect(livello).toHaveText("80%");
  await livello.click();
  await expect(livello).toHaveText("100%");
  await zoom.locator('[data-comando="ingrandisci"]').click();
  await expect(livello).toHaveText("125%");
  await zoom.locator('[data-comando="adatta"]').click();
  await expect(livello).not.toHaveText("125%");
  await expect(livello).not.toHaveText("100%");
  expect(await percentuali(page)).toHaveLength(1);
  // Lo stesso pulsante, col nome cambiato, torna alla scala di prima.
  await expect(zoom.locator('[data-comando="adatta"]')).toHaveText(it.zoomTornaIndietro);
  await zoom.locator('[data-comando="adatta"]').click();
  await expect(livello).toHaveText("125%");
  await expect(zoom.locator('[data-comando="adatta"]')).toHaveText(it.zoomAdatta);

  // Lo stato dell'esecuzione, nella riga di stato.
  const stato = riga.locator("[data-stato-esecuzione]");
  await expect(stato).toHaveText(it.statoPronto);
  await page.keyboard.press("F10");
  await expect(stato).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await page.keyboard.press("Shift+F5");
  await expect(stato).toHaveText(it.statoPronto);

  // Controllo positivo: una seconda percentuale, nella barra, si conta.
  await page.locator("header").evaluate((h) => h.append(Object.assign(document.createElement("button"), { textContent: "100%" })));
  expect(await percentuali(page)).toHaveLength(2);
});

// -------------------------------------------------------------------------------------------- le preferenze

const scritte = (page: Page) => page.evaluate(() => window.__finzione__.scritte as { preferenze: unknown }[]);
/** Larghezza del testo del pulsante Impostazioni, e se sta sotto la sua icona. */
const testoDiImpostazioni = (page: Page) =>
  page
    .getByRole("banner")
    .getByRole("button", { name: it.impostazioni, exact: true })
    .evaluate((b) => {
      const t = b.querySelector("[data-testo]")!.getBoundingClientRect();
      const i = b.querySelector("svg")!.getBoundingClientRect();
      return { larghezza: t.width, sotto: t.top >= i.bottom - 0.5 };
    });

test("la presentazione dei pulsanti e la barretta si leggono all'avvio; i due valori di prima valgono così come sono scritti", async ({ context }) => {
  const casi = [
    { salvata: undefined, attesa: "testo-sotto", testo: true, sotto: true },
    { salvata: "icone-e-testo", attesa: "icone-e-testo", testo: true, sotto: false },
    { salvata: "icone", attesa: "icone", testo: false, sotto: false },
    { salvata: "testo-sotto", attesa: "testo-sotto", testo: true, sotto: true },
  ] as const;
  for (const c of casi) {
    const page = await context.newPage();
    await apri(page, { lingua: "it", ...(c.salvata ? { barra: c.salvata } : {}) });
    await expect(page.locator("header")).toHaveAttribute("data-presentazione", c.attesa);
    const t = await testoDiImpostazioni(page);
    expect(t.larghezza > 1, `${c.attesa}: testo visibile`).toBe(c.testo);
    if (c.testo) expect(t.sotto, `${c.attesa}: testo sotto l'icona`).toBe(c.sotto);
    await page.close();
  }
  // La barretta accesa nel file: al primo passo compare.
  const page = await context.newPage();
  await apri(page, { lingua: "it", esecuzioneFlottante: true });
  await page.keyboard.press("F10");
  await expect(page.getByRole("toolbar", { name: it.barrettaEsecuzione, exact: true })).toBeVisible();
});

test("nelle Impostazioni la presentazione a tre e la barretta si scelgono, valgono subito e si scrivono", async ({ page }) => {
  await apriVuota(page, { lingua: "it" });
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  const gruppo = f.getByRole("group", { name: it.comandiDellaBarra, exact: true });
  await expect(gruppo.getByRole("radio")).toHaveCount(3);
  await expect(gruppo.getByRole("radio", { name: it.barraTestoSotto, exact: true })).toBeChecked();
  await gruppo.getByRole("radio", { name: it.barraIconeTesto, exact: true }).check();
  const barretta = f.getByRole("checkbox", { name: it.barrettaScelta, exact: true });
  await expect(barretta).not.toBeChecked();
  await barretta.check();
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  await expect(f).toBeHidden();
  expect(await scritte(page)).toEqual([{ preferenze: fileDa("it", { ...scelteIniziali, barra: "icone-e-testo", esecuzioneFlottante: true }) }]);
  await expect(page.locator("header")).toHaveAttribute("data-presentazione", "icone-e-testo");
});

test("un errore nello scrivere le preferenze arriva all'utente, e la scelta vale lo stesso", async ({ page }) => {
  await apriVuota(page, { lingua: "it" }, { preferenzeRifiutate: "disco pieno" });
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  const f = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  await f.getByRole("radio", { name: it.coloriContrasto, exact: true }).check();
  await f.getByRole("button", { name: it.progettoConferma, exact: true }).click();
  const errore = page.getByRole("alertdialog", { name: it.preferenzeErroreTitolo, exact: true });
  await expect(errore).toBeVisible();
  await expect(errore).toContainText("disco pieno");
  expect(await page.evaluate(() => document.documentElement.dataset.colori)).toBe("contrasto");
});

// ------------------------------------------------------------------------------------- la barretta flottante

const barretta = (page: Page) => page.getByRole("toolbar", { name: it.barrettaEsecuzione, exact: true });
const gruppoEsecuzione = (page: Page) => page.locator('header [data-gruppo="esecuzione"]');
const comandiIn = (l: ReturnType<Page["locator"]>) => l.locator("[data-comando]").evaluateAll((v) => v.map((x) => (x as HTMLElement).dataset.comando));
const esempio = [{ nome: "senza letture", titolo: "senza letture", funzione: senzaLetture }];

test("spenta, la barretta dell'esecuzione non c'è", async ({ page }) => {
  await apri(page, { lingua: "it" }, undefined, esempio);
  expect(await comandiIn(gruppoEsecuzione(page))).toEqual(["esegui", "passo", "animata", "velocita", "ferma", "punto", "togliPunti"]);
  await page.keyboard.press("F10");
  await expect(page.locator("[data-stato-esecuzione]")).toHaveText(riempi(it.statoInPausa, { n: "1" }));
  await expect(barretta(page)).toHaveCount(0);
  await expect(gruppoEsecuzione(page).locator('[data-comando="ferma"]')).toBeVisible();
});

test("accesa, la barretta compare in esecuzione coi comandi che funzionano, resta a esecuzione finita e sparisce con «Ferma»", async ({ page }) => {
  await apri(page, { lingua: "it", esecuzioneFlottante: true }, undefined, esempio);
  // Nella barra restano Esegui, Passo, l'animata con la sua velocità, Interruzione e «Togli i punti».
  expect(await comandiIn(gruppoEsecuzione(page))).toEqual(["esegui", "passo", "animata", "velocita", "punto", "togliPunti"]);
  await expect(barretta(page)).toHaveCount(0);
  await page.keyboard.press("F10");
  await expect(barretta(page)).toBeVisible();
  expect(await comandiIn(barretta(page))).toEqual(["esegui", "passo", "animata", "velocita", "ferma", "punto", "togliPunti"]);
  await expect(barretta(page)).toContainText(riempi(it.statoInPausa, { n: "1" }));
  // Mentre c'è la barretta il gruppo della barra non si vede (niente doppioni).
  await expect(gruppoEsecuzione(page).locator('[data-comando="esegui"]')).toBeHidden();
  // I comandi da lì: un passo, poi fino alla fine.
  await barretta(page).locator('[data-comando="passo"]').click();
  await expect(barretta(page)).toContainText(riempi(it.statoInPausa, { n: "2" }));
  await barretta(page).locator('[data-comando="esegui"]').click();
  await expect(barretta(page)).toContainText(it.statoFinita);
  await expect(page.getByRole("region", { name: it.colonnaEsecuzione, exact: true })).toBeVisible();
  await barretta(page).locator('[data-comando="ferma"]').click();
  await expect(barretta(page)).toHaveCount(0);
  await expect(page.getByRole("region", { name: it.colonnaEsecuzione, exact: true })).toHaveCount(0);
  await expect(gruppoEsecuzione(page).locator('[data-comando="esegui"]')).toBeVisible();
});

test("la barretta trascinata oltre il bordo, o con la finestra che si stringe, resta tutta dentro la finestra", async ({ page }) => {
  await apri(page, { lingua: "it", esecuzioneFlottante: true }, undefined, esempio);
  await page.keyboard.press("F10");
  await expect(barretta(page)).toBeVisible();
  /** Quanto della barretta sta fuori dalla finestra, lato per lato (0 se è tutta dentro). */
  const fuori = () =>
    barretta(page).evaluate((b) => {
      const r = b.getBoundingClientRect();
      return { sinistra: Math.max(0, -r.left), sopra: Math.max(0, -r.top), destra: Math.max(0, r.right - window.innerWidth), sotto: Math.max(0, r.bottom - window.innerHeight) };
    });
  const tutteDentro = { sinistra: 0, sopra: 0, destra: 0, sotto: 0 };
  const maniglia = barretta(page).locator("[title]").first();
  const m = (await maniglia.boundingBox())!;
  const v = page.viewportSize()!;
  // La maniglia rilasciata nell'angolo in basso a destra (la barretta, che le sta a destra, andrebbe oltre il bordo),
  // poi in quello in alto a sinistra (oltre il bordo andrebbe la parte a sinistra del puntatore).
  const esiti: string[] = [];
  for (const [x, y] of [
    [v.width - 1, v.height - 1],
    [1, 1],
  ] as const) {
    const da = (await maniglia.boundingBox())!;
    await page.mouse.move(da.x + da.width / 2, da.y + da.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 5 });
    await page.mouse.up();
    esiti.push(`a ${x},${y}: ${JSON.stringify(await fuori())}`);
  }
  // La finestra che si stringe dopo lo spostamento a destra.
  const da = (await maniglia.boundingBox())!;
  await page.mouse.move(da.x + da.width / 2, da.y + da.height / 2);
  await page.mouse.down();
  await page.mouse.move(v.width - 10, v.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.setViewportSize({ width: v.width - 280, height: v.height - 120 });
  await expect.poll(fuori).toEqual(tutteDentro);
  esiti.push(`finestra stretta: ${JSON.stringify(await fuori())}`);
  console.log(`barretta trascinata (maniglia a ${Math.round(m.x)},${Math.round(m.y)}): ${esiti.join("; ")}`);
  expect(esiti).toEqual([`a ${v.width - 1},${v.height - 1}: ${JSON.stringify(tutteDentro)}`, `a 1,1: ${JSON.stringify(tutteDentro)}`, `finestra stretta: ${JSON.stringify(tutteDentro)}`]);
  // Controllo positivo: si sposta davvero (non è ferma al centro): dopo l'ultimo trascinamento tocca il bordo destro.
  const r = (await barretta(page).boundingBox())!;
  expect(Math.round(r.x + r.width)).toBeGreaterThanOrEqual(v.width - 280 - 2);
});

test("la barretta sta sotto le finestre: dove copre le Impostazioni, sopra ci sono le Impostazioni", async ({ page }) => {
  await apri(page, { lingua: "it", esecuzioneFlottante: true }, undefined, esempio);
  await page.keyboard.press("F10");
  await expect(barretta(page)).toBeVisible();
  // Le Impostazioni aperte con la barretta in vista: la barretta, in alto al centro del flowchart, cade sulla parte alta
  // della finestra (le linguette).
  await page.getByRole("banner").getByRole("button", { name: it.impostazioni, exact: true }).click();
  const finestra = page.getByRole("dialog", { name: it.impostazioniTitolo, exact: true });
  await expect(finestra).toBeVisible();
  const chi = await page.evaluate((nome) => {
    const barretta = document.querySelector<HTMLElement>(`[role="toolbar"][aria-label="${nome}"]`)!;
    // Con una finestra aperta il resto della pagina non prende il puntatore, e `elementFromPoint` la salterebbe: qui
    // si chiede chi è disegnato sopra, quindi la barretta torna a prenderlo.
    barretta.style.pointerEvents = "auto";
    const b = barretta.getBoundingClientRect();
    const f = document.querySelector('[role="dialog"]')!.getBoundingClientRect();
    // Il rettangolo dove si sovrappongono, e chi sta sopra nel suo centro.
    const [l, r, t, s] = [Math.max(b.left, f.left), Math.min(b.right, f.right), Math.max(b.top, f.top), Math.min(b.bottom, f.bottom)];
    if (l >= r || t >= s) return "non si sovrappongono";
    const e = document.elementFromPoint((l + r) / 2, (t + s) / 2);
    return e?.closest('[role="dialog"]') ? "le Impostazioni" : e?.closest(`[aria-label="${nome}"]`) ? "la barretta" : `altro: ${e?.tagName}`;
  }, it.barrettaEsecuzione);
  expect(chi).toBe("le Impostazioni");
});

test("dalla tastiera, il fuoco passa dalla barra alla barretta quando compare, e torna a «Esegui» quando sparisce", async ({ page }) => {
  await apri(page, { lingua: "it", esecuzioneFlottante: true }, undefined, esempio);
  await gruppoEsecuzione(page).locator('[data-comando="passo"]').focus();
  await page.keyboard.press("Enter");
  await expect(barretta(page)).toBeVisible();
  // Il pulsante della barra si nasconde: il fuoco va allo stesso comando nella barretta.
  await expect(barretta(page).locator('[data-comando="passo"]')).toBeFocused();
  // La prima pausa prima del tasto: finché il primo comando è in corso «Passo» non è disponibile, e l'Invio non
  // farebbe nulla (WebKit sotto carico, collaudo: lo stato restava «azione 1»).
  await expect(barretta(page)).toContainText(riempi(it.statoInPausa, { n: "1" }));
  await page.keyboard.press("Enter");
  await expect(barretta(page)).toContainText(riempi(it.statoInPausa, { n: "2" }));
  await barretta(page).locator('[data-comando="ferma"]').focus();
  await page.keyboard.press("Enter");
  await expect(barretta(page)).toHaveCount(0);
  await expect(gruppoEsecuzione(page).locator('[data-comando="esegui"]')).toBeFocused();
  // Controllo positivo: col fuoco fuori dalla barra, la barretta che compare non lo sposta.
  await page.locator("[data-blocco]").first().focus();
  await page.keyboard.press("F10");
  await expect(barretta(page)).toBeVisible();
  await expect(page.locator("[data-blocco]").first()).toBeFocused();
});
